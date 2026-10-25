// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/skynusa.test.tsx
// SkyNusa (template toko drone 2026-10-25): skema CMS & konten demo, helper model (warna mint, menu, harga rupiah,
// filter kebutuhan, kalkulator sewa, keranjang & pesan WhatsApp, ikon otomatis), demo (urutan section, hero lembar
// spesifikasi, kategori → filter produk, keranjang demo, paket gelap, kalkulator sewa, servis lokal, kelas terbang, FAQ,
// footer), konten opsional kosong, pratinjau CMS diam, editor CMS, data katalog (migrasi 019 + seed + gambar
// pratinjau), dan konten aneh.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionEditor } from '../../pages/account/cms/SectionEditor';
import { validateContent } from '../../pages/account/cms/validation';
import { TEMPLATES, resolveContent } from '../index';
import { iconKey } from '../skynusa/icons';
import {
  addDaysIso,
  addToCart,
  cartMessage,
  cartTotal,
  featureTarget,
  filterProducts,
  filterTags,
  formatDateId,
  formatRupiah,
  navItems,
  parsePrice,
  rentalMessage,
  rentalQuote,
  savings,
  isoDate,
  setCartQty,
  skynusaVars,
  splitTags,
  toInt,
  validStartDate,
} from '../skynusa/model';
import { SKYNUSA_PHOTOS } from '../skynusa/photos';
import { applySiteHead, siteTitle } from '../siteHead';
import { SiteRenderer } from '../SiteRenderer';
import { contrast, parseHex } from '../shared/utils';
import { isListField, type ListItem, type SiteContent } from '../types';

// Demo lengkap (12 section, keranjang, kalkulator) + getByRole di jsdom: bisa lewat 5 dtk saat suite berjalan paralel
vi.setConfig({ testTimeout: 30_000 });

const ROOT = process.cwd();
const def = TEMPLATES.skynusa;
const ORDER = ['hero', 'categories', 'products', 'bundles', 'rental', 'warranty', 'academy', 'testimonials', 'faq', 'cta', 'contact'];
const sectionKeys = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-tpl-section]')).map((s) => s.getAttribute('data-tpl-section'));
const section = (root: HTMLElement, key: string) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`)!;
const demo = (content: unknown = null, preview = false) => render(<SiteRenderer templateCode="skynusa" content={content} preview={preview} />).container;
const rgb = (hex: string) => parseHex(hex)!;
const publicFile = (url: string) => resolve(ROOT, 'public', url.replace(/^\//, ''));
const items = (key: string, list = 'items') => def.defaultContent[key][list] as ListItem[];

let scrolled: (string | null)[] = [];
beforeEach(() => {
  scrolled = [];
  Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
    scrolled.push(this.getAttribute('data-tpl-section'));
  });
});
afterEach(cleanup);

describe('SkyNusa: skema & konten bawaan', () => {
  it('urutan form = urutan halaman, section baru berkunci Inggris pendek, field unik, list berbatas', () => {
    expect(def.code).toBe('skynusa');
    expect(def.name).toBe('SkyNusa');
    expect(def.sections.map((s) => s.key)).toEqual(['brand', ...ORDER, 'footer']);
    const fields = (key: string) => def.sections.find((s) => s.key === key)!.fields.map((f) => f.key);
    expect(fields('brand')).toEqual(['company_name', 'tagline', 'logo', 'accent_color']);
    expect(fields('hero')).toEqual(expect.arrayContaining(['highlight', 'primary_url', 'secondary_url', 'header_label', 'image', 'image_caption', 'specs', 'features']));
    expect(fields('products')).toEqual(['eyebrow', 'title', 'highlight', 'subtitle', 'note', 'items']);
    expect(fields('rental')).toEqual(expect.arrayContaining(['items', 'discount_days', 'discount_percent', 'deposit_note', 'points', 'button_label']));
    expect(fields('warranty')).toEqual(expect.arrayContaining(['stats', 'note', 'button_label', 'button_url']));
    expect(fields('academy')).toEqual(expect.arrayContaining(['badge', 'sessions', 'schedule', 'location']));
    const productFields = (def.sections.find((s) => s.key === 'products')!.fields.find((f) => f.key === 'items') as { fields: { key: string }[] }).fields;
    expect(productFields.map((f) => f.key)).toEqual(['name', 'use', 'price', 'old_price', 'badge', 'specs', 'image', 'url']);
    const logo = def.sections[0].fields.find((f) => f.key === 'logo');
    expect(logo && 'help' in logo ? logo.help : '').toMatch(/simbol drone/);
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
    expect(c.hero.image).toBe('/assets/templates/photos/skynusa-hero-1200.webp');
    const photos = JSON.stringify(c).match(/\/assets\/templates\/photos\/[a-z0-9-]+\.webp/g) ?? [];
    expect(photos.length).toBeGreaterThanOrEqual(18);
    for (const src of photos) expect(SKYNUSA_PHOTOS.asset(src), src).not.toBeNull();
    const credits = readFileSync(resolve(ROOT, 'public/assets/templates/photos/CREDITS.md'), 'utf8');
    for (const key of SKYNUSA_PHOTOS.keys) {
      const asset = SKYNUSA_PHOTOS.asset(SKYNUSA_PHOTOS.src(key))!;
      const urls = [asset.src, ...asset.srcSet!.split(',').map((part) => part.trim().split(' ')[0])];
      for (const url of urls) expect(existsSync(publicFile(url)), url).toBe(true);
      expect(credits, key).toContain(`\`${key}-*\``);
      expect(photos, `${key} dipakai di konten demo`).toContain(SKYNUSA_PHOTOS.src(key));
    }
    expect(existsSync(publicFile('/assets/templates/logos/skynusa-mark.svg'))).toBe(true);
  });

  it('foto demo ringan: WebP ≤ 160 KB per file, total ≤ 1,3 MB', () => {
    let total = 0;
    for (const key of SKYNUSA_PHOTOS.keys) {
      const asset = SKYNUSA_PHOTOS.asset(SKYNUSA_PHOTOS.src(key))!;
      for (const url of [asset.src, ...asset.srcSet!.split(',').map((part) => part.trim().split(' ')[0])].filter((u, i, all) => all.indexOf(u) === i)) {
        const kb = statSync(publicFile(url)).size / 1024;
        expect(kb, url).toBeLessThanOrEqual(160);
        total += kb;
      }
    }
    expect(total).toBeLessThanOrEqual(1300);
  });

  it('salinan demo jujur: merek generik, aturan terbang merujuk peraturan, pesanan lewat WhatsApp', () => {
    const text = JSON.stringify(def.defaultContent);
    expect(text).not.toMatch(/\bDJI\b|Mavic|Phantom|Inspire|bebas izin|tanpa izin|dijamin|terbaik nomor/i);
    expect(text).toMatch(/peraturan/);
    expect(text).toMatch(/kami konfirmasi lewat WhatsApp/);
  });
});

