// agent/knowledge.js — простой keyword-RAG по MDX-услугам
import fs from 'fs';
import path from 'path';
import { SUPPORTED_LANGS } from './config.js';

const SERVICES_DIR = path.resolve(
  new URL('.', import.meta.url).pathname,
  '..', 'src', 'content', 'services'
);

const docs = []; // { lang, slug, title, raw, lower }

function parseMdx(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { frontmatter: '', body: raw };
  return { frontmatter: m[1], body: m[2] };
}

function extractTitle(frontmatter, slug) {
  const t = frontmatter.match(/^title:\s*["']?(.+?)["']?\s*$/m);
  return t ? t[1].trim() : slug;
}

// Соответствие кодов языков агента и имён папок на диске
const LANG_TO_DIR = { ru: 'ru', en: 'eng', es: 'esp', hy: 'arm' };

export function loadKnowledge() {
  docs.length = 0;
  if (!fs.existsSync(SERVICES_DIR)) {
    console.warn('⚠️ knowledge: нет папки', SERVICES_DIR);
    return;
  }
  for (const lang of SUPPORTED_LANGS) {
    const dirName = LANG_TO_DIR[lang] || lang;
    const dir = path.join(SERVICES_DIR, dirName);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.mdx')) continue;
      const slug = file.replace(/\.mdx$/, '');
      const raw = fs.readFileSync(path.join(dir, file), 'utf8');
      const { frontmatter, body } = parseMdx(raw);
      const title = extractTitle(frontmatter, slug);
      // Чистим markdown — убираем разметку, ссылки, лишние символы
      const cleanBody = body
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/[#*_>]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const full = `${title}. ${frontmatter} ${cleanBody}`;
      docs.push({
        lang, slug, title,
        raw: cleanBody.slice(0, 1200),
        lower: full.toLowerCase(),
      });
    }
  }
  console.log(`📚 knowledge: загружено ${docs.length} док. по услугам`);
}

// Строим ключевые слова из запроса
const STOP = new Set(['и','в','на','с','для','по','от','до','мне','хочу','нужно','надо',
  'the','a','an','for','to','of','in','on','at','with','i','we','need','want',
  'y','en','el','la','de','para','con','quiero','necesito',
  'և','ում','եմ','ենք','մեզ','պետք','ուզում']);

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOP.has(w));
}

// Определяем, какая услуга упомянута
const SERVICE_HINTS = {
  marquees:     ['шат', 'тент', 'каркас', 'tent', 'marquee', 'carpa', 'վրան'],
  catering:     ['кейтер', 'еда', 'меню', 'catering', 'food', 'menu', 'comida', 'քեյթ', 'սնունդ'],
  decor:        ['декор', 'оформлен', 'цвет', 'decor', 'flowers', 'decoración', 'դեկոր'],
  'photo-video':['фото', 'видео', 'съемк', 'photo', 'video', 'foto', 'լուսանկ', 'տեսանկ'],
  entertainment:['музык', 'dj', 'артист', 'шоу', 'entertainment', 'music', 'show', 'երաժշտ', 'շոու'],
  transfer:     ['трансфер', 'автобус', 'перевоз', 'transfer', 'bus', 'traslado', 'տրանսֆեր'],
  turnkey:      ['под ключ', 'организац', 'мероприят', 'full service', 'turnkey', 'llave en mano', 'բանալիով'],
  biotoilets:   ['туалет', 'биотуалет', 'toilet', 'baño', 'զուգարան'],
  ceremony:     ['свадьб', 'церемони', 'wedding', 'ceremony', 'boda', 'ceremonia', 'հարսանիք', 'արարողություն'],
};

function detectServiceSlug(text) {
  const t = String(text || '').toLowerCase();
  let best = null, bestHits = 0;
  for (const [slug, hints] of Object.entries(SERVICE_HINTS)) {
    const hits = hints.filter(h => t.includes(h)).length;
    if (hits > bestHits) { bestHits = hits; best = slug; }
  }
  return best;
}

export function searchKnowledge(query, { lang, max = 3 } = {}) {
  if (!docs.length) return '';
  const tokens = tokenize(query);
  const wantSlug = detectServiceSlug(query);

  // Скорим доки: та же языковая группа приоритетнее + keyword hits + slug
  const scored = docs.map(d => {
    let score = 0;
    // язык: точное совпадение +5, любой SUPPORTED — +2
    if (d.lang === lang) score += 5;
    else if (SUPPORTED_LANGS.includes(d.lang)) score += 2;

    // slug matches
    if (wantSlug && d.slug === wantSlug) score += 8;

    // keyword hits
    for (const tok of tokens) {
      if (d.lower.includes(tok)) score += 1;
    }
    return { doc: d, score };
  });

  const top = scored
    .filter(s => s.score > 5)              // отсекаем мусор
    .sort((a, b) => b.score - a.score)
    .slice(0, max);

  if (!top.length) return '';

  return top
    .map(s => `[${s.doc.lang}/${s.doc.slug}] ${s.doc.title}\n${s.doc.raw.slice(0, 300)}`)
    .join('\n\n---\n\n');
}
