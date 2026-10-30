// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/lawatan.test.tsx
// Lawatan (tour & travel rombongan "postcard journal", batch 2026-10-29): skema CMS & konten demo, foto, salinan jujur
// (formulir hanya menyusun pesan WhatsApp, harga contoh dikonfirmasi admin, tanpa pembayaran online, tanpa merek bus atau
// klaim izin/asuransi), helper model (warna tema, menu, tujuan tautan, harga, paket & saringan jenis trip, formulir hitung
// biaya → estimasi + validasi + pesan WhatsApp, film itinerary: kemajuan gulir, bab, km, suasana waktu, ukuran panggung),
// demo (urutan section, hero postcard + chip jenis trip → saringan paket, header + menu HP, kartu paket + itinerary +
// "Hitung biaya", film statis & bergerak, formulir, testimoni, galeri, akordeon, kontak, footer), wadah PENUH, datar tanpa
// bayangan, gerak (pratinjau CMS diam, CSS lw- bergerbang data-tpl-motion), warna tema, SEO situs pembeli, judul & gambar &
// tautan, konten opsional kosong, editor CMS, data katalog (migrasi 051 + pratinjau + halaman katalog), dan konten aneh.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionEditor } from '../../pages/account/cms/SectionEditor';
import { validateContent } from '../../pages/account/cms/validation';
import { seo as catalogSeo, page as catalogPage } from '../../content/templates/lawatan';
import { content as catalogContent } from '../../content/templates/lawatan.content';
import { TEMPLATES, resolveContent } from '../index';
import { iconKey, stopIconKey } from '../lawatan/icons';
import {
  CREAM,
  CUSTOM_PACKAGE,
  FILM_TINTS,
  NBSP,
  PAGE_SECTIONS,
  UNSET,
  UNSURE_MONTH,
  chapterAt,
  chapterWindows,
  cleanText,
  dayPart,
  displayPhone,
  emptyPlan,
  estimateFormula,
  filmHasKm,
  filmPlayable,
  filmProgress,
  filmSize,
  filmTooShort,
  filterPackages,
  formatPriceShort,
  formatRupiah,
  galleryLayout,
  itineraryLines,
  kmAlong,
  kmAt,
  lawatanVars,
  messageMailHref,
  monthOptions,
  navItems,
  nextShown,
  packageColsHuge,
  packageColsWide,
  packageCount,
  packageMessage,
  packageMeta,
  parseCount,
  parsePrice,
  peopleOf,
  planEstimate,
  planMessage,
  readLawatan,
  readPackages,
  readStops,
  reelProgress,
  sectionItems,
  sectionNumber,
  sectionShown,
  sectionTarget,
  splitHyphenated,
  splitList,
  stampWordOf,
  steadyHeight,
  stopPosition,
  stopStamp,
  todayIso,
  tripTypes,
  validatePlan,
  withoutHonorific,
  type PlanForm,
} from '../lawatan/model';
import { LAWATAN_PHOTOS } from '../lawatan/photos';
import { WRAP } from '../lawatan/styles';
import { applySiteHead, siteTitle } from '../siteHead';
import { SiteRenderer } from '../SiteRenderer';
import { contrast, parseHex } from '../shared/utils';
import { isListField, type SiteContent } from '../types';

// Demo panjang + getByRole di jsdom: bisa lewat 5 dtk saat suite berjalan paralel
vi.setConfig({ testTimeout: 30_000 });

const ROOT = process.cwd();
const def = TEMPLATES.lawatan;
const ORDER = ['hero', 'packages', 'film', 'included', 'custom', 'testimonials', 'gallery', 'faq', 'contact'];
const sectionKeys = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-tpl-section]')).map((s) => s.getAttribute('data-tpl-section'));
const section = (root: HTMLElement, key: string) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`)!;
// Setup bersama (__tests__/setup.ts) memasang IntersectionObserver & matchMedia tiruan → demo() = gerak MENYALA (film
// bergerak, hook tanpa requestAnimationFrame jsdom tetap aman); still() = gerak mati (papan cerita, seperti reduced motion).
const demo = (content: unknown = null, preview = false) => render(<SiteRenderer templateCode="lawatan" content={content} preview={preview} />).container;
const still = (content: unknown = null) => render(<SiteRenderer templateCode="lawatan" content={content} motion={false} />).container;
const rgb = (hex: string) => parseHex(hex)!;
const publicFile = (url: string) => resolve(ROOT, 'public', url.replace(/^\//, ''));
const rootStyle = (container: HTMLElement, name: string) => {
  const holder = Array.from(container.querySelectorAll<HTMLElement>('[style]')).find((el) => el.style.getPropertyValue(name));
  return holder?.style.getPropertyValue(name) ?? '';
};
const urls = (src: string) => {
  const asset = LAWATAN_PHOTOS.asset(src)!;
  return [asset.src, ...asset.srcSet!.split(',').map((part) => part.trim().split(' ')[0])].filter((u, i, all) => all.indexOf(u) === i);
};
/** Spasi tak terputus → spasi biasa ("Rp1,15 jt" memakai NBSP agar tidak terbelah). */
const plain = (s: string | null | undefined) => (s ?? '').split(NBSP).join(' ');
const wait = (ms: number) => act(() => new Promise<void>((r) => setTimeout(r, ms)));
const decode = (a: Element) => decodeURIComponent(a.getAttribute('href') ?? '');
const WA = 'https://wa.me/6281234567890?text=';
const BRAND = 'Lawatan Tour & Travel';
const DEMO = resolveContent(def, null);
const PKGS = readPackages(DEMO.packages);
const TITLES = PKGS.map((p) => p.title);
const TYPES = ['Study tour', 'Gathering kantor', 'Keluarga', 'Ziarah'];
const MONTHS = monthOptions('2026-10-29', 12);
const plan = (patch: Partial<PlanForm> = {}): PlanForm => ({
  ...emptyPlan('Jogja Heritage 3H2M'),
  type: 'Study tour',
  people: '45',
  month: 'Desember 2026',
  hotel: 'Bintang 3',
  room: 'Sekamar 4 orang',
  ...patch,
});
const TSX = ['Lawatan', 'Header', 'Hero', 'Packages', 'Film', 'Included', 'Custom', 'Stories', 'Closing', 'Footer', 'ui', 'marks', 'scenes'];
const TS = ['index', 'styles', 'model', 'icons', 'hooks', 'schema', 'defaultContent', 'photos', 'paths'];
const source = () =>
  [
    ...TSX.map((f) => readFileSync(resolve(ROOT, `src/templates/lawatan/${f}.tsx`), 'utf8')),
    ...TS.map((f) => readFileSync(resolve(ROOT, `src/templates/lawatan/${f}.ts`), 'utf8')),
    readFileSync(resolve(ROOT, 'src/templates/lawatan/lawatan.css'), 'utf8'),
  ].join('\n');
const css = () => readFileSync(resolve(ROOT, 'src/templates/lawatan/lawatan.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

let scrolled: (string | null)[] = [];
beforeEach(() => {
  scrolled = [];
  Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
    scrolled.push(this.getAttribute('data-tpl-section'));
  });
});
afterEach(cleanup);

describe('Lawatan: skema & konten bawaan', () => {
  it('urutan form = urutan halaman, semua section bisa disembunyikan, field unik, teks berbatas, list berbatas', () => {
    expect(def.code).toBe('lawatan');
    expect(def.name).toBe('Lawatan');
    expect(def.features).toBeUndefined();
    expect(def.sections.map((s) => s.key)).toEqual(['brand', ...ORDER, 'footer']);
    expect([...PAGE_SECTIONS]).toEqual([...ORDER, 'footer']);
    const fields = (key: string) => def.sections.find((s) => s.key === key)!.fields.map((f) => f.key);
    expect(fields('brand')).toEqual(['company_name', 'tagline', 'logo', 'accent_color']);
    expect(def.sections[0].fields.find((f) => f.key === 'accent_color')?.type).toBe('color');
    expect(def.sections[0].toggleable).toBeFalsy();
    expect(fields('hero')).toEqual(['eyebrow', 'title', 'highlight', 'subtitle', 'image', 'image_caption', 'chips_label', 'button_label', 'link_label', 'header_label', 'header_url']);
    expect(fields('packages')).toEqual(['eyebrow', 'title', 'subtitle', 'trip_types', 'note', 'order_label', 'calc_label', 'empty_text', 'items']);
    expect(fields('film')).toEqual(['eyebrow', 'title', 'subtitle', 'stops']);
    expect(fields('included')).toEqual(['eyebrow', 'title', 'subtitle', 'excluded', 'items']);
    expect(fields('custom')).toEqual(['eyebrow', 'title', 'subtitle', 'custom_label', 'note', 'button_label']);
    expect(fields('testimonials')).toEqual(['eyebrow', 'title', 'subtitle', 'items']);
    expect(fields('gallery')).toEqual(['eyebrow', 'title', 'subtitle', 'items']);
    expect(fields('faq')).toEqual(['eyebrow', 'title', 'subtitle', 'link_label', 'link_url', 'items']);
    expect(fields('contact')).toEqual(['eyebrow', 'title', 'subtitle', 'address', 'maps_query', 'maps_url', 'phone', 'email', 'whatsapp', 'whatsapp_message', 'hours']);
    expect(fields('footer')).toEqual(['description', 'note', 'copyright', 'instagram', 'facebook', 'linkedin', 'youtube', 'tiktok']);
    const contact = def.sections.find((s) => s.key === 'contact')!;
    expect(contact.fields.find((f) => f.key === 'whatsapp')?.type).toBe('phone');
    expect(def.sections.find((s) => s.key === 'hero')!.fields.find((f) => f.key === 'image')?.type).toBe('image');
    const sub = (key: string, list: string) => {
      const f = def.sections.find((s) => s.key === key)!.fields.find((x) => x.key === list)!;
      return isListField(f) ? f.fields.map((x) => x.key) : [];
    };
    expect(sub('packages', 'items')).toEqual(['title', 'types', 'duration', 'min_people', 'transport', 'price', 'includes', 'itinerary', 'image']);
    expect(sub('film', 'stops')).toEqual(['name', 'day', 'time', 'km', 'text', 'image']);
    expect(sub('testimonials', 'items')).toEqual(['quote', 'name', 'role', 'city']);
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
          for (const x of f.fields) {
            expect(x.introduced, `${s.key}.${f.key}.${x.key}`).toBeUndefined();
            if (['text', 'textarea', 'phone', 'email'].includes(x.type)) expect(x.maxLength, `${s.key}.${f.key}.${x.key}`).toBeGreaterThan(0);
          }
        } else if (['text', 'textarea', 'phone', 'email'].includes(f.type)) {
          expect(f.maxLength, `${s.key}.${f.key}`).toBeGreaterThan(0);
        }
      }
    }
    // Batas list = batas yang dibaca model (sectionItems) = angka di halaman katalog (lawatan.content.ts)
    expect(max).toEqual({ 'packages.items': 9, 'film.stops': 6, 'included.items': 8, 'testimonials.items': 6, 'gallery.items': 8, 'faq.items': 8 });
    const many = (n: number, item: Record<string, string>) => Array.from({ length: n }, (_, i) => ({ ...item, title: `${item.title ?? ''}${i}`, name: `${item.name ?? ''}${i}` }));
    expect(sectionItems('packages', { items: many(12, { title: 'P' }) })).toHaveLength(9);
    expect(sectionItems('film', { stops: many(9, { name: 'T' }) })).toHaveLength(6);
    expect(sectionItems('included', { items: many(12, { title: 'U' }) })).toHaveLength(8);
    const page = JSON.stringify(catalogContent);
    expect(page).toContain('Hingga 9 kartu paket');
    expect(page).toContain('Hingga 6 titik perjalanan');
    expect(page).toContain('Hingga 8 ubin');
    expect(page).toContain('Hingga 8 foto');
    expect(page).toContain('Hingga 8 pertanyaan');
  });

  it('konten demo lolos validasi CMS, logo kosong, semua foto terdaftar, ada di public/, dipakai, dan beralt deskriptif', () => {
    const c = def.defaultContent;
    expect(validateContent(def, resolveContent(def, null))).toEqual({});
    expect(c.brand.logo).toBe('');
    expect(c.brand.company_name).toBe(BRAND);
    expect(c.brand.tagline).toBe('Paket wisata rombongan');
    expect(c.brand.accent_color).toBe('#277A36');
    expect(c.contact.whatsapp).toBe('081234567890');
    expect(c.contact.phone).toBe('081234567890');
    expect(c.contact.email).toBe('lawatan@example.com');
    expect(c.hero.image).toBe('/assets/templates/photos/lawatan-hero-1920.webp');
    for (const s of def.sections) if (s.key !== 'brand') expect(c[s.key].enabled, s.key).toBe(true);
    const photos = JSON.stringify(c).match(/\/assets\/templates\/photos\/[a-z0-9-]+\.webp/g) ?? [];
    for (const src of photos) expect(LAWATAN_PHOTOS.asset(src), src).not.toBeNull();
    // 19 kunci: hero 1 + paket 6 + kartu pos film 6 + galeri 6 — tidak ada foto yang tampil dua kali di halaman
    expect(LAWATAN_PHOTOS.keys).toHaveLength(19);
    for (const key of LAWATAN_PHOTOS.keys) {
      expect(key.startsWith('lawatan-'), key).toBe(true);
      for (const url of urls(LAWATAN_PHOTOS.src(key))) expect(existsSync(publicFile(url)), url).toBe(true);
      expect(photos, `${key} dipakai di konten demo`).toContain(LAWATAN_PHOTOS.src(key));
      expect(LAWATAN_PHOTOS.alt(LAWATAN_PHOTOS.src(key), '').split(' ').length, key).toBeGreaterThanOrEqual(5);
    }
    // Simbol bawaan juga tersedia sebagai SVG mandiri, path sama dengan komponen
    const mark = readFileSync(publicFile('/assets/templates/logos/lawatan-mark.svg'), 'utf8');
    const component = readFileSync(resolve(ROOT, 'src/templates/lawatan/marks.tsx'), 'utf8');
    const paths = mark.match(/ d="[^"]+"/g) ?? [];
    expect(paths).toHaveLength(2);
    for (const d of paths) expect(component, d).toContain(d.trim());
    expect(mark).toMatch(/viewBox="0 0 32 32"/);
    expect(mark).toMatch(/role="img"/);
    expect(mark).toMatch(/<title>/);
    expect(mark).toContain('fill-rule="evenodd"');
    expect(component).toContain('fillRule="evenodd"');
    // Bukan piktogram "gambar" (bingkai + gunung + matahari): perangko bergerigi berisi rute titik-titik + pin lokasi
    expect(paths[1]).toMatch(/A4\.1 4\.1 0 0 1 24\.5 12/);
    // Judul tab situs pembeli ≤ 60 huruf, deskripsi hero 120–140, eyebrow ≤ 60, judul hero ≤ 8 kata
    expect(`${c.brand.company_name} — ${c.brand.tagline}`.length).toBeLessThanOrEqual(60);
    expect(String(c.hero.subtitle).length).toBeGreaterThanOrEqual(120);
    expect(String(c.hero.subtitle).length).toBeLessThanOrEqual(140);
    expect(String(c.hero.eyebrow).length).toBeLessThanOrEqual(60);
    expect(String(c.hero.title).split(' ').length).toBeLessThanOrEqual(8);
    expect(String(c.hero.title)).toContain(String(c.hero.highlight));
    // Kepala section: H2 ≤ 8 kata, kalimat pengantar ≤ 110 huruf; kalimat kartu ≤ 120 (owner: "teks jangan keramaian")
    for (const key of ORDER.filter((k) => k !== 'hero')) {
      expect(String(c[key].title).split(' ').length, key).toBeLessThanOrEqual(8);
      if (c[key].subtitle) expect(String(c[key].subtitle).length, key).toBeLessThanOrEqual(110);
    }
    for (const s of c.film.stops as { text: string }[]) expect(s.text.length).toBeLessThanOrEqual(70);
    for (const t of c.included.items as { text: string }[]) expect(t.text.length).toBeLessThanOrEqual(60);
    for (const t of c.testimonials.items as { quote: string }[]) expect(t.quote.length).toBeLessThanOrEqual(120);
    // Angka di salinan = data: 6 paket, 4 jenis trip, 6 titik itinerary
    expect(c.packages.items as unknown[]).toHaveLength(6);
    expect(splitList(String(c.packages.trip_types))).toEqual(TYPES);
    expect(c.film.stops as unknown[]).toHaveLength(6);
  });

  // CREDITS.md gets this template's section at integration
  it('setiap kunci foto tercatat di CREDITS.md', () => {
    const credits = readFileSync(resolve(ROOT, 'public/assets/templates/photos/CREDITS.md'), 'utf8');
    expect(LAWATAN_PHOTOS.keys.filter((key) => !credits.includes(`\`${key}-*\``))).toEqual([]);
  });

  it('foto demo ringan: hero 800/1280/1920, WebP ≤ 140 KB per file (800w ≤ 90 KB), total ≤ 2,5 MB', () => {
    expect(LAWATAN_PHOTOS.asset(def.defaultContent.hero.image as string)!.srcSet).toBe(
      '/assets/templates/photos/lawatan-hero-800.webp 800w, /assets/templates/photos/lawatan-hero-1280.webp 1280w, /assets/templates/photos/lawatan-hero-1920.webp 1920w',
    );
    let total = 0;
    let files = 0;
    for (const key of LAWATAN_PHOTOS.keys) {
      for (const url of urls(LAWATAN_PHOTOS.src(key))) {
        expect(url, url).toMatch(/\.webp$/);
        const kb = statSync(publicFile(url)).size / 1024;
        expect(kb, url).toBeLessThanOrEqual(url.endsWith('-800.webp') ? 90 : 140);
        expect(readFileSync(publicFile(url)).toString('ascii', 8, 12), url).toBe('WEBP');
        total += kb;
        files += 1;
      }
    }
    expect(files).toBe(39);
    expect(total).toBeLessThanOrEqual(2500);
    // Ukuran sesuai tempat tampil: kartu paket & galeri lebar 1200, kartu pos film & ubin galeri kecil 960
    expect(LAWATAN_PHOTOS.src('lawatan-jogja')).toMatch(/-1200\.webp$/);
    for (const key of ['lawatan-berangkat', 'lawatan-rombongan-3', 'lawatan-rombongan-4', 'lawatan-rombongan-5', 'lawatan-rombongan-6', 'lawatan-rombongan-7']) {
      expect(LAWATAN_PHOTOS.src(key), key).toMatch(/-960\.webp$/);
    }
  });

  it('salinan demo jujur: tanpa klaim, tanpa merek/model bus, tanpa klaim izin/asuransi; hanya pesan WhatsApp, harga contoh', () => {
    const text = JSON.stringify(def.defaultContent);
    expect(text).not.toMatch(/dijamin|garansi|pasti|terbaik|nomor 1|#1|termurah|100%|paling aman|anti telat/i);
    expect(text).not.toMatch(/\b(Mercedes|Benz|Hino|Scania|Volvo|Toyota|Avanza|Innova|HiAce|Hiace|Elf|Alphard|Pajero|Isuzu|Hyundai|Jetbus|Adiputro|Laksana|MAN)\b/);
    expect(text).not.toMatch(/izin trayek|berizin|Kemenhub|Dishub|terdaftar resmi|ASITA|IPOMI|PAWIBA|uji KIR|\bISO\b|asuransi|Jasa Raharja|bersertifikat|sopir bersertifikat/i);
    expect(text).not.toMatch(/e-tiket|GPS|real-time|pembayaran online tersedia|bayar online/i);
    // "Tidak dilakukan" yang jujur
    expect(text).toContain('Website ini tidak memproses pembayaran online.');
    expect(text).toContain('Harga mulai per orang dan bisa berubah; kuota, hotel, dan jadwal dikonfirmasi admin lewat WhatsApp.');
    expect(text).toContain('Estimasi saja. Harga final, kuota hotel, dan jadwal dikonfirmasi admin lewat WhatsApp; tidak ada pembayaran online.');
    expect(text).toContain('Big bus 50 kursi atau medium bus 33 kursi (atau setara)');
    expect(text).toContain('Armada dicek sebelum berangkat');
    expect(text).toMatch(/Jam dan jarak perkiraan/);
    expect(text).toContain('@example.com');
    expect(text).not.toMatch(/@(gmail|yahoo)\./);
    // Pelanggan fiktif tanpa foto wajah (inisial)
    expect(JSON.stringify(def.defaultContent.testimonials)).not.toMatch(/\.webp/);
    // Teks yang benar-benar tampil di demo (termasuk label bawaan komponen, mis. pilihan "Rencana berangkat") juga bersih
    const shown = demo().textContent ?? '';
    expect(shown).not.toMatch(/dijamin|garansi|pasti|terbaik|nomor 1|#1|termurah|100%|paling aman|anti telat/i);
    expect(shown).not.toMatch(/izin trayek|berizin|terdaftar resmi|asuransi|bersertifikat/i);
  });
});

