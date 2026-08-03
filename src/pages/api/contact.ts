import type { APIRoute } from "astro";

export const prerender = false;

function envStr(key: string): string {
  const raw =
    (import.meta.env as Record<string, string | undefined>)[key] ||
    (typeof process !== "undefined" ? process.env?.[key] : undefined) ||
    "";
  return String(raw).trim().replace(/^["']|["']$/g, "");
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function normalizePhone(phone: string): string {
  let digits = String(phone).replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) {
    digits = "7" + digits.slice(1);
  }
  return digits;
}

async function checkWhatsApp(phone: string): Promise<string> {
  const clean = normalizePhone(phone);
  if (clean.length < 10) return "⚪ Не проверялся";

  const idInstance = envStr("GREEN_API_INSTANCE");
  const apiToken = envStr("GREEN_API_TOKEN");
  if (!idInstance || !apiToken) return "⚪ Не проверялся";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(
      `https://api.green-api.com/waInstance${idInstance}/CheckWhatsapp/${apiToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: Number(clean) }),
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);

    if (!res.ok) return "⚠️ Ошибка проверки WA";

    const result = await res.json();
    return result.existsWhatsapp === true
      ? "🟢 Есть в WhatsApp"
      : "🔴 Нет в WhatsApp";
  } catch {
    return "⚠️ Ошибка проверки WA";
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    let data: Record<string, any> = {};
    try {
      data = await request.json();
    } catch {
      return json({ success: false, error: "Некорректный JSON" }, 400);
    }

    if (data.website || data.company_url || data.hp_field) {
      return json({ success: true });
    }

    const { name, contact, message: userMessage } = data;

    if (
      !((name && String(name).trim()) || (contact && String(contact).trim()))
    ) {
      return json(
        { success: false, error: "Укажите имя или контакт" },
        400,
      );
    }

    let waStatusText = "⚪ Не проверялся";
    const contactStr = contact ? String(contact).trim() : "";
    const isPhone = contactStr.replace(/\D/g, "").length >= 10;

    if (isPhone) {
      waStatusText = await checkWhatsApp(contactStr);
    }

    let text = `📩 Новое сообщение из контактной формы\n\n`;
    if (name) text += `▪️ Имя: ${name}\n`;
    if (contactStr) {
      text += `▪️ Контакт: ${contactStr}${
        isPhone ? ` (${waStatusText})` : ""
      }\n`;
    }
    if (userMessage) text += `▪️ Сообщение:\n${userMessage}\n`;

    const token = envStr("TELEGRAM_BOT_TOKEN");
    const chatId = envStr("TELEGRAM_CHAT_ID");

    if (!token || !chatId) {
      console.error("TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID не заданы");
      return json(
        {
          success: false,
          error:
            "Сервер не настроен: задайте TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в .env и перезапустите dev/сервер",
        },
        500,
      );
    }

    const tgRes = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          disable_web_page_preview: true,
        }),
      },
    );

    const tgResult = await tgRes.json();

    if (!tgResult.ok) {
      console.error("Telegram API error:", tgResult);
      return json(
        {
          success: false,
          error: tgResult.description || "Ошибка отправки в Telegram",
        },
        502,
      );
    }

    return json({ success: true });
  } catch (error) {
    console.error("ОШИБКА В API КОНТАКТОВ:", error);
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    return json({ success: false, error: errorMessage }, 500);
  }
};