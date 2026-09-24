# Coucou Events

**AI-powered event agency platform** — multilingual sales website + autonomous sales agent that qualifies leads across Telegram, WhatsApp, Email and web forms, writes to Notion CRM, and hands off hot leads to humans.

**Live site:** [coucou-events.com](https://coucou-events.com)  
**Product status:** Production (VPS + PM2)

---

## What this is

Coucou Events is not a demo chatbot. It is an operating system for an event business:

| Layer | Role |
|--------|------|
| **Website** (Astro) | Multilingual marketing site, booking & contact forms, service content |
| **Sales Agent** (Node.js) | 24/7 manager “Anna” — qualifies, answers objections, saves leads, escalates |
| **CRM** (Notion) | Lead pipeline with stage, budget, city, language, source |
| **Channels** | Telegram · WhatsApp · Email (Brevo) · Website APIs |

### Agent capabilities

- **4 languages:** Russian, English, Spanish, Armenian
- **Funnel logic:** greeting → qualification → proposal → objections → closing
- **Lead scoring** + one-shot **hot-lead** alerts to the manager
- **Human takeover:** manager messages pause the bot; history stays in context
- **Voice messages** → Groq Whisper transcription
- **SQLite** session store + analytics events
- **Cost controls:** token / Whisper / email daily limits + alerts
- **Fail-safe CRM:** Notion queue with retry when the API is down

Technical deep-dive for operators: **[AGENTS.md](./AGENTS.md)**.

---

## Architecture (simplified)
Client
├─ Website forms ──► /api/contact | /api/booking ──► Telegram + Notion + auto-reply
├─ Telegram / WhatsApp / Email ──► agent-v2.js ──► Groq LLM
│                                      ├─ SQLite sessions + events
│                                      ├─ Notion CRM
│                                      └─ RAG (service MDX)
└─ Manager ──► /stop /start /status · manual replies (bot pauses)
text---

## Tech stack

| Area | Stack |
|------|--------|
| Frontend | Astro 7, Solid, Tailwind, MDX |
| Agent | Node.js ≥22, PM2 |
| LLM | Groq (`openai/gpt-oss-120b` + fallback) |
| CRM | Notion API v5 |
| Messaging | GramJS (Telegram), whatsapp-web.js, Brevo |
| Storage | SQLite (sessions + analytics) |
| Infra | Ubuntu VPS, Nginx, Docker-ready |

---

## Quick start (development)

```bash
pnpm install
cp .env.example .env   # fill secrets — never commit .env

# Website
pnpm dev               # http://localhost:4321

# Agent (separate process)
node agent-v2.js
# or: pm2 start ecosystem.config.cjs
Production details: AGENTS.md.

Repository structure
text├── agent/              # Sales agent modules
├── agent-v2.js         # Agent entrypoint
├── src/                # Astro site
├── AGENTS.md           # Operator & architecture docs
├── ecosystem.config.cjs
├── docker-compose.yml
└── .env.example

Security

Secrets only via environment variables (see .env.example)
Agent HTTP API bound to 127.0.0.1 with shared secret
Report vulnerabilities: SECURITY.md

Runtime secrets, session databases, and customer PII are not committed.

License
Proprietary. All rights reserved. See LICENSE.
Unauthorized copying, distribution, or commercial use without a written agreement is prohibited.

Contact

Product: coucou-events.com
GitHub: ntrofimov59-hash/coucou_events
