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
/** Уникальные SEO-тексты (переопределение шаблонов) */
function patchCity(
  slug: string,
  patch: {
    seoTitle?: Partial<Record<string, string>>;
    seoDescription?: Partial<Record<string, string>>;
    lead?: Partial<Record<string, string>>;
    highlights?: Partial<Record<string, string[]>>;
  },
) {
  const c = CITIES_PAGES.find((x) => x.slug === slug);
  if (!c) return;
  if (patch.seoTitle) c.seoTitle = { ...c.seoTitle, ...patch.seoTitle };
  if (patch.seoDescription)
    c.seoDescription = { ...c.seoDescription, ...patch.seoDescription };
  if (patch.lead) c.lead = { ...c.lead, ...patch.lead };
  if (patch.highlights)
    c.highlights = { ...c.highlights, ...patch.highlights };
}

patchCity("yerevan", {
  seoTitle: {
    ru: "Аренда шатров и организация мероприятий в Ереване | Coucou Events",
    eng: "Event planning & tent rental in Yerevan | Coucou Events",
    esp: "Organización de eventos y carpas en Ereván | Coucou Events",
    arm: "Վրանների վարձույթ և միջոցառումներ Երևանում | Coucou Events",
  },
  seoDescription: {
    ru: "Свадьбы, корпоративы и частные события в Ереване под ключ. Шатры от $450/сутки, кейтеринг, декор. Смета за 15 минут — заявка или WhatsApp.",
    eng: "Turnkey weddings, corporate and private events in Yerevan. Tents from $450/day, catering and decor. Free estimate via WhatsApp.",
    esp: "Bodas y eventos llave en mano en Ereván. Carpas desde $450/día, catering y decoración. Presupuesto por WhatsApp.",
    arm: "Հարսանիքներ և միջոցառումներ Երևանում ամբողջությամբ։ Վրաններ՝ սկսած $450/օր։ Գնահատում WhatsApp-ով։",
  },
  lead: {
    ru: "Ереван — домашняя база Coucou: быстрый выезд на площадку, проверенные подрядчики и прозрачная смета. Свадьбы, корпоративы и аренда шатров без скрытых доплат.",
    eng: "Yerevan is Coucou’s home base: fast on-site setup, vetted local vendors and clear budgets for weddings, corporate events and tent rentals.",
    esp: "Ereván es la base de Coucou: montaje rápido, proveedores locales y presupuestos claros para bodas y corporativos.",
    arm: "Երևանը Coucou-ի հիմնական բազան է՝ արագ մոնտաժ, ստուգված կապալառուներ և պարզ նախահաշիվ։",
  },
  highlights: {
    ru: [
      "Команда и склад логистики в Ереване",
      "Шатры с монтажом, полом и светом",
      "Кейтеринг и декор в одном договоре",
      "Фиксируем смету до старта работ",
    ],
    eng: [
      "Local team and logistics in Yerevan",
      "Tents with install, flooring and lighting",
      "Catering and decor under one contract",
      "Budget locked before production starts",
    ],
    esp: [
      "Equipo y logística en Ereván",
      "Carpas con montaje, suelo e iluminación",
      "Catering y decoración en un solo contrato",
      "Presupuesto cerrado antes del montaje",
    ],
    arm: [
      "Տեղական թիմ և լոգիստիկա Երևանում",
      "Վրաններ՝ մոնտաժ, հատակ և լույս",
      "Քեյթերինգ և դեկոր՝ մեկ պայմանագրով",
      "Նախահաշիվը ֆիքսվում է մինչև մեկնարկը",
    ],
  },
});

