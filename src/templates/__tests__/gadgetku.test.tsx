// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/gadgetku.test.tsx
// GadgetKu.id (template toko aksesoris HP 2026-10-25): skema CMS & konten demo, helper model (warna, tipe HP &
// kecocokan, harga/diskon/hemat, menu, pencarian), demo (urutan section, hero kartu gelap, cari per tipe HP, kategori →
// penyaring produk, produk, bundling, custom casing dengan foto sendiri, layanan, ulasan, FAQ, kontak, footer),
// pencarian di header, konten opsional kosong, pratinjau CMS diam, editor CMS, data katalog (migrasi 022 + seed +
// gambar pratinjau), dan konten aneh.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionEditor } from '../../pages/account/cms/SectionEditor';
import { validateContent } from '../../pages/account/cms/validation';
import { TEMPLATES, resolveContent } from '../index';
import { itemIconKey, perkIconKey } from '../gadgetku/icons';
import {
  NIGHT,
  brandsOf,
  caseColors,
  bundleLines,
  compatSummary,
  discountPercent,
  featuredBundle,
  formatRupiah,
  gadgetkuVars,
  inCategory,
  isCompatible,
  navItems,
  parseRupiah,
  paymentMethods,
  phoneModels,
  productBadge,
  productCategories,
  sameCategory,
  ratingStars,
  savings,
  searchEntries,
  searchFilter,
  stars,
} from '../gadgetku/model';
import { GADGETKU_PHOTOS } from '../gadgetku/photos';
import { SiteRenderer } from '../SiteRenderer';
import { applySiteHead, siteTitle } from '../siteHead';
import { contrast, parseHex } from '../shared/utils';
import { isListField, type ListItem, type SiteContent } from '../types';

const ROOT = process.cwd();
const def = TEMPLATES.gadgetku;
const ORDER = ['hero', 'finder', 'categories', 'products', 'bundles', 'custom', 'perks', 'testimonials', 'faq', 'contact'];
const sectionKeys = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-tpl-section]')).map((s) => s.getAttribute('data-tpl-section'));
const section = (root: HTMLElement, key: string) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`)!;
const demo = (content: unknown = null, preview = false) => render(<SiteRenderer templateCode="gadgetku" content={content} preview={preview} />).container;
const rgb = (hex: string) => parseHex(hex)!;
const publicFile = (url: string) => resolve(ROOT, 'public', url.replace(/^\//, ''));
const href = (el: Element) => decodeURIComponent(el.getAttribute('href') ?? '');
const status = (root: HTMLElement) => root.querySelector('[role="status"]')?.textContent ?? '';

/** Ukuran gambar WebP dari header chunk pertama (VP8 lossy, VP8L lossless, atau VP8X extended). */
function webpSize(buf: Buffer): { width: number; height: number } | null {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null;
  const chunk = buf.toString('ascii', 12, 16);
  if (chunk === 'VP8X') return { width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1 };
  if (chunk === 'VP8 ') return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  if (chunk === 'VP8L') {
    const bits = buf.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
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

describe('GadgetKu: skema & konten bawaan', () => {
  it('urutan form = urutan halaman, kunci section toko pendek, field unik, list berbatas', () => {
    expect(def.code).toBe('gadgetku');
    expect(def.name).toBe('GadgetKu.id');
    expect(def.sections.map((s) => s.key)).toEqual(['brand', ...ORDER, 'footer']);
    const fields = (key: string) => def.sections.find((s) => s.key === key)!.fields.map((f) => f.key);
    expect(fields('brand')).toEqual(['company_name', 'tagline', 'logo', 'accent_color', 'announcement']);
    expect(fields('hero')).toEqual(expect.arrayContaining(['highlight', 'card_title', 'card_text', 'card_url', 'stat_value', 'stat_label', 'brands_label']));
    expect(fields('finder')).toEqual(['eyebrow', 'title', 'subtitle', 'empty_text', 'models']);
    expect(fields('products')).toEqual(['eyebrow', 'title', 'subtitle', 'items']);
    expect(fields('custom')).toEqual(expect.arrayContaining(['highlight', 'image', 'price_label', 'price_note', 'button_label', 'button_url', 'steps']));
    expect(fields('contact')).toEqual(expect.arrayContaining(['whatsapp', 'whatsapp_message', 'shopee_url', 'tokopedia_url']));
    const sub = (key: string, list: string) => {
      const f = def.sections.find((s) => s.key === key)!.fields.find((x) => x.key === list)!;
      return isListField(f) ? f.fields.map((x) => x.key) : [];
    };
    expect(sub('finder', 'models')).toEqual(['brand', 'model', 'port']);
    expect(sub('products', 'items')).toEqual(['name', 'category', 'price', 'old_price', 'badge', 'image', 'compatible', 'rating', 'sold', 'url']);
    expect(sub('bundles', 'items')).toEqual(['name', 'items', 'price', 'old_price', 'badge', 'description', 'button_label', 'button_url']);
    const logo = def.sections[0].fields.find((f) => f.key === 'logo');
    expect(logo && 'help' in logo ? logo.help : '').toMatch(/simbol HP & kilat/);
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
    expect(c.hero.image).toBe('/assets/templates/photos/gadgetku-hero-1920.webp');
    const photos = JSON.stringify(c).match(/\/assets\/templates\/photos\/[a-z0-9-]+\.webp/g) ?? [];
    expect(photos.length).toBeGreaterThanOrEqual(22);
    for (const src of photos) expect(GADGETKU_PHOTOS.asset(src), src).not.toBeNull();
    const credits = readFileSync(resolve(ROOT, 'public/assets/templates/photos/CREDITS.md'), 'utf8');
    for (const key of GADGETKU_PHOTOS.keys) {
      const asset = GADGETKU_PHOTOS.asset(GADGETKU_PHOTOS.src(key))!;
      const urls = [asset.src, ...asset.srcSet!.split(',').map((part) => part.trim().split(' ')[0])];
      for (const url of urls) expect(existsSync(publicFile(url)), url).toBe(true);
      expect(credits, key).toContain(`\`${key}-*\``);
      expect(photos, `${key} dipakai di konten demo`).toContain(GADGETKU_PHOTOS.src(key));
    }
    expect(existsSync(publicFile('/assets/templates/logos/gadgetku-mark.svg'))).toBe(true);
  });

  it('foto demo ringan: varian terbesar ≤ 90 KB, varian 800w/240w ≤ 45 KB', () => {
    for (const key of GADGETKU_PHOTOS.keys) {
      const asset = GADGETKU_PHOTOS.asset(GADGETKU_PHOTOS.src(key))!;
      const small = asset.srcSet!.split(',')[0].trim().split(' ')[0];
      expect(statSync(publicFile(asset.src)).size / 1024, asset.src).toBeLessThanOrEqual(90);
      expect(statSync(publicFile(small)).size / 1024, small).toBeLessThanOrEqual(45);
    }
  });

  it('hemat bundling demo = harga normal − harga paket (isi paket sesuai harga satuan produk)', () => {
    const products = def.defaultContent.products.items as Record<string, string>[];
    const priceOf = (line: string) => {
      const found = products.find((p) => p.name === line || p.name.startsWith(line));
      return found ? parseRupiah(found.price)! : NaN;
    };
    for (const bundle of def.defaultContent.bundles.items as Record<string, string>[]) {
      const total = bundleLines(bundle.items).reduce((sum, line) => sum + priceOf(line), 0);
      expect(total, bundle.name).toBe(parseRupiah(bundle.old_price));
    }
  });
});

