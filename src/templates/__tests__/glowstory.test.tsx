// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/glowstory.test.tsx
// GlowStory (template toko online kecantikan 2026-10-25): skema CMS & konten demo, helper model (warna teks aksen,
// menu, pencarian, rupiah, saring kategori, kuis, isi ulang, keranjang), demo (urutan section, hero kolase, produk +
// keranjang → WhatsApp, kuis sampai hasil, kalkulator langganan, ulasan berfoto + panel foto, FAQ, footer), konten
// opsional kosong, pratinjau CMS diam, editor CMS, data katalog (migrasi 023 + seed + gambar pratinjau), dan konten aneh.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionEditor } from '../../pages/account/cms/SectionEditor';
import { validateContent } from '../../pages/account/cms/validation';
import { TEMPLATES, resolveContent } from '../index';
import {
  CREAM,
  DARK,
  cartAdd,
  cartMessage,
  cartSetQty,
  cartTotal,
  filterProducts,
  formatRupiah,
  glowVars,
  matchCategory,
  navItems,
  parseRating,
  parseRoutine,
  parseRupiah,
  productCategories,
  quizQuestions,
  quizResult,
  quizTypes,
  refillQuote,
  searchEntries,
  searchFilter,
} from '../glowstory/model';
import { GLOWSTORY_PHOTOS } from '../glowstory/photos';
import { SiteRenderer } from '../SiteRenderer';
import { contrast, parseHex } from '../shared/utils';
import { isListField, type ListItem, type SiteContent } from '../types';

const ROOT = process.cwd();
const def = TEMPLATES.glowstory;
const ORDER = ['hero', 'perks', 'categories', 'products', 'quiz', 'refill', 'testimonials', 'brands', 'faq', 'cta', 'contact'];
const sectionKeys = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-tpl-section]')).map((s) => s.getAttribute('data-tpl-section'));
const section = (root: HTMLElement, key: string) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`)!;
const demo = (content: unknown = null, preview = false) => render(<SiteRenderer templateCode="glowstory" content={content} preview={preview} />).container;
const rgb = (hex: string) => parseHex(hex)!;
const publicFile = (url: string) => resolve(ROOT, 'public', url.replace(/^\//, ''));
const waText = (href: string | null) => decodeURIComponent((href ?? '').split('?text=')[1] ?? '');

let scrolled: (string | null)[] = [];
beforeEach(() => {
  scrolled = [];
  Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
    scrolled.push(this.getAttribute('data-tpl-section'));
  });
});
afterEach(cleanup);

describe('GlowStory: skema & konten bawaan', () => {
  it('urutan form = urutan halaman, section toko berkunci Inggris pendek, field unik, list berbatas', () => {
    expect(def.code).toBe('glowstory');
    expect(def.name).toBe('GlowStory');
    expect(def.sections.map((s) => s.key)).toEqual(['brand', ...ORDER, 'footer']);
    const fields = (key: string) => def.sections.find((s) => s.key === key)!.fields.map((f) => f.key);
    expect(fields('brand')).toEqual(['company_name', 'tagline', 'logo', 'accent_color']);
    expect(fields('hero')).toEqual(
      expect.arrayContaining(['highlight', 'image', 'image_2', 'image_3', 'rating_value', 'rating_label', 'featured_label', 'featured_name', 'featured_price', 'featured_url']),
    );
    expect(fields('products')).toEqual(['eyebrow', 'title', 'highlight', 'subtitle', 'items']);
    expect(fields('quiz')).toEqual(expect.arrayContaining(['image', 'start_label', 'note', 'questions', 'types']));
    expect(fields('refill')).toEqual(expect.arrayContaining(['products', 'intervals', 'points', 'button_label', 'button_url', 'note']));
    expect(fields('testimonials')).toEqual(expect.arrayContaining(['rating_value', 'rating_label', 'items']));
    const logo = def.sections[0].fields.find((f) => f.key === 'logo');
    expect(logo && 'help' in logo ? logo.help : '').toMatch(/simbol tetes & kilau/);
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
    expect(c.hero.image).toBe('/assets/templates/photos/glowstory-hero-1200.webp');
    const photos = JSON.stringify(c).match(/\/assets\/templates\/photos\/[a-z0-9-]+\.webp/g) ?? [];
    expect(photos.length).toBeGreaterThanOrEqual(20);
    for (const src of photos) expect(GLOWSTORY_PHOTOS.asset(src), src).not.toBeNull();
    const credits = readFileSync(resolve(ROOT, 'public/assets/templates/photos/CREDITS.md'), 'utf8');
    for (const key of GLOWSTORY_PHOTOS.keys) {
      const asset = GLOWSTORY_PHOTOS.asset(GLOWSTORY_PHOTOS.src(key))!;
      const urls = [asset.src, ...asset.srcSet!.split(',').map((part) => part.trim().split(' ')[0])];
      for (const url of urls) {
        expect(existsSync(publicFile(url)), url).toBe(true);
        // Foto ringan: varian terbesar < 150 KB
        expect(statSync(publicFile(url)).size, url).toBeLessThan(150 * 1024);
      }
      expect(credits, key).toContain(`\`${key}-*\``);
      expect(photos, `${key} dipakai di konten demo`).toContain(GLOWSTORY_PHOTOS.src(key));
    }
    expect(existsSync(publicFile('/assets/templates/logos/glowstory-mark.svg'))).toBe(true);
  });

  it('salinan demo jujur: tanpa klaim medis/hasil, kuis disebut bukan diagnosis, langganan tanpa penagihan otomatis', () => {
    const text = JSON.stringify(def.defaultContent);
    expect(text).not.toMatch(/menyembuhkan|mengobati|memutihkan|terbukti secara klinis|dijamin|permanen|anti.?aging/i);
    expect(text).toMatch(/bukan diagnosis dokter/);
    expect(text).toMatch(/Tidak ada penagihan otomatis/);
  });
});