patchCity("bali", {
  seoTitle: {
    ru: "Свадьбы и мероприятия на Бали под ключ | Coucou Events",
    eng: "Destination weddings & events in Bali | Coucou Events",
    esp: "Bodas y eventos en Bali llave en mano | Coucou Events",
    arm: "Հարսանիքներ և միջոցառումներ Բալիում | Coucou Events",
  },
  seoDescription: {
    ru: "Destination-свадьбы, виллы у океана и multi-day праздники на Бали. Полный продакшн, шатры, кейтеринг, координация дня. Международные клиенты.",
    eng: "Villa and beach destination weddings in Bali. Full production, tents, catering and day-of coordination for international clients.",
    esp: "Bodas destination en villas y playas de Bali. Producción completa, carpas, catering y coordinación del día.",
    arm: "Destination հարսանիքներ Բալիում՝ վիլլաներ, լողափ, ամբողջական продакшн և համակարգում։",
  },
  lead: {
    ru: "Бали — формат destination: виллы, океан, несколько дней программы. Мы закрываем площадку, декор, кейтеринг и тайминг, чтобы гости не решали операционку.",
    eng: "Bali is built for destination stays: villas, ocean views and multi-day programs. We handle venue, decor, catering and timeline so guests only celebrate.",
    esp: "Bali es ideal para destination: villas, océano y programas de varios días. Nosotros cubrimos venue, decoración, catering y timing.",
    arm: "Բալին destination ձևաչափ է՝ վիլլաներ, օվկիանոս և մի քանի օր ծրագիր։ Մենք փակում ենք հարթակը, դեկորը և ժամանակացույցը։",
  },
  highlights: {
    ru: [
      "Виллы и beachfront-площадки под сезоны",
      "Учёт сезона дождей и логистики острова",
      "Декор, свет и шатры под open-air",
      "Координация для гостей из разных стран",
    ],
    eng: [
      "Villas and beachfront venues by season",
      "Rain-season planning and island logistics",
      "Open-air decor, lighting and tents",
      "Coordination for international guest lists",
    ],
    esp: [
      "Villas y beachfront según temporada",
      "Planificación en temporada de lluvias",
      "Decoración, luz y carpas open-air",
      "Coordinación para invitados internacionales",
    ],
    arm: [
      "Վիլլաներ և beachfront՝ ըստ սեզոնի",
      "Անձրևների սեզոն և կղզու լոգիստիկա",
      "Open-air դեկոր, լույս և վրաններ",
      "Համակարգում միջազգային հյուրերի համար",
    ],
  },
});

patchCity("phuket", {
  seoTitle: {
    ru: "Пляжные мероприятия и свадьбы на Пхукете | Coucou Events",
    eng: "Beach events & weddings in Phuket | Coucou Events",
    esp: "Eventos y bodas en la playa en Phuket | Coucou Events",
    arm: "Լողափնյա միջոցառումներ Փհուքեթում | Coucou Events",
  },
  seoDescription: {
    ru: "Юбилеи, свадьбы и частные вечеринки на Пхукете: beachfront, закаты, шатры и полный продакшн. Смета и тайминг под сезон.",
    eng: "Beachfront weddings, anniversaries and private parties in Phuket. Tents, production and sunset venues. Clear budget by season.",
    esp: "Bodas y fiestas beachfront en Phuket. Carpas, producción y venues al atardecer. Presupuesto según temporada.",
    arm: "Լողափնյա հարսանիքներ և երեկույթներ Փհուքեթում՝ վրաններ, продакшн և մայրամուտի հարթակներ։",
  },
  lead: {
    ru: "Пхукет — открытое небо, океан и вечерние форматы. Подбираем площадку под ветер и сезон, собираем свет, звук и зону гостей без хаоса в день события.",
    eng: "Phuket is open-sky, ocean and evening formats. We match the venue to wind and season, then lock lighting, sound and guest flow for the day-of.",
    esp: "Phuket es cielo abierto, océano y formatos de tarde. Elegimos venue según viento y temporada y cerramos luz, sonido y flujo de invitados.",
    arm: "Փհուքեթը բաց երկինք է և երեկոյան ձևաչափեր։ Հարթակը ընտրում ենք ըստ սեզոնի և հողմի։",
  },
  highlights: {
    ru: [
      "Beachfront и rooftop-площадки",
      "Шатры и защита от тропического дождя",
      "Свет и звук под open-air",
      "Координация трансферов и тайминга гостей",
    ],
    eng: [
      "Beachfront and rooftop venues",
      "Tents and tropical rain cover",
      "Open-air lighting and sound",
      "Guest transfer and timeline coordination",
    ],
    esp: [
      "Venues beachfront y rooftop",
      "Carpas y protección de lluvia tropical",
      "Luz y sonido open-air",
      "Transfers y timeline de invitados",
    ],
    arm: [
      "Beachfront և rooftop հարթակներ",
      "Վրաններ և պաշտպանություն անձրևից",
      "Open-air լույս և ձայն",
      "Տրանսֆեր և ժամանակացույց հյուրերի համար",
    ],
  },
});

