// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/momkid.test.tsx
// MomKid Hospital (website rumah sakit ibu & anak 2026-10-28): skema CMS & konten demo, foto (registry, berkas, bobot),
// salinan demo yang jujur (tanpa klaim akreditasi/hasil, imunisasi = ringkasan, dokter tanpa foto, formulir hanya
// menyusun pesan WhatsApp), helper model (warna pastel turunan, menu, tujuan tautan, nada section, jadwal imunisasi,
// hari praktik, pesan WhatsApp, formulir pendaftaran), demo (urutan section, hero cradle, header + menu HP, tab
// perjalanan, pilihan kamar, umur imunisasi, rel foto tur, akordeon, formulir), datar tanpa bayangan, gerak (pratinjau
// CMS diam, CSS mk- bergerbang data-tpl-motion, chip berhenti), warna tema, SEO situs pembeli, judul & gambar & tautan,
// konten opsional kosong, editor CMS, data katalog (migrasi 045 + pratinjau), dan konten aneh.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionEditor } from '../../pages/account/cms/SectionEditor';
import { validateContent } from '../../pages/account/cms/validation';
import { TEMPLATES, resolveContent } from '../index';
import { stageDoodle } from '../momkid/icons';
import {
  CREAM,
  DEFAULT_SERVICES,
  EMPTY_VISIT,
  IMMUNIZATION_NOTE,
  MINT,
  MUTED,
  PAGE_SECTIONS,
  ageOptions,
  cleanText,
  daysSentence,
  displayPhone,
  doctorMessage,
  formatVisitDate,
  glue,
  immunizationMessage,
  immunizationStops,
  lactationMessage,
  momkidVars,
  navItems,
  nextStop,
  packageMessage,
  parseAge,
  parseDays,
  progressOf,
  readMomkid,
  sectionShown,
  sectionTarget,
  sectionTones,
  splitTags,
  startAge,
  stopState,
  validateVisit,
  visitMailHref,
  visitMessage,
  visitServices,
  type VisitForm,
} from '../momkid/model';
import { MOMKID_PHOTOS } from '../momkid/photos';
import { applySiteHead, siteTitle } from '../siteHead';
import { SiteRenderer } from '../SiteRenderer';
import { contrast, parseHex } from '../shared/utils';
import { isListField, type SiteContent } from '../types';

// Demo panjang + getByRole di jsdom: bisa lewat 5 dtk saat suite berjalan paralel
vi.setConfig({ testTimeout: 30_000 });

const ROOT = process.cwd();
const def = TEMPLATES.momkid;
const ORDER = ['hero', 'journey', 'packages', 'immunization', 'pediatrics', 'lactation', 'tour', 'articles', 'testimonials', 'faq', 'cta', 'contact'];
const sectionKeys = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-tpl-section]')).map((s) => s.getAttribute('data-tpl-section'));
const section = (root: HTMLElement, key: string) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`)!;
const demo = (content: unknown = null, preview = false) => render(<SiteRenderer templateCode="momkid" content={content} preview={preview} />).container;
const rgb = (hex: string) => parseHex(hex)!;
const publicFile = (url: string) => resolve(ROOT, 'public', url.replace(/^\//, ''));
const rootStyle = (container: HTMLElement, name: string) => {
  const holder = Array.from(container.querySelectorAll<HTMLElement>('[style]')).find((el) => el.style.getPropertyValue(name));
  return holder?.style.getPropertyValue(name) ?? '';
};
const urls = (src: string) => {
  const asset = MOMKID_PHOTOS.asset(src)!;
  return [asset.src, ...asset.srcSet!.split(',').map((part) => part.trim().split(' ')[0])].filter((u, i, all) => all.indexOf(u) === i);
};
/** Judul memakai spasi tak-putus setelah "si" (glue); bandingkan sebagai teks biasa. */
const plain = (value: string | null | undefined) => (value ?? '').replace(/\u00A0/g, ' ');
const waText = (a: Element) => decodeURIComponent(a.getAttribute('href')!.replace(/^https:\/\/wa\.me\/6281234567890\?text=/, ''));
const visit = (patch: Partial<VisitForm> = {}): VisitForm => ({ ...EMPTY_VISIT, name: 'Rina Kartika', service: 'Imunisasi', ...patch });
const SERVICES = [...DEFAULT_SERVICES];
const COMPANY = 'RSIA MomKid';

let scrolled: (string | null)[] = [];
beforeEach(() => {
  scrolled = [];
  Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
    scrolled.push(this.getAttribute('data-tpl-section'));
  });
  Element.prototype.scrollBy = vi.fn() as unknown as Element['scrollBy'];
});
afterEach(cleanup);

describe('MomKid: skema & konten bawaan', () => {
  it('urutan form = urutan halaman, semua section bisa disembunyikan, field unik, list berbatas', () => {
    expect(def.code).toBe('momkid');
    expect(def.name).toBe('MomKid Hospital');
    expect(def.features).toBeUndefined();
    expect(def.sections.map((s) => s.key)).toEqual(['brand', ...ORDER, 'footer']);
    expect([...PAGE_SECTIONS]).toEqual([...ORDER, 'footer']);
    const fields = (key: string) => def.sections.find((s) => s.key === key)!.fields.map((f) => f.key);
    expect(fields('brand')).toEqual(['company_name', 'tagline', 'logo', 'accent_color']);
    expect(def.sections[0].fields.find((f) => f.key === 'accent_color')?.type).toBe('color');
    expect(fields('hero')).toEqual(expect.arrayContaining(['image', 'chips', 'highlight', 'primary_label', 'secondary_label', 'header_label', 'note']));
    expect(fields('immunization')).toEqual(expect.arrayContaining(['select_label', 'start_age', 'note', 'button_label', 'items']));
    expect(fields('packages')).toEqual(expect.arrayContaining(['option_a', 'option_b', 'note', 'items']));
    expect(fields('contact')).toEqual(
      expect.arrayContaining(['address', 'maps_query', 'maps_url', 'phone', 'email', 'whatsapp', 'whatsapp_message', 'hours', 'emergency_phone', 'form_services']),
    );
    expect(fields('footer')).toEqual(expect.arrayContaining(['description', 'disclaimer', 'instagram', 'facebook', 'linkedin', 'youtube', 'tiktok']));
    const contact = def.sections.find((s) => s.key === 'contact')!;
    expect(contact.fields.find((f) => f.key === 'whatsapp')?.type).toBe('phone');
    // Dokter anak TANPA kolom foto (nama dokter demo fiktif → inisial, bukan foto stok)
    const doctors = def.sections.find((s) => s.key === 'pediatrics')!.fields.find((f) => f.key === 'items');
    expect(doctors && isListField(doctors) && doctors.fields.map((f) => f.type)).not.toContain('image');
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
    // Batas yang disebut di halaman katalog (momkid.content.ts)
    expect(max).toEqual({
      'hero.chips': 3,
      'journey.stages': 4,
      'packages.items': 4,
      'immunization.items': 12,
      'pediatrics.items': 8,
      'lactation.services': 6,
      'lactation.schedule': 4,
      'tour.items': 8,
      'articles.items': 6,
      'testimonials.items': 6,
      'faq.items': 8,
      'contact.form_services': 8,
    });
  });

  it('konten demo lolos validasi CMS, logo kosong, semua foto terdaftar, ada di public/, dan dipakai', () => {
    const c = def.defaultContent;
    expect(validateContent(def, resolveContent(def, null))).toEqual({});
    expect(c.brand.logo).toBe('');
    expect(c.brand.accent_color).toBe('#E8826A');
    expect(c.contact.whatsapp).toBe('081234567890');
    expect(c.hero.image).toBe('/assets/templates/photos/momkid-hero-1920.webp');
    for (const s of def.sections) if (s.key !== 'brand') expect(c[s.key].enabled, s.key).toBe(true);
    const photos = JSON.stringify(c).match(/\/assets\/templates\/photos\/[a-z0-9-]+\.webp/g) ?? [];
    for (const src of photos) expect(MOMKID_PHOTOS.asset(src), src).not.toBeNull();
    expect(MOMKID_PHOTOS.keys).toHaveLength(16);
    for (const key of MOMKID_PHOTOS.keys) {
      expect(key.startsWith('momkid-'), key).toBe(true);
      for (const url of urls(MOMKID_PHOTOS.src(key))) expect(existsSync(publicFile(url)), url).toBe(true);
      expect(photos, `${key} dipakai di konten demo`).toContain(MOMKID_PHOTOS.src(key));
      expect(MOMKID_PHOTOS.alt(MOMKID_PHOTOS.src(key), '').split(' ').length, key).toBeGreaterThanOrEqual(5);
    }
    // Simbol bawaan juga tersedia sebagai SVG mandiri, path sama dengan komponen
    const mark = readFileSync(publicFile('/assets/templates/logos/momkid-mark.svg'), 'utf8');
    const component = readFileSync(resolve(ROOT, 'src/templates/momkid/marks.tsx'), 'utf8');
    const paths = mark.match(/ d="[^"]+"/g) ?? [];
    expect(paths).toHaveLength(3);
    for (const d of paths) expect(component, d).toContain(d.trim());
    expect(mark).toMatch(/viewBox="0 0 32 32"/);
    expect(mark).toMatch(/role="img"/);
    expect(mark).toMatch(/<title>/);
    expect(mark).toMatch(/fill="currentColor"/);
    // Judul tab situs pembeli ≤ 60 karakter, deskripsi hero 120–155 karakter, judul hero ≤ 9 kata
    expect(`${c.brand.company_name} — ${c.brand.tagline}`.length).toBeLessThanOrEqual(60);
    expect(String(c.hero.subtitle).length).toBeGreaterThanOrEqual(120);
    expect(String(c.hero.subtitle).length).toBeLessThanOrEqual(155);
    expect(String(c.hero.title).split(' ').length).toBeLessThanOrEqual(9);
  });

  it('foto tercatat di CREDITS.md', () => {
    const credits = readFileSync(resolve(ROOT, 'public/assets/templates/photos/CREDITS.md'), 'utf8');
    // CREDITS.md gets this template's section at integration
    expect(MOMKID_PHOTOS.keys.filter((key) => !credits.includes(`\`${key}-*\``))).toEqual([]);
  });

  it('foto demo ringan: hero 800/1280/1920, WebP ≤ 140 KB per file (800w ≤ 90 KB), total ≤ 2,5 MB', () => {
    expect(MOMKID_PHOTOS.asset(def.defaultContent.hero.image as string)!.srcSet).toBe(
      '/assets/templates/photos/momkid-hero-800.webp 800w, /assets/templates/photos/momkid-hero-1280.webp 1280w, /assets/templates/photos/momkid-hero-1920.webp 1920w',
    );
    let total = 0;
    for (const key of MOMKID_PHOTOS.keys) {
      for (const url of urls(MOMKID_PHOTOS.src(key))) {
        expect(url, url).toMatch(/\.webp$/);
        const kb = statSync(publicFile(url)).size / 1024;
        expect(kb, url).toBeLessThanOrEqual(140);
        if (url.endsWith('-800.webp')) expect(kb, url).toBeLessThanOrEqual(90);
        total += kb;
      }
    }
    expect(total).toBeLessThanOrEqual(2500);
  });

  it('salinan demo jujur: tanpa klaim akreditasi/hasil/unggul, imunisasi = ringkasan, darurat → IGD/119, formulir hanya WhatsApp', () => {
    const text = JSON.stringify(def.defaultContent);
    expect(text).not.toMatch(/dijamin|garansi|pasti|terbaik|nomor 1|#1|termurah|100%|terakreditasi|akreditasi|\bKARS\b|sembuh|bersertifikat|\bISO\b/i);
    expect(text).toMatch(/data tidak disimpan di website/);
    expect(text).toMatch(/Ringkasan, ikuti anjuran dokter anak/);
    expect(text).toMatch(/IGD terdekat atau telepon 119/);
    expect(text).toMatch(/fiktif/);
    expect(text).toContain('.test');
    // Nama dokter fiktif bergelar dan tanpa foto; testimoni = orang tua (nama depan + kota)
    const doctors = def.defaultContent.pediatrics.items as Record<string, string>[];
    for (const d of doctors) {
      expect(d.name, d.name).toMatch(/^dr\. .+, Sp\.A$/);
      expect(Object.keys(d)).not.toContain('photo');
      expect(Object.keys(d)).not.toContain('image');
    }
    for (const t of def.defaultContent.testimonials.items as Record<string, string>[]) {
      expect(t.name, t.name).toMatch(/^(Bunda|Ayah) [A-Z][a-z]+$/);
      expect(t.detail, t.detail).toMatch(/^[A-Z][a-z]+ · /);
    }
  });
});

