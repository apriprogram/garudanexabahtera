// Penolong murni tab Panduan (Pengaturan website → Panduan): isian form artikel, slug otomatis, validasi yang sama
// dengan server (GUIDE_LIMITS, URL sumber, judul ganda, token data), isian yang dikirim ke admin_save_guide, baris
// admin_get_guides yang dirapikan, dan `related` yang ikut slug yang diganti/dihapus. Tanpa React, supaya bisa dites
// langsung.
import { AUTHORS, DEFAULT_AUTHOR_NAME } from '../../../content/authors';
import { ARTICLE_CTAS, GUIDE_LIMITS, type AdminGuide, type ArticleCta, type GuideInput } from '../../../content/panduan/core';
import { PLACEHOLDER_NAMES, placeholderProblems } from '../../../content/panduan/placeholders';
import { wibDate } from '../../../content/pricing';
import { PLANNED_ARTICLE_SLUGS } from '../../../seo/paths';

/** Label ajakan di akhir artikel (select di form). */
export const CTA_LABEL: Record<ArticleCta, string> = {
  template: 'Template siap pakai',
  website: 'Website custom',
  mobile: 'Aplikasi mobile',
};

/** Nama penulis yang terdaftar (src/content/authors.ts), urutan tetap. */
export const AUTHOR_NAMES: readonly string[] = Object.keys(AUTHORS);

/** Isian form: sama dengan GuideInput, kecuali sumber yang masih berupa teks (satu URL per baris). */
export interface GuideDraft {
  title: string;
  slug: string;
  description: string;
  body: string;
  author: string;
  cta: ArticleCta;
  /** Teks textarea "Sumber": satu URL per baris */
  sources: string;
  /** Slug artikel terkait, urutan dipilih */
  related: string[];
  /** YYYY-MM-DD */
  datePublished: string;
  published: boolean;
}

/** Kolom form yang bisa punya pesan error (kunci sama dengan `errors` dari server). */
export type GuideField = Exclude<keyof GuideInput, 'id'>;
export type GuideErrors = Partial<Record<GuideField, string>>;

/** Urutan kolom di form: error pertama di urutan ini yang difokuskan. */
export const GUIDE_FIELDS: readonly GuideField[] = [
  'title',
  'slug',
  'description',
  'body',
  'cta',
  'author',
  'datePublished',
  'sources',
  'related',
  'published',
];

export const isGuideField = (key: string): key is GuideField => (GUIDE_FIELDS as readonly string[]).includes(key);

/** Slug sah: huruf kecil a-z, angka, dipisah satu "-" (sama dengan slug template). */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Hari ini di WIB (UTC+7), YYYY-MM-DD: batas atas tanggal terbit, sama dengan tanggal di situs. */
export const todayWib = (now: Date = new Date()): string => wibDate(now.toISOString()) ?? now.toISOString().slice(0, 10);

/** Panjang teks dalam karakter (code point, sama dengan mb_strlen di server), bukan unit UTF-16. */
export const charCount = (text: string): number => Array.from(text).length;

/** Angka dengan pemisah ribuan Indonesia: 12345 → "12.345". */
export const formatCount = (value: number): string => new Intl.NumberFormat('id-ID').format(value);

/** Buang tanda aksen (é → e) supaya judul berbahasa apa pun menghasilkan slug a-z. */
const stripAccents = (text: string): string => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Slug dari judul: "Biaya Website & Hosting 2026" → "biaya-website-hosting-2026". */
export function slugify(title: string): string {
  return stripAccents(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, GUIDE_LIMITS.slugMax)
    .replace(/-+$/, '');
}

/**
 * Isian slug yang sedang diketik: huruf kecil, spasi/garis bawah → "-", karakter lain dibuang. Strip di ujung dibiarkan
 * selama mengetik (dirapikan saat kolom ditinggalkan, lihat trimSlug).
 */
export function cleanSlugInput(value: string): string {
  return stripAccents(value)
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, GUIDE_LIMITS.slugMax);
}

export const trimSlug = (slug: string): string => slug.replace(/^-+|-+$/g, '');

/** URL sumber per baris (kosong dilewati, ganda dibuang). */
export function parseSources(text: string): string[] {
  const seen = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const url = line.trim();
    if (url) seen.add(url);
  }
  return [...seen];
}

/** Panjang maks. satu URL sumber: SOURCE_MAX di guides.js (GD_SOURCE_MAX di guides.php), tidak ada di GUIDE_LIMITS. */
export const SOURCE_MAX = 500;

/** URL sumber yang diterima server: sama persis dengan SOURCE_PATTERN di guides.js (GD_SOURCE_PATTERN di guides.php). */
const SOURCE_PATTERN = /^https?:\/\/[^\s\u0085\u180E\uFEFF]+$/u;

