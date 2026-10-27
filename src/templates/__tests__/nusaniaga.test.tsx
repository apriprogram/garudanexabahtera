// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/nusaniaga.test.tsx
// NusaNiaga (company profile importir & distributor bahan baku dan mesin 2026-10-27): skema CMS & konten demo, helper
// model (warna turunan, menu, tujuan tautan, section tampil, formulir penawaran → pesan WhatsApp), demo (urutan section,
// hero berbilah, chip negara asal, header + menu HP, akordeon proses & FAQ, formulir), datar tanpa bayangan, gerak
// (pratinjau CMS diam, CSS nn- bergerbang data-tpl-motion), warna aksen, SEO situs pembeli, judul & gambar & tautan,
// konten opsional kosong, editor CMS, data katalog (migrasi 037 + seed + pratinjau), dan konten aneh.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionEditor } from '../../pages/account/cms/SectionEditor';
import { validateContent } from '../../pages/account/cms/validation';
import { TEMPLATES, resolveContent } from '../index';
import { iconKey } from '../nusaniaga/icons';
import {
  EMPTY_INQUIRY,
  PAGE_SECTIONS,
  accentIsDark,
  inquiryMessage,
  mailtoHref,
  navItems,
  needOptions,
  nusaniagaVars,
  sectionShown,
  sectionTarget,
  validateInquiry,
  type InquiryForm,
} from '../nusaniaga/model';
import { NUSANIAGA_PHOTOS } from '../nusaniaga/photos';
import { applySiteHead, siteTitle } from '../siteHead';
import { SiteRenderer } from '../SiteRenderer';
import { contrast, parseHex } from '../shared/utils';
import { isListField, type SiteContent } from '../types';

// Demo panjang + getByRole di jsdom: bisa lewat 5 dtk saat suite berjalan paralel
vi.setConfig({ testTimeout: 30_000 });

