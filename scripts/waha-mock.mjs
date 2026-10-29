#!/usr/bin/env node
// WAHA tiruan untuk menguji bot WhatsApp di lokal tanpa nomor WhatsApp sungguhan (docs/platform/WHATSAPP-BOT-SPEC.md §8).
//
//   node scripts/waha-mock.mjs serve [--port 3999] [--webhook URL]
//     Server tiruan WAHA: POST /api/sendText dan /api/sendSeen dicatat di konsol, GET /api/{session}/lids/{lid}
//     menjawab tanpa nomor, GET /__sent memberi daftar pesan terkirim (JSON). Seperti WAHA asli, setiap sendText
//     dipantulkan ke webhook sebagai event message.any (fromMe, source "api"), jadi bot diuji tidak menjeda dirinya sendiri.
//     X-Api-Key wajib sama dengan WAHA_API_KEY bila variabel itu diisi.
//   node scripts/waha-mock.mjs send --from 6282222222222 --text "Halo" [--name Budi] [--event message|message.any]
//                                   [--from-me] [--source app|api] [--id ID] [--webhook URL]
//     Kirim satu event pesan bertanda tangan HMAC-SHA512 (WAHA_HMAC_KEY) ke webhook, lalu tampilkan jawabannya.
//
// Webhook bawaan: WAHA_WEBHOOK_URL atau http://127.0.0.1:8000/api.php?action=waha_webhook (php -S … -t backend).
// Session: WAHA_SESSION atau "default". Nomor bisnis tiruan: 6281000000000.
import crypto from 'node:crypto';
import http from 'node:http';

const BOT_NUMBER = '6281000000000';
const args = process.argv.slice(2);
const command = args[0];
const option = (name, fallback = '') => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && index + 1 < args.length ? args[index + 1] : fallback;
};
const flag = (name) => args.includes(`--${name}`);
const session = process.env.WAHA_SESSION || 'default';
const webhook = option('webhook', process.env.WAHA_WEBHOOK_URL || 'http://127.0.0.1:8000/api.php?action=waha_webhook');
const chatIdOf = (value) => (value.includes('@') ? value : `${value.replace(/\D+/g, '')}@c.us`);

/** POST event bertanda tangan ke webhook: { status, body }. */
async function postEvent(event) {
  const key = process.env.WAHA_HMAC_KEY || '';
  if (key === '') throw new Error('WAHA_HMAC_KEY belum diisi (harus sama dengan kunci di server API).');
  const raw = JSON.stringify(event);
  const response = await fetch(webhook, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Request-Id': `req_${crypto.randomUUID()}`,
      'X-Webhook-Timestamp': String(Date.now()),
      'X-Webhook-Hmac': crypto.createHmac('sha512', key).update(raw).digest('hex'),
      'X-Webhook-Hmac-Algorithm': 'sha512',
    },
    body: raw,
  });
  return { status: response.status, body: await response.text() };
}

/** Event WAHA "message"/"message.any" (bentuk payload engine WEBJS). */
function messageEvent({ event = 'message', from, to, fromMe = false, source = 'app', text, name = '', id }) {
  const now = Date.now();
  return {
    id: `evt_${crypto.randomUUID().replace(/-/g, '').slice(0, 26)}`,
    timestamp: now,
    event,
    session,
    me: { id: `${BOT_NUMBER}@c.us`, pushName: 'Garuda Nexa' },
    engine: 'WEBJS',
    environment: { tier: 'CORE', version: 'mock' },
    payload: {
      id: id || `${fromMe}_${fromMe ? to : from}_${crypto.randomBytes(10).toString('hex').toUpperCase()}`,
      timestamp: Math.floor(now / 1000),
      from,
      fromMe,
      source,
      to,
      body: text,
      hasMedia: false,
      ack: 1,
      vCards: [],
      _data: name ? { notifyName: name } : {},
    },
  };
}

async function send() {
  const from = chatIdOf(option('from', '6282222222222'));
  const fromMe = flag('from-me');
  const event = messageEvent({
    event: option('event', fromMe ? 'message.any' : 'message'),
    // Pesan dari nomor bisnis: from = nomor bot, to = chat klien (seperti WAHA)
    from: fromMe ? `${BOT_NUMBER}@c.us` : from,
    to: fromMe ? from : `${BOT_NUMBER}@c.us`,
    fromMe,
    source: option('source', 'app'),
    text: option('text', 'Halo'),
    name: option('name'),
    id: option('id'),
  });
  const result = await postEvent(event);
  console.log(`webhook → HTTP ${result.status} ${result.body}`);
  console.log(`id pesan: ${event.payload.id}`);
}

function serve() {
  const port = Number(option('port', '3999'));
  const apiKey = process.env.WAHA_API_KEY || '';
  const sent = [];
  const reply = (res, status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      const url = new URL(req.url || '/', `http://${req.headers.host}`);
      if (req.method === 'GET' && url.pathname === '/__sent') return reply(res, 200, sent);
      if (apiKey !== '' && req.headers['x-api-key'] !== apiKey) {
        console.log(`[WAHA tiruan] ${req.method} ${url.pathname} ditolak: X-Api-Key salah`);
        return reply(res, 401, { message: 'Unauthorized' });
      }
      const lid = url.pathname.match(/^\/api\/([^/]+)\/lids\/([^/]+)$/);
      if (req.method === 'GET' && lid) return reply(res, 200, { lid: decodeURIComponent(lid[2]), pn: null });
      let body = {};
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch {
        return reply(res, 400, { message: 'JSON tidak valid' });
      }
      if (req.method === 'POST' && url.pathname === '/api/sendSeen') {
        console.log(`[WAHA tiruan] sendSeen ${body.chatId}`);
        return reply(res, 200, {});
      }
      if (req.method === 'POST' && url.pathname === '/api/sendText') {
        if (body.session !== session) return reply(res, 422, { message: `Session "${body.session}" tidak ada` });
        const id = `true_${body.chatId}_${crypto.randomBytes(10).toString('hex').toUpperCase()}`;
        sent.push({ id, chatId: body.chatId, text: body.text, at: new Date().toISOString() });
        console.log(`[WAHA tiruan] sendText → ${body.chatId}\n${String(body.text).replace(/^/gm, '    ')}`);
        reply(res, 201, { id, body: body.text, fromMe: true, to: body.chatId });
        // WAHA asli memantulkan kiriman API sebagai message.any (fromMe, source api)
        const echo = messageEvent({ event: 'message.any', from: `${BOT_NUMBER}@c.us`, to: body.chatId, fromMe: true, source: 'api', text: body.text, id });
        postEvent(echo).catch((err) => console.log(`[WAHA tiruan] gema message.any gagal: ${err.message}`));
        return undefined;
      }
      return reply(res, 404, { message: `${req.method} ${url.pathname} tidak ada di WAHA tiruan` });
    });
  });
  server.listen(port, '127.0.0.1', () => console.log(`[WAHA tiruan] http://127.0.0.1:${port} (session "${session}", webhook ${webhook})`));
}

if (command === 'serve') {
  serve();
} else if (command === 'send') {
  send().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
} else {
  console.log('Pakai: node scripts/waha-mock.mjs serve | send --from <nomor> --text "<pesan>" (lihat kepala berkas ini)');
  process.exit(command ? 1 : 0);
}
