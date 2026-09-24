// agent/followup.js — умная автодожимка (тёплый / холодный лид)
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { groq, MODEL, LANG_NAMES } from './config.js';
import * as store from './store.js';
import * as control from './control.js';

const HOUR = 60 * 60 * 1000;
const F1 = 24 * HOUR;
const F2 = 72 * HOUR;

let tgClient = null;

async function getTgClient() {
  if (tgClient) return tgClient;
  const apiId = parseInt(process.env.TELEGRAM_API_ID);
  const apiHash = process.env.TELEGRAM_API_HASH;
  const stringSession = new StringSession(process.env.TELEGRAM_STRING_SESSION || '');
  tgClient = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
  await tgClient.connect();
  console.log('📨 Followup: Telegram подключён');
  return tgClient;
}

function scoreSession(s) {
  let score = 0;
  const p = s.profile || {};
  const has = (k) => p[k] && String(p[k]).trim();
  if (has('city')) score += 20;
  if (has('eventDate')) score += 25;
  if (has('service')) score += 15;
  if (has('guests')) score += 15;
  if (has('budget')) score += 15;
  if (has('name')) score += 5;
  if (has('phone')) score += 10;
  const turns = s.turns?.length || 0;
  if (turns >= 3) score += 10;
  if (turns >= 6) score += 10;
  if (score >= 70) return 'hot';
  if (score >= 40) return 'warm';
  return 'cold';
}

