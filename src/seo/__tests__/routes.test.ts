// @vitest-environment node
// Jalankan: npx vitest run src/seo
// Kontrak SEO (docs/platform/SEO-PLAN.md §4, §5.1): getHead/getIndexableRoutes atas semua modul *.seo.ts, stub WP1
// selalu noindex dan tidak pernah masuk sitemap, satu path dimiliki paling banyak satu modul, head.ts men-escape.
import { describe, expect, it } from 'vitest';
import { COMPANY_FACTS } from '../../lib/companyFacts';
import { notFoundHead, stubHead } from '../defaults';
import { escapeHtml, renderHeadTags } from '../head';
import {
  ARTICLE_SLUGS,
  CATEGORY_SLUGS,
  HUB_PATHS,
  PLANNED_ARTICLE_SLUGS,
  SITE_ORIGIN,
  absoluteUrl,
  articlePath,
  categoryPath,
  isCategorySlug,
  templatePath,
} from '../paths';
import { SEO_MODULES, findSeoModule, getHead, getIndexableRoutes, normalizePathname } from '../routes';
import type { SeoData } from '../types';

const DATA: SeoData = {
  settings: {},
  navbar: [],
  templates: [],
  projects: [],
  templateBySlug: {},
  builtAt: '2026-10-23T00:00:00.000Z',
};

/** Semua rute stub WP1 (rencana §5.1). */
const STUB_PATHS = [
  '/template',
  ...CATEGORY_SLUGS.map(categoryPath),
  '/jasa-pembuatan-website',
  '/jasa-pembuatan-aplikasi-mobile',
  '/harga',
  '/tentang',
  '/kontak',
  '/panduan',
];

describe('paths', () => {
  it('memuat semua hub, 4 kategori, dan 4 artikel rencana §5.8', () => {
    expect(HUB_PATHS).toEqual({
      home: '/',
      catalog: '/template',
      webService: '/jasa-pembuatan-website',
      mobileService: '/jasa-pembuatan-aplikasi-mobile',
      pricing: '/harga',
      about: '/tentang',
      contact: '/kontak',
      guides: '/panduan',
      customOrder: '/pesan-custom',
    });
    expect(CATEGORY_SLUGS).toEqual(['company-profile', 'kecantikan-klinik', 'olahraga-komunitas', 'fintech-startup']);
    expect(PLANNED_ARTICLE_SLUGS).toEqual([
      'biaya-website-company-profile',
      'template-vs-jasa-website-custom',
      'biaya-aplikasi-android-ios',
      'website-klinik-kecantikan',
    ]);
    expect(categoryPath('fintech-startup')).toBe('/template/kategori/fintech-startup');
    expect(templatePath('aura-studio')).toBe('/template/aura-studio');
    expect(articlePath(ARTICLE_SLUGS.websiteCost)).toBe('/panduan/biaya-website-company-profile');
    expect(isCategorySlug('company-profile')).toBe(true);
    expect(isCategorySlug('kategori')).toBe(false);
  });

  it('URL absolut selalu ke apex https tanpa garis miring di akhir (kecuali beranda)', () => {
    expect(SITE_ORIGIN).toBe('https://garudanexa.com');
    expect(COMPANY_FACTS.url).toBe(SITE_ORIGIN);
    expect(absoluteUrl('/')).toBe('https://garudanexa.com/');
    expect(absoluteUrl('/harga')).toBe('https://garudanexa.com/harga');
  });
});

