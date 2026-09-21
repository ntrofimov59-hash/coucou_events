// src/pages/api/email-webhook.ts — приём входящих от Brevo Inbound
import type { APIRoute } from "astro";
import { saveWebsiteLead } from "../../lib/notion-lead";
import { sendMail } from "../../lib/mailer";

export const prerender = false;

function envStr(key: string): string {
  // В SSR process.env — приоритет; import.meta.env хранит значения, зашитые при билде
  const fromProcess = typeof process !== "undefined" ? process.env?.[key] : undefined;
  const fromMeta = (import.meta.env as Record<string, string | undefined>)[key];
  const raw = fromProcess || fromMeta || "";
  return String(raw).trim().replace(/^["']|["']$/g, "");
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const processed = new Map<string, number>();
function seenRecently(id: string): boolean {
  const now = Date.now();
  if (processed.has(id) && now - processed.get(id)! < 24 * 3600 * 1000) return true;
  processed.set(id, now);
  if (processed.size > 5000) {
    const cutoff = now - 24 * 3600 * 1000;
    for (const [k, v] of processed) if (v < cutoff) processed.delete(k);
  }
  return false;
}

function parseBrevoPayload(raw: any) {
  const items = Array.isArray(raw?.items) ? raw.items : [raw];
  const first = items[0];
  if (!first) return null;

  const from = first?.From?.Address || first?.from?.address || first?.from || "";
  const toArr = first?.To || first?.to;
  const to = Array.isArray(toArr)
    ? (toArr[0]?.Address || toArr[0]?.address || toArr[0] || "")
    : (toArr?.Address || toArr || "");

  const subject = first?.Subject || first?.subject || "";
  const text =
    first?.ExtractedMarkdownMessage ||
    first?.RawTextBody ||
    first?.text ||
    "";
  const html = first?.RawHtmlBody || first?.html || "";
  const messageId = first?.MessageId || first?.messageId || `${from}:${Date.now()}`;

  return {
    from: String(from).trim(),
    to: String(to).trim(),
    subject: String(subject),
    text: String(text),
    html: String(html),
    messageId: String(messageId),
  };
}

// Асинхронная обработка — вызывается после того, как endpoint уже ответил 200
async function processInBackground(msg: {
  from: string; to: string; subject: string; text: string; html: string; messageId: string;
}) {
  try {
    const agentPort = envStr("AGENT_HTTP_PORT") || "3001";
    const agentSecret = envStr("AGENT_HTTP_SECRET");
    let agentResult: { ok: boolean; reply?: string; skipped?: boolean; reason?: string } = { ok: false };
    try {
      const res = await fetch(`http://127.0.0.1:${agentPort}/email-inbound`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-agent-secret": agentSecret },
        body: JSON.stringify(msg),
      });
      agentResult = await res.json();
      console.log("email-webhook: agent result:", JSON.stringify(agentResult).slice(0, 200));
    } catch (e) {
      console.error("email-webhook: agent call failed:", (e as Error).message);
    }

    if (!agentResult.skipped) {
      try {
        const bodyForDetails = (msg.text || "").replace(/\s+/g, " ").slice(0, 800);
        await saveWebsiteLead({
          name: msg.from.split("@")[0] || "Клиент",
          details: `Email: ${msg.from}\nТема: ${msg.subject}\n\n${bodyForDetails}`,
          source: "Email",
          language: "Russian",
          status: "New Lead",
        });
      } catch (e) {
        console.warn("email-webhook: notion save failed:", (e as Error).message);
      }
    }

    if (agentResult.ok && agentResult.reply) {
      try {
        await sendMail({
          to: msg.from,
          subject: `Re: ${msg.subject || "Coucou Events"}`,
          text: agentResult.reply,
          replyTo: envStr("INBOUND_FROM_EMAIL") || undefined,
        });
      } catch (e) {
        console.warn("email-webhook: reply send failed:", (e as Error).message);
      }
    }

    const forward = envStr("FORWARD_EMAIL");
    if (forward && msg.from.toLowerCase() !== forward.toLowerCase()) {
      try {
        const copyBody =
          `--- Входящее письмо ---\n` +
          `От: ${msg.from}\nКому: ${msg.to}\nТема: ${msg.subject}\n\n` +
          `${msg.text.slice(0, 5000)}\n\n` +
          `--- Ответ агента ---\n${agentResult.reply || "(агент не отвечал — " + (agentResult.reason || "skipped") + ")"}`;
        await sendMail({
          to: forward,
          subject: `[inbound] ${msg.subject || "(без темы)"} — от ${msg.from}`,
          text: copyBody,
          replyTo: msg.from,
        });
      } catch (e) {
        console.warn("email-webhook: forward failed:", (e as Error).message);
      }
    }
    console.log(`📬 email-webhook: done for ${msg.from}`);
  } catch (err) {
    console.error("email-webhook: background error:", (err as Error).message);
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const expected = envStr("INBOUND_WEBHOOK_SECRET");
    const auth = request.headers.get("authorization") || "";
    const tokenFromHeader = auth.replace(/^Bearer\s+/i, "").trim();
    const tokenFromCustom = (request.headers.get("x-brevo-token") || request.headers.get("x-auth-token") || "").trim();
    const token = tokenFromHeader || tokenFromCustom;

    // Принимаем токен в любом из вариантов: с префиксом, без, или вообще без проверки если expected пуст
    const authorized = !expected || token === expected || tokenFromHeader === expected;

    if (!authorized) {
      console.warn("email-webhook: unauthorized. expected_present=", !!expected,
        "got_auth=", JSON.stringify(auth).slice(0,80),
        "got_custom=", tokenFromCustom ? "yes" : "no");
      return json({ ok: false, error: "unauthorized" }, 401);
    }

    let raw: any = {};
    try { raw = await request.json(); } catch { return json({ ok: false, error: "bad_json" }, 400); }
    const msg = parseBrevoPayload(raw);
    if (!msg || !msg.from) return json({ ok: false, error: "no_from" }, 400);

    if (seenRecently(msg.messageId)) {
      console.log("email-webhook: duplicate, skip", msg.messageId);
      return json({ ok: true, skipped: "duplicate" });
    }

    console.log(`📧 inbound accepted: from=${msg.from} subj="${msg.subject.slice(0, 60)}"`);

    // Не ждём — отдаём 200 немедленно, обработка идёт в фоне
    // (setTimeout с 0 даёт возможность event loop освободиться перед вызовом)
    setTimeout(() => { processInBackground(msg).catch(e => console.error("bg:", e.message)); }, 0);

    return json({ ok: true, accepted: true, messageId: msg.messageId });
  } catch (error) {
    console.error("email-webhook error:", error);
    return json({ ok: false, error: (error as Error).message }, 500);
  }
};

export const GET: APIRoute = async () => json({ ok: true, service: "coucou-email-webhook" });
