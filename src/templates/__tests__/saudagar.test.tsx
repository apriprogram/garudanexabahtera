// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/saudagar.test.tsx
// Saudagar (company profile eksportir kopi, kakao & rempah 2026-10-27): skema CMS & konten demo, helper model (warna
// tema, menu terbelah, tujuan tautan, section tampil, tab komoditas, kalender panen, formulir penawaran → pesan
// WhatsApp), demo (urutan section, hero triptych, masthead + menu HP, tab spesifikasi, akordeon, kartu → formulir,
// formulir), datar tanpa bayangan, gerak (pratinjau CMS diam, CSS sg- bergerbang data-tpl-motion), warna tema, SEO situs
// pembeli, judul & gambar & tautan, konten opsional kosong, editor CMS, data katalog (migrasi 036 + seed + pratinjau),
// dan konten aneh.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionEditor } from '../../pages/account/cms/SectionEditor';
import { validateContent } from '../../pages/account/cms/validation';
import { TEMPLATES, resolveContent } from '../index';
import { iconKey } from '../saudagar/icons';
import {
  EMPTY_QUOTE,
  ESPRESSO,
  KRAFT,
  monthLabels,
  navItems,
  PAPER,
  PAGE_SECTIONS,
  parseMonths,
  productTabs,
  quoteMailHref,
  quoteMessage,
  readSaudagar,
  saudagarVars,
  sectionShown,
  sectionTarget,
  validateQuote,
  validVolume,
  type QuoteForm,
} from '../saudagar/model';
import { SAUDAGAR_PHOTOS } from '../saudagar/photos';
import { applySiteHead, siteTitle } from '../siteHead';
import { SiteRenderer } from '../SiteRenderer';
import { contrast, parseHex } from '../shared/utils';
import { isListField, type SiteContent } from '../types';

// Demo panjang + getByRole di jsdom: bisa lewat 5 dtk saat suite berjalan paralel
vi.setConfig({ testTimeout: 30_000 });

const ROOT = process.cwd();
const def = TEMPLATES.saudagar;
const ORDER = ['hero', 'about', 'products', 'quality', 'season', 'markets', 'gallery', 'testimonials', 'faq', 'cta', 'contact'];
const sectionKeys = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-tpl-section]')).map((s) => s.getAttribute('data-tpl-section'));
const section = (root: HTMLElement, key: string) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`)!;
const demo = (content: unknown = null, preview = false) => render(<SiteRenderer templateCode="saudagar" content={content} preview={preview} />).container;
const rgb = (hex: string) => parseHex(hex)!;
const publicFile = (url: string) => resolve(ROOT, 'public', url.replace(/^\//, ''));
const rootStyle = (container: HTMLElement, name: string) => {
  const holder = Array.from(container.querySelectorAll<HTMLElement>('[style]')).find((el) => el.style.getPropertyValue(name));
  return holder?.style.getPropertyValue(name) ?? '';
};
const urls = (src: string) => {
  const asset = SAUDAGAR_PHOTOS.asset(src)!;
  return [asset.src, ...asset.srcSet!.split(',').map((part) => part.trim().split(' ')[0])].filter((u, i, all) => all.indexOf(u) === i);
};
const linkList = (root: Element) => Array.from(root.querySelectorAll('a')).map((a) => `${a.textContent}|${a.getAttribute('href')}`);
const form = (patch: Partial<QuoteForm> = {}): QuoteForm => ({ ...EMPTY_QUOTE, name: 'Rina Wulandari', country: 'Jepang', product: 'Kopi Arabika Toraja', volume: '2', unit: 'kontainer 20 ft', ...patch });

let scrolled: (string | null)[] = [];
beforeEach(() => {
  scrolled = [];
  Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
    scrolled.push(this.getAttribute('data-tpl-section'));
  });
});
afterEach(cleanup);

describe('Saudagar: skema & konten bawaan', () => {
  it('urutan form = urutan halaman, semua section bisa disembunyikan, field unik, list berbatas', () => {
    expect(def.code).toBe('saudagar');
    expect(def.name).toBe('Saudagar');
    expect(def.features).toBeUndefined();
    expect(def.sections.map((s) => s.key)).toEqual(['brand', ...ORDER, 'footer']);
    expect([...PAGE_SECTIONS]).toEqual([...ORDER, 'footer']);
    const fields = (key: string) => def.sections.find((s) => s.key === key)!.fields.map((f) => f.key);
    expect(fields('brand')).toEqual(['company_name', 'tagline', 'logo', 'accent_color']);
    expect(def.sections[0].fields.find((f) => f.key === 'accent_color')?.type).toBe('color');
    expect(fields('hero')).toEqual(expect.arrayContaining(['image', 'image_left', 'image_right', 'caption', 'primary_label', 'secondary_label', 'header_label']));
    expect(fields('products')).toEqual(expect.arrayContaining(['categories', 'items', 'label_grade', 'label_moq', 'note']));
    expect(fields('contact')).toEqual(expect.arrayContaining(['address', 'maps_query', 'maps_url', 'phone', 'email', 'whatsapp', 'whatsapp_message', 'hours', 'incoterms', 'units']));
    expect(fields('footer')).toEqual(expect.arrayContaining(['instagram', 'facebook', 'linkedin', 'youtube', 'tiktok']));
    const contact = def.sections.find((s) => s.key === 'contact')!;
    expect(contact.fields.find((f) => f.key === 'whatsapp')?.type).toBe('phone');
    const max: Record<string, number> = {};
    for (const s of def.sections) {
      const keys = s.fields.map((f) => f.key);
      expect(new Set(keys).size, s.key).toBe(keys.length);
      expect(s.introduced).toBeUndefined();
      expect(def.defaultContent[s.key], s.key).toBeTypeOf('object');
      if (s.key !== 'brand') expect(s.toggleable, s.key).toBe(true);
      for (const f of s.fields) {
        expect(f.introduced, `${s.key}.${f.key}`).toBeUndefined();
        if (isListField(f)) {
          expect(f.max, `${s.key}.${f.key}`).toBeGreaterThan(0);
          max[`${s.key}.${f.key}`] = f.max!;
          for (const sub of f.fields) if (['text', 'textarea'].includes(sub.type)) expect(sub.maxLength, `${s.key}.${f.key}.${sub.key}`).toBeGreaterThan(0);
        } else if (['text', 'textarea', 'phone', 'email'].includes(f.type)) {
          expect(f.maxLength, `${s.key}.${f.key}`).toBeGreaterThan(0);
        }
      }
    }
    // Batas yang disebut di halaman katalog (saudagar.content.ts)
    expect(max).toMatchObject({
      'products.categories': 4,
      'products.items': 12,
      'quality.steps': 6,
      'season.items': 8,
      'markets.origins': 6,
      'markets.destinations': 10,
      'gallery.items': 9,
      'testimonials.items': 6,
      'faq.items': 8,
    });
  });

  it('konten demo lolos validasi CMS, logo kosong, semua foto terdaftar, ada di public/, tercatat di CREDITS.md, dan dipakai', () => {
    const c = def.defaultContent;
    expect(validateContent(def, resolveContent(def, null))).toEqual({});
    expect(c.brand.logo).toBe('');
    expect(c.brand.accent_color).toBe('#B7791F');
    expect(c.hero.image).toBe('/assets/templates/photos/saudagar-hero-1200.webp');
    for (const s of def.sections) if (s.key !== 'brand') expect(c[s.key].enabled, s.key).toBe(true);
    const photos = JSON.stringify(c).match(/\/assets\/templates\/photos\/[a-z0-9-]+\.webp/g) ?? [];
    for (const src of photos) expect(SAUDAGAR_PHOTOS.asset(src), src).not.toBeNull();
    const credits = readFileSync(resolve(ROOT, 'public/assets/templates/photos/CREDITS.md'), 'utf8');
    expect(SAUDAGAR_PHOTOS.keys.length).toBeGreaterThanOrEqual(6);
    for (const key of SAUDAGAR_PHOTOS.keys) {
      expect(key.startsWith('saudagar-'), key).toBe(true);
      for (const url of urls(SAUDAGAR_PHOTOS.src(key))) expect(existsSync(publicFile(url)), url).toBe(true);
      expect(credits, key).toContain(`\`${key}-*\``);
      expect(photos, `${key} dipakai di konten demo`).toContain(SAUDAGAR_PHOTOS.src(key));
      expect(SAUDAGAR_PHOTOS.alt(SAUDAGAR_PHOTOS.src(key), '').split(' ').length, key).toBeGreaterThanOrEqual(5);
    }
    // Simbol bawaan juga tersedia sebagai SVG mandiri, path sama dengan komponen
    const mark = readFileSync(publicFile('/assets/templates/logos/saudagar-mark.svg'), 'utf8');
    const component = readFileSync(resolve(ROOT, 'src/templates/saudagar/marks.tsx'), 'utf8');
    const paths = mark.match(/ d="[^"]+"/g) ?? [];
    expect(paths).toHaveLength(3);
    for (const d of paths) expect(component, d).toContain(d.trim());
    // Judul tab situs pembeli ≤ 60 karakter, deskripsi hero 120–155 karakter
    expect(`${c.brand.company_name} — ${c.brand.tagline}`.length).toBeLessThanOrEqual(60);
    expect(String(c.hero.subtitle).length).toBeGreaterThanOrEqual(120);
    expect(String(c.hero.subtitle).length).toBeLessThanOrEqual(155);
  });

  it('foto demo ringan: hero 480/800/1200, WebP ≤ 140 KB per file, total ≤ 2,5 MB', () => {
    expect(SAUDAGAR_PHOTOS.asset(def.defaultContent.hero.image as string)!.srcSet).toBe(
      '/assets/templates/photos/saudagar-hero-480.webp 480w, /assets/templates/photos/saudagar-hero-800.webp 800w, /assets/templates/photos/saudagar-hero-1200.webp 1200w',
    );
    let total = 0;
    for (const key of SAUDAGAR_PHOTOS.keys) {
      for (const url of urls(SAUDAGAR_PHOTOS.src(key))) {
        expect(url, url).toMatch(/\.webp$/);
        const kb = statSync(publicFile(url)).size / 1024;
        expect(kb, url).toBeLessThanOrEqual(140);
        total += kb;
      }
    }
    expect(total).toBeLessThanOrEqual(2500);
  });

  it('salinan demo jujur: formulir hanya menyusun pesan WhatsApp, harga tidak otomatis, tanpa klaim izin/sertifikat', () => {
    const text = JSON.stringify(def.defaultContent);
    expect(text).not.toMatch(/dijamin|garansi|pasti |terbaik nomor|termurah|#1|terdaftar di Bea Cukai|\bNIB\b|\bISO\b|Halal MUI|SVLK|\bAEO\b|bersertifikat/i);
    expect(text).toMatch(/data tidak disimpan di website/);
    expect(text).toMatch(/harga komoditas tidak diperbarui otomatis/);
    expect(text).toMatch(/Pembayaran tidak dilakukan lewat website/);
    expect(text).toContain('.example');
    // BWP pala = biji pecah/afkir untuk digiling, bukan bubuk
    expect(text).not.toMatch(/BWP \(bubuk\)/);
  });

  it('foto tab Kakao & Rempah berbeda dari lengkung samping hero', () => {
    const c = def.defaultContent;
    const categories = c.products.categories as Record<string, string>[];
    const image = (name: string) => categories.find((cat) => cat.name === name)!.image;
    expect(image('Kakao')).not.toBe(c.hero.image_left);
    expect(image('Rempah')).not.toBe(c.hero.image_right);
    expect(new Set(categories.map((cat) => cat.image)).size).toBe(categories.length);
  });
});

