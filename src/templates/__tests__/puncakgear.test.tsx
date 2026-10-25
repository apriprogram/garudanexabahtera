// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/puncakgear.test.tsx
// PuncakGear (template toko perlengkapan mendaki 2026-10-25): skema CMS & konten demo, helper model (warna aksen di
// latar gelap, rupiah, kalkulator sewa, filter produk, menu, pencarian, pesan WhatsApp, ikon otomatis), demo (urutan
// section, hero poster dengan menu transparan, kategori yang menyaring produk, produk, panduan per gunung dengan daftar
// centang, kalkulator sewa, tips, cerita, FAQ, footer), pencarian di menu, konten opsional kosong, pratinjau CMS diam,
// editor CMS, data katalog (migrasi 021 + seed + gambar pratinjau), dan konten aneh.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionEditor } from '../../pages/account/cms/SectionEditor';
import { validateContent } from '../../pages/account/cms/validation';
import { TEMPLATES, resolveContent } from '../index';
import { iconKey } from '../puncakgear/icons';
import {
  categoryFilterFor,
  clampDays,
  filterProducts,
  formatRupiah,
  guideMessage,
  lines,
  navItems,
  orderMessage,
  parseRating,
  parseRupiah,
  productCategories,
  puncakVars,
  rentalDiscount,
  rentalItems,
  rentalMessage,
  rentalQuote,
  searchEntries,
  searchFilter,
} from '../puncakgear/model';
import { PUNCAK_PHOTOS } from '../puncakgear/photos';
import { SiteRenderer } from '../SiteRenderer';
import { applySiteHead, siteTitle } from '../siteHead';
import { contrast, parseHex } from '../shared/utils';
import { isListField, type ListItem, type SiteContent } from '../types';

const ROOT = process.cwd();
const def = TEMPLATES.puncakgear;
const ORDER = ['hero', 'categories', 'products', 'guides', 'rental', 'safety', 'testimonials', 'faq', 'contact'];
const sectionKeys = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-tpl-section]')).map((s) => s.getAttribute('data-tpl-section'));
const section = (root: HTMLElement, key: string) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`)!;
const demo = (content: unknown = null, preview = false) => render(<SiteRenderer templateCode="puncakgear" content={content} preview={preview} />).container;
const rgb = (hex: string) => parseHex(hex)!;
const publicFile = (url: string) => resolve(ROOT, 'public', url.replace(/^\//, ''));
const waText = (el: Element) => decodeURIComponent(el.getAttribute('href') ?? '');

/** Lebar × tinggi WebP dari header berkas: VP8 (lossy), VP8L (lossless), atau VP8X (diperluas). */
function webpSize(file: Buffer): [number, number] | null {
  if (file.toString('ascii', 0, 4) !== 'RIFF' || file.toString('ascii', 8, 12) !== 'WEBP') return null;
  const chunk = file.toString('ascii', 12, 16);
  if (chunk === 'VP8 ') return [file.readUInt16LE(26) & 0x3fff, file.readUInt16LE(28) & 0x3fff];
  if (chunk === 'VP8L') {
    const bits = file.readUInt32LE(21);
    return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1];
  }
  if (chunk === 'VP8X') return [file.readUIntLE(24, 3) + 1, file.readUIntLE(27, 3) + 1];
  return null;
}

let scrolled: (string | null)[] = [];
beforeEach(() => {
  scrolled = [];
  Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
    scrolled.push(this.getAttribute('data-tpl-section'));
  });
});
afterEach(cleanup);

describe('PuncakGear: skema & konten bawaan', () => {
  it('urutan form = urutan halaman, section baru berkunci Inggris pendek, field unik, list berbatas', () => {
    expect(def.code).toBe('puncakgear');
    expect(def.name).toBe('PuncakGear');
    expect(def.sections.map((s) => s.key)).toEqual(['brand', ...ORDER, 'footer']);
    const fields = (key: string) => def.sections.find((s) => s.key === key)!.fields.map((f) => f.key);
    expect(fields('brand')).toEqual(['company_name', 'tagline', 'logo', 'accent_color']);
    expect(fields('hero')).toEqual(
      expect.arrayContaining(['header_label', 'header_url', 'image', 'side_label', 'side_text', 'card_title', 'card_price', 'card_image', 'card_url', 'statement', 'stat_value', 'stat_label']),
    );
    expect(fields('products')).toEqual(['eyebrow', 'title', 'subtitle', 'note', 'items']);
    expect(fields('guides')).toEqual(['eyebrow', 'title', 'subtitle', 'note', 'items']);
    expect(fields('rental')).toEqual(['eyebrow', 'title', 'subtitle', 'image', 'terms', 'discount_days', 'discount_percent', 'button_label', 'items']);
    const guideItem = def.sections.find((s) => s.key === 'guides')!.fields.find(isListField)!;
    expect(guideItem.fields.map((f) => f.key)).toEqual(['name', 'location', 'elevation', 'duration', 'level', 'route', 'image', 'summary', 'tip', 'gear', 'url']);
    const logo = def.sections[0].fields.find((f) => f.key === 'logo');
    expect(logo && 'help' in logo ? logo.help : '').toMatch(/simbol puncak & bendera/);
    for (const s of def.sections) {
      const keys = s.fields.map((f) => f.key);
      expect(new Set(keys).size, s.key).toBe(keys.length);
      for (const f of s.fields) if (isListField(f)) expect(f.max, `${s.key}.${f.key}`).toBeGreaterThan(0);
      expect(def.defaultContent[s.key], s.key).toBeTypeOf('object');
      expect(s.introduced).toBeUndefined();
    }
  });

  it('konten demo lolos validasi CMS, logo kosong, semua foto terdaftar, ada di public/, dan tercatat di CREDITS.md', () => {
    const c = def.defaultContent;
    expect(validateContent(def, resolveContent(def, null))).toEqual({});
    expect(c.brand.logo).toBe('');
    expect(c.hero.image).toBe('/assets/templates/photos/puncakgear-hero-1920.webp');
    const photos = JSON.stringify(c).match(/\/assets\/templates\/photos\/[a-z0-9-]+\.webp/g) ?? [];
    expect(photos.length).toBeGreaterThanOrEqual(20);
    for (const src of photos) expect(PUNCAK_PHOTOS.asset(src), src).not.toBeNull();
    const credits = readFileSync(resolve(ROOT, 'public/assets/templates/photos/CREDITS.md'), 'utf8');
    for (const key of PUNCAK_PHOTOS.keys) {
      const asset = PUNCAK_PHOTOS.asset(PUNCAK_PHOTOS.src(key))!;
      const urls = [asset.src, ...asset.srcSet!.split(',').map((part) => part.trim().split(' ')[0])];
      for (const url of urls) expect(existsSync(publicFile(url)), url).toBe(true);
      expect(credits, key).toContain(`\`${key}-*\``);
      expect(photos, `${key} dipakai di konten demo`).toContain(PUNCAK_PHOTOS.src(key));
    }
    expect(existsSync(publicFile('/assets/templates/logos/puncakgear-mark.svg'))).toBe(true);
  });

  it('foto ringan: tiap varian WebP ≤ 260 KB, hero 1920 ≤ 160 KB', () => {
    for (const key of PUNCAK_PHOTOS.keys) {
      const asset = PUNCAK_PHOTOS.asset(PUNCAK_PHOTOS.src(key))!;
      for (const url of [asset.src, ...asset.srcSet!.split(',').map((part) => part.trim().split(' ')[0])]) {
        expect(statSync(publicFile(url)).size / 1024, url).toBeLessThanOrEqual(260);
      }
    }
    expect(statSync(publicFile('/assets/templates/photos/puncakgear-hero-1920.webp')).size / 1024).toBeLessThanOrEqual(160);
  });

  it('salinan demo jujur: info jalur mengarah ke pengumuman resmi, tanpa janji/garansi, nomor darurat nyata', () => {
    const text = JSON.stringify(def.defaultContent);
    expect(text).not.toMatch(/dijamin|garansi|pasti aman|100% aman/i);
    expect(def.defaultContent.guides.note).toMatch(/pengumuman resmi pengelola/);
    expect(def.defaultContent.safety.emergency_text).toMatch(/112/);
    expect(def.defaultContent.safety.emergency_text).toMatch(/Basarnas di 115/);
    const guides = def.defaultContent.guides.items as ListItem[];
    expect(guides.map((g) => g.name)).toEqual(['Gunung Rinjani', 'Gunung Semeru', 'Gunung Prau', 'Gunung Merbabu', 'Gunung Sindoro']);
    expect(guides.map((g) => g.elevation)).toEqual(['3.726 mdpl', '3.676 mdpl', '2.565 mdpl', '3.145 mdpl', '3.136 mdpl']);
  });
});

