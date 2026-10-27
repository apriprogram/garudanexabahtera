// Statistik kunjungan situs pembeli (docs/platform/SITE-STATS-SPEC.md §1–§3) for backend/server.js: pencatatan publik
// site_visit (dikirim CustomerSite di domain pembeli) dan dasbor pembeli customer_get_site_stats (CMS
// /akun/situs/:id/statistik). Tabel site_visit_stats + site_visitors (database/migrations/2026-10-27_031_site_stats.sql):
// angka agregat per situs per hari WIB, tanpa cookie dan tanpa alamat IP (pengunjung unik = hash harian). JSON shape =
// src/types/siteStats.ts (SiteStatsResponse, SITE_STATS_RANGES, SITE_VISIT_SOURCES, SITE_VISIT_DEVICE_LABEL).
// backend/modules/site_stats.php implements the same actions for the PHP backend: keep both identical (action names,
// counting rules, messages, JSON shapes, HTTP status codes and `code` values); __tests__/backend/site-stats.test.ts runs
// both.
//
// server.js calls handleSiteStatsAction() in its /api.php GET and POST handlers, after the access check (createAuthGate in
// security.js sets req.user): site_visit is in PUBLIC_ACTIONS, customer_get_site_stats in CUSTOMER_ACTIONS; the handler
// re-checks the role (requireCustomer) and the owner of the site. Tabel belum ada (errno 1146, migrasi 031 belum
// dijalankan): site_visit diam-diam tidak mencatat, dasbor menjawab 503 STATS_NOT_READY, tidak pernah 500.
// Normalisasi path/perujuk/utm dari visits.js (= visit_landing_path, visit_referrer_host, visit_utm_source di visits.php),
// perayap dan slug dari site_posts.js (isBot = sp_is_bot, isSlug = sp_is_slug), fitur Berita & Pengumuman dari
// site_addons.js (postsEnabled = sa_posts_enabled), IPv6 per /64 dari nexa.js (nexaIpBucket = nexa_ip_bucket), database &
// validasi dari templates.js. Perangkat & browser: deviceAndBrowser() = parse_user_agent() di api.php.
import crypto from 'node:crypto';
import { createLimiter } from '../security.js';
import { nexaIpBucket } from './nexa.js';
import { postsEnabled } from './site_addons.js';
import { isBot, isSlug } from './site_posts.js';
import { landingPath, referrerHost, utmSource } from './visits.js';
import { ApiError, dbAll, dbOne, dbRun, inInt, inStr, isObject, phpTrim, requireCustomer, siteSelect, tooManyAttempts } from './templates.js';