const TEMPLATES = {
  ru: {
    d1_hot: (name, city, service) => {
      const n = name && name !== 'Клиент' ? `${name}, ` : '';
      return `${n}добрый день! По вашему запросу «${service}» в ${city} могу сегодня прислать 2–3 варианта предварительной сметы. Прислать?`;
    },
    d1_warm: (name, city, service) => {
      const n = name && name !== 'Клиент' ? `${name}, ` : '';
      return `${n}добрый день! Возвращаюсь к запросу про «${service}» в ${city}. Могу подготовить предварительную смету — удобно?`;
    },
    d1_cold: (name, city, service) => {
      const n = name && name !== 'Клиент' ? `${name}, ` : '';
      return `${n}добрый день! Напоминаю о запросе (${service}, ${city}). Если актуально — напишите, сориентирую по срокам и бюджету.`;
    },
    d3_hot: (name, city) => {
      const n = name && name !== 'Клиент' ? `${name}, ` : '';
      return `${n}ещё раз здравствуйте. ${city} всё ещё актуален? Могу быстро посчитать варианты под вашу дату.`;
    },
    d3_warm: (name, city) => {
      const n = name && name !== 'Клиент' ? `${name}, ` : '';
      return `${n}здравствуйте! Уточняю — ${city} ещё в планах? Если да, я на связи.`;
    },
    d3_cold: (name, city) => {
      const n = name && name !== 'Клиент' ? `${name}, ` : '';
      return `${n}добрый день. Если запрос по ${city} ещё актуален — напишите, помогу сориентироваться.`;
    },
  },
  en: {
    d1_hot: (name, city, service) => {
      const n = name ? `Hi ${name}, ` : 'Hi, ';
      return `${n}following up on your ${service} in ${city}. I can send 2–3 preliminary quote options today — shall I?`;
    },
    d1_warm: (name, city, service) => {
      const n = name ? `Hi ${name}, ` : 'Hi, ';
      return `${n}following up on ${service} in ${city}. I can prepare a preliminary quote — would that help?`;
    },
    d1_cold: (name, city, service) => {
      const n = name ? `Hi ${name}, ` : 'Hi, ';
      return `${n}just a quick reminder about your ${service} request in ${city}. Still relevant? Happy to help with timing and budget.`;
    },
    d3_hot: (name, city) => {
      const n = name ? `Hi ${name}, ` : 'Hi, ';
      return `${n}is ${city} still on the table? I can calculate options quickly for your date.`;
    },
    d3_warm: (name, city) => {
      const n = name ? `Hi ${name}, ` : 'Hi, ';
      return `${n}checking in — is ${city} still relevant? I'm here if you need anything.`;
    },
    d3_cold: (name, city) => {
      const n = name ? `Hi ${name}, ` : 'Hi, ';
      return `${n}if the ${city} request is still active, just reply and I'll help you get oriented.`;
    },
  },
  es: {
    d1_hot: (name, city, service) => {
      const n = name ? `Hola ${name}, ` : 'Hola, ';
      return `${n}sigo tu solicitud de ${service} en ${city}. Puedo enviarte 2–3 opciones de presupuesto hoy — ¿te las mando?`;
    },
    d1_warm: (name, city, service) => {
      const n = name ? `Hola ${name}, ` : 'Hola, ';
      return `${n}retomo lo de ${service} en ${city}. ¿Te preparo un presupuesto preliminar?`;
    },
    d1_cold: (name, city, service) => {
      const n = name ? `Hola ${name}, ` : 'Hola, ';
      return `${n}te recuerdo la consulta de ${service} en ${city}. ¿Sigue vigente? Puedo orientarte en plazos y presupuesto.`;
    },
    d3_hot: (name, city) => {
      const n = name ? `Hola ${name}, ` : 'Hola, ';
      return `${n}¿${city} sigue en pie? Puedo calcular opciones rápido para tu fecha.`;
    },
    d3_warm: (name, city) => {
      const n = name ? `Hola ${name}, ` : 'Hola, ';
      return `${n}¿sigue siendo relevante ${city}? Estoy aquí si lo necesitas.`;
    },
    d3_cold: (name, city) => {
      const n = name ? `Hola ${name}, ` : 'Hola, ';
      return `${n}si la consulta de ${city} sigue activa, responde y te oriento.`;
    },
  },
  hy: {
    d1_hot: (name, city, service) => {
      const n = name ? `Բարև ${name}, ` : 'Բարև, ';
      return `${n}վերադառնում եմ ձեր ${service} հարցմանը ${city}-ում։ Կարող եմ այսօր ուղարկել 2–3 նախնական նախահաշիվ — ուղարկե՞մ։`;
    },
    d1_warm: (name, city, service) => {
      const n = name ? `Բարև ${name}, ` : 'Բարև, ';
      return `${n}վերադառնում եմ ${service} / ${city} հարցմանը։ Կպատրաստե՞մ նախնական նախահաշիվ։`;
    },
    d1_cold: (name, city, service) => {
      const n = name ? `Բարև ${name}, ` : 'Բարև, ';
      return `${n}հիշեցում՝ ${service}, ${city}։ Եթե արդիական է — գրեք, կկողմնորոշեմ ժամկետների և բյուջեի հարցում։`;
    },
    d3_hot: (name, city) => {
      const n = name ? `Բարև ${name}, ` : 'Բարև, ';
      return `${n}${city}-ը դեռ արդիակա՞ն է։ Կարող եմ արագ հաշվել տարբերակներ ձեր ամսաթվի համար։`;
    },
    d3_warm: (name, city) => {
      const n = name ? `Բարև ${name}, ` : 'Բարև, ';
      return `${n}դեռ արդիակա՞ն է ${city}-ը։ Ես կապի մեջ եմ։`;
    },
    d3_cold: (name, city) => {
      const n = name ? `Բարև ${name}, ` : 'Բարև, ';
      return `${n}եթե ${city}-ի հարցումը դեռ ակտիվ է — գրեք, կօգնեմ կողմնորոշվել։`;
    },
  },
};