describe('SkyNusa: helper model', () => {
  it('warna mint ≥ 8:1 terhadap pita gelap untuk aksen apa pun; warna tidak valid → bawaan', () => {
    const dark = rgb('#0F191B');
    for (const accent of ['#12A07F', '#0F7F6E', '#FFE600', '#0B3D2E', '#ff0000', '#000000']) {
      const vars = skynusaVars(accent) as Record<string, string>;
      expect(contrast(rgb(vars['--sn-mint']), dark), accent).toBeGreaterThanOrEqual(8);
    }
    expect(skynusaVars('bukan warna')).toEqual(skynusaVars('#12A07F'));
  });

  it('menu mengikuti section yang tampil; label singkat dari label section', () => {
    const content = resolveContent(def, null);
    expect(navItems(content).map((i) => i.label)).toEqual(['Drone pilihan', 'Paket bundling', 'Sewa harian', 'Garansi', 'Kelas Terbang', 'Kontak']);
    const edited = resolveContent(def, { bundles: { enabled: false }, rental: { items: [] }, products: { eyebrow: 'Etalase drone terlengkap kami' } });
    expect(navItems(edited).map((i) => i.key)).toEqual(['products', 'warranty', 'academy', 'contact']);
    expect(navItems(edited)[0].label).toBe('Drone');
  });

  it('harga rupiah: parse aneka tulisan, format bertitik, hemat = harga coret − harga', () => {
    expect(parsePrice('Rp12.900.000')).toBe(12_900_000);
    expect(parsePrice('Rp 350.000,00')).toBe(350_000);
    expect(parsePrice('7,5 jt')).toBe(7_500_000);
    expect(parsePrice('250 rb/hari')).toBe(250_000);
    expect(parsePrice('Hubungi kami')).toBeNull();
    expect(parsePrice('')).toBeNull();
    expect(parsePrice('Rp0')).toBeNull();
    expect(parsePrice('12900000')).toBe(12_900_000);
    // Hanya angka pertama: keterangan berangka di belakang harga tidak ikut digabung
    expect(parsePrice('Rp450.000/24 jam')).toBe(450_000);
    expect(parsePrice('Rp6.490.000 (2 unit)')).toBe(6_490_000);
    expect(parsePrice('Rp12.900.000.')).toBe(12_900_000);
    expect(parsePrice('mulai 1,5 jt / hari')).toBe(1_500_000);
    expect(parsePrice('Rp6.490.000 (hemat 500 rb)')).toBe(6_490_000);
    expect(formatRupiah(12_900_000)).toBe('Rp12.900.000');
    expect(formatRupiah(950)).toBe('Rp950');
    expect(savings('Rp12.900.000', 'Rp13.900.000')).toBe(1_000_000);
    expect(savings('Rp12.900.000', 'Rp12.000.000')).toBeNull();
    expect(savings('Rp12.900.000', '')).toBeNull();
  });

  it('angka dari teks CMS (toInt): kelompok angka pertama, desimal tidak membengkak', () => {
    expect(toInt('3')).toBe(3);
    expect(toInt('10%')).toBe(10);
    expect(toInt('3 hari')).toBe(3);
    expect(toInt('7,5')).toBe(7);
    expect(toInt('2.5')).toBe(2);
    expect(toInt('')).toBe(0);
    expect(toInt('tidak ada')).toBe(0);
    // Potongan "7,5" tidak lagi menjadi 75%
    expect(rentalQuote(450_000, 3, 2, toInt('7,5')).percent).toBe(7);
  });

  it('tanggal mulai sewa: hari ini atau sesudahnya; tanggal lampau / tidak valid ditolak; tanpa "hari ini" tidak dibatasi', () => {
    expect(validStartDate('2026-10-25', '2026-10-25')).toBe('2026-10-25');
    expect(validStartDate('2026-11-07', '2026-10-25')).toBe('2026-11-07');
    expect(validStartDate('2026-10-24', '2026-10-25')).toBe('');
    expect(validStartDate('2024-01-15', '2026-10-25')).toBe('');
    expect(validStartDate('2026-02-30', '2026-01-01')).toBe('');
    expect(validStartDate('', '2026-10-25')).toBe('');
    expect(validStartDate('2024-01-15', '')).toBe('2024-01-15');
  });

  it('filter kebutuhan: label kategori yang punya produk, cocok tanpa beda huruf besar, filter tak dikenal → semua', () => {
    const products = items('products');
    expect(splitTags('Foto, Wedding / Pemetaan')).toEqual(['Foto', 'Wedding', 'Pemetaan']);
    expect(filterTags(items('categories'), products)).toEqual(['Foto', 'Wedding', 'Pemetaan']);
    expect(filterTags([{ title: 'Inspeksi', tag: 'Inspeksi' }, { title: 'Foto udara', tag: 'foto' }], products)).toEqual(['foto']);
    expect(filterProducts(products, 'wedding').map((p) => p.name)).toEqual(['Drone Lipat 4K Pro', 'Drone Sinema Dual Kamera']);
    expect(filterProducts(products, 'Inspeksi')).toHaveLength(4);
    expect(filterProducts(products, null)).toHaveLength(4);
  });

  it('kalkulator sewa: tarif × hari, potongan mulai minimal hari, lama 1–30 hari, tanggal kembali & pesan WhatsApp', () => {
    expect(rentalQuote(450_000, 2, 3, 10)).toEqual({ days: 2, rate: 450_000, subtotal: 900_000, percent: 0, discount: 0, total: 900_000 });
    expect(rentalQuote(450_000, 3, 3, 10)).toEqual({ days: 3, rate: 450_000, subtotal: 1_350_000, percent: 10, discount: 135_000, total: 1_215_000 });
    expect(rentalQuote(450_000, 99, 0, 10).days).toBe(30);
    expect(rentalQuote(450_000, 99, 0, 10).discount).toBe(0);
    expect(rentalQuote(450_000, -4, 3, 10).days).toBe(1);
    expect(rentalQuote(450_000, Number.NaN, 3, 10).days).toBe(1);
    expect(rentalQuote(100_000, 5, 2, 500).percent).toBe(90);
    expect(addDaysIso('2026-11-07', 3)).toBe('2026-11-10');
    expect(addDaysIso('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDaysIso('2026-02-30', 1)).toBe('');
    expect(formatDateId('2026-11-07')).toBe('Sab, 7 Nov 2026');
    expect(formatDateId('bukan tanggal')).toBe('');
    const quote = rentalQuote(450_000, 3, 3, 10);
    expect(rentalMessage('SkyNusa', 'Drone Lipat 4K Pro', '2026-11-07', quote)).toBe(
      'Halo SkyNusa, saya ingin sewa Drone Lipat 4K Pro selama 3 hari mulai Sab, 7 Nov 2026 (kembali Sel, 10 Nov 2026). Estimasi biaya Rp1.215.000 setelah potongan 10%. Apakah unitnya tersedia?',
    );
    expect(rentalMessage('SkyNusa', 'Drone Mini', '', rentalQuote(250_000, 1, 3, 10))).toContain('(tanggal menyusul)');
  });

  it('keranjang: tambah menaikkan jumlah (maks. 9), jumlah 0 menghapus, total & pesan WhatsApp bernomor', () => {
    let cart = addToCart([], { id: 'produk:A', name: 'Drone A', kind: 'Drone', priceLabel: 'Rp1.000.000', price: 1_000_000 });
    cart = addToCart(cart, { id: 'produk:A', name: 'Drone A', kind: 'Drone', priceLabel: 'Rp1.000.000', price: 1_000_000 });
    cart = addToCart(cart, { id: 'paket:B', name: 'Hemat B', kind: 'Paket', priceLabel: 'Hubungi kami', price: null });
    expect(cart.map((l) => `${l.id}×${l.qty}`)).toEqual(['produk:A×2', 'paket:B×1']);
    expect(cartTotal(cart)).toEqual({ total: 2_000_000, complete: false });
    expect(cartMessage('SkyNusa', cart)).toBe(
      'Halo SkyNusa, saya ingin memesan:\n1. Drone A × 2 (Rp2.000.000)\n2. Paket Hemat B × 1\nPerkiraan total: mulai Rp2.000.000\nMohon info ketersediaan stok dan cara pembayarannya.',
    );
    expect(setCartQty(cart, 'produk:A', 20)[0].qty).toBe(9);
    expect(setCartQty(cart, 'paket:B', 0).map((l) => l.id)).toEqual(['produk:A']);
  });

  it('ikon & tujuan strip keunggulan dipilih dari judul', () => {
    expect(iconKey('Fotografi & konten udara')).toBe('camera');
    expect(iconKey('Videografi wedding')).toBe('wedding');
    expect(iconKey('Pemetaan lahan')).toBe('map');
    expect(iconKey('Paket bundling')).toBe('bundle');
    expect(iconKey('Garansi servis lokal')).toBe('warranty');
    expect(iconKey('Kelas terbang gratis')).toBe('academy');
    expect(iconKey('Sewa harian')).toBe('rental');
    expect(iconKey('Sesuatu yang lain', 3)).toBe('sparkles');
    const all = () => true;
    expect(featureTarget('Paket bundling', all)).toBe('bundles');
    expect(featureTarget('Garansi servis lokal', all)).toBe('warranty');
    expect(featureTarget('Kelas terbang gratis', all)).toBe('academy');
    expect(featureTarget('Sewa harian', all)).toBe('rental');
    expect(featureTarget('Sewa harian', (key) => key !== 'rental')).toBeNull();
  });
});

describe('SkyNusa: demo', () => {
  it('urutan section, satu h1, hero lembar spesifikasi berfoto dengan kartu angka dan strip keunggulan', () => {
    const container = demo();
    expect(sectionKeys(container)).toEqual(ORDER);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const hero = section(container, 'hero');
    expect(hero.getAttribute('data-hero-layout')).toBe('specsheet');
    const h1 = hero.querySelector('h1')!;
    expect(h1.textContent).toBe('Drone pilihan untuk foto, wedding & pemetaan');
    expect(h1.querySelector('span')?.textContent).toBe('untuk foto, wedding & pemetaan');
    const img = hero.querySelector<HTMLImageElement>('img[fetchpriority="high"]')!;
    expect(img.getAttribute('src')).toBe('/assets/templates/photos/skynusa-hero-1200.webp');
    expect(img.getAttribute('srcset')).toBe('/assets/templates/photos/skynusa-hero-800.webp 800w, /assets/templates/photos/skynusa-hero-1200.webp 1200w');
    expect(img.getAttribute('alt')).toMatch(/drone/i);
    expect(container.querySelectorAll('img[fetchpriority="high"]')).toHaveLength(1);
    expect(Array.from(within(hero).getByRole('list', { name: 'Spesifikasi unggulan' }).querySelectorAll('li')).map((li) => li.querySelector('p')?.textContent)).toEqual([
      '4K/60',
      '34 mnt',
      '±2 cm',
    ]);
    expect(within(hero).getByRole('link', { name: 'Lihat Drone' })).toHaveAttribute('href', '#products');
    expect(within(hero).getByRole('link', { name: 'Sewa Harian' })).toHaveAttribute('href', '#rental');
    const strip = within(hero).getByRole('list', { name: 'Keunggulan toko' });
    expect(Array.from(strip.querySelectorAll('a')).map((a) => a.getAttribute('href'))).toEqual(['#bundles', '#warranty', '#academy', '#rental']);
    expect(hero.querySelector('.sn-wordmark')?.textContent).toBe('SkyNusa');

    const header = container.querySelector('header')!;
    const nav = within(header).getAllByRole('navigation', { name: 'Menu utama' })[0];
    expect(Array.from(nav.querySelectorAll('a')).map((a) => a.textContent)).toEqual(['Drone pilihan', 'Paket bundling', 'Sewa harian', 'Garansi', 'Kelas Terbang', 'Kontak']);
    expect(within(header).getByRole('link', { name: 'Konsultasi' })).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\/6281234567890/));
    expect(within(header).getByRole('button', { name: 'Keranjang, 0 barang' })).toHaveAttribute('aria-expanded', 'false');
    expect(header.querySelector('svg[viewBox="0 0 32 32"]'), 'SkyNusaMark').not.toBeNull();
  });

  it('kategori memfilter daftar drone dan menggulir ke Drone; tombol "Semua" mengembalikan semua produk', () => {
    const container = demo();
    const products = section(container, 'products');
    const grid = () => Array.from(products.querySelectorAll('h3')).map((h) => h.textContent);
    expect(grid()).toEqual(['Drone Mini 249 g', 'Drone Lipat 4K Pro', 'Drone Sinema Dual Kamera', 'Drone Pemetaan RTK']);
    const filters = within(products).getByRole('group', { name: 'Filter kebutuhan' });
    expect(within(filters).getAllByRole('button').map((b) => b.textContent)).toEqual(['Semua', 'Foto', 'Wedding', 'Pemetaan']);

    const categories = section(container, 'categories');
    expect(categories.querySelectorAll('h3')).toHaveLength(3);
    const wedding = within(categories).getByRole('link', { name: /^Lihat drone wedding: Videografi wedding$/ });
    expect(wedding).toHaveAttribute('href', '#products');
    expect(within(categories).queryByRole('button')).toBeNull();
    fireEvent.click(wedding);
    expect(scrolled).toEqual(['products']);
    expect(grid()).toEqual(['Drone Lipat 4K Pro', 'Drone Sinema Dual Kamera']);
    expect(within(filters).getByRole('button', { name: 'Wedding' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(within(filters).getByRole('button', { name: 'Pemetaan' }));
    expect(grid()).toEqual(['Drone Pemetaan RTK']);
    fireEvent.click(within(filters).getByRole('button', { name: 'Semua' }));
    expect(grid()).toHaveLength(4);
    // Foto produk lazy dengan srcset; harga coret + chip hemat
    for (const img of products.querySelectorAll('img')) expect(img.getAttribute('loading')).toBe('lazy');
    expect(products.textContent).toContain('Hemat Rp1.000.000');
    const ask = within(products).getByRole('link', { name: 'Tanya stok Drone Mini 249 g' });
    expect(decodeURIComponent(ask.getAttribute('href') ?? '')).toContain('Halo SkyNusa, saya ingin bertanya tentang stok Drone Mini 249 g.');
  });

  it('keranjang demo: tambah produk & paket, ubah jumlah, total, kirim pesanan ke WhatsApp, Esc menutup', () => {
    const container = demo();
    const header = container.querySelector('header')!;
    fireEvent.click(within(section(container, 'products')).getByRole('button', { name: 'Tambah Drone Lipat 4K Pro ke keranjang' }));
    fireEvent.click(within(section(container, 'products')).getByRole('button', { name: 'Tambah Drone Lipat 4K Pro ke keranjang' }));
    fireEvent.click(within(section(container, 'bundles')).getByRole('button', { name: 'Tambah Paket Wedding ke keranjang' }));
    expect(container.querySelector('[data-sn-announce]')?.textContent).toBe('Paket Wedding ditambahkan ke keranjang. Isi keranjang: 3 barang.');

    const toggle = within(header).getByRole('button', { name: 'Keranjang, 3 barang' });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const panel = document.getElementById(toggle.getAttribute('aria-controls')!)!;
    const lines = within(panel).getByRole('list', { name: 'Isi keranjang' });
    expect(lines.querySelectorAll('li')).toHaveLength(2);
    expect(panel.textContent).toContain('Rp41.700.000');
    fireEvent.click(within(panel).getByRole('button', { name: 'Kurangi Drone Lipat 4K Pro' }));
    expect(panel.textContent).toContain('Rp28.800.000');
    const send = within(panel).getByRole('link', { name: /Kirim Pesanan via WhatsApp/ });
    const message = decodeURIComponent(send.getAttribute('href') ?? '');
    expect(message).toContain('https://wa.me/6281234567890?text=Halo SkyNusa, saya ingin memesan:');
    expect(message).toContain('1. Drone Lipat 4K Pro × 1 (Rp12.900.000)');
    expect(message).toContain('2. Paket Wedding × 1 (Rp15.900.000)');
    fireEvent.click(within(panel).getByRole('button', { name: 'Hapus Paket Wedding' }));
    expect(within(header).getByRole('button', { name: 'Keranjang, 1 barang' })).toBeInTheDocument();
    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });
    expect(document.getElementById(toggle.getAttribute('aria-controls')!)).toBeNull();
    expect(toggle).toHaveFocus();
  });

  it('keranjang kosong menampilkan ajakan ke daftar drone', () => {
    const container = demo();
    const header = container.querySelector('header')!;
    fireEvent.click(within(header).getByRole('button', { name: 'Keranjang, 0 barang' }));
    expect(header.textContent).toContain('Keranjang masih kosong.');
    expect(within(header).getByRole('link', { name: /Lihat drone/ })).toHaveAttribute('href', '#products');
  });

  it('fokus kembali ke tombol pembuka saat keranjang/menu ditutup, dan tidak jatuh ke <body> saat baris dihapus atau dikosongkan', () => {
    const container = demo();
    const header = container.querySelector('header')!;
    const products = section(container, 'products');
    const addMini = () => fireEvent.click(within(products).getByRole('button', { name: 'Tambah Drone Mini 249 g ke keranjang' }));
    addMini();
    const toggle = within(header).getByRole('button', { name: 'Keranjang, 1 barang' });
    fireEvent.click(toggle);
    fireEvent.click(within(header).getByRole('button', { name: 'Tutup keranjang' }));
    expect(document.getElementById(toggle.getAttribute('aria-controls')!)).toBeNull();
    expect(toggle).toHaveFocus();

    fireEvent.click(toggle);
    const panel = document.getElementById(toggle.getAttribute('aria-controls')!)!;
    // Jumlah dibaca lewat teks tersembunyi (bukan aria-label pada <span>)
    expect(panel.querySelector('span[aria-label]')).toBeNull();
    expect(within(panel).getByText('Jumlah Drone Mini 249 g:', { exact: false })).toHaveClass('sr-only');
    fireEvent.click(within(panel).getByRole('button', { name: 'Hapus Drone Mini 249 g' }));
    expect(within(header).getByRole('button', { name: 'Tutup keranjang' })).toHaveFocus();
    expect(container.querySelector('[data-sn-announce]')?.textContent).toBe('Drone Mini 249 g dihapus dari keranjang. Isi keranjang: 0 barang.');

    addMini();
    addMini();
    fireEvent.click(within(panel).getByRole('button', { name: 'Kurangi Drone Mini 249 g' }));
    expect(container.querySelector('[data-sn-announce]')?.textContent).toBe('Jumlah Drone Mini 249 g: 1. Isi keranjang: 1 barang.');
    fireEvent.click(within(header).getByRole('button', { name: 'Kosongkan' }));
    expect(within(header).getByRole('button', { name: 'Tutup keranjang' })).toHaveFocus();
    expect(container.querySelector('[data-sn-announce]')?.textContent).toBe('Keranjang dikosongkan. Isi keranjang: 0 barang.');

    const menuButton = within(header).getByRole('button', { name: 'Buka menu' });
    fireEvent.click(menuButton);
    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });
    expect(menuButton).toHaveFocus();
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('barang 9 unit: tombol Tambah nonaktif "Maks. 9", tanpa pengumuman "ditambahkan" palsu', () => {
    const container = demo();
    const add = within(section(container, 'products')).getByRole('button', { name: 'Tambah Drone Mini 249 g ke keranjang' });
    for (let i = 0; i < 9; i += 1) fireEvent.click(add);
    expect(add).toBeDisabled();
    expect(add).toHaveAccessibleName('Drone Mini 249 g: sudah 9 unit di keranjang (maksimal)');
    expect(add.textContent).toBe('Maks. 9');
    expect(container.querySelector('[data-sn-announce]')?.textContent).toBe('Drone Mini 249 g ditambahkan ke keranjang. Isi keranjang: 9 barang.');
    fireEvent.click(add);
    expect(within(container.querySelector('header')!).getByRole('button', { name: 'Keranjang, 9 barang' })).toBeInTheDocument();
  });

  it('kalkulator sewa: tanggal lampau tidak dipakai (petunjuk + aria-invalid), pesan WhatsApp tanpa tanggal itu', async () => {
    const rental = section(demo(), 'rental');
    // "Hari ini" dihitung setelah tampil (hasil prerender tetap sama)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    const input = within(rental).getByLabelText('2 · Tanggal mulai');
    expect(input).toHaveAttribute('min', isoDate(new Date()));
    fireEvent.change(input, { target: { value: '2024-01-15' } });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Pilih tanggal mulai hari ini atau sesudahnya.');
    expect(rental.textContent).not.toContain('Jan 2024');
    expect(rental.textContent).toContain('Pilih tanggal mulai untuk melihat tanggal kembali.');
    const ask = within(rental).getByRole('link', { name: /Ajukan Sewa via WhatsApp/ });
    const message = decodeURIComponent(ask.getAttribute('href') ?? '');
    expect(message).toContain('(tanggal menyusul)');
    expect(message).not.toContain('2024');
    fireEvent.change(input, { target: { value: addDaysIso(isoDate(new Date()), 2) } });
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(rental.textContent).toContain(`Ambil ${formatDateId(addDaysIso(isoDate(new Date()), 2))}`);
  });

  it('unit sewa tanpa tarif terbaca: tanpa "Rp0" dan tanpa "/hari", tarif dikonfirmasi lewat WhatsApp', () => {
    const rental = section(demo({ rental: { items: [{ name: 'Drone Inspeksi', price: 'Hubungi kami', note: '' }] } }), 'rental');
    expect(rental.textContent).toContain('Tarif unit ini dikonfirmasi lewat WhatsApp.');
    expect(rental.textContent).toContain('Hubungi kami');
    expect(rental.textContent).not.toContain('Rp0');
    expect(rental.textContent).not.toContain('/hari');
    expect(rental.textContent).not.toContain('Estimasi total');
    expect(rental.textContent).not.toContain('hemat 10%');
  });

  it('paket gelap: 3 paket, paket berlabel menonjol, hemat dari harga satuan, isi per baris, tanya paket ke WhatsApp', () => {
    const bundles = section(demo(), 'bundles');
    expect(bundles.getAttribute('data-tpl-tone')).toBe('inverse');
    const cards = Array.from(bundles.querySelector('ul')!.children) as HTMLElement[];
    expect(cards).toHaveLength(3);
    expect(cards[1].className).toContain('sn-featured');
    expect(cards[1].textContent).toContain('Paling diminati');
    expect(cards[1].textContent).toContain('Hemat Rp1.350.000');
    expect(within(cards[1]).getByRole('list', { name: 'Isi Paket Wedding' }).querySelectorAll('li')).toHaveLength(5);
    expect(decodeURIComponent(within(cards[0]).getByRole('link', { name: 'Tanya Paket Pemula' }).getAttribute('href') ?? '')).toContain('paket Paket Pemula');
  });

  it('kalkulator sewa: pilih unit, tambah hari sampai dapat potongan, tanggal kembali, pesan WhatsApp berisi rincian', () => {
    const rental = section(demo(), 'rental');
    expect(within(rental).getAllByRole('radio')).toHaveLength(3);
    expect(rental.textContent).toContain('Rp250.000/hari');
    fireEvent.click(within(rental).getByRole('radio', { name: /Drone Lipat 4K Pro/ }));
    const plus = within(rental).getByRole('button', { name: 'Tambah satu hari' });
    expect(within(rental).getByRole('button', { name: 'Kurangi satu hari' })).toBeDisabled();
    expect(rental.textContent).toContain('Sewa 3 hari atau lebih hemat 10%.');
    fireEvent.click(plus);
    fireEvent.click(plus);
    expect(rental.querySelector('output')?.textContent).toBe('3 hari');
    expect(rental.textContent).toContain('Potongan 10%');
    expect(rental.textContent).toContain('Rp1.215.000');
    fireEvent.change(within(rental).getByLabelText('2 · Tanggal mulai'), { target: { value: '2026-11-07' } });
    expect(rental.textContent).toContain('Ambil Sab, 7 Nov 2026 · kembali Sel, 10 Nov 2026');
    const ask = within(rental).getByRole('link', { name: /Ajukan Sewa via WhatsApp/ });
    expect(decodeURIComponent(ask.getAttribute('href') ?? '')).toContain('saya ingin sewa Drone Lipat 4K Pro selama 3 hari mulai Sab, 7 Nov 2026');
    for (let i = 0; i < 40; i += 1) fireEvent.click(plus);
    expect(rental.querySelector('output')?.textContent).toBe('30 hari');
    expect(plus).toBeDisabled();
  });

  it('servis lokal, kelas terbang, cerita pelanggan, FAQ accordion, ajakan, kontak, footer', () => {
    const container = demo();
    const warranty = section(container, 'warranty');
    expect(warranty.querySelectorAll('dl > div')).toHaveLength(4);
    expect(warranty.textContent).toContain('12 bln');
    expect(decodeURIComponent(within(warranty).getByRole('link', { name: 'Klaim Garansi' }).getAttribute('href') ?? '')).toContain('klaim garansi servis');

    const academy = section(container, 'academy');
    expect(academy.querySelectorAll('ol > li')).toHaveLength(4);
    expect(academy.textContent).toContain('Gratis untuk pembeli');
    expect(decodeURIComponent(within(academy).getByRole('link', { name: 'Daftar Kelas' }).getAttribute('href') ?? '')).toContain('kelas terbang');

    const stories = section(container, 'testimonials');
    expect(stories.querySelectorAll('blockquote')).toHaveLength(3);
    for (const img of stories.querySelectorAll('img')) expect(img.getAttribute('srcset')).toContain('-240.webp 240w');

    const faq = section(container, 'faq');
    const buttons = within(faq).getAllByRole('button');
    expect(buttons).toHaveLength(6);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(buttons[4]);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById(buttons[4].getAttribute('aria-controls')!)).not.toHaveAttribute('inert');

    const cta = section(container, 'cta');
    expect(within(cta).getByRole('link', { name: 'Lihat Sewa Harian' })).toHaveAttribute('href', '#rental');
    expect(within(cta).getByRole('link', { name: /Konsultasi via WhatsApp/ })).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\//));

    const contact = section(container, 'contact');
    expect(within(contact).getByRole('link', { name: /WhatsApp 081234567890/ })).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\//));
    expect(contact.querySelector('iframe[title="Peta lokasi SkyNusa"]')).not.toBeNull();

    const footer = container.querySelector('footer')!;
    expect(within(footer).getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://instagram.com/skynusa.id');
    expect(within(footer).getByRole('navigation', { name: 'Tautan footer' }).querySelectorAll('a')).toHaveLength(6);
    expect(footer.textContent).toContain(`© ${new Date().getFullYear()} SkyNusa. Semua hak dilindungi.`);
  });

  it('datar: tidak ada kelas shadow di kode template', () => {
    const container = demo();
    const shadows = Array.from(container.querySelectorAll('[class*="shadow"]')).filter((el) => !el.closest('[aria-label="Chat WhatsApp"]') && !/Chat WhatsApp/.test(el.getAttribute('aria-label') ?? ''));
    expect(shadows.map((el) => el.className)).toEqual([]);
  });
});

describe('SkyNusa: SEO situs pembeli', () => {
  it('judul tab & meta description bawaan terbaca sebagai toko drone (siteHead dari tagline & deskripsi hero)', () => {
    expect(siteTitle('skynusa', null)).toBe('SkyNusa — Toko Drone, Servis & Sewa Drone Jakarta');
    const restore = applySiteHead('skynusa', null);
    expect(document.title).toBe('SkyNusa — Toko Drone, Servis & Sewa Drone Jakarta');
    const description = document.head.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
    expect(description).toMatch(/^Toko drone di Jakarta: paket hemat drone/);
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(200);
    restore();
  });

  it('satu H1, lalu tiap section diawali H2 dan H3 hanya di bawah H2 (urutan logis)', () => {
    const container = demo();
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelectorAll('h4, h5, h6')).toHaveLength(0);
    for (const key of ORDER.filter((k) => k !== 'hero')) {
      const levels = Array.from(section(container, key).querySelectorAll('h1, h2, h3')).map((h) => h.tagName);
      expect(levels[0], key).toBe('H2');
      expect(levels.filter((l) => l === 'H2'), key).toHaveLength(1);
    }
    expect(section(container, 'hero').querySelector('h1 ~ h2, h2')).toBeNull();
  });

  it('gambar: alt deskriptif berbahasa Indonesia, ukuran tetap (width/height), srcset; hanya foto hero yang eager', () => {
    const container = demo();
    const imgs = Array.from(container.querySelectorAll('img'));
    expect(imgs.length).toBeGreaterThan(10);
    for (const img of imgs) {
      const src = img.getAttribute('src') ?? '';
      expect(img.hasAttribute('alt'), src).toBe(true);
      expect(Number(img.getAttribute('width')), src).toBeGreaterThan(0);
      expect(Number(img.getAttribute('height')), src).toBeGreaterThan(0);
      expect(img.getAttribute('srcset'), src).toMatch(/ (800|240)w, /);
      expect(img.getAttribute('sizes'), src).toBeTruthy();
      // Alt kosong hanya untuk latar ajakan (dekoratif) dan avatar di samping nama
      const decorative = !!img.closest('[data-tpl-section="cta"]') || img.className.includes('rounded-full');
      if (!decorative) expect(img.getAttribute('alt')!.split(' ').length, src).toBeGreaterThanOrEqual(5);
    }
    const eager = imgs.filter((img) => img.getAttribute('loading') !== 'lazy');
    expect(eager.map((img) => img.getAttribute('src'))).toEqual(['/assets/templates/photos/skynusa-hero-1200.webp']);
    expect(eager[0]).toHaveAttribute('fetchpriority', 'high');
  });

  it('tautan asli untuk navigasi, tombol hanya untuk aksi; SVG dekoratif tersembunyi dari pembaca layar', () => {
    const container = demo();
    for (const a of container.querySelectorAll('a')) expect(a.getAttribute('href'), a.textContent ?? '').toMatch(/^(#[a-z]|https:\/\/|mailto:|tel:)/);
    for (const button of container.querySelectorAll('button')) expect(button.getAttribute('type'), button.textContent ?? '').toBe('button');
    for (const svg of container.querySelectorAll('svg')) expect(svg.closest('[aria-hidden="true"], [aria-hidden=""]') ?? svg.getAttribute('aria-hidden'), svg.outerHTML.slice(0, 60)).toBeTruthy();
  });
});

describe('SkyNusa: konten opsional kosong', () => {
  it('toko khusus sewa (Drone & Paket disembunyikan): tanpa tombol, panel, dan pengumuman keranjang', () => {
    const container = demo({ products: { enabled: false }, bundles: { enabled: false } });
    const header = container.querySelector('header')!;
    expect(within(header).queryByRole('button', { name: /Keranjang/ })).toBeNull();
    expect(container.querySelector('[data-sn-announce]')).toBeNull();
    expect(section(container, 'rental')).not.toBeNull();
    // Satu bagian saja sudah cukup untuk menampilkan keranjang
    cleanup();
    const withBundles = demo({ products: { enabled: false } });
    expect(within(withBundles.querySelector('header')!).getByRole('button', { name: 'Keranjang, 0 barang' })).toBeInTheDocument();
  });

  it('hero tanpa foto → panggung abu dengan ikon drone tanpa img; tanpa spesifikasi & keunggulan → disembunyikan', () => {
    const hero = section(demo({ hero: { image: '', specs: [], features: [] } }), 'hero');
    expect(hero.querySelector('img')).toBeNull();
    expect(hero.querySelector('.sn-hero-fallback')).not.toBeNull();
    expect(within(hero).queryByRole('list', { name: 'Spesifikasi unggulan' })).toBeNull();
    expect(within(hero).queryByRole('list', { name: 'Keunggulan toko' })).toBeNull();
    expect(within(hero).getByRole('link', { name: 'Lihat Drone' })).toBeInTheDocument();
  });

  it('tanpa WhatsApp → tombol ke Kontak; tanpa Sewa → tombol kedua hero hilang; produk tanpa kategori → tanpa filter', () => {
    const container = demo({ contact: { whatsapp: '' }, rental: { enabled: false }, categories: { enabled: false } });
    const hero = section(container, 'hero');
    expect(within(hero).queryByRole('link', { name: 'Sewa Harian' })).toBeNull();
    const header = container.querySelector('header')!;
    expect(within(header).getByRole('link', { name: 'Konsultasi' })).toHaveAttribute('href', '#kontak');
    const products = section(container, 'products');
    expect(within(products).queryByRole('group', { name: 'Filter kebutuhan' })).toBeNull();
    expect(within(products).getByRole('link', { name: 'Tanya stok Drone Mini 249 g' })).toHaveAttribute('href', '#kontak');
    fireEvent.click(within(products).getByRole('button', { name: 'Tambah Drone Mini 249 g ke keranjang' }));
    fireEvent.click(within(header).getByRole('button', { name: 'Keranjang, 1 barang' }));
    expect(within(header).getByRole('link', { name: /Hubungi Kami/ })).toHaveAttribute('href', '#kontak');
  });

  it('produk tanpa gambar → ikon drone; tanpa harga coret → tanpa chip hemat; kategori tanpa produk berlabel → tanya WhatsApp', () => {
    const container = demo({
      products: { items: [{ name: 'Drone Inspeksi', use: 'Inspeksi', price: 'Rp30.000.000', image: '' }] },
      categories: { items: [{ title: 'Inspeksi atap', tag: 'Atap', description: 'Cek atap gedung.' }] },
    });
    const products = section(container, 'products');
    expect(products.querySelector('img')).toBeNull();
    expect(products.textContent).not.toContain('Hemat');
    const categories = section(container, 'categories');
    const ask = within(categories).getByRole('link', { name: /Inspeksi atap/ });
    expect(ask).toHaveAccessibleName('Tanya rekomendasi: Inspeksi atap');
    expect(decodeURIComponent(ask.getAttribute('href') ?? '')).toContain('drone untuk inspeksi atap');
  });
});

describe('SkyNusa: pratinjau CMS', () => {
  it('pratinjau diam (gerak mati bila Component dirender langsung) dan tanpa tautan wa.me', () => {
    const { container } = render(<def.Component content={resolveContent(def, null)} preview />);
    expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'off');
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    expect(container.querySelector('a[href^="https://instagram.com"]')).toBeNull();
  });
});

describe('SkyNusa: editor CMS', () => {
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
  }, 30_000);
});

