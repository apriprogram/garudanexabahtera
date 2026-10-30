// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/lajur.test.tsx
// Lajur (sewa bus pariwisata "bold livery" 2026-10-29): skema CMS & konten demo, foto, salinan jujur (formulir hanya
// menyusun pesan WhatsApp, harga contoh, tanpa merek/model kendaraan, tanpa klaim izin/asuransi), helper model (warna
// tema, menu & nomor label, tujuan tautan, harga, armada & denah kursi, kombinasi armada, formulir minta penawaran →
// pesan WhatsApp, rute, jam & progres film), demo (urutan section, hero coach + bilah penawaran, header + menu HP, tab
// armada + denah kursi + "Pilih bus ini", kalkulator rombongan, film diam & bergerak, tujuan, harga, cara sewa,
// testimoni, galeri selebar layar, akordeon, kontak, footer), wadah PENUH, datar tanpa bayangan, gerak (pratinjau CMS
// diam, CSS lj- bergerbang data-tpl-motion), warna tema, SEO situs pembeli, judul & gambar & tautan, konten opsional
// kosong, editor CMS, data katalog (migrasi 049 + pratinjau + halaman katalog), dan konten aneh.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionEditor } from '../../pages/account/cms/SectionEditor';
import { validateContent } from '../../pages/account/cms/validation';
import { seo as catalogSeo, page as catalogPage } from '../../content/templates/lajur';
import { content as catalogContent } from '../../content/templates/lajur.content';
import { TEMPLATES, resolveContent } from '../index';
import { iconKey } from '../lajur/icons';
import {
  EMPTY_QUOTE,
  GREY,
  HERO_SCRIM,
  INK,
  MAX_BUSES,
  NBSP,
  PAGE_SECTIONS,
  POSTER_P,
  busSize,
  chapterAt,
  chapterStarts,
  cleanText,
  clockAt,
  clockMinutes,
  convoyLabel,
  convoyMessage,
  convoyPriceUnit,
  convoySeats,
  convoySlots,
  displayPhone,
  filmClock,
  filmProgress,
  formatLongDate,
  formatRupiah,
  groupThousands,
  lajurVars,
  messageMailHref,
  monogram,
  navItems,
  parseClock,
  parseFacilities,
  parseLayout,
  parsePrice,
  parseWhole,
  peopleStepBase,
  quoteMessage,
  quotePeople,
  readChapters,
  readFleet,
  readLajur,
  readRoutes,
  recommendConvoy,
  routeMessage,
  routeMeta,
  seatPlan,
  sectionItems,
  sectionNumbers,
  sectionShown,
  sectionTarget,
  todayIso,
  unitLabel,
  unitWords,
  validateQuote,
  type FleetUnit,
  type QuoteForm,
} from '../lajur/model';
import { LAJUR_PHOTOS } from '../lajur/photos';
import { WRAP } from '../lajur/styles';
import { applySiteHead, siteTitle } from '../siteHead';
import { SiteRenderer } from '../SiteRenderer';
import { contrast, parseHex } from '../shared/utils';
import { isListField, type SiteContent } from '../types';

// Demo panjang + getByRole di jsdom: bisa lewat 5 dtk saat suite berjalan paralel
vi.setConfig({ testTimeout: 30_000 });

const ROOT = process.cwd();
const def = TEMPLATES.lajur;
const ORDER = ['hero', 'fleet', 'convoy', 'film', 'routes', 'included', 'steps', 'testimonials', 'gallery', 'faq', 'contact'];
const sectionKeys = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-tpl-section]')).map((s) => s.getAttribute('data-tpl-section'));
const section = (root: HTMLElement, key: string) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`)!;
// Setup bersama (__tests__/setup.ts) memasang IntersectionObserver & matchMedia tiruan → demo() = gerak MENYALA (film
// bergerak; hook aman tanpa gulir nyata); still() = gerak mati (poster + daftar bab, seperti reduced motion).
const demo = (content: unknown = null, preview = false) => render(<SiteRenderer templateCode="lajur" content={content} preview={preview} />).container;
const still = (content: unknown = null) => render(<SiteRenderer templateCode="lajur" content={content} motion={false} />).container;
const rgb = (hex: string) => parseHex(hex)!;
const publicFile = (url: string) => resolve(ROOT, 'public', url.replace(/^\//, ''));
const rootStyle = (container: HTMLElement, name: string) => {
  const holder = Array.from(container.querySelectorAll<HTMLElement>('[style]')).find((el) => el.style.getPropertyValue(name));
  return holder?.style.getPropertyValue(name) ?? '';
};
const urls = (src: string) => {
  const asset = LAJUR_PHOTOS.asset(src)!;
  return [asset.src, ...asset.srcSet!.split(',').map((part) => part.trim().split(' ')[0])].filter((u, i, all) => all.indexOf(u) === i);
};
/** Spasi tak terputus → spasi biasa (satuan harga "/ hari" memakai NBSP agar tidak terbelah). */
const plain = (s: string | null | undefined) => (s ?? '').split(NBSP).join(' ');
const wait = (ms: number) => act(() => new Promise<void>((r) => setTimeout(r, ms)));
const decode = (a: Element) => decodeURIComponent(a.getAttribute('href') ?? '');
const WA = 'https://wa.me/6281234567890?text=';
const BRAND = 'Lajur Trans Wisata';
const DEMO = resolveContent(def, null);
const FLEET = readFleet(DEMO.fleet);
const quote = (patch: Partial<QuoteForm> = {}): QuoteForm => ({ people: '120', date: '2030-11-16', destination: 'Dieng', days: '2', ...patch });
const unit = (patch: Partial<FleetUnit>): FleetUnit => ({
  index: 0,
  name: 'Bus',
  seats: 40,
  layout: [2, 2],
  units: 0,
  price: 1_000_000,
  priceUnit: '/ hari',
  facilities: [],
  image: '',
  size: 'big',
  ...patch,
});
const TSX = ['Lajur', 'Header', 'Hero', 'Quote', 'Fleet', 'Convoy', 'Film', 'scenes', 'vehicles', 'Routes', 'Plan', 'Stories', 'Closing', 'Footer', 'ui', 'marks'];
const TS = ['index', 'styles', 'model', 'icons', 'hooks', 'schema', 'defaultContent', 'photos', 'geometry'];
const source = () =>
  [
    ...TSX.map((f) => readFileSync(resolve(ROOT, `src/templates/lajur/${f}.tsx`), 'utf8')),
    ...TS.map((f) => readFileSync(resolve(ROOT, `src/templates/lajur/${f}.ts`), 'utf8')),
    readFileSync(resolve(ROOT, 'src/templates/lajur/lajur.css'), 'utf8'),
  ].join('\n');
const css = () => readFileSync(resolve(ROOT, 'src/templates/lajur/lajur.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

// Tujuan gulir: kunci section, atau 'top' untuk [data-tpl-root] (goTo('hero') = awal halaman, Shell.tsx)
let scrolled: (string | null)[] = [];
beforeEach(() => {
  scrolled = [];
  Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
    scrolled.push(this.getAttribute('data-tpl-section') ?? (this.hasAttribute('data-tpl-root') ? 'top' : null));
  });
});
afterEach(cleanup);

describe('Lajur: skema & konten bawaan', () => {
  it('urutan form = urutan halaman, semua section bisa disembunyikan, field unik, teks berbatas, list berbatas', () => {
    expect(def.code).toBe('lajur');
    expect(def.name).toBe('Lajur');
    expect(def.features).toBeUndefined();
    expect(def.sections.map((s) => s.key)).toEqual(['brand', ...ORDER, 'footer']);
    expect([...PAGE_SECTIONS]).toEqual([...ORDER, 'footer']);
    const fields = (key: string) => def.sections.find((s) => s.key === key)!.fields.map((f) => f.key);
    const sub = (key: string, list: string) => {
      const f = def.sections.find((s) => s.key === key)!.fields.find((x) => x.key === list)!;
      return isListField(f) ? f.fields.map((x) => x.key) : [];
    };
    expect(fields('brand')).toEqual(['company_name', 'tagline', 'logo', 'accent_color']);
    expect(def.sections[0].fields.find((f) => f.key === 'accent_color')?.type).toBe('color');
    expect(def.sections[0].toggleable).toBeUndefined();
    expect(fields('hero')).toEqual(['eyebrow', 'title', 'highlight', 'subtitle', 'image', 'primary_label', 'secondary_label', 'header_label', 'header_url', 'quote_button', 'quote_note']);
    expect(fields('fleet')).toEqual(['eyebrow', 'title', 'subtitle', 'included_note', 'price_note', 'choose_label', 'map_label', 'items']);
    expect(sub('fleet', 'items')).toEqual(['name', 'seats', 'layout', 'units', 'price', 'price_unit', 'facilities', 'image']);
    expect(fields('convoy')).toEqual(['eyebrow', 'title', 'subtitle', 'default_people', 'note', 'button_label']);
    expect(fields('film')).toEqual(['eyebrow', 'title', 'subtitle', 'chapters']);
    expect(sub('film', 'chapters')).toEqual(['time', 'title', 'text']);
    expect(fields('routes')).toEqual(['eyebrow', 'title', 'subtitle', 'origin', 'price_unit', 'ask_label', 'items']);
    expect(sub('routes', 'items')).toEqual(['name', 'duration', 'price', 'image']);
    expect(fields('included')).toEqual(['eyebrow', 'title', 'subtitle', 'included_title', 'included', 'excluded_title', 'excluded', 'note']);
    expect(sub('included', 'excluded')).toEqual(['text', 'note']);
    expect(fields('steps')).toEqual(['eyebrow', 'title', 'subtitle', 'items']);
    expect(fields('testimonials')).toEqual(['eyebrow', 'title', 'items']);
    expect(sub('testimonials', 'items')).toEqual(['quote', 'name', 'role', 'trip']);
    expect(fields('gallery')).toEqual(['eyebrow', 'title', 'subtitle', 'items']);
    expect(sub('gallery', 'items')).toEqual(['image', 'caption']);
    expect(fields('faq')).toEqual(['eyebrow', 'title', 'subtitle', 'link_label', 'link_url', 'items']);
    expect(fields('contact')).toEqual(['eyebrow', 'title', 'subtitle', 'address', 'maps_query', 'maps_url', 'phone', 'email', 'whatsapp', 'whatsapp_message', 'hours']);
    expect(fields('footer')).toEqual(['cta_title', 'cta_text', 'cta_label', 'cta_url', 'description', 'note', 'copyright', 'instagram', 'facebook', 'linkedin', 'youtube', 'tiktok']);
    const contact = def.sections.find((s) => s.key === 'contact')!;
    expect(contact.fields.find((f) => f.key === 'whatsapp')?.type).toBe('phone');
    expect(contact.fields.find((f) => f.key === 'phone')?.type).toBe('phone');
    expect(contact.fields.find((f) => f.key === 'email')?.type).toBe('email');
    // Hero: foto latar bernama `image` (dibaca tes bersama new-templates)
    expect(def.sections.find((s) => s.key === 'hero')!.fields.find((f) => f.key === 'image')?.type).toBe('image');
    const max: Record<string, number> = {};
    for (const s of def.sections) {
      const keys = s.fields.map((f) => f.key);
      expect(new Set(keys).size, s.key).toBe(keys.length);
      expect(s.introduced).toBeUndefined();
      expect(def.defaultContent[s.key], s.key).toBeTypeOf('object');
      if (s.key !== 'brand') expect(s.toggleable, s.key).toBe(true);
      for (const f of s.fields) {
        expect(f.introduced, `${s.key}.${f.key}`).toBeUndefined();
        expect(f.label, `${s.key}.${f.key}`).toBeTruthy();
        if (isListField(f)) {
          expect(f.max, `${s.key}.${f.key}`).toBeGreaterThan(0);
          expect(f.itemLabel, `${s.key}.${f.key}`).toBeTruthy();
          max[`${s.key}.${f.key}`] = f.max!;
          for (const sub2 of f.fields) {
            expect(sub2.introduced, `${s.key}.${f.key}.${sub2.key}`).toBeUndefined();
            if (['text', 'textarea', 'phone', 'email'].includes(sub2.type)) expect(sub2.maxLength, `${s.key}.${f.key}.${sub2.key}`).toBeGreaterThan(0);
          }
        } else if (['text', 'textarea', 'phone', 'email'].includes(f.type)) {
          expect(f.maxLength, `${s.key}.${f.key}`).toBeGreaterThan(0);
        }
      }
    }
    // Batas list = yang disebut di halaman katalog (lajur.content.ts) dan di model (ITEMS)
    expect(max).toEqual({
      'fleet.items': 6,
      'film.chapters': 5,
      'routes.items': 8,
      'included.included': 10,
      'included.excluded': 8,
      'steps.items': 5,
      'testimonials.items': 6,
      'gallery.items': 6,
      'faq.items': 8,
    });
    const page = JSON.stringify(catalogContent);
    for (const phrase of ['Hingga 6 jenis bus', 'hingga 5 bab', 'Hingga 8 kartu tujuan', 'hingga 10 butir', 'hingga 8 butir', 'Hingga 5 langkah', 'Hingga 6 kutipan', 'hingga 6 foto', 'Hingga 8 pertanyaan']) {
      expect(page, phrase).toContain(phrase);
    }
    // Model memotong list sesuai batas skema
    const many = (n: number, item: Record<string, string>) => Array.from({ length: n }, () => ({ ...item }));
    expect(sectionItems('fleet', { items: many(9, { name: 'Bus', seats: '40' }) })).toHaveLength(6);
    expect(sectionItems('film', { chapters: many(9, { title: 'Bab' }) })).toHaveLength(5);
    expect(sectionItems('routes', { items: many(12, { name: 'Dieng' }) })).toHaveLength(8);
    expect(sectionItems('faq', { items: many(12, { question: 'Q' }) })).toHaveLength(8);
  });

  it('konten demo lolos validasi CMS, logo kosong, semua foto terdaftar, ada di public/, dipakai, dan beralt deskriptif', () => {
    const c = def.defaultContent;
    expect(validateContent(def, resolveContent(def, null))).toEqual({});
    expect(c.brand.logo).toBe('');
    expect(c.brand.company_name).toBe(BRAND);
    expect(c.brand.tagline).toBe('Sewa bus pariwisata Jawa–Bali');
    expect(c.brand.accent_color).toBe('#FFB703');
    expect(c.contact.whatsapp).toBe('081234567890');
    expect(c.contact.phone).toBe('081234567890');
    expect(c.contact.email).toBe('sewa@example.com');
    expect(c.hero.image).toBe('/assets/templates/photos/lajur-hero-1920.webp');
    for (const s of def.sections) if (s.key !== 'brand') expect(c[s.key].enabled, s.key).toBe(true);
    const photos = JSON.stringify(c).match(/\/assets\/templates\/photos\/[a-z0-9-]+\.webp/g) ?? [];
    for (const src of photos) expect(LAJUR_PHOTOS.asset(src), src).not.toBeNull();
    expect(LAJUR_PHOTOS.keys).toHaveLength(14);
    for (const key of LAJUR_PHOTOS.keys) {
      expect(key.startsWith('lajur-'), key).toBe(true);
      for (const url of urls(LAJUR_PHOTOS.src(key))) expect(existsSync(publicFile(url)), url).toBe(true);
      expect(photos, `${key} dipakai di konten demo`).toContain(LAJUR_PHOTOS.src(key));
      expect(LAJUR_PHOTOS.alt(LAJUR_PHOTOS.src(key), '').split(' ').length, key).toBeGreaterThanOrEqual(5);
    }
    // Simbol bawaan juga tersedia sebagai SVG mandiri, path sama dengan komponen
    const mark = readFileSync(publicFile('/assets/templates/logos/lajur-mark.svg'), 'utf8');
    const component = readFileSync(resolve(ROOT, 'src/templates/lajur/marks.tsx'), 'utf8');
    const paths = mark.match(/ d="[^"]+"/g) ?? [];
    expect(paths).toHaveLength(1);
    for (const d of paths) expect(component, d).toContain(d.trim());
    expect(mark).toMatch(/viewBox="0 0 32 32"/);
    expect(mark).toMatch(/width="32" height="32"/);
    expect(mark).toMatch(/role="img"/);
    expect(mark).toMatch(/<title>/);
    expect(mark).toContain('fill="currentColor"');
    expect(mark).toContain('fill-rule="evenodd"');
    expect(component).toContain('fillRule="evenodd"');
    expect(component).not.toMatch(/<text/);
    // Judul tab situs pembeli ≤ 60 huruf, deskripsi hero 120–140, judul hero ≤ 8 kata, label hero ≤ 60
    expect(`${c.brand.company_name} — ${c.brand.tagline}`.length).toBeLessThanOrEqual(60);
    expect(String(c.hero.subtitle).length).toBeGreaterThanOrEqual(120);
    expect(String(c.hero.subtitle).length).toBeLessThanOrEqual(140);
    expect(String(c.hero.title).split(' ').length).toBeLessThanOrEqual(8);
    expect(String(c.hero.eyebrow).length).toBeLessThanOrEqual(60);
    expect(String(c.hero.title)).toContain(String(c.hero.highlight));
    // Satu pola kepala section: H2 ≤ 8 kata, kalimat pengantar ≤ 110 huruf; kartu ≤ 120 huruf ("teks jangan keramaian")
    for (const key of ORDER.filter((k) => k !== 'hero')) {
      expect(String(c[key].title).split(' ').length, key).toBeLessThanOrEqual(8);
      if (c[key].subtitle) expect(String(c[key].subtitle).length, key).toBeLessThanOrEqual(110);
    }
    for (const ch of c.film.chapters as { text: string }[]) expect(ch.text.length).toBeLessThanOrEqual(90);
    for (const st of c.steps.items as { text: string }[]) expect(st.text.length).toBeLessThanOrEqual(110);
    for (const t of c.testimonials.items as { quote: string }[]) expect(t.quote.length).toBeLessThanOrEqual(120);
    // Angka di salinan = data: armada 6 / 4 / 3 unit; testimoni "dua big bus dan satu microbus untuk 112 peserta" = model
    expect(FLEET.map((u) => `${unit(u).name}:${u.seats}:${u.units}`)).toEqual(['Big bus:50:6', 'Medium bus:33:4', 'Microbus:15:3']);
    expect(String((c.testimonials.items as { quote: string }[])[1].quote)).toContain('dua big bus dan satu microbus untuk 112 peserta');
    expect(convoyLabel(recommendConvoy(FLEET, 112)!)).toBe('2 Big bus + 1 Microbus');
    expect((c.routes.items as unknown[]).length).toBe(8);
  });

  // CREDITS.md gets this template's section at integration
  it('setiap kunci foto tercatat di CREDITS.md', () => {
    const credits = readFileSync(resolve(ROOT, 'public/assets/templates/photos/CREDITS.md'), 'utf8');
    expect(LAJUR_PHOTOS.keys.filter((key) => !credits.includes(`\`${key}-*\``))).toEqual([]);
  });

  it('foto demo ringan: hero 800/1280/1920, WebP ≤ 140 KB per file (800w ≤ 90 KB), total ≤ 2,5 MB', () => {
    expect(LAJUR_PHOTOS.asset(def.defaultContent.hero.image as string)!.srcSet).toBe(
      '/assets/templates/photos/lajur-hero-800.webp 800w, /assets/templates/photos/lajur-hero-1280.webp 1280w, /assets/templates/photos/lajur-hero-1920.webp 1920w',
    );
    let total = 0;
    let files = 0;
    for (const key of LAJUR_PHOTOS.keys) {
      for (const url of urls(LAJUR_PHOTOS.src(key))) {
        expect(url, url).toMatch(/\.webp$/);
        const kb = statSync(publicFile(url)).size / 1024;
        expect(kb, url).toBeLessThanOrEqual(url.endsWith('-800.webp') ? 90 : 140);
        const head = readFileSync(publicFile(url));
        expect(head.toString('ascii', 0, 4), url).toBe('RIFF');
        expect(head.toString('ascii', 8, 12), url).toBe('WEBP');
        total += kb;
        files += 1;
      }
    }
    expect(files).toBe(29);
    expect(total).toBeLessThanOrEqual(2500);
  });

  it('salinan demo jujur: tanpa klaim, tanpa merek/model bus, tanpa klaim izin/asuransi; hanya pesan WhatsApp, harga contoh', () => {
    const text = JSON.stringify(def.defaultContent);
    expect(text).not.toMatch(/dijamin|garansi|pasti|terbaik|nomor 1|#1|termurah|100%|paling aman|anti telat/i);
    expect(text).not.toMatch(
      /\b(Mercedes|Benz|Hino|Scania|Volvo|Toyota|Avanza|Innova|HiAce|Elf|Alphard|Pajero|Isuzu|Mitsubishi|Fuso|MAN|Jetbus|Adiputro|Laksana|Tentrem|Hyundai|Daihatsu|Suzuki)\b/i,
    );
    expect(text).not.toMatch(/izin trayek|berizin|Kemenhub|Dishub|terdaftar resmi|ASITA|IPOMI|PAWIBA|uji KIR|\bISO\b|asuransi|Jasa Raharja|bersertifikat|e-tiket|GPS/i);
    // Kalimat "tidak dilakukan" (dikunci, lihat integration.md)
    expect(def.defaultContent.hero.quote_note).toBe(
      'Formulir hanya menyusun pesan WhatsApp; harga final dan ketersediaan armada dikonfirmasi admin. Tidak ada pembayaran online.',
    );
    expect(def.defaultContent.fleet.price_note).toBe('Harga contoh, dikonfirmasi admin');
    expect(def.defaultContent.convoy.note).toBe('Perkiraan dari harga contoh per hari. Susunan armada final dari admin.');
    expect(def.defaultContent.included.note).toBe('Harga di halaman ini contoh dan bisa berubah; harga final dikonfirmasi admin lewat WhatsApp.');
    expect(text).toContain('Tanda jadi dibayar sesuai kesepakatan dengan admin, bukan di website.');
    expect(text).toContain('Tidak ada pembayaran di website. Tanda jadi dan pelunasan dibicarakan langsung dengan admin.');
    expect(def.defaultContent.footer.note).toBe('Harga dan armada di website ini contoh; konfirmasi ke admin sebelum memesan.');
    // Proses, bukan klaim: bus dicek sebelum berangkat, sopir cadangan
    expect(text).toContain('Bus dicek sebelum berangkat');
    expect(text).toContain('Sopir cadangan untuk perjalanan jauh');
    // Kontak contoh, tanpa foto wajah pelanggan (inisial)
    expect(text).toContain('@example.com');
    expect(text).not.toMatch(/@(gmail|yahoo)\./);
    expect(JSON.stringify(def.defaultContent.testimonials)).not.toMatch(/\.webp/);
    for (const t of def.defaultContent.testimonials.items as { name: string }[]) expect(t.name.split(' ')).toHaveLength(1);
    // Kelas bus, bukan merek: "Big bus", "Medium bus", "Microbus"
    expect(FLEET.map((u) => u.name)).toEqual(['Big bus', 'Medium bus', 'Microbus']);
  });
});

