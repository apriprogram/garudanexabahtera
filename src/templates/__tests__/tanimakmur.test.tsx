// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/tanimakmur.test.tsx
// TaniMakmur (template toko pertanian 2026-10-25): skema CMS & konten demo, helper model (warna aksen di krem & hijau
// tua, menu, pencarian, harga & hemat, isi paket, jadwal tanam, kategori produk, ikon otomatis), demo (urutan section,
// hero ladang dengan menu transparan, foto bulat + lingkaran ajakan, kartu angka, strip keunggulan, kategori → filter
// produk, pilih tanamanmu, produk terlaris, konsultasi, panduan, testimoni, FAQ, kontak, footer), pencarian di menu,
// konten opsional kosong, pratinjau CMS diam, editor CMS, data katalog (migrasi 020 + seed + gambar pratinjau), dan
// konten aneh. SEO situs demo (situs calon pembeli): judul & meta default, satu H1 dan urutan heading, alt semua gambar,
// SVG dekoratif tersembunyi, tautan asli, hero eager + fetchpriority, sisanya lazy dengan srcset/sizes/width/height.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionEditor } from '../../pages/account/cms/SectionEditor';
import { validateContent } from '../../pages/account/cms/validation';
import { TEMPLATES, resolveContent } from '../index';
import { SiteRenderer } from '../SiteRenderer';
import { applySiteHead, siteTitle } from '../siteHead';
import { contrast, parseHex } from '../shared/utils';
import { cropKey, iconKey } from '../tanimakmur/icons';
import {
  bundleLines,
  filterProducts,
  formatRating,
  formatRupiah,
  matchCategory,
  navItems,
  parseRating,
  parseRupiah,
  productCategories,
  savings,
  searchEntries,
  searchFilter,
  stageLines,
  taniVars,
} from '../tanimakmur/model';
import { TANI_PHOTOS } from '../tanimakmur/photos';
import { COLOR } from '../tanimakmur/styles';
import { isListField, type SiteContent } from '../types';

