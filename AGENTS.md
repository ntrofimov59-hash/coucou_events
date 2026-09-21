# Coucou Events — AI Sales Agent

Автоматический менеджер продаж для агентства Coucou Events. Ведёт диалоги
с клиентами на 4 языках, квалифицирует лиды, пишет в Notion CRM, отвечает
на email, эскалирует на человека.

## Архитектура
Пользователь
│
├── Telegram ────┐
├── Website ─────┼──► agent/ ──► Groq LLM (openai/gpt-oss-120b)
└── Email ───────┘ │ │
│ ├── Notion CRM (v5 API)
│ ├── RAG (MDX услуги)
│ └── Brevo (email reply)
│
└── Site: /api/* ──► Notion + autoreply

text

## Компоненты

### Агент (Node.js, отдельный PM2-процесс)

| Файл | Роль |
|------|------|
| `agent-v2.js` | Точка входа: стартует каналы, HTTP-сервер, cron |
| `agent/config.js` | Конфиг: модель, языки, пути, Chrome |
| `agent/language.js` | Определение языка по Unicode + словам |
| `agent/store.js` | Персистентные сессии в `agent/data/sessions.json` |
| `agent/knowledge.js` | RAG по `src/content/services/{ru,eng,esp,arm}/*.mdx` |
| `agent/notion-client.js` | Notion v5 (dataSources API) + кэш data_source_id |
| `agent/core.js` | LLM-вызовы, CRM-блок, извлечение профиля, этапы воронки |
| `agent/prompts/index.js` | Системные промпты на 4 языках |
| `agent/channels.js` | Telegram + WhatsApp + Email (IMAP) — точки входа |
| `agent/control.js` | Пауза бота (human takeover), /stop /start /status |
| `agent/guard.js` | Anti-spam: dedup 30с, rate limit 8/мин, мут 5мин |
| `agent/followup.js` | Автодожим 1д / 3д (cron в agent-v2.js) |
| `agent/email-inbound.js` | Обработка входящего письма агентом |
| `agent/http-server.js` | Локальный HTTP на 127.0.0.1:3001 для сайта |

### Сайт (Astro, PM2-процесс `coucou-site`)

| Файл | Роль |
|------|------|
| `src/pages/api/contact.ts` | Форма "Связаться" → Telegram + Notion + autoreply |
| `src/pages/api/booking.ts` | Форма "Бронирование" → Telegram + Notion + autoreply |
| `src/pages/api/email-webhook.ts` | Brevo Inbound webhook → agent → Notion + reply + forward |
| `src/lib/notion-lead.ts` | Общий Notion v5 клиент с fallback для отсутствующих полей |
| `src/lib/mailer.ts` | Brevo HTTP API (443) с SMTP fallback |
| `src/lib/auto-reply.ts` | Шаблоны автоответов на 4 языках |

## Каналы

### Telegram (user account через GramJS)

- **Аккаунт:** `@coucou_events` (id 8803927464)
- **Сессия:** `TELEGRAM_STRING_SESSION` в `.env`
- **Поведение:**
  - слушает все входящие `NewMessage({ incoming: true })`
  - фильтрует `SKIP_CHAT_IDS` (BOOKING_CHAT_ID, ANALYTICS_CHAT_ID)
  - пропускает алерты `🚨 Эскалация:`
  - отвечает от имени пользователя Cou

### WhatsApp (whatsapp-web.js + Chromium)

- **Аккаунт:** номер Cou, сессия в `.wwebjs_auth/session-coucou-anna/`
- **Chromium:** `/snap/bin/chromium` через `CHROME_PATH` в `.env`
- **UA:** Chrome/131 (WhatsApp Web блокирует старый UA Chrome/101)
- **Web cache:** `webVersionCache` в `channels.js` — фиксирует версию WA Web
- **Голосовые:** `msg.type === 'ptt' | 'audio'` → Whisper
- **Скан QR:** если сессия слетела — `pm2 stop coucou-agent-v2 && node agent-v2.js`, отсканировать, Ctrl+C, `pm2 start`
- **Переподключение:** при потере сессии — новый скан QR (обычно раз в 2+ недели)

### Website

- Формы `ContactForm.astro` и `BookingForm.astro` → `POST /api/contact/` / `/api/booking/`
- Endpoint: отправляет в Telegram → пишет в Notion → если email в форме, отправляет автоответ
- Заявка не падает, если Notion недоступен (fail-safe)

### Голосовые сообщения (Telegram + WhatsApp)

- **Модуль:** `agent/voice.js`
- **Провайдер:** Groq Whisper (`whisper-large-v3-turbo`) — тот же API-ключ, что LLM
- **Free tier:** 28 800 аудио-секунд/день (~8 часов), 25 МБ на файл
- **Лимит на сообщение:** `MAX_AUDIO_SECONDS=120` (отсекаем длинные, чтобы не сжигать квоту)
- **Поток:**
  1. Telegram: `message.voice` / `message.audio` → `client.downloadMedia()`
  2. WhatsApp: `msg.type === 'ptt' | 'audio'` → `msg.downloadMedia()`
  3. `transcribeVoice()` — скачивает во временный файл, отправляет в Groq
  4. Whisper возвращает `text` + `language` + `duration`
  5. Текст идёт в `handleIncoming()` как обычное сообщение
- **Язык:** Whisper определяет автоматически; агент отвечает на нём же
- **Стоимость:** $0 на free tier

### Email (Brevo Inbound)

- **Домен:** `coucou-events.com` (верифицирован в Brevo)
- **Поддомен для приёма:** `reply.coucou-events.com` (MX → inbound1.sendinblue.com)
- **Porkbun Email Forwarding:**
  - `info@coucou-events.com` → `coucou.events11@gmail.com` (старое, работает)
  - `info@coucou-events.com` → `inbox@reply.coucou-events.com` (новое, для агента)
- **Поток:**
  1. Письмо на `info@` → Porkbun → Brevo Inbound
  2. Brevo POST → `https://coucou-events.com/api/email-webhook/` (Bearer auth)
  3. Endpoint отвечает `200 OK` мгновенно (fire-and-forget)
  4. Фон: `POST 127.0.0.1:3001/email-inbound` → агент → ответ
  5. Ответ клиенту через Brevo API + копия на `FORWARD_EMAIL`

## Переменные окружения

Ключевые (полный список — `.env`):
Telegram
TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_STRING_SESSION
BOOKING_BOT_TOKEN, BOOKING_CHAT_ID # алерт-бот для заявок
ANALYTICS_BOT_TOKEN, ANALYTICS_CHAT_ID # weekly report

LLM
GROQ_API_KEY
GROQ_MODEL=openai/gpt-oss-120b # можно переопределить

Notion
NOTION_TOKEN, NOTION_DATABASE_ID

Brevo (email)
BREVO_API_KEY # xkeysib-...
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=2525 # 587/465 закрыты VPS, 2525 открыт
SMTP_USER=b531f6001@smtp-brevo.com
SMTP_PASS=xsmtpsib-... # SMTP Key (не API key!)
SMTP_FROM="Coucou Events coucou.events11@gmail.com"

Website
INBOUND_WEBHOOK_SECRET=<hex 32 bytes> # Bearer для Brevo
INBOUND_FROM_EMAIL=info@coucou-events.com
FORWARD_EMAIL=coucou.events11@gmail.com
AGENT_HTTP_PORT=3001
AGENT_HTTP_SECRET=<hex 32 bytes>

Флаги каналов
ENABLE_TELEGRAM=1
ENABLE_WHATSAPP=0 # 1 — включить (нужен QR)
ENABLE_EMAIL=0 # 1 — включить IMAP (порт 993 заблокирован)

text

**Правила:**
- Секреты без кавычек, значения с пробелами — в кавычках (`SMTP_FROM`)
- Никогда не коммитить `.env` (в `.gitignore`)
- После изменения `.env`: `pm2 restart <app> --update-env`

## Запуск и управление

```bash
# Первый запуск (после сборки сайта)
cd ~/coucou_events
pnpm build
pm2 start ecosystem.config.cjs

# Обычные команды
pm2 list                                  # статус
pm2 logs coucou-agent-v2                  # живые логи агента
pm2 logs coucou-site                      # логи сайта
pm2 restart coucou-agent-v2 --update-env  # перезапуск с новым .env
pm2 flush coucou-agent-v2                 # очистить логи

# После правки agent/*
pnpm build                                # (только если менял src/, для agent не нужно)
pm2 restart coucou-agent-v2

# После правки src/ (сайт)
pnpm build
pm2 restart coucou-site --update-env
Notion CRM
База: coucou db, id в NOTION_DATABASE_ID.

Схема полей:

Name (title), Phone (rich_text), City (rich_text)

Language (select: Russian/English/Spanish/Armenian)

Details (rich_text): [Source] Сводка запроса

Status (select: New Lead/Qualification/Proposal/Negotiation/Paid/Rejected)

Date (date, ISO YYYY-MM-DD), Budget (number)

⚠️ Известная проблема: в базе отсутствует поле Source (select). Запись идёт в Details в виде [Website] .... Если добавить поле Source в Notion — код автоматически начнёт его заполнять, fallback не сработает.

Экономика токенов
Средний ход: ~2000 токенов (in ~1700 + out ~300)

Оптимизации: reasoning_effort: low, окно 6 ходов, RAG 2×300 симв только для сообщений ≥30 символов, без второго LLM-вызова при tool call

Groq free tier: 300 кредитов/день (у нас ~1000/день лимит по запросам)

100 диалогов × 5 ходов ≈ $0.25

Точки расширения
Добавить новый язык
agent/config.js → SUPPORTED_LANGS и LANG_NAMES

agent/prompts/index.js → добавить шаблон в MAP, STAGE_LABELS, FIELD_LABELS

agent/language.js → добавить правило определения

src/content/services/<код>/*.mdx → переводы услуг

src/lib/auto-reply.ts → шаблон автоответа

Добавить услугу
src/content/services/{ru,eng,esp,arm}/<slug>.mdx

agent/knowledge.js → SERVICE_HINTS[<slug>] (ключевые слова)

agent/core.js → extractProfile (regex) и SERVICE_ALIASES

Добавить канал
agent/channels.js → экспортировать startXChannel()

agent-v2.js → флаг ENABLE_X и вызов

.env → новая переменная

Известные проблемы
Проблема	Решение
SMTP 587/465 заблокированы VPS	Используем Brevo HTTP API (443)
IMAP 993 заблокирован	Email-канал агента выключен, Brevo Inbound работает
ModSecurity блокирует Brevo	location = /api/email-webhook/ { modsecurity off; } в nginx
Chrome path на macOS	getChromePath() автоопределяет Linux-пути
import.meta.env кэширует при билде	envStr() сначала смотрит process.env
Отладка
bash
# Проверка здоровья агента
curl -s http://127.0.0.1:3001/health \
  -H "x-agent-secret: $AGENT_HTTP_SECRET" | python3 -m json.tool

# Ручной вызов email-inbound (симуляция Brevo)
curl -s -X POST https://coucou-events.com/api/email-webhook/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $INBOUND_WEBHOOK_SECRET" \
  -d '{"items":[{"From":{"Address":"test@example.com"},"Subject":"test",
       "ExtractedMarkdownMessage":"хочу шатёр в Праге",
       "MessageId":"manual-'$(date +%s)'"}]}'

# Сессии агента (профили клиентов)
python3 -c "
import json,time
d = json.load(open('agent/data/sessions.json'))
for k,s in d.get('sessions',{}).items():
    print(k, '|', s['profile'].get('name'), '|', s['profile'].get('city'),
          '|', s['stage'], '|', int((time.time()-s['lastActivity']/1000))//60, 'min ago')
"

# Статус Brevo webhook
curl -s https://api.brevo.com/v3/webhooks/2197324 \
  -H "api-key: $BREVO_API_KEY" | python3 -m json.tool

# События Brevo Inbound
curl -s "https://api.brevo.com/v3/inbound/events?limit=10" \
  -H "api-key: $BREVO_API_KEY" | python3 -m json.tool
Git
bash
git log --oneline -10        # история
git status --short           # что не закоммичено
git push origin main         # после коммита
Не коммитим: .env, agent/data/, src.bak-*/, *.patch, *.bak-*.

Контакты
Сайт: https://coucou-events.com

GitHub: https://github.com/ntrofimov59-hash/coucou_events

VPS: root@coucou-agent-vps (Ubuntu, Node 22, PM2, Nginx, ModSecurity)

Клиентская почта: info@coucou-events.com → coucou.events11@gmail.com
