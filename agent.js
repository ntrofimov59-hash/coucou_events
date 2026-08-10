import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { NewMessage } from 'telegram/events/index.js';
import input from 'input';
import OpenAI from 'openai';
import { Client as NotionClient } from '@notionhq/client';
import pkg from 'whatsapp-web.js';
const { Client: WhatsAppClient, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import cron from 'node-cron';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// ====================== КОНФИГ ======================
const apiId = parseInt(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;
const stringSession = new StringSession(process.env.TELEGRAM_STRING_SESSION || "");

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

const notion = new NotionClient({ auth: process.env.NOTION_TOKEN });
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

const MODEL = 'llama-3.3-70b-versatile'; // более умная и грамотная модель

const userSessions = {};
const lastActivity = {};
const stats = { total: 0, relevant: 0, saved: 0, objections: 0 };

// ====================== БАЗА ЗНАНИЙ ======================
const SYSTEM_PROMPT = `Ты — Анна, старший менеджер агентства Coucou Events.
Стиль: деловой, уверенный, конкретный. Пиши грамотно на русском литературном языке.

Ты работаешь ТОЛЬКО с организацией мероприятий и арендой шатров.

=== УСЛУГИ ===
1. Аренда шатров — от $450 / сутки (монтаж, свет, пол, защита от погоды)
2. Организация свадеб под ключ — от $3 500 / проект
3. Мероприятия под ключ и корпоративы — от $5 000 / проект
4. Кейтеринг — от $55 / гость

=== ГОРОДА ===
Ереван (головной офис), Бали, Гоа, Тбилиси, Прага, Нячанг, Анталья, Дананг, Белград, Будапешт, Касабланка, Марракеш, Пхукет.
Если город другой — скажи, что нужно уточнить возможность, и предложи созвон.

=== ПРАВИЛА ===
1. В начале представься как Анна и уточни имя клиента.
2. Когда узнала имя — обращайся по имени.
3. НИКОГДА не придумывай локацию.
4. Разделяй смысловые части абзацами.
5. Собирай данные строго по порядку:
   имя → тип услуги → город → дата → количество гостей → бюджет → телефон
6. Максимум 1–2 вопроса за раз.
7. При вопросе о цене называй реальные стартовые цены.
8. При возражениях используй сильные аргументы и веди дальше.
9. Когда есть имя + город + детали — вызывай save_lead_to_notion.
10. Цель — довести до созвона или запроса сметы.`;

const OBJECTION_SCRIPTS = {
  expensive: `Понимаю вопрос бюджета.

Стоимость зависит от города, даты, наполнения и количества гостей. Мы всегда готовим 2–3 варианта сметы — от более компактного до премиального.

Какой ориентировочный бюджет вы рассматриваете?`,
  
  think: `Конечно, решение важное.

Чтобы вам было проще сравнить, я могу подготовить короткое коммерческое предложение с 2–3 вариантами под ваши вводные.

Как удобнее получить — сюда в чат или на почту?`,
  
  compare: `Правильно, что сравниваете.

Наше отличие: мы не просто посредники, а команда с собственным продакшеном и прямыми контрактами на площадках. Это даёт контроль качества и обычно экономит 15–25%.

Могу подготовить сравнительную структуру, что входит в нашу смету.`,
  
  later: `Хорошо, без давления.

Лучшие даты и подрядчики бронируются заранее. Если дата уже близко — лучше зафиксировать предварительный интерес.

Напомнить вам через пару дней?`,
  
  default: `Понимаю ваши сомнения.

Давайте уточним ключевые детали — и я сразу покажу, как это можно реализовать в рамках вашего запроса.`
};

// ====================== TOOL ======================
const tools = [{
  type: "function",
  function: {
    name: "save_lead_to_notion",
    description: "Сохранить или обновить лид в CRM",
    parameters: {
      type: "object",
      properties: {
        clientName: { type: "string" },
        phone: { type: "string" },
        city: { type: "string" },
        language: { type: "string" },
        eventDate: { type: "string" },
        budget: { type: "string" },
        details: { type: "string" },
        stage: { type: "string", description: "New Lead | Qualification | Proposal | Negotiation" }
      },
      required: ["clientName", "city", "details"]
    }
  }
}];

// ====================== УТИЛИТЫ ======================
function isRelevantMessage(text) {
  const lower = text.toLowerCase();
  const keywords = [
    'шатер', 'шатёр', 'тент', 'свадьб', 'корпоратив', 'мероприятие',
    'банкет', 'день рожден', 'юбилей', 'аренда', 'организ', 'праздник',
    'гости', 'дата', 'бюджет', 'локация', 'площадка', 'кейтеринг',
    'гоа', 'бали', 'ереван', 'тбилиси', 'прага', 'пхукет', 'анталья',
    'дананг', 'нячанг', 'марракеш', 'будапешт', 'белград'
  ];
  return keywords.some(k => lower.includes(k));
}

function detectObjection(text) {
  const lower = text.toLowerCase();
  if (/(дорог|бюджет|не потяну|дороговат|не по карману)/.test(lower)) return 'expensive';
  if (/(подумаю|подумать|не сейчас|позже|отложим)/.test(lower)) return 'think';
  if (/(сравниваю|другие|конкурент|варианты|еще посмотрю)/.test(lower)) return 'compare';
  if (/(потом|не готов|не сейчас)/.test(lower)) return 'later';
  return null;
}

function humanDelay(text) {
  const delay = Math.min(900 + text.length * 15, 4000);
  return new Promise(r => setTimeout(r, delay));
}

function logStat(type) {
  stats[type] = (stats[type] || 0) + 1;
  console.log(`📊 Статистика: всего=${stats.total}, релевантных=${stats.relevant}, сохранено=${stats.saved}, возражений=${stats.objections}`);
}

// ====================== CRM ======================
async function findLeadInNotion(phone, name, city) {
  try {
    const filters = [];
    if (phone && phone !== 'N/A') {
      filters.push({ property: 'Phone', rich_text: { contains: phone } });
    }
    if (name && name !== 'Клиент') {
      filters.push({ property: 'Name', title: { contains: name } });
    }
    if (city && city !== 'N/A') {
      filters.push({ property: 'City', rich_text: { contains: city } });
    }

    if (filters.length === 0) return null;

    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      filter: { or: filters },
      page_size: 1
    });

    return response.results?.[0] || null;
  } catch (e) {
    console.error('Ошибка поиска в Notion:', e.message);
    return null;
  }
}

