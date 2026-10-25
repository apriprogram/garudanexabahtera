// @vitest-environment node
// Jalankan: npx vitest run src/content
// Isi halaman template (docs/platform/SEO-PLAN.md §5.5 langkah 3, Lampiran A): file salinan & isi untuk setiap template
// terbit, 600–900 kata unik, H1/judul/meta Lampiran A, klaim jujur per template, alt gambar untuk file yang ada.
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FIXTURE_TEMPLATES } from '../../lib/__tests__/preloadFixture';
import { galleryAlts, templateContent, TEMPLATE_CONTENT_SLUGS } from '../../pages/public/template/templateContent';
import { PLANNED_ARTICLE_SLUGS } from '../../seo/paths';
import { DESCRIPTION_MAX, TEMPLATE_COPY, TITLE_MAX, templateDescription, templateTitle } from '../../seo/templateSeo';
import type { Template } from '../../types/platform';
import { TEMPLATE_PAGES, fillName, templateH1, templatePreviewAlt } from '../templateCopy';
import type { TemplatePageContent } from '../templates/page.types';

const SLUGS = ['corporate-nexa', 'startup-clean', 'arena-club', 'aura-studio', 'finova', 'serenity', 'tanimakmur', 'puncakgear'];
const words = (text: string) => text.match(/[\p{L}\p{N}]+/gu)?.length ?? 0;

/** Semua teks yang tampil di halaman dari file isi (tanpa alt gambar dan slug panduan). */
const visibleText = (c: TemplatePageContent): string =>
  [
    c.lead,
    c.suitableFor.intro,
    ...c.suitableFor.items,
    ...c.parts.flatMap((p) => [p.name, p.text]),
    c.partsNote ?? '',
    ...c.cms,
    c.cmsNote ?? '',
    ...c.demo,
    c.custom,
    ...c.faq.flatMap((f) => [f.question, f.answer]),
  ].join(' ');

// Serenity (2026-10-25) belum ada di fixture prerender bersama: baris katalognya (migrasi 018) dibuat di sini
const SERENITY: Template = { ...FIXTURE_TEMPLATES[4], id: 27, slug: 'serenity', name: 'Serenity', category: 'Yoga & Wellness', price: 1290000, template_code: 'serenity', sort_order: 6 };
// TaniMakmur (2026-10-25, migrasi 020) juga belum ada di fixture bersama
const TANIMAKMUR: Template = { ...FIXTURE_TEMPLATES[4], id: 33, slug: 'tanimakmur', name: 'TaniMakmur', category: 'Toko Online', price: 1590000, template_code: 'tanimakmur', sort_order: 8 };
// PuncakGear (2026-10-25, migrasi 021) juga belum ada di fixture prerender bersama
const PUNCAKGEAR: Template = { ...FIXTURE_TEMPLATES[4], id: 31, slug: 'puncakgear', name: 'PuncakGear', category: 'Toko Online', price: 1590000, template_code: 'puncakgear', sort_order: 9 };
const bySlug = (slug: string) => [...FIXTURE_TEMPLATES, SERENITY, TANIMAKMUR, PUNCAKGEAR].find((t) => t.slug === slug) as Template;

