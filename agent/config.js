// agent/config.js
import fs from 'fs';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { Client as NotionClient } from '@notionhq/client';

dotenv.config();

export const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

export const SUPPORTED_LANGS = ['ru', 'en', 'es', 'hy'];
export const DEFAULT_LANG = 'ru';

export const LANG_NAMES = {
  ru: 'Russian',
  en: 'English',
  es: 'Spanish',
  hy: 'Armenian',
};

export const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

export const notion = new NotionClient({ auth: process.env.NOTION_TOKEN });
export const DATABASE_ID = process.env.NOTION_DATABASE_ID;

export const DATA_DIR = new URL('./data/', import.meta.url).pathname;
export const SESSIONS_FILE = DATA_DIR + 'sessions.json';
export const SESSIONS_DB = DATA_DIR + 'sessions.db';

// TTL: через сколько мс считаем сессию «холодной» и убираем из памяти
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 дней

// Сколько последних ходов держим в окне LLM
export const MAX_TURNS_IN_WINDOW = 12;

// Chrome path — автоопределение под Linux
export function getChromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
  ];
  for (const p of candidates) {
    try { if (fs.existsSync(p)) return p; } catch {}
  }
  return undefined; // whatsapp-web.js возьмёт bundled puppeteer
}