const ROOT = process.cwd();
const def = TEMPLATES.tanimakmur;
const ORDER = ['hero', 'categories', 'bundles', 'products', 'consult', 'tips', 'testimonials', 'faq', 'contact'];
const sectionKeys = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-tpl-section]')).map((s) => s.getAttribute('data-tpl-section'));
const section = (root: HTMLElement, key: string) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`)!;
const demo = (content: unknown = null, preview = false) => render(<SiteRenderer templateCode="tanimakmur" content={content} preview={preview} />).container;
const rgb = (hex: string) => parseHex(hex)!;
const publicFile = (url: string) => resolve(ROOT, 'public', url.replace(/^\//, ''));
const href = (el: Element) => decodeURIComponent(el.getAttribute('href') ?? '');
const productNames = (root: HTMLElement) => Array.from(section(root, 'products').querySelectorAll('h3')).map((h) => h.textContent);

// Render demo penuh (9 section, 29 foto) bisa > 5 dtk saat seluruh suite berjalan paralel
const RENDER = { timeout: 20_000 };

let scrolled: (string | null)[] = [];
beforeEach(() => {
  scrolled = [];
  Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
    scrolled.push(this.getAttribute('data-tpl-section'));
  });
});
afterEach(cleanup);

describe('TaniMakmur: skema & konten bawaan', () => {
  it('urutan form = urutan halaman, section baru berkunci Inggris pendek, field unik, list berbatas', () => {
    expect(def.code).toBe('tanimakmur');
    expect(def.name).toBe('TaniMakmur');
    expect(def.sections.map((s) => s.key)).toEqual(['brand', ...ORDER, 'footer']);
    const fields = (key: string) => def.sections.find((s) => s.key === key)!.fields.map((f) => f.key);
    expect(fields('brand')).toEqual(['company_name', 'tagline', 'logo', 'accent_color']);
    expect(fields('hero')).toEqual(
      expect.arrayContaining(['image', 'spot_image', 'card_image', 'card_quote', 'card_name', 'stats_label', 'stats', 'ticker', 'header_label', 'header_url']),
    );
    expect(fields('categories')).toEqual(['eyebrow', 'title', 'subtitle', 'items']);
    expect(fields('bundles')).toEqual(['eyebrow', 'title', 'highlight', 'subtitle', 'note', 'items']);
    const bundleItem = def.sections.find((s) => s.key === 'bundles')!.fields.find(isListField)!;
    expect(bundleItem.fields.map((f) => f.key)).toEqual(
      expect.arrayContaining(['crop', 'title', 'image', 'level', 'harvest', 'place', 'contents', 'stages', 'price', 'compare_price', 'button_label', 'button_url']),
    );
    expect(fields('products')).toEqual(['eyebrow', 'title', 'subtitle', 'button_label', 'button_url', 'items']);
    expect(fields('consult')).toEqual(expect.arrayContaining(['image', 'chat_question', 'chat_answer', 'steps', 'experts', 'hours', 'wa_message']));
    expect(fields('contact')).toEqual(expect.arrayContaining(['whatsapp', 'whatsapp_message', 'shipping', 'maps_url']));
    const logo = def.sections[0].fields.find((f) => f.key === 'logo');
    expect(logo && 'help' in logo ? logo.help : '').toMatch(/simbol tunas/);
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
    expect(c.hero.image).toBe('/assets/templates/photos/tanimakmur-hero-1920.webp');
    const photos = JSON.stringify(c).match(/\/assets\/templates\/photos\/[a-z0-9-]+\.webp/g) ?? [];
    expect(photos.length).toBeGreaterThanOrEqual(29);
    for (const src of photos) expect(TANI_PHOTOS.asset(src), src).not.toBeNull();
    const credits = readFileSync(resolve(ROOT, 'public/assets/templates/photos/CREDITS.md'), 'utf8');
    for (const key of TANI_PHOTOS.keys) {
      const asset = TANI_PHOTOS.asset(TANI_PHOTOS.src(key))!;
      const urls = [asset.src, ...asset.srcSet!.split(',').map((part) => part.trim().split(' ')[0])];
      for (const url of urls) expect(existsSync(publicFile(url)), url).toBe(true);
      expect(credits, key).toContain(`\`${key}-*\``);
      expect(photos, `${key} dipakai di konten demo`).toContain(TANI_PHOTOS.src(key));
    }
    expect(existsSync(publicFile('/assets/templates/logos/tanimakmur-mark.svg'))).toBe(true);
  });

  it('foto demo ringan: hero ≤ 200 KB, foto lain ≤ 130 KB, varian kecil ≤ 90 KB', () => {
    for (const key of TANI_PHOTOS.keys) {
      const asset = TANI_PHOTOS.asset(TANI_PHOTOS.src(key))!;
      const big = statSync(publicFile(asset.src)).size / 1024;
      expect(big, asset.src).toBeLessThanOrEqual(key === 'tanimakmur-hero' ? 200 : 130);
      const small = asset.srcSet!.split(',')[0].trim().split(' ')[0];
      expect(statSync(publicFile(small)).size / 1024, small).toBeLessThanOrEqual(90);
    }
  });

  it('salinan demo jujur: tanpa janji panen/aman mutlak, pestisida sesuai label, panen ditulis perkiraan', () => {
    const c = def.defaultContent;
    // Pertanyaan FAQ boleh menyebut "pasti tumbuh" (yang ditanyakan pembeli); jawabannya tidak boleh menjanjikan
    const text = JSON.stringify({ ...c, faq: { ...c.faq, items: (c.faq.items as { answer: string }[]).map((i) => i.answer) } });
    expect(text).not.toMatch(/dijamin|garansi|100% aman|pasti (tumbuh|panen|berhasil)|bebas hama|menyembuhkan|panen melimpah/i);
    expect(text).toMatch(/sesuai dosis di label/);
    expect(text).toMatch(/daya tumbuh juga dipengaruhi/);
    for (const item of c.bundles.items as { harvest: string }[]) expect(item.harvest).toMatch(/±/);
  });

  it('harga paket demo = jumlah isi paket (harga normal), dan selisihnya jadi "Hemat"', () => {
    for (const item of def.defaultContent.bundles.items as Record<string, string>[]) {
      const sum = bundleLines(item.contents).reduce((total, line) => total + (parseRupiah(line.price) ?? 0), 0);
      expect(formatRupiah(sum), item.title).toBe(item.compare_price);
      expect(savings(item.price, item.compare_price), item.title).not.toBe('');
    }
  });
});

