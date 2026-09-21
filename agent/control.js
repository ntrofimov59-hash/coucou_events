// agent/control.js — управление паузой бота в чате
// Когда менеджер пишет клиенту сам — бот молчит N часов.
// Команды менеджера: /stop, /start, /status (только исходящие).

const DEFAULT_PAUSE_MS = 24 * 60 * 60 * 1000; // 24 часа
const paused = new Map();  // sessionKey -> timestamp until
const clientOptOut = new Set(); // sessionKey — клиент сам написал /stop

export function isPaused(sessionKey) {
  if (clientOptOut.has(sessionKey)) return true;
  const until = paused.get(sessionKey);
  if (!until) return false;
  if (Date.now() >= until) { paused.delete(sessionKey); return false; }
  return true;
}

export function pause(sessionKey, ms = DEFAULT_PAUSE_MS) {
  paused.set(sessionKey, Date.now() + ms);
}

export function resume(sessionKey) {
  paused.delete(sessionKey);
  clientOptOut.delete(sessionKey);
}

export function setClientOptOut(sessionKey, on = true) {
  if (on) clientOptOut.add(sessionKey);
  else clientOptOut.delete(sessionKey);
}

// Парсим команды менеджера (в исходящих сообщениях)
export function parseManagerCommand(text) {
  const t = String(text || '').trim().toLowerCase();
  if (t === '/stop' || t === '/pause') return 'stop';
  if (t === '/start' || t === '/resume') return 'start';
  if (t === '/status') return 'status';
  return null;
}

// Парсим команды клиента (входящие) — только opt-out
export function parseClientCommand(text) {
  const t = String(text || '').trim().toLowerCase();
  if (t === '/stop' || t === 'стоп' || t === 'отписаться') return 'optout';
  if (t === '/start' || t === 'начать') return 'optin';
  return null;
}

export function status() {
  return { paused: paused.size, optOut: clientOptOut.size };
}
