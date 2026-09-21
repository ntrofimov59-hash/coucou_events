// agent/store.js
import fs from 'fs';
import path from 'path';
import { SESSIONS_FILE, SESSION_TTL_MS } from './config.js';

const state = {
  sessions: {}, // sessionKey -> { profile, turns, stage, lang, source, lastActivity, createdAt }
  dirty: false,
};

function ensureDir() {
  fs.mkdirSync(path.dirname(SESSIONS_FILE), { recursive: true });
}

export function load() {
  ensureDir();
  if (!fs.existsSync(SESSIONS_FILE)) return;
  try {
    const raw = fs.readFileSync(SESSIONS_FILE, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    state.sessions = parsed.sessions || {};
  } catch (e) {
    console.error('⚠️ sessions.json повреждён, начинаем с чистого листа:', e.message);
    state.sessions = {};
  }
}

let flushTimer = null;
function scheduleFlush() {
  state.dirty = true;
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, 1500); // батчим запись
}

export function flush() {
  if (!state.dirty) return;
  ensureDir();
  try {
    const tmp = SESSIONS_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify({ sessions: state.sessions }, null, 2));
    fs.renameSync(tmp, SESSIONS_FILE); // atomic
    state.dirty = false;
  } catch (e) {
    console.error('⚠️ Не удалось записать sessions.json:', e.message);
  }
}

export function getSession(key) {
  return state.sessions[key] || null;
}

export function createSession(key, { lang, source }) {
  const now = Date.now();
  state.sessions[key] = {
    createdAt: now,
    lastActivity: now,
    lang,
    source,
    stage: 'greeting',
    profile: {
      name: null,
      phone: null,
      city: null,
      eventDate: null,
      guests: null,
      budget: null,
      service: null,
      details: null,
    },
    turns: [], // массив ходов: { user, assistant, ts }
  };
  scheduleFlush();
  return state.sessions[key];
}

export function saveSession(key) {
  if (!state.sessions[key]) return;
  state.sessions[key].lastActivity = Date.now();
  scheduleFlush();
}

// Обновляем профиль только непустыми значениями
export function updateProfile(key, patch) {
  const s = state.sessions[key];
  if (!s) return;
  for (const [k, v] of Object.entries(patch || {})) {
    if (v !== null && v !== undefined && String(v).trim() !== '' && String(v) !== 'N/A') {
      s.profile[k] = String(v).trim();
    }
  }
  s.lastActivity = Date.now();
  scheduleFlush();
}

export function setStage(key, stage) {
  const s = state.sessions[key];
  if (!s || !stage) return;
  s.stage = stage;
  s.lastActivity = Date.now();
  scheduleFlush();
}

export function setLang(key, lang) {
  const s = state.sessions[key];
  if (!s || !lang) return;
  s.lang = lang;
  s.lastActivity = Date.now();
  scheduleFlush();
}

export function pushTurn(key, userText, assistantText) {
  const s = state.sessions[key];
  if (!s) return;
  s.turns.push({ user: userText, assistant: assistantText, ts: Date.now() });
  // ограничиваем хранилище — держим последние 100 ходов
  if (s.turns.length > 100) s.turns = s.turns.slice(-100);
  s.lastActivity = Date.now();
  scheduleFlush();
}

// Убираем всё старше TTL
export function cleanup() {
  const cutoff = Date.now() - SESSION_TTL_MS;
  let removed = 0;
  for (const [k, s] of Object.entries(state.sessions)) {
    if (s.lastActivity < cutoff) {
      delete state.sessions[k];
      removed++;
    }
  }
  if (removed) {
    console.log(`🧹 Очищено ${removed} старых сессий`);
    scheduleFlush();
  }
}

export function getStats() {
  return { sessions: Object.keys(state.sessions).length };
}

// Последние N ходов в формате messages для LLM
export function buildMessages(sessionKey, systemPrompt, maxTurns) {
  const s = state.sessions[sessionKey];
  if (!s) return [{ role: 'system', content: systemPrompt }];
  const turns = s.turns.slice(-maxTurns);
  const msgs = [{ role: 'system', content: systemPrompt }];
  for (const t of turns) {
    if (t.user) msgs.push({ role: 'user', content: t.user });
    if (t.assistant) msgs.push({ role: 'assistant', content: t.assistant });
  }
  return msgs;
}


// Для follow-up
export function getAllSessions() {
  return state.sessions;
}

export function markFollowup(key, stage) {
  const s = state.sessions[key];
  if (!s) return;
  if (stage === '1d') s.followupSent1d = true;
  if (stage === '3d') s.followupSent3d = true;
  s.lastActivity = Date.now();
  scheduleFlush();
}


// Пометить сделку как «передана менеджеру» — не дёргать follow-up
export function setClosedWon(key, value = true) {
  const s = state.sessions[key];
  if (!s) return;
  s.closedWon = !!value;
  s.lastActivity = Date.now();
  scheduleFlush();
}

export function isClosedWon(key) {
  const s = state.sessions[key];
  return !!(s && s.closedWon);
}
