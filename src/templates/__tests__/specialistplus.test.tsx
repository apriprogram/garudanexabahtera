// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/specialistplus.test.tsx
// SpecialistPlus (pusat klinik spesialis & laboratorium 2026-10-28): skema CMS & konten demo, foto, helper model (warna
// tema navy/teal terang, menu, kode label "SPX-02", tujuan tautan, hari praktik, pesan WhatsApp daftar dokter & pesan
// paket MCU, matriks MCU, batang waktu hasil, spesifikasi alat, formulir permintaan hasil lab), demo (urutan section,
// hero konsol + tab spesialis tersinkron, header + menu HP, tabel jadwal & MCU, formulir hasil lab, akordeon), datar
// tanpa bayangan, gerak (pratinjau CMS diam, CSS spx- bergerbang data-tpl-motion), warna tema, SEO situs pembeli, judul
// & gambar & tautan, konten opsional kosong, editor CMS, data katalog (migrasi 046 + pratinjau), dan konten aneh.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionEditor } from '../../pages/account/cms/SectionEditor';
import { validateContent } from '../../pages/account/cms/validation';
import { TEMPLATES, resolveContent } from '../index';
import { iconKey } from '../specialistplus/icons';
import {
  EMPTY_LAB,
  PAGE_SECTIONS,
  accentIsDark,
  cleanText,
  compactDays,
  dayIndexes,
  displayPhone,
  doctorInitials,
  formatBirth,
  includedCount,
  labMessage,
  labelCode,
  mailWith,
  mcuMatrix,
  mcuMessage,
  navItems,
  readSpecialistPlus,
  registerMessage,
  sectionShown,
  sectionTarget,
  specRows,
  splitTags,
  spxVars,
  toNumber,
  todayIso,
  turnaroundGroups,
  validateLab,
  type LabForm,
} from '../specialistplus/model';
import { SPECIALISTPLUS_PHOTOS } from '../specialistplus/photos';
import { applySiteHead, siteTitle } from '../siteHead';
import { SiteRenderer } from '../SiteRenderer';
import { contrast, parseHex } from '../shared/utils';
import { isListField, type ListItem, type SiteContent } from '../types';

// Demo panjang + getByRole di jsdom: bisa lewat 5 dtk saat suite berjalan paralel
vi.setConfig({ testTimeout: 30_000 });

