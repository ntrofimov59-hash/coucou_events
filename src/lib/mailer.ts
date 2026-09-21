// src/lib/mailer.ts — Brevo HTTP API (443, приоритет) + SMTP fallback
import nodemailer from 'nodemailer';

function envStr(key: string): string {
  const raw =
    (import.meta.env as Record<string, string | undefined>)[key] ||
    (typeof process !== 'undefined' ? process.env?.[key] : undefined) ||
    '';
  return String(raw).trim().replace(/^["']|["']$/g, '');
}

export type Mail = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

async function sendViaBrevo(mail: Mail): Promise<{ ok: boolean; error?: string }> {
  const apiKey = envStr('BREVO_API_KEY');
  if (!apiKey) return { ok: false, error: 'BREVO_API_KEY не задан' };

  const fromRaw = envStr('SMTP_FROM') || envStr('SMTP_USER');
  let fromName = 'Coucou Events';
  let fromEmail = fromRaw;
  const m = fromRaw.match(/^(.+?)\s*<([^>]+)>$/);
  if (m) { fromName = m[1].trim().replace(/^["']|["']$/g, ''); fromEmail = m[2].trim(); }
  if (!fromEmail || !fromEmail.includes('@')) return { ok: false, error: 'SMTP_FROM/SMTP_USER не задан' };

  const body: any = {
    sender: { name: fromName, email: fromEmail },
    to: [{ email: mail.to }],
    subject: mail.subject,
    textContent: mail.text,
  };
  if (mail.html) body.htmlContent = mail.html;
  if (mail.replyTo) body.replyTo = { email: mail.replyTo };

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(body),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.message || `HTTP ${res.status}`;
      return { ok: false, error: msg };
    }
    console.log(`📧 mailer (Brevo API): sent to ${mail.to} (${data?.messageId || 'ok'})`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message || String(e) };
  }
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;
  const host = envStr('SMTP_HOST');
  const port = Number(envStr('SMTP_PORT') || 2525);
  const user = envStr('SMTP_USER');
  const pass = envStr('SMTP_PASS');
  if (!host || !user || !pass) return null;
  transporter = nodemailer.createTransport({
    host, port, secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 8000, greetingTimeout: 6000, socketTimeout: 10000,
  });
  return transporter;
}

async function sendViaSmtp(mail: Mail): Promise<{ ok: boolean; error?: string }> {
  const t = getTransporter();
  if (!t) return { ok: false, error: 'SMTP не настроен' };
  const from = envStr('SMTP_FROM') || envStr('SMTP_USER');
  try {
    const info = await t.sendMail({
      from, to: mail.to, subject: mail.subject,
      text: mail.text, html: mail.html, replyTo: mail.replyTo,
    });
    console.log(`📧 mailer (SMTP): sent to ${mail.to} (${info.messageId})`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function sendMail(mail: Mail): Promise<{ ok: boolean; error?: string }> {
  if (envStr('BREVO_API_KEY')) {
    const r = await sendViaBrevo(mail);
    if (r.ok) return r;
    console.warn(`mailer: Brevo API failed (${r.error}), fallback SMTP...`);
  }
  return sendViaSmtp(mail);
}
