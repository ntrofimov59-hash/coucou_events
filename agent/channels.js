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

import { getChromePath } from './config.js';
import { processVoice } from './voice.js';
import * as guard from './guard.js';
import * as control from './control.js';

// Чаты, куда бот сам шлёт алерты — не отвечаем на них
const SKIP_CHAT_IDS = new Set(
  [process.env.BOOKING_CHAT_ID, process.env.ANALYTICS_CHAT_ID, process.env.TELEGRAM_CHAT_ID]
    .filter(Boolean).map(String)
);
// Если в тексте есть наш маркер алерта — точно не отвечаем
const INTERNAL_MARKER = /^🚨\s*Эскалация:/;
import { handleIncoming, isRelevantMessage, isSpam, stats, logStat, saveOrUpdateLead, generateReply, mediaRefusal } from './core.js';

// ====================== WHATSAPP ======================
export function startWhatsApp() {
  const chromePath = getChromePath();
  console.log('🌐 WhatsApp Chrome path:', chromePath || '(bundled puppeteer)');

  const waClient = new WhatsAppClient({
    authStrategy: new LocalAuth({ clientId: 'coucou-anna' }),
    puppeteer: {
      headless: true,
      ...(chromePath ? { executablePath: chromePath } : {}),
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    },
  });

  waClient.on('qr', (qr) => {
    console.log('\n📱 QR-код для WhatsApp:\n');
    qrcode.generate(qr, { small: true });
  });
  waClient.on('ready', () => console.log('✅ WhatsApp готов'));
  waClient.on('auth_failure', (m) => console.error('❌ WhatsApp auth_failure:', m));
  waClient.on('disconnected', (r) => console.error('⚠️ WhatsApp disconnected:', r));

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
          await handleIncoming(key, text, async (reply) => { await msg.reply(reply); });
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
      await handleIncoming(key, text, async (reply) => { await msg.reply(reply); });
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
      const rawText = (message.message || '').trim();

      // Пропускаем системные чаты (BOOKING_CHAT_ID, ANALYTICS_CHAT_ID и т.д.)
      if (SKIP_CHAT_IDS.has(senderStr)) {
        console.log(`⏭ skip system chat: ${senderStr}`);
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
      console.log(`📥 TG ${cls} from ${senderStr}: "${rawText.slice(0,60)}"`);

      // Отвечаем только живым пользователям
      if (cls && cls !== 'User') return;
      // И не ботам
      if (entity?.bot) {
        console.log(`⏭ skip bot: ${senderStr}`);
        return;
      }

      const uid = Number(senderId.toString());
      const key = `tg_${uid}`;

      // Голосовые и аудио
      const isVoice = !!(message.voice || message.audio);
      if (isVoice) {
        try {
          const media = message.voice || message.audio;
          const maxSec = Number(process.env.MAX_AUDIO_SECONDS || 120);
          if (media.duration && media.duration > maxSec) {
            console.log(`🎤 Voice: слишком длинное (${media.duration}s > ${maxSec}s)`);
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
