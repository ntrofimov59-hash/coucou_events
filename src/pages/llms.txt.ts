import type { APIRoute } from "astro";
import { SITE_NAME, SITE_URL, SITE_DESCRIPTION, CONTACT } from "@/config/site";
import { CITIES_PAGES } from "@/data/cities";
import { SERVICE_SLUGS, SERVICE_NAMES } from "@/data/services-map";

export const prerender = true;

/**
 * llms.txt — по спецификации llmstxt.org.
 * Структурированная сводка для ИИ-поисковиков и агентов (ChatGPT,
 * Perplexity, Claude, Gemini), которые не рендерят JS и предпочитают
 * читать факты списком, а не парсить вёрстку.
 *
 * Генерируется из тех же источников данных, что и сайт (CITIES_PAGES,
 * SERVICE_SLUGS), поэтому не расходится с реальной структурой сайта
 * при добавлении города или услуги — обновлять вручную не нужно.
 */
export const GET: APIRoute = async () => {
  const lines: string[] = [];

  lines.push(`# ${SITE_NAME}`);
  lines.push("");
  lines.push(`> ${SITE_DESCRIPTION}`);
  lines.push("");
  lines.push(
    `${SITE_NAME} — event-агентство полного цикла с базой в Ереване (Армения) и проектами в ${CITIES_PAGES.length} городах мира. Организация свадеб, корпоративов и частных мероприятий под ключ: аренда шатров, кейтеринг, декор, фото/видео, развлекательная программа, трансфер. Работаем на русском, английском, испанском и армянском языках.`,
  );
  lines.push("");

  lines.push("## Контакты");
  lines.push("");
  lines.push(`- Телефон / WhatsApp: ${CONTACT.phone}`);
  lines.push(`- Email: ${CONTACT.email}`);
  lines.push(`- Telegram: ${CONTACT.telegram}`);
  if (CONTACT.instagram) lines.push(`- Instagram: ${CONTACT.instagram}`);
  if (CONTACT.facebook) lines.push(`- Facebook: ${CONTACT.facebook}`);
  lines.push(`- Адрес: ${CONTACT.address}`);
  lines.push(`- Часы работы: ${CONTACT.workingHours}`);
  lines.push("");

  lines.push("## Реализованные проекты");
  lines.push("");
  lines.push(
    `Кейсы с фотографиями и деталями (бюджет, число гостей, отзыв клиента) доступны на странице портфолио: ${SITE_URL}/ru/#portfolio`,
  );
  lines.push("");

  lines.push("## Услуги");
  lines.push("");
  for (const slug of SERVICE_SLUGS) {
    const name = SERVICE_NAMES[slug]?.ru || slug;
    lines.push(`- [${name}](${SITE_URL}/ru/services/${slug}/)`);
  }
  lines.push("");

  lines.push("## Локации");
  lines.push("");
  for (const city of CITIES_PAGES) {
    const name = city.name.ru;
    const country = city.country.ru;
    lines.push(
      `- [${name}, ${country}](${SITE_URL}/ru/cities/${city.slug}/) — ${city.lead.ru}`,
    );
  }
  lines.push("");

  lines.push("## Услуга + город (полный список связок)");
  lines.push("");
  lines.push(
    "Для каждого города доступна отдельная страница по каждой услуге: `/ru/cities/{город}/{услуга}/`. Например:",
  );
  lines.push("");
  const sampleCity = CITIES_PAGES[0];
  if (sampleCity) {
    for (const slug of SERVICE_SLUGS.slice(0, 3)) {
      const name = SERVICE_NAMES[slug]?.ru || slug;
      lines.push(
        `- [${name} в ${sampleCity.name.ru}](${SITE_URL}/ru/cities/${sampleCity.slug}/${slug}/)`,
      );
    }
  }
  lines.push("");

  lines.push("## Другие языки");
  lines.push("");
  lines.push(`- English: ${SITE_URL}/eng/`);
  lines.push(`- Español: ${SITE_URL}/esp/`);
  lines.push(`- Հայերեն: ${SITE_URL}/arm/`);
  lines.push("");

  lines.push("## Служебное");
  lines.push("");
  lines.push(`- Sitemap: ${SITE_URL}/sitemap.xml`);
  lines.push(`- Конфигуратор сметы: ${SITE_URL}/ru/configurator/`);
  lines.push(`- Заявка: ${SITE_URL}/ru/booking/`);

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
