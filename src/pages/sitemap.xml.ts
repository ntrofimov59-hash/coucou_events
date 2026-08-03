import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import {
  SITE_URL,
  SUPPORTED_LANGS,
  STATIC_PATHS,
  HREFLANG_MAP,
  type SiteLang,
} from "@/config/site";
import { CITIES_PAGES } from "@/data/cities";

export const prerender = true;

function buildUrl(lang: SiteLang, path: string): string {
  const clean = path.replace(/^\/+|\/+$/g, "");
  return clean ? `${SITE_URL}/${lang}/${clean}` : `${SITE_URL}/${lang}`;
}

export const GET: APIRoute = async () => {
  const services = await getCollection(
    "services",
    ({ data }) => data.published !== false,
  );

  // id вида "ru/marquees" → slug "marquees"
  const serviceSlugs = [
    ...new Set(
      services.map((entry) => {
        const parts = entry.id.split("/");
        return parts.length > 1 ? parts.slice(1).join("/") : entry.id;
      }),
    ),
  ];

  const urls: {
    loc: string;
    alternates: { hreflang: string; href: string }[];
  }[] = [];

  // 1. Статические страницы × языки
  for (const path of STATIC_PATHS) {
    const alternates = SUPPORTED_LANGS.map((lang) => ({
      hreflang: HREFLANG_MAP[lang],
      href: buildUrl(lang, path),
    }));

    alternates.push({
      hreflang: "x-default",
      href: buildUrl("ru", path),
    });

    for (const lang of SUPPORTED_LANGS) {
      urls.push({
        loc: buildUrl(lang, path),
        alternates,
      });
    }
  }

  // 2. Страницы услуг × языки
  for (const slug of serviceSlugs) {
    const alternates = SUPPORTED_LANGS.map((lang) => ({
      hreflang: HREFLANG_MAP[lang],
      href: buildUrl(lang, `services/${slug}`),
    }));

    alternates.push({
      hreflang: "x-default",
      href: buildUrl("ru", `services/${slug}`),
    });

    for (const lang of SUPPORTED_LANGS) {
      urls.push({
        loc: buildUrl(lang, `services/${slug}`),
        alternates,
      });
    }
  }

  // 3. Индекс городов × языки
  {
    const alternates = SUPPORTED_LANGS.map((lang) => ({
      hreflang: HREFLANG_MAP[lang],
      href: buildUrl(lang, "cities"),
    }));

    alternates.push({
      hreflang: "x-default",
      href: buildUrl("ru", "cities"),
    });

    for (const lang of SUPPORTED_LANGS) {
      urls.push({
        loc: buildUrl(lang, "cities"),
        alternates,
      });
    }
  }

  // 4. Страницы городов × языки
  for (const city of CITIES_PAGES) {
    const alternates = SUPPORTED_LANGS.map((lang) => ({
      hreflang: HREFLANG_MAP[lang],
      href: buildUrl(lang, `cities/${city.slug}`),
    }));

    alternates.push({
      hreflang: "x-default",
      href: buildUrl("ru", `cities/${city.slug}`),
    });

    for (const lang of SUPPORTED_LANGS) {
      urls.push({
        loc: buildUrl(lang, `cities/${city.slug}`),
        alternates,
      });
    }
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
>
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
${u.alternates
  .map(
    (a) =>
      `    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${a.href}" />`,
  )
  .join("\n")}
  </url>`,
  )
  .join("\n")}
</urlset>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};