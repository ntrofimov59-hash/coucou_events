// agent/store.js — SQLite persistence + in-memory cache
// API совместим с прежним JSON-store: core/channels/followup не меняются.
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { SESSIONS_FILE, SESSIONS_DB, SESSION_TTL_MS, DATA_DIR } from './config.js';

const state = {
  sessions: {}, // key -> session object (тот же shape)
  dirtyKeys: new Set(),
};

let db = null;
let flushTimer = null;

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function openDb() {
  if (db) return db;
  ensureDir();
  db = new Database(SESSIONS_DB);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      key TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      last_activity INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      stage TEXT,
      lang TEXT,
      source TEXT,
      closed_won INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_activity ON sessions(last_activity);
    CREATE INDEX IF NOT EXISTS idx_sessions_stage ON sessions(stage);

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      session_key TEXT,
      type TEXT NOT NULL,
      payload TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
  `);
  return db;
}

function rowToSession(row) {
  try {
    return JSON.parse(row.data);
  } catch {
    return null;
  }
}

function persistKey(key) {
  const s = state.sessions[key];
  if (!s) {
    openDb().prepare('DELETE FROM sessions WHERE key = ?').run(key);
    return;
  }
  openDb().prepare(`
    INSERT INTO sessions (key, data, last_activity, created_at, stage, lang, source, closed_won)
    VALUES (@key, @data, @last_activity, @created_at, @stage, @lang, @source, @closed_won)
    ON CONFLICT(key) DO UPDATE SET
      data = excluded.data,
      last_activity = excluded.last_activity,
      stage = excluded.stage,
      lang = excluded.lang,
      source = excluded.source,
      closed_won = excluded.closed_won
  `).run({
    key,
    data: JSON.stringify(s),
    last_activity: s.lastActivity || Date.now(),
    created_at: s.createdAt || Date.now(),
    stage: s.stage || null,
    lang: s.lang || null,
    source: s.source || null,
    closed_won: s.closedWon ? 1 : 0,
  });
}

function scheduleFlush(key) {
  if (key) state.dirtyKeys.add(key);
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, 800);
}

export function load() {
  openDb();
  // 1) SQLite → memory
  const rows = db.prepare('SELECT key, data FROM sessions').all();
  state.sessions = {};
  for (const row of rows) {
    const s = rowToSession(row);
    if (s) state.sessions[row.key] = s;
  }

  // 2) Одноразовая миграция из sessions.json
  if (fs.existsSync(SESSIONS_FILE)) {
    try {
      const raw = fs.readFileSync(SESSIONS_FILE, 'utf8');
      const parsed = JSON.parse(raw || '{}');
      const fromJson = parsed.sessions || {};
      let migrated = 0;
      for (const [k, s] of Object.entries(fromJson)) {
        if (!state.sessions[k]) {
          state.sessions[k] = s;
          persistKey(k);
          migrated++;
        }
      }
      if (migrated) {
        console.log(`📦 store: мигрировано ${migrated} сессий из sessions.json → SQLite`);
        const bak = SESSIONS_FILE + '.migrated.bak';
        fs.renameSync(SESSIONS_FILE, bak);
        console.log(`📦 store: sessions.json → ${path.basename(bak)}`);
      }
    } catch (e) {
      console.warn('store: JSON migrate skip:', e.message);
    }
  }

  console.log(`📂 store: SQLite ${SESSIONS_DB} | sessions=${Object.keys(state.sessions).length}`);
}

export function flush() {
  if (!state.dirtyKeys.size) return;
  const keys = [...state.dirtyKeys];
  state.dirtyKeys.clear();
  try {
    const tx = openDb().transaction((list) => {
      for (const k of list) persistKey(k);
    });
    tx(keys);
  } catch (e) {
    console.error('⚠️ store flush failed:', e.message);
    for (const k of keys) state.dirtyKeys.add(k);
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
    turns: [],
    managerMessages: [],
    lastTgSync: 0,
  };
  scheduleFlush(key);
  return state.sessions[key];
}

export function saveSession(key) {
  const s = state.sessions[key];
  if (!s) return;
  s.lastActivity = Date.now();
  scheduleFlush(key);
}

export function updateProfile(key, patch) {
  const s = state.sessions[key];
  if (!s) return;
  for (const [k, v] of Object.entries(patch || {})) {
    if (v !== null && v !== undefined && String(v).trim() !== '' && String(v) !== 'N/A') {
      s.profile[k] = String(v).trim();
    }
  }
  s.lastActivity = Date.now();
  scheduleFlush(key);
}

export function setStage(key, stage) {
  const s = state.sessions[key];
  if (!s || !stage) return;
  s.stage = stage;
  s.lastActivity = Date.now();
  scheduleFlush(key);
}

export function setLang(key, lang) {
  const s = state.sessions[key];
  if (!s || !lang) return;
  s.lang = lang;
  s.lastActivity = Date.now();
  scheduleFlush(key);
}

export function pushTurn(key, userText, assistantText) {
  const s = state.sessions[key];
  if (!s) return;
  s.turns.push({ user: userText, assistant: assistantText, ts: Date.now() });
  if (s.turns.length > 100) s.turns = s.turns.slice(-100);
  s.lastActivity = Date.now();
  scheduleFlush(key);
}

export function cleanup() {
  const cutoff = Date.now() - SESSION_TTL_MS;
  let removed = 0;
  for (const [k, s] of Object.entries(state.sessions)) {
    if ((s.lastActivity || 0) < cutoff) {
      delete state.sessions[k];
      openDb().prepare('DELETE FROM sessions WHERE key = ?').run(k);
      removed++;
    }
  }
  if (removed) console.log(`🧹 Очищено ${removed} старых сессий`);
}

export function getStats() {
  return { sessions: Object.keys(state.sessions).length };
}

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

export function getAllSessions() {
  return state.sessions;
}

export function markFollowup(key, stage) {
  const s = state.sessions[key];
  if (!s) return;
  if (stage === '1d') s.followupSent1d = true;
  if (stage === '3d') s.followupSent3d = true;
  s.lastActivity = Date.now();
  scheduleFlush(key);
  logEvent(key, stage === '1d' ? 'followup_1d' : 'followup_3d', {});
}

export function setClosedWon(key, value = true) {
  const s = state.sessions[key];
  if (!s) return;
  s.closedWon = !!value;
  s.lastActivity = Date.now();
  scheduleFlush(key);
  if (value) logEvent(key, 'closed_won', {});
}

export function isClosedWon(key) {
  const s = state.sessions[key];
  return !!(s && s.closedWon);
}

export function pushManagerMessage(key, text, ts) {
  const s = state.sessions[key];
  if (!s) return;
  if (!s.managerMessages) s.managerMessages = [];
  s.managerMessages.push({ text, ts: ts || Date.now() });
  if (s.managerMessages.length > 20) s.managerMessages = s.managerMessages.slice(-20);
  scheduleFlush(key);
}

export function setLastTgSync(key, ts) {
  const s = state.sessions[key];
  if (!s) return;
  s.lastTgSync = ts;
  scheduleFlush(key);
}

// ====================== ANALYTICS ======================
export function logEvent(sessionKey, type, payload = {}) {
  try {
    openDb().prepare(
      'INSERT INTO events (ts, session_key, type, payload) VALUES (?, ?, ?, ?)'
    ).run(Date.now(), sessionKey || null, type, JSON.stringify(payload || {}));
  } catch (e) {
    console.warn('logEvent failed:', e.message);
  }
}

/** Сводка за последние days суток */
export function getAnalytics(days = 7) {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const counts = openDb().prepare(`
    SELECT type, COUNT(*) AS n FROM events WHERE ts >= ? GROUP BY type
  `).all(since);

  const byType = {};
  for (const r of counts) byType[r.type] = r.n;

  const sessions = Object.values(state.sessions);
  const stages = {};
  let hot = 0, withProfile = 0;
  for (const s of sessions) {
    stages[s.stage || 'unknown'] = (stages[s.stage || 'unknown'] || 0) + 1;
    if (s.hotNotified) hot++;
    if (s.profile?.city && (s.profile?.service || s.profile?.eventDate)) withProfile++;
  }

  return {
    days,
    events: byType,
    sessions_total: sessions.length,
    sessions_with_profile: withProfile,
    sessions_hot_flag: hot,
    stages,
  };
}
