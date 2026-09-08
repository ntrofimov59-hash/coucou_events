export interface CityPage {
  id: string;
  slug: string;
  name: Record<string, string>;
  country: Record<string, string>;
  seoTitle: Record<string, string>;
  seoDescription: Record<string, string>;
  heading: Record<string, string>;
  lead: Record<string, string>;
  highlights: Record<string, string[]>;
  eventTypes: Record<string, string[]>;
  image?: string;
}

/** Фото городов — локальные файлы из public/images/cities/ */
const IMG = {
  yerevan: "/images/cities/yerevan.jpg",
  bali: "/images/cities/bali.jpg",
  barcelona: "/images/cities/barcelona.jpg",
  phuket: "/images/cities/phuket.jpg",
  tbilisi: "/images/cities/tbilisi.jpg",
  nhatrang: "/images/cities/nhatrang.jpg",
  danang: "/images/cities/danang.jpg",
  prague: "/images/cities/prague.jpg",
  marrakech: "/images/cities/marrakech.jpg",
  casablanca: "/images/cities/casablanca.jpg",
  antalya: "/images/cities/antalya.jpg",
  belgrade: "/images/cities/belgrade.jpg",
  budapest: "/images/cities/budapest.jpg",
  goa: "/images/cities/goa.jpg",
  srilanka: "/images/cities/srilanka.jpg",
};

function city(
  id: string,
  slug: string,
  names: Record<string, string>,
  countries: Record<string, string>,
  image: string,
  focusRu: string,
): CityPage {
  return {
    id,
    slug,
    name: names,
    country: countries,
    image,
    seoTitle: {
      ru: `Организация мероприятий в ${names.ru} под ключ | Coucou`,
      eng: `Event planning in ${names.eng} turnkey | Coucou`,
      esp: `Organización de eventos en ${names.esp} | Coucou`,
      arm: `Միջոցառումների կազմակերպում՝ ${names.arm} | Coucou`,
    },
    seoDescription: {
      ru: `Coucou организует свадьбы, корпоративы и частные праздники в ${names.ru}. Шатры, кейтеринг, декор и полное сопровождение.`,
      eng: `Coucou organizes weddings, corporates and private parties in ${names.eng}. Tents, catering, decor and full production.`,
      esp: `Coucou organiza bodas, corporativos y fiestas privadas en ${names.esp}.`,
      arm: `Coucou-ն կազմակերպում է միջոցառումներ ${names.arm} քաղաքում։`,
    },
    heading: {
      ru: `Мероприятия в ${names.ru}`,
      eng: `Events in ${names.eng}`,
      esp: `Eventos en ${names.esp}`,
      arm: `Միջոցառումներ՝ ${names.arm}`,
    },
    lead: {
      ru: focusRu,
      eng: `Premium events in ${names.eng} with local production and international standards.`,
      esp: `Eventos premium en ${names.esp} con producción local y estándares internacionales.`,
      arm: `Պրեմիում միջոցառումներ ${names.arm}՝ տեղական թիմով և միջազգային ստանդարտներով։`,
    },
    highlights: {
      ru: [
        "Локальная команда и проверенные площадки",
        "Шатры, кейтеринг, декор и техническое оснащение",
        "Координация дня события и работа с подрядчиками",
        "Смета и тайминг до старта проекта",
      ],
      eng: [
        "Local team and vetted venues",
        "Tents, catering, decor and technical production",
        "Day-of coordination and vendor management",
        "Budget and timeline before kickoff",
      ],
      esp: [
        "Equipo local y venues verificados",
        "Carpas, catering, decoración y técnica",
        "Coordinación del día y proveedores",
        "Presupuesto y timeline claros",
      ],
      arm: [
        "Տեղական թիմ և ստուգված հարթակներ",
        "Վրաններ, քեյթերինգ, դեկոր և տեխնիկա",
        "Օրվա համակարգում և կապալառուներ",
        "Նախահաշիվ և ժամանակացույց",
      ],
    },
    eventTypes: {
      ru: ["Свадьбы", "Корпоративы", "Частные праздники", "Тимбилдинг"],
      eng: ["Weddings", "Corporates", "Private parties", "Team building"],
      esp: ["Bodas", "Corporativos", "Fiestas privadas", "Team building"],
      arm: ["Հարսանիքներ", "Կորպորատիվներ", "Մասնավոր տոներ", "Թիմբիլդինգ"],
    },
  };
}

