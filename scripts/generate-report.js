// scripts/generate-report.js
const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

if (!token || !chatId) {
  console.error("❌ Ошибка: Не заданы TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID");
  process.exit(1);
}

async function collectMetrics() {
  // Здесь в будущем будут реальные запросы к API Яндекса и Google
  // А пока для примера формируем структуру данных отчета за неделю:
  return {
    period: "Прошедшая неделя",
    yandex: {
      visits: "В разработке",
      searchQueries: "В разработке"
    },
    google: {
      clicks: "В разработке",
      impressions: "В разработке"
    }
  };
}

async function sendReport() {
  const metrics = await collectMetrics();

  const message = `
📊 *Еженедельный отчет по проекту Coucou Events*
📅 Период: ${metrics.period}

🔵 *Яндекс (Метрика / Вебмастер):*
• Визиты: ${metrics.yandex.visits}
• Поисковые запросы: ${metrics.yandex.searchQueries}

🟢 *Google (Search Console / GA4):*
• Клик из поиска: ${metrics.google.clicks}
• Показы: ${metrics.google.impressions}

🚀 _Отчет сгенерирован автоматически через GitHub Actions_
  `;

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
      console.log("✅ Еженедельный отчет успешно отправлен в Telegram!");
    } else {
      console.error("❌ Ошибка от Telegram API:", data);
    }
  } catch (error) {
    console.error("❌ Ошибка сети:", error);
  }
}

sendReport();