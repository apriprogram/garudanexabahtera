// @vitest-environment node
// Jalankan: npx vitest run src/seo
// Kepala per rute host utama (docs/platform/SEO-PLAN.md §5.3, Lampiran A): semua rute index punya title ≤ 60,
// description ≤ 155, keduanya unik, canonical absolut ke apex tanpa query/garis miring, OG lengkap, JSON-LD
// Organization + WebSite; rute aplikasi, demo dan 404 noindex tanpa canonical; harga dari data, bukan teks tetap.
import { describe, expect, it } from 'vitest';
import { LEGAL_PATHS, LEGAL_UPDATED_AT } from '../../lib/legal';
import { formatPriceFull, formatPriceShort, toIsoDate } from '../format';
import { DEFAULT_OG_IMAGE, notFoundHead } from '../defaults';
import { ORGANIZATION_ID, WEBSITE_ID } from '../jsonld';
import { ogCardUrl, resolveOgImage } from '../og';
import { pageHead, staticPage } from '../page';
import { HOME_DESCRIPTION, HOME_TITLE, HOME_UPDATED } from '../pages/home.seo';
import { appTitle } from '../pages/app.seo';
import { NOT_FOUND_PATH } from '../pages/not-found.seo';
import { CATEGORY_SLUGS, HUB_PATHS, SITE_ORIGIN, categoryPath, isAppPath, templatePath } from '../paths';
import { SEO_MODULES, findSeoModule, getHead, getIndexableRoutes } from '../routes';
import { categorySlugOf, templateDescription, templateTitle } from '../templateSeo';
import type { SeoHead } from '../types';
import { DATA, TEMPLATES, seoData } from './fixtures';

const types = (head: SeoHead) => head.jsonLd.map((node) => (node as { '@type': string })['@type']);

