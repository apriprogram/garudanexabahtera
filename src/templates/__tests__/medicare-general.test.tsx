// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/medicare-general.test.tsx
// MediCare General (website rumah sakit umum, 2026-10-28): skema CMS & konten demo, foto (registry, berkas, bobot),
// salinan jujur bidang kesehatan (tanpa klaim akreditasi/janji, 119 hanya sebagai nomor darurat nasional, dokter tanpa
// foto, formulir hanya menyusun pesan WhatsApp), helper model (warna footer, ukuran teks, menu, tujuan tautan, hari
// praktik, saringan dokter, formulir 3 langkah → pesan WhatsApp), demo (urutan section, hero triage, header + strip IGD +
// menu HP, kontrol ukuran teks, saringan jadwal dokter → formulir, tab, akordeon, tautan tel:), datar tanpa bayangan,
// gerak (pratinjau CMS diam, CSS mc- bergerbang data-tpl-motion), warna tema (merah IGD tetap), SEO situs pembeli, judul
// & gambar & tautan, konten opsional kosong, editor CMS, data katalog (migrasi 044 + pratinjau), dan konten aneh.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionEditor } from '../../pages/account/cms/SectionEditor';
import { validateContent } from '../../pages/account/cms/validation';
import { TEMPLATES, resolveContent } from '../index';
import { iconKey } from '../medicare-general/icons';
import {
  EMERGENCY_RGB,
  EMPTY_REGISTRATION,
  PAGE_SECTIONS,
  TEXT_SIZES,
  TEXT_SIZE_KEY,
  cleanText,
  dayIndex,
  displayPhone,
  doctorInitials,
  doctorsForPoli,
  filterDoctors,
  firstInvalidStep,
  formatDateId,
  insuranceTabs,
  isValidPhone,
  medicareVars,
  navItems,
  parseDays,
  parseTextSize,
  poliKey,
  readMedicare,
  registrationMailHref,
  registrationMessage,
  sectionShown,
  sectionTarget,
  splitTags,
  todayIso,
  uniquePolis,
  validateRegistration,
  validateStep,
  type RegistrationForm,
} from '../medicare-general/model';
import { MEDICARE_PHOTOS } from '../medicare-general/photos';
import { EMERGENCY } from '../medicare-general/styles';
import { applySiteHead, siteTitle } from '../siteHead';
import { SiteRenderer } from '../SiteRenderer';
import { contrast, parseHex } from '../shared/utils';
import { isListField, type ListItem, type SiteContent } from '../types';

// Demo panjang + getByRole di jsdom: bisa lewat 5 dtk saat suite berjalan paralel
vi.setConfig({ testTimeout: 30_000 });

const ROOT = process.cwd();
const CODE = 'medicare-general';
const def = TEMPLATES[CODE];
const ORDER = ['hero', 'services', 'registration', 'doctors', 'clinics', 'emergency', 'inpatient', 'insurance', 'faq', 'contact'];
const DIR = 'src/templates/medicare-general';
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
  const asset = MEDICARE_PHOTOS.asset(src)!;
  return [asset.src, ...asset.srcSet!.split(',').map((part) => part.trim().split(' ')[0])].filter((u, i, all) => all.indexOf(u) === i);
};
/** Tunggu setTimeout(0) komponen (fokus setelah galat / ganti langkah). */
const flush = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 5));
  });
const DOCTORS = def.defaultContent.doctors.items as ListItem[];
const POLIS = (def.defaultContent.clinics.items as ListItem[]).map((c) => String(c.name));
const CTX = { polis: POLIS, doctors: DOCTORS, today: '2026-10-28' };
const reg = (patch: Partial<RegistrationForm> = {}): RegistrationForm => ({
  ...EMPTY_REGISTRATION,
  poli: 'Poli Anak',
  doctor: 'dr. Laras Anindita, Sp.A',
  name: 'Sri  Lestari',
  birth: '1958-03-12',
  phone: '0812 3456 7000',
  payer: 'Asuransi',
  insurer: 'Bentara Proteksi',
  date: '2026-11-02',
  session: 'Pagi',
  complaint: 'Demam\n3 hari',
  ...patch,
});
const IGD = 'tel:+6281234567891';
const AMBULANCE = 'tel:+6281234567892';
const INFO = 'tel:+6281234567890';