const ROOT = process.cwd();
const DIR = resolve(ROOT, 'src/templates/nusaniaga');
const def = TEMPLATES.nusaniaga;
const ORDER = ['hero', 'clients', 'services', 'products', 'process', 'coverage', 'advantages', 'testimonials', 'faq', 'cta', 'contact'];
const sectionKeys = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-tpl-section]')).map((s) => s.getAttribute('data-tpl-section'));
const section = (root: HTMLElement, key: string) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`)!;
const demo = (content: unknown = null, preview = false) => render(<SiteRenderer templateCode="nusaniaga" content={content} preview={preview} />).container;
const rgb = (hex: string) => parseHex(hex)!;
const publicFile = (url: string) => resolve(ROOT, 'public', url.replace(/^\//, ''));
const rootStyle = (container: HTMLElement, name: string) => {
  const holder = Array.from(container.querySelectorAll<HTMLElement>('[style]')).find((el) => el.style.getPropertyValue(name));
  return holder?.style.getPropertyValue(name) ?? '';
};
const urls = (src: string) => {
  const asset = NUSANIAGA_PHOTOS.asset(src)!;
  return [asset.src, ...asset.srcSet!.split(',').map((part) => part.trim().split(' ')[0])].filter((u, i, all) => all.indexOf(u) === i);
};
const form = (patch: Partial<InquiryForm> = {}): InquiryForm => ({
  ...EMPTY_INQUIRY,
  name: 'Rina Kartika',
  company: 'PT Contoh Plastik Jaya',
  need: 'Bahan baku',
  product: 'Resin PP homopolimer, MFI 12',
  volume: '20 ton per bulan',
  location: 'Kawasan industri, Karawang',
  ...patch,
});
const sourceFiles = readdirSync(DIR).filter((name) => /\.(ts|tsx|css)$/.test(name));

let scrolled: (string | null)[] = [];
beforeEach(() => {
  scrolled = [];
  Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
    scrolled.push(this.getAttribute('data-tpl-section'));
  });
});
afterEach(cleanup);

describe('NusaNiaga: skema & konten bawaan', () => {
  it('urutan form = urutan halaman, semua section bisa disembunyikan, field unik, list berbatas', () => {
    expect(def.code).toBe('nusaniaga');
    expect(def.name).toBe('NusaNiaga');
    expect(def.features).toBeUndefined();
    expect(def.sections.map((s) => s.key)).toEqual(['brand', ...ORDER, 'footer']);
    expect([...PAGE_SECTIONS]).toEqual([...ORDER, 'footer']);
    const fields = (key: string) => def.sections.find((s) => s.key === key)!.fields.map((f) => f.key);
    expect(fields('brand')).toEqual(['company_name', 'tagline', 'logo', 'accent_color']);
    expect(def.sections[0].fields.find((f) => f.key === 'accent_color')?.type).toBe('color');
    expect(fields('hero')).toEqual(expect.arrayContaining(['image', 'origin_label', 'primary_label', 'secondary_label', 'header_label', 'header_url']));
    expect(fields('contact')).toEqual(
      expect.arrayContaining(['address', 'maps_query', 'maps_url', 'phone', 'email', 'whatsapp', 'whatsapp_message', 'hours', 'form_needs']),
    );
    expect(fields('footer')).toEqual(expect.arrayContaining(['instagram', 'facebook', 'linkedin', 'youtube', 'tiktok']));
    const contact = def.sections.find((s) => s.key === 'contact')!;
    expect(contact.fields.find((f) => f.key === 'whatsapp')?.type).toBe('phone');
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
          for (const sub of f.fields) if (['text', 'textarea'].includes(sub.type)) expect(sub.maxLength, `${s.key}.${f.key}.${sub.key}`).toBeGreaterThan(0);
        } else if (['text', 'textarea', 'phone', 'email'].includes(f.type)) {
          expect(f.maxLength, `${s.key}.${f.key}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('konten demo valid, logo kosong, hero = foto 1440 lokal, setiap foto terdaftar, ada di public/, berkredit, dan terpakai', () => {
    const content = def.defaultContent;
    expect(validateContent(def, content)).toEqual({});
    expect(content.brand.logo).toBe('');
    expect(content.contact.whatsapp).toBe('081234567890');
    expect(content.hero.image).toBe('/assets/templates/photos/nusaniaga-hero-1440.webp');
    const json = JSON.stringify(content);
    const paths = Array.from(new Set(json.match(/\/assets\/templates\/photos\/[\w.-]+\.webp/g) ?? []));
    expect(paths.length).toBeGreaterThanOrEqual(13);
    for (const path of paths) {
      expect(NUSANIAGA_PHOTOS.asset(path), path).not.toBeNull();
      for (const url of urls(path)) expect(existsSync(publicFile(url)), url).toBe(true);
    }
    const credits = readFileSync(resolve(ROOT, 'public/assets/templates/photos/CREDITS.md'), 'utf8');
    for (const key of NUSANIAGA_PHOTOS.keys) {
      expect(credits, key).toContain(`\`${key}-*\``);
      expect(paths.some((p) => p.includes(`/${key}-`)), `${key} dipakai di konten demo`).toBe(true);
    }
  });

  it('simbol bawaan: path SVG publik identik dengan marks.tsx', () => {
    const d = (text: string) => Array.from(text.matchAll(/\bd="([^"]+)"/g), (m) => m[1]);
    const svg = readFileSync(resolve(ROOT, 'public/assets/templates/logos/nusaniaga-mark.svg'), 'utf8');
    const tsx = readFileSync(resolve(DIR, 'marks.tsx'), 'utf8');
    expect(d(svg)).toHaveLength(4);
    expect(d(svg)).toEqual(d(tsx));
    expect(svg).toContain('role="img"');
    expect(svg).toContain('aria-label="Simbol NusaNiaga"');
  });

  it('bobot foto: WebP saja, ≤ 140 KB per file, total ≤ 2,5 MB; hero srcset 800 / 1200 / 1440', () => {
    const files = readdirSync(resolve(ROOT, 'public/assets/templates/photos')).filter((name) => name.startsWith('nusaniaga-'));
    expect(files.length).toBeGreaterThanOrEqual(27);
    let total = 0;
    for (const name of files) {
      expect(name, name).toMatch(/\.webp$/);
      const kb = statSync(resolve(ROOT, 'public/assets/templates/photos', name)).size / 1024;
      expect(kb, name).toBeLessThanOrEqual(140);
      total += kb;
    }
    expect(total).toBeLessThanOrEqual(2500);
    const hero = NUSANIAGA_PHOTOS.asset(def.defaultContent.hero.image as string)!;
    expect(hero.srcSet!.split(',').map((part) => part.trim().split(' ')[1])).toEqual(['800w', '1200w', '1440w']);
  });

  it('salinan demo jujur: tanpa janji & klaim izin/sertifikat; formulir menyebut data tidak disimpan', () => {
    const json = JSON.stringify(def.defaultContent);
    expect(json).not.toMatch(/dijamin|garansi|pasti |terbaik nomor|termurah|#1|terdaftar di Bea Cukai|\bNIB\b|\bISO\b|Halal MUI|SVLK|API-U|izin resmi|katalog produk|tepat waktu/i);
    expect(json).toMatch(/data tidak disimpan di website/);
    // Angka yang muncul di beberapa tempat tetap sama
    expect(def.defaultContent.coverage.title).toContain('18 negara');
    expect(def.defaultContent.clients.title).toContain('140+ pabrik');
    expect(json).toContain('Gudang 6.500 m²');
    // 6.500 m² = gudang saja, di poin Layanan maupun di angka (bukan "gudang dan ruang uji")
    const stats = def.defaultContent.advantages.stats as { value: string; label: string }[];
    expect(stats.find((s) => s.value === '6.500')?.label).toBe('Luas gudang di Cikarang');
    expect(json).not.toMatch(/ruang uji/);
    // Alur proses mencakup asal Eropa: PO minggu 2 + 8–12 minggu (FAQ) → tiba paling lambat minggu 14
    const steps = def.defaultContent.process.steps as { title: string; duration: string }[];
    expect(steps.find((s) => s.title === 'Pengapalan & kepabeanan')?.duration).toBe('Minggu 4–14');
    expect(json).toContain('dari Eropa 8–12 minggu');
    // Subjudul testimoni sesuai ketiga testimoni (kemasan plastik, komponen logam, kemasan makanan)
    expect(def.defaultContent.testimonials.subtitle).toMatch(/^Pabrik kemasan plastik, komponen logam, dan kemasan makanan/);
  });

  it('skema: angka maks. 8 karakter (angka besar tidak meluber), tombol produk bisa diubah, label kalimat biasa', () => {
    const fieldOf = (section: string, key: string) => def.sections.find((s) => s.key === section)!.fields.find((f) => f.key === key)!;
    const stats = fieldOf('advantages', 'stats');
    expect(isListField(stats) && stats.fields.find((f) => f.key === 'value')?.maxLength).toBe(8);
    for (const stat of def.defaultContent.advantages.stats as { value: string }[]) expect(stat.value.length, stat.value).toBeLessThanOrEqual(8);
    const button = fieldOf('products', 'button_label');
    expect(button.type).toBe('text');
    expect(!isListField(button) && button.maxLength).toBe(30);
    expect(def.defaultContent.products.button_label).toBe('Minta data teknis');
    expect(fieldOf('contact', 'form_needs').label).toBe('Pilihan kebutuhan di formulir');
  });
});

