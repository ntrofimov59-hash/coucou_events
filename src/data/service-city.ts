/**
 * Данные для SEO-страниц связок «услуга + город».
 * URL: /{lang}/cities/{citySlug}/{serviceSlug}
 *
 * Уникальность контента обеспечивается сочетанием:
 *  - сервис-специфичных блоков (deliverables, process, faq) — 9 вариантов
 *  - город-специфичных данных из cities.ts (сезон, бюджет, логистика, венды)
 *  - сшивки «услуга в <город>» в title/h1/lead
 *
 * ⚠️ Это каркас. Чем больше реальных фактов (цены, кейсы, имена площадок)
 * будет добавлено в overrides, тем выше шанс выйти в топ по связке.
 */

import { SERVICE_SLUGS, SERVICE_NAMES } from "./services-map";
import type { CityPage } from "./cities";
import { cityIn } from "./city-grammar";

export type Lang = "ru" | "eng" | "esp" | "arm";
export const LANGS: Lang[] = ["ru", "eng", "esp", "arm"];

type L10n = Record<Lang, string>;
type L10nList = Record<Lang, string[]>;

export interface ServiceProfile {
  slug: string;
  /** Короткая форма для подстановки в заголовок: «Аренда шатров в Барселоне» */
  titleForm: L10n;
  /** Форма в предложном контексте: «...включает кейтеринг» */
  inlineForm: L10n;
  /** schema.org serviceType */
  serviceType: string;
  /** Что входит в услугу */
  deliverables: L10nList;
  /** Как устроен процесс */
  process: L10nList;
  /** Вопросы, специфичные для услуги. {city} подставляется */
  faq: { q: L10n; a: L10n }[];
  /** Подсказка по бюджету, специфичная для услуги */
  budgetHint: L10n;
}

const P = (ru: string, eng: string, esp: string, arm: string): L10n => ({
  ru,
  eng,
  esp,
  arm,
});
const PL = (
  ru: string[],
  eng: string[],
  esp: string[],
  arm: string[],
): L10nList => ({ ru, eng, esp, arm });

