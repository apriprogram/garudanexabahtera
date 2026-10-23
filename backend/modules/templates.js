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
const SNAP_REUSE_HOURS = 23; // a Snap token lives 24 hours
// Names made by uploadBase64ToS3 (`<stem>_<ms timestamp>_<random>.<ext>`), never seed files
const GENERATED_ASSET = /_\d{13}_[a-z0-9]{1,6}\.[a-z0-9]+$/;
const GENERIC_ERROR = 'Terjadi kesalahan pada server. Silakan coba lagi.';

// Reads may use GET (query string) as well as POST; every other platform action is POST only
const GET_ACTIONS = new Set([
  'get_templates', 'get_template', 'get_public_projects', 'get_site_public', 'get_payment_config',
  'customer_get_orders', 'customer_get_order', 'customer_get_site', 'customer_get_order_quote',
  'admin_get_template_orders', 'admin_get_template_order', 'admin_get_templates', 'admin_get_active_sites',
  'admin_dashboard_summary',
]);

// Same limits as api.php: 5 per IP per hour, counted only after the input is valid
const customOrderLimiter = createLimiter(3600 * 1000, 5);
const customerRegisterLimiter = createLimiter(3600 * 1000, 5);
// Suka / dilihat di kartu template (sama dengan PF_LIKES_PER_HOUR / PF_VIEWS_PER_HOUR di templates.php)
const templateLikeLimiter = createLimiter(3600 * 1000, 60);
const templateViewLimiter = createLimiter(3600 * 1000, 300);
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
  template_like: templateLike,
  template_view: templateView,
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

