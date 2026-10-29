// @vitest-environment node
// Bot WhatsApp lewat WAHA (docs/platform/WHATSAPP-BOT-SPEC.md): backend/modules/waha.php (produksi cPanel) dan waha.js
// (Node) harus identik. Fungsi murni (tanda tangan HMAC, parsing event, permintaan admin, format balasan, riwayat,
// pengaturan) dijalankan di kedua backend dengan masukan yang sama lalu dibandingkan. Alur webhook & aksi admin dijalankan
// lengkap di atas database tiruan bernaskah (setiap kasus menyebut kueri yang diharapkan berurutan beserta barisnya),
// WAHA tiruan (setiap panggilan HTTP dicatat) dan AI tiruan: keduanya harus mengirim kueri, parameter, dan panggilan
// WAHA yang sama dan menjawab sama. Diuji: HMAC sah/salah/tanpa kunci, pesan ganda, grup/status/session lain, balasan
// AI, alih ke admin (ketik ADMIN, tombol widget, AI [[ADMIN]], AI mati/gagal), chat yang dijeda, balasan manual admin
// dari nomor bisnis, perintah SELESAI dari nomor admin, nomor @lid, pesan media. PHP lewat CLI (dilewati tanpa `php`).
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

vi.hoisted(() => {
  // security.js (createLimiter) membaca ini saat diimpor
  process.env.AUTH_SECRET = 's'.repeat(16) + Math.random().toString(36).slice(2).padEnd(24, 'k');
});
vi.mock('bcryptjs', () => ({ default: { hashSync: () => 'dummy', compare: async () => false, hash: async () => 'dummy' } }));

import {
  handleWahaAction,
  wahaAdminCommand,
  wahaAdminNotice,
  wahaBaseUrl,
  wahaChatKind,
  wahaConfigOut,
  wahaConfigResolve,
  wahaConfigWrites,
  wahaFormatReply,
  wahaHandleMessage,
  wahaHistoryJson,
  wahaHistoryMessages,
  wahaNormalizeChat,
  wahaNumber,
  wahaOrigin,
  wahaParseEvent,
  wahaSignatureOk,
  wahaWantsAdmin,
  wahaWebhook,
  WahaError,
} from '../../backend/modules/waha.js';
import { NEXA_ADMIN_WA_TEXT, adminWhatsappHref } from '../../src/components/layout/nexa/adminHandoff';

const ROOT = resolve(__dirname, '..', '..');
const WAHA_PHP = resolve(ROOT, 'backend', 'modules', 'waha.php');
const read = (...parts: string[]) => readFileSync(resolve(ROOT, ...parts), 'utf8');

// Kunci HMAC uji (bukan kunci produksi) dan contoh resmi dokumentasi WAHA (Webhooks → HMAC authentication)
const KEY = 'kunci-uji-hmac';
const DOC_BODY = '{"event":"message","session":"default","engine":"WEBJS"}';
const DOC_SIG = '208f8a55dde9e05519e898b10b89bf0d0b3b0fdf11fdbf09b6b90476301b98d8097c462b2b17a6ce93b6b47a136cf2e78a33a63f6752c2c1631777076153fa89';
const sign = (raw: string, key = KEY) => crypto.createHmac('sha512', key).update(raw).digest('hex');
const NOW = 1_793_000_000;

// ── Fungsi murni ──

const SIGNATURE_CASES: [string, string, string, string][] = [
  [DOC_BODY, DOC_SIG, 'sha512', 'my-secret-key'],
  [DOC_BODY, DOC_SIG.toUpperCase(), '', 'my-secret-key'],
  [DOC_BODY, ` ${DOC_SIG}\n`, 'SHA512', 'my-secret-key'],
  [DOC_BODY, DOC_SIG, 'sha256', 'my-secret-key'],
  [DOC_BODY, DOC_SIG, 'sha512', 'kunci-lain'],
  [`${DOC_BODY} `, DOC_SIG, 'sha512', 'my-secret-key'],
  [DOC_BODY, DOC_SIG.slice(0, 127), 'sha512', 'my-secret-key'],
  [DOC_BODY, DOC_SIG, 'sha512', ''],
  [DOC_BODY, '', '', 'my-secret-key'],
  ['{"teks":"émoji 😀"}', sign('{"teks":"émoji 😀"}', 'kunci 🔑'), 'sha512', 'kunci 🔑'],
];

const payload = (patch: Record<string, unknown> = {}) => ({
  id: 'false_6282222222222@c.us_3EB0AAA',
  timestamp: NOW - 5,
  from: '6282222222222@c.us',
  fromMe: false,
  source: 'app',
  to: '6281000000000@c.us',
  body: '  Halo, berapa harga template?  ',
  hasMedia: false,
  _data: { notifyName: 'Budi' },
  ...patch,
});
const body = (patch: Record<string, unknown> = {}, top: Record<string, unknown> = {}) => ({
  id: 'evt_01',
  timestamp: NOW * 1000,
  event: 'message',
  session: 'default',
  engine: 'WEBJS',
  payload: payload(patch),
  ...top,
});

const PARSE_CASES: unknown[][] = [
  [body(), 'default'],
  [body({}, { event: 'message.any' }), 'default'],
  [body({}, { event: 'message.ack' }), 'default'],
  [body({}, { session: 'lain' }), 'default'],
  [body({ from: '1203630@g.us' }), 'default'],
  [body({ from: 'status@broadcast' }), 'default'],
  [body({ from: '1203630@newsletter' }), 'default'],
  [body({ from: '6282222222222@s.whatsapp.net' }), 'default'],
  [body({ from: '6282222222222:12@c.us' }), 'default'],
  [body({ from: '123456789012345@lid', _data: { pushName: ' Sari\u0007 ' } }), 'default'],
  [body({ fromMe: true, source: 'api', from: '6281000000000@c.us', to: '6282222222222@c.us' }), 'default'],
  [body({ fromMe: true, to: '1203630@g.us' }), 'default'],
  [body({ timestamp: NOW - 7200 }), 'default'],
  [body({ timestamp: (NOW - 7200) * 1000 }), 'default'],
  [body({ body: '', hasMedia: true, _data: { Info: { PushName: 'Andi' } } }), 'default'],
  [body({ body: 'x'.repeat(1200) }), 'default'],
  [body({ id: '' }), 'default'],
  [body({ id: 5 }), 'default'],
  [{ event: 'message', session: 'default', payload: [] }, 'default'],
  [[], 'default'],
  ['teks', 'default'],
  [null, 'default'],
];

const WANTS_CASES = [
  'ADMIN', '#admin', 'admin dong', 'Tolong CS', 'manusia', 'human please', 'halo admin', 'kak admin', 'admin admin',
  'Saya mau bicara dengan admin', 'bisa hubungkan ke admin?', 'Customer Service?', 'mau ngobrol dengan orang asli, bukan bot',
  'apakah ada panel admin untuk mengelola isi website?', 'berapa harga template', '', '😀', NEXA_ADMIN_WA_TEXT,
  `${NEXA_ADMIN_WA_TEXT}\nPertanyaan saya: harga?`, 'Halo, saya butuh bantuan admin', 'talk to a human',
];

const FORMAT_CASES = [
  'Template **Aura Studio** (/template/aura-studio) cocok. Cek /harga atau /pesan-custom.',
  '[[ADMIN]]',
  'Baik. [[ admin ]]',
  '- **Corporate Website** untuk branding [proyek:f-corporate-website]\n- Kasir. Kode: [proyek:p-12]',
  '## Harga\n\n\n\nLihat [halaman harga](https://garudanexa.com/harga) dan garudanexa.com/harga, /hargaku, /tentang.',
  '   ',
  'Kunjungi /panduan/cara-memilih-domain (gratis) dan /template/kategori/sekolah.',
];

const HISTORY_CASES: [unknown, boolean, string][] = [
  [null, false, 'Halo'],
  [JSON.stringify([{ role: 'user', content: 'Hai' }, { role: 'assistant', content: 'Halo, ada yang bisa dibantu?' }]), false, 'Harga?'],
  [JSON.stringify([{ role: 'user', content: 'Hai' }, { role: 'assistant', content: 'Halo' }]), true, 'Baru'],
  [JSON.stringify([{ role: 'assistant', content: 'A' }, { role: 'user', content: 'B' }, { role: 'system', content: 'x' }, { role: 'user', content: '  ' }]), false, 'C'],
  [JSON.stringify(Array.from({ length: 15 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `pesan ${i}` }))), false, 'akhir'],
  [JSON.stringify([{ role: 'user', content: 'y'.repeat(900) }]), false, 'z'.repeat(300)],
  ['bukan json', false, 'Halo'],
  [JSON.stringify({ a: { role: 'user', content: 'objek' } }), false, 'lanjut'],
];