describe('Lajur: helper model', () => {
  it('warna tema: teks aksen ≥ 4,5:1 di putih & abu hangat, aksen terang ≥ 4,5:1 di pita tinta; tidak valid → bawaan', () => {
    const white = rgb('#ffffff');
    expect(lajurVars('#FFB703')).toEqual({ '--lj-ink': '#815d06', '--lj-bright': '#ffb703', '--lj-hero': '#ffb703' });
    // Sorotan judul hero di atas lapisan tinta foto: dihitung di latar paling terang (tinta 80% di atas putih)
    expect(HERO_SCRIM).toEqual([67, 69, 72]);
    for (const accent of ['#FFB703', '#0050FF', '#D81E5B', '#277A36', '#B5446E', '#FACC15', '#C6F135', '#FFFFFF', '#000000', '#14161A', '#6EE7B7', '#7C3AED', '#F3F2EE', '#1D4ED8']) {
      const vars = lajurVars(accent) as Record<string, string>;
      const ink = rgb(vars['--lj-ink']);
      const bright = rgb(vars['--lj-bright']);
      expect(contrast(ink, GREY), accent).toBeGreaterThanOrEqual(4.5);
      expect(contrast(ink, white), accent).toBeGreaterThanOrEqual(4.5);
      expect(contrast(bright, INK), accent).toBeGreaterThanOrEqual(4.5);
      expect(contrast(rgb(vars['--lj-hero']), HERO_SCRIM), accent).toBeGreaterThanOrEqual(4.5);
    }
    expect(lajurVars('zzz')).toEqual(lajurVars('#FFB703'));
    expect(lajurVars('')).toEqual(lajurVars('#FFB703'));
  });

  it('menu: label pendek = label section, section kosong/tersembunyi keluar dari menu; nomor label mengikuti section tampil', () => {
    expect(navItems(DEMO).map((i) => `${i.key}:${i.label}`)).toEqual(['fleet:Armada', 'convoy:Rombongan', 'routes:Tujuan', 'included:Harga', 'faq:FAQ', 'contact:Kontak']);
    expect(navItems(DEMO).length).toBeLessThanOrEqual(6);
    expect(sectionNumbers(DEMO)).toEqual({
      fleet: '01',
      convoy: '02',
      film: '03',
      routes: '04',
      included: '05',
      steps: '06',
      testimonials: '07',
      gallery: '08',
      faq: '09',
      contact: '10',
    });
    const less = resolveContent(def, { fleet: { items: [{ seats: '50' }] }, film: { enabled: false }, faq: { items: [] } });
    expect(navItems(less).map((i) => i.key)).toEqual(['routes', 'included', 'contact']);
    expect(sectionNumbers(less)).toEqual({ routes: '01', included: '02', steps: '03', testimonials: '04', gallery: '05', contact: '06' });
    // Armada disembunyikan, data bus tetap dipakai kalkulator rombongan
    const hiddenFleet = resolveContent(def, { fleet: { enabled: false } });
    expect(navItems(hiddenFleet).map((i) => i.key)).toEqual(['convoy', 'routes', 'included', 'faq', 'contact']);
  });

  it('tujuan tautan: anchor Indonesia dan kunci section; anchor tak dikenal → null; tujuan tombol menu atas & pita footer', () => {
    expect(sectionTarget('#armada')).toBe('fleet');
    expect(sectionTarget('#bus')).toBe('fleet');
    expect(sectionTarget('#fleet')).toBe('fleet');
    expect(sectionTarget('#rombongan')).toBe('convoy');
    expect(sectionTarget('#kalkulator')).toBe('convoy');
    expect(sectionTarget('#perjalanan')).toBe('film');
    expect(sectionTarget('#tujuan')).toBe('routes');
    expect(sectionTarget('#rute')).toBe('routes');
    expect(sectionTarget('#harga')).toBe('included');
    expect(sectionTarget('#cara-sewa')).toBe('steps');
    expect(sectionTarget('#testimoni')).toBe('testimonials');
    expect(sectionTarget('#galeri')).toBe('gallery');
    expect(sectionTarget('#tanya-jawab')).toBe('faq');
    expect(sectionTarget('#kontak')).toBe('contact');
    expect(sectionTarget('#garasi')).toBe('contact');
    expect(sectionTarget('#penawaran')).toBe('hero');
    expect(sectionTarget('#beranda')).toBe('hero');
    expect(sectionTarget('#tidak-ada')).toBeNull();
    const m = readLajur(DEMO);
    expect(m.quoteAction).toEqual({ kind: 'section', target: 'hero' });
    expect(m.headerAction).toEqual({ kind: 'section', target: 'hero' });
    expect(m.linkOr('#armada', null)).toEqual({ kind: 'section', target: 'fleet' });
    expect(m.linkOr('#tidak-ada', m.quoteAction)).toEqual({ kind: 'section', target: 'hero' });
    expect(m.linkOr('https://contoh.test/brosur', null)).toEqual({ kind: 'external', href: 'https://contoh.test/brosur' });
    expect(m.linkOr('javascript:alert(1)', null)).toBeNull();
    expect(m.afterFilm).toBe('routes');
    const noHero = readLajur(resolveContent(def, { hero: { enabled: false } }));
    expect(noHero.headerAction).toEqual({ kind: 'section', target: 'contact' });
    expect(noHero.linkOr('#penawaran', null)).toBeNull();
    const onlyWa = readLajur(resolveContent(def, { hero: { enabled: false }, contact: { enabled: false } }));
    expect(onlyWa.headerAction?.kind).toBe('external');
    const none = readLajur(resolveContent(def, { hero: { enabled: false }, contact: { enabled: false, whatsapp: '' } }));
    expect(none.headerAction).toBeNull();
    expect(readLajur(resolveContent(def, { hero: { header_url: '#harga' } })).headerAction).toEqual({ kind: 'section', target: 'included' });
    expect(readLajur(resolveContent(def, { routes: { enabled: false } })).afterFilm).toBe('included');
  });

  it('section tampil hanya bila berisi', () => {
    for (const key of ORDER) expect(sectionShown(DEMO, key), key).toBe(true);
    const empty = resolveContent(def, {
      fleet: { items: [{ seats: '50' }, { name: 'Tanpa kursi', seats: '' }] },
      film: { chapters: [{ time: '05.00' }] },
      routes: { items: [{ duration: '1 hari' }] },
      included: { included: [{ text: '' }], excluded: [] },
      steps: { items: [{ text: 'tanpa judul' }] },
      testimonials: { items: [{ name: 'tanpa kutipan' }] },
      gallery: { items: [{ caption: 'tanpa foto', image: '' }] },
      faq: { items: [{ answer: 'tanpa pertanyaan' }] },
    });
    for (const key of ['fleet', 'convoy', 'film', 'routes', 'included', 'steps', 'testimonials', 'gallery', 'faq']) expect(sectionShown(empty, key), key).toBe(false);
    // Hero dan kontak tampil selama diaktifkan
    for (const key of ['hero', 'contact', 'footer']) expect(sectionShown(empty, key), key).toBe(true);
    expect(sectionShown(resolveContent(def, { contact: { enabled: false } }), 'contact')).toBe(false);
    // Kalkulator memakai data bus walau Armada disembunyikan
    expect(sectionShown(resolveContent(def, { fleet: { enabled: false } }), 'convoy')).toBe(true);
    expect(sectionShown(DEMO, 'tidak-ada')).toBe(false);
    expect(sectionShown(DEMO, 'brand')).toBe(false);
  });

  it('angka & teks: harga bersatuan, bilangan bulat berbatas, ribuan bertitik, nomor HP, monogram, teks bersih', () => {
    expect(parsePrice('3200000')).toBe(3_200_000);
    expect(parsePrice('Rp3.200.000')).toBe(3_200_000);
    expect(parsePrice('Rp 3.200.000,-')).toBe(3_200_000);
    expect(parsePrice('3,2 jt')).toBe(3_200_000);
    expect(parsePrice('1.250 jt')).toBe(1_250_000_000);
    expect(parsePrice('1,5 juta')).toBe(1_500_000);
    expect(parsePrice('750 rb')).toBe(750_000);
    expect(parsePrice(12345)).toBe(12345);
    expect(parsePrice('')).toBe(0);
    expect(parsePrice('Harga menyusul')).toBe(0);
    expect(parsePrice(null)).toBe(0);
    expect(parsePrice('9'.repeat(30))).toBe(999_999_999_999);
    // Kata di depan/belakang & ekor sen dibuang; ada satuan → TIDAK pernah menggabung digit (pengali tidak hilang)
    expect(parsePrice('mulai 3,2 jt')).toBe(3_200_000);
    expect(parsePrice('3,2 jt / hari')).toBe(3_200_000);
    expect(parsePrice('Rp 3,5 juta per hari')).toBe(3_500_000);
    expect(parsePrice('3 juta 200 ribu')).toBe(3_200_000);
    expect(parsePrice('Rp3.200.000,00')).toBe(3_200_000);
    expect(parsePrice('Mulai Rp 3.200.000 / hari')).toBe(3_200_000);
    expect(parsePrice('Harga: Rp. 3.200.000')).toBe(3_200_000);
    expect(parsePrice('3.200.000 rupiah')).toBe(3_200_000);
    expect(parsePrice('IDR 3,200,000')).toBe(3_200_000);
    expect(parsePrice('3.200.000,50')).toBe(3_200_000);
    expect(parsePrice('750k')).toBe(750_000);
    expect(parsePrice('3 jt - 4 jt')).toBe(3_000_000);
    expect(parsePrice('Rp 1,2 M')).toBe(1_200_000_000);
    expect(parseWhole('50 kursi', 1, 99, 1)).toBe(50);
    expect(parseWhole('', 1, 99, 7)).toBe(7);
    expect(parseWhole('abc', 10, 300, 120)).toBe(120);
    expect(parseWhole('500', 10, 300, 120)).toBe(300);
    expect(parseWhole('5', 10, 300, 120)).toBe(10);
    expect(parseWhole(null, 0, 99, 0)).toBe(0);
    expect(groupThousands(8_700_000)).toBe('8.700.000');
    expect(groupThousands(-5)).toBe('-5');
    expect(formatRupiah(19_200_000)).toBe('Rp19.200.000');
    expect(formatRupiah(0)).toBe('Rp0');
    expect(displayPhone('081234567890')).toBe('0812-3456-7890');
    expect(displayPhone('(024) 555-0101')).toBe('(024) 555-0101');
    expect(displayPhone('')).toBe('');
    expect(monogram('Rina')).toBe('R');
    expect(monogram('Rina Kartika')).toBe('RK');
    expect(monogram('Bu Siti')).toBe('S');
    expect(monogram('')).toBe('?');
    expect(cleanText('a\u0000b\u0007  c', 10)).toBe('a b c');
    expect(cleanText('x'.repeat(500), 60)).toHaveLength(60);
  });

  it('armada: kursi, susunan, unit, harga, fasilitas (unik, maks. 8), gambar bus dari jumlah kursi, ikon fasilitas otomatis', () => {
    expect(FLEET).toEqual([
      {
        index: 0,
        name: 'Big bus',
        seats: 50,
        layout: [2, 2],
        units: 6,
        price: 3_200_000,
        priceUnit: '/ hari',
        facilities: ['AC', 'Kursi reclining', 'Toilet', 'Karaoke & TV', 'Port USB', 'Bagasi luas'],
        image: '',
        size: 'big',
      },
      {
        index: 1,
        name: 'Medium bus',
        seats: 33,
        layout: [2, 2],
        units: 4,
        price: 2_300_000,
        priceUnit: '/ hari',
        facilities: ['AC', 'Kursi reclining', 'Karaoke & TV', 'Port USB', 'Bagasi'],
        image: '',
        size: 'medium',
      },
      { index: 2, name: 'Microbus', seats: 15, layout: [2, 1], units: 3, price: 1_300_000, priceUnit: '/ hari', facilities: ['AC', 'Kursi reclining', 'Audio', 'Port USB'], image: '', size: 'micro' },
    ]);
    expect(unitLabel(FLEET[0])).toBe('Big bus 50 kursi');
    expect(busSize(50)).toBe('big');
    expect(busSize(40)).toBe('big');
    expect(busSize(39)).toBe('medium');
    expect(busSize(24)).toBe('medium');
    expect(busSize(23)).toBe('micro');
    expect(parseLayout('2-2', 50)).toEqual([2, 2]);
    expect(parseLayout('2 - 1', 15)).toEqual([2, 1]);
    expect(parseLayout('2x2', 33)).toEqual([2, 2]);
    expect(parseLayout('1+1', 20)).toEqual([1, 1]);
    expect(parseLayout('', 15)).toEqual([2, 1]);
    expect(parseLayout('', 33)).toEqual([2, 2]);
    expect(parseLayout('4-4', 50)).toEqual([2, 2]);
    expect(parseFacilities('AC, Kursi reclining; Toilet\nac, , Karaoke & TV')).toEqual(['AC', 'Kursi reclining', 'Toilet', 'Karaoke & TV']);
    expect(parseFacilities('a,b,c,d,e,f,g,h,i,j')).toHaveLength(8);
    expect(parseFacilities('')).toEqual([]);
    // Bus tanpa nama atau tanpa kursi tidak ikut; kursi dibatasi 1–99, unit 0 = tak terbatas
    const odd = readFleet({ items: [{ name: 'Tanpa kursi' }, { name: 'Raksasa', seats: '250', units: 'x', price: 'abc' }, { seats: '30' }] });
    expect(odd.map((u) => [u.name, u.seats, u.units, u.price, u.size])).toEqual([['Raksasa', 99, 0, 0, 'big']]);
    expect(FLEET.flatMap((u) => u.facilities.map(iconKey))).toEqual(['ac', 'seat', 'toilet', 'karaoke', 'usb', 'luggage', 'ac', 'seat', 'karaoke', 'usb', 'luggage', 'ac', 'seat', 'audio', 'usb']);
    expect(iconKey('Wi-Fi')).toBe('wifi');
    expect(iconKey('Colokan listrik')).toBe('charge');
    expect(iconKey('TV LED')).toBe('tv');
    expect(iconKey('Air mineral')).toBe('snack');
    expect(iconKey('Sesuatu')).toBe('check');
  });

  it('denah kursi: baris biasa + bangku belakang dari jumlah kursi & susunan (50 → 11 + 6, 33 → 7 + 5, 15 → 4 + 3)', () => {
    expect(seatPlan(50, [2, 2])).toEqual({ rows: 11, left: 2, right: 2, back: 6 });
    expect(seatPlan(33, [2, 2])).toEqual({ rows: 7, left: 2, right: 2, back: 5 });
    expect(seatPlan(15, [2, 1])).toEqual({ rows: 4, left: 2, right: 1, back: 3 });
    expect(seatPlan(5, [2, 1])).toEqual({ rows: 0, left: 2, right: 1, back: 5 });
    expect(seatPlan(150, [2, 2])).toEqual({ rows: 24, left: 2, right: 2, back: 3 });
    expect(seatPlan(Number.NaN, [2, 2])).toEqual({ rows: 0, left: 2, right: 2, back: 0 });
    for (const u of FLEET) {
      const plan = seatPlan(u.seats, u.layout);
      expect(plan.rows * (plan.left + plan.right) + plan.back, u.name).toBe(u.seats);
      expect(plan.back, u.name).toBeLessThanOrEqual(plan.left + plan.right + 2);
    }
  });

  it('denah kursi digambar tanpa kursi bertumpuk: bangku belakang yang penuh menyempitkan kursinya (50 kursi 2-2, 14 kursi 2-1)', () => {
    for (const items of [[{ name: 'Big bus', seats: '50', layout: '2-2', facilities: 'Toilet' }], [{ name: 'Microbus', seats: '14', layout: '2-1' }]]) {
      const container = still({ fleet: { items } });
      const fleet = section(container, 'fleet');
      fireEvent.click(within(fleet).getByRole('button', { name: /Lihat denah kursi/ }));
      const d = fleet.querySelector('[data-open="true"] svg path.fill-\\(--tpl-accent\\)')!.getAttribute('d')!;
      // Tiap kursi: "M{x+3} {y}h…v{tinggi−4}…"; bangku belakang = kursi dengan x paling kecil
      const seats = Array.from(d.matchAll(/M([\d.]+) ([\d.]+)h[\d.]+a2 2 0 0 1 2 2v([\d.]+)/g)).map(([, x, y, v]) => ({ x: Number(x), y: Number(y), h: Number(v) + 4 }));
      const minX = Math.min(...seats.map((s) => s.x));
      const back = seats.filter((s) => s.x === minX).sort((a, b) => a.y - b.y);
      expect(back.length, items[0].name).toBe(Number(items[0].seats) === 50 ? 6 : 5);
      for (let i = 1; i < back.length; i += 1) expect(back[i].y - back[i - 1].y, `${items[0].name} kursi ${i}`).toBeGreaterThanOrEqual(back[i - 1].h);
      cleanup();
    }
  });

  it('kombinasi armada: bus paling sedikit → kursi kosong paling sedikit → harga lebih rendah → urutan CMS; maks. 8 bus & batas unit', () => {
    const pick = (people: number, only: number | null = null) => {
      const c = recommendConvoy(FLEET, people, only);
      return c && { label: convoyLabel(c), buses: c.buses, seats: c.seats, spare: c.spare, price: c.price };
    };
    expect(pick(120)).toEqual({ label: '2 Big bus + 1 Medium bus', buses: 3, seats: 133, spare: 13, price: 8_700_000 });
    expect(pick(112)).toEqual({ label: '2 Big bus + 1 Microbus', buses: 3, seats: 115, spare: 3, price: 7_700_000 });
    expect(pick(45)).toEqual({ label: '1 Big bus', buses: 1, seats: 50, spare: 5, price: 3_200_000 });
    expect(pick(37)).toEqual({ label: '1 Big bus', buses: 1, seats: 50, spare: 13, price: 3_200_000 });
    expect(pick(33)).toEqual({ label: '1 Medium bus', buses: 1, seats: 33, spare: 0, price: 2_300_000 });
    expect(pick(60)).toEqual({ label: '1 Big bus + 1 Microbus', buses: 2, seats: 65, spare: 5, price: 4_500_000 });
    expect(pick(10)).toEqual({ label: '1 Microbus', buses: 1, seats: 15, spare: 5, price: 1_300_000 });
    expect(pick(300)).toEqual({ label: '6 Big bus', buses: 6, seats: 300, spare: 0, price: 19_200_000 });
    // Unit terbatas (big 6, medium 4): 366 → 6 Big + 2 Medium (8 bus, tepat); 367 → tidak muat dalam 8 bus
    expect(pick(366)).toEqual({ label: '6 Big bus + 2 Medium bus', buses: 8, seats: 366, spare: 0, price: 23_800_000 });
    expect(pick(367)).toBeNull();
    // Hanya jenis pilihan pengunjung ("Pilih bus ini")
    expect(pick(45, 2)).toEqual({ label: '3 Microbus', buses: 3, seats: 45, spare: 0, price: 3_900_000 });
    expect(pick(120, 0)).toEqual({ label: '3 Big bus', buses: 3, seats: 150, spare: 30, price: 9_600_000 });
    expect(pick(120, 2)).toBeNull();
    // Unit 0 = tidak dibatasi (tetap maks. 8 bus); batas bus bisa diatur
    const open = [unit({ name: 'A', seats: 40, units: 0 })];
    expect(recommendConvoy(open, 320)?.buses).toBe(8);
    expect(recommendConvoy(open, 321)).toBeNull();
    expect(recommendConvoy(open, 121, null, 3)).toBeNull();
    expect(MAX_BUSES).toBe(8);
    // Seri: harga lebih rendah menang; harga sama → jenis yang lebih atas di CMS
    const twins = [unit({ index: 0, name: 'A', price: 1_200_000 }), unit({ index: 1, name: 'B', price: 1_000_000 })];
    expect(convoyLabel(recommendConvoy(twins, 40)!)).toBe('1 B');
    const same = [unit({ index: 0, name: 'A' }), unit({ index: 1, name: 'B' })];
    expect(convoyLabel(recommendConvoy(same, 40)!)).toBe('1 A');
    // Bus tanpa harga di kombinasi → perkiraan harga 0 (disembunyikan); armada kosong / peserta rusak
    const unpriced = [unit({ index: 0, name: 'A', price: 0 })];
    expect(recommendConvoy(unpriced, 30)?.price).toBe(0);
    // Harga 0 = "menyusul", bukan paling murah: seri bus & kursi → kombinasi yang semua busnya berharga menang
    const vip = [unit({ index: 0, name: 'Big bus', seats: 50, price: 3_200_000 }), unit({ index: 1, name: 'Big bus VIP', seats: 50, price: 0 })];
    expect(recommendConvoy(vip, 45)).toMatchObject({ buses: 1, price: 3_200_000, picks: [{ unit: { name: 'Big bus' }, count: 1 }] });
    expect(convoyLabel(recommendConvoy(vip, 120)!)).toBe('3 Big bus');
    expect(recommendConvoy(vip, 120)!.price).toBe(9_600_000);
    // Hanya jenis tanpa harga yang dipilih → tetap direkomendasikan, perkiraan 0
    expect(recommendConvoy(vip, 45, 1)).toMatchObject({ buses: 1, price: 0 });
    // Satuan perkiraan = satuan yang sama di semua bus terpilih; berbeda → null (perkiraan disembunyikan)
    expect(convoyPriceUnit(recommendConvoy(FLEET, 120)!)).toBe('/ hari');
    const trips = [unit({ index: 0, name: 'A', priceUnit: '/ trip' }), unit({ index: 1, name: 'B', seats: 15, priceUnit: '/ hari' })];
    expect(convoyPriceUnit(recommendConvoy(trips, 40)!)).toBe('/ trip');
    expect(convoyPriceUnit(recommendConvoy(trips, 50)!)).toBeNull();
    expect(convoyMessage(40, recommendConvoy(trips, 40), BRAND)).toContain('Perkiraan harga: mulai Rp1.000.000 per trip');
    expect(convoyMessage(50, recommendConvoy(trips, 50), BRAND)).not.toContain('Perkiraan harga');
    expect(unitWords('/ hari')).toBe('per hari');
    expect(unitWords('/hari')).toBe('per hari');
    expect(unitWords('per trip')).toBe('per trip');
    expect(unitWords('')).toBe('');
    expect(recommendConvoy([], 30)).toBeNull();
    expect(recommendConvoy(FLEET, Number.NaN)).toMatchObject({ seats: 15, spare: 14 });
    // Teks hasil
    const c120 = recommendConvoy(FLEET, 120)!;
    expect(convoyLabel(c120, true)).toBe('2 Big bus 50 kursi + 1 Medium bus 33 kursi');
    expect(convoySeats(c120)).toBe('133 kursi · sisa 13 kursi');
    expect(convoySeats(recommendConvoy(FLEET, 300)!)).toBe('300 kursi · semua kursi terisi');
    expect(convoySlots(c120).map((s) => s.key)).toEqual(['0-0', '0-1', '1-0']);
    expect(convoySlots(null)).toEqual([]);
    expect(convoyMessage(120, c120, BRAND)).toBe(
      [
        'Halo Lajur Trans Wisata, saya ingin minta penawaran sewa bus untuk 120 peserta.',
        '',
        'Rekomendasi armada: 2 Big bus 50 kursi + 1 Medium bus 33 kursi (133 kursi)',
        'Perkiraan harga: mulai Rp8.700.000 per hari',
        '',
        'Mohon info harga dan ketersediaan armada. Terima kasih.',
      ].join('\n'),
    );
    expect(convoyMessage(400, null, '').split('\n')).toEqual([
      'Halo admin, saya ingin minta penawaran sewa bus untuk 400 peserta.',
      '',
      'Rekomendasi armada: mohon disusun admin',
      '',
      'Mohon info harga dan ketersediaan armada. Terima kasih.',
    ]);
  });

  it('formulir minta penawaran: peserta 1–500, tanggal wajib & tidak sebelum hari ini, tujuan wajib, lama sewa 1–7; pesan WhatsApp berurutan', () => {
    const today = '2026-10-29';
    expect(quotePeople('45')).toBe(45);
    expect(quotePeople(' 500 ')).toBe(500);
    for (const bad of ['', '0', '501', 'abc', '12a', '-3', '1.5']) expect(quotePeople(bad), bad).toBeNull();
    // Angka dasar tombol −/+: dibatasi 1–500 (600 → 500), kosong/0 → 0 (tombol + mengisi 1)
    expect(['45', '600', '999', '', '0', '1', '500'].map(peopleStepBase)).toEqual([45, 500, 500, 0, 0, 1, 500]);
    expect(EMPTY_QUOTE).toEqual({ people: '45', date: '', destination: '', days: '1' });
    expect(validateQuote(quote(), today)).toEqual({});
    expect(validateQuote(EMPTY_QUOTE, today)).toEqual({ date: 'Pilih tanggal berangkat.', destination: 'Tulis tujuan perjalanan.' });
    expect(validateQuote(quote({ people: '0' }), today).people).toBe('Isi jumlah peserta 1–500.');
    expect(validateQuote(quote({ people: '501' }), today).people).toBe('Isi jumlah peserta 1–500.');
    expect(validateQuote(quote({ date: '2026-10-28' }), today).date).toBe('Pilih tanggal hari ini atau sesudahnya.');
    expect(validateQuote(quote({ date: today }), today)).toEqual({});
    expect(validateQuote(quote({ date: '2027-02-30' }), today).date).toBe('Tanggal tidak valid.');
    expect(validateQuote(quote({ date: '14/11/2026' }), today).date).toBe('Tanggal tidak valid.');
    expect(validateQuote(quote({ destination: ' a ' }), today).destination).toBe('Tulis tujuan perjalanan.');
    expect(validateQuote(quote({ days: '8' }), today).days).toBe('Pilih lama sewa.');
    expect(validateQuote(quote({ days: '0' }), today).days).toBe('Pilih lama sewa.');
    const c120 = recommendConvoy(FLEET, 120);
    expect(quoteMessage(quote(), c120, BRAND)).toBe(
      [
        'Halo Lajur Trans Wisata, saya ingin minta penawaran sewa bus.',
        '',
        'Jumlah peserta: 120 orang',
        'Rekomendasi armada: 2 Big bus 50 kursi + 1 Medium bus 33 kursi',
        'Tanggal berangkat: Sabtu, 16 November 2030',
        'Lama sewa: 2 hari',
        'Tujuan: Dieng',
        '',
        'Mohon info harga dan ketersediaan armada. Terima kasih.',
      ].join('\n'),
    );
    // Jenis bus pilihan ikut tertulis; tanpa rekomendasi → disusun admin; tujuan dibersihkan
    expect(quoteMessage(quote({ people: '45', destination: '  Bromo\n\tSunrise ', days: '3' }), recommendConvoy(FLEET, 45, 2), '', FLEET[2]).split('\n')).toEqual([
      'Halo admin, saya ingin minta penawaran sewa bus.',
      '',
      'Jumlah peserta: 45 orang',
      'Jenis bus: Microbus 15 kursi',
      'Rekomendasi armada: 3 Microbus 15 kursi',
      'Tanggal berangkat: Sabtu, 16 November 2030',
      'Lama sewa: 3 hari',
      'Tujuan: Bromo Sunrise',
      '',
      'Mohon info harga dan ketersediaan armada. Terima kasih.',
    ]);
    expect(quoteMessage(quote({ people: '480' }), null, BRAND)).toContain('Rekomendasi armada: mohon disusun admin');
    expect(formatLongDate('2026-10-29')).toBe('Kamis, 29 Oktober 2026');
    expect(formatLongDate('2024-02-29')).toBe('Kamis, 29 Februari 2024');
    expect(formatLongDate('2026-13-01')).toBe('');
    expect(formatLongDate('')).toBe('');
    expect(todayIso(new Date(2026, 9, 29, 23, 59))).toBe('2026-10-29');
    expect(todayIso(new Date(2027, 0, 5))).toBe('2027-01-05');
    expect(messageMailHref('sewa@example.com', 'Permintaan penawaran sewa bus', 'Baris 1\nBaris 2')).toBe(
      'mailto:sewa@example.com?subject=Permintaan%20penawaran%20sewa%20bus&body=Baris%201%0ABaris%202',
    );
    expect(messageMailHref('bukan email', 'x', 'y')).toBe('');
  });

  it('rute: kartu dari CMS, baris meta, pesan WhatsApp "tanya rute ini"', () => {
    const routes = readRoutes(DEMO.routes);
    expect(routes.map((r) => r.name)).toEqual(['Dieng', 'Yogyakarta', 'Bromo', 'Malang & Batu', 'Bali', 'Bandung', 'Pantai Gunungkidul', 'Karimunjawa']);
    expect(routes[0]).toEqual({ index: 0, name: 'Dieng', duration: '1 hari', price: 3_500_000, image: '/assets/templates/photos/lajur-dieng-960.webp' });
    expect(routeMeta(routes[0], 'dari Semarang')).toBe('1 hari · dari Semarang');
    expect(routeMeta({ ...routes[0], duration: '' }, '')).toBe('');
    expect(routeMessage(routes[0], 'dari Semarang', BRAND)).toBe(
      'Halo Lajur Trans Wisata, saya ingin bertanya tentang sewa bus ke Dieng (1 hari · dari Semarang). Mohon info harga dan ketersediaan armada.',
    );
    expect(routeMessage({ ...routes[1], duration: '' }, '', '')).toBe('Halo admin, saya ingin bertanya tentang sewa bus ke Yogyakarta. Mohon info harga dan ketersediaan armada.');
  });

  it('film: jam bab (titik kunci), jam berjalan tepat di tiap bab, bab aktif, progres gulir (rumus kontrak), poster siang', () => {
    const chapters = readChapters(DEMO.film);
    expect(chapters.map((c) => `${c.time} ${c.title}`)).toEqual(['05.00 Penjemputan', '10.00 Istirahat', '13.00 Tiba di tujuan', '16.00 Kembali']);
    expect(parseClock('05.00')).toBe(300);
    expect(parseClock('5:30')).toBe(330);
    expect(parseClock('24.00')).toBeNull();
    expect(parseClock('12.60')).toBeNull();
    expect(parseClock('pagi')).toBeNull();
    // Empat bab = jadwal adegan (lajur.css): jemput 0, rest area 0,24 (bus berhenti), parkir di gerbang 0,50, pulang
    // 0,66; jumlah bab lain → jendela sama lebar
    expect(chapterStarts(4)).toEqual([0, 0.24, 0.5, 0.66]);
    expect(chapterStarts(3)).toEqual([0, 1 / 3, 2 / 3]);
    expect(chapterStarts(1)).toEqual([0]);
    expect(chapterStarts(0)).toEqual([]);
    const scene = css();
    expect(scene).toContain('--t1: clamp(0, (var(--p, 0) - 0.035) / 0.205, 1);');
    expect(scene).toContain('--t2: clamp(0, (var(--p, 0) - 0.36) / 0.14, 1);');
    expect(scene).toContain('--t3: clamp(0, (var(--p, 0) - 0.66) / 0.3, 1);');
    const clock = filmClock(chapters);
    expect(clock).toEqual({
      points: [
        [0, 300],
        [0.24, 600],
        [0.5, 780],
        [0.66, 960],
        [1, 1260],
      ],
    });
    // Saat bab menjadi aktif jam besar = jam bab itu (rel & keterangan berganti di titik yang sama); akhir film 21.00
    expect([0, 0.12, 0.24, 0.37, 0.5, 0.66, 0.83, 1].map((p) => clockAt(p, clock))).toEqual(['05.00', '07.30', '10.00', '11.30', '13.00', '16.00', '18.30', '21.00']);
    chapterStarts(chapters.length).forEach((start, i) => {
      expect(chapterAt(start, chapters.length)).toBe(i);
      expect(clockAt(start, clock)).toBe(chapters[i].time);
      if (i > 0) expect(chapterAt(start - 0.001, chapters.length)).toBe(i - 1);
    });
    expect(clockAt(1, clock)).toBe('21.00');
    expect(clockAt(POSTER_P, clock)).toBe('13.55');
    expect(clockMinutes(-1, clock)).toBe(300);
    expect(clockMinutes(Number.NaN, clock)).toBe(300);
    expect(clockMinutes(9, clock)).toBe(1260);
    // Melewati tengah malam (akhir = 1 jam setelah bab terakhir bila sudah lewat 21.00); jam rusak dilewati
    const night = filmClock([
      { time: '22.00', title: 'A', text: '' },
      { time: '01.00', title: 'B', text: '' },
      { time: '05.30', title: 'C', text: '' },
    ]);
    expect(night.points).toEqual([
      [0, 1320],
      [1 / 3, 1500],
      [2 / 3, 1770],
      [1, 1830],
    ]);
    expect([0, 1 / 6, 1 / 3, 2 / 3, 1].map((p) => clockAt(p, night))).toEqual(['22.00', '23.30', '01.00', '05.30', '06.30']);
    // Bab pertama tak terbaca → mulai 05.00
    const skipped = filmClock([
      { time: 'pagi', title: 'A', text: '' },
      { time: '10.00', title: 'B', text: '' },
      { time: '12.00', title: 'C', text: '' },
    ]);
    expect(skipped.points).toEqual([
      [0, 300],
      [1 / 3, 600],
      [2 / 3, 720],
      [1, 1260],
    ]);
    expect(clockAt(0, skipped)).toBe('05.00');
    // Satu jam terbaca → jam mulai dari bab itu (bukan 05.00 yang bertentangan dengan babnya), berakhir 21.00
    expect(filmClock([{ time: '07.00', title: 'A', text: '' }])).toEqual({ points: [[0, 420], [1, 1260]] });
    expect(clockAt(0, filmClock([{ time: '07.00', title: 'A', text: '' }]))).toBe('07.00');
    expect(filmClock([{ time: 'pagi', title: 'A', text: '' }])).toEqual({ points: [[0, 300], [1, 1260]] });
    expect(filmClock([])).toEqual({ points: [[0, 300], [1, 1260]] });
    expect(clockAt(0.5, filmClock([]))).toBe('13.00');
    // Bab aktif: mengikuti chapterStarts
    expect([0, 0.2399, 0.24, 0.4999, 0.5, 0.6599, 0.66, 1, Number.NaN].map((p) => chapterAt(p, 4))).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 0]);
    expect([0, 0.33, 0.34, 0.67, 1].map((p) => chapterAt(p, 3))).toEqual([0, 0, 1, 2, 2]);
    expect(chapterAt(0.5, 0)).toBe(-1);
    // Progres: (viewTop − trackTop) / (trackHeight − viewHeight), dibatasi 0–1
    expect(filmProgress(64, 64, 2675, 836)).toBe(0);
    expect(filmProgress(64, 64 - 919.5, 2675, 836)).toBe(0.5);
    expect(filmProgress(64, -5000, 2675, 836)).toBe(1);
    expect(filmProgress(64, 900, 2675, 836)).toBe(0);
    expect(filmProgress(0, -100, 500, 800)).toBe(0);
    expect(filmProgress(Number.NaN, 0, 2675, 836)).toBe(0);
    expect(POSTER_P).toBe(0.55);
  });
});

