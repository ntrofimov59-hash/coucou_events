// src/data/pricingData.ts

export interface CityPricing {
  id: string;
  name: Record<string, string>;
  flag?: string;
  /** Относительно Еревана */
  multiplier: number;
}

/** Запас прибыли поверх себестоимости (1.4 = +40%) */
export const MARGIN = 1.4;

/** Опции калькулятора (USD, уже с запасом) */
export const CALC_OPTIONS = {
  catering: { id: "catering", priceUsd: 800 },
  tent: { id: "tent", priceUsd: 600 },
  sound: { id: "sound", priceUsd: 500 },
  toilets: { id: "toilets", priceUsd: 200 },
} as const;

/**
 * Базовые «от» в USD для Еревана (публичная цена).
 * costFloorUsd — ориентир себестоимости до маржи (только для вас).
 */
export const SERVICES_PRICING: Record<
  string,
  {
    baseUsd: number;
    unit: "day" | "guest" | "project" | "module" | "trip";
    costFloorUsd: number;
  }
> = {
  marquees: { baseUsd: 450, unit: "day", costFloorUsd: 280 },
  catering: { baseUsd: 55, unit: "guest", costFloorUsd: 35 },
  ceremony: { baseUsd: 3500, unit: "project", costFloorUsd: 2200 },
  turnkey: { baseUsd: 5000, unit: "project", costFloorUsd: 3200 },
  decor: { baseUsd: 800, unit: "project", costFloorUsd: 500 },
  entertainment: { baseUsd: 600, unit: "day", costFloorUsd: 380 },
  "photo-video": { baseUsd: 700, unit: "day", costFloorUsd: 450 },
  transfer: { baseUsd: 120, unit: "trip", costFloorUsd: 75 },
  biotoilets: { baseUsd: 80, unit: "module", costFloorUsd: 45 },
};

export const CITIES_DATA: CityPricing[] = [
  {
    id: "yerevan",
    name: { ru: "Ереван", eng: "Yerevan", esp: "Ereván", arm: "Երևան" },
    multiplier: 1.0,
  },
  {
    id: "tbilisi",
    name: { ru: "Тбилиси", eng: "Tbilisi", esp: "Tiflis", arm: "Թբիլիսի" },
    multiplier: 0.92,
  },
  {
    id: "belgrade",
    name: { ru: "Белград", eng: "Belgrade", esp: "Belgrado", arm: "Բելգրադ" },
    multiplier: 1.0,
  },
  {
    id: "nhatrang",
    name: { ru: "Нячанг", eng: "Nha Trang", esp: "Nha Trang", arm: "Նյաչանգ" },
    multiplier: 1.08,
  },
  {
    id: "danang",
    name: { ru: "Дананг", eng: "Da Nang", esp: "Da Nang", arm: "Դանանգ" },
    multiplier: 1.08,
  },
  {
    id: "goa",
    name: { ru: "Гоа", eng: "Goa", esp: "Goa", arm: "Գոա" },
    multiplier: 1.08,
  },
  {
    id: "antalya",
    name: { ru: "Анталья", eng: "Antalya", esp: "Antalya", arm: "Անթալիա" },
    multiplier: 1.12,
  },
  {
    id: "srilanka",
    name: {
      ru: "Шри-Ланка",
      eng: "Sri Lanka",
      esp: "Sri Lanka",
      arm: "Շրի Լանկա",
    },
    multiplier: 1.15,
  },
  {
    id: "bali",
    name: { ru: "Бали", eng: "Bali", esp: "Bali", arm: "Բալի" },
    multiplier: 1.18,
  },
  {
    id: "phuket",
    name: { ru: "Пхукет", eng: "Phuket", esp: "Phuket", arm: "Փհուքեթ" },
    multiplier: 1.18,
  },
  {
    id: "budapest",
    name: { ru: "Будапешт", eng: "Budapest", esp: "Budapest", arm: "Բուդապեշտ" },
    multiplier: 1.2,
  },
  {
    id: "casablanca",
    name: {
      ru: "Касабланка",
      eng: "Casablanca",
      esp: "Casablanca",
      arm: "Կասաբլանկա",
    },
    multiplier: 1.28,
  },
  {
    id: "prague",
    name: { ru: "Прага", eng: "Prague", esp: "Praga", arm: "Պրահա" },
    multiplier: 1.3,
  },
  {
    id: "marrakech",
    name: {
      ru: "Марракеш",
      eng: "Marrakech",
      esp: "Marrakech",
      arm: "Մարաքեշ",
    },
    multiplier: 1.32,
  },
  {
    id: "barcelona",
    name: {
      ru: "Барселона",
      eng: "Barcelona",
      esp: "Barcelona",
      arm: "Բարսելոնա",
    },
    multiplier: 1.45,
  },
];

