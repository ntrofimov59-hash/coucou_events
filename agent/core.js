// agent/core.js — мозги агента: LLM, CRM, этапы, языки, RAG
import { groq, MODEL, LANG_NAMES } from './config.js';
import { resolveLanguage } from './language.js';
import { buildSystemPrompt } from './prompts/index.js';
import { searchKnowledge } from './knowledge.js';
import * as store from './store.js';
import * as control from './control.js';
import { queryDatabase, createPage, updatePage } from './notion-client.js';
import * as notionQueue from './notion-queue.js';
import * as usage from './usage.js';

export const stats = { total: 0, relevant: 0, saved: 0, objections: 0, email: 0, spam: 0 };
export function logStat() {
  console.log(`📊 total=${stats.total} relevant=${stats.relevant} saved=${stats.saved} obj=${stats.objections} email=${stats.email} spam=${stats.spam}`);
}

// ====================== РЕЛЕВАНТНОСТЬ ======================
const RELEVANCE_KEYWORDS = [
  'шатер','шатёр','тент','свадьб','корпоратив','мероприятие','банкет','день рожден','юбилей',
  'аренда','организ','праздник','гости','дата','бюджет','локация','площадка','кейтеринг','заявк','смет',
  'ереван','тбилиси','прага','пхукет','анталья','дананг','нячанг','марракеш','будапешт','белград','бали','гоа',
  'tent','wedding','corporate','event','banquet','birthday','anniversary','rental','rent','organize','party',
  'guests','date','budget','venue','catering','quote','proposal','inquiry',
  'yerevan','tbilisi','prague','phuket','antalya','da nang','nha trang','marrakech','budapest','belgrade','bali','goa',
  'carpa','boda','corporativo','evento','banquete','cumpleaños','aniversario','alquiler','alquilar','organizar',
  'fiesta','invitados','fecha','presupuesto','lugar','cotización','propuesta','solicitud','ereván','tiflis','praga','belgrado',
  'վրան','հարսանիք','կորպորատիվ','միջոցառում','բանկետ','ծնունդ','հոբելյան','վարձույթ','կազմակերպ','տոն',
  'հյուրեր','ամսաթիվ','բյուջե','վայր','հարթակ','քեյթերինգ','հայտ','առաջարկ','երևան','թբիլիսի','պրահա','փհուկետ',
  'անթալիա','դանանգ','նյաչանգ','մարաքեշ','բուդապեշտ','բելգրադ','բալի','գոա',
];
// Явный чёрный список — что точно НЕ является заявкой
const IRRELEVANT_PATTERNS = [
  // Трудоустройство
  /(резюме|ваканси|трудоустро|ищу\s+работ|собеседован|офис-менеджер|зарплат|на\s+должность|hr\b|hiring|job\s+offer|ищем\s+сотрудника|ищу\s+подработ)/i,
  /(vacancy|resume|cv\b|apply for|job application|interview|looking for a job|соискатель)/i,
  // Реклама/спам-услуги
  /(предлагаю\s+услуг|оказываю\s+услуг|мы\s+предлагаем|b2b|оптов|сотрудничеств|партнёрств|партнерств)/i,
  // Не по теме
  /(кредит|займ|invest|investitsii|инвестиц|казино|ставки\s+на\s+спорт|crypto|биткоин)/i,
];

export function isIrrelevant(text) {
  const t = String(text || '');
  return IRRELEVANT_PATTERNS.some(re => re.test(t));
}

// Чистые подтверждения — не требуют ответа, экономят токены
const ACK_WORDS = new Set([
  // RU
  'ок','окей','оке','хорошо','понятно','ясно','понял','поняла','ладно','угу','ух','ага','да','конечно','спасибо','спс','благодарю',
  // EN
  'ok','okay','k','kk','sure','yes','yep','yeah','yup','got','it','understood','alright','thanks','thank','thx','ty',
  // ES
  'vale','bien','si','sí','claro','gracias','perfecto','okey','entiendo',
  // HY
  'այո','լավ','հասկացա','շնորհակալություն','պարզ','իհարկե',
]);

export function isPureAck(text) {
  const t = String(text || '').toLowerCase().trim();
  if (!t) return true;
  // Только эмодзи / пунктуация
  const cleaned = t.replace(/[^\p{L}\p{N}\s]/gu, '').trim();
  if (!cleaned) return true;
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  // Длинное сообщение — точно не ack
  if (words.length > 3) return false;
  // Все слова — из списка подтверждений
  return words.every(w => ACK_WORDS.has(w));
}

