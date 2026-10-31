// Chatbot WhatsApp lewat WAHA (WhatsApp HTTP API) untuk server Node: sama dengan backend/modules/waha.php (fungsi murni,
// kueri, panggilan WAHA, alur webhook; __tests__/backend/waha.test.ts membandingkan keduanya). Penjelasan lengkap &
// variabel .env (WAHA_HMAC_KEY, WAHA_URL, WAHA_API_KEY, WAHA_SESSION, WAHA_ADMIN_NUMBER, WAHA_DAILY_LIMIT) ada di kepala
// waha.php dan docs/platform/WHATSAPP-BOT-SPEC.md.
//
// server.js memanggil handleWahaAction() di handler GET & POST /api.php setelah gerbang akses (createAuthGate):
// waha_webhook publik (tanda tangan HMAC atas req.rawBody yang disimpan express.json), aksi admin lewat ADMIN_ACTIONS.
import crypto from 'node:crypto';
import { createLimiter } from '../security.js';
import { nexaCleanMessages, nexaConfigRows, nexaLiveContext, nexaProviderReply, nexaResolveProvider } from './nexa.js';

const WAHA_DEFAULT_SESSION = 'default';
const WAHA_SESSION_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const WAHA_KEY_PATTERN = /^[\x21-\x7E]{1,300}$/;
const WAHA_URL_MAX = 300;
const WAHA_DEFAULT_PAUSE_HOURS = 12;
const WAHA_MAX_PAUSE_HOURS = 72;
const WAHA_TEXT_MAX = 1000;
const WAHA_REPLY_MAX = 4000;
const WAHA_HISTORY_MAX = 12;
const WAHA_NOTICE_RECENT = 3;
const WAHA_STALE_SECONDS = 3600;
const WAHA_PER_HOUR = 20;
const WAHA_PER_DAY = 60;
const WAHA_DEFAULT_DAILY_LIMIT = 500;
const WAHA_FORWARD_PER_HOUR = 5;
const WAHA_ADMIN_PER_HOUR = 60;
const WAHA_BAD_SIGNATURES = 20;
const WAHA_TIMEOUT = 15;
const WAHA_SITE_URL = 'https://garudanexa.com';

export const WAHA_REASONS = {
  permintaan: 'Klien minta bicara dengan admin',
  website: 'Klien menekan Hubungi admin di chat Nexa (website)',
  ai_memutuskan: 'Nexa AI menilai pertanyaan ini perlu admin',
  ai_mati: 'Nexa AI belum aktif (penyedia AI belum diatur)',
  ai_gagal: 'Nexa AI gagal menjawab',
  ai_batas: 'Batas harian jawaban AI tercapai',
  batas: 'Klien mengirim terlalu banyak pesan',
};

export const WAHA_TEXT_HANDOFF = 'Terima kasih sudah menghubungi Garuda Nexa. Pesan Anda sudah kami teruskan ke admin, dan admin kami akan segera membalas Anda.';
export const WAHA_TEXT_MEDIA = 'Maaf, saya baru bisa membaca pesan teks. Silakan ketik pertanyaan Anda, atau ketik *ADMIN* untuk bicara dengan admin kami.';
export const WAHA_TEXT_ADMIN_HINT = 'Ketik *ADMIN* kapan saja untuk bicara dengan admin kami.';
const WAHA_TEXT_TEST = 'Tes bot WhatsApp Garuda Nexa: notifikasi untuk admin sampai di nomor ini.';
const WAHA_MEDIA_LABEL = '(pesan media)';

export const WAHA_CHANNEL_INSTRUCTIONS = `KANAL WHATSAPP
Percakapan ini berlangsung di WhatsApp resmi Garuda Nexa, bukan di jendela chat situs. Aturan tambahan untuk kanal ini:
- Jawab lebih ringkas, paling panjang sekitar 80 kata.
- Pengguna sudah berada di WhatsApp kami: jangan menyarankan menghubungi WhatsApp kami dan jangan menulis tautan wa.me.
- Jangan menulis kode [proyek:...]; cukup sebut nama proyeknya.
- Bila pengguna meminta bicara dengan admin atau manusia, menanyakan status pesanan, pembayaran, atau proyeknya, menyampaikan keluhan, atau butuh keputusan yang hanya bisa diberikan tim, balas HANYA dengan [[ADMIN]] tanpa teks lain: sistem akan meneruskan chat ini ke admin manusia.
- Pengguna bisa mengetik ADMIN kapan saja untuk bicara dengan admin.`;

// = WAHA_ADMIN_WORDS / WAHA_POLITE_WORDS / WAHA_ADMIN_PHRASES di waha.php
const WAHA_ADMIN_WORDS = ['admin', 'cs', 'manusia', 'human', 'operator', 'petugas', 'agent', 'agen'];
const WAHA_POLITE_WORDS = ['dong', 'please', 'pls', 'plis', 'tolong'];
const WAHA_ADMIN_PHRASES = [
  'bicara dengan admin', 'bicara sama admin', 'bicara ke admin', 'ngobrol dengan admin', 'ngobrol sama admin',
  'chat dengan admin', 'chat sama admin', 'hubungi admin', 'hubungkan ke admin', 'hubungkan dengan admin',
  'sambungkan ke admin', 'sambungkan dengan admin', 'minta admin', 'panggil admin', 'mau ke admin', 'butuh admin',
  'perlu admin', 'customer service', 'bicara dengan manusia', 'bicara dengan orang', 'ngobrol dengan manusia',
  'dengan orang asli', 'bukan bot', 'talk to a human', 'talk to human', 'speak to a human', 'speak to human',
  'real person', 'live agent', 'talk to admin', 'contact admin',
];
const WAHA_WEBSITE_PHRASE = 'butuh bantuan admin';
const WAHA_WEBSITE_SOURCE = 'dari chat nexa';
const WAHA_SITE_PATHS = /(^|[^\w/.])(\/(?:template|harga|pesan-custom|jasa-pembuatan-website|jasa-pembuatan-aplikasi-mobile|tentang|kontak|panduan|syarat-ketentuan|kebijakan-privasi|kebijakan-pengembalian-dana)(?:\/[a-z0-9-]+)*)(?![a-z0-9-])/gm;