describe('PuncakGear: helper model', () => {
  it('aksen di latar gelap ≥ 7:1 terhadap #0E1512 untuk warna apa pun, warna tidak valid → bawaan', () => {
    const night = rgb('#0E1512');
    for (const accent of ['#C6F135', '#0B3D2E', '#1D2B6B', '#ff0000', '#000000']) {
      const vars = puncakVars(accent) as Record<string, string>;
      expect(contrast(rgb(vars['--pg-glow']), night), accent).toBeGreaterThanOrEqual(7);
      expect(parseHex(vars['--pg-tint']), accent).not.toBeNull();
    }
    expect(puncakVars('hijau')).toEqual(puncakVars('#C6F135'));
  });

  it('rupiah: baca angka dari teks CMS, tulis dengan titik ribuan; rating 1–5', () => {
    expect(parseRupiah('Rp35.000')).toBe(35000);
    expect(parseRupiah('Rp 1.249.000,00')).toBe(1249000);
    expect(parseRupiah('35000')).toBe(35000);
    expect(parseRupiah('gratis')).toBeNull();
    expect(parseRupiah('')).toBeNull();
    expect(formatRupiah(270000)).toBe('Rp270.000');
    expect(formatRupiah(1249000)).toBe('Rp1.249.000');
    expect(formatRupiah(500)).toBe('Rp500');
    expect(parseRating('4,9')).toBe(4.9);
    expect(parseRating('5')).toBe(5);
    expect(parseRating('9')).toBeNull();
    expect(parseRating('bagus')).toBeNull();
  });

  it('kalkulator sewa: harga per hari × hari, diskon mulai batas hari, hari dibatasi 1–14, alat tanpa harga diabaikan', () => {
    const rental = resolveContent(def, null).rental;
    const items = rentalItems(rental);
    expect(items).toHaveLength(8);
    const discount = rentalDiscount(rental);
    expect(discount).toEqual({ days: 4, percent: 10 });
    expect(rentalQuote(items, [0, 1, 2], 2, discount)).toEqual({ count: 3, perDay: 75000, days: 2, subtotal: 150000, discount: 0, total: 150000 });
    expect(rentalQuote(items, [0, 1, 2], 4, discount)).toEqual({ count: 3, perDay: 75000, days: 4, subtotal: 300000, discount: 30000, total: 270000 });
    expect(rentalQuote(items, [0, 0, 1], 99, null).days).toBe(14);
    expect(rentalQuote(items, [0, 0, 1], 99, null).perDay).toBe(60000);
    expect(rentalQuote(items, [], 3, discount).total).toBe(0);
    expect(clampDays(0)).toBe(1);
    expect(clampDays(Number.NaN)).toBe(1);
    const broken = rentalItems({ items: [{ name: 'Tenda', price: 'tanya' }, { name: 'Matras', price: 'Rp5.000' }] });
    expect(rentalQuote(broken, [0, 1], 2, null)).toMatchObject({ count: 1, total: 10000 });
    expect(rentalDiscount({ discount_days: '4', discount_percent: '' })).toBeNull();
    expect(rentalDiscount({ discount_days: '1', discount_percent: '10' })).toBeNull();
    const message = rentalMessage('Tapak Rimba Outdoor', items, rentalQuote(items, [0, 1, 2], 4, discount), [0, 1, 2]);
    expect(message).toContain('selama 4 hari');
    expect(message).toContain('- Tenda Dome 2 Orang (Rp35.000/hari)');
    expect(message).toContain('Diskon lama sewa: -Rp30.000');
    expect(message).toContain('Perkiraan total: Rp270.000');
  });

  it('produk: kategori unik urut kemunculan, filter tanpa beda huruf besar, kartu kategori → filter yang cocok', () => {
    const items = resolveContent(def, null).products.items as ListItem[];
    expect(productCategories(items)).toEqual(['Tenda', 'Carrier', 'Sleeping Bag', 'Sepatu Gunung', 'Aksesori', 'Perlengkapan Darurat']);
    expect(filterProducts(items, 'sleeping bag').map((i) => i.name)).toEqual(['Sleeping Bag Hangat 5°C', 'Matras Foam Gulung']);
    expect(filterProducts(items, '')).toHaveLength(8);
    expect(categoryFilterFor(items, 'Sepatu  gunung')).toBe('Sepatu Gunung');
    expect(categoryFilterFor(items, 'Jaket')).toBe('');
    expect(orderMessage('Toko', 'Carrier 60L', 'Rp1.249.000')).toBe('Halo Toko, saya ingin memesan Carrier 60L (Rp1.249.000). Apakah stoknya tersedia?');
    expect(lines('- Satu\n\n• Dua\r\n✓ Tiga  \n')).toEqual(['Satu', 'Dua', 'Tiga']);
  });

  it('menu mengikuti section yang tampil; label singkat dari label section', () => {
    const content = resolveContent(def, null);
    expect(navItems(content).map((i) => i.label)).toEqual(['Beranda', 'Produk', 'Panduan Gunung', 'Sewa Alat', 'Keselamatan', 'Tanya Jawab', 'Kontak']);
    const edited = resolveContent(def, { rental: { enabled: false }, guides: { items: [] }, products: { eyebrow: 'Rak' } });
    expect(navItems(edited).map((i) => i.key)).toEqual(['hero', 'products', 'safety', 'faq', 'contact']);
    expect(navItems(edited)[1].label).toBe('Rak');
  });

  it('pencarian: produk, kategori (menyaring), gunung (memilih panduan), alat sewa, tips, FAQ; tanpa diakritik', () => {
    const content = resolveContent(def, null);
    const entries = searchEntries(content, navItems(content));
    expect(entries.find((e) => e.label === 'Gunung Semeru')).toEqual({ label: 'Gunung Semeru', group: 'Panduan Gunung', target: 'guides', guide: 1 });
    expect(entries.find((e) => e.label === 'Tenda' && e.group === 'Kategori')).toEqual({ label: 'Tenda', group: 'Kategori', target: 'products', category: 'Tenda' });
    // Produk membawa kategorinya: memilihnya dari pencarian memindah filter ke kategori itu
    expect(entries.find((e) => e.label === 'Carrier 60L + Rain Cover')).toEqual({ label: 'Carrier 60L + Rain Cover', group: 'Produk', target: 'products', category: 'Carrier' });
    expect(entries.find((e) => e.label === 'Sewa Headlamp')?.target).toBe('rental');
    expect(entries.some((e) => e.target === 'safety' && /hipotermia/.test(e.label))).toBe(true);
    expect(entries.some((e) => e.target === 'faq' && /syarat menyewa/.test(e.label))).toBe(true);
    expect(searchFilter(entries, 'semeru').map((e) => e.label)).toEqual(['Gunung Semeru']);
    expect(searchFilter(entries, 'sewa tenda').map((e) => e.label)).toContain('Sewa Tenda Dome 2 Orang');
    expect(searchFilter(entries, 'RÍNJANI').map((e) => e.label)).toContain('Gunung Rinjani');
    expect(searchFilter(entries, '   ')).toEqual([]);
    expect(searchFilter(entries, 'zzz')).toEqual([]);
  });

  it('pesan WhatsApp panduan berisi barang yang belum dicentang; ikon otomatis dari judul', () => {
    expect(guideMessage('Toko', 'Gunung Prau', ['Headlamp', 'Jas hujan'])).toBe(
      'Halo Toko, saya berencana mendaki Gunung Prau. Perlengkapan yang belum saya punya: Headlamp, Jas hujan. Bisa bantu cek stok untuk beli atau sewa?',
    );
    expect(guideMessage('Toko', 'Gunung Prau', [])).toBe('Halo Toko, saya berencana mendaki Gunung Prau dan ingin konsultasi perlengkapan.');
    expect(iconKey('Tenda')).toBe('tent');
    expect(iconKey('Carrier')).toBe('backpack');
    expect(iconKey('Sleeping Bag')).toBe('sleep');
    expect(iconKey('Sepatu Gunung')).toBe('boots');
    expect(iconKey('Perlengkapan Darurat')).toBe('firstAid');
    expect(iconKey('Headlamp')).toBe('light');
    expect(iconKey('Cek cuaca dan status gunung')).toBe('weather');
    expect(iconKey('Daftar resmi dan bawa identitas')).toBe('permit');
    expect(iconKey('Jangan mendaki sendirian')).toBe('group');
    expect(iconKey('Cegah hipotermia')).toBe('cold');
    expect(iconKey('Hitung bekal air')).toBe('water');
    expect(iconKey('Bawa turun sampahmu')).toBe('trash');
    expect(iconKey('Sesuatu yang lain', 2)).toBe('tent');
  });
});

