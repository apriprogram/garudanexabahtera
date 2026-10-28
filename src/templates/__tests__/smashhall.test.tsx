// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/smashhall.test.tsx
// SmashHall (website GOR & klub badminton 2026-10-28): skema CMS & konten demo, foto, salinan jujur (booking hanya
// menyusun pesan WhatsApp, jadwal contoh, tanpa pembayaran online/akun member/keranjang, tanpa klaim federasi), helper
// model (jam, lapangan, slot penuh, hari ini, pesan WhatsApp booking/member/akademi/toko, formulir), demo (urutan
// section, hero rally + strip, header + menu HP, tab hari + tabel slot dengan keyboard, pilihan periode member,
// akordeon, formulir), datar tanpa bayangan, gerak (pratinjau CMS diam, CSS sh- bergerbang data-tpl-motion), warna
// tema, SEO situs pembeli, judul & gambar & tautan, konten opsional kosong, editor CMS, data katalog (migrasi 042 +
// pratinjau), dan konten aneh.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionEditor } from '../../pages/account/cms/SectionEditor';
import { validateContent } from '../../pages/account/cms/validation';
import { TEMPLATES, resolveContent } from '../index';
import { iconKey } from '../smashhall/icons';
import {
  EMPTY_BOOKING,
  NIGHT,
  PAGE_SECTIONS,
  askMessage,
  bookingFormMessage,
  bookingMailHref,
  bookingMessage,
  cleanText,
  courtsOf,
  displayPhone,
  featuredIndex,
  formatDate,
  joinMessage,
  navItems,
  normalizeHour,
  orderMessage,
  parseFull,
  parseHours,
  planPrice,
  readSmashhall,
  sectionShown,
  sectionTarget,
  slotKey,
  slotLabels,
  smashhallVars,
  splitDate,
  splitLines,
  statusTone,
  todayIndex,
  trainingColumns,
  validateBooking,
  type BookingForm,
} from '../smashhall/model';
import { SMASHHALL_PHOTOS } from '../smashhall/photos';
import { applySiteHead, siteTitle } from '../siteHead';
import { SiteRenderer } from '../SiteRenderer';
import { contrast, parseHex } from '../shared/utils';
import { isListField, type ListItem, type SectionContent, type SiteContent } from '../types';

// Demo panjang + getByRole di jsdom: bisa lewat 5 dtk saat suite berjalan paralel
vi.setConfig({ testTimeout: 30_000 });

const ROOT = process.cwd();
const def = TEMPLATES.smashhall;
const ORDER = ['hero', 'availability', 'facilities', 'membership', 'training', 'academy', 'championships', 'shop', 'gallery', 'faq', 'contact'];
const sectionKeys = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-tpl-section]')).map((s) => s.getAttribute('data-tpl-section'));
const section = (root: HTMLElement, key: string) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`)!;
const demo = (content: unknown = null, preview = false) => render(<SiteRenderer templateCode="smashhall" content={content} preview={preview} />).container;
const rgb = (hex: string) => parseHex(hex)!;
const publicFile = (url: string) => resolve(ROOT, 'public', url.replace(/^\//, ''));
const rootStyle = (container: HTMLElement, name: string) => {
  const holder = Array.from(container.querySelectorAll<HTMLElement>('[style]')).find((el) => el.style.getPropertyValue(name));
  return holder?.style.getPropertyValue(name) ?? '';
};
const urls = (src: string) => {
  const asset = SMASHHALL_PHOTOS.asset(src)!;
  return [asset.src, ...asset.srcSet!.split(',').map((part) => part.trim().split(' ')[0])].filter((u, i, all) => all.indexOf(u) === i);
};
const waText = (el: Element) => decodeURIComponent(el.getAttribute('href') ?? '').replace(/^https:\/\/wa\.me\/6281234567890\?text=/, '');
const WA = /^https:\/\/wa\.me\/6281234567890\?text=/;
/** Rabu 28 Oktober 2026 (strip hero & tab hari memakai "hari ini" bila daftar hari berisi Senin–Minggu) */
const WEDNESDAY = new Date(2026, 9, 28, 10, 0, 0);
const withDate = <T,>(date: Date, run: () => T): T => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(date);
  try {
    return run();
  } finally {
    vi.useRealTimers();
  }
};
const booking = (patch: Partial<BookingForm> = {}): BookingForm => ({ ...EMPTY_BOOKING, purpose: 'Booking lapangan', name: 'Rina', date: '2026-11-14', ...patch });
const HOURS = ['16.00', '17.00', '18.00', '19.00', '20.00', '21.00'];

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

describe('SmashHall: skema & konten bawaan', () => {
  it('urutan form = urutan halaman, semua section bisa disembunyikan, field unik, list berbatas', () => {
    expect(def.code).toBe('smashhall');
    expect(def.name).toBe('SmashHall');
    expect(def.features).toBeUndefined();
    expect(def.sections.map((s) => s.key)).toEqual(['brand', ...ORDER, 'footer']);
    expect([...PAGE_SECTIONS]).toEqual([...ORDER, 'footer']);
    const fields = (key: string) => def.sections.find((s) => s.key === key)!.fields.map((f) => f.key);
    expect(fields('brand')).toEqual(['company_name', 'tagline', 'logo', 'accent_color']);
    expect(def.sections[0].fields.find((f) => f.key === 'accent_color')?.type).toBe('color');
    expect(fields('hero')).toEqual(
      expect.arrayContaining(['image', 'title', 'highlight', 'subtitle', 'primary_label', 'secondary_label', 'header_label', 'strip_title', 'strip_note', 'strip_link']),
    );
    expect(fields('availability')).toEqual(
      expect.arrayContaining(['hours', 'courts', 'days', 'prices', 'free_label', 'full_label', 'chosen_label', 'note', 'button_label']),
    );
    expect(fields('membership')).toEqual(expect.arrayContaining(['monthly_label', 'quarterly_label', 'quarterly_note', 'unit', 'plans', 'note', 'button_label']));
    expect(fields('training')).toEqual(expect.arrayContaining(['columns', 'sessions', 'coaches_title', 'coaches']));
    expect(fields('contact')).toEqual(
      expect.arrayContaining(['address', 'maps_query', 'maps_url', 'phone', 'email', 'whatsapp', 'whatsapp_message', 'hours', 'hours_short', 'form_title', 'form_text', 'form_button']),
    );
    expect(fields('footer')).toEqual(expect.arrayContaining(['description', 'copyright', 'instagram', 'facebook', 'linkedin', 'youtube', 'tiktok']));
    const contact = def.sections.find((s) => s.key === 'contact')!;
    expect(contact.fields.find((f) => f.key === 'whatsapp')?.type).toBe('phone');
    // Pelatih tanpa foto (avatar inisial): tidak ada field gambar di daftar pelatih
    const coaches = def.sections.find((s) => s.key === 'training')!.fields.find((f) => f.key === 'coaches')!;
    expect(isListField(coaches) && coaches.fields.some((f) => f.type === 'image')).toBe(false);
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
    expect(max).toEqual({
      'availability.courts': 8,
      'availability.days': 7,
      'availability.prices': 3,
      'facilities.stats': 4,
      'facilities.items': 10,
      'membership.plans': 3,
      'training.sessions': 10,
      'training.coaches': 4,
      'academy.groups': 3,
      'championships.events': 5,
      'shop.items': 8,
      'gallery.items': 8,
      'faq.items': 8,
    });
  });

  it('konten demo lolos validasi CMS, logo kosong, semua foto terdaftar, ada di public/, dipakai, dan bersimbol sendiri', () => {
    const c = def.defaultContent;
    expect(validateContent(def, resolveContent(def, null))).toEqual({});
    expect(c.brand.logo).toBe('');
    expect(c.brand.accent_color).toBe('#F0542D');
    expect(c.contact.whatsapp).toBe('081234567890');
    expect(c.contact.email).toBe('halo@smashhall.test');
    expect(c.hero.image).toBe('/assets/templates/photos/smashhall-hero-v2-1920.webp');
    for (const s of def.sections) if (s.key !== 'brand') expect(c[s.key].enabled, s.key).toBe(true);
    const photos = JSON.stringify(c).match(/\/assets\/templates\/photos\/[a-z0-9-]+\.webp/g) ?? [];
    for (const src of photos) expect(SMASHHALL_PHOTOS.asset(src), src).not.toBeNull();
    expect(SMASHHALL_PHOTOS.keys).toHaveLength(15);
    for (const key of SMASHHALL_PHOTOS.keys) {
      expect(key.startsWith('smashhall-'), key).toBe(true);
      for (const url of urls(SMASHHALL_PHOTOS.src(key))) expect(existsSync(publicFile(url)), url).toBe(true);
      expect(photos, `${key} dipakai di konten demo`).toContain(SMASHHALL_PHOTOS.src(key));
      expect(SMASHHALL_PHOTOS.alt(SMASHHALL_PHOTOS.src(key), '').split(' ').length, key).toBeGreaterThanOrEqual(5);
    }
    // Simbol bawaan juga tersedia sebagai SVG mandiri, path sama dengan komponen
    const mark = readFileSync(publicFile('/assets/templates/logos/smashhall-mark.svg'), 'utf8');
    const component = readFileSync(resolve(ROOT, 'src/templates/smashhall/marks.tsx'), 'utf8');
    const paths = mark.match(/ d="[^"]+"/g) ?? [];
    expect(paths).toHaveLength(3);
    for (const d of paths) expect(component, d).toContain(d.trim());
    expect(mark).toMatch(/viewBox="0 0 32 32"/);
    expect(mark).toMatch(/role="img"/);
    expect(mark).toMatch(/<title>/);
    expect(mark).toMatch(/fill="currentColor"/);
    // Judul tab situs pembeli ≤ 60 karakter, deskripsi hero 120–155 karakter
    expect(`${c.brand.company_name} — ${c.brand.tagline}`.length).toBeLessThanOrEqual(60);
    expect(String(c.hero.subtitle).length).toBeGreaterThanOrEqual(120);
    expect(String(c.hero.subtitle).length).toBeLessThanOrEqual(155);
    // Angka 8 lapangan di fasilitas = jumlah lapangan di tabel ketersediaan
    expect((c.availability.courts as ListItem[]).length).toBe(8);
    expect((c.facilities.stats as { value: string }[])[0].value).toBe('8');
    // Tujuh hari Senin–Minggu berurutan (strip hero memakai hari ini)
    expect((c.availability.days as { label: string }[]).map((d) => d.label)).toEqual(['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']);
  });

  it('CREDITS.md mencatat setiap kunci foto', () => {
    // CREDITS.md gets this template's section at integration
    const credits = readFileSync(resolve(ROOT, 'public/assets/templates/photos/CREDITS.md'), 'utf8');
    expect(SMASHHALL_PHOTOS.keys.filter((key) => !credits.includes(`\`${key}-*\``))).toEqual([]);
  });

  it('foto demo ringan: hero 800/1280/1920, WebP ≤ 140 KB per file (800w ≤ 90 KB), total ≤ 2,5 MB', () => {
    expect(SMASHHALL_PHOTOS.asset(def.defaultContent.hero.image as string)!.srcSet).toBe(
      '/assets/templates/photos/smashhall-hero-v2-800.webp 800w, /assets/templates/photos/smashhall-hero-v2-1280.webp 1280w, /assets/templates/photos/smashhall-hero-v2-1920.webp 1920w',
    );
    let total = 0;
    for (const key of SMASHHALL_PHOTOS.keys) {
      for (const url of urls(SMASHHALL_PHOTOS.src(key))) {
        expect(url, url).toMatch(/\.webp$/);
        const kb = statSync(publicFile(url)).size / 1024;
        expect(kb, url).toBeLessThanOrEqual(140);
        if (url.endsWith('-800.webp')) expect(kb, url).toBeLessThanOrEqual(90);
        const head = readFileSync(publicFile(url)).subarray(0, 16);
        expect(head.toString('ascii', 0, 4) + head.toString('ascii', 8, 12), url).toBe('RIFFWEBP');
        total += kb;
      }
    }
    expect(total).toBeLessThanOrEqual(2500);
  });

  it('salinan demo jujur & ringkas: hanya pesan WhatsApp, jadwal contoh, tanpa bayar online/akun member/keranjang/klaim federasi', () => {
    const c = def.defaultContent;
    const text = JSON.stringify(c);
    expect(text).not.toMatch(/dijamin|garansi|pasti |terbaik|nomor 1|termurah|#1|100%|PBSI|BWF|bersertifikat|berlisensi|sertifikat|lisensi|terakreditasi|disahkan/i);
    expect(text).toMatch(/data tidak disimpan di website/);
    expect(c.availability.note).toMatch(/Jadwal yang tampil adalah contoh; ketersediaan dikonfirmasi admin/);
    expect(c.availability.note).toMatch(/Booking hanya menyusun pesan WhatsApp, tidak ada pembayaran online/);
    expect(c.hero.strip_note).toMatch(/^Contoh data\./);
    expect(c.membership.note).toMatch(/Tidak ada akun member atau pembayaran online di website/);
    expect(c.shop.note).toMatch(/Tidak ada keranjang belanja atau pembayaran online/);
    expect(c.championships.note).toMatch(/bukan kejuaraan resmi federasi/);
    expect(text).toContain('.test');
    // Pelatih bernama hanya tampil dengan inisial: pengalaman ditulis sebagai teks, bukan lisensi
    for (const coach of c.training.coaches as { years: string }[]) expect(coach.years).toMatch(/^Melatih sejak \d{4}$/);
    // Tidak ramai: H1 ≤ 9 kata, deskripsi hero ≤ 160 huruf, pengantar section satu kalimat pendek, teks kartu ≤ 120
    expect(String(c.hero.title).split(/\s+/).length).toBeLessThanOrEqual(9);
    expect(String(c.hero.subtitle).length).toBeLessThanOrEqual(160);
    for (const key of ORDER.filter((k) => k !== 'hero')) {
      const subtitle = String(c[key].subtitle ?? '');
      expect(subtitle.length, key).toBeLessThanOrEqual(90);
    }
    for (const g of c.academy.groups as { focus: string }[]) expect(g.focus.length).toBeLessThanOrEqual(120);
    for (const p of c.shop.items as { note: string }[]) expect(p.note.length).toBeLessThanOrEqual(120);
    for (const coach of c.training.coaches as { focus: string }[]) expect(coach.focus.length).toBeLessThanOrEqual(120);
    for (const e of c.championships.events as { info: string }[]) expect(e.info.length).toBeLessThanOrEqual(120);
  });
});