describe('NusaNiaga: model', () => {
  it('warna turunan: tinta aksen terbaca di putih, pita abu, dan tint untuk semua warna; tidak valid → bawaan', () => {
    const white = rgb('#FFFFFF');
    const surface = rgb('#F2F4F7');
    const grid = ['#A61E3A', '#1D4ED8', '#0F5C63', '#B7791F', '#C2410C', '#FACC15', '#C6F135', '#2FB2FF', '#FFFFFF', '#000000'];
    for (const accent of grid) {
      const vars = nusaniagaVars(accent) as Record<string, string>;
      const ink = rgb(vars['--nn-ink']);
      const tint = rgb(vars['--nn-tint']);
      expect(contrast(ink, white), accent).toBeGreaterThanOrEqual(4.8);
      expect(contrast(ink, surface), accent).toBeGreaterThanOrEqual(4.6);
      expect(contrast(ink, tint), accent).toBeGreaterThanOrEqual(4.6);
    }
    const base = nusaniagaVars('#A61E3A') as Record<string, string>;
    expect(base['--nn-ink']).toBe('#a61e3a');
    expect(base['--nn-tint']).toBe('#f8edef');
    expect(base['--nn-line']).toBe('#e4bcc4');
    expect(nusaniagaVars('zzz')).toEqual(base);
    expect(nusaniagaVars('#B7791F')).toMatchObject({ '--nn-ink': '#8e5d18' });
    expect(accentIsDark('#A61E3A')).toBe(true);
    expect(accentIsDark('#FACC15')).toBe(false);
    expect(accentIsDark('bukan warna')).toBe(true);
  });

  it('menu hanya section yang tampil, label singkat dari label berbingkai; tujuan tautan & alias anchor', () => {
    const content = resolveContent(def, null);
    expect(navItems(content)).toEqual([
      { key: 'services', label: 'Layanan' },
      { key: 'products', label: 'Produk' },
      { key: 'process', label: 'Proses impor' },
      { key: 'coverage', label: 'Jangkauan' },
      { key: 'faq', label: 'FAQ' },
      { key: 'contact', label: 'Kontak' },
    ]);
    const hidden = resolveContent(def, { products: { items: [] }, faq: { enabled: false }, process: { eyebrow: 'Alur impor barang kami' } });
    expect(navItems(hidden).map((n) => n.key)).toEqual(['services', 'process', 'coverage', 'contact']);
    expect(navItems(hidden).find((n) => n.key === 'process')?.label).toBe('Proses');
    expect(sectionShown(content, 'tidak-ada')).toBe(false);
    expect(sectionShown(resolveContent(def, { clients: { items: [], industries: [] } }), 'clients')).toBe(false);
    expect(sectionShown(resolveContent(def, { coverage: { origins: [], areas: '' } }), 'coverage')).toBe(false);
    expect(sectionShown(resolveContent(def, { coverage: { origins: [] } }), 'coverage')).toBe(true);
    for (const [anchor, key] of [
      ['#produk', 'products'],
      ['jangkauan', 'coverage'],
      ['markets', 'coverage'],
      ['#kontak', 'contact'],
      ['penawaran', 'contact'],
      ['#layanan', 'services'],
      ['tanya-jawab', 'faq'],
      ['#tidak-ada', null],
    ] as const) {
      expect(sectionTarget(anchor), anchor).toBe(key);
    }
  });

  it('ikon dari judul layanan & keunggulan', () => {
    expect(def.defaultContent.services.items).toBeDefined();
    const titles = (key: 'services' | 'advantages') => (def.defaultContent[key].items as { title: string }[]).map((i) => iconKey(i.title));
    expect(titles('services')).toEqual(['sourcing', 'document', 'warehouse', 'truck', 'wrench', 'cog']);
    expect(titles('advantages')).toEqual(['account', 'receipt', 'warehouse', 'wrench']);
    expect(iconKey('Kualitas terjaga')).toBe('shield');
    expect(iconKey('Lainnya')).toBe('boxes');
  });

  it('formulir: validasi isian wajib & pilihan kebutuhan; pesan tersusun berurutan tanpa isian bawaan', () => {
    const needs = needOptions(def.defaultContent.contact);
    expect(needs).toEqual(['Bahan baku', 'Mesin', 'Suku cadang', 'Sourcing pemasok']);
    expect(needOptions({})).toEqual(['Bahan baku', 'Mesin', 'Suku cadang', 'Sourcing pemasok']);
    expect(validateInquiry(EMPTY_INQUIRY, { needs })).toEqual({
      name: 'Tulis nama Anda.',
      company: 'Tulis nama perusahaan.',
      need: 'Pilih kebutuhan Anda.',
      product: 'Tulis produk dan spesifikasinya.',
      volume: 'Tulis perkiraan volume.',
      location: 'Tulis lokasi pabrik atau kota tujuan.',
    });
    expect(validateInquiry(form(), { needs })).toEqual({});
    expect(validateInquiry(form({ need: 'Lainnya' }), { needs })).toEqual({ need: 'Pilih kebutuhan Anda.' });
    expect(validateInquiry(form({ name: '  R ' }), { needs })).toEqual({ name: 'Tulis nama Anda.' });

    expect(inquiryMessage(form({ origin: 'Korea Selatan', incoterm: 'DDP', start: 'Januari 2027', note: 'Mohon sertakan data teknis.' }), 'PT Arunika Niaga Internasional')).toBe(
      [
        'Halo PT Arunika Niaga Internasional, saya ingin meminta penawaran.',
        '',
        'Nama: Rina Kartika',
        'Perusahaan: PT Contoh Plastik Jaya',
        'Kebutuhan: Bahan baku',
        'Produk/spesifikasi: Resin PP homopolimer, MFI 12',
        'Volume: 20 ton per bulan',
        'Negara asal: Korea Selatan',
        'Incoterm: DDP',
        'Lokasi pabrik: Kawasan industri, Karawang',
        'Mulai dibutuhkan: Januari 2027',
        'Catatan: Mohon sertakan data teknis.',
      ].join('\n'),
    );
    const plain = inquiryMessage(form({ note: 'baris\nkedua\u0007' }), '');
    expect(plain.startsWith('Halo, saya ingin meminta penawaran.\n\n')).toBe(true);
    expect(plain).not.toMatch(/Negara asal|Incoterm|Mulai dibutuhkan/);
    expect(plain).toContain('Catatan: baris kedua');
    expect(inquiryMessage(form({ name: 'x'.repeat(200) }), 'PT A')).toContain(`Nama: ${'x'.repeat(60)}\n`);

    const mail = mailtoHref('penawaran@arunikaniaga.test', 'Permintaan penawaran', '😀'.repeat(900));
    expect(mail).toMatch(/^mailto:penawaran@arunikaniaga\.test\?subject=Permintaan%20penawaran&body=/);
    expect(decodeURIComponent(mail.split('body=')[1]).length).toBeGreaterThan(0);
    expect(mail.split('body=')[1].length).toBeLessThanOrEqual(1800);
    expect(mailtoHref('bukan email', 'x', 'y')).toBe('');
  });
});

