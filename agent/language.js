// agent/language.js
import { SUPPORTED_LANGS, DEFAULT_LANG } from './config.js';

// Определяем язык по Unicode-блокам и частым словам.
export function detectLanguage(text) {
  if (!text) return null;
  const t = String(text).slice(0, 400);

  // Армянский: уникальный Unicode-блок
  if (/[\u0530-\u058F]/.test(t)) return 'hy';

  // Испанский: ñ, ¿, ¡, типичные слова
  const esHits =
    (t.match(/[ñ¿¡]/g) || []).length +
    (t.match(/\b(hola|gracias|precio|quiero|necesito|evento|boda|ciudad|fecha|presupuesto|catering|carpas?|invitados)\b/gi) || []).length * 2;
  if (esHits >= 2) return 'es';

  // Русский: кириллица
  const cyrHits = (t.match(/[\u0400-\u04FF]/g) || []).length;
  if (cyrHits >= 3) return 'ru';

  // Английский: короткие частые слова
  const enHits = (t.match(/\b(hello|thanks|price|want|need|event|wedding|city|date|budget|catering|tents?|rental|please|guests)\b/gi) || []).length;
  if (enHits >= 1) return 'en';

  return null;
}

// Слить: если свежий текст не дал сигнала, оставляем язык сессии.
export function resolveLanguage(text, prevLang) {
  const detected = detectLanguage(text);
  if (detected) return detected;
  if (prevLang && SUPPORTED_LANGS.includes(prevLang)) return prevLang;
  return DEFAULT_LANG;
}