const ROOT = process.cwd();
const def = TEMPLATES.specialistplus;
const ORDER = ['hero', 'specialists', 'mcu', 'labresults', 'technology', 'turnaround', 'testimonials', 'faq', 'contact'];
const COMPANY = 'SpecialistPlus Medical Center';
const WA = 'https://wa.me/6281234567890?text=';
const sectionKeys = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-tpl-section]')).map((s) => s.getAttribute('data-tpl-section'));
const section = (root: HTMLElement, key: string) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`)!;
const demo = (content: unknown = null, preview = false) => render(<SiteRenderer templateCode="specialistplus" content={content} preview={preview} />).container;
const rgb = (hex: string) => parseHex(hex)!;
const publicFile = (url: string) => resolve(ROOT, 'public', url.replace(/^\//, ''));
const rootStyle = (container: HTMLElement, name: string) => {
  const holder = Array.from(container.querySelectorAll<HTMLElement>('[style]')).find((el) => el.style.getPropertyValue(name));
  return holder?.style.getPropertyValue(name) ?? '';
};
const urls = (src: string) => {
  const asset = SPECIALISTPLUS_PHOTOS.asset(src)!;
  return [asset.src, ...asset.srcSet!.split(',').map((part) => part.trim().split(' ')[0])].filter((u, i, all) => all.indexOf(u) === i);
};
const texts = (els: Iterable<Element>) => Array.from(els, (el) => el.textContent ?? '');
const decoded = (a: Element) => decodeURIComponent(a.getAttribute('href') ?? '');
const lab = (patch: Partial<LabForm> = {}): LabForm => ({ ...EMPTY_LAB, reg: 'LAB-2610-0458', birth: '1980-03-12', name: 'Rina Kartika', ...patch });
const PHOTO_KEYS = [
  'specialistplus-hero',
  'specialistplus-mri',
  'specialistplus-ct-v2',
  'specialistplus-cathlab',
  'specialistplus-mammografi',
  'specialistplus-lab-v2',
  'specialistplus-jantung',
  'specialistplus-ortopedi',
  'specialistplus-onkologi',
  'specialistplus-saraf',
  'specialistplus-paru',
  'specialistplus-dalam',
  'specialistplus-lobi',
];
const SOURCE = {
  tsx: ['SpecialistPlus', 'Header', 'Hero', 'Specialists', 'Mcu', 'LabResults', 'Technology', 'Turnaround', 'Community', 'Contact', 'Footer', 'ui', 'marks'],
  ts: ['index', 'styles', 'model', 'icons', 'hooks', 'schema', 'defaultContent', 'photos'],
};

let scrolled: (string | null)[] = [];
beforeEach(() => {
  scrolled = [];
  Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
    scrolled.push(this.getAttribute('data-tpl-section'));
  });
});
afterEach(cleanup);

describe('SpecialistPlus: skema & konten bawaan', () => {
  it('urutan form = urutan halaman, semua section bisa disembunyikan, field unik, list berbatas', () => {
    expect(def.code).toBe('specialistplus');
    expect(def.name).toBe('SpecialistPlus');
    expect(def.features).toBeUndefined();
    expect(def.sections.map((s) => s.key)).toEqual(['brand', ...ORDER, 'footer']);
    expect([...PAGE_SECTIONS]).toEqual([...ORDER, 'footer']);
    const fields = (key: string) => def.sections.find((s) => s.key === key)!.fields.map((f) => f.key);
    expect(fields('brand')).toEqual(['company_name', 'tagline', 'logo', 'accent_color']);
    expect(def.sections[0].fields.find((f) => f.key === 'accent_color')?.type).toBe('color');
    expect(def.sections[0].toggleable).toBeFalsy();
    expect(fields('hero')).toEqual(
      expect.arrayContaining(['label_code', 'image', 'title', 'highlight', 'subtitle', 'primary_label', 'secondary_label', 'header_label', 'console_title', 'console_note', 'stats']),
    );
    expect(fields('specialists')).toEqual(expect.arrayContaining(['items', 'doctors', 'register_label', 'table_note']));
    expect(fields('mcu')).toEqual(expect.arrayContaining(['packages', 'rows', 'order_label', 'note']));
    expect(fields('labresults')).toEqual(expect.arrayContaining(['steps', 'notice', 'form_title', 'form_button', 'portal_url']));
    expect(fields('contact')).toEqual(
      expect.arrayContaining(['address', 'maps_query', 'maps_url', 'phone', 'email', 'whatsapp', 'whatsapp_message', 'hours', 'units', 'emergency', 'image']),
    );
    expect(fields('footer')).toEqual(expect.arrayContaining(['description', 'disclaimer', 'copyright', 'instagram', 'facebook', 'linkedin', 'youtube', 'tiktok']));
    const contact = def.sections.find((s) => s.key === 'contact')!;
    expect(contact.fields.find((f) => f.key === 'whatsapp')?.type).toBe('phone');
    expect(def.sections.find((s) => s.key === 'labresults')!.fields.find((f) => f.key === 'portal_url')?.type).toBe('url');
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
          max[`${s.key}.${f.key}`] = f.max!;
          for (const sub of f.fields) if (['text', 'textarea'].includes(sub.type)) expect(sub.maxLength, `${s.key}.${f.key}.${sub.key}`).toBeGreaterThan(0);
        } else if (['text', 'textarea', 'phone', 'email'].includes(f.type)) {
          expect(f.maxLength, `${s.key}.${f.key}`).toBeGreaterThan(0);
        }
      }
    }
    // Batas list = batas yang dibaca model (ITEMS, mcuMatrix, list(...)) dan yang disebut di halaman katalog
    expect(max).toEqual({
      'hero.stats': 3,
      'specialists.items': 8,
      'specialists.doctors': 24,
      'mcu.packages': 4,
      'mcu.rows': 16,
      'labresults.steps': 3,
      'technology.items': 6,
      'turnaround.items': 12,
      'testimonials.items': 6,
      'faq.items': 8,
      'contact.units': 6,
    });
  });

  it('konten demo lolos validasi CMS, logo kosong, semua foto terdaftar, ada di public/, dan dipakai', () => {
    const c = def.defaultContent;
    expect(validateContent(def, resolveContent(def, null))).toEqual({});
    expect(c.brand.logo).toBe('');
    expect(c.brand.accent_color).toBe('#0E8F8A');
    expect(c.contact.whatsapp).toBe('081234567890');
    expect(c.contact.phone).toBe('081234567890');
    expect(String(c.contact.email)).toMatch(/\.test$/);
    expect(c.hero.image).toBe('/assets/templates/photos/specialistplus-hero-1920.webp');
    for (const s of def.sections) if (s.key !== 'brand') expect(c[s.key].enabled, s.key).toBe(true);
    const photos = JSON.stringify(c).match(/\/assets\/templates\/photos\/[a-z0-9-]+\.webp/g) ?? [];
    for (const src of photos) expect(SPECIALISTPLUS_PHOTOS.asset(src), src).not.toBeNull();
    expect([...SPECIALISTPLUS_PHOTOS.keys]).toEqual(PHOTO_KEYS);
    for (const key of SPECIALISTPLUS_PHOTOS.keys) {
      for (const url of urls(SPECIALISTPLUS_PHOTOS.src(key))) expect(existsSync(publicFile(url)), url).toBe(true);
      expect(photos, `${key} dipakai di konten demo`).toContain(SPECIALISTPLUS_PHOTOS.src(key));
      expect(SPECIALISTPLUS_PHOTOS.alt(SPECIALISTPLUS_PHOTOS.src(key), '').split(' ').length, key).toBeGreaterThanOrEqual(5);
    }
    // Simbol bawaan juga tersedia sebagai SVG mandiri, path sama dengan komponen
    const mark = readFileSync(publicFile('/assets/templates/logos/specialistplus-mark.svg'), 'utf8');
    const component = readFileSync(resolve(ROOT, 'src/templates/specialistplus/marks.tsx'), 'utf8');
    const paths = mark.match(/ d="[^"]+"/g) ?? [];
    expect(paths).toHaveLength(4);
    for (const d of paths) expect(component, d).toContain(d.trim());
    expect(mark).toMatch(/viewBox="0 0 32 32"/);
    expect(mark).toMatch(/role="img"/);
    expect(mark).toMatch(/aria-label="/);
    expect(mark).toMatch(/<title>/);
    expect(mark).toMatch(/fill="currentColor"/);
    // Judul tab situs pembeli ≤ 60 karakter, deskripsi hero 120–155 karakter, H1 ≤ 9 kata
    expect(`${c.brand.company_name} — ${c.brand.tagline}`.length).toBeLessThanOrEqual(60);
    expect(String(c.hero.subtitle).length).toBeGreaterThanOrEqual(120);
    expect(String(c.hero.subtitle).length).toBeLessThanOrEqual(155);
    expect(String(c.hero.title).split(' ').length).toBeLessThanOrEqual(9);
    expect(String(c.hero.title)).toContain(String(c.hero.highlight));
    // Angka saling cocok: 6 klinik di konsol = 6 tab; ± 6 jam = waktu terlama kelompok Laboratorium; 120+ = spesifikasi lab
    const m = readSpecialistPlus(resolveContent(def, null));
    expect(m.stats.map((s) => `${s.value} ${s.unit}`)).toEqual(['6 klinik', '120+ jenis', '± 6 jam']);
    expect(m.specialties).toHaveLength(6);
    expect(turnaroundGroups(m.items('turnaround'))[0]).toMatchObject({ name: 'Laboratorium', max: 6, unit: 'jam' });
    expect(JSON.stringify(c.technology)).toContain('Jenis tes: 120+');
    // Setiap dokter demo masuk ke salah satu klinik (tidak ada baris jadwal yang hilang)
    expect(m.specialties.reduce((n, s) => n + s.doctors.length, 0)).toBe((c.specialists.doctors as ListItem[]).length);
  });

  // CREDITS.md gets this template's section at integration
  it('setiap kunci foto tercatat di CREDITS.md', () => {
    const credits = readFileSync(resolve(ROOT, 'public/assets/templates/photos/CREDITS.md'), 'utf8');
    for (const key of SPECIALISTPLUS_PHOTOS.keys) expect(credits, key).toContain(`\`${key}-*\``);
  });

  it('foto demo ringan: hero 800/1280/1920, WebP ≤ 140 KB per file (800w ≤ 90 KB), total ≤ 2,5 MB', () => {
    expect(SPECIALISTPLUS_PHOTOS.asset(def.defaultContent.hero.image as string)!.srcSet).toBe(
      '/assets/templates/photos/specialistplus-hero-800.webp 800w, /assets/templates/photos/specialistplus-hero-1280.webp 1280w, /assets/templates/photos/specialistplus-hero-1920.webp 1920w',
    );
    let total = 0;
    for (const key of SPECIALISTPLUS_PHOTOS.keys) {
      for (const url of urls(SPECIALISTPLUS_PHOTOS.src(key))) {
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

  it('salinan demo jujur: formulir hanya menyusun pesan WhatsApp, hasil lab tidak ditampilkan, tanpa klaim atau janji', () => {
    const text = JSON.stringify(def.defaultContent);
    expect(text).not.toMatch(/dijamin|garansi|\bpasti\b|terbaik|nomor 1|#1|termurah|100%|\bKARS\b|akreditasi|terakreditasi|sembuh|bersertifikat|\bISO\b|\bJCI\b/i);
    expect(text).toContain('Formulir hanya menyusun pesan WhatsApp; data tidak disimpan di website.');
    expect(text).toContain('Hasil lab tidak ditampilkan di website ini.');
    expect(text).toContain('Jadwal contoh. Konfirmasi slot lewat WhatsApp.');
    expect(text).toContain('Harga contoh.');
    expect(text).toContain('Kami bukan layanan gawat darurat. Dalam keadaan darurat, hubungi 119 atau datang ke IGD terdekat.');
    expect(String(def.defaultContent.footer.disclaimer)).toMatch(/contoh \(fiktif\)/);
    // Dokter fiktif bergelar, tanpa foto (inisial); testimoni nama depan + kota
    for (const d of def.defaultContent.specialists.doctors as ListItem[]) expect(String(d.name), String(d.name)).toMatch(/^dr\. [A-Z][a-z]+ [A-Z][a-z]+, Sp\./);
    for (const t of def.defaultContent.testimonials.items as ListItem[]) {
      expect(String(t.name).split(' '), String(t.name)).toHaveLength(1);
      expect(t.city).toBeTruthy();
      expect(t.photo).toBeUndefined();
    }
    // Nama alat umum, tanpa merek
    expect(JSON.stringify(def.defaultContent.technology)).not.toMatch(/Siemens|Philips|GE |Canon|Toshiba|Hitachi|Roche|Abbott|Sysmex|Hologic/);
  });

  it('halaman katalog (specialistplus.content.ts) menyebut batasan yang sama dan tidak mengklaim akreditasi', () => {
    const page = readFileSync(resolve(ROOT, 'src/content/templates/specialistplus.content.ts'), 'utf8');
    expect(page).toContain('data tidak disimpan di website');
    expect(page).toContain('Hasil lab tidak ditampilkan di website');
    expect(page).toContain('tidak memiliki rekam medis, pembayaran online, konsultasi video, maupun antrean real-time');
    expect(page).toContain('fiktif');
    expect(page).not.toMatch(/\bKARS\b|terakreditasi|dokter terbaik|dijamin|sembuh total|\b100%|termasuk domain|domain, hosting/i);
    const seo = readFileSync(resolve(ROOT, 'src/content/templates/specialistplus.ts'), 'utf8');
    expect(seo).toContain("title: '{nama}: Template Klinik Spesialis & Lab – {harga_singkat}'");
    expect(seo).toContain("h1: '{nama}: Template Website Klinik Spesialis & Laboratorium'");
    expect(seo).toContain('{harga} sudah termasuk hosting & SSL tahun pertama; domain mulai {domain_mulai}/tahun.');
    expect(seo).toContain("updated: '2026-10-28'");
    expect('SpecialistPlus: Template Klinik Spesialis & Lab – Rp1,89 jt'.length).toBeLessThanOrEqual(60);
  });
});

describe('SpecialistPlus: helper model', () => {
  it('warna tema: navy putih ≥ 14:1, teal terang ≥ 4,5:1 di navy & permukaan terang; teks di aksen; tidak valid → bawaan', () => {
    const white = rgb('#ffffff');
    expect(spxVars('#0E8F8A')).toEqual({ '--spx-navy': '#0b203c', '--spx-navy-2': '#1f324c', '--spx-lift': '#283b53', '--spx-bright': '#65b7b4' });
    for (const accent of ['#0E8F8A', '#1D4ED8', '#A61E3A', '#B7791F', '#FACC15', '#C6F135', '#FFFFFF', '#000000', '#6EE7B7', '#7C3AED', '#12A07F']) {
      const vars = spxVars(accent) as Record<string, string>;
      const navy = rgb(vars['--spx-navy']);
      const bright = rgb(vars['--spx-bright']);
      expect(contrast(navy, white), accent).toBeGreaterThanOrEqual(14);
      expect(contrast(bright, navy), accent).toBeGreaterThanOrEqual(4.5);
      expect(contrast(bright, rgb(vars['--spx-lift'])), accent).toBeGreaterThanOrEqual(4.5);
      expect(contrast(white, rgb(vars['--spx-navy-2'])), accent).toBeGreaterThanOrEqual(4.5);
    }
    expect(spxVars('zzz')).toEqual(spxVars('#0E8F8A'));
    // Teal bawaan memakai teks tinta (aturan --tpl-on-accent); navy & biru tua memakai putih
    expect(accentIsDark('#0E8F8A')).toBe(false);
    expect(accentIsDark('#FACC15')).toBe(false);
    expect(accentIsDark('#1D4ED8')).toBe(true);
    expect(accentIsDark('bukan warna')).toBe(false);
  });

  it('menu: label singkat dari label section, section kosong/tersembunyi keluar dari menu', () => {
    const content = resolveContent(def, null);
    expect(navItems(content).map((i) => `${i.key}:${i.label}`)).toEqual([
      'specialists:Spesialis',
      'mcu:MCU',
      'labresults:Hasil lab',
      'technology:Teknologi',
      'faq:FAQ',
      'contact:Kontak',
    ]);
    const less = resolveContent(def, {
      specialists: { eyebrow: 'Klinik spesialis kami' },
      mcu: { packages: [{ code: 'A', name: '' }] },
      technology: { enabled: false },
      faq: { items: [{ question: '' }] },
      labresults: { eyebrow: '' },
    });
    expect(navItems(less).map((i) => `${i.key}:${i.label}`)).toEqual(['specialists:Spesialis', 'labresults:Hasil Lab', 'contact:Kontak']);
  });

  it('kode label "SPX-01" mengikuti section berlabel yang tampil; awalan dari CMS dibersihkan', () => {
    const m = readSpecialistPlus(resolveContent(def, null));
    expect(['specialists', 'mcu', 'labresults', 'technology', 'turnaround', 'testimonials', 'faq', 'contact'].map(m.code)).toEqual([
      'SPX-01',
      'SPX-02',
      'SPX-03',
      'SPX-04',
      'SPX-05',
      'SPX-06',
      'SPX-07',
      'SPX-08',
    ]);
    expect(m.code('hero')).toBe('');
    const skip = readSpecialistPlus(resolveContent(def, { hero: { label_code: '' }, mcu: { eyebrow: '' }, labresults: { enabled: false } }));
    expect(skip.code('specialists')).toBe('01');
    expect(skip.code('mcu')).toBe('');
    expect(skip.code('technology')).toBe('02');
    expect(skip.code('labresults')).toBe('');
    expect(labelCode('SPX', '02')).toBe('SPX-02');
    expect(labelCode('s p-x!', '03')).toBe('SPX-03');
    expect(labelCode('', '04')).toBe('04');
    expect(labelCode('SPX', '')).toBe('');
    expect(labelCode('panjangsekali', '01')).toBe('PANJAN-01');
  });

  it('tujuan tautan: anchor Indonesia dan kunci section; section tersembunyi → cadangan', () => {
    expect(sectionTarget('#spesialis')).toBe('specialists');
    expect(sectionTarget('#jadwal-dokter')).toBe('specialists');
    expect(sectionTarget('#paket')).toBe('mcu');
    expect(sectionTarget('mcu')).toBe('mcu');
    expect(sectionTarget('#hasil-lab')).toBe('labresults');
    expect(sectionTarget('#teknologi')).toBe('technology');
    expect(sectionTarget('#waktu-hasil')).toBe('turnaround');
    expect(sectionTarget('#testimoni')).toBe('testimonials');
    expect(sectionTarget('#tanya-jawab')).toBe('faq');
    expect(sectionTarget('#kontak')).toBe('contact');
    expect(sectionTarget('#beranda')).toBe('hero');
    expect(sectionTarget('#tidak-ada')).toBeNull();
    const m = readSpecialistPlus(resolveContent(def, null));
    expect(m.primaryAction).toEqual({ kind: 'section', target: 'specialists' });
    expect(m.secondaryAction).toEqual({ kind: 'section', target: 'mcu' });
    expect(m.headerAction).toEqual({ kind: 'section', target: 'specialists' });
    expect(m.linkOr('#hasil-lab', null)).toEqual({ kind: 'section', target: 'labresults' });
    expect(m.linkOr('#tidak-ada', m.contactAction)).toEqual({ kind: 'section', target: 'contact' });
    expect(m.linkOr('https://contoh.test/portal', null)).toEqual({ kind: 'external', href: 'https://contoh.test/portal' });
    expect(m.linkOr('javascript:alert(1)', null)).toBeNull();
    const hidden = readSpecialistPlus(resolveContent(def, { specialists: { enabled: false }, mcu: { enabled: false } }));
    expect(hidden.primaryAction).toEqual({ kind: 'section', target: 'contact' });
    expect(hidden.secondaryAction).toBeNull();
    expect(hidden.headerAction).toEqual({ kind: 'section', target: 'contact' });
    expect(hidden.linkOr('#spesialis', null)).toBeNull();
    const bare = readSpecialistPlus(resolveContent(def, { specialists: { enabled: false }, contact: { enabled: false } }));
    expect(bare.primaryAction).toBeNull();
    expect(bare.headerAction?.kind).toBe('external');
  });

  it('section tampil hanya bila berisi', () => {
    const content = resolveContent(def, null);
    for (const key of ORDER) expect(sectionShown(content, key), key).toBe(true);
    const empty = resolveContent(def, {
      specialists: { items: [{ summary: 'tanpa nama' }] },
      mcu: { packages: [{ code: 'A', price: 'Rp1' }] },
      technology: { items: [{ text: 'tanpa nama' }] },
      turnaround: { items: [{ name: 'tanpa angka', value: '' }, { name: 'nol', value: '0' }] },
      testimonials: { items: [{ name: 'tanpa kutipan' }] },
      faq: { items: [] },
    });
    for (const key of ['specialists', 'mcu', 'technology', 'turnaround', 'testimonials', 'faq']) expect(sectionShown(empty, key), key).toBe(false);
    expect(sectionShown(content, 'tidak-ada')).toBe(false);
    expect(sectionShown(resolveContent(def, { labresults: { enabled: false } }), 'labresults')).toBe(false);
  });

  it('hari praktik: singkatan, nama lengkap, rentang; tiga hari berurutan atau lebih jadi rentang', () => {
    expect(dayIndexes('Sen · Rab · Jum')).toEqual([0, 2, 4]);
    expect(dayIndexes('Senin, Kamis')).toEqual([0, 3]);
    expect(dayIndexes('Sen–Rab, Sab')).toEqual([0, 1, 2, 5]);
    expect(dayIndexes('Jum-Sen')).toEqual([0, 4, 5, 6]);
    expect(dayIndexes('Selasa dan Minggu')).toEqual([1, 6]);
    expect(dayIndexes('')).toEqual([]);
    expect(compactDays([0, 1, 2, 3, 4])).toBe('Sen–Jum');
    expect(compactDays([0, 2, 3, 4])).toBe('Sen · Rab–Jum');
    expect(compactDays([1, 0])).toBe('Sen · Sel');
    expect(compactDays([])).toBe('');
    const m = readSpecialistPlus(resolveContent(def, null));
    expect(m.specialties.map((s) => `${s.code}:${s.tab}:${s.doctors.length}:${s.days}:${s.nextSlot}`)).toEqual([
      'JTG:Jantung:2:Sen–Jum:Selasa, 13.00',
      'ORT:Ortopedi:2:Sen · Sel · Kam · Sab:Senin, 09.00',
      'ONK:Onkologi:2:Sen · Rab–Jum:Rabu, 10.00',
      'NEU:Saraf:2:Sel · Kam · Sab:Kamis, 13.00',
      'PAR:Paru:1:Sen · Rab · Jum:Jumat, 08.30',
      'INT:Penyakit Dalam:2:Sen–Sab:Senin, 13.00',
    ]);
    // Dokter cocok lewat nama tab, nama lengkap, atau kode (huruf besar/kecil diabaikan)
    const viaCode = readSpecialistPlus(
      resolveContent(def, {
        specialists: {
          items: [{ tab: 'Mata', name: 'Klinik Mata', code: 'mat' }],
          doctors: [
            { name: 'dr. A B, Sp.M', clinic: 'MAT', days: 'Sen' },
            { name: 'dr. C D, Sp.M', clinic: 'klinik  mata', days: 'Rab' },
            { name: 'dr. E F, Sp.M', clinic: 'Gigi', days: 'Kam' },
          ],
        },
      }),
    );
    expect(viaCode.specialties[0].doctors.map((d) => d.name)).toEqual(['dr. A B, Sp.M', 'dr. C D, Sp.M']);
    expect(viaCode.specialties[0].code).toBe('MAT');
  });

  it('teks kecil: label dipisah, angka dari teks, inisial dokter tanpa gelar, nomor HP berkelompok, teks bersih', () => {
    expect(splitTags('Hipertensi · Nyeri dada, Asma | EKG')).toEqual(['Hipertensi', 'Nyeri dada', 'Asma', 'EKG']);
    expect(splitTags('')).toEqual([]);
    expect(toNumber('± 6')).toBe(6);
    expect(toNumber('1,5')).toBe(1.5);
    expect(toNumber('abc')).toBe(0);
    expect(doctorInitials('dr. Lintang Harahap, Sp.JP')).toBe('LH');
    expect(doctorInitials('dr. Rosalina Tarigan, Sp.PD-KHOM')).toBe('RT');
    expect(doctorInitials('Prof. Dr. dr. Budi Santoso, Sp.JP(K)')).toBe('BS');
    expect(doctorInitials('dr. H. Ahmad Yani, Sp.PD')).toBe('AY');
    expect(doctorInitials('dr. Yosef')).toBe('Y');
    expect(doctorInitials('')).toBe('?');
    expect(displayPhone('081234567890')).toBe('0812-3456-7890');
    expect(displayPhone('(061) 555-0182')).toBe('(061) 555-0182');
    expect(cleanText('a\u0000b\u0007  c', 10)).toBe('a b c');
    expect(cleanText('x'.repeat(500), 80)).toHaveLength(80);
  });

  it('pesan WhatsApp daftar dokter & pesan paket MCU', () => {
    const m = readSpecialistPlus(resolveContent(def, null));
    expect(registerMessage(m.specialties[0].doctors[0], m.specialties[0].name, COMPANY)).toBe(
      [
        'Halo SpecialistPlus Medical Center, saya ingin mendaftar konsultasi.',
        '',
        'Dokter: dr. Lintang Harahap, Sp.JP',
        'Klinik: Jantung & Pembuluh Darah',
        'Jadwal: Sen · Rab · Jum, 08.00–12.00',
        'Mohon info slot yang tersedia.',
      ].join('\n'),
    );
    expect(registerMessage({ name: 'dr. X Y, Sp.A' }, '', '')).toBe('Halo, saya ingin mendaftar konsultasi.\n\nDokter: dr. X Y, Sp.A\nMohon info slot yang tersedia.');
    expect(mcuMessage(m.matrix.packages[1], COMPANY)).toBe(
      'Halo SpecialistPlus Medical Center, saya ingin memesan Paket MCU Eksekutif (Rp1.750.000). Mohon info jadwal dan persiapannya.',
    );
    expect(mcuMessage({ ...m.matrix.packages[0], price: '' }, '')).toBe('Halo, saya ingin memesan Paket MCU Dasar. Mohon info jadwal dan persiapannya.');
  });

  it('matriks MCU: kode paket (kosong → A, B…), tanda per paket, jumlah pemeriksaan', () => {
    const { matrix } = readSpecialistPlus(resolveContent(def, null));
    expect(matrix.packages.map((p) => `${p.code}:${p.name}:${p.price}`)).toEqual(['A:Dasar:Rp650.000', 'B:Eksekutif:Rp1.750.000', 'C:Jantung:Rp2.400.000', 'D:Wanita:Rp1.950.000']);
    expect(matrix.rows).toHaveLength(12);
    expect(matrix.rows.find((r) => r.label === 'EKG')!.cells).toEqual([false, true, true, false]);
    expect(matrix.rows.find((r) => r.label === 'Mammografi')!.cells).toEqual([false, false, false, true]);
    expect([0, 1, 2, 3].map((i) => includedCount(matrix, i))).toEqual([4, 8, 9, 9]);
    const loose = mcuMatrix(
      [{ name: 'Satu' }, { name: 'Dua', code: 'z' }, { name: '' }, { name: 'Tiga', code: 'c-1' }],
      [{ label: 'Darah', packages: 'a, z' }, { label: 'Urine', packages: 'C1/A' }, { label: '', packages: 'A' }, { label: 'EKG', packages: '' }],
    );
    expect(loose.packages.map((p) => p.code)).toEqual(['A', 'Z', 'C1']);
    expect(loose.rows.map((r) => `${r.label}:${r.cells.join(',')}`)).toEqual(['Darah:true,true,false', 'Urine:true,false,true', 'EKG:false,false,false']);
    expect(mcuMatrix([], [{ label: 'X', packages: 'A' }])).toEqual({ packages: [], rows: [{ label: 'X', cells: [] }] });
  });

  it('waktu hasil: dikelompokkan, satuan per kelompok, lebar batang dari nilai terbesar (min. 6%)', () => {
    const groups = turnaroundGroups(readSpecialistPlus(resolveContent(def, null)).items('turnaround'));
    expect(groups.map((g) => `${g.name}:${g.max}:${g.unit}`)).toEqual(['Laboratorium:6:jam', 'Radiologi & patologi:5:hari']);
    expect(groups[0].rows.map((r) => `${r.name}=${r.label}@${r.width}`)).toEqual([
      'Gula darah=2 jam@33',
      'Darah lengkap=3 jam@50',
      'Urine lengkap=3 jam@50',
      'Profil lemak=6 jam@100',
      'Fungsi hati & ginjal=6 jam@100',
    ]);
    expect(groups[1].rows.map((r) => r.width)).toEqual([20, 20, 40, 100]);
    const mixed = turnaroundGroups([
      { name: 'A', value: '0,1', unit: 'jam' },
      { name: 'B', value: '10', unit: 'menit' },
      { name: 'C', value: 'x' },
      { name: '', value: '3' },
    ]);
    expect(mixed).toEqual([
      {
        name: 'Pemeriksaan',
        unit: '',
        max: 10,
        rows: [
          { name: 'A', value: 0.1, unit: 'jam', label: '0,1 jam', width: 6 },
          { name: 'B', value: 10, unit: 'menit', label: '10 menit', width: 100 },
        ],
      },
    ]);
  });

  it('spesifikasi alat: "Label: nilai" per baris, maks. 4 baris', () => {
    expect(specRows('Medan magnet: 1,5 T\nDurasi: 20–45 menit\r\nLokasi: Lt. 1 · Radiologi')).toEqual([
      { label: 'Medan magnet', value: '1,5 T' },
      { label: 'Durasi', value: '20–45 menit' },
      { label: 'Lokasi', value: 'Lt. 1 · Radiologi' },
    ]);
    expect(specRows('Jam buka: 07:00\ntanpa titik dua')).toEqual([
      { label: 'Jam buka', value: '07:00' },
      { label: '', value: 'tanpa titik dua' },
    ]);
    expect(specRows('a: 1\nb: 2\nc: 3\nd: 4\ne: 5')).toHaveLength(4);
    expect(specRows('')).toEqual([]);
  });

  it('formulir hasil lab: validasi per isian, pesan WhatsApp berurutan, tanggal Indonesia, mailto', () => {
    expect(validateLab(lab(), '2026-10-28')).toEqual({});
    expect(validateLab(EMPTY_LAB, '2026-10-28')).toEqual({
      reg: 'Tulis nomor registrasi (huruf, angka, atau tanda -).',
      birth: 'Pilih tanggal lahir.',
      name: 'Tulis nama pasien.',
    });
    expect(validateLab(lab({ reg: 'ab1' }), '2026-10-28').reg).toBeTruthy();
    expect(validateLab(lab({ reg: '<script>' }), '2026-10-28').reg).toBeTruthy();
    expect(validateLab(lab({ reg: 'LAB 2610/04' }), '2026-10-28')).toEqual({});
    expect(validateLab(lab({ birth: '2026-10-29' }), '2026-10-28').birth).toBe('Tanggal lahir tidak valid.');
    expect(validateLab(lab({ birth: '1899-12-31' }), '2026-10-28').birth).toBe('Tanggal lahir tidak valid.');
    expect(validateLab(lab({ birth: '1980-02-30' }), '2026-10-28').birth).toBe('Pilih tanggal lahir.');
    expect(validateLab(lab({ name: ' a ' }), '2026-10-28').name).toBe('Tulis nama pasien.');
    expect(formatBirth('1980-03-12')).toBe('12 Maret 1980');
    expect(formatBirth('2001-12-01')).toBe('1 Desember 2001');
    expect(formatBirth('12-03-1980')).toBe('');
    expect(todayIso(new Date(2026, 9, 8))).toBe('2026-10-08');
    expect(labMessage(lab({ channel: 'Email' }), COMPANY)).toBe(
      [
        'Halo SpecialistPlus Medical Center, saya ingin meminta hasil pemeriksaan laboratorium.',
        '',
        'No. registrasi: LAB-2610-0458',
        'Nama pasien: Rina Kartika',
        'Tanggal lahir: 12 Maret 1980',
        'Kirim hasil lewat: Email',
      ].join('\n'),
    );
    const odd = labMessage(lab({ reg: 'LAB 26\u000710', name: 'Rina   K', channel: 'Pos' as LabForm['channel'] }), '');
    expect(odd.split('\n')[0]).toBe('Halo, saya ingin meminta hasil pemeriksaan laboratorium.');
    expect(odd).toContain('No. registrasi: LAB2610');
    expect(odd).toContain('Nama pasien: Rina K');
    expect(odd).toContain('Kirim hasil lewat: WhatsApp');
    expect(mailWith('pendaftaran@specialistplus.test', 'Permintaan hasil lab', 'Baris 1\nBaris 2')).toBe(
      'mailto:pendaftaran@specialistplus.test?subject=Permintaan%20hasil%20lab&body=Baris%201%0ABaris%202',
    );
    expect(mailWith('bukan email', 's', 'b')).toBe('');
  });

  it('ikon klinik & alat otomatis dari nama', () => {
    expect(iconKey('Jantung Jantung & Pembuluh Darah')).toBe('heart');
    expect(iconKey('CATH Cath lab')).toBe('heart');
    expect(iconKey('Ortopedi & Traumatologi')).toBe('bone');
    expect(iconKey('Onkologi')).toBe('oncology');
    expect(iconKey('Saraf (Neurologi)')).toBe('brain');
    expect(iconKey('Paru & Pernapasan')).toBe('lung');
    expect(iconKey('Penyakit Dalam')).toBe('internal');
    expect(iconKey('MRI MRI 1,5 Tesla')).toBe('mri');
    expect(iconKey('CT CT scan 128 irisan')).toBe('ct');
    expect(iconKey('MMG Mammografi digital')).toBe('scan');
    expect(iconKey('LAB Lab otomatis')).toBe('lab');
    expect(iconKey('Apa saja')).toBe('other');
  });
});

describe('SpecialistPlus: demo', () => {
  it('urutan section, satu H1, hero console: foto latar LCP (eager, srcset, ukuran, alt) tanpa reveal, konsol data', () => {
    const container = demo();
    expect(sectionKeys(container)).toEqual([...ORDER, 'footer']);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const hero = section(container, 'hero');
    expect(hero.getAttribute('data-hero-layout')).toBe('console');
    expect(hero.getAttribute('data-tpl-tone')).toBe('inverse');
    expect(hero.querySelector('h1')!.textContent).toBe('Spesialis, lab, dan radiologi dalam satu pusat');
    expect(hero.querySelector('h1 span')!.textContent).toBe('satu pusat');
    const img = hero.querySelector<HTMLImageElement>('img[fetchpriority="high"]')!;
    expect(img.getAttribute('src')).toBe('/assets/templates/photos/specialistplus-hero-1920.webp');
    expect(img.getAttribute('srcset')).toContain(' 800w');
    expect(img.getAttribute('srcset')).toContain(' 1280w');
    expect(img.getAttribute('sizes')).toBeTruthy();
    expect(img.getAttribute('loading')).toBe('eager');
    expect(Number(img.getAttribute('width'))).toBe(1920);
    expect(Number(img.getAttribute('height'))).toBe(1080);
    expect(img.getAttribute('alt')).toBe('Ruang terapi modern dengan mesin pencitraan putih dan meja pasien di tengah ruangan');
    // Foto latar: di belakang teks (absolute, -z-10), lapisan navy di atasnya; TIDAK di dalam <Reveal>, tanpa zoom/parallax
    expect(img.closest('.tpl-reveal')).toBeNull();
    expect(img.className).not.toMatch(/tpl-photo|spx-/);
    const media = img.closest('.spx-hero-media')!;
    expect(media.className).toContain('absolute');
    expect(media.className).toContain('-z-10');
    expect(media.querySelector('.spx-hero-scrim')).toHaveAttribute('aria-hidden', 'true');
    expect(within(hero).getByRole('link', { name: 'Pilih Spesialis' })).toHaveAttribute('href', '#specialists');
    expect(within(hero).getByRole('link', { name: 'Paket MCU' })).toHaveAttribute('href', '#mcu');
    // Konsol: grup bernama, select berlabel, pembacaan live region, tiga angka, catatan jadwal contoh
    const consoleBox = within(hero).getByRole('group', { name: 'Cari jadwal spesialis' });
    expect(consoleBox).toHaveAttribute('data-spx-console');
    expect(consoleBox.querySelector('.spx-scan')).toHaveAttribute('aria-hidden', 'true');
    const select = within(consoleBox).getByLabelText('Spesialis') as HTMLSelectElement;
    expect(select.tagName).toBe('SELECT');
    expect(texts(select.options)).toEqual(['Jantung & Pembuluh Darah', 'Ortopedi & Traumatologi', 'Onkologi', 'Saraf (Neurologi)', 'Paru & Pernapasan', 'Penyakit Dalam']);
    const readout = consoleBox.querySelector('[data-spx-readout]')!;
    expect(readout).toHaveAttribute('aria-live', 'polite');
    expect(texts(readout.querySelectorAll('dt'))).toEqual(['Dokter', 'Hari praktik', 'Jadwal terdekat']);
    expect(texts(readout.querySelectorAll('dd'))).toEqual(['2 dokter', 'Sen–Jum', 'Selasa, 13.00']);
    const metrics = Array.from(consoleBox.querySelectorAll('dl')).find((dl) => dl !== readout)!;
    expect(texts(metrics.querySelectorAll('dt'))).toEqual(['Spesialis', 'Pemeriksaan lab', 'Hasil lab rutin']);
    expect(metrics.className).toContain('grid-cols-3');
    expect(consoleBox.textContent).toContain('Jadwal contoh. Konfirmasi slot lewat WhatsApp.');
    const eager = Array.from(container.querySelectorAll('img')).filter((i) => i.getAttribute('loading') !== 'lazy');
    expect(eager.map((i) => i.getAttribute('src'))).toEqual(['/assets/templates/photos/specialistplus-hero-1920.webp']);
  });

  it('konsol hero dan tab Spesialis berbagi pilihan: select ↔ tab, tombol konsol menggulir ke jadwal', () => {
    const container = demo();
    const hero = section(container, 'hero');
    const specialists = section(container, 'specialists');
    const select = within(hero).getByLabelText('Spesialis') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '2' } });
    expect(texts(hero.querySelectorAll('[data-spx-readout] dd'))).toEqual(['2 dokter', 'Sen · Rab–Jum', 'Rabu, 10.00']);
    const tabs = within(specialists).getAllByRole('tab');
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    expect(within(specialists).getByRole('tabpanel').querySelector('h3')!.textContent).toBe('Onkologi');
    fireEvent.click(tabs[4]);
    expect(select.value).toBe('4');
    expect(texts(hero.querySelectorAll('[data-spx-readout] dd'))).toEqual(['1 dokter', 'Sen · Rab · Jum', 'Jumat, 08.30']);
    fireEvent.click(within(hero).getByRole('link', { name: 'Lihat jadwal dokter' }));
    expect(scrolled).toEqual(['specialists']);
    // Klik nama klinik di footer membuka tab itu
    fireEvent.click(within(container.querySelector('footer')!).getByRole('link', { name: 'Saraf' }));
    expect(tabs[3]).toHaveAttribute('aria-selected', 'true');
    expect(select.value).toBe('3');
    expect(scrolled).toEqual(['specialists', 'specialists']);
  });

  it('header navy menempel: menu + tombol "Daftar Konsultasi"; menu HP buka/tutup, Esc menutup dan fokus kembali', () => {
    const container = demo();
    const header = container.querySelector('header')!;
    expect(header.className).toContain('sticky');
    expect(header.className).toContain('bg-(--spx-navy)');
    expect(header.getAttribute('data-tpl-tone')).toBe('inverse');
    expect(header.querySelector('svg[viewBox="0 0 32 32"]'), 'SpecialistPlusMark').not.toBeNull();
    const nav = within(header).getByRole('navigation', { name: 'Menu utama' });
    expect(Array.from(nav.querySelectorAll('a')).map((a) => a.getAttribute('href'))).toEqual(['#specialists', '#mcu', '#labresults', '#technology', '#faq', '#kontak']);
    expect(texts(nav.querySelectorAll('a'))).toEqual(['Spesialis', 'MCU', 'Hasil lab', 'Teknologi', 'FAQ', 'Kontak']);
    fireEvent.click(within(nav).getByRole('link', { name: 'Teknologi' }));
    expect(scrolled).toEqual(['technology']);
    expect(within(header).getAllByRole('link', { name: 'Daftar Konsultasi' })[0]).toHaveAttribute('href', '#specialists');
    const toggle = within(header).getByRole('button', { name: 'Buka menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle.className).toContain('h-11 w-11');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAccessibleName('Tutup menu');
    expect(within(header).getAllByRole('navigation', { name: 'Menu utama' })).toHaveLength(2);
    const panel = document.getElementById(toggle.getAttribute('aria-controls')!)!;
    expect(panel).toHaveAttribute('aria-label', 'Menu utama');
    expect(texts(within(panel).getAllByRole('link'))).toEqual(['01Spesialis', '02MCU', '03Hasil lab', '04Teknologi', '05FAQ', '06Kontak', 'Daftar Konsultasi']);
    fireEvent.click(within(panel).getByRole('link', { name: 'Hasil lab' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(scrolled).toEqual(['technology', 'labresults']);
    fireEvent.click(toggle);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
    expect(within(header).getAllByRole('navigation', { name: 'Menu utama' })).toHaveLength(1);
  });

  it('label section mono "SPX-02 · MCU" (garis teal dekoratif); section bergantian putih, #F2F6F8, navy', () => {
    const container = demo();
    expect(['specialists', 'mcu', 'labresults', 'technology', 'turnaround', 'testimonials', 'faq', 'contact'].map((k) => section(container, k).querySelector('p')!.textContent)).toEqual([
      'SPX-01·Spesialis',
      'SPX-02·MCU',
      'SPX-03·Hasil lab',
      'SPX-04·Teknologi',
      'SPX-05·Waktu hasil',
      'SPX-06·Testimoni',
      'SPX-07·FAQ',
      'SPX-08·Kontak',
    ]);
    const label = section(container, 'mcu').querySelector('p')!;
    expect(label.className).toContain('font-mono');
    expect(label.querySelector('span[aria-hidden]')!.className).toContain('bg-(--tpl-accent)');
    expect(
      Array.from(container.querySelectorAll('[data-tpl-section][data-tpl-tone="inverse"]')).map((el) => el.getAttribute('data-tpl-section')),
    ).toEqual(['hero', 'labresults', 'footer']);
    const bands = ['specialists', 'mcu', 'technology', 'turnaround', 'testimonials', 'faq', 'contact'].map((k) =>
      section(container, k).className.includes('bg-[#F2F6F8]') ? 'abu' : section(container, k).className.includes('bg-white') ? 'putih' : '?',
    );
    expect(bands).toEqual(['putih', 'abu', 'putih', 'abu', 'putih', 'abu', 'putih']);
  });

  it('tab spesialis: role tab/tabpanel, panah/Home/End berpindah & memilih, panel dengan kondisi, tindakan, tabel jadwal', () => {
    const specialists = section(demo(), 'specialists');
    const tablist = within(specialists).getByRole('tablist', { name: 'Klinik spesialis' });
    const tabs = within(tablist).getAllByRole('tab');
    expect(texts(tabs)).toEqual(['JTGJantung2 dokter', 'ORTOrtopedi2 dokter', 'ONKOnkologi2 dokter', 'NEUSaraf2 dokter', 'PARParu1 dokter', 'INTPenyakit Dalam2 dokter']);
    expect(tabs.map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1', '-1', '-1', '-1']);
    expect(tablist.className).toContain('@6xl:grid-cols-6');
    const panel = within(specialists).getByRole('tabpanel');
    expect(tabs.every((t) => t.getAttribute('aria-controls') === panel.id)).toBe(true);
    expect(panel).toHaveAttribute('aria-labelledby', tabs[0].id);
    expect(panel.querySelector('h3')!.textContent).toBe('Jantung & Pembuluh Darah');
    expect(texts(within(panel).getByRole('list', { name: 'Kondisi yang ditangani klinik Jantung' }).querySelectorAll('li'))).toEqual([
      'Hipertensi',
      'Nyeri dada',
      'Gangguan irama',
      'Gagal jantung',
    ]);
    expect(texts(within(panel).getByRole('list', { name: 'Pemeriksaan dan tindakan klinik Jantung' }).querySelectorAll('li'))).toEqual([
      'EKG',
      'Ekokardiografi',
      'Treadmill test',
      'Holter 24 jam',
    ]);
    // Tabel jadwal (layar lebar): caption, th scope=col, baris bertahap, tombol daftar → WhatsApp dengan nama dokter
    const table = within(panel).getByRole('table');
    expect(table.querySelector('caption')!.textContent).toBe('Jadwal dokter Jantung & Pembuluh Darah');
    const heads = Array.from(table.querySelectorAll('thead th'));
    expect(texts(heads)).toEqual(['Dokter', 'Hari', 'Jam', 'Ruang', 'Pendaftaran']);
    expect(heads.every((th) => th.getAttribute('scope') === 'col')).toBe(true);
    const rows = table.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[1].className).toContain('spx-row');
    expect(texts(rows[0].querySelectorAll('td')).slice(0, 4)).toEqual(['LHdr. Lintang Harahap, Sp.JP', 'Sen · Rab · Jum', '08.00–12.00', 'Lt. 2 · R-201']);
    const register = within(table).getByRole('link', { name: 'Daftar: dr. Maria Sitompul, Sp.JP' });
    const m = readSpecialistPlus(resolveContent(def, null));
    expect(decoded(register)).toBe(`https://wa.me/6281234567890?text=${registerMessage(m.specialties[0].doctors[1], 'Jantung & Pembuluh Darah', COMPANY)}`);
    // HP: baris bertumpuk dengan dl Hari/Jam/Ruang dan tombol daftar
    const phone = within(panel).getByRole('list', { name: 'Jadwal dokter Jantung & Pembuluh Darah' });
    expect(phone.className).toContain('@5xl:hidden');
    expect(table.closest('.tpl-reveal')!.className).toContain('@5xl:block');
    expect(texts(phone.querySelectorAll(':scope > li:first-child dt'))).toEqual(['Hari', 'Jam', 'Ruang']);
    expect(within(phone).getAllByRole('link', { name: /^Daftar: / })).toHaveLength(2);
    expect(panel.textContent).toContain('Jadwal contoh dan dapat berubah.');
    // Dokter tanpa foto: hanya foto klinik di panel, alt tidak menyebut nama dokter
    const imgs = panel.querySelectorAll('img');
    expect(imgs).toHaveLength(1);
    expect(imgs[0].getAttribute('alt')).not.toMatch(/dr\.|Lintang|Maria/);
    // Keyboard
    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveFocus();
    expect(tabs[1]).toHaveAttribute('tabindex', '0');
    expect(tabs[0]).toHaveAttribute('tabindex', '-1');
    fireEvent.keyDown(tabs[1], { key: 'End' });
    expect(tabs[5]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[5]).toHaveFocus();
    fireEvent.keyDown(tabs[5], { key: 'ArrowRight' });
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs[0], { key: 'ArrowLeft' });
    expect(tabs[5]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs[5], { key: 'Home' });
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(tabs[4]);
    const paru = within(specialists).getByRole('tabpanel');
    expect(paru).toHaveAttribute('aria-labelledby', tabs[4].id);
    expect(paru.querySelector('caption')!.textContent).toBe('Jadwal dokter Paru & Pernapasan');
    expect(paru.querySelectorAll('tbody tr')).toHaveLength(1);
  });

  it('tabel perbandingan MCU: caption, th scope, centang dengan teks pembaca layar, kolom sorotan, tombol pesan → WhatsApp; HP & tablet kartu', () => {
    const mcu = section(demo(), 'mcu');
    const table = mcu.querySelector<HTMLTableElement>('table[data-spx-mcu-table]')!;
    expect(table.querySelector('caption')!.textContent).toBe('Perbandingan paket medical check-up');
    expect(table.className).toContain('table-fixed');
    // Tabel hanya di layar lebar (≥ @5xl, harga tidak terpotong) dan tanpa kotak gulir, agar baris judul paket menempel
    const wrapper = table.closest('.tpl-reveal')!;
    expect(wrapper.className).toContain('hidden');
    expect(wrapper.className).toContain('@5xl:block');
    expect(wrapper.className).not.toMatch(/overflow-(x-)?(auto|hidden|scroll)/);
    const heads = Array.from(table.querySelectorAll('thead th'));
    expect(heads).toHaveLength(5);
    expect(heads.every((th) => th.getAttribute('scope') === 'col' && /(^|\s)@5xl:sticky(\s|$)/.test(th.className))).toBe(true);
    expect(heads.some((th) => /(^|\s)sticky(\s|$)/.test(th.className))).toBe(false);
    expect(heads[2].textContent).toBe('PKT-BEksekutifRp1.750.000Usia 35 tahun ke atas± 3 jamDisarankan usia 35+');
    expect(heads[2].className).toContain('color-mix(in_srgb,var(--tpl-accent)_7%,white)');
    expect(heads[1].className).not.toContain('color-mix');
    const rowHeads = Array.from(table.querySelectorAll('tbody th'));
    expect(rowHeads).toHaveLength(12);
    expect(rowHeads.every((th) => th.getAttribute('scope') === 'row')).toBe(true);
    expect(rowHeads[0].closest('tr')!.className).toContain('spx-row');
    const sr = texts(table.querySelectorAll('tbody .sr-only'));
    expect(sr.filter((t) => t === 'Termasuk')).toHaveLength(30);
    expect(sr.filter((t) => t === 'Tidak termasuk')).toHaveLength(18);
    expect(table.querySelector('tfoot')!.textContent).toContain('12 pemeriksaan');
    const order = within(table).getByRole('link', { name: 'Pesan paket: Eksekutif' });
    expect(decoded(order)).toBe(`${WA}Halo SpecialistPlus Medical Center, saya ingin memesan Paket MCU Eksekutif (Rp1.750.000). Mohon info jadwal dan persiapannya.`);
    expect(within(table).getAllByRole('link', { name: /^Pesan paket: / })).toHaveLength(4);
    // HP: kartu paket bertumpuk, daftar pemeriksaan yang termasuk + jumlah
    const cards = within(mcu).getByRole('list', { name: 'Paket medical check-up' });
    expect(cards.className).toContain('@5xl:hidden');
    expect(cards.className).toContain('@3xl:grid-cols-2');
    const items = cards.querySelectorAll(':scope > li');
    expect(texts(Array.from(items, (li) => li.querySelector('h3')!))).toEqual(['Dasar', 'Eksekutif', 'Jantung', 'Wanita']);
    expect(within(items[3] as HTMLElement).getByRole('list', { name: 'Pemeriksaan di paket Wanita' }).querySelectorAll('li')).toHaveLength(9);
    expect(items[1].textContent).toContain('8 pemeriksaan');
    expect(mcu.textContent).toContain('Harga contoh. Puasa 10–12 jam sebelum pemeriksaan darah.');
  });

  it('formulir hasil lab: pita navy, galat + fokus, pesan WhatsApp, ubah data; tidak menyimpan, portal tanpa data', () => {
    const container = demo();
    const labresults = section(container, 'labresults');
    expect(labresults.className).toContain('bg-(--spx-navy)');
    expect(texts(labresults.querySelectorAll('ol > li'))).toEqual([
      '01Siapkan nomor registrasiTercetak di bukti pendaftaran atau kuitansi laboratorium.',
      '02Susun pesan WhatsAppFormulir menyusun pesannya; Anda yang menekan kirim.',
      '03Terima berkas hasilSetelah data cocok, admin mengirim hasil sesuai pilihan Anda.',
    ]);
    const portal = within(labresults).getByRole('link', { name: 'Buka portal pasien (contoh)' });
    expect(portal).toHaveAttribute('href', 'https://example.com/portal-pasien');
    expect(portal).toHaveAttribute('target', '_blank');
    const formEl = within(labresults).getByRole('form', { name: 'Permintaan hasil lab' });
    expect(formEl.getAttribute('action')).toBeNull();
    expect(formEl.hasAttribute('data-spx-lab-form')).toBe(true);
    expect(formEl.textContent).toContain('Hasil lab tidak ditampilkan di website ini. Formulir hanya menyusun pesan WhatsApp; data tidak disimpan di website.');
    const reg = within(formEl).getByLabelText('No. registrasi');
    expect(reg).toHaveAttribute('maxlength', '24');
    expect(within(formEl).getByLabelText('Tanggal lahir')).toHaveAttribute('type', 'date');
    expect(within(formEl).getByLabelText('Tanggal lahir')).toHaveAttribute('min', '1900-01-01');
    expect(within(formEl).getByRole('group', { name: 'Kirim hasil lewat' })).toBeInTheDocument();
    expect(within(formEl).getByLabelText('WhatsApp')).toBeChecked();
    // Kirim kosong → galat + fokus ke isian pertama yang salah
    act(() => {
      fireEvent.submit(formEl);
    });
    expect(formEl.querySelectorAll('[aria-invalid="true"]')).toHaveLength(3);
    expect(reg).toHaveAttribute('aria-describedby', `${reg.id}-error`);
    expect(reg).toHaveFocus();
    expect(formEl.textContent).toContain('Pilih tanggal lahir.');
    expect(formEl.textContent).toContain('Tulis nama pasien.');
    fireEvent.change(reg, { target: { value: 'LAB-2610-0458' } });
    expect(reg).not.toHaveAttribute('aria-invalid');
    fireEvent.change(within(formEl).getByLabelText('Tanggal lahir'), { target: { value: '1980-03-12' } });
    fireEvent.change(within(formEl).getByLabelText('Nama pasien'), { target: { value: 'Rina Kartika' } });
    fireEvent.click(within(formEl).getByLabelText('Email'));
    act(() => {
      fireEvent.submit(formEl);
    });
    const result = labresults.querySelector('[data-spx-lab-result]')!;
    expect(within(result as HTMLElement).getByRole('heading', { level: 3, name: 'Pesan siap dikirim' })).toBeInTheDocument();
    const message = result.querySelector('pre')!.textContent!;
    expect(message).toBe(labMessage(lab({ channel: 'Email' }), COMPANY));
    expect(decoded(within(result as HTMLElement).getByRole('link', { name: 'Buka WhatsApp' }))).toBe(`${WA}${message}`);
    // Portal tetap tanpa data formulir
    expect(within(labresults).getByRole('link', { name: 'Buka portal pasien (contoh)' })).toHaveAttribute('href', 'https://example.com/portal-pasien');
    fireEvent.click(within(result as HTMLElement).getByRole('button', { name: 'Ubah data' }));
    const again = within(labresults).getByRole('form');
    expect((within(again).getByLabelText('No. registrasi') as HTMLInputElement).value).toBe('LAB-2610-0458');
    expect((within(again).getByLabelText('Nama pasien') as HTMLInputElement).value).toBe('Rina Kartika');
    expect(within(again).getByLabelText('Email')).toBeChecked();
  });

  it('teknologi, waktu hasil, testimoni: kartu spesifikasi, batang per kelompok, inisial tanpa foto', () => {
    const container = demo();
    const technology = section(container, 'technology');
    const rail = within(technology).getByRole('list', { name: 'Alat diagnostik di satu gedung' });
    expect(rail).toHaveAttribute('tabindex', '0');
    expect(rail.className).toContain('snap-x');
    expect(rail.className).toContain('@7xl:grid-cols-5');
    const cards = rail.querySelectorAll(':scope > li');
    expect(texts(Array.from(cards, (c) => c.querySelector('h3')!))).toEqual(['MRI 1,5 Tesla', 'CT scan 128 irisan', 'Cath lab', 'Mammografi digital', 'Lab otomatis']);
    expect(texts(cards[0].querySelectorAll('dt'))).toEqual(['Medan magnet', 'Durasi', 'Lokasi']);
    expect(texts(cards[0].querySelectorAll('dd'))).toEqual(['1,5 T', '20–45 menit', 'Lt. 1 · Radiologi']);
    expect(cards[0].className).toContain('rounded-[8px]');
    const turnaround = section(container, 'turnaround');
    const panels = turnaround.querySelectorAll('[data-spx-turnaround]');
    expect(texts(Array.from(panels, (p) => p.querySelector('h3')!))).toEqual(['Laboratorium', 'Radiologi & patologi']);
    expect(panels[0].textContent).toContain('Satuan: jam');
    const bars = Array.from(turnaround.querySelectorAll<HTMLElement>('.spx-bar'));
    expect(bars.map((b) => b.style.width)).toEqual(['33%', '50%', '50%', '100%', '100%', '20%', '20%', '40%', '100%']);
    expect(bars.every((b) => b.parentElement!.getAttribute('aria-hidden') === 'true')).toBe(true);
    expect(texts(panels[1].querySelectorAll('li'))).toEqual(['Rontgen (hasil bacaan)1 hari', 'CT scan (hasil bacaan)1 hari', 'MRI (hasil bacaan)2 hari', 'Histopatologi5 hari']);
    const testimonials = section(container, 'testimonials');
    expect(testimonials.querySelector('img')).toBeNull();
    expect(texts(testimonials.querySelectorAll('figcaption'))).toEqual(['RIRina · BinjaiPasien', 'DADarwin · MedanPasien', 'YUYuliana · Deli SerdangPasien']);
    expect(testimonials.querySelectorAll('blockquote')).toHaveLength(3);
  });

  it('akordeon tanya jawab: aria-expanded/aria-controls, panel role=region (inert saat tertutup), tautan WhatsApp', () => {
    const faq = section(demo(), 'faq');
    const buttons = within(faq).getAllByRole('button');
    expect(buttons).toHaveLength(5);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'true');
    expect(buttons[0].closest('h3')).not.toBeNull();
    expect(buttons[0].textContent).toBe('Q01Apakah perlu rujukan untuk konsultasi spesialis?');
    const region = document.getElementById(buttons[0].getAttribute('aria-controls')!)!;
    expect(region).toHaveAttribute('role', 'region');
    expect(region).toHaveAttribute('data-open', 'true');
    expect(region.hasAttribute('inert')).toBe(false);
    expect(document.getElementById(buttons[1].getAttribute('aria-controls')!)!.hasAttribute('inert')).toBe(true);
    fireEvent.click(buttons[2]);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'false');
    expect(buttons[2]).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(buttons[2].getAttribute('aria-controls')!)!.textContent).toContain('Website ini tidak menyimpan atau menampilkan hasil pemeriksaan');
    fireEvent.click(buttons[2]);
    expect(buttons.every((b) => b.getAttribute('aria-expanded') === 'false')).toBe(true);
    expect(decoded(within(faq).getByRole('link', { name: 'Tanya lewat WhatsApp' }))).toBe(`${WA}Halo ${COMPANY}, saya ingin bertanya tentang jadwal dokter.`);
    cleanup();
    expect(within(section(demo({ contact: { whatsapp: '' } }), 'faq')).queryByRole('link', { name: 'Tanya lewat WhatsApp' })).toBeNull();
    cleanup();
    const custom = section(demo({ faq: { link_url: '#kontak', link_label: 'Hubungi kami' } }), 'faq');
    expect(within(custom).getByRole('link', { name: 'Hubungi kami' })).toHaveAttribute('href', '#kontak');
  });

  it('kontak: baris label-nilai, jam per unit (th scope=row), catatan darurat 119, foto lobi + peta; footer navy', () => {
    const container = demo();
    const contact = section(container, 'contact');
    expect(texts(contact.querySelectorAll('dl > div > dt'))).toEqual(['Alamat', 'Telepon', 'WhatsApp', 'Email', 'Jam layanan']);
    expect(within(contact).getAllByRole('link', { name: '0812-3456-7890' }).map((a) => a.getAttribute('href'))).toEqual([
      'tel:+6281234567890',
      expect.stringMatching(/^https:\/\/wa\.me\/6281234567890\?text=/),
    ]);
    for (const link of within(contact).getAllByRole('link', { name: /0812-3456-7890|pendaftaran@specialistplus\.test/ })) {
      // py-3 (12px atas & bawah) + teks 15px ≈ 45px; -my-3 menjaga tinggi baris
      expect(link.className).toMatch(/(^|\s)inline-block(\s|$)/);
      expect(link.className).toContain('py-3');
      expect(link.className).toContain('-my-3');
    }
    expect(within(contact).getByRole('link', { name: 'pendaftaran@specialistplus.test' })).toHaveAttribute('href', 'mailto:pendaftaran@specialistplus.test');
    const units = within(contact).getByRole('table');
    expect(units.querySelector('caption')!.textContent).toBe('Jam layanan per unit');
    expect(Array.from(units.querySelectorAll('th')).every((th) => th.getAttribute('scope') === 'row')).toBe(true);
    expect(texts(units.querySelectorAll('th'))).toEqual(['Poli spesialis', 'Laboratorium', 'Radiologi', 'Medical check-up']);
    // Rentang jam tidak dipatahkan di tanda pisah (word joiner)
    expect(units.querySelector('td')!.textContent).toBe('Sen⁠–⁠Sab 08.00⁠–⁠20.00');
    expect(contact.textContent).toContain('Kami bukan layanan gawat darurat. Dalam keadaan darurat, hubungi 119 atau datang ke IGD terdekat.');
    expect(within(contact).getByRole('link', { name: 'Telepon 119' })).toHaveAttribute('href', 'tel:119');
    expect(contact.querySelector('img')!.getAttribute('alt')).toBe('Lobi gedung yang terang dengan meja resepsionis putih dan pilar tinggi');
    expect(contact.querySelector('iframe')!.getAttribute('title')).toBe(`Peta lokasi ${COMPANY}`);
    expect(within(contact).getByRole('link', { name: 'Buka di Google Maps' }).getAttribute('href')).toMatch(/^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
    // Nama tautan unik: "Chat WhatsApp" hanya tombol melayang Shell
    expect(within(container).getAllByRole('link', { name: 'Chat WhatsApp' })).toHaveLength(1);
    const footer = container.querySelector('footer')!;
    expect(footer.getAttribute('data-tpl-section')).toBe('footer');
    expect(footer.getAttribute('data-tpl-tone')).toBe('inverse');
    expect(footer.className).toContain('bg-(--spx-navy)');
    expect(footer.textContent).toContain(`© ${new Date().getFullYear()} ${COMPANY}`);
    expect(footer.textContent).toContain('Klinik Spesialis & Lab Medan');
    expect(footer.textContent).toContain('adalah contoh (fiktif).');
    expect(Array.from(within(footer).getByRole('navigation', { name: 'Tautan footer' }).querySelectorAll('a')).map((a) => a.getAttribute('href'))).toEqual([
      '#specialists',
      '#mcu',
      '#labresults',
      '#technology',
      '#faq',
      '#kontak',
    ]);
    expect(within(footer).getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://instagram.com/specialistplus.contoh');
    expect(within(footer).getByRole('link', { name: 'Facebook' })).toHaveAttribute('href', 'https://facebook.com/specialistplus.contoh');
    expect(within(footer).getByRole('link', { name: 'YouTube' })).toHaveAttribute('href', 'https://youtube.com/@specialistplus.contoh');
    expect(within(footer).queryByRole('link', { name: 'LinkedIn' })).toBeNull();
    expect(within(footer).queryByRole('link', { name: 'TikTok' })).toBeNull();
    for (const link of footer.querySelectorAll('a')) expect(link.className, link.textContent ?? '').toContain('min-h-11');
  });

  it('datar: tidak ada kelas shadow (kecuali tombol melayang Shell); kartu radius 8, tombol radius 6; kode tanpa penyimpanan', () => {
    const container = demo();
    const shadows = Array.from(container.querySelectorAll('[class*="shadow"]')).filter(
      (el) => !el.closest('[aria-label="Chat WhatsApp"]') && !/Chat WhatsApp|Kembali ke atas/.test(el.getAttribute('aria-label') ?? ''),
    );
    expect(shadows.map((el) => el.className)).toEqual([]);
    const source = [
      ...SOURCE.tsx.map((f) => readFileSync(resolve(ROOT, `src/templates/specialistplus/${f}.tsx`), 'utf8')),
      ...SOURCE.ts.map((f) => readFileSync(resolve(ROOT, `src/templates/specialistplus/${f}.ts`), 'utf8')),
      readFileSync(resolve(ROOT, 'src/templates/specialistplus/specialistplus.css'), 'utf8'),
    ].join('\n');
    expect(source).not.toMatch(/\bshadow-|box-shadow|text-shadow|drop-shadow/);
    // Berkas UTF-8 bersih (tanpa mojibake "â€", "Â·")
    expect(source).not.toMatch(/â€|Â·|Ã/);
    // Kode (tanpa komentar): tanpa framer-motion/router, formulir tidak mengirim atau menyimpan apa pun
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/framer-motion|useLocation|useParams|localStorage|sessionStorage|fetch\(|XMLHttpRequest|sendBeacon/);
    // Impor hanya dari folder sendiri, ../shared, ../kit, ../types
    for (const [, from] of source.matchAll(/from '([^']+)'/g)) {
      if (from.startsWith('.')) expect(from, from).toMatch(/^\.\/|^\.\.\/(shared|kit|types)(\/|$)/);
    }
    for (const card of section(container, 'technology').querySelectorAll(':scope ul > li')) expect(card.className).toContain('rounded-[8px]');
    expect(within(section(container, 'hero')).getByRole('link', { name: 'Pilih Spesialis' }).className).toContain('rounded-[6px]');
  });
});

describe('SpecialistPlus: gerak', () => {
  it('pratinjau CMS diam dan tanpa tautan wa.me terbuka', () => {
    const { container } = render(<def.Component content={resolveContent(def, null)} preview />);
    expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'off');
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    expect(container.querySelector('a[href^="javascript:"], a[href^="vbscript:"]')).toBeNull();
  });

  it("specialistplus.css: animasi bergerbang [data-tpl-motion='on'], blok prefers-reduced-motion & print, kelas spx-, sekali jalan", () => {
    const css = readFileSync(resolve(ROOT, 'src/templates/specialistplus/specialistplus.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).toContain('@layer components');
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(css).toMatch(/@media print/);
    for (const name of ['spx-scan', 'spx-flash', 'spx-fade']) expect(css).toMatch(new RegExp(`@keyframes ${name}`));
    for (const rule of css.match(/^\s*[^@\s{}][^{}]*\{[^}]*\b(transition|animation):[^}]*\}/gm) ?? []) {
      const selector = rule.split('{')[0];
      if (/transition:\s*none|animation:\s*none/.test(rule)) continue;
      expect(selector, rule).toContain("[data-tpl-motion='on']");
    }
    // Isi disembunyikan (opacity 0 / scaleX 0) HANYA selagi gerak menyala dan wadahnya menunggu tampil; garis pindai
    // konsol dekoratif (aria-hidden) tak terlihat dalam keadaan diam
    for (const rule of css.match(/[^{}]+\{[^}]*(opacity:\s*0;|scaleX\(0\))[^}]*\}/g) ?? []) {
      const selector = rule.split('{')[0].trim();
      if (selector === '.spx-scan' || /^(@keyframes\b|\d+%$|from$|to$)/.test(selector)) continue;
      expect(selector, rule).toContain("[data-tpl-motion='on'] [data-reveal='pending']");
    }
    for (const cls of css.match(/\.[a-z][\w-]*/g) ?? []) expect(cls, cls).toMatch(/^\.spx-/);
    // Durasi: hiasan ≤ 1,6 dtk, tidak berulang
    for (const [, seconds] of css.matchAll(/animation:\s*spx-[a-z]+\s+([\d.]+)s/g)) expect(Number(seconds)).toBeLessThanOrEqual(1.6);
    for (const [, seconds] of css.matchAll(/transition:[^;]*?\s([\d.]+)s/g)) expect(Number(seconds)).toBeLessThanOrEqual(1.6);
    expect(css).not.toMatch(/infinite|alternate/);
    // Konsol: garis pindai di dalam konsol yang muncul lewat <Reveal>; batang & baris tabel di dalam <Reveal>
    const container = demo();
    expect(container.querySelector('.spx-scan')!.closest('.tpl-reveal')).not.toBeNull();
    for (const el of container.querySelectorAll('.spx-bar, .spx-row')) expect(el.closest('.tpl-reveal'), el.className).not.toBeNull();
  });
});