describe('SkyNusa: data katalog', () => {
  const sql = (file: string) => readFileSync(resolve(ROOT, file), 'utf8');

  it.each(['database/seed.templates.sql', 'database/migrations/2026-10-25_019_skynusa_template.sql'])(
    '%s: baris skynusa dengan template_code, kategori, harga, urutan, dan pratinjau tangkapan layar .webp',
    (file) => {
      const text = sql(file);
      expect(text).toContain("'skynusa'");
      expect(text).toContain("'Toko Online'");
      expect(text).toContain('1590000.00');
      expect(text).toContain("'/assets/templates/skynusa-preview.webp'");
      expect(text).toContain('\'["/assets/templates/skynusa-1.webp","/assets/templates/skynusa-2.webp"]\'');
    },
  );

  it('teks katalog (migrasi 019 & baris seed yang sama) tanpa janji "garansi", sesuai aturan salinan halaman', () => {
    const migration = sql('database/migrations/2026-10-25_019_skynusa_template.sql').replace(/^--.*$/gm, '');
    const seed = sql('database/seed.templates.sql');
    const row = seed.slice(seed.indexOf("('skynusa',"), seed.indexOf("'skynusa', NULL, 'published', 7)"));
    expect(row.length).toBeGreaterThan(500);
    for (const text of [migration, row]) {
      expect(text).not.toMatch(/\b(dijamin|garansi|terbaik nomor|rating \d|bintang \d)\b/i);
      expect(text).toContain('layanan servis lokal');
    }
  });

  it('migrasi 019 aman diulang (INSERT IGNORE + UPDATE berdasarkan slug, tanpa DELETE) dan tercatat di schema_migrations', () => {
    // Tanpa komentar SQL (komentar kepala menyebut "Tidak ada DELETE")
    const text = sql('database/migrations/2026-10-25_019_skynusa_template.sql').replace(/^--.*$/gm, '');
    expect(text).toMatch(/INSERT IGNORE INTO templates/);
    expect(text).toMatch(/WHERE slug = 'skynusa';/);
    expect(text).toMatch(/sort_order\s+= 7/);
    expect(text).not.toMatch(/\bDELETE\b/);
    expect(text).toContain("VALUES ('2026-10-25_019', 'templates: katalog SkyNusa')");
  });

  it('gambar pratinjau katalog ada di public/, 1600×1000, dan ringan', () => {
    for (const name of ['skynusa-preview', 'skynusa-1', 'skynusa-2']) {
      const path = resolve(ROOT, `public/assets/templates/${name}.webp`);
      expect(existsSync(path), name).toBe(true);
      const kb = statSync(path).size / 1024;
      expect(kb, name).toBeGreaterThan(10);
      expect(kb, name).toBeLessThan(220);
      // Ukuran dari header WebP: "VP8 " (lossy) 14 bit di byte 26 & 28; "VP8X" lebar-1 & tinggi-1 24 bit di byte 24 & 27
      const head = readFileSync(path).subarray(0, 30);
      const chunk = head.toString('ascii', 12, 16);
      const size = chunk === 'VP8X' ? [head.readUIntLE(24, 3) + 1, head.readUIntLE(27, 3) + 1] : [head.readUInt16LE(26) & 0x3fff, head.readUInt16LE(28) & 0x3fff];
      expect(['VP8 ', 'VP8X'], name).toContain(chunk);
      expect(size, name).toEqual([1600, 1000]);
    }
  });
});

describe('SkyNusa: konten aneh', () => {
  it('angka, null, dan string di tempat list tidak membuat crash', () => {
    const weird = {
      hero: { features: 'x', specs: [null, { value: 7 }], highlight: 'tidak ada di judul', primary_url: 'javascript:alert(1)' },
      categories: { items: [{ title: 1 }, null, 'x'] },
      products: { items: [{ name: 3, price: 4, use: 5, specs: 6 }] },
      bundles: { items: [{ name: 2, contents: null, badge: 5 }] },
      rental: { items: [{ name: 'Unit', price: 'gratis' }], discount_days: 'x', discount_percent: null },
      warranty: { stats: 'x' },
      academy: { sessions: [{ title: 2 }] },
      faq: { items: [{ question: 2, answer: null }] },
      brand: { accent_color: 'hijau' },
    } as unknown as SiteContent;
    const { container } = render(<def.Component content={resolveContent(def, weird)} />);
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
    expect(section(container, 'rental').textContent).toContain('Tarif unit ini dikonfirmasi lewat WhatsApp.');
  });
});
