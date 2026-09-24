// agent/notion-queue.js — отложенная очередь для лидов, если Notion недоступен
// ВАЖНО: импортируем saveOrUpdateLeadDirect, а не обёртку — иначе бесконечный enqueue
import fs from 'fs';
import path from 'path';
import { saveOrUpdateLeadDirect } from './core.js';

const QUEUE_PATH = path.resolve(
  new URL('./data/', import.meta.url).pathname,
  'pending-leads.json'
);

function ensureDir() {
  fs.mkdirSync(path.dirname(QUEUE_PATH), { recursive: true });
}

function readQueue() {
  if (!fs.existsSync(QUEUE_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8')) || [];
  } catch (e) {
    console.error('notion-queue: read failed:', e.message);
    return [];
  }
}

function writeQueue(items) {
  ensureDir();
  try {
    const tmp = QUEUE_PATH + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(items, null, 2));
    fs.renameSync(tmp, QUEUE_PATH);
  } catch (e) {
    console.error('notion-queue: write failed:', e.message);
  }
}

export function enqueue(args) {
  const items = readQueue();
  items.push({ ...args, enqueuedAt: Date.now() });
  if (items.length > 500) items.splice(0, items.length - 500);
  writeQueue(items);
  console.log(`📥 notion-queue: enqueued (${items.length} в очереди)`);
}

export async function flushQueue() {
  const items = readQueue();
  if (!items.length) return { ok: true, flushed: 0, remaining: 0 };

  const remaining = [];
  let flushed = 0;

  for (const item of items) {
    const { enqueuedAt, ...args } = item;
    if (Date.now() - enqueuedAt > 24 * 60 * 60 * 1000) {
      console.warn(`notion-queue: drop stale (${new Date(enqueuedAt).toISOString()})`);
      continue;
    }
    try {
      await saveOrUpdateLeadDirect(args);
      flushed++;
      console.log(`📤 notion-queue: flushed [${args.clientName || '—'}]`);
    } catch (e) {
      console.error(`notion-queue: flush failed:`, e.message);
      remaining.push(item);
    }
  }

  if (flushed || remaining.length !== items.length) {
    writeQueue(remaining);
  }
  console.log(`📊 notion-queue: flushed=${flushed}, remaining=${remaining.length}`);
  return { ok: true, flushed, remaining: remaining.length };
}