describe('src/content/templates', () => {
  it('setiap template terbit punya salinan SEO, H1 dan file isi', () => {
    expect(TEMPLATE_CONTENT_SLUGS).toEqual([...SLUGS].sort());
    for (const slug of SLUGS) {
      expect(TEMPLATE_COPY[slug], slug).toBeDefined();
      expect(TEMPLATE_PAGES[slug], slug).toBeDefined();
      expect(templateContent(slug), slug).not.toBeNull();
    }
  });

  it('H1, title dan meta description sesuai Lampiran A (harga dari data, ≤ 60 / ≤ 155 karakter)', () => {
    const h1 = Object.fromEntries(SLUGS.map((slug) => [slug, templateH1(bySlug(slug))]));
    expect(h1).toEqual({
      'corporate-nexa': 'Corporate Nexa: Template Website Company Profile Perusahaan',
      'startup-clean': 'Startup Clean: Template Website UMKM & Startup',
      'arena-club': 'Arena Club: Template Website Klub Olahraga, Padel & Futsal',
      'aura-studio': 'Aura Studio: Template Website Klinik Kecantikan & Salon',
      finova: 'Finova: Template Website Fintech & Startup',
      serenity: 'Serenity: Template Website Studio Yoga & Pilates',
      tanimakmur: 'TaniMakmur: Template Website Toko Pertanian & Urban Farming',
      puncakgear: 'PuncakGear: Template Website Toko Outdoor & Perlengkapan Pendakian',
    });
    const titles = Object.fromEntries(SLUGS.map((slug) => [slug, templateTitle(bySlug(slug))]));
    expect(titles).toEqual({
      'corporate-nexa': 'Corporate Nexa: Template Company Profile – Rp1,5 jt',
      'startup-clean': 'Startup Clean: Template Website UMKM & Startup – Rp990 rb',
      'arena-club': 'Arena Club: Template Website Klub Olahraga – Rp1,29 jt',
      'aura-studio': 'Aura Studio: Template Website Klinik & Salon – Rp1,39 jt',
      finova: 'Finova: Template Website Fintech & Startup – Rp1,79 jt',
      serenity: 'Serenity: Template Website Studio Yoga – Rp1,29 jt',
      tanimakmur: 'TaniMakmur: Template Website Toko Pertanian – Rp1,59 jt',
      puncakgear: 'PuncakGear: Template Website Toko Outdoor – Rp1,59 jt',
    });
    for (const slug of SLUGS) {
      const t = bySlug(slug);
      expect(templateTitle(t).length, slug).toBeLessThanOrEqual(TITLE_MAX);
      const description = templateDescription(t);
      expect(description.length, slug).toBeLessThanOrEqual(DESCRIPTION_MAX);
      expect(description, slug).toContain('sudah termasuk domain, hosting & SSL tahun pertama');
      // Harga di meta selalu harga DB, juga bila harganya naik ke 8 digit
      expect(templateDescription({ ...t, price: 12_490_000 }).length, slug).toBeLessThanOrEqual(DESCRIPTION_MAX);
      expect(templateDescription({ ...t, price: 12_490_000 }), slug).toContain('Rp12.490.000');
    }
    // Nama template dari DB, bukan tertulis di salinan
    expect(templateH1({ ...bySlug('finova'), name: 'Finova Pro' })).toBe('Finova Pro: Template Website Fintech & Startup');
  });

  it('600–900 kata unik per template, 4–6 FAQ, panduan dari daftar rencana', () => {
    for (const slug of SLUGS) {
      const c = templateContent(slug) as TemplatePageContent;
      const count = words(visibleText(c));
      expect(count, `${slug}: ${count} kata`).toBeGreaterThanOrEqual(600);
      expect(count, `${slug}: ${count} kata`).toBeLessThanOrEqual(900);
      expect(c.faq.length, slug).toBeGreaterThanOrEqual(4);
      expect(c.faq.length, slug).toBeLessThanOrEqual(6);
      expect(c.parts.length, slug).toBeGreaterThanOrEqual(8);
      expect(c.guides.length, slug).toBeGreaterThan(0);
      for (const guide of c.guides) expect(PLANNED_ARTICLE_SLUGS, slug).toContain(guide);
    }
  });

  it('isi tiap template unik (paragraf tidak disalin antar-template)', () => {
    const owner = new Map<string, string>();
    for (const slug of SLUGS) {
      const c = templateContent(slug) as TemplatePageContent;
      for (const text of [c.lead, c.suitableFor.intro, ...c.demo, c.custom, ...c.faq.map((f) => f.answer)]) {
        expect(owner.get(text), `${slug}: "${text.slice(0, 60)}…" juga ada di ${owner.get(text)}`).toBeUndefined();
        owner.set(text, slug);
      }
    }
  });

  it('klaim jujur: tanpa harga template tertulis, tanpa janji/garansi/rating; klaim khusus per template', () => {
    for (const slug of SLUGS) {
      const text = visibleText(templateContent(slug) as TemplatePageContent);
      const price = bySlug(slug).price.toLocaleString('id-ID');
      expect(text, slug).not.toContain(price);
      expect(text, slug).not.toMatch(/\b(dijamin|garansi|terbaik nomor|rating \d|bintang \d|#1)\b/i);
      expect(text, slug).not.toMatch(/\d+\s*(hari|jam) kerja/i); // waktu aktif belum ditetapkan pemilik
    }
    const arena = visibleText(templateContent('arena-club') as TemplatePageContent);
    expect(arena).toMatch(/tidak memiliki sistem booking/i);
    expect(arena).toMatch(/WhatsApp/);
    const aura = visibleText(templateContent('aura-studio') as TemplatePageContent);
    expect(aura).not.toMatch(/menyembuhkan|mengobati|terbukti secara klinis|hasil permanen|BPOM|dokter spesialis/i);
    expect(aura).toMatch(/bukan janji hasil medis/);
    const finova = visibleText(templateContent('finova') as TemplatePageContent);
    expect(finova).not.toMatch(/\bOJK\b|Bank Indonesia|diawasi oleh|berizin resmi|terdaftar dan diawasi/i);
    expect(finova).toMatch(/tidak memproses transaksi/);
    const serenity = visibleText(templateContent('serenity') as TemplatePageContent);
    expect(serenity).not.toMatch(/menyembuhkan|mengobati|terapi|terbukti secara klinis|depresi|kecemasan/i);
    expect(serenity).toMatch(/bukan pengganti layanan kesehatan/);
    expect(serenity).toMatch(/tidak punya kalender/);
    const tani = visibleText(templateContent('tanimakmur') as TemplatePageContent);
    expect(tani).not.toMatch(/pasti panen|pasti tumbuh|100% aman|bebas hama|hasil panen naik/i);
    expect(tani).toMatch(/tidak punya keranjang/);
    expect(tani).toMatch(/bergantung pada cuaca/);
    const puncakgear = visibleText(templateContent('puncakgear') as TemplatePageContent);
    expect(puncakgear).toMatch(/tidak punya keranjang belanja maupun pembayaran online/);
    expect(puncakgear).toMatch(/bukan sumber resmi/);
  });

  it('TaniMakmur: kata kunci "template website toko pertanian" di judul, meta, H1, dan pembuka; turunannya di isi', () => {
    const t = bySlug('tanimakmur');
    const c = templateContent('tanimakmur') as TemplatePageContent;
    const keyword = 'template website toko pertanian';
    expect(templateTitle(t).toLowerCase()).toContain(keyword);
    expect(templateDescription(t).toLowerCase()).toContain(keyword);
    expect(templateDescription(t)).toContain('Rp1.590.000');
    expect(templateH1(t).toLowerCase()).toContain(keyword);
    expect(fillName(c.lead, t).toLowerCase()).toContain(keyword);
    const text = visibleText(c).toLowerCase();
    for (const secondary of ['website toko pertanian online', 'website toko benih dan pupuk', 'website toko alat tani']) expect(text).toContain(secondary);
    // Fitur sesuai demo: pesan & konsultasi lewat WhatsApp, tanpa keranjang/checkout/pembayaran online yang sungguhan
    expect(text).toMatch(/tidak ada keranjang belanja otomatis/);
    expect(text).not.toMatch(/\bcheckout otomatis|\bpayment gateway|\bbayar online di website/);
    expect(TEMPLATE_COPY.tanimakmur.updated).toBe('2026-10-25');
  });

  it('PuncakGear: kata kunci utama di title, meta, H1 & pembuka; kata kunci turunan di isi; niche spesifik', () => {
    const t = bySlug('puncakgear');
    const primary = /template website toko outdoor/i;
    expect(templateTitle(t)).toMatch(primary);
    expect(templateDescription(t)).toMatch(primary);
    expect(templateDescription(t)).toBe(
      'Template website toko outdoor & sewa alat pendakian, lengkap panduan per gunung. Rp1.590.000 sudah termasuk domain, hosting & SSL tahun pertama.',
    );
    expect(templateH1(t)).toMatch(primary);
    const c = templateContent('puncakgear') as TemplatePageContent;
    expect(fillName(c.lead, t)).toMatch(/^PuncakGear adalah template website toko outdoor /);
    const text = visibleText(c).toLowerCase();
    for (const keyword of ['website toko perlengkapan pendakian', 'website toko alat gunung', 'website sewa alat pendakian']) expect(text, keyword).toContain(keyword);
    expect(TEMPLATE_COPY.puncakgear.niche).toBe('Toko Outdoor & Sewa Alat Pendakian');
    expect(TEMPLATE_PAGES.puncakgear.niche).toBe('toko outdoor & perlengkapan pendakian');
    expect(TEMPLATE_COPY.puncakgear.updated).toBe('2026-10-25');
    // Jujur: panduan & sewa sesuai demo, tanpa keranjang/pembayaran/stok/booking sungguhan
    expect(text).not.toMatch(/checkout otomatis|bayar online di website|stok otomatis|booking online/);
    expect(text).toMatch(/kalkulator sewa/);
  });

  it('alt gambar hanya untuk file yang ada, memakai nama template dari DB, dan cadangan alt untuk gambar lain', () => {
    for (const slug of SLUGS) {
      const c = templateContent(slug) as TemplatePageContent;
      for (const [file, alt] of Object.entries(c.imageAlts)) {
        expect(existsSync(resolve('public/assets/templates', file)), file).toBe(true);
        expect(alt, file).toContain('{nama}');
        expect(fillName(alt, bySlug(slug)), file).toContain(bySlug(slug).name);
      }
    }
    const aura = bySlug('aura-studio');
    const alts = galleryAlts(aura, ['/assets/templates/aura-studio-preview.webp', '/assets/sites/9/foto-baru.webp'], templateContent('aura-studio'));
    expect(alts[0]).toBe('Tampilan beranda template website klinik kecantikan Aura Studio di desktop dan HP');
    expect(alts[1]).toBe('Tampilan template website klinik kecantikan & salon Aura Studio, gambar 2 dari 2');
    expect(templatePreviewAlt(aura)).toBe('Tampilan beranda template website klinik kecantikan & salon Aura Studio');
  });

  it('template baru tanpa file salinan: H1 & alt dari kategori DB', () => {
    const fresh: Template = { ...bySlug('finova'), id: 99, slug: 'resto-hangat', name: 'Resto Hangat', category: 'Kuliner' };
    expect(templateH1(fresh)).toBe('Resto Hangat: Template Website Kuliner');
    expect(templatePreviewAlt(fresh)).toBe('Tampilan beranda template website kuliner Resto Hangat');
    expect(templateContent('resto-hangat')).toBeNull();
    expect(galleryAlts(fresh, ['/a.webp', '/b.webp'], null)).toEqual([
      'Tampilan beranda template website kuliner Resto Hangat',
      'Tampilan template website kuliner Resto Hangat, gambar 2 dari 2',
    ]);
  });
});