const COMMAND_CASES = ['SELESAI 6282222222222', 'selesai', 'Selesai: +62 822-2222-2222', 'SELESAI 082222222222', 'done 123456789012345', 'selesai bro', 'ok', ' SELESAI '];
const NUMBER_CASES = ['6281234567890', '0812-3456-7890', '+62 812 3456 7890', '12345', '1234567890123456', '', 'abc'];
const URL_CASES = [
  'https://waha.contoh.com', 'HTTPS://WAHA.Contoh.com:3000/', 'http://203.0.113.5:3000/waha/', 'https://waha.contoh.com?x=1',
  'https://user:pw@waha.contoh.com', 'ftp://waha.contoh.com', 'https://.waha.com', 'https://waha.contoh.com:70000', '', '  https://a.b  ',
];

const ENV = { url: 'https://waha.env.test', key: 'kunci-env', session: 'sesi-env', admin: '081111111111', hmac: true };
const RESOLVE_CASES: [Record<string, string>, Record<string, unknown>][] = [
  [{}, ENV],
  [{}, { url: '', key: '', session: '', admin: '', hmac: false }],
  [{ waha_url: 'https://waha.env.test/', waha_session: 'utama', waha_admin_number: '6282222222222', waha_pause_hours: '24' }, ENV],
  [{ waha_url: 'https://waha.lain.test' }, ENV],
  [{ waha_url: 'https://waha.lain.test', waha_api_key: 'kunci-db' }, ENV],
  [{ waha_enabled: '0', waha_session: 'bukan sesi!', waha_admin_number: '12', waha_pause_hours: '99' }, ENV],
  [{ waha_url: 'bukan alamat', waha_pause_hours: '0' }, { ...ENV, url: 'http://localhost:3000' }],
];

const WRITE_CASES: [Record<string, unknown>, Record<string, string>, Record<string, unknown>][] = [
  [{ enabled: true, url: 'https://waha.contoh.com/', session: 'default', admin_number: '0812 3456 7890', pause_hours: '6', key: 'kunci-baru' }, {}, ENV],
  [{ enabled: false, url: '', session: '', admin_number: '' }, { waha_url: 'https://waha.lama.test', waha_api_key: 'kunci-lama' }, ENV],
  [{ url: 'https://waha.baru.test' }, { waha_url: 'https://waha.lama.test', waha_api_key: 'kunci-lama' }, ENV],
  [{ url: 'https://waha.lama.test/api' }, { waha_url: 'https://waha.lama.test', waha_api_key: 'kunci-lama' }, ENV],
  [{ url: 'https://waha.baru.test', key: 'kunci-baru' }, { waha_url: 'https://waha.lama.test', waha_api_key: 'kunci-lama' }, ENV],
  [{ url: '' }, { waha_url: 'https://waha.lama.test', waha_api_key: 'kunci-lama' }, ENV],
  [{ key: null }, { waha_api_key: 'kunci-lama' }, ENV],
  [{ key: '   ' }, {}, ENV],
  [{ enabled: '0', pause_hours: 72 }, {}, ENV],
  [{ url: 'ftp://x.y' }, {}, ENV],
  [{ session: 'sesi spasi' }, {}, ENV],
  [{ admin_number: '123' }, {}, ENV],
  [{ pause_hours: '0' }, {}, ENV],
  [{ pause_hours: 'dua' }, {}, ENV],
  [{ key: 'ada spasi' }, {}, ENV],
  [{ key: 5 }, {}, ENV],
  [{ url: 5 }, {}, ENV],
];

const NOTICE_CASES: [string, string, string, string, string[], number][] = [
  ['Budi', '6282222222222', '6282222222222@c.us', 'permintaan', ['ADMIN'], 12],
  ['', '', '123456789012345@lid', 'ai_gagal', ['Halo', 'Harga paket?\nYang termurah'], 6],
  ['Sari', '6283333333333', '6283333333333@c.us', 'website', [], 1],
];

// ── Alur webhook & aksi admin di atas database tiruan bernaskah ──

type Step = { q: string; rows?: unknown[]; affected?: number; missing?: boolean };
type HttpReply = [number, unknown?];
type Call = { raw: string; hmac: string; algorithm?: string };
type FlowCase = {
  name: string;
  env?: Record<string, string>;
  steps: Step[];
  http?: HttpReply[];
  ai?: Record<string, unknown>;
  calls?: Call[];
  action?: string;
  input?: Record<string, unknown>;
};

const Q = {
  config: "WHERE setting_key IN ('waha_enabled'",
  seen: 'INSERT IGNORE INTO waha_seen',
  prune: 'DELETE FROM waha_seen',
  chat: 'FROM waha_chats WHERE chat_id = ? LIMIT 1',
  save: 'INSERT INTO waha_chats (chat_id, phone, name, history, last_message, last_in_at) VALUES',
  touch: 'UPDATE waha_chats SET last_message',
  handoff: 'INSERT INTO waha_chats (chat_id, phone, name, history, last_message, last_in_at, paused_until, handoff_status)',
  log: 'INSERT INTO waha_handoffs',
  adminReply: 'INSERT INTO waha_chats (chat_id, phone, paused_until)',
  handled: "SET status = 'ditangani'",
  resumeChat: 'SET paused_until = NULL',
  resumeLog: "SET status = 'selesai'",
  find: 'WHERE phone = ? OR chat_id = ?',
  waiting: "WHERE handoff_status IN ('menunggu', 'ditangani')",
  handoffs: 'FROM waha_handoffs h LEFT JOIN waha_chats c',
  upsert: 'INSERT INTO hero_settings',
  delete: 'DELETE FROM hero_settings WHERE setting_key = ?',
};

const BASE_ENV = {
  WAHA_HMAC_KEY: KEY,
  WAHA_URL: 'https://waha.uji.test',
  WAHA_API_KEY: 'api-uji',
  WAHA_SESSION: '',
  WAHA_ADMIN_NUMBER: '6281111111111',
  WAHA_DAILY_LIMIT: '',
};
const signed = (event: unknown): Call => {
  const raw = JSON.stringify(event);
  return { raw, hmac: sign(raw), algorithm: 'sha512' };
};
const accepted = (chatRow: Record<string, unknown> | null = null): Step[] => [
  { q: Q.config, rows: [] },
  { q: Q.seen, affected: 1 },
  { q: Q.prune },
  { q: Q.chat, rows: chatRow ? [chatRow] : [] },
];
const OLD_HISTORY = JSON.stringify([{ role: 'user', content: 'Hai' }, { role: 'assistant', content: 'Halo, ada yang bisa dibantu?' }]);