describe('TaniMakmur: helper model', () => {
  it('warna tetap terbaca: teks krem/putih ≥ 4,5:1, putih di hijau tua ≥ 7:1', () => {
    const cream = rgb(COLOR.cream);
    const white = rgb('#ffffff');
    expect(contrast(rgb(COLOR.muted), cream)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(rgb(COLOR.muted), white)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(rgb(COLOR.ink), cream)).toBeGreaterThanOrEqual(12);
    expect(contrast(white, rgb(COLOR.forest))).toBeGreaterThanOrEqual(7);
    expect(contrast(white, rgb(COLOR.deep))).toBeGreaterThanOrEqual(7);
  });

  it('warna aksen: --tm-glow ≥ 4,5:1 di hijau tua, --tm-ink ≥ 4,5:1 di krem, warna tidak valid → bawaan', () => {
    for (const accent of ['#F4C534', '#1E3A16', '#000000', '#FFFFFF', '#ff0000', '#8DC63F']) {
      const vars = taniVars(accent) as Record<string, string>;
      expect(contrast(rgb(vars['--tm-glow']), rgb(COLOR.forest)), accent).toBeGreaterThanOrEqual(4.5);
      expect(contrast(rgb(vars['--tm-ink']), rgb(COLOR.cream)), accent).toBeGreaterThanOrEqual(4.5);
    }
    expect(taniVars('bukan warna')).toEqual(taniVars('#F4C534'));
  });

  it('menu mengikuti section yang tampil; label singkat dari label section', () => {
    const content = resolveContent(def, null);
    expect(navItems(content).map((i) => i.label)).toEqual(['Kategori', 'Paket Tanam', 'Terlaris', 'Konsultasi', 'Panduan', 'Kontak']);
    const edited = resolveContent(def, { tips: { enabled: false }, bundles: { items: [] }, products: { eyebrow: 'Produk paling laris bulan ini' } });
    expect(navItems(edited).map((i) => i.key)).toEqual(['categories', 'products', 'consult', 'contact']);
    expect(navItems(edited)[1].label).toBe('Terlaris');
  });

  it('pencarian halaman: kategori, paket, produk, panduan, FAQ; semua kata harus cocok; tanpa diakritik', () => {
    const content = resolveContent(def, null);
    const entries = searchEntries(content, navItems(content));
    expect(entries.find((e) => e.label === 'Pupuk NPK 16-16-16')).toEqual({ label: 'Pupuk NPK 16-16-16', group: 'Terlaris', target: 'products' });
    expect(entries.find((e) => e.label === 'Starter Kit Hidroponik Sayur Daun')?.target).toBe('bundles');
    expect(entries.find((e) => e.label === 'Pestisida Organik')?.target).toBe('categories');
    expect(entries.some((e) => e.target === 'faq' && /balkon/.test(e.label))).toBe(true);
    expect(searchFilter(entries, 'kompos').map((e) => `${e.label}|${e.group}`)).toEqual(['Pupuk Kompos Organik|Terlaris', 'Membuat kompos dari sisa dapur|Panduan']);
    expect(searchFilter(entries, 'paket cabai').map((e) => e.label)).toEqual(['Paket Cabai Rawit dalam Pot']);
    expect(searchFilter(entries, 'HÍDROPONIK').map((e) => e.label)).toContain('Tower Hidroponik 24 Lubang');
    expect(searchFilter(entries, '   ')).toEqual([]);
    expect(searchFilter(entries, 'traktor')).toEqual([]);
  });

  it('harga rupiah, hemat, dan rating', () => {
    expect(parseRupiah('Rp105.000')).toBe(105000);
    expect(parseRupiah('rp 1.250.000,-')).toBe(1250000);
    expect(parseRupiah('Rp 99.500,50')).toBe(99500);
    expect(parseRupiah('Gratis')).toBe(0);
    expect(parseRupiah('')).toBeNull();
    expect(parseRupiah('hubungi kami')).toBeNull();
    expect(formatRupiah(14000)).toBe('Rp14.000');
    expect(formatRupiah(1250000)).toBe('Rp1.250.000');
    expect(savings('Rp105.000', 'Rp119.000')).toBe('Rp14.000');
    expect(savings('Rp100.000', 'Rp90.000')).toBe('');
    expect(savings('', 'Rp90.000')).toBe('');
    expect(parseRating('4,9')).toBe(4.9);
    expect(parseRating('5')).toBe(5);
    expect(parseRating('7')).toBe(5);
    expect(parseRating('0')).toBeNull();
    expect(parseRating('bagus')).toBeNull();
    expect(formatRating(4.9)).toBe('4,9');
    expect(formatRating(5)).toBe('5');
  });

  it('isi paket per baris (harga setelah |), jadwal tanam berurutan (maks. 6, baris tanpa angka dibuang)', () => {
    expect(bundleLines('- Benih cabai | Rp28.000\nPot 30 cm\n\n• Panduan | Gratis')).toEqual([
      { name: 'Benih cabai', price: 'Rp28.000' },
      { name: 'Pot 30 cm', price: '' },
      { name: 'Panduan', price: 'Gratis' },
    ]);
    expect(bundleLines('')).toEqual([]);
    expect(stageLines('Semai | 4\nTumbuh daun 6 minggu\ntanpa angka\nPanen: 1,5')).toEqual([
      { label: 'Semai', weeks: 4, start: 0 },
      { label: 'Tumbuh daun', weeks: 6, start: 4 },
      { label: 'Panen', weeks: 1.5, start: 10 },
    ]);
    expect(stageLines('Lama | 99')[0].weeks).toBe(52);
    expect(stageLines(Array.from({ length: 9 }, (_, i) => `Tahap ${i} | 1`).join('\n'))).toHaveLength(6);
    expect(stageLines('')).toEqual([]);
  });

  it('kategori produk unik, filter, kecocokan kartu kategori, ikon otomatis', () => {
    const items = [{ category: 'Benih' }, { category: 'benih ' }, { category: 'Pupuk' }, { category: '' }, { category: 'Alat Tani' }];
    expect(productCategories(items)).toEqual(['Benih', 'Pupuk', 'Alat Tani']);
    expect(filterProducts(items, 'BENIH')).toHaveLength(2);
    expect(filterProducts(items, '')).toHaveLength(5);
    expect(matchCategory(['Benih', 'Alat Tani'], 'alat tani')).toBe('Alat Tani');
    expect(matchCategory(['Benih'], 'Bibit Buah')).toBe('');
    expect(iconKey('Benih')).toBe('seed');
    expect(iconKey('Pupuk')).toBe('fertilizer');
    expect(iconKey('Pestisida Organik')).toBe('pest');
    expect(iconKey('Alat Tani')).toBe('tool');
    expect(iconKey('Kirim ke seluruh Indonesia')).toBe('shipping');
    expect(iconKey('Konsultasi gratis dengan penyuluh')).toBe('talk');
    expect(iconKey('Bayar transfer atau COD')).toBe('pay');
    expect(iconKey('Sesuatu yang lain', 2)).toBe('harvest');
    expect(cropKey('Cabai')).toBe('chili');
    expect(cropKey('Hidroponik')).toBe('hydro');
    expect(cropKey('Starter Kit Hidroponik Sayur Daun')).toBe('hydro');
    expect(cropKey('Tomat')).toBe('tomato');
    expect(cropKey('Sayur Daun')).toBe('leafy');
    expect(cropKey('Jagung')).toBe('sprout');
  });
});

