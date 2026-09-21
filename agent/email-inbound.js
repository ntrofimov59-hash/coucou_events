// agent/email-inbound.js — обработка входящего письма агентом
import { generateReply, isRelevantMessage, isSpam, stats, logStat } from './core.js';
import * as store from './store.js';
import * as guard from './guard.js';

const SKIP_FROM = [
  'no-reply@', 'noreply@', 'mailer-daemon', 'accounts.google.com',
  'notifications@', 'bounce@', 'postmaster@',
];

function isSystemSender(addr) {
  const a = (addr || '').toLowerCase();
  return SKIP_FROM.some(x => a.includes(x));
}

/**
 * Принимает распарсенное письмо:
 * { from, to, subject, text, html, messageId }
 * Возвращает { ok, reply, skipped?, reason? }
 */
export async function processInboundEmail(input) {
  const { from, subject = '', text = '', messageId = '' } = input || {};
  if (!from) return { ok: false, reason: 'no_from' };
  if (isSystemSender(from)) return { ok: false, skipped: true, reason: 'system_sender' };

  const body = (text || '').trim();
  if (body.length < 5) return { ok: false, skipped: true, reason: 'empty_body' };

  // Спам
  if (isSpam(body) || isSpam(subject)) {
    stats.spam++; logStat();
    return { ok: false, skipped: true, reason: 'spam' };
  }

  // Релевантность
  const relevant = isRelevantMessage(body) || isRelevantMessage(subject);
  if (!relevant) {
    stats.spam++; logStat();
    return { ok: false, skipped: true, reason: 'not_relevant' };
  }

  // Анти-дубли по MessageId
  const dedupeKey = `msgid:${messageId || from + ':' + body.slice(0, 60)}`;
  const g = guard.check(`email_${from}`, dedupeKey);
  if (!g.ok) return { ok: false, skipped: true, reason: g.reason };

  stats.email++;
  stats.total++;
  stats.relevant++;

  const sessionKey = `email_${from}`;
  const content = `Клиент написал на email.\nТема: ${subject}\n\n${body}`;

  const reply = await generateReply(sessionKey, content);
  logStat();
  return { ok: true, reply };
}