export const SERVICE_PROFILES: Record<string, ServiceProfile> = {
  marquees: {
    slug: "marquees",
    titleForm: P(
      "Аренда шатров",
      "Marquee rental",
      "Alquiler de carpas",
      "Վրանների վարձույթ",
    ),
    inlineForm: P("аренду шатров", "marquee rental", "alquiler de carpas", "վրանների վարձույթ"),
    serviceType: "Marquee and tent rental",
    deliverables: PL(
      [
        "Шатры разных типов: прозрачные, каркасные, пагоды, стретч-тенты",
        "Замер площадки и расчёт посадки под ваше количество гостей",
        "Настил пола, боковые стенки, окна, климат — обогрев или охлаждение",
        "Монтаж и демонтаж силами нашей бригады, включая ночные окна",
        "Свет внутри шатра и подключение к электропитанию",
      ],
      [
        "Clear-span, frame, pagoda and stretch tents",
        "Site survey and seating calculation for your guest count",
        "Flooring, sidewalls, windows, heating or cooling",
        "Installation and dismantling by our own crew",
        "In-tent lighting and power distribution",
      ],
      [
        "Carpas transparentes, estructurales, pagodas y stretch",
        "Medición del terreno y cálculo de aforo",
        "Suelo, paredes laterales, ventanas, climatización",
        "Montaje y desmontaje con equipo propio",
        "Iluminación interior y conexión eléctrica",
      ],
      [
        "Տարբեր տիպի վրաններ՝ թափանցիկ, կարկասային, պագոդա",
        "Հարթակի չափագրում և հյուրերի տեղաբաշխման հաշվարկ",
        "Հատակ, կողային պատեր, պատուհաններ, կլիմա",
        "Տեղադրում և ապամոնտաժում մեր բրիգադի ուժերով",
        "Լուսավորություն և էլեկտրասնուցում",
      ],
    ),
    process: PL(
      [
        "Выезд на площадку или анализ по фото и координатам",
        "Подбор типа и размера шатра под рельеф, ветровую нагрузку и формат",
        "Схема расстановки: сцена, танцпол, бар, зоны обслуживания",
        "Монтаж за 1–2 дня до события, приёмка вместе с вами",
      ],
      [
        "Site visit or remote analysis by photos and coordinates",
        "Tent type and size selected for terrain, wind load and format",
        "Floor plan: stage, dance floor, bar, service zones",
        "Setup 1–2 days before the event, handover with you on site",
      ],
      [
        "Visita al terreno o análisis remoto",
        "Selección de tipo y tamaño según terreno y viento",
        "Plano: escenario, pista, barra, zonas de servicio",
        "Montaje 1–2 días antes con entrega conjunta",
      ],
      [
        "Հարթակի այց կամ հեռակա վերլուծություն",
        "Վրանի տիպի և չափի ընտրություն",
        "Դասավորության սխեմա՝ բեմ, պարահրապարակ, բար",
        "Տեղադրում 1–2 օր առաջ և համատեղ ընդունում",
      ],
    ),
    faq: [
      {
        q: P(
          "Сколько гостей помещается в шатёр в {city}?",
          "How many guests fit in a marquee in {city}?",
          "¿Cuántos invitados caben en una carpa en {city}?",
          "Քանի՞ հյուր է տեղավորվում վրանում՝ {city}",
        ),
        a: P(
          "Ориентир: 1,2–1,5 м² на гостя при банкетной рассадке и 2–2,2 м², если нужны танцпол, сцена и бар внутри. Точный размер считаем после того, как вы назовёте количество гостей и формат.",
          "Rule of thumb: 1.2–1.5 m² per guest for seated dining, 2–2.2 m² if you need a dance floor, stage and bar inside. We calculate exactly once we know your guest count and format.",
          "Referencia: 1,2–1,5 m² por invitado sentado y 2–2,2 m² con pista y escenario. Calculamos exacto según tu formato.",
          "Ուղենիշ՝ 1,2–1,5 մ² մեկ հյուրի համար, 2–2,2 մ²՝ պարահրապարակով։",
        ),
      },
      {
        q: P(
          "Выдержит ли шатёр ветер и дождь в {city}?",
          "Will the marquee hold up against wind and rain in {city}?",
          "¿La carpa resiste viento y lluvia en {city}?",
          "Վրանը դիմանո՞ւմ է քամուն և անձրևին՝ {city}",
        ),
        a: P(
          "Конструкции анкерятся под расчётную ветровую нагрузку локации, тент водонепроницаемый. При штормовом прогнозе мы заранее предлагаем план B — усиление или смену площадки.",
          "Structures are anchored for the local calculated wind load and the fabric is waterproof. If a storm is forecast we propose a plan B in advance — reinforcement or a venue change.",
          "Las estructuras se anclan según la carga de viento local y la lona es impermeable. Con pronóstico de tormenta proponemos plan B.",
          "Կառուցվածքները ամրացվում են ըստ տեղական քամու բեռի, կտորը ջրակայուն է։",
        ),
      },
    ],
    budgetHint: P(
      "Стоимость шатра зависит от площади, типа конструкции, пола и климат-оборудования — это обычно самая крупная строка сметы после кейтеринга.",
      "Marquee cost depends on footprint, structure type, flooring and climate control — usually the largest line after catering.",
      "El coste depende de superficie, tipo, suelo y climatización.",
      "Արժեքը կախված է մակերեսից, տիպից, հատակից և կլիմայից։",
    ),
  },

  catering: {
    slug: "catering",
    titleForm: P("Кейтеринг", "Catering", "Catering", "Քեյթերինգ"),
    inlineForm: P("кейтеринг", "catering", "catering", "քեյթերինգ"),
    serviceType: "Event catering",
    deliverables: PL(
      [
        "Разработка меню под формат: банкет, фуршет, станции, семейный стол",
        "Локальная кухня плюс европейская база, вегетарианские и халяльные опции",
        "Полевая кухня и оборудование, если на площадке нет инфраструктуры",
        "Бар: алкогольная и безалкогольная карта, бармены, лёд, стекло",
        "Официанты, посуда, текстиль, уборка зоны питания",
      ],
      [
        "Menu built for your format: banquet, buffet, stations, family style",
        "Local cuisine plus a European base, vegetarian and halal options",
        "Field kitchen and equipment when the venue has no infrastructure",
        "Bar: drinks list, bartenders, ice, glassware",
        "Waiting staff, tableware, linen, clearing",
      ],
      [
        "Menú según formato: banquete, buffet, estaciones",
        "Cocina local y europea, opciones vegetarianas y halal",
        "Cocina de campo si el venue no tiene infraestructura",
        "Barra: carta, bartenders, hielo, cristalería",
        "Camareros, vajilla, mantelería, limpieza",
      ],
      [
        "Ճաշացանկ ըստ ձևաչափի՝ բանկետ, ֆուրշետ, կայաններ",
        "Տեղական և եվրոպական խոհանոց, բուսակերական տարբերակներ",
        "Դաշտային խոհանոց՝ ենթակառուցվածքի բացակայության դեպքում",
        "Բար՝ խմիչքների քարտ, բարմեններ, սառույց",
        "Մատուցողներ, սպասք, տեքստիլ, մաքրում",
      ],
    ),
    process: PL(
      [
        "Обсуждаем формат, количество гостей и ограничения по питанию",
        "Собираем меню с локальными поставщиками и присылаем на согласование",
        "Дегустация, где это возможно организовать до даты события",
        "Логистика продуктов и холодовая цепь под климат площадки",
      ],
      [
        "We discuss format, guest count and dietary restrictions",
        "We build the menu with local suppliers and send it for approval",
        "Tasting where it can be arranged before the event date",
        "Food logistics and cold chain adapted to the venue climate",
      ],
      [
        "Definimos formato, invitados y restricciones",
        "Armamos el menú con proveedores locales",
        "Degustación cuando es posible",
        "Logística y cadena de frío según el clima",
      ],
      [
        "Քննարկում ենք ձևաչափը, հյուրերի քանակը և սահմանափակումները",
        "Կազմում ենք ճաշացանկը տեղական մատակարարների հետ",
        "Համտես՝ հնարավորության դեպքում",
        "Լոգիստիկա և սառը շղթա ըստ կլիմայի",
      ],
    ),
    faq: [
      {
        q: P(
          "Можно ли сделать меню из локальных продуктов в {city}?",
          "Can the menu use local produce in {city}?",
          "¿El menú puede usar productos locales en {city}?",
          "Հնարավո՞ր է ճաշացանկը տեղական մթերքից՝ {city}",
        ),
        a: P(
          "Да, и это обычно правильное решение: локальные продукты свежее, дешевле в логистике и лучше воспринимаются гостями, которые приехали ради атмосферы места. Импортные позиции оставляем там, где без них не обойтись.",
          "Yes, and it is usually the right call: local produce is fresher, cheaper to move and lands better with guests who came for the place itself. We import only where there is no substitute.",
          "Sí, y suele ser lo correcto: más fresco, mejor logística y más coherente con el destino.",
          "Այո, և դա սովորաբար ճիշտ լուծումն է՝ ավելի թարմ և տրամաբանական։",
        ),
      },
      {
        q: P(
          "Что если на площадке в {city} нет кухни?",
          "What if the venue in {city} has no kitchen?",
          "¿Y si el venue en {city} no tiene cocina?",
          "Իսկ եթե հարթակում խոհանոց չկա՝ {city}",
        ),
        a: P(
          "Привозим полевую кухню: тепловое оборудование, холод, мойку, генератор и шатёр для персонала. Это отдельная строка в смете, но она делает возможным событие практически на любой локации.",
          "We bring a field kitchen: hot line, refrigeration, wash-up, generator and a crew tent. It is a separate budget line, but it makes almost any location workable.",
          "Traemos cocina de campo completa con generador. Es una partida aparte del presupuesto.",
          "Բերում ենք դաշտային խոհանոց՝ գեներատորով։ Դա առանձին բյուջետային տող է։",
        ),
      },
    ],
    budgetHint: P(
      "Кейтеринг считается на гостя и обычно занимает 30–45% сметы. Главные множители — количество перемен, бар и уровень сервиса.",
      "Catering is priced per guest and usually takes 30–45% of the budget. Key multipliers: number of courses, bar and service level.",
      "El catering se cotiza por invitado y suele ser el 30–45% del presupuesto.",
      "Քեյթերինգը հաշվարկվում է ըստ հյուրի և կազմում է բյուջեի 30–45%-ը։",
    ),
  },

  decor: {
    slug: "decor",
    titleForm: P("Декор и флористика", "Decor and florals", "Decoración y floristería", "Դեկոր և ֆլորիստիկա"),
    inlineForm: P("декор", "decor", "decoración", "դեկոր"),
    serviceType: "Event decor and floral design",
    deliverables: PL(
      [
        "Концепция и визуализация: мудборд, палитра, эскизы ключевых зон",
        "Флористика из сезонных локальных цветов",
        "Арка или алтарь, президиум, оформление столов и зоны welcome",
        "Световой дизайн: архитектурная подсветка, гирлянды, свечи",
        "Печатная группа: рассадка, номера столов, меню, навигация",
      ],
      [
        "Concept and visualisation: moodboard, palette, key-zone sketches",
        "Floral design from seasonal local flowers",
        "Arch or altar, head table, table styling, welcome zone",
        "Lighting design: architectural wash, festoons, candles",
        "Print: seating chart, table numbers, menus, signage",
      ],
      [
        "Concepto y visualización: moodboard, paleta, bocetos",
        "Floristería con flores locales de temporada",
        "Arco, mesa presidencial, mesas, zona welcome",
        "Diseño de iluminación y velas",
        "Imprenta: seating, numeración, menús, señalética",
      ],
      [
        "Հայեցակարգ և վիզուալիզացիա՝ մուդբորդ, պալիտրա",
        "Ֆլորիստիկա սեզոնային տեղական ծաղիկներից",
        "Կամար, գլխավոր սեղան, սեղանների ձևավորում",
        "Լուսային դիզայն՝ գիրլյանդներ, մոմեր",
        "Տպագրական խումբ՝ նստեցում, սեղանների համարներ",
      ],
    ),
    process: PL(
      [
        "Референсы от вас — или собираем мудборд с нуля под площадку",
        "Визуализация ключевых зон до подписания сметы",
        "Закупка цветов у локальных поставщиков за 1–2 дня до даты",
        "Монтаж в день события, финальная проверка за час до гостей",
      ],
      [
        "Your references, or we build a moodboard from scratch for the venue",
        "Key-zone visualisation before the budget is signed off",
        "Flowers sourced locally 1–2 days before the date",
        "Setup on the day, final walk-through one hour before guests",
      ],
      [
        "Tus referencias o moodboard desde cero",
        "Visualización antes de firmar el presupuesto",
        "Flores locales 1–2 días antes",
        "Montaje el mismo día y revisión final",
      ],
      [
        "Ձեր ռեֆերենսները կամ մուդբորդ զրոյից",
        "Վիզուալիզացիա մինչև բյուջեի հաստատումը",
        "Ծաղիկների գնում 1–2 օր առաջ",
        "Տեղադրում միջոցառման օրը",
      ],
    ),
    faq: [
      {
        q: P(
          "Какие цветы доступны в {city} в мой сезон?",
          "Which flowers are available in {city} in my season?",
          "¿Qué flores hay en {city} en mi temporada?",
          "Ի՞նչ ծաղիկներ կան {city}-ում իմ սեզոնին",
        ),
        a: P(
          "Ассортимент сильно зависит от месяца и локального рынка. Мы всегда предлагаем два варианта палитры: сезонную — дешевле и свежее, и импортную — дороже, но независимую от сезона.",
          "Availability depends heavily on the month and the local market. We always offer two palettes: seasonal — cheaper and fresher, and imported — pricier but season-independent.",
          "Depende del mes y del mercado local. Ofrecemos paleta de temporada e importada.",
          "Կախված է ամսից և տեղական շուկայից։ Առաջարկում ենք երկու պալիտրա։",
        ),
      },
    ],
    budgetHint: P(
      "Декор — самая гибкая строка сметы: одна и та же концепция может быть реализована в трёх ценовых уровнях без потери цельности.",
      "Decor is the most elastic budget line: the same concept can be delivered at three price levels without losing coherence.",
      "La decoración es la partida más flexible del presupuesto.",
      "Դեկորը բյուջեի ամենաճկուն տողն է։",
    ),
  },

  "photo-video": {
    slug: "photo-video",
    titleForm: P("Фото и видеосъёмка", "Photo and video", "Foto y video", "Լուսանկար և վիդեո"),
    inlineForm: P("фото- и видеосъёмку", "photo and video", "foto y video", "լուսանկարում և վիդեո"),
    serviceType: "Event photography and videography",
    deliverables: PL(
      [
        "Фотограф и видеограф с опытом съёмки в локации",
        "Репортаж полного дня плюс постановочная съёмка на закате",
        "Аэросъёмка дроном там, где это разрешено",
        "Цветокоррекция и обработанная галерея в оговорённый срок",
        "Короткий ролик для соцсетей в первые дни после события",
      ],
      [
        "Photographer and videographer experienced in the location",
        "Full-day reportage plus a golden-hour shoot",
        "Drone footage where permitted",
        "Colour grading and a delivered gallery within an agreed deadline",
        "A short social cut within days of the event",
      ],
      [
        "Fotógrafo y videógrafo con experiencia local",
        "Reportaje de día completo más sesión al atardecer",
        "Dron donde esté permitido",
        "Corrección de color y galería en plazo",
        "Clip corto para redes en pocos días",
      ],
      [
        "Լուսանկարիչ և վիդեոօպերատոր՝ տեղանքի փորձով",
        "Ամբողջ օրվա ռեպորտաժ և մայրամուտի նկարահանում",
        "Դրոն՝ թույլատրված վայրերում",
        "Գունաշտկում և պատրաստի պատկերասրահ",
        "Կարճ ռոլիկ սոցցանցերի համար",
      ],
    ),
    process: PL(
      [
        "Показываем портфолио именно по этой локации, а не общее",
        "Согласуем тайминг: где и когда будет лучший свет",
        "Разведка точек съёмки за день до события",
        "Передача материалов по защищённой ссылке с резервной копией",
      ],
      [
        "We show portfolio from this specific location, not a generic reel",
        "We agree the timing around where and when the light is best",
        "Location scouting the day before",
        "Delivery via a secure link with a backup copy retained",
      ],
      [
        "Portfolio de esta localización concreta",
        "Timing según la mejor luz",
        "Scouting el día anterior",
        "Entrega por enlace seguro con copia de respaldo",
      ],
      [
        "Ցույց ենք տալիս հենց այս վայրի պորտֆոլիոն",
        "Համաձայնեցնում ենք ժամանակացույցը՝ ըստ լույսի",
        "Նկարահանման կետերի հետախուզում",
        "Հանձնում ապահով հղումով",
      ],
    ),
    faq: [
      {
        q: P(
          "Нужно ли разрешение на съёмку дроном в {city}?",
          "Do I need a drone permit in {city}?",
          "¿Hace falta permiso de dron en {city}?",
          "Դրոնով նկարահանման թույլտվություն պե՞տք է՝ {city}",
        ),
        a: P(
          "Правила отличаются по странам и часто меняются, а рядом с аэропортами и госучреждениями съёмка обычно запрещена. Мы проверяем актуальные требования по вашей конкретной площадке и оформляем разрешение, если оно нужно.",
          "Rules differ by country and change often; flying near airports and government sites is usually banned. We check the current requirements for your specific venue and arrange a permit if one is needed.",
          "Las normas varían por país y cambian a menudo. Verificamos los requisitos de tu venue y gestionamos el permiso.",
          "Կանոնները տարբերվում են ըստ երկրի։ Ստուգում ենք ձեր հարթակի պահանջները։",
        ),
      },
    ],
    budgetHint: P(
      "Съёмка считается по дням работы команды. Выезд иногородней команды добавляет перелёт и проживание — часто дешевле взять локальную.",
      "Shooting is priced per crew day. Flying a team in adds travel and accommodation — a local crew is often cheaper.",
      "Se cotiza por jornada de equipo. Un equipo local suele salir más barato.",
      "Հաշվարկվում է ըստ աշխատանքային օրերի։",
    ),
  },

  entertainment: {
    slug: "entertainment",
    titleForm: P("Развлекательная программа", "Entertainment", "Entretenimiento", "Ժամանցային ծրագիր"),
    inlineForm: P("развлекательную программу", "entertainment", "entretenimiento", "ժամանցային ծրագիր"),
    serviceType: "Event entertainment",
    deliverables: PL(
      [
        "Ведущий на нужном языке, с прогоном сценария заранее",
        "DJ, живые музыканты, кавер-бэнд или локальные артисты",
        "Звук и свет под размер площадки, сцена и бэклайн",
        "Шоу-номера: от фаер-шоу до национальных коллективов",
        "Интерактив для гостей и детская зона, если нужно",
      ],
      [
        "Host in the language you need, with a script run-through beforehand",
        "DJ, live musicians, cover band or local performers",
        "Sound and light scaled to the venue, stage and backline",
        "Show acts: from fire shows to national ensembles",
        "Guest interactives and a kids' zone if needed",
      ],
      [
        "Presentador en tu idioma, con ensayo previo",
        "DJ, músicos en vivo, banda o artistas locales",
        "Sonido e iluminación según el venue",
        "Números de show: fuego, grupos nacionales",
        "Dinámicas para invitados y zona infantil",
      ],
      [
        "Հաղորդավար՝ ձեր լեզվով, նախնական փորձով",
        "DJ, կենդանի երաժիշտներ կամ տեղական արտիստներ",
        "Ձայն և լույս՝ ըստ հարթակի չափի",
        "Շոու-համարներ",
        "Ինտերակտիվ հյուրերի և մանկական գոտի",
      ],
    ),
    process: PL(
      [
        "Разбираем состав гостей: возраст, языки, настроение",
        "Собираем тайминг вечера по блокам и согласуем с вами",
        "Технический райдер артистов сверяем с возможностями площадки",
        "Саундчек в день события до приезда гостей",
      ],
      [
        "We map the guest mix: ages, languages, mood",
        "We build the evening timeline in blocks and approve it with you",
        "Performer tech riders checked against the venue's capabilities",
        "Soundcheck on the day before guests arrive",
      ],
      [
        "Analizamos el perfil de invitados",
        "Armamos el timeline por bloques",
        "Revisamos riders técnicos con el venue",
        "Prueba de sonido antes de la llegada",
      ],
      [
        "Վերլուծում ենք հյուրերի կազմը",
        "Կազմում ենք երեկոյի ժամանակացույցը",
        "Ստուգում ենք տեխնիկական ռայդերները",
        "Ձայնի ստուգում միջոցառման օրը",
      ],
    ),
    faq: [
      {
        q: P(
          "Есть ли ограничения по шуму в {city}?",
          "Are there noise restrictions in {city}?",
          "¿Hay restricciones de ruido en {city}?",
          "Աղմուկի սահմանափակումներ կա՞ն {city}-ում",
        ),
        a: P(
          "Почти везде есть ночной лимит, а на курортных территориях и в жилой застройке он строже. Мы уточняем правила конкретной площадки и закладываем в тайминг переход на тихий формат — это лучше, чем останавливать вечер по жалобе.",
          "Almost everywhere has a night-time limit, stricter in resort areas and residential zones. We check the specific venue's rules and build a quiet-format transition into the timeline — better than having the night stopped by a complaint.",
          "Casi siempre hay límite nocturno, más estricto en zonas residenciales. Planificamos la transición a formato silencioso.",
          "Գրեթե ամենուր կա գիշերային սահմանափակում։ Նախատեսում ենք անցում հանգիստ ձևաչափի։",
        ),
      },
    ],
    budgetHint: P(
      "Программа масштабируется свободно: от одного DJ до полноценного шоу. Основной драйвер цены — гонорары артистов и объём технического райдера.",
      "The programme scales freely: from a single DJ to a full show. The main cost drivers are performer fees and the tech rider.",
      "El programa escala desde un DJ a un show completo.",
      "Ծրագիրը ազատ մասշտաբավորվում է։",
    ),
  },

  transfer: {
    slug: "transfer",
    titleForm: P("Трансфер гостей", "Guest transfers", "Traslado de invitados", "Հյուրերի տրանսֆեր"),
    inlineForm: P("трансфер", "transfers", "traslados", "տրանսֆեր"),
    serviceType: "Guest transportation",
    deliverables: PL(
      [
        "Встреча в аэропорту с табличкой и помощью с багажом",
        "Автобусы и минивэны по расписанию отель — площадка — отель",
        "Индивидуальные авто для молодожёнов и ключевых гостей",
        "Координатор на посадке, чтобы никто не потерялся",
        "Ночные развозки после окончания вечера",
      ],
      [
        "Airport meet-and-greet with a name board and luggage help",
        "Coaches and minivans on a hotel — venue — hotel schedule",
        "Private cars for the couple and key guests",
        "A coordinator at boarding so nobody is left behind",
        "Late-night return runs after the party ends",
      ],
      [
        "Recogida en aeropuerto con cartel y ayuda con equipaje",
        "Autobuses y minivans hotel — venue — hotel",
        "Coches privados para novios e invitados clave",
        "Coordinador en el embarque",
        "Traslados nocturnos al finalizar",
      ],
      [
        "Դիմավորում օդանավակայանում",
        "Ավտոբուսներ և միկրոավտոբուսներ՝ ըստ ժամանակացույցի",
        "Անհատական մեքենաներ",
        "Համակարգող՝ նստեցման ժամանակ",
        "Գիշերային տեղափոխումներ",
      ],
    ),
    process: PL(
      [
        "Собираем список рейсов и отелей гостей в одну таблицу",
        "Считаем вместимость и количество рейсов автобусов",
        "Проверяем подъездные пути и место разворота у площадки",
        "В день события — диспетчер на связи с водителями",
      ],
      [
        "We collect guest flights and hotels into a single sheet",
        "We calculate capacity and the number of coach runs",
        "We check access roads and the turning space at the venue",
        "On the day a dispatcher stays in contact with every driver",
      ],
      [
        "Recopilamos vuelos y hoteles en una hoja",
        "Calculamos capacidad y número de viajes",
        "Verificamos accesos y zona de maniobra",
        "Despachador en contacto con los conductores",
      ],
      [
        "Հավաքում ենք չվերթների և հյուրանոցների ցանկը",
        "Հաշվարկում ենք տարողությունը",
        "Ստուգում ենք մուտքի ճանապարհները",
        "Դիսպետչեր՝ կապի մեջ վարորդների հետ",
      ],
    ),
    faq: [
      {
        q: P(
          "Сколько ехать от аэропорта до площадок в {city}?",
          "How long is the drive from the airport to venues in {city}?",
          "¿Cuánto se tarda del aeropuerto a los venues en {city}?",
          "Որքա՞ն է ճանապարհը օդանավակայանից՝ {city}",
        ),
        a: P(
          "Зависит от конкретной площадки и времени суток. Мы всегда закладываем запас на пробки и на то, что часть гостей опоздает на посадку — расписание строится с буфером, а не впритык.",
          "It depends on the specific venue and time of day. We always build in slack for traffic and for guests who miss the first boarding — the schedule has a buffer rather than being tight.",
          "Depende del venue y la hora. Siempre dejamos margen para tráfico y retrasos.",
          "Կախված է հարթակից և օրվա ժամից։ Միշտ պահուստ ենք թողնում։",
        ),
      },
    ],
    budgetHint: P(
      "Трансфер считается по количеству и типу машин и по числу рейсов. Групповые автобусы почти всегда дешевле индивидуальных такси на гостя.",
      "Transfers are priced by vehicle type, count and number of runs. Group coaches are almost always cheaper per guest than individual taxis.",
      "Se cotiza por tipo y número de vehículos y viajes.",
      "Հաշվարկվում է ըստ մեքենաների տիպի և քանակի։",
    ),
  },

  turnkey: {
    slug: "turnkey",
    titleForm: P("Организация мероприятия под ключ", "Turnkey event planning", "Organización integral de eventos", "Միջոցառման կազմակերպում բանալի ձեռքին"),
    inlineForm: P("организацию под ключ", "turnkey planning", "organización integral", "կազմակերպում բանալի ձեռքին"),
    serviceType: "Full-service event planning",
    deliverables: PL(
      [
        "Подбор площадки и переговоры с ней от вашего имени",
        "Единая смета и контроль расходов по всем подрядчикам",
        "Полный состав подрядчиков: шатёр, кейтеринг, декор, техника, съёмка",
        "Тайминг события и координация в день, включая репетицию",
        "Один менеджер как единая точка связи на весь проект",
      ],
      [
        "Venue search and negotiation on your behalf",
        "One consolidated budget and cost control across all suppliers",
        "Full supplier stack: marquee, catering, decor, tech, filming",
        "Event timeline and day-of coordination, rehearsal included",
        "One manager as a single point of contact for the whole project",
      ],
      [
        "Búsqueda y negociación del venue",
        "Presupuesto único y control de costes",
        "Todos los proveedores coordinados",
        "Timeline y coordinación el día del evento",
        "Un único manager de contacto",
      ],
      [
        "Հարթակի ընտրություն և բանակցություններ",
        "Միասնական բյուջե և ծախսերի վերահսկում",
        "Բոլոր կապալառուները",
        "Ժամանակացույց և համակարգում միջոցառման օրը",
        "Մեկ մենեջեր՝ կապի միակ կետ",
      ],
    ),
    process: PL(
      [
        "Брифинг: формат, гости, бюджетная вилка, обязательные хотелки",
        "Две–три концепции с площадками и предварительными сметами",
        "Подписание, предоплаты подрядчикам, контроль сроков",
        "Финальный прогон за день и координация в день события",
      ],
      [
        "Briefing: format, guests, budget range, non-negotiables",
        "Two or three concepts with venues and preliminary budgets",
        "Contracts, supplier deposits, deadline tracking",
        "Full rehearsal the day before and coordination on the day",
      ],
      [
        "Briefing: formato, invitados, rango de presupuesto",
        "Dos o tres conceptos con venues y presupuestos",
        "Contratos, anticipos y control de plazos",
        "Ensayo el día previo y coordinación el día del evento",
      ],
      [
        "Բրիֆինգ՝ ձևաչափ, հյուրեր, բյուջե",
        "Երկու-երեք հայեցակարգ՝ հարթակներով",
        "Պայմանագրեր և կանխավճարներ",
        "Փորձ նախորդ օրը և համակարգում",
      ],
    ),
    faq: [
      {
        q: P(
          "Мы живём не в {city} — можно организовать всё удалённо?",
          "We don't live in {city} — can everything be arranged remotely?",
          "No vivimos en {city}, ¿se puede organizar a distancia?",
          "Մենք չենք ապրում {city}-ում՝ հնարավո՞ր է հեռակա կազմակերպել",
        ),
        a: P(
          "Да, большинство наших выездных проектов так и делается. Вы получаете фото и видео площадок, визуализации и созвоны, а физически присутствуем мы. Приехать заранее имеет смысл только на дегустацию, если она для вас принципиальна.",
          "Yes — most of our destination projects work exactly this way. You get venue photos and video, visualisations and calls; we are the ones physically on site. Arriving early only really matters if a tasting is important to you.",
          "Sí, así funcionan la mayoría de nuestros proyectos destino. Recibes fotos, vídeo y visualizaciones; nosotros estamos en el sitio.",
          "Այո, մեր նախագծերի մեծ մասն այդպես է աշխատում։",
        ),
      },
      {
        q: P(
          "Сколько времени нужно на подготовку события в {city}?",
          "How much lead time does an event in {city} need?",
          "¿Cuánta antelación necesita un evento en {city}?",
          "Որքա՞ն ժամանակ է պետք նախապատրաստմանը՝ {city}",
        ),
        a: P(
          "Комфортный горизонт — от четырёх до девяти месяцев, потому что лучшие площадки и подрядчики разбираются в первую очередь. Сжатые сроки возможны, но выбор будет уже из того, что осталось свободным.",
          "A comfortable horizon is four to nine months, because the best venues and suppliers go first. Short notice is possible, but the choice narrows to whatever is still free.",
          "Lo cómodo es de cuatro a nueve meses. Plazos cortos son posibles, con menos opciones.",
          "Հարմար ժամկետը՝ չորսից ինը ամիս։",
        ),
      },
    ],
    budgetHint: P(
      "Агентское вознаграждение за организацию под ключ обычно окупается за счёт согласованных нами цен подрядчиков и отсутствия дублирующих трат.",
      "The planning fee usually pays for itself through the supplier rates we negotiate and the duplicated spend we prevent.",
      "Los honorarios suelen compensarse con las tarifas negociadas.",
      "Գործակալական վարձը սովորաբար փոխհատուցվում է բանակցված գներով։",
    ),
  },

  biotoilets: {
    slug: "biotoilets",
    titleForm: P("Био-модули и санитарные блоки", "Restroom trailers", "Baños móviles", "Կենսատուալետներ և սանիտարական բլոկներ"),
    inlineForm: P("санитарные модули", "restroom trailers", "baños móviles", "սանիտարական մոդուլներ"),
    serviceType: "Sanitary facilities rental",
    deliverables: PL(
      [
        "Комфорт-модули с раковинами, зеркалами, светом и вентиляцией",
        "Расчёт количества кабин по числу гостей и длительности события",
        "Подвод воды и электричества или автономный режим",
        "Обслуживание во время события, а не только до и после",
        "Отдельный блок для персонала и подрядчиков",
      ],
      [
        "Comfort trailers with sinks, mirrors, lighting and ventilation",
        "Unit count calculated from guest numbers and event duration",
        "Mains water and power hookup, or fully autonomous operation",
        "Servicing during the event, not only before and after",
        "A separate block for crew and suppliers",
      ],
      [
        "Módulos con lavabos, espejos, luz y ventilación",
        "Cálculo de unidades según invitados y duración",
        "Conexión a agua y luz o modo autónomo",
        "Servicio durante el evento",
        "Bloque aparte para personal",
      ],
      [
        "Կոմֆորտ մոդուլներ՝ լվացարաններով և լուսավորությամբ",
        "Խցիկների քանակի հաշվարկ",
        "Ջրի և էլեկտրականության միացում կամ ինքնավար ռեժիմ",
        "Սպասարկում միջոցառման ընթացքում",
        "Առանձին բլոկ անձնակազմի համար",
      ],
    ),
    process: PL(
      [
        "Считаем норму: ориентировочно одна кабина на 40–50 гостей на четыре часа",
        "Проверяем подъезд для тягача и площадку под установку",
        "Размещаем модули так, чтобы их не было видно из кадра и от гостей",
        "Обслуживание по графику в течение вечера",
      ],
      [
        "We calculate the norm: roughly one unit per 40–50 guests over four hours",
        "We check truck access and the standing area",
        "Units are placed out of sightlines and out of camera frame",
        "Scheduled servicing through the evening",
      ],
      [
        "Calculamos: una unidad por cada 40–50 invitados en cuatro horas",
        "Verificamos acceso del camión y zona de instalación",
        "Ubicación fuera de la vista y del encuadre",
        "Servicio programado durante la noche",
      ],
      [
        "Հաշվարկում ենք՝ մոտավորապես մեկ խցիկ 40–50 հյուրի համար",
        "Ստուգում ենք մուտքը և տեղադրման տարածքը",
        "Տեղադրում ենք տեսադաշտից դուրս",
        "Սպասարկում ըստ ժամանակացույցի",
      ],
    ),
    faq: [
      {
        q: P(
          "Зачем санитарные модули, если площадка в {city} с туалетами?",
          "Why bring trailers if the venue in {city} has restrooms?",
          "¿Por qué traer módulos si el venue en {city} tiene baños?",
          "Ինչո՞ւ մոդուլներ, եթե հարթակն ունի զուգարաններ",
        ),
        a: P(
          "Часто штатных туалетов хватает на обычную посещаемость, но не на сто с лишним гостей одновременно после тостов. Дополнительный блок снимает очереди, которые способны испортить впечатление от идеально организованного вечера.",
          "Built-in facilities usually handle normal footfall but not a hundred-plus guests at once after the toasts. An extra block removes the queues that can spoil an otherwise flawless evening.",
          "Los baños fijos suelen bastar para uso normal, no para cien invitados a la vez. Un bloque extra elimina colas.",
          "Սովորաբար բավարարում է սովորական հոսքին, բայց ոչ՝ միաժամանակ հարյուր հյուրի։",
        ),
      },
    ],
    budgetHint: P(
      "Строка небольшая относительно общей сметы, но одна из самых заметных для гостей, если на ней сэкономить.",
      "A small line relative to the total budget, but one of the most noticeable to guests if you cut it.",
      "Partida pequeña, pero muy visible si se recorta.",
      "Փոքր տող, բայց շատ նկատելի՝ խնայելու դեպքում։",
    ),
  },

  ceremony: {
    slug: "ceremony",
    titleForm: P("Организация церемонии", "Ceremony planning", "Organización de ceremonia", "Արարողության կազմակերպում"),
    inlineForm: P("организацию церемонии", "ceremony planning", "organización de ceremonia", "արարողության կազմակերպում"),
    serviceType: "Wedding ceremony planning",
    deliverables: PL(
      [
        "Выездная церемония: арка, рассадка гостей, дорожка, звук",
        "Ведущий церемонии на нужном языке, при необходимости с переводом",
        "Репетиция выхода и тайминг под закат",
        "Музыкальное сопровождение: живой дуэт, квартет или трек",
        "Помощь с документами при официальной регистрации за рубежом",
      ],
      [
        "Outdoor ceremony: arch, guest seating, aisle, sound",
        "Celebrant in the language you need, with translation if required",
        "Processional rehearsal and timing built around sunset",
        "Music: live duo, quartet or a track",
        "Support with paperwork for a legal ceremony abroad",
      ],
      [
        "Ceremonia al aire libre: arco, sillas, pasillo, sonido",
        "Oficiante en tu idioma, con traducción si hace falta",
        "Ensayo y timing según el atardecer",
        "Música en vivo o grabada",
        "Apoyo con la documentación legal",
      ],
      [
        "Արտագնա արարողություն՝ կամար, նստատեղեր, ձայն",
        "Արարողավար՝ ձեր լեզվով",
        "Փորձ և ժամանակացույց՝ ըստ մայրամուտի",
        "Երաժշտական ուղեկցում",
        "Օգնություն փաստաթղթերի հարցում",
      ],
    ),
    process: PL(
      [
        "Выбираем точку и время по положению солнца, а не по удобству логистики",
        "Прописываем сценарий вплоть до реплик и пауз",
        "Репетиция накануне с ключевыми участниками",
        "План на случай дождя, согласованный до, а не в день события",
      ],
      [
        "We pick the spot and time by the sun's position, not by logistics convenience",
        "The script is written down to the lines and the pauses",
        "Rehearsal the day before with the key participants",
        "A rain plan agreed in advance, not on the day",
      ],
      [
        "Elegimos punto y hora según el sol",
        "Guion detallado hasta las pausas",
        "Ensayo el día previo",
        "Plan de lluvia acordado con antelación",
      ],
      [
        "Ընտրում ենք կետը և ժամը՝ ըստ արևի դիրքի",
        "Մանրամասն սցենար",
        "Փորձ նախորդ օրը",
        "Անձրևի պլան՝ նախապես համաձայնեցված",
      ],
    ),
    faq: [
      {
        q: P(
          "Будет ли церемония в {city} юридически действительной?",
          "Will a ceremony in {city} be legally valid?",
          "¿La ceremonia en {city} será válida legalmente?",
          "Արարողությունը {city}-ում իրավաբանորեն վավե՞ր կլինի",
        ),
        a: P(
          "Это зависит от страны и вашего гражданства, и правила меняются. Многие пары проводят символическую церемонию на площадке, а официальную регистрацию делают дома — так проще и дешевле. Мы поможем разобраться с обоими вариантами до бронирования.",
          "That depends on the country and your citizenship, and the rules change. Many couples hold a symbolic ceremony at the venue and register legally at home — simpler and cheaper. We help you work through both options before you book.",
          "Depende del país y tu nacionalidad. Muchas parejas hacen una ceremonia simbólica y registran legalmente en casa.",
          "Կախված է երկրից և ձեր քաղաքացիությունից։ Շատ զույգեր անում են խորհրդանշական արարողություն։",
        ),
      },
    ],
    budgetHint: P(
      "Церемония редко бывает дорогой сама по себе — основные расходы уходят в декор арки, звук и аренду точки на территории площадки.",
      "The ceremony itself is rarely expensive — most of the cost sits in the arch decor, sound and the fee for the ceremony spot.",
      "La ceremonia en sí rara vez es cara: el coste está en decoración, sonido y la tarifa del espacio.",
      "Արարողությունն ինքնին հազվադեպ է թանկ։",
    ),
  },
};

