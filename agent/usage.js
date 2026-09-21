// agent/usage.js — счётчики расходов (токены, Whisper, Brevo)
import fs from 'fs';
import path from 'path';

const USAGE_PATH = path.resolve(
  new URL('./data/', import.meta.url).pathname,
  'usage.json'
);

const DEFAULT_LIMITS = {
  groq_tokens_per_day: Number(process.env.LIMIT_GROQ_TOKENS || 2000000),    // 2M токенов/день (примерно)
  whisper_seconds_per_day: Number(process.env.LIMIT_WHISPER_SECONDS || 28800), // 8 часов free tier
  brevo_emails_per_day: Number(process.env.LIMIT_BREVO_EMAILS || 300),       // Free tier
};

let state = null;

function today() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function load() {
  if (state && state.date === today()) return state;
  try {
    if (fs.existsSync(USAGE_PATH)) {
      const raw = JSON.parse(fs.readFileSync(USAGE_PATH, 'utf8'));
      if (raw.date === today()) { state = raw; return state; }
    }
  } catch (e) {
    console.warn('usage: не удалось прочитать usage.json:', e.message);
  }
  state = { date: today(), tokens: 0, whisperSec: 0, emails: 0, alerts: {} };
  save();
  return state;
}

function save() {
  try {
    fs.mkdirSync(path.dirname(USAGE_PATH), { recursive: true });
    const tmp = USAGE_PATH + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
    fs.renameSync(tmp, USAGE_PATH);
  } catch (e) {
    console.error('usage: save failed:', e.message);
  }
}

async function alertAdmin(text) {
  const token = process.env.BOOKING_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.BOOKING_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
  } catch (e) {
    console.warn('usage alert failed:', e.message);
  }
}

function maybeAlert(kind, used, limit, unit) {
  const s = load();
  const pct = (used / limit) * 100;
  const key = `${kind}_${pct >= 100 ? '100' : '80'}`;
  if (pct >= 80 && !s.alerts[key]) {
    s.alerts[key] = true;
    const icon = pct >= 100 ? '🚨' : '⚠️';
    alertAdmin(
      `${icon} <b>Лимит ${kind}</b>\n\nИспользовано: <b>${used.toFixed(0)}</b> / ${limit} ${unit} (${pct.toFixed(0)}%)`
    );
    save();
  }
}

// ---- Публичное API ----

export function trackTokens(total, inputTokens, outputTokens) {
  const s = load();
  s.tokens += Number(total || 0);
  s.tokensIn = (s.tokensIn || 0) + Number(inputTokens || 0);
  s.tokensOut = (s.tokensOut || 0) + Number(outputTokens || 0);
  s.calls = (s.calls || 0) + 1;
  save();
  maybeAlert('Groq токены', s.tokens, DEFAULT_LIMITS.groq_tokens_per_day, 'токенов');
}

export function trackWhisper(seconds) {
  const s = load();
  s.whisperSec += Number(seconds || 0);
  s.whisperCount = (s.whisperCount || 0) + 1;
  save();
  maybeAlert('Whisper', s.whisperSec, DEFAULT_LIMITS.whisper_seconds_per_day, 'сек');
}

export function trackEmail() {
  const s = load();
  s.emails += 1;
  save();
  maybeAlert('Brevo письма', s.emails, DEFAULT_LIMITS.brevo_emails_per_day, 'писем');
}

export function getUsage() {
  const s = load();
  return {
    date: s.date,
    tokens: s.tokens,
    tokensIn: s.tokensIn || 0,
    tokensOut: s.tokensOut || 0,
    calls: s.calls || 0,
    whisperSec: s.whisperSec,
    whisperCount: s.whisperCount || 0,
    emails: s.emails,
    limits: DEFAULT_LIMITS,
    percentages: {
      tokens: Math.round((s.tokens / DEFAULT_LIMITS.groq_tokens_per_day) * 100),
      whisper: Math.round((s.whisperSec / DEFAULT_LIMITS.whisper_seconds_per_day) * 100),
      emails: Math.round((s.emails / DEFAULT_LIMITS.brevo_emails_per_day) * 100),
    },
  };
}

export function resetIfNewDay() {
  const s = load();
  if (s.date !== today()) {
    console.log(`🔄 usage: новый день ${today()}, сбрасываю счётчики`);
    state = null;
    load();
  }
}
