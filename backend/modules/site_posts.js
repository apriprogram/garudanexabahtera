// Berita & pengumuman situs pembeli (template sekolah) dan pengaturan SEO situs (docs/platform/SITE-POSTS-SEO-SPEC.md
// §2 dan §4) for backend/server.js: CRUD tulisan + jumlah dilihat di panel akun pembeli (/akun/situs/:id/berita),
// pengaturan SEO per situs (/akun/situs/:id/seo), dan bacaan publik untuk situs pembeli. Tabel site_posts,
// site_post_views, site_seo (database/migrations/2026-10-26_029_site_posts_seo.sql). JSON shapes and limits =
// src/types/sitePosts.ts (SitePostSummary, SitePostPublic, SitePostAdmin, SitePostInput, SiteSeoSettings, SiteSeoResponse,
// SiteSeoPublic, SITE_POST_LIMITS, SITE_SEO_LIMITS, SITE_SCHEMA_TYPES).
// backend/modules/site_posts.php implements the same actions for the PHP backend: keep both identical (action names,
// input validation, messages, JSON shapes, HTTP status codes and `code` values); __tests__/backend/site-posts*.test.ts
// run both.
//
// server.js calls handleSitePostAction() in its /api.php GET and POST handlers, after the access check (createAuthGate
// in security.js sets req.user): get_site_seo, get_site_posts, get_site_post and site_post_view are in PUBLIC_ACTIONS,
// the customer_* actions in CUSTOMER_ACTIONS; the handlers re-check the role (requireCustomer) and the owner of the site
// (customerSite, the same query rows as customerSite() in templates.js / pf_customer_site()).
// Situs pembeli di produksi dirender backend/site.php (PHP): Node tidak punya padanannya (kepala halaman, robots.txt,
// sitemap.xml per domain), hanya aksi API ini yang setara.
//
// Panjang dihitung dalam karakter ([...s].length = code point, sama dengan mb_strlen di site_posts.php). Waktu keluar
// sebagai ISO 8601 WIB (2026-10-26T09:30:00+07:00) dari UNIX_TIMESTAMP(), jadi tidak bergantung zona waktu sesi MySQL.
// Foto disimpan lewat uploadBase64ToS3 seperti unggahan lain di server.js, jadi nilainya URL S3 (PHP: /assets/...).
import { readFileSync } from 'node:fs';
import { createLimiter } from '../security.js';
import { deleteFromS3, parseUpload, S3_PUBLIC_URL, uploadBase64ToS3 } from '../s3-client.js';

// Template yang punya fitur tulisan: sama dengan SP_POST_TEMPLATE_CODES (site_posts.php) dan features.posts di registri
// src/templates (dijaga tes paritas). Template sekolah baru cukup ditambahkan di ketiga tempat itu.
export const POST_TEMPLATE_CODES = Object.freeze(['madani', 'cakrawala']);
const KINDS = ['berita', 'pengumuman'];
const STATUSES = ['draft', 'published'];
const INDEX_MODES = ['auto', 'index', 'noindex'];
// Sama dengan SITE_SCHEMA_TYPES (src/types/sitePosts.ts); '' = otomatis
export const SCHEMA_TYPES = Object.freeze([
  '', 'Organization', 'LocalBusiness', 'School', 'EducationalOrganization', 'Preschool', 'ElementarySchool',
  'MiddleSchool', 'HighSchool', 'CollegeOrUniversity',
]);
// Sama dengan SITE_POST_LIMITS dan SITE_SEO_LIMITS (src/types/sitePosts.ts)
export const SITE_POST_LIMITS = Object.freeze({
  title: 160,
  slug: 120,
  excerpt: 300,
  body: 20000,
  category: 40,
  badge: 20,
  imageAlt: 200,
  linkUrl: 500,
  seoTitle: 70,
  seoDescription: 160,
  maxPostsPerSite: 500,
});
export const SITE_SEO_LIMITS = Object.freeze({
  title: 70,
  description: 160,
  verification: 100,
});
const TITLE_MIN = 3;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/;
// Deretan spasi (\s JavaScript ditambah U+0085, U+180E, U+FEFF, sama dengan SP_SPACE_RUN di site_posts.php dan
// SPACE_RUN di guides.js) dirapatkan jadi satu spasi di judul dan teks satu baris lainnya
const SPACE_RUN = /[\s\u0085\u180E\uFEFF]+/gu;
// Tautan tambahan tulisan: http(s)://, mailto:, tel:, path situs (/…, bukan // atau /\) atau #anchor. Tanpa spasi,
// karakter kontrol dan garis miring terbalik. Sama dengan SP_LINK_PATTERN di site_posts.php
const LINK_CHAR = '[^\\s\\u0085\\u180E\\uFEFF\\x00-\\x1F\\x7F\\\\]';
const LINK_PATTERN = new RegExp(
  `^(?:https?://${LINK_CHAR}+|(?:mailto|tel):${LINK_CHAR}+|/(?![/\\\\])${LINK_CHAR}*|#${LINK_CHAR}*)$`,
  'iu',
);
// Kode verifikasi Google Search Console / Bing Webmaster (nilai content tag meta)
const VERIFICATION_PATTERN = /^[A-Za-z0-9_-]{10,100}$/;
const VERIFICATION_INPUT_MAX = 500; // tempelan seluruh tag <meta …> masih muat
const IMAGE_MAX_BYTES = 2097152; // satu foto setelah di-decode (2 MB), sama dengan foto CMS situs
const IMAGE_EXTS = ['png', 'jpg', 'webp', 'gif']; // foto unggahan pembeli: raster saja, tidak pernah SVG
const SAVES_PER_HOUR = 120; // simpan tulisan/SEO per pengguna per jam
const VIEWS_PER_HOUR = 300; // tulisan dilihat per IP per jam, sama dengan VIEWS_PER_HOUR di guides.js
const LIST_DEFAULT = 12;
const LIST_MAX = 100;
// User-agent perayap: dijawab jumlah dilihat tanpa menambah hitungan
const BOT_PATTERN = /bot|crawl|spider|slurp|facebookexternalhit|preview/i;
const JAKARTA_OFFSET_S = 7 * 3600; // Asia/Jakarta, UTC+7 tanpa musim panas
// Nama buatan uploadBase64ToS3 (`<stem>_<ms timestamp>_<random>.<ext>`), sama dengan GENERATED_ASSET di templates.js
const GENERATED_ASSET = /_\d{13}_[a-z0-9]{1,6}\.[a-z0-9]+$/;
const GENERIC_ERROR = 'Terjadi kesalahan pada server. Silakan coba lagi.';

