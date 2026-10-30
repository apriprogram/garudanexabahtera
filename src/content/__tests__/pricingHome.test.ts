// Jalankan: npx vitest run src/content/__tests__/pricingHome.test.ts
// Teks harga & beranda yang dihitung dari data (SEO-PLAN §5.6 langkah 4 & 6, Lampiran D): harga hanya dari template
// terbit, jasa custom tanpa angka, fakta null tidak disebut, intro memuat nama badan hukum dan harga termurah. Domain tidak
// termasuk harga template (pemilik 2026-10-25): harga domain & biaya tahun ke-2 dari src/lib/domainPricing.ts.
import { describe, expect, it } from 'vitest';
import { COMPANY_FACTS } from '../../lib/companyFacts';
import { DOMAIN_TLDS, HOSTING_RENEWAL_DEFAULT } from '../../lib/domainPricing';
import { FIXTURE_TEMPLATES } from '../../lib/__tests__/preloadFixture';
import type { Template } from '../../types/platform';
import { categoryTiles, homeIntro, joinId, nichePhrases } from '../home';
import {
  buildOptionsTable,
  CUSTOM_COST_FACTORS,
  domainPriceFrom,
  minTemplatePrice,
  priceInWords,
  renewalExamples,
  renewalPerYearText,
  shortPriceRange,
  TEMPLATE_PRICE_SUMMARY,
  templateVsCustomTable,
  wibDate,
} from '../pricing';

const DRAFT: Template = { ...FIXTURE_TEMPLATES[0], slug: 'draft-x', price: 10000, status: 'draft', category: 'Undangan' };
const ALL = [...FIXTURE_TEMPLATES, DRAFT];
const PRICE = /Rp\s?\d|\d\.\d{3}\.\d{3}/;

describe('harga dari data', () => {
  it('rentang & harga termurah hanya dari template terbit', () => {
    expect(minTemplatePrice(ALL)).toBe(990000);
    expect(shortPriceRange(ALL)).toBe('Rp990 rb–Rp1,79 jt');
    expect(shortPriceRange([])).toBeNull();
    expect(priceInWords(990000)).toBe('Rp990 ribu');
    expect(priceInWords(1500000)).toBe('Rp1,5 juta');
  });

  it('wibDate: tanggal di WIB (UTC+7)', () => {
    expect(wibDate('2026-10-23T03:00:00.000Z')).toBe('2026-10-23');
    expect(wibDate('2026-10-23T18:00:00.000Z')).toBe('2026-10-24');
    expect(wibDate('bukan tanggal')).toBeNull();
    expect(wibDate(undefined)).toBeNull();
  });
});

