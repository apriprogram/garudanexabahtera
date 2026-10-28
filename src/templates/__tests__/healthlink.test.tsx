// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/healthlink.test.tsx
// HealthLink (telemedicine "app home" 2026-10-28): skema CMS & konten demo, foto (registry, berkas, bobot), salinan
// jujur layanan kesehatan (tanpa klaim akreditasi/kesembuhan, 119 sebagai nomor darurat nasional, dokter tanpa foto,
// konsultasi lewat WhatsApp/aplikasi, rekam medis tidak disimpan), helper model (warna tema, menu, tujuan tautan,
// cari & saring dokter, pengingat .ics/Google Calendar dengan string persis), demo (urutan section, hero kartu aplikasi
// + cari, header + menu HP, saringan dokter, pengingat, bilah aksi bawah, akordeon), datar tanpa bayangan, gerak
// (pratinjau CMS diam, CSS hl- bergerbang data-tpl-motion, berhenti sendiri), warna tema, SEO situs pembeli, judul &
// gambar & tautan, konten opsional kosong, editor CMS, data katalog (migrasi 047 + pratinjau), dan konten aneh.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionEditor } from '../../pages/account/cms/SectionEditor';
import { validateContent } from '../../pages/account/cms/validation';
import { TEMPLATES, resolveContent } from '../index';
import { iconKey } from '../healthlink/icons';
import {
  DEFAULT_TYPES,
  MESSAGES,
  PAGE_SECTIONS,
  cleanText,
  displayPhone,
  emergencyTel,
  filterDoctors,
  googleCalendarHref,
  healthlinkVars,
  isOnline,
  navItems,
  normalizeSearch,
  readHealthLink,
  reminderFileName,
  reminderIcs,
  reminderTitle,
  reminderTypes,
  reminderWhen,
  sectionItems,
  sectionShown,
  sectionTarget,
  specialtiesOf,
  splitLines,
  validateReminder,
  type ReminderForm,
} from '../healthlink/model';
import { HEALTHLINK_PHOTOS } from '../healthlink/photos';
import { applySiteHead, siteTitle } from '../siteHead';
import { SiteRenderer } from '../SiteRenderer';
import { contrast, parseHex } from '../shared/utils';
import { isListField, type ListItem, type SiteContent } from '../types';

// Demo panjang + getByRole di jsdom: bisa lewat 5 dtk saat suite berjalan paralel
vi.setConfig({ testTimeout: 30_000 });

const ROOT = process.cwd();
const def = TEMPLATES.healthlink;
const ORDER = ['hero', 'services', 'steps', 'doctors', 'prescription', 'records', 'reminders', 'hospitals', 'pricing', 'download', 'faq', 'contact'];
const sectionKeys = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-tpl-section]')).map((s) => s.getAttribute('data-tpl-section'));
const section = (root: HTMLElement, key: string) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`)!;
const demo = (content: unknown = null, preview = false) => render(<SiteRenderer templateCode="healthlink" content={content} preview={preview} />).container;
const rgb = (hex: string) => parseHex(hex)!;
const publicFile = (url: string) => resolve(ROOT, 'public', url.replace(/^\//, ''));
const rootStyle = (container: HTMLElement, name: string) => {
  const holder = Array.from(container.querySelectorAll<HTMLElement>('[style]')).find((el) => el.style.getPropertyValue(name));
  return holder?.style.getPropertyValue(name) ?? '';
};
const urls = (src: string) => {
  const asset = HEALTHLINK_PHOTOS.asset(src)!;
  return [asset.src, ...asset.srcSet!.split(',').map((part) => part.trim().split(' ')[0])].filter((u, i, all) => all.indexOf(u) === i);
};
const wa = (message: string) => `https://wa.me/6281234567890?text=${encodeURIComponent(message)}`;
const DOCTORS = [
  'dr. Sekar Ayuningtyas',
  'dr. Bima Prasetyo, Sp.A',
  'dr. Larasati Wening, Sp.DVE',
  'dr. Haryo Nugroho, Sp.PD',
  'dr. Ayu Pertiwi, Sp.OG',
  'dr. Galih Santosa, Sp.KJ',
];
const doctorNames = (root: HTMLElement) => Array.from(section(root, 'doctors').querySelectorAll('article h3')).map((h) => h.textContent);
const reminder = (patch: Partial<ReminderForm> = {}): ReminderForm => ({
  type: 'Kontrol ke dokter',
  date: '2026-11-05',
  time: '09:00',
  alarm: '1h',
  note: '',
  ...patch,
});
const readBlob = (blob: Blob) =>
  new Promise<string>((done) => {
    const reader = new FileReader();
    reader.onload = () => done(String(reader.result));
    reader.readAsText(blob);
  });
/** Semua nilai teks konten (rekursif). */
const strings = (value: unknown): string[] =>
  typeof value === 'string' ? [value] : value && typeof value === 'object' ? Object.values(value).flatMap(strings) : [];

let scrolled: (string | null)[] = [];
beforeEach(() => {
  scrolled = [];
  Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
    scrolled.push(this.getAttribute('data-tpl-section'));
  });
});
afterEach(cleanup);

describe('HealthLink: skema & konten bawaan', () => {
  it('urutan form = urutan halaman, semua section bisa disembunyikan, field unik, list berbatas', () => {
    expect(def.code).toBe('healthlink');
    expect(def.name).toBe('HealthLink');
    expect(def.features).toBeUndefined();
    expect(def.sections.map((s) => s.key)).toEqual(['brand', ...ORDER, 'footer']);
    expect([...PAGE_SECTIONS]).toEqual([...ORDER, 'footer']);
    const fields = (key: string) => def.sections.find((s) => s.key === key)!.fields.map((f) => f.key);
    expect(fields('brand')).toEqual(['company_name', 'tagline', 'logo', 'accent_color']);
    expect(def.sections[0].fields.find((f) => f.key === 'accent_color')?.type).toBe('color');
    expect(fields('hero')).toEqual(
      expect.arrayContaining([
        'image',
        'tiles',
        'chips',
        'highlight',
        'search_placeholder',
        'search_button',
        'chat_url',
        'video_url',
        'header_label',
        'header_url',
        'dock_chat_label',
        'dock_video_label',
        'emergency_note',
      ]),
    );
    expect(fields('reminders')).toEqual(expect.arrayContaining(['types', 'form_button', 'privacy_note', 'image']));
    expect(fields('contact')).toEqual(
      expect.arrayContaining(['address', 'maps_query', 'maps_url', 'phone', 'email', 'whatsapp', 'whatsapp_message', 'hours', 'emergency_title', 'emergency_text', 'emergency_phone']),
    );
    expect(fields('footer')).toEqual(expect.arrayContaining(['description', 'disclaimer', 'copyright', 'instagram', 'facebook', 'linkedin', 'youtube', 'tiktok']));
    const contact = def.sections.find((s) => s.key === 'contact')!;
    expect(contact.fields.find((f) => f.key === 'whatsapp')?.type).toBe('phone');
    // Dokter tampil dengan inisial: list dokter tidak punya field foto
    const doctors = def.sections.find((s) => s.key === 'doctors')!.fields.find((f) => f.key === 'items')!;
    expect(isListField(doctors) && doctors.fields.map((f) => f.type)).not.toContain('image');
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
      'hero.tiles': 4,
      'hero.chips': 2,
      'services.items': 6,
      'steps.steps': 4,
      'doctors.items': 9,
      'prescription.steps': 4,
      'prescription.options': 4,
      'records.points': 4,
      'records.visits': 4,
      'reminders.types': 6,
      'hospitals.items': 8,
      'hospitals.stats': 3,
      'pricing.plans': 3,
      'faq.items': 8,
    });
    // Batas list di model = batas skema (item ke-10 dst. tidak dirender)
    const many = (n: number, item: ListItem) => Array.from({ length: n }, () => item);
    expect(sectionItems('doctors', { items: many(12, { name: 'dr. A' }) })).toHaveLength(9);
    expect(sectionItems('services', { items: many(9, { title: 'Chat' }) })).toHaveLength(6);
    expect(sectionItems('hospitals', { items: many(9, { name: 'RS' }) })).toHaveLength(8);
    expect(sectionItems('pricing', { plans: many(5, { name: 'Paket' }) })).toHaveLength(3);
  });

  it('konten demo lolos validasi CMS, logo kosong, semua foto terdaftar, ada di public/, dipakai, dan beralt deskriptif', () => {
    const c = def.defaultContent;
    expect(validateContent(def, resolveContent(def, null))).toEqual({});
    expect(c.brand.logo).toBe('');
    expect(c.brand.accent_color).toBe('#0891B2');
    expect(c.contact.whatsapp).toBe('081234567890');
    expect(c.hero.image).toBe('/assets/templates/photos/healthlink-hero-1920.webp');
    for (const s of def.sections) if (s.key !== 'brand') expect(c[s.key].enabled, s.key).toBe(true);
    const photos = JSON.stringify(c).match(/\/assets\/templates\/photos\/[a-z0-9-]+\.webp/g) ?? [];
    for (const src of photos) expect(HEALTHLINK_PHOTOS.asset(src), src).not.toBeNull();
    expect(HEALTHLINK_PHOTOS.keys).toHaveLength(12);
    for (const key of HEALTHLINK_PHOTOS.keys) {
      expect(key.startsWith('healthlink-'), key).toBe(true);
      for (const url of urls(HEALTHLINK_PHOTOS.src(key))) expect(existsSync(publicFile(url)), url).toBe(true);
      expect(photos, `${key} dipakai di konten demo`).toContain(HEALTHLINK_PHOTOS.src(key));
      expect(HEALTHLINK_PHOTOS.alt(HEALTHLINK_PHOTOS.src(key), '').split(' ').length, key).toBeGreaterThanOrEqual(5);
    }
    // Simbol bawaan juga tersedia sebagai SVG mandiri, path sama dengan komponen
    const mark = readFileSync(publicFile('/assets/templates/logos/healthlink-mark.svg'), 'utf8');
    const component = readFileSync(resolve(ROOT, 'src/templates/healthlink/marks.tsx'), 'utf8');
    const paths = mark.match(/ d="[^"]+"/g) ?? [];
    expect(paths).toHaveLength(3);
    for (const d of paths) expect(component, d).toContain(d.trim());
    expect(mark).toMatch(/viewBox="0 0 32 32"/);
    expect(mark).toMatch(/width="32" height="32"/);
    expect(mark).toMatch(/role="img"/);
    expect(mark).toMatch(/aria-label="[^"]+"/);
    expect(mark).toMatch(/<title>/);
    expect(mark).toMatch(/fill="currentColor"/);
    // Judul tab situs pembeli ≤ 60 karakter, deskripsi hero 120–155 karakter; salinan hero pendek (≤ 9 kata, ≤ 160)
    expect(`${c.brand.company_name} — ${c.brand.tagline}`.length).toBeLessThanOrEqual(60);
    expect(String(c.hero.subtitle).length).toBeGreaterThanOrEqual(120);
    expect(String(c.hero.subtitle).length).toBeLessThanOrEqual(155);
    expect(String(c.hero.title).split(' ').length).toBeLessThanOrEqual(9);
    // Salinan kartu tidak bertele-tele (≤ 120 karakter per teks kartu)
    for (const item of c.services.items as ListItem[]) expect(String(item.text).length, String(item.title)).toBeLessThanOrEqual(120);
    for (const s of ORDER.filter((k) => k !== 'hero')) if (c[s].subtitle) expect(String(c[s].subtitle).length, s).toBeLessThanOrEqual(80);
  });

  it('CREDITS.md mencatat setiap kunci foto HealthLink', () => {
    // CREDITS.md gets this template's section at integration
    // (bagian dari <scratch>/healthlink/CREDITS-section.md ditempel integrator; sebelum itu assertion ini merah)
    const credits = readFileSync(resolve(ROOT, 'public/assets/templates/photos/CREDITS.md'), 'utf8');
    expect(HEALTHLINK_PHOTOS.keys.filter((key) => !credits.includes(`\`${key}-*\``))).toEqual([]);
  });

  it('foto demo ringan: hero 800/1280/1920, WebP ≤ 140 KB per file (800w ≤ 90 KB), total ≤ 2,5 MB', () => {
    expect(HEALTHLINK_PHOTOS.asset(def.defaultContent.hero.image as string)!.srcSet).toBe(
      '/assets/templates/photos/healthlink-hero-800.webp 800w, /assets/templates/photos/healthlink-hero-1280.webp 1280w, /assets/templates/photos/healthlink-hero-1920.webp 1920w',
    );
    let total = 0;
    for (const key of HEALTHLINK_PHOTOS.keys) {
      for (const url of urls(HEALTHLINK_PHOTOS.src(key))) {
        expect(url, url).toMatch(/\.webp$/);
        const kb = statSync(publicFile(url)).size / 1024;
        expect(kb, url).toBeLessThanOrEqual(url.endsWith('-800.webp') ? 90 : 140);
        const head = readFileSync(publicFile(url)).subarray(0, 16).toString('ascii');
        expect(head.slice(0, 4) + head.slice(8, 12), url).toBe('RIFFWEBP');
        total += kb;
      }
    }
    expect(total).toBeLessThanOrEqual(2500);
  });

  it('salinan demo jujur: tanpa klaim akreditasi/kesembuhan, 119 hanya sebagai nomor darurat, data & pembayaran tidak di website', () => {
    const c = def.defaultContent;
    const text = JSON.stringify(c);
    expect(text).not.toMatch(
      /dijamin|garansi|pasti |terbaik|nomor 1|#1|termurah|100%|terakreditasi|akreditasi|\bKARS\b|sembuh|izin resmi|berizin|bersertifikat|\bISO\b|hari kerja/i,
    );
    for (const sentence of [
      'Rekam medis tidak disimpan di website ini.',
      'tidak ada data yang dikirim atau disimpan di website',
      'Pembayaran tidak diproses di website ini',
      'Telekonsultasi bukan untuk keadaan darurat. Hubungi 119 atau datang ke IGD terdekat.',
      'Jadwal dan status dokter adalah contoh',
      'Nama rumah sakit di demo adalah contoh (fiktif).',
      'Tautan aplikasi di demo adalah contoh.',
      'merek contoh (fiktif)',
      'Ilustrasi percakapan',
    ]) {
      expect(text, sentence).toContain(sentence);
    }
    // 119 = nomor darurat nasional: selalu bersama ajakan ke IGD (atau nomor itu sendiri); nomor lain hanya pola demo
    const all = strings(c);
    for (const value of all.filter((v) => /\b119\b/.test(v))) expect(value === '119' || /IGD/.test(value), value).toBe(true);
    expect(c.contact.emergency_phone).toBe('119');
    expect(text.match(/\b0\d{7,}\b/g)).toEqual(['081234567890', '081234567890']);
    expect(String(c.contact.email)).toMatch(/\.test$/);
    // Dokter fiktif bergelar, tanpa foto (hanya teks)
    const doctors = c.doctors.items as ListItem[];
    expect(doctors.map((d) => d.name)).toEqual(DOCTORS);
    for (const d of doctors) expect(Object.keys(d).sort(), String(d.name)).toEqual(['keywords', 'name', 'price', 'specialty', 'status']);
    expect(String(c.steps.chat_doctor_name)).toBe('dr. Sekar Ayuningtyas');
    // Tombol chat/video/menu kosong = WhatsApp atau aplikasi pembeli; tidak ada URL telekonsultasi palsu
    expect([c.hero.chat_url, c.hero.video_url, c.hero.header_url]).toEqual(['', '', '']);
  });
});