const POST_NOT_FOUND = 'Tulisan tidak ditemukan.';
const SITE_INACTIVE = 'Situs tidak ditemukan atau sedang tidak aktif.';
const SITE_SUSPENDED = 'Situs sedang dinonaktifkan sehingga isinya tidak bisa diubah. Hubungi kami.';
const POSTS_UNAVAILABLE = 'Template situs ini belum mendukung berita & pengumuman.';
const SLUG_TAKEN = 'Slug sudah dipakai tulisan lain di situs ini.';
const POST_LIMIT = 'Situs ini sudah punya 500 tulisan, jumlah maksimal. Hapus tulisan lama sebelum menulis yang baru.';
const POST_CHANGED = 'Tulisan baru saja diubah di tab lain. Muat ulang lalu coba lagi.';
const SEO_CHANGED = 'Pengaturan SEO baru saja diubah di tab lain. Muat ulang lalu coba lagi.';

// Kolom SELECT tulisan (alias tabel p; tambah LEFT JOIN site_post_views v untuk ADMIN_COLUMNS). Sama dengan SP_*_COLUMNS
const SUMMARY_COLUMNS = 'p.id, p.kind, p.slug, p.title, p.excerpt, p.category, p.badge, p.image, p.image_alt, p.link_url, '
  + 'p.published_at, UNIX_TIMESTAMP(p.updated_at) AS updated_ts';
const POST_COLUMNS = `${SUMMARY_COLUMNS}, p.body, p.seo_title, p.seo_description, p.noindex`;
const ADMIN_COLUMNS = `${POST_COLUMNS}, p.status, UNIX_TIMESTAMP(p.created_at) AS created_ts, v.view_count, `
  + 'UNIX_TIMESTAMP(v.last_viewed_at) AS last_viewed_ts';
const SEO_COLUMNS = 'title, description, og_image, google_verification, bing_verification, index_mode, schema_type, '
  + 'UNIX_TIMESTAMP(updated_at) AS updated_ts';
// Urutan panel akun: draf tanpa tanggal di atas (terakhir diubah dulu), lalu tanggal tampil terbaru
const ADMIN_ORDER = 'p.published_at IS NULL DESC, CASE WHEN p.published_at IS NULL THEN p.updated_at END DESC, '
  + 'p.published_at DESC, p.id DESC';

// Baca boleh lewat GET (query string) maupun POST; aksi lain hanya POST
const GET_ACTIONS = new Set(['get_site_seo', 'get_site_posts', 'get_site_post', 'customer_get_site_posts', 'customer_get_site_seo']);

const saveLimiter = createLimiter(3600 * 1000, SAVES_PER_HOUR);
const viewLimiter = createLimiter(3600 * 1000, VIEWS_PER_HOUR);

/** Galat yang pesannya aman ditampilkan (peran ApiError di api.php). `errors` = pesan per kolom. */
export class SitePostError extends Error {
  constructor(message, status = 400, code = null, errors = null, headers = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.errors = errors;
    this.headers = headers;
  }
}

const HANDLERS = Object.freeze({
  // publik (PUBLIC_ACTIONS): hanya situs berstatus active
  get_site_seo: getSiteSeo,
  get_site_posts: getSitePosts,
  get_site_post: getSitePost,
  site_post_view: sitePostView,
  // pembeli (CUSTOMER_ACTIONS): hanya situs miliknya
  customer_get_site_posts: customerGetSitePosts,
  customer_save_site_post: customerSaveSitePost,
  customer_delete_site_post: customerDeleteSitePost,
  customer_get_site_seo: customerGetSiteSeo,
  customer_save_site_seo: customerSaveSiteSeo,
});

export const SITE_POST_ACTIONS = Object.freeze(Object.keys(HANDLERS));

/**
 * Menjalankan aksi tulisan/SEO situs. false bila `action` bukan milik modul ini (server.js lanjut), true bila jawaban
 * sudah dikirim. Tidak pernah melempar: setiap galat menjadi jawaban JSON. Nama aksi di-trim seperti actionOf() di
 * security.js dan api.php, jadi aksi yang dijalankan sama dengan yang dicek gerbang akses.
 */
export async function handleSitePostAction(action, params, req, res, pool) {
  const name = typeof action === 'string' ? action.trim() : '';
  if (!Object.hasOwn(HANDLERS, name)) return false;
  try {
    if (req.method !== 'POST' && !GET_ACTIONS.has(name)) {
      throw new SitePostError('Gunakan metode POST untuk aksi ini.', 405, 'METHOD_NOT_ALLOWED');
    }
    const ctx = { pool, req, input: isPlainObject(params) ? params : {}, query: req.query || {}, user: req.user || null };
    const data = await HANDLERS[name](ctx);
    res.json({ success: true, ...data });
  } catch (err) {
    sendError(res, err, name);
  }
  return true;
}

function sendError(res, err, action) {
  if (res.headersSent) return;
  if (err instanceof SitePostError) {
    if (err.headers) res.set(err.headers);
    if (res.locals) res.locals.safeError = true;
    const body = { error: err.message };
    if (err.code) body.code = err.code;
    if (err.errors && Object.keys(err.errors).length) body.errors = err.errors;
    res.status(err.status).json(body);
    return;
  }
  // Validasi unggahan (UploadError s3-client) membawa pesan 4xx yang aman, seperti ApiError di api.php
  if (err && err.expose && Number(err.status) >= 400 && Number(err.status) < 500) {
    res.status(Number(err.status)).json({ error: err.message });
    return;
  }
  console.error(`[api] ${action}:`, err);
  res.status(500).json({ error: GENERIC_ERROR });
}

// ════════════════════════════════════════════════════════════════════════════
// Publik (situs pembeli yang aktif)
// ════════════════════════════════════════════════════════════════════════════

// SEO situs untuk pengunjung, tanpa kode verifikasi: { seo: SiteSeoPublic }
async function getSiteSeo(ctx) {
  const site = await activeSite(ctx, true);
  const seo = await seoRow(ctx.pool, Number(site.id));
  return { seo: seoPublicOut(seo, siteIndexReasons(site, seo).length === 0) };
}

// Tulisan terbit satu jenis, terbaru dulu: { posts: SitePostSummary[], total }. total = semua tulisan terbit jenis itu
// (tanpa batas limit). Template tanpa fitur tulisan → daftar kosong.
async function getSitePosts(ctx) {
  const { pool, input } = ctx;
  const site = await activeSite(ctx, false);
  const kind = phpTrim(inStr(input, 'kind'));
  if (!KINDS.includes(kind)) {
    throw new SitePostError('Jenis tulisan harus berita atau pengumuman.', 400, 'VALIDATION', { kind: 'Jenis tulisan harus berita atau pengumuman.' });
  }
  if (!hasPosts(String(site.template_code))) return { posts: [], total: 0 };
  const siteId = Number(site.id);
  const rows = await dbAll(pool, `SELECT ${SUMMARY_COLUMNS} FROM site_posts p WHERE p.site_id = ? AND p.kind = ? AND p.status = 'published'
                           ORDER BY p.published_at DESC, p.id DESC LIMIT ?`, [siteId, kind, listLimit(inInt(ctx, 'limit'))]);
  const total = await dbOne(pool, "SELECT COUNT(*) AS n FROM site_posts WHERE site_id = ? AND kind = ? AND status = 'published'", [siteId, kind]);
  return { posts: rows.map(summaryOut), total: Math.trunc(Number(total.n)) };
}

