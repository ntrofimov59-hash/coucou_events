// agent/channels.js — WhatsApp, Telegram, Email
import pkg from 'whatsapp-web.js';
const { Client: WhatsAppClient, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { NewMessage } from 'telegram/events/index.js';
import input from 'input';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

import fs from 'fs';
import { getChromePath } from './config.js';
import * as store from './store.js';
import { processVoice } from './voice.js';
import * as guard from './guard.js';
import * as control from './control.js';

// Тексты, которые только что отправил сам бот (чтобы отличить от менеджера)
const botSentTexts = new Set();
function markBotSent(text) {
  const t = String(text || '').trim().slice(0, 200);
  if (!t) return;
  botSentTexts.add(t);
  setTimeout(() => botSentTexts.delete(t), 60000); // забываем через минуту
}

// Чаты, куда бот сам шлёт алерты — не отвечаем на них
const SKIP_CHAT_IDS = new Set(
  [process.env.BOOKING_CHAT_ID, process.env.ANALYTICS_CHAT_ID, process.env.TELEGRAM_CHAT_ID]
    .filter(Boolean).map(String)
);
// Если в тексте есть наш маркер алерта — точно не отвечаем
const INTERNAL_MARKER = /^(🚨\s*Эскалация:|✅\s*WhatsApp|⚠️\s*WhatsApp|❌\s*WhatsApp|🔐\s*WhatsApp|🔄\s*WhatsApp)/;
import { handleIncoming, isRelevantMessage, isSpam, stats, logStat, saveOrUpdateLead, generateReply, mediaRefusal, extractProfileFromText } from './core.js';

// ====================== WHATSAPP ======================
// Подтягиваем последние сообщения из Telegram-чата в сессию
// (чтобы агент видел контекст ручного диалога менеджера)
async function hydrateTgHistory(client, chatId, sessionKey) {
  try {
    const session = store.getSession(sessionKey);
    if (!session) return;
    if (session.turns?.length > 0) return; // уже есть история — не трогаем

    const messages = await client.getMessages(chatId, { limit: 20 });
    if (!messages?.length) return;

    // Разворачиваем в хронологический порядок
    const ordered = messages.reverse();
    const turns = [];
    let pendingUser = null;

    for (const m of ordered) {
      const text = (m.message || '').trim();
      if (!text) continue;
      if (m.out) {
        // Сообщение от Cou (менеджер или агент)
        if (pendingUser) {
          turns.push({ user: pendingUser, assistant: text, ts: m.date * 1000 });
          pendingUser = null;
        }
      } else {
        // Сообщение от клиента
        if (pendingUser) turns.push({ user: pendingUser, assistant: null, ts: m.date * 1000 });
        pendingUser = text;
      }
    }
    if (pendingUser) turns.push({ user: pendingUser, assistant: null, ts: Date.now() });

    if (turns.length) {
      session.turns = turns.slice(-10);
      // Обновим профиль — попробуем вытащить имя/город из истории
      const combinedText = turns.map(t => t.user || '').join(' ');
      const extracted = extractProfileFromText(combinedText);
      Object.assign(session.profile, extracted);
      session.lastActivity = Date.now();
      store.saveSession(sessionKey);
      console.log(`📜 History hydrated for ${sessionKey}: ${turns.length} turns`);
    }
  } catch (e) {
    console.warn('hydrateTgHistory failed:', e.message);
  }
}

// Синхронизируем новые исходящие сообщения менеджера из Telegram-чата
async function syncTgHistory(client, chatId, sessionKey) {
  try {
    const session = store.getSession(sessionKey);
    if (!session) return;

    const since = session.lastTgSync || 0;
    const messages = await client.getMessages(chatId, { limit: 20 });
    if (!messages?.length) return;

    let latestTs = since;
    let synced = 0;

    for (const m of messages) {
      if (!m.date || m.date <= since) continue;
      if (m.date > latestTs) latestTs = m.date;
      const text = (m.message || '').trim();
      if (!text) continue;
      if (m.out) {
        // исходящее: это либо ответ бота (уже в turns), либо сообщение менеджера
        store.pushManagerMessage(sessionKey, text, m.date * 1000);
        synced++;
      }
    }

    if (latestTs > since) store.setLastTgSync(sessionKey, latestTs);
    if (synced) console.log(`📥 tg sync: +${synced} manager msgs for ${sessionKey}`);
  } catch (e) {
    console.warn('syncTgHistory failed:', e.message);
  }
}

// Алерт в Telegram-бот менеджера
async function notifyAdmin(title, body) {
  try {
    const token = process.env.BOOKING_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.BOOKING_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: `${title}\n\n${body}`, parse_mode: 'HTML' }),
    });
  } catch (e) {
    console.error('notifyAdmin failed:', e.message);
  }
}

