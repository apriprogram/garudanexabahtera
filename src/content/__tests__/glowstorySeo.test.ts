// @vitest-environment node
// Jalankan: npx vitest run src/content/__tests__/glowstorySeo.test.ts
// SEO halaman katalog /template/glowstory (permintaan pemilik 2026-10-25): kata kunci utama "template website toko
// skincare" di title, meta description, H1, dan lead; kata kunci pendukung ("website toko kosmetik online", "website toko
// kecantikan", "website toko skincare lokal") muncul wajar di isi; batas panjang Lampiran A; klaim jujur (keranjang =
// daftar belanja WhatsApp, tanpa pembayaran/penagihan otomatis, kuis bukan diagnosis, tanpa klaim hasil pada kulit).
import { describe, expect, it } from 'vitest';
import { FIXTURE_TEMPLATES } from '../../lib/__tests__/preloadFixture';
import { templateContent } from '../../pages/public/template/templateContent';
import { DESCRIPTION_MAX, TEMPLATE_COPY, TITLE_MAX, templateDescription, templateTitle } from '../../seo/templateSeo';
import type { Template } from '../../types/platform';
import { fillName, templateH1, templatePreviewAlt } from '../templateCopy';
import type { TemplatePageContent } from '../templates/page.types';

// Baris katalog migrasi 023 (belum ada di fixture prerender bersama)
const GLOWSTORY: Template = { ...FIXTURE_TEMPLATES[4], id: 32, slug: 'glowstory', name: 'GlowStory', category: 'Toko Online', price: 1590000, template_code: 'glowstory', sort_order: 11 };
const PRIMARY = 'template website toko skincare';
const SECONDARY = ['website toko kosmetik online', 'website toko kecantikan', 'website toko skincare lokal'];
const content = templateContent('glowstory') as TemplatePageContent;
const lower = (text: string) => text.toLowerCase();
const visible = [
  content.lead,
  content.suitableFor.intro,
  ...content.suitableFor.items,
  ...content.parts.flatMap((p) => [p.name, p.text]),
  content.partsNote ?? '',
  ...content.cms,
  content.cmsNote ?? '',
  ...content.demo,
  content.custom,
  ...content.faq.flatMap((f) => [f.question, f.answer]),
].join(' ');

describe('GlowStory: SEO halaman katalog', () => {
  it('title: kata kunci utama, nama & harga dari data, ≤ 60 karakter', () => {
    const title = templateTitle(GLOWSTORY);
    expect(title).toBe('GlowStory: Template Website Toko Skincare – Rp1,59 jt');
    expect(lower(title)).toContain(PRIMARY);
    expect(title.length).toBeLessThanOrEqual(TITLE_MAX);
    expect(templateTitle({ ...GLOWSTORY, name: 'GlowStory Pro' })).toContain('GlowStory Pro:');
  });

  it('meta description: kata kunci utama, harga, manfaat domain/hosting/SSL, ≤ 155 karakter (juga harga 8 digit)', () => {
    const description = templateDescription(GLOWSTORY);
    expect(lower(description)).toContain(PRIMARY);
    expect(description).toContain('Rp1.590.000');
    expect(description).toContain('sudah termasuk domain, hosting & SSL tahun pertama');
    expect(description.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    expect(templateDescription({ ...GLOWSTORY, price: 12_490_000 }).length).toBeLessThanOrEqual(DESCRIPTION_MAX);
  });

  it('H1 & lead memuat kata kunci utama; kata kunci pendukung muncul di isi halaman', () => {
    expect(templateH1(GLOWSTORY)).toBe('GlowStory: Template Website Toko Skincare & Kosmetik Online');
    const lead = fillName(content.lead, GLOWSTORY);
    expect(lead.startsWith('GlowStory adalah template website toko skincare')).toBe(true);
    expect(lower(lead)).toContain('website toko kecantikan');
    for (const keyword of SECONDARY) expect(lower(visible), keyword).toContain(keyword);
    // Wajar, bukan ditumpuk: kata kunci utama tidak lebih dari 3 kali di seluruh isi
    expect(lower(visible).split(PRIMARY).length - 1).toBeLessThanOrEqual(3);
    expect(lower(templatePreviewAlt(GLOWSTORY))).toContain('toko skincare');
  });

  it('klaim jujur: keranjang = daftar belanja WhatsApp, tanpa pembayaran/penagihan otomatis, kuis bukan diagnosis', () => {
    expect(visible).toMatch(/bukan sistem checkout/);
    expect(visible).toMatch(/tidak memproses pembayaran online/);
    expect(visible).toMatch(/tidak menagih otomatis/);
    expect(visible).toMatch(/bukan diagnosis/);
    // Pertanyaan "bisa membayar langsung di website?" dijawab jujur: belum
    expect(content.faq.find((f) => /membayar langsung di website/.test(f.question))?.answer).toMatch(/^Belum\./);
    expect(visible).not.toMatch(/checkout otomatis|pembayaran otomatis tersedia|stok otomatis tersedia|langganan ditagih otomatis/i);
    expect(visible).not.toMatch(/menyembuhkan|mengobati|memutihkan|jerawat hilang|hasil permanen|terbukti secara klinis|dijamin/i);
  });

  it('lastmod: tanggal isi halaman diperbarui hari ini', () => {
    expect(TEMPLATE_COPY.glowstory?.updated).toBe('2026-10-25');
  });
});
