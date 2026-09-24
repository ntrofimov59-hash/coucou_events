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


function isInterestSignal(text) {
  const t = String(text || '').toLowerCase().trim();
  if (!t || t.length > 40) return false;
  const signals = [
    // RU
    'давайте', 'давай', 'интересно', 'интересно да', 'хорошо давайте', 'ок давайте',
    'можно смету', 'пришлите смету', 'хочу смету', 'да, интересно',
    // EN
    'sounds good', 'let\'s do it', 'ok let\'s', 'interested', 'send a quote',
    'please send', 'yes please', 'go ahead',
    // ES
    'me interesa', 'suena bien', 'envíame', 'mandame presupuesto', 'vamos',
    // HY
    'լավ է', 'հետաքրքիր է', 'ուղարկեք', 'արեք',
  ];
  return signals.some(s => t.includes(s));
}

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
  const hasHistory = (session?.turns?.length || 0) > 0;
  const hasManagerMsgs = (session?.managerMessages?.length || 0) > 0;

  // Если менеджер уже писал или есть история — это НЕ greeting
  if (!hasHistory && !hasManagerMsgs) return 'greeting';

  if (!has('city') || !has('eventDate')) return 'qualification';
  if (!has('service') || !has('guests')) return 'qualification';
  if (!has('budget')) return 'proposal';
  return 'closing';
}

// ====================== LEAD SCORING ======================
function scoreLead(profile, session) {
  let score = 0;
  const has = (k) => profile?.[k] && String(profile[k]).trim();

  if (has('city')) score += 20;
  if (has('eventDate')) score += 25;
  if (has('service')) score += 15;
  if (has('guests')) score += 15;
  if (has('budget')) score += 15;
  if (has('name')) score += 5;
  if (has('phone')) score += 10;

  if (has('eventDate')) {
    try {
      const d = new Date(profile.eventDate);
      const days = (d - Date.now()) / (1000 * 60 * 60 * 24);
      if (days > 0 && days <= 60) score += 15;
    } catch {}
  }

  const turns = session?.turns?.length || 0;
  if (turns >= 3) score += 10;
  if (turns >= 6) score += 10;

  if (score >= 70) return 'hot';
  if (score >= 40) return 'warm';
  return 'cold';
}

// ====================== ЧТО СПРОСИТЬ ДАЛЬШЕ ======================
function getMissingHint(profile, lang = 'ru') {
  const has = (k) => profile?.[k] && String(profile[k]).trim();
  const hints = {
    ru: {
      city_date: 'Сейчас важнее всего узнать дату мероприятия и город. Спроси именно это (можно одним вопросом).',
      service: 'Уточни, что именно нужно: аренда шатра, свадьба под ключ, корпоратив или другой формат.',
      guests: 'Спроси примерное количество гостей.',
      budget: 'Мягко спроси ориентир по бюджету (можно диапазон).',
      name: 'Можно вежливо спросить имя, если ещё не знаешь.',
      next_step: 'Данных достаточно. Предложи конкретный следующий шаг: предварительную смету или короткий созвон.',
    },
    en: {
      city_date: 'Most important now: event date and city. Ask for both (one question is fine).',
      service: 'Clarify what is needed: tent rental, full wedding, corporate, or another format.',
      guests: 'Ask for the approximate number of guests.',
      budget: 'Softly ask for a budget range.',
      name: 'You can politely ask for the name if still unknown.',
      next_step: 'You have enough data. Propose a concrete next step: preliminary quote or a short call.',
    },
    es: {
      city_date: 'Lo más importante ahora: fecha del evento y ciudad. Pregunta ambas cosas.',
      service: 'Aclara qué necesita: alquiler de carpa, boda integral, corporativo u otro formato.',
      guests: 'Pregunta el número aproximado de invitados.',
      budget: 'Pregunta suavemente el presupuesto orientativo.',
      name: 'Puedes pedir el nombre educadamente si aún no lo sabes.',
      next_step: 'Ya tienes datos suficientes. Propón un siguiente paso concreto: presupuesto preliminar o una llamada corta.',
    },
    hy: {
      city_date: 'Ամենակարևորը հիմա՝ միջոցառման ամսաթիվ և քաղաք։ Հարցրու երկուսն էլ (կարող է մեկ հարցով)։',
      service: 'Ճշտիր՝ ինչ է պետք՝ վրանի վարձույթ, հարսանիք բանալիով, կորպորատիվ, թե այլ ձևաչափ։',
      guests: 'Հարցրու հյուրերի մոտավոր քանակը։',
      budget: 'Մեղմ հարցրու բյուջեի մասին (կարող է միջակայք)։',
      name: 'Կարող ես քաղաքավարի հարցնել անունը, եթե դեռ չգիտես։',
      next_step: 'Տվյալները բավարար են։ Առաջարկիր կոնկրետ հաջորդ քայլ՝ նախնական նախահաշիվ կամ կարճ զանգ։',
    },
  };
  const h = hints[lang] || hints.ru;
  if (!has('city') || !has('eventDate')) return h.city_date;
  if (!has('service')) return h.service;
  if (!has('guests')) return h.guests;
  if (!has('budget')) return h.budget;
  if (!has('name')) return h.name;
  return h.next_step;
}