// Satu tulisan terbit lengkap: { post: SitePostPublic }. Draf, slug tidak dikenal atau tidak sah → 404.
async function getSitePost(ctx) {
  const site = await activeSite(ctx, false);
  const row = await publishedPost(ctx.pool, site, phpTrim(inStr(ctx.input, 'slug')));
  if (!row) throw postNotFound();
  return { post: publicOut(row) };
}

// Halaman tulisan dibuka (sekali per sesi browser): +1, dibatasi per IP seperti guide_view; perayap tidak dihitung.
// { views: jumlah dilihat tulisan itu }
async function sitePostView(ctx) {
  const { pool, req } = ctx;
  const limit = `sp-view|${clientIp(req)}`;
  const wait = viewLimiter.retryAfter(limit);
  if (wait) tooManyAttempts(wait);
  const site = await activeSite(ctx, false);
  const row = await publishedPost(pool, site, phpTrim(inStr(ctx.input, 'slug')));
  if (!row) throw postNotFound();
  const postId = Number(row.id);
  if (!isBot(String(req.headers?.['user-agent'] ?? ''))) {
    viewLimiter.hit(limit);
    await dbRun(pool, `INSERT INTO site_post_views (post_id, site_id, view_count, last_viewed_at) VALUES (?, ?, 1, NOW())
                       ON DUPLICATE KEY UPDATE view_count = view_count + 1, last_viewed_at = NOW()`, [postId, Number(site.id)]);
  }
  const count = await dbOne(pool, 'SELECT view_count FROM site_post_views WHERE post_id = ?', [postId]);
  return { views: count ? Math.trunc(Number(count.view_count)) : 0 };
}

/** Situs berstatus active dari input site_id; selain itu 404. withContent: kolom content ikut (status index). */
async function activeSite(ctx, withContent) {
  const siteId = inInt(ctx, 'site_id');
  const columns = `id, template_code, domain, status${withContent ? ', content' : ''}`;
  const site = siteId > 0
    ? await dbOne(ctx.pool, `SELECT ${columns} FROM template_sites WHERE id = ? AND status = 'active' LIMIT 1`, [siteId])
    : null;
  if (!site) throw new SitePostError(SITE_INACTIVE, 404, 'SITE_NOT_FOUND');
  return site;
}

/** Tulisan terbit situs ini dengan slug itu; template tanpa fitur tulisan atau slug tidak sah → null. */
async function publishedPost(pool, site, slug) {
  if (!hasPosts(String(site.template_code)) || !isSlug(slug)) return null;
  return dbOne(pool, `SELECT ${POST_COLUMNS} FROM site_posts p WHERE p.site_id = ? AND p.slug = ? AND p.status = 'published' LIMIT 1`,
    [Number(site.id), slug]);
}

// ════════════════════════════════════════════════════════════════════════════
// Pembeli (CUSTOMER_ACTIONS; panel /akun/situs/:siteId/berita dan /seo)
// ════════════════════════════════════════════════════════════════════════════

// Semua tulisan situs (draf juga) dengan jumlah dilihat: { posts: SitePostAdmin[], limits: { max_posts } }
async function customerGetSitePosts(ctx) {
  const user = requireCustomer(ctx.user);
  const site = await ownedSite(ctx, user, false, true);
  const rows = await dbAll(ctx.pool, `SELECT ${ADMIN_COLUMNS} FROM site_posts p LEFT JOIN site_post_views v ON v.post_id = p.id
                           WHERE p.site_id = ? ORDER BY ${ADMIN_ORDER}`, [Number(site.id)]);
  const domain = String(site.domain);
  return { posts: rows.map((r) => adminOut(r, domain)), limits: { max_posts: SITE_POST_LIMITS.maxPostsPerSite } };
}