export function startWhatsApp() {
  const chromePath = getChromePath();
  console.log('🌐 WhatsApp Chrome path:', chromePath || '(bundled puppeteer)');

  const WA_SESSION_PATH = process.env.WA_SESSION_PATH || '/root/coucou-data/wa-auth';
  fs.mkdirSync(WA_SESSION_PATH, { recursive: true });
  console.log(`📁 WhatsApp session path: ${WA_SESSION_PATH}`);

  const waClient = new WhatsAppClient({
    authStrategy: new LocalAuth({
      clientId: 'coucou-anna',
      dataPath: WA_SESSION_PATH,
    }),
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    // webVersionCache убран — используем нативную версию WA Web из wwebjs
    // (старый URL 2.3000.1017054665-alpha может быть недоступен)
    puppeteer: {
      headless: true,
      ...(chromePath ? { executablePath: chromePath } : {}),
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'],
    },
  });

  waClient.on('qr', (qr) => {
    console.log('\n📱 QR-код для WhatsApp:\n');
    qrcode.generate(qr, { small: true });
  });
  waClient.on('ready', () => {
    console.log('✅ WhatsApp готов');
    notifyAdmin('✅ WhatsApp подключён', 'Канал WhatsApp активен.');
  });
  waClient.on('authenticated', () => console.log('🔐 WhatsApp authenticated'));
  waClient.on('auth_failure', (m) => {
    console.error('❌ WhatsApp auth_failure:', m);
    notifyAdmin('🚨 WhatsApp auth_failure', `Требуется повторный скан QR. Причина: ${m}`);
  });
  waClient.on('disconnected', (r) => {
    console.error('⚠️ WhatsApp disconnected:', r);
    notifyAdmin('⚠️ WhatsApp disconnected', `Причина: ${r}. Попробует переподключиться.`);
  });
  waClient.on('change_state', (state) => {
    console.log(`🔄 WhatsApp state: ${state}`);
  });
  waClient.on('loading_screen', (percent, message) => {
    console.log(`⏳ WhatsApp loading: ${percent}% ${message}`);
  });

  // Исходящие (менеджер пишет сам из WhatsApp-клиента) → пауза
  waClient.on('message_create', async (msg) => {
    try {
      if (!msg.fromMe) return;
      const txt = (msg.body || '').trim();
      if (!txt) return;

      // Игнорируем сообщения, которые отправил сам бот
      const trimmed = txt.slice(0, 200);
      if (botSentTexts.has(trimmed)) {
        botSentTexts.delete(trimmed);
        console.log(`🤖 WA own message, skip pause`);
        return;
      }

      const key = `wa_${msg.to}`;
      const cmd = control.parseManagerCommand(txt);
      if (cmd === 'stop') { control.pause(key); console.log(`⏸ WA Manager /stop: ${key}`); return; }
      if (cmd === 'start') { control.resume(key); console.log(`▶️ WA Manager /start: ${key}`); return; }

      // Пауза на 30 мин + сохраняем сообщение в контекст сессии
      control.pause(key);
      store.pushManagerMessage(key, txt, Date.now());
      console.log(`👤 WA Manager replied → pause 30min, saved to context: ${key}`);
    } catch (e) { console.error('WA outgoing handler:', e.message); }
  });

  waClient.on('message', async (msg) => {
    try {
      if (msg.fromMe || msg.isStatus || msg.isGroupMsg) return;
      const key = `wa_${msg.from}`;

      // Медиа без текста (фото, документы)
      const waHasText = !!(msg.body && msg.body.trim());
      if (msg.hasMedia && msg.type !== 'ptt' && msg.type !== 'audio' && !waHasText) {
        console.log(`📎 WA media (type=${msg.type}) from ${msg.from}`);
        await msg.reply(mediaRefusal(key));
        return;
      }

      // Голосовые (ptt) и аудио
      if (msg.type === 'ptt' || msg.type === 'audio') {
        try {
          const media = await msg.downloadMedia();
          if (!media || !media.data) {
            console.log(`🎤 WA voice: пустые данные от ${msg.from}`);
            return;
          }
          const buf = Buffer.from(media.data, 'base64');
          const text = await processVoice({ audioBuffer: buf, mimeType: media.mimetype, sessionKey: key });
          if (!text) {
            await msg.reply('Не удалось распознать голосовое. Напишите текстом, пожалуйста.');
            return;
          }
          const g = guard.check(key, text);
          if (!g.ok) { console.log(`🛡 ${key}: ${g.reason}`); return; }
          await handleIncoming(key, text, async (reply) => {
            markBotSent(reply);
            await msg.reply(reply);
          });
        } catch (e) {
          console.error('WA voice error:', e.message);
          try { await msg.reply('Не удалось обработать голосовое. Напишите текстом, пожалуйста.'); } catch {}
        }
        return;
      }

      // Обычный текст
      const text = msg.body?.trim();
      if (!text) return;
      if (INTERNAL_MARKER.test(text)) return;
      const g = guard.check(key, text);
      if (!g.ok) { console.log(`🛡 ${key}: ${g.reason}`); return; }
      await handleIncoming(key, text, async (reply) => {
        markBotSent(reply);
        await msg.reply(reply);
      });
    } catch (e) {
      console.error('WA handler error:', e.message);
    }
  });

  waClient.initialize().catch(e => console.error('WA init error:', e.message));
  return waClient;
}