// ====================== ПОДСКАЗКА ПО ТИПУ УСЛУГИ ======================
function getServiceHint(service, lang = 'ru') {
  const hints = {
    ru: {
      tents: 'Клиент про шатёр. Уточни дату, город, гостей, нужен ли только шатёр или полный пакет (свет, пол, мебель). Предложи рассчитать размер и стоимость.',
      wedding: 'Это свадьба. Будь особенно внимательна и тёплой. Уточни дату, город, формат, гостей, бюджет. Предложи 2–3 варианта или созвон.',
      corporate: 'Корпоратив. Стиль чуть более деловой. Уточни дату, город, формат, количество участников, бюджет.',
      catering: 'Кейтеринг. Уточни дату, город, гостей, формат (фуршет/банкет), есть ли уже площадка.',
      turnkey: 'Мероприятие под ключ. Уточни дату, город, тип события, гостей и бюджет.',
      default: 'Уточни ключевые детали и веди к смете или созвону.',
    },
    en: {
      tents: 'Client asks about tents. Clarify date, city, guests, tent only or full package. Offer to calculate size and price.',
      wedding: 'This is a wedding. Be warm and attentive. Clarify date, city, format, guests, budget. Offer 2–3 options or a call.',
      corporate: 'Corporate event. Slightly more business-like. Clarify date, city, format, headcount, budget.',
      catering: 'Catering. Clarify date, city, guests, format, whether venue is booked.',
      turnkey: 'Turnkey event. Clarify date, city, type, guests, budget.',
      default: 'Clarify key details and move toward a quote or call.',
    },
    es: {
      tents: 'El cliente pregunta por carpas. Aclara fecha, ciudad, invitados, solo carpa o paquete completo. Ofrece calcular tamaño y precio.',
      wedding: 'Es una boda. Sé cálida y atenta. Aclara fecha, ciudad, formato, invitados, presupuesto. Ofrece 2–3 opciones o una llamada.',
      corporate: 'Evento corporativo. Estilo un poco más formal. Aclara fecha, ciudad, formato, número de participantes, presupuesto.',
      catering: 'Catering. Aclara fecha, ciudad, invitados, formato, si ya hay venue.',
      turnkey: 'Evento llave en mano. Aclara fecha, ciudad, tipo, invitados y presupuesto.',
      default: 'Aclara los detalles clave y lleva hacia presupuesto o llamada.',
    },
    hy: {
      tents: 'Հաճախորդը վրանի մասին է։ Ճշտիր ամսաթիվ, քաղաք, հյուրեր, միայն վրա՞ն, թե ամբողջ փաթեթ։ Առաջարկիր հաշվել չափը և արժեքը։',
      wedding: 'Սա հարսանիք է։ Եղիր ուշադիր և տաք։ Ճշտիր ամսաթիվ, քաղաք, ձևաչափ, հյուրեր, բյուջե։ Առաջարկիր 2–3 տարբերակ կամ զանգ։',
      corporate: 'Կորպորատիվ։ Ոճը մի փոքր ավելի գործնական։ Ճշտիր ամսաթիվ, քաղաք, ձևաչափ, մասնակիցների քանակ, բյուջե։',
      catering: 'Քեյթերինգ։ Ճշտիր ամսաթիվ, քաղաք, հյուրեր, ձևաչափ, արդյոք կա հարթակ։',
      turnkey: 'Միջոցառում բանալիով։ Ճշտիր ամսաթիվ, քաղաք, տեսակ, հյուրեր և բյուջե։',
      default: 'Ճշտիր հիմնական մանրամասները և տանիր նախահաշվի կամ զանգի։',
    },
  };
  const map = hints[lang] || hints.ru;
  return map[service] || map.default;
}


// ====================== ЧТО СПРОСИТЬ ДАЛЬШЕ ======================


