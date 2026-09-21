// src/lib/notion-lead.ts — единая запись лидов с сайта в Notion v5
import { Client } from '@notionhq/client';

let client: Client | null = null;
let cachedDataSourceId: string | null = null;

function envStr(key: string): string {
  const raw =
    (import.meta.env as Record<string, string | undefined>)[key] ||
    (typeof process !== 'undefined' ? process.env?.[key] : undefined) ||
    '';
  return String(raw).trim().replace(/^["']|["']$/g, '');
}

function getClient(): Client | null {
  if (client) return client;
  const token = envStr('NOTION_TOKEN');
  if (!token) return null;
  client = new Client({ auth: token });
  return client;
}

async function getDataSourceId(): Promise<string | null> {
  if (cachedDataSourceId) return cachedDataSourceId;
  const c = getClient();
  const dbId = envStr('NOTION_DATABASE_ID');
  if (!c || !dbId) return null;
  try {
    const db = await c.databases.retrieve({ database_id: dbId });
    const ds = (db as any)?.data_sources?.[0];
    if (!ds?.id) return null;
    cachedDataSourceId = ds.id;
    return cachedDataSourceId;
  } catch (e) {
    console.error('notion-lead: databases.retrieve failed:', (e as Error).message);
    return null;
  }
}

function normalizeDate(raw?: string | null): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  let m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = '20' + y;
    const dd = d.padStart(2, '0');
    const mm = mo.padStart(2, '0');
    if (+mm < 1 || +mm > 12 || +dd < 1 || +dd > 31) return null;
    return `${y}-${mm}-${dd}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}

export type WebsiteLead = {
  name?: string;
  phone?: string;
  city?: string;
  eventDate?: string;
  guests?: string;
  budget?: string;
  service?: string;
  details?: string;
  source?: string;       // 'Website'
  language?: string;     // 'Russian' по умолчанию
  status?: string;       // 'New Lead'
};

async function findExistingLead(
  c: Client,
  dataSourceId: string,
  phone?: string,
  name?: string,
  city?: string,
): Promise<string | null> {
  const filters: any[] = [];
  if (phone && phone !== 'N/A') filters.push({ property: 'Phone', rich_text: { contains: phone } });
  if (name && name !== 'Клиент') filters.push({ property: 'Name', title: { contains: name } });
  if (city && city !== 'N/A') filters.push({ property: 'City', rich_text: { contains: city } });
  if (!filters.length) return null;
  try {
    const resp: any = await c.dataSources.query({
      data_source_id: dataSourceId,
      filter: { or: filters },
      page_size: 1,
    });
    return resp.results?.[0]?.id || null;
  } catch (e) {
    console.error('notion-lead: query failed:', (e as Error).message);
    return null;
  }
}

function buildProperties(fields: WebsiteLead) {
  const source = fields.source || 'Website';
  const detailsWithSource = `[${source}] ${fields.details || 'N/A'}`;
  const props: any = {
    Name: { title: [{ text: { content: fields.name || 'Клиент' } }] },
    Phone: { rich_text: [{ text: { content: fields.phone || 'N/A' } }] },
    City: { rich_text: [{ text: { content: fields.city || 'Уточняется' } }] },
    Details: { rich_text: [{ text: { content: detailsWithSource } }] },
    Status: { select: { name: fields.status || 'New Lead' } },
    Source: { select: { name: source } },
  };
  if (fields.language) props.Language = { select: { name: fields.language } };
  if (fields.language) props.Language = { select: { name: fields.language } };
  if (fields.source) props.Source = { select: { name: fields.source } };

  const iso = normalizeDate(fields.eventDate);
  if (iso) props.Date = { date: { start: iso } };

  const numericBudget = fields.budget ? Number(String(fields.budget).replace(/[^0-9]/g, '')) : null;
  if (numericBudget && !isNaN(numericBudget)) props.Budget = { number: numericBudget };

  return props;
}

/**
 * Пытается записать/обновить лид с сайта. Никогда не бросает исключение.
 */
export async function saveWebsiteLead(fields: WebsiteLead): Promise<{ ok: boolean; error?: string; id?: string }> {
  const c = getClient();
  if (!c) return { ok: false, error: 'NOTION_TOKEN не задан' };

  const dataSourceId = await getDataSourceId();
  if (!dataSourceId) return { ok: false, error: 'Не удалось получить data_source_id' };

  const existingId = await findExistingLead(c, dataSourceId, fields.phone, fields.name, fields.city);
  const properties = buildProperties(fields);

  // Попытка 1: полная схема
  try {
    if (existingId) {
      const r: any = await c.pages.update({ page_id: existingId, properties });
      console.log(`💾 notion-lead: обновлён [${fields.source || 'Website'}]`);
      return { ok: true, id: r.id };
    } else {
      const r: any = await c.pages.create({
        parent: { type: 'data_source_id', data_source_id: dataSourceId } as any,
        properties,
      });
      console.log(`💾 notion-lead: создан [${fields.source || 'Website'}]`);
      return { ok: true, id: r.id };
    }
  } catch (e: any) {
    const msg = e?.body?.message || e?.message || String(e);
    console.warn('notion-lead: попытка 1 упала:', msg);

    // Попытка 2: если схема базы не содержит select-полей — убираем их и повторяем
    // (сработает только при ошибке "is not a property that exists")
    if (/is not a property that exists/i.test(msg)) {
      delete properties.Source;
      delete properties.Language;
      if (properties.Status) delete properties.Status;
      console.log('notion-lead: retry без отсутствующих select-полей');
    } else {
      return { ok: false, error: msg };
    }
    try {
      if (existingId) {
        const r: any = await c.pages.update({ page_id: existingId, properties });
        console.log(`💾 notion-lead: обновлён (fallback, без select-полей)`);
        return { ok: true, id: r.id };
      } else {
        const r: any = await c.pages.create({
          parent: { type: 'data_source_id', data_source_id: dataSourceId } as any,
          properties,
        });
        console.log(`💾 notion-lead: создан (fallback)`);
        return { ok: true, id: r.id };
      }
    } catch (e2: any) {
      const msg2 = e2?.body?.message || e2?.message || String(e2);
      console.error('notion-lead: попытка 2 тоже упала:', msg2);
      return { ok: false, error: msg2 };
    }
  }
}