// ====================== TELEGRAM (user account) ======================
export async function startTelegram() {
  const apiId = parseInt(process.env.TELEGRAM_API_ID);
  const apiHash = process.env.TELEGRAM_API_HASH;
  const stringSession = new StringSession(process.env.TELEGRAM_STRING_SESSION || '');

  const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });

  await client.start({
    phoneNumber: async () => await input.text('Номер Telegram: '),
    password: async () => await input.text('Пароль 2FA: '),
    phoneCode: async () => await input.text('Код: '),
    onError: console.log,
  });

  const me = await client.getMe();
  console.log(`✅ Telegram: ${me.firstName}`);
  await client.getDialogs({ limit: 100 });
  setInterval(() => client.getMe().catch(() => {}), 60000);

  // Handler ИСХОДЯЩИХ сообщений (менеджер пишет сам):
  // 1) /stop, /start, /status — команды управления
  // 2) любое другое исходящее → авто-пауза бота на 24 часа в этом чате
  client.addEventHandler(async (event) => {
    const message = event.message;
    if (!message?.message || !message.out) return;
    try {
      if (message.isGroup || message.isChannel) return;
      const chatId = message.chatId;
      if (!chatId) return;
      const key = `tg_${Number(chatId.toString())}`;
      const text = message.message.trim();
      const cmd = control.parseManagerCommand(text);
      if (cmd === 'stop') {
        control.pause(key, 24 * 60 * 60 * 1000);
        console.log(`⏸ Manager /stop → pause 24h: ${key}`);
        return;
      }
      if (cmd === 'start') {
        control.resume(key);
        console.log(`▶️ Manager /start → resume: ${key}`);
        return;
      }
      if (cmd === 'status') {
        const paused = control.isPaused(key);
        await client.sendMessage(Number(chatId.toString()), { message: `Статус бота: ${paused ? 'на паузе' : 'активен'}` });
        return;
      }
      // Обычный ответ менеджера → авто-пауза
      if (text.length > 0) {
        control.pause(key, 24 * 60 * 60 * 1000);
        console.log(`👤 Manager replied → auto-pause 24h: ${key}`);
      }
    } catch (e) {
      console.error('outgoing handler error:', e.message);
    }
  }, new NewMessage({ outgoing: true }));

  client.addEventHandler(async (event) => {
    const message = event.message;
    if (!message || message.out) return;
    const hasText = !!(message.message && message.message.length);
    const hasVoice = !!(message.voice || message.audio);
    if (!hasText && !hasVoice) return;
    try {
      // Быстрый отсев групповых/каналов по свойствам сообщения
      if (message.isGroup || message.isChannel) return;

      const senderId = message.senderId;
      if (!senderId) return;

      const senderStr = senderId.toString();
      const chatStr = message.chatId ? message.chatId.toString() : '';
      const rawText = (message.message || '').trim();

      // Пропускаем системные чаты — и по senderId, и по chatId
      if (SKIP_CHAT_IDS.has(senderStr) || SKIP_CHAT_IDS.has(chatStr)) {
        console.log(`⏭ skip system chat: sender=${senderStr} chat=${chatStr}`);
        return;
      }
      // Пропускаем наш собственный алерт
      if (INTERNAL_MARKER.test(rawText)) {
        console.log(`⏭ skip internal alert echo`);
        return;
      }

      // Явно тянем entity — иначе className может быть undefined
      let entity = null;
      try {
        entity = await client.getEntity(senderId);
      } catch (e) {
        console.warn('getEntity failed for', senderStr, e.message);
      }

      const cls = entity?.className || '';

      // Отвечаем только живым пользователям
      if (cls && cls !== 'User') {
        console.log(`⏭ skip non-user: ${senderStr} (${cls})`);
        return;
      }
      // И не ботам
      if (entity?.bot) {
        console.log(`⏭ skip bot: ${senderStr}`);
        return;
      }

      // Только здесь логируем — после всех фильтров
      console.log(`📥 TG User from ${senderStr}: "${rawText.slice(0,60)}"`);

      const uid = Number(senderId.toString());
      const key = `tg_${uid}`;

      // Голосовые и аудио
      const isVoice = !!(message.voice || message.audio);
      if (isVoice) {
        try {
          const media = message.voice || message.audio;
          const maxSec = Number(process.env.MAX_AUDIO_SECONDS || 120);

          // gramJS хранит duration в media.attributes[0].duration (DocumentAttributeAudio)
          let dur = 0;
          const attrs = media?.attributes || message.media?.document?.attributes || [];
          for (const attr of attrs) {
            if (attr && typeof attr.duration === 'number') { dur = attr.duration; break; }
          }
          console.log(`🎤 Voice: duration=${dur}s (max=${maxSec}s)`);

          if (dur && dur > maxSec) {
            console.log(`🎤 Voice: слишком длинное (${dur}s > ${maxSec}s) — отказ без скачивания`);
            await client.sendMessage(uid, { message: `Голосовое длиннее ${maxSec} секунд. Опишите, пожалуйста, текстом — отвечу сразу.` });
            return;
          }
          const buf = await client.downloadMedia(message, {});
          if (!buf || !buf.length) {
            console.log(`🎤 Voice: пустой буфер от ${senderStr}`);
            return;
          }
          const mime = media.mimeType || 'audio/ogg';
          const text = await processVoice({ audioBuffer: buf, mimeType: mime, sessionKey: key });
          if (!text) {
            await client.sendMessage(uid, { message: 'Не удалось распознать голосовое. Напишите текстом, пожалуйста.' });
            return;
          }
          const g = guard.check(key, text);
          if (!g.ok) { console.log(`🛡 ${key}: ${g.reason}`); return; }
          await handleIncoming(key, text, async (reply) => {
            await client.sendMessage(uid, { message: reply });
          });
        } catch (e) {
          console.error('Voice processing error:', e.message);
          try {
            await client.sendMessage(uid, { message: 'Не удалось обработать голосовое. Напишите текстом, пожалуйста.' });
          } catch {}
        }
        return; // не идём дальше по текстовой ветке
      }

      // Обычный текст
      if (!message.message) return;
      const txt = message.message.trim();
      const g = guard.check(key, txt);
      if (!g.ok) { console.log(`🛡 ${key}: ${g.reason}`); return; }
      await handleIncoming(key, txt, async (reply) => {
        await client.sendMessage(uid, { message: reply });
      });
    } catch (err) {
      console.error('TG error:', err.message, err.stack);
    }
  }, new NewMessage({ incoming: true }));

  return client;
}