patchCity("tbilisi", {
  seoTitle: {
    ru: "Организация мероприятий в Тбилиси | Coucou Events",
    eng: "Event planning in Tbilisi | Coucou Events",
    esp: "Organización de eventos en Tiflis | Coucou Events",
    arm: "Միջոցառումներ Թբիլիսիում | Coucou Events",
  },
  seoDescription: {
    ru: "Камерные ужины, свадьбы и корпоративы в Тбилиси. Исторический центр, гастрономия, шатры и полный продакшн. Расчёт за 15 минут.",
    eng: "Intimate dinners, weddings and corporates in Tbilisi. Old town venues, dining, tents and full production. Fast estimate via WhatsApp.",
    esp: "Cenas íntimas, bodas y corporativos en Tiflis. Casco histórico, gastronomía y producción completa.",
    arm: "Խնամված ընթրիքներ, հարսանիքներ և կորպորատիվներ Թբիլիսիում։ Պատմական կենտրոն և ամբողջական продакшն։",
  },
  lead: {
    ru: "Тбилиси — атмосфера старого города и сильная гастрономия. Делаем камерные форматы и корпоративы с локальными площадками и понятной сметой.",
    eng: "Tbilisi mixes old-town atmosphere with strong dining culture. We run intimate formats and corporates with local venues and a clear budget.",
    esp: "Tiflis combina casco antiguo y gastronomía. Formatos íntimos y corporativos con venues locales y presupuesto claro.",
    arm: "Թբիլիսին պատմական մթնոլորտ է և ուժեղ գաստրոնոմիա։ Կամերային և կորպորատիվ ձևաչափեր՝ պարզ նախահաշվով։",
  },
  highlights: {
    ru: [
      "Площадки в историческом центре и за городом",
      "Гастро-ужины и банкеты под ключ",
      "Декор под кирпич, дворы и террасы",
      "Координация с локальными подрядчиками",
    ],
    eng: [
      "Old-town and countryside venues",
      "Turnkey dining and banquet service",
      "Decor for courtyards, brick and terraces",
      "Local vendor coordination",
    ],
    esp: [
      "Venues en casco antiguo y afueras",
      "Cenas y banquetes llave en mano",
      "Decoración para patios y terrazas",
      "Coordinación con proveedores locales",
    ],
    arm: [
      "Հարթակներ կենտրոնում և քաղաքից դուրս",
      "Գաստրո ընթրիքներ և բանկետներ",
      "Դեկոր բակերի և տեռասների համար",
      "Տեղական կապալառուների համակարգում",
    ],
  },
});

patchCity("antalya", {
  seoTitle: {
    ru: "Свадьбы и корпоративы в Анталье | Coucou Events",
    eng: "Weddings & corporate events in Antalya | Coucou Events",
    esp: "Bodas y corporativos en Antalya | Coucou Events",
    arm: "Հարսանիքներ և կորպորատիվներ Անթալիայում | Coucou Events",
  },
  seoDescription: {
    ru: "Отельные и outdoor-мероприятия в Анталье. Свадьбы, team building, шатры у моря. Полное сопровождение и смета до старта.",
    eng: "Hotel and outdoor events in Antalya — weddings, team building, seaside tents. Full coordination and budget before kickoff.",
    esp: "Eventos en hotel y outdoor en Antalya. Bodas, team building y carpas junto al mar.",
    arm: "Հյուրանոցային և outdoor միջոցառումներ Անթալիայում՝ հարսանիքներ, team building, ծովափնյա վրաններ։",
  },
  lead: {
    ru: "Анталья удобна для смешанных групп: отели all-inclusive, море и короткий перелёт. Собираем программу так, чтобы логистика гостей была простой.",
    eng: "Antalya works for mixed guest lists: resort hotels, sea access and short flights. We design the program around simple guest logistics.",
    esp: "Antalya funciona para grupos mixtos: resorts, mar y vuelos cortos. Diseñamos el programa con logística sencilla.",
    arm: "Անթալիան հարմար է խառը խմբերի համար՝ հյուրանոցներ, ծով և կարճ չվերթներ։",
  },
  highlights: {
    ru: [
      "Отельные ballroom и garden-площадки",
      "Шатры и open-air у моря",
      "Team building и welcome-вечера",
      "Работа с отельными регламентами",
    ],
    eng: [
      "Hotel ballrooms and garden venues",
      "Seaside tents and open-air setups",
      "Team building and welcome nights",
      "Hotel policy-compliant production",
    ],
    esp: [
      "Salones de hotel y jardines",
      "Carpas y open-air junto al mar",
      "Team building y cenas de bienvenida",
      "Producción según normas del hotel",
    ],
    arm: [
      "Հյուրանոցային սրահներ և այգիներ",
      "Ծովափնյա վրաններ և open-air",
      "Team building և welcome երեկոներ",
      "Աշխատանք հյուրանոցի կանոններով",
    ],
  },
});

