// agent/test-telegram-debug.js — ловим ВСЁ, что приходит в аккаунт Cou
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { NewMessage } from 'telegram/events/index.js';
import input from 'input';
import dotenv from 'dotenv';
dotenv.config();

const apiId = parseInt(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;
const stringSession = new StringSession(process.env.TELEGRAM_STRING_SESSION || '');

const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });

await client.start({
  phoneNumber: async () => await input.text('Номер: '),
  password: async () => await input.text('2FA: '),
  phoneCode: async () => await input.text('Код: '),
  onError: console.log,
});

const me = await client.getMe();
console.log(`✅ Подключён как: ${me.firstName} (id=${me.id}, username=@${me.username || 'нет'})`);

console.log('👂 Слушаю все входящие. Напишите этому аккаунту с ДРУГОГО Telegram-аккаунта...\n');

client.addEventHandler(async (event) => {
  try {
    const msg = event.message;
    console.log('🔔 EVENT:', {
      hasMessage: !!msg,
      text: msg?.message,
      out: msg?.out,
      senderId: msg?.senderId?.toString(),
      chatId: msg?.chatId?.toString(),
      className: msg?.className,
      date: msg?.date,
    });

    if (!msg) return;

    const chat = await msg.getChat();
    console.log('   chat.className =', chat?.className, ' | chat.id =', chat?.id?.toString());
    console.log('   chat.title/name =', chat?.title || chat?.firstName || chat?.username);
    console.log('---');
  } catch (e) {
    console.error('❌ handler error:', e.message, e.stack);
  }
}, new NewMessage({}));  // БЕЗ фильтров — ловим всё

console.log('Слушаю... (Ctrl+C для выхода)\n');
await new Promise(() => {});