export function isRelevantMessage(text) {
  const lower = (text || '').toLowerCase();
  if (!lower.trim()) return false;
  return RELEVANCE_KEYWORDS.some(k => lower.includes(k));
}

const SPAM_KEYWORDS = ['unsubscribe','viagra','casino','crypto giveaway','you won','бесплатный приз',
  'кликни сюда','urgent wire','nigerian','lottery','bitcoin investment','секс знаком'];
export function isSpam(text) {
  const lower = (text || '').toLowerCase();
  return SPAM_KEYWORDS.some(k => lower.includes(k));
}

// ====================== ЭТАПЫ ======================
function inferStage(profile, session) {
  const has = (k) => profile?.[k] && String(profile[k]).trim();
  // Если в сессии уже есть ходы — это НЕ приветствие
  const hasHistory = session?.turns?.length > 0;
  if (!has('name')) return hasHistory ? 'qualification' : 'greeting';
  if (!has('service') || !has('city')) return 'qualification';
  if (!has('eventDate') || !has('guests')) return 'qualification';
  if (!has('budget')) return 'proposal';
  return 'closing';
}

// ====================== ИЗВЛЕЧЕНИЕ ПРОФИЛЯ ======================
const CITY_LIST = [
  'Ереван','Бали','Гоа','Тбилиси','Прага','Нячанг','Анталья','Дананг','Белград','Будапешт',
  'Касабланка','Марракеш','Пхукет',
  'Yerevan','Bali','Goa','Tbilisi','Prague','Nha Trang','Antalya','Da Nang','Belgrade','Budapest',
  'Casablanca','Marrakech','Phuket','Ereván','Erevan','Tiflis','Praga',
  'Երևան','Բալի','Գոա','Թբիլիսի','Պրահա','Նյաչանգ','Անթալիա','Դանանգ','Բելգրադ','Բուդապեշտ',
  'Կասաբլանկա','Մարաքեշ','Փհուկետ',
];
const NAME_BLACKLIST = new Set([
  'привет','здравствуйте','добрый','день','вечер','утро','хорошо','спасибо',
  'hello','hi','thanks','please','hola','gracias','բարև','շնորհակալություն',
]);

export function extractProfileFromText(text) {
  return extractProfile(text);
}