// A live customer site, by id (/situs/:siteId) or by host name (SiteHostGate). Only status active.
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
  validate(errors);

  const template = await dbOne(pool, "SELECT * FROM templates WHERE id = ? AND status = 'published' LIMIT 1", [templateId]);
  if (!template) throw new ApiError('Template tidak ditemukan atau belum tersedia.', 404, 'TEMPLATE_NOT_FOUND');
  const pending = Number((await dbOne(pool, "SELECT COUNT(*) AS c FROM template_orders WHERE user_id = ? AND status = 'menunggu_pembayaran'", [user.id])).c);
  if (pending >= MAX_PENDING_ORDERS) {
    throw new ApiError(`Anda masih punya ${pending} pesanan yang belum dibayar. Selesaikan atau batalkan dulu sebelum memesan lagi.`, 409, 'TOO_MANY_PENDING');
  }

  // Harga yang dibayar = harga template dikurangi diskon pesanan pertama (bila berlaku); harga katalog tetap dicatat
  const quote = await firstOrderQuote(pool, Number(user.id), Number(template.price));
  let orderId = 0;
  for (let attempt = 0; attempt < 5 && !orderId; attempt++) {
    try {
      const result = await dbRun(pool, `INSERT INTO template_orders (order_number, user_id, template_id, template_name, template_code, price, list_price,
                                            discount_amount, discount_code, customer_name, customer_email, customer_phone, company_name, notes,
                                            domain_primary, domain_alternative)
                                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        newOrderNumber(), user.id, Number(template.id), template.name, template.template_code, quote.price,
        quote.list_price, quote.discount_amount, quote.discount_code,
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
  return { site: siteOut(await customerSite(ctx, user, inInt(ctx, 'site_id')), false) };
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
  return { site: siteOut(await customerSite(ctx, user, siteId), false) };
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
  return {
    order: orderOut(order, true),
    logs: await orderLogs(pool, Number(order.id), true),
    site: site ? siteOut(site, true) : null,
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
      if (!(await transition(conn, orderId, 'proses_domain', 'aktif', 'domain = ?, activated_at = NOW()', [domain]))) {
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
  const response = await midtransRequest('POST', cfg.snapUrl, cfg.serverKey, {
    transaction_details: { order_id: midtransOrderId, gross_amount: amount },
    item_details: [{
      id: `TPL-${order.template_id === null ? 0 : Number(order.template_id)}`,
      price: amount,
      quantity: 1,
      name: mbSubstr(order.template_name, 0, 50),
    }],
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
async function midtransExpire(order) {
  const cfg = midtransConfig();
  if (cfg.serverKey === '' || !order.midtrans_order_id || order.payment_status !== 'pending') return;
  const result = await midtransRequest('POST', `${cfg.apiBase}/v2/${encodeURIComponent(order.midtrans_order_id)}/expire`, cfg.serverKey, null, 5);
  if (result.code !== 200) console.error(`[midtrans] expire ${order.midtrans_order_id}: HTTP ${result.code} ${result.error}`);
}

function midtransConfig() {
  const flag = (key) => ['1', 'true', 'yes'].includes(envValue(key, '0').toLowerCase());
  const production = flag('MIDTRANS_IS_PRODUCTION');
  const clientKey = envValue('MIDTRANS_CLIENT_KEY');
  return {
    serverKey: envValue('MIDTRANS_SERVER_KEY'),
    clientKey: clientKey !== '' ? clientKey : null,
    isProduction: production,
    simulator: !production && flag('MIDTRANS_SIMULATOR'),
    snapUrl: production ? 'https://app.midtrans.com/snap/v1/transactions' : 'https://app.sandbox.midtrans.com/snap/v1/transactions',
    apiBase: production ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com',
  };
}

// HTTPS JSON request to Midtrans with Basic auth (server key). Never throws.
async function midtransRequest(method, url, serverKey, body, timeoutSeconds) {
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
function paymentPayload(data) {
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

function sameAmount(gross, price) {
  return isNumeric(gross) && Math.round(Number(gross)) === Math.round(Number(price));
}

function newOrderNumber() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) suffix += chars[crypto.randomInt(0, 36)];
  // Date in Asia/Jakarta (UTC+7, no daylight saving)
  const ymd = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, '');
  return `GN-${ymd}-${suffix}`;
}

async function addLog(db, orderId, event, from, to, actorType, actorId, note = null, payload = null) {
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
    // Customers only get the rejection reason; other notes are internal (admin notes, Midtrans/test-mode details)
    const note = staff || r.event === 'rejected' ? r.note : null;
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

function siteSelect(withContent = true) {
  return `SELECT s.id, s.order_id, s.user_id, s.template_id, s.template_code, s.domain, s.status, s.activated_at, s.updated_at, ${
    withContent ? 's.content' : 'NULL AS content'
  }, o.order_number, o.template_name, u.name AS owner_name, u.email AS owner_email
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
  };
  if (staff) {
    out.owner_name = r.owner_name;
    out.owner_email = r.owner_email;
  }
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
async function dbRun(db, sql, params = []) {
  try {
    const [result] = await db.query({ sql, values: params, dateStrings: true });
    return result;
  } catch (err) {
    if (err && (err.code === 'ER_DUP_ENTRY' || err.errno === 1062)) throw new ApiError('Data yang sama sudah ada (duplikat).', 409);
    throw err;
  }
}

async function dbAll(db, sql, params = []) {
  return dbRun(db, sql, params);
}

async function dbOne(db, sql, params = []) {
  const rows = await dbRun(db, sql, params);
  return rows[0] || null;
}

function requireCustomer(user) {
  if (!user) throw new ApiError('Silakan masuk terlebih dahulu.', 401, 'UNAUTHORIZED');
  if (user.role !== 'customer') throw new ApiError('Akses ditolak: aksi ini khusus akun pembeli.', 403, 'FORBIDDEN');
  return { ...user, id: Number(user.id) };
}

function requireStaff(user) {
  if (!user) throw new ApiError('Sesi tidak valid atau sudah berakhir. Silakan login kembali.', 401, 'UNAUTHORIZED');
  if (user.role !== 'admin' && user.role !== 'user') throw new ApiError('Akses ditolak.', 403, 'FORBIDDEN');
  return { ...user, id: Number(user.id) };
}

// Throws one VALIDATION error carrying every field message ({error, code, errors: {field: message}})
function validate(errors) {
  const keys = Object.keys(errors);
  if (keys.length) throw new ApiError(errors[keys[0]], 400, 'VALIDATION', errors);
}

function tooManyAttempts(seconds) {
  throw new ApiError(`Terlalu banyak percobaan. Coba lagi dalam ${Math.max(1, Math.ceil(seconds / 60))} menit.`, 429, null, null,
    { 'Retry-After': String(seconds) });
}

// Trimmed text field; null when empty (and optional) or invalid (message in errors[key])
function vStr(input, key, label, max, required, errors, min = 0) {
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
  const domain = value.toLowerCase();
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
function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

// Raw scalar as a string, untrimmed (Midtrans signs the exact values); '' for booleans/arrays/objects/missing like pf_scalar
function rawScalar(input, key) {
  const value = input[key] ?? '';
  return isScalar(value) && typeof value !== 'boolean' ? String(value) : '';
}

const isScalar = (v) => typeof v === 'string' || typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v));
const scalarString = (v) => (v === true ? '1' : v === false ? '' : String(v));
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function inStr(input, key, fallback = '') {
  const v = input[key];
  if (v === null || v === undefined) return String(fallback);
  if (typeof v === 'object') return JSON.stringify(v);
  if (typeof v === 'boolean') return v ? '1' : '0';
  return String(v);
}

// Integer input; like api.php's in_int it falls back to the query string
function inInt(ctx, key, fallback = 0) {
  const v = ctx.input[key] ?? ctx.query[key] ?? null;
  return isNumeric(v) ? Math.trunc(Number(v)) : fallback;
}

function isNumeric(v) {
  if (typeof v === 'number') return Number.isFinite(v);
  return typeof v === 'string' && /^[ \t\n\r\v\f]*[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?[ \t\n\r\v\f]*$/.test(v);
}

// PHP trim(): only ASCII whitespace and NUL
const phpTrim = (s) => String(s).replace(/^[ \t\n\r\0\x0B]+|[ \t\n\r\0\x0B]+$/g, '');

const mbSubstr = (s, start, length) => [...String(s)].slice(start, start + length).join('');

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

function envValue(key, fallback = '') {
  const v = process.env[key];
  return v === undefined || v === '' ? fallback : v;
}

function clientIp(req) {
  return req.ip || req.socket?.remoteAddress || '';
}
