// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/kemudi.test.tsx
// Kemudi (rental mobil lepas kunci & dengan sopir, batch travel & transport 2026-10-29): skema CMS & konten demo, foto,
// salinan jujur (pemesanan hanya menyusun pesan WhatsApp, tanpa pembayaran online, dokumen tidak diunggah, tanpa merek/
// tipe mobil, tanpa klaim izin/asuransi), helper model (warna tema, menu, tujuan tautan, harga, armada & saringan kelas,
// HITUNG SEWA blok 24/12 jam & dengan sopir, tanggal & validasi dengan "hari ini" yang disuntikkan, pesan WhatsApp, film:
// progres gulir, bab, keterangan), demo (urutan section, hero "drive" + kartu pesan, header + menu HP, armada, film statis,
// tabel harga, tab syarat, zona antar, langkah, ulasan, akordeon, kontak, footer), wadah PENUH, film dengan gerak menyala
// (pendengar gulir dipasang & dilepas), datar tanpa bayangan, gerak bergerbang data-tpl-motion, warna tema, SEO situs
// pembeli, judul & gambar & tautan, konten opsional kosong, editor CMS, data katalog (migrasi 052 + pratinjau + halaman
// katalog), dan konten aneh.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionEditor } from '../../pages/account/cms/SectionEditor';
import { validateContent } from '../../pages/account/cms/validation';
import { seo as catalogSeo, page as catalogPage } from '../../content/templates/kemudi';
import { content as catalogContent } from '../../content/templates/kemudi.content';
import { TEMPLATES, resolveContent } from '../index';
import { FILM_CALLOUTS, FILM_H, FILM_W, MAP_SLOTS } from '../kemudi/geometry';
import { docIcon, stepIcon } from '../kemudi/icons';
import {
  CALLOUT_SPAN,
  FILM_PHASES,
  GRAPHITE,
  GREY,
  HOURS,
  MAX_DAYS,
  NBSP,
  PAGE_SECTIONS,
  bodyKind,
  bookingMessage,
  bookingMinutes,
  calloutWindows,
  carLabel,
  carSpecs,
  chapterAt,
  chapterWindows,
  checkCount,
  defaultBooking,
  displayPhone,
  durationLabel,
  filmProgress,
  filterFleet,
  firstCar,
  fleetClasses,
  fleetCount,
  formatLongDate,
  formatPriceShort,
  formatRupiah,
  formatShortDate,
  hoursLabel,
  isoDate,
  kemudiVars,
  navItems,
  nowStamp,
  parsePrice,
  pricedFor,
  quoteRental,
  ratingOf,
  readFleet,
  readKemudi,
  readZones,
  sectionIndex,
  sectionShown,
  sectionTarget,
  stamp,
  supports,
  unpriced,
  validateBooking,
  withCar,
  withMode,
  type Booking,
} from '../kemudi/model';
import { KEMUDI_PHOTOS } from '../kemudi/photos';
import { WRAP } from '../kemudi/styles';
import { applySiteHead, siteTitle } from '../siteHead';
import { SiteRenderer } from '../SiteRenderer';
import { contrast, parseHex } from '../shared/utils';
import { isListField, type SiteContent } from '../types';

// Demo panjang + getByRole di jsdom: bisa lewat 5 dtk saat suite berjalan paralel
vi.setConfig({ testTimeout: 30_000 });

const ROOT = process.cwd();
const def = TEMPLATES.kemudi;
const ORDER = ['hero', 'fleet', 'film', 'pricing', 'requirements', 'delivery', 'steps', 'testimonials', 'faq', 'contact'];
const sectionKeys = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-tpl-section]')).map((s) => s.getAttribute('data-tpl-section'));
const section = (root: HTMLElement, key: string) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`)!;
// Demo seperti situs live (gerak menyala: setup uji menyediakan IntersectionObserver tiruan yang tidak pernah memicu)
const demo = (content: unknown = null, preview = false) => render(<SiteRenderer templateCode="kemudi" content={content} preview={preview} />).container;
/** Demo dengan gerak MATI (sama dengan kurangi gerak / pratinjau): film = storyboard statis, peta & garis utuh. */
const still = (content: unknown = null) => render(<SiteRenderer templateCode="kemudi" content={content} motion={false} />).container;
const rgb = (hex: string) => parseHex(hex)!;
const publicFile = (url: string) => resolve(ROOT, 'public', url.replace(/^\//, ''));
const rootStyle = (container: HTMLElement, name: string) => {
  const holder = Array.from(container.querySelectorAll<HTMLElement>('[style]')).find((el) => el.style.getPropertyValue(name));
  return holder?.style.getPropertyValue(name) ?? '';
};
const urls = (src: string) => {
  const asset = KEMUDI_PHOTOS.asset(src)!;
  return [asset.src, ...asset.srcSet!.split(',').map((part) => part.trim().split(' ')[0])].filter((u, i, all) => all.indexOf(u) === i);
};
/** Spasi tak terputus → spasi biasa (harga "Rp1,1 jt" memakai NBSP agar tidak terbelah). */
const plain = (s: string | null | undefined) => (s ?? '').split(NBSP).join(' ');
const wait = (ms: number) => act(() => new Promise<void>((r) => setTimeout(r, ms)));
const decode = (a: Element) => decodeURIComponent(a.getAttribute('href') ?? '');
const WA = 'https://wa.me/6281234567890?text=';
/** "Sekarang" tetap untuk kartu pesan: Kamis 29 Oktober 2026 pukul 10.00 (jam dinding lokal). */
const NOW = new Date(2026, 9, 29, 10, 0);
const DEMO = resolveContent(def, null);
const CARS = readFleet(DEMO.fleet);
const car = (name: string) => CARS.find((c) => c.name === name)!;
const booking = (patch: Partial<Booking> = {}): Booking => ({ ...defaultBooking(CARS, NOW), ...patch });
const TSX = ['Kemudi', 'Header', 'Hero', 'Fleet', 'Film', 'Pricing', 'Requirements', 'Delivery', 'Steps', 'Closing', 'Footer', 'ui', 'marks', 'vehicles', 'scenes'];
const TS = ['index', 'styles', 'model', 'icons', 'hooks', 'schema', 'defaultContent', 'photos', 'geometry'];
const source = () =>
  [
    ...TSX.map((f) => readFileSync(resolve(ROOT, `src/templates/kemudi/${f}.tsx`), 'utf8')),
    ...TS.map((f) => readFileSync(resolve(ROOT, `src/templates/kemudi/${f}.ts`), 'utf8')),
    readFileSync(resolve(ROOT, 'src/templates/kemudi/kemudi.css'), 'utf8'),
  ].join('\n');
const css = () => readFileSync(resolve(ROOT, 'src/templates/kemudi/kemudi.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

let scrolled: (string | null)[] = [];
beforeEach(() => {
  scrolled = [];
  Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
    scrolled.push(this.getAttribute('data-tpl-section'));
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Kemudi: skema & konten bawaan', () => {
  it('urutan form = urutan halaman, semua section bisa disembunyikan, field unik, teks berbatas, list berbatas', () => {
    expect(def.code).toBe('kemudi');
    expect(def.name).toBe('Kemudi');
    expect(def.features).toBeUndefined();
    expect(def.sections.map((s) => s.key)).toEqual(['brand', ...ORDER, 'footer']);
    expect([...PAGE_SECTIONS]).toEqual([...ORDER, 'footer']);
    const fields = (key: string) => def.sections.find((s) => s.key === key)!.fields.map((f) => f.key);
    expect(fields('brand')).toEqual(['company_name', 'tagline', 'logo', 'accent_color']);
    expect(def.sections[0].fields.find((f) => f.key === 'accent_color')?.type).toBe('color');
    expect(fields('hero')).toEqual(['eyebrow', 'title', 'highlight', 'subtitle', 'image', 'link_label', 'card_title', 'button_label', 'card_note', 'header_label', 'header_url']);
    expect(fields('fleet')).toEqual(['eyebrow', 'title', 'subtitle', 'book_label', 'price_note', 'items']);
    expect(fields('film')).toEqual(['eyebrow', 'title', 'subtitle', 'car_label', 'chapters', 'callouts', 'final_title', 'final_text']);
    expect(fields('pricing')).toEqual(['eyebrow', 'title', 'subtitle', 'note', 'image', 'included_title', 'included']);
    expect(fields('requirements')).toEqual(['eyebrow', 'title', 'subtitle', 'self_label', 'self_image', 'self_docs', 'self_rules', 'driver_label', 'driver_image', 'driver_docs', 'driver_rules', 'note']);
    expect(fields('delivery')).toEqual(['eyebrow', 'title', 'subtitle', 'garage_label', 'note', 'zones']);
    expect(fields('steps')).toEqual(['eyebrow', 'title', 'subtitle', 'items']);
    expect(fields('testimonials')).toEqual(['eyebrow', 'title', 'subtitle', 'image', 'items']);
    expect(fields('faq')).toEqual(['eyebrow', 'title', 'subtitle', 'link_label', 'link_url', 'image', 'image_caption', 'items']);
    expect(fields('contact')).toEqual(['eyebrow', 'title', 'subtitle', 'address', 'maps_query', 'maps_url', 'phone', 'email', 'whatsapp', 'whatsapp_message', 'hours']);
    expect(fields('footer')).toEqual(['cta_title', 'cta_label', 'description', 'note', 'copyright', 'instagram', 'facebook', 'linkedin', 'youtube', 'tiktok']);
    const contact = def.sections.find((s) => s.key === 'contact')!;
    expect(contact.fields.find((f) => f.key === 'whatsapp')?.type).toBe('phone');
    expect(contact.fields.find((f) => f.key === 'phone')?.type).toBe('phone');
    expect(contact.fields.find((f) => f.key === 'email')?.type).toBe('email');
    // Hero: foto latar bernama `image` (dibaca tes bersama new-templates)
    expect(def.sections.find((s) => s.key === 'hero')!.fields.find((f) => f.key === 'image')?.type).toBe('image');
    const items = def.sections.find((s) => s.key === 'fleet')!.fields.find((f) => f.key === 'items');
    expect(isListField(items!) && items.fields.map((f) => f.key)).toEqual([
      'name',
      'class',
      'seats',
      'transmission',
      'fuel',
      'luggage',
      'price_12',
      'price_24',
      'price_driver',
      'price_out',
      'image',
    ]);
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
    // Batas yang disebut di halaman katalog (kemudi.content.ts)
    expect(max).toEqual({
      'fleet.items': 12,
      'film.chapters': 4,
      'film.callouts': 4,
      'pricing.included': 6,
      'requirements.self_docs': 6,
      'requirements.self_rules': 6,
      'requirements.driver_docs': 6,
      'requirements.driver_rules': 6,
      'delivery.zones': 6,
      'steps.items': 5,
      'testimonials.items': 6,
      'faq.items': 8,
    });
    const page = JSON.stringify(catalogContent);
    for (const phrase of ['Hingga 12 kartu mobil', 'hingga 4 keterangan', 'Hingga 4 tahap', 'hingga 6 butir', 'hingga 6 dokumen', 'hingga 6 aturan', 'Hingga 6 zona', 'Hingga 5 langkah', 'hingga 6 ulasan', 'Hingga 8 pertanyaan']) {
      expect(page, phrase).toContain(phrase);
    }
  });

  it('konten demo lolos validasi CMS, logo kosong, semua foto terdaftar, ada di public/, dipakai, dan beralt deskriptif', () => {
    const c = def.defaultContent;
    expect(validateContent(def, resolveContent(def, null))).toEqual({});
    expect(c.brand.logo).toBe('');
    expect(c.brand.company_name).toBe('Kemudi Rent Car');
    expect(c.brand.tagline).toBe('Rental mobil lepas kunci & dengan sopir');
    expect(c.brand.accent_color).toBe('#0050FF');
    expect(c.contact.whatsapp).toBe('081234567890');
    expect(c.contact.phone).toBe('081234567890');
    expect(c.hero.image).toBe('/assets/templates/photos/kemudi-hero-1920.webp');
    for (const s of def.sections) if (s.key !== 'brand') expect(c[s.key].enabled, s.key).toBe(true);
    const photos = JSON.stringify(c).match(/\/assets\/templates\/photos\/[a-z0-9-]+\.webp/g) ?? [];
    for (const src of photos) expect(KEMUDI_PHOTOS.asset(src), src).not.toBeNull();
    expect(KEMUDI_PHOTOS.keys).toHaveLength(10);
    for (const key of KEMUDI_PHOTOS.keys) {
      expect(key.startsWith('kemudi-'), key).toBe(true);
      for (const url of urls(KEMUDI_PHOTOS.src(key))) expect(existsSync(publicFile(url)), url).toBe(true);
      expect(photos, `${key} dipakai di konten demo`).toContain(KEMUDI_PHOTOS.src(key));
      expect(KEMUDI_PHOTOS.alt(KEMUDI_PHOTOS.src(key), '').split(' ').length, key).toBeGreaterThanOrEqual(5);
    }
    // Simbol bawaan juga tersedia sebagai SVG mandiri, path sama dengan komponen
    const mark = readFileSync(publicFile('/assets/templates/logos/kemudi-mark.svg'), 'utf8');
    const component = readFileSync(resolve(ROOT, 'src/templates/kemudi/marks.tsx'), 'utf8');
    const paths = mark.match(/ d="[^"]+"/g) ?? [];
    expect(paths).toHaveLength(2);
    for (const d of paths) expect(component, d).toContain(d.trim());
    expect(mark).toMatch(/viewBox="0 0 32 32"/);
    expect(mark).toMatch(/role="img"/);
    expect(mark).toMatch(/<title>/);
    expect(mark).toContain('fill-rule="evenodd"');
    expect(component).toContain('fillRule="evenodd"');
    // Hero sederhana: judul tab ≤ 60, label ≤ 60, H1 ≤ 8 kata, kalimat 120–140 huruf (juga deskripsi Google)
    expect(`${c.brand.company_name} — ${c.brand.tagline}`.length).toBeLessThanOrEqual(60);
    expect(String(c.hero.eyebrow).length).toBeLessThanOrEqual(60);
    expect(String(c.hero.title).split(' ').length).toBeLessThanOrEqual(8);
    expect(String(c.hero.title)).toContain(String(c.hero.highlight));
    expect(String(c.hero.subtitle).length).toBeGreaterThanOrEqual(120);
    expect(String(c.hero.subtitle).length).toBeLessThanOrEqual(140);
    // Kepala section: judul ≤ 8 kata, satu kalimat pengantar ≤ 110 huruf; kartu ≤ 120 huruf (owner: "teks jangan keramaian")
    for (const key of ORDER.filter((k) => k !== 'hero')) {
      expect(String(c[key].title).split(' ').length, key).toBeLessThanOrEqual(8);
      expect(String(c[key].subtitle ?? '').length, key).toBeLessThanOrEqual(110);
    }
    for (const t of c.testimonials.items as { quote: string }[]) expect(t.quote.length).toBeLessThanOrEqual(120);
    for (const d of [...(c.requirements.self_docs as { text: string }[]), ...(c.requirements.driver_docs as { text: string }[])]) expect(d.text.length).toBeLessThanOrEqual(120);
    for (const s of c.steps.items as { text: string }[]) expect(s.text.length).toBeLessThanOrEqual(120);
    // Angka di salinan = data: enam mobil dari lima kelas, empat tahap, empat langkah, minibus 14 kursi
    expect(CARS).toHaveLength(6);
    expect(fleetClasses(CARS)).toHaveLength(5);
    expect(String(c.fleet.subtitle)).toMatch(/^Enam mobil dari lima kelas/);
    expect(c.film.chapters as unknown[]).toHaveLength(4);
    expect(String(c.film.subtitle)).toContain('empat tahap');
    expect(c.steps.items as unknown[]).toHaveLength(4);
    expect(String(c.steps.title)).toMatch(/^Empat langkah/);
    expect(car('Minibus').seats).toBe('14');
    expect(String(c.footer.description)).toContain('minibus 14 kursi');
  });

  // CREDITS.md gets this template's section at integration
  it('setiap kunci foto tercatat di CREDITS.md', () => {
    const credits = readFileSync(resolve(ROOT, 'public/assets/templates/photos/CREDITS.md'), 'utf8');
    expect(KEMUDI_PHOTOS.keys.filter((key) => !credits.includes(`\`${key}-*\``))).toEqual([]);
  });

  it('foto demo ringan: hero 800/1280/1920, WebP ≤ 140 KB per file (800w ≤ 90 KB), total ≤ 2,5 MB', () => {
    expect(KEMUDI_PHOTOS.asset(def.defaultContent.hero.image as string)!.srcSet).toBe(
      '/assets/templates/photos/kemudi-hero-800.webp 800w, /assets/templates/photos/kemudi-hero-1280.webp 1280w, /assets/templates/photos/kemudi-hero-1920.webp 1920w',
    );
    let total = 0;
    for (const key of KEMUDI_PHOTOS.keys) {
      for (const url of urls(KEMUDI_PHOTOS.src(key))) {
        expect(url, url).toMatch(/\.webp$/);
        const kb = statSync(publicFile(url)).size / 1024;
        expect(kb, url).toBeLessThanOrEqual(url.endsWith('-800.webp') ? 90 : 140);
        expect(readFileSync(publicFile(url)).toString('ascii', 8, 12), url).toBe('WEBP');
        total += kb;
      }
    }
    expect(total).toBeLessThanOrEqual(2500);
  });

  it('salinan demo jujur: tanpa merek/tipe mobil, tanpa klaim izin/asuransi/janji; formulir hanya menyusun pesan WhatsApp', () => {
    const text = JSON.stringify(def.defaultContent);
    expect(text).not.toMatch(/dijamin|garansi|pasti |terbaik|nomor 1|termurah|#1|100%|paling aman|anti telat/i);
    expect(text).not.toMatch(/izin trayek|berizin|terdaftar resmi|Kemenhub|Dishub|ASITA|IPOMI|PAWIBA|uji KIR|\bISO\b|asuransi|Jasa Raharja|bersertifikat|sertifikat/i);
    expect(text).not.toMatch(
      /\b(Toyota|Avanza|Innova|Hi-?Ace|Alphard|Vellfire|Pajero|Fortuner|Xpander|Ertiga|Brio|Agya|Ayla|Calya|Sigra|Terios|Rush|Elf|Hino|Scania|Volvo|Mercedes|Isuzu|Mitsubishi|Suzuki|Honda|Daihatsu|Nissan|Hyundai|Wuling|Kia|BMW|Lexus)\b/i,
    );
    expect(text).not.toMatch(/GPS|real-?time|e-?tiket|bayar online/i);
    // Kalimat "tidak melakukan" yang dikunci
    expect(def.defaultContent.hero.card_note).toBe('Harga perkiraan; ketersediaan dikonfirmasi admin. Tidak ada pembayaran online.');
    expect(def.defaultContent.requirements.note).toBe('Dokumen dicek langsung saat serah terima; website tidak mengunggah atau menyimpan dokumen Anda.');
    expect(def.defaultContent.pricing.note).toBe('Harga contoh; lepas kunci belum termasuk BBM, tol, parkir. Harga final dikonfirmasi admin.');
    expect(text).toContain('Website ini tidak menerima pembayaran online.');
    expect(text).toContain('biaya antar dikonfirmasi admin');
    expect(text).toContain('@example.com');
    expect(text).not.toMatch(/@(gmail|yahoo)\./);
    // Mobil = KELAS ("atau setara" ditambahkan otomatis), pelanggan tanpa foto wajah (inisial)
    expect(CARS.map((c) => c.name)).toEqual(['City car', 'MPV keluarga', 'MPV hemat', 'SUV', 'MPV premium', 'Minibus']);
    expect(JSON.stringify(def.defaultContent.testimonials.items)).not.toMatch(/\.webp/);
  });
});

