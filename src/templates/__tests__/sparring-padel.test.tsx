// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/sparring-padel.test.tsx
// Sparring Padel (landing page lapangan padel + booking 2026-10-28): skema CMS & konten demo, foto (registry, berkas,
// bobot, kredit), helper model (warna biru-malam/neon/tinta, menu, tujuan tautan, section tampil, jam booking, tanggal,
// pesan WhatsApp booking/jadwal/turnamen/cari lawan + validasi), demo (urutan section, hero court, header + menu HP,
// bilah booking, tab jadwal & lapangan, formulir cari lawan, turnamen, akordeon), datar tanpa bayangan, gerak (pratinjau
// CMS diam, CSS sp- bergerbang data-tpl-motion), warna tema, SEO situs pembeli, judul & gambar & tautan, konten opsional
// kosong, editor CMS, data katalog (migrasi 041 + pratinjau), dan konten aneh.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionEditor } from '../../pages/account/cms/SectionEditor';
import { validateContent } from '../../pages/account/cms/validation';
import { TEMPLATES, resolveContent } from '../index';
import { iconKey } from '../sparring-padel/icons';
import {
  BAND,
  EMPTY_BOOKING,
  EMPTY_MATCH,
  PAGE_SECTIONS,
  accentIsDark,
  bookingMessage,
  bookingSummary,
  cleanText,
  courtType,
  darkCardOf,
  displayPhone,
  formatDateId,
  hourSlots,
  levelsOf,
  mailWith,
  matchMessage,
  navItems,
  parseHours,
  readSparring,
  scheduleMessage,
  sectionShown,
  sectionTarget,
  sparringVars,
  todayIso,
  tournamentMessage,
  validateBooking,
  validateMatch,
  type BookingForm,
  type MatchForm,
} from '../sparring-padel/model';
import { SPARRING_PHOTOS } from '../sparring-padel/photos';
import { applySiteHead, siteTitle } from '../siteHead';
import { SiteRenderer } from '../SiteRenderer';
import { contrast, parseHex } from '../shared/utils';
import { isListField, type SiteContent } from '../types';

// Demo panjang + getByRole di jsdom: bisa lewat 5 dtk saat suite berjalan paralel
vi.setConfig({ testTimeout: 30_000 });

const ROOT = process.cwd();
const CODE = 'sparring-padel';
const def = TEMPLATES[CODE];
const ORDER = ['hero', 'schedule', 'courts', 'matchmaking', 'tournaments', 'rental', 'community', 'gallery', 'faq', 'contact'];
const sectionKeys = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-tpl-section]')).map((s) => s.getAttribute('data-tpl-section'));
const section = (root: HTMLElement, key: string) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`)!;
const demo = (content: unknown = null, preview = false) => render(<SiteRenderer templateCode={CODE} content={content} preview={preview} />).container;
const rgb = (hex: string) => parseHex(hex)!;
const publicFile = (url: string) => resolve(ROOT, 'public', url.replace(/^\//, ''));
const rootStyle = (container: HTMLElement, name: string) => {
  const holder = Array.from(container.querySelectorAll<HTMLElement>('[style]')).find((el) => el.style.getPropertyValue(name));
  return holder?.style.getPropertyValue(name) ?? '';
};
const urls = (src: string) => {
  const asset = SPARRING_PHOTOS.asset(src)!;
  return [asset.src, ...asset.srcSet!.split(',').map((part) => part.trim().split(' ')[0])].filter((u, i, all) => all.indexOf(u) === i);
};
const decoded = (a: Element) => decodeURIComponent(a.getAttribute('href') ?? '');
const WA = 'https://wa.me/6281234567890?text=';
const CLUB = 'Sparring Padel';
const booking = (patch: Partial<BookingForm> = {}): BookingForm => ({ ...EMPTY_BOOKING, date: '2026-11-14', time: '19.00', ...patch });
const match = (patch: Partial<MatchForm> = {}): MatchForm => ({ ...EMPTY_MATCH, name: 'Rina', level: '3', ...patch });
const SOURCES = {
  tsx: ['SparringPadel', 'Header', 'Hero', 'BookingBar', 'Schedule', 'Courts', 'Matchmaking', 'Tournaments', 'Community', 'Closing', 'Footer', 'ui', 'marks'],
  ts: ['index', 'styles', 'model', 'icons', 'hooks', 'schema', 'defaultContent', 'photos'],
};
const sourceText = () =>
  [
    ...SOURCES.tsx.map((f) => readFileSync(resolve(ROOT, `src/templates/${CODE}/${f}.tsx`), 'utf8')),
    ...SOURCES.ts.map((f) => readFileSync(resolve(ROOT, `src/templates/${CODE}/${f}.ts`), 'utf8')),
    readFileSync(resolve(ROOT, `src/templates/${CODE}/${CODE}.css`), 'utf8'),
  ].join('\n');

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

describe('Sparring Padel: skema & konten bawaan', () => {
  it('urutan form = urutan halaman, semua section bisa disembunyikan, field unik, teks & list berbatas', () => {
    expect(def.code).toBe(CODE);
    expect(def.name).toBe('Sparring Padel');
    expect(def.features).toBeUndefined();
    expect(def.sections.map((s) => s.key)).toEqual(['brand', ...ORDER, 'footer']);
    expect([...PAGE_SECTIONS]).toEqual([...ORDER, 'footer']);
    const fields = (key: string) => def.sections.find((s) => s.key === key)!.fields.map((f) => f.key);
    expect(fields('brand')).toEqual(['company_name', 'tagline', 'logo', 'accent_color']);
    expect(def.sections[0].fields.find((f) => f.key === 'accent_color')?.type).toBe('color');
    expect(fields('hero')).toEqual(
      expect.arrayContaining(['image', 'title', 'highlight', 'subtitle', 'primary_label', 'secondary_label', 'header_label', 'booking_title', 'booking_button', 'booking_hours', 'booking_note']),
    );
    expect(fields('schedule')).toEqual(expect.arrayContaining(['weekday_label', 'weekend_label', 'price_unit', 'book_label', 'weekday', 'weekend', 'facts', 'note']));
    expect(fields('contact')).toEqual(expect.arrayContaining(['address', 'maps_query', 'maps_url', 'phone', 'email', 'whatsapp', 'whatsapp_message', 'hours']));
    expect(fields('footer')).toEqual(expect.arrayContaining(['instagram', 'facebook', 'linkedin', 'youtube', 'tiktok', 'note', 'copyright']));
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
    // Batas yang disebut di halaman katalog (sparring-padel.content.ts) dan dipakai model (ITEMS / scheduleRows / levelsOf)
    expect(max).toEqual({
      'schedule.weekday': 5,
      'schedule.weekend': 5,
      'schedule.facts': 4,
      'courts.items': 6,
      'matchmaking.steps': 3,
      'matchmaking.levels': 7,
      'tournaments.items': 6,
      'rental.items': 6,
      'community.stats': 4,
      'community.activities': 8,
      'gallery.items': 8,
      'faq.items': 8,
    });
  });

  it('konten demo lolos validasi CMS, logo kosong, hero 1920, kontak demo, judul & deskripsi pas', () => {
    const c = def.defaultContent;
    expect(validateContent(def, resolveContent(def, null))).toEqual({});
    expect(c.brand.logo).toBe('');
    expect(c.brand.accent_color).toBe('#00D2B4');
    expect(c.contact.whatsapp).toBe('081234567890');
    expect(c.contact.email).toMatch(/@[a-z0-9.-]+\.test$/);
    expect(c.hero.image).toBe('/assets/templates/photos/sparring-padel-hero-1920.webp');
    for (const s of def.sections) if (s.key !== 'brand') expect(c[s.key].enabled, s.key).toBe(true);
    // Judul tab situs pembeli ≤ 60 karakter, deskripsi hero 120–155 karakter (meta description)
    expect(`${c.brand.company_name} — ${c.brand.tagline}`.length).toBeLessThanOrEqual(60);
    expect(String(c.hero.subtitle).length).toBeGreaterThanOrEqual(120);
    expect(String(c.hero.subtitle).length).toBeLessThanOrEqual(155);
    // Teks tidak ramai: H1 ≤ 9 kata dengan kata sorotan di dalamnya, pengantar section satu kalimat pendek
    expect(String(c.hero.title).split(/\s+/).length).toBeLessThanOrEqual(9);
    expect(String(c.hero.title)).toContain(String(c.hero.highlight));
    for (const key of ['schedule', 'courts', 'matchmaking', 'tournaments', 'rental', 'community', 'contact']) {
      const subtitle = String(c[key].subtitle);
      expect(subtitle.length, key).toBeLessThanOrEqual(90);
      expect(subtitle.replace(/\.$/, ''), key).not.toMatch(/[.!?]\s/);
    }
    for (const level of c.matchmaking.levels as { text: string }[]) expect(level.text.length).toBeLessThanOrEqual(120);
    // Angka komunitas "6 lapangan" = 4 indoor + 2 outdoor di kartu lapangan dan fakta jadwal
    const courts = c.courts.items as { type: string }[];
    expect(courts.filter((i) => courtType(i.type) === 'indoor')).toHaveLength(2);
    expect(courts.filter((i) => courtType(i.type) === 'outdoor')).toHaveLength(2);
    expect((c.schedule.facts as { value: string }[]).map((f) => f.value)).toContain('4 indoor · 2 outdoor');
    expect((c.community.stats as { value: string; label: string }[]).find((s) => s.label === 'Lapangan')?.value).toBe('6');
  });

  it('foto demo: ≥ 6 kunci sparring-padel-*, semua berkas ada di public/, terdaftar, dipakai, alt ≥ 5 kata', () => {
    const c = def.defaultContent;
    const photos = JSON.stringify(c).match(/\/assets\/templates\/photos\/[a-z0-9-]+\.webp/g) ?? [];
    for (const src of photos) expect(SPARRING_PHOTOS.asset(src), src).not.toBeNull();
    expect(SPARRING_PHOTOS.keys).toHaveLength(14);
    for (const key of SPARRING_PHOTOS.keys) {
      expect(key.startsWith('sparring-padel-'), key).toBe(true);
      for (const url of urls(SPARRING_PHOTOS.src(key))) expect(existsSync(publicFile(url)), url).toBe(true);
      expect(photos, `${key} dipakai di konten demo`).toContain(SPARRING_PHOTOS.src(key));
      expect(SPARRING_PHOTOS.alt(SPARRING_PHOTOS.src(key), '').split(' ').length, key).toBeGreaterThanOrEqual(5);
    }
    // Simbol bawaan juga tersedia sebagai SVG mandiri, path sama dengan komponen
    const mark = readFileSync(publicFile('/assets/templates/logos/sparring-padel-mark.svg'), 'utf8');
    const component = readFileSync(resolve(ROOT, 'src/templates/sparring-padel/marks.tsx'), 'utf8');
    const paths = mark.match(/ d="[^"]+"/g) ?? [];
    expect(paths).toHaveLength(3);
    for (const d of paths) expect(component, d).toContain(d.trim());
    expect(mark).toMatch(/viewBox="0 0 32 32"/);
    expect(mark).toMatch(/width="32" height="32"/);
    expect(mark).toMatch(/role="img"/);
    expect(mark).toMatch(/aria-label="/);
    expect(mark).toMatch(/<title>/);
    expect(mark).toMatch(/fill="currentColor"/);
    expect(mark).not.toMatch(/<text/);
  });

  it('foto demo tercatat di CREDITS.md', () => {
    const credits = readFileSync(resolve(ROOT, 'public/assets/templates/photos/CREDITS.md'), 'utf8');
    // CREDITS.md gets this template's section at integration
    for (const key of SPARRING_PHOTOS.keys) expect(credits, key).toContain(`\`${key}-*\``);
  });

  it('foto demo ringan: hero 800/1280/1920, WebP ≤ 140 KB per file, 800w ≤ 90 KB, total ≤ 2,5 MB', () => {
    expect(SPARRING_PHOTOS.asset(def.defaultContent.hero.image as string)!.srcSet).toBe(
      '/assets/templates/photos/sparring-padel-hero-800.webp 800w, /assets/templates/photos/sparring-padel-hero-1280.webp 1280w, /assets/templates/photos/sparring-padel-hero-1920.webp 1920w',
    );
    let total = 0;
    for (const key of SPARRING_PHOTOS.keys) {
      for (const url of urls(SPARRING_PHOTOS.src(key))) {
        expect(url, url).toMatch(/\.webp$/);
        const bytes = readFileSync(publicFile(url));
        expect(bytes.toString('ascii', 0, 4) + bytes.toString('ascii', 8, 12), url).toBe('RIFFWEBP');
        const kb = statSync(publicFile(url)).size / 1024;
        expect(kb, url).toBeLessThanOrEqual(140);
        if (url.endsWith('-800.webp')) expect(kb, url).toBeLessThanOrEqual(90);
        total += kb;
      }
    }
    expect(total).toBeLessThanOrEqual(2500);
  });

  it('salinan demo jujur: booking & formulir hanya menyusun pesan WhatsApp, jadwal contoh, tanpa bayar online/akun, tanpa klaim', () => {
    const text = JSON.stringify(def.defaultContent);
    expect(text).not.toMatch(/dijamin|garansi|pasti |terbaik|nomor 1|termurah|#1|100 ?%|PBSI|\bFIP\b|resmi|bersertifikat|terakreditasi|sanksi|real-time|real time/i);
    expect(text).toMatch(/data tidak disimpan di website/);
    expect(text).toMatch(/Admin mengonfirmasi ketersediaan lewat WhatsApp\. Tanpa pembayaran online\./);
    expect(text).toMatch(/Contoh jadwal dan harga\. Ketersediaan dikonfirmasi admin lewat WhatsApp\./);
    expect(text).toMatch(/Jadwal turnamen contoh; pendaftaran dikonfirmasi admin/);
    expect(def.defaultContent.footer.note).toBe('Booking di website ini hanya menyusun pesan WhatsApp ke admin; tidak ada pembayaran online dan tidak ada akun member.');
    expect(text).toContain('.test');
    // Halaman katalog: kalimat "tidak melakukan" yang sama dan kata fiktif
    const page = readFileSync(resolve(ROOT, 'src/content/templates/sparring-padel.content.ts'), 'utf8');
    expect(page).toContain(
      'Booking hanya menyusun pesan WhatsApp ke admin; jadwal yang tampil adalah contoh, ketersediaan dikonfirmasi admin; tidak ada pembayaran online dan tidak ada akun member.',
    );
    expect(page).toMatch(/fiktif/);
    expect(page).toMatch(/data tidak disimpan di website/);
  });
});

