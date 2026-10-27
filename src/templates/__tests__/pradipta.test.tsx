// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/pradipta.test.tsx
// Pradipta (landing page SMA negeri "Simple sky", 2026-10-27): skema CMS & konten demo (SMA Negeri 1 Purbolinggo sebagai
// contoh, data lain fiktif), helper model (warna turunan dari satu warna tema, menu & tautan footer, slide hero, tanggal +
// hari, filter berita & ekskul, prestasi per tahun, galeri bento, nada pita putih/langit, formulir tanya SPMB tiga
// langkah → pesan WhatsApp, ikon otomatis), demo (urutan section, header putih dengan lintasan menu + penunjuk, hero
// slider "thumbs" dengan kartu putih & thumbnail berbilah progres, akses cepat, statistik, profil, sambutan, akademik
// buka-tutup + foto berganti, ekskul bersaring, linimasa prestasi, berita berfilter, pengumuman & agenda ubin kalender,
// guru, SPMB bertab + wizard, testimoni, galeri, FAQ, kontak + peta, footer berpita langit), berita & pengumuman dari
// tulisan (site_posts: section profesional, halaman /berita, /pengumuman, /berita/{slug}), kustomisasi warna, SEO situs
// pembeli, konten opsional kosong, pratinjau CMS diam, editor CMS, data katalog (migrasi 040 + seed + gambar pratinjau),
// dan konten aneh.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionEditor } from '../../pages/account/cms/SectionEditor';
import { validateContent } from '../../pages/account/cms/validation';
import { TEMPLATES, resolveContent } from '../index';
import { iconKey } from '../pradipta/icons';
import {
  achievementsByYear,
  bandTones,
  degreeSplit,
  displayDate,
  EMPTY_SPMB,
  ekskulCategories,
  filterEkskul,
  filterNews,
  footerLinks,
  galleryCells,
  heroSlides,
  navItems,
  navOwners,
  newsCategories,
  normalizeWa,
  PAGE_SECTIONS,
  parseSchoolDate,
  pathChoices,
  pradiptaVars,
  readPradipta,
  sectionShown,
  sectionTarget,
  spmbMessage,
  titleTarget,
  uniqueTopics,
  validateSpmbStep,
  validWa,
  wrapIndex,
} from '../pradipta/model';
import { INPUT } from '../pradipta/styles';
import { PRADIPTA_PHOTOS } from '../pradipta/photos';
import { applySiteHead, siteTitle } from '../siteHead';
import { SiteRenderer } from '../SiteRenderer';
import { SITE_DATA_DEFAULT, type SiteData } from '../shared/siteData';
import { accentVars, contrast, parseHex } from '../shared/utils';
import { isListField, type ListItem, type SiteContent } from '../types';
import { ANNOUNCEMENTS, NEWS, POST } from './fixtures/sitePosts';

// Demo panjang (17 section) + getByRole di jsdom: bisa lewat 5 dtk saat suite berjalan paralel
vi.setConfig({ testTimeout: 30_000 });

const ROOT = process.cwd();
const def = TEMPLATES.pradipta;
const ORDER = [
  'hero',
  'quicklinks',
  'stats',
  'about',
  'welcome',
  'programs',
  'studentlife',
  'achievements',
  'facilities',
  'news',
  'announcements',
  'agenda',
  'teachers',
  'spmb',
  'testimonials',
  'gallery',
  'faq',
  'contact',
];
/** Pita berurutan di bawah hero & akses cepat (pengumuman + agenda satu pita, diwakili pengumuman). */
const BANDS = ['stats', 'about', 'welcome', 'programs', 'studentlife', 'achievements', 'facilities', 'news', 'announcements', 'teachers', 'spmb', 'testimonials', 'gallery', 'faq', 'contact'];
const SCHOOL = 'SMA Negeri 1 Purbolinggo';
const sectionKeys = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-tpl-section]')).map((s) => s.getAttribute('data-tpl-section'));
const section = (root: HTMLElement, key: string) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`)!;
const demo = (content: unknown = null, preview = false) => render(<SiteRenderer templateCode="pradipta" content={content} preview={preview} />).container;
const rgb = (hex: string) => parseHex(hex)!;
const publicFile = (url: string) => resolve(ROOT, 'public', url.replace(/^\//, ''));
const rootStyle = (container: HTMLElement, name: string) => {
  const holder = Array.from(container.querySelectorAll<HTMLElement>('[style]')).find((el) => el.style.getPropertyValue(name));
  return holder?.style.getPropertyValue(name) ?? '';
};
const urls = (src: string) => {
  const asset = PRADIPTA_PHOTOS.asset(src)!;
  return [asset.src, ...asset.srcSet!.split(',').map((part) => part.trim().split(' ')[0])].filter((u, i, all) => all.indexOf(u) === i);
};
const wa = (el: Element | null) => decodeURIComponent(el?.getAttribute('href') ?? '');
const linkList = (root: Element) => Array.from(root.querySelectorAll('a')).map((a) => `${a.textContent}|${a.getAttribute('href')}`);
/** Leluhur terdekat (termasuk diri sendiri) yang kelasnya memuat `cls` (kelas Tailwind berkurung siku tidak bisa dicari dengan closest). */
const withClass = (el: Element | null, cls: string): HTMLElement | null => {
  for (let node = el as HTMLElement | null; node; node = node.parentElement) if (typeof node.className === 'string' && node.className.split(/\s+/).includes(cls)) return node;
  return null;
};
/** Tunggu fokus tertunda (setTimeout 0) di wizard SPMB. */
const flush = () => act(async () => new Promise<void>((done) => window.setTimeout(done, 5)));
/** Situs live dengan fitur Berita & Pengumuman aktif dan tulisan dari SiteDataContext; `data` menimpa rute dsb. */
const withPosts = (data: Partial<SiteData> = {}, content: unknown = null) =>
  render(
    <SiteRenderer
      templateCode="pradipta"
      content={content}
      data={{ ...SITE_DATA_DEFAULT, postsEnabled: true, posts: { berita: NEWS, pengumuman: ANNOUNCEMENTS }, ...data }}
    />,
  ).container;

let scrolled: (string | null)[] = [];
beforeEach(() => {
  scrolled = [];
  Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
    scrolled.push(this.getAttribute('data-tpl-section'));
  });
});
afterEach(cleanup);

describe('Pradipta: skema & konten bawaan', () => {
  it('urutan form = urutan halaman, semua section bisa disembunyikan, field unik, list berbatas', () => {
    expect(def.code).toBe('pradipta');
    expect(def.name).toBe('Pradipta');
    expect(def.features?.posts).toBe(true);
    expect(def.sections.map((s) => s.key)).toEqual(['brand', ...ORDER, 'footer']);
    const fields = (key: string) => def.sections.find((s) => s.key === key)!.fields.map((f) => f.key);
    expect(fields('brand')).toEqual(['company_name', 'tagline', 'logo', 'accent_color']);
    expect(def.sections[0].fields.find((f) => f.key === 'accent_color')?.type).toBe('color');
    expect(fields('hero')).toEqual(
      expect.arrayContaining(['chip', 'title', 'subtitle', 'caption', 'primary_label', 'primary_url', 'secondary_label', 'secondary_url', 'image', 'slides', 'header_label', 'header_url']),
    );
    expect(fields('spmb')).toEqual(
      expect.arrayContaining(['paths', 'schedule', 'requirements', 'topics', 'portal_label', 'portal_url', 'form_title', 'form_text', 'form_button', 'whatsapp']),
    );
    expect(fields('contact')).toEqual(expect.arrayContaining(['address', 'maps_query', 'maps_url', 'phone', 'email', 'whatsapp', 'whatsapp_message', 'hours']));
    expect(fields('footer')).toEqual(expect.arrayContaining(['instagram', 'facebook', 'linkedin', 'youtube', 'tiktok']));
    for (const s of def.sections) {
      const keys = s.fields.map((f) => f.key);
      expect(new Set(keys).size, s.key).toBe(keys.length);
      for (const f of s.fields) {
        if (isListField(f)) {
          expect(f.max, `${s.key}.${f.key}`).toBeGreaterThan(0);
          for (const sub of f.fields) if (sub.type === 'text' || sub.type === 'textarea') expect(sub.maxLength, `${s.key}.${f.key}.${sub.key}`).toBeGreaterThan(0);
        } else if (f.type === 'text' || f.type === 'textarea') expect(f.maxLength, `${s.key}.${f.key}`).toBeGreaterThan(0);
      }
      expect(def.defaultContent[s.key], s.key).toBeTypeOf('object');
      expect(s.introduced).toBeUndefined();
      if (s.key !== 'brand') expect(s.toggleable, s.key).toBe(true);
    }
    const hero = def.sections.find((s) => s.key === 'hero')!;
    const slides = hero.fields.find((f) => f.key === 'slides');
    expect(slides && isListField(slides) ? slides.max : 0).toBe(3);
    // Label CMS menyebut PPDB/SPMB agar sekolah yang masih memakai istilah lama tetap paham
    expect(def.sections.find((s) => s.key === 'spmb')!.label).toContain('PPDB/SPMB');
  });

  it('berita, pengumuman & agenda berbentuk data sama dengan template sekolah lain (siap untuk CRUD berita)', () => {
    const itemKeys = (code: string, key: string) => {
      const list = TEMPLATES[code].sections.find((s) => s.key === key)!.fields.find((f) => f.key === 'items');
      return list && isListField(list) ? [...list.fields.map((f) => f.key)].sort() : [];
    };
    for (const other of ['bestari', 'cakrawala', 'madani']) {
      expect(itemKeys('pradipta', 'news'), other).toEqual(itemKeys(other, 'news'));
      expect(itemKeys('pradipta', 'announcements'), other).toEqual(itemKeys(other, 'announcements'));
    }
    expect(itemKeys('pradipta', 'agenda')).toEqual(itemKeys('bestari', 'agenda'));
    expect(itemKeys('pradipta', 'agenda')).toEqual(itemKeys('cakrawala', 'agenda'));
  });

  it('konten demo lolos validasi CMS, logo Tut Wuri Handayani (SVG), semua foto terdaftar, ada di public/, dan tercatat di CREDITS.md', () => {
    const c = def.defaultContent;
    expect(validateContent(def, resolveContent(def, null))).toEqual({});
    expect(c.brand.company_name).toBe(SCHOOL);
    expect(c.brand.logo).toBe('/assets/templates/logos/tut-wuri-handayani.svg');
    expect(existsSync(publicFile(c.brand.logo as string))).toBe(true);
    expect(c.brand.accent_color).toBe('#0077B6');
    expect(c.hero.image).toBe('/assets/templates/photos/pradipta-hero-1-1920.webp');
    expect(c.contact.whatsapp).toBe('081234567890');
    const photos = JSON.stringify(c).match(/\/assets\/templates\/photos\/[a-z0-9-]+\.webp/g) ?? [];
    expect(photos.length).toBeGreaterThanOrEqual(20);
    for (const src of photos) expect(PRADIPTA_PHOTOS.asset(src), src).not.toBeNull();
    const credits = readFileSync(resolve(ROOT, 'public/assets/templates/photos/CREDITS.md'), 'utf8');
    expect(PRADIPTA_PHOTOS.keys.length).toBeGreaterThanOrEqual(12);
    for (const key of PRADIPTA_PHOTOS.keys) {
      expect(key.startsWith('pradipta-'), key).toBe(true);
      for (const url of urls(PRADIPTA_PHOTOS.src(key))) expect(existsSync(publicFile(url)), url).toBe(true);
      expect(credits, key).toContain(`\`${key}-*\``);
      expect(photos, `${key} dipakai di konten demo`).toContain(PRADIPTA_PHOTOS.src(key));
      expect(PRADIPTA_PHOTOS.alt(PRADIPTA_PHOTOS.src(key), '').split(' ').length, key).toBeGreaterThanOrEqual(5);
    }
    // Simbol bawaan juga tersedia sebagai SVG mandiri, path sama dengan komponen
    const mark = readFileSync(publicFile('/assets/templates/logos/pradipta-mark.svg'), 'utf8');
    const component = readFileSync(resolve(ROOT, 'src/templates/pradipta/marks.tsx'), 'utf8');
    const paths = mark.match(/ d="[^"]+"/g) ?? [];
    expect(paths.length).toBeGreaterThan(0);
    for (const d of paths) expect(component, d).toContain(d.trim());
    expect(mark).toMatch(/viewBox="0 0 32 32"/);
    expect(mark).toMatch(/role="img"/);
    expect(mark).toMatch(/<title>Pradipta<\/title>/);
  });

  it('foto demo ringan: slide hero 800/1280/1920, WebP ≤ 140 KB per file (800w ≤ 90 KB), total ≤ 2,5 MB; foto disimpan WebP', () => {
    expect(PRADIPTA_PHOTOS.asset(def.defaultContent.hero.image as string)!.srcSet).toBe(
      '/assets/templates/photos/pradipta-hero-1-800.webp 800w, /assets/templates/photos/pradipta-hero-1-1280.webp 1280w, /assets/templates/photos/pradipta-hero-1-1920.webp 1920w',
    );
    let total = 0;
    for (const key of PRADIPTA_PHOTOS.keys) {
      for (const url of urls(PRADIPTA_PHOTOS.src(key))) {
        expect(url, url).toMatch(/\.webp$/);
        const kb = statSync(publicFile(url)).size / 1024;
        expect(kb, url).toBeLessThanOrEqual(140);
        if (url.endsWith('-800.webp')) expect(kb, url).toBeLessThanOrEqual(90);
        total += kb;
      }
    }
    expect(total).toBeLessThanOrEqual(2500);
  });

  it('salinan demo jujur: SMA negeri tanpa NPSN/akreditasi/peringkat, SPMB lewat portal provinsi, formulir hanya menyusun pesan WhatsApp', () => {
    const text = JSON.stringify(def.defaultContent);
    expect(text).not.toMatch(/dijamin|garansi|pasti diterima|pasti lolos|e-rapor|absensi online|pembayaran online tersedia|terbaik|termurah|#1|nomor 1|unggulan|favorit/i);
    expect(text).not.toMatch(/\bNPSN\b|akreditasi|terakreditasi|peringkat|berdiri sejak|didirikan/i);
    expect(text).toMatch(/data tidak disimpan di website/);
    expect(text).toMatch(/tidak ada pembayaran online/);
    expect(text).toMatch(/portal SPMB Provinsi Lampung/);
    // Istilah penerimaan = SPMB (PPDB hanya di label CMS)
    expect(text).not.toMatch(/\bPPDB\b/);
    // Kurikulum Merdeka: kelompok mata pelajaran pilihan, bukan jurusan IPA/IPS
    expect(text).toMatch(/kelompok mata pelajaran pilihan/i);
    expect(text).not.toMatch(/\b(jurusan|kelas) (IPA|IPS)\b/i);
    // SMA, bukan SD/SMP
    expect(text).not.toMatch(/\bSD\b|sekolah dasar|TK\/PAUD|kelas [1-9]\b/i);
    // Kontak demo bukan milik sekolah sungguhan: email .example, nomor contoh, media sosial hanya akar platform
    expect(def.defaultContent.contact.email).toMatch(/\.example$/);
    for (const key of ['instagram', 'facebook', 'youtube']) expect(String(def.defaultContent.footer[key]), key).toMatch(/^https:\/\/www\.[a-z]+\.com\/$/);
    expect(String(def.defaultContent.footer.note)).toMatch(/ilustrasi, bukan informasi resmi sekolah/);
  });
});