const FLOW_CASES: FlowCase[] = [
  { name: 'tanpa WAHA_HMAC_KEY → 503', env: { WAHA_HMAC_KEY: '' }, steps: [], calls: [signed(body())] },
  { name: 'tanda tangan salah → 401', steps: [], calls: [{ raw: JSON.stringify(body()), hmac: sign('lain'), algorithm: 'sha512' }] },
  { name: 'tanpa header tanda tangan → 401', steps: [], calls: [{ raw: JSON.stringify(body()), hmac: '' }] },
  { name: 'bot dimatikan admin', steps: [{ q: Q.config, rows: [{ setting_key: 'waha_enabled', setting_value: '0' }] }], calls: [signed(body())] },
  { name: 'grup diabaikan', steps: [{ q: Q.config, rows: [] }], calls: [signed(body({ from: '1203630@g.us' }))] },
  { name: 'status diabaikan', steps: [{ q: Q.config, rows: [] }], calls: [signed(body({ from: 'status@broadcast' }))] },
  { name: 'session lain diabaikan', steps: [{ q: Q.config, rows: [] }], calls: [signed(body({}, { session: 'lain' }))] },
  { name: 'event lain diabaikan', steps: [{ q: Q.config, rows: [] }], calls: [signed(body({}, { event: 'session.status' }))] },
  { name: 'tanpa alamat WAHA', env: { WAHA_URL: '' }, steps: [{ q: Q.config, rows: [] }], calls: [signed(body())] },
  { name: 'tabel belum dimigrasi → 503', steps: [{ q: Q.config, rows: [] }, { q: Q.seen, missing: true }], calls: [signed(body())] },
  {
    name: 'pesan ganda (message lalu message.any untuk id yang sama) diproses sekali',
    steps: [
      ...accepted({ phone: '6282222222222', name: 'Budi', history: OLD_HISTORY, handoff_status: '', paused: 0, stale: 0 }),
      { q: Q.save },
      { q: Q.config, rows: [] },
      { q: Q.seen, affected: 0 },
    ],
    ai: { reply: 'Harga template mulai **Rp990.000**. Cek /harga.' },
    calls: [signed(body()), signed(body({}, { event: 'message.any' }))],
  },
  {
    name: 'jawaban AI pertama: tautan lengkap, *tebal*, petunjuk ADMIN',
    steps: [...accepted(), { q: Q.save }],
    ai: { reply: 'Template **Aura Studio** (/template/aura-studio) cocok untuk klinik.' },
    calls: [signed(body({ body: 'Template untuk klinik?' }))],
  },
  {
    name: 'jawaban AI lanjutan memakai riwayat; riwayat basi diabaikan',
    steps: [...accepted({ phone: '6282222222222', name: 'Budi', history: OLD_HISTORY, handoff_status: 'selesai', paused: 0, stale: 1 }), { q: Q.save }],
    ai: { reply: 'Bisa, lewat /pesan-custom.' },
    calls: [signed(body({ body: 'Bisa aplikasi kasir?' }))],
  },
  {
    name: 'klien mengetik ADMIN → alih ke admin + notifikasi',
    steps: [...accepted({ phone: '6282222222222', name: 'Budi', history: OLD_HISTORY, handoff_status: '', paused: 0, stale: 0 }), { q: Q.handoff }, { q: Q.log }],
    calls: [signed(body({ body: 'ADMIN' }))],
  },
  {
    name: 'tombol Hubungi admin widget Nexa → alih ke admin (website)',
    steps: [...accepted(), { q: Q.handoff }, { q: Q.log }],
    calls: [signed(body({ body: `${NEXA_ADMIN_WA_TEXT}\nPertanyaan saya: Berapa lama pengerjaan?` }))],
  },
  {
    name: 'AI belum aktif → alih ke admin (ai_mati)',
    steps: [...accepted(), { q: Q.handoff }, { q: Q.log }],
    ai: { offline: true },
    calls: [signed(body())],
  },
  {
    name: 'AI gagal → alih ke admin (ai_gagal); notifikasi gagal tercatat',
    steps: [...accepted(), { q: Q.handoff }, { q: Q.log }],
    ai: { error: 'HTTP 529 overloaded_error' },
    http: [[200], [201, { id: 'ok' }], [500]],
    calls: [signed(body())],
  },
  {
    name: 'AI menjawab [[ADMIN]] → alih ke admin (ai_memutuskan)',
    steps: [...accepted(), { q: Q.handoff }, { q: Q.log }],
    ai: { reply: '[[ADMIN]]' },
    calls: [signed(body({ body: 'Pesanan saya kok belum aktif?' }))],
  },
  {
    name: 'chat dijeda menunggu admin: bot diam, pesan lanjutan diteruskan ke admin',
    steps: [...accepted({ phone: '6282222222222', name: 'Budi', history: OLD_HISTORY, handoff_status: 'menunggu', paused: 1, stale: 0 }), { q: Q.touch }],
    calls: [signed(body({ body: 'Saya mau aplikasi kasir untuk 3 cabang' }))],
  },
  {
    name: 'chat dijeda dan sudah ditangani admin: bot diam tanpa meneruskan',
    steps: [...accepted({ phone: '6282222222222', name: 'Budi', history: OLD_HISTORY, handoff_status: 'ditangani', paused: 1, stale: 0 }), { q: Q.touch }],
    calls: [signed(body({ body: 'Oke terima kasih' }))],
  },
  {
    name: 'kiriman bot sendiri (fromMe, source api) diabaikan',
    steps: [{ q: Q.config, rows: [] }, { q: Q.seen, affected: 1 }, { q: Q.prune }],
    calls: [signed(body({ fromMe: true, source: 'api', from: '6281000000000@c.us', to: '6282222222222@c.us' }, { event: 'message.any' }))],
  },
  {
    name: 'admin membalas manual dari nomor bisnis → bot dijeda, alih ke admin ditandai ditangani',
    steps: [{ q: Q.config, rows: [] }, { q: Q.seen, affected: 1 }, { q: Q.prune }, { q: Q.adminReply }, { q: Q.handled }],
    calls: [signed(body({ fromMe: true, source: 'app', from: '6281000000000@c.us', to: '6282222222222@c.us', body: 'Halo kak, saya admin' }, { event: 'message.any' }))],
  },
  {
    name: 'nomor admin: SELESAI <nomor> → bot aktif lagi untuk klien itu',
    steps: [
      { q: Q.config, rows: [] }, { q: Q.seen, affected: 1 }, { q: Q.prune },
      { q: Q.find, rows: [{ chat_id: '6282222222222@c.us', phone: '6282222222222', name: 'Budi' }] },
      { q: Q.resumeChat }, { q: Q.resumeLog },
    ],
    calls: [signed(body({ from: '6281111111111@c.us', body: 'SELESAI 082222222222' }))],
  },
  {
    name: 'nomor admin: SELESAI tanpa nomor, dua chat menunggu → daftar',
    steps: [
      { q: Q.config, rows: [] }, { q: Q.seen, affected: 1 }, { q: Q.prune },
      { q: Q.waiting, rows: [{ chat_id: '6282222222222@c.us', phone: '6282222222222', name: 'Budi' }, { chat_id: '99887766554433@lid', phone: null, name: '' }] },
    ],
    calls: [signed(body({ from: '6281111111111@c.us', body: 'selesai' }))],
  },
  {
    name: 'nomor admin: pesan biasa diabaikan (tidak dijawab AI)',
    steps: [{ q: Q.config, rows: [] }, { q: Q.seen, affected: 1 }, { q: Q.prune }],
    calls: [signed(body({ from: '6281111111111@c.us', body: 'oke' }))],
  },
  {
    name: 'klien @lid minta admin: nomor dicari lewat WAHA lids',
    steps: [...accepted(), { q: Q.handoff }, { q: Q.log }],
    http: [[200, { lid: '123456789012345@lid', pn: '6284444444444@c.us' }]],
    calls: [signed(body({ from: '123456789012345@lid', body: 'mau bicara dengan admin', _data: { pushName: 'Sari' } }))],
  },
  {
    name: 'foto tanpa teks → minta teks',
    steps: [...accepted(), { q: Q.save }],
    calls: [signed(body({ body: '', hasMedia: true }))],
  },
  // Aksi admin
  {
    name: 'waha_get_config: pengaturan + log',
    action: 'waha_get_config',
    input: {},
    steps: [
      { q: Q.config, rows: [{ setting_key: 'waha_api_key', setting_value: 'rahasia-db-9876' }, { setting_key: 'waha_pause_hours', setting_value: '6' }] },
      {
        q: Q.handoffs,
        rows: [{ id: 3, chat_id: '6282222222222@c.us', phone: '6282222222222', name: 'Budi', reason: 'permintaan', message: 'ADMIN', status: 'menunggu', notified: 1, created_at: '2026-10-29 10:00:00', handled_at: null, closed_at: null, paused: 1 }],
      },
    ],
  },
  { name: 'waha_get_config: tabel belum ada', action: 'waha_get_config', input: {}, steps: [{ q: Q.config, rows: [] }, { q: Q.handoffs, missing: true }] },
  {
    name: 'waha_save_config: simpan & hapus',
    action: 'waha_save_config',
    input: { enabled: true, url: 'https://waha.baru.test/', session: '', admin_number: '0812 3333 4444', pause_hours: '24', key: 'kunci-baru' },
    steps: [
      { q: Q.config, rows: [] },
      { q: Q.upsert }, { q: Q.upsert }, { q: Q.upsert }, { q: Q.upsert }, { q: Q.upsert },
      { q: Q.delete },
      { q: Q.config, rows: [] },
      { q: Q.handoffs, rows: [] },
    ],
  },
  { name: 'waha_save_config: nomor admin tidak valid → 400', action: 'waha_save_config', input: { admin_number: '12' }, steps: [{ q: Q.config, rows: [] }] },
  { name: 'waha_test: WAHA menolak API key → 502', action: 'waha_test', input: {}, steps: [{ q: Q.config, rows: [] }], http: [[401]] },
  { name: 'waha_test: terkirim', action: 'waha_test', input: {}, steps: [{ q: Q.config, rows: [] }] },
  {
    name: 'waha_close_handoff: bot aktif lagi',
    action: 'waha_close_handoff',
    input: { chat_id: '6282222222222@c.us' },
    steps: [{ q: Q.resumeChat }, { q: Q.resumeLog }, { q: Q.config, rows: [] }, { q: Q.handoffs, rows: [] }],
  },
  { name: 'waha_close_handoff: tanpa chat → 400', action: 'waha_close_handoff', input: { chat_id: '' }, steps: [] },
];

