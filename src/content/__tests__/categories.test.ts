// @vitest-environment node
// Jalankan: npx vitest run src/content
// Halaman kategori (docs/platform/SEO-PLAN.md §2, §5.5 langkah 2, Lampiran A): pemetaan kategori DB → slug, aturan
// index (≥ 2 template, atau panduan ≥ 300 kata unik + FAQ), judul/meta, isi panduan tanpa nama/harga template.
import { describe, expect, it } from 'vitest';
import { FIXTURE_TEMPLATES } from '../../lib/__tests__/preloadFixture';
import CategorySeo from '../../pages/public/catalog/CategoryPage.seo';
import { CATEGORY_SLUGS, PLANNED_ARTICLE_SLUGS, categoryPath } from '../../seo/paths';
import { getHead, getIndexableRoutes } from '../../seo/routes';
import { DESCRIPTION_MAX, TITLE_MAX } from '../../seo/templateSeo';
import type { SeoData } from '../../seo/types';
import type { Template } from '../../types/platform';
import {
  CATEGORIES,
  CATEGORY_LIST,
  categoryDescription,
  categoryOf,
  isCategoryIndexable,
  templatesInCategory,
} from '../categories';
import { CATEGORY_CONTENT } from '../categories.content';

const words = (text: string) => text.match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
const guideText = (slug: keyof typeof CATEGORY_CONTENT) => {
  const c = CATEGORY_CONTENT[slug];
  return [c.guideIntro, ...c.checklist.flatMap((item) => [item.title, item.text])].join(' ');
};

const data = (templates: Template[]): SeoData => ({
  settings: {},
  navbar: [],
  templates,
  projects: [],
  templateBySlug: Object.fromEntries(templates.map((t) => [t.slug, t])),
  builtAt: '2026-10-23T03:00:00.000Z',
});