patchCity("goa", {
  seoTitle: {
    ru: "Мероприятия и свадьбы в Гоа | Coucou Events",
    eng: "Events & weddings in Goa | Coucou Events",
    esp: "Eventos y bodas en Goa | Coucou Events",
    arm: "Միջոցառումներ և հարսանիքներ Գոայում | Coucou Events",
  },
  seoDescription: {
    ru: "Пляжные свадьбы, вечеринки и корпоративы в Гоа. Шатры, декор, кейтеринг и координация. Работаем с сезоном и логистикой штата.",
    eng: "Beach weddings, parties and corporates in Goa. Tents, decor, catering and coordination around season and local logistics.",
    esp: "Bodas de playa, fiestas y corporativos en Goa. Carpas, decoración, catering y coordinación.",
    arm: "Լողափնյա հարսանիքներ և կորպորատիվներ Գոայում՝ վրաններ, դեկոր և համակարգում։",
  },
  lead: {
    ru: "Гоа — расслабленный beach-формат и длинный сезон. Закрываем площадку, разрешения где нужно, свет и зонирование, чтобы вечер звучал цельно.",
    eng: "Goa is relaxed beach energy and a long season. We secure the venue, permits where needed, lighting and zoning so the night feels complete.",
    esp: "Goa es formato playa relajado y temporada larga. Cubrimos venue, permisos, luz y zonificación.",
    arm: "Գոան հանգիստ beach ձևաչափ է և երկար սեզոն։ Փակում ենք հարթակը, լույսը և գոտիավորումը։",
  },
  highlights: {
    ru: [
      "North/South Goa под формат события",
      "Шатры и beach-setup",
      "Кейтеринг с учётом локальных правил",
      "Трансферы и тайминг для гостей из отелей",
    ],
    eng: [
      "North or South Goa by event type",
      "Tents and beach setups",
      "Catering within local regulations",
      "Hotel guest transfers and timing",
    ],
    esp: [
      "North o South Goa según el evento",
      "Carpas y montajes de playa",
      "Catering según normas locales",
      "Transfers desde hoteles",
    ],
    arm: [
      "North/South Goa՝ ըստ ձևաչափի",
      "Վրաններ և beach setup",
      "Քեյթերինգ՝ տեղական կանոններով",
      "Տրանսֆեր հյուրանոցներից",
    ],
  },
});