describe('NusaNiaga: demo', () => {
  it('urutan section, satu H1, hero "slatted": foto LCP (eager, srcset, ukuran, alt) di wadah berbilah tanpa gerak masuk', () => {
    const container = demo();
    expect(sectionKeys(container)).toEqual([...ORDER, 'footer']);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const hero = section(container, 'hero');
    expect(hero.getAttribute('data-hero-layout')).toBe('slatted');
    expect(hero.querySelector('h1')!.textContent).toBe('Bahan baku dan mesin impor, sampai di lini produksi Anda');
    expect(hero.querySelector('h1 span')!.textContent).toBe('lini produksi');
    const img = hero.querySelector<HTMLImageElement>('img[fetchpriority="high"]')!;
    expect(img.getAttribute('src')).toBe('/assets/templates/photos/nusaniaga-hero-1440.webp');
    expect(img.getAttribute('loading')).toBe('eager');
    expect(img.getAttribute('srcset')).toContain(' 800w');
    expect(img.getAttribute('width')).toBe('1440');
    expect(img.getAttribute('height')).toBe('1800');
    expect(img.getAttribute('alt')).toBe('Lorong gudang dengan rak palet tinggi berisi kardus yang tertata rapi');
    expect(container.querySelectorAll('img[loading="eager"]')).toHaveLength(1);
    const frame = img.parentElement!;
    expect(frame.className).toContain('nn-slats');
    expect(frame.className).not.toMatch(/tpl-reveal|tpl-photo-zoom|tpl-photo-parallax/);
    expect(img.className).not.toMatch(/tpl-photo-zoom|tpl-photo-parallax/);
    expect(frame.closest('.tpl-reveal')).toBeNull();
    // Layar lebar: tinggi foto MINIMUM (bukan tetap), jadi bilah meregang sampai dasar hero bila kolom teks lebih tinggi
    const box = frame.parentElement!;
    expect(box.className).toContain('@5xl:row-[1/-1]');
    expect(box.className).toContain('@5xl:min-h-[clamp(580px,calc(100svh-72px),820px)]');
    expect(box.className).not.toMatch(/@5xl:h-\[/);
  });

  it('chip negara asal = tautan sungguhan ke Jangkauan (maks. 8); Jangkauan disembunyikan → chip tanpa tautan', () => {
    const container = demo();
    const chips = section(container, 'hero').querySelectorAll('a[href="#coverage"]');
    expect(chips).toHaveLength(8);
    expect(chips[0].textContent).toBe('DEJerman');
    // Cincin fokus di dalam chip: baris chip HP adalah wadah gulir yang memotong outline di luar chip
    for (const chip of chips) expect(chip.className).toContain('focus-visible:outline-offset-[-2px]');
    fireEvent.click(chips[2]);
    expect(scrolled).toEqual(['coverage']);
    cleanup();
    const off = demo({ coverage: { enabled: false } });
    expect(section(off, 'hero').querySelector('a[href="#coverage"]')).toBeNull();
    expect(section(off, 'hero').textContent).toContain('Korea Selatan');
    cleanup();
    expect(section(demo({ coverage: { origins: [] } }), 'hero').textContent).not.toContain('Negara asal');
  });

  it('header: menu utama, blok aksen "Minta Penawaran" ke Kontak; menu HP terbuka, Esc menutup & fokus kembali', () => {
    const container = demo();
    const header = container.querySelector('header')!;
    const navs = within(header).getAllByRole('navigation', { name: 'Menu utama' });
    expect(navs).toHaveLength(1);
    expect(within(navs[0]).getAllByRole('link').map((a) => `${a.textContent}|${a.getAttribute('href')}`)).toEqual([
      'Layanan|#layanan',
      'Produk|#products',
      'Proses impor|#process',
      'Jangkauan|#coverage',
      'FAQ|#faq',
      'Kontak|#kontak',
    ]);
    const cta = within(header).getAllByRole('link', { name: 'Minta Penawaran' });
    expect(cta[0].getAttribute('href')).toBe('#kontak');
    const toggle = within(header).getByRole('button', { name: 'Buka menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(within(header).getAllByRole('navigation', { name: 'Menu utama' })).toHaveLength(2);
    expect(within(header).getByRole('button', { name: 'Tutup menu' })).toHaveAttribute('aria-expanded', 'true');
    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });
    expect(within(header).getAllByRole('navigation', { name: 'Menu utama' })).toHaveLength(1);
    expect(document.activeElement).toBe(within(header).getByRole('button', { name: 'Buka menu' }));
  });

  it('akordeon proses: langkah pertama terbuka, satu terbuka, panel region berlabel, tertutup inert; garis alur bernomor', () => {
    const process = section(demo(), 'process');
    const buttons = within(process).getAllByRole('button');
    expect(buttons).toHaveLength(5);
    expect(buttons.map((b) => b.getAttribute('aria-expanded'))).toEqual(['true', 'false', 'false', 'false', 'false']);
    for (const button of buttons) {
      expect(button.closest('h3')).not.toBeNull();
      const panel = process.ownerDocument.getElementById(button.getAttribute('aria-controls')!)!;
      expect(panel.getAttribute('role')).toBe('region');
      expect(panel.getAttribute('aria-labelledby')).toBe(button.id);
      expect(panel.hasAttribute('inert')).toBe(button.getAttribute('aria-expanded') === 'false');
    }
    fireEvent.click(buttons[2]);
    expect(buttons.map((b) => b.getAttribute('aria-expanded'))).toEqual(['false', 'false', 'true', 'false', 'false']);
    fireEvent.click(buttons[2]);
    expect(buttons.every((b) => b.getAttribute('aria-expanded') === 'false')).toBe(true);
    expect(process.querySelectorAll('.nn-node')).toHaveLength(5);
    expect(process.querySelectorAll('.nn-lane-seg')).toHaveLength(4);
    expect(process.textContent).toContain('Penawaran tertulis');
  });

  it('FAQ: dua kolom kartu buka-tutup (paruh pertama kiri), pertanyaan pertama terbuka, tautan tanya ke WhatsApp', () => {
    const faq = section(demo(), 'faq');
    const buttons = within(faq).getAllByRole('button');
    expect(buttons).toHaveLength(6);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'true');
    expect(buttons[0].textContent).toBe('Berapa minimum pemesanan?');
    expect(buttons[3].textContent).toBe('Bisakah saya meminta sampel atau melihat mesinnya lebih dulu?');
    fireEvent.click(buttons[4]);
    expect(buttons.filter((b) => b.getAttribute('aria-expanded') === 'true')).toEqual([buttons[4]]);
    expect(within(faq).getByRole('link', { name: 'Tanya lewat WhatsApp' }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/6281234567890\?text=/);
  });

  it('FAQ: cincin fokus di kartu (kartu overflow-hidden memotong outline tombol), tombol tanpa outline sendiri', () => {
    const faq = section(demo(), 'faq');
    for (const button of within(faq).getAllByRole('button')) {
      expect(button.className).toContain('focus-visible:outline-none');
      const card = button.closest('h3')!.parentElement!;
      expect(card.className).toContain('overflow-hidden');
      expect(card.className).toContain('has-[button:focus-visible]:outline-2');
      expect(card.className).toContain('has-[button:focus-visible]:outline-offset-2');
      expect(card.className).toContain('has-[button:focus-visible]:outline-(--tpl-accent-ink)');
    }
  });

  it('produk: daftar bisa digeser (region berlabel, bisa difokus), jenis & negara asal, tombol data teknis ke Kontak', () => {
    const products = section(demo(), 'products');
    const region = within(products).getByRole('region', { name: 'Daftar produk' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(products.querySelectorAll('article')).toHaveLength(6);
    expect(products.textContent).toContain('Korea Selatan · Thailand');
    expect(products.textContent).toContain('Sak 25 kg · mulai 1 palet');
    expect(within(products).getByRole('link', { name: 'Minta data teknis' }).getAttribute('href')).toBe('#kontak');
  });

  it('produk: teks tombol dari CMS; dikosongkan → tanpa tombol (catatan tetap tampil)', () => {
    const custom = section(demo({ products: { button_label: 'Minta katalog harga' } }), 'products');
    expect(within(custom).getByRole('link', { name: 'Minta katalog harga' }).getAttribute('href')).toBe('#kontak');
    expect(within(custom).queryByRole('link', { name: 'Minta data teknis' })).toBeNull();
    cleanup();
    const empty = section(demo({ products: { button_label: '' } }), 'products');
    expect(empty.querySelectorAll('a')).toHaveLength(0);
    expect(empty.textContent).toContain('Data teknis dan harga terbaru');
    cleanup();
    // Tanpa catatan DAN tanpa teks tombol → tanpa baris bawah sama sekali
    const none = section(demo({ products: { button_label: '', note: '' } }), 'products');
    expect(none.querySelector('.border-t.pt-8')).toBeNull();
  });

  it('produk: grid statis (tidak bisa digeser) bukan tab stop/region; rel yang bisa digeser tetap bisa difokus', () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    try {
      // jsdom: scrollWidth = clientWidth = 0 → tidak bisa digeser (seperti grid tablet/desktop)
      const grid = section(demo(), 'products');
      expect(within(grid).queryByRole('region', { name: 'Daftar produk' })).toBeNull();
      expect(grid.querySelector('[tabindex]')).toBeNull();
      cleanup();
      const wide = vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockReturnValue(1864);
      const box = vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(390);
      const rail = section(demo(), 'products');
      expect(within(rail).getByRole('region', { name: 'Daftar produk' })).toHaveAttribute('tabindex', '0');
      wide.mockRestore();
      box.mockRestore();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('formulir penawaran: galat terfokus, lalu pesan WhatsApp tersusun (tanpa disimpan), "Ubah data" kembali', () => {
    const contact = section(demo(), 'contact');
    const formEl = within(contact).getByRole('form', { name: 'Formulir permintaan penawaran' });
    expect(formEl.getAttribute('action')).toBeNull();
    expect(contact.textContent).toContain('data tidak disimpan di website');
    act(() => {
      fireEvent.submit(formEl);
    });
    const name = within(formEl).getByLabelText('Nama');
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name.getAttribute('aria-describedby')).toBe(`${name.id}-error`);
    expect(document.activeElement).toBe(name);
    expect(formEl.querySelectorAll('[aria-invalid="true"]')).toHaveLength(6);

    fireEvent.change(name, { target: { value: 'Rina Kartika' } });
    fireEvent.change(within(formEl).getByLabelText('Perusahaan'), { target: { value: 'PT Contoh Plastik Jaya' } });
    fireEvent.change(within(formEl).getByLabelText('Kebutuhan'), { target: { value: 'Mesin' } });
    fireEvent.change(within(formEl).getByLabelText('Perkiraan volume'), { target: { value: '2 unit' } });
    fireEvent.change(within(formEl).getByLabelText('Produk & spesifikasi'), { target: { value: 'Mesin injeksi 180 ton' } });
    fireEvent.change(within(formEl).getByLabelText(/^Negara asal/), { target: { value: 'Taiwan' } });
    fireEvent.change(within(formEl).getByLabelText(/^Incoterm/), { target: { value: 'CIF' } });
    fireEvent.change(within(formEl).getByLabelText('Lokasi pabrik / kota tujuan'), { target: { value: 'Tangerang' } });
    act(() => {
      fireEvent.submit(formEl);
    });
    const message = contact.querySelector('pre')!.textContent!;
    expect(message).toBe(
      [
        'Halo PT Arunika Niaga Internasional, saya ingin meminta penawaran.',
        '',
        'Nama: Rina Kartika',
        'Perusahaan: PT Contoh Plastik Jaya',
        'Kebutuhan: Mesin',
        'Produk/spesifikasi: Mesin injeksi 180 ton',
        'Volume: 2 unit',
        'Negara asal: Taiwan',
        'Incoterm: CIF',
        'Lokasi pabrik: Tangerang',
      ].join('\n'),
    );
    const done = within(contact).getByRole('heading', { name: 'Pesan siap dikirim', level: 3 });
    // Fokus pindah ke judul hasil; formulir/hasil TIDAK di dalam aria-live (tidak dibacakan dua kali)
    expect(done.closest('[aria-live]')).toBeNull();
    expect(formEl.closest('[aria-live]')).toBeNull();
    expect(within(contact).getByRole('link', { name: 'Buka WhatsApp' }).getAttribute('href')).toBe(
      `https://wa.me/6281234567890?text=${encodeURIComponent(message)}`,
    );
    fireEvent.click(within(contact).getByRole('button', { name: 'Ubah data' }));
    expect(within(contact).getByLabelText('Nama')).toHaveValue('Rina Kartika');
  });

  it('pita ajakan: aksen penuh + data-tpl-tone inverse (teks putih), tombol ke formulir dan WhatsApp; aksen terang → tanpa inverse', () => {
    const cta = section(demo(), 'cta');
    expect(cta.getAttribute('data-tpl-tone')).toBe('inverse');
    expect(within(cta).getByRole('link', { name: 'Isi Formulir Penawaran' }).getAttribute('href')).toBe('#kontak');
    expect(within(cta).getByRole('link', { name: 'Chat lewat WhatsApp' }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\//);
    cleanup();
    expect(section(demo({ brand: { accent_color: '#FACC15' } }), 'cta').hasAttribute('data-tpl-tone')).toBe(false);
  });

  it('datar: tanpa kelas bayangan di DOM (kecuali tombol melayang Shell) dan di sumber template', () => {
    const container = demo();
    const shadows = Array.from(container.querySelectorAll('[class*="shadow"]')).filter(
      (el) => !/Chat WhatsApp|Kembali ke atas/.test(el.getAttribute('aria-label') ?? ''),
    );
    expect(shadows.map((el) => el.className)).toEqual([]);
    expect(sourceFiles.length).toBeGreaterThanOrEqual(20);
    const source = sourceFiles.map((name) => readFileSync(resolve(DIR, name), 'utf8')).join('\n');
    expect(source).not.toMatch(/shadow/i);
  });
});

describe('NusaNiaga: gerak', () => {
  it('pratinjau CMS diam: data-tpl-motion off, garis alur tanpa status gerak, tanpa tautan wa.me terbuka', () => {
    const { container } = render(<def.Component content={resolveContent(def, null)} preview />);
    expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'off');
    expect(container.querySelector('[data-tpl-section="process"] ol')!.hasAttribute('data-lane')).toBe(false);
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    // Gerak mati → strip industri statis (satu daftar, tanpa salinan putaran)
    expect(container.querySelectorAll('[data-tpl-section="clients"] ul[aria-label="Industri yang kami layani"]')).toHaveLength(1);
    expect(container.querySelector('.tpl-marquee')).toBeNull();
  });

  it('nusaniaga.css: animasi bergerbang [data-tpl-motion=\'on\'], blok prefers-reduced-motion, mask bilah statis, kelas nn-', () => {
    const css = readFileSync(resolve(DIR, 'nusaniaga.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).toContain('@layer components');
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(css).toMatch(/\.nn-slats\s*\{[^}]*mask-image/);
    for (const rule of css.match(/^\s*[^@\s{}][^{}]*\{[^}]*\b(transition|animation)[\w-]*:[^}]*\}/gm) ?? []) {
      const selector = rule.split('{')[0];
      if (/transition:\s*none|animation:\s*none/.test(rule)) continue;
      expect(selector, rule).toContain("[data-tpl-motion='on']");
    }
    for (const cls of css.match(/\.[a-z][\w-]*/g) ?? []) if (!/^\.(tpl-)/.test(cls)) expect(cls, cls).toMatch(/^\.nn-/);
  });
});

describe('NusaNiaga: warna aksen bisa diganti', () => {
  it('crimson bawaan → --tpl-accent & teks putih; warna CMS mengalir ke semua turunan; kuning → teks gelap', () => {
    const base = demo();
    expect(rootStyle(base, '--tpl-accent')).toBe('#a61e3a');
    expect(rootStyle(base, '--tpl-on-accent')).toBe('#ffffff');
    expect(rootStyle(base, '--nn-ink')).toBe('#a61e3a');
    cleanup();
    const green = demo({ brand: { accent_color: '#047857' } });
    expect(rootStyle(green, '--tpl-accent')).toBe('#047857');
    for (const name of ['--nn-ink', '--nn-tint', '--nn-line']) {
      expect(rootStyle(green, name), name).toBe((nusaniagaVars('#047857') as Record<string, string>)[name]);
    }
    cleanup();
    expect(rootStyle(demo({ brand: { accent_color: '#FACC15' } }), '--tpl-on-accent')).toBe('#121620');
  });
});

describe('NusaNiaga: SEO situs pembeli, judul, gambar, tautan', () => {
  it('judul tab & meta description dari nama, tagline, dan deskripsi hero; theme-color = aksen', () => {
    expect(siteTitle('nusaniaga', null)).toBe('PT Arunika Niaga Internasional — Importir Bahan Baku & Mesin');
    expect(siteTitle('nusaniaga', null).length).toBeLessThanOrEqual(60);
    const restore = applySiteHead('nusaniaga', null);
    const description = document.head.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
    expect(description).toMatch(/^Kami mencari pemasok di luar negeri/);
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(200);
    expect(document.head.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#A61E3A');
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

  it('gambar: alt deskriptif, width/height, srcset & sizes; potret bulat alt kosong', () => {
    const container = demo();
    const imgs = Array.from(container.querySelectorAll('img'));
    expect(imgs.length).toBeGreaterThanOrEqual(13);
    for (const img of imgs) {
      const src = img.getAttribute('src') ?? '';
      if (src.endsWith('.svg')) continue;
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
    for (const svg of container.querySelectorAll('svg')) {
      expect(svg.closest('[aria-hidden="true"], [aria-hidden=""]') ?? svg.getAttribute('aria-hidden'), svg.outerHTML.slice(0, 60)).toBeTruthy();
    }
    expect(container.querySelector('footer')!.querySelectorAll('a[href^="https://"]')).toHaveLength(3);
  });
});

describe('NusaNiaga: konten opsional kosong', () => {
  it('hero: tanpa tombol menu atas → tanpa blok aksen; tanpa tombol kedua → satu tombol; tanpa foto → bidang tint berbilah', () => {
    const container = demo({ hero: { header_label: '', secondary_label: '', image: '' } });
    const header = container.querySelector('header')!;
    expect(within(header).queryByRole('link', { name: 'Minta Penawaran' })).toBeNull();
    const hero = section(container, 'hero');
    expect(within(hero).getAllByRole('link', { name: /Minta Penawaran|Lihat produk/ })).toHaveLength(1);
    expect(hero.querySelector('img')).toBeNull();
    expect(hero.querySelector('.nn-slats')).not.toBeNull();
  });

  it('layanan berfoto → foto 16:10 tanpa kotak ikon; tanpa foto Keunggulan → kartu angka selebar penuh; 0 angka → tanpa kartu', () => {
    const photo = '/assets/templates/photos/nusaniaga-gudang-1200.webp';
    const container = demo({
      services: { items: [{ title: 'Gudang & stok', description: 'Isi', points: 'A\nB\nC\nD', image: photo }] },
      advantages: { image: '' },
    });
    const services = section(container, 'services');
    expect(services.querySelectorAll('img')).toHaveLength(1);
    expect(services.querySelectorAll('li li')).toHaveLength(3);
    const advantages = section(container, 'advantages');
    expect(advantages.querySelector('img')).toBeNull();
    expect(advantages.innerHTML).toContain('@5xl:col-span-12');
    expect(advantages.innerHTML).toContain('@5xl:grid-cols-4');
    cleanup();
    expect(section(demo({ advantages: { stats: [] } }), 'advantages').querySelector('dl')).toBeNull();
  });

  it('angka besar: sel = wadah ukuran (huruf ikut lebar sel); 3 angka di samping foto bertumpuk di layar lebar', () => {
    const cells = (container: HTMLElement) => Array.from(section(container, 'advantages').querySelectorAll('dl > div'));
    const base = demo();
    expect(cells(base)).toHaveLength(4);
    for (const cell of cells(base)) {
      expect(cell.className).toMatch(/(^|\s)@container(\s|$)/);
      expect(cell.querySelector('dd:not([aria-hidden])')!.className).toContain('text-[clamp(28px,26cqi,68px)]');
    }
    cleanup();
    const three = { stats: [{ value: '18', unit: 'negara' }, { value: '2.400+', unit: 'SKU' }, { value: '140+', unit: 'pabrik' }] };
    const withPhoto = demo({ advantages: three });
    expect(section(withPhoto, 'advantages').querySelector('dl')!.className).toContain('@5xl:grid-cols-1');
    expect(cells(withPhoto).map((c) => c.className.includes('@5xl:border-b'))).toEqual([true, true, false]);
    cleanup();
    const noPhoto = demo({ advantages: { ...three, image: '' } });
    expect(section(noPhoto, 'advantages').querySelector('dl')!.className).not.toContain('@5xl:grid-cols-1');
    expect(section(noPhoto, 'advantages').querySelector('dl')!.className).toContain('@xl:grid-cols-3');
  });

  it('kontak: baris bertautan bergaris bawah & berubah warna saat disorot; jam operasional bukan tautan', () => {
    const contact = section(demo(), 'contact');
    const phone = within(contact).getByRole('link', { name: /Telepon/ });
    expect(phone.getAttribute('href')).toMatch(/^tel:/);
    const value = phone.querySelector('span.block.text-\\[15px\\]')!;
    expect(value.textContent).toBe('081234567890');
    expect(value.className).toContain('underline');
    expect(value.className).toContain('group-hover:text-(--nn-ink)');
    const hours = Array.from(contact.querySelectorAll('span.block.text-\\[15px\\]')).find((el) => el.textContent?.includes('Senin'))!;
    expect(hours.closest('a')).toBeNull();
    expect(hours.className).not.toContain('underline');
  });

  it('daftar kosong menyembunyikan section dan item menunya; klien tanpa industri → tanpa strip', () => {
    const container = demo({
      products: { items: [] },
      process: { steps: [] },
      testimonials: { items: [] },
      faq: { items: [] },
      clients: { industries: [] },
    });
    expect(sectionKeys(container)).toEqual(['hero', 'clients', 'services', 'coverage', 'advantages', 'cta', 'contact', 'footer']);
    expect(section(container, 'clients').querySelector('.tpl-marquee, ul[aria-label="Industri yang kami layani"]')).toBeNull();
    const nav = within(container.querySelector('header')!).getByRole('navigation', { name: 'Menu utama' });
    expect(within(nav).getAllByRole('link').map((a) => a.textContent)).toEqual(['Layanan', 'Jangkauan', 'Kontak']);
    // Tombol "Lihat produk" tanpa Produk → disembunyikan
    expect(within(section(container, 'hero')).queryByRole('link', { name: 'Lihat produk' })).toBeNull();
    cleanup();
    expect(sectionKeys(demo({ clients: { industries: [], items: [] } }))).not.toContain('clients');
  });

  it('tanpa WhatsApp: pesan dikirim lewat email; tanpa keduanya: salin pesan', () => {
    const fill = (contact: HTMLElement) => {
      const formEl = within(contact).getByRole('form');
      fireEvent.change(within(formEl).getByLabelText('Nama'), { target: { value: 'Rina' } });
      fireEvent.change(within(formEl).getByLabelText('Perusahaan'), { target: { value: 'PT Uji' } });
      fireEvent.change(within(formEl).getByLabelText('Kebutuhan'), { target: { value: 'Mesin' } });
      fireEvent.change(within(formEl).getByLabelText('Perkiraan volume'), { target: { value: '1 unit' } });
      fireEvent.change(within(formEl).getByLabelText('Produk & spesifikasi'), { target: { value: 'CNC' } });
      fireEvent.change(within(formEl).getByLabelText('Lokasi pabrik / kota tujuan'), { target: { value: 'Bekasi' } });
      act(() => {
        fireEvent.submit(formEl);
      });
    };
    const withEmail = demo({ contact: { whatsapp: '', form_text: '' } });
    // Tanpa nomor WhatsApp: tombol & kalimat bawaan tidak menjanjikan WhatsApp (teks tombol CMS diabaikan)
    const submit = within(section(withEmail, 'contact')).getByRole('button', { name: 'Susun pesan' });
    expect(submit).toHaveAttribute('type', 'submit');
    expect(submit.querySelector('svg')).toBeNull();
    expect(section(withEmail, 'contact').textContent).toContain('Formulir ini hanya menyusun pesan untuk tim kami; data tidak disimpan di website.');
    expect(section(withEmail, 'contact').textContent).not.toMatch(/WhatsApp/);
    fill(section(withEmail, 'contact'));
    expect(within(section(withEmail, 'contact')).getByRole('link', { name: 'Kirim lewat email' }).getAttribute('href')).toMatch(
      /^mailto:penawaran@arunikaniaga\.test\?subject=Permintaan%20penawaran&body=Halo%20PT%20Arunika/,
    );
    expect(withEmail.querySelector('a[href^="https://wa.me"]')).toBeNull();
    cleanup();
    const neither = demo({ contact: { whatsapp: '', email: '' } });
    fill(section(neither, 'contact'));
    expect(within(section(neither, 'contact')).getByRole('button', { name: 'Salin pesan' })).toBeInTheDocument();
  });

  it('salin pesan: status "Pesan tersalin." diumumkan lewat satu baris aria-live kecil', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const contact = section(demo({ contact: { whatsapp: '', email: '' } }), 'contact');
    const formEl = within(contact).getByRole('form');
    for (const [label, value] of [
      ['Nama', 'Rina'],
      ['Perusahaan', 'PT Uji'],
      ['Kebutuhan', 'Mesin'],
      ['Perkiraan volume', '1 unit'],
      ['Produk & spesifikasi', 'CNC'],
      ['Lokasi pabrik / kota tujuan', 'Bekasi'],
    ]) {
      fireEvent.change(within(formEl).getByLabelText(label), { target: { value } });
    }
    act(() => {
      fireEvent.submit(formEl);
    });
    const live = contact.querySelectorAll('[aria-live]');
    expect(live).toHaveLength(1);
    expect(live[0]).toHaveClass('sr-only');
    expect(live[0].textContent).toBe('');
    await act(async () => {
      fireEvent.click(within(contact).getByRole('button', { name: 'Salin pesan' }));
    });
    expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/^Halo PT Arunika Niaga Internasional, saya ingin meminta penawaran\./));
    expect(live[0].textContent).toBe('Pesan tersalin.');
    expect(within(contact).getByRole('button', { name: 'Tersalin' })).toBeInTheDocument();
  });
});

describe('NusaNiaga: editor CMS', () => {
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

describe('NusaNiaga: data katalog', () => {
  const sql = (file: string) => readFileSync(resolve(ROOT, file), 'utf8');

  it.each(['database/seed.templates.sql', 'database/migrations/2026-10-27_037_nusaniaga_template.sql'])(
    '%s: baris nusaniaga dengan template_code, kategori, harga, dan pratinjau tangkapan layar .webp',
    (file) => {
      const text = sql(file);
      expect(text).toContain("'nusaniaga'");
      expect(text).toContain("'Company Profile'");
      expect(text).toContain('1590000.00');
      expect(text).toContain("'/assets/templates/nusaniaga-preview.webp'");
      expect(text).toContain('\'["/assets/templates/nusaniaga-1.webp","/assets/templates/nusaniaga-2.webp"]\'');
      expect(text).toMatch(/data tidak disimpan di website, tidak ada pelacakan kiriman real-time, dan harga tidak diperbarui otomatis/);
      expect(text).not.toMatch(/termasuk domain|domain, hosting/);
    },
  );

  it('migrasi 037 aman diulang (INSERT IGNORE + UPDATE berdasarkan slug, tanpa DELETE) dan tercatat di schema_migrations', () => {
    const raw = sql('database/migrations/2026-10-27_037_nusaniaga_template.sql');
    expect(raw).toMatch(/Domain\s+(--\s+)?tidak termasuk harga template/);
    expect(raw).toMatch(/FIKTIF/);
    const text = raw.replace(/^--.*$/gm, '');
    expect(text).toMatch(/INSERT IGNORE INTO templates/);
    expect(text).toMatch(/WHERE slug = 'nusaniaga';/);
    expect(text).toMatch(/sort_order\s+= 20/);
    expect(text).toMatch(/status\s+= 'published'/);
    expect(text).not.toMatch(/\bDELETE\b/);
    expect(text).toContain("VALUES ('2026-10-27_037', 'templates: katalog NusaNiaga')");
  });

  it('gambar pratinjau katalog ada di public/, 1600×1000, dan ringan', () => {
    for (const name of ['nusaniaga-preview', 'nusaniaga-1', 'nusaniaga-2']) {
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

describe('NusaNiaga: konten aneh', () => {
  it('angka, null, dan string di tempat list tidak membuat crash; tautan berbahaya dibuang', () => {
    const weird = {
      hero: { image: 'javascript:alert(1)', highlight: 'tidak ada di judul', primary_url: 'javascript:alert(1)', header_url: 'vbscript:x' },
      clients: { industries: 'x', items: [null, { name: 3 }, { logo: 'javascript:alert(1)' }] },
      services: { items: [{ title: 5, points: 7 }, 'x'] },
      products: { items: [null, { name: 'Resin', image: 'javascript:alert(1)', origin: 3 }] },
      process: { steps: [{ title: 2, text: null }] },
      coverage: { origins: [{ country: 'Jerman', code: 12345 }], areas: 9 },
      advantages: { stats: [{ value: 5 }, null], items: {} },
      testimonials: { items: [{ quote: 'Baik', photo: 'javascript:alert(1)' }] },
      faq: { items: [{ question: 2, answer: null }], link_url: 'vbscript:x' },
      cta: { button_url: 'javascript:alert(1)' },
      contact: { whatsapp: 'abc', form_needs: 'x', maps_url: 'javascript:alert(1)' },
      footer: { instagram: 'javascript:alert(1)' },
      brand: { accent_color: 'merah' },
    } as unknown as SiteContent;
    const { container } = render(<def.Component content={resolveContent(def, weird)} />);
    expect(container.querySelector('a[href^="javascript:"], a[href^="vbscript:"]')).toBeNull();
    expect(container.querySelector('img[src^="javascript:"]')).toBeNull();
    expect(container.querySelector('h1')!.textContent).toBe('Bahan baku dan mesin impor, sampai di lini produksi Anda');
    expect(section(container, 'process').textContent).toContain('2');
    expect(section(container, 'coverage').textContent).toContain('Jerman');
    expect(section(container, 'hero').textContent).toContain('123');
    expect(rootStyle(container, '--tpl-accent')).toBe('#a61e3a');
  });
});
