// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/dermaga.test.tsx
// Dermaga (company profile ekspor-impor & freight forwarding 2026-10-27): skema CMS & konten demo, helper model (warna
// tema pita/footer, menu, nomor label, tujuan tautan, section tampil, titik rute, formulir permintaan penawaran → pesan
// WhatsApp), demo (urutan section, hero route, header + menu HP, akordeon, formulir), datar tanpa bayangan, gerak
// (pratinjau CMS diam, CSS dm- bergerbang data-tpl-motion), warna tema, SEO situs pembeli, judul & gambar & tautan,
// konten opsional kosong, editor CMS, data katalog (migrasi 035 + seed + pratinjau), dan konten aneh.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionEditor } from '../../pages/account/cms/SectionEditor';
import { validateContent } from '../../pages/account/cms/validation';
import { TEMPLATES, resolveContent } from '../index';
import { iconKey } from '../dermaga/icons';
import {
  EMPTY_INQUIRY,
  PAGE_SECTIONS,
  ROUTE_TALL,
  ROUTE_WIDE,
  cleanText,
  dermagaVars,
  inquiryMailHref,
  inquiryMessage,
  inquiryServices,
  navItems,
  readDermaga,
  routeSlots,
  sectionShown,
  sectionTarget,
  splitTags,
  validateInquiry,
  wordmarkOf,
  type InquiryForm,
} from '../dermaga/model';
import { DERMAGA_PHOTOS } from '../dermaga/photos';
import { applySiteHead, siteTitle } from '../siteHead';
import { SiteRenderer } from '../SiteRenderer';
import { contrast, parseHex } from '../shared/utils';
import { isListField, type SiteContent } from '../types';

// Demo panjang + getByRole di jsdom: bisa lewat 5 dtk saat suite berjalan paralel
vi.setConfig({ testTimeout: 30_000 });

const ROOT = process.cwd();
const def = TEMPLATES.dermaga;
const ORDER = ['hero', 'clients', 'about', 'services', 'markets', 'process', 'gallery', 'testimonials', 'faq', 'cta', 'contact'];
const sectionKeys = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-tpl-section]')).map((s) => s.getAttribute('data-tpl-section'));
const section = (root: HTMLElement, key: string) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`)!;
const demo = (content: unknown = null, preview = false) => render(<SiteRenderer templateCode="dermaga" content={content} preview={preview} />).container;
const rgb = (hex: string) => parseHex(hex)!;
const publicFile = (url: string) => resolve(ROOT, 'public', url.replace(/^\//, ''));
const rootStyle = (container: HTMLElement, name: string) => {
  const holder = Array.from(container.querySelectorAll<HTMLElement>('[style]')).find((el) => el.style.getPropertyValue(name));
  return holder?.style.getPropertyValue(name) ?? '';
};
const urls = (src: string) => {
  const asset = DERMAGA_PHOTOS.asset(src)!;
  return [asset.src, ...asset.srcSet!.split(',').map((part) => part.trim().split(' ')[0])].filter((u, i, all) => all.indexOf(u) === i);
};
const label = (el: Element) => el.textContent ?? '';
const ROUTE_SVG = 'svg[viewBox="0 0 800 1000"], svg[viewBox="0 0 2100 900"]';
const inquiry = (patch: Partial<InquiryForm> = {}): InquiryForm => ({
  ...EMPTY_INQUIRY,
  name: 'Rina Kartika',
  service: 'Ekspor',
  product: 'Kursi rotan sintetis',
  volume: '1 × 40 kaki HC',
  country: 'Belanda',
  ...patch,
});
const SERVICES = ['Ekspor', 'Impor', 'Trading / sourcing', 'Dokumen saja'];

let scrolled: (string | null)[] = [];
beforeEach(() => {
  scrolled = [];
  Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
    scrolled.push(this.getAttribute('data-tpl-section'));
  });
});
afterEach(cleanup);

describe('Dermaga: skema & konten bawaan', () => {
  it('urutan form = urutan halaman, semua section bisa disembunyikan, field unik, list berbatas', () => {
    expect(def.code).toBe('dermaga');
    expect(def.name).toBe('Dermaga');
    expect(def.features).toBeUndefined();
    expect(def.sections.map((s) => s.key)).toEqual(['brand', ...ORDER, 'footer']);
    expect([...PAGE_SECTIONS]).toEqual([...ORDER, 'footer']);
    const fields = (key: string) => def.sections.find((s) => s.key === key)!.fields.map((f) => f.key);
    expect(fields('brand')).toEqual(['company_name', 'tagline', 'logo', 'accent_color']);
    expect(def.sections[0].fields.find((f) => f.key === 'accent_color')?.type).toBe('color');
    expect(fields('hero')).toEqual(expect.arrayContaining(['image', 'ports', 'stats', 'highlight', 'primary_label', 'secondary_label', 'header_label']));
    expect(fields('markets')).toEqual(expect.arrayContaining(['regions', 'terms', 'terms_label', 'image']));
    expect(fields('contact')).toEqual(
      expect.arrayContaining(['address', 'maps_query', 'maps_url', 'phone', 'email', 'whatsapp', 'whatsapp_message', 'hours', 'form_services']),
    );
    expect(fields('footer')).toEqual(expect.arrayContaining(['wordmark', 'instagram', 'facebook', 'linkedin', 'youtube', 'tiktok']));
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
    // Batas yang disebut di halaman katalog (dermaga.content.ts)
    expect(max).toMatchObject({
      'hero.ports': 3,
      'hero.stats': 4,
      'clients.items': 12,
      'about.facts': 6,
      'services.items': 9,
      'markets.regions': 8,
      'process.steps': 6,
      'gallery.items': 9,
      'testimonials.items': 6,
      'faq.items': 8,
    });
  });

  it('konten demo lolos validasi CMS, logo kosong, semua foto terdaftar, ada di public/, tercatat di CREDITS.md, dan dipakai', () => {
    const c = def.defaultContent;
    expect(validateContent(def, resolveContent(def, null))).toEqual({});
    expect(c.brand.logo).toBe('');
    expect(c.brand.accent_color).toBe('#0F5C63');
    expect(c.contact.whatsapp).toBe('081234567890');
    expect(c.hero.image).toBe('/assets/templates/photos/dermaga-hero-1920.webp');
    for (const s of def.sections) if (s.key !== 'brand') expect(c[s.key].enabled, s.key).toBe(true);
    const photos = JSON.stringify(c).match(/\/assets\/templates\/photos\/[a-z0-9-]+\.webp/g) ?? [];
    for (const src of photos) expect(DERMAGA_PHOTOS.asset(src), src).not.toBeNull();
    const credits = readFileSync(resolve(ROOT, 'public/assets/templates/photos/CREDITS.md'), 'utf8');
    expect(DERMAGA_PHOTOS.keys).toHaveLength(17);
    for (const key of DERMAGA_PHOTOS.keys) {
      expect(key.startsWith('dermaga-'), key).toBe(true);
      for (const url of urls(DERMAGA_PHOTOS.src(key))) expect(existsSync(publicFile(url)), url).toBe(true);
      expect(credits, key).toContain(`\`${key}-*\``);
      expect(photos, `${key} dipakai di konten demo`).toContain(DERMAGA_PHOTOS.src(key));
      expect(DERMAGA_PHOTOS.alt(DERMAGA_PHOTOS.src(key), '').split(' ').length, key).toBeGreaterThanOrEqual(5);
    }
    // Simbol bawaan juga tersedia sebagai SVG mandiri, path sama dengan komponen
    const mark = readFileSync(publicFile('/assets/templates/logos/dermaga-mark.svg'), 'utf8');
    const component = readFileSync(resolve(ROOT, 'src/templates/dermaga/marks.tsx'), 'utf8');
    const paths = mark.match(/ d="[^"]+"/g) ?? [];
    expect(paths).toHaveLength(4);
    for (const d of paths) expect(component, d).toContain(d.trim());
    expect(mark).toMatch(/viewBox="0 0 32 32"/);
    expect(mark).toMatch(/role="img"/);
    expect(mark).toMatch(/<title>/);
    // Judul tab situs pembeli ≤ 60 karakter, deskripsi hero 120–155 karakter
    expect(`${c.brand.company_name} — ${c.brand.tagline}`.length).toBeLessThanOrEqual(60);
    expect(String(c.hero.subtitle).length).toBeGreaterThanOrEqual(120);
    expect(String(c.hero.subtitle).length).toBeLessThanOrEqual(155);
    // Angka 38 negara di hero = jumlah negara per kawasan di pita pasar
    const regions = c.markets.regions as { count: string }[];
    expect(regions.reduce((sum, r) => sum + Number.parseInt(r.count, 10), 0)).toBe(38);
    expect((c.hero.stats as { value: string }[]).map((s) => s.value)).toContain('38');
  });

  it('foto demo ringan: hero 800/1280/1920, WebP ≤ 140 KB per file, total ≤ 2,5 MB', () => {
    expect(DERMAGA_PHOTOS.asset(def.defaultContent.hero.image as string)!.srcSet).toBe(
      '/assets/templates/photos/dermaga-hero-800.webp 800w, /assets/templates/photos/dermaga-hero-1280.webp 1280w, /assets/templates/photos/dermaga-hero-1920.webp 1920w',
    );
    let total = 0;
    for (const key of DERMAGA_PHOTOS.keys) {
      for (const url of urls(DERMAGA_PHOTOS.src(key))) {
        expect(url, url).toMatch(/\.webp$/);
        const kb = statSync(publicFile(url)).size / 1024;
        expect(kb, url).toBeLessThanOrEqual(140);
        total += kb;
      }
    }
    expect(total).toBeLessThanOrEqual(2500);
  });

  it('salinan demo jujur: formulir hanya menyusun pesan WhatsApp, tanpa klaim izin/sertifikat atau janji', () => {
    const text = JSON.stringify(def.defaultContent);
    expect(text).not.toMatch(/dijamin|garansi|pasti |terbaik nomor|termurah|#1|terdaftar di Bea Cukai|\bNIB\b|\bISO\b|Halal MUI|SVLK|\bAEO\b|bersertifikat|hari kerja/i);
    expect(text).toMatch(/data tidak disimpan di website/);
    expect(text).toContain('.test');
  });
});

