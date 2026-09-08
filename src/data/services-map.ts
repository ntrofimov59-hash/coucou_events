// Общий список slug'ов услуг + отображаемые названия по языкам.
// Используется для перелинковки city <-> service страниц.
export const SERVICE_SLUGS = [
  "marquees",
  "catering",
  "decor",
  "photo-video",
  "entertainment",
  "transfer",
  "turnkey",
  "biotoilets",
  "ceremony",
] as const;

export const SERVICE_NAMES: Record<string, Record<string, string>> = {
  marquees: { ru: "Аренда шатров", eng: "Marquee rental", esp: "Alquiler de carpas", arm: "Վրանների վարձույթ" },
  catering: { ru: "Кейтеринг", eng: "Catering", esp: "Catering", arm: "Քեյթերինգ" },
  decor: { ru: "Декор", eng: "Decor", esp: "Decoración", arm: "Դեկոր" },
  "photo-video": { ru: "Фото и видео", eng: "Photo & video", esp: "Foto y video", arm: "Լուսանկար և վիդեո" },
  entertainment: { ru: "Развлекательная программа", eng: "Entertainment", esp: "Entretenimiento", arm: "Ժամանցային ծրագիր" },
  transfer: { ru: "Трансфер", eng: "Transfer", esp: "Traslado", arm: "Տրանսֆեր" },
  turnkey: { ru: "Организация под ключ", eng: "Turnkey planning", esp: "Organización integral", arm: "Կազմակերպում՝ բանալի ձեռքին" },
  biotoilets: { ru: "Био-модули", eng: "Restroom trailers", esp: "Baños móviles", arm: "Կենսատուալետներ" },
  ceremony: { ru: "Организация церемонии", eng: "Ceremony planning", esp: "Organización de ceremonia", arm: "Արարողության կազմակերպում" },
};
