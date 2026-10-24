// Bagian panduan yang ikut bundel utama: tipe artikel, urutan terbaru dulu, dan pembaca respons API (get_guides,
// get_guide). Artikel disimpan di database dan dikelola admin (lihat index.ts). Sengaja kecil: modul yang dipakai bundel
// utama ikut chunk entry beserta SEMUA kodenya, jadi penolong Markdown (hanya untuk halaman artikel dan tes) ada di
// parse.ts.

/** Ajakan di akhir artikel: template siap pakai, website custom, atau aplikasi mobile custom. */
export const ARTICLE_CTAS = ['template', 'website', 'mobile'] as const;
export type ArticleCta = (typeof ARTICLE_CTAS)[number];

export interface ArticleMeta {
  title: string;
  description: string;
  slug: string;
  /** Nama penulis, kunci di src/content/authors.ts. */
  author: string;
  /** YYYY-MM-DD */
  datePublished: string;
  /** YYYY-MM-DD, tidak sebelum datePublished */
  dateModified: string;
  /**
   * YYYY-MM-DD saat artikel selesai disunting dan dicek faktanya oleh manusia (SEO-PLAN §5.8): diisi server saat admin
   * menyalakan "Terbitkan". null = draf: tidak pernah dikirim API publik (halaman, daftar, sitemap, llms.txt).
   */
  reviewed: string | null;
  /** Ajakan di akhir artikel. */
  cta: ArticleCta;
  /** URL sumber eksternal */
  sources: string[];
  /** Slug artikel terkait */
  related: string[];
}

export interface Article extends ArticleMeta {
  /** Isi Markdown */
  body: string;
}

/** Baris tab Panduan di panel admin (aksi admin_get_guides): semua status, dengan id, jumlah dilihat dan waktu. */
export interface AdminGuide extends Article {
  id: number;
  /** Berapa kali halaman /panduan/{slug} dibuka (aksi guide_view, sekali per sesi browser). */
  views: number;
  /** "YYYY-MM-DD HH:MM:SS" (waktu server) */
  createdAt: string;
  updatedAt: string;
}

/** Isian form tambah/edit artikel (aksi admin_save_guide). Tanpa id = artikel baru. */
export interface GuideInput {
  id?: number;
  slug: string;
  title: string;
  description: string;
  /** Isi Markdown */
  body: string;
  author: string;
  cta: ArticleCta;
  sources: string[];
  related: string[];
  /** YYYY-MM-DD, tidak setelah hari ini */
  datePublished: string;
  /** true = terbit (sudah disunting & dicek faktanya oleh manusia); false = draf, tidak tampil di website. */
  published: boolean;
}

/**
 * Batas isian artikel, sama di form admin dan validasi server (backend/modules/guides.php & guides.js). Judul ≤ 60
 * supaya judul tab Google tidak terpotong (articleHeadTitle), deskripsi ≤ 155 (meta description).
 */
export const GUIDE_LIMITS = {
  slugMax: 120,
  titleMin: 10,
  titleMax: 60,
  descriptionMin: 50,
  descriptionMax: 155,
  bodyMin: 200,
  authorMax: 120,
  sourcesMax: 30,
  relatedMax: 10,
} as const;

/** Data artikel tanpa isi (daftar /panduan, head, sitemap, llms.txt, tautan): respons get_guides. */
export type ArticleSummary = Pick<ArticleMeta, 'slug' | 'title' | 'description' | 'author' | 'datePublished' | 'dateModified' | 'reviewed'>;

type Sortable = Pick<ArticleMeta, 'slug' | 'datePublished' | 'dateModified'>;

/** Terbaru dulu (datePublished, lalu dateModified), seri → slug A-Z. Tolak slug ganda (buang dulu, lihat guidesFromApi). */
export function sortArticles<T extends Sortable>(articles: readonly T[]): T[] {
  const seen = new Set<string>();
  for (const article of articles) {
    if (seen.has(article.slug)) throw new Error(`Slug artikel "${article.slug}" dipakai lebih dari satu file.`);
    seen.add(article.slug);
  }
  return [...articles].sort(
    (a, b) =>
      b.datePublished.localeCompare(a.datePublished) || b.dateModified.localeCompare(a.dateModified) || a.slug.localeCompare(b.slug),
  );
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const texts = (value: unknown): string[] => (Array.isArray(value) ? value.map(text).filter(Boolean) : []);

/** Ringkasan dari satu baris API, atau null bila datanya tidak lengkap. */
function summaryFrom(raw: unknown): ArticleSummary | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const reviewed = text(row.reviewed);
  const summary: ArticleSummary = {
    slug: text(row.slug),
    title: text(row.title),
    description: text(row.description),
    author: text(row.author),
    datePublished: text(row.datePublished),
    dateModified: text(row.dateModified),
    reviewed: DATE.test(reviewed) ? reviewed : null,
  };
  const valid = SLUG.test(summary.slug) && summary.title && summary.description && DATE.test(summary.datePublished) && DATE.test(summary.dateModified);
  return valid ? summary : null;
}

/** Respons get_guides → artikel terbit, terbaru dulu. Baris rusak, draf dan slug ganda dilewati. */
export function guidesFromApi(body: unknown): ArticleSummary[] {
  const list = body && typeof body === 'object' ? (body as { guides?: unknown }).guides : undefined;
  const seen = new Set<string>();
  const guides: ArticleSummary[] = [];
  for (const raw of Array.isArray(list) ? list : []) {
    const summary = summaryFrom(raw);
    if (!summary?.reviewed || seen.has(summary.slug)) continue;
    seen.add(summary.slug);
    guides.push(summary);
  }
  return sortArticles(guides);
}

/** Respons get_guide → artikel lengkap (isi Markdown, ajakan, sumber, terkait), atau null. */
export function articleFromApi(body: unknown): Article | null {
  const raw = body && typeof body === 'object' ? (body as { guide?: unknown }).guide : undefined;
  const summary = summaryFrom(raw);
  if (!summary) return null;
  const row = raw as Record<string, unknown>;
  const cta = text(row.cta);
  return {
    ...summary,
    body: typeof row.body === 'string' ? row.body.replace(/\r\n?/g, '\n') : '',
    cta: (ARTICLE_CTAS as readonly string[]).includes(cta) ? (cta as ArticleCta) : 'template',
    sources: texts(row.sources),
    related: texts(row.related).filter((slug) => SLUG.test(slug)),
  };
}

/** Artikel dengan slug ini dari daftar, atau undefined. */
export const findArticle = <T extends Pick<ArticleMeta, 'slug'>>(articles: readonly T[], slug: string): T | undefined =>
  articles.find((article) => article.slug === slug);