function extractProfile(text) {
  const out = {};
  const t = String(text || '').trim();
  if (!t) return out;
  const lower = t.toLowerCase();

  let m = t.match(/(?:меня\s+зовут|мо[её]\s+имя|my\s+name\s+is|me\s+llamo|i\s+am|i'm)\s+([\p{Lu}][\p{Ll}]{1,24})/iu);
  if (!m) m = t.match(/меня\s+([\p{Lu}][\p{Ll}]{1,24})\s+зовут/iu);
  if (m) {
    const cand = m[1];
    if (!NAME_BLACKLIST.has(cand.toLowerCase())) out.name = cand;
  }

  if (/шат[её]р|тент|tents?|marquee|carpa|վրան/i.test(t)) out.service = 'tents';
  else if (/свадьб|wedding|boda|հարսանիք/i.test(t)) out.service = 'wedding';
  else if (/корпоратив|corporate|corporativo|կորպորատիվ/i.test(t)) out.service = 'corporate';
  else if (/кейтер|catering|քեյթ/i.test(t)) out.service = 'catering';
  else if (/декор|decor|դեկոր/i.test(t)) out.service = 'decor';
  else if (/фото|видео|photo|video|foto/i.test(t)) out.service = 'photo-video';
  else if (/музык|dj|артист|шоу|entertainment|music|show/i.test(t)) out.service = 'entertainment';
  else if (/трансфер|transfer|traslado/i.test(t)) out.service = 'transfer';

  for (const c of CITY_LIST) {
    if (lower.includes(c.toLowerCase())) { out.city = c; break; }
  }

  const g = t.match(/(\d{1,5})\s*(?:гост|guest|invitad|հյուր|человек|people|personas)/i);
  if (g) out.guests = g[1];

  const d = t.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/);
  if (d) {
    const iso = normalizeDate(d[0]);
    if (iso) out.eventDate = iso;
  }

  const b = t.match(/(?:бюджет|budget|presupuesto|բյուջե)\D{0,15}(\d[\d\s,.]{1,12})/i);
  if (b) out.budget = b[1].replace(/[\s,]/g, '');

  return out;
}

// Нормализуем название услуги к ключу (tents/wedding/...)
const SERVICE_ALIASES = [
  [/(аренд\w*\s*шат|шат[её]р|тент|tents?|marquee|carpa|վրան)/i, 'tents'],
  [/(свадьб|wedding|boda|հարսանիք)/i, 'wedding'],
  [/(корпоратив|corporate|corporativo|կորպորատիվ)/i, 'corporate'],
  [/(кейтер|catering|քեյթ)/i, 'catering'],
  [/(декор|decor|դեկոր)/i, 'decor'],
  [/(фото|видео|photo|video|foto)/i, 'photo-video'],
  [/(музык|dj|артист|шоу|entertainment|music|show)/i, 'entertainment'],
  [/(трансфер|transfer|traslado)/i, 'transfer'],
  [/(под ключ|turnkey|мероприятие|бізнес|banquet|event)/i, 'turnkey'],
];
function normalizeService(raw) {
  if (!raw) return raw;
  const s = String(raw);
  for (const [re, key] of SERVICE_ALIASES) if (re.test(s)) return key;
  return s;
}

// Нормализуем любые даты к ISO YYYY-MM-DD
function normalizeDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  let m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (m) {
    let [_, d, mo, y] = m;
    if (y.length === 2) y = '20' + y;
    const dd = d.padStart(2, '0');
    const mm = mo.padStart(2, '0');
    if (+mm < 1 || +mm > 12 || +dd < 1 || +dd > 31) return null;
    return `${y}-${mm}-${dd}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}

function needsAutoSave(profile) {
  return profile.name && profile.city && profile.service;
}

function profileSignature(profile) {
  return [profile.name, profile.city, profile.service, profile.eventDate, profile.guests, profile.budget]
    .map(x => x || '').join('|');
}

// ====================== CRM ======================
const STAGE_TO_NOTION = {
  greeting: 'New Lead', qualification: 'Qualification', proposal: 'Proposal',
  objections: 'Negotiation', closing: 'Negotiation', followup: 'New Lead',
};

async function findLeadInNotion(phone, name, city) {
  try {
    const filters = [];
    if (phone && phone !== 'N/A') filters.push({ property: 'Phone', rich_text: { contains: phone } });
    if (name && name !== 'Клиент') filters.push({ property: 'Name', title: { contains: name } });
    if (city && city !== 'N/A') filters.push({ property: 'City', rich_text: { contains: city } });
    if (!filters.length) return null;
    const results = await queryDatabase({ filter: { or: filters }, page_size: 1 });
    return results[0] || null;
  } catch (e) {
    console.error('Ошибка поиска в Notion:', e.message);
    return null;
  }
}

export async function saveOrUpdateLeadDirect(args) {
  try {
    const existing = await findLeadInNotion(args.phone, args.clientName, args.city);
    const formattedDate = normalizeDate(args.eventDate);
    const numericBudget = args.budget ? Number(String(args.budget).replace(/[^0-9]/g, '')) : null;
    const source = args.source || 'Unknown';
    const detailsWithSource = `[${source}] ${args.details || 'N/A'}`;
    const properties = {
      'Name': { title: [{ text: { content: args.clientName || 'Клиент' } }] },
      'Phone': { rich_text: [{ text: { content: args.phone || 'N/A' } }] },
      'City': { rich_text: [{ text: { content: args.city || 'N/A' } }] },
      'Language': { select: { name: args.language || 'Russian' } },
      'Details': { rich_text: [{ text: { content: detailsWithSource } }] },
      'Status': { select: { name: STAGE_TO_NOTION[args.stage] || args.stage || 'New Lead' } },
      'Source': { select: { name: source } },
    };
    if (formattedDate) properties['Date'] = { date: { start: formattedDate } };
    if (!isNaN(numericBudget) && numericBudget) properties['Budget'] = { number: numericBudget };

    if (existing) {
      await updatePage(existing.id, properties);
      console.log(`🔄 Лид обновлён [${source}]`);
    } else {
      await createPage(properties);
      console.log(`💾 Новый лид [${source}]`);
    }
    stats.saved++;
  } catch (e) {
    console.error('Ошибка CRM:', e.message);
  }
}

// ====================== LLM ======================
const FALLBACKS_FIRST = {
  ru: 'Здравствуйте! Прошу прощения за заминку — подскажите, пожалуйста, какой у вас запрос?',
  en: 'Hello! Sorry for the delay — could you tell me what you are looking for?',
  es: '¡Hola! Disculpa la demora — ¿podrías decirme qué necesitas?',
  hy: 'Բարև Ձեզ։ Ներողություն ուշացման համար — խնդրում եմ ասեք ինչի՞ կարիք ունեք։',
};

const FALLBACKS_MID = {
  ru: 'Прошу прощения, техническая заминка — вернусь с ответом через минуту.',
  en: 'Sorry, a brief technical hiccup — back with an answer in a minute.',
  es: 'Disculpa, un pequeño problema técnico — vuelvo con la respuesta en un minuto.',
  hy: 'Ներողություն, տեխնիկական դադար — մեկ րոպեից կվերադառնամ պատասխանով։',
};

// Выбор fallback: первое сообщение или середина диалога
function pickFallback(lang, hasHistory) {
  const map = hasHistory ? FALLBACKS_MID : FALLBACKS_FIRST;
  return map[lang] || map.ru;
}

const LANG_TO_NOTION = { ru: 'Russian', en: 'English', es: 'Spanish', hy: 'Armenian' };

// Retry для Groq: 429 (rate limit), 5xx (server), network
async function callGroq(params, maxRetries = 3) {
  let lastErr;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await groq.chat.completions.create(params);
    } catch (e) {
      lastErr = e;
      const status = e?.status || e?.response?.status || e?.statusCode;
      const isRetryable = status === 429 || (status >= 500 && status < 600) || /timeout|ECONNRESET|ETIMEDOUT/i.test(e?.message || '');
      if (!isRetryable || i === maxRetries - 1) throw e;
      const delay = 1000 * Math.pow(2, i); // 1s, 2s, 4s
      console.warn(`⚠️ Groq ${status || 'error'} (${e.message?.slice(0,60)}), retry через ${delay}ms (попытка ${i+1}/${maxRetries})`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

function sourceFromKey(key) {
  if (key.startsWith('tg_')) return 'Telegram';
  if (key.startsWith('wa_')) return 'WhatsApp';
  if (key.startsWith('email_')) return 'Email';
  return 'Unknown';
}

// Парсим скрытый CRM-блок из ответа
function extractCrmBlock(text) {
  if (!text) return { cleaned: '', crm: null };
  const m = text.match(/<!--\s*CRM:\s*(\{[\s\S]*?\})\s*-->/);
  if (!m) return { cleaned: text.trim(), crm: null };
  let crm = null;
  try { crm = JSON.parse(m[1]); } catch (e) {
    console.warn('⚠️ CRM JSON parse error:', e.message);
  }
  const cleaned = text.replace(m[0], '').trim();
  return { cleaned, crm };
}

// Мелкая чистка ответа: убираем двоеточие после имени, лишние пробелы, пробел перед знаком
function cleanupReply(text) {
  if (!text) return text;
  let t = text;
  // "Бարև, Nikita: Երևանում" → "Բարև, Nikita, Երևանում"
  // "Привет! Никита: тест"     → "Привет! Никита, тест"
  t = t.replace(/^((?:[\p{L}]{2,15})[,.!]\s+)([\p{Lu}][\p{Ll}]{1,24})\s*:\s+/u, '$1$2, ');
  // fallback: "Name: текст" в самом начале
  t = t.replace(/^([\p{Lu}][\p{Ll}]{1,24})\s*:\s+(?=[\p{L}])/u, '$1, ');
  // Убираем пробел перед знаками препинания
  t = t.replace(/\s+([,.!?;:])/g, '$1');
  // Двойные пробелы
  t = t.replace(/[ \t]{2,}/g, ' ');
  // Двойные переводы строк
  t = t.replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

// Отправляем уведомление менеджеру в Telegram через booking-бота
async function notifyManager({ reason, sessionKey, lastMessages, profile }) {
  const token = process.env.BOOKING_BOT_TOKEN;
  const chatId = process.env.BOOKING_CHAT_ID;
  if (!token || !chatId) {
    console.warn('⚠️ BOOKING_BOT_TOKEN/CHAT_ID не заданы — эскалация только в лог');
    return false;
  }
  const lines = [
    `🚨 *Эскалация: нужен человек*`,
    `Причина: ${reason}`,
    `Сессия: \`${sessionKey}\``,
    `Имя: ${profile?.name || '—'}`,
    `Город: ${profile?.city || '—'}`,
    `Услуга: ${profile?.service || '—'}`,
    `Гости: ${profile?.guests || '—'}`,
    `Дата: ${profile?.eventDate || '—'}`,
    `Бюджет: ${profile?.budget || '—'}`,
    ``,
    `Последние сообщения:`,
    ...lastMessages.slice(-3).map(m => `• [${m.role}] ${String(m.content).slice(0, 200)}`),
    ``,
    `В чате включена пауза бота на 24 ч. Ответьте сами: /start чтобы вернуть бота.`,
  ];
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: lines.join('\n'), parse_mode: 'Markdown' }),
    });
    const data = await res.json();
    if (!data.ok) console.error('❌ notifyManager failed:', data.description);
    return data.ok;
  } catch (e) {
    console.error('notifyManager error:', e.message);
    return false;
  }
}