// Tambah (tanpa post.id) atau ubah tulisan dari SitePostInput: { post: SitePostAdmin }. Slug kosong dibuat dari judul
// (unik per situs: -2, -3, …); foto data URI diunggah ke assets/sites/{site}/posts/, foto lama dihapus saat diganti.
async function customerSaveSitePost(ctx) {
  const { pool, input } = ctx;
  const user = requireCustomer(ctx.user);
  countSave(user);
  const site = await ownedSite(ctx, user, true, true);
  const siteId = Number(site.id);
  const post = inputObject(input.post);
  if (post === null) throw new SitePostError('Data tulisan wajib dikirim.', 400, 'VALIDATION');
  const id = toInt(post.id ?? null);
  let existing = null;
  if (id > 0) {
    existing = await dbOne(pool, 'SELECT id, slug, image FROM site_posts WHERE id = ? AND site_id = ? LIMIT 1', [id, siteId]);
    if (!existing) throw postNotFound();
  } else {
    const count = await dbOne(pool, 'SELECT COUNT(*) AS n FROM site_posts WHERE site_id = ?', [siteId]);
    if (Number(count.n) >= SITE_POST_LIMITS.maxPostsPerSite) throw new SitePostError(POST_LIMIT, 409, 'POST_LIMIT');
  }
  const storedImage = existing ? nullable(existing.image) : null;
  const [clean, errors] = validateSitePost(post, storedImage, jakartaToday());
  const keys = Object.keys(errors);
  if (keys.length) throw new SitePostError(errors[keys[0]], 400, 'VALIDATION', errors);

  const taken = (await dbAll(pool, 'SELECT slug FROM site_posts WHERE site_id = ? AND id <> ?', [siteId, id])).map((r) => String(r.slug));
  if (clean.slug === '') {
    clean.slug = uniqueSlug(slugFromTitle(clean.title, clean.kind), taken);
  } else if (taken.includes(clean.slug)) {
    throw new SitePostError(SLUG_TAKEN, 409, 'SLUG_TAKEN', { slug: SLUG_TAKEN });
  }

  const section = `sites/${siteId}/posts`;
  let image = storedImage;
  let newFile = null;
  if (clean.image_action === 'upload') {
    newFile = await uploadBase64ToS3(clean.image_data, section, 'post');
    image = newFile;
  } else if (clean.image_action === 'delete') {
    image = null;
  }
  const values = [
    clean.kind, clean.slug, clean.title, clean.excerpt, clean.body, clean.category, clean.badge,
    image, clean.image_alt, clean.link_url, clean.status, clean.published_at, clean.seo_title,
    clean.seo_description, clean.noindex ? 1 : 0,
  ];
  try {
    if (existing) {
      // Hanya menimpa foto yang tadi dibaca (image <=> foto awal): simpan bersamaan dari tab lain tidak meninggalkan
      // file yatim dan tidak merujuk foto yang sudah dihapus
      const readImage = existing.image ?? null;
      const result = await dbRun(pool, `UPDATE site_posts SET kind = ?, slug = ?, title = ?, excerpt = ?, body = ?, category = ?, badge = ?, image = ?,
                           image_alt = ?, link_url = ?, status = ?, published_at = ?, seo_title = ?, seo_description = ?, noindex = ?
                           WHERE id = ? AND site_id = ? AND image <=> ?`, [...values, id, siteId, readImage]);
      if (affectedRows(result) === 0) await checkPostUpdate(pool, id, siteId, readImage, newFile !== null);
    } else {
      await dbRun(pool, `INSERT INTO site_posts (site_id, kind, slug, title, excerpt, body, category, badge, image, image_alt, link_url,
                           status, published_at, seo_title, seo_description, noindex) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [siteId, ...values]);
    }
  } catch (err) {
    // Tulisan tidak tersimpan (database gagal, atau tulisan dihapus / fotonya diubah di tab lain): foto yang baru
    // diunggah request ini tidak dirujuk apa pun
    if (newFile !== null) await deleteUpload(newFile, section);
    throw err;
  }
  if (storedImage !== null && storedImage !== image) await deleteUpload(storedImage, section);

  // Dibaca ulang lewat slug (unik per situs), sama dengan site_posts.php (yang tidak memakai insert_id)
  const row = await dbOne(pool, `SELECT ${ADMIN_COLUMNS} FROM site_posts p LEFT JOIN site_post_views v ON v.post_id = p.id
                          WHERE p.site_id = ? AND p.slug = ? LIMIT 1`, [siteId, clean.slug]);
  if (!row) throw postNotFound(); // dihapus di tab lain tepat setelah disimpan
  if (!existing) {
    // Tulisan baru mulai dari 0 dilihat (id bekas tulisan terhapus bisa dipakai lagi setelah server MySQL dimulai ulang)
    await dbRun(pool, 'DELETE FROM site_post_views WHERE post_id = ?', [Number(row.id)]);
    row.view_count = null;
    row.last_viewed_ts = null;
  }
  return { post: adminOut(row, String(site.domain)) };
}

// Hapus tulisan beserta jumlah dilihat dan fotonya: {}
async function customerDeleteSitePost(ctx) {
  const { pool } = ctx;
  const user = requireCustomer(ctx.user);
  const site = await ownedSite(ctx, user, true, true);
  const siteId = Number(site.id);
  const id = inInt(ctx, 'post_id');
  const row = id > 0 ? await dbOne(pool, 'SELECT id, slug, image FROM site_posts WHERE id = ? AND site_id = ? LIMIT 1', [id, siteId]) : null;
  if (!row) throw postNotFound();
  await dbRun(pool, 'DELETE FROM site_posts WHERE id = ? AND site_id = ?', [id, siteId]);
  await dbRun(pool, 'DELETE FROM site_post_views WHERE post_id = ?', [id]);
  await deleteUpload(nullable(row.image), `sites/${siteId}/posts`);
  return {};
}

// Pengaturan SEO situs (semua template), status index dan alamat penting: SiteSeoResponse
async function customerGetSiteSeo(ctx) {
  const user = requireCustomer(ctx.user);
  const site = await ownedSite(ctx, user, false, false);
  return seoResponse(site, await seoRow(ctx.pool, Number(site.id)));
}

// Simpan sebagian atau semua SiteSeoSettings (kunci yang tidak dikirim tetap): SiteSeoResponse. og_image: data URI
// (diunggah ke assets/sites/{site}/seo/), URL tersimpan (tetap) atau null/'' (dihapus).
async function customerSaveSiteSeo(ctx) {
  const { pool, input } = ctx;
  const user = requireCustomer(ctx.user);
  countSave(user);
  const site = await ownedSite(ctx, user, true, false);
  const siteId = Number(site.id);
  const seoInput = inputObject(input.seo);
  if (seoInput === null) throw new SitePostError('Pengaturan SEO wajib dikirim.', 400, 'VALIDATION');
  const stored = await seoRow(pool, siteId);
  const current = seoSettingsOut(stored);
  const [seo, errors] = validateSiteSeo(seoInput, current);
  const keys = Object.keys(errors);
  if (keys.length) throw new SitePostError(errors[keys[0]], 400, 'VALIDATION', errors);

  const section = `sites/${siteId}/seo`;
  let image = current.og_image;
  let newFile = null;
  if (seo.og_image_action === 'upload') {
    newFile = await uploadBase64ToS3(seo.og_image_data, section, 'seo');
    image = newFile;
  } else if (seo.og_image_action === 'delete') {
    image = null;
  }
  const values = [seo.title, seo.description, image, seo.google_verification, seo.bing_verification, seo.index_mode, seo.schema_type];
  try {
    if (stored === null) {
      // Baris pertama situs ini: INSERT biasa (bukan upsert), jadi baris yang baru saja dibuat tab lain tidak ditimpa
      await dbRun(pool, `INSERT INTO site_seo (site_id, title, description, og_image, google_verification, bing_verification, index_mode, schema_type)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [siteId, ...values]);
    } else {
      // Hanya menimpa gambar yang tadi dibaca (og_image <=> gambar awal), sama dengan simpan tulisan
      const readImage = stored.og_image ?? null;
      const result = await dbRun(pool, `UPDATE site_seo SET title = ?, description = ?, og_image = ?, google_verification = ?, bing_verification = ?,
                           index_mode = ?, schema_type = ? WHERE site_id = ? AND og_image <=> ?`, [...values, siteId, readImage]);
      if (affectedRows(result) === 0) await checkSeoUpdate(pool, siteId, readImage, newFile !== null);
    }
  } catch (err) {
    // Pengaturan tidak tersimpan: gambar yang baru diunggah request ini tidak dirujuk apa pun
    if (newFile !== null) await deleteUpload(newFile, section);
    // Duplikat saat INSERT (dbRun: SitePostError 409) = baris dibuat tab lain di antara baca dan simpan
    if (stored === null && err instanceof SitePostError && err.status === 409) throw seoChanged();
    throw err;
  }
  if (current.og_image !== null && current.og_image !== image) await deleteUpload(current.og_image, section);
  return seoResponse(site, await seoRow(pool, siteId));
}

/**
 * Situs milik pembeli (404 bila bukan miliknya). write: situs nonaktif → 409 SITE_SUSPENDED.
 * posts: template tanpa fitur tulisan → 403 POSTS_UNAVAILABLE (SEO berlaku untuk semua template).
 */