// Demo merender seluruh halaman (banyak kartu & SVG kontur): batas waktu longgar saat seluruh suite berjalan paralel
const SLOW = 20_000;

describe('PuncakGear: demo', () => {
  it('urutan section, satu h1, hero poster berfoto, menu transparan dengan garis aksen item aktif', () => {
    const container = demo();
    expect(sectionKeys(container)).toEqual(ORDER);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const hero = section(container, 'hero');
    expect(hero.getAttribute('data-hero-layout')).toBe('summit');
    expect(hero.getAttribute('data-tpl-tone')).toBe('inverse');
    expect(hero.querySelector('h1')!.textContent).toBe('Naik Lebih Tinggi');
    expect(hero.querySelector('h1')!.className).toContain('uppercase');
    const img = hero.querySelector<HTMLImageElement>('img[fetchpriority="high"]')!;
    expect(img.getAttribute('src')).toBe('/assets/templates/photos/puncakgear-hero-1920.webp');
    expect(img.getAttribute('srcset')).toBe('/assets/templates/photos/puncakgear-hero-800.webp 800w, /assets/templates/photos/puncakgear-hero-1920.webp 1920w');
    expect(img.getAttribute('loading')).toBe('eager');
    expect(img.getAttribute('alt')).toMatch(/pendaki/i);
    expect(container.querySelectorAll('img[fetchpriority="high"]')).toHaveLength(1);

    const header = container.querySelector('header')!;
    expect(header.className).toContain('h-0');
    expect(header.getAttribute('data-tpl-tone')).toBe('inverse');
    const nav = within(header).getAllByRole('navigation', { name: 'Menu utama' })[0];
    expect(Array.from(nav.querySelectorAll('a')).map((a) => a.textContent)).toEqual(['Beranda', 'Produk', 'Panduan Gunung', 'Sewa Alat', 'Keselamatan', 'Tanya Jawab', 'Kontak']);
    expect(within(nav).getByRole('link', { name: 'Beranda' })).toHaveAttribute('aria-current', 'true');
    // Tautan menu + tombol bergaris di kanan menu, keduanya ke Sewa Alat
    const rentLinks = within(header).getAllByRole('link', { name: 'Sewa Alat' });
    expect(rentLinks).toHaveLength(2);
    for (const link of rentLinks) expect(link).toHaveAttribute('href', '#rental');
    expect(within(header).getByRole('button', { name: 'Cari di halaman' })).toHaveAttribute('aria-expanded', 'false');
    expect(header.querySelector('svg[viewBox="0 0 32 32"]'), 'PuncakMark').not.toBeNull();
  }, SLOW);

  it('hero: tombol aksen ke Produk, tautan ke Sewa, kartu produk ke Produk, kalimat besar ke Panduan, angka', () => {
    const hero = section(demo(), 'hero');
    expect(within(hero).getByRole('link', { name: 'Belanja Perlengkapan' })).toHaveAttribute('href', '#products');
    expect(within(hero).getByRole('link', { name: 'Sewa alat untuk pemula' })).toHaveAttribute('href', '#rental');
    expect(within(hero).getByRole('link', { name: 'Carrier 60L Ringan, Rp1.249.000' })).toHaveAttribute('href', '#products');
    expect(within(hero).getByRole('link', { name: 'Lihat panduan gunung' })).toHaveAttribute('href', '#guides');
    expect(hero.textContent).toContain('Malang · Jawa Timur');
    expect(hero.textContent).toContain('50+');
    expect(hero.textContent).toContain('Alat siap disewa');
  }, SLOW);

  it('kategori: 5 kartu foto; klik kartu menggulir ke Produk dan menyaring kategori yang sama', () => {
    const container = demo();
    const categories = section(container, 'categories');
    expect(categories.querySelectorAll('ul > li')).toHaveLength(5);
    for (const img of categories.querySelectorAll('img')) {
      expect(img.getAttribute('loading')).toBe('lazy');
      expect(img.getAttribute('srcset')).toContain('-800.webp 800w');
    }
    fireEvent.click(within(categories).getByRole('link', { name: 'Tenda: lihat produk' }));
    expect(scrolled).toEqual(['products']);
    const products = section(container, 'products');
    expect(within(products).getByRole('button', { name: 'Tenda' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(products).getByRole('list', { name: 'Daftar produk' }).children).toHaveLength(1);
    expect(products.querySelector('p.sr-only[aria-live="polite"]')).toHaveTextContent('1 produk di kategori Tenda');
    // Region role="status" hanya milik Shell (keterangan pratinjau) dan kolom cari yang terbuka
    expect(products.querySelector('[role="status"]')).toBeNull();
    fireEvent.click(within(categories).getByRole('link', { name: 'Sleeping Bag: lihat produk' }));
    expect(within(products).getByRole('list', { name: 'Daftar produk' }).children).toHaveLength(2);
  }, SLOW);

  it('produk: 8 kartu dengan label, rating, harga coret; chip filter; tombol Pesan ke WhatsApp berisi nama & harga', () => {
    const products = section(demo(), 'products');
    const list = within(products).getByRole('list', { name: 'Daftar produk' });
    expect(list.children).toHaveLength(8);
    expect(list.textContent).toContain('Terlaris');
    expect(list.textContent).toContain('Rp1.050.000');
    expect(list.querySelectorAll('.line-through')).toHaveLength(2);
    expect(products.textContent).toContain('Rating 4,9 dari 5');
    const order = within(products).getByRole('link', { name: 'Pesan Carrier 60L + Rain Cover' });
    expect(order).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\/6281234567890/));
    expect(waText(order)).toContain('Halo Tapak Rimba Outdoor, saya ingin memesan Carrier 60L + Rain Cover (Rp1.249.000).');
    const chips = within(within(products).getByRole('group', { name: 'Filter kategori produk' })).getAllByRole('button');
    expect(chips.map((b) => b.textContent)).toEqual(['Semua', 'Tenda', 'Carrier', 'Sleeping Bag', 'Sepatu Gunung', 'Aksesori', 'Perlengkapan Darurat']);
    expect(chips[0]).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(chips[5]);
    expect(list.children).toHaveLength(2);
    fireEvent.click(chips[0]);
    expect(within(products).getByRole('list', { name: 'Daftar produk' }).children).toHaveLength(8);
  }, SLOW);

  it('panduan gunung: tab terpilih membuka panelnya (jalur + daftar centang); WhatsApp berisi barang yang belum dicentang', () => {
    const guides = section(demo(), 'guides');
    const tabs = within(within(guides).getByRole('tablist', { name: 'Pilih gunung' })).getAllByRole('tab');
    expect(tabs).toHaveLength(5);
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false', 'false', 'false']);
    expect(tabs.map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1', '-1', '-1']);
    // Hanya panel terpilih yang tampil (panel lain `hidden`, tetap di DOM)
    const panel = within(guides).getByRole('tabpanel');
    expect(panel).toHaveAccessibleName('Gunung Rinjani, Lombok Timur, NTB');
    expect(tabs[0]).toHaveAttribute('aria-controls', panel.id);
    expect(within(panel).getByRole('heading', { level: 3 })).toHaveTextContent('Panduan mendaki Gunung Rinjani');
    expect(panel.textContent).toContain('3.726 mdpl');
    expect(panel.textContent).toContain('Sembalun – Senaru');
    expect(panel.textContent).toContain('eRinjani');
    const boxes = within(panel).getAllByRole('checkbox');
    expect(boxes).toHaveLength(12);
    const progress = within(panel).getByRole('progressbar');
    expect(progress).toHaveAttribute('aria-valuenow', '0');
    fireEvent.click(boxes[0]);
    fireEvent.click(boxes[1]);
    expect(progress).toHaveAttribute('aria-valuenow', '2');
    expect(panel.textContent).toContain('2 dari 12 siap');
    const ask = within(panel).getByRole('link', { name: /Tanya stok daftar ini/ });
    expect(waText(ask)).toContain('saya berencana mendaki Gunung Rinjani. Perlengkapan yang belum saya punya: Sleeping bag suhu nyaman 0–5°C, Matras');
    expect(waText(ask)).not.toContain('Carrier 50–60 liter');
    expect(within(panel).getByRole('link', { name: /Sewa yang belum ada/ })).toHaveAttribute('href', '#rental');
    fireEvent.click(within(panel).getByRole('button', { name: /Hapus centang/ }));
    expect(progress).toHaveAttribute('aria-valuenow', '0');

    fireEvent.click(tabs[1]);
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
    expect(panel).not.toBeVisible();
    const semeru = within(guides).getByRole('tabpanel');
    expect(semeru).toHaveAccessibleName('Gunung Semeru, Lumajang & Malang, Jawa Timur');
    expect(semeru.textContent).toContain('Ranu Kumbolo');
    expect(within(semeru).getAllByRole('checkbox')).toHaveLength(11);
    expect(within(semeru).getAllByRole('checkbox').every((box) => !(box as HTMLInputElement).checked)).toBe(true);
    expect(guides.textContent).toContain('Selalu cek pengumuman resmi pengelola gunung');

    // Keyboard: panah memindah fokus & pilihan, Home/End ke ujung
    tabs[1].focus();
    fireEvent.keyDown(tabs[1], { key: 'ArrowRight' });
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[2]).toHaveFocus();
    fireEvent.keyDown(tabs[2], { key: 'End' });
    expect(tabs[4]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs[4], { key: 'ArrowRight' });
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  }, SLOW);

  it('sewa: 3 alat & 2 hari terpilih saat dibuka, + / − mengubah hari, diskon ≥ 4 hari, pesan WhatsApp berisi rincian', () => {
    const rental = section(demo(), 'rental');
    // Tanpa nada "inverse": kontrol di kartu putih memakai cincin fokus dasar yang gelap (bukan putih di atas putih)
    expect(rental.hasAttribute('data-tpl-tone')).toBe(false);
    expect(rental.querySelector('[data-tpl-tone="inverse"]')).toBeNull();
    expect(within(rental).getByRole('list', { name: 'Syarat sewa' }).children).toHaveLength(4);
    const boxes = within(rental).getAllByRole('checkbox') as HTMLInputElement[];
    expect(boxes).toHaveLength(8);
    expect(boxes.map((b) => b.checked)).toEqual([true, true, true, false, false, false, false, false]);
    const total = () => rental.querySelector('dl > div:last-child dd')!.textContent;
    expect(total()).toBe('Rp150.000');
    expect(within(rental).getByRole('button', { name: 'Kurangi satu hari' })).not.toBeDisabled();
    const plus = within(rental).getByRole('button', { name: 'Tambah satu hari' });
    fireEvent.click(plus);
    fireEvent.click(plus);
    expect(rental.querySelector('output')).toHaveTextContent('4 hari');
    expect(rental.textContent).toContain('Diskon 10% lama sewa');
    expect(total()).toBe('Rp270.000');
    fireEvent.click(boxes[7]);
    expect(total()).toBe('Rp298.800');
    const order = within(rental).getByRole('link', { name: /Pesan Sewa via WhatsApp/ });
    expect(order).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\//));
    expect(waText(order)).toContain('selama 4 hari');
    expect(waText(order)).toContain('- Headlamp (Rp8.000/hari)');
    expect(waText(order)).toContain('Perkiraan total: Rp298.800');
    for (const i of [0, 1, 2, 7]) fireEvent.click(boxes[i]);
    expect(within(rental).getByRole('button', { name: 'Pilih minimal satu alat' })).toBeDisabled();
    expect(within(rental).queryByRole('link', { name: /Pesan Sewa/ })).toBeNull();
  }, SLOW);

  it('sewa: tombol − / + di batas hari memakai aria-disabled (bukan disabled), jadi fokus keyboard tetap di tombolnya', () => {
    const rental = section(demo(), 'rental');
    const minus = within(rental).getByRole('button', { name: 'Kurangi satu hari' });
    const plus = within(rental).getByRole('button', { name: 'Tambah satu hari' });
    const days = () => rental.querySelector('output')!.textContent;
    expect(minus).toHaveAttribute('aria-disabled', 'false');
    minus.focus();
    fireEvent.click(minus);
    expect(days()).toBe('1 hari');
    expect(minus).toHaveAttribute('aria-disabled', 'true');
    expect(minus).not.toBeDisabled();
    expect(minus).toHaveFocus();
    fireEvent.click(minus);
    expect(days()).toBe('1 hari');
    plus.focus();
    for (let i = 0; i < 20; i += 1) fireEvent.click(plus);
    expect(days()).toBe('14 hari');
    expect(plus).toHaveAttribute('aria-disabled', 'true');
    expect(plus).not.toBeDisabled();
    expect(plus).toHaveFocus();
    expect(minus).toHaveAttribute('aria-disabled', 'false');
  }, SLOW);

  it('fokus terlihat & judul utuh: CTA aksen punya cincin fokus putih tebal, judul hero mengecil & patah kata di HP', () => {
    const hero = section(demo(), 'hero');
    const cta = within(hero).getByRole('link', { name: 'Belanja Perlengkapan' });
    expect(cta.className).toContain('focus-visible:outline-[3px]');
    expect(cta.className).toContain('focus-visible:outline-white');
    const h1 = hero.querySelector('h1')!;
    expect(h1.className).toContain('[overflow-wrap:anywhere]');
    expect(h1.className).toContain('text-[length:min(52px,12cqi)]');
    // Batas 11ch hanya di layar lebar: di HP kata panjang ("PERLENGKAPAN") boleh memakai seluruh lebar wadah
    expect(h1.className).toMatch(/(^|\s)@2xl:max-w-\[11ch\]/);
    expect(h1.className).not.toMatch(/(^|\s)max-w-\[11ch\]/);
  }, SLOW);

  it('tips keselamatan bernomor + kartu darurat, cerita pendaki, FAQ accordion, basecamp, footer gelap', () => {
    const container = demo();
    const safety = section(container, 'safety');
    expect(safety.querySelectorAll('ol > li')).toHaveLength(6);
    expect(safety.textContent).toContain('Basarnas di 115');

    const stories = section(container, 'testimonials');
    expect(stories.querySelectorAll('blockquote')).toHaveLength(3);
    for (const img of stories.querySelectorAll('img')) expect(img.getAttribute('srcset')).toContain('-240.webp 240w');

    const faq = section(container, 'faq');
    const buttons = within(faq).getAllByRole('button');
    expect(buttons).toHaveLength(6);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(buttons[2]);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'false');
    expect(buttons[2]).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(buttons[2].getAttribute('aria-controls')!)).not.toHaveAttribute('inert');
    expect(within(faq).getByRole('link', { name: /Konsultasi via WhatsApp/ })).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\//));

    const contact = section(container, 'contact');
    expect(within(contact).getByRole('link', { name: /WhatsApp 081234567890/ })).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\//));
    expect(contact.querySelector('iframe[title="Peta lokasi Tapak Rimba Outdoor"]')).not.toBeNull();

    const footer = container.querySelector('footer')!;
    expect(footer.getAttribute('data-tpl-tone')).toBe('inverse');
    expect(within(footer).getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://instagram.com/tapakrimba');
    expect(within(footer).getByRole('navigation', { name: 'Tautan footer' }).querySelectorAll('a')).toHaveLength(6);
    expect(footer.textContent).toContain(`© ${new Date().getFullYear()} Tapak Rimba Outdoor. Semua hak dilindungi.`);
  }, SLOW);

  it('datar: tidak ada kelas shadow di kode template; garis kontur berupa SVG', () => {
    const container = demo();
    const shadows = Array.from(container.querySelectorAll('[class*="shadow"]')).filter((el) => !el.closest('[aria-label="Chat WhatsApp"]') && !/Chat WhatsApp/.test(el.getAttribute('aria-label') ?? ''));
    expect(shadows.map((el) => el.className)).toEqual([]);
    expect(container.querySelectorAll('svg[viewBox="0 0 800 600"] path').length).toBeGreaterThan(10);
  }, SLOW);
});