describe('tabel perbandingan', () => {
  it('Lampiran D: harga template tertera + tanggal, kolom custom tanpa angka, baris Mulai bertautan', () => {
    const table = templateVsCustomTable({ priceRange: 'Rp990 rb–Rp1,79 jt', priceDate: '2026-10-23' }, { formatDate: () => '23 Oktober 2026' });
    expect(table.columns).toEqual(['Template siap pakai', 'Website custom', 'Aplikasi mobile custom']);
    const harga = table.rows.find((r) => r.label === 'Harga')!;
    expect(harga.cells[0].text).toBe('Tertera, Rp990 rb–Rp1,79 jt (per 23 Oktober 2026)');
    for (const row of table.rows) for (const cell of row.cells.slice(1)) expect(cell.text, row.label).not.toMatch(PRICE);
    expect(table.rows.at(-1)!.cells.map((c) => c.href)).toEqual(['/template', '/pesan-custom?layanan=website', '/pesan-custom?layanan=mobile']);
    expect(table.rows.find((r) => r.label === 'Waktu online')!.cells[0].text).not.toMatch(/X–Y|hari kerja/);
  });

  it('versi lengkap /harga menambah pembayaran, pengelolaan isi, tahun berikutnya', () => {
    const labels = templateVsCustomTable({ priceRange: null, priceDate: null }, { full: true }).rows.map((r) => r.label);
    expect(labels).toEqual(['Harga', 'Sudah termasuk', 'Waktu online', 'Desain', 'Cocok untuk', 'Pembayaran', 'Mengubah isi', 'Tahun berikutnya', 'Mulai']);
  });

  it('domain tidak termasuk harga template; tahun berikutnya = hosting & jasa (setting) + domain', () => {
    const cell = (table: ReturnType<typeof templateVsCustomTable>, label: string) => table.rows.find((r) => r.label === label)!.cells[0].text;
    const short = templateVsCustomTable({ priceRange: null, priceDate: null });
    expect(cell(short, 'Sudah termasuk')).toBe('Setup, hosting, dan SSL tahun pertama; domain mulai Rp50.000/tahun');
    // Tanpa setting: kalimat COMPANY_FACTS (bawaan Rp500.000); dengan setting admin: angka itu
    const full = templateVsCustomTable({ priceRange: null, priceDate: null }, { full: true });
    expect(cell(full, 'Tahun berikutnya')).toBe('Hosting & jasa Rp500.000/tahun ditambah perpanjangan domain sesuai ekstensi (mulai Rp50.000/tahun)');
    const custom = templateVsCustomTable({ priceRange: null, priceDate: null, hostingRenewal: 750_000 }, { full: true });
    expect(cell(custom, 'Tahun berikutnya')).toBe('Hosting & jasa Rp750.000/tahun + domain sesuai ekstensi');
    const options = buildOptionsTable().rows.find((r) => r.label === 'Domain, hosting & SSL')!.cells[3].text;
    expect(options).toBe('Hosting & SSL tahun pertama termasuk; domain dipilih saat memesan');
    for (const table of [short, full, buildOptionsTable()]) {
      for (const text of table.rows.flatMap((r) => r.cells.map((c) => c.text))) expect(text).not.toMatch(/termasuk (setup, )?domain|domain, hosting/i);
    }
  });

  it('cara membuat website: 4 pilihan tanpa nama pesaing dan tanpa angka', () => {
    const table = buildOptionsTable();
    expect(table.columns).toHaveLength(4);
    expect(table.columns[3]).toBe(`Template ${COMPANY_FACTS.name}`);
    const text = JSON.stringify(table);
    expect(text).not.toMatch(PRICE);
    expect(text).not.toMatch(/wix|wordpress|hostinger|canva|squarespace|fastwork|sribu|shopify|webflow/i);
    for (const row of table.rows) expect(row.cells).toHaveLength(4);
  });

  it('faktor biaya custom tanpa angka', () => {
    expect(CUSTOM_COST_FACTORS.length).toBeGreaterThanOrEqual(6);
    expect(JSON.stringify(CUSTOM_COST_FACTORS)).not.toMatch(PRICE);
  });
});

describe('harga domain & biaya tahun ke-2', () => {
  it('kalimat ringkas isi harga: domain dipilih saat memesan, mulai harga domain termurah', () => {
    expect(TEMPLATE_PRICE_SUMMARY).toBe(
      'Harga template sudah termasuk setup awal, hosting, dan SSL tahun pertama; domain dipilih saat memesan, mulai Rp50.000/tahun.',
    );
    expect(domainPriceFrom()).toBe(50_000);
    expect(domainPriceFrom([{ price: 120_000 }, { price: 90_000 }])).toBe(90_000);
    expect(domainPriceFrom([])).toBe(50_000);
    expect(renewalPerYearText(HOSTING_RENEWAL_DEFAULT)).toBe('Hosting & jasa Rp500.000/tahun + domain sesuai ekstensi');
  });

  it('contoh biaya per tahun mulai tahun ke-2: .com, .id, .my.id = hosting & jasa + domain', () => {
    expect(renewalExamples(HOSTING_RENEWAL_DEFAULT)).toEqual([
      { tld: 'com', hosting: 500_000, domain: 250_000, total: 750_000 },
      { tld: 'id', hosting: 500_000, domain: 250_000, total: 750_000 },
      { tld: 'my.id', hosting: 500_000, domain: 50_000, total: 550_000 },
    ]);
    // Daftar dari server (DewaBiz) bisa berbeda: ekstensi yang tidak dijual dilewati, harga mengikuti daftar
    const live = DOMAIN_TLDS.filter((t) => t.tld !== 'id').map((t) => (t.tld === 'com' ? { ...t, price: 260_000 } : t));
    expect(renewalExamples(600_000, live).map((e) => [e.tld, e.total])).toEqual([
      ['com', 860_000],
      ['my.id', 650_000],
    ]);
  });
});