// ── Kueri (= WAHA_Q_* di waha.php) ──
const Q_CONFIG = "SELECT setting_key, setting_value FROM hero_settings WHERE setting_key IN ('waha_enabled', 'waha_url', 'waha_api_key', 'waha_session', 'waha_admin_number', 'waha_pause_hours')";
const Q_SEEN = 'INSERT IGNORE INTO waha_seen (message_key) VALUES (?)';
const Q_PRUNE = 'DELETE FROM waha_seen WHERE created_at < NOW() - INTERVAL 3 DAY LIMIT 50';
const Q_CHAT = 'SELECT chat_id, phone, name, history, handoff_status, paused_until > NOW() AS paused, last_in_at < NOW() - INTERVAL 1 DAY AS stale FROM waha_chats WHERE chat_id = ? LIMIT 1';
const Q_CHAT_SAVE = 'INSERT INTO waha_chats (chat_id, phone, name, history, last_message, last_in_at) VALUES (?, ?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE phone = COALESCE(VALUES(phone), phone), name = COALESCE(VALUES(name), name), history = VALUES(history), last_message = VALUES(last_message), last_in_at = VALUES(last_in_at)';
const Q_CHAT_TOUCH = 'UPDATE waha_chats SET last_message = ?, last_in_at = NOW(), name = COALESCE(?, name) WHERE chat_id = ?';
const Q_CHAT_HANDOFF = "INSERT INTO waha_chats (chat_id, phone, name, history, last_message, last_in_at, paused_until, handoff_status) VALUES (?, ?, ?, ?, ?, NOW(), NOW() + INTERVAL ? HOUR, 'menunggu') ON DUPLICATE KEY UPDATE phone = COALESCE(VALUES(phone), phone), name = COALESCE(VALUES(name), name), history = VALUES(history), last_message = VALUES(last_message), last_in_at = VALUES(last_in_at), paused_until = VALUES(paused_until), handoff_status = 'menunggu'";
const Q_HANDOFF_LOG = 'INSERT INTO waha_handoffs (chat_id, phone, name, reason, message, notified) VALUES (?, ?, ?, ?, ?, ?)';
const Q_ADMIN_REPLY = "INSERT INTO waha_chats (chat_id, phone, paused_until) VALUES (?, ?, NOW() + INTERVAL ? HOUR) ON DUPLICATE KEY UPDATE paused_until = VALUES(paused_until), handoff_status = IF(handoff_status = 'menunggu', 'ditangani', handoff_status)";
const Q_HANDLED = "UPDATE waha_handoffs SET status = 'ditangani', handled_at = NOW() WHERE chat_id = ? AND status = 'menunggu'";
const Q_RESUME_CHAT = "UPDATE waha_chats SET paused_until = NULL, handoff_status = IF(handoff_status = '', '', 'selesai') WHERE chat_id = ?";
const Q_RESUME_LOG = "UPDATE waha_handoffs SET status = 'selesai', closed_at = NOW() WHERE chat_id = ? AND status <> 'selesai'";
const Q_FIND_CHAT = 'SELECT chat_id, phone, name FROM waha_chats WHERE phone = ? OR chat_id = ? OR chat_id = ? ORDER BY updated_at DESC LIMIT 1';
const Q_WAITING = "SELECT chat_id, phone, name FROM waha_chats WHERE handoff_status IN ('menunggu', 'ditangani') AND paused_until > NOW() ORDER BY updated_at DESC LIMIT 10";
const Q_HANDOFFS = 'SELECT h.id, h.chat_id, h.phone, h.name, h.reason, h.message, h.status, h.notified, h.created_at, h.handled_at, h.closed_at, c.paused_until > NOW() AS paused FROM waha_handoffs h LEFT JOIN waha_chats c ON c.chat_id = h.chat_id ORDER BY h.id DESC LIMIT 30';

// Batas (= rate_limit_* berkas di api.php, di sini di memori)
const chatHourLimiter = createLimiter(3600 * 1000, WAHA_PER_HOUR);
const chatDayLimiter = createLimiter(86400 * 1000, WAHA_PER_DAY);
const dailyLimiters = new Map();
const forwardLimiter = createLimiter(3600 * 1000, WAHA_FORWARD_PER_HOUR);
const adminLimiter = createLimiter(3600 * 1000, WAHA_ADMIN_PER_HOUR);
const signatureLimiter = createLimiter(900 * 1000, WAHA_BAD_SIGNATURES);

/** Galat yang pesannya aman untuk klien (= ApiError api.php). */
export class WahaError extends Error {
  constructor(message, status = 400, code = null, errors = null, headers = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.errors = errors;
    this.headers = headers;
  }
}

// ── Pembantu yang meniru fungsi PHP ──

const envValue = (key, fallback = '') => (process.env[key] === undefined || process.env[key] === '' ? fallback : process.env[key]);
/** trim() PHP: hanya spasi ASCII, bukan spasi Unicode seperti String.prototype.trim. */
const phpTrim = (value) => String(value).replace(/^[ \t\n\r\0\x0B]+|[ \t\n\r\0\x0B]+$/g, '');
/** strtolower() PHP 8: hanya huruf ASCII. */
const asciiLower = (value) => String(value).replace(/[A-Z]+/g, (s) => s.toLowerCase());
const byteLength = (value) => Buffer.byteLength(value, 'utf8');
/** is_array() PHP untuk hasil json_decode: objek dan daftar. */
const isArrayLike = (value) => value !== null && typeof value === 'object';
const hasKey = (object, key) => isArrayLike(object) && Object.hasOwn(object, key);
const chars = (value) => [...value];
/** Potong ke `max` code point (= waha_clip / mb_substr). */
const clip = (text, max) => chars(text).slice(0, max).join('');
const nullable = (value) => (value === '' ? null : value);

/** json_decode($raw, true) PHP: UTF-8 ketat, BOM ditolak; gagal → null. */
const STRICT_UTF8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
function phpJsonDecode(raw) {
  try {
    return JSON.parse(STRICT_UTF8.decode(raw));
  } catch {
    return null;
  }
}

