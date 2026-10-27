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

const SLUGS = ['corporate-nexa', 'startup-clean', 'arena-club', 'aura-studio', 'finova', 'serenity', 'tanimakmur', 'puncakgear', 'gadgetku', 'glowstory', 'skynusa', 'madani', 'cakrawala', 'bestari', 'altura', 'portline', 'velora'];
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
// GadgetKu.id (2026-10-25, migrasi 022) juga belum ada di fixture prerender bersama
const GADGETKU: Template = { ...FIXTURE_TEMPLATES[4], id: 30, slug: 'gadgetku', name: 'GadgetKu.id', category: 'Toko Online', price: 1590000, template_code: 'gadgetku', sort_order: 10 };
// GlowStory (2026-10-25, migrasi 023) juga belum ada di fixture prerender bersama
const GLOWSTORY: Template = { ...FIXTURE_TEMPLATES[4], id: 32, slug: 'glowstory', name: 'GlowStory', category: 'Toko Online', price: 1590000, template_code: 'glowstory', sort_order: 11 };
// SkyNusa (2026-10-25, migrasi 019) juga belum ada di fixture prerender bersama
const SKYNUSA: Template = { ...FIXTURE_TEMPLATES[4], id: 41, slug: 'skynusa', name: 'SkyNusa', category: 'Toko Online', price: 1590000, template_code: 'skynusa', sort_order: 7 };
// Madani (2026-10-25, migrasi 024, kategori baru Sekolah & Pendidikan) juga belum ada di fixture prerender bersama
const MADANI: Template = { ...FIXTURE_TEMPLATES[4], id: 66, slug: 'madani', name: 'Madani', category: 'Sekolah & Pendidikan', price: 1690000, template_code: 'madani', sort_order: 12 };
// Cakrawala (2026-10-25, migrasi 025) juga belum ada di fixture prerender bersama
const CAKRAWALA: Template = { ...FIXTURE_TEMPLATES[4], id: 67, slug: 'cakrawala', name: 'Cakrawala', category: 'Sekolah & Pendidikan', price: 1690000, template_code: 'cakrawala', sort_order: 13 };
// Bestari (2026-10-26, migrasi 028, website SMA) juga belum ada di fixture prerender bersama
const BESTARI: Template = { ...FIXTURE_TEMPLATES[4], id: 83, slug: 'bestari', name: 'Bestari', category: 'Sekolah & Pendidikan', price: 1690000, template_code: 'bestari', sort_order: 14 };
// Altura (2026-10-27, migrasi 031, company profile berbahasa Inggris) juga belum ada di fixture prerender bersama
const ALTURA: Template = { ...FIXTURE_TEMPLATES[4], id: 86, slug: 'altura', name: 'Altura', category: 'Company Profile', price: 1890000, template_code: 'altura', sort_order: 15 };
// Portline (2026-10-27, migrasi 032, company profile berbahasa Inggris) juga belum ada di fixture prerender bersama
const PORTLINE: Template = { ...FIXTURE_TEMPLATES[4], id: 87, slug: 'portline', name: 'Portline', category: 'Company Profile', price: 1890000, template_code: 'portline', sort_order: 16 };
// Velora (2026-10-27, migrasi 033, company profile berbahasa Inggris) juga belum ada di fixture prerender bersama
const VELORA: Template = { ...FIXTURE_TEMPLATES[4], id: 88, slug: 'velora', name: 'Velora', category: 'Company Profile', price: 1890000, template_code: 'velora', sort_order: 17 };
const bySlug = (slug: string) => [...FIXTURE_TEMPLATES, SERENITY, TANIMAKMUR, PUNCAKGEAR, GADGETKU, GLOWSTORY, SKYNUSA, MADANI, CAKRAWALA, BESTARI, ALTURA, PORTLINE, VELORA].find((t) => t.slug === slug) as Template;

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
      gadgetku: 'GadgetKu.id: Template Website Toko Aksesoris HP',
      glowstory: 'GlowStory: Template Website Toko Skincare & Kosmetik Online',
      skynusa: 'SkyNusa: Template Website Toko Drone & Sewa Drone',
      madani: 'Madani: Template Website Sekolah Islam & PPDB Online',
      cakrawala: 'Cakrawala: Template Website SMK & SMA dengan Halaman PPDB',
      bestari: 'Bestari: Template Website SMA dengan Halaman PPDB',
      altura: 'Altura: Template Website Perusahaan Properti Berbahasa Inggris',
      portline: 'Portline: Template Website Perusahaan Pelayaran & Logistik',
      velora: 'Velora: Template Website Perusahaan Otomotif Berbahasa Inggris',
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
      gadgetku: 'GadgetKu.id: Template Website Toko Aksesoris HP – Rp1,59 jt',
      glowstory: 'GlowStory: Template Website Toko Skincare – Rp1,59 jt',
      skynusa: 'SkyNusa: Template Website Toko Drone – Rp1,59 jt',
      madani: 'Madani: Template Website Sekolah Islam – Rp1,69 jt',
      cakrawala: 'Cakrawala: Template Website SMK & SMA – Rp1,69 jt',
      bestari: 'Bestari: Template Website SMA & PPDB Online – Rp1,69 jt',
      altura: 'Altura: Template Website Perusahaan Properti – Rp1,89 jt',
      portline: 'Portline: Template Website Perusahaan Pelayaran – Rp1,89 jt',
      velora: 'Velora: Template Website Perusahaan Otomotif – Rp1,89 jt',
    });
    for (const slug of SLUGS) {
      const t = bySlug(slug);
      expect(templateTitle(t).length, slug).toBeLessThanOrEqual(TITLE_MAX);
      const description = templateDescription(t);
      expect(description.length, slug).toBeLessThanOrEqual(DESCRIPTION_MAX);
      // Domain tidak termasuk harga template (pemilik 2026-10-25): harga domain termurah dari domainPricing.ts
      expect(description, slug).toContain('sudah termasuk hosting & SSL tahun pertama; domain mulai Rp50.000/tahun.');
      expect(description, slug).not.toMatch(/termasuk domain|domain, hosting/);
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
    const gadgetku = visibleText(templateContent('gadgetku') as TemplatePageContent);
    expect(gadgetku).toMatch(/tidak punya keranjang/);
    expect(gadgetku).toMatch(/tidak dikirim ke server/);
    expect(gadgetku).not.toMatch(/sinkron otomatis|stok real-?time|pembayaran otomatis/i);
    const glowstory = visibleText(templateContent('glowstory') as TemplatePageContent);
    expect(glowstory).not.toMatch(/menyembuhkan|mengobati|memutihkan|terbukti secara klinis|hasil permanen/i);
    expect(glowstory).toMatch(/bukan diagnosis/);
    expect(glowstory).toMatch(/tidak memproses pembayaran online/);
    const skynusa = visibleText(templateContent('skynusa') as TemplatePageContent);
    expect(skynusa).not.toMatch(/pembayaran online otomatis|bebas izin|tanpa izin|\bDJI\b/i);
    expect(skynusa).toMatch(/tidak punya kalender ketersediaan unit/);
    expect(skynusa).toMatch(/WhatsApp/);
    expect(skynusa).toMatch(/bukan pembayaran online/);
    const madani = visibleText(templateContent('madani') as TemplatePageContent);
    expect(madani).toMatch(/tidak disimpan di website/);
    expect(madani).toMatch(/bukan sistem informasi sekolah/);
    expect(madani).not.toMatch(/terakreditasi resmi|lulus 100%|pasti diterima|e-rapor tersedia/i);
    const cakrawala = visibleText(templateContent('cakrawala') as TemplatePageContent);
    expect(cakrawala).toMatch(/tidak menyimpan data/);
    expect(cakrawala).toMatch(/tidak ada pembayaran online/);
    expect(cakrawala).toMatch(/fiktif/);
    expect(cakrawala).not.toMatch(/e-rapor tersedia|sistem informasi akademik lengkap|data pendaftar tersimpan|pembayaran online tersedia/i);
    const bestari = visibleText(templateContent('bestari') as TemplatePageContent);
    expect(bestari).toMatch(/tidak menyimpan data/);
    expect(bestari).toMatch(/tidak ada pembayaran online/);
    expect(bestari).toMatch(/fiktif/);
    expect(bestari).not.toMatch(/e-rapor tersedia|sistem informasi akademik lengkap|data pendaftar tersimpan|pembayaran online tersedia|tes calistung/i);
    // Bestari kini template SMA (2026-10-26): tidak ada sisa salinan sekolah dasar
    expect(bestari).not.toMatch(/\bSD\b|sekolah dasar|TK\/PAUD/);
    const altura = visibleText(templateContent('altura') as TemplatePageContent);
    expect(altura).toMatch(/tidak disimpan di website/);
    expect(altura).toMatch(/tidak memiliki sistem listing, booking, atau pembayaran/);
    expect(altura).toMatch(/fiktif/);
    expect(altura).toMatch(/bisa Anda ganti ke bahasa Indonesia/);
    expect(altura).not.toMatch(/imbal hasil|return investasi|pasti untung|ISO 9001|berizin resmi|terdaftar di bursa|listing otomatis|pembayaran online tersedia/i);
    // Portline (2026-10-27): formulir hanya menyusun pesan, "Track a shipment" hanya tautan, demo fiktif, tanpa merek nyata
    const portline = visibleText(templateContent('portline') as TemplatePageContent);
    expect(portline).toMatch(/data tidak disimpan di website|Tidak ada data yang disimpan di website/);
    expect(portline).toMatch(/bukan sistem pelacakan/);
    expect(portline).toMatch(/fiktif/);
    expect(portline).not.toMatch(/pelacakan kiriman real-?time tersedia|booking online tersedia|ISO 9001|IMO approved|terdaftar di bursa|\bMaersk\b|\bMSC\b|\bCOSCO\b/i);
    // Perusahaan demo = Quaymoor Group (fiktif); nama perusahaan/media nyata tidak dipakai, termasuk "Portline Group"
    expect(portline).not.toMatch(/Portline Group|\bHanjin\b|\bK ?Line\b|\bTidewater\b|\bNorthwind\b|Track a shipment/i);
    expect(portline).toMatch(/Quaymoor Group/);
    const velora = visibleText(templateContent('velora') as TemplatePageContent);
    expect(velora).toMatch(/tidak menyimpan data/);
    expect(velora).toMatch(/tidak punya sistem booking/);
    expect(velora).toMatch(/fiktif/);
    expect(velora).toMatch(/bahasa Indonesia/);
    expect(velora).not.toMatch(/booking online tersedia|pembayaran online tersedia|stok real-?time|ISO 9001|terdaftar di bursa/i);
    // Semua teks yang tampil (termasuk label & pesan galat formulir) adalah field CMS: salinan katalog tidak boleh menyebut
    // teks tertanam, dan memang menjanjikan label formulir bisa diganti
    expect(velora).toMatch(/label dan pesan galat formulir/);
    expect(velora).not.toMatch(/tertanam di template|tetap berbahasa Inggris/);
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
      'Template website toko outdoor & sewa alat pendakian + panduan gunung. Rp1.590.000 sudah termasuk hosting & SSL tahun pertama; domain mulai Rp50.000/tahun.',
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

  it('GadgetKu.id: kata kunci toko aksesoris HP di title, meta, H1, pembuka, dan isi halaman', () => {
    const t = bySlug('gadgetku');
    const c = templateContent('gadgetku') as TemplatePageContent;
    // Kata kunci utama di title, meta description, H1, dan paragraf pembuka
    expect(templateTitle(t)).toContain('Template Website Toko Aksesoris HP');
    expect(templateDescription(t)).toMatch(/^Template website toko aksesoris HP/);
    expect(templateDescription(t)).toContain('Rp1.590.000');
    expect(templateH1(t)).toContain('Template Website Toko Aksesoris HP');
    expect(c.lead).toContain('template website toko aksesoris HP');
    expect(TEMPLATE_PAGES.gadgetku?.niche).toBe('toko aksesoris HP');
    expect(TEMPLATE_COPY.gadgetku?.niche).toBe('Toko Aksesoris HP');
    // Kata kunci pendamping muncul alami di isi halaman
    const text = visibleText(c).toLowerCase();
    for (const keyword of ['website toko aksesoris handphone', 'website toko online aksesoris hp', 'website toko casing hp']) expect(text, keyword).toContain(keyword);
    // Fitur demo dijelaskan sesuai cara kerjanya: pencarian & pratinjau casing di browser, pesanan lewat WhatsApp
    expect(text).toMatch(/pilih merek[^.]*tipe/);
    expect(text).toContain('hanya tampil di browser');
    expect(text).toContain('tidak punya keranjang dan pembayaran online');
    // Jujur soal batas: teks "tipe HP" & mockup casing HP tertanam di template (toko non-HP = jasa custom)
    expect(text).toContain('tertanam di template');
    expect(text).not.toMatch(/bisa, selama barangnya/);
    expect(text).not.toMatch(/checkout otomatis|pembayaran online tersedia|stok otomatis/);
  });

  it('SkyNusa: kata kunci "template website toko drone" di judul, meta, H1, dan paragraf pembuka; kata kunci pendukung di isi', () => {
    const t = bySlug('skynusa');
    const keyword = /template website toko drone/i;
    expect(templateTitle(t)).toMatch(keyword);
    expect(templateDescription(t)).toMatch(/^Template website toko drone: /);
    expect(templateDescription(t)).toContain('Rp1.590.000 sudah termasuk hosting & SSL tahun pertama; domain mulai Rp50.000/tahun');
    expect(templateH1(t)).toMatch(keyword);
    const c = templateContent('skynusa') as TemplatePageContent;
    expect(fillName(c.lead, t)).toMatch(/^SkyNusa adalah template website toko drone /);
    const text = visibleText(c);
    for (const phrase of ['website toko drone', 'website toko online drone', 'website sewa drone']) expect(text, phrase).toContain(phrase);
    expect(TEMPLATE_COPY.skynusa?.niche).toBe('Toko & Sewa Drone');
    expect(TEMPLATE_COPY.skynusa?.updated).toBe('2026-10-25');
  });

  it('Madani: kata kunci "template website sekolah Islam" di judul, meta, H1, dan pembuka; kata kunci pendukung di isi', () => {
    const t = bySlug('madani');
    const keyword = /template website sekolah islam/i;
    expect(templateTitle(t)).toMatch(keyword);
    expect(templateDescription(t)).toMatch(/^Template website sekolah Islam /);
    expect(templateDescription(t)).toContain('Rp1.690.000 sudah termasuk hosting & SSL tahun pertama; domain mulai Rp50.000/tahun');
    expect(templateH1(t)).toMatch(keyword);
    const c = templateContent('madani') as TemplatePageContent;
    expect(fillName(c.lead, t)).toMatch(/^Madani adalah template website sekolah Islam /);
    const text = visibleText(c).toLowerCase();
    for (const phrase of ['website sma islam', 'website sekolah islam terpadu', 'website ppdb online', 'website madrasah aliyah']) expect(text, phrase).toContain(phrase);
    // Wajar, bukan ditumpuk
    expect(text.split('template website sekolah islam').length - 1).toBeLessThanOrEqual(3);
    expect(TEMPLATE_COPY.madani?.niche).toBe('Sekolah Islam');
    expect(TEMPLATE_PAGES.madani?.niche).toBe('sekolah Islam');
    expect(TEMPLATE_COPY.madani?.updated).toBe('2026-10-25');
  });

  it('Cakrawala: kata kunci "template website SMK" di judul, meta, H1, dan pembuka; kata kunci pendukung di isi', () => {
    const t = bySlug('cakrawala');
    const keyword = /template website SMK/i;
    expect(templateTitle(t)).toMatch(keyword);
    expect(templateDescription(t)).toMatch(/^Template website SMK /);
    expect(templateDescription(t)).toContain('Rp1.690.000 sudah termasuk hosting & SSL tahun pertama; domain mulai Rp50.000/tahun');
    expect(templateH1(t)).toMatch(keyword);
    const c = templateContent('cakrawala') as TemplatePageContent;
    expect(fillName(c.lead, t)).toMatch(/^Cakrawala adalah template website SMK /);
    const text = visibleText(c);
    for (const phrase of ['website sekolah', 'website SMK negeri dan swasta', 'website PPDB online', 'website sekolah vokasi']) expect(text, phrase).toContain(phrase);
    expect(TEMPLATE_COPY.cakrawala?.niche).toBe('Sekolah SMK & SMA');
    expect(TEMPLATE_PAGES.cakrawala?.niche).toBe('sekolah SMK & SMA');
    expect(TEMPLATE_COPY.cakrawala?.updated).toBe('2026-10-25');
  });

  it('Bestari: kata kunci "template website SMA" di judul, meta, H1, dan pembuka; kata kunci pendukung di isi', () => {
    const t = bySlug('bestari');
    const keyword = /template website SMA/i;
    expect(templateTitle(t)).toMatch(keyword);
    expect(templateDescription(t)).toMatch(/^Template website SMA /);
    expect(templateDescription(t)).toContain('Rp1.690.000 sudah termasuk hosting & SSL tahun pertama; domain mulai Rp50.000/tahun');
    expect(templateH1(t)).toMatch(keyword);
    const c = templateContent('bestari') as TemplatePageContent;
    expect(fillName(c.lead, t)).toMatch(/^Bestari adalah template website SMA /);
    const text = visibleText(c);
    for (const phrase of ['website SMA swasta', 'website PPDB SMA', 'website SMA negeri', 'website sekolah']) expect(text, phrase).toContain(phrase);
    // Wajar, bukan ditumpuk
    expect(text.toLowerCase().split('template website sma').length - 1).toBeLessThanOrEqual(3);
    expect(TEMPLATE_COPY.bestari?.niche).toBe('Sekolah Menengah Atas (SMA)');
    expect(TEMPLATE_PAGES.bestari?.niche).toBe('sekolah menengah atas');
    expect(TEMPLATE_COPY.bestari?.updated).toBe('2026-10-26');
  });

  it('Altura: kata kunci "template website perusahaan properti" di judul, meta, H1, dan pembuka; kata kunci pendukung di isi', () => {
    const t = bySlug('altura');
    const keyword = /template website perusahaan properti/i;
    expect(templateTitle(t)).toMatch(keyword);
    expect(templateDescription(t)).toMatch(/^Template website perusahaan properti /);
    expect(templateDescription(t)).toContain('Rp1.890.000 sudah termasuk hosting & SSL tahun pertama; domain mulai Rp50.000/tahun');
    expect(templateH1(t)).toMatch(keyword);
    const c = templateContent('altura') as TemplatePageContent;
    expect(fillName(c.lead, t)).toMatch(/^Altura adalah template website perusahaan properti /);
    const text = visibleText(c);
    for (const phrase of ['website developer properti', 'template company profile bahasa Inggris', 'multinasional', 'eksportir']) expect(text, phrase).toContain(phrase);
    // Wajar, bukan ditumpuk
    expect(text.toLowerCase().split('template website perusahaan properti').length - 1).toBeLessThanOrEqual(3);
    expect(TEMPLATE_COPY.altura?.niche).toBe('Perusahaan Properti & Company Profile Bahasa Inggris');
    expect(TEMPLATE_PAGES.altura?.niche).toBe('perusahaan properti berbahasa Inggris');
    expect(TEMPLATE_COPY.altura?.updated).toBe('2026-10-27');
  });

  it('Portline: kata kunci "template website perusahaan pelayaran" di judul, meta, H1, dan pembuka; kata kunci pendukung di isi', () => {
    const t = bySlug('portline');
    const keyword = /template website perusahaan pelayaran/i;
    expect(templateTitle(t)).toMatch(keyword);
    expect(templateDescription(t)).toMatch(/^Template website perusahaan pelayaran /);
    expect(templateDescription(t)).toContain('Rp1.890.000 sudah termasuk hosting & SSL tahun pertama; domain mulai Rp50.000/tahun');
    expect(templateH1(t)).toMatch(keyword);
    const c = templateContent('portline') as TemplatePageContent;
    expect(fillName(c.lead, t)).toMatch(/^Portline adalah template website perusahaan pelayaran /);
    const text = visibleText(c);
    for (const phrase of ['website perusahaan logistik', 'template company profile bahasa Inggris', 'bahasa Indonesia']) expect(text, phrase).toContain(phrase);
    // Wajar, bukan ditumpuk
    expect(text.toLowerCase().split('template website perusahaan pelayaran').length - 1).toBeLessThanOrEqual(3);
    expect(TEMPLATE_COPY.portline?.niche).toBe('Perusahaan Pelayaran & Logistik');
    expect(TEMPLATE_PAGES.portline?.niche).toBe('perusahaan pelayaran & logistik');
    expect(TEMPLATE_COPY.portline?.updated).toBe('2026-10-27');
  });

  it('Velora: kata kunci "template website perusahaan otomotif" di judul, meta, H1, dan pembuka; kata kunci pendukung di isi', () => {
    const t = bySlug('velora');
    const keyword = /template website perusahaan otomotif/i;
    expect(templateTitle(t)).toMatch(keyword);
    expect(templateDescription(t)).toMatch(/^Template website perusahaan otomotif /);
    expect(templateDescription(t)).toContain('Rp1.890.000 sudah termasuk hosting & SSL tahun pertama; domain mulai Rp50.000/tahun');
    expect(templateH1(t)).toMatch(keyword);
    const c = templateContent('velora') as TemplatePageContent;
    expect(fillName(c.lead, t)).toMatch(/^Velora adalah template website perusahaan otomotif /);
    const text = visibleText(c);
    for (const phrase of ['website dealer mobil', 'template company profile bahasa Inggris', 'website perusahaan multinasional']) expect(text, phrase).toContain(phrase);
    // Wajar, bukan ditumpuk
    expect(text.toLowerCase().split('template website perusahaan otomotif').length - 1).toBeLessThanOrEqual(3);
    expect(TEMPLATE_COPY.velora?.niche).toBe('Perusahaan Otomotif');
    expect(TEMPLATE_PAGES.velora?.niche).toBe('perusahaan otomotif');
    expect(TEMPLATE_COPY.velora?.updated).toBe('2026-10-27');
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