describe('Sparring Padel: helper model', () => {
  it('warna tema: biru-malam putih ≥ 15:1, neon ≥ 4,5:1 di biru-malam & kartu gelap, tinta ≥ 4,5:1 di pita & putih; tidak valid → bawaan', () => {
    const white = rgb('#ffffff');
    expect(sparringVars('#00D2B4')).toEqual({ '--sp-night': '#051622', '--sp-neon': '#00d2b4', '--sp-ink': '#007c6a' });
    for (const accent of ['#00D2B4', '#1D4ED8', '#7C3AED', '#FACC15', '#111111', '#E3342F', '#FFFFFF', '#000000', '#6EE7B7', '#C6F135', '#F0542D', '#0F5C63']) {
      const vars = sparringVars(accent) as Record<string, string>;
      const night = rgb(vars['--sp-night']);
      const neon = rgb(vars['--sp-neon']);
      const ink = rgb(vars['--sp-ink']);
      expect(contrast(night, white), accent).toBeGreaterThanOrEqual(15);
      expect(contrast(neon, night), accent).toBeGreaterThanOrEqual(4.5);
      expect(contrast(neon, rgb(darkCardOf(vars['--sp-night']))), accent).toBeGreaterThanOrEqual(4.5);
      expect(contrast(ink, BAND), accent).toBeGreaterThanOrEqual(4.5);
      expect(contrast(ink, white), accent).toBeGreaterThanOrEqual(4.5);
    }
    expect(sparringVars('zzz')).toEqual(sparringVars('#00D2B4'));
    expect(sparringVars('')).toEqual(sparringVars('#00D2B4'));
    // Neon bawaan: tinta gelap di atasnya (sama dengan --tpl-on-accent Shell)
    expect(accentIsDark('#00D2B4')).toBe(false);
    expect(accentIsDark('#1D4ED8')).toBe(true);
    expect(darkCardOf('#051622')).toBe('#12222d');
  });

  it('menu: label pendek dari label section, section kosong/mati keluar dari menu', () => {
    const content = resolveContent(def, null);
    expect(navItems(content).map((i) => `${i.key}:${i.label}`)).toEqual([
      'schedule:Jadwal',
      'courts:Lapangan',
      'matchmaking:Cari lawan',
      'tournaments:Turnamen',
      'rental:Sewa',
      'gallery:Galeri',
      'faq:FAQ',
      'contact:Lokasi',
    ]);
    const less = resolveContent(def, {
      schedule: { eyebrow: 'Jadwal dan harga per jam' },
      gallery: { items: [] },
      tournaments: { enabled: false },
      faq: { items: [{ question: 'tanpa jawaban' }] },
      rental: { eyebrow: '' },
    });
    expect(navItems(less).map((i) => `${i.key}:${i.label}`)).toEqual(['schedule:Jadwal', 'courts:Lapangan', 'matchmaking:Cari lawan', 'rental:Sewa', 'contact:Lokasi']);
  });

  it('tujuan tautan: anchor Indonesia dan kunci section; section tersembunyi → cadangan', () => {
    expect(sectionTarget('#jadwal')).toBe('schedule');
    expect(sectionTarget('#harga')).toBe('schedule');
    expect(sectionTarget('#lapangan')).toBe('courts');
    expect(sectionTarget('#cari-lawan')).toBe('matchmaking');
    expect(sectionTarget('turnamen')).toBe('tournaments');
    expect(sectionTarget('#sewa')).toBe('rental');
    expect(sectionTarget('#komunitas')).toBe('community');
    expect(sectionTarget('#kontak')).toBe('contact');
    expect(sectionTarget('#lokasi')).toBe('contact');
    expect(sectionTarget('#galeri')).toBe('gallery');
    expect(sectionTarget('#booking')).toBe('hero');
    expect(sectionTarget('#beranda')).toBe('hero');
    expect(sectionTarget('#tidak-ada')).toBeNull();
    const m = readSparring(resolveContent(def, null));
    expect(m.linkOr('#jadwal', null)).toEqual({ kind: 'section', target: 'schedule' });
    expect(m.linkOr('#tidak-ada', m.contactAction)).toEqual({ kind: 'section', target: 'contact' });
    expect(m.linkOr('https://contoh.test/daftar', null)).toEqual({ kind: 'external', href: 'https://contoh.test/daftar' });
    expect(m.primaryAction).toEqual({ kind: 'section', target: 'schedule' });
    expect(m.secondaryAction).toEqual({ kind: 'section', target: 'matchmaking' });
    expect(m.headerAction).toEqual({ kind: 'section', target: 'hero' });
    expect(m.bookAction).toEqual({ kind: 'section', target: 'hero' });
    expect(m.waAction).toEqual({ kind: 'external', href: expect.stringMatching(/^https:\/\/wa\.me\/6281234567890\?text=/) });
    // Hero mati → Book Now ke WhatsApp; tanpa WhatsApp → Lokasi; tanpa keduanya → tidak ada
    const noHero = readSparring(resolveContent(def, { hero: { enabled: false } }));
    expect(noHero.headerAction?.kind).toBe('external');
    expect(noHero.linkOr('#booking', null)).toBeNull();
    const noWa = readSparring(resolveContent(def, { hero: { enabled: false }, contact: { whatsapp: '' } }));
    expect(noWa.headerAction).toEqual({ kind: 'section', target: 'contact' });
    const silent = readSparring(resolveContent(def, { hero: { enabled: false }, contact: { enabled: false, whatsapp: '' } }));
    expect(silent.headerAction).toBeNull();
    // Jadwal tersembunyi → tombol utama hero ke Lokasi; cari lawan tersembunyi → tombol kedua hilang
    const hidden = readSparring(resolveContent(def, { schedule: { enabled: false }, matchmaking: { enabled: false } }));
    expect(hidden.primaryAction).toEqual({ kind: 'section', target: 'contact' });
    expect(hidden.secondaryAction).toBeNull();
    expect(hidden.linkOr('#jadwal', null)).toBeNull();
  });

  it('section tampil hanya bila berisi', () => {
    const content = resolveContent(def, null);
    for (const key of ORDER) expect(sectionShown(content, key), key).toBe(true);
    const empty = resolveContent(def, {
      schedule: { weekday: [{ label: 'tanpa harga', time: '06.00–10.00' }], weekend: [] },
      courts: { items: [{ type: 'Indoor' }] },
      tournaments: { items: [{ day: '14' }] },
      rental: { items: [{ price: 'Rp1' }] },
      community: { title: '', stats: [{ value: '1' }], activities: [{ label: '' }] },
      gallery: { items: [{ caption: 'tanpa foto' }] },
      faq: { items: [{ question: 'tanpa jawaban' }] },
    });
    for (const key of ['schedule', 'courts', 'tournaments', 'rental', 'community', 'gallery', 'faq']) expect(sectionShown(empty, key), key).toBe(false);
    expect(sectionShown(content, 'tidak-ada')).toBe(false);
    expect(sectionShown(resolveContent(def, { courts: { enabled: false } }), 'courts')).toBe(false);
  });

  it('jam booking & tanggal: jam buka dari CMS → pilihan per jam; tanggal Indonesia tanpa Intl', () => {
    expect(parseHours('06.00–24.00')).toEqual([6, 24]);
    expect(parseHours('7-22')).toEqual([7, 22]);
    expect(parseHours('06:00 - 23:00')).toEqual([6, 23]);
    expect(parseHours('07.00 s/d 21.00')).toEqual([7, 21]);
    expect(parseHours('22.00–06.00')).toEqual([6, 24]);
    expect(parseHours('setiap hari')).toEqual([6, 24]);
    const slots = hourSlots('06.00–24.00');
    expect(slots).toHaveLength(18);
    expect(slots[0]).toBe('06.00');
    expect(slots.at(-1)).toBe('23.00');
    expect(hourSlots('7-9')).toEqual(['07.00', '08.00']);
    expect(todayIso(new Date(2026, 9, 28, 23, 30))).toBe('2026-10-28');
    expect(todayIso(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(formatDateId('2026-11-14')).toBe('Sabtu, 14 November 2026');
    expect(formatDateId('2026-12-06')).toBe('Minggu, 6 Desember 2026');
    expect(formatDateId('2026-02-30')).toBe('');
    expect(formatDateId('14/11/2026')).toBe('');
    expect(formatDateId('')).toBe('');
  });

  it('bilah booking: validasi (tanggal lampau, jam di luar pilihan) dan pesan WhatsApp persis', () => {
    const slots = hourSlots('06.00–24.00');
    expect(validateBooking(booking(), slots, '2026-10-28')).toEqual({});
    expect(validateBooking(EMPTY_BOOKING, slots, '2026-10-28')).toEqual({ date: 'Pilih tanggal main.', time: 'Pilih jam mulai.' });
    expect(validateBooking(booking({ date: '2026-10-27' }), slots, '2026-10-28')).toEqual({ date: 'Tanggal sudah lewat.' });
    expect(validateBooking(booking({ date: '2026-10-28' }), slots, '2026-10-28')).toEqual({});
    expect(validateBooking(booking({ time: '03.00' }), slots, '2026-10-28')).toEqual({ time: 'Pilih jam mulai.' });
    expect(bookingMessage(booking(), CLUB)).toBe(
      'Halo Sparring Padel, saya ingin booking lapangan padel.\n\nTanggal: Sabtu, 14 November 2026\nLapangan: Indoor\nJam mulai: 19.00\nPemain: 4 orang\n\nMohon konfirmasi ketersediaan dan harganya.',
    );
    // Pilihan di luar daftar kembali ke bawaan; nama klub kosong → salam tanpa nama
    expect(bookingMessage(booking({ court: 'Rooftop', players: '9', time: '07.00' }), '')).toBe(
      'Halo, saya ingin booking lapangan padel.\n\nTanggal: Sabtu, 14 November 2026\nLapangan: Indoor\nJam mulai: 07.00\nPemain: 4 orang\n\nMohon konfirmasi ketersediaan dan harganya.',
    );
    expect(bookingMessage(booking({ court: 'Outdoor', players: '2' }), CLUB)).toContain('Lapangan: Outdoor\nJam mulai: 19.00\nPemain: 2 orang');
    expect(bookingSummary(booking({ court: 'Outdoor', players: '2' }))).toEqual(['Sabtu, 14 November 2026', 'Outdoor', 'Mulai 19.00', '2 pemain']);
  });

  it('pesan tombol Book jadwal dan Daftar turnamen', () => {
    expect(scheduleMessage(CLUB, 'Senin–Jumat', { label: 'Prime', time: '19.00–23.00', price: 'Rp450.000' }, '/jam')).toBe(
      'Halo Sparring Padel, saya ingin booking lapangan padel.\n\nHari: Senin–Jumat\nSesi: Prime 19.00–23.00\nHarga: Rp450.000/jam\nTanggal: \n\nMohon info lapangan yang tersedia.',
    );
    expect(scheduleMessage('', '', { time: '06.00–12.00', price: 'Rp1' }, '')).toBe(
      'Halo, saya ingin booking lapangan padel.\n\nSesi: 06.00–12.00\nHarga: Rp1\nTanggal: \n\nMohon info lapangan yang tersedia.',
    );
    expect(tournamentMessage(CLUB, { day: '14', month: 'Nov', title: 'Americano Malam Minggu', category: 'Campuran · Level 2–4' })).toBe(
      'Halo Sparring Padel, saya ingin mendaftar turnamen.\n\nTurnamen: Americano Malam Minggu\nTanggal: 14 Nov\nKategori: Campuran · Level 2–4\nNama: \nPasangan: ',
    );
    expect(tournamentMessage(CLUB, { title: 'Liga' })).toBe('Halo Sparring Padel, saya ingin mendaftar turnamen.\n\nTurnamen: Liga\nNama: \nPasangan: ');
  });

  it('cari lawan main: level dari CMS (atau 1–7 bawaan), validasi, pesan WhatsApp persis', () => {
    const levels = levelsOf(def.defaultContent.matchmaking);
    expect(levels.map((l) => `${l.level}:${l.name}`)).toEqual(['1:Pemula', '2:Pemula+', '3:Menengah', '4:Menengah+', '5:Mahir', '6:Mahir+', '7:Kompetitif']);
    expect(levelsOf({ levels: [] } as unknown as SiteContent['matchmaking']).map((l) => l.name)).toEqual(['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5', 'Level 6', 'Level 7']);
    expect(levelsOf({ levels: [{ name: 'Santai' }, { level: 'A', name: 'Atlet' }, { level: '9' }] } as unknown as SiteContent['matchmaking'])).toEqual([
      { level: '1', name: 'Santai', text: '' },
      { level: 'A', name: 'Atlet', text: '' },
    ]);
    const numbers = levels.map((l) => l.level);
    expect(validateMatch(match(), numbers)).toEqual({});
    expect(validateMatch(EMPTY_MATCH, numbers)).toEqual({ level: 'Pilih level Anda.', name: 'Tulis nama Anda.' });
    expect(validateMatch(match({ level: '8', name: ' a ' }), numbers)).toEqual({ level: 'Pilih level Anda.', name: 'Tulis nama Anda.' });
    expect(matchMessage(match({ day: 'Sabtu', time: 'Malam (18.00–24.00)' }), levels, CLUB)).toBe(
      'Halo Sparring Padel, saya ingin dicarikan lawan atau pasangan main padel.\n\nNama: Rina\nLevel: 3 – Menengah\nHari: Sabtu\nJam: Malam (18.00–24.00)',
    );
    // Hari/jam di luar pilihan → "Hari apa saja"/"Jam berapa saja"; nama dibersihkan
    expect(matchMessage(match({ name: 'Rina\u0000  Ayu', day: 'Kapan-kapan', time: '25.00' }), levels, '')).toBe(
      'Halo, saya ingin dicarikan lawan atau pasangan main padel.\n\nNama: Rina Ayu\nLevel: 3 – Menengah\nHari: Hari apa saja\nJam: Jam berapa saja',
    );
  });

  it('teks kecil: nomor HP, teks bersih, mailto, jenis lapangan, ikon sewa otomatis', () => {
    expect(displayPhone('081234567890')).toBe('0812-3456-7890');
    expect(displayPhone('(021) 555-0182')).toBe('(021) 555-0182');
    expect(displayPhone('')).toBe('');
    expect(cleanText('a\u0000b\u0007  c', 10)).toBe('a b c');
    expect(cleanText('x'.repeat(500), 60)).toHaveLength(60);
    expect(mailWith('booking@sparringpadel.test', 'Booking lapangan padel', 'Baris 1\nBaris 2')).toBe(
      'mailto:booking@sparringpadel.test?subject=Booking%20lapangan%20padel&body=Baris%201%0ABaris%202',
    );
    expect(mailWith('bukan email', 'x', 'y')).toBe('');
    expect(courtType('Outdoor')).toBe('outdoor');
    expect(courtType('Luar ruang')).toBe('outdoor');
    expect(courtType('Indoor')).toBe('indoor');
    expect(courtType('')).toBe('indoor');
    expect(iconKey('Raket padel')).toBe('racket');
    expect(iconKey('Bola (1 tabung)')).toBe('ball');
    expect(iconKey('Sepatu padel')).toBe('shoe');
    expect(iconKey('Coaching privat')).toBe('coach');
    expect(iconKey('Kelas pemula (grup)')).toBe('class');
    expect(iconKey('Handuk')).toBe('shirt');
    expect(iconKey('Air mineral')).toBe('drink');
    expect(iconKey('Loker')).toBe('bag');
  });
});

describe('Sparring Padel: demo', () => {
  it('urutan section, satu H1, hero court: foto latar LCP (eager, srcset, ukuran, alt) tanpa reveal, garis lapangan neon dekoratif', () => {
    const container = demo();
    expect(sectionKeys(container)).toEqual([...ORDER, 'footer']);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const hero = section(container, 'hero');
    expect(hero.getAttribute('data-hero-layout')).toBe('court');
    expect(hero.getAttribute('data-tpl-tone')).toBe('inverse');
    expect(hero.querySelector('h1')!.textContent).toBe('Pesan lapangan padel, temukan lawan selevel.');
    expect(hero.querySelector('h1 em')!.textContent).toBe('selevel');
    const img = hero.querySelector<HTMLImageElement>('img[fetchpriority="high"]')!;
    expect(img.getAttribute('src')).toBe('/assets/templates/photos/sparring-padel-hero-1920.webp');
    expect(img.getAttribute('srcset')).toContain(' 800w');
    expect(img.getAttribute('srcset')).toContain(' 1280w');
    expect(img.getAttribute('srcset')).toContain(' 1920w');
    expect(img.getAttribute('sizes')).toBeTruthy();
    expect(img.getAttribute('loading')).toBe('eager');
    expect(Number(img.getAttribute('width'))).toBe(1920);
    expect(Number(img.getAttribute('height'))).toBe(1080);
    expect(img.getAttribute('alt')).toBe('Pemain padel perempuan memukul bola rendah di lapangan biru yang gelap');
    // Foto latar: di belakang teks (absolute inset-0), TIDAK di dalam <Reveal>/.sp-rise, tanpa zoom/parallax
    expect(img.closest('.tpl-reveal, .sp-rise')).toBeNull();
    expect(img.closest('[data-reveal]')).toBeNull();
    expect(img.parentElement!.className).toContain('absolute inset-0');
    expect(img.className).not.toMatch(/tpl-photo|sp-/);
    expect(hero.querySelector('.sp-hero-scrim')).toHaveAttribute('aria-hidden', 'true');
    // Garis lapangan neon + lengkung bola: satu SVG dekoratif, garis pathLength=1 untuk stroke-dashoffset
    const court = hero.querySelector('svg.sp-court')!;
    expect(court.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(court.querySelectorAll('.sp-court-line')).toHaveLength(4);
    for (const line of court.querySelectorAll('.sp-court-line')) expect(line.getAttribute('pathLength')).toBe('1');
    expect(court.querySelectorAll('.sp-arc-reveal')).toHaveLength(1);
    expect(court.querySelectorAll('.sp-ball')).toHaveLength(1);
    expect(court.closest('div')!.className).toContain('@min-[88rem]:block');
    // Tombol hero + bilah booking yang naik sesudah judul
    expect(within(hero).getByRole('link', { name: 'Lihat jadwal & harga' })).toHaveAttribute('href', '#schedule');
    expect(within(hero).getByRole('link', { name: 'Cari lawan main' })).toHaveAttribute('href', '#matchmaking');
    const form = within(hero).getByRole('form', { name: 'Booking cepat' });
    expect(form.closest('.sp-rise')).not.toBeNull();
    expect(form.getAttribute('action')).toBeNull();
    expect(within(form).getByRole('button', { name: 'Book Now' })).toHaveAttribute('type', 'submit');
    expect(within(form).getByRole('button', { name: 'Book Now' }).className).toContain('h-14');
    expect(hero.textContent).toContain('Admin mengonfirmasi ketersediaan lewat WhatsApp. Tanpa pembayaran online.');
    // Satu-satunya gambar eager di halaman
    const eager = Array.from(container.querySelectorAll('img')).filter((i) => i.getAttribute('loading') !== 'lazy');
    expect(eager.map((i) => i.getAttribute('src'))).toEqual(['/assets/templates/photos/sparring-padel-hero-1920.webp']);
  });

  it('header biru-malam menempel: menu, Book Now neon; menu HP buka/tutup, Esc menutup dan fokus kembali; Book Now → isian tanggal', async () => {
    const container = demo();
    const header = container.querySelector('header')!;
    expect(header.className).toContain('sticky');
    expect(header.className).toContain('bg-(--sp-night)');
    expect(header.getAttribute('data-tpl-tone')).toBe('inverse');
    expect(header.querySelector('svg[viewBox="0 0 32 32"]'), 'SparringMark').not.toBeNull();
    const nav = within(header).getByRole('navigation', { name: 'Menu utama' });
    expect(Array.from(nav.querySelectorAll('a')).map((a) => a.getAttribute('href'))).toEqual([
      '#schedule',
      '#courts',
      '#matchmaking',
      '#tournaments',
      '#rental',
      '#galeri',
      '#faq',
      '#kontak',
    ]);
    fireEvent.click(within(nav).getByRole('link', { name: 'Turnamen' }));
    expect(scrolled).toEqual(['tournaments']);
    const book = within(header).getAllByRole('link', { name: 'Book Now' })[0];
    expect(book).toHaveAttribute('href', '#beranda');
    expect(book.className).toContain('bg-(--tpl-accent)');
    const toggle = within(header).getByRole('button', { name: 'Buka menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle.className).toContain('h-11 w-11');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAccessibleName('Tutup menu');
    expect(within(header).getAllByRole('navigation', { name: 'Menu utama' })).toHaveLength(2);
    const panel = document.getElementById(toggle.getAttribute('aria-controls')!)!;
    expect(panel).toHaveAttribute('aria-label', 'Menu utama');
    expect(within(panel).getAllByRole('link').map((a) => a.textContent)).toEqual([
      '01Jadwal',
      '02Lapangan',
      '03Cari lawan',
      '04Turnamen',
      '05Sewa',
      '06Galeri',
      '07FAQ',
      '08Lokasi',
      'Book Now',
    ]);
    fireEvent.click(within(panel).getByRole('link', { name: 'Lapangan' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(scrolled).toEqual(['tournaments', 'courts']);
    fireEvent.click(toggle);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
    // Book Now di menu atas: gulir ke hero lalu fokus ke isian Tanggal bilah booking
    fireEvent.click(book);
    // hero = gulir ke akar template (bukan elemen section)
    expect(scrolled).toEqual(['tournaments', 'courts', null]);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 700));
    });
    expect(within(section(container, 'hero')).getByLabelText('Tanggal')).toHaveFocus();
  });

  it('bilah booking: galat + fokus, tanggal lampau ditolak, pesan siap dengan ringkasan, Buka WhatsApp, Ubah', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 28, 10, 0));
    const container = demo();
    const hero = section(container, 'hero');
    const form = within(hero).getByRole('form', { name: 'Booking cepat' });
    const date = within(form).getByLabelText('Tanggal');
    expect(date).toHaveAttribute('type', 'date');
    expect(date).toHaveAttribute('min', '2026-10-28');
    const time = within(form).getByLabelText('Jam mulai') as HTMLSelectElement;
    expect(Array.from(time.options).map((o) => o.value)).toHaveLength(19);
    expect(time.options[1].value).toBe('06.00');
    expect(within(form).getByRole('group', { name: 'Lapangan' })).toBeInTheDocument();
    expect(within(form).getByLabelText('Indoor')).toBeChecked();
    expect(within(form).getByLabelText('4')).toBeChecked();
    act(() => {
      fireEvent.submit(form);
    });
    expect(date).toHaveAttribute('aria-invalid', 'true');
    expect(date).toHaveAttribute('aria-describedby', `${date.id}-error`);
    expect(date).toHaveFocus();
    expect(form.textContent).toContain('Pilih tanggal main.');
    expect(form.textContent).toContain('Pilih jam mulai.');
    fireEvent.change(date, { target: { value: '2026-10-01' } });
    expect(date).not.toHaveAttribute('aria-invalid');
    fireEvent.change(time, { target: { value: '19.00' } });
    act(() => {
      fireEvent.submit(form);
    });
    expect(form.textContent).toContain('Tanggal sudah lewat.');
    fireEvent.change(date, { target: { value: '2026-11-14' } });
    fireEvent.click(within(form).getByLabelText('Outdoor'));
    fireEvent.click(within(form).getByLabelText('2'));
    act(() => {
      fireEvent.submit(form);
    });
    const sent = hero.querySelector<HTMLElement>('[data-sp-booking="sent"]')!;
    expect(sent).not.toBeNull();
    // Hero hanya punya H1: judul hasil berupa <p> yang bisa difokus
    expect(hero.querySelector('h2, h3')).toBeNull();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(within(sent).getByText('Pesan booking siap')).toHaveFocus();
    expect(Array.from(within(sent).getByRole('list', { name: 'Ringkasan booking' }).querySelectorAll('li')).map((li) => li.textContent)).toEqual([
      'Sabtu, 14 November 2026',
      'Outdoor',
      'Mulai 19.00',
      '2 pemain',
    ]);
    const message = bookingMessage({ date: '2026-11-14', court: 'Outdoor', time: '19.00', players: '2' }, CLUB);
    expect(decoded(within(sent).getByRole('link', { name: 'Buka WhatsApp' }))).toBe(`${WA}${message}`);
    expect(sent.textContent).toContain('Pesan belum terkirim sebelum Anda menekan kirim di WhatsApp.');
    fireEvent.click(within(sent).getByRole('button', { name: 'Ubah' }));
    const again = within(hero).getByRole('form', { name: 'Booking cepat' });
    expect((within(again).getByLabelText('Tanggal') as HTMLInputElement).value).toBe('2026-11-14');
    expect(within(again).getByLabelText('Outdoor')).toBeChecked();
    expect((within(again).getByLabelText('Jam mulai') as HTMLSelectElement).value).toBe('19.00');
  });

  it('jadwal & harga: tab role=tab (panah, Home/End), panel berganti, garis neon, Book per sesi ke WhatsApp, catatan contoh', () => {
    const schedule = section(demo(), 'schedule');
    expect(schedule.querySelector('h2')!.textContent).toBe('Harga per jam, jelas sebelum main');
    expect(schedule.querySelector('p')!.textContent).toBe('//Jadwal');
    expect(Array.from(schedule.querySelectorAll('dt')).map((dt) => dt.textContent)).toEqual(['Buka', 'Lapangan', 'Durasi', 'Pemain']);
    expect(schedule.textContent).toContain('Contoh jadwal dan harga. Ketersediaan dikonfirmasi admin lewat WhatsApp.');
    const board = schedule.querySelector('[data-tpl-tone="inverse"]')!;
    expect(board.className).toContain('rounded-[14px]');
    const tablist = within(schedule).getByRole('tablist', { name: 'Pilih hari' });
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Senin–Jumat', 'Sabtu, Minggu & libur']);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveAttribute('tabindex', '0');
    expect(tabs[1]).toHaveAttribute('tabindex', '-1');
    const panelOf = () => document.getElementById(within(tablist).getAllByRole('tab')[0].getAttribute('aria-controls')!)!;
    expect(panelOf()).toHaveAttribute('role', 'tabpanel');
    expect(panelOf()).toHaveAttribute('aria-labelledby', tabs[0].id);
    expect(panelOf().querySelectorAll('li')).toHaveLength(4);
    const bar = tablist.querySelector<HTMLElement>('.sp-tab-bar')!;
    expect(bar.style.getPropertyValue('--sp-tab')).toBe('0');
    expect(tablist.querySelector('.sp-tab-sweep')).toHaveAttribute('data-sweep', 'false');
    const first = within(panelOf()).getByRole('link', { name: 'Book Senin–Jumat Off-peak 06.00–16.00' });
    expect(decoded(first)).toBe(`${WA}${scheduleMessage(CLUB, 'Senin–Jumat', { label: 'Off-peak', time: '06.00–16.00', price: 'Rp300.000' }, '/jam')}`);
    expect(panelOf().textContent).toContain('Paling ramai');
    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveFocus();
    expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
    expect(panelOf()).toHaveAttribute('aria-labelledby', tabs[1].id);
    expect(panelOf().querySelectorAll('li')).toHaveLength(3);
    expect(within(panelOf()).getByRole('link', { name: 'Book Sabtu, Minggu & libur Pagi 06.00–12.00' })).toBeInTheDocument();
    expect(bar.style.getPropertyValue('--sp-tab')).toBe('1');
    expect(tablist.querySelector('.sp-tab-sweep')).toHaveAttribute('data-sweep', 'true');
    fireEvent.keyDown(tabs[1], { key: 'ArrowRight' });
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs[0], { key: 'End' });
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs[1], { key: 'Home' });
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(tabs[1]);
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('lapangan: pita biru-malam, tab Indoor/Outdoor dengan jumlah, kartu gelap radius 14 dengan spesifikasi', () => {
    const courts = section(demo(), 'courts');
    expect(courts.getAttribute('data-tpl-tone')).toBe('inverse');
    const tablist = within(courts).getByRole('tablist', { name: 'Jenis lapangan' });
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Indoor2', 'Outdoor2']);
    const names = () => Array.from(courts.querySelectorAll('article h3')).map((h) => h.textContent);
    expect(names()).toEqual(['Court 1–2 Panorama', 'Court 3–4 Arena']);
    const card = courts.querySelector('article')!;
    expect(card.className).toContain('rounded-[14px]');
    expect(card.className).toContain('ring-white/10');
    expect(Array.from(card.querySelectorAll('dt')).map((dt) => dt.textContent)).toEqual(['Permukaan', 'Lampu', 'Ukuran']);
    // Chip kaca jenis lapangan di atas foto
    expect(card.querySelector('img')!.parentElement!.textContent).toBe('Indoor');
    const panel = document.getElementById(tabs[0].getAttribute('aria-controls')!)!;
    expect(panel).toHaveAttribute('role', 'tabpanel');
    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveFocus();
    expect(names()).toEqual(['Court 5 Open Air', 'Court 6 Rooftop']);
    fireEvent.keyDown(tabs[1], { key: 'Home' });
    expect(names()).toEqual(['Court 1–2 Panorama', 'Court 3–4 Arena']);
  });

  it('cari lawan main: tangga level 1–7 (radio), galat + fokus, penjelasan level, pesan WhatsApp, ubah data', async () => {
    const container = demo();
    const mm = section(container, 'matchmaking');
    expect(mm.querySelector('h2')!.textContent).toBe('Belum punya lawan? Kami carikan.');
    expect(Array.from(mm.querySelectorAll('ol > li')).map((li) => li.textContent)).toEqual(['01Pilih level 1–7', '02Pilih hari dan jam', '03Admin memasangkan lewat WhatsApp']);
    const form = within(mm).getByRole('form', { name: 'Cari lawan main' });
    expect(form.getAttribute('action')).toBeNull();
    expect(form.querySelector('.sp-levels')).not.toBeNull();
    expect(form.querySelectorAll('.sp-level')).toHaveLength(7);
    expect(within(form).getByRole('group', { name: 'Level Anda' })).toBeInTheDocument();
    expect(mm.textContent).toContain('Formulir ini hanya menyusun pesan WhatsApp untuk admin; data tidak disimpan di website.');
    act(() => {
      fireEvent.submit(form);
    });
    expect(form.textContent).toContain('Pilih level Anda.');
    expect(form.textContent).toContain('Tulis nama Anda.');
    expect(within(form).getByLabelText('Level 1: Pemula')).toHaveFocus();
    expect(within(form).getByLabelText('Nama')).toHaveAttribute('aria-invalid', 'true');
    fireEvent.click(within(form).getByLabelText('Level 3: Menengah'));
    expect(form.textContent).toContain('Menengah — Servis stabil, mulai berani main di net.');
    expect(form.textContent).not.toContain('Pilih level Anda.');
    act(() => {
      fireEvent.submit(form);
    });
    expect(within(form).getByLabelText('Nama')).toHaveFocus();
    fireEvent.change(within(form).getByLabelText('Nama'), { target: { value: 'Rina' } });
    fireEvent.change(within(form).getByLabelText('Hari'), { target: { value: 'Sabtu' } });
    fireEvent.change(within(form).getByLabelText('Jam'), { target: { value: 'Malam (18.00–24.00)' } });
    act(() => {
      fireEvent.submit(form);
    });
    const heading = within(mm).getByRole('heading', { level: 3, name: 'Pesan siap dikirim' });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(heading).toHaveFocus();
    const message = mm.querySelector('pre')!.textContent!;
    expect(message).toBe('Halo Sparring Padel, saya ingin dicarikan lawan atau pasangan main padel.\n\nNama: Rina\nLevel: 3 – Menengah\nHari: Sabtu\nJam: Malam (18.00–24.00)');
    expect(decoded(within(mm).getByRole('link', { name: 'Buka WhatsApp' }))).toBe(`${WA}${message}`);
    fireEvent.click(within(mm).getByRole('button', { name: 'Ubah data' }));
    const again = within(mm).getByRole('form', { name: 'Cari lawan main' });
    expect((within(again).getByLabelText('Nama') as HTMLInputElement).value).toBe('Rina');
    expect(within(again).getByLabelText('Level 3: Menengah')).toBeChecked();
  });

  it('turnamen (ubin tanggal, Daftar ke WhatsApp), sewa (ubin harga, ikon), komunitas (angka, strip kegiatan)', () => {
    const container = demo();
    const tour = section(container, 'tournaments');
    expect(Array.from(tour.querySelectorAll('h3')).map((h) => h.textContent)).toEqual([
      'Americano Malam Minggu',
      'Liga Ganda Putra',
      'Ladies Day Mexicano',
      'Sparring Cup Akhir Tahun',
    ]);
    const tile = tour.querySelector('li [data-tpl-tone="inverse"]')!;
    expect(tile.textContent).toBe('14Nov');
    const daftar = within(tour).getByRole('link', { name: 'Daftar Americano Malam Minggu' });
    expect(decoded(daftar)).toBe(`${WA}${tournamentMessage(CLUB, { day: '14', month: 'Nov', title: 'Americano Malam Minggu', category: 'Campuran · Level 2–4' })}`);
    expect(tour.textContent).toContain('Rp150.000/orang · 24 pemain');
    expect(tour.textContent).toContain('Jadwal turnamen contoh; pendaftaran dikonfirmasi admin lewat WhatsApp.');
    const rental = section(container, 'rental');
    const tiles = Array.from(rental.querySelectorAll('ul > li'));
    expect(tiles.map((li) => li.textContent)).toEqual([
      'Raket padelRp50.000/sesi',
      'Bola (1 tabung)Rp90.000/tabung',
      'Sepatu padelRp40.000/sesi',
      'Coaching privatRp350.000/jam',
      'Kelas pemula (grup)Rp150.000/orang',
    ]);
    // 5 ubin di kisi 2 kolom: ubin terakhir melebar (tanpa sel kosong)
    expect(tiles[4].className).toContain('@xl:last:odd:col-span-2');
    expect(within(rental).getByRole('link', { name: /Tanya stok lewat WhatsApp/ }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/6281234567890\?text=/);
    expect(decoded(within(rental).getByRole('link', { name: /Tanya stok/ }))).toBe(`${WA}Halo Sparring Padel, saya ingin menyewa perlengkapan padel.`);
    const community = section(container, 'community');
    expect(community.getAttribute('data-tpl-tone')).toBe('inverse');
    expect(Array.from(community.querySelectorAll('dt')).map((dt) => dt.textContent)).toEqual(['Member komunitas', 'Match per minggu', 'Lapangan', 'Turnamen per tahun']);
    expect(community.querySelector('dd')!.textContent).toContain('1.200+');
    expect(within(community).getByRole('list', { name: 'Kegiatan komunitas' }).querySelectorAll('li')).toHaveLength(7);
    expect(decoded(within(community).getByRole('link', { name: 'Gabung grup komunitas' }))).toBe(`${WA}Halo Sparring Padel, saya ingin bergabung dengan grup komunitas.`);
    // Galeri bertingkat dengan rasio asli foto demo
    const gallery = section(container, 'gallery');
    expect(gallery.querySelector('ul')!.className).toContain('columns-2');
    expect(gallery.querySelectorAll('figure')).toHaveLength(6);
    expect(gallery.querySelector('figure > div')!.className).toContain('aspect-[4/5]');
  });

  it('akordeon tanya jawab: aria-expanded/aria-controls, panel role=region, satu terbuka, tautan WhatsApp', () => {
    const faq = section(demo(), 'faq');
    const buttons = within(faq).getAllByRole('button');
    expect(buttons).toHaveLength(5);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'true');
    expect(buttons[0].closest('h3')).not.toBeNull();
    const region = document.getElementById(buttons[0].getAttribute('aria-controls')!)!;
    expect(region).toHaveAttribute('role', 'region');
    expect(region).toHaveAttribute('data-open', 'true');
    expect(region.className).toContain('sp-collapse');
    fireEvent.click(buttons[2]);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'false');
    expect(buttons[2]).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(buttons[0].getAttribute('aria-controls')!)).toHaveAttribute('data-open', 'false');
    fireEvent.click(buttons[2]);
    expect(buttons.every((b) => b.getAttribute('aria-expanded') === 'false')).toBe(true);
    expect(within(faq).getByRole('link', { name: /Tanya lewat WhatsApp/ }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/6281234567890\?text=/);
    cleanup();
    const noWa = section(demo({ contact: { whatsapp: '' } }), 'faq');
    expect(within(noWa).queryByRole('link', { name: /Tanya lewat WhatsApp/ })).toBeNull();
    cleanup();
    const custom = section(demo({ contact: { whatsapp: '' }, faq: { link_url: '#kontak', link_label: 'Hubungi kami' } }), 'faq');
    expect(within(custom).getByRole('link', { name: 'Hubungi kami' })).toHaveAttribute('href', '#kontak');
  });

  it('lokasi & footer: baris kontak ≥ 44px, tombol WhatsApp unik, footer biru-malam dengan menu, media sosial, catatan jujur', () => {
    const container = demo();
    const contact = section(container, 'contact');
    expect(Array.from(contact.querySelectorAll('dt')).map((dt) => dt.textContent)).toEqual(['Alamat', 'Jam buka', 'Telepon', 'Email']);
    for (const name of ['0812-3456-7890', 'booking@sparringpadel.test']) {
      const link = within(contact).getByRole('link', { name });
      expect(link.className).toContain('py-3');
      expect(link.className).toContain('-my-3');
    }
    expect(within(contact).getByRole('link', { name: '0812-3456-7890' })).toHaveAttribute('href', 'tel:+6281234567890');
    expect(within(contact).getByRole('link', { name: 'Book via WhatsApp' }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/6281234567890\?text=/);
    // Nama tautan unik: "Chat WhatsApp" hanya tombol melayang Shell
    expect(within(container).getAllByRole('link', { name: 'Chat WhatsApp' })).toHaveLength(1);
    const inverse = Array.from(container.querySelectorAll('[data-tpl-section][data-tpl-tone="inverse"]')).map((el) => el.getAttribute('data-tpl-section'));
    expect(inverse).toEqual(['hero', 'courts', 'community', 'footer']);
    const footer = container.querySelector('footer')!;
    expect(footer.getAttribute('data-tpl-section')).toBe('footer');
    expect(footer.className).toContain('bg-(--sp-night)');
    expect(footer.textContent).toContain(`© ${new Date().getFullYear()} Sparring Padel`);
    expect(footer.textContent).toContain('tidak ada pembayaran online dan tidak ada akun member');
    expect(Array.from(within(footer).getByRole('navigation', { name: 'Tautan footer' }).querySelectorAll('a')).map((a) => a.getAttribute('href'))).toContain('#schedule');
    expect(within(footer).getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://instagram.com/sparringpadel.contoh');
    expect(within(footer).getByRole('link', { name: 'YouTube' })).toHaveAttribute('href', 'https://youtube.com/@sparringpadel.contoh');
    expect(within(footer).getByRole('link', { name: 'TikTok' })).toHaveAttribute('href', 'https://tiktok.com/@sparringpadel.contoh');
    expect(within(footer).queryByRole('link', { name: 'Facebook' })).toBeNull();
    expect(within(footer).queryByRole('link', { name: 'LinkedIn' })).toBeNull();
    for (const link of footer.querySelectorAll('nav a, a[href^="mailto:"], a[href^="https://wa.me"], ul[aria-label="Media sosial"] a')) {
      expect(link.className, link.textContent ?? '').toMatch(/min-h-11|h-11/);
    }
  });

  it('datar: tidak ada kelas shadow di template (kecuali tombol melayang Shell), kode tanpa kirim/simpan data', () => {
    const container = demo();
    const shadows = Array.from(container.querySelectorAll('[class*="shadow"]')).filter(
      (el) => !el.closest('[aria-label="Chat WhatsApp"]') && !/Chat WhatsApp|Kembali ke atas/.test(el.getAttribute('aria-label') ?? ''),
    );
    expect(shadows.map((el) => el.className)).toEqual([]);
    const source = sourceText();
    expect(source).not.toMatch(/\bshadow-|box-shadow|text-shadow|drop-shadow/);
    // Kode (tanpa komentar): tanpa framer-motion/router, formulir tidak mengirim atau menyimpan apa pun
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/framer-motion|useLocation|useParams|localStorage|sessionStorage|fetch\(|XMLHttpRequest|sendBeacon|<form[^>]*\saction=/);
    // Hanya impor dari shared/kit/types dan file sendiri
    for (const [, from] of code.matchAll(/from '(\.\.\/[^']+)'/g)) expect(from, from).toMatch(/^\.\.\/(shared|kit)\/|^\.\.\/types$/);
  });
});

describe('Sparring Padel: gerak', () => {
  it('pratinjau CMS diam dan tanpa tautan wa.me terbuka', () => {
    const { container } = render(<def.Component content={resolveContent(def, null)} preview />);
    expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'off');
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    expect(container.querySelector('a[href^="javascript:"], a[href^="vbscript:"]')).toBeNull();
  });

  it("sparring-padel.css: animasi bergerbang [data-tpl-motion='on'], blok reduced-motion & cetak, kelas sp-, keadaan diam = keadaan akhir", () => {
    const css = readFileSync(resolve(ROOT, 'src/templates/sparring-padel/sparring-padel.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).toContain('@layer components');
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(css).toMatch(/@media print/);
    for (const name of ['sp-draw', 'sp-pop', 'sp-rise', 'sp-sweep', 'sp-fade', 'sp-light']) expect(css).toMatch(new RegExp(`@keyframes ${name}\\b`));
    // Garis utuh tanpa gerak (dashoffset 0); garis neon tab di posisi tab aktif
    expect(css).toMatch(/\.sp-court-line\s*\{\s*stroke-dasharray: 1;\s*stroke-dashoffset: 0;/);
    expect(css).toMatch(/\.sp-arc-reveal\s*\{\s*stroke-dasharray: 1;\s*stroke-dashoffset: 0;/);
    expect(css).toMatch(/\.sp-tab-bar\s*\{\s*transform: translateX\(calc\(var\(--sp-tab, 0\) \* 100%\)\);/);
    for (const rule of css.match(/^\s*[^@\s{}][^{}]*\{[^}]*\b(transition|animation):[^}]*\}/gm) ?? []) {
      const selector = rule.split('{')[0];
      if (/transition:\s*none|animation:\s*none/.test(rule)) continue;
      expect(selector, rule).toContain("[data-tpl-motion='on']");
    }
    // Semua animasi bergerbang punya pasangan "animation: none" di blok reduced-motion
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'), css.indexOf('@media print'));
    for (const cls of ['.sp-court-line', '.sp-arc-reveal', '.sp-ball', '.sp-rise', '.sp-tab-sweep', '.sp-fade', '.sp-level', '.sp-tab-bar', '.sp-collapse']) expect(reduced, cls).toContain(cls);
    for (const cls of css.match(/\.[a-z][\w-]*/g) ?? []) expect(cls, cls).toMatch(/^\.(sp-|tpl-)/);
    // Durasi: gerak dekoratif ≤ 1,6 dtk, sekali jalan; transisi UI ≤ 1 dtk; tanpa bayangan
    for (const [, seconds] of css.matchAll(/animation:\s*sp-[a-z]+\s+([\d.]+)s/g)) expect(Number(seconds)).toBeLessThanOrEqual(1.6);
    for (const [, seconds] of css.matchAll(/transition:\s*[a-z-]+\s+([\d.]+)s/g)) expect(Number(seconds)).toBeLessThanOrEqual(1);
    expect(css).not.toMatch(/infinite/);
    expect(css).not.toMatch(/shadow/);
    // Foto hero (LCP) tidak pernah dianimasikan: tidak ada aturan untuk img hero / kelas foto di CSS template
    expect(css).not.toMatch(/\bimg\b|clip-path/);
  });
});

describe('Sparring Padel: warna tema bisa diganti', () => {
  it('aqua bawaan → --tpl-accent; warna CMS mengalir ke biru-malam, neon, dan tinta; teks di aksen kontras', () => {
    const base = demo();
    expect(rootStyle(base, '--tpl-accent')).toBe('#00d2b4');
    expect(rootStyle(base, '--tpl-on-accent')).toBe('#121620');
    expect(rootStyle(base, '--sp-night')).toBe('#051622');
    expect(rootStyle(base, '--sp-neon')).toBe('#00d2b4');
    expect(rootStyle(base, '--sp-ink')).toBe('#007c6a');
    cleanup();
    const violet = demo({ brand: { accent_color: '#7C3AED' } });
    expect(rootStyle(violet, '--tpl-accent')).toBe('#7c3aed');
    for (const name of ['--sp-night', '--sp-neon', '--sp-ink']) {
      expect(rootStyle(violet, name), name).toBe((sparringVars('#7C3AED') as Record<string, string>)[name]);
    }
    expect(rootStyle(violet, '--sp-night')).not.toBe('#051622');
    cleanup();
    expect(rootStyle(demo({ brand: { accent_color: '#FACC15' } }), '--tpl-on-accent')).toBe('#121620');
  });
});

describe('Sparring Padel: SEO situs pembeli, judul, gambar, tautan', () => {
  it('judul tab & meta description dari nama, tagline, dan deskripsi hero; theme-color = aksen', () => {
    expect(siteTitle(CODE, null)).toBe('Sparring Padel — Lapangan Padel Kemang, Jakarta Selatan');
    expect(siteTitle(CODE, null).length).toBeLessThanOrEqual(60);
    const restore = applySiteHead(CODE, null);
    const description = document.head.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
    expect(description).toMatch(/^Enam lapangan indoor dan outdoor di Kemang/);
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(200);
    expect(document.head.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#00D2B4');
    restore();
  });

  it('satu H1, tiap section diawali tepat satu H2, H3 hanya di bawah H2, tanpa h4–h6; judul kosong → H2 sr-only', () => {
    const container = demo();
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelectorAll('h4, h5, h6')).toHaveLength(0);
    for (const key of ORDER.filter((k) => k !== 'hero')) {
      const levels = Array.from(section(container, key).querySelectorAll('h1, h2, h3')).map((h) => h.tagName);
      expect(levels[0], key).toBe('H2');
      expect(levels.filter((l) => l === 'H2'), key).toHaveLength(1);
    }
    expect(section(container, 'hero').querySelector('h2, h3')).toBeNull();
    cleanup();
    const keys = ORDER.filter((k) => k !== 'hero');
    const untitled = demo(Object.fromEntries(keys.map((k) => [k, { title: '', eyebrow: '', subtitle: '' }])));
    for (const key of keys) {
      const levels = Array.from(section(untitled, key).querySelectorAll('h1, h2, h3')).map((h) => h.tagName);
      expect(levels[0], key).toBe('H2');
      expect(levels.filter((l) => l === 'H2'), key).toHaveLength(1);
      expect(section(untitled, key).querySelector('h2'), key).toHaveClass('sr-only');
    }
    expect(keys.map((k) => section(untitled, k).querySelector('h2')!.textContent)).toEqual([
      'Jadwal & harga',
      'Lapangan',
      'Cari lawan main',
      'Turnamen',
      'Sewa & coaching',
      'Komunitas',
      'Galeri',
      'Tanya jawab',
      'Lokasi',
    ]);
  });

  it('gambar: alt deskriptif, width/height, srcset & sizes', () => {
    const container = demo();
    const imgs = Array.from(container.querySelectorAll('img'));
    expect(imgs.length).toBeGreaterThanOrEqual(11);
    for (const img of imgs) {
      const src = img.getAttribute('src') ?? '';
      expect(Number(img.getAttribute('width')), src).toBeGreaterThan(0);
      expect(Number(img.getAttribute('height')), src).toBeGreaterThan(0);
      expect(img.getAttribute('srcset'), src).toMatch(/ 800w, /);
      expect(img.getAttribute('sizes'), src).toBeTruthy();
      expect((img.getAttribute('alt') ?? '').split(' ').length, src).toBeGreaterThanOrEqual(5);
    }
  });

  it('tautan asli untuk navigasi, tombol hanya untuk aksi (kecuali kirim formulir); SVG dekoratif tersembunyi', () => {
    const container = demo();
    for (const a of container.querySelectorAll('a')) expect(a.getAttribute('href'), a.textContent ?? '').toMatch(/^(#[a-z]|https:\/\/|mailto:|tel:)/);
    for (const button of container.querySelectorAll('button')) {
      expect(button.getAttribute('type'), button.textContent ?? '').toBe(button.closest('form') && /Book Now|WhatsApp|Susun pesan/.test(button.textContent ?? '') ? 'submit' : 'button');
    }
    expect(container.querySelectorAll('button[type="submit"]')).toHaveLength(2);
    for (const svg of container.querySelectorAll('svg')) expect(svg.closest('[aria-hidden="true"], [aria-hidden=""]') ?? svg.getAttribute('aria-hidden'), svg.outerHTML.slice(0, 60)).toBeTruthy();
  });
});

describe('Sparring Padel: konten opsional kosong', () => {
  it('hero tanpa foto → latar cadangan; tanpa teks tombol menu atas → tanpa Book Now di header; judul bilah kosong → nama bawaan', () => {
    const container = demo({ hero: { image: '', header_label: '', booking_title: '', booking_button: '', subtitle: '', primary_label: '' } });
    const hero = section(container, 'hero');
    expect(hero.querySelector('img')).toBeNull();
    expect(hero.className).toContain('sp-hero-fallback');
    expect(within(container.querySelector('header')!).queryByRole('link', { name: 'Book Now' })).toBeNull();
    const form = within(hero).getByRole('form', { name: 'Booking cepat' });
    expect(within(form).getByRole('button', { name: 'Book Now' })).toBeInTheDocument();
    expect(within(hero).queryByRole('link', { name: 'Lihat jadwal & harga' })).toBeNull();
    expect(within(hero).getByRole('link', { name: 'Cari lawan main' })).toBeInTheDocument();
    // Jam buka sendiri → pilihan jam mengikuti
    cleanup();
    const late = section(demo({ hero: { booking_hours: '16.00–22.00' } }), 'hero');
    expect(Array.from((within(late).getByLabelText('Jam mulai') as HTMLSelectElement).options).map((o) => o.value)).toEqual(['', '16.00', '17.00', '18.00', '19.00', '20.00', '21.00']);
  });

  it('jadwal satu daftar → tanpa tab; lapangan satu jenis → tanpa tab; turnamen/sewa/komunitas tanpa foto → kolom penuh', () => {
    const container = demo({
      schedule: { weekend: [], facts: [], note: '' },
      courts: { items: [{ type: 'Indoor', name: 'Court A', image: '', surface: 'Rumput' }] },
      tournaments: { image: '' },
      rental: { image: '' },
      community: { image: '' },
    });
    const schedule = section(container, 'schedule');
    expect(within(schedule).queryByRole('tablist')).toBeNull();
    expect(schedule.textContent).toContain('Senin–Jumat');
    expect(schedule.querySelector('dl')).toBeNull();
    const courts = section(container, 'courts');
    expect(within(courts).queryByRole('tablist')).toBeNull();
    expect(courts.querySelectorAll('article')).toHaveLength(1);
    expect(courts.querySelector('img')).toBeNull();
    expect(Array.from(courts.querySelectorAll('dt')).map((dt) => dt.textContent)).toEqual(['Permukaan']);
    expect(section(container, 'tournaments').querySelector('img')).toBeNull();
    const rental = section(container, 'rental');
    expect(rental.querySelector('img')).toBeNull();
    expect(rental.innerHTML).toContain('@5xl:col-span-12');
    expect(rental.querySelector('ul > li:last-child')!.className).toContain('@5xl:last:odd:col-span-1');
    const community = section(container, 'community');
    expect(community.querySelector('img')).toBeNull();
    expect(community.querySelector('dl')!.className).toContain('@5xl:grid-cols-4');
  });

  it('galeri tanpa foto disaring, footer tanpa media sosial, section kosong keluar dari halaman & menu', () => {
    const container = demo({
      gallery: { items: [{ image: '', caption: 'kosong' }, { image: '/assets/templates/photos/sparring-padel-galeri-bola-1200.webp', caption: 'Bola' }] },
      footer: { instagram: '', youtube: '', tiktok: '', note: '' },
      matchmaking: { levels: [], steps: [] },
    });
    const gallery = section(container, 'gallery');
    expect(gallery.querySelectorAll('img')).toHaveLength(1);
    expect(gallery.querySelector('figcaption')!.textContent).toBe('Bola');
    expect(gallery.querySelector('figure > div')!.className).toContain('aspect-[3/2]');
    const footer = container.querySelector('footer')!;
    expect(within(footer).queryByRole('list', { name: 'Media sosial' })).toBeNull();
    expect(footer.textContent).not.toContain('akun member');
    const mm = section(container, 'matchmaking');
    expect(mm.querySelector('ol')).toBeNull();
    expect(within(mm).getByLabelText('Level 7: Level 7')).toBeInTheDocument();
    cleanup();
    const hidden = demo({ gallery: { items: [] }, faq: { enabled: false }, tournaments: { items: [] }, footer: { enabled: false } });
    expect(sectionKeys(hidden)).not.toContain('gallery');
    expect(sectionKeys(hidden)).not.toContain('faq');
    expect(sectionKeys(hidden)).not.toContain('tournaments');
    expect(hidden.querySelector('footer')).toBeNull();
    expect(Array.from(hidden.querySelector('header nav')!.querySelectorAll('a')).map((a) => a.getAttribute('href'))).toEqual([
      '#schedule',
      '#courts',
      '#matchmaking',
      '#rental',
      '#kontak',
    ]);
  });

  it('tanpa WhatsApp → email; tanpa WhatsApp & email → salin pesan (booking & cari lawan); Book jadwal → bilah booking', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 28, 10, 0));
    const book = (root: HTMLElement) => {
      const form = within(root).getByRole('form', { name: 'Booking cepat' });
      fireEvent.change(within(form).getByLabelText('Tanggal'), { target: { value: '2026-11-14' } });
      fireEvent.change(within(form).getByLabelText('Jam mulai'), { target: { value: '08.00' } });
      act(() => {
        fireEvent.submit(form);
      });
    };
    const container = demo({ contact: { whatsapp: '' } });
    book(section(container, 'hero'));
    expect(within(section(container, 'hero')).getByRole('link', { name: 'Kirim lewat email' }).getAttribute('href')).toMatch(
      /^mailto:booking@sparringpadel\.test\?subject=Booking%20lapangan%20padel&body=Halo%20Sparring%20Padel/,
    );
    const mm = section(container, 'matchmaking');
    expect(within(mm).getByRole('button', { name: 'Susun pesan' })).toHaveAttribute('type', 'submit');
    // Tombol Book jadwal tanpa WhatsApp → ke bilah booking hero
    expect(within(section(container, 'schedule')).getAllByRole('link', { name: /^Book / })[0]).toHaveAttribute('href', '#beranda');
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    cleanup();
    const bare = demo({ contact: { whatsapp: '', email: '' } });
    book(section(bare, 'hero'));
    expect(within(section(bare, 'hero')).getByRole('button', { name: 'Salin pesan' })).toBeInTheDocument();
    const form = within(section(bare, 'matchmaking')).getByRole('form');
    fireEvent.click(within(form).getByLabelText('Level 2: Pemula+'));
    fireEvent.change(within(form).getByLabelText('Nama'), { target: { value: 'Dodi' } });
    act(() => {
      fireEvent.submit(form);
    });
    expect(within(section(bare, 'matchmaking')).getByRole('button', { name: 'Salin pesan' })).toBeInTheDocument();
  });
});

describe('Sparring Padel: editor CMS', () => {
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
      const seen: Record<string, number> = {};
      if (s.toggleable) expect(box.getByRole('switch', { name: `Tampilkan bagian ${s.label} di situs` })).toBeInTheDocument();
      for (const f of s.fields) {
        expect(container.textContent, `${s.key}.${f.key}`).toContain(f.label);
        if (!isListField(f)) continue;
        // Dua daftar sesi jadwal memakai label item yang sama ("Sesi")
        expect(box.getAllByRole('button', { name: new RegExp(`Tambah ${f.itemLabel}`, 'i') }).length).toBeGreaterThan(0);
        // Buka item 1 dari daftar INI (daftar ke-n dengan label item yang sama)
        const nth = (seen[f.itemLabel] = (seen[f.itemLabel] ?? -1) + 1);
        fireEvent.click(box.getAllByRole('button', { name: new RegExp(`^${f.itemLabel} 1(?![0-9])`) })[nth]);
        for (const sub of f.fields) expect(container.textContent, `${s.key}.${f.key}.${sub.key}`).toContain(sub.label);
      }
      unmount();
    }
  }, 60_000);
});