describe('MomKid: helper model', () => {
  it('warna tema: teks berwarna tema ≥ 4,6:1 di semua permukaan pastel, teks kedua ≥ 4,6:1 di peach; tidak valid → bawaan', () => {
    expect(momkidVars('#E8826A')).toEqual({ '--mk-peach-soft': '#fcebe4', '--mk-peach': '#fadfd6', '--mk-accent-text': '#915243' });
    const white = rgb('#ffffff');
    const ink = rgb('#2E2228');
    for (const accent of ['#E8826A', '#1D4ED8', '#A61E3A', '#B7791F', '#FACC15', '#C6F135', '#FFFFFF', '#000000', '#6EE7B7', '#7C3AED', '#12A07F', '#0F5C63']) {
      const vars = momkidVars(accent) as Record<string, string>;
      const soft = rgb(vars['--mk-peach-soft']);
      const peach = rgb(vars['--mk-peach']);
      const text = rgb(vars['--mk-accent-text']);
      for (const [name, surface] of [
        ['peach', peach],
        ['peach-soft', soft],
        ['mint', MINT],
        ['krem', CREAM],
        ['putih', white],
      ] as const) {
        expect(contrast(text, surface), `${accent} teks di ${name}`).toBeGreaterThanOrEqual(4.6);
      }
      expect(contrast(MUTED, peach), accent).toBeGreaterThanOrEqual(4.6);
      expect(contrast(MUTED, soft), accent).toBeGreaterThanOrEqual(4.6);
      expect(contrast(ink, peach), accent).toBeGreaterThanOrEqual(10);
    }
    expect(momkidVars('zzz')).toEqual(momkidVars('#E8826A'));
    expect(momkidVars('')).toEqual(momkidVars('#E8826A'));
  });

  it('menu: label pendek bawaan, kapsul layar lebar = tautan utama, section kosong keluar dari menu', () => {
    const content = resolveContent(def, null);
    expect(navItems(content).map((i) => `${i.key}:${i.label}${i.primary ? '*' : ''}`)).toEqual([
      'journey:Layanan',
      'packages:Paket*',
      'immunization:Imunisasi*',
      'pediatrics:Dokter Anak*',
      'lactation:Laktasi*',
      'tour:Tur Kamar*',
      'articles:Artikel',
      'faq:Tanya Jawab',
      'contact:Kontak*',
    ]);
    const less = resolveContent(def, {
      packages: { items: [] },
      immunization: { items: [{ age: 'x', vaccines: 'BCG' }, { age: '2', vaccines: '' }] },
      tour: { items: [{ caption: 'tanpa foto' }] },
      faq: { enabled: false },
    });
    expect(navItems(less).map((i) => i.key)).toEqual(['journey', 'pediatrics', 'lactation', 'articles', 'contact']);
  });

  it('tujuan tautan: anchor Indonesia dan kunci section; section tersembunyi → cadangan', () => {
    expect(sectionTarget('#paket')).toBe('packages');
    expect(sectionTarget('#imunisasi')).toBe('immunization');
    expect(sectionTarget('#dokter-anak')).toBe('pediatrics');
    expect(sectionTarget('#laktasi')).toBe('lactation');
    expect(sectionTarget('#tur')).toBe('tour');
    expect(sectionTarget('#artikel')).toBe('articles');
    expect(sectionTarget('#kontak')).toBe('contact');
    expect(sectionTarget('#pendaftaran')).toBe('contact');
    expect(sectionTarget('#testimoni')).toBe('testimonials');
    expect(sectionTarget('#ajakan')).toBe('cta');
    expect(sectionTarget('packages')).toBe('packages');
    expect(sectionTarget('#tidak-ada')).toBeNull();
    const m = readMomkid(resolveContent(def, null));
    expect(m.linkOr('#paket', null)).toEqual({ kind: 'section', target: 'packages' });
    expect(m.linkOr('#tidak-ada', m.visitAction)).toEqual({ kind: 'section', target: 'contact' });
    expect(m.linkOr('https://contoh.test/portal', null)).toEqual({ kind: 'external', href: 'https://contoh.test/portal' });
    expect(m.primaryAction).toEqual({ kind: 'section', target: 'packages' });
    expect(m.secondaryAction).toEqual({ kind: 'section', target: 'pediatrics' });
    expect(m.headerAction).toEqual({ kind: 'section', target: 'contact' });
    expect(m.chips.map((c) => [c.label, c.action])).toEqual([
      ['Klinik laktasi', { kind: 'section', target: 'lactation' }],
      ['Imunisasi', { kind: 'section', target: 'immunization' }],
      ['Dokter anak', { kind: 'section', target: 'pediatrics' }],
    ]);
    const noPackages = readMomkid(resolveContent(def, { packages: { enabled: false } }));
    expect(noPackages.primaryAction).toEqual({ kind: 'section', target: 'contact' });
    expect(noPackages.linkOr('#paket', null)).toBeNull();
    const hidden = readMomkid(resolveContent(def, { contact: { enabled: false } }));
    expect(hidden.visitAction?.kind).toBe('external');
    expect(hidden.linkOr('#kontak', null)).toBeNull();
    const silent = readMomkid(resolveContent(def, { contact: { enabled: false, whatsapp: '' }, packages: { enabled: false } }));
    expect(silent.visitAction).toBeNull();
    expect(silent.primaryAction).toBeNull();
  });

  it('section tampil hanya bila berisi; nada krem/putih bergantian, pita mint & peach tetap', () => {
    const content = resolveContent(def, null);
    for (const key of ORDER) expect(sectionShown(content, key), key).toBe(true);
    const empty = resolveContent(def, {
      journey: { stages: [{ period: 'tanpa nama' }] },
      packages: { items: [{ summary: 'tanpa nama' }] },
      immunization: { items: [{ age: '2', vaccines: '' }, { age: 'bulan', vaccines: 'BCG' }] },
      pediatrics: { items: [{ focus: 'tanpa nama' }] },
      lactation: { title: '', image: '', services: [{ text: 'tanpa judul' }] },
      tour: { items: [{ caption: 'tanpa foto' }] },
      articles: { items: [{ excerpt: 'tanpa judul' }] },
      testimonials: { items: [{ name: 'tanpa kutipan' }] },
      faq: { items: [] },
      cta: { title: '', subtitle: '' },
    });
    for (const key of ['journey', 'packages', 'immunization', 'pediatrics', 'lactation', 'tour', 'articles', 'testimonials', 'faq', 'cta']) {
      expect(sectionShown(empty, key), key).toBe(false);
    }
    expect(sectionShown(content, 'tidak-ada')).toBe(false);
    expect(sectionTones(content)).toEqual({
      journey: 'cream',
      packages: 'white',
      immunization: 'mint',
      pediatrics: 'cream',
      lactation: 'white',
      tour: 'cream',
      articles: 'white',
      testimonials: 'cream',
      faq: 'white',
      cta: 'peach',
      contact: 'cream',
      footer: 'mint',
    });
    // Section disembunyikan → section biasa berikutnya tetap bergantian; gelombang hero mengikuti section pertama
    const skipped = resolveContent(def, { journey: { enabled: false }, packages: { enabled: false } });
    expect(sectionTones(skipped)).toMatchObject({ immunization: 'mint', pediatrics: 'cream', lactation: 'white' });
    const m = readMomkid(skipped);
    expect(m.toneAfterHero).toBe('mint');
    expect(m.afterHero('immunization')).toBe(true);
    expect(readMomkid(content).toneAfterHero).toBe('cream');
  });

  it('jadwal imunisasi: urut menurut umur, butir rusak dibuang, umur → jadwal berikutnya, isian garis', () => {
    const stops = immunizationStops(def.defaultContent.immunization);
    expect(stops.map((s) => s.months)).toEqual([0, 1, 2, 3, 4, 6, 9, 12, 18]);
    expect(stops[0]).toEqual({ months: 0, label: 'Saat lahir', vaccines: ['Hepatitis B', 'Polio 0'] });
    expect(stops[2].vaccines).toEqual(['DPT-HB-Hib 1', 'Polio 1', 'PCV 1', 'Rotavirus 1']);
    expect(ageOptions(stops)).toHaveLength(19);
    expect(ageOptions([])).toEqual([0]);
    expect(nextStop(stops, 0)).toBe(0);
    expect(nextStop(stops, 4)).toBe(4);
    expect(nextStop(stops, 5)).toBe(5);
    expect(nextStop(stops, 7)).toBe(6);
    expect(nextStop(stops, 18)).toBe(8);
    expect(nextStop(stops, 19)).toBe(-1);
    expect([0, 3, 4, 5].map((i) => stopState(i, 4))).toEqual(['done', 'done', 'next', 'later']);
    expect(stopState(8, -1)).toBe('done');
    expect(progressOf(stops, 4)).toBe(0.5);
    expect(progressOf(stops, 0)).toBe(0);
    expect(progressOf(stops, 40)).toBe(1);
    expect(startAge(def.defaultContent.immunization, stops)).toBe(4);
    expect(startAge({ start_age: '99' }, stops)).toBe(18);
    expect(startAge({ start_age: '' }, stops)).toBe(0);
    expect(parseAge('6 bulan')).toBe(6);
    expect(parseAge(' 12 ')).toBe(12);
    expect(parseAge('99')).toBe(60);
    expect(parseAge('bulan')).toBeNull();
    const messy = immunizationStops({
      items: [{ age: '12', vaccines: 'PCV · Varisela' }, { age: 'x', vaccines: 'A' }, { age: '0', label: '', vaccines: 'HB-0, Polio 0' }, { age: '2', vaccines: '' }, null],
    } as unknown as SiteContent['immunization']);
    expect(messy).toEqual([
      { months: 0, label: 'Saat lahir', vaccines: ['HB-0', 'Polio 0'] },
      { months: 12, label: '12 bulan', vaccines: ['PCV', 'Varisela'] },
    ]);
  });

  it('hari praktik: singkatan, nama lengkap, rentang → indeks Senin = 0; kalimat untuk pembaca layar', () => {
    expect(parseDays('Sen · Rab · Jum')).toEqual([0, 2, 4]);
    expect(parseDays('Senin, Kamis')).toEqual([0, 3]);
    expect(parseDays('Senin–Rabu')).toEqual([0, 1, 2]);
    expect(parseDays('Minggu, sabtu, Sen')).toEqual([0, 5, 6]);
    expect(parseDays('Setiap hari')).toEqual([]);
    expect(daysSentence([0, 2, 4])).toBe('Senin, Rabu, dan Jumat');
    expect(daysSentence([1, 3])).toBe('Selasa dan Kamis');
    expect(daysSentence([5])).toBe('Sabtu');
  });

  it('teks kecil: chip dipisah titik tengah/koma, nomor HP dikelompokkan, "si kecil" tidak terpisah, ikon tahap otomatis', () => {
    expect(splitTags('Kontrol kehamilan · USG 2D/4D, Senam hamil | Gizi')).toEqual(['Kontrol kehamilan', 'USG 2D/4D', 'Senam hamil', 'Gizi']);
    expect(splitTags('')).toEqual([]);
    expect(displayPhone('081234567890')).toBe('0812-3456-7890');
    expect(displayPhone('(021) 555-0182')).toBe('(021) 555-0182');
    expect(displayPhone('')).toBe('');
    expect(cleanText('a\u0000b\u0007  c', 10)).toBe('a b c');
    expect(glue('Siap menyambut si kecil bersama kami?')).toBe('Siap menyambut si\u00A0kecil bersama kami?');
    expect(glue('Si kecil sehat')).toBe('Si\u00A0kecil sehat');
    expect(glue('Misi kami basi')).toBe('Misi kami basi');
    expect(stageDoodle('Kehamilan', 0)).toBe('heart');
    expect(stageDoodle('Persalinan', 1)).toBe('swaddle');
    expect(stageDoodle('Tumbuh kembang', 2)).toBe('footprints');
    expect(stageDoodle('Imunisasi', 0)).toBe('shield');
    expect(stageDoodle('Lainnya', 3)).toBe('star');
  });

  it('pesan WhatsApp paket, dokter, imunisasi, laktasi: kalimat utuh; nama RS kosong → salam tanpa nama', () => {
    expect(packageMessage(COMPANY, 'Normal', 'Kamar VIP')).toBe('Halo RSIA MomKid, saya ingin bertanya tentang paket persalinan Normal (Kamar VIP).');
    expect(packageMessage('', 'Caesar', '')).toBe('Halo, saya ingin bertanya tentang paket persalinan Caesar.');
    expect(doctorMessage(COMPANY, 'dr. Nadia Prameswari, Sp.A', 'Sen · Rab · Jum', '08.00–12.00')).toBe(
      'Halo RSIA MomKid, saya ingin membuat janji konsultasi dengan dr. Nadia Prameswari, Sp.A (Sen · Rab · Jum, 08.00–12.00).',
    );
    expect(doctorMessage(COMPANY, 'dr. Rizal Hakim, Sp.A', '', '')).toBe('Halo RSIA MomKid, saya ingin membuat janji konsultasi dengan dr. Rizal Hakim, Sp.A.');
    expect(immunizationMessage(COMPANY, 4)).toBe('Halo RSIA MomKid, saya ingin menjadwalkan imunisasi. Umur anak saya: 4 bulan.');
    expect(immunizationMessage(COMPANY, 0)).toBe('Halo RSIA MomKid, saya ingin menjadwalkan imunisasi. Umur anak saya: baru lahir.');
    expect(lactationMessage(COMPANY)).toBe('Halo RSIA MomKid, saya ingin mendaftar konsultasi laktasi.');
  });

  it('formulir pendaftaran: validasi per isian, tanggal opsional tetapi harus benar, pesan WhatsApp berurutan', () => {
    expect(validateVisit(visit(), SERVICES)).toEqual({});
    expect(validateVisit(EMPTY_VISIT, SERVICES)).toEqual({ name: 'Tulis nama Anda.', service: 'Pilih layanan.' });
    expect(validateVisit(visit({ service: 'Bukan pilihan' }), SERVICES).service).toBe('Pilih layanan.');
    expect(validateVisit(visit({ name: ' a ' }), SERVICES).name).toBe('Tulis nama Anda.');
    expect(validateVisit(visit({ date: '2026-02-30' }), SERVICES).date).toBe('Pilih tanggal yang benar.');
    expect(formatVisitDate('2026-11-05')).toBe('5 November 2026');
    expect(formatVisitDate('')).toBe('');
    expect(formatVisitDate('05/11/2026')).toBeNull();
    expect(formatVisitDate('2026-13-01')).toBeNull();

    const full = visitMessage(
      visit({ detail: '4 bulan', date: '2026-11-05', time: 'Sore', payment: 'BPJS Kesehatan', note: 'Anak  kedua,\nkontrol rutin.' }),
      COMPANY,
    );
    expect(full).toBe(
      [
        'Halo RSIA MomKid, saya ingin mendaftar kunjungan.',
        '',
        'Nama: Rina Kartika',
        'Layanan: Imunisasi',
        'Usia kehamilan / umur anak: 4 bulan',
        'Tanggal kunjungan: 5 November 2026',
        'Waktu: Sore',
        'Pembayaran: BPJS Kesehatan',
        'Catatan: Anak kedua, kontrol rutin.',
      ].join('\n'),
    );
    // Isian opsional kosong / pilihan tidak dikenal tidak ikut; nama RS kosong → salam tanpa nama
    const short = visitMessage(visit({ time: 'Tengah malam', payment: 'Gratis' }), '');
    expect(short).toBe(['Halo, saya ingin mendaftar kunjungan.', '', 'Nama: Rina Kartika', 'Layanan: Imunisasi'].join('\n'));
    expect(visitMessage(visit(), COMPANY)).toContain('Pembayaran: Umum');
    expect(visitMailHref('halo@momkid.test', 'Baris 1\nBaris 2')).toBe('mailto:halo@momkid.test?subject=Pendaftaran%20kunjungan&body=Baris%201%0ABaris%202');
    expect(visitMailHref('bukan email', 'x')).toBe('');
    expect(visitServices(resolveContent(def, null).contact)).toEqual([
      'Kontrol kehamilan',
      'Persalinan',
      'Imunisasi',
      'Konsultasi dokter anak',
      'Klinik laktasi',
      'Tur kamar bersalin',
    ]);
    expect(visitServices({ form_services: [{ label: 'USG' }, { label: 'USG' }, { label: '' }] } as unknown as SiteContent['contact'])).toEqual(['USG']);
    expect(visitServices({ form_services: 'x' } as unknown as SiteContent['contact'])).toEqual(SERVICES);
  });
});