describe('src/content/categories', () => {
  it('memetakan nama kategori di DB ke 10 slug (aturan sama dengan categorySlugOf & seo.php)', () => {
    expect(CATEGORY_LIST).toHaveLength(10);
    expect(CATEGORY_LIST.map((c) => c.slug)).toEqual([...CATEGORY_SLUGS]);
    expect(categoryOf('Company Profile')?.slug).toBe('company-profile');
    expect(categoryOf('Kecantikan & Klinik')?.slug).toBe('kecantikan-klinik');
    expect(categoryOf('Olahraga & Komunitas')?.slug).toBe('olahraga-komunitas');
    expect(categoryOf('Fintech & Startup')?.slug).toBe('fintech-startup');
    expect(categoryOf('Yoga & Wellness')?.slug).toBe('yoga-wellness');
    expect(templatesInCategory(FIXTURE_TEMPLATES, 'yoga-wellness').map((t) => t.slug)).toEqual(['serenity']);
    expect(categoryOf('Toko Online')?.slug).toBe('toko-online');
    expect(categoryOf('Sekolah & Pendidikan')?.slug).toBe('sekolah-pendidikan');
    // Batch 2026-10-28: MediCare General, MomKid Hospital, SpecialistPlus, HealthLink; HomeNest
    expect(categoryOf('Kesehatan & Rumah Sakit')?.slug).toBe('kesehatan-rumah-sakit');
    expect(categoryOf('Properti & Real Estate')?.slug).toBe('properti-real-estate');
    // Batch 2026-10-29: Lajur, Nusaline, Lawatan, Kemudi, Pesiar
    expect(categoryOf('Travel & Transportasi')?.slug).toBe('travel-transportasi');
    expect(categoryOf(' company profile ')?.slug).toBe('company-profile');
    expect(categoryOf('Kuliner')).toBeNull();
    expect(categoryOf('')).toBeNull();
    expect(templatesInCategory(FIXTURE_TEMPLATES, 'company-profile').map((t) => t.slug)).toEqual(['corporate-nexa', 'startup-clean']);
    expect(templatesInCategory([{ ...FIXTURE_TEMPLATES[0], status: 'draft' }], 'company-profile')).toEqual([]);
  });

  it('title ≤ 60 & description ≤ 155 (Lampiran A), harga termurah dari data', () => {
    for (const meta of CATEGORY_LIST) {
      expect(meta.title.length, meta.slug).toBeLessThanOrEqual(TITLE_MAX);
      const templates = templatesInCategory(FIXTURE_TEMPLATES, meta.slug);
      for (const description of [categoryDescription(meta, templates), categoryDescription(meta, []), meta.descriptionNoPrice]) {
        expect(description.length, meta.slug).toBeLessThanOrEqual(DESCRIPTION_MAX);
        expect(description, meta.slug).not.toContain('{harga_min}');
      }
    }
    expect(categoryDescription(CATEGORIES['company-profile'], templatesInCategory(FIXTURE_TEMPLATES, 'company-profile'))).toContain(
      'Mulai Rp990 rb',
    );
    expect(categoryDescription(CATEGORIES['company-profile'], [])).not.toMatch(/Rp\d/);
  });

  it('panduan "Apa yang perlu ada di website …" ≥ 300 kata unik, 3–5 FAQ (dasar hasGuide)', () => {
    const seen = new Set<string>();
    for (const meta of CATEGORY_LIST) {
      const count = words(guideText(meta.slug));
      expect(count, `${meta.slug}: ${count} kata`).toBeGreaterThanOrEqual(300);
      const faq = CATEGORY_CONTENT[meta.slug].faq;
      expect(faq.length, meta.slug).toBeGreaterThanOrEqual(3);
      expect(faq.length, meta.slug).toBeLessThanOrEqual(5);
      expect(meta.hasGuide, meta.slug).toBe(true);
      for (const item of CATEGORY_CONTENT[meta.slug].checklist) {
        expect(seen.has(item.text), item.title).toBe(false);
        seen.add(item.text);
      }
    }
  });

  it('isi kategori tanpa nama atau harga template (keduanya dari data)', () => {
    for (const meta of CATEGORY_LIST) {
      const c = CATEGORY_CONTENT[meta.slug];
      const text = [c.intro, guideText(meta.slug), ...c.faq.flatMap((f) => [f.question, f.answer]), meta.h1, meta.title, meta.description].join(' ');
      for (const t of FIXTURE_TEMPLATES) {
        expect(text, meta.slug).not.toContain(t.name);
        expect(text, meta.slug).not.toContain(t.price.toLocaleString('id-ID'));
      }
    }
  });

  it('aturan index: ≥ 2 template, atau panduan + ≥ 1 template; tanpa template → noindex', () => {
    expect(isCategoryIndexable(CATEGORIES['company-profile'], 2)).toBe(true);
    expect(isCategoryIndexable(CATEGORIES['fintech-startup'], 1)).toBe(true);
    expect(isCategoryIndexable({ ...CATEGORIES['fintech-startup'], hasGuide: false }, 1)).toBe(false);
    expect(isCategoryIndexable(CATEGORIES['fintech-startup'], 0)).toBe(false);

    // Fixture bersama belum punya template "Toko Online" (2026-10-25): satu baris contoh agar semua kategori terisi
    const toko: Template = { ...FIXTURE_TEMPLATES[4], id: 41, slug: 'skynusa', name: 'SkyNusa', category: 'Toko Online', template_code: 'skynusa' };
    // Template sekolah (2026-10-25) juga belum ada di fixture bersama
    const sekolah: Template = { ...FIXTURE_TEMPLATES[4], id: 42, slug: 'madani', name: 'Madani', category: 'Sekolah & Pendidikan', template_code: 'madani' };
    // Batch 2026-10-28 juga belum ada di fixture bersama. Properti hanya punya 1 template: diindeks lewat hasGuide
    const rs: Template = {
      ...FIXTURE_TEMPLATES[4],
      id: 43,
      slug: 'medicare-general',
      name: 'MediCare General',
      category: 'Kesehatan & Rumah Sakit',
      template_code: 'medicare-general',
    };
    const properti: Template = { ...FIXTURE_TEMPLATES[4], id: 44, slug: 'homenest', name: 'HomeNest', category: 'Properti & Real Estate', template_code: 'homenest' };
    // Batch 2026-10-29 (travel & transportasi) juga belum ada di fixture bersama
    const travel: Template = { ...FIXTURE_TEMPLATES[4], id: 45, slug: 'kemudi', name: 'Kemudi', category: 'Travel & Transportasi', template_code: 'kemudi' };
    const full = data([...FIXTURE_TEMPLATES, toko, sekolah, rs, properti, travel]);
    for (const slug of ['toko-online', 'sekolah-pendidikan', 'kesehatan-rumah-sakit', 'properti-real-estate', 'travel-transportasi'] as const) {
      expect(getHead(categoryPath(slug), data(FIXTURE_TEMPLATES)).robots, slug).toBe('noindex,follow');
    }
    expect(templatesInCategory(full.templates ?? [], 'properti-real-estate').map((t) => t.slug)).toEqual(['homenest']);
    expect(isCategoryIndexable(CATEGORIES['properti-real-estate'], 1)).toBe(true);
    expect(templatesInCategory(full.templates ?? [], 'travel-transportasi').map((t) => t.slug)).toEqual(['kemudi']);
    expect(isCategoryIndexable(CATEGORIES['travel-transportasi'], 1)).toBe(true);
    for (const slug of CATEGORY_SLUGS) {
      const head = getHead(categoryPath(slug), full);
      expect(head.robots, slug).toBe('index,follow');
      expect(head.canonical, slug).toBe(`https://garudanexa.com${categoryPath(slug)}`);
      expect(head.jsonLd.map((node) => (node as { '@type': string })['@type']), slug).toEqual([
        'Organization',
        'WebSite',
        'CollectionPage',
        'ItemList',
        'BreadcrumbList',
      ]);
    }
    const withoutBeauty = data(FIXTURE_TEMPLATES.filter((t) => t.slug !== 'aura-studio'));
    expect(getHead('/template/kategori/kecantikan-klinik', withoutBeauty).robots).toBe('noindex,follow');
    expect(getHead('/template/kategori/kecantikan-klinik', withoutBeauty).canonical).toBeNull();
    expect(getIndexableRoutes(withoutBeauty).map((e) => e.path)).not.toContain('/template/kategori/kecantikan-klinik');
    // Semua kategori tetap diprerender (routes), sitemap hanya yang index
    expect(CategorySeo.routes?.(withoutBeauty).map((e) => e.path)).toEqual(CATEGORY_SLUGS.map(categoryPath));
  });

  it('ItemList kategori = template kategori itu; lastmod = tanggal template terbaru di kategori', () => {
    const full = data(FIXTURE_TEMPLATES.map((t) => (t.slug === 'arena-club' ? { ...t, updated_at: '2026-11-02 10:00:00' } : t)));
    const list = getHead('/template/kategori/company-profile', full).jsonLd.find((n) => (n as { '@type': string })['@type'] === 'ItemList') as {
      itemListElement: { url: string }[];
    };
    expect(list.itemListElement.map((i) => i.url)).toEqual([
      'https://garudanexa.com/template/corporate-nexa',
      'https://garudanexa.com/template/startup-clean',
    ]);
    const routes = Object.fromEntries((CategorySeo.routes?.(full) ?? []).map((e) => [e.path, e.lastmod]));
    expect(routes['/template/kategori/olahraga-komunitas']).toBe('2026-11-02');
    expect(routes['/template/kategori/company-profile']).toBe('2026-10-29');
  });

  it('kesehatan & properti (2026-10-28): jujur soal fitur, tanpa klaim mutlak atau status lembaga', () => {
    const text = (slug: 'kesehatan-rumah-sakit' | 'properti-real-estate') => {
      const meta = CATEGORIES[slug];
      const c = CATEGORY_CONTENT[slug];
      return [meta.name, meta.h1, meta.title, meta.description, meta.descriptionNoPrice, c.intro, guideText(slug), ...c.faq.flatMap((f) => [f.question, f.answer])].join(' ');
    };
    for (const slug of ['kesehatan-rumah-sakit', 'properti-real-estate'] as const) {
      expect(text(slug), slug).not.toMatch(/dijamin|garansi|terbaik|#1|termurah|akreditasi|terakreditasi|izin|lisensi|termasuk domain/i);
      // Nama template dari data, bukan dari teks kategori
      expect(text(slug), slug).not.toMatch(/MediCare|MomKid|SpecialistPlus|HealthLink|HomeNest/i);
    }
    // Landing page: janji temu = pesan WhatsApp, tanpa data pasien, rekam medis, atau pembayaran online
    const rs = text('kesehatan-rumah-sakit');
    for (const phrase of ['pesan WhatsApp', 'tidak menyimpan data pasien', 'bukan sistem rekam medis', 'tidak memiliki pembayaran online']) {
      expect(rs).toContain(phrase);
    }
    // Listing di CMS, bukan database; simulasi KPR hanya perkiraan; tanpa pembayaran online
    const properti = text('properti-real-estate');
    for (const phrase of ['bukan portal listing dengan database', 'perkiraan cicilan', 'ditentukan bank', 'tidak memiliki pembayaran online']) {
      expect(properti).toContain(phrase);
    }
    expect(CATEGORIES['properti-real-estate'].guides.every((slug) => (PLANNED_ARTICLE_SLUGS as readonly string[]).includes(slug))).toBe(true);
    expect(CATEGORIES['kesehatan-rumah-sakit'].guides.every((slug) => (PLANNED_ARTICLE_SLUGS as readonly string[]).includes(slug))).toBe(true);
  });

  it('travel & transportasi (2026-10-29): pesan WhatsApp, bukan sistem tiket, tanpa klaim mutlak atau status lembaga', () => {
    const meta = CATEGORIES['travel-transportasi'];
    const c = CATEGORY_CONTENT['travel-transportasi'];
    const text = [meta.name, meta.h1, meta.title, meta.description, meta.descriptionNoPrice, c.intro, guideText('travel-transportasi'), ...c.faq.flatMap((f) => [f.question, f.answer])].join(' ');
    expect(text).not.toMatch(/dijamin|garansi|terbaik|#1|termurah|izin|lisensi|terdaftar|berizin|sertifikat|asuransi|100%|termasuk domain/i);
    // Nama template dan merek kendaraan tidak ditulis di teks kategori
    expect(text).not.toMatch(/Lajur|Nusaline|Lawatan|Kemudi|Pesiar|Toyota|Hino|Mercedes|Avanza|Innova|HiAce/i);
    for (const phrase of ['pesan WhatsApp', 'bukan sistem tiket', 'tidak menampilkan ketersediaan kursi secara real-time', 'tidak memiliki pembayaran online']) {
      expect(text).toContain(phrase);
    }
    expect(meta.guides.every((slug) => (PLANNED_ARTICLE_SLUGS as readonly string[]).includes(slug))).toBe(true);
  });
});
