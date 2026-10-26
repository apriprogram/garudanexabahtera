// Penolong murni Berita & Pengumuman di panel akun (/akun/situs/:siteId/berita): isian form tulisan, slug otomatis,
// validasi yang sama dengan server (SITE_POST_LIMITS; pesan sama persis dengan validateSitePost di
// backend/modules/site_posts.js / sp_validate_post di site_posts.php), isian yang dikirim ke customer_save_site_post,
// dan teks tanggal & jumlah dilihat. Tanpa React, supaya bisa dites langsung.
import { formatDateId } from '../../../seo/format';
import { SITE_POST_SLUG_PATTERN } from '../../../templates/siteRoutes';
import {
  SITE_POST_KINDS,
  SITE_POST_LIMITS,
  type SitePostAdmin,
  type SitePostInput,
  type SitePostKind,
  type SitePostStatus,
} from '../../../types/sitePosts';

// ─── Teks per jenis tulisan ───────────────────────────────────────────────────

export interface KindCopy {
  /** "Berita" / "Pengumuman" */
  label: string;
  /** "berita" / "pengumuman" (di tengah kalimat) */
  noun: string;
  write: string;
  edit: string;
  /** Semua tulisan jenis ini (tautan kembali) */
  all: string;
  empty: string;
  emptyText: string;
  titlePlaceholder: string;
}

export const KIND_COPY: Record<SitePostKind, KindCopy> = {
  berita: {
    label: 'Berita',
    noun: 'berita',
    write: 'Tulis berita',
    edit: 'Edit berita',
    all: 'Semua berita',
    empty: 'Belum ada berita',
    emptyText:
      'Ceritakan kabar terbaru, mis. prestasi siswa atau kegiatan sekolah. Berita yang diterbitkan tampil di beranda situs, punya halaman sendiri, dan bisa muncul di Google.',
    titlePlaceholder: 'mis. Tim olimpiade sains meraih tiga medali emas',
  },
  pengumuman: {
    label: 'Pengumuman',
    noun: 'pengumuman',
    write: 'Tulis pengumuman',
    edit: 'Edit pengumuman',
    all: 'Semua pengumuman',
    empty: 'Belum ada pengumuman',
    emptyText:
      'Bagikan informasi resmi, mis. jadwal ujian, libur sekolah, atau pendaftaran siswa baru. Pengumuman yang diterbitkan tampil di beranda situs dan punya halaman sendiri.',
    titlePlaceholder: 'mis. Jadwal Penilaian Tengah Semester Ganjil',
  },
};

/** Jenis dari ?jenis= (selain "pengumuman" = berita). */
export const kindFromQuery = (value: string | null | undefined): SitePostKind => (value === 'pengumuman' ? 'pengumuman' : 'berita');

export const isPostKind = (value: unknown): value is SitePostKind => (SITE_POST_KINDS as readonly unknown[]).includes(value);

// ─── Teks & slug (sama dengan site_posts.js) ──────────────────────────────────

// Deretan spasi: \s JavaScript ditambah U+0085, U+180E, U+FEFF (SPACE_RUN di site_posts.js)
const SPACE_RUN = /[\s\u0085\u180E\uFEFF]+/gu;

/** Panjang dalam karakter (code point, sama dengan mb_strlen di server), bukan unit UTF-16. */
export const charCount = (text: string): number => Array.from(text).length;

/** Teks satu baris seperti yang disimpan server: spasi dirapatkan, tanpa spasi di tepi. */
export const cleanLine = (value: string): string => value.replace(SPACE_RUN, ' ').trim();

/** Isi tulisan seperti yang disimpan server: baris baru CRLF/CR → LF, tanpa spasi di tepi. */
export const cleanBody = (value: string): string => value.replace(/\r\n?/g, '\n').trim();

/** Potong slug ≤ max karakter di "-" terakhir yang muat (kata tidak terpotong). Sama dengan cutSlug(). */
export function cutSlug(slug: string, max: number = SITE_POST_LIMITS.slug): string {
  if (slug.length <= max) return slug;
  const at = slug.slice(0, max + 1).lastIndexOf('-');
  return (at > 0 ? slug.slice(0, at) : slug.slice(0, max)).replace(/-+$/, '');
}

