// agent/notion-client.js — совместимость с Notion API v5
import { notion, DATABASE_ID } from './config.js';

let cachedDataSourceId = null;

export async function getDataSourceId() {
  if (cachedDataSourceId) return cachedDataSourceId;
  if (!DATABASE_ID) throw new Error('NOTION_DATABASE_ID не задан');
  const db = await notion.databases.retrieve({ database_id: DATABASE_ID });
  const ds = db?.data_sources?.[0];
  if (!ds?.id) throw new Error('У базы нет data_sources: ' + DATABASE_ID);
  cachedDataSourceId = ds.id;
  console.log('🗂 Notion data_source_id:', cachedDataSourceId);
  return cachedDataSourceId;
}

export async function queryDatabase({ filter, page_size = 1 } = {}) {
  const data_source_id = await getDataSourceId();
  const resp = await notion.dataSources.query({
    data_source_id,
    ...(filter ? { filter } : {}),
    page_size,
  });
  return resp.results || [];
}

export async function createPage(properties) {
  const data_source_id = await getDataSourceId();
  return notion.pages.create({
    parent: { type: 'data_source_id', data_source_id },
    properties,
  });
}

export async function updatePage(page_id, properties) {
  return notion.pages.update({ page_id, properties });
}