describe('Dermaga: helper model', () => {
  it('warna tema: pita putih ≥ 7:1, footer putih ≥ 14:1, warna terang ≥ 4,5:1 di pita & footer; tidak valid → bawaan', () => {
    const white = rgb('#ffffff');
    expect(dermagaVars('#0F5C63')).toEqual({ '--dm-deep': '#0b2226', '--dm-band': '#0f5c63', '--dm-bright': '#c1d5d6' });
    for (const accent of ['#0F5C63', '#1D4ED8', '#A61E3A', '#B7791F', '#FACC15', '#C6F135', '#FFFFFF', '#000000', '#6EE7B7', '#7C3AED', '#12A07F']) {
      const vars = dermagaVars(accent) as Record<string, string>;
      const band = rgb(vars['--dm-band']);
      const deep = rgb(vars['--dm-deep']);
      const bright = rgb(vars['--dm-bright']);
      expect(contrast(band, white), accent).toBeGreaterThanOrEqual(7);
      expect(contrast(deep, white), accent).toBeGreaterThanOrEqual(14);
      expect(contrast(bright, band), accent).toBeGreaterThanOrEqual(4.5);
      expect(contrast(bright, deep), accent).toBeGreaterThanOrEqual(4.5);
    }
    expect(dermagaVars('zzz')).toEqual(dermagaVars('#0F5C63'));
  });

  it('menu: label pendek dari label section, section kosong keluar dari menu', () => {
    const content = resolveContent(def, null);
    expect(navItems(content).map((i) => `${i.key}:${i.label}`)).toEqual([
      'about:Tentang kami',
      'services:Layanan',
      'markets:Pasar',
      'process:Proses',
      'gallery:Galeri',
      'faq:FAQ',
      'contact:Kontak',
    ]);
    const less = resolveContent(def, {
      about: { eyebrow: 'Profil perusahaan kami' },
      gallery: { items: [] },
      process: { enabled: false },
      faq: { items: [{ question: '' }] },
    });
    expect(navItems(less).map((i) => `${i.key}:${i.label}`)).toEqual(['about:Tentang', 'services:Layanan', 'markets:Pasar', 'contact:Kontak']);
  });

  it('nomor label "01 / …" mengikuti section berlabel yang tampil', () => {
    const m = readDermaga(resolveContent(def, null));
    expect(['about', 'services', 'markets', 'process', 'gallery', 'testimonials', 'faq', 'contact'].map(m.number)).toEqual([
      '01',
      '02',
      '03',
      '04',
      '05',
      '06',
      '07',
      '08',
    ]);
    const skip = readDermaga(resolveContent(def, { services: { eyebrow: '' }, process: { enabled: false } }));
    expect(skip.number('services')).toBe('');
    expect(skip.number('markets')).toBe('02');
    expect(skip.number('gallery')).toBe('03');
    expect(skip.number('hero')).toBe('');
  });

  it('tujuan tautan: anchor Indonesia dan kunci section; section tersembunyi → cadangan', () => {
    expect(sectionTarget('#pasar')).toBe('markets');
    expect(sectionTarget('#kontak')).toBe('contact');
    expect(sectionTarget('proses')).toBe('process');
    expect(sectionTarget('#layanan')).toBe('services');
    expect(sectionTarget('#penawaran')).toBe('contact');
    expect(sectionTarget('#tidak-ada')).toBeNull();
    const m = readDermaga(resolveContent(def, null));
    expect(m.linkOr('#pasar', null)).toEqual({ kind: 'section', target: 'markets' });
    expect(m.linkOr('#tidak-ada', m.quoteAction)).toEqual({ kind: 'section', target: 'contact' });
    expect(m.primaryAction).toEqual({ kind: 'section', target: 'contact' });
    expect(m.secondaryAction).toEqual({ kind: 'section', target: 'services' });
    expect(m.headerAction).toEqual({ kind: 'section', target: 'contact' });
    expect(m.linkOr('https://contoh.test/katalog', null)).toEqual({ kind: 'external', href: 'https://contoh.test/katalog' });
    const hidden = readDermaga(resolveContent(def, { contact: { enabled: false } }));
    expect(hidden.quoteAction?.kind).toBe('external');
    expect(hidden.linkOr('#kontak', null)).toBeNull();
    const silent = readDermaga(resolveContent(def, { contact: { enabled: false, whatsapp: '' } }));
    expect(silent.quoteAction).toBeNull();
    expect(silent.primaryAction).toBeNull();
  });

  it('section tampil hanya bila berisi', () => {
    const content = resolveContent(def, null);
    for (const key of ORDER) expect(sectionShown(content, key), key).toBe(true);
    const empty = resolveContent(def, {
      clients: { items: [{ sector: 'tanpa nama' }] },
      services: { items: [] },
      markets: { regions: [{ ports: 'tanpa nama' }] },
      process: { steps: [] },
      gallery: { items: [{ caption: 'tanpa foto' }] },
      testimonials: { items: [{ name: 'tanpa kutipan' }] },
      faq: { items: [] },
      about: { title: '', body: '', image: '', facts: [] },
      cta: { title: '', subtitle: '' },
    });
    for (const key of ['clients', 'services', 'markets', 'process', 'gallery', 'testimonials', 'faq', 'about', 'cta']) expect(sectionShown(empty, key), key).toBe(false);
    expect(sectionShown(content, 'tidak-ada')).toBe(false);
  });

  it('titik rute: 1 → asal, 2 → asal & tujuan, 3 → asal, transit, tujuan; geometri pin sama dengan jalur', () => {
    expect(routeSlots(0)).toEqual([]);
    expect(routeSlots(1)).toEqual([0]);
    expect(routeSlots(2)).toEqual([0, 2]);
    expect(routeSlots(3)).toEqual([0, 1, 2]);
    for (const layout of [ROUTE_WIDE, ROUTE_TALL]) {
      const [x0, y0] = layout.pins[0];
      expect(layout.path.startsWith(`M${x0} ${y0} `)).toBe(true);
      const [x2, y2] = layout.pins[2];
      expect(layout.path.endsWith(`${x2} ${y2}`)).toBe(true);
    }
    // Rasio viewBox = rasio kotak foto (skala garis seragam)
    expect(ROUTE_WIDE.width / ROUTE_WIDE.height).toBeCloseTo(21 / 9, 5);
    expect(ROUTE_TALL.width / ROUTE_TALL.height).toBeCloseTo(4 / 5, 5);
  });

  it('teks kecil: label dipisah titik tengah/koma, nama besar footer tanpa PT/CV', () => {
    expect(splitTags('EXW · FOB, CIF | DAP')).toEqual(['EXW', 'FOB', 'CIF', 'DAP']);
    expect(splitTags('PEB · PIB · COO · B/L')).toEqual(['PEB', 'PIB', 'COO', 'B/L']);
    expect(splitTags('')).toEqual([]);
    expect(wordmarkOf('', 'PT Lintas Dermaga Nusantara')).toBe('Lintas Dermaga Nusantara');
    expect(wordmarkOf('', 'CV. Maju Jaya')).toBe('Maju Jaya');
    expect(wordmarkOf('Lintas', 'PT Lintas Dermaga Nusantara')).toBe('Lintas');
    expect(wordmarkOf('', 'PT')).toBe('PT');
  });

  it('formulir penawaran: validasi per isian, negara asal untuk impor, pesan WhatsApp berurutan, isian kosong tidak ikut', () => {
    expect(validateInquiry(inquiry(), SERVICES)).toEqual({});
    expect(validateInquiry(EMPTY_INQUIRY, SERVICES)).toEqual({
      name: 'Tulis nama Anda.',
      service: 'Pilih jenis layanan.',
      product: 'Tulis komoditas atau produk.',
      volume: 'Tulis perkiraan volume.',
      country: 'Tulis negara tujuan.',
    });
    expect(validateInquiry(inquiry({ service: 'Impor', country: '' }), SERVICES).country).toBe('Tulis negara asal.');
    expect(validateInquiry(inquiry({ service: 'Bukan pilihan' }), SERVICES).service).toBe('Pilih jenis layanan.');
    expect(validateInquiry(inquiry({ name: ' a ' }), SERVICES).name).toBe('Tulis nama Anda.');

    const full = inquiryMessage(
      inquiry({
        company: 'CV Contoh Jaya',
        load: 'FCL',
        incoterm: 'FOB',
        volume: '1 × 40 kaki HC',
        port: 'Rotterdam',
        schedule: 'Desember 2026',
        note: 'Mohon foto  sebelum\nstuffing.',
      }),
      'PT Lintas Dermaga Nusantara',
    );
    expect(full).toBe(
      [
        'Halo PT Lintas Dermaga Nusantara, saya ingin meminta penawaran pengiriman.',
        '',
        'Nama: Rina Kartika',
        'Perusahaan: CV Contoh Jaya',
        'Layanan: Ekspor',
        'Komoditas/produk: Kursi rotan sintetis',
        'Volume: 1 × 40 kaki HC',
        'Muatan: FCL',
        'Incoterm: FOB',
        'Negara tujuan: Belanda',
        'Pelabuhan: Rotterdam',
        'Perkiraan jadwal: Desember 2026',
        'Catatan: Mohon foto sebelum stuffing.',
      ].join('\n'),
    );
    const short = inquiryMessage(inquiry({ service: 'Impor', country: 'Tiongkok', load: 'kapal sendiri', incoterm: 'XYZ' }), '');
    expect(short.split('\n')[0]).toBe('Halo, saya ingin meminta penawaran pengiriman.');
    expect(short).toContain('Negara asal: Tiongkok');
    expect(short).toContain('Muatan: Belum tahu');
    expect(short).toContain('Incoterm: Belum tahu');
    expect(short).not.toMatch(/Perusahaan:|Pelabuhan:|Perkiraan jadwal:|Catatan:/);
    expect(cleanText('a\u0000b\u0007  c', 10)).toBe('a b c');
    expect(cleanText('x'.repeat(500), 400)).toHaveLength(400);
    expect(inquiryMailHref('penawaran@lintasdermaga.test', 'Baris 1\nBaris 2')).toBe(
      'mailto:penawaran@lintasdermaga.test?subject=Permintaan%20penawaran&body=Baris%201%0ABaris%202',
    );
    expect(inquiryMailHref('bukan email', 'x')).toBe('');
    expect(inquiryServices(resolveContent(def, null).contact)).toEqual(SERVICES);
    expect(inquiryServices({ form_services: [{ label: 'FCL' }, { label: 'FCL' }, { label: '' }] } as unknown as SiteContent['contact'])).toEqual(['FCL']);
    expect(inquiryServices({ form_services: 'x' } as unknown as SiteContent['contact'])).toEqual(SERVICES);
  });

  it('ikon layanan otomatis dari judul (imbuhan pe- ikut dikenali)', () => {
    expect(iconKey('Freight forwarding laut')).toBe('ship');
    expect(iconKey('Kontainer FCL')).toBe('container');
    expect(iconKey('Konsolidasi LCL')).toBe('warehouse');
    expect(iconKey('Dokumen ekspor & impor')).toBe('document');
    expect(iconKey('General trading & sourcing')).toBe('sourcing');
    expect(iconKey('Pemeriksaan & pengemasan')).toBe('inspection');
    expect(iconKey('Trucking & door to door')).toBe('truck');
    expect(iconKey('Asuransi kargo')).toBe('boxes');
  });
});