describe('Saudagar: helper model', () => {
  it('warna tema: tinta ≥ 4,6:1 di putih, kertas & kraft; versi terang ≥ 5:1 di espresso; warna tidak valid → bawaan', () => {
    const white = rgb('#ffffff');
    const base = saudagarVars('#B7791F') as Record<string, string>;
    expect(contrast(rgb(base['--sg-ink']), white)).toBeGreaterThanOrEqual(5);
    for (const accent of ['#B7791F', '#FACC15', '#1D4ED8', '#0F766E', '#DC2626', '#7C3AED', '#F97316', '#84CC16', '#111827', '#FFFFFF', '#A16207', '#E11D48', '#06B6D4']) {
      const vars = saudagarVars(accent) as Record<string, string>;
      const ink = rgb(vars['--sg-ink']);
      expect(contrast(ink, white), accent).toBeGreaterThanOrEqual(4.5);
      expect(contrast(ink, PAPER), accent).toBeGreaterThanOrEqual(4.5);
      expect(contrast(ink, KRAFT), accent).toBeGreaterThanOrEqual(4.5);
      expect(contrast(rgb(vars['--sg-bright']), ESPRESSO), accent).toBeGreaterThanOrEqual(4.5);
    }
    expect(saudagarVars('bukan warna')).toEqual(saudagarVars('#B7791F'));
  });

  it('menu terbelah: kiri Tentang · Komoditas · Mutu, kanan Musim · Pasar · Galeri, Kontak hanya di panel; section kosong keluar dari menu', () => {
    const content = resolveContent(def, null);
    expect(navItems(content).map((i) => `${i.side}:${i.key}:${i.label}`)).toEqual([
      'left:about:Tentang',
      'left:products:Komoditas',
      'left:quality:Mutu',
      'right:season:Musim',
      'right:markets:Pasar',
      'right:gallery:Galeri',
      'panel:contact:Kontak',
    ]);
    const less = resolveContent(def, { quality: { steps: [] }, gallery: { enabled: false }, products: { items: [] } });
    expect(navItems(less).map((i) => i.key)).toEqual(['about', 'season', 'markets', 'contact']);
    // Nama menu = label kecil section bila satu kata ≤ 12 huruf; lebih panjang / beberapa kata → bawaan; Kontak tetap
    const own = resolveContent(def, {
      products: { eyebrow: 'Products' },
      quality: { eyebrow: 'Sertifikasinya' },
      about: { eyebrow: 'About us' },
      gallery: { eyebrow: '' },
      contact: { eyebrow: 'Contact' },
    });
    expect(navItems(own).map((i) => i.label)).toEqual(['Tentang', 'Products', 'Mutu', 'Musim', 'Pasar', 'Galeri', 'Kontak']);
  });

  it('section tampil = syarat komponen: Tentang & ajakan yang kosong tidak ditautkan dari menu atau hero', () => {
    const emptyAbout = resolveContent(def, { about: { title: '', body: '', image: '', stats: [], founder_name: 'Andi' } });
    expect(sectionShown(emptyAbout, 'about')).toBe(false);
    expect(navItems(emptyAbout).map((i) => i.key)).not.toContain('about');
    const noProducts = readSaudagar(resolveContent(def, { about: { title: '', body: '', image: '', stats: [] }, products: { enabled: false } }));
    expect(noProducts.secondaryAction).toBeNull();
    expect(sectionShown(resolveContent(def, { about: { title: '', body: '', image: '', stats: [{ value: '15' }] } }), 'about')).toBe(true);

    const emptyCta = resolveContent(def, { cta: { title: '', subtitle: '', button_label: '' }, hero: { secondary_url: '#ajakan' } });
    expect(sectionShown(emptyCta, 'cta')).toBe(false);
    expect(readSaudagar(emptyCta).secondaryAction).toEqual({ kind: 'section', target: 'products' });
    const container = demo({ cta: { title: '', subtitle: '', button_label: '' }, hero: { secondary_url: '#ajakan' } });
    expect(sectionKeys(container)).not.toContain('cta');
    expect(container.querySelector('a[href="#ajakan"], a[href="#cta"]')).toBeNull();
    cleanup();
    // Hanya tombol: tampil bila tombolnya punya tujuan (formulir Kontak / WhatsApp)
    expect(sectionShown(resolveContent(def, { cta: { title: '', subtitle: '' } }), 'cta')).toBe(true);
    expect(sectionShown(resolveContent(def, { cta: { title: '', subtitle: '' }, contact: { enabled: false, whatsapp: '' } }), 'cta')).toBe(false);
  });

  it('tujuan tautan: anchor Indonesia dan kunci section; section tersembunyi → cadangan', () => {
    expect(sectionTarget('#komoditas')).toBe('products');
    expect(sectionTarget('#kontak')).toBe('contact');
    expect(sectionTarget('musim')).toBe('season');
    expect(sectionTarget('#pasar')).toBe('markets');
    expect(sectionTarget('#tidak-ada')).toBeNull();
    const m = readSaudagar(resolveContent(def, null));
    expect(m.linkOr('#komoditas', null)).toEqual({ kind: 'section', target: 'products' });
    expect(m.linkOr('', m.quoteAction)).toEqual({ kind: 'section', target: 'contact' });
    expect(m.primaryAction).toEqual({ kind: 'section', target: 'contact' });
    expect(m.secondaryAction).toEqual({ kind: 'section', target: 'products' });
    const hidden = readSaudagar(resolveContent(def, { contact: { enabled: false } }));
    expect(hidden.quoteAction?.kind).toBe('external');
    expect(hidden.linkOr('#kontak', null)).toBeNull();
  });

  it('section tampil hanya bila berisi', () => {
    const content = resolveContent(def, null);
    for (const key of ORDER) expect(sectionShown(content, key), key).toBe(true);
    const empty = resolveContent(def, {
      products: { items: [] },
      quality: { steps: [] },
      season: { items: [{ origin: 'tanpa nama' }] },
      markets: { origins: [], destinations: [] },
      gallery: { items: [{ caption: 'tanpa foto' }] },
      testimonials: { items: [] },
      faq: { items: [{ question: 'Tanpa jawaban?' }] },
    });
    for (const key of ['products', 'quality', 'season', 'markets', 'gallery', 'testimonials', 'faq']) expect(sectionShown(empty, key), key).toBe(false);
    expect(sectionShown(content, 'tidak-ada')).toBe(false);
  });

  it('kalender panen: teks bulan → rentang; melewati akhir tahun jadi dua potong; teks tak dikenal → tanpa batang', () => {
    expect(parseMonths('Mei–Sep')).toEqual([[5, 9]]);
    expect(parseMonths('5-9')).toEqual([[5, 9]]);
    expect(parseMonths('Apr–Jul, Okt–Des')).toEqual([
      [4, 7],
      [10, 12],
    ]);
    expect(parseMonths('Nov–Feb')).toEqual([
      [11, 12],
      [1, 2],
    ]);
    expect(parseMonths('Okt')).toEqual([[10, 10]]);
    expect(parseMonths('May to Aug')).toEqual([[5, 8]]);
    expect(parseMonths('Januari s.d. Desember')).toEqual([[1, 12]]);
    expect(parseMonths('Agustus sampai Oktober')).toEqual([[8, 10]]);
    expect(parseMonths('')).toEqual([]);
    expect(parseMonths('abc')).toEqual([]);
    expect(parseMonths('Mei–13')).toEqual([]);
    expect(monthLabels('Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec')[4]).toBe('May');
    expect(monthLabels('Jan, Feb')).toHaveLength(12);
    expect(monthLabels('')[7]).toBe('Agu');
  });

  it('tab komoditas: urutan kategori CMS, kategori kartu tak terdaftar ditambahkan, maks. 4 tab, satu kategori → satu tab', () => {
    const products = resolveContent(def, null).products;
    expect(productTabs(products).map((t) => `${t.name}:${t.items.length}`)).toEqual(['Kopi:2', 'Kakao:2', 'Rempah:3', 'Kelapa:2']);
    const extra = productTabs({
      categories: [{ name: 'Kopi' }, { name: 'Teh' }],
      items: [{ category: 'kopi', name: 'Arabika' }, { category: 'Lada', name: 'Lada putih' }, { name: 'Tanpa kategori' }, { category: 'Teh' }],
    } as unknown as SiteContent['products']);
    expect(extra.map((t) => `${t.name}:${t.items.length}`)).toEqual(['Kopi:1', 'Lada:1', 'Lainnya:1']);
    // Kartu tanpa kategori masuk ke kategori "Lainnya" yang sudah ada (bukan tab "Lainnya" kedua)
    const other = productTabs({
      categories: [{ name: 'Kopi' }, { name: 'Lainnya' }],
      items: [{ category: 'Kopi', name: 'Arabika' }, { category: 'Lainnya', name: 'Vanili' }, { name: 'Lada' }],
    } as unknown as SiteContent['products']);
    expect(other.map((t) => `${t.name}:${t.items.length}`)).toEqual(['Kopi:1', 'Lainnya:2']);
    const loose = productTabs({ items: [{ name: 'Lada' }, { category: 'lainnya', name: 'Vanili' }] } as unknown as SiteContent['products']);
    expect(loose.map((t) => `${t.name}:${t.items.length}`)).toEqual(['Lainnya:2']);
    const one = productTabs({ categories: [{ name: 'Kopi' }], items: [{ category: 'Kopi', name: 'Arabika' }] } as unknown as SiteContent['products']);
    expect(one).toHaveLength(1);
    expect(productTabs({ items: 'x' } as unknown as SiteContent['products'])).toEqual([]);
  });

  it('formulir penawaran: validasi per isian dan pesan WhatsApp berurutan, isian kosong tidak ikut', () => {
    expect(validateQuote(form())).toEqual({});
    expect(validateQuote(EMPTY_QUOTE)).toEqual({
      name: 'Tulis nama Anda.',
      country: 'Tulis negara tujuan.',
      product: 'Pilih komoditas.',
      volume: 'Tulis volume berupa angka, mis. 2 atau 18.000.',
    });
    expect(validateQuote(form({ notes: 'x'.repeat(401) })).notes).toBe('Catatan maksimal 400 karakter.');
    for (const ok of ['2', '18.000', '2,5', '1.250,5']) expect(validVolume(ok), ok).toBe(true);
    for (const bad of ['', '0', 'abc', '2 ton', '1234567890123', '-1']) expect(validVolume(bad), bad).toBe(false);

    const full = quoteMessage(
      form({ company: 'PT Contoh Niaga', port: 'Osaka', incoterm: 'CIF', shipment: 'Maret 2027', sample: true, notes: 'Mohon info  jadwal\npanen berikutnya.' }),
      { greeting: 'Halo PT Saudagar Hasil Bumi, saya ingin meminta penawaran.', company: 'PT Saudagar Hasil Bumi' },
    );
    expect(full).toBe(
      [
        'Halo PT Saudagar Hasil Bumi, saya ingin meminta penawaran.',
        '',
        'Nama: Rina Wulandari',
        'Perusahaan: PT Contoh Niaga',
        'Negara tujuan: Jepang',
        'Pelabuhan tujuan: Osaka',
        'Komoditas: Kopi Arabika Toraja',
        'Volume: 2 kontainer 20 ft',
        'Incoterm: CIF',
        'Target pengiriman: Maret 2027',
        'Sampel: Ya, mohon kirim sampel sebelum kontrak.',
        'Catatan: Mohon info jadwal panen berikutnya.',
      ].join('\n'),
    );
    const short = quoteMessage(form({ incoterm: 'Belum tahu' }), { greeting: '', company: 'PT Uji' });
    expect(short.split('\n')[0]).toBe('Halo PT Uji, saya ingin meminta penawaran.');
    expect(short).toContain('Incoterm: belum ditentukan');
    expect(short).not.toMatch(/Perusahaan:|Pelabuhan tujuan:|Sampel:|Catatan:/);
    expect(quoteMailHref('ekspor@contoh.example', 'Baris 1\nBaris 2', 'Kopi')).toBe(
      'mailto:ekspor@contoh.example?subject=Permintaan%20penawaran%3A%20Kopi&body=Baris%201%0ABaris%202',
    );
    expect(quoteMailHref('bukan email', 'x', '')).toBe('');
  });

  it('ikon komoditas otomatis dari nama', () => {
    expect(iconKey('Kopi arabika')).toBe('coffee');
    expect(iconKey('Kakao')).toBe('cocoa');
    expect(iconKey('Pala & fuli')).toBe('spice');
    expect(iconKey('Kayu manis')).toBe('leaf');
    expect(iconKey('Kopra & arang tempurung')).toBe('coconut');
    expect(iconKey('Vanila?')).toBe('generic');
  });
});