/**
 * Slug dari judul: huruf kecil, diakritik dibuang, selain a-z0-9 → "-", maks 120 karakter di batas kata. Judul tanpa
 * huruf/angka Latin → fallback (jenis tulisan). Sama dengan slugFromTitle() di server.
 */
export function slugFromTitle(title: string, fallback: string): string {
  const ascii = title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]+/g, '');
  const slug = ascii.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug === '' ? fallback || 'tulisan' : cutSlug(slug);
}

/** base bila belum dipakai, selain itu base-2, base-3, … (tetap ≤ 120 karakter). Sama dengan uniqueSlug() di server. */
export function uniqueSlug(base: string, taken: readonly string[]): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let n = 2; ; n += 1) {
    const suffix = `-${n}`;
    const candidate = cutSlug(base, SITE_POST_LIMITS.slug - suffix.length) + suffix;
    if (!used.has(candidate)) return candidate;
  }
}

/** Isian slug yang sedang diketik: huruf kecil, spasi/garis bawah → "-", karakter lain dibuang. */
export function cleanSlugInput(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]+/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, SITE_POST_LIMITS.slug);
}

export const trimSlug = (slug: string): string => slug.replace(/^-+|-+$/g, '');

/**
 * Slug yang akan dipakai server: isian (dirapikan), atau dibuat dari judul dan dibuat unik terhadap tulisan lain
 * bila kosong. Dipakai untuk pratinjau alamat https://{domain}/{jenis}/{slug}.
 */
export const effectiveSlug = (draft: Pick<PostDraft, 'slug' | 'title'>, kind: SitePostKind, taken: readonly string[]): string =>
  trimSlug(draft.slug.trim()) || uniqueSlug(slugFromTitle(cleanLine(draft.title), kind), taken);

// Tautan tambahan: http(s)://, mailto:, tel:, path situs (/…, bukan // atau /\) atau #anchor; tanpa spasi, karakter
// kontrol, dan garis miring terbalik. Sama dengan LINK_PATTERN di site_posts.js
const LINK_CHAR = '[^\\s\\u0085\\u180E\\uFEFF\\x00-\\x1F\\x7F\\\\]';
const LINK_PATTERN = new RegExp(`^(?:https?://${LINK_CHAR}+|(?:mailto|tel):${LINK_CHAR}+|/(?![/\\\\])${LINK_CHAR}*|#${LINK_CHAR}*)$`, 'iu');

export const isValidPostLink = (value: string): boolean => LINK_PATTERN.test(value);

/** YYYY-MM-DD yang benar-benar ada di kalender, tahun 1000–9999 (sama dengan isDate() di server). */
export function isValidDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return y >= 1000 && date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

// ─── Isian form ───────────────────────────────────────────────────────────────

/** Isian form tulisan. Jenis & status tidak ikut: jenis tetap per tulisan, status dipilih lewat tombol simpan. */
export interface PostDraft {
  title: string;
  /** '' = dibuat dari judul */
  slug: string;
  excerpt: string;
  body: string;
  category: string;
  badge: string;
  /** '' = tanpa foto; data:image/… = foto baru; path/URL = foto tersimpan */
  image: string;
  image_alt: string;
  link_url: string;
  /** YYYY-MM-DD atau '' */
  published_at: string;
  seo_title: string;
  seo_description: string;
  noindex: boolean;
}

/** Kolom yang bisa punya pesan error (kunci sama dengan `errors` dari server). */
export type PostField = Exclude<keyof SitePostInput, 'id'>;
export type PostErrors = Partial<Record<PostField, string>>;

/** Urutan kolom di form: error pertama di urutan ini yang difokuskan. */
export const POST_FIELDS: readonly PostField[] = [
  'kind',
  'title',
  'excerpt',
  'body',
  'image',
  'image_alt',
  'category',
  'badge',
  'link_url',
  'seo_title',
  'seo_description',
  'slug',
  'noindex',
  'published_at',
  'status',
];