describe('Pradipta: helper model', () => {
  it('warna tema: tinta ≥ 5:1 di putih & ≥ 4,6:1 di langit, biru malam (putih ≥ 15:1), teks netral terbaca di semua pita; warna tidak valid → bawaan', () => {
    const white = rgb('#ffffff');
    const grid = Array.from({ length: 18 }, (_, i) => Math.round((i * 255) / 17));
    const worst = { inkOnWhite: Infinity, inkOnSky2: Infinity, inkOnSky: Infinity, whiteOnNight: Infinity, mutedOnSky2: Infinity, bodyOnSky: Infinity };
    for (const r of grid)
      for (const g of grid)
        for (const b of grid) {
          const vars = pradiptaVars(`#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`) as Record<string, string>;
          const ink = rgb(vars['--pd-ink']);
          worst.inkOnWhite = Math.min(worst.inkOnWhite, contrast(ink, white));
          worst.inkOnSky2 = Math.min(worst.inkOnSky2, contrast(ink, rgb(vars['--pd-sky2'])));
          worst.inkOnSky = Math.min(worst.inkOnSky, contrast(ink, rgb(vars['--pd-sky'])));
          worst.whiteOnNight = Math.min(worst.whiteOnNight, contrast(white, rgb(vars['--pd-night'])));
          // Netral C.muted (#53637A) di bidang --pd-sky2 (chip, label) dan C.body (#36465A) di pita langit
          worst.mutedOnSky2 = Math.min(worst.mutedOnSky2, contrast(rgb('#53637A'), rgb(vars['--pd-sky2'])));
          worst.bodyOnSky = Math.min(worst.bodyOnSky, contrast(rgb('#36465A'), rgb(vars['--pd-sky'])));
        }
    expect(worst.inkOnWhite).toBeGreaterThanOrEqual(5);
    expect(worst.inkOnSky2).toBeGreaterThanOrEqual(4.5);
    expect(worst.inkOnSky).toBeGreaterThanOrEqual(4.5);
    expect(worst.whiteOnNight).toBeGreaterThanOrEqual(15);
    expect(worst.mutedOnSky2).toBeGreaterThanOrEqual(4.5);
    expect(worst.bodyOnSky).toBeGreaterThanOrEqual(7);
    expect(pradiptaVars('bukan warna')).toEqual(pradiptaVars('#0077B6'));
    // Biru azure bawaan: teks putih di atasnya ≥ 4,5:1
    expect(contrast(white, rgb('#0077B6'))).toBeGreaterThanOrEqual(4.5);
    const base = pradiptaVars('#0077B6') as Record<string, string>;
    expect(base['--pd-sky']).toMatch(/^#[0-9a-f]{6}$/);
    // Langit muda turunan aksen ~#EEF6FC
    const sky = rgb(base['--pd-sky']);
    expect(sky[2]).toBeGreaterThan(sky[0]);
    expect(sky[0]).toBeGreaterThanOrEqual(230);
  });

  it('warna bawaan biru dan berbeda dari Bestari, Cakrawala, Madani, Jumantara & Nawasena', () => {
    const accent = rgb(def.defaultContent.brand.accent_color as string);
    expect(accent[2]).toBeGreaterThan(accent[0] + 120);
    expect(accent[2]).toBeGreaterThan(accent[1] + 40);
    const taken = ['bestari', 'cakrawala', 'madani'].map((code) => String(TEMPLATES[code].defaultContent.brand.accent_color).toUpperCase());
    expect(taken).not.toContain('#0077B6');
    expect(['#2F5BEA', '#2563EB', '#1565C0', '#1D4ED8']).not.toContain(String(def.defaultContent.brand.accent_color).toUpperCase());
    // Huruf judul Lexend hanya dipakai Pradipta
    for (const code of Object.keys(TEMPLATES).filter((c) => c !== 'pradipta')) {
      const styles = resolve(ROOT, `src/templates/${code}/styles.ts`);
      if (existsSync(styles)) expect(readFileSync(styles, 'utf8'), code).not.toMatch(/family=Lexend/);
    }
  });

  it('teks putih di bidang warna tema hanya bila kontrasnya lebih baik (aturan --tpl-on-accent)', () => {
    // Aturan bersama Shell (accentVars): biru tua/hijau/abu tua → teks putih, kuning/biru muda/oranye → tinta gelap
    const onAccent = (color: string) => (accentVars(color, '#0077B6') as Record<string, string>)['--tpl-on-accent'];
    expect(['#0077B6', '#047857', '#1D4ED8', '#1F2937'].map(onAccent)).toEqual(['#ffffff', '#ffffff', '#ffffff', '#ffffff']);
    expect(['#FACC15', '#7DD3FC', '#F59E0B'].map(onAccent)).toEqual(['#121620', '#121620', '#121620']);
    // Tidak ada data-tpl-tone di template (cincin fokus bawaan terlihat di semua bidang): model tanpa accentTone
    expect(readPradipta(resolveContent(def, null))).not.toHaveProperty('accentTone');
  });

  it('penunjuk menu: section tanpa item menu menyalakan item menu sebelumnya; null hanya sebelum item menu pertama', () => {
    const content = resolveContent(def, null);
    expect(readPradipta(content).navOwners).toEqual({
      hero: null,
      quicklinks: null,
      stats: null,
      about: 'about',
      welcome: 'about',
      programs: 'programs',
      studentlife: 'studentlife',
      achievements: 'studentlife',
      facilities: 'studentlife',
      news: 'news',
      announcements: 'news',
      agenda: 'news',
      teachers: 'news',
      spmb: 'spmb',
      testimonials: 'spmb',
      gallery: 'spmb',
      faq: 'spmb',
      contact: 'contact',
      footer: 'contact',
    });
    expect(navOwners(['hero', 'a', 'x', 'b', 'y'], ['a', 'b'])).toEqual({ hero: null, a: 'a', x: 'a', b: 'b', y: 'b' });
    // Profil tersembunyi → sambutan belum punya item menu sebelumnya
    const owners = readPradipta(resolveContent(def, { about: { enabled: false } })).navOwners;
    expect([owners.welcome, owners.about, owners.achievements]).toEqual([null, undefined, 'studentlife']);
  });

  it('menu: Profil, Akademik, Ekskul, Berita, SPMB, Kontak; label singkat dari label section; footer "Jelajahi" urut halaman', () => {
    const content = resolveContent(def, null);
    expect(navItems(content).map((i) => `${i.key}:${i.label}`)).toEqual([
      'about:Profil',
      'programs:Akademik',
      'studentlife:Ekskul',
      'news:Berita',
      'spmb:SPMB',
      'contact:Kontak',
    ]);
    const other = resolveContent(def, { programs: { eyebrow: 'Mapel' }, studentlife: { enabled: false }, news: { items: [] } });
    expect(navItems(other).map((i) => `${i.key}:${i.label}`)).toEqual(['about:Profil', 'programs:Mapel', 'spmb:SPMB', 'contact:Kontak']);
    expect(navItems(resolveContent(def, { spmb: { eyebrow: 'Daftar' } })).find((i) => i.key === 'spmb')?.label).toBe('SPMB');
    expect(footerLinks(content).map((i) => `${i.key}:${i.label}`)).toEqual([
      'about:Profil',
      'programs:Akademik',
      'studentlife:Ekskul',
      'achievements:Prestasi',
      'news:Berita',
      'announcements:Pengumuman',
      'teachers:Guru',
      'spmb:SPMB',
      'contact:Kontak',
    ]);
    // Section utama tersembunyi → cadangan mengisi (maks. 9), tetap urut halaman
    const fewer = footerLinks(resolveContent(def, { achievements: { enabled: false }, teachers: { enabled: false } }));
    expect(fewer.map((i) => i.key)).toEqual(['about', 'programs', 'studentlife', 'facilities', 'news', 'announcements', 'agenda', 'spmb', 'contact']);
    expect(fewer.find((i) => i.key === 'facilities')?.label).toBe('Fasilitas');
  });

  it('slide hero: slide 1 = isi hero, tambahan hanya yang berfoto (maks. 3), isian kosong ikut slide 1; indeks berputar', () => {
    const base = {
      image: '/a.webp',
      chip: 'Chip',
      title: 'Judul utama',
      subtitle: 'Deskripsi',
      caption: 'Profil',
      primary_label: 'Profil',
      primary_url: '#profil',
      secondary_label: 'SPMB',
      secondary_url: '#spmb',
    };
    const first = {
      image: '/a.webp',
      chip: 'Chip',
      title: 'Judul utama',
      subtitle: 'Deskripsi',
      caption: 'Profil',
      primaryLabel: 'Profil',
      primaryUrl: '#profil',
      secondaryLabel: 'SPMB',
      secondaryUrl: '#spmb',
    };
    expect(heroSlides({ ...base, slides: [{ image: '', title: 'Tanpa foto' }, { image: '/b.webp' }, { image: '/c.webp', title: 'Judul C', primary_label: 'Ekskul' }] }, 'Sekolah')).toEqual([
      first,
      { ...first, image: '/b.webp' },
      { ...first, image: '/c.webp', title: 'Judul C', caption: 'Judul C', primaryLabel: 'Ekskul' },
    ]);
    expect(heroSlides({}, 'Sekolah')).toEqual([
      { image: '', chip: '', title: 'Sekolah', subtitle: '', caption: '', primaryLabel: '', primaryUrl: '', secondaryLabel: '', secondaryUrl: '' },
    ]);
    expect(heroSlides({ slides: Array.from({ length: 6 }, (_, i) => ({ image: `/s${i}.webp` })) }, 'S')).toHaveLength(4);
    expect(heroSlides({ slides: [{ image: 'javascript:alert(1)' }] }, 'S')).toHaveLength(1);
    expect([wrapIndex(4, 4), wrapIndex(-1, 4), wrapIndex(2, 4), wrapIndex(1, 0)]).toEqual([0, 3, 2, 0]);
  });

  it('tanggal: ISO valid → "25 Nov 2026" + hari (ubin kalender), teks bebas apa adanya, tanggal mustahil → teks', () => {
    expect(parseSchoolDate('2026-11-25')).toEqual({ iso: '2026-11-25', day: '25', month: 'Nov', year: '2026', weekday: 'Rab', label: '25 Nov 2026' });
    expect(parseSchoolDate('2027-01-16')?.weekday).toBe('Sab');
    expect(parseSchoolDate('2026-02-30')).toBeNull();
    expect(parseSchoolDate('25 Nov')).toBeNull();
    expect(displayDate(' 2027-07-01 ')).toBe('1 Jul 2027');
    expect(displayDate('Juni 2027')).toBe('Juni 2027');
    expect(displayDate('')).toBe('');
  });

  it('berita & ekskul: kategori unik berurutan tanpa beda huruf besar, filter tak dikenal → semua; prestasi per tahun terbaru dulu', () => {
    const items: ListItem[] = [
      { title: 'A', category: 'Prestasi' },
      { title: 'B', category: 'kegiatan' },
      { title: 'C', category: 'prestasi ' },
      { title: 'D', category: '' },
    ];
    expect(newsCategories(items)).toEqual(['Prestasi', 'kegiatan']);
    expect(filterNews(items, 'PRESTASI').map((i) => i.title)).toEqual(['A', 'C']);
    expect(filterNews(items, null)).toHaveLength(4);
    expect(filterNews(items, 'Olahraga')).toHaveLength(4);
    const ekskul: ListItem[] = [
      { name: 'Pramuka', category: 'Kepemimpinan' },
      { name: 'Voli', category: 'Olahraga' },
      { name: 'PMR', category: 'kepemimpinan' },
    ];
    expect(ekskulCategories(ekskul)).toEqual(['Kepemimpinan', 'Olahraga']);
    expect(filterEkskul(ekskul, 'Kepemimpinan').map((i) => i.name)).toEqual(['Pramuka', 'PMR']);
    const groups = achievementsByYear([
      { title: 'A', year: '2025' },
      { title: 'B', year: '2026' },
      { title: 'C', year: 'Lainnya' },
      { title: 'D', year: '2025' },
      { title: 'E', year: '2027' },
    ]);
    expect(groups.map((g) => `${g.year}:${g.items.map((i) => i.title).join('')}`)).toEqual(['2027:E', '2026:B', '2025:AD', 'Lainnya:C']);
  });

  it('formulir tanya SPMB: validasi per langkah, nomor WhatsApp Indonesia, pesan WhatsApp per baris (isian kosong → "-")', () => {
    const paths = ['Domisili', 'Afirmasi', 'Prestasi', 'Mutasi'];
    expect(Object.keys(validateSpmbStep(0, EMPTY_SPMB, paths))).toEqual(['student', 'origin']);
    expect(Object.keys(validateSpmbStep(1, EMPTY_SPMB, paths))).toEqual(['path']);
    expect(Object.keys(validateSpmbStep(2, EMPTY_SPMB, paths))).toEqual(['contact', 'phone']);
    const filled = { ...EMPTY_SPMB, student: 'Alya Putri', origin: 'SMP Negeri 2 Purbolinggo', path: 'Belum tahu', contact: "Ibu Sari Wulandari", phone: '0812-3456-7890' };
    for (const step of [0, 1, 2]) expect(validateSpmbStep(step, filled, paths), `langkah ${step + 1}`).toEqual({});
    expect(validateSpmbStep(0, { ...filled, student: 'Alya123' }, paths).student).toBe('Nama hanya berisi huruf, spasi, titik, atau tanda petik.');
    expect(validateSpmbStep(0, { ...filled, student: "Nur'aini Siti" }, paths)).toEqual({});
    expect(validateSpmbStep(1, { ...filled, path: 'Zonasi' }, paths).path).toBe('Pilih jalur yang diminati, atau "Belum tahu".');
    expect(validateSpmbStep(1, { ...filled, path: 'Prestasi', question: 'x'.repeat(301) }, paths).question).toBe('Maksimal 300 karakter.');
    // Tanpa jalur di CMS → "Belum tahu" tetap bisa dipilih
    expect(validateSpmbStep(1, filled, [])).toEqual({});
    // Nama jalur/topik ganda dari CMS (atau jalur bernama "Belum tahu") → satu pilihan saja
    expect(pathChoices(['Domisili', 'Domisili ', 'Belum tahu', '', 'Prestasi'])).toEqual(['Domisili', 'Prestasi', 'Belum tahu']);
    expect(uniqueTopics(['Jadwal', 'Jadwal', ' ', 'Syarat'])).toEqual(['Jadwal', 'Syarat']);
    expect(validateSpmbStep(1, { ...filled, path: 'Domisili' }, ['Domisili', 'Domisili'])).toEqual({});
    expect(['081234567890', '+62 812-3456-7890', '6281234567890', '0812 3456 789'].map(validWa)).toEqual([true, true, true, true]);
    expect(['12345', '0812abc34567', '', '0712345678', '0812345'].map(validWa)).toEqual([false, false, false, false, false]);
    expect(normalizeWa('+62 (812) 3456-7890')).toBe('081234567890');

    expect(
      spmbMessage(SCHOOL, {
        ...filled,
        student: ' Alya   Putri ',
        path: 'Domisili',
        topics: ['Jalur & kuota', 'Jadwal'],
        question: 'Kapan\nsosialisasi   dimulai?',
        phone: '+62 812-3456-7890',
      }),
    ).toBe(
      'Halo Panitia SPMB SMA Negeri 1 Purbolinggo, saya ingin bertanya.\n\nNama calon murid: Alya Putri\nAsal sekolah: SMP Negeri 2 Purbolinggo\nDomisili: -\nJalur yang diminati: Domisili\nTopik: Jalur & kuota, Jadwal\nPertanyaan: Kapan sosialisasi dimulai?\n\nOrang tua/wali: Ibu Sari Wulandari\nNomor WhatsApp: 081234567890\n\n(Dikirim dari formulir tanya SPMB di website sekolah. Data tidak disimpan di website.)',
    );
    expect(spmbMessage(SCHOOL, { ...filled, role: 'student', domicile: 'Kec. Purbolinggo' })).toContain('\nDomisili: Kec. Purbolinggo\n');
    expect(spmbMessage(SCHOOL, { ...filled, role: 'student' })).toContain('\nCalon murid: Ibu Sari Wulandari\n');
    expect(spmbMessage(SCHOOL, filled)).toContain('\nTopik: -\nPertanyaan: -\n');
  });

  it('galeri bento tanpa sel kosong untuk 1–8 foto (4 kolom layar lebar, 2 kolom HP), sizes mengikuti lebar sel', () => {
    const span = (cls: string, re: RegExp, fallback: number) => Number(re.exec(cls)?.[1] ?? fallback);
    for (let n = 1; n <= 8; n += 1) {
      const cells = galleryCells(n);
      expect(cells).toHaveLength(n);
      const area = cells.reduce((sum, [cls]) => sum + span(cls, /@3xl:col-span-(\d)/, 1) * span(cls, /@3xl:row-span-(\d)/, 1), 0);
      expect(area % 4, `n=${n}`).toBe(0);
      const wide = cells.map(([cls]) => /(^| )col-span-2( |$)/.test(cls));
      expect(wide.filter((w) => !w).length % 2, `n=${n}`).toBe(0);
      expect(wide[0]).toBe(true);
      for (const [i, [cls, sizes]] of cells.entries()) {
        const cols = span(cls, /@3xl:col-span-(\d)/, 1);
        expect(sizes, `n=${n} ${cls}`).toBe(`(min-width: 768px) ${cols === 4 ? '92vw' : cols === 2 ? '46vw' : '23vw'}, ${wide[i] ? '92vw' : '46vw'}`);
      }
    }
  });

  it('tujuan ubin akses cepat & ikon otomatis dari teks', () => {
    const all = () => true;
    expect(
      ['SPMB 2027/2028', 'Berita Sekolah', 'Pengumuman', 'Layanan & Kontak', 'Agenda sekolah', 'Guru kami', 'Ekskul', 'Prestasi murid', 'Mata pelajaran', 'Profil'].map((t) =>
        titleTarget(t, all),
      ),
    ).toEqual(['spmb', 'news', 'announcements', 'contact', 'agenda', 'teachers', 'studentlife', 'achievements', 'programs', 'about']);
    expect(titleTarget('Agenda', (k) => k !== 'agenda')).toBeNull();
    expect(titleTarget('Perpustakaan digital', all)).toBeNull();
    expect(
      ['SPMB 2027/2028', 'Berita Sekolah', 'Pengumuman', 'Layanan & Kontak', 'Perpustakaan digital', 'E-Learning', 'PPID', 'Legalisir ijazah', 'Tracer study alumni'].map((t) => iconKey(t)),
    ).toEqual(['register', 'news', 'notice', 'contact', 'library', 'elearning', 'document', 'certificate', 'alumni']);
    expect(
      ['Keimanan & Ketakwaan', 'Kewargaan', 'Penalaran Kritis', 'Kreativitas', 'Kolaborasi', 'Kemandirian', 'Kesehatan', 'Komunikasi'].map((t) => iconKey(t)),
    ).toEqual(['faith', 'flag', 'mind', 'idea', 'team', 'compass', 'health', 'talk']);
    expect(
      ['Pramuka Kepemimpinan', 'Paskibra Kepemimpinan', 'PMR Kepemimpinan', 'Sanggar Tari Lampung Seni & Budaya', 'KIR (Karya Ilmiah Remaja) Sains & Bahasa', 'English & Debate Club', 'Bola Voli & Futsal Olahraga', 'Rohis & Kerohanian', 'Paduan suara'].map(
        (t) => iconKey(t),
      ),
    ).toEqual(['scout', 'flag', 'health', 'art', 'science', 'talk', 'sport', 'faith', 'music']);
    // Fasilitas: laboratorium komputer berikon laptop (bukan labu laboratorium IPA)
    expect(
      ['Laboratorium IPA', 'Laboratorium Komputer', 'Perpustakaan & Pojok Baca', 'Lapangan Olahraga Serbaguna', 'Masjid & Ruang Ibadah', 'Sanggar Seni', 'Lab TIK'].map((t) => iconKey(t)),
    ).toEqual(['science', 'elearning', 'library', 'sport', 'faith', 'art', 'elearning']);
    expect(iconKey('Sesuatu yang lain', 2)).toBe('book');
  });

  it('tautan "#…": anchor Indonesia (#profil, #program, #ekskul, #ppdb, #guru, #galeri) ke section yang benar, tak dikenal → cadangan', () => {
    expect([...PAGE_SECTIONS]).toEqual(def.sections.map((s) => s.key).filter((k) => k !== 'brand'));
    expect(
      ['berita', '#Program', 'pendaftaran', 'ppdb', 'profil', 'kontak', 'tentang', 'beranda', 'guru', 'ekskul', 'prestasi', 'pengumuman', 'agenda', 'galeri', 'layanan', 'tanya-jawab', 'statistik', 'sambutan', 'lokasi', 'footer', 'fasilitas'].map(
        sectionTarget,
      ),
    ).toEqual([
      'news',
      'programs',
      'spmb',
      'spmb',
      'about',
      'contact',
      'about',
      'hero',
      'teachers',
      'studentlife',
      'achievements',
      'announcements',
      'agenda',
      'gallery',
      'quicklinks',
      'faq',
      'stats',
      'welcome',
      'contact',
      'footer',
      'facilities',
    ]);
    expect(['xyz', 'brand', ''].map(sectionTarget)).toEqual([null, null, null]);
    const m = readPradipta(resolveContent(def, null));
    const fallback = { kind: 'section', target: 'spmb' } as const;
    expect(m.shown('berita')).toBe(false);
    expect(m.linkOr('#berita', fallback)).toEqual({ kind: 'section', target: 'news' });
    expect(m.linkOr('#guru', fallback)).toEqual({ kind: 'section', target: 'teachers' });
    expect(m.linkOr('#beranda', fallback)).toEqual({ kind: 'section', target: 'hero' });
    expect(m.linkOr('#footer', null)).toEqual({ kind: 'section', target: 'footer' });
    expect(m.linkOr('#salah-ketik', fallback)).toBe(fallback);
    expect(m.linkOr('', fallback)).toEqual(fallback);
    expect(m.linkOr('javascript:alert(1)', fallback)).toEqual(fallback);
    expect(readPradipta(resolveContent(def, { news: { enabled: false } })).linkOr('#berita', fallback)).toBe(fallback);
  });

  it('section aktif tetapi kosong tidak tampil; pita putih & langit berselang-seling menurut section yang TAMPIL', () => {
    const empty = resolveContent(def, { testimonials: { items: [{ name: 'Tanpa kutipan' }] }, welcome: { title: '', quote: '', body: '' }, news: { items: [{ date: '2026-10-01' }] } });
    expect([sectionShown(empty, 'testimonials'), sectionShown(empty, 'welcome'), sectionShown(empty, 'news'), sectionShown(empty, 'xyz')]).toEqual([false, false, false, false]);
    expect(navItems(empty).map((i) => i.key)).not.toContain('news');
    const bands = (content: SiteContent) => {
      const tones = bandTones(content);
      const shown = BANDS.filter((key) => sectionShown(content, key) || (key === 'announcements' && sectionShown(content, 'agenda')));
      return shown.map((key) => tones[key]);
    };
    for (const content of [
      resolveContent(def, null),
      empty,
      resolveContent(def, { stats: { enabled: false }, about: { enabled: false } }),
      resolveContent(def, { announcements: { enabled: false }, gallery: { items: [] }, faq: { enabled: false } }),
      resolveContent(def, { facilities: { items: [] } }),
    ]) {
      const list = bands(content);
      expect(list[0]).toBe('sky');
      for (let i = 1; i < list.length; i += 1) expect(list[i], `pita ${i}: ${list.join(',')}`).not.toBe(list[i - 1]);
      // Pita ajakan di atas footer = kebalikan pita terakhir yang tampil
      expect(bandTones(content).footer, list.join(',')).not.toBe(list[list.length - 1]);
    }
    const tones = bandTones(resolveContent(def, null));
    expect(tones.quicklinks).toBe('white');
    expect(tones.announcements).toBe(tones.agenda);
    // Fasilitas = pita langit sesudah prestasi (putih); kontak (terakhir) langit → pita ajakan footer putih bergaris
    expect([tones.achievements, tones.facilities, tones.news]).toEqual(['white', 'sky', 'white']);
    expect([tones.contact, tones.footer]).toEqual(['sky', 'white']);
    // Galeri / FAQ / testimoni / kontak / fasilitas disembunyikan → section terakhir berpita putih → pita footer langit
    for (const hidden of ['gallery', 'faq', 'testimonials', 'contact', 'facilities']) {
      const t = bandTones(resolveContent(def, { [hidden]: { enabled: false } }));
      expect(t.footer, hidden).toBe('sky');
    }
  });
});

describe('Pradipta: demo', () => {
  it('urutan section, satu h1, header putih yang tidak menumpang di hero, lintasan menu + penunjuk, logo', () => {
    const container = demo();
    // Footer juga tujuan tautan "#footer" (landmark <footer> ber-data-tpl-section)
    expect(sectionKeys(container)).toEqual([...ORDER, 'footer']);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const header = container.querySelector('header')!;
    expect(header.className).toContain('sticky');
    expect(header.className).toContain('bg-white');
    expect(header.className).not.toMatch(/\bh-0\b|bg-transparent|absolute/);
    expect(header.hasAttribute('data-tpl-tone')).toBe(false);
    // Logo & nama: tautan flex ke awal halaman
    expect(within(header).getByRole('link', { name: `${SCHOOL}, ke awal halaman` }).className).toMatch(/^flex .*items-center/);
    expect(header.querySelector('img[src="/assets/templates/logos/tut-wuri-handayani.svg"]'), 'logo demo').not.toBeNull();
    const nav = within(header).getAllByRole('navigation', { name: 'Menu utama' })[0];
    expect(linkList(nav)).toEqual(['Profil|#tentang', 'Akademik|#programs', 'Ekskul|#studentlife', 'Berita|#berita', 'SPMB|#spmb', 'Kontak|#kontak']);
    // Lintasan pil langit + penunjuk putih (posisi lewat variabel CSS; tanpa tata letak di jsdom → tersembunyi)
    const indicator = nav.querySelector('.pd-ind')!;
    expect(indicator).toHaveAttribute('aria-hidden', 'true');
    expect(indicator.className).toContain('bg-white');
    expect(withClass(indicator, 'bg-(--pd-sky2)')).not.toBeNull();
    expect(Array.from(nav.querySelectorAll('a')).map((a) => a.getAttribute('data-pd-key'))).toEqual(['about', 'programs', 'studentlife', 'news', 'spmb', 'contact']);
    // Tombol menu atas hanya menuju info SPMB (pendaftaran di portal provinsi): tidak berlabel "Daftar"
    expect(within(header).getByRole('link', { name: 'Info SPMB' })).toHaveAttribute('href', '#spmb');
    expect(header.textContent).not.toMatch(/Daftar/);
    // Klik menu: gulir ke section dan langsung ditandai aktif
    fireEvent.click(within(nav).getByRole('link', { name: 'Berita' }));
    expect(scrolled).toEqual(['news']);
    expect(within(nav).getByRole('link', { name: 'Berita' })).toHaveAttribute('aria-current', 'true');
    cleanup();
    expect(demo({ brand: { logo: '' } }).querySelector('header svg[viewBox="0 0 32 32"]'), 'PradiptaMark').not.toBeNull();
  });

  it('menu HP: tombol buka/tutup (aria-expanded), menu utama kedua, Esc menutup dan fokus kembali ke tombol', () => {
    const header = demo().querySelector('header')!;
    const toggle = within(header).getByRole('button', { name: 'Buka menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAttribute('aria-label', 'Tutup menu');
    const panel = document.getElementById(toggle.getAttribute('aria-controls')!)!;
    expect(panel).toHaveAttribute('aria-label', 'Menu utama');
    expect(within(header).getAllByRole('navigation', { name: 'Menu utama' })).toHaveLength(2);
    expect(within(panel).getAllByRole('link').map((a) => a.textContent)).toEqual(['Profil', 'Akademik', 'Ekskul', 'Berita', 'SPMB', 'Kontak', 'Info SPMB']);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
    // Tautan di panel menutup menu
    fireEvent.click(toggle);
    fireEvent.click(within(document.getElementById(toggle.getAttribute('aria-controls')!)!).getByRole('link', { name: 'Kontak' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(scrolled).toEqual(['contact']);
  });

  it('hero "thumbs": foto latar selebar layar, kartu putih tanpa bayangan berisi chip + H1 + deskripsi + 2 tombol', () => {
    const container = demo();
    const hero = section(container, 'hero');
    expect(hero.getAttribute('data-hero-layout')).toBe('thumbs');
    expect(hero.querySelector('h1')!.textContent).toBe('Sekolah Negeri yang Menyalakan Rasa Ingin Tahu');
    // Foto selebar layar: wadah foto anak langsung section, bukan di dalam CONTAINER / bingkai membulat
    const slide = hero.querySelector<HTMLElement>('.pd-slide')!;
    const frame = slide.parentElement!;
    expect(frame.parentElement).toBe(hero);
    expect(frame.className).not.toMatch(/rounded|max-w-|mx-auto|px-/);
    // HP: foto 6:5 (judul & tombol pertama masuk layar pertama HP); layar lebar: minimal max(600px, min(80svh, 880px))
    // dan ikut memanjang dengan kartu
    expect(frame.className).toContain('aspect-[6/5]');
    expect(frame.className).not.toContain('aspect-[4/5]');
    expect(frame.className).toContain('@5xl:min-h-[max(600px,min(80svh,880px))]');
    expect(frame.className).not.toMatch(/@5xl:h-\[/);
    // Layar lebar: foto & isi berbagi satu sel grid (isi BUKAN absolute): teks CMS panjang memanjangkan hero, kartu
    // tidak naik ke bawah header lengket
    expect(hero.className).toContain('@5xl:grid');
    const overlay = frame.nextElementSibling as HTMLElement;
    expect(overlay.className).toContain('@5xl:col-start-1 @5xl:row-start-1 @5xl:self-end');
    expect(frame.className).toContain('@5xl:col-start-1 @5xl:row-start-1');
    expect(readFileSync(resolve(ROOT, 'src/templates/pradipta/Hero.tsx'), 'utf8')).not.toMatch(/@5xl:absolute|@5xl:inset-0/);
    const img = hero.querySelector<HTMLImageElement>('img[fetchpriority="high"]')!;
    expect(img.getAttribute('src')).toBe('/assets/templates/photos/pradipta-hero-1-1920.webp');
    expect(img.getAttribute('srcset')).toContain('-1280.webp 1280w');
    // HP/tablet: foto 16:9 menutupi wadah 6:5 / 16:10 (± 1,48× / 1,11× lebar layar) → sizes lebar tergambar, bukan 100vw
    const SIZES = '(max-width: 575px) 148vw, (max-width: 1023px) 112vw, 100vw';
    expect(img.getAttribute('sizes')).toBe(SIZES);
    for (const slide of hero.querySelectorAll('.pd-slide img')) expect(slide.getAttribute('sizes')).toBe(SIZES);
    expect(img.getAttribute('loading')).toBe('eager');
    expect(Number(img.getAttribute('width'))).toBe(1920);
    expect(Number(img.getAttribute('height'))).toBe(1080);
    // Slide 1 (LCP, kesan pertama, pratinjau katalog) = guru & murid berseragam putih abu-abu, bukan langit/tiang bendera
    expect(img.getAttribute('alt')).toMatch(/guru .*murid berseragam putih abu-abu/i);
    expect(container.querySelectorAll('img[fetchpriority="high"]')).toHaveLength(1);
    // Gradasi gelap lembut di bawah foto hanya di layar lebar (teks putih thumbnail), tidak menutupi foto di HP
    expect(hero.querySelector('.pd-hero-scrim')!.className).toContain('hidden @5xl:block');
    // Kartu putih radius 24 tanpa bayangan; menumpang 32px di foto (HP), kiri bawah di atas foto (layar lebar)
    const card = withClass(hero.querySelector('h1'), 'rounded-[24px]')!;
    expect(card).not.toBeNull();
    expect(card.className).toContain('bg-white');
    expect(card.className).toContain('-mt-8');
    expect(card.className).toContain('@5xl:mt-0');
    expect(card.className).not.toMatch(/shadow/);
    expect(within(card).getByText('SMA Negeri · Purbolinggo, Lampung Timur')).toBeInTheDocument();
    // Ikon penanda lokasi hanya di chip slide 1; chip slide lain bertitik warna tema
    const chipOf = (el: Element) => Array.from(el.querySelectorAll('p')).find((p) => p.className.includes('rounded-full'))!;
    const liveChip = chipOf(hero.querySelector('h1')!.parentElement!);
    expect(liveChip.querySelector('svg')).not.toBeNull();
    for (const ghost of card.querySelectorAll('[aria-hidden="true"][inert]')) {
      expect(chipOf(ghost).querySelector('svg'), chipOf(ghost).textContent ?? '').toBeNull();
      expect(chipOf(ghost).querySelector('.bg-\\(--tpl-accent\\)')).not.toBeNull();
    }
    expect(card.textContent).toContain('SMA negeri di Purbolinggo, Lampung Timur, yang menyiapkan murid');
    expect(within(card).getByRole('link', { name: 'Profil Sekolah' })).toHaveAttribute('href', '#tentang');
    expect(within(card).getByRole('link', { name: 'Informasi SPMB' })).toHaveAttribute('href', '#spmb');
    // Teks slide lain menumpuk tak terlihat di sel yang sama (tinggi kartu tetap), bukan h1 dan tersembunyi dari pembaca layar
    const ghosts = card.querySelectorAll('[aria-hidden="true"][inert]');
    expect(ghosts).toHaveLength(3);
    for (const ghost of ghosts) {
      expect(ghost.className).toContain('invisible');
      expect(ghost.querySelector('h1')).toBeNull();
    }
  });

  it('hero slider: 4 slide, thumbnail berketerangan (HP: bulatan bernomor) + sebelumnya/berikutnya, panah keyboard, geser, jeda, berhenti saat disorot', () => {
    const hero = section(demo(), 'hero');
    expect(hero.getAttribute('aria-roledescription')).toBe('carousel');
    expect(hero.getAttribute('aria-label')).toBe(`Sorotan ${SCHOOL}`);
    const controls = within(hero).getByRole('group', { name: 'Kontrol slide' });
    const dots = within(controls).getAllByRole('button', { name: /^Slide \d dari 4/ });
    expect(dots).toHaveLength(4);
    // Nama aksesibel memuat keterangan thumbnail (Label in Name)
    expect(dots.map((d) => d.getAttribute('aria-label'))).toEqual([
      'Slide 1 dari 4: Profil sekolah',
      'Slide 2 dari 4: Upacara bendera',
      'Slide 3 dari 4: Seni & budaya',
      'Slide 4 dari 4: Ekstrakurikuler',
    ]);
    // Tombol 44px; HP = bulatan bernomor, layar lebar = thumbnail 16:10 + bilah progres + nomor & keterangan
    for (const [i, dot] of dots.entries()) {
      expect(dot.className).toContain('h-11 w-11');
      const number = Array.from(dot.querySelectorAll('span')).find((s) => s.className.includes('@5xl:hidden'))!;
      expect(number.textContent).toBe(String(i + 1));
      expect(dot.querySelector('.hidden.\\@5xl\\:block')).not.toBeNull();
      expect(dot.textContent).toContain(`0${i + 1}`);
    }
    expect(dots[1].textContent).toContain('Upacara bendera');
    expect(dots[0]).toHaveAttribute('aria-current', 'true');
    const progress = () => Array.from(hero.querySelectorAll('.pd-progress'));
    // Bilah progres di thumbnail aktif (layar lebar) + satu bilah di bawah bulatan (HP)
    expect(progress()).toHaveLength(2);
    expect(dots[0].querySelector('.pd-progress')).not.toBeNull();
    for (const bar of progress()) {
      expect(bar).toHaveAttribute('data-run', 'true');
      expect(bar).toHaveAttribute('data-hold', 'false');
    }
    // Hanya foto slide 1 yang dimuat di awal (eager) + thumbnail-nya (lazy)
    expect(hero.querySelectorAll('.pd-slide img')).toHaveLength(1);
    expect(dots[0].querySelector('img')).toHaveAttribute('loading', 'lazy');
    expect(dots[1].querySelector('img')).toBeNull();
    expect(within(controls).getByText('01 / 04')).toBeInTheDocument();

    fireEvent.click(within(controls).getByRole('button', { name: 'Slide berikutnya' }));
    expect(dots[1]).toHaveAttribute('aria-current', 'true');
    expect(dots[0]).not.toHaveAttribute('aria-current');
    expect(hero.querySelector('h1')!.textContent).toBe('Tumbuh Disiplin, Santun, dan Cinta Tanah Air');
    expect(within(controls).getByText('02 / 04')).toBeInTheDocument();
    // Tombol kartu ikut slide
    expect(within(hero).getByRole('link', { name: 'Visi & Misi' })).toHaveAttribute('href', '#tentang');
    expect(within(hero).getByRole('link', { name: 'Pengumuman' })).toHaveAttribute('href', '#pengumuman');
    const imgs = Array.from(hero.querySelectorAll<HTMLImageElement>('.pd-slide img'));
    expect(imgs.map((i) => i.getAttribute('fetchpriority'))).toEqual(['high', null, null, null]);
    expect(imgs.slice(1).every((i) => i.getAttribute('loading') === 'lazy')).toBe(true);
    expect(imgs.map((i) => i.getAttribute('alt') !== '')).toEqual([false, true, false, false]);
    expect(Array.from(hero.querySelectorAll('.pd-slide')).map((s) => s.getAttribute('aria-hidden'))).toEqual(['true', null, 'true', 'true']);
    expect(hero.querySelectorAll('h1')).toHaveLength(1);
    expect(dots.every((d) => d.querySelector('img'))).toBe(true);

    fireEvent.click(within(controls).getByRole('button', { name: 'Slide sebelumnya' }));
    fireEvent.click(within(controls).getByRole('button', { name: 'Slide sebelumnya' }));
    expect(dots[3]).toHaveAttribute('aria-current', 'true');
    fireEvent.keyDown(dots[3], { key: 'ArrowRight' });
    expect(dots[0]).toHaveAttribute('aria-current', 'true');
    fireEvent.keyDown(dots[0], { key: 'ArrowLeft' });
    expect(dots[3]).toHaveAttribute('aria-current', 'true');
    fireEvent.click(dots[2]);
    expect(hero.querySelector('h1')!.textContent).toBe('Bangga Merawat Seni, Bahasa, dan Budaya Daerah');
    // Geser ke kiri di HP → slide berikutnya; geser vertikal (gulir) diabaikan
    fireEvent.touchStart(hero, { touches: [{ clientX: 300, clientY: 200 }] });
    fireEvent.touchEnd(hero, { changedTouches: [{ clientX: 180, clientY: 210 }] });
    expect(dots[3]).toHaveAttribute('aria-current', 'true');
    fireEvent.touchStart(hero, { touches: [{ clientX: 300, clientY: 200 }] });
    fireEvent.touchEnd(hero, { changedTouches: [{ clientX: 240, clientY: 420 }] });
    expect(dots[3]).toHaveAttribute('aria-current', 'true');

    fireEvent.mouseEnter(hero);
    for (const bar of progress()) expect(bar).toHaveAttribute('data-hold', 'true');
    fireEvent.mouseLeave(hero);
    for (const bar of progress()) expect(bar).toHaveAttribute('data-hold', 'false');
    fireEvent.click(within(controls).getByRole('button', { name: 'Jeda slide otomatis' }));
    expect(within(controls).getByRole('button', { name: 'Putar slide otomatis' })).toBeInTheDocument();
    for (const bar of progress()) expect(bar).toHaveAttribute('data-run', 'false');
  });

  it('hero slider berganti saat bilah progres penuh dan BERHENTI SENDIRI setelah dua putaran (WCAG 2.2.2)', () => {
    const hero = section(demo(), 'hero');
    const controls = within(hero).getByRole('group', { name: 'Kontrol slide' });
    const current = () => within(controls).getAllByRole('button', { name: /^Slide \d dari 4/ }).findIndex((b) => b.getAttribute('aria-current') === 'true');
    // React memilih nama event animationend/webkitAnimationEnd dari gaya jsdom: kirim yang kedua bila yang pertama diabaikan
    const tick = () => {
      const before = current();
      const bar = hero.querySelector('.pd-progress')!;
      fireEvent.animationEnd(bar);
      if (current() === before) fireEvent(bar, new Event('webkitAnimationEnd', { bubbles: true }));
    };
    tick();
    expect(current()).toBe(1);
    for (let i = 0; i < 6; i += 1) tick();
    expect(current()).toBe(3);
    expect(within(controls).getByRole('button', { name: 'Jeda slide otomatis' })).toBeInTheDocument();
    // Putaran kedua selesai → kembali ke slide 1 dan berhenti (tombol putar tampil)
    tick();
    expect(current()).toBe(0);
    expect(within(controls).getByRole('button', { name: 'Putar slide otomatis' })).toBeInTheDocument();
    for (const bar of hero.querySelectorAll('.pd-progress')) expect(bar).toHaveAttribute('data-run', 'false');
    // Putar lagi → berjalan dua putaran baru
    fireEvent.click(within(controls).getByRole('button', { name: 'Putar slide otomatis' }));
    expect(hero.querySelector('.pd-progress')).toHaveAttribute('data-run', 'true');
  });

  it('LCP aman: foto & teks slide pertama tidak dianimasikan masuk; teks naik & foto memudar hanya setelah pergantian', () => {
    const hero = section(demo(), 'hero');
    const textBlock = () => hero.querySelector('h1')!.parentElement!;
    const buttons = () => Array.from(withClass(hero.querySelector('h1'), 'rounded-[24px]')!.querySelectorAll('[data-enter]')).find((el) => !el.querySelector('h1'))!;
    expect(textBlock()).toHaveAttribute('data-enter', 'false');
    expect(buttons()).toHaveAttribute('data-enter', 'false');
    const first = hero.querySelector('.pd-slide')!;
    expect(first.className).toContain('opacity-100');
    expect(first.querySelector('img')!.className).not.toMatch(/pd-|reveal|opacity-0/);
    const controls = within(hero).getByRole('group', { name: 'Kontrol slide' });
    fireEvent.click(within(controls).getByRole('button', { name: 'Slide berikutnya' }));
    expect(textBlock()).toHaveAttribute('data-enter', 'true');
    expect(buttons()).toHaveAttribute('data-enter', 'true');
    expect(Array.from(hero.querySelectorAll('.pd-slide')).map((s) => s.getAttribute('data-active'))).toEqual(['false', 'true', 'false', 'false']);
    // CSS: pudar foto & teks naik hanya bila gerak menyala, tanpa animasi masuk pada .pd-slide, mati saat prefers-reduced-motion
    const css = readFileSync(resolve(ROOT, 'src/templates/pradipta/pradipta.css'), 'utf8');
    expect(css).toMatch(/@layer components/);
    expect(css).toMatch(/\[data-tpl-motion='on'\] \.pd-slide \{\s*transition: opacity 800ms/);
    expect(css).toMatch(/\[data-tpl-motion='on'\] \[data-enter='true'\] \.pd-rise/);
    expect(css).not.toMatch(/\.pd-slide[^{]*\{[^}]*animation/);
    expect(css).not.toMatch(/box-shadow|drop-shadow|text-shadow/);
    // Setiap animasi/transisi bergantung pada data-tpl-motion='on' (kecuali aturan statis tanpa gerak)
    for (const rule of css.match(/[^{}]+\{[^{}]*\b(animation|transition):[^{}]*\}/g) ?? []) {
      if (/animation: none|transition: none/.test(rule)) continue;
      expect(rule, rule.trim().slice(0, 80)).toMatch(/\[data-tpl-motion='on'\]/);
    }
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    for (const selector of ['.pd-progress', '.pd-rise', '.pd-slide', '.pd-ind', '.pd-collapse', '.pd-step', '.pd-pop', '.pd-axis', '.pd-page', '.pd-zoom', '.pd-bar']) {
      expect(reduced, selector).toContain(selector);
    }
  });

  it('hero slider: wilayah live tetap (tidak dipasang ulang) mengumumkan slide yang dipilih manual; diam saat berganti otomatis', () => {
    const hero = section(demo(), 'hero');
    const status = () => hero.querySelector<HTMLElement>('[data-pd-slide-status]')!;
    const live = status();
    expect(hero.querySelectorAll('[aria-live]')).toHaveLength(1);
    expect(live).toHaveClass('sr-only');
    expect(live).toHaveAttribute('aria-live', 'off');
    const controls = within(hero).getByRole('group', { name: 'Kontrol slide' });
    const next = within(controls).getByRole('button', { name: 'Slide berikutnya' });
    act(() => next.focus());
    expect(live).toHaveAttribute('aria-live', 'polite');
    fireEvent.click(next);
    expect(status()).toBe(live);
    expect(live).toHaveTextContent('Slide 2 dari 4: Tumbuh Disiplin, Santun, dan Cinta Tanah Air');
  });

  it('IntersectionObserver: slider berhenti saat hero di luar layar; penunjuk menu tetap menyala di section tanpa item menu', () => {
    // IntersectionObserver tiruan: simpan setiap pengamat + targetnya, picu entri secara manual
    const observers: { cb: IntersectionObserverCallback; targets: Element[]; options?: IntersectionObserverInit }[] = [];
    class FakeIO {
      cb: IntersectionObserverCallback;
      record: (typeof observers)[number];
      constructor(cb: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        this.cb = cb;
        this.record = { cb, targets: [], options };
        observers.push(this.record);
      }
      observe(el: Element) {
        this.record.targets.push(el);
      }
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    const original = window.IntersectionObserver;
    window.IntersectionObserver = FakeIO as unknown as typeof IntersectionObserver;
    try {
      const container = demo();
      const fire = (el: Element, isIntersecting: boolean, ratio = isIntersecting ? 1 : 0) => {
        for (const o of observers.filter((x) => x.targets.includes(el)))
          act(() => o.cb([{ target: el, isIntersecting, intersectionRatio: ratio } as unknown as IntersectionObserverEntry], {} as IntersectionObserver));
      };
      // Slider: hero keluar layar → bilah progres ditahan (putaran tidak habis tanpa dilihat)
      const hero = section(container, 'hero');
      const frame = hero.querySelector('.pd-slide')!.parentElement!;
      const bars = () => Array.from(hero.querySelectorAll('.pd-progress'));
      expect(bars().every((b) => b.getAttribute('data-hold') === 'false')).toBe(true);
      fire(frame, false);
      expect(bars().every((b) => b.getAttribute('data-hold') === 'true')).toBe(true);
      fire(frame, true, 0.6);
      expect(bars().every((b) => b.getAttribute('data-hold') === 'false')).toBe(true);
      // Penunjuk menu: semua section diamati; guru → Berita, galeri → SPMB, statistik → tanpa penunjuk
      const nav = within(container.querySelector('header')!).getAllByRole('navigation', { name: 'Menu utama' })[0];
      const current = () => Array.from(nav.querySelectorAll('a[aria-current="true"]')).map((a) => a.textContent);
      const spy = observers.find((o) => o.options?.rootMargin === '-40% 0px -55% 0px')!;
      expect(spy.targets.map((t) => t.getAttribute('data-tpl-section'))).toEqual([...ORDER, 'footer']);
      const at = (key: string | null) =>
        act(() =>
          spy.cb(
            spy.targets.map((el) => ({ target: el, isIntersecting: el.getAttribute('data-tpl-section') === key }) as unknown as IntersectionObserverEntry),
            {} as IntersectionObserver,
          ),
        );
      at('teachers');
      expect(current()).toEqual(['Berita']);
      at('gallery');
      expect(current()).toEqual(['SPMB']);
      at('achievements');
      expect(current()).toEqual(['Ekskul']);
      at('facilities');
      expect(current()).toEqual(['Ekskul']);
      // Di sela section (tidak ada di pita tengah) → tetap
      at(null);
      expect(current()).toEqual(['Ekskul']);
      at('stats');
      expect(current()).toEqual([]);
    } finally {
      window.IntersectionObserver = original;
    }
  });

  it('akses cepat (4 ubin: 2 tautan + E-Learning & PPID yang membuka catatan, H2 untuk pembaca layar) dan statistik dalam gelembung + keterangan periode data', () => {
    const container = demo();
    const quick = section(container, 'quicklinks');
    expect(quick.querySelector('h2.sr-only')?.textContent).toBe('Akses cepat');
    for (const name of ['SPMB 2027/2028', 'Pengumuman', 'E-Learning', 'PPID']) expect(within(quick).getByRole('heading', { level: 3, name }), name).toBeInTheDocument();
    expect(within(quick).getAllByRole('heading', { level: 3 })).toHaveLength(4);
    expect(Array.from(quick.querySelectorAll('a')).map((a) => a.getAttribute('href'))).toEqual(['#spmb', '#pengumuman']);
    for (const a of quick.querySelectorAll('a')) expect(a.className).toContain('rounded-[20px]');
    fireEvent.click(quick.querySelectorAll('a')[1]);
    expect(scrolled).toEqual(['announcements']);
    // Layanan tanpa tautan (alamat diisi sekolah) = tombol buka-tutup catatan, bukan tautan palsu; bulatan "+" bukan panah
    const tiles = within(quick).getAllByRole('button', { expanded: false });
    expect(tiles.map((b) => b.getAttribute('aria-labelledby') && document.getElementById(b.getAttribute('aria-labelledby')!)!.textContent)).toEqual(['E-Learning', 'PPID']);
    for (const b of tiles) {
      expect(b).toHaveAttribute('type', 'button');
      expect(b.className).toContain('rounded-[20px]');
      expect(b.parentElement!.tagName).toBe('H3');
      expect(b.querySelector('.lucide-plus')).not.toBeNull();
      expect(b.querySelector('.lucide-arrow-right')).toBeNull();
    }
    expect(tiles[0]).toHaveAccessibleName('E-Learning');
    expect(tiles[0]).toHaveAccessibleDescription('Materi dan tugas kelas dari guru.');
    const note = document.getElementById(tiles[0].getAttribute('aria-controls')!)!;
    expect(tiles[1].getAttribute('aria-controls')).toBe(note.id);
    expect(note).not.toBeVisible();
    fireEvent.click(tiles[0]);
    expect(tiles[0]).toHaveAttribute('aria-expanded', 'true');
    expect(note).toBeVisible();
    expect(note.textContent).toMatch(/^E-Learning: Tautan layanan ini diisi sekolah di CMS/);
    // Satu panel untuk semua ubin: ubin lain membuka panel yang sama dengan judulnya
    fireEvent.click(tiles[1]);
    expect(tiles.map((b) => b.getAttribute('aria-expanded'))).toEqual(['false', 'true']);
    expect(note.textContent).toMatch(/^PPID: /);
    // Tutup → panel tersembunyi, fokus kembali ke ubin yang membukanya
    fireEvent.click(within(note).getByRole('button', { name: 'Tutup' }));
    expect(note).not.toBeVisible();
    expect(tiles[1]).toHaveFocus();
    expect(tiles[1]).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(tiles[1]);
    fireEvent.click(tiles[1]);
    expect(note).not.toBeVisible();
    cleanup();
    // Ubin tanpa tautan & tanpa section yang cocok: dengan catatan → tombol; tanpa catatan → ubin diam (tanpa panah/plus)
    const plainItems = [
      { title: 'Perpustakaan', text: 'Buka setiap hari', url: '' },
      { title: 'Agenda', text: '', url: '' },
    ];
    const withNote = section(demo({ quicklinks: { items: plainItems } }), 'quicklinks');
    expect(Array.from(withNote.querySelectorAll('a')).map((a) => a.getAttribute('href'))).toEqual(['#agenda']);
    expect(within(withNote).getAllByRole('button').map((b) => b.getAttribute('aria-expanded'))).toEqual(['false']);
    expect(within(withNote).getByRole('button')).toHaveAccessibleName('Perpustakaan');
    cleanup();
    const plain = section(demo({ quicklinks: { pending_note: '', items: plainItems } }), 'quicklinks');
    expect(Array.from(plain.querySelectorAll('a')).map((a) => a.getAttribute('href'))).toEqual(['#agenda']);
    expect(within(plain).queryByRole('button')).toBeNull();
    expect(within(plain).getByRole('heading', { level: 3, name: 'Perpustakaan' }).closest('li')!.querySelector('.lucide-plus')).toBeNull();
    // Tautan luar (mis. alamat e-learning yang sudah diisi) → tautan biasa dengan panah
    cleanup();
    const filled = section(demo({ quicklinks: { items: [{ title: 'E-Learning', text: '', url: 'https://elearning.contoh.sch.id/' }] } }), 'quicklinks');
    expect(within(filled).getByRole('link', { name: 'E-Learning' })).toHaveAttribute('href', 'https://elearning.contoh.sch.id/');
    expect(within(filled).queryByRole('button')).toBeNull();
    cleanup();

    const stats = section(demo(), 'stats');
    const items = Array.from(stats.querySelectorAll('ul > li'));
    expect(items).toHaveLength(6);
    expect(items[0].textContent).toContain('1.048');
    expect(items[0].textContent).toContain('Peserta didik');
    expect(items[0].textContent).toContain('X 360 · XI 352 · XII 336');
    const bubble = items[0].querySelector('.rounded-full.aspect-square')!;
    expect(bubble).not.toBeNull();
    // Pita langit → gelembung putih
    expect(stats.className).toContain('bg-(--pd-sky)');
    expect(bubble.className).toContain('bg-white');
    // HP: gelembung maks. 140px (184px mulai @xl); angka dibatasi ukuran muat dari nilai terpanjang (satuan cqi gelembung)
    expect(bubble.className).toContain('max-w-[140px]');
    expect(bubble.className).toContain('@xl:max-w-[184px]');
    expect(bubble.className).toContain('[container-type:inline-size]');
    expect(bubble.querySelector('p')!.className).toContain('text-[length:min(var(--pd-stat),var(--pd-fit,999px))]');
    // Di dalam gelembung (wadah kueri) tidak boleh ada varian @… (akan mengukur gelembung, bukan halaman)
    for (const el of bubble.querySelectorAll('*')) expect(String(el.getAttribute('class') ?? ''), el.textContent ?? '').not.toMatch(/(^| )@\d?xl:/);
    const list = stats.querySelector('ul')!;
    expect(list.className).toContain('@3xl:[--pd-stat:38px]');
    expect(list.style.getPropertyValue('--pd-fit')).toBe('calc((100cqi - 28px) / 3.00)');
    cleanup();
    // Nilai 9 karakter dari CMS → ukuran muat mengecil sesuai panjangnya
    const long = section(demo({ stats: { items: [{ value: '1.250.000', label: 'Buku' }] } }), 'stats');
    expect(long.querySelector('ul')!.style.getPropertyValue('--pd-fit')).toBe('calc((100cqi - 28px) / 5.40)');
    cleanup();
    expect(section(demo(), 'stats').textContent).toContain('Data Tahun Ajaran 2026/2027 · angka ilustrasi untuk demo.');
  });

  it('profil (data ringkas, visi, misi bernomor, nilai), sambutan kepala sekolah', () => {
    const container = demo();
    const about = section(container, 'about');
    expect(about.querySelector('h2')!.textContent).toBe('Mengenal sekolah kami');
    expect(within(about).getByText('Profil Sekolah')).toBeInTheDocument();
    expect(Array.from(about.querySelectorAll('dt')).map((d) => d.textContent)).toEqual(['Jenjang', 'Wilayah', 'Rombongan belajar', 'Hari belajar']);
    expect(Array.from(about.querySelectorAll('dd')).map((d) => d.textContent)).toContain('30 kelas (X–XII)');
    expect(within(about).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Visi', 'Misi', 'Nilai yang kami tumbuhkan']);
    expect(about.querySelectorAll('ol > li')).toHaveLength(5);
    expect(about.querySelector('ol > li')!.textContent).toMatch(/^01Menyelenggarakan pembelajaran mendalam/);
    expect(about.querySelectorAll('ul > li')).toHaveLength(8);
    expect(about.querySelectorAll('ul > li svg')).toHaveLength(8);
    // Nilai = daftar ikon bergaris tipis, BUKAN ubin kartu (kartu ikon sudah dipakai akses cepat & ekskul)
    for (const li of about.querySelectorAll('ul > li')) {
      expect(li.className).toContain('border-t');
      expect(li.className).not.toMatch(/rounded-\[20px\]|ring-1/);
    }

    const welcome = section(container, 'welcome');
    expect(welcome.querySelector('blockquote')?.textContent).toMatch(/^Kami ingin setiap murid merasa aman/);
    expect(welcome.querySelectorAll('p').length).toBeGreaterThanOrEqual(3);
    expect(within(welcome).getByRole('link', { name: 'Kenali guru kami' })).toHaveAttribute('href', '#teachers');
    // Demo tanpa foto wajah (nama fiktif tidak ditempel pada orang sungguhan): papan nama berlogo + inisial tanpa gelar,
    // bukan kotak "foto" kosong; nama & jabatan hanya sekali (di papan)
    expect(within(welcome).queryByRole('img')).toBeNull();
    const plate = welcome.querySelector<HTMLElement>('[data-pd-plate]')!;
    expect(plate).not.toBeNull();
    expect(plate.className).toContain('bg-white');
    expect(plate.className).not.toMatch(/shadow/);
    expect(plate.querySelector('img')).toHaveAttribute('alt', '');
    expect(plate.querySelector('img')).toHaveAttribute('src', '/assets/templates/logos/tut-wuri-handayani.svg');
    expect(plate.querySelector('[aria-hidden]')!.textContent).toBe('BS');
    expect(plate.textContent).toContain('Drs. Bambang Setiadi, M.Pd.');
    expect(plate.textContent).toContain('Kepala SMA Negeri 1 Purbolinggo');
    expect(welcome.textContent!.split('Drs. Bambang Setiadi, M.Pd.')).toHaveLength(2);
    cleanup();
    // Sekolah mengunggah foto → foto 4:5 di kiri, nama & jabatan di bawah sambutan
    const withPhoto = section(demo({ welcome: { photo: '/assets/templates/photos/pradipta-profil-960.webp' } }), 'welcome');
    expect(withPhoto.querySelector('[data-pd-plate]')).toBeNull();
    expect(withPhoto.querySelector('img')!.closest('[class*="aspect-[4/5]"]')).not.toBeNull();
    expect(withPhoto.textContent).toContain('Kepala SMA Negeri 1 Purbolinggo');
    cleanup();
    // Tanpa foto dan tanpa nama/jabatan → tanpa kolom kiri, teks selebar penuh
    const bare = section(demo({ welcome: { name: '', role: '' } }), 'welcome');
    expect(bare.querySelector('[data-pd-plate]')).toBeNull();
    expect(bare.querySelector('[class*="@5xl:grid-cols-12"]')).toBeNull();
    expect(bare.querySelector('blockquote')).not.toBeNull();
  });

  it('akademik: buka-tutup kelompok mapel (satu terbuka) dengan chip mapel; foto di samping berganti mengikuti kelompok', () => {
    const programs = section(demo(), 'programs');
    const buttons = within(programs).getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['01Sains & Teknologi', '02Sosial & Humaniora', '03Bahasa & Budaya']);
    expect(buttons.map((b) => b.getAttribute('aria-expanded'))).toEqual(['true', 'false', 'false']);
    for (const b of buttons) expect(b.parentElement!.tagName).toBe('H3');
    const panel = (b: HTMLElement) => document.getElementById(b.getAttribute('aria-controls')!)!;
    expect(panel(buttons[0])).toHaveAttribute('role', 'region');
    expect(panel(buttons[0])).toHaveAttribute('aria-labelledby', buttons[0].id);
    expect(panel(buttons[1])).toHaveAttribute('inert');
    expect(within(panel(buttons[0])).getByRole('list', { name: 'Mata pelajaran Sains & Teknologi' }).querySelectorAll('li')).toHaveLength(5);
    const photos = () => Array.from(programs.querySelectorAll<HTMLElement>('.pd-fade'));
    expect(photos().map((p) => p.className.includes('opacity-100'))).toEqual([true, false, false]);
    expect(photos().map((p) => p.querySelector('img')!.getAttribute('alt') !== '')).toEqual([true, false, false]);
    fireEvent.click(buttons[1]);
    expect(buttons.map((b) => b.getAttribute('aria-expanded'))).toEqual(['false', 'true', 'false']);
    expect(photos().map((p) => p.className.includes('opacity-100'))).toEqual([false, true, false]);
    expect(photos().map((p) => p.getAttribute('aria-hidden'))).toEqual(['true', null, 'true']);
    // HP: foto kelompok yang terbuka tampil di panelnya
    expect(panel(buttons[1]).querySelector('img')!.closest('[class*="@5xl:hidden"]')).not.toBeNull();
    fireEvent.click(buttons[1]);
    expect(buttons.map((b) => b.getAttribute('aria-expanded'))).toEqual(['false', 'false', 'false']);
    expect(programs.textContent).toContain('Komposisi paket mengikuti ketentuan kurikulum');
    expect(within(programs).getByRole('heading', { level: 3, name: 'Kokurikuler' })).toBeInTheDocument();
  });

  it('ekstrakurikuler: tombol saring kategori (aria-pressed) + jumlah diumumkan; prestasi: linimasa per tahun yang bisa digeser', () => {
    const container = demo();
    const life = section(container, 'studentlife');
    const filters = within(life).getByRole('group', { name: 'Saring ekstrakurikuler' });
    expect(within(filters).getAllByRole('button').map((b) => b.textContent)).toEqual(['Semua', 'Kepemimpinan', 'Seni & Budaya', 'Olahraga', 'Sains & Bahasa', 'Kerohanian']);
    expect(within(filters).getByRole('button', { name: 'Semua' })).toHaveAttribute('aria-pressed', 'true');
    // Saringan selebar penuh di bawah kepala section, rata kiri (bukan kolom kanan yang memecah baris)
    expect(filters.className).not.toContain('justify-end');
    expect(life.querySelector('h2')!.closest('.grid')?.contains(filters) ?? false).toBe(false);
    expect(within(life).getAllByRole('heading', { level: 3 })).toHaveLength(8);
    expect(life.querySelector('ul[data-filtered]')).toHaveAttribute('data-filtered', 'false');
    // Empat kartu pertama berfoto 4:3 (Pramuka, Paskibra, tari, voli); kolom 1 → 2 → 4 tanpa 3 kolom
    const cards = Array.from(life.querySelectorAll('ul[data-filtered] > li'));
    expect(cards.map((li) => !!li.querySelector('img'))).toEqual([true, true, true, true, false, false, false, false]);
    expect(cards[0].querySelector('img')!.getAttribute('src')).toBe('/assets/templates/photos/pradipta-ekskul-pramuka-800.webp');
    expect(cards[0].querySelector('img')!.getAttribute('alt')).toMatch(/Pramuka/);
    // Tiap kartu berfoto sendiri: tidak memakai ulang foto slide hero (tari & voli punya foto kartu sendiri)
    const heroPhotos = Array.from(section(container, 'hero').querySelectorAll('.pd-slide img')).map((img) => img.getAttribute('src')!.replace(/-\d+\.webp$/, ''));
    const cardPhotos = cards.slice(0, 4).map((li) => li.querySelector('img')!.getAttribute('src')!);
    expect(cardPhotos).toEqual(['pramuka', 'paskibra', 'tari', 'voli'].map((k) => `/assets/templates/photos/pradipta-ekskul-${k}-800.webp`));
    for (const src of cardPhotos) expect(heroPhotos.some((h) => src.startsWith(h)), src).toBe(false);
    expect(JSON.stringify(def.defaultContent.studentlife)).not.toMatch(/pradipta-hero-/);
    expect(life.querySelector('ul[data-filtered]')!.className).toContain('@6xl:grid-cols-4');
    expect(life.querySelector('ul[data-filtered]')!.className).not.toMatch(/grid-cols-3/);
    // HP: empat kartu pertama, sisanya lewat tombol
    const hiddenOnPhone = () => Array.from(life.querySelectorAll('ul[data-filtered] > li')).map((li) => li.className.includes('hidden @3xl:flex'));
    expect(hiddenOnPhone()).toEqual([false, false, false, false, true, true, true, true]);
    fireEvent.click(within(life).getByRole('button', { name: 'Tampilkan 4 ekstrakurikuler lain' }));
    expect(hiddenOnPhone().some(Boolean)).toBe(false);
    expect(within(life).queryByRole('button', { name: /ekstrakurikuler lain/ })).toBeNull();
    fireEvent.click(within(filters).getByRole('button', { name: 'Kepemimpinan' }));
    expect(within(filters).getByRole('button', { name: 'Kepemimpinan' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(filters).getByRole('button', { name: 'Semua' })).toHaveAttribute('aria-pressed', 'false');
    expect(within(life).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Pramuka', 'Paskibra', 'PMR']);
    expect(within(life).getByRole('status')).toHaveTextContent('Menampilkan 3 ekstrakurikuler kategori Kepemimpinan');
    // Kartu muncul pelan hanya setelah saringan diganti
    expect(life.querySelector('ul[data-filtered]')).toHaveAttribute('data-filtered', 'true');
    expect(life.textContent).toContain('Jumat, 14.00 WIB');

    const achievements = section(container, 'achievements');
    const rail = within(achievements).getByRole('region', { name: 'Linimasa prestasi' });
    expect(rail).toHaveAttribute('tabindex', '0');
    expect(rail.className).toContain('snap-x');
    // Rel menembus jarak tepi wadah sampai tepi layar di semua lebar (kartu terakhir terpotong di tepi layar)
    for (const cls of ['-mx-5', '@2xl:-mx-8', '@5xl:-mx-12', '@5xl:px-12', '@min-[96rem]:-mx-16']) expect(rail.className, cls).toContain(cls);
    expect(Array.from(rail.querySelectorAll(':scope ol > li > p')).map((p) => p.textContent)).toEqual(['2026', '2025']);
    expect(within(achievements).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Juara II', 'Juara I', 'Finalis', 'Juara III', 'Juara II', 'Juara I']);
    expect(achievements.textContent).toContain('Tim English Club kelas XI');
    // Tombol geser hanya tampil bila rel bisa digulir (jsdom tidak punya tata letak → tersembunyi tetapi tetap tombol)
    expect(within(achievements).getByRole('button', { name: 'Geser linimasa ke kanan' }).parentElement!.className).toContain('@3xl:invisible');
    cleanup();
    // Capaian kosong → nama lomba jadi judul, tidak dobel
    const noRank = section(demo({ achievements: { items: [{ title: '', event: 'Olimpiade Sains Kabupaten', year: '2026' }] } }), 'achievements');
    expect(within(noRank).getByRole('heading', { level: 3 })).toHaveTextContent('Olimpiade Sains Kabupaten');
    expect(noRank.textContent?.split('Olimpiade Sains Kabupaten')).toHaveLength(2);
  });

  it('berita: filter kategori (aria-pressed) + isi lengkap dibuka di kartu; HP: 3 kartu + "Tampilkan berita lain"', () => {
    const news = section(demo(), 'news');
    const filters = within(news).getByRole('group', { name: 'Saring berita menurut kategori' });
    expect(within(filters).getAllByRole('button').map((b) => b.textContent)).toEqual(['Semua', 'Budaya', 'Akademik', 'Kokurikuler', 'Kesiswaan']);
    expect(news.querySelectorAll('article')).toHaveLength(4);
    // Berita demo tidak menyatakan juara/peringkat sebagai fakta (nama sekolah demo bisa milik sekolah nyata)
    expect(news.textContent).not.toMatch(/juara|peringkat|terbaik/i);
    expect(news.querySelector('article time')).toHaveAttribute('datetime', '2026-10-26');
    expect(news.querySelector('article time')).toHaveTextContent('26 Okt 2026');
    const items = Array.from(news.querySelectorAll(':scope ul > li'));
    expect(items.map((li) => li.className.includes('hidden @3xl:block'))).toEqual([false, false, false, true]);
    fireEvent.click(within(news).getByRole('button', { name: 'Tampilkan berita lain' }));
    expect(Array.from(news.querySelectorAll(':scope ul > li')).some((li) => li.className.includes('hidden @3xl:block'))).toBe(false);
    expect(within(news).queryByRole('button', { name: 'Tampilkan berita lain' })).toBeNull();

    fireEvent.click(within(filters).getByRole('button', { name: 'Akademik' }));
    expect(within(filters).getByRole('button', { name: 'Akademik' })).toHaveAttribute('aria-pressed', 'true');
    expect(Array.from(news.querySelectorAll('article h3')).map((h) => h.textContent)).toEqual(['Kelas XII Ikuti Simulasi Tes Kemampuan Akademik']);
    expect(within(news).getByRole('status')).toHaveTextContent('1 berita kategori Akademik');
    const more = within(news).getByRole('button', { name: /Baca selengkapnya/ });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById(more.getAttribute('aria-controls')!)).toHaveAttribute('inert');
    const excerpt = () => Array.from(news.querySelectorAll('article p')).find((p) => p.textContent?.startsWith('Simulasi digelar'))!;
    expect(excerpt().className).toContain('line-clamp-3');
    fireEvent.click(more);
    expect(more).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(more.getAttribute('aria-controls')!)).not.toHaveAttribute('inert');
    expect(document.getElementById(more.getAttribute('aria-controls')!)!.querySelectorAll('p')).toHaveLength(2);
    // Dibuka → ringkasan utuh (tanpa "…" tepat di atas isi lengkap)
    expect(excerpt().className).not.toContain('line-clamp-3');
    // Kartu yang dibuka tidak memanjangkan kartu lain: grid items-start, kartu tanpa h-full; kolom 1 → 2 → 4
    const grid = news.querySelector('article')!.closest('ul')!;
    expect(grid.className).toContain('@3xl:items-start');
    expect(grid.className).toContain('@6xl:grid-cols-4');
    expect(grid.className).not.toMatch(/grid-cols-3/);
    expect(news.querySelector('article')!.className).not.toContain('h-full');
  });

  it('pengumuman (label Penting merah lembut, tanggal) dan agenda berubin kalender (bulan, tanggal, hari) dalam satu pita', () => {
    const container = demo();
    const announcements = section(container, 'announcements');
    expect(announcements.querySelector('h2')!.textContent).toBe('Informasi untuk murid dan orang tua');
    expect(announcements.querySelectorAll('li')).toHaveLength(5);
    expect(within(announcements).getAllByText('Penting')).toHaveLength(1);
    expect(within(announcements).getByText('Penting').className).toContain('text-[#B42318]');
    expect(announcements.querySelector('time')).toHaveAttribute('datetime', '2026-10-23');
    const agenda = section(container, 'agenda');
    expect(Array.from(agenda.querySelectorAll('time')).map((t) => t.getAttribute('datetime'))).toEqual(['2026-11-25', '2026-12-18', '2027-01-16', '2027-04-24', '2027-07-12']);
    const tile = agenda.querySelector('time')!;
    expect(tile.className).toContain('pd-page');
    expect(Array.from(tile.children).map((c) => c.textContent)).toEqual(['Nov', '25', 'Rab 2026']);
    expect(agenda.textContent).toContain('Aula sekolah');
    expect(agenda.textContent).toContain('07.00 WIB');
    // Satu pita untuk keduanya, berdampingan 7/5 kolom di layar lebar
    const band = announcements.parentElement!.parentElement!;
    expect(band).toBe(agenda.parentElement!.parentElement);
    expect(announcements.parentElement!.className).toContain('@5xl:col-span-7');
    expect(agenda.parentElement!.className).toContain('@5xl:col-span-5');
    // Lampiran PDF
    cleanup();
    const pdf = section(demo({ announcements: { items: [{ title: 'Surat edaran', date: '2026-10-01', text: 'Untuk kelas X.', badge: 'Wajib', url: 'https://contoh.sch.id/edaran.pdf' }] } }), 'announcements');
    expect(within(pdf).getByRole('link', { name: /Lampiran/ })).toHaveAttribute('href', 'https://contoh.sch.id/edaran.pdf');
    expect(within(pdf).getByText('PDF')).toBeInTheDocument();
    expect(within(pdf).getByText('Wajib').className).toContain('text-[#B42318]');
  });

  it('guru: kartu berinisial (demo tanpa potret wajah) atau foto persegi + nama + jabatan, tombol tanya wali kelas ke WhatsApp', () => {
    const teachers = section(demo(), 'teachers');
    expect(within(teachers).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Drs. Bambang Setiadi, M.Pd.',
      'Rina Marlina, S.Pd.',
      'Agus Prasetyo, S.Pd.',
      'Dewi Anggraini, S.Pd.',
    ]);
    expect(teachers.textContent).toContain('Guru Bimbingan dan Konseling');
    expect(wa(within(teachers).getByRole('link', { name: 'Tanya wali kelas' }))).toContain(`Halo ${SCHOOL}, saya ingin bertanya kepada wali kelas.`);
    // Nama guru fiktif tidak dipasangkan dengan potret orang sungguhan: ubin inisial persegi, gelar tidak ikut diinisialkan
    expect(teachers.querySelector('img')).toBeNull();
    expect(within(teachers).queryByRole('img')).toBeNull();
    const tiles = Array.from(teachers.querySelectorAll('li [aria-hidden]')).filter((el) => el.closest('[class*="aspect-square"]'));
    expect(tiles.map((el) => el.textContent)).toEqual(['BS', 'RM', 'AP', 'DA']);
    // Kata terakhir nama + gelar dalam satu kotak sebaris: gelar tidak turun sendirian
    expect(Array.from(teachers.querySelectorAll('h3 > span.inline-block')).map((s) => s.textContent)).toEqual(['Setiadi, M.Pd.', 'Marlina, S.Pd.', 'Prasetyo, S.Pd.', 'Anggraini, S.Pd.']);
    expect(degreeSplit('Drs. Bambang Setiadi, M.Pd.')).toEqual(['Drs. Bambang ', 'Setiadi, M.Pd.']);
    expect(degreeSplit('Prof. Dr. Ir. Hadi Santoso')).toBeNull();
    cleanup();
    // Foto dari CMS tetap didukung (persegi)
    const photo = section(demo({ teachers: { items: [{ name: 'Hj. Siti Aminah, S.Pd.', role: 'Guru Kimia', photo: '/assets/templates/photos/pradipta-profil-960.webp' }, { name: 'Prof. Dr. Ir. Hadi Santoso', role: 'Mitra', photo: '' }] } }), 'teachers');
    expect(photo.querySelector('img')!.closest('[class*="aspect-square"]')).not.toBeNull();
    expect(Array.from(photo.querySelectorAll('li [aria-hidden]')).map((el) => el.textContent)).toContain('HS');
  });

  it('SPMB: poin singkat, tombol portal provinsi (tab baru), tab Jalur/Jadwal/Syarat dengan panah keyboard + Home/End', () => {
    const spmb = section(demo(), 'spmb');
    expect(spmb.querySelector('h2')!.textContent).toBe('Penerimaan murid baru tahun ajaran 2027/2028');
    for (const badge of ['Tanpa biaya pendaftaran', 'Pendaftaran melalui portal provinsi']) {
      expect(within(spmb).getByText(badge).closest('li')!.querySelector('svg'), badge).not.toBeNull();
    }
    const portal = within(spmb).getByRole('link', { name: 'Buka Portal SPMB Provinsi' });
    expect(portal).toHaveAttribute('href', 'https://lampung.spmb.id/');
    expect(portal).toHaveAttribute('target', '_blank');
    expect(spmb.textContent).toContain('Portal dikelola Dinas Pendidikan dan Kebudayaan Provinsi Lampung.');
    const tablist = within(spmb).getByRole('tablist', { name: 'Informasi SPMB' });
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Jalur', 'Jadwal', 'Syarat']);
    expect(tabs.map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
    expect(tabs.map((t) => t.getAttribute('data-pd-key'))).toEqual(['paths', 'schedule', 'requirements']);
    // Penunjuk putih yang bergeser di lintasan tab
    expect(tablist.parentElement!.querySelector(':scope > .pd-ind.pd-ind-tab')).not.toBeNull();
    const panel = (tab: HTMLElement) => document.getElementById(tab.getAttribute('aria-controls')!)!;
    expect(panel(tabs[0])).not.toHaveAttribute('hidden');
    expect(panel(tabs[1])).toHaveAttribute('hidden');
    expect(Array.from(panel(tabs[0]).querySelectorAll('h3')).map((h) => h.textContent)).toEqual(['Domisili', 'Afirmasi', 'Prestasi', 'Mutasi']);
    expect(panel(tabs[0]).textContent).toContain('min. 30%');
    expect(panel(tabs[2]).textContent).toContain('Akta kelahiran atau surat keterangan lahir.');
    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveFocus();
    expect(panel(tabs[1])).not.toHaveAttribute('hidden');
    expect(Array.from(panel(tabs[1]).querySelectorAll('h3')).map((h) => h.textContent)).toEqual([
      'Sosialisasi & juknis',
      'Pendaftaran & verifikasi',
      'Pengumuman hasil',
      'Daftar ulang',
      'MPLS & hari pertama',
    ]);
    expect(panel(tabs[1]).textContent).toContain('Perkiraan jadwal; tanggal resmi mengikuti juknis dinas.');
    fireEvent.keyDown(tabs[1], { key: 'End' });
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs[2], { key: 'ArrowRight' });
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs[0], { key: 'ArrowLeft' });
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs[2], { key: 'Home' });
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveFocus();
  });

  it('wizard tanya SPMB: Data siswa → Pilihan → Kontak (galat + fokus, Kembali menyimpan isian, bilah progres), lalu pesan WhatsApp apa adanya; tidak ada data yang dikirim/disimpan', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem');
    const spmb = section(demo(), 'spmb');
    const form = within(spmb).getByRole('form', { name: 'Tanya Panitia SPMB' });
    // Kartu formulir dua kolom: kiri judul + langkah, kanan isian
    const card = withClass(form, 'rounded-[24px]')!;
    expect(card.className).toContain('@5xl:grid-cols-12');
    expect(card.textContent).toContain('Formulir ini hanya untuk bertanya, bukan pendaftaran');
    expect(spmb.textContent).toContain('Data tidak disimpan di website dan tidak ada pembayaran online.');
    const steps = within(card).getByRole('list', { name: 'Langkah formulir' });
    const stepState = () => Array.from(steps.querySelectorAll('li')).map((li) => li.getAttribute('aria-current'));
    const bar = () => (card.querySelector('.pd-bar') as HTMLElement).style.transform;
    expect(stepState()).toEqual(['step', null, null]);
    expect(bar()).toBe(`scaleX(${1 / 3})`);
    expect(within(form).getByRole('heading', { level: 3 })).toHaveTextContent('Langkah 1 dari 3: Data siswa');

    const next = within(form).getByRole('button', { name: /^Lanjut/ });
    expect(next).toHaveAttribute('type', 'submit');
    fireEvent.click(next);
    const student = within(form).getByLabelText(/^Nama calon murid/);
    expect(student).toHaveAttribute('aria-invalid', 'true');
    expect(student).toHaveFocus();
    expect(document.getElementById(student.getAttribute('aria-describedby')!)).toHaveTextContent('Tulis nama calon murid (minimal 3 huruf).');
    expect(within(form).getByLabelText(/^Asal SMP/)).toHaveAttribute('aria-invalid', 'true');
    expect(INPUT).toContain('focus:ring-(--tpl-accent-ink)');
    expect(INPUT).toContain('text-[16px]');
    fireEvent.change(student, { target: { value: 'Alya Putri' } });
    expect(student).not.toHaveAttribute('aria-invalid');
    fireEvent.change(within(form).getByLabelText(/^Asal SMP/), { target: { value: 'SMP Negeri 2 Purbolinggo' } });
    fireEvent.click(next);
    await flush();
    expect(stepState()).toEqual([null, 'step', null]);
    expect(bar()).toBe(`scaleX(${2 / 3})`);
    const step2 = within(form).getByRole('heading', { level: 3 });
    expect(step2).toHaveTextContent('Langkah 2 dari 3: Pilihan');
    expect(step2).toHaveFocus();
    expect(within(steps).getByText('Data siswa').textContent).toBe('Data siswa (selesai)');

    expect(within(form).getAllByRole('radio').map((r) => r.getAttribute('value'))).toEqual(['Domisili', 'Afirmasi', 'Prestasi', 'Mutasi', 'Belum tahu']);
    fireEvent.click(within(form).getByRole('button', { name: /^Lanjut/ }));
    expect(within(form).getByRole('radio', { name: 'Domisili' })).toHaveFocus();
    expect(within(form).getByRole('radio', { name: 'Domisili' })).toHaveAttribute('aria-invalid', 'true');
    expect(form.textContent).toContain('Pilih jalur yang diminati, atau "Belum tahu".');
    fireEvent.click(within(form).getByRole('radio', { name: 'Prestasi' }));
    fireEvent.click(within(form).getByRole('checkbox', { name: 'Jalur & kuota' }));
    fireEvent.click(within(form).getByRole('checkbox', { name: 'Jadwal' }));
    fireEvent.change(within(form).getByLabelText(/^Pertanyaan/), { target: { value: 'Apakah ada tes tambahan?' } });
    expect(form.textContent).toContain('24/300');
    // Kembali: fokus ke judul langkah, isian tetap
    fireEvent.click(within(form).getByRole('button', { name: 'Kembali' }));
    await flush();
    expect(within(form).getByRole('heading', { level: 3 })).toHaveFocus();
    expect(within(form).getByLabelText(/^Nama calon murid/)).toHaveValue('Alya Putri');
    fireEvent.click(within(form).getByRole('button', { name: /^Lanjut/ }));
    await flush();
    expect(within(form).getByRole('radio', { name: 'Prestasi' })).toBeChecked();
    expect(within(form).getByRole('checkbox', { name: 'Jadwal' })).toBeChecked();
    fireEvent.click(within(form).getByRole('button', { name: /^Lanjut/ }));
    await flush();
    expect(stepState()).toEqual([null, null, 'step']);
    expect(bar()).toBe('scaleX(1)');
    expect(within(form).getByRole('heading', { level: 3 })).toHaveTextContent('Langkah 3 dari 3: Kontak');
    expect(within(form).getByRole('radio', { name: 'Orang tua/wali' })).toBeChecked();
    // Peran dipilih SEBELUM nama (label nama mengikuti peran)
    const roleGroup = within(form).getByRole('radio', { name: 'Orang tua/wali' }).closest('fieldset')!;
    expect(roleGroup.compareDocumentPosition(within(form).getByLabelText(/^Nama orang tua\/wali/)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const submit = within(form).getByRole('button', { name: /^Susun pesan/ });
    scrolled = [];
    fireEvent.click(submit);
    expect(within(form).getByLabelText(/^Nama orang tua\/wali/)).toHaveFocus();
    // Isian bergalat digulir ke TENGAH layar bersama label & galatnya (bukan ke tepi atas di bawah header lengket)
    expect(Element.prototype.scrollIntoView).toHaveBeenLastCalledWith({ block: 'center' });
    expect(INPUT).toContain('scroll-mt-[calc(var(--tpl-sticky-top,0px)+112px)]');
    expect(within(form).getByRole('heading', { level: 3 }).className).toContain('scroll-mt-[calc(var(--tpl-sticky-top,0px)+112px)]');
    const phone = within(form).getByLabelText(/^Nomor WhatsApp/);
    expect(phone).toHaveAttribute('type', 'tel');
    expect(document.getElementById(phone.getAttribute('aria-describedby')!)).toHaveTextContent('Tulis nomor WhatsApp aktif, mis. 081234567890.');
    fireEvent.change(within(form).getByLabelText(/^Nama orang tua\/wali/), { target: { value: 'Ibu Sari Wulandari' } });
    fireEvent.change(phone, { target: { value: '0812-3456-7890' } });
    fireEvent.click(submit);
    await flush();

    expect(within(spmb).queryByRole('form')).toBeNull();
    const done = within(spmb).getByRole('heading', { name: /Pesan siap dikirim/ });
    expect(done).toHaveFocus();
    expect(stepState()).toEqual([null, null, null]);
    expect(steps.textContent).toBe('Data siswa (selesai)Pilihan (selesai)Kontak (selesai)');
    const message =
      'Halo Panitia SPMB SMA Negeri 1 Purbolinggo, saya ingin bertanya.\n\nNama calon murid: Alya Putri\nAsal sekolah: SMP Negeri 2 Purbolinggo\nDomisili: -\nJalur yang diminati: Prestasi\nTopik: Jalur & kuota, Jadwal\nPertanyaan: Apakah ada tes tambahan?\n\nOrang tua/wali: Ibu Sari Wulandari\nNomor WhatsApp: 081234567890\n\n(Dikirim dari formulir tanya SPMB di website sekolah. Data tidak disimpan di website.)';
    expect(spmb.querySelector('pre')?.textContent).toBe(message);
    expect(within(spmb).getByRole('link', { name: 'Buka WhatsApp Panitia' }).getAttribute('href')).toBe(`https://wa.me/6281234567890?text=${encodeURIComponent(message)}`);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
    fireEvent.click(within(spmb).getByRole('button', { name: 'Ubah data' }));
    await flush();
    expect(within(spmb).getByRole('form')).toBeInTheDocument();
    expect(within(spmb).getByRole('heading', { name: /Langkah 1 dari 3/ })).toHaveFocus();
    expect(within(spmb).getByLabelText(/^Nama calon murid/)).toHaveValue('Alya Putri');
    fetchSpy.mockRestore();
    storageSpy.mockRestore();
  });

  it('testimoni, galeri bento, FAQ, kontak + peta', () => {
    const container = demo();
    const testimonials = section(container, 'testimonials');
    expect(testimonials.querySelectorAll('blockquote')).toHaveLength(4);
    expect(testimonials.textContent).toContain('Alumni 2025 · Pendidikan Biologi, PTN di Lampung');
    // Tanpa tautan tracer study → teks tautan disembunyikan
    expect(within(testimonials).queryByRole('link')).toBeNull();
    // Tanpa foto → inisial
    expect(testimonials.querySelector('img')).toBeNull();
    expect(testimonials.textContent).toContain('YK');

    const gallery = section(container, 'gallery');
    const cells = Array.from(gallery.querySelectorAll('ul > li'));
    expect(cells).toHaveLength(4);
    expect(cells[0].className).toContain('col-span-2');
    expect(cells[0].className).toContain('@3xl:row-span-2');
    // Foto paling tajam (gamelan) di sel besar 2×2; paduan suara (sumber lebih lembut) di sel kecil
    expect(cells.map((li) => li.querySelector('p')?.textContent)).toEqual([
      'Pentas gamelan di panggung seni sekolah',
      'Belajar bersama di perpustakaan',
      'Latihan Pramuka di halaman sekolah',
      'Paduan suara berlatih di taman sekolah',
    ]);
    // Keterangan berupa pil putih (teks gelap di atas putih, tanpa lapisan gelap di foto)
    expect(cells[0].querySelector('p span')!.className).toContain('bg-white');

    const faq = section(container, 'faq');
    const questions = within(faq).getAllByRole('button');
    expect(questions).toHaveLength(6);
    expect(questions[0]).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(questions[3]);
    expect(questions[0]).toHaveAttribute('aria-expanded', 'false');
    expect(questions[3]).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(questions[3].getAttribute('aria-controls')!)).toHaveAttribute('role', 'region');
    expect(within(faq).getByText('Masih ada pertanyaan?')).toBeInTheDocument();
    expect(wa(within(faq).getByRole('link', { name: /Tanya lewat WhatsApp/ }))).toContain(`Halo Panitia SPMB ${SCHOOL}, saya ingin bertanya.`);

    const contact = section(container, 'contact');
    const iframe = contact.querySelector('iframe')!;
    expect(iframe).toHaveAttribute('title', `Peta lokasi ${SCHOOL}`);
    expect(iframe).toHaveAttribute('loading', 'lazy');
    expect(within(contact).getByRole('link', { name: /Buka di Google Maps/ })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/search/?api=1&query=Purbolinggo%2C%20Lampung%20Timur%2C%20Lampung',
    );
    expect(within(contact).getByRole('link', { name: /Alamat/ })).toHaveAttribute('href', 'https://www.google.com/maps/search/?api=1&query=Purbolinggo%2C%20Lampung%20Timur%2C%20Lampung');
    expect(within(contact).getByRole('link', { name: /Telepon/ })).toHaveAttribute('href', 'tel:+6281234567890');
    expect(within(contact).getByRole('link', { name: /Email/ })).toHaveAttribute('href', 'mailto:info@sman1purbolinggo.example');
    expect(within(contact).getByRole('link', { name: /WhatsApp/ }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/6281234567890\?text=/);
    expect(contact.textContent).toContain('Senin–Jumat, 07.00–16.00 WIB');
    expect(contact.textContent).toContain('Jl. Pelita Ilmu No. 8, Kec. Purbolinggo');
  });

  it('footer putih selebar layar dengan pita ajakan SPMB (kebalikan nada section terakhir), tautan bagian, kontak, media sosial, hak cipta & catatan', () => {
    const container = demo();
    const footer = container.querySelector('footer')!;
    expect(footer).toHaveAttribute('data-tpl-section', 'footer');
    expect(footer).toHaveAttribute('id', 'footer');
    expect(footer.className).toContain('bg-white');
    expect(footer.className).not.toMatch(/rounded|mx-|max-w-|data-tpl-tone/);
    expect(footer.hasAttribute('data-tpl-tone')).toBe(false);
    // Section terakhir di demo (kontak) berpita langit → pita ajakan putih bergaris tipis
    const band = footer.firstElementChild!;
    expect(band).toHaveAttribute('data-pd-band', 'white');
    expect(band.className).toContain('border-t');
    expect(band.textContent).toContain('Informasi SPMB 2027/2028');
    expect(within(footer).getByRole('link', { name: 'Lihat Info SPMB' })).toHaveAttribute('href', '#spmb');
    const links = within(footer).getByRole('navigation', { name: 'Tautan footer' });
    expect(linkList(links)).toEqual([
      'Profil|#tentang',
      'Akademik|#programs',
      'Ekskul|#studentlife',
      'Prestasi|#achievements',
      'Berita|#berita',
      'Pengumuman|#pengumuman',
      'Guru|#teachers',
      'SPMB|#spmb',
      'Kontak|#kontak',
    ]);
    expect(within(footer).getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://www.instagram.com/');
    expect(within(footer).getByRole('link', { name: 'Facebook' })).toHaveAttribute('href', 'https://www.facebook.com/');
    expect(within(footer).getByRole('link', { name: 'YouTube' })).toHaveAttribute('href', 'https://www.youtube.com/');
    expect(within(footer).queryByRole('link', { name: 'LinkedIn' })).toBeNull();
    expect(within(footer).getByRole('link', { name: '0812-3456-7890' })).toHaveAttribute('href', 'tel:+6281234567890');
    expect(footer.textContent).toContain(`© ${new Date().getFullYear()} ${SCHOOL}.`);
    expect(footer.textContent).toContain('Situs demo template. Nama sekolah dipakai sebagai contoh');
    expect(footer.querySelector('img[src="/assets/templates/logos/tut-wuri-handayani.svg"]')).not.toBeNull();
  });

  it('pita putih & langit berselang-seling di halaman (akses cepat putih, statistik langit, pengumuman + agenda satu pita)', () => {
    const container = demo();
    const tone = (el: Element) => (el.className.includes('bg-(--pd-sky)') ? 'sky' : el.className.includes('bg-white') ? 'white' : '?');
    const bands = BANDS.map((key) => (key === 'announcements' ? section(container, key).parentElement!.parentElement!.parentElement! : section(container, key)));
    expect(tone(section(container, 'quicklinks'))).toBe('white');
    expect(bands.map(tone)).toEqual(BANDS.map((_, i) => (i % 2 === 0 ? 'sky' : 'white')));
    // Kontak (terakhir) langit → pita ajakan footer putih bergaris tipis
    const band = container.querySelector('footer')!.firstElementChild!;
    expect(band).toHaveAttribute('data-pd-band', 'white');
    expect(band.className).toContain('bg-white');
    expect(band.className).toContain('border-t');
    expect(band.className).not.toContain('bg-(--pd-sky)');
    cleanup();
    // Section disembunyikan → tidak ada dua pita sama berdempetan
    const hidden = demo({ welcome: { enabled: false }, achievements: { enabled: false } });
    const keys = ['stats', 'about', 'programs', 'studentlife', 'facilities', 'news', 'announcements', 'teachers'];
    expect(keys.map((key) => tone(key === 'announcements' ? section(hidden, key).parentElement!.parentElement!.parentElement! : section(hidden, key)))).toEqual([
      'sky',
      'white',
      'sky',
      'white',
      'sky',
      'white',
      'sky',
      'white',
    ]);
    cleanup();
    // Galeri disembunyikan → section terakhir (kontak) berpita putih → pita ajakan footer langit
    const noGallery = demo({ gallery: { enabled: false } });
    expect(tone(section(noGallery, 'contact'))).toBe('white');
    const skyBand = noGallery.querySelector('footer')!.firstElementChild!;
    expect(skyBand).toHaveAttribute('data-pd-band', 'sky');
    expect(skyBand.className).toContain('bg-(--pd-sky)');
  });

  it('fasilitas: kartu ikon (demo) atau berfoto 4:3, nama + keterangan, tanpa bayangan; kartu putih sesuai nada pita', () => {
    const container = demo();
    const facilities = section(container, 'facilities');
    expect(facilities.querySelector('h2')!.textContent).toBe('Sarana belajar dan berkegiatan');
    expect(within(facilities).getByText('Fasilitas')).toBeInTheDocument();
    expect(within(facilities).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Laboratorium IPA',
      'Laboratorium Komputer',
      'Perpustakaan & Pojok Baca',
      'Lapangan Olahraga Serbaguna',
      'Masjid & Ruang Ibadah',
      'Sanggar Seni',
    ]);
    expect(facilities.textContent).toContain('Ruang praktikum fisika, kimia, dan biologi.');
    // Demo tanpa foto (anggaran foto & tanpa foto kembar di halaman): bulatan ikon langit, tanpa <img>
    expect(facilities.querySelector('img')).toBeNull();
    const cards = Array.from(facilities.querySelectorAll('ul > li'));
    expect(cards).toHaveLength(6);
    for (const li of cards) {
      expect(li.querySelector('svg')?.closest('[aria-hidden]')).not.toBeNull();
      expect(li.className).not.toMatch(/shadow/);
    }
    // Pita langit sesudah prestasi (putih) → kartu putih tanpa cincin; grid 1 → 2 → 3 kolom
    expect(facilities.className).toContain('bg-(--pd-sky)');
    expect(cards[0].className).toContain('bg-white');
    expect(cards[0].className).not.toContain('ring-1');
    expect(facilities.querySelector('ul')!.className).toContain('@xl:grid-cols-2');
    expect(facilities.querySelector('ul')!.className).toContain('@5xl:grid-cols-3');
    cleanup();
    // Foto dari CMS → foto 4:3 (lazy, alt dari nama) menggantikan ikon; kosong/nama hilang → kartu tidak tampil
    const photo = section(
      demo({
        facilities: {
          items: [
            { name: 'Laboratorium IPA', text: 'Praktikum.', image: '/assets/templates/photos/pradipta-sains-1200.webp' },
            { name: '', text: 'Tanpa nama' },
          ],
        },
      }),
      'facilities',
    );
    expect(photo.querySelectorAll('ul > li')).toHaveLength(1);
    const img = photo.querySelector('img')!;
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.closest('[class*="aspect-[4/3]"]')).not.toBeNull();
    expect(img.getAttribute('sizes')).toBe('(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw');
    cleanup();
    // Prestasi disembunyikan → fasilitas berpita putih, kartu putih bercincin
    const white = section(demo({ achievements: { enabled: false } }), 'facilities');
    expect(white.className).toContain('bg-white');
    expect(white.querySelector('ul > li')!.className).toContain('ring-1');
    cleanup();
    expect(sectionKeys(demo({ facilities: { items: [] } }))).not.toContain('facilities');
  });

  it('formulir SPMB beda nada dengan pitanya: putih di pita langit (demo), langit di pita putih', () => {
    const sky = section(demo(), 'spmb');
    expect(sky.className).toContain('bg-(--pd-sky)');
    const card = (root: HTMLElement) => withClass(within(root).getByRole('heading', { level: 3, name: 'Tanya Panitia SPMB' }), 'rounded-[24px]')!;
    expect(card(sky).className).toContain('bg-white');
    expect(card(sky).className).not.toContain('bg-(--pd-sky)');
    // Langkah yang belum dikerjakan tetap terlihat di kartu putih (bulatan langit, bukan putih di atas putih)
    const pending = Array.from(card(sky).querySelectorAll('ol li span[aria-hidden]')).filter((s) => /^[23]$/.test(s.textContent ?? ''));
    expect(pending).toHaveLength(2);
    for (const s of pending) expect(s.className).toContain('bg-(--pd-sky2)');
    cleanup();
    const white = section(demo({ welcome: { enabled: false } }), 'spmb');
    expect(white.className).toContain('bg-white');
    expect(card(white).className).toContain('bg-(--pd-sky)');
  });

  it('datar: tidak ada kelas shadow di template (kecuali tombol melayang Shell), sumber tanpa shadow-', () => {
    const container = demo();
    const shadows = Array.from(container.querySelectorAll('[class*="shadow"]')).filter(
      (el) => !el.closest('[aria-label="Chat WhatsApp"]') && !/Chat WhatsApp|Kembali ke atas/.test(el.getAttribute('aria-label') ?? ''),
    );
    expect(shadows.map((el) => el.className)).toEqual([]);
    const dir = resolve(ROOT, 'src/templates/pradipta');
    const files = readdirSync(dir).filter((f) => /\.(tsx?|css)$/.test(f));
    expect(files.length).toBeGreaterThanOrEqual(20);
    for (const file of files) {
      const source = readFileSync(resolve(dir, file), 'utf8');
      expect(source, file).not.toMatch(/\bshadow-|drop-shadow|box-shadow/);
      // Tanpa framer-motion & tanpa router (tes merender tanpa Router)
      expect(source, file).not.toMatch(/framer-motion|useLocation|useParams|\b(localStorage|sessionStorage)\.\w/);
    }
  });
});

describe('Pradipta: berita & pengumuman dari tulisan (site_posts)', () => {
  it('beranda (fitur aktif): section berita profesional bertautan + filter kategori + "Lihat semua", papan pengumuman; agenda tetap dari CMS', () => {
    const container = withPosts();
    const news = section(container, 'news');
    expect(news).toHaveAttribute('data-pro-section', 'news');
    // Label & judul Pradipta tetap: satu H2
    expect(news.querySelectorAll('h2')).toHaveLength(1);
    expect(news.querySelector('h2')!.textContent).toBe('Kabar terbaru dari sekolah');
    const title = within(news).getByRole('link', { name: NEWS[0].title });
    expect(title).toHaveAttribute('href', '/berita/juara-olimpiade-sains');
    expect(title.className).toContain('after:absolute');
    expect(title.closest('article')!.className).toContain('relative');
    const img = within(news).getByAltText(NEWS[0].image_alt);
    expect(img).toHaveAttribute('width', '1600');
    expect(img).toHaveAttribute('height', '1000');
    expect(img).toHaveAttribute('loading', 'lazy');
    const filters = within(news).getByRole('group', { name: 'Saring berita menurut kategori' });
    expect(within(filters).getAllByRole('button').map((b) => b.textContent)).toEqual(['Semua', 'Prestasi', 'Kegiatan']);
    fireEvent.click(within(filters).getByRole('button', { name: 'Kegiatan' }));
    expect(Array.from(news.querySelectorAll('article h3')).map((h) => h.textContent)).toEqual([NEWS[1].title]);
    expect(within(news).getByRole('link', { name: /Lihat semua berita/ })).toHaveAttribute('href', '/berita');

    const announcements = section(container, 'announcements');
    expect(announcements).toHaveAttribute('data-pro-section', 'announcements');
    expect(announcements.querySelectorAll('h2')).toHaveLength(1);
    expect(within(announcements).getByRole('link', { name: ANNOUNCEMENTS[0].title }).closest('article')!.className).toContain('relative');
    expect(announcements.textContent).toContain('Lihat detail');
    expect(within(announcements).getByText('Penting').closest('[data-pro-badge]')!.className).toContain('text-[#B42318]');
    expect(within(announcements).getByRole('link', { name: /Lihat semua pengumuman/ })).toHaveAttribute('href', '/pengumuman');
    // Agenda tetap dari konten CMS
    expect(section(container, 'agenda').querySelectorAll('time')).toHaveLength(5);
    // Pita tetap berselang-seling: fasilitas langit, berita putih, pengumuman langit
    expect(news.className).toContain('bg-white');
    expect(news.className).not.toContain('bg-(--pd-sky)');
    expect(announcements.closest('.bg-\\(--pd-sky\\)')).not.toBeNull();
  });

  it('demo ?fitur=berita (fitur aktif tanpa tulisan): section profesional dari item CMS', () => {
    const container = withPosts({ posts: { berita: [], pengumuman: [] } });
    expect(section(container, 'news')).toHaveAttribute('data-pro-section', 'news');
    expect(section(container, 'announcements')).toHaveAttribute('data-pro-section', 'announcements');
    expect(section(container, 'news').textContent).toContain('Bulan Bahasa: English & Debate Club Gelar Debat Antarkelas');
  });

  it('/pengumuman: header putih yang sama tanpa hero, footer bukan section, tautan section menuju "/#anchor"', () => {
    const container = withPosts({ route: { kind: 'list', postKind: 'pengumuman' } });
    const header = container.querySelector('header')!;
    expect(header.className).toContain('bg-white');
    expect(container.querySelector('[data-hero-layout]')).toBeNull();
    expect(sectionKeys(container)).toEqual([]);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const nav = within(header).getAllByRole('navigation', { name: 'Menu utama' })[0];
    expect(within(nav).getByRole('link', { name: 'Profil' })).toHaveAttribute('href', '/#tentang');
    // Tanpa section: tidak ada menu yang ditandai aktif
    expect(nav.querySelector('[aria-current]')).toBeNull();
    const footer = Array.from(container.querySelectorAll('footer')).pop()!;
    expect(footer.hasAttribute('id')).toBe(false);
    expect(footer.hasAttribute('data-tpl-section')).toBe(false);
    expect(within(footer).getByRole('link', { name: 'Lihat Info SPMB' })).toHaveAttribute('href', '/#spmb');
    expect(linkList(within(footer).getByRole('navigation', { name: 'Tautan footer' }))).toContain('Berita|/#berita');
    // Tema Pradipta: label pengumuman mendesak merah lembut
    expect(within(container.querySelector('main')!).getByText('Penting').closest('span[class*="rounded-full"]')!.className).toContain('text-[#B42318]');
  });

  it('/berita/{slug}: satu H1, chip kategori langit Pradipta, kembali ke daftar', () => {
    const container = withPosts({ route: { kind: 'post', postKind: 'berita', slug: POST.slug }, post: POST });
    const main = container.querySelector('main')!;
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelector('h1')).toHaveTextContent(POST.title);
    expect(within(main).getByText('Prestasi').closest('span[class*="rounded-full"]')!.className).toContain('bg-(--pd-sky2)');
    expect(within(main).getByRole('link', { name: /Semua berita/ })).toHaveAttribute('href', '/berita');
  });
});

describe('Pradipta: warna tema bisa diganti', () => {
  it('biru azure bawaan → --tpl-accent; hijau dari CMS → semua turunan ikut; warna terang → teks tombol gelap', () => {
    const base = demo();
    expect(rootStyle(base, '--tpl-accent')).toBe('#0077b6');
    expect(rootStyle(base, '--tpl-on-accent')).toBe('#ffffff');
    const vars = pradiptaVars('#0077B6') as Record<string, string>;
    for (const name of ['--pd-sky', '--pd-sky2', '--pd-ring', '--pd-ink', '--pd-night']) expect(rootStyle(base, name), name).toBe(vars[name]);
    cleanup();

    const green = demo({ brand: { accent_color: '#047857' } });
    expect(rootStyle(green, '--tpl-accent')).toBe('#047857');
    const greenVars = pradiptaVars('#047857') as Record<string, string>;
    for (const name of ['--pd-sky', '--pd-sky2', '--pd-ring', '--pd-ink', '--pd-night']) {
      expect(rootStyle(green, name), name).toBe(greenVars[name]);
      expect(greenVars[name], name).not.toBe(vars[name]);
    }
    cleanup();

    const yellow = demo({ brand: { accent_color: '#FACC15' } });
    expect(rootStyle(yellow, '--tpl-on-accent')).toBe('#121620');
    const submit = section(yellow, 'spmb').querySelector('button[type="submit"]')!;
    expect(submit.className).toContain('text-(--tpl-on-accent)');
    expect(submit.className).toContain('bg-(--tpl-accent)');
    const cta = within(section(yellow, 'hero')).getByRole('link', { name: 'Profil Sekolah' });
    expect(cta.className).toContain('text-(--tpl-on-accent)');
  });
});

describe('Pradipta: SEO situs pembeli', () => {
  it('judul tab & meta description terbaca sebagai website SMA negeri', () => {
    expect(siteTitle('pradipta', null)).toBe(`${SCHOOL} — SMA Negeri di Lampung Timur`);
    expect(siteTitle('pradipta', null).length).toBeLessThanOrEqual(60);
    const restore = applySiteHead('pradipta', null);
    expect(document.title).toBe(`${SCHOOL} — SMA Negeri di Lampung Timur`);
    const description = document.head.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
    expect(description).toMatch(/^SMA negeri di Purbolinggo, Lampung Timur/);
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(155);
    expect(document.head.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#0077B6');
    restore();
  });

  it('satu H1, tiap section diawali tepat satu H2 (akses cepat: H2 untuk pembaca layar), H3 hanya di bawah H2', () => {
    const container = demo();
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelectorAll('h4, h5, h6')).toHaveLength(0);
    for (const key of ORDER.filter((k) => k !== 'hero')) {
      const levels = Array.from(section(container, key).querySelectorAll('h1, h2, h3')).map((h) => h.tagName);
      expect(levels[0], key).toBe('H2');
      expect(levels.filter((l) => l === 'H2'), key).toHaveLength(1);
    }
    expect(section(container, 'hero').querySelector('h2, h3')).toBeNull();
  });

  it('gambar: alt deskriptif berbahasa Indonesia, width/height, srcset & sizes; hanya foto slide 1 yang eager', () => {
    const container = demo();
    const imgs = Array.from(container.querySelectorAll('img'));
    expect(imgs.length).toBeGreaterThan(18);
    for (const img of imgs) {
      const src = img.getAttribute('src') ?? '';
      expect(img.hasAttribute('alt'), src).toBe(true);
      if (src.endsWith('.svg')) {
        expect(src, 'hanya logo demo').toBe('/assets/templates/logos/tut-wuri-handayani.svg');
        // Logo di header/footer, dan di papan nama sambutan tanpa foto (dekoratif)
        expect(img.closest('header, footer, [data-pd-plate]'), src).not.toBeNull();
        continue;
      }
      expect(src, src).toMatch(/^\/assets\/templates\/photos\/pradipta-/);
      expect(Number(img.getAttribute('width')), src).toBeGreaterThan(0);
      expect(Number(img.getAttribute('height')), src).toBeGreaterThan(0);
      // Varian kecil 800w/240w (kartu ekskul: satu varian 800w saja)
      expect(img.getAttribute('srcset'), src).toMatch(/-ekskul-/.test(src) ? /^\S+-800\.webp 800w$/ : / (800|240)w, /);
      expect(img.getAttribute('sizes'), src).toBeTruthy();
      const alt = img.getAttribute('alt')!;
      // Foto isi wajib deskriptif; alt kosong hanya untuk thumbnail slide (tombol berlabel) & foto akademik yang tersembunyi
      if (alt !== '') expect(alt.split(' ').length, src).toBeGreaterThanOrEqual(5);
      else expect(img.closest('button[aria-label^="Slide "], [aria-hidden="true"]'), src).not.toBeNull();
    }
    const eager = imgs.filter((img) => img.getAttribute('loading') !== 'lazy' && !img.getAttribute('src')?.endsWith('.svg'));
    expect(eager.map((img) => img.getAttribute('src'))).toEqual(['/assets/templates/photos/pradipta-hero-1-1920.webp']);
  });

  it('tautan asli untuk navigasi, tombol hanya untuk aksi (kecuali kirim formulir); SVG dekoratif tersembunyi; target sentuh 44px di kontrol', () => {
    const container = demo();
    for (const a of container.querySelectorAll('a')) expect(a.getAttribute('href'), a.textContent ?? '').toMatch(/^(#[a-z]|https:\/\/|mailto:|tel:)/);
    for (const button of container.querySelectorAll('button')) {
      expect(button.getAttribute('type'), button.textContent ?? '').toBe(button.closest('form') && /^(Lanjut|Susun pesan)/.test(button.textContent ?? '') ? 'submit' : 'button');
    }
    for (const svg of container.querySelectorAll('svg')) expect(svg.closest('[aria-hidden="true"], [aria-hidden=""]') ?? svg.getAttribute('aria-hidden'), svg.outerHTML.slice(0, 60)).toBeTruthy();
    const hero = section(container, 'hero');
    for (const name of ['Slide sebelumnya', 'Slide berikutnya', 'Jeda slide otomatis']) expect(within(hero).getByRole('button', { name }).className, name).toContain('h-11 w-11');
    expect(within(container.querySelector('header')!).getByRole('button', { name: 'Buka menu' }).className).toContain('h-11 w-11');
    // Tidak ada tautan/tombol (atau label pilihan formulir) di bawah 44px: chip saring, tab SPMB, "Baca selengkapnya",
    // tautan footer, logo, menu atas
    const small = /(^| )(h-(9|10|8)|min-h-(9|10|8))( |$)/;
    const check = (root: Element) => {
      for (const el of root.querySelectorAll('a, button, [role="tab"]')) expect(String(el.getAttribute('class') ?? ''), el.textContent ?? '').not.toMatch(small);
    };
    check(container);
    expect(within(container.querySelector('header')!).getByRole('link', { name: `${SCHOOL}, ke awal halaman` }).className).toContain('min-h-11');
    expect(within(container.querySelector('footer')!).getByRole('link', { name: `${SCHOOL}, ke awal halaman` }).className).toContain('min-h-11');
    cleanup();
    // Lampiran pengumuman
    check(demo({ announcements: { items: [{ title: 'Surat edaran', date: '2026-10-01', url: 'https://contoh.sch.id/edaran.pdf' }] } }));
  });
});

describe('Pradipta: konten opsional kosong', () => {
  it('hero tanpa foto → latar gradasi, tanpa slider; tetap satu H1 di kartu putih', () => {
    const container = demo({ hero: { image: '', slides: [] } });
    const hero = section(container, 'hero');
    expect(hero.querySelector('img')).toBeNull();
    expect(hero.querySelector('.pd-hero-fallback')).not.toBeNull();
    expect(within(hero).queryByRole('group', { name: 'Kontrol slide' })).toBeNull();
    expect(hero.hasAttribute('aria-roledescription')).toBe(false);
    expect(hero.querySelectorAll('[aria-live]')).toHaveLength(0);
    expect(hero.querySelector('h1')!.textContent).toBe('Sekolah Negeri yang Menyalakan Rasa Ingin Tahu');
  });

  it('hero dimatikan → header tetap, section pertama akses cepat; satu slide berfoto → tanpa kontrol slide', () => {
    const container = demo({ hero: { enabled: false } });
    expect(container.querySelector('header')).not.toBeNull();
    expect(sectionKeys(container)[0]).toBe('quicklinks');
    cleanup();
    const single = section(demo({ hero: { slides: [] } }), 'hero');
    expect(single.querySelector('img[fetchpriority="high"]')).not.toBeNull();
    expect(within(single).queryByRole('group', { name: 'Kontrol slide' })).toBeNull();
    expect(single.querySelector('.pd-progress')).toBeNull();
  });

  it('tanpa WhatsApp: wizard SPMB diganti tombol ke Kontak, tanya wali kelas & FAQ ke Kontak, tanpa wa.me', () => {
    const container = demo({ contact: { whatsapp: '' } });
    const spmb = section(container, 'spmb');
    expect(within(spmb).queryByRole('form')).toBeNull();
    expect(within(spmb).getByRole('link', { name: 'Hubungi sekolah' })).toHaveAttribute('href', '#kontak');
    expect(spmb.textContent).toContain('Data tidak disimpan di website dan tidak ada pembayaran online.');
    expect(within(section(container, 'teachers')).getByRole('link', { name: 'Tanya wali kelas' })).toHaveAttribute('href', '#kontak');
    expect(within(section(container, 'faq')).getByRole('link', { name: /Tanya lewat WhatsApp/ })).toHaveAttribute('href', '#kontak');
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    expect(within(section(container, 'contact')).queryByText('WhatsApp')).toBeNull();
  });

  it('nomor WhatsApp panitia SPMB terpisah; tanpa jalur di CMS → tab Jalur hilang dan hanya "Belum tahu"', async () => {
    const spmb = section(demo({ spmb: { whatsapp: '085700001111', paths: [] } }), 'spmb');
    expect(within(spmb).getAllByRole('tab').map((t) => t.textContent)).toEqual(['Jadwal', 'Syarat']);
    const form = within(spmb).getByRole('form');
    fireEvent.change(within(form).getByLabelText(/^Nama calon murid/), { target: { value: 'Bima Sakti' } });
    fireEvent.change(within(form).getByLabelText(/^Asal SMP/), { target: { value: 'MTs Negeri 1 Lampung Timur' } });
    act(() => {
      fireEvent.submit(form);
    });
    await flush();
    expect(within(form).getAllByRole('radio').map((r) => r.getAttribute('value'))).toEqual(['Belum tahu']);
    fireEvent.click(within(form).getByRole('radio', { name: 'Belum tahu' }));
    act(() => {
      fireEvent.submit(form);
    });
    await flush();
    // Peran "Calon murid" → label nama berganti dan terisi nama calon murid dari langkah 1 (pesan tidak salah atribusi)
    expect(within(form).getByLabelText(/^Nama orang tua\/wali/)).toHaveValue('');
    fireEvent.click(within(form).getByRole('radio', { name: 'Calon murid' }));
    expect(within(form).queryByLabelText(/^Nama orang tua\/wali/)).toBeNull();
    expect(within(form).getByLabelText(/^Nama Anda \(calon murid\)/)).toHaveValue('Bima Sakti');
    fireEvent.change(within(form).getByLabelText(/^Nomor WhatsApp/), { target: { value: '081298765432' } });
    act(() => {
      fireEvent.submit(form);
    });
    await flush();
    const link = within(spmb).getByRole('link', { name: 'Buka WhatsApp Panitia' });
    expect(link.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/6285700001111\?text=/);
    expect(wa(link)).toBe(
      'https://wa.me/6285700001111?text=Halo Panitia SPMB SMA Negeri 1 Purbolinggo, saya ingin bertanya.\n\nNama calon murid: Bima Sakti\nAsal sekolah: MTs Negeri 1 Lampung Timur\nDomisili: -\nJalur yang diminati: Belum tahu\nTopik: -\nPertanyaan: -\n\nCalon murid: Bima Sakti\nNomor WhatsApp: 081298765432\n\n(Dikirim dari formulir tanya SPMB di website sekolah. Data tidak disimpan di website.)',
    );
  });

  it('formulir SPMB: nama jalur/topik ganda dari CMS → satu pilihan (kunci unik, tidak dua radio tercentang)', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const spmb = section(
      demo({ spmb: { paths: [{ name: 'Prestasi' }, { name: 'Prestasi' }, { name: 'Belum tahu' }], topics: [{ name: 'Jadwal' }, { name: 'Jadwal' }] } }),
      'spmb',
    );
    const form = within(spmb).getByRole('form');
    fireEvent.change(within(form).getByLabelText(/^Nama calon murid/), { target: { value: 'Bima Sakti' } });
    fireEvent.change(within(form).getByLabelText(/^Asal SMP/), { target: { value: 'SMP Negeri 1' } });
    act(() => {
      fireEvent.submit(form);
    });
    await flush();
    expect(within(form).getAllByRole('radio').map((r) => r.getAttribute('value'))).toEqual(['Prestasi', 'Belum tahu']);
    expect(within(form).getAllByRole('checkbox').map((r) => r.getAttribute('value'))).toEqual(['Jadwal']);
    fireEvent.click(within(form).getByRole('radio', { name: 'Prestasi' }));
    expect(within(form).getAllByRole('radio').filter((r) => (r as HTMLInputElement).checked)).toHaveLength(1);
    expect(errors.mock.calls.filter((c) => String(c[0]).includes('same key'))).toEqual([]);
    errors.mockRestore();
  });

  it('akademik tanpa foto → daftar selebar penuh; ekskul satu kategori → tanpa tombol saring; footer tanpa pita; galeri 1 foto', () => {
    const container = demo({
      programs: { items: [{ title: 'Sains & Teknologi', subjects: 'Biologi, Kimia', text: 'Praktikum.', image: '' }] },
      studentlife: { items: [{ name: 'Pramuka', category: 'Kepemimpinan', schedule: '', text: '', image: '' }] },
      footer: { band_title: '' },
      gallery: { items: [{ image: '/assets/templates/photos/pradipta-galeri-1-1200.webp', caption: '' }] },
    });
    const programs = section(container, 'programs');
    expect(programs.querySelector('.pd-fade')).toBeNull();
    expect(programs.querySelector('[class*="@5xl:col-span-12"]')).not.toBeNull();
    expect(within(section(container, 'studentlife')).queryByRole('group')).toBeNull();
    expect(container.querySelector('footer')!.firstElementChild!.className).not.toContain('bg-(--pd-sky)');
    expect(within(container.querySelector('footer')!).queryByRole('link', { name: 'Lihat Info SPMB' })).toBeNull();
    const cell = section(container, 'gallery').querySelector('ul > li')!;
    expect(cell.className).toContain('@3xl:col-span-4');
    expect(cell.querySelector('p')).toBeNull();
  });

  it('pengumuman atau agenda saja → selebar penuh; keduanya kosong → tanpa pita', () => {
    const onlyAgenda = demo({ announcements: { enabled: false } });
    expect(section(onlyAgenda, 'agenda').parentElement!.className).not.toContain('@5xl:col-span-5');
    expect(sectionKeys(onlyAgenda)).not.toContain('announcements');
    cleanup();
    const none = demo({ announcements: { enabled: false }, agenda: { items: [] } });
    expect(sectionKeys(none)).not.toContain('agenda');
    expect(sectionKeys(none)).not.toContain('announcements');
  });
});

describe('Pradipta: pratinjau CMS', () => {
  it('pratinjau diam (gerak mati bila Component dirender langsung) dan tanpa tautan wa.me / Google Maps yang terbuka', () => {
    const { container } = render(<def.Component content={resolveContent(def, null)} preview />);
    expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'off');
    expect(container.querySelector('.pd-progress')).toBeNull();
    expect(container.querySelector('[aria-label="Jeda slide otomatis"]')).toBeNull();
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    expect(container.querySelector('a[href^="https://www.google.com/maps"]')).toBeNull();
    fireEvent.click(within(container).getByRole('button', { name: /^Slide 3 dari 4/ }));
    expect(container.querySelector('h1')!.textContent).toBe('Bangga Merawat Seni, Bahasa, dan Budaya Daerah');
  });
});

describe('Pradipta: editor CMS', () => {
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
        const first = box.queryAllByRole('button', { name: new RegExp(`^${f.itemLabel} 1(?![0-9])`) })[0];
        // List kosong di demo (mis. slide tambahan sudah terisi) tetap punya tombol tambah
        if (!first) continue;
        fireEvent.click(first);
        for (const sub of f.fields) expect(container.textContent, `${s.key}.${f.key}.${sub.key}`).toContain(sub.label);
      }
      unmount();
    }
  }, 60_000);

  it('warna tema memakai field warna CMS (pilihan cepat + hex sendiri), bantuan menyebut biru azure bawaan', () => {
    const color = def.sections[0].fields.find((f) => f.key === 'accent_color')!;
    const { container } = render(
      <SectionEditor
        section={def.sections[0]}
        content={resolveContent(def, null)}
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
    expect(within(container).getByRole('group', { name: `Pilihan cepat ${color.label.toLowerCase()}` })).toBeInTheDocument();
    expect(container.querySelector('input[type="color"]')).not.toBeNull();
    const help = ('help' in color && color.help) || '';
    expect(help).toContain('biru azure #0077B6');
  });
});

describe('Pradipta: data katalog', () => {
  const sql = (file: string) => readFileSync(resolve(ROOT, file), 'utf8');

  it.each(['database/seed.templates.sql', 'database/migrations/2026-10-27_040_pradipta_template.sql'])(
    '%s: baris pradipta dengan template_code, kategori, harga, dan pratinjau tangkapan layar .webp',
    (file) => {
      const text = sql(file);
      expect(text).toContain("'pradipta'");
      expect(text).toContain("'Sekolah & Pendidikan'");
      expect(text).toContain('1690000.00');
      expect(text).toContain("'/assets/templates/pradipta-preview.webp'");
      expect(text).toContain('\'["/assets/templates/pradipta-1.webp","/assets/templates/pradipta-2.webp"]\'');
      expect(text).toMatch(/formulir tanya panitia hanya menyusun pesan WhatsApp, data tidak disimpan di website, tidak ada unggah berkas, dan tidak ada pembayaran online/);
      expect(text).toMatch(/Pendaftaran tetap lewat portal SPMB provinsi/);
      expect(text).not.toMatch(/termasuk domain|domain, hosting|dijamin|garansi|terbaik/i);
    },
  );

  it('migrasi 040 aman diulang (INSERT IGNORE + UPDATE berdasarkan slug, tanpa DELETE) dan tercatat di schema_migrations', () => {
    const text = sql('database/migrations/2026-10-27_040_pradipta_template.sql').replace(/^--.*$/gm, '');
    expect(text).toMatch(/INSERT IGNORE INTO templates/);
    expect(text).toMatch(/WHERE slug = 'pradipta';/);
    expect(text).toMatch(/sort_order\s+= 23/);
    expect(text).toMatch(/status\s+= 'published'/);
    expect(text).not.toMatch(/\bDELETE\b/);
    expect(text).toContain("VALUES ('2026-10-27_040', 'templates: katalog Pradipta')");
    // Header: data saja, jalankan SETELAH deploy kode, menimpa suntingan admin, demo fiktif, domain tidak termasuk harga
    const header = sql('database/migrations/2026-10-27_040_pradipta_template.sql');
    expect(header).toMatch(/SETELAH kode/);
    expect(header).toMatch(/MENIMPA perubahan admin/);
    expect(header).toMatch(/FIKTIF/);
    expect(header).toMatch(/Domain tidak termasuk harga template/);
  });

  it('gambar pratinjau katalog ada di public/, 1600×1000, dan ringan', () => {
    for (const name of ['pradipta-preview', 'pradipta-1', 'pradipta-2']) {
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

describe('Pradipta: konten aneh', () => {
  it('angka, null, dan string di tempat list tidak membuat crash; tautan berbahaya dibuang', () => {
    const weird = {
      hero: { slides: 'x', primary_url: 'javascript:alert(1)', secondary_url: 'vbscript:x', caption: 5 },
      quicklinks: { pending_note: 9, items: [null, { title: 3 }, { title: 'SPMB', url: 'javascript:alert(1)' }, { title: 'PPID', url: 'javascript:alert(1)' }] },
      stats: { items: [{ value: 7 }, 'x'] },
      about: { facts: 'x', mission: [{ text: 5 }], values: null, image: 'javascript:alert(1)' },
      welcome: { photo: 'javascript:alert(1)', button_url: 'javascript:alert(1)' },
      programs: { items: [{ title: 1, image: 'javascript:alert(1)' }] },
      studentlife: { items: [{ name: 2, category: null, image: 'javascript:alert(1)' }] },
      facilities: { items: [{ name: 3, image: 'javascript:alert(1)' }, null, 'x', { name: 'Lab', text: 7 }] },
      achievements: { items: [{ title: 'Juara', year: 2026 }] },
      news: { items: [{ title: 'Berita', date: 9, category: null, url: 'javascript:alert(1)' }] },
      announcements: { items: [{ title: 'P', badge: 3, url: 'javascript:alert(1)' }] },
      agenda: { items: [{ title: 'A', date: 'besok' }] },
      teachers: { items: [{ name: 'Guru', photo: 'javascript:alert(1)' }] },
      spmb: { paths: [{ name: 2 }], schedule: [{ date: '2026-13-40', title: 'Tes' }], requirements: 'x', topics: 'x', portal_url: 'javascript:alert(1)', whatsapp: 'abc' },
      testimonials: { items: [{ quote: 'Baik', photo: 'javascript:alert(1)' }] },
      gallery: { items: [{ image: 'javascript:alert(1)' }] },
      faq: { items: [{ question: 2, answer: null }] },
      contact: { maps_url: 'javascript:alert(1)' },
      footer: { instagram: 'javascript:alert(1)', band_url: 'javascript:alert(1)' },
      brand: { accent_color: 'biru', logo: 'javascript:alert(1)' },
    } as unknown as SiteContent;
    const { container } = render(<def.Component content={resolveContent(def, weird)} />);
    expect(container.querySelector('a[href^="javascript:"], a[href^="vbscript:"]')).toBeNull();
    expect(container.querySelector('img[src^="javascript:"], iframe[src^="javascript:"]')).toBeNull();
    expect(section(container, 'agenda').textContent).toContain('besok');
    expect(section(container, 'spmb').textContent).toContain('2026-13-40');
    expect(container.querySelector('h1')!.textContent).toBe('Sekolah Negeri yang Menyalakan Rasa Ingin Tahu');
    expect(rootStyle(container, '--tpl-accent')).toBe('#0077b6');
    expect(within(section(container, 'facilities')).getByRole('heading', { level: 3, name: 'Lab' })).toBeInTheDocument();
  });

  it('nama sekolah 80 karakter: logo footer dibatasi lebar kolom (max-w-full) sehingga nama terpotong, halaman HP tidak bergeser ke samping', () => {
    const long = 'SMA Negeri 1 Unggulan Purbolinggo Kabupaten Lampung Timur Provinsi Lampung'.padEnd(80, 'x');
    const footer = demo({ brand: { company_name: long } }).querySelector('footer')!;
    const link = within(footer).getByRole('link', { name: `${long}, ke awal halaman` });
    expect(link.className).toMatch(/(^| )max-w-full( |$)/);
    expect(link.className).toMatch(/(^| )inline-flex( |$)/);
    const name = within(link).getByText(long);
    expect(name.className).toContain('truncate');
    expect(name.className).toContain('min-w-0');
  });
});