describe('Lajur: demo', () => {
  it('urutan section, satu H1, hero coach: foto latar LCP (eager, srcset, sizes HP, ukuran, alt) tanpa reveal, lapisan tinta', () => {
    const container = demo();
    expect(sectionKeys(container)).toEqual([...ORDER, 'footer']);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const hero = section(container, 'hero');
    expect(hero.getAttribute('data-hero-layout')).toBe('coach');
    expect(hero.querySelector('[data-tpl-tone="inverse"]')).not.toBeNull();
    expect(hero.querySelector('h1')!.textContent).toBe('Sewa bus pariwisata untuk setiap rombongan.');
    expect(hero.querySelector('h1 span')!.textContent).toBe('setiap rombongan');
    // Sorotan memakai --lj-hero (aksen CMS dicerahkan sampai ≥ 4,5:1 di atas lapisan tinta foto)
    expect(hero.querySelector('h1 span')!.className).toContain('text-(--lj-hero)');
    // Chip = fakta (kota garasi · wilayah), bukan pengulangan judul
    expect(hero.textContent).toContain('Semarang · Jawa–Bali–Madura');
    expect(String(DEMO.hero.eyebrow).toLowerCase()).not.toContain('sewa bus');
    // H1 di laptop pendek: 48px (tinggi ≤ 820) / 42px (≤ 740) supaya bilah penawaran terlihat; 64px hanya ≥ 1536px
    expect(hero.querySelector('h1')!.className).toContain('[@media(min-height:741px)_and_(max-height:820px)]:@5xl:text-[48px]');
    expect(hero.querySelector('h1')!.className).toContain('[@media(max-height:740px)]:@5xl:text-[42px]');
    expect(hero.querySelector('h1')!.className).toContain('@min-[96rem]:text-[64px]');
    const img = hero.querySelector<HTMLImageElement>('img[fetchpriority="high"]')!;
    expect(img.getAttribute('src')).toBe('/assets/templates/photos/lajur-hero-1920.webp');
    expect(img.getAttribute('srcset')).toContain(' 800w');
    expect(img.getAttribute('srcset')).toContain(' 1280w');
    expect(img.getAttribute('srcset')).toContain(' 1920w');
    // HP: foto 16:9 menutupi kotak tegak (> 2× lebar layar) lalu dipotong diam 1,25× dari bawah (punggung bukit di pita
    // atas, bukan langit mendung) → varian 1920w; tanpa animasi
    expect(img.getAttribute('sizes')).toBe('(max-width: 767px) 290vw, 100vw');
    expect(img.className).toContain('scale-[1.25]');
    expect(img.className).toContain('@3xl:scale-100');
    expect(img.getAttribute('loading')).toBe('eager');
    expect(Number(img.getAttribute('width'))).toBe(1920);
    expect(Number(img.getAttribute('height'))).toBe(1080);
    expect(img.getAttribute('alt')!.split(' ').length).toBeGreaterThanOrEqual(5);
    // Foto = LATAR hero, tidak pernah disembunyikan: tanpa Reveal, tanpa kelas gerak di <img>
    expect(img.closest('.tpl-reveal')).toBeNull();
    expect(img.className).not.toMatch(/lj-|tpl-photo|opacity|clip/);
    expect(hero.querySelector('.lj-hero-scrim')).toHaveAttribute('aria-hidden', 'true');
    // Hanya satu gambar eager di halaman
    const eager = Array.from(container.querySelectorAll('img')).filter((i) => i.getAttribute('loading') !== 'lazy');
    expect(eager.map((i) => i.getAttribute('src'))).toEqual(['/assets/templates/photos/lajur-hero-1920.webp']);
    // Dua tombol: armada & WhatsApp ("Chat WhatsApp" tetap unik milik tombol melayang Shell)
    expect(within(hero).getByRole('link', { name: 'Cek armada & harga' })).toHaveAttribute('href', '#fleet');
    expect(decode(within(hero).getByRole('link', { name: 'Chat via WhatsApp' }))).toBe(`${WA}Halo Lajur Trans Wisata, saya ingin bertanya tentang sewa bus.`);
    expect(within(container).getAllByRole('link', { name: 'Chat WhatsApp' })).toHaveLength(1);
  });

  it('header putih bergaris amber: menu ≤ 6 + telepon + "Minta penawaran"; menu HP buka/tutup, Esc menutup dan fokus kembali', () => {
    const container = demo();
    const header = container.querySelector('header')!;
    expect(header.className).toContain('sticky');
    expect(header.className).toContain('bg-white');
    expect(header.querySelector('svg[viewBox="0 0 32 32"]'), 'LajurMark').not.toBeNull();
    const nav = within(header).getByRole('navigation', { name: 'Menu utama' });
    expect(Array.from(nav.querySelectorAll('a')).map((a) => `${a.textContent}${a.getAttribute('href')}`)).toEqual([
      'Armada#fleet',
      'Rombongan#convoy',
      'Tujuan#routes',
      'Harga#included',
      'FAQ#faq',
      'Kontak#kontak',
    ]);
    fireEvent.click(within(nav).getByRole('link', { name: 'Harga' }));
    expect(scrolled).toEqual(['included']);
    expect(within(header).getByRole('link', { name: '0812-3456-7890' })).toHaveAttribute('href', 'tel:+6281234567890');
    // Satu ejaan untuk aksi yang sama di seluruh halaman (huruf kecil kalimat)
    expect(within(header).getAllByRole('link', { name: 'Minta penawaran' })[0]).toHaveAttribute('href', '#beranda');
    expect(container.textContent).not.toContain('Minta Penawaran');
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
    // Nomor urut "01"… di depan tautan menu (bukan awalan "08" nomor telepon)
    expect(within(panel).getAllByRole('link').map((a) => a.textContent?.replace(/^\d{2}(?=\D)/, ''))).toEqual([
      'Armada',
      'Rombongan',
      'Tujuan',
      'Harga',
      'FAQ',
      'Kontak',
      'Minta penawaran',
      '0812-3456-7890',
    ]);
    // Nomor menu HP: abu #5A5F66 (6,4:1 di putih), bukan tinta 50%
    expect(within(panel).getAllByRole('link')[0].querySelector('span[aria-hidden]')!.className).toContain('text-[#5A5F66]');
    fireEvent.click(within(panel).getByRole('link', { name: 'Tujuan' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(scrolled).toEqual(['included', 'routes']);
    fireEvent.click(toggle);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
    expect(within(header).getAllByRole('navigation', { name: 'Menu utama' })).toHaveLength(1);
  });

  it('bilah minta penawaran: −/+, rekomendasi langsung, galat + fokus, pesan WhatsApp apa adanya, ubah data', async () => {
    const container = demo();
    const hero = section(container, 'hero');
    const formEl = within(hero).getByRole('form', { name: 'Minta penawaran sewa bus' });
    expect(formEl.getAttribute('action')).toBeNull();
    expect(formEl).toHaveAttribute('novalidate');
    // Target sentuh 44px (tombol −/+ dan isian); satu kolom di HP < 360px, 2 × 2 sampai @5xl, lalu satu baris
    for (const name of ['Kurangi peserta', 'Tambah peserta']) {
      const cls = within(formEl).getByRole('button', { name }).className.split(/\s+/);
      expect(cls, name).toEqual(expect.arrayContaining(['h-11', 'w-11']));
    }
    expect(formEl.className.split(/\s+/)).toEqual(expect.arrayContaining(['grid-cols-1', '@min-[22.5rem]:grid-cols-2']));
    for (const control of formEl.querySelectorAll('input:not([type="hidden"]), select')) expect(control.className.split(/\s+/), control.id).toContain('h-11');
    expect(hero.textContent).toContain('Formulir hanya menyusun pesan WhatsApp; harga final dan ketersediaan armada dikonfirmasi admin. Tidak ada pembayaran online.');
    const people = within(formEl).getByLabelText('Jumlah peserta') as HTMLInputElement;
    expect(people.value).toBe('45');
    expect(people).toHaveAttribute('inputmode', 'numeric');
    const date = within(formEl).getByLabelText('Tanggal berangkat') as HTMLInputElement;
    expect(date.type).toBe('date');
    expect(date.min).toBe(todayIso());
    const destination = within(formEl).getByLabelText('Tujuan') as HTMLInputElement;
    const list = document.getElementById(destination.getAttribute('list')!)!;
    expect(Array.from(list.querySelectorAll('option')).map((o) => o.getAttribute('value'))).toEqual(readRoutes(DEMO.routes).map((r) => r.name));
    const days = within(formEl).getByLabelText('Lama sewa') as HTMLSelectElement;
    expect(Array.from(days.options).map((o) => o.value)).toEqual(['1', '2', '3', '4', '5', '6', '7']);
    // Rekomendasi armada langsung (live region tanpa role, ikon bus dekoratif)
    const live = () => hero.querySelector('[aria-live="polite"]')!;
    expect(live().textContent).toBe('1 Big bus 50 kursi');
    expect(live()).not.toHaveAttribute('role');
    fireEvent.click(within(formEl).getByRole('button', { name: 'Tambah peserta' }));
    expect(people.value).toBe('46');
    fireEvent.change(people, { target: { value: '12a0' } });
    expect(people.value).toBe('120');
    expect(live().textContent).toBe('2 Big bus 50 kursi + 1 Medium bus 33 kursi');
    expect(hero.querySelectorAll('.lj-pop')).toHaveLength(3);
    fireEvent.change(people, { target: { value: '1' } });
    expect(within(formEl).getByRole('button', { name: 'Kurangi peserta' })).toBeDisabled();
    // Di luar 1–500 (600): − tetap aktif dan turun dari 500, + mati (tidak mereset ke 1)
    fireEvent.change(people, { target: { value: '600' } });
    expect(within(formEl).getByRole('button', { name: 'Kurangi peserta' })).not.toBeDisabled();
    expect(within(formEl).getByRole('button', { name: 'Tambah peserta' })).toBeDisabled();
    fireEvent.click(within(formEl).getByRole('button', { name: 'Kurangi peserta' }));
    expect(people.value).toBe('499');
    // Live region yang SAMA (tidak dipasang ulang) saat rekomendasi hilang/muncul: hanya teksnya berganti
    const region = live();
    fireEvent.change(people, { target: { value: '' } });
    expect(live()).toBe(region);
    expect(live().textContent).toBe('Isi jumlah peserta untuk melihat rekomendasi.');
    expect(within(formEl).getByRole('button', { name: 'Kurangi peserta' })).toBeDisabled();
    fireEvent.click(within(formEl).getByRole('button', { name: 'Tambah peserta' }));
    expect(people.value).toBe('1');
    expect(live()).toBe(region);
    fireEvent.change(people, { target: { value: '120' } });
    // Kirim tanpa tanggal & tujuan → galat + fokus ke isian salah pertama
    act(() => {
      fireEvent.submit(formEl);
    });
    expect(date).toHaveAttribute('aria-invalid', 'true');
    expect(date).toHaveAttribute('aria-describedby', `${date.id}-error`);
    expect(document.getElementById(`${date.id}-error`)!.textContent).toBe('Pilih tanggal berangkat.');
    expect(formEl.textContent).toContain('Tulis tujuan perjalanan.');
    expect(date).toHaveFocus();
    fireEvent.change(date, { target: { value: '2030-11-16' } });
    expect(date).not.toHaveAttribute('aria-invalid');
    fireEvent.change(destination, { target: { value: 'Dieng' } });
    fireEvent.change(days, { target: { value: '2' } });
    const submit = within(formEl).getByRole('button', { name: 'Minta penawaran' });
    expect(submit).toHaveAttribute('type', 'submit');
    act(() => {
      fireEvent.submit(formEl);
    });
    await wait(10);
    const ready = within(hero).getByText('Pesan WhatsApp siap');
    expect(ready).toHaveAttribute('tabindex', '-1');
    expect(ready).toHaveFocus();
    const message = hero.querySelector('pre')!.textContent!;
    expect(message).toBe(quoteMessage(quote(), recommendConvoy(FLEET, 120), BRAND));
    expect(decode(within(hero).getByRole('link', { name: 'Buka WhatsApp' }))).toBe(`${WA}${message}`);
    expect(hero.textContent).toContain('pesan belum terkirim sebelum Anda menekan kirim di WhatsApp');
    fireEvent.click(within(hero).getByRole('button', { name: 'Ubah data' }));
    const again = within(hero).getByRole('form', { name: 'Minta penawaran sewa bus' });
    expect((within(again).getByLabelText('Jumlah peserta') as HTMLInputElement).value).toBe('120');
    expect((within(again).getByLabelText('Tujuan') as HTMLInputElement).value).toBe('Dieng');
    expect((within(again).getByLabelText('Tanggal berangkat') as HTMLInputElement).value).toBe('2030-11-16');
  });

  it('armada: tab per jenis bus (ARIA + panah/Home/End), gambar bus SVG di garis lajur, fasilitas, harga contoh, denah kursi', () => {
    const container = demo();
    const fleet = section(container, 'fleet');
    const tablist = within(fleet).getByRole('tablist', { name: 'Pilih jenis bus' });
    // Garis tepi kisi tab = border (ring inset tertutup latar tab)
    expect(tablist.className).toContain('border');
    expect(tablist.className).not.toContain('ring-inset');
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Big bus50 kursi', 'Medium bus33 kursi', 'Microbus15 kursi']);
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
    expect(tabs.map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
    for (const t of tabs) expect(t).toHaveAttribute('type', 'button');
    const panel = within(fleet).getByRole('tabpanel');
    expect(panel).toHaveAttribute('aria-labelledby', tabs[0].id);
    for (const tab of tabs) expect(tab).toHaveAttribute('aria-controls', panel.id);
    expect(panel.querySelector('h3')!.textContent).toBe('Big bus');
    expect(panel.textContent).toContain('50 kursi · susunan 2-2 · 6 unit');
    expect(within(panel).getByRole('list', { name: 'Fasilitas' }).querySelectorAll('li')).toHaveLength(6);
    expect(plain(panel.textContent)).toContain('MulaiRp3.200.000/ hari');
    expect(panel.textContent).toContain('Termasuk sopir & kernet');
    expect(panel.textContent).toContain('Harga contoh, dikonfirmasi admin');
    // Gambar bus SVG (dekoratif) di garis lajur; tanpa foto pembeli
    const drive = panel.querySelector('.lj-drive')!;
    expect(drive).toHaveAttribute('data-moved', 'false');
    expect(drive.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(drive.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 400 126');
    expect(drive.querySelectorAll('.lj-wheel')).toHaveLength(2);
    // Garis lajur diam tepat di bawah roda: saudara bus yang melaju masuk, bukan bagian dari animasinya
    expect(drive.querySelector('.lj-lane-line')).toBeNull();
    expect(panel.querySelector('.lj-lane-line')!.parentElement).toBe(drive.parentElement);
    expect(panel.querySelector('img')).toBeNull();
    tabs[0].focus();
    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveFocus();
    expect(panel).toHaveAttribute('aria-labelledby', tabs[1].id);
    expect(panel.querySelector('h3')!.textContent).toBe('Medium bus');
    expect(panel.querySelector('.lj-drive')).toHaveAttribute('data-moved', 'true');
    expect(panel.querySelector('.lj-drive svg')!.getAttribute('viewBox')).toBe('0 0 304 126');
    fireEvent.keyDown(tabs[1], { key: 'End' });
    expect(tabs[2]).toHaveFocus();
    expect(panel.querySelector('.lj-drive svg')!.getAttribute('viewBox')).toBe('0 0 236 126');
    fireEvent.keyDown(tabs[2], { key: 'ArrowRight' });
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs[0], { key: 'ArrowLeft' });
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs[2], { key: 'Home' });
    expect(tabs[0]).toHaveFocus();
    fireEvent.click(tabs[2]);
    expect(panel.querySelector('h3')!.textContent).toBe('Microbus');
    expect(panel.textContent).toContain('15 kursi · susunan 2-1 · 3 unit');
    // Denah kursi: tertutup (inert) → buka (aria-expanded) dengan keterangan teks; SVG dekoratif
    const toggle = within(panel).getByRole('button', { name: /Lihat denah kursi/ });
    const map = document.getElementById(toggle.getAttribute('aria-controls')!)!;
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(map).toHaveAttribute('data-open', 'false');
    expect(map).toHaveAttribute('inert');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(map).toHaveAttribute('data-open', 'true');
    expect(map).not.toHaveAttribute('inert');
    // Keterangan teks denah (SVG-nya dekoratif)
    const legend = () => map.querySelector('p')!.textContent;
    expect(legend()).toBe('Denah kursi Microbus · 15 kursi penumpang, susunan 2-1, 3 di bangku belakang. Depan bus di kanan.');
    expect(map.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(map.querySelector('text')).toBeNull();
    fireEvent.click(tabs[0]);
    expect(legend()).toBe('Denah kursi Big bus · 50 kursi penumpang, susunan 2-2, 6 di bangku belakang, toilet di belakang. Depan bus di kanan.');
    expect(map.querySelector('svg text')!.textContent).toBe('WC');
    expect(map.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    // ≤ 3 jenis: kisi n kolom (bukan rel geser)
    expect(tablist.className).toContain('grid');
    expect(tablist.className).not.toContain('overflow-x-auto');
  });

  it('armada 4–6 jenis: tab jadi rel geser (tab tidak lebih sempit dari namanya), panah tetap jalan; bus livery putih + pita warna tema', () => {
    const five = ['Big bus', 'Big bus VIP', 'Medium bus', 'Minibus', 'Microbus'].map((name, i) => ({ name, seats: String([50, 45, 33, 21, 15][i]), price: '3200000' }));
    const fleet = section(demo({ fleet: { items: five } }), 'fleet');
    const tablist = within(fleet).getByRole('tablist', { name: 'Pilih jenis bus' });
    expect(tablist.className.split(/\s+/)).toEqual(expect.arrayContaining(['flex', 'overflow-x-auto', 'snap-x', 'border']));
    expect(tablist.getAttribute('style') ?? '').not.toContain('grid-template-columns');
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs).toHaveLength(5);
    for (const tab of tabs) expect(tab.className.split(/\s+/)).toEqual(expect.arrayContaining(['shrink-0', 'grow', 'basis-0', 'snap-start', 'min-w-[8.5rem]', '@3xl:min-w-[12.5rem]']));
    // Nama tidak dipotong "…" di rel; kata yang sangat panjang boleh patah
    for (const tab of tabs) expect(tab.querySelector('span.\\[overflow-wrap\\:anywhere\\]')!.className).not.toContain('truncate');
    tabs[0].focus();
    fireEvent.keyDown(tabs[0], { key: 'End' });
    expect(tabs[4]).toHaveFocus();
    expect(tabs[4]).toHaveAttribute('aria-selected', 'true');
    // Gambar bus: badan putih mutiara, livery = warna tema (pita + panel belakang), tiga bilah "///" putih, rok tipis
    const svg = fleet.querySelector('.lj-drive svg')!;
    const paths = Array.from(svg.querySelectorAll('path'));
    expect(paths.some((p) => p.getAttribute('fill') === '#F7F6F2')).toBe(true);
    expect(paths.filter((p) => p.getAttribute('class') === 'fill-(--tpl-accent)')).toHaveLength(1);
    expect(svg.querySelectorAll('*').length).toBeLessThanOrEqual(40);
  });

  it('"Pilih bus ini" mengisi jenis bus di bilah penawaran, menggulir BILAH ke tengah layar, fokus ke jumlah peserta; chip menghapus pilihan', async () => {
    const container = demo();
    const fleet = section(container, 'fleet');
    const hero = section(container, 'hero');
    const intoView = Element.prototype.scrollIntoView as unknown as ReturnType<typeof vi.fn>;
    fireEvent.click(within(fleet).getAllByRole('tab')[2]);
    act(() => {
      fireEvent.click(within(fleet).getByRole('button', { name: 'Pilih bus ini: Microbus 15 kursi' }));
    });
    expect(hero.querySelector('[aria-live="polite"]')!.textContent).toBe('3 Microbus 15 kursi');
    await wait(100);
    // Bukan ke awal halaman (di HP bilah ada di bawah teks hero): isian peserta digulir ke tengah layar lalu difokus
    const people = within(hero).getByLabelText('Jumlah peserta');
    expect(people).toHaveFocus();
    expect(scrolled).not.toContain('top');
    const call = intoView.mock.calls.findIndex((_, i) => intoView.mock.contexts[i] === people);
    expect(call).toBeGreaterThanOrEqual(0);
    expect(intoView.mock.calls[call][0]).toMatchObject({ block: 'center' });
    const chip = within(hero).getByRole('button', { name: 'Hapus pilihan Microbus 15 kursi, pakai semua jenis bus' });
    expect(chip.textContent).toBe('Hanya Microbus');
    fireEvent.click(chip);
    expect(hero.querySelector('[aria-live="polite"]')!.textContent).toBe('1 Big bus 50 kursi');
    expect(within(hero).queryByRole('button', { name: /Hapus pilihan/ })).toBeNull();
    await wait(10);
    expect(people).toHaveFocus();
  });

  it('pesan yang sudah tersusun tidak pernah basi: "Pilih bus ini" atau chip setelah pesan siap → formulir tampil lagi (isian tetap), pesan baru memuat jenis bus', async () => {
    const container = demo();
    const fleet = section(container, 'fleet');
    const hero = section(container, 'hero');
    const formEl = within(hero).getByRole('form', { name: 'Minta penawaran sewa bus' });
    fireEvent.change(within(formEl).getByLabelText('Tanggal berangkat'), { target: { value: '2030-11-16' } });
    fireEvent.change(within(formEl).getByLabelText('Tujuan'), { target: { value: 'Dieng' } });
    act(() => {
      fireEvent.submit(formEl);
    });
    await wait(10);
    expect(hero.querySelector('pre')!.textContent).toContain('Rekomendasi armada: 1 Big bus 50 kursi');
    // Ganti jenis bus di Armada → pesan lama hilang, formulir kembali dengan isian yang sama, fokus ke peserta
    fireEvent.click(within(fleet).getAllByRole('tab')[2]);
    act(() => {
      fireEvent.click(within(fleet).getByRole('button', { name: 'Pilih bus ini: Microbus 15 kursi' }));
    });
    expect(hero.querySelector('pre')).toBeNull();
    const again = within(hero).getByRole('form', { name: 'Minta penawaran sewa bus' });
    expect((within(again).getByLabelText('Tujuan') as HTMLInputElement).value).toBe('Dieng');
    await wait(100);
    expect(within(again).getByLabelText('Jumlah peserta')).toHaveFocus();
    act(() => {
      fireEvent.submit(again);
    });
    await wait(10);
    const message = hero.querySelector('pre')!.textContent!;
    expect(message).toContain('Jenis bus: Microbus 15 kursi');
    expect(message).toContain('Rekomendasi armada: 3 Microbus 15 kursi');
    expect(decode(within(hero).getByRole('link', { name: 'Buka WhatsApp' }))).toContain('Microbus');
    // Chip "Hanya Microbus" saat pesan tampil → pesan tidak berlaku, formulir kembali tanpa jenis bus pilihan
    fireEvent.click(within(hero).getByRole('button', { name: /Hapus pilihan/ }));
    expect(hero.querySelector('pre')).toBeNull();
    expect(hero.querySelector('[aria-live="polite"]')!.textContent).toBe('1 Big bus 50 kursi');
    await wait(10);
    expect(within(hero).getByLabelText('Jumlah peserta')).toHaveFocus();
  });

  it('kalkulator rombongan: 120 peserta → 2 Big + 1 Medium, penggeser & isian, jalan konvoi dekoratif, WhatsApp berisi rekomendasi', () => {
    const container = demo();
    const convoy = section(container, 'convoy');
    const status = within(convoy).getByRole('status');
    // role="status" sudah polite; aria-live eksplisit hanya untuk region keterangan pratinjau Shell (shell.test.tsx)
    expect(status).not.toHaveAttribute('aria-live');
    expect(status.textContent).toBe('2 Big bus + 1 Medium bus133 kursi · sisa 13 kursi · 120 peserta');
    expect(plain(convoy.textContent)).toContain('Perkiraan mulaiRp8.700.000/ hari');
    expect(convoy.textContent).toContain('Perkiraan dari harga contoh per hari. Susunan armada final dari admin.');
    const range = within(convoy).getByRole('slider', { name: 'Geser jumlah peserta' }) as HTMLInputElement;
    expect([range.min, range.max, range.value]).toEqual(['10', '300', '120']);
    expect(range).toHaveAttribute('aria-valuetext', '120 peserta');
    const road = convoy.querySelector('.lj-asphalt')!.closest('[aria-hidden="true"]')!;
    expect(road).not.toBeNull();
    // Baris layar lebar + baris HP (salah satu disembunyikan CSS): 3 bus masing-masing
    expect(road.querySelectorAll('.lj-slide')).toHaveLength(6);
    const ask = within(convoy).getByRole('link', { name: 'Minta penawaran untuk 120 peserta' });
    expect(decode(ask)).toBe(`${WA}${convoyMessage(120, recommendConvoy(FLEET, 120), BRAND)}`);
    fireEvent.change(range, { target: { value: '300' } });
    expect(status.textContent).toBe('6 Big bus300 kursi · semua kursi terisi · 300 peserta');
    expect(road.querySelectorAll('.lj-slide')).toHaveLength(12);
    expect(within(convoy).getByRole('link', { name: 'Minta penawaran untuk 300 peserta' })).toBeInTheDocument();
    const input = within(convoy).getByLabelText('Jumlah peserta') as HTMLInputElement;
    expect(input).toHaveAttribute('inputmode', 'numeric');
    expect(input).toHaveAttribute('aria-describedby');
    // Lebar isian mengikuti jumlah digit
    expect(input.style.width).toBe('3.25ch');
    fireEvent.change(input, { target: { value: '45' } });
    expect(status.textContent).toBe('1 Big bus50 kursi · sisa 5 kursi · 45 peserta');
    expect(range.value).toBe('45');
    expect(input.style.width).toBe('2.25ch');
    // Di luar 10–300 → dibatasi saat selesai mengetik
    fireEvent.change(input, { target: { value: '999' } });
    fireEvent.blur(input);
    expect(input.value).toBe('300');
    fireEvent.change(input, { target: { value: '3' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(input.value).toBe('10');
    expect(status.textContent).toBe('1 Microbus15 kursi · sisa 5 kursi · 10 peserta');
  });

  it('kalkulator rombongan: satuan perkiraan dari CMS ("/ trip"), satuan berbeda → tanpa perkiraan; harga bersatuan kata terbaca benar', () => {
    const items = [
      { name: 'Big bus', seats: '50', price: 'mulai 3,2 jt', price_unit: '/ trip' },
      { name: 'Microbus', seats: '15', price: 'Rp 1,3 juta per hari', price_unit: '/ trip' },
    ];
    const trip = demo({ fleet: { items }, convoy: { default_people: '120' } });
    const convoy = section(trip, 'convoy');
    expect(plain(convoy.textContent)).toContain('Perkiraan mulaiRp9.600.000/ trip');
    expect(plain(section(trip, 'fleet').textContent)).toContain('MulaiRp3.200.000/ trip');
    expect(decode(within(convoy).getByRole('link', { name: 'Minta penawaran untuk 120 peserta' }))).toContain('Perkiraan harga: mulai Rp9.600.000 per trip');
    cleanup();
    const mixed = demo({ fleet: { items: [items[0], { ...items[1], price_unit: '/ hari' }] }, convoy: { default_people: '60' } });
    const status = within(section(mixed, 'convoy')).getByRole('status');
    expect(status.textContent).toContain('1 Big bus + 1 Microbus');
    expect(section(mixed, 'convoy').textContent).not.toContain('Perkiraan mulai');
    expect(decode(within(section(mixed, 'convoy')).getByRole('link', { name: 'Minta penawaran untuk 60 peserta' }))).not.toContain('Perkiraan harga');
  });

  it('film tanpa gerak (reduced motion/pratinjau): poster + daftar bab — tanpa trek tinggi, semua bab di <ol>, "Lewati animasi", adegan aria-hidden', () => {
    const container = still();
    expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'off');
    const film = section(container, 'film');
    expect(film).toHaveAttribute('data-film', 'static');
    expect(film).toHaveAttribute('data-tpl-tone', 'inverse');
    expect(film.className).toContain('bg-[#14161A]');
    expect(film.querySelector('.lj-film-track')).toBeNull();
    expect(film.querySelector('[data-film-progress]')).toBeNull();
    expect(film.querySelector('.sticky')).toBeNull();
    expect(film.querySelector('h2')!.textContent).toBe('Satu hari bersama rombongan Anda');
    expect(film.textContent).toContain('Dari penjemputan subuh sampai rombongan diantar pulang malam hari.');
    const list = within(film).getByRole('list', { name: 'Bab perjalanan' });
    expect(list.tagName).toBe('OL');
    const items = Array.from(list.querySelectorAll(':scope > li'));
    expect(items.map((li) => li.querySelector('h3')!.textContent)).toEqual(['Penjemputan', 'Istirahat', 'Tiba di tujuan', 'Kembali']);
    expect(items.map((li) => li.querySelector('p')!.textContent)).toEqual(['05.00', '10.00', '13.00', '16.00']);
    expect(items[1].textContent).toContain('Berhenti di rest area tiap 3–4 jam perjalanan.');
    // Semua teks bab terlihat (tidak sr-only), tanpa bab aktif
    for (const li of items) {
      for (const el of li.querySelectorAll('*')) expect(el.className, li.textContent ?? '').not.toMatch(/sr-only/);
      expect(li).not.toHaveAttribute('aria-current');
    }
    expect(list.className).toContain('@5xl:grid-cols-4');
    // Adegan poster (siang, p = 0,55) selebar layar & dekoratif
    const poster = film.querySelector<HTMLElement>('.lj-screen-poster')!;
    expect(poster.style.getPropertyValue('--p')).toBe('0.55');
    expect(poster.closest('.px-5')).toBeNull();
    expect(poster.querySelector('.lj-scene')).toHaveAttribute('aria-hidden', 'true');
    for (const svg of film.querySelectorAll('svg')) expect(svg.closest('[aria-hidden="true"]') ?? svg.getAttribute('aria-hidden')).toBeTruthy();
    expect(poster.querySelectorAll('svg *').length).toBeLessThanOrEqual(150);
    expect(film.querySelectorAll('img')).toHaveLength(0);
    // Lewati animasi → section berikutnya
    const skip = within(film).getByRole('link', { name: 'Lewati animasi' });
    expect(skip).toHaveAttribute('href', '#routes');
    expect(skip.className).toContain('sr-only');
    expect(skip.className).toContain('focus:not-sr-only');
    fireEvent.click(skip);
    expect(scrolled).toEqual(['routes']);
  });

  it('film bergerak: trek + panggung lengket, bab aktif aria-current, jam & keterangan dekoratif, hook memasang & melepas pendengar', async () => {
    const observers: { callback: IntersectionObserverCallback; targets: Element[] }[] = [];
    const OriginalIO = window.IntersectionObserver;
    const originalMatchMedia = window.matchMedia;
    const originalRaf = window.requestAnimationFrame;
    const originalCaf = window.cancelAnimationFrame;
    class Recorder {
      targets: Element[] = [];
      callback: IntersectionObserverCallback;
      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
        observers.push(this);
      }
      observe(el: Element) {
        this.targets.push(el);
      }
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    // Properti tiruan dari setup bersama: writable → diganti dengan penugasan biasa
    window.IntersectionObserver = Recorder as unknown as typeof IntersectionObserver;
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    window.requestAnimationFrame = (cb: FrameRequestCallback) => window.setTimeout(() => cb(performance.now()), 0);
    window.cancelAnimationFrame = (id: number) => window.clearTimeout(id);
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    try {
      const { container, unmount } = render(<SiteRenderer templateCode="lajur" content={null} />);
      expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'on');
      const film = section(container, 'film');
      expect(film).toHaveAttribute('data-film', 'scroll');
      const track = film.querySelector<HTMLElement>('.lj-film-track')!;
      expect(track).not.toBeNull();
      const stage = track.querySelector<HTMLElement>('[data-film-progress]')!;
      expect(stage.className).toContain('lj-film-stage');
      // Panggung selebar layar: bukan di dalam WRAP; adegan & jam dekoratif
      expect(stage.closest('.px-5')).toBeNull();
      expect(stage.querySelector('.lj-scene')).toHaveAttribute('aria-hidden', 'true');
      expect(stage.querySelector('.lj-clock')!.closest('[aria-hidden="true"]')).not.toBeNull();
      expect(stage.querySelectorAll('.lj-cap')).toHaveLength(4);
      for (const svg of film.querySelectorAll('svg')) expect(svg.closest('[aria-hidden="true"]') ?? svg.getAttribute('aria-hidden')).toBeTruthy();
      // H2 + kalimat pengantar terlihat; bab = <ol> asli dengan teks lengkap di DOM
      expect(within(stage).getByRole('heading', { level: 2 }).textContent).toBe('Satu hari bersama rombongan Anda');
      const list = within(stage).getByRole('list', { name: 'Bab perjalanan' });
      expect(list.tagName).toBe('OL');
      const items = Array.from(list.querySelectorAll(':scope > li'));
      expect(items.map((li) => li.getAttribute('aria-current'))).toEqual(['step', null, null, null]);
      expect(items[2].textContent).toContain('Sopir menunggu di parkir bus selama Anda berwisata.');
      // Rel: kolom selebar jendela bab (0–0,24 · 0,24–0,50 · 0,50–0,66 · 0,66–1) → tanda bab tepat di awal adegannya
      expect(list.getAttribute('style')).toContain('minmax(0, 240fr) minmax(0, 260fr) minmax(0, 160fr) minmax(0, 340fr)');
      // Keterangan: jendela bab berurutan (yang lama habis tepat di batas, yang baru mulai di sana)
      const caps = Array.from(stage.querySelectorAll<HTMLElement>('.lj-cap')).map((c) => [c.style.getPropertyValue('--s'), c.style.getPropertyValue('--e')]);
      expect(caps).toEqual([
        ['-1', '0.24'],
        ['0.24', '0.5'],
        ['0.5', '0.66'],
        ['0.66', '2'],
      ]);
      const skip = within(stage).getByRole('link', { name: 'Lewati animasi' });
      expect(skip).toHaveAttribute('href', '#routes');
      // Ukuran awal & progres ditulis langsung ke DOM (rAF), tanpa pendengar gulir sebelum trek mendekati layar
      await wait(20);
      expect(track.style.getPropertyValue('--film-vh')).toBe(`${window.innerHeight}px`);
      expect(stage.style.getPropertyValue('--p')).toBe('0.0000');
      expect(stage.querySelector('.lj-clock')!.textContent).toBe('05.00');
      expect(add.mock.calls.filter(([type]) => type === 'scroll')).toHaveLength(0);
      // Trek mendekati layar → pendengar gulir (passive + capture: gulir bingkai HP ikut) & resize
      const watcher = observers.find((o) => o.targets.includes(track))!;
      expect(watcher).toBeDefined();
      act(() => {
        watcher.callback([{ target: track, isIntersecting: true } as unknown as IntersectionObserverEntry], watcher as unknown as IntersectionObserver);
      });
      const scroll = add.mock.calls.find(([type]) => type === 'scroll')!;
      expect(scroll[2]).toEqual({ passive: true, capture: true });
      expect(add.mock.calls.some(([type]) => type === 'resize')).toBe(true);
      // Menjauh → dilepas; mendekat lagi → dipasang lagi
      act(() => {
        watcher.callback([{ target: track, isIntersecting: false } as unknown as IntersectionObserverEntry], watcher as unknown as IntersectionObserver);
      });
      expect(remove.mock.calls.some(([type, fn, opts]) => type === 'scroll' && fn === scroll[1] && (opts as EventListenerOptions).capture === true)).toBe(true);
      act(() => {
        watcher.callback([{ target: track, isIntersecting: true } as unknown as IntersectionObserverEntry], watcher as unknown as IntersectionObserver);
      });
      expect(add.mock.calls.filter(([type]) => type === 'scroll')).toHaveLength(2);
      unmount();
      expect(remove.mock.calls.filter(([type, fn]) => type === 'scroll' && fn === scroll[1])).toHaveLength(2);
      // Semua pendengar resize yang dipasang film dilepas lagi
      const resizeFns = add.mock.calls.filter(([type]) => type === 'resize').map(([, fn]) => fn);
      for (const fn of resizeFns) expect(remove.mock.calls.some(([type, f]) => type === 'resize' && f === fn)).toBe(true);
      expect(stage.style.getPropertyValue('--p')).toBe('');
    } finally {
      add.mockRestore();
      remove.mockRestore();
      window.IntersectionObserver = OriginalIO;
      window.matchMedia = originalMatchMedia;
      window.requestAnimationFrame = originalRaf;
      window.cancelAnimationFrame = originalCaf;
    }
  });

  it('tujuan favorit: 8 kartu foto 4:5, meta, harga mulai per bus, WhatsApp per rute; rel geser di HP', () => {
    const container = demo();
    const routes = section(container, 'routes');
    const list = within(routes).getByRole('list', { name: 'Tujuan favorit' });
    expect(list.className).toContain('@5xl:grid-cols-4');
    expect(list.className).toContain('snap-x');
    const cards = Array.from(list.querySelectorAll(':scope > li'));
    expect(cards).toHaveLength(8);
    expect(cards.map((li) => li.querySelector('h3')!.textContent)).toEqual(['Dieng', 'Yogyakarta', 'Bromo', 'Malang & Batu', 'Bali', 'Bandung', 'Pantai Gunungkidul', 'Karimunjawa']);
    expect(cards[0].textContent).toContain('1 hari · dari Semarang');
    expect(plain(cards[0].textContent)).toContain('MulaiRp3.500.000/ bus');
    expect(cards[0].querySelector('img')!.closest('.aspect-\\[4\\/5\\]')).not.toBeNull();
    const ask = within(cards[0] as HTMLElement).getByRole('link', { name: 'Tanya rute ini: Dieng (WhatsApp)' });
    expect(decode(ask)).toBe(`${WA}Halo Lajur Trans Wisata, saya ingin bertanya tentang sewa bus ke Dieng (1 hari · dari Semarang). Mohon info harga dan ketersediaan armada.`);
    expect(routes.textContent).toContain('Contoh harga sewa bus dari Semarang. Tiket masuk dan makan belum termasuk.');
  });

  it('harga termasuk & cara sewa: tabel harga mulai per jenis bus, dua kartu daftar, catatan harga; 4 langkah bernomor dengan garis lajur dan ikon bus', () => {
    const container = demo();
    const included = section(container, 'included');
    expect(Array.from(included.querySelectorAll('h3')).map((h) => h.textContent)).toEqual(['Termasuk', 'Belum termasuk']);
    // Menu "Harga" berisi angka: harga mulai per jenis bus (data Armada) + "contoh" + tautan ke Armada
    const prices = within(included).getByRole('list', { name: 'Harga mulai per jenis bus' });
    expect(Array.from(prices.querySelectorAll('li')).map((li) => plain(li.textContent))).toEqual([
      'Big bus · 50 kursiRp3.200.000/ hari',
      'Medium bus · 33 kursiRp2.300.000/ hari',
      'Microbus · 15 kursiRp1.300.000/ hari',
    ]);
    expect(included.textContent).toContain('Harga mulaicontoh');
    expect(within(included).getByRole('link', { name: 'Lihat armada' })).toHaveAttribute('href', '#fleet');
    const [yes, no] = Array.from(included.querySelectorAll('h3')).map((h) => h.nextElementSibling as HTMLElement);
    expect(Array.from(yes.querySelectorAll('li')).map((li) => li.textContent)).toEqual([
      'Sopir & kernet',
      'BBM selama perjalanan',
      'AC, audio & TV',
      'Air mineral untuk peserta',
      'Sopir cadangan untuk perjalanan jauh',
      'Bus dicek sebelum berangkat',
    ]);
    expect(Array.from(no.querySelectorAll('li')).map((li) => li.textContent)).toEqual([
      'Tolsesuai rute',
      'Parkirsesuai lokasi',
      'Tiket masuk wisatadibayar rombongan',
      'Makan & penginapan krusesuai kesepakatan',
    ]);
    expect(included.textContent).toContain('Harga di halaman ini contoh dan bisa berubah; harga final dikonfirmasi admin lewat WhatsApp.');
    const steps = section(container, 'steps');
    const items = Array.from(steps.querySelectorAll('ol > li'));
    expect(items.map((li) => li.querySelector('h3')!.textContent)).toEqual(['Kirim kebutuhan', 'Terima penawaran', 'Konfirmasi jadwal', 'Berangkat']);
    expect(items.map((li) => li.querySelector('span[aria-hidden]')!.textContent)).toEqual(['01', '02', '03', '04']);
    expect(steps.querySelector('ol')!.className).toContain('@5xl:grid-cols-4');
    expect(steps.querySelector('.lj-steps-line')).toHaveAttribute('aria-hidden', 'true');
    expect(steps.querySelector('.lj-steps-draw svg')).toHaveAttribute('aria-hidden', 'true');
    expect(steps.textContent).toContain('Tanda jadi dibayar sesuai kesepakatan dengan admin, bukan di website.');
  });

  it('testimoni dengan inisial (tanpa foto), galeri foto selebar layar (tanpa jarak tepi) dengan keterangan', () => {
    const container = demo();
    const testimonials = section(container, 'testimonials');
    const list = within(testimonials).getByRole('list', { name: 'Testimoni pelanggan' });
    expect(list.querySelectorAll('figure')).toHaveLength(3);
    expect(list.querySelectorAll('blockquote')).toHaveLength(3);
    expect(testimonials.querySelector('img')).toBeNull();
    expect(Array.from(list.querySelectorAll('figcaption span[aria-hidden]')).map((s) => s.textContent).filter((t) => t)).toEqual(['R', 'H', 'S']);
    expect(Array.from(list.querySelectorAll('figure')).map((f) => f.querySelector('p')!.textContent)).toEqual(['Dieng · 3 bus', 'Bali · 3 bus', 'Yogyakarta · 2 bus']);
    expect(testimonials.textContent).toContain('Panitia study tour, Kudus');
    const gallery = section(container, 'gallery');
    const strip = within(gallery).getByRole('list', { name: 'Galeri foto perjalanan' });
    // Strip foto selebar layar: tidak di dalam WRAP, celah 2px, 5 kolom
    expect(strip.closest('.px-5')).toBeNull();
    expect(strip.className).toContain('gap-[2px]');
    expect(strip.getAttribute('style')).toContain('repeat(5, minmax(0, 1fr))');
    const figures = Array.from(strip.querySelectorAll('figure'));
    expect(figures).toHaveLength(5);
    for (const f of figures) expect(f).toHaveAttribute('tabindex', '0');
    expect(figures.map((f) => f.querySelector('figcaption')!.textContent)).toEqual([
      'Menunggu matahari terbit bersama rombongan',
      'Kursi reclining dengan sandaran kaki',
      'Istirahat sejenak di dataran tinggi',
      'Jalan santai menuju bukit',
      'Pulang saat matahari terbenam',
    ]);
    expect(strip.querySelector('img')!.getAttribute('sizes')).toBe('(min-width: 768px) 20vw, 72vw');
    cleanup();
    // 1–2 foto: bukan potret 4:5 setinggi layar → pita 21:9 / 3:2 di @3xl, sizes mengikuti jumlah kolom
    const photo = (key: string) => ({ image: `/assets/templates/photos/lajur-${key}-960.webp`, caption: key });
    const one = within(section(demo({ gallery: { items: [photo('sunset')] } }), 'gallery')).getByRole('list', { name: 'Galeri foto perjalanan' });
    expect(one.querySelector('figure')!.className).toContain('@3xl:aspect-[21/9]');
    expect(one.querySelector('li')!.className).toContain('w-full');
    expect(one.querySelector('img')!.getAttribute('sizes')).toBe('(min-width: 768px) 100vw, 100vw');
    cleanup();
    const two = within(section(demo({ gallery: { items: [photo('sunset'), photo('interior')] } }), 'gallery')).getByRole('list', { name: 'Galeri foto perjalanan' });
    expect(two.querySelector('figure')!.className).toContain('@3xl:aspect-[3/2]');
    expect(two.querySelector('img')!.getAttribute('sizes')).toBe('(min-width: 768px) 50vw, 72vw');
  });

  it('akordeon tanya jawab: aria-expanded/aria-controls, panel role=region (inert saat tertutup), satu terbuka, tautan WhatsApp', () => {
    const faq = section(demo(), 'faq');
    const buttons = within(faq).getAllByRole('button');
    expect(buttons).toHaveLength(5);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'true');
    for (const b of buttons) expect(b.closest('h3')).not.toBeNull();
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
    expect(decode(within(faq).getByRole('link', { name: /Tanya lewat WhatsApp/ }))).toBe(`${WA}Halo Lajur Trans Wisata, saya ingin bertanya tentang sewa bus.`);
    expect(faq.textContent).toContain('Tidak ada pembayaran di website.');
  });

  it('kontak garasi: baris bertautan (≥ 44px), peta; footer tinta dengan pita amber, menu, kontak, media sosial, garis livery', () => {
    const container = demo();
    const contact = section(container, 'contact');
    expect(Array.from(contact.querySelectorAll('dt')).map((dt) => dt.textContent)).toEqual(['Garasi & kantor', 'Jam buka', 'Telepon', 'WhatsApp', 'Email']);
    expect(contact.textContent).toContain('Jl. Lajur Raya No. 12, Pedurungan, Kota Semarang, Jawa Tengah');
    expect(contact.textContent).toContain('Kantor 08.00–17.00, admin WhatsApp 24 jam');
    expect(within(contact).getAllByRole('link', { name: '0812-3456-7890' }).map((a) => a.getAttribute('href'))).toEqual([
      'tel:+6281234567890',
      expect.stringMatching(/^https:\/\/wa\.me\/6281234567890\?text=/),
    ]);
    for (const link of within(contact).getAllByRole('link', { name: /0812-3456-7890|sewa@example\.com/ })) {
      expect(link.className).toContain('py-3.5');
      expect(link.className).toContain('-my-3.5');
    }
    expect(within(contact).getByRole('link', { name: 'sewa@example.com' })).toHaveAttribute('href', 'mailto:sewa@example.com');
    expect(contact.querySelector('iframe')!.getAttribute('title')).toBe('Peta lokasi Lajur Trans Wisata');
    expect(within(contact).getByRole('link', { name: 'Buka di Google Maps' }).getAttribute('href')).toMatch(/^https:\/\/(www\.)?google\.com\/maps/);
    // Peta menembus tepi kanan layar (margin negatif = jarak tepi WRAP)
    expect(contact.querySelector('iframe')!.closest('.-mx-5')!.className).toContain('@5xl:-mr-12');
    expect(contact.className).toContain('overflow-x-clip');
    expect(
      Array.from(container.querySelectorAll('[data-tpl-section][data-tpl-tone="inverse"]')).map((el) => el.getAttribute('data-tpl-section')),
    ).toEqual(['film', 'footer']);
    const footer = container.querySelector('footer')!;
    expect(footer.getAttribute('data-tpl-section')).toBe('footer');
    expect(footer.className).toContain('bg-[#14161A]');
    expect(footer.textContent).toContain('Rombongan siap berangkat?');
    expect(within(footer).getByRole('link', { name: 'Minta penawaran' })).toHaveAttribute('href', '#beranda');
    expect(footer.textContent).toContain(`© ${new Date().getFullYear()} Lajur Trans Wisata`);
    expect(footer.textContent).toContain('Sewa bus pariwisata Jawa–Bali');
    // Bilah hak cipta: ujung kanan ≥ 8px di kiri tombol WhatsApp melayang di semua lebar — HP 20 + 52 = 72px dari tepi
    // (tombol 48px @ 16px), 576–671px 20 + 76 = 96px, 672px ke atas 32/48 + 64px ≥ 96px (situs: 56px @ 32px)
    const bottom = Array.from(footer.querySelectorAll('p')).find((p) => p.textContent === 'Sewa bus pariwisata Jawa–Bali')!.parentElement!;
    expect(bottom.className.split(/\s+/)).toEqual(expect.arrayContaining(['pr-13', '@xl:pr-19', '@2xl:pr-16']));
    expect(bottom.className).not.toContain('@3xl:pr-14');
    // Penutup: garis warna tema 4px polos (bukan pita belang amber/hitam)
    expect(footer.lastElementChild!.className).toBe('h-1 bg-(--tpl-accent)');
    expect(footer.innerHTML).not.toContain('repeating-linear-gradient');
    expect(footer.textContent).toContain('Harga dan armada di website ini contoh; konfirmasi ke admin sebelum memesan.');
    expect(Array.from(within(footer).getByRole('navigation', { name: 'Tautan footer' }).querySelectorAll('a')).map((a) => a.getAttribute('href'))).toEqual([
      '#fleet',
      '#convoy',
      '#routes',
      '#included',
      '#faq',
      '#kontak',
    ]);
    // Target sentuh ≥ 44px: tautan footer min-h-11, tombol pita ajakan h-12
    for (const link of footer.querySelectorAll('a')) expect(link.className, link.textContent ?? '').toMatch(/(^|\s)(min-h-11|h-12)(\s|$)/);
    for (const [name, href] of [
      ['Instagram', 'https://instagram.com/lajurtrans.contoh'],
      ['Facebook', 'https://facebook.com/lajurtrans.contoh'],
      ['LinkedIn', 'https://linkedin.com/company/lajurtrans-contoh'],
      ['YouTube', 'https://youtube.com/@lajurtrans.contoh'],
      ['TikTok', 'https://tiktok.com/@lajurtrans.contoh'],
    ]) {
      expect(within(footer).getByRole('link', { name }), name).toHaveAttribute('href', href);
    }
    expect(footer.lastElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('wadah PENUH: tanpa CONTAINER/max-w-[1680px]; header, setiap section, dan footer memakai WRAP tanpa max-w/mx-auto', () => {
    expect(WRAP).toBe('w-full px-5 @2xl:px-8 @5xl:px-12 @min-[96rem]:px-16');
    const code = source();
    expect(code).not.toContain('max-w-[1680px]');
    expect(code).not.toMatch(/\bCONTAINER\b/);
    // Dirender bergantian (cleanup di akhir tiap putaran mengosongkan semua container yang sudah dirender)
    for (const make of [demo, still]) {
      const container = make();
      expect(container.querySelector('[class*="max-w-[1680px]"]')).toBeNull();
      const cls = (el: Element) => el.getAttribute('class') ?? '';
      const wraps = (root: Element) => Array.from(root.querySelectorAll('[class]')).filter((el) => cls(el).includes(WRAP));
      expect(wraps(container.querySelector('header')!).length).toBeGreaterThan(0);
      for (const key of [...ORDER, 'footer']) expect(wraps(section(container, key)).length, key).toBeGreaterThan(0);
      for (const el of wraps(container)) expect(cls(el), cls(el)).not.toMatch(/\bmax-w-|\bmx-auto\b/);
      // Foto hero, panggung film, dan strip galeri selebar layar (tanpa WRAP)
      expect(section(container, 'hero').querySelector('img')!.closest('.px-5')).toBeNull();
      expect(section(container, 'film').querySelector('.lj-screen')!.closest('.px-5')).toBeNull();
      cleanup();
    }
  });

  it('datar: tidak ada kelas shadow (kecuali tombol melayang Shell), kode tanpa kiriman data, impor hanya shared/kit/types', () => {
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
    // Tanpa parallax KitPhoto (film = satu-satunya gerak gulir)
    expect(code).not.toMatch(/^\s*parallax\b/m);
    for (const [, from] of code.matchAll(/from '(\.\.\/[^']+)'/g)) expect(from, from).toMatch(/^\.\.\/(shared|kit|types)(\/|$)/);
    // ≤ 4 lapisan will-change di adegan film
    expect((css().match(/will-change/g) ?? []).length).toBeLessThanOrEqual(4);
  });
});

describe('Lajur: gerak', () => {
  it('pratinjau CMS diam, tanpa tautan wa.me terbuka, film = poster + daftar bab', () => {
    const { container } = render(<def.Component content={resolveContent(def, null)} preview />);
    expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'off');
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    expect(container.querySelector('a[href^="javascript:"], a[href^="vbscript:"]')).toBeNull();
    // Hero tetap utuh di pratinjau: foto latar + bilah penawaran
    expect(container.querySelector('[data-hero-layout="coach"] img[fetchpriority="high"]')).not.toBeNull();
    expect(within(container).getByRole('form', { name: 'Minta penawaran sewa bus' })).toBeInTheDocument();
    expect(container.querySelector('[data-film="static"]')).not.toBeNull();
    expect(container.querySelector('.lj-film-track')).toBeNull();
    expect(within(container).getByRole('list', { name: 'Bab perjalanan' }).querySelectorAll(':scope > li')).toHaveLength(4);
  });

  it('lajur.css: animasi & film bergerbang [data-tpl-motion=\'on\'], blok reduced-motion & cetak, kelas lj-, durasi pendek', () => {
    const text = css();
    expect(text).toContain('@layer components');
    expect(text).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(text).toMatch(/@media print/);
    for (const rule of text.match(/^\s*[^@\s{}][^{}]*\{[^}]*\b(transition|animation):[^}]*\}/gm) ?? []) {
      const selector = rule.split('{')[0];
      if (/transition:\s*none|animation:\s*none/.test(rule)) continue;
      expect(selector, rule).toContain("[data-tpl-motion='on']");
    }
    // Trek tinggi & panggung lengket hanya saat gerak menyala (poster diam memakai CSS adegan yang sama tanpa ini)
    for (const rule of text.match(/^\s*[^@\s{}][^{}]*\{[^}]*(position: sticky|--film-vh[^)]*\) \* [\d.]+)[^}]*\}/gm) ?? []) {
      expect(rule.split('{')[0], rule).toContain("[data-tpl-motion='on']");
    }
    expect(text).toMatch(/\[data-tpl-motion='on'\] \.lj-film\[data-film='scroll'\] \.lj-film-track \{\s*position: relative;\s*height: calc\(var\(--film-vh, 100svh\) \* 3\.2\);/);
    expect(text).toMatch(/\[data-tpl-motion='on'\] \.lj-film\[data-film='scroll'\] \.lj-film-track \{\s*height: calc\(var\(--film-vh, 100svh\) \* 2\.4\);/);
    expect(text).toMatch(
      /\[data-tpl-motion='on'\] \.lj-film\[data-film='scroll'\] \.lj-film-stage \{\s*position: sticky;\s*top: var\(--tpl-sticky-top, 0px\);[^}]*height: var\(--film-vh, 100svh\);/,
    );
    // Tanpa overflow hidden/auto di leluhur panggung (lengket rusak); di dalam panggung boleh
    expect(readFileSync(resolve(ROOT, 'src/templates/lajur/Film.tsx'), 'utf8')).not.toMatch(/overflow-(hidden|auto)[^'"`]*lj-film-track|TemplateSection[^>]*overflow-(hidden|auto)/);
    for (const cls of text.match(/\.[a-z][\w-]*/g) ?? []) if (!/^\.(tpl-)/.test(cls)) expect(cls, cls).toMatch(/^\.lj-/);
    expect(text).not.toMatch(/infinite|box-shadow|text-shadow|drop-shadow/);
    // Durasi: gambar garis ≤ 1,6 dtk, bus melaju ≤ 600 ms, ikon ≤ 300 ms, transisi UI ≤ 1 dtk
    for (const [, name, value, unit] of text.matchAll(/animation:\s*lj-([a-z-]+)\s+([\d.]+)(m?s)/g)) {
      const ms = Number(value) * (unit === 's' ? 1000 : 1);
      expect(ms, name).toBeLessThanOrEqual(name === 'wipe' ? 1600 : name === 'drive' || name === 'spin' ? 600 : 300);
    }
    for (const [, value, unit] of text.matchAll(/transition:[^;]*?\s([\d.]+)(m?s)/g)) expect(Number(value) * (unit === 's' ? 1000 : 1)).toBeLessThanOrEqual(1000);
    // Cetak: film tanpa trek tinggi & tanpa panggung lengket
    const print = text.slice(text.indexOf('@media print'));
    expect(print).toMatch(/\.lj-film-track \{\s*height: auto;/);
    expect(print).toMatch(/\.lj-film-stage \{\s*position: static;/);
    // Adegan: hanya transform/opacity yang berubah per gulir; roda & bus mengikuti jarak (--d)
    expect(text).toMatch(/\.lj-film-wheel \{[^}]*transform: rotate\(calc\(var\(--d\) \* 2880deg\)\);/);
    expect(text).toMatch(/\.lj-rail-fill \{[^}]*transform: scaleX\(var\(--p, 0\)\);/);
    // Keterangan bab BERURUTAN (tidak pernah dua keterangan bertumpuk): keluar habis tepat di batas, masuk mulai di sana
    expect(text).toMatch(/\.lj-cap \{\s*--cin: clamp\(0, \(var\(--p, 0\) - var\(--s\)\) \/ 0\.02, 1\);\s*--cout: clamp\(0, \(var\(--e\) - var\(--p, 0\)\) \/ 0\.02, 1\);/);
    // Malam: badan bus ikut meredup; jalan desa bertiang listrik (tanpa lampu jalan tol & kerucut cahayanya)
    expect(text).toMatch(/\.lj-bus-night \{\s*opacity: clamp\(0, \(var\(--p, 0\) - 0\.72\) \/ 0\.18, 0\.45\);/);
    expect(text).not.toMatch(/lj-lamps/);
    // Layar pendek (HP mendatar): bilah atas film dirampingkan
    expect(text).toMatch(/@media \(max-height: 520px\) \{\s*\[data-tpl-motion='on'\] \.lj-film\[data-film='scroll'\] \.lj-film-top \{\s*padding-top: 76px;/);
  });
});

describe('Lajur: warna tema bisa diganti', () => {
  it('amber bawaan → --tpl-accent; warna CMS mengalir ke teks aksen & aksen terang; teks di atas aksen kontras', () => {
    const base = demo();
    expect(rootStyle(base, '--tpl-accent')).toBe('#ffb703');
    expect(rootStyle(base, '--lj-ink')).toBe('#815d06');
    expect(rootStyle(base, '--lj-bright')).toBe('#ffb703');
    expect(rootStyle(base, '--tpl-on-accent')).toBe('#121620');
    cleanup();
    const blue = demo({ brand: { accent_color: '#0050FF' } });
    expect(rootStyle(blue, '--tpl-accent')).toBe('#0050ff');
    for (const name of ['--lj-ink', '--lj-bright']) expect(rootStyle(blue, name), name).toBe((lajurVars('#0050FF') as Record<string, string>)[name]);
    expect(rootStyle(blue, '--tpl-on-accent')).toBe('#ffffff');
    cleanup();
    expect(rootStyle(demo({ brand: { accent_color: '#FACC15' } }), '--tpl-on-accent')).toBe('#121620');
  });
});

describe('Lajur: SEO situs pembeli, judul, gambar, tautan', () => {
  it('judul tab & meta description dari nama, tagline, dan kalimat hero; theme-color = aksen', () => {
    expect(siteTitle('lajur', null)).toBe('Lajur Trans Wisata — Sewa bus pariwisata Jawa–Bali');
    expect(siteTitle('lajur', null).length).toBeLessThanOrEqual(60);
    const restore = applySiteHead('lajur', null);
    const description = document.head.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
    expect(description).toMatch(/^Big bus, medium bus, dan microbus dengan sopir. Isi jumlah peserta/);
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(200);
    expect(document.head.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#FFB703');
    restore();
  });

  it('satu H1, tiap section diawali tepat satu H2, H3 hanya di bawah H2, tanpa h4–h6; judul kosong → H2 sr-only', () => {
    const check = (root: HTMLElement) => {
      expect(root.querySelectorAll('h1')).toHaveLength(1);
      expect(root.querySelectorAll('h4, h5, h6')).toHaveLength(0);
      for (const key of ORDER.filter((k) => k !== 'hero')) {
        const levels = Array.from(section(root, key).querySelectorAll('h1, h2, h3')).map((h) => h.tagName);
        expect(levels[0], key).toBe('H2');
        expect(levels.filter((l) => l === 'H2'), key).toHaveLength(1);
      }
      expect(section(root, 'hero').querySelector('h2, h3')).toBeNull();
    };
    check(demo());
    cleanup();
    check(still());
    cleanup();
    const blank = Object.fromEntries(ORDER.filter((k) => k !== 'hero').map((k) => [k, { title: '' }]));
    const titles = ['Armada', 'Kalkulator rombongan', 'Film sehari perjalanan', 'Tujuan favorit', 'Harga termasuk', 'Cara sewa', 'Testimoni', 'Galeri', 'Tanya jawab', 'Kontak'];
    for (const make of [demo, still]) {
      const untitled = make(blank);
      check(untitled);
      expect(ORDER.filter((k) => k !== 'hero').map((k) => section(untitled, k).querySelector('h2')!.textContent)).toEqual(titles);
      for (const k of ORDER.filter((key) => key !== 'hero')) expect(section(untitled, k).querySelector('h2'), k).toHaveClass('sr-only');
      cleanup();
    }
    // Judul hero kosong → nama perusahaan (tetap satu H1)
    expect(section(demo({ hero: { title: '' } }), 'hero').querySelector('h1')!.textContent).toBe(BRAND);
  });

  it('gambar: alt deskriptif, width/height, srcset & sizes; hanya foto hero yang eager', () => {
    const container = demo();
    const imgs = Array.from(container.querySelectorAll('img'));
    // hero + 8 tujuan + 5 galeri
    expect(imgs).toHaveLength(14);
    for (const img of imgs) {
      const src = img.getAttribute('src') ?? '';
      expect(img.hasAttribute('alt'), src).toBe(true);
      expect(Number(img.getAttribute('width')), src).toBeGreaterThan(0);
      expect(Number(img.getAttribute('height')), src).toBeGreaterThan(0);
      expect(img.getAttribute('srcset'), src).toMatch(/ 800w, /);
      expect(img.getAttribute('sizes'), src).toBeTruthy();
      expect(img.getAttribute('alt')!.split(' ').length, src).toBeGreaterThanOrEqual(5);
      if (!img.hasAttribute('fetchpriority')) expect(img).toHaveAttribute('loading', 'lazy');
    }
  });

  it('tautan asli untuk navigasi, tombol hanya untuk aksi (kecuali kirim formulir); SVG dekoratif tersembunyi', () => {
    for (const container of [demo(), still()]) {
      for (const a of container.querySelectorAll('a')) expect(a.getAttribute('href'), a.textContent ?? '').toMatch(/^(#[a-z]|https:\/\/|mailto:|tel:)/);
      for (const button of container.querySelectorAll('button')) {
        const submit = !!button.closest('form') && /Minta penawaran/.test(button.textContent ?? '');
        expect(button.getAttribute('type'), button.textContent ?? '').toBe(submit ? 'submit' : 'button');
      }
      for (const svg of container.querySelectorAll('svg')) expect(svg.closest('[aria-hidden="true"], [aria-hidden=""]') ?? svg.getAttribute('aria-hidden'), svg.outerHTML.slice(0, 60)).toBeTruthy();
      cleanup();
    }
  });
});

describe('Lajur: konten opsional kosong', () => {
  it('tanpa bus → armada, kalkulator, rekomendasi hero & menu hilang; tombol hero ke Tujuan', () => {
    const container = demo({ fleet: { items: [] } });
    expect(sectionKeys(container)).not.toContain('fleet');
    expect(sectionKeys(container)).not.toContain('convoy');
    const hero = section(container, 'hero');
    expect(hero.textContent).not.toContain('Rekomendasi');
    expect(within(hero).getByRole('link', { name: 'Cek armada & harga' })).toHaveAttribute('href', '#routes');
    const labels = Array.from(container.querySelector('header nav')!.querySelectorAll('a')).map((a) => a.textContent);
    expect(labels).not.toContain('Armada');
    expect(labels).not.toContain('Rombongan');
    // Nomor label mulai dari section tampil pertama
    expect(section(container, 'film').textContent).toContain('01');
  });

  it('satu bus → tanpa tab; foto bus pembeli menggantikan gambar SVG; harga kosong → "Harga menyusul" tanpa perkiraan', () => {
    const container = demo({
      fleet: {
        items: [{ name: 'Big bus', seats: '45', layout: '2-2', price: '', facilities: '', image: '/assets/templates/photos/lajur-interior-960.webp' }],
      },
    });
    const fleet = section(container, 'fleet');
    expect(within(fleet).queryByRole('tablist')).toBeNull();
    expect(within(fleet).queryByRole('tabpanel')).toBeNull();
    expect(fleet.querySelector('.lj-drive')).toBeNull();
    const img = fleet.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('/assets/templates/photos/lajur-interior-960.webp');
    expect(img.closest('.aspect-\\[16\\/9\\]')).not.toBeNull();
    expect(fleet.textContent).toContain('Harga menyusul');
    // "Mulai" hanya di depan angka harga (bukan "MULAI Harga menyusul")
    expect(fleet.textContent).not.toContain('Mulai');
    expect(within(fleet).queryByRole('list', { name: 'Fasilitas' })).toBeNull();
    const convoy = section(container, 'convoy');
    expect(convoy.textContent).not.toContain('Perkiraan mulai');
    expect(within(convoy).getByRole('status').textContent).toContain('3 Big bus');
  });

  it('tanpa bab film / tujuan / testimoni / galeri / FAQ / daftar harga → section & menu hilang, "Lewati animasi" ke section berikutnya', () => {
    const container = demo({ routes: { items: [] }, testimonials: { items: [] }, gallery: { items: [] }, faq: { items: [] }, included: { included: [], excluded: [] } });
    for (const key of ['routes', 'testimonials', 'gallery', 'faq', 'included']) expect(sectionKeys(container), key).not.toContain(key);
    expect(within(section(container, 'film')).getByRole('link', { name: 'Lewati animasi' })).toHaveAttribute('href', '#steps');
    // Bilah penawaran tanpa saran tujuan
    expect(within(section(container, 'hero')).getByLabelText('Tujuan')).not.toHaveAttribute('list');
    cleanup();
    const noFilm = demo({ film: { chapters: [] } });
    expect(sectionKeys(noFilm)).not.toContain('film');
    cleanup();
    // Satu kolom harga saja → kartu penuh
    const onlyYes = section(demo({ included: { excluded: [] } }), 'included');
    expect(onlyYes.querySelectorAll('h3')).toHaveLength(1);
    expect(onlyYes.querySelector('.grid .grid')!.className).not.toContain('@3xl:grid-cols-2');
  });

  it('tanpa WhatsApp → bilah penawaran menyusun email; tanpa WhatsApp & email → salin pesan; tautan WA lain hilang', async () => {
    const fill = (formEl: HTMLElement) => {
      fireEvent.change(within(formEl).getByLabelText('Tanggal berangkat'), { target: { value: '2030-11-16' } });
      fireEvent.change(within(formEl).getByLabelText('Tujuan'), { target: { value: 'Bromo' } });
      act(() => {
        fireEvent.submit(formEl);
      });
    };
    const container = demo({ contact: { whatsapp: '' } });
    const hero = section(container, 'hero');
    const formEl = within(hero).getByRole('form', { name: 'Minta penawaran sewa bus' });
    expect(within(formEl).getByRole('button', { name: 'Minta penawaran' }).querySelector('svg')).toBeNull();
    fill(formEl);
    expect(within(hero).getByRole('link', { name: 'Kirim lewat email' }).getAttribute('href')).toMatch(
      /^mailto:sewa@example\.com\?subject=Permintaan%20penawaran%20sewa%20bus&body=Halo%20Lajur%20Trans%20Wisata/,
    );
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    expect(within(hero).queryByRole('link', { name: 'Chat via WhatsApp' })).toBeNull();
    expect(within(section(container, 'routes')).queryByRole('link', { name: /Tanya rute ini/ })).toBeNull();
    expect(within(section(container, 'convoy')).queryByRole('link', { name: /Minta penawaran untuk/ })).toBeNull();
    expect(within(section(container, 'faq')).queryByRole('link', { name: /Tanya lewat WhatsApp/ })).toBeNull();
    cleanup();
    const bare = section(demo({ contact: { whatsapp: '', email: '' } }), 'hero');
    fill(within(bare).getByRole('form'));
    expect(within(bare).getByRole('button', { name: 'Salin pesan' })).toBeInTheDocument();
  });

  it('header & footer: tanpa label tombol → tanpa tombol; tanpa media sosial; tanpa pita ajakan; footer mati → tanpa footer', () => {
    const container = demo({
      hero: { header_label: '' },
      footer: { cta_title: '', instagram: '', facebook: '', linkedin: '', youtube: '', tiktok: '' },
      convoy: { button_label: '' },
      routes: { ask_label: '' },
      fleet: { choose_label: '' },
    });
    expect(within(container.querySelector('header')!).queryByRole('link', { name: 'Minta penawaran' })).toBeNull();
    const footer = container.querySelector('footer')!;
    expect(footer.textContent).not.toContain('Media sosial');
    expect(footer.textContent).not.toContain('Rombongan siap berangkat?');
    expect(within(section(container, 'convoy')).queryByRole('link')).toBeNull();
    expect(within(section(container, 'routes')).queryByRole('link')).toBeNull();
    expect(within(section(container, 'fleet')).queryByRole('button', { name: /Pilih bus ini/ })).toBeNull();
    cleanup();
    // Hero mati → tanpa tombol "Pilih bus ini" (tidak ada bilah penawaran), tombol menu ke Kontak
    const noHero = demo({ hero: { enabled: false } });
    expect(within(section(noHero, 'fleet')).queryByRole('button', { name: /Pilih bus ini/ })).toBeNull();
    expect(within(noHero.querySelector('header')!).getAllByRole('link', { name: 'Minta penawaran' })[0]).toHaveAttribute('href', '#kontak');
    cleanup();
    expect(demo({ footer: { enabled: false } }).querySelector('footer')).toBeNull();
  });
});

describe('Lajur: editor CMS', () => {
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

describe('Lajur: data katalog', () => {
  const MIGRATION = 'database/migrations/2026-10-29_049_lajur_template.sql';
  const sql = () => readFileSync(resolve(ROOT, MIGRATION), 'utf8');

  it('migrasi 049: baris lajur dengan template_code, kategori baru, harga, pratinjau .webp, fitur, salinan jujur', () => {
    const text = sql();
    expect(text).toContain("'lajur'");
    expect(text).toContain("'Travel & Transportasi'");
    expect(text).toContain('1690000.00');
    expect(text).toContain("'/assets/templates/lajur-preview.webp'");
    expect(text).toContain('\'["/assets/templates/lajur-1.webp","/assets/templates/lajur-2.webp"]\'');
    expect(text).toMatch(/Formulir hanya menyusun pesan WhatsApp/);
    expect(text).toMatch(/Tidak ada pembayaran online, e-tiket, ketersediaan armada real-time, akun member, atau pelacakan GPS\./);
    expect(text).not.toMatch(/termasuk domain|domain, hosting|dijamin|garansi|terbaik|termurah|izin trayek|asuransi/i);
    expect(text).toMatch(/kategori baru; halaman kategorinya ditambahkan di kode yang sama/);
    const features = JSON.parse(/features\s+= '(\[[^']*\])'/.exec(text)![1]) as string[];
    expect(features.length).toBeGreaterThanOrEqual(6);
    expect(features.length).toBeLessThanOrEqual(8);
    expect(features[features.length - 1]).toBe('Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)');
    // Berkas galeri yang disebut migrasi benar-benar ada
    const gallery = JSON.parse(/gallery\s+= '(\[[^']*\])'/.exec(text)![1]) as string[];
    expect(gallery).toEqual(['/assets/templates/lajur-1.webp', '/assets/templates/lajur-2.webp']);
    for (const url of gallery) expect(existsSync(publicFile(url)), url).toBe(true);
  });

  it('migrasi 049 aman diulang (INSERT IGNORE + UPDATE berdasarkan slug, tanpa DELETE) dan tercatat di schema_migrations', () => {
    const raw = sql();
    expect(raw).toMatch(/Domain tidak termasuk harga template/);
    expect(raw).toMatch(/FIKTIF/);
    expect(raw).toMatch(/Unsplash/);
    expect(raw).toMatch(/SETELAH kode/);
    expect(raw).toMatch(/MENIMPA perubahan admin/);
    expect(raw).toMatch(/termasuk setup \+ hosting \+ SSL tahun pertama/);
    const text = raw.replace(/^--.*$/gm, '');
    expect(text).toMatch(/INSERT IGNORE INTO templates/);
    expect(text).toMatch(/WHERE slug = 'lajur';/);
    expect(text).toMatch(/sort_order\s+= 32/);
    expect(text).toMatch(/price\s+= 1690000\.00/);
    expect(text).toMatch(/category\s+= 'Travel & Transportasi'/);
    expect(text).toMatch(/status\s+= 'published'/);
    expect(text).not.toMatch(/\bDELETE\b|\bDROP\b|\bTRUNCATE\b/i);
    expect(text).toContain("VALUES ('2026-10-29_049', 'templates: katalog Lajur')");
  });

  it('gambar pratinjau katalog ada di public/, 1600×1000, VP8/VP8X, dan ringan', () => {
    for (const name of ['lajur-preview', 'lajur-1', 'lajur-2']) {
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

  it('halaman katalog: judul ≤ 60 huruf, deskripsi dengan kalimat domain tetap, H1, salinan jujur dengan kalimat "tidak dilakukan"', () => {
    const title = (catalogSeo.title ?? '').replace('{nama}', 'Lajur').replace('{harga_singkat}', 'Rp1,69 jt');
    expect(title).toBe('Lajur: Template Website Sewa Bus Pariwisata – Rp1,69 jt');
    expect(title.length).toBeLessThanOrEqual(60);
    expect(catalogSeo.description).toMatch(/^.{1,69} \{harga\} sudah termasuk hosting & SSL tahun pertama; domain mulai \{domain_mulai\}\/tahun\.$/);
    expect(catalogSeo.niche).toBe('Sewa Bus Pariwisata');
    expect(catalogSeo.updated).toBe('2026-10-30');
    expect(catalogPage.h1).toBe('{nama}: Template Website Sewa Bus Pariwisata');
    expect(catalogPage.niche).toBe('sewa bus pariwisata');
    const text = JSON.stringify(catalogContent);
    expect(text).toMatch(/fiktif/);
    expect(text).toContain('Formulir hanya menyusun pesan WhatsApp; harga final dan ketersediaan armada dikonfirmasi admin.');
    expect(text).toContain('Tidak ada pembayaran online, e-tiket, ketersediaan armada real-time, akun member, atau pelacakan GPS.');
    // Kata kunci spesifikasi (huruf besar di awal kalimat boleh)
    expect(text).toMatch(/template website sewa bus pariwisata/);
    expect(text).toMatch(/website PO bus pariwisata/i);
    expect(text).toMatch(/website rental bus/i);
    expect(text).not.toMatch(/\b(dijamin|garansi|terbaik nomor|rating \d|bintang \d|#1)\b|1\.690\.000|termasuk domain|izin trayek|berizin|terdaftar resmi|asuransi/i);
    expect(text).not.toMatch(/\d+ (hari|jam) kerja/);
    expect(catalogContent.guides).toEqual(['template-vs-jasa-website-custom', 'biaya-website-company-profile']);
    expect(Object.keys(catalogContent.imageAlts ?? {})).toEqual(['lajur-preview.webp', 'lajur-1.webp', 'lajur-2.webp']);
    for (const alt of Object.values(catalogContent.imageAlts ?? {})) expect(alt).toContain('{nama}');
  });
});

describe('Lajur: konten aneh', () => {
  it('angka, null, dan string di tempat list tidak membuat crash; tautan & gambar berbahaya dibuang', () => {
    const weird = {
      hero: { image: 'javascript:alert(1)', header_url: 'javascript:alert(1)', subtitle: 7 },
      fleet: { items: [null, 'x', { name: 3 }, { name: 'Bus A', seats: 'empat puluh 40', price: 'abc', facilities: {}, image: 'javascript:alert(1)' }] },
      convoy: { default_people: {} },
      film: { chapters: 'x' },
      routes: { items: [{ name: 'Dieng', price: 'abc', image: 'javascript:alert(1)' }, null] },
      included: { included: 5, excluded: [null, { text: 'Tol' }] },
      steps: { items: 5 },
      testimonials: { items: [{ quote: 'Bagus', name: null }] },
      gallery: { items: [{ image: 'javascript:alert(1)', caption: 'x' }] },
      faq: { items: [{ question: 2, answer: null }], link_url: 'vbscript:x' },
      contact: { whatsapp: 'abc', maps_url: 'javascript:alert(1)' },
      footer: { instagram: 'javascript:alert(1)', cta_url: 'javascript:alert(1)' },
      brand: { accent_color: 'oranye' },
    } as unknown as SiteContent;
    const { container } = render(<def.Component content={resolveContent(def, weird)} />);
    expect(container.querySelector('a[href^="javascript:"], a[href^="vbscript:"]')).toBeNull();
    expect(container.querySelector('img[src^="javascript:"], img[src^="vbscript:"]')).toBeNull();
    expect(container.querySelector('iframe[src^="javascript:"]')).toBeNull();
    expect(container.querySelector('h1')!.textContent).toBe('Sewa bus pariwisata untuk setiap rombongan.');
    expect(section(container, 'fleet').textContent).toContain('Bus A');
    expect(section(container, 'fleet').textContent).toContain('Harga menyusul');
    expect(section(container, 'routes').textContent).toContain('Dieng');
    expect(container.textContent).not.toMatch(/NaN|undefined|Infinity|\[object Object\]/);
    expect(rootStyle(container, '--lj-ink')).toBe('#815d06');
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

describe('Lajur: perbaikan tinjauan live 2026-10-31', () => {
  const cls = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/);

  it('film bergerak: keterangan bab bertumpuk di satu sel grid (tidak naik menimpa kalimat pengantar di HP 320px), kolom jam tidak meluber ke kiri di 1024–1100px, jam rel utuh, "Lewati animasi" ikut alur', () => {
    const film = section(demo(), 'film');
    expect(film).toHaveAttribute('data-film', 'scroll');
    const caps = film.querySelector('.lj-caps')!;
    // grid satu sel: tinggi baris = keterangan terpanjang; menyusut (maks. 300px), bukan basis 300px yang mendorong jam
    expect(cls(caps)).toEqual(expect.arrayContaining(['grid', 'min-w-0', 'flex-1', '@5xl:max-w-[300px]']));
    expect(cls(caps)).not.toEqual(expect.arrayContaining(['@5xl:flex-none']));
    expect(cls(caps)).not.toContain('@5xl:basis-[300px]');
    for (const cap of film.querySelectorAll('.lj-cap')) {
      expect(cls(cap)).toEqual(expect.arrayContaining(['col-start-1', 'row-start-1', 'self-end']));
      expect(cls(cap)).not.toContain('absolute');
    }
    // Rel: jarak kanan 4px + jam 11px di bawah 360px ("13.00" di jendela bab ±45px tidak jadi "13…")
    const rail = within(film).getByRole('list', { name: 'Bab perjalanan' });
    for (const li of rail.querySelectorAll(':scope > li')) {
      expect(cls(li)).toEqual(expect.arrayContaining(['pr-1', '@3xl:pr-2']));
      expect(cls(li.querySelector('.truncate')!)).toEqual(expect.arrayContaining(['text-[11px]', '@min-[22.5rem]:text-[12px]', '@3xl:text-[13px]']));
    }
    const skip = within(film).getByRole('link', { name: 'Lewati animasi' });
    expect(cls(skip)).toEqual(expect.arrayContaining(['focus:static', '@5xl:focus:col-span-12']));
    expect(skip.className).not.toMatch(/focus:absolute|focus:right-|focus:top-/);
  });

  it('tujuan favorit: "Mulai" baris sendiri di kartu sempit (rel HP & 4 kolom 1024–1279px) dan angka 15px di 4 kolom sempit — jumlah baris harga sama di semua kartu, garis jalur sejajar', () => {
    const list = within(section(demo(), 'routes')).getByRole('list', { name: 'Tujuan favorit' });
    const rows = Array.from(list.querySelectorAll('.lj-lane-line')).map((line) => line.nextElementSibling!);
    expect(rows).toHaveLength(8);
    for (const row of rows) {
      const [label, price] = Array.from(row.children);
      expect(label.textContent).toBe('Mulai');
      expect(cls(label)).toEqual(expect.arrayContaining(['basis-full', '@2xl:basis-auto', '@5xl:basis-full', '@min-[80rem]:basis-auto']));
      expect(cls(price)).toEqual(expect.arrayContaining(['text-[16px]', '@3xl:text-[17px]', '@5xl:text-[15px]', '@min-[80rem]:text-[17px]', '@min-[150rem]:text-[15px]']));
    }
  });

  it('hero: lajur kanan HP untuk kalimat & tombol (tombol WhatsApp melayang 48px @ 16px / situs 56px @ 32px), hero layar lebar 40px lebih pendek, catatan bilah 32px dari tepi', () => {
    const hero = section(demo(), 'hero');
    const lead = Array.from(hero.querySelectorAll('p')).find((p) => p.textContent?.startsWith('Big bus, medium bus'))!;
    expect(cls(lead)).toContain('max-w-[min(46ch,calc(100%-var(--lj-lane)))]');
    const column = lead.parentElement!;
    expect(cls(column)).toEqual(expect.arrayContaining(['[--lj-lane:3.25rem]', '@xl:[--lj-lane:4.75rem]', '@2xl:[--lj-lane:4rem]', '@3xl:[--lj-lane:0px]']));
    const buttons = Array.from(column.children).find((el) => el.querySelector('a'))!;
    expect(cls(buttons)).toContain('pr-(--lj-lane)');
    // Judul tidak ikut menyempit (letaknya jauh di atas tombol WhatsApp)
    expect(hero.querySelector('h1')!.className).not.toContain('--lj-lane');
    const inner = column.parentElement!;
    expect(cls(inner)).toContain('@5xl:min-h-[max(520px,min(calc(100svh-var(--tpl-sticky-top,0px)-76px-112px),820px))]');
    expect(cls(inner)).toContain('@3xl:min-h-[max(520px,min(calc(100svh-var(--tpl-sticky-top,0px)-76px-72px),820px))]');
    const note = Array.from(hero.querySelectorAll('p')).find((p) => p.textContent?.startsWith('Formulir hanya menyusun pesan WhatsApp'))!;
    expect(cls(note)).toEqual(expect.arrayContaining(['@5xl:mr-8', '@5xl:text-right']));
  });

  it('kalkulator: label tombol "Minta penawaran untuk N peserta" boleh terlipat di HP (whitespace-normal! mengalahkan whitespace-nowrap tombol), sebaris mulai @5xl; footer: nama usaha panjang dipotong di dalam kolom', () => {
    const container = demo();
    const button = Array.from(section(container, 'convoy').querySelectorAll('a')).find((a) => /untuk \d+ peserta/.test(a.textContent ?? ''))!;
    expect(cls(button)).toEqual(expect.arrayContaining(['whitespace-normal!', '@5xl:whitespace-nowrap!']));
    expect(cls(button)).not.toContain('whitespace-normal');
    const brand = within(container.querySelector('footer')!).getByRole('link', { name: `${BRAND}, ke awal halaman` });
    expect(cls(brand)).toEqual(expect.arrayContaining(['min-w-0', 'max-w-full']));
  });
});