async function ownedSite(ctx, user, write, posts) {
  const site = await customerSite(ctx, user);
  if (posts && !hasPosts(String(site.template_code))) throw new SitePostError(POSTS_UNAVAILABLE, 403, 'POSTS_UNAVAILABLE');
  if (write && site.status !== 'active') throw new SitePostError(SITE_SUSPENDED, 409, 'SITE_SUSPENDED');
  return site;
}

// Baris yang sama dengan pf_customer_site() / customerSite() di templates.js (situs dengan pesanannya, milik pembeli)
async function customerSite(ctx, user) {
  const siteId = inInt(ctx, 'site_id');
  const row = siteId > 0
    ? await dbOne(ctx.pool, `SELECT s.id, s.user_id, s.template_code, s.domain, s.status, s.content, s.updated_at
                              FROM template_sites s
                              JOIN template_orders o ON o.id = s.order_id
                              WHERE s.id = ? AND s.user_id = ? LIMIT 1`, [siteId, user.id])
    : null;
  if (!row) throw new SitePostError('Situs tidak ditemukan.', 404, 'SITE_NOT_FOUND');
  return row;
}

/** Batas simpan tulisan/SEO per pengguna (setiap percobaan dihitung, juga yang gagal validasi). */
function countSave(user) {
  const key = `sp-save|${user.id}`;
  const wait = saveLimiter.retryAfter(key);
  if (wait) tooManyAttempts(wait);
  saveLimiter.hit(key);
}

const seoRow = (pool, siteId) => dbOne(pool, `SELECT ${SEO_COLUMNS} FROM site_seo WHERE site_id = ? LIMIT 1`, [siteId]);

/** SiteSeoResponse dari baris template_sites (dengan content) dan baris site_seo (null = semua bawaan). */
function seoResponse(site, seo) {
  const reasons = siteIndexReasons(site, seo);
  return {
    seo: seoSettingsOut(seo),
    status: { indexable: reasons.length === 0, reasons },
    urls: siteUrls(String(site.domain)),
  };
}

/** indexReasons() untuk satu situs: status, index_mode tersimpan, content dan nama bawaan templatenya. */
function siteIndexReasons(site, seo) {
  return indexReasons(String(site.status), seoSettingsOut(seo).index_mode, site.content ?? null, defaultName(String(site.template_code)));
}

const postNotFound = () => new SitePostError(POST_NOT_FOUND, 404, 'POST_NOT_FOUND');

const seoChanged = () => new SitePostError(SEO_CHANGED, 409, 'SEO_CHANGED');

/**
 * UPDATE tulisan mengenai 0 baris. Tulisan sudah dihapus → 404 POST_NOT_FOUND. Fotonya bukan lagi readImage (diganti
 * atau dihapus di tab lain), atau foto baru request ini tidak tersimpan → 409 POST_CHANGED. Selain itu isiannya memang
 * sama persis dengan yang tersimpan (mysqli di PHP menghitung baris yang berubah saja), jadi simpan dianggap berhasil.
 * Sama dengan sp_check_post_update().
 */
async function checkPostUpdate(pool, id, siteId, readImage, uploaded) {
  const now = await dbOne(pool, 'SELECT image FROM site_posts WHERE id = ? AND site_id = ? LIMIT 1', [id, siteId]);
  if (!now) throw postNotFound();
  if (uploaded || (now.image ?? null) !== readImage) throw new SitePostError(POST_CHANGED, 409, 'POST_CHANGED');
}

/** UPDATE site_seo mengenai 0 baris: aturan checkPostUpdate() untuk og_image (baris hilang juga 409 SEO_CHANGED). */
async function checkSeoUpdate(pool, siteId, readImage, uploaded) {
  const now = await dbOne(pool, 'SELECT og_image FROM site_seo WHERE site_id = ? LIMIT 1', [siteId]);
  if (!now || uploaded || (now.og_image ?? null) !== readImage) throw seoChanged();
}

// ════════════════════════════════════════════════════════════════════════════
// Validasi & aturan (fungsi murni, dites berdampingan dengan site_posts.php)
// ════════════════════════════════════════════════════════════════════════════

/**
 * SitePostInput → [tulisan ternormalisasi, pesan galat per kolom]. Kunci galat = kunci SitePostInput, urutan pengecekan
 * sama dengan sp_validate_post() di site_posts.php (pesan pertama menjadi `error`). storedImage = foto tersimpan
 * (null untuk tulisan baru), today = YYYY-MM-DD (Asia/Jakarta).
 * Hasil: kind, title, slug ('' = dibuat dari judul), excerpt, body (CRLF/CR → LF, di-trim), category, badge,
 * image_action (keep | delete | upload), image_data (data URI untuk upload), image_ext, image_alt, link_url, status,
 * published_at (YYYY-MM-DD atau null), seo_title, seo_description, noindex (boolean).
 */
export function validateSitePost(input, storedImage, today) {
  const errors = {};
  const kind = choice(input, 'kind', KINDS, 'Pilih jenis tulisan: berita atau pengumuman.', errors);
  const title = line(input, 'title', 'Judul', SITE_POST_LIMITS.title, errors, TITLE_MIN);

  const slug = text(input, 'slug', 'Slug', errors);
  if (slug !== null && slug !== '') {
    if (mbLen(slug) > SITE_POST_LIMITS.slug) errors.slug = `Slug maksimal ${SITE_POST_LIMITS.slug} karakter.`;
    else if (!SLUG_PATTERN.test(slug)) errors.slug = 'Slug hanya boleh huruf kecil, angka, dan tanda hubung, contoh: juara-olimpiade-sains.';
  }

  const excerpt = line(input, 'excerpt', 'Ringkasan', SITE_POST_LIMITS.excerpt, errors);
  let body = text(input, 'body', 'Isi tulisan', errors);
  if (body !== null) {
    body = phpTrim(body.replace(/\r\n?/g, '\n'));
    if (mbLen(body) > SITE_POST_LIMITS.body) errors.body = 'Isi tulisan maksimal 20.000 karakter.';
  }
  const category = line(input, 'category', 'Kategori', SITE_POST_LIMITS.category, errors);
  const badge = line(input, 'badge', 'Label', SITE_POST_LIMITS.badge, errors);

  let image = { action: 'keep', data: null, ext: null };
  if (Object.hasOwn(input, 'image')) image = imageInput(input.image, storedImage, 'image', 'Foto', 'foto', errors);
  const imageAlt = line(input, 'image_alt', 'Teks foto', SITE_POST_LIMITS.imageAlt, errors);

  const linkUrl = text(input, 'link_url', 'Tautan tambahan', errors);
  if (linkUrl !== null && linkUrl !== '') {
    if (mbLen(linkUrl) > SITE_POST_LIMITS.linkUrl) errors.link_url = `Tautan tambahan maksimal ${SITE_POST_LIMITS.linkUrl} karakter.`;
    else if (!LINK_PATTERN.test(linkUrl)) errors.link_url = 'Tautan tambahan harus diawali https://, http://, mailto:, tel:, / atau #.';
  }

  const status = choice(input, 'status', STATUSES, 'Pilih status tulisan: Draf atau Terbit.', errors);
  let publishedAt = text(input, 'published_at', 'Tanggal', errors);
  if (publishedAt === '') {
    // Terbit tanpa tanggal = hari ini (WIB); draf boleh tanpa tanggal
    publishedAt = status === 'published' ? today : null;
  } else if (publishedAt !== null && !isDate(publishedAt)) {
    errors.published_at = 'Tanggal harus tanggal yang valid (YYYY-MM-DD).';
  }

  const seoTitle = line(input, 'seo_title', 'Judul SEO', SITE_POST_LIMITS.seoTitle, errors);
  const seoDescription = line(input, 'seo_description', 'Deskripsi SEO', SITE_POST_LIMITS.seoDescription, errors);

  return [{
    kind,
    title,
    slug,
    excerpt,
    body,
    category,
    badge,
    image_action: image.action,
    image_data: image.data,
    image_ext: image.ext,
    image_alt: imageAlt,
    link_url: linkUrl,
    status,
    published_at: publishedAt,
    seo_title: seoTitle,
    seo_description: seoDescription,
    noindex: isFlag(input.noindex ?? null),
  }, errors];
}