describe('Sparring Padel: data katalog', () => {
  const FILE = 'database/migrations/2026-10-28_041_sparring_padel_template.sql';
  const raw = () => readFileSync(resolve(ROOT, FILE), 'utf8');

  it('migrasi 041: baris sparring-padel dengan template_code, kategori, harga, pratinjau, galeri, fitur, salinan jujur', () => {
    const text = raw();
    expect(text).toContain("'sparring-padel'");
    expect(text).toContain("'Olahraga & Komunitas'");
    expect(text).toContain('1390000.00');
    expect(text).toContain("'/assets/templates/sparring-padel-preview.webp'");
    expect(text).toContain('\'["/assets/templates/sparring-padel-1.webp","/assets/templates/sparring-padel-2.webp"]\'');
    expect(text).toMatch(/booking hanya menyusun pesan ke admin/);
    expect(text).toMatch(/tidak ada pembayaran online maupun akun member/);
    expect(text).not.toMatch(/termasuk domain|domain, hosting|dijamin|garansi|terbaik|PBSI|\bFIP\b/);
    const features = JSON.parse(/features\s+= '(\[.*?\])'/.exec(text)![1]) as string[];
    expect(features.length).toBeGreaterThanOrEqual(6);
    expect(features.length).toBeLessThanOrEqual(8);
    expect(features.at(-1)).toBe('Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)');
    // Galeri katalog = berkas pratinjau yang ada
    for (const url of JSON.parse(/gallery\s+= '(\[.*?\])'/.exec(text)![1]) as string[]) expect(existsSync(publicFile(url)), url).toBe(true);
  });

  it('migrasi 041 aman diulang (INSERT IGNORE + UPDATE berdasarkan slug, tanpa DELETE) dan tercatat di schema_migrations', () => {
    const text = raw();
    expect(text).toMatch(/Domain\s+(--\s+)?tidak termasuk harga template/);
    expect(text).toMatch(/SETELAH kode/);
    expect(text).toMatch(/MENIMPA perubahan admin/);
    expect(text).toMatch(/FIKTIF/);
    expect(text).toMatch(/Unsplash/);
    const code = text.replace(/^--.*$/gm, '');
    expect(code).toMatch(/INSERT IGNORE INTO templates/);
    expect(code).toMatch(/WHERE slug = 'sparring-padel';/);
    expect(code).toMatch(/sort_order\s+= 24/);
    expect(code).toMatch(/status\s+= 'published'/);
    expect(code).toMatch(/category\s+= 'Olahraga & Komunitas'/);
    expect(code).toMatch(/price\s+= 1390000\.00/);
    expect(code).not.toMatch(/\bDELETE\b|\bDROP\b|\bTRUNCATE\b/);
    expect(code).toContain("VALUES ('2026-10-28_041', 'templates: katalog Sparring Padel')");
  });

  it('gambar pratinjau katalog ada di public/, 1600×1000, VP8/VP8X, dan ringan', () => {
    for (const name of ['sparring-padel-preview', 'sparring-padel-1', 'sparring-padel-2']) {
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

describe('Sparring Padel: konten aneh', () => {
  it('angka, null, dan string di tempat list tidak membuat crash; tautan berbahaya dibuang', () => {
    const weird = {
      hero: { image: 'javascript:alert(1)', highlight: 'tidak ada di judul', primary_url: 'javascript:alert(1)', header_url: 'vbscript:x', booking_hours: 99 },
      schedule: { weekday: 'x', weekend: [null, { label: 3, price: 'Rp1' }], facts: 7 },
      courts: { items: [null, { name: 2 }, { name: 'Court X', type: 5, image: 'javascript:alert(1)' }] },
      matchmaking: { levels: 'x', steps: [null, 'x'] },
      tournaments: { items: [{ title: 'Cup', day: 123456 }, 'x'], image: 'javascript:alert(1)' },
      rental: { items: [{ name: 'Raket', price: null }], link_url: 'javascript:alert(1)' },
      community: { stats: [{ value: 5 }, null], activities: 'x', button_url: 'vbscript:x' },
      gallery: { items: [{ image: 'javascript:alert(1)' }, 'x'] },
      faq: { items: [{ question: 2, answer: null }], link_url: 'vbscript:x' },
      contact: { whatsapp: 'abc', maps_url: 'javascript:alert(1)', email: 'bukan email' },
      footer: { instagram: 'javascript:alert(1)' },
      brand: { accent_color: 'oranye' },
    } as unknown as SiteContent;
    const { container } = render(<def.Component content={resolveContent(def, weird)} />);
    expect(container.querySelector('a[href^="javascript:"], a[href^="vbscript:"]')).toBeNull();
    expect(container.querySelector('img[src^="javascript:"]')).toBeNull();
    expect(container.querySelector('h1')!.textContent).toBe('Pesan lapangan padel, temukan lawan selevel.');
    expect(section(container, 'courts').textContent).toContain('Court X');
    expect(sectionKeys(container)).not.toContain('gallery');
    expect(sectionKeys(container)).not.toContain('faq');
    expect(rootStyle(container, '--sp-night')).toBe('#051622');
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