// ── Pengaturan ──

/** = waha_mask_key */
export function wahaMaskKey(key) {
  if (key === '') return '';
  const list = chars(key);
  return `••••${list.slice(Math.max(0, list.length - 4)).join('')}`;
}

/** = waha_base_url */
export function wahaBaseUrl(url) {
  const value = phpTrim(url);
  if (value === '' || byteLength(value) > WAHA_URL_MAX) return null;
  const m = value.match(/^(https?):\/\/([A-Za-z0-9.-]+)(:[0-9]{1,5})?(\/[A-Za-z0-9._~%/-]*)?$/i);
  if (!m) return null;
  const host = asciiLower(m[2]);
  if (host.replace(/^[.-]+|[.-]+$/g, '') !== host) return null;
  const port = m[3] ?? '';
  if (port !== '' && (Number(port.slice(1)) < 1 || Number(port.slice(1)) > 65535)) return null;
  return `${asciiLower(m[1])}://${host}${port}${(m[4] ?? '').replace(/\/+$/, '')}`;
}

/** = waha_origin */
export function wahaOrigin(url) {
  const base = wahaBaseUrl(url);
  const m = base === null ? null : base.match(/^(https?:\/\/[^/]+)/);
  return m ? m[1] : '';
}

/** = waha_number */
export function wahaNumber(raw) {
  let digits = String(raw).replace(/\D+/g, '');
  if (digits === '') return '';
  if (digits[0] === '0') digits = `62${digits.slice(1)}`;
  return digits.length >= 8 && digits.length <= 15 ? digits : '';
}

/** = waha_session_name */
export function wahaSessionName(raw) {
  const value = phpTrim(raw);
  return WAHA_SESSION_PATTERN.test(value) ? value : '';
}

/** = waha_pause_hours */
export function wahaPauseHours(raw) {
  const text = typeof raw === 'string' ? raw : typeof raw === 'number' ? String(raw) : raw === true ? '1' : '';
  const value = phpTrim(text);
  if (!/^[0-9]{1,3}$/.test(value)) return WAHA_DEFAULT_PAUSE_HOURS;
  const hours = Number(value);
  return hours >= 1 && hours <= WAHA_MAX_PAUSE_HOURS ? hours : WAHA_DEFAULT_PAUSE_HOURS;
}

/** = waha_env */
export function wahaEnv() {
  return {
    url: envValue('WAHA_URL'),
    key: envValue('WAHA_API_KEY'),
    session: envValue('WAHA_SESSION'),
    admin: envValue('WAHA_ADMIN_NUMBER'),
    hmac: envValue('WAHA_HMAC_KEY') !== '',
  };
}

/** = waha_config_resolve */
export function wahaConfigResolve(rows, env) {
  const envUrl = wahaBaseUrl(String(env.url ?? ''));
  const url = wahaBaseUrl(String(rows.waha_url ?? '')) ?? envUrl ?? '';
  const dbKey = phpTrim(String(rows.waha_api_key ?? ''));
  const envKey = phpTrim(String(env.key ?? ''));
  const key = dbKey !== '' ? dbKey : envUrl !== null && url !== '' && wahaOrigin(url) === wahaOrigin(envUrl) ? envKey : '';
  let session = wahaSessionName(String(rows.waha_session ?? ''));
  if (session === '') session = wahaSessionName(String(env.session ?? ''));
  let admin = wahaNumber(String(rows.waha_admin_number ?? ''));
  if (admin === '') admin = wahaNumber(String(env.admin ?? ''));
  return {
    enabled: (rows.waha_enabled ?? '1') !== '0',
    url,
    key,
    session: session !== '' ? session : WAHA_DEFAULT_SESSION,
    admin,
    pause_hours: wahaPauseHours(rows.waha_pause_hours ?? ''),
  };
}

/** = waha_config_out */
export function wahaConfigOut(rows, env) {
  const cfg = wahaConfigResolve(rows, env);
  return {
    enabled: cfg.enabled,
    url: phpTrim(String(rows.waha_url ?? '')),
    url_env: wahaBaseUrl(String(env.url ?? '')) ?? '',
    session: phpTrim(String(rows.waha_session ?? '')),
    session_env: wahaSessionName(String(env.session ?? '')),
    admin_number: phpTrim(String(rows.waha_admin_number ?? '')),
    admin_number_env: wahaNumber(String(env.admin ?? '')),
    pause_hours: cfg.pause_hours,
    key_masked: wahaMaskKey(phpTrim(String(rows.waha_api_key ?? ''))),
    key_env: phpTrim(String(env.key ?? '')) !== '',
    hmac_env: Boolean(env.hmac),
    effective: { url: cfg.url, session: cfg.session, admin_number: cfg.admin, key: cfg.key !== '' },
  };
}