async function saveOrUpdateLead(args) {
  try {
    const existing = await findLeadInNotion(args.phone, args.clientName, args.city);

    let formattedDate = null;
    if (args.eventDate?.includes('.')) {
      const parts = args.eventDate.split('.');
      if (parts.length === 3) {
        formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    const numericBudget = args.budget
      ? Number(String(args.budget).replace(/[^0-9]/g, ''))
      : null;

    const properties = {
      "Name": { title: [{ text: { content: args.clientName || "Клиент" } }] },
      "Phone": { rich_text: [{ text: { content: args.phone || "N/A" } }] },
      "City": { rich_text: [{ text: { content: args.city || "N/A" } }] },
      "Language": { select: { name: args.language || "Russian" } },
      "Details": { rich_text: [{ text: { content: args.details || "N/A" } }] },
      "Status": { select: { name: args.stage || "New Lead" } }
    };

    if (formattedDate) properties["Date"] = { date: { start: formattedDate } };
    if (!isNaN(numericBudget) && numericBudget) properties["Budget"] = { number: numericBudget };

    if (existing) {
      await notion.pages.update({ page_id: existing.id, properties });
      console.log("🔄 Лид обновлён в Notion");
    } else {
      await notion.pages.create({
        parent: { database_id: DATABASE_ID },
        properties
      });
      console.log("💾 Новый лид создан в Notion");
    }

    stats.saved++;
    logStat('saved');
  } catch (e) {
    console.error("Ошибка CRM:", e.message);
  }
}

// ====================== ГЕНЕРАЦИЯ ======================
async function generateReply(sessionKey, userMessage) {
  if (!userSessions[sessionKey]) {
    userSessions[sessionKey] = {
      messages: [{ role: "system", content: SYSTEM_PROMPT }],
      data: {},
      stage: 'New Lead'
    };
  }

  const session = userSessions[sessionKey];
  session.messages.push({ role: "user", content: userMessage });

  // Ограничение истории
  if (session.messages.length > 16) {
    session.messages = [session.messages[0], ...session.messages.slice(-12)];
  }

  // Возражение
  const objection = detectObjection(userMessage);
  if (objection) {
    stats.objections++;
    logStat('objections');
    const script = OBJECTION_SCRIPTS[objection] || OBJECTION_SCRIPTS.default;
    session.messages.push({ role: "assistant", content: script });
    return script;
  }

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: session.messages,
      tools,
      tool_choice: "auto",
      temperature: 0.45,
      max_tokens: 350,
    });

    const message = completion.choices[0].message;

    // Tool call
    if (message.tool_calls?.length > 0) {
      const toolCall = message.tool_calls[0];
      const args = JSON.parse(toolCall.function.arguments || "{}");
      args.stage = args.stage || session.stage || 'Qualification';

      console.log("🛠 CRM:", args);
      await saveOrUpdateLead(args);

      session.messages.push(message);
      session.messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: "Лид сохранён/обновлён в CRM"
      });

      const followUp = await groq.chat.completions.create({
        model: MODEL,
        messages: session.messages,
        temperature: 0.45,
        max_tokens: 280,
      });

      const finalText = followUp.choices[0].message.content?.trim();
      if (finalText) {
        session.messages.push({ role: "assistant", content: finalText });
        return finalText;
      }
    }

    const text = message.content?.trim();
    if (text) {
      session.messages.push({ role: "assistant", content: text });
      return text;
    }

    return "Уточните, пожалуйста, город и примерную дату мероприятия.";
  } catch (err) {
    console.error("Ошибка модели:", err.message);
    return "Произошла техническая заминка. Напишите ещё раз — я на связи.";
  }
}