// Sama dengan SITE_STATS_RANGES / SITE_STATS_RANGE_DEFAULT (src/types/siteStats.ts)
export const RANGES = Object.freeze([7, 30, 90, 365]);
export const RANGE_DEFAULT = 30;
// Grup sumber kunjungan, urutan tetap untuk tampilan = SITE_VISIT_SOURCES
export const SOURCES = Object.freeze([
  { key: 'mesin_pencari', label: 'Mesin pencari' },
  { key: 'media_sosial', label: 'Media sosial' },
  { key: 'ai', label: 'Asisten AI' },
  { key: 'lainnya', label: 'Situs lain' },
  { key: 'langsung', label: 'Langsung' },
]);
// = SITE_VISIT_DEVICE_LABEL; kunci = perangkat parse_user_agent (Desktop/Mobile/Tablet) dalam huruf kecil
export const DEVICES = Object.freeze({ desktop: 'Komputer', mobile: 'HP', tablet: 'Tablet' });
// Host perujuk (atau utm_source berupa host) per grup, persis tabel spesifikasi §2. Host sudah tanpa "www." (referrerHost).
// Asisten AI dicek lebih dulu: gemini.google.com sebelum google.*
const AI_HOSTS = new Set(['chatgpt.com', 'perplexity.ai', 'gemini.google.com', 'copilot.microsoft.com', 'claude.ai']);
const SEARCH_HOSTS = new Set(['bing.com', 'duckduckgo.com', 'yahoo.com', 'search.yahoo.com', 'ecosia.org', 'baidu.com']);
// google.* dan yandex.*: domain negara mana pun (google.com, google.co.id, yandex.ru, yandex.com.tr)
const SEARCH_PATTERN = /^(google|yandex)\.(com?\.)?[a-z]{2,3}$/;
const SOCIAL_HOSTS = new Set([
  'facebook.com', 'm.facebook.com', 'l.facebook.com', 'lm.facebook.com', 'instagram.com', 'l.instagram.com', 't.co', 'x.com',
  'twitter.com', 'tiktok.com', 'youtube.com', 'linkedin.com', 'lnkd.in', 'threads.net', 'pinterest.com', 'wa.me',
  'web.whatsapp.com', 'whatsapp.com', 't.me', 'telegram.org',
]);
const SOCIAL_UTM = new Set(['facebook', 'instagram', 'tiktok', 'whatsapp', 'wa', 'twitter', 'x', 'youtube', 'linkedin', 'telegram']);
// Perayap tambahan di atas BOT_PATTERN (site_posts.js): peramban tanpa layar, audit halaman, pemantau uptime
const BOT_PATTERN = /headless|lighthouse|pingdom|uptime/i;
const VISITS_PER_HOUR = 600; // tampilan yang dicatat per IP (IPv6 per /64) per jam; lewat batas = tidak dicatat
// Path yang bisa jadi rute situs (§2): beranda "/", "/berita", "/pengumuman", "/{berita|pengumuman}/{slug}"
const ROUTE_PATTERN = /^\/(berita|pengumuman)(?:\/([^/]+))?$/;
const READS_PER_HOUR = 120; // baca dasbor per pengguna per jam (ss-read|{user})
const UA_MAX = 500; // user-agent dipotong seperti track_visit
const DIM_MAX = 191; // panjang kolom site_visit_stats.dim
const CLEANUP_ONE_IN = 50; // ±1 dari 50 permintaan membersihkan site_visitors lama
const CLEANUP_LIMIT = 1000;
const VISITOR_KEEP_DAYS = 2; // site_visitors dengan day < hari ini − 2 dihapus
// Perujuk berbeda per situs per hari; perujuk baru setelah itu dicatat di satu baris REFERRER_OTHER (perujuk buatan
// skrip tidak menambah baris tanpa batas). '*' tidak pernah dihasilkan referrerHost / utmSource.
const REFERRERS_PER_DAY = 200;
const REFERRER_OTHER = '*';
const REFERRER_OTHER_LABEL = 'Perujuk lain';
const TOP_PAGES = 10;
const TOP_REFERRERS = 10;
const TOP_BROWSERS = 6;
const JAKARTA_OFFSET_S = 7 * 3600; // Asia/Jakarta, UTC+7 tanpa musim panas; dihitung di kode, bukan di MySQL
const NO_TABLE = 1146; // MySQL ER_NO_SUCH_TABLE
const GENERIC_ERROR = 'Terjadi kesalahan pada server. Silakan coba lagi.';

const RANGE_MESSAGE = 'Pilih rentang 7, 30, 90, atau 365 hari.';
const NOT_READY_MESSAGE = 'Statistik belum siap. Coba lagi nanti.';

// Baca boleh lewat GET (query string) maupun POST; site_visit hanya POST
const GET_ACTIONS = new Set(['customer_get_site_stats']);

const visitLimiter = createLimiter(3600 * 1000, VISITS_PER_HOUR);
const readLimiter = createLimiter(3600 * 1000, READS_PER_HOUR);

const HANDLERS = Object.freeze({
  // publik (PUBLIC_ACTIONS): satu tampilan halaman di domain pembeli
  site_visit: siteVisit,
  // pembeli (CUSTOMER_ACTIONS): hanya situs miliknya
  customer_get_site_stats: customerGetSiteStats,
});

export const SITE_STATS_ACTIONS = Object.freeze(Object.keys(HANDLERS));

/**
 * Menjalankan aksi statistik kunjungan. false bila `action` bukan milik modul ini (server.js lanjut), true bila jawaban
 * sudah dikirim. Tidak pernah melempar: setiap galat menjadi jawaban JSON. Nama aksi di-trim seperti actionOf() di
 * security.js.
 */