// Просит ли клиент живого менеджера?
function wantsHuman(text) {
  const t = (text || '').toLowerCase();
  return /(позов|дайте|можно|хочу|дай).{0,20}(менеджер|человек|оператор|manager|human|agent|gerente|persona|մենեջեր|մարդ)/i.test(t)
    || /(позвони|набери|call me|llámame|զանգ)/i.test(t)
    || /(живой|real person|real human|persona real|իրական մարդ)/i.test(t);
}

export async function generateReply(sessionKey, userMessage) {
  let session = store.getSession(sessionKey);
  const lang = resolveLanguage(userMessage, session?.lang);
  const source = sourceFromKey(sessionKey);

  if (!session) {
    session = store.createSession(sessionKey, { lang, source });
    console.log(`🌐 Язык сессии: ${lang}`);
  } else if (lang !== session.lang) {
    console.log(`🌐 Язык: ${session.lang} → ${lang}`);
    store.setLang(sessionKey, lang);
    session = store.getSession(sessionKey);
  }

  // Regex-извлечение (всегда)
  const extracted = extractProfile(userMessage);
  if (Object.keys(extracted).length) {
    console.log('🧩 Extracted:', extracted);
    store.updateProfile(sessionKey, extracted);
    session = store.getSession(sessionKey);
  }

  // Auto-save при готовности профиля
  const p = session.profile;
  if (needsAutoSave(p)) {
    const sig = profileSignature(p);
    if (session.lastSavedSig !== sig) {
      try {
        console.log('💾 Auto-save → Notion');
        await saveOrUpdateLead({
          clientName: p.name, city: p.city, service: p.service,
          phone: p.phone, eventDate: p.eventDate, guests: p.guests, budget: p.budget,
          details: p.details || `Service: ${p.service}. City: ${p.city}.` + (p.guests ? ` Guests: ${p.guests}.` : ''),
          language: LANG_TO_NOTION[lang] || 'Russian',
          stage: inferStage(p, session), source,
        });
        session.lastSavedSig = sig;
        store.saveSession(sessionKey);
      } catch (e) {
        console.error('Auto-save failed:', e.message);
      }
    }
  }

  // Возражения
  const objection = detectObjection(userMessage);
  if (objection) { stats.objections++; console.log(`🛑 Objection: ${objection}`); logStat(); }
  const stage = objection ? 'objections' : inferStage(session.profile, session);
  console.log(`🎯 Stage: ${stage} | profile: ${p.name || '—'} | ${p.city || '—'} | ${p.service || '—'}`);

  // RAG + objection hint
  const useKnowledge = (userMessage || '').length >= 30;
  const knowledge = useKnowledge ? searchKnowledge(userMessage, { lang, max: 2 }) : '';
  const objectionHint = objection && OBJECTION_PLAYBOOK[objection]
    ? (OBJECTION_PLAYBOOK[objection][lang] || OBJECTION_PLAYBOOK[objection].ru) : '';

  // Контекст ручных сообщений менеджера
  let managerContext = '';
  if (session.managerMessages?.length) {
    const recent = session.managerMessages.slice(-5);
    managerContext = '\n\n=== ПОСЛЕДНИЕ СООБЩЕНИЯ МЕНЕДЖЕРА В ЧАТЕ (уже отправлены клиенту) ===\n'
      + recent.map(m => `• ${m.text}`).join('\n')
      + '\n\nКлиент видел эти сообщения. Учитывай их в контексте, но НЕ повторяй дословно.';
  }

  const systemPrompt = buildSystemPrompt({ lang, stage, profile: session.profile, knowledge, objectionHint })
    + managerContext
    + `\n\n=== CRITICAL LANGUAGE RULE ===\nReply ONLY in ${LANG_NAMES[lang] || 'Russian'}. Even if the prior history is in another language, your NEXT reply MUST be in ${LANG_NAMES[lang] || 'Russian'}.`
    + `\n\n=== LENGTH RULE ===\nWrite 2-4 short sentences. No long bullet lists, no headers.`
    + `\n\n=== HIDDEN CRM BLOCK ===\nIf you learned new info about the client (name, city, service, date, guests, budget, phone), append on a NEW LINE at the very END of your reply a single line:\n<!--CRM:{"clientName":"...","city":"...","service":"...","eventDate":"YYYY-MM-DD","guests":"...","budget":"...","phone":"...","details":"..."}-->\nOnly include fields you actually learned. If nothing new — do NOT add the line. This line is stripped before sending to the user.`

  const messages = store.buildMessages(sessionKey, systemPrompt, 6);
  messages.push({ role: 'user', content: userMessage });

  let completion;
  try {
    completion = await callGroq({
      model: MODEL, messages,
      temperature: 0.4, max_tokens: 400,
      reasoning_effort: 'low',
    });
  } catch (err) {
    console.error('Ошибка основной модели:', err.message);
    // Fallback 1: пробуем более быструю/дешёвую модель
    try {
      console.log('🔁 Retry с gpt-oss-20b...');
      completion = await groq.chat.completions.create({
        model: 'openai/gpt-oss-20b',
        messages,
        temperature: 0.4, max_tokens: 300,
        reasoning_effort: 'low',
      });
      if (completion?.usage) {
        try {
          usage.trackTokens(completion.usage.total_tokens, completion.usage.prompt_tokens, completion.usage.completion_tokens);
        } catch {}
      }
      console.log('✅ Retry успешен');
    } catch (err2) {
      console.error('Ошибка retry (20b):', err2.message);
      return pickFallback(lang, (session?.turns?.length || 0) > 0);
    }
  }

  if (completion.usage) {
    console.log(`🧮 tokens: in=${completion.usage.prompt_tokens} out=${completion.usage.completion_tokens} total=${completion.usage.total_tokens}`);
    try {
      usage.trackTokens(
        completion.usage.total_tokens,
        completion.usage.prompt_tokens,
        completion.usage.completion_tokens
      );
    } catch (e) { console.warn('usage.trackTokens:', e.message); }
  }

  const raw = completion.choices[0].message.content || '';
  const { cleaned, crm } = extractCrmBlock(raw);

  let finalText = cleanupReply(cleaned);

  // Обрабатываем CRM-блок
  if (crm) {
    for (const k of Object.keys(crm)) if (crm[k] === null || crm[k] === undefined || crm[k] === '') delete crm[k];
    crm.source = crm.source || source;
    crm.language = LANG_TO_NOTION[lang] || 'Russian';
    crm.stage = crm.stage || stage;
    // Заполняем дефолты для required полей
    if (!crm.clientName) crm.clientName = session.profile.name || 'Клиент';
    if (!crm.city) crm.city = session.profile.city || 'Уточняется';
    if (!crm.details) {
      crm.details = `Service: ${crm.service || session.profile.service || 'unknown'}. City: ${crm.city}.` +
        (crm.guests ? ` Guests: ${crm.guests}.` : '');
    }
    console.log('🛠 CRM from block:', crm);
    await saveOrUpdateLead(crm);
    store.updateProfile(sessionKey, {
      name: crm.clientName, phone: crm.phone, city: crm.city,
      eventDate: crm.eventDate, guests: crm.guests, budget: crm.budget,
      service: crm.service, details: crm.details,
    });
  }

  if (!finalText) finalText = pickFallback(lang, (session?.turns?.length || 0) > 0);
  store.pushTurn(sessionKey, userMessage, finalText);
  return finalText;
}