describe('HealthLink: helper model', () => {
  it('warna tema: tombol ≥ 4,5:1 di kanvas & putih, ikon di tint ≥ 4,5:1, pita gelap ≥ 12:1; tidak valid → bawaan', () => {
    expect(healthlinkVars('#0891B2')).toEqual({
      '--hl-solid': '#087895',
      '--hl-solid-hover': '#086882',
      '--hl-tint': '#e1f2f6',
      '--hl-tint-ink': '#086e89',
      '--hl-deep': '#073443',
      '--hl-bright': '#39a7c1',
    });
    const white = rgb('#ffffff');
    const canvas = rgb('#F5F7FA');
    for (const accent of ['#0891B2', '#FACC15', '#1D4ED8', '#22C55E', '#F472B6', '#111111', '#FFFFFF', '#000000', '#A61E3A', '#C6F135', '#6EE7B7', '#7C3AED']) {
      const vars = healthlinkVars(accent) as Record<string, string>;
      const solid = rgb(vars['--hl-solid']);
      expect(contrast(solid, canvas), accent).toBeGreaterThanOrEqual(4.5);
      expect(contrast(solid, white), accent).toBeGreaterThanOrEqual(4.5);
      expect(contrast(rgb(vars['--hl-solid-hover']), white), accent).toBeGreaterThanOrEqual(4.5);
      expect(contrast(rgb(vars['--hl-tint-ink']), rgb(vars['--hl-tint'])), accent).toBeGreaterThanOrEqual(4.5);
      expect(contrast(rgb('#4A5869'), rgb(vars['--hl-tint'])), accent).toBeGreaterThanOrEqual(4.5);
      expect(contrast(rgb(vars['--hl-deep']), white), accent).toBeGreaterThanOrEqual(12);
      expect(contrast(rgb(vars['--hl-bright']), rgb(vars['--hl-deep'])), accent).toBeGreaterThanOrEqual(4.5);
    }
    expect(healthlinkVars('zzz')).toEqual(healthlinkVars('#0891B2'));
    // Netral tetap: tinta & teks kedua di kanvas dan putih, merah darurat di latar merah muda
    expect(contrast(rgb('#0E1B2B'), canvas)).toBeGreaterThanOrEqual(7);
    expect(contrast(rgb('#4A5869'), canvas)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(rgb('#5E6B7C'), white)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(rgb('#B42318'), rgb('#FEF3F2'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(rgb('#0B7A3B'), rgb('#F5F7FA'))).toBeGreaterThanOrEqual(4.5);
  });

  it('menu: label pendek dari label section, section kosong/tersembunyi keluar dari menu', () => {
    const content = resolveContent(def, null);
    expect(navItems(content).map((i) => `${i.key}:${i.label}`)).toEqual([
      'services:Layanan',
      'doctors:Dokter online',
      'prescription:Resep',
      'hospitals:RS mitra',
      'pricing:Biaya',
      'faq:Tanya jawab',
    ]);
    const less = resolveContent(def, {
      prescription: { enabled: false },
      hospitals: { items: [] },
      faq: { eyebrow: 'Pertanyaan yang sering diajukan' },
      doctors: { eyebrow: '' },
    });
    expect(navItems(less).map((i) => `${i.key}:${i.label}`)).toEqual(['services:Layanan', 'doctors:Dokter', 'pricing:Biaya', 'faq:FAQ']);
  });

  it('section tampil hanya bila berisi; kunci tak dikenal → false', () => {
    const content = resolveContent(def, null);
    for (const key of ORDER) expect(sectionShown(content, key), key).toBe(true);
    const empty = resolveContent(def, {
      services: { items: [{ text: 'tanpa judul' }] },
      steps: { steps: [] },
      doctors: { items: [{ specialty: 'tanpa nama' }] },
      prescription: { title: '', steps: [], image: '' },
      records: { title: '', visits: [], points: [] },
      hospitals: { items: [] },
      pricing: { plans: [{ text: 'tanpa nama & harga' }] },
      download: { title: '', android_url: '', ios_url: '' },
      faq: { items: [] },
    });
    for (const key of ['services', 'steps', 'doctors', 'prescription', 'records', 'hospitals', 'pricing', 'download', 'faq']) expect(sectionShown(empty, key), key).toBe(false);
    expect(sectionShown(content, 'tidak-ada')).toBe(false);
    expect(sectionShown(resolveContent(def, { faq: { enabled: false } }), 'faq')).toBe(false);
  });

  it('tujuan tautan: anchor Indonesia & kunci section, aplikasi pembeli atau WhatsApp, cadangan ke Bantuan', () => {
    expect(sectionTarget('#dokter')).toBe('doctors');
    expect(sectionTarget('#resep')).toBe('prescription');
    expect(sectionTarget('#rekam-medis')).toBe('records');
    expect(sectionTarget('#pengingat')).toBe('reminders');
    expect(sectionTarget('#rs-mitra')).toBe('hospitals');
    expect(sectionTarget('#biaya')).toBe('pricing');
    expect(sectionTarget('#unduh')).toBe('download');
    expect(sectionTarget('#kontak')).toBe('contact');
    expect(sectionTarget('#layanan')).toBe('services');
    expect(sectionTarget('doctors')).toBe('doctors');
    expect(sectionTarget('#tidak-ada')).toBeNull();

    const m = readHealthLink(resolveContent(def, null));
    expect(m.chatAction).toEqual({ kind: 'external', href: wa('Halo HealthLink, saya ingin chat dengan dokter.') });
    expect(m.videoAction).toEqual({ kind: 'external', href: wa('Halo HealthLink, saya ingin menjadwalkan video call dengan dokter.') });
    expect(m.headerAction).toEqual(m.chatAction);
    expect(m.doctorAction({ name: 'dr. Bima Prasetyo, Sp.A', specialty: 'Spesialis anak' })).toEqual({
      kind: 'external',
      href: wa('Halo HealthLink, saya ingin konsultasi dengan dr. Bima Prasetyo, Sp.A (Spesialis anak).'),
    });
    expect(m.doctorAction({ name: 'dr. Sekar' })).toEqual({ kind: 'external', href: wa('Halo HealthLink, saya ingin konsultasi dengan dr. Sekar.') });
    expect(m.planAction({ name: 'Langganan Keluarga' })).toEqual({ kind: 'external', href: wa('Halo HealthLink, saya tertarik dengan paket Langganan Keluarga.') });
    expect(m.prescriptionAction).toEqual({ kind: 'external', href: wa('Halo HealthLink, saya ingin menebus resep digital.') });
    expect(m.recordsAction).toEqual({ kind: 'external', href: wa(MESSAGES.records('HealthLink')) });
    expect(m.waAction).toEqual({ kind: 'external', href: wa('Halo HealthLink, saya ingin konsultasi dengan dokter.') });
    // Ubin/kartu: tujuan otomatis dari ikon nama
    expect(m.itemAction('Chat Dokter', '')).toEqual(m.chatAction);
    expect(m.itemAction('Video Call', '')).toEqual(m.videoAction);
    expect(m.itemAction('Tebus Obat', '')).toEqual({ kind: 'section', target: 'prescription' });
    expect(m.itemAction('Pilih apotek mitra', '')).toEqual({ kind: 'section', target: 'prescription' });
    expect(m.itemAction('Antar obat', '')).toEqual({ kind: 'section', target: 'prescription' });
    expect(m.itemAction('Rekam Medis', '')).toEqual({ kind: 'section', target: 'records' });
    expect(m.itemAction('Cek lab', '')).toEqual({ kind: 'section', target: 'records' });
    expect(m.itemAction('Pengingat kontrol', '')).toEqual({ kind: 'section', target: 'reminders' });
    expect(m.itemAction('RS mitra', '')).toEqual({ kind: 'section', target: 'hospitals' });
    expect(m.itemAction('Langganan keluarga', '')).toEqual({ kind: 'section', target: 'pricing' });
    expect(m.itemAction('Dokter gigi', '')).toEqual({ kind: 'section', target: 'doctors' });
    expect(m.itemAction('Apa saja', '#biaya')).toEqual({ kind: 'section', target: 'pricing' });
    expect(m.itemAction('Apa saja', 'https://app.contoh.test/x')).toEqual({ kind: 'external', href: 'https://app.contoh.test/x' });
    expect(m.linkOr('#tidak-ada', m.contactAction)).toEqual({ kind: 'section', target: 'contact' });
    expect(m.linkOr('#beranda', null)).toEqual({ kind: 'section', target: 'hero' });

    // Aplikasi/portal pembeli: chat, tombol menu, dan tombol dokter memakai URL yang sama
    const app = readHealthLink(resolveContent(def, { hero: { chat_url: 'https://app.contoh.test/konsultasi', video_url: 'https://app.contoh.test/video' } }));
    expect(app.chatAction).toEqual({ kind: 'external', href: 'https://app.contoh.test/konsultasi' });
    expect(app.videoAction).toEqual({ kind: 'external', href: 'https://app.contoh.test/video' });
    expect(app.headerAction).toEqual(app.chatAction);
    expect(app.doctorAction({ name: 'dr. A' })).toEqual(app.chatAction);
    // URL berbahaya diabaikan → WhatsApp
    const bad = readHealthLink(resolveContent(def, { hero: { chat_url: 'javascript:alert(1)' } }));
    expect(bad.chatAction).toEqual(m.chatAction);
    expect(bad.doctorAction({ name: 'dr. A' })?.kind).toBe('external');
    // Tanpa WhatsApp → bagian Bantuan; tanpa keduanya → tidak ada tautan
    const noWa = readHealthLink(resolveContent(def, { contact: { whatsapp: '' } }));
    expect(noWa.chatAction).toEqual({ kind: 'section', target: 'contact' });
    expect(noWa.planAction({ name: 'Paket' })).toEqual({ kind: 'section', target: 'contact' });
    const silent = readHealthLink(resolveContent(def, { contact: { enabled: false, whatsapp: '' } }));
    expect(silent.chatAction).toBeNull();
    expect(silent.headerAction).toBeNull();
    expect(silent.doctorAction({ name: 'dr. A' })).toBeNull();
  });

  it('cari & saring dokter: per kata (DAN), tanpa beda huruf/aksen, spesialis unik berurutan', () => {
    const all = def.defaultContent.doctors.items as ListItem[];
    const names = (items: ListItem[]) => items.map((i) => i.name);
    expect(specialtiesOf(all)).toEqual(['Dokter umum', 'Spesialis anak', 'Spesialis kulit', 'Penyakit dalam', 'Kandungan', 'Kesehatan jiwa']);
    expect(specialtiesOf([{ specialty: 'Anak' }, { specialty: 'anak ' }, { specialty: '' }, { specialty: 'Ának' }])).toEqual(['Anak']);
    expect(filterDoctors(all, '', '')).toHaveLength(6);
    expect(names(filterDoctors(all, 'demam', ''))).toEqual(['dr. Sekar Ayuningtyas', 'dr. Bima Prasetyo, Sp.A']);
    expect(names(filterDoctors(all, 'Demam  ANAK', ''))).toEqual(['dr. Bima Prasetyo, Sp.A']);
    expect(names(filterDoctors(all, 'jerawat', ''))).toEqual(['dr. Larasati Wening, Sp.DVE']);
    expect(names(filterDoctors(all, 'sékar', ''))).toEqual(['dr. Sekar Ayuningtyas']);
    expect(names(filterDoctors(all, 'Sp.KJ', ''))).toEqual(['dr. Galih Santosa, Sp.KJ']);
    expect(names(filterDoctors(all, '', 'spesialis KULIT'))).toEqual(['dr. Larasati Wening, Sp.DVE']);
    expect(names(filterDoctors(all, 'demam', 'Spesialis anak'))).toEqual(['dr. Bima Prasetyo, Sp.A']);
    expect(filterDoctors(all, 'demam', 'Kandungan')).toEqual([]);
    expect(filterDoctors(all, 'xyz', '')).toEqual([]);
    expect(normalizeSearch('  Sp.A, Ának!  ')).toBe('sp a anak');
    expect(isOnline('Online')).toBe(true);
    expect(isOnline('Tersedia sekarang')).toBe(true);
    expect(isOnline('Jadwal 19.00')).toBe(false);
    expect(isOnline('')).toBe(false);
  });

  it('teks kecil: nomor darurat, nomor HP berkelompok, baris textarea, teks bersih, ikon otomatis', () => {
    expect(emergencyTel('119')).toBe('tel:119');
    expect(emergencyTel(' 1 1 9 ')).toBe('tel:119');
    expect(emergencyTel('081234567890')).toBe('tel:+6281234567890');
    expect(emergencyTel('12')).toBe('');
    expect(emergencyTel('darurat')).toBe('');
    expect(emergencyTel('')).toBe('');
    expect(displayPhone('081234567890')).toBe('0812-3456-7890');
    expect(displayPhone('(0274) 555-0182')).toBe('(0274) 555-0182');
    expect(displayPhone('')).toBe('');
    expect(splitLines('- Resep digital\n\n• Surat sakit\r\nRiwayat\nSatu\nLima')).toEqual(['Resep digital', 'Surat sakit', 'Riwayat', 'Satu']);
    expect(cleanText('a\u0000b\u0007  c', 10)).toBe('a b c');
    expect(iconKey('Chat dokter umum')).toBe('chat');
    expect(iconKey('Video call spesialis')).toBe('video');
    expect(iconKey('Resep digital')).toBe('prescription');
    expect(iconKey('Tebus Obat')).toBe('prescription');
    // Alur resep: tiga ikon berbeda (pil, toko apotek, kurir)
    expect(['Resep terbit', 'Pilih apotek mitra', 'Diantar kurir'].map(iconKey)).toEqual(['prescription', 'pharmacy', 'delivery']);
    expect(iconKey('Antar obat')).toBe('delivery');
    expect(iconKey('Rekam medis')).toBe('records');
    expect(iconKey('Pengingat kontrol')).toBe('reminder');
    expect(iconKey('Cek laboratorium')).toBe('lab');
    expect(iconKey('Langganan keluarga')).toBe('family');
    expect(iconKey('RS mitra')).toBe('hospital');
    expect(iconKey('Dokter gigi')).toBe('doctor');
  });

  it('pengingat: validasi per isian, jenis dari CMS, ringkasan & nama file', () => {
    const types = reminderTypes(resolveContent(def, null).reminders);
    expect(types).toEqual(['Kontrol ke dokter', 'Tebus obat lanjutan', 'Cek laboratorium', 'Video call lanjutan']);
    expect(reminderTypes({ types: [] })).toEqual([...DEFAULT_TYPES]);
    expect(reminderTypes({ types: 'x' } as unknown as SiteContent['reminders'])).toEqual([...DEFAULT_TYPES]);
    expect(reminderTypes({ types: [{ label: 'Kontrol' }, { label: 'Kontrol' }, { label: '' }, null] } as unknown as SiteContent['reminders'])).toEqual(['Kontrol']);

    expect(validateReminder(reminder(), types, '2026-10-28')).toEqual({});
    expect(validateReminder(reminder({ date: '2026-10-28' }), types, '2026-10-28')).toEqual({});
    expect(validateReminder(reminder({ type: '', date: '', time: '' }), types, '2026-10-28')).toEqual({
      type: 'Pilih jenis pengingat.',
      date: 'Pilih tanggal.',
      time: 'Pilih jam.',
    });
    expect(validateReminder(reminder({ type: 'Bukan pilihan' }), types, '2026-10-28').type).toBe('Pilih jenis pengingat.');
    expect(validateReminder(reminder({ date: '2026-10-27' }), types, '2026-10-28').date).toBe('Pilih tanggal hari ini atau sesudahnya.');
    expect(validateReminder(reminder({ date: '2026-02-30' }), types, '2026-01-01').date).toBe('Tanggal tidak valid.');
    expect(validateReminder(reminder({ date: '05-11-2026' }), types, '2026-01-01').date).toBe('Tanggal tidak valid.');
    expect(validateReminder(reminder({ time: '24:00' }), types, '2026-10-28').time).toBe('Jam tidak valid.');
    expect(validateReminder(reminder({ time: '9:00' }), types, '2026-10-28').time).toBe('Jam tidak valid.');

    expect(reminderWhen('2026-11-05', '09:00')).toBe('Kamis, 5 November 2026 · 09.00');
    expect(reminderWhen('2099-12-31', '19:30')).toBe('Kamis, 31 Desember 2099 · 19.30');
    expect(reminderWhen('2026-02-30', '09:00')).toBe('');
    expect(reminderTitle(reminder(), 'HealthLink')).toBe('Kontrol ke dokter — HealthLink');
    expect(reminderTitle(reminder(), '')).toBe('Kontrol ke dokter');
    expect(reminderFileName(reminder())).toBe('pengingat-2026-11-05.ics');
    expect(reminderFileName(reminder({ date: 'x' }))).toBe('pengingat-kontrol.ics');
  });

  it('pengingat .ics: string iCalendar persis (waktu lokal mengambang, escape, VALARM, CRLF, baris dilipat)', () => {
    // `now` hanya untuk DTSTAMP (UTC) & UID; tanggal acara dibangun dari komponen lokal → sama di semua zona waktu
    const now = new Date(Date.UTC(2026, 9, 28, 1, 2, 3));
    const ics = reminderIcs(reminder({ note: 'Bawa hasil lab, puasa; 8 jam' }), 'HealthLink', now);
    expect(ics).toBe(
      [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Garuda Nexa//Template HealthLink//ID',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:20261105T090000-${now.getTime()}@pengingat.healthlink`,
        'DTSTAMP:20261028T010203Z',
        'DTSTART:20261105T090000',
        'DTEND:20261105T093000',
        'SUMMARY:Kontrol ke dokter — HealthLink',
        // 82 karakter → dilipat: 60 karakter, CRLF + spasi, sisanya
        'DESCRIPTION:Catatan: Bawa hasil lab\\, puasa\\; 8 jam\\nDibuat \r\n dari situs HealthLink.',
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'DESCRIPTION:Kontrol ke dokter — HealthLink',
        'TRIGGER:-PT1H',
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR',
        '',
      ].join('\r\n'),
    );
    for (const line of ics.split('\r\n')) expect(line.length, line).toBeLessThanOrEqual(75);
    expect(ics).not.toMatch(/[^\r]\n/);
    // Pilihan pengingat → TRIGGER; pilihan tak dikenal → 1 jam; tanpa catatan & merek → tanpa DESCRIPTION acara
    expect(reminderIcs(reminder({ alarm: '30m' }), 'HealthLink', now)).toContain('\r\nTRIGGER:-PT30M\r\n');
    expect(reminderIcs(reminder({ alarm: '1d' }), 'HealthLink', now)).toContain('\r\nTRIGGER:-P1D\r\n');
    expect(reminderIcs(reminder({ alarm: 'zzz' }), 'HealthLink', now)).toContain('\r\nTRIGGER:-PT1H\r\n');
    const bare = reminderIcs(reminder({ time: '23:45' }), '', now);
    expect(bare).toContain('\r\nDTSTART:20261105T234500\r\nDTEND:20261106T001500\r\nSUMMARY:Kontrol ke dokter\r\nBEGIN:VALARM');
    // Karakter kontrol di catatan dibuang, catatan dipotong 80 karakter
    const messy = reminderIcs(reminder({ note: `a\u0007b\nc${'x'.repeat(200)}` }), 'HealthLink', now).replace(/\r\n /g, '');
    expect(messy).toContain(`DESCRIPTION:Catatan: a b c${'x'.repeat(75)}\\nDibuat dari situs HealthLink.`);
  });

  it('pengingat Google Calendar: tautan https persis, tanpa data dikirim ke website', () => {
    expect(googleCalendarHref(reminder({ note: 'Bawa hasil lab, puasa; 8 jam' }), 'HealthLink')).toBe(
      'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Kontrol+ke+dokter+%E2%80%94+HealthLink&dates=20261105T090000%2F20261105T093000&details=Catatan%3A+Bawa+hasil+lab%2C+puasa%3B+8+jam%0ADibuat+dari+situs+HealthLink.',
    );
    expect(googleCalendarHref(reminder({ type: 'Cek laboratorium', date: '2026-12-31', time: '23:50' }), '')).toBe(
      'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Cek+laboratorium&dates=20261231T235000%2F20270101T002000&details=',
    );
  });
});

describe('HealthLink: demo', () => {
  it('urutan section, satu H1 di kartu aplikasi, hero appcard: foto LCP (eager, srcset, ukuran, alt) tanpa reveal', () => {
    const container = demo();
    expect(sectionKeys(container)).toEqual([...ORDER, 'footer']);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const hero = section(container, 'hero');
    expect(hero.getAttribute('data-hero-layout')).toBe('appcard');
    const h1 = hero.querySelector('h1')!;
    expect(h1.textContent).toBe('Dokter online yang terhubung ke rumah sakit');
    expect(h1.querySelector('span')!.textContent).toBe('terhubung');
    // H1 duduk di kartu putih (kontras tidak bergantung pada foto)
    expect(h1.parentElement!.className).toContain('bg-white');
    expect(h1.parentElement!.className).toContain('rounded-[28px]');
    const img = hero.querySelector<HTMLImageElement>('img[fetchpriority="high"]')!;
    expect(img.getAttribute('src')).toBe('/assets/templates/photos/healthlink-hero-1920.webp');
    expect(img.getAttribute('srcset')).toContain(' 800w');
    expect(img.getAttribute('srcset')).toContain(' 1280w');
    expect(img.getAttribute('srcset')).toContain(' 1920w');
    expect(img.getAttribute('loading')).toBe('eager');
    expect(img.getAttribute('sizes')).toBeTruthy();
    expect(Number(img.getAttribute('width'))).toBe(1920);
    expect(Number(img.getAttribute('height'))).toBe(1080);
    expect(img.getAttribute('alt')!.split(' ').length).toBeGreaterThanOrEqual(5);
    // Foto hero TIDAK di dalam <Reveal>/ubin bergerak dan tanpa zoom/parallax (tidak pernah disembunyikan)
    expect(img.closest('.tpl-reveal, .hl-tile')).toBeNull();
    expect(img.className).not.toMatch(/tpl-photo|hl-/);
    // Foto latar selebar layar: HP 360px di atas kartu, layar lebar memenuhi hero
    expect(img.closest('div.absolute.inset-x-0')!.className).toContain('@5xl:bottom-0');
    const eager = Array.from(container.querySelectorAll('img')).filter((i) => i.getAttribute('loading') !== 'lazy');
    expect(eager.map((i) => i.getAttribute('src'))).toEqual(['/assets/templates/photos/healthlink-hero-1920.webp']);
    expect(container.querySelectorAll('img[fetchpriority="high"]')).toHaveLength(1);
  });

  it('kartu aplikasi: kolom cari, empat ubin besar dengan tujuan otomatis, catatan darurat 119, label kaca layar lebar', () => {
    const hero = section(demo(), 'hero');
    const form = within(hero).getByRole('search', { name: 'Cari dokter' });
    expect(within(form).getByLabelText('Cari dokter, spesialis, atau keluhan')).toHaveAttribute('placeholder', 'Cari dokter atau keluhan');
    expect(within(form).getByRole('button', { name: 'Cari' })).toHaveAttribute('type', 'submit');
    const tiles = within(hero).getByRole('list', { name: 'Layanan cepat' });
    const items = Array.from(tiles.querySelectorAll('li'));
    expect(items.map((li) => li.textContent)).toEqual(['Chat DokterUmum & spesialis', 'Video CallTatap muka online', 'Tebus ObatAntar ke rumah', 'Rekam MedisRiwayat kunjungan']);
    expect(items.map((li) => li.querySelector('a')!.getAttribute('href'))).toEqual([
      wa('Halo HealthLink, saya ingin chat dengan dokter.'),
      wa('Halo HealthLink, saya ingin menjadwalkan video call dengan dokter.'),
      '#prescription',
      '#records',
    ]);
    // Ubin pop berurutan (gerak khas 1): kelas hl-tile + jeda 120/190/260/330 ms
    expect(items.every((li) => li.classList.contains('hl-tile'))).toBe(true);
    expect(items.map((li) => li.style.getPropertyValue('--hl-at'))).toEqual(['120ms', '190ms', '260ms', '330ms']);
    // Ubin besar: target sentuh ≥ 116px di HP, kotak ikon 48px
    expect(items[0].querySelector('a')!.className).toContain('min-h-[116px]');
    const emergency = within(hero).getByRole('link', { name: 'Telepon 119' });
    expect(emergency).toHaveAttribute('href', 'tel:119');
    expect(emergency.className).toContain('h-11');
    expect(emergency.parentElement!.textContent).toContain('Darurat? Hubungi 119 atau datang ke IGD terdekat.');
    // Label kaca hanya layar lebar (HP: foto bersih)
    const chips = within(hero).getByRole('list', { name: 'Sorotan layanan' });
    expect(chips.className).toMatch(/(^|\s)hidden(\s|$)/);
    expect(chips.className).toContain('@5xl:flex');
    expect(Array.from(chips.querySelectorAll('li')).map((li) => li.textContent)).toEqual(['Dokter onlineSetiap hari 07.00–22.00', 'Resep digitalTebus di apotek mitra']);
    expect(chips.querySelector('a, button')).toBeNull();
  });

  it('cari di hero: mengisi kata kunci daftar dokter, mengosongkan saringan, menggulir ke Dokter online', () => {
    const container = demo();
    const doctors = section(container, 'doctors');
    fireEvent.click(within(doctors).getByRole('button', { name: 'Kandungan' }));
    expect(doctorNames(container)).toEqual(['dr. Ayu Pertiwi, Sp.OG']);
    const hero = section(container, 'hero');
    fireEvent.change(within(hero).getByLabelText('Cari dokter, spesialis, atau keluhan'), { target: { value: '  anak ' } });
    act(() => {
      fireEvent.submit(within(hero).getByRole('search'));
    });
    expect(scrolled).toEqual(['doctors']);
    expect((within(doctors).getByLabelText('Cari dokter, spesialis, atau keluhan') as HTMLInputElement).value).toBe('anak');
    expect(within(doctors).getByRole('button', { name: 'Semua' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(doctors).getByRole('button', { name: 'Kandungan' })).toHaveAttribute('aria-pressed', 'false');
    expect(doctors.querySelector('[data-hl-count]')!.textContent).toBe('1 dokter cocok');
    expect(doctorNames(container)).toEqual(['dr. Bima Prasetyo, Sp.A']);
  });

  it('dokter online: saringan spesialis aria-pressed, jumlah diumumkan, inisial tanpa foto, Chat → WhatsApp dengan nama dokter, keadaan kosong', () => {
    const container = demo();
    const doctors = section(container, 'doctors');
    expect(doctors.querySelector('img')).toBeNull();
    expect(doctorNames(container)).toEqual(DOCTORS);
    expect(Array.from(doctors.querySelectorAll('article span[aria-hidden]')).map((s) => s.textContent).filter((t) => /^[A-Z]{2}$/.test(t ?? ''))).toEqual([
      'SA',
      'BP',
      'LW',
      'HN',
      'AP',
      'GS',
    ]);
    const count = doctors.querySelector('[data-hl-count]')!;
    expect(count).toHaveAttribute('aria-live', 'polite');
    expect(count.textContent).toBe('6 dokter');
    const group = within(doctors).getByRole('group', { name: 'Saring menurut spesialis' });
    const chips = within(group).getAllByRole('button');
    expect(chips.map((b) => b.textContent)).toEqual(['Semua', 'Dokter umum', 'Spesialis anak', 'Spesialis kulit', 'Penyakit dalam', 'Kandungan', 'Kesehatan jiwa']);
    expect(chips.map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false', 'false', 'false', 'false', 'false']);
    for (const chip of chips) expect(chip.className).toContain('h-11');
    fireEvent.click(within(group).getByRole('button', { name: 'Spesialis kulit' }));
    expect(within(group).getByRole('button', { name: 'Spesialis kulit' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(group).getByRole('button', { name: 'Semua' })).toHaveAttribute('aria-pressed', 'false');
    expect(count.textContent).toBe('1 dokter cocok');
    expect(doctorNames(container)).toEqual(['dr. Larasati Wening, Sp.DVE']);
    const chat = within(doctors).getByRole('link', { name: 'Chat: dr. Larasati Wening, Sp.DVE' });
    expect(chat).toHaveAttribute('href', wa('Halo HealthLink, saya ingin konsultasi dengan dr. Larasati Wening, Sp.DVE (Spesialis kulit).'));
    expect(chat.textContent).toBe('Chat');
    fireEvent.click(within(group).getByRole('button', { name: 'Semua' }));
    expect(count.textContent).toBe('6 dokter');
    // Status: titik hijau untuk Online, abu untuk jadwal; teks status tetap tertulis
    expect(Array.from(doctors.querySelectorAll('.hl-dot')).map((d) => d.getAttribute('data-online'))).toEqual(['true', 'true', 'false', 'true', 'false', 'false']);
    // Kata kunci tidak cocok → kartu kosong + "Tampilkan semua"
    const input = within(doctors).getByLabelText('Cari dokter, spesialis, atau keluhan');
    fireEvent.change(input, { target: { value: 'tulang' } });
    expect(count.textContent).toBe('0 dokter cocok');
    expect(doctors.textContent).toContain('Belum ada dokter yang cocok. Coba kata lain atau tampilkan semua dokter.');
    fireEvent.click(within(doctors).getByRole('button', { name: 'Hapus kata kunci' }));
    expect((input as HTMLInputElement).value).toBe('');
    fireEvent.change(input, { target: { value: 'tulang' } });
    fireEvent.click(within(doctors).getByRole('button', { name: 'Tampilkan semua' }));
    expect(doctorNames(container)).toHaveLength(6);
    expect(doctors.textContent).toContain('Jadwal dan status dokter adalah contoh');
  });

  it('header melayang: menu kapsul + "Konsultasi"; menu HP buka/tutup, Esc menutup dan fokus kembali', () => {
    const container = demo();
    const header = container.querySelector('header')!;
    expect(header.className).toContain('sticky');
    // Di atas hero: tinggi 0, bilah putih membulat melayang di atas foto
    expect(header.className).toMatch(/(^|\s)h-0(\s|$)/);
    expect(header.innerHTML).toContain('rounded-[20px] bg-white');
    expect(header.querySelector('svg[viewBox="0 0 32 32"]'), 'HealthLinkMark').not.toBeNull();
    const nav = within(header).getByRole('navigation', { name: 'Menu utama' });
    expect(Array.from(nav.querySelectorAll('a')).map((a) => `${a.getAttribute('href')} ${a.textContent}`)).toEqual([
      '#layanan Layanan',
      '#doctors Dokter online',
      '#prescription Resep',
      '#hospitals RS mitra',
      '#pricing Biaya',
      '#faq Tanya jawab',
    ]);
    fireEvent.click(within(nav).getByRole('link', { name: 'Resep' }));
    expect(scrolled).toEqual(['prescription']);
    const cta = within(header).getByRole('link', { name: 'Konsultasi' });
    expect(cta).toHaveAttribute('href', wa('Halo HealthLink, saya ingin chat dengan dokter.'));
    const toggle = within(header).getByRole('button', { name: 'Buka menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle.className).toContain('h-11 w-11');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAccessibleName('Tutup menu');
    expect(within(header).getAllByRole('navigation', { name: 'Menu utama' })).toHaveLength(2);
    const panel = document.getElementById(toggle.getAttribute('aria-controls')!)!;
    expect(panel).toHaveAttribute('aria-label', 'Menu utama');
    expect(within(panel).getAllByRole('link').map((a) => a.textContent)).toEqual(['Layanan', 'Dokter online', 'Resep', 'RS mitra', 'Biaya', 'Tanya jawab', 'Konsultasi']);
    for (const link of within(panel).getAllByRole('link').slice(0, 6)) expect(link.className).toContain('min-h-14');
    fireEvent.click(within(panel).getByRole('link', { name: 'Biaya' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(scrolled).toEqual(['prescription', 'pricing']);
    fireEvent.click(toggle);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
    // Tanpa hero: bilah biasa (tidak menimpa section pertama)
    cleanup();
    const noHero = demo({ hero: { enabled: false } }).querySelector('header')!;
    expect(noHero.className).not.toMatch(/(^|\s)h-0(\s|$)/);
    expect(noHero.className).toContain('pb-3');
  });

  it('pengingat kontrol: galat + fokus, ringkasan, Google Calendar persis, Unduh .ics dari Blob; tidak ada yang disimpan', async () => {
    const container = demo();
    const reminders = section(container, 'reminders');
    const form = within(reminders).getByRole('form', { name: 'Buat pengingat kontrol' });
    expect(form.getAttribute('action')).toBeNull();
    expect(reminders.textContent).toContain('Pengingat dibuat di perangkat Anda; tidak ada data yang dikirim atau disimpan di website.');
    const type = within(form).getByLabelText('Jenis pengingat') as HTMLSelectElement;
    expect(Array.from(type.options).map((o) => o.value)).toEqual(['Kontrol ke dokter', 'Tebus obat lanjutan', 'Cek laboratorium', 'Video call lanjutan']);
    const date = within(form).getByLabelText('Tanggal');
    expect(date).toHaveAttribute('type', 'date');
    expect(date.getAttribute('min')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(within(form).getByLabelText('Jam')).toHaveValue('09:00');
    expect(within(form).getByLabelText('Ingatkan')).toHaveValue('1h');
    act(() => {
      fireEvent.submit(form);
    });
    expect(date).toHaveAttribute('aria-invalid', 'true');
    expect(date).toHaveAttribute('aria-describedby', `${date.id}-error`);
    expect(date).toHaveFocus();
    expect(form.textContent).toContain('Pilih tanggal.');
    expect(reminders.querySelector('[data-hl-reminder]')).toBeNull();
    fireEvent.change(date, { target: { value: '2099-12-31' } });
    expect(date).not.toHaveAttribute('aria-invalid');
    fireEvent.change(type, { target: { value: 'Cek laboratorium' } });
    fireEvent.change(within(form).getByLabelText('Ingatkan'), { target: { value: '1d' } });
    fireEvent.change(within(form).getByLabelText('Catatan (opsional)'), { target: { value: 'Puasa 10 jam' } });
    act(() => {
      fireEvent.submit(form);
    });
    const result = reminders.querySelector<HTMLElement>('[data-hl-reminder]')!;
    expect(result.closest('[role="status"]')).not.toBeNull();
    expect(result.textContent).toContain('Pengingat siap ditambahkan');
    expect(result.textContent).toContain('Cek laboratorium — HealthLink');
    expect(result.textContent).toContain('Kamis, 31 Desember 2099 · 09.00 · 1 hari sebelumnya');
    const google = within(result).getByRole('link', { name: 'Google Calendar' });
    expect(google).toHaveAttribute(
      'href',
      'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Cek+laboratorium+%E2%80%94+HealthLink&dates=20991231T090000%2F20991231T093000&details=Catatan%3A+Puasa+10+jam%0ADibuat+dari+situs+HealthLink.',
    );
    expect(google).toHaveAttribute('target', '_blank');
    // Unduh .ics: Blob di peramban, tautan sementara dengan nama file, tanpa permintaan jaringan
    const blobs: Blob[] = [];
    const downloads: string[] = [];
    // jsdom tidak punya createObjectURL/revokeObjectURL; revoke dipanggil 1,5 dtk kemudian, jadi tiruannya dibiarkan
    const original = URL.createObjectURL;
    URL.createObjectURL = vi.fn((blob: Blob) => {
      blobs.push(blob);
      return 'blob:healthlink-test';
    });
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push(`${this.getAttribute('href')} ${this.download}`);
    });
    try {
      const button = within(result).getByRole('button', { name: 'Unduh .ics' });
      expect(button).toHaveAttribute('type', 'button');
      fireEvent.click(button);
      expect(downloads).toEqual(['blob:healthlink-test pengingat-2099-12-31.ics']);
      expect(blobs).toHaveLength(1);
      expect(blobs[0].type).toBe('text/calendar;charset=utf-8');
      const ics = await readBlob(blobs[0]);
      expect(ics).toMatch(/^BEGIN:VCALENDAR\r\n/);
      expect(ics).toContain('\r\nDTSTART:20991231T090000\r\nDTEND:20991231T093000\r\nSUMMARY:Cek laboratorium — HealthLink\r\n');
      expect(ics).toContain('\r\nDESCRIPTION:Catatan: Puasa 10 jam\\nDibuat dari situs HealthLink.\r\n');
      expect(ics).toContain('\r\nTRIGGER:-P1D\r\n');
      expect(ics).toMatch(/\r\nUID:20991231T090000-\d+@pengingat\.healthlink\r\nDTSTAMP:\d{8}T\d{6}Z\r\n/);
      // Tautan sementara dibuang dari DOM
      expect(document.querySelector('a[href^="blob:"]')).toBeNull();
    } finally {
      click.mockRestore();
      URL.createObjectURL = original;
    }
    // Mengubah isian menutup ringkasan lama
    fireEvent.change(within(form).getByLabelText('Jam'), { target: { value: '10:00' } });
    expect(reminders.querySelector('[data-hl-reminder]')).toBeNull();
  });

  it('bilah aksi bawah HP: tersembunyi (inert) selama hero terlihat, muncul setelah hero lewat, menjauh dari tombol melayang Shell', () => {
    const observers: { callback: IntersectionObserverCallback; targets: Element[] }[] = [];
    const Original = window.IntersectionObserver;
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
    }
    Object.defineProperty(window, 'IntersectionObserver', { writable: true, value: Recorder });
    try {
      const container = demo();
      const dock = container.querySelector<HTMLElement>('[data-hl-dock]')!;
      expect(dock.getAttribute('data-visible')).toBe('false');
      expect(dock).toHaveAttribute('aria-hidden', 'true');
      expect(dock.hasAttribute('inert')).toBe(true);
      // HP saja; kanan dikosongkan 76px (WhatsApp 16+48px, "Kembali ke atas" di atasnya)
      expect(dock.parentElement!.className).toContain('@3xl:hidden');
      expect(dock.parentElement!.className).toContain('sticky bottom-0');
      expect(dock.className).toContain('right-[76px]');
      expect(dock.className).toContain('left-3');
      expect(dock.className).toContain('hl-dock');
      const links = Array.from(dock.querySelectorAll('a'));
      expect(links.map((a) => `${a.textContent} ${a.getAttribute('href')}`)).toEqual([
        `Chat Dokter ${wa('Halo HealthLink, saya ingin chat dengan dokter.')}`,
        `Video Call ${wa('Halo HealthLink, saya ingin menjadwalkan video call dengan dokter.')}`,
      ]);
      for (const a of links) expect(a.className).toContain('h-12');
      const hero = section(container, 'hero');
      const watcher = observers.find((o) => o.targets.includes(hero))!;
      expect(watcher).toBeDefined();
      act(() => {
        watcher.callback(
          [{ target: hero, isIntersecting: false, boundingClientRect: { bottom: -40 }, rootBounds: { height: 800 } } as unknown as IntersectionObserverEntry],
          watcher as unknown as IntersectionObserver,
        );
      });
      expect(dock.getAttribute('data-visible')).toBe('true');
      expect(dock).not.toHaveAttribute('aria-hidden');
      expect(dock.hasAttribute('inert')).toBe(false);
      expect(within(dock).getByRole('link', { name: 'Chat Dokter' })).toBeInTheDocument();
      // Footer memberi ruang bawah agar bilah tidak menutupi teks terakhir
      expect(container.querySelector('footer')!.className).toContain('pb-28 @3xl:pb-10');
    } finally {
      Object.defineProperty(window, 'IntersectionObserver', { writable: true, value: Original });
    }
    // Aplikasi pembeli: bilah membuka URL aplikasi
    cleanup();
    const app = demo({ hero: { chat_url: 'https://app.contoh.test/chat', video_url: 'https://app.contoh.test/video' } });
    expect(Array.from(app.querySelectorAll('[data-hl-dock] a')).map((a) => a.getAttribute('href'))).toEqual(['https://app.contoh.test/chat', 'https://app.contoh.test/video']);
    expect(within(section(app, 'doctors')).getAllByRole('link', { name: /^Chat: / }).map((a) => a.getAttribute('href'))).toEqual(
      Array(6).fill('https://app.contoh.test/chat'),
    );
    expect(within(section(app, 'hero')).getByRole('list', { name: 'Layanan cepat' }).querySelector('a')).toHaveAttribute('href', 'https://app.contoh.test/chat');
  });

  it('cara konsultasi: langkah bernomor, kartu percakapan dengan inisial (bukan foto), tiga gelembung berurutan', () => {
    const container = demo();
    const steps = section(container, 'steps');
    expect(Array.from(steps.querySelectorAll('ol > li')).map((li) => li.textContent)).toEqual([
      '01Pilih dokterCari berdasarkan spesialis atau keluhan Anda.',
      '02Chat atau video callCeritakan keluhan, dokter menanggapi langsung.',
      '03Terima resep & saranTebus obat atau buat jadwal kontrol berikutnya.',
    ]);
    const chat = steps.querySelector<HTMLElement>('.hl-chat')!;
    expect(chat.querySelector('img')).toBeNull();
    expect(chat.textContent).toContain('SA');
    expect(chat.textContent).toContain('dr. Sekar Ayuningtyas');
    const bubbles = Array.from(chat.querySelectorAll('.hl-bubble'));
    expect(bubbles.map((b) => b.textContent)).toEqual([
      'Pasien: Dok, saya batuk dan pilek sudah 3 hari.',
      'Dokter: Baik. Apakah ada demam atau sesak napas?',
      'Pasien: Tidak ada, Dok. Hanya agak pusing.',
    ]);
    // Urutan muncul sekali (≤ 3 dtk total, gelembung 360 ms): 200 / 1350 / 2350 ms; titik mengetik hanya di antara
    const rows = Array.from(chat.querySelectorAll<HTMLElement>('li'));
    expect(rows.map((li) => li.style.getPropertyValue('--hl-at'))).toEqual(['200ms', '1350ms', '2350ms']);
    expect(Math.max(...rows.map((li) => Number.parseInt(li.style.getPropertyValue('--hl-at'), 10))) + 360).toBeLessThanOrEqual(3000);
    expect(chat.querySelectorAll('.hl-typing')).toHaveLength(2);
    for (const dots of chat.querySelectorAll('.hl-typing')) expect(dots).toHaveAttribute('aria-hidden', 'true');
    expect(within(chat).getByRole('list', { name: 'Ilustrasi percakapan' })).toBeInTheDocument();
  });

  it('resep, rekam medis (ilustrasi, tanpa penyimpanan), RS mitra fiktif, biaya contoh, unduh tanpa lencana resmi', () => {
    const container = demo();
    const prescription = section(container, 'prescription');
    expect(prescription.querySelectorAll('img')).toHaveLength(2);
    expect(prescription.querySelector('.hl-flow-fill')).not.toBeNull();
    expect(Array.from(prescription.querySelectorAll('ol h3')).map((h) => h.textContent)).toEqual(['Resep terbit', 'Pilih apotek mitra', 'Diantar kurir']);
    expect(within(prescription).getByRole('list', { name: 'Pilihan pengiriman' }).textContent).toBe('Antar 1–3 jam dalam kotaAmbil di apotekOngkir mulai Rp10.000');
    expect(within(prescription).getByRole('link', { name: 'Tebus Resep' })).toHaveAttribute('href', wa('Halo HealthLink, saya ingin menebus resep digital.'));
    expect(prescription.textContent).toContain('Obat keras hanya diberikan dengan resep dokter.');

    const records = section(container, 'records');
    expect(records.textContent).toContain('Ilustrasi');
    expect(records.textContent).toContain('Ilustrasi tampilan aplikasi. Rekam medis tidak disimpan di website ini.');
    expect(records.querySelector('input, textarea, form')).toBeNull();
    // Baris kunjungan terbungkus, tidak dipotong "…"
    expect(records.innerHTML).not.toMatch(/truncate[^"]*">(Video call|dr\. )/);
    expect(records.textContent).toContain('Video call spesialis anak');

    const hospitals = section(container, 'hospitals');
    expect(Array.from(hospitals.querySelectorAll('h3')).map((h) => h.textContent)).toEqual([
      'RS Sekar Arum Medika',
      'RS Bumi Jagad Husada',
      'Klinik Utama Wiyata Sehat',
      'RS Tirta Kencana Asih',
    ]);
    expect(hospitals.querySelectorAll('dl dt')).toHaveLength(3);
    expect(hospitals.textContent).toContain('Nama rumah sakit di demo adalah contoh (fiktif).');

    const pricing = section(container, 'pricing');
    const plans = Array.from(pricing.querySelectorAll('article'));
    expect(plans.map((p) => p.querySelector('h3')!.textContent)).toEqual(['Chat Dokter', 'Video Call Spesialis', 'Langganan Keluarga']);
    expect(plans.map((p) => p.className.includes('ring-2'))).toEqual([false, false, true]);
    expect(plans[2].querySelector('img')).not.toBeNull();
    expect(within(plans[2]).getByRole('link', { name: 'Pilih paket' })).toHaveAttribute('href', wa('Halo HealthLink, saya tertarik dengan paket Langganan Keluarga.'));
    expect(pricing.textContent).toContain('Harga contoh. Pembayaran tidak diproses di website ini');

    const download = section(container, 'download');
    const inverse = Array.from(container.querySelectorAll('[data-tpl-tone="inverse"]'));
    expect(inverse).toHaveLength(1);
    expect(download.contains(inverse[0])).toBe(true);
    expect(within(download).getAllByRole('link').map((a) => `${a.textContent} ${a.getAttribute('href')}`)).toEqual([
      'Unduh diGoogle Play https://example.com/healthlink/android',
      'Unduh diApp Store https://example.com/healthlink/ios',
    ]);
    // Tanpa gambar lencana toko resmi: satu-satunya gambar adalah foto
    expect(Array.from(download.querySelectorAll('img')).map((i) => i.getAttribute('src'))).toEqual(['/assets/templates/photos/healthlink-unduh-960.webp']);
  });

  it('akordeon tanya jawab: aria-expanded/aria-controls, panel role=region tertutup inert, satu terbuka, tautan WhatsApp', () => {
    const faq = section(demo(), 'faq');
    const buttons = within(faq).getAllByRole('button');
    expect(buttons).toHaveLength(5);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'true');
    expect(buttons[0].closest('h3')).not.toBeNull();
    const region = document.getElementById(buttons[0].getAttribute('aria-controls')!)!;
    expect(region).toHaveAttribute('role', 'region');
    expect(region).toHaveAttribute('data-open', 'true');
    expect(region.hasAttribute('inert')).toBe(false);
    const closed = document.getElementById(buttons[1].getAttribute('aria-controls')!)!;
    expect(closed.hasAttribute('inert')).toBe(true);
    expect(closed.className).toContain('hl-collapse');
    fireEvent.click(buttons[1]);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'false');
    expect(buttons[1]).toHaveAttribute('aria-expanded', 'true');
    expect(closed.textContent).toContain('Hubungi 119 atau segera datang ke IGD rumah sakit terdekat.');
    fireEvent.click(buttons[1]);
    expect(buttons.every((b) => b.getAttribute('aria-expanded') === 'false')).toBe(true);
    expect(within(faq).getByRole('link', { name: /Tanya lewat WhatsApp/ })).toHaveAttribute('href', wa('Halo HealthLink, saya ingin konsultasi dengan dokter.'));
  });

  it('bantuan: ubin kontak, alamat + Google Maps, kartu darurat tel:119; footer kartu dengan menu & media sosial', () => {
    const container = demo();
    const contact = section(container, 'contact');
    const tiles = Array.from(contact.querySelectorAll('ul > li')).map((li) => li.textContent);
    expect(tiles).toEqual(['WhatsApp0812-3456-7890', 'Telepon0812-3456-7890', 'Emailbantuan@healthlink.test', 'Jam layananSetiap hari 07.00–22.00 WIB']);
    const links = Array.from(contact.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(links).toEqual([
      wa('Halo HealthLink, saya ingin konsultasi dengan dokter.'),
      'tel:+6281234567890',
      'mailto:bantuan@healthlink.test',
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Umbulharjo, Kota Yogyakarta')}`,
      'tel:119',
    ]);
    const emergency = within(contact).getByRole('link', { name: 'Telepon 119' });
    expect(emergency.className).toContain('h-12');
    expect(emergency.closest('div')!.parentElement!.textContent).toContain('Telekonsultasi bukan untuk keadaan darurat.');
    // Nama tautan unik: "Chat WhatsApp" hanya tombol melayang Shell
    expect(within(container).getAllByRole('link', { name: 'Chat WhatsApp' })).toHaveLength(1);
    const footer = container.querySelector('footer')!;
    expect(footer.getAttribute('data-tpl-section')).toBe('footer');
    expect(footer.textContent).toContain(`© ${new Date().getFullYear()} HealthLink`);
    expect(footer.textContent).toContain('Informasi di situs ini bukan pengganti pemeriksaan langsung oleh dokter.');
    expect(Array.from(within(footer).getByRole('navigation', { name: 'Tautan footer' }).querySelectorAll('a')).map((a) => a.getAttribute('href'))).toEqual([
      '#layanan',
      '#doctors',
      '#prescription',
      '#hospitals',
      '#pricing',
      '#faq',
    ]);
    for (const link of footer.querySelectorAll('nav a')) expect(link.className).toContain('min-h-11');
    expect(within(footer).getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://instagram.com/healthlink.contoh');
    expect(within(footer).getByRole('link', { name: 'YouTube' })).toHaveAttribute('href', 'https://youtube.com/@healthlink.contoh');
    expect(within(footer).getByRole('link', { name: 'TikTok' })).toHaveAttribute('href', 'https://tiktok.com/@healthlink.contoh');
    expect(within(footer).queryByRole('link', { name: 'Facebook' })).toBeNull();
    for (const link of within(footer).getByRole('list', { name: 'Media sosial' }).querySelectorAll('a')) expect(link.className).toContain('h-11 w-11');
  });

  it('datar: tidak ada kelas shadow di template (kecuali tombol melayang Shell); kode tanpa penyimpanan/pengiriman data', () => {
    const container = demo();
    const shadows = Array.from(container.querySelectorAll('[class*="shadow"]')).filter(
      (el) => !el.closest('[aria-label="Chat WhatsApp"]') && !/Chat WhatsApp|Kembali ke atas/.test(el.getAttribute('aria-label') ?? ''),
    );
    expect(shadows.map((el) => el.className)).toEqual([]);
    const dir = resolve(ROOT, 'src/templates/healthlink');
    const files = readdirSync(dir).filter((f) => /\.(tsx?|css)$/.test(f));
    expect(files).toEqual(
      expect.arrayContaining(['HealthLink.tsx', 'Header.tsx', 'Hero.tsx', 'Services.tsx', 'Doctors.tsx', 'Care.tsx', 'Reminders.tsx', 'Network.tsx', 'Closing.tsx', 'Footer.tsx', 'Dock.tsx', 'healthlink.css']),
    );
    const source = files.map((f) => readFileSync(resolve(dir, f), 'utf8')).join('\n');
    expect(source).not.toMatch(/\bshadow-|box-shadow|text-shadow|drop-shadow/);
    // Kode (tanpa komentar): tanpa framer-motion/router, impor hanya shared/kit/types/folder sendiri, tidak mengirim
    // atau menyimpan apa pun (rekam medis, pengingat, data pasien)
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/framer-motion|useLocation|useParams|localStorage|sessionStorage|indexedDB|document\.cookie|fetch\(|XMLHttpRequest|sendBeacon|WebSocket/);
    for (const [, from] of code.matchAll(/from '(\.[^']+)'/g)) expect(from, from).toMatch(/^(\.\/|\.\.\/(shared|kit)\/|\.\.\/types$)/);
    // Komponen .tsx hanya mengekspor komponen (react-refresh); helper di .ts
    for (const f of files.filter((name) => name.endsWith('.tsx'))) {
      const exports = readFileSync(resolve(dir, f), 'utf8').match(/^export (const|function|default function) (\w+)/gm) ?? [];
      for (const line of exports) expect(line.split(' ').pop(), `${f}: ${line}`).toMatch(/^[A-Z]/);
    }
  });
});

describe('HealthLink: gerak', () => {
  it('pratinjau CMS diam (gerak sekali-jalan statis) dan tanpa tautan wa.me terbuka', () => {
    const { container } = render(<def.Component content={resolveContent(def, null)} preview />);
    expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'off');
    const plays = Array.from(container.querySelectorAll('[data-play]')).map((el) => el.getAttribute('data-play'));
    expect(plays).toHaveLength(3);
    expect(new Set(plays)).toEqual(new Set(['static']));
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    expect(container.querySelector('a[href^="javascript:"], a[href^="vbscript:"]')).toBeNull();
    // Demo/situs live: gerak menyala
    cleanup();
    const live = demo();
    expect(live.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'on');
    expect(Array.from(live.querySelectorAll('[data-play]')).map((el) => el.className.split(' ')[0])).toEqual(['hl-chat', 'hl-doctors', 'hl-flow']);
  });

  it('healthlink.css: animasi bergerbang [data-tpl-motion=\'on\'], blok prefers-reduced-motion & cetak, kelas hl-, semua berhenti sendiri', () => {
    const css = readFileSync(resolve(ROOT, 'src/templates/healthlink/healthlink.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).toContain('@layer components');
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(css).toMatch(/@media print/);
    for (const name of ['hl-pop', 'hl-bubble', 'hl-typing', 'hl-pulse', 'hl-fill']) expect(css, name).toMatch(new RegExp(`@keyframes ${name}\\b`));
    for (const rule of css.match(/^\s*[^@\s{}][^{}]*\{[^}]*\b(transition|animation):[^}]*\}/gm) ?? []) {
      const selector = rule.split('{')[0];
      if (/transition:\s*none|animation:\s*none/.test(rule)) continue;
      expect(selector, rule).toContain("[data-tpl-motion='on']");
    }
    for (const cls of css.match(/\.[a-z][\w-]*/g) ?? []) if (!/^\.(tpl-)/.test(cls)) expect(cls, cls).toMatch(/^\.hl-/);
    // Tidak ada yang berulang tanpa henti: titik status berdenyut 3×, titik mengetik 2×, sisanya sekali; ≤ 1,6 dtk
    expect(css).not.toMatch(/infinite/);
    expect(css).toMatch(/animation: hl-pulse 1\.2s ease-out 0\.3s 3;/);
    expect(css).toMatch(/animation: hl-blink 0\.6s ease-in-out 2;/);
    for (const [, seconds] of css.matchAll(/animation:\s*hl-[a-z]+\s+([\d.]+)s/g)) expect(Number(seconds)).toBeLessThanOrEqual(1.6);
    for (const [, seconds] of css.matchAll(/transition:[^;]*?([\d.]+)s/g)) expect(Number(seconds)).toBeLessThanOrEqual(1);
    // Ubin pop hanya skala 0.96 → 1 (tidak bergeser), foto hero tidak pernah dianimasikan
    expect(css).toMatch(/@keyframes hl-pop\s*\{\s*from\s*\{\s*opacity: 0;\s*transform: scale\(0\.96\);/);
    expect(css).not.toMatch(/hl-hero|\bimg\b/);
    // Preferensi gerak dikurangi: semua animasi dimatikan dan keadaan akhir terlihat
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'), css.indexOf('@media print'));
    for (const cls of ['.hl-tile', '.hl-bubble', '.hl-typing', '.hl-dot', '.hl-flow-fill', '.hl-swap', '.hl-dock', '.hl-collapse']) expect(reduced, cls).toContain(cls);
    expect(reduced).toMatch(/\.hl-chat \.hl-bubble\s*\{\s*opacity: 1;/);
  });
});

describe('HealthLink: warna tema bisa diganti', () => {
  it('cyan bawaan → --tpl-accent; warna CMS mengalir ke tombol, tint, pita gelap, dan teks terang', () => {
    const base = demo();
    expect(rootStyle(base, '--tpl-accent')).toBe('#0891b2');
    expect(rootStyle(base, '--hl-solid')).toBe('#087895');
    expect(rootStyle(base, '--hl-solid-hover')).toBe('#086882');
    expect(rootStyle(base, '--hl-tint')).toBe('#e1f2f6');
    expect(rootStyle(base, '--hl-tint-ink')).toBe('#086e89');
    expect(rootStyle(base, '--hl-deep')).toBe('#073443');
    expect(rootStyle(base, '--hl-bright')).toBe('#39a7c1');
    cleanup();
    const red = demo({ brand: { accent_color: '#A61E3A' } });
    expect(rootStyle(red, '--tpl-accent')).toBe('#a61e3a');
    for (const name of ['--hl-solid', '--hl-solid-hover', '--hl-tint', '--hl-tint-ink', '--hl-deep', '--hl-bright']) {
      expect(rootStyle(red, name), name).toBe((healthlinkVars('#A61E3A') as Record<string, string>)[name]);
    }
    cleanup();
    expect(rootStyle(demo({ brand: { accent_color: '#FACC15' } }), '--tpl-on-accent')).toBe('#121620');
  });
});

describe('HealthLink: SEO situs pembeli, judul, gambar, tautan', () => {
  it('judul tab & meta description dari nama, tagline, dan deskripsi hero; theme-color = aksen', () => {
    expect(siteTitle('healthlink', null)).toBe('HealthLink — Konsultasi Dokter Online Yogyakarta');
    expect(siteTitle('healthlink', null).length).toBeLessThanOrEqual(60);
    const restore = applySiteHead('healthlink', null);
    const description = document.head.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
    expect(description).toMatch(/^Chat atau video call dengan dokter umum dan spesialis/);
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(200);
    expect(document.head.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#0891B2');
    restore();
  });

  it('satu H1, tiap section diawali tepat satu H2, H3 hanya di bawah H2, tanpa h4–h6; judul kosong → H2 sr-only', () => {
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
    expect(section(untitled, 'services').querySelector('h2')!.textContent).toBe('Layanan');
    cleanup();
    const bare = demo(Object.fromEntries(rest.map((k) => [k, { title: '', eyebrow: '', subtitle: '' }])));
    expect(rest.map((k) => section(bare, k).querySelector('h2')?.textContent)).toEqual([
      'Layanan',
      'Cara konsultasi',
      'Dokter online',
      'Resep & obat',
      'Rekam medis',
      'Pengingat kontrol',
      'RS mitra',
      'Biaya',
      'Unduh aplikasi',
      'Tanya jawab',
      'Bantuan',
    ]);
  });

  it('gambar: alt deskriptif ≥ 5 kata, width/height, srcset 800w & sizes; dokter tanpa foto', () => {
    const container = demo();
    const imgs = Array.from(container.querySelectorAll('img'));
    expect(imgs.length).toBe(12);
    for (const img of imgs) {
      const src = img.getAttribute('src') ?? '';
      expect(src, src).toMatch(/^\/assets\/templates\/photos\/healthlink-[a-z0-9-]+\.webp$/);
      expect(Number(img.getAttribute('width')), src).toBeGreaterThan(0);
      expect(Number(img.getAttribute('height')), src).toBeGreaterThan(0);
      expect(img.getAttribute('srcset'), src).toMatch(/ 800w, /);
      expect(img.getAttribute('sizes'), src).toBeTruthy();
      expect(img.getAttribute('alt')!.split(' ').length, src).toBeGreaterThanOrEqual(5);
    }
  });

  it('tautan asli untuk navigasi, tombol hanya untuk aksi (kirim hanya cari & buat pengingat); SVG dekoratif tersembunyi', () => {
    const container = demo();
    for (const a of container.querySelectorAll('a')) expect(a.getAttribute('href'), a.textContent ?? '').toMatch(/^(#[a-z]|https:\/\/|mailto:|tel:)/);
    for (const button of container.querySelectorAll('button')) {
      expect(button.getAttribute('type'), button.textContent ?? '').toBe(button.closest('form') ? 'submit' : 'button');
    }
    // Dua tombol kirim yang sah tidak menyebut WhatsApp: keduanya bekerja di perangkat (menyaring daftar / membuat kalender)
    expect(Array.from(container.querySelectorAll('button[type="submit"]')).map((b) => b.textContent)).toEqual(['Cari', 'Buat pengingat']);
    for (const svg of container.querySelectorAll('svg')) expect(svg.closest('[aria-hidden="true"], [aria-hidden=""]') ?? svg.getAttribute('aria-hidden'), svg.outerHTML.slice(0, 60)).toBeTruthy();
  });
});

describe('HealthLink: konten opsional kosong', () => {
  it('hero tanpa foto/ubin/label/catatan darurat tetap utuh; dokter tersembunyi → tanpa kolom cari', () => {
    const bare = section(demo({ hero: { image: '', tiles: [], chips: [], emergency_note: '', eyebrow: '', subtitle: '' } }), 'hero');
    expect(bare.querySelector('img')).toBeNull();
    expect(within(bare).queryByRole('list', { name: 'Layanan cepat' })).toBeNull();
    expect(within(bare).queryByRole('list', { name: 'Sorotan layanan' })).toBeNull();
    expect(bare.querySelector('a[href^="tel:"]')).toBeNull();
    expect(bare.querySelector('h1')!.textContent).toBe('Dokter online yang terhubung ke rumah sakit');
    expect(bare.innerHTML).toContain('pt-24');
    expect(within(bare).getByRole('search')).toBeInTheDocument();
    cleanup();
    const noDoctors = demo({ doctors: { enabled: false } });
    expect(within(section(noDoctors, 'hero')).queryByRole('search')).toBeNull();
    expect(Array.from(noDoctors.querySelector('header nav')!.querySelectorAll('a')).map((a) => a.getAttribute('href'))).not.toContain('#doctors');
    cleanup();
    // Nomor darurat dikosongkan → catatan tetap, tanpa tombol telepon
    const noTel = demo({ contact: { emergency_phone: '' } });
    expect(section(noTel, 'hero').textContent).toContain('Darurat? Hubungi 119');
    expect(noTel.querySelector('a[href^="tel:1"]')).toBeNull();
  });

  it('bilah aksi bawah: label kosong atau hero mati → tidak dirender; footer tanpa ruang tambahan', () => {
    const noLabels = demo({ hero: { dock_chat_label: '', dock_video_label: '' } });
    expect(noLabels.querySelector('[data-hl-dock]')).toBeNull();
    expect(noLabels.querySelector('footer')!.className).toContain('pb-10');
    expect(noLabels.querySelector('footer')!.className).not.toContain('pb-28');
    cleanup();
    const one = demo({ hero: { dock_video_label: '' } });
    expect(Array.from(one.querySelectorAll('[data-hl-dock] a')).map((a) => a.textContent)).toEqual(['Chat Dokter']);
    cleanup();
    expect(demo({ hero: { enabled: false } }).querySelector('[data-hl-dock]')).toBeNull();
  });

  it('section tanpa foto & isi opsional menyesuaikan tata letak', () => {
    const container = demo({
      steps: { image: '' },
      prescription: { image: '', image_2: '' },
      records: { visits: [], screen_title: '' },
      reminders: { image: '', types: [] },
      download: { android_url: '', ios_url: '', image: '' },
      pricing: { plans: [{ name: 'Chat', price: 'Rp35.000', badge: '', image: '' }] },
      contact: { image: '' },
      footer: { instagram: '', youtube: '', tiktok: '' },
    });
    const steps = section(container, 'steps');
    expect(steps.querySelector('img')).toBeNull();
    expect(steps.querySelector('.hl-chat')).not.toBeNull();
    const prescription = section(container, 'prescription');
    expect(prescription.querySelector('img')).toBeNull();
    expect(prescription.innerHTML).toContain('@5xl:col-span-8');
    const records = section(container, 'records');
    expect(records.textContent).not.toContain('Ilustrasi');
    expect(records.innerHTML).toContain('@5xl:col-span-8');
    const reminders = section(container, 'reminders');
    expect(reminders.querySelector('img')).toBeNull();
    expect(Array.from((within(reminders).getByLabelText('Jenis pengingat') as HTMLSelectElement).options).map((o) => o.value)).toEqual([...DEFAULT_TYPES]);
    const download = section(container, 'download');
    expect(download.querySelector('img')).toBeNull();
    expect(within(download).getByRole('link', { name: 'Minta tautan lewat WhatsApp' })).toHaveAttribute('href', wa('Halo HealthLink, saya ingin tautan unduhan aplikasinya.'));
    expect(download.innerHTML).toContain('text-center');
    const pricing = section(container, 'pricing');
    expect(pricing.querySelectorAll('article')).toHaveLength(1);
    expect(pricing.querySelector('img, .ring-2')).toBeNull();
    expect(section(container, 'contact').querySelector('img')).toBeNull();
    expect(within(container.querySelector('footer')!).queryByRole('list', { name: 'Media sosial' })).toBeNull();
    cleanup();
    // Kartu percakapan kosong & tanpa foto → tidak ada kartu; section tetap karena ada langkah
    const noChat = section(
      demo({ steps: { image: '', chat_doctor_name: '', chat_patient: '', chat_doctor: '', chat_reply: '' } }),
      'steps',
    );
    expect(noChat.querySelector('.hl-chat')).toBeNull();
    expect(noChat.querySelectorAll('ol > li')).toHaveLength(3);
    cleanup();
    const hidden = demo({ hospitals: { items: [] }, faq: { enabled: false }, footer: { enabled: false } });
    expect(sectionKeys(hidden)).not.toContain('hospitals');
    expect(sectionKeys(hidden)).not.toContain('faq');
    expect(hidden.querySelector('footer')).toBeNull();
    expect(Array.from(hidden.querySelector('header nav')!.querySelectorAll('a')).map((a) => a.getAttribute('href'))).toEqual(['#layanan', '#doctors', '#prescription', '#pricing']);
  });
});

describe('HealthLink: editor CMS', () => {
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

describe('HealthLink: data katalog', () => {
  const FILE = 'database/migrations/2026-10-28_047_healthlink_template.sql';
  const sql = () => readFileSync(resolve(ROOT, FILE), 'utf8');

  it('migrasi 047: baris healthlink dengan kategori baru, harga, pratinjau & galeri tangkapan layar, salinan jujur', () => {
    const text = sql();
    expect(text).toContain("'healthlink'");
    expect(text).toContain("'Kesehatan & Rumah Sakit'");
    expect(text).toContain('1690000.00');
    expect(text).toContain("'/assets/templates/healthlink-preview.webp'");
    expect(text).toContain('\'["/assets/templates/healthlink-1.webp","/assets/templates/healthlink-2.webp"]\'');
    expect(text).toMatch(/Template ini halaman pemasaran layanan; konsultasi berjalan lewat WhatsApp atau aplikasi milik Anda, rekam medis tidak disimpan di website/);
    expect(text).toMatch(/tidak ada pembayaran online/);
    expect(text).not.toMatch(/termasuk domain|domain, hosting|terakreditasi|\bKARS\b|dokter terbaik|dijamin|garansi/i);
    // Fitur katalog: 6-8 butir, terakhir persis kalimat domain + SSL
    const features = JSON.parse(/features\s+= '(\[[^']*\])'/.exec(text)![1]) as string[];
    expect(features.length).toBeGreaterThanOrEqual(6);
    expect(features.length).toBeLessThanOrEqual(8);
    expect(features[features.length - 1]).toBe('Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)');
  });

  it('migrasi 047 aman diulang (INSERT IGNORE + UPDATE berdasarkan slug, tanpa DELETE) dan tercatat di schema_migrations', () => {
    const raw = sql();
    expect(raw).toMatch(/Domain\s+(--\s+)?tidak termasuk harga template/);
    expect(raw).toMatch(/FIKTIF/);
    expect(raw).toMatch(/kategori baru/i);
    expect(raw).toMatch(/SETELAH kode/);
    expect(raw).toMatch(/MENIMPA perubahan admin/);
    const text = raw.replace(/^--.*$/gm, '');
    expect(text).toMatch(/INSERT IGNORE INTO templates/);
    expect(text).toMatch(/WHERE slug = 'healthlink';/);
    expect(text).toMatch(/sort_order\s+= 30/);
    expect(text).toMatch(/status\s+= 'published'/);
    expect(text).toMatch(/template_code\s+= 'healthlink'/);
    expect(text).not.toMatch(/\bDELETE\b/);
    expect(text).toContain("VALUES ('2026-10-28_047', 'templates: katalog HealthLink')");
  });

  it('gambar pratinjau katalog ada di public/, 1600×1000, VP8/VP8X, dan ringan', () => {
    for (const name of ['healthlink-preview', 'healthlink-1', 'healthlink-2']) {
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

describe('HealthLink: konten aneh', () => {
  it('angka, null, dan string di tempat list tidak membuat crash; tautan berbahaya dibuang', () => {
    const weird = {
      hero: {
        image: 'javascript:alert(1)',
        highlight: 'tidak ada di judul',
        tiles: 'x',
        chips: [null, { label: 5 }],
        chat_url: 'javascript:alert(1)',
        video_url: 'vbscript:x',
        header_url: 'javascript:x',
      },
      services: { items: [null, { title: 2 }, { title: 'Chat dokter', link_url: 'javascript:alert(1)' }] },
      steps: { steps: 'x', image: 'javascript:alert(1)', chat_patient: 3 },
      doctors: { items: [{ name: 'dr. Contoh', specialty: null, keywords: 9 }, 'x', null] },
      prescription: { steps: [null, { title: 'Resep' }], options: 'x', button_url: 'javascript:alert(1)', image_2: 'javascript:x' },
      records: { points: 4, visits: [{ title: 'Kunjungan', date: 5 }], button_url: 'vbscript:x' },
      reminders: { types: [{ label: 7 }, null] },
      hospitals: { items: [{ name: 'RS Contoh', image: 'javascript:alert(1)' }], stats: 'x' },
      pricing: { plans: [{ name: 'Paket', features: 12, image: 'javascript:x', badge: 'Pilihan' }] },
      download: { android_url: 'javascript:alert(1)', ios_url: 'https://contoh.test/ios', ios_label: 'App Store' },
      faq: { items: [{ question: 'Tanya?', answer: null }], link_url: 'vbscript:x' },
      contact: { whatsapp: 'abc', emergency_phone: 'darurat', maps_url: 'javascript:alert(1)' },
      footer: { instagram: 'javascript:alert(1)' },
      brand: { accent_color: 'biru' },
    } as unknown as SiteContent;
    const { container } = render(<def.Component content={resolveContent(def, weird)} />);
    expect(container.querySelector('a[href^="javascript:"], a[href^="vbscript:"]')).toBeNull();
    expect(container.querySelector('img[src^="javascript:"]')).toBeNull();
    expect(container.querySelector('h1')!.textContent).toBe('Dokter online yang terhubung ke rumah sakit');
    // String di tempat list → list bawaan (resolveContent); list berisi sampah → item rusak dilewati
    expect(sectionKeys(container)).toEqual([...ORDER, 'footer']);
    expect(section(container, 'doctors').textContent).toContain('dr. Contoh');
    expect(section(container, 'hospitals').querySelector('img')).toBeNull();
    expect(section(container, 'download').querySelector('a')).toHaveAttribute('href', 'https://contoh.test/ios');
    expect(container.querySelector('a[href="tel:darurat"]')).toBeNull();
    expect(rootStyle(container, '--hl-solid')).toBe('#087895');
    cleanup();
    for (const content of [{}, null]) {
      const { container: empty } = render(<def.Component content={content as unknown as SiteContent} />);
      expect(empty.querySelector('[data-tpl-root]')).not.toBeNull();
      cleanup();
    }
  });

  it('semua section mati → tidak ada [data-tpl-section], tanpa footer, tanpa bilah aksi', () => {
    const off = Object.fromEntries(def.sections.filter((s) => s.toggleable).map((s) => [s.key, { enabled: false }]));
    const container = demo(off);
    expect(container.querySelectorAll('[data-tpl-section]')).toHaveLength(0);
    expect(container.querySelector('footer')).toBeNull();
    expect(container.querySelector('[data-hl-dock]')).toBeNull();
  });
});