describe('Kemudi: helper model', () => {
  it('warna tema: teks aksen ≥ 4,5:1 di abu & putih, aksen terang ≥ 4,5:1 di grafit, untuk aksen apa pun; tidak valid → bawaan', () => {
    expect(kemudiVars('#0050FF')).toMatchObject({ '--km-ink': '#0050ff', '--km-bright': '#4780ff' });
    for (const accent of ['#0050FF', '#2FB2FF', '#FFB703', '#D81E5B', '#277A36', '#B5446E', '#C6F135', '#F4C534', '#FFFFFF', '#000000', '#161B22', '#7C3AED', '#12A07F', '#6EE7B7']) {
      const vars = kemudiVars(accent) as Record<string, string>;
      const ink = rgb(vars['--km-ink']);
      const bright = rgb(vars['--km-bright']);
      expect(contrast(ink, GREY), accent).toBeGreaterThanOrEqual(4.5);
      expect(contrast(ink, [255, 255, 255]), accent).toBeGreaterThanOrEqual(4.5);
      expect(contrast(bright, GRAPHITE), accent).toBeGreaterThanOrEqual(4.5);
      for (const name of ['--km-body-hi', '--km-body-lo']) expect(vars[name], `${accent} ${name}`).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(kemudiVars('zzz')).toEqual(kemudiVars('#0050FF'));
    expect(kemudiVars('')).toEqual(kemudiVars('#0050FF'));
  });

  it('section tampil hanya bila berisi; nomor label urut di antara section yang tampil', () => {
    for (const key of [...ORDER, 'footer']) expect(sectionShown(DEMO, key), key).toBe(true);
    expect(sectionShown(DEMO, 'brand')).toBe(false);
    expect(sectionShown(DEMO, 'tidak-ada')).toBe(false);
    const empty = resolveContent(def, {
      fleet: { items: [{ class: 'MPV', price_24: '450000' }] },
      film: { chapters: [{ text: 'tanpa nama' }] },
      requirements: { self_docs: [{ text: 'tanpa judul' }], self_rules: [], driver_docs: [], driver_rules: [] },
      delivery: { zones: [{ fee: 'Gratis' }] },
      steps: { items: [{ text: 'tanpa judul' }] },
      testimonials: { items: [{ name: 'tanpa kutipan' }] },
      faq: { items: [{ answer: 'tanpa pertanyaan' }] },
    });
    for (const key of ['fleet', 'film', 'pricing', 'requirements', 'delivery', 'steps', 'testimonials', 'faq']) expect(sectionShown(empty, key), key).toBe(false);
    // Hero, kontak, footer tampil selama diaktifkan
    for (const key of ['hero', 'contact', 'footer']) expect(sectionShown(empty, key), key).toBe(true);
    expect(sectionShown(resolveContent(def, { contact: { enabled: false } }), 'contact')).toBe(false);
    // Harga tetap tampil walau section armada disembunyikan (data mobil tetap dipakai tabel & kartu pesan)
    expect(sectionShown(resolveContent(def, { fleet: { enabled: false } }), 'pricing')).toBe(true);
    expect(ORDER.map((key) => sectionIndex(DEMO, key))).toEqual(['', '01', '02', '03', '04', '05', '06', '07', '08', '09']);
    expect(sectionIndex(DEMO, 'footer')).toBe('');
    const noFilm = resolveContent(def, { film: { enabled: false } });
    expect(sectionIndex(noFilm, 'pricing')).toBe('02');
    expect(sectionIndex(noFilm, 'film')).toBe('');
  });

  it('menu: 6 kata benda pendek, section kosong/tersembunyi keluar dari menu', () => {
    expect(navItems(DEMO).map((i) => `${i.key}:${i.label}`)).toEqual(['fleet:Mobil', 'pricing:Harga', 'requirements:Syarat', 'steps:Cara Sewa', 'faq:FAQ', 'contact:Kontak']);
    const less = resolveContent(def, { faq: { enabled: false }, steps: { items: [] }, fleet: { items: [] } });
    // Tanpa mobil → tanpa "Mobil" dan tanpa tabel "Harga"
    expect(navItems(less).map((i) => i.key)).toEqual(['requirements', 'contact']);
  });

  it('tujuan tautan: anchor Indonesia dan kunci section; anchor tak dikenal → null; tujuan tombol menu atas', () => {
    expect(sectionTarget('#mobil')).toBe('fleet');
    expect(sectionTarget('#armada')).toBe('fleet');
    expect(sectionTarget('pesan')).toBe('hero');
    expect(sectionTarget('#beranda')).toBe('hero');
    expect(sectionTarget('#proses')).toBe('film');
    expect(sectionTarget('#harga')).toBe('pricing');
    expect(sectionTarget('#tarif')).toBe('pricing');
    expect(sectionTarget('#syarat')).toBe('requirements');
    expect(sectionTarget('#antar-jemput')).toBe('delivery');
    expect(sectionTarget('#zona')).toBe('delivery');
    expect(sectionTarget('#cara-sewa')).toBe('steps');
    expect(sectionTarget('#ulasan')).toBe('testimonials');
    expect(sectionTarget('#testimoni')).toBe('testimonials');
    expect(sectionTarget('#tanya-jawab')).toBe('faq');
    expect(sectionTarget('#kontak')).toBe('contact');
    expect(sectionTarget('#garasi')).toBe('contact');
    expect(sectionTarget('#tidak-ada')).toBeNull();
    const m = readKemudi(DEMO);
    // "Pesan Mobil" → kartu pesan di hero
    expect(m.headerAction).toEqual({ kind: 'section', target: 'hero' });
    expect(m.linkOr('#mobil', null)).toEqual({ kind: 'section', target: 'fleet' });
    expect(m.linkOr('#tidak-ada', m.bookAction)).toEqual({ kind: 'section', target: 'hero' });
    expect(m.linkOr('https://contoh.test/syarat', null)).toEqual({ kind: 'external', href: 'https://contoh.test/syarat' });
    expect(m.linkOr('javascript:alert(1)', null)).toBeNull();
    expect(readKemudi(resolveContent(def, { hero: { enabled: false } })).headerAction).toEqual({ kind: 'section', target: 'contact' });
    expect(readKemudi(resolveContent(def, { hero: { enabled: false }, contact: { enabled: false } })).headerAction?.kind).toBe('external');
    expect(readKemudi(resolveContent(def, { hero: { enabled: false }, contact: { enabled: false, whatsapp: '' } })).headerAction).toBeNull();
    expect(readKemudi(resolveContent(def, { hero: { header_url: '#harga' } })).headerAction).toEqual({ kind: 'section', target: 'pricing' });
    // Tanpa mobil: kartu pesan tidak dirender → "Pesan Mobil" (juga tautan #harga yang tidak tampil) menuju Kontak
    expect(readKemudi(resolveContent(def, { hero: { header_url: '#harga' }, fleet: { items: [] } })).headerAction).toEqual({ kind: 'section', target: 'contact' });
    expect(readKemudi(resolveContent(def, { fleet: { items: [] } })).headerAction).toEqual({ kind: 'section', target: 'contact' });
    expect(readKemudi(resolveContent(def, { fleet: { items: [] }, contact: { enabled: false } })).headerAction?.kind).toBe('external');
  });

  it('harga: baca angka biasa / bersatuan, tulis singkat "Rp450rb" / "Rp1,1 jt" dan penuh "Rp450.000"', () => {
    expect(parsePrice('450000')).toBe(450_000);
    expect(parsePrice('Rp450.000')).toBe(450_000);
    expect(parsePrice('Rp 450.000,-')).toBe(450_000);
    expect(parsePrice('Rp450.000,00')).toBe(450_000);
    expect(parsePrice('450rb')).toBe(450_000);
    expect(parsePrice('450 ribu')).toBe(450_000);
    expect(parsePrice('450k')).toBe(450_000);
    expect(parsePrice('1,1 jt')).toBe(1_100_000);
    expect(parsePrice('Rp1,25 jt')).toBe(1_250_000);
    expect(parsePrice('1.5 juta')).toBe(1_500_000);
    expect(parsePrice(12345)).toBe(12345);
    expect(parsePrice('')).toBe(0);
    expect(parsePrice('Hubungi admin')).toBe(0);
    expect(parsePrice(null)).toBe(0);
    expect(parsePrice('9'.repeat(30))).toBe(999_999_999_999);
    // Hanya angka pertama dibaca; teks sesudahnya (satuan waktu, "per hari") diabaikan, angka lain tidak digabung
    expect(parsePrice('450rb/hari')).toBe(450_000);
    expect(parsePrice('450rb / 24 jam')).toBe(450_000);
    expect(parsePrice('450 ribu per hari')).toBe(450_000);
    expect(parsePrice('Rp 1,1 jt/hari')).toBe(1_100_000);
    expect(parsePrice('Rp450.000 / 24 jam')).toBe(450_000);
    expect(parsePrice('450.000/hari')).toBe(450_000);
    expect(parsePrice('mulai Rp 350.000')).toBe(350_000);
    expect(parsePrice('Rp 450.000 - 500.000')).toBe(450_000);
    expect(parsePrice('450 000')).toBe(450_000);
    expect(parsePrice('450000 24 jam')).toBe(450_000);
    expect(parsePrice('450 km')).toBe(450);
    expect(formatPriceShort(325_000)).toBe('Rp325rb');
    expect(formatPriceShort(450_000)).toBe('Rp450rb');
    expect(formatPriceShort(1_100_000)).toBe(`Rp1,1${NBSP}jt`);
    expect(plain(formatPriceShort(1_250_000))).toBe('Rp1,25 jt');
    expect(plain(formatPriceShort(1_000_000))).toBe('Rp1 jt');
    expect(formatPriceShort(999)).toBe('Rp999');
    expect(formatPriceShort(1500)).toBe('Rp1.500');
    expect(formatPriceShort(0)).toBe('');
    expect(formatPriceShort(-5)).toBe('');
    expect(formatPriceShort(Number.NaN)).toBe('');
    expect(formatRupiah(1_950_000)).toBe('Rp1.950.000');
    expect(formatRupiah(0)).toBe('Rp0');
  });

  it('armada: kelas bodi dari teks kelas (lalu nama), layanan per mobil, label & chip spesifikasi, saringan kelas', () => {
    // Dua MPV di demo tidak kembar: "MPV hemat" (kelas MPV) → siluet MPV ringkas
    expect(CARS.map((c) => c.kind)).toEqual(['city', 'mpv', 'mpv-compact', 'suv', 'premium', 'minibus']);
    expect(bodyKind('MPV', 'MPV hemat')).toBe('mpv-compact');
    expect(bodyKind('MPV', 'MPV keluarga')).toBe('mpv');
    expect(bodyKind('Compact MPV')).toBe('mpv-compact');
    expect(bodyKind('Low MPV')).toBe('mpv-compact');
    expect(bodyKind('City car', 'City car hemat')).toBe('city');
    expect(bodyKind('Hatchback')).toBe('city');
    expect(bodyKind('LCGC')).toBe('city');
    expect(bodyKind('Microbus 15 kursi')).toBe('minibus');
    expect(bodyKind('Van besar')).toBe('minibus');
    expect(bodyKind('Double cabin')).toBe('suv');
    expect(bodyKind('MPV premium')).toBe('premium');
    expect(bodyKind('', 'Sedan eksekutif')).toBe('premium');
    expect(bodyKind('', '')).toBe('mpv');
    expect(bodyKind('Truk')).toBe('mpv');
    expect(car('Minibus')).toMatchObject({ p12: 0, p24: 0, driver: 1_250_000, out: '+Rp150.000/hari' });
    expect(supports(car('Minibus'), 'self')).toBe(false);
    expect(supports(car('Minibus'), 'driver')).toBe(true);
    expect(supports(car('City car'), 'self')).toBe(true);
    expect(supports(undefined, 'self')).toBe(false);
    // Kolom harga 24 jam & sopir kosong = "harga via admin": boleh di kedua layanan, tanpa perkiraan
    const askAdmin = { ...car('SUV'), p12: 0, p24: 0, driver: 0 };
    expect(unpriced(askAdmin)).toBe(true);
    expect(unpriced(car('Minibus'))).toBe(false);
    expect([supports(askAdmin, 'self'), supports(askAdmin, 'driver')]).toEqual([true, true]);
    expect([pricedFor(askAdmin, 'self'), pricedFor(car('Minibus'), 'driver'), pricedFor(car('Minibus'), 'self')]).toEqual([false, true, false]);
    expect(quoteRental(askAdmin, 'self', 2880)).toBeNull();
    expect(validateBooking({ ...booking(), car: 3 }, [askAdmin], NOW)).toEqual({});
    expect(carLabel(car('MPV keluarga'))).toBe('MPV keluarga, 7 kursi');
    expect(carLabel({ ...car('Minibus'), name: 'Minibus 14 kursi' })).toBe('Minibus 14 kursi');
    expect(carSpecs(car('City car')).map((s) => s.label)).toEqual(['5 kursi', 'Otomatis', 'Bensin', '2 koper']);
    expect(carSpecs({ ...car('SUV'), seats: '', luggage: '3 (koper)' }).map((s) => s.label)).toEqual(['Otomatis', 'Diesel', '3 (koper)']);
    expect(fleetClasses(CARS)).toEqual([
      { label: 'City car', count: 1 },
      { label: 'MPV', count: 2 },
      { label: 'SUV', count: 1 },
      { label: 'MPV premium', count: 1 },
      { label: 'Minibus', count: 1 },
    ]);
    expect(filterFleet(CARS, 'mpv').map((c) => c.name)).toEqual(['MPV keluarga', 'MPV hemat']);
    expect(filterFleet(CARS, ' MPV Premium ').map((c) => c.name)).toEqual(['MPV premium']);
    expect(filterFleet(CARS, '')).toHaveLength(6);
    expect(filterFleet(CARS, 'Bus')).toEqual([]);
    expect(fleetCount(6)).toBe('6 mobil');
    expect(fleetCount(0)).toBe('Tidak ada mobil di kelas ini');
    // Mobil pertama per layanan (utamakan MPV) dan ganti layanan / mobil
    expect(firstCar(CARS, 'self')).toBe(1);
    expect(firstCar(CARS, 'driver')).toBe(1);
    expect(firstCar([car('Minibus')], 'self')).toBe(-1);
    const b = booking();
    expect(withMode(b, 'driver', CARS)).toEqual({ ...b, mode: 'driver' });
    const minibus = withCar(b, 5, CARS);
    expect(minibus).toEqual({ ...b, car: 5, mode: 'driver' });
    expect(withMode(minibus, 'self', CARS)).toEqual({ ...b, car: 1, mode: 'self' });
    expect(withCar(b, 3, CARS)).toEqual({ ...b, car: 3 });
    expect(withCar(b, 99, CARS)).toBe(b);
  });

  it('hitung sewa: blok 24 jam, blok terakhir ≤ 12 jam memakai harga 12 jam (bila lebih murah), dengan sopir per blok 12 jam', () => {
    const mpv = car('MPV keluarga');
    expect(quoteRental(mpv, 'self', 2880)).toEqual({
      mode: 'self',
      minutes: 2880,
      days: 2,
      full: 2,
      half: false,
      blocks: 0,
      total: 900_000,
      breakdown: '2 hari × Rp450.000',
      duration: '2 hari',
    });
    expect(quoteRental(mpv, 'self', 36 * 60)).toMatchObject({ days: 2, full: 1, half: true, total: 800_000, breakdown: '1 hari × Rp450.000 + 12 jam Rp350.000', duration: '1 hari 12 jam' });
    expect(quoteRental(mpv, 'self', 10 * 60)).toMatchObject({ days: 1, full: 0, half: true, total: 350_000, breakdown: '12 jam Rp350.000', duration: '10 jam' });
    expect(quoteRental(mpv, 'self', 12 * 60)).toMatchObject({ half: true, total: 350_000 });
    expect(quoteRental(mpv, 'self', 12.5 * 60)).toMatchObject({ full: 1, half: false, total: 450_000, breakdown: '1 hari × Rp450.000', duration: '12 jam 30 menit' });
    expect(quoteRental(mpv, 'self', 24 * 60)).toMatchObject({ full: 1, half: false, total: 450_000 });
    expect(quoteRental(mpv, 'self', 25 * 60)).toMatchObject({ days: 2, full: 1, half: true, total: 800_000 });
    // Harga 12 jam tidak lebih murah / kosong → blok terakhir tetap harga 24 jam
    expect(quoteRental({ ...mpv, p12: 500_000 }, 'self', 10 * 60)).toMatchObject({ half: false, total: 450_000, breakdown: '1 hari × Rp450.000' });
    expect(quoteRental({ ...mpv, p12: 0 }, 'self', 36 * 60)).toMatchObject({ half: false, total: 900_000 });
    // Dengan sopir: blok 12 jam × harga sopir
    expect(quoteRental(mpv, 'driver', 10 * 60)).toMatchObject({ blocks: 1, total: 650_000, breakdown: '1 blok 12 jam × Rp650.000' });
    expect(quoteRental(mpv, 'driver', 13 * 60)).toMatchObject({ blocks: 2, total: 1_300_000, breakdown: '2 blok 12 jam × Rp650.000' });
    expect(quoteRental(mpv, 'driver', 36 * 60)).toMatchObject({ blocks: 3, total: 1_950_000 });
    expect(quoteRental(car('Minibus'), 'driver', 48 * 60)).toMatchObject({ blocks: 4, total: 5_000_000 });
    // Layanan tidak tersedia / durasi tidak masuk akal → tanpa perkiraan
    expect(quoteRental(car('Minibus'), 'self', 2880)).toBeNull();
    expect(quoteRental(mpv, 'self', 0)).toBeNull();
    expect(quoteRental(mpv, 'self', -60)).toBeNull();
    expect(quoteRental(mpv, 'self', Number.NaN)).toBeNull();
    expect(quoteRental(undefined, 'self', 600)).toBeNull();
    expect(durationLabel(630)).toBe('10 jam 30 menit');
    expect(durationLabel(1441)).toBe('1 hari 1 menit');
    expect(durationLabel(0)).toBe('0 jam');
    expect(hoursLabel(2880)).toBe('48 jam');
    expect(hoursLabel(750)).toBe('12,5 jam');
    expect(MAX_DAYS).toBe(30);
  });

  it('tanggal & jam: pilihan jam 06.00–22.00, stempel waktu, tanggal panjang/singkat Indonesia, isian rusak', () => {
    expect(HOURS).toHaveLength(17);
    expect(HOURS[0]).toBe('06.00');
    expect(HOURS[HOURS.length - 1]).toBe('22.00');
    expect(stamp('2026-11-01', '09.00')! - stamp('2026-10-30', '09.00')!).toBe(2880);
    expect(stamp('2026-10-30', '9:30')! - stamp('2026-10-30', '09.00')!).toBe(30);
    expect(stamp('2026-02-30', '09.00')).toBeNull();
    expect(stamp('30/10/2026', '09.00')).toBeNull();
    expect(stamp('2026-10-30', '25.00')).toBeNull();
    expect(stamp('2026-10-30', '')).toBeNull();
    expect(nowStamp(NOW)).toBe(stamp('2026-10-29', '10.00'));
    expect(isoDate(NOW)).toBe('2026-10-29');
    expect(isoDate(new Date(2026, 9, 29, 23, 59), 3)).toBe('2026-11-01');
    expect(isoDate(new Date(2026, 11, 31), 1)).toBe('2027-01-01');
    expect(formatLongDate('2026-10-30')).toBe('Jumat, 30 Oktober 2026');
    expect(formatLongDate('2026-11-01')).toBe('Minggu, 1 November 2026');
    expect(formatLongDate('2024-02-29')).toBe('Kamis, 29 Februari 2024');
    expect(formatLongDate('2026-13-01')).toBe('');
    expect(formatLongDate('')).toBe('');
    expect(formatShortDate('2026-10-30')).toBe('Jum, 30 Okt');
    expect(formatShortDate('x')).toBe('');
  });

  it('formulir pesan: isian awal besok 09.00 → lusa+1 09.00, validasi per isian dengan "sekarang" yang disuntikkan', () => {
    const b = defaultBooking(CARS, NOW);
    expect(b).toEqual({ mode: 'self', car: 1, pickupDate: '2026-10-30', pickupTime: '09.00', returnDate: '2026-11-01', returnTime: '09.00' });
    expect(bookingMinutes(b)).toBe(2880);
    expect(bookingMinutes({ ...b, returnDate: '' })).toBeNull();
    // Hanya mobil dengan sopir → layanan awal "Dengan sopir"; tanpa mobil → car -1
    expect(defaultBooking([car('Minibus')], NOW)).toMatchObject({ mode: 'driver', car: 5 });
    expect(defaultBooking([], NOW)).toMatchObject({ mode: 'self', car: -1 });
    expect(validateBooking(b, CARS, NOW)).toEqual({});
    expect(validateBooking({ ...b, pickupDate: '2026-10-29', pickupTime: '10.00' }, CARS, NOW)).toEqual({});
    expect(validateBooking({ ...b, pickupDate: '2026-10-29', pickupTime: '09.00' }, CARS, NOW)).toEqual({ pickup: 'Waktu ambil sudah lewat.' });
    expect(validateBooking({ ...b, pickupDate: '' }, CARS, NOW)).toEqual({ pickup: 'Pilih tanggal ambil.' });
    expect(validateBooking({ ...b, pickupDate: '2026-02-30' }, CARS, NOW)).toEqual({ pickup: 'Tanggal tidak valid.' });
    expect(validateBooking({ ...b, pickupTime: '' }, CARS, NOW)).toEqual({ pickup: 'Pilih jam ambil.' });
    expect(validateBooking({ ...b, returnDate: '' }, CARS, NOW)).toEqual({ return: 'Pilih tanggal kembali.' });
    expect(validateBooking({ ...b, returnDate: '2026-11-31' }, CARS, NOW)).toEqual({ return: 'Tanggal tidak valid.' });
    expect(validateBooking({ ...b, returnTime: 'x' }, CARS, NOW)).toEqual({ return: 'Pilih jam kembali.' });
    expect(validateBooking({ ...b, returnDate: '2026-10-30', returnTime: '08.00' }, CARS, NOW)).toEqual({ return: 'Waktu kembali harus setelah waktu ambil.' });
    expect(validateBooking({ ...b, returnDate: '2026-10-30', returnTime: '09.00' }, CARS, NOW)).toEqual({ return: 'Waktu kembali harus setelah waktu ambil.' });
    expect(validateBooking({ ...b, returnDate: '2026-10-30', returnTime: '09.30' }, CARS, NOW)).toEqual({ return: 'Minimal sewa 1 jam.' });
    expect(validateBooking({ ...b, returnDate: '2026-10-30', returnTime: '10.00' }, CARS, NOW)).toEqual({});
    expect(validateBooking({ ...b, returnDate: '2026-11-29' }, CARS, NOW)).toEqual({});
    expect(validateBooking({ ...b, returnDate: '2026-11-30' }, CARS, NOW)).toEqual({ return: 'Lebih dari 30 hari? Hubungi admin lewat WhatsApp.' });
    expect(validateBooking({ ...b, car: 99 }, CARS, NOW)).toEqual({ car: 'Pilih mobil.' });
    expect(validateBooking({ ...b, car: 5 }, CARS, NOW)).toEqual({ car: 'Mobil ini khusus dengan sopir.' });
    expect(validateBooking({ ...b, mode: 'driver', car: 1 }, [{ ...car('MPV keluarga'), driver: 0 }], NOW)).toEqual({ car: 'Mobil ini belum tersedia dengan sopir.' });
  });

  it('pesan WhatsApp pemesanan: salam, rincian berurutan, penutup; tanpa perkiraan → tanpa baris durasi & harga', () => {
    const b = defaultBooking(CARS, NOW);
    const mpv = car('MPV keluarga');
    expect(bookingMessage(b, mpv, quoteRental(mpv, 'self', 2880), 'Kemudi Rent Car')).toBe(
      [
        'Halo Kemudi Rent Car, saya ingin sewa mobil.',
        '',
        'Mobil: MPV keluarga, 7 kursi (atau setara)',
        'Layanan: Lepas kunci',
        'Ambil: Jumat, 30 Oktober 2026, 09.00',
        'Kembali: Minggu, 1 November 2026, 09.00',
        'Durasi: 2 hari (48 jam)',
        'Perkiraan harga: Rp900.000 (2 hari × Rp450.000)',
        '',
        'Mohon info ketersediaan. Terima kasih.',
      ].join('\n'),
    );
    const minibus = car('Minibus');
    const driver: Booking = { ...b, mode: 'driver', car: 5, returnDate: '2026-10-30', returnTime: '22.00' };
    expect(bookingMessage(driver, minibus, quoteRental(minibus, 'driver', bookingMinutes(driver)!), ' ').split('\n')).toEqual([
      'Halo, saya ingin sewa mobil.',
      '',
      'Mobil: Minibus, 14 kursi (atau setara)',
      'Layanan: Dengan sopir',
      'Ambil: Jumat, 30 Oktober 2026, 09.00',
      'Kembali: Jumat, 30 Oktober 2026, 22.00',
      'Durasi: 13 jam (13 jam)',
      'Perkiraan harga: Rp2.500.000 (2 blok 12 jam × Rp1.250.000)',
      '',
      'Mohon info ketersediaan. Terima kasih.',
    ]);
    expect(bookingMessage(b, mpv, null, 'Kemudi Rent Car')).not.toMatch(/Durasi|Perkiraan/);
    expect(bookingMessage(b, mpv, null, 'Kemudi Rent Car')).toMatch(/\n\nMohon info harga & ketersediaan\. Terima kasih\.$/);
  });

  it('film: progres gulir (fungsi murni), bab & keterangan per jendela progres, penghitung cek', () => {
    // viewTop/viewHeight = area terlihat di bawah bilah lengket; trek = section tinggi (3 × panggung)
    expect(filmProgress(64, 836, 64, 2508)).toBe(0);
    expect(filmProgress(64, 836, 64 - 836, 2508)).toBe(0.5);
    expect(filmProgress(64, 836, 64 - 1672, 2508)).toBe(1);
    expect(filmProgress(64, 836, -5000, 2508)).toBe(1);
    expect(filmProgress(64, 836, 900, 2508)).toBe(0);
    expect(filmProgress(0, 800, -100, 800)).toBe(0);
    expect(filmProgress(0, 800, Number.NaN, 2400)).toBe(0);
    expect([...FILM_PHASES]).toEqual([0, 0.3, 0.5, 0.78, 1]);
    expect(chapterWindows(4)).toEqual([
      [0, 0.3],
      [0.3, 0.5],
      [0.5, 0.78],
      [0.78, 1],
    ]);
    expect(chapterWindows(2)).toEqual([
      [0, 0.5],
      [0.5, 1],
    ]);
    expect(chapterWindows(0)).toEqual([]);
    expect([0, 0.29, 0.3, 0.6, 0.77, 0.78, 0.8, 1, -1, Number.NaN].map((p) => chapterAt(p, 4))).toEqual([0, 0, 1, 2, 2, 3, 3, 3, 0, 0]);
    expect(chapterAt(0.5, 2)).toBe(1);
    expect(chapterAt(0.5, 0)).toBe(-1);
    // Keterangan muncul satu per satu di babak 0,5–0,8; mobil berangkat sesudahnya
    expect([...CALLOUT_SPAN]).toEqual([0.5, 0.8]);
    const wins = calloutWindows(4);
    expect(wins).toHaveLength(4);
    const edges = [0.5, 0.575, 0.65, 0.725, 0.8];
    wins.forEach(([a, b], i) => {
      expect(a).toBeCloseTo(edges[i], 6);
      expect(b).toBeCloseTo(edges[i + 1], 6);
    });
    expect(calloutWindows(0)).toEqual([]);
    expect([0, 0.3, 0.39, 0.448, 0.48, 1].map(checkCount)).toEqual([0, 0, 6, 10, 12, 12]);
    // Jangkar keterangan di dalam panggung dan saling berjauhan (lencana bernomor 24px di HP tidak bertumpuk)
    for (const { anchor, end } of FILM_CALLOUTS) {
      expect(anchor[0]).toBeGreaterThan(0);
      expect(anchor[0]).toBeLessThan(FILM_W);
      expect(end[1]).toBeGreaterThan(0);
      expect(end[1]).toBeLessThan(FILM_H);
      expect(end[0], 'garis keterangan tegak').toBe(anchor[0]);
    }
    for (let i = 0; i < FILM_CALLOUTS.length; i += 1) {
      for (let j = i + 1; j < FILM_CALLOUTS.length; j += 1) {
        const [a, b] = [FILM_CALLOUTS[i].anchor, FILM_CALLOUTS[j].anchor];
        expect(Math.hypot(a[0] - b[0], a[1] - b[1]), `${i}-${j}`).toBeGreaterThanOrEqual(150);
      }
    }
  });

  it('teks kecil: nomor HP berkelompok, bintang 1–5, zona antar (gratis), ikon otomatis dokumen & langkah', () => {
    expect(displayPhone('081234567890')).toBe('0812-3456-7890');
    expect(displayPhone('(022) 555-0182')).toBe('(022) 555-0182');
    expect(displayPhone('')).toBe('');
    expect(['5', '4', '1', '0', '6', 'x', ''].map(ratingOf)).toEqual([5, 4, 1, 0, 0, 0, 0]);
    expect(readZones(DEMO.delivery).map((z) => `${z.name}|${z.fee}|${z.free}`)).toEqual([
      'Pusat kota Bandung|Gratis|true',
      'Stasiun Bandung|+Rp50.000|false',
      'Bandara Husein Sastranegara|+Rp75.000|false',
      'Lembang & Dago Atas|+Rp100.000|false',
    ]);
    expect(MAP_SLOTS).toHaveLength(6);
    const docs = [...(DEMO.requirements.self_docs as { title: string }[]), ...(DEMO.requirements.driver_docs as { title: string }[])].map((d) => docIcon(d.title));
    expect(docs).toEqual(['idcard', 'license', 'file', 'wallet', 'idcard', 'schedule', 'route', 'cash']);
    expect(docIcon('Sesuatu')).toBe('file');
    expect((DEMO.steps.items as { title: string }[]).map((s) => stepIcon(s.title))).toEqual(['pick', 'confirm', 'key', 'return']);
    expect(stepIcon('Bayar deposit')).toBe('cash');
    expect(stepIcon('Sesuatu')).toBe('check');
  });
});

describe('Kemudi: demo', () => {
  it('urutan section, satu H1, hero drive: foto latar LCP (eager, srcset, sizes HP lebar, alt) tanpa reveal, Ken Burns di wadah', () => {
    const container = demo();
    expect(sectionKeys(container)).toEqual([...ORDER, 'footer']);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const hero = section(container, 'hero');
    expect(hero.getAttribute('data-hero-layout')).toBe('drive');
    expect(hero.querySelector('h1')!.textContent).toBe('Sewa mobil tanpa ribet, harga jelas.');
    expect(hero.querySelector('h1 .km-hl')!.textContent).toBe('harga jelas.');
    // Sorotan boleh terbungkus (sorotan panjang ≤ 30 huruf tidak terpotong di HP)
    expect(hero.querySelector('h1 .km-hl')!.className).not.toMatch(/nowrap/);
    expect(hero.textContent).toContain('Rental mobil Bandung');
    const img = hero.querySelector<HTMLImageElement>('img[fetchpriority="high"]')!;
    expect(img.getAttribute('src')).toBe('/assets/templates/photos/kemudi-hero-1920.webp');
    expect(img.getAttribute('srcset')).toContain(' 800w');
    expect(img.getAttribute('srcset')).toContain(' 1280w');
    expect(img.getAttribute('srcset')).toContain(' 1920w');
    // HP: foto 16:9 menutupi kotak tegak → tergambar ±2,6× lebar layar (tanpa ini HP memuat varian 800 yang buram)
    expect(img.getAttribute('sizes')).toBe('(max-width: 767px) 260vw, 100vw');
    expect(img.getAttribute('loading')).toBe('eager');
    expect(Number(img.getAttribute('width'))).toBe(1920);
    expect(Number(img.getAttribute('height'))).toBe(1080);
    expect(img.getAttribute('alt')!.split(' ').length).toBeGreaterThanOrEqual(5);
    // Foto = LATAR hero, tidak pernah disembunyikan: tanpa Reveal, tanpa kelas gerak di <img>; Ken Burns di wadahnya
    expect(img.closest('.tpl-reveal')).toBeNull();
    expect(img.className).not.toMatch(/tpl-photo|km-|opacity|clip/);
    const kenburns = img.closest('.km-kenburns')!;
    expect(kenburns).not.toBeNull();
    expect(kenburns.className).toContain('absolute inset-0');
    expect(kenburns.parentElement!.className).toMatch(/\babsolute inset-x-0 top-\[72px\]/);
    expect(hero.querySelector('.km-hero-scrim')).toHaveAttribute('aria-hidden', 'true');
    // Teks putih di atas foto = blok inverse; hero memuat SATU widget (kartu pesan), tanpa deretan angka/lencana
    expect(hero.querySelector('[data-tpl-tone="inverse"] h1')).not.toBeNull();
    expect(hero.querySelectorAll('form')).toHaveLength(1);
    expect(hero.querySelectorAll('dl')).toHaveLength(0);
    expect(within(hero).getByRole('link', { name: /Lihat semua mobil/ })).toHaveAttribute('href', '#fleet');
    const eager = Array.from(container.querySelectorAll('img')).filter((i) => i.getAttribute('loading') !== 'lazy');
    expect(eager.map((i) => i.getAttribute('src'))).toEqual(['/assets/templates/photos/kemudi-hero-1920.webp']);
  });

  it('kartu pesan: layanan, mobil, jadwal, trek mini, perkiraan harga, tautan WhatsApp berisi pesan tersusun', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    const hero = section(demo(), 'hero');
    const form = within(hero).getByRole('form', { name: 'Pesan mobil' });
    expect(form).toHaveAttribute('novalidate');
    expect(form.getAttribute('action')).toBeNull();
    const group = within(form).getByRole('radiogroup', { name: 'Layanan' });
    const radios = within(group).getAllByRole('radio') as HTMLInputElement[];
    expect(radios.map((r) => `${r.value}:${r.checked}`)).toEqual(['self:true', 'driver:false']);
    // Radio asli dengan nama sama → panah kiri/kanan bawaan browser berpindah pilihan
    expect(new Set(radios.map((r) => r.name)).size).toBe(1);
    expect(radios.map((r) => r.labels?.[0]?.textContent)).toEqual(['Lepas kunci', 'Dengan sopir']);
    const select = within(form).getByLabelText('Mobil') as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => `${o.textContent}${o.disabled ? ' [x]' : ''}`)).toEqual([
      'City car · 5 kursi',
      'MPV keluarga · 7 kursi',
      'MPV hemat · 7 kursi',
      'SUV · 7 kursi',
      'MPV premium · 7 kursi',
      'Minibus · 14 kursi (khusus dengan sopir) [x]',
    ]);
    expect(select.value).toBe('1');
    const pickup = within(form).getByLabelText('Tanggal ambil') as HTMLInputElement;
    const back = within(form).getByLabelText('Tanggal kembali') as HTMLInputElement;
    expect(pickup.type).toBe('date');
    expect(pickup.min).toBe('2026-10-29');
    expect(pickup.value).toBe('2026-10-30');
    expect(back.value).toBe('2026-11-01');
    expect((within(form).getByLabelText('Jam ambil') as HTMLSelectElement).value).toBe('09.00');
    expect(Array.from((within(form).getByLabelText('Jam kembali') as HTMLSelectElement).options)).toHaveLength(17);
    // Kartu ringkas (hero sederhana): trek mini dekoratif tanpa teks, hari ambil → kembali disebut SEKALI di baris
    // hasil, tanpa chip "Perkiraan" dan tanpa baris durasi kembar; "perkiraan" hanya di bawah total + catatan
    const track = form.querySelector('.km-drive')!.closest('[aria-hidden="true"]')!;
    expect(track.textContent).toBe('');
    expect(form.textContent).toContain('2 hari × Rp450.000');
    expect(plain(form.textContent)).toContain('Jum, 30 Okt → Min, 1 Nov');
    expect(plain(form.textContent).split('Jum, 30 Okt')).toHaveLength(2);
    // Baris tanggal hanya boleh patah sesudah panah (spasi tak terputus di dalam tiap tanggal)
    expect(form.textContent).toContain(['Jum,', '30', 'Okt', '→ Min,', '1', 'Nov'].join(NBSP));
    expect(form.textContent).not.toMatch(/Durasi|48 jam/);
    expect(form.textContent!.match(/perkiraan/gi)).toHaveLength(3);
    expect(within(form).getByText('Rp900.000')).toBeInTheDocument();
    expect(form.querySelector('[aria-live="polite"]')!.textContent).toBe('Perkiraan Rp900.000 untuk 2 hari');
    expect(form.querySelector('[aria-live="polite"]')).not.toHaveAttribute('role');
    const mpv = car('MPV keluarga');
    const wa = within(form).getByRole('link', { name: 'Pesan via WhatsApp' });
    expect(decode(wa)).toBe(`${WA}${bookingMessage(defaultBooking(CARS, NOW), mpv, quoteRental(mpv, 'self', 2880), 'Kemudi Rent Car')}`);
    expect(wa).toHaveAttribute('target', '_blank');
    expect(form.textContent).toContain('Tidak ada pembayaran online.');
    // Dengan sopir → 4 blok 12 jam; Minibus → harga sopirnya; kembali ke lepas kunci → mobil lepas kunci pertama (MPV)
    fireEvent.click(radios[1]);
    expect(radios[1].checked).toBe(true);
    expect(form.textContent).toContain('4 blok 12 jam × Rp650.000');
    expect(within(form).getByText('Rp2.600.000')).toBeInTheDocument();
    expect(Array.from(select.options).every((o) => !o.disabled)).toBe(true);
    fireEvent.change(select, { target: { value: '5' } });
    expect(within(form).getByText('Rp5.000.000')).toBeInTheDocument();
    expect(decode(within(form).getByRole('link', { name: 'Pesan via WhatsApp' }))).toContain('Mobil: Minibus, 14 kursi (atau setara)\nLayanan: Dengan sopir');
    fireEvent.click(radios[0]);
    expect(select.value).toBe('1');
    expect(within(form).getByText('Rp900.000')).toBeInTheDocument();
    // Kembali sore hari yang sama → 10 jam = harga 12 jam
    fireEvent.change(back, { target: { value: '2026-10-30' } });
    fireEvent.change(within(form).getByLabelText('Jam kembali'), { target: { value: '19.00' } });
    expect(form.textContent).toContain('12 jam Rp350.000');
    expect(within(form).getByText('Rp350.000')).toBeInTheDocument();
    expect(form.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it('kartu pesan: jadwal salah → galat di isian (aria-invalid, aria-describedby), tombol kirim memfokus galat pertama', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    const hero = section(demo(), 'hero');
    const form = within(hero).getByRole('form', { name: 'Pesan mobil' });
    const back = within(form).getByLabelText('Tanggal kembali') as HTMLInputElement;
    fireEvent.change(back, { target: { value: '2026-10-29' } });
    expect(back).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById(back.getAttribute('aria-describedby')!)!.textContent).toBe('Waktu kembali harus setelah waktu ambil.');
    expect(within(form).queryByRole('link', { name: 'Pesan via WhatsApp' })).toBeNull();
    expect(form.textContent).toContain('Lengkapi jadwal untuk melihat perkiraan harga.');
    expect(within(form).getByText('—')).toBeInTheDocument();
    const submit = within(form).getByRole('button', { name: 'Pesan via WhatsApp' });
    expect(submit).toHaveAttribute('type', 'submit');
    act(() => {
      fireEvent.submit(form);
    });
    await wait(20);
    expect(back).toHaveFocus();
    // Ambil kemarin → "sudah lewat"; diperbaiki → tautan WhatsApp kembali
    const pickup = within(form).getByLabelText('Tanggal ambil') as HTMLInputElement;
    fireEvent.change(pickup, { target: { value: '2026-10-28' } });
    expect(document.getElementById(pickup.getAttribute('aria-describedby')!)!.textContent).toBe('Waktu ambil sudah lewat.');
    fireEvent.change(pickup, { target: { value: '2026-10-30' } });
    fireEvent.change(back, { target: { value: '2026-11-02' } });
    expect(pickup).not.toHaveAttribute('aria-invalid');
    expect(back).not.toHaveAttribute('aria-invalid');
    expect(within(form).getByRole('link', { name: 'Pesan via WhatsApp' })).toBeInTheDocument();
    expect(within(form).getByText('Rp1.350.000')).toBeInTheDocument();
  });

  it('header putih: menu 6 kata + "Pesan Mobil"; menu HP buka/tutup, Esc menutup dan fokus kembali', () => {
    const container = demo();
    const header = container.querySelector('header')!;
    expect(header.className).toContain('sticky');
    expect(header.querySelector('svg[viewBox="0 0 32 32"]'), 'KemudiMark').not.toBeNull();
    expect(within(header).getByRole('link', { name: 'Kemudi Rent Car, ke awal halaman' })).toHaveAttribute('href', '#beranda');
    const nav = within(header).getByRole('navigation', { name: 'Menu utama' });
    expect(Array.from(nav.querySelectorAll('a')).map((a) => `${a.textContent}${a.getAttribute('href')}`)).toEqual([
      'Mobil#fleet',
      'Harga#pricing',
      'Syarat#requirements',
      'Cara Sewa#steps',
      'FAQ#faq',
      'Kontak#kontak',
    ]);
    fireEvent.click(within(nav).getByRole('link', { name: 'Harga' }));
    expect(scrolled).toEqual(['pricing']);
    expect(within(header).getByRole('link', { name: 'Pesan Mobil' })).toHaveAttribute('href', '#beranda');
    const toggle = within(header).getByRole('button', { name: 'Buka menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle.className).toMatch(/\bh-11\b/);
    expect(toggle.className).toMatch(/\bw-11\b/);
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAccessibleName('Tutup menu');
    expect(within(header).getAllByRole('navigation', { name: 'Menu utama' })).toHaveLength(2);
    const panel = document.getElementById(toggle.getAttribute('aria-controls')!)!;
    expect(panel).toHaveAttribute('aria-label', 'Menu utama');
    expect(within(panel).getAllByRole('link').map((a) => a.textContent)).toEqual(['Mobil', 'Harga', 'Syarat', 'Cara Sewa', 'FAQ', 'Kontak', 'Pesan Mobil']);
    fireEvent.click(within(panel).getByRole('link', { name: 'FAQ' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(scrolled).toEqual(['pricing', 'faq']);
    fireEvent.click(toggle);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
    expect(within(header).getAllByRole('navigation', { name: 'Menu utama' })).toHaveLength(1);
  });

  it('armada: 6 kartu dengan ilustrasi SVG kelasnya, chip spesifikasi, harga per layanan; saringan kelas; tombol Pesan mengisi kartu pesan', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    const container = demo();
    const fleet = section(container, 'fleet');
    const cards = () => Array.from(fleet.querySelectorAll('article'));
    const names = () => cards().map((c) => c.querySelector('h3')!.textContent);
    expect(names()).toEqual(['City car', 'MPV keluarga', 'MPV hemat', 'SUV', 'MPV premium', 'Minibus']);
    expect(cards().map((c) => c.querySelector('svg[data-car]')!.getAttribute('data-car'))).toEqual(['city', 'mpv', 'mpv-compact', 'suv', 'premium', 'minibus']);
    for (const card of cards()) {
      expect(card.querySelector('svg[data-car]')).toHaveAttribute('aria-hidden', 'true');
      expect(card.textContent).toContain('atau setara');
    }
    expect(fleet.querySelectorAll('img')).toHaveLength(0);
    const [city, , , suv, , minibus] = cards();
    expect(Array.from(within(city).getByRole('list', { name: 'Spesifikasi City car' }).querySelectorAll('li')).map((li) => li.textContent)).toEqual([
      '5 kursi',
      'Otomatis',
      'Bensin',
      '2 koper',
    ]);
    expect(city.textContent).toContain('mulaiRp325rb/ 24 jam');
    // Harga kartu = contoh: catatan satu baris di bawah saringan
    expect(fleet.textContent).toContain('Harga contoh per unit; harga final dikonfirmasi admin via WhatsApp.');
    expect(city.textContent).toContain('12 jam Rp250rb');
    expect(plain(suv.textContent)).toContain('Rp1,1 jt/ 24 jam');
    expect(plain(minibus.textContent)).toContain('Khusus dengan sopir');
    expect(plain(minibus.textContent)).toContain('Rp1,25 jt / 12 jam');
    // Saringan kelas (aria-pressed) + jumlah hasil (role=status saja: live region polite bawaan)
    const filters = within(fleet).getByRole('group', { name: 'Saring kelas mobil' });
    expect(within(filters).getAllByRole('button').map((b) => `${b.textContent}:${b.getAttribute('aria-pressed')}`)).toEqual([
      'Semua6:true',
      'City car1:false',
      'MPV2:false',
      'SUV1:false',
      'MPV premium1:false',
      'Minibus1:false',
    ]);
    // HP = rel chip yang digeser; ≥ @5xl chip membungkus (di 1024px tidak ada chip terpotong), sebaris dengan kontrol
    // layanan baru dari @6xl
    expect(filters.className).toContain('@5xl:flex-wrap');
    expect(filters.parentElement!.className).toContain('@5xl:overflow-visible');
    expect(filters.parentElement!.parentElement!.className).toContain('@6xl:flex-row');
    const status = within(fleet).getByRole('status');
    expect(status.textContent).toBe('6 mobil');
    expect(status).not.toHaveAttribute('aria-live');
    expect(fleet.querySelector('ul[data-filtered]')).toHaveAttribute('data-filtered', 'false');
    fireEvent.click(within(filters).getByRole('button', { name: 'MPV' }));
    expect(names()).toEqual(['MPV keluarga', 'MPV hemat']);
    expect(within(fleet).getByRole('status').textContent).toBe('2 mobil');
    expect(within(filters).getByRole('button', { name: 'MPV' })).toHaveAttribute('aria-pressed', 'true');
    expect(fleet.querySelector('ul[data-filtered]')).toHaveAttribute('data-filtered', 'true');
    expect(fleet.querySelectorAll('li.km-pop')).toHaveLength(2);
    fireEvent.click(within(filters).getByRole('button', { name: 'Semua' }));
    expect(cards()).toHaveLength(6);
    // Layanan di armada = layanan di kartu pesan (satu keadaan)
    const hero = section(container, 'hero');
    const modes = within(fleet).getByRole('radiogroup', { name: 'Harga untuk layanan' });
    fireEvent.click(within(modes).getByLabelText('Dengan sopir'));
    expect((within(hero).getByRole('radio', { name: 'Dengan sopir' }) as HTMLInputElement).checked).toBe(true);
    expect(cards()[1].textContent).toContain('Rp650rb/ 12 jam');
    expect(cards()[1].textContent).toContain('termasuk sopir');
    fireEvent.click(within(modes).getByLabelText('Lepas kunci'));
    // "Pesan" di kartu Minibus → kartu pesan terisi (mobil + layanan sopir), gulir ke atas, fokus ke pilihan layanan
    const book = within(fleet).getByRole('button', { name: 'Pesan: Minibus' });
    expect(book).toHaveAttribute('type', 'button');
    expect(within(fleet).getAllByRole('button', { name: /^Pesan: / })).toHaveLength(6);
    fireEvent.click(book);
    // Gulir ke KARTU PESAN (di HP kartu ada di bawah teks hero), bukan ke atas hero
    expect(scrolled).toEqual([null]);
    const form = within(hero).getByRole('form', { name: 'Pesan mobil' });
    expect(vi.mocked(Element.prototype.scrollIntoView).mock.contexts).toEqual([form]);
    expect(form.className).toContain('scroll-mt-[calc(var(--tpl-sticky-top,0px)+84px)]');
    // Tombol menggulir di halaman → panah ke atas (panah serong hanya untuk tautan keluar)
    expect(book.querySelector('svg')!.getAttribute('class')).toContain('lucide-arrow-up');
    expect(book.querySelector('svg')!.getAttribute('class')).not.toContain('arrow-up-right');
    expect((within(form).getByLabelText('Mobil') as HTMLSelectElement).value).toBe('5');
    const driver = within(form).getByRole('radio', { name: 'Dengan sopir' }) as HTMLInputElement;
    expect(driver.checked).toBe(true);
    expect((within(modes).getByLabelText('Dengan sopir') as HTMLInputElement).checked).toBe(true);
    await wait(100);
    expect(driver).toHaveFocus();
    expect(within(form).getByText('Rp5.000.000')).toBeInTheDocument();
  });

  it('film tanpa gerak (kurangi gerak/pratinjau): tanpa trek tinggi, gambar poster utuh, semua tahap terbaca dalam <ol>, tautan lewati', () => {
    const container = still();
    expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'off');
    const film = section(container, 'film');
    expect(film).toHaveAttribute('data-film', 'off');
    expect(film).toHaveAttribute('data-tpl-tone', 'inverse');
    expect(film.className).toContain('bg-[#161B22]');
    expect(film.querySelector('h2')!.textContent).toBe('Mobil siap, Anda tinggal jalan');
    expect(film.textContent).toContain('02Proses');
    // Statis: tanpa tinggi trek / --p / sticky inline, tanpa HUD & keterangan bergerak
    const track = film.querySelector<HTMLElement>('.km-track')!;
    const stage = film.querySelector<HTMLElement>('[data-film-progress]')!;
    expect(track.getAttribute('style')).toBeNull();
    expect(stage.style.getPropertyValue('--p')).toBe('');
    expect(film.querySelector('.km-hud')).toBeNull();
    expect(film.querySelector('.km-final')).toBeNull();
    expect(film.querySelector('.km-rail')).toBeNull();
    // Semua bab di <ol> asli, semua terlihat (tanpa aria-current di versi diam)
    const chapters = within(film).getByRole('list', { name: 'Tahap sewa' });
    expect(chapters.tagName).toBe('OL');
    expect(Array.from(chapters.querySelectorAll('li h3')).map((h) => h.textContent)).toEqual(['Rancang', 'Cek', 'Siap', 'Jalan']);
    expect(chapters.textContent).toContain('Mesin, ban, rem, dan AC dicek sebelum serah terima.');
    expect(chapters.querySelector('[aria-current]')).toBeNull();
    const callouts = within(film).getByRole('list', { name: 'Keterangan mobil' });
    expect(callouts.tagName).toBe('OL');
    // Urutan = posisi di gambar dibaca seperti huruf Z (kaca, atap, panel belakang, roda depan)
    expect(Array.from(callouts.querySelectorAll('li')).map((li) => li.textContent)).toEqual([
      '17 kursi + 3 koper',
      '2AC dingin, 2 blower',
      '3Diserahkan dengan BBM penuh',
      '4Dicek & dibersihkan tiap serah terima',
    ]);
    const labelX = Array.from(film.querySelectorAll<HTMLElement>('.km-co-label')).map((l) => parseFloat(l.style.left));
    expect(labelX[0]).toBeLessThan(labelX[1]);
    expect(labelX[2]).toBeLessThan(labelX[3]);
    expect(film.textContent).toContain('Diantar ke lokasi Anda');
    expect(film.textContent).toContain('Rumah, hotel, stasiun, atau bandara. Biaya antar sesuai zona.');
    // Bab terakhir tidak mengulang kalimat penutup kata per kata
    expect(chapters.textContent).not.toContain('Diantar ke lokasi Anda');
    // Gambar = SVG dekoratif tersembunyi (≤ 150 elemen); garis cetak biru dinormalisasi pathLength=1 TANPA
    // vector-effect (kombinasi keduanya memotong garis di layar ≥ ± 1950px), tebal garis lewat --sw
    const scene = film.querySelector<SVGElement>('svg.km-scene')!;
    expect(scene).toHaveAttribute('aria-hidden', 'true');
    expect(scene.querySelectorAll('*').length).toBeLessThanOrEqual(150);
    expect(scene.querySelectorAll('[pathLength="1"]').length).toBeGreaterThanOrEqual(12);
    for (const el of scene.querySelectorAll<SVGElement>('[pathLength="1"]')) {
      expect(el.getAttribute('vector-effect'), el.getAttribute('class') ?? '').toBeNull();
      expect(Number(el.style.getPropertyValue('--sw')), el.getAttribute('class') ?? '').toBeGreaterThan(0);
    }
    expect(scene.querySelectorAll('.km-co')).toHaveLength(4);
    for (const label of film.querySelectorAll('.km-co-label, .km-co-badge')) expect(label).toHaveAttribute('aria-hidden', 'true');
    // Tautan "Lewati animasi" (tersembunyi sampai difokus) ke section berikutnya
    const skip = within(film).getByRole('link', { name: 'Lewati animasi' });
    expect(skip).toHaveAttribute('href', '#pricing');
    expect(skip.className).toContain('sr-only');
    expect(skip.className).toContain('focus:not-sr-only');
    // Leluhur panggung tanpa overflow hidden/auto (sticky tidak rusak); di dalam panggung boleh
    for (let el = stage.parentElement; el && el !== container; el = el.parentElement) {
      expect(el.className, el.tagName).not.toMatch(/(^|\s)overflow-(hidden|auto|scroll|y-auto|y-hidden|y-scroll)(\s|$)/);
    }
  });

  it('tabel harga: kolom Mobil | 12 jam | 24 jam | Dengan sopir | Luar kota, kolom pertama menempel, "—" = tidak tersedia', () => {
    const pricing = section(demo(), 'pricing');
    const table = pricing.querySelector('table')!;
    expect(table.querySelector('caption')!.textContent).toBe('Harga sewa per unit (contoh), dalam rupiah');
    expect(Array.from(table.querySelectorAll('thead th')).map((th) => th.textContent)).toEqual(['Mobil', '12 jam', '24 jam', 'Dengan sopir (12 jam)', 'Luar kota']);
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    expect(rows).toHaveLength(6);
    expect(Array.from(rows[0].querySelectorAll('th, td')).map((c) => c.textContent)).toEqual([
      'City car5 kursi · Otomatis',
      'Rp250.000',
      'Rp325.000',
      'Rp525.000',
      '+Rp50.000/hari',
    ]);
    expect(Array.from(rows[5].querySelectorAll('td')).map((c) => c.textContent)).toEqual(['—tidak tersedia', '—tidak tersedia', 'Rp1.250.000', '+Rp150.000/hari']);
    expect(rows[5].querySelector('td span[aria-hidden]')!.textContent).toBe('—');
    for (const th of table.querySelectorAll('th[scope="row"], thead th:first-child')) expect(th.className).toContain('sticky left-0');
    // Tabel bergeser di wadahnya sendiri (halaman tidak pernah bergeser). Wadah = blok penahan posisi: teks sr-only
    // berposisi absolut ("tidak tersedia") terpotong di sini, bukan melebarkan halaman HP 320px (QA 2026-10-29)
    expect(table.closest('.overflow-x-auto')).not.toBeNull();
    expect(table.closest('.overflow-x-auto')).toHaveClass('relative');
    expect(pricing.textContent).toContain('Harga contoh; lepas kunci belum termasuk BBM, tol, parkir.');
    expect(Array.from(pricing.querySelectorAll('ul li')).map((li) => li.textContent)).toEqual([
      'Mobil dicek sebelum diserahkan',
      'Kabin bersih dan wangi',
      'STNK asli di dalam mobil',
      'Bantuan admin lewat WhatsApp',
    ]);
    expect(pricing.querySelectorAll('img')).toHaveLength(1);
  });

  it('syarat sewa: tab (ARIA + panah/Home/End), kartu dokumen h3, aturan, foto per tab, catatan dokumen tidak disimpan', () => {
    const requirements = section(demo(), 'requirements');
    const tablist = within(requirements).getByRole('tablist', { name: 'Jenis layanan' });
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Lepas kunci', 'Dengan sopir']);
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false']);
    expect(tabs.map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1']);
    const panel = () => within(requirements).getByRole('tabpanel');
    expect(panel()).toHaveAttribute('aria-labelledby', tabs[0].id);
    for (const tab of tabs) expect(tab).toHaveAttribute('aria-controls', panel().id);
    expect(Array.from(panel().querySelectorAll('h3')).map((h) => h.textContent)).toEqual(['KTP asli', 'SIM A aktif', 'Identitas tambahan', 'Deposit']);
    expect(panel().textContent).toContain('Telat lebih dari 2 jam dihitung satu blok 12 jam.');
    expect(panel().textContent).toContain('Dokumen dicek langsung saat serah terima; website tidak mengunggah atau menyimpan dokumen Anda.');
    // Foto tab: hanya yang aktif terbaca; lainnya aria-hidden, alt kosong
    const photos = () => Array.from(requirements.querySelectorAll<HTMLElement>('.km-tab-img'));
    expect(photos().map((p) => p.getAttribute('data-active'))).toEqual(['true', 'false']);
    expect(photos()[0].querySelector('img')!.getAttribute('alt')!.split(' ').length).toBeGreaterThanOrEqual(5);
    expect(photos()[1]).toHaveAttribute('aria-hidden', 'true');
    expect(photos()[1].querySelector('img')).toHaveAttribute('alt', '');
    tabs[0].focus();
    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveFocus();
    expect(panel()).toHaveAttribute('aria-labelledby', tabs[1].id);
    expect(Array.from(panel().querySelectorAll('h3')).map((h) => h.textContent)).toEqual(['Identitas pemesan', 'Jadwal & titik jemput', 'Rencana rute', 'Uang muka']);
    expect(panel().textContent).toContain('Sopir cadangan untuk perjalanan jauh.');
    expect(photos().map((p) => p.getAttribute('data-active'))).toEqual(['false', 'true']);
    fireEvent.keyDown(tabs[1], { key: 'ArrowRight' });
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs[0], { key: 'End' });
    expect(tabs[1]).toHaveFocus();
    fireEvent.keyDown(tabs[1], { key: 'Home' });
    expect(tabs[0]).toHaveFocus();
    fireEvent.keyDown(tabs[0], { key: 'ArrowLeft' });
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(tabs[0]);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('antar-jemput: zona = tombol aria-pressed dengan biaya, peta kota ilustrasi, rute ke zona terpilih diumumkan', () => {
    // Gerak menyala: rute & pin menunggu peta terlihat (data-seen false), penanda mobil di tujuan sampai animasi berjalan
    expect(section(demo(), 'delivery').querySelector('.km-map')).toHaveAttribute('data-seen', 'false');
    cleanup();
    const delivery = section(still(), 'delivery');
    const zones = within(within(delivery).getByRole('list', { name: 'Zona antar-jemput' })).getAllByRole('button');
    expect(zones.map((z) => z.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false', 'false']);
    expect(zones[0].textContent).toBe('Pusat kota Bandung± 15 menit dari garasiGratis');
    expect(Array.from(zones[0].querySelectorAll('span')).find((s) => s.textContent === 'Gratis')!.className).toContain('text-[#0F7B4F]');
    for (const zone of zones) expect(zone).toHaveAttribute('type', 'button');
    // Daftar rata atas dengan peta; ≥ 1920px zona jadi kartu 2 kolom
    const zoneList = within(delivery).getByRole('list', { name: 'Zona antar-jemput' });
    expect(zoneList.className).toContain('@min-[120rem]:grid-cols-2');
    expect(zoneList.closest('.tpl-reveal, [class*="@5xl:col-span-7"]')!.className).toContain('@5xl:self-start');
    const live = delivery.querySelector('[aria-live="polite"]')!;
    expect(live).not.toHaveAttribute('role');
    expect(live.textContent).toBe('Rute dari Garasi Kemudi ke Pusat kota Bandung, biaya Gratis');
    const map = delivery.querySelector('.km-map')!;
    expect(map).toHaveAttribute('data-seen', 'true');
    expect(map.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(map.querySelector('.km-route')!.getAttribute('d')).toBe(MAP_SLOTS[0].route);
    expect(map.querySelectorAll('.km-pin')).toHaveLength(4);
    fireEvent.click(zones[2]);
    expect(zones.map((z) => z.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'true', 'false']);
    expect(map.querySelector('.km-route')!.getAttribute('d')).toBe(MAP_SLOTS[2].route);
    expect(live.textContent).toBe('Rute dari Garasi Kemudi ke Bandara Husein Sastranegara, biaya +Rp75.000');
    // Gerak mati → penanda mobil langsung di tujuan
    const [x, y] = MAP_SLOTS[2].pin;
    expect(map.querySelector('.km-marker')!.getAttribute('transform')).toMatch(new RegExp(`^translate\\(${x}\\.0 ${y}\\.0\\)`));
    // Foto kecil zona dekoratif (alt kosong di dalam aria-hidden)
    for (const img of delivery.querySelectorAll('img')) {
      expect(img).toHaveAttribute('alt', '');
      expect(img.closest('[aria-hidden="true"]')).not.toBeNull();
    }
    expect(delivery.textContent).toContain('biaya antar dikonfirmasi admin');
  });

  it('cara sewa, ulasan, tanya jawab: langkah berikon + garis, bintang tanpa rata-rata, akordeon ARIA, tautan WhatsApp', () => {
    const container = demo();
    const steps = section(container, 'steps');
    const items = Array.from(steps.querySelectorAll('ol > li'));
    expect(items.map((li) => li.querySelector('h3')!.textContent)).toEqual(['Pilih mobil & jadwal', 'Konfirmasi admin', 'Serah terima', 'Kembalikan mobil']);
    expect(items.map((li) => li.textContent!.slice(0, 10))).toEqual(['Langkah 01', 'Langkah 02', 'Langkah 03', 'Langkah 04']);
    expect(steps.querySelectorAll('.km-step-link')).toHaveLength(3);
    expect(steps.querySelector('ol')!.className).toContain('@5xl:grid-cols-4');
    const testimonials = section(container, 'testimonials');
    expect(testimonials.querySelectorAll('figure')).toHaveLength(3);
    expect(Array.from(testimonials.querySelectorAll('[role="img"]')).map((s) => s.getAttribute('aria-label'))).toEqual(['5 dari 5 bintang', '5 dari 5 bintang', '4 dari 5 bintang']);
    expect(Array.from(testimonials.querySelectorAll('figcaption')).map((f) => f.textContent)).toEqual([
      'RIRinaLiburan keluarga, Jakarta',
      'DIDimasPerjalanan kantor, Surabaya',
      'SASariLepas kunci, Bandung',
    ]);
    expect(testimonials.textContent).not.toMatch(/rata-rata|ulasan\)|\d,\d\s*\//);
    expect(testimonials.querySelectorAll('img')).toHaveLength(1);
    // Kepala ulasan sama polanya dengan section lain: label · H2 · satu kalimat pengantar
    expect(testimonials.textContent).toContain('Cerita singkat dari penyewa lepas kunci dan dengan sopir.');
    // ≥ 1920px: kartu ulasan berjajar 3 kolom di samping foto (bukan kartu 1000px+); kutipan dibatasi 52ch
    expect(testimonials.querySelector('ul')!.className).toContain('@min-[120rem]:grid-cols-3');
    for (const quote of testimonials.querySelectorAll('blockquote')) expect(quote.className).toContain('max-w-[52ch]');
    // Foto suasana tanpa wajah pelanggan: jalan desa tropis dilihat dari balik kemudi (bukan orang yang bisa dikenali)
    expect(testimonials.querySelector('img')!.getAttribute('alt')).toMatch(/^Jalan desa .*dari balik kemudi mobil$/);
    const faq = section(container, 'faq');
    const buttons = within(faq).getAllByRole('button');
    expect(buttons).toHaveLength(5);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'true');
    expect(buttons[0].closest('h3')).not.toBeNull();
    const region = document.getElementById(buttons[0].getAttribute('aria-controls')!)!;
    expect(region).toHaveAttribute('role', 'region');
    expect(region).toHaveAttribute('aria-labelledby', buttons[0].id);
    expect(region).not.toHaveAttribute('inert');
    fireEvent.click(buttons[1]);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'false');
    expect(buttons[1]).toHaveAttribute('aria-expanded', 'true');
    expect(region).toHaveAttribute('data-open', 'false');
    expect(region).toHaveAttribute('inert');
    fireEvent.click(buttons[1]);
    expect(buttons.every((b) => b.getAttribute('aria-expanded') === 'false')).toBe(true);
    expect(decode(within(faq).getByRole('link', { name: /Chat admin di WhatsApp/ }))).toBe(`${WA}Halo Kemudi Rent Car, saya ingin bertanya tentang sewa mobil.`);
    expect(faq.textContent).toContain('Website ini tidak menerima pembayaran online.');
    expect(faq.textContent).toContain('Dicuci & dicek tiap serah terima');
  });

  it('garasi & kontak: baris bertautan (≥ 44px), peta; footer grafit: ajakan + telepon besar, menu, kontak, media sosial', () => {
    const container = demo();
    const contact = section(container, 'contact');
    expect(Array.from(contact.querySelectorAll('dt')).map((dt) => dt.textContent)).toEqual(['Garasi', 'Jam', 'Telepon', 'WhatsApp', 'Email']);
    expect(within(contact).getAllByRole('link', { name: '0812-3456-7890' }).map((a) => a.getAttribute('href'))).toEqual([
      'tel:+6281234567890',
      expect.stringMatching(/^https:\/\/wa\.me\/6281234567890\?text=/),
    ]);
    for (const link of within(contact).getAllByRole('link', { name: /0812-3456-7890|halo\.kemudi@example\.com/ })) {
      expect(link.className).toContain('py-3.5');
      expect(link.className).toContain('-my-3.5');
    }
    expect(within(contact).getByRole('link', { name: 'halo.kemudi@example.com' })).toHaveAttribute('href', 'mailto:halo.kemudi@example.com');
    expect(contact.querySelector('iframe')!.getAttribute('title')).toBe('Peta lokasi Kemudi Rent Car');
    expect(within(contact).getByRole('link', { name: 'Buka di Google Maps' }).getAttribute('href')).toMatch(/^https:\/\/(www\.)?google\.com\/maps/);
    // Nama tautan unik: "Chat WhatsApp" hanya tombol melayang Shell
    expect(within(container).getAllByRole('link', { name: 'Chat WhatsApp' })).toHaveLength(1);
    expect(Array.from(container.querySelectorAll('[data-tpl-section][data-tpl-tone="inverse"]')).map((el) => el.getAttribute('data-tpl-section'))).toEqual(['film', 'footer']);
    const footer = container.querySelector('footer')!;
    expect(footer.getAttribute('data-tpl-section')).toBe('footer');
    expect(footer.className).toContain('bg-[#161B22]');
    expect(footer.textContent).toContain('Butuh mobil hari ini?');
    expect(within(footer).getAllByRole('link', { name: /0812-3456-7890/ })[0]).toHaveAttribute('href', 'tel:+6281234567890');
    expect(within(footer).getByRole('link', { name: 'Chat admin' }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/6281234567890\?text=/);
    expect(footer.textContent).toContain(`© ${new Date().getFullYear()} Kemudi Rent Car`);
    expect(Array.from(within(footer).getByRole('navigation', { name: 'Tautan footer' }).querySelectorAll('a')).map((a) => a.getAttribute('href'))).toEqual([
      '#fleet',
      '#pricing',
      '#requirements',
      '#steps',
      '#faq',
      '#kontak',
    ]);
    for (const link of footer.querySelectorAll('a')) expect(link.className, link.textContent ?? '').toMatch(/\bmin-h-1[14]\b|\bh-14\b/);
    expect(within(footer).getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://instagram.com/kemudi.contoh');
    expect(within(footer).getByRole('link', { name: 'TikTok' })).toHaveAttribute('href', 'https://tiktok.com/@kemudi.contoh');
    expect(within(footer).queryByRole('link', { name: 'Facebook' })).toBeNull();
    expect(footer.textContent).toContain('Harga dan ketersediaan contoh; dikonfirmasi admin.');
    // Kolom tautan footer mulai di kolom 5, 8, 11 (jarak sama); bilah bawah memberi ruang untuk tombol WhatsApp melayang
    expect(within(footer).getByRole('navigation', { name: 'Tautan footer' }).className).toContain('@5xl:col-start-5');
    expect(Array.from(footer.querySelectorAll('p')).find((el) => el.textContent === 'Kontak')!.parentElement!.className).toContain('@5xl:col-start-8');
    expect(Array.from(footer.querySelectorAll('p')).find((el) => el.textContent === 'Media sosial')!.parentElement!.className).toContain('@5xl:col-start-11');
    expect(Array.from(footer.querySelectorAll('div')).find((el) => el.textContent?.startsWith('©'))!.className).toContain('@3xl:pr-[72px]');
  });

  it('wadah PENUH: header, section, dan footer memakai WRAP selebar layar (tanpa max-w 1680, tanpa CONTAINER)', () => {
    expect(WRAP).toBe('w-full px-5 @2xl:px-8 @5xl:px-12 @min-[96rem]:px-16');
    const src = source();
    expect(src).not.toContain('max-w-[1680px]');
    expect(src).not.toMatch(/\bCONTAINER\b/);
    const container = demo();
    const hasWrap = (el: Element) => Array.from(el.querySelectorAll('[class]')).some((node) => node.getAttribute('class')!.includes(WRAP));
    expect(hasWrap(container.querySelector('header')!), 'header').toBe(true);
    for (const key of [...ORDER, 'footer']) expect(hasWrap(section(container, key)), key).toBe(true);
    // Tidak ada pembungkus section yang dibatasi lebarnya: batas lebar (selain max-w-full) hanya pada teks
    for (const el of container.querySelectorAll('[data-tpl-section] [class*="max-w-"]')) {
      const limits = el
        .getAttribute('class')!
        .split(/\s+/)
        .filter((c) => c.startsWith('max-w-') && c !== 'max-w-full');
      if (limits.length > 0 && !el.classList.contains('km-hud')) expect(el.tagName, `${limits.join(' ')} ${el.textContent?.slice(0, 30)}`).toMatch(/^(P|H1|H2|H3|BLOCKQUOTE)$/);
    }
    // Pita foto hero & panggung film selebar layar (tanpa jarak tepi)
    const hero = section(container, 'hero');
    expect(hero.querySelector('.km-kenburns')!.parentElement!.className).toContain('inset-x-0');
    expect(section(container, 'film').querySelector('.km-grid')!.className).toContain('-inset-[12%]');
  });

  it('datar: tidak ada kelas shadow di template (kecuali tombol melayang Shell), kode tanpa kiriman data', () => {
    const container = demo();
    const shadows = Array.from(container.querySelectorAll('[class*="shadow"]')).filter(
      (el) => !el.closest('[aria-label="Chat WhatsApp"]') && !/Chat WhatsApp|Kembali ke atas/.test(el.getAttribute('aria-label') ?? ''),
    );
    expect(shadows.map((el) => el.className)).toEqual([]);
    const src = source();
    expect(src).not.toMatch(/\bshadow-|box-shadow|text-shadow|drop-shadow/);
    // Kode (tanpa komentar): tanpa framer-motion/router/kanvas/video, formulir tidak mengirim atau menyimpan apa pun
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/framer-motion|useLocation|useParams|localStorage|sessionStorage|fetch\(|XMLHttpRequest|sendBeacon|<canvas|<video|background-attachment/);
    // Tidak mengimpor dari folder template lain
    for (const [, from] of code.matchAll(/from '(\.\.\/[^']+)'/g)) expect(from, from).toMatch(/^\.\.\/(shared|kit|types)(\/|$)/);
  });
});

describe('Kemudi: film dengan gerak menyala', () => {
  /** IntersectionObserver palsu: mencatat target; callback dipicu manual lewat fire(). */
  class FakeIO {
    static all: FakeIO[] = [];
    readonly root = null;
    readonly thresholds = [0];
    readonly rootMargin: string;
    readonly targets = new Set<Element>();
    readonly callback: IntersectionObserverCallback;
    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
      this.callback = callback;
      this.rootMargin = options?.rootMargin ?? '0px';
      FakeIO.all.push(this);
    }
    observe(el: Element) {
      this.targets.add(el);
    }
    unobserve(el: Element) {
      this.targets.delete(el);
    }
    disconnect() {
      this.targets.clear();
    }
    takeRecords() {
      return [];
    }
    fire(el: Element, isIntersecting: boolean) {
      const rect = el.getBoundingClientRect();
      const entry = { target: el, isIntersecting, intersectionRatio: isIntersecting ? 1 : 0, boundingClientRect: rect, intersectionRect: rect, rootBounds: null, time: 0 };
      this.callback([entry as IntersectionObserverEntry], this as unknown as IntersectionObserver);
    }
  }
  const win = window as unknown as Record<string, unknown>;
  const glob = globalThis as unknown as Record<string, unknown>;
  const saved = { winIO: win.IntersectionObserver, globIO: glob.IntersectionObserver, matchMedia: win.matchMedia };
  beforeEach(() => {
    FakeIO.all = [];
    win.IntersectionObserver = FakeIO;
    glob.IntersectionObserver = FakeIO;
    win.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    win.IntersectionObserver = saved.winIO;
    glob.IntersectionObserver = saved.globIO;
    win.matchMedia = saved.matchMedia;
    if (saved.winIO === undefined) delete win.IntersectionObserver;
    if (saved.globIO === undefined) delete glob.IntersectionObserver;
    if (saved.matchMedia === undefined) delete win.matchMedia;
  });

  it('trek & panggung: pendengar gulir (capture, pasif) hanya saat trek dekat layar, --p & --film-vh ditulis, bab & HUD ikut, semua dilepas saat unmount', async () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const view = render(<SiteRenderer templateCode="kemudi" content={null} />);
    const container = view.container;
    expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'on');
    const film = section(container, 'film');
    expect(film).toHaveAttribute('data-film', 'on');
    const track = film.querySelector<HTMLElement>('.km-track')!;
    const stage = film.querySelector<HTMLElement>('[data-film-progress]')!;
    expect(stage.className).toContain('km-stage');
    expect(film.querySelector('.km-hud')).not.toBeNull();
    expect(film.querySelector('.km-final')).not.toBeNull();
    const chapters = () => Array.from(within(film).getByRole('list', { name: 'Tahap sewa' }).querySelectorAll('li'));
    expect(chapters().map((li) => li.getAttribute('aria-current'))).toEqual(['step', null, null, null]);
    const scrollCalls = () => add.mock.calls.filter(([type, , options]) => type === 'scroll' && typeof options === 'object' && options?.capture === true);
    // Belum dekat layar → belum mendengarkan gulir
    expect(scrollCalls()).toHaveLength(0);
    const io = FakeIO.all.find((o) => o.targets.has(track))!;
    expect(io).toBeDefined();
    expect(io.rootMargin).toBe('240px 0px 240px 0px');
    const before = add.mock.calls.length;
    act(() => io.fire(track, true));
    expect(scrollCalls()).toHaveLength(1);
    const [, onScroll, scrollOptions] = scrollCalls()[0];
    expect(scrollOptions).toEqual({ passive: true, capture: true });
    const resize = add.mock.calls.slice(before).find(([type]) => type === 'resize')!;
    expect(resize).toBeDefined();
    await wait(60);
    expect(track.style.getPropertyValue('--film-vh')).toBe(`${window.innerHeight}px`);
    expect(stage.style.getPropertyValue('--p')).toBe('0.0000');
    // Gulir: trek 3000px, 1000px sudah lewat tepi atas → p = 1000 / (3000 − tinggi layar)
    track.getBoundingClientRect = () => ({ top: -1000, bottom: 2000, height: 3000, left: 0, right: 1024, width: 1024, x: 0, y: -1000, toJSON: () => ({}) }) as DOMRect;
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
    await wait(60);
    const p = filmProgress(0, window.innerHeight, -1000, 3000);
    expect(stage.style.getPropertyValue('--p')).toBe(p.toFixed(4));
    expect(chapters().map((li) => li.getAttribute('aria-current'))).toEqual([null, 'step', null, null]);
    const hud = film.querySelector('.km-hud')!;
    expect(hud.textContent).toContain(`${String(checkCount(p)).padStart(2, '0')}/12`);
    // HUD = dua meter bergerak saja (tanpa baris UNIT/STATUS yang mengulang judul lembar & nama bab)
    expect(hud.textContent).not.toMatch(/UNIT|STATUS|DICEK|MPV/);
    // Ujung trek → bab terakhir, cek penuh
    track.getBoundingClientRect = () => ({ top: -2400, bottom: 600, height: 3000, left: 0, right: 1024, width: 1024, x: 0, y: -2400, toJSON: () => ({}) }) as DOMRect;
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
    await wait(60);
    expect(stage.style.getPropertyValue('--p')).toBe('1.0000');
    expect(chapters().map((li) => li.getAttribute('aria-current'))).toEqual([null, null, null, 'step']);
    expect(hud.textContent).toContain('12/12');
    // Kalimat penutup: bingkai akhir di atas gambar (aria-hidden) + salinan untuk pembaca layar & cetak
    expect(film.querySelector('.km-final')).toHaveAttribute('aria-hidden', 'true');
    const closingCopy = Array.from(film.querySelectorAll('.sr-only')).find((el) => el.textContent?.includes('Diantar ke lokasi Anda'))!;
    expect(closingCopy).toBeDefined();
    expect(closingCopy.className).toContain('print:not-sr-only');
    expect(closingCopy.closest('[aria-hidden]')).toBeNull();
    // Rel progres & tautan lewati tersedia saat gerak menyala
    expect(film.querySelector('.km-rail')).toHaveAttribute('aria-hidden', 'true');
    expect(within(film).getByRole('link', { name: 'Lewati animasi' })).toHaveAttribute('href', '#pricing');
    // Lepas: unmount melepas gulir & resize dengan fungsi yang sama, dan menghapus variabel
    view.unmount();
    expect(remove.mock.calls.some(([type, fn, options]) => type === 'scroll' && fn === onScroll && typeof options === 'object' && options?.capture === true)).toBe(true);
    expect(remove.mock.calls.some(([type, fn]) => type === 'resize' && fn === resize[1])).toBe(true);
    expect(stage.style.getPropertyValue('--p')).toBe('');
    expect(track.style.getPropertyValue('--film-vh')).toBe('');
  });

  it('panggung terlalu pendek (HP mendatar, < 480px) → storyboard diam tanpa trek tinggi; layar tinggi lagi → video', async () => {
    const original = Object.getOwnPropertyDescriptor(window, 'innerHeight');
    Object.defineProperty(window, 'innerHeight', { value: 360, configurable: true, writable: true });
    try {
      const { container } = render(<SiteRenderer templateCode="kemudi" content={null} />);
      const film = section(container, 'film');
      expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'on');
      expect(film).toHaveAttribute('data-film', 'off');
      expect(film.querySelector('.km-rail')).toBeNull();
      expect(within(film).getByRole('list', { name: 'Tahap sewa' }).querySelector('[aria-current]')).toBeNull();
      Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true, writable: true });
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });
      expect(film).toHaveAttribute('data-film', 'on');
      expect(film.querySelector('.km-rail')).not.toBeNull();
      await wait(20);
    } finally {
      if (original) Object.defineProperty(window, 'innerHeight', original);
    }
  });

  it('trek menjauh dari layar → berhenti mendengarkan gulir', async () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const { container } = render(<SiteRenderer templateCode="kemudi" content={null} />);
    const track = section(container, 'film').querySelector<HTMLElement>('.km-track')!;
    const io = FakeIO.all.find((o) => o.targets.has(track))!;
    act(() => io.fire(track, true));
    act(() => io.fire(track, false));
    expect(remove.mock.calls.some(([type, , options]) => type === 'scroll' && typeof options === 'object' && options?.capture === true)).toBe(true);
    await wait(20);
  });
});

