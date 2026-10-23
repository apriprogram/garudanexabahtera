// @vitest-environment node
// Jalankan: npx vitest run __tests__/seo
// sitemap.xml (docs/platform/SEO-PLAN.md §5.4): dibuat dari getIndexableRoutes(data), hanya URL kanonis `index`,
// lastmod jujur (updated_at template / tanggal isi halaman), satu image:image per pratinjau template, tanpa
// changefreq/priority, dan deploy gagal bila ada entri yang tidak layak. public/sitemap.xml statis sudah dihapus.
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildSitemap, parseSitemap, toLastmod } from '../../scripts/seo/sitemap.mjs';
import { latestDate } from '../../src/seo/format';
import { getIndexableRoutes } from '../../src/seo/routes';
import { TEMPLATE_COPY, TEMPLATE_PAGE_UPDATED, templateLastmod } from '../../src/seo/templateSeo';
import { DATA, TEMPLATES } from '../../src/seo/__tests__/fixtures';

const ROOT = resolve(__dirname, '..', '..');
const ORIGIN = 'https://garudanexa.com';

describe('buildSitemap dari getIndexableRoutes', () => {
  const entries = getIndexableRoutes(DATA);
  const xml = buildSitemap(entries, ORIGIN);

  it('XML sitemap + ekstensi image yang sah, satu <url> per rute index', () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">')).toBe(true);
    expect(xml.trimEnd().endsWith('</urlset>')).toBe(true);
    expect(xml.match(/<loc>/g)?.length).toBe(entries.length);
    expect(xml).not.toMatch(/changefreq|priority/);
  });

  it('memuat beranda, /pesan-custom, legal dan 5 template; tanpa rute aplikasi/demo/query/stub', () => {
    const locs = parseSitemap(xml).map((e) => e.loc);
    expect(locs).toContain(`${ORIGIN}/`);
    expect(locs).toContain(`${ORIGIN}/pesan-custom`);
    expect(locs).toContain(`${ORIGIN}/kebijakan-privasi`);
    for (const t of TEMPLATES) expect(locs).toContain(`${ORIGIN}/template/${t.slug}`);
    for (const loc of locs) {
      expect(loc).not.toMatch(/\/(demo|pesan|akun|masuk|daftar|situs|admin)\//);
      expect(loc).not.toMatch(/[?#]/);
      expect(loc === `${ORIGIN}/` || !loc.endsWith('/')).toBe(true);
    }
    // Panduan (WP8): daftar dan artikelnya ikut sitemap
    for (const page of ['/panduan', '/panduan/biaya-website-company-profile']) expect(locs).toContain(`${ORIGIN}${page}`);
    // Halaman WP5 & WP6 yang sudah terisi
    for (const page of [
      '/template',
      '/template/kategori/company-profile',
      '/template/kategori/kecantikan-klinik',
      '/template/kategori/olahraga-komunitas',
      '/template/kategori/fintech-startup',
      '/harga',
      '/tentang',
      '/kontak',
      '/jasa-pembuatan-website',
      '/jasa-pembuatan-aplikasi-mobile',
    ]) {
      expect(locs).toContain(`${ORIGIN}${page}`);
    }
  });

  it('lastmod template = updated_at (tanggal), satu image:image pratinjau per template', () => {
    const block = /<url>\s*<loc>https:\/\/garudanexa\.com\/template\/aura-studio<\/loc>[\s\S]*?<\/url>/.exec(xml)?.[0] ?? '';
    expect(block).toContain('<lastmod>2026-10-23</lastmod>');
    expect(block.match(/<image:image>/g)).toHaveLength(1);
    expect(block).toContain('<image:loc>https://garudanexa.com/assets/templates/aura-studio-preview.webp</image:loc>');
    expect(parseSitemap(xml).find((e) => e.loc === `${ORIGIN}/syarat-ketentuan`)?.lastmod).toBe('2026-10-21');
  });

  it('lastmod template tidak lebih tua dari isi halamannya di kode (bersama dan per template)', () => {
    const lastmods = new Map(parseSitemap(xml).map((e) => [e.loc, e.lastmod]));
    for (const t of TEMPLATES) {
      expect(TEMPLATE_COPY[t.slug]?.updated, `${t.slug}.ts seo.updated`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const lastmod = lastmods.get(`${ORIGIN}/template/${t.slug}`)!;
      expect(lastmod >= TEMPLATE_PAGE_UPDATED, t.slug).toBe(true);
      expect(lastmod >= TEMPLATE_COPY[t.slug]!.updated!, t.slug).toBe(true);
    }
    // Data DB yang lebih tua dari isi halaman tidak menurunkan lastmod; yang lebih baru menaikkannya
    const old = { slug: 'corporate-nexa', updated_at: '2026-01-02 08:00:00', created_at: '2026-01-01 08:00:00' };
    expect(templateLastmod(old)).toBe(latestDate([TEMPLATE_PAGE_UPDATED, TEMPLATE_COPY['corporate-nexa']?.updated]));
    expect(templateLastmod({ ...old, updated_at: '2027-03-04 10:00:00' })).toBe('2027-03-04');
    expect(templateLastmod({ slug: 'template-baru-tanpa-salinan', updated_at: undefined, created_at: undefined })).toBe(TEMPLATE_PAGE_UPDATED);
  });
});

describe('buildSitemap menolak entri yang tidak layak (deploy berhenti)', () => {
  const ok = { path: '/', lastmod: '2026-10-23' };
  it.each([
    [[ok, { path: '/demo/finova', lastmod: '2026-10-23' }], /noindex/],
    [[ok, { path: '/pesan/finova', lastmod: '2026-10-23' }], /noindex/],
    [[ok, { path: '/harga?x=1', lastmod: '2026-10-23' }], /kanonis/],
    [[ok, { path: '/harga/', lastmod: '2026-10-23' }], /kanonis/],
    [[ok, ok], /ganda/],
    [[{ path: '/', lastmod: '' }], /lastmod/],
    [[{ path: '/', lastmod: '2026-13-40' }], /lastmod/],
    [[], /tidak ada rute/],
  ])('%#', (entries, error) => {
    expect(() => buildSitemap(entries, ORIGIN)).toThrow(error);
  });

  it('escape XML dan URL gambar relatif dijadikan absolut', () => {
    const xml = buildSitemap([{ path: '/a-b', lastmod: '2026-10-23 02:37:00', images: ['/x.webp?a=1&b=2'] }], ORIGIN);
    expect(xml).toContain('<lastmod>2026-10-23</lastmod>');
    expect(xml).toContain('<image:loc>https://garudanexa.com/x.webp?a=1&amp;b=2</image:loc>');
    expect(toLastmod('2026-10-23T10:00:00+07:00')).toBe('2026-10-23T10:00:00+07:00');
  });
});

it('public/sitemap.xml statis tidak ada lagi (sitemap dibuat saat deploy)', () => {
  expect(existsSync(join(ROOT, 'public', 'sitemap.xml'))).toBe(false);
});