type Outcome = {
  results: { status: number; body: unknown; outcome?: unknown }[];
  queries: { q: string; params: unknown[] }[];
  http: unknown[][];
  ai: unknown[];
  unused: number;
};

// ── PHP: waha.php di CLI, fungsi api.php yang dipakainya diganti stub ──
const PHP_HARNESS = String.raw`
class ApiError extends Exception {
    public $status; public $errorCode; public $fieldErrors;
    public function __construct($message, $status = 400, $errorCode = null, $fieldErrors = null) {
        parent::__construct($message); $this->status = $status; $this->errorCode = $errorCode; $this->fieldErrors = $fieldErrors;
    }
}
function env_value($key, $default = '') { $v = getenv($key); return ($v === false || $v === '') ? $default : $v; }
function client_ip() { return '203.0.113.9'; }
function rate_limit_wait($key, $max) { return 0; }
function rate_limit_hit($key, $window) {}
function too_many_attempts($seconds) { throw new ApiError('Terlalu banyak percobaan.', 429); }
function db_next(string $sql, array $params) {
    $at = $GLOBALS['__at'];
    $step = $GLOBALS['__steps'][$at] ?? null;
    if (!$step || strpos($sql, $step['q']) === false) throw new Exception("unexpected query #$at: $sql");
    $GLOBALS['__at']++;
    $GLOBALS['__queries'][] = ['q' => $step['q'], 'params' => array_values($params)];
    if (!empty($step['missing'])) throw new mysqli_sql_exception("Table 'db.waha' doesn't exist", 1146);
    $GLOBALS['__affected'] = $step['affected'] ?? 1;
    return $step;
}
function db_affected_rows() { return (int)$GLOBALS['__affected']; }
function db_one($conn, $sql, array $params = []) { return db_next($sql, $params)['rows'][0] ?? null; }
function db_all($conn, $sql, array $params = []) { return db_next($sql, $params)['rows'] ?? []; }
function db_run($conn, $sql, array $params = []) { db_next($sql, $params); return true; }
require getenv('WAHA_PHP');

$in = json_decode(stream_get_contents(STDIN), true);
$out = ['pure' => []];
$p = &$out['pure'];
foreach ($in['signature'] as $c) $p['signature'][] = waha_signature_ok($c[0], $c[1], $c[2], $c[3]);
foreach ($in['parse'] as $c) $p['parse'][] = waha_parse_event($c[0], $c[1], $in['now']);
foreach ($in['wants'] as $c) $p['wants'][] = waha_wants_admin($c);
foreach ($in['format'] as $c) $p['format'][] = waha_format_reply($c);
foreach ($in['history'] as $c) $p['history'][] = waha_history_messages($c[0], $c[1], $c[2]);
foreach ($in['history'] as $c) $p['history_json'][] = waha_history_json(waha_history_messages($c[0], $c[1], $c[2]), "Jawaban ✓ \"kutip\" / garis\u{2028}");
foreach ($in['command'] as $c) $p['command'][] = waha_admin_command($c);
foreach ($in['number'] as $c) $p['number'][] = waha_number($c);
foreach ($in['url'] as $c) $p['url'][] = [waha_base_url($c), waha_origin($c)];
foreach ($in['resolve'] as $c) $p['resolve'][] = [waha_config_resolve($c[0], $c[1]), waha_config_out($c[0], $c[1])];
foreach ($in['writes'] as $c) {
    try { $p['writes'][] = ['ok' => waha_config_writes($c[0], $c[1], $c[2])]; }
    catch (ApiError $e) { $p['writes'][] = ['status' => $e->status, 'message' => $e->getMessage(), 'errors' => $e->fieldErrors]; }
}
foreach ($in['notice'] as $c) $p['notice'][] = waha_admin_notice($c[0], $c[1], $c[2], $c[3], $c[4], $c[5]);
foreach ($in['kind'] as $c) $p['kind'][] = [waha_normalize_chat($c), waha_chat_kind(waha_normalize_chat($c))];

$out['flows'] = [];
foreach ($in['flows'] as $case) {
    foreach ($case['env'] as $key => $value) putenv("$key=$value");
    $GLOBALS['__steps'] = $case['steps'];
    $GLOBALS['__at'] = 0;
    $GLOBALS['__affected'] = 0;
    $GLOBALS['__queries'] = [];
    $GLOBALS['__http'] = [];
    $GLOBALS['__ai'] = [];
    $deps = [
        'http' => function ($method, $url, $apiKey, $body) use ($case) {
            $reply = $case['http'][count($GLOBALS['__http'])] ?? [201, ['id' => 'ok']];
            $GLOBALS['__http'][] = [$method, $url, $apiKey, $body];
            return [$reply[0], $reply[1] ?? null];
        },
        'ai' => function ($conn, $messages) use ($case) {
            $GLOBALS['__ai'][] = $messages;
            return $case['ai'] ?? ['error' => 'tidak ada AI di kasus ini'];
        },
    ];
    $_SERVER['REQUEST_METHOD'] = 'POST';
    $results = [];
    $calls = $case['action'] === null ? $case['calls'] : [null];
    foreach ($calls as $call) {
        ob_start();
        try {
            if ($call !== null) {
                $r = waha_webhook(mysqli_init(), $call['raw'], $call['hmac'], $call['algorithm'] ?? '', $in['now']);
                $res = ['status' => 200, 'body' => ['success' => true] + $r['body']];
                if ($r['job'] !== null) $res['outcome'] = waha_handle_message(mysqli_init(), $r['job']['cfg'], $r['job']['message'], $deps);
                ob_end_clean();
            } else {
                handle_waha_action(mysqli_init(), $case['action'], $case['input'], ['id' => 1, 'role' => 'admin'], $deps);
                $res = ['status' => 200, 'body' => json_decode(ob_get_clean(), true)];
            }
        } catch (ApiError $e) {
            ob_end_clean();
            $b = ['error' => $e->getMessage()];
            if ($e->errorCode) $b['code'] = $e->errorCode;
            if ($e->fieldErrors) $b['errors'] = $e->fieldErrors;
            $res = ['status' => $e->status, 'body' => $b];
        } catch (Throwable $e) {
            ob_end_clean();
            $res = ['status' => 500, 'body' => ['internal' => $e->getMessage()]];
        }
        $results[] = $res;
    }
    $out['flows'][] = ['results' => $results, 'queries' => $GLOBALS['__queries'], 'http' => $GLOBALS['__http'], 'ai' => $GLOBALS['__ai'],
        'unused' => count($GLOBALS['__steps']) - $GLOBALS['__at']];
}
echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
`;

const flowEnv = (c: FlowCase) => ({ ...BASE_ENV, ...(c.env ?? {}) });

const phpAvailable = (() => {
  const probe = spawnSync('php', ['-r', 'echo function_exists("mysqli_init") ? "y" : "n";'], { encoding: 'utf8' });
  return probe.stdout === 'y';
})();

