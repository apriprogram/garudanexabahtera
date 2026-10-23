// Ringkasan artikel di bundel utama (articles.generated.ts) dibuat dari frontmatter file .md. Modul murni: dipakai tes
// pembuatnya (__tests__/summaries.test.ts) dan pengecekan di bodies.ts.
import { sortArticles, SUMMARY_KEYS, toSummary, type ArticleMeta, type ArticleSummary } from './core';

const HEADER = [
  '// DIBUAT OTOMATIS dari frontmatter src/content/panduan/*.md oleh src/content/panduan/__tests__/summaries.test.ts.',
  '// Jangan diedit manual. Setelah mengubah artikel: npx vitest run src/content/panduan -u',
  "import type { ArticleSummary } from './core';",
  '',
];

const quote = (value: string): string => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

/** Isi articles.generated.ts untuk artikel-artikel ini (terbaru dulu, kunci berurutan tetap). */
export function renderSummariesModule(articles: readonly ArticleMeta[]): string {
  const summaries = sortArticles(articles.map(toSummary));
  if (summaries.length === 0) return [...HEADER, 'export const ARTICLE_SUMMARIES: readonly ArticleSummary[] = [];', ''].join('\n');
  const items = summaries.map((summary) =>
    ['  {', ...SUMMARY_KEYS.map((key) => `    ${key}: ${summary[key] === null ? 'null' : quote(summary[key])},`), '  },'].join('\n'),
  );
  return [...HEADER, 'export const ARTICLE_SUMMARIES: readonly ArticleSummary[] = [', ...items, '];', ''].join('\n');
}

/** Pesan galat bila ringkasan tidak sama dengan frontmatter artikel, atau null bila sama. */
export function summariesProblem(articles: readonly ArticleMeta[], summaries: readonly ArticleSummary[]): string | null {
  const expected = sortArticles(articles.map(toSummary));
  const actual = sortArticles(summaries);
  const same =
    expected.length === actual.length && expected.every((summary, i) => SUMMARY_KEYS.every((key) => summary[key] === actual[i][key]));
  if (same) return null;
  const stale = expected
    .filter((summary) => !actual.some((s) => SUMMARY_KEYS.every((key) => s[key] === summary[key])))
    .map((summary) => summary.slug);
  const extra = actual.filter((s) => !expected.some((e) => e.slug === s.slug)).map((s) => s.slug);
  return (
    'src/content/panduan/articles.generated.ts tidak sama dengan frontmatter artikel' +
    (stale.length ? ` (berubah/baru: ${stale.join(', ')})` : '') +
    (extra.length ? ` (tanpa file .md: ${extra.join(', ')})` : '') +
    '. Jalankan: npx vitest run src/content/panduan -u'
  );
}
