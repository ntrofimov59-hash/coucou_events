// agent/voice.js — скачивание и транскрипция голосовых через Groq Whisper
import { groq } from './config.js';
import { resolveLanguage } from './language.js';
import fs from 'fs';
import os from 'os';
import path from 'path';

const WHISPER_MODEL = process.env.WHISPER_MODEL || 'whisper-large-v3-turbo';
const MAX_AUDIO_SECONDS = Number(process.env.MAX_AUDIO_SECONDS || 120); // отсекаем слишком длинные

/**
 * Транскрибирует аудио-буфер.
 * @param {Buffer} audioBuffer
 * @param {string} [mimeType] — 'audio/ogg', 'audio/mpeg', 'audio/wav' и т.д.
 * @param {string} [langHint] — подсказка языка ('ru', 'en', 'es', 'hy')
 * @returns {Promise<{text: string, language?: string, duration?: number}>}
 */
export async function transcribeVoice(audioBuffer, mimeType, langHint) {
  if (!audioBuffer || !audioBuffer.length) {
    throw new Error('empty audio buffer');
  }

  // Проверяем размер (Groq free tier: 25 MB)
  if (audioBuffer.length > 25 * 1024 * 1024) {
    throw new Error('audio too large (>25MB)');
  }

  // Сохраняем во временный файл — Groq SDK ждёт File/Stream
  const ext = mimeTypeToExt(mimeType);
  const tmpPath = path.join(os.tmpdir(), `voice-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
  fs.writeFileSync(tmpPath, audioBuffer);

  try {
    const params = {
      file: fs.createReadStream(tmpPath),
      model: WHISPER_MODEL,
      response_format: 'verbose_json', // даёт language + duration
    };

    // Если есть подсказка языка — передаём (Whisper лучше работает с ISO-639-1)
    if (langHint && ['ru', 'en', 'es', 'hy'].includes(langHint)) {
      params.language = langHint;
    }

    const result = await groq.audio.transcriptions.create(params);

    return {
      text: (result.text || '').trim(),
      language: result.language || null,
      duration: result.duration || null,
    };
  } finally {
    // Всегда чистим временный файл
    try { fs.unlinkSync(tmpPath); } catch {}
  }
}

function mimeTypeToExt(mimeType) {
  if (!mimeType) return 'ogg';
  const m = String(mimeType).toLowerCase();
  if (m.includes('ogg')) return 'ogg';
  if (m.includes('mpeg') || m.includes('mp3')) return 'mp3';
  if (m.includes('wav')) return 'wav';
  if (m.includes('mp4') || m.includes('m4a')) return 'm4a';
  if (m.includes('webm')) return 'webm';
  return 'ogg';
}

/**
 * Обрабатывает голосовое сообщение: транскрибирует, обновляет язык сессии.
 * Возвращает текст для передачи в handleIncoming.
 */
export async function processVoice({ audioBuffer, mimeType, sessionKey }) {
  // Пытаемся определить язык сессии для подсказки
  const langHint = undefined; // Пока без подсказки — Whisper сам определит

  const { text, language, duration } = await transcribeVoice(audioBuffer, mimeType, langHint);

  if (duration && duration > MAX_AUDIO_SECONDS) {
    console.warn(`🎤 Voice: post-check, длительность ${duration}s > ${MAX_AUDIO_SECONDS}s`);
  }

  if (!text) {
    console.log(`🎤 Voice: пустая транскрипция (${duration || '?'}s)`);
    return null;
  }

  console.log(`🎤 Voice [${language || 'auto'}, ${duration || '?'}s]: "${text.slice(0, 80)}..."`);
  return text;
}
