// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/nusaline.test.tsx
// Nusaline (PO bus antarkota / bus malam "night line", batch travel & transportasi 2026-10-29): skema CMS & konten demo,
// foto, salinan jujur (pemesanan hanya menyusun pesan WhatsApp: tanpa pembayaran online, e-tiket, atau pilihan kursi
// real-time; tanpa merek/tipe kendaraan, izin trayek, atau asuransi), helper model (warna tema, menu, tujuan tautan, jam &
// durasi, jadwal + tiba/+1, saringan, formulir cari jadwal → pesan WhatsApp, denah kursi, garis waktu & progres film),
// demo (urutan section, hero departure + kartu cari + papan keberangkatan, header + menu HP, tabel jadwal, tab kelas,
// film diam & bergerak, tab kota, akordeon), wadah PENUH, datar tanpa bayangan, gerak (pratinjau CMS diam, CSS nl-
// bergerbang data-tpl-motion), warna tema, SEO situs pembeli, judul & gambar & tautan, konten opsional kosong, editor CMS,
// data katalog (migrasi 050 + pratinjau + halaman katalog), dan konten aneh.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionEditor } from '../../pages/account/cms/SectionEditor';
import { validateContent } from '../../pages/account/cms/validation';
import { seo as catalogSeo, page as catalogPage } from '../../content/templates/nusaline';
import { content as catalogContent } from '../../content/templates/nusaline.content';
import { TEMPLATES, resolveContent } from '../index';
import { iconKey } from '../nusaline/icons';
import {
  ALL_ROUTES,
  BAND,
  FILM,
  MIDNIGHT,
  NIGHT_CARD,
  PAGE_SECTIONS,
  applyScheduleFilter,
  bookingMessage,
  boardRows,
  chapterAt,
  chapterWindow,
  cityCode,
  clampPax,
  cleanText,
  clockAt,
  dateError,
  displayPhone,
  distanceAt,
  filmTimeline,
  filterSummary,
  fitFilmBus,
  formatClock,
  formatDuration,
  formatLongDate,
  formatRupiah,
  groupThousands,
  kmAt,
  navItems,
  nusalineVars,
  parseClock,
  parseDistance,
  parseDuration,
  parsePrice,
  pointsCount,
  pointsMessage,
  readClasses,
  readDepartures,
  readNusaline,
  readStops,
  resultCount,
  routeChips,
  scheduleCities,
  scrollProgress,
  seatGeometry,
  seatLayout,
  sectionShown,
  sectionTarget,
  shortClass,
  splitRoute,
  splitTitle,
  spokenDuration,
  todayIso,
  validateSearch,
  type Departure,
  type SearchForm,
} from '../nusaline/model';
import { NEAR_TRAVEL } from '../nusaline/paths';
import { NUSALINE_PHOTOS } from '../nusaline/photos';
import { WRAP } from '../nusaline/styles';
import { applySiteHead, siteTitle } from '../siteHead';
import { SiteRenderer } from '../SiteRenderer';
import { contrast, parseHex } from '../shared/utils';
import { isListField, type SiteContent } from '../types';

// Demo panjang + getByRole di jsdom: bisa lewat 5 dtk saat suite berjalan paralel
vi.setConfig({ testTimeout: 30_000 });

const ROOT = process.cwd();
const def = TEMPLATES.nusaline;
const ORDER = ['hero', 'schedule', 'classes', 'film', 'routes', 'onboard', 'steps', 'testimonials', 'faq', 'contact'];
const sectionKeys = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-tpl-section]')).map((s) => s.getAttribute('data-tpl-section'));
const section = (root: HTMLElement, key: string) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`)!;
const demo = (content: unknown = null, preview = false) => render(<SiteRenderer templateCode="nusaline" content={content} preview={preview} />).container;
const rgb = (hex: string) => parseHex(hex)!;
const publicFile = (url: string) => resolve(ROOT, 'public', url.replace(/^\//, ''));
const rootStyle = (container: HTMLElement, name: string) => {
  const holder = Array.from(container.querySelectorAll<HTMLElement>('[style]')).find((el) => el.style.getPropertyValue(name));
  return holder?.style.getPropertyValue(name) ?? '';
};
const urls = (src: string) => {
  const asset = NUSALINE_PHOTOS.asset(src)!;
  return [asset.src, ...asset.srcSet!.split(',').map((part) => part.trim().split(' ')[0])].filter((u, i, all) => all.indexOf(u) === i);
};
const wait = (ms: number) => act(() => new Promise<void>((r) => setTimeout(r, ms)));
/**
 * Setup uji (__tests__/setup.ts) meniru IntersectionObserver & matchMedia (tanpa reduced motion), jadi demo di jsdom
 * memakai versi BERGERAK. `reducedMotion(fn)` menjalankan fn dengan prefers-reduced-motion: reduce → film diam.
 */
const reducedMotion = <T,>(fn: () => T): T => {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    matches: /prefers-reduced-motion:\s*reduce/.test(query),
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  try {
    return fn();
  } finally {
    window.matchMedia = original;
  }
};
const classOf = (el: Element) => el.getAttribute('class') ?? '';
const decode = (a: Element) => decodeURIComponent(a.getAttribute('href') ?? '');
const WA = 'https://wa.me/6281234567890?text=';
const DEMO = resolveContent(def, null);
const DEPARTURES = readDepartures(DEMO.schedule);
const STOPS = readStops(DEMO.routes);
const TIMELINE = filmTimeline(DEMO.film);
const times = (list: Departure[]) => list.map((d) => `${formatClock(d.depart)} ${d.from}→${d.to}`);
const TSX = ['Nusaline', 'Header', 'Hero', 'Schedule', 'Classes', 'Film', 'Routes', 'Onboard', 'Stories', 'Closing', 'Footer', 'ui', 'marks', 'vehicles', 'scenes'];
const TS = ['index', 'styles', 'model', 'icons', 'hooks', 'schema', 'defaultContent', 'photos', 'paths'];
const source = () =>
  [
    ...TSX.map((f) => readFileSync(resolve(ROOT, `src/templates/nusaline/${f}.tsx`), 'utf8')),
    ...TS.map((f) => readFileSync(resolve(ROOT, `src/templates/nusaline/${f}.ts`), 'utf8')),
    readFileSync(resolve(ROOT, 'src/templates/nusaline/nusaline.css'), 'utf8'),
  ].join('\n');
/** Kode tanpa komentar (komentar boleh menyebut kata yang dilarang di teks tampil) */
const code = () =>
  source()
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

let scrolled: (string | null)[] = [];
beforeEach(() => {
  scrolled = [];
  Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
    scrolled.push(this.getAttribute('data-tpl-section'));
  });
});
afterEach(cleanup);

describe('Nusaline: skema & konten bawaan', () => {
  it('urutan form = urutan halaman, semua section bisa disembunyikan, field unik, teks berbatas, list berbatas', () => {
    expect(def.code).toBe('nusaline');
    expect(def.name).toBe('Nusaline');
    expect(def.features).toBeUndefined();
    expect(def.sections.map((s) => s.key)).toEqual(['brand', ...ORDER, 'footer']);
    expect([...PAGE_SECTIONS]).toEqual([...ORDER, 'footer']);
    const fields = (key: string) => def.sections.find((s) => s.key === key)!.fields.map((f) => f.key);
    expect(fields('brand')).toEqual(['company_name', 'tagline', 'logo', 'accent_color']);
    expect(def.sections[0].fields.find((f) => f.key === 'accent_color')?.type).toBe('color');
    expect(fields('hero')).toEqual([
      'eyebrow',
      'title',
      'highlight',
      'subtitle',
      'image',
      'primary_label',
      'secondary_label',
      'search_title',
      'search_button',
      'board_title',
      'header_label',
      'header_url',
    ]);
    expect(fields('schedule')).toEqual(expect.arrayContaining(['note', 'book_label', 'empty_text', 'items']));
    expect(fields('film')).toEqual(expect.arrayContaining(['distance', 'chapters']));
    expect(fields('routes')).toEqual(expect.arrayContaining(['note', 'link_label', 'stops', 'points']));
    expect(fields('contact')).toEqual(expect.arrayContaining(['address', 'maps_query', 'maps_url', 'phone', 'email', 'whatsapp', 'whatsapp_message', 'hours']));
    expect(fields('footer')).toEqual(expect.arrayContaining(['description', 'note', 'copyright', 'instagram', 'facebook', 'linkedin', 'youtube', 'tiktok']));
    const contact = def.sections.find((s) => s.key === 'contact')!;
    expect(contact.fields.find((f) => f.key === 'whatsapp')?.type).toBe('phone');
    // Hero: foto latar bernama `image` (dibaca tes bersama new-templates)
    expect(def.sections.find((s) => s.key === 'hero')!.fields.find((f) => f.key === 'image')?.type).toBe('image');
    const schedule = def.sections.find((s) => s.key === 'schedule')!.fields.find((f) => f.key === 'items');
    expect(isListField(schedule!) && schedule.fields.map((f) => f.key)).toEqual(['from', 'to', 'depart', 'duration', 'class', 'price']);
    const classes = def.sections.find((s) => s.key === 'classes')!.fields.find((f) => f.key === 'items');
    expect(isListField(classes!) && classes.fields.map((f) => f.key)).toEqual(['name', 'layout', 'seats', 'legroom', 'features', 'price', 'image']);
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
          for (const sub of f.fields) {
            expect(sub.introduced, `${s.key}.${f.key}.${sub.key}`).toBeUndefined();
            if (['text', 'textarea', 'phone', 'email'].includes(sub.type)) expect(sub.maxLength, `${s.key}.${f.key}.${sub.key}`).toBeGreaterThan(0);
          }
        } else if (['text', 'textarea', 'phone', 'email'].includes(f.type)) {
          expect(f.maxLength, `${s.key}.${f.key}`).toBeGreaterThan(0);
        }
      }
    }
    // Batas yang disebut di halaman katalog (nusaline.content.ts) = batas yang dirender model
    expect(max).toEqual({
      'schedule.items': 16,
      'classes.items': 4,
      'film.chapters': 5,
      'routes.stops': 8,
      'routes.points': 24,
      'onboard.items': 8,
      'onboard.photos': 2,
      'steps.items': 4,
      'testimonials.items': 6,
      'faq.items': 8,
    });
    const page = JSON.stringify(catalogContent);
    for (const phrase of ['Hingga 16 baris jadwal', 'Hingga 4 kelas', 'hingga 5 bab', 'hingga 8 kota', 'hingga 24 agen', 'hingga 8 fasilitas', 'Hingga 4 langkah', 'Hingga 6 kutipan', 'Hingga 8 pertanyaan']) {
      expect(page, phrase).toContain(phrase);
    }
    const many = (n: number, item: (i: number) => Record<string, string>) => Array.from({ length: n }, (_, i) => item(i));
    expect(readDepartures({ items: many(20, (i) => ({ from: 'A', to: 'B', depart: `${10 + (i % 10)}.00` })) })).toHaveLength(16);
    expect(readClasses({ items: many(6, (i) => ({ name: `Kelas ${i}` })) })).toHaveLength(4);
    expect(filmTimeline({ chapters: many(7, (i) => ({ time: `${19 + (i % 4)}.00`, title: `Bab ${i}` })) }).chapters).toHaveLength(5);
    expect(readStops({ stops: many(10, (i) => ({ city: `Kota ${i}` })) })).toHaveLength(8);
  });

  it('konten demo lolos validasi CMS, logo kosong, semua foto terdaftar, ada di public/, dipakai, dan beralt deskriptif', () => {
    const c = def.defaultContent;
    expect(validateContent(def, resolveContent(def, null))).toEqual({});
    expect(c.brand.logo).toBe('');
    expect(c.brand.company_name).toBe('Nusaline');
    expect(c.brand.tagline).toBe('Bus malam Jakarta–Bali setiap hari');
    expect(c.brand.accent_color).toBe('#D81E5B');
    expect(c.contact.whatsapp).toBe('081234567890');
    expect(c.contact.phone).toBe('081234567890');
    expect(c.contact.email).toBe('tiket@example.com');
    expect(c.hero.image).toBe('/assets/templates/photos/nusaline-hero-1920.webp');
    for (const s of def.sections) if (s.key !== 'brand') expect(c[s.key].enabled, s.key).toBe(true);
    const photos = JSON.stringify(c).match(/\/assets\/templates\/photos\/[a-z0-9-]+\.webp/g) ?? [];
    for (const src of photos) expect(NUSALINE_PHOTOS.asset(src), src).not.toBeNull();
    expect(NUSALINE_PHOTOS.keys).toHaveLength(12);
    // Kelas Sleeper tanpa foto (tidak ada foto kabin bus tidur asli berlisensi bebas) → ilustrasi SVG, bukan foto tempat lain
    expect((c.classes.items as { name: string; image: string }[]).map((k) => `${k.name}:${k.image ? 'foto' : '-'}`)).toEqual(['Eksekutif:foto', 'Super Eksekutif:foto', 'Sleeper:-']);
    for (const key of NUSALINE_PHOTOS.keys) {
      expect(key.startsWith('nusaline-'), key).toBe(true);
      for (const url of urls(NUSALINE_PHOTOS.src(key))) expect(existsSync(publicFile(url)), url).toBe(true);
      expect(photos, `${key} dipakai di konten demo`).toContain(NUSALINE_PHOTOS.src(key));
      expect(NUSALINE_PHOTOS.alt(NUSALINE_PHOTOS.src(key), '').split(' ').length, key).toBeGreaterThanOrEqual(5);
    }
    // Simbol bawaan juga tersedia sebagai SVG mandiri, path sama dengan komponen
    const mark = readFileSync(publicFile('/assets/templates/logos/nusaline-mark.svg'), 'utf8');
    const component = readFileSync(resolve(ROOT, 'src/templates/nusaline/marks.tsx'), 'utf8');
    const paths = mark.match(/ d="[^"]+"/g) ?? [];
    expect(paths).toHaveLength(2);
    for (const d of paths) expect(component, d).toContain(d.trim());
    expect(mark).toMatch(/viewBox="0 0 32 32"/);
    expect(mark).toMatch(/role="img"/);
    expect(mark).toMatch(/<title>Simbol Nusaline<\/title>/);
    // Judul tab situs pembeli ≤ 60 huruf, deskripsi hero 120–140, judul hero ≤ 8 kata, label ≤ 60 (batch-delta B)
    expect(`${c.brand.company_name} — ${c.brand.tagline}`.length).toBeLessThanOrEqual(60);
    expect(String(c.hero.subtitle).length).toBeGreaterThanOrEqual(120);
    expect(String(c.hero.subtitle).length).toBeLessThanOrEqual(140);
    expect(String(c.hero.title).split(' ').length).toBeLessThanOrEqual(8);
    expect(String(c.hero.eyebrow).length).toBeLessThanOrEqual(60);
    // Kepala section: H2 ≤ 8 kata, kalimat pengantar ≤ 110 huruf; kartu ≤ 120 huruf (owner: "teks jangan keramaian")
    for (const key of ORDER.filter((k) => k !== 'hero')) {
      expect(String(c[key].title).split(' ').length, key).toBeLessThanOrEqual(8);
      expect(String(c[key].subtitle ?? '').length, key).toBeLessThanOrEqual(110);
    }
    for (const t of c.testimonials.items as { quote: string }[]) expect(t.quote.length).toBeLessThanOrEqual(120);
    for (const t of c.onboard.items as { text: string }[]) expect(t.text.length).toBeLessThanOrEqual(120);
    for (const t of c.steps.items as { text: string }[]) expect(t.text.length).toBeLessThanOrEqual(120);
    for (const t of c.film.chapters as { text: string }[]) expect(t.text.length).toBeLessThanOrEqual(100);
    // Angka di salinan = data: 6 kota di rute, 3 kelas, 780 km, 3 langkah
    expect(STOPS.map((s) => s.city)).toEqual(['Jakarta', 'Semarang', 'Yogyakarta', 'Surabaya', 'Malang', 'Denpasar']);
    expect(String(c.hero.subtitle)).toContain('Jakarta ke Semarang, Yogyakarta, Surabaya, Malang, dan Denpasar');
    expect(c.classes.items).toHaveLength(3);
    expect(String(c.classes.subtitle)).toMatch(/^Tiga kelas/);
    expect(c.steps.items).toHaveLength(3);
    expect(String(c.steps.subtitle)).toMatch(/^Tiga langkah/);
    expect(c.film.distance).toBe('780');
  });

  // CREDITS.md gets this template's section at integration
  it('setiap kunci foto tercatat di CREDITS.md', () => {
    const credits = readFileSync(resolve(ROOT, 'public/assets/templates/photos/CREDITS.md'), 'utf8');
    expect(NUSALINE_PHOTOS.keys.filter((key) => !credits.includes(`\`${key}-*\``))).toEqual([]);
  });

  it('foto demo ringan: hero 800/1280/1920, WebP ≤ 140 KB per file (800w ≤ 90 KB), total ≤ 2,5 MB', () => {
    expect(NUSALINE_PHOTOS.asset(def.defaultContent.hero.image as string)!.srcSet).toBe(
      '/assets/templates/photos/nusaline-hero-800.webp 800w, /assets/templates/photos/nusaline-hero-1280.webp 1280w, /assets/templates/photos/nusaline-hero-1920.webp 1920w',
    );
    let total = 0;
    for (const key of NUSALINE_PHOTOS.keys) {
      for (const url of urls(NUSALINE_PHOTOS.src(key))) {
        expect(url, url).toMatch(/\.webp$/);
        const kb = statSync(publicFile(url)).size / 1024;
        expect(kb, url).toBeLessThanOrEqual(url.endsWith('-800.webp') ? 90 : 140);
        expect(readFileSync(publicFile(url)).toString('ascii', 8, 12), url).toBe('WEBP');
        total += kb;
      }
    }
    expect(total).toBeLessThanOrEqual(2500);
  });

  it('salinan demo jujur: hanya menyusun pesan WhatsApp, jadwal & harga contoh, tanpa klaim izin/asuransi, tanpa merek kendaraan', () => {
    const text = JSON.stringify(def.defaultContent);
    expect(text).not.toMatch(/dijamin|garansi|pasti|terbaik|nomor 1|#1|termurah|100%|paling aman|anti telat|tepat waktu/i);
    expect(text).not.toMatch(/izin trayek|berizin|Kemenhub|Dishub|terdaftar resmi|ASITA|IPOMI|PAWIBA|uji KIR|\bISO\b|asuransi|Jasa Raharja|bersertifikat/i);
    expect(text).not.toMatch(
      /\b(Mercedes|Benz|Hino|Scania|Volvo|Setra|MAN|Isuzu|Fuso|Mitsubishi|Toyota|Daihatsu|Suzuki|Honda|Nissan|Hyundai|Avanza|Innova|HiAce|Hiace|Elf|Alphard|Pajero|Jetbus|Adiputro|Laksana|Tentrem|Legacy)\b/,
    );
    expect(text).not.toMatch(/e-tiket (dikirim|langsung)|bayar online|pembayaran online tersedia|kursi real-time tersedia|lacak bus/i);
    // Kalimat "tidak melakukan" terkunci
    expect(def.defaultContent.steps.note).toBe('Pemesanan hanya menyusun pesan WhatsApp; tidak ada pembayaran online, e-tiket, atau pilihan kursi real-time.');
    expect(def.defaultContent.schedule.note).toBe('Jadwal dan harga contoh; kursi dikonfirmasi admin lewat WhatsApp.');
    expect(def.defaultContent.routes.note).toBe('Alamat dan jam agen contoh; konfirmasi titik naik lewat WhatsApp.');
    expect(def.defaultContent.classes.note).toBe('Harga mulai contoh; harga final dari admin.');
    expect(text).toMatch(/Tidak ada pembayaran online di website ini\./);
    expect(text).toMatch(/Tergantung armada/);
    expect(text).toContain('@example.com');
    expect(text).not.toMatch(/@(gmail|yahoo)\./);
    // Penumpang fiktif tanpa foto wajah (inisial); agen tanpa foto
    expect(JSON.stringify(def.defaultContent.testimonials)).not.toMatch(/\.webp/);
    expect(JSON.stringify(def.defaultContent.routes.points)).not.toMatch(/\.webp/);
  });
});

