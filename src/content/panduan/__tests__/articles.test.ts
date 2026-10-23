// Jalankan: npx vitest run src/content/panduan
// Isi artikel panduan (docs/platform/SEO-PLAN.md §5.8): ≥ 1.200 kata, pembuka yang langsung menjawab, ≥ 1 tabel, checklist,
// FAQ, ≥ 3 sumber eksternal yang semuanya tercantum di frontmatter, tautan internal ke halaman yang diindeks (Lampiran
// A.4: kategori/template, /harga, jasa), harga & nama template Garuda Nexa hanya lewat token data, penulis terdaftar.
import { describe, expect, it } from 'vitest';
import { findAuthor } from '../../authors';
import { FIXTURE_BUILT_AT, FIXTURE_TEMPLATES, fixturePreload } from '../../../lib/__tests__/preloadFixture';
import { seoDataFromApi } from '../../../lib/preload';
import { formatPriceFull, formatPriceShort } from '../../../seo/format';
import { getHead } from '../../../seo/routes';
import { ARTICLES } from '../bodies';
import { articleHeadings, countWords, headingId, markdownLinks, proseBeforeSources, SOURCES_HEADING } from '../parse';
import { placeholderProblems } from '../placeholders';

const DATA = seoDataFromApi(fixturePreload('/').api, FIXTURE_BUILT_AT);
const FAQ_HEADING = 'Pertanyaan yang sering diajukan';
const MIN_WORDS = 1200;

/** Blok-blok isi (dipisah baris kosong). */
const blocks = (body: string) => body.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);

/** Baris H3 di bawah H2 tertentu (sampai H2 berikutnya). */
function h3Under(body: string, h2: string): string[] {
  const lines = body.split('\n');
  const start = lines.findIndex((l) => l.trim() === `## ${h2}`);
  if (start < 0) return [];
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^##\s/.test(l));
  return (end < 0 ? rest : rest.slice(0, end)).filter((l) => /^###\s/.test(l)).map((l) => l.replace(/^###\s+/, ''));
}

/** Teks tanpa token {{…}} (untuk memastikan nama/harga template tidak ditulis langsung). */
const withoutTokens = (text: string) => text.replace(/\{\{[^}]*\}\}/g, '');