/** Хелперы */

export function getServiceProfile(slug: string): ServiceProfile | undefined {
  return SERVICE_PROFILES[slug];
}

export function serviceName(slug: string, lang: Lang): string {
  return SERVICE_NAMES[slug]?.[lang] || SERVICE_NAMES[slug]?.ru || slug;
}

/** Все валидные пары «город × услуга» */
export function allPairs(cities: CityPage[]) {
  return cities.flatMap((city) =>
    SERVICE_SLUGS.filter((s) => SERVICE_PROFILES[s]).map((service) => ({
      city,
      service: SERVICE_PROFILES[service],
    })),
  );
}

/** Подстановка названия города в шаблонную строку */
export function fill(text: string, cityName: string): string {
  return text.replace(/\{city\}/g, cityName);
}

/**
 * Генерация SEO title/description/h1/lead для пары.
 * Формулы отличаются по услуге, чтобы не получить 135 одинаковых паттернов.
 */
export function pairMeta(
  profile: ServiceProfile,
  city: CityPage,
  lang: Lang,
) {
  const n = city.name[lang] || city.name.ru;
  const country = city.country[lang] || city.country.ru;
  const s = profile.titleForm[lang];
  const inline = profile.inlineForm[lang];
  // Русский предложный падеж: «в Барселоне», «на Бали»
  const inCity = cityIn(city.slug, city.name.ru);

  const title: Record<Lang, string> = {
    ru: `${s} ${inCity} — цены и заявка | Coucou`,
    eng: `${s} in ${n} — pricing and booking | Coucou`,
    esp: `${s} en ${n} — precios y reserva | Coucou`,
    arm: `${s} ${n}-ում — գներ և հայտ | Coucou`,
  };

  const description: Record<Lang, string> = {
    ru: `${s} ${inCity} (${country}) для свадеб, корпоративов и частных праздников. Расчёт под ваш формат и количество гостей, локальная команда Coucou. Оставьте заявку — вернёмся со сметой.`,
    eng: `${s} in ${n}, ${country} for weddings, corporate and private events. Quoted for your format and guest count by the local Coucou team. Request a proposal.`,
    esp: `${s} en ${n} (${country}) para bodas, corporativos y fiestas privadas. Presupuesto según tu formato con el equipo local de Coucou.`,
    arm: `${s} ${n}-ում (${country})՝ հարսանիքների և կորպորատիվների համար։ Հաշվարկ ըստ ձեր ձևաչափի՝ Coucou-ի տեղական թիմից։`,
  };

  const h1: Record<Lang, string> = {
    ru: `${s} ${inCity}`,
    eng: `${s} in ${n}`,
    esp: `${s} en ${n}`,
    arm: `${s} ${n}-ում`,
  };

  const lead: Record<Lang, string> = {
    ru: `Организуем ${inline} ${inCity} под ваш формат — от камерного ужина до события на несколько сотен гостей. Работаем с локальными подрядчиками и площадками, а отвечаем за результат целиком, одним договором.`,
    eng: `We deliver ${inline} in ${n} for any format — from an intimate dinner to several hundred guests. We work with local suppliers and venues, and carry the whole result under one contract.`,
    esp: `Organizamos ${inline} en ${n} para cualquier formato, desde una cena íntima hasta varios cientos de invitados, con proveedores locales y un único contrato.`,
    arm: `Կազմակերպում ենք ${inline} ${n}-ում՝ ցանկացած ձևաչափի համար՝ տեղական մատակարարների հետ, մեկ պայմանագրով։`,
  };

  return {
    title: title[lang],
    description: description[lang],
    h1: h1[lang],
    lead: lead[lang],
    cityName: n,
    country,
  };
}