/**
 * Partial<SiteSeoSettings> → [pengaturan lengkap, pesan galat per kolom]. Kunci yang tidak dikirim tetap memakai
 * `current` (bentuk SiteSeoSettings). Urutan pengecekan sama dengan sp_validate_seo() di site_posts.php.
 * Hasil: title, description, og_image_action (keep | delete | upload), og_image_data, og_image_ext,
 * google_verification, bing_verification (token saja, '' = dihapus), index_mode, schema_type.
 */
export function validateSiteSeo(input, current) {
  const errors = {};
  const seo = {
    title: current.title,
    description: current.description,
    og_image_action: 'keep',
    og_image_data: null,
    og_image_ext: null,
    google_verification: current.google_verification,
    bing_verification: current.bing_verification,
    index_mode: current.index_mode,
    schema_type: current.schema_type,
  };
  if (Object.hasOwn(input, 'title')) seo.title = line(input, 'title', 'Judul di Google', SITE_SEO_LIMITS.title, errors);
  if (Object.hasOwn(input, 'description')) {
    seo.description = line(input, 'description', 'Deskripsi di Google', SITE_SEO_LIMITS.description, errors);
  }
  if (Object.hasOwn(input, 'og_image')) {
    const image = imageInput(input.og_image, current.og_image, 'og_image', 'Gambar', 'gambar', errors);
    seo.og_image_action = image.action;
    seo.og_image_data = image.data;
    seo.og_image_ext = image.ext;
  }
  if (Object.hasOwn(input, 'google_verification')) {
    seo.google_verification = verificationToken(input.google_verification);
    if (seo.google_verification === null) {
      errors.google_verification = 'Kode verifikasi Google tidak valid. Tempel kode dari Google Search Console atau seluruh tag meta-nya.';
    }
  }
  if (Object.hasOwn(input, 'bing_verification')) {
    seo.bing_verification = verificationToken(input.bing_verification);
    if (seo.bing_verification === null) {
      errors.bing_verification = 'Kode verifikasi Bing tidak valid. Tempel kode dari Bing Webmaster Tools atau seluruh tag meta-nya.';
    }
  }
  if (Object.hasOwn(input, 'index_mode')) {
    seo.index_mode = choice(input, 'index_mode', INDEX_MODES, 'Pilih tampil di Google: Otomatis, Ya, atau Tidak.', errors);
  }
  if (Object.hasOwn(input, 'schema_type')) {
    seo.schema_type = choice(input, 'schema_type', SCHEMA_TYPES, 'Jenis organisasi tidak dikenal. Pilih dari daftar.', errors);
  }
  return [seo, errors];
}

/**
 * Nilai foto dari form: null/'' → delete, sama dengan `stored` → keep, data URI gambar raster ≤ 2 MB → upload (data =
 * data URI yang di-trim, ext dari isi file), selain itu galat di errors[key]. label/noun: "Foto"/"foto" atau
 * "Gambar"/"gambar" untuk pesan. Sama dengan sp_image_input().
 */
export function imageInput(value, stored, key, label, noun, errors) {
  const keep = { action: 'keep', data: null, ext: null };
  const invalid = `${label} tidak valid. Unggah ulang ${noun}nya.`;
  const tooLarge = `Ukuran ${noun} maksimal 2 MB.`;
  const unsupported = `Format ${noun} tidak didukung. Gunakan PNG, JPG, WEBP, atau GIF.`;
  if (value === null) return { action: 'delete', data: null, ext: null };
  if (typeof value !== 'string') {
    errors[key] = invalid;
    return keep;
  }
  const data = phpTrim(value);
  if (data === '') return { action: 'delete', data: null, ext: null };
  if (stored !== null && data === stored) return keep;
  const m = /^data:[^,]*;base64,/i.exec(data);
  if (!m) {
    errors[key] = invalid;
    return keep;
  }
  // Ukuran dalam byte seperti strlen()
  if (Buffer.byteLength(data, 'utf8') - Buffer.byteLength(m[0], 'utf8') > Math.ceil((IMAGE_MAX_BYTES * 4) / 3) + 4) {
    errors[key] = tooLarge;
    return keep;
  }
  let parsed;
  try {
    parsed = parseUpload(data, { allowDocuments: false }); // gambar saja
  } catch {
    errors[key] = unsupported;
    return keep;
  }
  // Unggahan pembeli disajikan dari origin utama: raster saja (SVG bisa membawa script)
  if (!IMAGE_EXTS.includes(parsed.ext)) {
    errors[key] = unsupported;
    return keep;
  }
  if (parsed.content.length > IMAGE_MAX_BYTES) {
    errors[key] = tooLarge;
    return keep;
  }
  return { action: 'upload', data, ext: parsed.ext };
}

/**
 * Kode verifikasi dari isian: token apa adanya atau seluruh tag <meta … content="TOKEN">. '' = dihapus,
 * null = tidak valid (token harus [A-Za-z0-9_-]{10,100}). Sama dengan sp_verification_token().
 */