describe('Nusaline: helper model', () => {
  it('warna tema: neon ≥ 5:1 di kartu malam, teks aksen ≥ 4,5:1 di pita & putih, putih di raspberry ≥ 4,5:1; tidak valid → bawaan', () => {
    const white = rgb('#ffffff');
    expect(nusalineVars('#D81E5B')).toEqual({ '--nl-neon': '#e67097', '--nl-ink': '#bc1c55', '--nl-livery-dark': '#721741' });
    expect(contrast(rgb('#D81E5B'), white)).toBeGreaterThanOrEqual(4.5);
    expect(NIGHT_CARD).toEqual([255 * 0.08 + 11 * 0.92, 255 * 0.08 + 16 * 0.92, 255 * 0.08 + 38 * 0.92].map(Math.round));
    for (const accent of ['#D81E5B', '#1D4ED8', '#A61E3A', '#B7791F', '#FACC15', '#C6F135', '#FFFFFF', '#000000', '#0B1026', '#6EE7B7', '#7C3AED', '#12A07F', '#F2F4FA']) {
      const vars = nusalineVars(accent) as Record<string, string>;
      const neon = rgb(vars['--nl-neon']);
      const ink = rgb(vars['--nl-ink']);
      expect(contrast(neon, NIGHT_CARD), accent).toBeGreaterThanOrEqual(5);
      expect(contrast(neon, MIDNIGHT), accent).toBeGreaterThanOrEqual(5);
      expect(contrast(ink, BAND), accent).toBeGreaterThanOrEqual(4.5);
      expect(contrast(ink, white), accent).toBeGreaterThanOrEqual(4.5);
      expect(vars['--nl-livery-dark'], accent).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(nusalineVars('zzz')).toEqual(nusalineVars('#D81E5B'));
    expect(nusalineVars('')).toEqual(nusalineVars('#D81E5B'));
  });

  it('menu: label pendek = label section (≤ 6), section kosong/tersembunyi keluar dari menu', () => {
    expect(navItems(DEMO).map((i) => `${i.key}:${i.label}`)).toEqual(['schedule:Jadwal', 'classes:Kelas', 'routes:Rute', 'onboard:Fasilitas', 'faq:FAQ', 'contact:Kontak']);
    const less = resolveContent(def, { schedule: { items: [{ from: 'Jakarta' }] }, classes: { enabled: false }, faq: { items: [] } });
    expect(navItems(less).map((i) => i.key)).toEqual(['routes', 'onboard', 'contact']);
  });

  it('tujuan tautan: anchor Indonesia dan kunci section; anchor tak dikenal → null; tujuan tombol menu atas', () => {
    expect(sectionTarget('#jadwal')).toBe('schedule');
    expect(sectionTarget('keberangkatan')).toBe('schedule');
    expect(sectionTarget('#tiket')).toBe('schedule');
    expect(sectionTarget('#kelas')).toBe('classes');
    expect(sectionTarget('#kursi')).toBe('classes');
    expect(sectionTarget('#perjalanan')).toBe('film');
    expect(sectionTarget('#rute')).toBe('routes');
    expect(sectionTarget('#titik-naik')).toBe('routes');
    expect(sectionTarget('#fasilitas')).toBe('onboard');
    expect(sectionTarget('#cara-pesan')).toBe('steps');
    expect(sectionTarget('#tanya-jawab')).toBe('faq');
    expect(sectionTarget('#kontak')).toBe('contact');
    expect(sectionTarget('#kantor')).toBe('contact');
    expect(sectionTarget('#testimoni')).toBe('testimonials');
    expect(sectionTarget('#beranda')).toBe('hero');
    expect(sectionTarget('schedule')).toBe('schedule');
    expect(sectionTarget('#tidak-ada')).toBeNull();
    const m = readNusaline(DEMO);
    expect(m.headerAction).toEqual({ kind: 'section', target: 'schedule' });
    // Tombol hero: jadwal sudah punya "Cari jadwal" (kartu) & "Cek Jadwal" (menu) → hero ke Kelas dan Rute
    expect(m.primaryAction).toEqual({ kind: 'section', target: 'classes' });
    expect(m.secondaryAction).toEqual({ kind: 'section', target: 'routes' });
    expect(m.linkOr('#kelas', null)).toEqual({ kind: 'section', target: 'classes' });
    expect(m.linkOr('#tidak-ada', m.scheduleAction)).toEqual({ kind: 'section', target: 'schedule' });
    expect(m.linkOr('https://contoh.test/promo', null)).toEqual({ kind: 'external', href: 'https://contoh.test/promo' });
    expect(m.linkOr('javascript:alert(1)', null)).toBeNull();
    expect(readNusaline(resolveContent(def, { hero: { header_url: '#rute' } })).headerAction).toEqual({ kind: 'section', target: 'routes' });
    // Tanpa jadwal → Kontak; tanpa jadwal & kontak → WhatsApp; tanpa semuanya → tidak ada tombol
    const noSchedule = readNusaline(resolveContent(def, { schedule: { enabled: false } }));
    expect(noSchedule.headerAction).toEqual({ kind: 'section', target: 'contact' });
    expect(noSchedule.linkOr('#jadwal', null)).toBeNull();
    const onlyWa = readNusaline(resolveContent(def, { schedule: { enabled: false }, contact: { enabled: false } }));
    expect(onlyWa.headerAction?.kind).toBe('external');
    const none = readNusaline(resolveContent(def, { schedule: { enabled: false }, contact: { enabled: false, whatsapp: '' } }));
    expect(none.headerAction).toBeNull();
    // Section tersembunyi → tombolnya tidak tampil (label tidak pernah menunjuk ke tempat lain)
    expect(readNusaline(resolveContent(def, { classes: { enabled: false } })).primaryAction).toBeNull();
    expect(readNusaline(resolveContent(def, { routes: { enabled: false } })).secondaryAction).toBeNull();
  });

  it('section tampil hanya bila berisi', () => {
    for (const key of ORDER) expect(sectionShown(DEMO, key), key).toBe(true);
    const empty = resolveContent(def, {
      schedule: { items: [{ from: 'Jakarta', to: 'Surabaya', depart: 'malam' }] },
      classes: { items: [{ layout: '2-2' }] },
      film: { chapters: [{ time: '19.00' }] },
      routes: { stops: [{ code: 'JKT' }] },
      onboard: { items: [], image: '' },
      steps: { items: [{ text: 'tanpa judul' }] },
      testimonials: { items: [{ name: 'tanpa kutipan' }] },
      faq: { items: [{ answer: 'tanpa pertanyaan' }] },
    });
    for (const key of ['schedule', 'classes', 'film', 'routes', 'onboard', 'steps', 'testimonials', 'faq']) expect(sectionShown(empty, key), key).toBe(false);
    for (const key of ['hero', 'contact', 'footer']) expect(sectionShown(empty, key), key).toBe(true);
    // Fasilitas: foto besar saja sudah cukup
    expect(sectionShown(resolveContent(def, { onboard: { items: [] } }), 'onboard')).toBe(true);
    expect(sectionShown(resolveContent(def, { contact: { enabled: false } }), 'contact')).toBe(false);
    expect(sectionShown(DEMO, 'tidak-ada')).toBe(false);
    expect(sectionShown(DEMO, 'brand')).toBe(false);
  });

  it('harga & angka: baca angka biasa / bersatuan, tulis "Rp545.000"', () => {
    expect(parsePrice('545000')).toBe(545_000);
    expect(parsePrice('Rp545.000')).toBe(545_000);
    expect(parsePrice('Rp 650.000,-')).toBe(650_000);
    expect(parsePrice('650.000,00')).toBe(650_000);
    expect(parsePrice('545 rb')).toBe(545_000);
    expect(parsePrice('1,2 jt')).toBe(1_200_000);
    expect(parsePrice('1.250 rb')).toBe(1_250_000);
    // Teks di depan/belakang angka + satuan (isian CMS yang wajar) tidak membuat harga 1000× lebih kecil
    expect(parsePrice('650rb/orang')).toBe(650_000);
    expect(parsePrice('650 rb per orang')).toBe(650_000);
    expect(parsePrice('mulai 650rb')).toBe(650_000);
    expect(parsePrice('Rp650rb')).toBe(650_000);
    expect(parsePrice('1,2 jt/kursi')).toBe(1_200_000);
    expect(parsePrice('650k')).toBe(650_000);
    expect(parsePrice('Rp 650.000/orang')).toBe(650_000);
    expect(parsePrice('12 kursi')).toBe(12);
    expect(parsePrice(12345)).toBe(12345);
    expect(parsePrice('')).toBe(0);
    expect(parsePrice('Tanya admin')).toBe(0);
    expect(parsePrice(null)).toBe(0);
    expect(parsePrice('9'.repeat(30))).toBe(999_999_999_999);
    expect(formatRupiah(545_000)).toBe('Rp545.000');
    expect(formatRupiah(0)).toBe('Rp0');
    expect(groupThousands(1_234_567)).toBe('1.234.567');
    expect(groupThousands(-5000)).toBe('-5.000');
    expect(displayPhone('081234567890')).toBe('0812-3456-7890');
    expect(displayPhone('(021) 555-0182')).toBe('(021) 555-0182');
    expect(displayPhone('')).toBe('');
  });

  it('jam & durasi: "19.00"/"7:30"/"07.00 WIB", lewat tengah malam, "12 jam"/"13j 30m"/"11:30"', () => {
    expect(parseClock('19.00')).toBe(1140);
    expect(parseClock('19:00')).toBe(1140);
    expect(parseClock('7.30')).toBe(450);
    expect(parseClock(' 07.00 WIB')).toBe(420);
    expect(parseClock('00.00')).toBe(0);
    expect(parseClock('24.00')).toBeNull();
    expect(parseClock('19.60')).toBeNull();
    expect(parseClock('jam 7')).toBeNull();
    expect(parseClock('')).toBeNull();
    expect(parseClock(null)).toBeNull();
    expect(formatClock(1140)).toBe('19.00');
    expect(formatClock(1860)).toBe('07.00');
    expect(formatClock(-60)).toBe('23.00');
    expect(formatClock(1439.6)).toBe('00.00');
    expect(parseDuration('12 jam')).toBe(720);
    expect(parseDuration('12j')).toBe(720);
    expect(parseDuration('13j 30m')).toBe(810);
    expect(parseDuration('10j30m')).toBe(630);
    expect(parseDuration('11 jam 30 menit')).toBe(690);
    expect(parseDuration('11:30')).toBe(690);
    expect(parseDuration('11.30')).toBe(690);
    expect(parseDuration('90 menit')).toBe(90);
    expect(parseDuration('1,5 jam')).toBe(90);
    expect(parseDuration('12')).toBe(720);
    expect(parseDuration('26 jam')).toBe(1560);
    expect(parseDuration('80 jam')).toBe(0);
    expect(parseDuration('0')).toBe(0);
    expect(parseDuration('lama')).toBe(0);
    expect(parseDuration('')).toBe(0);
    expect(formatDuration(810)).toBe('13j 30m');
    expect(formatDuration(720)).toBe('12j 00m');
    expect(formatDuration(0)).toBe('');
    expect(spokenDuration(810)).toBe('13 jam 30 menit');
    expect(spokenDuration(720)).toBe('12 jam');
    expect(spokenDuration(45)).toBe('45 menit');
    expect(spokenDuration(0)).toBe('');
  });

  it('jadwal: tiba & +1 dihitung dari jam berangkat + durasi, baris tanpa kota/jam dibuang, chip rute unik, kota menurut diagram rute', () => {
    expect(DEPARTURES).toHaveLength(10);
    const at = (i: number) => {
      const d = DEPARTURES[i];
      return `${formatClock(d.depart)}→${d.arrive === null ? '–' : formatClock(d.arrive)}+${d.days}`;
    };
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(at)).toEqual([
      '17.00→06.30+1',
      '19.00→07.00+1',
      '19.30→06.00+1',
      '18.00→05.00+1',
      '20.00→04.30+1',
      '16.00→07.30+1',
      '13.00→14.00+1',
      '18.30→05.30+1',
      '17.30→06.00+1',
      '12.00→14.00+1',
    ]);
    expect(DEPARTURES[0]).toEqual({ index: 0, from: 'Jakarta', to: 'Surabaya', depart: 1020, duration: 810, arrive: 390, days: 1, cls: 'Super Eksekutif', price: 420_000 });
    const odd = readDepartures({
      items: [
        { from: 'A', to: 'B', depart: '08.00', duration: '' },
        { from: 'A', to: 'B', depart: '22.00', duration: '50 jam' },
        { from: 'A', to: 'B', depart: '06.00', duration: '3 jam' },
        { from: 'A', depart: '08.00' },
        { from: 'A', to: 'B', depart: 'pagi' },
      ],
    });
    expect(odd.map((d) => [d.arrive, d.days])).toEqual([
      [null, 0],
      [0, 3],
      [540, 0],
    ]);
    expect(routeChips(DEPARTURES).map((c) => c.label)).toEqual([
      'Jakarta → Surabaya',
      'Jakarta → Yogyakarta',
      'Jakarta → Semarang',
      'Jakarta → Malang',
      'Jakarta → Denpasar',
      'Yogyakarta → Jakarta',
      'Surabaya → Jakarta',
      'Denpasar → Jakarta',
    ]);
    const lots = readDepartures({ items: Array.from({ length: 12 }, (_, i) => ({ from: `K${i}`, to: 'Z', depart: '19.00' })) });
    expect(routeChips(lots)).toHaveLength(8);
    expect(routeChips([...DEPARTURES, { ...DEPARTURES[0], from: 'jakarta', to: 'SURABAYA' }])).toHaveLength(8);
    // Pilihan Dari/Ke: urutan jalur (Jakarta → … → Denpasar), kota di luar diagram di belakang
    expect(scheduleCities(DEPARTURES, STOPS.map((s) => s.city))).toEqual(['Jakarta', 'Semarang', 'Yogyakarta', 'Surabaya', 'Malang', 'Denpasar']);
    expect(scheduleCities(DEPARTURES)).toEqual(['Jakarta', 'Yogyakarta', 'Surabaya', 'Denpasar', 'Semarang', 'Malang']);
    expect(scheduleCities(DEPARTURES, ['Malang', 'bandung', 'jakarta'])).toEqual(['Malang', 'Jakarta', 'Yogyakarta', 'Surabaya', 'Denpasar', 'Semarang']);
    expect(readNusaline(DEMO).cities).toEqual(['Jakarta', 'Semarang', 'Yogyakarta', 'Surabaya', 'Malang', 'Denpasar']);
  });

  it('saringan jadwal: rute & kelas tanpa beda huruf, urut jam berangkat (stabil), tidak mengubah daftar asli; ringkasan & jumlah', () => {
    expect(times(applyScheduleFilter(DEPARTURES, ALL_ROUTES))).toEqual([
      '12.00 Denpasar→Jakarta',
      '13.00 Jakarta→Denpasar',
      '16.00 Jakarta→Malang',
      '17.00 Jakarta→Surabaya',
      '17.30 Surabaya→Jakarta',
      '18.00 Jakarta→Yogyakarta',
      '18.30 Yogyakarta→Jakarta',
      '19.00 Jakarta→Surabaya',
      '19.30 Jakarta→Yogyakarta',
      '20.00 Jakarta→Semarang',
    ]);
    expect(times(applyScheduleFilter(DEPARTURES, { from: 'jakarta', to: 'SURABAYA', cls: '' }))).toEqual(['17.00 Jakarta→Surabaya', '19.00 Jakarta→Surabaya']);
    expect(times(applyScheduleFilter(DEPARTURES, { from: '', to: '', cls: 'sleeper' }))).toEqual([
      '13.00 Jakarta→Denpasar',
      '17.30 Surabaya→Jakarta',
      '19.00 Jakarta→Surabaya',
      '19.30 Jakarta→Yogyakarta',
    ]);
    expect(times(applyScheduleFilter(DEPARTURES, { from: 'Jakarta', to: '', cls: 'Eksekutif' }))).toEqual(['18.00 Jakarta→Yogyakarta', '20.00 Jakarta→Semarang']);
    expect(applyScheduleFilter(DEPARTURES, { from: 'Jakarta', to: 'Semarang', cls: 'Sleeper' })).toEqual([]);
    // Jam sama → urutan CMS
    const tie = readDepartures({ items: [{ from: 'A', to: 'B', depart: '19.00', class: 'X' }, { from: 'A', to: 'C', depart: '19.00', class: 'Y' }, { from: 'A', to: 'D', depart: '18.00' }] });
    expect(applyScheduleFilter(tie, ALL_ROUTES).map((d) => d.to)).toEqual(['D', 'B', 'C']);
    expect(DEPARTURES.map((d) => d.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(filterSummary({ from: 'Jakarta', to: 'Surabaya', cls: '' })).toBe('Jakarta → Surabaya');
    expect(filterSummary({ from: 'Jakarta', to: '', cls: '' })).toBe('Dari Jakarta');
    expect(filterSummary({ from: '', to: 'Malang', cls: '' })).toBe('Ke Malang');
    expect(filterSummary(ALL_ROUTES)).toBe('Semua rute');
    expect(filterSummary({ from: '', to: '', cls: 'Sleeper' })).toBe('Semua rute · Sleeper');
    expect(resultCount(4)).toBe('4 jadwal');
    expect(resultCount(1)).toBe('1 jadwal');
    expect(resultCount(0)).toBe('Tidak ada jadwal yang cocok');
  });

  it('kartu cari jadwal: Dari ≠ Ke, tanggal (opsional) tidak sebelum hari ini, penumpang 1–6', () => {
    const today = '2026-10-29';
    const form = (patch: Partial<SearchForm> = {}): SearchForm => ({ from: 'Jakarta', to: 'Surabaya', date: '2026-10-31', pax: 2, ...patch });
    expect(validateSearch(form(), today)).toEqual({});
    expect(validateSearch(form({ date: today }), today)).toEqual({});
    expect(validateSearch(form({ date: '' }), today)).toEqual({});
    expect(validateSearch(form({ from: '', to: '' }), today)).toEqual({});
    expect(validateSearch(form({ to: 'jakarta' }), today)).toEqual({ to: 'Kota tujuan harus berbeda dari kota asal.' });
    expect(validateSearch(form({ date: '2026-10-28' }), today)).toEqual({ date: 'Pilih tanggal hari ini atau sesudahnya.' });
    expect(validateSearch(form({ date: '2027-02-30' }), today)).toEqual({ date: 'Tanggal tidak valid.' });
    expect(validateSearch(form({ date: '31/10/2026' }), today)).toEqual({ date: 'Tanggal tidak valid.' });
    for (const pax of [0, 7, 2.5, Number.NaN]) expect(validateSearch(form({ pax }), today), String(pax)).toEqual({ pax: 'Jumlah penumpang 1–6 orang.' });
    expect(validateSearch({ from: 'Yogyakarta', to: 'Yogyakarta', date: '2020-01-01', pax: 9 }, today)).toEqual({
      to: 'Kota tujuan harus berbeda dari kota asal.',
      date: 'Pilih tanggal hari ini atau sesudahnya.',
      pax: 'Jumlah penumpang 1–6 orang.',
    });
    expect(clampPax('3')).toBe(3);
    expect(clampPax('9')).toBe(6);
    expect(clampPax(0)).toBe(1);
    expect(clampPax('x')).toBe(1);
    expect(clampPax(2.6)).toBe(3);
    expect(todayIso(new Date(2026, 9, 29, 23, 59))).toBe('2026-10-29');
    expect(todayIso(new Date(2027, 0, 5))).toBe('2027-01-05');
    expect(formatLongDate('2026-10-31')).toBe('Sabtu, 31 Oktober 2026');
    expect(formatLongDate('2024-02-29')).toBe('Kamis, 29 Februari 2024');
    expect(formatLongDate('2026-13-01')).toBe('');
    expect(formatLongDate('')).toBe('');
  });

  it('pesan WhatsApp: pesan tiket (rute, tanggal panjang, jam + kelas, penumpang) dan titik naik', () => {
    const input = { from: 'Jakarta', to: 'Surabaya', date: '2026-10-31', depart: 1140, cls: 'Sleeper', pax: 2 };
    expect(bookingMessage(input, 'Nusaline')).toBe(
      [
        'Halo Nusaline, saya ingin pesan tiket bus.',
        '',
        'Rute: Jakarta → Surabaya',
        'Tanggal: Sabtu, 31 Oktober 2026',
        'Jam berangkat: 19.00 (Sleeper)',
        'Jumlah penumpang: 2 orang',
        '',
        'Mohon info ketersediaan kursi. Terima kasih.',
      ].join('\n'),
    );
    expect(bookingMessage({ ...input, date: '', cls: '', pax: 9 }, '').split('\n')).toEqual([
      'Halo, saya ingin pesan tiket bus.',
      '',
      'Rute: Jakarta → Surabaya',
      'Tanggal: belum ditentukan',
      'Jam berangkat: 19.00',
      'Jumlah penumpang: 6 orang',
      '',
      'Mohon info ketersediaan kursi. Terima kasih.',
    ]);
    // Dengan `today`: tanggal yang sudah lewat (isian bilah jadwal hanya dibatasi atribut min) → "belum ditentukan"
    expect(bookingMessage({ ...input, date: '2020-01-01' }, 'Nusaline', '2026-10-29')).toContain('\nTanggal: belum ditentukan\n');
    expect(bookingMessage({ ...input, date: '2026-10-29' }, 'Nusaline', '2026-10-29')).toContain('\nTanggal: Kamis, 29 Oktober 2026\n');
    expect(bookingMessage({ ...input, date: '2026-02-30' }, 'Nusaline', '2026-01-01')).toContain('\nTanggal: belum ditentukan\n');
    expect(dateError('', '2026-10-29')).toBe('');
    expect(dateError('2026-10-28', '2026-10-29')).toBe('Pilih tanggal hari ini atau sesudahnya.');
    expect(dateError('2026-13-01', '2026-10-29')).toBe('Tanggal tidak valid.');
    expect(bookingMessage({ ...input, from: 'Jakarta\u0000\n', to: 'Surabaya  Timur', depart: 1500 }, 'Nusaline')).toContain('Rute: Jakarta → Surabaya Timur\n');
    expect(bookingMessage({ ...input, depart: 1500 }, 'Nusaline')).toContain('Jam berangkat: 01.00 (Sleeper)');
    expect(pointsMessage('Yogyakarta', 'Nusaline')).toBe('Halo Nusaline, saya ingin bertanya tentang titik naik di Yogyakarta.');
    expect(pointsMessage('Malang', '')).toBe('Halo, saya ingin bertanya tentang titik naik di Malang.');
    expect(cleanText('a\u0000b\u0007  c', 10)).toBe('a b c');
    expect(cleanText('x'.repeat(500), 300)).toHaveLength(300);
  });

  it('denah kursi: 2-2 = 32 kursi, 2-1 = 24, 1-1 kabin tidur 2 dek × 10; batas 4–60; kursi tidak bertumpuk & di dalam bodi', () => {
    expect(seatLayout('2-2', '32', 'Eksekutif')).toEqual({ left: 2, right: 2, pods: false, total: 32, label: '2-2', decks: [{ label: '', rows: 8, seats: 32 }] });
    expect(seatLayout('2-1', '24', 'Super Eksekutif')).toEqual({ left: 2, right: 1, pods: false, total: 24, label: '2-1', decks: [{ label: '', rows: 8, seats: 24 }] });
    expect(seatLayout('1-1', '20', 'Sleeper')).toEqual({
      left: 1,
      right: 1,
      pods: true,
      total: 20,
      label: '1-1',
      decks: [
        { label: 'Dek bawah', rows: 5, seats: 10 },
        { label: 'Dek atas', rows: 5, seats: 10 },
      ],
    });
    expect(seatLayout('', '', '')).toMatchObject({ label: '2-2', total: 32, pods: false });
    expect(seatLayout('2 + 2', '100').total).toBe(60);
    expect(seatLayout('2-2', '3').total).toBe(4);
    expect(seatLayout('3x3', '30').label).toBe('3-3');
    expect(seatLayout('4-4', '30').label).toBe('2-2');
    expect(seatLayout('1-1', '11', 'Sleeper').decks).toEqual([{ label: '', rows: 6, seats: 11 }]);
    expect(seatLayout('1-1', '13', 'Sleeper').decks.map((d) => d.seats)).toEqual([8, 5]);
    // Nama "kabin"/"tidur" juga kabin tidur, walau 2-2
    expect(seatLayout('2-2', '30', 'Kabin tidur')).toMatchObject({ pods: true, decks: [{ seats: 16 }, { seats: 14 }] });
    const overlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
      a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const toilet = { x: 24, y: 152, w: 70, h: 74 };
    const driver = { x: 792, y: 162, w: 56, h: 58 };
    for (const [layout, seats, name] of [
      ['2-2', '32', 'Eksekutif'],
      ['2-1', '24', 'Super Eksekutif'],
      ['1-1', '20', 'Sleeper'],
      ['3-2', '60', 'Ekonomi'],
      ['1-1', '6', 'Sleeper'],
    ]) {
      const geometry = seatGeometry(seatLayout(layout, seats, name));
      expect(geometry.reduce((n, d) => n + d.seats.length, 0), layout).toBe(seatLayout(layout, seats, name).total);
      for (const deck of geometry) {
        deck.seats.forEach((s, i) => {
          expect(s.x, `${layout} ${i}`).toBeGreaterThanOrEqual(104);
          expect(s.x + s.w, `${layout} ${i}`).toBeLessThanOrEqual(752);
          expect(s.y, `${layout} ${i}`).toBeGreaterThanOrEqual(22);
          expect(s.y + s.h, `${layout} ${i}`).toBeLessThanOrEqual(228);
          expect(s.w).toBeGreaterThan(0);
          expect(s.h).toBeGreaterThan(0);
          expect(overlap(s, toilet) || overlap(s, driver), `${layout} ${i}`).toBe(false);
          for (const other of deck.seats.slice(i + 1)) expect(overlap(s, other), `${layout} ${i}`).toBe(false);
        });
      }
    }
    // Baris depan (kanan) dulu: kursi pertama kiri-depan
    expect(seatGeometry(seatLayout('2-2', '32'))[0].seats[0]).toEqual({ x: 679.5, y: 22, w: 64, h: 39 });
  });

  it('kelas, kota, papan keberangkatan: label kursi/kabin, fitur maks. 5, kode kota, nama kelas pendek', () => {
    const classes = readClasses(DEMO.classes);
    expect(classes.map((c) => `${c.name}|${c.layout.label}|${c.seatsLabel}|${c.legroom}|${c.price}|${c.features.length}`)).toEqual([
      'Eksekutif|2-2|32 kursi|90 cm|260000|5',
      'Super Eksekutif|2-1|24 kursi|110 cm|420000|5',
      'Sleeper|1-1|20 kabin|180 cm|545000|5',
    ]);
    // "Mulai" di kelas = harga termurah kelas itu di tabel jadwal (salinan demo tidak saling bertentangan)
    for (const c of classes) {
      expect(Math.min(...DEPARTURES.filter((d) => d.cls === c.name).map((d) => d.price)), c.name).toBe(c.price);
    }
    expect(readClasses({ items: [{ name: 'X', features: 'a\nb · c; d\ne\nf' }] })[0].features).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(shortClass('Super Eksekutif')).toBe('SUPER EKS');
    expect(shortClass('Sleeper')).toBe('SLEEPER');
    expect(shortClass('Eksekutif')).toBe('EKSEKUTIF');
    expect(shortClass('Executive Class Plus')).toBe('EXECUTIVE');
    expect(shortClass('')).toBe('');
    expect(cityCode('Yogyakarta')).toBe('YOG');
    expect(cityCode('Yogyakarta', 'yk')).toBe('YK');
    expect(cityCode('Surabaya', 'S.B.Y')).toBe('SBY');
    expect(cityCode('Denpasar', 'dps-bali')).toBe('DPSB');
    expect(cityCode('')).toBe('');
    expect(STOPS.map((s) => `${s.code}:${s.points.length}`)).toEqual(['JKT:3', 'SMG:2', 'YK:2', 'SBY:2', 'MLG:1', 'DPS:2']);
    expect(STOPS[0].points[0]).toEqual({ name: 'Kantor Pusat Cakung', address: 'Jl. Lintas Malam No. 8, Cakung, Jakarta Timur', hours: '07.00–21.00' });
    expect(readStops({ stops: [{ city: 'Bandung' }], points: [{ city: 'bandung', name: 'Agen A' }, { city: 'Bandung' }, { name: 'Tanpa kota' }] })[0].points).toEqual([
      { name: 'Agen A', address: '', hours: '' },
    ]);
    expect(pointsCount(3)).toBe('3 agen');
    expect(pointsCount(0)).toBe('Belum ada agen');
    expect(boardRows(DEPARTURES, STOPS)).toEqual([
      { time: '17.00', from: 'JKT', to: 'SBY', cls: 'SUPER EKS', spoken: '17.00, Jakarta ke Surabaya, kelas Super Eksekutif' },
      { time: '19.00', from: 'JKT', to: 'SBY', cls: 'SLEEPER', spoken: '19.00, Jakarta ke Surabaya, kelas Sleeper' },
      { time: '19.30', from: 'JKT', to: 'YK', cls: 'SLEEPER', spoken: '19.30, Jakarta ke Yogyakarta, kelas Sleeper' },
    ]);
    expect(boardRows(DEPARTURES, [])[0]).toMatchObject({ from: 'JAK', to: 'SUR' });
    expect(splitTitle('Tidur nyenyak, bangun di kota tujuan.', 'kota tujuan')).toEqual(['Tidur nyenyak, bangun di ', 'kota tujuan', '.']);
    expect(splitTitle('Tidur nyenyak, bangun di kota tujuan.', 'KOTA')).toEqual(['Tidur nyenyak, bangun di ', 'kota', ' tujuan.']);
    expect(splitTitle('Tidur nyenyak.', 'pagi')).toEqual(['Tidur nyenyak.', '', '']);
    expect(splitRoute('Jakarta → Yogyakarta · Eksekutif')).toEqual(['Jakarta → Yogyakarta', 'Eksekutif']);
    expect(splitRoute('Jakarta → Malang')).toEqual(['Jakarta → Malang', '']);
    expect(splitRoute('· Sleeper')).toEqual(['Sleeper', '']);
    expect(splitRoute('')).toEqual(['', '']);
  });

  it('ikon fasilitas otomatis dari teks (tanpa kolom ikon di CMS)', () => {
    expect((DEMO.onboard.items as { title: string }[]).map((i) => iconKey(i.title))).toEqual(['blanket', 'usb', 'toilet', 'snack', 'lamp', 'wifi']);
    expect(iconKey('Kursi rebah dengan sandaran kaki')).toBe('legrest');
    expect(iconKey('Kabin pribadi bertirai')).toBe('curtain');
    expect(iconKey('Kasur, bantal, dan selimut')).toBe('blanket');
    expect(iconKey('Kursi lebar, rebah lebih dalam')).toBe('seat');
    expect(iconKey('AC')).toBe('ac');
    expect(iconKey('Bagasi 20 kg')).toBe('luggage');
    expect(iconKey('Layar hiburan')).toBe('screen');
    expect(iconKey('Makan malam')).toBe('meal');
    expect(iconKey('Sesuatu')).toBe('check');
  });

  it('film: garis waktu 19.00 → 07.00 (lewat tengah malam), bab, jendela istirahat, jarak km', () => {
    expect(TIMELINE).toMatchObject({ start: 1140, span: 720, distance: 780, rest: 0.6192, dn: 0.78 });
    expect(TIMELINE.chapters.map((c) => c.time)).toEqual(['19.00', '22.30', '03.30', '07.00']);
    const ats = TIMELINE.chapters.map((c) => c.at);
    [0, 0.2708, 0.6292, 0.88].forEach((v, i) => expect(ats[i]).toBeCloseTo(v, 4));
    // Keterangan mengikuti adegan: bab istirahat tampil sejak rest area mendekat (rest − 0,05), bab tiba mengambil alih
    // sesaat setelah bus meninggalkan rest area (rest + 0,05 + 0,02), bukan pada p 0,88 (jam 07.00)
    expect(TIMELINE.chapters.map((c) => c.show)).toEqual([0, 0.2708, 0.5692, 0.6892]);
    // Jam rusak → bab disebar rata, tanpa istirahat → bus hanya berhenti saat naik & tiba
    const broken = filmTimeline({ chapters: [{ time: 'x', title: 'A' }, { time: '', title: 'B' }, { time: '?', title: 'C' }], distance: '1.200 km' });
    expect(broken).toMatchObject({ start: 1140, span: 720, rest: null, dn: 0.83, distance: 1200 });
    expect(broken.chapters.map((c) => c.time)).toEqual(['x', '', '?']);
    [0, 0.45, 0.88].forEach((v, i) => expect(broken.chapters[i].at).toBeCloseTo(v, 9));
    // Bab "istirahat" pertama/terakhir tidak membuat jendela berhenti; satu bab saja
    expect(filmTimeline({ chapters: [{ time: '20.00', title: 'Istirahat' }, { time: '23.00', title: 'Tiba' }] }).rest).toBeNull();
    expect(filmTimeline({ chapters: [{ time: '20.00', title: 'Berangkat' }] })).toMatchObject({ start: 1200, span: 720, chapters: [{ at: 0 }] });
    expect(parseDistance('780')).toBe(780);
    expect(parseDistance('780 km')).toBe(780);
    expect(parseDistance('1.200')).toBe(1200);
    expect(parseDistance('1.200,6')).toBe(1201);
    expect(parseDistance('12.345')).toBe(9999);
    expect(parseDistance('abc')).toBe(0);
    expect(parseDistance('')).toBe(0);
  });

  it('film: progres gulir murni → jarak (berhenti saat naik/istirahat/tiba), jam, km, bab aktif', () => {
    // p = (atas area terlihat − atas trek) / (tinggi trek − tinggi area terlihat), 0–1, 4 desimal
    expect(scrollProgress(0, -500, 3000, 768)).toBe(0.224);
    expect(scrollProgress(64, -436, 3000, 768)).toBe(0.224);
    expect(scrollProgress(57, -443, 2000, 844)).toBe(0.4325);
    expect(scrollProgress(0, 100, 3000, 768)).toBe(0);
    expect(scrollProgress(0, -2232, 3000, 768)).toBe(1);
    expect(scrollProgress(0, -9999, 3000, 768)).toBe(1);
    expect(scrollProgress(0, -100, 700, 768)).toBe(0);
    expect(scrollProgress(0, Number.NaN, 3000, 768)).toBe(0);
    // Jarak: tetap 0 saat naik (p ≤ 0,05), tetap saat istirahat, 1 sejak tiba (p ≥ 0,88)
    expect(distanceAt(0, TIMELINE)).toBe(0);
    expect(distanceAt(0.05, TIMELINE)).toBe(0);
    expect(distanceAt(0.62, TIMELINE)).toBeCloseTo(distanceAt(0.66, TIMELINE), 9);
    expect(distanceAt(0.88, TIMELINE)).toBeCloseTo(1, 9);
    expect(distanceAt(0.95, TIMELINE)).toBeCloseTo(1, 9);
    expect(distanceAt(-1, TIMELINE)).toBe(0);
    expect(distanceAt(2, TIMELINE)).toBeCloseTo(1, 9);
    let last = -1;
    for (let p = 0; p <= 1.0001; p += 0.01) {
      const d = distanceAt(p, TIMELINE);
      expect(d, p.toFixed(2)).toBeGreaterThanOrEqual(last - 1e-9);
      last = d;
    }
    // Jam 19.00 (p ≤ 0,02) → 07.00 (p ≥ 0,88); poster p 0,45 = 01.00 · 400 km
    expect(clockAt(0, TIMELINE)).toBe(1140);
    expect(clockAt(0.02, TIMELINE)).toBe(1140);
    expect(formatClock(clockAt(FILM.poster, TIMELINE))).toBe('01.00');
    expect(kmAt(FILM.poster, TIMELINE)).toBe(400);
    expect(clockAt(0.88, TIMELINE)).toBe(1860);
    expect(clockAt(1, TIMELINE)).toBe(1860);
    expect(formatClock(clockAt(0.224, TIMELINE))).toBe('21.51');
    expect(kmAt(0.224, TIMELINE)).toBe(174);
    expect(formatClock(clockAt(0.672, TIMELINE))).toBe('04.06');
    expect(kmAt(0.672, TIMELINE)).toBe(572);
    expect(kmAt(0, TIMELINE)).toBe(0);
    expect(kmAt(1, TIMELINE)).toBe(780);
    // Bab aktif = keterangan di layar: istirahat sejak p 0,5692 (bus mendekati rest area, berhenti p 0,6192–0,6692),
    // tiba sejak p 0,6892 (bus sudah melaju lagi; kota tujuan masuk layar) sampai akhir
    expect([0, 0.27, 0.271, 0.56, 0.5692, 0.63, 0.66, 0.6891, 0.6892, 0.8, 0.879, 0.88, 1].map((p) => chapterAt(p, TIMELINE.chapters))).toEqual([
      0, 0, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3,
    ]);
    const windows = TIMELINE.chapters.map((_, i) => chapterWindow(TIMELINE.chapters, i));
    expect(windows).toEqual([
      [0, 0.2708],
      [0.2708, 0.5692],
      [0.5692, 0.6892],
      [0.6892, 1.01],
    ]);
    // Jendela berurutan tanpa celah/tumpang tindih (keterangan lama pudar habis sebelum yang baru muncul)
    for (let i = 1; i < windows.length; i += 1) expect(windows[i][0]).toBe(windows[i - 1][1]);
    // Jendela istirahat mencakup seluruh waktu bus berhenti di rest area, dan berakhir sesaat setelah bus berangkat lagi
    expect(windows[2][0]).toBeLessThan(TIMELINE.rest!);
    expect(windows[2][1]).toBeCloseTo(TIMELINE.rest! + FILM.restLen + FILM.restTail, 9);
    expect(distanceAt(windows[2][1], TIMELINE)).toBeGreaterThan(distanceAt(TIMELINE.rest! + FILM.restLen, TIMELINE));
    // Tanpa bab istirahat: keterangan tampil pada jamnya (show = at, 4 desimal)
    const plain = filmTimeline({ chapters: [{ time: '19.00', title: 'Berangkat' }, { time: '01.00', title: 'Tengah malam' }, { time: '07.00', title: 'Tiba' }] });
    expect(plain.chapters.map((c) => c.show)).toEqual(plain.chapters.map((c) => Math.round(c.at * 1e4) / 1e4));
    // Bab istirahat dekat bab sebelumnya: tidak muncul sebelum tengah-tengah kedua jam (bab sebelumnya tetap sempat dibaca)
    const early = filmTimeline({ chapters: [{ time: '19.00', title: 'Berangkat' }, { time: '19.30', title: 'Istirahat makan' }, { time: '07.00', title: 'Tiba' }] });
    expect(early.chapters[1].show).toBeCloseTo((early.chapters[0].at + early.chapters[1].at) / 2, 4);
    expect(early.chapters[2].show).toBeCloseTo(early.rest! + FILM.restLen + FILM.restTail, 4);
    // Rest area digambar tepat di posisi bus pada tengah jendela istirahat
    expect(Math.round(distanceAt(TIMELINE.rest! + FILM.restLen / 2, TIMELINE) * NEAR_TRAVEL)).toBe(5838);
  });

  it('film: bus tidak tertutup teks panggung di layar mana pun (layar lebar digeser ke kanan, HP diperkecil)', () => {
    // Kotak teks seperti di panggung nyata (px): kepala (label, H2, kalimat), jam & km, kartu bab
    const desktop = (h: number, dashLeft: number) => [
      { left: 48, top: 104, right: 488, bottom: 302 },
      { left: 48, top: 334, right: 488, bottom: h },
      { left: dashLeft, top: 104, right: dashLeft + 232, bottom: 222 },
    ];
    // 1440×836 (demo 1440×900): bus standar 635px di tengah, tidak bertabrakan
    expect(fitFilmBus(1440, 836, desktop(468, 1160), false)).toEqual({ width: 635, x: 720, base: 635, x0: 720, ok: true });
    // Laptop 1366×657 (panggung demo 593px): kartu bab menutupi belakang bus → bus utuh digeser ke kanan
    expect(fitFilmBus(1366, 593, desktop(469, 1086), false)).toEqual({ width: 451, x: 726, base: 451, x0: 683, ok: true });
    // 1024×700: geser saja tidak muat (depan bus keluar panggung) → sedikit diperkecil lalu digeser
    expect(fitFilmBus(1024, 700, desktop(469, 744), false)).toEqual({ width: 472, x: 736, base: 532, x0: 512, ok: true });
    // HP 390×640: bertumpuk satu kolom → diperkecil sampai atap bus ≥ 16px di bawah kartu bab
    const phone = (bottom: number) => [
      { left: 20, top: 92, right: 370, bottom: 246 },
      { left: 20, top: 266, right: 160, bottom: 310 },
      { left: 20, top: 330, right: 370, bottom },
    ];
    expect(fitFilmBus(390, 640, phone(454), true)).toEqual({ width: 260, x: 176, base: 312, x0: 176, ok: true });
    expect(fitFilmBus(390, 787, phone(454), true)).toEqual({ width: 312, x: 176, base: 312, x0: 176, ok: true });
    // Panggung sangat pendek (bingkai HP demo 505px) tanpa ringkasan teks → bus terkecil pun tertutup (ok: false);
    // ./hooks lalu menyembunyikan teks pendukung secara bertahap (data-fit 1–3)
    expect(fitFilmBus(390, 505, phone(453), true)).toEqual({ width: 156, x: 176, base: 312, x0: 176, ok: false });
    const compact = [
      { left: 20, top: 92, right: 370, bottom: 156 },
      { left: 20, top: 176, right: 160, bottom: 220 },
      { left: 20, top: 240, right: 370, bottom: 320 },
    ];
    expect(fitFilmBus(390, 505, compact, true)).toEqual({ width: 312, x: 176, base: 312, x0: 176, ok: true });
    // HP kecil (< 384px): bus 72% di 41% (sama dengan ./nusaline.css) → moncong bus (+417 satuan) berhenti sebelum kolom
    // tombol melayang Shell (± 64px di kanan)
    const small = fitFilmBus(360, 584, [], true);
    expect(small).toEqual({ width: 259, x: 148, base: 259, x0: 148, ok: true });
    expect(small.x + (417 * small.width) / 800).toBeLessThanOrEqual(360 - 64);
    const tiny = fitFilmBus(320, 512, [], true);
    expect(tiny.x + (417 * tiny.width) / 800).toBeLessThanOrEqual(320 - 64);
    expect(tiny.x - (393 * tiny.width) / 800).toBeGreaterThanOrEqual(0);
  });
});

describe('Nusaline: demo', () => {
  it('urutan section, satu H1, hero departure: foto latar LCP (eager, srcset, ukuran, alt) tanpa reveal, Ken Burns di wadah', () => {
    const container = demo();
    expect(sectionKeys(container)).toEqual([...ORDER, 'footer']);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const hero = section(container, 'hero');
    expect(hero.getAttribute('data-hero-layout')).toBe('departure');
    expect(hero.getAttribute('data-tpl-tone')).toBe('inverse');
    const h1 = hero.querySelector('h1')!;
    expect(h1.textContent).toBe('Tidur nyenyak, bangun di kota tujuan.');
    expect(h1.querySelector('span')!.textContent).toBe('kota tujuan');
    expect(h1.querySelector('span')!.className).toContain('text-(--nl-neon)');
    expect(hero.textContent).toContain('Bus malam · berangkat tiap hari');
    const img = hero.querySelector<HTMLImageElement>('img[fetchpriority="high"]')!;
    expect(img.getAttribute('src')).toBe('/assets/templates/photos/nusaline-hero-1920.webp');
    expect(img.getAttribute('srcset')).toBe(
      '/assets/templates/photos/nusaline-hero-800.webp 800w, /assets/templates/photos/nusaline-hero-1280.webp 1280w, /assets/templates/photos/nusaline-hero-1920.webp 1920w',
    );
    // HP: foto 16:9 menutupi kotak tegak (± 390×740) → tergambar ± 3,4× lebar layar
    expect(img.getAttribute('sizes')).toBe('(max-width: 767px) 340vw, 100vw');
    expect(img.getAttribute('loading')).toBe('eager');
    expect(Number(img.getAttribute('width'))).toBe(1920);
    expect(Number(img.getAttribute('height'))).toBe(1080);
    expect(img.getAttribute('alt')!.split(' ').length).toBeGreaterThanOrEqual(5);
    expect(img.closest('.tpl-reveal')).toBeNull();
    expect(img.className).not.toMatch(/tpl-photo|nl-|opacity|clip/);
    const kenburns = img.closest('.nl-kenburns')!;
    expect(kenburns).not.toBeNull();
    expect(kenburns.className).toContain('absolute inset-0');
    expect(hero.querySelector('.nl-hero-scrim')).toHaveAttribute('aria-hidden', 'true');
    const eager = Array.from(container.querySelectorAll('img')).filter((i) => i.getAttribute('loading') !== 'lazy');
    expect(eager.map((i) => i.getAttribute('src'))).toEqual(['/assets/templates/photos/nusaline-hero-1920.webp']);
    // Isi hero sederhana: chip, H1, kalimat, dua tombol, satu kartu (4 isian) + papan; tanpa angka/lencana. Jadwal sudah
    // punya tombol di kartu cari ("Cari jadwal") dan menu atas ("Cek Jadwal") → dua tombol hero ke Kelas dan Rute
    expect(Array.from(hero.querySelectorAll('a')).map((a) => `${a.textContent}${a.getAttribute('href')}`)).toEqual(['Pilih kelas#classes', 'Lihat rute#routes']);
    // Label kecil memakai panah mono milik Nusaline ("→"), bukan titik (titik = ciri Kemudi)
    expect(hero.querySelector('p.font-mono > span[aria-hidden]')!.textContent).toBe('→');
    expect(hero.querySelectorAll('select, input')).toHaveLength(4);
  });

  it('kartu cari di hero: Dari ⇄ Ke dari jadwal (urut jalur), galat + fokus, kirim → saringan jadwal, gulir, fokus ke jumlah hasil', async () => {
    const container = demo();
    const hero = section(container, 'hero');
    const form = within(hero).getByRole('search', { name: 'Cari jadwal bus' });
    expect(form).toHaveAttribute('novalidate');
    expect(form.getAttribute('action')).toBeNull();
    const options = (label: string) => Array.from((within(form).getByLabelText(label) as HTMLSelectElement).options).map((o) => o.textContent);
    expect(options('Dari')).toEqual(['Semua', 'Jakarta', 'Semarang', 'Yogyakarta', 'Surabaya', 'Malang', 'Denpasar']);
    expect(options('Ke')).toEqual(options('Dari'));
    expect(options('Penumpang')).toEqual(['1 orang', '2 orang', '3 orang', '4 orang', '5 orang', '6 orang']);
    const date = within(form).getByLabelText('Tanggal') as HTMLInputElement;
    expect(date.type).toBe('date');
    expect(date.min).toBe(todayIso());
    const from = within(form).getByLabelText('Dari') as HTMLSelectElement;
    const to = within(form).getByLabelText('Ke') as HTMLSelectElement;
    // Tukar kota
    fireEvent.change(from, { target: { value: 'Surabaya' } });
    fireEvent.change(to, { target: { value: 'Jakarta' } });
    const swap = within(form).getByRole('button', { name: 'Tukar kota asal dan tujuan' });
    expect(swap).toHaveAttribute('type', 'button');
    fireEvent.click(swap);
    expect(from.value).toBe('Jakarta');
    expect(to.value).toBe('Surabaya');
    // Kota sama → galat di "Ke" + fokus
    fireEvent.change(to, { target: { value: 'Jakarta' } });
    const submit = within(form).getByRole('button', { name: 'Cari jadwal' });
    expect(submit).toHaveAttribute('type', 'submit');
    act(() => {
      fireEvent.submit(form);
    });
    expect(to).toHaveAttribute('aria-invalid', 'true');
    expect(to).toHaveAttribute('aria-describedby', `${to.id}-error`);
    expect(document.getElementById(`${to.id}-error`)!.textContent).toBe('Kota tujuan harus berbeda dari kota asal.');
    expect(to).toHaveFocus();
    expect(scrolled).toEqual([]);
    fireEvent.change(to, { target: { value: 'Surabaya' } });
    expect(to).not.toHaveAttribute('aria-invalid');
    // Tanggal lampau → galat
    fireEvent.change(date, { target: { value: '2020-01-01' } });
    act(() => {
      fireEvent.submit(form);
    });
    expect(date).toHaveAttribute('aria-invalid', 'true');
    expect(form.textContent).toContain('Pilih tanggal hari ini atau sesudahnya.');
    expect(date).toHaveFocus();
    // Isian benar → tabel jadwal tersaring, tanggal & penumpang ikut
    fireEvent.change(date, { target: { value: '2030-11-16' } });
    fireEvent.change(within(form).getByLabelText('Penumpang'), { target: { value: '2' } });
    const schedule = section(container, 'schedule');
    expect(within(schedule).getByRole('status').textContent).toBe('10 jadwal · Semua rute');
    act(() => {
      fireEvent.submit(form);
    });
    expect(scrolled).toEqual(['schedule']);
    const status = within(schedule).getByRole('status');
    expect(status.textContent).toBe('2 jadwal · Jakarta → Surabaya');
    expect((within(schedule).getByLabelText('Tanggal') as HTMLInputElement).value).toBe('2030-11-16');
    expect((within(schedule).getByLabelText('Penumpang') as HTMLSelectElement).value).toBe('2');
    expect(within(schedule).getByRole('button', { name: 'Jakarta ke Surabaya' })).toHaveAttribute('aria-pressed', 'true');
    const book = within(schedule).getByRole('link', { name: 'Pesan: Jakarta → Surabaya 17.00 Super Eksekutif (WhatsApp)' });
    expect(decode(book)).toBe(
      `${WA}${['Halo Nusaline, saya ingin pesan tiket bus.', '', 'Rute: Jakarta → Surabaya', 'Tanggal: Sabtu, 16 November 2030', 'Jam berangkat: 17.00 (Super Eksekutif)', 'Jumlah penumpang: 2 orang', '', 'Mohon info ketersediaan kursi. Terima kasih.'].join('\n')}`,
    );
    await wait(100);
    expect(status).toHaveFocus();
    expect(status).toHaveAttribute('tabindex', '-1');
    // role="status" sudah polite; aria-live eksplisit hanya untuk keterangan pratinjau milik Shell (shell.test.tsx)
    expect(status).not.toHaveAttribute('aria-live');
  });

  it('papan keberangkatan mini: tiga jadwal pertama, kalimat untuk pembaca layar, ubin dekoratif, baris ke-3 hanya ≥ @3xl', () => {
    const hero = section(demo(), 'hero');
    const board = within(hero).getByRole('list', { name: 'Berangkat malam ini' });
    const rows = Array.from(board.querySelectorAll(':scope > li'));
    expect(rows).toHaveLength(3);
    expect(rows.map((li) => li.querySelector('.sr-only')!.textContent)).toEqual([
      '17.00, Jakarta ke Surabaya, kelas Super Eksekutif',
      '19.00, Jakarta ke Surabaya, kelas Sleeper',
      '19.30, Jakarta ke Yogyakarta, kelas Sleeper',
    ]);
    expect(rows[0].querySelectorAll('.nl-flap')).toHaveLength(5 + 3 + 3);
    for (const li of rows) for (const part of li.querySelectorAll(':scope > span:not(.sr-only)')) expect(part).toHaveAttribute('aria-hidden', 'true');
    expect(rows[2].className).toContain('hidden @3xl:flex');
    expect(rows[0].className).not.toMatch(/(^|\s)hidden(\s|$)/);
  });

  it('header di atas foto: menu (≤ 6) + tombol "Cek Jadwal"; menu HP buka/tutup, Esc menutup dan fokus kembali', () => {
    const container = demo();
    const header = container.querySelector('header')!;
    expect(header.className).toContain('sticky');
    expect(header.querySelector('svg[viewBox="0 0 32 32"]'), 'NusalineMark').not.toBeNull();
    const bar = header.querySelector<HTMLElement>('[data-tpl-tone="inverse"]')!;
    expect(bar).toHaveAttribute('data-solid', 'false');
    expect(bar.className).toContain('bg-transparent');
    const nav = within(header).getByRole('navigation', { name: 'Menu utama' });
    const links = Array.from(nav.querySelectorAll('a')).map((a) => `${a.textContent}${a.getAttribute('href')}`);
    expect(links).toEqual(['Jadwal#schedule', 'Kelas#classes', 'Rute#routes', 'Fasilitas#onboard', 'FAQ#faq', 'Kontak#kontak']);
    expect(links.length).toBeLessThanOrEqual(6);
    fireEvent.click(within(nav).getByRole('link', { name: 'Rute' }));
    expect(scrolled).toEqual(['routes']);
    expect(within(header).getAllByRole('link', { name: 'Cek Jadwal' })[0]).toHaveAttribute('href', '#schedule');
    const toggle = within(header).getByRole('button', { name: 'Buka menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle.className).toMatch(/\bh-11\b/);
    expect(toggle.className).toMatch(/\bw-11\b/);
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAccessibleName('Tutup menu');
    // Menu terbuka → bilah midnight padat (tetap gelap)
    expect(bar).toHaveAttribute('data-solid', 'true');
    expect(bar.className).toContain('bg-[#0B1026]');
    expect(within(header).getAllByRole('navigation', { name: 'Menu utama' })).toHaveLength(2);
    const panel = document.getElementById(toggle.getAttribute('aria-controls')!)!;
    expect(panel).toHaveAttribute('aria-label', 'Menu utama');
    expect(within(panel).getAllByRole('link').map((a) => a.textContent)).toEqual(['Jadwal', 'Kelas', 'Rute', 'Fasilitas', 'FAQ', 'Kontak', 'Cek Jadwal']);
    fireEvent.click(within(panel).getByRole('link', { name: 'Fasilitas' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(scrolled).toEqual(['routes', 'onboard']);
    fireEvent.click(toggle);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
    expect(within(header).getAllByRole('navigation', { name: 'Menu utama' })).toHaveLength(1);
  });

  it('tabel jadwal: chip rute (aria-pressed), kelas/tanggal/penumpang, 6 baris (4 di HP) + "Lihat semua 10 jadwal", Pesan → WhatsApp, kosong → atur ulang', async () => {
    const container = demo();
    const schedule = section(container, 'schedule');
    const rows = () => Array.from(schedule.querySelectorAll<HTMLElement>('tbody > tr'));
    const departs = () => rows().map((tr) => tr.querySelector('td')!.textContent!.replace('Berangkat ', ''));
    const chips = within(schedule).getByRole('group', { name: 'Pilih rute' });
    const chipButtons = within(chips).getAllByRole('button');
    expect(chipButtons.map((b) => b.textContent)).toEqual([
      'Semua rute',
      'Jakarta→Surabaya',
      'Jakarta→Yogyakarta',
      'Jakarta→Semarang',
      'Jakarta→Malang',
      'Jakarta→Denpasar',
      'Yogyakarta→Jakarta',
      'Surabaya→Jakarta',
      'Denpasar→Jakarta',
    ]);
    // Nama tombol eksplisit (panah dekoratif disembunyikan)
    expect(chipButtons[1]).toHaveAccessibleName('Jakarta ke Surabaya');
    expect(chipButtons[1].querySelector('[aria-hidden]')!.textContent).toBe('→');
    expect(chipButtons.map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', ...Array(8).fill('false')]);
    const cls = within(schedule).getByLabelText('Kelas') as HTMLSelectElement;
    expect(Array.from(cls.options).map((o) => o.textContent)).toEqual(['Semua kelas', 'Eksekutif', 'Super Eksekutif', 'Sleeper']);
    expect(within(schedule).getByRole('status').textContent).toBe('10 jadwal · Semua rute');
    // Tabel asli: judul kolom, caption, 6 baris (baris 5-6 disembunyikan di HP lewat container query)
    const table = within(schedule).getByRole('table');
    expect(table.querySelector('caption')!.textContent).toBe('Jadwal keberangkatan: Semua rute');
    expect(Array.from(table.querySelectorAll('th')).map((th) => th.textContent)).toEqual(['Berangkat', 'Rute', 'Tiba', 'Durasi', 'Kelas', 'Harga mulai', 'Pesan']);
    expect(departs()).toEqual(['12.00', '13.00', '16.00', '17.00', '17.30', '18.00']);
    expect(rows().map((tr) => /(^|\s)hidden(\s|$)/.test(tr.className))).toEqual([false, false, false, false, true, true]);
    for (const tr of rows()) expect(tr.className).toContain('@3xl:table-row');
    const first = rows()[0];
    expect(first.textContent).toContain('Denpasar → Jakarta');
    expect(first.textContent).toContain('DPS → JKT');
    expect(first.querySelectorAll('td')[2].textContent).toBe('Tiba 14.00+1 hari');
    expect(first.querySelectorAll('td')[3].textContent).toBe('26j 00mDurasi 26 jam');
    expect(first.textContent).toContain('Rp760.000');
    const book = within(first).getByRole('link', { name: 'Pesan: Denpasar → Jakarta 12.00 Super Eksekutif (WhatsApp)' });
    expect(decode(book)).toBe(`${WA}${bookingMessage({ from: 'Denpasar', to: 'Jakarta', date: '', depart: 720, cls: 'Super Eksekutif', pax: 1 }, 'Nusaline')}`);
    expect(decode(book)).toContain('Tanggal: belum ditentukan');
    // Lihat semua → 10 baris, fokus ke baris pertama yang tadinya tersembunyi (jsdom tanpa CSS: baris ke-7)
    const more = within(schedule).getByRole('button', { name: 'Lihat semua 10 jadwal' });
    fireEvent.click(more);
    expect(rows()).toHaveLength(10);
    expect(rows().some((tr) => /(^|\s)hidden(\s|$)/.test(tr.className))).toBe(false);
    expect(within(schedule).queryByRole('button', { name: /Lihat semua/ })).toBeNull();
    await wait(10);
    expect(rows()[6]).toHaveFocus();
    // Chip rute → 2 baris bergerak muncul + "Atur ulang"
    fireEvent.click(within(chips).getByRole('button', { name: 'Jakarta ke Yogyakarta' }));
    expect(departs()).toEqual(['18.00', '19.30']);
    expect(within(schedule).getByRole('status').textContent).toBe('2 jadwal · Jakarta → Yogyakarta');
    expect(schedule.querySelector('tbody')).toHaveAttribute('data-filtered', 'true');
    expect(schedule.querySelectorAll('tbody > tr.nl-row')).toHaveLength(2);
    fireEvent.change(cls, { target: { value: 'Sleeper' } });
    expect(departs()).toEqual(['19.30']);
    expect(within(schedule).getByRole('status').textContent).toBe('1 jadwal · Jakarta → Yogyakarta · Sleeper');
    fireEvent.click(within(schedule).getByRole('button', { name: 'Atur ulang' }));
    expect(within(schedule).getByRole('status').textContent).toBe('10 jadwal · Semua rute');
    expect(cls.value).toBe('');
    expect(within(schedule).queryByRole('button', { name: 'Atur ulang' })).toBeNull();
    // Kosong → kotak bergaris + "Lihat semua jadwal"
    fireEvent.click(within(chips).getByRole('button', { name: 'Jakarta ke Semarang' }));
    fireEvent.change(cls, { target: { value: 'Sleeper' } });
    expect(rows()).toHaveLength(0);
    expect(within(schedule).getByRole('status').textContent).toBe('Tidak ada jadwal yang cocok');
    expect(schedule.textContent).toContain('Belum ada jadwal untuk pilihan ini.');
    fireEvent.click(within(schedule).getByRole('button', { name: 'Lihat semua jadwal' }));
    expect(within(schedule).getByRole('status').textContent).toBe('10 jadwal · Semua rute');
    // Tanggal lewat (papan ketik / pemilih iOS melewati atribut min) → galat terlihat + aria, pesan WhatsApp tanpa tanggal lewat
    const dateInput = within(schedule).getByLabelText('Tanggal') as HTMLInputElement;
    expect(dateInput.min).toBe(todayIso());
    expect(dateInput).not.toHaveAttribute('aria-invalid');
    fireEvent.change(dateInput, { target: { value: '2020-01-01' } });
    expect(dateInput).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById(dateInput.getAttribute('aria-describedby')!)!.textContent).toBe('Pilih tanggal hari ini atau sesudahnya.');
    for (const link of within(schedule).getAllByRole('link', { name: /^Pesan: / })) {
      expect(decode(link)).toContain('\nTanggal: belum ditentukan\n');
      expect(decode(link)).not.toContain('2020');
    }
    // Tanggal & penumpang di bilah saringan ikut ke pesan
    fireEvent.change(within(schedule).getByLabelText('Tanggal'), { target: { value: '2030-11-16' } });
    expect(dateInput).not.toHaveAttribute('aria-invalid');
    expect(schedule.textContent).not.toContain('Pilih tanggal hari ini atau sesudahnya.');
    fireEvent.change(within(schedule).getByLabelText('Penumpang'), { target: { value: '3' } });
    expect(decode(within(schedule).getAllByRole('link', { name: /^Pesan: Jakarta → Surabaya 19\.00/ })[0])).toContain(
      'Tanggal: Sabtu, 16 November 2030\nJam berangkat: 19.00 (Sleeper)\nJumlah penumpang: 3 orang',
    );
    expect(schedule.textContent).toContain('Jadwal dan harga contoh; kursi dikonfirmasi admin lewat WhatsApp.');
  });

  it('kelas: tab (ARIA + panah/Home/End), denah SVG dari konfigurasi (32/24/10+10), rincian, "Pesan kelas ini" → saringan kelas di jadwal', () => {
    const container = demo();
    const classes = section(container, 'classes');
    const tablist = within(classes).getByRole('tablist', { name: 'Pilih kelas' });
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Eksekutif2-2', 'Super Eksekutif2-1', 'Sleeper1-1']);
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
    expect(tabs.map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
    expect(tabs[0]).toHaveAccessibleName('Eksekutif');
    const panel = () => within(classes).getByRole('tabpanel');
    expect(panel()).toHaveAttribute('aria-labelledby', tabs[0].id);
    for (const tab of tabs) expect(tab).toHaveAttribute('aria-controls', panel().id);
    // Tiap dek digambar dua kali: tegak (HP, depan di atas) dan mendatar (≥ @xl); container query memilih satu
    const seats = (orient = 'h') => panel().querySelectorAll(`svg[data-orient="${orient}"] .nl-seat`).length;
    expect(seats()).toBe(32);
    expect(seats('v')).toBe(32);
    expect(panel().querySelector('svg[data-orient="v"]')!.getAttribute('class')).toMatch(/@xl:hidden/);
    expect(panel().querySelector('svg[data-orient="h"]')!.getAttribute('class')).toMatch(/(^|\s)hidden\s.*@xl:block/);
    expect(panel().querySelector('svg[data-orient="v"]')).toHaveAttribute('viewBox', '0 0 250 900');
    expect(panel().querySelector('svg[data-orient="h"]')).toHaveAttribute('viewBox', '0 0 900 250');
    // figcaption = anak pertama <figure> (HTML sah → nama figur); berisi judul denah + ringkasan untuk pembaca layar
    const figure = panel().querySelector('figure')!;
    expect(figure.firstElementChild!.tagName).toBe('FIGCAPTION');
    expect(panel().querySelector('figcaption')!.textContent).toMatch(/^Denah 2-2 · 32 kursi\. Denah Eksekutif: konfigurasi 2-2, 32 kursi\. Sopir dan pintu di depan, toilet di belakang\.$/);
    for (const svg of panel().querySelectorAll('figure svg')) expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(panel().querySelector('svg[data-seats]')).toHaveAttribute('data-seats', 'still');
    // Tata letak: denah (kolom 1-7) dan rincian (kolom 8-12) berdampingan, foto di bawah denah → harga & tombol pesan
    // terlihat bersama denah setelah tab diganti
    expect(panel().className).toContain('@5xl:grid-cols-12');
    expect(figure.className).toContain('@5xl:col-span-7');
    expect(panel().querySelector('h3')!.parentElement!.className).toContain('@5xl:col-start-8');
    expect(Array.from(panel().children).map((el) => el.tagName)).toEqual(['FIGURE', 'DIV', 'DIV']);
    expect(Array.from(panel().querySelectorAll('dl > div')).map((d) => `${d.querySelector('dt')!.textContent}=${d.querySelector('dd')!.textContent}`)).toEqual([
      'Konfigurasi=2-2',
      'Kursi=32',
      'Jarak kaki=90 cm',
    ]);
    const features = within(panel()).getByRole('list', { name: 'Fitur kelas Eksekutif' });
    expect(features.querySelectorAll('li')).toHaveLength(5);
    expect(features.querySelectorAll('li svg[aria-hidden="true"]')).toHaveLength(5);
    expect(panel().textContent).toContain('Rp260.000');
    expect(panel().textContent).toContain('Harga mulai contoh; harga final dari admin.');
    expect(panel().querySelectorAll('img')).toHaveLength(1);
    // Keyboard
    tabs[0].focus();
    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveFocus();
    expect(panel()).toHaveAttribute('aria-labelledby', tabs[1].id);
    expect(seats()).toBe(24);
    expect(panel().querySelector('svg[data-seats]')).toHaveAttribute('data-seats', 'pop');
    fireEvent.keyDown(tabs[1], { key: 'End' });
    expect(tabs[2]).toHaveFocus();
    expect(seats()).toBe(20);
    expect(panel().querySelectorAll('figure svg[data-orient="h"]')).toHaveLength(2);
    expect(panel().querySelectorAll('figure svg[data-orient="v"]')).toHaveLength(2);
    expect(panel().textContent).toContain('Dek bawah');
    expect(panel().textContent).toContain('Dek atas');
    expect(panel().querySelector('figcaption')!.textContent).toContain('20 kabin di dua dek; dek atas lewat tangga depan');
    expect(Array.from(panel().querySelectorAll('dl dt')).map((dt) => dt.textContent)).toEqual(['Konfigurasi', 'Kabin', 'Panjang kasur']);
    // Kabin tidur tanpa foto → ilustrasi kabin SVG (dekoratif) di tempat foto, tata letak tetap dua kolom
    expect(panel().querySelector('img')).toBeNull();
    expect(panel().querySelector('.nl-berth svg')).toHaveAttribute('aria-hidden', 'true');
    expect(panel().querySelector('.nl-berth')!.parentElement!.className).toContain('@5xl:grid-cols-12');
    fireEvent.keyDown(tabs[2], { key: 'ArrowRight' });
    expect(tabs[0]).toHaveFocus();
    fireEvent.keyDown(tabs[0], { key: 'ArrowLeft' });
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs[2], { key: 'Home' });
    expect(tabs[0]).toHaveFocus();
    fireEvent.click(tabs[1]);
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    // Pesan kelas ini → saringan kelas + gulir ke jadwal
    const book = within(panel()).getByRole('button', { name: 'Pesan kelas ini: Super Eksekutif' });
    expect(book).toHaveAttribute('type', 'button');
    fireEvent.click(book);
    expect(scrolled).toEqual(['schedule']);
    const schedule = section(container, 'schedule');
    expect(within(schedule).getByRole('status').textContent).toBe('3 jadwal · Semua rute · Super Eksekutif');
    expect((within(schedule).getByLabelText('Kelas') as HTMLSelectElement).value).toBe('Super Eksekutif');
  });

  it('kelas: ejaan beda huruf besar-kecil antara jadwal & kelas → pilihan Kelas tetap sama dengan saringan, "Semua kelas" mengosongkannya', () => {
    const container = demo({
      schedule: {
        items: [
          { from: 'Jakarta', to: 'Surabaya', depart: '17.00', duration: '13j 30m', class: 'Super eksekutif', price: '420000' },
          { from: 'Jakarta', to: 'Yogyakarta', depart: '18.00', duration: '11 jam', class: 'Eksekutif', price: '295000' },
        ],
      },
    });
    const classes = section(container, 'classes');
    fireEvent.click(within(classes).getByRole('tab', { name: 'Super Eksekutif' }));
    fireEvent.click(within(classes).getByRole('button', { name: 'Pesan kelas ini: Super Eksekutif' }));
    const schedule = section(container, 'schedule');
    const select = within(schedule).getByLabelText('Kelas') as HTMLSelectElement;
    // Satu pilihan per kelas (ejaan pertama = nama di bagian Kelas), dan pilihan itu yang terpilih
    expect(Array.from(select.options).map((o) => o.textContent)).toEqual(['Semua kelas', 'Eksekutif', 'Super Eksekutif', 'Sleeper']);
    expect(select.value).toBe('Super Eksekutif');
    expect(within(schedule).getByRole('status').textContent).toBe('1 jadwal · Semua rute · Super Eksekutif');
    fireEvent.change(select, { target: { value: '' } });
    expect(within(schedule).getByRole('status').textContent).toBe('2 jadwal · Semua rute');
  });

  it('film diam (prefers-reduced-motion): tanpa trek tinggi/sticky, poster p 0,45 selebar layar, semua bab di <ol>, "Lewati animasi", adegan aria-hidden', () => {
    reducedMotion(() => {
      const container = demo();
      const film = section(container, 'film');
      expect(film.getAttribute('data-tpl-tone')).toBe('inverse');
      expect(within(film).getByRole('heading', { level: 2 }).textContent).toBe('Satu malam di dalam Nusaline');
      expect(film.querySelector('.nl-film-track')).toBeNull();
      expect(film.querySelector('[data-film-progress]')).toBeNull();
      expect(film.querySelector('.nl-stage')).toBeNull();
      // Tanpa kelas `sticky` (scroll-margin "Lewati animasi" boleh menyebut var(--tpl-sticky-top))
      expect(film.innerHTML).not.toMatch(/[\s"]sticky[\s"]|position:\s*sticky/);
      const poster = Array.from(film.querySelectorAll<HTMLElement>('[style]')).find((el) => el.style.getPropertyValue('--p'))!;
      expect(poster.style.getPropertyValue('--p')).toBe('0.45');
      expect(poster.style.getPropertyValue('--nl-rest')).toBe('0.6192');
      expect(poster.style.getPropertyValue('--nl-dn')).toBe('0.78');
      // Bingkai poster selebar layar: tidak berada di dalam WRAP (tanpa jarak tepi)
      expect(poster.closest('[class*="px-5"]')).toBeNull();
      expect(poster.textContent).toBe('01.00 WIB · 400 km');
      const scene = poster.querySelector('.nl-scene')!;
      expect(scene).toHaveAttribute('aria-hidden', 'true');
      expect(scene.querySelectorAll('svg').length).toBeGreaterThanOrEqual(5);
      for (const svg of scene.querySelectorAll('svg')) expect(svg).toHaveAttribute('aria-hidden', 'true');
      // Anggaran elemen SVG film ≤ ~150; bus ≤ ~40 bentuk yang digambar (path/circle/rect)
      expect(scene.querySelectorAll('svg *').length).toBeLessThanOrEqual(150);
      expect(scene.querySelector('.nl-bus')!.querySelectorAll('path, circle, rect, ellipse, line, polygon, polyline').length).toBeLessThanOrEqual(40);
      // Rest area tepat di posisi bus saat istirahat
      expect(scene.querySelector('g[transform="translate(5838 0)"]')).not.toBeNull();
      const chapters = within(film).getByRole('list', { name: 'Bab perjalanan' });
      expect(chapters.tagName).toBe('OL');
      const items = Array.from(chapters.querySelectorAll(':scope > li'));
      expect(items.map((li) => li.querySelector('p')!.textContent)).toEqual(['19.00 · Bab 1', '22.30 · Bab 2', '03.30 · Bab 3', '07.00 · Bab 4']);
      expect(items.map((li) => li.querySelector('h3')!.textContent)).toEqual(['Boarding & snack', 'Lampu kabin diredupkan', 'Istirahat & salat subuh', 'Tiba di Surabaya']);
      expect(items[2].textContent).toContain('Berhenti sekitar 30 menit di rest area untuk ke toilet dan salat.');
      const skip = within(film).getByRole('link', { name: 'Lewati animasi' });
      expect(skip).toHaveAttribute('href', '#routes');
      expect(skip.className).toContain('sr-only');
      expect(skip.className).toContain('focus:not-sr-only');
      fireEvent.click(skip);
      expect(scrolled).toEqual(['routes']);
      // Tanpa jarak km → kotak poster hanya jam
      cleanup();
      expect(section(demo({ film: { distance: '' } }), 'film').querySelector('[style*="--p"] p')!.textContent).toBe('01.00 WIB');
    });
  });

  it('"Lewati animasi": gulir ke section berikutnya DAN fokus pindah ke judulnya (tanpa gulir ulang)', async () => {
    const container = demo();
    const film = section(container, 'film');
    const skip = within(film).getByRole('link', { name: 'Lewati animasi' });
    skip.focus();
    fireEvent.click(skip);
    expect(scrolled).toEqual(['routes']);
    await wait(100);
    const heading = section(container, 'routes').querySelector('h2')!;
    expect(heading).toHaveFocus();
    expect(heading).toHaveAttribute('tabindex', '-1');
  });

  it('layar pendek (≤ 480px tinggi, mis. HP dimiringkan) → film diam lengkap walau gerak menyala', () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: /max-height:\s*480px/.test(query),
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    try {
      const container = demo();
      expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'on');
      const film = section(container, 'film');
      expect(film.querySelector('.nl-film-track')).toBeNull();
      expect(film.querySelector('.nl-stage')).toBeNull();
      expect(within(film).getByRole('list', { name: 'Bab perjalanan' }).querySelectorAll(':scope > li')).toHaveLength(4);
      expect(Array.from(film.querySelectorAll<HTMLElement>('[style]')).find((el) => el.style.getPropertyValue('--p'))!.style.getPropertyValue('--p')).toBe('0.45');
    } finally {
      window.matchMedia = original;
    }
  });

  it('rute & titik naik: tab kota (semua panah, Home/End), kota pertama terpilih, agen per kota, foto, "Tanya titik naik" → WhatsApp', () => {
    const container = demo();
    const routes = section(container, 'routes');
    const tablist = within(routes).getByRole('tablist', { name: 'Pilih kota' });
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs).toHaveLength(6);
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['true', ...Array(5).fill('false')]);
    expect(tabs.map((t) => t.textContent)).toEqual([
      'JakartaJKT · 3 agen',
      'SemarangSMG · 2 agen',
      'YogyakartaYK · 2 agen',
      'SurabayaSBY · 2 agen',
      'MalangMLG · 1 agen',
      'DenpasarDPS · 2 agen',
    ]);
    expect(tablist.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    const panel = () => within(routes).getByRole('tabpanel');
    const agents = () => Array.from(panel().querySelectorAll('ul > li')).map((li) => li.querySelector('p')!.textContent);
    expect(panel()).toHaveAttribute('aria-labelledby', tabs[0].id);
    expect(panel().querySelector('h3')!.textContent).toBe('Jakarta');
    expect(agents()).toEqual(['Kantor Pusat Cakung', 'Agen Pulo Gebang', 'Agen Kampung Rambutan']);
    expect(panel().textContent).toContain('Jam buka 07.00–21.00');
    expect(panel().querySelector('img')!.getAttribute('alt')!.split(' ').length).toBeGreaterThanOrEqual(5);
    const ask = within(panel()).getByRole('link', { name: 'Tanya titik naik di Jakarta (WhatsApp)' });
    expect(decode(ask)).toBe(`${WA}Halo Nusaline, saya ingin bertanya tentang titik naik di Jakarta.`);
    tabs[0].focus();
    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    expect(tabs[1]).toHaveFocus();
    expect(panel().querySelector('h3')!.textContent).toBe('Semarang');
    expect(agents()).toEqual(['Agen Banyumanik', 'Agen Mangkang']);
    fireEvent.keyDown(tabs[1], { key: 'End' });
    expect(tabs[5]).toHaveFocus();
    expect(panel().querySelector('h3')!.textContent).toBe('Denpasar');
    fireEvent.keyDown(tabs[5], { key: 'ArrowDown' });
    expect(tabs[0]).toHaveFocus();
    fireEvent.keyDown(tabs[0], { key: 'ArrowUp' });
    expect(tabs[5]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs[5], { key: 'Home' });
    expect(tabs[0]).toHaveFocus();
    fireEvent.click(tabs[4]);
    expect(panel().querySelector('h3')!.textContent).toBe('Malang');
    expect(agents()).toEqual(['Agen Arjosari']);
    expect(decode(within(panel()).getByRole('link', { name: 'Tanya titik naik di Malang (WhatsApp)' }))).toContain('titik naik di Malang.');
    expect(routes.textContent).toContain('Alamat dan jam agen contoh; konfirmasi titik naik lewat WhatsApp.');
  });

  it('fasilitas (bento), cara pesan (tiket), cerita penumpang: foto besar parallax + 2 foto kecil, 6 ubin berikon, 3 langkah, 4 kutipan tanpa foto', () => {
    const container = demo();
    const onboard = section(container, 'onboard');
    expect(onboard.querySelectorAll('ul > li')).toHaveLength(9);
    expect(onboard.querySelectorAll('img')).toHaveLength(3);
    expect(Array.from(onboard.querySelectorAll('h3')).map((h) => h.textContent)).toEqual(['Selimut & bantal', 'Port USB', 'Toilet', 'Snack & air mineral', 'Lampu baca', 'Wi-Fi']);
    expect(onboard.querySelectorAll('li > span[aria-hidden] svg')).toHaveLength(6);
    expect(onboard.textContent).toContain('Kabin redup saat malam');
    expect(onboard.textContent).toContain('Bagasi di bawah bus');
    const steps = section(container, 'steps');
    const list = steps.querySelector('ol')!;
    expect(Array.from(list.querySelectorAll(':scope > li h3')).map((h) => h.textContent)).toEqual([
      'Langkah 1: Pilih jadwal',
      'Langkah 2: Kirim pesan WhatsApp',
      'Langkah 3: Bayar & berangkat',
    ]);
    expect(Array.from(list.querySelectorAll('.nl-ticket > span[aria-hidden]')).map((s) => s.textContent)).toEqual(['01', '02', '03']);
    expect(steps.textContent).toContain('Pemesanan hanya menyusun pesan WhatsApp; tidak ada pembayaran online, e-tiket, atau pilihan kursi real-time.');
    // Panah antar-tiket tepat di tengah celah 32px di layar lebar (menutup kedua takik sama banyak)
    expect(list.querySelector(':scope > li > span[aria-hidden]')!.className).toContain('@5xl:-right-8');
    const testimonials = section(container, 'testimonials');
    // Pola kepala section sama dengan section lain: label · H2 · satu kalimat pengantar
    expect(testimonials.textContent).toContain('Cerita singkat penumpang bus malam kami.');
    expect(testimonials.querySelectorAll('figure')).toHaveLength(4);
    expect(testimonials.querySelectorAll('blockquote')).toHaveLength(4);
    expect(testimonials.querySelector('img')).toBeNull();
    for (const svg of testimonials.querySelectorAll('svg')) expect(svg).toHaveAttribute('aria-hidden', 'true');
    // Rute dan kelas dua baris (nama sejajar di semua kartu); kelas dibacakan "kelas …"
    expect(Array.from(testimonials.querySelectorAll('figcaption')).map((f) => f.textContent)).toEqual([
      'DIDimasJakarta → Surabaya, kelas Sleeper',
      'RIRinaJakarta → Yogyakarta, kelas Eksekutif',
      'PHPak HendraJakarta → Malang, kelas Super Eksekutif',
      'BSBu SariJakarta → Denpasar, kelas Sleeper',
    ]);
  });

  it('akordeon tanya jawab: aria-expanded/aria-controls, panel role=region (inert saat tertutup), satu terbuka, tautan WhatsApp', () => {
    const faq = section(demo(), 'faq');
    const buttons = within(faq).getAllByRole('button');
    expect(buttons).toHaveLength(6);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'true');
    expect(buttons[0].closest('h3')).not.toBeNull();
    const region = document.getElementById(buttons[0].getAttribute('aria-controls')!)!;
    expect(region).toHaveAttribute('role', 'region');
    expect(region).toHaveAttribute('aria-labelledby', buttons[0].id);
    expect(region).toHaveAttribute('data-open', 'true');
    expect(region).not.toHaveAttribute('inert');
    fireEvent.click(buttons[2]);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'false');
    expect(buttons[2]).toHaveAttribute('aria-expanded', 'true');
    expect(region).toHaveAttribute('data-open', 'false');
    expect(region).toHaveAttribute('inert');
    fireEvent.click(buttons[2]);
    expect(buttons.every((b) => b.getAttribute('aria-expanded') === 'false')).toBe(true);
    expect(decode(within(faq).getByRole('link', { name: /Hubungi admin lewat WhatsApp/ }))).toBe(`${WA}Halo Nusaline, saya ingin bertanya tentang jadwal bus.`);
    expect(faq.textContent).toContain('Tidak ada pembayaran online di website ini.');
  });

  it('kontak: baris bertautan (≥ 44px), peta; footer midnight dengan rute mono (menyaring jadwal), menu, kontak, media sosial', async () => {
    const container = demo();
    const contact = section(container, 'contact');
    expect(Array.from(contact.querySelectorAll('dt')).map((dt) => dt.textContent)).toEqual(['Kantor pusat', 'Call center', 'WhatsApp', 'Email', 'Jam operasional']);
    expect(within(contact).getAllByRole('link', { name: '0812-3456-7890' }).map((a) => a.getAttribute('href'))).toEqual([
      'tel:+6281234567890',
      expect.stringMatching(/^https:\/\/wa\.me\/6281234567890\?text=/),
    ]);
    for (const link of within(contact).getAllByRole('link', { name: /0812-3456-7890|tiket@example\.com/ })) {
      expect(link.className).toContain('py-3.5');
      expect(link.className).toContain('-my-3.5');
    }
    expect(within(contact).getByRole('link', { name: 'tiket@example.com' })).toHaveAttribute('href', 'mailto:tiket@example.com');
    expect(contact.querySelector('iframe')!.getAttribute('title')).toBe('Peta kantor pusat Nusaline');
    expect(within(contact).getByRole('link', { name: 'Buka di Google Maps' }).getAttribute('href')).toMatch(/^https:\/\/(www\.)?google\.com\/maps/);
    // Nama tautan unik: "Chat WhatsApp" hanya tombol melayang Shell
    expect(within(container).getAllByRole('link', { name: 'Chat WhatsApp' })).toHaveLength(1);
    expect(Array.from(container.querySelectorAll('[data-tpl-section][data-tpl-tone="inverse"]')).map((el) => el.getAttribute('data-tpl-section'))).toEqual([
      'hero',
      'film',
      'footer',
    ]);
    const footer = container.querySelector('footer')!;
    expect(footer.getAttribute('data-tpl-section')).toBe('footer');
    expect(footer.className).toContain('bg-[#0B1026]');
    expect(footer.textContent).toContain(`© ${new Date().getFullYear()} Nusaline`);
    expect(footer.textContent).toContain('Bus malam Jakarta–Bali setiap hari');
    const routes = within(footer).getByRole('navigation', { name: 'Rute malam' });
    const routeLinks = within(routes).getAllByRole('link');
    expect(routeLinks.map((a) => `${a.getAttribute('aria-label')}|${a.getAttribute('href')}|${a.textContent}`)).toEqual([
      'Jadwal Jakarta ke Surabaya|#schedule|JKT → SBYJakarta – Surabaya17.00',
      'Jadwal Jakarta ke Yogyakarta|#schedule|JKT → YKJakarta – Yogyakarta18.00',
      'Jadwal Jakarta ke Semarang|#schedule|JKT → SMGJakarta – Semarang20.00',
      'Jadwal Jakarta ke Malang|#schedule|JKT → MLGJakarta – Malang16.00',
      'Jadwal Jakarta ke Denpasar|#schedule|JKT → DPSJakarta – Denpasar13.00',
      'Jadwal Yogyakarta ke Jakarta|#schedule|YK → JKTYogyakarta – Jakarta18.30',
      'Jadwal Surabaya ke Jakarta|#schedule|SBY → JKTSurabaya – Jakarta17.30',
      'Jadwal Denpasar ke Jakarta|#schedule|DPS → JKTDenpasar – Jakarta12.00',
    ]);
    fireEvent.click(routeLinks[2]);
    expect(scrolled).toEqual(['schedule']);
    expect(within(section(container, 'schedule')).getByRole('status').textContent).toBe('1 jadwal · Jakarta → Semarang');
    // Fokus ikut ke jumlah hasil (seperti kartu cari di hero): Tab berikutnya lanjut di tabel, bukan kembali ke footer
    await wait(100);
    expect(within(section(container, 'schedule')).getByRole('status')).toHaveFocus();
    expect(Array.from(within(footer).getByRole('navigation', { name: 'Tautan footer' }).querySelectorAll('a')).map((a) => a.getAttribute('href'))).toEqual([
      '#schedule',
      '#classes',
      '#routes',
      '#onboard',
      '#faq',
      '#kontak',
    ]);
    for (const link of footer.querySelectorAll('a')) expect(link.className, link.textContent ?? '').toContain('min-h-11');
    expect(within(footer).getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://instagram.com/nusaline.contoh');
    expect(within(footer).getByRole('link', { name: 'Facebook' })).toHaveAttribute('href', 'https://facebook.com/nusaline.contoh');
    expect(within(footer).getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', 'https://linkedin.com/company/nusaline-contoh');
    expect(within(footer).getByRole('link', { name: 'YouTube' })).toHaveAttribute('href', 'https://youtube.com/@nusaline.contoh');
    expect(within(footer).getByRole('link', { name: 'TikTok' })).toHaveAttribute('href', 'https://tiktok.com/@nusaline.contoh');
    expect(footer.textContent).toContain('Pemesanan lewat WhatsApp; jadwal dan harga dikonfirmasi admin.');
  });

  it('wadah PENUH kiri-kanan: header, setiap section, dan footer memakai WRAP (tanpa max-width/CONTAINER)', () => {
    expect(WRAP).toBe('w-full px-5 @2xl:px-8 @5xl:px-12 @min-[96rem]:px-16');
    const container = demo();
    const wraps = (root: Element) => Array.from(root.querySelectorAll('[class]')).filter((el) => classOf(el).includes(WRAP));
    expect(wraps(container.querySelector('header')!).length).toBeGreaterThanOrEqual(1);
    for (const key of [...ORDER, 'footer']) expect(wraps(section(container, key)).length, key).toBeGreaterThanOrEqual(1);
    for (const el of wraps(container)) expect(classOf(el), classOf(el)).not.toMatch(/\bmax-w-|\bmx-auto\b/);
    // Film: panggung selebar layar (trek & panggung tanpa jarak tepi; WRAP hanya untuk teks di atasnya)
    const film = section(container, 'film');
    expect(classOf(film.querySelector('.nl-stage')!)).not.toMatch(/\bpx-|\bmax-w-/);
    expect(film.querySelector('.nl-stage')!.closest('[class*="px-5"]')).toBeNull();
    expect(container.querySelector('[class*="max-w-[1680px]"]')).toBeNull();
    const src = code();
    expect(src).not.toMatch(/max-w-\[1680px\]|\bCONTAINER\b/);
    // Pembatas lebar hanya untuk teks (ch) — kecuali denah kursi tegak di HP (diagram) dan papan bab film (kartu kaca)
    for (const [, value] of src.matchAll(/max-w-\[([^\]]+)\]/g)) expect(value, value).toMatch(/^\d+ch$|^calc\(100%-24px\)$|^180px$|^440px$/);
  });

  it('datar: tidak ada kelas shadow (kecuali tombol melayang Shell), radius hanya rounded-full/rounded-[…], kode tanpa kiriman data', () => {
    const container = demo();
    const shadows = Array.from(container.querySelectorAll('[class*="shadow"]')).filter(
      (el) => !el.closest('[aria-label="Chat WhatsApp"]') && !/Chat WhatsApp|Kembali ke atas/.test(el.getAttribute('aria-label') ?? ''),
    );
    expect(shadows.map((el) => el.className)).toEqual([]);
    const src = source();
    expect(src).not.toMatch(/\bshadow-|box-shadow|text-shadow|drop-shadow/);
    expect(src).not.toMatch(/rounded-(sm|md|lg|xl|2xl|3xl)\b/);
    const plain = code();
    expect(plain).not.toMatch(/framer-motion|useLocation|useParams|localStorage|sessionStorage|fetch\(|XMLHttpRequest|sendBeacon/);
    // Satu-satunya foto parallax di halaman: foto kabin besar di bento fasilitas
    expect(plain.match(/^\s*parallax\s*$/gm) ?? []).toHaveLength(1);
    // Tidak mengimpor dari folder template lain
    for (const [, from] of plain.matchAll(/from '(\.\.\/[^']+)'/g)) expect(from, from).toMatch(/^\.\.\/(shared|kit|types)(\/|$)/);
    // Kendaraan & denah SVG asli tanpa teks merek/pelat: satu-satunya <text> SVG adalah label "WC" di denah
    expect(container.querySelectorAll('svg text')).toHaveLength(Array.from(container.querySelectorAll('svg text')).filter((t) => t.textContent === 'WC').length);
  });
});

describe('Nusaline: gerak', () => {
  it('pratinjau CMS diam dan tanpa tautan wa.me terbuka; hero & film tetap utuh', () => {
    const { container } = render(<def.Component content={resolveContent(def, null)} preview />);
    expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'off');
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    expect(container.querySelector('a[href^="javascript:"], a[href^="vbscript:"]')).toBeNull();
    expect(container.querySelector('[data-hero-layout="departure"] img[fetchpriority="high"]')).not.toBeNull();
    expect(within(container).getByRole('search', { name: 'Cari jadwal bus' })).toBeInTheDocument();
    const film = container.querySelector<HTMLElement>('[data-tpl-section="film"]')!;
    expect(film.querySelector('.nl-film-track')).toBeNull();
    expect(within(film).getByRole('list', { name: 'Bab perjalanan' }).querySelectorAll('li')).toHaveLength(4);
    expect(within(film).getByRole('link', { name: 'Lewati animasi' })).toBeInTheDocument();
  });

  it('film bergerak (IntersectionObserver + matchMedia ditiru): trek + panggung sticky, hook memasang & melepas pendengar, --p/jam/km/bab mengikuti gulir', () => {
    const observers: { cb: IntersectionObserverCallback; options?: IntersectionObserverInit; targets: Element[]; disconnected: boolean }[] = [];
    class FakeObserver {
      readonly entry: (typeof observers)[number];
      constructor(cb: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        this.entry = { cb, options, targets: [], disconnected: false };
        observers.push(this.entry);
      }
      observe(el: Element) {
        this.entry.targets.push(el);
      }
      unobserve() {}
      disconnect() {
        this.entry.disconnected = true;
      }
      takeRecords() {
        return [];
      }
    }
    // Setup uji memasang IntersectionObserver tiruan yang tidak bisa didefinisikan ulang (writable) → tukar langsung
    const originals = { io: window.IntersectionObserver, raf: window.requestAnimationFrame, caf: window.cancelAnimationFrame };
    window.IntersectionObserver = FakeObserver as unknown as typeof IntersectionObserver;
    // rAF sinkron (mengembalikan 0 agar frame berikutnya tidak tertahan); matchMedia setup = tanpa reduced motion
    window.requestAnimationFrame = (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    };
    window.cancelAnimationFrame = () => undefined;
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    try {
      const { container, unmount } = render(<SiteRenderer templateCode="nusaline" content={null} />);
      expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'on');
      const film = section(container, 'film');
      const track = film.querySelector<HTMLElement>('.nl-film-track')!;
      const stage = film.querySelector<HTMLElement>('.nl-stage[data-film-progress]')!;
      expect(track).not.toBeNull();
      expect(stage.parentElement).toBe(track);
      // Ukuran trek/panggung dari CSS (--film-vh diukur hook: tinggi area terlihat − --tpl-sticky-top)
      expect(track.style.getPropertyValue('--film-vh')).toBe('768px');
      expect(stage.style.getPropertyValue('--p')).toBe('0.0000');
      expect(stage.style.getPropertyValue('--nl-rest')).toBe('0.6192');
      expect(stage.querySelector('.nl-scene')).toHaveAttribute('aria-hidden', 'true');
      const chapters = within(film).getByRole('list', { name: 'Bab perjalanan' });
      const items = Array.from(chapters.querySelectorAll(':scope > li'));
      expect(items.map((li) => li.getAttribute('aria-current'))).toEqual(['step', null, null, null]);
      expect(items.map((li) => li.querySelector('h3')!.textContent)).toEqual(['Boarding & snack', 'Lampu kabin diredupkan', 'Istirahat & salat subuh', 'Tiba di Surabaya']);
      expect(within(film).getByRole('link', { name: 'Lewati animasi' })).toHaveAttribute('href', '#routes');
      const dashboard = () => Array.from(film.querySelectorAll('p[aria-hidden="true"].font-mono')).map((p) => p.textContent);
      expect(dashboard()).toEqual(['19.00WIB', '0 km / 780 km']);
      // Belum dekat layar → belum ada pendengar gulir film (capture) di window
      const io = observers.find((o) => o.targets.includes(track))!;
      expect(io.options?.rootMargin).toBe('25% 0px 25% 0px');
      expect(add.mock.calls.filter(([type, , options]) => type === 'scroll' && typeof options === 'object' && options.capture === true)).toEqual([]);
      add.mockClear();
      track.getBoundingClientRect = () => ({ top: -500, height: 3000, bottom: 2500, left: 0, right: 1024, width: 1024, x: 0, y: -500, toJSON: () => ({}) }) as DOMRect;
      act(() => io.cb([{ isIntersecting: true, target: track } as unknown as IntersectionObserverEntry], io as unknown as IntersectionObserver));
      const scrollCall = add.mock.calls.find(([type]) => type === 'scroll')!;
      expect(scrollCall[2]).toEqual({ passive: true, capture: true });
      const resizeCall = add.mock.calls.find(([type]) => type === 'resize')!;
      expect(resizeCall[2]).toEqual({ passive: true });
      expect(stage.style.getPropertyValue('--p')).toBe('0.2240');
      expect(dashboard()).toEqual(['21.51WIB', '174 km / 780 km']);
      expect(items.map((li) => li.getAttribute('aria-current'))).toEqual(['step', null, null, null]);
      // Gulir lebih jauh → istirahat (bab 3), rel bab menyala
      track.getBoundingClientRect = () => ({ top: -1500, height: 3000, bottom: 1500, left: 0, right: 1024, width: 1024, x: 0, y: -1500, toJSON: () => ({}) }) as DOMRect;
      act(() => {
        window.dispatchEvent(new Event('scroll'));
      });
      expect(stage.style.getPropertyValue('--p')).toBe('0.6720');
      expect(dashboard()).toEqual(['04.06WIB', '572 km / 780 km']);
      expect(items.map((li) => li.getAttribute('aria-current'))).toEqual([null, null, 'step', null]);
      expect(Array.from(film.querySelectorAll('.nl-tick')).map((t) => t.getAttribute('data-on'))).toEqual(['true', 'true', 'true', 'false']);
      // Jendela keterangan & titik rel = awal tampil bab (show): istirahat p 0,5692–0,6892, tiba sejak 0,6892
      expect(items.map((li) => [(li as HTMLElement).style.getPropertyValue('--a'), (li as HTMLElement).style.getPropertyValue('--b')])).toEqual([
        ['-1', '0.2708'],
        ['0.2708', '0.5692'],
        ['0.5692', '0.6892'],
        ['0.6892', '2'],
      ]);
      expect(Array.from(film.querySelectorAll<HTMLElement>('.nl-tick')).map((t) => t.style.left)).toEqual(['0.6%', '27.08%', '56.92%', '68.92%']);
      // Bus sudah meninggalkan rest area dan masuk Surabaya (p 0,8, jam 05.53): keterangan & titik rel = bab tiba
      track.getBoundingClientRect = () => ({ top: -1786, height: 3000, bottom: 1214, left: 0, right: 1024, width: 1024, x: 0, y: -1786, toJSON: () => ({}) }) as DOMRect;
      act(() => {
        window.dispatchEvent(new Event('scroll'));
      });
      expect(stage.style.getPropertyValue('--p')).toBe('0.8002');
      expect(dashboard()).toEqual([`${formatClock(clockAt(0.8002, TIMELINE))}WIB`, `${kmAt(0.8002, TIMELINE)} km / 780 km`]);
      expect(items.map((li) => li.getAttribute('aria-current'))).toEqual([null, null, null, 'step']);
      expect(Array.from(film.querySelectorAll('.nl-tick')).map((t) => t.getAttribute('data-on'))).toEqual(['true', 'true', 'true', 'true']);
      // Rel progres hanya titik bab (nama bab ada di kartu bab): tanpa baris label yang bisa saling menimpa
      expect(film.querySelector('.nl-rail')!.textContent).toBe('Gulir untuk memutar');
      // Jam & km di kartu gelap (kontras di langit fajar), total km tidak lagi putih 50%
      const dash = film.querySelector<HTMLElement>('[data-film-text] > p[aria-hidden="true"].font-mono')!.parentElement!;
      expect(dash.className).toMatch(/bg-\[#0B1026\]\/75/);
      expect(dash.innerHTML).not.toMatch(/text-white\/50/);
      // Trek menjauh (pendengar dilepas), layar diubah ukurannya / diputar di bagian lain halaman, trek kembali dekat →
      // ukuran diukur ulang dulu (tanpa itu panggung tetap setinggi layar lama)
      act(() => io.cb([{ isIntersecting: false, target: track } as unknown as IntersectionObserverEntry], io as unknown as IntersectionObserver));
      const height = window.innerHeight;
      Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 600 });
      try {
        act(() => {
          window.dispatchEvent(new Event('resize'));
        });
        expect(track.style.getPropertyValue('--film-vh')).toBe('768px');
        act(() => io.cb([{ isIntersecting: true, target: track } as unknown as IntersectionObserverEntry], io as unknown as IntersectionObserver));
        expect(track.style.getPropertyValue('--film-vh')).toBe('600px');
      } finally {
        Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: height });
      }
      // Lepas: semua pendengar & observer dilepas
      remove.mockClear();
      unmount();
      expect(io.disconnected).toBe(true);
      expect(remove).toHaveBeenCalledWith('scroll', scrollCall[1], { capture: true });
      expect(remove).toHaveBeenCalledWith('resize', resizeCall[1]);
    } finally {
      add.mockRestore();
      remove.mockRestore();
      window.IntersectionObserver = originals.io;
      window.requestAnimationFrame = originals.raf;
      window.cancelAnimationFrame = originals.caf;
    }
  });

  it('nusaline.css: gerak & film bergerbang [data-tpl-motion=\'on\'], blok reduced-motion & cetak, kelas nl-, Ken Burns skala-saja ≤ 1,06 sekali', () => {
    const css = readFileSync(resolve(ROOT, 'src/templates/nusaline/nusaline.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).toContain('@layer components');
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(css).toMatch(/@media print/);
    for (const rule of css.match(/^\s*[^@\s{}][^{}]*\{[^}]*\b(transition|animation):[^}]*\}/gm) ?? []) {
      const selector = rule.split('{')[0];
      if (/transition:\s*none|animation:\s*none/.test(rule)) continue;
      expect(selector, rule).toContain("[data-tpl-motion='on']");
    }
    // Film: trek tinggi, sticky, will-change, keterangan bab & rel HANYA saat gerak menyala
    for (const prop of ['position: sticky', 'will-change', 'height: calc(var(--film-vh']) {
      const rules = css.match(new RegExp(`[^{}]*\\{[^{}]*${prop.replace(/[()]/g, '\\$&')}[^{}]*\\}`, 'g')) ?? [];
      expect(rules.length, prop).toBeGreaterThan(0);
      for (const rule of rules) expect(rule.split('{')[0], prop).toContain("[data-tpl-motion='on']");
    }
    for (const cls of ['.nl-chapter', '.nl-rail-fill', '.nl-scroll-hint', '.nl-film-track', '.nl-stage']) {
      for (const rule of css.match(new RegExp(`[^{}]*\\${cls}\\b[^{}]*\\{[^}]*\\}`, 'g')) ?? []) {
        if (/print|position: relative|height: auto/.test(rule)) continue;
        expect(rule.split('{')[0].trim(), rule).toMatch(/\[data-tpl-motion='on'\]/);
      }
    }
    expect((css.match(/will-change:/g) ?? []).length).toBe(1);
    expect(css).toMatch(/\[data-tpl-motion='on'\] \.nl-stage \.nl-sky,\s*\[data-tpl-motion='on'\] \.nl-stage \.nl-mid,\s*\[data-tpl-motion='on'\] \.nl-stage \.nl-near,\s*\[data-tpl-motion='on'\] \.nl-stage \.nl-bus \{\s*will-change: transform;/);
    for (const cls of css.match(/\.[a-z][\w-]*/g) ?? []) if (!/^\.(tpl-)/.test(cls)) expect(cls, cls).toMatch(/^\.nl-/);
    expect(css).not.toMatch(/infinite|box-shadow|text-shadow|drop-shadow|background-attachment/);
    // Hanya transform/opacity yang dianimasikan (keyframes)
    for (const [, body] of css.matchAll(/@keyframes [\w-]+\s*\{([\s\S]*?)\n\}/g)) {
      for (const [, prop] of body.matchAll(/^\s*([a-z-]+):/gm)) expect(['transform', 'opacity'], prop).toContain(prop);
    }
    // Ken Burns: hanya transform scale, maks. 1,06, 14 dtk sekali (tanpa iteration-count)
    const kenburns = /@keyframes nl-kenburns\s*\{([\s\S]*?)\n\}/.exec(css)![1];
    expect(kenburns).not.toMatch(/opacity|clip|filter/);
    const scales = [...kenburns.matchAll(/scale\(([\d.]+)\)/g)].map((m) => Number(m[1]));
    expect(Math.max(...scales)).toBeLessThanOrEqual(1.06);
    expect(Math.min(...scales)).toBe(1);
    expect(css).toMatch(/\[data-tpl-motion='on'\] \.nl-kenburns \{\s*animation: nl-kenburns 14s [^;]*;/);
    // Durasi: garis rute ≤ 1,6 dtk, gerak UI ≤ 400 ms, transisi ≤ 1 dtk; papan split-flap selesai ≤ 1,2 dtk
    for (const [, name, value, unit] of css.matchAll(/animation:\s*nl-([a-z-]+)\s+([\d.]+)(m?s)/g)) {
      const ms = Number(value) * (unit === 's' ? 1000 : 1);
      if (name === 'kenburns') continue;
      expect(ms, name).toBeLessThanOrEqual(/^grow/.test(name) ? 1600 : 400);
    }
    for (const [, value, unit] of css.matchAll(/transition:[^;]*?\s([\d.]+)(m?s)/g)) expect(Number(value) * (unit === 's' ? 1000 : 1)).toBeLessThanOrEqual(1000);
    expect(css).toMatch(/animation-delay: calc\(200ms \+ var\(--nl-r, 0\) \* 120ms \+ var\(--nl-i, 0\) \* 24ms\);/);
    expect(200 + 2 * 120 + 12 * 24 + 380).toBeLessThanOrEqual(1200);
    // Cetak = papan cerita: film bergerak tercetak dengan SEMUA bab terlihat (tidak bertumpuk/memudar), teks pendukung
    // tidak tersembunyi, tanpa rel progres
    const printBlock = css.slice(css.indexOf('@media print'));
    expect(printBlock).toMatch(/\[data-tpl-motion='on'\] \.nl-chapter \{[^}]*grid-area: auto;[^}]*opacity: 1;[^}]*transform: none;/);
    expect(printBlock).toMatch(/\.nl-stage\[data-fit\] :is\(\.nl-fit-1, \.nl-fit-2, \.nl-fit-3\) \{[^}]*clip-path: none;/);
    expect(printBlock).toMatch(/\[data-tpl-motion='on'\] \.nl-rail \{\s*display: none;/);
    expect(printBlock).toMatch(/\[data-tpl-motion='on'\] \.nl-stage \{[^}]*height: auto;[^}]*overflow: visible;/);
    // Bab bertumpuk lewat CSS (bukan kelas utilitas, yang tidak bisa ditimpa @media print dari lapisan components)
    expect(css).toMatch(/\[data-tpl-motion='on'\] \.nl-chapter \{[^}]*grid-area: 1 \/ 1;/);
    expect(readFileSync(resolve(ROOT, 'src/templates/nusaline/Film.tsx'), 'utf8')).not.toMatch(/\[grid-area:/);
    // Keadaan diam = keadaan akhir: kursi, garis rute, titik kota terlihat penuh tanpa gerak
    expect(css).toMatch(/\.nl-collapse\[data-open='true'\]\s*\{\s*grid-template-rows: 1fr;/);
    expect(css).not.toMatch(/^\s*\.nl-(seat|route-svg|stop-dot|flap|row|panel)\s*\{[^}]*opacity:\s*0/m);
  });
});

describe('Nusaline: warna tema bisa diganti', () => {
  it('raspberry bawaan → --tpl-accent; warna CMS mengalir ke neon, teks aksen, livery; teks di atas aksen kontras', () => {
    const base = demo();
    expect(rootStyle(base, '--tpl-accent')).toBe('#d81e5b');
    expect(rootStyle(base, '--nl-neon')).toBe('#e67097');
    expect(rootStyle(base, '--nl-ink')).toBe('#bc1c55');
    expect(rootStyle(base, '--nl-livery-dark')).toBe('#721741');
    expect(rootStyle(base, '--tpl-on-accent')).toBe('#ffffff');
    cleanup();
    const blue = demo({ brand: { accent_color: '#1D4ED8' } });
    expect(rootStyle(blue, '--tpl-accent')).toBe('#1d4ed8');
    for (const name of ['--nl-neon', '--nl-ink', '--nl-livery-dark']) expect(rootStyle(blue, name), name).toBe((nusalineVars('#1D4ED8') as Record<string, string>)[name]);
    cleanup();
    expect(rootStyle(demo({ brand: { accent_color: '#FACC15' } }), '--tpl-on-accent')).toBe('#121620');
  });
});

describe('Nusaline: SEO situs pembeli, judul, gambar, tautan', () => {
  it('judul tab & meta description dari nama, tagline, dan deskripsi hero; theme-color = aksen', () => {
    expect(siteTitle('nusaline', null)).toBe('Nusaline — Bus malam Jakarta–Bali setiap hari');
    expect(siteTitle('nusaline', null).length).toBeLessThanOrEqual(60);
    const restore = applySiteHead('nusaline', null);
    const description = document.head.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
    expect(description).toBe(def.defaultContent.hero.subtitle);
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(200);
    expect(document.head.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#D81E5B');
    restore();
  });

  it('satu H1, tiap section diawali tepat satu H2, H3 hanya di bawah H2, tanpa h4–h6; judul kosong → H2 sr-only', () => {
    const container = demo();
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelectorAll('h4, h5, h6')).toHaveLength(0);
    const check = (root: HTMLElement) => {
      for (const key of ORDER.filter((k) => k !== 'hero')) {
        const levels = Array.from(section(root, key).querySelectorAll('h1, h2, h3')).map((h) => h.tagName);
        expect(levels[0], key).toBe('H2');
        expect(levels.filter((l) => l === 'H2'), key).toHaveLength(1);
        expect(levels.filter((l) => l === 'H1'), key).toHaveLength(0);
      }
    };
    check(container);
    expect(section(container, 'hero').querySelector('h2, h3')).toBeNull();
    cleanup();
    const untitled = demo(Object.fromEntries(ORDER.filter((k) => k !== 'hero').map((k) => [k, { title: '' }])));
    check(untitled);
    expect(ORDER.filter((k) => k !== 'hero').map((k) => section(untitled, k).querySelector('h2')!.textContent)).toEqual([
      'Jadwal keberangkatan',
      'Kelas perjalanan',
      'Perjalanan semalam',
      'Rute dan titik naik',
      'Fasilitas di kabin',
      'Cara pesan tiket',
      'Cerita penumpang',
      'Tanya jawab',
      'Kontak',
    ]);
    for (const k of ORDER.filter((key) => key !== 'hero')) expect(section(untitled, k).querySelector('h2'), k).toHaveClass('sr-only');
    // Judul hero kosong → nama perusahaan (tetap satu H1)
    cleanup();
    expect(section(demo({ hero: { title: '' } }), 'hero').querySelector('h1')!.textContent).toBe('Nusaline');
  });

  it('gambar: alt deskriptif, width/height, srcset & sizes', () => {
    const container = demo();
    const imgs = Array.from(container.querySelectorAll('img'));
    // hero + foto kelas aktif + foto kota aktif + 3 foto fasilitas
    expect(imgs).toHaveLength(6);
    for (const img of imgs) {
      const src = img.getAttribute('src') ?? '';
      expect(img.hasAttribute('alt'), src).toBe(true);
      expect(Number(img.getAttribute('width')), src).toBeGreaterThan(0);
      expect(Number(img.getAttribute('height')), src).toBeGreaterThan(0);
      expect(img.getAttribute('srcset'), src).toMatch(/ 800w, /);
      expect(img.getAttribute('sizes'), src).toBeTruthy();
      const alt = img.getAttribute('alt')!;
      if (img.closest('[aria-hidden="true"]')) expect(alt, src).toBe('');
      else expect(alt.split(' ').length, src).toBeGreaterThanOrEqual(5);
    }
  });

  it('tautan asli untuk navigasi, tombol hanya untuk aksi (kecuali kirim formulir); SVG dekoratif tersembunyi', () => {
    const container = demo();
    for (const a of container.querySelectorAll('a')) expect(a.getAttribute('href'), a.textContent ?? '').toMatch(/^(#[a-z]|https:\/\/|mailto:|tel:)/);
    for (const button of container.querySelectorAll('button')) {
      const submit = !!button.closest('form') && /Cari jadwal/.test(button.textContent ?? '');
      expect(button.getAttribute('type'), button.textContent ?? '').toBe(submit ? 'submit' : 'button');
    }
    for (const svg of container.querySelectorAll('svg')) expect(svg.closest('[aria-hidden="true"], [aria-hidden=""]') ?? svg.getAttribute('aria-hidden'), svg.outerHTML.slice(0, 60)).toBeTruthy();
  });
});

describe('Nusaline: konten opsional kosong', () => {
  it('tanpa jadwal → tabel, kartu cari, papan, menu "Jadwal", dan rute footer hilang; tombol jadwal → Kontak; Pesan kelas → WhatsApp', () => {
    const container = demo({ schedule: { items: [] } });
    expect(sectionKeys(container)).not.toContain('schedule');
    const hero = section(container, 'hero');
    expect(within(hero).queryByRole('search')).toBeNull();
    expect(within(hero).queryByRole('list', { name: 'Berangkat malam ini' })).toBeNull();
    expect(within(hero).getByRole('link', { name: 'Pilih kelas' })).toHaveAttribute('href', '#classes');
    expect(within(container.querySelector('header')!).getAllByRole('link', { name: 'Cek Jadwal' })[0]).toHaveAttribute('href', '#kontak');
    expect(Array.from(container.querySelector('header nav')!.querySelectorAll('a')).map((a) => a.textContent)).not.toContain('Jadwal');
    expect(within(container.querySelector('footer')!).queryByRole('navigation', { name: 'Rute malam' })).toBeNull();
    const book = within(section(container, 'classes')).getByRole('link', { name: 'Pesan kelas ini' });
    expect(decode(book)).toBe(`${WA}Halo Nusaline, saya ingin pesan tiket kelas Eksekutif.`);
  });

  it('satu kelas tanpa foto & harga → tanpa tab, tanpa foto/ilustrasi (denah | rincian saja); papan tanpa judul → tanpa papan', () => {
    const container = demo({
      classes: { items: [{ name: 'Eksekutif', layout: '2-2', seats: '28', features: 'Kursi rebah', price: '' }] },
      hero: { board_title: '' },
    });
    const classes = section(container, 'classes');
    expect(within(classes).queryByRole('tablist')).toBeNull();
    expect(within(classes).queryByRole('tabpanel')).toBeNull();
    expect(classes.querySelector('img')).toBeNull();
    expect(classes.querySelector('.nl-berth')).toBeNull();
    expect(classes.querySelectorAll('svg[data-orient="h"] .nl-seat')).toHaveLength(28);
    expect(classes.textContent).not.toContain('Mulai');
    const panel = classes.querySelector('h3')!.parentElement!.parentElement!;
    expect(Array.from(panel.children).map((el) => el.tagName)).toEqual(['FIGURE', 'DIV']);
    expect(within(classes).getByRole('button', { name: 'Pesan kelas ini: Eksekutif' })).toBeInTheDocument();
    expect(within(section(container, 'hero')).queryByRole('list', { name: 'Berangkat malam ini' })).toBeNull();
  });

  it('rute satu kota tanpa agen & foto → tanpa tab, kalimat konfirmasi admin; fasilitas tanpa foto → ubin saja; film tanpa km', () => {
    const container = demo({
      routes: { stops: [{ city: 'Jakarta', code: '', image: '' }], points: [] },
      onboard: { image: '', photos: [] },
      film: { distance: '' },
    });
    const routes = section(container, 'routes');
    expect(within(routes).queryByRole('tablist')).toBeNull();
    expect(within(routes).queryByRole('tabpanel')).toBeNull();
    expect(routes.querySelector('img')).toBeNull();
    expect(routes.textContent).toContain('Titik naik di kota ini dikonfirmasi admin lewat WhatsApp.');
    const onboard = section(container, 'onboard');
    expect(onboard.querySelector('img')).toBeNull();
    expect(onboard.querySelectorAll('ul > li')).toHaveLength(6);
    // Film (bergerak di jsdom) tanpa jarak → tanpa penghitung km, jam tetap
    const film = section(container, 'film');
    expect(Array.from(film.querySelectorAll('p[aria-hidden="true"].font-mono')).map((p) => p.textContent)).toEqual(['19.00WIB']);
    expect(film.textContent).not.toMatch(/\bkm\b/);
    // Kode kota kosong → 3 huruf pertama (papan & footer)
    expect(within(container.querySelector('footer')!).getAllByRole('link', { name: /^Jadwal Jakarta ke/ })[0].textContent).toMatch(/^JAK → SUR/);
  });

  it('section kosong keluar dari halaman: film tanpa bab, cerita kosong, fasilitas kosong; tanpa foto hero → tanpa gambar eager', () => {
    const container = demo({ film: { chapters: [] }, testimonials: { items: [] }, onboard: { items: [], image: '' }, hero: { image: '' } });
    for (const key of ['film', 'testimonials', 'onboard']) expect(sectionKeys(container), key).not.toContain(key);
    expect(container.querySelectorAll('img[loading="eager"]')).toHaveLength(0);
    expect(section(container, 'hero').querySelector('h1')!.textContent).toBe('Tidur nyenyak, bangun di kota tujuan.');
  });

  it('tanpa WhatsApp → Pesan menuju Kontak, tanpa tautan wa.me; tanpa WhatsApp & kontak → tanpa tombol Pesan', () => {
    const container = demo({ contact: { whatsapp: '' } });
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    const schedule = section(container, 'schedule');
    const book = within(schedule).getByRole('link', { name: 'Pesan: Denpasar → Jakarta 12.00 Super Eksekutif' });
    expect(book).toHaveAttribute('href', '#kontak');
    expect(within(section(container, 'faq')).queryByRole('link', { name: /Hubungi admin lewat WhatsApp/ })).toBeNull();
    expect(within(section(container, 'routes')).queryByRole('link', { name: /Tanya titik naik/ })).toBeNull();
    expect(Array.from(section(container, 'contact').querySelectorAll('dt')).map((dt) => dt.textContent)).not.toContain('WhatsApp');
    expect(within(container.querySelector('footer')!).queryByRole('link', { name: 'WhatsApp admin' })).toBeNull();
    cleanup();
    const bare = section(demo({ contact: { whatsapp: '', enabled: false } }), 'schedule');
    expect(within(bare).queryAllByRole('link', { name: /^Pesan/ })).toHaveLength(0);
    expect(bare.querySelectorAll('tbody > tr')).toHaveLength(6);
  });

  it('header & footer: tanpa label tombol → tanpa tombol; tanpa media sosial; section mati keluar dari halaman & menu', () => {
    const container = demo({
      hero: { header_label: '' },
      footer: { instagram: '', facebook: '', linkedin: '', youtube: '', tiktok: '' },
      faq: { enabled: false },
      steps: { enabled: false },
      testimonials: { items: [] },
    });
    expect(within(container.querySelector('header')!).queryByRole('link', { name: 'Cek Jadwal' })).toBeNull();
    const footer = container.querySelector('footer')!;
    expect(footer.textContent).not.toContain('Media sosial');
    for (const key of ['faq', 'steps', 'testimonials']) expect(sectionKeys(container), key).not.toContain(key);
    expect(Array.from(container.querySelector('header nav')!.querySelectorAll('a')).map((a) => a.getAttribute('href'))).not.toContain('#faq');
    cleanup();
    expect(demo({ footer: { enabled: false } }).querySelector('footer')).toBeNull();
  });
});

describe('Nusaline: editor CMS', () => {
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

describe('Nusaline: data katalog', () => {
  const MIGRATION = 'database/migrations/2026-10-29_050_nusaline_template.sql';
  const sql = () => readFileSync(resolve(ROOT, MIGRATION), 'utf8');

  it('migrasi 050: baris nusaline dengan template_code, kategori baru, harga, pratinjau .webp, fitur, salinan jujur', () => {
    const text = sql();
    expect(text).toContain("'nusaline'");
    expect(text).toContain("'Travel & Transportasi'");
    expect(text).toContain('1790000.00');
    expect(text).toContain("'/assets/templates/nusaline-preview.webp'");
    expect(text).toContain('\'["/assets/templates/nusaline-1.webp","/assets/templates/nusaline-2.webp"]\'');
    expect(text).toMatch(/Pemesanan hanya menyusun pesan WhatsApp ke admin: tidak ada pembayaran online, e-tiket, atau pilihan kursi real-time/);
    expect(text).toMatch(/jadwal serta harga dikonfirmasi admin/);
    expect(text).not.toMatch(/termasuk domain|domain, hosting|dijamin|garansi|terbaik|termurah|izin trayek|Kemenhub|Dishub|asuransi|Jasa Raharja|uji KIR/i);
    expect(text).toMatch(/kategori baru; halaman kategorinya ditambahkan di kode yang sama/);
    expect(text).toMatch(/termasuk setup \+ hosting \+ SSL tahun pertama/);
    const features = JSON.parse(/features\s+= '(\[[^']*\])'/.exec(text)![1]) as string[];
    expect(features.length).toBeGreaterThanOrEqual(6);
    expect(features.length).toBeLessThanOrEqual(8);
    expect(features[features.length - 1]).toBe('Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)');
    // Berkas galeri yang disebut migrasi benar-benar ada
    const gallery = JSON.parse(/gallery\s+= '(\[[^']*\])'/.exec(text)![1]) as string[];
    expect(gallery).toEqual(['/assets/templates/nusaline-1.webp', '/assets/templates/nusaline-2.webp']);
    for (const url of gallery) expect(existsSync(publicFile(url)), url).toBe(true);
  });

  it('migrasi 050 aman diulang (INSERT IGNORE + UPDATE berdasarkan slug, tanpa DELETE) dan tercatat di schema_migrations', () => {
    const raw = sql();
    expect(raw).toMatch(/Domain\s+(--\s+)?tidak termasuk harga template/);
    expect(raw).toMatch(/FIKTIF/);
    expect(raw).toMatch(/Unsplash/);
    expect(raw).toMatch(/SETELAH kode/);
    expect(raw).toMatch(/MENIMPA perubahan admin/);
    const text = raw.replace(/^--.*$/gm, '');
    expect(text).toMatch(/INSERT IGNORE INTO templates/);
    expect(text).toMatch(/WHERE slug = 'nusaline';/);
    expect(text).toMatch(/sort_order\s+= 33/);
    expect(text).toMatch(/status\s+= 'published'/);
    expect(text).toMatch(/category\s+= 'Travel & Transportasi'/);
    expect(text).toMatch(/price\s+= 1790000\.00/);
    expect(text).not.toMatch(/\bDELETE\b|\bDROP\b|\bTRUNCATE\b/i);
    expect(text).toContain("VALUES ('2026-10-29_050', 'templates: katalog Nusaline')");
  });

  it('gambar pratinjau katalog ada di public/, 1600×1000, VP8/VP8X, dan ringan', () => {
    for (const name of ['nusaline-preview', 'nusaline-1', 'nusaline-2']) {
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

  it('halaman katalog: judul ≤ 60 huruf, deskripsi dengan kalimat domain tetap, H1, salinan jujur', () => {
    const title = (catalogSeo.title ?? '').replace('{nama}', 'Nusaline').replace('{harga_singkat}', 'Rp1,79 jt');
    expect(title).toBe('Nusaline: Template Website PO Bus Antarkota – Rp1,79 jt');
    expect(title.length).toBeLessThanOrEqual(60);
    expect(catalogSeo.description).toMatch(/^.{1,69} \{harga\} sudah termasuk hosting & SSL tahun pertama; domain mulai \{domain_mulai\}\/tahun\.$/);
    expect(catalogSeo.niche).toBe('PO Bus Antarkota');
    expect(catalogSeo.updated).toBe('2026-10-30');
    expect(catalogPage.h1).toBe('{nama}: Template Website PO Bus Antarkota');
    expect(catalogPage.niche).toBe('PO bus antarkota');
    const text = JSON.stringify(catalogContent);
    expect(text).toMatch(/fiktif/);
    expect(text).toContain('Pemesanan hanya menyusun pesan WhatsApp');
    expect(text).toContain('tidak ada pembayaran online, e-tiket, atau pilihan kursi real-time');
    expect(text).toMatch(/website tidak tersambung ke sistem tiket/);
    expect(text).not.toMatch(/\b(dijamin|garansi|terbaik nomor|rating \d|bintang \d|#1)\b|1\.790\.000|termasuk domain/i);
    expect(text).not.toMatch(/izin trayek|berizin|Kemenhub|Dishub|terdaftar resmi|ASITA|IPOMI|PAWIBA|uji KIR|\bISO\b|asuransi|Jasa Raharja|bersertifikat/i);
    expect(text).not.toMatch(/\d+ (hari|jam) kerja/);
    expect(Object.keys(catalogContent.imageAlts ?? {})).toEqual(['nusaline-preview.webp', 'nusaline-1.webp', 'nusaline-2.webp']);
    expect(catalogContent.guides).toEqual(['template-vs-jasa-website-custom', 'biaya-website-company-profile']);
  });
});

describe('Nusaline: konten aneh', () => {
  it('angka, null, dan string di tempat list tidak membuat crash; tautan & gambar berbahaya dibuang', () => {
    const weird = {
      hero: { image: 'javascript:alert(1)', header_url: 'javascript:alert(1)', subtitle: 7, highlight: 'tidak ada di judul' },
      schedule: {
        items: [null, 'x', { from: 'A', to: 'B', depart: '25.99' }, { from: 'Jakarta', to: 'Bandung', depart: '21.00', duration: {}, price: 'abc', class: 5 }],
      },
      classes: { items: 'x' },
      film: { chapters: [null, { time: 'x', title: 'Satu' }, { title: 'Dua', time: 7 }], distance: {} },
      routes: { stops: [null, { city: 'Jakarta', image: 'javascript:alert(1)' }], points: 5 },
      onboard: { items: [null, { title: 'USB' }], image: 'vbscript:x', photos: [{ image: 'javascript:x', caption: 'X' }] },
      steps: { items: 3 },
      testimonials: { items: [{ quote: 9 }] },
      faq: { items: [{ question: 2, answer: null }], link_url: 'vbscript:x' },
      contact: { whatsapp: 'abc', maps_url: 'javascript:alert(1)' },
      footer: { instagram: 'javascript:alert(1)' },
      brand: { accent_color: 'oranye' },
    } as unknown as SiteContent;
    const { container } = render(<def.Component content={resolveContent(def, weird)} />);
    expect(container.querySelector('a[href^="javascript:"], a[href^="vbscript:"]')).toBeNull();
    expect(container.querySelector('img[src^="javascript:"], img[src^="vbscript:"]')).toBeNull();
    expect(container.querySelector('iframe[src^="javascript:"]')).toBeNull();
    expect(container.querySelector('h1')!.textContent).toBe('Tidur nyenyak, bangun di kota tujuan.');
    const schedule = section(container, 'schedule');
    expect(schedule.querySelectorAll('tbody > tr')).toHaveLength(1);
    expect(schedule.textContent).toContain('Jakarta → Bandung');
    expect(schedule.textContent).toContain('Tanya admin');
    expect(container.textContent).not.toMatch(/NaN|undefined|Infinity|\[object Object\]/);
    expect(rootStyle(container, '--nl-neon')).toBe('#e67097');
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

describe('Nusaline: perbaikan tinjauan live 2026-10-31', () => {
  const cls = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/);

  it('jadwal di HP: kelas & harga melintasi kolom tengah (lebar kolom jam tidak ikut chip kelas), harga baris sendiri di bawah 24rem — di 320px durasi tidak menimpa jam tiba dan harga tidak keluar kartu', () => {
    const schedule = section(demo(), 'schedule');
    const rows = Array.from(schedule.querySelectorAll('tr[role="row"]')).filter((tr) => tr.querySelector('td'));
    expect(rows.length).toBeGreaterThan(0);
    for (const tr of rows) {
      expect(cls(tr)).toEqual(expect.arrayContaining(['grid-cols-[auto_minmax(0,1fr)_auto]', 'gap-x-2', '@min-[24rem]:gap-x-3', '@3xl:table-row']));
      const tds = Array.from(tr.querySelectorAll(':scope > td'));
      const [, , , , klass, price, book] = tds;
      expect(cls(klass)).toEqual(expect.arrayContaining(['col-span-2', 'col-start-1', 'row-start-3', 'min-w-0']));
      // sel mengisi kolom 1–2 (lebar pasti) → chip max-w-full memotong nama kelas panjang, tidak menimpa harga
      expect(cls(klass)).not.toContain('justify-self-start');
      // ≥ 24rem: harga di kolom 3 saja (chip kelas kolom 1–2, dipotong di sana); < 24rem: baris sendiri selebar kartu
      expect(cls(price)).toEqual(expect.arrayContaining(['col-start-3', 'row-start-3', 'justify-self-end', '@max-[24rem]:col-span-3', '@max-[24rem]:col-start-1', '@max-[24rem]:row-start-4', '@max-[24rem]:justify-self-start']));
      expect(cls(price)).not.toContain('col-span-2');
      expect(cls(book)).toEqual(expect.arrayContaining(['row-start-4', '@max-[24rem]:row-start-5']));
      const chip = klass.querySelector('span');
      if (chip) {
        expect(cls(chip)).toContain('max-w-full');
        expect(chip.querySelector('.truncate')).not.toBeNull();
      }
    }
    expect(rows[0].textContent).toContain('Super Eksekutif');
    // Tablet & layar lebar: tabel asli bergulir di wadahnya sendiri bila teks CMS panjang (tidak melebarkan halaman)
    expect(cls(schedule.querySelector('table')!.parentElement!)).toContain('@3xl:overflow-x-auto');
  });

  it('"Lewati animasi" di pita kosong paling atas section (8px), bukan di atas label & H2 film; scroll-margin di bawah header lengket', () => {
    const film = section(demo(), 'film');
    const skip = within(film).getByRole('link', { name: 'Lewati animasi' });
    expect(cls(skip)).toEqual(expect.arrayContaining(['sr-only', 'left-5', 'top-2', '@2xl:left-8', '@5xl:left-12', '@min-[96rem]:left-16', 'scroll-mt-[calc(var(--tpl-sticky-top,0px)+96px)]', 'focus:not-sr-only', 'focus:absolute']));
    expect(skip.className).not.toContain('focus:top-24');
  });

  it('papan keberangkatan: lajur kanan 44px di tablet (label kelas tidak di bawah tombol WhatsApp situs); footer: tagline berhenti di kiri tombol WhatsApp di semua lebar', () => {
    const container = demo();
    const board = within(section(container, 'hero')).getAllByRole('list').find((ul) => ul.getAttribute('aria-label')?.toLowerCase().includes('berangkat'))!;
    expect(cls(board)).toEqual(expect.arrayContaining(['@3xl:pr-11', '@5xl:pr-0']));
    const footer = container.querySelector('footer')!;
    const bottom = Array.from(footer.querySelectorAll('p')).find((p) => p.textContent?.startsWith('©'))!.parentElement!;
    expect(cls(bottom)).toEqual(expect.arrayContaining(['pr-13', '@xl:pr-19', '@2xl:pr-16', '@3xl:pr-[72px]']));
  });
});