/** Pola server, ditambah host bertitik (lebih ketat dari server, jadi yang lolos di sini tidak ditolak server). */
const isSourceUrl = (value: string): boolean => {
  if (!SOURCE_PATTERN.test(value)) return false;
  try {
    return new URL(value).hostname.includes('.');
  } catch {
    return false;
  }
};

/**
 * Kunci pembanding judul ganda: deretan spasi jadi satu spasi, di-trim, huruf kecil. Sama dengan titleKey() di
 * guides.js (gd_title_key() di guides.php): dua artikel berjudul sama membuat cek prerender gagal di setiap deploy.
 */
export const titleKey = (title: string): string => title.replace(/[\s\u0085\u180E\uFEFF]+/gu, ' ').trim().toLowerCase();

/**
 * Contoh token data yang sah untuk petunjuk kolom isi (PLACEHOLDER_NAMES, urutan tetap). Token yang ditolak tanpa
 * argumen ({{template}}, {{harga}}) ditulis dengan argumen slug template.
 */
export const PLACEHOLDER_EXAMPLES: readonly string[] = PLACEHOLDER_NAMES.map((name) =>
  placeholderProblems(`{{${name}}}`).length > 0 ? `{{${name}:slug-template}}` : `{{${name}}}`,
);

/** Halaman situs yang menautkan 4 slug artikel pertama (PLANNED_ARTICLE_SLUGS), untuk peringatan ganti slug/hapus. */
export const LINKING_PAGES = 'halaman /harga, halaman jasa, halaman kategori, dan halaman template';

/** Slug yang ditautkan kode situs (PLANNED_ARTICLE_SLUGS): mengganti/menghapusnya memutus tautan dari LINKING_PAGES. */
export const isLinkedSlug = (slug: string): boolean => (PLANNED_ARTICLE_SLUGS as readonly string[]).includes(slug);

/** `from` di daftar related diganti `to` (null = dibuang); urutan tetap, tanpa ganda. Sama dengan renameRelated() di guides.js. */
export function renameRelated(related: readonly string[], from: string, to: string | null): string[] {
  const out: string[] = [];
  for (const slug of related) {
    const next = slug === from ? to : slug;
    if (next !== null && !out.includes(next)) out.push(next);
  }
  return out;
}

/**
 * Daftar admin setelah slug `from` diganti `to` (simpan) atau dihapus (to null): `related` artikel lain ikut berubah,
 * sama dengan yang dilakukan server di transaksi simpan/hapus, tanpa memuat ulang daftar.
 */
export const relinkGuides = (guides: readonly AdminGuide[], from: string, to: string | null): AdminGuide[] =>
  guides.map((guide) => (guide.related.includes(from) ? { ...guide, related: renameRelated(guide.related, from, to) } : guide));

/** Isian awal form: artikel baru (guide null) atau artikel yang diedit. Artikel terkait yang sudah dihapus dibuang. */
export function draftFromGuide(guide: AdminGuide | null, others: readonly AdminGuide[], today: string = todayWib()): GuideDraft {
  if (!guide) {
    return {
      title: '',
      slug: '',
      description: '',
      body: '',
      author: DEFAULT_AUTHOR_NAME,
      cta: 'template',
      sources: '',
      related: [],
      datePublished: today,
      published: false,
    };
  }
  const known = new Set(others.map((other) => other.slug));
  return {
    title: guide.title,
    slug: guide.slug,
    description: guide.description,
    body: guide.body,
    author: guide.author || DEFAULT_AUTHOR_NAME,
    cta: guide.cta,
    sources: guide.sources.join('\n'),
    related: guide.related.filter((slug) => known.has(slug)),
    datePublished: guide.datePublished || today,
    published: Boolean(guide.reviewed),
  };
}

/** Isian yang dikirim ke admin_save_guide (tanpa id = artikel baru). */
export function inputFromDraft(draft: GuideDraft, id?: number): GuideInput {
  return {
    ...(id !== undefined ? { id } : {}),
    slug: trimSlug(draft.slug.trim()),
    title: draft.title.trim(),
    description: draft.description.trim(),
    body: draft.body.trim(),
    author: draft.author.trim(),
    cta: draft.cta,
    sources: parseSources(draft.sources),
    related: [...draft.related],
    datePublished: draft.datePublished,
    published: draft.published,
  };
}

