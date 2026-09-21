// agent/http-server.js — мини HTTP-сервер на 127.0.0.1 для приёма задач от сайта
import http from 'http';
import { processInboundEmail } from './email-inbound.js';
import { stats, logStat } from './core.js';

const PORT = Number(process.env.AGENT_HTTP_PORT || 3001);
const SECRET = process.env.AGENT_HTTP_SECRET || '';

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 2_000_000) { reject(new Error('too large')); req.destroy(); } });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function json(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

export function startHttpServer() {
  const server = http.createServer(async (req, res) => {
    try {
      // auth
      const auth = req.headers['x-agent-secret'] || '';
      if (SECRET && auth !== SECRET) return json(res, 401, { ok: false, error: 'unauthorized' });

      if (req.method === 'POST' && req.url === '/email-inbound') {
        const raw = await readBody(req);
        let payload = {};
        try { payload = JSON.parse(raw || '{}'); } catch { return json(res, 400, { ok: false, error: 'bad_json' }); }

        const result = await processInboundEmail(payload);
        console.log('📨 email-inbound:', payload.from, '→', result.ok ? 'ok' : result.reason || 'skipped');
        return json(res, 200, result);
      }

      if (req.method === 'GET' && req.url === '/health') {
        return json(res, 200, { ok: true, stats });
      }

      return json(res, 404, { ok: false, error: 'not_found' });
    } catch (e) {
      console.error('http-server error:', e.message);
      return json(res, 500, { ok: false, error: e.message });
    }
  });

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`🌐 Agent HTTP server on 127.0.0.1:${PORT}`);
  });
  return server;
}