describe('GlowStory: helper model', () => {
  it('warna teks aksen ≥ 4,5:1 di krem, aksen terang ≥ 4,5:1 di cokelat tua, warna tidak valid → bawaan', () => {
    for (const accent of ['#A9502B', '#FFD1DC', '#0B3D2E', '#ff0000', '#ffffff']) {
      const vars = glowVars(accent) as Record<string, string>;
      expect(contrast(rgb(vars['--gs-accent-text']), CREAM), accent).toBeGreaterThanOrEqual(4.5);
      expect(contrast(rgb(vars['--gs-accent-light']), DARK), accent).toBeGreaterThanOrEqual(4.5);
    }
    expect(glowVars('bukan warna')).toEqual(glowVars('#A9502B'));
  });

  it('menu mengikuti section yang tampil; label singkat dari label section', () => {
    const content = resolveContent(def, null);
    expect(navItems(content).map((i) => i.label)).toEqual(['Kategori', 'Terlaris', 'Kuis Kulit', 'Langganan', 'Ulasan', 'Tanya Jawab']);
    const edited = resolveContent(def, { refill: { enabled: false }, products: { eyebrow: 'Pilihan paling dicari minggu ini' }, quiz: { types: [] }, faq: { items: [] } });
    expect(navItems(edited).map((i) => i.key)).toEqual(['categories', 'products', 'testimonials']);
    expect(navItems(edited)[1].label).toBe('Terlaris');
  });

  it('pencarian halaman: produk (merek & kategori ikut dicari), kategori, tipe kulit, langganan, FAQ; tanpa diakritik', () => {
    const content = resolveContent(def, null);
    const entries = searchEntries(content, navItems(content));
    expect(entries.find((e) => e.label === 'Serum Niasinamida 5%' && e.target === 'products')?.group).toBe('Terlaris · Kembang Lab');
    expect(entries.find((e) => e.label === 'Kulit Berminyak')?.target).toBe('quiz');
    expect(entries.some((e) => e.target === 'faq' && /BPOM/.test(e.label))).toBe(true);
    expect(searchFilter(entries, 'sunscreen').map((e) => `${e.label}|${e.target}`)).toEqual(['Sunscreen SPF 50 PA++++|products', 'Sunscreen SPF 50 PA++++|refill']);
    expect(searchFilter(entries, 'nala rupa').map((e) => e.label)).toEqual(['Lipstik Satin Kembang', 'Bedak Tabur Halus']);
    expect(searchFilter(entries, 'makeup').map((e) => e.label)).toEqual(expect.arrayContaining(['Lipstik Satin Kembang', 'Bedak Tabur Halus', 'Makeup']));
    expect(searchFilter(entries, 'KÉMBANG lab').map((e) => e.label)).toContain('Serum Niasinamida 5%');
    expect(searchFilter(entries, '   ')).toEqual([]);
    expect(searchFilter(entries, 'zzz')).toEqual([]);
  });

  it('rupiah & rating: baca berbagai format, tulis dengan titik ribuan', () => {
    expect(parseRupiah('Rp119.000')).toBe(119000);
    expect(parseRupiah('Rp 1.290.000,-')).toBe(1290000);
    expect(parseRupiah('Rp65.000,00')).toBe(65000);
    expect(parseRupiah('gratis')).toBeNull();
    expect(parseRupiah('')).toBeNull();
    expect(formatRupiah(1234567)).toBe('Rp1.234.567');
    expect(formatRupiah(86240.4)).toBe('Rp86.240');
    expect(parseRating('4,9')).toBe(4.9);
    expect(parseRating('7')).toBe(5);
    expect(parseRating('bagus')).toBeNull();
  });

  it('kategori produk unik & saring (tanpa beda huruf besar), kartu kategori dicocokkan ke kategori produk', () => {
    const items: ListItem[] = [{ name: 'A', category: 'Skincare' }, { name: 'B', category: 'skincare ' }, { name: 'C', category: 'Makeup' }, { name: 'D' }];
    expect(productCategories(items)).toEqual(['Skincare', 'Makeup']);
    expect(filterProducts(items, 'SKINCARE').map((i) => i.name)).toEqual(['A', 'B']);
    expect(filterProducts(items, '').map((i) => i.name)).toEqual(['A', 'B', 'C', 'D']);
    expect(matchCategory('makeup', ['Skincare', 'Makeup'])).toBe('Makeup');
    expect(matchCategory('Parfum', ['Skincare'])).toBe('');
  });

  it('kuis: pertanyaan ≥ 2 jawaban, rutinitas per baris, skor terbanyak menang (seri → yang lebih dulu dipilih)', () => {
    const quiz = resolveContent(def, null).quiz;
    expect(quizQuestions(quiz)).toHaveLength(4);
    expect(quizTypes(quiz).map((t) => t.name)).toEqual(['Kulit Kering', 'Kulit Berminyak', 'Kulit Kombinasi', 'Kulit Sensitif']);
    expect(quizQuestions({ questions: [{ question: 'Satu jawaban', answer_1: 'A' }, { question: 'Q', answer_1: '', answer_2: 'B', answer_4: 'D' }] })).toEqual([
      { question: 'Q', answers: [{ label: 'B', type: 1 }, { label: 'D', type: 3 }] },
    ]);
    expect(parseRoutine('Pembersih | Gel | Rp65.000\n- Serum: Niasinamida\n\nTabir surya saja')).toEqual([
      { step: 'Pembersih', product: 'Gel', price: 'Rp65.000' },
      { step: 'Serum', product: 'Niasinamida', price: '' },
      { step: '', product: 'Tabir surya saja', price: '' },
    ]);
    expect(quizResult([1, 1, 2, 1], 4)).toBe(1);
    expect(quizResult([2, 0, 0, 2], 4)).toBe(2);
    expect(quizResult([3, 9, -1], 4)).toBe(3);
    expect(quizResult([], 4)).toBe(0);
    expect(quizResult([0], 0)).toBe(-1);
  });

  it('isi ulang: potongan dibulatkan ke Rp100, kiriman setahun = 52 minggu / jarak kirim, input tidak valid → null', () => {
    expect(refillQuote('Rp98.000', '4', '12')).toEqual({ normal: 98000, perDelivery: 86200, saving: 11800, deliveriesPerYear: 13, savingPerYear: 153400 });
    expect(refillQuote('Rp79.000', '3', '15')).toEqual({ normal: 79000, perDelivery: 67200, saving: 11800, deliveriesPerYear: 17, savingPerYear: 200600 });
    expect(refillQuote('Rp50.000', '8', '')?.saving).toBe(0);
    expect(refillQuote('gratis', '4', '10')).toBeNull();
    expect(refillQuote('Rp50.000', '0', '10')).toBeNull();
  });

  it('keranjang: nama sama digabung, harga tidak valid ditolak, jumlah 0 = hapus, pesan WhatsApp berisi daftar & subtotal', () => {
    let lines = cartAdd([], 'Serum', 'Rp119.000');
    lines = cartAdd(lines, 'serum ', 'Rp119.000');
    lines = cartAdd(lines, 'Losion', 'Rp69.000');
    expect(cartAdd(lines, 'Gratis', 'hubungi kami')).toBe(lines);
    expect(lines).toEqual([
      { name: 'Serum', price: 119000, qty: 2 },
      { name: 'Losion', price: 69000, qty: 1 },
    ]);
    expect(cartTotal(lines)).toBe(307000);
    expect(cartSetQty(lines, 'Losion', 0)).toEqual([{ name: 'Serum', price: 119000, qty: 2 }]);
    expect(cartMessage('Seruni Beauty', lines)).toBe(
      'Halo Seruni Beauty, saya ingin memesan:\n1. Serum × 2 — Rp238.000\n2. Losion × 1 — Rp69.000\nSubtotal: Rp307.000\nMohon info ongkir dan cara pembayarannya. Terima kasih.',
    );
  });
});