/** Kolom di bagian "SEO (opsional)" yang bisa dilipat: dibuka dulu sebelum fokus ke error-nya. */
export const SEO_FIELDS: ReadonlySet<PostField> = new Set<PostField>(['seo_title', 'seo_description', 'slug', 'noindex']);

export const isPostField = (key: string): key is PostField => (POST_FIELDS as readonly string[]).includes(key);

export function draftFromPost(post: SitePostAdmin | null): PostDraft {
  return {
    title: post?.title ?? '',
    slug: post?.slug ?? '',
    excerpt: post?.excerpt ?? '',
    body: post?.body ?? '',
    category: post?.category ?? '',
    badge: post?.badge ?? '',
    image: post?.image ?? '',
    image_alt: post?.image_alt ?? '',
    link_url: post?.link_url ?? '',
    published_at: post?.published_at ?? '',
    seo_title: post?.seo_title ?? '',
    seo_description: post?.seo_description ?? '',
    noindex: post?.noindex ?? false,
  };
}

/** Isian yang dikirim ke customer_save_site_post (tanpa id = tulisan baru). */
export function inputFromDraft(draft: PostDraft, kind: SitePostKind, status: SitePostStatus, id?: number): SitePostInput {
  return {
    ...(id !== undefined ? { id } : {}),
    kind,
    title: cleanLine(draft.title),
    slug: trimSlug(draft.slug.trim()),
    excerpt: cleanLine(draft.excerpt),
    body: cleanBody(draft.body),
    category: cleanLine(draft.category),
    badge: cleanLine(draft.badge),
    // Path/URL tersimpan = tidak berubah; data URI = unggah baru; kosong = hapus foto
    image: draft.image.trim() === '' ? null : draft.image,
    image_alt: cleanLine(draft.image_alt),
    link_url: draft.link_url.trim(),
    status,
    published_at: draft.published_at,
    seo_title: cleanLine(draft.seo_title),
    seo_description: cleanLine(draft.seo_description),
    noindex: draft.noindex,
  };
}

/**
 * Isian form setelah simpan berhasil. `sent` = isian saat permintaan dikirim, `current` = isian sekarang, `server` =
 * salinan dari server. Kolom yang berubah selama permintaan berjalan (mis. foto yang baru selesai diproses) tetap
 * memakai isian lokal yang lebih baru; kolom lain memakai nilai server (slug otomatis, path foto tersimpan, dst.).
 * Dipakai form tulisan dan form SEO situs.
 */
export function mergeSavedDraft<T extends object>(sent: T, current: T, server: T): T {
  if (current === sent) return server;
  const merged = { ...server };
  for (const key of Object.keys(server) as (keyof T)[]) {
    if (!Object.is(current[key], sent[key])) merged[key] = current[key];
  }
  return merged;
}

const lineError =(value: string, label: string, max: number): string | undefined =>
  charCount(cleanLine(value)) > max ? `${label} maksimal ${max} karakter.` : undefined;

export const TITLE_MIN = 3;
export const SLUG_TAKEN_MESSAGE = 'Slug sudah dipakai tulisan lain di situs ini.';

/**
 * Pemeriksaan sebelum dikirim, sama dengan validasi server (pesan sama persis). taken = slug tulisan lain di situs ini
 * (slug unik lintas jenis). {} = sah.
 */
