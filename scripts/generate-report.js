import crypto from 'crypto';
import fs from 'fs';

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
const yandexToken = process.env.YANDEX_TOKEN;
const gcpKeyRaw = process.env.GCP_SA_KEY;

if (!token || !chatId) {
  console.error("❌ Ошибка: Не заданы TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID");
  process.exit(1);
}

// Функция для получения OAuth-токена Google по Сервисному аккаунту
async function getGoogleAccessToken(serviceAccountJson) {
  try {
    const sa = JSON.parse(serviceAccountJson);
    const now = Math.floor(Date.now() / 1000);
    
    const header = { alg: "RS256", typ: "JWT" };
    const payload = {
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      aud: sa.token_uri,
      exp: now + 3600,
      iat: now
    };

    const base64Header = Buffer.from(JSON.stringify(header)).toString("base64url");
    const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const unsignedToken = `${base64Header}.${base64Payload}`;

    const sign = crypto.createSign("RSA-SHA256");
    sign.update(unsignedToken);
    const signature = sign.sign(sa.private_key, "base64url");

    const jwt = `${unsignedToken}.${signature}`;

    const response = await fetch(sa.token_uri, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
    });

    const data = await response.json();
    return data.access_token || null;
  } catch (error) {
    console.error("❌ Ошибка генерации токена Google:", error);
    return null;
  }
}

// Получаем ID счетчика Метрики
async function getCounterId() {
  if (!yandexToken) return null;
  const url = "https://api-metrika.yandex.net/management/v1/counters";
  try {
    const response = await fetch(url, {
      headers: { "Authorization": `OAuth ${yandexToken}`, "Content-Type": "application/json" }
    });
    const textResponse = await response.text();
    if (textResponse.trim().startsWith("<")) return null;
    const data = JSON.parse(textResponse);
    return data.counters && data.counters.length > 0 ? data.counters[0].id : null;
  } catch (error) {
    return null;
  }
}

// Функция для расчета динамики (разница с прошлой неделей)
function calculateDiff(current, previous) {
  if (previous === undefined || previous === null) return "";
  const diff = current - previous;
  if (diff === 0) return " (⚖️ без изменений)";
  const sign = diff > 0 ? "+" : "";
  return ` (${sign}${diff} по сравнению с прошлым отчетом)`;
}

// Собираем метрики из Яндекс и Google
async function collectMetrics() {
  // --- 1. ЯНДЕКС МЕТРИКА ---
  const counterId = await getCounterId();
  let yandexVisits = 0;
  let totalTimeSec = 0;
  let topPagesList = [];
  let topQueries = "Прямые заходы / Нет данных";

  if (counterId) {
    try {
      const statsUrl = `https://api-metrika.yandex.net/stat/v1/data?metrics=ym:s:visits,ym:s:avgVisitDuration&dimensions=ym:s:startURL&date1=7daysAgo&date2=today&id=${counterId}&sort=-ym:s:visits&limit=3`;
      const res = await fetch(statsUrl, { headers: { "Authorization": `OAuth ${yandexToken}` } });
      const data = await res.json();
      if (data.data) {
        data.data.forEach(row => {
          const visits = row.metrics[0];
          const avgDuration = row.metrics[1];
          yandexVisits += visits;
          totalTimeSec += avgDuration * visits;
          if (row.dimensions && row.dimensions[0]) {
            topPagesList.push(`${row.dimensions[0].name} (${visits} виз.)`);
          }
        });
      }
    } catch (e) { console.error("Ошибка Яндекса:", e); }

    try {
      const queryUrl = `https://api-metrika.yandex.net/stat/v1/data?metrics=ym:s:visits&dimensions=ym:s:query&date1=7daysAgo&date2=today&id=${counterId}&limit=3`;
      const res = await fetch(queryUrl, { headers: { "Authorization": `OAuth ${yandexToken}` } });
      const data = await res.json();
      if (data.data) {
        const queries = data.data.map(item => item.dimensions[0].name).filter(q => q && q !== "(direct)" && q !== "не определено");
        if (queries.length > 0) topQueries = queries.join(", ");
      }
    } catch (e) {}
  }

  const avgTimeOverallSec = yandexVisits > 0 ? Math.round(totalTimeSec / yandexVisits) : 0;
  const timeFormatted = `${Math.floor(avgTimeOverallSec / 60)} мин ${avgTimeOverallSec % 60} сек`;

  // --- 2. GOOGLE SEARCH CONSOLE ---
  let googleClicks = 0;
  let googleImpressions = 0;

  if (gcpKeyRaw) {
    const googleAccessToken = await getGoogleAccessToken(gcpKeyRaw);
    if (googleAccessToken) {
      const siteUrl = "https://coucouevents.am"; 
      const gscUrl = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
      
      const d = new Date();
      const endDate = d.toISOString().split('T')[0];
      d.setDate(d.getDate() - 7);
      const startDate = d.toISOString().split('T')[0];

      try {
        const res = await fetch(gscUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${googleAccessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            startDate: startDate,
            endDate: endDate,
            dimensions: ["date"]
          })
        });
        const gscData = await res.json();
        if (gscData.rows) {
          gscData.rows.forEach(row => {
            googleClicks += row.clicks;
            googleImpressions += row.impressions;
          });
        }
      } catch (e) {
        console.error("Ошибка Google Search Console:", e);
      }
    }
  }

  return {
    period: "Прошедшая неделя",
    yandex: {
      visits: yandexVisits,
      time: timeFormatted,
      pages: topPagesList.length > 0 ? topPagesList.join("\n• ") : "Нет данных",
      searchQueries: topQueries
    },
    google: {
      clicks: googleClicks,
      impressions: googleImpressions
    }
  };
}

// Отправка отчета в Telegram и сохранение динамики
async function sendReport() {
  const metrics = await collectMetrics();

  // Загружаем данные прошлого отчета для сравнения (если файл существует)
  let prevMetrics = null;
  try {
    if (fs.existsSync('previous_metrics.json')) {
      prevMetrics = JSON.parse(fs.readFileSync('previous_metrics.json', 'utf8'));
    }
  } catch (e) {
    console.error("Не удалось прочитать предыдущие метрики:", e);
  }

  const visitsDiff = prevMetrics ? calculateDiff(metrics.yandex.visits, prevMetrics.yandex.visits) : "";
  const clicksDiff = prevMetrics ? calculateDiff(metrics.google.clicks, prevMetrics.google.clicks) : "";

  const message = `
📊 *Еженедельный отчет по проекту Coucou Events*
📅 Период: ${metrics.period}

🔵 *Яндекс.Метрика:*
• Визиты за неделю: *${metrics.yandex.visits}*${visitsDiff}
• Среднее время: *${metrics.yandex.time}*
• Популярные страницы:
• ${metrics.yandex.pages}
• Поисковые запросы: ${metrics.yandex.searchQueries}

🟢 *Google Search Console:*
• Клики из поиска: *${metrics.google.clicks}*${clicksDiff}
• Показы в поиске: *${metrics.google.impressions}*

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
      console.log("✅ Сводный отчет успешно отправлен в Telegram!");
      
      // Сохраняем текущие результаты в файл для следующей недели
      fs.writeFileSync('previous_metrics.json', JSON.stringify(metrics, null, 2));
    } else {
      console.error("❌ Ошибка от Telegram API:", data);
    }
  } catch (error) {
    console.error("❌ Ошибка сети:", error);
  }
}

sendReport();