/** = waha_config_writes */
export function wahaConfigWrites(input, current, env) {
  const enabled = input.enabled ?? null;
  const writes = { waha_enabled: (enabled ?? true) === false || (enabled ?? '') === '0' ? '0' : '1' };
  const deletes = [];
  const fields = [
    ['url', 'waha_url', 'Alamat WAHA tidak valid: pakai http(s)://alamat-server[:port], mis. https://waha.contoh.com.'],
    ['session', 'waha_session', 'Nama session tidak valid: huruf, angka, - atau _ (maks. 64 karakter).'],
    ['admin_number', 'waha_admin_number', 'Nomor WhatsApp admin tidak valid: 8–15 angka, mis. 6281234567890.'],
  ];
  for (const [field, key, message] of fields) {
    if (!hasKey(input, field)) continue;
    if (typeof input[field] !== 'string') throw new WahaError('Pengaturan WhatsApp tidak valid.', 400, 'VALIDATION');
    const value = phpTrim(input[field]);
    if (value === '') {
      deletes.push(key);
      continue;
    }
    const clean = field === 'url' ? wahaBaseUrl(value) : field === 'session' ? wahaSessionName(value) : wahaNumber(value);
    if (clean === null || clean === '') throw new WahaError(message, 400, 'VALIDATION', { [key]: message });
    writes[key] = clean;
  }
  if (hasKey(input, 'pause_hours')) {
    const raw = input.pause_hours;
    const hours = Number.isInteger(raw) ? raw : typeof raw === 'string' && /^[ \t\n\r\v\f]*[0-9]{1,3}[ \t\n\r\v\f]*$/.test(raw) ? Number(raw.trim()) : 0;
    if (hours < 1 || hours > WAHA_MAX_PAUSE_HOURS) {
      throw new WahaError('Lama jeda bot harus 1–72 jam.', 400, 'VALIDATION', { waha_pause_hours: 'Isi 1–72 jam.' });
    }
    writes.waha_pause_hours = String(hours);
  }
  if (hasKey(input, 'key')) {
    const key = input.key;
    if (key === null) {
      deletes.push('waha_api_key');
    } else if (typeof key !== 'string') {
      throw new WahaError('API key WAHA tidak valid.', 400, 'VALIDATION');
    } else if (phpTrim(key) !== '') {
      if (!WAHA_KEY_PATTERN.test(phpTrim(key))) {
        throw new WahaError('API key WAHA tidak valid: tanpa spasi, maks. 300 karakter.', 400, 'VALIDATION', { waha_api_key: 'Periksa kembali API key yang ditempel.' });
      }
      writes.waha_api_key = phpTrim(key);
    }
  }
  const envUrl = String(env.url ?? '');
  const oldUrl = wahaBaseUrl(String(current.waha_url ?? '')) ?? wahaBaseUrl(envUrl) ?? '';
  const newUrl = Object.hasOwn(writes, 'waha_url') ? writes.waha_url : deletes.includes('waha_url') ? wahaBaseUrl(envUrl) ?? '' : null;
  if (newUrl !== null && wahaOrigin(oldUrl) !== '' && wahaOrigin(newUrl) !== wahaOrigin(oldUrl)
    && !Object.hasOwn(writes, 'waha_api_key') && !deletes.includes('waha_api_key')
    && phpTrim(String(current.waha_api_key ?? '')) !== '') {
    deletes.push('waha_api_key');
  }
  return { writes, deletes };
}

// ── Database (setiap nilai di-bind; tanggal kembali sebagai teks seperti mysqli) ──

async function dbRun(db, sql, params = []) {
  const [result] = await db.query({ sql, values: params, dateStrings: true });
  return result;
}

async function dbOne(db, sql, params = []) {
  const rows = await dbRun(db, sql, params);
  return rows[0] || null;
}

const missingTable = (err) => Boolean(err) && (err.errno === 1146 || err.code === 'ER_NO_SUCH_TABLE');

/** = waha_config_rows */
async function wahaConfigRows(pool) {
  const rows = {};
  for (const row of await dbRun(pool, Q_CONFIG)) rows[row.setting_key] = String(row.setting_value ?? '');
  return rows;
}

// ── Event webhook (fungsi murni) ──

/** = waha_signature_ok; `raw` = body mentah (Buffer). */
export function wahaSignatureOk(raw, given, algorithm, key) {
  if (key === '') return false;
  const algo = asciiLower(phpTrim(String(algorithm ?? '')));
  if (algo !== '' && algo !== 'sha512') return false;
  const signature = asciiLower(phpTrim(String(given ?? '')));
  if (!/^[0-9a-f]{128}$/.test(signature)) return false;
  const expected = crypto.createHmac('sha512', key).update(raw).digest();
  return crypto.timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}

/** = waha_normalize_chat */
export function wahaNormalizeChat(chatId) {
  return asciiLower(phpTrim(chatId)).replace(/@s\.whatsapp\.net$/, '@c.us').replace(/^([0-9]+):[0-9]+@/, '$1@');
}

/** = waha_chat_kind */
export function wahaChatKind(chatId) {
  if (chatId === '' || byteLength(chatId) > 100) return 'other';
  if (/@g\.us$/.test(chatId)) return 'group';
  if (/@broadcast$/.test(chatId)) return 'status';
  if (/@newsletter$/.test(chatId)) return 'channel';
  return /^[0-9]{5,25}@(c\.us|lid)$/.test(chatId) ? 'user' : 'other';
}

/** = waha_phone_of */
export function wahaPhoneOf(chatId) {
  const m = chatId.match(/^([0-9]{6,20})@c\.us$/);
  return m ? m[1] : '';
}

/** = waha_chat_digits */
function wahaChatDigits(chatId) {
  const m = chatId.match(/^([0-9]+)@/);
  return m ? m[1] : chatId;
}

/** = waha_contact_name */
function wahaContactName(payload) {
  const data = isArrayLike(payload._data) ? payload._data : {};
  const info = isArrayLike(data.Info) ? data.Info : {};
  for (const value of [data.notifyName, data.pushName, info.PushName, data.PushName]) {
    if (typeof value !== 'string') continue;
    const name = phpTrim(value.replace(/[\x00-\x1F\x7F]+/g, ' '));
    if (name !== '') return clip(name, 60);
  }
  return '';
}

/** = waha_parse_event */
export function wahaParseEvent(body, session, now) {
  if (!isArrayLike(body)) return { ignore: 'body' };
  const event = hasKey(body, 'event') ? body.event : null;
  if (event !== 'message' && event !== 'message.any') return { ignore: 'event' };
  if ((hasKey(body, 'session') ? body.session : null) !== session) return { ignore: 'session' };
  const p = hasKey(body, 'payload') ? body.payload : null;
  if (!hasKey(p, 'id') || typeof p.id !== 'string' || p.id === '' || byteLength(p.id) > 255) return { ignore: 'payload' };
  const fromMe = hasKey(p, 'fromMe') && p.fromMe === true;
  const raw = fromMe ? (hasKey(p, 'to') ? p.to : null) : hasKey(p, 'from') ? p.from : null;
  if (typeof raw !== 'string') return { ignore: 'payload' };
  const chat = wahaNormalizeChat(raw);
  if (wahaChatKind(chat) !== 'user') return { ignore: 'chat' };
  const ts = hasKey(p, 'timestamp') ? p.timestamp : null;
  if (typeof ts === 'number' && ts > 0 && ts < 1e11 && now - ts > WAHA_STALE_SECONDS) return { ignore: 'stale' };
  return {
    message: {
      id: p.id,
      chat,
      phone: wahaPhoneOf(chat),
      from_me: fromMe,
      source: hasKey(p, 'source') && typeof p.source === 'string' ? p.source : '',
      text: clip(phpTrim(hasKey(p, 'body') && typeof p.body === 'string' ? p.body : ''), WAHA_TEXT_MAX),
      media: hasKey(p, 'hasMedia') && p.hasMedia === true,
      name: fromMe ? '' : wahaContactName(p),
    },
  };
}