// Render penuh template (12 section) di jsdom: bisa lewat 5 dtk saat seluruh suite berjalan paralel
describe('GlowStory: demo', { timeout: 30_000 }, () => {
  it('urutan section, satu h1, hero kolase dengan foto LCP, kata miring, kartu unggulan, lencana rating', () => {
    const container = demo();
    expect(sectionKeys(container)).toEqual(ORDER);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const hero = section(container, 'hero');
    expect(hero.getAttribute('data-hero-layout')).toBe('collage');
    const h1 = hero.querySelector('h1')!;
    expect(h1.textContent).toBe('Kulit sehat dimulai dari rutinitas kecil.');
    expect(h1.querySelector('em')?.textContent).toBe('rutinitas');
    const img = hero.querySelector<HTMLImageElement>('img[fetchpriority="high"]')!;
    expect(img.getAttribute('src')).toBe('/assets/templates/photos/glowstory-hero-1200.webp');
    expect(img.getAttribute('srcset')).toBe('/assets/templates/photos/glowstory-hero-800.webp 800w, /assets/templates/photos/glowstory-hero-1200.webp 1200w');
    expect(img.getAttribute('alt')).toMatch(/serum/i);
    expect(container.querySelectorAll('img[fetchpriority="high"]')).toHaveLength(1);
    expect(hero.querySelectorAll('img')).toHaveLength(3);
    expect(within(hero).getByRole('link', { name: 'Belanja sekarang' })).toHaveAttribute('href', '#products');
    expect(within(hero).getByRole('link', { name: 'Ikuti kuis kulit' })).toHaveAttribute('href', '#quiz');
    expect(within(hero).getByRole('link', { name: /Serum Niasinamida 5%/ })).toHaveAttribute('href', '#products');
    expect(hero.textContent).toContain('6.420 ulasan pembeli');

    const header = container.querySelector('header')!;
    const nav = within(header).getAllByRole('navigation', { name: 'Menu utama' })[0];
    expect(Array.from(nav.querySelectorAll('a')).map((a) => a.textContent)).toEqual(['Kategori', 'Terlaris', 'Kuis Kulit', 'Langganan', 'Ulasan', 'Tanya Jawab']);
    expect(within(header).getByRole('button', { name: 'Keranjang kosong' })).toBeInTheDocument();
    expect(header.querySelector('svg[viewBox="0 0 32 32"]'), 'GlowMark').not.toBeNull();
    // Strip berjalan: demo bergerak (salinan untuk putaran disembunyikan dari pembaca layar)
    expect(within(section(container, 'perks')).getByRole('list', { name: 'Keunggulan toko' }).textContent).toContain('100% brand lokal');
  });

  it('produk: saring kategori, tambah ke keranjang, panel keranjang (ubah jumlah) → pesanan WhatsApp berisi subtotal', () => {
    const container = demo();
    const products = section(container, 'products');
    const list = within(products).getByRole('list', { name: 'Daftar produk' });
    expect(list.children).toHaveLength(8);
    const filters = within(products).getByRole('group', { name: 'Saring kategori' });
    fireEvent.click(within(filters).getByRole('button', { name: 'Makeup' }));
    expect(within(filters).getByRole('button', { name: 'Makeup' })).toHaveAttribute('aria-pressed', 'true');
    expect(Array.from(list.querySelectorAll('h3')).map((h) => h.textContent)).toEqual(['Lipstik Satin Kembang', 'Bedak Tabur Halus']);
    fireEvent.click(within(filters).getByRole('button', { name: 'Semua' }));
    expect(list.children).toHaveLength(8);
    // Kartu: label, harga coret, rating
    const serum = list.children[0] as HTMLElement;
    expect(serum.textContent).toContain('Terlaris');
    expect(serum.querySelector('.line-through')?.textContent).toContain('Rp139.000');
    expect(serum.textContent).toContain('4,9');

    fireEvent.click(within(products).getByRole('button', { name: 'Tambah Serum Niasinamida 5% ke keranjang' }));
    fireEvent.click(within(products).getByRole('button', { name: 'Tambah Serum Niasinamida 5% ke keranjang' }));
    fireEvent.click(within(products).getByRole('button', { name: 'Tambah Losion Tubuh Kenanga ke keranjang' }));
    expect(container.textContent).toContain('Losion Tubuh Kenanga masuk keranjang');
    const header = container.querySelector('header')!;
    fireEvent.click(within(header).getByRole('button', { name: 'Keranjang, 3 barang' }));
    const dialog = within(container).getByRole('dialog', { name: /Keranjang/ });
    expect(within(dialog).getByRole('button', { name: 'Tutup keranjang' })).toHaveFocus();
    expect(dialog.textContent).toContain('Rp307.000');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Kurangi Serum Niasinamida 5%' }));
    expect(dialog.textContent).toContain('Rp188.000');
    const order = within(dialog).getByRole('link', { name: 'Pesan lewat WhatsApp' });
    expect(order).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\/6281234567890\?text=/));
    expect(waText(order.getAttribute('href'))).toContain('1. Serum Niasinamida 5% × 1 — Rp119.000\n2. Losion Tubuh Kenanga × 1 — Rp69.000\nSubtotal: Rp188.000');
    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });
    expect(within(container).queryByRole('dialog')).toBeNull();
  });

  it('kategori: tombol menyaring Produk terlaris lalu menggulir ke sana', () => {
    const container = demo();
    fireEvent.click(within(section(container, 'categories')).getByRole('button', { name: 'Lihat produk Perawatan Tubuh' }));
    expect(scrolled).toEqual(['products']);
    const list = within(section(container, 'products')).getByRole('list', { name: 'Daftar produk' });
    expect(Array.from(list.querySelectorAll('h3')).map((h) => h.textContent)).toEqual(['Losion Tubuh Kenanga', 'Lulur Kopi & Gula Aren']);
  });

  it('kuis: mulai → 4 pertanyaan (kembali bisa) → hasil berminyak dengan rutinitas pagi & malam → masuk keranjang', () => {
    const container = demo();
    const quiz = section(container, 'quiz');
    fireEvent.click(within(quiz).getByRole('button', { name: /Mulai kuis/ }));
    expect(quiz.textContent).toContain('Pertanyaan 1 dari 4');
    fireEvent.click(within(quiz).getByRole('button', { name: /Mengilap di seluruh wajah/ }));
    fireEvent.click(within(quiz).getByRole('button', { name: /Kembali/ }));
    expect(within(quiz).getByRole('button', { name: /Mengilap di seluruh wajah/ })).toHaveAttribute('aria-pressed', 'true');
    for (const answer of [/Mengilap di seluruh wajah/, /Besar dan terlihat/, /Pipi kering/, /Kilap berlebih/]) fireEvent.click(within(quiz).getByRole('button', { name: answer }));
    const heading = within(quiz).getByRole('heading', { level: 3, name: /Kulitmu cenderung berminyak/ });
    expect(heading).toHaveFocus();
    expect(quiz.textContent).toContain('Rutinitas pagi');
    expect(quiz.textContent).toContain('Toner BHA 1%');
    const ask = within(quiz).getByRole('link', { name: /Tanya lewat WhatsApp/ });
    expect(waText(ask.getAttribute('href'))).toContain('hasil kuis kulit saya: Kulit Berminyak');
    fireEvent.click(within(quiz).getByRole('button', { name: /Masukkan rutinitas ke keranjang · Rp444\.000/ }));
    expect(within(container.querySelector('header')!).getByRole('button', { name: 'Keranjang, 5 barang' })).toBeInTheDocument();
    fireEvent.click(within(quiz).getByRole('button', { name: /Ulangi kuis/ }));
    expect(quiz.textContent).toContain('Pertanyaan 1 dari 4');
  });

  it('isi ulang: pilih produk & jadwal → harga per kiriman, hemat setahun, pesan WhatsApp berisi pilihan', () => {
    const refill = section(demo(), 'refill');
    expect(refill.textContent).toContain('Rp86.200');
    expect(refill.textContent).toContain('Rp153.400');
    fireEvent.click(within(refill).getByRole('radio', { name: /Sunscreen SPF 50/ }));
    fireEvent.click(within(refill).getByRole('radio', { name: /Setiap 3 minggu/ }));
    expect(refill.textContent).toContain('Rp67.200');
    expect(refill.textContent).toContain('± 17 kiriman setahun');
    expect(refill.textContent).toContain('Rp200.600');
    const start = within(refill).getByRole('link', { name: 'Mulai langganan' });
    expect(waText(start.getAttribute('href'))).toBe('Halo Seruni Beauty, saya ingin berlangganan isi ulang Sunscreen SPF 50 PA++++ (50 ml) setiap 3 minggu dengan potongan 15%, Rp67.200 per kiriman.');
    expect(refill.textContent).toContain('Hemat hingga 15%');
  });

  it('ulasan berfoto: ringkasan rating, kartu foto bisa diperbesar (geser), kartu tanpa foto berwarna; FAQ, ajakan, kontak, footer', () => {
    const container = demo();
    const reviews = section(container, 'testimonials');
    expect(reviews.textContent).toContain('dari 6.420 ulasan pembeli');
    expect(reviews.querySelectorAll('blockquote')).toHaveLength(6);
    expect(reviews.querySelectorAll('li[data-tpl-tone="inverse"]')).toHaveLength(2);
    for (const img of reviews.querySelectorAll('img')) expect(img.getAttribute('loading')).toBe('lazy');
    fireEvent.click(within(reviews).getByRole('button', { name: 'Perbesar foto dari Laras Pramesti' }));
    let dialog = within(container).getByRole('dialog', { name: 'Foto ulasan Laras Pramesti' });
    expect(dialog.querySelector('img')).toHaveAttribute('src', '/assets/templates/photos/glowstory-review-1-1200.webp');
    expect(dialog.textContent).toContain('Foto 1 / 4');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Foto berikutnya' }));
    dialog = within(container).getByRole('dialog', { name: 'Foto ulasan Dinda & Maya' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tutup foto' }));
    expect(within(container).queryByRole('dialog')).toBeNull();

    const brands = section(container, 'brands');
    expect(within(brands).getByRole('list', { name: 'Brand lokal yang kami jual' }).textContent).toContain('Kembang Lab');

    const faq = section(container, 'faq');
    const buttons = within(faq).getAllByRole('button');
    expect(buttons).toHaveLength(5);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(buttons[2]);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById(buttons[2].getAttribute('aria-controls')!)).not.toHaveAttribute('inert');

    const cta = section(container, 'cta');
    expect(cta.querySelector('em')?.textContent).toBe('lebih dulu');
    expect(within(cta).getByRole('link', { name: /Gabung lewat WhatsApp/ })).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\//));

    const contact = section(container, 'contact');
    expect(within(contact).getByRole('link', { name: /WhatsApp 081234567890/ })).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\//));
    expect(within(contact).getByRole('link', { name: /Buka di Google Maps/ })).toHaveAttribute('href', expect.stringContaining('google.com/maps'));
    expect(contact.querySelector('iframe')).toBeNull();

    const footer = container.querySelector('footer')!;
    expect(within(footer).getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://instagram.com/serunibeauty');
    expect(within(footer).getByRole('navigation', { name: 'Tautan footer' }).querySelectorAll('a')).toHaveLength(6);
    expect(footer.textContent).toContain(`© ${new Date().getFullYear()} Seruni Beauty. Semua hak dilindungi.`);
  });

  it('pencarian di menu: hasil produk menggulir ke Terlaris; tanpa hasil → ajakan bertanya', () => {
    const container = demo();
    const header = container.querySelector('header')!;
    const toggle = within(header).getByRole('button', { name: 'Cari di halaman' });
    fireEvent.click(toggle);
    const input = within(header).getByRole('searchbox', { name: 'Cari di halaman' });
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: 'lulur' } });
    const results = within(header).getByRole('list', { name: 'Hasil pencarian' });
    fireEvent.click(within(results).getAllByRole('link')[0]);
    expect(scrolled).toEqual(['products']);
    fireEvent.click(toggle);
    fireEvent.change(within(header).getByRole('searchbox'), { target: { value: 'parfum mobil' } });
    expect(header.textContent).toContain('Tidak ada hasil untuk “parfum mobil”.');
  });

  it('datar: tidak ada kelas shadow di kode template', () => {
    const container = demo();
    const shadows = Array.from(container.querySelectorAll('[class*="shadow"]')).filter((el) => !el.closest('[aria-label="Chat WhatsApp"]') && !/Chat WhatsApp/.test(el.getAttribute('aria-label') ?? ''));
    expect(shadows.map((el) => el.className)).toEqual([]);
  });
});

