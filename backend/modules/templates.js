// Template marketplace + custom website/mobile app orders (docs/platform/SPEC.md §2–§6) for backend/server.js.
// backend/modules/templates.php implements the same actions for the PHP backend: keep both identical
// (action names, input validation, JSON shapes, HTTP status codes and `code` values).
//
// server.js calls handlePlatformAction() at the top of its /api.php GET and POST handlers, after the access
// check (createAuthGate in security.js, which sets req.user), so roles are already enforced; the handlers
// re-check them as a second line.
//
// Conventions shared with the PHP backend:
// - success: HTTP 200 + {success: true, ...data}; failure: HTTP 4xx/5xx + {error, code?, errors?}
//   where `errors` maps a field name to its message (validation, code VALIDATION).
// - dates are 'YYYY-MM-DD HH:MM:SS' strings (database time), money is a JSON number (rupiah).
// - phone numbers are stored without spaces/dashes/dots/brackets; emails and domains lowercase.
//
// Uploads (template images, CMS images) go through the same S3 helpers as every other upload in server.js,
// so stored paths are S3 URLs here (PHP stores /assets/... files). Both are valid image references.
//
// POST input: api.php json_decodes php://input and uses [] when that fails, so the raw body (req.rawBody, kept by
// express.json in server.js) is decoded like PHP does (phpRequestBody) and a body PHP refuses gives an empty input.
// Saved site content keeps the key order the client sent, like PHP. Known difference: responses re-read stored
// content with JSON.parse, so integer-like keys ("0", "5") come first in Node's JSON; a JS client parsing PHP's
// response sees the same order.
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { issueToken, createLimiter, isAuthConfigured } from '../security.js';
import { uploadBase64ToS3, parseUpload, deleteFromS3, S3_PUBLIC_URL } from '../s3-client.js';
import {
  NEXA_DEFAULT_DAILY_LIMIT, NEXA_PER_DAY, NEXA_PER_HOUR,
  NexaConfigError, nexaCleanMessages, nexaConfigOut, nexaConfigRows, nexaConfigWrites, nexaIpBucket, nexaLiveContext, nexaProviderReply,
  nexaResolveProvider,
} from './nexa.js';
// Domain berbayar: harga per ekstensi, validasi & cek ketersediaan RDAP (docs/platform/ACCOUNT-DOMAIN-RENEWAL-SPEC.md)
import {
  DOMAIN_MARKUP_DEFAULT, domainAlternatives, domainAvailability, domainAvailabilityMany, domainCatalog, domainMarkupPercent, domainNormalize,
  domainPrice, domainProblem, domainTld,
} from './domains.js';
// Identitas perusahaan (kop nota) = pd_settings.company dokumen proyek
import { pdSettings } from './project_docs/core.js';
// Fitur tambahan berbayar (docs/platform/SITE-ADDONS-SPEC.md): flag get_site_public / customer_get_site, notifikasi
// Midtrans GNF-…, nota, laci pesanan admin. site_addons.js mengimpor helper di bawah dari modul ini (impor melingkar
// aman: keduanya hanya memakai impor di dalam fungsi, tidak saat modul dievaluasi).
import { addonInvoiceItems, addonNotification, customerAddonInvoice, orderAddons, siteAddonFlags } from './site_addons.js';
import { hasPosts } from './site_posts.js';

const STATUS_LABEL = {
  menunggu_pembayaran: 'Menunggu Pembayaran',
  menunggu_approval: 'Dibayar (Menunggu Approval)',
  proses_domain: 'Disetujui (Proses Domain)',
  aktif: 'Aktif',
  ditolak: 'Ditolak',
  dibatalkan: 'Dibatalkan',
};
const DOMAIN_PATTERN = /^(?!-)[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})+$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// Slugs no template may use because the public page /template/{slug} belongs to something else:
// /template/kategori/{category} are the category pages (docs/platform/SEO-PLAN.md §2). Same list in templates.php.
export const RESERVED_SLUGS = new Set(['kategori']);
const TEMPLATE_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{1,59}$/;
const CONTENT_MAX_BYTES = 524288; // site content JSON after images became paths (512 KB)
const SITE_IMAGE_MAX_BYTES = 2097152; // one image inside site content (2 MB)
const SITE_IMAGE_MAX_COUNT = 30; // new images in one save
const SITE_IMAGE_EXTS = ['png', 'jpg', 'webp', 'gif']; // customer CMS images: raster only, never SVG
const MAX_PENDING_ORDERS = 5; // unpaid orders one customer may have at the same time
const FIRST_ORDER_DISCOUNT_PERCENT = 20; // automatic discount on an account's first template order (owner 2026-10-23)
const FIRST_ORDER_DISCOUNT_CODE = 'PERTAMA20';
export const SNAP_REUSE_HOURS = 23; // a Snap token lives 24 hours
// Masa aktif & perpanjangan (docs/platform/ACCOUNT-DOMAIN-RENEWAL-SPEC.md §5). Same values in templates.php and
// src/lib/domainPricing.ts.
const RENEWAL_STATUS_LABEL = {
  menunggu_pembayaran: 'Menunggu Pembayaran',
  lunas: 'Lunas',
  dibatalkan: 'Dibatalkan',
};
const RENEWAL_YEARS = [1, 2, 3];
// Log events whose note the customer sees (orderLogs); renewal and add-on notes are written by the server only (add-on:
// docs/platform/SITE-ADDONS-SPEC.md §4.1; addon_granted / addon_revoked may carry a staff note, so they stay internal)
const CUSTOMER_NOTE_EVENTS = ['rejected', 'renewal_created', 'renewal_paid', 'renewal_cancelled', 'addon_created', 'addon_paid',
  'addon_cancelled'];
const RENEWAL_MAX_YEARS_AHEAD = 10; // a period never ends more than 10 years from now (registry limit)
const HOSTING_RENEWAL_DEFAULT = 500000; // hosting & jasa per year when setting template_hosting_renewal_price is unset
const AVATAR_MAX_BYTES = 2097152; // profile photo (2 MB), raster only
const AVATAR_EXTS = ['png', 'jpg', 'webp'];
const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const RENEWAL_NOT_ACTIVE_MESSAGE = 'Perpanjangan hanya untuk pesanan yang situsnya sudah aktif.';
const RENEWAL_NO_PRICE_MESSAGE = 'Perpanjangan online untuk domain ini belum tersedia. Hubungi kami via WhatsApp.';
const RENEWAL_TOO_LONG_MESSAGE = 'Masa aktif paling lama 10 tahun ke depan. Pilih masa perpanjangan yang lebih pendek.';
export const INVOICE_NOT_AVAILABLE_MESSAGE = 'Nota tersedia setelah pembayaran lunas.';
// Current end of the hosting / domain period; an active order without one (activated between migration 026 and the
// deploy of this code) ends 1 year after activation. Same expressions in templates.php.
const SERVICE_END_SQL = 'COALESCE(service_expires_at, DATE_ADD(activated_at, INTERVAL 1 YEAR), NOW())';
const DOMAIN_END_SQL = 'COALESCE(domain_expires_at, DATE_ADD(activated_at, INTERVAL 1 YEAR), NOW())';
// Names made by uploadBase64ToS3 (`<stem>_<ms timestamp>_<random>.<ext>`), never seed files
const GENERATED_ASSET = /_\d{13}_[a-z0-9]{1,6}\.[a-z0-9]+$/;
const GENERIC_ERROR = 'Terjadi kesalahan pada server. Silakan coba lagi.';

// Reads may use GET (query string) as well as POST; every other platform action is POST only
const GET_ACTIONS = new Set([
  'get_templates', 'get_template', 'get_public_projects', 'get_site_public', 'get_payment_config', 'get_showcase_stats',
  'get_domain_prices',
  'customer_get_orders', 'customer_get_order', 'customer_get_site', 'customer_get_order_quote',
  'customer_check_domain', 'customer_get_invoice', 'customer_get_invoices', 'customer_get_profile',
  'admin_get_template_orders', 'admin_get_template_order', 'admin_get_templates', 'admin_get_active_sites',
  'admin_dashboard_summary', 'admin_get_domain_pricing',
]);

// Same limits as api.php: 5 per IP per hour, counted only after the input is valid
const customOrderLimiter = createLimiter(3600 * 1000, 5);
const customerRegisterLimiter = createLimiter(3600 * 1000, 5);
// Cek domain per akun (sama dengan PF_DOMAIN_CHECKS / PF_DOMAIN_ORDER_CHECKS / PF_DOMAIN_CHECK_WINDOW di templates.php)
const domainCheckLimiter = createLimiter(600 * 1000, 40);
const domainOrderLimiter = createLimiter(600 * 1000, 20);
// Suka / dilihat di kartu template (sama dengan PF_LIKES_PER_HOUR / PF_VIEWS_PER_HOUR di templates.php)
const templateLikeLimiter = createLimiter(3600 * 1000, 60);
const templateViewLimiter = createLimiter(3600 * 1000, 300);
// Suka / dilihat kartu proyek beranda: batas sama dengan template (PF_LIKES_PER_HOUR / PF_VIEWS_PER_HOUR)
const showcaseLikeLimiter = createLimiter(3600 * 1000, 60);
const showcaseViewLimiter = createLimiter(3600 * 1000, 300);
// Nexa AI (nexa_chat): per pengunjung per jam & per hari, dan batas harian semua pengunjung (NEXA_DAILY_LIMIT, dibaca
// saat dipakai)
const nexaIpLimiter = createLimiter(3600 * 1000, NEXA_PER_HOUR);
const nexaIpDayLimiter = createLimiter(86400 * 1000, NEXA_PER_DAY);
const nexaDailyLimiters = new Map();
// Jumlah terjual per template (sama dengan PF_SOLD_COUNT_SQL di templates.php): pesanan dibayar, tidak dibatalkan/ditolak
const SOLD_COUNT_SQL = `(SELECT COUNT(*) FROM template_orders o WHERE o.template_id = templates.id AND o.paid_at IS NOT NULL
    AND o.status IN ('menunggu_approval', 'proses_domain', 'aktif')) AS sold_count`;

/** An error whose message is safe to show to the client. `errors` = per-field messages. */
export class ApiError extends Error {
  constructor(message, status = 400, code = null, errors = null, headers = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.errors = errors;
    this.headers = headers;
  }
}

const HANDLERS = {
  // public
  get_templates: getTemplates,
  get_template: getTemplate,
  get_public_projects: getPublicProjects,
  get_site_public: getSitePublic,
  submit_custom_order: submitCustomOrder,
  customer_register: customerRegister,
  midtrans_notification: midtransNotification,
  get_payment_config: getPaymentConfig,
  get_domain_prices: getDomainPrices,
  template_like: templateLike,
  template_view: templateView,
  get_showcase_stats: getShowcaseStats,
  showcase_like: showcaseLike,
  showcase_view: showcaseView,
  nexa_chat: nexaChat, // backend/modules/nexa.js
  // admin: tab "Tanya Nexa" (kunci API Claude/Gemini; hanya admin lewat ADMIN_ACTIONS)
  nexa_get_config: nexaGetConfig,
  nexa_save_config: nexaSaveConfig,
  // customer (own data only)
  customer_create_order: customerCreateOrder,
  customer_get_order_quote: customerGetOrderQuote,
  customer_pay_order: customerPayOrder,
  customer_get_orders: customerGetOrders,
  customer_get_order: customerGetOrder,
  customer_cancel_order: customerCancelOrder,
  customer_get_site: customerGetSite,
  customer_save_site_content: customerSaveSiteContent,
  dev_simulate_payment: devSimulatePayment,
  customer_check_domain: customerCheckDomain,
  customer_create_renewal: customerCreateRenewal,
  customer_pay_renewal: customerPayRenewal,
  customer_cancel_renewal: customerCancelRenewal,
  dev_simulate_renewal_payment: devSimulateRenewalPayment,
  customer_get_invoice: customerGetInvoice,
  customer_get_invoices: customerGetInvoices,
  customer_get_profile: customerGetProfile,
  customer_update_profile: customerUpdateProfile,
  // staff (admin + user)
  admin_get_template_orders: adminGetTemplateOrders,
  admin_get_template_order: adminGetTemplateOrder,
  admin_approve_template_order: adminApproveTemplateOrder,
  admin_reject_template_order: adminRejectTemplateOrder,
  admin_set_order_domain: adminSetOrderDomain,
  admin_get_templates: adminGetTemplates,
  admin_save_template: adminSaveTemplate,
  admin_delete_template: adminDeleteTemplate,
  admin_get_active_sites: adminGetActiveSites,
  admin_set_site_status: adminSetSiteStatus,
  admin_dashboard_summary: adminDashboardSummary,
  admin_get_domain_pricing: adminGetDomainPricing,
};

/**
 * Runs a platform action. Returns false when the action is not one of ours (server.js continues),
 * true when a response was sent. Never throws: every error becomes a JSON error response.
 */
export async function handlePlatformAction(action, input, req, res, pool) {
  const handler = typeof action === 'string' && Object.hasOwn(HANDLERS, action) ? HANDLERS[action] : null;
  if (!handler) return false;
  try {
    if (req.method !== 'POST' && !GET_ACTIONS.has(action)) {
      throw new ApiError('Gunakan metode POST untuk aksi ini.', 405, 'METHOD_NOT_ALLOWED');
    }
    // api.php decodes php://input once for every action and uses [] when json_decode fails. express.json is more
    // lenient (it turns invalid UTF-8 into U+FFFD and drops a BOM), so the raw bytes decide what PHP would see
    const post = req.method === 'POST';
    const body = post ? phpRequestBody(req) : undefined;
    const ctx = {
      pool,
      req,
      input: (post && body === undefined) || !isObject(input) ? {} : input,
      // The POST body as PHP's json_decode() (object mode) returns it, objects as Maps in the order the client
      // sent their keys; undefined where PHP's json_decode fails
      body,
      query: req.query || {},
      user: req.user || null,
    };
    const data = await handler(ctx);
    res.json({ success: true, ...data });
  } catch (err) {
    sendError(res, err, action);
  }
  return true;
}

function sendError(res, err, action) {
  if (res.headersSent) return;
  if (err instanceof ApiError) {
    if (err.headers) res.set(err.headers);
    // A deliberate 5xx message (payment not configured, gateway error) must not be masked by maskServerErrors
    res.locals.safeError = true;
    const body = { error: err.message };
    if (err.code) body.code = err.code;
    if (err.errors && Object.keys(err.errors).length) body.errors = err.errors;
    res.status(err.status).json(body);
    return;
  }
  // Upload validation (s3-client UploadError) carries a safe 4xx message, like ApiError in api.php
  if (err && err.expose && Number(err.status) >= 400 && Number(err.status) < 500) {
    res.status(Number(err.status)).json({ error: err.message });
    return;
  }
  console.error(`[api] ${action}:`, err);
  res.status(500).json({ error: GENERIC_ERROR });
}

// ════════════════════════════════════════════════════════════════════════════
// Public
// ════════════════════════════════════════════════════════════════════════════

async function getTemplates({ pool, input }) {
  const category = phpTrim(inStr(input, 'category'));
  let sql = `SELECT *, ${SOLD_COUNT_SQL} FROM templates WHERE status = 'published'`;
  const params = [];
  if (category !== '') {
    sql += ' AND category = ?';
    params.push(category);
  }
  const templates = (await dbAll(pool, `${sql} ORDER BY sort_order ASC, id ASC`, params)).map(templateOut);
  const categories = (await dbAll(pool,
    "SELECT category FROM templates WHERE status = 'published' GROUP BY category ORDER BY MIN(sort_order) ASC, category ASC"))
    .map((r) => r.category);
  return { templates, categories };
}

async function getTemplate({ pool, input }) {
  const slug = phpTrim(inStr(input, 'slug')).toLowerCase();
  const row = slug === '' ? null : await dbOne(pool, `SELECT *, ${SOLD_COUNT_SQL} FROM templates WHERE slug = ? AND status = 'published' LIMIT 1`, [slug]);
  if (!row) throw new ApiError('Template tidak ditemukan.', 404, 'TEMPLATE_NOT_FOUND');
  return { template: templateOut(row) };
}

// Projects shown on the homepage: no client name/contact, no price
async function getPublicProjects({ pool }) {
  const rows = await dbAll(pool, `SELECT id, name, service_type, image, description FROM project_client
                                  WHERE show_on_website = 1 ORDER BY id DESC LIMIT 60`);
  return {
    projects: rows.map((r) => ({
      id: Number(r.id),
      name: r.name,
      service_type: r.service_type,
      image: r.image !== '' ? r.image : null,
      description: r.description,
    })),
  };
}

// ── Suka & dilihat kartu proyek beranda (#projects, pemilik 2026-10-24; migrasi 016 showcase_stats) ──────────────
// Sama dengan pf_showcase_* di templates.php. Kunci kartu: p-{id} (project_client tampil di website) atau
// f-{slug judul} (portofolio cadangan: setting portfolio_data, atau daftar bawaan bila setting kosong/rusak).
const SHOWCASE_DEFAULT_TITLES = ['Web App Dashboard', 'Mobile POS App', 'E-Commerce System', 'Corporate Website', 'Sistem Informasi Desa'];

// Non-ASCII dibuang sebelum huruf kecil = strtolower PHP (hanya ASCII); toLowerCase dulu akan mengubah "İ" & tanda Kelvin
// menjadi huruf ASCII sehingga kuncinya beda dengan pf_showcase_slug
const showcaseSlug = (title) => String(title).replace(/[^A-Za-z0-9]+/g, '-').toLowerCase().replace(/^-+|-+$/g, '').slice(0, 100);

