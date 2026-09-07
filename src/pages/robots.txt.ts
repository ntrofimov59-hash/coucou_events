import type { APIRoute } from 'astro';
import { SITE_URL } from '@/config/site';

export const GET: APIRoute = async () => {
  const robotsTxt = `
User-agent: *
Allow: /
Disallow: */thank-you
Disallow: */api/

Sitemap: ${SITE_URL}/sitemap-index.xml
  `.trim();

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