export async function handleSiteStatsAction(action, params, req, res, pool) {
  const name = typeof action === 'string' ? action.trim() : '';
  if (!Object.hasOwn(HANDLERS, name)) return false;
  try {
    if (req.method !== 'POST' && !GET_ACTIONS.has(name)) {
      throw new ApiError('Gunakan metode POST untuk aksi ini.', 405, 'METHOD_NOT_ALLOWED');
    }
    const ctx = { pool, req, input: isObject(params) ? params : {}, query: req.query || {}, user: req.user || null };
    const data = await HANDLERS[name](ctx);
    res.json({ success: true, ...data });
  } catch (err) {
    sendError(res, err, name);
  }
  return true;
}

function sendError(res, err, action) {
  if (res.headersSent) return;
  if (err instanceof ApiError) {
    if (err.headers) res.set(err.headers);
    // Pesan 5xx yang disengaja (statistik belum siap) tidak boleh ditutupi maskServerErrors
    if (res.locals) res.locals.safeError = true;
    const body = { error: err.message };
    if (err.code) body.code = err.code;
    if (err.errors && Object.keys(err.errors).length) body.errors = err.errors;
    res.status(err.status).json(body);
    return;
  }
  console.error(`[api] ${action}:`, err);
  res.status(500).json({ error: GENERIC_ERROR });
}

// ════════════════════════════════════════════════════════════════════════════
// Pencatatan (publik): site_visit {site_id, path, referrer, utm_source, first}
// ════════════════════════════════════════════════════════════════════════════

// Jawaban selalu { success: true }, juga saat tampilan tidak dihitung, supaya tidak bisa dipakai menebak situs mana yang
// aktif. Tabel belum ada (migrasi 031) = tidak dicatat.
async function siteVisit(ctx) {
  try {
    await recordVisit(ctx);
  } catch (err) {
    if (!missingTable(err)) throw err;
  }
  return {};
}

/**
 * Dihitung hanya bila semua terpenuhi: path = rute situs (visitRoute), user-agent bukan perayap dan tidak kosong, IP
 * belum lewat batas, situs ada dan active, host Origin (atau Referer bila Origin kosong) = domain situs atau varian
 * www.-nya, dan rute itu memang tampil di situs ini (routeShown).
 * Lalu satu INSERT … ON DUPLICATE KEY UPDATE per baris: total/page/hour selalu (views + 1, visits + 1 bila first);
 * source/referrer/device/browser hanya bila first (visits + 1); pengunjung baru hari itu → total & device visitors + 1.
 */
async function recordVisit(ctx) {
  const { pool, req, input } = ctx;
  const siteId = inInt(ctx, 'site_id');
  const path = landingPath(input.path ?? null);
  const route = path === null ? null : visitRoute(path);
  const ua = String(req.headers?.['user-agent'] ?? '').slice(0, UA_MAX);
  if (siteId <= 0 || route === null || isCrawler(ua)) return;
  const ip = clientIp(req);
  const limit = visitLimitKey(ip);
  if (visitLimiter.retryAfter(limit)) return;
  const site = await dbOne(pool, "SELECT id, template_code, domain FROM template_sites WHERE id = ? AND status = 'active' LIMIT 1", [siteId]);
  // referrerHost: huruf kecil, tanpa skema/port/path dan tanpa "www." di depan, jadi www. dan tanpa www. sama
  const siteHost = site ? referrerHost(String(site.domain ?? '')) : null;
  if (siteHost === null || requestHost(req) !== siteHost) return;
  visitLimiter.hit(limit);
  // Path buatan skrip (halaman yang tidak ada di situs ini) tidak membuat baris statistik baru
  if (!(await routeShown(pool, site, route))) return;

  let referrer = referrerHost(input.referrer ?? null);
  if (referrer === siteHost) referrer = null; // pindah halaman di situs sendiri = tanpa perujuk
  const utm = utmSource(input.utm_source ?? null);
  const first = isFlag(input.first);
  const { device, browser } = deviceAndBrowser(ua);
  const now = Math.floor(Date.now() / 1000) + JAKARTA_OFFSET_S;
  const day = utcDate(now);
  const visit = first ? 1 : 0;

  const inserted = await dbRun(pool, 'INSERT IGNORE INTO site_visitors (site_id, day, visitor) VALUES (?, ?, ?)',
    [siteId, day, visitorHash(siteId, day, ip, ua)]);
  const newVisitor = Number(inserted?.affectedRows ?? 0) > 0 ? 1 : 0;

  await add(pool, siteId, day, 'total', '', 1, visit, newVisitor);
  await add(pool, siteId, day, 'page', path.slice(0, DIM_MAX), 1, visit, 0);
  await add(pool, siteId, day, 'hour', new Date(now * 1000).toISOString().slice(11, 13), 1, visit, 0);
  if (first) {
    await add(pool, siteId, day, 'source', sourceGroup(referrer, utm), 0, 1, 0);
    const from = referrer ?? (utm !== null ? `utm:${utm}` : null);
    if (from !== null) await add(pool, siteId, day, 'referrer', await referrerDim(pool, siteId, day, from.slice(0, DIM_MAX)), 0, 1, 0);
    await add(pool, siteId, day, 'browser', browser, 0, 1, 0);
  }
  if (first || newVisitor) await add(pool, siteId, day, 'device', device, 0, visit, newVisitor);

  if (crypto.randomInt(1, CLEANUP_ONE_IN + 1) === 1) {
    await dbRun(pool, `DELETE FROM site_visitors WHERE day < ? LIMIT ${CLEANUP_LIMIT}`, [utcDate(now - VISITOR_KEEP_DAYS * 86400)]);
  }
}