function runPhp() {
  // error_log() modul (sendText gagal, AI gagal) ke berkas sementara, bukan stderr
  const log = join(tmpdir(), `gn-waha-test-${process.pid}.log`);
  const result = spawnSync('php', ['-d', 'display_errors=stderr', '-d', `error_log=${log}`, '-r', PHP_HARNESS], {
    input: JSON.stringify({
      now: NOW,
      signature: SIGNATURE_CASES,
      parse: PARSE_CASES,
      wants: WANTS_CASES,
      format: FORMAT_CASES,
      history: HISTORY_CASES,
      command: COMMAND_CASES,
      number: NUMBER_CASES,
      url: URL_CASES,
      resolve: RESOLVE_CASES,
      writes: WRITE_CASES,
      notice: NOTICE_CASES,
      kind: ['6282222222222@S.WHATSAPP.NET', ' 6282222222222:3@c.us ', '1203630@g.us', 'status@broadcast', '1@newsletter', '12@c.us', '123456@lid', 'abc@c.us'],
      flows: FLOW_CASES.map((c) => ({ ...c, env: flowEnv(c), action: c.action ?? null, calls: c.calls ?? [], http: c.http ?? [] })),
    }),
    encoding: 'utf8',
    env: { ...process.env, WAHA_PHP },
  });
  expect(result.stderr).toBe('');
  return JSON.parse(result.stdout) as { pure: Record<string, unknown[]>; flows: Outcome[] };
}

const nodePure = () => ({
  signature: SIGNATURE_CASES.map(([raw, sig, algo, key]) => wahaSignatureOk(Buffer.from(raw), sig, algo, key)),
  parse: PARSE_CASES.map(([event, session]) => wahaParseEvent(event, session as string, NOW)),
  wants: WANTS_CASES.map((c) => wahaWantsAdmin(c)),
  format: FORMAT_CASES.map((c) => wahaFormatReply(c)),
  history: HISTORY_CASES.map(([stored, stale, text]) => wahaHistoryMessages(stored, stale, text)),
  history_json: HISTORY_CASES.map(([stored, stale, text]) => wahaHistoryJson(wahaHistoryMessages(stored, stale, text), 'Jawaban ✓ "kutip" / garis ')),
  command: COMMAND_CASES.map((c) => wahaAdminCommand(c)),
  number: NUMBER_CASES.map((c) => wahaNumber(c)),
  url: URL_CASES.map((c) => [wahaBaseUrl(c), wahaOrigin(c)]),
  resolve: RESOLVE_CASES.map(([rows, env]) => [wahaConfigResolve(rows, env), wahaConfigOut(rows, env)]),
  writes: WRITE_CASES.map(([input, current, env]) => {
    try {
      return { ok: wahaConfigWrites(input, current, env) };
    } catch (err) {
      if (err instanceof WahaError) return { status: err.status, message: err.message, errors: err.errors };
      throw err;
    }
  }),
  notice: NOTICE_CASES.map((c) => wahaAdminNotice(...c)),
  kind: ['6282222222222@S.WHATSAPP.NET', ' 6282222222222:3@c.us ', '1203630@g.us', 'status@broadcast', '1@newsletter', '12@c.us', '123456@lid', 'abc@c.us'].map((c) => [
    wahaNormalizeChat(c),
    wahaChatKind(wahaNormalizeChat(c)),
  ]),
});

// Setiap jalan memakai jam sendiri (tiga hari setelah jalan sebelumnya), jadi batas laju di memori waha.js (per chat,
// harian, notifikasi admin) dari jalan sebelumnya sudah habis; PHP memakai stub tanpa batas.
let runClock = Date.UTC(2026, 0, 1);

/** Satu kasus alur di Node dengan pool, WAHA, dan AI tiruan (= harness PHP). */
async function runNodeFlow(c: FlowCase): Promise<Outcome> {
  const saved = { ...process.env };
  Object.assign(process.env, flowEnv(c));
  runClock += 3 * 86400 * 1000;
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(runClock);
  // Log galat modul (sendText/AI gagal) tidak perlu tampil di keluaran tes
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const queries: { q: string; params: unknown[] }[] = [];
  const http: unknown[][] = [];
  const ai: unknown[] = [];
  let at = 0;
  const pool = {
    async query({ sql, values }: { sql: string; values?: unknown[] }) {
      const step = c.steps[at];
      if (!step || !sql.includes(step.q)) throw new Error(`unexpected query #${at}: ${sql}`);
      at += 1;
      queries.push({ q: step.q, params: values ?? [] });
      if (step.missing) throw Object.assign(new Error("Table 'db.waha' doesn't exist"), { errno: 1146, code: 'ER_NO_SUCH_TABLE' });
      return /^\s*SELECT/i.test(sql) ? [step.rows ?? []] : [{ affectedRows: step.affected ?? 1 }];
    },
  };
  const deps = {
    http: async (method: string, url: string, apiKey: string, payloadBody: unknown) => {
      const reply = c.http?.[http.length] ?? [201, { id: 'ok' }];
      http.push([method, url, apiKey, payloadBody]);
      return [reply[0], reply[1] ?? null];
    },
    ai: async (_pool: unknown, messages: unknown) => {
      ai.push(messages);
      return c.ai ?? { error: 'tidak ada AI di kasus ini' };
    },
  };
  const results: Outcome['results'] = [];
  try {
    if (c.action) {
      const res = {
        statusCode: 200,
        body: undefined as unknown,
        headersSent: false,
        locals: {} as Record<string, unknown>,
        set() {
          return this;
        },
        status(code: number) {
          this.statusCode = code;
          return this;
        },
        json(payloadBody: unknown) {
          this.body = payloadBody;
          this.headersSent = true;
          return this;
        },
      };
      const req = { method: 'POST', headers: {}, user: { id: 1, role: 'admin' }, ip: '203.0.113.9' };
      await handleWahaAction(c.action, c.input ?? {}, req, res, pool, deps);
      results.push({ status: res.statusCode, body: res.body });
    } else {
      for (const call of c.calls ?? []) {
        try {
          const r = await wahaWebhook(pool, Buffer.from(call.raw), call.hmac, call.algorithm ?? '', NOW, '203.0.113.9');
          const entry: Outcome['results'][number] = { status: 200, body: { success: true, ...r.body } };
          if (r.job) entry.outcome = await wahaHandleMessage(pool, r.job.cfg, r.job.message, deps);
          results.push(entry);
        } catch (err) {
          if (!(err instanceof WahaError)) {
            results.push({ status: 500, body: { internal: (err as Error).message } });
            continue;
          }
          const b: Record<string, unknown> = { error: err.message };
          if (err.code) b.code = err.code;
          if (err.errors) b.errors = err.errors;
          results.push({ status: err.status, body: b });
        }
      }
    }
  } finally {
    vi.useRealTimers();
    for (const key of Object.keys(BASE_ENV)) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
  return { results, queries, http, ai, unused: c.steps.length - at };
}

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Pemasangan: akses, pemanggilan modul, migrasi, setting tertutup ──

const listOf = (source: string, pattern: RegExp) => [...(source.match(pattern)?.[1] ?? '').matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
const phpList = (source: string, name: string) => listOf(source, new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`));
const jsSet = (source: string, name: string) => listOf(source, new RegExp(`${name} = new Set\\(\\[([\\s\\S]*?)\\]\\)`));
/** CREATE TABLE tanpa komentar dan spasi berlebih (migrasi = schema.sql). */
function tableDefinition(sql: string, table: string): string {
  const match = sql.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${table} \\(([\\s\\S]*?)\\) ENGINE=InnoDB[^;]*;`));
  if (!match) throw new Error(`${table} not found`);
  return match[0].replace(/--[^\n]*/g, '').replace(/\s+/g, ' ').trim();
}
const ADMIN_WAHA_ACTIONS = ['waha_get_config', 'waha_save_config', 'waha_test', 'waha_close_handoff'];

