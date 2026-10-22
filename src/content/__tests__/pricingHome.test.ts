// Jalankan: npx vitest run src/content/__tests__/pricingHome.test.ts
// Teks harga & beranda yang dihitung dari data (SEO-PLAN §5.6 langkah 4 & 6, Lampiran D): harga hanya dari template
// terbit, jasa custom tanpa angka, fakta null tidak disebut, intro memuat nama badan hukum dan harga termurah.
import { describe, expect, it } from 'vitest';
import { COMPANY_FACTS } from '../../lib/companyFacts';
import { FIXTURE_TEMPLATES } from '../../lib/__tests__/preloadFixture';
import type { Template } from '../../types/platform';
import { categoryTiles, homeIntro, joinId, nichePhrases } from '../home';
import {
  buildOptionsTable,
  CUSTOM_COST_FACTORS,
  minTemplatePrice,
  priceInWords,
  shortPriceRange,
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

describe('beranda', () => {
  it('intro: nama badan hukum, niche dari kategori DB, harga termurah, jasa custom', () => {
    const intro = homeIntro(ALL);
    expect(intro).toBe(
      'Garuda Nexa (PT Garuda Nexa Bahtera) menyediakan template website untuk company profile, klub olahraga, klinik kecantikan, dan fintech, mulai Rp990 ribu sudah termasuk domain, hosting, dan SSL tahun pertama. Butuh fitur khusus? Kami juga membuat website dan aplikasi Android/iOS custom.',
    );
    expect(intro).not.toContain('undangan');
    expect(homeIntro([])).toBe(
      'Garuda Nexa (PT Garuda Nexa Bahtera) menyediakan template website siap pakai yang harganya sudah termasuk domain, hosting, dan SSL tahun pertama. Butuh fitur khusus? Kami juga membuat website dan aplikasi Android/iOS custom.',
    );
  });

  it('joinId dan niche tanpa duplikat', () => {
    expect(joinId(['a'])).toBe('a');
    expect(joinId(['a', 'b'])).toBe('a dan b');
    expect(joinId(['a', 'b', 'c'])).toBe('a, b, dan c');
    expect(nichePhrases(FIXTURE_TEMPLATES)).toEqual(['company profile', 'klub olahraga', 'klinik kecantikan', 'fintech']);
  });

  it('ubin kategori: hanya kategori berhalaman, jumlah dan harga termurah per kategori', () => {
    const tiles = categoryTiles(ALL);
    expect(tiles.map((t) => [t.slug, t.count, t.minPrice, t.path])).toEqual([
      ['company-profile', 2, 990000, '/template/kategori/company-profile'],
      ['olahraga-komunitas', 1, 1290000, '/template/kategori/olahraga-komunitas'],
      ['kecantikan-klinik', 1, 1390000, '/template/kategori/kecantikan-klinik'],
      ['fintech-startup', 1, 1790000, '/template/kategori/fintech-startup'],
    ]);
    expect(tiles[0].templateNames).toEqual(['Corporate Nexa', 'Startup Clean']);
    expect(tiles[0].image).toBe('/assets/templates/corporate-nexa-preview.webp');
  });
});