/** Semua kunci kartu proyek yang bisa tampil di beranda saat ini. */
async function showcaseKeys(pool) {
  const keys = new Set((await dbAll(pool, 'SELECT id FROM project_client WHERE show_on_website = 1')).map((r) => `p-${Number(r.id)}`));
  const row = await dbOne(pool, "SELECT setting_value FROM hero_settings WHERE setting_key = 'portfolio_data' LIMIT 1");
  const raw = row ? String(row.setting_value ?? '') : '';
  let items = null;
  try {
    items = raw !== '' ? JSON.parse(raw) : null;
  } catch {
    items = null;
  }
  const titles = Array.isArray(items) ? items.map((item) => (item && typeof item === 'object' ? String(item.title ?? '') : '')) : SHOWCASE_DEFAULT_TITLES;
  for (const title of titles) {
    const slug = showcaseSlug(title);
    if (slug !== '') keys.add(`f-${slug}`);
  }
  return keys;
}

async function showcaseKey(pool, input) {
  const key = phpTrim(inStr(input, 'key')).toLowerCase();
  if (!/^(p-[0-9]{1,10}|f-[a-z0-9-]{1,100})$/.test(key) || !(await showcaseKeys(pool)).has(key)) {
    throw new ApiError('Proyek tidak ditemukan.', 404, 'PROJECT_NOT_FOUND');
  }
  return key;
}

async function getShowcaseStats({ pool }) {
  const keys = await showcaseKeys(pool);
  const stats = {};
  for (const r of await dbAll(pool, 'SELECT item_key, like_count, view_count FROM showcase_stats')) {
    if (keys.has(r.item_key)) stats[r.item_key] = { likes: Number(r.like_count), views: Number(r.view_count) };
  }
  return { stats };
}

async function showcaseLike({ pool, input, req }) {
  const limit = `sc-like|${clientIp(req)}`;
  const wait = showcaseLikeLimiter.retryAfter(limit);
  if (wait) tooManyAttempts(wait);
  const key = await showcaseKey(pool, input);
  const liked = ['1', 'true'].includes(inStr(input, 'liked').toLowerCase());
  showcaseLikeLimiter.hit(limit);
  await dbRun(pool, liked
    ? 'INSERT INTO showcase_stats (item_key, like_count) VALUES (?, 1) ON DUPLICATE KEY UPDATE like_count = like_count + 1'
    : 'INSERT INTO showcase_stats (item_key, like_count) VALUES (?, 0) ON DUPLICATE KEY UPDATE like_count = GREATEST(like_count - 1, 0)', [key]);
  return { like_count: Number((await dbOne(pool, 'SELECT like_count FROM showcase_stats WHERE item_key = ?', [key])).like_count) };
}

// Aksi publik nexa_chat (= pf_nexa_chat di nexa.php): {messages: [{role, content}]} → {reply}. 503 NEXA_OFFLINE tanpa
// kunci API, 503 NEXA_UNAVAILABLE bila Claude gagal; 429 bila batas per pengunjung atau batas harian tercapai.
async function nexaChat({ pool, body, req }) {
  // body = isi POST seperti json_decode PHP (Map), jadi daftar & kunci dibaca persis seperti pf_nexa_chat
  const messages = nexaCleanMessages(body instanceof Map ? body.get('messages') : undefined);
  if (messages === null) throw new ApiError('Pesan untuk Nexa tidak valid.', 400, 'VALIDATION');
  // Penyedia dari pengaturan admin (tab Tanya Nexa) + cadangan .env; widget dimatikan / tanpa kunci → jawaban bawaan
  const cfg = await nexaConfigRows(pool);
  const active = (cfg.nexa_enabled ?? '1') === '0' ? null : nexaResolveProvider(cfg, envValue('ANTHROPIC_API_KEY'), envValue('GEMINI_API_KEY'));
  if (active === null) throw new ApiError('Nexa AI belum aktif.', 503, 'NEXA_OFFLINE');

  const visitor = nexaIpBucket(clientIp(req));
  const hourKey = `nexa|${visitor}`;
  const dayKey = `nexa-day|${visitor}`;
  const dailyLimit = Math.max(1, Number.parseInt(envValue('NEXA_DAILY_LIMIT', String(NEXA_DEFAULT_DAILY_LIMIT)), 10) || 0);
  if (!nexaDailyLimiters.has(dailyLimit)) nexaDailyLimiters.set(dailyLimit, createLimiter(86400 * 1000, dailyLimit));
  const daily = nexaDailyLimiters.get(dailyLimit);
  const wait = Math.max(nexaIpLimiter.retryAfter(hourKey), nexaIpDayLimiter.retryAfter(dayKey), daily.retryAfter('nexa|all'));
  if (wait) tooManyAttempts(wait);
  nexaIpLimiter.hit(hourKey);
  nexaIpDayLimiter.hit(dayKey);
  daily.hit('nexa|all');

  // DATA TERKINI & panggilan penyedia di nexa.js (= nexa_live_context / nexa_provider_reply), juga dipakai waha.js
  const result = await nexaProviderReply(active, await nexaLiveContext(pool), messages);
  if (result.reply === undefined) {
    console.error(`[nexa] ${result.error}`);
    throw new ApiError('Nexa AI sedang tidak tersedia.', 503, 'NEXA_UNAVAILABLE');
  }
  return { reply: result.reply };
}

// Tab admin "Tanya Nexa": baca konfigurasi (kunci hanya tampil 4 karakter terakhir) — = pf_nexa_get_config
async function nexaGetConfig({ pool }) {
  return { config: nexaConfigOut(await nexaConfigRows(pool), envValue('ANTHROPIC_API_KEY') !== '', envValue('GEMINI_API_KEY') !== '') };
}

// Tab admin "Tanya Nexa": simpan penyedia, saklar per penyedia, dan kunci API — = pf_nexa_save_config
async function nexaSaveConfig({ pool, body }) {
  let plan;
  try {
    plan = nexaConfigWrites(body ?? {}, await nexaConfigRows(pool));
  } catch (err) {
    if (err instanceof NexaConfigError) throw new ApiError(err.message, err.status, err.code, err.errors);
    throw err;
  }
  for (const [key, value] of Object.entries(plan.writes)) {
    await dbRun(pool, `INSERT INTO hero_settings (setting_key, setting_value) VALUES (?, ?)
                       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`, [key, value]);
  }
  for (const key of plan.deletes) {
    await dbRun(pool, 'DELETE FROM hero_settings WHERE setting_key = ?', [key]);
  }
  return { config: nexaConfigOut(await nexaConfigRows(pool), envValue('ANTHROPIC_API_KEY') !== '', envValue('GEMINI_API_KEY') !== '') };
}

async function showcaseView({ pool, input, req }) {
  const limit = `sc-view|${clientIp(req)}`;
  const wait = showcaseViewLimiter.retryAfter(limit);
  if (wait) tooManyAttempts(wait);
  const key = await showcaseKey(pool, input);
  showcaseViewLimiter.hit(limit);
  await dbRun(pool, 'INSERT INTO showcase_stats (item_key, view_count) VALUES (?, 1) ON DUPLICATE KEY UPDATE view_count = view_count + 1', [key]);
  return { view_count: Number((await dbOne(pool, 'SELECT view_count FROM showcase_stats WHERE item_key = ?', [key])).view_count) };
}

// A live customer site, by id (/situs/:siteId) or by host name (SiteHostGate). Only status active. addons.posts = news &
// announcements switched on (post-capable template + paid add-on, backend/modules/site_addons.js); backend/site.php
// preloads the same shape.
async function getSitePublic(ctx) {
  const { pool, input } = ctx;
  const siteId = inInt(ctx, 'site_id');
  const domain = phpTrim(inStr(input, 'domain')).toLowerCase();
  let row = null;
  if (siteId > 0) {
    row = await dbOne(pool, "SELECT id, template_code, domain, content FROM template_sites WHERE id = ? AND status = 'active' LIMIT 1", [siteId]);
  } else if (domain !== '') {
    // www.example.com and example.com are the same site
    const other = domain.startsWith('www.') ? domain.slice(4) : `www.${domain}`;
    row = await dbOne(pool, `SELECT id, template_code, domain, content FROM template_sites
                             WHERE domain IN (?, ?) AND status = 'active' ORDER BY (domain = ?) DESC LIMIT 1`, [domain, other, domain]);
  } else {
    throw new ApiError('site_id atau domain wajib diisi.', 400, 'VALIDATION');
  }
  if (!row) throw new ApiError('Situs tidak ditemukan atau sedang tidak aktif.', 404, 'SITE_NOT_FOUND');
  return {
    site: {
      id: Number(row.id),
      template_code: row.template_code,
      domain: row.domain,
      content: contentOut(row.content),
      addons: await siteAddonFlags(pool, row),
    },
  };
}

// Template terbit dari input `slug` (huruf kecil, angka, tanda hubung); tidak ada → 404
async function publishedTemplateBySlug(pool, input) {
  const slug = phpTrim(inStr(input, 'slug')).toLowerCase();
  const row = /^[a-z0-9-]{1,120}$/.test(slug)
    ? await dbOne(pool, "SELECT id FROM templates WHERE slug = ? AND status = 'published' LIMIT 1", [slug])
    : null;
  if (!row) throw new ApiError('Template tidak ditemukan atau belum tersedia.', 404, 'TEMPLATE_NOT_FOUND');
  return row;
}

// Suka (`liked` true) / batal suka template di kartu katalog: like_count +1 / -1 (tidak pernah di bawah 0). Status suka
// per pengunjung disimpan di browser; server hanya menghitung, dibatasi per IP. Sama dengan pf_template_like().
async function templateLike({ pool, input, req }) {
  const key = `tpl-like|${clientIp(req)}`;
  const wait = templateLikeLimiter.retryAfter(key);
  if (wait) tooManyAttempts(wait);
  const id = Number((await publishedTemplateBySlug(pool, input)).id);
  const liked = ['1', 'true'].includes(inStr(input, 'liked').toLowerCase());
  templateLikeLimiter.hit(key);
  await dbRun(pool, liked
    ? 'UPDATE templates SET like_count = like_count + 1 WHERE id = ?'
    : 'UPDATE templates SET like_count = GREATEST(like_count - 1, 0) WHERE id = ?', [id]);
  return { like_count: Number((await dbOne(pool, 'SELECT like_count FROM templates WHERE id = ?', [id])).like_count) };
}

// Template dibuka dari kartu (detail, demo, pesan): view_count +1. Sekali per sesi per template di browser, dibatasi per IP.
async function templateView({ pool, input, req }) {
  const key = `tpl-view|${clientIp(req)}`;
  const wait = templateViewLimiter.retryAfter(key);
  if (wait) tooManyAttempts(wait);
  const id = Number((await publishedTemplateBySlug(pool, input)).id);
  templateViewLimiter.hit(key);
  await dbRun(pool, 'UPDATE templates SET view_count = view_count + 1 WHERE id = ?', [id]);
  return { view_count: Number((await dbOne(pool, 'SELECT view_count FROM templates WHERE id = ?', [id])).view_count) };
}

// Public form for custom website / mobile app work -> project_client (source website, status pending)
async function submitCustomOrder({ pool, input, req }) {
  const key = `custom-order|${clientIp(req)}`;
  const wait = customOrderLimiter.retryAfter(key);
  if (wait) tooManyAttempts(wait);

  // Honeypot: real visitors never see the "website" field; bots get a normal-looking answer, nothing is stored
  if (phpTrim(inStr(input, 'website')) !== '') {
    return { reference: `CUS-${String(crypto.randomInt(1000, 1000000)).padStart(6, '0')}` };
  }

  const errors = {};
  const name = vStr(input, 'name', 'Nama', 150, true, errors);
  const email = vEmail(input, 'email', 'Email', true, errors);
  const phone = vPhone(input, 'phone', 'Nomor telepon', true, errors);
  const company = vStr(input, 'company', 'Nama perusahaan', 150, false, errors);
  const serviceType = inStr(input, 'service_type');
  if (serviceType !== 'website' && serviceType !== 'mobile_app') errors.service_type = 'Pilih jenis layanan: website atau aplikasi mobile.';
  const projectName = vStr(input, 'project_name', 'Nama proyek', 150, false, errors);
  const description = vStr(input, 'description', 'Deskripsi kebutuhan', 5000, true, errors, 10);
  const budget = vStr(input, 'budget_note', 'Catatan anggaran', 255, false, errors);
  validate(errors);
  customOrderLimiter.hit(key);

  const details = [`Jenis layanan: ${serviceType === 'website' ? 'Website' : 'Aplikasi Mobile'}`];
  if (company !== null) details.push(`Perusahaan: ${company}`);
  if (budget !== null) details.push(`Catatan anggaran: ${budget}`);
  const fullDescription = `Kebutuhan:\n${description}\n\n${details.join('\n')}\n(Dikirim dari formulir pesanan custom di website)`;

  const result = await dbRun(pool, `INSERT INTO project_client (name, client_name, client_email, client_phone, service_type, status, price,
                                        image, project_files, description, show_on_website, source)
                                    VALUES (?, ?, ?, ?, ?, 'pending', NULL, NULL, '[]', ?, 0, 'website')`, [
    projectName ?? mbSubstr(`Pesanan custom - ${name}`, 0, 255), name, email, phone, serviceType, fullDescription,
  ]);
  return { reference: `CUS-${String(result.insertId).padStart(6, '0')}` };
}

// Buyer sign-up: active immediately and logged in (token), unlike staff `register`
async function customerRegister({ pool, input, req }) {
  if (!isAuthConfigured()) throw new ApiError('Login belum dikonfigurasi di server.', 503);
  const key = `customer-register|${clientIp(req)}`;
  const wait = customerRegisterLimiter.retryAfter(key);
  if (wait) tooManyAttempts(wait);

  const errors = {};
  const name = vStr(input, 'name', 'Nama', 100, true, errors, 2);
  const email = vEmail(input, 'email', 'Email', true, errors);
  const phone = vPhone(input, 'phone', 'Nomor telepon', true, errors);
  const password = typeof input.password === 'string' ? input.password : '';
  const passwordBytes = Buffer.byteLength(password, 'utf8');
  if (passwordBytes < 8) errors.password = 'Password minimal 8 karakter.';
  else if (passwordBytes > 72) errors.password = 'Password maksimal 72 karakter.';
  validate(errors);
  customerRegisterLimiter.hit(key);

  if (await dbOne(pool, 'SELECT id FROM users WHERE email = ? LIMIT 1', [email])) {
    throw new ApiError('Email sudah terdaftar. Silakan masuk.', 409, 'EMAIL_TAKEN', { email: 'Email sudah terdaftar. Silakan masuk.' });
  }
  const result = await dbRun(pool, "INSERT INTO users (name, email, password, phone, role, status, avatar) VALUES (?, ?, ?, ?, 'customer', 'active', '')",
    [name, email, await bcrypt.hash(password, 10), phone]);
  const row = await dbOne(pool, 'SELECT * FROM users WHERE id = ? LIMIT 1', [result.insertId]);
  const { token, expiresAt } = issueToken(row);
  const { password: _hash, ...user } = row;
  user.id = Number(user.id);
  return { user, token, expires_at: expiresAt };
}

async function getPaymentConfig() {
  const cfg = midtransConfig();
  return {
    configured: cfg.serverKey !== '',
    is_production: cfg.isProduction,
    simulator: cfg.simulator,
    client_key: cfg.clientKey,
  };
}

// Midtrans HTTP notification (Snap). Signature first, then amount, then Status API confirmation.
async function midtransNotification({ pool, input }) {
  const cfg = midtransConfig();
  // Without a server key a signature cannot be checked, so nothing is accepted
  if (cfg.serverKey === '') throw new ApiError('Pembayaran online belum dikonfigurasi.', 503, 'PAYMENT_NOT_CONFIGURED');

  const orderId = rawScalar(input, 'order_id');
  const statusCode = rawScalar(input, 'status_code');
  const gross = rawScalar(input, 'gross_amount');
  const signature = rawScalar(input, 'signature_key').toLowerCase();
  const expected = crypto.createHash('sha512').update(orderId + statusCode + gross + cfg.serverKey).digest('hex');
  if (orderId === '' || signature === '' || !safeEqual(expected, signature)) {
    throw new ApiError('Signature tidak valid.', 403, 'INVALID_SIGNATURE');
  }
  // Tagihan perpanjangan (GNR-…) dan fitur tambahan (GNF-…, site_addons.js): signature sama, jalur pembayaran sendiri
  if (orderId.startsWith('GNR-')) {
    await renewalNotification(pool, cfg, input, orderId, gross);
    return {};
  }
  if (orderId.startsWith('GNF-')) {
    await addonNotification(pool, cfg, input, orderId, gross);
    return {};
  }

  const order = await orderByMidtransId(pool, orderId);
  if (!order) throw new ApiError('Pesanan tidak ditemukan.', 404, 'ORDER_NOT_FOUND');
  const payload = paymentPayload(input);
  if (!sameAmount(gross, order.price)) {
    await addLog(pool, Number(order.id), 'payment_update', null, null, 'midtrans', null,
      `Notifikasi ditolak: jumlah pembayaran (${gross}) tidak sama dengan harga pesanan.`, payload);
    throw new ApiError('Jumlah pembayaran tidak sesuai.', 400, 'AMOUNT_MISMATCH');
  }

  let tx = rawScalar(input, 'transaction_status');
  let fraud = rawScalar(input, 'fraud_status');
  let paymentType = rawScalar(input, 'payment_type');
  // Confirm with the Status API; the notification itself is signed, so it is the fallback when the API is unreachable
  const check = await midtransRequest('GET', `${cfg.apiBase}/v2/${encodeURIComponent(orderId)}/status`, cfg.serverKey, null, 10);
  const body = check.body;
  if (check.code === 200 && isObject(body) && body.transaction_status != null && String(body.order_id ?? '') === orderId) {
    if (body.gross_amount != null && !sameAmount(String(body.gross_amount), order.price)) {
      await addLog(pool, Number(order.id), 'payment_update', null, null, 'midtrans', null,
        'Status API: jumlah pembayaran tidak sama dengan harga pesanan.', paymentPayload(body));
      throw new ApiError('Jumlah pembayaran tidak sesuai.', 400, 'AMOUNT_MISMATCH');
    }
    tx = String(body.transaction_status);
    fraud = String(body.fraud_status ?? '');
    paymentType = String(body.payment_type ?? paymentType);
    payload.confirmed_by_status_api = true;
  } else {
    payload.confirmed_by_status_api = false;
    console.error(`[midtrans] Status API check failed for ${orderId}: HTTP ${check.code} ${check.error}`);
  }

  // Current attempt: the saved one, or the latest claimed attempt when Snap answered too late to be saved
  const isCurrent = order.midtrans_order_id === orderId
    || (order.midtrans_order_id === null && orderId === `${order.order_number}-${order.payment_attempt}`);
  await applyPayment(pool, order, tx, fraud, paymentType !== '' ? paymentType : null, 'midtrans', null, payload, isCurrent);
  return {};
}