describe('Dermaga: demo', () => {
  it('urutan section, satu H1, hero route: foto LCP (eager, srcset, ukuran, alt) tanpa reveal, garis rute + chip + manifest', () => {
    const container = demo();
    expect(sectionKeys(container)).toEqual([...ORDER, 'footer']);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const hero = section(container, 'hero');
    expect(hero.getAttribute('data-hero-layout')).toBe('route');
    expect(hero.querySelector('h1')!.textContent).toBe('Ekspor dan impor yang tertata, dari gudang sampai pelabuhan tujuan');
    expect(hero.querySelector('h1 span')!.textContent).toBe('tertata');
    const img = hero.querySelector<HTMLImageElement>('img[fetchpriority="high"]')!;
    expect(img.getAttribute('src')).toBe('/assets/templates/photos/dermaga-hero-1920.webp');
    expect(img.getAttribute('srcset')).toContain(' 800w');
    expect(img.getAttribute('srcset')).toContain(' 1280w');
    expect(img.getAttribute('loading')).toBe('eager');
    expect(Number(img.getAttribute('width'))).toBe(1920);
    expect(Number(img.getAttribute('height'))).toBe(1080);
    expect(img.getAttribute('alt')!.split(' ').length).toBeGreaterThanOrEqual(5);
    // Foto hero TIDAK di dalam <Reveal> dan tanpa zoom/parallax (tidak pernah disembunyikan)
    expect(img.closest('.tpl-reveal')).toBeNull();
    expect(img.className).not.toMatch(/tpl-photo|dm-/);
    // Garis rute: dua SVG (HP tegak & layar lebar), masing-masing jalur gelap + putih dan 3 pin, dekoratif
    const routes = hero.querySelectorAll(ROUTE_SVG);
    expect(routes).toHaveLength(2);
    for (const svg of routes) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.querySelectorAll('.dm-route-path')).toHaveLength(2);
      expect(svg.querySelectorAll('.dm-pin')).toHaveLength(3);
      expect(svg.querySelector('[vector-effect]')).toBeNull();
    }
    const chips = within(hero).getByRole('list', { name: 'Contoh rute pengiriman' });
    expect(Array.from(chips.querySelectorAll('li')).map((li) => li.textContent)).toEqual([
      'SUBTanjung Perak, Surabaya',
      'SINTransit Singapura',
      'RTMRotterdam, Belanda',
    ]);
    expect(chips.querySelector('a, button')).toBeNull();
    // Manifest: 4 sel, label + angka
    const strip = hero.querySelector('dl')!;
    expect(Array.from(strip.querySelectorAll('dt')).map((dt) => dt.textContent)).toEqual([
      'Pengiriman per tahun01',
      'Negara tujuan02',
      'Pelabuhan muat03',
      'Pengalaman tim04',
    ]);
    expect(strip.className).toContain('@3xl:grid-cols-4');
    expect(within(hero).getByRole('link', { name: 'Minta Penawaran' })).toHaveAttribute('href', '#kontak');
    expect(within(hero).getByRole('link', { name: 'Lihat layanan' })).toHaveAttribute('href', '#layanan');
    const eager = Array.from(container.querySelectorAll('img')).filter((i) => i.getAttribute('loading') !== 'lazy');
    expect(eager.map((i) => i.getAttribute('src'))).toEqual(['/assets/templates/photos/dermaga-hero-1920.webp']);
  });

  it('header putih menempel: menu bernomor + tombol "Minta Penawaran"; menu HP buka/tutup, Esc menutup dan fokus kembali', () => {
    const container = demo();
    const header = container.querySelector('header')!;
    expect(header.className).toContain('sticky');
    expect(header.className).toContain('bg-white');
    expect(header.querySelector('svg[viewBox="0 0 32 32"]'), 'DermagaMark').not.toBeNull();
    const nav = within(header).getByRole('navigation', { name: 'Menu utama' });
    expect(Array.from(nav.querySelectorAll('a')).map((a) => a.getAttribute('href'))).toEqual(['#tentang', '#layanan', '#markets', '#process', '#galeri', '#faq', '#kontak']);
    fireEvent.click(within(nav).getByRole('link', { name: 'Proses' }));
    expect(scrolled).toEqual(['process']);
    expect(within(header).getAllByRole('link', { name: 'Minta Penawaran' })[0]).toHaveAttribute('href', '#kontak');
    const toggle = within(header).getByRole('button', { name: 'Buka menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(within(header).getAllByRole('navigation', { name: 'Menu utama' })).toHaveLength(2);
    const panel = document.getElementById(toggle.getAttribute('aria-controls')!)!;
    expect(panel).toHaveAttribute('aria-label', 'Menu utama');
    expect(within(panel).getAllByRole('link').map((a) => a.textContent)).toEqual([
      '01Tentang kami',
      '02Layanan',
      '03Pasar',
      '04Proses',
      '05Galeri',
      '06FAQ',
      '07Kontak',
      'Minta Penawaran',
    ]);
    fireEvent.click(within(panel).getByRole('link', { name: 'Pasar' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(scrolled).toEqual(['process', 'markets']);
    fireEvent.click(toggle);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
  });

  it('label section mono bernomor dengan garis; kartu layanan bernomor bergaris tipis; tabel proses & pasar', () => {
    const container = demo();
    const services = section(container, 'services');
    expect(services.querySelector('p')!.textContent).toBe('02/Layanan');
    const cards = services.querySelectorAll('article');
    expect(cards).toHaveLength(6);
    expect(cards[0].className).toContain('rounded-[4px]');
    expect(cards[0].className).toContain('border');
    expect(Array.from(cards).map((c) => c.querySelector('h3')!.textContent)).toEqual([
      'Freight forwarding laut',
      'Konsolidasi LCL',
      'Dokumen ekspor & impor',
      'General trading & sourcing',
      'Pemeriksaan & pengemasan',
      'Trucking & door to door',
    ]);
    expect(within(cards[0] as HTMLElement).getByRole('list', { name: 'Ringkasan Freight forwarding laut' }).textContent).toBe('FCLLCLPort to port');
    const process = section(container, 'process');
    expect(process.querySelectorAll('ol > li')).toHaveLength(5);
    expect(process.textContent).toContain('Hasil: Bill of lading');
    const markets = section(container, 'markets');
    expect(markets.getAttribute('data-tpl-tone')).toBe('inverse');
    expect(Array.from(markets.querySelectorAll('h3')).map((h) => h.textContent)).toEqual(['Asia Tenggara', 'Asia Timur', 'Timur Tengah', 'Eropa', 'Amerika & Oseania']);
    // Pelabuhan = daftar bertitik (titik ::before tanpa teks, tidak menggantung saat terbungkus)
    expect(Array.from(within(markets).getByRole('list', { name: 'Pelabuhan Eropa' }).querySelectorAll('li')).map((li) => li.textContent)).toEqual([
      'Rotterdam',
      'Hamburg',
      'Antwerpen',
      'Felixstowe',
    ]);
    expect(Array.from(within(markets).getByRole('list', { name: 'Incoterm yang kami tangani' }).querySelectorAll('li')).map(label)).toEqual([
      'EXW',
      'FOB',
      'CFR',
      'CIF',
      'DAP',
      'DDP',
    ]);
    const about = section(container, 'about');
    expect(Array.from(about.querySelectorAll('dt')).map((dt) => dt.textContent)).toEqual([
      'Berdiri',
      'Kantor',
      'Gudang konsolidasi',
      'Tim operasional',
      'Jenis muatan',
      'Bahasa layanan',
    ]);
    expect(within(about).getByRole('link', { name: 'Lihat cara kerja kami' })).toHaveAttribute('href', '#process');
    const clients = section(container, 'clients');
    expect(clients.querySelector('h2')!.textContent).toBe('Dipercaya eksportir dan importir dari berbagai sektor');
    expect(clients.querySelectorAll('li')).toHaveLength(6);
    expect(clients.querySelector('.tpl-marquee-track')).toBeNull();
  });

  it('akordeon tanya jawab: aria-expanded/aria-controls, panel role=region, satu terbuka, tautan WhatsApp', () => {
    const faq = section(demo(), 'faq');
    const buttons = within(faq).getAllByRole('button');
    expect(buttons).toHaveLength(6);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'true');
    expect(buttons[0].closest('h3')).not.toBeNull();
    const region = document.getElementById(buttons[0].getAttribute('aria-controls')!)!;
    expect(region).toHaveAttribute('role', 'region');
    expect(region).toHaveAttribute('data-open', 'true');
    fireEvent.click(buttons[2]);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'false');
    expect(buttons[2]).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(buttons[0].getAttribute('aria-controls')!)).toHaveAttribute('data-open', 'false');
    fireEvent.click(buttons[2]);
    expect(buttons.every((b) => b.getAttribute('aria-expanded') === 'false')).toBe(true);
    expect(within(faq).getByRole('link', { name: /Tanya lewat WhatsApp/ }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/6281234567890\?text=/);
  });

  it('formulir permintaan penawaran: galat + fokus, negara asal untuk impor, pesan WhatsApp, ubah data', () => {
    const container = demo();
    const contact = section(container, 'contact');
    const formEl = within(contact).getByRole('form', { name: 'Formulir permintaan penawaran' });
    expect(formEl.getAttribute('action')).toBeNull();
    expect(contact.textContent).toContain('data tidak disimpan di website');
    // Kirim kosong → galat + fokus ke isian pertama yang salah
    act(() => {
      fireEvent.submit(formEl);
    });
    const name = within(formEl).getByLabelText('Nama');
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAttribute('aria-describedby', `${name.id}-error`);
    expect(name).toHaveFocus();
    expect(formEl.textContent).toContain('Tulis negara tujuan.');
    fireEvent.change(name, { target: { value: 'Rina Kartika' } });
    expect(name).not.toHaveAttribute('aria-invalid');
    fireEvent.change(within(formEl).getByLabelText('Jenis layanan'), { target: { value: 'Impor' } });
    expect(within(formEl).queryByLabelText('Negara tujuan')).toBeNull();
    fireEvent.change(within(formEl).getByLabelText('Negara asal'), { target: { value: 'Tiongkok' } });
    fireEvent.change(within(formEl).getByLabelText('Komoditas / produk'), { target: { value: 'Suku cadang mesin' } });
    fireEvent.change(within(formEl).getByLabelText('Volume'), { target: { value: '12 CBM' } });
    fireEvent.click(within(formEl).getByLabelText('LCL'));
    fireEvent.change(within(formEl).getByLabelText(/^Incoterm/), { target: { value: 'CIF' } });
    act(() => {
      fireEvent.submit(formEl);
    });
    expect(within(contact).getByRole('heading', { level: 3, name: 'Pesan siap dikirim' })).toBeInTheDocument();
    const message = contact.querySelector('pre')!.textContent!;
    expect(message).toBe(
      [
        'Halo PT Lintas Dermaga Nusantara, saya ingin meminta penawaran pengiriman.',
        '',
        'Nama: Rina Kartika',
        'Layanan: Impor',
        'Komoditas/produk: Suku cadang mesin',
        'Volume: 12 CBM',
        'Muatan: LCL',
        'Incoterm: CIF',
        'Negara asal: Tiongkok',
      ].join('\n'),
    );
    const wa = within(contact).getByRole('link', { name: 'Buka WhatsApp' });
    expect(decodeURIComponent(wa.getAttribute('href')!)).toBe(`https://wa.me/6281234567890?text=${message}`);
    fireEvent.click(within(contact).getByRole('button', { name: 'Ubah data' }));
    const again = within(contact).getByRole('form');
    expect((within(again).getByLabelText('Nama') as HTMLInputElement).value).toBe('Rina Kartika');
    expect((within(again).getByLabelText('Negara asal') as HTMLInputElement).value).toBe('Tiongkok');
  });

  it('ajakan: kotak bergaris dengan garis rute statis; footer teal-hitam dengan nama besar, menu, dan media sosial', () => {
    const container = demo();
    const inverse = Array.from(container.querySelectorAll('[data-tpl-tone="inverse"]')).map((el) => el.getAttribute('data-tpl-section'));
    expect(inverse).toEqual(['markets', 'footer']);
    const cta = section(container, 'cta');
    expect(cta.querySelector('h2')!.textContent).toBe('Kirim detail barang Anda, kami susun penawarannya');
    expect(cta.querySelector('[aria-hidden="true"]')!.textContent).toBe('SUBRTM');
    expect(within(cta).getByRole('link', { name: 'Minta Penawaran' })).toHaveAttribute('href', '#kontak');
    expect(within(cta).getByRole('link', { name: 'Konsultasi via WhatsApp' }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/6281234567890\?text=/);
    // Nama tautan unik: "Chat WhatsApp" hanya tombol melayang Shell
    expect(within(container).getAllByRole('link', { name: 'Chat WhatsApp' })).toHaveLength(1);
    const footer = container.querySelector('footer')!;
    expect(footer.getAttribute('data-tpl-section')).toBe('footer');
    expect(footer.className).toContain('bg-(--dm-deep)');
    expect(footer.textContent).toContain(`© ${new Date().getFullYear()} PT Lintas Dermaga Nusantara`);
    const wordmark = Array.from(footer.querySelectorAll('p[aria-hidden="true"]')).find((p) => p.textContent === 'Lintas Dermaga Nusantara');
    expect(wordmark).toBeDefined();
    expect(Array.from(within(footer).getByRole('navigation', { name: 'Tautan footer' }).querySelectorAll('a')).map((a) => a.getAttribute('href'))).toContain('#markets');
    expect(within(footer).getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://instagram.com/lintasdermaga.contoh');
    expect(within(footer).getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', 'https://linkedin.com/company/lintas-dermaga-contoh');
    expect(within(footer).getByRole('link', { name: 'YouTube' })).toHaveAttribute('href', 'https://youtube.com/@lintasdermaga.contoh');
    expect(within(footer).queryByRole('link', { name: 'Facebook' })).toBeNull();
  });

  it('datar: tidak ada kelas shadow di template (kecuali tombol melayang Shell)', () => {
    const container = demo();
    const shadows = Array.from(container.querySelectorAll('[class*="shadow"]')).filter(
      (el) => !el.closest('[aria-label="Chat WhatsApp"]') && !/Chat WhatsApp|Kembali ke atas/.test(el.getAttribute('aria-label') ?? ''),
    );
    expect(shadows.map((el) => el.className)).toEqual([]);
    const tsx = ['Dermaga', 'Header', 'Hero', 'Company', 'Services', 'Markets', 'Community', 'Closing', 'Contact', 'Inquiry', 'Footer', 'ui', 'marks'];
    const ts = ['index', 'styles', 'model', 'icons', 'hooks', 'schema', 'defaultContent', 'photos'];
    const source = [
      ...tsx.map((f) => readFileSync(resolve(ROOT, `src/templates/dermaga/${f}.tsx`), 'utf8')),
      ...ts.map((f) => readFileSync(resolve(ROOT, `src/templates/dermaga/${f}.ts`), 'utf8')),
      readFileSync(resolve(ROOT, 'src/templates/dermaga/dermaga.css'), 'utf8'),
    ].join('\n');
    expect(source).not.toMatch(/\bshadow-|box-shadow|drop-shadow/);
    // Kode (tanpa komentar): tanpa framer-motion/router, formulir tidak mengirim atau menyimpan apa pun
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/framer-motion|useLocation|useParams|localStorage|sessionStorage|fetch\(|XMLHttpRequest/);
  });
});

describe('Dermaga: gerak', () => {
  it('pratinjau CMS diam dan tanpa tautan wa.me terbuka', () => {
    const { container } = render(<def.Component content={resolveContent(def, null)} preview />);
    expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'off');
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    expect(container.querySelector('a[href^="javascript:"], a[href^="vbscript:"]')).toBeNull();
  });

  it('dermaga.css: animasi bergerbang [data-tpl-motion=\'on\'], blok prefers-reduced-motion, kelas dm-, keadaan diam = garis utuh', () => {
    const css = readFileSync(resolve(ROOT, 'src/templates/dermaga/dermaga.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).toContain('@layer components');
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(css).toMatch(/@keyframes dm-draw/);
    expect(css).toMatch(/\.dm-route-path\s*\{\s*stroke-dasharray: 1;\s*stroke-dashoffset: 0;/);
    for (const rule of css.match(/^\s*[^@\s{}][^{}]*\{[^}]*\b(transition|animation):[^}]*\}/gm) ?? []) {
      const selector = rule.split('{')[0];
      if (/transition:\s*none|animation:\s*none/.test(rule)) continue;
      expect(selector, rule).toContain("[data-tpl-motion='on']");
    }
    for (const cls of css.match(/\.[a-z][\w-]*/g) ?? []) if (!/^\.(tpl-)/.test(cls)) expect(cls, cls).toMatch(/^\.dm-/);
    // Durasi: garis ≤ 1,6 dtk, sekali jalan
    for (const [, seconds] of css.matchAll(/animation:\s*dm-[a-z]+\s+([\d.]+)s/g)) expect(Number(seconds)).toBeLessThanOrEqual(1.6);
    expect(css).not.toMatch(/infinite/);
  });
});

describe('Dermaga: warna tema bisa diganti', () => {
  it('teal bawaan → --tpl-accent; warna CMS mengalir ke pita, footer, dan warna terang', () => {
    const base = demo();
    expect(rootStyle(base, '--tpl-accent')).toBe('#0f5c63');
    expect(rootStyle(base, '--dm-band')).toBe('#0f5c63');
    expect(rootStyle(base, '--dm-deep')).toBe('#0b2226');
    expect(rootStyle(base, '--dm-bright')).toBe('#c1d5d6');
    cleanup();
    const red = demo({ brand: { accent_color: '#A61E3A' } });
    expect(rootStyle(red, '--tpl-accent')).toBe('#a61e3a');
    for (const name of ['--dm-band', '--dm-deep', '--dm-bright']) {
      expect(rootStyle(red, name), name).toBe((dermagaVars('#A61E3A') as Record<string, string>)[name]);
    }
    cleanup();
    expect(rootStyle(demo({ brand: { accent_color: '#FACC15' } }), '--tpl-on-accent')).toBe('#121620');
  });
});

describe('Dermaga: SEO situs pembeli, judul, gambar, tautan', () => {
  it('judul tab & meta description dari nama, tagline, dan deskripsi hero; theme-color = aksen', () => {
    expect(siteTitle('dermaga', null)).toBe('PT Lintas Dermaga Nusantara — Jasa Ekspor Impor Surabaya');
    const restore = applySiteHead('dermaga', null);
    const description = document.head.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
    expect(description).toMatch(/^Kami mengurus ekspor dan impor barang umum dari Surabaya/);
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(200);
    expect(document.head.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#0F5C63');
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
    // Klien tanpa judul → H2 tersembunyi untuk pembaca layar
    cleanup();
    const noTitle = section(demo({ clients: { title: '' } }), 'clients');
    expect(noTitle.querySelector('h2')).toHaveClass('sr-only');
  });

  it('gambar: alt deskriptif, width/height, srcset & sizes; foto persegi testimoni boleh alt kosong', () => {
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
      if (img.closest('figcaption')) expect(alt, src).toBe('');
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

describe('Dermaga: konten opsional kosong', () => {
  it('hero: tanpa titik rute → tanpa garis & chip; 2 titik → pin asal & tujuan; 1 titik → chip saja; tanpa angka → tanpa strip', () => {
    const none = section(demo({ hero: { ports: [], stats: [], header_label: '' } }), 'hero');
    expect(none.querySelector(ROUTE_SVG)).toBeNull();
    expect(within(none).queryByRole('list', { name: 'Contoh rute pengiriman' })).toBeNull();
    expect(none.querySelector('dl')).toBeNull();
    expect(none.querySelector('img[fetchpriority="high"]')).not.toBeNull();
    cleanup();
    const container = demo({ hero: { header_label: '' } });
    expect(within(container.querySelector('header')!).queryByRole('link', { name: 'Minta Penawaran' })).toBeNull();
    cleanup();
    const two = section(demo({ hero: { ports: [{ code: 'SUB', name: 'Surabaya' }, { code: 'BUS', name: 'Busan' }] } }), 'hero');
    expect(two.querySelectorAll('.dm-pin')).toHaveLength(4);
    expect(two.querySelectorAll('.dm-port')).toHaveLength(2);
    cleanup();
    const one = section(demo({ hero: { ports: [{ code: 'SUB', name: '' }], stats: [{ value: '38', label: 'Negara' }, { value: '6', label: 'Pelabuhan' }, { value: '', label: '' }] } }), 'hero');
    expect(one.querySelector(ROUTE_SVG)).toBeNull();
    expect(one.querySelectorAll('.dm-port')).toHaveLength(1);
    expect(one.querySelector('dl')!.className).toContain('grid-cols-2');
    expect(one.querySelectorAll('dl > div')).toHaveLength(2);
  });

  it('pasar tanpa foto → tabel selebar wadah; tanpa Incoterm → tanpa label; label kosong → nomor dilewati', () => {
    const container = demo({ markets: { image: '', terms: '' }, services: { eyebrow: '' } });
    const markets = section(container, 'markets');
    expect(markets.querySelector('img')).toBeNull();
    expect(markets.innerHTML).toContain('@5xl:col-span-12');
    expect(within(markets).queryByRole('list', { name: /Incoterm/ })).toBeNull();
    expect(markets.querySelector('p')!.textContent).toBe('02/Pasar');
    expect(section(container, 'services').querySelector('h2')).not.toBeNull();
    expect(section(container, 'services').textContent).not.toContain('/Layanan');
  });

  it('layanan & galeri tanpa foto, testimoni tanpa foto, footer tanpa media sosial', () => {
    const container = demo({
      services: { items: [{ title: 'Asuransi kargo', description: 'Perlindungan muatan.' }] },
      gallery: { items: [{ image: '', caption: 'kosong' }, { image: '/assets/templates/photos/dermaga-galeri-tim-1200.webp', caption: 'Tim' }] },
      testimonials: { items: [{ name: 'Budi Santoso', quote: 'Rapi.', photo: '' }] },
      footer: { instagram: '', linkedin: '', youtube: '' },
    });
    const services = section(container, 'services');
    expect(services.querySelectorAll('article')).toHaveLength(1);
    expect(services.querySelector('img')).toBeNull();
    const gallery = section(container, 'gallery');
    expect(gallery.querySelectorAll('img')).toHaveLength(1);
    expect(gallery.querySelector('figcaption')!.textContent).toBe('G01Tim');
    const testimonials = section(container, 'testimonials');
    expect(testimonials.querySelector('img')).toBeNull();
    expect(testimonials.textContent).toContain('BS');
    const footer = container.querySelector('footer')!;
    expect(footer.textContent).not.toContain('Media sosial');
    cleanup();
    const hidden = demo({ gallery: { items: [] }, faq: { enabled: false }, footer: { enabled: false } });
    expect(sectionKeys(hidden)).not.toContain('gallery');
    expect(sectionKeys(hidden)).not.toContain('faq');
    expect(hidden.querySelector('footer')).toBeNull();
    expect(Array.from(hidden.querySelector('header nav')!.querySelectorAll('a')).map((a) => a.getAttribute('href'))).not.toContain('#galeri');
  });

  it('tanpa WhatsApp → tautan email; tanpa WhatsApp & email → salin pesan', () => {
    const fill = (formEl: HTMLElement) => {
      fireEvent.change(within(formEl).getByLabelText('Nama'), { target: { value: 'Rina' } });
      fireEvent.change(within(formEl).getByLabelText('Jenis layanan'), { target: { value: 'Ekspor' } });
      fireEvent.change(within(formEl).getByLabelText('Komoditas / produk'), { target: { value: 'Keramik' } });
      fireEvent.change(within(formEl).getByLabelText('Volume'), { target: { value: '2 palet' } });
      fireEvent.change(within(formEl).getByLabelText('Negara tujuan'), { target: { value: 'Jepang' } });
      act(() => {
        fireEvent.submit(formEl);
      });
    };
    const container = demo({ contact: { whatsapp: '' } });
    const contact = section(container, 'contact');
    const formEl = within(contact).getByRole('form');
    expect(within(formEl).getByRole('button', { name: 'Susun pesan' })).toHaveAttribute('type', 'submit');
    fill(formEl);
    expect(within(contact).getByRole('link', { name: 'Kirim lewat email' }).getAttribute('href')).toMatch(
      /^mailto:penawaran@lintasdermaga\.test\?subject=Permintaan%20penawaran&body=Halo%20PT%20Lintas/,
    );
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    cleanup();
    const bare = section(demo({ contact: { whatsapp: '', email: '' } }), 'contact');
    fill(within(bare).getByRole('form'));
    expect(within(bare).getByRole('button', { name: 'Salin pesan' })).toBeInTheDocument();
  });
});

describe('Dermaga: editor CMS', () => {
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

describe('Dermaga: data katalog', () => {
  const sql = (file: string) => readFileSync(resolve(ROOT, file), 'utf8');

  it.each(['database/seed.templates.sql', 'database/migrations/2026-10-27_035_dermaga_template.sql'])(
    '%s: baris dermaga dengan template_code, kategori, harga, dan pratinjau tangkapan layar .webp',
    (file) => {
      const text = sql(file);
      expect(text).toContain("'dermaga'");
      expect(text).toContain("'Company Profile'");
      expect(text).toContain('1590000.00');
      expect(text).toContain("'/assets/templates/dermaga-preview.webp'");
      expect(text).toContain('\'["/assets/templates/dermaga-1.webp","/assets/templates/dermaga-2.webp"]\'');
      expect(text).toMatch(/data tidak disimpan di website dan tidak ada pelacakan kiriman real-time/);
      expect(text).not.toMatch(/termasuk domain|domain, hosting/);
    },
  );

  it('migrasi 035 aman diulang (INSERT IGNORE + UPDATE berdasarkan slug, tanpa DELETE) dan tercatat di schema_migrations', () => {
    const raw = sql('database/migrations/2026-10-27_035_dermaga_template.sql');
    expect(raw).toMatch(/Domain\s+(--\s+)?tidak termasuk harga template/);
    expect(raw).toMatch(/FIKTIF/);
    const text = raw.replace(/^--.*$/gm, '');
    expect(text).toMatch(/INSERT IGNORE INTO templates/);
    expect(text).toMatch(/WHERE slug = 'dermaga';/);
    expect(text).toMatch(/sort_order\s+= 18/);
    expect(text).toMatch(/status\s+= 'published'/);
    expect(text).not.toMatch(/\bDELETE\b/);
    expect(text).toContain("VALUES ('2026-10-27_035', 'templates: katalog Dermaga')");
  });

  it('gambar pratinjau katalog ada di public/, 1600×1000, dan ringan', () => {
    for (const name of ['dermaga-preview', 'dermaga-1', 'dermaga-2']) {
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

describe('Dermaga: konten aneh', () => {
  it('angka, null, dan string di tempat list tidak membuat crash; tautan berbahaya dibuang', () => {
    const weird = {
      hero: { image: 'javascript:alert(1)', highlight: 'tidak ada di judul', primary_url: 'javascript:alert(1)', ports: 'x', stats: [{ value: 5 }, null] },
      clients: { items: [null, { name: 3 }, { name: 'Klien', logo: 'javascript:alert(1)' }] },
      about: { facts: 'x', body: 42, link_url: 'vbscript:x' },
      services: { items: [{ title: 2 }, { title: 'Gudang', image: 'javascript:alert(1)', tags: null }] },
      markets: { regions: [{ name: 'Eropa', ports: 7 }], terms: 9 },
      process: { steps: [null, 'x', { text: 'tanpa judul' }] },
      gallery: { items: [{ image: 'javascript:alert(1)' }, 'x'] },
      testimonials: { items: [{ quote: 'Baik', photo: 'javascript:alert(1)' }] },
      faq: { items: [{ question: 2, answer: null }], link_url: 'vbscript:x' },
      contact: { whatsapp: 'abc', form_services: 'x', maps_url: 'javascript:alert(1)' },
      footer: { instagram: 'javascript:alert(1)' },
      brand: { accent_color: 'oranye' },
    } as unknown as SiteContent;
    const { container } = render(<def.Component content={resolveContent(def, weird)} />);
    expect(container.querySelector('a[href^="javascript:"], a[href^="vbscript:"]')).toBeNull();
    expect(container.querySelector('img[src^="javascript:"]')).toBeNull();
    expect(container.querySelector('h1')!.textContent).toBe('Ekspor dan impor yang tertata, dari gudang sampai pelabuhan tujuan');
    expect(section(container, 'markets').textContent).toContain('Eropa');
    expect(sectionKeys(container)).not.toContain('gallery');
    expect(sectionKeys(container)).not.toContain('process');
    cleanup();
    for (const content of [{}, null]) {
      const { container: empty } = render(<def.Component content={content as unknown as SiteContent} />);
      expect(empty.querySelector('[data-tpl-root]')).not.toBeNull();
      cleanup();
    }
  });

  it('semua section mati → tidak ada [data-tpl-section] dan tanpa footer', () => {
    const off = Object.fromEntries(def.sections.filter((s) => s.toggleable).map((s) => [s.key, { enabled: false }]));
    const container = demo(off);
    expect(container.querySelectorAll('[data-tpl-section]')).toHaveLength(0);
    expect(container.querySelector('footer')).toBeNull();
  });
});