describe('PuncakGear: pencarian di menu', () => {
  it('cari gunung → panduannya terbuka; cari kategori → produk tersaring; tanpa hasil → ajakan bertanya; Esc menutup', () => {
    const container = demo();
    const header = container.querySelector('header')!;
    const toggle = within(header).getByRole('button', { name: 'Cari di halaman' });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const panel = document.getElementById(toggle.getAttribute('aria-controls')!)!;
    const input = within(panel).getByRole('searchbox', { name: 'Cari di halaman' });
    expect(input).toHaveFocus();
    expect(within(panel).getByRole('link', { name: 'Sewa Alat' })).toHaveAttribute('href', '#rental');

    fireEvent.change(input, { target: { value: 'semeru' } });
    const results = within(header).getByRole('list', { name: 'Hasil pencarian' });
    expect(Array.from(results.querySelectorAll('a')).map((a) => a.textContent)).toEqual(['Gunung SemeruPanduan Gunung']);
    fireEvent.click(within(results).getByRole('link'));
    expect(scrolled).toEqual(['guides']);
    expect(within(header).queryByRole('searchbox')).toBeNull();
    expect(within(section(container, 'guides')).getByRole('tabpanel')).toHaveAccessibleName('Gunung Semeru, Lumajang & Malang, Jawa Timur');

    fireEvent.click(toggle);
    fireEvent.change(within(header).getByRole('searchbox'), { target: { value: 'carrier kategori' } });
    fireEvent.click(within(within(header).getByRole('list', { name: 'Hasil pencarian' })).getByRole('link', { name: /CarrierKategori/ }));
    expect(within(section(container, 'products')).getByRole('button', { name: 'Carrier' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(toggle);
    fireEvent.change(within(header).getByRole('searchbox'), { target: { value: 'kayak' } });
    expect(header.textContent).toContain('Tidak ada hasil untuk “kayak”.');
    expect(within(header).getByRole('link', { name: /Tanyakan langsung kepada kami/ })).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\//));
    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });
    expect(within(header).queryByRole('searchbox')).toBeNull();
    expect(toggle).toHaveFocus();
  }, SLOW);
});

describe('PuncakGear: navigasi keyboard & filter', () => {
  it('cari produk saat filter kategori lain aktif → filter pindah ke kategori produk itu sehingga produknya tampil', () => {
    const container = demo();
    fireEvent.click(within(section(container, 'categories')).getByRole('link', { name: 'Tenda: lihat produk' }));
    const products = section(container, 'products');
    const list = () => within(products).getByRole('list', { name: 'Daftar produk' });
    expect(list().textContent).not.toContain('Kompor');
    const header = container.querySelector('header')!;
    fireEvent.click(within(header).getByRole('button', { name: 'Cari di halaman' }));
    fireEvent.change(within(header).getByRole('searchbox'), { target: { value: 'kompor' } });
    fireEvent.click(within(within(header).getByRole('list', { name: 'Hasil pencarian' })).getByRole('link', { name: /Kompor Portabel \+ Nesting/ }));
    expect(scrolled.at(-1)).toBe('products');
    expect(within(products).getByRole('button', { name: 'Aksesori' })).toHaveAttribute('aria-pressed', 'true');
    expect(list().textContent).toContain('Kompor Portabel + Nesting');
  }, SLOW);

  it('menu HP: Esc menutup menu dan mengembalikan fokus ke tombol menu (bukan ke <body>)', () => {
    const container = demo();
    const header = container.querySelector('header')!;
    const button = within(header).getByRole('button', { name: 'Buka menu' });
    fireEvent.click(button);
    const menuId = button.getAttribute('aria-controls')!;
    within(document.getElementById(menuId)!).getAllByRole('link')[1].focus();
    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });
    expect(document.getElementById(menuId)).toBeNull();
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();
  }, SLOW);
});

