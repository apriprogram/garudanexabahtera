// Guide articles /panduan and /panduan/{slug} (docs/platform/SEO-PLAN.md §5.8) for backend/server.js: the public list
// and article, page views, and the admin tab Panduan (create, edit, publish, delete). Tables guide_articles +
// guide_views (database/migrations/2026-10-24_017_guide_articles.sql). JSON shapes and limits =
// src/content/panduan/core.ts (ArticleSummary, Article, AdminGuide, GuideInput, GUIDE_LIMITS, ARTICLE_CTAS).
// backend/modules/guides.php implements the same actions for the PHP backend: keep both identical (action names, input
// validation, JSON shapes, HTTP status codes and `code` values); __tests__/backend/guides.test.ts runs both.
//
// server.js calls handleGuideAction() in its /api.php GET and POST handlers, after the access check (createAuthGate in
// security.js sets req.user): get_guides, get_guide and guide_view are in PUBLIC_ACTIONS, the admin_* actions in
// ADMIN_ACTIONS; the handlers re-check the admin role as a second line.
//
// Terbit = `reviewed` terisi (tanggal artikel selesai disunting dan dicek faktanya oleh manusia); reviewed NULL = draf,
// hanya tampil di panel admin. Panjang dihitung dalam karakter ([...s].length = code point, sama dengan mb_strlen di
// guides.php).
import { createLimiter } from '../security.js';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/;
// URL sumber: http(s):// lalu tanpa spasi. Kelas spasi ditulis lengkap (\s JavaScript ditambah U+0085, U+180E, U+FEFF),
// karena \s PHP dan JavaScript berbeda di tiga karakter itu; sama dengan GD_SOURCE_PATTERN di guides.php
const SOURCE_PATTERN = /^https?:\/\/[^\s\u0085\u180E\uFEFF]+$/u;
// Deretan spasi di judul (kelas yang sama dengan SOURCE_PATTERN), untuk cek judul ganda; sama dengan GD_SPACE_RUN
const SPACE_RUN = /[\s\u0085\u180E\uFEFF]+/gu;
// Sama dengan GUIDE_LIMITS (src/content/panduan/core.ts)
export const GUIDE_LIMITS = Object.freeze({
  slugMax: 120,
  titleMin: 10,
  titleMax: 60,
  descriptionMin: 50,
  descriptionMax: 155,
  bodyMin: 200,
  authorMax: 120,
  sourcesMax: 30,
  relatedMax: 10,
});
// Batas server tambahan (tidak ada di GUIDE_LIMITS): isi artikel ≤ 200.000 karakter (kolom MEDIUMTEXT jauh lebih
// besar; ini menahan kiriman yang tidak wajar), satu URL sumber ≤ 500 karakter (30 URL tetap muat di kolom TEXT)
const BODY_MAX = 200000;
const SOURCE_MAX = 500;
const CTAS = ['template', 'website', 'mobile']; // ARTICLE_CTAS
const HUB_PAGE = '/panduan';
const VIEWS_PER_HOUR = 300; // halaman dilihat per IP per jam, sama dengan GD_VIEWS_PER_HOUR (dan template_view)
const JAKARTA_OFFSET_MS = 7 * 3600 * 1000; // Asia/Jakarta, UTC+7 tanpa musim panas
const NOT_FOUND = 'Artikel tidak ditemukan.';
const GENERIC_ERROR = 'Terjadi kesalahan pada server. Silakan coba lagi.';

// Baca boleh lewat GET (query string) maupun POST; aksi lain hanya POST
const GET_ACTIONS = new Set(['get_guides', 'get_guide', 'admin_get_guides']);

const guideViewLimiter = createLimiter(3600 * 1000, VIEWS_PER_HOUR);

/** Galat yang pesannya aman ditampilkan (peran ApiError di api.php). `errors` = pesan per kolom. */
export class GuideError extends Error {
  constructor(message, status = 400, code = null, errors = null, headers = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.errors = errors;
    this.headers = headers;
  }
}