describe('Lawatan: helper model', () => {
  it('warna tema: hijau tua putih ≥ 10:1, krem 72% ≥ 4,5:1; teks aksen ≥ 4,5:1 di krem, putih & semua warna film; tidak valid → bawaan', () => {
    const white = rgb('#ffffff');
    expect(lawatanVars('#277A36')).toEqual({ '--lw-deep': '#194321', '--lw-ink': '#277a36' });
    const tints = Object.values(FILM_TINTS).map(rgb);
    for (const accent of ['#277A36', '#1D4ED8', '#A61E3A', '#B7791F', '#FACC15', '#C6F135', '#FFFFFF', '#000000', '#6EE7B7', '#7C3AED', '#12A07F', '#F4EFE4', '#FFB703', '#0050FF']) {
      const vars = lawatanVars(accent) as Record<string, string>;
      const deep = rgb(vars['--lw-deep']);
      const ink = rgb(vars['--lw-ink']);
      const creamOnDeep = CREAM.map((c, i) => Math.round(c * 0.72 + deep[i] * 0.28)) as [number, number, number];
      expect(contrast(deep, white), accent).toBeGreaterThanOrEqual(10);
      expect(contrast(deep, CREAM), accent).toBeGreaterThanOrEqual(9);
      expect(contrast(creamOnDeep, deep), accent).toBeGreaterThanOrEqual(4.5);
      expect(contrast(ink, CREAM), accent).toBeGreaterThanOrEqual(4.5);
      expect(contrast(ink, white), accent).toBeGreaterThanOrEqual(4.5);
      for (const tint of tints) expect(contrast(ink, tint), `${accent} di ${tint}`).toBeGreaterThanOrEqual(4.5);
    }
    expect(lawatanVars('zzz')).toEqual(lawatanVars('#277A36'));
    expect(lawatanVars('')).toEqual(lawatanVars('#277A36'));
    // Teks tinta & abu di semua warna film ≥ 4,5:1; warna film = CSS
    for (const tint of tints) {
      expect(contrast(rgb('#1D2320'), tint)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(rgb('#5A615C'), tint)).toBeGreaterThanOrEqual(4.5);
    }
    for (const [part, hex] of Object.entries(FILM_TINTS)) {
      expect(css(), part).toMatch(new RegExp(`\\.lw-film\\[data-daypart='${part}'\\] \\{\\s*background-color: ${hex.toLowerCase()};`));
    }
  });

  it('menu: label pendek = label section, section kosong/tersembunyi keluar dari menu; nomor label perangko mengikuti section tampil', () => {
    expect(navItems(DEMO).map((i) => `${i.key}:${i.label}`)).toEqual(['packages:Paket', 'film:Itinerary', 'included:Termasuk', 'testimonials:Testimoni', 'faq:FAQ', 'contact:Kontak']);
    const less = resolveContent(def, { packages: { items: [{ duration: 'tanpa nama' }] }, film: { enabled: false }, faq: { items: [] } });
    expect(navItems(less).map((i) => i.key)).toEqual(['included', 'testimonials', 'contact']);
    expect(['packages', 'film', 'included', 'custom', 'testimonials', 'gallery', 'faq', 'contact'].map((k) => sectionNumber(DEMO, k))).toEqual([
      '01',
      '02',
      '03',
      '04',
      '05',
      '06',
      '07',
      '08',
    ]);
    expect(sectionNumber(DEMO, 'hero')).toBe('');
    expect(sectionNumber(less, 'included')).toBe('01');
    expect(sectionNumber(less, 'contact')).toBe('05');
    expect(nextShown(DEMO, 'film')).toBe('included');
    expect(nextShown(resolveContent(def, { included: { enabled: false } }), 'film')).toBe('custom');
    expect(nextShown(DEMO, 'contact')).toBeNull();
    expect(nextShown(DEMO, 'tidak-ada')).toBeNull();
  });

  it('tujuan tautan: anchor Indonesia dan kunci section; anchor tak dikenal → null; tujuan tombol menu atas', () => {
    expect(sectionTarget('#paket')).toBe('packages');
    expect(sectionTarget('paket-wisata')).toBe('packages');
    expect(sectionTarget('#itinerary')).toBe('film');
    expect(sectionTarget('#jadwal')).toBe('film');
    expect(sectionTarget('#termasuk')).toBe('included');
    expect(sectionTarget('#hitung')).toBe('custom');
    expect(sectionTarget('#hitung-biaya')).toBe('custom');
    expect(sectionTarget('#konsultasi')).toBe('custom');
    expect(sectionTarget('#testimoni')).toBe('testimonials');
    expect(sectionTarget('#galeri')).toBe('gallery');
    expect(sectionTarget('#tanya-jawab')).toBe('faq');
    expect(sectionTarget('#kontak')).toBe('contact');
    expect(sectionTarget('#beranda')).toBe('hero');
    expect(sectionTarget('#tidak-ada')).toBeNull();
    const m = readLawatan(DEMO);
    expect(m.headerAction).toEqual({ kind: 'section', target: 'custom' });
    expect(m.headerLabel).toBe('Konsultasi Trip');
    expect(m.linkOr('#paket', null)).toEqual({ kind: 'section', target: 'packages' });
    expect(m.linkOr('#tidak-ada', m.consultAction)).toEqual({ kind: 'section', target: 'custom' });
    expect(m.linkOr('https://contoh.test/brosur', null)).toEqual({ kind: 'external', href: 'https://contoh.test/brosur' });
    expect(m.linkOr('javascript:alert(1)', null)).toBeNull();
    const noCustom = readLawatan(resolveContent(def, { custom: { enabled: false } }));
    expect(noCustom.headerAction).toEqual({ kind: 'section', target: 'contact' });
    expect(noCustom.linkOr('#hitung', null)).toBeNull();
    const onlyWa = readLawatan(resolveContent(def, { custom: { enabled: false }, contact: { enabled: false } }));
    expect(onlyWa.headerAction?.kind).toBe('external');
    const none = readLawatan(resolveContent(def, { custom: { enabled: false }, contact: { enabled: false, whatsapp: '' } }));
    expect(none.headerAction).toBeNull();
    expect(readLawatan(resolveContent(def, { hero: { header_url: '#paket' } })).headerAction).toEqual({ kind: 'section', target: 'packages' });
  });

  it('section tampil hanya bila berisi', () => {
    for (const key of ORDER) expect(sectionShown(DEMO, key), key).toBe(true);
    const empty = resolveContent(def, {
      packages: { items: [{ duration: 'tanpa nama', price: '875000' }] },
      film: { stops: [{ day: 'tanpa nama' }] },
      included: { items: [{ text: 'tanpa judul' }] },
      testimonials: { items: [{ name: 'tanpa kutipan' }] },
      gallery: { items: [{ caption: 'tanpa foto', image: '' }] },
      faq: { items: [{ answer: 'tanpa pertanyaan' }] },
    });
    for (const key of ['packages', 'film', 'included', 'testimonials', 'gallery', 'faq']) expect(sectionShown(empty, key), key).toBe(false);
    // Formulir hitung biaya & kontak tampil selama diaktifkan
    for (const key of ['custom', 'contact']) expect(sectionShown(empty, key), key).toBe(true);
    expect(sectionShown(resolveContent(def, { custom: { enabled: false } }), 'custom')).toBe(false);
    expect(sectionShown(DEMO, 'tidak-ada')).toBe(false);
    expect(sectionShown(DEMO, 'brand')).toBe(false);
  });

  it('harga: baca angka biasa / bersatuan, tulis perangko "Rp875rb" / "Rp1,15 jt" dan penuh "Rp875.000"', () => {
    expect(parsePrice('875000')).toBe(875_000);
    expect(parsePrice('Rp875.000')).toBe(875_000);
    expect(parsePrice('Rp 1.250.000,-')).toBe(1_250_000);
    expect(parsePrice('875 rb')).toBe(875_000);
    expect(parsePrice('750k')).toBe(750_000);
    expect(parsePrice('1,15 jt')).toBe(1_150_000);
    expect(parsePrice('2 juta')).toBe(2_000_000);
    expect(parsePrice('1.250 rb')).toBe(1_250_000);
    // Satuan di mana pun dalam teks (label isian sendiri berbunyi "Harga mulai per orang"); sen ",00" bukan digit
    expect(parsePrice('mulai 875 rb')).toBe(875_000);
    expect(parsePrice('875rb/orang')).toBe(875_000);
    expect(parsePrice('Rp 875 rb per orang')).toBe(875_000);
    expect(parsePrice('Rp1,5 juta/orang')).toBe(1_500_000);
    expect(parsePrice('Mulai Rp1,15 jt')).toBe(1_150_000);
    expect(parsePrice('Rp875.000,00')).toBe(875_000);
    expect(parsePrice(12345)).toBe(12345);
    expect(parsePrice('')).toBe(0);
    expect(parsePrice('Harga menyusul')).toBe(0);
    expect(parsePrice(null)).toBe(0);
    expect(parsePrice('9'.repeat(30))).toBe(999_999_999_999);
    expect(formatPriceShort(875_000)).toBe('Rp875rb');
    expect(formatPriceShort(725_000)).toBe('Rp725rb');
    expect(formatPriceShort(1_500)).toBe('Rp1,5rb');
    expect(formatPriceShort(1_150_000)).toBe(`Rp1,15${NBSP}jt`);
    expect(plain(formatPriceShort(2_450_000))).toBe('Rp2,45 jt');
    expect(plain(formatPriceShort(1_000_000))).toBe('Rp1 jt');
    expect(plain(formatPriceShort(12_500_000))).toBe('Rp12,5 jt');
    expect(formatPriceShort(999)).toBe('Rp999');
    expect(formatPriceShort(0)).toBe('');
    expect(formatPriceShort(-5)).toBe('');
    expect(formatPriceShort(Number.NaN)).toBe('');
    expect(formatRupiah(39_375_000)).toBe('Rp39.375.000');
    expect(formatRupiah(0)).toBe('Rp0');
    expect(parseCount('40')).toBe(40);
    expect(parseCount('40 orang')).toBe(40);
    expect(parseCount('')).toBe(0);
    expect(parseCount('banyak')).toBe(0);
  });

  it('paket: baca kartu, jenis trip (CMS atau dari paket), saringan tanpa beda huruf, jumlah hasil, baris meta, kolom layar lebar', () => {
    expect(TITLES).toEqual(['Jogja Heritage 3H2M', 'Bromo Sunrise 2H1M', 'Bali Classic 4H3M', 'Bandung Kawah Putih 3H2M', 'Dieng Plateau 2H1M', 'Lombok Religi & Pantai 4H3M']);
    expect(PKGS[0]).toEqual({
      index: 0,
      title: 'Jogja Heritage 3H2M',
      types: ['Study tour', 'Keluarga'],
      duration: '3 hari 2 malam',
      minPeople: 40,
      transport: 'Bus pariwisata',
      price: 875_000,
      includes: ['Hotel bintang 3', 'Makan 6×', 'Tiket masuk'],
      itinerary: ['Borobudur, check-in hotel, makan malam', 'Keraton, Taman Sari, Malioboro, Prambanan', 'Pusat oleh-oleh, perjalanan pulang'],
      image: '/assets/templates/photos/lawatan-jogja-1200.webp',
    });
    expect(PKGS.map((p) => p.price)).toEqual([875_000, 1_150_000, 1_650_000, 950_000, 725_000, 2_450_000]);
    expect(tripTypes(DEMO.packages, PKGS)).toEqual(TYPES);
    // Tanpa isian CMS: dari kolom jenis trip paket (urutan muncul)
    expect(tripTypes({ trip_types: '' }, PKGS)).toEqual(['Study tour', 'Keluarga', 'Gathering kantor', 'Ziarah']);
    expect(splitList('a, A, b; c|d\ne · f')).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    const names = (type: string) => filterPackages(PKGS, type).map((p) => p.title);
    expect(names('')).toEqual(TITLES);
    expect(names('study tour')).toEqual(['Jogja Heritage 3H2M', 'Bali Classic 4H3M', 'Bandung Kawah Putih 3H2M', 'Dieng Plateau 2H1M']);
    expect(names('Gathering kantor')).toEqual(['Bromo Sunrise 2H1M', 'Bali Classic 4H3M', 'Bandung Kawah Putih 3H2M']);
    expect(names('Keluarga')).toEqual(['Jogja Heritage 3H2M', 'Bromo Sunrise 2H1M', 'Bali Classic 4H3M', 'Dieng Plateau 2H1M', 'Lombok Religi & Pantai 4H3M']);
    expect(names('Ziarah')).toEqual(['Lombok Religi & Pantai 4H3M']);
    expect(names('Umrah')).toEqual([]);
    expect(PKGS.map((p) => p.title)).toEqual(TITLES);
    expect(packageCount(6)).toBe('6 paket');
    expect(packageCount(1)).toBe('1 paket');
    expect(packageCount(0)).toBe('Belum ada paket');
    expect(packageMeta(PKGS[0])).toEqual(['3 hari 2 malam', 'min. 40 orang', 'Bus pariwisata']);
    expect(packageMeta({ ...PKGS[0], minPeople: 0, transport: '' })).toEqual(['3 hari 2 malam']);
    expect(itineraryLines('Hari 1: Borobudur\nH2 - Malioboro\n\n  Prambanan  ')).toEqual(['Borobudur', 'Malioboro', 'Prambanan']);
    expect(itineraryLines(Array.from({ length: 9 }, (_, i) => `Baris ${i}`).join('\n'))).toHaveLength(7);
    // ≥ 1920px: 6 kartu tetap 3 kolom (3 + 3), 4/7/8 kartu 4 kolom
    expect([2, 3, 4, 5, 6, 7, 8, 9].map(packageColsWide)).toEqual([3, 3, 4, 3, 3, 4, 4, 3]);
    // ≥ 2400px: kartu tidak melebar ± 790px — 4–6 kartu satu baris, 7/8 kartu 4 kolom, 9 kartu 5 + 4
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9].map(packageColsHuge)).toEqual([4, 4, 4, 4, 5, 6, 4, 4, 5]);
  });

  it('pesan WhatsApp per paket: nama, harga mulai, tanpa harga/nama biro tetap sopan', () => {
    expect(packageMessage(PKGS[0], BRAND)).toBe(
      'Halo Lawatan Tour & Travel, kami ingin memesan paket Jogja Heritage 3H2M (mulai Rp875.000/orang). Mohon info jadwal dan penawarannya. Terima kasih.',
    );
    expect(packageMessage({ ...PKGS[1], price: 0 }, '')).toBe('Halo, kami ingin memesan paket Bromo Sunrise 2H1M. Mohon info jadwal dan penawarannya. Terima kasih.');
  });

  it('formulir hitung biaya: nilai awal, bulan berangkat dari "hari ini", peserta 1–500, estimasi = peserta × harga mulai', () => {
    expect(emptyPlan('Jogja Heritage 3H2M')).toEqual({
      pkg: 'Jogja Heritage 3H2M',
      type: '',
      people: '40',
      month: UNSURE_MONTH,
      hotel: UNSET,
      room: UNSET,
      note: '',
    });
    expect(emptyPlan().pkg).toBe(CUSTOM_PACKAGE);
    expect(MONTHS).toEqual([
      'November 2026',
      'Desember 2026',
      'Januari 2027',
      'Februari 2027',
      'Maret 2027',
      'April 2027',
      'Mei 2027',
      'Juni 2027',
      'Juli 2027',
      'Agustus 2027',
      'September 2027',
      'Oktober 2027',
    ]);
    expect(monthOptions('2026-12-05', 3)).toEqual(['Januari 2027', 'Februari 2027', 'Maret 2027']);
    expect(monthOptions('2026-10-29', 0)).toEqual([]);
    expect(todayIso(new Date(2026, 9, 29, 23, 59))).toBe('2026-10-29');
    expect(todayIso(new Date(2027, 0, 5))).toBe('2027-01-05');
    expect(['45', '1', '500', ' 45 ', '0', '501', '1000', '4.5', 'abc', ''].map(peopleOf)).toEqual([45, 1, 500, 45, 0, 0, 0, 0, 0, 0]);
    // Spec: "Perkiraan total Rp39.375.000 (45 × Rp875.000)"
    const e = planEstimate(PKGS[0], 45)!;
    expect(e).toEqual({ people: 45, unit: 875_000, total: 39_375_000 });
    expect(formatRupiah(e.total)).toBe('Rp39.375.000');
    expect(estimateFormula(e)).toBe('45 × Rp875.000');
    expect(planEstimate(PKGS[5], 25)!.total).toBe(61_250_000);
    expect(planEstimate(null, 45)).toBeNull();
    expect(planEstimate({ ...PKGS[0], price: 0 }, 45)).toBeNull();
    for (const n of [0, 501, 4.5, Number.NaN]) expect(planEstimate(PKGS[0], n), String(n)).toBeNull();
  });

  it('validasi formulir: per isian, paket dari daftar atau "Rancang sendiri", bulan dari 12 bulan ke depan, hotel & kamar dari daftar', () => {
    expect(validatePlan(plan(), TITLES, TYPES, MONTHS)).toEqual({});
    expect(validatePlan(emptyPlan('Jogja Heritage 3H2M'), TITLES, TYPES, MONTHS)).toEqual({ type: 'Pilih jenis trip.' });
    expect(validatePlan(plan({ pkg: 'Paket lain' }), TITLES, TYPES, MONTHS)).toEqual({ pkg: 'Pilih paket dari daftar.' });
    expect(validatePlan(plan({ pkg: CUSTOM_PACKAGE }), TITLES, TYPES, MONTHS)).toEqual({});
    expect(validatePlan(plan({ type: 'Umrah' }), TITLES, TYPES, MONTHS)).toEqual({ type: 'Pilih jenis trip.' });
    // Tanpa jenis trip di CMS → jenis trip tidak wajib
    expect(validatePlan(plan({ type: '' }), TITLES, [], MONTHS)).toEqual({});
    for (const people of ['', '0', '501', 'abc']) expect(validatePlan(plan({ people }), TITLES, TYPES, MONTHS).people, people).toBe('Isi jumlah peserta 1–500.');
    expect(validatePlan(plan({ month: 'Januari 2020' }), TITLES, TYPES, MONTHS)).toEqual({ month: 'Pilih rencana bulan berangkat.' });
    expect(validatePlan(plan({ month: UNSURE_MONTH }), TITLES, TYPES, MONTHS)).toEqual({});
    expect(validatePlan(plan({ hotel: 'Bintang 5' }), TITLES, TYPES, MONTHS)).toEqual({ hotel: 'Pilih hotel dari daftar.' });
    expect(validatePlan(plan({ room: 'Suite' }), TITLES, TYPES, MONTHS)).toEqual({ room: 'Pilih susunan kamar dari daftar.' });
    expect(validatePlan(plan({ hotel: UNSET, room: UNSET }), TITLES, TYPES, MONTHS)).toEqual({});
  });

  it('pesan WhatsApp konsultasi: salam, baris per isian (kosong tidak ikut), estimasi bertanda, catatan dibersihkan, penutup', () => {
    expect(planMessage(plan({ note: 'Ada 2 guru\u0000 pendamping.' }), planEstimate(PKGS[0], 45), BRAND)).toBe(
      [
        'Halo Lawatan Tour & Travel, kami ingin konsultasi paket wisata.',
        '',
        'Paket: Jogja Heritage 3H2M',
        'Jenis trip: Study tour',
        'Jumlah peserta: 45 orang',
        'Rencana berangkat: Desember 2026',
        'Hotel: Bintang 3',
        'Kamar: Sekamar 4 orang',
        'Perkiraan total: Rp39.375.000 (45 × Rp875.000, estimasi)',
        'Catatan: Ada 2 guru pendamping.',
        '',
        'Mohon info penawaran lengkapnya. Terima kasih.',
      ].join('\n'),
    );
    expect(planMessage(plan({ pkg: CUSTOM_PACKAGE, type: '', people: '30', month: UNSURE_MONTH, hotel: UNSET, room: UNSET }), null, '').split('\n')).toEqual([
      'Halo, kami ingin konsultasi paket wisata.',
      '',
      'Paket: Rancang sendiri',
      'Jenis trip: Belum ditentukan',
      'Jumlah peserta: 30 orang',
      'Rencana berangkat: Belum ditentukan',
      '',
      'Mohon info penawaran lengkapnya. Terima kasih.',
    ]);
    // Teks pilihan paket bebas dari CMS = teks di pesan (yang dilihat pengunjung)
    expect(planMessage(plan({ pkg: CUSTOM_PACKAGE }), null, BRAND, 'Trip custom').split('\n')[2]).toBe('Paket: Trip custom');
    expect(planMessage(plan({ pkg: CUSTOM_PACKAGE }), null, BRAND, '').split('\n')[2]).toBe('Paket: Rancang sendiri');
    expect(cleanText('a\u0000b\u0007  c', 10)).toBe('a b c');
    expect(cleanText('x'.repeat(500), 300)).toHaveLength(300);
    expect(messageMailHref('lawatan@example.com', 'Konsultasi paket wisata', 'Baris 1\nBaris 2')).toBe(
      'mailto:lawatan@example.com?subject=Konsultasi%20paket%20wisata&body=Baris%201%0ABaris%202',
    );
    expect(messageMailHref('bukan email', 'x', 'y')).toBe('');
  });

  it('film: titik dari CMS, kemajuan gulir (rumus kontrak), bab aktif, jendela bab, km berjalan, suasana waktu, ukuran panggung', () => {
    const stops = readStops(DEMO.film);
    expect(stops.map((s) => `${s.name}|${stopStamp(s)}|${s.km}`)).toEqual([
      'Sekolah|Hari 1 · 06.00|0',
      'Borobudur|Hari 1 · 09.30|105',
      'Hotel|Hari 1 · 15.00|148',
      'Malioboro|Hari 2 · 09.00|152',
      'Prambanan|Hari 2 · 15.30|170',
      'Pulang|Hari 3 · 16.00|290',
    ]);
    // Km kumulatif: titik ribuan Indonesia ("1.150" = 1150 km, bukan 1 km), desimal koma/titik dibulatkan
    expect(readStops({ stops: [{ name: 'A', km: '0' }, { name: 'B', km: '450' }, { name: 'C', km: '1.150' }, { name: 'D', km: '1.5' }] }).map((s) => s.km)).toEqual([0, 450, 1150, 2]);
    expect(filmPlayable(stops)).toBe(true);
    expect(filmPlayable(stops.slice(0, 1))).toBe(false);
    // p = clamp((viewTop − trackTop) / (trackHeight − viewHeight), 0, 1), 4 desimal
    expect(filmProgress(64, 64, 3344, 836)).toBe(0);
    expect(filmProgress(64, 64 - 1000, 3344, 836)).toBe(0.3987);
    expect(filmProgress(64, 64 - 2508, 3344, 836)).toBe(1);
    expect(filmProgress(64, -9999, 3344, 836)).toBe(1);
    expect(filmProgress(64, 900, 3344, 836)).toBe(0);
    expect(filmProgress(0, -100, 500, 800)).toBe(0);
    expect(filmProgress(Number.NaN, 0, 3344, 836)).toBe(0);
    expect([0, 1, 2, 5].map((i) => stopPosition(i, 6))).toEqual([0, 0.2, 0.4, 1]);
    expect(stopPosition(3, 1)).toBe(0);
    expect([0, 0.09, 0.1, 0.5, 0.79, 1, 1.5, -1, Number.NaN].map((p) => chapterAt(p, 6))).toEqual([0, 0, 1, 3, 4, 5, 5, 0, 0]);
    expect(chapterAt(0.5, 1)).toBe(0);
    expect(chapterWindows(6)).toEqual([
      { start: 0, end: 0.1 },
      { start: 0.1, end: 0.3 },
      { start: 0.3, end: 0.5 },
      { start: 0.5, end: 0.7 },
      { start: 0.7, end: 0.9 },
      { start: 0.9, end: 1 },
    ]);
    expect(chapterWindows(1)).toEqual([{ start: 0, end: 1 }]);
    expect(chapterWindows(0)).toEqual([]);
    expect(filmHasKm(stops)).toBe(true);
    expect(filmHasKm([...stops.slice(0, 2), { ...stops[2], km: null }])).toBe(false);
    expect([0, 0.2, 0.5, 0.9, 1].map((p) => kmAt(stops, p))).toEqual([0, 105, 150, 230, 290]);
    expect(kmAlong([0, 100], 0.25)).toBe(25);
    expect(kmAlong([5], 0.5)).toBe(0);
    expect(kmAlong([0, Number.NaN], 0.5)).toBe(0);
    expect(readStops({ stops: [{ name: 'A', km: '12,6' }, { name: 'B', km: 'jauh' }] }).map((s) => s.km)).toEqual([13, null]);
    expect(['06.00', '09.30', '10.00', '15.00', '17.59', '18.00', '03.00', '15:30', '', 'pagi'].map(dayPart)).toEqual([
      'pagi',
      'pagi',
      'siang',
      'sore',
      'sore',
      'malam',
      'malam',
      'sore',
      'siang',
      'siang',
    ]);
    // Panggung pendek (laptop 1366×768, zoom 125%) → kartu ringkas
    expect(filmSize(836, 1440)).toBe('regular');
    expect(filmSize(610, 1440)).toBe('regular');
    expect(filmSize(609, 1440)).toBe('compact');
    expect(filmSize(550, 1093)).toBe('compact');
    expect(filmSize(788, 390)).toBe('regular');
    expect(filmSize(546, 390)).toBe('regular');
    expect(filmSize(486, 390)).toBe('compact');
    // Panggung tidak muat → papan cerita: HP mendatar (844×390, 915×412, 740×360); laptop 1024×600 (bar demo 64px) dan
    // HP tegak 320×568 (bar 56px) tetap film
    expect([filmTooShort(390, 844), filmTooShort(412, 915), filmTooShort(360, 740)]).toEqual([true, true, true]);
    expect([filmTooShort(536, 1024), filmTooShort(512, 320), filmTooShort(788, 390), filmTooShort(836, 1440)]).toEqual([false, false, false, false]);
    expect(filmTooShort(519, 1024)).toBe(true);
    expect(filmTooShort(459, 390)).toBe(true);
    // Bilah alamat HP muncul/hilang (layar sentuh, lebar sama, < 160px) tidak mengubah tinggi film; diputar / mouse → baru
    expect(steadyHeight(788, 732, true, true)).toBe(732);
    expect(steadyHeight(732, 788, true, true)).toBe(788);
    expect(steadyHeight(390, 788, false, true)).toBe(390);
    expect(steadyHeight(500, 788, true, true)).toBe(500);
    expect(steadyHeight(788, 732, true, false)).toBe(788);
    expect(steadyHeight(732, 0, true, true)).toBe(732);
    // Rel kartu pos berjeda: diam di ¼ awal & ¼ akhir tiap bab, bergeser halus di tengah; pembulatan = chapterAt
    expect([0, 0.04, 0.05, 0.1, 0.15, 0.16, 0.2, 0.22, 0.3, 0.36, 1].map((p) => reelProgress(p, 6))).toEqual([0, 0, 0, 0.1, 0.2, 0.2, 0.2, 0.2, 0.3, 0.4, 1]);
    expect(reelProgress(0.1, 6)).toBe(0.1);
    expect(reelProgress(0.5, 1)).toBe(0);
    expect(reelProgress(Number.NaN, 6)).toBe(0);
    for (let k = 0; k <= 100; k += 1) expect(Math.round(reelProgress(k / 100, 6) * 5), String(k)).toBe(chapterAt(k / 100, 6));
  });

  it('teks kecil: nomor HP berkelompok, kata perangko footer tanpa PT/CV, galeri mosaik, ikon otomatis', () => {
    expect(displayPhone('081234567890')).toBe('0812-3456-7890');
    expect(displayPhone('(0274) 555-012')).toBe('(0274) 555-012');
    expect(displayPhone('')).toBe('');
    expect(stampWordOf(BRAND)).toBe('Lawatan');
    expect(stampWordOf('PT Jalan Bersama')).toBe('Jalan');
    expect(galleryLayout(8)).toEqual(['tall', 'wide', 'one', 'one', 'one', 'tall', 'wide', 'one']);
    expect(galleryLayout(6)).toEqual(['tall', 'wide', 'one', 'one', 'one', 'one']);
    expect(galleryLayout(5)).toEqual(['one', 'one', 'one', 'one', 'one']);
    expect(galleryLayout(0)).toEqual([]);
    // Testimoni: kata berstrip utuh (indeks ganjil), inisial tanpa sapaan
    expect(splitHyphenated('Itinerary Bromo-nya pas, tidak terburu-buru.')).toEqual(['Itinerary ', 'Bromo-nya', ' pas, tidak ', 'terburu-buru.', '']);
    expect(splitHyphenated('Tanpa strip')).toEqual(['Tanpa strip']);
    expect(['Pak Hendra', 'Bu Siti', 'bapak. Joko', 'Rina', 'Pak'].map(withoutHonorific)).toEqual(['Hendra', 'Siti', 'Joko', 'Rina', 'Pak']);
    expect((DEMO.included.items as { title: string }[]).map((i) => iconKey(i.title))).toEqual(['bus', 'hotel', 'food', 'ticket', 'guide', 'photo']);
    expect(['Jip 4×4', 'Homestay', 'Air mineral', 'Oleh-oleh', 'Sesuatu'].map(iconKey)).toEqual(['jeep', 'hotel', 'drink', 'shop', 'check']);
    expect(readStops(DEMO.film).map((s) => stopIconKey(s.name))).toEqual(['school', 'stupa', 'hotel', 'city', 'temple', 'home']);
    expect(['Pantai Kuta', 'Kawah Ijen', 'Tempat lain'].map(stopIconKey)).toEqual(['beach', 'mountain', 'pin']);
  });
});