describe('PuncakGear: SEO situs demo', () => {
  it('judul tab & meta description bawaan terbaca seperti toko outdoor (siteHead: "Nama — Tagline", kalimat hero)', () => {
    expect(siteTitle('puncakgear', null)).toBe('Tapak Rimba Outdoor — Toko & Sewa Alat Pendakian di Malang');
    // Judul situs ≤ 60 karakter agar tidak terpotong di hasil Google
    expect(siteTitle('puncakgear', null).length).toBeLessThanOrEqual(60);
    const restore = applySiteHead('puncakgear', null);
    expect(document.title).toBe('Tapak Rimba Outdoor — Toko & Sewa Alat Pendakian di Malang');
    const description = document.head.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
    expect(description).toMatch(/^Tenda, carrier, sleeping bag, dan sepatu gunung/);
    expect(description).toMatch(/basecamp kami di Malang/);
    expect(description.length).toBeLessThanOrEqual(155);
    restore();
  });

  it('heading: satu H1, H2 di setiap section, H3/H4 berurutan tanpa lompatan; semua panduan gunung ber-H3 dan termuat di DOM', () => {
    const container = demo();
    const levels = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6')).map((h) => Number(h.tagName[1]));
    expect(levels[0]).toBe(1);
    expect(levels.filter((level) => level === 1)).toHaveLength(1);
    for (let i = 1; i < levels.length; i += 1) expect(levels[i] - levels[i - 1], `heading ke-${i + 1}`).toBeLessThanOrEqual(1);
    for (const key of ORDER.slice(1)) expect(section(container, key).querySelector('h2'), key).not.toBeNull();
    expect(Array.from(section(container, 'categories').querySelectorAll('h3')).map((h) => h.textContent)).toEqual([
      'Tenda',
      'Carrier',
      'Sleeping Bag',
      'Sepatu Gunung',
      'Perlengkapan Darurat',
    ]);
    const guides = section(container, 'guides');
    const panels = Array.from(guides.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
    expect(panels.map((panel) => panel.hidden)).toEqual([false, true, true, true, true]);
    expect(panels.map((panel) => panel.querySelector('h3')?.textContent)).toEqual([
      'Panduan mendaki Gunung Rinjani',
      'Panduan mendaki Gunung Semeru',
      'Panduan mendaki Gunung Prau',
      'Panduan mendaki Gunung Merbabu',
      'Panduan mendaki Gunung Sindoro',
    ]);
    for (const panel of panels) {
      expect(Array.from(panel.querySelectorAll('h4')).map((h) => h.textContent?.replace(/ untuk .*/, ''))).toEqual(['Gambaran jalur', 'Catatan keselamatan', 'Perlengkapan']);
    }
    // Teks panduan yang tidak dipilih tetap ada di HTML (bisa dibaca mesin pencari)
    for (const route of ['Patak Banteng', 'Suwanting', 'Kledung', 'Ranu Kumbolo']) expect(guides.textContent).toContain(route);
  }, SLOW);

  it('gambar: alt deskriptif bahasa Indonesia, width/height, srcset + sizes; hanya foto hero yang eager + fetchpriority', () => {
    const container = demo();
    const imgs = Array.from(container.querySelectorAll('img'));
    expect(imgs.length).toBeGreaterThanOrEqual(30);
    for (const img of imgs) {
      const src = img.getAttribute('src') ?? '';
      // Avatar testimoni (KitAvatar bersama) dekoratif: nama orangnya tertulis tepat di sampingnya
      const avatar = !!img.closest('[data-tpl-section="testimonials"]');
      expect(img.getAttribute('alt')?.trim().length ?? 0, src).toBeGreaterThanOrEqual(avatar ? 0 : 12);
      expect(Number(img.getAttribute('width')), src).toBeGreaterThan(0);
      expect(Number(img.getAttribute('height')), src).toBeGreaterThan(0);
      expect(img.getAttribute('srcset'), src).toMatch(/ (800|240)w/);
      expect(img.getAttribute('sizes'), src).toBeTruthy();
    }
    const eager = imgs.filter((img) => img.getAttribute('loading') !== 'lazy');
    expect(eager).toHaveLength(1);
    expect(eager[0].closest('[data-tpl-section="hero"]')).not.toBeNull();
    expect(eager[0]).toHaveAttribute('fetchpriority', 'high');
    // Garis kontur & simbol bawaan: SVG dekoratif tersembunyi dari pembaca layar
    for (const svg of container.querySelectorAll('svg[viewBox="0 0 800 600"], svg[viewBox="0 0 32 32"]')) {
      expect(svg.getAttribute('aria-hidden') === 'true' || !!svg.closest('[aria-hidden="true"]')).toBe(true);
    }
  }, SLOW);

  it('tautan = <a href> sungguhan, tombol hanya untuk aksi di halaman (filter, tab, centang, hari, FAQ, menu, cari)', () => {
    const container = demo();
    expect(container.querySelectorAll('a:not([href])')).toHaveLength(0);
    for (const button of container.querySelectorAll('button')) expect(button).toHaveAttribute('type', 'button');
    const sectionLinks = Array.from(container.querySelectorAll('a[href^="#"]')).map((a) => a.getAttribute('href'));
    expect(sectionLinks).toEqual(expect.arrayContaining(['#products', '#guides', '#rental', '#kontak']));
  }, SLOW);
});

describe('PuncakGear: konten opsional kosong', () => {
  it('hero tanpa foto → latar gradasi tanpa img; kartu produk, keterangan kanan, dan angka kosong → disembunyikan', () => {
    const hero = section(demo({ hero: { image: '', card_title: '', side_label: '', side_text: '', stat_value: '', stat_label: '' } }), 'hero');
    expect(hero.querySelector('img')).toBeNull();
    expect(hero.className).toContain('pg-hero-fallback');
    expect(within(hero).queryByRole('link', { name: /Carrier 60L Ringan/ })).toBeNull();
    expect(hero.textContent).not.toContain('Malang · Jawa Timur');
    expect(hero.textContent).not.toContain('50+');
    expect(within(hero).getByRole('link', { name: 'Belanja Perlengkapan' })).toBeInTheDocument();
  }, SLOW);

  it('tanpa WhatsApp → tombol pesan/sewa ke Kontak; produk tanpa foto → ikon; kategori tanpa foto → kontur', () => {
    const container = demo({
      contact: { whatsapp: '' },
      products: { items: [{ name: 'Gaiter', category: 'Sepatu Gunung', price: 'Rp99.000', image: '' }] },
      categories: { items: [{ title: 'Sepatu Gunung', image: '' }] },
    });
    const products = section(container, 'products');
    expect(products.querySelector('img')).toBeNull();
    expect(within(products).getByRole('link', { name: 'Pesan Gaiter' })).toHaveAttribute('href', '#kontak');
    expect(within(products).queryByRole('group', { name: 'Filter kategori produk' })).toBeNull();
    const categories = section(container, 'categories');
    expect(categories.querySelector('img')).toBeNull();
    expect(categories.querySelector('svg[viewBox="0 0 800 600"]')).not.toBeNull();
    expect(within(section(container, 'rental')).getByRole('link', { name: /Pesan Sewa/ })).toHaveAttribute('href', '#kontak');
  }, SLOW);

  it('hero dimatikan: header jadi bilah putih biasa tanpa "Beranda"; tanpa produk: tombol hero ke Kontak', () => {
    const off = demo({ hero: { enabled: false } });
    expect(sectionKeys(off)).toEqual(ORDER.filter((k) => k !== 'hero'));
    const header = off.querySelector('header')!;
    expect(header.className).not.toContain('h-0');
    expect(header.hasAttribute('data-tpl-tone')).toBe(false);
    expect(within(header).getAllByRole('navigation', { name: 'Menu utama' })[0].textContent).not.toContain('Beranda');
    cleanup();
    const noProducts = demo({ products: { enabled: false }, contact: { whatsapp: '' } });
    expect(within(section(noProducts, 'hero')).getByRole('link', { name: 'Belanja Perlengkapan' })).toHaveAttribute('href', '#kontak');
  }, SLOW);
});

describe('PuncakGear: pratinjau CMS', () => {
  it('pratinjau diam (gerak mati bila Component dirender langsung) dan tanpa tautan wa.me', () => {
    const { container } = render(<def.Component content={resolveContent(def, null)} preview />);
    expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'off');
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    expect(container.querySelector('a[href^="https://instagram.com"]')).toBeNull();
  });
});