describe('Saudagar: demo', () => {
  it('urutan section, satu H1, hero triptych: foto tengah LCP (eager, srcset, ukuran, alt), dua lengkung samping lazy', () => {
    const container = demo();
    expect(sectionKeys(container)).toEqual([...ORDER, 'footer']);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const hero = section(container, 'hero');
    expect(hero.getAttribute('data-hero-layout')).toBe('triptych');
    expect(hero.querySelector('h1')!.textContent).toBe('Kopi, kakao, dan rempah dari tanah Sulawesi');
    expect(hero.querySelector('h1 em')!.textContent).toBe('tanah Sulawesi');
    const img = hero.querySelector<HTMLImageElement>('img[fetchpriority="high"]')!;
    expect(img.getAttribute('src')).toBe('/assets/templates/photos/saudagar-hero-1200.webp');
    expect(img.getAttribute('srcset')).toContain(' 800w');
    expect(img.getAttribute('loading')).toBe('eager');
    expect(Number(img.getAttribute('width'))).toBe(1200);
    expect(Number(img.getAttribute('height'))).toBe(1500);
    expect(img.getAttribute('alt')!.split(' ').length).toBeGreaterThanOrEqual(5);
    // Foto tengah TIDAK di dalam <Reveal> (tidak pernah disembunyikan)
    expect(img.closest('.tpl-reveal')).toBeNull();
    const sides = Array.from(hero.querySelectorAll<HTMLImageElement>('.sg-rise img'));
    expect(sides).toHaveLength(2);
    for (const side of sides) expect(side.getAttribute('loading')).toBe('lazy');
    expect(hero.textContent).toContain('Kakao · Luwu Utara');
    expect(within(hero).getByRole('link', { name: /Minta penawaran/ })).toHaveAttribute('href', '#kontak');
    expect(within(hero).getByRole('link', { name: /Lihat komoditas/ })).toHaveAttribute('href', '#products');
    const eager = Array.from(container.querySelectorAll('img')).filter((i) => i.getAttribute('loading') !== 'lazy');
    expect(eager.map((i) => i.getAttribute('src'))).toEqual(['/assets/templates/photos/saudagar-hero-1200.webp']);
  });

  it('masthead: menu terbelah + pil, simbol bawaan tanpa logo; menu HP buka/tutup, Esc menutup dan fokus kembali', () => {
    const container = demo();
    const header = container.querySelector('header')!;
    expect(header.className).not.toContain('sticky');
    const nav = within(header).getAllByRole('navigation', { name: 'Menu utama' })[0];
    expect(linkList(nav)).toEqual([
      'Tentang|#tentang',
      'Komoditas|#products',
      'Mutu|#quality',
      'Musim|#season',
      'Pasar|#markets',
      'Galeri|#galeri',
      'Minta penawaran|#kontak',
    ]);
    expect(header.querySelector('svg[viewBox="0 0 32 32"]'), 'SaudagarMark').not.toBeNull();
    // Nama perusahaan panjang: tautan mengisi sel tengah (HP: terpotong "…" di dalam sel, tidak menimpa tombol);
    // masthead lebar: nama maks. dua baris, kolom menu selebar isinya (tidak pernah menimpa nama)
    const home = within(header).getByRole('link', { name: 'PT Saudagar Hasil Bumi, ke awal halaman' });
    expect(home.className).toContain('justify-self-stretch');
    const [phoneName, stackedName] = Array.from(home.querySelectorAll(':scope > span > span'));
    expect(phoneName.className).toContain('truncate');
    expect(stackedName.className).toContain('line-clamp-2');
    expect(stackedName.className).toContain('max-w-[18rem]');
    expect(home.parentElement!.className).toContain('@7xl:grid-cols-[minmax(max-content,1fr)_auto_minmax(max-content,1fr)]');
    // Garis menu aktif memakai tinta tema (kontras di kertas), bukan aksen mentah
    expect(within(nav).getByRole('link', { name: 'Musim' }).className).toContain('after:bg-(--sg-ink)');
    fireEvent.click(within(nav).getByRole('link', { name: 'Musim' }));
    expect(scrolled).toEqual(['season']);
    const toggle = within(header).getByRole('button', { name: 'Buka menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const panel = document.getElementById(toggle.getAttribute('aria-controls')!)!;
    expect(panel).toHaveAttribute('aria-label', 'Menu utama');
    expect(within(panel).getAllByRole('link').map((a) => a.textContent)).toEqual(['Tentang', 'Komoditas', 'Mutu', 'Musim', 'Pasar', 'Galeri', 'Kontak', 'Minta penawaran']);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
  });

  it('tab komoditas: role tab/tabpanel, aria-selected, panah & Home/End; panel lain hidden tetapi ada di HTML', () => {
    const products = section(demo(), 'products');
    const tablist = within(products).getByRole('tablist');
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Kopi2', 'Kakao2', 'Rempah3', 'Kelapa2']);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveAttribute('tabIndex', '-1');
    const panels = products.querySelectorAll('[role="tabpanel"]');
    expect(panels).toHaveLength(4);
    expect(Array.from(panels).map((p) => (p as HTMLElement).hidden)).toEqual([false, true, true, true]);
    expect(products.querySelectorAll('article h3')).toHaveLength(9);
    fireEvent.keyDown(tablist, { key: 'ArrowRight' });
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveFocus();
    expect(document.getElementById(tabs[1].getAttribute('aria-controls')!)).toHaveAttribute('data-enter', 'true');
    fireEvent.keyDown(tablist, { key: 'End' });
    expect(tabs[3]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tablist, { key: 'ArrowRight' });
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    // Jumlah kartu ganjil di kisi dua kolom (Rempah: 3) → kartu terakhir selebar dua kolom; jumlah genap tidak
    const cells = (panel: Element) => Array.from(panel.querySelectorAll('ul > li')).map((li) => li.className.includes('@3xl:col-span-2'));
    expect(cells(panels[2])).toEqual([false, false, true]);
    expect(cells(panels[0])).toEqual([false, false]);
    // Kartu: baris spesifikasi berurutan; kartu sebaris berbagi baris subgrid (kepala · spesifikasi · tautan)
    const card = products.querySelector('article')!;
    expect(Array.from(card.querySelectorAll('dt')).map((d) => d.textContent)).toEqual(['Grade', 'Asal', 'Kadar air', 'Kemasan', 'Min. pesanan']);
    expect(card.className).toContain('@3xl:grid-rows-subgrid');
    expect(card.parentElement!.className).toContain('@3xl:grid-rows-subgrid');
    expect(card.querySelector('dl')!.className).toContain('@3xl:row-start-2');
    expect(products.textContent).toContain('harga komoditas tidak diperbarui otomatis');
    // Cincin fokus tab di dalam tab (rel overflow memotongnya), garis tab aktif = tinta tema (kontras), bukan aksen mentah
    for (const tab of tabs) expect(tab.className).toContain('focus-visible:-outline-offset-2');
    const line = tabs[0].querySelector('.sg-tab-line')!;
    expect(line.className).toContain('bg-(--sg-ink)');
    expect(line.className).not.toContain('--tpl-accent');
  });

  it('tab yang diklik digeser masuk ke tampilan rel (nama kategori panjang tidak terpotong)', () => {
    const products = section(demo(), 'products');
    const tablist = within(products).getByRole('tablist');
    const tabs = within(tablist).getAllByRole('tab');
    let left = 0;
    Object.defineProperty(tablist, 'scrollLeft', { configurable: true, get: () => left, set: (v: number) => (left = v) });
    const rect = (l: number, r: number) => ({ left: l, right: r, width: r - l, top: 0, bottom: 40, height: 40, x: l, y: 0, toJSON: () => ({}) }) as DOMRect;
    tablist.getBoundingClientRect = () => rect(0, 300);
    tabs[3].getBoundingClientRect = () => rect(280, 420);
    fireEvent.click(tabs[3]);
    expect(tabs[3]).toHaveAttribute('aria-selected', 'true');
    expect(left).toBe(140);
    // Tab yang sudah terlihat tidak menggeser rel
    tabs[0].getBoundingClientRect = () => rect(40, 120);
    fireEvent.click(tabs[0]);
    expect(left).toBe(140);
    expect(scrolled).toEqual([]);
  });

  it('tautan kartu "Minta penawaran" memilih komoditas di formulir dan menggulir ke Kontak; formulir menyusun pesan WhatsApp', () => {
    const container = demo();
    const products = section(container, 'products');
    fireEvent.click(within(products).getByRole('tab', { name: /Rempah/ }));
    fireEvent.click(within(products).getByRole('link', { name: 'Minta penawaran: Pala & Fuli' }));
    expect(scrolled).toEqual(['contact']);
    const contact = section(container, 'contact');
    const formEl = within(contact).getByRole('form', { name: 'Formulir permintaan penawaran' });
    expect((within(formEl).getByLabelText('Komoditas') as HTMLSelectElement).value).toBe('Pala & Fuli');
    // Fokus pindah ke pilihan komoditas (pengguna keyboard tidak tertinggal di kartu)
    expect(within(formEl).getByLabelText('Komoditas')).toHaveFocus();
    expect(within(formEl).getByRole('button', { name: 'Susun pesan WhatsApp' })).toHaveAttribute('type', 'submit');
    // Kirim kosong → galat + fokus ke isian pertama yang salah
    fireEvent.change(within(formEl).getByLabelText('Komoditas'), { target: { value: '' } });
    act(() => {
      fireEvent.submit(formEl);
    });
    expect(within(formEl).getByLabelText('Nama')).toHaveAttribute('aria-invalid', 'true');
    expect(within(formEl).getByLabelText('Nama')).toHaveFocus();
    expect(formEl.textContent).toContain('Tulis negara tujuan.');
    fireEvent.change(within(formEl).getByLabelText('Nama'), { target: { value: 'Marieke' } });
    fireEvent.change(within(formEl).getByLabelText('Negara tujuan'), { target: { value: 'Belanda' } });
    fireEvent.change(within(formEl).getByLabelText('Komoditas'), { target: { value: 'Pala & Fuli' } });
    fireEvent.change(within(formEl).getByLabelText('Volume'), { target: { value: '500' } });
    fireEvent.click(within(formEl).getByLabelText('Kirimi saya sampel sebelum kontrak'));
    act(() => {
      fireEvent.submit(formEl);
    });
    const message = contact.querySelector('pre')!.textContent!;
    expect(message).toContain('Komoditas: Pala & Fuli');
    expect(message).toContain('Volume: 500 kg');
    expect(message).toContain('Sampel: Ya');
    const wa = within(contact).getByRole('link', { name: 'Buka WhatsApp' });
    expect(decodeURIComponent(wa.getAttribute('href')!)).toBe(`https://wa.me/6281234567890?text=${message}`);
    fireEvent.click(within(contact).getByRole('button', { name: 'Ubah isian' }));
    expect(within(contact).getByRole('form')).toBeInTheDocument();
  });

  it('akordeon tanya jawab: aria-expanded/aria-controls, panel role=region, satu terbuka', () => {
    const faq = section(demo(), 'faq');
    const buttons = within(faq).getAllByRole('button');
    expect(buttons).toHaveLength(6);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'true');
    const region = document.getElementById(buttons[0].getAttribute('aria-controls')!)!;
    expect(region).toHaveAttribute('role', 'region');
    fireEvent.click(buttons[2]);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'false');
    expect(buttons[2]).toHaveAttribute('aria-expanded', 'true');
    expect(within(faq).getByRole('link', { name: /Tanya lewat WhatsApp/ }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/6281234567890\?text=/);
  });

  it('kalender panen: batang sesuai bulan (aria-hidden), ringkasan teks untuk pembaca layar', () => {
    const season = section(demo(), 'season');
    const rows = season.querySelectorAll('.sg-cal ul > li');
    expect(rows).toHaveLength(7);
    const bars = (row: Element) => Array.from(row.querySelectorAll<HTMLElement>('.sg-bar')).map((b) => `${b.classList.contains('sg-bar-peak') ? 'P' : 'H'}:${b.style.left}/${b.style.width}`);
    expect(bars(rows[0])).toEqual(['H:33.33333333333333%/41.66666666666667%', 'P:41.66666666666667%/25%']);
    expect(bars(rows[2])).toHaveLength(3);
    // Ringkasan teks memakai keterangan batang dari CMS (sama dengan legenda di sampingnya)
    expect(rows[0].textContent).toContain('Musim panen Mei–Sep · panen raya Jun–Agu');
    for (const bar of season.querySelectorAll('.sg-bar')) expect(bar.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(season.querySelector('.sg-cal')!.className).toContain('tpl-reveal');
  });

  it('kalender panen dalam bahasa lain: awalan ringkasan ikut keterangan batang; kosong → "Panen" / "puncak"', () => {
    const english = section(demo({ season: { legend_harvest: 'Harvest', legend_peak: 'Peak', month_labels: 'Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec' } }), 'season');
    expect(english.querySelector('.sg-cal ul > li')!.textContent).toContain('Harvest Mei–Sep · peak Jun–Agu');
    cleanup();
    const bare = section(demo({ season: { legend_harvest: '', legend_peak: '' } }), 'season');
    expect(bare.querySelector('.sg-cal ul > li')!.textContent).toContain('Panen Mei–Sep · puncak Jun–Agu');
  });

  it('pita ajakan espresso satu-satunya bertema gelap; footer kertas dengan nama besar dan media sosial', () => {
    const container = demo();
    const inverse = Array.from(container.querySelectorAll('[data-tpl-tone="inverse"]')).map((el) => el.getAttribute('data-tpl-section'));
    expect(inverse).toEqual(['cta']);
    const cta = section(container, 'cta');
    expect(cta.className).toContain('bg-[#2A1D15]');
    // Lengkung hantu hanya mulai @6xl (di 1024px garisnya memotong paragraf ajakan)
    expect(cta.querySelector('svg[viewBox="0 0 480 640"]')!.getAttribute('class')).toContain('@6xl:block');
    // Tanda kutip testimoni menggantung hanya @5xl (di tablet daftar selebar penuh → tetap di dalam)
    const quoteMark = section(container, 'testimonials').querySelector('blockquote > span')!;
    expect(quoteMark.className).toContain('@5xl:-left-[0.62em]');
    expect(quoteMark.className).not.toContain('@3xl:-left');
    const footer = container.querySelector('footer')!;
    expect(footer.getAttribute('data-tpl-section')).toBe('footer');
    expect(footer.className).toContain('bg-[#F7F2E8]');
    expect(footer.textContent).toContain(`© ${new Date().getFullYear()} PT Saudagar Hasil Bumi. Semua hak dilindungi.`);
    expect(linkList(within(footer).getByRole('navigation', { name: 'Tautan footer' }))).toContain('Komoditas|#products');
    expect(within(footer).getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://instagram.com/saudagarhasilbumi.contoh');
    expect(within(footer).getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', 'https://linkedin.com/company/saudagar-hasil-bumi-contoh');
  });

  it('datar: tidak ada kelas shadow di template (kecuali tombol melayang Shell)', () => {
    const container = demo();
    const shadows = Array.from(container.querySelectorAll('[class*="shadow"]')).filter(
      (el) => !el.closest('[aria-label="Chat WhatsApp"]') && !/Chat WhatsApp|Kembali ke atas/.test(el.getAttribute('aria-label') ?? ''),
    );
    expect(shadows.map((el) => el.className)).toEqual([]);
    const files = ['Saudagar', 'Header', 'Hero', 'About', 'Products', 'Quality', 'Season', 'Markets', 'Gallery', 'Testimonials', 'Faq', 'Closing', 'InquiryForm', 'Footer', 'ui', 'marks'];
    const source = [
      ...files.map((f) => readFileSync(resolve(ROOT, `src/templates/saudagar/${f}.tsx`), 'utf8')),
      ...['styles', 'model', 'icons', 'hooks', 'schema', 'defaultContent', 'photos'].map((f) => readFileSync(resolve(ROOT, `src/templates/saudagar/${f}.ts`), 'utf8')),
      readFileSync(resolve(ROOT, 'src/templates/saudagar/saudagar.css'), 'utf8'),
    ].join('\n');
    expect(source).not.toMatch(/\bshadow-|box-shadow|drop-shadow/);
  });
});

describe('Saudagar: gerak', () => {
  it('pratinjau CMS diam dan tanpa tautan wa.me terbuka', () => {
    const { container } = render(<def.Component content={resolveContent(def, null)} preview />);
    expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'off');
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
  });

  it('saudagar.css: animasi bergerbang [data-tpl-motion=\'on\'], blok prefers-reduced-motion, kelas sg-', () => {
    const css = readFileSync(resolve(ROOT, 'src/templates/saudagar/saudagar.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).toContain('@layer components');
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    for (const rule of css.match(/^\s*[^@\s{}][^{}]*\{[^}]*\b(transition|animation):[^}]*\}/gm) ?? []) {
      const selector = rule.split('{')[0];
      if (/transition:\s*none|animation:\s*none/.test(rule)) continue;
      expect(selector, rule).toContain("[data-tpl-motion='on']");
    }
    for (const cls of css.match(/\.[a-z][\w-]*/g) ?? []) if (!/^\.(tpl-)/.test(cls)) expect(cls, cls).toMatch(/^\.sg-/);
  });
});

describe('Saudagar: warna tema bisa diganti', () => {
  it('saffron bawaan → --tpl-accent & tinta gelap di atasnya; warna CMS mengalir ke semua turunan', () => {
    const base = demo();
    expect(rootStyle(base, '--tpl-accent')).toBe('#b7791f');
    expect(rootStyle(base, '--tpl-on-accent')).toBe('#121620');
    const baseInk = rootStyle(base, '--sg-ink');
    expect(baseInk).toBe((saudagarVars('#B7791F') as Record<string, string>)['--sg-ink']);
    cleanup();
    const green = demo({ brand: { accent_color: '#047857' } });
    expect(rootStyle(green, '--tpl-accent')).toBe('#047857');
    for (const name of ['--sg-ink', '--sg-bright', '--sg-tint', '--sg-line']) {
      expect(rootStyle(green, name), name).toBe((saudagarVars('#047857') as Record<string, string>)[name]);
    }
    expect(rootStyle(green, '--sg-ink')).not.toBe(baseInk);
    cleanup();
    expect(rootStyle(demo({ brand: { accent_color: '#FACC15' } }), '--tpl-on-accent')).toBe('#121620');
  });
});

describe('Saudagar: SEO situs pembeli, judul, gambar, tautan', () => {
  it('judul tab & meta description dari nama, tagline, dan deskripsi hero; theme-color = aksen', () => {
    expect(siteTitle('saudagar', null)).toBe('PT Saudagar Hasil Bumi — Eksportir Kopi, Kakao & Rempah');
    const restore = applySiteHead('saudagar', null);
    const description = document.head.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
    expect(description).toMatch(/^PT Saudagar Hasil Bumi memasok kopi, kakao/);
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(200);
    expect(document.head.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#B7791F');
    restore();
  });

  it('satu H1, tiap section diawali tepat satu H2, H3 hanya di bawah H2, tanpa h4–h6', () => {
    const container = demo();
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelectorAll('h4, h5, h6')).toHaveLength(0);
    for (const key of ORDER.filter((k) => k !== 'hero')) {
      const levels = Array.from(section(container, key).querySelectorAll('h1, h2, h3')).map((h) => h.tagName);
      expect(levels[0], key).toBe('H2');
      expect(levels.filter((l) => l === 'H2'), key).toHaveLength(1);
    }
    expect(section(container, 'hero').querySelector('h2, h3')).toBeNull();
  });

  it('gambar: alt deskriptif, width/height, srcset & sizes; foto bulat kecil boleh alt kosong', () => {
    const container = demo();
    const imgs = Array.from(container.querySelectorAll('img'));
    expect(imgs.length).toBeGreaterThan(15);
    for (const img of imgs) {
      const src = img.getAttribute('src') ?? '';
      expect(img.hasAttribute('alt'), src).toBe(true);
      expect(Number(img.getAttribute('width')), src).toBeGreaterThan(0);
      expect(Number(img.getAttribute('height')), src).toBeGreaterThan(0);
      expect(img.getAttribute('srcset'), src).toMatch(/ (800|240)w, /);
      expect(img.getAttribute('sizes'), src).toBeTruthy();
      const alt = img.getAttribute('alt')!;
      if (img.className.includes('rounded-full')) expect(alt, src).toBe('');
      else expect(alt.split(' ').length, src).toBeGreaterThanOrEqual(5);
    }
  });

  it('tautan asli untuk navigasi, tombol hanya untuk aksi (kecuali kirim formulir); SVG dekoratif tersembunyi', () => {
    const container = demo();
    for (const a of container.querySelectorAll('a')) expect(a.getAttribute('href'), a.textContent ?? '').toMatch(/^(#[a-z]|https:\/\/|mailto:|tel:)/);
    for (const button of container.querySelectorAll('button')) {
      expect(button.getAttribute('type'), button.textContent ?? '').toBe(button.closest('form') && /WhatsApp/.test(button.textContent ?? '') ? 'submit' : 'button');
    }
    for (const svg of container.querySelectorAll('svg')) expect(svg.closest('[aria-hidden="true"], [aria-hidden=""]') ?? svg.getAttribute('aria-hidden'), svg.outerHTML.slice(0, 60)).toBeTruthy();
  });
});

describe('Saudagar: konten opsional kosong', () => {
  it('hero: satu foto samping → dua kolom; tanpa foto samping → lengkung tengah saja; tanpa foto → bidang tint tetap berbentuk lengkung', () => {
    const one = section(demo({ hero: { image_right: '' } }), 'hero');
    expect(one.querySelectorAll('.sg-rise')).toHaveLength(1);
    expect(one.innerHTML).toContain('@3xl:grid-cols-[1fr_1.15fr]');
    cleanup();
    const none = section(demo({ hero: { image_left: '', image_right: '' } }), 'hero');
    expect(none.querySelectorAll('img')).toHaveLength(1);
    expect(none.innerHTML).toContain('max-w-[440px]');
    cleanup();
    const empty = section(demo({ hero: { image: '', image_left: '', image_right: '' } }), 'hero');
    expect(empty.querySelector('img')).toBeNull();
    expect(empty.querySelector('[class*="rounded-t-full"]')).not.toBeNull();
  });

  it('satu kategori → tanpa tablist; kategori tanpa foto → kartu selebar penuh', () => {
    const products = section(
      demo({ products: { categories: [{ name: 'Kopi', intro: 'Kopi saja.' }], items: [{ category: 'Kopi', name: 'Arabika', grade: 'G1' }] } }),
      'products',
    );
    expect(within(products).queryByRole('tablist')).toBeNull();
    expect(products.querySelectorAll('article')).toHaveLength(1);
    expect(products.querySelector('img')).toBeNull();
    expect(products.innerHTML).toContain('@6xl:grid-cols-3');
  });

  it('tanpa angka, pendiri, dokumen, asal, atau foto ajakan → bagian itu tidak dirender; tanpa WhatsApp → tautan email', () => {
    const container = demo({
      about: { stats: [], founder_name: '', founder_role: '' },
      quality: { points: [], image: '' },
      markets: { origins: [] },
      cta: { image: '' },
      contact: { whatsapp: '' },
    });
    expect(section(container, 'about').querySelector('dl')).toBeNull();
    expect(section(container, 'about').textContent).not.toContain('Andi Rahmat Saputra');
    expect(section(container, 'quality').querySelector('img')).toBeNull();
    expect(section(container, 'quality').textContent).not.toContain('Bill of lading');
    expect(section(container, 'markets').querySelector('img')).toBeNull();
    expect(section(container, 'markets').textContent).toContain('Rotterdam');
    expect(section(container, 'cta').querySelector('img')).toBeNull();
    const contact = section(container, 'contact');
    const formEl = within(contact).getByRole('form');
    // Tanpa nomor WhatsApp: tombol tidak menjanjikan WhatsApp
    const submit = within(formEl).getByRole('button', { name: 'Susun pesan' });
    expect(submit).toHaveAttribute('type', 'submit');
    expect(submit.querySelector('svg')).toBeNull();
    fireEvent.change(within(formEl).getByLabelText('Nama'), { target: { value: 'Rina' } });
    fireEvent.change(within(formEl).getByLabelText('Negara tujuan'), { target: { value: 'Jepang' } });
    fireEvent.change(within(formEl).getByLabelText('Komoditas'), { target: { value: 'Kopra' } });
    fireEvent.change(within(formEl).getByLabelText('Volume'), { target: { value: '1' } });
    act(() => {
      fireEvent.submit(formEl);
    });
    expect(contact.textContent).toContain('Periksa isinya, lalu kirim lewat email.');
    expect(contact.textContent).not.toMatch(/WhatsApp belum diisi/);
    expect(within(contact).getByRole('link', { name: 'Kirim lewat email' }).getAttribute('href')).toMatch(/^mailto:ekspor@saudagar-hasilbumi\.example\?subject=/);
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
  });

  it('tanpa WhatsApp dan email → formulir tetap berguna: "Salin pesan" menyalin pesan ke clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    try {
      const contact = section(demo({ contact: { whatsapp: '', email: '' } }), 'contact');
      const formEl = within(contact).getByRole('form');
      expect(within(formEl).getByRole('button', { name: 'Susun pesan' })).toBeInTheDocument();
      fireEvent.change(within(formEl).getByLabelText('Nama'), { target: { value: 'Rina' } });
      fireEvent.change(within(formEl).getByLabelText('Negara tujuan'), { target: { value: 'Jepang' } });
      fireEvent.change(within(formEl).getByLabelText('Komoditas'), { target: { value: 'Kopra' } });
      fireEvent.change(within(formEl).getByLabelText('Volume'), { target: { value: '1' } });
      act(() => {
        fireEvent.submit(formEl);
      });
      expect(contact.textContent).toContain('Salin pesan ini, lalu kirim ke kontak kami.');
      expect(within(contact).queryByRole('link', { name: /email|WhatsApp/ })).toBeNull();
      const message = contact.querySelector('pre')!.textContent!;
      await act(async () => {
        fireEvent.click(within(contact).getByRole('button', { name: 'Salin pesan' }));
      });
      expect(writeText).toHaveBeenCalledWith(message);
      expect(within(contact).getByRole('button', { name: 'Tersalin' })).toHaveAttribute('type', 'button');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('nama kategori/komoditas kembar tidak membuat key React ganda', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const contact = section(
        demo({
          products: {
            categories: [{ name: 'Kopi' }, { name: 'Lainnya' }],
            items: [
              { category: 'Kopi', name: 'Arabika Toraja', grade: 'G1' },
              { category: 'Kopi', name: 'Arabika Toraja', grade: 'G2' },
              { category: 'Lainnya', name: 'Vanili' },
              { name: 'Lada' },
            ],
          },
        }),
        'contact',
      );
      expect(Array.from(contact.querySelectorAll('optgroup')).map((g) => `${g.label}:${g.children.length}`)).toEqual(['Kopi:2', 'Lainnya:2']);
      expect(errors.mock.calls.map((c) => String(c[0])).filter((m) => /same key/.test(m))).toEqual([]);
    } finally {
      errors.mockRestore();
    }
  });
});

describe('Saudagar: editor CMS', () => {
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
        fireEvent.click(box.getAllByRole('button', { name: new RegExp(`^${f.itemLabel} 1(?![0-9])`) })[0]);
        for (const sub of f.fields) expect(container.textContent, `${s.key}.${f.key}.${sub.key}`).toContain(sub.label);
      }
      unmount();
    }
  }, 60_000);
});

