// @vitest-environment node
// Jalankan: npx vitest run src/content/panduan        (perbarui ringkasan: tambahkan -u)
// articles.generated.ts (ringkasan artikel di bundel utama) dibuat dari frontmatter file .md. Tes ini sekaligus
// pembuatnya: dengan -u, Vitest menulis ulang file itu dari frontmatter terbaru.
import { describe, expect, it } from 'vitest';
import { ARTICLE_SUMMARIES } from '../articles.generated';
import { parseArticle, toSummary, type Article } from '../parse';
import { renderSummariesModule, summariesProblem } from '../summaries';

const files = import.meta.glob<string>('../*.md', { query: '?raw', import: 'default', eager: true });
const ARTICLES: Article[] = Object.entries(files).map(([file, raw]) => parseArticle(raw, file.replace(/^.*\//, '').replace(/\.md$/, '')));

describe('articles.generated.ts', () => {
  it('sama dengan frontmatter artikel (perbarui dengan: npx vitest run src/content/panduan -u)', async () => {
    await expect(renderSummariesModule(ARTICLES)).toMatchFileSnapshot('../articles.generated.ts');
  });

  it('modul hasil render bisa dibaca kembali menjadi ringkasan yang sama', () => {
    // Saat -u, file baru saja ditulis ulang tetapi modul yang dimuat tes ini masih versi lama
    const state = expect.getState() as unknown as { snapshotState?: { _updateSnapshot?: string } };
    if (state.snapshotState?._updateSnapshot === 'all') return;
    expect(summariesProblem(ARTICLES, ARTICLE_SUMMARIES)).toBeNull();
    expect(ARTICLE_SUMMARIES).toHaveLength(ARTICLES.length);
  });
});

describe('summariesProblem', () => {
  const article = (slug: string, title = slug): Article => ({
    slug,
    title,
    description: 'd',
    author: 'Tim Garuda Nexa',
    datePublished: '2026-10-23',
    dateModified: '2026-10-23',
    cta: 'template',
    sources: [],
    related: [],
    body: '',
  });

  it('null bila sama (urutan bebas), pesan dengan perintah perbaikan bila berbeda', () => {
    const a = article('a');
    const b = article('b');
    expect(summariesProblem([a, b], [toSummary(b), toSummary(a)])).toBeNull();
    expect(summariesProblem([a, article('b', 'Judul baru')], [toSummary(a), toSummary(b)])).toMatch(/berubah\/baru: b.*vitest run src\/content\/panduan -u/);
    expect(summariesProblem([a], [toSummary(a), toSummary(b)])).toMatch(/tanpa file \.md: b/);
    expect(summariesProblem([a, b], [toSummary(a)])).toMatch(/berubah\/baru: b/);
  });

  it('render: kutip tunggal di-escape, kosong = array kosong', () => {
    const text = renderSummariesModule([article('a', "Judul 'kutip' \\ miring")]);
    expect(text).toContain("title: 'Judul \\'kutip\\' \\\\ miring',");
    expect(renderSummariesModule([])).toContain('export const ARTICLE_SUMMARIES: readonly ArticleSummary[] = [];');
  });
});