describe('Lawatan: demo', () => {
  it('urutan section, satu H1, hero postcard: foto latar LCP (eager, srcset, sizes HP, ukuran, alt) tanpa reveal, panel kartu pos', () => {
    const container = demo();
    expect(sectionKeys(container)).toEqual([...ORDER, 'footer']);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const hero = section(container, 'hero');
    expect(hero.getAttribute('data-hero-layout')).toBe('postcard');
    expect(hero).not.toHaveAttribute('data-tpl-tone');
    expect(hero.querySelector('h1')!.textContent).toBe('Liburan rombongan, semua kami yang atur.');
    expect(hero.querySelector('h1 span')!.textContent).toBe('semua kami yang atur.');
    expect(hero.querySelector('h1 span')!.className).toContain('text-(--lw-ink)');
    expect(hero.textContent).toContain('Tour & travel · Yogyakarta');
    const img = hero.querySelector<HTMLImageElement>('img[fetchpriority="high"]')!;
    expect(img.getAttribute('src')).toBe('/assets/templates/photos/lawatan-hero-1920.webp');
    expect(img.getAttribute('srcset')).toContain(' 800w');
    expect(img.getAttribute('srcset')).toContain(' 1280w');
    // HP: foto 16:9 menutupi kotak tegak → tergambar ±1,9× lebar layar (tanpa ini HP memuat varian 800 yang buram)
    expect(img.getAttribute('sizes')).toBe('(max-width: 767px) 200vw, 100vw');
    expect(img.getAttribute('loading')).toBe('eager');
    expect(Number(img.getAttribute('width'))).toBe(1920);
    expect(Number(img.getAttribute('height'))).toBe(1080);
    expect(img.getAttribute('alt')!.split(' ').length).toBeGreaterThanOrEqual(5);
    // Foto = LATAR hero (absolute inset-0 di belakang panel), tidak pernah disembunyikan: tanpa Reveal, tanpa kelas gerak
    expect(img.closest('.tpl-reveal')).toBeNull();
    expect(img.className).not.toMatch(/tpl-photo|lw-|opacity|clip/);
    expect(img.parentElement!.className).toContain('absolute inset-0');
    expect(hero.querySelector('.lw-hero-scrim')).toHaveAttribute('aria-hidden', 'true');
    expect(hero.textContent).toContain('Bromo, Jawa Timur');
    // Rute + bus di langit dan perangko: dekoratif
    for (const svg of hero.querySelectorAll('svg')) expect(svg.closest('[aria-hidden="true"]') ?? svg.getAttribute('aria-hidden')).toBeTruthy();
    // Garis rute: HP/tablet, layar lebar (slice), dan ≥ 1920px versi landai yang selalu utuh ('meet', tidak terpotong)
    const routes = Array.from(hero.querySelectorAll('svg[preserveAspectRatio]'));
    expect(routes.map((s) => `${s.getAttribute('viewBox')}|${s.getAttribute('preserveAspectRatio')}`)).toEqual([
      '0 0 1920 600|xMidYMid meet',
      '0 0 1440 722|xMidYMid slice',
      '0 0 390 420|xMidYMid slice',
    ]);
    expect(routes[0].getAttribute('class')).toContain('@min-[120rem]:block');
    expect(routes[1].getAttribute('class')).toContain('@min-[120rem]:hidden');
    // Panel kartu pos 76% lebar wadah (maks. 920px): foto tetap terlihat di tablet mendatar 1024–1180px
    expect(hero.querySelector('h1')!.closest('[class*="@5xl:w-"]')!.className).toContain('@5xl:w-[min(76%,920px)]');
    // SATU perangko (bingkai garis dalam, pin tujuan, bus), tanpa cap pos dan tanpa piktogram gunung + matahari
    const stamp = hero.querySelector('svg[viewBox="0 0 80 96"]')!;
    expect(stamp.querySelector('rect')).not.toBeNull();
    expect(stamp.querySelectorAll('circle[r="9"]')).toHaveLength(0);
    expect(hero.querySelector('svg[viewBox="0 0 128 64"]')).toBeNull();
    const eager = Array.from(container.querySelectorAll('img')).filter((i) => i.getAttribute('loading') !== 'lazy');
    expect(eager.map((i) => i.getAttribute('src'))).toEqual(['/assets/templates/photos/lawatan-hero-1920.webp']);
    // Isi hero sesuai anggaran: ≤ 2 tombol/tautan, tanpa baris angka/badge
    expect(within(hero).getAllByRole('link').map((a) => a.textContent)).toEqual(['Lihat paket', 'Konsultasi dulu lewat WhatsApp']);
    expect(hero.querySelector('dl')).toBeNull();
    // HP (< @xl): tombol tampil SEBELUM chip (CSS order, urutan DOM = desktop: chip → tombol) agar ada di layar pertama
    const buttons = within(hero).getByRole('link', { name: 'Lihat paket' }).parentElement!;
    const chips = within(hero).getByRole('radiogroup', { name: 'Pilih jenis trip' }).parentElement!;
    expect(chips.compareDocumentPosition(buttons) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(buttons.className).toMatch(/(^| )order-1( |$)/);
    expect(chips.className).toMatch(/(^| )order-2( |$)/);
    expect(buttons.parentElement!.className).toContain('flex flex-col @xl:block');
    // H1 HP mengikuti lebar (32px di 390): "Liburan rombongan," satu baris → judul 3 baris
    expect(hero.querySelector('h1')!.className).toContain('text-[clamp(28px,8.2cqw,34px)]');
  });

  it('chip jenis trip di hero = saringan paket (satu keadaan); "Lihat paket" menggulir ke paket lalu fokus ke jumlah hasil', async () => {
    const container = demo();
    const hero = section(container, 'hero');
    const packages = section(container, 'packages');
    const group = within(hero).getByRole('radiogroup', { name: 'Pilih jenis trip' });
    expect(within(group).getAllByRole('radio').map((r) => (r.closest('label') as HTMLElement).textContent)).toEqual(TYPES);
    expect(within(group).getAllByRole('radio').every((r) => !(r as HTMLInputElement).checked)).toBe(true);
    const status = within(packages).getByRole('status');
    expect(status.textContent).toBe('6 paket');
    // role="status" sudah polite; aria-live eksplisit hanya untuk region keterangan pratinjau milik Shell (shell.test.tsx)
    expect(status).not.toHaveAttribute('aria-live');
    expect(packages.querySelector('ul[data-filtered]')).toHaveAttribute('data-filtered', 'false');
    fireEvent.click(within(group).getByLabelText('Ziarah'));
    expect(status.textContent).toBe('1 paket dari 6');
    expect(Array.from(packages.querySelectorAll('article h3')).map((h) => h.textContent)).toEqual(['Lombok Religi & Pantai 4H3M']);
    expect(packages.querySelector('ul[data-filtered]')).toHaveAttribute('data-filtered', 'true');
    const filter = within(packages).getByRole('radiogroup', { name: 'Saring paket menurut jenis trip' });
    expect((within(filter).getByLabelText('Ziarah') as HTMLInputElement).checked).toBe(true);
    // Saring dari paket → chip hero ikut
    fireEvent.click(within(filter).getByLabelText('Gathering kantor'));
    expect((within(group).getByLabelText('Gathering kantor') as HTMLInputElement).checked).toBe(true);
    expect(status.textContent).toBe('3 paket dari 6');
    const show = within(hero).getByRole('link', { name: 'Lihat paket' });
    expect(show).toHaveAttribute('href', '#packages');
    fireEvent.click(show);
    expect(scrolled).toEqual(['packages']);
    await wait(120);
    expect(within(packages).getByRole('status')).toHaveFocus();
    expect(within(packages).getByRole('status')).toHaveAttribute('tabindex', '-1');
    // "Semua paket" → kembali 6; tombolnya hilang, jadi fokus pindah ke jumlah hasil (tidak jatuh ke <body>)
    within(packages).getByRole('button', { name: 'Semua paket' }).focus();
    fireEvent.click(within(packages).getByRole('button', { name: 'Semua paket' }));
    expect(within(packages).getByRole('status').textContent).toBe('6 paket');
    expect((within(filter).getByLabelText('Semua') as HTMLInputElement).checked).toBe(true);
    expect(within(packages).queryByRole('button', { name: 'Semua paket' })).toBeNull();
    await wait(10);
    expect(document.activeElement).toBe(within(packages).getByRole('status'));
  });

  it('header krem bergaris airmail: menu ≤ 6 + "Konsultasi Trip"; menu HP buka/tutup, Esc menutup dan fokus kembali', () => {
    const container = demo();
    const header = container.querySelector('header')!;
    expect(header.className).toContain('sticky');
    expect(header.className).toContain('bg-[#FBF6EE]');
    expect(header.querySelector('.lw-airmail')).toHaveAttribute('aria-hidden', 'true');
    expect(header.querySelector('svg[viewBox="0 0 32 32"]'), 'LawatanMark').not.toBeNull();
    // Nama biro tidak dipotong "…" di HP 320px: 17px di bawah 352px, nama panjang turun ke baris kedua (maks. 2)
    const brand = Array.from(header.querySelectorAll('span')).find((s) => s.textContent === BRAND && s.children.length === 0)!;
    expect(brand.className).toContain('whitespace-normal!');
    expect(brand.className).toContain('line-clamp-2');
    expect(brand.className).toContain('@max-[22rem]:text-[17px]');
    const nav = within(header).getByRole('navigation', { name: 'Menu utama' });
    const links = Array.from(nav.querySelectorAll('a')).map((a) => `${a.textContent}${a.getAttribute('href')}`);
    expect(links).toEqual(['Paket#packages', 'Itinerary#film', 'Termasuk#included', 'Testimoni#testimoni', 'FAQ#faq', 'Kontak#kontak']);
    expect(links.length).toBeLessThanOrEqual(6);
    fireEvent.click(within(nav).getByRole('link', { name: 'Itinerary' }));
    expect(scrolled).toEqual(['film']);
    expect(within(header).getAllByRole('link', { name: 'Konsultasi Trip' })[0]).toHaveAttribute('href', '#custom');
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
    expect(within(panel).getAllByRole('link').map((a) => a.textContent)).toEqual(['Paket', 'Itinerary', 'Termasuk', 'Testimoni', 'FAQ', 'Kontak', 'Konsultasi Trip']);
    fireEvent.click(within(panel).getByRole('link', { name: 'FAQ' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(scrolled).toEqual(['film', 'faq']);
    fireEvent.click(toggle);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
    expect(within(header).getAllByRole('navigation', { name: 'Menu utama' })).toHaveLength(1);
  });

  it('kartu paket: perangko harga, jenis trip, meta, 3 chip termasuk, akordeon itinerary (ARIA), WhatsApp per paket; HP 3 kartu + "Lihat semua"', async () => {
    const container = demo();
    const packages = section(container, 'packages');
    const cards = () => Array.from(packages.querySelectorAll('article'));
    expect(cards()).toHaveLength(6);
    const first = cards()[0];
    expect(first.className).toContain('rounded-[18px]');
    expect(first.querySelector('.lw-perf')!.textContent).toBe('MulaiRp875rbper orang');
    expect(plain(cards()[1].querySelector('.lw-perf')!.textContent)).toBe('MulaiRp1,15 jtper orang');
    expect(first.textContent).toContain('Study tour · Keluarga');
    expect(first.querySelector('h3')!.textContent).toBe('Jogja Heritage 3H2M');
    expect(Array.from(first.querySelectorAll('ul')[0].querySelectorAll('li')).map((li) => li.textContent)).toEqual(['3 hari 2 malam', 'min. 40 orang', 'Bus pariwisata']);
    const included = within(first).getByRole('list', { name: 'Termasuk' });
    expect(Array.from(included.querySelectorAll('li')).map((li) => li.textContent)).toEqual(['Hotel bintang 3', 'Makan 6×', 'Tiket masuk']);
    // Buka-tutup itinerary (disclosure): nama aksesibel memuat nama paket (teks terlihat tetap "Lihat itinerary"), panel
    // tanpa role region (enam kartu tidak menambah enam landmark bernama sama)
    const toggle = within(first).getByRole('button', { name: /^Lihat itinerary/ });
    expect(toggle).toHaveAccessibleName('Lihat itinerary: Jogja Heritage 3H2M');
    expect(toggle.textContent).toBe('Lihat itinerary');
    expect(new Set(within(packages).getAllByRole('button', { name: /^Lihat itinerary/ }).map((b) => b.getAttribute('aria-label'))).size).toBe(6);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    const region = document.getElementById(toggle.getAttribute('aria-controls')!)!;
    expect(region).not.toHaveAttribute('role');
    expect(region).not.toHaveAttribute('aria-labelledby');
    expect(region).toHaveAttribute('inert');
    expect(Array.from(region.querySelectorAll('li')).map((li) => li.textContent)).toEqual([
      'Hari 1Borobudur, check-in hotel, makan malam',
      'Hari 2Keraton, Taman Sari, Malioboro, Prambanan',
      'Hari 3Pusat oleh-oleh, perjalanan pulang',
    ]);
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(region).toHaveAttribute('data-open', 'true');
    expect(region).not.toHaveAttribute('inert');
    // Pesan per paket → WhatsApp berisi nama & harga
    const order = within(first).getByRole('link', { name: 'Pesan paket: Jogja Heritage 3H2M (WhatsApp)' });
    expect(decode(order)).toBe(`${WA}${packageMessage(PKGS[0], BRAND)}`);
    expect(order).toHaveAttribute('target', '_blank');
    expect(within(first).getByRole('button', { name: 'Hitung biaya: Jogja Heritage 3H2M' })).toHaveAttribute('type', 'button');
    // Catatan jujur di bawah paket
    expect(packages.textContent).toContain('Harga mulai per orang dan bisa berubah');
    // HP: kartu 4-6 disembunyikan lewat container query; "Lihat semua 6 paket" → semua + fokus ke kartu ke-4
    const items = () => Array.from(packages.querySelectorAll<HTMLElement>('ul[data-filtered] > li'));
    expect(items().map((li) => li.className.includes('hidden @2xl:block'))).toEqual([false, false, false, true, true, true]);
    const more = within(packages).getByRole('button', { name: 'Lihat semua 6 paket' });
    expect(more.parentElement!.className).toContain('@2xl:hidden');
    fireEvent.click(more);
    expect(items().some((li) => li.className.includes('hidden'))).toBe(false);
    expect(within(packages).queryByRole('button', { name: /Lihat semua/ })).toBeNull();
    await wait(10);
    expect(items()[3]).toHaveFocus();
    // Kisi: 1 / 2 / 3 kolom; 6 kartu di layar ≥ 1920px tetap 3 kolom (3 + 3) berjarak 56px (kartu 560px), ≥ 2400px satu
    // baris 6 kolom
    const grid = packages.querySelector('ul[data-filtered]')!;
    expect(grid.className).toContain('@2xl:grid-cols-2');
    expect(grid.className).toContain('@5xl:grid-cols-3');
    expect(grid.className).not.toContain('grid-cols-4');
    expect(grid.className).toContain('@min-[120rem]:gap-x-14');
    expect(grid.className).toContain('@min-[150rem]:grid-cols-6');
    // Perangko harga: kualifikasi "Mulai" / "per orang" ≥ 11px (bagian salinan jujur)
    const stamp = first.querySelector('.lw-perf > span')!;
    expect(stamp.children[0].className).toContain('text-[11px]');
    expect(stamp.children[2].className).toContain('text-[11.5px]');
  });

  it('"Hitung biaya" di kartu mengisi paket + jenis trip ke formulir, menggulir ke sana, dan memindahkan fokus ke isian Paket', async () => {
    const container = demo();
    const packages = section(container, 'packages');
    const custom = section(container, 'custom');
    expect(within(custom).getByText('Rp35.000.000')).toBeInTheDocument();
    fireEvent.click(within(packages).getByRole('button', { name: 'Hitung biaya: Bromo Sunrise 2H1M' }));
    expect(scrolled).toEqual(['custom']);
    expect((within(custom).getByLabelText('Paket') as HTMLSelectElement).value).toBe('Bromo Sunrise 2H1M');
    const types = within(custom).getByRole('radiogroup', { name: 'Jenis trip' });
    expect((within(types).getByLabelText('Gathering kantor') as HTMLInputElement).checked).toBe(true);
    expect(within(custom).getByText('Rp46.000.000')).toBeInTheDocument();
    expect(custom.textContent).toContain('40 peserta × Rp1.150.000 per orang');
    // Tab berikutnya tetap di formulir yang sedang dilihat, bukan kembali ke kartu berikutnya ± 1.300px di atas
    await wait(100);
    expect(within(custom).getByLabelText('Paket')).toHaveFocus();
  });

  it('film tanpa gerak (reduced motion/pratinjau): papan cerita — tanpa trek tinggi, semua bab di <ol>, "Lewati animasi", adegan aria-hidden', async () => {
    const container = still();
    expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'off');
    const film = section(container, 'film');
    expect(film.querySelector('.lw-film-track')).toBeNull();
    expect(film.querySelector('[data-film-progress]')).toBeNull();
    expect(film.querySelector('.sticky')).toBeNull();
    expect(film.className).toContain('bg-[#FBF6EE]');
    expect(film.querySelector('h2')!.textContent).toBe('Tiga hari di Jogja dalam satu gulir');
    expect(film.textContent).toContain('Contoh study tour 3H2M dari Semarang. Jam dan jarak perkiraan; rute bisa disesuaikan.');
    const list = within(film).getByRole('list', { name: 'Itinerary per tempat' });
    expect(list.tagName).toBe('OL');
    const steps = Array.from(list.querySelectorAll(':scope > li'));
    expect(steps.map((li) => li.querySelector('h3')!.textContent)).toEqual(['Sekolah', 'Borobudur', 'Hotel', 'Malioboro', 'Prambanan', 'Pulang']);
    // Semua teks bab terlihat (tidak dipotong/disembunyikan), jam & km tertulis
    for (const li of steps) {
      const p = li.querySelector('article > div:last-child p:last-child')!;
      expect(p.className).not.toMatch(/sr-only|line-clamp|lw-card-text/);
    }
    expect(steps[0].textContent).toContain('Hari 1 · 06.00');
    expect(steps[0].textContent).toContain('Bus menjemput di sekolah; tour leader mengabsen peserta.');
    expect(steps[1].textContent).toContain('02 · 105 km');
    expect(steps.every((li) => !li.hasAttribute('aria-current'))).toBe(true);
    expect(list.className).toContain('@5xl:grid-cols-3');
    expect(list.className).toContain('@min-[120rem]:grid-cols-6');
    // Pita rute utuh (dekoratif): 6 titik, bus di tujuan
    const band = film.querySelector('.lw-poster > div')!;
    expect(band).toHaveAttribute('aria-hidden', 'true');
    expect(band.querySelectorAll('.lw-stop-label')).toHaveLength(6);
    expect(band.querySelector('.lw-bus-run svg')).not.toBeNull();
    for (const svg of film.querySelectorAll('svg')) expect(svg.closest('[aria-hidden="true"]') ?? svg.getAttribute('aria-hidden')).toBeTruthy();
    // Lewati animasi → gulir ke section berikutnya DAN fokus ke H2-nya (Tab/pembaca layar lanjut dari sana); pil terlihat
    // saat difokus punya tepi dalam 20px (not-sr-only menulis padding 0)
    const skip = within(film).getByRole('link', { name: 'Lewati animasi' });
    expect(skip).toHaveAttribute('href', '#included');
    expect(skip.className).toContain('sr-only');
    expect(skip.className).toContain('focus:not-sr-only');
    expect(skip.className.indexOf('focus:px-5')).toBeGreaterThan(skip.className.indexOf('focus:not-sr-only'));
    skip.focus();
    fireEvent.click(skip);
    expect(scrolled).toEqual(['included']);
    await wait(100);
    const nextHeading = section(container, 'included').querySelector('h2')!;
    expect(nextHeading).toHaveFocus();
    expect(nextHeading).toHaveAttribute('tabindex', '-1');
    expect(film.querySelectorAll('img')).toHaveLength(6);
    for (const img of film.querySelectorAll('img')) expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('film bergerak: trek + panggung lengket, bab aktif aria-current, hook memasang & melepas pendengar gulir/resize', async () => {
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
    // Properti tiruan dari setup bersama: writable (bukan configurable) → diganti dengan penugasan biasa
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
      const { container, unmount } = render(<SiteRenderer templateCode="lawatan" content={null} />);
      expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'on');
      const film = section(container, 'film');
      const track = film.querySelector<HTMLElement>('.lw-film-track')!;
      expect(track).not.toBeNull();
      const stage = track.querySelector<HTMLElement>('[data-film-progress]')!;
      expect(stage.className).toContain('lw-film-stage');
      // Kepala section (pola sama) DI ATAS trek; lewati animasi sebelum trek
      expect(film.querySelector('h2')!.compareDocumentPosition(track) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      const skip = within(film).getByRole('link', { name: 'Lewati animasi' });
      expect(skip).toHaveAttribute('href', '#included');
      expect(skip.compareDocumentPosition(track) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(film.className).toContain('lw-film');
      expect(film).toHaveAttribute('data-daypart', 'pagi');
      const reel = within(stage).getByRole('list', { name: 'Itinerary per tempat' });
      expect(reel.className).toContain('lw-reel');
      const cards = Array.from(reel.querySelectorAll(':scope > li'));
      expect(cards).toHaveLength(6);
      expect(cards.map((li) => li.getAttribute('aria-current'))).toEqual(['step', null, null, null, null, null]);
      expect(cards.map((li) => (li as HTMLElement).style.getPropertyValue('--i'))).toEqual(['0', '1', '2', '3', '4', '5']);
      expect(stage.style.getPropertyValue('--lw-n1')).toBe('5');
      // Kalimat kartu di rel tetap di DOM (dipotong 2 baris, panggung pendek: tersembunyi secara visual)
      expect(cards[0].querySelector('.lw-card-text')!.textContent).toBe('Bus menjemput di sekolah; tour leader mengabsen peserta.');
      // Penghitung & pita rute dekoratif (teks bab ada di kartu)
      expect(stage.querySelector('.lw-tick')!.closest('[aria-hidden="true"]')).not.toBeNull();
      expect(stage.textContent).toContain('Hari 1');
      for (const svg of film.querySelectorAll('svg')) expect(svg.closest('[aria-hidden="true"]') ?? svg.getAttribute('aria-hidden')).toBeTruthy();
      // Ukuran awal ditulis sebelum trek terlihat (rAF), panggung biasa; --p 4 desimal
      await wait(20);
      expect(track.style.getPropertyValue('--film-vh')).toBe(`${window.innerHeight}px`);
      expect(stage.getAttribute('data-size')).toBe('regular');
      expect(stage.style.getPropertyValue('--p')).toBe('0.0000');
      // Rel kartu pos berjeda (--q) ditulis di samping --p
      expect(stage.style.getPropertyValue('--q')).toBe('0.0000');
      // HP: rel tepat di bawah pita rute (bukan di tengah sisa tinggi)
      expect(reel.parentElement!.className).toContain('items-start');
      expect(reel.parentElement!.className).toContain('@3xl:items-center');
      expect(add.mock.calls.filter(([type]) => type === 'scroll')).toHaveLength(0);
      // Trek mendekati layar → pendengar gulir (passive + capture: gulir bingkai HP ikut) & resize
      const watcher = observers.find((o) => o.targets.includes(track))!;
      expect(watcher).toBeDefined();
      act(() => {
        watcher.callback([{ target: track, isIntersecting: true } as unknown as IntersectionObserverEntry], watcher as unknown as IntersectionObserver);
      });
      const scroll = add.mock.calls.find(([type]) => type === 'scroll')!;
      expect(scroll[2]).toEqual({ passive: true, capture: true });
      expect(add.mock.calls.filter(([type]) => type === 'resize').length).toBeGreaterThanOrEqual(2);
      // Menjauh dari layar → dilepas; mendekat lagi → dipasang lagi
      act(() => {
        watcher.callback([{ target: track, isIntersecting: false } as unknown as IntersectionObserverEntry], watcher as unknown as IntersectionObserver);
      });
      expect(remove.mock.calls.some(([type, fn, opts]) => type === 'scroll' && fn === scroll[1] && (opts as EventListenerOptions).capture === true)).toBe(true);
      act(() => {
        watcher.callback([{ target: track, isIntersecting: true } as unknown as IntersectionObserverEntry], watcher as unknown as IntersectionObserver);
      });
      const scrollAdds = add.mock.calls.filter(([type]) => type === 'scroll').length;
      expect(scrollAdds).toBe(2);
      unmount();
      const scrollRemoves = remove.mock.calls.filter(([type, fn]) => type === 'scroll' && fn === scroll[1]).length;
      expect(scrollRemoves).toBe(2);
      // Semua pendengar resize yang dipasang film dilepas lagi
      const resizeFns = add.mock.calls.filter(([type]) => type === 'resize').map(([, fn]) => fn);
      for (const fn of resizeFns) expect(remove.mock.calls.some(([type, f]) => type === 'resize' && f === fn)).toBe(true);
    } finally {
      add.mockRestore();
      remove.mockRestore();
      window.IntersectionObserver = OriginalIO;
      window.matchMedia = originalMatchMedia;
      window.requestAnimationFrame = originalRaf;
      window.cancelAnimationFrame = originalCaf;
    }
  });

  it('film: layar terlalu pendek untuk panggung (HP mendatar) → papan cerita; diputar kembali tegak → film bergerak', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'innerHeight');
    try {
      Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 390 });
      const container = demo();
      expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'on');
      const film = section(container, 'film');
      expect(film.querySelector('.lw-film-track')).toBeNull();
      expect(film.querySelector('[data-film-progress]')).toBeNull();
      expect(within(film).getByRole('list', { name: 'Itinerary per tempat' }).querySelectorAll(':scope > li')).toHaveLength(6);
      expect(within(film).getByRole('link', { name: 'Lewati animasi' })).toHaveAttribute('href', '#included');
      act(() => {
        Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 844 });
        window.dispatchEvent(new Event('resize'));
      });
      expect(section(container, 'film').querySelector('.lw-film-track')).not.toBeNull();
    } finally {
      if (original) Object.defineProperty(window, 'innerHeight', original);
    }
  });

  it('yang termasuk: 6 ubin perangko berikon otomatis + baris "Belum termasuk"', () => {
    const included = section(demo(), 'included');
    const tiles = Array.from(included.querySelectorAll('ul > li'));
    expect(tiles.map((li) => li.querySelector('h3')!.textContent)).toEqual(['Bus pariwisata', 'Hotel', 'Makan', 'Tiket masuk', 'Tour leader', 'Dokumentasi']);
    for (const li of tiles) expect(li.querySelector('span[aria-hidden] svg')).not.toBeNull();
    expect(included.querySelector('ul')!.className).toContain('@6xl:grid-cols-6');
    // Judul ubin selalu di dalam bingkai putus-putus (320px: "Dokumentasi" 14,7px dalam bingkai 12px; 6 kolom 1152–1279px: 17px)
    const title = tiles[5].querySelector('h3')!;
    expect(title.className).toContain('text-[clamp(14.5px,4.6cqw,18px)]');
    expect(title.className).toContain('break-words');
    expect(title.parentElement!.className).toContain('p-3 @sm:p-4');
    expect(included.textContent).toContain('Belum termasuk: pengeluaran pribadi, tips pemandu dan sopir, wahana tambahan.');
  });

  it('formulir hitung biaya: estimasi langsung, peserta −/+, galat + fokus, pesan WhatsApp apa adanya, ubah data', () => {
    const container = demo();
    const custom = section(container, 'custom');
    const form = within(custom).getByRole('form', { name: 'Hitung & rancang trip' });
    expect(form.getAttribute('action')).toBeNull();
    expect(form).toHaveAttribute('novalidate');
    const ticket = custom.querySelector<HTMLElement>('[data-tpl-tone="inverse"]')!;
    expect(ticket.className).toContain('bg-(--lw-deep)');
    expect(within(ticket).getByText('Rp35.000.000')).toBeInTheDocument();
    expect(ticket.textContent).toContain('40 peserta × Rp875.000 per orang');
    expect(ticket.querySelector('[aria-live="polite"]')!.textContent).toBe('Perkiraan total Rp35.000.000 untuk 40 × Rp875.000');
    expect(ticket.querySelector('[aria-live="polite"]')).not.toHaveAttribute('role');
    expect(ticket.textContent).toContain('Estimasi saja. Harga final, kuota hotel, dan jadwal dikonfirmasi admin lewat WhatsApp; tidak ada pembayaran online.');
    const pkg = within(form).getByLabelText('Paket') as HTMLSelectElement;
    expect(Array.from(pkg.options).map((o) => o.value)).toEqual([...TITLES, CUSTOM_PACKAGE]);
    const month = within(form).getByLabelText('Rencana berangkat') as HTMLSelectElement;
    expect(Array.from(month.options).map((o) => o.value)).toEqual([UNSURE_MONTH, ...monthOptions(todayIso(), 12)]);
    expect(Array.from((within(form).getByLabelText('Hotel') as HTMLSelectElement).options).map((o) => o.value)).toEqual([UNSET, 'Bintang 2', 'Bintang 3', 'Bintang 4']);
    expect(Array.from((within(form).getByLabelText('Kamar') as HTMLSelectElement).options).map((o) => o.value)).toEqual([UNSET, 'Sekamar 2 orang', 'Sekamar 3 orang', 'Sekamar 4 orang']);
    const people = within(form).getByLabelText('Jumlah peserta') as HTMLInputElement;
    expect(people.value).toBe('40');
    expect(people).toHaveAttribute('inputmode', 'numeric');
    fireEvent.click(within(form).getByRole('button', { name: 'Tambah peserta' }));
    expect(people.value).toBe('41');
    fireEvent.click(within(form).getByRole('button', { name: 'Kurangi peserta' }));
    fireEvent.click(within(form).getByRole('button', { name: 'Kurangi peserta' }));
    expect(people.value).toBe('39');
    // Di bawah minimal peserta paket → catatan dihitung ulang admin
    expect(ticket.textContent).toContain('Paket ini mulai 40 orang; harga untuk rombongan lebih kecil dihitung ulang admin.');
    fireEvent.change(people, { target: { value: '45a' } });
    expect(people.value).toBe('45');
    expect(within(ticket).getByText('Rp39.375.000')).toBeInTheDocument();
    // Rancang sendiri → tanpa angka
    fireEvent.change(pkg, { target: { value: CUSTOM_PACKAGE } });
    expect(ticket.textContent).toContain('Dihitung admin');
    expect(ticket.textContent).toContain('Harga rancangan sendiri dihitung admin setelah rute disepakati.');
    fireEvent.change(pkg, { target: { value: 'Jogja Heritage 3H2M' } });
    // Kirim tanpa jenis trip → galat, fokus ke pilihan pertama, grup ditandai invalid
    act(() => {
      fireEvent.submit(form);
    });
    const types = within(form).getByRole('radiogroup', { name: 'Jenis trip' });
    expect(types).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById(types.getAttribute('aria-describedby')!)!.textContent).toBe('Pilih jenis trip.');
    expect(within(types).getAllByRole('radio')[0]).toHaveFocus();
    fireEvent.click(within(types).getByLabelText('Study tour'));
    expect(types).not.toHaveAttribute('aria-invalid');
    fireEvent.change(people, { target: { value: '' } });
    act(() => {
      fireEvent.submit(form);
    });
    expect(people).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById(people.getAttribute('aria-describedby')!)!.textContent).toBe('Isi jumlah peserta 1–500.');
    expect(people).toHaveFocus();
    fireEvent.change(people, { target: { value: '45' } });
    fireEvent.change(month, { target: { value: month.options[2].value } });
    fireEvent.change(within(form).getByLabelText('Hotel'), { target: { value: 'Bintang 3' } });
    fireEvent.change(within(form).getByLabelText('Kamar'), { target: { value: 'Sekamar 4 orang' } });
    fireEvent.change(within(form).getByLabelText(/^Catatan/), { target: { value: 'Ada 2 guru pendamping.' } });
    const submit = within(form).getByRole('button', { name: 'Susun pesan WhatsApp' });
    expect(submit).toHaveAttribute('type', 'submit');
    act(() => {
      fireEvent.submit(form);
    });
    expect(within(custom).getByRole('heading', { level: 3, name: 'Pesan siap dikirim' })).toBeInTheDocument();
    const message = custom.querySelector('pre')!.textContent!;
    expect(message).toBe(
      planMessage(
        { pkg: 'Jogja Heritage 3H2M', type: 'Study tour', people: '45', month: month.options[2].value, hotel: 'Bintang 3', room: 'Sekamar 4 orang', note: 'Ada 2 guru pendamping.' },
        planEstimate(PKGS[0], 45),
        BRAND,
      ),
    );
    expect(message).toContain('Perkiraan total: Rp39.375.000 (45 × Rp875.000, estimasi)');
    expect(decode(within(custom).getByRole('link', { name: 'Buka WhatsApp' }))).toBe(`${WA}${message}`);
    fireEvent.click(within(custom).getByRole('button', { name: 'Ubah data' }));
    const again = within(custom).getByRole('form', { name: 'Hitung & rancang trip' });
    expect((within(again).getByLabelText('Jumlah peserta') as HTMLInputElement).value).toBe('45');
    expect((within(again).getByLabelText('Paket') as HTMLSelectElement).value).toBe('Jogja Heritage 3H2M');
  });

  it('pesan tersusun tidak pernah basi: isian berubah (formulir, chip hero, "Hitung biaya") → kembali ke ringkasan; susun ulang berisi data baru', () => {
    const container = demo();
    const custom = section(container, 'custom');
    const form = within(custom).getByRole('form', { name: 'Hitung & rancang trip' });
    const submit = () =>
      act(() => {
        fireEvent.submit(within(custom).getByRole('form', { name: 'Hitung & rancang trip' }));
      });
    fireEvent.click(within(within(form).getByRole('radiogroup', { name: 'Jenis trip' })).getByLabelText('Study tour'));
    submit();
    expect(custom.querySelector('pre')!.textContent).toContain('Jumlah peserta: 40 orang');
    expect(decode(within(custom).getByRole('link', { name: 'Buka WhatsApp' }))).toContain('Perkiraan total: Rp35.000.000');
    // Peserta diubah sesudah menyusun → pesan & tautan lama hilang, tombol susun kembali
    fireEvent.change(within(form).getByLabelText('Jumlah peserta'), { target: { value: '45' } });
    expect(custom.querySelector('pre')).toBeNull();
    expect(within(custom).queryByRole('link', { name: 'Buka WhatsApp' })).toBeNull();
    expect(within(custom).getByRole('button', { name: 'Susun pesan WhatsApp' })).toBeInTheDocument();
    submit();
    expect(custom.querySelector('pre')!.textContent).toContain('Jumlah peserta: 45 orang');
    expect(decode(within(custom).getByRole('link', { name: 'Buka WhatsApp' }))).toContain('Perkiraan total: Rp39.375.000');
    // "Hitung biaya" di kartu lain → pesan lama hilang
    fireEvent.click(within(section(container, 'packages')).getByRole('button', { name: 'Hitung biaya: Bromo Sunrise 2H1M' }));
    expect(custom.querySelector('pre')).toBeNull();
    submit();
    expect(custom.querySelector('pre')!.textContent).toContain('Paket: Bromo Sunrise 2H1M');
    // Chip jenis trip di hero → pesan lama hilang
    fireEvent.click(within(within(section(container, 'hero')).getByRole('radiogroup', { name: 'Pilih jenis trip' })).getByLabelText('Keluarga'));
    expect(custom.querySelector('pre')).toBeNull();
    submit();
    expect(custom.querySelector('pre')!.textContent).toContain('Jenis trip: Keluarga');
  });

  it('peserta −/+ dari angka yang diketik: di luar 1–500 dijepit (600 → 500), kosong → 1', () => {
    const form = within(section(demo(), 'custom')).getByRole('form', { name: 'Hitung & rancang trip' });
    const people = within(form).getByLabelText('Jumlah peserta') as HTMLInputElement;
    const plus = within(form).getByRole('button', { name: 'Tambah peserta' });
    const minus = within(form).getByRole('button', { name: 'Kurangi peserta' });
    fireEvent.change(people, { target: { value: '600' } });
    fireEvent.click(plus);
    expect(people.value).toBe('500');
    fireEvent.change(people, { target: { value: '600' } });
    fireEvent.click(minus);
    expect(people.value).toBe('500');
    fireEvent.click(minus);
    expect(people.value).toBe('499');
    fireEvent.change(people, { target: { value: '' } });
    fireEvent.click(plus);
    expect(people.value).toBe('1');
    fireEvent.change(people, { target: { value: '' } });
    fireEvent.click(minus);
    expect(people.value).toBe('1');
    fireEvent.click(minus);
    expect(people.value).toBe('1');
  });

  it('testimoni kartu pos miring (inisial, perangko kota hiasan), galeri mosaik selebar layar di pita tinta', () => {
    const container = demo();
    const testimonials = section(container, 'testimonials');
    const figures = Array.from(testimonials.querySelectorAll('figure'));
    expect(figures).toHaveLength(3);
    expect(testimonials.querySelector('img')).toBeNull();
    expect(figures.map((f) => f.style.getPropertyValue('--lw-tilt'))).toEqual(['-1.5deg', '1deg', '-0.5deg']);
    expect(figures.every((f) => f.className.includes('lw-tilt'))).toBe(true);
    // Inisial tanpa sapaan (Pak/Bu), seragam dengan "RI"
    expect(Array.from(testimonials.querySelectorAll('figcaption')).map((f) => f.textContent)).toEqual([
      'RIRinaPanitia study tour · Kudus',
      'HEPak HendraGathering kantor · Surabaya',
      'SIBu SitiRombongan keluarga · Magelang',
    ]);
    // Kepala section berpola sama (label, H2, kalimat pengantar)
    expect(testimonials.querySelector('h2')!.textContent).toBe('Kartu pos dari rombongan');
    expect(testimonials.textContent).toContain('Panitia sekolah, kantor, dan keluarga yang sudah berangkat bersama kami.');
    // Perangko kota MENGAPUNG di dalam kutipan (teks mengalir di sampingnya; kota panjang tidak menutupi kutipan)
    const cityStamp = figures[0].querySelector('.lw-perf')!;
    expect(cityStamp).toHaveAttribute('aria-hidden', 'true');
    expect(cityStamp.parentElement!.tagName).toBe('BLOCKQUOTE');
    expect(cityStamp.className).toContain('float-right');
    expect(cityStamp.className).not.toMatch(/\babsolute\b/);
    expect(figures[0].querySelector('blockquote')!.className).not.toContain('pr-24');
    expect(cityStamp.firstElementChild!.firstElementChild!.textContent).toBe('Dari');
    expect(cityStamp.firstElementChild!.firstElementChild!.className).toContain('text-[10.5px]');
    // Kata berstrip tidak terbelah di akhir baris
    expect(Array.from(figures[1].querySelectorAll('blockquote .whitespace-nowrap')).map((s) => s.textContent)).toEqual(['Bromo-nya', 'terburu-buru.']);
    expect(figures[1].querySelector('blockquote > span:not([aria-hidden])')!.textContent).toBe(
      'Itinerary Bromo-nya pas, tidak terburu-buru. Busnya bersih, sopirnya sabar.',
    );
    // Tablet (2 kolom): kartu ke-3 di tengah, bukan sendirian di kiri
    const lis = Array.from(testimonials.querySelectorAll('ul > li'));
    expect(lis[2].className).toContain('@3xl:col-span-2');
    expect(lis[2].className).toContain('@5xl:col-span-1');
    expect(lis[0].className).not.toContain('col-span');
    const gallery = section(container, 'gallery');
    expect(gallery).toHaveAttribute('data-tpl-tone', 'inverse');
    const tiles = Array.from(gallery.querySelectorAll('ul > li'));
    expect(tiles).toHaveLength(6);
    // 6 foto = mosaik 4 kolom tanpa lubang (HP 2 kolom)
    expect(tiles.map((li) => (li.className.match(/(row|col)-span-2/) ?? [''])[0])).toEqual(['row-span-2', 'col-span-2', '', '', '', '']);
    expect(gallery.querySelector('ul')!.className).toContain('grid-cols-2 @5xl:grid-cols-4');
    expect(gallery.querySelector('h2')!.textContent).toBe('Album perjalanan rombongan');
    expect(Array.from(gallery.querySelectorAll('figcaption')).map((f) => f.textContent)).toEqual([
      'Menyeberang ke pulau',
      'Pagi di tepi pantai',
      'Rehat menatap laut',
      'Foto bersama di lautan pasir',
      'Santai di puncak bukit',
      'Menanti matahari terbit',
    ]);
    // Album tidak mengulang foto kartu paket, foto film, atau foto hero: tidak ada foto yang tampil dua kali di halaman
    const filmPhotos = (DEMO.film.stops as { image: string }[]).map((s) => s.image);
    const packagePhotos = (DEMO.packages.items as { image: string }[]).map((p) => p.image);
    for (const img of gallery.querySelectorAll('img')) {
      expect(filmPhotos, img.getAttribute('src') ?? '').not.toContain(img.getAttribute('src'));
      expect(packagePhotos, img.getAttribute('src') ?? '').not.toContain(img.getAttribute('src'));
      expect(img.getAttribute('src')).not.toContain('hero');
    }
    const shown = Array.from(container.querySelectorAll('img')).map((img) => img.getAttribute('src'));
    expect(new Set(shown).size).toBe(shown.length);
    // Mosaik selebar layar: tidak di dalam WRAP
    expect(gallery.querySelector('ul')!.closest('.px-5')).toBeNull();
  });

  it('akordeon tanya jawab: aria-expanded/aria-controls, panel role=region (inert saat tertutup), satu terbuka, tautan WhatsApp', () => {
    const faq = section(demo(), 'faq');
    const buttons = within(faq).getAllByRole('button');
    expect(buttons).toHaveLength(5);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'true');
    expect(buttons[0].closest('h3')).not.toBeNull();
    const region = document.getElementById(buttons[0].getAttribute('aria-controls')!)!;
    expect(region).toHaveAttribute('role', 'region');
    expect(region).toHaveAttribute('aria-labelledby', buttons[0].id);
    expect(region).toHaveAttribute('data-open', 'true');
    expect(region).not.toHaveAttribute('inert');
    fireEvent.click(buttons[3]);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'false');
    expect(buttons[3]).toHaveAttribute('aria-expanded', 'true');
    expect(region).toHaveAttribute('inert');
    fireEvent.click(buttons[3]);
    expect(buttons.every((b) => b.getAttribute('aria-expanded') === 'false')).toBe(true);
    expect(decode(within(faq).getByRole('link', { name: /Kirim pertanyaan lewat WhatsApp/ }))).toBe(`${WA}Halo ${BRAND}, saya ingin bertanya tentang paket wisata rombongan.`);
    // Salinan penutup sendiri (bukan rumus "Sebelum Anda …" yang dipakai template satu batch)
    expect(faq.querySelector('h2')!.textContent).toBe('Yang biasa ditanyakan panitia');
    expect(faq.textContent).toContain('Jawaban singkat soal peserta, harga, dan pembayaran.');
    expect(faq.textContent).toContain('Website ini tidak memproses pembayaran online.');
  });

  it('kontak: baris bertautan (≥ 44px), peta berbingkai kartu pos; footer hijau tua: perangko, menu, kontak, media sosial', () => {
    const container = demo();
    const contact = section(container, 'contact');
    expect(contact.querySelector('h2')!.textContent).toBe('Singgah ke kantor kami di Kotagede');
    expect(Array.from(contact.querySelectorAll('dt')).map((dt) => dt.textContent)).toEqual(['Alamat', 'Jam buka', 'Telepon', 'WhatsApp', 'Email']);
    expect(within(contact).getAllByRole('link', { name: '0812-3456-7890' }).map((a) => a.getAttribute('href'))).toEqual([
      'tel:+6281234567890',
      expect.stringMatching(/^https:\/\/wa\.me\/6281234567890\?text=/),
    ]);
    for (const link of within(contact).getAllByRole('link', { name: /0812-3456-7890|lawatan@example\.com/ })) {
      expect(link.className).toContain('py-3.5');
      expect(link.className).toContain('-my-3.5');
    }
    expect(within(contact).getByRole('link', { name: 'lawatan@example.com' })).toHaveAttribute('href', 'mailto:lawatan@example.com');
    expect(contact.querySelector('iframe')!.getAttribute('title')).toBe(`Peta lokasi ${BRAND}`);
    expect(within(contact).getByRole('link', { name: 'Buka di Google Maps' }).getAttribute('href')).toMatch(/^https:\/\/(www\.)?google\.com\/maps/);
    // Nama tautan unik: "Chat WhatsApp" hanya tombol melayang Shell
    expect(within(container).getAllByRole('link', { name: 'Chat WhatsApp' })).toHaveLength(1);
    expect(Array.from(container.querySelectorAll('[data-tpl-section][data-tpl-tone="inverse"]')).map((el) => el.getAttribute('data-tpl-section'))).toEqual(['gallery', 'footer']);
    const footer = container.querySelector('footer')!;
    expect(footer.getAttribute('data-tpl-section')).toBe('footer');
    expect(footer.className).toContain('bg-(--lw-deep)');
    expect(footer.querySelector('.lw-airmail')).toHaveAttribute('aria-hidden', 'true');
    expect(footer.textContent).toContain(`© ${new Date().getFullYear()} ${BRAND}`);
    expect(footer.textContent).toContain('Harga paket contoh dan bisa berubah');
    expect(footer.querySelector('.lw-perf-lg')!.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(footer.querySelector('.lw-perf-lg')!.textContent).toBe('Lawatan');
    // Perangko besar berisi rute + pin saja (tanpa bingkai perangko simbol: bukan perangko di dalam perangko)
    const bigMark = footer.querySelector('.lw-perf-lg svg')!;
    expect(bigMark.getAttribute('viewBox')).toBe('6.2 6.2 19.6 19.6');
    expect(bigMark.querySelectorAll('path')).toHaveLength(1);
    expect(footer.querySelector('a svg[viewBox="0 0 32 32"]')!.querySelectorAll('path')).toHaveLength(2);
    expect(Array.from(within(footer).getByRole('navigation', { name: 'Tautan footer' }).querySelectorAll('a')).map((a) => a.getAttribute('href'))).toEqual([
      '#packages',
      '#film',
      '#included',
      '#testimoni',
      '#faq',
      '#kontak',
    ]);
    for (const link of footer.querySelectorAll('a')) expect(link.className, link.textContent ?? '').toContain('min-h-11');
    expect(within(footer).getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://instagram.com/lawatan.contoh');
    expect(within(footer).getByRole('link', { name: 'YouTube' })).toHaveAttribute('href', 'https://youtube.com/@lawatan.contoh');
    expect(within(footer).getByRole('link', { name: 'TikTok' })).toHaveAttribute('href', 'https://tiktok.com/@lawatan.contoh');
    expect(within(footer).queryByRole('link', { name: 'Facebook' })).toBeNull();
    expect(within(footer).queryByRole('link', { name: 'LinkedIn' })).toBeNull();
  });

  it('wadah PENUH: tanpa CONTAINER/max-w-[1680px]; header, setiap section, dan footer memakai WRAP tanpa max-w/mx-auto', () => {
    expect(WRAP).toBe('w-full px-5 @2xl:px-8 @5xl:px-12 @min-[96rem]:px-16');
    const code = source();
    expect(code).not.toContain('max-w-[1680px]');
    expect(code).not.toMatch(/\bCONTAINER\b/);
    const container = demo();
    expect(container.querySelector('[class*="max-w-[1680px]"]')).toBeNull();
    const cls = (el: Element) => el.getAttribute('class') ?? '';
    const wraps = (root: Element) => Array.from(root.querySelectorAll('[class]')).filter((el) => cls(el).includes(WRAP));
    expect(wraps(container.querySelector('header')!).length).toBeGreaterThan(0);
    for (const key of [...ORDER, 'footer']) expect(wraps(section(container, key)).length, key).toBeGreaterThan(0);
    for (const el of wraps(container)) expect(cls(el), cls(el)).not.toMatch(/\bmax-w-|\bmx-auto\b/);
    // Pita film, rel kartu pos, dan mosaik galeri selebar layar (tanpa WRAP)
    expect(section(container, 'film').querySelector('.lw-film-stage')!.closest('.px-5')).toBeNull();
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
    // ≤ 4 lapisan will-change
    expect((css().match(/will-change/g) ?? []).length).toBeLessThanOrEqual(4);
  });
});