describe('Kemudi: gerak', () => {
  it('pratinjau CMS diam (film = storyboard statis) dan tanpa tautan wa.me terbuka', () => {
    const { container } = render(<def.Component content={resolveContent(def, null)} preview />);
    expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'off');
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    expect(container.querySelector('a[href^="javascript:"], a[href^="vbscript:"]')).toBeNull();
    expect(container.querySelector('[data-hero-layout="drive"] img[fetchpriority="high"]')).not.toBeNull();
    expect(within(container).getByRole('form', { name: 'Pesan mobil' })).toBeInTheDocument();
    const film = section(container, 'film');
    expect(film).toHaveAttribute('data-film', 'off');
    expect(within(film).getByRole('list', { name: 'Tahap sewa' }).querySelectorAll('li')).toHaveLength(4);
  });

  it("kemudi.css: animasi & film bergerbang [data-tpl-motion='on'], blok reduced-motion & cetak, kelas km-, Ken Burns skala-saja sekali", () => {
    const text = css();
    expect(text).toContain('@layer components');
    expect(text).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(text).toMatch(/@media print/);
    // Blok terdalam (pemilih + isi), juga di dalam @container/@media
    const blocks = [...text.matchAll(/([^{}]*)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selector: selector.trim(), body }));
    expect(blocks.length).toBeGreaterThan(40);
    for (const { selector, body } of blocks) {
      if (selector.startsWith('from') || selector.startsWith('to') || !/\b(transition|animation):/.test(body)) continue;
      if (/transition:\s*none|animation:\s*none/.test(body)) continue;
      expect(selector, body).toContain("[data-tpl-motion='on']");
    }
    for (const cls of text.replace(/url\([^)]*\)/g, '').match(/\.[a-z][\w-]*/g) ?? []) expect(cls, cls).toMatch(/^\.km-/);
    expect(text).not.toMatch(/infinite|box-shadow|text-shadow|drop-shadow|background-attachment/);
    // Film: trek tinggi (N = 3; HP 2,25) dan sticky HANYA saat gerak menyala; leluhur tanpa overflow
    const filmRules = blocks.filter(({ body }) => /position:\s*sticky|height:\s*calc\(var\(--film-vh/.test(body));
    expect(filmRules).toHaveLength(3);
    for (const { selector, body } of filmRules) expect(selector, body).toContain("[data-tpl-motion='on'] .km-film[data-film='on']");
    expect(text).toContain('height: calc(var(--film-vh, 100svh) * 3)');
    expect(text).toContain('height: calc(var(--film-vh, 100svh) * 2.25)');
    expect(text).toMatch(/top: var\(--tpl-sticky-top, 0px\);\s*height: var\(--film-vh, 100svh\);/);
    expect(text).not.toMatch(/overflow:\s*(hidden|auto)/);
    // Hanya transform/opacity/stroke-dashoffset yang digerakkan --p; ≤ 4 lapisan will-change
    expect(text.match(/will-change: transform/g) ?? []).toHaveLength(4);
    // HP & tablet: di awal & akhir film gambar digeser ke tengah ruang bebas (jarak diukur ./hooks.ts), bukan panggung
    // setengah kosong; chip keterangan HP pergi bersama mobil (sebelum kalimat penutup muncul)
    expect(text).toMatch(/\.km-box \{\s*translate: 0 calc\(var\(--km-co-h, 0px\) \* 0\.5 \* \(1 - var\(--t-co\)\) \+ var\(--km-tail, 0px\) \* 0\.5 \* var\(--t-final\)\);/);
    expect(text).toMatch(/\.km-co-list \{\s*opacity: calc\(1 - var\(--t-out\)\);/);
    // Hanya deklarasi (properti sesudah "{" atau ";"), bukan syarat "(max-width: …)" milik @container di depannya
    for (const [, prop] of text.matchAll(/[{;]\s*([a-z-]+):[^;{}]*var\(--(?:p|w|v|t-[a-z]+)\b/g)) {
      expect(['opacity', 'stroke-dashoffset', 'scale', 'translate', 'rotate', 'transform', '--w', '--v', '--t-pull', '--t-scan', '--t-fill', '--t-glass', '--t-wheel', '--t-co', '--t-fade', '--t-fuel', '--t-out', '--t-go', '--t-final', 'width'], prop).toContain(prop);
    }
    // Ken Burns: hanya transform scale, maks. 1,06, sekali (tanpa iteration-count)
    const kenburns = /@keyframes km-kenburns\s*\{([\s\S]*?)\n\}/.exec(text)![1];
    expect(kenburns).not.toMatch(/opacity|clip|filter/);
    const scales = [...kenburns.matchAll(/scale\(([\d.]+)\)/g)].map((m) => Number(m[1]));
    expect(Math.max(...scales)).toBeLessThanOrEqual(1.06);
    expect(Math.min(...scales)).toBe(1);
    expect(text).toMatch(/\[data-tpl-motion='on'\] \.km-kenburns \{\s*animation: km-kenburns 14s [^;]*;/);
    // Durasi: gambar/garis ≤ 1,6 dtk, transisi UI ≤ 1 dtk
    for (const [, name, value, unit] of text.matchAll(/animation:\s*km-([a-z-]+)\s+([\d.]+)(m?s)/g)) {
      if (name === 'kenburns') continue;
      expect(Number(value) * (unit === 's' ? 1000 : 1), name).toBeLessThanOrEqual(1600);
    }
    for (const [, value, unit] of text.matchAll(/transition:[^;]*?\s([\d.]+)(m?s)/g)) expect(Number(value) * (unit === 's' ? 1000 : 1)).toBeLessThanOrEqual(1000);
    // Keadaan diam = keadaan akhir: garis utuh, rute utuh, foto tab aktif terlihat
    expect(text).toMatch(/\.km-draw \{\s*stroke-dasharray: 1 1;\s*stroke-dashoffset: 0;/);
    expect(text).toMatch(/\.km-route \{\s*stroke-dasharray: 1 1;\s*stroke-dashoffset: 0;/);
    expect(text).toMatch(/\.km-tab-img\[data-active='true'\] \{\s*opacity: 1;/);
    // Kurangi gerak & cetak: trek/panggung kembali normal
    const reduced = /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n {2}\}/.exec(text)![1];
    expect(reduced).toMatch(/\.km-track,\s*\[data-tpl-motion='on'\] \.km-film\[data-film='on'\] \.km-stage \{\s*position: relative;\s*height: auto;/);
    // Cetak: semua aturan film yang digerakkan --p hanya di layar (@media screen) → cetakan = bingkai poster utuh, bukan
    // panggung ukuran-terkandung setinggi 0; lapisan dekoratif video tidak dicetak; pin peta tetap terlihat
    const screen = text.indexOf('@media screen {');
    expect(screen).toBeGreaterThan(0);
    for (const needle of ['position: sticky', 'container: km-stage / size', '--t-pull:', 'height: calc(var(--film-vh, 100svh) * 3)']) {
      expect(text.indexOf(needle), needle).toBeGreaterThan(screen);
      expect(text.indexOf(needle), needle).toBeLessThan(text.indexOf('@media (prefers-reduced-motion: reduce)'));
    }
    const print = /@media print \{([\s\S]*?)\n {2}\}/.exec(text)![1];
    expect(print).toMatch(/\.km-hud,\s*\.km-final,\s*\.km-rail \{\s*display: none !important;/);
    expect(print).toMatch(/\.km-map\[data-seen\] \.km-pin \{\s*opacity: 1;/);
    // Sorotan H1 = latar bergaris yang ikut terbungkus per baris (bukan ::after mutlak + nowrap yang terpotong di HP)
    expect(text).not.toContain('.km-hl::after');
    expect(text).toMatch(/\.km-hl \{[^}]*box-decoration-break: clone;/);
  });
});

describe('Kemudi: warna tema bisa diganti', () => {
  it('biru bawaan → --tpl-accent; warna CMS mengalir ke semua turunan; teks di atas aksen kontras', () => {
    const base = demo();
    expect(rootStyle(base, '--tpl-accent')).toBe('#0050ff');
    expect(rootStyle(base, '--tpl-on-accent')).toBe('#ffffff');
    expect(rootStyle(base, '--km-ink')).toBe('#0050ff');
    expect(rootStyle(base, '--km-bright')).toBe('#4780ff');
    cleanup();
    const raspberry = demo({ brand: { accent_color: '#D81E5B' } });
    expect(rootStyle(raspberry, '--tpl-accent')).toBe('#d81e5b');
    for (const name of ['--km-ink', '--km-bright', '--km-body-hi', '--km-body-lo']) expect(rootStyle(raspberry, name), name).toBe((kemudiVars('#D81E5B') as Record<string, string>)[name]);
    cleanup();
    const yellow = demo({ brand: { accent_color: '#FACC15' } });
    expect(rootStyle(yellow, '--tpl-on-accent')).toBe('#121620');
    expect(contrast(rgb('#121620'), rgb('#FACC15'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(rgb('#ffffff'), rgb('#0050ff'))).toBeGreaterThanOrEqual(4.5);
  });
});

describe('Kemudi: SEO situs pembeli, judul, gambar, tautan', () => {
  it('judul tab & meta description dari nama, tagline, dan deskripsi hero; theme-color = aksen', () => {
    expect(siteTitle('kemudi', null)).toBe('Kemudi Rent Car — Rental mobil lepas kunci & dengan sopir');
    expect(siteTitle('kemudi', null).length).toBeLessThanOrEqual(60);
    const restore = applySiteHead('kemudi', null);
    const description = document.head.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
    expect(description).toMatch(/^Lepas kunci atau dengan sopir di Bandung/);
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(200);
    expect(document.head.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#0050FF');
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
      }
    };
    check(container);
    expect(section(container, 'hero').querySelector('h2, h3')).toBeNull();
    expect(container.querySelector('footer')!.querySelector('h1, h2, h3')).toBeNull();
    cleanup();
    const untitled = demo(Object.fromEntries(ORDER.filter((k) => k !== 'hero').map((k) => [k, { title: '' }])));
    check(untitled);
    expect(ORDER.filter((k) => k !== 'hero').map((k) => section(untitled, k).querySelector('h2')!.textContent)).toEqual([
      'Armada mobil',
      'Proses sewa',
      'Harga sewa',
      'Syarat sewa',
      'Antar-jemput',
      'Cara sewa',
      'Ulasan pelanggan',
      'Tanya jawab',
      'Garasi & kontak',
    ]);
    for (const k of ORDER.filter((key) => key !== 'hero')) expect(section(untitled, k).querySelector('h2'), k).toHaveClass('sr-only');
    // Judul hero kosong → nama rental (tetap satu H1)
    cleanup();
    expect(section(demo({ hero: { title: '' } }), 'hero').querySelector('h1')!.textContent).toBe('Kemudi Rent Car');
  });

  it('gambar: alt deskriptif (dekoratif alt kosong di dalam aria-hidden), width/height, srcset & sizes', () => {
    const container = demo();
    const imgs = Array.from(container.querySelectorAll('img'));
    // hero + 2 foto tab syarat + kabin + 4 zona + ulasan + tanya jawab
    expect(imgs).toHaveLength(10);
    for (const img of imgs) {
      const src = img.getAttribute('src') ?? '';
      expect(img.hasAttribute('alt'), src).toBe(true);
      expect(Number(img.getAttribute('width')), src).toBeGreaterThan(0);
      expect(Number(img.getAttribute('height')), src).toBeGreaterThan(0);
      expect(img.getAttribute('srcset'), src).toMatch(/ (800|240)w, /);
      expect(img.getAttribute('sizes'), src).toBeTruthy();
      const alt = img.getAttribute('alt')!;
      if (img.closest('[aria-hidden="true"]')) expect(alt, src).toBe('');
      else expect(alt.split(' ').length, src).toBeGreaterThanOrEqual(5);
    }
  });

  it('tautan asli untuk navigasi, tombol hanya untuk aksi; radio asli untuk layanan; SVG dekoratif tersembunyi', () => {
    const container = demo();
    for (const a of container.querySelectorAll('a')) expect(a.getAttribute('href'), a.textContent ?? '').toMatch(/^(#[a-z]|https:\/\/|mailto:|tel:)/);
    for (const button of container.querySelectorAll('button')) expect(button.getAttribute('type'), button.textContent ?? '').toBe('button');
    for (const group of container.querySelectorAll('[role="radiogroup"]')) {
      const radios = Array.from(group.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
      expect(radios.length, group.getAttribute('aria-label') ?? '').toBe(2);
      expect(new Set(radios.map((r) => r.name)).size).toBe(1);
    }
    for (const svg of container.querySelectorAll('svg')) expect(svg.closest('[aria-hidden="true"], [aria-hidden=""]') ?? svg.getAttribute('aria-hidden'), svg.outerHTML.slice(0, 60)).toBeTruthy();
  });
});

describe('Kemudi: konten opsional kosong', () => {
  it('tanpa mobil → armada, tabel harga, kartu pesan, tautan "Lihat semua mobil", dan menu Mobil/Harga hilang', () => {
    const container = demo({ fleet: { items: [] } });
    expect(sectionKeys(container)).toEqual(['hero', 'film', 'requirements', 'delivery', 'steps', 'testimonials', 'faq', 'contact', 'footer']);
    const hero = section(container, 'hero');
    expect(hero.querySelector('form')).toBeNull();
    expect(within(hero).queryByRole('link', { name: /Lihat semua mobil/ })).toBeNull();
    expect(Array.from(container.querySelector('header nav')!.querySelectorAll('a')).map((a) => a.textContent)).toEqual(['Syarat', 'Cara Sewa', 'FAQ', 'Kontak']);
    // Nomor label menyesuaikan
    expect(section(container, 'film').textContent).toContain('01Proses');
  });

  it('armada tersembunyi → tabel harga & kartu pesan tetap; hero mati → tanpa tombol Pesan di kartu, menu atas ke Kontak', () => {
    const hiddenFleet = demo({ fleet: { enabled: false } });
    expect(sectionKeys(hiddenFleet)).not.toContain('fleet');
    expect(section(hiddenFleet, 'pricing').querySelectorAll('tbody tr')).toHaveLength(6);
    expect(within(section(hiddenFleet, 'hero')).getByRole('form', { name: 'Pesan mobil' })).toBeInTheDocument();
    expect(within(section(hiddenFleet, 'hero')).queryByRole('link', { name: /Lihat semua mobil/ })).toBeNull();
    cleanup();
    const noHero = demo({ hero: { enabled: false } });
    expect(sectionKeys(noHero)[0]).toBe('fleet');
    expect(within(section(noHero, 'fleet')).queryByRole('button', { name: /^Pesan: / })).toBeNull();
    expect(within(noHero.querySelector('header')!).getByRole('link', { name: 'Pesan Mobil' })).toHaveAttribute('href', '#kontak');
    cleanup();
    const noLabel = demo({ fleet: { book_label: '' }, hero: { header_label: '' } });
    expect(within(section(noLabel, 'fleet')).queryByRole('button', { name: /^Pesan: / })).toBeNull();
    expect(within(noLabel.querySelector('header')!).queryByRole('link', { name: 'Pesan Mobil' })).toBeNull();
  });

  it('mobil dengan foto pembeli → foto menggantikan ilustrasi; satu kelas → tanpa saringan; tanpa harga 12 jam → tanpa baris kecil', () => {
    const container = demo({
      fleet: {
        items: [
          { name: 'MPV keluarga', class: 'MPV', seats: '7', price_24: '450000', price_driver: '650000', image: '/assets/templates/photos/kemudi-interior-1200.webp' },
          { name: 'MPV hemat', class: 'mpv', seats: '7', price_12: '', price_24: '375rb', price_driver: '' },
        ],
      },
    });
    const fleet = section(container, 'fleet');
    expect(within(fleet).queryByRole('group', { name: 'Saring kelas mobil' })).toBeNull();
    const [photo, illustrated] = Array.from(fleet.querySelectorAll('article'));
    expect(photo.querySelector('img')).not.toBeNull();
    expect(photo.querySelector('svg[data-car]')).toBeNull();
    expect(illustrated.querySelector('svg[data-car="mpv-compact"]')).not.toBeNull();
    expect(illustrated.textContent).toContain('Rp375rb/ 24 jam');
    expect(illustrated.textContent).not.toContain('12 jam Rp');
    // Dengan sopir → mobil tanpa harga sopir "Lepas kunci saja"
    fireEvent.click(within(fleet).getByLabelText('Dengan sopir'));
    expect(illustrated.textContent).toContain('Lepas kunci saja');
    const rows = Array.from(section(container, 'pricing').querySelectorAll('tbody tr'));
    expect(Array.from(rows[1].querySelectorAll('td')).map((c) => c.textContent)).toEqual(['—tidak tersedia', 'Rp375.000', '—tidak tersedia', '—tidak tersedia']);
  });

  it('mobil tanpa harga di CMS = "Harga via admin": tidak dicap khusus satu layanan, kartu pesan tetap menyusun pesan WhatsApp', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    const container = demo({
      fleet: {
        items: [
          { name: 'MPV keluarga', class: 'MPV', seats: '7', price_12: '', price_24: '', price_driver: '' },
          { name: 'SUV', class: 'SUV', seats: '7', price_12: '', price_24: '', price_driver: '' },
        ],
      },
    });
    const fleet = section(container, 'fleet');
    for (const card of fleet.querySelectorAll('article')) {
      expect(card.textContent).toContain('Harga via admin');
      expect(card.textContent).not.toMatch(/Khusus dengan sopir|Lepas kunci saja/);
    }
    fireEvent.click(within(fleet).getByLabelText('Dengan sopir'));
    expect(fleet.querySelector('article')!.textContent).toContain('Harga via admin');
    const form = within(section(container, 'hero')).getByRole('form', { name: 'Pesan mobil' });
    const select = within(form).getByLabelText('Mobil') as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => `${o.textContent}${o.disabled ? ' [x]' : ''}`)).toEqual(['MPV keluarga · 7 kursi', 'SUV · 7 kursi']);
    expect((within(form).getAllByRole('radio') as HTMLInputElement[]).map((r) => r.disabled)).toEqual([false, false]);
    expect(form.textContent).toContain('Harga mobil ini via admin');
    const wa = decode(within(form).getByRole('link', { name: 'Pesan via WhatsApp' }));
    expect(wa).toContain('Mobil: MPV keluarga, 7 kursi (atau setara)');
    expect(wa).not.toMatch(/Durasi|Perkiraan/);
    expect(wa).toMatch(/Mohon info harga & ketersediaan\. Terima kasih\.$/);
    // Tanpa harga sama sekali → tanpa tabel harga (tidak ada yang bisa ditabelkan)
    expect(sectionKeys(container)).not.toContain('pricing');
  });

  it('film: tanpa keterangan / penutup / sebagian tahap → bagian itu hilang, tahap tetap terbaca; tanpa tahap → section hilang', () => {
    const container = demo({ film: { callouts: [], final_title: '', final_text: '', chapters: [{ title: 'Cek', text: 'Dicek.' }, { title: 'Jalan', text: '' }] } });
    const film = section(container, 'film');
    expect(within(film).queryByRole('list', { name: 'Keterangan mobil' })).toBeNull();
    expect(film.querySelectorAll('.km-co, .km-co-label, .km-co-badge')).toHaveLength(0);
    expect(film.textContent).not.toContain('Diantar ke lokasi Anda');
    expect(Array.from(within(film).getByRole('list', { name: 'Tahap sewa' }).querySelectorAll('h3')).map((h) => h.textContent)).toEqual(['Cek', 'Jalan']);
    cleanup();
    expect(sectionKeys(demo({ film: { chapters: [] } }))).not.toContain('film');
    // Film mati → "Lewati animasi" tidak ada; film terakhir sebelum footer → lewati ke footer
    cleanup();
    const last = demo(Object.fromEntries(['pricing', 'requirements', 'delivery', 'steps', 'testimonials', 'faq', 'contact'].map((k) => [k, { enabled: false }])));
    expect(within(section(last, 'film')).getByRole('link', { name: 'Lewati animasi' })).toHaveAttribute('href', '#footer');
  });

  it('harga tanpa foto & daftar, syarat satu tab tanpa foto, zona tanpa foto, ulasan tanpa foto & bintang → tata letak menyesuaikan', () => {
    const container = demo({
      pricing: { image: '', included: [] },
      requirements: { self_image: '', driver_image: '', driver_docs: [], driver_rules: [] },
      delivery: { zones: [{ name: 'Pusat kota', detail: '', fee: '', image: '' }], note: '' },
      testimonials: { image: '', items: [{ quote: 'Mobil bersih.', name: 'Rina', place: '', rating: '' }] },
      faq: { image: '' },
    });
    const pricing = section(container, 'pricing');
    expect(pricing.querySelector('img')).toBeNull();
    expect(pricing.querySelector('table')!.closest('.tpl-reveal')!.className).not.toContain('@6xl:col-span-8');
    const requirements = section(container, 'requirements');
    expect(within(requirements).queryByRole('tablist')).toBeNull();
    expect(within(requirements).queryByRole('tabpanel')).toBeNull();
    expect(requirements.querySelector('img')).toBeNull();
    expect(requirements.querySelectorAll('h3')).toHaveLength(4);
    const delivery = section(container, 'delivery');
    expect(delivery.querySelector('img')).toBeNull();
    expect(within(within(delivery).getByRole('list', { name: 'Zona antar-jemput' })).getByRole('button').textContent).toBe('01Pusat kota');
    const testimonials = section(container, 'testimonials');
    expect(testimonials.querySelector('img')).toBeNull();
    expect(testimonials.querySelector('[role="img"]')).toBeNull();
    expect(testimonials.querySelector('ul')!.className).toContain('@6xl:grid-cols-3');
    expect(section(container, 'faq').querySelector('img')).toBeNull();
  });

  it('tanpa WhatsApp → kartu pesan menuju Kontak, tautan FAQ & tombol footer hilang; tanpa media sosial & ajakan → footer ringkas', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    const container = demo({ contact: { whatsapp: '' }, footer: { instagram: '', tiktok: '', cta_title: '' } });
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    const form = within(section(container, 'hero')).getByRole('form', { name: 'Pesan mobil' });
    expect(within(form).getByRole('link', { name: 'Lihat kontak' })).toHaveAttribute('href', '#kontak');
    expect(within(section(container, 'faq')).queryByRole('link', { name: /Chat admin di WhatsApp/ })).toBeNull();
    expect(Array.from(section(container, 'contact').querySelectorAll('dt')).map((dt) => dt.textContent)).toEqual(['Garasi', 'Jam', 'Telepon', 'Email']);
    const footer = container.querySelector('footer')!;
    expect(footer.textContent).not.toContain('Butuh mobil hari ini?');
    expect(footer.textContent).not.toContain('Media sosial');
    expect(within(footer).queryByRole('link', { name: 'Chat admin' })).toBeNull();
  });

  it('section mati keluar dari halaman & menu; footer mati → tanpa <footer>', () => {
    const container = demo({ faq: { enabled: false }, testimonials: { items: [] }, delivery: { enabled: false } });
    for (const key of ['faq', 'testimonials', 'delivery']) expect(sectionKeys(container), key).not.toContain(key);
    expect(Array.from(container.querySelector('header nav')!.querySelectorAll('a')).map((a) => a.getAttribute('href'))).not.toContain('#faq');
    cleanup();
    expect(demo({ footer: { enabled: false } }).querySelector('footer')).toBeNull();
  });
});

describe('Kemudi: editor CMS', () => {
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
      // Syarat sewa punya dua list "Dokumen" dan dua list "Aturan" (tab 1 & 2): list ke-n = tombol ke-n bernama sama
      const nth: Record<string, number> = {};
      for (const f of s.fields) {
        expect(container.textContent, `${s.key}.${f.key}`).toContain(f.label);
        if (!isListField(f)) continue;
        const n = (nth[f.itemLabel] = (nth[f.itemLabel] ?? -1) + 1);
        expect(box.getAllByRole('button', { name: new RegExp(`Tambah ${f.itemLabel}`, 'i') })[n], `${s.key}.${f.key}`).toBeInTheDocument();
        const toggle = box.getAllByRole('button', { name: new RegExp(`^${f.itemLabel} 1(?![0-9])`) })[n];
        fireEvent.click(toggle);
        expect(toggle, `${s.key}.${f.key}`).toHaveAttribute('aria-expanded', 'true');
        const panel = document.getElementById(toggle.getAttribute('aria-controls')!)!;
        for (const sub of f.fields) expect(panel.textContent, `${s.key}.${f.key}.${sub.key}`).toContain(sub.label);
      }
      unmount();
    }
  }, 60_000);
});

describe('Kemudi: data katalog', () => {
  const MIGRATION = 'database/migrations/2026-10-29_052_kemudi_template.sql';
  const sql = () => readFileSync(resolve(ROOT, MIGRATION), 'utf8');

  it('migrasi 052: baris kemudi dengan template_code, kategori baru Travel & Transportasi, harga, pratinjau .webp, fitur, salinan jujur', () => {
    const text = sql();
    expect(text).toContain("'kemudi'");
    expect(text).toContain("'Travel & Transportasi'");
    expect(text).toContain('1590000.00');
    expect(text).toContain("'/assets/templates/kemudi-preview.webp'");
    expect(text).toContain('\'["/assets/templates/kemudi-1.webp","/assets/templates/kemudi-2.webp"]\'');
    expect(text).toMatch(/Pemesanan hanya menyusun pesan WhatsApp/);
    expect(text).toMatch(/tidak ada pembayaran online/);
    expect(text).toMatch(/dokumen tidak diunggah atau disimpan di website/);
    expect(text).not.toMatch(/termasuk domain|domain, hosting|dijamin|garansi|terbaik|asuransi|bersertifikat|berizin/i);
    expect(text).not.toMatch(/\b(Toyota|Avanza|Innova|Hi-?Ace|Alphard|Pajero|Fortuner|Elf|Hino)\b/i);
    expect(text).toMatch(/kategori baru; halaman kategorinya ditambahkan di kode yang sama/);
    const features = JSON.parse(/features\s+= '(\[[^']*\])'/.exec(text)![1]) as string[];
    expect(features.length).toBeGreaterThanOrEqual(6);
    expect(features.length).toBeLessThanOrEqual(8);
    expect(features[features.length - 1]).toBe('Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)');
    // Berkas galeri yang disebut migrasi benar-benar ada
    const gallery = JSON.parse(/gallery\s+= '(\[[^']*\])'/.exec(text)![1]) as string[];
    expect(gallery).toEqual(['/assets/templates/kemudi-1.webp', '/assets/templates/kemudi-2.webp']);
    for (const url of gallery) expect(existsSync(publicFile(url)), url).toBe(true);
  });

  it('migrasi 052 aman diulang (INSERT IGNORE + UPDATE berdasarkan slug, tanpa DELETE) dan tercatat di schema_migrations', () => {
    const raw = sql();
    expect(raw).toMatch(/Domain\s+(--\s+)?tidak termasuk harga template/);
    expect(raw).toMatch(/FIKTIF/);
    expect(raw).toMatch(/Unsplash/);
    expect(raw).toMatch(/SETELAH kode/);
    expect(raw).toMatch(/MENIMPA perubahan admin/);
    const text = raw.replace(/^--.*$/gm, '');
    expect(text).toMatch(/INSERT IGNORE INTO templates/);
    expect(text).toMatch(/WHERE slug = 'kemudi';/);
    expect(text).toMatch(/sort_order\s+= 35/);
    expect(text).toMatch(/status\s+= 'published'/);
    expect(text).toMatch(/price\s+= 1590000\.00/);
    expect(text).not.toMatch(/\bDELETE\b|\bDROP\b|\bTRUNCATE\b/i);
    expect(text).toContain("VALUES ('2026-10-29_052', 'templates: katalog Kemudi')");
  });

  it('gambar pratinjau katalog ada di public/, 1600×1000, VP8/VP8X, dan ringan', () => {
    for (const name of ['kemudi-preview', 'kemudi-1', 'kemudi-2']) {
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
    const title = (catalogSeo.title ?? '').replace('{nama}', 'Kemudi').replace('{harga_singkat}', 'Rp1,59 jt');
    expect(title).toBe('Kemudi: Template Website Rental Mobil – Rp1,59 jt');
    expect(title.length).toBeLessThanOrEqual(60);
    expect(catalogSeo.description).toMatch(/^.{1,69} \{harga\} sudah termasuk hosting & SSL tahun pertama; domain mulai \{domain_mulai\}\/tahun\.$/);
    expect(catalogSeo.niche).toBe('Rental Mobil');
    expect(catalogSeo.updated).toBe('2026-10-30');
    expect(catalogPage.h1).toBe('{nama}: Template Website Rental Mobil');
    expect(catalogPage.niche).toBe('rental mobil');
    const text = JSON.stringify(catalogContent);
    expect(text).toMatch(/fiktif/);
    expect(text).toContain('template website rental mobil');
    expect(text).toMatch(/Pemesanan hanya menyusun pesan WhatsApp/);
    expect(text).toMatch(/tidak ada pembayaran online/);
    expect(text).toMatch(/dokumen tidak diunggah atau disimpan di website/);
    expect(text).toMatch(/Tidak ada ketersediaan mobil real-time dan tidak ada pelacakan GPS/);
    expect(text).not.toMatch(/\b(dijamin|garansi|terbaik nomor|rating \d|bintang \d|#1)\b|1\.590\.000|termasuk domain|asuransi|bersertifikat|berizin/i);
    expect(text).not.toMatch(/\b(Toyota|Avanza|Innova|Hi-?Ace|Alphard|Pajero|Fortuner|Elf|Hino)\b/i);
    expect(text).not.toMatch(/\d+ (hari|jam) kerja/);
    expect(catalogContent.guides).toEqual(['template-vs-jasa-website-custom', 'biaya-website-company-profile']);
    expect(Object.keys(catalogContent.imageAlts ?? {})).toEqual(['kemudi-preview.webp', 'kemudi-1.webp', 'kemudi-2.webp']);
  });
});

describe('Kemudi: konten aneh', () => {
  it('angka, null, dan string di tempat list tidak membuat crash; tautan & gambar berbahaya dibuang', () => {
    const weird = {
      hero: { image: 'javascript:alert(1)', header_url: 'javascript:alert(1)', subtitle: 7, highlight: 'tidak ada di judul' },
      fleet: { items: [null, 'x', { name: 3 }, { name: 'Mobil A', price_24: 'abc', price_driver: {}, image: 'javascript:alert(1)', seats: [] }] },
      film: { chapters: 'x', callouts: [null, { text: 5 }, { text: 'Bersih' }] },
      pricing: { included: 7, image: 'vbscript:x' },
      requirements: { self_docs: [null, { title: 'KTP' }], self_rules: 'x', driver_docs: 5, self_image: 'javascript:x' },
      delivery: { zones: [{ name: 'Zona A', fee: 5, image: 'javascript:alert(1)' }, 'x'] },
      steps: { items: 5 },
      testimonials: { items: [{ quote: 'Bagus', rating: '9' }, null] },
      faq: { items: [{ question: 2, answer: null }], link_url: 'vbscript:x' },
      contact: { whatsapp: 'abc', maps_url: 'javascript:alert(1)' },
      footer: { instagram: 'javascript:alert(1)' },
      brand: { accent_color: 'biru' },
    } as unknown as SiteContent;
    const { container } = render(<def.Component content={resolveContent(def, weird)} />);
    expect(container.querySelector('a[href^="javascript:"], a[href^="vbscript:"]')).toBeNull();
    expect(container.querySelector('img[src^="javascript:"], img[src^="vbscript:"]')).toBeNull();
    expect(container.querySelector('h1')!.textContent).toBe('Sewa mobil tanpa ribet, harga jelas.');
    expect(section(container, 'fleet').textContent).toContain('Mobil A');
    expect(container.textContent).not.toMatch(/NaN|\[object Object\]|undefined|Infinity/);
    expect(rootStyle(container, '--km-ink')).toBe('#0050ff');
    expect(rootStyle(container, '--tpl-accent')).toBe('#0050ff');
    cleanup();
    for (const content of [{}, null]) {
      const { container: empty } = render(<def.Component content={content as unknown as SiteContent} />);
      expect(empty.querySelector('[data-tpl-root]')).not.toBeNull();
      cleanup();
    }
  });

  it('teks kembar di daftar (butir harga, aturan, keterangan film) tetap tampil semua, tanpa kunci React ganda', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const container = still({
      pricing: { included: [{ text: 'Sama' }, { text: 'Sama' }] },
      requirements: { self_rules: [{ text: 'Sama' }, { text: 'Sama' }] },
      film: { callouts: [{ text: 'Sama' }, { text: 'Sama' }] },
    });
    expect(Array.from(section(container, 'pricing').querySelectorAll('ul li')).map((li) => li.textContent)).toEqual(['Sama', 'Sama']);
    expect(within(section(container, 'requirements')).getAllByText('Sama')).toHaveLength(2);
    expect(within(section(container, 'film')).getByRole('list', { name: 'Keterangan mobil' }).querySelectorAll('li')).toHaveLength(2);
    expect(error.mock.calls.filter((call) => /same key/i.test(String(call[0])))).toEqual([]);
    error.mockRestore();
  });

  it('semua section mati → tidak ada [data-tpl-section] dan tanpa footer', () => {
    const off = Object.fromEntries(def.sections.filter((s) => s.toggleable).map((s) => [s.key, { enabled: false }]));
    const container = demo(off);
    expect(container.querySelectorAll('[data-tpl-section]')).toHaveLength(0);
    expect(container.querySelector('footer')).toBeNull();
  });
});

describe('Kemudi: perbaikan tinjauan live 2026-10-31', () => {
  const cls = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/);

  it('"Lewati animasi" di pita kosong paling atas section film (8px), di luar panggung — tidak lagi di atas label "02 Proses" & H2; scroll-margin di bawah header lengket', () => {
    for (const make of [() => demo(), () => still()]) {
      const film = section(make(), 'film');
      const skip = within(film).getByRole('link', { name: 'Lewati animasi' });
      expect(skip.parentElement).toBe(film);
      expect(film.querySelector('[data-film-progress]')!.contains(skip)).toBe(false);
      expect(cls(skip)).toEqual(expect.arrayContaining(['sr-only', 'left-5', 'top-2', '@2xl:left-8', '@5xl:left-12', '@min-[96rem]:left-16', 'scroll-mt-[calc(var(--tpl-sticky-top,0px)+96px)]', 'focus:not-sr-only', 'focus:absolute']));
      expect(skip.className).not.toContain('focus:top-[84px]');
      cleanup();
    }
  });

  it('kartu pesan hero: tinggi tidak ikut layanan/mobil — rincian selalu 2 baris dicadangkan (rata bawah), kolom total selebar 8 digit di layar lebar; lajur kanan tablet & catatan dipersempit (tombol WhatsApp situs)', () => {
    const hero = readFileSync(resolve(ROOT, 'src/templates/kemudi/Hero.tsx'), 'utf8');
    expect(hero).toContain("const BREAKDOWN = 'flex min-h-[2lh] items-end @max-[22rem]:min-h-[3lh]';");
    expect(hero).not.toContain('@md:min-h-0');
    const form = section(demo(), 'hero').querySelector('form')!;
    const result = Array.from(form.querySelectorAll('div')).find((el) => el.className.includes('border-t') && el.className.includes('justify-between'))!;
    expect(cls(result)).toEqual(expect.arrayContaining(['@2xl:pr-10', '@5xl:pr-0']));
    const total = result.querySelector('p.shrink-0 > span')!;
    expect(cls(total)).toEqual(expect.arrayContaining(['grid', 'text-[28px]', '@5xl:min-w-[6.2em]']));
    const note = Array.from(form.querySelectorAll('p')).find((p) => p.textContent === 'Harga perkiraan; ketersediaan dikonfirmasi admin. Tidak ada pembayaran online.')!;
    expect(cls(note)).toEqual(expect.arrayContaining(['text-center', '@5xl:px-6']));
  });

  it('footer: hak cipta & tagline berhenti di kiri tombol WhatsApp melayang di semua lebar (HP 72px, 576–767px 96px dari tepi)', () => {
    const footer = demo().querySelector('footer')!;
    const bottom = Array.from(footer.querySelectorAll('div')).find((el) => el.textContent?.startsWith('©'))!;
    expect(cls(bottom)).toEqual(expect.arrayContaining(['pr-13', '@xl:pr-19', '@2xl:pr-16', '@3xl:pr-[72px]']));
  });
});
