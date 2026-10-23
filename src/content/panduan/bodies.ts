// Isi lengkap artikel panduan dari file .md di folder ini. HANYA diimpor halaman artikel (chunk lazy
// src/pages/public/panduan/PanduanArticle.tsx), jangan dari bundel utama: isi Markdown semua artikel ikut modul ini.
// Halaman lain memakai ringkasan dari index.ts.
//
// Saat modul dimuat, ringkasan di articles.generated.ts dicocokkan dengan frontmatter. Bila basi, modul melempar
// Error: halaman artikel gagal dirender, sehingga prerender saat deploy juga gagal (head, sitemap dan llms.txt tidak
// pernah memakai judul atau tanggal yang berbeda dari halaman).
import { ARTICLE_SUMMARIES } from './articles.generated';
import { parseArticle, sortArticles, type Article } from './parse';
import { summariesProblem } from './summaries';

const files = import.meta.glob<string>('./*.md', { query: '?raw', import: 'default', eager: true });

/** Semua artikel lengkap, terbaru dulu. */
export const ARTICLES: readonly Article[] = sortArticles(
  Object.entries(files).map(([file, raw]) => parseArticle(raw, file.replace(/^.*\//, '').replace(/\.md$/, ''))),
);

const problem = summariesProblem(ARTICLES, ARTICLE_SUMMARIES);
if (problem) throw new Error(problem);

/** Artikel lengkap dengan slug ini, atau undefined. */
export function getFullArticle(slug: string): Article | undefined {
  return ARTICLES.find((article) => article.slug === slug);
}