describe('GadgetKu: helper model', () => {
  it('aksen di latar gelap ≥ 7:1 terhadap latar hitam; warna tidak valid → bawaan', () => {
    for (const accent of ['#6EE7B7', '#0B3D2E', '#1D4ED8', '#000000', '#FFFF00']) {
      const vars = gadgetkuVars(accent) as Record<string, string>;
      expect(contrast(rgb(vars['--gk-on-dark']), rgb(NIGHT)), accent).toBeGreaterThanOrEqual(7);
    }
    expect(gadgetkuVars('hijau')).toEqual(gadgetkuVars('#6EE7B7'));
  });

  it('daftar tipe HP: tanpa tipe dibuang, duplikat sekali, label tanpa merek ganda, merek urut kemunculan', () => {
    const models = phoneModels({
      models: [
        { brand: 'Apple', model: 'iPhone 15', port: 'USB-C' },
        { brand: 'apple', model: 'iphone 15' },
        { brand: 'Samsung', model: 'Galaxy A55', port: 'USB-C' },
        { brand: 'Xiaomi', model: 'Redmi Note 13' },
        { brand: 'Xiaomi', model: 'Xiaomi 14T' },
        { brand: '', model: 'Nokia 3310' },
        { brand: 'OPPO', model: '' },
      ],
    });
    expect(models.map((m) => m.label)).toEqual(['iPhone 15', 'Samsung Galaxy A55', 'Redmi Note 13', 'Xiaomi 14T', 'Nokia 3310']);
    expect(models[1]).toEqual({ id: 'samsung|galaxy a55', brand: 'Samsung', model: 'Galaxy A55', port: 'USB-C', label: 'Samsung Galaxy A55' });
    expect(brandsOf(models)).toEqual(['Apple', 'Samsung', 'Xiaomi', 'Lainnya']);
    expect(phoneModels({ models: 'x' } as never)).toEqual([]);
  });

  it('kecocokan: tipe, merek + tipe, merek, port (Type-C = USB-C), "Semua HP"/kosong; token utuh', () => {
    const [a55, ip15, ip15pro, ip14] = phoneModels({
      models: [
        { brand: 'Samsung', model: 'Galaxy A55', port: 'USB-C' },
        { brand: 'Apple', model: 'iPhone 15', port: 'USB-C' },
        { brand: 'Apple', model: 'iPhone 15 Pro', port: 'USB-C' },
        { brand: 'Apple', model: 'iPhone 14', port: 'Lightning' },
      ],
    });
    const p = (compatible: string) => ({ name: 'Produk', compatible });
    expect(isCompatible(p('Galaxy A55, iPhone 15'), a55)).toBe(true);
    expect(isCompatible(p('Samsung Galaxy A55'), a55)).toBe(true);
    expect(isCompatible(p('samsung'), a55)).toBe(true);
    expect(isCompatible(p('Type-C'), a55)).toBe(true);
    // Penulisan port yang umum di toko Indonesia: semuanya = USB-C
    for (const port of ['USB Type-C', 'USB Type C', 'usb type-c', 'Tipe C', 'USB Tipe-C']) expect(isCompatible(p(port), a55), port).toBe(true);
    const [typeC] = phoneModels({ models: [{ brand: 'Samsung', model: 'Galaxy A06', port: 'USB Type-C' }] });
    expect(isCompatible(p('USB-C'), typeC)).toBe(true);
    expect(isCompatible(p('Lightning'), typeC)).toBe(false);
    expect(isCompatible(p('Galaxy A15'), a55)).toBe(false);
    expect(isCompatible(p('USB-C'), ip14)).toBe(false);
    expect(isCompatible(p('Lightning'), ip14)).toBe(true);
    expect(isCompatible(p('iPhone 15'), ip15)).toBe(true);
    expect(isCompatible(p('iPhone 15'), ip15pro)).toBe(false);
    expect(isCompatible(p('Semua HP'), ip14)).toBe(true);
    expect(isCompatible(p(''), ip14)).toBe(true);
    expect(compatSummary('')).toBe('Semua HP');
    expect(compatSummary('semua hp')).toBe('Semua HP');
    expect(compatSummary('USB-C')).toBe('USB-C');
    expect(compatSummary('iPhone 13, iPhone 14\niPhone 15; Galaxy A55')).toBe('iPhone 13, iPhone 14 +2');
  });

  it('harga: baca rupiah, format, hemat, persen diskon, label produk, bintang', () => {
    expect(parseRupiah('Rp1.290.000')).toBe(1290000);
    expect(parseRupiah('Rp 59.000')).toBe(59000);
    expect(parseRupiah('Rp49.500,00')).toBe(49500);
    expect(parseRupiah('gratis')).toBeNull();
    // Singkatan harga yang umum: rb / ribu / K / jt / juta
    expect([parseRupiah('Rp149rb'), parseRupiah('149 ribu'), parseRupiah('149K'), parseRupiah('Rp1,5 jt'), parseRupiah('Rp 2 juta'), parseRupiah('Rp12,5rb')]).toEqual([
      149000, 149000, 149000, 1500000, 2000000, 12500,
    ]);
    expect(savings('Rp149rb', 'Rp179rb')).toBe(30000);
    expect(savings('Rp149rb', 'Rp179.000')).toBe(30000);
    expect(discountPercent('Rp1,2 jt', 'Rp1,5 jt')).toBe(20);
    expect(formatRupiah(15000)).toBe('Rp15.000');
    expect(savings('Rp149.000', 'Rp179.000')).toBe(30000);
    expect(savings('Rp179.000', 'Rp149.000')).toBe(0);
    expect(savings('', 'Rp10.000')).toBe(0);
    expect(discountPercent('Rp59.000', 'Rp79.000')).toBe(25);
    expect(discountPercent('Rp59.000', '')).toBe(0);
    expect(productBadge({ price: 'Rp59.000', old_price: 'Rp79.000' })).toBe('-25%');
    expect(productBadge({ price: 'Rp59.000', old_price: 'Rp79.000', badge: 'Baru' })).toBe('Baru');
    expect(productBadge({ price: 'Rp59.000' })).toBe('');
    expect([stars('5'), stars('3'), stars('4,6'), stars('0'), stars('9'), stars(''), stars('x')]).toEqual([5, 3, 5, 1, 5, 5, 5]);
    // Rating toko: bintang mengikuti angka; tanpa angka -> null (tanpa bintang, bukan 5)
    expect([ratingStars('4,9'), ratingStars('4,9/5'), ratingStars('4,2'), ratingStars('3.8/5'), ratingStars(''), ratingStars('bagus')]).toEqual([5, 5, 4, 4, null, null]);
    // Warna casing dari CMS: dipisah koma, duplikat sekali, maks. 6, nama dikenali -> warnanya, lainnya -> netral
    const colors = caseColors('Bening, Hitam doff,  navy , hitam doff, Abu-abu, Pelangi\nMerah Muda, Kuning, Ungu');
    expect(colors.map((c) => c.label)).toEqual(['Bening', 'Hitam doff', 'navy', 'Abu-abu', 'Pelangi', 'Merah Muda']);
    expect(colors.map((c) => c.swatch)).toEqual([
      'linear-gradient(135deg, #ffffff 0%, #d5dbe3 100%)',
      '#16181B',
      '#1B2A4A',
      '#A7ACB3',
      '#D9DCE1',
      '#F2A7BF',
    ]);
    expect(caseColors('')).toEqual([]);
  });

  it('paket, kategori, metode bayar, ikon otomatis', () => {
    expect(bundleLines('- Charger\n\n• Kabel\r\n✓ Casing  \n')).toEqual(['Charger', 'Kabel', 'Casing']);
    expect(featuredBundle([{ name: 'A' }, { name: 'B', badge: 'Laris' }, { name: 'C', badge: 'Lain' }])).toBe(1);
    expect(featuredBundle([{ name: 'A' }])).toBe(-1);
    expect(sameCategory('Kabel Data', 'kabel')).toBe(true);
    expect(sameCategory('Casing', 'Charger')).toBe(false);
    expect(sameCategory('', 'Casing')).toBe(false);
    const items: ListItem[] = [{ category: 'Casing' }, { category: 'casing' }, { category: 'Charger' }, { name: 'tanpa kategori' }];
    expect(productCategories(items)).toEqual(['Casing', 'Charger']);
    expect(inCategory(items, 'Casing')).toHaveLength(2);
    expect(inCategory(items, '')).toHaveLength(4);
    expect(paymentMethods('COD · Transfer bank, QRIS | E-wallet')).toEqual(['COD', 'Transfer bank', 'QRIS', 'E-wallet']);
    expect(['Power Bank 10.000 mAh', 'Tempered Glass Anti-Spy', 'Charger 20W USB-C PD', 'Kabel USB-C 1 m', 'Earphone TWS', 'Casing Bening Magnetik', 'Stiker'].map(itemIconKey)).toEqual([
      'power',
      'glass',
      'charger',
      'cable',
      'audio',
      'case',
      'other',
    ]);
    expect(['Garansi 1 tahun', 'Kirim cepat', 'Bisa COD', 'Tukar 7 hari'].map((t) => perkIconKey(t))).toEqual(['warranty', 'shipping', 'cod', 'exchange']);
    expect(perkIconKey('Sesuatu yang lain', 1)).toBe('shipping');
  });

  it('menu mengikuti section yang tampil; label pendek dari label section', () => {
    const content = resolveContent(def, null);
    expect(navItems(content).map((i) => i.label)).toEqual(['Cari HP', 'Produk', 'Bundling', 'Custom Casing', 'Ulasan', 'FAQ', 'Toko Kami']);
    const edited = resolveContent(def, { finder: { models: [] }, bundles: { enabled: false }, faq: { eyebrow: 'Pertanyaan umum pembeli' } });
    expect(navItems(edited).map((i) => i.key)).toEqual(['products', 'custom', 'testimonials', 'faq', 'contact']);
    expect(navItems(edited).find((i) => i.key === 'faq')?.label).toBe('FAQ');
  });

  it('pencarian header: tipe HP (dengan tipe terpilih), produk (termasuk isi "Cocok untuk"), kategori, paket, FAQ', () => {
    const content = resolveContent(def, null);
    const models = phoneModels(content.finder);
    const entries = searchEntries(content, models);
    expect(searchFilter(entries, 'a55').map((e) => e.label)).toEqual([
      'Samsung Galaxy A55',
      'Casing Silikon Soft-Touch',
      'Tempered Glass Full Cover 9H',
      'Tempered Glass Anti-Spy',
    ]);
    expect(searchFilter(entries, 'a55')[0]).toMatchObject({ target: 'finder', phone: 'samsung|galaxy a55' });
    expect(searchFilter(entries, 'kabel data').map((e) => `${e.label}|${e.target}|${e.category ?? ''}`)).toEqual([
      'Kabel USB-C ke USB-C 1 m|products|Kabel Data',
      'Kabel USB-A ke Lightning 1 m|products|Kabel Data',
      'Kabel Data|products|Kabel Data',
    ]);
    expect(searchFilter(entries, 'charger 45').map((e) => e.label)).toEqual(['Charger GaN 45W Super Fast', 'Paket Lengkap']);
    expect(searchFilter(entries, 'VÍVO').filter((e) => e.target === 'finder').map((e) => e.label)).toEqual(['vivo Y28', 'vivo V30']);
    expect(searchFilter(entries, 'cod').some((e) => e.target === 'faq')).toBe(true);
    expect(searchFilter(entries, '   ')).toEqual([]);
    expect(searchFilter(entries, 'zzz')).toEqual([]);
  });
});