const HANDLERS = Object.freeze({
  // publik
  get_guides: getGuides,
  get_guide: getGuide,
  guide_view: guideView,
  // admin (ADMIN_ACTIONS)
  admin_get_guides: adminGetGuides,
  admin_save_guide: adminSaveGuide,
  admin_delete_guide: adminDeleteGuide,
});

export const GUIDE_ACTIONS = Object.freeze(Object.keys(HANDLERS));

/**
 * Menjalankan aksi panduan. false bila `action` bukan milik modul ini (server.js lanjut), true bila jawaban sudah
 * dikirim. Tidak pernah melempar: setiap galat menjadi jawaban JSON. Nama aksi di-trim seperti actionOf() di
 * security.js dan api.php, jadi aksi yang dijalankan sama dengan yang dicek gerbang akses.
 */
export async function handleGuideAction(action, params, req, res, pool) {
  const name = typeof action === 'string' ? action.trim() : '';
  if (!Object.hasOwn(HANDLERS, name)) return false;
  try {
    if (req.method !== 'POST' && !GET_ACTIONS.has(name)) {
      throw new GuideError('Gunakan metode POST untuk aksi ini.', 405, 'METHOD_NOT_ALLOWED');
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
  if (err instanceof GuideError) {
    if (err.headers) res.set(err.headers);
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
// Publik
// ════════════════════════════════════════════════════════════════════════════

// Artikel terbit (tanpa isi, sumber dan artikel terkait), terbaru dulu: { guides: ArticleSummary[] }
async function getGuides({ pool }) {
  const rows = await dbAll(pool, `SELECT slug, title, description, author, date_published, date_modified, reviewed
                                  FROM guide_articles WHERE reviewed IS NOT NULL`);
  return { guides: sortGuides(rows.map(summaryOut)) };
}

// Satu artikel terbit lengkap dengan isi: { guide: Article }. Draf, slug tidak dikenal atau tidak sah → 404.
// related hanya berisi artikel yang terbit (urutan tetap), jadi slug draf tidak terbuka ke publik; aksi admin tetap
// memakai daftar lengkap.
async function getGuide({ pool, input }) {
  const slug = phpTrim(inStr(input, 'slug'));
  const row = isSlug(slug) ? await publishedRow(pool, slug) : null;
  if (!row) throw notFound();
  const guide = articleOut(row);
  if (guide.related.length) {
    const published = (await dbAll(pool, 'SELECT slug FROM guide_articles WHERE reviewed IS NOT NULL')).map((r) => String(r.slug));
    guide.related = filterSlugs(guide.related, published);
  }
  return { guide };
}

// Halaman /panduan atau /panduan/{slug} dibuka: +1 (sekali per sesi browser), dibatasi per IP seperti template_view.
// { views: jumlah dilihat halaman itu }
async function guideView({ pool, input, req }) {
  const limit = `gd-view|${clientIp(req)}`;
  const wait = guideViewLimiter.retryAfter(limit);
  if (wait) tooManyAttempts(wait);
  const page = await viewPage(pool, input.page ?? null);
  guideViewLimiter.hit(limit);
  await dbRun(pool, 'INSERT INTO guide_views (page, view_count) VALUES (?, 1) ON DUPLICATE KEY UPDATE view_count = view_count + 1', [page]);
  return { views: Number((await dbOne(pool, 'SELECT view_count FROM guide_views WHERE page = ?', [page])).view_count) };
}

/** Halaman yang dihitung: persis "/panduan" atau "/panduan/{slug}" artikel terbit; selain itu 404. */
async function viewPage(pool, page) {
  const slug = typeof page === 'string' ? pageSlug(page) : null;
  if (slug === '') return HUB_PAGE;
  if (slug === null || !(await publishedRow(pool, slug))) throw notFound();
  return `${HUB_PAGE}/${slug}`;
}

/** "/panduan" → '' (daftar), "/panduan/{slug}" → slug, selain itu null. Tanpa trim: path harus persis. */
export function pageSlug(page) {
  if (page === HUB_PAGE) return '';
  const prefix = `${HUB_PAGE}/`;
  if (!page.startsWith(prefix)) return null;
  const slug = page.slice(prefix.length);
  return isSlug(slug) ? slug : null;
}

const publishedRow = (pool, slug) => dbOne(pool, 'SELECT * FROM guide_articles WHERE slug = ? AND reviewed IS NOT NULL LIMIT 1', [slug]);

// ════════════════════════════════════════════════════════════════════════════
// Admin (tab Panduan; ADMIN_ACTIONS)
// ════════════════════════════════════════════════════════════════════════════

// Semua artikel (draf juga), urutan sama dengan get_guides, dengan jumlah dilihat:
// { guides: AdminGuide[], hubViews: jumlah dilihat /panduan }
async function adminGetGuides({ pool, user }) {
  requireAdmin(user);
  const views = await viewCounts(pool);
  const guides = (await dbAll(pool, 'SELECT * FROM guide_articles')).map((row) => adminOut(row, views));
  return { guides: sortGuides(guides), hubViews: views.get(HUB_PAGE) ?? 0 };
}

// Tambah (tanpa id) atau ubah artikel dari GuideInput: { guide: AdminGuide }. dateModified dan reviewed diisi server
// (deriveGuideDates); slug yang berganti membawa jumlah dilihatnya ke alamat baru dan ikut diganti di `related` artikel
// lain. Sama dengan gd_admin_save_guide().
async function adminSaveGuide(ctx) {
  const { pool, input, user } = ctx;
  requireAdmin(user);
  let id = inInt(ctx, 'id');
  let existing = null;
  if (id > 0) {
    existing = await dbOne(pool, 'SELECT * FROM guide_articles WHERE id = ? LIMIT 1', [id]);
    if (!existing) throw notFound();
  }
  const today = jakartaToday();
  const [guide, errors] = validateGuideInput(input, today);
  const keys = Object.keys(errors);
  if (keys.length) throw new GuideError(errors[keys[0]], 400, 'VALIDATION', errors);
  if (await dbOne(pool, 'SELECT id FROM guide_articles WHERE slug = ? AND id <> ? LIMIT 1', [guide.slug, id])) {
    throw new GuideError('Slug sudah dipakai artikel lain.', 409, 'SLUG_TAKEN', { slug: 'Slug sudah dipakai artikel lain.' });
  }
  // Judul ganda membuat cek prerender gagal ("title ganda") di setiap deploy. Dibandingkan dengan semua artikel, draf
  // juga, supaya menerbitkan draf nanti tidak bentrok
  const key = titleKey(guide.title);
  for (const other of await dbAll(pool, 'SELECT title FROM guide_articles WHERE id <> ?', [id])) {
    if (titleKey(String(other.title)) === key) {
      throw new GuideError('Judul sudah dipakai artikel lain.', 409, 'TITLE_TAKEN', { title: 'Judul sudah dipakai artikel lain.' });
    }
  }
  const dates = deriveGuideDates(existing ? adminOut(existing, new Map()) : null, guide, today);
  const values = [
    guide.slug, guide.title, guide.description, guide.body, guide.author, guide.cta,
    JSON.stringify(guide.sources), JSON.stringify(guide.related), guide.datePublished, dates.dateModified, dates.reviewed,
  ];
  const page = `${HUB_PAGE}/${guide.slug}`;
  await withTransaction(pool, async (db) => {
    if (existing) {
      await dbRun(db, `UPDATE guide_articles SET slug = ?, title = ?, description = ?, body = ?, author = ?, cta = ?, sources = ?,
                       related = ?, date_published = ?, date_modified = ?, reviewed = ? WHERE id = ?`, [...values, id]);
      if (existing.slug !== guide.slug) {
        // Jumlah dilihat pindah ke alamat baru (baris lama di alamat baru, bila ada, bukan milik artikel ini)
        await dbRun(db, 'DELETE FROM guide_views WHERE page = ?', [page]);
        await dbRun(db, 'UPDATE guide_views SET page = ? WHERE page = ?', [page, `${HUB_PAGE}/${existing.slug}`]);
        await rewriteRelated(db, id, existing.slug, guide.slug);
      }
    } else {
      const result = await dbRun(db, `INSERT INTO guide_articles (slug, title, description, body, author, cta, sources, related,
                                      date_published, date_modified, reviewed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, values);
      id = Number(result.insertId);
      // Artikel baru mulai dari 0 dilihat
      await dbRun(db, 'DELETE FROM guide_views WHERE page = ?', [page]);
    }
  });
  const row = await dbOne(pool, 'SELECT * FROM guide_articles WHERE id = ? LIMIT 1', [id]);
  const count = await dbOne(pool, 'SELECT view_count FROM guide_views WHERE page = ?', [page]);
  return { guide: adminOut(row, new Map(count ? [[page, Number(count.view_count)]] : [])) };
}

// Hapus artikel beserta jumlah dilihatnya; slugnya dibuang dari `related` artikel lain: {}
async function adminDeleteGuide(ctx) {
  const { pool, user } = ctx;
  requireAdmin(user);
  const id = inInt(ctx, 'id');
  const row = id > 0 ? await dbOne(pool, 'SELECT id, slug FROM guide_articles WHERE id = ? LIMIT 1', [id]) : null;
  if (!row) throw notFound();
  await withTransaction(pool, async (db) => {
    await dbRun(db, 'DELETE FROM guide_articles WHERE id = ?', [id]);
    await dbRun(db, 'DELETE FROM guide_views WHERE page = ?', [`${HUB_PAGE}/${row.slug}`]);
    await rewriteRelated(db, id, String(row.slug), null);
  });
  return {};
}

/**
 * Di dalam transaksi simpan/hapus: slug `from` di `related` artikel lain (selain `id`) diganti `to`, atau dibuang bila
 * `to` null. Hanya baris yang memuat `from` yang ditulis ulang (JSON.stringify = gd_json). Sama dengan
 * gd_rewrite_related() di guides.php.
 */
async function rewriteRelated(db, id, from, to) {
  for (const r of await dbAll(db, 'SELECT id, related FROM guide_articles WHERE id <> ? FOR UPDATE', [id])) {
    const related = jsonList(r.related);
    if (!related.includes(from)) continue;
    await dbRun(db, 'UPDATE guide_articles SET related = ? WHERE id = ?', [JSON.stringify(renameRelated(related, from, to)), Number(r.id)]);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Validasi & aturan tanggal (fungsi murni, dites berdampingan dengan guides.php)
// ════════════════════════════════════════════════════════════════════════════

/**
 * GuideInput → [artikel ternormalisasi, pesan galat per kolom]. Kunci galat = kunci GuideInput, urutan pengecekan sama
 * dengan gd_validate_input() di guides.php (pesan pertama menjadi `error`). today = YYYY-MM-DD (Asia/Jakarta).
 * Hasil: slug, title, description, body (baris CRLF/CR → LF, di-trim), author, cta, sources (dirapikan, tanpa kosong &
 * ganda), related (sama), datePublished, published (boolean).
 */
export function validateGuideInput(input, today) {
  const errors = {};
  const slug = text(input, 'slug', 'Slug', errors);
  if (slug !== null) {
    if (slug === '') errors.slug = 'Slug wajib diisi.';
    else if (mbLen(slug) > GUIDE_LIMITS.slugMax) errors.slug = `Slug maksimal ${GUIDE_LIMITS.slugMax} karakter.`;
    else if (!SLUG_PATTERN.test(slug)) errors.slug = 'Slug hanya boleh huruf kecil, angka, dan tanda hubung, contoh: biaya-website-company-profile.';
  }
  const title = sizedText(input, 'title', 'Judul', GUIDE_LIMITS.titleMin, GUIDE_LIMITS.titleMax, errors);
  const description = sizedText(input, 'description', 'Deskripsi', GUIDE_LIMITS.descriptionMin, GUIDE_LIMITS.descriptionMax, errors);

  let body = null;
  const rawBody = input.body ?? null;
  if (rawBody !== null && typeof rawBody !== 'string') {
    errors.body = 'Isi artikel tidak valid.';
  } else {
    // Disimpan sudah di-trim, sama dengan formulir admin: isi yang hanya beda baris baru di akhir tidak terhitung berubah
    body = phpTrim((rawBody ?? '').replace(/\r\n?/g, '\n'));
    const length = mbLen(body);
    if (length === 0) errors.body = 'Isi artikel wajib diisi.';
    else if (length < GUIDE_LIMITS.bodyMin) errors.body = `Isi artikel minimal ${GUIDE_LIMITS.bodyMin} karakter.`;
    else if (length > BODY_MAX) errors.body = 'Isi artikel maksimal 200.000 karakter.';
  }

  const author = sizedText(input, 'author', 'Penulis', 1, GUIDE_LIMITS.authorMax, errors);
  let cta = input.cta ?? null;
  if (typeof cta !== 'string' || !CTAS.includes(cta)) {
    errors.cta = 'Pilih ajakan di akhir artikel: template, website, atau mobile.';
    cta = null;
  }

  const sources = [];
  let list = phpList(input.sources ?? null);
  if (list === null) {
    errors.sources = 'Sumber harus berupa daftar URL.';
  } else {
    for (const [i, item] of list.entries()) {
      if (typeof item !== 'string') {
        errors.sources = 'Sumber harus berupa daftar URL.';
        break;
      }
      const url = phpTrim(item);
      if (url === '') continue;
      if (mbLen(url) > SOURCE_MAX) {
        errors.sources = `Sumber ke-${i + 1} terlalu panjang (maksimal ${SOURCE_MAX} karakter).`;
        break;
      }
      if (!SOURCE_PATTERN.test(url)) {
        errors.sources = `Sumber ke-${i + 1} harus URL lengkap yang diawali http:// atau https://.`;
        break;
      }
      if (!sources.includes(url)) sources.push(url);
    }
    if (!('sources' in errors) && sources.length > GUIDE_LIMITS.sourcesMax) errors.sources = `Sumber maksimal ${GUIDE_LIMITS.sourcesMax} URL.`;
  }

  const related = [];
  list = phpList(input.related ?? null);
  if (list === null) {
    errors.related = 'Artikel terkait harus berupa daftar slug.';
  } else {
    for (const [i, item] of list.entries()) {
      if (typeof item !== 'string') {
        errors.related = 'Artikel terkait harus berupa daftar slug.';
        break;
      }
      const other = phpTrim(item);
      if (other === '') continue;
      if (!isSlug(other)) {
        errors.related = `Artikel terkait ke-${i + 1} bukan slug yang valid.`;
        break;
      }
      if (other === slug) {
        errors.related = 'Artikel terkait tidak boleh artikel ini sendiri.';
        break;
      }
      if (!related.includes(other)) related.push(other);
    }
    if (!('related' in errors) && related.length > GUIDE_LIMITS.relatedMax) errors.related = `Artikel terkait maksimal ${GUIDE_LIMITS.relatedMax}.`;
  }

  const datePublished = text(input, 'datePublished', 'Tanggal terbit', errors);
  if (datePublished !== null) {
    if (datePublished === '') errors.datePublished = 'Tanggal terbit wajib diisi.';
    else if (!isDate(datePublished)) errors.datePublished = 'Tanggal terbit harus tanggal yang valid (YYYY-MM-DD).';
    else if (datePublished > today) errors.datePublished = 'Tanggal terbit tidak boleh setelah hari ini.';
  }

  return [{
    slug,
    title,
    description,
    body,
    author,
    cta,
    sources,
    related,
    datePublished,
    published: isFlag(input.published),
  }, errors];
}

/**
 * dateModified dan reviewed yang disimpan. existing = artikel lama (bentuk AdminGuide) atau null untuk artikel baru.
 * - dateModified = hari ini untuk artikel baru atau bila judul, deskripsi, isi atau sumber berubah; selain itu tetap.
 *   Isi lama dibandingkan setelah di-trim (artikel awal dari migrasi tersimpan dengan baris baru di akhir).
 *   Tidak pernah sebelum datePublished (dinaikkan ke datePublished).
 * - reviewed = terbit ? (reviewed lama ?? hari ini) : null.
 */
export function deriveGuideDates(existing, guide, today) {
  const changed = existing === null
    || existing.title !== guide.title
    || existing.description !== guide.description
    || phpTrim(existing.body) !== guide.body
    || JSON.stringify(existing.sources) !== JSON.stringify(guide.sources);
  let modified = changed ? today : existing.dateModified;
  if (modified < guide.datePublished) modified = guide.datePublished;
  return { dateModified: modified, reviewed: guide.published ? (existing?.reviewed ?? today) : null };
}

const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** Terbaru dulu: datePublished, lalu dateModified (turun), seri → slug A-Z. Sama dengan sortArticles (core.ts). */
export function sortGuides(guides) {
  return [...guides].sort(
    (a, b) => compare(b.datePublished, a.datePublished) || compare(b.dateModified, a.dateModified) || compare(a.slug, b.slug),
  );
}

/**
 * Kunci pembanding judul ganda: deretan spasi (SPACE_RUN) jadi satu spasi, di-trim, huruf kecil Unicode (toLowerCase).
 * Sama dengan gd_title_key() di guides.php (beda yang diketahui hanya sigma akhir kata Yunani di PHP < 8.3).
 */
export const titleKey = (title) => phpTrim(String(title).replace(SPACE_RUN, ' ')).toLowerCase();

/** `from` di daftar related diganti `to` (null = dibuang); urutan tetap, tanpa ganda. Sama dengan gd_rename_related(). */
export function renameRelated(related, from, to) {
  const out = [];
  for (const slug of related) {
    const next = slug === from ? to : slug;
    if (next !== null && !out.includes(next)) out.push(next);
  }
  return out;
}

/** Slug di `slugs` yang ada di `allowed`, urutan `slugs` tetap. Sama dengan gd_filter_slugs(). */
export const filterSlugs = (slugs, allowed) => slugs.filter((slug) => allowed.includes(slug));

const isSlug = (value) => typeof value === 'string' && value !== '' && value.length <= GUIDE_LIMITS.slugMax && SLUG_PATTERN.test(value);

/** YYYY-MM-DD yang benar-benar ada di kalender, tahun 1000–9999 (rentang kolom DATE); sama dengan gd_is_date(). */
function isDate(value) {
  const m = DATE_PATTERN.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return y >= 1000 && date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

/** Hari ini di Asia/Jakarta (YYYY-MM-DD). */
export const jakartaToday = () => new Date(Date.now() + JAKARTA_OFFSET_MS).toISOString().slice(0, 10);

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

// Teks wajib dengan panjang min–max karakter
function sizedText(input, key, label, min, max, errors) {
  const value = text(input, key, label, errors);
  if (value === null) return null;
  const length = mbLen(value);
  if (length === 0) errors[key] = `${label} wajib diisi.`;
  else if (length < min) errors[key] = `${label} minimal ${min} karakter.`;
  else if (length > max) errors[key] = `${label} maksimal ${max} karakter.`;
  return value;
}

// Daftar JSON seperti gd_list(): array, atau objek berkunci "0".."n-1" (json_decode PHP menjadikannya daftar);
// tidak ada → []; selain itu null
function phpList(value) {
  if (value === null) return [];
  if (Array.isArray(value)) return value;
  if (!isPlainObject(value)) return null;
  const keys = Object.keys(value);
  return keys.every((key, i) => key === String(i)) ? keys.map((key) => value[key]) : null;
}

// Kolom JSON daftar teks → array (rusak/bukan daftar → [])
function jsonList(value) {
  let list = null;
  try {
    list = typeof value === 'string' ? JSON.parse(value) : null;
  } catch {
    list = null;
  }
  const items = Array.isArray(list) ? list : isPlainObject(list) ? Object.values(list) : [];
  return items.filter((item) => typeof item === 'string');
}

function requireAdmin(user) {
  if (!user) throw new GuideError('Sesi tidak valid atau sudah berakhir. Silakan login kembali.', 401, 'UNAUTHORIZED');
  if (user.role !== 'admin') throw new GuideError('Akses ditolak: hanya admin.', 403, 'FORBIDDEN');
  return user;
}

const notFound = () => new GuideError(NOT_FOUND, 404, 'GUIDE_NOT_FOUND');

function tooManyAttempts(seconds) {
  throw new GuideError(`Terlalu banyak percobaan. Coba lagi dalam ${Math.max(1, Math.ceil(seconds / 60))} menit.`, 429, null, null,
    { 'Retry-After': String(seconds) });
}

/** Jumlah dilihat per halaman (page → n). */
async function viewCounts(pool) {
  return new Map((await dbAll(pool, 'SELECT page, view_count FROM guide_views')).map((r) => [r.page, Number(r.view_count)]));
}

// ── Bentuk JSON (src/content/panduan/core.ts) ──

/** ArticleSummary (urutan kunci = SUMMARY_KEYS). */
const summaryOut = (r) => ({
  slug: String(r.slug),
  title: String(r.title),
  description: String(r.description),
  author: String(r.author),
  datePublished: String(r.date_published),
  dateModified: String(r.date_modified),
  reviewed: r.reviewed === null ? null : String(r.reviewed),
});

/** Article: ringkasan + cta, sources, related, body. */
const articleOut = (r) => ({
  ...summaryOut(r),
  cta: String(r.cta),
  sources: jsonList(r.sources),
  related: jsonList(r.related),
  body: String(r.body),
});

/** AdminGuide: id + Article + views (/panduan/{slug} di views), createdAt, updatedAt. */
const adminOut = (r, views) => ({
  id: Number(r.id),
  ...articleOut(r),
  views: views.get(`${HUB_PAGE}/${r.slug}`) ?? 0,
  createdAt: String(r.created_at),
  updatedAt: String(r.updated_at),
});

// ── Database (setiap nilai di-bind; tanggal kembali sebagai teks seperti mysqli) ──

async function dbRun(db, sql, params = []) {
  try {
    const [result] = await db.query({ sql, values: params, dateStrings: true });
    return result;
  } catch (err) {
    if (err && (err.code === 'ER_DUP_ENTRY' || err.errno === 1062)) throw new GuideError('Data yang sama sudah ada (duplikat).', 409);
    throw err;
  }
}

const dbAll = (db, sql, params = []) => dbRun(db, sql, params);

async function dbOne(db, sql, params = []) {
  const rows = await dbRun(db, sql, params);
  return rows[0] || null;
}

// Satu koneksi untuk seluruh transaksi (seperti koneksi mysqli tunggal di PHP)
async function withTransaction(pool, fn) {
  const db = await pool.getConnection();
  try {
    await db.beginTransaction();
    try {
      await fn(db);
      await db.commit();
    } catch (err) {
      await db.rollback();
      throw err;
    }
  } finally {
    db.release();
  }
}

// ── Input (sama dengan in_str / in_int / in_flag / trim di api.php) ──

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