describe('PuncakGear: editor CMS', () => {
  it('setiap section skema menampilkan semua field (termasuk isi list) di panel CMS', () => {
    const content = resolveContent(def, null);
    for (const s of def.sections) {
      const { container, unmount } = render(
        <SectionEditor
          section={s}
          content={content}
          defaults={def.defaultContent}
          open
          onToggleOpen={vi.fn()}
          onActivate={vi.fn()}
          onTextChange={vi.fn()}
          onListChange={vi.fn()}
          onListItemRemoved={vi.fn()}
          onEnabledChange={vi.fn()}
          errors={{}}
          onBlurPath={vi.fn()}
        />,
      );
      const box = within(container);
      if (s.toggleable) expect(box.getByRole('switch', { name: `Tampilkan bagian ${s.label} di situs` })).toBeInTheDocument();
      for (const f of s.fields) {
        expect(container.textContent, `${s.key}.${f.key}`).toContain(f.label);
        if (!isListField(f)) continue;
        expect(box.getByRole('button', { name: new RegExp(`Tambah ${f.itemLabel}`, 'i') })).toBeInTheDocument();
        fireEvent.click(box.getByRole('button', { name: new RegExp(`^${f.itemLabel} 1(?![0-9])`) }));
        for (const sub of f.fields) expect(container.textContent, `${s.key}.${f.key}.${sub.key}`).toContain(sub.label);
      }
      unmount();
    }
    // Banyak field + list: bisa lewat 5 dtk saat seluruh suite berjalan paralel
  }, 20_000);
});