// ════════════════════════════════════════════════════════════════════════════
// Customer (token role customer; every query filtered by user_id = token owner)
// ════════════════════════════════════════════════════════════════════════════

async function customerCreateOrder(ctx) {
  const { pool, input } = ctx;
  const user = requireCustomer(ctx.user);
  const errors = {};
  const templateId = inInt(ctx, 'template_id');
  if (templateId <= 0) errors.template_id = 'Pilih template terlebih dahulu.';
  const customerName = vStr(input, 'customer_name', 'Nama pemesan', 150, true, errors, 2);
  const customerEmail = vEmail(input, 'customer_email', 'Email', true, errors);
  const customerPhone = vPhone(input, 'customer_phone', 'Nomor telepon', true, errors);
  const companyName = vStr(input, 'company_name', 'Nama perusahaan', 150, false, errors);
  const notes = vStr(input, 'notes', 'Catatan', 2000, false, errors);
  const domainPrimary = vDomain(input, 'domain_primary', 'Domain utama', true, errors);
  const domainAlternative = vDomain(input, 'domain_alternative', 'Domain alternatif', false, errors);
  if (domainPrimary !== null && domainAlternative === domainPrimary) {
    errors.domain_alternative = 'Domain alternatif harus berbeda dari domain utama.';
  }
  // Domain dibeli bersama pesanan: hanya ekstensi yang dijual (domainCatalog, domains.js), satu label tanpa subdomain
  const { tlds } = await domainCatalog(pool);
  for (const [key, domain] of [['domain_primary', domainPrimary], ['domain_alternative', domainAlternative]]) {
    if (domain === null || Object.hasOwn(errors, key)) continue;
    const problem = domainProblem(domain, tlds);
    if (problem !== null) errors[key] = problem;
  }
  validate(errors);

  const template = await dbOne(pool, "SELECT * FROM templates WHERE id = ? AND status = 'published' LIMIT 1", [templateId]);
  if (!template) throw new ApiError('Template tidak ditemukan atau belum tersedia.', 404, 'TEMPLATE_NOT_FOUND');
  const pending = Number((await dbOne(pool, "SELECT COUNT(*) AS c FROM template_orders WHERE user_id = ? AND status = 'menunggu_pembayaran'", [user.id])).c);
  if (pending >= MAX_PENDING_ORDERS) {
    throw new ApiError(`Anda masih punya ${pending} pesanan yang belum dibayar. Selesaikan atau batalkan dulu sebelum memesan lagi.`, 409, 'TOO_MANY_PENDING');
  }
  // Domain yang sudah terdaftar tidak bisa dibeli; 'unknown' (RDAP tidak menjawab) tetap boleh, tim memastikan manual.
  // Cek ini juga dibatasi per akun (pesanan dengan domain terpakai tidak menambah jumlah pesanan menunggu pembayaran)
  const orderKey = `domain-order|${user.id}`;
  const orderWait = domainOrderLimiter.retryAfter(orderKey);
  if (orderWait) tooManyAttempts(orderWait);
  domainOrderLimiter.hit(orderKey);
  const domainCheck = await domainAvailability(domainPrimary);
  if (domainCheck === 'taken') {
    const message = `Domain ${domainPrimary} sudah dipakai orang lain. Cek nama lain.`;
    throw new ApiError(message, 409, 'DOMAIN_UNAVAILABLE', { domain_primary: message });
  }

  // Harga yang dibayar = harga template dikurangi diskon pesanan pertama (bila berlaku) + domain tahun pertama;
  // harga katalog tetap dicatat. Diskon hanya untuk template.
  const quote = await firstOrderQuote(pool, Number(user.id), Number(template.price));
  const firstYearDomain = Number(domainPrice(domainPrimary, tlds));
  let orderId = 0;
  for (let attempt = 0; attempt < 5 && !orderId; attempt++) {
    try {
      const result = await dbRun(pool, `INSERT INTO template_orders (order_number, user_id, template_id, template_name, template_code, price, list_price,
                                            discount_amount, discount_code, domain_price, domain_check, customer_name, customer_email, customer_phone,
                                            company_name, notes, domain_primary, domain_alternative)
                                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        newOrderNumber(), user.id, Number(template.id), template.name, template.template_code,
        quote.price + firstYearDomain, quote.list_price, quote.discount_amount, quote.discount_code, firstYearDomain, domainCheck,
        customerName, customerEmail, customerPhone, companyName, notes, domainPrimary, domainAlternative,
      ]);
      orderId = Number(result.insertId);
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 409 || attempt === 4) throw err; // order number collision: draw a new one
    }
  }
  await addLog(pool, orderId, 'created', null, 'menunggu_pembayaran', 'customer', user.id, 'Pesanan dibuat.');
  const order = await orderById(pool, orderId);

  let paymentUrl = null;
  let paymentError = null;
  if (Number(order.price) <= 0) {
    // Free template: nothing to pay, straight to the approval queue
    if (await transition(pool, orderId, 'menunggu_pembayaran', 'menunggu_approval', "paid_at = NOW(), payment_status = 'settlement', payment_type = 'gratis'")) {
      await addLog(pool, orderId, 'payment_update', 'menunggu_pembayaran', 'menunggu_approval', 'system', null, 'Template gratis, tanpa pembayaran.');
    }
  } else {
    const result = await createSnap(pool, order);
    paymentUrl = result.paymentUrl;
    paymentError = result.error;
  }
  const out = { order: orderOut(await orderById(pool, orderId), false), payment_url: paymentUrl };
  if (paymentError !== null) out.payment_error = paymentError;
  return out;
}

/**
 * Diskon otomatis pesanan template pertama (FIRST_ORDER_DISCOUNT_PERCENT): berlaku selama akun belum punya pesanan
 * template lain yang tidak dibatalkan / ditolak. Dibulatkan ke rupiah utuh; template gratis tidak diberi diskon.
 * Sama dengan pf_first_order_quote() di templates.php.
 */
async function firstOrderQuote(pool, userId, listPrice) {
  const others = Number((await dbOne(pool, "SELECT COUNT(*) AS c FROM template_orders WHERE user_id = ? AND status NOT IN ('dibatalkan', 'ditolak')",
    [userId])).c);
  const percent = others === 0 && listPrice > 0 ? FIRST_ORDER_DISCOUNT_PERCENT : 0;
  // Math.round membulatkan .5 ke atas, sama dengan round() PHP untuk harga positif
  const discount = percent > 0 ? Math.round((listPrice * percent) / 100) : 0;
  return {
    list_price: listPrice,
    discount_percent: percent,
    discount_amount: discount,
    discount_code: percent > 0 ? FIRST_ORDER_DISCOUNT_CODE : null,
    price: listPrice - discount,
  };
}

// Harga yang akan dibayar akun ini untuk template (untuk halaman pesan, sebelum pesanan dibuat)
async function customerGetOrderQuote(ctx) {
  const { pool } = ctx;
  const user = requireCustomer(ctx.user);
  const templateId = inInt(ctx, 'template_id');
  const template = templateId > 0 ? await dbOne(pool, "SELECT id, price FROM templates WHERE id = ? AND status = 'published' LIMIT 1", [templateId]) : null;
  if (!template) throw new ApiError('Template tidak ditemukan atau belum tersedia.', 404, 'TEMPLATE_NOT_FOUND');
  const quote = await firstOrderQuote(pool, Number(user.id), Number(template.price));
  return {
    quote: {
      list_price: num(quote.list_price),
      discount_percent: quote.discount_percent,
      discount_amount: num(quote.discount_amount),
      price: num(quote.price),
    },
  };
}

async function customerPayOrder(ctx) {
  const { pool } = ctx;
  const user = requireCustomer(ctx.user);
  const order = await customerOrder(ctx, user);
  if (order.status !== 'menunggu_pembayaran') throw invalidStatus(order.status, 'menunggu_approval');
  const cfg = midtransConfig();
  if (cfg.serverKey === '') throw new ApiError('Pembayaran online belum dikonfigurasi.', 503, 'PAYMENT_NOT_CONFIGURED');

  // Reuse the current Snap page while it is still valid and not finished/failed
  if (order.payment_url && order.payment_status === 'pending') {
    const age = await dbOne(pool, `SELECT TIMESTAMPDIFF(MINUTE, MAX(created_at), NOW()) AS m FROM template_order_logs
                                   WHERE order_id = ? AND event = 'payment_created'`, [Number(order.id)]);
    if (age && age.m !== null && Number(age.m) < SNAP_REUSE_HOURS * 60) {
      return { payment_url: order.payment_url };
    }
  }
  const result = await createSnap(pool, order);
  if (result.paymentUrl === null) throw new ApiError(result.error, 502, 'PAYMENT_GATEWAY_ERROR');
  return { payment_url: result.paymentUrl };
}

async function customerGetOrders(ctx) {
  const user = requireCustomer(ctx.user);
  const rows = await dbAll(ctx.pool, `${orderSelect()} WHERE o.user_id = ? ORDER BY o.created_at DESC, o.id DESC`, [user.id]);
  return { orders: rows.map((r) => orderOut(r, false)) };
}

async function customerGetOrder(ctx) {
  const { pool } = ctx;
  const user = requireCustomer(ctx.user);
  const order = await customerOrder(ctx, user);
  const site = await dbOne(pool, `${siteSelect()} WHERE s.order_id = ? LIMIT 1`, [Number(order.id)]);
  return {
    order: orderOut(order, false),
    logs: await orderLogs(pool, Number(order.id), false),
    site: site ? siteOut(site, false) : null,
    renewals: await orderRenewals(pool, Number(order.id), false),
    renewal: await renewalOffer(pool, order),
  };
}

async function customerCancelOrder(ctx) {
  const { pool } = ctx;
  const user = requireCustomer(ctx.user);
  const order = await customerOrder(ctx, user);
  if (!(await transition(pool, Number(order.id), 'menunggu_pembayaran', 'dibatalkan', 'cancelled_at = NOW()'))) {
    throw invalidStatus(order.status, 'dibatalkan');
  }
  await addLog(pool, Number(order.id), 'cancelled', 'menunggu_pembayaran', 'dibatalkan', 'customer', user.id, 'Dibatalkan oleh pemesan.');
  await midtransExpire(order);
  return { order: orderOut(await orderById(pool, Number(order.id)), false) };
}

async function customerGetSite(ctx) {
  const user = requireCustomer(ctx.user);
  return { site: await customerSiteOut(ctx.pool, await customerSite(ctx, user, inInt(ctx, 'site_id'))) };
}

// Saves the CMS content. data: URIs (images) become uploaded files under assets/sites/<site_id>/.
async function customerSaveSiteContent(ctx) {
  const { pool } = ctx;
  const user = requireCustomer(ctx.user);
  const site = await customerSite(ctx, user, inInt(ctx, 'site_id'));
  const siteId = Number(site.id);
  if (site.status !== 'active') {
    throw new ApiError('Situs sedang dinonaktifkan sehingga kontennya tidak bisa diubah. Hubungi kami.', 409, 'SITE_SUSPENDED');
  }

  // Like PHP, the content comes from the body re-read with json_decode (object mode, see ctx.body), so the keys
  // keep the order the client sent. A body PHP cannot decode counts as missing content.
  // Only an explicit null resets to the template default; a missing key or broken JSON must not wipe the content
  if (!(ctx.body instanceof Map) || !ctx.body.has('content')) {
    throw new ApiError('Konten wajib dikirim.', 400, 'INVALID_CONTENT');
  }
  let content = ctx.body.get('content');
  if (typeof content === 'string') { // also accept the content as a JSON string
    content = phpJsonDecode(content);
    if (content === undefined) throw new ApiError('Format konten tidak valid.', 400, 'INVALID_CONTENT');
  }
  if (content !== null && !(content instanceof Map)) {
    throw new ApiError('Format konten tidak valid.', 400, 'INVALID_CONTENT');
  }

  let json = null;
  if (content !== null) {
    const images = new Map();
    json = contentJson(walkContent(content, 0, images));
    // Size check before anything is uploaded: each placeholder becomes a URL of known length
    let finalSize = Buffer.byteLength(json, 'utf8');
    for (const [placeholder, img] of images) {
      finalSize += sitePathLength(siteId, img.ext) - placeholder.length;
    }
    if (finalSize > CONTENT_MAX_BYTES) {
      throw new ApiError('Konten terlalu besar (maksimal 512 KB teks). Kurangi teks atau jumlah item.', 413, 'CONTENT_TOO_LARGE');
    }
    for (const [placeholder, img] of images) {
      const path = await uploadBase64ToS3(img.data, `sites/${siteId}`, 'img');
      json = json.split(placeholder).join(path);
    }
  }
  await dbRun(pool, 'UPDATE template_sites SET content = ? WHERE id = ? AND user_id = ?', [json, siteId, user.id]);
  await cleanupSiteAssets(siteId, site.content, json);
  return { site: await customerSiteOut(pool, await customerSite(ctx, user, siteId)) };
}

// Runs the same payment transition as a Midtrans settlement (local testing without Midtrans)
async function devSimulatePayment(ctx) {
  const { pool } = ctx;
  const user = requireCustomer(ctx.user);
  const cfg = midtransConfig();
  if (!cfg.simulator) throw new ApiError('Simulasi pembayaran tidak aktif.', 403, 'SIMULATOR_DISABLED');
  const order = await customerOrder(ctx, user);
  if (order.status !== 'menunggu_pembayaran') throw invalidStatus(order.status, 'menunggu_approval');
  await applyPayment(pool, order, 'settlement', 'accept', 'simulator', 'customer', user.id,
    { simulated: true, transaction_status: 'settlement' }, true, 'simulated');
  return { order: orderOut(await orderById(pool, Number(order.id)), false) };
}

// ════════════════════════════════════════════════════════════════════════════
// Customer: domain check, profile, invoice, renewals (docs/platform/ACCOUNT-DOMAIN-RENEWAL-SPEC.md)
// ════════════════════════════════════════════════════════════════════════════

// Ketersediaan & harga domain untuk halaman pesan (RDAP registri, backend/modules/domains.js)
async function customerCheckDomain(ctx) {
  const user = requireCustomer(ctx.user);
  // Dihitung sebelum I/O apa pun (katalog, validasi), jadi permintaan bersamaan tidak lolos batas
  const key = `domain-check|${user.id}`;
  const wait = domainCheckLimiter.retryAfter(key);
  if (wait) tooManyAttempts(wait);
  domainCheckLimiter.hit(key);
  const errors = {};
  let domain = '';
  const { tlds } = await domainCatalog(ctx.pool);
  const raw = vStr(ctx.input, 'domain', 'Domain', 253, true, errors);
  if (raw !== null) {
    domain = domainNormalize(raw);
    if (domain === '') errors.domain = 'Domain wajib diisi.';
    else {
      const problem = domainProblem(domain, tlds);
      if (problem !== null) errors.domain = problem;
    }
  }
  validate(errors);
  // Nama yang sama di ekstensi populer yang dijual (yang diminta lebih dulu), dicek paralel: pembeli melihat mana yang
  // tersedia
  const domains = domainAlternatives(domain, tlds);
  const statuses = await domainAvailabilityMany(domains);
  const checks = domains.map((d) => {
    const tld = domainTld(d, tlds);
    return { domain: d, tld: tld.tld, status: statuses[d], price: tld.price };
  });
  return { check: checks[0], checks };
}

// Daftar ekstensi domain yang dijual + harga jual per tahun (halaman Harga, pilihan ekstensi di halaman pesan). Harga
// beli DewaBiz tidak ikut.
async function getDomainPrices({ pool }) {
  const catalog = await domainCatalog(pool);
  return { source: catalog.source, domains: catalog.tlds.map(({ tld, price, requirement }) => ({ tld, price, requirement })) };
}

async function customerGetProfile(ctx) {
  const user = requireCustomer(ctx.user);
  return { profile: profileOut(await profileRow(ctx.pool, user.id)) };
}

// Biodata + foto profil. avatar: tidak dikirim / sama = tetap, null atau '' = hapus, data URI PNG/JPG/WEBP = unggah baru
async function customerUpdateProfile(ctx) {
  const { pool, input } = ctx;
  const user = requireCustomer(ctx.user);
  const errors = {};
  const name = vStr(input, 'name', 'Nama', 100, true, errors, 2);
  const phone = vPhone(input, 'phone', 'Nomor HP', true, errors);
  const company = vStr(input, 'company_name', 'Nama perusahaan', 150, false, errors);
  const address = vStr(input, 'address', 'Alamat', 255, false, errors);
  const city = vStr(input, 'city', 'Kota', 100, false, errors);
  const row = await profileRow(pool, user.id);
  const current = typeof row.avatar === 'string' ? row.avatar : '';
  let avatar = current;
  let upload = null;
  if (Object.hasOwn(input, 'avatar')) {
    const value = input.avatar;
    if (value === null || value === '') {
      avatar = '';
    } else if (typeof value === 'string' && value === current) {
      // tidak berubah
    } else if (typeof value === 'string' && /^[\t\n\v\f\r ]*data:/i.test(value)) {
      const m = /^[\t\n\v\f\r ]*data:image\/(png|jpe?g|webp);base64,/i.exec(value);
      if (!m) {
        errors.avatar = 'Foto profil harus JPG, PNG, atau WEBP.';
      } else if (Buffer.byteLength(value, 'utf8') - Buffer.byteLength(m[0], 'utf8') > Math.ceil((AVATAR_MAX_BYTES * 4) / 3) + 4) {
        errors.avatar = 'Ukuran foto maksimal 2 MB.';
      } else {
        try {
          // Type from the bytes, never from the header
          const { content, ext } = parseUpload(phpTrim(value), { allowDocuments: false });
          if (!AVATAR_EXTS.includes(ext)) errors.avatar = 'Foto profil harus JPG, PNG, atau WEBP.';
          else if (content.length > AVATAR_MAX_BYTES) errors.avatar = 'Ukuran foto maksimal 2 MB.';
          else upload = phpTrim(value);
        } catch {
          errors.avatar = 'Foto profil tidak valid.';
        }
      }
    } else {
      errors.avatar = 'Foto profil tidak valid.';
    }
  }
  validate(errors);
  if (upload !== null) {
    // Foto baru hanya menggantikan foto yang tadi dibaca: dua simpan bersamaan tidak meninggalkan file yatim
    avatar = await uploadBase64ToS3(upload, 'avatars', 'avatar');
    const result = await dbRun(pool, 'UPDATE users SET name = ?, phone = ?, company_name = ?, address = ?, city = ?, avatar = ? WHERE id = ? AND avatar <=> ?',
      [name, phone, company, address, city, avatar, user.id, row.avatar]);
    if (result.affectedRows === 0) {
      await deleteGenerated(avatar, 'avatars');
      throw new ApiError('Foto profil baru saja diubah di tempat lain. Muat ulang halaman lalu coba lagi.', 409, 'PROFILE_CHANGED');
    }
  } else {
    await dbRun(pool, 'UPDATE users SET name = ?, phone = ?, company_name = ?, address = ?, city = ?, avatar = ? WHERE id = ?',
      [name, phone, company, address, city, avatar, user.id]);
  }
  if (avatar !== current) await deleteGenerated(current, 'avatars');
  return { profile: profileOut(await profileRow(pool, user.id)) };
}

async function profileRow(pool, userId) {
  const row = await dbOne(pool, 'SELECT id, name, email, phone, company_name, address, city, avatar FROM users WHERE id = ? LIMIT 1', [userId]);
  if (!row) throw new ApiError('Silakan masuk terlebih dahulu.', 401, 'UNAUTHORIZED');
  return row;
}

function profileOut(r) {
  const avatar = typeof r.avatar === 'string' ? r.avatar : '';
  return {
    id: Number(r.id),
    name: r.name,
    email: r.email,
    phone: r.phone,
    company_name: r.company_name,
    address: r.address,
    city: r.city,
    // Path/URL gambar saja; kosong atau data URI (foto staf lama) = inisial nama
    avatar: /^(\/assets\/|https:\/\/)/.test(avatar) ? avatar : null,
  };
}

// Data nota pembelian (pesanan lunas), nota perpanjangan (tagihan lunas, renewal_number) atau nota fitur tambahan (tagihan
// GNF- lunas dan berbayar, addon_number; site_addons.js) + identitas perusahaan untuk kop
async function customerGetInvoice(ctx) {
  const { pool } = ctx;
  const user = requireCustomer(ctx.user);
  const order = await customerOrder(ctx, user);
  const number = phpTrim(inStr(ctx.input, 'renewal_number')).toUpperCase();
  const addonNumber = phpTrim(inStr(ctx.input, 'addon_number')).toUpperCase();
  let renewal = null;
  let addon = null;
  if (number !== '') {
    renewal = await dbOne(pool, `${renewalSelect()} WHERE r.renewal_number = ? AND r.order_id = ? LIMIT 1`, [number, Number(order.id)]);
    if (!renewal) throw new ApiError('Tagihan perpanjangan tidak ditemukan.', 404, 'RENEWAL_NOT_FOUND');
    if (renewal.status !== 'lunas') throw new ApiError(INVOICE_NOT_AVAILABLE_MESSAGE, 409, 'INVOICE_NOT_AVAILABLE');
  } else if (addonNumber !== '') {
    addon = await customerAddonInvoice(pool, order, addonNumber);
  } else if (order.paid_at === null) {
    throw new ApiError(INVOICE_NOT_AVAILABLE_MESSAGE, 409, 'INVOICE_NOT_AVAILABLE');
  }
  return {
    order: orderOut(order, false),
    renewal: renewal ? renewalOut(renewal, false) : null,
    addon,
    company: (await pdSettings({ db: pool })).company,
  };
}

// Daftar nota pembeli (menu Nota): pesanan yang sudah dibayar + perpanjangan lunas + fitur tambahan lunas berbayar
// (type fitur, site_addons.js), terbaru dulu
async function customerGetInvoices(ctx) {
  const { pool } = ctx;
  const user = requireCustomer(ctx.user);
  const items = [];
  for (const o of await dbAll(pool, `${orderSelect()} WHERE o.user_id = ? AND o.paid_at IS NOT NULL`, [user.id])) {
    items.push({
      type: 'pembelian',
      invoice_number: `INV-${o.order_number}`,
      order_number: o.order_number,
      renewal_number: null,
      addon_number: null,
      title: o.template_name,
      domain: o.domain || o.domain_primary,
      years: null,
      amount: num(o.price),
      paid_at: o.paid_at,
      payment_status: o.payment_status,
      payment_type: o.payment_type,
      order_status: o.status,
    });
  }
  for (const r of await dbAll(pool, `${renewalSelect()} WHERE o.user_id = ? AND r.status = 'lunas'`, [user.id])) {
    items.push({
      type: 'perpanjangan',
      invoice_number: `INV-${r.renewal_number}`,
      order_number: r.order_number,
      renewal_number: r.renewal_number,
      addon_number: null,
      title: r.template_name,
      domain: r.domain,
      years: Number(r.years),
      amount: num(r.price),
      paid_at: r.paid_at,
      payment_status: r.payment_status,
      payment_type: r.payment_type,
      order_status: null,
    });
  }
  items.push(...(await addonInvoiceItems(pool, user.id)));
  // strcmp() like PHP: plain code-unit order of 'YYYY-MM-DD HH:MM:SS' and the invoice numbers
  const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  items.sort((a, b) => cmp(String(b.paid_at), String(a.paid_at)) || cmp(b.invoice_number, a.invoice_number));
  return { invoices: items };
}

async function customerCreateRenewal(ctx) {
  const { pool } = ctx;
  const user = requireCustomer(ctx.user);
  const years = inInt(ctx, 'years');
  if (!RENEWAL_YEARS.includes(years)) validate({ years: 'Pilih masa perpanjangan 1, 2, atau 3 tahun.' });
  const order = await customerOrder(ctx, user);
  const orderId = Number(order.id);
  const offer = await renewalOffer(pool, order);
  if (order.status !== 'aktif' || offer.price_per_year === null) throw new ApiError(offer.reason, 409, 'RENEWAL_NOT_AVAILABLE');
  await assertNoPendingRenewal(pool, orderId);
  const option = offer.options.find((o) => o.years === years) ?? null;
  if (option === null) throw new ApiError(RENEWAL_TOO_LONG_MESSAGE, 409, 'RENEWAL_TOO_LONG');

  let renewalId = 0;
  for (let attempt = 0; attempt < 5 && !renewalId; attempt++) {
    try {
      const result = await dbRun(pool, `INSERT INTO template_renewals (renewal_number, order_id, user_id, domain, years, hosting_price_per_year,
                                            domain_price_per_year, price_per_year, price, pending_order_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        newOrderNumber('GNR'), orderId, user.id, order.domain || order.domain_primary, years,
        offer.hosting_price_per_year, offer.domain_price_per_year, offer.price_per_year, option.price, orderId,
      ]);
      renewalId = Number(result.insertId);
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 409) throw err;
      await assertNoPendingRenewal(pool, orderId); // a concurrent request opened one (uq_renewals_pending)
      if (attempt === 4) throw err; // renewal number collision: draw a new one
    }
  }
  const renewal = await renewalById(pool, renewalId);
  await addLog(pool, orderId, 'renewal_created', null, null, 'customer', user.id, `Perpanjangan ${years} tahun dibuat (${renewal.renewal_number}).`);
  const result = await createRenewalSnap(pool, renewal);
  const out = { renewal: renewalOut(await renewalById(pool, renewalId), false), payment_url: result.paymentUrl };
  if (result.error !== null) out.payment_error = result.error;
  return out;
}

