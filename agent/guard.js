// agent/guard.js — защита от спама, дублей и флуда
// Хранит данные в памяти процесса, чистит раз в 10 минут.
// При рестарте состояние сбрасывается — это ок, защиты на уровне сессии достаточно.

const DEDUP_WINDOW_MS = 30 * 1000;   // 30 сек — одинаковые сообщения
const RATE_WINDOW_MS = 60 * 1000;    // 1 мин
const RATE_MAX = 8;                  // не больше 8 сообщений в минуту
const MUTE_DURATION_MS = 5 * 60 * 1000; // мут 5 минут после флуда

const lastText = new Map();  // sessionKey -> { text, ts }
const rateHits = new Map();  // sessionKey -> number[] timestamps
const mutedUntil = new Map(); // sessionKey -> ts

export function check(sessionKey, text) {
  const now = Date.now();

  // 1. Мут
  const mute = mutedUntil.get(sessionKey);
  if (mute && mute > now) {
    return { ok: false, reason: 'muted', until: mute };
  }
  if (mute && mute <= now) mutedUntil.delete(sessionKey);

  // 2. Дубли
  const prev = lastText.get(sessionKey);
  const normalized = String(text || '').trim().toLowerCase();
  if (prev && prev.text === normalized && (now - prev.ts) < DEDUP_WINDOW_MS) {
    lastText.set(sessionKey, { text: normalized, ts: now });
    return { ok: false, reason: 'duplicate' };
  }
  lastText.set(sessionKey, { text: normalized, ts: now });

  // 3. Rate limit
  const hits = (rateHits.get(sessionKey) || []).filter(t => now - t < RATE_WINDOW_MS);
  hits.push(now);
  rateHits.set(sessionKey, hits);

  if (hits.length > RATE_MAX) {
    mutedUntil.set(sessionKey, now + MUTE_DURATION_MS);
    return { ok: false, reason: 'flood', until: now + MUTE_DURATION_MS };
  }

  return { ok: true };
}

// Периодическая чистка, чтобы Maps не росли бесконечно
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of lastText) if (now - v.ts > 10 * 60 * 1000) lastText.delete(k);
  for (const [k, arr] of rateHits) {
    const filtered = arr.filter(t => now - t < RATE_WINDOW_MS);
    if (filtered.length) rateHits.set(k, filtered);
    else rateHits.delete(k);
  }
  for (const [k, ts] of mutedUntil) if (ts < now) mutedUntil.delete(k);
}, 10 * 60 * 1000);

export function stats() {
  return { tracked: lastText.size, muted: mutedUntil.size };
}