function add(pool, siteId, day, metric, dim, views, visits, visitors) {
  return dbRun(pool, `INSERT INTO site_visit_stats (site_id, day, metric, dim, views, visits, visitors) VALUES (?, ?, ?, ?, ?, ?, ?)
                      ON DUPLICATE KEY UPDATE views = views + VALUES(views), visits = visits + VALUES(visits),
                                              visitors = visitors + VALUES(visitors)`,
  [siteId, day, metric, dim, views, visits, visitors]);
}

/**
 * Baris perujuk untuk dim: baris yang sudah ada hari itu dipakai lagi; perujuk baru hanya bila situs belum punya
 * REFERRERS_PER_DAY perujuk hari itu, selain itu REFERRER_OTHER. Sama dengan ss_referrer_dim().
 */
async function referrerDim(pool, siteId, day, dim) {
  const known = await dbOne(pool, "SELECT 1 AS found FROM site_visit_stats WHERE site_id = ? AND day = ? AND metric = 'referrer' AND dim = ? LIMIT 1",
    [siteId, day, dim]);
  if (known !== null) return dim;
  const count = await dbOne(pool, "SELECT COUNT(*) AS n FROM site_visit_stats WHERE site_id = ? AND day = ? AND metric = 'referrer'", [siteId, day]);
  return toInt(count?.n ?? 0) >= REFERRERS_PER_DAY ? REFERRER_OTHER : dim;
}

/**
 * Rute situs dari path yang dikirim CustomerSite (sitePath, selalu tanpa garis miring di akhir): ['', ''] = beranda "/",
 * [jenis, ''] = "/berita" atau "/pengumuman", [jenis, slug] = "/{jenis}/{slug}" dengan slug sah (isSlug).
 * Path lain (halaman tidak ditemukan, path buatan skrip) = null, tidak dihitung. Sama dengan ss_visit_route().
 */
export function visitRoute(path) {
  if (path === '/') return ['', ''];
  const m = ROUTE_PATTERN.exec(path);
  if (!m) return null;
  const slug = m[2] ?? '';
  if (slug !== '' && !isSlug(slug)) return null;
  return [m[1], slug];
}

/**
 * Rute itu memang tampil di situs ini, sama dengan CustomerSite: beranda selalu; daftar berita/pengumuman hanya bila
 * fitur Berita & Pengumuman aktif (postsEnabled); tulisan juga harus terbit dengan jenis dan slug itu. site: id,
 * template_code.
 */
async function routeShown(pool, site, [kind, slug]) {
  if (kind === '') return true;
  if (!(await postsEnabled(pool, site))) return false;
  if (slug === '') return true;
  return (await dbOne(pool, "SELECT 1 AS found FROM site_posts WHERE site_id = ? AND kind = ? AND slug = ? AND status = 'published' LIMIT 1",
    [Number(site.id), kind, slug])) !== null;
}