export function verificationToken(value) {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'string') return null;
  let token = phpTrim(value);
  if (token === '') return '';
  if (mbLen(token) > VERIFICATION_INPUT_MAX) return null;
  if (token.includes('<')) {
    const m = /\bcontent[ \t\r\n]*=[ \t\r\n]*(["'])([^"']*)\1/i.exec(token);
    if (!m) return null;
    token = phpTrim(m[2]);
  }
  return VERIFICATION_PATTERN.test(token) ? token : null;
}

/**
 * Alasan situs tidak tampil di Google (SiteSeoStatus.reasons), urutan tetap: suspended, manual_noindex, default_content.
 * content = kolom template_sites.content (teks JSON, null = bawaan template), defaultName = brand.company_name bawaan
 * template (null = tidak diketahui: hanya nama kosong yang dianggap bawaan). Sama dengan sp_index_reasons().
 */
export function indexReasons(siteStatus, indexMode, content, defaultName) {
  const reasons = [];
  if (siteStatus === 'suspended') reasons.push('suspended');
  if (indexMode === 'noindex') reasons.push('manual_noindex');
  if (indexMode === 'auto' && isDefaultContent(content, defaultName)) reasons.push('default_content');
  return reasons;
}

/** Konten belum disimpan (null/bukan objek JSON) atau brand.company_name kosong / sama dengan nama bawaan template. */
export function isDefaultContent(content, defaultName) {
  let data = null;
  if (typeof content === 'string' && content !== '') {
    try {
      data = JSON.parse(content);
    } catch {
      data = null;
    }
  }
  if (data === null || typeof data !== 'object') return true;
  const brand = Array.isArray(data) ? undefined : data.brand;
  const raw = brand !== null && typeof brand === 'object' && !Array.isArray(brand) ? brand.company_name : undefined;
  const name = typeof raw === 'string' ? cleanLine(raw) : '';
  return name === '' || (defaultName !== null && name === cleanLine(defaultName));
}

/**
 * Slug dari judul: huruf kecil, diakritik dibuang (NFD), selain a-z0-9 → '-', '-' dirapatkan, maks 120 karakter dipotong
 * di batas kata. Judul tanpa huruf/angka Latin → fallback. Sama dengan sp_slug_from_title() (tabel SP_FOLD di PHP).
 */
export function slugFromTitle(title, fallback) {
  const ascii = String(title).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]+/g, '');
  const slug = ascii.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (slug === '') return fallback ? fallback : 'tulisan';
  return cutSlug(slug, SITE_POST_LIMITS.slug);
}

/** Slug ≤ max karakter, dipotong di '-' terakhir yang muat (kata tidak terpotong) bila ada. */
export function cutSlug(slug, max) {
  if (slug.length <= max) return slug;
  const at = slug.slice(0, max + 1).lastIndexOf('-');
  return (at > 0 ? slug.slice(0, at) : slug.slice(0, max)).replace(/-+$/, '');
}

/** base bila belum dipakai, selain itu base-2, base-3, … (tetap ≤ 120 karakter). */
export function uniqueSlug(base, taken) {
  const used = new Set(taken.map(String));
  if (!used.has(base)) return base;
  for (let n = 2; ; n += 1) {
    const suffix = `-${n}`;
    const candidate = cutSlug(base, SITE_POST_LIMITS.slug - suffix.length) + suffix;
    if (!used.has(candidate)) return candidate;
  }
}

/** limit daftar publik: kosong/≤ 0 → 12, lebih dari 100 → 100. */
export const listLimit = (limit) => (limit <= 0 ? LIST_DEFAULT : Math.min(limit, LIST_MAX));

export const isBot = (userAgent) => BOT_PATTERN.test(userAgent);

export const hasPosts = (templateCode) => POST_TEMPLATE_CODES.includes(templateCode);

const isSlug = (value) => typeof value === 'string' && value !== '' && value.length <= SITE_POST_LIMITS.slug && SLUG_PATTERN.test(value);