async function customerPayRenewal(ctx) {
  const { pool } = ctx;
  const user = requireCustomer(ctx.user);
  const renewal = await customerRenewal(ctx, user);
  if (renewal.status !== 'menunggu_pembayaran') throw renewalStatusError(renewal.status);
  // Kartu yang ditahan untuk tinjauan fraud: membayar lagi membuat transaksi baru (risiko tertagih dua kali)
  if (renewal.payment_status === 'capture') {
    throw new ApiError('Pembayaran kartu Anda sedang ditinjau bank. Tidak perlu membayar ulang.', 409, 'PAYMENT_UNDER_REVIEW');
  }
  const cfg = midtransConfig();
  if (cfg.serverKey === '') throw new ApiError('Pembayaran online belum dikonfigurasi.', 503, 'PAYMENT_NOT_CONFIGURED');
  // Reuse the current Snap page while it is still valid and not finished/failed
  if (renewal.payment_url && renewal.payment_status === 'pending' && renewal.payment_age_minutes !== null
    && Number(renewal.payment_age_minutes) < SNAP_REUSE_HOURS * 60) {
    return { payment_url: renewal.payment_url };
  }
  const result = await createRenewalSnap(pool, renewal);
  if (result.paymentUrl === null) throw new ApiError(result.error, 502, 'PAYMENT_GATEWAY_ERROR');
  return { payment_url: result.paymentUrl };
}

async function customerCancelRenewal(ctx) {
  const { pool } = ctx;
  const user = requireCustomer(ctx.user);
  const renewal = await customerRenewal(ctx, user);
  if (!(await renewalTransition(pool, Number(renewal.id), 'dibatalkan', 'cancelled_at = NOW()'))) {
    throw renewalStatusError((await renewalById(pool, Number(renewal.id))).status);
  }
  await addLog(pool, Number(renewal.order_id), 'renewal_cancelled', null, null, 'customer', user.id, `Perpanjangan ${renewal.renewal_number} dibatalkan.`);
  await midtransExpire(renewal);
  return { renewal: renewalOut(await renewalById(pool, Number(renewal.id)), false) };
}

// Same payment result as a Midtrans settlement (local testing without Midtrans)
async function devSimulateRenewalPayment(ctx) {
  const { pool } = ctx;
  const user = requireCustomer(ctx.user);
  const cfg = midtransConfig();
  if (!cfg.simulator) throw new ApiError('Simulasi pembayaran tidak aktif.', 403, 'SIMULATOR_DISABLED');
  const renewal = await customerRenewal(ctx, user);
  if (renewal.status !== 'menunggu_pembayaran') throw renewalStatusError(renewal.status);
  await applyRenewalPayment(pool, renewal, 'settlement', 'accept', 'simulator', 'customer', user.id,
    { simulated: true, transaction_status: 'settlement' }, true, null, 'simulated');
  return {
    renewal: renewalOut(await renewalById(pool, Number(renewal.id)), false),
    order: orderOut(await orderById(pool, Number(renewal.order_id)), false),
  };
}

// Midtrans notification for GNR-… (signature already checked): amount, Status API confirmation, then the payment result
async function renewalNotification(pool, cfg, input, orderId, gross) {
  let renewal = await dbOne(pool, `${renewalSelect()} WHERE r.midtrans_order_id = ? LIMIT 1`, [orderId]);
  // \n? mirrors PHP preg_match, whose $ also matches before a final newline
  const m = /^(GNR-\d{8}-[A-Z0-9]{6})-(\d+)\n?$/.exec(orderId);
  if (!renewal && m) {
    renewal = await dbOne(pool, `${renewalSelect()} WHERE r.renewal_number = ? AND r.payment_attempt >= ? LIMIT 1`, [m[1], Number(m[2])]);
  }
  if (!renewal) throw new ApiError('Tagihan perpanjangan tidak ditemukan.', 404, 'RENEWAL_NOT_FOUND');
  const payload = paymentPayload(input);
  if (!sameAmount(gross, renewal.price)) {
    await addLog(pool, Number(renewal.order_id), 'renewal_payment_update', null, null, 'midtrans', null,
      `Notifikasi perpanjangan ${renewal.renewal_number} ditolak: jumlah pembayaran (${gross}) tidak sama dengan tagihan.`, payload);
    throw new ApiError('Jumlah pembayaran tidak sesuai.', 400, 'AMOUNT_MISMATCH');
  }
  let tx = rawScalar(input, 'transaction_status');
  let fraud = rawScalar(input, 'fraud_status');
  let paymentType = rawScalar(input, 'payment_type');
  // Confirm with the Status API; the notification itself is signed, so it is the fallback when the API is unreachable
  const check = await midtransRequest('GET', `${cfg.apiBase}/v2/${encodeURIComponent(orderId)}/status`, cfg.serverKey, null, 10);
  const body = check.body;
  if (check.code === 200 && isObject(body) && body.transaction_status != null && String(body.order_id ?? '') === orderId) {
    if (body.gross_amount != null && !sameAmount(String(body.gross_amount), renewal.price)) {
      await addLog(pool, Number(renewal.order_id), 'renewal_payment_update', null, null, 'midtrans', null,
        `Status API: jumlah pembayaran perpanjangan ${renewal.renewal_number} tidak sama dengan tagihan.`, paymentPayload(body));
      throw new ApiError('Jumlah pembayaran tidak sesuai.', 400, 'AMOUNT_MISMATCH');
    }
    tx = String(body.transaction_status);
    fraud = String(body.fraud_status ?? '');
    paymentType = String(body.payment_type ?? paymentType);
    payload.confirmed_by_status_api = true;
  } else {
    payload.confirmed_by_status_api = false;
    console.error(`[midtrans] Status API check failed for ${orderId}: HTTP ${check.code} ${check.error}`);
  }
  const isCurrent = renewal.midtrans_order_id === orderId
    || (renewal.midtrans_order_id === null && orderId === `${renewal.renewal_number}-${renewal.payment_attempt}`);
  await applyRenewalPayment(pool, renewal, tx, fraud, paymentType !== '' ? paymentType : null, 'midtrans', null, payload, isCurrent,
    orderId);
}