describe('SpecialistPlus: warna tema bisa diganti', () => {
  it('teal bawaan → --tpl-accent; warna CMS mengalir ke navy, navy-2, lift, dan teal terang', () => {
    const base = demo();
    expect(rootStyle(base, '--tpl-accent')).toBe('#0e8f8a');
    expect(rootStyle(base, '--tpl-on-accent')).toBe('#121620');
    for (const [name, value] of Object.entries(spxVars('#0E8F8A') as Record<string, string>)) expect(rootStyle(base, name), name).toBe(value);
    cleanup();
    const red = demo({ brand: { accent_color: '#A61E3A' } });
    expect(rootStyle(red, '--tpl-accent')).toBe('#a61e3a');
    for (const [name, value] of Object.entries(spxVars('#A61E3A') as Record<string, string>)) expect(rootStyle(red, name), name).toBe(value);
    expect(rootStyle(red, '--spx-navy')).not.toBe(rootStyle(base, '--spx-navy'));
    cleanup();
    expect(rootStyle(demo({ brand: { accent_color: '#FACC15' } }), '--tpl-on-accent')).toBe('#121620');
  });
});

describe('SpecialistPlus: SEO situs pembeli, judul, gambar, tautan', () => {
  it('judul tab & meta description dari nama, tagline, dan deskripsi hero; theme-color = aksen', () => {
    expect(siteTitle('specialistplus', null)).toBe('SpecialistPlus Medical Center — Klinik Spesialis & Lab Medan');
    expect(siteTitle('specialistplus', null).length).toBeLessThanOrEqual(60);
    const restore = applySiteHead('specialistplus', null);
    const description = document.head.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
    expect(description).toMatch(/^Konsultasi spesialis jantung, ortopedi, dan onkologi/);
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(200);
    expect(document.head.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#0E8F8A');
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
    const untitled = demo(Object.fromEntries(ORDER.filter((k) => k !== 'hero').map((k) => [k, { title: '' }])));
    for (const key of ORDER.filter((k) => k !== 'hero')) {
      const levels = Array.from(section(untitled, key).querySelectorAll('h1, h2, h3')).map((h) => h.tagName);
      expect(levels[0], key).toBe('H2');
      expect(levels.filter((l) => l === 'H2'), key).toHaveLength(1);
    }
    expect(section(untitled, 'specialists').querySelector('h2')).toHaveClass('sr-only');
    expect(section(untitled, 'specialists').querySelector('h2')!.textContent).toBe('Spesialis');
    expect(section(untitled, 'contact').querySelector('h2')!.textContent).toBe('Kontak');
    cleanup();
    const keys = ['specialists', 'mcu', 'labresults', 'technology', 'turnaround', 'testimonials', 'faq'];
    const bare = demo(Object.fromEntries(keys.map((k) => [k, { title: '', eyebrow: '', subtitle: '' }])));
    expect(keys.map((k) => section(bare, k).querySelector('h2')?.textContent)).toEqual([
      'Spesialis',
      'Paket medical check-up',
      'Hasil lab',
      'Teknologi',
      'Waktu hasil',
      'Testimoni pasien',
      'Tanya jawab',
    ]);
    for (const k of keys) expect(section(bare, k).querySelector('h2'), k).toHaveClass('sr-only');
  });

  it('gambar: alt deskriptif, width/height, srcset & sizes', () => {
    const container = demo();
    const imgs = Array.from(container.querySelectorAll('img'));
    expect(imgs).toHaveLength(8);
    for (const img of imgs) {
      const src = img.getAttribute('src') ?? '';
      expect(src, src).toMatch(/^\/assets\/templates\/photos\/specialistplus-/);
      expect(Number(img.getAttribute('width')), src).toBeGreaterThan(0);
      expect(Number(img.getAttribute('height')), src).toBeGreaterThan(0);
      expect(img.getAttribute('srcset'), src).toMatch(/ 800w, /);
      expect(img.getAttribute('sizes'), src).toBeTruthy();
      expect(img.getAttribute('alt')!.split(' ').length, src).toBeGreaterThanOrEqual(5);
    }
  });

  it('tautan asli untuk navigasi, tombol hanya untuk aksi (kecuali kirim formulir); SVG dekoratif tersembunyi', () => {
    const container = demo();
    for (const a of container.querySelectorAll('a')) expect(a.getAttribute('href'), a.textContent ?? '').toMatch(/^(#[a-z]|https:\/\/|mailto:|tel:)/);
    for (const button of container.querySelectorAll('button')) {
      expect(button.getAttribute('type'), button.textContent ?? '').toBe(button.closest('form') && /WhatsApp|Susun pesan/.test(button.textContent ?? '') ? 'submit' : 'button');
    }
    expect(container.querySelectorAll('button[type="submit"]')).toHaveLength(1);
    for (const svg of container.querySelectorAll('svg')) expect(svg.closest('[aria-hidden="true"], [aria-hidden=""]') ?? svg.getAttribute('aria-hidden'), svg.outerHTML.slice(0, 60)).toBeTruthy();
  });
});

describe('SpecialistPlus: konten opsional kosong', () => {
  it('hero: tanpa angka → konsol tanpa metrik; Spesialis disembunyikan → konsol tanpa pencari, tombol ke Kontak; tanpa keduanya → tanpa konsol', () => {
    const noStats = section(demo({ hero: { stats: [], header_label: '', console_note: '' } }), 'hero');
    const box = noStats.querySelector('[data-spx-console]')!;
    expect(box.querySelectorAll('dl')).toHaveLength(1);
    expect(box.textContent).not.toContain('Jadwal contoh');
    expect(noStats.querySelector('img[fetchpriority="high"]')).not.toBeNull();
    expect(within(document.querySelector('header')!).queryByRole('link', { name: 'Daftar Konsultasi' })).toBeNull();
    cleanup();
    const container = demo({ specialists: { enabled: false } });
    const hero = section(container, 'hero');
    const consoleBox = hero.querySelector('[data-spx-console]')!;
    expect(consoleBox.querySelector('select')).toBeNull();
    expect(consoleBox.querySelector('[data-spx-readout]')).toBeNull();
    expect(texts(consoleBox.querySelectorAll('dt'))).toEqual(['Spesialis', 'Pemeriksaan lab', 'Hasil lab rutin']);
    expect(within(hero).queryByRole('link', { name: 'Lihat jadwal dokter' })).toBeNull();
    expect(within(hero).getByRole('link', { name: 'Pilih Spesialis' })).toHaveAttribute('href', '#kontak');
    expect(texts(container.querySelector('footer')!.querySelectorAll('p'))).not.toContain('Klinik');
    cleanup();
    const bare = section(demo({ hero: { stats: [] }, specialists: { enabled: false } }), 'hero');
    expect(bare.querySelector('[data-spx-console]')).toBeNull();
    expect(bare.querySelector('h1')).not.toBeNull();
    cleanup();
    // Tanpa foto → latar navy-teal cadangan, tanpa <img>
    const noPhoto = section(demo({ hero: { image: '' } }), 'hero');
    expect(noPhoto.querySelector('img')).toBeNull();
    expect(noPhoto.className).toContain('spx-hero-fallback');
  });

  it('klinik tanpa foto & tanpa dokter: panel selebar wadah, "Jadwal menyusul", konsol "–", tanpa tabel', () => {
    const container = demo({
      specialists: { items: [{ tab: 'Mata', name: 'Klinik Mata', code: 'mat', summary: 'Pemeriksaan mata.' }], doctors: [] },
    });
    const specialists = section(container, 'specialists');
    expect(within(specialists).getAllByRole('tab')).toHaveLength(1);
    expect(within(specialists).getByRole('tab').textContent).toBe('MATMataJadwal menyusul');
    const panel = within(specialists).getByRole('tabpanel');
    expect(panel.querySelector('img')).toBeNull();
    expect(panel.querySelector('table')).toBeNull();
    expect(panel.innerHTML).toContain('@3xl:col-span-12');
    expect(panel.textContent).toContain('Jadwal contoh dan dapat berubah.');
    const hero = section(container, 'hero');
    expect(texts(hero.querySelectorAll('[data-spx-readout] dt'))).toEqual(['Dokter', 'Hari praktik']);
    expect(texts(hero.querySelectorAll('[data-spx-readout] dd'))).toEqual(['–', '–']);
    // Satu klinik → kepala konsol tanpa penghitung "01/06"
    expect(hero.querySelector('[data-spx-console]')!.textContent).not.toContain('01/01');
  });

  it('MCU tanpa label sorotan & paket tanpa nama; hasil lab tanpa portal & langkah; alat tanpa foto/spesifikasi', () => {
    const container = demo({
      mcu: { packages: [{ code: 'A', name: 'Dasar', price: 'Rp500.000' }, { code: 'B', name: 'Plus' }, { code: 'C', name: '' }], rows: [{ label: 'Darah', packages: 'A B' }] },
      labresults: { portal_url: '', steps: [], notice: '' },
      technology: { items: [{ code: 'USG', name: 'USG 4D', text: 'Pemeriksaan kehamilan.', specs: '' }] },
    });
    const mcu = section(container, 'mcu');
    const table = mcu.querySelector('table')!;
    expect(table.querySelectorAll('thead th')).toHaveLength(3);
    expect(table.innerHTML).not.toContain('color-mix');
    expect(table.querySelector('tfoot')!.textContent).toContain('1 pemeriksaan');
    expect(within(table).getAllByRole('link', { name: /^Pesan paket: / })).toHaveLength(2);
    const labresults = section(container, 'labresults');
    expect(labresults.querySelector('ol')).toBeNull();
    expect(within(labresults).queryByRole('link', { name: /portal/i })).toBeNull();
    // Catatan privasi kosong → kalimat bawaan tetap tampil
    expect(labresults.textContent).toContain('Hasil lab tidak ditampilkan di website ini.');
    const technology = section(container, 'technology');
    expect(technology.querySelector('img')).toBeNull();
    expect(technology.querySelector('dl')).toBeNull();
    expect(technology.querySelector('ul')!.className).toContain('@7xl:grid-cols-3');
    cleanup();
    const hidden = demo({ mcu: { packages: [{ code: 'A', name: '' }] }, testimonials: { items: [] }, footer: { enabled: false } });
    expect(sectionKeys(hidden)).not.toContain('mcu');
    expect(sectionKeys(hidden)).not.toContain('testimonials');
    expect(hidden.querySelector('footer')).toBeNull();
    expect(Array.from(hidden.querySelector('header nav')!.querySelectorAll('a')).map((a) => a.getAttribute('href'))).not.toContain('#mcu');
    expect(within(section(hidden, 'hero')).queryByRole('link', { name: 'Paket MCU' })).toBeNull();
  });

  it('kontak tanpa foto & peta → kolom teks melebar; footer tanpa media sosial; testimoni tanpa kota', () => {
    const container = demo({
      contact: { image: '', address: '', maps_query: '', maps_url: '', units: [], emergency: '' },
      footer: { instagram: '', facebook: '', youtube: '', disclaimer: '' },
      testimonials: { items: [{ name: 'Budi', quote: 'Rapi.' }] },
    });
    const contact = section(container, 'contact');
    expect(contact.querySelector('img')).toBeNull();
    expect(contact.querySelector('iframe')).toBeNull();
    expect(contact.innerHTML).toContain('@5xl:col-span-8');
    expect(contact.querySelector('table')).toBeNull();
    expect(within(contact).queryByRole('link', { name: 'Telepon 119' })).toBeNull();
    const footer = container.querySelector('footer')!;
    expect(footer.textContent).not.toContain('Media sosial');
    expect(footer.textContent).not.toContain('fiktif');
    expect(texts(section(container, 'testimonials').querySelectorAll('figcaption'))).toEqual(['BUBudiPasien']);
  });

  it('tanpa WhatsApp → daftar & pesan paket ke Kontak, hasil lab lewat email; tanpa WhatsApp & email → salin pesan', () => {
    const fill = (formEl: HTMLElement) => {
      fireEvent.change(within(formEl).getByLabelText('No. registrasi'), { target: { value: 'LAB-1234' } });
      fireEvent.change(within(formEl).getByLabelText('Tanggal lahir'), { target: { value: '1990-01-05' } });
      fireEvent.change(within(formEl).getByLabelText('Nama pasien'), { target: { value: 'Rina' } });
      act(() => {
        fireEvent.submit(formEl);
      });
    };
    const container = demo({ contact: { whatsapp: '' } });
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    expect(within(section(container, 'specialists').querySelector('table')!).getAllByRole('link', { name: /^Daftar: / })[0]).toHaveAttribute('href', '#kontak');
    expect(within(section(container, 'mcu').querySelector('table')!).getAllByRole('link', { name: /^Pesan paket: / })[0]).toHaveAttribute('href', '#kontak');
    const labresults = section(container, 'labresults');
    const formEl = within(labresults).getByRole('form');
    expect(within(formEl).getByRole('button', { name: 'Susun pesan' })).toHaveAttribute('type', 'submit');
    fill(formEl);
    expect(within(labresults).getByRole('link', { name: 'Kirim lewat email' }).getAttribute('href')).toMatch(
      /^mailto:pendaftaran@specialistplus\.test\?subject=Permintaan%20hasil%20lab&body=Halo%20SpecialistPlus/,
    );
    cleanup();
    const bare = section(demo({ contact: { whatsapp: '', email: '' } }), 'labresults');
    fill(within(bare).getByRole('form'));
    expect(within(bare).getByRole('button', { name: 'Salin pesan' })).toHaveAttribute('type', 'button');
  });
});

describe('SpecialistPlus: editor CMS', () => {
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
        const items = (content[s.key][f.key] as unknown[]).length;
        if (items < f.max!) expect(box.getByRole('button', { name: new RegExp(`Tambah ${f.itemLabel}`, 'i') })).toBeInTheDocument();
        fireEvent.click(box.getAllByRole('button', { name: new RegExp(`^${f.itemLabel} 1(?![0-9])`) })[0]);
        for (const sub of f.fields) expect(container.textContent, `${s.key}.${f.key}.${sub.key}`).toContain(sub.label);
      }
      unmount();
    }
  }, 60_000);
});

