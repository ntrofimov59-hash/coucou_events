// src/lib/i18n.ts
import {
  DEFAULT_LANG as SITE_DEFAULT_LANG,
  SUPPORTED_LANGS as SITE_SUPPORTED_LANGS,
  type SiteLang,
} from "@/config/site";

export type Lang = SiteLang;

export const DEFAULT_LANG: Lang = SITE_DEFAULT_LANG;
export const SUPPORTED_LANGS: Lang[] = [...SITE_SUPPORTED_LANGS];

/**
 * Универсальная функция определения текущего языка интерфейса
 */
export function getLangFromAstro(astro: {
  params?: Record<string, string | undefined>;
  props?: Record<string, any>;
  url: URL;
}): Lang {
  // 1. Пропсы компонента
  let lang = astro.props?.lang as string | undefined;

  // 2. Параметры динамического маршрута ([lang] или [locale])
  if (!lang && astro.params) {
    lang = astro.params.lang || astro.params.locale;
  }

  // 3. Первый сегмент URL (/ru/..., /eng/...)
  if (!lang && astro.url) {
    const segments = astro.url.pathname.split("/").filter(Boolean);
    const firstSegment = segments[0];
    if (firstSegment && SUPPORTED_LANGS.includes(firstSegment as Lang)) {
      lang = firstSegment;
    }
  }

  // 4. Валидный язык или дефолт из site.ts
  if (lang && SUPPORTED_LANGS.includes(lang as Lang)) {
    return lang as Lang;
  }

  return DEFAULT_LANG;
}