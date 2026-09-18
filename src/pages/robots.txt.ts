import type { APIRoute } from 'astro';
import { SITE_URL } from '@/config/site';

export const GET: APIRoute = async () => {
  const robotsTxt = `
User-agent: *
Allow: /
Disallow: */thank-you
Disallow: */api/

# ИИ-краулеры для ответов и поиска — разрешены явно,
# чтобы не зависеть от общего правила и WAF-исключений
User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Perplexity-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-User
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot-Extended
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
  `.trim();

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
