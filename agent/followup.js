// agent/followup.js — реальная автодожимка
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { groq, MODEL, LANG_NAMES } from './config.js';
import * as store from './store.js';
import * as control from './control.js';

const HOUR = 60 * 60 * 1000;
const F1 = 24 * HOUR;   // через сутки
const F2 = 72 * HOUR;   // через 3 суток

// Раз в час берём сессии, у которых:
//  - есть профиль (name + city + service)
//  - lastActivity между 24 и 48 часами назад → шлём 1-й follow-up
//  - lastActivity между 72 и 96 часами назад → шлём 2-й follow-up
//  - нет флага followupSent1d / followupSent3d
//  - не на паузе
//  - сессия из Telegram (пока только Telegram)

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

const TEMPLATES = {
  ru: {
    d1: (name, city, service) => `${name}, добрый день! Возвращаюсь к вашему запросу про «${service}» в ${city}. Готовы подготовить 2–3 варианта сметы — прислать?`,
    d3: (name, city) => `${name}, ещё раз здравствуйте! Хотела уточнить, актуален ли ещё ${city}? Если да — я на связи.`,
  },
  en: {
    d1: (name, city, service) => `Hi ${name}, following up on your ${service} request in ${city}. Shall I prepare 2–3 proposal options for you?`,
    d3: (name, city) => `Hi ${name}, just checking in — is ${city} still relevant? Happy to help if so.`,
  },
  es: {
    d1: (name, city, service) => `Hola ${name}, retomo tu solicitud de ${service} en ${city}. ¿Te preparo 2–3 opciones de propuesta?`,
    d3: (name, city) => `Hola ${name}, ¿sigue siendo relevante ${city}? Estoy aquí si lo necesitas.`,
  },
  hy: {
    d1: (name, city, service) => `Բարև ${name}, վերադառնում եմ ձեր ${service} հարցմանը ${city}-ում։ Պատրաստե՞մ 2–3 տարբերակ առաջարկ։`,
    d3: (name, city) => `Բարև ${name}, դեռ արդիակա՞ն է ${city}-ը։ Ես կապի մեջ եմ, եթե պետք լինի։`,
  },
};

const SERVICE_LABELS = {
  ru: { tents: 'аренда шатра', wedding: 'свадьба под ключ', corporate: 'корпоратив', catering: 'кейтеринг', decor: 'декор', 'photo-video': 'фото/видео', entertainment: 'развлечения', transfer: 'трансфер' },
  en: { tents: 'tent rental', wedding: 'full-service wedding', corporate: 'corporate event', catering: 'catering', decor: 'decor', 'photo-video': 'photo/video', entertainment: 'entertainment', transfer: 'transfer' },
  es: { tents: 'alquiler de carpa', wedding: 'boda integral', corporate: 'evento corporativo', catering: 'catering', decor: 'decoración', 'photo-video': 'foto/video', entertainment: 'entretenimiento', transfer: 'traslado' },
  hy: { tents: 'վրանի վարձույթ', wedding: 'հարսանիք բանալիով', corporate: 'կորպորատիվ', catering: 'քեյթերինգ', decor: 'դեկոր', 'photo-video': 'ֆոտո/վիդեո', entertainment: 'ժամանց', transfer: 'տրանսֆեր' },
};

// Опционально — сглаживаем через LLM. По умолчанию шаблон (экономим токены).
async function polishWithLLM(text, lang) {
  if (process.env.FOLLOWUP_USE_LLM !== '1') return text;
  try {
    const res = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: `Rewrite the following follow-up message in ${LANG_NAMES[lang]} naturally and warmly, keep it 1-2 sentences, no emojis. Output only the rewritten message.` },
        { role: 'user', content: text },
      ],
      temperature: 0.5, max_tokens: 150, reasoning_effort: 'low',
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
    if (!key.startsWith('tg_')) continue;               // пока только Telegram
    if (control.isPaused(key)) continue;
    if (!s.profile?.name || !s.profile?.city || !s.profile?.service) continue;

    const elapsed = now - (s.lastActivity || 0);

    // Stage 1: 24–48 часов
    if (!s.followupSent1d && elapsed >= F1 && elapsed < 2 * F1) {
      const lang = s.lang || 'ru';
      const tpl = (TEMPLATES[lang] || TEMPLATES.ru).d1;
      const serviceLabel = (SERVICE_LABELS[lang] || SERVICE_LABELS.ru)[s.profile.service] || s.profile.service;
      let msg = tpl(s.profile.name, s.profile.city, serviceLabel);
      msg = await polishWithLLM(msg, lang);
      try {
        const client = await getTgClient();
        await client.sendMessage(Number(key.replace('tg_', '')), { message: msg });
        store.markFollowup(key, '1d');
        console.log(`📤 Followup 1d → ${key}: ${msg.slice(0, 60)}...`);
        sent1++;
      } catch (e) {
        console.error(`Followup 1d failed for ${key}:`, e.message);
      }
      continue;
    }

    // Stage 2: 72–96 часов
    if (s.followupSent1d && !s.followupSent3d && elapsed >= F2 && elapsed < 2 * F2) {
      const lang = s.lang || 'ru';
      const tpl = (TEMPLATES[lang] || TEMPLATES.ru).d3;
      let msg = tpl(s.profile.name, s.profile.city);
      msg = await polishWithLLM(msg, lang);
      try {
        const client = await getTgClient();
        await client.sendMessage(Number(key.replace('tg_', '')), { message: msg });
        store.markFollowup(key, '3d');
        console.log(`📤 Followup 3d → ${key}: ${msg.slice(0, 60)}...`);
        sent3++;
      } catch (e) {
        console.error(`Followup 3d failed for ${key}:`, e.message);
      }
    }
  }

  console.log(`📬 Followups: 1d=${sent1}, 3d=${sent3}`);
}
