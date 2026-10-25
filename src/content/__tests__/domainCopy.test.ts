// @vitest-environment node
// Jalankan: npx vitest run src/content/__tests__/domainCopy.test.ts
// Domain TIDAK termasuk harga template (keputusan pemilik 2026-10-25, docs/platform/ACCOUNT-DOMAIN-RENEWAL-SPEC.md §0):
// teks konten & SEO tidak pernah menyebut "termasuk domain"; yang termasuk = setup, hosting, SSL tahun pertama, dan harga
// domain termurah diambil dari src/lib/domainPricing.ts (bukan angka tetap).
import { describe, expect, it } from 'vitest';
import { DOMAIN_PRICE_FROM, rupiahCompact } from '../../lib/domainPricing';
import { FIXTURE_TEMPLATES } from '../../lib/__tests__/preloadFixture';
import { CATALOG_TITLE } from '../../pages/public/catalog/CatalogPage.seo';
import { HOME_DESCRIPTION } from '../../seo/pages/home.seo';
import { DOMAIN_FROM_TEXT, TEMPLATE_COPY, templateDescription } from '../../seo/templateSeo';
import type { Template } from '../../types/platform';
import { CATEGORY_LIST, categoryDescription, templatesInCategory } from '../categories';
import { homeIntro } from '../home';
import { WEB_SERVICE } from '../services';

/** Klaim lama: "termasuk domain", "(setup,) domain, hosting …", "domain & hosting" sebagai isi harga, "Domain tahun pertama". */
const DOMAIN_INCLUDED = /termasuk (setup(\s+awal)?, )?domain|domain, hosting|\+ domain & hosting|domain tahun pertama/i;

describe('domain tidak termasuk harga template', () => {
  it('teks domain termurah dari domainPricing.ts', () => {
    expect(DOMAIN_FROM_TEXT).toBe(`domain mulai ${rupiahCompact(DOMAIN_PRICE_FROM)}/tahun`);
    expect(DOMAIN_FROM_TEXT).toBe('domain mulai Rp50.000/tahun');
  });

  it('intro beranda: setup, hosting & SSL tahun pertama, ditambah domain pilihan mulai harga termurah', () => {
    const intro = homeIntro(FIXTURE_TEMPLATES);
    expect(intro).toContain('mulai Rp990 ribu sudah termasuk setup, hosting, dan SSL tahun pertama, ditambah domain pilihan Anda mulai Rp50.000/tahun.');
    expect(homeIntro([])).toContain('yang harganya sudah termasuk setup, hosting, dan SSL tahun pertama, ditambah domain pilihan Anda mulai Rp50.000/tahun.');
    for (const text of [intro, homeIntro([])]) expect(text).not.toMatch(DOMAIN_INCLUDED);
  });

  it('meta beranda, judul katalog, meta kategori dan halaman jasa tanpa klaim "termasuk domain"', () => {
    expect(HOME_DESCRIPTION).toContain(DOMAIN_FROM_TEXT);
    expect(CATALOG_TITLE).toBe('Template Website Siap Pakai + Hosting & SSL | Garuda Nexa');
    const texts = [HOME_DESCRIPTION, CATALOG_TITLE];
    for (const meta of CATEGORY_LIST) {
      texts.push(categoryDescription(meta, templatesInCategory(FIXTURE_TEMPLATES, meta.slug)), categoryDescription(meta, []), meta.descriptionNoPrice);
    }
    const web = WEB_SERVICE.sections.flatMap((s) => s.paragraphs).join(' ');
    expect(web).toContain('Harga template sudah termasuk setup, hosting, dan SSL tahun pertama (domain dipilih dan dibayar saat memesan)');
    texts.push(web);
    for (const text of texts) expect(text).not.toMatch(DOMAIN_INCLUDED);
    // Kategori company profile dengan harga: domain termurah ikut disebut
    const company = CATEGORY_LIST.find((c) => c.slug === 'company-profile')!;
    expect(categoryDescription(company, templatesInCategory(FIXTURE_TEMPLATES, 'company-profile'))).toBe(
      'Template website company profile untuk perusahaan, UMKM & startup. Mulai Rp990 rb, termasuk hosting & SSL tahun pertama; domain mulai Rp50.000/tahun.',
    );
  });

  it('salinan SEO per template memakai token {domain_mulai}, tanpa "termasuk domain" dan tanpa angka domain tetap', () => {
    for (const [slug, copy] of Object.entries(TEMPLATE_COPY)) {
      expect(copy.description, slug).toContain('{harga} sudah termasuk hosting & SSL tahun pertama; domain mulai {domain_mulai}/tahun.');
      expect(copy.description, slug).not.toMatch(DOMAIN_INCLUDED);
      expect(copy.description, slug).not.toMatch(/Rp\d/);
    }
    // Token terisi dari domainPricing.ts; harga template dari data
    const t = { ...FIXTURE_TEMPLATES[0], price: 1_500_000 } as Template;
    expect(templateDescription(t)).toContain('Rp1.500.000 sudah termasuk hosting & SSL tahun pertama; domain mulai Rp50.000/tahun.');
    expect(templateDescription(t)).not.toContain('{domain_mulai}');
  });
});