describe('routes: modul *.seo.ts', () => {
  it('mengumpulkan semua stub halaman publik lewat glob, masing-masing PageSeo yang sah', () => {
    const ids = SEO_MODULES.map((m) => m.id);
    for (const page of [
      'catalog/CatalogPage',
      'catalog/CategoryPage',
      'services/JasaWebsite',
      'services/JasaAplikasi',
      'info/Harga',
      'info/Tentang',
      'info/Kontak',
      'panduan/PanduanIndex',
      'panduan/PanduanArticle',
    ]) {
      expect(ids).toContain(`../pages/public/${page}.seo.ts`);
    }
    for (const { seo } of SEO_MODULES) {
      expect(typeof seo.match).toBe('function');
      expect(typeof seo.head).toBe('function');
    }
  });

  it('satu path dimiliki paling banyak satu modul', () => {
    const samples = [
      '/', '/template', '/template/aura-studio', '/template/kategori', '/template/kategori/company-profile',
      '/template/kategori/tidak-ada', '/jasa-pembuatan-website', '/jasa-pembuatan-aplikasi-mobile', '/harga', '/tentang',
      '/kontak', '/panduan', '/panduan/biaya-website-company-profile', '/pesan-custom', '/pesan/aura-studio',
      '/demo/aura-studio', '/syarat-ketentuan', '/kebijakan-privasi', '/kebijakan-pengembalian-dana', '/akun',
      '/masuk', '/daftar', '/admin', '/halaman-tidak-ada',
    ];
    for (const path of samples) {
      const owners = SEO_MODULES.filter(({ seo }) => seo.match(path)).map((m) => m.id);
      expect(owners.length, `${path}: ${owners.join(', ')}`).toBeLessThanOrEqual(1);
    }
  });

  it('normalizePathname membuang query, hash, dan garis miring di akhir', () => {
    expect(normalizePathname('/harga/')).toBe('/harga');
    expect(normalizePathname('/harga?utm_source=chatgpt.com#faq')).toBe('/harga');
    expect(normalizePathname('/template//kategori/company-profile/')).toBe('/template/kategori/company-profile');
    expect(normalizePathname('')).toBe('/');
    expect(normalizePathname('/')).toBe('/');
    expect(normalizePathname('harga')).toBe('/harga');
  });
});

describe('getHead', () => {
  it("getHead('/harga') noindex,follow selama halamannya stub (kriteria WP1)", () => {
    expect(getHead('/harga', DATA).robots).toBe('noindex,follow');
  });

  it('semua rute stub: noindex,follow, tanpa canonical, judul unik dan berisi', () => {
    const titles = new Set<string>();
    for (const path of STUB_PATHS) {
      const head = getHead(path, DATA);
      expect(findSeoModule(path), path).not.toBeNull();
      expect(head.robots, path).toBe('noindex,follow');
      expect(head.canonical, path).toBeNull();
      expect(head.title.length, path).toBeGreaterThan(10);
      expect(head.description.length, path).toBeGreaterThan(40);
      expect(head.description.length, path).toBeLessThanOrEqual(160);
      expect(head.jsonLd, path).toEqual([]);
      expect(titles.has(head.title), `judul ganda: ${head.title}`).toBe(false);
      titles.add(head.title);
    }
  });

  it('tanpa angka harga di kepala stub (harga hanya dari data template)', () => {
    for (const path of STUB_PATHS) {
      const head = getHead(path, DATA);
      expect(`${head.title} ${head.description}`, path).not.toMatch(/Rp\s?\d|\d\.\d{3}\.\d{3}/);
    }
  });

  it('path dengan garis miring atau query memakai kepala yang sama', () => {
    expect(getHead('/harga/?utm_source=x', DATA)).toEqual(getHead('/harga', DATA));
  });

  it('kategori dan artikel yang tidak ada, serta path tanpa pemilik → kepala 404', () => {
    expect(getHead('/template/kategori/tidak-ada', DATA)).toEqual(notFoundHead());
    expect(getHead('/panduan/tidak-ada', DATA)).toEqual(notFoundHead());
    expect(getHead('/halaman-tidak-ada-xyz', DATA)).toEqual(notFoundHead());
    expect(notFoundHead().robots).toBe('noindex,follow');
  });
});

describe('getIndexableRoutes', () => {
  it('kosong selama semua halaman baru masih stub (tidak ada yang masuk sitemap)', () => {
    const paths = getIndexableRoutes(DATA).map((entry) => entry.path);
    for (const path of STUB_PATHS) expect(paths).not.toContain(path);
  });
});

describe('head.ts (stub)', () => {
  it('renderHeadTags men-escape semua nilai dan hanya menulis canonical bila ada', () => {
    const html = renderHeadTags({
      ...stubHead({ title: 'A & B <script>', description: 'Kutip "ganda" & \'tunggal\'' }),
    });
    expect(html).toContain('<title>A &amp; B &lt;script&gt;</title>');
    expect(html).toContain('content="Kutip &quot;ganda&quot; &amp; &#39;tunggal&#39;"');
    expect(html).toContain('<meta name="robots" content="noindex,follow">');
    expect(html).not.toContain('canonical');
    expect(renderHeadTags({ ...notFoundHead(), robots: 'index,follow', canonical: 'https://garudanexa.com/harga' })).toContain(
      '<link rel="canonical" href="https://garudanexa.com/harga">',
    );
    expect(escapeHtml(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;');
  });
});