describe('TaniMakmur: demo', RENDER, () => {
  it('urutan section, satu h1, hero ladang berfoto, menu transparan, tombol cari & konsultasi', () => {
    const container = demo();
    expect(sectionKeys(container)).toEqual(ORDER);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const hero = section(container, 'hero');
    expect(hero.getAttribute('data-hero-layout')).toBe('field');
    expect(hero.getAttribute('data-tpl-tone')).toBe('inverse');
    const h1 = hero.querySelector('h1')!;
    expect(h1.textContent).toBe('Benih tepat, panen lebih tenang');
    expect(h1.querySelector('span')?.textContent).toBe('panen');
    const img = hero.querySelector<HTMLImageElement>('img[fetchpriority="high"]')!;
    expect(img.getAttribute('src')).toBe('/assets/templates/photos/tanimakmur-hero-1920.webp');
    expect(img.getAttribute('srcset')).toBe('/assets/templates/photos/tanimakmur-hero-800.webp 800w, /assets/templates/photos/tanimakmur-hero-1920.webp 1920w');
    expect(img.getAttribute('loading')).toBe('eager');
    expect(img.getAttribute('alt')).toMatch(/kebun/i);
    expect(container.querySelectorAll('img[fetchpriority="high"]')).toHaveLength(1);

    const header = container.querySelector('header')!;
    expect(header.className).toContain('h-0');
    expect(header.getAttribute('data-tpl-tone')).toBe('inverse');
    const nav = within(header).getAllByRole('navigation', { name: 'Menu utama' })[0];
    expect(Array.from(nav.querySelectorAll('a')).map((a) => a.textContent)).toEqual(['Kategori', 'Paket Tanam', 'Terlaris', 'Konsultasi', 'Panduan', 'Kontak']);
    expect(within(nav).getByRole('link', { name: 'Terlaris' })).toHaveAttribute('href', '#products');
    expect(href(within(header).getByRole('link', { name: 'Konsultasi Gratis' }))).toContain('wa.me/6281234567890?text=Halo TaniMakmur, saya ingin konsultasi tanaman');
    expect(within(header).getByRole('button', { name: 'Cari di halaman' })).toHaveAttribute('aria-expanded', 'false');
    expect(header.querySelector('svg[viewBox="0 0 32 32"]'), 'TaniMark').not.toBeNull();
  });

  it('hero: foto bulat + lingkaran ajakan ke Terlaris, tautan konsultasi WhatsApp, kartu kutipan, 3 angka, strip keunggulan', () => {
    const hero = section(demo(), 'hero');
    const shop = within(hero).getAllByRole('link', { name: 'Mulai Belanja' });
    // Lingkaran (layar lebar) + tombol pil (HP), keduanya ke Produk terlaris
    expect(shop).toHaveLength(2);
    for (const link of shop) expect(link).toHaveAttribute('href', '#products');
    expect(hero.querySelector('img[src="/assets/templates/photos/tanimakmur-cabai-1000.webp"]')).toHaveAttribute('loading', 'lazy');
    expect(href(within(hero).getByRole('link', { name: 'Konsultasi gratis via WhatsApp' }))).toMatch(/^https:\/\/wa\.me\/.*konsultasi tanaman/);
    expect(hero.querySelector('blockquote')?.textContent).toContain('berbuah lebat');
    expect(hero.textContent).toContain('Pak Darto, petani cabai di Batu');
    const stats = Array.from(hero.querySelectorAll('li.tm-rise'));
    expect(stats.map((li) => li.firstElementChild?.textContent)).toEqual(['4,9/5', '12 rb+', '±30 mnt']);
    expect(stats[0].className).toContain('bg-[#F6F2E3]');
    const ticker = within(hero).getAllByRole('list', { name: 'Keunggulan toko' })[0];
    expect(Array.from(ticker.querySelectorAll('li')).map((li) => li.textContent)).toEqual([
      'Benih berlabel resmi',
      'Pupuk & pestisida organik',
      'Paket tanam per jenis tanaman',
      'Konsultasi gratis dengan penyuluh',
      'Kirim ke seluruh Indonesia',
      'Bayar transfer atau COD',
    ]);
  });

  it('kategori: 4 kartu bernomor; klik kartu menggulir ke Terlaris dan memfilter kategorinya', () => {
    const container = demo();
    const categories = section(container, 'categories');
    expect(categories.querySelectorAll('ul > li')).toHaveLength(4);
    expect(categories.textContent).toContain('(03)');
    expect(productNames(container)).toHaveLength(8);
    fireEvent.click(within(categories).getByRole('link', { name: 'Lihat Pestisida Organik' }));
    expect(scrolled).toEqual(['products']);
    expect(productNames(container)).toEqual(['Pestisida Nabati Mimba']);
    expect(within(section(container, 'products')).getByRole('button', { name: 'Pestisida Organik' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('pilih tanamanmu: tab per tanaman, panel paket (isi, jadwal tanam, hemat, pesan WhatsApp), panah keyboard', () => {
    const container = demo();
    const bundles = section(container, 'bundles');
    const tablist = within(bundles).getByRole('tablist', { name: 'Pilih tanaman' });
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Cabai', 'Hidroponik', 'Tomat', 'Sayur Daun']);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveAttribute('tabindex', '-1');
    const panel = within(bundles).getByRole('tabpanel');
    expect(panel).toHaveAttribute('aria-labelledby', tabs[0].id);
    expect(within(panel).getByRole('heading', { level: 3 })).toHaveTextContent('Paket Cabai Rawit dalam Pot');
    expect(panel.textContent).toContain('Panen pertama ± 3,5 bulan setelah semai');
    const stages = within(panel).getByRole('list', { name: 'Jadwal tanam per tahap' });
    expect(stages.querySelectorAll('li')).toHaveLength(4);
    expect(stages.textContent).toContain('minggu ke-1 sampai 4');
    expect(panel.textContent).toContain('Total ± 23 minggu dari semai');
    expect(panel.textContent).toContain('Hemat Rp14.000');
    expect(href(within(panel).getByRole('link', { name: 'Pesan Paket Cabai' }))).toContain('Halo TaniMakmur, saya ingin memesan Paket Cabai Rawit dalam Pot.');
    expect(href(within(panel).getByRole('link', { name: 'Tanya penyuluh' }))).toContain('bertanya tentang Paket Cabai Rawit dalam Pot');

    fireEvent.click(tabs[1]);
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(within(bundles).getByRole('tabpanel')).toHaveTextContent('Starter Kit Hidroponik Sayur Daun');
    fireEvent.keyDown(tabs[1], { key: 'ArrowRight' });
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[2]).toHaveFocus();
    expect(within(bundles).getByRole('tabpanel')).toHaveTextContent('Paket Tomat Ceri Rambat');
    fireEvent.keyDown(tabs[2], { key: 'End' });
    expect(tabs[3]).toHaveFocus();
    fireEvent.keyDown(tabs[3], { key: 'ArrowRight' });
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('produk terlaris: 8 kartu berbintang, filter kategori, pesan WhatsApp berisi nama & ukuran', () => {
    const container = demo();
    const products = section(container, 'products');
    expect(productNames(container)).toHaveLength(8);
    const filter = within(products).getByRole('group', { name: 'Filter kategori' });
    expect(within(filter).getAllByRole('button').map((b) => b.textContent)).toEqual(['Semua', 'Benih', 'Pupuk', 'Pestisida Organik', 'Alat Tani']);
    expect(within(filter).getByRole('button', { name: 'Semua' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(products).getAllByRole('img', { name: 'Rating 4,9 dari 5' }).length).toBeGreaterThanOrEqual(3);
    expect(products.textContent).toContain('Rp32.000');
    expect(products.querySelector('s')?.textContent).toBe('Rp32.000');
    expect(href(within(products).getByRole('link', { name: 'Pesan Benih Cabai Rawit Hibrida' }))).toContain(
      'Halo TaniMakmur, saya ingin memesan Benih Cabai Rawit Hibrida (±100 biji).',
    );
    for (const img of products.querySelectorAll('img')) {
      expect(img.getAttribute('loading')).toBe('lazy');
      expect(img.getAttribute('srcset')).toContain('-240.webp 240w');
    }

    fireEvent.click(within(filter).getByRole('button', { name: 'Pupuk' }));
    expect(productNames(container)).toEqual(['Pupuk Kompos Organik', 'Pupuk NPK 16-16-16']);
    expect(products.textContent).toContain('Menampilkan 2 produk kategori Pupuk');
    fireEvent.click(within(filter).getByRole('button', { name: 'Semua' }));
    expect(productNames(container)).toHaveLength(8);
    expect(href(within(products).getByRole('link', { name: 'Minta katalog lengkap' }))).toContain('bertanya tentang katalog lengkap');
  });

  it('konsultasi, panduan, testimoni, FAQ, kontak, footer', () => {
    const container = demo();
    const consult = section(container, 'consult');
    expect(consult.getAttribute('data-tpl-tone')).toBeNull();
    expect(consult.querySelector('[data-tpl-tone="inverse"]')).not.toBeNull();
    expect(href(within(consult).getByRole('link', { name: 'Chat Penyuluh Sekarang' }))).toContain('Halo TaniMakmur, saya ingin konsultasi tanaman dengan penyuluh.');
    expect(within(consult).getByRole('list', { name: 'Penyuluh kami' }).querySelectorAll('li')).toHaveLength(2);
    expect(within(consult).getAllByRole('group', { name: 'Contoh percakapan konsultasi' })[0]).toHaveTextContent('Daun cabai saya keriting');
    expect(consult.querySelectorAll('ol > li')).toHaveLength(3);
    expect(consult.textContent).toContain('Senin–Sabtu, 08.00–17.00 WIB');

    const tips = section(container, 'tips');
    expect(tips.querySelectorAll('ul > li')).toHaveLength(4);
    expect(href(within(tips).getByRole('link', { name: 'Minta panduan lengkap: Membuat kompos dari sisa dapur' }))).toContain(
      'bertanya tentang panduan "Membuat kompos dari sisa dapur"',
    );

    const stories = section(container, 'testimonials');
    expect(stories.querySelectorAll('blockquote')).toHaveLength(3);
    const featured = stories.querySelectorAll('[data-tpl-tone="inverse"]');
    expect(featured).toHaveLength(1);
    expect(featured[0].textContent).toContain('Bayu Prasetyo');
    expect(stories.textContent).toContain('Membeli: Paket Cabai Rawit dalam Pot');
    for (const img of stories.querySelectorAll('img')) expect(img.getAttribute('srcset')).toContain('-240.webp 240w');

    const faq = section(container, 'faq');
    const buttons = within(faq).getAllByRole('button');
    expect(buttons).toHaveLength(6);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(buttons[2]);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'false');
    expect(buttons[2]).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(buttons[2].getAttribute('aria-controls')!)).not.toHaveAttribute('inert');
    expect(within(faq).getByRole('link', { name: 'Tanya lewat WhatsApp' })).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\//));

    const contact = section(container, 'contact');
    expect(within(contact).getByRole('link', { name: /WhatsApp 081234567890/ })).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\//));
    expect(contact.querySelector('iframe[title="Peta lokasi TaniMakmur"]')).not.toBeNull();
    expect(contact.textContent).toContain('JNE, J&T, dan SiCepat');

    const footer = container.querySelector('footer')!;
    expect(within(footer).getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://instagram.com/tanimakmur');
    expect(within(footer).getByRole('navigation', { name: 'Kategori belanja' }).querySelectorAll('a')).toHaveLength(4);
    expect(within(footer).getByRole('navigation', { name: 'Tautan footer' }).querySelectorAll('a')).toHaveLength(6);
    expect(footer.textContent).toContain(`© ${new Date().getFullYear()} TaniMakmur. Semua hak dilindungi.`);
    fireEvent.click(within(footer).getByRole('link', { name: 'Alat Tani' }));
    expect(scrolled).toEqual(['products']);
    expect(productNames(container)).toEqual(['Tower Hidroponik 24 Lubang', 'Sprayer Punggung Elektrik', 'Sekop Tanam Stainless']);
  });

  it('datar: tidak ada kelas shadow di kode template', () => {
    const container = demo();
    const shadows = Array.from(container.querySelectorAll('[class*="shadow"]')).filter((el) => !/Chat WhatsApp/.test(el.getAttribute('aria-label') ?? ''));
    expect(shadows.map((el) => el.className)).toEqual([]);
  });
});

describe('TaniMakmur: SEO situs demo', RENDER, () => {
  it('judul tab & meta description bawaan terbaca seperti toko tani (≤ 60 / ≤ 160 karakter), lalu dipulihkan', () => {
    expect(siteTitle('tanimakmur', null)).toBe('TaniMakmur — Toko tani online: benih, pupuk & alat tani');
    expect(siteTitle('tanimakmur', null).length).toBeLessThanOrEqual(60);
    document.title = 'Sebelum';
    const restore = applySiteHead('tanimakmur', null);
    expect(document.title).toBe(siteTitle('tanimakmur', null));
    const description = document.head.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
    expect(description).toBe(def.defaultContent.hero.subtitle);
    expect(description.length).toBeLessThanOrEqual(160);
    expect(description).toMatch(/^Benih, pupuk, pestisida organik, dan alat tani/);
    restore();
    expect(document.title).toBe('Sebelum');
  });

  it('satu H1, heading berurutan tanpa loncat level, setiap section isi punya H2', () => {
    const container = demo();
    const levels = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6')).map((h) => Number(h.tagName[1]));
    expect(levels.filter((l) => l === 1)).toHaveLength(1);
    expect(levels[0]).toBe(1);
    levels.forEach((level, i) => {
      if (i > 0) expect(level, `heading ke-${i + 1}`).toBeLessThanOrEqual(levels[i - 1] + 1);
    });
    for (const key of ORDER.filter((k) => k !== 'hero')) expect(section(container, key).querySelector('h2'), key).not.toBeNull();
  });

  it('gambar: alt deskriptif di semua foto, hero eager + fetchpriority, sisanya lazy dengan srcset, sizes, width & height', () => {
    const container = demo();
    const images = Array.from(container.querySelectorAll('img'));
    expect(images.length).toBeGreaterThanOrEqual(20);
    for (const img of images) {
      const src = img.getAttribute('src');
      expect(img.getAttribute('alt')?.trim().length, `alt ${src}`).toBeGreaterThan(8);
      expect(Number(img.getAttribute('width')), `width ${src}`).toBeGreaterThan(0);
      expect(Number(img.getAttribute('height')), `height ${src}`).toBeGreaterThan(0);
      expect(img.getAttribute('srcset'), `srcset ${src}`).toMatch(/ \d+w, .+ \d+w$/);
      expect(img.getAttribute('sizes'), `sizes ${src}`).toBeTruthy();
    }
    const eager = images.filter((img) => img.getAttribute('loading') === 'eager');
    expect(eager.map((img) => img.getAttribute('src'))).toEqual(['/assets/templates/photos/tanimakmur-hero-1920.webp']);
    expect(eager[0]).toHaveAttribute('fetchpriority', 'high');
    expect(images.filter((img) => img !== eager[0]).every((img) => img.getAttribute('loading') === 'lazy')).toBe(true);
    // Avatar testimoni & penyuluh memakai alt foto (bukan alt kosong)
    expect(section(container, 'testimonials').querySelector('img')?.getAttribute('alt')).toMatch(/^Potret /);
  });

  it('SVG dekoratif tersembunyi dari pembaca layar; tautan asli dengan href, anchor section ada; tombol hanya untuk aksi', () => {
    const container = demo();
    for (const svg of container.querySelectorAll('svg')) {
      expect(svg.closest('[aria-hidden="true"]'), svg.outerHTML.slice(0, 80)).not.toBeNull();
    }
    const links = Array.from(container.querySelectorAll('a'));
    for (const a of links) {
      const href = a.getAttribute('href') ?? '';
      expect(href, a.textContent ?? '').not.toBe('');
      expect(href).not.toBe('#');
      if (href.startsWith('#')) expect(document.getElementById(href.slice(1)), href).not.toBeNull();
    }
    for (const button of container.querySelectorAll('button')) {
      expect(button.getAttribute('type')).toBe('button');
      expect((button.getAttribute('aria-label') ?? button.textContent ?? '').trim(), button.outerHTML.slice(0, 80)).not.toBe('');
    }
  });
});

describe('TaniMakmur: pencarian di menu', RENDER, () => {
  it('cari → hasil → klik menggulir ke section dan menutup kolom; tanpa hasil → tanya stok; Esc menutup', () => {
    const container = demo();
    const header = container.querySelector('header')!;
    const toggle = within(header).getByRole('button', { name: 'Cari di halaman' });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const panel = document.getElementById(toggle.getAttribute('aria-controls')!)!;
    const input = within(panel).getByRole('searchbox', { name: 'Cari di halaman' });
    expect(input).toHaveFocus();
    expect(within(panel).getByRole('link', { name: 'Paket Tanam' })).toHaveAttribute('href', '#bundles');

    fireEvent.change(input, { target: { value: 'kompos' } });
    const results = within(header).getByRole('list', { name: 'Hasil pencarian' });
    expect(Array.from(results.querySelectorAll('a')).map((a) => a.textContent)).toEqual(['Pupuk Kompos OrganikTerlaris', 'Membuat kompos dari sisa dapurPanduan']);
    expect(within(header).getByRole('status')).toHaveTextContent('2 hasil');
    fireEvent.click(within(results).getAllByRole('link')[0]);
    expect(scrolled).toEqual(['products']);
    expect(within(header).queryByRole('searchbox')).toBeNull();

    fireEvent.click(toggle);
    fireEvent.change(within(header).getByRole('searchbox'), { target: { value: 'traktor' } });
    expect(header.textContent).toContain('Tidak ada hasil untuk “traktor”.');
    expect(within(header).getByRole('link', { name: /Tanyakan stoknya kepada kami/ })).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\//));
    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });
    expect(within(header).queryByRole('searchbox')).toBeNull();
    expect(toggle).toHaveFocus();
  });
});

describe('TaniMakmur: konten opsional kosong', RENDER, () => {
  it('hero tanpa foto, foto bulat, kutipan, angka, dan strip → latar gradasi, ajakan jadi tombol pil', () => {
    const hero = section(
      demo({ hero: { image: '', spot_image: '', card_quote: '', card_name: '', stats_label: '', stats: [], ticker: [], secondary_label: '' } }),
      'hero',
    );
    expect(hero.querySelector('img')).toBeNull();
    expect(hero.querySelector('.tm-hero-fallback')).not.toBeNull();
    expect(within(hero).getAllByRole('link', { name: 'Mulai Belanja' })).toHaveLength(1);
    expect(hero.querySelector('blockquote')).toBeNull();
    expect(hero.querySelector('li.tm-rise')).toBeNull();
    expect(within(hero).queryByRole('list', { name: 'Keunggulan toko' })).toBeNull();
    expect(within(hero).queryByRole('link', { name: /Konsultasi gratis/ })).toBeNull();
  });

  it('kategori tanpa foto & tanpa produk sekategori → daun bawaan + tanya WhatsApp; tanpa WhatsApp → tombol ke Kontak', () => {
    const container = demo({
      categories: { items: [{ title: 'Bibit Buah', text: 'Bibit okulasi.', image: '' }] },
      bundles: { items: [{ crop: 'Jagung', title: 'Paket Jagung Manis', contents: 'Benih jagung', stages: '', price: 'Rp50.000', compare_price: '', button_label: 'Pesan' }] },
      contact: { whatsapp: '' },
    });
    const categories = section(container, 'categories');
    expect(categories.querySelector('img')).toBeNull();
    expect(categories.querySelector('svg[viewBox="0 0 200 200"]')).not.toBeNull();
    expect(within(categories).getByRole('link', { name: 'Lihat Bibit Buah' })).toHaveAttribute('href', '#kontak');
    const bundles = section(container, 'bundles');
    expect(within(bundles).getByRole('tab', { name: 'Jagung' })).toHaveAttribute('aria-selected', 'true');
    expect(within(bundles).queryByRole('list', { name: 'Jadwal tanam per tahap' })).toBeNull();
    expect(bundles.textContent).not.toContain('Hemat');
    expect(within(bundles).getByRole('link', { name: 'Pesan' })).toHaveAttribute('href', '#kontak');
    expect(within(section(container, 'products')).getByRole('link', { name: 'Pesan Pupuk Kompos Organik' })).toHaveAttribute('href', '#kontak');
  });

  it('produk satu kategori → tanpa tombol filter; hero dimatikan → header bilah krem biasa', () => {
    const container = demo({ hero: { enabled: false }, products: { items: [{ name: 'Benih Sawi', category: 'Benih', price: 'Rp10.000' }] } });
    expect(sectionKeys(container)).toEqual(ORDER.filter((k) => k !== 'hero'));
    expect(within(section(container, 'products')).queryByRole('group', { name: 'Filter kategori' })).toBeNull();
    const header = container.querySelector('header')!;
    expect(header.className).not.toContain('h-0');
    expect(header.hasAttribute('data-tpl-tone')).toBe(false);
  });
});

describe('TaniMakmur: pratinjau CMS', RENDER, () => {
  it('pratinjau diam (gerak mati bila Component dirender langsung), strip keunggulan statis, tanpa tautan wa.me', () => {
    const { container } = render(<def.Component content={resolveContent(def, null)} preview />);
    expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'off');
    expect(container.querySelector('.tpl-marquee')).toBeNull();
    expect(within(container).getAllByRole('list', { name: 'Keunggulan toko' })).toHaveLength(1);
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    // Interaksi sisi klien tetap jalan di pratinjau
    fireEvent.click(within(container).getByRole('tab', { name: 'Tomat' }));
    expect(within(container).getByRole('tabpanel')).toHaveTextContent('Paket Tomat Ceri Rambat');
  });
});

describe('TaniMakmur: editor CMS', () => {
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
  }, 60_000);
});

describe('TaniMakmur: data katalog', () => {
  const sql = (file: string) => readFileSync(resolve(ROOT, file), 'utf8');

  it.each(['database/seed.templates.sql', 'database/migrations/2026-10-25_020_tanimakmur_template.sql'])(
    '%s: baris tanimakmur dengan template_code, kategori Toko Online, harga, urutan, dan pratinjau .webp',
    (file) => {
      const text = sql(file);
      expect(text).toContain("'tanimakmur'");
      expect(text).toContain("'Toko Online'");
      expect(text).toContain('1590000.00');
      expect(text).toMatch(/'tanimakmur', NULL, 'published', 8\)/);
      expect(text).toContain("'/assets/templates/tanimakmur-preview.webp'");
      expect(text).toContain('\'["/assets/templates/tanimakmur-1.webp","/assets/templates/tanimakmur-2.webp"]\'');
      // Fitur katalog = JSON valid (tanpa tanda kutip ganda di dalam teks)
      const features = /'(\["Hero foto ladang[^']*\])'/.exec(text)?.[1] ?? '';
      expect(JSON.parse(features)).toHaveLength(8);
    },
  );

  it('migrasi 020 aman diulang (INSERT IGNORE + UPDATE berdasarkan slug, tanpa DELETE) dan tercatat di schema_migrations', () => {
    // Tanpa komentar SQL (komentar kepala menyebut "Tidak ada DELETE")
    const text = sql('database/migrations/2026-10-25_020_tanimakmur_template.sql').replace(/^--.*$/gm, '');
    expect(text).toMatch(/INSERT IGNORE INTO templates/);
    expect(text).toMatch(/WHERE slug = 'tanimakmur';/);
    expect(text).toMatch(/sort_order\s+= 8/);
    expect(text).not.toMatch(/\bDELETE\b/);
    expect(text).toContain("VALUES ('2026-10-25_020', 'templates: katalog TaniMakmur')");
  });

  it('gambar pratinjau katalog ada di public/ dan ringan', () => {
    for (const name of ['tanimakmur-preview', 'tanimakmur-1', 'tanimakmur-2']) {
      const path = resolve(ROOT, `public/assets/templates/${name}.webp`);
      expect(existsSync(path), name).toBe(true);
      const kb = statSync(path).size / 1024;
      expect(kb, name).toBeGreaterThan(10);
      expect(kb, name).toBeLessThan(220);
    }
  });
});

describe('TaniMakmur: konten aneh', RENDER, () => {
  it('angka, null, dan string di tempat list tidak membuat crash', () => {
    const weird = {
      hero: { stats: 'x', ticker: [null, { text: 5 }], highlight: 'tidak ada di judul', card_quote: 5, secondary_url: 'javascript:alert(1)' },
      categories: { items: [{ title: 1 }, null, 'x'] },
      bundles: { items: [{ crop: 2, contents: 3, stages: 'Semai | x\n| 4', price: 9 }, { title: null }] },
      products: { items: [{ name: 3, rating: 'sepuluh', category: null }, 'x'] },
      consult: { experts: [{ name: 4 }], steps: 'x' },
      testimonials: { items: [{ quote: 'Bagus', rating: '-3' }] },
      faq: { items: [{ question: 2, answer: null }] },
      brand: { accent_color: 'hijau' },
    } as unknown as SiteContent;
    const { container } = render(<def.Component content={resolveContent(def, weird)} />);
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
  });
});
