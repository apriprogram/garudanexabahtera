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
// Setelah menambah artikel atau mengubah frontmatter (judul, deskripsi, tanggal, penulis, reviewed), perbarui
// ringkasannya:
//   npx vitest run src/content/panduan -u
// Bundel utama hanya mengimpor core.ts (kecil); pengurai & penolong Markdown ada di parse.ts (chunk artikel dan tes).
//
// Draf (frontmatter tanpa `reviewed`, SEO-PLAN §5.8: artikel harus disunting & dicek faktanya oleh manusia sebelum
// terbit) hanya ada di server dev Vite dan tes. Build production (klien dan SSR prerender, keduanya mode production)
// tidak memuatnya sama sekali: tanpa halaman (404), tanpa entri di /panduan, beranda, sitemap, llms.txt, dan tautan
// guideLink() jatuh ke /panduan. VITE_PANDUAN_DRAFTS=1 saat build = pratinjau dengan draf; deploy sungguhan menolaknya
// (scripts/prerender.mjs).
import { ARTICLE_SUMMARIES } from './articles.generated';
import { isPublishedArticle, sortArticles, type ArticleSummary } from './core';

export * from './core';

/** Draf ikut ditampilkan: server dev & tes, atau build pratinjau dengan VITE_PANDUAN_DRAFTS=1. */
export const SHOW_DRAFT_ARTICLES: boolean = import.meta.env.DEV || import.meta.env.VITE_PANDUAN_DRAFTS === '1';

const SUMMARIES: readonly ArticleSummary[] = sortArticles(ARTICLE_SUMMARIES).filter((article) =>
  isPublishedArticle(article, SHOW_DRAFT_ARTICLES),
);

/** Artikel yang terbit (ringkasan), terbaru dulu. Kosong selama belum ada artikel yang ditinjau. */
export function listArticles(): ArticleSummary[] {
  return [...SUMMARIES];
}

/** Ringkasan artikel terbit dengan slug ini, atau undefined (juga untuk draf di build production). */
export function getArticle(slug: string): ArticleSummary | undefined {
  return SUMMARIES.find((article) => article.slug === slug);
}
