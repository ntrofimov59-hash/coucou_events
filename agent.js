import TelegramBot from 'node-telegram-bot-api';
import OpenAI from 'openai'; // xAI использует OpenAI-совместимый SDK
import { Client } from '@notionhq/client';
import cron from 'node-cron';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Подключаемся к Grok (xAI)
const grok = new OpenAI({
  apiKey: process.env.GROK_API_KEY,
  baseURL: "https://api.x.ai/v1",
});

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

const userSessions = {};
const lastActivity = {}; 

// --- ФУНКЦИИ ГЕНЕРАЦИИ ДОКУМЕНТОВ ---

function generatePDFProposal(data) {
  try {
    const outputDir = path.resolve('output');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

    const safeName = (data.clientName || 'Client').replace(/[/\\?%*:|"<>]/g, '_');
    const outputPath = path.resolve(outputDir, `Proposal_${safeName}.pdf`);
    
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(fs.createWriteStream(outputPath));

    const lang = data.language || 'ru';
    const titles = {
      ru: { title: "КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ", client: "Заказчик", phone: "Телефон", date: "Дата", details: "Детали мероприятия" },
      en: { title: "COMMERCIAL PROPOSAL", client: "Client", phone: "Phone", date: "Date", details: "Event Details" },
      hy: { title: "ԿՈՄԵՐՑԻՈՆ ԱՌԱՋԱՐԿ", client: "Պատվիրատու", phone: "Հեռախոս", date: "Ամսաթիվ", details: "Միջոցառման մանրամասներ" },
      es: { title: "PROPUESTA COMERCIAL", client: "Cliente", phone: "Teléfono", date: "Fecha", details: "Detalles del evento" }
    };

    const t = titles[lang] || titles['ru'];

    doc.fontSize(20).text("Coucou Events", { align: 'center' });
    doc.fontSize(12).text("Elite Event Agency across 14 cities", { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(16).text(t.title, { underline: true });
    doc.moveDown(1);
    doc.fontSize(12).text(`${t.client}: ${data.clientName || "N/A"}`);
    doc.text(`${t.phone}: ${data.phone || "N/A"}`);
    doc.text(`${t.date}: ${new Date().toLocaleDateString()}`);
    doc.text(`City: ${data.city || "Not specified"}`);
    doc.moveDown(1);
    doc.fontSize(14).text(`${t.details}:`);
    doc.fontSize(12).text(data.details || "Custom event planning and coordination.");
    doc.end();

    return outputPath;
  } catch (error) {
    console.error("Ошибка PDF:", error);
    return null;
  }
}

function generateContract(data) {
  try {
    const lang = ['ru', 'en', 'hy', 'es'].includes(data.language) ? data.language : 'ru';
    const clientType = data.clientType === 'legal' ? 'legal' : 'individual';
    const templatePath = path.resolve('templates', lang, `contract_${clientType}_${lang}.docx`);

    let finalTemplatePath = templatePath;
    if (!fs.existsSync(templatePath)) {
      finalTemplatePath = path.resolve('templates', 'ru', 'contract_individual_ru.docx');
    }

    if (!fs.existsSync(finalTemplatePath)) {
      console.error("Шаблон договора не найден!");
      return null;
    }

    const content = fs.readFileSync(finalTemplatePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

    doc.render({
      ...data,
      currentDate: new Date().toLocaleDateString()
    });

    const buf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
    const outputDir = path.resolve('output');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
    
    const outputPath = path.resolve(outputDir, `Contract_${clientType}_${lang}_${data.clientName}.docx`);
    fs.writeFileSync(outputPath, buf);
    return outputPath;
  } catch (error) {
    console.error("Ошибка DOCX:", error);
    return null;
  }
}

// --- ИНСТРУМЕНТЫ (TOOLS) ДЛЯ GROK ---

const tools = [
  {
    type: "function",
    function: {
      name: "save_lead_to_notion",
      description: "Сохранить данные лида в Notion CRM.",
      parameters: {
        type: "object",
        properties: {
          clientName: { type: "string" },
          phone: { type: "string" },
          city: { type: "string" },
          language: { type: "string", description: "ru, en, hy, es" },
          details: { type: "string" },
          status: { type: "string" }
        },
        required: ["clientName", "city", "language", "details"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_pdf_proposal",
      description: "Генерация и отправка PDF коммерческого предложения.",
      parameters: {
        type: "object",
        properties: {
          clientName: { type: "string" },
          phone: { type: "string" },
          city: { type: "string" },
          language: { type: "string" },
          details: { type: "string" }
        },
        required: ["clientName", "city", "language", "details"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_client_contract",
      description: "Генерация официального договора (docx) для физ или юр лиц.",
      parameters: {
        type: "object",
        properties: {
          clientName: { type: "string" },
          language: { type: "string" },
          clientType: { type: "string", description: "individual или legal" },
          companyName: { type: "string" },
          taxId: { type: "string" },
          details: { type: "string" }
        },
        required: ["clientName", "language", "clientType", "details"]
      }
    }
  }
];

const SYSTEM_INSTRUCTION = `Ты — международный AI-менеджер элитного агентства событий "Coucou Events", работающего в 14 городах.
Правила: 
1. Определяй язык клиента (русский, английский, армянский, испанский) и отвечай строго на нем.
2. Уточняй город проведения и тип лица (физ/юр) для договоров.
3. Активно используй доступные функции для сохранения лидов в Notion, генерации PDF КП и договоров.`;

// --- ОБРАБОТЧИК СООБЩЕНИЙ ---

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  if (!msg.text) return;
  lastActivity[chatId] = Date.now();

  if (!userSessions[chatId]) {
    userSessions[chatId] = [{ role: 'system', content: SYSTEM_INSTRUCTION }];
  }

  userSessions[chatId].push({ role: 'user', content: msg.text });

  try {
    const response = await grok.chat.completions.create({
      model: 'grok-4.5', // Либо актуальная модель Grok
      messages: userSessions[chatId],
      tools: tools,
      tool_choice: "auto",
    });

    const responseMessage = response.choices[0].message;
    userSessions[chatId].push(responseMessage);

    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      for (const toolCall of responseMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        let toolResultOutput = "Success";

        if (functionName === "save_lead_to_notion") {
          await notion.pages.create({
            parent: { database_id: DATABASE_ID },
            properties: {
              Name: { title: [{ text: { content: functionArgs.clientName || "Client" } }] },
              Phone: { rich_text: [{ text: { content: functionArgs.phone || "N/A" } }] },
              Details: { rich_text: [{ text: { content: `[${functionArgs.city || 'City'}, Lang: ${functionArgs.language}] ${functionArgs.details}` } }] },
              "Telegram ID": { number: chatId },
              Status: { select: { name: functionArgs.status || "New Lead" } }
            }
          });
          toolResultOutput = "Lead saved to Notion.";
        }

        if (functionName === "send_pdf_proposal") {
          const pdfPath = generatePDFProposal(functionArgs);
          if (pdfPath) {
            await bot.sendDocument(chatId, pdfPath, {
              caption: "📄 Commercial Proposal / Коммерческое предложение 🌸"
            });
            toolResultOutput = "PDF Proposal sent.";
          }
        }

        if (functionName === "generate_client_contract") {
          const filePath = generateContract(functionArgs);
          if (filePath) {
            await bot.sendDocument(chatId, filePath, {
              caption: "📝 Official Contract / Официальный договор готов."
            });
            toolResultOutput = "Contract generated and sent.";
          }
        }

        userSessions[chatId].push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: functionName,
          content: toolResultOutput,
        });
      }

      const secondResponse = await grok.chat.completions.create({
        model: 'grok-4.5',
        messages: userSessions[chatId],
      });

      const finalReply = secondResponse.choices[0].message.content;
      userSessions[chatId].push({ role: 'assistant', content: finalReply });
      bot.sendMessage(chatId, finalReply);

    } else {
      bot.sendMessage(chatId, responseMessage.content);
    }

  } catch (err) {
    console.error("Ошибка при работе с Grok API:", err);
    bot.sendMessage(chatId, "Technical error occurred. Manager will contact you shortly.");
  }
});

// --- АВТОДОЖИМ ---
cron.schedule('0 10 * * *', () => {
  const now = Date.now();
  for (const chatId in lastActivity) {
    if (now - lastActivity[chatId] > 86400000) {
      bot.sendMessage(chatId, "Hello! Following up on your event planning with Coucou Events. Let us know if you have any questions! 🌸");
      lastActivity[chatId] = now;
    }
  }
});

console.log("🤖 International AI-Manager powered by Grok (xAI) is running successfully!");