/** = waha_normalize_words */
const wahaNormalizeWords = (text) => phpTrim(asciiLower(text).replace(/[^a-z0-9]+/g, ' '));

/** = waha_wants_admin */
export function wahaWantsAdmin(text) {
  const norm = wahaNormalizeWords(text);
  if (norm === '') return '';
  const padded = ` ${norm} `;
  if (padded.includes(` ${WAHA_WEBSITE_PHRASE} `)) return padded.includes(` ${WAHA_WEBSITE_SOURCE} `) ? 'website' : 'permintaan';
  const words = [...new Set(norm.split(' ').filter((word) => !WAHA_POLITE_WORDS.includes(word)))];
  if (words.length === 1 && WAHA_ADMIN_WORDS.includes(words[0])) return 'permintaan';
  return WAHA_ADMIN_PHRASES.some((phrase) => padded.includes(` ${phrase} `)) ? 'permintaan' : '';
}

/** = waha_format_reply */
export function wahaFormatReply(text) {
  if (/\[\[\s*admin\s*\]\]/i.test(text)) return { text: '', handoff: true };
  let s = text.replace(/[ \t]*(?:[:–—-][ \t]*)?(?:kode[ \t]*:?[ \t]*)?\[proyek:[a-z0-9-]{1,120}\]/gi, '');
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '*$1*');
  s = s.replace(/^#{1,6}[ \t]+/gm, '');
  s = s.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1 ($2)');
  s = s.replace(WAHA_SITE_PATHS, `$1${WAHA_SITE_URL}$2`);
  s = phpTrim(s.replace(/\n{3,}/g, '\n\n'));
  return { text: clip(s, WAHA_REPLY_MAX), handoff: false };
}

/** = waha_history_messages */
export function wahaHistoryMessages(stored, stale, text) {
  const list = [];
  if (!stale && typeof stored === 'string' && stored !== '') {
    let decoded = null;
    try {
      decoded = JSON.parse(stored);
    } catch {
      decoded = null;
    }
    const items = Array.isArray(decoded) ? decoded : isArrayLike(decoded) ? Object.values(decoded) : [];
    for (const m of items) {
      if (!isArrayLike(m) || !['user', 'assistant'].includes(m.role) || typeof m.content !== 'string') continue;
      if (phpTrim(m.content) !== '') list.push({ role: m.role, content: m.content });
    }
  }
  list.push({ role: 'user', content: text });
  const merged = [];
  for (const m of list) {
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) last.content += `\n${m.content}`;
    else merged.push({ ...m });
  }
  for (const m of merged) {
    const max = m.role === 'user' ? WAHA_TEXT_MAX : WAHA_REPLY_MAX;
    const list2 = chars(m.content);
    if (list2.length > max) m.content = list2.slice(list2.length - max).join('');
  }
  const out = merged.slice(-WAHA_HISTORY_MAX);
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}

/** = waha_history_json */
export function wahaHistoryJson(messages, reply) {
  return JSON.stringify([...messages, { role: 'assistant', content: reply }].slice(-WAHA_HISTORY_MAX));
}

/** = waha_recent_messages */
function wahaRecentMessages(messages) {
  return messages.filter((m) => m.role === 'user').map((m) => clip(m.content, 300)).slice(-WAHA_NOTICE_RECENT);
}

/** = waha_who */
function wahaWho(name, phone, chatId) {
  const label = phone !== '' ? `+${phone}` : wahaChatDigits(chatId);
  return name !== '' ? `${name} (${label})` : label;
}

/** = waha_quote */
const wahaQuote = (text) => `> ${text.split('\n').join('\n> ')}`;

/** = waha_admin_notice */
export function wahaAdminNotice(name, phone, chatId, reason, recent, pauseHours) {
  const id = phone !== '' ? phone : wahaChatDigits(chatId);
  const lines = [
    '🔔 *Klien butuh respons admin (human)*',
    `Nama: ${name !== '' ? name : '-'}`,
    `Nomor: ${phone !== '' ? `+${phone}` : `tersembunyi (ID privasi WhatsApp ${id})`}`,
    `Alasan: ${WAHA_REASONS[reason] ?? reason}`,
  ];
  if (recent.length) {
    lines.push('Pesan terakhir:');
    for (const text of recent) lines.push(wahaQuote(text));
  }
  lines.push('');
  lines.push(phone !== '' ? `Balas klien: https://wa.me/${phone}` : 'Balas lewat chat WhatsApp bisnis (nomor klien tersembunyi).');
  lines.push('');
  lines.push(`Bot dijeda untuk chat ini selama ${pauseHours} jam. Bila sudah selesai, balas *SELESAI ${id}* agar bot aktif lagi.`);
  return lines.join('\n');
}

/** = waha_forward_notice */
function wahaForwardNotice(name, phone, chatId, text) {
  const out = `💬 Pesan lanjutan dari ${wahaWho(name, phone, chatId)}:\n${wahaQuote(clip(text, 500))}`;
  return phone !== '' ? `${out}\nBalas klien: https://wa.me/${phone}` : out;
}

/** = waha_admin_command */
export function wahaAdminCommand(text) {
  const m = text.match(/^\s*(?:selesai|done)(?:[\s:,-]+(\+?[0-9][0-9 .-]{4,30}))?\s*$/i);
  if (!m) return null;
  let number = m[1] !== undefined ? m[1].replace(/\D+/g, '') : '';
  if (number !== '' && number[0] === '0') number = `62${number.slice(1)}`;
  return { number };
}