describe('MomKid: demo', () => {
  it('urutan section, satu H1, hero cradle: foto LCP (eager, srcset, ukuran, alt) tanpa reveal, chip pastel, dua tombol', () => {
    const container = demo();
    expect(sectionKeys(container)).toEqual([...ORDER, 'footer']);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const hero = section(container, 'hero');
    expect(hero.getAttribute('data-hero-layout')).toBe('cradle');
    expect(plain(hero.querySelector('h1')!.textContent)).toBe('Tempat hangat untuk Bunda dan si kecil');
    expect(hero.querySelector('h1 .mk-mark')!.textContent).toBe('hangat');
    const img = hero.querySelector<HTMLImageElement>('img[fetchpriority="high"]')!;
    expect(img.getAttribute('src')).toBe('/assets/templates/photos/momkid-hero-1920.webp');
    expect(img.getAttribute('srcset')).toContain(' 800w');
    expect(img.getAttribute('srcset')).toContain(' 1280w');
    expect(img.getAttribute('loading')).toBe('eager');
    expect(Number(img.getAttribute('width'))).toBe(1920);
    expect(Number(img.getAttribute('height'))).toBe(1080);
    expect(img.getAttribute('alt')!.split(' ').length).toBeGreaterThanOrEqual(5);
    // Foto hero = LATAR (absolut, mengisi hero di layar lebar), TIDAK di dalam <Reveal>, tanpa zoom/parallax/kelas mk-
    expect(img.closest('.tpl-reveal')).toBeNull();
    expect(img.className).not.toMatch(/tpl-photo|mk-/);
    expect(img.parentElement!.className).toMatch(/absolute/);
    expect(img.parentElement!.className).toContain('@5xl:inset-0');
    expect(hero.querySelector('.mk-hero-veil')).toHaveAttribute('aria-hidden', 'true');
    // Tepi bawah bergelombang berwarna section berikutnya (krem), dekoratif
    const wave = hero.querySelector('svg[viewBox="0 0 1440 64"]')!;
    expect(wave).toHaveAttribute('aria-hidden', 'true');
    expect(wave.getAttribute('class')).toContain('fill-[#FFF9F5]');
    // Chip pastel: 3 tautan ke section, chip ketiga hanya ≥ @xl (HP satu baris)
    const chips = within(hero).getByRole('list', { name: 'Layanan pilihan' });
    const items = Array.from(chips.querySelectorAll('li'));
    expect(items.map((li) => li.textContent)).toEqual(['Klinik laktasi', 'Imunisasi', 'Dokter anak']);
    expect(items.every((li) => li.classList.contains('mk-chip'))).toBe(true);
    expect(items.map((li) => li.querySelector('a')!.getAttribute('href'))).toEqual(['#lactation', '#immunization', '#pediatrics']);
    expect(items[2].className).toContain('hidden @xl:block');
    for (const a of chips.querySelectorAll('a')) expect(a.className).toContain('h-11');
    expect(within(hero).getByRole('link', { name: 'Lihat Paket Persalinan' })).toHaveAttribute('href', '#packages');
    expect(within(hero).getByRole('link', { name: 'Konsultasi Dokter Anak' })).toHaveAttribute('href', '#pediatrics');
    expect(hero.textContent).toContain('IGD ibu & anak buka 24 jam');
    const eager = Array.from(container.querySelectorAll('img')).filter((i) => i.getAttribute('loading') !== 'lazy');
    expect(eager.map((i) => i.getAttribute('src'))).toEqual(['/assets/templates/photos/momkid-hero-1920.webp']);
    expect(container.querySelectorAll('img[fetchpriority="high"]')).toHaveLength(1);
  });

  it('header krem menempel: kapsul menu + tombol "Daftar Kunjungan"; menu HP buka/tutup, Esc menutup dan fokus kembali', () => {
    const container = demo();
    const header = container.querySelector('header')!;
    expect(header.className).toContain('sticky');
    expect(header.className).toContain('bg-[#FFF9F5]');
    expect(header.querySelector('svg[viewBox="0 0 32 32"]'), 'MomkidMark').not.toBeNull();
    const nav = within(header).getByRole('navigation', { name: 'Menu utama' });
    expect(Array.from(nav.querySelectorAll('a')).map((a) => a.getAttribute('href'))).toEqual(['#packages', '#immunization', '#pediatrics', '#lactation', '#tour', '#kontak']);
    expect(nav.querySelector('ul')!.className).toContain('rounded-full');
    fireEvent.click(within(nav).getByRole('link', { name: 'Imunisasi' }));
    expect(scrolled).toEqual(['immunization']);
    expect(within(header).getAllByRole('link', { name: 'Daftar Kunjungan' })[0]).toHaveAttribute('href', '#kontak');
    const toggle = within(header).getByRole('button', { name: 'Buka menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle.className).toContain('h-11 w-11');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAccessibleName('Tutup menu');
    expect(within(header).getAllByRole('navigation', { name: 'Menu utama' })).toHaveLength(2);
    const panel = document.getElementById(toggle.getAttribute('aria-controls')!)!;
    expect(panel).toHaveAttribute('aria-label', 'Menu utama');
    // Menu HP: SEMUA section yang tampil (doodle + label) dan tombol penuh-lebar
    expect(within(panel).getAllByRole('link').map((a) => a.textContent)).toEqual([
      'Layanan',
      'Paket',
      'Imunisasi',
      'Dokter Anak',
      'Laktasi',
      'Tur Kamar',
      'Artikel',
      'Tanya Jawab',
      'Kontak',
      'Daftar Kunjungan',
    ]);
    for (const a of within(panel).getAllByRole('link').slice(0, -1)) expect(a.className).toContain('min-h-14');
    fireEvent.click(within(panel).getByRole('link', { name: 'Laktasi' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(scrolled).toEqual(['immunization', 'lactation']);
    fireEvent.click(toggle);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
    expect(within(header).getAllByRole('navigation', { name: 'Menu utama' })).toHaveLength(1);
  });

  it('tab perjalanan: role tablist/tab/tabpanel, aria-selected, panah kiri/kanan + Home/End memindah fokus dan panel', () => {
    const journey = section(demo(), 'journey');
    const list = within(journey).getByRole('tablist', { name: 'Tahap layanan' });
    const tabs = within(list).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['KehamilanTrimester 1–3', 'PersalinanHari H', 'Tumbuh kembang0–5 tahun']);
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
    expect(tabs.map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
    const panel = () => within(journey).getByRole('tabpanel');
    expect(panel()).toHaveAttribute('aria-labelledby', tabs[0].id);
    expect(tabs[0]).toHaveAttribute('aria-controls', panel().id);
    expect(within(panel()).getByRole('heading', { level: 3 })).toHaveTextContent('Kontrol rutin yang tenang');
    expect(Array.from(within(panel()).getByRole('list', { name: 'Layanan' }).querySelectorAll('li')).map((li) => li.textContent)).toEqual([
      'Kontrol kehamilan',
      'USG 2D/4D',
      'Kelas ibu hamil',
      'Senam hamil',
      'Konsultasi gizi',
    ]);
    expect(within(panel()).getByRole('link', { name: 'Daftar kontrol kehamilan' })).toHaveAttribute('href', '#kontak');
    expect(panel().querySelector('img')!.getAttribute('src')).toBe('/assets/templates/photos/momkid-kehamilan-1200.webp');
    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveFocus();
    expect(panel()).toHaveAttribute('aria-labelledby', tabs[1].id);
    expect(within(panel()).getByRole('heading', { level: 3 })).toHaveTextContent('Bersalin dengan didampingi');
    expect(within(panel()).getByRole('link', { name: 'Lihat paket persalinan' })).toHaveAttribute('href', '#packages');
    fireEvent.keyDown(tabs[1], { key: 'End' });
    expect(tabs[2]).toHaveFocus();
    expect(within(panel()).getByRole('link', { name: 'Lihat jadwal imunisasi' })).toHaveAttribute('href', '#immunization');
    fireEvent.keyDown(tabs[2], { key: 'ArrowRight' });
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs[0], { key: 'ArrowLeft' });
    expect(tabs[2]).toHaveFocus();
    fireEvent.keyDown(tabs[2], { key: 'Home' });
    expect(tabs[0]).toHaveFocus();
    fireEvent.click(tabs[1]);
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    for (const tab of tabs) expect(tab).toHaveAttribute('type', 'button');
  });

  it('paket persalinan: pilihan kamar (radio) mengganti harga "mulai" dan pesan WhatsApp; rel di HP, kisi di layar lebar', () => {
    const packages = section(demo(), 'packages');
    const group = within(packages).getByRole('group', { name: 'Harga untuk' });
    const first = within(group).getByRole('radio', { name: 'Kamar Kelas 1' });
    const second = within(group).getByRole('radio', { name: 'Kamar VIP' });
    expect(first).toBeChecked();
    const cards = Array.from(packages.querySelectorAll('article'));
    expect(cards.map((c) => c.querySelector('h3')!.textContent)).toEqual(['Normal', 'Caesar', 'Premium']);
    const prices = () => Array.from(packages.querySelectorAll('article p.mk-fade')).map((p) => p.textContent);
    expect(prices()).toEqual(['Rp6,5 jt', 'Rp16,5 jt', 'Rp19,5 jt']);
    const ask = () => within(packages).getAllByRole('link', { name: 'Tanya paket ini' });
    expect(waText(ask()[0])).toBe('Halo RSIA MomKid, saya ingin bertanya tentang paket persalinan Normal (Kamar Kelas 1).');
    fireEvent.click(second);
    expect(second).toBeChecked();
    expect(prices()).toEqual(['Rp9,8 jt', 'Rp21 jt', 'Rp25 jt']);
    expect(waText(ask()[2])).toBe('Halo RSIA MomKid, saya ingin bertanya tentang paket persalinan Premium (Kamar VIP).');
    expect(packages.textContent).toContain('Harga ditampilkan untuk Kamar VIP');
    // Kartu berlabel sorotan = mint, lainnya peach lembut; tanpa ring/bayangan
    expect(cards[2].className).toContain('bg-[#DDF3EA]');
    expect(cards[0].className).toContain('bg-(--mk-peach-soft)');
    expect(cards[2].textContent).toContain('Paling lengkap');
    expect(within(cards[0]).getByRole('list', { name: 'Isi paket Normal' }).querySelectorAll('li')).toHaveLength(5);
    expect(packages.textContent).toContain('Biaya akhir mengikuti kondisi medis');
    const rail = within(packages).getByRole('list', { name: 'Daftar paket persalinan' });
    expect(rail.className).toContain('snap-x');
    expect(rail.className).toContain('@4xl:grid');
    expect(rail.closest('.tpl-reveal')).not.toBeNull();
    expect(rail.querySelector('.tpl-reveal')).toBeNull();
  });

  it('jadwal imunisasi: pilihan umur menyorot jadwal berikutnya, garis terisi sampai titik itu, WhatsApp berisi umur, catatan ringkasan', () => {
    const immunization = section(demo(), 'immunization');
    expect(immunization.className).toContain('bg-[#DDF3EA]');
    const select = within(immunization).getByLabelText('Umur si kecil') as HTMLSelectElement;
    expect(select.value).toBe('4');
    expect(select.options).toHaveLength(19);
    expect(select.options[0].textContent).toBe('Baru lahir');
    expect(immunization.textContent).toContain('Ringkasan, ikuti anjuran dokter anak');
    const timeline = within(immunization).getByRole('list', { name: 'Garis waktu jadwal imunisasi' });
    expect(timeline.className).toContain('mk-timeline');
    const states = () => Array.from(timeline.querySelectorAll(':scope > li')).map((li) => li.getAttribute('data-state'));
    expect(states()).toEqual(['done', 'done', 'done', 'done', 'next', 'later', 'later', 'later', 'later']);
    expect(timeline.querySelector(':scope > li[data-state="next"]')!.textContent).toContain('Berikutnya');
    expect(within(timeline).getByRole('list', { name: 'Vaksin 4 bulan' }).textContent).toBe('DPT-HB-Hib 3Polio 3IPVRotavirus 2');
    const filled = () => Array.from(timeline.querySelectorAll('.mk-seg')).map((s) => s.className.includes('bg-(--tpl-accent)'));
    expect(filled()).toEqual([true, true, true, true, false, false, false, false]);
    const book = () => within(immunization).getByRole('link', { name: 'Jadwalkan imunisasi' });
    expect(waText(book())).toBe('Halo RSIA MomKid, saya ingin menjadwalkan imunisasi. Umur anak saya: 4 bulan.');
    fireEvent.change(select, { target: { value: '7' } });
    expect(states()).toEqual(['done', 'done', 'done', 'done', 'done', 'done', 'next', 'later', 'later']);
    expect(filled()).toEqual([true, true, true, true, true, true, false, false]);
    expect(waText(book())).toBe('Halo RSIA MomKid, saya ingin menjadwalkan imunisasi. Umur anak saya: 7 bulan.');
    expect(immunization.textContent).toContain('Jadwal berikutnya: 9 bulan.');
    fireEvent.change(select, { target: { value: '0' } });
    expect(states()[0]).toBe('next');
    expect(waText(book())).toContain('Umur anak saya: baru lahir.');
  });

  it('dokter anak: inisial tanpa foto, strip mingguan + kalimat hari untuk pembaca layar, buat janji via WhatsApp; rel di HP', () => {
    const pediatrics = section(demo(), 'pediatrics');
    expect(pediatrics.querySelector('img')).toBeNull();
    const cards = Array.from(pediatrics.querySelectorAll('article'));
    expect(cards.map((c) => c.querySelector('span[aria-hidden]')!.textContent)).toEqual(['NP', 'RH', 'LA', 'BS']);
    expect(cards.map((c) => c.querySelector('h3')!.textContent)).toEqual([
      'dr. Nadia Prameswari, Sp.A',
      'dr. Rizal Hakim, Sp.A',
      'dr. Laras Anindita, Sp.A',
      'dr. Bima Saputra, Sp.A',
    ]);
    expect(cards[0].textContent).toContain('Praktik Senin, Rabu, dan Jumat');
    const week = cards[0].querySelector('ul[aria-hidden]')!;
    expect(Array.from(week.querySelectorAll('li')).map((li) => li.className.includes('bg-(--tpl-accent)'))).toEqual([true, false, true, false, true, false, false]);
    const book = within(pediatrics).getAllByRole('link', { name: 'Buat janji' });
    expect(book).toHaveLength(4);
    expect(waText(book[0])).toBe('Halo RSIA MomKid, saya ingin membuat janji konsultasi dengan dr. Nadia Prameswari, Sp.A (Sen · Rab · Jum, 08.00–12.00).');
    expect(pediatrics.textContent).toContain('Jadwal praktik bisa berubah');
    const rail = within(pediatrics).getByRole('list', { name: 'Jadwal dokter anak' });
    expect(rail.className).toContain('snap-x');
    expect(rail).toHaveAttribute('tabindex', '0');
    // Rel = blok penampung: teks sr-only (absolut) di kartu ke-4 ikut terpotong, halaman HP tidak melebar
    expect(rail.className).toMatch(/(^|\s)relative(\s|$)/);
    expect(rail.className).toContain('overflow-x-auto');
  });

  it('laktasi (foto gumpalan, satu-satunya parallax), rel foto tur dengan tombol sebelumnya/berikutnya, artikel, testimoni', () => {
    const container = demo();
    const lactation = section(container, 'lactation');
    expect(lactation.querySelectorAll('h3')).toHaveLength(4);
    expect(Array.from(lactation.querySelectorAll('dt')).map((dt) => dt.textContent)).toEqual(['Senin–Jumat', 'Sabtu']);
    expect(waText(within(lactation).getByRole('link', { name: 'Daftar konsultasi laktasi' }))).toBe('Halo RSIA MomKid, saya ingin mendaftar konsultasi laktasi.');
    expect(lactation.querySelector('img')!.parentElement!.className).toMatch(/rounded-\[46%/);

    const tour = section(container, 'tour');
    const rail = within(tour).getByRole('list', { name: 'Foto ruangan, geser untuk melihat lainnya' });
    expect(rail).toHaveAttribute('tabindex', '0');
    expect(rail.className).toContain('mk-rail');
    expect(Array.from(rail.querySelectorAll('figcaption')).map((f) => f.textContent)).toEqual([
      '1Ruang bersalin',
      '2Kamar rawat gabung',
      '3Kamar bayi',
      '4Ruang menyusui',
      '5Ruang tunggu keluarga',
    ]);
    // Seluruh rel muncul sekali (Reveal di rel, bukan per foto)
    expect(rail.closest('.tpl-reveal')).not.toBeNull();
    expect(rail.querySelector('.tpl-reveal')).toBeNull();
    const prev = within(tour).getByRole('button', { name: 'Foto sebelumnya' });
    const next = within(tour).getByRole('button', { name: 'Foto berikutnya' });
    for (const b of [prev, next]) {
      expect(b).toHaveAttribute('aria-controls', rail.id);
      expect(b.className).toContain('h-11 w-11');
    }
    expect(prev).toBeDisabled();
    Object.defineProperty(rail, 'scrollWidth', { configurable: true, value: 2400 });
    Object.defineProperty(rail, 'clientWidth', { configurable: true, value: 1000 });
    fireEvent.scroll(rail);
    expect(next).toBeEnabled();
    fireEvent.click(next);
    expect(Element.prototype.scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: expect.any(Number) }));
    const call = vi.mocked(Element.prototype.scrollBy).mock.calls[0][0] as ScrollToOptions;
    expect(call.left).toBeGreaterThan(0);
    Object.defineProperty(rail, 'scrollLeft', { configurable: true, value: 1400 });
    fireEvent.scroll(rail);
    expect(next).toBeDisabled();
    expect(prev).toBeEnabled();
    fireEvent.click(prev);
    expect((vi.mocked(Element.prototype.scrollBy).mock.calls[1][0] as ScrollToOptions).left).toBeLessThan(0);
    expect(waText(within(tour).getByRole('link', { name: 'Jadwalkan tur' }))).toBe('Halo RSIA MomKid, saya ingin menjadwalkan tur kamar bersalin.');

    const articles = section(container, 'articles');
    const cards = Array.from(articles.querySelectorAll('article'));
    expect(cards).toHaveLength(3);
    // Layar lebar: kartu tegak, foto meregang selebar kartu (items-stretch)
    expect(cards[0].className).toContain('@4xl:items-stretch');
    expect(cards.every((c) => c.querySelector('img'))).toBe(true);
    expect(within(articles).getByRole('link', { name: 'Tanda persalinan sudah dekat' })).toHaveAttribute('href', 'https://example.com/artikel/tanda-persalinan');
    expect(within(articles).getByRole('link', { name: /Lihat semua artikel/ })).toHaveAttribute('href', 'https://example.com/artikel');
    expect(cards[1].textContent).toContain('Bayi baru lahir');
    expect(cards[1].textContent).toContain('5 menit baca');

    const testimonials = section(container, 'testimonials');
    const stories = within(testimonials).getByRole('list', { name: 'Cerita orang tua' });
    expect(stories.querySelectorAll(':scope > li')).toHaveLength(3);
    expect(Array.from(stories.querySelectorAll('figcaption img')).map((i) => i.getAttribute('alt'))).toEqual(['', '', '']);
    expect(stories.textContent).toContain('Bunda Anisa');
  });

  it('akordeon tanya jawab: aria-expanded/aria-controls, panel role=region, satu terbuka, tautan WhatsApp; IGD → 119', () => {
    const faq = section(demo(), 'faq');
    const buttons = within(faq).getAllByRole('button');
    expect(buttons).toHaveLength(6);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'true');
    expect(buttons[0].closest('h3')).not.toBeNull();
    const region = document.getElementById(buttons[0].getAttribute('aria-controls')!)!;
    expect(region).toHaveAttribute('role', 'region');
    expect(region).toHaveAttribute('data-open', 'true');
    fireEvent.click(buttons[5]);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'false');
    expect(buttons[5]).toHaveAttribute('aria-expanded', 'true');
    expect(buttons[5].textContent).toBe('Kapan harus langsung ke IGD?');
    expect(document.getElementById(buttons[5].getAttribute('aria-controls')!)!.textContent).toMatch(/segera ke IGD terdekat atau telepon 119/);
    expect(document.getElementById(buttons[0].getAttribute('aria-controls')!)).toHaveAttribute('data-open', 'false');
    fireEvent.click(buttons[5]);
    expect(buttons.every((b) => b.getAttribute('aria-expanded') === 'false')).toBe(true);
    expect(waText(within(faq).getByRole('link', { name: /Tanya lewat WhatsApp/ }))).toBe('Halo RSIA MomKid, saya ingin bertanya.');
    cleanup();
    const noWa = section(demo({ contact: { whatsapp: '' } }), 'faq');
    expect(within(noWa).queryByRole('link', { name: /Tanya lewat WhatsApp/ })).toBeNull();
  });

  it('formulir pendaftaran: galat + fokus, isian lengkap → pesan WhatsApp, ubah data; selalu ada kalimat jujur & darurat', async () => {
    const container = demo();
    const contact = section(container, 'contact');
    const formEl = within(contact).getByRole('form', { name: 'Formulir pendaftaran' });
    expect(formEl.getAttribute('action')).toBeNull();
    expect(contact.textContent).toContain('data tidak disimpan di website');
    expect(contact.textContent).toContain('segera ke IGD atau telepon 119');
    act(() => {
      fireEvent.submit(formEl);
    });
    const name = within(formEl).getByLabelText('Nama');
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAttribute('aria-describedby', `${name.id}-error`);
    expect(name).toHaveFocus();
    expect(formEl.textContent).toContain('Pilih layanan.');
    fireEvent.change(name, { target: { value: 'Rina Kartika' } });
    expect(name).not.toHaveAttribute('aria-invalid');
    fireEvent.change(within(formEl).getByLabelText('Layanan'), { target: { value: 'Imunisasi' } });
    fireEvent.change(within(formEl).getByLabelText(/^Usia kehamilan/), { target: { value: '4 bulan' } });
    fireEvent.change(within(formEl).getByLabelText(/^Tanggal kunjungan/), { target: { value: '2026-11-05' } });
    fireEvent.click(within(formEl).getByLabelText('Sore'));
    fireEvent.click(within(formEl).getByLabelText('BPJS Kesehatan'));
    fireEvent.change(within(formEl).getByLabelText(/^Catatan/), { target: { value: 'Anak kedua.' } });
    act(() => {
      fireEvent.submit(formEl);
    });
    // Fokus pindah ke judul hasil (setelah render, lewat setTimeout 0)
    await waitFor(() => expect(within(contact).getByRole('heading', { level: 3, name: 'Pesan siap dikirim' })).toHaveFocus());
    const message = contact.querySelector('pre')!.textContent!;
    expect(message).toBe(
      [
        'Halo RSIA MomKid, saya ingin mendaftar kunjungan.',
        '',
        'Nama: Rina Kartika',
        'Layanan: Imunisasi',
        'Usia kehamilan / umur anak: 4 bulan',
        'Tanggal kunjungan: 5 November 2026',
        'Waktu: Sore',
        'Pembayaran: BPJS Kesehatan',
        'Catatan: Anak kedua.',
      ].join('\n'),
    );
    const wa = within(contact).getByRole('link', { name: 'Buka WhatsApp' });
    expect(decodeURIComponent(wa.getAttribute('href')!)).toBe(`https://wa.me/6281234567890?text=${message}`);
    fireEvent.click(within(contact).getByRole('button', { name: 'Ubah data' }));
    const again = within(contact).getByRole('form');
    expect((within(again).getByLabelText('Nama') as HTMLInputElement).value).toBe('Rina Kartika');
    expect((within(again).getByLabelText('Sore') as HTMLInputElement).checked).toBe(true);
    // Kotak darurat: telepon IGD (bila diisi) + 119 selalu ada
    expect(within(contact).getByRole('link', { name: 'Telepon 119' })).toHaveAttribute('href', 'tel:119');
    expect(within(contact).getByRole('link', { name: 'Telepon IGD 0812-3456-7890' })).toHaveAttribute('href', 'tel:+6281234567890');
  });

  it('ajakan: pita peach dengan doodle berkilau (dekoratif); footer mint (bukan inverse) dengan menu, kontak, media sosial', () => {
    const container = demo();
    expect(container.querySelectorAll('[data-tpl-tone="inverse"]')).toHaveLength(0);
    const cta = section(container, 'cta');
    expect(cta.className).toContain('bg-(--mk-peach)');
    expect(plain(cta.querySelector('h2')!.textContent)).toBe('Siap menyambut si kecil bersama kami?');
    expect(cta.querySelector('h2')!.textContent).toContain('si\u00A0kecil');
    const sparks = cta.querySelectorAll('.mk-spark');
    expect(sparks).toHaveLength(6);
    for (const s of sparks) expect(s).toHaveAttribute('aria-hidden', 'true');
    expect(within(cta).getByRole('link', { name: 'Daftar Kunjungan' })).toHaveAttribute('href', '#kontak');
    expect(waText(within(cta).getByRole('link', { name: 'Chat dengan admin' }))).toBe('Halo RSIA MomKid, saya ingin bertanya.');
    // Nama tautan unik: "Chat WhatsApp" hanya tombol melayang Shell
    expect(within(container).getAllByRole('link', { name: 'Chat WhatsApp' })).toHaveLength(1);
    const footer = container.querySelector('footer')!;
    expect(footer.getAttribute('data-tpl-section')).toBe('footer');
    expect(footer.className).toContain('bg-[#DDF3EA]');
    expect(footer.textContent).toContain(`© ${new Date().getFullYear()} RSIA MomKid`);
    expect(footer.textContent).toContain('contoh fiktif');
    expect(Array.from(within(footer).getByRole('navigation', { name: 'Tautan footer' }).querySelectorAll('a')).map((a) => a.getAttribute('href'))).toContain('#packages');
    expect(within(footer).getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://instagram.com/momkid.contoh');
    expect(within(footer).getByRole('link', { name: 'TikTok' })).toHaveAttribute('href', 'https://tiktok.com/@momkid.contoh');
    expect(within(footer).queryByRole('link', { name: 'LinkedIn' })).toBeNull();
    for (const link of footer.querySelectorAll('a[href^="tel:"], a[href^="mailto:"], nav a')) expect(link.className).toContain('min-h-11');
  });

  it('datar: tidak ada kelas shadow di template (kecuali tombol melayang Shell); kode tanpa penyimpanan/fetch/router', () => {
    const container = demo();
    const shadows = Array.from(container.querySelectorAll('[class*="shadow"]')).filter(
      (el) => !el.closest('[aria-label="Chat WhatsApp"]') && !/Chat WhatsApp|Kembali ke atas/.test(el.getAttribute('aria-label') ?? ''),
    );
    expect(shadows.map((el) => el.className)).toEqual([]);
    // Kartu pastel tanpa ring (kedalaman dari warna isi, bukan garis/bayangan)
    for (const card of container.querySelectorAll('article')) expect(card.className, card.textContent?.slice(0, 30)).not.toMatch(/\bring-/);
    const tsx = ['MomKid', 'Header', 'Hero', 'Journey', 'Packages', 'Immunization', 'Pediatrics', 'Lactation', 'Tour', 'Articles', 'Testimonials', 'Closing', 'Contact', 'VisitForm', 'Footer', 'ui', 'art', 'marks'];
    const ts = ['index', 'styles', 'model', 'icons', 'hooks', 'schema', 'defaultContent', 'photos'];
    const source = [
      ...tsx.map((f) => readFileSync(resolve(ROOT, `src/templates/momkid/${f}.tsx`), 'utf8')),
      ...ts.map((f) => readFileSync(resolve(ROOT, `src/templates/momkid/${f}.ts`), 'utf8')),
      readFileSync(resolve(ROOT, 'src/templates/momkid/momkid.css'), 'utf8'),
    ].join('\n');
    expect(source).not.toMatch(/\bshadow-|box-shadow|text-shadow|drop-shadow/);
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/framer-motion|useLocation|useParams|localStorage|sessionStorage|fetch\(|XMLHttpRequest|<form[^>]*\saction=/);
    // Tidak mengimpor folder template lain
    for (const match of code.matchAll(/from '\.\.\/([\w-]+)\//g)) expect(['shared', 'kit'], match[0]).toContain(match[1]);
  });
});

describe('MomKid: gerak', () => {
  it('pratinjau CMS diam, tanpa tautan wa.me terbuka, gerak khas tidak dipersiapkan', () => {
    const { container } = render(<def.Component content={resolveContent(def, null)} preview />);
    expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'off');
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    expect(container.querySelector('a[href^="javascript:"], a[href^="vbscript:"]')).toBeNull();
    expect(container.querySelector('[data-mk-play]')).toBeNull();
    // Chip, garis waktu, dan doodle tetap dirender (keadaan akhir = terlihat)
    expect(container.querySelectorAll('.mk-chip')).toHaveLength(3);
    expect(container.querySelectorAll('.mk-spark')).toHaveLength(6);
    expect(container.querySelectorAll('.mk-seg')).toHaveLength(8);
  });

  it("momkid.css: animasi bergerbang [data-tpl-motion='on'], blok prefers-reduced-motion, kelas mk-, chip mengapung DUA kali lalu diam", () => {
    const css = readFileSync(resolve(ROOT, 'src/templates/momkid/momkid.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).toContain('@layer components');
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(css).toMatch(/@media print/);
    for (const name of ['mk-pop', 'mk-bob', 'mk-twinkle', 'mk-fade']) expect(css).toMatch(new RegExp(`@keyframes ${name}\\b`));
    for (const rule of css.match(/^\s*[^@\s{}][^{}]*\{[^}]*\b(transition|animation):[^}]*\}/gm) ?? []) {
      const selector = rule.split('{')[0];
      if (/transition:\s*none|animation:\s*none/.test(rule)) continue;
      expect(selector, rule).toContain("[data-tpl-motion='on']");
    }
    // Keadaan tersembunyi sebelum diputar hanya di bawah gerbang (pratinjau/tanpa gerak = keadaan akhir)
    for (const rule of css.match(/^\s*[^@\s{}][^{}]*\{[^}]*\b(opacity:\s*0;|scale:\s*(0|1 0|0 1);)[^}]*\}/gm) ?? []) {
      const selector = rule.split('{')[0];
      if (/^\s*(from|to|\d+%)/.test(selector)) continue; // bingkai @keyframes
      expect(selector, rule).toContain("[data-tpl-motion='on']");
    }
    for (const cls of css.match(/\.[a-z][\w-]*/g) ?? []) if (!/^\.(tpl-)/.test(cls)) expect(cls, cls).toMatch(/^\.mk-/);
    // Chip: muncul 0,5 dtk lalu mengapung 2 × 2,6 dtk, berhenti; selain itu ≤ 1,6 dtk; tanpa loop
    expect(css).toMatch(/mk-bob 2\.6s ease-in-out calc\(var\(--mk-d, [\d.]+s\) \+ [\d.]+s\) 2;/);
    // Chip hanya bergerak setelah data-mk-play="on" (tab terlihat); tab latar/pratinjau → langsung tampil diam
    expect(css).toMatch(/\[data-tpl-motion='on'\] \[data-mk-play='on'\] \.mk-chip \{\s*animation:/);
    for (const [, name, seconds] of css.matchAll(/(mk-(?:pop|twinkle|fade)) ([\d.]+)s/g)) expect(Number(seconds), name).toBeLessThanOrEqual(1.6);
    expect(css).not.toMatch(/infinite/);
    expect(css).not.toMatch(/box-shadow|text-shadow|drop-shadow/);
  });

  it('tidak ada kelas transition-* di elemen <Reveal>; foto hero tidak dianimasikan', () => {
    const container = demo();
    for (const el of container.querySelectorAll('.tpl-reveal')) expect(el.className, el.className).not.toMatch(/(^|\s)transition-/);
    const css = readFileSync(resolve(ROOT, 'src/templates/momkid/momkid.css'), 'utf8');
    expect(css).not.toMatch(/\[data-hero-layout|img\s*\{|\bimg\b[^{]*\{[^}]*(animation|opacity)/);
  });
});

describe('MomKid: warna tema bisa diganti', () => {
  it('peach bawaan → --tpl-accent; warna CMS mengalir ke peach lembut, peach, dan teks berwarna tema', () => {
    const base = demo();
    expect(rootStyle(base, '--tpl-accent')).toBe('#e8826a');
    for (const [name, value] of Object.entries(momkidVars('#E8826A') as Record<string, string>)) expect(rootStyle(base, name), name).toBe(value);
    const onAccent = rootStyle(base, '--tpl-on-accent');
    expect(contrast(rgb(onAccent), rgb('#E8826A'))).toBeGreaterThanOrEqual(4.5);
    cleanup();
    const blue = demo({ brand: { accent_color: '#1D4ED8' } });
    expect(rootStyle(blue, '--tpl-accent')).toBe('#1d4ed8');
    for (const [name, value] of Object.entries(momkidVars('#1D4ED8') as Record<string, string>)) expect(rootStyle(blue, name), name).toBe(value);
    expect(rootStyle(blue, '--mk-accent-text')).not.toBe(rootStyle(base, '--mk-accent-text'));
    cleanup();
    expect(rootStyle(demo({ brand: { accent_color: '#FACC15' } }), '--tpl-on-accent')).toBe('#121620');
  });
});

describe('MomKid: SEO situs pembeli, judul, gambar, tautan', () => {
  it('judul tab & meta description dari nama, tagline, dan deskripsi hero; theme-color = aksen', () => {
    expect(siteTitle('momkid', null)).toBe('RSIA MomKid — Rumah Sakit Ibu & Anak Tangerang Selatan');
    expect(siteTitle('momkid', null).length).toBeLessThanOrEqual(60);
    const restore = applySiteHead('momkid', null);
    const description = document.head.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
    expect(description).toMatch(/^Kontrol kehamilan, persalinan, imunisasi/);
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(200);
    expect(document.head.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#E8826A');
    restore();
  });

  it('satu H1, tiap section diawali tepat satu H2, H3 hanya di bawah H2, tanpa h4–h6', () => {
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
    // Judul dikosongkan → H2 tersembunyi untuk pembaca layar; section tetap diawali satu H2 sebelum H3 kartu
    const untitled = demo(Object.fromEntries(ORDER.filter((k) => k !== 'hero').map((k) => [k, { title: '' }])));
    for (const key of ORDER.filter((k) => k !== 'hero')) {
      const levels = Array.from(section(untitled, key).querySelectorAll('h1, h2, h3')).map((h) => h.tagName);
      expect(levels[0], key).toBe('H2');
      expect(levels.filter((l) => l === 'H2'), key).toHaveLength(1);
    }
    expect(section(untitled, 'packages').querySelector('h2')).toHaveClass('sr-only');
    expect(section(untitled, 'cta').querySelector('h2')).toHaveClass('sr-only');
    expect(section(untitled, 'contact').querySelector('h2')!.textContent).toBe('Kontak');
    cleanup();
    const bare = demo(
      Object.fromEntries(
        ['journey', 'packages', 'immunization', 'pediatrics', 'lactation', 'tour', 'articles', 'testimonials', 'faq'].map((k) => [k, { title: '', eyebrow: '', subtitle: '' }]),
      ),
    );
    expect(
      ['journey', 'packages', 'immunization', 'pediatrics', 'lactation', 'tour', 'articles', 'testimonials', 'faq'].map((k) => section(bare, k).querySelector('h2')?.textContent),
    ).toEqual(['Perjalanan layanan', 'Paket persalinan', 'Jadwal imunisasi', 'Dokter anak', 'Klinik laktasi', 'Tur kamar bersalin', 'Artikel parenting', 'Testimoni', 'Tanya jawab']);
  });

  it('gambar: alt deskriptif, width/height, srcset & sizes; foto bulat testimoni alt kosong', () => {
    const container = demo();
    const imgs = Array.from(container.querySelectorAll('img'));
    expect(imgs.length).toBeGreaterThanOrEqual(14);
    for (const img of imgs) {
      const src = img.getAttribute('src') ?? '';
      expect(img.hasAttribute('alt'), src).toBe(true);
      expect(Number(img.getAttribute('width')), src).toBeGreaterThan(0);
      expect(Number(img.getAttribute('height')), src).toBeGreaterThan(0);
      expect(img.getAttribute('srcset'), src).toMatch(/ (800|240)w, /);
      expect(img.getAttribute('sizes'), src).toBeTruthy();
      const alt = img.getAttribute('alt')!;
      if (img.closest('figcaption')) expect(alt, src).toBe('');
      else expect(alt.split(' ').length, src).toBeGreaterThanOrEqual(5);
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

describe('MomKid: konten opsional kosong', () => {
  it('hero: tanpa chip/label/catatan/tombol menu; chip tanpa tautan atau ke section tersembunyi = teks', () => {
    const none = demo({ hero: { chips: [], header_label: '', eyebrow: '', note: '' } });
    const hero = section(none, 'hero');
    expect(within(hero).queryByRole('list', { name: 'Layanan pilihan' })).toBeNull();
    expect(hero.textContent).not.toContain('IGD ibu & anak');
    expect(hero.querySelector('img[fetchpriority="high"]')).not.toBeNull();
    expect(within(none.querySelector('header')!).queryByRole('link', { name: 'Daftar Kunjungan' })).toBeNull();
    cleanup();
    const plainChips = section(
      demo({ hero: { chips: [{ label: 'Tanpa tautan', url: '' }, { label: 'Ke imunisasi', url: '#imunisasi' }] }, immunization: { enabled: false } }),
      'hero',
    );
    const chips = within(plainChips).getByRole('list', { name: 'Layanan pilihan' });
    expect(chips.querySelectorAll('li')).toHaveLength(2);
    expect(chips.querySelector('a')).toBeNull();
    cleanup();
    // Tanpa foto hero: bidang lembut, tanpa gambar eager
    const noPhoto = section(demo({ hero: { image: '' } }), 'hero');
    expect(noPhoto.querySelector('img')).toBeNull();
    expect(noPhoto.querySelector('h1')).not.toBeNull();
  });

  it('perjalanan satu tahap tanpa foto → tanpa tab, teks selebar kartu; paket satu harga → tanpa pilihan kamar', () => {
    const container = demo({
      journey: { stages: [{ name: 'Kehamilan', title: 'Kontrol', text: 'Teks.', image: '' }] },
      packages: { option_b: '', items: [{ name: 'Normal', price_a: 'Rp6,5 jt', price_b: 'Rp9 jt' }, { name: 'Caesar', price_a: '' }] },
    });
    const journey = section(container, 'journey');
    expect(within(journey).queryByRole('tablist')).toBeNull();
    expect(within(journey).queryByRole('tabpanel')).toBeNull();
    expect(journey.querySelector('img')).toBeNull();
    expect(journey.innerHTML).toContain('@4xl:col-span-12');
    const packages = section(container, 'packages');
    expect(within(packages).queryByRole('radio')).toBeNull();
    expect(Array.from(packages.querySelectorAll('article p.mk-fade')).map((p) => p.textContent)).toEqual(['Rp6,5 jt', 'Tanyakan admin']);
    expect(packages.querySelectorAll('article[class*="bg-[#DDF3EA]"]')).toHaveLength(0);
  });

  it('imunisasi kosong/rusak → section & menu hilang; catatan kosong → kalimat ringkasan bawaan', () => {
    const gone = demo({ immunization: { items: [{ age: 'x', vaccines: 'BCG' }] } });
    expect(sectionKeys(gone)).not.toContain('immunization');
    expect(Array.from(gone.querySelector('header nav')!.querySelectorAll('a')).map((a) => a.getAttribute('href'))).not.toContain('#immunization');
    cleanup();
    const note = section(demo({ immunization: { note: '' } }), 'immunization');
    expect(note.textContent).toContain(IMMUNIZATION_NOTE);
  });

  it('dokter dengan hari bebas teks, laktasi tanpa foto & jadwal, tur satu foto, artikel tanpa foto & tautan, testimoni tanpa foto, footer tanpa media sosial', () => {
    const container = demo({
      pediatrics: { items: [{ name: 'dr. Ayu Lestari, Sp.A', days: 'Setiap hari', hours: '' }] },
      lactation: { image: '', schedule: [] },
      tour: { items: [{ image: '/assets/templates/photos/momkid-tur-bayi-960.webp', caption: 'Kamar bayi' }] },
      articles: { items: [{ title: 'Artikel tanpa foto', image: '', url: '' }] },
      testimonials: { items: [{ name: 'Bunda Anisa', quote: 'Nyaman.', photo: '' }] },
      footer: { instagram: '', facebook: '', youtube: '', tiktok: '' },
    });
    const pediatrics = section(container, 'pediatrics');
    expect(pediatrics.textContent).toContain('Setiap hari');
    expect(pediatrics.querySelector('ul[aria-hidden]')).toBeNull();
    expect(pediatrics.querySelector('article span[aria-hidden]')!.textContent).toBe('AL');
    expect(within(pediatrics).getByRole('list', { name: 'Jadwal dokter anak' }).className).not.toContain('snap-x');
    const lactation = section(container, 'lactation');
    expect(lactation.querySelector('img')).toBeNull();
    expect(lactation.querySelector('dl')).toBeNull();
    expect(lactation.innerHTML).toContain('@4xl:col-span-12');
    const tour = section(container, 'tour');
    expect(tour.querySelectorAll('img')).toHaveLength(1);
    expect(within(tour).queryByRole('button', { name: 'Foto berikutnya' })).toBeNull();
    const articles = section(container, 'articles');
    expect(articles.querySelector('img')).toBeNull();
    expect(within(articles).queryByRole('link', { name: 'Artikel tanpa foto' })).toBeNull();
    const testimonials = section(container, 'testimonials');
    expect(testimonials.querySelector('img')).toBeNull();
    expect(testimonials.textContent).toContain('BA');
    const footer = container.querySelector('footer')!;
    expect(within(footer).queryByRole('list', { name: 'Media sosial' })).toBeNull();
    cleanup();
    const hidden = demo({ faq: { enabled: false }, tour: { items: [] }, footer: { enabled: false } });
    expect(sectionKeys(hidden)).not.toContain('faq');
    expect(sectionKeys(hidden)).not.toContain('tour');
    expect(hidden.querySelector('footer')).toBeNull();
    expect(Array.from(hidden.querySelector('header nav')!.querySelectorAll('a')).map((a) => a.getAttribute('href'))).not.toContain('#tour');
  });

  it('tanpa WhatsApp → tautan email; tanpa WhatsApp & email → salin pesan; tanpa telepon IGD → hanya 119', () => {
    const fill = (formEl: HTMLElement) => {
      fireEvent.change(within(formEl).getByLabelText('Nama'), { target: { value: 'Rina' } });
      fireEvent.change(within(formEl).getByLabelText('Layanan'), { target: { value: 'Persalinan' } });
      act(() => {
        fireEvent.submit(formEl);
      });
    };
    const container = demo({ contact: { whatsapp: '', emergency_phone: '', form_text: '' } });
    const contact = section(container, 'contact');
    const formEl = within(contact).getByRole('form');
    expect(within(formEl).getByRole('button', { name: 'Susun pesan' })).toHaveAttribute('type', 'submit');
    // Keterangan formulir kosong → kalimat jujur bawaan
    expect(formEl.textContent).toContain('data tidak disimpan di website');
    expect(within(contact).queryByRole('link', { name: /^Telepon IGD/ })).toBeNull();
    expect(within(contact).getByRole('link', { name: 'Telepon 119' })).toBeInTheDocument();
    fill(formEl);
    expect(within(contact).getByRole('link', { name: 'Kirim lewat email' }).getAttribute('href')).toMatch(
      /^mailto:halo@momkid\.test\?subject=Pendaftaran%20kunjungan&body=Halo%20RSIA%20MomKid/,
    );
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    cleanup();
    const bare = section(demo({ contact: { whatsapp: '', email: '' } }), 'contact');
    fill(within(bare).getByRole('form'));
    expect(within(bare).getByRole('button', { name: 'Salin pesan' })).toBeInTheDocument();
  });
});

describe('MomKid: editor CMS', () => {
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

describe('MomKid: data katalog', () => {
  const MIGRATION = 'database/migrations/2026-10-28_045_momkid_template.sql';
  const sql = () => readFileSync(resolve(ROOT, MIGRATION), 'utf8');

  it('migrasi 045: baris momkid dengan kategori baru, harga, pratinjau, galeri, fitur terakhir = domain & SSL', () => {
    const text = sql();
    expect(text).toContain("'momkid'");
    expect(text).toContain("'Kesehatan & Rumah Sakit'");
    expect(text).toContain('1790000.00');
    expect(text).toContain("'/assets/templates/momkid-preview.webp'");
    expect(text).toContain('\'["/assets/templates/momkid-1.webp","/assets/templates/momkid-2.webp"]\'');
    expect(text).toMatch(/data tidak disimpan di website/);
    expect(text).toMatch(/tidak ada rekam medis, pembayaran online/);
    expect(text).not.toMatch(/termasuk domain|domain, hosting|terakreditasi|\bKARS\b|terbaik|dijamin|garansi/i);
    const features = JSON.parse(/features\s+= '(\[.*\])'/.exec(text)![1]) as string[];
    expect(features.length).toBeGreaterThanOrEqual(6);
    expect(features.length).toBeLessThanOrEqual(8);
    expect(features[features.length - 1]).toBe('Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)');
  });

  it('migrasi 045 aman diulang (INSERT IGNORE + UPDATE berdasarkan slug, tanpa DELETE) dan tercatat di schema_migrations', () => {
    const raw = sql();
    expect(raw).toMatch(/Domain\s+(--\s+)?tidak termasuk harga template/);
    expect(raw).toMatch(/FIKTIF/);
    expect(raw).toMatch(/kategori baru/i);
    expect(raw).toMatch(/SETELAH kode/);
    expect(raw).toMatch(/MENIMPA perubahan admin/);
    const text = raw.replace(/^--.*$/gm, '');
    expect(text).toMatch(/INSERT IGNORE INTO templates/);
    expect(text).toMatch(/WHERE slug = 'momkid';/);
    expect(text).toMatch(/sort_order\s+= 28/);
    expect(text).toMatch(/status\s+= 'published'/);
    expect(text).not.toMatch(/\bDELETE\b/);
    expect(text).toContain("VALUES ('2026-10-28_045', 'templates: katalog MomKid Hospital')");
  });

  it('gambar pratinjau katalog ada di public/, 1600×1000, dan ringan', () => {
    for (const name of ['momkid-preview', 'momkid-1', 'momkid-2']) {
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

describe('MomKid: konten aneh', () => {
  it('angka, null, dan string di tempat list tidak membuat crash; tautan berbahaya dibuang', () => {
    const weird = {
      hero: { image: 'javascript:alert(1)', highlight: 'tidak ada di judul', primary_url: 'javascript:alert(1)', chips: 'x' },
      journey: { stages: [null, { name: 3 }, { name: 'Hamil', image: 'javascript:alert(1)', services: 7, link_url: 'vbscript:x' }] },
      packages: { items: [{ name: 'Normal', price_a: 5, inclusions: null }], option_a: 3 },
      immunization: { items: [{ age: 'x', vaccines: 'A' }, { age: 2, vaccines: 'B' }, null], start_age: 'abc' },
      pediatrics: { items: [{ name: 'dr. X', days: 5 }, 'x'] },
      lactation: { services: 'x', schedule: [null], image: 'javascript:alert(1)', button_url: 'vbscript:x' },
      tour: { items: [{ image: 'javascript:alert(1)' }, 'x'] },
      articles: { items: [{ title: 'A', url: 'javascript:alert(1)', image: 'javascript:alert(1)' }] },
      testimonials: { items: [{ quote: 'Baik', photo: 'javascript:alert(1)' }] },
      faq: { items: [{ question: 2, answer: null }], link_url: 'vbscript:x' },
      contact: { whatsapp: 'abc', form_services: 'x', maps_url: 'javascript:alert(1)' },
      footer: { instagram: 'javascript:alert(1)' },
      brand: { accent_color: 'oranye' },
    } as unknown as SiteContent;
    const { container } = render(<def.Component content={resolveContent(def, weird)} />);
    expect(container.querySelector('a[href^="javascript:"], a[href^="vbscript:"]')).toBeNull();
    expect(container.querySelector('img[src^="javascript:"]')).toBeNull();
    expect(plain(container.querySelector('h1')!.textContent)).toBe('Tempat hangat untuk Bunda dan si kecil');
    expect(container.querySelector('h1 .mk-mark')).toBeNull();
    expect(section(container, 'immunization').querySelectorAll('.mk-timeline > li')).toHaveLength(1);
    expect(sectionKeys(container)).not.toContain('tour');
    expect(rootStyle(container, '--mk-accent-text')).toBe('#915243');
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