describe('artikel panduan', () => {
  it('ada 4 artikel pertama rencana §5.8', () => {
    expect(ARTICLES.map((a) => a.slug).sort()).toEqual([
      'biaya-aplikasi-android-ios',
      'biaya-website-company-profile',
      'template-vs-jasa-website-custom',
      'website-klinik-kecantikan',
    ]);
  });

  it('judul ≤ 60 karakter dan deskripsi 70–155 karakter, semuanya unik; penulis terdaftar; artikel terkait ada', () => {
    const slugs = new Set(ARTICLES.map((a) => a.slug));
    expect(new Set(ARTICLES.map((a) => a.title)).size).toBe(ARTICLES.length);
    expect(new Set(ARTICLES.map((a) => a.description)).size).toBe(ARTICLES.length);
    for (const a of ARTICLES) {
      expect(a.title.length, a.title).toBeLessThanOrEqual(60);
      expect(a.description.length, a.description).toBeGreaterThanOrEqual(70);
      expect(a.description.length, a.description).toBeLessThanOrEqual(155);
      expect(findAuthor(a.author), a.author).toBeDefined();
      for (const slug of a.related) {
        expect(slugs.has(slug), `${a.slug} → ${slug}`).toBe(true);
        expect(slug).not.toBe(a.slug);
      }
      for (const text of [a.title, a.description]) expect(text).not.toMatch(/\{\{|\}\}/);
    }
  });

  it.each(ARTICLES.map((a) => [a.slug, a] as const))('%s: struktur (tanpa H1, pembuka menjawab, H2 polos & unik, FAQ, Sumber terakhir)', (_slug, a) => {
    expect(a.body).not.toMatch(/^#\s/m);
    // Pembuka: paragraf biasa sebelum H2 pertama, 2–4 kalimat
    const first = blocks(a.body)[0];
    expect(first.startsWith('#'), 'blok pertama harus paragraf').toBe(false);
    const sentences = (withoutTokens(first).replace(/\([^)]*\)/g, '').match(/[.!?](\s|$)/g) ?? []).length;
    expect(sentences, first).toBeGreaterThanOrEqual(2);
    expect(sentences, first).toBeLessThanOrEqual(4);

    const headings = articleHeadings(a.body);
    for (const h of headings) expect(h.text, h.text).not.toMatch(/[*_[\]`{}]/);
    expect(new Set(headings.map((h) => h.id)).size).toBe(headings.length);
    expect(headings.every((h) => h.id === headingId(h.text) && h.id !== '')).toBe(true);
    expect(headings.at(-1)?.text).toBe(SOURCES_HEADING);
    expect(headings.map((h) => h.text)).toContain(FAQ_HEADING);
    expect(h3Under(a.body, FAQ_HEADING).length).toBeGreaterThanOrEqual(3);
    for (const q of h3Under(a.body, FAQ_HEADING)) expect(q.endsWith('?'), q).toBe(true);
  });

  it.each(ARTICLES.map((a) => [a.slug, a] as const))('%s: ≥ 1.200 kata, tabel, checklist', (_slug, a) => {
    expect(countWords(proseBeforeSources(a.body))).toBeGreaterThanOrEqual(MIN_WORDS);
    expect(a.body).toMatch(/^\|.+\|\s*\n\|\s*:?-{3,}/m);
    expect((a.body.match(/^- \[ \] /gm) ?? []).length).toBeGreaterThanOrEqual(5);
  });

  it.each(ARTICLES.map((a) => [a.slug, a] as const))('%s: ≥ 3 sumber https, semua tautan eksternal tercantum di sumber dan di bagian Sumber', (_slug, a) => {
    expect(a.sources.length).toBeGreaterThanOrEqual(3);
    expect(new Set(a.sources).size).toBe(a.sources.length);
    for (const source of a.sources) expect(source).toMatch(/^https:\/\//);
    const links = markdownLinks(a.body);
    const external = links.filter((l) => /^https?:/.test(l.href)).map((l) => l.href);
    for (const href of external) expect(a.sources, href).toContain(href);
    const sourcesSection = a.body.slice(a.body.lastIndexOf(`## ${SOURCES_HEADING}`));
    for (const source of a.sources) expect(sourcesSection, source).toContain(`(${source})`);
    // Sumber juga dikutip di isi, bukan hanya didaftar di akhir
    const prose = proseBeforeSources(a.body);
    for (const source of a.sources) expect(prose, source).toContain(`(${source})`);
  });

  it.each(ARTICLES.map((a) => [a.slug, a] as const))('%s: tautan internal ke halaman yang diindeks, anchor kontekstual, Lampiran A.4', (_slug, a) => {
    const links = markdownLinks(a.body);
    for (const link of links) {
      expect(link.href, link.href).toMatch(/^(https:\/\/|\/)/);
      expect(link.text.toLowerCase(), link.href).not.toMatch(/^(klik )?(di )?sini$|^tautan( ini)?$|^link$/);
    }
    const internal = links.filter((l) => l.href.startsWith('/')).map((l) => l.href);
    for (const href of internal) {
      expect(href, href).not.toMatch(/[?#]|\/$/);
      expect(getHead(href, DATA).robots, href).toBe('index,follow');
    }
    expect(internal.some((h) => h.startsWith('/template/'))).toBe(true);
    expect(internal).toContain('/harga');
    expect(internal.some((h) => h.startsWith('/jasa-pembuatan-'))).toBe(true);
  });

  it.each(ARTICLES.map((a) => [a.slug, a] as const))('%s: harga & nama template Garuda Nexa hanya lewat token data; tanpa klaim regulator', (_slug, a) => {
    expect(placeholderProblems(a.body)).toEqual([]);
    const text = withoutTokens(a.body);
    for (const t of FIXTURE_TEMPLATES) {
      expect(text, t.name).not.toContain(t.name);
      expect(text, String(t.price)).not.toContain(formatPriceFull(t.price));
      expect(text, String(t.price)).not.toContain(formatPriceShort(t.price));
    }
    expect(text).not.toMatch(/\bOJK\b|diawasi oleh|terdaftar di (OJK|Kominfo|BPOM)|garansi hasil|peringkat (#|pertama|satu)/i);
  });
});