describe('GlowStory: konten opsional kosong', { timeout: 30_000 }, () => {
  it('hero tanpa foto → judul terpusat tanpa img; tanpa kartu unggulan & rating → disembunyikan', () => {
    const hero = section(demo({ hero: { image: '', image_2: '', image_3: '', featured_name: '', rating_value: '' } }), 'hero');
    expect(hero.querySelector('img')).toBeNull();
    expect(hero.textContent).not.toContain('Paling laris');
    expect(hero.textContent).not.toContain('6.420');
    expect(within(hero).getByRole('link', { name: 'Belanja sekarang' })).toBeInTheDocument();
  });

  it('produk tanpa harga angka → tombol tanya; produk bertautan → tombol Beli; tanpa WhatsApp → keranjang ke Kontak', () => {
    const container = demo({
      products: {
        items: [
          { name: 'Masker Baru', price: 'Hubungi kami', category: 'Skincare' },
          { name: 'Parfum', price: 'Rp150.000', url: 'https://contoh-toko.id/parfum' },
          { name: 'Sabun', price: 'Rp20.000' },
        ],
      },
      contact: { whatsapp: '' },
    });
    const products = section(container, 'products');
    expect(within(products).getByRole('link', { name: 'Tanya Masker Baru' })).toHaveAttribute('href', '#kontak');
    expect(within(products).getByRole('link', { name: 'Beli Parfum' })).toHaveAttribute('href', 'https://contoh-toko.id/parfum');
    expect(within(products).queryByRole('group', { name: 'Saring kategori' })).toBeNull();
    fireEvent.click(within(products).getByRole('button', { name: 'Tambah Sabun ke keranjang' }));
    fireEvent.click(within(container.querySelector('header')!).getByRole('button', { name: 'Keranjang, 1 barang' }));
    expect(within(within(container).getByRole('dialog')).getByRole('link', { name: 'Hubungi kami untuk memesan' })).toHaveAttribute('href', '#kontak');
  });

  it('kuis tanpa tipe kulit / isi ulang tanpa jadwal → section tidak dirender; keranjang kosong punya ajakan', () => {
    const container = demo({ quiz: { types: [] }, refill: { intervals: [] } });
    expect(sectionKeys(container)).toEqual(ORDER.filter((k) => k !== 'quiz' && k !== 'refill'));
    expect(within(section(container, 'hero')).queryByRole('link', { name: 'Ikuti kuis kulit' })).toBeNull();
    fireEvent.click(within(container.querySelector('header')!).getByRole('button', { name: 'Keranjang kosong' }));
    const dialog = within(container).getByRole('dialog');
    expect(dialog.textContent).toContain('Keranjang masih kosong');
    expect(within(dialog).getByRole('link', { name: /Lihat produk terlaris/ })).toHaveAttribute('href', '#products');
  });
});