let scrolled: (string | null)[] = [];
beforeEach(() => {
  scrolled = [];
  window.localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
    scrolled.push(this.getAttribute('data-tpl-section'));
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('MediCare General: skema & konten bawaan', () => {
  it('urutan form = urutan halaman, semua section bisa disembunyikan, field unik, teks & list berbatas', () => {
    expect(def.code).toBe(CODE);
    expect(def.name).toBe('MediCare General');
    expect(def.features).toBeUndefined();
    expect(def.sections.map((s) => s.key)).toEqual(['brand', ...ORDER, 'footer']);
    expect([...PAGE_SECTIONS]).toEqual([...ORDER, 'footer']);
    const fields = (key: string) => def.sections.find((s) => s.key === key)!.fields.map((f) => f.key);
    expect(fields('brand')).toEqual(['company_name', 'tagline', 'logo', 'accent_color']);
    expect(def.sections[0].fields.find((f) => f.key === 'accent_color')?.type).toBe('color');
    expect(fields('hero')).toEqual(
      expect.arrayContaining(['image', 'tiles', 'igd_title', 'igd_text', 'highlight', 'primary_label', 'secondary_label', 'header_label', 'header_url']),
    );
    expect(fields('contact')).toEqual(
      expect.arrayContaining(['address', 'maps_query', 'maps_url', 'phone', 'email', 'whatsapp', 'whatsapp_message', 'hours', 'igd_label', 'igd_phone', 'ambulance_phone', 'image']),
    );
    expect(fields('footer')).toEqual(expect.arrayContaining(['description', 'note', 'copyright', 'instagram', 'facebook', 'linkedin', 'youtube', 'tiktok']));
    const contact = def.sections.find((s) => s.key === 'contact')!;
    for (const key of ['whatsapp', 'igd_phone', 'ambulance_phone', 'phone']) expect(contact.fields.find((f) => f.key === key)?.type, key).toBe('phone');
    // Dokter TANPA foto: list dokter tidak punya isian gambar
    const doctors = def.sections.find((s) => s.key === 'doctors')!.fields.find((f) => f.key === 'items');
    expect(doctors && isListField(doctors) ? doctors.fields.map((f) => f.type) : []).not.toContain('image');
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
    // Batas yang juga dipakai model.ts & disebut di halaman katalog (medicare-general.content.ts)
    expect(max).toEqual({
      'hero.tiles': 2,
      'services.items': 9,
      'registration.prepare': 6,
      'doctors.items': 30,
      'clinics.stats': 3,
      'clinics.items': 16,
      'clinics.support': 4,
      'emergency.steps': 4,
      'inpatient.items': 6,
      'inpatient.visiting_rules': 4,
      'insurance.bpjs_steps': 5,
      'insurance.insurers': 24,
      'insurance.general_steps': 5,
      'faq.items': 8,
    });
  });

  it('konten demo lolos validasi CMS, logo kosong, semua foto terdaftar, ada di public/, tercatat di CREDITS.md, dan dipakai', () => {
    const c = def.defaultContent;
    expect(validateContent(def, resolveContent(def, null))).toEqual({});
    expect(c.brand.logo).toBe('');
    expect(c.brand.accent_color).toBe('#0B63C9');
    expect(c.contact.whatsapp).toBe('081234567890');
    expect(c.hero.image).toBe('/assets/templates/photos/medicare-general-hero-1920.webp');
    for (const s of def.sections) if (s.key !== 'brand') expect(c[s.key].enabled, s.key).toBe(true);
    const photos = JSON.stringify(c).match(/\/assets\/templates\/photos\/[a-z0-9-]+\.webp/g) ?? [];
    for (const src of photos) expect(MEDICARE_PHOTOS.asset(src), src).not.toBeNull();
    const credits = readFileSync(resolve(ROOT, 'public/assets/templates/photos/CREDITS.md'), 'utf8');
    expect(MEDICARE_PHOTOS.keys).toHaveLength(12);
    const uncredited: string[] = [];
    for (const key of MEDICARE_PHOTOS.keys) {
      expect(key.startsWith('medicare-general-'), key).toBe(true);
      for (const url of urls(MEDICARE_PHOTOS.src(key))) expect(existsSync(publicFile(url)), url).toBe(true);
      if (!credits.includes(`\`${key}-*\``)) uncredited.push(key);
      expect(photos, `${key} dipakai di konten demo`).toContain(MEDICARE_PHOTOS.src(key));
      expect(MEDICARE_PHOTOS.alt(MEDICARE_PHOTOS.src(key), '').split(' ').length, key).toBeGreaterThanOrEqual(5);
    }
    // Simbol bawaan juga tersedia sebagai SVG mandiri, path sama dengan komponen
    const mark = readFileSync(publicFile('/assets/templates/logos/medicare-general-mark.svg'), 'utf8');
    const component = readFileSync(resolve(ROOT, `${DIR}/marks.tsx`), 'utf8');
    const paths = mark.match(/ d="[^"]+"/g) ?? [];
    expect(paths).toHaveLength(2);
    for (const d of paths) expect(component, d).toContain(d.trim());
    expect(mark).toMatch(/viewBox="0 0 32 32"/);
    expect(mark).toMatch(/role="img"/);
    expect(mark).toMatch(/<title>/);
    expect(mark).toMatch(/fill="currentColor"/);
    // Judul tab situs pembeli ≤ 60 karakter, deskripsi hero 120–155 karakter
    expect(`${c.brand.company_name} — ${c.brand.tagline}`.length).toBeLessThanOrEqual(60);
    expect(String(c.hero.subtitle).length).toBeGreaterThanOrEqual(120);
    expect(String(c.hero.subtitle).length).toBeLessThanOrEqual(155);
    // Angka ringkas = isi daftar: 12 poli, 14 dokter; hero & footer menyebut 12 poliklinik
    const clinics = c.clinics.items as ListItem[];
    expect(clinics).toHaveLength(12);
    expect(DOCTORS).toHaveLength(14);
    expect((c.clinics.stats as ListItem[]).map((s) => s.value)).toEqual(['12', '14', '6']);
    expect(String(c.hero.subtitle)).toContain('12 poliklinik');
    expect(String(c.footer.description)).toContain('12 poliklinik');
    // Setiap poli dokter ada di daftar poliklinik (saringan & formulir cocok)
    for (const doc of DOCTORS) expect(POLIS.map(poliKey), String(doc.name)).toContain(poliKey(String(doc.poli)));
    // CREDITS.md gets this template's section at integration
    expect(uncredited, 'foto belum tercatat di CREDITS.md').toEqual([]);
  });

  it('foto demo ringan: hero 800/1280/1920, WebP ≤ 140 KB per file (800w ≤ 90 KB), total ≤ 2,5 MB', () => {
    expect(MEDICARE_PHOTOS.asset(def.defaultContent.hero.image as string)!.srcSet).toBe(
      '/assets/templates/photos/medicare-general-hero-800.webp 800w, /assets/templates/photos/medicare-general-hero-1280.webp 1280w, /assets/templates/photos/medicare-general-hero-1920.webp 1920w',
    );
    let total = 0;
    for (const key of MEDICARE_PHOTOS.keys) {
      for (const url of urls(MEDICARE_PHOTOS.src(key))) {
        expect(url, url).toMatch(/\.webp$/);
        const head = readFileSync(publicFile(url)).subarray(0, 16);
        expect(head.toString('ascii', 0, 4) + head.toString('ascii', 8, 12), url).toBe('RIFFWEBP');
        const kb = statSync(publicFile(url)).size / 1024;
        expect(kb, url).toBeLessThanOrEqual(url.endsWith('-800.webp') ? 90 : 140);
        total += kb;
      }
    }
    expect(total).toBeLessThanOrEqual(2500);
  });

  it('salinan demo jujur: tanpa klaim akreditasi/janji kesembuhan, 119 hanya nomor darurat nasional, nomor RS pola demo', () => {
    const c = def.defaultContent;
    const all = JSON.stringify(c);
    expect(all).not.toMatch(
      /dijamin|garansi|pasti |terbaik|nomor 1|#1|termurah|100%|terakreditasi|paripurna|\bKARS\b|\bJCI\b|bersertifikat|izin resmi|sembuh|tanpa rasa sakit|bebas antre/i,
    );
    // Formulir hanya menyusun pesan WhatsApp; tidak ada rekam medis/hasil lab di website; legal footer = nama contoh
    expect(String(c.registration.form_note)).toMatch(/hanya menyusun pesan WhatsApp/);
    expect(all).toMatch(/data pasien tidak disimpan di website/);
    expect(String(c.footer.note)).toMatch(/nama contoh \(fiktif\)/);
    expect(String(c.footer.note)).toMatch(/Cantumkan izin operasional dan status akreditasi rumah sakit Anda/);
    expect(String(c.insurance.insurers_intro)).toMatch(/fiktif/);
    expect(all).toMatch(/Apakah hasil laboratorium bisa dilihat di website\?","answer":"Tidak\./);
    expect(String(c.contact.email)).toMatch(/\.test$/);
    // Nomor RS = pola demo 0812345678xx; nomor nyata hanya 119 (darurat nasional), tanpa nomor darurat lain
    for (const key of ['igd_phone', 'ambulance_phone', 'phone', 'whatsapp']) expect(String(c.contact[key]), key).toMatch(/^08123456789\d$/);
    expect(all.match(/\b119\b/g)?.length).toBeGreaterThanOrEqual(2);
    expect(all).not.toMatch(/\b(110|112|113|118)\b/);
    expect(String(c.emergency.note)).toMatch(/^Nomor darurat nasional: 119\./);
    expect(String(c.registration.emergency_note)).toMatch(/Jangan daftar online\. Langsung ke IGD atau telepon 119\./);
    // Dokter fiktif bergelar, tanpa foto
    for (const doc of DOCTORS) {
      expect(String(doc.name), String(doc.name)).toMatch(/^drg?\. /);
      expect(Object.keys(doc).sort()).toEqual(['days', 'hours', 'name', 'poli']);
    }
  });
});

describe('MediCare General: helper model', () => {
  it('warna footer: putih ≥ 7:1 di --mc-deep, --mc-bright ≥ 4,5:1 di atasnya; tidak valid → bawaan; merah IGD 6,57:1', () => {
    const white = rgb('#ffffff');
    expect(medicareVars('#0B63C9')).toEqual({ '--mc-deep': '#0a50a5', '--mc-bright': '#afcced' });
    for (const accent of ['#0B63C9', '#1D4ED8', '#A61E3A', '#B7791F', '#FACC15', '#C6F135', '#FFFFFF', '#000000', '#6EE7B7', '#7C3AED', '#12A07F']) {
      const vars = medicareVars(accent) as Record<string, string>;
      const deep = rgb(vars['--mc-deep']);
      expect(contrast(deep, white), accent).toBeGreaterThanOrEqual(7);
      expect(contrast(rgb(vars['--mc-bright']), deep), accent).toBeGreaterThanOrEqual(4.5);
    }
    expect(medicareVars('zzz')).toEqual(medicareVars('#0B63C9'));
    expect(medicareVars('')).toEqual(medicareVars('#0B63C9'));
    expect(EMERGENCY).toBe('#B71C1C');
    expect(rgb(EMERGENCY)).toEqual(EMERGENCY_RGB);
    expect(contrast(EMERGENCY_RGB, white)).toBeGreaterThanOrEqual(6.5);
    expect(contrast(EMERGENCY_RGB, rgb('#FDECEC'))).toBeGreaterThanOrEqual(4.5);
  });

  it('ukuran teks: tiga skala, nilai tersimpan dibaca aman', () => {
    expect(TEXT_SIZES.map((s) => [s.label, s.name, s.scale])).toEqual([
      ['A', 'normal', 1],
      ['A+', 'besar', 1.125],
      ['A++', 'sangat besar', 1.25],
    ]);
    expect(TEXT_SIZE_KEY).toBe('medicare-general:text-size');
    expect(parseTextSize('0')).toBe(0);
    expect(parseTextSize(' 2 ')).toBe(2);
    expect(parseTextSize('1')).toBe(1);
    for (const bad of ['3', '-1', '1.5', 'besar', '', null, undefined]) expect(parseTextSize(bad), String(bad)).toBe(0);
  });

  it('menu: label pendek dari label section, section kosong/tersembunyi keluar dari menu', () => {
    const content = resolveContent(def, null);
    expect(navItems(content).map((i) => `${i.key}:${i.label}`)).toEqual([
      'services:Layanan',
      'doctors:Jadwal dokter',
      'clinics:Poliklinik',
      'inpatient:Rawat inap',
      'insurance:Asuransi',
      'contact:Kontak',
    ]);
    const less = resolveContent(def, {
      services: { eyebrow: 'Layanan unggulan rumah sakit' },
      doctors: { items: [] },
      inpatient: { enabled: false },
      insurance: { eyebrow: 'BPJS' },
    });
    expect(navItems(less).map((i) => `${i.key}:${i.label}`)).toEqual(['services:Layanan', 'clinics:Poliklinik', 'insurance:BPJS', 'contact:Kontak']);
  });

  it('tujuan tautan: anchor Indonesia dan kunci section; section tersembunyi → cadangan', () => {
    const cases: Record<string, string | null> = {
      '#pendaftaran': 'registration',
      '#daftar-online': 'registration',
      '#jadwal': 'doctors',
      '#jadwal-dokter': 'doctors',
      '#poliklinik': 'clinics',
      '#penunjang': 'clinics',
      '#igd': 'emergency',
      '#gawat-darurat': 'emergency',
      '#rawat-inap': 'inpatient',
      '#bpjs': 'insurance',
      '#asuransi': 'insurance',
      '#tanya-jawab': 'faq',
      '#kontak': 'contact',
      '#layanan': 'services',
      '#beranda': 'hero',
      doctors: 'doctors',
      '#tidak-ada': null,
    };
    for (const [raw, key] of Object.entries(cases)) expect(sectionTarget(raw), raw).toBe(key);
    const m = readMedicare(resolveContent(def, null));
    expect(m.primaryAction).toEqual({ kind: 'section', target: 'clinics' });
    expect(m.secondaryAction).toEqual({ kind: 'section', target: 'insurance' });
    expect(m.headerAction).toEqual({ kind: 'section', target: 'registration' });
    expect(m.registerAction).toEqual({ kind: 'section', target: 'registration' });
    expect(m.tiles.map((t) => t.action)).toEqual([
      { kind: 'section', target: 'registration' },
      { kind: 'section', target: 'doctors' },
    ]);
    expect(m.igdAction).toEqual({ kind: 'external', href: IGD });
    expect(m.ambulanceAction).toEqual({ kind: 'external', href: AMBULANCE });
    expect(m.linkOr('#jadwal', null)).toEqual({ kind: 'section', target: 'doctors' });
    expect(m.linkOr('https://portal.contoh.test/antrean', null)).toEqual({ kind: 'external', href: 'https://portal.contoh.test/antrean' });
    // Pendaftaran tersembunyi → "daftar" ke WhatsApp; tanpa WhatsApp → Kontak; anchor ke section tersembunyi → cadangan
    const hidden = readMedicare(resolveContent(def, { registration: { enabled: false } }));
    expect(hidden.registerAction?.kind).toBe('external');
    expect(hidden.headerAction).toEqual(hidden.registerAction);
    expect(hidden.tiles[0].action).toEqual(hidden.registerAction);
    expect(hidden.linkOr('#pendaftaran', null)).toBeNull();
    const silent = readMedicare(resolveContent(def, { registration: { enabled: false }, contact: { whatsapp: '' } }));
    expect(silent.registerAction).toEqual({ kind: 'section', target: 'contact' });
    const noIgd = readMedicare(resolveContent(def, { contact: { igd_phone: '', ambulance_phone: '' } }));
    expect(noIgd.igdAction).toBeNull();
    expect(noIgd.ambulanceAction).toBeNull();
  });

  it('section tampil hanya bila berisi', () => {
    const content = resolveContent(def, null);
    for (const key of ORDER) expect(sectionShown(content, key), key).toBe(true);
    const empty = resolveContent(def, {
      services: { items: [{ text: 'tanpa judul' }] },
      doctors: { items: [{ poli: 'Poli Anak' }] },
      clinics: { items: [{ location: 'Lantai 1' }], support: [{ text: 'tanpa judul' }] },
      emergency: { title: '', steps: [] },
      contact: { igd_phone: '' },
      inpatient: { items: [] },
      insurance: { bpjs_steps: [], bpjs_note: '', insurers: [], insurers_intro: '', general_steps: [] },
      faq: { items: [{ answer: 'tanpa pertanyaan' }] },
    });
    for (const key of ['services', 'doctors', 'clinics', 'emergency', 'inpatient', 'insurance', 'faq']) expect(sectionShown(empty, key), key).toBe(false);
    expect(sectionShown(content, 'tidak-ada')).toBe(false);
    expect(insuranceTabs(def.defaultContent.insurance)).toEqual([
      { key: 'bpjs', label: 'Pasien BPJS' },
      { key: 'insurers', label: 'Asuransi & perusahaan' },
      { key: 'general', label: 'Pasien umum' },
    ]);
    expect(insuranceTabs({ general_steps: [{ title: 'Daftar' }] }).map((t) => `${t.key}:${t.label}`)).toEqual(['general:Pasien umum']);
  });

  it('hari praktik: daftar, rentang, singkatan, "setiap hari"; tidak terbaca → []', () => {
    expect(parseDays('Senin–Sabtu')).toEqual([0, 1, 2, 3, 4, 5]);
    expect(parseDays('Senin, Rabu, Jumat')).toEqual([0, 2, 4]);
    expect(parseDays('Senin - Jumat')).toEqual([0, 1, 2, 3, 4]);
    expect(parseDays('Senin s.d. Kamis')).toEqual([0, 1, 2, 3]);
    expect(parseDays('Selasa sampai Kamis')).toEqual([1, 2, 3]);
    expect(parseDays('Sen, Kam & Sab')).toEqual([0, 3, 5]);
    expect(parseDays("Jum'at dan Minggu")).toEqual([4, 6]);
    expect(parseDays('Ahad')).toEqual([6]);
    expect(parseDays('Sabtu–Senin')).toEqual([0, 5, 6]);
    expect(parseDays('Setiap hari')).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(parseDays('Dengan perjanjian')).toEqual([]);
    expect(parseDays('')).toEqual([]);
    expect(dayIndex('Kamis')).toBe(3);
    expect(dayIndex('x')).toBe(-1);
  });

  it('dokter: inisial tanpa gelar, kunci poli, pilihan poli unik, saringan poli & hari', () => {
    expect(doctorInitials('dr. Laras Anindita, Sp.A')).toBe('LA');
    expect(doctorInitials('drg. Yoga Pradana')).toBe('YP');
    expect(doctorInitials('dr. Fajar Nugroho, Sp.THT-KL')).toBe('FN');
    expect(doctorInitials('Prof. dr. Budi')).toBe('BU');
    expect(doctorInitials('')).toBe('?');
    expect(poliKey('Poli Anak')).toBe('anak');
    expect(poliKey('Poliklinik Kulit & Kelamin')).toBe(poliKey('kulit dan kelamin'));
    expect(uniquePolis(['Poli Anak', 'anak', 'Poli Umum', '', 'Klinik Umum'])).toEqual(['Poli Anak', 'Poli Umum']);
    const names = (rows: ListItem[]) => rows.map((r) => String(r.name));
    expect(names(filterDoctors(DOCTORS, { poli: '', day: -1 }))).toHaveLength(14);
    expect(names(filterDoctors(DOCTORS, { poli: 'Poli Anak', day: -1 }))).toEqual(['dr. Laras Anindita, Sp.A', 'dr. Galih Santoso, Sp.A']);
    expect(names(filterDoctors(DOCTORS, { poli: 'anak', day: 1 }))).toEqual(['dr. Galih Santoso, Sp.A']);
    expect(names(filterDoctors(DOCTORS, { poli: '', day: 5 }))).toEqual([
      'dr. Ratna Wulandari',
      'dr. Galih Santoso, Sp.A',
      'dr. Sekar Ayuningtyas, Sp.N',
      'drg. Yoga Pradana',
      'dr. Nadia Rahmawati, Sp.KFR',
    ]);
    expect(filterDoctors(DOCTORS, { poli: '', day: 6 })).toEqual([]);
    // Hari praktik tidak terbaca → tetap tampil di semua pilihan hari (tidak hilang karena salah ketik)
    const odd = [{ name: 'dr. A', poli: 'Poli Umum', days: 'Dengan perjanjian' }];
    expect(filterDoctors(odd, { poli: '', day: 6 })).toHaveLength(1);
    expect(names(doctorsForPoli(DOCTORS, 'Poli Umum'))).toEqual(['dr. Ratna Wulandari', 'dr. Bayu Pratama']);
    expect(doctorsForPoli(DOCTORS, '')).toEqual([]);
  });

  it('formulir 3 langkah: validasi per langkah, tanggal lahir/kunjungan, nomor HP, langkah pertama yang salah', () => {
    expect(validateStep(0, EMPTY_REGISTRATION, CTX)).toEqual({ poli: 'Pilih poli tujuan.' });
    expect(validateStep(0, reg({ poli: 'anak', doctor: '' }), CTX)).toEqual({});
    expect(validateStep(0, reg({ poli: 'Poli Bukan' }), CTX)).toEqual({ poli: 'Pilih poli tujuan.' });
    expect(validateStep(0, reg({ doctor: 'dr. Bayu Pratama' }), CTX)).toEqual({ doctor: 'Pilih dokter dari daftar, atau "Dokter mana saja".' });
    expect(validateStep(1, EMPTY_REGISTRATION, CTX)).toEqual({
      name: 'Tulis nama pasien.',
      birth: 'Isi tanggal lahir pasien.',
      phone: 'Tulis nomor HP yang aktif, mis. 081234567890.',
      payer: 'Pilih jenis pasien.',
    });
    expect(validateStep(1, reg(), CTX)).toEqual({});
    expect(validateStep(1, reg({ birth: '2030-01-01' }), CTX).birth).toBe('Tanggal lahir tidak boleh setelah hari ini.');
    expect(validateStep(1, reg({ birth: '2026-02-30' }), CTX).birth).toBe('Isi tanggal lahir pasien.');
    expect(validateStep(1, reg({ birth: '1890-01-01' }), CTX).birth).toBe('Isi tanggal lahir pasien.');
    expect(validateStep(1, reg({ name: ' a ' }), CTX).name).toBe('Tulis nama pasien.');
    expect(validateStep(1, reg({ payer: 'Gratis' }), CTX).payer).toBe('Pilih jenis pasien.');
    expect(validateStep(2, EMPTY_REGISTRATION, CTX)).toEqual({ date: 'Pilih tanggal kunjungan.', session: 'Pilih sesi kunjungan.' });
    expect(validateStep(2, reg({ date: '2026-10-27' }), CTX).date).toBe('Tanggal kunjungan tidak boleh sebelum hari ini.');
    expect(validateStep(2, reg({ date: '2026-10-28' }), CTX)).toEqual({});
    expect(validateStep(2, reg({ session: 'Malam' }), CTX).session).toBe('Pilih sesi kunjungan.');
    expect(validateRegistration(reg(), CTX)).toEqual({});
    expect(firstInvalidStep(reg(), CTX)).toBe(-1);
    expect(firstInvalidStep(reg({ name: '' }), CTX)).toBe(1);
    expect(firstInvalidStep(reg({ poli: '', session: '' }), CTX)).toBe(0);
    for (const ok of ['081234567890', '0812 3456 7890', '0812-3456-789', '+62 812-3456-7890', '6281234567890']) expect(isValidPhone(ok), ok).toBe(true);
    for (const bad of ['', '12345', '0212345678', '08123', 'abc', '081234567890123']) expect(isValidPhone(bad), bad).toBe(false);
    expect(todayIso(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(formatDateId('2026-11-02')).toBe('Senin, 2 November 2026');
    expect(formatDateId('1958-03-12', false)).toBe('12 Maret 1958');
    expect(formatDateId('bukan tanggal')).toBe('bukan tanggal');
  });

  it('pesan WhatsApp pendaftaran: salam, baris tetap berurutan, isian opsional kosong tidak ikut', () => {
    expect(registrationMessage(reg(), 'RS MediCare General')).toBe(
      [
        'Halo RS MediCare General, saya ingin mendaftar berobat rawat jalan.',
        '',
        'Poli: Poli Anak',
        'Dokter: dr. Laras Anindita, Sp.A',
        'Nama pasien: Sri Lestari',
        'Tanggal lahir: 12 Maret 1958',
        'No. HP: 0812 3456 7000',
        'Jenis pasien: Asuransi (Bentara Proteksi)',
        'Rencana kunjungan: Senin, 2 November 2026, sesi pagi',
        'Keluhan: Demam 3 hari',
      ].join('\n'),
    );
    const short = registrationMessage(reg({ doctor: '', payer: 'BPJS', insurer: 'diabaikan', complaint: '  ', session: 'Sore' }), '');
    expect(short.split('\n')[0]).toBe('Halo, saya ingin mendaftar berobat rawat jalan.');
    expect(short).toContain('Dokter: Dokter mana saja');
    expect(short).toContain('Jenis pasien: BPJS');
    expect(short).toContain('Rencana kunjungan: Senin, 2 November 2026, sesi sore');
    expect(short).not.toMatch(/Keluhan:|diabaikan/);
    expect(registrationMessage(reg({ insurer: '' }), 'RS X')).toContain('Jenis pasien: Asuransi\n');
    expect(cleanText('a\u0000b\u0007  c', 10)).toBe('a b c');
    expect(cleanText('x'.repeat(500), 200)).toHaveLength(200);
    expect(registrationMailHref('informasi@medicaregeneral.test', 'Baris 1\nBaris 2')).toBe(
      'mailto:informasi@medicaregeneral.test?subject=Pendaftaran%20berobat&body=Baris%201%0ABaris%202',
    );
    expect(registrationMailHref('bukan email', 'x')).toBe('');
  });

  it('teks kecil & ikon otomatis dari nama poli/layanan', () => {
    expect(splitTags('AC · TV, Kulkas | Sofa bed; Kipas')).toEqual(['AC', 'TV', 'Kulkas', 'Sofa bed', 'Kipas']);
    expect(splitTags('')).toEqual([]);
    expect(displayPhone('081234567891')).toBe('0812-3456-7891');
    expect(displayPhone('(024) 555-0182')).toBe('(024) 555-0182');
    expect(displayPhone('')).toBe('');
    const icons: Record<string, string> = {
      'IGD 24 jam': 'emergency',
      'Rawat inap': 'inpatient',
      Laboratorium: 'lab',
      Radiologi: 'radiology',
      'Farmasi 24 jam': 'pharmacy',
      'Daftar Online': 'register',
      'Jadwal Dokter': 'schedule',
      'Poli Anak': 'child',
      'Poli Kandungan': 'maternity',
      'Poli Jantung': 'heart',
      'Poli Saraf': 'neuro',
      'Poli THT': 'ent',
      'Poli Mata': 'eye',
      'Poli Gigi': 'dental',
      'Poli Kulit & Kelamin': 'skin',
      'Poli Bedah': 'surgery',
      'Poli Penyakit Dalam': 'internal',
      'Poli Rehabilitasi Medik': 'rehab',
      'Poli Umum': 'general',
      'Rawat jalan': 'general',
    };
    for (const [name, key] of Object.entries(icons)) expect(iconKey(name), name).toBe(key);
  });
});

describe('MediCare General: demo', () => {
  it('urutan section, satu H1, hero triage: foto LCP (eager, srcset, ukuran, alt) tanpa reveal, tiga ubin aksi', () => {
    const container = demo();
    expect(sectionKeys(container)).toEqual([...ORDER, 'footer']);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const hero = section(container, 'hero');
    expect(hero.getAttribute('data-hero-layout')).toBe('triage');
    expect(hero.querySelector('h1')!.textContent).toBe('Berobat lebih tenang, dari daftar sampai pulang');
    expect(hero.querySelector('h1 span')!.textContent).toBe('lebih tenang');
    const img = hero.querySelector<HTMLImageElement>('img[fetchpriority="high"]')!;
    expect(img.getAttribute('src')).toBe('/assets/templates/photos/medicare-general-hero-1920.webp');
    expect(img.getAttribute('srcset')).toContain(' 800w');
    expect(img.getAttribute('srcset')).toContain(' 1280w');
    expect(img.getAttribute('loading')).toBe('eager');
    expect(img.getAttribute('sizes')).toBeTruthy();
    expect(Number(img.getAttribute('width'))).toBe(1920);
    expect(Number(img.getAttribute('height'))).toBe(1080);
    expect(img.getAttribute('alt')).toBe('Selasar rumah sakit yang terang dengan dinding kaca melengkung dan kursi tunggu biru muda');
    // Foto hero = LATAR (absolute, menutupi hero), TIDAK di dalam <Reveal>/ubin bergerak, tanpa zoom/parallax
    expect(img.closest('.tpl-reveal, .mc-tile')).toBeNull();
    expect(img.className).not.toMatch(/tpl-photo|mc-/);
    expect(hero.querySelector('.mc-hero-fade')).toHaveAttribute('aria-hidden', 'true');
    expect(within(hero).getByRole('link', { name: /^Cari Poliklinik/ })).toHaveAttribute('href', '#clinics');
    expect(within(hero).getByRole('link', { name: 'Info BPJS & Asuransi' })).toHaveAttribute('href', '#insurance');
    const tiles = within(hero).getByRole('list', { name: 'Akses cepat' });
    const items = Array.from(tiles.querySelectorAll(':scope > li'));
    expect(items).toHaveLength(3);
    expect(tiles.className).toContain('@3xl:grid-cols-3');
    expect(within(tiles).getByRole('link', { name: /^Daftar Online/ })).toHaveAttribute('href', '#registration');
    expect(within(tiles).getByRole('link', { name: /^Jadwal Dokter/ })).toHaveAttribute('href', '#doctors');
    const igd = within(tiles).getByRole('link', { name: 'IGD 24 Jam: telepon 0812-3456-7891' });
    expect(igd).toHaveAttribute('href', IGD);
    expect(igd.className).toContain('bg-[#B71C1C]');
    expect(items.map((li) => li.querySelector('.mc-tile'))).not.toContain(null);
    const eager = Array.from(container.querySelectorAll('img')).filter((i) => i.getAttribute('loading') !== 'lazy');
    expect(eager.map((i) => i.getAttribute('src'))).toEqual(['/assets/templates/photos/medicare-general-hero-1920.webp']);
    expect(container.querySelectorAll('img[fetchpriority="high"]')).toHaveLength(1);
  });

  it('header: strip IGD merah + bilah putih menempel, menu, tombol Daftar Online; menu HP buka/tutup, Esc menutup dan fokus kembali', () => {
    const container = demo();
    const header = container.querySelector('header')!;
    expect(header.className).toContain('sticky');
    expect(header.className).toContain('bg-white');
    expect(header.querySelector('.bg-\\[\\#B71C1C\\]')!.textContent).toContain('IGD 24 jam');
    expect(header.querySelector('svg[viewBox="0 0 32 32"]'), 'MediCareMark').not.toBeNull();
    const calls = within(header).getAllByRole('link', { name: 'Telepon IGD 24 jam: 0812-3456-7891' });
    expect(calls).toHaveLength(2);
    for (const a of calls) expect(a).toHaveAttribute('href', IGD);
    const nav = within(header).getByRole('navigation', { name: 'Menu utama' });
    expect(Array.from(nav.querySelectorAll('a')).map((a) => a.getAttribute('href'))).toEqual(['#layanan', '#doctors', '#clinics', '#inpatient', '#insurance', '#kontak']);
    fireEvent.click(within(nav).getByRole('link', { name: 'Poliklinik' }));
    expect(scrolled).toEqual(['clinics']);
    expect(within(header).getByRole('link', { name: 'Daftar Online' })).toHaveAttribute('href', '#registration');
    expect(within(header).getAllByRole('group', { name: 'Ukuran teks' })).toHaveLength(1);
    const toggle = within(header).getByRole('button', { name: 'Buka menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAttribute('aria-label', 'Tutup menu');
    expect(within(header).getAllByRole('navigation', { name: 'Menu utama' })).toHaveLength(2);
    const panel = document.getElementById(toggle.getAttribute('aria-controls')!)!;
    expect(panel).toHaveAttribute('aria-label', 'Menu utama');
    expect(within(panel).getByRole('group', { name: 'Ukuran teks' })).toBeInTheDocument();
    expect(within(panel).getAllByRole('link').map((a) => a.textContent)).toEqual([
      'Layanan',
      'Jadwal dokter',
      'Poliklinik',
      'Rawat inap',
      'Asuransi',
      'Kontak',
      'Daftar Online',
      'IGD 24 jam: 0812-3456-7891',
    ]);
    expect(within(panel).getByRole('link', { name: /^IGD 24 jam/ })).toHaveAttribute('href', IGD);
    fireEvent.click(within(panel).getByRole('link', { name: 'Rawat inap' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(scrolled).toEqual(['clinics', 'inpatient']);
    fireEvent.click(toggle);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
    // Tanpa nomor IGD: strip tanpa tautan telepon, tanpa tombol telepon merah
    cleanup();
    const plain = demo({ contact: { igd_phone: '' }, hero: { header_label: '' } }).querySelector('header')!;
    expect(plain.querySelector('a[href^="tel:"]')).toBeNull();
    expect(plain.textContent).toContain('IGD 24 jam');
    expect(within(plain).queryByRole('link', { name: 'Daftar Online' })).toBeNull();
  });

  it('kontrol ukuran teks: aria-pressed, skala --mc-fs di wrapper, diingat di localStorage (dan saat dirender ulang)', () => {
    const container = demo();
    const wrapper = () => container.querySelector<HTMLElement>('[data-mc-text-size]')!;
    expect(wrapper().getAttribute('data-mc-text-size')).toBe('normal');
    expect(wrapper().style.getPropertyValue('--mc-fs')).toBe('1');
    const strip = within(container.querySelector('header')!).getByRole('group', { name: 'Ukuran teks' });
    const buttons = within(strip).getAllByRole('button');
    expect(buttons.map((b) => [b.textContent, b.getAttribute('aria-label'), b.getAttribute('aria-pressed'), b.getAttribute('type')])).toEqual([
      ['A', 'Ukuran teks normal', 'true', 'button'],
      ['A+', 'Ukuran teks besar', 'false', 'button'],
      ['A++', 'Ukuran teks sangat besar', 'false', 'button'],
    ]);
    fireEvent.click(buttons[1]);
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'true');
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'false');
    expect(wrapper().getAttribute('data-mc-text-size')).toBe('besar');
    expect(wrapper().style.getPropertyValue('--mc-fs')).toBe('1.125');
    expect(window.localStorage.getItem(TEXT_SIZE_KEY)).toBe('1');
    cleanup();
    // Dirender ulang (halaman lain / kunjungan berikutnya) → tetap "besar"
    const again = demo();
    expect(again.querySelector('[data-mc-text-size]')).toHaveAttribute('data-mc-text-size', 'besar');
    fireEvent.click(within(again.querySelector('header')!).getByRole('button', { name: 'Ukuran teks sangat besar' }));
    expect(again.querySelector<HTMLElement>('[data-mc-text-size]')!.style.getPropertyValue('--mc-fs')).toBe('1.25');
    // Penyimpanan diblokir (mode privat): tidak crash, pilihan tetap berlaku selama halaman terbuka
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    fireEvent.click(within(again.querySelector('header')!).getByRole('button', { name: 'Ukuran teks besar' }));
    expect(again.querySelector('[data-mc-text-size]')).toHaveAttribute('data-mc-text-size', 'besar');
    setItem.mockRestore();
    getItem.mockRestore();
    // Kembali ke normal (status modul dipakai bersama antar-tes)
    fireEvent.click(within(again.querySelector('header')!).getByRole('button', { name: 'Ukuran teks normal' }));
    expect(again.querySelector('[data-mc-text-size]')).toHaveAttribute('data-mc-text-size', 'normal');
    // Semua ukuran huruf template (kelas mc-t-*) dikalikan --mc-fs
    const css = readFileSync(resolve(ROOT, `${DIR}/medicare-general.css`), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const sizes = css.match(/\.mc-t-[a-z0-9]+\s*\{[^}]*font-size:[^;]+;/g) ?? [];
    expect(sizes.length).toBeGreaterThan(15);
    // (nomor IGD besar boleh dibatasi lebar wadah: min(calc(…), Ncqi))
    for (const rule of sizes) expect(rule, rule).toMatch(/font-size: (calc\(\d+px \* var\(--mc-fs, 1\)\)|min\(calc\(\d+px \* var\(--mc-fs, 1\)\), [\d.]+cqi\));/);
  });

  it('layanan: ubin bertautan dengan ikon otomatis; HP satu kartu berbaris', () => {
    const services = section(demo(), 'services');
    const list = services.querySelector('ul')!;
    expect(list.className).toContain('divide-y');
    expect(list.className).toContain('@2xl:grid-cols-2');
    expect(list.className).toContain('@5xl:grid-cols-3');
    const links = within(services).getAllByRole('link');
    expect(links.map((a) => [a.querySelector('h3')!.textContent, a.getAttribute('href')])).toEqual([
      ['Rawat jalan', '#clinics'],
      ['IGD 24 jam', '#emergency'],
      ['Rawat inap', '#inpatient'],
      ['Laboratorium', '#clinics'],
      ['Radiologi', '#clinics'],
      ['Farmasi 24 jam', '#clinics'],
    ]);
    for (const a of links) expect(a.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  });

  it('jadwal dokter: tabel tanpa foto, 6 baris + tampilkan semua, saringan poli & hari (radio), kosong → tampilkan semua', () => {
    const container = demo();
    const doctors = section(container, 'doctors');
    expect(doctors.querySelector('img')).toBeNull();
    const table = within(doctors).getByRole('table');
    expect(table.querySelector('caption')!.textContent).toBe('Jadwal praktik dokter');
    const rows = () => Array.from(doctors.querySelectorAll('tbody tr'));
    const status = () => doctors.querySelector('[aria-live="polite"]')!.textContent;
    expect(rows()).toHaveLength(6);
    expect(status()).toBe('Menampilkan 6 dari 14 jadwal dokter');
    expect(rows()[0].querySelector('[aria-hidden]')!.textContent).toBe('RW');
    expect(Array.from(table.querySelectorAll('th')).map((th) => th.textContent)).toEqual(['Dokter', 'Poli', 'Hari praktik', 'Jam', 'Pendaftaran']);
    const more = within(doctors).getByRole('button', { name: 'Tampilkan semua jadwal (14 dokter)' });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(more);
    expect(more).toHaveAttribute('aria-expanded', 'true');
    expect(more.textContent).toBe('Tampilkan lebih sedikit');
    expect(rows()).toHaveLength(14);
    expect(status()).toBe('Menampilkan 14 jadwal dokter');
    // Saringan poli
    fireEvent.change(within(doctors).getByLabelText('Poli'), { target: { value: 'Poli Anak' } });
    expect(rows().map((r) => r.querySelector('td')!.textContent)).toEqual([
      expect.stringContaining('dr. Laras Anindita, Sp.A'),
      expect.stringContaining('dr. Galih Santoso, Sp.A'),
    ]);
    expect(status()).toBe('Menampilkan 2 jadwal dokter');
    // Saringan hari = radio dalam fieldset "Hari praktik"
    const days = within(doctors).getByRole('group', { name: 'Hari praktik' });
    const radios = within(days).getAllByRole('radio');
    expect(radios).toHaveLength(8);
    expect(radios[0]).toBeChecked();
    fireEvent.click(within(days).getByRole('radio', { name: 'Selasa' }));
    expect(within(days).getByRole('radio', { name: 'Selasa' })).toBeChecked();
    expect(radios[0]).not.toBeChecked();
    expect(rows()).toHaveLength(1);
    expect(rows()[0].textContent).toContain('dr. Galih Santoso, Sp.A');
    fireEvent.click(within(days).getByRole('radio', { name: 'Minggu' }));
    expect(within(doctors).queryByRole('table')).toBeNull();
    expect(doctors.textContent).toContain('Tidak ada dokter yang praktik pada pilihan ini.');
    expect(status()).toBe('Tidak ada jadwal untuk pilihan ini');
    fireEvent.click(within(doctors).getByRole('button', { name: 'Tampilkan semua jadwal' }));
    expect(within(days).getByRole('radio', { name: 'Semua hari' })).toBeChecked();
    expect((within(doctors).getByLabelText('Poli') as HTMLSelectElement).value).toBe('');
    expect(rows()).toHaveLength(14);
    expect(doctors.textContent).toContain('Jadwal bisa berubah. Petugas mengonfirmasi jadwal saat membalas pendaftaran Anda.');
  });

  it('"Daftar" di jadwal dokter mengisi poli & dokter di formulir pendaftaran lalu menggulir ke sana', () => {
    const container = demo();
    const doctors = section(container, 'doctors');
    const button = within(doctors).getByRole('button', { name: 'Daftar ke dr. Laras Anindita, Sp.A' });
    expect(button).toHaveAttribute('type', 'button');
    fireEvent.click(button);
    expect(scrolled).toContain('registration');
    const formEl = within(section(container, 'registration')).getByRole('form', { name: 'Formulir pendaftaran berobat' });
    expect((within(formEl).getByLabelText('Poli tujuan') as HTMLSelectElement).value).toBe('Poli Anak');
    expect((within(formEl).getByLabelText(/^Dokter/) as HTMLSelectElement).value).toBe('dr. Laras Anindita, Sp.A');
    expect(formEl.textContent).toContain('Praktik: Senin, Rabu, Jumat · 08.00–12.00');
    // Pendaftaran tersembunyi → "Daftar" = WhatsApp berisi nama dokter
    cleanup();
    const noForm = section(demo({ registration: { enabled: false } }), 'doctors');
    const wa = within(noForm).getByRole('link', { name: 'Daftar ke dr. Laras Anindita, Sp.A lewat WhatsApp' });
    expect(decodeURIComponent(wa.getAttribute('href')!)).toBe(
      'https://wa.me/6281234567890?text=Halo RS MediCare General, saya ingin mendaftar ke dr. Laras Anindita, Sp.A (Poli Anak).',
    );
  });

  it('pendaftaran 3 langkah: penanda langkah, galat + fokus, Kembali/Lanjut, pesan WhatsApp, ubah data', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 28, 9, 0, 0));
    const container = demo();
    const registration = section(container, 'registration');
    expect(registration.textContent).toContain('data pasien tidak disimpan di website');
    const note = within(registration).getByRole('link', { name: 'Telepon IGD 0812-3456-7891' });
    expect(note).toHaveAttribute('href', IGD);
    expect(note.closest('div')!.parentElement!.textContent).toContain('Keadaan darurat? Jangan daftar online.');
    const formEl = within(registration).getByRole('form', { name: 'Formulir pendaftaran berobat' });
    expect(formEl.getAttribute('action')).toBeNull();
    const steps = within(formEl).getByRole('list', { name: 'Langkah pendaftaran' });
    const current = () => Array.from(steps.querySelectorAll('li')).findIndex((li) => li.getAttribute('aria-current') === 'step');
    expect(current()).toBe(0);
    expect(formEl.querySelector('h3')!.textContent).toBe('Langkah 1 dari 3Poli & dokter');
    expect(within(formEl).queryByRole('button', { name: 'Kembali' })).toBeNull();
    // Langkah 1 kosong → galat + fokus
    fireEvent.click(within(formEl).getByRole('button', { name: 'Lanjut' }));
    await flush();
    const poli = within(formEl).getByLabelText('Poli tujuan');
    expect(poli).toHaveAttribute('aria-invalid', 'true');
    expect(poli).toHaveAttribute('aria-describedby', `${poli.id}-error`);
    expect(document.getElementById(`${poli.id}-error`)!.textContent).toBe('Pilih poli tujuan.');
    expect(poli).toHaveFocus();
    // Pilihan poli = daftar poliklinik; dokter tersaring per poli
    expect(Array.from((poli as HTMLSelectElement).options).map((o) => o.value)).toEqual(['', ...POLIS]);
    fireEvent.change(poli, { target: { value: 'Poli Anak' } });
    expect(poli).not.toHaveAttribute('aria-invalid');
    const doctor = within(formEl).getByLabelText(/^Dokter/) as HTMLSelectElement;
    expect(Array.from(doctor.options).map((o) => o.textContent)).toEqual(['Dokter mana saja', 'dr. Laras Anindita, Sp.A', 'dr. Galih Santoso, Sp.A']);
    fireEvent.change(doctor, { target: { value: 'dr. Galih Santoso, Sp.A' } });
    fireEvent.click(within(formEl).getByRole('button', { name: 'Lanjut' }));
    await flush();
    expect(current()).toBe(1);
    expect(formEl.querySelector('h3')!.textContent).toBe('Langkah 2 dari 3Data pasien');
    expect(formEl.querySelector('h3')).toHaveFocus();
    // Langkah 2: galat semua isian, fokus ke nama
    fireEvent.click(within(formEl).getByRole('button', { name: 'Lanjut' }));
    await flush();
    expect(within(formEl).getByLabelText('Nama pasien')).toHaveFocus();
    expect(formEl.textContent).toContain('Pilih jenis pasien.');
    const payer = within(formEl).getByRole('group', { name: 'Jenis pasien' });
    expect(within(payer).getAllByRole('radio').map((r) => (r as HTMLInputElement).value)).toEqual(['BPJS', 'Umum', 'Asuransi']);
    fireEvent.change(within(formEl).getByLabelText('Nama pasien'), { target: { value: 'Sri Lestari' } });
    fireEvent.change(within(formEl).getByLabelText('Tanggal lahir'), { target: { value: '1958-03-12' } });
    fireEvent.change(within(formEl).getByLabelText('Nomor HP / WhatsApp'), { target: { value: '0812 3456 7000' } });
    expect(within(formEl).queryByLabelText(/Nama asuransi/)).toBeNull();
    fireEvent.click(within(payer).getByRole('radio', { name: 'Asuransi' }));
    fireEvent.change(within(formEl).getByLabelText(/Nama asuransi/), { target: { value: 'Bentara Proteksi' } });
    // Kembali → langkah 1 dengan isian tetap
    fireEvent.click(within(formEl).getByRole('button', { name: 'Kembali' }));
    expect(current()).toBe(0);
    expect((within(formEl).getByLabelText(/^Dokter/) as HTMLSelectElement).value).toBe('dr. Galih Santoso, Sp.A');
    fireEvent.click(within(formEl).getByRole('button', { name: 'Lanjut' }));
    fireEvent.click(within(formEl).getByRole('button', { name: 'Lanjut' }));
    await flush();
    expect(current()).toBe(2);
    // Langkah 3: kirim kosong → galat; tanggal sebelum hari ini ditolak
    const submit = within(formEl).getByRole('button', { name: 'Susun pesan WhatsApp' });
    expect(submit).toHaveAttribute('type', 'submit');
    act(() => {
      fireEvent.submit(formEl);
    });
    expect(formEl.textContent).toContain('Pilih tanggal kunjungan.');
    expect(formEl.textContent).toContain('Pilih sesi kunjungan.');
    const date = within(formEl).getByLabelText('Tanggal kunjungan');
    expect(date).toHaveAttribute('min', '2026-10-28');
    fireEvent.change(date, { target: { value: '2026-10-20' } });
    fireEvent.click(within(within(formEl).getByRole('group', { name: 'Sesi kunjungan' })).getByRole('radio', { name: 'Pagi' }));
    act(() => {
      fireEvent.submit(formEl);
    });
    expect(formEl.textContent).toContain('Tanggal kunjungan tidak boleh sebelum hari ini.');
    fireEvent.change(date, { target: { value: '2026-11-02' } });
    fireEvent.change(within(formEl).getByLabelText(/^Keluhan singkat/), { target: { value: 'Batuk  pilek' } });
    act(() => {
      fireEvent.submit(formEl);
    });
    await flush();
    const heading = within(registration).getByRole('heading', { level: 3, name: 'Pesan siap dikirim' });
    expect(heading).toHaveFocus();
    const message = registration.querySelector('pre')!.textContent!;
    expect(message).toBe(
      [
        'Halo RS MediCare General, saya ingin mendaftar berobat rawat jalan.',
        '',
        'Poli: Poli Anak',
        'Dokter: dr. Galih Santoso, Sp.A',
        'Nama pasien: Sri Lestari',
        'Tanggal lahir: 12 Maret 1958',
        'No. HP: 0812 3456 7000',
        'Jenis pasien: Asuransi (Bentara Proteksi)',
        'Rencana kunjungan: Senin, 2 November 2026, sesi pagi',
        'Keluhan: Batuk pilek',
      ].join('\n'),
    );
    const wa = within(registration).getByRole('link', { name: 'Buka WhatsApp' });
    expect(decodeURIComponent(wa.getAttribute('href')!)).toBe(`https://wa.me/6281234567890?text=${message}`);
    fireEvent.click(within(registration).getByRole('button', { name: 'Ubah data' }));
    const again = within(registration).getByRole('form');
    expect((within(again).getByLabelText('Poli tujuan') as HTMLSelectElement).value).toBe('Poli Anak');
  });

  it('tanpa WhatsApp → tautan email; tanpa WhatsApp & email → salin pesan (tetap tanpa mengirim apa pun)', async () => {
    const fill = async (formEl: HTMLElement) => {
      fireEvent.change(within(formEl).getByLabelText('Poli tujuan'), { target: { value: 'Poli Umum' } });
      fireEvent.click(within(formEl).getByRole('button', { name: 'Lanjut' }));
      fireEvent.change(within(formEl).getByLabelText('Nama pasien'), { target: { value: 'Rina' } });
      fireEvent.change(within(formEl).getByLabelText('Tanggal lahir'), { target: { value: '1990-01-01' } });
      fireEvent.change(within(formEl).getByLabelText('Nomor HP / WhatsApp'), { target: { value: '081234567000' } });
      fireEvent.click(within(formEl).getByRole('radio', { name: 'BPJS' }));
      fireEvent.click(within(formEl).getByRole('button', { name: 'Lanjut' }));
      fireEvent.change(within(formEl).getByLabelText('Tanggal kunjungan'), { target: { value: '2099-01-05' } });
      fireEvent.click(within(formEl).getByRole('radio', { name: 'Sore' }));
      act(() => {
        fireEvent.submit(formEl);
      });
      await flush();
    };
    const container = demo({ contact: { whatsapp: '' } });
    const registration = section(container, 'registration');
    const formEl = within(registration).getByRole('form');
    await fill(formEl);
    expect(within(registration).getByRole('link', { name: 'Kirim lewat email' }).getAttribute('href')).toMatch(
      /^mailto:informasi@medicaregeneral\.test\?subject=Pendaftaran%20berobat&body=Halo%20RS%20MediCare%20General/,
    );
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    cleanup();
    const bare = section(demo({ contact: { whatsapp: '', email: '' } }), 'registration');
    const bareForm = within(bare).getByRole('form');
    fireEvent.change(within(bareForm).getByLabelText('Poli tujuan'), { target: { value: 'Poli Umum' } });
    fireEvent.click(within(bareForm).getByRole('button', { name: 'Lanjut' }));
    fireEvent.change(within(bareForm).getByLabelText('Nama pasien'), { target: { value: 'Rina' } });
    fireEvent.change(within(bareForm).getByLabelText('Tanggal lahir'), { target: { value: '1990-01-01' } });
    fireEvent.change(within(bareForm).getByLabelText('Nomor HP / WhatsApp'), { target: { value: '081234567000' } });
    fireEvent.click(within(bareForm).getByRole('radio', { name: 'Umum' }));
    fireEvent.click(within(bareForm).getByRole('button', { name: 'Lanjut' }));
    expect(within(bareForm).getByRole('button', { name: 'Susun pesan' })).toHaveAttribute('type', 'submit');
    fireEvent.change(within(bareForm).getByLabelText('Tanggal kunjungan'), { target: { value: '2099-01-05' } });
    fireEvent.click(within(bareForm).getByRole('radio', { name: 'Siang' }));
    act(() => {
      fireEvent.submit(bareForm);
    });
    await flush();
    expect(within(bare).getByRole('button', { name: 'Salin pesan' })).toHaveAttribute('type', 'button');
  });

  it('tab rawat inap & asuransi: role tab/tabpanel, aria-selected, panah/Home/End, panel berganti', () => {
    const container = demo();
    const inpatient = section(container, 'inpatient');
    const rooms = within(inpatient).getByRole('tablist', { name: 'Kelas kamar' });
    const tabs = within(rooms).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['VVIP', 'VIP', 'Kelas 1', 'Kelas 2', 'Kelas 3']);
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false', 'false', 'false']);
    expect(tabs.map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1', '-1', '-1']);
    const panel = () => within(inpatient).getByRole('tabpanel');
    expect(panel()).toHaveAttribute('aria-labelledby', tabs[0].id);
    expect(tabs[0]).toHaveAttribute('aria-controls', panel().id);
    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    expect(within(rooms).getAllByRole('tab')[1]).toHaveAttribute('aria-selected', 'true');
    expect(within(rooms).getAllByRole('tab')[1]).toHaveFocus();
    fireEvent.keyDown(within(rooms).getAllByRole('tab')[1], { key: 'End' });
    expect(within(panel()).getByRole('heading', { level: 3 }).textContent).toBe('Kelas 3');
    expect(panel().textContent).toContain('6 pasien per kamar');
    expect(within(panel()).getByRole('list', { name: 'Fasilitas kamar Kelas 3' }).querySelectorAll('li')).toHaveLength(3);
    expect(panel().querySelector('img')!.getAttribute('src')).toBe('/assets/templates/photos/medicare-general-kamar-kelas-3-1200.webp');
    fireEvent.keyDown(within(rooms).getAllByRole('tab')[4], { key: 'ArrowRight' });
    expect(within(rooms).getAllByRole('tab')[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(within(rooms).getByRole('tab', { name: 'Kelas 1' }));
    expect(within(panel()).getByRole('heading', { level: 3 }).textContent).toBe('Kelas 1');
    expect(inpatient.textContent).toContain('Setiap hari 11.00–13.00 dan 17.00–20.00');
    expect(within(inpatient).getByRole('list', { name: 'Aturan besuk' }).querySelectorAll('li')).toHaveLength(3);

    const insurance = section(container, 'insurance');
    const kinds = within(insurance).getByRole('tablist', { name: 'Jenis pasien' });
    expect(within(kinds).getAllByRole('tab').map((t) => t.textContent)).toEqual(['Pasien BPJS', 'Asuransi & perusahaan', 'Pasien umum']);
    const insPanel = () => within(insurance).getByRole('tabpanel');
    expect(Array.from(insPanel().querySelectorAll('h3')).map((h) => h.textContent)).toEqual(['Bawa surat rujukan', 'Daftar di loket BPJS', 'Periksa di poli']);
    expect(insPanel().textContent).toContain('Layanan pasien BPJS mengikuti ketentuan BPJS Kesehatan yang berlaku.');
    fireEvent.keyDown(within(kinds).getAllByRole('tab')[0], { key: 'ArrowLeft' });
    expect(within(kinds).getByRole('tab', { name: 'Pasien umum' })).toHaveAttribute('aria-selected', 'true');
    expect(Array.from(insPanel().querySelectorAll('h3')).map((h) => h.textContent)).toEqual(['Daftar', 'Periksa di poli', 'Bayar di kasir']);
    fireEvent.keyDown(within(kinds).getByRole('tab', { name: 'Pasien umum' }), { key: 'Home' });
    fireEvent.click(within(kinds).getByRole('tab', { name: 'Asuransi & perusahaan' }));
    const insurers = within(insPanel()).getByRole('list', { name: 'Daftar penjamin' });
    expect(insurers.querySelectorAll('li')).toHaveLength(8);
    expect(insPanel().textContent).toContain('Contoh penjamin di demo ini (fiktif).');
    expect(insurance.querySelector('img')).toBeNull();
    expect(within(insurance).getByRole('link', { name: /Tanya bagian admisi lewat WhatsApp/ }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/6281234567890\?text=/);
  });

  it('akordeon tanya jawab: aria-expanded/aria-controls, panel role=region (tertutup inert), satu terbuka, tautan WhatsApp', () => {
    const faq = section(demo(), 'faq');
    const buttons = within(faq).getAllByRole('button');
    expect(buttons).toHaveLength(6);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'true');
    expect(buttons[0].closest('h3')).not.toBeNull();
    const region = (b: HTMLElement) => document.getElementById(b.getAttribute('aria-controls')!)!;
    expect(region(buttons[0])).toHaveAttribute('role', 'region');
    expect(region(buttons[0])).toHaveAttribute('data-open', 'true');
    expect(region(buttons[1]).hasAttribute('inert')).toBe(true);
    fireEvent.click(buttons[3]);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'false');
    expect(buttons[3]).toHaveAttribute('aria-expanded', 'true');
    expect(region(buttons[0])).toHaveAttribute('data-open', 'false');
    fireEvent.click(buttons[3]);
    expect(buttons.every((b) => b.getAttribute('aria-expanded') === 'false')).toBe(true);
    expect(within(faq).getByRole('link', { name: /Tanya lewat WhatsApp/ }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/6281234567890\?text=/);
    cleanup();
    const noWa = section(demo({ contact: { whatsapp: '' } }), 'faq');
    expect(within(noWa).queryByRole('link', { name: /Tanya lewat WhatsApp/ })).toBeNull();
  });

  it('pita IGD merah (inverse): garis EKG dekoratif, nomor besar & tombol tel:, catatan 119, langkah bernomor', () => {
    const container = demo();
    const emergency = section(container, 'emergency');
    expect(emergency.getAttribute('data-tpl-tone')).toBe('inverse');
    expect(emergency.className).toContain('bg-[#B71C1C]');
    expect(Array.from(container.querySelectorAll('[data-tpl-tone="inverse"]')).map((el) => el.getAttribute('data-tpl-section'))).toEqual(['emergency', 'footer']);
    const paths = emergency.querySelectorAll('.mc-ecg-path');
    expect(paths).toHaveLength(2);
    for (const path of paths) {
      expect(path.getAttribute('pathLength')).toBe('1');
      expect(path.closest('[aria-hidden="true"]')).not.toBeNull();
    }
    expect(emergency.querySelectorAll('.mc-ecg-dot')).toHaveLength(2);
    const big = within(emergency).getByRole('link', { name: 'Telepon IGD: 0812-3456-7891' });
    expect(big).toHaveAttribute('href', IGD);
    // Nomor besar tidak terpotong di tengah (ukurannya dibatasi lebar wadah di CSS)
    expect(big.className).toContain('whitespace-nowrap');
    expect(big.className).toContain('mc-t-phone');
    expect(within(emergency).getByRole('link', { name: 'Telepon IGD' })).toHaveAttribute('href', IGD);
    expect(within(emergency).getByRole('link', { name: 'Ambulans: 0812-3456-7892' })).toHaveAttribute('href', AMBULANCE);
    expect(emergency.textContent).toContain('Nomor darurat nasional: 119.');
    expect(Array.from(emergency.querySelectorAll('ol h3')).map((h) => h.textContent)).toEqual(['Telepon IGD', 'Datang langsung', 'Bawa identitas', 'Tanpa daftar online']);
  });

  it('kontak: kartu darurat (IGD, ambulans, 119), informasi, peta; footer biru tua dengan menu, IGD, media sosial, catatan fiktif', () => {
    const container = demo();
    const contact = section(container, 'contact');
    const urgent = within(contact).getByRole('heading', { level: 3, name: 'Kontak darurat' }).parentElement!;
    expect(Array.from(urgent.querySelectorAll('a')).map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['0812-3456-7891', IGD],
      ['0812-3456-7892', AMBULANCE],
      ['119', 'tel:119'],
    ]);
    expect(urgent.className).toContain('border-[#B71C1C]');
    const info = within(contact).getByRole('heading', { level: 3, name: 'Informasi & pendaftaran' }).parentElement!;
    expect(Array.from(info.querySelectorAll('dt')).map((dt) => dt.textContent)).toEqual(['Telepon', 'WhatsApp', 'Email', 'Alamat', 'Jam layanan']);
    expect(Array.from(info.querySelectorAll('a')).map((a) => a.getAttribute('href'))).toEqual([
      INFO,
      expect.stringMatching(/^https:\/\/wa\.me\/6281234567890\?text=/),
      'mailto:informasi@medicaregeneral.test',
    ]);
    expect(contact.querySelector('iframe')!.getAttribute('title')).toBe('Peta lokasi RS MediCare General');
    expect(within(contact).getByRole('link', { name: /Buka di Google Maps/ }).getAttribute('href')).toMatch(/^https:\/\/www\.google\.com\/maps\/search\//);
    // Semua tautan telepon di halaman: nomor demo RS + 119 (sekali, di kartu darurat)
    const tels = Array.from(container.querySelectorAll('a[href^="tel:"]')).map((a) => a.getAttribute('href'));
    for (const href of tels) expect([IGD, AMBULANCE, INFO, 'tel:119'], href!).toContain(href);
    expect(tels.filter((h) => h === 'tel:119')).toHaveLength(1);
    // Nama tautan unik: "Chat WhatsApp" hanya tombol melayang Shell
    expect(within(container).getAllByRole('link', { name: 'Chat WhatsApp' })).toHaveLength(1);
    const footer = container.querySelector('footer')!;
    expect(footer.getAttribute('data-tpl-section')).toBe('footer');
    expect(footer.className).toContain('bg-(--mc-deep)');
    expect(footer.textContent).toContain(`© ${new Date().getFullYear()} RS MediCare General`);
    expect(footer.textContent).toContain('RS MediCare General adalah nama contoh (fiktif).');
    expect(Array.from(within(footer).getByRole('navigation', { name: 'Tautan footer' }).querySelectorAll('a')).map((a) => a.getAttribute('href'))).toEqual([
      '#layanan',
      '#doctors',
      '#clinics',
      '#inpatient',
      '#insurance',
      '#kontak',
    ]);
    const badge = Array.from(footer.querySelectorAll('span')).find((s) => s.textContent === 'IGD 24 jam')!;
    expect(badge.className).toContain('bg-[#B71C1C]');
    expect(badge.parentElement!.querySelector('a')).toHaveAttribute('href', IGD);
    expect(within(footer).getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://instagram.com/medicaregeneral.contoh');
    expect(within(footer).getByRole('link', { name: 'Facebook' })).toHaveAttribute('href', 'https://facebook.com/medicaregeneral.contoh');
    expect(within(footer).getByRole('link', { name: 'YouTube' })).toHaveAttribute('href', 'https://youtube.com/@medicaregeneral.contoh');
    expect(within(footer).queryByRole('link', { name: 'LinkedIn' })).toBeNull();
    expect(within(footer).queryByRole('link', { name: 'TikTok' })).toBeNull();
  });

  it('target sentuh ≥ 48px: tombol radius 10px tinggi 52px, tautan teks/telepon min-h-12', () => {
    const container = demo();
    for (const a of section(container, 'hero').querySelectorAll('a')) expect(a.className, a.textContent ?? '').toMatch(/min-h-(\[52px\]|12|20|24)/);
    for (const a of section(container, 'contact').querySelectorAll('a')) expect(a.className, a.textContent ?? '').toContain('min-h-12');
    for (const a of container.querySelectorAll('footer a')) expect(a.className, a.textContent ?? '').toContain('min-h-12');
    for (const b of container.querySelectorAll('[data-tpl-root] main button')) expect(b.className, b.textContent ?? '').toMatch(/min-h-(\[52px\]|12|14|16)|h-12|h-10/);
  });

  it('datar: tidak ada kelas shadow di template (kecuali tombol melayang Shell); kode tanpa fetch/router', () => {
    const container = demo();
    const shadows = Array.from(container.querySelectorAll('[class*="shadow"]')).filter(
      (el) => !el.closest('[aria-label="Chat WhatsApp"]') && !/Chat WhatsApp|Kembali ke atas/.test(el.getAttribute('aria-label') ?? ''),
    );
    expect(shadows.map((el) => el.className)).toEqual([]);
    const tsx = ['MediCareGeneral', 'Header', 'Hero', 'Services', 'Registration', 'Doctors', 'Clinics', 'Emergency', 'Inpatient', 'Insurance', 'Faq', 'Contact', 'Footer', 'ui', 'marks'];
    const ts = ['index', 'styles', 'model', 'icons', 'hooks', 'schema', 'defaultContent', 'photos'];
    const files = [...tsx.map((f) => `${f}.tsx`), ...ts.map((f) => `${f}.ts`), 'medicare-general.css'];
    const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const file of files) {
      const source = readFileSync(resolve(ROOT, `${DIR}/${file}`), 'utf8');
      expect(source, file).not.toMatch(/\bshadow-|box-shadow|text-shadow|drop-shadow/);
      const code = strip(source);
      expect(code, file).not.toMatch(/framer-motion|useLocation|useParams|sessionStorage|fetch\(|XMLHttpRequest|sendBeacon|<form[^>]*action=/);
      // localStorage hanya untuk ukuran teks (hooks.ts), di dalam try/catch
      if (file !== 'hooks.ts') expect(code, file).not.toMatch(/localStorage/);
      // Tidak mengimpor folder template lain
      expect(code, file).not.toMatch(/from '\.\.\/(?!shared\/|kit\/|types)[a-z-]+\//);
    }
    const hooks = strip(readFileSync(resolve(ROOT, `${DIR}/hooks.ts`), 'utf8'));
    expect(hooks.match(/localStorage\.(getItem|setItem)/g)).toHaveLength(2);
    expect(hooks.match(/try \{\s*(const raw = )?window\.localStorage/g)).toHaveLength(2);
  });
});

describe('MediCare General: gerak', () => {
  it('pratinjau CMS diam dan tanpa tautan wa.me terbuka', () => {
    const { container } = render(<def.Component content={resolveContent(def, null)} preview />);
    expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'off');
    expect(container.querySelector('[data-mc-play]')).toBeNull();
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    expect(container.querySelector('a[href^="javascript:"], a[href^="vbscript:"]')).toBeNull();
  });

  it("medicare-general.css: animasi bergerbang [data-tpl-motion='on'], blok prefers-reduced-motion, kelas mc-, keadaan diam = garis utuh", () => {
    const css = readFileSync(resolve(ROOT, `${DIR}/medicare-general.css`), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).toContain('@layer components');
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(css).toMatch(/@media print/);
    for (const name of ['mc-draw', 'mc-fade', 'mc-slide', 'mc-rise']) expect(css).toMatch(new RegExp(`@keyframes ${name}`));
    expect(css).toMatch(/\.mc-ecg-path\s*\{\s*stroke-dasharray: 1;\s*stroke-dashoffset: 0;/);
    for (const rule of css.match(/^\s*[^@\s{}][^{}]*\{[^}]*\b(transition|animation):[^}]*\}/gm) ?? []) {
      const selector = rule.split('{')[0];
      if (/transition:\s*none|animation:\s*none/.test(rule)) continue;
      expect(selector, rule).toContain("[data-tpl-motion='on']");
    }
    // Keadaan tersembunyi (opacity 0 / dashoffset 1) hanya untuk elemen yang menunggu masuk layar
    for (const rule of css.match(/^\s*[^@\s{}][^{}]*\{[^}]*(opacity: 0|stroke-dashoffset: 1)[^}]*\}/gm) ?? []) {
      if (/^\s*(from|to|\d+%)\s*$/.test(rule.split('{')[0])) continue;
      expect(rule.split('{')[0], rule).toMatch(/\[data-tpl-motion='on'\] \[data-mc-play='pending'\]/);
    }
    for (const cls of css.match(/\.[a-z][\w-]*/g) ?? []) if (!/^\.(tpl-)/.test(cls)) expect(cls, cls).toMatch(/^\.mc-/);
    // Durasi: garis ≤ 1,6 dtk, transisi UI ≤ 1 dtk, sekali jalan; tidak ada yang menyasar gambar (foto hero = LCP)
    for (const [, seconds] of css.matchAll(/animation:\s*mc-[a-z]+\s+([\d.]+)s/g)) expect(Number(seconds)).toBeLessThanOrEqual(1.6);
    for (const [, seconds] of css.matchAll(/transition:\s*[a-z-]+\s+([\d.]+)s/g)) expect(Number(seconds)).toBeLessThanOrEqual(1);
    expect(css).not.toMatch(/infinite|\bimg\b|alternate/);
  });
});

describe('MediCare General: warna tema bisa diganti', () => {
  it('biru bawaan → --tpl-accent; warna CMS mengalir ke footer; merah IGD tetap; teks di atas aksen kuning = tinta', () => {
    const base = demo();
    expect(rootStyle(base, '--tpl-accent')).toBe('#0b63c9');
    expect(rootStyle(base, '--mc-deep')).toBe('#0a50a5');
    expect(rootStyle(base, '--mc-bright')).toBe('#afcced');
    cleanup();
    const violet = demo({ brand: { accent_color: '#7C3AED' } });
    expect(rootStyle(violet, '--tpl-accent')).toBe('#7c3aed');
    for (const name of ['--mc-deep', '--mc-bright']) expect(rootStyle(violet, name), name).toBe((medicareVars('#7C3AED') as Record<string, string>)[name]);
    // Merah darurat tidak ikut warna tema
    expect(section(violet, 'emergency').className).toContain('bg-[#B71C1C]');
    expect(violet.querySelector('header .bg-\\[\\#B71C1C\\]')).not.toBeNull();
    cleanup();
    expect(rootStyle(demo({ brand: { accent_color: '#FACC15' } }), '--tpl-on-accent')).toBe('#121620');
  });
});

describe('MediCare General: SEO situs pembeli, judul, gambar, tautan', () => {
  it('judul tab & meta description dari nama, tagline, dan deskripsi hero; theme-color = aksen', () => {
    expect(siteTitle(CODE, null)).toBe('RS MediCare General — Rumah Sakit Umum di Semarang');
    expect(siteTitle(CODE, null).length).toBeLessThanOrEqual(60);
    const restore = applySiteHead(CODE, null);
    const description = document.head.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
    expect(description).toMatch(/^Rumah sakit umum di Semarang dengan 12 poliklinik, IGD 24 jam, dan rawat inap\./);
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(200);
    expect(document.head.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#0B63C9');
    restore();
  });

  it('satu H1, tiap section diawali tepat satu H2, H3 hanya di bawah H2, tanpa h4–h6; judul kosong → H2 tersembunyi', () => {
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
    const bare = demo(Object.fromEntries(ORDER.filter((k) => k !== 'hero').map((k) => [k, { title: '', eyebrow: '', subtitle: '' }])));
    check(bare);
    expect(ORDER.filter((k) => k !== 'hero').map((k) => section(bare, k).querySelector('h2')?.textContent)).toEqual([
      'Layanan',
      'Pendaftaran online',
      'Jadwal dokter',
      'Poliklinik',
      'IGD 24 jam',
      'Rawat inap',
      'Asuransi & BPJS',
      'Tanya jawab',
      'Kontak',
    ]);
    expect(section(bare, 'services').querySelector('h2')).toHaveClass('sr-only');
    expect(section(bare, 'emergency').querySelector('h2')).toHaveClass('sr-only');
  });

  it('gambar: alt deskriptif, width/height, srcset & sizes, lazy kecuali hero', () => {
    const container = demo();
    const imgs = Array.from(container.querySelectorAll('img'));
    expect(imgs.length).toBeGreaterThanOrEqual(8);
    for (const img of imgs) {
      const src = img.getAttribute('src') ?? '';
      expect(src, src).toMatch(/^\/assets\/templates\/photos\/medicare-general-[a-z0-9-]+\.webp$/);
      expect(Number(img.getAttribute('width')), src).toBeGreaterThan(0);
      expect(Number(img.getAttribute('height')), src).toBeGreaterThan(0);
      expect(img.getAttribute('srcset'), src).toMatch(/ 800w, /);
      expect(img.getAttribute('sizes'), src).toBeTruthy();
      expect(img.getAttribute('alt')!.split(' ').length, src).toBeGreaterThanOrEqual(5);
      if (img.getAttribute('fetchpriority') !== 'high') expect(img.getAttribute('loading'), src).toBe('lazy');
    }
  });

  it('tautan asli untuk navigasi, tombol hanya untuk aksi (kecuali kirim formulir); SVG dekoratif tersembunyi', () => {
    const container = demo();
    for (const a of container.querySelectorAll('a')) expect(a.getAttribute('href'), a.textContent ?? '').toMatch(/^(#[a-z]|https:\/\/|mailto:|tel:)/);
    for (const button of container.querySelectorAll('button')) {
      expect(button.getAttribute('type'), button.textContent ?? '').toBe(button.closest('form') && /Susun pesan/.test(button.textContent ?? '') ? 'submit' : 'button');
    }
    for (const svg of container.querySelectorAll('svg')) expect(svg.closest('[aria-hidden="true"], [aria-hidden=""]') ?? svg.getAttribute('aria-hidden'), svg.outerHTML.slice(0, 60)).toBeTruthy();
  });
});

describe('MediCare General: konten opsional kosong', () => {
  it('hero: tanpa ubin & IGD → tanpa daftar ubin; 1 ubin + IGD → 2 kolom; tanpa label tombol → tanpa tombol', () => {
    const none = section(demo({ hero: { tiles: [], igd_title: '' }, contact: { igd_phone: '' } }), 'hero');
    expect(within(none).queryByRole('list', { name: 'Akses cepat' })).toBeNull();
    expect(none.querySelector('img[fetchpriority="high"]')).not.toBeNull();
    cleanup();
    const two = section(demo({ hero: { tiles: [{ title: 'Daftar Online', text: '' }], primary_label: '', secondary_label: '' } }), 'hero');
    const tiles = within(two).getByRole('list', { name: 'Akses cepat' });
    expect(tiles.querySelectorAll(':scope > li')).toHaveLength(2);
    expect(tiles.className).toContain('@3xl:grid-cols-2');
    expect(within(tiles).getByRole('link', { name: 'Daftar Online' })).toHaveAttribute('href', '#registration');
    expect(within(two).queryByRole('link', { name: /Cari Poliklinik|Info BPJS/ })).toBeNull();
    // IGD tanpa nomor tetapi berjudul → kotak merah tanpa tautan
    cleanup();
    const noTel = section(demo({ contact: { igd_phone: '' } }), 'hero');
    const igdBox = Array.from(noTel.querySelectorAll('.mc-tile')).find((el) => el.textContent?.startsWith('IGD 24 Jam'))!;
    expect(igdBox.tagName).toBe('DIV');
    expect(noTel.querySelector('a[href^="tel:"]')).toBeNull();
  });

  it('pendaftaran, IGD, penunjang, rawat inap, asuransi, kontak tanpa foto/isian opsional → tata letak menyesuaikan', () => {
    const container = demo({
      registration: { image: '', prepare: [], prepare_title: '', emergency_note: '' },
      emergency: { image: '', steps: [] },
      clinics: { support: [{ title: 'Laboratorium', text: 'Cek darah.', hours: '', image: '' }], stats: [] },
      inpatient: { items: [{ name: 'VIP', capacity: '', facilities: 'AC, TV', image: '' }], visiting_hours: '', visiting_rules: [] },
      insurance: { insurers: [], insurers_intro: '', general_steps: [] },
      contact: { image: '', maps_query: '', address: '', ambulance_phone: '' },
      footer: { instagram: '', facebook: '', youtube: '' },
      doctors: { items: (def.defaultContent.doctors.items as ListItem[]).slice(0, 5) },
    });
    const registration = section(container, 'registration');
    expect(registration.querySelector('img')).toBeNull();
    expect(registration.textContent).not.toContain('Siapkan sebelum datang');
    // Catatan darurat kosong tetap menampilkan tautan Telepon IGD
    expect(within(registration).getByRole('link', { name: 'Telepon IGD 0812-3456-7891' })).toBeInTheDocument();
    const emergency = section(container, 'emergency');
    expect(emergency.querySelector('img, ol')).toBeNull();
    expect(emergency.innerHTML).toContain('@5xl:col-span-9');
    expect(within(emergency).queryByRole('link', { name: /^Ambulans/ })).toBeNull();
    const clinics = section(container, 'clinics');
    expect(clinics.querySelector('img, dl')).toBeNull();
    expect(clinics.querySelectorAll('ul')[1].querySelector('svg')).not.toBeNull();
    const inpatient = section(container, 'inpatient');
    expect(within(inpatient).queryByRole('tablist')).toBeNull();
    expect(within(inpatient).queryByRole('tabpanel')).toBeNull();
    expect(inpatient.querySelector('h3')!.textContent).toBe('VIP');
    expect(inpatient.innerHTML).toContain('@5xl:col-span-12');
    expect(inpatient.textContent).not.toContain('Jam besuk');
    const insurance = section(container, 'insurance');
    expect(within(insurance).queryByRole('tablist')).toBeNull();
    expect(insurance.querySelectorAll('ol h3')).toHaveLength(3);
    const contact = section(container, 'contact');
    expect(contact.querySelector('img, iframe')).toBeNull();
    expect(contact.innerHTML).toContain('@5xl:col-span-8');
    expect(Array.from(contact.querySelectorAll('a[href^="tel:"]')).map((a) => a.getAttribute('href'))).toEqual([IGD, 'tel:119', INFO]);
    const doctors = section(container, 'doctors');
    expect(doctors.querySelectorAll('tbody tr')).toHaveLength(5);
    expect(within(doctors).queryByRole('button', { name: /Tampilkan semua jadwal/ })).toBeNull();
    expect(container.querySelector('footer')!.textContent).not.toContain('Media sosial');
    cleanup();
    const hidden = demo({ faq: { enabled: false }, footer: { enabled: false }, inpatient: { items: [] } });
    expect(sectionKeys(hidden)).not.toContain('faq');
    expect(sectionKeys(hidden)).not.toContain('inpatient');
    expect(hidden.querySelector('footer')).toBeNull();
    expect(Array.from(hidden.querySelector('header nav')!.querySelectorAll('a')).map((a) => a.getAttribute('href'))).not.toContain('#inpatient');
  });
});

describe('MediCare General: editor CMS', () => {
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
        // "Langkah" dipakai dua list asuransi (BPJS & umum) → dua tombol "Tambah Langkah"
        expect(box.getAllByRole('button', { name: new RegExp(`Tambah ${f.itemLabel}`, 'i') }).length).toBeGreaterThan(0);
        // Buka butir 1 list INI (bukan list sebelumnya yang memakai label butir yang sama)
        const index = s.fields.filter((x) => isListField(x) && x.itemLabel === f.itemLabel).indexOf(f);
        fireEvent.click(box.getAllByRole('button', { name: new RegExp(`^${f.itemLabel} 1(?![0-9])`) })[index]);
        for (const sub of f.fields) expect(container.textContent, `${s.key}.${f.key}.${sub.key}`).toContain(sub.label);
      }
      unmount();
    }
  }, 60_000);
});

describe('MediCare General: data katalog', () => {
  const MIGRATION = 'database/migrations/2026-10-28_044_medicare_general_template.sql';
  const raw = () => readFileSync(resolve(ROOT, MIGRATION), 'utf8');

  it('migrasi 044: baris medicare-general dengan kategori baru, harga, pratinjau, galeri, fitur, dan salinan jujur', () => {
    const text = raw();
    expect(text).toContain("'medicare-general'");
    expect(text).toContain("'Kesehatan & Rumah Sakit'");
    expect(text).toContain('1890000.00');
    expect(text).toContain("'/assets/templates/medicare-general-preview.webp'");
    expect(text).toContain('\'["/assets/templates/medicare-general-1.webp","/assets/templates/medicare-general-2.webp"]\'');
    expect(text).toMatch(/data pasien tidak disimpan di website/);
    expect(text).toMatch(/Tidak ada rekam medis, antrean otomatis, pembayaran online, atau konsultasi video/);
    expect(text).toContain('"Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)"]\'');
    expect(text).not.toMatch(/termasuk domain|domain, hosting|terakreditasi|\bKARS\b|terbaik|dijamin/i);
    // Fitur: 6-8 butir pendek
    const features = JSON.parse(/features\s+= '(\[.*\])',/.exec(text)![1]) as string[];
    expect(features.length).toBeGreaterThanOrEqual(6);
    expect(features.length).toBeLessThanOrEqual(8);
    // Halaman katalog (.content.ts) jujur juga
    const page = readFileSync(resolve(ROOT, 'src/content/templates/medicare-general.content.ts'), 'utf8');
    expect(page).toMatch(/fiktif/);
    expect(page).toMatch(/data pasien tidak disimpan di website/);
    expect(page).not.toMatch(/terakreditasi|\bKARS\b|dokter terbaik|dijamin|1\.890\.000/);
  });

  it('migrasi 044 aman diulang (INSERT IGNORE + UPDATE berdasarkan slug, tanpa DELETE) dan tercatat di schema_migrations', () => {
    const header = raw();
    expect(header).toMatch(/Domain\s+(--\s+)?tidak termasuk\s+(--\s+)?harga template/);
    expect(header).toMatch(/FIKTIF/);
    expect(header).toMatch(/kategori baru/);
    expect(header).toMatch(/SETELAH kode/);
    const text = header.replace(/^--.*$/gm, '');
    expect(text).toMatch(/INSERT IGNORE INTO templates/);
    expect(text).toMatch(/WHERE slug = 'medicare-general';/);
    expect(text).toMatch(/sort_order\s+= 27/);
    expect(text).toMatch(/status\s+= 'published'/);
    expect(text).not.toMatch(/\bDELETE\b|\bDROP\b|\bTRUNCATE\b/);
    expect(text).toContain("VALUES ('2026-10-28_044', 'templates: katalog MediCare General')");
  });

  it('gambar pratinjau katalog ada di public/, 1600×1000, VP8/VP8X, dan ringan', () => {
    for (const name of ['medicare-general-preview', 'medicare-general-1', 'medicare-general-2']) {
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

describe('MediCare General: konten aneh', () => {
  it('angka, null, dan string di tempat list tidak membuat crash; tautan berbahaya dibuang', () => {
    const weird = {
      hero: { image: 'javascript:alert(1)', highlight: 'tidak ada di judul', primary_url: 'javascript:alert(1)', tiles: 'x', igd_title: 7 },
      services: { items: [{ title: 2 }, { title: 'Gudang', url: 'javascript:alert(1)' }, null] },
      registration: { prepare: 'x', image: 'javascript:alert(1)' },
      doctors: { items: [null, { name: 3 }, { name: 'dr. Uji', poli: 5, days: null, hours: {} }] },
      clinics: { items: 'x', stats: [{ value: 5 }, null], support: [{ title: 'Lab', image: 'javascript:alert(1)' }] },
      emergency: { steps: 9, image: 'vbscript:x' },
      inpatient: { items: [{ name: 'VIP', facilities: 42, image: 'javascript:alert(1)' }], visiting_rules: 'x' },
      insurance: { insurers: [{ name: 1 }], bpjs_steps: null, link_url: 'vbscript:x' },
      faq: { items: [{ question: null, answer: 2 }, 'x'], link_url: 'vbscript:x' },
      contact: { whatsapp: 'abc', igd_phone: 'x', maps_url: 'javascript:alert(1)', email: 'bukan' },
      footer: { instagram: 'javascript:alert(1)' },
      brand: { accent_color: 'oranye' },
    } as unknown as SiteContent;
    const { container } = render(<def.Component content={resolveContent(def, weird)} />);
    expect(container.querySelector('a[href^="javascript:"], a[href^="vbscript:"]')).toBeNull();
    expect(container.querySelector('img[src^="javascript:"], img[src^="vbscript:"]')).toBeNull();
    expect(container.querySelector('h1')!.textContent).toBe('Berobat lebih tenang, dari daftar sampai pulang');
    expect(section(container, 'doctors').textContent).toContain('dr. Uji');
    expect(section(container, 'inpatient').textContent).toContain('VIP');
    expect(sectionKeys(container)).not.toContain('faq');
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