describe('waha: pemasangan (api.php = security.js/server.js, migrasi 049 = schema.sql)', () => {
  const API_PHP = read('backend', 'api.php');
  const SECURITY_JS = read('backend', 'security.js');
  const SERVER_JS = read('backend', 'server.js');

  it('akses: waha_webhook publik (dijaga HMAC), aksi pengaturan admin saja', () => {
    for (const [pub, admin] of [
      [phpList(API_PHP, 'PUBLIC_ACTIONS'), phpList(API_PHP, 'ADMIN_ACTIONS')],
      [jsSet(SECURITY_JS, 'PUBLIC_ACTIONS'), jsSet(SECURITY_JS, 'ADMIN_ACTIONS')],
    ]) {
      expect(pub).toContain('waha_webhook');
      expect(admin).toEqual(expect.arrayContaining(ADMIN_WAHA_ACTIONS));
      for (const action of ADMIN_WAHA_ACTIONS) expect(pub).not.toContain(action);
    }
  });

  it('api.php memuat modul dan memanggilnya setelah cek token; server.js di GET dan POST', () => {
    expect(API_PHP).toContain("require_once __DIR__ . '/modules/waha.php';");
    expect(API_PHP.indexOf("require_once __DIR__ . '/modules/waha.php';")).toBeGreaterThan(API_PHP.indexOf("require_once __DIR__ . '/modules/nexa.php';"));
    expect(API_PHP.indexOf('handle_waha_action($conn, $action, $input, $authUser)')).toBeGreaterThan(API_PHP.indexOf('$authUser = authorize_request('));
    expect(SERVER_JS).toContain("import { handleWahaAction } from './modules/waha.js';");
    expect(SERVER_JS.match(/await handleWahaAction\(action, req\.(query|body), req, res, pool\)/g)).toEqual([
      'await handleWahaAction(action, req.query, req, res, pool)',
      'await handleWahaAction(action, req.body, req, res, pool)',
    ]);
  });

  it('setting waha_* tidak ikut get_settings publik dan ditolak update_settings (kedua backend)', () => {
    expect(API_PHP).toContain("AND LEFT(setting_key, 5) <> 'waha_'");
    expect(SERVER_JS).toContain("AND LEFT(setting_key, 5) <> 'waha_'");
    expect(API_PHP).toContain("if (stripos((string)$key, 'waha_') === 0) {");
    expect(SERVER_JS).toContain("if (lower.startsWith('waha_')) {");
    expect(API_PHP).toContain('Pengaturan bot WhatsApp hanya bisa diubah lewat tab Tanya Nexa.');
    expect(SERVER_JS).toContain('Pengaturan bot WhatsApp hanya bisa diubah lewat tab Tanya Nexa.');
  });

  it('migrasi 049: tanpa ALTER/prosedur/DROP, aman diulang, tabel = schema.sql, baseline, README, .env.example tanpa nilai', () => {
    const migration = read('database', 'migrations', '2026-10-29_049_waha_whatsapp_bot.sql');
    const schema = read('database', 'schema.sql');
    const code = migration.replace(/--[^\n]*/g, '');
    // updated_at ... ON UPDATE CURRENT_TIMESTAMP adalah definisi kolom, bukan perubahan data
    expect(code.replace(/ON UPDATE CURRENT_TIMESTAMP/g, '')).not.toMatch(/\b(ALTER|PROCEDURE|DELIMITER|DROP|DELETE|UPDATE|information_schema)\b/i);
    expect(code.match(/CREATE TABLE IF NOT EXISTS (\w+)/g)).toEqual([
      'CREATE TABLE IF NOT EXISTS waha_seen',
      'CREATE TABLE IF NOT EXISTS waha_chats',
      'CREATE TABLE IF NOT EXISTS waha_handoffs',
    ]);
    expect(code).toMatch(/INSERT IGNORE INTO schema_migrations \(version, description\)\s+VALUES \('2026-10-29_049'/);
    for (const table of ['waha_seen', 'waha_chats', 'waha_handoffs']) expect(tableDefinition(migration, table)).toBe(tableDefinition(schema, table));
    expect(schema).toMatch(/\('2026-10-29_049', 'baseline: waha_seen, waha_chats, waha_handoffs/);
    expect(read('database', 'README.md')).toContain('2026-10-29_049_waha_whatsapp_bot.sql');
    const env = read('.env.example');
    for (const key of ['WAHA_HMAC_KEY', 'WAHA_URL', 'WAHA_API_KEY', 'WAHA_SESSION', 'WAHA_ADMIN_NUMBER', 'WAHA_DAILY_LIMIT']) {
      expect(env).toMatch(new RegExp(`^${key}=$`, 'm'));
    }
  });
});

describe('waha: fungsi murni', () => {
  it('tanda tangan HMAC-SHA512 heksadesimal atas body mentah (contoh resmi WAHA)', () => {
    expect(nodePure().signature).toEqual([true, true, true, false, false, false, false, false, false, true]);
  });

  it('event pesan: chat pribadi saja, nomor sendiri memakai payload.to, pesan basi & grup/status/saluran diabaikan', () => {
    const parsed = nodePure().parse as Record<string, unknown>[];
    expect(parsed[0]).toEqual({
      message: {
        id: 'false_6282222222222@c.us_3EB0AAA',
        chat: '6282222222222@c.us',
        phone: '6282222222222',
        from_me: false,
        source: 'app',
        text: 'Halo, berapa harga template?',
        media: false,
        name: 'Budi',
      },
    });
    expect(parsed.slice(2, 7)).toEqual([{ ignore: 'event' }, { ignore: 'session' }, { ignore: 'chat' }, { ignore: 'chat' }, { ignore: 'chat' }]);
    expect((parsed[7] as { message: { chat: string } }).message.chat).toBe('6282222222222@c.us');
    expect((parsed[8] as { message: { chat: string } }).message.chat).toBe('6282222222222@c.us');
    expect((parsed[9] as { message: { phone: string; name: string } }).message).toMatchObject({ phone: '', name: 'Sari' });
    expect((parsed[10] as { message: { chat: string; from_me: boolean } }).message).toMatchObject({ chat: '6282222222222@c.us', from_me: true, name: '' });
    expect(parsed[12]).toEqual({ ignore: 'stale' });
    // Cap waktu dalam milidetik tidak dianggap basi
    expect(parsed[13]).toHaveProperty('message');
    expect((parsed[15] as { message: { text: string } }).message.text).toHaveLength(1000);
    expect(parsed.slice(16)).toEqual([{ ignore: 'payload' }, { ignore: 'payload' }, { ignore: 'payload' }, { ignore: 'event' }, { ignore: 'body' }, { ignore: 'body' }]);
  });

  it('minta admin: perintah ADMIN, frasa jelas, tombol widget; sapaan "halo admin" tetap dijawab AI', () => {
    expect(nodePure().wants).toEqual([
      'permintaan', 'permintaan', 'permintaan', 'permintaan', 'permintaan', 'permintaan', '', '', 'permintaan',
      'permintaan', 'permintaan', 'permintaan', 'permintaan',
      '', '', '', '', 'website',
      'website', 'permintaan', 'permintaan',
    ]);
  });

  it('balasan AI → teks WhatsApp; [[ADMIN]] = alih ke admin', () => {
    const formatted = nodePure().format as { text: string; handoff: boolean }[];
    expect(formatted[0].text).toBe('Template *Aura Studio* (https://garudanexa.com/template/aura-studio) cocok. Cek https://garudanexa.com/harga atau https://garudanexa.com/pesan-custom.');
    expect(formatted[1]).toEqual({ text: '', handoff: true });
    expect(formatted[2]).toEqual({ text: '', handoff: true });
    expect(formatted[3].text).toBe('- *Corporate Website* untuk branding\n- Kasir.');
    expect(formatted[4].text).toBe('Harga\n\nLihat halaman harga (https://garudanexa.com/harga) dan garudanexa.com/harga, /hargaku, https://garudanexa.com/tentang.');
    expect(formatted[5]).toEqual({ text: '', handoff: false });
  });

  it('pengaturan: isian admin menang, API key .env hanya untuk server WAHA_URL, nomor & session divalidasi', () => {
    const resolved = (nodePure().resolve as [Record<string, unknown>, Record<string, unknown>][]).map(([cfg]) => cfg);
    expect(resolved[0]).toEqual({ enabled: true, url: 'https://waha.env.test', key: 'kunci-env', session: 'sesi-env', admin: '6281111111111', pause_hours: 12 });
    expect(resolved[1]).toMatchObject({ url: '', key: '', session: 'default', admin: '' });
    expect(resolved[2]).toMatchObject({ url: 'https://waha.env.test', key: 'kunci-env', session: 'utama', admin: '6282222222222', pause_hours: 24 });
    // Alamat lain dari admin: API key .env tidak ikut terkirim ke sana
    expect(resolved[3]).toMatchObject({ url: 'https://waha.lain.test', key: '' });
    expect(resolved[4]).toMatchObject({ url: 'https://waha.lain.test', key: 'kunci-db' });
    expect(resolved[5]).toMatchObject({ enabled: false, session: 'sesi-env', admin: '6281111111111', pause_hours: 12 });
    // Untuk tab admin: kunci hanya bertopeng
    const out = (nodePure().resolve as [unknown, Record<string, unknown>][])[4][1];
    expect(out).toMatchObject({ key_masked: '••••i-db', key_env: true, hmac_env: true, effective: { key: true } });
    expect(JSON.stringify(out)).not.toContain('kunci-db');
    expect(JSON.stringify(out)).not.toContain('kunci-env');
  });

  it('simpan pengaturan: API key terikat ke server alamatnya; masukan tidak sah → 400', () => {
    const writes = nodePure().writes as Record<string, unknown>[];
    expect(writes[0]).toEqual({
      ok: {
        writes: {
          waha_enabled: '1', waha_url: 'https://waha.contoh.com', waha_session: 'default', waha_admin_number: '6281234567890',
          waha_pause_hours: '6', waha_api_key: 'kunci-baru',
        },
        deletes: [],
      },
    });
    expect(writes[1]).toEqual({ ok: { writes: { waha_enabled: '0' }, deletes: ['waha_url', 'waha_session', 'waha_admin_number', 'waha_api_key'] } });
    expect(writes[2]).toEqual({ ok: { writes: { waha_enabled: '1', waha_url: 'https://waha.baru.test' }, deletes: ['waha_api_key'] } });
    expect(writes[3]).toEqual({ ok: { writes: { waha_enabled: '1', waha_url: 'https://waha.lama.test/api' }, deletes: [] } });
    expect(writes[4]).toEqual({ ok: { writes: { waha_enabled: '1', waha_url: 'https://waha.baru.test', waha_api_key: 'kunci-baru' }, deletes: [] } });
    expect(writes.slice(9).map((w) => (w as { status?: number }).status)).toEqual([400, 400, 400, 400, 400, 400, 400, 400]);
  });

  it('notifikasi admin: nama, nomor, alasan, pesan terakhir, wa.me, perintah SELESAI', () => {
    expect(nodePure().notice[0]).toBe(
      [
        '🔔 *Klien butuh respons admin (human)*',
        'Nama: Budi',
        'Nomor: +6282222222222',
        'Alasan: Klien minta bicara dengan admin',
        'Pesan terakhir:',
        '> ADMIN',
        '',
        'Balas klien: https://wa.me/6282222222222',
        '',
        'Bot dijeda untuk chat ini selama 12 jam. Bila sudah selesai, balas *SELESAI 6282222222222* agar bot aktif lagi.',
      ].join('\n'),
    );
    expect(nodePure().notice[1]).toContain('Nomor: tersembunyi (ID privasi WhatsApp 123456789012345)');
    expect(nodePure().notice[1]).toContain('> Harga paket?\n> Yang termurah');
  });

  it('pesan awal tombol "Hubungi admin" widget Nexa dikenali bot sebagai permintaan dari website', () => {
    const text = decodeURIComponent(adminWhatsappHref('https://wa.me/6285188009152', 'Bisa bikin aplikasi kasir?').split('?text=')[1]);
    expect(text).toBe(`${NEXA_ADMIN_WA_TEXT}\nPertanyaan saya: Bisa bikin aplikasi kasir?`);
    expect(wahaWantsAdmin(text)).toBe('website');
    expect(wahaWantsAdmin(NEXA_ADMIN_WA_TEXT)).toBe('website');
  });
});

describe('waha: alur webhook & aksi admin (Node, WAHA & AI tiruan)', () => {
  const run = async (name: string) => runNodeFlow(FLOW_CASES.find((c) => c.name === name)!);

  it('semua kasus memakai seluruh naskah kueri', async () => {
    for (const c of FLOW_CASES) {
      const out = await runNodeFlow(c);
      expect({ name: c.name, unused: out.unused, internal: out.results.find((r) => (r.body as { internal?: string }).internal) }).toEqual({ name: c.name, unused: 0, internal: undefined });
    }
  });

  it('tanpa kunci → 503, tanda tangan salah → 401, tanpa kueri apa pun', async () => {
    expect((await run('tanpa WAHA_HMAC_KEY → 503')).results[0]).toEqual({ status: 503, body: { error: 'Webhook WhatsApp belum dikonfigurasi.', code: 'WAHA_OFFLINE' } });
    const bad = await run('tanda tangan salah → 401');
    expect(bad.results[0]).toEqual({ status: 401, body: { error: 'Tanda tangan webhook tidak valid.', code: 'WAHA_SIGNATURE' } });
    expect(bad.queries).toEqual([]);
    expect((await run('tanpa header tanda tangan → 401')).results[0].status).toBe(401);
  });

  it('pesan ganda: id yang sama diproses sekali (dedup sha256 id pesan)', async () => {
    const out = await run('pesan ganda (message lalu message.any untuk id yang sama) diproses sekali');
    expect(out.results.map((r) => r.body)).toEqual([{ success: true, accepted: true }, { success: true, ignored: 'duplicate' }]);
    const seen = out.queries.filter((q) => q.q === Q.seen);
    expect(seen).toHaveLength(2);
    expect(seen[0].params).toEqual([crypto.createHash('sha256').update('false_6282222222222@c.us_3EB0AAA').digest('hex')]);
    expect(seen[1].params).toEqual(seen[0].params);
    // Hanya satu jawaban
    expect(out.http.filter((call) => String(call[1]).endsWith('/api/sendText'))).toHaveLength(1);
    expect(out.ai).toHaveLength(1);
  });

  it('jawaban AI: tandai dibaca, kirim lewat sendText (X-Api-Key, session), simpan riwayat', async () => {
    const out = await run('jawaban AI pertama: tautan lengkap, *tebal*, petunjuk ADMIN');
    expect(out.results[0].outcome).toEqual({ action: 'ai', sent: true });
    expect(out.ai).toEqual([[{ role: 'user', content: 'Template untuk klinik?' }]]);
    expect(out.http).toEqual([
      ['POST', 'https://waha.uji.test/api/sendSeen', 'api-uji', { session: 'default', chatId: '6282222222222@c.us' }],
      [
        'POST',
        'https://waha.uji.test/api/sendText',
        'api-uji',
        {
          session: 'default',
          chatId: '6282222222222@c.us',
          text: 'Template *Aura Studio* (https://garudanexa.com/template/aura-studio) cocok untuk klinik.\n\nKetik *ADMIN* kapan saja untuk bicara dengan admin kami.',
        },
      ],
    ]);
    const save = out.queries.find((q) => q.q === Q.save)!;
    expect(save.params.slice(0, 3)).toEqual(['6282222222222@c.us', '6282222222222', 'Budi']);
    expect(JSON.parse(save.params[3] as string)).toEqual([
      { role: 'user', content: 'Template untuk klinik?' },
      { role: 'assistant', content: 'Template *Aura Studio* (https://garudanexa.com/template/aura-studio) cocok untuk klinik.' },
    ]);

    // Riwayat basi (lebih dari sehari) tidak dikirim ke AI
    const stale = await run('jawaban AI lanjutan memakai riwayat; riwayat basi diabaikan');
    expect(stale.ai).toEqual([[{ role: 'user', content: 'Bisa aplikasi kasir?' }]]);
    const fresh = await run('pesan ganda (message lalu message.any untuk id yang sama) diproses sekali');
    expect((fresh.ai[0] as unknown[]).length).toBe(3);
  });

  it('klien mengetik ADMIN: bot dijeda, klien diberi tahu, nomor admin dapat notifikasi, log tercatat', async () => {
    const out = await run('klien mengetik ADMIN → alih ke admin + notifikasi');
    expect(out.results[0].outcome).toEqual({ action: 'handoff', reason: 'permintaan', sent: true, notified: true });
    expect(out.ai).toEqual([]);
    const handoff = out.queries.find((q) => q.q === Q.handoff)!;
    expect(handoff.params[0]).toBe('6282222222222@c.us');
    expect(handoff.params[5]).toBe(12);
    const [, toClient, toAdmin] = out.http as [unknown, [string, string, string, Record<string, string>], [string, string, string, Record<string, string>]];
    expect(toClient[3]).toMatchObject({ chatId: '6282222222222@c.us', text: expect.stringMatching(/sudah kami teruskan ke admin/) });
    expect(toAdmin[3].chatId).toBe('6281111111111@c.us');
    expect(toAdmin[3].text).toContain('Klien butuh respons admin (human)');
    expect(toAdmin[3].text).toContain('Balas klien: https://wa.me/6282222222222');
    expect(toAdmin[3].text).toContain('> Hai\n> ADMIN');
    expect(out.queries.find((q) => q.q === Q.log)!.params).toEqual(['6282222222222@c.us', '6282222222222', 'Budi', 'permintaan', 'ADMIN', 1]);
  });

  it('alasan alih ke admin: tombol widget, AI mati, AI gagal (notifikasi gagal tercatat), AI [[ADMIN]]', async () => {
    const reason = async (name: string) => (await run(name)).results[0].outcome;
    expect(await reason('tombol Hubungi admin widget Nexa → alih ke admin (website)')).toMatchObject({ action: 'handoff', reason: 'website' });
    expect(await reason('AI belum aktif → alih ke admin (ai_mati)')).toMatchObject({ action: 'handoff', reason: 'ai_mati' });
    const failed = await run('AI gagal → alih ke admin (ai_gagal); notifikasi gagal tercatat');
    expect(failed.results[0].outcome).toEqual({ action: 'handoff', reason: 'ai_gagal', sent: true, notified: false });
    expect(failed.queries.find((q) => q.q === Q.log)!.params[5]).toBe(0);
    expect(await reason('AI menjawab [[ADMIN]] → alih ke admin (ai_memutuskan)')).toMatchObject({ action: 'handoff', reason: 'ai_memutuskan' });
  });

  it('chat dijeda: bot diam; pesan lanjutan diteruskan ke admin hanya selama menunggu', async () => {
    const waiting = await run('chat dijeda menunggu admin: bot diam, pesan lanjutan diteruskan ke admin');
    expect(waiting.results[0].outcome).toEqual({ action: 'paused', forwarded: true });
    expect(waiting.http).toHaveLength(1);
    expect((waiting.http[0][3] as Record<string, string>).text).toBe(
      '💬 Pesan lanjutan dari Budi (+6282222222222):\n> Saya mau aplikasi kasir untuk 3 cabang\nBalas klien: https://wa.me/6282222222222',
    );
    const handled = await run('chat dijeda dan sudah ditangani admin: bot diam tanpa meneruskan');
    expect(handled.results[0].outcome).toEqual({ action: 'paused', forwarded: false });
    expect(handled.http).toEqual([]);
  });

  it('nomor bisnis: kiriman bot sendiri diabaikan, balasan manual admin menjeda bot', async () => {
    const own = await run('kiriman bot sendiri (fromMe, source api) diabaikan');
    expect(own.results[0].outcome).toEqual({ action: 'own' });
    const manual = await run('admin membalas manual dari nomor bisnis → bot dijeda, alih ke admin ditandai ditangani');
    expect(manual.results[0].outcome).toEqual({ action: 'admin_reply' });
    expect(manual.queries.slice(-2).map((q) => q.params)).toEqual([['6282222222222@c.us', '6282222222222', 12], ['6282222222222@c.us']]);
  });

  it('nomor admin: SELESAI <nomor> mengaktifkan bot; tanpa nomor → daftar; pesan biasa diam', async () => {
    const done = await run('nomor admin: SELESAI <nomor> → bot aktif lagi untuk klien itu');
    expect(done.queries.find((q) => q.q === Q.find)!.params).toEqual(['6282222222222', '6282222222222@c.us', '6282222222222@lid']);
    expect((done.http[0][3] as Record<string, string>)).toEqual({ session: 'default', chatId: '6281111111111@c.us', text: '✅ Bot aktif lagi untuk Budi (+6282222222222).' });
    const list = await run('nomor admin: SELESAI tanpa nomor, dua chat menunggu → daftar');
    expect((list.http[0][3] as Record<string, string>).text).toBe(
      'Ada 2 chat yang menunggu admin:\n- Budi (+6282222222222)\n- 99887766554433\nBalas *SELESAI <nomor>* untuk mengaktifkan bot lagi di chat itu.',
    );
    const ignored = await run('nomor admin: pesan biasa diabaikan (tidak dijawab AI)');
    expect(ignored.results[0].outcome).toEqual({ action: 'admin_ignored' });
    expect(ignored.http).toEqual([]);
  });

  it('klien @lid: nomor dicari lewat GET /api/{session}/lids/{lid}; foto tanpa teks → minta teks', async () => {
    const lid = await run('klien @lid minta admin: nomor dicari lewat WAHA lids');
    expect(lid.http[0]).toEqual(['GET', 'https://waha.uji.test/api/default/lids/123456789012345%40lid', 'api-uji', null]);
    expect(lid.queries.find((q) => q.q === Q.log)!.params.slice(0, 3)).toEqual(['123456789012345@lid', '6284444444444', 'Sari']);
    expect((lid.http[3][3] as Record<string, string>).text).toContain('Balas klien: https://wa.me/6284444444444');
    const media = await run('foto tanpa teks → minta teks');
    expect(media.results[0].outcome).toEqual({ action: 'media', sent: true });
    expect((media.http[1][3] as Record<string, string>).text).toMatch(/baru bisa membaca pesan teks/);
  });

  it('aksi admin: konfigurasi tanpa kunci utuh, tabel belum ada, simpan, uji kirim, Selesai', async () => {
    const get = await run('waha_get_config: pengaturan + log');
    expect(get.results[0].status).toBe(200);
    expect(JSON.stringify(get.results[0].body)).not.toContain('rahasia-db-9876');
    expect(get.results[0].body).toMatchObject({
      success: true,
      tables_ready: true,
      config: { key_masked: '••••9876', pause_hours: 6, hmac_env: true },
      handoffs: [{ id: 3, reason_label: 'Klien minta bicara dengan admin', notified: true, paused: true, handled_at: null }],
    });
    expect((await run('waha_get_config: tabel belum ada')).results[0].body).toMatchObject({ tables_ready: false, handoffs: [] });
    const save = await run('waha_save_config: simpan & hapus');
    expect(save.queries.filter((q) => q.q === Q.upsert).map((q) => q.params)).toEqual([
      ['waha_enabled', '1'], ['waha_url', 'https://waha.baru.test'], ['waha_admin_number', '6281233334444'], ['waha_pause_hours', '24'], ['waha_api_key', 'kunci-baru'],
    ]);
    expect(save.queries.find((q) => q.q === Q.delete)!.params).toEqual(['waha_session']);
    expect((await run('waha_save_config: nomor admin tidak valid → 400')).results[0]).toMatchObject({ status: 400, body: { code: 'VALIDATION', errors: { waha_admin_number: expect.any(String) } } });
    expect((await run('waha_test: WAHA menolak API key → 502')).results[0]).toEqual({
      status: 502,
      body: { error: 'WAHA menolak API key (HTTP 401). Periksa API key.', code: 'WAHA_SEND_FAILED' },
    });
    const sent = await run('waha_test: terkirim');
    expect(sent.results[0].body).toEqual({ success: true, sent: true });
    expect(sent.http[0]).toEqual(['POST', 'https://waha.uji.test/api/sendText', 'api-uji', expect.objectContaining({ chatId: '6281111111111@c.us' })]);
    expect((await run('waha_close_handoff: bot aktif lagi')).queries.slice(0, 2).map((q) => q.params)).toEqual([['6282222222222@c.us'], ['6282222222222@c.us']]);
    expect((await run('waha_close_handoff: tanpa chat → 400')).results[0].status).toBe(400);
  });
});

describe.skipIf(!phpAvailable)('waha.php menjawab sama dengan waha.js', () => {
  let php: { pure: Record<string, unknown[]>; flows: Outcome[] };
  beforeAll(() => {
    php = runPhp();
  });

  it('fungsi murni identik', () => {
    const node = nodePure();
    for (const key of Object.keys(node) as (keyof typeof node)[]) {
      expect({ key, value: php.pure[key] }).toEqual({ key, value: JSON.parse(JSON.stringify(node[key])) });
    }
  });

  it('alur webhook & aksi admin identik: status, isi jawaban, kueri, panggilan WAHA, riwayat untuk AI', async () => {
    for (const [index, c] of FLOW_CASES.entries()) {
      const node = await runNodeFlow(c);
      expect({ name: c.name, ...php.flows[index] }).toEqual({ name: c.name, ...JSON.parse(JSON.stringify(node)) });
    }
  });
});