// ====================== ПОДСКАЗКА ПО ТИПУ УСЛУГИ ======================




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
  // Приветствия
  'привет','здравствуйте','добрый','день','вечер','утро','хорошо','спасибо',
  'hello','hi','thanks','please','hola','gracias','բարև','շնորհակալություն',
  // RU — частые глаголы/начала фраз (иначе ловятся как имя)
  'ищу','ищем','нужен','нужна','нужно','нужны','хочу','хотим','хотел','хотела','хотелось',
  'планирую','планируем','интересует','подскажите','скажите','можно','требуется','требуются',
  'рассматриваю','рассматриваем','подбираю','подбираем','думаю','думаем',
  'надо','есть','мне','нам','вас','все','это','будет','для','про','по','у','на',
  // EN
  'want','need','looking','searching','planning','interested','considering',
  // ES
  'quiero','necesito','busco','buscamos','buscando','planeo','interesado','interesada',
  // HY
  'ուզում','պետք','փնտրում','կարիք','հետաքրքրված',
]);

export function extractProfileFromText(text) {
  return extractProfile(text);
}

function extractProfile(text) {
  const out = {};
  const t = String(text || '').trim();
  if (!t) return out;
  const lower = t.toLowerCase();

  // --- Имя ---
  let m = t.match(/(?:меня\s+зовут|мо[её]\s+имя|my\s+name\s+is|me\s+llamo|i\s+am|i'm|это|я)\s+([\p{Lu}][\p{Ll}]{1,24})/iu);
  if (!m) m = t.match(/меня\s+([\p{Lu}][\p{Ll}]{1,24})\s+зовут/iu);
  if (!m) m = t.match(/^([\p{Lu}][\p{Ll}]{1,20})[\s,!.]/u);
  if (m) {
    const cand = m[1];
    if (!NAME_BLACKLIST.has(cand.toLowerCase()) && cand.length >= 2) {
      out.name = cand;
    }
  }

  // --- Услуга ---
  if (/шат[её]р|тент|tents?|marquee|carpa|վրան/i.test(t)) out.service = 'tents';
  else if (/свадьб|wedding|boda|հարսանիք/i.test(t)) out.service = 'wedding';
  else if (/корпоратив|corporate|corporativo|կորպորատիվ|тимбилдинг|team.?build/i.test(t)) out.service = 'corporate';
  else if (/кейтер|catering|քեյթ/i.test(t)) out.service = 'catering';
  else if (/декор|decor|դեկոր/i.test(t)) out.service = 'decor';
  else if (/фото|видео|photo|video|foto/i.test(t)) out.service = 'photo-video';
  else if (/музык|dj|артист|шоу|entertainment|music|show/i.test(t)) out.service = 'entertainment';
  else if (/трансфер|transfer|traslado/i.test(t)) out.service = 'transfer';
  else if (/под\s*ключ|turnkey|мероприятие|event|банкет/i.test(t)) out.service = 'turnkey';

  // --- Город ---
  for (const c of CITY_LIST) {
    if (lower.includes(c.toLowerCase())) { out.city = c; break; }
  }

  // --- Гости ---
  m = t.match(/(\d{1,4})\s*[-–]?\s*(\d{1,4})?\s*(?:гост|guest|invitad|հյուր|человек|people|personas|чел\b)/i);
  if (m) {
    out.guests = m[2] ? `${m[1]}-${m[2]}` : m[1];
  } else {
    m = t.match(/(?:гост|guest|invitad|հյուր|человек|people).*?(\d{1,4})/i);
    if (m) out.guests = m[1];
  }

  // --- Дата ---
  m = t.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/);
  if (m) {
    const iso = normalizeDate(m[0]);
    if (iso) out.eventDate = iso;
  }
  if (!out.eventDate) {
    const monthMap = {
      январ: '01', феврал: '02', март: '03', апрел: '04', ма: '05', июн: '06',
      июл: '07', август: '08', сентябр: '09', октябр: '10', ноябр: '11', декабр: '12',
      january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
      july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
    };
    for (const [key, mm] of Object.entries(monthMap)) {
      if (lower.includes(key)) {
        const yearMatch = t.match(/(20\d{2})/);
        const year = yearMatch ? yearMatch[1] : String(new Date().getFullYear());
        out.eventDate = `${year}-${mm}-01`;
        break;
      }
    }
  }

  // --- Бюджет ---
  m = t.match(/(?:бюджет|budget|presupuesto|բյուջե|до|около|примерно)\D{0,20}(\d[\d\s.,]{2,12})/i);
  if (m) {
    out.budget = m[1].replace(/[\s,]/g, '');
  } else {
    m = t.match(/(\d[\d\s]{2,10})\s*(?:\$|usd|доллар|евро|€)/i);
    if (m) out.budget = m[1].replace(/\s/g, '');
  }

  // --- Телефон ---
  m = t.match(/(?:\+?\d[\d\s\-()]{8,18}\d)/);
  if (m) {
    const digits = m[0].replace(/\D/g, '');
    if (digits.length >= 10 && digits.length <= 15) out.phone = digits;
  }

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
  // Сохраняем раньше: достаточно города + (услуги или даты)
  // Имя желательно, но не обязательно
  if (!profile) return false;
  const has = (k) => profile[k] && String(profile[k]).trim();
  if (has('city') && (has('service') || has('eventDate'))) return true;
  if (has('name') && has('city') && has('service')) return true;
  return false;
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

  // Lead scoring + эскалация hot-лидов
  const leadScore = (typeof scoreLead === 'function') ? scoreLead(session.profile, session) : 'cold';
  console.log(`🔥 Lead score: ${leadScore}`);

  if (leadScore === 'hot' && !session.hotNotified) {
    session.hotNotified = true;
    store.saveSession(sessionKey);
    try {
      notifyManager({
        reason: `Hot lead (score high). Stage: ${stage}`,
        sessionKey,
        lastMessages: (session.turns || []).slice(-3).map(t => ({
          role: 'user', content: t.user || ''
        })),
        profile: session.profile,
      });
    } catch (e) {
      console.warn('hot notify failed:', e.message);
    }
  }

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
      + '\n\nВАЖНО: Менеджер уже общается с клиентом. Ты продолжаешь диалог, а не начинаешь заново. НЕ ЗДОРОВАЙСЯ. НЕ ПРЕДСТАВЛЯЙСЯ. Отвечай по существу, учитывая, что клиент уже видел сообщения менеджера.';
  }

  // Динамическая подсказка: что спросить дальше
  
  // Антизацикливание: если уже много ходов, а ключевых полей мало — давим на прогресс
  const turnCount = session?.turns?.length || 0;
  let progressHint = '';
  if (turnCount >= 4) {
    const has = (k) => session.profile?.[k] && String(session.profile[k]).trim();
    const missing = [];
    if (!has('city')) missing.push('город');
    if (!has('eventDate')) missing.push('дата');
    if (!has('service')) missing.push('услуга');
    if (!has('guests')) missing.push('гости');
    if (missing.length >= 2) {
      progressHint = `Диалог уже ${turnCount} ходов, а ключевые данные всё ещё не собраны (${missing.join(', ')}). Спроси самое важное одним вопросом и мягко предложи следующий шаг.`;
    } else if (turnCount >= 6 && has('city') && has('eventDate')) {
      progressHint = `Уже ${turnCount} ходов. Данных достаточно для следующего шага. Предложи смету или короткий созвон, не затягивай квалификацию.`;
    }
  }

  const interest = (typeof isInterestSignal === 'function') && isInterestSignal(userMessage);
  const missingHint = (typeof getMissingHint === 'function') ? getMissingHint(session.profile, lang) : '';
  const serviceHint = (typeof getServiceHint === 'function') ? getServiceHint(session.profile?.service, lang) : '';
  const systemPrompt = buildSystemPrompt({ lang, stage, profile: session.profile, knowledge, objectionHint })
    + managerContext
    + `\n\n=== SERVICE CONTEXT ===\n${serviceHint}\n\n=== PROGRESS CHECK ===\n${progressHint || '(диалог в нормальном темпе)'}\n\n=== INTEREST SIGNAL ===\n${interest ? 'Клиент проявил интерес / готов двигаться дальше. Если данных хватает — сразу предлагай смету или созвон. Если нет — быстро добери недостающее и предлагай шаг.' : '(обычный ход)'}\n\n=== ЧТО СПРОСИТЬ ДАЛЬШЕ (приоритет) ===\n${missingHint}`
    + `\n\n=== NO GREETING FORCE ===
Если в истории диалога есть ХОТЬ ОДНО сообщение ИЛИ есть сообщения менеджера — КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО:
- здороваться
- представляться
- писать «Здравствуйте», «Добрый день», «Чем могу помочь»
Сразу отвечай по существу последнего сообщения клиента.

=== CRITICAL LANGUAGE RULE ===\nReply ONLY in ${LANG_NAMES[lang] || 'Russian'}. Even if the prior history is in another language, your NEXT reply MUST be in ${LANG_NAMES[lang] || 'Russian'}.`
    + `\n\n=== LENGTH RULE ===\nWrite 2-4 short sentences. No long bullet lists, no headers.`
    + `\n\n=== HIDDEN CRM BLOCK ===\nIf you learned new info about the client (name, city, service, date, guests, budget, phone), append on a NEW LINE at the very END of your reply a single line:\n<!--CRM:{"clientName":"...","city":"...","service":"...","eventDate":"YYYY-MM-DD","guests":"...","budget":"...","phone":"...","details":"..."}-->\nOnly include fields you actually learned. If nothing new — do NOT add the line. This line is stripped before sending to the user.`

  const messages = store.buildMessages(sessionKey, systemPrompt, 8);
  messages.push({ role: 'user', content: userMessage });

  let completion;
  try {
    completion = await callGroq({
      model: MODEL, messages,
      temperature: 0.55, max_tokens: 420,
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
        temperature: 0.5, max_tokens: 320,
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
  // Запоминаем этап — помогает не зацикливаться
  try {
    store.setStage(sessionKey, stage);
  } catch (e) {}
  return finalText;
}

// ====================== ВОЗРАЖЕНИЯ ======================
const OBJECTION_PLAYBOOK = {
  expensive: {
    ru: 'Клиент считает, что дорого. НЕ оправдывайся. Дай 1 сильный аргумент ценности (опыт, под ключ, 15 городов). Затем мягко уточни бюджетный ориентир и предложи созвон или предварительную смету.',
    en: 'Client thinks it is expensive. DO NOT apologize. Give one strong value argument (experience, turnkey, 15 cities), then ask for their budget range and offer a short call or preliminary quote.',
    es: 'El cliente piensa que es caro. NO te disculpes. Da un argumento fuerte de valor (experiencia, llave en mano, 15 ciudades). Luego pregunta suavemente por el rango de presupuesto y ofrece una llamada corta o un presupuesto preliminar.',
    hy: 'Հաճախորդը կարծում է, որ թանկ է։ ՄԻ՛ արդարացիր։ Տուր մեկ ուժեղ արժեքային փաստարկ (փորձ, բանալիով, 15 քաղաք)։ Ապա մեղմորեն պարզիր բյուջեի միջակայքը և առաջարկիր կարճ զանգ կամ նախնական նախահաշիվ։',
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
  ru: `Здравствуйте! Я Анна, менеджер Coucou Events.
Помогаю с организацией мероприятий, свадьбами и арендой шатров.
Если у вас есть запрос — напишите дату и город, сразу сориентирую.`,
  en: `Hello! I'm Anna, manager at Coucou Events.
I help with events, weddings and tent rentals.
If you have a request — share the date and city, and I'll guide you right away.`,
  es: `¡Hola! Soy Anna, gerente de Coucou Events.
Ayudo con eventos, bodas y alquiler de carpas.
Si tienes una consulta — escribe fecha y ciudad, y te oriento de inmediato.`,
  hy: `Բարև Ձեզ։ Ես Աննան եմ՝ Coucou Events-ի մենեջեր։
Օգնում եմ միջոցառումների, հարսանիքների և վրանների հարցերում։
Եթե հարց ունեք — գրեք ամսաթիվ և քաղաք, անմիջապես կկողմնորոշեմ։`,
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
  // Более естественная задержка: базовая + от длины + небольшой рандом
  const len = String(text || '').length;
  const base = 700 + Math.min(len * 18, 2800);
  const jitter = Math.floor(Math.random() * 600); // 0–600 мс
  const delay = Math.min(base + jitter, 4500);
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

  // 0b. Явный чёрный список — трудоустройство, реклама, спам (молчим)
  if (isIrrelevant(text)) {
    console.log(`🚫 Irrelevant (job/ad/spam), skip LLM`);
    stats.spam++;
    return;
  }

  // 0c. Жёсткий спам-фильтр
  if (isSpam(text)) {
    console.log(`🚫 Spam keywords, skip LLM`);
    stats.spam++;
    return;
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

  // 3. Отсев нерелевантного ТОЛЬКО для совсем новых сессий
  const existing = store.getSession(sessionKey);
  const hasContext = existing && (
    (existing.turns && existing.turns.length > 0) ||
    (existing.managerMessages && existing.managerMessages.length > 0)
  );
  if (!existing && !hasContext && !isRelevantMessage(text)) {
    const guessLang = (typeof resolveLanguage === 'function') ? resolveLanguage(text, 'ru') : 'ru';
    const reject = REJECT[guessLang] || REJECT.ru;
    await humanDelay(reject);
    await sendFn(reject);
    return;
  }
  // Если есть контекст (менеджер уже писал / была история) — не отвергаем, отвечаем по существу


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