describe('Saudagar: data katalog', () => {
  const sql = (file: string) => readFileSync(resolve(ROOT, file), 'utf8');

  it.each(['database/seed.templates.sql', 'database/migrations/2026-10-27_036_saudagar_template.sql'])(
    '%s: baris saudagar dengan template_code, kategori, harga, dan pratinjau tangkapan layar .webp',
    (file) => {
      const text = sql(file);
      expect(text).toContain("'saudagar'");
      expect(text).toContain("'Company Profile'");
      expect(text).toContain('1690000.00');
      expect(text).toContain("'/assets/templates/saudagar-preview.webp'");
      expect(text).toContain('\'["/assets/templates/saudagar-1.webp","/assets/templates/saudagar-2.webp"]\'');
      expect(text).toMatch(/data tidak disimpan di website, harga komoditas tidak diperbarui otomatis, dan tidak ada pelacakan kiriman/);
    },
  );

  it('migrasi 036 aman diulang (INSERT IGNORE + UPDATE berdasarkan slug, tanpa DELETE) dan tercatat di schema_migrations', () => {
    const raw = sql('database/migrations/2026-10-27_036_saudagar_template.sql');
    expect(raw).toMatch(/Domain\s+(--\s+)?tidak termasuk harga template/);
    const text = raw.replace(/^--.*$/gm, '');
    expect(text).toMatch(/INSERT IGNORE INTO templates/);
    expect(text).toMatch(/WHERE slug = 'saudagar';/);
    expect(text).toMatch(/sort_order\s+= 19/);
    expect(text).toMatch(/status\s+= 'published'/);
    expect(text).not.toMatch(/\bDELETE\b/);
    expect(text).toContain("VALUES ('2026-10-27_036', 'templates: katalog Saudagar')");
  });

  it('gambar pratinjau katalog ada di public/, 1600×1000, dan ringan', () => {
    for (const name of ['saudagar-preview', 'saudagar-1', 'saudagar-2']) {
      const path = resolve(ROOT, `public/assets/templates/${name}.webp`);
      expect(existsSync(path), name).toBe(true);
      const kb = statSync(path).size / 1024;
      expect(kb, name).toBeGreaterThan(10);
      expect(kb, name).toBeLessThan(220);
      const head = readFileSync(path).subarray(0, 30);
      const chunk = head.toString('ascii', 12, 16);
      const size = chunk === 'VP8X' ? [head.readUIntLE(24, 3) + 1, head.readUIntLE(27, 3) + 1] : [head.readUInt16LE(26) & 0x3fff, head.readUInt16LE(28) & 0x3fff];
      expect(['VP8 ', 'VP8X'], name).toContain(chunk);
      expect(size, name).toEqual([1600, 1000]);
    }
  });
});

