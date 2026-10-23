// Bagian pemuat panduan yang ikut bundel utama (index.ts → daftar /panduan, beranda, head, sitemap): tipe artikel,
// urutan terbaru dulu, dan ringkasan. Sengaja kecil dan terpisah dari parse.ts: modul yang dipakai bundel utama ikut
// chunk entry beserta SEMUA kodenya, jadi pengurai frontmatter & penolong Markdown (hanya untuk chunk halaman artikel
// dan tes) tidak boleh ada di sini.

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
   * YYYY-MM-DD saat artikel selesai disunting dan dicek faktanya oleh manusia (SEO-PLAN §5.8). null = draf: tidak
   * terbit di build production (lihat isPublishedArticle dan index.ts).
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
  /** Isi Markdown setelah frontmatter */
  body: string;
}

/**
 * Data artikel yang ikut bundel utama (daftar /panduan, beranda, head, sitemap, llms.txt): tanpa isi, sumber dan
 * artikel terkait, supaya isi Markdown hanya dimuat chunk halaman artikel. Dibuat dari frontmatter ke
 * articles.generated.ts (lihat index.ts).
 */
export type ArticleSummary = Pick<ArticleMeta, 'slug' | 'title' | 'description' | 'author' | 'datePublished' | 'dateModified' | 'reviewed'>;

export const SUMMARY_KEYS = [
  'slug',
  'title',
  'description',
  'author',
  'datePublished',
  'dateModified',
  'reviewed',
] as const satisfies readonly (keyof ArticleSummary)[];

/**
 * Artikel terbit = sudah ditinjau manusia (`reviewed` terisi). Draf hanya ikut bila `showDrafts` (server dev Vite, tes,
 * atau build pratinjau dengan VITE_PANDUAN_DRAFTS=1, yang ditolak deploy sungguhan).
 */
export const isPublishedArticle = (article: Pick<ArticleMeta, 'reviewed'>, showDrafts = false): boolean =>
  showDrafts || Boolean(article.reviewed);

type Sortable = Pick<ArticleMeta, 'slug' | 'datePublished' | 'dateModified'>;

/** Terbaru dulu (datePublished, lalu dateModified), seri → slug A-Z. Tolak slug ganda. */
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

/** Bagian artikel yang ikut bundel utama (urutan kunci tetap, supaya articles.generated.ts stabil). */
export function toSummary(article: ArticleMeta): ArticleSummary {
  return Object.fromEntries(SUMMARY_KEYS.map((key) => [key, article[key]])) as ArticleSummary;
}
