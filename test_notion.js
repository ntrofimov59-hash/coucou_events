import { Client } from '@notionhq/client';
import dotenv from 'dotenv';
dotenv.config();

// Инициализируем клиент
const notion = new Client({ auth: process.env.NOTION_TOKEN });

async function testConnection() {
  console.log("🔍 Начинаю проверку подключения к Notion...");
  try {
    const response = await notion.databases.retrieve({
      database_id: process.env.NOTION_DATABASE_ID,
    });
    console.log("✅ Успешно! Подключились к базе данных:", response.title[0].plain_text);
  } catch (error) {
    console.error("❌ Ошибка подключения к Notion:");
    console.error(error.body ? JSON.stringify(error.body, null, 2) : error.message);
  }
}

testConnection();