// ====================== ВОЗРАЖЕНИЯ ======================
const OBJECTION_PLAYBOOK = {
  expensive: {
    ru: 'Клиент считает, что дорого. НЕ оправдывайся. Дай 1 сильный аргумент и уточни бюджетный ориентир.',
    en: 'Client thinks it is expensive. DO NOT apologize. Give one strong argument and ask for their budget range.',
    es: 'El cliente cree que es caro. NO te disculpes. Da un argumento sólido y pregunta el presupuesto.',
    hy: 'Հաճախորդը կարծում է, որ թանկ է։ ՄԻ՛ արդարացիր։ Տուր մեկ ուժեղ փաստարկ և հարցրու բյուջեն։',
  },
  think: {
    ru: 'Клиент хочет подумать. Не дави. Предложи конкретный следующий шаг — короткое КП на 2-3 варианта.',
    en: 'Client wants to think. Do not push. Offer a concrete next step — a short proposal with 2-3 options.',
    es: 'El cliente quiere pensarlo. No presiones. Ofrece un siguiente paso concreto.',
    hy: 'Հաճախորդը ուզում է մտածել։ Մի՛ ճնշիր։ Առաջարկիր կոնկրետ հաջորդ քայլ։',
  },
  compare: {
    ru: 'Клиент сравнивает с конкурентами. Подчеркни 1-2 реальных отличия без критики других.',
    en: 'Client is comparing competitors. Highlight 1-2 real advantages without criticizing others.',
    es: 'El cliente compara competidores. Destaca 1-2 ventajas reales.',
    hy: 'Հաճախորդը համեմատում է մրցակիցների հետ։ Առանձնացրու 1-2 իրական առավելություն։',
  },
  later: {
    ru: 'Клиент откладывает. Согласись без давления. Предложи зафиксировать интерес.',
    en: 'Client is postponing. Agree without pressure. Offer to hold the interest.',
    es: 'El cliente lo pospone. Acepta sin presión.',
    hy: 'Հաճախորդը հետաձգում է։ Համաձայնիր առանց ճնշման։',
  },
  busy: {
    ru: 'Клиент занят. Дай очень краткий ответ (1-2 предложения) и один простой вопрос.',
    en: 'Client is busy. Give a very short reply (1-2 sentences) and one simple question.',
    es: 'El cliente está ocupado. Respuesta muy corta.',
    hy: 'Հաճախորդը զբաղված է։ Կարճ պատասխան։',
  },
};

