# Security Policy

## Supported versions

| Component | Supported |
|-----------|-----------|
| `main` branch (production) | Yes |
| Experimental forks / local branches | No |

## Reporting a vulnerability

If you find a security issue in Coucou Events (website, agent, or configs in this repository):

1. **Do not** open a public GitHub issue for sensitive vulnerabilities.
2. Contact the repository owner privately (GitHub Security Advisory if enabled, or the email on the GitHub profile).
3. Include: short description, steps to reproduce, affected path (`agent/`, `src/pages/api/`, etc.), and impact if known.

We aim to acknowledge reports within **72 hours** and give a status update within **7 days**.

## Scope

**In scope**

- Unauthorized access to agent HTTP endpoints
- XSS / injection on public pages or API handlers
- Secrets accidentally exposed in committed files
- Auth or privilege issues in our Notion / messaging integration code

**Out of scope**

- Bugs only in third-party services (Groq, Notion, Telegram, WhatsApp, Brevo)
- Social engineering of staff accounts
- Load / rate-limit abuse against third-party APIs

## Operator notes

- Never commit `.env`, `agent/data/*.db`, session dumps, or API keys
- Use strong, rotated values for `AGENT_HTTP_SECRET` and webhook secrets
- Keep agent admin HTTP on `127.0.0.1`; terminate TLS at Nginx
- Protect Telegram/WhatsApp session files and Chromium profiles on the VPS