describe('GadgetKu: demo', () => {
  it('urutan section, satu h1, hero kartu gelap berfoto, menu putih dengan pengumuman dan Chat Admin', () => {
    const container = demo();
    expect(sectionKeys(container)).toEqual(ORDER);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const hero = section(container, 'hero');
    expect(hero.getAttribute('data-hero-layout')).toBe('inset-card');
    const h1 = hero.querySelector('h1')!;
    expect(h1.textContent).toBe('Aksesoris HP yang pas untuk tipe HP-mu');
    expect(h1.querySelector('span')?.textContent).toBe('pas untuk tipe HP-mu');
    const img = hero.querySelector<HTMLImageElement>('img[fetchpriority="high"]')!;
    expect(img.getAttribute('src')).toBe('/assets/templates/photos/gadgetku-hero-1920.webp');
    expect(img.getAttribute('srcset')).toBe('/assets/templates/photos/gadgetku-hero-800.webp 800w, /assets/templates/photos/gadgetku-hero-1920.webp 1920w');
    expect(img.getAttribute('loading')).toBe('eager');
    expect(img.getAttribute('alt')).toMatch(/HP hitam/);
    expect(container.querySelectorAll('img[fetchpriority="high"]')).toHaveLength(1);

    expect(container.textContent).toContain('Gratis ongkir se-Jabodetabek min. belanja Rp150.000');
    const header = container.querySelector('header')!;
    const nav = within(header).getAllByRole('navigation', { name: 'Menu utama' })[0];
    expect(Array.from(nav.querySelectorAll('a')).map((a) => a.textContent)).toEqual(['Cari HP', 'Produk', 'Bundling', 'Custom Casing', 'Ulasan', 'FAQ', 'Toko Kami']);
    expect(within(header).getByRole('link', { name: 'Chat Admin' })).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\/6281234567890/));
    expect(within(header).getByRole('button', { name: 'Cari produk atau tipe HP' })).toHaveAttribute('aria-expanded', 'false');
    expect(header.querySelector('svg[viewBox="0 0 32 32"]'), 'GadgetkuMark').not.toBeNull();
  });

  it('hero: tombol ke pencarian per tipe & produk, kartu custom casing, kartu rating, daftar merek otomatis', () => {
    const hero = section(demo(), 'hero');
    expect(within(hero).getByRole('link', { name: 'Cari Aksesoris HP-mu' })).toHaveAttribute('href', '#finder');
    expect(within(hero).getByRole('link', { name: 'Lihat Produk Terbaru' })).toHaveAttribute('href', '#products');
    expect(within(hero).getByRole('link', { name: /Casing custom fotomu/ })).toHaveAttribute('href', '#custom');
    expect(hero.textContent).toContain('4,9/5');
    const brands = within(hero).getByRole('list', { name: 'Tersedia untuk' });
    expect(Array.from(brands.querySelectorAll('li')).map((li) => li.textContent)).toEqual(['Apple', 'Samsung', 'Xiaomi', 'OPPO', 'vivo', 'realme']);
  });

  it('cari per tipe HP: merek → tipe → produk cocok + tombol pesan berisi tipe HP; kategori kosong disebutkan', () => {
    const finder = section(demo(), 'finder');
    expect(finder.textContent).toContain('Pilih merek dan tipe HP-mu untuk melihat aksesoris yang cocok.');
    expect(within(finder).getByText('Pilih merek dulu untuk melihat tipe HP-nya.')).toBeInTheDocument();
    fireEvent.click(within(finder).getByRole('button', { name: 'Samsung' }));
    expect(within(finder).getByRole('button', { name: 'Samsung' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(finder).getByRole('button', { name: 'Galaxy A55' }));
    expect(status(finder)).toBe('9 aksesoris cocok untuk Samsung Galaxy A55');
    const results = within(finder).getByRole('list', { name: 'Aksesoris untuk Samsung Galaxy A55' });
    expect(Array.from(results.querySelectorAll('h3')).map((h) => h.textContent)).toEqual([
      'Casing Silikon Soft-Touch',
      'Tempered Glass Full Cover 9H',
      'Tempered Glass Anti-Spy',
      'Charger 20W USB-C PD',
      'Charger GaN 45W Super Fast',
      'Kabel USB-C ke USB-C 1 m',
      'Earphone TWS Bluetooth 5.3',
      'TWS Gaming Low Latency',
      'Power Bank 10.000 mAh 22,5W',
    ]);
    expect(href(within(results).getByRole('link', { name: 'Pesan Casing Silikon Soft-Touch untuk Samsung Galaxy A55' }))).toContain(
      'Halo GadgetKu.id, saya mau pesan Casing Silikon Soft-Touch (Rp59.000) untuk Samsung Galaxy A55.',
    );
    expect(finder.textContent).not.toContain('belum tampil di sini');

    fireEvent.click(within(finder).getByRole('button', { name: 'Ganti tipe HP' }));
    expect(status(finder)).toBe('');
    expect(within(finder).getByRole('button', { name: 'Samsung' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(within(finder).getByRole('button', { name: 'realme' }));
    fireEvent.click(within(finder).getByRole('button', { name: 'realme 12' }));
    expect(status(finder)).toBe('6 aksesoris cocok untuk realme 12');
    expect(finder.textContent).toContain('Casing, Tempered Glass untuk realme 12 belum tampil di sini.');
    expect(href(within(finder).getByRole('link', { name: /Tanya stok ke admin/ }))).toContain('apakah ada aksesoris lain untuk realme 12?');

    // Kabel menurut port: iPhone 14 (Lightning) mendapat kabel Lightning, bukan USB-C
    fireEvent.click(within(finder).getByRole('button', { name: 'Apple' }));
    fireEvent.click(within(finder).getByRole('button', { name: 'iPhone 14' }));
    const names = Array.from(finder.querySelectorAll('h3')).map((h) => h.textContent);
    expect(names).toContain('Kabel USB-A ke Lightning 1 m');
    expect(names).not.toContain('Kabel USB-C ke USB-C 1 m');
  });

  it('kategori → produk tersaring + gulir; chip kategori; kartu produk dengan diskon, label, rating, pesan WhatsApp', () => {
    const container = demo();
    const cats = section(container, 'categories');
    expect(within(cats).getAllByRole('link')).toHaveLength(6);
    for (const img of cats.querySelectorAll('img')) expect(img.getAttribute('loading')).toBe('lazy');
    fireEvent.click(within(cats).getByRole('link', { name: 'Kabel Data, USB-C & Lightning' }));
    expect(scrolled).toEqual(['products']);
    const products = section(container, 'products');
    expect(within(products).getByRole('list', { name: 'Produk Kabel Data' }).querySelectorAll(':scope > li')).toHaveLength(2);
    expect(within(products).getByRole('button', { name: 'Kabel Data' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(products).getByRole('button', { name: 'Semua' }));
    const row = within(products).getByRole('list', { name: 'Daftar produk' });
    const cards = Array.from(row.querySelectorAll<HTMLElement>(':scope > li'));
    expect(cards).toHaveLength(11);
    expect(cards[0].textContent).toContain('-25%');
    expect(cards[0].textContent).toContain('Cocok: iPhone 11, iPhone 13 +8');
    expect(cards[0].textContent).toContain('Rp79.000');
    expect(cards[1].textContent).toContain('Baru');
    expect(cards[4].textContent).toContain('Cocok: Semua HP');
    expect(href(within(cards[0]).getByRole('link', { name: 'Pesan Casing Silikon Soft-Touch' }))).toContain('saya mau pesan Casing Silikon Soft-Touch (Rp59.000).');
    for (const img of row.querySelectorAll('img')) {
      expect(img.getAttribute('loading')).toBe('lazy');
      expect(img.getAttribute('srcset')).toContain('-800.webp 800w');
    }
  });

  it('bundling: paket unggulan gelap, hemat dihitung otomatis, tombol WhatsApp berisi nama & harga paket', () => {
    const bundles = section(demo(), 'bundles');
    const cards = Array.from(bundles.querySelector('ul')!.children) as HTMLElement[];
    expect(cards).toHaveLength(3);
    const dark = cards.filter((li) => li.getAttribute('data-tpl-tone') === 'inverse');
    expect(dark).toHaveLength(1);
    expect(dark[0].textContent).toContain('Paling laris');
    expect(dark[0].textContent).toContain('Hemat Rp30.000');
    expect(cards[0].textContent).toContain('Hemat Rp15.000');
    expect(cards[2].textContent).toContain('Hemat Rp43.000');
    expect(within(dark[0]).getByRole('list', { name: 'Isi Paket Ngecas Kilat' }).querySelectorAll('li')).toHaveLength(3);
    expect(href(within(dark[0]).getByRole('link', { name: 'Ambil Paket Ngecas Kilat' }))).toContain('saya mau pesan Paket Ngecas Kilat (Rp149.000).');
  });

  it('custom casing: pilih foto (hanya di browser), ganti warna & tipe HP, pesan berisi tipe + warna, kembali ke contoh', () => {
    const create = vi.fn(() => 'blob:foto-1');
    const revoke = vi.fn();
    URL.createObjectURL = create;
    URL.revokeObjectURL = revoke;
    const custom = section(demo(), 'custom');
    expect(custom.textContent).toContain('tidak diunggah ke server dan tidak disimpan');
    const mockup = within(custom).getByRole('group', { name: 'Pratinjau casing bening dengan foto contoh' });
    const sample = mockup.querySelector('img')!;
    expect(sample.getAttribute('src')).toBe('/assets/templates/photos/gadgetku-custom-sample-1200.webp');
    expect(sample.getAttribute('srcset')).toContain('gadgetku-custom-sample-800.webp 800w');

    const input = custom.querySelector<HTMLInputElement>('input[type="file"]')!;
    expect(input).toHaveAttribute('accept', 'image/*');
    fireEvent.change(input, { target: { files: [new File(['teks'], 'catatan.txt', { type: 'text/plain' })] } });
    expect(within(custom).getByRole('alert')).toHaveTextContent('Pilih file gambar (JPG, PNG, atau WebP).');
    expect(create).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { files: [new File(['png'], 'foto.png', { type: 'image/png' })] } });
    expect(create).toHaveBeenCalledTimes(1);
    expect(within(custom).queryByRole('alert')).toBeNull();
    expect(custom.querySelector('[aria-roledescription] img')).toHaveAttribute('src', 'blob:foto-1');
    expect(custom.querySelector('label[for]')).toHaveTextContent('Ganti foto');

    fireEvent.click(within(custom).getByRole('button', { name: 'Hitam' }));
    expect(within(custom).getByRole('button', { name: 'Hitam' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(custom).getByRole('group', { name: 'Pratinjau casing hitam dengan foto pilihanmu' })).toBeInTheDocument();
    fireEvent.change(within(custom).getByRole('slider', { name: /Perbesar foto/ }), { target: { value: '200' } });
    expect(custom.textContent).toContain('200%');
    fireEvent.change(within(custom).getByRole('combobox', { name: /^Tipe HP/ }), { target: { value: 'samsung|galaxy a55' } });
    expect(href(within(custom).getByRole('link', { name: 'Pesan Casing Custom' }))).toContain(
      'saya mau pesan casing custom untuk Samsung Galaxy A55, warna hitam. Fotonya saya kirim di chat ini.',
    );

    fireEvent.click(within(custom).getByRole('button', { name: 'Pakai foto contoh' }));
    expect(revoke).toHaveBeenCalledWith('blob:foto-1');
    expect(custom.querySelector('[aria-roledescription] img')).toHaveAttribute('src', '/assets/templates/photos/gadgetku-custom-sample-1200.webp');
    expect(custom.textContent).toContain('100%');
  });

  it('layanan, ulasan, FAQ accordion, kontak & marketplace, footer gelap dengan kategori dan metode bayar', () => {
    const container = demo();
    const perks = section(container, 'perks');
    expect(perks.querySelector('[data-tpl-tone="inverse"]')).not.toBeNull();
    expect(Array.from(perks.querySelectorAll('h3')).map((h) => h.textContent)).toEqual(['Garansi 1 tahun', 'Kirim cepat', 'Bisa COD', 'Tukar 7 hari']);
    expect(within(perks).getByRole('link', { name: 'Chat Admin' })).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\//));

    const reviews = section(container, 'testimonials');
    expect(reviews.querySelectorAll('blockquote')).toHaveLength(3);
    expect(within(reviews).getAllByRole('img', { name: '5 dari 5 bintang' })).toHaveLength(4);
    expect(reviews.textContent).toContain('Beli: Paket Ngecas Kilat');
    for (const img of reviews.querySelectorAll('img')) expect(img.getAttribute('srcset')).toContain('-240.webp 240w');

    const faq = section(container, 'faq');
    const buttons = within(faq).getAllByRole('button');
    expect(buttons).toHaveLength(5);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(buttons[3]);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById(buttons[3].getAttribute('aria-controls')!)).not.toHaveAttribute('inert');
    expect(within(faq).getByRole('link', { name: 'Tanya Admin' })).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\//));

    const contact = section(container, 'contact');
    expect(within(contact).getByRole('link', { name: /WhatsApp 081234567890/ })).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\//));
    expect(within(contact).getByRole('link', { name: 'Shopee' })).toHaveAttribute('href', 'https://shopee.co.id/gadgetkuid');
    expect(within(contact).getByRole('link', { name: 'Tokopedia' })).toHaveAttribute('href', 'https://www.tokopedia.com/gadgetkuid');
    expect(within(contact).getByRole('link', { name: '(021) 7788-0123' })).toHaveAttribute('href', 'tel:+622177880123');
    expect(within(contact).getByRole('link', { name: 'Buka peta toko' })).toHaveAttribute('href', expect.stringContaining('google.com/maps/search'));
    expect(contact.querySelector('iframe')).toBeNull();

    const footer = container.querySelector('footer')!;
    const shop = within(footer).getByRole('navigation', { name: 'Belanja per kategori' });
    expect(Array.from(shop.querySelectorAll('a')).map((a) => a.textContent)).toEqual(['Casing', 'Tempered Glass', 'Charger', 'Kabel Data', 'Earphone', 'Power Bank']);
    fireEvent.click(within(shop).getByRole('link', { name: 'Charger' }));
    expect(scrolled).toEqual(['products']);
    expect(within(section(container, 'products')).getByRole('list', { name: 'Produk Charger' }).querySelectorAll(':scope > li')).toHaveLength(2);
    expect(Array.from(within(footer).getByRole('list', { name: 'Metode pembayaran' }).querySelectorAll('li')).map((li) => li.textContent)).toEqual([
      'COD',
      'Transfer bank',
      'QRIS',
      'E-wallet',
    ]);
    expect(within(footer).getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://instagram.com/gadgetku.id');
    expect(footer.textContent).toContain(`© ${new Date().getFullYear()} GadgetKu.id. Semua hak dilindungi.`);
  });

  it('datar: tidak ada kelas shadow di kode template', () => {
    const container = demo();
    const shadows = Array.from(container.querySelectorAll('[class*="shadow"]')).filter((el) => !el.closest('[aria-label="Chat WhatsApp"]') && !/Chat WhatsApp/.test(el.getAttribute('aria-label') ?? ''));
    expect(shadows.map((el) => el.className)).toEqual([]);
  });
});

describe('GadgetKu: SEO halaman demo (calon situs pembeli)', () => {
  it('satu H1 di awal, urutan heading tidak melompat, H1 menyebut aksesoris HP', () => {
    const container = demo();
    const levels = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6')).map((h) => Number(h.tagName[1]));
    expect(levels.filter((level) => level === 1)).toHaveLength(1);
    expect(levels[0]).toBe(1);
    levels.forEach((level, i) => {
      if (i > 0) expect(level, `heading ke-${i + 1}`).toBeLessThanOrEqual(levels[i - 1] + 1);
    });
    expect(container.querySelector('h1')!.textContent).toContain('Aksesoris HP');
    expect(Array.from(container.querySelectorAll('h2')).map((h) => h.textContent)).toEqual([
      'Cari aksesoris untuk HP-mu',
      'Semua yang HP-mu butuhkan, di satu toko',
      'Baru masuk minggu ini',
      'Beli sepaket, lebih hemat',
      'Casing custom dari fotomu sendiri',
      'Belanja tenang di GadgetKu.id',
      'Kata mereka yang sudah belanja',
      'Pertanyaan yang sering ditanyakan',
      'Mampir ke toko atau chat admin',
    ]);
  });

  it('judul tab & meta description situs (siteHead) terbaca sebagai toko aksesoris HP', () => {
    expect(siteTitle('gadgetku', null)).toBe('GadgetKu.id — Toko aksesoris HP: casing & tempered glass');
    expect(siteTitle('gadgetku', null).length).toBeLessThanOrEqual(60);
    const restore = applySiteHead('gadgetku', null);
    try {
      expect(document.title).toContain('Toko aksesoris HP');
      const description = document.head.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
      expect(description).toMatch(/^Toko aksesoris HP di Depok/);
      expect(description.length).toBeLessThanOrEqual(160);
    } finally {
      restore();
    }
  });

  it('gambar konten ber-alt deskriptif; gambar dekoratif & ikon SVG disembunyikan dari pembaca layar', () => {
    const container = demo();
    for (const img of container.querySelectorAll('img')) {
      const src = img.getAttribute('src') ?? '';
      expect(img.hasAttribute('alt'), src).toBe(true);
      const decorative = !!img.closest('[aria-hidden="true"]') || img.classList.contains('rounded-full');
      if (!decorative) expect((img.getAttribute('alt') ?? '').length, src).toBeGreaterThan(10);
    }
    for (const svg of container.querySelectorAll('svg')) {
      const hidden = svg.getAttribute('aria-hidden') === 'true' || !!svg.closest('[aria-hidden="true"], [role="img"]');
      expect(hidden, svg.outerHTML.slice(0, 120)).toBe(true);
    }
  });

  it('navigasi memakai <a href> asli, <button type="button"> hanya untuk aksi', () => {
    const container = demo();
    for (const a of container.querySelectorAll('a')) expect(a.getAttribute('href'), a.textContent ?? '').toBeTruthy();
    for (const button of container.querySelectorAll('button')) expect(button.getAttribute('type'), button.textContent ?? '').toBe('button');
  });

  it('kecepatan: hanya foto hero yang eager + fetchpriority high; semua gambar lain lazy; semua ber-srcset WebP, sizes, width/height', () => {
    const container = demo();
    const imgs = Array.from(container.querySelectorAll('img'));
    const eager = imgs.filter((img) => img.getAttribute('loading') !== 'lazy');
    expect(eager.map((img) => img.getAttribute('src'))).toEqual(['/assets/templates/photos/gadgetku-hero-1920.webp']);
    expect(eager[0]).toHaveAttribute('fetchpriority', 'high');
    expect(eager[0]).toHaveAttribute('width', '1920');
    expect(eager[0]).toHaveAttribute('height', '1200');
    for (const img of imgs) {
      const src = img.getAttribute('src') ?? '';
      expect(img.getAttribute('srcset'), src).toMatch(/\.webp \d+w, \S+\.webp \d+w$/);
      expect(img.getAttribute('sizes'), src).toBeTruthy();
      expect(Number(img.getAttribute('width')), src).toBeGreaterThan(0);
      expect(Number(img.getAttribute('height')), src).toBeGreaterThan(0);
    }
  });
});

describe('GadgetKu: pencarian di menu', () => {
  it('pintasan tipe HP; hasil tipe HP memilih tipe di pencarian per tipe; kategori menyaring produk; tanpa hasil → tanya admin; Esc menutup', () => {
    const container = demo();
    const header = container.querySelector('header')!;
    const toggle = within(header).getByRole('button', { name: 'Cari produk atau tipe HP' });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const panel = document.getElementById(toggle.getAttribute('aria-controls')!)!;
    const input = within(panel).getByRole('searchbox', { name: 'Cari produk atau tipe HP' });
    expect(input).toHaveFocus();
    expect(Array.from(panel.querySelectorAll('a')).map((a) => a.textContent)).toEqual(['iPhone 11', 'Samsung Galaxy A15', 'Redmi 13C', 'OPPO A79 5G']);

    fireEvent.change(input, { target: { value: 'a55' } });
    const results = within(header).getByRole('list', { name: 'Hasil pencarian' });
    expect(Array.from(results.querySelectorAll('a')).map((a) => a.textContent)).toEqual([
      'Samsung Galaxy A55Cari aksesoris yang cocok',
      'Casing Silikon Soft-TouchCasing',
      'Tempered Glass Full Cover 9HTempered Glass',
      'Tempered Glass Anti-SpyTempered Glass',
    ]);
    expect(within(header).getByRole('status')).toHaveTextContent('4 hasil');
    fireEvent.click(within(results).getAllByRole('link')[0]);
    expect(scrolled).toEqual(['finder']);
    expect(within(header).queryByRole('searchbox')).toBeNull();
    const finder = section(container, 'finder');
    expect(status(finder)).toBe('9 aksesoris cocok untuk Samsung Galaxy A55');
    expect(within(finder).getByRole('button', { name: 'Samsung' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(toggle);
    fireEvent.change(within(header).getByRole('searchbox'), { target: { value: 'kabel data' } });
    const kategori = Array.from(within(header).getByRole('list', { name: 'Hasil pencarian' }).querySelectorAll('a')).find((a) => a.textContent === 'Kabel DataKategori')!;
    fireEvent.click(kategori);
    expect(scrolled).toEqual(['finder', 'products']);
    expect(within(section(container, 'products')).getByRole('list', { name: 'Produk Kabel Data' })).toBeInTheDocument();

    fireEvent.click(toggle);
    fireEvent.change(within(header).getByRole('searchbox'), { target: { value: 'nokia' } });
    expect(header.textContent).toContain('Tidak ada hasil untuk “nokia”.');
    expect(href(within(header).getByRole('link', { name: /Tanyakan stoknya ke admin/ }))).toContain('apakah ada aksesoris untuk nokia?');
    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });
    expect(within(header).queryByRole('searchbox')).toBeNull();
    expect(toggle).toHaveFocus();
  });
});

describe('GadgetKu: perbaikan review', () => {
  it('hasil cari produk di header menyaring Produk ke kategorinya, jadi kartu yang dicari terlihat', () => {
    const container = demo();
    const header = container.querySelector('header')!;
    fireEvent.click(within(header).getByRole('button', { name: 'Cari produk atau tipe HP' }));
    fireEvent.change(within(header).getByRole('searchbox'), { target: { value: 'power bank' } });
    const result = Array.from(within(header).getByRole('list', { name: 'Hasil pencarian' }).querySelectorAll('a')).find((a) =>
      a.textContent?.startsWith('Power Bank 10.000 mAh 22,5W'),
    )!;
    fireEvent.click(result);
    expect(scrolled).toEqual(['products']);
    const products = section(container, 'products');
    const row = within(products).getByRole('list', { name: 'Produk Power Bank' });
    expect(Array.from(row.querySelectorAll('h3')).map((h) => h.textContent)).toEqual(['Power Bank 10.000 mAh 22,5W']);
  });

  it('bintang rating toko (ulasan & hero) mengikuti angka dari CMS; tanpa angka -> tanpa bintang', () => {
    const container = demo({ testimonials: { rating_value: '4,2' }, hero: { stat_value: '3,8/5' } });
    const reviews = section(container, 'testimonials');
    expect(within(reviews).getAllByRole('img', { name: '4 dari 5 bintang' })).toHaveLength(1);
    expect(within(section(container, 'hero')).getByRole('img', { name: '4 dari 5 bintang' })).toBeInTheDocument();
    cleanup();
    const bare = section(demo({ testimonials: { rating_value: '', rating_label: 'Ulasan dari pembeli kami' } }), 'testimonials');
    // Hanya bintang per ulasan (3), tidak ada bintang ringkasan tanpa angka
    expect(within(bare).getAllByRole('img', { name: /dari 5 bintang/ })).toHaveLength(3);
  });

  it('label kartu kategori di atas lapisan gelap yang cukup pekat (kontras AA di foto terang)', () => {
    const cats = section(demo(), 'categories');
    expect(cats.querySelectorAll('[class*="from-black/80"][class*="via-black/40"]')).toHaveLength(6);
  });

  it('hemat bundling benar untuk harga singkatan (Rp149rb / Rp179rb)', () => {
    const bundles = section(
      demo({ bundles: { items: [{ name: 'Paket Hemat', items: 'Casing\nTempered glass', price: 'Rp149rb', old_price: 'Rp179rb', badge: '' }] } }),
      'bundles',
    );
    expect(bundles.textContent).toContain('Hemat Rp30.000');
  });

  it('pilihan warna casing dari CMS: tombol & pesan WhatsApp mengikuti daftar; kosong -> tanpa pilihan warna', () => {
    const custom = section(demo({ custom: { case_colors: 'Hitam doff, Navy' } }), 'custom');
    const buttons = within(within(custom).getByRole('group', { name: 'Warna casing' })).getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['Hitam doff', 'Navy']);
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
    expect(within(custom).queryByRole('button', { name: 'Bening' })).toBeNull();
    expect(href(within(custom).getByRole('link', { name: 'Pesan Casing Custom' }))).toContain('warna hitam doff.');
    fireEvent.click(buttons[1]);
    expect(href(within(custom).getByRole('link', { name: 'Pesan Casing Custom' }))).toContain('warna navy.');
    expect(within(custom).getByRole('group', { name: /Pratinjau casing navy/ })).toBeInTheDocument();
    cleanup();

    const none = section(demo({ custom: { case_colors: '' } }), 'custom');
    expect(within(none).queryByRole('group', { name: 'Warna casing' })).toBeNull();
    expect(within(none).getByRole('group', { name: 'Pratinjau casing dengan foto contoh' })).toBeInTheDocument();
    const link = href(within(none).getByRole('link', { name: 'Pesan Casing Custom' }));
    expect(link).toContain('saya mau pesan casing custom untuk HP saya. Fotonya saya kirim di chat ini.');
    expect(link).not.toContain('warna');
  });
});

describe('GadgetKu: konten opsional kosong', () => {
  it('hero tanpa foto & kartu → latar cadangan tanpa img, tanpa kartu putih, tanpa daftar merek', () => {
    const hero = section(demo({ hero: { image: '', card_title: '', card_text: '', stat_value: '', stat_label: '', brands_label: '' } }), 'hero');
    expect(hero.querySelector('img')).toBeNull();
    expect(hero.querySelector('.gk-hero-fallback')).not.toBeNull();
    expect(within(hero).queryByRole('link', { name: /Casing custom fotomu/ })).toBeNull();
    expect(within(hero).queryByRole('list', { name: 'Tersedia untuk' })).toBeNull();
    expect(within(hero).getByRole('link', { name: 'Cari Aksesoris HP-mu' })).toBeInTheDocument();
  });

  it('tanpa daftar tipe HP → pencarian per tipe hilang dari halaman & menu, tombol utama ke Produk', () => {
    const container = demo({ finder: { models: [] } });
    expect(sectionKeys(container)).toEqual(ORDER.filter((k) => k !== 'finder'));
    expect(within(container.querySelector('header')!).getAllByRole('navigation', { name: 'Menu utama' })[0].textContent).not.toContain('Cari HP');
    expect(within(section(container, 'hero')).getByRole('link', { name: 'Cari Aksesoris HP-mu' })).toHaveAttribute('href', '#products');
    expect(within(section(container, 'custom')).queryByRole('combobox')).toBeNull();
  });

  it('produk tanpa foto → ikon kategori; tanpa WhatsApp → tombol pesan & chat ke Kontak', () => {
    const container = demo({
      products: { items: [{ name: 'Stiker Anti Gores', category: 'Aksesoris', price: 'Rp10.000' }] },
      contact: { whatsapp: '' },
    });
    const products = section(container, 'products');
    expect(products.querySelector('img')).toBeNull();
    expect(products.querySelector('article .lucide-shield'), 'ikon tempered glass/anti gores').not.toBeNull();
    expect(within(products).queryByRole('group', { name: 'Saring kategori' })).toBeNull();
    expect(within(products).getByRole('link', { name: 'Pesan Stiker Anti Gores' })).toHaveAttribute('href', '#kontak');
    expect(within(container.querySelector('header')!).getByRole('link', { name: 'Chat Admin' })).toHaveAttribute('href', '#kontak');
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
  });
});

describe('GadgetKu: pratinjau CMS', () => {
  it('pratinjau diam (gerak mati bila Component dirender langsung) dan tanpa tautan wa.me / marketplace', () => {
    const { container } = render(<def.Component content={resolveContent(def, null)} preview />);
    expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'off');
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    expect(container.querySelector('a[href^="https://shopee"]')).toBeNull();
  });
});

describe('GadgetKu: editor CMS', () => {
  it('setiap section skema menampilkan semua field (termasuk isi list) di panel CMS', () => {
    // Cukup satu item per list (demo punya 19 tipe HP & 11 produk; merender semuanya lambat dan tidak menambah cakupan)
    const content = Object.fromEntries(
      Object.entries(resolveContent(def, null)).map(([key, sec]) => [
        key,
        Object.fromEntries(Object.entries(sec).map(([field, value]) => [field, Array.isArray(value) ? value.slice(0, 1) : value])),
      ]),
    ) as SiteContent;
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
    // 12 section dengan banyak field: bisa lewat 5 dtk saat seluruh suite berjalan paralel
  }, 30_000);
});

describe('GadgetKu: data katalog', () => {
  const sql = (file: string) => readFileSync(resolve(ROOT, file), 'utf8');

  it.each(['database/seed.templates.sql', 'database/migrations/2026-10-25_022_gadgetku_template.sql'])(
    '%s: baris gadgetku dengan template_code, kategori Toko Online, harga, urutan, dan pratinjau tangkapan layar .webp',
    (file) => {
      const text = sql(file);
      expect(text).toContain("'gadgetku'");
      expect(text).toContain("'GadgetKu.id'");
      expect(text).toContain("'Toko Online'");
      expect(text).toContain('1590000.00');
      expect(text).toMatch(/'published',\s*10\)/);
      expect(text).toContain("'/assets/templates/gadgetku-preview.webp'");
      expect(text).toContain('\'["/assets/templates/gadgetku-1.webp","/assets/templates/gadgetku-2.webp"]\'');
    },
  );

  it('migrasi 022 aman diulang (INSERT IGNORE + UPDATE berdasarkan slug, tanpa DELETE) dan tercatat di schema_migrations', () => {
    const text = sql('database/migrations/2026-10-25_022_gadgetku_template.sql').replace(/^--.*$/gm, '');
    expect(text).toMatch(/INSERT IGNORE INTO templates/);
    expect(text).toMatch(/WHERE slug = 'gadgetku';/);
    expect(text).toMatch(/sort_order\s+= 10/);
    expect(text).not.toMatch(/\bDELETE\b/);
    expect(text).toContain("VALUES ('2026-10-25_022', 'templates: katalog GadgetKu.id')");
  });

  it('gambar pratinjau katalog ada di public/, 1600×1000, dan ringan', () => {
    for (const name of ['gadgetku-preview', 'gadgetku-1', 'gadgetku-2']) {
      const path = resolve(ROOT, `public/assets/templates/${name}.webp`);
      expect(existsSync(path), name).toBe(true);
      const kb = statSync(path).size / 1024;
      expect(kb, name).toBeGreaterThan(10);
      expect(kb, name).toBeLessThan(220);
      expect(webpSize(readFileSync(path)), name).toEqual({ width: 1600, height: 1000 });
    }
  });
});

describe('GadgetKu: konten aneh', () => {
  it('angka, null, dan string di tempat list tidak membuat crash', () => {
    const weird = {
      brand: { accent_color: 'hijau', announcement: 5 },
      hero: { highlight: 'tidak ada di judul', card_title: 5, primary_url: 'javascript:alert(1)' },
      finder: { models: [{ brand: 1, model: 2 }, null, 'x', { model: 'Tipe Saja' }] },
      categories: { items: 'x' },
      products: { items: [{ name: 1, price: 2, compatible: 3 }, null, 'x'] },
      bundles: { items: [{ name: 'Paket', items: 4, price: 'gratis', old_price: null }] },
      custom: { steps: [{ title: 2 }], image: 'javascript:alert(1)' },
      testimonials: { items: [{ quote: 'Bagus', rating: 'x' }] },
      footer: { payments: 7 },
    } as unknown as SiteContent;
    const { container } = render(<def.Component content={resolveContent(def, weird)} />);
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
    expect(container.querySelector('img[src^="javascript:"]')).toBeNull();
  });
});