// One place for every renewal payment result (Midtrans webhook and dev_simulate_renewal_payment):
//   settlement / capture+accept -> lunas + masa aktif diperpanjang (renewalMarkPaid)
//   deny / cancel / expire / failure -> dibatalkan, only for the current attempt while still menunggu_pembayaran
//   pending -> unchanged; refund* / chargeback -> logged only
// paymentOrderId = Midtrans order_id of the notification (null for the simulator). Payment fields change only while the
// renewal waits for payment, or for a refund/chargeback of the attempt that paid it (paid_midtrans_order_id).
async function applyRenewalPayment(pool, renewal, tx, fraud, paymentType, actorType, actorId, payload, isCurrentAttempt, paymentOrderId,
  storedStatus = null) {
  const id = Number(renewal.id);
  const orderId = Number(renewal.order_id);
  const number = renewal.renewal_number;
  tx = String(tx).toLowerCase();
  fraud = String(fraud).toLowerCase();
  const paid = tx === 'settlement' || (tx === 'capture' && fraud === 'accept');
  const failed = ['deny', 'cancel', 'expire', 'failure'].includes(tx);
  const reversal = tx.includes('refund') || tx === 'chargeback' || tx === 'partial_chargeback';
  const payingAttempt = paymentOrderId !== null && paymentOrderId === renewal.paid_midtrans_order_id;

  // An old attempt's failure must not overwrite the payment fields of the current attempt, and nothing but a reversal
  // of the paying attempt changes them once the renewal is lunas
  let paymentChanged = false;
  const touch = renewal.status === 'menunggu_pembayaran'
    ? isCurrentAttempt || paid
    : renewal.status === 'lunas' && payingAttempt && reversal;
  if (touch) {
    const newStatus = storedStatus ?? (tx !== '' ? tx : 'pending');
    paymentChanged = renewal.payment_status !== newStatus || (paymentType !== null && renewal.payment_type !== paymentType);
    if (paymentChanged) {
      await dbRun(pool, 'UPDATE template_renewals SET payment_status = ?, payment_type = COALESCE(?, payment_type) WHERE id = ?',
        [mbSubstr(newStatus, 0, 30), paymentType === null ? null : mbSubstr(paymentType, 0, 40), id]);
    }
  }

  let note = null;
  if (paid) {
    const expires = await renewalMarkPaid(pool, renewal, paymentOrderId);
    if (expires !== null) {
      await addLog(pool, orderId, 'renewal_paid', null, null, actorType, actorId,
        `Perpanjangan ${Number(renewal.years)} tahun lunas (${number}). Masa aktif sampai ${tanggalId(expires)}.`, payload);
      return;
    }
    // Not marked by this notification: decide from the current row (a cancel or another payment may have just won)
    const fresh = await renewalById(pool, id);
    if (fresh.status === 'dibatalkan' && fresh.paid_at === null) {
      note = `Pembayaran perpanjangan ${number} diterima, tetapi tagihannya sudah dibatalkan. Perlu ditindaklanjuti manual (refund).`;
    } else if (fresh.status === 'lunas' && paymentOrderId !== null && fresh.paid_midtrans_order_id !== null
      && paymentOrderId !== fresh.paid_midtrans_order_id) {
      note = `Pembayaran ganda perpanjangan ${number} (${paymentOrderId}); sudah lunas lewat ${fresh.paid_midtrans_order_id}. Perlu ditindaklanjuti manual (refund).`;
    }
  } else if (failed && isCurrentAttempt) {
    if (await renewalTransition(pool, id, 'dibatalkan', 'cancelled_at = NOW()')) {
      await addLog(pool, orderId, 'renewal_cancelled', null, null, actorType, actorId,
        `Perpanjangan ${number} dibatalkan otomatis karena pembayaran tidak berhasil.`, payload);
      return;
    }
  } else if (reversal) {
    note = `Refund/chargeback perpanjangan ${number} tercatat (${tx}); masa aktif tidak diubah.`;
  } else if (tx === 'capture') {
    note = `Pembayaran kartu perpanjangan ${number} menunggu tinjauan fraud (${fraud !== '' ? fraud : '-'}).`;
  }
  // Duplicate notifications change nothing and are not logged again
  if (paymentChanged || note !== null) {
    await addLog(pool, orderId, 'renewal_payment_update', null, null, actorType, actorId,
      note ?? `Status pembayaran perpanjangan ${number}: ${tx !== '' ? tx : '-'}`, payload);
  }
}

// Lunas: conditional status change, then the order's periods are extended, in one transaction. Returns the new
// hosting end date, or null when the renewal no longer waits for payment.
async function renewalMarkPaid(pool, renewal, paymentOrderId) {
  const orderId = Number(renewal.order_id);
  const years = Number(renewal.years);
  const conn = await pool.getConnection();
  let after;
  try {
    await conn.beginTransaction();
    try {
      if (!(await renewalTransition(conn, Number(renewal.id), 'lunas', 'paid_at = NOW(), paid_midtrans_order_id = ?', [paymentOrderId]))) {
        await conn.rollback();
        return null;
      }
      const before = await dbOne(conn, 'SELECT service_expires_at, domain_expires_at FROM template_orders WHERE id = ? FOR UPDATE', [orderId]);
      // Continues from the current end date (activation + 1 year when the order has no end date yet), or from today when
      // the period already ended
      await dbRun(conn, `UPDATE template_orders SET
                           service_expires_at = DATE_ADD(GREATEST(${SERVICE_END_SQL}, NOW()), INTERVAL ? YEAR),
                           domain_expires_at = DATE_ADD(GREATEST(${DOMAIN_END_SQL}, NOW()), INTERVAL ? YEAR),
                           service_started_at = COALESCE(service_started_at, NOW()), domain_started_at = COALESCE(domain_started_at, NOW())
                         WHERE id = ?`, [years, years, orderId]);
      after = await dbOne(conn, 'SELECT service_expires_at, domain_expires_at FROM template_orders WHERE id = ?', [orderId]);
      await dbRun(conn, `UPDATE template_renewals SET service_expires_before = ?, service_expires_after = ?, domain_expires_before = ?,
                           domain_expires_after = ? WHERE id = ?`, [
        before.service_expires_at, after.service_expires_at, before.domain_expires_at, after.domain_expires_at, Number(renewal.id),
      ]);
      await conn.commit();
    } catch (err) {
      await conn.rollback().catch(() => {});
      throw err;
    }
  } finally {
    conn.release();
  }
  return after.service_expires_at;
}

// Leaves menunggu_pembayaran (only from there) and frees the order's open-renewal slot
async function renewalTransition(db, id, to, extraSet, extraParams = []) {
  const result = await dbRun(db, `UPDATE template_renewals SET status = ?, pending_order_id = NULL, ${extraSet} WHERE id = ? AND status = 'menunggu_pembayaran'`,
    [to, ...extraParams, id]);
  return result.affectedRows > 0;
}

// New Snap transaction for a renewal (attempt + 1): hosting & jasa + domain for the chosen years
async function createRenewalSnap(pool, renewal) {
  const cfg = midtransConfig();
  if (cfg.serverKey === '') return { paymentUrl: null, error: 'Pembayaran online belum dikonfigurasi.' };
  const id = Number(renewal.id);
  const attempt = Number(renewal.payment_attempt) + 1;
  // Claim the attempt number first: Midtrans order_id must never be reused, even after a timeout
  const claim = await dbRun(pool, "UPDATE template_renewals SET payment_attempt = ? WHERE id = ? AND payment_attempt = ? AND status = 'menunggu_pembayaran'",
    [attempt, id, attempt - 1]);
  if (claim.affectedRows === 0) {
    const fresh = await renewalById(pool, id);
    if (fresh.status === 'menunggu_pembayaran' && fresh.payment_url) return { paymentUrl: fresh.payment_url, error: null };
    return { paymentUrl: null, error: 'Pembayaran sedang diproses. Muat ulang halaman lalu coba lagi.' };
  }

  const midtransOrderId = `${renewal.renewal_number}-${attempt}`;
  const years = Number(renewal.years);
  const hosting = Math.round(Number(renewal.hosting_price_per_year)) * years;
  const domain = Math.round(Number(renewal.domain_price_per_year)) * years;
  const tld = domainTld(renewal.domain, (await domainCatalog(pool)).tlds);
  const appUrl = envValue('APP_URL', 'http://localhost:5173').replace(/\/+$/, '');
  const response = await midtransRequest('POST', cfg.snapUrl, cfg.serverKey, {
    transaction_details: { order_id: midtransOrderId, gross_amount: hosting + domain },
    item_details: [
      { id: 'HOST', price: hosting, quantity: 1, name: mbSubstr(`Perpanjangan hosting & jasa (${years} tahun)`, 0, 50) },
      {
        id: `DOM-${tld ? tld.tld : 'domain'}`,
        price: domain,
        quantity: 1,
        name: mbSubstr(`Perpanjangan domain ${renewal.domain} (${years} tahun)`, 0, 50),
      },
    ],
    customer_details: {
      first_name: mbSubstr(renewal.customer_name, 0, 50),
      email: renewal.customer_email,
      phone: renewal.customer_phone,
    },
    callbacks: { finish: `${appUrl}/akun/pesanan/${encodeURIComponent(renewal.order_number)}` },
  }, 20);
  const body = response.body;
  if ((response.code !== 200 && response.code !== 201) || !isObject(body) || !body.token || !body.redirect_url) {
    const detail = isObject(body) && body.error_messages != null
      ? [].concat(body.error_messages).join('; ')
      : response.error;
    console.error(`[midtrans] Snap transaction failed for ${midtransOrderId}: HTTP ${response.code} ${detail}`);
    await addLog(pool, Number(renewal.order_id), 'renewal_payment_update', null, null, 'system', null,
      mbSubstr(`Gagal membuat transaksi Midtrans perpanjangan ${renewal.renewal_number} (percobaan ${attempt}): HTTP ${response.code} ${detail}`, 0, 500));
    return { paymentUrl: null, error: 'Gagal membuat pembayaran online. Silakan coba lagi beberapa saat lagi.' };
  }
  // Only while this attempt is still the latest claimed one: a slower older attempt never replaces a newer one
  const saved = await dbRun(pool, `UPDATE template_renewals SET midtrans_order_id = ?, snap_token = ?, payment_url = ?, payment_status = 'pending', payment_type = NULL,
                       payment_created_at = NOW() WHERE id = ? AND status = 'menunggu_pembayaran' AND payment_attempt = ?`,
  [midtransOrderId, String(body.token), String(body.redirect_url), id, attempt]);
  if (saved.affectedRows === 0) {
    const fresh = await renewalById(pool, id);
    if (fresh.status === 'menunggu_pembayaran' && fresh.payment_url) return { paymentUrl: fresh.payment_url, error: null };
    return { paymentUrl: null, error: 'Pembayaran sedang diproses. Muat ulang halaman lalu coba lagi.' };
  }
  await addLog(pool, Number(renewal.order_id), 'renewal_payment_created', null, null, 'system', null,
    `Tagihan perpanjangan ${renewal.renewal_number} dibuat (percobaan ${attempt}).`);
  return { paymentUrl: String(body.redirect_url), error: null };
}

// Penawaran perpanjangan: harga per tahun (hosting & jasa + domain sesuai ekstensi) dan tanggal berakhir baru per opsi
async function renewalOffer(pool, order) {
  const hosting = await hostingRenewalPrice(pool);
  const domainPerYear = domainPrice(order.domain || order.domain_primary, (await domainCatalog(pool)).tlds);
  let reason = null;
  if (order.status !== 'aktif') reason = RENEWAL_NOT_ACTIVE_MESSAGE;
  else if (domainPerYear === null) reason = RENEWAL_NO_PRICE_MESSAGE;
  const perYear = domainPerYear === null ? null : hosting + domainPerYear;
  const options = [];
  if (reason === null) {
    const dates = await renewalDates(pool, Number(order.id));
    for (const years of RENEWAL_YEARS) {
      const [service, domain] = dates[years];
      if ((service > domain ? service : domain) > dates.cap) continue;
      options.push({ years, price: perYear * years, service_expires_after: service, domain_expires_after: domain });
    }
    if (!options.length) reason = RENEWAL_TOO_LONG_MESSAGE;
  }
  return {
    available: reason === null,
    reason,
    hosting_price_per_year: hosting,
    domain_price_per_year: domainPerYear,
    price_per_year: perYear,
    max_years: Math.max(...RENEWAL_YEARS),
    options,
  };
}

// New end dates per number of years, computed by the database with the same expression as renewalMarkPaid, and the
// latest allowed end date (RENEWAL_MAX_YEARS_AHEAD)
async function renewalDates(pool, orderId) {
  const columns = RENEWAL_YEARS.flatMap((y) => [
    `DATE_ADD(GREATEST(${SERVICE_END_SQL}, NOW()), INTERVAL ${y} YEAR) AS s${y}`,
    `DATE_ADD(GREATEST(${DOMAIN_END_SQL}, NOW()), INTERVAL ${y} YEAR) AS d${y}`,
  ]);
  const row = await dbOne(pool, `SELECT ${columns.join(', ')}, DATE_ADD(NOW(), INTERVAL ${RENEWAL_MAX_YEARS_AHEAD} YEAR) AS cap
                                 FROM template_orders WHERE id = ?`, [orderId]);
  const dates = { cap: String(row.cap) };
  for (const y of RENEWAL_YEARS) dates[y] = [String(row[`s${y}`]), String(row[`d${y}`])];
  return dates;
}

// Hosting & jasa per tahun mulai tahun ke-2 (setting template_hosting_renewal_price, admin > Pengaturan website > Harga)
async function hostingRenewalPrice(pool) {
  const row = await dbOne(pool, "SELECT setting_value FROM hero_settings WHERE setting_key = 'template_hosting_renewal_price' LIMIT 1");
  const raw = phpTrim(String(row?.setting_value ?? ''));
  if (!/^\d+(\.\d+)?$/.test(raw)) return HOSTING_RENEWAL_DEFAULT;
  const value = Math.round(Number(raw));
  return value > 0 && value <= 1e12 ? value : HOSTING_RENEWAL_DEFAULT;
}

async function assertNoPendingRenewal(pool, orderId) {
  const pending = await dbOne(pool, "SELECT renewal_number FROM template_renewals WHERE order_id = ? AND status = 'menunggu_pembayaran' LIMIT 1", [orderId]);
  if (pending) {
    throw new ApiError(`Masih ada tagihan perpanjangan ${pending.renewal_number} yang belum dibayar. Bayar atau batalkan dulu.`, 409, 'RENEWAL_PENDING');
  }
}

function renewalStatusError(status) {
  return new ApiError(`Tagihan perpanjangan ini berstatus "${RENEWAL_STATUS_LABEL[status] ?? status}".`, 409, 'INVALID_STATUS');
}

function renewalSelect() {
  return `SELECT r.*, TIMESTAMPDIFF(MINUTE, r.payment_created_at, NOW()) AS payment_age_minutes,
                 o.order_number, o.template_name, o.customer_name, o.customer_email, o.customer_phone
            FROM template_renewals r
            JOIN template_orders o ON o.id = r.order_id`;
}

async function renewalById(db, id) {
  const row = await dbOne(db, `${renewalSelect()} WHERE r.id = ? LIMIT 1`, [id]);
  if (!row) throw new ApiError('Tagihan perpanjangan tidak ditemukan.', 404, 'RENEWAL_NOT_FOUND');
  return row;
}

// Someone else's renewal answers exactly like a missing one
async function customerRenewal(ctx, user) {
  const number = phpTrim(inStr(ctx.input, 'renewal_number')).toUpperCase();
  const row = number === '' ? null
    : await dbOne(ctx.pool, `${renewalSelect()} WHERE r.renewal_number = ? AND o.user_id = ? LIMIT 1`, [number, user.id]);
  if (!row) throw new ApiError('Tagihan perpanjangan tidak ditemukan.', 404, 'RENEWAL_NOT_FOUND');
  return row;
}

async function orderRenewals(pool, orderId, staff) {
  const rows = await dbAll(pool, `${renewalSelect()} WHERE r.order_id = ? ORDER BY r.created_at DESC, r.id DESC`, [orderId]);
  return rows.map((r) => renewalOut(r, staff));
}

function renewalOut(r, staff) {
  const status = r.status;
  return {
    id: Number(r.id),
    renewal_number: r.renewal_number,
    order_number: r.order_number,
    domain: r.domain,
    years: Number(r.years),
    hosting_price_per_year: num(r.hosting_price_per_year),
    domain_price_per_year: num(r.domain_price_per_year),
    price_per_year: num(r.price_per_year),
    price: num(r.price),
    status,
    status_label: RENEWAL_STATUS_LABEL[status] ?? status,
    payment_status: r.payment_status,
    payment_type: r.payment_type,
    // Only the owner gets the payment link, and only while there is something to pay
    payment_url: !staff && status === 'menunggu_pembayaran' ? r.payment_url : null,
    paid_at: r.paid_at,
    cancelled_at: r.cancelled_at,
    service_expires_before: r.service_expires_before,
    service_expires_after: r.service_expires_after,
    domain_expires_before: r.domain_expires_before,
    domain_expires_after: r.domain_expires_after,
    invoice_number: status === 'lunas' ? `INV-${r.renewal_number}` : null,
    created_at: r.created_at,
  };
}

// '2029-10-23 01:23:00' -> '23 Oktober 2029' (log notes for the customer)
function tanggalId(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''));
  return m ? `${Number(m[3])} ${MONTHS_ID[Number(m[2]) - 1]} ${m[1]}` : '-';
}

// ════════════════════════════════════════════════════════════════════════════
// Staff (role admin or user)
// ════════════════════════════════════════════════════════════════════════════

async function adminGetTemplateOrders(ctx) {
  const { pool, input } = ctx;
  requireStaff(ctx.user);
  const status = phpTrim(inStr(input, 'status'));
  if (status !== '' && status !== 'all' && !Object.hasOwn(STATUS_LABEL, status)) {
    throw new ApiError('Status tidak valid.', 400, 'VALIDATION', { status: 'Status tidak valid.' });
  }
  const q = mbSubstr(phpTrim(inStr(input, 'q')), 0, 100);
  const where = [];
  let params = [];
  if (q !== '') {
    const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    where.push(`(o.order_number LIKE ? OR o.customer_name LIKE ? OR o.customer_email LIKE ? OR o.company_name LIKE ?
                 OR o.template_name LIKE ? OR o.domain_primary LIKE ? OR o.domain LIKE ?)`);
    params = Array(7).fill(like);
  }
  // Counts follow the search but not the status tab
  const counts = Object.fromEntries(Object.keys(STATUS_LABEL).map((s) => [s, 0]));
  let all = 0;
  const countRows = await dbAll(pool,
    `SELECT o.status, COUNT(*) AS c FROM template_orders o${where.length ? ` WHERE ${where.join(' AND ')}` : ''} GROUP BY o.status`, params);
  for (const r of countRows) {
    counts[r.status] = Number(r.c);
    all += Number(r.c);
  }
  counts.all = all;
  if (status !== '' && status !== 'all') {
    where.push('o.status = ?');
    params = [...params, status];
  }
  const rows = await dbAll(pool,
    `${orderSelect()}${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY o.created_at DESC, o.id DESC LIMIT 500`, params);
  return { orders: rows.map((r) => orderOut(r, true)), counts };
}

