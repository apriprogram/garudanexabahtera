// Fitur tambahan berbayar per situs pembeli (docs/platform/SITE-ADDONS-SPEC.md) for backend/server.js. Saat ini satu fitur:
// Berita & Pengumuman (kode posts) untuk template sekolah (POST_TEMPLATE_CODES, site_posts.js). Saat template dibeli
// fitur ini terkunci; pembeli membelinya di /akun/fitur (Midtrans, nomor tagihan GNF-YYYYMMDD-XXXXXX, order id Midtrans
// {addon_number}-{percobaan} seperti perpanjangan GNR-), dan setelah lunas fitur langsung aktif. Tabel site_addon_orders
// (database/migrations/2026-10-27_030_site_addons.sql). JSON shapes = src/types/siteAddons.ts (SiteAddonOrder,
// SiteAddonState, SiteAddonSite, SiteAddonsResponse, SiteAddonFlags).
// backend/modules/site_addons.php implements the same actions for the PHP backend: keep both identical (action names,
// input validation, messages, JSON shapes, HTTP status codes and `code` values); __tests__/backend/site-addons.test.ts
// runs both.
//
// server.js calls handleSiteAddonAction() in its /api.php GET and POST handlers, after the access check (createAuthGate in
// security.js sets req.user): the customer_* actions and dev_simulate_site_addon_payment are in CUSTOMER_ACTIONS,
// admin_set_site_addon in ADMIN_ACTIONS; the handlers re-check the role (requireCustomer / requireStaff). Dipakai juga oleh
// modul lain:
// - gerbang tulisan: addonActive() / postsEnabled() di site_posts.js (aksi tulisan pembeli & publik) dan templates.js
//   (get_site_public, customer_get_site);
// - pembayaran: midtransNotification (templates.js) meneruskan order id GNF-… ke addonNotification();
// - nota & panel admin: addonInvoiceItems(), customerAddonInvoice(), orderAddons() (templates.js).
// Tabel belum ada (errno 1146, migrasi 030 belum dijalankan) = tidak ada fitur aktif, bacaan tetap jalan; aksi yang
// menulis menjawab 503 ADDONS_NOT_READY, tidak pernah 500.
// Helper Midtrans, log, nomor tagihan, validasi dan database berasal dari templates.js (fungsi yang sama dengan pf_* yang
// dipanggil site_addons.php). Impor melingkar templates.js ↔ site_addons.js ↔ site_posts.js aman: impor hanya dipakai di
// dalam fungsi, tidak saat modul dievaluasi.
import { createLimiter } from '../security.js';
import { hasPosts } from './site_posts.js';
import {
  ApiError, INVOICE_NOT_AVAILABLE_MESSAGE, SNAP_REUSE_HOURS, addLog, dbAll, dbOne, dbRun, envValue, inInt, inStr, isObject, mbSubstr,
  midtransConfig, midtransExpire, midtransRequest, newOrderNumber, num, paymentPayload, phpTrim, rawScalar, requireCustomer,
  requireStaff, sameAmount, siteSelect, tooManyAttempts, validate, vStr,
} from './templates.js';

const CODES = ['posts'];
// Nama tampilan per kode fitur = SITE_ADDON_NAME (src/types/siteAddons.ts)
const NAME = { posts: 'Berita & Pengumuman' };
const STATUS_LABEL = {
  menunggu_pembayaran: 'Menunggu Pembayaran',
  lunas: 'Lunas',
  dibatalkan: 'Dibatalkan',
};
// Harga sekali bayar: setting hero_settings (publik lewat get_settings, dipakai halaman Harga); kosong, tidak valid, atau
// 0 → bawaan. Sama dengan ADDON_POSTS_PRICE_SETTING / ADDON_POSTS_PRICE_DEFAULT (src/types/siteAddons.ts)
export const ADDON_PRICE_SETTING = Object.freeze({ posts: 'addon_posts_price' });
export const ADDON_PRICE_DEFAULT = Object.freeze({ posts: 350000 });
const PAYS_PER_HOUR = 20; // beli / bayar / batal per pengguna per jam
const NO_TABLE = 1146; // MySQL ER_NO_SUCH_TABLE
const ORDER_BY = ' ORDER BY a.created_at DESC, a.id DESC';
const GENERIC_ERROR = 'Terjadi kesalahan pada server. Silakan coba lagi.';

const NOT_READY_MESSAGE = 'Fitur tambahan belum siap. Coba lagi nanti.';
const NOT_FOUND_MESSAGE = 'Tagihan fitur tidak ditemukan.';
const ADDON_MESSAGE = 'Pilih fitur tambahan yang tersedia.';
const ACTIVE_FLAG_MESSAGE = 'Pilih aktifkan atau nonaktifkan fitur.';
const UNAVAILABLE_MESSAGE = 'Fitur ini hanya untuk template sekolah.';
const ACTIVE_MESSAGE = 'Fitur ini sudah aktif di situs Anda.';
const PENDING_MESSAGE = 'Masih ada tagihan fitur ini yang menunggu pembayaran. Bayar atau batalkan dulu.';
const SITE_SUSPENDED_MESSAGE = 'Situs sedang dinonaktifkan sehingga fitur tambahan tidak bisa dibeli. Hubungi kami.';
const FREE_INVOICE_MESSAGE = 'Fitur ini diaktifkan tanpa biaya sehingga tidak ada nota.';

