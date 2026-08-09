// scripts/test-telegram.js
const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

if (!token || !chatId) {
  console.error("❌ Ошибка: Не заданы TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID");
  process.exit(1);
}

async function sendTestMessage() {
  const message = "🚀 Бот Coucou Events успешно подключен! Скоро здесь появятся еженедельные отчеты из метрик и поисковиков.";
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown"
      })
    });

    const data = await response.json();
    if (data.ok) {
      console.log("✅ Тестовое сообщение успешно отправлено в Telegram!");
    } else {
      console.error("❌ Ошибка от Telegram API:", data);
    }
  } catch (error) {
    console.error("❌ Ошибка сети:", error);
  }
}

sendTestMessage();