async function adminGetTemplateOrder(ctx) {
  const { pool } = ctx;
  requireStaff(ctx.user);
  const order = await staffOrder(ctx);
  const site = await dbOne(pool, `${siteSelect()} WHERE s.order_id = ? LIMIT 1`, [Number(order.id)]);
  // Fitur tambahan situs pesanan ini (addons: keadaan per fitur, kosong tanpa situs; addon_orders: semua tagihannya)
  const addons = await orderAddons(pool, site, Number(order.id));
  return {
    order: orderOut(order, true),
    logs: await orderLogs(pool, Number(order.id), true),
    site: site ? siteOut(site, true) : null,
    renewals: await orderRenewals(pool, Number(order.id), true),
    addons: addons.addons,
    addon_orders: addons.addon_orders,
  };
}

async function adminApproveTemplateOrder(ctx) {
  const { pool, input } = ctx;
  const user = requireStaff(ctx.user);
  const errors = {};
  const note = vStr(input, 'note', 'Catatan', 500, false, errors);
  validate(errors);
  const order = await staffOrder(ctx);
  if (!(await transition(pool, Number(order.id), 'menunggu_approval', 'proses_domain', 'approved_at = NOW(), approved_by = ?', [user.id]))) {
    throw invalidStatus(order.status, 'proses_domain');
  }
  await addLog(pool, Number(order.id), 'approved', 'menunggu_approval', 'proses_domain', 'staff', user.id, note ?? 'Pesanan disetujui.');
  return { order: orderOut(await orderById(pool, Number(order.id)), true) };
}

async function adminRejectTemplateOrder(ctx) {
  const { pool, input } = ctx;
  const user = requireStaff(ctx.user);
  const errors = {};
  const reason = vStr(input, 'reason', 'Alasan penolakan', 500, true, errors, 3);
  validate(errors);
  const order = await staffOrder(ctx);
  const from = order.status;
  if (!['menunggu_pembayaran', 'menunggu_approval'].includes(from)
      || !(await transition(pool, Number(order.id), from, 'ditolak', 'rejected_reason = ?', [reason]))) {
    throw invalidStatus(from, 'ditolak');
  }
  await addLog(pool, Number(order.id), 'rejected', from, 'ditolak', 'staff', user.id, reason);
  if (from === 'menunggu_pembayaran') await midtransExpire(order);
  return { order: orderOut(await orderById(pool, Number(order.id)), true) };
}

// Final domain -> order aktif + site created (CMS opens for the customer)
async function adminSetOrderDomain(ctx) {
  const { pool, input } = ctx;
  const user = requireStaff(ctx.user);
  const errors = {};
  const domain = vDomain(input, 'domain', 'Domain', true, errors);
  validate(errors);
  const order = await staffOrder(ctx);
  if (order.status !== 'proses_domain') throw invalidStatus(order.status, 'aktif');
  const taken = () => new ApiError(`Domain ${domain} sudah dipakai situs lain.`, 409, 'DOMAIN_TAKEN', { domain: 'Domain sudah dipakai situs lain.' });
  if (await dbOne(pool, 'SELECT id FROM template_sites WHERE domain = ? LIMIT 1', [domain])) throw taken();

  const orderId = Number(order.id);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    try {
      // Masa aktif hosting & jasa dan domain: 1 tahun sejak situs aktif (bertambah lewat perpanjangan)
      if (!(await transition(conn, orderId, 'proses_domain', 'aktif', `domain = ?, activated_at = NOW(), service_started_at = NOW(),
              service_expires_at = DATE_ADD(NOW(), INTERVAL 1 YEAR), domain_started_at = NOW(), domain_expires_at = DATE_ADD(NOW(), INTERVAL 1 YEAR)`, [domain]))) {
        throw invalidStatus((await orderById(conn, orderId)).status, 'aktif');
      }
      try {
        await dbRun(conn, `INSERT INTO template_sites (order_id, user_id, template_id, template_code, domain, status, content, activated_at)
                           VALUES (?, ?, ?, ?, ?, 'active', NULL, NOW())`, [
          orderId, Number(order.user_id), order.template_id === null ? null : Number(order.template_id), order.template_code, domain,
        ]);
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) throw taken();
        throw err;
      }
      await addLog(conn, orderId, 'domain_set', null, null, 'staff', user.id, `Domain: ${domain}`);
      await addLog(conn, orderId, 'activated', 'proses_domain', 'aktif', 'staff', user.id, 'Situs aktif, CMS dibuka untuk pemesan.');
      await conn.commit();
    } catch (err) {
      await conn.rollback().catch(() => {});
      throw err;
    }
  } finally {
    conn.release();
  }
  const site = await dbOne(pool, `${siteSelect()} WHERE s.order_id = ? LIMIT 1`, [orderId]);
  return { order: orderOut(await orderById(pool, orderId), true), site: siteOut(site, true) };
}

async function adminGetTemplates(ctx) {
  requireStaff(ctx.user);
  return { templates: (await dbAll(ctx.pool, 'SELECT * FROM templates ORDER BY sort_order ASC, id ASC')).map(templateOut) };
}

async function adminSaveTemplate(ctx) {
  const { pool, input } = ctx;
  requireStaff(ctx.user);
  let id = inInt(ctx, 'id');
  let existing = null;
  if (id > 0) {
    existing = await dbOne(pool, 'SELECT * FROM templates WHERE id = ? LIMIT 1', [id]);
    if (!existing) throw new ApiError('Template tidak ditemukan.', 404, 'TEMPLATE_NOT_FOUND');
  }

  const errors = {};
  const name = vStr(input, 'name', 'Nama template', 150, true, errors, 3);
  const category = vStr(input, 'category', 'Kategori', 80, true, errors);
  const short = vStr(input, 'short_description', 'Deskripsi singkat', 255, false, errors);
  const description = vStr(input, 'description', 'Deskripsi', 20000, false, errors);
  const features = stringList(input.features ?? [], 30, 200);
  if (features === null) errors.features = 'Fitur berupa daftar teks (maksimal 30 item, 200 karakter per item).';
  const price = input.price ?? null;
  if (!isNumeric(price) || Number(price) < 0 || Number(price) > 999999999999) {
    errors.price = 'Harga harus berupa angka 0 atau lebih.';
  }
  const templateCode = phpTrim(inStr(input, 'template_code')).toLowerCase();
  if (!TEMPLATE_CODE_PATTERN.test(templateCode)) errors.template_code = 'Pilih kode template dari daftar.';
  const demoUrl = vStr(input, 'demo_url', 'URL demo', 500, false, errors);
  if (demoUrl !== null && !/^(https?:\/\/[^\s]+|\/(?!\/)[^\s]*)$/i.test(demoUrl)) {
    errors.demo_url = 'URL demo harus diawali https:// atau /.';
  }
  const status = inStr(input, 'status', 'draft');
  if (status !== 'draft' && status !== 'published') errors.status = 'Status harus draft atau published.';
  // Template terbit tanpa harga tidak bisa dibeli (pesanan Rp0 ditolak) dan membatalkan prerender saat deploy
  if (status === 'published' && !errors.price && Number(price) <= 0) {
    errors.price = 'Template yang terbit harus punya harga di atas 0. Simpan sebagai draft bila harganya belum ada.';
  }
  const sortOrder = inInt(ctx, 'sort_order');
  const preview = input.preview_image ?? null;
  if (preview !== null && preview !== '' && !isImageRef(preview)) {
    errors.preview_image = 'Gambar preview tidak valid.';
  }
  const galleryRaw = input.gallery ?? [];
  const gallery = Array.isArray(galleryRaw) ? galleryRaw : isObject(galleryRaw) ? Object.values(galleryRaw) : null;
  if (gallery === null || gallery.length > 12 || gallery.filter(isImageRef).length !== gallery.length) {
    errors.gallery = 'Galeri berisi maksimal 12 gambar yang valid.';
  }

  let slug = phpTrim(inStr(input, 'slug')).toLowerCase();
  if (slug !== '' && (slug.length > 120 || !SLUG_PATTERN.test(slug))) {
    errors.slug = 'Slug hanya huruf kecil, angka, dan tanda hubung (contoh: company-profile-modern).';
  } else if (RESERVED_SLUGS.has(slug)) {
    errors.slug = `Slug "${slug}" tidak bisa dipakai karena alamat /template/${slug} sudah dipakai halaman lain. Pilih slug lain.`;
  }
  validate(errors);

  if (slug === '') {
    // Automatic slug from the name, made unique with -2, -3, ... (a reserved slug also gets a number)
    const base = slugify(name);
    slug = base;
    for (let n = 2; RESERVED_SLUGS.has(slug) || await dbOne(pool, 'SELECT id FROM templates WHERE slug = ? AND id <> ? LIMIT 1', [slug, id]); n++) {
      slug = `${base.slice(0, 110)}-${n}`;
    }
  } else if (await dbOne(pool, 'SELECT id FROM templates WHERE slug = ? AND id <> ? LIMIT 1', [slug, id])) {
    throw new ApiError('Slug sudah dipakai template lain.', 409, 'SLUG_TAKEN', { slug: 'Slug sudah dipakai template lain.' });
  }

  const previewPath = preview === null || preview === '' ? null : await uploadBase64ToS3(preview.trim(), 'templates', slug);
  const galleryPaths = [];
  for (const img of gallery) galleryPaths.push(await uploadBase64ToS3(img.trim(), 'templates', slug));

  const values = [
    slug, name, category, short, description,
    JSON.stringify(features), Number(price),
    previewPath, JSON.stringify(galleryPaths), templateCode, demoUrl, status, sortOrder,
  ];
  if (existing) {
    await dbRun(pool, `UPDATE templates SET slug = ?, name = ?, category = ?, short_description = ?, description = ?, features = ?, price = ?,
                       preview_image = ?, gallery = ?, template_code = ?, demo_url = ?, status = ?, sort_order = ? WHERE id = ?`, [...values, id]);
    // Uploaded images that were replaced or removed
    const kept = new Set([previewPath, ...galleryPaths]);
    for (const path of [existing.preview_image, ...jsonList(existing.gallery)]) {
      if (path && !kept.has(path)) await deleteGenerated(path, 'templates');
    }
  } else {
    const result = await dbRun(pool, `INSERT INTO templates (slug, name, category, short_description, description, features, price,
                                      preview_image, gallery, template_code, demo_url, status, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, values);
    id = Number(result.insertId);
  }
  return { template: templateOut(await dbOne(pool, 'SELECT * FROM templates WHERE id = ? LIMIT 1', [id])) };
}

// Admin only (ADMIN_ACTIONS). Templates with orders stay, so order history keeps its template.
async function adminDeleteTemplate(ctx) {
  const { pool } = ctx;
  requireStaff(ctx.user);
  const id = inInt(ctx, 'id');
  const template = id > 0 ? await dbOne(pool, 'SELECT * FROM templates WHERE id = ? LIMIT 1', [id]) : null;
  if (!template) throw new ApiError('Template tidak ditemukan.', 404, 'TEMPLATE_NOT_FOUND');
  if (await dbOne(pool, 'SELECT id FROM template_orders WHERE template_id = ? LIMIT 1', [id])
      || await dbOne(pool, 'SELECT id FROM template_sites WHERE template_id = ? LIMIT 1', [id])) {
    throw new ApiError('Template sudah dipakai pesanan sehingga tidak bisa dihapus. Ubah statusnya ke draft agar tidak tampil lagi.', 409, 'TEMPLATE_IN_USE');
  }
  await dbRun(pool, 'DELETE FROM templates WHERE id = ?', [id]);
  for (const path of [template.preview_image, ...jsonList(template.gallery)]) await deleteGenerated(path, 'templates');
  return {};
}

async function adminGetActiveSites(ctx) {
  requireStaff(ctx.user);
  // The list leaves content out (up to 512 KB per site); admin_get_template_order returns it
  const rows = await dbAll(ctx.pool, `${siteSelect(false)} ORDER BY s.activated_at DESC, s.id DESC LIMIT 500`);
  return { sites: rows.map((r) => siteOut(r, true)) };
}

async function adminSetSiteStatus(ctx) {
  const { pool, input } = ctx;
  const user = requireStaff(ctx.user);
  const status = inStr(input, 'status');
  if (status !== 'active' && status !== 'suspended') {
    throw new ApiError('Status situs harus active atau suspended.', 400, 'VALIDATION', { status: 'Status situs harus active atau suspended.' });
  }
  let site = await dbOne(pool, `${siteSelect()} WHERE s.id = ? LIMIT 1`, [inInt(ctx, 'id')]);
  if (!site) throw new ApiError('Situs tidak ditemukan.', 404, 'SITE_NOT_FOUND');
  if (site.status !== status) {
    await dbRun(pool, 'UPDATE template_sites SET status = ? WHERE id = ?', [status, Number(site.id)]);
    await addLog(pool, Number(site.order_id), 'note', null, null, 'staff', user.id,
      status === 'suspended' ? `Situs ${site.domain} dinonaktifkan sementara.` : `Situs ${site.domain} diaktifkan kembali.`);
    site = await dbOne(pool, `${siteSelect()} WHERE s.id = ? LIMIT 1`, [Number(site.id)]);
  }
  return { site: siteOut(site, true) };
}

// Pengaturan harga domain untuk admin (Pengaturan website > Harga): markup DewaBiz (tidak ikut get_settings publik),
// sumber daftar harga, dan biaya hosting & jasa per tahun yang berlaku
async function adminGetDomainPricing(ctx) {
  const { pool } = ctx;
  requireStaff(ctx.user);
  const catalog = await domainCatalog(pool);
  return {
    source: catalog.source,
    markup_percent: await domainMarkupPercent(pool),
    markup_default: DOMAIN_MARKUP_DEFAULT,
    hosting_renewal_price: await hostingRenewalPrice(pool),
  };
}

async function adminDashboardSummary(ctx) {
  const { pool } = ctx;
  requireStaff(ctx.user);
  const monthStart = "DATE_FORMAT(NOW(), '%Y-%m-01')";
  const byStatus = Object.fromEntries(Object.keys(STATUS_LABEL).map((s) => [s, 0]));
  for (const r of await dbAll(pool, 'SELECT status, COUNT(*) AS c FROM template_orders GROUP BY status')) byStatus[r.status] = Number(r.c);
  const orders = await dbOne(pool, `SELECT COUNT(*) AS total, COALESCE(SUM(created_at >= ${monthStart}), 0) AS this_month FROM template_orders`);
  const projects = await dbOne(pool, `SELECT COUNT(*) AS total, COALESCE(SUM(created_at >= ${monthStart}), 0) AS this_month,
                                             COALESCE(SUM(source = 'website' AND status = 'pending'), 0) AS from_website_pending,
                                             COALESCE(SUM(CASE WHEN status <> 'canceled' THEN price ELSE 0 END), 0) AS custom_total
                                      FROM project_client`);
  const paid = await dbOne(pool, `SELECT COALESCE(SUM(price), 0) AS s FROM template_orders
                                  WHERE paid_at IS NOT NULL AND status IN ('menunggu_approval', 'proses_domain', 'aktif')`);
  const recent = await dbAll(pool, `${orderSelect()} ORDER BY o.created_at DESC, o.id DESC LIMIT 5`);
  return {
    template_orders: { total: Math.trunc(Number(orders.total)), this_month: Math.trunc(Number(orders.this_month)), by_status: byStatus },
    custom_projects: {
      total: Math.trunc(Number(projects.total)),
      this_month: Math.trunc(Number(projects.this_month)),
      from_website_pending: Math.trunc(Number(projects.from_website_pending)),
    },
    revenue: { template_paid: num(paid.s), custom_total: num(projects.custom_total) },
    recent_template_orders: recent.map((r) => orderOut(r, true)),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Order state machine and payments
// ════════════════════════════════════════════════════════════════════════════

// Conditional status change: only succeeds while the order still has status `from` (no race, no double webhook)
async function transition(db, orderId, from, to, extraSet = '', extraParams = []) {
  const result = await dbRun(db, `UPDATE template_orders SET status = ?${extraSet !== '' ? `, ${extraSet}` : ''} WHERE id = ? AND status = ?`,
    [to, ...extraParams, orderId, from]);
  return result.affectedRows > 0;
}

function invalidStatus(current, target) {
  return new ApiError(`Pesanan berstatus "${STATUS_LABEL[current] ?? current}" sehingga tidak bisa diubah menjadi "${STATUS_LABEL[target] ?? target}".`,
    409, 'INVALID_STATUS');
}

// One place for every payment result (Midtrans webhook and dev_simulate_payment):
//   settlement / capture+accept -> menunggu_approval (+ paid_at)
//   deny / cancel / expire / failure -> dibatalkan, only for the current attempt while still menunggu_pembayaran
//   pending -> unchanged; refund* / chargeback -> logged only
async function applyPayment(pool, order, tx, fraud, paymentType, actorType, actorId, payload, isCurrentAttempt, storedStatus = null) {
  const orderId = Number(order.id);
  tx = String(tx).toLowerCase();
  fraud = String(fraud).toLowerCase();
  const paid = tx === 'settlement' || (tx === 'capture' && fraud === 'accept');
  const failed = ['deny', 'cancel', 'expire', 'failure'].includes(tx);
  let from = null;
  let to = null;
  let note = null;

  if (paid) {
    if (await transition(pool, orderId, 'menunggu_pembayaran', 'menunggu_approval', 'paid_at = NOW()')) {
      [from, to] = ['menunggu_pembayaran', 'menunggu_approval'];
      note = storedStatus === 'simulated' ? 'Pembayaran simulasi diterima (mode pengembangan).' : 'Pembayaran diterima.';
    } else if (order.paid_at === null && ['dibatalkan', 'ditolak'].includes(order.status)) {
      note = `Pembayaran diterima, tetapi pesanan sudah berstatus ${STATUS_LABEL[order.status]}. Perlu ditindaklanjuti manual (refund).`;
    }
  } else if (failed && isCurrentAttempt) {
    if (await transition(pool, orderId, 'menunggu_pembayaran', 'dibatalkan', 'cancelled_at = NOW()')) {
      [from, to] = ['menunggu_pembayaran', 'dibatalkan'];
      note = `Pembayaran ${tx}, pesanan dibatalkan otomatis.`;
    }
  } else if (tx.includes('refund') || tx === 'chargeback' || tx === 'partial_chargeback') {
    note = `Refund/chargeback tercatat (${tx}); status pesanan tidak diubah.`;
  } else if (tx === 'capture') {
    note = `Pembayaran kartu menunggu tinjauan fraud (${fraud !== '' ? fraud : '-'}).`;
  }

  // An old attempt's failure must not overwrite the payment fields of the current attempt
  let paymentChanged = false;
  if (isCurrentAttempt || paid) {
    const newStatus = storedStatus ?? (tx !== '' ? tx : 'pending');
    paymentChanged = order.payment_status !== newStatus || (paymentType !== null && order.payment_type !== paymentType);
    if (paymentChanged) {
      await dbRun(pool, 'UPDATE template_orders SET payment_status = ?, payment_type = COALESCE(?, payment_type) WHERE id = ?',
        [mbSubstr(newStatus, 0, 30), paymentType === null ? null : mbSubstr(paymentType, 0, 40), orderId]);
    }
  }
  // Duplicate notifications change nothing and are not logged again
  if (to !== null || paymentChanged || note !== null) {
    await addLog(pool, orderId, 'payment_update', from, to, actorType, actorId, note ?? `Status pembayaran: ${tx !== '' ? tx : '-'}`, payload);
  }
}

// New Snap transaction (attempt + 1). Returns { paymentUrl: string|null, error: string|null }.
async function createSnap(pool, order) {
  const cfg = midtransConfig();
  if (cfg.serverKey === '') return { paymentUrl: null, error: 'Pembayaran online belum dikonfigurasi.' };
  const orderId = Number(order.id);
  const attempt = Number(order.payment_attempt) + 1;
  // Claim the attempt number first: Midtrans order_id must never be reused, even after a timeout
  const claim = await dbRun(pool, "UPDATE template_orders SET payment_attempt = ? WHERE id = ? AND payment_attempt = ? AND status = 'menunggu_pembayaran'",
    [attempt, orderId, attempt - 1]);
  if (claim.affectedRows === 0) {
    const fresh = await orderById(pool, orderId);
    if (fresh.status === 'menunggu_pembayaran' && fresh.payment_url) return { paymentUrl: fresh.payment_url, error: null };
    return { paymentUrl: null, error: 'Pembayaran sedang diproses. Muat ulang halaman lalu coba lagi.' };
  }

  const midtransOrderId = `${order.order_number}-${attempt}`;
  const amount = Math.round(Number(order.price));
  const appUrl = envValue('APP_URL', 'http://localhost:5173').replace(/\/+$/, '');
  // Template (setelah diskon) + domain tahun pertama; jumlah item = gross_amount
  const domainAmount = Math.round(Number(order.domain_price ?? 0));
  const items = [];
  if (amount - domainAmount > 0) {
    items.push({
      id: `TPL-${order.template_id === null ? 0 : Number(order.template_id)}`,
      price: amount - domainAmount,
      quantity: 1,
      name: mbSubstr(order.template_name, 0, 50),
    });
  }
  if (domainAmount > 0) {
    const tld = domainTld(order.domain_primary, (await domainCatalog(pool)).tlds);
    items.push({
      id: `DOM-${tld ? tld.tld : 'domain'}`,
      price: domainAmount,
      quantity: 1,
      name: mbSubstr(`Domain ${order.domain_primary} (1 tahun)`, 0, 50),
    });
  }
  const response = await midtransRequest('POST', cfg.snapUrl, cfg.serverKey, {
    transaction_details: { order_id: midtransOrderId, gross_amount: amount },
    item_details: items,
    customer_details: {
      first_name: mbSubstr(order.customer_name, 0, 50),
      email: order.customer_email,
      phone: order.customer_phone,
    },
    callbacks: { finish: `${appUrl}/akun/pesanan/${encodeURIComponent(order.order_number)}` },
  }, 20);
  const body = response.body;
  if ((response.code !== 200 && response.code !== 201) || !isObject(body) || !body.token || !body.redirect_url) {
    const detail = isObject(body) && body.error_messages != null
      ? [].concat(body.error_messages).join('; ')
      : response.error;
    console.error(`[midtrans] Snap transaction failed for ${midtransOrderId}: HTTP ${response.code} ${detail}`);
    await addLog(pool, orderId, 'note', null, null, 'system', null,
      mbSubstr(`Gagal membuat transaksi Midtrans (percobaan ${attempt}): HTTP ${response.code} ${detail}`, 0, 500));
    return { paymentUrl: null, error: 'Gagal membuat pembayaran online. Silakan coba lagi beberapa saat lagi.' };
  }
  await dbRun(pool, `UPDATE template_orders SET midtrans_order_id = ?, snap_token = ?, payment_url = ?, payment_status = 'pending', payment_type = NULL
                     WHERE id = ? AND status = 'menunggu_pembayaran'`, [midtransOrderId, String(body.token), String(body.redirect_url), orderId]);
  await addLog(pool, orderId, 'payment_created', null, null, 'system', null, `Tagihan pembayaran dibuat (percobaan ${attempt}).`);
  return { paymentUrl: String(body.redirect_url), error: null };
}

// Best effort: a cancelled/rejected order's open Midtrans transaction is expired so it cannot be paid anymore
export async function midtransExpire(order) {
  const cfg = midtransConfig();
  if (cfg.serverKey === '' || !order.midtrans_order_id || order.payment_status !== 'pending') return;
  const result = await midtransRequest('POST', `${cfg.apiBase}/v2/${encodeURIComponent(order.midtrans_order_id)}/expire`, cfg.serverKey, null, 5);
  if (result.code !== 200) console.error(`[midtrans] expire ${order.midtrans_order_id}: HTTP ${result.code} ${result.error}`);
}

export function midtransConfig() {
  const flag = (key) => ['1', 'true', 'yes'].includes(envValue(key, '0').toLowerCase());
  const production = flag('MIDTRANS_IS_PRODUCTION');
  const clientKey = envValue('MIDTRANS_CLIENT_KEY');
  const test = midtransTestUrl();
  return {
    serverKey: envValue('MIDTRANS_SERVER_KEY'),
    clientKey: clientKey !== '' ? clientKey : null,
    isProduction: production,
    simulator: !production && flag('MIDTRANS_SIMULATOR'),
    snapUrl: test !== '' ? `${test}/snap/v1/transactions`
      : production ? 'https://app.midtrans.com/snap/v1/transactions' : 'https://app.sandbox.midtrans.com/snap/v1/transactions',
    apiBase: test !== '' ? test : production ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com',
  };
}

// Tes saja: MIDTRANS_TEST_URL (http://127.0.0.1:<port> atau http://localhost:<port>) menggantikan Snap dan API Midtrans
// dengan server palsu (__tests__/backend/site-addons.test.ts). Diabaikan bila MIDTRANS_IS_PRODUCTION aktif atau hostnya
// lain, jadi server key tidak pernah terkirim ke luar mesin ini. Same rule in templates.php (pf_midtrans_test_url).
function midtransTestUrl() {
  if (['1', 'true', 'yes'].includes(envValue('MIDTRANS_IS_PRODUCTION', '0').toLowerCase())) return '';
  const url = envValue('MIDTRANS_TEST_URL').replace(/\/+$/, '');
  return /^http:\/\/(127\.0\.0\.1|localhost)(:[0-9]{1,5})?$/.test(url) ? url : '';
}

// HTTPS JSON request to Midtrans with Basic auth (server key). Never throws. Plain http only to the fake server of
// MIDTRANS_TEST_URL (tests): midtransConfig() never builds another http URL.
export async function midtransRequest(method, url, serverKey, body, timeoutSeconds) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutSeconds * 1000);
  try {
    const response = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`,
      },
      body: body !== null ? JSON.stringify(body) : method === 'POST' ? '' : undefined,
      signal: controller.signal,
    });
    const text = await response.text();
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
    return { code: response.status, error: '', body: parsed };
  } catch (err) {
    return { code: 0, error: controller.signal.aborted ? 'timeout' : String(err?.cause?.message || err?.message || err), body: null };
  } finally {
    clearTimeout(timer);
  }
}

