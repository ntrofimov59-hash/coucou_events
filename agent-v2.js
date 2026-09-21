// agent-v2.js — новая версия агента Coucou Events
import cron from 'node-cron';
import * as store from './agent/store.js';
import { startHttpServer } from './agent/http-server.js';
import { loadKnowledge } from './agent/knowledge.js';
import { startWhatsApp, startTelegram, startEmailWatcher } from './agent/channels.js';
import { logStat } from './agent/core.js';
import * as control from './agent/control.js';
import { MODEL } from './agent/config.js';

// Флаги включения каналов (можно переопределить в .env)
const ENABLE_WHATSAPP = process.env.ENABLE_WHATSAPP === '1';
const ENABLE_EMAIL = process.env.ENABLE_EMAIL === '1';
const ENABLE_TELEGRAM = process.env.ENABLE_TELEGRAM !== '0';

async function main() {
  console.log('⏳ Запуск Coucou Events Manager v2...\n');

  store.load();
  loadKnowledge();

  // Локальный HTTP для endpoint сайта
  try {
    startHttpServer();
  } catch (e) {
    console.error('HTTP server failed:', e.message);
  }
  console.log(`📂 Загружено сессий: ${store.getStats().sessions}`);

  if (ENABLE_WHATSAPP) {
    console.log('🟢 WhatsApp: включён');
    startWhatsApp();
  } else {
    console.log('⚪ WhatsApp: отключён (ENABLE_WHATSAPP!=1)');
  }

  if (ENABLE_TELEGRAM) {
    try {
      await startTelegram();
    } catch (e) {
      console.error('TG init failed:', e.message);
    }
  } else {
    console.log('⚪ Telegram: отключён');
  }

  if (ENABLE_EMAIL) {
    console.log('🟢 Email: включён');
    startEmailWatcher();
  } else {
    console.log('⚪ Email: отключён (ENABLE_EMAIL!=1)');
  }

  cron.schedule('0 * * * *', () => {
    store.cleanup();
    store.flush();
    logStat();
  });

  // Follow-up: раз в час проверяем сессии, которые замолчали
  cron.schedule('15 * * * *', async () => {
    console.log('⏰ Follow-up check...');
    try {
      const { runFollowups } = await import('./agent/followup.js');
      await runFollowups();
    } catch (e) {
      console.error('Follow-up error:', e.message);
    }
  });

  const shutdown = () => {
    console.log('\n💾 Сохраняю сессии...');
    store.flush();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.log('\n🚀 Бот запущен');
  console.log('Активные каналы:', [ENABLE_TELEGRAM && 'Telegram', ENABLE_WHATSAPP && 'WhatsApp', ENABLE_EMAIL && 'Email'].filter(Boolean).join(' + ') || 'нет');
  console.log('CRM: Notion');
  console.log('Модель:', MODEL);
  console.log('Языки: ru | en | es | hy');
  console.log('Управление ботом: /stop | /start | /status (от менеджера)');
  console.log('Клиент opt-out: /stop (от клиента)\n');
}

main().catch(console.error);