describe('GlowStory: pratinjau CMS', { timeout: 30_000 }, () => {
  it('pratinjau diam (gerak mati bila Component dirender langsung) dan tanpa tautan wa.me', () => {
    const { container } = render(<def.Component content={resolveContent(def, null)} preview />);
    expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'off');
    expect(container.querySelector('.tpl-marquee')).toBeNull();
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    expect(container.querySelector('a[href^="https://instagram.com"]')).toBeNull();
  });
});

describe('GlowStory: editor CMS', () => {
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

describe('GlowStory: data katalog', () => {
  const sql = (file: string) => readFileSync(resolve(ROOT, file), 'utf8');

  it.each(['database/seed.templates.sql', 'database/migrations/2026-10-25_023_glowstory_template.sql'])(
    '%s: baris glowstory dengan template_code, kategori Toko Online, harga, urutan, dan pratinjau tangkapan layar .webp',
    (file) => {
      const text = sql(file);
      expect(text).toContain("'glowstory'");
      expect(text).toContain("'Toko Online'");
      expect(text).toContain('1590000.00');
      expect(text).toContain("'/assets/templates/glowstory-preview.webp'");
      expect(text).toContain('\'["/assets/templates/glowstory-1.webp","/assets/templates/glowstory-2.webp"]\'');
    },
  );

  it('migrasi 023 aman diulang (INSERT IGNORE + UPDATE berdasarkan slug, tanpa DELETE), sort_order 11, tercatat di schema_migrations', () => {
    // Tanpa komentar SQL (komentar kepala menyebut "Tidak ada DELETE")
    const text = sql('database/migrations/2026-10-25_023_glowstory_template.sql').replace(/^--.*$/gm, '');
    expect(text).toMatch(/INSERT IGNORE INTO templates/);
    expect(text).toMatch(/WHERE slug = 'glowstory';/);
    expect(text).toMatch(/sort_order\s+= 11/);
    expect(text).not.toMatch(/\bDELETE\b/);
    expect(text).toContain("VALUES ('2026-10-25_023', 'templates: katalog GlowStory')");
  });

  it('gambar pratinjau katalog ada di public/, 1600×1000, dan ringan', () => {
    for (const name of ['glowstory-preview', 'glowstory-1', 'glowstory-2']) {
      const path = resolve(ROOT, `public/assets/templates/${name}.webp`);
      expect(existsSync(path), name).toBe(true);
      const kb = statSync(path).size / 1024;
      expect(kb, name).toBeGreaterThan(10);
      expect(kb, name).toBeLessThan(220);
      // Header VP8X WebP: lebar-1 & tinggi-1 (24-bit little endian) di byte 24–29
      const head = readFileSync(path).subarray(0, 30);
      if (head.toString('ascii', 12, 16) === 'VP8X') {
        expect(head.readUIntLE(24, 3) + 1, name).toBe(1600);
        expect(head.readUIntLE(27, 3) + 1, name).toBe(1000);
      }
    }
  });
});

describe('GlowStory: konten aneh', { timeout: 30_000 }, () => {
  it('angka, null, dan string di tempat list tidak membuat crash', () => {
    const weird = {
      hero: { highlight: 'tidak ada di judul', featured_name: 5, image_2: 'javascript:alert(1)', rating_value: 9 },
      perks: { items: 'x' },
      categories: { items: [{ name: 1 }, null, 'x'] },
      products: { items: [{ name: 3, price: 4, rating: 'x', old_price: null }] },
      quiz: { questions: [{ question: 2, answer_1: 1, answer_2: 2 }], types: [{ name: 7, morning: 8 }] },
      refill: { products: [{ name: 'A', price: 'x' }], intervals: [{ label: 'L', weeks: 'y' }] },
      testimonials: { items: [{ quote: 9, rating: 'lima', photo: 3 }] },
      brands: { items: [{ name: null }] },
      faq: { items: [{ question: 2, answer: null }] },
      brand: { accent_color: 'merah' },
    } as unknown as SiteContent;
    const { container } = render(<def.Component content={resolveContent(def, weird)} />);
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
    expect(container.querySelector('img[src^="javascript:"]')).toBeNull();
  });
});