/** Pemeriksaan sebelum dikirim, sama dengan validasi server. others = artikel lain (slug & judul ganda). {} = sah. */
export function validateDraft(draft: GuideDraft, others: readonly AdminGuide[], today: string = todayWib()): GuideErrors {
  const L = GUIDE_LIMITS;
  const errors: GuideErrors = {};

  const title = charCount(draft.title.trim());
  if (title === 0) errors.title = 'Judul wajib diisi.';
  else if (title < L.titleMin) errors.title = `Judul minimal ${L.titleMin} karakter.`;
  else if (title > L.titleMax) errors.title = `Judul maks. ${L.titleMax} karakter supaya tidak terpotong di Google.`;
  else if (others.some((other) => titleKey(other.title) === titleKey(draft.title))) errors.title = 'Judul sudah dipakai artikel lain.';

  const slug = trimSlug(draft.slug.trim());
  if (!slug) errors.slug = 'Slug wajib diisi.';
  else if (!SLUG_PATTERN.test(slug)) errors.slug = 'Slug hanya boleh berisi huruf kecil a-z, angka, dan tanda "-".';
  else if (slug.length > L.slugMax) errors.slug = `Slug maks. ${L.slugMax} karakter.`;
  else if (others.some((other) => other.slug === slug)) errors.slug = 'Slug ini sudah dipakai artikel lain.';

  const description = charCount(draft.description.trim());
  if (description === 0) errors.description = 'Deskripsi wajib diisi.';
  else if (description < L.descriptionMin) errors.description = `Deskripsi minimal ${L.descriptionMin} karakter.`;
  else if (description > L.descriptionMax) errors.description = `Deskripsi maks. ${L.descriptionMax} karakter supaya tidak terpotong di Google.`;

  const body = charCount(draft.body.trim());
  if (body === 0) errors.body = 'Isi artikel wajib diisi.';
  else if (body < L.bodyMin) errors.body = `Isi artikel minimal ${L.bodyMin} karakter.`;
  else {
    // Token salah ketik tampil kosong atau mentah di website: ditahan di sini, dengan daftar token yang sah (petunjuk
    // kolom tidak tampil selama ada error)
    const problem = placeholderProblems(draft.body)[0];
    if (problem) errors.body = `${problem.charAt(0).toUpperCase()}${problem.slice(1)}. Token yang sah: ${PLACEHOLDER_EXAMPLES.join(', ')}.`;
  }

  const author = charCount(draft.author.trim());
  if (author === 0) errors.author = 'Pilih penulis.';
  else if (author > L.authorMax) errors.author = `Nama penulis maks. ${L.authorMax} karakter.`;

  if (!(ARTICLE_CTAS as readonly string[]).includes(draft.cta)) errors.cta = 'Pilih ajakan di akhir artikel.';

  // Nomor baris textarea (baris kosong ikut dihitung), aturan URL sama dengan server
  const lines = draft.sources.split(/\r?\n/);
  for (let i = 0; i < lines.length && !errors.sources; i++) {
    const url = lines[i].trim();
    if (!url) continue;
    if (charCount(url) > SOURCE_MAX) errors.sources = `Baris ${i + 1} terlalu panjang (maks. ${SOURCE_MAX} karakter).`;
    else if (!isSourceUrl(url)) {
      errors.sources = `Baris ${i + 1} bukan URL yang sah: tulis URL lengkap yang diawali https://, tanpa spasi atau keterangan lain.`;
    }
  }
  if (!errors.sources && parseSources(draft.sources).length > L.sourcesMax) errors.sources = `Maks. ${L.sourcesMax} sumber.`;

  if (draft.related.length > L.relatedMax) errors.related = `Maks. ${L.relatedMax} artikel terkait.`;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.datePublished) || Number.isNaN(Date.parse(draft.datePublished))) {
    errors.datePublished = 'Isi tanggal terbit.';
  } else if (draft.datePublished > today) {
    errors.datePublished = 'Tanggal terbit tidak boleh setelah hari ini.';
  }

  return errors;
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '');
const stringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '') : [];

/** Satu baris admin_get_guides / admin_save_guide yang dirapikan (angka dari PHP bisa berupa string), atau null. */
export function normalizeGuide(raw: unknown): AdminGuide | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const id = Number(row.id);
  const slug = text(row.slug);
  if (!Number.isInteger(id) || id <= 0 || !slug) return null;
  const views = Number(row.views);
  const cta = text(row.cta);
  const reviewed = text(row.reviewed);
  return {
    id,
    slug,
    title: text(row.title),
    description: text(row.description),
    body: text(row.body),
    author: text(row.author) || DEFAULT_AUTHOR_NAME,
    datePublished: text(row.datePublished),
    dateModified: text(row.dateModified) || text(row.datePublished),
    reviewed: reviewed || null,
    cta: (ARTICLE_CTAS as readonly string[]).includes(cta) ? (cta as ArticleCta) : 'template',
    sources: stringList(row.sources),
    related: stringList(row.related),
    views: Number.isFinite(views) && views > 0 ? Math.floor(views) : 0,
    createdAt: text(row.createdAt),
    updatedAt: text(row.updatedAt),
  };
}