// Baca boleh lewat GET (query string) maupun POST; aksi lain hanya POST
const GET_ACTIONS = new Set(['customer_get_site_addons']);

const payLimiter = createLimiter(3600 * 1000, PAYS_PER_HOUR);

const HANDLERS = Object.freeze({
  // pembeli (CUSTOMER_ACTIONS): hanya situs & tagihan miliknya
  customer_get_site_addons: customerGetSiteAddons,
  customer_buy_site_addon: customerBuySiteAddon,
  customer_pay_site_addon: customerPaySiteAddon,
  customer_cancel_site_addon: customerCancelSiteAddon,
  dev_simulate_site_addon_payment: devSimulateSiteAddonPayment,
  // admin (ADMIN_ACTIONS): aktifkan gratis / nonaktifkan
  admin_set_site_addon: adminSetSiteAddon,
});

export const SITE_ADDON_ACTIONS = Object.freeze(Object.keys(HANDLERS));

/**
 * Menjalankan aksi fitur tambahan. false bila `action` bukan milik modul ini (server.js lanjut), true bila jawaban sudah
 * dikirim. Tidak pernah melempar: setiap galat menjadi jawaban JSON. Nama aksi di-trim seperti actionOf() di security.js.
 */
export async function handleSiteAddonAction(action, params, req, res, pool) {
  const name = typeof action === 'string' ? action.trim() : '';
  if (!Object.hasOwn(HANDLERS, name)) return false;
  try {
    if (req.method !== 'POST' && !GET_ACTIONS.has(name)) {
      throw new ApiError('Gunakan metode POST untuk aksi ini.', 405, 'METHOD_NOT_ALLOWED');
    }
    const ctx = { pool, req, input: isObject(params) ? params : {}, query: req.query || {}, user: req.user || null };
    let data;
    try {
      data = await HANDLERS[name](ctx);
    } catch (err) {
      // Migrasi 030 belum dijalankan: jawaban yang jelas, bukan 500
      throw missingTable(err) ? notReady() : err;
    }
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
    // Pesan 5xx yang disengaja (belum siap, pembayaran belum dikonfigurasi) tidak boleh ditutupi maskServerErrors
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
// Gerbang (dipakai site_posts.js dan templates.js)
// ════════════════════════════════════════════════════════════════════════════

/** Situs punya fitur `code` yang aktif: baris lunas yang tidak dicabut. Tabel belum ada = tidak aktif. */
export async function addonActive(pool, siteId, code) {
  try {
    return (await dbOne(pool, `SELECT 1 AS active FROM site_addon_orders WHERE site_id = ? AND addon_code = ? AND status = 'lunas'
                              AND revoked_at IS NULL LIMIT 1`, [siteId, code])) !== null;
  } catch (err) {
    if (!missingTable(err)) throw err;
    return false;
  }
}

/** Tulisan aktif: template situs mampu (template sekolah) dan fitur Berita & Pengumuman aktif. site: id, template_code. */
export async function postsEnabled(pool, site) {
  return hasPosts(String(site.template_code)) && addonActive(pool, Number(site.id), 'posts');
}

/** SiteAddonFlags untuk get_site_public dan customer_get_site. */
export async function siteAddonFlags(pool, site) {
  return { posts: await postsEnabled(pool, site) };
}

// ════════════════════════════════════════════════════════════════════════════
// Pembeli (CUSTOMER_ACTIONS; halaman /akun/fitur)
// ════════════════════════════════════════════════════════════════════════════

// Semua situs milik pembeli (status apa pun) dengan keadaan fiturnya, terbaru dulu; site_id = situs itu saja:
// SiteAddonsResponse. Tabel belum ada = semua fitur terkunci, tanpa tagihan.
async function customerGetSiteAddons(ctx) {
  const { pool } = ctx;
  const user = requireCustomer(ctx.user);
  const one = phpTrim(inStr(ctx.input, 'site_id')) !== '';
  const params = [user.id];
  if (one) params.push(inInt(ctx, 'site_id'));
  const sites = await dbAll(pool, `${siteSelect(false)} WHERE s.user_id = ?${one ? ' AND s.id = ?' : ''} ORDER BY s.activated_at DESC, s.id DESC`, params);
  if (one && !sites.length) throw new ApiError('Situs tidak ditemukan.', 404, 'SITE_NOT_FOUND');
  const rows = await rowsOrEmpty(pool, `${addonSelect()} WHERE s.user_id = ?${one ? ' AND a.site_id = ?' : ''}${ORDER_BY}`, params);
  const prices = await addonPrices(pool);
  const bySite = new Map();
  for (const r of rows) {
    const key = Number(r.site_id);
    if (!bySite.has(key)) bySite.set(key, []);
    bySite.get(key).push(r);
  }
  return {
    sites: sites.map((s) => siteAddonOut(s, bySite.get(Number(s.id)) ?? [], prices, false)),
    price: prices,
  };
}

// Tagihan baru untuk satu fitur satu situs: { addon_order, payment_url, payment_error? }. Harga = setting saat ini
// (disimpan di baris). Midtrans belum dikonfigurasi: tagihan tetap dibuat, payment_url null + payment_error.
async function customerBuySiteAddon(ctx) {
  const { pool } = ctx;
  const user = requireCustomer(ctx.user);
  countPay(user);
  const errors = {};
  const code = codeInput(ctx.input, errors);
  validate(errors);
  const site = await customerSite(ctx, user);
  if (site.status !== 'active') throw new ApiError(SITE_SUSPENDED_MESSAGE, 409, 'SITE_SUSPENDED');
  if (!capable(code, site)) throw new ApiError(UNAVAILABLE_MESSAGE, 403, 'ADDON_UNAVAILABLE');
  const siteId = Number(site.id);
  await assertCanBuy(pool, siteId, code);
  const price = await addonPrice(pool, code);

  let id = 0;
  for (let attempt = 0; attempt < 5 && !id; attempt++) {
    try {
      const result = await dbRun(pool, `INSERT INTO site_addon_orders (addon_number, site_id, order_id, user_id, addon_code, price, pending_key, source)
                                        VALUES (?, ?, ?, ?, ?, ?, ?, 'beli')`, [
        newOrderNumber('GNF'), siteId, Number(site.order_id), user.id, code, price, `${siteId}:${code}`,
      ]);
      id = Number(result.insertId);
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 409) throw err;
      await assertCanBuy(pool, siteId, code); // permintaan bersamaan membuka tagihan lebih dulu (uq_addon_pending)
      if (attempt === 4) throw err; // nomor tagihan bentrok: undi nomor baru
    }
  }
  const row = await addonById(pool, id);
  await addLog(pool, Number(row.order_id), 'addon_created', null, null, 'customer', user.id, `${label(row)} dipesan, menunggu pembayaran.`);
  const result = await createAddonSnap(pool, row);
  const out = { addon_order: addonOrderOut(await addonById(pool, id), false), payment_url: result.paymentUrl };
  if (result.error !== null) out.payment_error = result.error;
  return out;
}

// Halaman bayar Midtrans untuk tagihan yang menunggu pembayaran: { payment_url }. Halaman Snap yang masih berlaku dipakai lagi.
async function customerPaySiteAddon(ctx) {
  const { pool } = ctx;
  const user = requireCustomer(ctx.user);
  countPay(user);
  const row = await customerAddonRow(ctx, user);
  if (row.status !== 'menunggu_pembayaran') throw statusError(row.status);
  // Kartu yang ditahan untuk tinjauan fraud: membayar lagi membuat transaksi baru (risiko tertagih dua kali)
  if (row.payment_status === 'capture') {
    throw new ApiError('Pembayaran kartu Anda sedang ditinjau bank. Tidak perlu membayar ulang.', 409, 'PAYMENT_UNDER_REVIEW');
  }
  const cfg = midtransConfig();
  if (cfg.serverKey === '') throw new ApiError('Pembayaran online belum dikonfigurasi.', 503, 'PAYMENT_NOT_CONFIGURED');
  if (row.payment_url && row.payment_status === 'pending' && row.payment_age_minutes !== null
    && Number(row.payment_age_minutes) < SNAP_REUSE_HOURS * 60) {
    return { payment_url: row.payment_url };
  }
  const result = await createAddonSnap(pool, row);
  if (result.paymentUrl === null) throw new ApiError(result.error, 502, 'PAYMENT_GATEWAY_ERROR');
  return { payment_url: result.paymentUrl };
}

// Batalkan tagihan yang menunggu pembayaran: { addon_order }. Transaksi Snap yang masih terbuka dikedaluwarsakan.
async function customerCancelSiteAddon(ctx) {
  const { pool } = ctx;
  const user = requireCustomer(ctx.user);
  countPay(user);
  const row = await customerAddonRow(ctx, user);
  const id = Number(row.id);
  if (!(await addonTransition(pool, id, 'dibatalkan', 'cancelled_at = NOW()'))) throw statusError((await addonById(pool, id)).status);
  await addLog(pool, Number(row.order_id), 'addon_cancelled', null, null, 'customer', user.id, `${label(row)} dibatalkan.`);
  await midtransExpire(row);
  return { addon_order: addonOrderOut(await addonById(pool, id), false) };
}

// Hasil yang sama dengan settlement Midtrans (uji lokal tanpa Midtrans, MIDTRANS_SIMULATOR=1): { addon_order, site }
async function devSimulateSiteAddonPayment(ctx) {
  const { pool } = ctx;
  const user = requireCustomer(ctx.user);
  const cfg = midtransConfig();
  if (!cfg.simulator) throw new ApiError('Simulasi pembayaran tidak aktif.', 403, 'SIMULATOR_DISABLED');
  const row = await customerAddonRow(ctx, user);
  if (row.status !== 'menunggu_pembayaran') throw statusError(row.status);
  await applyAddonPayment(pool, row, 'settlement', 'accept', 'simulator', 'customer', user.id,
    { simulated: true, transaction_status: 'settlement' }, true, null, 'simulated');
  const siteId = Number(row.site_id);
  const site = await dbOne(pool, `${siteSelect(false)} WHERE s.id = ? LIMIT 1`, [siteId]);
  if (!site) throw new ApiError('Situs tidak ditemukan.', 404, 'SITE_NOT_FOUND');
  return {
    addon_order: addonOrderOut(await addonById(pool, Number(row.id)), false),
    site: siteAddonOut(site, await dbAll(pool, `${addonSelect()} WHERE a.site_id = ?${ORDER_BY}`, [siteId]), await addonPrices(pool), false),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Admin (ADMIN_ACTIONS; laci pesanan di panel admin)
// ════════════════════════════════════════════════════════════════════════════

// active=true: aktifkan gratis (baris source admin, harga 0; tagihan yang menunggu dibatalkan dulu). active=false:
// cabut semua baris lunas yang aktif (revoked_at; tanpa refund otomatis). { addons: SiteAddonState[] }
async function adminSetSiteAddon(ctx) {
  const { pool, input } = ctx;
  const user = requireStaff(ctx.user);
  const errors = {};
  const code = codeInput(input, errors);
  const active = flagOf(input.active ?? null);
  if (active === null) errors.active = ACTIVE_FLAG_MESSAGE;
  const note = vStr(input, 'note', 'Catatan', 255, false, errors);
  validate(errors);
  const siteId = inInt(ctx, 'site_id');
  const site = siteId > 0 ? await dbOne(pool, `${siteSelect(false)} WHERE s.id = ? LIMIT 1`, [siteId]) : null;
  if (!site) throw new ApiError('Situs tidak ditemukan.', 404, 'SITE_NOT_FOUND');
  if (!capable(code, site)) throw new ApiError(UNAVAILABLE_MESSAGE, 403, 'ADDON_UNAVAILABLE');
  const orderId = Number(site.order_id);
  const staffId = user.id;
  const suffix = note !== null ? ` Catatan: ${note}` : '';
  const rows = codeRows(await dbAll(pool, `${addonSelect()} WHERE a.site_id = ?${ORDER_BY}`, [siteId]), code);

  if (active) {
    const isActive = rows.some((r) => r.status === 'lunas' && r.revoked_at === null);
    if (!isActive) {
      for (const r of rows) {
        if (r.status !== 'menunggu_pembayaran' || !(await addonTransition(pool, Number(r.id), 'dibatalkan', 'cancelled_at = NOW()'))) continue;
        await addLog(pool, orderId, 'addon_cancelled', null, null, 'staff', staffId, `${label(r)} dibatalkan karena fitur diaktifkan oleh tim.`);
        await midtransExpire(r);
      }
      let id = 0;
      for (let attempt = 0; attempt < 5 && !id; attempt++) {
        try {
          const result = await dbRun(pool, `INSERT INTO site_addon_orders (addon_number, site_id, order_id, user_id, addon_code, price, status, source,
                                                payment_status, payment_type, paid_at, granted_by, note)
                                            VALUES (?, ?, ?, ?, ?, 0, 'lunas', 'admin', 'settlement', 'gratis', NOW(), ?, ?)`, [
            newOrderNumber('GNF'), siteId, orderId, Number(site.user_id), code, staffId, note ?? '',
          ]);
          id = Number(result.insertId);
        } catch (err) {
          if (!(err instanceof ApiError) || err.status !== 409 || attempt === 4) throw err; // nomor tagihan bentrok: undi nomor baru
        }
      }
      await addLog(pool, orderId, 'addon_granted', null, null, 'staff', staffId, `${label(await addonById(pool, id))} diaktifkan gratis oleh tim.${suffix}`);
    }
  } else {
    for (const r of rows) {
      if (r.status !== 'lunas' || r.revoked_at !== null) continue;
      const result = await dbRun(pool, "UPDATE site_addon_orders SET revoked_at = NOW() WHERE id = ? AND status = 'lunas' AND revoked_at IS NULL", [Number(r.id)]);
      if (Number(result.affectedRows) > 0) await addLog(pool, orderId, 'addon_revoked', null, null, 'staff', staffId, `${label(r)} dinonaktifkan oleh tim.${suffix}`);
    }
  }
  const fresh = await dbAll(pool, `${addonSelect()} WHERE a.site_id = ?${ORDER_BY}`, [siteId]);
  return { addons: [addonState(code, site, fresh, await addonPrice(pool, code), true)] };
}

// ════════════════════════════════════════════════════════════════════════════
// Nota & panel admin (dipanggil templates.js); tabel belum ada = tanpa fitur, tidak pernah 500
// ════════════════════════════════════════════════════════════════════════════

/** Item nota (customer_get_invoices) untuk fitur yang lunas dan berbayar milik pembeli. */
export async function addonInvoiceItems(pool, userId) {
  const rows = await rowsOrEmpty(pool, `${addonSelect()} WHERE o.user_id = ? AND a.status = 'lunas' AND a.price > 0`, [userId]);
  return rows.map((r) => ({
    type: 'fitur',
    invoice_number: `INV-${r.addon_number}`,
    order_number: r.order_number,
    renewal_number: null,
    addon_number: r.addon_number,
    title: `Fitur ${addonName(r.addon_code)}`,
    domain: r.site_domain ?? '',
    years: null,
    amount: num(r.price),
    paid_at: r.paid_at,
    payment_status: r.payment_status,
    payment_type: r.payment_type,
    order_status: null,
  }));
}

/** Tagihan fitur pesanan ini untuk nota (customer_get_invoice addon_number): hanya lunas dan berbayar; dicabut tetap boleh. */
export async function customerAddonInvoice(pool, order, number) {
  const rows = await rowsOrEmpty(pool, `${addonSelect()} WHERE a.addon_number = ? AND a.order_id = ? LIMIT 1`, [number, Number(order.id)]);
  if (!rows.length) throw notFound();
  const row = rows[0];
  if (row.status !== 'lunas') throw new ApiError(INVOICE_NOT_AVAILABLE_MESSAGE, 409, 'INVOICE_NOT_AVAILABLE');
  if (Number(row.price) <= 0) throw new ApiError(FREE_INVOICE_MESSAGE, 409, 'INVOICE_NOT_AVAILABLE');
  return addonOrderOut(row, false);
}

/** admin_get_template_order: keadaan fitur situs pesanan ini (kosong tanpa situs) dan semua tagihannya, terbaru dulu. */
export async function orderAddons(pool, site, orderId) {
  const rows = await rowsOrEmpty(pool, `${addonSelect()} WHERE a.order_id = ?${ORDER_BY}`, [orderId]);
  const prices = await addonPrices(pool);
  return {
    addons: site ? CODES.map((code) => addonState(code, site, rows, prices[code], true)) : [],
    addon_orders: rows.map((r) => addonOrderOut(r, true)),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Pembayaran (pola perpanjangan: renewalNotification / applyRenewalPayment di templates.js)
// ════════════════════════════════════════════════════════════════════════════

// Notifikasi Midtrans untuk GNF-… (tanda tangan sudah diperiksa midtransNotification): jumlah, konfirmasi Status API, lalu
// hasil pembayaran
export async function addonNotification(pool, cfg, input, orderId, gross) {
  let row;
  try {
    row = await dbOne(pool, `${addonSelect()} WHERE a.midtrans_order_id = ? LIMIT 1`, [orderId]);
    // \n? mirrors PHP preg_match, whose $ also matches before a final newline
    const m = /^(GNF-\d{8}-[A-Z0-9]{6})-(\d+)\n?$/.exec(orderId);
    if (!row && m) {
      row = await dbOne(pool, `${addonSelect()} WHERE a.addon_number = ? AND a.payment_attempt >= ? LIMIT 1`, [m[1], Number(m[2])]);
    }
  } catch (err) {
    throw missingTable(err) ? notReady() : err; // Midtrans mengulang notifikasi yang gagal
  }
  if (!row) throw notFound();
  const payload = paymentPayload(input);
  if (!sameAmount(gross, row.price)) {
    await addLog(pool, Number(row.order_id), 'addon_payment_update', null, null, 'midtrans', null,
      `Notifikasi ${lowerLabel(row)} ditolak: jumlah pembayaran (${gross}) tidak sama dengan tagihan.`, payload);
    throw new ApiError('Jumlah pembayaran tidak sesuai.', 400, 'AMOUNT_MISMATCH');
  }
  let tx = rawScalar(input, 'transaction_status');
  let fraud = rawScalar(input, 'fraud_status');
  let paymentType = rawScalar(input, 'payment_type');
  // Konfirmasi lewat Status API; notifikasinya sendiri bertanda tangan, jadi dipakai bila API tidak bisa dihubungi
  const check = await midtransRequest('GET', `${cfg.apiBase}/v2/${encodeURIComponent(orderId)}/status`, cfg.serverKey, null, 10);
  const body = check.body;
  if (check.code === 200 && isObject(body) && body.transaction_status != null && String(body.order_id ?? '') === orderId) {
    if (body.gross_amount != null && !sameAmount(String(body.gross_amount), row.price)) {
      await addLog(pool, Number(row.order_id), 'addon_payment_update', null, null, 'midtrans', null,
        `Status API: jumlah pembayaran ${lowerLabel(row)} tidak sama dengan tagihan.`, paymentPayload(body));
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
  const isCurrent = row.midtrans_order_id === orderId
    || (row.midtrans_order_id === null && orderId === `${row.addon_number}-${row.payment_attempt}`);
  await applyAddonPayment(pool, row, tx, fraud, paymentType !== '' ? paymentType : null, 'midtrans', null, payload, isCurrent, orderId);
}

// Satu tempat untuk setiap hasil pembayaran fitur (notifikasi Midtrans dan dev_simulate_site_addon_payment), sama dengan
// sa_apply_payment():
//   settlement / capture+accept -> lunas, fitur langsung aktif (UPDATE bersyarat dari menunggu_pembayaran)
//   deny / cancel / expire / failure -> tagihan TETAP menunggu pembayaran (pembeli bisa bayar ulang); payment_status
//     percobaan saat ini diperbarui
//   capture (ditinjau) -> payment_status capture (customer_pay_site_addon menjawab PAYMENT_UNDER_REVIEW)
//   pending -> tidak berubah; refund* / chargeback -> dicatat saja (fitur tidak dicabut otomatis)
// paymentOrderId = order id Midtrans notifikasi (null untuk simulator). Bayar setelah dibatalkan atau bayar dobel tidak
// mengaktifkan dua kali: dicatat untuk tim ("perlu refund manual").
async function applyAddonPayment(pool, row, tx, fraud, paymentType, actorType, actorId, payload, isCurrentAttempt, paymentOrderId,
  storedStatus = null) {
  const id = Number(row.id);
  const orderId = Number(row.order_id);
  tx = String(tx).toLowerCase();
  fraud = String(fraud).toLowerCase();
  const paid = tx === 'settlement' || (tx === 'capture' && fraud === 'accept');
  const reversal = tx.includes('refund') || tx === 'chargeback' || tx === 'partial_chargeback';
  const payingAttempt = paymentOrderId !== null && paymentOrderId === row.paid_midtrans_order_id;

  let paymentChanged = false;
  const touch = row.status === 'menunggu_pembayaran'
    ? isCurrentAttempt || paid
    : row.status === 'lunas' && payingAttempt && reversal;
  if (touch) {
    const newStatus = storedStatus ?? (tx !== '' ? tx : 'pending');
    paymentChanged = row.payment_status !== newStatus || (paymentType !== null && row.payment_type !== paymentType);
    if (paymentChanged) {
      await dbRun(pool, 'UPDATE site_addon_orders SET payment_status = ?, payment_type = COALESCE(?, payment_type) WHERE id = ?',
        [mbSubstr(newStatus, 0, 30), paymentType === null ? null : mbSubstr(paymentType, 0, 40), id]);
    }
  }

  let note = null;
  if (paid) {
    if (await addonTransition(pool, id, 'lunas', 'paid_at = NOW(), paid_midtrans_order_id = ?', [paymentOrderId])) {
      await addLog(pool, orderId, 'addon_paid', null, null, actorType, actorId, `${label(row)} lunas. Fitur sudah aktif di situs Anda.`, payload);
      return;
    }
    // Tidak dilunasi notifikasi ini: putuskan dari baris terbaru (batal atau pembayaran lain baru saja menang)
    const fresh = await addonById(pool, id);
    if (fresh.status === 'dibatalkan' && fresh.paid_at === null) {
      note = `Pembayaran ${lowerLabel(row)} diterima, tetapi tagihannya sudah dibatalkan. Perlu ditindaklanjuti manual (refund).`;
    } else if (fresh.status === 'lunas' && paymentOrderId !== null && fresh.paid_midtrans_order_id !== null
      && paymentOrderId !== fresh.paid_midtrans_order_id) {
      note = `Pembayaran ganda ${lowerLabel(row)} (${paymentOrderId}); sudah lunas lewat ${fresh.paid_midtrans_order_id}. Perlu ditindaklanjuti manual (refund).`;
    }
  } else if (reversal) {
    note = `Refund/chargeback ${lowerLabel(row)} tercatat (${tx}); fitur tidak dinonaktifkan otomatis.`;
  } else if (tx === 'capture') {
    note = `Pembayaran kartu ${lowerLabel(row)} menunggu tinjauan fraud (${fraud !== '' ? fraud : '-'}).`;
  }
  // Notifikasi ganda tidak mengubah apa pun dan tidak dicatat lagi
  if (paymentChanged || note !== null) {
    await addLog(pool, orderId, 'addon_payment_update', null, null, actorType, actorId,
      note ?? `Status pembayaran ${lowerLabel(row)}: ${tx !== '' ? tx : '-'}`, payload);
  }
}

// Meninggalkan menunggu_pembayaran (hanya dari sana) dan membebaskan slot tagihan terbuka situs ini (pending_key)
async function addonTransition(pool, id, to, extraSet, extraParams = []) {
  const result = await dbRun(pool, `UPDATE site_addon_orders SET status = ?, pending_key = NULL, ${extraSet} WHERE id = ? AND status = 'menunggu_pembayaran'`,
    [to, ...extraParams, id]);
  return Number(result.affectedRows) > 0;
}

// Transaksi Snap baru (percobaan + 1): satu item ADDON-{kode}. { paymentUrl, error }
async function createAddonSnap(pool, row) {
  const cfg = midtransConfig();
  if (cfg.serverKey === '') return { paymentUrl: null, error: 'Pembayaran online belum dikonfigurasi.' };
  const id = Number(row.id);
  const attempt = Number(row.payment_attempt) + 1;
  // Klaim nomor percobaan dulu: order id Midtrans tidak boleh dipakai ulang, juga setelah timeout
  const claim = await dbRun(pool, "UPDATE site_addon_orders SET payment_attempt = ? WHERE id = ? AND payment_attempt = ? AND status = 'menunggu_pembayaran'",
    [attempt, id, attempt - 1]);
  if (Number(claim.affectedRows) === 0) return snapBusy(pool, id);

  const midtransOrderId = `${row.addon_number}-${attempt}`;
  const amount = Math.round(Number(row.price));
  const appUrl = envValue('APP_URL', 'http://localhost:5173').replace(/\/+$/, '');
  const response = await midtransRequest('POST', cfg.snapUrl, cfg.serverKey, {
    transaction_details: { order_id: midtransOrderId, gross_amount: amount },
    item_details: [{
      id: `ADDON-${row.addon_code}`,
      price: amount,
      quantity: 1,
      name: mbSubstr(`Fitur ${addonName(row.addon_code)} ${row.site_domain ?? ''}`, 0, 50),
    }],
    customer_details: {
      first_name: mbSubstr(String(row.user_name ?? ''), 0, 50),
      email: row.user_email,
      phone: row.user_phone,
    },
    callbacks: { finish: `${appUrl}/akun/fitur` },
  }, 20);
  const body = response.body;
  if ((response.code !== 200 && response.code !== 201) || !isObject(body) || !body.token || !body.redirect_url) {
    const detail = isObject(body) && body.error_messages != null ? [].concat(body.error_messages).join('; ') : response.error;
    console.error(`[midtrans] Snap transaction failed for ${midtransOrderId}: HTTP ${response.code} ${detail}`);
    await addLog(pool, Number(row.order_id), 'addon_payment_update', null, null, 'system', null,
      mbSubstr(`Gagal membuat transaksi Midtrans ${lowerLabel(row)} (percobaan ${attempt}): HTTP ${response.code} ${detail}`, 0, 500));
    return { paymentUrl: null, error: 'Gagal membuat pembayaran online. Silakan coba lagi beberapa saat lagi.' };
  }
  // Hanya selama percobaan ini masih yang terbaru: percobaan lama yang lambat tidak pernah menggantikan yang baru
  const saved = await dbRun(pool, `UPDATE site_addon_orders SET midtrans_order_id = ?, snap_token = ?, payment_url = ?, payment_status = 'pending', payment_type = NULL,
                       payment_created_at = NOW() WHERE id = ? AND status = 'menunggu_pembayaran' AND payment_attempt = ?`,
  [midtransOrderId, String(body.token), String(body.redirect_url), id, attempt]);
  if (Number(saved.affectedRows) === 0) return snapBusy(pool, id);
  await addLog(pool, Number(row.order_id), 'addon_payment_created', null, null, 'system', null,
    `Tagihan ${lowerLabel(row)} dibuat (percobaan ${attempt}).`);
  return { paymentUrl: String(body.redirect_url), error: null };
}

/** Percobaan lain sedang/baru saja membuat halaman Snap: pakai halamannya bila tagihan masih menunggu pembayaran. */
async function snapBusy(pool, id) {
  const fresh = await addonById(pool, id);
  if (fresh.status === 'menunggu_pembayaran' && fresh.payment_url) return { paymentUrl: fresh.payment_url, error: null };
  return { paymentUrl: null, error: 'Pembayaran sedang diproses. Muat ulang halaman lalu coba lagi.' };
}

// ════════════════════════════════════════════════════════════════════════════
// Data, aturan & bentuk JSON (src/types/siteAddons.ts)
// ════════════════════════════════════════════════════════════════════════════

function addonSelect() {
  return `SELECT a.*, TIMESTAMPDIFF(MINUTE, a.payment_created_at, NOW()) AS payment_age_minutes, o.order_number,
                 s.domain AS site_domain, u.name AS user_name, u.email AS user_email, u.phone AS user_phone
            FROM site_addon_orders a
            JOIN template_orders o ON o.id = a.order_id
            LEFT JOIN template_sites s ON s.id = a.site_id
            LEFT JOIN users u ON u.id = a.user_id`;
}

/** dbAll yang menganggap tabel site_addon_orders yang belum ada sebagai tanpa baris (bacaan, tidak pernah 500). */
async function rowsOrEmpty(pool, sql, params) {
  try {
    return await dbAll(pool, sql, params);
  } catch (err) {
    if (!missingTable(err)) throw err;
    return [];
  }
}

async function addonById(pool, id) {
  const row = await dbOne(pool, `${addonSelect()} WHERE a.id = ? LIMIT 1`, [id]);
  if (!row) throw notFound();
  return row;
}

// Tagihan orang lain dijawab persis seperti tagihan yang tidak ada
async function customerAddonRow(ctx, user) {
  const number = phpTrim(inStr(ctx.input, 'addon_number')).toUpperCase();
  const row = number === '' ? null
    : await dbOne(ctx.pool, `${addonSelect()} WHERE a.addon_number = ? AND o.user_id = ? LIMIT 1`, [number, user.id]);
  if (!row) throw notFound();
  return row;
}

/** Situs milik pembeli tanpa kolom konten (customerSite di templates.js membaca konten sampai 512 KB). */
async function customerSite(ctx, user) {
  const siteId = inInt(ctx, 'site_id');
  const row = siteId > 0 ? await dbOne(ctx.pool, `${siteSelect(false)} WHERE s.id = ? AND s.user_id = ? LIMIT 1`, [siteId, user.id]) : null;
  if (!row) throw new ApiError('Situs tidak ditemukan.', 404, 'SITE_NOT_FOUND');
  return row;
}

/** Fitur sudah aktif → 409 ADDON_ACTIVE; ada tagihan menunggu pembayaran → 409 ADDON_PENDING. */
async function assertCanBuy(pool, siteId, code) {
  const rows = await dbAll(pool, `SELECT status FROM site_addon_orders WHERE site_id = ? AND addon_code = ?
                           AND (status = 'menunggu_pembayaran' OR (status = 'lunas' AND revoked_at IS NULL))`, [siteId, code]);
  if (rows.some((r) => r.status === 'lunas')) throw new ApiError(ACTIVE_MESSAGE, 409, 'ADDON_ACTIVE');
  if (rows.length) throw new ApiError(PENDING_MESSAGE, 409, 'ADDON_PENDING');
}

/** Batas beli/bayar/batal per pengguna (setiap percobaan dihitung, juga yang gagal). */
function countPay(user) {
  const key = `sa-pay|${user.id}`;
  const wait = payLimiter.retryAfter(key);
  if (wait) tooManyAttempts(wait);
  payLimiter.hit(key);
}

/** Kode fitur dari input `addon`; tidak dikenal → errors.addon dan null. */
function codeInput(input, errors) {
  const code = phpTrim(inStr(input, 'addon'));
  if (CODES.includes(code)) return code;
  errors.addon = ADDON_MESSAGE;
  return null;
}

/** true / 1 / "1" / "true" → true; false / 0 / "0" / "false" → false; selain itu null (sa_flag). */
function flagOf(value) {
  if (value === true || value === 1 || value === '1' || value === 'true') return true;
  if (value === false || value === 0 || value === '0' || value === 'false') return false;
  return null;
}

/** Template situs mendukung fitur ini (posts = template sekolah, hasPosts). */
const capable = (code, site) => code === 'posts' && hasPosts(String(site.template_code));

/** Harga sekali bayar dari setting; kosong, bukan angka, 0 atau terlalu besar → bawaan. Sama dengan sa_price(). */
async function addonPrice(pool, code) {
  const row = await dbOne(pool, 'SELECT setting_value FROM hero_settings WHERE setting_key = ? LIMIT 1', [ADDON_PRICE_SETTING[code]]);
  const raw = phpTrim(String(row?.setting_value ?? ''));
  const m = /^(\d+)(?:\.(\d)\d*)?$/.exec(raw);
  if (!m) return ADDON_PRICE_DEFAULT[code];
  // Dibulatkan dari teksnya (digit desimal pertama ≥ 5 → naik), tanpa float, supaya PHP, Node dan frontend sama persis
  const whole = m[1].replace(/^0+/, '');
  if (whole.length > 13) return ADDON_PRICE_DEFAULT[code];
  const value = Number(whole || '0') + (m[2] !== undefined && m[2] >= '5' ? 1 : 0);
  return value > 0 && value <= 1e12 ? value : ADDON_PRICE_DEFAULT[code];
}

/** Harga per kode fitur (SiteAddonsResponse.price). */
async function addonPrices(pool) {
  const prices = {};
  for (const code of CODES) prices[code] = await addonPrice(pool, code);
  return prices;
}

const addonName = (code) => (Object.hasOwn(NAME, code) ? NAME[code] : String(code));

/** "Fitur Berita & Pengumuman GNF-…" (awal kalimat catatan riwayat) */
const label = (row) => `Fitur ${addonName(row.addon_code)} ${row.addon_number}`;

/** "fitur Berita & Pengumuman GNF-…" (di tengah kalimat) */
const lowerLabel = (row) => `fitur ${addonName(row.addon_code)} ${row.addon_number}`;

const codeRows = (rows, code) => rows.filter((r) => r.addon_code === code);

const missingTable = (err) => Boolean(err) && (Number(err.errno) === NO_TABLE || err.code === 'ER_NO_SUCH_TABLE');

const notReady = () => new ApiError(NOT_READY_MESSAGE, 503, 'ADDONS_NOT_READY');

const notFound = () => new ApiError(NOT_FOUND_MESSAGE, 404, 'ADDON_NOT_FOUND');

const statusError = (status) => new ApiError(`Tagihan fitur ini berstatus "${STATUS_LABEL[status] ?? status}".`, 409, 'INVALID_STATUS');

/** SiteAddonOrder dari baris addonSelect(). payment_url hanya untuk pemilik dan hanya selama menunggu pembayaran. */
export function addonOrderOut(r, staff) {
  const status = r.status;
  return {
    addon_number: r.addon_number,
    site_id: Number(r.site_id),
    order_number: r.order_number,
    addon_code: r.addon_code,
    price: num(r.price),
    status,
    status_label: STATUS_LABEL[status] ?? status,
    source: r.source,
    payment_status: r.payment_status,
    payment_type: r.payment_type,
    payment_url: !staff && status === 'menunggu_pembayaran' ? r.payment_url : null,
    paid_at: r.paid_at,
    cancelled_at: r.cancelled_at,
    revoked_at: r.revoked_at,
    created_at: r.created_at,
    // Nota hanya untuk tagihan berbayar yang lunas (hadiah admin / migrasi tanpa nota)
    invoice_number: status === 'lunas' && Number(r.price) > 0 ? `INV-${r.addon_number}` : null,
  };
}

/**
 * SiteAddonState satu fitur untuk satu situs (site: baris siteSelect). rows = baris addonSelect() situs itu, terbaru
 * dulu; price = harga saat ini. purchase = baris lunas aktif terbaru, pending = tagihan yang menunggu pembayaran.
 */
function addonState(code, site, rows, price, staff) {
  let purchase = null;
  let pending = null;
  for (const r of codeRows(rows, code)) {
    if (purchase === null && r.status === 'lunas' && r.revoked_at === null) purchase = r;
    if (pending === null && r.status === 'menunggu_pembayaran') pending = r;
  }
  const isCapable = capable(code, site);
  const active = isCapable && purchase !== null;
  return {
    code,
    name: addonName(code),
    price,
    capable: isCapable,
    active,
    activated_at: active ? purchase.paid_at : null,
    source: active ? purchase.source : null,
    purchase: purchase !== null ? addonOrderOut(purchase, staff) : null,
    pending: pending !== null ? addonOrderOut(pending, staff) : null,
  };
}

/** SiteAddonSite dari baris siteSelect dan baris addonSelect() situs itu. */
function siteAddonOut(s, rows, prices, staff) {
  return {
    site_id: Number(s.id),
    domain: s.domain,
    template_code: s.template_code,
    template_name: s.template_name,
    order_number: s.order_number,
    site_status: s.status,
    addons: CODES.map((code) => addonState(code, s, rows, prices[code], staff)),
  };
}