// Order of a Midtrans order_id: the current attempt, or an older attempt of the same order (GN-...-<n>)
async function orderByMidtransId(pool, midtransOrderId) {
  let row = await dbOne(pool, `${orderSelect()} WHERE o.midtrans_order_id = ? LIMIT 1`, [midtransOrderId]);
  // \n? mirrors PHP preg_match, whose $ also matches before a final newline
  const m = /^(GN-\d{8}-[A-Z0-9]{6})-(\d+)\n?$/.exec(midtransOrderId);
  if (!row && m) {
    row = await dbOne(pool, `${orderSelect()} WHERE o.order_number = ? AND o.payment_attempt >= ? LIMIT 1`, [m[1], Number(m[2])]);
  }
  return row;
}

// Notification fields kept in the log: no signature, no card data
export function paymentPayload(data) {
  const keep = ['order_id', 'transaction_id', 'transaction_status', 'fraud_status', 'payment_type', 'status_code', 'status_message',
    'gross_amount', 'currency', 'transaction_time', 'settlement_time', 'expiry_time', 'bank', 'store', 'issuer', 'acquirer'];
  const out = {};
  for (const k of keep) {
    const v = data?.[k];
    if (v !== null && v !== undefined && isScalar(v)) out[k] = mbSubstr(scalarString(v), 0, 200);
  }
  if (Array.isArray(data?.va_numbers)) {
    out.va_banks = data.va_numbers
      .map((v) => (isObject(v) || Array.isArray(v) ? scalarString(v.bank ?? '') : ''))
      .filter((b) => b !== '' && b !== '0');
  }
  return out;
}

export function sameAmount(gross, price) {
  return isNumeric(gross) && Math.round(Number(gross)) === Math.round(Number(price));
}

// GN-YYYYMMDD-XXXXXX (pesanan) or GNR-YYYYMMDD-XXXXXX (perpanjangan)
export function newOrderNumber(prefix = 'GN') {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) suffix += chars[crypto.randomInt(0, 36)];
  // Date in Asia/Jakarta (UTC+7, no daylight saving)
  const ymd = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, '');
  return `${prefix}-${ymd}-${suffix}`;
}