patchCity("barcelona", {
  seoTitle: {
    ru: "Корпоративы и мероприятия в Барселоне | Coucou Events",
    eng: "Corporate events & celebrations in Barcelona | Coucou Events",
    esp: "Eventos corporativos y celebraciones en Barcelona | Coucou Events",
    arm: "Կորպորատիվներ և միջոցառումներ Բարսելոնայում | Coucou Events",
  },
  seoDescription: {
    ru: "Конференции, team building и частные события в Барселоне. Площадки, технический продакшн, кейтеринг. Европейский уровень организации.",
    eng: "Conferences, team building and private events in Barcelona. Venues, technical production and catering with European delivery standards.",
    esp: "Conferencias, team building y eventos privados en Barcelona. Venues, producción técnica y catering.",
    arm: "Կոնֆերանսներ, team building և մասնավոր միջոցառումներ Բարսելոնայում՝ հարթակներ և տեխնիկական продакшն։",
  },
  lead: {
    ru: "Барселона — хаб для корпоративов и международных групп. Берём на себя площадку, AV, тайминг и подрядчиков, чтобы программа шла по минутам.",
    eng: "Barcelona is a hub for corporates and international groups. We own venue, AV, timing and vendors so the program runs to the minute.",
    esp: "Barcelona es hub corporativo. Nosotros cubrimos venue, AV, timing y proveedores.",
    arm: "Բարսելոնան կորպորատիվ հանգույց է։ Մենք փակում ենք հարթակը, AV-ն և ժամանակացույցը։",
  },
  highlights: {
    ru: [
      "Конференц-площадки и rooftop",
      "AV, синхронный перевод по запросу",
      "Кейтеринг и coffee-break логистика",
      "Координация для multi-day программ",
    ],
    eng: [
      "Conference venues and rooftops",
      "AV and interpreting on request",
      "Catering and coffee-break flow",
      "Multi-day program coordination",
    ],
    esp: [
      "Venues de congreso y rooftops",
      "AV e interpretación a demanda",
      "Catering y coffee breaks",
      "Coordinación multi-day",
    ],
    arm: [
      "Կոնֆերանսային հարթակներ և rooftop",
      "AV և թարգմանություն ըստ պահանջի",
      "Քեյթերինգ և coffee break",
      "Multi-day համակարգում",
    ],
  },
});

patchCity("prague", {
  seoTitle: {
    ru: "Организация мероприятий в Праге | Coucou Events",
    eng: "Event planning in Prague | Coucou Events",
    esp: "Organización de eventos en Praga | Coucou Events",
    arm: "Միջոցառումներ Պրահայում | Coucou Events",
  },
  seoDescription: {
    ru: "Свадьбы, корпоративы и камерные события в Праге. Исторические залы, рестораны, полный продакшн. Смета и тайминг до старта.",
    eng: "Weddings, corporates and intimate events in Prague. Historic halls, restaurants and full production with a clear pre-event budget.",
    esp: "Bodas, corporativos y eventos íntimos en Praga. Salones históricos, restaurantes y producción completa.",
    arm: "Հարսանիքներ և կորպորատիվներ Պրահայում՝ պատմական սրահներ և ամբողջական продакшն։",
  },
  lead: {
    ru: "Прага — архитектура и камерные залы в центре Европы. Помогаем с локациями, декором и протоколом, чтобы событие выглядело цельно на фото и вживую.",
    eng: "Prague is architecture and intimate halls in the heart of Europe. We handle venues, decor and flow so the event feels complete on camera and in person.",
    esp: "Praga es arquitectura y salones íntimos en el centro de Europa. Cubrimos venues, decoración y flujo del evento.",
    arm: "Պրահան ճարտարապետություն է և կամերային սրահներ Եվրոպայի կենտրոնում։",
  },
  highlights: {
    ru: [
      "Исторические залы и modern venues",
      "Свадебный и корпоративный этикет",
      "Декор под камень, залы и сады",
      "Логистика для гостей из разных стран",
    ],
    eng: [
      "Historic halls and modern venues",
      "Wedding and corporate etiquette",
      "Decor for stone, halls and gardens",
      "Guest logistics across borders",
    ],
    esp: [
      "Salones históricos y venues modernos",
      "Etiqueta de boda y corporativa",
      "Decoración para piedra, salones y jardines",
      "Logística de invitados internacionales",
    ],
    arm: [
      "Պատմական սրահներ և modern venues",
      "Հարսանական և կորպորատիվ էթիկետ",
      "Դեկոր քարի, սրահների և այգիների համար",
      "Միջազգային հյուրերի լոգիստիկա",
    ],
  },
});

export function getCityBySlug(slug: string): CityPage | undefined {
  return CITIES_PAGES.find((c) => c.slug === slug || c.id === slug);
}