describe('SmashHall: helper model', () => {
  it('warna tema: --sh-bright ≥ 4,5:1 di atas tinta untuk berbagai aksen; tidak valid → bawaan', () => {
    expect(smashhallVars('#F0542D')).toEqual({ '--sh-bright': '#f0542d' });
    for (const accent of ['#F0542D', '#1D4ED8', '#A61E3A', '#0F5C63', '#FACC15', '#C6F135', '#FFFFFF', '#000000', '#7C3AED', '#0B1F3A', '#12A07F']) {
      const bright = rgb((smashhallVars(accent) as Record<string, string>)['--sh-bright']);
      expect(contrast(bright, NIGHT), accent).toBeGreaterThanOrEqual(4.5);
    }
    expect(smashhallVars('zzz')).toEqual(smashhallVars('#F0542D'));
    expect(smashhallVars('')).toEqual(smashhallVars('#F0542D'));
  });

  it('menu: label pendek dari label section, section kosong keluar dari menu', () => {
    const content = resolveContent(def, null);
    expect(navItems(content).map((i) => `${i.key}:${i.label}`)).toEqual([
      'availability:Jadwal',
      'membership:Member',
      'training:Latihan',
      'academy:Akademi',
      'championships:Kejuaraan',
      'shop:Toko',
      'contact:Kontak',
    ]);
    const less = resolveContent(def, {
      availability: { eyebrow: 'Booking' },
      membership: { eyebrow: 'Paket member bulanan' },
      shop: { items: [] },
      academy: { enabled: false },
      championships: { events: [{ date: '1 Des' }] },
    });
    expect(navItems(less).map((i) => `${i.key}:${i.label}`)).toEqual(['availability:Booking', 'membership:Member', 'training:Latihan', 'contact:Kontak']);
  });

  it('tujuan tautan: anchor Indonesia dan kunci section; section tersembunyi → cadangan', () => {
    expect(sectionTarget('#jadwal')).toBe('availability');
    expect(sectionTarget('#ketersediaan')).toBe('availability');
    expect(sectionTarget('#member')).toBe('membership');
    expect(sectionTarget('akademi')).toBe('academy');
    expect(sectionTarget('#turnamen')).toBe('championships');
    expect(sectionTarget('#toko')).toBe('shop');
    expect(sectionTarget('#kontak')).toBe('contact');
    expect(sectionTarget('#galeri')).toBe('gallery');
    expect(sectionTarget('#tidak-ada')).toBeNull();
    const m = readSmashhall(resolveContent(def, null));
    expect(m.linkOr('#member', null)).toEqual({ kind: 'section', target: 'membership' });
    expect(m.linkOr('#tidak-ada', m.contactAction)).toEqual({ kind: 'section', target: 'contact' });
    expect(m.primaryAction).toEqual({ kind: 'section', target: 'availability' });
    expect(m.secondaryAction).toEqual({ kind: 'section', target: 'membership' });
    expect(m.headerAction).toEqual({ kind: 'section', target: 'availability' });
    expect(m.linkOr('https://contoh.test/jadwal', null)).toEqual({ kind: 'external', href: 'https://contoh.test/jadwal' });
    // Tabel disembunyikan → booking ke formulir; formulir juga disembunyikan → WhatsApp; tanpa nomor → tidak ada
    const noTable = readSmashhall(resolveContent(def, { availability: { enabled: false } }));
    expect(noTable.primaryAction).toEqual({ kind: 'section', target: 'contact' });
    expect(noTable.linkOr('#jadwal', null)).toBeNull();
    const noForm = readSmashhall(resolveContent(def, { availability: { enabled: false }, contact: { enabled: false }, membership: { enabled: false } }));
    expect(noForm.primaryAction?.kind).toBe('external');
    expect(noForm.secondaryAction).toBeNull();
    const silent = readSmashhall(resolveContent(def, { availability: { enabled: false }, contact: { enabled: false, whatsapp: '' } }));
    expect(silent.bookAction).toBeNull();
    expect(silent.waWith('Halo')).toBeNull();
  });

  it('section tampil hanya bila berisi', () => {
    const content = resolveContent(def, null);
    for (const key of ORDER) expect(sectionShown(content, key), key).toBe(true);
    const empty = resolveContent(def, {
      availability: { hours: 'pagi, sore' },
      facilities: { title: '', image: '', stats: [], items: [] },
      membership: { plans: [{ price: 'Rp1' }] },
      training: { sessions: [{ level: 'x' }], coaches: [{ focus: 'x' }] },
      academy: { groups: [] },
      championships: { events: [{ date: '1 Des' }] },
      shop: { items: [{ price: 'Rp1' }] },
      gallery: { items: [{ caption: 'tanpa foto' }] },
      faq: { items: [] },
    });
    for (const key of ['availability', 'facilities', 'membership', 'training', 'academy', 'championships', 'shop', 'gallery', 'faq']) {
      expect(sectionShown(empty, key), key).toBe(false);
    }
    expect(sectionShown(resolveContent(def, { availability: { courts: [] } }), 'availability')).toBe(false);
    expect(sectionShown(resolveContent(def, { availability: { days: [{ full: 'L1 19' }] } }), 'availability')).toBe(false);
    expect(sectionShown(content, 'tidak-ada')).toBe(false);
  });

  it('jam & lapangan: jam dinormalkan, unik, maks. 8; lapangan tanpa nama/kode diisi otomatis', () => {
    expect(parseHours('16.00 · 17.00 · 18.00 · 19.00 · 20.00 · 21.00')).toEqual(HOURS);
    expect(parseHours('7, 7.30, 19:00, 19, 25, abc, 9.75')).toEqual(['07.00', '07.30', '19.00']);
    expect(parseHours('6 7 8 9 10 11 12 13 14 15')).toHaveLength(8);
    expect(parseHours('')).toEqual([]);
    expect(normalizeHour('7')).toBe('07.00');
    expect(normalizeHour('19:30')).toBe('19.30');
    expect(normalizeHour('19.5')).toBe('');
    expect(courtsOf({ courts: [{ name: 'Lapangan A' }, { short: 'VIP' }, { name: '', short: '' }, { name: 'Lapangan C', short: 'C-UTAMA' }] } as unknown as SectionContent)).toEqual([
      { name: 'Lapangan A', short: 'L1' },
      { name: 'Lapangan 2', short: 'VIP' },
      { name: 'Lapangan C', short: 'C-UT' },
    ]);
    expect(courtsOf({ courts: 'x' } as unknown as SectionContent)).toEqual([]);
  });

  it('slot penuh dari teks CMS: kode atau nomor lapangan, jam dinormalkan, "semua", isian tak dikenal dilewati', () => {
    const courts = Array.from({ length: 8 }, (_, i) => ({ name: `Lapangan ${i + 1}`, short: `L${i + 1}` }));
    const full = parseFull('L1 19.00, l3 20, 5 semua; L9 19.00, X 19.00, L2 13.00\nL8 21:00, rusak', courts, HOURS);
    expect([...full].sort()).toEqual(
      [slotKey(0, '19.00'), slotKey(2, '20.00'), ...HOURS.map((h) => slotKey(4, h)), slotKey(7, '21.00')].sort(),
    );
    expect(parseFull('', courts, HOURS).size).toBe(0);
    expect(parseFull('VIP 19', [{ name: 'Lapangan VIP', short: 'VIP' }], HOURS)).toEqual(new Set(['0|19.00']));
    // Hari ini: 7 hari (Senin–Minggu) → menurut tanggal; jumlah lain → hari pertama
    expect(todayIndex(7, WEDNESDAY)).toBe(2);
    expect(todayIndex(7, new Date(2026, 10, 1))).toBe(6);
    expect(todayIndex(7, new Date(2026, 10, 2))).toBe(0);
    expect(todayIndex(5, WEDNESDAY)).toBe(0);
    expect(todayIndex(0, WEDNESDAY)).toBe(0);
    const m = readSmashhall(resolveContent(def, null), WEDNESDAY);
    expect(m.today).toBe(2);
    expect(m.fullByDay[2].size).toBe(10);
    expect(m.labels).toEqual({ free: 'Kosong', full: 'Penuh', chosen: 'Dipilih' });
    expect(slotLabels({ free_label: 'Tersedia', full_label: '', chosen_label: 'Pilihan Anda' } as unknown as SectionContent)).toEqual({
      free: 'Tersedia',
      full: 'Penuh',
      chosen: 'Pilihan Anda',
    });
    expect(trainingColumns('Hari · Waktu · Kelas · Level · Coach')).toEqual(['Hari', 'Waktu', 'Kelas', 'Level', 'Coach']);
    expect(trainingColumns('Day | Time')).toEqual(['Day', 'Time', 'Program', 'Level', 'Pelatih']);
    expect(trainingColumns('')).toEqual(['Hari', 'Jam', 'Program', 'Level', 'Pelatih']);
  });

  it('pesan WhatsApp: booking slot, gabung member (periode & harga), akademi, turnamen, produk toko', () => {
    expect(bookingMessage('GOR SmashHall', 'Rabu', '19.00', 'Lapangan 3')).toBe(
      'Halo GOR SmashHall, saya ingin booking lapangan.\n\nHari: Rabu\nJam: 19.00\nLapangan: Lapangan 3\n\nMohon konfirmasi ketersediaannya. Terima kasih.',
    );
    expect(bookingMessage('', 'Rabu', '19.00', 'Lapangan 3').split('\n')[0]).toBe('Halo, saya ingin booking lapangan.');
    const plans = resolveContent(def, null).membership.plans as ListItem[];
    expect(plans.map((p) => planPrice(p, false))).toEqual(['Rp350.000', 'Rp600.000', 'Rp1.050.000']);
    expect(plans.map((p) => planPrice(p, true))).toEqual(['Rp320.000', 'Rp550.000', 'Rp950.000']);
    expect(planPrice({ price: 'Rp100.000', price_quarter: '' } as ListItem, true)).toBe('Rp100.000');
    expect(featuredIndex(plans)).toBe(1);
    expect(featuredIndex([{ name: 'A' }, { name: 'B' }] as ListItem[])).toBe(-1);
    expect(joinMessage('GOR SmashHall', 'Rutin', '3 bulan', 'Rp550.000', '/bulan')).toBe(
      'Halo GOR SmashHall, saya ingin gabung member Rutin (3 bulan: Rp550.000/bulan).',
    );
    expect(joinMessage('GOR SmashHall', 'Rutin', '', '', '')).toBe('Halo GOR SmashHall, saya ingin gabung member Rutin.');
    expect(askMessage('GOR SmashHall', 'mendaftar akademi kelompok Anak (7–12 th)')).toBe('Halo GOR SmashHall, saya ingin mendaftar akademi kelompok Anak (7–12 th).');
    expect(askMessage('', 'mendaftar turnamen')).toBe('Halo, saya ingin mendaftar turnamen.');
    expect(orderMessage('GOR SmashHall', 'Raket latihan', 'Rp385.000')).toBe('Halo GOR SmashHall, saya ingin memesan Raket latihan (Rp385.000). Apakah stoknya ada?');
    expect(orderMessage('GOR SmashHall', 'Grip', '')).toBe('Halo GOR SmashHall, saya ingin memesan Grip. Apakah stoknya ada?');
  });

  it('formulir booking: validasi per isian, tanggal wajib untuk booking, pesan berurutan, isian kosong tidak ikut', () => {
    expect(validateBooking(booking())).toEqual({});
    expect(validateBooking(EMPTY_BOOKING)).toEqual({ purpose: 'Pilih keperluan.', name: 'Tulis nama Anda.' });
    expect(validateBooking(booking({ date: '' }))).toEqual({ date: 'Pilih tanggal main.' });
    expect(validateBooking(booking({ purpose: 'Akademi', date: '' }))).toEqual({});
    expect(validateBooking(booking({ purpose: 'Akademi', date: '2026-02-30' }))).toEqual({ date: 'Tanggal tidak valid.' });
    expect(validateBooking(booking({ purpose: 'Bukan pilihan' })).purpose).toBe('Pilih keperluan.');
    expect(validateBooking(booking({ name: ' a ' })).name).toBe('Tulis nama Anda.');
    expect(formatDate('2026-11-14')).toBe('Sabtu, 14 November 2026');
    expect(formatDate('2026-13-01')).toBe('');
    expect(formatDate('14/11/2026')).toBe('');
    expect(bookingFormMessage(booking({ time: '19.00', players: '4 orang', note: 'Bawa  raket\nsendiri' }), 'GOR SmashHall')).toBe(
      [
        'Halo GOR SmashHall, saya ingin booking lapangan.',
        '',
        'Nama: Rina',
        'Keperluan: Booking lapangan',
        'Tanggal: Sabtu, 14 November 2026',
        'Jam: 19.00',
        'Jumlah pemain: 4 orang',
        'Catatan: Bawa raket sendiri',
      ].join('\n'),
    );
    const short = bookingFormMessage(booking({ purpose: 'Akademi', date: '', players: '7 orang' }), '');
    expect(short).toBe('Halo, saya ingin mendaftar akademi.\n\nNama: Rina\nKeperluan: Akademi');
    expect(bookingFormMessage(booking({ purpose: 'Perlengkapan' }), 'GOR SmashHall').split('\n')[0]).toBe('Halo GOR SmashHall, saya ingin memesan perlengkapan.');
    expect(bookingMailHref('halo@smashhall.test', 'Baris 1\nBaris 2')).toBe(
      'mailto:halo@smashhall.test?subject=Booking%20%26%20pendaftaran&body=Baris%201%0ABaris%202',
    );
    expect(bookingMailHref('bukan email', 'x')).toBe('');
  });

  it('teks kecil: tanggal turnamen, nada status, nomor HP, baris keuntungan, teks bersih, ikon fasilitas', () => {
    expect(splitDate('16 Nov')).toEqual(['16', 'Nov']);
    expect(splitDate('Desember')).toEqual(['Desember', '']);
    expect(statusTone('Pendaftaran dibuka')).toBe('open');
    expect(statusTone('Selesai')).toBe('done');
    expect(statusTone('Pendaftaran ditutup')).toBe('done');
    expect(statusTone('Khusus akademi')).toBe('neutral');
    expect(displayPhone('081234567890')).toBe('0812-3456-7890');
    expect(displayPhone('022-555-0182')).toBe('022-555-0182');
    expect(displayPhone('')).toBe('');
    expect(splitLines('A\nB · C | D\n\n')).toEqual(['A', 'B', 'C', 'D']);
    expect(cleanText('a\u0000b\u0007  c', 10)).toBe('a b c');
    expect(cleanText('x'.repeat(500), 400)).toHaveLength(400);
    expect(iconKey('Lampu LED anti-silau')).toBe('light');
    expect(iconKey('Ruang ganti & shower')).toBe('shower');
    expect(iconKey('Mushola')).toBe('prayer');
    expect(iconKey('Kantin')).toBe('food');
    expect(iconKey('Parkir motor & mobil')).toBe('parking');
    expect(iconKey('Wi-Fi tamu')).toBe('wifi');
    expect(iconKey('Loker')).toBe('locker');
    expect(iconKey('Kursi tribun')).toBe('seat');
    expect(iconKey('Sewa raket')).toBe('shop');
    expect(iconKey('Ruang tunggu')).toBe('other');
  });
});

