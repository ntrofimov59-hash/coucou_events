/**
 * Русские падежные формы названий городов.
 *
 * Нужно, потому что вся генерация заголовков собирает фразы вида
 * «Аренда шатров в <город>» — с именительным падежом получается
 * «в Барселона», что убивает и читаемость, и релевантность запросу
 * («аренда шатров в барселоне» — именно так ищут люди).
 *
 * prep — предложный падеж, после «в»/«на»
 * prepPrefix — предлог: у островов и части стран это «на», а не «в»
 */

interface CityGrammar {
  /** «в Барселоне» → prep = "Барселоне" */
  prep: string;
  /** предлог перед prep */
  prepPrefix: "в" | "на";
}

export const CITY_GRAMMAR_RU: Record<string, CityGrammar> = {
  yerevan: { prep: "Ереване", prepPrefix: "в" },
  bali: { prep: "Бали", prepPrefix: "на" },
  tbilisi: { prep: "Тбилиси", prepPrefix: "в" },
  phuket: { prep: "Пхукете", prepPrefix: "на" },
  barcelona: { prep: "Барселоне", prepPrefix: "в" },
  prague: { prep: "Праге", prepPrefix: "в" },
  antalya: { prep: "Анталье", prepPrefix: "в" },
  goa: { prep: "Гоа", prepPrefix: "на" },
  budapest: { prep: "Будапеште", prepPrefix: "в" },
  belgrade: { prep: "Белграде", prepPrefix: "в" },
  marrakech: { prep: "Марракеше", prepPrefix: "в" },
  casablanca: { prep: "Касабланке", prepPrefix: "в" },
  nhatrang: { prep: "Нячанге", prepPrefix: "в" },
  danang: { prep: "Дананге", prepPrefix: "в" },
  srilanka: { prep: "Шри-Ланке", prepPrefix: "на" },
};

/**
 * «в Барселоне» / «на Бали». Fallback — именительный падеж с «в»,
 * чтобы новый город в cities.ts не ломал сборку, а лишь выглядел
 * чуть хуже до того, как его добавят сюда.
 */
export function cityIn(slug: string, nominative: string): string {
  const g = CITY_GRAMMAR_RU[slug];
  if (!g) return `в ${nominative}`;
  return `${g.prepPrefix} ${g.prep}`;
}

/** Только форма без предлога: «Барселоне» */
export function cityPrep(slug: string, nominative: string): string {
  return CITY_GRAMMAR_RU[slug]?.prep || nominative;
}