export function validatePostDraft(draft: PostDraft, taken: readonly string[]): PostErrors {
  const L = SITE_POST_LIMITS;
  const errors: PostErrors = {};
  const set = (key: PostField, message: string | undefined) => {
    if (message && !errors[key]) errors[key] = message;
  };

  const title = charCount(cleanLine(draft.title));
  if (title === 0) set('title', 'Judul wajib diisi.');
  else if (title < TITLE_MIN) set('title', `Judul minimal ${TITLE_MIN} karakter.`);
  else if (title > L.title) set('title', `Judul maksimal ${L.title} karakter.`);

  const slug = trimSlug(draft.slug.trim());
  if (slug !== '') {
    if (charCount(slug) > L.slug) set('slug', `Slug maksimal ${L.slug} karakter.`);
    else if (!SITE_POST_SLUG_PATTERN.test(slug)) set('slug', 'Slug hanya boleh huruf kecil, angka, dan tanda hubung, contoh: juara-olimpiade-sains.');
    else if (taken.includes(slug)) set('slug', SLUG_TAKEN_MESSAGE);
  }

  set('excerpt', lineError(draft.excerpt, 'Ringkasan', L.excerpt));
  if (charCount(cleanBody(draft.body)) > L.body) set('body', 'Isi tulisan maksimal 20.000 karakter.');
  set('category', lineError(draft.category, 'Kategori', L.category));
  set('badge', lineError(draft.badge, 'Label', L.badge));
  set('image_alt', lineError(draft.image_alt, 'Teks foto', L.imageAlt));

  const link = draft.link_url.trim();
  if (link !== '') {
    if (charCount(link) > L.linkUrl) set('link_url', `Tautan tambahan maksimal ${L.linkUrl} karakter.`);
    else if (!isValidPostLink(link)) set('link_url', 'Tautan tambahan harus diawali https://, http://, mailto:, tel:, / atau #.');
  }

  if (draft.published_at !== '' && !isValidDate(draft.published_at)) set('published_at', 'Tanggal harus tanggal yang valid (YYYY-MM-DD).');

  set('seo_title', lineError(draft.seo_title, 'Judul SEO', L.seoTitle));
  set('seo_description', lineError(draft.seo_description, 'Deskripsi SEO', L.seoDescription));
  return errors;
}

/** Foto berupa SVG (data URI): tidak dipakai untuk foto tulisan / gambar SEO (server hanya menerima raster). */
export const isSvgDataUri = (value: string): boolean => /^data:image\/svg\+xml[;,]/i.test(value.trim());

export const SVG_PHOTO_ERROR = 'SVG tidak bisa dipakai untuk foto. Gunakan foto JPG, PNG, atau WEBP.';

// ─── Tampilan daftar ──────────────────────────────────────────────────────────

const NUMBER = new Intl.NumberFormat('id-ID');

/** Angka dengan pemisah ribuan Indonesia: 12345 → "12.345". */
export const formatCount = (value: number): string => NUMBER.format(value);

/** "Belum pernah dilihat" / "Dilihat 1.234 kali". */
export const viewsLabel = (count: number): string => (count > 0 ? `Dilihat ${formatCount(count)} kali` : 'Belum pernah dilihat');

const RELATIVE = new Intl.RelativeTimeFormat('id-ID', { numeric: 'auto' });
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Waktu relatif: "baru saja", "5 menit yang lalu", "kemarin", "3 hari yang lalu"; lebih dari 30 hari → tanggal
 * ("12 Oktober 2026", WIB). Tidak valid → null. `now` = waktu sekarang (ms), dikirim pemanggil supaya render tetap murni.
 */
export function relativeTime(iso: string | null | undefined, now: number): string | null {
  const time = iso ? Date.parse(iso) : Number.NaN;
  if (Number.isNaN(time)) return null;
  const diff = time - now;
  const abs = Math.abs(diff);
  if (abs < MINUTE) return 'baru saja';
  if (abs < HOUR) return RELATIVE.format(Math.round(diff / MINUTE), 'minute');
  if (abs < DAY) return RELATIVE.format(Math.round(diff / HOUR), 'hour');
  if (abs < 30 * DAY) return RELATIVE.format(Math.round(diff / DAY), 'day');
  return formatDateId(new Date(time + 7 * HOUR).toISOString().slice(0, 10));
}

/** Tanggal tampil tulisan: "23 Oktober 2026", atau null bila belum bertanggal. */
export const postDate = (post: Pick<SitePostAdmin, 'published_at'>): string | null =>
  post.published_at && isValidDate(post.published_at) ? formatDateId(post.published_at) : null;

/** Waktu sekarang (ms). Dipakai sebagai initializer useState, supaya render tidak memanggil Date.now(). */
export const currentTime = (): number => Date.now();

/** Tulisan hasil simpan → daftar: ganti yang sama id-nya, atau tambahkan di atas. */
export const upsertPost = (posts: readonly SitePostAdmin[], post: SitePostAdmin): SitePostAdmin[] =>
  posts.some((item) => item.id === post.id) ? posts.map((item) => (item.id === post.id ? post : item)) : [post, ...posts];