describe('SmashHall: demo', () => {
  it('urutan section, satu H1, hero rally: foto LCP latar (eager, srcset, ukuran, alt) tanpa reveal, strip kaca ketersediaan', () => {
    const container = withDate(WEDNESDAY, () => demo());
    expect(sectionKeys(container)).toEqual([...ORDER, 'footer']);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const hero = section(container, 'hero');
    expect(hero.getAttribute('data-hero-layout')).toBe('rally');
    expect(hero.querySelector('h1')!.textContent).toBe('Main, latihan, dan bertanding di satu GOR');
    expect(hero.querySelector('h1 span')!.textContent).toBe('satu GOR');
    const img = hero.querySelector<HTMLImageElement>('img[fetchpriority="high"]')!;
    expect(img.getAttribute('src')).toBe('/assets/templates/photos/smashhall-hero-v2-1920.webp');
    expect(img.getAttribute('srcset')).toContain(' 800w');
    expect(img.getAttribute('srcset')).toContain(' 1280w');
    expect(img.getAttribute('loading')).toBe('eager');
    expect(Number(img.getAttribute('width'))).toBe(1920);
    expect(Number(img.getAttribute('height'))).toBe(1080);
    expect(img.getAttribute('alt')!.split(' ').length).toBeGreaterThanOrEqual(5);
    // Foto hero = latar (bukan kolom): tidak di dalam <Reveal>, tanpa zoom/parallax/kelas gerak
    expect(img.closest('.tpl-reveal, [data-reveal]')).toBeNull();
    expect(img.className).not.toMatch(/tpl-photo|sh-/);
    expect(hero.querySelector('.sh-hero-scrim')).not.toBeNull();
    // HP/tablet: foto tetap latar di belakang teks (kotak foto & lapisan tinta membentang di belakang baris teks), teks
    // putih di atas lapisan gelap; ≥ 64rem kembali teks tinta di atas lapisan putih. sizes = lebar potongan HP/tablet.
    const photoBox = img.parentElement!;
    expect(photoBox.className).toMatch(/\brow-start-1\b/);
    expect(photoBox.className).toMatch(/\brow-end-3\b/);
    expect(hero.querySelector('.sh-hero-scrim')!.className).toMatch(/\brow-start-1\b.*\brow-end-3\b/);
    expect(hero.className).toContain('bg-[#171512]');
    expect(hero.className).toContain('@5xl:bg-white');
    expect(hero.querySelector('h1')!.className).toMatch(/(^|\s)text-white\s.*@5xl:text-\[#171512\]/);
    expect(img.getAttribute('sizes')).toBe('(min-width: 1024px) 100vw, (min-width: 768px) 1180px, 960px');
    const eager = Array.from(container.querySelectorAll('img')).filter((i) => i.getAttribute('loading') !== 'lazy');
    expect(eager.map((i) => i.getAttribute('src'))).toEqual(['/assets/templates/photos/smashhall-hero-v2-1920.webp']);
    expect(within(hero).getByRole('link', { name: 'Cek Lapangan' })).toHaveAttribute('href', '#availability');
    expect(within(hero).getByRole('link', { name: 'Gabung Member' })).toHaveAttribute('href', '#membership');
    // Strip: 8 lapangan × 6 jam (Rabu: 10 slot penuh), legenda, catatan contoh, tautan ke tabel, ringkasan pembaca layar
    const strip = hero.querySelector<HTMLElement>('[data-sh-strip]')!;
    expect(strip.textContent).toContain('Hari ini· Rabu');
    expect(strip.querySelectorAll('.sh-pill')).toHaveLength(48);
    expect(strip.querySelectorAll('.sh-pill[data-full="true"]')).toHaveLength(10);
    expect(within(strip).getByText('Contoh ketersediaan Rabu: 38 dari 48 slot masih kosong.')).toHaveClass('sr-only');
    expect(strip.textContent).toContain('Contoh data. Ketersediaan dikonfirmasi admin via WhatsApp.');
    expect(within(strip).getByRole('link', { name: 'Lihat semua jadwal' })).toHaveAttribute('href', '#availability');
    expect(Array.from(strip.querySelectorAll('ul > li')).map((li) => li.textContent)).toEqual(['Kosong', 'Penuh']);
    // Kok "di-smash" mendarat di lencana strip: dekoratif, keadaan diam = kok tegak di lencana
    const slot = strip.querySelector('.sh-slot')!;
    expect(slot.getAttribute('aria-hidden')).toBe('true');
    expect(slot.querySelector('.sh-fly .sh-fly-y .sh-spin')).not.toBeNull();
  });

  it('header putih menempel: simbol kok, menu, chip jam buka, tombol Booking; menu HP buka/tutup, Esc menutup dan fokus kembali', () => {
    const container = demo();
    const header = container.querySelector('header')!;
    expect(header.className).toContain('sticky');
    expect(header.className).toContain('bg-white');
    expect(header.querySelector('svg[viewBox="0 0 32 32"]'), 'SmashHallMark').not.toBeNull();
    expect(header.textContent).toContain('Buka 07.00–23.00');
    const nav = within(header).getByRole('navigation', { name: 'Menu utama' });
    expect(Array.from(nav.querySelectorAll('a')).map((a) => a.getAttribute('href'))).toEqual([
      '#availability',
      '#membership',
      '#training',
      '#academy',
      '#championships',
      '#shop',
      '#kontak',
    ]);
    fireEvent.click(within(nav).getByRole('link', { name: 'Akademi' }));
    expect(scrolled).toEqual(['academy']);
    expect(within(header).getAllByRole('link', { name: 'Booking' })[0]).toHaveAttribute('href', '#availability');
    const toggle = within(header).getByRole('button', { name: 'Buka menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAccessibleName('Tutup menu');
    expect(within(header).getAllByRole('navigation', { name: 'Menu utama' })).toHaveLength(2);
    const panel = document.getElementById(toggle.getAttribute('aria-controls')!)!;
    expect(panel).toHaveAttribute('aria-label', 'Menu utama');
    expect(within(panel).getAllByRole('link').map((a) => a.textContent)).toEqual(['Jadwal', 'Member', 'Latihan', 'Akademi', 'Kejuaraan', 'Toko', 'Kontak', 'Booking']);
    fireEvent.click(within(panel).getByRole('link', { name: 'Toko' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(scrolled).toEqual(['academy', 'shop']);
    fireEvent.click(toggle);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
  });

  it('ketersediaan: tab hari (hari ini terpilih, panah/Home/End), tabel slot dengan roving tabindex, slot terpilih → booking WhatsApp', () => {
    const container = withDate(WEDNESDAY, () => demo());
    const availability = section(container, 'availability');
    const tablist = within(availability).getByRole('tablist', { name: 'Pilih hari' });
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual([
      'Senin39 kosong',
      'Selasa40 kosong',
      'Rabu (hari ini)38 kosong',
      'Kamis41 kosong',
      'Jumat37 kosong',
      'Sabtu38 kosong',
      'Minggu40 kosong',
    ]);
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    expect(tabs.map((t) => t.getAttribute('tabindex'))).toEqual(['-1', '-1', '0', '-1', '-1', '-1', '-1']);
    const panel = within(availability).getByRole('tabpanel');
    expect(panel).toHaveAttribute('aria-labelledby', tabs[2].id);
    expect(tabs.every((t) => t.getAttribute('aria-controls') === panel.id)).toBe(true);
    expect(panel.querySelector('caption')!.textContent).toBe('Ketersediaan lapangan hari Rabu (contoh)');
    expect(Array.from(panel.querySelectorAll('thead th')).map((th) => th.textContent)).toEqual(['Lapangan', ...HOURS]);
    const cells = Array.from(panel.querySelectorAll<HTMLButtonElement>('button[data-slot]'));
    expect(cells).toHaveLength(48);
    expect(cells.filter((c) => c.getAttribute('data-slot') === 'full')).toHaveLength(10);
    expect(cells.filter((c) => c.getAttribute('tabindex') === '0')).toEqual([cells[0]]);
    // Belum memilih: petunjuk, tanpa tautan booking
    expect(panel.textContent).toContain('Pilih slot yang masih kosong.');
    expect(within(panel).queryByRole('link', { name: 'Booking via WhatsApp' })).toBeNull();
    // Slot penuh tidak bisa dipilih
    const fullCell = within(panel).getByRole('button', { name: 'Lapangan 1, 19.00, penuh' });
    expect(fullCell).toHaveAttribute('aria-disabled', 'true');
    expect(fullCell).not.toHaveAttribute('aria-pressed');
    fireEvent.click(fullCell);
    expect(within(panel).queryByRole('link', { name: 'Booking via WhatsApp' })).toBeNull();
    // Pilih slot kosong → tombol tertekan, ringkasan, tautan WhatsApp dengan pesan lengkap
    const free = within(panel).getByRole('button', { name: 'Lapangan 3, 21.00, kosong' });
    expect(free).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(free);
    expect(free).toHaveAttribute('aria-pressed', 'true');
    expect(free).toHaveAttribute('data-slot', 'chosen');
    expect(free).toHaveAccessibleName('Lapangan 3, 21.00, dipilih');
    expect(panel.textContent).toContain('Lapangan 3 · Rabu · 21.00');
    const book = within(panel).getByRole('link', { name: 'Booking via WhatsApp' });
    expect(book.getAttribute('href')).toMatch(WA);
    expect(waText(book)).toBe(bookingMessage('GOR SmashHall', 'Rabu', '21.00', 'Lapangan 3'));
    fireEvent.click(free);
    expect(free).toHaveAttribute('aria-pressed', 'false');
    expect(within(panel).queryByRole('link', { name: 'Booking via WhatsApp' })).toBeNull();
    // Roving tabindex: panah memindah fokus, Home/End ke awal/akhir baris
    cells[0].focus();
    fireEvent.keyDown(cells[0], { key: 'ArrowRight' });
    expect(cells[1]).toHaveFocus();
    expect(cells[1]).toHaveAttribute('tabindex', '0');
    expect(cells[0]).toHaveAttribute('tabindex', '-1');
    fireEvent.keyDown(cells[1], { key: 'ArrowDown' });
    expect(cells[7]).toHaveFocus();
    fireEvent.keyDown(cells[7], { key: 'End' });
    expect(cells[11]).toHaveFocus();
    fireEvent.keyDown(cells[11], { key: 'ArrowRight' });
    expect(cells[11]).toHaveFocus();
    fireEvent.keyDown(cells[11], { key: 'Home' });
    expect(cells[6]).toHaveFocus();
    fireEvent.keyDown(cells[6], { key: 'ArrowUp' });
    expect(cells[0]).toHaveFocus();
    // Tab hari: panah kanan ke Kamis (pilihan slot dihapus), End ke Minggu, Home ke Senin, panah kiri memutar ke Minggu
    fireEvent.click(within(panel).getByRole('button', { name: 'Lapangan 1, 16.00, kosong' }));
    fireEvent.keyDown(tabs[2], { key: 'ArrowRight' });
    const after = within(tablist).getAllByRole('tab');
    expect(after[3]).toHaveAttribute('aria-selected', 'true');
    expect(after[3]).toHaveFocus();
    expect(within(availability).getByRole('tabpanel')).toHaveAttribute('aria-labelledby', after[3].id);
    expect(within(availability).getByRole('tabpanel').querySelectorAll('[data-slot="chosen"]')).toHaveLength(0);
    expect(within(availability).getByRole('tabpanel').querySelectorAll('[data-slot="full"]')).toHaveLength(7);
    fireEvent.keyDown(after[3], { key: 'End' });
    expect(within(tablist).getAllByRole('tab')[6]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(within(tablist).getAllByRole('tab')[6], { key: 'Home' });
    expect(within(tablist).getAllByRole('tab')[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(within(tablist).getAllByRole('tab')[0], { key: 'ArrowLeft' });
    expect(within(tablist).getAllByRole('tab')[6]).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(within(tablist).getAllByRole('tab')[5]);
    expect(within(tablist).getAllByRole('tab')[5]).toHaveAttribute('aria-selected', 'true');
    // Harga sewa & catatan jujur
    expect(Array.from(availability.querySelectorAll('dl dd')).map((dd) => dd.textContent)).toEqual(['Rp45.000/jam', 'Rp65.000/jam', 'Rp70.000/jam']);
    expect(availability.textContent).toContain('Jadwal yang tampil adalah contoh; ketersediaan dikonfirmasi admin.');
  });

  it('member: pilihan periode (aria-pressed) mengganti harga & pesan; paket sorotan = kartu gelap; catatan tanpa akun member', () => {
    const container = demo();
    const membership = section(container, 'membership');
    const group = within(membership).getByRole('group', { name: 'Periode paket' });
    const [monthly, quarterly] = within(group).getAllByRole('button');
    expect(monthly).toHaveTextContent('Bulanan');
    expect(monthly).toHaveAttribute('aria-pressed', 'true');
    expect(quarterly).toHaveTextContent('3 bulan');
    expect(quarterly).toHaveAttribute('aria-pressed', 'false');
    expect(membership.textContent).toContain('Hemat hingga 10%');
    const prices = () => Array.from(membership.querySelectorAll('.sh-swap')).map((p) => p.firstElementChild!.textContent);
    expect(prices()).toEqual(['Rp350.000', 'Rp600.000', 'Rp1.050.000']);
    expect(waText(within(membership).getByRole('link', { name: 'Gabung paket Reguler' }))).toBe(
      'Halo GOR SmashHall, saya ingin gabung member Reguler (Bulanan: Rp350.000/bulan).',
    );
    fireEvent.click(quarterly);
    expect(quarterly).toHaveAttribute('aria-pressed', 'true');
    expect(monthly).toHaveAttribute('aria-pressed', 'false');
    expect(prices()).toEqual(['Rp320.000', 'Rp550.000', 'Rp950.000']);
    expect(waText(within(membership).getByRole('link', { name: 'Gabung paket Rutin' }))).toBe(
      'Halo GOR SmashHall, saya ingin gabung member Rutin (3 bulan: Rp550.000/bulan).',
    );
    expect(membership.textContent).toContain('Harga ditampilkan untuk periode 3 bulan.');
    const cards = membership.querySelectorAll('ul > li[class*="rounded-[20px]"]');
    expect(Array.from(cards).map((li) => li.querySelector('h3')!.textContent)).toEqual(['Reguler', 'Rutin', 'Klub']);
    const featured = membership.querySelector('li[data-featured="true"]')!;
    expect(featured.getAttribute('data-tpl-tone')).toBe('inverse');
    expect(featured.querySelector('h3')!.textContent).toBe('Rutin');
    expect(featured.textContent).toContain('Untuk main rutin');
    expect(featured.className).toContain('bg-[#171512]');
    expect(membership.textContent).toContain('Tidak ada akun member atau pembayaran online di website.');
  });

  it('latihan (judul kolom CMS, pelatih berinisial tanpa foto), akademi, kejuaraan (pita gelap), toko (pesan WhatsApp), galeri mosaik', () => {
    const container = demo();
    const training = section(container, 'training');
    expect(Array.from(training.querySelector('div[aria-hidden="true"]')!.querySelectorAll('span')).map((s) => s.textContent)).toEqual([
      'Hari',
      'Jam',
      'Program',
      'Level',
      'Pelatih',
    ]);
    expect(training.querySelector('ul')!.children).toHaveLength(6);
    expect(training.querySelector('ul > li')!.textContent).toContain('Latihan ganda');
    expect(training.querySelector('img')).toBeNull();
    expect(within(training).getByRole('heading', { level: 3, name: 'Pelatih' })).toBeInTheDocument();
    expect(Array.from(training.querySelectorAll('span[aria-hidden="true"].h-12')).map((s) => s.textContent)).toEqual(['RK', 'DS', 'YL']);
    const academy = section(container, 'academy');
    expect(Array.from(academy.querySelectorAll('h3')).map((h) => h.textContent)).toEqual(['Anak', 'Remaja', 'Dewasa']);
    expect(academy.querySelectorAll('img')).toHaveLength(3);
    expect(waText(within(academy).getByRole('link', { name: 'Daftar akademi kelompok Anak' }))).toBe(
      'Halo GOR SmashHall, saya ingin mendaftar akademi kelompok Anak (7–12 th).',
    );
    const championships = section(container, 'championships');
    expect(championships.getAttribute('data-tpl-tone')).toBe('inverse');
    expect(Array.from(championships.querySelectorAll('ol h3')).map((h) => h.textContent)).toEqual([
      'SmashHall Cup',
      'Antarklub Bandung Timur',
      'Kejuaraan akademi',
      'Liga member Oktober',
    ]);
    expect(championships.querySelectorAll('.sh-track')).toHaveLength(3);
    expect(within(championships).getAllByText('Pendaftaran dibuka')[0].className).toContain('bg-(--tpl-accent)');
    expect(within(championships).getByText('Selesai').className).toContain('bg-white/10');
    expect(waText(within(championships).getByRole('link', { name: 'Daftar turnamen' }))).toBe('Halo GOR SmashHall, saya ingin mendaftar turnamen.');
    expect(championships.textContent).toContain('bukan kejuaraan resmi federasi');
    // Satu-satunya bidang gelap: pita kejuaraan + kartu paket sorotan
    expect(Array.from(container.querySelectorAll('[data-tpl-tone="inverse"]')).map((el) => el.getAttribute('data-tpl-section') ?? el.tagName)).toEqual([
      'LI',
      'championships',
    ]);
    const shop = section(container, 'shop');
    expect(Array.from(shop.querySelectorAll('h3')).map((h) => h.textContent)).toEqual(['Raket latihan', 'Kok bulu (1 slop)', 'Grip handuk', 'Sepatu indoor']);
    expect(waText(within(shop).getByRole('link', { name: 'Pesan Raket latihan' }))).toBe(
      'Halo GOR SmashHall, saya ingin memesan Raket latihan (Rp385.000). Apakah stoknya ada?',
    );
    expect(shop.querySelector('button')).toBeNull();
    expect(shop.textContent).not.toMatch(/keranjang belanja \(|checkout|bayar sekarang/i);
    expect(shop.textContent).toContain('Tidak ada keranjang belanja atau pembayaran online.');
    const gallery = section(container, 'gallery');
    const tiles = gallery.querySelectorAll('ul > li');
    expect(tiles).toHaveLength(5);
    expect(tiles[0].className).toContain('col-span-2');
    expect(tiles[0].querySelector('figcaption')!.textContent).toBe('Smash di sesi sparing malam');
  });

  it('akordeon tanya jawab: aria-expanded/aria-controls, panel role=region, satu terbuka, tautan WhatsApp', () => {
    const faq = section(demo(), 'faq');
    const buttons = within(faq).getAllByRole('button');
    expect(buttons).toHaveLength(5);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'true');
    expect(buttons[0].closest('h3')).not.toBeNull();
    const region = document.getElementById(buttons[0].getAttribute('aria-controls')!)!;
    expect(region).toHaveAttribute('role', 'region');
    expect(region).toHaveAttribute('aria-labelledby', buttons[0].id);
    expect(region).toHaveAttribute('data-open', 'true');
    expect(document.getElementById(buttons[1].getAttribute('aria-controls')!)).toHaveAttribute('inert');
    fireEvent.click(buttons[2]);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'false');
    expect(buttons[2]).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(buttons[0].getAttribute('aria-controls')!)).toHaveAttribute('data-open', 'false');
    fireEvent.click(buttons[2]);
    expect(buttons.every((b) => b.getAttribute('aria-expanded') === 'false')).toBe(true);
    const ask = within(faq).getByRole('link', { name: 'Tanya admin' });
    expect(ask.getAttribute('href')).toMatch(WA);
    expect(waText(ask)).toBe('Halo GOR SmashHall, saya ingin bertanya tentang booking lapangan.');
    cleanup();
    const noWa = section(demo({ contact: { whatsapp: '' } }), 'faq');
    expect(within(noWa).queryByRole('link', { name: 'Tanya admin' })).toBeNull();
    cleanup();
    const custom = section(demo({ faq: { link_url: '#kontak', link_label: 'Hubungi kami' } }), 'faq');
    expect(within(custom).getByRole('link', { name: 'Hubungi kami' })).toHaveAttribute('href', '#kontak');
  });

  it('formulir booking & pendaftaran: galat + fokus, tanggal wajib untuk booking, pesan WhatsApp, ubah data', () => {
    const container = demo();
    const contact = section(container, 'contact');
    const formEl = within(contact).getByRole('form', { name: 'Formulir booking & pendaftaran' });
    expect(formEl.getAttribute('action')).toBeNull();
    expect(contact.textContent).toContain('data tidak disimpan di website');
    act(() => {
      fireEvent.submit(formEl);
    });
    const purpose = within(formEl).getByLabelText('Keperluan');
    const name = within(formEl).getByLabelText('Nama');
    expect(purpose).toHaveAttribute('aria-invalid', 'true');
    expect(purpose).toHaveAttribute('aria-describedby', `${purpose.id}-error`);
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(purpose).toHaveFocus();
    expect(formEl.textContent).toContain('Pilih keperluan.');
    expect(formEl.textContent).toContain('Tulis nama Anda.');
    expect(Array.from((purpose as HTMLSelectElement).options).map((o) => o.value)).toEqual([
      '',
      'Booking lapangan',
      'Member bulanan',
      'Akademi',
      'Kejuaraan',
      'Perlengkapan',
      'Lainnya',
    ]);
    // Jam dari tabel ketersediaan + "Belum tahu"
    expect(Array.from((within(formEl).getByLabelText(/^Jam/) as HTMLSelectElement).options).map((o) => o.value)).toEqual(['Belum tahu', ...HOURS]);
    fireEvent.change(purpose, { target: { value: 'Booking lapangan' } });
    expect(purpose).not.toHaveAttribute('aria-invalid');
    expect(within(formEl).getByLabelText('Tanggal')).toBeInTheDocument();
    fireEvent.change(name, { target: { value: 'Rina' } });
    act(() => {
      fireEvent.submit(formEl);
    });
    const date = within(formEl).getByLabelText('Tanggal');
    expect(date).toHaveAttribute('aria-invalid', 'true');
    expect(date).toHaveFocus();
    expect(formEl.textContent).toContain('Pilih tanggal main.');
    fireEvent.change(date, { target: { value: '2026-11-14' } });
    fireEvent.change(within(formEl).getByLabelText(/^Jam/), { target: { value: '19.00' } });
    fireEvent.click(within(formEl).getByLabelText('4 orang'));
    fireEvent.change(within(formEl).getByLabelText(/^Catatan/), { target: { value: 'Bawa raket sendiri' } });
    act(() => {
      fireEvent.submit(formEl);
    });
    expect(within(contact).getByRole('heading', { level: 3, name: 'Pesan siap dikirim' })).toBeInTheDocument();
    const message = contact.querySelector('pre')!.textContent!;
    expect(message).toBe(
      [
        'Halo GOR SmashHall, saya ingin booking lapangan.',
        '',
        'Nama: Rina',
        'Keperluan: Booking lapangan',
        'Tanggal: Sabtu, 14 November 2026',
        'Jam: 19.00',
        'Jumlah pemain: 4 orang',
        'Catatan: Bawa raket sendiri',
      ].join('\n'),
    );
    const wa = within(contact).getByRole('link', { name: 'Buka WhatsApp' });
    expect(decodeURIComponent(wa.getAttribute('href')!)).toBe(`https://wa.me/6281234567890?text=${message}`);
    fireEvent.click(within(contact).getByRole('button', { name: 'Ubah data' }));
    const again = within(contact).getByRole('form');
    expect((within(again).getByLabelText('Nama') as HTMLInputElement).value).toBe('Rina');
    expect((within(again).getByLabelText('Tanggal') as HTMLInputElement).value).toBe('2026-11-14');
    expect((within(again).getByLabelText('4 orang') as HTMLInputElement).checked).toBe(true);
  });

  it('kontak & footer putih bergaris tema: tautan ≥ 44px, nomor berkelompok, menu dua kolom, media sosial', () => {
    const container = demo();
    const contact = section(container, 'contact');
    for (const name of ['0812-3456-7890', 'halo@smashhall.test']) {
      for (const link of within(contact).getAllByRole('link', { name })) {
        // py-3 (12px atas & bawah) + teks 15,5px ≈ 45px; -my-3 menjaga tinggi baris
        expect(link.className, name).toMatch(/(^|\s)inline-block(\s|$)/);
        expect(link.className, name).toContain('py-3');
        expect(link.className, name).toContain('-my-3');
      }
    }
    expect(within(contact).getAllByRole('link', { name: '0812-3456-7890' }).map((a) => a.getAttribute('href'))).toEqual([
      expect.stringMatching(WA),
      'tel:+6281234567890',
    ]);
    // Nama tautan unik: "Chat WhatsApp" hanya tombol melayang Shell
    expect(within(container).getAllByRole('link', { name: 'Chat WhatsApp' })).toHaveLength(1);
    const footer = container.querySelector('footer')!;
    expect(footer.getAttribute('data-tpl-section')).toBe('footer');
    expect(footer.getAttribute('data-tpl-tone')).toBeNull();
    expect(footer.className).toContain('bg-white');
    expect(footer.className).toContain('border-t-4');
    expect(footer.className).toContain('border-(--tpl-accent)');
    expect(footer.querySelector('svg[viewBox="0 0 440 200"]')).toBeNull();
    expect(footer.textContent).toContain(`© ${new Date().getFullYear()} GOR SmashHall`);
    expect(footer.textContent).toContain('GOR & Klub Badminton di Bandung');
    const menu = within(footer).getByRole('navigation', { name: 'Tautan footer' });
    expect(menu.querySelector('ul')!.className).toContain('grid-cols-2');
    expect(menu.querySelector('ul')!.className).not.toContain('@5xl:grid-cols-1');
    expect(Array.from(menu.querySelectorAll('a')).map((a) => a.getAttribute('href'))).toContain('#availability');
    expect(within(footer).getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://instagram.com/smashhall.contoh');
    expect(within(footer).getByRole('link', { name: 'YouTube' })).toHaveAttribute('href', 'https://youtube.com/@smashhall.contoh');
    expect(within(footer).getByRole('link', { name: 'TikTok' })).toHaveAttribute('href', 'https://tiktok.com/@smashhall.contoh');
    expect(within(footer).queryByRole('link', { name: 'Facebook' })).toBeNull();
    for (const link of footer.querySelectorAll('a')) expect(link.className, link.textContent ?? '').toMatch(/min-h-11|h-11/);
  });

  it('datar: tidak ada kelas shadow di template (kecuali tombol melayang Shell); kode tanpa kirim/simpan data', () => {
    const container = demo();
    const shadows = Array.from(container.querySelectorAll('[class*="shadow"]')).filter(
      (el) => !el.closest('[aria-label="Chat WhatsApp"]') && !/Chat WhatsApp|Kembali ke atas/.test(el.getAttribute('aria-label') ?? ''),
    );
    expect(shadows.map((el) => el.className)).toEqual([]);
    const tsx = ['SmashHall', 'Header', 'Hero', 'Availability', 'Facilities', 'Membership', 'Training', 'Championships', 'Shop', 'Faq', 'Contact', 'BookingForm', 'Footer', 'ui', 'marks'];
    const ts = ['index', 'styles', 'model', 'icons', 'hooks', 'schema', 'defaultContent', 'photos'];
    const source = [
      ...tsx.map((f) => readFileSync(resolve(ROOT, `src/templates/smashhall/${f}.tsx`), 'utf8')),
      ...ts.map((f) => readFileSync(resolve(ROOT, `src/templates/smashhall/${f}.ts`), 'utf8')),
      readFileSync(resolve(ROOT, 'src/templates/smashhall/smashhall.css'), 'utf8'),
    ].join('\n');
    expect(source).not.toMatch(/\bshadow-|box-shadow|drop-shadow|text-shadow/);
    // Kode (tanpa komentar): tanpa framer-motion/router, formulir & booking tidak mengirim atau menyimpan apa pun
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/framer-motion|useLocation|useParams|localStorage|sessionStorage|fetch\(|XMLHttpRequest|sendBeacon|<form[^>]*action=/);
    // Tidak mengimpor dari folder template lain
    for (const [, path] of code.matchAll(/from '(\.\.\/[^']+)'/g)) expect(path, path).toMatch(/^\.\.\/(shared|kit|types)(\/|$)/);
  });
});

describe('SmashHall: gerak', () => {
  it('pratinjau CMS diam dan tanpa tautan wa.me terbuka; demo bergerak', () => {
    const { container } = render(<def.Component content={resolveContent(def, null)} preview />);
    expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'off');
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    expect(container.querySelector('a[href^="javascript:"], a[href^="vbscript:"]')).toBeNull();
    // Keadaan diam = keadaan akhir: strip lengkap & kok di lencana tanpa gerak
    expect(container.querySelectorAll('[data-sh-strip] .sh-pill')).toHaveLength(48);
    cleanup();
    expect(demo().querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'on');
  });

  it("smashhall.css: animasi bergerbang [data-tpl-motion='on'], blok prefers-reduced-motion & cetak, kelas sh-, sekali jalan ≤ 1,6 dtk", () => {
    const css = readFileSync(resolve(ROOT, 'src/templates/smashhall/smashhall.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).toContain('@layer components');
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(css).toMatch(/@media print/);
    for (const name of ['sh-fly-x', 'sh-fly-y', 'sh-spin', 'sh-settle', 'sh-pill', 'sh-pop', 'sh-grow', 'sh-fade']) expect(css).toContain(`@keyframes ${name}`);
    const rules = css.replace(/@keyframes[\s\S]*?\n\}/g, '');
    for (const rule of rules.match(/^\s*[^@\s{}][^{}]*\{[^}]*\b(transition|animation):[^}]*\}/gm) ?? []) {
      const selector = rule.split('{')[0];
      if (/transition:\s*none|animation:\s*none/.test(rule)) continue;
      expect(selector, rule).toContain("[data-tpl-motion='on']");
    }
    // Tidak ada yang tersembunyi tanpa gerak: opacity 0 / skala 0 hanya di keyframes atau di bawah gerbang gerak
    for (const rule of rules.match(/^\s*[^@\s{}][^{}]*\{[^}]*(opacity:\s*0[;\s]|scale[XY]?\(0\))[^}]*\}/gm) ?? []) {
      expect(rule.split('{')[0], rule).toContain("[data-tpl-motion='on']");
    }
    // Blok reduced-motion mematikan setiap kelas yang dianimasikan
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'), css.indexOf('@media print'));
    for (const cls of ['.sh-fly', '.sh-fly-y', '.sh-spin', '.sh-slot', '.sh-pill', '.sh-dot', '.sh-track', '.sh-swap', '.sh-collapse']) expect(reduced, cls).toContain(cls);
    for (const cls of css.match(/\.[a-z][\w-]*/g) ?? []) if (!/^\.(tpl-)/.test(cls)) expect(cls, cls).toMatch(/^\.sh-/);
    for (const [, seconds] of css.matchAll(/animation:\s*sh-[a-z-]+\s+([\d.]+)s/g)) expect(Number(seconds)).toBeLessThanOrEqual(1.6);
    for (const [, seconds] of css.matchAll(/transition:\s*[a-z-]+\s+([\d.]+)s/g)) expect(Number(seconds)).toBeLessThanOrEqual(1);
    expect(css).not.toMatch(/infinite/);
  });
});

describe('SmashHall: warna tema bisa diganti', () => {
  it('merah-oranye bawaan → --tpl-accent; teks di atas aksen tinta (≥ 4,5:1); warna CMS mengalir ke --sh-bright', () => {
    const base = demo();
    expect(rootStyle(base, '--tpl-accent')).toBe('#f0542d');
    expect(rootStyle(base, '--sh-bright')).toBe('#f0542d');
    expect(rootStyle(base, '--tpl-on-accent')).toBe('#121620');
    expect(contrast(rgb(rootStyle(base, '--tpl-on-accent')), rgb('#F0542D'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(rgb(rootStyle(base, '--tpl-accent-ink')), rgb('#FFFFFF'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(rgb(rootStyle(base, '--tpl-accent-ink')), rgb('#F6F5F3'))).toBeGreaterThanOrEqual(4.5);
    cleanup();
    for (const accent of ['#1D4ED8', '#FACC15', '#0F5C63']) {
      const other = demo({ brand: { accent_color: accent } });
      expect(rootStyle(other, '--tpl-accent')).toBe(accent.toLowerCase());
      expect(rootStyle(other, '--sh-bright')).toBe((smashhallVars(accent) as Record<string, string>)['--sh-bright']);
      expect(contrast(rgb(rootStyle(other, '--tpl-on-accent')), rgb(accent)), accent).toBeGreaterThanOrEqual(4.5);
      expect(contrast(rgb(rootStyle(other, '--tpl-accent-ink')), rgb('#FFFFFF')), accent).toBeGreaterThanOrEqual(4.5);
      cleanup();
    }
    expect(rootStyle(demo({ brand: { accent_color: '#FACC15' } }), '--tpl-on-accent')).toBe('#121620');
  });
});

describe('SmashHall: SEO situs pembeli, judul, gambar, tautan', () => {
  it('judul tab & meta description dari nama, tagline, dan deskripsi hero; theme-color = aksen', () => {
    expect(siteTitle('smashhall', null)).toBe('GOR SmashHall — GOR & Klub Badminton di Bandung');
    expect(siteTitle('smashhall', null).length).toBeLessThanOrEqual(60);
    const restore = applySiteHead('smashhall', null);
    const description = document.head.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
    expect(description).toMatch(/^Delapan lapangan karpet vinyl di Bandung/);
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(200);
    expect(document.head.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#F0542D');
    restore();
  });

  it('satu H1, tiap section diawali tepat satu H2, H3 hanya di bawah H2, tanpa h4–h6', () => {
    const container = demo();
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelectorAll('h4, h5, h6')).toHaveLength(0);
    const rest = ORDER.filter((k) => k !== 'hero');
    for (const key of rest) {
      const levels = Array.from(section(container, key).querySelectorAll('h1, h2, h3')).map((h) => h.tagName);
      expect(levels[0], key).toBe('H2');
      expect(levels.filter((l) => l === 'H2'), key).toHaveLength(1);
    }
    expect(section(container, 'hero').querySelector('h2, h3')).toBeNull();
    cleanup();
    const untitled = demo(Object.fromEntries(rest.map((k) => [k, { title: '' }])));
    for (const key of rest) {
      const levels = Array.from(section(untitled, key).querySelectorAll('h1, h2, h3')).map((h) => h.tagName);
      expect(levels[0], key).toBe('H2');
      expect(levels.filter((l) => l === 'H2'), key).toHaveLength(1);
      expect(section(untitled, key).querySelector('h2'), key).toHaveClass('sr-only');
    }
    expect(section(untitled, 'availability').querySelector('h2')!.textContent).toBe('Ketersediaan lapangan');
    expect(section(untitled, 'faq').querySelector('h2')!.textContent).toBe('FAQ');
    cleanup();
    const bare = demo(Object.fromEntries(rest.map((k) => [k, { title: '', eyebrow: '', subtitle: '' }])));
    expect(rest.map((k) => section(bare, k).querySelector('h2')?.textContent)).toEqual([
      'Ketersediaan lapangan',
      'Fasilitas',
      'Paket member',
      'Jadwal latihan',
      'Akademi',
      'Kejuaraan',
      'Perlengkapan',
      'Galeri',
      'Tanya jawab',
      'Kontak',
    ]);
  });

  it('gambar: alt deskriptif, width/height, srcset & sizes', () => {
    const container = demo();
    const imgs = Array.from(container.querySelectorAll('img'));
    expect(imgs).toHaveLength(15);
    for (const img of imgs) {
      const src = img.getAttribute('src') ?? '';
      expect(Number(img.getAttribute('width')), src).toBeGreaterThan(0);
      expect(Number(img.getAttribute('height')), src).toBeGreaterThan(0);
      expect(img.getAttribute('srcset'), src).toMatch(/ (800|240)w, /);
      expect(img.getAttribute('sizes'), src).toBeTruthy();
      expect((img.getAttribute('alt') ?? '').split(' ').length, src).toBeGreaterThanOrEqual(5);
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

describe('SmashHall: konten opsional kosong', () => {
  it('hero: tanpa data lapangan → tanpa strip; tabel disembunyikan → strip tanpa tautan, tombol ke formulir; tanpa tombol menu atas', () => {
    const none = section(demo({ availability: { courts: [] } }), 'hero');
    expect(none.querySelector('[data-sh-strip]')).toBeNull();
    expect(none.querySelector('img[fetchpriority="high"]')).not.toBeNull();
    cleanup();
    const hidden = demo({ availability: { enabled: false }, hero: { header_label: '' } });
    const hero = section(hidden, 'hero');
    expect(hero.querySelector('[data-sh-strip]')).not.toBeNull();
    expect(within(hero).queryByRole('link', { name: 'Lihat semua jadwal' })).toBeNull();
    expect(within(hero).getByRole('link', { name: 'Cek Lapangan' })).toHaveAttribute('href', '#kontak');
    expect(within(hidden.querySelector('header')!).queryByRole('link', { name: 'Booking' })).toBeNull();
    expect(sectionKeys(hidden)).not.toContain('availability');
    cleanup();
    // Legenda & judul kolom dari CMS
    const relabeled = withDate(WEDNESDAY, () =>
      demo({ availability: { free_label: 'Tersedia', full_label: 'Terisi', chosen_label: 'Pilihan' }, training: { columns: 'Hari · Waktu · Kelas · Tingkat · Coach' } }),
    );
    expect(Array.from(relabeled.querySelectorAll('[data-sh-strip] ul > li')).map((li) => li.textContent)).toEqual(['Tersedia', 'Terisi']);
    const table = section(relabeled, 'availability');
    expect(within(table).getAllByRole('tab')[0].textContent).toBe('Senin39 tersedia');
    expect(within(table).getByRole('button', { name: 'Lapangan 1, 19.00, terisi' })).toBeInTheDocument();
    expect(table.textContent).toContain('Pilihan');
    expect(Array.from(section(relabeled, 'training').querySelector('div[aria-hidden="true"]')!.querySelectorAll('span')).map((s) => s.textContent)).toEqual([
      'Hari',
      'Waktu',
      'Kelas',
      'Tingkat',
      'Coach',
    ]);
  });

  it('fasilitas/kejuaraan tanpa foto → kolom penuh; member tanpa periode & sorotan; akademi tanpa foto → pita usia; toko tanpa foto', () => {
    const container = demo({
      facilities: { image: '' },
      championships: { image: '' },
      membership: { quarterly_label: '', plans: [{ name: 'Reguler', price: 'Rp350.000', price_quarter: 'Rp1' }, { name: 'Klub', price: 'Rp1.050.000' }] },
      academy: { groups: [{ name: 'Anak', ages: '7–12 th', image: '' }] },
      shop: { items: [{ name: 'Grip handuk', price: 'Rp15.000', image: '' }] },
      gallery: { items: [{ image: '/assets/templates/photos/smashhall-galeri-net-1200.webp', caption: '' }] },
      training: { coaches: [] },
      footer: { instagram: '', youtube: '', tiktok: '' },
    });
    const facilities = section(container, 'facilities');
    expect(facilities.querySelector('img')).toBeNull();
    expect(facilities.innerHTML).toContain('@5xl:col-span-12');
    expect(facilities.querySelector('dl')!.className).toContain('@3xl:grid-cols-4');
    expect(facilities.querySelector('svg[viewBox="0 0 200 440"]')).toBeNull();
    const championships = section(container, 'championships');
    expect(championships.querySelector('img')).toBeNull();
    expect(championships.innerHTML).toContain('@5xl:col-span-12');
    const membership = section(container, 'membership');
    expect(within(membership).queryByRole('group', { name: 'Periode paket' })).toBeNull();
    expect(membership.querySelector('[data-featured]')).toBeNull();
    expect(Array.from(membership.querySelectorAll('.sh-swap')).map((p) => p.firstElementChild!.textContent)).toEqual(['Rp350.000', 'Rp1.050.000']);
    expect(membership.querySelector('ul')!.className).toContain('@3xl:grid-cols-2');
    const academy = section(container, 'academy');
    expect(academy.querySelector('img')).toBeNull();
    expect(academy.querySelector('p.text-\\[40px\\]')!.textContent).toBe('7–12 th');
    expect(section(container, 'shop').querySelector('img')).toBeNull();
    const gallery = section(container, 'gallery');
    expect(gallery.querySelectorAll('img')).toHaveLength(1);
    expect(gallery.querySelector('figcaption')).toBeNull();
    const training = section(container, 'training');
    expect(training.innerHTML).toContain('@6xl:col-span-12');
    expect(within(training).queryByRole('heading', { level: 3 })).toBeNull();
    expect(within(container.querySelector('footer')!).queryByRole('list', { name: 'Media sosial' })).toBeNull();
    cleanup();
    const hidden = demo({ gallery: { items: [] }, faq: { enabled: false }, shop: { enabled: false }, footer: { enabled: false } });
    expect(sectionKeys(hidden)).not.toContain('gallery');
    expect(sectionKeys(hidden)).not.toContain('faq');
    expect(sectionKeys(hidden)).not.toContain('shop');
    expect(hidden.querySelector('footer')).toBeNull();
    expect(Array.from(hidden.querySelector('header nav')!.querySelectorAll('a')).map((a) => a.getAttribute('href'))).not.toContain('#shop');
  });

  it('tanpa WhatsApp: slot terpilih → formulir; paket/akademi/toko → formulir; formulir → email, lalu salin pesan', () => {
    const fill = (formEl: HTMLElement) => {
      fireEvent.change(within(formEl).getByLabelText('Keperluan'), { target: { value: 'Akademi' } });
      fireEvent.change(within(formEl).getByLabelText('Nama'), { target: { value: 'Rina' } });
      act(() => {
        fireEvent.submit(formEl);
      });
    };
    const container = demo({ contact: { whatsapp: '' } });
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    const availability = section(container, 'availability');
    fireEvent.click(within(availability).getByRole('button', { name: 'Lapangan 1, 16.00, kosong' }));
    expect(within(availability).getByRole('link', { name: 'Isi formulir booking' })).toHaveAttribute('href', '#kontak');
    expect(within(section(container, 'membership')).getByRole('link', { name: 'Gabung paket Rutin' })).toHaveAttribute('href', '#kontak');
    expect(within(section(container, 'academy')).getByRole('link', { name: 'Daftar akademi kelompok Anak' })).toHaveAttribute('href', '#kontak');
    expect(within(section(container, 'shop')).getByRole('link', { name: 'Pesan Raket latihan' })).toHaveAttribute('href', '#kontak');
    const contact = section(container, 'contact');
    const formEl = within(contact).getByRole('form');
    expect(within(formEl).getByRole('button', { name: 'Susun pesan' })).toHaveAttribute('type', 'submit');
    fill(formEl);
    expect(within(contact).getByRole('link', { name: 'Kirim lewat email' }).getAttribute('href')).toMatch(
      /^mailto:halo@smashhall\.test\?subject=Booking%20%26%20pendaftaran&body=Halo%20GOR%20SmashHall%2C%20saya%20ingin%20mendaftar%20akademi/,
    );
    cleanup();
    const bare = section(demo({ contact: { whatsapp: '', email: '' } }), 'contact');
    fill(within(bare).getByRole('form'));
    expect(within(bare).getByRole('button', { name: 'Salin pesan' })).toBeInTheDocument();
    // Kalimat jujur tetap tampil walau keterangan formulir dikosongkan
    cleanup();
    expect(section(demo({ contact: { form_text: '' } }), 'contact').textContent).toContain('data tidak disimpan di website');
  });
});

describe('SmashHall: editor CMS', () => {
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

describe('SmashHall: data katalog', () => {
  const FILE = 'database/migrations/2026-10-28_042_smashhall_template.sql';
  const sql = () => readFileSync(resolve(ROOT, FILE), 'utf8');

  it('migrasi 042: baris smashhall dengan template_code, kategori, harga, pratinjau, galeri, dan fitur jujur', () => {
    const text = sql();
    expect(text).toContain("'smashhall'");
    expect(text).toContain("'Olahraga & Komunitas'");
    expect(text).toContain('1390000.00');
    expect(text).toContain("'/assets/templates/smashhall-preview.webp'");
    expect(text).toContain('\'["/assets/templates/smashhall-1.webp","/assets/templates/smashhall-2.webp"]\'');
    expect(text).toMatch(/hanya menyusun pesan WhatsApp ke admin/);
    expect(text).toMatch(/jadwal yang tampil adalah contoh/);
    expect(text).toMatch(/tidak ada pembayaran online, tidak ada akun member, tidak ada keranjang belanja/);
    expect(text).toMatch(/data formulir tidak disimpan di website/);
    expect(text).not.toMatch(/termasuk domain|domain, hosting|PBSI|bersertifikat|terbaik|dijamin/i);
    const features = JSON.parse(/features\s+= '(\[.*\])',/.exec(text)![1]) as string[];
    expect(features.length).toBeGreaterThanOrEqual(6);
    expect(features.length).toBeLessThanOrEqual(8);
    expect(features[features.length - 1]).toBe('Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)');
  });

  it('migrasi 042 aman diulang (INSERT IGNORE + UPDATE berdasarkan slug, tanpa DELETE) dan tercatat di schema_migrations', () => {
    const raw = sql();
    expect(raw).toMatch(/Domain\s+(--\s+)?tidak\s+(--\s+)?termasuk harga template/);
    expect(raw).toMatch(/FIKTIF/);
    expect(raw).toMatch(/SETELAH kode/);
    expect(raw).toMatch(/MENIMPA perubahan admin/);
    expect(raw).toMatch(/Unsplash/);
    const text = raw.replace(/^--.*$/gm, '');
    expect(text).toMatch(/INSERT IGNORE INTO templates/);
    expect(text).toMatch(/WHERE slug = 'smashhall';/);
    expect(text).toMatch(/sort_order\s+= 25/);
    expect(text).toMatch(/status\s+= 'published'/);
    expect(text).toMatch(/category\s+= 'Olahraga & Komunitas'/);
    expect(text).toMatch(/price\s+= 1390000\.00/);
    expect(text).not.toMatch(/\bDELETE\b/);
    expect(text).toContain("VALUES ('2026-10-28_042', 'templates: katalog SmashHall')");
  });

  it('gambar pratinjau katalog ada di public/, 1600×1000, dan ringan', () => {
    for (const name of ['smashhall-preview', 'smashhall-1', 'smashhall-2']) {
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

describe('SmashHall: konten aneh', () => {
  it('angka, null, dan string di tempat list tidak membuat crash; tautan berbahaya dibuang', () => {
    const weird = {
      hero: { image: 'javascript:alert(1)', highlight: 'tidak ada di judul', primary_url: 'javascript:alert(1)', header_url: 'vbscript:x' },
      availability: { courts: 'x', days: [null, { label: 3 }, { label: 'Senin', full: 7 }], hours: 42, prices: 'x' },
      facilities: { stats: [{ value: 5 }, null], items: 'x', image: 'javascript:alert(1)' },
      membership: { plans: [null, { name: 'Paket', perks: 5, price: 7 }], quarterly_label: 9 },
      training: { sessions: 'x', coaches: [null, { name: 4 }] },
      academy: { groups: [{ name: 'Anak', image: 'javascript:alert(1)' }, 'x'] },
      championships: { events: [{ name: 'Cup', date: 5, status: null }], image: 'javascript:alert(1)' },
      shop: { items: [{ name: 'Raket', image: 'javascript:alert(1)' }] },
      gallery: { items: [{ image: 'javascript:alert(1)' }, 'x'] },
      faq: { items: [{ question: 2, answer: null }], link_url: 'vbscript:x' },
      contact: { whatsapp: 'abc', maps_url: 'javascript:alert(1)' },
      footer: { instagram: 'javascript:alert(1)' },
      brand: { accent_color: 'oranye' },
    } as unknown as SiteContent;
    const { container } = render(<def.Component content={resolveContent(def, weird)} />);
    expect(container.querySelector('a[href^="javascript:"], a[href^="vbscript:"]')).toBeNull();
    expect(container.querySelector('img[src^="javascript:"]')).toBeNull();
    expect(container.querySelector('h1')!.textContent).toBe('Main, latihan, dan bertanding di satu GOR');
    expect(sectionKeys(container)).not.toContain('gallery');
    expect(sectionKeys(container)).not.toContain('availability');
    expect(container.querySelector('[data-sh-strip]')).toBeNull();
    expect(section(container, 'shop').textContent).toContain('Raket');
    expect(rootStyle(container, '--sh-bright')).toBe('#f0542d');
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
