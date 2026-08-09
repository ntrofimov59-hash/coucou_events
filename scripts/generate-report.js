const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
const yandexToken = process.env.YANDEX_TOKEN;

if (!token || !chatId) {
  console.error("❌ Ошибка: Не заданы TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID");
  process.exit(1);
}

async function checkYandexToken() {
  if (!yandexToken) {
    console.log("⚠️ YANDEX_TOKEN не задан, пропуск проверки Метрики");
    return null;
  }

  // Добавляем параметр pretty=1 и правильный заголовок
  const url = "https://api-metrika.yandex.net/management/v1/counters";
  try {
    const response = await fetch(url, {
      headers: { 
        "Authorization": `OAuth ${yandexToken}`,
        "Content-Type": "application/json"
      }
    });

    const textResponse = await response.text();
    
    // Проверяем, не пришел ли HTML вместо JSON
    if (textResponse.trim().startsWith("<")) {
      console.error("❌ Яндекс вернул HTML вместо JSON. Проверьте правильность токена.");
      return null;
    }

    const data = JSON.parse(textResponse);
    
    if (response.ok) {
      console.log("✅ Яндекс Токен актуален! Счетчиков найдено:", data.counters ? data.counters.length : 0);
      return data.counters && data.counters.length > 0 ? data.counters[0].id : null;
    } else {
      console.error("❌ Ошибка от Яндекс API:", data);
      return null;
    }
  } catch (error) {
    console.error("❌ Ошибка при обращении к Яндексу:", error);
    return null;
  }
}

async function collectMetrics() {
  const counterId = await checkYandexToken();
  return {
    period: "Прошедшая неделя",
    yandex: {
      visits: counterId ? "Подключено (ID:" + counterId + ")" : "Ошибка/Не задан",
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
• Статус: ${metrics.yandex.visits}
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