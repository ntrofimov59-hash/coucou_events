// Единая точка правды для названия сайта, контактов и городов присутствия.
export const SITE_NAME = "Coucou";

// ⚠️ ПЕРЕД ДЕПЛОЕМ:
// 1. SITE_URL — реальный домен БЕЗ слэша в конце
// 2. CONTACT — телефон, WhatsApp, Telegram, email, Instagram
// 3. ANALYTICS — ga4Id и metrikaId
export const SITE_URL = "https://coucou-events.com";

export const SITE_DESCRIPTION =
  "Организация свадеб, корпоративов и частных мероприятий под ключ: аренда шатров, кейтеринг, декор, фото и трансфер. Coucou — 15 городов мира, база в Ереване.";

export const CITIES = [
  "Ереван",
  "Барселона",
  "Бали",
  "Пхукет",
  "Нячанг",
  "Дананг",
  "Прага",
  "Марракеш",
  "Касабланка",
  "Анталья",
  "Белград",
  "Будапешт",
  "Тбилиси",
  "Гоа",
  "Шри-Ланка",
] as const;

/**
 * Instagram по городам (slug → URL).
 * Кнопка на странице локации — только если URL не пустой.
 */
export const CITY_INSTAGRAM: Record<string, string> = {
  yerevan: "https://instagram.com/events.erevan",
  bali: "https://instagram.com/events.bali_coucou",
  tbilisi: "https://instagram.com/events.tbilisi_coucou",
  phuket: "https://instagram.com/events.phuket_coucou",
  barcelona: "https://instagram.com/events.barcelona",
  prague: "https://instagram.com/events.prague_coucou",
  marrakech: "https://instagram.com/events.marrakech",
  casablanca: "https://instagram.com/events.casablanca_coucou",
  danang: "https://instagram.com/events.danang_coucou",
  nhatrang: "https://instagram.com/events.nanchang",
  antalya: "",
  belgrade: "",
  budapest: "",
  goa: "",
  srilanka: "",
};

export const CONTACT = {
  phone: "+374 55 385943",
  phoneHref: "tel:+37455385943",
  whatsapp: "37455385943",
  whatsappHref: "https://wa.me/37455385943",
  telegram: "https://t.me/coucou_events",
  email: "info@coucou-events.com",
  emailHref: "mailto:info@coucou-events.com",
  workingHours: "Ежедневно, 9:00–21:00",
  // Глобальный IG не используем — см. CITY_INSTAGRAM
  instagram: "",
  facebook: "https://www.facebook.com/profile.php?id=61594503876222",
  address: "24 Vagharsh Vagharshyan St, Yerevan 0012",
  addressLocal: {
    ru: "ул. Вагарша Вагаршяна 24, Ереван 0012, Армения",
    eng: "24 Vagharsh Vagharshyan St, Yerevan 0012, Armenia",
    esp: "Calle Vagharsh Vagharshyan 24, Ereván 0012, Armenia",
    arm: "Վաղարշ Վաղարշյան 24, Երևան 0012, Հայաստան",
  },
};

/** Поддерживаемые языки сайта */
export const SUPPORTED_LANGS = ["ru", "eng", "esp", "arm"] as const;
export type SiteLang = (typeof SUPPORTED_LANGS)[number];

/** Дефолтный язык (x-default и редирект с /) */
export const DEFAULT_LANG: SiteLang = "ru";

/** Маппинг внутренних кодов → стандартные hreflang (BCP 47) */
export const HREFLANG_MAP: Record<SiteLang, string> = {
  ru: "ru",
  eng: "en",
  esp: "es",
  arm: "hy",
};

/** Статические пути страниц (без языкового префикса) */
export const STATIC_PATHS = [
  "",
  "about",
  "contacts",
  "services",
  "booking",
  "configurator",
  "all-services",
  "cities",
  "privacy",
  "terms",
] as const;

/** ID аналитики — после регистрации в GA4 / Метрике */
export const ANALYTICS = {
  ga4Id: "G-T1B2J8TT6R",
  metrikaId: "111282708",
};