/**
 * Kunci batas laju pencatatan: IPv6 per prefiks /64 (nexaIpBucket; satu sambungan bisa berganti alamat di dalamnya),
 * di-HMAC dengan AUTH_SECRET, sama dengan ss_visit_limit_key() (di PHP kunci ini jadi nama berkas di folder temp, jadi
 * tidak boleh bisa dicocokkan balik ke alamat IP).
 */
export const visitLimitKey = (ip) => `sv|${crypto.createHmac('sha256', authSecret()).update(nexaIpBucket(ip)).digest('hex')}`;

/** Host halaman pengirim: header Origin, atau Referer bila Origin kosong (bentuk referrerHost); null bila tidak sah. */
function requestHost(req) {
  const origin = String(req.headers?.origin ?? '');
  return referrerHost(origin !== '' ? origin : String(req.headers?.referer ?? ''));
}

/** User-agent kosong atau perayap (BOT_PATTERN site_posts.js + BOT_PATTERN di sini). */
export const isCrawler = (userAgent) => phpTrim(userAgent) === '' || isBot(userAgent) || BOT_PATTERN.test(userAgent);

/**
 * Penanda pengunjung unik per situs per hari: 16 hex pertama sha256(AUTH_SECRET|site_id|day|ip|user_agent). IP tidak
 * disimpan. Kunci sama dengan auth_secret() di api.php (AUTH_SECRET minimal 32 karakter); user-agent sebagai byte
 * (header Node dibaca latin1), seperti PHP.
 */
function visitorHash(siteId, day, ip, userAgent) {
  return crypto.createHash('sha256')
    .update(Buffer.concat([Buffer.from(`${authSecret()}|${siteId}|${day}|${ip}|`, 'utf8'), Buffer.from(userAgent, 'latin1')]))
    .digest('hex')
    .slice(0, 16);
}

/** = (string)auth_secret() di api.php: AUTH_SECRET bila minimal 32 karakter, selain itu ''. */
function authSecret() {
  const env = process.env.AUTH_SECRET || '';
  return env.length >= 32 ? env : '';
}

/** Perangkat (desktop/mobile/tablet) dan nama browser, aturan parse_user_agent() di api.php. */
export function deviceAndBrowser(ua) {
  let device = 'desktop';
  let browser = 'Unknown';
  if (/Mobile|Android|iPhone|iPad|iPod/i.test(ua)) device = 'mobile';
  if (/Tablet|iPad/i.test(ua)) device = 'tablet';
  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Edg/i.test(ua)) browser = 'Edge';
  else if (/MSIE|Trident/i.test(ua)) browser = 'Internet Explorer';
  return { device, browser };
}

/** Grup sumber satu kunjungan (§2): host perujuk dulu, lalu utm_source; tanpa keduanya = langsung. */
export function sourceGroup(referrer, utm) {
  let group = hostGroup(referrer) ?? hostGroup(utm);
  if (group === null && utm !== null && SOCIAL_UTM.has(utm)) group = 'media_sosial';
  if (group !== null) return group;
  return referrer !== null || utm !== null ? 'lainnya' : 'langsung';
}

/** Grup bernama satu host (atau utm_source berupa host); null = bukan salah satunya. */
function hostGroup(host) {
  if (host === null || host === undefined || host === '') return null;
  if (AI_HOSTS.has(host)) return 'ai';
  if (SEARCH_HOSTS.has(host) || SEARCH_PATTERN.test(host)) return 'mesin_pencari';
  if (SOCIAL_HOSTS.has(host)) return 'media_sosial';
  return null;
}

// ════════════════════════════════════════════════════════════════════════════
// Dasbor pembeli (CUSTOMER_ACTIONS; /akun/situs/:siteId/statistik)
// ════════════════════════════════════════════════════════════════════════════

// Statistik satu situs milik pembeli (status apa pun): SiteStatsResponse. range ∈ {7, 30, 90, 365}, bawaan 30.
async function customerGetSiteStats(ctx) {
  const user = requireCustomer(ctx.user);
  countRead(user);
  const range = rangeInput(ctx.input);
  const siteId = inInt(ctx, 'site_id');
  const site = siteId > 0 ? await dbOne(ctx.pool, `${siteSelect(false)} WHERE s.id = ? AND s.user_id = ? LIMIT 1`, [siteId, user.id]) : null;
  if (!site) throw new ApiError('Situs tidak ditemukan.', 404, 'SITE_NOT_FOUND');
  try {
    return await stats(ctx.pool, Number(site.id), range);
  } catch (err) {
    // Migrasi 031 belum dijalankan: jawaban yang jelas, bukan 500
    if (missingTable(err)) throw new ApiError(NOT_READY_MESSAGE, 503, 'STATS_NOT_READY');
    throw err;
  }
}