describe('SpecialistPlus: data katalog', () => {
  const MIGRATION = 'database/migrations/2026-10-28_046_specialistplus_template.sql';
  const sql = () => readFileSync(resolve(ROOT, MIGRATION), 'utf8');

  it('migrasi 046: baris specialistplus dengan kategori baru, harga, pratinjau, galeri, fitur, dan kalimat jujur', () => {
    const text = sql();
    expect(text).toContain("'specialistplus'");
    expect(text).toContain("'Kesehatan & Rumah Sakit'");
    expect(text).toContain('1890000.00');
    expect(text).toContain("'/assets/templates/specialistplus-preview.webp'");
    expect(text).toContain('\'["/assets/templates/specialistplus-1.webp","/assets/templates/specialistplus-2.webp"]\'');
    expect(text).toMatch(/data tidak disimpan di website dan hasil lab tidak ditampilkan di website/);
    expect(text).toMatch(/Tidak ada rekam medis, pembayaran online, atau konsultasi video/);
    expect(text).not.toMatch(/termasuk domain|domain, hosting|\bKARS\b|terakreditasi|dijamin|garansi|terbaik/i);
    const features = JSON.parse(/features\s+= '(\[.*\])'/.exec(text)![1]) as string[];
    expect(features.length).toBeGreaterThanOrEqual(6);
    expect(features.length).toBeLessThanOrEqual(8);
    expect(features[features.length - 1]).toBe('Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)');
    const short = /short_description = '([^']*)'/.exec(text)![1];
    expect(short.length).toBeLessThanOrEqual(200);
  });

  it('migrasi 046 aman diulang (INSERT IGNORE + UPDATE berdasarkan slug, tanpa DELETE) dan tercatat di schema_migrations', () => {
    const raw = sql();
    expect(raw).toMatch(/Domain\s+(--\s+)?tidak termasuk harga template/);
    expect(raw).toMatch(/dibayar terpisah/);
    expect(raw).toMatch(/FIKTIF/);
    expect(raw).toMatch(/kategori baru/);
    expect(raw).toMatch(/SETELAH kode/);
    expect(raw).toMatch(/MENIMPA perubahan admin/);
    expect(raw).toMatch(/Unsplash/);
    const text = raw.replace(/^--.*$/gm, '');
    expect(text).toMatch(/INSERT IGNORE INTO templates/);
    expect(text).toMatch(/WHERE slug = 'specialistplus';/);
    expect(text).toMatch(/sort_order\s+= 29/);
    expect(text).toMatch(/status\s+= 'published'/);
    expect(text).toMatch(/category\s+= 'Kesehatan & Rumah Sakit'/);
    expect(text).toMatch(/price\s+= 1890000\.00/);
    expect(text).not.toMatch(/\bDELETE\b|\bDROP\b|\bTRUNCATE\b|\bALTER\b/);
    expect(text).toContain("VALUES ('2026-10-28_046', 'templates: katalog SpecialistPlus')");
  });

  it('gambar pratinjau katalog ada di public/, 1600×1000, dan ringan', () => {
    for (const name of ['specialistplus-preview', 'specialistplus-1', 'specialistplus-2']) {
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

describe('SpecialistPlus: konten aneh', () => {
  it('angka, null, dan string di tempat list tidak membuat crash; tautan berbahaya dibuang', () => {
    const weird = {
      hero: { image: 'javascript:alert(1)', highlight: 'tidak ada di judul', primary_url: 'javascript:alert(1)', stats: [{ value: 5 }, null, 'x'] },
      specialists: { items: [null, { tab: 3 }, { tab: 'Jantung', image: 'javascript:alert(1)', conditions: 7 }], doctors: 'x' },
      mcu: { packages: [{ name: 'Dasar', code: 5 }, null], rows: [{ label: 'EKG', packages: null }, 'x'] },
      labresults: { steps: 'x', portal_url: 'javascript:alert(1)' },
      technology: { items: [{ name: 'MRI', specs: 42, image: 'javascript:alert(1)' }] },
      turnaround: { items: [{ name: 'Gula', value: 'abc' }, { name: 'Darah', value: '3', unit: null }] },
      testimonials: { items: [{ quote: 'Baik', name: null }] },
      faq: { items: [{ question: 2, answer: null }], link_url: 'vbscript:x' },
      contact: { whatsapp: 'abc', units: 'x', maps_url: 'javascript:alert(1)', image: 'javascript:alert(1)' },
      footer: { instagram: 'javascript:alert(1)' },
      brand: { accent_color: 'oranye' },
    } as unknown as SiteContent;
    const { container } = render(<def.Component content={resolveContent(def, weird)} />);
    expect(container.querySelector('a[href^="javascript:"], a[href^="vbscript:"]')).toBeNull();
    expect(container.querySelector('img[src^="javascript:"]')).toBeNull();
    expect(container.querySelector('iframe[src^="javascript:"]')).toBeNull();
    expect(container.querySelector('h1')!.textContent).toBe('Spesialis, lab, dan radiologi dalam satu pusat');
    expect(section(container, 'specialists').textContent).toContain('Jantung');
    expect(section(container, 'mcu').textContent).toContain('Dasar');
    expect(section(container, 'turnaround').textContent).toContain('Darah');
    expect(section(container, 'turnaround').textContent).not.toContain('Gula');
    expect(rootStyle(container, '--tpl-accent')).toBe('#0e8f8a');
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