export const CITIES_PAGES: CityPage[] = [
  city(
    "yerevan",
    "yerevan",
    { ru: "Ереван", eng: "Yerevan", esp: "Ereván", arm: "Երևան" },
    { ru: "Армения", eng: "Armenia", esp: "Armenia", arm: "Հայաստան" },
    IMG.yerevan,
    "Столица с сильной гастрономией и камерными площадками — идеальна для свадеб и закрытых ужинов.",
  ),
  city(
    "barcelona",
    "barcelona",
    { ru: "Барселона", eng: "Barcelona", esp: "Barcelona", arm: "Բարսելոնա" },
    { ru: "Испания", eng: "Spain", esp: "España", arm: "Իսպանիա" },
    IMG.barcelona,
    "Европейский хаб для корпоративов и масштабных конференций с сильной инфраструктурой.",
  ),
  city(
    "bali",
    "bali",
    { ru: "Бали", eng: "Bali", esp: "Bali", arm: "Բալի" },
    { ru: "Индонезия", eng: "Indonesia", esp: "Indonesia", arm: "Ինդոնեզիա" },
    IMG.bali,
    "Destination-свадьбы и multi-day праздники на виллах у океана.",
  ),
  city(
    "phuket",
    "phuket",
    { ru: "Пхукет", eng: "Phuket", esp: "Phuket", arm: "Փհուքեթ" },
    { ru: "Таиланд", eng: "Thailand", esp: "Tailandia", arm: "Թաիլանդ" },
    IMG.phuket,
    "Пляжные юбилеи и частные вечеринки с закатами и открытым небом.",
  ),
  city(
    "tbilisi",
    "tbilisi",
    { ru: "Тбилиси", eng: "Tbilisi", esp: "Tiflis", arm: "Թբիլիսի" },
    { ru: "Грузия", eng: "Georgia", esp: "Georgia", arm: "Վրաստան" },
    IMG.tbilisi,
    "Камерные гастро-ужины и атмосферные площадки в историческом центре.",
  ),
  city(
    "nhatrang",
    "nhatrang",
    { ru: "Нячанг", eng: "Nha Trang", esp: "Nha Trang", arm: "Նյաչանգ" },
    { ru: "Вьетнам", eng: "Vietnam", esp: "Vietnam", arm: "Վիետնամ" },
    IMG.nhatrang,
    "Прибрежные праздники и корпоративы у моря с тёплой погодой почти круглый год.",
  ),
  city(
    "danang",
    "danang",
    { ru: "Дананг", eng: "Da Nang", esp: "Da Nang", arm: "Դանանգ" },
    { ru: "Вьетнам", eng: "Vietnam", esp: "Vietnam", arm: "Վիետնամ" },
    IMG.danang,
    "Современный курортный город для семейных торжеств и team-building у побережья.",
  ),
  city(
    "prague",
    "prague",
    { ru: "Прага", eng: "Prague", esp: "Praga", arm: "Պրահա" },
    { ru: "Чехия", eng: "Czechia", esp: "Chequia", arm: "Չեխիա" },
    IMG.prague,
    "Исторические залы и европейский стиль для свадеб и деловых приёмов.",
  ),
  city(
    "marrakech",
    "marrakech",
    { ru: "Марракеш", eng: "Marrakech", esp: "Marrakech", arm: "Մարաքեշ" },
    { ru: "Марокко", eng: "Morocco", esp: "Marruecos", arm: "Մարոկկո" },
    IMG.marrakech,
    "Яркие destination-события с локальным колоритом, риадами и открытыми дворами.",
  ),
  city(
    "casablanca",
    "casablanca",
    {
      ru: "Касабланка",
      eng: "Casablanca",
      esp: "Casablanca",
      arm: "Կասաբլանկա",
    },
    { ru: "Марокко", eng: "Morocco", esp: "Marruecos", arm: "Մարոկկո" },
    IMG.casablanca,
    "Деловые форматы и крупные приёмы в современном африканско-европейском хабе.",
  ),
  city(
    "antalya",
    "antalya",
    { ru: "Анталья", eng: "Antalya", esp: "Antalya", arm: "Անթալիա" },
    { ru: "Турция", eng: "Turkey", esp: "Turquía", arm: "Թուրքիա" },
    IMG.antalya,
    "Курортные свадьбы и корпоративы all-inclusive с морем и удобной логистикой.",
  ),
  city(
    "belgrade",
    "belgrade",
    { ru: "Белград", eng: "Belgrade", esp: "Belgrado", arm: "Բելգրադ" },
    { ru: "Сербия", eng: "Serbia", esp: "Serbia", arm: "Սերբիա" },
    IMG.belgrade,
    "Доступный европейский город для камерных свадеб и живых вечеринок.",
  ),
  city(
    "budapest",
    "budapest",
    { ru: "Будапешт", eng: "Budapest", esp: "Budapest", arm: "Բուդապեշտ" },
    { ru: "Венгрия", eng: "Hungary", esp: "Hungría", arm: "Հունգարիա" },
    IMG.budapest,
    "Архитектура, набережные и дворцы — сильный фон для торжеств и гала-ужинов.",
  ),
  city(
    "goa",
    "goa",
    { ru: "Гоа", eng: "Goa", esp: "Goa", arm: "Գոա" },
    { ru: "Индия", eng: "India", esp: "India", arm: "Հնդկաստան" },
    IMG.goa,
    "Пляжные фестивали, йога-ретриты и расслабленные частные праздники у океана.",
  ),
  city(
    "srilanka",
    "srilanka",
    {
      ru: "Шри-Ланка",
      eng: "Sri Lanka",
      esp: "Sri Lanka",
      arm: "Շրի Լանկա",
    },
    {
      ru: "Шри-Ланка",
      eng: "Sri Lanka",
      esp: "Sri Lanka",
      arm: "Շրի Լանկա",
    },
    IMG.srilanka,
    "Тропические destination-свадьбы между океаном, чайными плантациями и виллами.",
  ),
];

export function getCityBySlug(slug: string): CityPage | undefined {
  return CITIES_PAGES.find((c) => c.slug === slug || c.id === slug);
}