/** range dari input: kosong → bawaan; selain RANGES → 400 VALIDATION errors.range. */
function rangeInput(input) {
  const raw = phpTrim(inStr(input, 'range'));
  if (raw === '') return RANGE_DEFAULT;
  const range = RANGES.find((value) => raw === String(value));
  if (range === undefined) throw new ApiError(RANGE_MESSAGE, 400, 'VALIDATION', { range: RANGE_MESSAGE });
  return range;
}

/** Batas baca dasbor per pengguna (setiap permintaan dihitung). */
function countRead(user) {
  const key = `ss-read|${Number(user.id)}`;
  const wait = readLimiter.retryAfter(key);
  if (wait) tooManyAttempts(wait);
  readLimiter.hit(key);
}

/** SiteStatsResponse (tanpa success) untuk `range` hari sampai hari ini WIB. */
async function stats(pool, siteId, range) {
  // Tengah malam WIB hari ini sebagai detik UTC: tanggal UTC di atasnya = tanggal WIB
  const today = Math.floor((Math.floor(Date.now() / 1000) + JAKARTA_OFFSET_S) / 86400) * 86400;
  const dayBack = (back) => utcDate(today - back * 86400);
  const to = dayBack(0);
  const from = dayBack(range - 1);

  const byDay = new Map();
  const totalRows = await dbAll(pool, `SELECT day, views, visits, visitors FROM site_visit_stats
                                       WHERE site_id = ? AND metric = 'total' AND day BETWEEN ? AND ?`, [siteId, dayBack(2 * range - 1), to]);
  for (const r of totalRows) byDay.set(String(r.day), totalsOut(r));
  const zero = { views: 0, visits: 0, visitors: 0 };
  const daily = [];
  let totals = zero;
  let previous = zero;
  for (let back = 2 * range - 1; back >= 0; back--) {
    const date = dayBack(back);
    const row = byDay.get(date) ?? zero;
    if (back >= range) {
      previous = addTotals(previous, row);
      continue;
    }
    totals = addTotals(totals, row);
    daily.push({ day: date, ...row });
  }

  const period = [siteId, from, to];
  const pages = await dbAll(pool, `SELECT dim, SUM(views) AS n FROM site_visit_stats WHERE site_id = ? AND metric = 'page' AND day BETWEEN ? AND ?
                                   GROUP BY dim ORDER BY n DESC, dim LIMIT ${TOP_PAGES}`, period);
  const titles = await pageTitles(pool, siteId, pages.map((r) => String(r.dim)));
  const sources = await sums(pool, `SELECT dim, SUM(visits) AS n FROM site_visit_stats WHERE site_id = ? AND metric = 'source' AND day BETWEEN ? AND ?
                                    GROUP BY dim`, period);
  const referrers = await dbAll(pool, `SELECT dim, SUM(visits) AS n FROM site_visit_stats WHERE site_id = ? AND metric = 'referrer' AND day BETWEEN ? AND ?
                                       GROUP BY dim ORDER BY n DESC, dim LIMIT ${TOP_REFERRERS}`, period);
  const devices = new Map();
  const deviceRows = await dbAll(pool, `SELECT dim, SUM(visits) AS n, SUM(visitors) AS u FROM site_visit_stats
                                        WHERE site_id = ? AND metric = 'device' AND day BETWEEN ? AND ? GROUP BY dim`, period);
  for (const r of deviceRows) devices.set(String(r.dim).toLowerCase(), r);
  const browsers = await dbAll(pool, `SELECT dim, SUM(visits) AS n FROM site_visit_stats WHERE site_id = ? AND metric = 'browser' AND day BETWEEN ? AND ?
                                      GROUP BY dim ORDER BY n DESC, dim LIMIT ${TOP_BROWSERS}`, period);
  const hours = new Map();
  const hourSums = await sums(pool, `SELECT dim, SUM(views) AS n FROM site_visit_stats WHERE site_id = ? AND metric = 'hour' AND day BETWEEN ? AND ?
                                     GROUP BY dim`, period);
  for (const [dim, n] of hourSums) hours.set(toInt(dim), n);
  const since = await dbOne(pool, "SELECT MIN(day) AS first_day FROM site_visit_stats WHERE site_id = ? AND metric = 'total'", [siteId]);

  return {
    range,
    from,
    to,
    totals,
    previous,
    today: byDay.get(to) ?? zero,
    daily,
    pages: pages.map((r) => ({ path: String(r.dim), title: titles.get(String(r.dim)) ?? null, views: toInt(r.n) })),
    sources: SOURCES.map(({ key, label }) => ({ key, label, visits: sources.get(key) ?? 0 })),
    referrers: referrers.map((r) => {
      let host = String(r.dim);
      if (host === REFERRER_OTHER) host = REFERRER_OTHER_LABEL;
      else if (host.startsWith('utm:')) host = `${host.slice(4)} (utm)`;
      return { host, visits: toInt(r.n) };
    }),
    devices: Object.entries(DEVICES).map(([key, label]) => ({
      key,
      label,
      visits: toInt(devices.get(key)?.n ?? 0),
      visitors: toInt(devices.get(key)?.u ?? 0),
    })),
    browsers: browsers.map((r) => ({ name: String(r.dim), visits: toInt(r.n) })),
    hours: Array.from({ length: 24 }, (_, hour) => ({ hour, views: hours.get(hour) ?? 0 })),
    tracking_since: since && since.first_day !== null ? String(since.first_day) : null,
  };
}