describe('beranda', () => {
  it('intro: nama badan hukum, niche dari kategori DB, harga termurah, jasa custom', () => {
    const intro = homeIntro(ALL);
    expect(intro).toBe(
      'Garuda Nexa (PT Garuda Nexa Bahtera) menyediakan template website untuk company profile, klub olahraga, klinik kecantikan, fintech, dan studio yoga, mulai Rp990 ribu sudah termasuk setup, hosting, dan SSL tahun pertama, ditambah domain pilihan Anda mulai Rp50.000/tahun. Butuh fitur khusus? Kami juga membuat website dan aplikasi Android/iOS custom.',
    );
    expect(intro).not.toContain('undangan');
    expect(homeIntro([])).toBe(
      'Garuda Nexa (PT Garuda Nexa Bahtera) menyediakan template website siap pakai yang harganya sudah termasuk setup, hosting, dan SSL tahun pertama, ditambah domain pilihan Anda mulai Rp50.000/tahun. Butuh fitur khusus? Kami juga membuat website dan aplikasi Android/iOS custom.',
    );
  });

  it('joinId dan niche tanpa duplikat', () => {
    expect(joinId(['a'])).toBe('a');
    expect(joinId(['a', 'b'])).toBe('a dan b');
    expect(joinId(['a', 'b', 'c'])).toBe('a, b, dan c');
    expect(nichePhrases(FIXTURE_TEMPLATES)).toEqual(['company profile', 'klub olahraga', 'klinik kecantikan', 'fintech', 'studio yoga']);
    // Kategori 2026-10-28 (4 template kesehatan, 1 properti)
    const batch: Template[] = [
      { ...FIXTURE_TEMPLATES[0], slug: 'medicare-general', category: 'Kesehatan & Rumah Sakit' },
      { ...FIXTURE_TEMPLATES[0], slug: 'healthlink', category: 'Kesehatan & Rumah Sakit' },
      { ...FIXTURE_TEMPLATES[0], slug: 'homenest', category: 'Properti & Real Estate' },
      // Kategori 2026-10-29 (5 template travel & transportasi)
      { ...FIXTURE_TEMPLATES[0], slug: 'lajur', category: 'Travel & Transportasi' },
      { ...FIXTURE_TEMPLATES[0], slug: 'kemudi', category: 'Travel & Transportasi' },
    ];
    expect(nichePhrases(batch)).toEqual(['rumah sakit & klinik', 'properti', 'travel & rental kendaraan']);
    expect(categoryTiles(batch).map((t) => [t.slug, t.count, t.path])).toEqual([
      ['kesehatan-rumah-sakit', 2, '/template/kategori/kesehatan-rumah-sakit'],
      ['properti-real-estate', 1, '/template/kategori/properti-real-estate'],
      ['travel-transportasi', 2, '/template/kategori/travel-transportasi'],
    ]);
  });

  it('ubin kategori: hanya kategori berhalaman, jumlah dan harga termurah per kategori', () => {
    const tiles = categoryTiles(ALL);
    expect(tiles.map((t) => [t.slug, t.count, t.minPrice, t.path])).toEqual([
      ['company-profile', 2, 990000, '/template/kategori/company-profile'],
      ['olahraga-komunitas', 1, 1290000, '/template/kategori/olahraga-komunitas'],
      ['kecantikan-klinik', 1, 1390000, '/template/kategori/kecantikan-klinik'],
      ['fintech-startup', 1, 1790000, '/template/kategori/fintech-startup'],
      ['yoga-wellness', 1, 1290000, '/template/kategori/yoga-wellness'],
    ]);
    expect(tiles[0].templateNames).toEqual(['Corporate Nexa', 'Startup Clean']);
    expect(tiles[0].image).toBe('/assets/templates/corporate-nexa-preview.webp');
  });
});
