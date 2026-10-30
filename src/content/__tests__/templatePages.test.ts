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

const SLUGS = ['corporate-nexa', 'startup-clean', 'arena-club', 'aura-studio', 'finova', 'serenity', 'tanimakmur', 'puncakgear', 'gadgetku', 'glowstory', 'skynusa', 'madani', 'cakrawala', 'bestari', 'altura', 'portline', 'velora', 'dermaga', 'saudagar', 'nusaniaga', 'jumantara', 'nawasena', 'pradipta', 'sparring-padel', 'smashhall', 'paynow', 'medicare-general', 'momkid', 'specialistplus', 'healthlink', 'homenest', 'lajur', 'nusaline', 'lawatan', 'kemudi', 'pesiar'];
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
// Altura (2026-10-27, migrasi 032, company profile berbahasa Inggris) juga belum ada di fixture prerender bersama
const ALTURA: Template = { ...FIXTURE_TEMPLATES[4], id: 86, slug: 'altura', name: 'Altura', category: 'Company Profile', price: 1890000, template_code: 'altura', sort_order: 15 };
// Portline (2026-10-27, migrasi 033, company profile berbahasa Inggris) juga belum ada di fixture prerender bersama
const PORTLINE: Template = { ...FIXTURE_TEMPLATES[4], id: 87, slug: 'portline', name: 'Portline', category: 'Company Profile', price: 1890000, template_code: 'portline', sort_order: 16 };
// Velora (2026-10-27, migrasi 034, company profile berbahasa Inggris) juga belum ada di fixture prerender bersama
const VELORA: Template = { ...FIXTURE_TEMPLATES[4], id: 88, slug: 'velora', name: 'Velora', category: 'Company Profile', price: 1890000, template_code: 'velora', sort_order: 17 };
// Dermaga (2026-10-27, migrasi 035, ekspor-impor & freight forwarding) juga belum ada di fixture prerender bersama
const DERMAGA: Template = { ...FIXTURE_TEMPLATES[4], id: 90, slug: 'dermaga', name: 'Dermaga', category: 'Company Profile', price: 1590000, template_code: 'dermaga', sort_order: 18 };
// Saudagar (2026-10-27, migrasi 036, eksportir kopi, kakao & rempah) juga belum ada di fixture prerender bersama
const SAUDAGAR: Template = { ...FIXTURE_TEMPLATES[4], id: 91, slug: 'saudagar', name: 'Saudagar', category: 'Company Profile', price: 1690000, template_code: 'saudagar', sort_order: 19 };
// NusaNiaga (2026-10-27, migrasi 037, importir & distributor bahan baku dan mesin) juga belum ada di fixture prerender bersama
const NUSANIAGA: Template = { ...FIXTURE_TEMPLATES[4], id: 92, slug: 'nusaniaga', name: 'NusaNiaga', category: 'Company Profile', price: 1590000, template_code: 'nusaniaga', sort_order: 20 };
// Jumantara (2026-10-27, migrasi 038, landing page SMA negeri "Clean institutional") juga belum ada di fixture prerender bersama
const JUMANTARA: Template = { ...FIXTURE_TEMPLATES[4], id: 93, slug: 'jumantara', name: 'Jumantara', category: 'Sekolah & Pendidikan', price: 1690000, template_code: 'jumantara', sort_order: 21 };
// Nawasena (2026-10-27, migrasi 039, landing page SMA negeri "Elegant navy") juga belum ada di fixture prerender bersama
const NAWASENA: Template = { ...FIXTURE_TEMPLATES[4], id: 94, slug: 'nawasena', name: 'Nawasena', category: 'Sekolah & Pendidikan', price: 1690000, template_code: 'nawasena', sort_order: 22 };
// Pradipta (2026-10-27, migrasi 040, landing page SMA negeri) juga belum ada di fixture prerender bersama
const PRADIPTA: Template = { ...FIXTURE_TEMPLATES[4], id: 95, slug: 'pradipta', name: 'Pradipta', category: 'Sekolah & Pendidikan', price: 1690000, template_code: 'pradipta', sort_order: 23 };
// Delapan template 2026-10-28 (migrasi 041–048, hero foto latar penuh) juga belum ada di fixture prerender bersama;
// "Kesehatan & Rumah Sakit" dan "Properti & Real Estate" kategori baru
const SPARRING_PADEL: Template = { ...FIXTURE_TEMPLATES[4], id: 96, slug: 'sparring-padel', name: 'Sparring Padel', category: 'Olahraga & Komunitas', price: 1390000, template_code: 'sparring-padel', sort_order: 24 };
const SMASHHALL: Template = { ...FIXTURE_TEMPLATES[4], id: 97, slug: 'smashhall', name: 'SmashHall', category: 'Olahraga & Komunitas', price: 1390000, template_code: 'smashhall', sort_order: 25 };
const PAYNOW: Template = { ...FIXTURE_TEMPLATES[4], id: 98, slug: 'paynow', name: 'PayNow', category: 'Fintech & Startup', price: 1590000, template_code: 'paynow', sort_order: 26 };
const MEDICARE_GENERAL: Template = { ...FIXTURE_TEMPLATES[4], id: 99, slug: 'medicare-general', name: 'MediCare General', category: 'Kesehatan & Rumah Sakit', price: 1890000, template_code: 'medicare-general', sort_order: 27 };
const MOMKID: Template = { ...FIXTURE_TEMPLATES[4], id: 100, slug: 'momkid', name: 'MomKid Hospital', category: 'Kesehatan & Rumah Sakit', price: 1790000, template_code: 'momkid', sort_order: 28 };
const SPECIALISTPLUS: Template = { ...FIXTURE_TEMPLATES[4], id: 101, slug: 'specialistplus', name: 'SpecialistPlus', category: 'Kesehatan & Rumah Sakit', price: 1890000, template_code: 'specialistplus', sort_order: 29 };
const HEALTHLINK: Template = { ...FIXTURE_TEMPLATES[4], id: 102, slug: 'healthlink', name: 'HealthLink', category: 'Kesehatan & Rumah Sakit', price: 1690000, template_code: 'healthlink', sort_order: 30 };
const HOMENEST: Template = { ...FIXTURE_TEMPLATES[4], id: 103, slug: 'homenest', name: 'HomeNest', category: 'Properti & Real Estate', price: 1690000, template_code: 'homenest', sort_order: 31 };
// Lima template travel & transportasi 2026-10-29 (migrasi 049–053, wadah penuh + film gulir) juga belum ada di fixture
// prerender bersama; "Travel & Transportasi" kategori baru
const LAJUR: Template = { ...FIXTURE_TEMPLATES[4], id: 104, slug: 'lajur', name: 'Lajur', category: 'Travel & Transportasi', price: 1690000, template_code: 'lajur', sort_order: 32 };
const NUSALINE: Template = { ...FIXTURE_TEMPLATES[4], id: 105, slug: 'nusaline', name: 'Nusaline', category: 'Travel & Transportasi', price: 1790000, template_code: 'nusaline', sort_order: 33 };
const LAWATAN: Template = { ...FIXTURE_TEMPLATES[4], id: 106, slug: 'lawatan', name: 'Lawatan', category: 'Travel & Transportasi', price: 1690000, template_code: 'lawatan', sort_order: 34 };
const KEMUDI: Template = { ...FIXTURE_TEMPLATES[4], id: 107, slug: 'kemudi', name: 'Kemudi', category: 'Travel & Transportasi', price: 1590000, template_code: 'kemudi', sort_order: 35 };
const PESIAR: Template = { ...FIXTURE_TEMPLATES[4], id: 108, slug: 'pesiar', name: 'Pesiar', category: 'Travel & Transportasi', price: 1590000, template_code: 'pesiar', sort_order: 36 };
const bySlug = (slug: string) => [...FIXTURE_TEMPLATES, SERENITY, TANIMAKMUR, PUNCAKGEAR, GADGETKU, GLOWSTORY, SKYNUSA, MADANI, CAKRAWALA, BESTARI, ALTURA, PORTLINE, VELORA, DERMAGA, SAUDAGAR, NUSANIAGA, JUMANTARA, NAWASENA, PRADIPTA, SPARRING_PADEL, SMASHHALL, PAYNOW, MEDICARE_GENERAL, MOMKID, SPECIALISTPLUS, HEALTHLINK, HOMENEST, LAJUR, NUSALINE, LAWATAN, KEMUDI, PESIAR].find((t) => t.slug === slug) as Template;

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
      dermaga: 'Dermaga: Template Website Perusahaan Ekspor Impor',
      saudagar: 'Saudagar: Template Website Eksportir Kopi, Kakao & Rempah',
      nusaniaga: 'NusaNiaga: Template Website Importir & Distributor',
      jumantara: 'Jumantara: Template Website Sekolah Negeri untuk SMA',
      nawasena: 'Nawasena: Template Website Profil Sekolah untuk SMA',
      pradipta: 'Pradipta: Template Landing Page SMA dengan SPMB',
      'sparring-padel': 'Sparring Padel: Template Website Padel dengan Booking Lapangan',
      smashhall: 'SmashHall: Template Website GOR & Klub Badminton',
      paynow: 'PayNow: Template Landing Page Dompet Digital & Payment Gateway',
      'medicare-general': 'MediCare General: Template Website Rumah Sakit Umum',
      momkid: 'MomKid Hospital: Template Website Rumah Sakit Ibu dan Anak',
      specialistplus: 'SpecialistPlus: Template Website Klinik Spesialis & Laboratorium',
      healthlink: 'HealthLink: Template Website Telemedicine & Konsultasi Online',
      homenest: 'HomeNest: Template Website Properti dan Jual Rumah',
      lajur: 'Lajur: Template Website Sewa Bus Pariwisata',
      nusaline: 'Nusaline: Template Website PO Bus Antarkota',
      lawatan: 'Lawatan: Template Website Tour & Travel Rombongan',
      kemudi: 'Kemudi: Template Website Rental Mobil',
      pesiar: 'Pesiar: Template Website Private Tour & Sewa Mobil dengan Sopir',
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
      dermaga: 'Dermaga: Template Website Ekspor Impor – Rp1,59 jt',
      saudagar: 'Saudagar: Template Website Eksportir Komoditas – Rp1,69 jt',
      nusaniaga: 'NusaNiaga: Template Website Importir & Trading – Rp1,59 jt',
      jumantara: 'Jumantara: Template Website Sekolah Negeri – Rp1,69 jt',
      nawasena: 'Nawasena: Template Website Profil Sekolah SMA – Rp1,69 jt',
      pradipta: 'Pradipta: Template Landing Page SMA & SPMB – Rp1,69 jt',
      'sparring-padel': 'Sparring Padel: Template Website Lapangan Padel – Rp1,39 jt',
      smashhall: 'SmashHall: Template Website GOR Badminton – Rp1,39 jt',
      paynow: 'PayNow: Template Landing Page Dompet Digital – Rp1,59 jt',
      'medicare-general': 'MediCare General: Template Website Rumah Sakit – Rp1,89 jt',
      momkid: 'MomKid Hospital: Template Website RS Ibu & Anak – Rp1,79 jt',
      specialistplus: 'SpecialistPlus: Template Klinik Spesialis & Lab – Rp1,89 jt',
      healthlink: 'HealthLink: Template Website Telemedicine – Rp1,69 jt',
      homenest: 'HomeNest: Template Website Jual Rumah & Properti – Rp1,69 jt',
      lajur: 'Lajur: Template Website Sewa Bus Pariwisata – Rp1,69 jt',
      nusaline: 'Nusaline: Template Website PO Bus Antarkota – Rp1,79 jt',
      lawatan: 'Lawatan: Template Website Tour & Travel – Rp1,69 jt',
      kemudi: 'Kemudi: Template Website Rental Mobil – Rp1,59 jt',
      pesiar: 'Pesiar: Template Website Sewa Mobil & Sopir – Rp1,59 jt',
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
    const dermaga = visibleText(templateContent('dermaga') as TemplatePageContent);
    expect(dermaga).toMatch(/data tidak disimpan di website/);
    expect(dermaga).toMatch(/tidak ada pelacakan kiriman/);
    expect(dermaga).toMatch(/pembayaran online/);
    expect(dermaga).toMatch(/ilustrasi, bukan peta pelayaran/);
    expect(dermaga).toMatch(/fiktif/);
    expect(dermaga).not.toMatch(/terdaftar di Bea Cukai|eksportir terdaftar|bersertifikat|\bISO\b|\bNIB\b|izin resmi|\bAEO\b/i);
    const saudagar = visibleText(templateContent('saudagar') as TemplatePageContent);
    expect(saudagar).toMatch(/data tidak disimpan di website/);
    expect(saudagar).toMatch(/harga komoditas tidak diperbarui otomatis/i);
    expect(saudagar).toMatch(/tidak memproses pembayaran/);
    expect(saudagar).toMatch(/tidak ada pelacakan kiriman/);
    expect(saudagar).toMatch(/fiktif/);
    expect(saudagar).not.toMatch(/terdaftar di Bea Cukai|eksportir terdaftar|bersertifikat|\bISO\b|\bNIB\b|izin resmi|\bAEO\b|SVLK|Halal MUI|fair ?trade/i);
    const nusaniaga = visibleText(templateContent('nusaniaga') as TemplatePageContent);
    expect(nusaniaga).toMatch(/data tidak disimpan di website/);
    expect(nusaniaga).toMatch(/tidak ada pelacakan kiriman/i);
    expect(nusaniaga).toMatch(/tidak diperbarui otomatis/);
    expect(nusaniaga).toMatch(/fiktif/);
    expect(nusaniaga).not.toMatch(/terdaftar di Bea Cukai|importir terdaftar|bersertifikat|\bISO\b|\bNIB\b|\bAPI-U\b|izin resmi|\bAEO\b|katalog produk/i);
    // Jumantara (2026-10-27): formulir tanya panitia SPMB hanya menyusun pesan WhatsApp, pendaftaran di portal resmi
    // provinsi, tanpa sistem akademik; nama sekolah demo hanya contoh, isi fiktif
    const jumantara = visibleText(templateContent('jumantara') as TemplatePageContent);
    expect(jumantara).toMatch(/tidak menyimpan data/);
    expect(jumantara).toMatch(/tidak ada pembayaran online/);
    expect(jumantara).toMatch(/portal resmi SPMB provinsi/);
    expect(jumantara).toMatch(/Tidak ada e-rapor, absensi, atau sistem informasi akademik/);
    expect(jumantara).toMatch(/tidak diperbarui otomatis/);
    expect(jumantara).toMatch(/fiktif/);
    expect(jumantara).not.toMatch(/e-rapor tersedia|sistem informasi akademik lengkap|data pendaftar tersimpan|pembayaran online tersedia|pasti diterima|terakreditasi|\bNPSN\b|\bPPDB online\b/i);
    // Nawasena (2026-10-27): formulir tanya SPMB hanya menyusun pesan WhatsApp, pendaftaran tetap di portal provinsi, demo fiktif
    const nawasena = visibleText(templateContent('nawasena') as TemplatePageContent);
    expect(nawasena).toMatch(/tidak menyimpan data/);
    expect(nawasena).toMatch(/tidak ada pembayaran online/);
    expect(nawasena).toMatch(/data tidak disimpan di website/);
    expect(nawasena).toMatch(/bukan sistem pendaftaran/);
    expect(nawasena).toMatch(/Tidak ada e-rapor, absensi, atau sistem informasi akademik/);
    expect(nawasena).toMatch(/fiktif/);
    expect(nawasena).not.toMatch(/e-rapor tersedia|sistem informasi akademik lengkap|data pendaftar tersimpan|pembayaran online tersedia|pasti diterima|terakreditasi|\bNPSN\b|\bPPDB online\b/i);
    // Pradipta (2026-10-27): formulir tanya SPMB hanya menyusun pesan WhatsApp, pendaftaran tetap di portal provinsi, demo fiktif
    const pradipta = visibleText(templateContent('pradipta') as TemplatePageContent);
    expect(pradipta).toMatch(/tidak menyimpan data/);
    expect(pradipta).toMatch(/tidak ada pembayaran online/);
    expect(pradipta).toMatch(/fiktif/);
    expect(pradipta).toMatch(/portal SPMB provinsi/);
    expect(pradipta).toMatch(/tanpa e-rapor, absensi, atau sistem informasi akademik/);
    expect(pradipta).not.toMatch(/e-rapor tersedia|sistem informasi akademik lengkap|data pendaftar tersimpan|pembayaran online tersedia|pasti diterima|terakreditasi|\bNPSN\b/i);
    // Sparring Padel (2026-10-28): booking hanya pesan WhatsApp, jadwal contoh, tanpa pembayaran online/akun member
    const sparring = visibleText(templateContent('sparring-padel') as TemplatePageContent);
    expect(sparring).toMatch(/Booking hanya menyusun pesan WhatsApp ke admin/);
    expect(sparring).toMatch(/jadwal yang tampil adalah contoh, ketersediaan dikonfirmasi admin/);
    expect(sparring).toMatch(/tidak ada pembayaran online dan tidak ada akun member/);
    expect(sparring).toMatch(/fiktif/);
    expect(sparring).toMatch(/data tidak disimpan di website/);
    expect(sparring).not.toMatch(/PBSI|\bFIP\b|resmi|bersertifikat|dijamin|terbaik/i);
    // SmashHall (2026-10-28): sama untuk GOR badminton; toko perlengkapan tanpa keranjang belanja
    const smashhall = visibleText(templateContent('smashhall') as TemplatePageContent);
    expect(smashhall).toMatch(/Booking hanya menyusun pesan WhatsApp ke admin/);
    expect(smashhall).toMatch(/jadwal yang tampil adalah contoh/);
    expect(smashhall).toMatch(/ketersediaan dikonfirmasi admin/);
    expect(smashhall).toMatch(/Tidak ada pembayaran online/i);
    expect(smashhall).toMatch(/tidak ada akun member/);
    expect(smashhall).toMatch(/tidak ada keranjang belanja/);
    expect(smashhall).toMatch(/tidak disimpan di website/);
    expect(smashhall).toMatch(/fiktif/);
    expect(smashhall).not.toMatch(/PBSI|bersertifikat|berlisensi|\bresmi\b|terbaik|dijamin|100%/i);
    // PayNow (2026-10-28): halaman pemasaran, tidak memproses pembayaran; izin & pengawas diisi pemilik merek
    const paynow = visibleText(templateContent('paynow') as TemplatePageContent);
    expect(paynow).toMatch(/tidak memproses pembayaran, tidak menyimpan saldo, dan contoh kode API hanya ilustrasi/);
    expect(paynow).toMatch(/Izin usaha dan lembaga pengawas diisi pemilik merek/);
    expect(paynow).toMatch(/data tidak disimpan di website/);
    expect(paynow).toMatch(/fiktif/);
    expect(paynow).not.toMatch(/berizin|diawasi (oleh )?(Bank Indonesia|OJK)|PCI DSS|terdaftar di|bersertifikat/i);
    // MediCare General (2026-10-28): pendaftaran hanya pesan WhatsApp, tanpa rekam medis/antrean/pembayaran/video
    const medicare = visibleText(templateContent('medicare-general') as TemplatePageContent);
    expect(medicare).toMatch(/data pasien tidak disimpan di website/);
    expect(medicare).toMatch(/Tidak ada rekam medis, nomor antrean otomatis, pembayaran online, atau konsultasi video/);
    expect(medicare).toMatch(/fiktif/);
    expect(medicare).not.toMatch(/terakreditasi|\bKARS\b|dokter terbaik|dijamin|bersertifikat|izin resmi/i);
    // MomKid Hospital (2026-10-28): jadwal imunisasi hanya ringkasan, darurat ke 119
    const momkid = visibleText(templateContent('momkid') as TemplatePageContent);
    expect(momkid).toMatch(/data tidak disimpan di website/);
    expect(momkid).toMatch(/tidak memiliki rekam medis/);
    expect(momkid).toMatch(/pembayaran online/);
    expect(momkid).toMatch(/ikuti anjuran dokter anak/);
    expect(momkid).toMatch(/telepon 119/);
    expect(momkid).toMatch(/fiktif/);
    expect(momkid).not.toMatch(/terakreditasi|\bKARS\b|terbaik|dijamin|garansi|sembuh/i);
    // SpecialistPlus (2026-10-28): hasil lab tidak tampil di website
    const specialistplus = visibleText(templateContent('specialistplus') as TemplatePageContent);
    expect(specialistplus).toMatch(/data tidak disimpan di website/);
    expect(specialistplus).toMatch(/Hasil lab tidak ditampilkan di website/);
    expect(specialistplus).toMatch(/tidak memiliki rekam medis, pembayaran online, konsultasi video, maupun antrean real-time/);
    expect(specialistplus).toMatch(/fiktif/);
    expect(specialistplus).not.toMatch(/\bKARS\b|terakreditasi|dokter terbaik|dijamin|sembuh total|\b100%/i);
    // HealthLink (2026-10-28): halaman pemasaran telemedicine, konsultasi lewat WhatsApp/aplikasi pemilik
    const healthlink = visibleText(templateContent('healthlink') as TemplatePageContent);
    expect(healthlink).toMatch(/Template ini halaman pemasaran layanan; konsultasi berjalan lewat WhatsApp atau aplikasi milik Anda, rekam medis tidak disimpan di website/);
    expect(healthlink).toMatch(/tidak ada pembayaran online/);
    expect(healthlink).toMatch(/tidak ada data yang dikirim atau disimpan di website/);
    expect(healthlink).toMatch(/fiktif/);
    expect(healthlink).not.toMatch(/terakreditasi|\bKARS\b|dokter terbaik|dijamin|sembuh total|izin resmi|bersertifikat/i);
    // HomeNest (2026-10-28): simulasi KPR perkiraan, tanpa tur 360° bawaan dan tanpa pembayaran tanda jadi
    const homenest = visibleText(templateContent('homenest') as TemplatePageContent);
    expect(homenest).toMatch(/data tidak disimpan di website/);
    expect(homenest).toMatch(/bukan penawaran bank/);
    expect(homenest).toMatch(/Tidak ada tur 360° bawaan/);
    expect(homenest).toMatch(/Tidak ada pembayaran tanda jadi/);
    expect(homenest).toMatch(/fiktif/);
    expect(homenest).not.toMatch(/SHM dijamin|pasti naik|terbaik|nomor 1|#1|100%|garansi|dijamin/i);
    // Lajur (2026-10-29): sewa bus, formulir hanya pesan WhatsApp, armada ditulis per kelas kursi tanpa merek, tanpa izin trayek
    const lajur = visibleText(templateContent('lajur') as TemplatePageContent);
    expect(lajur).toMatch(/Formulir hanya menyusun pesan WhatsApp; harga final dan ketersediaan armada dikonfirmasi admin/);
    expect(lajur).toMatch(/Tidak ada pembayaran online, e-tiket, ketersediaan armada real-time, akun member, atau pelacakan GPS/);
    expect(lajur).toMatch(/tidak ada merek atau model kendaraan/);
    expect(lajur).toMatch(/fiktif/);
    expect(lajur).not.toMatch(/izin trayek|Kemenhub|Dishub|terdaftar resmi|IPOMI|PAWIBA|uji KIR|\bISO\b|Jasa Raharja|bersertifikat|terbaik|termurah/i);
    // Nusaline (2026-10-29): PO bus antarkota, pemesanan hanya pesan WhatsApp, denah kursi bukan kursi kosong
    const nusaline = visibleText(templateContent('nusaline') as TemplatePageContent);
    expect(nusaline).toMatch(/Pemesanan hanya menyusun pesan WhatsApp/);
    expect(nusaline).toMatch(/tidak ada pembayaran online, e-tiket, atau pilihan kursi real-time/);
    expect(nusaline).toMatch(/bukan kursi yang masih kosong/);
    expect(nusaline).toMatch(/fiktif/);
    expect(nusaline).not.toMatch(/izin trayek|Kemenhub|Dishub|terdaftar resmi|IPOMI|uji KIR|\bISO\b|Jasa Raharja|bersertifikat|terbaik|termurah/i);
    // Lawatan (2026-10-29): tour rombongan, estimasi biaya bukan penawaran final, kuota/hotel/jadwal dikonfirmasi admin
    const lawatan = visibleText(templateContent('lawatan') as TemplatePageContent);
    expect(lawatan).toMatch(/Formulir hitung biaya hanya menyusun pesan WhatsApp; data tidak disimpan di website/);
    expect(lawatan).toMatch(/Tidak ada pembayaran online, e-tiket, atau cek kuota real-time, dan estimasi biaya bukan penawaran final/);
    expect(lawatan).toMatch(/izin usaha hanya sesuai dokumen yang benar-benar Anda miliki/);
    expect(lawatan).toMatch(/fiktif/);
    expect(lawatan).not.toMatch(/\bASITA\b|\bPPIU\b|terdaftar resmi|bersertifikat|terbaik|termurah/i);
    // Kemudi (2026-10-29): rental mobil, dokumen tidak diunggah, mobil per kelas tanpa merek/tipe, tanpa GPS
    const kemudi = visibleText(templateContent('kemudi') as TemplatePageContent);
    expect(kemudi).toMatch(/Pemesanan hanya menyusun pesan WhatsApp; ketersediaan dan harga final dikonfirmasi admin; tidak ada pembayaran online/);
    expect(kemudi).toMatch(/dokumen tidak diunggah atau disimpan di website/);
    expect(kemudi).toMatch(/Tidak ada ketersediaan mobil real-time dan tidak ada pelacakan GPS/);
    expect(kemudi).toMatch(/fiktif/);
    expect(kemudi).not.toMatch(/Toyota|Avanza|Innova|Xenia|Daihatsu|Honda|Suzuki|Mitsubishi|Pajero|Fortuner|Alphard|Hiace|terbaik|termurah/i);
    // Pesiar (2026-10-29): private tour Bali, harga contoh per mobil, tanpa pelacakan penerbangan otomatis
    const pesiar = visibleText(templateContent('pesiar') as TemplatePageContent);
    expect(pesiar).toMatch(/hanya menyusun pesan WhatsApp; data tidak disimpan di website/);
    expect(pesiar).toMatch(/Tidak ada pembayaran online, e-tiket, ketersediaan mobil real-time, atau pelacakan penerbangan otomatis/);
    expect(pesiar).toMatch(/fiktif/);
    expect(pesiar).not.toMatch(/berlisensi|\bHPI\b|\bASITA\b|terdaftar resmi|bersertifikat|terbaik|termurah/i);
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

  it('Dermaga: kata kunci "template website ekspor impor" di judul, meta, H1, dan pembuka; kata kunci pendukung di isi', () => {
    const t = bySlug('dermaga');
    const keyword = /template website (perusahaan )?ekspor impor/i;
    expect(templateTitle(t)).toMatch(keyword);
    expect(templateDescription(t)).toMatch(/^Template website ekspor impor /);
    expect(templateDescription(t)).toContain('Rp1.590.000 sudah termasuk hosting & SSL tahun pertama; domain mulai Rp50.000/tahun');
    expect(templateH1(t)).toBe('Dermaga: Template Website Perusahaan Ekspor Impor');
    const c = templateContent('dermaga') as TemplatePageContent;
    expect(fillName(c.lead, t)).toMatch(/^Dermaga adalah template website ekspor impor /);
    const text = visibleText(c).toLowerCase();
    for (const phrase of ['website perusahaan ekspor impor', 'website freight forwarding', 'company profile ekspor impor', 'website perusahaan trading']) {
      expect(text, phrase).toContain(phrase);
    }
    // Wajar, bukan ditumpuk
    expect(text.split('template website ekspor impor').length - 1).toBeLessThanOrEqual(3);
    expect(TEMPLATE_COPY.dermaga?.niche).toBe('Perusahaan Ekspor Impor & Freight Forwarding');
    expect(TEMPLATE_PAGES.dermaga?.niche).toBe('perusahaan ekspor impor');
    expect(TEMPLATE_COPY.dermaga?.updated).toBe('2026-10-27');
  });

  it('Saudagar: kata kunci "template website eksportir" di judul, meta, H1, dan pembuka; kata kunci pendukung di isi', () => {
    const t = bySlug('saudagar');
    const keyword = /template website eksportir/i;
    expect(templateTitle(t)).toMatch(keyword);
    expect(templateDescription(t)).toMatch(/^Template website eksportir /);
    expect(templateDescription(t)).toContain('Rp1.690.000 sudah termasuk hosting & SSL tahun pertama; domain mulai Rp50.000/tahun');
    expect(templateH1(t)).toMatch(keyword);
    const c = templateContent('saudagar') as TemplatePageContent;
    expect(fillName(c.lead, t)).toMatch(/^Saudagar adalah template website eksportir /);
    const text = visibleText(c).toLowerCase();
    for (const phrase of ['website eksportir kopi', 'website perusahaan ekspor hasil bumi']) expect(text, phrase).toContain(phrase);
    // Wajar, bukan ditumpuk
    expect(text.split('template website eksportir').length - 1).toBeLessThanOrEqual(3);
    expect(TEMPLATE_COPY.saudagar?.niche).toBe('Eksportir Kopi, Kakao & Rempah');
    expect(TEMPLATE_PAGES.saudagar?.niche).toBe('eksportir kopi, kakao & rempah');
    expect(TEMPLATE_COPY.saudagar?.updated).toBe('2026-10-27');
  });

  it('NusaNiaga: kata kunci "template website importir" di judul, meta, H1, dan pembuka; kata kunci pendukung di isi', () => {
    const t = bySlug('nusaniaga');
    const keyword = /template website importir/i;
    expect(templateTitle(t)).toMatch(keyword);
    expect(templateDescription(t)).toMatch(/^Template website importir /);
    expect(templateDescription(t)).toContain('Rp1.590.000 sudah termasuk hosting & SSL tahun pertama; domain mulai Rp50.000/tahun');
    expect(templateH1(t)).toMatch(keyword);
    const c = templateContent('nusaniaga') as TemplatePageContent;
    expect(fillName(c.lead, t)).toMatch(/^NusaNiaga adalah template website importir /);
    const text = visibleText(c).toLowerCase();
    for (const phrase of ['website importir', 'website distributor bahan baku', 'website supplier mesin industri', 'company profile importir']) {
      expect(text, phrase).toContain(phrase);
    }
    // Wajar, bukan ditumpuk
    expect(text.split('template website importir').length - 1).toBeLessThanOrEqual(3);
    expect(TEMPLATE_COPY.nusaniaga?.niche).toBe('Importir & Distributor Bahan Baku Industri');
    expect(TEMPLATE_PAGES.nusaniaga?.niche).toBe('importir & distributor bahan baku');
    expect(TEMPLATE_COPY.nusaniaga?.updated).toBe('2026-10-27');
  });

  it('Jumantara: kata kunci "template website sekolah negeri" di judul, meta, H1, dan pembuka; kata kunci pendukung di isi; tidak merebut kata kunci Bestari', () => {
    const t = bySlug('jumantara');
    const keyword = /template website sekolah negeri/i;
    expect(templateTitle(t)).toMatch(keyword);
    expect(templateTitle(t).length).toBeLessThanOrEqual(60);
    expect(templateDescription(t)).toMatch(/^Template website sekolah negeri untuk SMA: /);
    expect(templateDescription(t)).toContain('Rp1.690.000 sudah termasuk hosting & SSL tahun pertama; domain mulai Rp50.000/tahun');
    expect(templateH1(t)).toBe('Jumantara: Template Website Sekolah Negeri untuk SMA');
    // "template website SMA" & "PPDB online" milik Bestari, "SMK & SMA" milik Cakrawala, "landing page SMA" milik Pradipta, "profil sekolah" milik Nawasena
    expect(`${templateTitle(t)} ${templateH1(t)} ${templateDescription(t)}`).not.toMatch(/template website SMA|PPDB|SMK & SMA|landing page SMA|profil sekolah/i);
    const c = templateContent('jumantara') as TemplatePageContent;
    expect(fillName(c.lead, t)).toMatch(/^Jumantara adalah template website sekolah negeri /);
    const text = visibleText(c);
    for (const phrase of ['website sekolah negeri', 'website SMA profesional', 'SPMB']) expect(text, phrase).toContain(phrase);
    // Wajar, bukan ditumpuk; frasa utama Bestari tidak dipakai di isi halaman
    expect(text.toLowerCase().split('template website sekolah negeri').length - 1).toBeLessThanOrEqual(3);
    expect(text).not.toMatch(/template website SMA/i);
    expect(TEMPLATE_COPY.jumantara?.niche).toBe('SMA Negeri');
    expect(TEMPLATE_PAGES.jumantara?.niche).toBe('sekolah SMA negeri');
    expect(TEMPLATE_COPY.jumantara?.updated).toBe('2026-10-27');
  });

  it('Nawasena: kata kunci "template website profil sekolah" di judul, meta, H1, dan pembuka; kata kunci pendukung di isi; tidak merebut kata kunci Bestari', () => {
    const t = bySlug('nawasena');
    const keyword = /template website profil sekolah/i;
    expect(templateTitle(t)).toMatch(keyword);
    expect(templateDescription(t)).toMatch(/^Template website profil sekolah SMA negeri/);
    expect(templateDescription(t)).toContain('Rp1.690.000 sudah termasuk hosting & SSL tahun pertama; domain mulai Rp50.000/tahun');
    expect(templateH1(t)).toMatch(keyword);
    // "template website SMA" & "PPDB online" milik Bestari, "SMK & SMA" milik Cakrawala, "landing page SMA" milik Pradipta
    expect(`${templateTitle(t)} ${templateH1(t)}`).not.toMatch(/template website SMA|PPDB online|SMK & SMA|landing page SMA/i);
    const c = templateContent('nawasena') as TemplatePageContent;
    expect(fillName(c.lead, t)).toMatch(/^Nawasena adalah template website profil sekolah /);
    const text = visibleText(c);
    for (const phrase of ['website profil SMA', 'website sekolah negeri']) expect(text, phrase).toContain(phrase);
    expect(text.toLowerCase().split('template website profil sekolah').length - 1).toBeLessThanOrEqual(3);
    expect(TEMPLATE_COPY.nawasena?.niche).toBe('Profil Sekolah SMA');
    expect(TEMPLATE_PAGES.nawasena?.niche).toBe('profil sekolah SMA');
    expect(TEMPLATE_COPY.nawasena?.updated).toBe('2026-10-27');
  });

  it('Pradipta: kata kunci "template landing page SMA" di judul, meta, H1, dan pembuka; kata kunci pendukung di isi; tidak merebut kata kunci Bestari', () => {
    const t = bySlug('pradipta');
    const keyword = /template landing page SMA/i;
    expect(templateTitle(t)).toMatch(keyword);
    expect(templateDescription(t)).toMatch(/^Template landing page SMA /);
    expect(templateDescription(t)).toContain('Rp1.690.000 sudah termasuk hosting & SSL tahun pertama; domain mulai Rp50.000/tahun');
    expect(templateH1(t)).toMatch(keyword);
    // "template website SMA" milik Bestari, "SMK & SMA" milik Cakrawala
    expect(`${templateTitle(t)} ${templateH1(t)}`).not.toMatch(/template website SMA|SMK & SMA/i);
    const c = templateContent('pradipta') as TemplatePageContent;
    expect(fillName(c.lead, t)).toMatch(/^Pradipta adalah template landing page SMA /);
    const text = visibleText(c);
    for (const phrase of ['landing page SPMB', 'website SPMB SMA', 'SMA negeri']) expect(text, phrase).toContain(phrase);
    // Wajar, bukan ditumpuk
    expect(text.toLowerCase().split('template landing page sma').length - 1).toBeLessThanOrEqual(3);
    expect(TEMPLATE_COPY.pradipta?.niche).toBe('Landing Page SMA');
    expect(TEMPLATE_PAGES.pradipta?.niche).toBe('landing page SMA');
    expect(TEMPLATE_COPY.pradipta?.updated).toBe('2026-10-27');
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
