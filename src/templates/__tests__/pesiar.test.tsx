// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/pesiar.test.tsx
// Pesiar (private tour Bali & sewa mobil dengan sopir, batch travel 2026-10-29): skema CMS & konten demo, foto, salinan
// jujur (formulir hanya menyusun pesan WhatsApp, harga contoh per mobil, tanpa pembayaran online / e-tiket / pelacakan
// penerbangan, tanpa merek mobil, maskapai, atau klaim izin), helper model (warna tema, menu, tujuan tautan, harga & jam,
// tur, mobil, Rancang tur: pilih/urutkan tempat + perkiraan jam & harga per mobil, antar-jemput bandara: harga per area +
// validasi, pesan WhatsApp, garis waktu & kamera & progres film), demo (urutan section, hero vista, header + menu HP,
// kartu tur → WhatsApp / "Ubah rute" → Rancang tur, Rancang tur & bandara → pesan, tab cerita tamu, akordeon), wadah
// selebar penuh (WRAP), FILM (poster diam saat gerak mati; jalur tinggi + panggung lengket + pendengar dipasang/dilepas
// saat gerak menyala), datar tanpa bayangan, gerak bergerbang data-tpl-motion, warna tema, SEO situs pembeli, judul &
// gambar & tautan, konten opsional kosong, editor CMS, data katalog (migrasi 053 + pratinjau + halaman katalog), dan
// konten aneh.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionEditor } from '../../pages/account/cms/SectionEditor';
import { validateContent } from '../../pages/account/cms/validation';
import { seo as catalogSeo, page as catalogPage } from '../../content/templates/pesiar';
import { content as catalogContent } from '../../content/templates/pesiar.content';
import { TEMPLATES, resolveContent } from '../index';
import { iconKey } from '../pesiar/icons';
import { ROUTE_LEGS, STOP_POINTS } from '../pesiar/map';
import {
  DEEP,
  FILM_WIDE,
  MAX_STOPS,
  NBSP,
  PAGE_SECTIONS,
  ROUTE_FRAME,
  ROUTE_VIEW,
  ROUTE_LENGTHS,
  SAND,
  cameraAt,
  carKind,
  carLabel,
  cleanText,
  displayPhone,
  filmDepartures,
  filmFrame,
  filmGeometry,
  filmMinutes,
  filmPlan,
  filmProgress,
  formatClock,
  formatDecimal,
  formatHours,
  formatLongDate,
  formatPriceShort,
  formatRupiah,
  filmLegCount,
  lookAhead,
  maxSeats,
  messageMailHref,
  moveStop,
  navItems,
  needsMoreCars,
  normalizeFlight,
  parseClock,
  parseHours,
  parsePrice,
  pesiarVars,
  pickupAreas,
  planEstimate,
  plannerMessage,
  plannerSettings,
  pointOnPolyline,
  readCars,
  readDestinations,
  readFilmStops,
  readPesiar,
  readTours,
  readZones,
  sectionShown,
  sectionTarget,
  splitStops,
  stopsFromTour,
  todayIso,
  toggleStop,
  tourMessage,
  transferMessage,
  transferPrice,
  validatePlanner,
  validateTransfer,
  type PlannerForm,
  type TransferForm,
} from '../pesiar/model';
import { PESIAR_PHOTOS } from '../pesiar/photos';
import { SERIF, WRAP } from '../pesiar/styles';
import { applySiteHead, siteTitle } from '../siteHead';
import { SiteRenderer } from '../SiteRenderer';
import { contrast, parseHex } from '../shared/utils';
import { isListField, type SiteContent } from '../types';

// Demo panjang + getByRole di jsdom: bisa lewat 5 dtk saat suite berjalan paralel
vi.setConfig({ testTimeout: 30_000 });

const ROOT = process.cwd();
const def = TEMPLATES.pesiar;
const ORDER = ['hero', 'tours', 'planner', 'film', 'included', 'cars', 'transfer', 'testimonials', 'faq', 'contact'];
const sectionKeys = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-tpl-section]')).map((s) => s.getAttribute('data-tpl-section'));
const section = (root: HTMLElement, key: string) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`)!;
const demo = (content: unknown = null, preview = false) => render(<SiteRenderer templateCode="pesiar" content={content} preview={preview} />).container;
const rgb = (hex: string) => parseHex(hex)!;
const publicFile = (url: string) => resolve(ROOT, 'public', url.replace(/^\//, ''));
const rootStyle = (container: HTMLElement, name: string) => {
  const holder = Array.from(container.querySelectorAll<HTMLElement>('[style]')).find((el) => el.style.getPropertyValue(name));
  return holder?.style.getPropertyValue(name) ?? '';
};
const urls = (src: string) => {
  const asset = PESIAR_PHOTOS.asset(src)!;
  return [asset.src, ...asset.srcSet!.split(',').map((part) => part.trim().split(' ')[0])].filter((u, i, all) => all.indexOf(u) === i);
};
/** Spasi tak terputus → spasi biasa ("Rp1,1 jt", "± 9 jam" memakai NBSP agar tidak terbelah). */
const plain = (s: string | null | undefined) => (s ?? '').split(NBSP).join(' ');
const wait = (ms: number) => act(() => new Promise<void>((r) => setTimeout(r, ms)));
const decode = (a: Element) => decodeURIComponent(a.getAttribute('href') ?? '');
const WA = 'https://wa.me/6281234567890?text=';
const CONTENT = resolveContent(def, null);
const M = readPesiar(CONTENT);
const TODAY = '2026-10-29';
const read = (path: string) => readFileSync(resolve(ROOT, path), 'utf8');
const TSX = ['Pesiar', 'Header', 'Hero', 'Tours', 'Planner', 'Film', 'Transfer', 'Cars', 'Stories', 'Closing', 'Footer', 'ui', 'marks', 'scenes', 'vehicles'];
const TS = ['index', 'styles', 'model', 'icons', 'hooks', 'schema', 'defaultContent', 'photos', 'map'];
const source = () =>
  [...TSX.map((f) => read(`src/templates/pesiar/${f}.tsx`)), ...TS.map((f) => read(`src/templates/pesiar/${f}.ts`)), read('src/templates/pesiar/pesiar.css')].join('\n');
/** Kode tanpa komentar */
const code = () => source().replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const css = () => read('src/templates/pesiar/pesiar.css').replace(/\/\*[\s\S]*?\*\//g, '');
const dest = (name: string) => M.destinations.find((d) => d.name === name)!;
const pick = (...names: string[]) => names.map(dest);
const planner = (patch: Partial<PlannerForm> = {}): PlannerForm => ({ stops: ['celuk', 'ubud', 'tegallalang'], pickup: 'Seminyak', date: '2026-11-14', car: 0, ...patch });
const transfer = (patch: Partial<TransferForm> = {}): TransferForm => ({
  direction: 'arrive',
  date: '2026-11-14',
  time: '14:35',
  flight: 'ga404',
  zone: 1,
  hotel: 'Vila Kenanga, Jl. Contoh 3',
  pax: '3',
  car: 1,
  ...patch,
});
/** Elemen yang memakai SEMUA kelas WRAP (wadah selebar penuh Pesiar) */
const wrapsIn = (root: Element) => Array.from(root.querySelectorAll<HTMLElement>('*')).filter((el) => WRAP.split(' ').every((c) => el.classList.contains(c)));
const routeNames = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-tpl-tone="inverse"] ol > li')).map((li) => li.querySelector('.font-semibold')!.textContent);

let scrolled: (string | null)[] = [];
beforeEach(() => {
  scrolled = [];
  Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
    scrolled.push(this.getAttribute('data-tpl-section'));
  });
});
afterEach(cleanup);

describe('Pesiar: skema & konten bawaan', () => {
  it('urutan form = urutan halaman, semua section bisa disembunyikan, field unik, teks berbatas, list berbatas', () => {
    expect(def.code).toBe('pesiar');
    expect(def.name).toBe('Pesiar');
    expect(def.features).toBeUndefined();
    expect(def.sections.map((s) => s.key)).toEqual(['brand', ...ORDER, 'footer']);
    expect([...PAGE_SECTIONS]).toEqual([...ORDER, 'footer']);
    const fields = (key: string) => def.sections.find((s) => s.key === key)!.fields.map((f) => f.key);
    expect(fields('brand')).toEqual(['company_name', 'tagline', 'logo', 'accent_color']);
    expect(def.sections[0].fields.find((f) => f.key === 'accent_color')?.type).toBe('color');
    expect(fields('hero')).toEqual(['eyebrow', 'title', 'subtitle', 'image', 'primary_label', 'primary_url', 'secondary_label', 'secondary_url', 'trust', 'header_label', 'header_url']);
    expect(fields('tours')).toEqual(expect.arrayContaining(['book_label', 'edit_label', 'note', 'items']));
    expect(fields('planner')).toEqual(expect.arrayContaining(['base_hours', 'buffer_hours', 'pickup_areas', 'destinations', 'button_label', 'note']));
    expect(fields('film')).toEqual(expect.arrayContaining(['note', 'stops']));
    expect(fields('transfer')).toEqual(expect.arrayContaining(['image', 'zones', 'notes', 'form_title', 'form_button', 'form_note']));
    expect(fields('cars')).toEqual(expect.arrayContaining(['items', 'drivers_title', 'drivers']));
    expect(fields('included')).toEqual(expect.arrayContaining(['yes_title', 'yes', 'no_title', 'no']));
    expect(fields('faq')).toEqual(expect.arrayContaining(['link_label', 'link_url', 'items']));
    expect(fields('contact')).toEqual(expect.arrayContaining(['address', 'maps_query', 'maps_url', 'phone', 'email', 'whatsapp', 'whatsapp_message', 'hours']));
    expect(fields('footer')).toEqual(['image', 'description', 'note', 'copyright', 'instagram', 'facebook', 'linkedin', 'youtube', 'tiktok']);
    const contact = def.sections.find((s) => s.key === 'contact')!;
    expect(contact.fields.find((f) => f.key === 'whatsapp')?.type).toBe('phone');
    // Hero: foto latar bernama `image` (dibaca tes bersama new-templates)
    expect(def.sections.find((s) => s.key === 'hero')!.fields.find((f) => f.key === 'image')?.type).toBe('image');
    const sub = (key: string, list: string) => {
      const f = def.sections.find((s) => s.key === key)!.fields.find((x) => x.key === list)!;
      return isListField(f) ? f.fields.map((x) => x.key) : [];
    };
    expect(sub('tours', 'items')).toEqual(['name', 'hours', 'stops', 'price', 'image']);
    expect(sub('planner', 'destinations')).toEqual(['name', 'area', 'hours']);
    expect(sub('film', 'stops')).toEqual(['time', 'name', 'text', 'image']);
    expect(sub('transfer', 'zones')).toEqual(['name', 'time', 'price_1', 'price_2', 'price_3', 'price_4']);
    expect(sub('cars', 'items')).toEqual(['name', 'seats', 'luggage', 'price', 'overtime', 'image']);
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
          for (const sf of f.fields) {
            expect(sf.introduced, `${s.key}.${f.key}.${sf.key}`).toBeUndefined();
            if (['text', 'textarea', 'phone', 'email'].includes(sf.type)) expect(sf.maxLength, `${s.key}.${f.key}.${sf.key}`).toBeGreaterThan(0);
          }
        } else if (['text', 'textarea', 'phone', 'email'].includes(f.type)) {
          expect(f.maxLength, `${s.key}.${f.key}`).toBeGreaterThan(0);
        }
      }
    }
    // Batas yang disebut di halaman katalog (pesiar.content.ts) dan dipakai model (sectionItems)
    expect(max).toEqual({
      'hero.trust': 3,
      'tours.items': 8,
      'planner.destinations': 16,
      'film.stops': 6,
      'transfer.zones': 8,
      'transfer.notes': 4,
      'cars.items': 4,
      'cars.drivers': 6,
      'included.yes': 8,
      'included.no': 8,
      'testimonials.items': 6,
      'faq.items': 8,
    });
    const page = JSON.stringify(catalogContent);
    for (const claim of ['Hingga 8 kartu', 'hingga 5 dari 16 tempat', '6 perhentian', 'hingga 8 area', 'Hingga 4 kelas mobil', 'daftar 6 sopir', 'hingga 6 cerita', 'Hingga 8 pertanyaan']) {
      expect(page, claim).toContain(claim);
    }
    expect(MAX_STOPS).toBe(5);
  });

  it('konten demo lolos validasi CMS, logo kosong, semua foto terdaftar, ada di public/, dipakai, dan beralt deskriptif', () => {
    const c = def.defaultContent;
    expect(validateContent(def, resolveContent(def, null))).toEqual({});
    expect(c.brand.logo).toBe('');
    expect(c.brand.accent_color).toBe('#B5446E');
    expect(c.brand.company_name).toBe('Pesiar Bali');
    expect(c.brand.tagline).toBe('Private tour & sewa mobil dengan sopir');
    expect(c.contact.whatsapp).toBe('081234567890');
    expect(c.contact.phone).toBe('081234567890');
    expect(c.hero.image).toBe('/assets/templates/photos/pesiar-hero-1920.webp');
    for (const s of def.sections) if (s.key !== 'brand') expect(c[s.key].enabled, s.key).toBe(true);
    const photos = JSON.stringify(c).match(/\/assets\/templates\/photos\/[a-z0-9-]+\.webp/g) ?? [];
    for (const src of photos) expect(PESIAR_PHOTOS.asset(src), src).not.toBeNull();
    expect(PESIAR_PHOTOS.keys).toHaveLength(13);
    for (const key of PESIAR_PHOTOS.keys) {
      expect(key.startsWith('pesiar-'), key).toBe(true);
      for (const url of urls(PESIAR_PHOTOS.src(key))) expect(existsSync(publicFile(url)), url).toBe(true);
      expect(photos, `${key} dipakai di konten demo`).toContain(PESIAR_PHOTOS.src(key));
      expect(PESIAR_PHOTOS.alt(PESIAR_PHOTOS.src(key), '').split(' ').length, key).toBeGreaterThanOrEqual(5);
    }
    // Simbol bawaan juga tersedia sebagai SVG mandiri, path sama dengan komponen
    const mark = read('public/assets/templates/logos/pesiar-mark.svg');
    const component = read('src/templates/pesiar/marks.tsx');
    const paths = mark.match(/ d="[^"]+"/g) ?? [];
    expect(paths).toHaveLength(2);
    for (const d of paths) expect(component, d).toContain(d.trim());
    expect(mark).toMatch(/viewBox="0 0 32 32"/);
    expect(mark).toMatch(/role="img"/);
    expect(mark).toMatch(/<title>/);
    // Judul tab situs pembeli ≤ 60 huruf; hero sederhana: label ≤ 60, H1 ≤ 8 kata, kalimat 120–140 huruf, ≤ 3 keunggulan
    expect(`${c.brand.company_name} — ${c.brand.tagline}`.length).toBeLessThanOrEqual(60);
    expect(String(c.hero.eyebrow).length).toBeLessThanOrEqual(60);
    expect(String(c.hero.title).split(' ').length).toBeLessThanOrEqual(8);
    expect(String(c.hero.subtitle).length).toBeGreaterThanOrEqual(120);
    expect(String(c.hero.subtitle).length).toBeLessThanOrEqual(140);
    expect(c.hero.trust).toHaveLength(3);
    // Satu pola kepala section: H2 ≤ 8 kata, satu kalimat pengantar ≤ 110 huruf; kartu ≤ 120 huruf
    for (const key of ORDER.filter((k) => k !== 'hero')) {
      expect(String(c[key].title).split(' ').length, key).toBeLessThanOrEqual(8);
      if (c[key].subtitle) expect(String(c[key].subtitle).length, key).toBeLessThanOrEqual(110);
    }
    for (const s of c.film.stops as { text: string }[]) expect(s.text.length).toBeLessThanOrEqual(80);
    for (const t of c.testimonials.items as { quote: string }[]) expect(t.quote.length).toBeLessThanOrEqual(120);
    // Angka di salinan = data: tiap tur sama dengan hasil Rancang tur untuk sedan (lama & harga), 14 tempat, 3 mobil, 5 area
    for (const tour of M.tourList) {
      const est = planEstimate(stopsFromTour(tour, M.destinations).map((id) => M.destinations.find((d) => d.id === id)!), M.cars[0], M.settings);
      expect(est.hours, tour.name).toBe(tour.hours);
      expect(est.price, tour.name).toBe(tour.price);
      expect(stopsFromTour(tour, M.destinations), tour.name).toHaveLength(tour.stops.length);
    }
    expect(M.destinations).toHaveLength(14);
    expect(M.cars.map((car) => car.name)).toEqual(['Sedan', 'MPV', 'Minibus']);
    expect(M.zones).toHaveLength(5);
    expect(String(c.faq.items && JSON.stringify(c.faq.items))).toContain('paket 10 jam');
    expect(M.settings.baseHours).toBe(10);
    // Film: tempat perhentian sama dengan pin peta (Seminyak → Celuk → Tegallalang → Kintamani → Tirta Empul → Seminyak)
    expect(M.stops.map((s) => `${s.time} ${s.name}`)).toEqual(['08.00 Seminyak', '09.30 Celuk', '11.00 Tegallalang', '13.00 Kintamani', '15.30 Tirta Empul', '18.00 Seminyak']);
  });

  // CREDITS.md gets this template's section at integration
  it('setiap kunci foto tercatat di CREDITS.md', () => {
    const credits = read('public/assets/templates/photos/CREDITS.md');
    expect(PESIAR_PHOTOS.keys.filter((key) => !credits.includes(`\`${key}-*\``))).toEqual([]);
  });

  it('foto demo ringan: hero 800/1280/1920, WebP ≤ 140 KB per file (800w ≤ 90 KB), total ≤ 2,5 MB', () => {
    expect(PESIAR_PHOTOS.asset(def.defaultContent.hero.image as string)!.srcSet).toBe(
      '/assets/templates/photos/pesiar-hero-800.webp 800w, /assets/templates/photos/pesiar-hero-1280.webp 1280w, /assets/templates/photos/pesiar-hero-1920.webp 1920w',
    );
    let total = 0;
    let files = 0;
    for (const key of PESIAR_PHOTOS.keys) {
      const variants = urls(PESIAR_PHOTOS.src(key));
      expect(variants.length, key).toBeGreaterThanOrEqual(2);
      expect(variants.some((u) => u.endsWith('-800.webp')), key).toBe(true);
      for (const url of variants) {
        expect(url, url).toMatch(/\.webp$/);
        const kb = statSync(publicFile(url)).size / 1024;
        expect(kb, url).toBeLessThanOrEqual(url.endsWith('-800.webp') ? 90 : 140);
        expect(readFileSync(publicFile(url)).toString('ascii', 8, 12), url).toBe('WEBP');
        total += kb;
        files += 1;
      }
    }
    expect(files).toBe(27);
    expect(total).toBeLessThanOrEqual(2500);
    // Hanya foto Pesiar yang tercatat di registry yang ada di public/ (tanpa file yatim)
    const onDisk = readdirSync(resolve(ROOT, 'public/assets/templates/photos')).filter((f) => f.startsWith('pesiar-'));
    expect(onDisk).toHaveLength(27);
  });

  it('salinan demo jujur: tanpa janji/merek/izin, formulir hanya menyusun pesan WhatsApp, harga contoh per mobil', () => {
    const text = JSON.stringify(def.defaultContent);
    expect(text).not.toMatch(/dijamin|garansi|\bpasti\b|terbaik|nomor 1|#1\b|termurah|100%|paling aman|anti telat/i);
    // Tanpa merek/model kendaraan dan nama maskapai (kelas mobil + "atau setara")
    expect(text).not.toMatch(
      /\b(mercedes|benz|hino|scania|volvo|toyota|avanza|innova|hiace|hi-ace|elf|alphard|pajero|xenia|ertiga|xpander|fortuner|honda|suzuki|daihatsu|mitsubishi|isuzu|nissan|hyundai|wuling|mazda|garuda indonesia|lion air|citilink|batik air|airasia|super air jet|wings air)\b/i,
    );
    // Tanpa klaim izin, keanggotaan, sertifikat, atau asuransi sebagai fakta
    expect(text).not.toMatch(/izin|berizin|terdaftar|kemenhub|dishub|asita|ipomi|pawiba|uji kir|\bISO\b|asuransi|jasa raharja|bersertifikat|resmi/i);
    // Kalimat "tidak melakukan" yang dikunci
    expect(text).toContain('Formulir hanya menyusun pesan WhatsApp; harga contoh per mobil, tiket masuk dan makan tidak termasuk. Tidak ada pembayaran online.');
    expect(text).toContain('Formulir hanya menyusun pesan WhatsApp. Tidak ada pembayaran online dan tidak ada pelacakan penerbangan otomatis.');
    expect(text).toContain('Harga contoh per mobil (sedan), bukan per orang. Tiket masuk dan makan belum termasuk.');
    expect(text).toContain('Website ini tidak memproses pembayaran.');
    expect(text).toContain('Rute contoh. Waktu tempuh perkiraan dan mengikuti lalu lintas.');
    expect(text).toContain('Harga dan rute di situs ini contoh; konfirmasi lewat WhatsApp.');
    expect(text).toContain('Kami menyebut kelas mobil, bukan merek.');
    expect(text).toContain('Harga contoh per mobil; dikonfirmasi admin lewat WhatsApp.');
    expect(text).toContain('@example.com');
    expect(text).not.toMatch(/@(gmail|yahoo)\./);
    // Sopir dan tamu fiktif tanpa foto wajah (monogram/inisial)
    for (const s of ['testimonials']) expect(JSON.stringify(def.defaultContent[s]), s).not.toMatch(/\.webp/);
    expect(JSON.stringify(def.defaultContent.cars.drivers)).not.toMatch(/\.webp/);
    expect(JSON.stringify(def.defaultContent.cars.items)).not.toMatch(/\.webp/);
  });
});