describe('PuncakGear: data katalog', () => {
  const sql = (file: string) => readFileSync(resolve(ROOT, file), 'utf8');

  it.each(['database/seed.templates.sql', 'database/migrations/2026-10-25_021_puncakgear_template.sql'])(
    '%s: baris puncakgear dengan template_code, kategori Toko Online, harga, dan pratinjau tangkapan layar .webp',
    (file) => {
      const text = sql(file);
      expect(text).toContain("'puncakgear'");
      expect(text).toContain("'Toko Online'");
      expect(text).toContain('1590000.00');
      expect(text).toContain("'/assets/templates/puncakgear-preview.webp'");
      expect(text).toContain('\'["/assets/templates/puncakgear-1.webp","/assets/templates/puncakgear-2.webp"]\'');
    },
  );

  it('migrasi 021 aman diulang (INSERT IGNORE + UPDATE berdasarkan slug, tanpa DELETE), sort_order 9, tercatat di schema_migrations', () => {
    // Tanpa komentar SQL (komentar kepala menyebut "Tidak ada DELETE")
    const text = sql('database/migrations/2026-10-25_021_puncakgear_template.sql').replace(/^--.*$/gm, '');
    expect(text).toMatch(/INSERT IGNORE INTO templates/);
    expect(text).toMatch(/WHERE slug = 'puncakgear';/);
    expect(text).toMatch(/sort_order\s+= 9/);
    expect(text).not.toMatch(/\bDELETE\b/);
    expect(text).toContain("VALUES ('2026-10-25_021', 'templates: katalog PuncakGear')");
  });

  it('gambar pratinjau katalog ada di public/, berukuran 1600×1000, dan ringan', () => {
    for (const name of ['puncakgear-preview', 'puncakgear-1', 'puncakgear-2']) {
      const path = resolve(ROOT, `public/assets/templates/${name}.webp`);
      expect(existsSync(path), name).toBe(true);
      const kb = statSync(path).size / 1024;
      expect(kb, name).toBeGreaterThan(10);
      expect(kb, name).toBeLessThan(220);
      expect(webpSize(readFileSync(path)), name).toEqual([1600, 1000]);
    }
  });
});

describe('PuncakGear: konten aneh', () => {
  it('angka, null, dan string di tempat list tidak membuat crash', () => {
    const weird = {
      hero: { title: 7, card_title: 5, card_url: 'javascript:alert(1)', stat_value: null },
      categories: { items: 'x' },
      products: { items: [{ name: 1, price: 2 }, null, 'x', { name: 'A', rating: 'bintang' }] },
      guides: { items: [{ name: 3, gear: 4 }, { name: 'Gunung X', url: 'javascript:alert(1)' }] },
      rental: { items: [{ name: 2, price: null }], discount_days: 'x', discount_percent: 200 },
      safety: { items: [{ title: 2, text: null }] },
      faq: { items: [{ question: 2, answer: null }] },
      brand: { accent_color: 'hijau' },
    } as unknown as SiteContent;
    const { container } = render(<def.Component content={resolveContent(def, weird)} />);
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
  });
});