function detectObjection(text) {
  const t = (text || '').toLowerCase();
  if (/(дорог|не потяну|не по карману|бюджет не|дороговат|expens|too much|can'?t afford|out of budget|caro|costoso|no puedo pagar|muy caro|թանկ)/i.test(t)) return 'expensive';
  if (/(подума(ю|ть|ем)|обдума|посовету|с женой|с мужем|с семьей|прикину|прикинуть|think about|think it over|need to think|maybe later|let me think|lo pensar|lo consult|consultar|más tarde|pensarlo|մտած|խորհրդակց)/i.test(t)) return 'think';
  if (/(сравнива|конкурент|другие вариант|еще посмотр|ещё посмотр|у других|compare|competitor|other options|shopping around|comparar|competencia|otros proveedor|համեմատ|մրցակից)/i.test(t)) return 'compare';
  if (/(не сейчас|не готов|отлож|потом|later|not now|not ready|después|más adelante|no ahora|ոչ հիմա|հետո)/i.test(t)) return 'later';
  if (/(занят|напишу позже|отпишусь|не могу говорить|busy|can'?t talk|will write|ocupado|no puedo hablar|զբաղված)/i.test(t)) return 'busy';
  return null;
}

// ====================== ВХОДЯЩИЕ ======================
const REJECT = {
  ru: `Здравствуйте. Я Анна, менеджер Coucou Events.\n\nЯ помогаю с организацией мероприятий и арендой шатров. Если у вас есть запрос по этой теме — напишите, буду рада помочь.`,
  en: `Hello. I'm Anna, manager at Coucou Events.\n\nI help with event organization and tent rentals. If you have a request on this topic — write to me, I'll be glad to help.`,
  es: `Hola. Soy Anna, gerente de Coucou Events.\n\nAyudo con organización de eventos y alquiler de carpas. Si tienes una consulta sobre este tema — escríbeme, con gusto te ayudo.`,
  hy: `Բարև Ձեզ։ Ես Աննան եմ՝ Coucou Events-ի մենեջեր։\n\nՕգնում եմ միջոցառումների կազմակերպման և վրանների վարձույթի հարցերում։ Եթե այս թեմայով հարց ունեք՝ գրեք, ուրախ կլինեմ օգնել։`,
};

// Вежливые отказы для медиа без текста
const MEDIA_REFUSAL = {
  ru: 'Спасибо, файл получил! Опишите, пожалуйста, словами, что нужно — так я отвечу точнее.',
  en: 'Thanks, I got the file! Please describe in words what you need — this way I can answer more precisely.',
  es: '¡Gracias, recibí el archivo! Describe con palabras lo que necesitas para poder ayudarte mejor.',
  hy: 'Շնորհակալություն, ֆայլը ստացա։ Խնդրում եմ գրավոր նկարագրեք, թե ինչ է պետք, որպեսզի ավելի ճշգրիտ պատասխանեմ։',
};

export function mediaRefusal(sessionKey) {
  const s = store.getSession(sessionKey);
  const lang = s?.lang || 'ru';
  return MEDIA_REFUSAL[lang] || MEDIA_REFUSAL.ru;
}

export function humanDelay(text) {
  const delay = Math.min(900 + String(text || '').length * 15, 4000);
  return new Promise(r => setTimeout(r, delay));
}

export async function handleIncoming(sessionKey, text, sendFn) {
  stats.total++;
  console.log(`\n📩 [${sessionKey}]: ${text}`);

  // 0a. Чистые подтверждения («ок», «спасибо», 👍) — только если сессия уже существует
  if (store.getSession(sessionKey) && isPureAck(text)) {
    console.log(`💤 Pure ack, skip LLM`);
    return;
  }

  // 0b. Явный чёрный список — трудоустройство, реклама, спам
  if (isIrrelevant(text)) {
    console.log(`🚫 Irrelevant (job/ad/spam), skip LLM`);
    stats.spam++;
    return; // молчим
  }

  // 1. Команды клиента: opt-out / opt-in
  const clientCmd = control.parseClientCommand(text);
  if (clientCmd === 'optout') {
    control.setClientOptOut(sessionKey, true);
    console.log(`🚫 ${sessionKey}: client opt-out`);
    await sendFn('Поняла, больше не пишу. Если понадобится — напишите «начать», и я снова на связи.');
    return;
  }
  if (clientCmd === 'optin') {
    control.setClientOptOut(sessionKey, false);
    control.resume(sessionKey);
    console.log(`✅ ${sessionKey}: client opt-in`);
    await sendFn('Снова на связи! Чем могу помочь?');
    return;
  }

  // 2. Пауза (менеджер активен) — молчим, но запоминаем
  if (control.isPaused(sessionKey)) {
    console.log(`⏸ ${sessionKey}: paused (manager active), remembering`);
    control.rememberWhilePaused(sessionKey, text);
    return;
  }

  // 2b. Возобновление после паузы: подтягиваем пропущенные сообщения
  const pending = control.popPendingWhilePaused(sessionKey);
  if (pending.length) {
    console.log(`↩️ ${sessionKey}: возобновление, ${pending.length} сообщений за время паузы`);
    // Склеиваем пропущенные + текущее в один контекст
    const merged = pending.map(p => p.text).join('\n---\n');
    text = merged + '\n---\n' + text;
  }

  // 3. Отсев нерелевантного для новых сессий
  const existing = store.getSession(sessionKey);
  if (!existing && !isRelevantMessage(text)) {
    const reject = REJECT.ru;
    await humanDelay(reject);
    await sendFn(reject);
    return;
  }

  stats.relevant++;

  // Эскалация на человека
  if (wantsHuman(text)) {
    console.log('🚨 Escalation triggered');
    const sess = store.getSession(sessionKey);
    await notifyManager({
      reason: 'Клиент просит живого менеджера',
      sessionKey,
      lastMessages: (sess?.turns || []).flatMap(t => ([
        { role: 'user', content: t.user },
        { role: 'assistant', content: t.assistant },
      ])),
      profile: sess?.profile || {},
    });
    control.pause(sessionKey, 60 * 60 * 1000); // 1 час
    store.setClosedWon(sessionKey, true); // менеджер ведёт сам
    // Ack на языке клиента (берём из сессии или ru по умолчанию)
    const sess2 = store.getSession(sessionKey);
    const ackLang = sess2?.lang || 'ru';
    const ESC_ACK = {
      ru: 'Передаю ваш запрос старшему менеджеру — он свяжется с вами в течение часа.',
      en: 'Passing your request to a senior manager — they will reach out within an hour.',
      es: 'Estoy pasando su solicitud a un gerente senior — se pondrá en contacto en una hora.',
      hy: 'Փոխանցում եմ Ձեր հարցումը ավագ մենեջերին — նա կկապվի Ձեզ հետ մեկ ժամվա ընթացքում։',
    };
    const ack = ESC_ACK[ackLang] || ESC_ACK.ru;
    await humanDelay(ack);
    await sendFn(ack);
    return;
  }

  const reply = await generateReply(sessionKey, text);
  await humanDelay(reply);
  await sendFn(reply);
  console.log(`💬 Ответ:\n${reply}\n`);
  logStat();
}


// Обёртка с очередью: если Notion падает — сохраняем локально и ретраим
export async function saveOrUpdateLead(args) {
  try {
    await saveOrUpdateLeadDirect(args);
  } catch (e) {
    console.error('saveOrUpdateLead: enqueue due to error:', e.message);
    notionQueue.enqueue(args);
  }
}