/** = waha_waiting_text */
function wahaWaitingText(rows) {
  const lines = [`Ada ${rows.length} chat yang menunggu admin:`];
  for (const row of rows) lines.push(`- ${wahaWho(String(row.name ?? ''), String(row.phone ?? ''), String(row.chat_id))}`);
  lines.push('Balas *SELESAI <nomor>* untuk mengaktifkan bot lagi di chat itu.');
  return lines.join('\n');
}

/** = waha_test_error */
export function wahaTestError(status) {
  if (status === 0) return 'WAHA tidak bisa dihubungi. Periksa alamat WAHA dan pastikan servernya berjalan.';
  if (status === 401 || status === 403) return `WAHA menolak API key (HTTP ${status}). Periksa API key.`;
  if (status === 404) return 'Session atau alamat WAHA tidak ditemukan (HTTP 404). Periksa nama session dan alamat.';
  if (status === 422) return 'Session WAHA belum siap (HTTP 422): pindai kode QR di dasbor WAHA, lalu coba lagi.';
  return `WAHA menolak pesan uji (HTTP ${status}).`;
}

// ── Panggilan WAHA ──

/** = waha_http: [kode HTTP (0 = putus/lewat waktu), JSON atau null]. Tanpa mengikuti redirect. Tidak melempar. */
async function wahaHttp(method, url, apiKey, body) {
  const headers = { Accept: 'application/json' };
  if (apiKey !== '') headers['X-Api-Key'] = apiKey;
  const init = { method, headers, redirect: 'manual', signal: AbortSignal.timeout(WAHA_TIMEOUT * 1000) };
  if (method === 'POST') {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  try {
    const response = await fetch(url, init);
    const text = await response.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
    return [response.status, data];
  } catch {
    return [0, null];
  }
}

/** = waha_send_text */
async function wahaSendText(cfg, chatId, text, deps) {
  const [status] = await deps.http('POST', `${cfg.url}/api/sendText`, cfg.key, { session: cfg.session, chatId, text });
  if (status < 200 || status >= 300) console.error(`[waha] sendText HTTP ${status}`);
  return status >= 200 && status < 300;
}

/** = waha_reply */
async function wahaReply(cfg, chatId, text, deps) {
  await deps.http('POST', `${cfg.url}/api/sendSeen`, cfg.key, { session: cfg.session, chatId });
  return wahaSendText(cfg, chatId, text, deps);
}

/** = waha_lid_phone */
async function wahaLidPhone(cfg, chatId, deps) {
  const [status, data] = await deps.http('GET', `${cfg.url}/api/${encodeURIComponent(cfg.session)}/lids/${encodeURIComponent(chatId)}`, cfg.key, null);
  if (status !== 200 || !isArrayLike(data) || typeof data.pn !== 'string') return '';
  return wahaPhoneOf(wahaNormalizeChat(data.pn));
}

/** = waha_ai_reply */
async function wahaAiReply(pool, history) {
  const messages = nexaCleanMessages(history);
  if (messages === null) return { error: 'riwayat chat tidak valid' };
  const active = nexaResolveProvider(await nexaConfigRows(pool), envValue('ANTHROPIC_API_KEY'), envValue('GEMINI_API_KEY'));
  if (active === null) return { offline: true };
  return nexaProviderReply(active, `${await nexaLiveContext(pool)}\n\n${WAHA_CHANNEL_INSTRUCTIONS}`, messages);
}

/** Dependensi produksi (tes menggantinya dengan tiruan). */
export const WAHA_DEPS = { http: wahaHttp, ai: wahaAiReply };

// ── Alur webhook ──

const tooMany = (seconds) =>
  new WahaError(`Terlalu banyak percobaan. Coba lagi dalam ${Math.max(1, Math.ceil(seconds / 60))} menit.`, 429, null, null, { 'Retry-After': String(seconds) });

/** = waha_webhook: { body, job } atau melempar WahaError (401/429/503). */
export async function wahaWebhook(pool, raw, hmac, algorithm, now, ip) {
  const key = envValue('WAHA_HMAC_KEY');
  if (key === '') throw new WahaError('Webhook WhatsApp belum dikonfigurasi.', 503, 'WAHA_OFFLINE');
  if (!wahaSignatureOk(raw, hmac, algorithm, key)) {
    const ipKey = `waha-sig|${ip}`;
    const wait = signatureLimiter.retryAfter(ipKey);
    signatureLimiter.hit(ipKey);
    if (wait) throw tooMany(wait);
    throw new WahaError('Tanda tangan webhook tidak valid.', 401, 'WAHA_SIGNATURE');
  }
  const cfg = wahaConfigResolve(await wahaConfigRows(pool), wahaEnv());
  if (!cfg.enabled) return { body: { ignored: 'disabled' }, job: null };
  const event = wahaParseEvent(phpJsonDecode(raw), cfg.session, now);
  if (event.ignore !== undefined) return { body: { ignored: event.ignore }, job: null };
  if (cfg.url === '') return { body: { ignored: 'not_configured' }, job: null };
  let seen;
  try {
    seen = await dbRun(pool, Q_SEEN, [crypto.createHash('sha256').update(event.message.id, 'utf8').digest('hex')]);
  } catch (err) {
    if (missingTable(err)) throw new WahaError('Tabel bot WhatsApp belum ada: jalankan migrasi 054.', 503, 'WAHA_NOT_READY');
    throw err;
  }
  if (Number(seen?.affectedRows ?? 0) === 0) return { body: { ignored: 'duplicate' }, job: null };
  await dbRun(pool, Q_PRUNE);
  return { body: { accepted: true }, job: { cfg, message: event.message } };
}

/** = waha_handle_message */
export async function wahaHandleMessage(pool, cfg, msg, deps) {
  const chat = msg.chat;
  if (msg.from_me) {
    if (msg.source === 'api') return { action: 'own' };
    await dbRun(pool, Q_ADMIN_REPLY, [chat, nullable(msg.phone), cfg.pause_hours]);
    await dbRun(pool, Q_HANDLED, [chat]);
    return { action: 'admin_reply' };
  }
  if (cfg.admin !== '' && msg.phone === cfg.admin) return wahaAdminMessage(pool, cfg, msg, deps);

  const row = await dbOne(pool, Q_CHAT, [chat]);
  const label = msg.text !== '' ? msg.text : WAHA_MEDIA_LABEL;
  if (row !== null && Number(row.paused ?? 0) === 1) {
    await dbRun(pool, Q_CHAT_TOUCH, [label, nullable(msg.name), chat]);
    let forwarded = false;
    if ((row.handoff_status ?? '') === 'menunggu' && cfg.admin !== '') {
      const key = `waha-fwd|${chat}`;
      if (!forwardLimiter.retryAfter(key)) {
        forwardLimiter.hit(key);
        const name = msg.name !== '' ? msg.name : String(row.name ?? '');
        const phone = msg.phone !== '' ? msg.phone : String(row.phone ?? '');
        forwarded = await wahaSendText(cfg, `${cfg.admin}@c.us`, wahaForwardNotice(name, phone, chat, label), deps);
      }
    }
    return { action: 'paused', forwarded };
  }

  const wants = wahaWantsAdmin(msg.text);
  if (wants !== '') return wahaHandoff(pool, cfg, msg, row, wants, deps);
  if (msg.text === '') {
    const sent = await wahaReply(cfg, chat, WAHA_TEXT_MEDIA, deps);
    await dbRun(pool, Q_CHAT_SAVE, [chat, nullable(msg.phone), nullable(msg.name), row?.history ?? null, label]);
    return { action: 'media', sent };
  }

  const hourKey = `waha|${chat}`;
  const dayKey = `waha-day|${chat}`;
  if (chatHourLimiter.retryAfter(hourKey) || chatDayLimiter.retryAfter(dayKey)) return wahaHandoff(pool, cfg, msg, row, 'batas', deps);
  const dailyLimit = Math.max(1, Number.parseInt(envValue('WAHA_DAILY_LIMIT', String(WAHA_DEFAULT_DAILY_LIMIT)), 10) || 0);
  if (!dailyLimiters.has(dailyLimit)) dailyLimiters.set(dailyLimit, createLimiter(86400 * 1000, dailyLimit));
  const daily = dailyLimiters.get(dailyLimit);
  if (daily.retryAfter('waha|all')) return wahaHandoff(pool, cfg, msg, row, 'ai_batas', deps);
  chatHourLimiter.hit(hourKey);
  chatDayLimiter.hit(dayKey);
  daily.hit('waha|all');

  const stale = row !== null && Number(row.stale ?? 0) === 1;
  const messages = wahaHistoryMessages(row?.history ?? null, stale, msg.text);
  const result = await deps.ai(pool, messages);
  if (result?.offline) return wahaHandoff(pool, cfg, msg, row, 'ai_mati', deps);
  if (typeof result?.reply !== 'string') {
    console.error(`[waha] AI: ${String(result?.error ?? 'tanpa jawaban')}`);
    return wahaHandoff(pool, cfg, msg, row, 'ai_gagal', deps);
  }
  const reply = wahaFormatReply(result.reply);
  if (reply.handoff) return wahaHandoff(pool, cfg, msg, row, 'ai_memutuskan', deps);
  if (reply.text === '') return wahaHandoff(pool, cfg, msg, row, 'ai_gagal', deps);
  const text = messages.length === 1 ? `${reply.text}\n\n${WAHA_TEXT_ADMIN_HINT}` : reply.text;
  const sent = await wahaReply(cfg, chat, text, deps);
  await dbRun(pool, Q_CHAT_SAVE, [chat, nullable(msg.phone), nullable(msg.name), wahaHistoryJson(messages, reply.text), label]);
  return { action: 'ai', sent };
}

/** = waha_handoff */
async function wahaHandoff(pool, cfg, msg, row, reason, deps) {
  const chat = msg.chat;
  let phone = msg.phone !== '' ? msg.phone : String(row?.phone ?? '');
  if (phone === '' && chat.endsWith('@lid')) phone = await wahaLidPhone(cfg, chat, deps);
  const name = msg.name !== '' ? msg.name : String(row?.name ?? '');
  const label = msg.text !== '' ? msg.text : WAHA_MEDIA_LABEL;
  const stale = row !== null && Number(row.stale ?? 0) === 1;
  const messages = wahaHistoryMessages(row?.history ?? null, stale, label);
  await dbRun(pool, Q_CHAT_HANDOFF, [chat, nullable(phone), nullable(name), wahaHistoryJson(messages, WAHA_TEXT_HANDOFF), label, cfg.pause_hours]);
  const sent = await wahaReply(cfg, chat, WAHA_TEXT_HANDOFF, deps);
  let notified = false;
  if (cfg.admin !== '' && !adminLimiter.retryAfter('waha-admin')) {
    adminLimiter.hit('waha-admin');
    const notice = wahaAdminNotice(name, phone, chat, reason, wahaRecentMessages(messages), cfg.pause_hours);
    notified = await wahaSendText(cfg, `${cfg.admin}@c.us`, notice, deps);
  }
  await dbRun(pool, Q_HANDOFF_LOG, [chat, nullable(phone), nullable(name), reason, label, notified ? 1 : 0]);
  return { action: 'handoff', reason, sent, notified };
}

/** = waha_resume */
async function wahaResume(pool, chatId) {
  await dbRun(pool, Q_RESUME_CHAT, [chatId]);
  await dbRun(pool, Q_RESUME_LOG, [chatId]);
}

/** = waha_admin_message */
async function wahaAdminMessage(pool, cfg, msg, deps) {
  const command = wahaAdminCommand(msg.text);
  if (command === null) return { action: 'admin_ignored' };
  const number = command.number;
  let text;
  if (number !== '') {
    const row = await dbOne(pool, Q_FIND_CHAT, [number, `${number}@c.us`, `${number}@lid`]);
    if (row === null) {
      text = `Tidak ada chat dengan nomor ${number}.`;
    } else {
      await wahaResume(pool, String(row.chat_id));
      text = `✅ Bot aktif lagi untuk ${wahaWho(String(row.name ?? ''), String(row.phone ?? ''), String(row.chat_id))}.`;
    }
  } else {
    const rows = await dbRun(pool, Q_WAITING);
    if (rows.length === 1) {
      await wahaResume(pool, String(rows[0].chat_id));
      text = `✅ Bot aktif lagi untuk ${wahaWho(String(rows[0].name ?? ''), String(rows[0].phone ?? ''), String(rows[0].chat_id))}.`;
    } else {
      text = rows.length ? wahaWaitingText(rows) : 'Tidak ada chat yang sedang menunggu admin.';
    }
  }
  return { action: 'admin_command', sent: await wahaSendText(cfg, msg.chat, text, deps) };
}

// ── Aksi admin ──

/** = waha_handoff_out */
function wahaHandoffOut(r) {
  return {
    id: Number(r.id),
    chat_id: String(r.chat_id),
    phone: String(r.phone ?? ''),
    name: String(r.name ?? ''),
    reason: String(r.reason),
    reason_label: WAHA_REASONS[String(r.reason)] ?? String(r.reason),
    message: String(r.message ?? ''),
    status: String(r.status),
    notified: Number(r.notified) === 1,
    paused: Number(r.paused ?? 0) === 1,
    created_at: String(r.created_at),
    handled_at: r.handled_at == null ? null : String(r.handled_at),
    closed_at: r.closed_at == null ? null : String(r.closed_at),
  };
}

/** = waha_admin_state */
async function wahaAdminState(pool) {
  const out = { config: wahaConfigOut(await wahaConfigRows(pool), wahaEnv()), handoffs: [], tables_ready: true };
  let rows;
  try {
    rows = await dbRun(pool, Q_HANDOFFS);
  } catch (err) {
    if (!missingTable(err)) throw err;
    out.tables_ready = false;
    return out;
  }
  out.handoffs = rows.map(wahaHandoffOut);
  return out;
}

const ADMIN_HANDLERS = {
  waha_get_config: (pool) => wahaAdminState(pool),
  waha_save_config: async (pool, input) => {
    const plan = wahaConfigWrites(input, await wahaConfigRows(pool), wahaEnv());
    for (const [key, value] of Object.entries(plan.writes)) {
      await dbRun(pool, 'INSERT INTO hero_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)', [key, value]);
    }
    for (const key of plan.deletes) await dbRun(pool, 'DELETE FROM hero_settings WHERE setting_key = ?', [key]);
    return wahaAdminState(pool);
  },
  waha_test: async (pool, input, deps) => {
    const cfg = wahaConfigResolve(await wahaConfigRows(pool), wahaEnv());
    if (cfg.url === '') throw new WahaError('Alamat WAHA belum diisi.', 400, 'VALIDATION');
    if (cfg.admin === '') throw new WahaError('Nomor WhatsApp admin belum diisi.', 400, 'VALIDATION');
    const [status] = await deps.http('POST', `${cfg.url}/api/sendText`, cfg.key, { session: cfg.session, chatId: `${cfg.admin}@c.us`, text: WAHA_TEXT_TEST });
    if (status < 200 || status >= 300) throw new WahaError(wahaTestError(status), 502, 'WAHA_SEND_FAILED');
    return { sent: true };
  },
  waha_close_handoff: async (pool, input) => {
    const chat = typeof input.chat_id === 'string' ? phpTrim(input.chat_id) : '';
    if (chat === '' || byteLength(chat) > 100) throw new WahaError('Chat tidak valid.', 400, 'VALIDATION');
    await wahaResume(pool, chat);
    return wahaAdminState(pool);
  },
};

function sendError(res, err) {
  if (res.headersSent) return;
  if (err instanceof WahaError) {
    if (err.headers) res.set(err.headers);
    // 502/503 yang disengaja (WAHA menolak, webhook belum dikonfigurasi) tidak boleh ditutupi maskServerErrors
    res.locals.safeError = true;
    const body = { error: err.message };
    if (err.code) body.code = err.code;
    if (err.errors && Object.keys(err.errors).length) body.errors = err.errors;
    res.status(err.status).json(body);
    return;
  }
  console.error('[waha]', err);
  res.status(500).json({ error: 'Terjadi kesalahan pada server. Silakan coba lagi.' });
}

const headerOf = (req, name) => {
  const value = req.headers?.[name];
  return typeof value === 'string' ? value : '';
};

/**
 * = handle_waha_action: false bila bukan aksi modul ini, true bila respons sudah dikirim. Webhook menjawab 200 lebih
 * dulu lalu memproses pesannya di latar. `deps` hanya untuk tes.
 */
export async function handleWahaAction(action, input, req, res, pool, deps = WAHA_DEPS) {
  if (action !== 'waha_webhook' && !Object.hasOwn(ADMIN_HANDLERS, action)) return false;
  try {
    if (req.method !== 'POST') throw new WahaError('Gunakan metode POST untuk aksi ini.', 405, 'METHOD_NOT_ALLOWED');
    if (action === 'waha_webhook') {
      const raw = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.alloc(0);
      const result = await wahaWebhook(pool, raw, headerOf(req, 'x-webhook-hmac'), headerOf(req, 'x-webhook-hmac-algorithm'),
        Math.floor(Date.now() / 1000), req.ip || req.socket?.remoteAddress || '');
      res.json({ success: true, ...result.body });
      if (result.job) {
        wahaHandleMessage(pool, result.job.cfg, result.job.message, deps).catch((err) => console.error('[waha]', err));
      }
      return true;
    }
    // Lapis kedua di belakang ADMIN_ACTIONS (security.js)
    if (req.user?.role !== 'admin') throw new WahaError('Akses ditolak: hanya admin.', 403, 'FORBIDDEN');
    const data = await ADMIN_HANDLERS[action](pool, isArrayLike(input) && !Array.isArray(input) ? input : {}, deps);
    res.json({ success: true, ...data });
  } catch (err) {
    sendError(res, err);
  }
  return true;
}
