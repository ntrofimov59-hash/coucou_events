// src/lib/auto-reply.ts — автоответ клиенту на 4 языках
export type AutoReplyLang = 'ru' | 'en' | 'es' | 'hy';

const TEMPLATES: Record<AutoReplyLang, (name: string) => { subject: string; text: string }> = {
  ru: (name) => ({
    subject: 'Coucou Events — ваша заявка принята',
    text:
`Здравствуйте${name ? ', ' + name : ''}!

Спасибо за обращение в Coucou Events. Мы получили вашу заявку и уже передали её менеджеру.

Мы свяжемся с вами в течение рабочего дня, обычно быстрее. Если вопрос срочный — просто ответьте на это письмо.

С уважением,
Команда Coucou Events
coucou-events.com`,
  }),
  en: (name) => ({
    subject: 'Coucou Events — we received your request',
    text:
`Hello${name ? ', ' + name : ''}!

Thank you for contacting Coucou Events. We have received your request and passed it to our manager.

We will get back to you within one business day, usually sooner. If it is urgent — just reply to this email.

Best regards,
Coucou Events Team
coucou-events.com`,
  }),
  es: (name) => ({
    subject: 'Coucou Events — hemos recibido tu solicitud',
    text:
`¡Hola${name ? ', ' + name : ''}!

Gracias por contactar con Coucou Events. Hemos recibido tu solicitud y ya la hemos pasado a nuestro gerente.

Te responderemos dentro de un día hábil, normalmente antes. Si es urgente, responde a este correo.

Saludos cordiales,
Equipo Coucou Events
coucou-events.com`,
  }),
  hy: (name) => ({
    subject: 'Coucou Events — Ձեր հարցումը ստացվել է',
    text:
`Բարև Ձեզ${name ? ', ' + name : ''}։

Շնորհակալություն Coucou Events-ին դիմելու համար։ Ձեր հարցումը ստացվել է և փոխանցվել է մեր մենեջերին։

Մենք կկապվենք Ձեզ հետ մեկ աշխատանքային օրվա ընթացքում, սովորաբար ավելի արագ։ Եթե հարցը հրատապ է՝ պատասխանեք այս նամակին։

Հարգանքով՝
Coucou Events թիմ
coucou-events.com`,
  }),
};

export function buildAutoReply(lang: string | undefined, name: string | undefined) {
  const l: AutoReplyLang = (['ru', 'en', 'es', 'hy'] as const).includes((lang as AutoReplyLang))
    ? (lang as AutoReplyLang)
    : 'ru';
  return TEMPLATES[l](name || '');
}