describe('Lawatan: gerak', () => {
  it('pratinjau CMS diam, tanpa tautan wa.me terbuka, film = papan cerita', () => {
    const { container } = render(<def.Component content={resolveContent(def, null)} preview />);
    expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'off');
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    expect(container.querySelector('a[href^="javascript:"], a[href^="vbscript:"]')).toBeNull();
    expect(container.querySelector('[data-hero-layout="postcard"] img[fetchpriority="high"]')).not.toBeNull();
    expect(container.querySelector('.lw-film-track')).toBeNull();
    expect(within(container).getByRole('list', { name: 'Itinerary per tempat' }).querySelectorAll(':scope > li')).toHaveLength(6);
  });

  it('lawatan.css: animasi & film bergerbang [data-tpl-motion=\'on\'], blok reduced-motion & cetak, kelas lw-, durasi pendek', () => {
    const text = css();
    expect(text).toContain('@layer components');
    expect(text).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(text).toMatch(/@media print/);
    for (const rule of text.match(/^\s*[^@\s{}][^{}]*\{[^}]*\b(transition|animation):[^}]*\}/gm) ?? []) {
      const selector = rule.split('{')[0];
      if (/transition:\s*none|animation:\s*none/.test(rule)) continue;
      expect(selector, rule).toContain("[data-tpl-motion='on']");
    }
    // Lengket & gulir hanya saat gerak menyala
    for (const rule of text.match(/^\s*[^@\s{}][^{}]*\{[^}]*(position: sticky|var\(--p|--film-vh[^)]*\) \* [34])[^}]*\}/gm) ?? []) {
      expect(rule.split('{')[0], rule).toContain("[data-tpl-motion='on']");
    }
    expect(text).toMatch(/\[data-tpl-motion='on'\] \.lw-film-track \{\s*height: calc\(var\(--film-vh, 100svh\) \* 4\);/);
    expect(text).toMatch(/\[data-tpl-motion='on'\] \.lw-film-track \{\s*height: calc\(var\(--film-vh, 100svh\) \* 3\);/);
    expect(text).toMatch(/\[data-tpl-motion='on'\] \.lw-film-stage \{\s*position: sticky;\s*top: var\(--tpl-sticky-top, 0px\);\s*height: var\(--film-vh, 100svh\);/);
    // Kartu pos: maks. 440px, layar sangat lebar (wadah ≥ 2240px) 680px — rumus tinggi yang sama menjaga semuanya muat
    expect(text).toMatch(/--lw-card-w: clamp\(200px, min\(62cqw, calc\(\(var\(--film-vh, 100svh\) - 445px\) \* 1\.333\)\), 440px\);/);
    expect(text).toMatch(
      /@container \(min-width: 2240px\) \{\s*\[data-tpl-motion='on'\] \.lw-film-stage:not\(\[data-size='compact'\]\) \{\s*--lw-card-w: clamp\(200px, min\(62cqw, calc\(\(var\(--film-vh, 100svh\) - 445px\) \* 1\.333\)\), 680px\);/,
    );
    // Rel kartu pos digerakkan --q (berjeda di tiap titik), cadangan --p; kartu (--d) ikut --q
    expect(text).toMatch(/\[data-tpl-motion='on'\] \.lw-reel \{[^}]*transform: translate3d\(calc\(var\(--q, var\(--p, 0\)\) \* -1 \* var\(--reel-shift, 0px\)\), 0, 0\);/);
    expect(text).toMatch(/\[data-tpl-motion='on'\] \.lw-reel-card \{\s*--d: calc\(var\(--q, var\(--p, 0\)\) \* var\(--lw-n1, 1\) - var\(--i, 0\)\);/);
    // Bus, garis tempuh, bukit tetap mengikuti --p
    expect(text).toMatch(/\.lw-bus-run \{\s*transform: translate3d\(calc\(var\(--p, 0\) \* 100%\), 0, 0\);/);
    for (const cls of text.match(/\.[a-z][\w-]*/g) ?? []) if (!/^\.(tpl-)/.test(cls)) expect(cls, cls).toMatch(/^\.lw-/);
    expect(text).not.toMatch(/infinite|box-shadow|text-shadow|drop-shadow/);
    // Durasi: perangko ≤ 600 ms, kartu 250 ms, penghitung ≤ 320 ms, transisi UI ≤ 1 dtk
    for (const [, name, value, unit] of text.matchAll(/animation:\s*lw-([a-z]+)\s+([\d.]+)(m?s)/g)) {
      const ms = Number(value) * (unit === 's' ? 1000 : 1);
      expect(ms, name).toBeLessThanOrEqual(name === 'stamp' ? 600 : 320);
    }
    for (const [, value, unit] of text.matchAll(/transition:[^;]*?\s([\d.]+)(m?s)/g)) expect(Number(value) * (unit === 's' ? 1000 : 1)).toBeLessThanOrEqual(1000);
    // Cetak: film jadi papan cerita
    const print = text.slice(text.indexOf('@media print'));
    expect(print).toMatch(/\.lw-film-track \{\s*height: auto;/);
    expect(print).toMatch(/\.lw-film-stage \{\s*position: static;/);
    // Garis rute hero tergambar sekali ≤ 1,6 dtk (hooks useRouteDraw)
    const hooks = readFileSync(resolve(ROOT, 'src/templates/lawatan/hooks.ts'), 'utf8');
    const duration = /useRouteDraw\([^)]*duration = (\d+)\)/.exec(hooks);
    expect(Number(duration![1])).toBeLessThanOrEqual(1600);
  });
});

describe('Lawatan: warna tema bisa diganti', () => {
  it('hijau daun bawaan → --tpl-accent; warna CMS mengalir ke pita & teks aksen; teks di atas aksen kontras', () => {
    const base = demo();
    expect(rootStyle(base, '--tpl-accent')).toBe('#277a36');
    expect(rootStyle(base, '--lw-deep')).toBe('#194321');
    expect(rootStyle(base, '--lw-ink')).toBe('#277a36');
    cleanup();
    const red = demo({ brand: { accent_color: '#A61E3A' } });
    expect(rootStyle(red, '--tpl-accent')).toBe('#a61e3a');
    for (const name of ['--lw-deep', '--lw-ink']) expect(rootStyle(red, name), name).toBe((lawatanVars('#A61E3A') as Record<string, string>)[name]);
    cleanup();
    expect(rootStyle(demo({ brand: { accent_color: '#FACC15' } }), '--tpl-on-accent')).toBe('#121620');
  });
});

describe('Lawatan: SEO situs pembeli, judul, gambar, tautan', () => {
  it('judul tab & meta description dari nama, tagline, dan kalimat hero; theme-color = aksen', () => {
    expect(siteTitle('lawatan', null)).toBe('Lawatan Tour & Travel — Paket wisata rombongan');
    expect(siteTitle('lawatan', null).length).toBeLessThanOrEqual(60);
    const restore = applySiteHead('lawatan', null);
    const description = document.head.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
    expect(description).toMatch(/^Paket study tour, gathering kantor, wisata keluarga, dan ziarah/);
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(200);
    expect(document.head.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#277A36');
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
      'Paket wisata',
      'Itinerary',
      'Yang termasuk',
      'Hitung biaya trip',
      'Testimoni',
      'Galeri',
      'Tanya jawab',
      'Kontak',
    ]);
    for (const k of ORDER.filter((key) => key !== 'hero')) expect(section(untitled, k).querySelector('h2'), k).toHaveClass('sr-only');
    // Judul hero kosong → nama biro (tetap satu H1)
    cleanup();
    expect(section(demo({ hero: { title: '' } }), 'hero').querySelector('h1')!.textContent).toBe(BRAND);
  });

  it('gambar: alt deskriptif, width/height, srcset & sizes; hanya foto hero yang eager', () => {
    const container = demo();
    const imgs = Array.from(container.querySelectorAll('img'));
    // hero + 6 kartu paket + 6 kartu pos itinerary + 6 galeri
    expect(imgs).toHaveLength(19);
    for (const img of imgs) {
      const src = img.getAttribute('src') ?? '';
      expect(img.hasAttribute('alt'), src).toBe(true);
      expect(Number(img.getAttribute('width')), src).toBeGreaterThan(0);
      expect(Number(img.getAttribute('height')), src).toBeGreaterThan(0);
      expect(img.getAttribute('srcset'), src).toMatch(/ 800w, /);
      expect(img.getAttribute('sizes'), src).toBeTruthy();
      expect(img.getAttribute('alt')!.split(' ').length, src).toBeGreaterThanOrEqual(5);
    }
    expect(imgs.filter((i) => i.getAttribute('loading') === 'eager')).toHaveLength(1);
  });

  it('tautan asli untuk navigasi, tombol hanya untuk aksi (kecuali kirim formulir); SVG dekoratif tersembunyi', () => {
    const container = demo();
    for (const a of container.querySelectorAll('a')) expect(a.getAttribute('href'), a.textContent ?? '').toMatch(/^(#[a-z]|https:\/\/|mailto:|tel:)/);
    for (const button of container.querySelectorAll('button')) {
      const submit = !!button.closest('form') && /Susun pesan/.test(button.textContent ?? '');
      expect(button.getAttribute('type'), button.textContent ?? '').toBe(submit ? 'submit' : 'button');
    }
    for (const svg of container.querySelectorAll('svg')) expect(svg.closest('[aria-hidden="true"], [aria-hidden=""]') ?? svg.getAttribute('aria-hidden'), svg.outerHTML.slice(0, 60)).toBeTruthy();
    // Target sentuh ≥ 44px: tombol pil, chip, tautan teks
    for (const chip of container.querySelectorAll('[role="radiogroup"] label')) expect(chip.className).toContain('min-h-11');
  });
});

describe('Lawatan: konten opsional kosong', () => {
  it('tanpa paket → section & menu "Paket" hilang, chip hero hilang, tombol hero = "Konsultasi Trip", formulir hanya "Rancang sendiri"', () => {
    const container = demo({ packages: { items: [] } });
    expect(sectionKeys(container)).not.toContain('packages');
    const hero = section(container, 'hero');
    expect(within(hero).queryByRole('radiogroup')).toBeNull();
    expect(within(hero).getByRole('link', { name: 'Konsultasi Trip' })).toHaveAttribute('href', '#custom');
    expect(Array.from(container.querySelector('header nav')!.querySelectorAll('a')).map((a) => a.textContent)).not.toContain('Paket');
    const custom = section(container, 'custom');
    expect(Array.from((within(custom).getByLabelText('Paket') as HTMLSelectElement).options).map((o) => o.value)).toEqual([CUSTOM_PACKAGE]);
    expect(custom.textContent).toContain('Dihitung admin');
    // Jenis trip dari CMS tetap ada di formulir
    expect(within(custom).getByRole('radiogroup', { name: 'Jenis trip' })).toBeInTheDocument();
    expect(sectionNumber(resolveContent(def, { packages: { items: [] } }), 'film')).toBe('01');
  });

  it('paket tanpa harga/foto/itinerary/termasuk → "Harga menyusul", tanpa perangko, tanpa akordeon; jenis trip tanpa paket → kosong + atur ulang', () => {
    const container = demo({
      packages: {
        trip_types: 'Study tour, Umrah',
        items: [
          { title: 'Paket A', types: 'Study tour', price: '', image: '', itinerary: '', includes: '' },
          { title: 'Paket B', types: 'Study tour', price: '1,2 jt', image: '/assets/templates/photos/lawatan-bali-1200.webp' },
        ],
      },
    });
    const packages = section(container, 'packages');
    const [a, b] = Array.from(packages.querySelectorAll('article'));
    expect(a.textContent).toContain('Harga menyusul');
    expect(a.querySelector('.lw-perf')).toBeNull();
    expect(a.querySelector('img')).toBeNull();
    expect(within(a).queryByRole('button', { name: /^Lihat itinerary/ })).toBeNull();
    expect(within(a).queryByRole('list', { name: 'Termasuk' })).toBeNull();
    expect(plain(b.querySelector('.lw-perf')!.textContent)).toBe('MulaiRp1,2 jtper orang');
    expect(within(packages).queryByRole('button', { name: /Lihat semua/ })).toBeNull();
    const filter = within(packages).getByRole('radiogroup', { name: 'Saring paket menurut jenis trip' });
    fireEvent.click(within(filter).getByLabelText('Umrah'));
    expect(within(packages).getByRole('status').textContent).toBe('Belum ada paket');
    expect(packages.querySelectorAll('article')).toHaveLength(0);
    expect(packages.textContent).toContain('Belum ada paket untuk jenis trip ini.');
    expect(within(packages).getByRole('link', { name: 'Rancang trip sendiri' })).toHaveAttribute('href', '#custom');
    fireEvent.click(within(packages).getByRole('button', { name: 'Tampilkan semua paket' }));
    expect(packages.querySelectorAll('article')).toHaveLength(2);
  });

  it('formulir hitung biaya disembunyikan → tanpa tombol "Hitung biaya", tombol menu ke Kontak; label tombol kartu kosong → hilang', () => {
    const container = demo({ custom: { enabled: false }, packages: { order_label: '' } });
    expect(sectionKeys(container)).not.toContain('custom');
    const packages = section(container, 'packages');
    expect(within(packages).queryByRole('button', { name: /Hitung biaya/ })).toBeNull();
    expect(within(packages).queryByRole('link', { name: /Pesan paket/ })).toBeNull();
    expect(within(container.querySelector('header')!).getAllByRole('link', { name: 'Konsultasi Trip' })[0]).toHaveAttribute('href', '#kontak');
  });

  it('film: 1 titik → papan cerita tanpa km; titik tanpa km; tanpa titik → section & menu hilang; galeri ≠ 8 foto → kisi rata', () => {
    const one = section(demo({ film: { stops: [{ name: 'Borobudur', day: 'Hari 1', time: '09.00', km: '', text: 'Naik candi.', image: '' }] } }), 'film');
    expect(one.querySelectorAll('ol > li')).toHaveLength(1);
    expect(one.querySelector('img')).toBeNull();
    expect(one.textContent).not.toMatch(/\bkm\b/);
    cleanup();
    const noFilm = demo({ film: { stops: [] }, gallery: { items: (DEMO.gallery.items as unknown[]).slice(0, 5) } });
    expect(sectionKeys(noFilm)).not.toContain('film');
    expect(Array.from(noFilm.querySelector('header nav')!.querySelectorAll('a')).map((a) => a.textContent)).not.toContain('Itinerary');
    const tiles = Array.from(section(noFilm, 'gallery').querySelectorAll('ul > li'));
    expect(tiles).toHaveLength(5);
    expect(tiles.some((li) => /span-2/.test(li.className))).toBe(false);
    // "Lewati animasi" dari packages tidak ada; nomor label bergeser
    expect(section(noFilm, 'included').textContent).toContain('02');
  });

  it('tanpa WhatsApp → formulir menyusun email, tanpa tombol pesan paket & tautan WA; tanpa WhatsApp & email → salin pesan', () => {
    const fill = (custom: HTMLElement) => {
      const form = within(custom).getByRole('form', { name: 'Hitung & rancang trip' });
      fireEvent.click(within(within(form).getByRole('radiogroup', { name: 'Jenis trip' })).getByLabelText('Keluarga'));
      act(() => {
        fireEvent.submit(form);
      });
    };
    const container = demo({ contact: { whatsapp: '' } });
    const custom = section(container, 'custom');
    expect(within(custom).getByRole('button', { name: 'Susun pesan' })).toHaveAttribute('type', 'submit');
    expect(within(section(container, 'packages')).queryByRole('link', { name: /Pesan paket/ })).toBeNull();
    expect(within(section(container, 'hero')).queryByRole('link', { name: /WhatsApp/ })).toBeNull();
    fill(custom);
    expect(within(custom).getByRole('link', { name: 'Kirim lewat email' }).getAttribute('href')).toMatch(
      /^mailto:lawatan@example\.com\?subject=Konsultasi%20paket%20wisata&body=Halo%20Lawatan/,
    );
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    expect(within(section(container, 'faq')).queryByRole('link', { name: /Kirim pertanyaan lewat WhatsApp/ })).toBeNull();
    cleanup();
    const bare = section(demo({ contact: { whatsapp: '', email: '' } }), 'custom');
    fill(bare);
    expect(within(bare).getByRole('button', { name: 'Salin pesan' })).toBeInTheDocument();
  });

  it('header & footer: tanpa label tombol → tanpa tombol; tanpa media sosial; section mati keluar dari halaman & menu', () => {
    const container = demo({
      hero: { header_label: '', link_label: '' },
      footer: { instagram: '', youtube: '', tiktok: '' },
      faq: { enabled: false },
      testimonials: { items: [] },
      included: { enabled: false },
    });
    expect(within(container.querySelector('header')!).queryByRole('link', { name: 'Konsultasi Trip' })).toBeNull();
    expect(within(section(container, 'hero')).queryByRole('link', { name: /WhatsApp/ })).toBeNull();
    const footer = container.querySelector('footer')!;
    expect(footer.textContent).not.toContain('Media sosial');
    for (const key of ['faq', 'testimonials', 'included']) expect(sectionKeys(container), key).not.toContain(key);
    expect(Array.from(container.querySelector('header nav')!.querySelectorAll('a')).map((a) => a.getAttribute('href'))).toEqual(['#packages', '#film', '#kontak']);
    // Lewati animasi → section tampil berikutnya
    expect(within(section(container, 'film')).getByRole('link', { name: 'Lewati animasi' })).toHaveAttribute('href', '#custom');
    cleanup();
    expect(demo({ footer: { enabled: false } }).querySelector('footer')).toBeNull();
  });
});

describe('Lawatan: editor CMS', () => {
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

describe('Lawatan: data katalog', () => {
  const MIGRATION = 'database/migrations/2026-10-29_051_lawatan_template.sql';
  const sql = () => readFileSync(resolve(ROOT, MIGRATION), 'utf8');

  it('migrasi 051: baris lawatan dengan template_code, kategori baru, harga, pratinjau .webp, fitur, salinan jujur', () => {
    const text = sql();
    expect(text).toContain("'lawatan'");
    expect(text).toContain("'Travel & Transportasi'");
    expect(text).toContain('1690000.00');
    expect(text).toContain("'/assets/templates/lawatan-preview.webp'");
    expect(text).toContain('\'["/assets/templates/lawatan-1.webp","/assets/templates/lawatan-2.webp"]\'');
    expect(text).toContain('Formulir hanya menyusun pesan WhatsApp; harga paket contoh dan bisa berubah; kuota, hotel dan jadwal dikonfirmasi admin; tidak ada pembayaran online.');
    expect(text).not.toMatch(/termasuk domain|domain, hosting|dijamin|garansi|terbaik|termurah|izin trayek|asuransi|bersertifikat/i);
    expect(text).toMatch(/kategori baru; halaman kategorinya ditambahkan di kode yang sama/);
    const features = JSON.parse(/features\s+= '(\[[^']*\])'/.exec(text)![1]) as string[];
    expect(features.length).toBeGreaterThanOrEqual(6);
    expect(features.length).toBeLessThanOrEqual(8);
    expect(features[features.length - 1]).toBe('Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)');
    // Berkas galeri & pratinjau yang disebut migrasi benar-benar ada
    const gallery = JSON.parse(/gallery\s+= '(\[[^']*\])'/.exec(text)![1]) as string[];
    expect(gallery).toEqual(['/assets/templates/lawatan-1.webp', '/assets/templates/lawatan-2.webp']);
    for (const url of [...gallery, '/assets/templates/lawatan-preview.webp']) expect(existsSync(publicFile(url)), url).toBe(true);
  });

  it('migrasi 051 aman diulang (INSERT IGNORE + UPDATE berdasarkan slug, tanpa DELETE) dan tercatat di schema_migrations', () => {
    const raw = sql();
    expect(raw).toMatch(/Domain\s+(--\s+)?tidak termasuk harga template/);
    expect(raw).toMatch(/FIKTIF/);
    expect(raw).toMatch(/Unsplash/);
    expect(raw).toMatch(/SETELAH kode/);
    expect(raw).toMatch(/MENIMPA perubahan admin/);
    const text = raw.replace(/^--.*$/gm, '');
    expect(text).toMatch(/INSERT IGNORE INTO templates/);
    expect(text).toMatch(/WHERE slug = 'lawatan';/);
    expect(text).toMatch(/price\s+= 1690000\.00/);
    expect(text).toMatch(/category\s+= 'Travel & Transportasi'/);
    expect(text).toMatch(/sort_order\s+= 34/);
    expect(text).toMatch(/status\s+= 'published'/);
    expect(text).not.toMatch(/\bDELETE\b|\bDROP\b|\bTRUNCATE\b/i);
    expect(text).toContain("VALUES ('2026-10-29_051', 'templates: katalog Lawatan')");
  });

  it('gambar pratinjau katalog ada di public/, 1600×1000, VP8/VP8X, dan ringan', () => {
    for (const name of ['lawatan-preview', 'lawatan-1', 'lawatan-2']) {
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
    const title = (catalogSeo.title ?? '').replace('{nama}', 'Lawatan').replace('{harga_singkat}', 'Rp1,69 jt');
    expect(title).toBe('Lawatan: Template Website Tour & Travel – Rp1,69 jt');
    expect(title.length).toBeLessThanOrEqual(60);
    expect(catalogSeo.description).toMatch(/^.{1,69} \{harga\} sudah termasuk hosting & SSL tahun pertama; domain mulai \{domain_mulai\}\/tahun\.$/);
    expect(catalogSeo.niche).toBe('Tour & Travel');
    expect(catalogSeo.updated).toBe('2026-10-30');
    expect(catalogPage.h1).toBe('{nama}: Template Website Tour & Travel Rombongan');
    expect(catalogPage.niche).toBe('tour & travel');
    const text = JSON.stringify(catalogContent);
    expect(text).toMatch(/fiktif/);
    expect(text).toMatch(/template website tour and travel/);
    expect(text).toMatch(/website paket wisata/);
    expect(text).toMatch(/website study tour/);
    expect(catalogContent.partsNote).toBe(
      'Formulir hitung biaya hanya menyusun pesan WhatsApp; data tidak disimpan di website. Harga paket adalah contoh harga mulai dan bisa berubah; kuota, hotel, dan jadwal dikonfirmasi admin lewat WhatsApp. Tidak ada pembayaran online, e-tiket, atau cek kuota real-time, dan estimasi biaya bukan penawaran final.',
    );
    expect(text).not.toMatch(/\b(dijamin|garansi|terbaik nomor|termurah|rating \d|#1)\b|izin trayek|berizin|asuransi|bersertifikat|1\.690\.000|termasuk domain/i);
    expect(text).not.toMatch(/\b(Mercedes|Hino|Scania|Volvo|Toyota|Avanza|Innova|HiAce|Elf|Alphard|Pajero)\b/);
    expect(text).not.toMatch(/\d+ (hari|jam) kerja/);
    expect(catalogContent.guides).toEqual(['template-vs-jasa-website-custom', 'biaya-website-company-profile']);
  });
});

describe('Lawatan: konten aneh', () => {
  it('angka, null, dan string di tempat list tidak membuat crash; tautan & gambar berbahaya dibuang', () => {
    const weird = {
      hero: { image: 'javascript:alert(1)', header_url: 'javascript:alert(1)', subtitle: 7, highlight: 'tidak ada di judul' },
      packages: { items: [null, 'x', { title: 3 }, { title: 'Paket A', price: 'abc', min_people: {}, image: 'javascript:alert(1)', itinerary: 5 }], trip_types: 7 },
      film: { stops: 'x' },
      included: { items: [null, { title: 'Bus' }] },
      custom: { note: null },
      testimonials: { items: 5 },
      gallery: { items: [{ image: 'vbscript:x', caption: 'X' }] },
      faq: { items: [{ question: 2, answer: null }], link_url: 'vbscript:x' },
      contact: { whatsapp: 'abc', maps_url: 'javascript:alert(1)' },
      footer: { instagram: 'javascript:alert(1)' },
      brand: { accent_color: 'oranye' },
    } as unknown as SiteContent;
    const { container } = render(<def.Component content={resolveContent(def, weird)} />);
    expect(container.querySelector('a[href^="javascript:"], a[href^="vbscript:"]')).toBeNull();
    expect(container.querySelector('img[src^="javascript:"], img[src^="vbscript:"]')).toBeNull();
    expect(container.querySelector('h1')!.textContent).toBe('Liburan rombongan, semua kami yang atur.');
    expect(section(container, 'packages').textContent).toContain('Paket A');
    expect(section(container, 'packages').textContent).toContain('Harga menyusul');
    expect(section(container, 'custom').textContent).not.toMatch(/NaN|undefined|Infinity/);
    expect(container.textContent).not.toMatch(/NaN|\[object Object\]/);
    expect(rootStyle(container, '--lw-deep')).toBe('#194321');
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

describe('Lawatan: perbaikan tinjauan live 2026-10-31', () => {
  const cls = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/);

  it('"Perkiraan total" selalu satu baris: HP dibatasi lebar isi panel (100cqi − 5,5rem ÷ ±0,6em per karakter, juga dengan huruf bawaan 20px), @3xl tetap langkah kelas', () => {
    const custom = section(demo(), 'custom');
    const form = within(custom).getByRole('form', { name: 'Hitung & rancang trip' });
    const ticket = custom.querySelector<HTMLElement>('[data-tpl-tone="inverse"]')!;
    const total = () => Array.from(ticket.querySelectorAll('p')).find((p) => p.textContent?.trim() === 'Perkiraan total')!.nextElementSibling as HTMLElement;
    const people = within(form).getByLabelText('Jumlah peserta') as HTMLInputElement;
    const cases: [string, string, string][] = [
      // peserta → total → batas ukuran HP; ukuran @3xl
      ['1', 'Rp875.000', 'min(38px, calc((100cqi - 5.5rem) / 5.4))'],
      ['10', 'Rp8.750.000', 'min(38px, calc((100cqi - 5.5rem) / 6.6))'],
      ['40', 'Rp35.000.000', 'min(30px, calc((100cqi - 5.5rem) / 7.2))'],
      ['500', 'Rp437.500.000', 'min(30px, calc((100cqi - 5.5rem) / 7.8))'],
    ];
    for (const [n, text, fit] of cases) {
      fireEvent.change(people, { target: { value: n } });
      expect(within(ticket).getByText(text)).toBeInTheDocument();
      expect(cls(total())).toContain('text-(length:--lw-total)');
      expect(total().style.getPropertyValue('--lw-total')).toBe(fit);
    }
    // @3xl: langkah kelas (kolom 5/12 di 1024px sudah pas); tidak ada ukuran HP tetap yang melebihi panel
    expect(cls(total())).toContain('@3xl:text-[40px]');
    expect(total().className).not.toMatch(/(^|\s)text-\[(26|30|38)px\]/);
  });

  it('hero HP: kalimat, tombol, tautan & chip berhenti di kiri tombol WhatsApp melayang (lajur kanan --lw-lane, 0 mulai @3xl); judul tetap selebar panel', () => {
    const hero = section(demo(), 'hero');
    const lead = Array.from(hero.querySelectorAll('p')).find((p) => p.textContent?.startsWith('Paket study tour'))!;
    expect(cls(lead)).toContain('max-w-[min(60ch,calc(100%-var(--lw-lane)))]');
    const panel = lead.parentElement!;
    expect(cls(panel)).toEqual(expect.arrayContaining(['[--lw-lane:2rem]', '@xl:[--lw-lane:3.5rem]', '@2xl:[--lw-lane:2.75rem]', '@3xl:[--lw-lane:0px]']));
    const actions = Array.from(panel.children).find((el) => el.querySelector('a'))!;
    expect(cls(actions)).toContain('pr-(--lw-lane)');
    expect(hero.querySelector('h1')!.className).not.toContain('--lw-lane');
  });

  it('footer: hak cipta & tagline berhenti di kiri tombol WhatsApp melayang di semua lebar', () => {
    const footer = demo().querySelector('footer')!;
    const bottom = Array.from(footer.querySelectorAll('p')).find((p) => p.textContent?.startsWith('©'))!.parentElement!;
    expect(cls(bottom)).toEqual(expect.arrayContaining(['pr-13', '@xl:pr-19', '@2xl:pr-16', '@3xl:pr-[72px]']));
  });
});