// ====================== EMAIL ======================
function extractEmailAddress(from) {
  if (!from) return 'unknown@unknown';
  const match = from.match(/<([^>]+)>/);
  return (match ? match[1] : from).trim().toLowerCase();
}

async function processEmailMessage(parsed) {
  const from = extractEmailAddress(parsed.from?.text || '');
  const subject = parsed.subject || '(без темы)';

  let text = (parsed.text || '').trim();
  if (!text && parsed.html) {
    text = String(parsed.html)
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  console.log(`\n📧 Письмо: ${from} | ${subject}`);

  const fromLower = from.toLowerCase();
  if (fromLower.includes('accounts.google.com') ||
      fromLower.includes('no-reply@') ||
      fromLower.includes('noreply@') ||
      fromLower.includes('mailer-daemon')) {
    stats.spam++; logStat(); return;
  }
  if (!text || text.length < 5) { stats.spam++; logStat(); return; }

  const relevant = isRelevantMessage(text) || isRelevantMessage(subject);
  if (!relevant) { stats.spam++; logStat(); return; }

  if (isSpam(text) || isSpam(subject)) { stats.spam++; logStat(); return; }

  stats.email++; stats.total++; stats.relevant++;

  const sessionKey = `email_${from}`;
  const content = `Клиент написал на email.\nТема: ${subject}\n\n${text}`;

  await saveOrUpdateLead({
    clientName: from.split('@')[0] || 'Клиент',
    phone: 'N/A',
    city: 'Уточняется',
    details: `Email lead. Subject: ${subject}. Body: ${text.slice(0, 500)}`,
    stage: 'greeting',
    source: 'Email',
  });

  const reply = await generateReply(sessionKey, content);
  console.log(`💬 Ответ Анны (email):\n${reply}\n`);
  logStat();
}

export async function checkEmails() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log('⚠️ Gmail не настроен');
    return;
  }
  const client = new ImapFlow({
    host: 'imap.gmail.com', port: 993, secure: true,
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    logger: false, socketTimeout: 60000, greetingTimeout: 30000,
  });
  client.on('error', (err) => console.error('IMAP error:', err.message));

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const uids = await client.search({ seen: false });
      if (!uids?.length) return;
      for (const uid of uids) {
        try {
          const msg = await client.fetchOne(uid, { source: true }, { uid: true });
          if (!msg?.source) continue;
          const parsed = await simpleParser(msg.source);
          await processEmailMessage(parsed);
          await client.messageFlagsAdd({ uid }, ['\\Seen']);
        } catch (err) {
          console.error('Ошибка письма:', err.message);
          try { await client.messageFlagsAdd({ uid }, ['\\Seen']); } catch {}
        }
      }
    } finally { lock.release(); }
    await client.logout();
  } catch (err) {
    console.error('Ошибка IMAP:', err.message);
  }
}

export function startEmailWatcher() {
  const intervalSec = Number(process.env.EMAIL_CHECK_INTERVAL || 60);
  console.log(`📬 Мониторинг почты каждые ${intervalSec} сек`);
  setTimeout(() => checkEmails(), 5000);
  setInterval(() => checkEmails(), intervalSec * 1000);
}