describe('Pesiar: helper model', () => {
  it('warna tema: teks aksen ≥ 4,6:1 di pasir & ≥ 4,5:1 di putih, aksen terang ≥ 4,8:1 di hijau tua; tidak valid → bawaan', () => {
    const white = rgb('#ffffff');
    expect(pesiarVars('#B5446E')).toEqual({ '--ps-ink': '#a44065', '--ps-bright': '#ce85a1' });
    for (const accent of ['#B5446E', '#0050FF', '#FFB703', '#277A36', '#D81E5B', '#C6F135', '#FACC15', '#FFFFFF', '#000000', '#6EE7B7', '#F5EFE6', '#17332B', '#7C3AED', '#1E2622']) {
      const vars = pesiarVars(accent) as Record<string, string>;
      const ink = rgb(vars['--ps-ink']);
      const bright = rgb(vars['--ps-bright']);
      expect(contrast(ink, SAND), accent).toBeGreaterThanOrEqual(4.6);
      expect(contrast(ink, white), accent).toBeGreaterThanOrEqual(4.5);
      expect(contrast(bright, DEEP), accent).toBeGreaterThanOrEqual(4.8);
    }
    // Netral tetap: hijau tua vs putih/pasir, tinta di pasir, abu-abu teks (brief)
    expect(contrast(DEEP, white)).toBeGreaterThanOrEqual(12);
    expect(contrast(rgb('#1E2622'), SAND)).toBeGreaterThanOrEqual(12);
    expect(contrast(rgb('#5A6560'), SAND)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(rgb('#5A6560'), white)).toBeGreaterThanOrEqual(4.5);
    // Putih di atas aksen bawaan (tombol) ≥ 4,5:1
    expect(contrast(white, rgb('#B5446E'))).toBeGreaterThanOrEqual(4.5);
    expect(pesiarVars('zzz')).toEqual(pesiarVars('#B5446E'));
    expect(pesiarVars('')).toEqual(pesiarVars('#B5446E'));
  });

  it('menu: ≤ 6 kata benda pendek, section kosong/tersembunyi keluar dari menu', () => {
    expect(navItems(CONTENT).map((i) => `${i.key}:${i.label}`)).toEqual(['tours:Tur', 'planner:Rancang', 'cars:Mobil', 'transfer:Bandara', 'faq:FAQ', 'contact:Kontak']);
    const less = resolveContent(def, {
      tours: { items: [{ hours: '8', price: '1' }] },
      planner: { destinations: [{ area: 'tanpa nama' }] },
      transfer: { enabled: false },
      faq: { items: [] },
    });
    expect(navItems(less).map((i) => i.key)).toEqual(['cars', 'contact']);
  });

  it('tujuan tautan: anchor Indonesia dan kunci section; anchor tak dikenal → null; tujuan tombol menu atas', () => {
    expect(sectionTarget('#tur')).toBe('tours');
    expect(sectionTarget('#paket')).toBe('tours');
    expect(sectionTarget('#rancang')).toBe('planner');
    expect(sectionTarget('#rancang-tur')).toBe('planner');
    expect(sectionTarget('#perjalanan')).toBe('film');
    expect(sectionTarget('#bandara')).toBe('transfer');
    expect(sectionTarget('#antar-jemput')).toBe('transfer');
    expect(sectionTarget('#mobil')).toBe('cars');
    expect(sectionTarget('#sopir')).toBe('cars');
    expect(sectionTarget('#harga')).toBe('included');
    expect(sectionTarget('#termasuk')).toBe('included');
    expect(sectionTarget('#testimoni')).toBe('testimonials');
    expect(sectionTarget('#tanya-jawab')).toBe('faq');
    expect(sectionTarget('#kontak')).toBe('contact');
    expect(sectionTarget('#beranda')).toBe('hero');
    expect(sectionTarget('planner')).toBe('planner');
    expect(sectionTarget('#tidak-ada')).toBeNull();
    expect(sectionTarget('#brand')).toBeNull();
    expect(M.headerAction).toEqual({ kind: 'section', target: 'planner' });
    expect(M.linkOr('#bandara', null)).toEqual({ kind: 'section', target: 'transfer' });
    expect(M.linkOr('#beranda', null)).toEqual({ kind: 'section', target: 'hero' });
    expect(M.linkOr('#tidak-ada', M.bookAction)).toEqual({ kind: 'section', target: 'planner' });
    expect(M.linkOr('https://contoh.test/brosur', null)).toEqual({ kind: 'external', href: 'https://contoh.test/brosur' });
    expect(M.linkOr('javascript:alert(1)', null)).toBeNull();
    expect(M.nextShown('film')).toBe('included');
    expect(M.nextShown('contact')).toBe('footer');
    const noPlanner = readPesiar(resolveContent(def, { planner: { enabled: false } }));
    expect(noPlanner.headerAction).toEqual({ kind: 'section', target: 'tours' });
    expect(noPlanner.linkOr('#rancang', null)).toBeNull();
    const onlyContact = readPesiar(resolveContent(def, { planner: { enabled: false }, tours: { enabled: false } }));
    expect(onlyContact.headerAction).toEqual({ kind: 'section', target: 'contact' });
    const onlyWa = readPesiar(resolveContent(def, { planner: { enabled: false }, tours: { enabled: false }, contact: { enabled: false } }));
    expect(onlyWa.headerAction?.kind).toBe('external');
    const none = readPesiar(resolveContent(def, { planner: { enabled: false }, tours: { enabled: false }, contact: { enabled: false, whatsapp: '' } }));
    expect(none.headerAction).toBeNull();
    expect(readPesiar(resolveContent(def, { hero: { header_url: '#bandara' } })).headerAction).toEqual({ kind: 'section', target: 'transfer' });
    expect(readPesiar(resolveContent(def, { included: { enabled: false } })).nextShown('film')).toBe('cars');
    expect(readPesiar(resolveContent(def, { footer: { enabled: false } })).nextShown('contact')).toBeNull();
  });

  it('section tampil hanya bila berisi', () => {
    for (const key of ORDER) expect(sectionShown(CONTENT, key), key).toBe(true);
    expect(sectionShown(CONTENT, 'footer')).toBe(true);
    const empty = resolveContent(def, {
      tours: { items: [{ hours: '10' }] },
      planner: { destinations: [{ area: 'Ubud' }] },
      film: { stops: [{ time: '08.00' }] },
      transfer: { zones: [{ price_1: '1' }] },
      cars: { items: [{ seats: '4' }] },
      included: { yes: [{ text: '' }], no: [] },
      testimonials: { items: [{ name: 'tanpa kutipan' }] },
      faq: { items: [{ answer: 'tanpa pertanyaan' }] },
    });
    for (const key of ['tours', 'planner', 'film', 'transfer', 'cars', 'included', 'testimonials', 'faq']) expect(sectionShown(empty, key), key).toBe(false);
    // Hero, kontak, footer tampil selama diaktifkan
    for (const key of ['hero', 'contact', 'footer']) expect(sectionShown(empty, key), key).toBe(true);
    expect(sectionShown(resolveContent(def, { contact: { enabled: false } }), 'contact')).toBe(false);
    expect(sectionShown(CONTENT, 'tidak-ada')).toBe(false);
    expect(sectionShown(CONTENT, 'brand')).toBe(false);
  });

  it('harga & jam: baca angka biasa / bersatuan, tulis singkat "Rp750rb" / "Rp1,1 jt" dan penuh "Rp750.000"', () => {
    expect(parsePrice('750000')).toBe(750_000);
    expect(parsePrice('Rp750.000')).toBe(750_000);
    expect(parsePrice('Rp 750.000,-')).toBe(750_000);
    expect(parsePrice('750rb')).toBe(750_000);
    expect(parsePrice('750 ribu')).toBe(750_000);
    expect(parsePrice('75k')).toBe(75_000);
    expect(parsePrice('1,1 jt')).toBe(1_100_000);
    expect(parsePrice('1.25 juta')).toBe(1_250_000);
    expect(parsePrice('Rp1,5jt')).toBe(1_500_000);
    expect(parsePrice(12345)).toBe(12345);
    expect(parsePrice('')).toBe(0);
    expect(parsePrice('Harga menyusul')).toBe(0);
    expect(parsePrice(null)).toBe(0);
    expect(parsePrice('9'.repeat(30))).toBe(999_999_999_999);
    // Format harga Indonesia sehari-hari: desimal dibuang, kata sesudah satuan boleh; angka kedua → disembunyikan (bukan digabung)
    expect(parsePrice('Rp750.000,00')).toBe(750_000);
    expect(parsePrice('Rp 1.100.000,-')).toBe(1_100_000);
    expect(parsePrice('85rb/jam')).toBe(85_000);
    expect(parsePrice('1,1 jt / mobil')).toBe(1_100_000);
    expect(parsePrice('750 ribu per mobil')).toBe(750_000);
    expect(parsePrice('mulai Rp750rb')).toBe(750_000);
    expect(parsePrice('Rp750.000 per mobil')).toBe(750_000);
    expect(parsePrice('750.000 - 900.000')).toBe(0);
    expect(parsePrice('2 x 375.000')).toBe(0);
    expect(parsePrice('1.100rb')).toBe(1_100_000);
    expect(formatPriceShort(750_000)).toBe('Rp750rb');
    expect(formatPriceShort(825_000)).toBe('Rp825rb');
    expect(formatPriceShort(1_100_000)).toBe(`Rp1,1${NBSP}jt`);
    expect(plain(formatPriceShort(1_250_000))).toBe('Rp1,25 jt');
    expect(plain(formatPriceShort(2_000_000))).toBe('Rp2 jt');
    expect(formatPriceShort(1_500)).toBe('Rp1.500');
    expect(formatPriceShort(950)).toBe('Rp950');
    expect(formatPriceShort(0)).toBe('');
    expect(formatPriceShort(-5)).toBe('');
    expect(formatPriceShort(Number.NaN)).toBe('');
    expect(formatRupiah(1_100_000)).toBe('Rp1.100.000');
    expect(formatRupiah(0)).toBe('Rp0');
    expect(parseHours('1,5')).toBe(1.5);
    expect(parseHours('1.5')).toBe(1.5);
    expect(parseHours('2,5 jam')).toBe(2.5);
    expect(parseHours('', 1)).toBe(1);
    expect(parseHours('abc', 2)).toBe(2);
    expect(parseHours('-3', 2)).toBe(2);
    expect(parseHours('30')).toBe(24);
    expect(parseHours('± 1,5 jam', 1)).toBe(1.5);
    expect(parseHours('~2 jam')).toBe(2);
    expect(parseHours('90 menit')).toBe(1.5);
    expect(parseHours('30 mnt')).toBe(0.5);
    expect(formatHours(9.5)).toBe(`±${NBSP}9,5${NBSP}jam`);
    expect(plain(formatHours(10))).toBe('± 10 jam');
    expect(formatDecimal(1.25, 2)).toBe('1,25');
    expect(formatDecimal(2)).toBe('2');
    expect(formatDecimal(1234.5)).toBe('1.234,5');
  });

  it('tur sehari: daftar tempat, data kartu, pesan WhatsApp per tur', () => {
    expect(splitStops('Celuk, Ubud; Tegallalang → Kintamani -> Tirta Empul\nSeminyak')).toEqual(['Celuk', 'Ubud', 'Tegallalang', 'Kintamani', 'Tirta Empul', 'Seminyak']);
    expect(splitStops('a,b,c,d,e,f,g,h,i,j')).toHaveLength(8);
    expect(splitStops('')).toEqual([]);
    expect(readTours(CONTENT.tours)).toEqual([
      { index: 0, name: 'Ubud & Kintamani', hours: 10, stops: ['Celuk', 'Ubud', 'Tegallalang', 'Kintamani', 'Tirta Empul'], price: 750_000, image: '/assets/templates/photos/pesiar-ubud-960.webp' },
      { index: 1, name: 'Uluwatu & Jimbaran', hours: 8, stops: ['Nusa Dua', 'Uluwatu', 'Jimbaran'], price: 750_000, image: '/assets/templates/photos/pesiar-uluwatu-960.webp' },
      { index: 2, name: 'Bedugul & Tanah Lot', hours: 9, stops: ['Jatiluwih', 'Bedugul', 'Tanah Lot'], price: 750_000, image: '/assets/templates/photos/pesiar-tanahlot-960.webp' },
      { index: 3, name: 'Lempuyang & Bali timur', hours: 11, stops: ['Lempuyang', 'Tirta Gangga', 'Taman Ujung'], price: 825_000, image: '/assets/templates/photos/pesiar-lempuyang-960.webp' },
    ]);
    expect(tourMessage(M.tourList[0], 'Pesiar Bali')).toBe(
      [
        'Halo Pesiar Bali, saya ingin memesan tur Ubud & Kintamani (10 jam, mulai Rp750.000 per mobil).',
        'Rute: Celuk → Ubud → Tegallalang → Kintamani → Tirta Empul',
        'Mohon info tanggal yang tersedia. Terima kasih.',
      ].join('\n'),
    );
    expect(tourMessage({ ...M.tourList[1], hours: 0, price: 0, stops: [] }, '')).toBe('Halo admin, saya ingin memesan tur Uluwatu & Jimbaran.\nMohon info tanggal yang tersedia. Terima kasih.');
    expect(tourMessage({ ...M.tourList[2], hours: 9.5 }, 'Pesiar Bali').split('\n')[0]).toBe(
      'Halo Pesiar Bali, saya ingin memesan tur Bedugul & Tanah Lot (9,5 jam, mulai Rp750.000 per mobil).',
    );
  });

  it('mobil: kelas dari nama (tanpa merek), lalu dari kursi; label "atau setara"', () => {
    expect(readCars(CONTENT.cars)).toEqual([
      { index: 0, name: 'Sedan', seats: 4, luggage: '2 koper', price: 750_000, overtime: 75_000, image: '', kind: 'sedan' },
      { index: 1, name: 'MPV', seats: 6, luggage: '3 koper', price: 850_000, overtime: 85_000, image: '', kind: 'mpv' },
      { index: 2, name: 'Minibus', seats: 12, luggage: '8 koper', price: 1_100_000, overtime: 110_000, image: '', kind: 'minibus' },
    ]);
    expect(carKind('SUV 7 kursi', 7)).toBe('mpv');
    expect(carKind('Mobil keluarga', 7)).toBe('mpv');
    expect(carKind('Van 14 kursi', 14)).toBe('minibus');
    expect(carKind('Microbus', 15)).toBe('minibus');
    expect(carKind('City car', 4)).toBe('sedan');
    expect(carKind('Hatchback', 5)).toBe('sedan');
    // Kata yang hanya MEMUAT kata kelas tidak salah tebak ("Self drive", "Caravan", "Subur")
    expect(carKind('Self drive', 4)).toBe('sedan');
    expect(carKind('Caravan', 6)).toBe('mpv');
    expect(carKind('Subur', 12)).toBe('minibus');
    expect(carKind('', 9)).toBe('minibus');
    expect(carKind('', 5)).toBe('mpv');
    expect(carKind('', 0)).toBe('sedan');
    expect(carLabel(M.cars[1])).toBe('MPV 6 penumpang (atau setara)');
    expect(carLabel({ ...M.cars[2], name: 'Minibus 14 kursi', seats: 14 })).toBe('Minibus 14 kursi (atau setara)');
    expect(carLabel({ ...M.cars[0], seats: 0 })).toBe('Sedan (atau setara)');
    expect(carLabel(null)).toBe('');
  });

  it('Rancang tur: tempat (id unik), pilih ≤ 5, urutkan, tempat dari tur, jam paket, area jemput', () => {
    expect(M.destinations.slice(0, 3)).toEqual([
      { id: 'celuk', name: 'Celuk', area: 'Gianyar', hours: 1 },
      { id: 'ubud', name: 'Ubud', area: 'Gianyar', hours: 2 },
      { id: 'tegallalang', name: 'Tegallalang', area: 'Ubud utara', hours: 1.5 },
    ]);
    const dup = readDestinations({ destinations: [{ name: 'Ubud' }, { name: 'ubud', hours: 'x' }, { area: 'tanpa nama' }] } as unknown as SiteContent['planner']);
    expect(dup).toEqual([
      { id: 'ubud', name: 'Ubud', area: '', hours: 1 },
      { id: 'ubud-1', name: 'ubud', area: '', hours: 1 },
    ]);
    expect(toggleStop(['a', 'b'], 'c')).toEqual(['a', 'b', 'c']);
    expect(toggleStop(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
    expect(toggleStop(['a', 'b', 'c', 'd', 'e'], 'f')).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(toggleStop(['a', 'b', 'c', 'd', 'e'], 'e')).toEqual(['a', 'b', 'c', 'd']);
    expect(moveStop(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moveStop(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'c', 'b']);
    expect(moveStop(['a', 'b', 'c'], 0, -1)).toEqual(['a', 'b', 'c']);
    expect(moveStop(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'b', 'c']);
    expect(moveStop(['a'], 5, 1)).toEqual(['a']);
    expect(M.tourList.map((t) => stopsFromTour(t, M.destinations))).toEqual([
      ['celuk', 'ubud', 'tegallalang', 'kintamani', 'tirta empul'],
      ['nusa dua', 'uluwatu', 'jimbaran'],
      ['jatiluwih', 'bedugul', 'tanah lot'],
      ['lempuyang', 'tirta gangga', 'taman ujung'],
    ]);
    // Nama tak dikenal dilewati, tanpa beda huruf besar-kecil, ganda sekali, maks. 5
    expect(stopsFromTour({ ...M.tourList[0], stops: ['UBUD', 'Pantai rahasia', 'ubud', 'Celuk', 'Kintamani', 'Bedugul', 'Jimbaran', 'Uluwatu'] }, M.destinations)).toEqual([
      'ubud',
      'celuk',
      'kintamani',
      'bedugul',
      'jimbaran',
    ]);
    expect(plannerSettings(CONTENT.planner)).toEqual({ baseHours: 10, bufferHours: 2 });
    expect(plannerSettings({ base_hours: 'abc', buffer_hours: '' } as unknown as SiteContent['planner'])).toEqual({ baseHours: 10, bufferHours: 2 });
    expect(plannerSettings({ base_hours: '0', buffer_hours: '1,5' } as unknown as SiteContent['planner'])).toEqual({ baseHours: 10, bufferHours: 1.5 });
    expect(plannerSettings({ base_hours: '8,4', buffer_hours: '0' } as unknown as SiteContent['planner'])).toEqual({ baseHours: 8, bufferHours: 0 });
    expect(M.pickups).toEqual(['Seminyak', 'Kuta', 'Legian', 'Canggu', 'Jimbaran', 'Nusa Dua', 'Sanur', 'Ubud']);
    expect(pickupAreas('Ubud; Ubud, Kuta\nSanur ,  ')).toEqual(['Ubud', 'Kuta', 'Sanur']);
    expect(pickupAreas(Array.from({ length: 20 }, (_, i) => `A${i}`).join(','))).toHaveLength(12);
  });

  it('perkiraan Rancang tur: jam = jemput & antar + Σ tempat (kelipatan 0,5), harga = paket + jam tambahan per mobil', () => {
    const [sedan, mpv, minibus] = M.cars;
    expect(planEstimate(pick('Celuk', 'Ubud', 'Tegallalang'), sedan, M.settings)).toEqual({ hours: 6.5, baseHours: 10, extraHours: 0, price: 750_000 });
    expect(planEstimate(pick('Celuk', 'Ubud', 'Tegallalang', 'Kintamani', 'Tirta Empul'), sedan, M.settings)).toEqual({ hours: 10, baseHours: 10, extraHours: 0, price: 750_000 });
    expect(planEstimate(pick('Lempuyang', 'Tirta Gangga', 'Taman Ujung'), sedan, M.settings)).toEqual({ hours: 11, baseHours: 10, extraHours: 1, price: 825_000 });
    expect(planEstimate(pick('Lempuyang', 'Tirta Gangga', 'Taman Ujung'), mpv, M.settings).price).toBe(935_000);
    expect(planEstimate(pick('Lempuyang', 'Tirta Gangga', 'Taman Ujung'), minibus, M.settings).price).toBe(1_210_000);
    // 2 + 5,5 + 2,5 + 2,5 = 12,5 → 3 jam tambahan (dibulatkan ke atas)
    expect(planEstimate(pick('Lempuyang', 'Bedugul', 'Tanah Lot'), sedan, M.settings)).toEqual({ hours: 12.5, baseHours: 10, extraHours: 3, price: 975_000 });
    // Dibulatkan ke 0,5 jam: 2,2 + 1 = 3,2 → 3; 2,3 + 1 = 3,3 → 3,5
    expect(planEstimate([{ ...dest('Celuk') }], sedan, { baseHours: 10, bufferHours: 2.2 }).hours).toBe(3);
    expect(planEstimate([{ ...dest('Celuk') }], sedan, { baseHours: 10, bufferHours: 2.3 }).hours).toBe(3.5);
    // Tanpa tempat / tanpa mobil / mobil tanpa harga → 0, tanpa NaN
    expect(planEstimate([], sedan, M.settings)).toEqual({ hours: 0, baseHours: 10, extraHours: 0, price: 0 });
    expect(planEstimate(pick('Ubud'), null, M.settings).price).toBe(0);
    expect(planEstimate(pick('Ubud'), { ...sedan, price: 0 }, M.settings).price).toBe(0);
    expect(planEstimate(pick('Ubud'), { ...sedan, overtime: 0 }, { baseHours: 2, bufferHours: 2 })).toEqual({ hours: 4, baseHours: 2, extraHours: 2, price: 750_000 });
  });

  it('formulir Rancang tur: validasi dengan "hari ini" disuntikkan, pesan WhatsApp berurutan', () => {
    expect(validatePlanner(planner(), M.destinations, TODAY)).toEqual({});
    expect(validatePlanner(planner({ stops: [], date: '' }), M.destinations, TODAY)).toEqual({ stops: 'Pilih minimal 1 tempat tujuan.', date: 'Pilih tanggal tur.' });
    expect(validatePlanner(planner({ stops: ['tidak-ada'] }), M.destinations, TODAY).stops).toBe('Pilih minimal 1 tempat tujuan.');
    expect(validatePlanner(planner({ date: '2026-10-28' }), M.destinations, TODAY).date).toBe('Pilih tanggal hari ini atau sesudahnya.');
    expect(validatePlanner(planner({ date: TODAY }), M.destinations, TODAY)).toEqual({});
    expect(validatePlanner(planner({ date: '2027-02-30' }), M.destinations, TODAY).date).toBe('Tanggal tidak valid.');
    expect(validatePlanner(planner({ date: '14/11/2026' }), M.destinations, TODAY).date).toBe('Tanggal tidak valid.');
    expect(plannerMessage(planner(), M.destinations, M.cars, M.settings, 'Pesiar Bali')).toBe(
      [
        'Halo Pesiar Bali, saya ingin memesan tur pribadi.',
        '',
        'Tanggal: Sabtu, 14 November 2026',
        'Jemput di: Seminyak',
        'Rute: Celuk → Ubud → Tegallalang',
        'Perkiraan durasi: ± 6,5 jam',
        'Mobil: Sedan 4 penumpang (atau setara)',
        'Perkiraan harga per mobil: Rp750.000',
        '',
        'Mohon konfirmasi ketersediaan. Terima kasih.',
      ].join('\n'),
    );
    expect(plannerMessage(planner({ stops: ['lempuyang', 'tirta gangga', 'taman ujung'], pickup: '', car: 2, date: '2026-12-24' }), M.destinations, M.cars, M.settings, '').split('\n')).toEqual([
      'Halo admin, saya ingin memesan tur pribadi.',
      '',
      'Tanggal: Kamis, 24 Desember 2026',
      'Rute: Lempuyang → Tirta Gangga → Taman Ujung',
      'Perkiraan durasi: ± 11 jam',
      'Mobil: Minibus 12 penumpang (atau setara)',
      'Perkiraan harga per mobil: Rp1.210.000',
      '',
      'Mohon konfirmasi ketersediaan. Terima kasih.',
    ]);
    expect(formatLongDate('2026-10-29')).toBe('Kamis, 29 Oktober 2026');
    expect(formatLongDate('2024-02-29')).toBe('Kamis, 29 Februari 2024');
    expect(formatLongDate('2026-13-01')).toBe('');
    expect(formatLongDate('')).toBe('');
    expect(todayIso(new Date(2026, 9, 29, 23, 59))).toBe('2026-10-29');
    expect(todayIso(new Date(2027, 0, 5))).toBe('2027-01-05');
  });

  it('antar-jemput bandara: harga per area × mobil, nomor penerbangan, validasi, pesan WhatsApp', () => {
    expect(readZones(CONTENT.transfer)[0]).toEqual({ name: 'Kuta & Legian', time: '± 20 menit', prices: [200_000, 250_000, 350_000, 0] });
    expect(M.zones.map((z) => z.name)).toEqual(['Kuta & Legian', 'Seminyak & Canggu', 'Nusa Dua & Jimbaran', 'Ubud', 'Sanur']);
    expect(transferPrice(M.zones[3], 2)).toBe(550_000);
    expect(transferPrice(M.zones[0], 3)).toBe(0);
    expect(transferPrice(undefined, 0)).toBe(0);
    expect(normalizeFlight('ga404')).toBe('GA 404');
    expect(normalizeFlight('GA-404')).toBe('GA 404');
    expect(normalizeFlight(' qz 7510 ')).toBe('QZ 7510');
    expect(normalizeFlight('jt1a')).toBe('JT 1A');
    expect(normalizeFlight('404')).toBeNull();
    expect(normalizeFlight('12 345')).toBeNull();
    expect(normalizeFlight('GARUDA')).toBeNull();
    expect(validateTransfer(transfer(), M.cars, TODAY)).toEqual({});
    expect(validateTransfer(transfer({ date: '', time: '', hotel: ' ', flight: '' }), M.cars, TODAY)).toEqual({
      date: 'Pilih tanggal.',
      time: 'Isi jam, mis. 14:35.',
      hotel: 'Tulis nama hotel atau alamat.',
    });
    expect(validateTransfer(transfer({ date: '2026-10-28' }), M.cars, TODAY).date).toBe('Pilih tanggal hari ini atau sesudahnya.');
    expect(validateTransfer(transfer({ time: '24:00' }), M.cars, TODAY).time).toBe('Isi jam, mis. 14:35.');
    expect(validateTransfer(transfer({ time: '07.05' }), M.cars, TODAY)).toEqual({});
    expect(validateTransfer(transfer({ flight: 'xyz' }), M.cars, TODAY).flight).toBe('Contoh: GA 404.');
    expect(validateTransfer(transfer({ pax: '' }), M.cars, TODAY).pax).toBe('Isi jumlah penumpang.');
    expect(validateTransfer(transfer({ pax: '0' }), M.cars, TODAY).pax).toBe('Isi jumlah penumpang.');
    expect(validateTransfer(transfer({ pax: '7' }), M.cars, TODAY).pax).toBe('MPV muat 6 penumpang. Pilih Minibus (12 penumpang).');
    expect(validateTransfer(transfer({ pax: '5', car: 0 }), M.cars, TODAY).pax).toBe('Sedan muat 4 penumpang. Pilih MPV (6 penumpang).');
    expect(validateTransfer(transfer({ pax: '12', car: 2 }), M.cars, TODAY)).toEqual({});
    // Rombongan lebih besar dari mobil TERBESAR: tetap bisa disusun (lebih dari satu mobil, dikonfirmasi admin)
    expect(maxSeats(M.cars)).toBe(12);
    expect(needsMoreCars(13, M.cars)).toBe(true);
    expect(needsMoreCars(12, M.cars)).toBe(false);
    expect(needsMoreCars(40, [])).toBe(false);
    expect(validateTransfer(transfer({ pax: '14', car: 2 }), M.cars, TODAY)).toEqual({});
    expect(validateTransfer(transfer({ pax: '14', car: 0 }), M.cars, TODAY)).toEqual({});
    expect(transferMessage(transfer({ pax: '14', car: 2 }), M.zones, M.cars, 'Pesiar Bali').split('\n')).toContain('Penumpang: 14 orang (lebih dari satu mobil, mohon dikonfirmasi)');
    expect(transferMessage(transfer(), M.zones, M.cars, 'Pesiar Bali')).toBe(
      [
        'Halo Pesiar Bali, saya ingin memesan antar-jemput bandara.',
        '',
        'Layanan: Jemput di bandara',
        'Tanggal: Sabtu, 14 November 2026',
        'Jam mendarat: 14.35',
        'Nomor penerbangan: GA 404',
        'Tujuan: Seminyak & Canggu — Vila Kenanga, Jl. Contoh 3',
        'Penumpang: 3 orang',
        'Mobil: MPV 6 penumpang (atau setara)',
        'Perkiraan harga: Rp300.000',
        '',
        'Mohon konfirmasi. Terima kasih.',
      ].join('\n'),
    );
    expect(
      transferMessage(transfer({ direction: 'depart', time: '05:10', flight: '', zone: 0, hotel: '  Hotel\nMelati  ', pax: '2', car: 2 }), M.zones, M.cars, '').split('\n'),
    ).toEqual([
      'Halo admin, saya ingin memesan antar-jemput bandara.',
      '',
      'Layanan: Antar ke bandara',
      'Tanggal: Sabtu, 14 November 2026',
      'Jam terbang: 05.10',
      'Jemput di: Kuta & Legian — Hotel Melati',
      'Penumpang: 2 orang',
      'Mobil: Minibus 12 penumpang (atau setara)',
      'Perkiraan harga: Rp350.000',
      '',
      'Mohon konfirmasi. Terima kasih.',
    ]);
    expect(cleanText('a\u0000b\u0007  c', 10)).toBe('a b c');
    expect(cleanText('x'.repeat(500), 80)).toHaveLength(80);
    expect(messageMailHref('halo@example.com', 'Tur pribadi', 'Baris 1\nBaris 2')).toBe('mailto:halo@example.com?subject=Tur%20pribadi&body=Baris%201%0ABaris%202');
    expect(messageMailHref('bukan email', 'x', 'y')).toBe('');
  });

  it('teks kecil: nomor HP berkelompok, ikon otomatis keunggulan & keterangan bandara', () => {
    expect(displayPhone('081234567890')).toBe('0812-3456-7890');
    expect(displayPhone('(0361) 555-0182')).toBe('(0361) 555-0182');
    expect(displayPhone('')).toBe('');
    expect((CONTENT.hero.trust as { text: string }[]).map((t) => iconKey(t.text))).toEqual(['price', 'hotel', 'cool']);
    expect((CONTENT.transfer.notes as { text: string }[]).map((t) => iconKey(t.text))).toEqual(['sign', 'wait', 'bag', 'water']);
    expect(iconKey('Sopir berbahasa Inggris')).toBe('car');
    expect(iconKey('Bayar di tempat')).toBe('pay');
    expect(iconKey('Sesuatu')).toBe('pin');
  });

  it('film: jam perhentian, rencana progres (singgah + perjalanan menurut panjang ruas), keadaan per progres', () => {
    expect(parseClock('09.30')).toBe(570);
    expect(parseClock('9:30')).toBe(570);
    expect(parseClock('24.00')).toBeNull();
    expect(parseClock('08.75')).toBeNull();
    expect(parseClock('abc')).toBeNull();
    expect(formatClock(570)).toBe('09.30');
    expect(formatClock(574)).toBe('09.30');
    expect(formatClock(1080)).toBe('18.00');
    expect(formatClock(1440)).toBe('00.00');
    expect(readFilmStops(CONTENT.film)).toHaveLength(6);
    expect(filmMinutes(M.stops)).toEqual([480, 570, 660, 780, 930, 1080]);
    // Jam rusak / tidak naik → jam bawaan perhentian itu (selalu naik)
    expect(filmMinutes([{ ...M.stops[0], time: 'pagi' }, { ...M.stops[1], time: '07.00' }])).toEqual([480, 570, 660, 780, 930, 1080]);
    expect(filmMinutes([{ ...M.stops[0], time: '07.30' }, { ...M.stops[1], time: '08.00' }, { ...M.stops[2], time: '08.00' }])).toEqual([450, 480, 660, 780, 930, 1080]);
    // Rute: 5 ruas bersambung, berawal & berakhir di Seminyak; pin = ujung ruas
    expect(ROUTE_LEGS).toHaveLength(5);
    for (let i = 1; i < ROUTE_LEGS.length; i += 1) expect(ROUTE_LEGS[i].points[0], `ruas ${i}`).toEqual(ROUTE_LEGS[i - 1].points[ROUTE_LEGS[i - 1].points.length - 1]);
    expect(STOP_POINTS[0]).toEqual(STOP_POINTS[5]);
    for (const length of ROUTE_LENGTHS) expect(length).toBeGreaterThan(100);
    const plan = filmPlan(ROUTE_LENGTHS, filmMinutes(M.stops));
    expect(plan.arrive.map((p) => Number(p.toFixed(4)))).toEqual([0.08, 0.2095, 0.3676, 0.5228, 0.6651, 0.89]);
    expect(plan.leave.map((p, i) => Number((p - plan.arrive[i]).toFixed(3)))).toEqual([0.03, 0.045, 0.045, 0.045, 0.045]);
    expect(plan.arrive[5] + 0.03 + 0.08).toBeCloseTo(1, 10);
    // Panjang 0 semua → perjalanan dibagi rata
    const flat = filmPlan([0, 0, 0, 0, 0], [480, 570, 660, 780, 930, 1080]);
    expect(Number((flat.arrive[2] - flat.leave[1]).toFixed(4))).toBe(Number((flat.arrive[1] - flat.leave[0]).toFixed(4)));
    // Awal: seluruh rute, mobil di Seminyak; akhir: seluruh rute lagi, mobil kembali
    expect(filmFrame(0, plan)).toEqual({ leg: 0, t: 0, minutes: 480, k: 0, chapter: 0, dwell: false, moving: false });
    expect(filmFrame(1, plan)).toEqual({ leg: 4, t: 1, minutes: 1080, k: 0, chapter: 5, dwell: false, moving: false });
    expect(filmFrame(Number.NaN, plan)).toEqual(filmFrame(0, plan));
    expect(filmFrame(-2, plan)).toEqual(filmFrame(0, plan));
    expect(filmFrame(0.5, plan).k).toBe(1);
    // Singgah di Celuk: kartu tampil, mobil diam di ujung ruas 0, jam 09.30 → 10.15
    const celuk = filmFrame(plan.arrive[1] + 0.02, plan);
    expect(celuk).toMatchObject({ leg: 0, t: 1, chapter: 1, dwell: true, moving: false });
    expect(formatClock(celuk.minutes)).toMatch(/^(09\.[3-5]\d|10\.0\d)$/);
    // Jam berangkat = tiba berikutnya − lama perjalanan ruas (singgah ≥ 15 menit): makan siang di Kintamani sampai 14.45
    expect(plan.depart.map(formatClock)).toEqual(['08.15', '10.15', '12.15', '14.45', '16.30']);
    expect(filmDepartures([480, 485, 660])).toEqual([481, 615]);
    // Mobil baru berjalan SETELAH jam berangkatnya; selama perjalanan jam di antara berangkat & tiba berikutnya
    for (let i = 0; i < plan.leave.length; i += 1) {
      const before = filmFrame(plan.leave[i] - 0.001, plan);
      expect(before.moving, `singgah ${i}`).toBe(false);
      expect(before.minutes, `singgah ${i}`).toBeLessThanOrEqual(plan.depart[i]);
      const mid = filmFrame((plan.leave[i] + plan.arrive[i + 1]) / 2, plan);
      expect(mid.moving, `ruas ${i}`).toBe(true);
      expect(mid.minutes, `ruas ${i}`).toBeGreaterThan(plan.depart[i]);
      expect(mid.minutes, `ruas ${i}`).toBeLessThan(plan.minutes[i + 1]);
    }
    expect(formatClock(filmFrame(plan.leave[3] + 0.002, plan).minutes)).toBe('14.45');
    // Di tengah perjalanan ke Kintamani: berjalan, kartu tersembunyi, bab = Tegallalang
    const drive = filmFrame((plan.leave[2] + plan.arrive[3]) / 2, plan);
    expect(drive).toMatchObject({ leg: 2, chapter: 2, dwell: false, moving: true });
    expect(drive.t).toBeGreaterThan(0.3);
    expect(drive.t).toBeLessThan(0.7);
    // Bab berganti sedikit sebelum tiba; jam & bab tidak pernah mundur; kartu tidak tampil saat kamera mendekat/menjauh
    expect(filmFrame(plan.arrive[3] - 0.01, plan).chapter).toBe(3);
    let previous = filmFrame(0, plan);
    for (let i = 1; i <= 400; i += 1) {
      const f = filmFrame(i / 400, plan);
      expect(f.minutes, String(i)).toBeGreaterThanOrEqual(previous.minutes);
      expect(f.chapter, String(i)).toBeGreaterThanOrEqual(previous.chapter);
      if (i / 400 < 0.064 || i / 400 > 0.932) expect(f.dwell, String(i)).toBe(false);
      previous = f;
    }
  });

  it('film: progres gulir (fungsi murni), titik pada polyline, geometri & kamera', () => {
    // p = (atas area terlihat − atas jalur) / (tinggi jalur − tinggi area), dibatasi 0–1
    expect(filmProgress(64, 836, 64, 2842)).toBe(0);
    expect(filmProgress(64, 836, 64 - 1003, 2842)).toBeCloseTo(0.5, 6);
    expect(filmProgress(64, 836, 64 - 2006, 2842)).toBe(1);
    expect(filmProgress(64, 836, -9999, 2842)).toBe(1);
    expect(filmProgress(64, 836, 900, 2842)).toBe(0);
    expect(filmProgress(0, 900, -100, 800)).toBe(0);
    expect(filmProgress(0, 900, Number.NaN, 2842)).toBe(0);
    expect(pointOnPolyline([[0, 0], [10, 0], [10, 10]], 0.5)).toEqual([10, 0]);
    expect(pointOnPolyline([[0, 0], [10, 0], [10, 10]], 0.75)).toEqual([10, 5]);
    expect(pointOnPolyline([[0, 0], [10, 0]], -1)).toEqual([0, 0]);
    expect(pointOnPolyline([[0, 0], [10, 0]], 2)).toEqual([10, 0]);
    expect(pointOnPolyline([], 0.5)).toEqual([0, 0]);
    // Lebar (≥ 1024): kolom teks kiri, fokus 66%, ×1,8; HP & tablet: fokus tengah, ×1,3
    const wide = filmGeometry(1440, 836);
    expect(wide.zoom).toBe(1.8);
    expect(wide.fx).toBeCloseTo(1440 * 0.66, 6);
    expect(filmGeometry(FILM_WIDE, 700).zoom).toBe(1.8);
    expect(filmGeometry(FILM_WIDE - 1, 700).zoom).toBe(1.3);
    // HP: judul di atas jalur film, di panggung hanya pita jam → area peta mulai 190px; tablet (jam 64px) 230px
    const phone = filmGeometry(390, 788);
    expect(phone).toMatchObject({ width: 390, height: 788, fx: 195, fy: 190 + (788 - 190 - 210) / 2, zoom: 1.3, keepX: [8, 382] });
    expect(filmGeometry(320, 700)).toMatchObject({ fx: 160, fy: 190 + (700 - 190 - 210) / 2, zoom: 1.3 });
    // Area peta minimal 200px tinggi
    expect(filmGeometry(320, 500)).toMatchObject({ fy: 190 + 100 });
    expect(filmGeometry(800, 960)).toMatchObject({ fy: 230 + (960 - 230 - 210) / 2, zoom: 1.3 });
    expect(filmGeometry(0, 0).fit).toBeGreaterThan(0);
    // Kamera "melihat ke depan" ke perhentian berikutnya: nol saat berangkat & tiba, paling jauh di tengah ruas
    expect(lookAhead([100, 100], [300, 500], 0)).toEqual([100, 100]);
    expect(lookAhead([100, 100], [300, 500], 1)[0]).toBeCloseTo(100, 9);
    const mid = lookAhead([100, 100], [300, 500], 0.5);
    expect(mid[0]).toBeCloseTo(100 + 200 * 0.45, 9);
    expect(mid[1]).toBeCloseTo(100 + 400 * 0.45, 9);
    expect(lookAhead([100, 100], undefined, 0.5)).toEqual([100, 100]);
    // Jumlah ruas dari jumlah perhentian CMS (1–6): 6 → 5 ruas (kembali ke awal), 3 → 2, 1 → 0
    expect([0, 1, 2, 3, 6, 9].map(filmLegCount)).toEqual([0, 0, 1, 2, 5, 5]);
    // Kamera: k = 0 → pusat rute di titik fokus (skala muat), k = 1 → mobil di titik fokus (skala × zoom)
    const center: [number, number] = [ROUTE_FRAME.x + ROUTE_FRAME.w / 2, ROUTE_FRAME.y + ROUTE_FRAME.h / 2];
    const whole = cameraAt(wide, [1500, 900], 0);
    expect(whole.scale).toBeCloseTo(wide.fit, 9);
    expect(whole.x + center[0] * whole.scale).toBeCloseTo(wide.fx, 6);
    expect(whole.y + center[1] * whole.scale).toBeCloseTo(wide.fy, 6);
    const follow = cameraAt(wide, [1500, 900], 1);
    expect(follow.scale).toBeCloseTo(wide.fit * 1.8, 9);
    expect(follow.x + 1500 * follow.scale).toBeCloseTo(wide.fx, 6);
    expect(follow.y + 900 * follow.scale).toBeCloseTo(wide.fy, 6);
    expect(cameraAt(wide, [1500, 900], 5)).toEqual(follow);
    expect(wide.keepX).toBeNull();
    // HP: rute + nama perhentian (ROUTE_VIEW) tetap utuh di layar walau mobil di ujung rute (Seminyak, Kintamani)
    for (const point of [STOP_POINTS[0], STOP_POINTS[3], STOP_POINTS[4], [1300, 1100]] as [number, number][]) {
      const cam = cameraAt(phone, point, 1);
      expect(cam.x + ROUTE_VIEW.left * cam.scale, String(point)).toBeGreaterThanOrEqual(8 - 1e-6);
      expect(cam.x + ROUTE_VIEW.right * cam.scale, String(point)).toBeLessThanOrEqual(382 + 1e-6);
      // vertikal tetap mengikuti titik
      expect(cam.y + point[1] * cam.scale).toBeCloseTo(phone.fy, 6);
    }
  });
});

describe('Pesiar: demo', () => {
  it('urutan section, satu H1, hero vista: foto latar LCP (eager, srcset, ukuran, alt) tanpa reveal, Ken Burns di wadah', () => {
    const container = demo();
    expect(sectionKeys(container)).toEqual([...ORDER, 'footer']);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const hero = section(container, 'hero');
    expect(hero.getAttribute('data-hero-layout')).toBe('vista');
    expect(hero.getAttribute('data-tpl-tone')).toBe('inverse');
    expect(hero.querySelector('h1')!.textContent).toBe('Bali dengan sopir pribadi Anda.');
    expect(hero.textContent).toContain('Ubud · Kintamani · Uluwatu');
    const img = hero.querySelector<HTMLImageElement>('img[fetchpriority="high"]')!;
    expect(img.getAttribute('src')).toBe('/assets/templates/photos/pesiar-hero-1920.webp');
    expect(img.getAttribute('srcset')).toBe(
      '/assets/templates/photos/pesiar-hero-800.webp 800w, /assets/templates/photos/pesiar-hero-1280.webp 1280w, /assets/templates/photos/pesiar-hero-1920.webp 1920w',
    );
    // HP: foto 16:9 menutupi kotak tegak → tergambar ± 2,6× lebar layar (tanpa ini HP memuat varian 800 yang buram)
    expect(img.getAttribute('sizes')).toBe('(max-width: 767px) 260vw, 100vw');
    expect(img.getAttribute('loading')).toBe('eager');
    expect(Number(img.getAttribute('width'))).toBe(1920);
    expect(Number(img.getAttribute('height'))).toBe(1080);
    expect(img.getAttribute('alt')).toBe('Sawah terasering hijau di bawah gunung berkabut saat pagi di Bali');
    // Foto = LATAR seluruh hero, tidak pernah disembunyikan: tanpa Reveal, tanpa kelas gerak di <img>; Ken Burns di wadahnya
    expect(img.closest('.tpl-reveal')).toBeNull();
    expect(img.className).not.toMatch(/tpl-photo|ps-|opacity|clip/);
    const kenburns = img.closest('.ps-kenburns')!;
    expect(kenburns).not.toBeNull();
    expect(kenburns.className).toContain('absolute inset-0');
    expect(hero.querySelector('.ps-hero-scrim')).toHaveAttribute('aria-hidden', 'true');
    const eager = Array.from(container.querySelectorAll('img')).filter((i) => i.getAttribute('loading') !== 'lazy');
    expect(eager.map((i) => i.getAttribute('src'))).toEqual(['/assets/templates/photos/pesiar-hero-1920.webp']);
    // Hero sederhana: dua tombol, satu bilah 3 keunggulan, tanpa formulir/angka/lencana
    const links = within(hero).getAllByRole('link');
    expect(links.map((a) => `${a.textContent}${a.getAttribute('href')}`)).toEqual(['Rancang tur#planner', 'Antar-jemput bandara#transfer']);
    expect(within(hero).queryByRole('form')).toBeNull();
    expect(hero.querySelectorAll('input, select, button')).toHaveLength(0);
    const trust = within(hero).getByRole('list', { name: 'Keunggulan' });
    expect(Array.from(trust.querySelectorAll('li')).map((li) => li.textContent)).toEqual(['Harga per mobil', 'Jemput di hotel', 'Mobil ber-AC & air mineral']);
    expect(trust.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(3);
    // Tinggi hero (batch): desktop max(620px, min(90svh, 900px)); HP setinggi layar terlihat
    expect(hero.innerHTML).toContain('@3xl:min-h-[max(620px,min(90svh,900px))]');
    expect(hero.innerHTML).toContain('min-h-[max(600px,calc(100svh-var(--tpl-sticky-top,0px)))]');
    fireEvent.click(within(hero).getByRole('link', { name: 'Rancang tur' }));
    fireEvent.click(within(hero).getByRole('link', { name: 'Antar-jemput bandara' }));
    expect(scrolled).toEqual(['planner', 'transfer']);
  });

  it('header di atas foto: menu tengah ≤ 6 + "Pesan Tur"; menu HP buka/tutup, Esc menutup dan fokus kembali', () => {
    const container = demo();
    const header = container.querySelector('header')!;
    expect(header.className).toContain('sticky');
    expect(header.querySelector('svg[viewBox="0 0 32 32"]'), 'PesiarMark').not.toBeNull();
    // Paling atas: transparan di atas foto hero (teks putih, data-tpl-tone="inverse")
    expect(header.querySelector('[data-tpl-tone="inverse"]')!.className).toContain('bg-transparent');
    const nav = within(header).getByRole('navigation', { name: 'Menu utama' });
    // Di atas foto: semua tautan putih penuh (bukan putih 85%) — langit berkabut terang, kontras ≥ 4,5:1 bersama lapisan atas
    for (const a of nav.querySelectorAll('a')) {
      expect(a.className.split(/\s+/), a.textContent ?? '').toContain('text-white');
      expect(a.className, a.textContent ?? '').not.toMatch(/text-white\/\d/);
    }
    expect(Array.from(nav.querySelectorAll('a')).map((a) => `${a.textContent}${a.getAttribute('href')}`)).toEqual([
      'Tur#tours',
      'Rancang#planner',
      'Mobil#cars',
      'Bandara#transfer',
      'FAQ#faq',
      'Kontak#kontak',
    ]);
    fireEvent.click(within(nav).getByRole('link', { name: 'Bandara' }));
    expect(scrolled).toEqual(['transfer']);
    expect(within(header).getAllByRole('link', { name: 'Pesan Tur' })[0]).toHaveAttribute('href', '#planner');
    const toggle = within(header).getByRole('button', { name: 'Buka menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle.className).toMatch(/\bh-11\b/);
    expect(toggle.className).toMatch(/\bw-11\b/);
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAccessibleName('Tutup menu');
    // Menu terbuka → bilah pasir padat
    expect(header.querySelector('[data-tpl-tone="inverse"]')).toBeNull();
    expect(within(header).getAllByRole('navigation', { name: 'Menu utama' })).toHaveLength(2);
    const panel = document.getElementById(toggle.getAttribute('aria-controls')!)!;
    expect(panel).toHaveAttribute('aria-label', 'Menu utama');
    expect(within(panel).getAllByRole('link').map((a) => a.textContent)).toEqual(['Tur', 'Rancang', 'Mobil', 'Bandara', 'FAQ', 'Kontak', 'Pesan Tur']);
    fireEvent.click(within(panel).getByRole('link', { name: 'Mobil' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(scrolled).toEqual(['transfer', 'cars']);
    fireEvent.click(toggle);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
    expect(within(header).getAllByRole('navigation', { name: 'Menu utama' })).toHaveLength(1);
  });

  it('tur sehari: kartu foto tegak lengkap, rel geser di HP, pesan WhatsApp per tur, "Ubah rute" mengisi Rancang tur', () => {
    const container = demo();
    const tours = section(container, 'tours');
    const cards = Array.from(tours.querySelectorAll('article'));
    expect(cards.map((c) => c.querySelector('h3')!.textContent)).toEqual(['Ubud & Kintamani', 'Uluwatu & Jimbaran', 'Bedugul & Tanah Lot', 'Lempuyang & Bali timur']);
    const first = cards[0];
    expect(plain(first.textContent)).toContain('10 jam');
    expect(first.textContent).toContain('Celuk, Ubud, Tegallalang, Kintamani, Tirta Empul');
    expect(plain(first.textContent)).toContain('Mulai Rp750rb / mobil');
    expect(plain(cards[3].textContent)).toContain('Mulai Rp825rb / mobil');
    expect(first.querySelector('img')!.closest('.aspect-\\[4\\/5\\]')).not.toBeNull();
    expect(first.querySelector('.ps-card-fade')).toHaveAttribute('aria-hidden', 'true');
    const list = tours.querySelector('ul[aria-label="Daftar tur"]')!;
    expect(list.className).toContain('snap-x snap-mandatory');
    expect(list.className).toContain('overflow-x-auto');
    // 4 kolom mulai 1280px (di 1024px kartu 4 kolom terlalu sempit), 2 kolom di tablet, rel geser di HP
    expect(list.className).toContain('@7xl:grid-cols-4');
    expect(list.className).not.toContain('@5xl:grid-cols-4');
    expect(list.className).not.toContain('@min-[120rem]:grid-cols-5');
    expect(tours.textContent).toContain('Harga contoh per mobil (sedan), bukan per orang.');
    const book = within(first).getByRole('link', { name: 'Pesan tur ini: Ubud & Kintamani (WhatsApp)' });
    expect(decode(book)).toBe(`${WA}${tourMessage(M.tourList[0], 'Pesiar Bali')}`);
    expect(book).toHaveAttribute('target', '_blank');
    expect(book).toHaveAttribute('rel', 'noopener noreferrer');
    const edit = within(cards[1]).getByRole('button', { name: 'Ubah rute: Uluwatu & Jimbaran' });
    expect(edit).toHaveAttribute('type', 'button');
    const plannerEl = section(container, 'planner');
    expect(routeNames(plannerEl)).toEqual(['Celuk', 'Ubud', 'Tegallalang']);
    edit.focus();
    fireEvent.click(edit);
    expect(scrolled).toEqual(['planner']);
    expect(routeNames(plannerEl)).toEqual(['Nusa Dua', 'Uluwatu', 'Jimbaran']);
    // Fokus pindah ke judul daftar rute (Tab berikutnya = tombol rute, bukan kembali ke kartu tur)
    expect(within(plannerEl).getByRole('heading', { level: 3, name: 'Rute Anda' })).toHaveFocus();
    expect(plannerEl.querySelector('.sr-only[aria-live="polite"]')!.textContent).toBe('Perkiraan 8 jam, Rp750.000 per mobil');
    fireEvent.click(within(cards[3]).getByRole('button', { name: 'Ubah rute: Lempuyang & Bali timur' }));
    expect(routeNames(plannerEl)).toEqual(['Lempuyang', 'Tirta Gangga', 'Taman Ujung']);
    expect(plannerEl.querySelector('.sr-only[aria-live="polite"]')!.textContent).toBe('Perkiraan 11 jam, Rp825.000 per mobil');
  });

  it('Rancang tur: chip aria-pressed (maks. 5, sisanya aria-disabled + pesan), urutkan & hapus, mobil, perkiraan, galat & pesan', async () => {
    const container = demo();
    const plannerEl = section(container, 'planner');
    const form = within(plannerEl).getByRole('form', { name: 'Rancang tur' });
    expect(form.getAttribute('action')).toBeNull();
    expect(form).toHaveAttribute('novalidate');
    const group = within(plannerEl).getByRole('group', { name: /^Tempat tujuan/ });
    const chips = () => within(group).getAllByRole('button');
    const chip = (name: string) => chips().find((b) => b.textContent!.includes(name))!;
    expect(chips()).toHaveLength(14);
    expect(chips().map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'true', 'true', ...Array(11).fill('false')]);
    for (const b of chips()) {
      expect(b).toHaveAttribute('type', 'button');
      expect(b.className).toContain('min-h-[60px]');
    }
    expect(plain(chip('Tirta Empul').textContent)).toContain('± 1,5 jam');
    // HP < 384px: nomor urut di pojok (hanya chip terpilih), area disembunyikan → nama tempat utuh
    expect(chip('Celuk').querySelector('span[aria-hidden]')!.className).toContain('@max-sm:absolute');
    expect(chip('Jatiluwih').querySelector('span[aria-hidden]')!.className).toContain('@max-sm:hidden');
    expect(Array.from(chip('Jatiluwih').querySelectorAll('span')).find((s) => s.textContent === '· Tabanan')!.className.split(' ')).toEqual(
      expect.arrayContaining(['hidden', 'truncate', '@xl:inline']),
    );
    // Panel hasil: jam dulu (selalu utuh), lalu area
    expect(plain(plannerEl.querySelector('[data-tpl-tone="inverse"] ol > li .font-semibold + span')!.textContent)).toBe('± 1 jam · Gianyar');
    const live = plannerEl.querySelector('.sr-only[aria-live="polite"]')!;
    expect(live.textContent).toBe('Perkiraan 6,5 jam, Rp750.000 per mobil');
    expect(plannerEl.textContent).toContain('3/5 tempat');
    const status = within(plannerEl).getByRole('status');
    expect(status).not.toHaveAttribute('aria-live');
    // Tambah sampai 5 → sisanya aria-disabled, klik → pesan, daftar tetap
    fireEvent.click(chip('Kintamani'));
    fireEvent.click(chip('Tirta Empul'));
    expect(routeNames(plannerEl)).toEqual(['Celuk', 'Ubud', 'Tegallalang', 'Kintamani', 'Tirta Empul']);
    expect(live.textContent).toBe('Perkiraan 10 jam, Rp750.000 per mobil');
    expect(chip('Jatiluwih')).toHaveAttribute('aria-disabled', 'true');
    expect(chip('Celuk')).not.toHaveAttribute('aria-disabled');
    fireEvent.click(chip('Jatiluwih'));
    expect(status.textContent).toBe('Maksimal 5 tempat. Hapus satu tempat untuk menambah Jatiluwih.');
    expect(chip('Jatiluwih')).toHaveAttribute('aria-pressed', 'false');
    // Hapus & urutkan di panel hasil (tombol 44px); pesan "maksimal" hilang begitu ada tempat kosong
    fireEvent.click(within(plannerEl).getByRole('button', { name: 'Hapus Ubud dari rute' }));
    expect(routeNames(plannerEl)).toEqual(['Celuk', 'Tegallalang', 'Kintamani', 'Tirta Empul']);
    expect(status.textContent).toBe('');
    expect(chip('Jatiluwih')).not.toHaveAttribute('aria-disabled');
    fireEvent.click(within(plannerEl).getByRole('button', { name: 'Pindahkan Kintamani ke atas' }));
    expect(routeNames(plannerEl)).toEqual(['Celuk', 'Kintamani', 'Tegallalang', 'Tirta Empul']);
    fireEvent.click(within(plannerEl).getByRole('button', { name: 'Pindahkan Celuk ke bawah' }));
    expect(routeNames(plannerEl)).toEqual(['Kintamani', 'Celuk', 'Tegallalang', 'Tirta Empul']);
    expect(within(plannerEl).getByRole('button', { name: 'Pindahkan Kintamani ke atas' })).toBeDisabled();
    expect(within(plannerEl).getByRole('button', { name: 'Pindahkan Tirta Empul ke bawah' })).toBeDisabled();
    for (const b of within(plannerEl).getAllByRole('button', { name: /^(Pindahkan|Hapus) / })) expect(b.className).toMatch(/\bh-11 w-11\b/);
    expect(live.textContent).toBe('Perkiraan 8 jam, Rp750.000 per mobil');
    // Mobil: radio dalam lintasan pil; harga paket per mobil
    const radios = within(plannerEl).getAllByRole('radio');
    // Nama kelas boleh dua baris (tidak pernah keluar dari pilnya); "· 4" di pil hanya ≥ @xl, pembaca layar tetap mendengar kursi
    expect(radios.map((r) => r.closest('label')!.querySelector('span')!.textContent)).toEqual(['Sedan', 'MPV', 'Minibus']);
    expect(within(plannerEl).getByRole('radio', { name: 'Sedan, 4 penumpang' })).toBe(radios[0]);
    expect(within(plannerEl).getByRole('radio', { name: 'Minibus, 12 penumpang' })).toBe(radios[2]);
    for (const r of radios) {
      const label = r.closest('label')!;
      expect(label.className).not.toContain('whitespace-nowrap');
      expect(label.className.split(' ')).toEqual(expect.arrayContaining(['text-balance', 'leading-tight', 'min-w-0']));
      expect(label.querySelector('span[aria-hidden]')!.className.split(' ')).toEqual(expect.arrayContaining(['hidden', '@xl:inline']));
    }
    expect(radios[0].closest('label')!.parentElement!.className).toContain('grid-cols-3');
    expect((radios[0] as HTMLInputElement).checked).toBe(true);
    fireEvent.click(radios[1]);
    expect(live.textContent).toBe('Perkiraan 8 jam, Rp850.000 per mobil');
    expect(plannerEl.textContent).toContain('Perkiraan harga per mobil · MPV');
    expect(plain(plannerEl.textContent)).toContain('Paket 10 jam Rp850.000 · lebih dari itu +Rp85.000/jam');
    expect(plannerEl.textContent).toContain('6 penumpang · 3 koper · atau setara');
    // Area jemput & tanggal (min = hari ini)
    const pickup = within(plannerEl).getByLabelText('Jemput di') as HTMLSelectElement;
    expect(Array.from(pickup.options).map((o) => o.value)).toEqual(M.pickups);
    fireEvent.change(pickup, { target: { value: 'Ubud' } });
    const date = within(plannerEl).getByLabelText('Tanggal tur') as HTMLInputElement;
    expect(date.type).toBe('date');
    expect(date.min).toBe(todayIso());
    // Kirim tanpa tanggal → galat + fokus
    const submit = within(plannerEl).getByRole('button', { name: 'Kirim ke WhatsApp' });
    expect(submit).toHaveAttribute('type', 'submit');
    act(() => {
      fireEvent.submit(form);
    });
    expect(date).toHaveAttribute('aria-invalid', 'true');
    expect(date).toHaveAttribute('aria-describedby', `${date.id}-error`);
    expect(document.getElementById(`${date.id}-error`)!.textContent).toBe('Pilih tanggal tur.');
    expect(date).toHaveFocus();
    fireEvent.change(date, { target: { value: '2020-01-01' } });
    act(() => {
      fireEvent.submit(form);
    });
    expect(plannerEl.textContent).toContain('Pilih tanggal hari ini atau sesudahnya.');
    fireEvent.change(date, { target: { value: '2030-11-16' } });
    expect(date).not.toHaveAttribute('aria-invalid');
    act(() => {
      fireEvent.submit(form);
    });
    const heading = within(plannerEl).getByRole('heading', { level: 3, name: 'Pesan siap dikirim' });
    const message = plannerEl.querySelector('pre')!.textContent!;
    expect(message).toBe(
      plannerMessage({ stops: ['kintamani', 'celuk', 'tegallalang', 'tirta empul'], pickup: 'Ubud', date: '2030-11-16', car: 1 }, M.destinations, M.cars, M.settings, 'Pesiar Bali'),
    );
    expect(message.split('\n')).toEqual([
      'Halo Pesiar Bali, saya ingin memesan tur pribadi.',
      '',
      'Tanggal: Sabtu, 16 November 2030',
      'Jemput di: Ubud',
      'Rute: Kintamani → Celuk → Tegallalang → Tirta Empul',
      'Perkiraan durasi: ± 8 jam',
      'Mobil: MPV 6 penumpang (atau setara)',
      'Perkiraan harga per mobil: Rp850.000',
      '',
      'Mohon konfirmasi ketersediaan. Terima kasih.',
    ]);
    expect(decode(within(plannerEl).getByRole('link', { name: 'Buka WhatsApp' }))).toBe(`${WA}${message}`);
    expect(plannerEl.textContent).toContain('Formulir hanya menyusun pesan WhatsApp');
    await wait(10);
    expect(heading).toHaveFocus();
    fireEvent.click(within(plannerEl).getByRole('button', { name: 'Ubah rute' }));
    expect(routeNames(plannerEl)).toEqual(['Kintamani', 'Celuk', 'Tegallalang', 'Tirta Empul']);
    expect((within(plannerEl).getByLabelText('Tanggal tur') as HTMLInputElement).value).toBe('2030-11-16');
    // Semua tempat dihapus → kotak kosong, kirim → galat tempat + fokus ke chip pertama
    for (const name of ['Kintamani', 'Celuk', 'Tegallalang', 'Tirta Empul']) fireEvent.click(chip(name));
    expect(plannerEl.textContent).toContain('Pilih tempat di daftar untuk mulai menyusun rute.');
    expect(plannerEl.textContent).toContain('0/5 tempat');
    act(() => {
      fireEvent.submit(within(plannerEl).getByRole('form', { name: 'Rancang tur' }));
    });
    expect(plannerEl.textContent).toContain('Pilih minimal 1 tempat tujuan.');
    expect(chips()[0]).toHaveFocus();
    expect(group).toHaveAttribute('aria-describedby');
  });

  it('antar-jemput bandara: tabel harga (gulir di wadahnya), formulir: arah, galat + fokus, perkiraan harga, pesan WhatsApp', async () => {
    const container = demo();
    const transferEl = section(container, 'transfer');
    const region = within(transferEl).getByRole('region', { name: 'Tabel harga antar-jemput bandara' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region.className).toContain('overflow-x-auto');
    const table = region.querySelector('table')!;
    expect(table.querySelector('caption')!.textContent).toBe('Harga contoh antar-jemput bandara per mobil, sekali jalan');
    expect(Array.from(table.querySelectorAll('thead th')).map((th) => th.textContent)).toEqual(['Area · waktu tempuh', 'Sedan4 penumpang', 'MPV6 penumpang', 'Minibus12 penumpang']);
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    expect(rows.map((r) => r.querySelector('th')!.textContent)).toEqual(['Kuta & Legian± 20 menit', 'Seminyak & Canggu± 40 menit', 'Nusa Dua & Jimbaran± 30 menit', 'Ubud± 90 menit', 'Sanur± 30 menit']);
    expect(Array.from(rows[0].querySelectorAll('td')).map((td) => plain(td.textContent))).toEqual(['Rp200rb', 'Rp250rb', 'Rp350rb']);
    expect(transferEl.textContent).toContain('Harga contoh per mobil, sekali jalan; dikonfirmasi admin lewat WhatsApp.');
    const notes = within(transferEl).getByRole('list', { name: 'Keterangan layanan' });
    expect(Array.from(notes.querySelectorAll('li')).map((li) => li.textContent)).toEqual(['Papan nama di pintu kedatangan', 'Tunggu hingga 60 menit', 'Bantu angkat koper', 'Air mineral di mobil']);
    const photo = transferEl.querySelector('img')!;
    expect(photo.getAttribute('alt')!.split(' ').length).toBeGreaterThanOrEqual(5);
    const form = within(transferEl).getByRole('form', { name: 'Pesan antar-jemput' });
    expect(form.getAttribute('action')).toBeNull();
    expect(form).toHaveAttribute('novalidate');
    const direction = within(form).getAllByRole('radio');
    expect(direction.map((r) => r.closest('label')!.textContent)).toEqual(['Jemput di bandara', 'Antar ke bandara']);
    expect((direction[0] as HTMLInputElement).checked).toBe(true);
    expect(within(form).getByLabelText('Jam mendarat')).toHaveAttribute('type', 'time');
    expect(within(form).getByLabelText('Hotel / alamat tujuan')).toBeInTheDocument();
    const price = () => plain(Array.from(form.querySelectorAll('p')).find((p) => p.textContent!.startsWith('Perkiraan harga per mobil'))?.textContent);
    expect(price()).toBe('Perkiraan harga per mobilRp250.000');
    const area = within(form).getByLabelText('Area') as HTMLSelectElement;
    const car = within(form).getByLabelText('Mobil') as HTMLSelectElement;
    expect(Array.from(area.options).map((o) => o.textContent)).toEqual(M.zones.map((z) => z.name));
    expect(Array.from(car.options).map((o) => o.textContent)).toEqual(['Sedan · 4 penumpang', 'MPV · 6 penumpang', 'Minibus · 12 penumpang']);
    expect(car.value).toBe('1');
    fireEvent.change(area, { target: { value: '3' } });
    expect(price()).toBe('Perkiraan harga per mobilRp400.000');
    fireEvent.change(car, { target: { value: '2' } });
    expect(price()).toBe('Perkiraan harga per mobilRp550.000');
    // Kirim kosong → galat + fokus ke isian pertama yang salah
    act(() => {
      fireEvent.submit(form);
    });
    const date = within(form).getByLabelText('Tanggal') as HTMLInputElement;
    expect(date).toHaveAttribute('aria-invalid', 'true');
    expect(date).toHaveAttribute('aria-describedby', `${date.id}-error`);
    expect(document.getElementById(`${date.id}-error`)!.textContent).toBe('Pilih tanggal.');
    expect(date).toHaveFocus();
    expect(form.textContent).toContain('Isi jam, mis. 14:35.');
    expect(form.textContent).toContain('Tulis nama hotel atau alamat.');
    expect(date.min).toBe(todayIso());
    // Arah "Antar ke bandara" → label berganti
    fireEvent.click(direction[1]);
    expect(within(form).getByLabelText('Jam terbang')).toBeInTheDocument();
    expect(within(form).getByLabelText('Hotel / alamat jemput')).toBeInTheDocument();
    fireEvent.click(direction[0]);
    fireEvent.change(date, { target: { value: '2030-11-16' } });
    expect(date).not.toHaveAttribute('aria-invalid');
    fireEvent.change(within(form).getByLabelText('Jam mendarat'), { target: { value: '14:35' } });
    fireEvent.change(within(form).getByLabelText(/^Nomor penerbangan/), { target: { value: 'xyz' } });
    fireEvent.change(within(form).getByLabelText('Hotel / alamat tujuan'), { target: { value: 'Vila Kenanga' } });
    const pax = within(form).getByLabelText('Penumpang') as HTMLInputElement;
    // Rombongan lebih besar dari mobil terbesar (Minibus 12): BUKAN galat — catatan "lebih dari satu mobil"
    fireEvent.change(pax, { target: { value: '13' } });
    expect(form.textContent).toContain('Lebih dari 12 penumpang: perlu lebih dari satu mobil, dikonfirmasi admin.');
    expect(pax.getAttribute('aria-describedby')).toMatch(/pax-hint$/);
    act(() => {
      fireEvent.submit(form);
    });
    expect(form.textContent).toContain('Contoh: GA 404.');
    expect(form.textContent).not.toContain('muat 12 penumpang');
    expect(within(form).getByLabelText(/^Nomor penerbangan/)).toHaveFocus();
    // Mobil terpilih terlalu kecil → galat menyebut mobil terkecil yang cukup; ganti mobil menghapus galat lama
    fireEvent.change(within(form).getByLabelText(/^Nomor penerbangan/), { target: { value: 'ga404' } });
    fireEvent.change(pax, { target: { value: '7' } });
    fireEvent.change(car, { target: { value: '1' } });
    act(() => {
      fireEvent.submit(form);
    });
    expect(form.textContent).toContain('MPV muat 6 penumpang. Pilih Minibus (12 penumpang).');
    expect(pax).toHaveFocus();
    fireEvent.change(car, { target: { value: '2' } });
    expect(form.textContent).not.toContain('MPV muat 6 penumpang');
    expect(pax).not.toHaveAttribute('aria-invalid');
    fireEvent.change(pax, { target: { value: '345' } });
    expect(pax.value).toBe('34');
    fireEvent.change(pax, { target: { value: '5' } });
    act(() => {
      fireEvent.submit(form);
    });
    const message = transferEl.querySelector('pre')!.textContent!;
    expect(message.split('\n')).toEqual([
      'Halo Pesiar Bali, saya ingin memesan antar-jemput bandara.',
      '',
      'Layanan: Jemput di bandara',
      'Tanggal: Sabtu, 16 November 2030',
      'Jam mendarat: 14.35',
      'Nomor penerbangan: GA 404',
      'Tujuan: Ubud — Vila Kenanga',
      'Penumpang: 5 orang',
      'Mobil: Minibus 12 penumpang (atau setara)',
      'Perkiraan harga: Rp550.000',
      '',
      'Mohon konfirmasi. Terima kasih.',
    ]);
    expect(decode(within(transferEl).getByRole('link', { name: 'Buka WhatsApp' }))).toBe(`${WA}${message}`);
    expect(transferEl.textContent).toContain('tidak ada pelacakan penerbangan otomatis');
    await wait(10);
    expect(within(transferEl).getByRole('heading', { level: 3, name: 'Pesan siap dikirim' })).toHaveFocus();
    fireEvent.click(within(transferEl).getByRole('button', { name: 'Ubah data' }));
    const again = within(transferEl).getByRole('form', { name: 'Pesan antar-jemput' });
    expect((within(again).getByLabelText('Hotel / alamat tujuan') as HTMLInputElement).value).toBe('Vila Kenanga');
    expect((within(again).getByLabelText('Area') as HTMLSelectElement).value).toBe('3');
  });

  it('mobil & sopir: gambar garis per kelas (tanpa merek), kapasitas, harga paket + jam tambahan; sopir monogram tanpa foto', () => {
    const container = demo();
    const cars = section(container, 'cars');
    const items = Array.from(cars.querySelectorAll('ul')[0].children);
    expect(items).toHaveLength(3);
    expect(items.map((li) => li.querySelector('h3')!.textContent)).toEqual(['Sedanatau setara', 'MPVatau setara', 'Minibusatau setara']);
    for (const li of items) {
      const svg = li.querySelector('svg.ps-draw')!;
      expect(svg).toHaveAttribute('aria-hidden', 'true');
      expect(svg.getAttribute('viewBox')).toBe('0 0 360 150');
      expect(svg.querySelectorAll('[pathLength="1"]').length).toBeGreaterThanOrEqual(10);
      expect(svg.querySelectorAll('*').length).toBeLessThanOrEqual(40);
      expect(svg.querySelector('.ps-car-panel')).not.toBeNull();
      expect(svg.querySelector('text')).toBeNull();
    }
    // Siluet berbeda per kelas
    const bodies = items.map((li) => li.querySelector('svg.ps-draw g path:nth-child(2)')!.getAttribute('d'));
    expect(new Set(bodies).size).toBe(3);
    expect(plain(items[0].textContent)).toContain('4 penumpang');
    expect(items[0].textContent).toContain('2 koper');
    expect(plain(items[0].textContent)).toContain('Rp750rb / 10 jam');
    expect(plain(items[0].textContent)).toContain('Jam tambahan Rp75rb / jam');
    expect(plain(items[2].textContent)).toContain('Rp1,1 jt / 10 jam');
    expect(cars.querySelectorAll('img')).toHaveLength(0);
    const drivers = within(cars).getByRole('heading', { level: 3, name: 'Sopir kami' }).nextElementSibling!;
    expect(Array.from(drivers.querySelectorAll('li > span[aria-hidden]')).map((s) => s.textContent)).toEqual(['WS', 'MA', 'KA', 'KW']);
    expect(drivers.textContent).toContain('Made Arimbawa');
    expect(drivers.textContent).toContain('Indonesia, Inggris, Jepang');
  });

  it('sudah & belum termasuk, cerita tamu (tab ARIA + panah/Home/End + sebelumnya/berikutnya), akordeon tanya jawab', () => {
    const container = demo();
    const included = section(container, 'included');
    expect(Array.from(included.querySelectorAll('h3')).map((h) => h.textContent)).toEqual(['Sudah termasuk', 'Belum termasuk']);
    expect(Array.from(included.querySelectorAll('ul')).map((ul) => ul.querySelectorAll('li').length)).toEqual([5, 4]);
    expect(included.textContent).toContain('Tiket masuk tempat wisata');
    const stories = section(container, 'testimonials');
    expect(stories.querySelector('img')).toBeNull();
    const tablist = within(stories).getByRole('tablist', { name: 'Pilih cerita tamu' });
    expect(tablist).toHaveAttribute('aria-orientation', 'vertical');
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['RinaKeluarga dari Surabaya', 'DanielPasangan dari Jakarta', 'SariRombongan teman, Bandung', 'HendraKeluarga dari Malang']);
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false', 'false']);
    expect(tabs.map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1', '-1']);
    const panel = within(stories).getByRole('tabpanel');
    expect(panel).toHaveAttribute('aria-labelledby', tabs[0].id);
    for (const tab of tabs) expect(tab).toHaveAttribute('aria-controls', panel.id);
    expect(panel.querySelector('blockquote')!.textContent).toContain('Sopirnya sabar menunggu di Tegallalang');
    expect(panel.querySelector('figcaption')!.textContent).toBe('RRinaKeluarga dari Surabaya');
    tabs[0].focus();
    fireEvent.keyDown(tabs[0], { key: 'ArrowDown' });
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveFocus();
    expect(panel).toHaveAttribute('aria-labelledby', tabs[1].id);
    expect(panel.querySelector('blockquote')!.textContent).toContain('Pesawat kami terlambat');
    fireEvent.keyDown(tabs[1], { key: 'End' });
    expect(tabs[3]).toHaveFocus();
    fireEvent.keyDown(tabs[3], { key: 'ArrowRight' });
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs[0], { key: 'ArrowUp' });
    expect(tabs[3]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs[3], { key: 'Home' });
    expect(tabs[0]).toHaveFocus();
    fireEvent.click(within(stories).getByRole('button', { name: 'Cerita berikutnya' }));
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(within(stories).getByRole('button', { name: 'Cerita sebelumnya' }));
    fireEvent.click(within(stories).getByRole('button', { name: 'Cerita sebelumnya' }));
    expect(tabs[3]).toHaveAttribute('aria-selected', 'true');
    expect(stories.textContent).toContain('4 / 4');
    // Tanpa putar otomatis
    expect(code()).not.toMatch(/setInterval/);
    const faq = section(container, 'faq');
    const buttons = within(faq).getAllByRole('button');
    expect(buttons).toHaveLength(5);
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
    expect(decode(within(faq).getByRole('link', { name: /Sapa kami di WhatsApp/ }))).toBe(`${WA}Halo Pesiar Bali, saya ingin bertanya tentang tur pribadi.`);
    expect(faq.textContent).toContain('Website ini tidak memproses pembayaran.');
  });

  it('kontak: baris bertautan (≥ 44px), peta; footer hijau tua dengan strip panorama, menu, kontak, media sosial', () => {
    const container = demo();
    const contact = section(container, 'contact');
    expect(Array.from(contact.querySelectorAll('dt')).map((dt) => dt.textContent)).toEqual(['Alamat', 'Telepon', 'WhatsApp', 'Email', 'Jam buka']);
    expect(within(contact).getAllByRole('link', { name: '0812-3456-7890' }).map((a) => a.getAttribute('href'))).toEqual([
      'tel:+6281234567890',
      expect.stringMatching(/^https:\/\/wa\.me\/6281234567890\?text=/),
    ]);
    for (const link of within(contact).getAllByRole('link', { name: /0812-3456-7890|halo@example\.com/ })) {
      expect(link.className).toContain('py-3.5');
      expect(link.className).toContain('-my-3.5');
    }
    expect(within(contact).getByRole('link', { name: 'halo@example.com' })).toHaveAttribute('href', 'mailto:halo@example.com');
    expect(contact.querySelector('iframe')!.getAttribute('title')).toBe('Peta lokasi Pesiar Bali');
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
    expect(footer.className).toContain('bg-[#17332B]');
    expect(footer.textContent).toContain(`© ${new Date().getFullYear()} Pesiar Bali`);
    expect(footer.textContent).toContain('Private tour & sewa mobil dengan sopir');
    // Strip panorama SELEBAR LAYAR di atas (di luar WRAP), lambat dimuat, satu-satunya foto parallax
    const pano = footer.querySelector('img')!;
    expect(pano.getAttribute('src')).toMatch(/pesiar-panorama-1920\.webp$/);
    expect(pano.getAttribute('loading')).toBe('lazy');
    expect(pano.getAttribute('sizes')).toBe('(max-width: 767px) 200vw, 100vw'); // kotak 2:1 di HP memotong foto 21:6 → ±2× lebar layar
    expect(wrapsIn(footer).some((w) => w.contains(pano))).toBe(false);
    expect(footer.firstElementChild!.contains(pano)).toBe(true);
    expect(Array.from(within(footer).getByRole('navigation', { name: 'Tautan footer' }).querySelectorAll('a')).map((a) => a.getAttribute('href'))).toEqual([
      '#tours',
      '#planner',
      '#cars',
      '#transfer',
      '#faq',
      '#kontak',
    ]);
    for (const link of footer.querySelectorAll('a')) expect(link.className, link.textContent ?? '').toContain('min-h-11');
    expect(within(footer).getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://instagram.com/pesiarbali.contoh');
    expect(within(footer).getByRole('link', { name: 'YouTube' })).toHaveAttribute('href', 'https://youtube.com/@pesiarbali.contoh');
    expect(within(footer).getByRole('link', { name: 'TikTok' })).toHaveAttribute('href', 'https://tiktok.com/@pesiarbali.contoh');
    expect(within(footer).queryByRole('link', { name: 'Facebook' })).toBeNull();
    expect(within(footer).queryByRole('link', { name: 'LinkedIn' })).toBeNull();
    expect(footer.textContent).toContain('Harga dan rute di situs ini contoh; konfirmasi lewat WhatsApp.');
    // Kelima media sosial lewat safeUrl
    cleanup();
    const all = demo({ footer: { facebook: 'https://facebook.com/pesiar', linkedin: 'https://linkedin.com/company/pesiar' } });
    const foot = all.querySelector('footer')!;
    expect(['Instagram', 'Facebook', 'LinkedIn', 'YouTube', 'TikTok'].every((name) => within(foot).queryByRole('link', { name }))).toBe(true);
  });

  it('wadah SELEBAR PENUH: header, setiap section, dan footer memakai WRAP tanpa max-w/mx-auto; tanpa CONTAINER 1680px', () => {
    expect(WRAP).toBe('w-full px-5 @2xl:px-8 @5xl:px-12 @min-[96rem]:px-16');
    expect(source()).not.toMatch(/max-w-\[1680px\]|\bCONTAINER\b/);
    const container = demo();
    expect(wrapsIn(container.querySelector('header')!).length).toBeGreaterThan(0);
    for (const key of [...ORDER, 'footer']) {
      const wraps = wrapsIn(section(container, key));
      expect(wraps.length, key).toBeGreaterThan(0);
      for (const w of wraps) expect(w.className, key).not.toMatch(/(^|\s)(max-w-|mx-auto)/);
    }
    expect(container.querySelector('[class*="max-w-[1680px]"]')).toBeNull();
    // Section (pita warna) tidak dibatasi lebar; batas hanya pada teks (mis. max-w-[46ch])
    for (const key of [...ORDER, 'footer']) expect(section(container, key).className, key).not.toMatch(/max-w-|mx-auto/);
    // Akar template: hanya overflow-x-clip (sticky film tetap bekerja)
    const root = container.querySelector('.overflow-x-clip')!;
    expect(root.className).toContain('relative overflow-x-clip');
    expect(root.className).not.toMatch(/overflow-hidden|overflow-auto/);
  });

  it('datar: tanpa kelas shadow (kecuali tombol melayang Shell), kode tanpa kiriman data, impor hanya shared/kit/types', () => {
    const container = demo();
    const shadows = Array.from(container.querySelectorAll('[class*="shadow"]')).filter(
      (el) => !el.closest('[aria-label="Chat WhatsApp"]') && !/Chat WhatsApp|Kembali ke atas/.test(el.getAttribute('aria-label') ?? ''),
    );
    expect(shadows.map((el) => el.className)).toEqual([]);
    const src = source();
    expect(src).not.toMatch(/\bshadow-|box-shadow|text-shadow|drop-shadow/);
    const c = code();
    expect(c).not.toMatch(/framer-motion|gsap|lottie|useLocation|useParams|localStorage|sessionStorage|fetch\(|XMLHttpRequest|sendBeacon|<canvas|<video|background-attachment/);
    expect(c).not.toMatch(/<form[^>]*\saction=/);
    // Satu-satunya foto parallax di halaman: strip panorama footer
    expect(c.match(/\bparallax=\{/g) ?? []).toHaveLength(1);
    // Tidak mengimpor dari folder template lain
    for (const [, from] of c.matchAll(/from '(\.\.\/[^']+)'/g)) expect(from, from).toMatch(/^\.\.\/(shared|kit|types)(\/|$)/);
    // Isi folder template tercakup tes ini (file baru ikut diperiksa)
    const files = readdirSync(resolve(ROOT, 'src/templates/pesiar')).sort();
    expect(files).toEqual([...TSX.map((f) => `${f}.tsx`), ...TS.map((f) => `${f}.ts`), 'pesiar.css'].sort());
    // Wilayah "live" sendiri tidak memakai role=status DAN aria-live sekaligus (penanda pratinjau Shell, shell.test.tsx)
    expect(Array.from(container.querySelectorAll('[role="status"][aria-live]')).filter((el) => el.closest('[data-tpl-section]'))).toEqual([]);
  });
});

describe('Pesiar: film (gerak mati = poster diam)', () => {
  it('demo di jsdom & pratinjau CMS: tanpa jalur tinggi/sticky, peta utuh aria-hidden, 6 perhentian terlihat, "Lewati animasi"', () => {
    for (const preview of [false, true]) {
      const { container } = preview
        ? render(<def.Component content={resolveContent(def, null)} preview />)
        : render(<SiteRenderer templateCode="pesiar" content={null} />);
      const film = section(container, 'film');
      expect(film.getAttribute('data-tpl-tone')).toBe('inverse');
      expect(film.querySelector('.ps-track'), String(preview)).toBeNull();
      expect(film.querySelector('[data-film-progress]')).toBeNull();
      const sticky = Array.from(film.querySelectorAll('[class]')).filter((el) => el.getAttribute('class')!.split(/\s+/).some((c) => /(^|:)sticky$/.test(c)));
      expect(sticky).toEqual([]);
      expect(film.querySelector('h2')!.textContent).toBe('Sehari bersama sopir Anda');
      expect(film.textContent).toContain('Contoh tur Ubud & Kintamani, dari jemput di hotel sampai kembali sore hari.');
      const list = within(film).getByRole('list', { name: 'Perhentian tur contoh' });
      expect(list.tagName).toBe('OL');
      expect(list.closest('[aria-hidden="true"]')).toBeNull();
      const items = Array.from(list.querySelectorAll('li'));
      expect(items.map((li) => li.querySelector('p')!.textContent)).toEqual(['08.00', '09.30', '11.00', '13.00', '15.30', '18.00']);
      expect(items[1].textContent).toBe('09.30CelukDesa perajin perak. Lihat perhiasan dibuat dengan tangan.');
      for (const li of items) {
        expect(li.className).not.toMatch(/\b(hidden|sr-only|invisible|opacity-0)\b/);
        expect(li).not.toHaveAttribute('aria-current');
        const img = li.querySelector('img')!;
        expect(img.getAttribute('loading')).toBe('lazy');
        expect(img.getAttribute('alt')!.split(' ').length).toBeGreaterThanOrEqual(5);
      }
      // Peta poster: SVG aria-hidden, seluruh rute tergambar, 5 pin + nama
      const map = film.querySelector('svg.ps-poster')!;
      expect(map).toHaveAttribute('aria-hidden', 'true');
      const legs = Array.from(map.querySelectorAll('path.ps-leg'));
      expect(legs).toHaveLength(5);
      for (const leg of legs) {
        expect(leg.getAttribute('stroke-dashoffset')).toBe('0');
        expect(leg.getAttribute('visibility')).toBeNull();
      }
      expect(Array.from(map.querySelectorAll('.ps-pin text')).map((t) => t.textContent)).toEqual(['Seminyak', 'Celuk', 'Tegallalang', 'Kintamani', 'Tirta Empul']);
      expect(map.querySelectorAll('.ps-pin[data-state="visited"]')).toHaveLength(5);
      // Lewati animasi: tersembunyi sampai difokus, menuju section berikutnya
      const skip = within(film).getByRole('link', { name: 'Lewati animasi' });
      expect(skip).toHaveAttribute('href', '#included');
      expect(skip.className).toContain('sr-only');
      expect(skip.className).toContain('focus:not-sr-only');
      // not-sr-only (Tailwind v4) menolkan padding → padding & tinggi sentuh 44px ditulis ulang saat fokus
      expect(skip.className.split(' ')).toEqual(expect.arrayContaining(['focus:px-5', 'focus:py-3', 'focus:min-h-11', 'focus:inline-flex', 'focus:items-center']));
      expect(film.textContent).toContain('Rute contoh. Waktu tempuh perkiraan dan mengikuti lalu lintas.');
      cleanup();
    }
  });

  it('pesiar.css: aturan film (var(--p), panggung, kartu, bab) bergerbang [data-tpl-motion=\'on\']; ≤ 4 lapisan will-change', () => {
    const style = css();
    for (const rule of style.match(/^\s*[^@\s{}][^{}]*\{[^}]*\}/gm) ?? []) {
      const selector = rule.split('{')[0];
      if (/var\(--p\b/.test(rule) || /\.ps-(stage|cam|route|clouds|cloud|haze|dusk|film-scrim|rail-fill|card|chapter|card-photo)(?![\w-])/.test(selector)) {
        expect(selector, rule).toContain("[data-tpl-motion='on']");
      }
    }
    expect((style.match(/will-change:\s*transform/g) ?? []).length).toBeLessThanOrEqual(4);
    // Kode panggung lengket hanya di versi bergerak
    const film = read('src/templates/pesiar/Film.tsx');
    const motionPart = film.slice(film.indexOf('function FilmMotion'), film.indexOf('function FilmPoster'));
    const posterPart = film.slice(film.indexOf('function FilmPoster'), film.indexOf('export function Film('));
    expect(motionPart).toContain('sticky top-[var(--tpl-sticky-top,0px)]');
    expect(motionPart).toContain('h-[var(--film-vh,100svh)]');
    expect(posterPart).not.toMatch(/sticky|ps-track|useFilmProgress/);
    // Gerak menyala hanya bila Shell mengizinkan DAN tata letak nyata
    expect(film).toMatch(/useMotionEnabled\(\) && layout/);
  });
});

describe('Pesiar: film bergerak (gerak menyala, tata letak nyata)', () => {
  it('jalur 3,4 × panggung (HP 2,55 ×), panggung lengket, --p dari gulir, bab aktif, ≤ 150 elemen SVG; pendengar dipasang & dilepas', async () => {
    const OriginalIO = window.IntersectionObserver;
    class ImmediateIO {
      private readonly cb: IntersectionObserverCallback;
      constructor(cb: IntersectionObserverCallback) {
        this.cb = cb;
      }
      observe = (target: Element) => {
        const entry = { isIntersecting: true, intersectionRatio: 1, target, boundingClientRect: target.getBoundingClientRect(), rootBounds: null } as unknown as IntersectionObserverEntry;
        this.cb([entry], this as unknown as IntersectionObserver);
      };
      unobserve = vi.fn();
      disconnect = vi.fn();
      takeRecords = () => [];
    }
    window.IntersectionObserver = ImmediateIO as unknown as typeof IntersectionObserver;
    const layout = vi.spyOn(document.documentElement, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, top: 0, left: 0, width: 1440, height: 900, right: 1440, bottom: 900, toJSON: () => ({}) } as DOMRect);
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    try {
      const { container, unmount } = render(<SiteRenderer templateCode="pesiar" content={null} />);
      const film = section(container, 'film');
      const track = film.querySelector<HTMLElement>('.ps-track')!;
      expect(track).not.toBeNull();
      expect(track.className).toContain('h-[calc(var(--film-vh,100svh)*2.55)]');
      expect(track.className).toContain('@3xl:h-[calc(var(--film-vh,100svh)*3.4)]');
      const stage = film.querySelector<HTMLElement>('[data-film-progress]')!;
      expect(stage.className).toMatch(/\bsticky\b/);
      expect(stage.className).toContain('top-[var(--tpl-sticky-top,0px)]');
      expect(stage.className).toContain('h-[var(--film-vh,100svh)]');
      expect(stage.className).toContain('overflow-hidden');
      // Tidak ada overflow hidden/auto pada leluhur panggung (sticky tetap bekerja)
      for (let el = stage.parentElement; el && !el.hasAttribute('data-tpl-root'); el = el.parentElement) {
        expect(el.className, el.tagName).not.toMatch(/(^|\s)overflow-(hidden|auto|scroll|y-auto|y-scroll)\b/);
      }
      // Hook menulis --film-vh (tinggi area terlihat) dan --p (4 desimal), tanpa setState per frame
      expect(track.style.getPropertyValue('--film-vh')).toBe(`${window.innerHeight}px`);
      expect(stage.style.getPropertyValue('--p')).toBe('0.0000');
      // Isi: kepala + jam, kamera aria-hidden (≤ 150 elemen SVG), awan/kabut/senja dekoratif, ≤ 3 foto, bab di <ol>
      expect(film.querySelector('h2')!.textContent).toBe('Sehari bersama sopir Anda');
      const camera = film.querySelector('.ps-cam')!;
      expect(camera).toHaveAttribute('aria-hidden', 'true');
      expect(camera.querySelectorAll('svg *').length).toBeLessThanOrEqual(150);
      for (const cls of ['.ps-clouds', '.ps-haze', '.ps-dusk', '.ps-film-scrim']) expect(film.querySelector(cls), cls).toHaveAttribute('aria-hidden', 'true');
      const imgs = Array.from(film.querySelectorAll('img'));
      expect(imgs.length).toBeLessThanOrEqual(3);
      for (const img of imgs) {
        expect(img.getAttribute('loading')).toBe('lazy');
        expect(img.closest('[aria-hidden="true"]')).not.toBeNull();
      }
      const list = within(film).getByRole('list', { name: 'Perhentian tur contoh' });
      const items = Array.from(list.querySelectorAll('li'));
      expect(items).toHaveLength(6);
      expect(items.map((li) => li.getAttribute('aria-current'))).toEqual(['step', null, null, null, null, null]);
      expect(film.textContent).toContain('08.00');
      expect(film.textContent).toContain('Di Seminyak');
      expect(within(film).getByRole('link', { name: 'Lewati animasi' })).toHaveAttribute('href', '#included');
      expect(film.querySelectorAll('.ps-tick')).toHaveLength(6);
      // Gulir (jalur 2842px, 1000px sudah lewat) → --p = 1000 / (2842 − tinggi layar), bab & jam mengikuti
      vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({ x: 0, y: -1000, top: -1000, left: 0, width: 1440, height: 2842, right: 1440, bottom: 1842, toJSON: () => ({}) } as DOMRect);
      act(() => {
        window.dispatchEvent(new Event('scroll'));
      });
      await wait(60);
      const p = filmProgress(0, window.innerHeight, -1000, 2842);
      expect(stage.style.getPropertyValue('--p')).toBe(p.toFixed(4));
      const frame = filmFrame(p, filmPlan(ROUTE_LENGTHS, filmMinutes(M.stops)));
      expect(items.map((li) => li.getAttribute('aria-current'))).toEqual(items.map((_, i) => (i === frame.chapter ? 'step' : null)));
      expect(film.textContent).toContain(formatClock(frame.minutes));
      expect(stage.dataset.dwell).toBe(String(frame.dwell));
      // Pendengar: scroll di window (capture + passive) dan resize; semua dilepas saat lepas
      const added = add.mock.calls.filter(([type]) => type === 'scroll' || type === 'resize');
      expect(added.some(([type, , opts]) => type === 'scroll' && (opts as AddEventListenerOptions)?.capture === true && (opts as AddEventListenerOptions)?.passive === true)).toBe(true);
      expect(added.some(([type]) => type === 'resize')).toBe(true);
      unmount();
      for (const [type, fn] of added) expect(remove.mock.calls.some(([t, f]) => t === type && f === fn), String(type)).toBe(true);
    } finally {
      add.mockRestore();
      remove.mockRestore();
      layout.mockRestore();
      window.IntersectionObserver = OriginalIO;
    }
  });
});

describe('Pesiar: perbaikan tinjauan (ronde 1)', () => {
  /** Film bergerak di jsdom: IntersectionObserver langsung terlihat + tata letak "nyata" (seperti tes film bergerak). */
  const withMotion = async (run: () => void | Promise<void>) => {
    const OriginalIO = window.IntersectionObserver;
    class ImmediateIO {
      private readonly cb: IntersectionObserverCallback;
      constructor(cb: IntersectionObserverCallback) {
        this.cb = cb;
      }
      observe = (target: Element) => {
        this.cb([{ isIntersecting: true, intersectionRatio: 1, target, boundingClientRect: target.getBoundingClientRect(), rootBounds: null } as unknown as IntersectionObserverEntry], this as unknown as IntersectionObserver);
      };
      unobserve = vi.fn();
      disconnect = vi.fn();
      takeRecords = () => [];
    }
    window.IntersectionObserver = ImmediateIO as unknown as typeof IntersectionObserver;
    const layout = vi.spyOn(document.documentElement, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, top: 0, left: 0, width: 1440, height: 900, right: 1440, bottom: 900, toJSON: () => ({}) } as DOMRect);
    try {
      await run();
    } finally {
      layout.mockRestore();
      window.IntersectionObserver = OriginalIO;
    }
  };
  const SUBTITLE = 'Contoh tur Ubud & Kintamani, dari jemput di hotel sampai kembali sore hari.';
  const NOTE = 'Rute contoh. Waktu tempuh perkiraan dan mengikuti lalu lintas.';

  it('film bergerak: judul, pengantar, dan catatan "Rute contoh" tampil di SETIAP lebar; peta disamarkan di belakang teks & rel', async () => {
    await withMotion(() => {
      const { container } = render(<SiteRenderer templateCode="pesiar" content={null} />);
      const film = section(container, 'film');
      const track = film.querySelector('.ps-track')!;
      expect(track).not.toBeNull();
      // HP & tablet (< 1024px): kepala section DI ATAS jalur film, tanpa kelas tersembunyi
      const phoneHead = Array.from(film.children).find((el) => el.className.split(/\s+/).includes('@5xl:hidden'))!;
      expect(phoneHead).toBeDefined();
      expect(phoneHead.compareDocumentPosition(track) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(phoneHead.querySelector('h2')!.textContent).toBe('Sehari bersama sopir Anda');
      expect(phoneHead.textContent).toContain(SUBTITLE);
      expect(phoneHead.textContent).toContain(NOTE);
      for (const el of [phoneHead, ...phoneHead.querySelectorAll('*')]) expect(el.getAttribute('class') ?? '', el.tagName).not.toMatch(/(^|\s)(hidden|sr-only)(\s|$)/);
      // Layar lebar (≥ 1024px): kolom kiri panggung (judul, pengantar, catatan), tidak dobel di HP
      const stage = film.querySelector('[data-film-progress]')!;
      const deskSub = Array.from(stage.querySelectorAll('p')).find((p) => p.textContent === SUBTITLE)!;
      expect(deskSub.className).not.toMatch(/(^|\s)hidden(\s|$)/);
      expect(deskSub.closest('.hidden')!.className.split(/\s+/)).toContain('@5xl:block');
      const deskNote = Array.from(stage.querySelectorAll('p')).find((p) => p.textContent === NOTE)!;
      expect(deskNote.className.split(/\s+/)).toEqual(expect.arrayContaining(['hidden', '@5xl:block']));
      // Peta (kamera) di wadah mask diam: nama tempat tidak menembus judul, jam, atau keterangan rel
      const camera = film.querySelector('.ps-cam')!;
      expect(camera.parentElement!.className).toContain('ps-cam-mask');
      expect(camera.parentElement).toHaveAttribute('aria-hidden', 'true');
      cleanup();
    });
    const style = css();
    const masks = style.match(/\[data-tpl-motion='on'\] \.ps-cam-mask \{[^}]*\}/g) ?? [];
    expect(masks.length).toBe(3);
    for (const rule of masks) {
      expect(rule).toMatch(/-webkit-mask-image: linear-gradient\([^;]*transparent[^;]*;/);
      expect(rule).toMatch(/(^|\s)mask-image: linear-gradient\([^;]*transparent[^;]*;/);
    }
    expect(masks[0]).toMatch(/mask-composite: intersect/);
    // Senja: satu cahaya hangat dicampur soft-light (tanpa lapisan merah muda biasa yang membuat hijau tua keruh)
    expect(style).toMatch(/\.ps-dusk \{[^}]*mix-blend-mode: soft-light;[^}]*\}/);
  });

  it('film dengan 3 perhentian: poster 3 pin bernama & 2 ruas; film bergerak 3 titik rel & 2 ruas', async () => {
    const three = { film: { stops: (def.defaultContent.film.stops as Record<string, string>[]).slice(0, 3) } };
    const poster = section(demo(three), 'film');
    const map = poster.querySelector('svg.ps-poster')!;
    expect(map.querySelectorAll('path.ps-leg')).toHaveLength(2);
    expect(map.querySelectorAll('.ps-pin')).toHaveLength(3);
    expect(Array.from(map.querySelectorAll('.ps-pin text')).map((t) => t.textContent)).toEqual(['Seminyak', 'Celuk', 'Tegallalang']);
    expect(within(poster).getByRole('list', { name: 'Perhentian tur contoh' }).querySelectorAll('li')).toHaveLength(3);
    cleanup();
    await withMotion(() => {
      const { container } = render(<SiteRenderer templateCode="pesiar" content={three} />);
      const film = section(container, 'film');
      expect(film.querySelectorAll('.ps-tick')).toHaveLength(3);
      expect(film.querySelectorAll('.ps-route path.ps-leg')).toHaveLength(2);
      expect(film.querySelectorAll('.ps-route .ps-pin')).toHaveLength(3);
      expect(film.textContent).toContain('Di Seminyak');
      cleanup();
    });
  });

  it('cetak: poster diam walau gerak menyala (beforeprint / media print), kembali ke film setelah cetak', async () => {
    const original = window.matchMedia;
    const changes: (() => void)[] = [];
    const printQuery = { matches: false, media: 'print', onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn((_: string, cb: () => void) => changes.push(cb)), removeEventListener: vi.fn(), dispatchEvent: vi.fn() };
    window.matchMedia = vi.fn().mockImplementation((query: string) =>
      query === 'print' ? printQuery : { matches: false, media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() },
    ) as unknown as typeof window.matchMedia;
    try {
      await withMotion(() => {
        const { container } = render(<SiteRenderer templateCode="pesiar" content={null} />);
        expect(section(container, 'film').querySelector('.ps-track')).not.toBeNull();
        act(() => {
          window.dispatchEvent(new Event('beforeprint'));
        });
        expect(section(container, 'film').querySelector('.ps-track')).toBeNull();
        expect(section(container, 'film').querySelector('svg.ps-poster')).not.toBeNull();
        expect(within(section(container, 'film')).getByRole('list', { name: 'Perhentian tur contoh' }).querySelectorAll('li')).toHaveLength(6);
        act(() => {
          window.dispatchEvent(new Event('afterprint'));
        });
        expect(section(container, 'film').querySelector('.ps-track')).not.toBeNull();
        // Emulasi media cetak (tanpa beforeprint): perubahan matchMedia('print') juga memasang poster
        printQuery.matches = true;
        act(() => {
          for (const cb of changes) cb();
        });
        expect(section(container, 'film').querySelector('.ps-track')).toBeNull();
        cleanup();
      });
    } finally {
      window.matchMedia = original;
    }
    // Cadangan CSS cetak: tanpa jalur tinggi
    expect(css()).toMatch(/@media print \{[\s\S]*\[data-tpl-motion='on'\] \.ps-track \{\s*height: auto;/);
  });

  it('Rancang tur: pesan yang sudah disusun hilang begitu isian berubah (juga "Ubah rute" di kartu tur); fokus tetap di tombol rute', () => {
    const container = demo();
    const plannerEl = section(container, 'planner');
    const form = within(plannerEl).getByRole('form', { name: 'Rancang tur' });
    const group = within(plannerEl).getByRole('group', { name: /^Tempat tujuan/ });
    const chip = (name: string) => within(group).getAllByRole('button').find((b) => b.textContent!.includes(name))!;
    const ready = () => within(plannerEl).queryByRole('heading', { level: 3, name: 'Pesan siap dikirim' });
    const waText = () => decode(within(plannerEl).getByRole('link', { name: 'Buka WhatsApp' }));
    fireEvent.change(within(plannerEl).getByLabelText('Tanggal tur'), { target: { value: '2030-11-16' } });
    act(() => {
      fireEvent.submit(form);
    });
    expect(ready()).not.toBeNull();
    expect(waText()).toContain('Rute: Celuk → Ubud → Tegallalang');
    // "Ubah rute" di kartu tur saat pesan tampil → panel kembali ke perkiraan dengan rute baru, fokus ke "Rute Anda"
    fireEvent.click(within(section(container, 'tours')).getByRole('button', { name: 'Ubah rute: Uluwatu & Jimbaran' }));
    expect(ready()).toBeNull();
    expect(within(plannerEl).queryByRole('link', { name: 'Buka WhatsApp' })).toBeNull();
    expect(routeNames(plannerEl)).toEqual(['Nusa Dua', 'Uluwatu', 'Jimbaran']);
    expect(within(plannerEl).getByRole('heading', { level: 3, name: 'Rute Anda' })).toHaveFocus();
    act(() => {
      fireEvent.submit(form);
    });
    expect(waText()).toContain('Rute: Nusa Dua → Uluwatu → Jimbaran');
    // Chip, mobil, tanggal, area jemput → pesan lama hilang juga
    fireEvent.click(chip('Kintamani'));
    expect(ready()).toBeNull();
    act(() => {
      fireEvent.submit(form);
    });
    expect(waText()).toContain('Rute: Nusa Dua → Uluwatu → Jimbaran → Kintamani');
    fireEvent.click(within(plannerEl).getAllByRole('radio')[2]);
    expect(ready()).toBeNull();
    act(() => {
      fireEvent.submit(form);
    });
    expect(waText()).toContain('Mobil: Minibus 12 penumpang (atau setara)');
    fireEvent.change(within(plannerEl).getByLabelText('Tanggal tur'), { target: { value: '2030-11-17' } });
    expect(ready()).toBeNull();
    act(() => {
      fireEvent.submit(form);
    });
    fireEvent.change(within(plannerEl).getByLabelText('Jemput di'), { target: { value: 'Ubud' } });
    expect(ready()).toBeNull();
    // Hapus: fokus ke tombol hapus baris berikutnya (baris terakhir → sebelumnya; kosong → chip pertama)
    fireEvent.click(within(plannerEl).getByRole('button', { name: 'Hapus Uluwatu dari rute' }));
    expect(within(plannerEl).getByRole('button', { name: 'Hapus Jimbaran dari rute' })).toHaveFocus();
    fireEvent.click(within(plannerEl).getByRole('button', { name: 'Hapus Kintamani dari rute' }));
    expect(within(plannerEl).getByRole('button', { name: 'Hapus Jimbaran dari rute' })).toHaveFocus();
    // Pindah ke ujung: tombol yang ditekan nonaktif → fokus ke tombol arah lain (bukan hilang ke <body>)
    fireEvent.click(within(plannerEl).getByRole('button', { name: 'Pindahkan Jimbaran ke atas' }));
    expect(routeNames(plannerEl)).toEqual(['Jimbaran', 'Nusa Dua']);
    expect(within(plannerEl).getByRole('button', { name: 'Pindahkan Jimbaran ke bawah' })).toHaveFocus();
    fireEvent.click(within(plannerEl).getByRole('button', { name: 'Pindahkan Jimbaran ke bawah' }));
    expect(routeNames(plannerEl)).toEqual(['Nusa Dua', 'Jimbaran']);
    expect(within(plannerEl).getByRole('button', { name: 'Pindahkan Jimbaran ke atas' })).toHaveFocus();
    fireEvent.click(within(plannerEl).getByRole('button', { name: 'Hapus Jimbaran dari rute' }));
    expect(within(plannerEl).getByRole('button', { name: 'Hapus Nusa Dua dari rute' })).toHaveFocus();
    fireEvent.click(within(plannerEl).getByRole('button', { name: 'Hapus Nusa Dua dari rute' }));
    expect(within(group).getAllByRole('button')[0]).toHaveFocus();
    // Daftar rute = rencana perjalanan: nomor dalam lingkaran + garis putus-putus (dekoratif, di luar <ol>)
    fireEvent.click(chip('Celuk'));
    fireEvent.click(chip('Ubud'));
    const ol = plannerEl.querySelector('[data-tpl-tone="inverse"] ol')!;
    expect(Array.from(ol.children).map((el) => el.tagName)).toEqual(['LI', 'LI']);
    const connector = Array.from(ol.parentElement!.children).find((el) => el.tagName === 'SPAN')!;
    expect(connector).toHaveAttribute('aria-hidden', 'true');
    expect(connector.className).toContain('border-dashed');
  });

  it('antar-jemput tanpa daftar mobil: satu kolom "Harga per mobil" dari harga ke-1, sama dengan perkiraan formulir', () => {
    const container = demo({ cars: { items: [] } });
    expect(sectionKeys(container)).not.toContain('cars');
    const transferEl = section(container, 'transfer');
    const table = transferEl.querySelector('table')!;
    expect(Array.from(table.querySelectorAll('thead th')).map((th) => th.textContent)).toEqual(['Area · waktu tempuh', 'Harga per mobil']);
    expect(Array.from(table.querySelectorAll('tbody tr')[0].querySelectorAll('td')).map((td) => plain(td.textContent))).toEqual(['Rp200rb']);
    const form = within(transferEl).getByRole('form', { name: 'Pesan antar-jemput' });
    expect(within(form).queryByLabelText('Mobil')).toBeNull();
    expect(plain(Array.from(form.querySelectorAll('p')).find((p) => p.textContent!.startsWith('Perkiraan harga per mobil'))?.textContent)).toBe('Perkiraan harga per mobilRp200.000');
  });

  it('tampilan: hero HP bebas tombol melayang, cerita tamu tanpa daftar nama dobel di HP, mobil berlivery rapi, harga mobil berlabel', () => {
    const container = demo();
    // Hero HP: jarak bawah 80px (tombol WhatsApp melayang 16 + 48px), desktop tetap 32px
    const heroInner = section(container, 'hero').querySelector('[class*="pb-[80px]"]')!;
    expect(heroInner.className.split(/\s+/)).toEqual(expect.arrayContaining(['pb-[80px]', '@3xl:pb-8']));
    // Cerita tamu: daftar nama hanya ≥ 1024px (di HP nama aktif sudah di bawah kutipan)
    const tablist = within(section(container, 'testimonials')).getByRole('tablist', { name: 'Pilih cerita tamu' });
    expect(tablist.className.split(/\s+/)).toEqual(expect.arrayContaining(['hidden', '@5xl:block']));
    expect(within(section(container, 'testimonials')).getByRole('button', { name: 'Cerita berikutnya' })).toBeVisible();
    // Mobil: livery dipotong TEPAT oleh garis badan (clipPath, tanpa geser), ban tinta + velg pasir
    const cars = section(container, 'cars');
    for (const svg of cars.querySelectorAll('svg.ps-draw')) {
      expect(svg.querySelector('[transform]')).toBeNull();
      const body = svg.querySelector('g[stroke] path:nth-child(2)')!.getAttribute('d');
      const clip = svg.querySelector('[id$="-body"]')!;
      expect(clip.tagName).toBe('clipPath');
      expect(clip.querySelector('path')!.getAttribute('d')).toBe(body);
      const livery = svg.querySelector('.ps-car-panel rect')!;
      expect(livery.getAttribute('clip-path')).toBe(`url(#${clip.id})`);
      expect(Array.from(svg.querySelectorAll('.ps-car-panel circle')).map((c) => c.getAttribute('fill'))).toEqual(['#1E2622', '#F5EFE6', '#1E2622', '#1E2622', '#F5EFE6', '#1E2622']);
    }
    // Harga mobil berlabel "Mulai" + catatan harga contoh di bawah kisi
    expect(plain(cars.textContent)).toContain('Mulai Rp750rb / 10 jam');
    expect(cars.textContent).toContain('Harga contoh per mobil; dikonfirmasi admin lewat WhatsApp.');
    // Salinan tanpa pengulangan: label hero menambah informasi, label tur = kata menu
    expect(section(container, 'hero').textContent).not.toContain('Bali · sopir pribadi');
    expect(def.defaultContent.tours.eyebrow).toBe('Tur');
    expect(String(def.defaultContent.hero.subtitle)).not.toMatch(/sopir/);
    expect(def.defaultContent.included.yes).toContainEqual({ text: 'Jemput & antar di hotel' });
  });
});

describe('Pesiar: perbaikan tinjauan (ronde 2)', () => {
  it('angka Playfair tegak; header berganti warna serentak (logo ikut memudar, instan bila gerak dikurangi)', () => {
    // Angka bawaan Playfair bergaya lama ("10 jam" terbaca "1o jam") → SERIF membawa lining-nums
    expect(SERIF.split(' ')).toContain('lining-nums');
    const container = demo();
    const yes = within(section(container, 'included')).getByText('Sopir selama paket 10 jam');
    expect(yes.className.split(/\s+/)).toContain('lining-nums');
    const header = container.querySelector('header')!;
    const bar = header.querySelector('[class*="border-b"]')!;
    const name = header.querySelector('a .truncate')!;
    const mark = header.querySelector('a svg')!;
    for (const el of [bar, name, mark]) expect(el.getAttribute('class')!.split(/\s+/)).toEqual(expect.arrayContaining(['transition-colors', 'duration-300', 'motion-reduce:transition-none']));
  });

  it('layar lebar: kolom & sizes kartu tur dari jumlah tur; panorama footer maks. 520px selebar penuh; tagline memberi ruang tombol WhatsApp', () => {
    const items = def.defaultContent.tours.items as Record<string, string>[];
    const grid = (root: HTMLElement) => section(root, 'tours').querySelector('ul[aria-label="Daftar tur"]')!.className;
    const sizes = (root: HTMLElement) => section(root, 'tours').querySelector('img')!.getAttribute('sizes');
    const four = demo();
    // 4 tur (bawaan): tetap 4 kolom, kartu maks. 560px di ≥ 1920px, sisa ruang ke celah (kisi tetap selebar WRAP)
    expect(grid(four)).toContain('@min-[120rem]:grid-cols-[repeat(4,minmax(0,560px))]');
    expect(grid(four)).toContain('@min-[120rem]:justify-between');
    expect(sizes(four)).toBe('(min-width: 2240px) 560px, (min-width: 1280px) 25vw, (min-width: 640px) 50vw, 80vw');
    const footer = four.querySelector('footer')!;
    expect(footer.querySelector('img')!.parentElement!.className.split(/\s+/)).toEqual(expect.arrayContaining(['w-full', '@3xl:aspect-[21/6]', '@3xl:max-h-[520px]']));
    const bottom = Array.from(footer.querySelectorAll('div')).find((d) => d.className.includes('border-t') && d.textContent!.includes('Private tour & sewa mobil dengan sopir'))!;
    expect(bottom.className.split(/\s+/)).toContain('@3xl:pr-[72px]');
    cleanup();
    const five = demo({ tours: { items: [...items, items[0]] } });
    expect(grid(five)).toContain('@min-[120rem]:grid-cols-5');
    expect(sizes(five)).toBe('(min-width: 1920px) 20vw, (min-width: 1280px) 25vw, (min-width: 640px) 50vw, 80vw');
    cleanup();
    const three = demo({ tours: { items: items.slice(0, 3) } });
    expect(grid(three)).toContain('@7xl:grid-cols-3');
    expect(grid(three)).not.toContain('grid-cols-4');
    expect(sizes(three)).toBe('(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 80vw');
  });

  it('bandara di HP: tabel bertumpuk (semua kelas mobil terlihat) dengan peran tabel eksplisit; "Lewati animasi" di pita atas section', () => {
    const container = demo();
    const table = section(container, 'transfer').querySelector('table')!;
    expect(table).toHaveAttribute('role', 'table');
    expect(table.className.split(/\s+/)).toEqual(expect.arrayContaining(['@max-2xl:block', '@2xl:min-w-[460px]']));
    expect(table.style.getPropertyValue('--ps-fare-cols')).toBe('3');
    for (const tr of table.querySelectorAll('tr')) {
      expect(tr).toHaveAttribute('role', 'row');
      expect(tr.className).toContain('@max-2xl:grid');
    }
    expect(Array.from(table.querySelectorAll('thead th')).map((th) => th.getAttribute('role'))).toEqual(['columnheader', 'columnheader', 'columnheader', 'columnheader']);
    expect(Array.from(table.querySelectorAll('tbody th')).every((th) => th.getAttribute('role') === 'rowheader' && th.className.includes('@max-2xl:col-span-full'))).toBe(true);
    expect(Array.from(table.querySelectorAll('td')).every((td) => td.getAttribute('role') === 'cell')).toBe(true);
    // Lewati animasi: saat difokus di pita kosong paling atas section (8px), tidak menutupi label/H2
    const skip = within(section(container, 'film')).getByRole('link', { name: 'Lewati animasi' });
    expect(skip.className.split(/\s+/)).toEqual(expect.arrayContaining(['top-2', 'left-5', 'focus:absolute']));
    expect(skip.className).not.toContain('84px');
  });
});

describe('Pesiar: gerak', () => {
  it('pratinjau CMS diam dan tanpa tautan wa.me terbuka', () => {
    const { container } = render(<def.Component content={resolveContent(def, null)} preview />);
    expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'off');
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    expect(container.querySelector('a[href^="javascript:"], a[href^="vbscript:"]')).toBeNull();
    expect(container.querySelector('[data-hero-layout="vista"] img[fetchpriority="high"]')).not.toBeNull();
    expect(container.querySelector('.ps-track')).toBeNull();
  });

  it('pesiar.css: animasi bergerbang [data-tpl-motion=\'on\'], blok reduced-motion & cetak, kelas ps-, Ken Burns skala-saja ≤ 1,06 sekali', () => {
    const style = css();
    expect(style).toContain('@layer components');
    expect(style).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(style).toMatch(/@media print/);
    for (const rule of style.match(/^\s*[^@\s{}][^{}]*\{[^}]*\b(transition|animation):[^}]*\}/gm) ?? []) {
      const selector = rule.split('{')[0];
      if (/transition:\s*none|animation:\s*none/.test(rule)) continue;
      expect(selector, rule).toContain("[data-tpl-motion='on']");
    }
    for (const cls of style.match(/\.[a-z][\w-]*/g) ?? []) expect(cls, cls).toMatch(/^\.ps-/);
    expect(style).not.toMatch(/infinite|box-shadow|text-shadow|drop-shadow|background-attachment/);
    const kenburns = /@keyframes ps-kenburns\s*\{([\s\S]*?)\n\}/.exec(style)![1];
    expect(kenburns).not.toMatch(/opacity|clip|filter/);
    const scales = [...kenburns.matchAll(/scale\(([\d.]+)\)/g)].map((m) => Number(m[1]));
    expect(Math.max(...scales)).toBeLessThanOrEqual(1.06);
    expect(Math.min(...scales)).toBe(1);
    expect(style).toMatch(/\[data-tpl-motion='on'\] \.ps-kenburns \{\s*animation: ps-kenburns 14s [^;]*;/);
    // Durasi: gambar/garis dekoratif ≤ 1,6 dtk sekali, UI ≤ 1 dtk; tanpa iteration-count (hanya Marquee boleh berulang)
    for (const [, name, value, unit] of style.matchAll(/animation:\s*ps-([a-z]+)\s+([\d.]+)(m?s)/g)) {
      const ms = Number(value) * (unit === 's' ? 1000 : 1);
      if (name === 'kenburns') continue;
      expect(ms, name).toBeLessThanOrEqual(['draw', 'cue', 'pulse'].includes(name) ? 1600 : 1000);
    }
    expect(style).not.toMatch(/animation-iteration-count|animation:[^;]*\s\d+\s*;/);
    for (const [, value, unit] of style.matchAll(/transition:[^;]*?\s([\d.]+)(m?s)/g)) expect(Number(value) * (unit === 's' ? 1000 : 1)).toBeLessThanOrEqual(1000);
    // Keadaan diam = keadaan akhir: garis mobil utuh, kartu & bab film terlihat di poster (aturan film hanya saat gerak)
    expect(style).toMatch(/\.ps-draw g path,\s*\.ps-draw g circle\s*\{\s*stroke-dasharray: 1;\s*stroke-dashoffset: 0;/);
    // Reduced motion: semua animasi & transisi gerak dimatikan, garis mobil utuh
    const reduced = /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n {2}\}/.exec(style)![1];
    for (const cls of ['ps-kenburns', 'ps-cue', 'ps-stop', 'ps-quote', 'ps-card', 'ps-chapter', 'ps-collapse']) expect(reduced, cls).toContain(cls);
  });
});

describe('Pesiar: warna tema bisa diganti', () => {
  it('bougainvillea bawaan → --tpl-accent; warna CMS mengalir ke teks aksen & aksen terang; teks di atas aksen kontras', () => {
    const base = demo();
    expect(rootStyle(base, '--tpl-accent')).toBe('#b5446e');
    expect(rootStyle(base, '--ps-ink')).toBe('#a44065');
    expect(rootStyle(base, '--ps-bright')).toBe('#ce85a1');
    cleanup();
    const blue = demo({ brand: { accent_color: '#0050FF' } });
    expect(rootStyle(blue, '--tpl-accent')).toBe('#0050ff');
    for (const name of ['--ps-ink', '--ps-bright']) expect(rootStyle(blue, name), name).toBe((pesiarVars('#0050FF') as Record<string, string>)[name]);
    cleanup();
    expect(rootStyle(demo({ brand: { accent_color: '#FACC15' } }), '--tpl-on-accent')).toBe('#121620');
  });
});

describe('Pesiar: SEO situs pembeli, judul, gambar, tautan', () => {
  it('judul tab & meta description dari nama, tagline, dan kalimat hero; theme-color = aksen', () => {
    expect(siteTitle('pesiar', null)).toBe('Pesiar Bali — Private tour & sewa mobil dengan sopir');
    expect(siteTitle('pesiar', null).length).toBeLessThanOrEqual(60);
    const restore = applySiteHead('pesiar', null);
    const description = document.head.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
    expect(description).toMatch(/^Tur sehari keliling Bali dan antar-jemput bandara/);
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(200);
    expect(document.head.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#B5446E');
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
    cleanup();
    const untitled = demo(Object.fromEntries(ORDER.filter((k) => k !== 'hero').map((k) => [k, { title: '' }])));
    check(untitled);
    expect(ORDER.filter((k) => k !== 'hero').map((k) => section(untitled, k).querySelector('h2')!.textContent)).toEqual([
      'Tur sehari',
      'Rancang tur sendiri',
      'Sehari bersama sopir',
      'Sudah & belum termasuk',
      'Mobil & sopir',
      'Antar-jemput bandara',
      'Cerita tamu',
      'Tanya jawab',
      'Kontak',
    ]);
    for (const k of ORDER.filter((key) => key !== 'hero')) expect(section(untitled, k).querySelector('h2'), k).toHaveClass('sr-only');
    // Judul hero kosong → nama usaha (tetap satu H1)
    cleanup();
    expect(section(demo({ hero: { title: '' } }), 'hero').querySelector('h1')!.textContent).toBe('Pesiar Bali');
  });

  it('gambar: alt deskriptif, width/height, srcset & sizes', () => {
    const container = demo();
    const imgs = Array.from(container.querySelectorAll('img'));
    // hero + 4 tur + 6 perhentian (poster) + 1 bandara + 1 panorama
    expect(imgs).toHaveLength(13);
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
      const submit = !!button.closest('form') && /Kirim ke WhatsApp|Susun pesan WhatsApp/.test(button.textContent ?? '');
      expect(button.getAttribute('type'), button.textContent ?? '').toBe(submit ? 'submit' : 'button');
    }
    for (const svg of container.querySelectorAll('svg')) expect(svg.closest('[aria-hidden="true"], [aria-hidden=""]') ?? svg.getAttribute('aria-hidden'), svg.outerHTML.slice(0, 60)).toBeTruthy();
  });
});

describe('Pesiar: konten opsional kosong', () => {
  it('tanpa tur → section & menu "Tur" hilang, Rancang tur mulai kosong; Rancang tur mati → tanpa "Ubah rute", tombol ke tur', () => {
    const container = demo({ tours: { items: [] } });
    expect(sectionKeys(container)).not.toContain('tours');
    expect(Array.from(container.querySelector('header nav')!.querySelectorAll('a')).map((a) => a.textContent)).not.toContain('Tur');
    const plannerEl = section(container, 'planner');
    expect(routeNames(plannerEl)).toEqual([]);
    expect(plannerEl.textContent).toContain('Pilih tempat di daftar untuk mulai menyusun rute.');
    cleanup();
    const noPlanner = demo({ planner: { enabled: false } });
    expect(sectionKeys(noPlanner)).not.toContain('planner');
    expect(within(section(noPlanner, 'tours')).queryByRole('button', { name: /Ubah rute/ })).toBeNull();
    expect(within(noPlanner.querySelector('header')!).getAllByRole('link', { name: 'Pesan Tur' })[0]).toHaveAttribute('href', '#tours');
    expect(within(section(noPlanner, 'hero')).getByRole('link', { name: 'Rancang tur' })).toHaveAttribute('href', '#tours');
    cleanup();
    const noLabels = demo({ tours: { book_label: '', edit_label: '' } });
    const tours = section(noLabels, 'tours');
    expect(within(tours).queryByRole('link', { name: /Pesan tur ini/ })).toBeNull();
    expect(within(tours).queryByRole('button')).toBeNull();
    // ≥ 5 tur → kolom ke-5 di layar ≥ 1920px
    cleanup();
    const five = demo({ tours: { items: [...(CONTENT.tours.items as object[]), { name: 'Tur kelima', hours: '8', stops: 'Ubud', price: '750000', image: '' }] } });
    expect(section(five, 'tours').querySelector('ul')!.className).toContain('@min-[120rem]:grid-cols-5');
    expect(section(five, 'tours').querySelectorAll('article')).toHaveLength(5);
  });

  it('film tanpa perhentian → hilang (Lewati animasi menuju section tampil berikutnya); bandara tanpa foto/keterangan; mobil dengan foto pembeli', () => {
    expect(sectionKeys(demo({ film: { stops: [] } }))).not.toContain('film');
    cleanup();
    const noIncluded = demo({ included: { enabled: false } });
    expect(within(section(noIncluded, 'film')).getByRole('link', { name: 'Lewati animasi' })).toHaveAttribute('href', '#cars');
    cleanup();
    const bare = demo({ transfer: { image: '', notes: [] } });
    const transferEl = section(bare, 'transfer');
    expect(transferEl.querySelector('img')).toBeNull();
    expect(within(transferEl).queryByRole('list', { name: 'Keterangan layanan' })).toBeNull();
    cleanup();
    const photo = '/assets/templates/photos/pesiar-seminyak-1200.webp';
    const own = demo({ cars: { items: [{ name: 'Sedan', seats: '4', luggage: '', price: '', overtime: '', image: photo }], drivers: [] } });
    const cars = section(own, 'cars');
    expect(cars.querySelector('svg.ps-draw')).toBeNull();
    expect(cars.querySelector('img')!.getAttribute('src')).toBe(photo);
    expect(cars.textContent).not.toMatch(/Rp|Sopir kami/);
    // Satu mobil → lintasan pilihan mobil satu kolom, tabel bandara satu kolom harga
    expect(within(section(own, 'planner')).getAllByRole('radio')).toHaveLength(1);
    expect(section(own, 'transfer').querySelectorAll('thead th')).toHaveLength(2);
  });

  it('termasuk satu kolom, satu cerita tanpa tab, FAQ kosong hilang, hero tanpa keunggulan & tombol kedua, header tanpa tombol', () => {
    const container = demo({
      included: { no: [] },
      testimonials: { items: [{ quote: 'Rapi dan tepat waktu.', name: 'Rina', place: 'Surabaya' }] },
      faq: { items: [] },
      hero: { trust: [], secondary_label: '', header_label: '' },
    });
    expect(Array.from(section(container, 'included').querySelectorAll('h3')).map((h) => h.textContent)).toEqual(['Sudah termasuk']);
    const stories = section(container, 'testimonials');
    expect(within(stories).queryByRole('tablist')).toBeNull();
    expect(within(stories).queryByRole('tabpanel')).toBeNull();
    expect(within(stories).queryByRole('button')).toBeNull();
    expect(stories.textContent).toContain('Rapi dan tepat waktu.');
    expect(sectionKeys(container)).not.toContain('faq');
    expect(Array.from(container.querySelector('header nav')!.querySelectorAll('a')).map((a) => a.textContent)).not.toContain('FAQ');
    const hero = section(container, 'hero');
    expect(within(hero).queryByRole('list')).toBeNull();
    expect(within(hero).getAllByRole('link').map((a) => a.textContent)).toEqual(['Rancang tur']);
    expect(within(container.querySelector('header')!).queryByRole('link', { name: 'Pesan Tur' })).toBeNull();
  });

  it('tanpa WhatsApp → formulir menyusun email, tanpa WhatsApp & email → salin pesan; tautan WhatsApp lain hilang', () => {
    const fill = (root: HTMLElement) => {
      fireEvent.change(within(root).getByLabelText('Tanggal tur'), { target: { value: '2030-11-16' } });
      act(() => {
        fireEvent.submit(within(root).getByRole('form', { name: 'Rancang tur' }));
      });
    };
    const container = demo({ contact: { whatsapp: '' } });
    const plannerEl = section(container, 'planner');
    expect(within(plannerEl).getByRole('button', { name: 'Kirim ke WhatsApp' })).toHaveAttribute('type', 'submit');
    fill(plannerEl);
    expect(within(plannerEl).getByRole('link', { name: 'Kirim lewat email' }).getAttribute('href')).toMatch(/^mailto:halo@example\.com\?subject=Tur%20pribadi&body=Halo%20Pesiar%20Bali/);
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    expect(within(section(container, 'tours')).queryByRole('link', { name: /Pesan tur ini/ })).toBeNull();
    expect(within(section(container, 'faq')).queryByRole('link', { name: /Sapa kami di WhatsApp/ })).toBeNull();
    expect(Array.from(section(container, 'contact').querySelectorAll('dt')).map((dt) => dt.textContent)).not.toContain('WhatsApp');
    cleanup();
    const bare = section(demo({ contact: { whatsapp: '', email: '' } }), 'planner');
    fill(bare);
    expect(within(bare).getByRole('button', { name: 'Salin pesan' })).toBeInTheDocument();
  });

  it('footer tanpa foto & media sosial; footer mati; semua section mati', () => {
    const container = demo({ footer: { image: '', instagram: '', youtube: '', tiktok: '' } });
    const footer = container.querySelector('footer')!;
    expect(footer.querySelector('img')).toBeNull();
    expect(footer.textContent).not.toContain('Media sosial');
    cleanup();
    expect(demo({ footer: { enabled: false } }).querySelector('footer')).toBeNull();
  });
});

describe('Pesiar: editor CMS', () => {
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
        for (const sf of f.fields) expect(container.textContent, `${s.key}.${f.key}.${sf.key}`).toContain(sf.label);
      }
      unmount();
    }
  }, 60_000);
});

describe('Pesiar: data katalog', () => {
  const MIGRATION = 'database/migrations/2026-10-29_053_pesiar_template.sql';
  const sql = () => read(MIGRATION);

  it('migrasi 053: baris pesiar dengan template_code, kategori baru Travel & Transportasi, harga, pratinjau .webp, fitur, salinan jujur', () => {
    const text = sql();
    expect(text).toContain("'pesiar'");
    expect(text).toContain("'Travel & Transportasi'");
    expect(text).toContain('1590000.00');
    expect(text).toContain("'/assets/templates/pesiar-preview.webp'");
    expect(text).toContain('\'["/assets/templates/pesiar-1.webp","/assets/templates/pesiar-2.webp"]\'');
    expect(text).toMatch(/data tidak disimpan di website/);
    expect(text).toMatch(/tidak ada pembayaran online, e-tiket, ketersediaan mobil real-time, atau pelacakan penerbangan otomatis/i);
    expect(text).not.toMatch(/termasuk domain|domain, hosting|dijamin|garansi|terbaik|termurah|izin|asuransi/i);
    expect(text).toMatch(/kategori baru; halaman kategorinya ditambahkan di kode yang sama/);
    const features = JSON.parse(/features\s+= '(\[[^']*\])'/.exec(text)![1]) as string[];
    expect(features.length).toBeGreaterThanOrEqual(6);
    expect(features.length).toBeLessThanOrEqual(8);
    expect(features[features.length - 1]).toBe('Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)');
    // Berkas galeri yang disebut migrasi benar-benar ada
    const gallery = JSON.parse(/gallery\s+= '(\[[^']*\])'/.exec(text)![1]) as string[];
    expect(gallery).toEqual(['/assets/templates/pesiar-1.webp', '/assets/templates/pesiar-2.webp']);
    for (const url of gallery) expect(existsSync(publicFile(url)), url).toBe(true);
  });

  it('migrasi 053 aman diulang (INSERT IGNORE + UPDATE berdasarkan slug, tanpa DELETE) dan tercatat di schema_migrations', () => {
    const raw = sql();
    expect(raw).toMatch(/Domain\s+(--\s+)?tidak termasuk harga template/);
    expect(raw).toMatch(/FIKTIF/);
    expect(raw).toMatch(/Unsplash/);
    expect(raw).toMatch(/SETELAH kode/);
    expect(raw).toMatch(/MENIMPA perubahan admin/);
    const text = raw.replace(/^--.*$/gm, '');
    expect(text).toMatch(/INSERT IGNORE INTO templates/);
    expect(text).toMatch(/WHERE slug = 'pesiar';/);
    expect(text).toMatch(/sort_order\s+= 36/);
    expect(text).toMatch(/price\s+= 1590000\.00/);
    expect(text).toMatch(/category\s+= 'Travel & Transportasi'/);
    expect(text).toMatch(/status\s+= 'published'/);
    expect(text).toMatch(/template_code\s+= 'pesiar'/);
    expect(text).not.toMatch(/\bDELETE\b|\bDROP\b|\bTRUNCATE\b/i);
    expect(text).toContain("VALUES ('2026-10-29_053', 'templates: katalog Pesiar')");
  });

  it('gambar pratinjau katalog ada di public/, 1600×1000, VP8/VP8X, dan ringan', () => {
    for (const name of ['pesiar-preview', 'pesiar-1', 'pesiar-2']) {
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
    const title = (catalogSeo.title ?? '').replace('{nama}', 'Pesiar').replace('{harga_singkat}', 'Rp1,59 jt');
    expect(title).toBe('Pesiar: Template Website Sewa Mobil & Sopir – Rp1,59 jt');
    expect(title.length).toBeLessThanOrEqual(60);
    expect(catalogSeo.description).toMatch(/^.{1,69} \{harga\} sudah termasuk hosting & SSL tahun pertama; domain mulai \{domain_mulai\}\/tahun\.$/);
    expect(catalogSeo.niche).toBe('Sewa Mobil dengan Sopir');
    expect(catalogSeo.updated).toBe('2026-10-30');
    expect(catalogPage.h1).toBe('{nama}: Template Website Private Tour & Sewa Mobil dengan Sopir');
    expect(catalogPage.niche).toBe('private tour & sewa mobil dengan sopir');
    const text = JSON.stringify(catalogContent);
    expect(text).toMatch(/fiktif/);
    expect(text).toMatch(/data tidak disimpan di website/);
    expect(text).toContain('Tidak ada pembayaran online, e-tiket, ketersediaan mobil real-time, atau pelacakan penerbangan otomatis');
    expect(text).toContain('Harga di template adalah contoh per mobil');
    expect(text).toMatch(/template website private tour/);
    expect(text).toMatch(/website sewa mobil dengan sopir/);
    expect(text).toMatch(/website tour Bali/);
    expect(text).not.toMatch(/\b(dijamin|garansi|terbaik nomor|rating \d|bintang \d|#1)\b|1\.590\.000|termasuk domain/i);
    expect(text).not.toMatch(/\d+ (hari|jam) kerja/);
    expect(text).not.toMatch(/\b(toyota|avanza|innova|hiace|alphard|xpander|elf)\b/i);
    expect(catalogContent.guides).toEqual(['template-vs-jasa-website-custom', 'biaya-website-company-profile']);
    expect(Object.keys(catalogContent.imageAlts ?? {})).toEqual(['pesiar-preview.webp', 'pesiar-1.webp', 'pesiar-2.webp']);
  });
});

describe('Pesiar: konten aneh', () => {
  it('angka, null, dan string di tempat list tidak membuat crash; tautan & gambar berbahaya dibuang', () => {
    const weird = {
      hero: { image: 'javascript:alert(1)', header_url: 'javascript:alert(1)', primary_url: 'vbscript:x', trust: 'x', subtitle: 7 },
      tours: { items: [null, 'x', { name: 3 }, { name: 'Tur A', price: 'abc', hours: {}, stops: 5, image: 'javascript:alert(1)' }] },
      planner: { destinations: 'x', base_hours: 'abc', buffer_hours: {}, pickup_areas: 9 },
      film: { stops: [{ name: 'Satu', time: 'pagi' }, null] },
      transfer: { zones: [{ name: 'Z', price_1: 'abc' }], notes: 5, image: 'vbscript:x' },
      cars: { items: [{ name: 'Mobil', seats: 'banyak' }], drivers: null },
      included: { yes: 'x', no: [null] },
      testimonials: { items: 5 },
      faq: { items: [{ question: 2, answer: null }], link_url: 'vbscript:x' },
      contact: { whatsapp: 'abc', maps_url: 'javascript:alert(1)' },
      footer: { instagram: 'javascript:alert(1)', image: 'javascript:alert(1)' },
      brand: { accent_color: 'oranye' },
    } as unknown as SiteContent;
    const { container } = render(<def.Component content={resolveContent(def, weird)} />);
    expect(container.querySelector('a[href^="javascript:"], a[href^="vbscript:"]')).toBeNull();
    expect(container.querySelector('img[src^="javascript:"], img[src^="vbscript:"]')).toBeNull();
    expect(container.querySelector('iframe[src^="javascript:"]')).toBeNull();
    expect(container.querySelector('h1')!.textContent).toBe('Bali dengan sopir pribadi Anda.');
    expect(section(container, 'tours').textContent).toContain('Tur A');
    expect(container.textContent).not.toMatch(/NaN|undefined|Infinity|\[object Object\]/);
    expect(rootStyle(container, '--ps-ink')).toBe('#a44065');
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