// ====================== ОБРАБОТКА ======================
async function handleIncoming(sessionKey, text, sendFn) {
  stats.total++;
  lastActivity[sessionKey] = Date.now();
  console.log(`\n📩 [${sessionKey}]: ${text}`);

  if (!isRelevantMessage(text) && !userSessions[sessionKey]) {
    const reject = `Здравствуйте. Я Анна, менеджер Coucou Events.

Я помогаю с организацией мероприятий и арендой шатров. Если у вас есть запрос по этой теме — напишите, буду рада помочь.`;
    await humanDelay(reject);
    await sendFn(reject);
    return;
  }

  stats.relevant++;
  const reply = await generateReply(sessionKey, text);
  await humanDelay(reply);
  await sendFn(reply);
  console.log(`💬 Ответ:\n${reply}\n`);
}

// ====================== WHATSAPP ======================
const waClient = new WhatsAppClient({
  authStrategy: new LocalAuth({ clientId: "coucou-anna" }),
  puppeteer: {
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  }
});

waClient.on('qr', (qr) => {
  console.log('\n📱 QR-код для WhatsApp:\n');
  qrcode.generate(qr, { small: true });
});

waClient.on('ready', () => console.log('✅ WhatsApp готов'));

waClient.on('message', async (msg) => {
  if (msg.fromMe || msg.isStatus || msg.isGroupMsg) return;
  const text = msg.body?.trim();
  if (!text) return;

  await handleIncoming(`wa_${msg.from}`, text, async (reply) => {
    await msg.reply(reply);
  });
});

// ====================== TELEGRAM ======================
async function startTelegram() {
  const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });

  await client.start({
    phoneNumber: async () => await input.text("Номер Telegram: "),
    password: async () => await input.text("Пароль 2FA: "),
    phoneCode: async () => await input.text("Код: "),
    onError: console.log,
  });

  const me = await client.getMe();
  console.log(`✅ Telegram: ${me.firstName}`);
  await client.getDialogs({ limit: 5 });
  setInterval(() => client.getMe().catch(() => {}), 60000);

  client.addEventHandler(async (event) => {
    const message = event.message;
    if (!message?.message || message.out) return;

    try {
      const chat = await message.getChat();
      if (chat?.className !== 'User') return;

      const senderId = Number(message.senderId.toString());
      await handleIncoming(`tg_${senderId}`, message.message.trim(), async (reply) => {
        await client.sendMessage(senderId, { message: reply });
      });
    } catch (err) {
      console.error("TG error:", err.message);
    }
  }, new NewMessage({ incoming: true }));

  return client;
}

// ====================== АВТОДОЖИМ ======================
cron.schedule('0 11 * * *', async () => {
  console.log('⏰ Проверка автодожима...');
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const THREE_DAYS = 3 * ONE_DAY;

  for (const [key, time] of Object.entries(lastActivity)) {
    const elapsed = now - time;

    // Только Telegram пока (безопаснее)
    if (!key.startsWith('tg_')) continue;

    let message = null;
    if (elapsed > THREE_DAYS) {
      message = `Добрый день.\n\nХотели уточнить — удалось ли продвинуться с датами и локацией? Могу подготовить предварительный расчёт.`;
    } else if (elapsed > ONE_DAY) {
      message = `Добрый день.\n\nНапоминаю о вашем запросе. Если остались вопросы по смете или площадке — я на связи.`;
    }

    if (message) {
      try {
        // автодожим можно включить позже точечно
        console.log(`Автодожим готов для ${key}`);
        lastActivity[key] = now;
      } catch {}
    }
  }
});

// ====================== ЗАПУСК ======================
async function main() {
  console.log('⏳ Запуск усиленного Coucou Events Manager...\n');
  waClient.initialize();
  await startTelegram();
  console.log('\n🚀 Бот запущен (Telegram + WhatsApp)');
  console.log('Модель:', MODEL);
}

main().catch(console.error);