export async function addLog(db, orderId, event, from, to, actorType, actorId, note = null, payload = null) {
  await dbRun(db, `INSERT INTO template_order_logs (order_id, event, from_status, to_status, actor_type, actor_id, note, payload)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
    orderId, event, from, to, actorType, actorId,
    note === null ? null : mbSubstr(note, 0, 500),
    payload === null ? null : JSON.stringify(payload),
  ]);
}

// ════════════════════════════════════════════════════════════════════════════
// Loading and output shapes (SPEC §6)
// ════════════════════════════════════════════════════════════════════════════

function orderSelect() {
  return `SELECT o.*, t.slug AS template_slug, s.id AS site_id, u.name AS user_name, u.email AS user_email
            FROM template_orders o
            LEFT JOIN templates t ON t.id = o.template_id
            LEFT JOIN template_sites s ON s.order_id = o.id
            LEFT JOIN users u ON u.id = o.user_id`;
}

async function orderById(db, id) {
  const row = await dbOne(db, `${orderSelect()} WHERE o.id = ? LIMIT 1`, [id]);
  if (!row) throw new ApiError('Pesanan tidak ditemukan.', 404, 'ORDER_NOT_FOUND');
  return row;
}

// Someone else's order answers exactly like a missing one (no IDOR, no existence leak)
async function customerOrder(ctx, user) {
  const number = phpTrim(inStr(ctx.input, 'order_number')).toUpperCase();
  const row = number === '' ? null
    : await dbOne(ctx.pool, `${orderSelect()} WHERE o.order_number = ? AND o.user_id = ? LIMIT 1`, [number, user.id]);
  if (!row) throw new ApiError('Pesanan tidak ditemukan.', 404, 'ORDER_NOT_FOUND');
  return row;
}

async function staffOrder(ctx) {
  const id = inInt(ctx, 'id');
  if (id <= 0) throw new ApiError('Pesanan tidak ditemukan.', 404, 'ORDER_NOT_FOUND');
  return orderById(ctx.pool, id);
}

function orderOut(r, staff) {
  const status = r.status;
  const out = {
    id: Number(r.id),
    order_number: r.order_number,
    template_id: r.template_id === null ? null : Number(r.template_id),
    template_name: r.template_name,
    template_code: r.template_code,
    template_slug: r.template_slug ?? null,
    price: num(r.price),
    // Harga katalog & diskon pesanan pertama; pesanan lama (sebelum kolom ini ada) = tanpa diskon
    list_price: num(r.list_price ?? r.price),
    discount_amount: num(r.discount_amount ?? 0),
    discount_code: r.discount_code ?? null,
    customer_name: r.customer_name,
    customer_email: r.customer_email,
    customer_phone: r.customer_phone,
    company_name: r.company_name,
    notes: r.notes,
    domain_primary: r.domain_primary,
    domain_alternative: r.domain_alternative,
    domain: r.domain,
    status,
    status_label: STATUS_LABEL[status] ?? status,
    payment_status: r.payment_status,
    payment_type: r.payment_type,
    // Only the owner gets the payment link, and only while there is something to pay
    payment_url: !staff && status === 'menunggu_pembayaran' ? r.payment_url : null,
    paid_at: r.paid_at,
    approved_at: r.approved_at,
    rejected_reason: r.rejected_reason,
    activated_at: r.activated_at,
    cancelled_at: r.cancelled_at,
    created_at: r.created_at,
    updated_at: r.updated_at,
    site_id: r.site_id !== undefined && r.site_id !== null ? Number(r.site_id) : null,
    // Domain berbayar & masa aktif (migrasi 026); pesanan lama: domain_price 0, tanggal NULL
    domain_price: num(r.domain_price ?? 0),
    domain_check: r.domain_check ?? null,
    invoice_number: r.paid_at !== null ? `INV-${r.order_number}` : null,
    service_started_at: r.service_started_at ?? null,
    service_expires_at: r.service_expires_at ?? null,
    domain_started_at: r.domain_started_at ?? null,
    domain_expires_at: r.domain_expires_at ?? null,
  };
  if (staff) out.user = { id: Number(r.user_id), name: r.user_name ?? null, email: r.user_email ?? null };
  return out;
}

async function orderLogs(pool, orderId, staff) {
  const rows = await dbAll(pool, `SELECT l.*, u.name AS user_name FROM template_order_logs l
                                  LEFT JOIN users u ON u.id = l.actor_id AND l.actor_type IN ('staff', 'customer')
                                  WHERE l.order_id = ? ORDER BY l.created_at ASC, l.id ASC`, [orderId]);
  const names = { midtrans: 'Midtrans', system: 'Sistem' };
  return rows.map((r) => {
    let actorName = names[r.actor_type] ?? r.user_name;
    if (r.actor_type === 'staff' && !staff) actorName = 'Tim Garuda Nexa';
    // Customers only get the rejection reason and the server-written renewal / add-on notes; other notes are internal
    // (admin notes, Midtrans/test-mode details)
    const note = staff || CUSTOMER_NOTE_EVENTS.includes(r.event) ? r.note : null;
    const log = {
      id: Number(r.id),
      event: r.event,
      from_status: r.from_status,
      to_status: r.to_status,
      actor_type: r.actor_type,
      actor_name: actorName,
      note,
      created_at: r.created_at,
    };
    if (staff) log.payload = r.payload !== null ? parseJson(r.payload) : null;
    return log;
  });
}

export function siteSelect(withContent = true) {
  return `SELECT s.id, s.order_id, s.user_id, s.template_id, s.template_code, s.domain, s.status, s.activated_at, s.updated_at, ${
    withContent ? 's.content' : 'NULL AS content'
  }, o.order_number, o.template_name, o.service_expires_at, o.domain_expires_at, u.name AS owner_name, u.email AS owner_email
            FROM template_sites s
            JOIN template_orders o ON o.id = s.order_id
            LEFT JOIN users u ON u.id = s.user_id`;
}

async function customerSite(ctx, user, siteId) {
  const row = siteId > 0 ? await dbOne(ctx.pool, `${siteSelect()} WHERE s.id = ? AND s.user_id = ? LIMIT 1`, [siteId, user.id]) : null;
  if (!row) throw new ApiError('Situs tidak ditemukan.', 404, 'SITE_NOT_FOUND');
  return row;
}

function siteOut(r, staff) {
  const out = {
    id: Number(r.id),
    order_id: Number(r.order_id),
    order_number: r.order_number,
    user_id: Number(r.user_id),
    template_id: r.template_id === null ? null : Number(r.template_id),
    template_code: r.template_code,
    template_name: r.template_name,
    domain: r.domain,
    status: r.status,
    content: contentOut(r.content),
    activated_at: r.activated_at,
    updated_at: r.updated_at,
    // Masa aktif pesanan induk (migrasi 026)
    service_expires_at: r.service_expires_at ?? null,
    domain_expires_at: r.domain_expires_at ?? null,
  };
  if (staff) {
    out.owner_name = r.owner_name;
    out.owner_email = r.owner_email;
  }
  return out;
}

// Site for its owner (customer_get_site, customer_save_site_content): siteOut + addons (SiteAddonFlags: posts = news &
// announcements switched on) + posts_capable (the template has news & announcements; the add-on unlocks them). Same as
// pf_customer_site_out()
async function customerSiteOut(pool, r) {
  const out = siteOut(r, false);
  out.addons = await siteAddonFlags(pool, r);
  out.posts_capable = hasPosts(String(r.template_code));
  return out;
}

// Stored content as an object; NULL (or anything that is not a JSON object) = template default
function contentOut(json) {
  if (json === null || json === undefined || json === '') return null;
  const value = parseJson(json);
  return isObject(value) ? value : null;
}

function templateOut(r) {
  return {
    id: Number(r.id),
    slug: r.slug,
    name: r.name,
    category: r.category,
    short_description: r.short_description,
    description: r.description,
    features: jsonList(r.features),
    price: num(r.price),
    preview_image: r.preview_image,
    gallery: jsonList(r.gallery),
    template_code: r.template_code,
    demo_url: r.demo_url,
    status: r.status,
    sort_order: Math.trunc(Number(r.sort_order)),
    // Suka & dilihat (kartu katalog); 0 sebelum migrasi 013. Terjual hanya dihitung di daftar & detail publik.
    like_count: Math.trunc(Number(r.like_count ?? 0)),
    view_count: Math.trunc(Number(r.view_count ?? 0)),
    sold_count: Math.trunc(Number(r.sold_count ?? 0)),
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Site content (CMS)
// ════════════════════════════════════════════════════════════════════════════

// Validates the content tree (from phpJsonDecode) and swaps every data: URI for a placeholder; `images` collects
// the uploads. Objects = sections/items as Maps (keys [A-Za-z0-9_-], checked in the order the client sent them,
// like get_object_vars in PHP), arrays = lists, scalars = field values.
function walkContent(node, depth, images) {
  if (depth > 6) throw new ApiError('Struktur konten terlalu dalam.', 400, 'INVALID_CONTENT');
  if (Array.isArray(node)) {
    if (node.length > 100) throw new ApiError('Satu daftar berisi maksimal 100 item.', 400, 'INVALID_CONTENT');
    return node.map((value) => walkContent(value, depth + 1, images));
  }
  if (node instanceof Map) {
    const out = new Map();
    for (const [key, value] of node) {
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(key) || ['__proto__', 'constructor', 'prototype'].includes(key)) {
        throw new ApiError(`Nama field konten tidak valid: ${mbSubstr(key, 0, 40)}`, 400, 'INVALID_CONTENT');
      }
      out.set(key, walkContent(value, depth + 1, images));
    }
    return out;
  }
  if (typeof node === 'string') {
    // [\t\n\v\f\r ] = PHP's \s; sizes in bytes like strlen()
    if (/^[\t\n\v\f\r ]*data:/i.test(node)) {
      if (images.size >= SITE_IMAGE_MAX_COUNT) {
        throw new ApiError(`Maksimal ${SITE_IMAGE_MAX_COUNT} gambar baru dalam sekali simpan.`, 400, 'INVALID_CONTENT');
      }
      const m = /^[\t\n\v\f\r ]*data:[^,]*;base64,/i.exec(node);
      if (!m || Buffer.byteLength(node, 'utf8') - Buffer.byteLength(m[0], 'utf8') > Math.ceil((SITE_IMAGE_MAX_BYTES * 4) / 3) + 4) {
        throw new ApiError('Ukuran gambar maksimal 2 MB.', 400, 'IMAGE_TOO_LARGE');
      }
      // Images only; throws UploadError (400) for anything else or an SVG with script
      const { ext } = parseUpload(phpTrim(node), { allowDocuments: false });
      // Customer uploads are served from the main origin: raster formats only (an SVG can carry script)
      if (!SITE_IMAGE_EXTS.includes(ext)) {
        throw new ApiError('Format gambar tidak didukung. Gunakan PNG, JPG, WEBP, atau GIF.', 400, 'INVALID_IMAGE');
      }
      const placeholder = `gn-upload-${images.size}-${crypto.randomBytes(8).toString('hex')}`;
      images.set(placeholder, { data: phpTrim(node), ext });
      return placeholder;
    }
    if ([...node].length > 20000) throw new ApiError('Teks konten terlalu panjang (maksimal 20.000 karakter per field).', 400, 'INVALID_CONTENT');
    return node;
  }
  // Infinite numbers pass here like floats in PHP; storing them fails later (see contentJson)
  if (node === null || typeof node === 'boolean' || typeof node === 'number') return node;
  throw new ApiError('Format konten tidak valid.', 400, 'INVALID_CONTENT');
}

// json_encode() of the walked content: objects keep the key order the client sent (JSON.stringify of a plain
// object would list integer-like keys first). Like json_encode() returning false in PHP, INF (a literal such as
// 1e999) cannot be stored.
function contentJson(node) {
  if (Array.isArray(node)) return `[${node.map(contentJson).join(',')}]`;
  if (node instanceof Map) {
    return `{${Array.from(node, ([key, value]) => `${JSON.stringify(key)}:${contentJson(value)}`).join(',')}}`;
  }
  if (typeof node === 'number' && !Number.isFinite(node)) {
    throw new ApiError('Format konten tidak valid.', 400, 'INVALID_CONTENT');
  }
  return JSON.stringify(node);
}

const assetsBase = () => `${String(S3_PUBLIC_URL).replace(/\/+$/, '')}/assets/`;

// Length of the URL uploadBase64ToS3(data, 'sites/<id>', 'img') returns: img_<13 digit ms>_<6 random>.<ext>
function sitePathLength(siteId, ext) {
  return `${assetsBase()}sites/${siteId}/img_${'0'.repeat(13)}_${'x'.repeat(6)}.${ext}`.length;
}

// Removes uploaded images of this site that the old content had and the saved content no longer references
async function cleanupSiteAssets(siteId, oldJson, newJson) {
  if (typeof oldJson !== 'string' || oldJson === '') return;
  const prefix = `${assetsBase()}sites/${siteId}/`;
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const found = new Set(oldJson.match(new RegExp(`${escaped}[A-Za-z0-9_-]+\\.[a-z0-9]+`, 'g')) || []);
  for (const url of found) {
    if (!String(newJson ?? '').includes(url)) await deleteFromS3(url.slice(assetsBase().length - 'assets/'.length));
  }
}

// Deletes a template image this backend uploaded (S3 URL under assets/<section>/); seed files and other URLs stay
async function deleteGenerated(path, section) {
  const prefix = `${assetsBase()}${section}/`;
  if (typeof path === 'string' && path.startsWith(prefix) && GENERATED_ASSET.test(path) && !path.slice(prefix.length).includes('/')) {
    await deleteFromS3(path.slice(assetsBase().length - 'assets/'.length));
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Small helpers: database, roles, validation, values
// ════════════════════════════════════════════════════════════════════════════

// Every value is bound; dates come back as 'YYYY-MM-DD HH:MM:SS' strings like mysqli
export async function dbRun(db, sql, params = []) {
  try {
    const [result] = await db.query({ sql, values: params, dateStrings: true });
    return result;
  } catch (err) {
    if (err && (err.code === 'ER_DUP_ENTRY' || err.errno === 1062)) throw new ApiError('Data yang sama sudah ada (duplikat).', 409);
    throw err;
  }
}

export async function dbAll(db, sql, params = []) {
  return dbRun(db, sql, params);
}

export async function dbOne(db, sql, params = []) {
  const rows = await dbRun(db, sql, params);
  return rows[0] || null;
}

export function requireCustomer(user) {
  if (!user) throw new ApiError('Silakan masuk terlebih dahulu.', 401, 'UNAUTHORIZED');
  if (user.role !== 'customer') throw new ApiError('Akses ditolak: aksi ini khusus akun pembeli.', 403, 'FORBIDDEN');
  return { ...user, id: Number(user.id) };
}

export function requireStaff(user) {
  if (!user) throw new ApiError('Sesi tidak valid atau sudah berakhir. Silakan login kembali.', 401, 'UNAUTHORIZED');
  if (user.role !== 'admin' && user.role !== 'user') throw new ApiError('Akses ditolak.', 403, 'FORBIDDEN');
  return { ...user, id: Number(user.id) };
}

// Throws one VALIDATION error carrying every field message ({error, code, errors: {field: message}})
export function validate(errors) {
  const keys = Object.keys(errors);
  if (keys.length) throw new ApiError(errors[keys[0]], 400, 'VALIDATION', errors);
}

export function tooManyAttempts(seconds) {
  throw new ApiError(`Terlalu banyak percobaan. Coba lagi dalam ${Math.max(1, Math.ceil(seconds / 60))} menit.`, 429, null, null,
    { 'Retry-After': String(seconds) });
}

// Trimmed text field; null when empty (and optional) or invalid (message in errors[key])
export function vStr(input, key, label, max, required, errors, min = 0) {
  const raw = input[key] ?? null;
  if (raw !== null && (typeof raw === 'object' || typeof raw === 'boolean')) {
    errors[key] = `${label} tidak valid.`;
    return null;
  }
  const value = phpTrim(raw === null ? '' : String(raw));
  if (value === '') {
    if (required) errors[key] = `${label} wajib diisi.`;
    return null;
  }
  const length = [...value].length;
  if (length > max) {
    errors[key] = `${label} maksimal ${max} karakter.`;
    return null;
  }
  if (length < min) {
    errors[key] = `${label} minimal ${min} karakter.`;
    return null;
  }
  return value;
}

// Same acceptance as PHP FILTER_VALIDATE_EMAIL for normal addresses (dot-atom local part, domain with a TLD)
const EMAIL_PATTERN = new RegExp(
  "^(?!\\.)(?!.*\\.\\.)[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]{1,64}(?<!\\.)@" +
  '(?:(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\\.)+(?=[A-Za-z0-9-]*[A-Za-z])[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?' +
  '|\\[(?:\\d{1,3}\\.){3}\\d{1,3}\\])$',
);

function vEmail(input, key, label, required, errors) {
  const value = vStr(input, key, label, 150, required, errors);
  if (value === null) return null;
  if (!EMAIL_PATTERN.test(value)) {
    errors[key] = 'Format email tidak valid, contoh: nama@email.com';
    return null;
  }
  return value.toLowerCase();
}

function vPhone(input, key, label, required, errors) {
  const value = vStr(input, key, label, 30, required, errors);
  if (value === null) return null;
  const normalized = value.replace(/[ \t\n\r\v\f().-]+/g, '');
  if (!/^\+?[0-9]{8,15}$/.test(normalized)) {
    errors[key] = `${label} tidak valid. Gunakan 8-15 digit angka, contoh: 081234567890.`;
    return null;
  }
  return normalized;
}

function vDomain(input, key, label, required, errors) {
  const value = vStr(input, key, label, 253, required, errors);
  if (value === null) return null;
  // ASCII only, like strtolower() in PHP (no Unicode folding such as the Kelvin sign to "k")
  const domain = value.replace(/[A-Z]+/g, (m) => m.toLowerCase());
  if (!DOMAIN_PATTERN.test(domain)) {
    errors[key] = 'Format domain tidak valid, contoh: namabisnis.com';
    return null;
  }
  return domain;
}

// List of non-empty strings (array, JSON array text or one item per line); null when invalid
function stringList(value, maxItems, maxLength) {
  if (typeof value === 'string') {
    const decoded = parseJson(value);
    value = Array.isArray(decoded) || isObject(decoded) ? decoded : value.split(/\r?\n/);
  }
  if (isObject(value)) value = Object.values(value);
  if (!Array.isArray(value)) return null;
  const list = [];
  for (const raw of value) {
    if (typeof raw !== 'string' && !(typeof raw === 'number' && Number.isFinite(raw))) return null;
    const item = phpTrim(String(raw));
    if (item === '') continue;
    if ([...item].length > maxLength) return null;
    list.push(item);
  }
  return list.length > maxItems ? null : list;
}

// Image value for templates: a new upload (data URI), a site path (/assets/...) or an http(s) URL
function isImageRef(value) {
  if (typeof value !== 'string') return false;
  return /^(data:image\/[a-z0-9.+-]+;base64,|\/(?!\/)\S+$|https?:\/\/\S+$)/i.test(value.trim());
}

function slugify(text) {
  const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
  return slug === '' || slug === '0' ? 'template' : slug;
}

function jsonList(value) {
  const list = typeof value === 'string' ? parseJson(value) : null;
  const items = Array.isArray(list) ? list : isObject(list) ? Object.values(list) : [];
  return items.filter((item) => typeof item === 'string');
}

// Rupiah as a JSON number: '1500000.00' -> 1500000
export function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

// Raw scalar as a string, untrimmed (Midtrans signs the exact values); '' for booleans/arrays/objects/missing like pf_scalar
export function rawScalar(input, key) {
  const value = input[key] ?? '';
  return isScalar(value) && typeof value !== 'boolean' ? String(value) : '';
}

const isScalar = (v) => typeof v === 'string' || typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v));
const scalarString = (v) => (v === true ? '1' : v === false ? '' : String(v));
export const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export function inStr(input, key, fallback = '') {
  const v = input[key];
  if (v === null || v === undefined) return String(fallback);
  if (typeof v === 'object') return JSON.stringify(v);
  if (typeof v === 'boolean') return v ? '1' : '0';
  return String(v);
}

// Integer input; like api.php's in_int it falls back to the query string
export function inInt(ctx, key, fallback = 0) {
  const v = ctx.input[key] ?? ctx.query[key] ?? null;
  return isNumeric(v) ? Math.trunc(Number(v)) : fallback;
}

function isNumeric(v) {
  if (typeof v === 'number') return Number.isFinite(v);
  return typeof v === 'string' && /^[ \t\n\r\v\f]*[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?[ \t\n\r\v\f]*$/.test(v);
}

// PHP trim(): only ASCII whitespace and NUL
export const phpTrim = (s) => String(s).replace(/^[ \t\n\r\0\x0B]+|[ \t\n\r\0\x0B]+$/g, '');

export const mbSubstr = (s, start, length) => [...String(s)].slice(start, start + length).join('');

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// PHP reads php://input as bytes: json_decode fails on invalid UTF-8 and on a BOM (express.json lets both through)
const UTF8_STRICT = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

// The POST body as api.php and templates.php decode it (json_decode of php://input, object mode), from the raw bytes
// server.js keeps in req.rawBody. undefined when there is no JSON body or PHP's json_decode fails on it.
function phpRequestBody(req) {
  if (!Buffer.isBuffer(req.rawBody)) return undefined;
  let text;
  try {
    text = UTF8_STRICT.decode(req.rawBody);
  } catch {
    return undefined;
  }
  return phpJsonDecode(text);
}

// json_decode($text) (object mode, default depth 512) that keeps the key order: objects become Maps, because a JS
// object lists integer-like keys ("0", "5") first while PHP keeps the order the client sent them in.
// undefined where PHP reports an error (JSON.parse never returns undefined).
function phpJsonDecode(text) {
  let value;
  try {
    value = JSON.parse(markKeys(text));
  } catch {
    return undefined;
  }
  return phpJsonValue(value, 0);
}

// Puts '#' in front of every object key (a string token followed by ':'), so no key is integer-like and JSON.parse
// keeps them in the order they were sent. It only adds characters inside strings: the text stays as valid (or as
// broken) as it was.
function markKeys(text) {
  const parts = [];
  let from = 0;
  let open = text.indexOf('"');
  while (open !== -1) {
    // The closing quote is the next '"' after an even number of backslashes
    let close = text.indexOf('"', open + 1);
    while (close !== -1 && backslashesBefore(text, close) % 2 === 1) close = text.indexOf('"', close + 1);
    if (close === -1) break; // unterminated string: JSON.parse rejects the text anyway
    let next = close + 1;
    let c = text.charCodeAt(next);
    while (c === 32 || c === 9 || c === 10 || c === 13) c = text.charCodeAt(++next); // JSON whitespace
    if (c === 58) { // ':'
      parts.push(text.slice(from, open + 1), '#');
      from = open + 1;
    }
    open = text.indexOf('"', close + 1);
  }
  parts.push(text.slice(from));
  return parts.join('');
}

function backslashesBefore(text, index) {
  let count = 0;
  while (text.charCodeAt(index - 1 - count) === 92) count++;
  return count;
}

// JSON.parse result of markKeys() text -> json_decode() result: objects become Maps with the '#' removed.
// undefined for what JSON.parse accepts but json_decode (object mode) refuses: 512 or more nested arrays/objects,
// unpaired UTF-16 surrogates (\ud800) and object keys that start with NUL.
function phpJsonValue(value, depth) {
  if (typeof value === 'string') return value.isWellFormed() ? value : undefined;
  if (value === null || typeof value !== 'object') return value;
  if (depth >= 511) return undefined;
  if (Array.isArray(value)) {
    const list = [];
    for (const item of value) {
      const decoded = phpJsonValue(item, depth + 1);
      if (decoded === undefined) return undefined;
      list.push(decoded);
    }
    return list;
  }
  const map = new Map();
  for (const marked of Object.keys(value)) {
    const key = marked.slice(1);
    if (!key.isWellFormed() || key.startsWith('\0')) return undefined;
    const decoded = phpJsonValue(value[marked], depth + 1);
    if (decoded === undefined) return undefined;
    map.set(key, decoded);
  }
  return map;
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function envValue(key, fallback = '') {
  const v = process.env[key];
  return v === undefined || v === '' ? fallback : v;
}

function clientIp(req) {
  return req.ip || req.socket?.remoteAddress || '';
}
