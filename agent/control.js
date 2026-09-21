// agent/control.js — управление паузой бота в чате
// Модель: "менеджер активен" → окно 30 мин от последнего исходящего.
// Если клиент пишет вне окна — агент отвечает.

const MANAGER_ACTIVE_WINDOW_MS = Number(process.env.MANAGER_ACTIVE_WINDOW_MS || 60 * 60 * 1000); // 60 мин
const paused = new Map();          // sessionKey -> pauseUntil (ts)
const clientOptOut = new Set();    // клиент сам написал /stop
const pendingWhilePaused = new Map(); // sessionKey -> [сообщения клиента во время паузы]

export function isPaused(sessionKey) {
  if (clientOptOut.has(sessionKey)) return true;
  const until = paused.get(sessionKey);
  if (!until) return false;
  if (Date.now() >= until) { paused.delete(sessionKey); return false; }
  return true;
}

// Менеджер написал → продлеваем окно
export function pause(sessionKey, ms = MANAGER_ACTIVE_WINDOW_MS) {
  paused.set(sessionKey, Date.now() + ms);
}

export function resume(sessionKey) {
  paused.delete(sessionKey);
  clientOptOut.delete(sessionKey);
  pendingWhilePaused.delete(sessionKey);
}

export function setClientOptOut(sessionKey, on = true) {
  if (on) clientOptOut.add(sessionKey);
  else clientOptOut.delete(sessionKey);
}

// Сохраняем сообщения, пока на паузе — чтобы потом использовать в контексте
export function rememberWhilePaused(sessionKey, text) {
  const arr = pendingWhilePaused.get(sessionKey) || [];
  arr.push({ text, ts: Date.now() });
  if (arr.length > 10) arr.splice(0, arr.length - 10);
  pendingWhilePaused.set(sessionKey, arr);
}

export function popPendingWhilePaused(sessionKey) {
  const arr = pendingWhilePaused.get(sessionKey) || [];
  pendingWhilePaused.delete(sessionKey);
  return arr;
}

export function getManagerActivity(sessionKey) {
  const until = paused.get(sessionKey);
  if (!until) return 0;
  // paused = now + окно → lastActivity = until - окно
  return until - MANAGER_ACTIVE_WINDOW_MS;
}

export function parseManagerCommand(text) {
  const t = String(text || '').trim().toLowerCase();
  if (t === '/stop' || t === '/pause') return 'stop';
  if (t === '/start' || t === '/resume') return 'start';
  if (t === '/status') return 'status';
  return null;
}

export function parseClientCommand(text) {
  const t = String(text || '').trim().toLowerCase();
  if (t === '/stop' || t === 'стоп' || t === 'отписаться') return 'optout';
  if (t === '/start' || t === 'начать') return 'optin';
  return null;
}

export function status() {
  return { paused: paused.size, optOut: clientOptOut.size, pending: pendingWhilePaused.size };
}
