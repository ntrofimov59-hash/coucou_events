# Handoff checklist (Coucou Events)

## Included in sale
- [ ] Git repository (source code)
- [ ] AGENTS.md operator guide
- [ ] .env.example (no secrets)
- [ ] Domain DNS control: yes / no / date of transfer
- [ ] Google Business Profile: transfer process
- [ ] Yandex Business: transfer process
- [ ] Ad accounts (Google / Yandex / Meta): transfer or recreate
- [ ] Notion CRM: share workspace or export template
- [ ] Hosting/VPS: transfer / buyer uses own

## Not included (buyer creates own)
- API keys (Groq, Notion, Telegram, Brevo, …)
- Telegram / WhatsApp login sessions
- Production database with customer PII (optional anonymized sample)

## How to run (minimal)
1. Node >= 22, pnpm install
2. cp .env.example .env and fill keys
3. pnpm build && deploy site
4. node agent-v2.js (or pm2)
5. See AGENTS.md for channels and Notion schema

## Support after sale
- Days of email support: ___ (e.g. 7–14)
- Not included: new features, ad spend, ongoing SMM

## Honest limitations
- Revenue not guaranteed
- WhatsApp depends on whatsapp-web.js / browser session
- Email inbound needs Brevo (or equivalent) webhook setup