describe('Saudagar: konten aneh', () => {
  it('angka, null, dan string di tempat list tidak membuat crash; tautan berbahaya dibuang', () => {
    const weird = {
      hero: { image_left: 'javascript:alert(1)', highlight: 'tidak ada di judul', primary_url: 'javascript:alert(1)' },
      about: { stats: [{ value: 5 }, null], body: 42 },
      products: { categories: 'x', items: [null, { name: 3, category: 7 }, { name: 'Kopi', moq: null }] },
      quality: { steps: [{ title: 2 }], points: 'x' },
      season: { items: [{ name: 'Lada', harvest: 9, peak: 'kapan-kapan' }], month_labels: 5 },
      markets: { origins: [{ name: 'X', image: 'javascript:alert(1)' }], destinations: 'x' },
      gallery: { items: [{ image: 'javascript:alert(1)' }, 'x'] },
      testimonials: { items: [{ quote: 'Baik', photo: 'javascript:alert(1)' }] },
      faq: { items: [{ question: 2, answer: null }], button_url: 'vbscript:x' },
      contact: { whatsapp: 'abc', units: 'x', incoterms: [{ label: 3 }] },
      footer: { instagram: 'javascript:alert(1)' },
      brand: { accent_color: 'oranye' },
    } as unknown as SiteContent;
    const { container } = render(<def.Component content={resolveContent(def, weird)} />);
    expect(container.querySelector('a[href^="javascript:"], a[href^="vbscript:"]')).toBeNull();
    expect(container.querySelector('img[src^="javascript:"]')).toBeNull();
    expect(container.querySelector('h1')!.textContent).toBe('Kopi, kakao, dan rempah dari tanah Sulawesi');
    expect(section(container, 'season').textContent).toContain('Lada');
    expect(sectionKeys(container)).not.toContain('gallery');
  });
});
