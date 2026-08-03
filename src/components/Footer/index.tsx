import type { Component } from "solid-js";
import { CONTACT } from "@/config/site";

interface Props {
  currentPath: string;
  lang?: string;
}

export const Footer: Component<Props> = (props) => {
  const lang = props.lang || "ru";
  const prefix = `/${lang}`;
  const currentYear = new Date().getFullYear();

  const t = {
    ru: {
      about: "О нас",
      services: "Услуги",
      cities: "Города",
      portfolio: "Галерея проектов",
      contacts: "Контакты",
      booking: "Оставить заявку",
      marquees: "Аренда шатров",
      catering: "Премиум кейтеринг",
      decor: "Дизайн и декор",
      configurator: "Конфигуратор сметы",
      description:
        "Создаем исключительные частные и корпоративные события по всему миру. Безупречная логистика, архитектура пространства и гастрономия премиального уровня.",
      companyTitle: "Компания",
      solutionsTitle: "Решения",
      journalTitle: "Coucou Journal",
      journalDesc:
        "Подпишитесь, чтобы первыми получать кейсы реализованных проектов и тренды ивент-индустрии.",
      emailPlaceholder: "Ваш email",
      ok: "ОК",
      successSub: "Спасибо за подписку!",
      phoneLabel: "Телефон для связи",
      emailLabel: "Электронная почта",
      officeLabel: "Головной офис",
      officeAddress: "ул. Вагарша Вагаршяна 24, Ереван 0012",
      allRights: "Все права защищены.",
      privacy: "Политика конфиденциальности",
      terms: "Условия использования",
    },
    eng: {
      about: "About",
      services: "Services",
      cities: "Cities",
      portfolio: "Project Gallery",
      contacts: "Contacts",
      booking: "Submit request",
      marquees: "Marquee Rental",
      catering: "Premium Catering",
      decor: "Design & Decor",
      configurator: "Estimate Configurator",
      description:
        "Creating exceptional private and corporate events worldwide. Flawless logistics, spatial architecture, and premium-level gastronomy.",
      companyTitle: "Company",
      solutionsTitle: "Solutions",
      journalTitle: "Coucou Journal",
      journalDesc:
        "Subscribe to be the first to receive implemented project cases and event industry trends.",
      emailPlaceholder: "Your email",
      ok: "OK",
      successSub: "Thank you for subscribing!",
      phoneLabel: "Phone",
      emailLabel: "Email",
      officeLabel: "Head Office",
      officeAddress: "24 Vagharsh Vagharshyan St, Yerevan 0012",
      allRights: "All rights reserved.",
      privacy: "Privacy Policy",
      terms: "Terms of Use",
    },
    esp: {
      about: "Nosotros",
      services: "Servicios",
      cities: "Ciudades",
      portfolio: "Galería de proyectos",
      contacts: "Contactos",
      booking: "Enviar solicitud",
      marquees: "Alquiler de carpas",
      catering: "Catering Prémium",
      decor: "Diseño y decoración",
      configurator: "Configurador de presupuesto",
      description:
        "Creamos eventos privados y corporativos excepcionales en todo el mundo. Logística impecable, arquitectura espacial y gastronomía de nivel prémium.",
      companyTitle: "Empresa",
      solutionsTitle: "Soluciones",
      journalTitle: "Coucou Journal",
      journalDesc:
        "Suscríbase para ser el primero en recibir casos de proyectos y tendencias de la industria.",
      emailPlaceholder: "Tu correo electrónico",
      ok: "OK",
      successSub: "¡Gracias por suscribirse!",
      phoneLabel: "Teléfono",
      emailLabel: "Correo electrónico",
      officeLabel: "Oficina principal",
      officeAddress: "Calle Vagharsh Vagharshyan 24, Ereván 0012",
      allRights: "Todos los derechos reservados.",
      privacy: "Política de Privacidad",
      terms: "Condiciones de Uso",
    },
    arm: {
      about: "Մեր մասին",
      services: "Ծառայություններ",
      cities: "Քաղաքներ",
      portfolio: "Նախագծերի պատկերասրահ",
      contacts: "Կապ",
      booking: "Թողնել հայտ",
      marquees: "Վրանների վարձույթ",
      catering: "Պրեմիում քեյթերինգ",
      decor: "Դիզայն և դեկոր",
      configurator: "Նախահաշվի կարգավորիչ",
      description:
        "Ստեղծում ենք բացառիկ մասնավոր և կորպորատիվ միջոցառումներ ողջ աշխարհում: Անթերի լոգիստիկա, տարածության ճարտարապետություն և բարձրակարգ գաստրոնոմիա:",
      companyTitle: "Ընկերություն",
      solutionsTitle: "Լուծումներ",
      journalTitle: "Coucou Journal",
      journalDesc:
        "Բաժանորդագրվեք՝ առաջինը ստանալու իրականացված նախագծերի օրինակները և իվենթ ինդուստրիայի միտումները:",
      emailPlaceholder: "Ձեր էլ. հասցեն",
      ok: "Լավ",
      successSub: "Շնորհակալություն բաժանորդագրության համար:",
      phoneLabel: "Հեռախոսահամար",
      emailLabel: "Էլեկտրոնային փոստ",
      officeLabel: "Գլխավոր գրասենյակ",
      officeAddress: "Վաղարշ Վաղարշյան 24, Երևան 0012",
      allRights: "Բոլոր իրավունքները պաշտպանված են:",
      privacy: "Գաղտնիության քաղաքականություն",
      terms: "Օգտագործման պայմաններ",
    },
  }[lang as "ru" | "eng" | "esp" | "arm"] || {
    about: "О нас",
    services: "Услуги",
    cities: "Города",
    portfolio: "Галерея проектов",
    contacts: "Контакты",
    booking: "Оставить заявку",
    marquees: "Аренда шатров",
    catering: "Премиум кейтеринг",
    decor: "Дизайн и декор",
    configurator: "Конфигуратор сметы",
    description:
      "Создаем исключительные частные и корпоративные события по всему миру.",
    companyTitle: "Компания",
    solutionsTitle: "Решения",
    journalTitle: "Coucou Journal",
    journalDesc: "Подпишитесь на наши обновления.",
    emailPlaceholder: "Ваш email",
    ok: "ОК",
    successSub: "Спасибо за подписку!",
    phoneLabel: "Телефон для связи",
    emailLabel: "Электронная почта",
    officeLabel: "Головной офис",
    officeAddress: "ул. Вагарша Вагаршяна 24, Ереван 0012",
    allRights: "Все права защищены.",
    privacy: "Политика конфиденциальности",
    terms: "Условия использования",
  };

  const phone = CONTACT.phone || "+7 (999) 123-45-67";
  const phoneHref = CONTACT.phoneHref || `tel:${phone.replace(/\s/g, "")}`;
  const email = CONTACT.email || "hello@coucou.events";
  const waHref =
    CONTACT.whatsappHref ||
    (CONTACT.whatsapp
      ? `https://wa.me/${String(CONTACT.whatsapp).replace(/\D/g, "")}`
      : "https://wa.me/");
  const tgHref = CONTACT.telegram || "https://t.me/";

  const linksCompany = [
    { label: t.about, href: `${prefix}/about` },
    { label: t.services, href: `${prefix}/services` },
    { label: t.cities, href: `${prefix}/cities` },
    { label: t.portfolio, href: `${prefix}/#portfolio` },
    { label: t.contacts, href: `${prefix}/contacts` },
    { label: t.booking, href: `${prefix}/booking` },
  ];

  const linksInfrastructure = [
    {
      label: t.marquees,
      href: `${prefix}/services/marquees?service=marquees#calculator`,
    },
    {
      label: t.catering,
      href: `${prefix}/services/catering?service=catering#calculator`,
    },
    {
      label: t.decor,
      href: `${prefix}/services/decor?service=decor#calculator`,
    },
    { label: t.configurator, href: `${prefix}/configurator` },
  ];

  return (
    <footer
      class="bg-white text-zinc-900 border-t border-zinc-200 pt-16 pb-8 font-sans w-full"
      lang={lang}
    >
      <div class="max-w-6xl mx-auto px-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-10 mb-16">
          <div class="md:col-span-1">
            <a
              href={prefix}
              class="text-2xl font-serif font-semibold tracking-tight text-zinc-950 block mb-4"
            >
              Coucou
            </a>
            <p class="text-sm text-zinc-700 leading-relaxed font-normal max-w-xs">
              {t.description}
            </p>
          </div>

          <div>
            <h4 class="text-xs uppercase tracking-widest font-bold text-zinc-800 mb-4">
              {t.companyTitle}
            </h4>
            <ul class="space-y-2.5 text-sm">
              {linksCompany.map((link) => (
                <li>
                  <a
                    href={link.href}
                    class="text-zinc-800 font-medium hover:text-[#0d9488] transition-colors duration-150"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 class="text-xs uppercase tracking-widest font-bold text-zinc-800 mb-4">
              {t.solutionsTitle}
            </h4>
            <ul class="space-y-2.5 text-sm">
              {linksInfrastructure.map((link) => (
                <li>
                  <a
                    href={link.href}
                    class="text-zinc-800 font-medium hover:text-[#0d9488] transition-colors duration-150"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 class="text-xs uppercase tracking-widest font-bold text-zinc-800 mb-4">
              {t.journalTitle}
            </h4>
            <p class="text-sm text-zinc-700 font-normal mb-3 leading-relaxed">
              {t.journalDesc}
            </p>
            <form
              class="flex flex-col sm:flex-row gap-2"
              onSubmit={(e: SubmitEvent) => {
                e.preventDefault();
                alert(t.successSub);
              }}
            >
              <input
                type="email"
                placeholder={t.emailPlaceholder}
                required
                class="bg-zinc-50 border border-zinc-300 rounded-lg px-3 py-2.5 text-sm text-zinc-900 font-medium placeholder-zinc-500 focus:outline-none focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/20 w-full"
              />
              <button
                type="submit"
                class="bg-[#0d9488] hover:bg-[#0f766e] text-white text-sm font-semibold py-2.5 px-5 rounded-lg transition-colors duration-150 whitespace-nowrap active:scale-[0.98]"
              >
                {t.ok}
              </button>
            </form>
          </div>
        </div>

        <div class="border-t border-b border-zinc-200 py-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div class="flex flex-wrap gap-8">
            <div>
              <span class="block text-[11px] uppercase tracking-wider text-zinc-600 font-semibold mb-1">
                {t.phoneLabel}
              </span>
              <a
                href={phoneHref}
                class="text-base font-semibold text-zinc-950 hover:text-[#0d9488]"
              >
                {phone}
              </a>
            </div>
            <div>
              <span class="block text-[11px] uppercase tracking-wider text-zinc-600 font-semibold mb-1">
                {t.emailLabel}
              </span>
              <a
                href={`mailto:${email}`}
                class="text-base font-semibold text-zinc-950 hover:text-[#0d9488]"
              >
                {email}
              </a>
            </div>
            <div>
              <span class="block text-[11px] uppercase tracking-wider text-zinc-600 font-semibold mb-1">
                {t.officeLabel}
              </span>
              <span class="text-base font-medium text-zinc-800">
                {t.officeAddress}
              </span>
            </div>
          </div>

          <div class="flex items-center space-x-3">
            <a
              href={tgHref}
              target="_blank"
              rel="noopener noreferrer"
              class="text-xs font-semibold text-zinc-700 border border-zinc-300 hover:border-sky-500 hover:bg-sky-50 hover:text-sky-700 rounded-lg px-3 py-2 transition-colors duration-200"
            >
              Telegram
            </a>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              class="text-xs font-semibold text-zinc-700 border border-zinc-300 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg px-3 py-2 transition-colors duration-200"
            >
              WhatsApp
            </a>
            <a
              href="https://instagram.com/"
              target="_blank"
              rel="noopener noreferrer"
              class="text-xs font-semibold text-zinc-700 border border-zinc-300 hover:border-amber-500 hover:bg-amber-50 hover:text-amber-700 rounded-lg px-3 py-2 transition-colors duration-200"
            >
              Instagram
            </a>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-zinc-600 font-medium">
          <div>
            &copy; {currentYear} Coucou Events. {t.allRights}
          </div>
          <div class="flex space-x-4">
            <a
              href={`${prefix}/privacy`}
              class="hover:text-zinc-950 transition-colors font-medium"
            >
              {t.privacy}
            </a>
            <span class="text-zinc-400">&middot;</span>
            <a
              href={`${prefix}/terms`}
              class="hover:text-zinc-950 transition-colors font-medium"
            >
              {t.terms}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