const SERVICE_LABELS = {
  ru: {
    tents: 'аренда шатра', wedding: 'свадьба под ключ', corporate: 'корпоратив',
    catering: 'кейтеринг', decor: 'декор', 'photo-video': 'фото/видео',
    entertainment: 'развлечения', transfer: 'трансфер', turnkey: 'мероприятие под ключ',
  },
  en: {
    tents: 'tent rental', wedding: 'full-service wedding', corporate: 'corporate event',
    catering: 'catering', decor: 'decor', 'photo-video': 'photo/video',
    entertainment: 'entertainment', transfer: 'transfer', turnkey: 'turnkey event',
  },
  es: {
    tents: 'alquiler de carpa', wedding: 'boda integral', corporate: 'evento corporativo',
    catering: 'catering', decor: 'decoración', 'photo-video': 'foto/video',
    entertainment: 'entretenimiento', transfer: 'traslado', turnkey: 'evento llave en mano',
  },
  hy: {
    tents: 'վրանի վարձույթ', wedding: 'հարսանիք բանալիով', corporate: 'կորպորատիվ',
    catering: 'քեյթերինգ', decor: 'դեկոր', 'photo-video': 'ֆոտո/վիդեո',
    entertainment: 'ժամանց', transfer: 'տրանսֆեր', turnkey: 'միջոցառում բանալիով',
  },
};

async function polishWithLLM(text, lang) {
  if (process.env.FOLLOWUP_USE_LLM !== '1') return text;
  try {
    const res = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `Rewrite the following follow-up in ${LANG_NAMES[lang]} naturally and warmly, 1-2 sentences, no emojis. Output only the message.`,
        },
        { role: 'user', content: text },
      ],
      temperature: 0.5,
      max_tokens: 150,
      reasoning_effort: 'low',
    });
    return (res.choices[0].message.content || text).trim();
  } catch {
    return text;
  }
}

export async function runFollowups() {
  const sessions = store.getAllSessions();
  const now = Date.now();
  let sent1 = 0, sent3 = 0;

  for (const [key, s] of Object.entries(sessions)) {
    if (!key.startsWith('tg_') && !key.startsWith('wa_')) continue;
    if (control.isPaused(key)) continue;
    if (s.closedWon) continue;
    if (!s.profile?.city || !s.profile?.service) continue;

    const elapsed = now - (s.lastActivity || 0);
    const lang = s.lang || 'ru';
    const name = s.profile.name || null;
    const city = s.profile.city;
    const heat = scoreSession(s);
    const serviceLabel =
      (SERVICE_LABELS[lang] || SERVICE_LABELS.ru)[s.profile.service] || s.profile.service;
    const tplSet = TEMPLATES[lang] || TEMPLATES.ru;

    // Stage 1: 24–48h
    if (!s.followupSent1d && elapsed >= F1 && elapsed < 2 * F1) {
      const fn = tplSet[`d1_${heat}`] || tplSet.d1_warm;
      let msg = fn(name, city, serviceLabel);
      msg = await polishWithLLM(msg, lang);
      try {
        if (key.startsWith('tg_')) {
          const client = await getTgClient();
          await client.sendMessage(Number(key.replace('tg_', '')), { message: msg });
        }
        store.markFollowup(key, '1d');
        console.log(`📤 Followup 1d [${heat}] → ${key}: ${msg.slice(0, 70)}...`);
        sent1++;
      } catch (e) {
        console.error(`Followup 1d failed for ${key}:`, e.message);
      }
      continue;
    }

    // Stage 2: 72–96h
    if (s.followupSent1d && !s.followupSent3d && elapsed >= F2 && elapsed < 2 * F2) {
      const fn = tplSet[`d3_${heat}`] || tplSet.d3_warm;
      let msg = fn(name, city);
      msg = await polishWithLLM(msg, lang);
      try {
        if (key.startsWith('tg_')) {
          const client = await getTgClient();
          await client.sendMessage(Number(key.replace('tg_', '')), { message: msg });
        }
        store.markFollowup(key, '3d');
        console.log(`📤 Followup 3d [${heat}] → ${key}: ${msg.slice(0, 70)}...`);
        sent3++;
      } catch (e) {
        console.error(`Followup 3d failed for ${key}:`, e.message);
      }
    }
  }

  console.log(`📬 Followups: 1d=${sent1}, 3d=${sent3}`);
}
