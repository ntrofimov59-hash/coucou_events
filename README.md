# Coucou Events — AI Sales Agent

> 🇷🇺 Russian version: [README.ru.md](README.ru.md)

![status](https://img.shields.io/badge/status-production-brightgreen)
![node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)
![license](https://img.shields.io/badge/license-BSL%201.1-orange)

**AI-driven sales manager for premium event agencies.** Handles inbound leads across 4 channels, qualifies them in 4 languages, writes structured data to Notion CRM, auto-replies to email, and escalates hot leads to a human manager — end-to-end.

Built for **Coucou Events** — an event agency operating in 15 cities across Europe, the Middle East, and Asia.

---

## Features

- **Multi-channel intake** — Telegram (gramJS / MTProto), WhatsApp (whatsapp-web.js), Email (Brevo webhook), Website form
- **4 languages** — Russian, English, Spanish, Armenian, with automatic detection per message
- **LLM pipeline** — Groq openai/gpt-oss-120b with automatic fallback to gpt-oss-20b
- **Lead scoring** — hot / warm / cold by city, date, service, guests, budget, contact
- **Auto-escalation** — hot leads trigger an instant notification to a human manager via Telegram
- **Notion CRM (v5 API)** — two-way sync, retry queue on network / 5xx failures
- **RAG** — retrieval over a service knowledge base (MDX, 36 documents)
- **Objection handling** — playbooks for price / think / compare / later / busy in 4 languages
- **Manager takeover** — a human can pause the bot per session; the bot resumes on command

---

## Architecture

    User
     |
     +--- Telegram ----+
     +--- WhatsApp ----+---> agent/ ---> Groq LLM (gpt-oss-120b)
     +--- Email -------+         |
     +--- Website -----+         +---> Notion CRM (v5 API)
                                 +---> RAG (MDX, 36 docs)
                                 +---> Brevo (email reply)

Full breakdown: docs/ARCHITECTURE.md

---

## Quick Start

Requirements: Node >= 20, pnpm >= 9, pm2 (global)

    git clone https://github.com/ntrofimov59-hash/coucou_events.git
    cd coucou_events
    pnpm install

    cp .env.example .env
    # fill in: GROQ_API_KEY, NOTION_TOKEN, NOTION_DB_ID,
    #          BOOKING_BOT_TOKEN, BOOKING_CHAT_ID

    pm2 start ecosystem.config.cjs
    pm2 logs coucou-agent-v2

Full setup guide: docs/SETUP.md

---

## Documentation

- Architecture: docs/ARCHITECTURE.md
- Setup: docs/SETUP.md
- API: docs/API.md
- Roadmap: docs/ROADMAP.md
- Pitch: docs/PITCH.md
- Changelog: CHANGELOG.md

---

## Tech Stack

- Runtime: Node.js >= 20 (ESM)
- LLM: Groq (openai/gpt-oss-120b + fallback gpt-oss-20b)
- Telegram: gramJS (MTProto)
- WhatsApp: whatsapp-web.js
- Email: Brevo (webhook + reply API)
- CRM: Notion API v5
- Web: Astro + Tailwind CSS
- Process manager: pm2
- Deploy: Ubuntu VPS (Docker optional)

---

## License

Business Source License 1.1 — source-available. Non-production use is free;
commercial use requires a license. Converts to Apache 2.0 on 2029-09-25.

See LICENSE for full terms.

---

## Author

Nikita Trofimov — @ntrofimov59-hash

(c) 2025-2026 Nikita Trofimov. All rights reserved.
                          │
                     ┌────▼────┐
                     │ agent/  │
                     └────┬────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   Groq LLM          Notion CRM        RAG (MDX)
(gpt-oss-120b)       (v5 API)         36 docs
        │
        └──► Brevo (email reply)
Full breakdown: docs/ARCHITECTURE.md

Quick Start
Requirements: Node ≥ 20 · pnpm ≥ 9 · pm2 (global)

bash
git clone https://github.com/ntrofimov59-hash/coucou_events.git
cd coucou_events
pnpm install

cp .env.example .env
# fill in: GROQ_API_KEY, NOTION_TOKEN, NOTION_DB_ID,
#          BOOKING_BOT_TOKEN, BOOKING_CHAT_ID

pm2 start ecosystem.config.cjs
pm2 logs coucou-agent-v2
Full setup guide: docs/SETUP.md

Documentation
Doc	Description
Architecture	Modules, data flow, LLM pipeline
Setup	Environment, dependencies, deploy
API	HTTP endpoints, webhooks
Roadmap	What's done, what's next
Pitch	Product / market / team
Changelog	Version history
Tech Stack
Layer	Tech
Runtime	Node.js ≥ 20 (ESM)
LLM	Groq (openai/gpt-oss-120b + fallback gpt-oss-20b)
Telegram	gramJS (MTProto)
WhatsApp	whatsapp-web.js
Email	Brevo (webhook + reply API)
CRM	Notion API v5
Web	Astro + Tailwind CSS
Process manager	pm2
Deploy	Ubuntu VPS (Docker optional)
License
Business Source License 1.1 — source-available. Non-production use is free; commercial use requires a license. Converts to Apache 2.0 on 2029-09-25.

See LICENSE.

Author
Nikita Trofimov — @ntrofimov59-hash

© 2025–2026 Nikita Trofimov. All rights reserved.