/** Число «от» в USD */
export function priceFromUsd(
  serviceId: string,
  cityId = "yerevan",
): number {
  const svc = SERVICES_PRICING[serviceId];
  if (!svc) return 0;
  const city =
    CITIES_DATA.find((c) => c.id === cityId)?.multiplier ?? 1;
  const raw = svc.baseUsd * city;
  const step = raw < 100 ? 5 : 50;
  return Math.ceil(raw / step) * step;
}

export function unitLabel(
  unit: (typeof SERVICES_PRICING)[string]["unit"],
  lang: string,
): string {
  const map: Record<string, Record<string, string>> = {
    day: {
      ru: "/ сутки",
      eng: "/ day",
      esp: "/ día",
      arm: "/ օր",
    },
    guest: {
      ru: "/ гость",
      eng: "/ guest",
      esp: "/ invitado",
      arm: "/ հյուր",
    },
    project: {
      ru: "/ проект",
      eng: "/ project",
      esp: "/ proyecto",
      arm: "/ նախագիծ",
    },
    module: {
      ru: "/ модуль·сутки",
      eng: "/ unit·day",
      esp: "/ módulo·día",
      arm: "/ մոդուլ·օր",
    },
    trip: {
      ru: "/ рейс",
      eng: "/ trip",
      esp: "/ trayecto",
      arm: "/ ուղևորություն",
    },
  };
  return map[unit]?.[lang] || map[unit]?.eng || "";
}

/** Текст для карточки / hero: "от $450 / сутки" */
export function formatPriceFrom(
  serviceId: string,
  lang: string,
  cityId = "yerevan",
): string {
  const svc = SERVICES_PRICING[serviceId];
  if (!svc) {
    if (lang === "eng") return "Custom quote";
    if (lang === "esp") return "Presupuesto a medida";
    if (lang === "arm") return "Անհատական";
    return "Индивидуально";
  }
  const amount = priceFromUsd(serviceId, cityId);
  const prefix =
    lang === "eng"
      ? "from"
      : lang === "esp"
        ? "desde"
        : lang === "arm"
          ? "սկսած"
          : "от";
  return `${prefix} $${amount.toLocaleString("en-US")} ${unitLabel(svc.unit, lang)}`;
}

/**
 * Смета калькулятора (USD):
 * база услуги + влияние гостей + опции × город
 */
export function estimateEventUsd(params: {
  serviceId?: string;
  guests: number;
  cityId: string;
  optionIds: string[];
}): number {
  const city =
    CITIES_DATA.find((c) => c.id === params.cityId)?.multiplier ?? 1;
  const svcId = params.serviceId || "turnkey";
  const svc = SERVICES_PRICING[svcId] || SERVICES_PRICING.turnkey;

  let total = svc.baseUsd;

  if (svc.unit === "guest") {
    total = svc.baseUsd * Math.max(params.guests, 20);
  } else {
    total += Math.max(params.guests, 30) * 12;
  }

  for (const id of params.optionIds) {
    const opt = Object.values(CALC_OPTIONS).find((o) => o.id === id);
    if (opt) total += opt.priceUsd;
  }

  total *= city;
  return Math.ceil(total / 50) * 50;
}