/** Map dim → n dari kueri "SELECT dim, SUM(…) AS n … GROUP BY dim". */
async function sums(pool, sql, params) {
  const out = new Map();
  for (const r of await dbAll(pool, sql, params)) out.set(String(r.dim), toInt(r.n));
  return out;
}

/**
 * Judul halaman terpopuler: / → Beranda, /berita → Berita, /pengumuman → Pengumuman, /berita/{slug} dan
 * /pengumuman/{slug} → judul tulisan situs ini (jenis sama) bila ada; selain itu tidak ada (null).
 */
async function pageTitles(pool, siteId, paths) {
  const titles = new Map();
  const slugs = new Set();
  for (const path of paths) {
    if (path === '/') titles.set(path, 'Beranda');
    else if (path === '/berita') titles.set(path, 'Berita');
    else if (path === '/pengumuman') titles.set(path, 'Pengumuman');
    else {
      const m = /^\/(berita|pengumuman)\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(path);
      if (m) slugs.add(m[2]);
    }
  }
  if (slugs.size === 0) return titles;
  const marks = [...slugs].map(() => '?').join(', ');
  const found = new Map();
  for (const r of await dbAll(pool, `SELECT kind, slug, title FROM site_posts WHERE site_id = ? AND slug IN (${marks})`, [siteId, ...slugs])) {
    found.set(`/${r.kind}/${r.slug}`, String(r.title));
  }
  for (const path of paths) if (found.has(path)) titles.set(path, found.get(path));
  return titles;
}

const totalsOut = (r) => ({ views: toInt(r.views), visits: toInt(r.visits), visitors: toInt(r.visitors) });
const addTotals = (a, b) => ({ views: a.views + b.views, visits: a.visits + b.visits, visitors: a.visitors + b.visitors });

/** YYYY-MM-DD dari detik Unix (tanggal UTC; dengan offset WIB = tanggal WIB). */
const utcDate = (seconds) => new Date(seconds * 1000).toISOString().slice(0, 10);

// (int) PHP untuk angka dari MySQL (SUM = DECIMAL berupa string di mysql2)
const toInt = (value) => Math.trunc(Number(value)) || 0;

// in_flag(): true / 1 / "1" / "true"
const isFlag = (v) => v === true || v === 1 || v === '1' || v === 'true';

const missingTable = (err) => Boolean(err) && (Number(err.errno) === NO_TABLE || err.code === 'ER_NO_SUCH_TABLE');

function clientIp(req) {
  return req.ip || req.socket?.remoteAddress || '';
}