/** YYYY-MM-DD yang benar-benar ada di kalender, tahun 1000–9999 (rentang kolom DATE); sama dengan sp_is_date(). */
function isDate(value) {
  const m = DATE_PATTERN.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return y >= 1000 && date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

/** Hari ini di Asia/Jakarta (YYYY-MM-DD). */
export const jakartaToday = () => new Date(Date.now() + JAKARTA_OFFSET_S * 1000).toISOString().slice(0, 10);

/** Detik Unix (UNIX_TIMESTAMP) → ISO 8601 WIB "2026-10-26T09:30:00+07:00"; null tetap null. Sama dengan sp_iso(). */
export function isoTime(seconds) {
  if (seconds === null || seconds === undefined || seconds === '') return null;
  return `${new Date((Math.trunc(Number(seconds)) + JAKARTA_OFFSET_S) * 1000).toISOString().slice(0, 19)}+07:00`;
}

/** Alamat penting situs (SiteSeoResponse.urls). */
export const siteUrls = (domain) => ({
  home: `https://${domain}/`,
  sitemap: `https://${domain}/sitemap.xml`,
  robots: `https://${domain}/robots.txt`,
});

let siteDefaults = null;

/** Bawaan template dari site_defaults.json ({code: {company_name, tagline, description, logo, posts}}); tidak ada → {}. */
function readSiteDefaults() {
  if (siteDefaults === null) {
    let data = null;
    try {
      data = JSON.parse(readFileSync(new URL('./site_defaults.json', import.meta.url), 'utf8'));
    } catch {
      data = null;
    }
    siteDefaults = isPlainObject(data) ? data : {};
  }
  return siteDefaults;
}

/** brand.company_name bawaan template; tidak diketahui → null. */
export function defaultName(templateCode) {
  const defaults = readSiteDefaults();
  const entry = Object.hasOwn(defaults, templateCode) ? defaults[templateCode] : null;
  return isPlainObject(entry) && typeof entry.company_name === 'string' ? entry.company_name : null;
}

// ── Isian (sama dengan sp_text / sp_line / sp_choice / sp_flag di site_posts.php) ──

// Teks yang di-trim; kosong/tidak ada → ''. Selain string → galat "{label} tidak valid." dan null
function text(input, key, label, errors) {
  const raw = input[key] ?? null;
  if (raw === null) return '';
  if (typeof raw !== 'string') {
    errors[key] = `${label} tidak valid.`;
    return null;
  }
  return phpTrim(raw);
}

// Teks satu baris: spasi dirapatkan, maks `max` karakter; min > 0 = wajib diisi
function line(input, key, label, max, errors, min = 0) {
  const raw = text(input, key, label, errors);
  if (raw === null) return null;
  const value = cleanLine(raw);
  const length = mbLen(value);
  if (min > 0 && length === 0) errors[key] = `${label} wajib diisi.`;
  else if (length < min) errors[key] = `${label} minimal ${min} karakter.`;
  else if (length > max) errors[key] = `${label} maksimal ${max} karakter.`;
  return value;
}

// Salah satu nilai `allowed` (string, di-trim); selain itu galat `message` dan null
function choice(input, key, allowed, message, errors) {
  const raw = input[key] ?? null;
  const value = typeof raw === 'string' ? phpTrim(raw) : null;
  if (value === null || !allowed.includes(value)) {
    errors[key] = message;
    return null;
  }
  return value;
}

const cleanLine = (value) => phpTrim(String(value).replace(SPACE_RUN, ' '));

// Objek JSON dari isian. PHP men-decode objek dan daftar sama-sama menjadi array: daftar dianggap objek tanpa kunci
// yang dikenal; selain itu null
function inputObject(value) {
  if (isPlainObject(value)) return value;
  return Array.isArray(value) ? {} : null;
}

// Bilangan bulat dari isian JSON (bukan bilangan → 0), seperti (int) setelah is_numeric() di PHP
const toInt = (value) => (isNumeric(value) ? Math.trunc(Number(value)) : 0);

const nullable = (value) => (value === null || value === undefined || value === '' ? null : String(value));

// Menghapus foto yang diunggah modul ini (URL S3 di assets/<section>/ dengan nama buatan uploadBase64ToS3); URL lain
// dan file bawaan tidak disentuh. Sama dengan deleteGenerated() di templates.js / pf_delete_generated()
async function deleteUpload(path, section) {
  const base = `${String(S3_PUBLIC_URL).replace(/\/+$/, '')}/assets/`;
  const prefix = `${base}${section}/`;
  if (typeof path === 'string' && path.startsWith(prefix) && GENERATED_ASSET.test(path) && !path.slice(prefix.length).includes('/')) {
    await deleteFromS3(path.slice(base.length - 'assets/'.length));
  }
}

function requireCustomer(user) {
  if (!user) throw new SitePostError('Silakan masuk terlebih dahulu.', 401, 'UNAUTHORIZED');
  if (user.role !== 'customer') throw new SitePostError('Akses ditolak: aksi ini khusus akun pembeli.', 403, 'FORBIDDEN');
  return { ...user, id: Number(user.id) };
}

function tooManyAttempts(seconds) {
  throw new SitePostError(`Terlalu banyak percobaan. Coba lagi dalam ${Math.max(1, Math.ceil(seconds / 60))} menit.`, 429, null, null,
    { 'Retry-After': String(seconds) });
}

// ── Bentuk JSON (src/types/sitePosts.ts) ──

/** SitePostSummary dari baris SUMMARY_COLUMNS. */
export const summaryOut = (r) => ({
  id: Number(r.id),
  kind: String(r.kind),
  slug: String(r.slug),
  title: String(r.title),
  excerpt: String(r.excerpt),
  category: String(r.category),
  badge: String(r.badge),
  image: nullable(r.image),
  image_alt: String(r.image_alt),
  link_url: String(r.link_url),
  published_at: nullable(r.published_at),
  updated_at: isoTime(r.updated_ts),
});

/** SitePostPublic dari baris POST_COLUMNS. */
export const publicOut = (r) => ({
  ...summaryOut(r),
  body: String(r.body),
  seo_title: String(r.seo_title),
  seo_description: String(r.seo_description),
  noindex: Math.trunc(Number(r.noindex)) === 1,
});

/** SitePostAdmin dari baris ADMIN_COLUMNS; url = alamat publik di domain situs. */
export const adminOut = (r, domain) => ({
  ...publicOut(r),
  status: String(r.status),
  view_count: Math.trunc(Number(r.view_count ?? 0)),
  last_viewed_at: isoTime(r.last_viewed_ts ?? null),
  created_at: isoTime(r.created_ts),
  url: `https://${domain}/${r.kind}/${r.slug}`,
});

/** SiteSeoSettings dari baris SEO_COLUMNS; null (belum ada baris) = semua bawaan. */
export function seoSettingsOut(r) {
  return {
    title: String(r?.title ?? ''),
    description: String(r?.description ?? ''),
    og_image: nullable(r?.og_image ?? null),
    google_verification: String(r?.google_verification ?? ''),
    bing_verification: String(r?.bing_verification ?? ''),
    index_mode: INDEX_MODES.includes(r?.index_mode) ? r.index_mode : 'auto',
    schema_type: SCHEMA_TYPES.includes(r?.schema_type) ? r.schema_type : '',
    updated_at: r ? isoTime(r.updated_ts ?? null) : null,
  };
}

/** SiteSeoPublic: tanpa kode verifikasi; indexable = tidak ada alasan indexReasons(). */
export function seoPublicOut(r, indexable) {
  const seo = seoSettingsOut(r);
  return { title: seo.title, description: seo.description, og_image: seo.og_image, schema_type: seo.schema_type, indexable };
}

// ── Database (setiap nilai di-bind; tanggal kembali sebagai teks seperti mysqli) ──

async function dbRun(db, sql, params = []) {
  try {
    const [result] = await db.query({ sql, values: params, dateStrings: true });
    return result;
  } catch (err) {
    if (err && (err.code === 'ER_DUP_ENTRY' || err.errno === 1062)) throw new SitePostError('Data yang sama sudah ada (duplikat).', 409);
    throw err;
  }
}

const dbAll = (db, sql, params = []) => dbRun(db, sql, params);

// Baris yang dikenai INSERT/UPDATE (db_affected_rows() di api.php). mysql2 menghitung baris yang cocok (FOUND_ROWS),
// mysqli baris yang berubah: checkPostUpdate / checkSeoUpdate menyamakan keduanya
const affectedRows = (result) => Math.trunc(Number(result?.affectedRows ?? 0));

async function dbOne(db, sql, params = []) {
  const rows = await dbRun(db, sql, params);
  return rows[0] || null;
}

// ── Input (sama dengan in_str / in_int / trim di api.php) ──

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** PHP trim(): hanya " \t\n\r\0\x0B". */
const phpTrim = (s) => String(s).replace(/^[ \t\n\r\0\x0B]+|[ \t\n\r\0\x0B]+$/g, '');

/** mb_strlen(): code point, bukan unit UTF-16. */
const mbLen = (s) => [...String(s)].length;

function inStr(input, key, fallback = '') {
  const v = input[key];
  if (v === null || v === undefined) return String(fallback);
  if (typeof v === 'object') return JSON.stringify(v);
  if (typeof v === 'boolean') return v ? '1' : '0';
  return String(v);
}

// Bilangan bulat; seperti in_int di api.php jatuh ke query string
function inInt(ctx, key, fallback = 0) {
  const v = ctx.input[key] ?? ctx.query[key] ?? null;
  return isNumeric(v) ? Math.trunc(Number(v)) : fallback;
}

function isNumeric(v) {
  if (typeof v === 'number') return Number.isFinite(v);
  return typeof v === 'string' && /^[ \t\n\r\v\f]*[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?[ \t\n\r\v\f]*$/.test(v);
}

// in_flag(): true / 1 / "1" / "true"
const isFlag = (v) => v === true || v === 1 || v === '1' || v === 'true';

function clientIp(req) {
  return req.ip || req.socket?.remoteAddress || '';
}