describe('getHead: semua rute index', () => {
  const entries = getIndexableRoutes(DATA);
  const paths = entries.map((e) => e.path);

  it('memuat beranda, /pesan-custom, 3 dokumen legal dan semua template terbit (tanpa stub)', () => {
    expect(paths).toEqual(
      expect.arrayContaining(['/', HUB_PATHS.customOrder, ...Object.values(LEGAL_PATHS), ...TEMPLATES.map((t) => templatePath(t.slug))]),
    );
    // Panduan (WP8): daftar dan artikelnya ikut diindeks
    expect(paths).toEqual(expect.arrayContaining(['/panduan', '/panduan/biaya-website-company-profile']));
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('katalog /template dan 4 halaman kategori (WP5) diindeks bila punya template', () => {
    expect(paths).toEqual(expect.arrayContaining(['/template', ...CATEGORY_SLUGS.map(categoryPath)]));
  });

  it('title ≤ 60 & description 50–155 karakter, keduanya unik', () => {
    const titles = new Map<string, string>();
    const descriptions = new Map<string, string>();
    for (const path of paths) {
      const head = getHead(path, DATA);
      expect(head.title.length, `${path}: "${head.title}" (${head.title.length})`).toBeLessThanOrEqual(60);
      expect(head.description.length, `${path}: "${head.description}" (${head.description.length})`).toBeLessThanOrEqual(155);
      expect(head.description.length, path).toBeGreaterThanOrEqual(50);
      expect(titles.get(head.title), `title ganda: ${head.title}`).toBeUndefined();
      expect(descriptions.get(head.description), `description ganda: ${head.description}`).toBeUndefined();
      titles.set(head.title, path);
      descriptions.set(head.description, path);
    }
  });

  it('index,follow + canonical absolut apex (tanpa query, tanpa garis miring) + OG + Organization & WebSite', () => {
    for (const path of paths) {
      const head = getHead(path, DATA);
      expect(head.robots, path).toBe('index,follow');
      expect(head.canonical, path).toBe(path === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}`);
      expect(head.ogImage, path).toMatch(/^https:\/\/garudanexa\.com\/(og\/[a-z0-9-]+\.jpg|assets\/)/);
      expect(head.ogImageAlt.length, path).toBeGreaterThan(10);
      expect(types(head).slice(0, 2), path).toEqual(['Organization', 'WebSite']);
    }
  });

  it('lastmod jujur: tanggal YYYY-MM-DD dari data/konten, bukan tanggal build', () => {
    const byPath = Object.fromEntries(entries.map((e) => [e.path, e]));
    expect(byPath['/template/aura-studio'].lastmod).toBe('2026-10-23');
    expect(byPath['/template/corporate-nexa'].lastmod).toBe('2026-10-22');
    expect(byPath['/template/aura-studio'].images).toEqual([`${SITE_ORIGIN}/assets/templates/aura-studio-preview.webp`]);
    expect(byPath[LEGAL_PATHS.terms].lastmod).toBe(LEGAL_UPDATED_AT);
    expect(byPath['/'].lastmod).toBe('2026-10-23'); // max(HOME_UPDATED, updated_at template)
    for (const entry of entries) expect(toIsoDate(entry.lastmod), entry.path).toBe(entry.lastmod);
    // beranda mengikuti template yang diperbarui belakangan
    const later = seoData(TEMPLATES.map((t) => (t.slug === 'finova' ? { ...t, updated_at: '2026-12-01 10:00:00' } : t)));
    expect(getIndexableRoutes(later).find((e) => e.path === '/')?.lastmod).toBe('2026-12-01');
    expect(HOME_UPDATED <= '2026-12-01').toBe(true);
  });

  it('path dengan query/garis miring memakai kepala & canonical yang sama', () => {
    expect(getHead('/pesan-custom?layanan=website', DATA)).toEqual(getHead('/pesan-custom', DATA));
    expect(getHead('/template/aura-studio/?utm_source=chatgpt.com', DATA)).toEqual(getHead('/template/aura-studio', DATA));
    expect(getHead('/template/Aura-Studio', DATA).canonical).toBe(`${SITE_ORIGIN}/template/aura-studio`);
  });
});

describe('beranda, /pesan-custom, legal (Lampiran A)', () => {
  it('beranda: title & description Lampiran A, kartu default, ItemList template', () => {
    const head = getHead('/', DATA);
    expect(head.title).toBe('Template Website Siap Pakai & Jasa Website | Garuda Nexa');
    expect(head.title).toBe(HOME_TITLE);
    expect(head.description).toBe(HOME_DESCRIPTION);
    expect(head.ogImage).toBe(`${SITE_ORIGIN}/og/default.jpg`);
    expect(types(head)).toEqual(['Organization', 'WebSite', 'WebPage', 'ItemList', 'FAQPage']);
    // section katalog disembunyikan admin → tanpa ItemList; FAQ disembunyikan → tanpa FAQPage
    const hidden = seoData(TEMPLATES, { disabled_sections: '["templates"]' });
    expect(types(getHead('/', hidden))).toEqual(['Organization', 'WebSite', 'WebPage', 'FAQPage']);
    expect(types(getHead('/', seoData(TEMPLATES, { disabled_sections: '["templates","faq"]' })))).toEqual(['Organization', 'WebSite', 'WebPage']);
  });

  it('/pesan-custom: Lampiran A, tanpa angka harga', () => {
    const head = getHead('/pesan-custom', DATA);
    expect(head.title).toBe('Pesan Website / Aplikasi Mobile Custom | Garuda Nexa');
    expect(head.description).toMatch(/^Ceritakan kebutuhan website atau aplikasi Android\/iOS Anda\./);
    expect(`${head.title} ${head.description}`).not.toMatch(/Rp\s?\d/);
  });

  it('legal: "{Judul} | Garuda Nexa" + WebPage & BreadcrumbList', () => {
    expect(getHead(LEGAL_PATHS.terms, DATA).title).toBe('Syarat & Ketentuan | Garuda Nexa');
    expect(getHead(LEGAL_PATHS.privacy, DATA).title).toBe('Kebijakan Privasi | Garuda Nexa');
    expect(getHead(LEGAL_PATHS.refund, DATA).title).toBe('Kebijakan Pengembalian Dana | Garuda Nexa');
    expect(types(getHead(LEGAL_PATHS.refund, DATA))).toEqual(['Organization', 'WebSite', 'WebPage', 'BreadcrumbList']);
  });
});

describe('halaman template (Lampiran A.1/A.2)', () => {
  it('judul "{Nama}: Template … – harga ringkas" dari data, tanpa akhiran merek, ≤ 60', () => {
    expect(getHead('/template/aura-studio', DATA).title).toBe('Aura Studio: Template Website Klinik & Salon – Rp1,39 jt');
    expect(getHead('/template/finova', DATA).title).toBe('Finova: Template Website Fintech & Startup – Rp1,79 jt');
    expect(getHead('/template/startup-clean', DATA).title).toBe('Startup Clean: Template Website UMKM & Startup – Rp990 rb');
    for (const t of TEMPLATES) expect(getHead(templatePath(t.slug), DATA).title).not.toContain('| Garuda Nexa');
  });

  it('description memuat harga lengkap dari DB dan "sudah termasuk domain, hosting & SSL tahun pertama"', () => {
    for (const t of TEMPLATES) {
      const { description } = getHead(templatePath(t.slug), DATA);
      expect(description, t.slug).toContain(`${formatPriceFull(t.price)} sudah termasuk domain, hosting & SSL tahun pertama.`);
    }
    // harga berubah di DB → kepala ikut berubah (tidak ada angka tetap di kode)
    const repriced = seoData(TEMPLATES.map((t) => (t.slug === 'aura-studio' ? { ...t, price: 1450000 } : t)));
    expect(getHead('/template/aura-studio', repriced).title).toContain('Rp1,45 jt');
    expect(getHead('/template/aura-studio', repriced).description).toContain('Rp1.450.000');
  });

  it('og:type product, kartu template-{slug}.jpg, preload pratinjau, Product + BreadcrumbList', () => {
    const head = getHead('/template/aura-studio', DATA);
    expect(head.ogType).toBe('product');
    expect(head.ogImage).toBe(ogCardUrl('template-aura-studio'));
    expect(head.preloadImage).toBe('/assets/templates/aura-studio-preview.webp');
    expect(types(head)).toEqual(['Organization', 'WebSite', 'Product', 'BreadcrumbList']);
  });

  it('template baru tanpa kartu OG → default.jpg; tanpa pratinjau raster → gambar Product = kartu', () => {
    const fresh = { ...TEMPLATES[0], id: 99, slug: 'template-baru', name: 'Template Baru', preview_image: '/assets/templates/x.svg', gallery: [] };
    const head = getHead('/template/template-baru', seoData([...TEMPLATES, fresh]));
    expect(head.ogImage).toBe(DEFAULT_OG_IMAGE);
    const product = head.jsonLd.find((n) => (n as { '@type': string })['@type'] === 'Product') as { image: string[] };
    expect(product.image).toEqual([DEFAULT_OG_IMAGE]);
    expect(head.preloadImage).toBeUndefined();
  });

  it('slug tidak terbit, draft, atau "kategori" → kepala 404', () => {
    expect(getHead('/template/tidak-ada', DATA)).toEqual(notFoundHead());
    expect(getHead('/template/kategori', DATA)).toEqual(notFoundHead());
    const draft = seoData(TEMPLATES.map((t) => (t.slug === 'finova' ? { ...t, status: 'draft' as const } : t)));
    expect(getHead('/template/finova', draft)).toEqual(notFoundHead());
    expect(getIndexableRoutes(draft).map((e) => e.path)).not.toContain('/template/finova');
    expect(getHead('/template/aura-studio', seoData([]))).toEqual(notFoundHead());
  });

  it('pola cadangan tetap ≤ 60/155 untuk nama & kategori panjang, dan tanpa harga bila harga 0', () => {
    const long = {
      ...TEMPLATES[3],
      name: 'Nama Template Yang Sangat Panjang Sekali',
      category: 'Kategori Dengan Nama Yang Juga Panjang',
      short_description: 'x'.repeat(200),
    };
    expect(templateTitle(long).length).toBeLessThanOrEqual(60);
    expect(templateDescription(long).length).toBeLessThanOrEqual(155);
    const free = { ...TEMPLATES[0], price: 0 };
    expect(`${templateTitle(free)} ${templateDescription(free)}`).not.toMatch(/Rp\d/);
  });
});

describe('rute noindex', () => {
  it('rute aplikasi: noindex,follow, tanpa canonical & JSON-LD, judul sama dengan halaman', () => {
    for (const path of ['/akun', '/akun/pesanan/GN-1', '/pesan/aura-studio', '/masuk', '/daftar', '/login', '/auth', '/admin/x', '/situs/3']) {
      expect(isAppPath(path), path).toBe(true);
      const head = getHead(path, DATA);
      expect(head.robots, path).toBe('noindex,follow');
      expect(head.canonical, path).toBeNull();
      expect(head.jsonLd, path).toEqual([]);
    }
    expect(appTitle('/akun')).toBe('Akun saya | Garuda Nexa');
    expect(appTitle('/akun/pesanan/GN-20261023-0001')).toBe('Pesanan GN-20261023-0001 | Garuda Nexa');
    expect(appTitle('/masuk')).toBe('Masuk | Garuda Nexa');
    expect(isAppPath('/pesan-custom')).toBe(false);
    expect(isAppPath('/pesan')).toBe(false);
  });

  it('/demo/{slug}: noindex,follow tanpa canonical, judul "Demo {Nama}"; slug tidak ada → 404', () => {
    const head = getHead('/demo/aura-studio', DATA);
    expect(head).toMatchObject({ robots: 'noindex,follow', canonical: null, jsonLd: [], title: 'Demo Aura Studio | Garuda Nexa' });
    expect(getHead('/demo/tidak-ada', DATA)).toEqual(notFoundHead());
  });

  it('/404 dan path tanpa pemilik → kepala 404 noindex', () => {
    expect(getHead(NOT_FOUND_PATH, DATA)).toEqual(notFoundHead());
    expect(getHead('/halaman-tidak-ada', DATA)).toEqual(notFoundHead());
    expect(findSeoModule('/halaman-tidak-ada')).toBeNull();
    expect(notFoundHead()).toMatchObject({ robots: 'noindex,follow', canonical: null });
  });

  it('tidak ada rute noindex di daftar index, dan setiap modul punya kepala yang sah', () => {
    const paths = getIndexableRoutes(DATA).map((e) => e.path);
    for (const path of paths) expect(/^\/(demo|pesan|akun|masuk|daftar|situs|admin|login|auth)(\/|$)/.test(path), path).toBe(false);
    for (const { id, seo } of SEO_MODULES) {
      for (const entry of seo.routes?.(DATA) ?? []) expect(seo.match(entry.path), `${id}: ${entry.path}`).toBe(true);
    }
  });
});

describe('penolong', () => {
  it('format harga ringkas & lengkap (Lampiran A)', () => {
    expect(formatPriceShort(990000)).toBe('Rp990 rb');
    expect(formatPriceShort(1390000)).toBe('Rp1,39 jt');
    expect(formatPriceShort(1500000)).toBe('Rp1,5 jt');
    expect(formatPriceShort(2000000)).toBe('Rp2 jt');
    expect(formatPriceShort(1395000)).toBe('Rp1.395.000'); // tidak dibulatkan
    expect(formatPriceShort(990500)).toBe('Rp990.500');
    expect(formatPriceFull(1390000)).toBe('Rp1.390.000');
    expect(formatPriceFull(12500000)).toBe('Rp12.500.000');
  });

  it('categorySlugOf memetakan kategori DB ke halaman kategori yang dikenal', () => {
    expect(categorySlugOf('Kecantikan & Klinik')).toBe('kecantikan-klinik');
    expect(categorySlugOf('Olahraga & Komunitas')).toBe('olahraga-komunitas');
    expect(categorySlugOf('Company Profile')).toBe('company-profile');
    expect(categorySlugOf('Fintech & Startup')).toBe('fintech-startup');
    expect(categorySlugOf('Lain-lain')).toBeNull();
  });

  it('pageHead: noindex tanpa canonical/JSON-LD; ogImage nama kartu, path, atau URL', () => {
    const base = { path: '/harga', title: 'Harga', description: 'Deskripsi harga yang cukup panjang untuk diuji.' };
    expect(pageHead(DATA, { ...base, robots: 'noindex,follow', jsonLd: [{ '@type': 'Thing' }] })).toMatchObject({ canonical: null, jsonLd: [] });
    const head = pageHead(DATA, { ...base, ogImage: 'harga' });
    expect(head.canonical).toBe(`${SITE_ORIGIN}/harga`);
    expect(head.ogImage).toBe(`${SITE_ORIGIN}/og/harga.jpg`);
    expect(resolveOgImage('tidak-ada-kartunya')).toBe(DEFAULT_OG_IMAGE);
    expect(resolveOgImage('/assets/x.jpg')).toBe(`${SITE_ORIGIN}/assets/x.jpg`);
    expect(resolveOgImage('https://cdn.example/x.jpg')).toBe('https://cdn.example/x.jpg');
    expect((head.jsonLd[0] as { '@id': string })['@id']).toBe(ORGANIZATION_ID);
    expect((head.jsonLd[1] as { '@id': string })['@id']).toBe(WEBSITE_ID);
  });

  it('staticPage: lastmod = updated, path & tanggal wajib kanonis', () => {
    const page = staticPage({ path: '/harga', updated: '2026-11-10', head: () => null });
    expect(page.match('/harga')).toBe(true);
    expect(page.routes?.(DATA)).toEqual([{ path: '/harga', lastmod: '2026-11-10' }]);
    expect(() => staticPage({ path: '/harga/', updated: '2026-11-10', head: () => null })).toThrow();
    expect(() => staticPage({ path: '/harga', updated: '10-11-2026', head: () => null })).toThrow();
  });
});
