// Artikel panduan (/panduan/{slug}, docs/platform/SEO-PLAN.md §5.8): satu file Markdown per artikel di folder ini,
// nama file = slug (mis. biaya-website-company-profile.md), frontmatter dijelaskan di parse.ts. Isinya ikut di-bundle
// (import.meta.glob ?raw), tidak disajikan dari web, lalu di-prerender.
//
// Dua lapis supaya isi Markdown tidak masuk bundel utama (anggaran entry WP7):
// - index.ts (file ini, bundel utama: daftar /panduan, blok beranda, head *.seo.ts, sitemap, llms.txt): hanya ringkasan
//   dari articles.generated.ts (judul, deskripsi, slug, penulis, tanggal).
// - bodies.ts (chunk halaman artikel saja): isi lengkap dari file .md, plus pengecekan bahwa articles.generated.ts sama
//   dengan frontmatter. Ringkasan yang basi membuat halaman artikel gagal dirender, jadi prerender saat deploy gagal.
//
// Setelah menambah artikel atau mengubah frontmatter (judul, deskripsi, tanggal, penulis), perbarui ringkasannya:
//   npx vitest run src/content/panduan -u
// Bundel utama hanya mengimpor core.ts (kecil); pengurai & penolong Markdown ada di parse.ts (chunk artikel dan tes).
import { ARTICLE_SUMMARIES } from './articles.generated';
import { sortArticles, type ArticleSummary } from './core';

export * from './core';

const SUMMARIES: readonly ArticleSummary[] = sortArticles(ARTICLE_SUMMARIES);

/** Semua artikel (ringkasan), terbaru dulu. Kosong selama belum ada file .md. */
export function listArticles(): ArticleSummary[] {
  return [...SUMMARIES];
}

/** Ringkasan artikel dengan slug ini, atau undefined. */
export function getArticle(slug: string): ArticleSummary | undefined {
  return SUMMARIES.find((article) => article.slug === slug);
}
