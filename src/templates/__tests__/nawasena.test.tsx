// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/nawasena.test.tsx
// Nawasena (landing page SMA negeri "Elegant navy", 2026-10-27): skema CMS & konten demo, helper model (palet navy dari
// satu warna tema, menu, nomor label "/01", slide hero, strip pengumuman, tanggal + hari, agenda yang lewat → "Selesai",
// formulir tanya SPMB → pesan WhatsApp, bento galeri & fasilitas, ikon ekstrakurikuler, tujuan tautan "#…"), demo (urutan
// section, hero slider Ken Burns + rel nomor slide + strip pengumuman, pita angka, sambutan, profil buka-tutup, tab
// akademik, rel prestasi, berita majalah, pita pengumuman & agenda, ekstrakurikuler, fasilitas, guru, SPMB + formulir,
// galeri, alumni, FAQ, kontak + peta, footer), berita & pengumuman dari tulisan (site_posts: section profesional, strip
// pengumuman bertautan, halaman /berita, /pengumuman, /berita/{slug} dengan header navy dan footer yang bukan section),
// kustomisasi warna, SEO situs pembeli, konten opsional kosong, pratinjau CMS diam, editor CMS, data katalog (migrasi 039
// + seed + gambar pratinjau), dan konten aneh.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionEditor } from '../../pages/account/cms/SectionEditor';
import { validateContent } from '../../pages/account/cms/validation';
import { TEMPLATES, resolveContent } from '../index';
import { clubIconKey } from '../nawasena/icons';
import {
  accentIsDark,
  agendaEntries,
  degreeSplit,
  displayDate,
  EMPTY_QUESTION,
  facilityCells,
  galleryCells,
  heroSlides,
  isUrgent,
  linesOf,
  navItems,
  nawasenaPalette,
  nawasenaVars,
  PAGE_SECTIONS,
  parseSchoolDate,
  pathOptions,
  readNawasena,
  sectionTarget,
  spmbMessage,
  tagsOf,
  tickerItems,
  validateSpmbQuestion,
  wrapIndex,
} from '../nawasena/model';
import { NAWASENA_PHOTOS } from '../nawasena/photos';
import { INPUT } from '../nawasena/styles';
import { applySiteHead, siteTitle } from '../siteHead';
import { SiteRenderer } from '../SiteRenderer';
import { POST_PATH_KEY } from '../shared/posts/model';
import { SITE_DATA_DEFAULT, type SiteData } from '../shared/siteData';
import { contrast, getSection, parseHex } from '../shared/utils';
import { isListField, type ListItem, type SiteContent } from '../types';
import { ANNOUNCEMENTS, NEWS, POST } from './fixtures/sitePosts';

// Demo panjang (18 section) + getByRole di jsdom: bisa lewat 5 dtk saat suite berjalan paralel
vi.setConfig({ testTimeout: 30_000 });

const ROOT = process.cwd();
const def = TEMPLATES.nawasena;
const SCHOOL = 'SMA Negeri 1 Purbolinggo';
const ORDER = [
  'hero',
  'stats',
  'welcome',
  'about',
  'programs',
  'achievements',
  'news',
  'announcements',
  'agenda',
  'clubs',
  'facilities',
  'teachers',
  'spmb',
  'gallery',
  'testimonials',
  'faq',
  'contact',
];
const SLIDE_TITLES = [
  'Berakar kuat, menjangkau cita',
  'Ruang kelas tempat gagasan diuji',
  'Warisan Lampung, kebanggaan kami',
  'Dari lapangan dan sanggar, lahir pemimpin',
];
const sectionKeys = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-tpl-section]')).map((s) => s.getAttribute('data-tpl-section'));
const section = (root: HTMLElement, key: string) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`)!;
const demo = (content: unknown = null, preview = false) => render(<SiteRenderer templateCode="nawasena" content={content} preview={preview} />).container;
const rgb = (hex: string) => parseHex(hex)!;
const publicFile = (url: string) => resolve(ROOT, 'public', url.replace(/^\//, ''));
const rootStyle = (container: HTMLElement, name: string) => {
  const holder = Array.from(container.querySelectorAll<HTMLElement>('[style]')).find((el) => el.style.getPropertyValue(name));
  return holder?.style.getPropertyValue(name) ?? '';
};
const urls = (src: string) => {
  const asset = NAWASENA_PHOTOS.asset(src)!;
  return [asset.src, ...asset.srcSet!.split(',').map((part) => part.trim().split(' ')[0])].filter((u, i, all) => all.indexOf(u) === i);
};
const wa = (el: Element | null) => decodeURIComponent(el?.getAttribute('href') ?? '');
const linkList = (root: Element) => Array.from(root.querySelectorAll('a')).map((a) => `${a.textContent}|${a.getAttribute('href')}`);
const SOURCES = [
  'Nawasena',
  'Header',
  'Hero',
  'Stats',
  'Welcome',
  'About',
  'Programs',
  'Achievements',
  'News',
  'Notices',
  'Clubs',
  'Facilities',
  'Teachers',
  'Spmb',
  'Gallery',
  'Alumni',
  'Closing',
  'Footer',
  'ui',
  'marks',
];
/**
 * Situs live dengan fitur Berita & Pengumuman aktif dan tulisan dari SiteDataContext (CustomerSite / SitePreview); `data`
 * menimpa rute dsb.
 */
const withPosts = (data: Partial<SiteData> = {}, content: unknown = null) =>
  render(
    <SiteRenderer
      templateCode="nawasena"
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

describe('Nawasena: skema & konten bawaan', () => {
  it('urutan form = urutan halaman, semua section bisa disembunyikan, field unik & berbatas, list berbatas, label SPMB/PPDB', () => {
    expect(def.code).toBe('nawasena');
    expect(def.name).toBe('Nawasena');
    expect(def.sections.map((s) => s.key)).toEqual(['brand', ...ORDER, 'footer']);
    const fields = (key: string) => def.sections.find((s) => s.key === key)!.fields.map((f) => f.key);
    expect(fields('brand')).toEqual(['company_name', 'tagline', 'logo', 'accent_color']);
    expect(def.sections[0].fields.find((f) => f.key === 'accent_color')?.type).toBe('color');
    expect(fields('hero')).toEqual(
      expect.arrayContaining(['eyebrow', 'title', 'subtitle', 'image', 'slides', 'primary_label', 'secondary_label', 'header_label', 'ticker_label', 'ticker_link_label']),
    );
    expect(fields('spmb')).toEqual(
      expect.arrayContaining(['badges', 'portal_label', 'portal_url', 'paths', 'schedule', 'requirements', 'form_title', 'form_text', 'form_button', 'whatsapp']),
    );
    expect(fields('contact')).toEqual(expect.arrayContaining(['address', 'maps_query', 'maps_url', 'phone', 'email', 'whatsapp', 'whatsapp_message', 'hours']));
    expect(fields('footer')).toEqual(expect.arrayContaining(['instagram', 'facebook', 'linkedin', 'youtube', 'tiktok']));
    // Sekolah yang masih memakai istilah PPDB tetap paham: label CMS menyebut keduanya
    const spmb = def.sections.find((s) => s.key === 'spmb')!;
    expect(spmb.label).toMatch(/SPMB/);
    expect(spmb.label).toMatch(/PPDB/);
    expect(spmb.fields.find((f) => f.key === 'whatsapp')?.label).toMatch(/SPMB\/PPDB/);
    for (const s of def.sections) {
      const keys = s.fields.map((f) => f.key);
      expect(new Set(keys).size, s.key).toBe(keys.length);
      expect(def.defaultContent[s.key], s.key).toBeTypeOf('object');
      expect(s.introduced).toBeUndefined();
      if (s.key !== 'brand') expect(s.toggleable, s.key).toBe(true);
      for (const f of s.fields) {
        if (isListField(f)) {
          expect(f.max, `${s.key}.${f.key}`).toBeGreaterThan(0);
          for (const sub of f.fields) if (sub.type === 'text' || sub.type === 'textarea') expect(sub.maxLength, `${s.key}.${f.key}.${sub.key}`).toBeGreaterThan(0);
        } else if (f.type === 'text' || f.type === 'textarea') {
          expect(f.maxLength, `${s.key}.${f.key}`).toBeGreaterThan(0);
        }
      }
    }
    const slides = def.sections.find((s) => s.key === 'hero')!.fields.find((f) => f.key === 'slides');
    expect(slides && isListField(slides) ? slides.max : 0).toBe(3);
  });

  it('berita, pengumuman & agenda berbentuk data sama dengan template sekolah lain (siap untuk CRUD berita)', () => {
    const itemKeys = (code: string, key: string) => {
      const list = TEMPLATES[code].sections.find((s) => s.key === key)!.fields.find((f) => f.key === 'items');
      return list && isListField(list) ? list.fields.map((f) => f.key).sort() : [];
    };
    for (const other of ['bestari', 'cakrawala', 'madani']) {
      expect(itemKeys('nawasena', 'news'), other).toEqual(itemKeys(other, 'news'));
      expect(itemKeys('nawasena', 'announcements'), other).toEqual(itemKeys(other, 'announcements'));
    }
    expect(itemKeys('nawasena', 'agenda')).toEqual(itemKeys('bestari', 'agenda'));
    expect(itemKeys('nawasena', 'agenda')).toEqual(itemKeys('cakrawala', 'agenda'));
  });

  it('konten demo lolos validasi CMS, logo Tut Wuri Handayani (SVG), semua foto terdaftar, ada di public/, dipakai, dan tercatat di CREDITS.md', () => {
    const c = def.defaultContent;
    expect(validateContent(def, resolveContent(def, null))).toEqual({});
    expect(c.brand.company_name).toBe(SCHOOL);
    expect(c.brand.logo).toBe('/assets/templates/logos/tut-wuri-handayani.svg');
    expect(existsSync(publicFile(c.brand.logo as string))).toBe(true);
    expect(c.brand.accent_color).toBe('#2563EB');
    expect(c.hero.image).toBe('/assets/templates/photos/nawasena-hero-1-1920.webp');
    const photos = JSON.stringify(c).match(/\/assets\/templates\/photos\/[a-z0-9-]+\.webp/g) ?? [];
    expect(photos.length).toBeGreaterThanOrEqual(19);
    // Sambutan demo tanpa foto wajah: nama kepala sekolah fiktif tidak ditempel pada foto stok (papan monogram)
    expect(c.welcome.photo).toBe('');
    expect(NAWASENA_PHOTOS.keys).not.toContain('nawasena-kepsek');
    for (const src of photos) expect(NAWASENA_PHOTOS.asset(src), src).not.toBeNull();
    expect(NAWASENA_PHOTOS.keys.length).toBeGreaterThanOrEqual(6);
    const credits = readFileSync(resolve(ROOT, 'public/assets/templates/photos/CREDITS.md'), 'utf8');
    for (const key of NAWASENA_PHOTOS.keys) {
      expect(key).toMatch(/^nawasena-/);
      for (const url of urls(NAWASENA_PHOTOS.src(key))) expect(existsSync(publicFile(url)), url).toBe(true);
      expect(credits, key).toContain(`\`${key}-*\``);
      expect(photos, `${key} dipakai di konten demo`).toContain(NAWASENA_PHOTOS.src(key));
      // Alt deskriptif berbahasa Indonesia (≥ 5 kata)
      expect(NAWASENA_PHOTOS.alt(NAWASENA_PHOTOS.src(key), '').split(' ').length, key).toBeGreaterThanOrEqual(5);
    }
    // Simbol bawaan juga tersedia sebagai SVG mandiri, path sama dengan komponen
    const mark = readFileSync(publicFile('/assets/templates/logos/nawasena-mark.svg'), 'utf8');
    expect(mark).toContain('viewBox="0 0 32 32"');
    expect(mark).toContain('role="img"');
    expect(mark).toContain('<title>Nawasena</title>');
    const component = readFileSync(resolve(ROOT, 'src/templates/nawasena/marks.tsx'), 'utf8');
    const paths = mark.match(/ d="[^"]+"/g) ?? [];
    expect(paths.length).toBeGreaterThan(0);
    for (const d of paths) expect(component, d).toContain(d.trim());
  });

  it('foto demo ringan: slide hero 800/1280/1920, WebP ≤ 140 KB per file, varian 800 ≤ 90 KB, total ≤ 2,5 MB; ukuran piksel sesuai registry; foto disimpan WebP, bukan SVG', () => {
    expect(NAWASENA_PHOTOS.asset(def.defaultContent.hero.image as string)!.srcSet).toBe(
      '/assets/templates/photos/nawasena-hero-1-800.webp 800w, /assets/templates/photos/nawasena-hero-1-1280.webp 1280w, /assets/templates/photos/nawasena-hero-1-1920.webp 1920w',
    );
    let total = 0;
    for (const key of NAWASENA_PHOTOS.keys) {
      const asset = NAWASENA_PHOTOS.asset(NAWASENA_PHOTOS.src(key))!;
      for (const url of urls(NAWASENA_PHOTOS.src(key))) {
        expect(url, url).toMatch(/\.webp$/);
        const kb = statSync(publicFile(url)).size / 1024;
        expect(kb, url).toBeLessThanOrEqual(140);
        if (url.endsWith('-800.webp')) expect(kb, url).toBeLessThanOrEqual(90);
        // Header RIFF/WEBP asli (bukan berkas lain yang diberi nama .webp)
        const head = readFileSync(publicFile(url)).subarray(0, 30);
        expect(`${head.toString('ascii', 0, 4)}${head.toString('ascii', 8, 12)}`, url).toBe('RIFFWEBP');
        // Ukuran piksel dari header VP8/VP8X: varian terbesar = ukuran registry, varian lain sebanding (mis. hero
        // 1920×1080 / 1280×720 / 800×450, foto 1200×800 → 800×533) — potongan atau ukuran yang salah langsung gagal
        const chunk = head.toString('ascii', 12, 16);
        expect(['VP8 ', 'VP8X'], url).toContain(chunk);
        const size = chunk === 'VP8X' ? [head.readUIntLE(24, 3) + 1, head.readUIntLE(27, 3) + 1] : [head.readUInt16LE(26) & 0x3fff, head.readUInt16LE(28) & 0x3fff];
        const w = Number(/-(\d+)\.webp$/.exec(url)![1]);
        expect(size, url).toEqual(w === asset.width ? [asset.width, asset.height] : [w, Math.round((w * asset.height) / asset.width)]);
        total += kb;
      }
    }
    expect(total).toBeLessThanOrEqual(2500);
    // Slide hero selalu 16:9
    for (const key of NAWASENA_PHOTOS.keys.filter((k) => k.includes('-hero-'))) {
      const asset = NAWASENA_PHOTOS.asset(NAWASENA_PHOTOS.src(key))!;
      expect([asset.width, asset.height], key).toEqual([1920, 1080]);
    }
  });

  it('salinan demo jujur: SMA negeri dengan SPMB lewat portal provinsi, formulir tanya hanya lewat WhatsApp, tanpa klaim akreditasi/NPSN/peringkat', () => {
    const text = JSON.stringify(def.defaultContent);
    expect(text).not.toMatch(
      /dijamin|garansi|pasti diterima|pasti lolos|e-rapor|absensi online|pembayaran online|terbaik|nomor 1|termurah|#1|\bNPSN\b|akreditasi|terakreditasi|peringkat/i,
    );
    expect(text).toMatch(/data tidak disimpan di website/);
    expect(text).toMatch(/bukan pendaftaran/);
    expect(text).toMatch(/portal resmi SPMB Provinsi Lampung/);
    // Istilah baru SPMB di demo (label CMS tetap menyebut PPDB untuk sekolah yang masih memakainya)
    expect(text).not.toMatch(/\bPPDB\b/);
    // Kurikulum: paket mata pelajaran pilihan, bukan penjurusan IPA/IPS tetap
    expect(text).toMatch(/paket mata pelajaran/);
    // Kontak demo: email contoh, nomor contoh, alamat contoh
    expect(def.defaultContent.contact.email).toMatch(/\.example$/);
    expect(def.defaultContent.contact.whatsapp).toBe('081234567890');
    // Telepon contoh bergaya 0812…, bukan kode wilayah asli (0725) di samping nama sekolah nyata
    expect(def.defaultContent.contact.phone).toBe('0812-3456-7890');
    expect(def.defaultContent.contact.address).toMatch(/alamat contoh/);
    expect(def.defaultContent.about.founded).toBe('');
    // Tanpa sejarah karangan tentang sekolah nyata: blok sejarah demo hanya menjelaskan isinya
    expect(def.defaultContent.about.history_text).toMatch(/sejarah tidak diisi karena nama sekolah hanya contoh/);
    expect(def.defaultContent.about.history_text).not.toMatch(/SMA Negeri 1 Purbolinggo berdiri|didirikan|sejak tahun/i);
    expect(def.defaultContent.footer.note).toMatch(/ilustrasi/);
    // SMA, bukan SD
    expect(text).not.toMatch(/\bSD\b|sekolah dasar|TK\/PAUD|kelas [1-6]\b/i);
    expect(JSON.stringify(def.sections)).not.toMatch(/\bSD\b|sekolah dasar|TK\/PAUD|kelas [1-6]\b/i);
  });
});

describe('Nawasena: helper model', () => {
  it('palet: navy gelap (putih ≥ 15:1), terang ≥ 5:1 di navy & ≥ 4,6:1 di kartu 5%, tinta ≥ 5:1 di putih; warna tidak valid → bawaan', () => {
    const white = rgb('#ffffff');
    const surface = rgb('#F5F7FB');
    expect(nawasenaPalette('#2563EB').navy).toBe('#0b1736');
    for (const accent of ['#2563EB', '#047857', '#FACC15', '#B91C1C', '#0E1A1C', '#7DD3FC', '#211FFE', '#0E7490', '#B45309', '#7C3AED', '#BE185D', '#1F2937', '#FF0000', '#FFFFFF', '#000000']) {
      const p = nawasenaPalette(accent);
      const navy = rgb(p.navy);
      expect(contrast(navy, white), accent).toBeGreaterThanOrEqual(15);
      expect(contrast(rgb(p.bright), navy), accent).toBeGreaterThanOrEqual(5);
      expect(contrast(rgb(p.bright), rgb(p.card)), accent).toBeGreaterThanOrEqual(4.6);
      expect(contrast(rgb(p.ink), white), accent).toBeGreaterThanOrEqual(5);
      expect(contrast(rgb(p.ink), surface), accent).toBeGreaterThanOrEqual(4.6);
      expect(contrast(rgb(p.ink), rgb(p.tint)), accent).toBeGreaterThanOrEqual(4.5);
    }
    // Semua warna (kisi RGB 18 langkah, 5.832 warna) tetap lolos AA
    const steps = Array.from({ length: 18 }, (_, i) => Math.round((i * 255) / 17));
    const worst = { whiteOnNavy: Infinity, brightOnNavy: Infinity, brightOnCard: Infinity, inkOnWhite: Infinity, inkOnSurface: Infinity, inkOnTint: Infinity };
    for (const r of steps)
      for (const g of steps)
        for (const b of steps) {
          const p = nawasenaPalette(`#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`);
          const navy = rgb(p.navy);
          const ink = rgb(p.ink);
          worst.whiteOnNavy = Math.min(worst.whiteOnNavy, contrast(white, navy));
          worst.brightOnNavy = Math.min(worst.brightOnNavy, contrast(rgb(p.bright), navy));
          worst.brightOnCard = Math.min(worst.brightOnCard, contrast(rgb(p.bright), rgb(p.card)));
          worst.inkOnWhite = Math.min(worst.inkOnWhite, contrast(ink, white));
          worst.inkOnSurface = Math.min(worst.inkOnSurface, contrast(ink, surface));
          worst.inkOnTint = Math.min(worst.inkOnTint, contrast(ink, rgb(p.tint)));
        }
    expect(worst.whiteOnNavy).toBeGreaterThanOrEqual(15);
    expect(worst.brightOnNavy).toBeGreaterThanOrEqual(5);
    expect(worst.brightOnCard).toBeGreaterThanOrEqual(4.6);
    expect(worst.inkOnWhite).toBeGreaterThanOrEqual(5);
    expect(worst.inkOnSurface).toBeGreaterThanOrEqual(4.6);
    expect(worst.inkOnTint).toBeGreaterThanOrEqual(4.5);
    expect(nawasenaVars('bukan warna')).toEqual(nawasenaVars('#2563EB'));
    // Biru bawaan (bukan biru tua Cakrawala #1D4ED8 / biru Madani), navy kebiruan
    const accent = rgb(def.defaultContent.brand.accent_color as string);
    expect(accent[2]).toBeGreaterThan(accent[0] + 150);
    const navy = rgb(nawasenaPalette('#2563EB').navy);
    expect(navy[2]).toBeGreaterThan(navy[0] + 30);
    // Hijau dari CMS menghasilkan pita gelap kehijauan (bukan navy tetap)
    const green = rgb(nawasenaPalette('#047857').navy);
    expect(green[1]).toBeGreaterThan(green[0]);
  });

  it('bidang warna tema hanya bertema "inverse" (cincin fokus putih) bila teksnya putih', () => {
    expect(['#2563EB', '#047857', '#1D4ED8', '#1F2937'].map(accentIsDark)).toEqual([true, true, true, true]);
    expect(['#FACC15', '#7DD3FC', '#F59E0B'].map(accentIsDark)).toEqual([false, false, false]);
    const label = (container: HTMLElement) => within(section(container, 'hero')).getByText('Pengumuman').closest('p')!;
    expect(label(demo())).toHaveAttribute('data-tpl-tone', 'inverse');
    cleanup();
    expect(label(demo({ brand: { accent_color: '#FACC15' } })).hasAttribute('data-tpl-tone')).toBe(false);
  });

  it('menu: Profil, Akademik, Prestasi, Berita, Agenda, Kontak; label singkat dari label section, section kosong tidak masuk menu', () => {
    const content = resolveContent(def, null);
    expect(navItems(content).map((i) => `${i.key}:${i.label}`)).toEqual([
      'about:Profil',
      'programs:Akademik',
      'achievements:Prestasi',
      'news:Berita',
      'agenda:Agenda',
      'contact:Kontak',
    ]);
    const custom = resolveContent(def, { programs: { eyebrow: 'Kurikulum' }, achievements: { enabled: false }, news: { items: [] } });
    expect(navItems(custom).map((i) => `${i.key}:${i.label}`)).toEqual(['about:Profil', 'programs:Kurikulum', 'agenda:Agenda', 'contact:Kontak']);
    // Label panjang (> 2 kata / > 14 huruf) → label bawaan menu
    expect(navItems(resolveContent(def, { about: { eyebrow: 'Profil sekolah kami' } }))[0].label).toBe('Profil');
    expect(navItems(resolveContent(def, { contact: { eyebrow: 'Lokasi & kontak sekolah' } })).pop()?.label).toBe('Kontak');
  });

  it('nomor label "/01" mengikuti section berpenomor yang tampil; hero & pita angka tanpa nomor', () => {
    const m = readNawasena(resolveContent(def, null));
    expect(
      ['welcome', 'about', 'programs', 'achievements', 'news', 'announcements', 'agenda', 'clubs', 'facilities', 'teachers', 'spmb', 'gallery', 'testimonials', 'faq', 'contact'].map(
        m.number,
      ),
    ).toEqual(['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15']);
    expect([m.number('hero'), m.number('stats'), m.number('footer'), m.number('xyz')]).toEqual(['', '', '', '']);
    const hidden = readNawasena(resolveContent(def, { welcome: { enabled: false }, news: { items: [] } }));
    expect([hidden.number('about'), hidden.number('programs'), hidden.number('achievements'), hidden.number('announcements'), hidden.number('news')]).toEqual([
      '01',
      '02',
      '03',
      '04',
      '',
    ]);
    // Section yang aktif tetapi kosong (item tanpa isi wajib) tidak memakai nomor & tidak masuk menu
    const empty = resolveContent(def, {
      testimonials: { items: [{ name: 'Tanpa kutipan' }] },
      welcome: { title: '', quote: '', body: '' },
      agenda: { items: [{ date: '2026-11-25' }] },
      gallery: { items: [{ caption: 'Tanpa foto', image: '' }] },
    });
    const e = readNawasena(empty);
    expect([e.shown('testimonials'), e.shown('welcome'), e.shown('agenda'), e.shown('gallery')]).toEqual([false, false, false, false]);
    expect([e.number('about'), e.number('clubs'), e.number('faq'), e.number('agenda')]).toEqual(['01', '06', '10', '']);
    expect(navItems(empty).map((i) => i.key)).not.toContain('agenda');
    // "#footer" menuju footer (bukan tautan mati)
    expect(e.linkOr('#footer', null)).toEqual({ kind: 'section', target: 'footer' });
  });

  it('slide hero: slide 1 = isi hero, tambahan hanya yang berfoto (maks. 3), teks kosong ikut slide 1; indeks berputar', () => {
    const base = { image: '/a.webp', eyebrow: 'Label', title: 'Judul utama', subtitle: 'Deskripsi' };
    expect(heroSlides({ ...base, slides: [{ image: '', title: 'Tanpa foto' }, { image: '/b.webp' }, { image: '/c.webp', title: 'Judul C', eyebrow: 'Label C' }] }, 'Sekolah')).toEqual([
      base,
      { image: '/b.webp', eyebrow: 'Label', title: 'Judul utama', subtitle: 'Deskripsi' },
      { image: '/c.webp', eyebrow: 'Label C', title: 'Judul C', subtitle: 'Deskripsi' },
    ]);
    expect(heroSlides({}, 'Sekolah')).toEqual([{ image: '', eyebrow: '', title: 'Sekolah', subtitle: '' }]);
    expect(heroSlides({ slides: Array.from({ length: 6 }, (_, i) => ({ image: `/s${i}.webp` })) }, 'S')).toHaveLength(4);
    expect(heroSlides({ slides: [{ image: 'javascript:alert(1)' }] }, 'S')).toHaveLength(1);
    expect([wrapIndex(4, 4), wrapIndex(-1, 4), wrapIndex(2, 4), wrapIndex(1, 0)]).toEqual([0, 3, 2, 0]);
  });

  it('tanggal: ISO valid → "25 Nov 2026" + hari "Rab", teks bebas apa adanya, tanggal mustahil → teks', () => {
    expect(parseSchoolDate('2026-11-25')).toEqual({
      iso: '2026-11-25',
      day: '25',
      month: 'Nov',
      year: '2026',
      weekday: 'Rab',
      label: '25 Nov 2026',
      long: 'Rab, 25 Nov 2026',
    });
    expect(parseSchoolDate('2026-02-30')).toBeNull();
    expect(parseSchoolDate('25 Nov')).toBeNull();
    expect(displayDate(' 2027-07-01 ')).toBe('1 Jul 2027');
    expect(displayDate('12–14 Jul 2027')).toBe('12–14 Jul 2027');
    expect(displayDate('')).toBe('');
  });

  it('strip pengumuman: 5 terbaru (tanggal ISO terbaru dulu, tanpa tanggal ISO di belakang), tautan tulisan; agenda yang lewat → di belakang', () => {
    const items: ListItem[] = [
      { title: 'A', date: '2026-10-01' },
      { title: 'B', date: 'minggu depan' },
      { title: 'C', date: '2026-10-20' },
      { title: 'D', date: '2026-10-05', [POST_PATH_KEY]: '/pengumuman/d' },
      { title: 'E', date: '2026-09-01' },
      { title: 'F', date: '2026-08-01' },
    ];
    expect(tickerItems(items).map((i) => i.title)).toEqual(['C', 'D', 'A', 'E', 'F']);
    expect(tickerItems(items, 6).pop()).toEqual({ title: 'B', date: 'minggu depan', path: null });
    expect(tickerItems(items)[1]).toEqual({ title: 'D', date: '5 Okt 2026', path: '/pengumuman/d' });
    expect(tickerItems([])).toEqual([]);

    const agenda: ListItem[] = [
      { title: 'Lalu', date: '2026-11-25' },
      { title: 'Nanti', date: '2026-12-18' },
      { title: 'Teks', date: '12–14 Jul 2027' },
      { title: 'Hari ini', date: '2026-12-01' },
    ];
    const entries = agendaEntries(agenda, '2026-12-01');
    expect(entries.map((e) => `${e.item.title}:${e.past}`)).toEqual(['Nanti:false', 'Teks:false', 'Hari ini:false', 'Lalu:true']);
    expect([isUrgent('Penting'), isUrgent('WAJIB'), isUrgent('Kelas XII'), isUrgent('')]).toEqual([true, true, false, false]);
    // Nama bergelar: kata terakhir + gelar jadi satu bagian (gelar tidak turun sendirian ke baris terakhir)
    expect(degreeSplit('Muhammad Rizal, S.Pd., M.Si.')).toEqual(['Muhammad ', 'Rizal, S.Pd., M.Si.']);
    expect(degreeSplit('Rizal, S.Pd.')).toEqual(['', 'Rizal, S.Pd.']);
    expect(degreeSplit('I Made Suarsana')).toBeNull();
    expect(linesOf('- Satu\n\n2. Dua\n• Tiga ')).toEqual(['Satu', 'Dua', 'Tiga']);
    expect(tagsOf('Basket, Futsal\nPaduan Suara,, ')).toEqual(['Basket', 'Futsal', 'Paduan Suara']);
  });

  it('formulir tanya SPMB: validasi per isian, pilihan jalur dari CMS + "Belum tahu", pesan WhatsApp apa adanya (bukan pendaftaran)', () => {
    const spmb = getSection(resolveContent(def, null), 'spmb');
    const paths = pathOptions(spmb);
    expect(paths).toEqual(['Domisili', 'Afirmasi', 'Prestasi', 'Mutasi', 'Belum tahu']);
    expect(pathOptions({})).toEqual(['Belum tahu']);
    // Nama ganda (huruf besar/kecil diabaikan) dan jalur bernama "Belum tahu" tidak membuat <option> kembar
    expect(pathOptions({ paths: [{ name: 'Belum tahu' }, { name: 'Prestasi' }, { name: 'prestasi ' }, { name: 'BELUM TAHU' }, { name: '' }, { name: 'Mutasi' }] })).toEqual([
      'Prestasi',
      'Mutasi',
      'Belum tahu',
    ]);
    expect(Object.keys(validateSpmbQuestion(EMPTY_QUESTION, paths))).toEqual(['name', 'origin', 'question']);
    const filled = { name: 'Alya Putri', role: 'Orang tua/wali', origin: 'SMP Negeri 1 Purbolinggo', path: 'Prestasi', question: 'Apakah piagam lomba tari bisa dipakai?' };
    expect(validateSpmbQuestion(filled, paths)).toEqual({});
    expect(validateSpmbQuestion({ ...filled, role: 'Guru' }, paths)).toEqual({ role: 'Pilih salah satu.' });
    expect(validateSpmbQuestion({ ...filled, path: 'Zonasi' }, paths)).toEqual({ path: 'Pilih jalur yang diminati.' });
    expect(validateSpmbQuestion({ ...filled, name: ' A ' }, paths)).toEqual({ name: 'Tulis nama Anda.' });
    expect(validateSpmbQuestion({ ...filled, question: 'Halo?   ' }, paths)).toEqual({ question: 'Tulis pertanyaan minimal 10 huruf.' });
    expect(validateSpmbQuestion({ ...filled, question: 'x'.repeat(501) }, paths)).toEqual({ question: 'Pertanyaan paling banyak 500 huruf.' });
    expect(spmbMessage(SCHOOL, 'SPMB 2027/2028', { ...filled, name: ' Alya Putri ' })).toBe(
      'Halo Panitia SPMB SMA Negeri 1 Purbolinggo,\nsaya ingin bertanya tentang SPMB 2027/2028.\n\nNama: Alya Putri\nSaya: Orang tua/wali\nAsal sekolah: SMP Negeri 1 Purbolinggo\nJalur yang diminati: Prestasi\n\nPertanyaan:\nApakah piagam lomba tari bisa dipakai?\n\n(Dikirim dari formulir tanya SPMB di website sekolah. Formulir ini bukan pendaftaran.)',
    );
    expect(spmbMessage('SMA X', '', filled)).toContain('saya ingin bertanya tentang SPMB.\n');
  });

  it('formulir tanya SPMB: jalur CMS bernama "Belum tahu" atau ganda → pilihan unik, tanpa peringatan kunci React kembar', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const spmb = section(demo({ spmb: { paths: [{ name: 'Belum tahu' }, { name: 'Domisili' }, { name: 'domisili' }] } }), 'spmb');
      const path = within(spmb).getByLabelText('Jalur yang diminati') as HTMLSelectElement;
      expect(Array.from(path.options).map((o) => o.value)).toEqual(['Domisili', 'Belum tahu']);
      expect(errors.mock.calls.flat().join(' ')).not.toMatch(/same key/);
    } finally {
      errors.mockRestore();
    }
  });

  it('bento galeri (1–8 foto) dan fasilitas (0–6 foto + 0–5 kartu teks) tanpa sel kosong; HP berpasangan', () => {
    const cols = (cls: string) => Number(/@5xl:col-span-(\d+)/.exec(cls)?.[1] ?? 0);
    const rows = (cls: string) => Number(/@5xl:row-span-(\d)/.exec(cls)?.[1] ?? 1);
    for (let n = 1; n <= 8; n += 1) {
      const cells = galleryCells(n);
      expect(cells).toHaveLength(n);
      // Layar lebar 12 kolom: luas (kolom × baris) habis dibagi 12 → tidak ada lubang di baris terakhir
      const area = cells.reduce((sum, c) => sum + cols(c.className) * rows(c.className), 0);
      expect(area % 12, `galeri n=${n}`).toBe(0);
      for (const c of cells) expect(cols(c.className), `galeri n=${n}`).toBe(c.span);
      // HP 2 kolom: foto lebar memakai 2 kolom, sisanya berpasangan; foto pertama selalu lebar
      expect(cells.filter((c) => !c.wide).length % 2, `galeri n=${n}`).toBe(0);
      expect(cells[0].wide).toBe(true);
      for (const c of cells) {
        expect(c.className.includes('col-span-2 ') || c.className.startsWith('col-span-2'), `n=${n}`).toBe(c.wide);
        expect(c.sizes).toBe(`(min-width: 1024px) ${Math.round((c.span / 12) * 92)}vw, ${c.wide ? '92vw' : '46vw'}`);
      }
    }
    expect(galleryCells(4).map((c) => c.className.trim())).toEqual([
      'col-span-2 @5xl:col-span-6 @5xl:row-span-3',
      '@5xl:col-span-6 @5xl:row-span-2',
      '@5xl:col-span-3 @5xl:row-span-1',
      'col-span-2 @5xl:col-span-3 @5xl:row-span-1',
    ]);
    for (let p = 0; p <= 6; p += 1) {
      for (let t = 0; t <= 5; t += 1) {
        const { photos, texts } = facilityCells(p, t);
        expect(photos).toHaveLength(p);
        expect(texts).toHaveLength(t);
        expect(photos.reduce((sum, c) => sum + cols(c.className) * rows(c.className), 0) % 12, `p=${p}`).toBe(0);
        expect(texts.reduce((sum, c) => sum + cols(c.className), 0) % 12, `t=${t}`).toBe(0);
      }
    }
  });

  it('ikon ekstrakurikuler otomatis dari nama (aturan khusus di atas aturan umum)', () => {
    expect(
      [
        'Pramuka',
        'Paskibra',
        'PMR',
        'Sanggar Tari Tradisional Lampung',
        'KIR (Karya Ilmiah Remaja)',
        'Rohis & Kerohanian',
        'Bola Voli & Futsal',
        'English & Debate Club',
        'Paduan Suara',
        'Jurnalistik & Media Sekolah',
        'Robotik & Coding',
        'Fotografi & Film',
        'Pecinta Alam',
        'Pencak Silat',
        'Kriya Tapis',
        'Sesuatu yang lain',
      ].map(clubIconKey),
    ).toEqual(['scout', 'flag', 'health', 'dance', 'science', 'faith', 'sport', 'debate', 'choir', 'press', 'tech', 'photo', 'nature', 'martial', 'art', 'other']);
  });

  it('tautan "#…": anchor Indonesia (#akademik, #ppdb, #pendaftaran, #ekskul, #guru) ke section yang benar, anchor tak dikenal → cadangan', () => {
    expect([...PAGE_SECTIONS]).toEqual(def.sections.map((s) => s.key).filter((k) => k !== 'brand'));
    expect(
      ['profil', '#Akademik', 'pendaftaran', 'ppdb', 'spmb', 'berita', 'pengumuman', 'kontak', 'tentang', 'beranda', 'ekskul', 'guru', 'alumni', 'lokasi', 'sambutan', 'statistik'].map(
        sectionTarget,
      ),
    ).toEqual(['about', 'programs', 'spmb', 'spmb', 'spmb', 'news', 'announcements', 'contact', 'about', 'hero', 'clubs', 'teachers', 'testimonials', 'contact', 'welcome', 'stats']);
    expect(['xyz', 'brand', ''].map(sectionTarget)).toEqual([null, null, null]);
    const m = readNawasena(resolveContent(def, null));
    const fallback = { kind: 'section', target: 'spmb' } as const;
    expect(m.shown('berita')).toBe(false);
    expect(m.linkOr('#berita', fallback)).toEqual({ kind: 'section', target: 'news' });
    expect(m.linkOr('#ppdb', null)).toEqual({ kind: 'section', target: 'spmb' });
    expect(m.linkOr('#beranda', fallback)).toEqual({ kind: 'section', target: 'hero' });
    expect(m.linkOr('#salah-ketik', fallback)).toBe(fallback);
    expect(m.linkOr('', fallback)).toEqual(fallback);
    expect(m.linkOr('https://contoh.sch.id/', fallback)).toEqual({ kind: 'external', href: 'https://contoh.sch.id/' });
    const hidden = readNawasena(resolveContent(def, { news: { enabled: false } }));
    expect(hidden.linkOr('#berita', fallback)).toBe(fallback);
  });
});

describe('Nawasena: demo', () => {
  it('urutan section, satu h1 serif di tengah, hero slider setinggi layar (data-hero-layout kenburns), header transparan', () => {
    const container = demo();
    // Footer juga tujuan tautan "#footer" (landmark <footer> ber-data-tpl-section)
    expect(sectionKeys(container)).toEqual([...ORDER, 'footer']);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const hero = section(container, 'hero');
    expect(hero.getAttribute('data-hero-layout')).toBe('kenburns');
    expect(hero.getAttribute('data-tpl-tone')).toBe('inverse');
    const h1 = hero.querySelector('h1')!;
    expect(h1.textContent).toBe(SLIDE_TITLES[0]);
    // DM Serif Display hanya satu ketebalan: tidak pernah tebal palsu
    expect(h1.className).toContain('font-normal');
    expect(h1.className).not.toMatch(/font-(semibold|bold|medium)/);
    // Foto hero selebar layar sampai tepi atas (bukan di dalam CONTAINER / bingkai membulat), setinggi layar min. 640px
    const slide = hero.querySelector<HTMLElement>('.nw-slide')!;
    const stage = slide.parentElement!;
    expect(stage.parentElement).toBe(hero);
    expect(stage.className).not.toMatch(/rounded|max-w-|mx-auto|px-/);
    expect(hero.innerHTML).toContain('min-h-[640px]');
    expect(hero.innerHTML).toContain('100svh');
    expect(hero.querySelector('.nw-hero-scrim')).toHaveAttribute('aria-hidden', 'true');
    // Teks di tengah
    expect(h1.parentElement!.parentElement!.parentElement!.className).toMatch(/items-center.*text-center|text-center.*items-center/);
    const img = hero.querySelector<HTMLImageElement>('img[fetchpriority="high"]')!;
    expect(img.getAttribute('src')).toBe('/assets/templates/photos/nawasena-hero-1-1920.webp');
    expect(img.getAttribute('srcset')).toContain(' 800w');
    expect(img.getAttribute('srcset')).toContain('-1280.webp 1280w');
    expect(img.getAttribute('loading')).toBe('eager');
    expect(Number(img.getAttribute('width'))).toBe(1920);
    expect(Number(img.getAttribute('height'))).toBe(1080);
    expect(img.getAttribute('alt')).toMatch(/putih abu-abu/i);
    // HP/tablet: foto 16:9 menutupi wadah tegak (± 1.140px CSS lebar tampil), jadi browser memilih file yang cukup tajam
    expect(img.getAttribute('sizes')).toBe('(max-width: 1023px) 1150px, 100vw');
    // Foto LCP tidak di dalam pembungkus muncul-saat-digulir
    expect(img.closest('[data-reveal]')).toBeNull();
    expect(container.querySelectorAll('img[fetchpriority="high"]')).toHaveLength(1);
    expect(within(hero).getByRole('link', { name: 'Informasi SPMB' })).toHaveAttribute('href', '#spmb');
    expect(within(hero).getByRole('link', { name: 'Profil sekolah' })).toHaveAttribute('href', '#tentang');

    // Header selebar layar, menempel di atas, transparan di atas foto (belum digulir), teks putih
    const header = container.querySelector('header')!;
    expect(header.className).toContain('h-0');
    expect(header.className).toContain('sticky');
    expect(header).toHaveAttribute('data-tpl-tone', 'inverse');
    const bar = header.firstElementChild!;
    expect(bar.className).toContain('bg-transparent');
    expect(bar.className).not.toContain('bg-(--nw-navy)');
    // Logo di kotak putih kecil + nama sekolah; tautan flex agar tepat di tengah tinggi bilah
    const brandLink = within(header).getByRole('link', { name: `${SCHOOL}, ke awal halaman` });
    expect(brandLink.className).toMatch(/^flex .*items-center/);
    expect(brandLink).toHaveAttribute('href', '#beranda');
    const logo = header.querySelector('img[src="/assets/templates/logos/tut-wuri-handayani.svg"]')!;
    expect(logo, 'logo demo').not.toBeNull();
    expect(logo.parentElement!.className).toContain('bg-white');
    expect(logo.parentElement!.className).toContain('rounded-[8px]');
    expect(brandLink.textContent).toContain(SCHOOL);
    const nav = within(header).getAllByRole('navigation', { name: 'Menu utama' })[0];
    expect(linkList(nav)).toEqual(['Profil|#tentang', 'Akademik|#programs', 'Prestasi|#achievements', 'Berita|#berita', 'Agenda|#agenda', 'Kontak|#kontak']);
    const cta = within(header).getByRole('link', { name: 'SPMB 2027' });
    expect(cta).toHaveAttribute('href', '#spmb');
    expect(cta.className).toContain('ring-white/55');
    expect(cta.className).toContain('rounded-[6px]');
    fireEvent.click(within(nav).getByRole('link', { name: 'Akademik' }));
    expect(scrolled).toEqual(['programs']);
    cleanup();
    expect(demo({ brand: { logo: '' } }).querySelector('header svg[viewBox="0 0 32 32"]'), 'NawasenaMark').not.toBeNull();
  });

  it('menu HP: tombol buka/tutup (aria-expanded), bilah jadi navy pekat, Esc menutup dan fokus kembali ke tombol', () => {
    const header = demo().querySelector('header')!;
    const toggle = within(header).getByRole('button', { name: 'Buka menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle.className).toContain('h-11 w-11');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAccessibleName('Tutup menu');
    expect(header.firstElementChild!.className).toContain('bg-(--nw-navy)');
    const panel = document.getElementById(toggle.getAttribute('aria-controls')!)!;
    expect(panel.tagName).toBe('NAV');
    expect(panel).toHaveAttribute('aria-label', 'Menu utama');
    expect(within(panel).getAllByRole('link').map((a) => a.textContent)).toEqual(['Profil', 'Akademik', 'Prestasi', 'Berita', 'Agenda', 'Kontak', 'SPMB 2027']);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
    expect(header.firstElementChild!.className).toContain('bg-transparent');
    // Pilih menu → menu tertutup lalu gulir
    fireEvent.click(toggle);
    fireEvent.click(within(document.getElementById(toggle.getAttribute('aria-controls')!)!).getByRole('link', { name: 'Agenda' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(scrolled).toEqual(['agenda']);
  });

  it('hero slider: 4 slide, rel nomor "01–04" tegak di kanan (baris bawah di HP), sebelumnya/berikutnya, panah keyboard, geser, jeda, berhenti saat disorot', () => {
    const hero = section(demo(), 'hero');
    expect(hero.getAttribute('aria-roledescription')).toBe('carousel');
    expect(hero).toHaveAttribute('aria-label', `Sorotan ${SCHOOL}`);
    const controls = within(hero).getByRole('group', { name: 'Kontrol slide' });
    // Layar lebar: rel tegak di tepi kanan, tengah tinggi; HP: baris di bawah tengah
    expect(controls.className).toContain('@3xl:flex-col');
    expect(controls.className).toContain('@3xl:top-1/2');
    expect(controls.className).toMatch(/@3xl:right-/);
    expect(controls.className).toContain('bottom-5');
    expect(controls.className).toContain('left-1/2');
    const dots = within(controls).getAllByRole('button', { name: /^Slide \d dari 4/ });
    expect(dots).toHaveLength(4);
    expect(dots.map((d) => d.getAttribute('aria-label'))).toEqual(SLIDE_TITLES.map((title, i) => `Slide ${i + 1} dari 4: ${title}`));
    expect(dots.map((d) => d.textContent)).toEqual(['01', '02', '03', '04']);
    for (const d of dots) expect(d.className).toContain('h-11');
    expect(dots[0]).toHaveAttribute('aria-current', 'true');
    const progress = () => controls.querySelector('.nw-progress')!;
    expect(controls.querySelectorAll('.nw-progress')).toHaveLength(1);
    expect(progress()).toHaveAttribute('data-run', 'true');
    expect(progress()).toHaveAttribute('data-hold', 'false');
    // Hanya foto slide 1 yang dimuat di awal (eager)
    expect(hero.querySelectorAll('.nw-slide img')).toHaveLength(1);

    fireEvent.click(within(controls).getByRole('button', { name: 'Slide berikutnya' }));
    expect(dots[1]).toHaveAttribute('aria-current', 'true');
    expect(dots[0]).not.toHaveAttribute('aria-current');
    expect(hero.querySelector('h1')!.textContent).toBe(SLIDE_TITLES[1]);
    expect(hero.querySelectorAll('h1')).toHaveLength(1);
    const imgs = Array.from(hero.querySelectorAll<HTMLImageElement>('.nw-slide img'));
    expect(imgs.map((i) => i.getAttribute('fetchpriority'))).toEqual(['high', null, null, null]);
    expect(imgs.slice(1).every((i) => i.getAttribute('loading') === 'lazy')).toBe(true);
    expect(imgs.map((i) => i.getAttribute('alt') !== '')).toEqual([false, true, false, false]);
    const slides = Array.from(hero.querySelectorAll<HTMLElement>('.nw-slide'));
    expect(slides.map((s) => s.getAttribute('aria-hidden'))).toEqual(['true', null, 'true', 'true']);
    expect(slides.map((s) => s.className.includes('opacity-100'))).toEqual([false, true, false, false]);
    // Tombol tetap (tidak ikut slide), teks slide lain tersembunyi dari pembaca layar
    expect(within(hero).getAllByRole('link', { name: 'Informasi SPMB' })).toHaveLength(1);

    fireEvent.click(within(controls).getByRole('button', { name: 'Slide sebelumnya' }));
    fireEvent.click(within(controls).getByRole('button', { name: 'Slide sebelumnya' }));
    expect(dots[3]).toHaveAttribute('aria-current', 'true');
    fireEvent.keyDown(dots[3], { key: 'ArrowRight' });
    expect(dots[0]).toHaveAttribute('aria-current', 'true');
    // Rel tegak: panah bawah/atas juga berpindah slide
    fireEvent.keyDown(dots[0], { key: 'ArrowDown' });
    expect(dots[1]).toHaveAttribute('aria-current', 'true');
    fireEvent.keyDown(dots[1], { key: 'ArrowUp' });
    expect(dots[0]).toHaveAttribute('aria-current', 'true');
    fireEvent.click(dots[2]);
    expect(hero.querySelector('h1')!.textContent).toBe(SLIDE_TITLES[2]);
    fireEvent.click(dots[0]);
    // Geser ke kiri di HP → slide berikutnya; geser vertikal (gulir) diabaikan
    fireEvent.touchStart(hero, { touches: [{ clientX: 300, clientY: 200 }] });
    fireEvent.touchEnd(hero, { changedTouches: [{ clientX: 180, clientY: 210 }] });
    expect(dots[1]).toHaveAttribute('aria-current', 'true');
    fireEvent.touchStart(hero, { touches: [{ clientX: 300, clientY: 200 }] });
    fireEvent.touchEnd(hero, { changedTouches: [{ clientX: 240, clientY: 420 }] });
    expect(dots[1]).toHaveAttribute('aria-current', 'true');
    fireEvent.touchStart(hero, { touches: [{ clientX: 100, clientY: 200 }] });
    fireEvent.touchEnd(hero, { changedTouches: [{ clientX: 220, clientY: 205 }] });
    expect(dots[0]).toHaveAttribute('aria-current', 'true');

    fireEvent.mouseEnter(hero);
    expect(progress()).toHaveAttribute('data-hold', 'true');
    // Zoom Ken Burns foto aktif ikut berhenti (CSS .nw-slide[data-hold='true'] img → animation-play-state: paused)
    expect(hero.querySelector('.nw-slide[data-active="true"]')).toHaveAttribute('data-hold', 'true');
    fireEvent.mouseLeave(hero);
    expect(progress()).toHaveAttribute('data-hold', 'false');
    expect(hero.querySelector('.nw-slide[data-active="true"]')).toHaveAttribute('data-hold', 'false');
    // Difokus (keyboard) juga menahan garis progres
    act(() => dots[0].focus());
    expect(progress()).toHaveAttribute('data-hold', 'true');
    act(() => dots[0].blur());
    expect(progress()).toHaveAttribute('data-hold', 'false');
    fireEvent.click(within(controls).getByRole('button', { name: 'Jeda slide otomatis' }));
    expect(within(controls).getByRole('button', { name: 'Putar slide otomatis' })).toBeInTheDocument();
    expect(progress()).toHaveAttribute('data-run', 'false');
    expect(hero.querySelector('.nw-slide[data-active="true"]')).toHaveAttribute('data-hold', 'true');
    // Nomor slide tidak aktif putih 90% (kontras di atas foto terang), aktif putih penuh & tebal
    expect(dots[1].className).toContain('text-white/90');
    expect(dots[0].className).toMatch(/font-semibold text-white(\s|$)/);
    const css = readFileSync(resolve(ROOT, 'src/templates/nawasena/nawasena.css'), 'utf8');
    expect(css).toMatch(/\[data-tpl-motion='on'\] \.nw-slide\[data-hold='true'\] img \{\s*animation-play-state: paused;/);
  });

  it('hero slider berganti saat garis progres penuh dan BERHENTI SENDIRI di slide 1 setelah dua putaran (WCAG 2.2.2)', () => {
    const hero = section(demo(), 'hero');
    const controls = within(hero).getByRole('group', { name: 'Kontrol slide' });
    const current = () => within(controls).getAllByRole('button', { name: /^Slide \d dari 4/ }).findIndex((b) => b.getAttribute('aria-current') === 'true');
    const progress = () => controls.querySelector('.nw-progress')!;
    // React memilih nama event animationend/webkitAnimationEnd dari gaya jsdom: kirim yang kedua bila yang pertama diabaikan
    const tick = () => {
      const before = current();
      const bar = progress();
      fireEvent.animationEnd(bar);
      if (current() === before) fireEvent(bar, new Event('webkitAnimationEnd', { bubbles: true }));
    };
    tick();
    expect(current()).toBe(1);
    for (let i = 0; i < 6; i += 1) tick();
    expect(current()).toBe(3);
    expect(within(controls).getByRole('button', { name: 'Jeda slide otomatis' })).toBeInTheDocument();
    // Putaran kedua selesai → kembali ke slide 1 lalu berhenti: tombol putar tampil, garis progres & zoom diam
    tick();
    expect(current()).toBe(0);
    expect(within(controls).getByRole('button', { name: 'Putar slide otomatis' })).toBeInTheDocument();
    expect(progress()).toHaveAttribute('data-run', 'false');
    expect(hero.querySelector('.nw-slide[data-active="true"]')).toHaveAttribute('data-hold', 'true');
    expect(hero.querySelector('[data-nw-slide-status]')).toHaveAttribute('aria-live', 'polite');
    // Diputar lagi → berjalan dengan hitungan putaran baru
    fireEvent.click(within(controls).getByRole('button', { name: 'Putar slide otomatis' }));
    expect(progress()).toHaveAttribute('data-run', 'true');
    expect(hero.querySelector('.nw-slide[data-active="true"]')).toHaveAttribute('data-hold', 'false');
    for (let i = 0; i < 4; i += 1) tick();
    expect(current()).toBe(0);
    expect(within(controls).getByRole('button', { name: 'Jeda slide otomatis' })).toBeInTheDocument();
    // Pilihan manual (tombol berikutnya) tidak dihitung sebagai putaran
    for (let i = 0; i < 8; i += 1) fireEvent.click(within(controls).getByRole('button', { name: 'Slide berikutnya' }));
    expect(current()).toBe(0);
    expect(progress()).toHaveAttribute('data-run', 'true');
  });

  it('hero di luar layar (IntersectionObserver) → garis progres & zoom ditahan, putaran tidak habis tanpa dilihat', () => {
    const observers: { cb: IntersectionObserverCallback; targets: Element[] }[] = [];
    class FakeIO {
      record: (typeof observers)[number];
      constructor(cb: IntersectionObserverCallback) {
        this.record = { cb, targets: [] };
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
      const hero = section(demo(), 'hero');
      const stage = hero.querySelector('.nw-slide')!.parentElement!;
      const fire = (isIntersecting: boolean, ratio: number) => {
        for (const o of observers.filter((x) => x.targets.includes(stage)))
          act(() => o.cb([{ target: stage, isIntersecting, intersectionRatio: ratio } as unknown as IntersectionObserverEntry], {} as IntersectionObserver));
      };
      const progress = () => hero.querySelector('.nw-progress')!;
      expect(observers.some((o) => o.targets.includes(stage))).toBe(true);
      expect(progress()).toHaveAttribute('data-hold', 'false');
      fire(false, 0);
      expect(progress()).toHaveAttribute('data-hold', 'true');
      expect(hero.querySelector('.nw-slide[data-active="true"]')).toHaveAttribute('data-hold', 'true');
      // Baru sebagian kecil terlihat (< 30%) → tetap ditahan; kembali terlihat → berjalan lagi
      fire(true, 0.1);
      expect(progress()).toHaveAttribute('data-hold', 'true');
      fire(true, 0.6);
      expect(progress()).toHaveAttribute('data-hold', 'false');
      expect(progress()).toHaveAttribute('data-run', 'true');
    } finally {
      window.IntersectionObserver = original;
    }
  });

  it('LCP aman: foto & teks slide pertama tidak dianimasikan masuk; Ken Burns & teks naik hanya setelah pergantian; CSS gerak bergerbang', () => {
    const hero = section(demo(), 'hero');
    const slides = () => Array.from(hero.querySelectorAll<HTMLElement>('.nw-slide'));
    const textBlock = () => hero.querySelector('h1')!.parentElement!;
    expect(slides()[0].hasAttribute('data-zoom')).toBe(false);
    expect(textBlock()).toHaveAttribute('data-enter', 'false');
    const controls = within(hero).getByRole('group', { name: 'Kontrol slide' });
    fireEvent.click(within(controls).getByRole('button', { name: 'Slide berikutnya' }));
    expect(slides().map((s) => s.getAttribute('data-zoom'))).toEqual([null, 'a', null, null]);
    expect(textBlock()).toHaveAttribute('data-enter', 'true');
    fireEvent.click(within(controls).getByRole('button', { name: 'Slide berikutnya' }));
    // Slide yang memudar keluar mempertahankan zoom-nya (tidak meloncat)
    expect(slides().map((s) => s.getAttribute('data-zoom'))).toEqual([null, 'a', 'a', null]);
    fireEvent.click(within(controls).getByRole('button', { name: 'Slide sebelumnya' }));
    // Tampil lagi → nama animasi berganti agar zoom diputar ulang
    expect(slides().map((s) => s.getAttribute('data-zoom'))).toEqual([null, 'b', 'a', null]);
    // Kembali ke slide 1 setelah pergantian: baru di sini foto pertama ikut membesar pelan
    fireEvent.click(within(controls).getByRole('button', { name: /^Slide 1 dari 4/ }));
    expect(slides()[0].getAttribute('data-zoom')).toBe('a');

    const css = readFileSync(resolve(ROOT, 'src/templates/nawasena/nawasena.css'), 'utf8');
    expect(css).toMatch(/@layer components/);
    expect(css).toMatch(/\[data-tpl-motion='on'\] \.nw-slide\[data-zoom='a'\] img/);
    expect(css).toMatch(/\[data-tpl-motion='on'\] \[data-enter='true'\] \.nw-rise/);
    expect(css).toMatch(/scale\(1\.06\)/);
    // Setiap aturan yang menganimasikan / mentransisikan hanya berlaku bila gerak menyala
    const rules = Array.from(css.matchAll(/([^{};]+)\{[^{}]*\b(?:animation|transition)\s*:/g)).map((r) => r[1].trim());
    expect(rules.length).toBeGreaterThan(8);
    for (const selector of rules) expect(selector, selector).toContain("[data-tpl-motion='on']");
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    for (const selector of ['.nw-progress', '.nw-slide[data-zoom] img', '.nw-rise', '.nw-collapse', '.nw-tab-indicator', '.nw-fade', '.nw-timeline-line', '.nw-slide'])
      expect(reduced, selector).toContain(selector);
    // Tanpa bayangan di CSS juga
    expect(css).not.toMatch(/box-shadow|drop-shadow|text-shadow/);
  });

  it('hero slider: wilayah live tetap (tidak dipasang ulang) mengumumkan slide yang dipilih manual; diam saat berganti otomatis', () => {
    const hero = section(demo(), 'hero');
    const status = () => hero.querySelector<HTMLElement>('[data-nw-slide-status]')!;
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
    expect(live).toHaveTextContent(`Slide 2 dari 4: ${SLIDE_TITLES[1]}`);
  });

  it('strip pengumuman di bawah foto: label warna tema, 5 pengumuman terbaru berjalan (bisa dijeda → satu baris), "Lihat semua" ke #pengumuman', () => {
    const hero = section(demo(), 'hero');
    const marquee = within(hero).getByRole('list', { name: 'Pengumuman terbaru' });
    const titles = Array.from(marquee.querySelectorAll('li')).map((li) => li.textContent);
    expect(titles).toHaveLength(5);
    expect(titles[0]).toBe('23 Okt 2026·Asesmen sumatif akhir semester ganjil: 30 November–5 Desember 2026');
    expect(titles[4]).toContain('Mohon partisipasi mengisi survei kepuasan masyarakat');
    const label = within(hero).getByText('Pengumuman').closest('p')!;
    expect(label.className).toContain('bg-(--tpl-accent)');
    expect(label.className).toContain('text-(--tpl-on-accent)');
    const all = within(hero).getAllByRole('link', { name: 'Lihat semua pengumuman' });
    expect(all).toHaveLength(2);
    for (const a of all) expect(a).toHaveAttribute('href', '#pengumuman');
    fireEvent.click(all[0]);
    expect(scrolled).toEqual(['announcements']);
    fireEvent.click(within(hero).getByRole('button', { name: 'Jeda pengumuman berjalan' }));
    expect(within(hero).queryByRole('list', { name: 'Pengumuman terbaru' })).toBeNull();
    expect(within(hero).getByRole('button', { name: 'Putar pengumuman berjalan' })).toBeInTheDocument();
    expect(within(hero).getByText('Asesmen sumatif akhir semester ganjil: 30 November–5 Desember 2026')).toBeInTheDocument();
    cleanup();
    // Label strip kosong / pengumuman disembunyikan → tanpa strip
    expect(within(section(demo({ hero: { ticker_label: '' } }), 'hero')).queryByText('Lihat semua')).toBeNull();
    cleanup();
    const noNotices = section(demo({ announcements: { enabled: false } }), 'hero');
    expect(within(noNotices).queryByRole('list', { name: 'Pengumuman terbaru' })).toBeNull();
    expect(within(noNotices).queryByRole('button', { name: /pengumuman berjalan/ })).toBeNull();
  });

  it('pita angka navy menyambung hero: H2 serif, keterangan periode, 6 angka serif (teks akhir di DOM) + catatan, garis pemisah tipis', () => {
    const stats = section(demo(), 'stats');
    expect(stats).toHaveAttribute('data-tpl-tone', 'inverse');
    expect(stats.className).toContain('bg-(--nw-navy)');
    expect(stats.querySelector('h2')!.textContent).toBe(`${SCHOOL} dalam angka`);
    expect(stats.textContent).toContain('Data Tahun Ajaran 2026/2027 · angka ilustrasi untuk demo');
    expect(Array.from(stats.querySelectorAll('dt')).map((d) => d.textContent)).toEqual([
      'Peserta didik',
      'Rombongan belajar',
      'Guru',
      'Tenaga kependidikan',
      'Ekstrakurikuler',
      'Laboratorium',
    ]);
    const values = Array.from(stats.querySelectorAll('dd.order-1'));
    expect(values.map((d) => d.textContent)).toEqual(['1.048', '30', '62', '21', '20', '4']);
    expect(values[0].className).toContain('font-normal');
    expect(stats.querySelector('dl')!.className).toContain('@6xl:grid-cols-6');
    expect(stats.textContent).toContain('Kelas X 360 · XI 352 · XII 336');
    expect(stats.innerHTML).not.toMatch(/rounded-|ring-1/);
  });

  it('sambutan (papan monogram navy tanpa foto wajah + kutipan serif besar), profil + visi/misi buka-tutup + sejarah + chip dimensi', () => {
    const container = demo();
    const welcome = section(container, 'welcome');
    expect(welcome.textContent).toContain('/01');
    expect(welcome.textContent).toContain('— Sambutan');
    expect(welcome.querySelector('h2')!.textContent).toBe('Sambutan Kepala Sekolah');
    expect(welcome.querySelector('blockquote p')!.textContent).toMatch(/^Kami ingin setiap murid merasa aman/);
    expect(welcome.querySelector('blockquote p')!.className).toContain('italic');
    // Demo tanpa foto: papan monogram navy (inisial dekoratif tanpa gelar, nama & jabatan lengkap), tanpa wajah stok
    const plate = welcome.querySelector<HTMLElement>('[data-nw-plate]')!;
    expect(plate).toHaveAttribute('data-tpl-tone', 'inverse');
    expect(plate.textContent).toContain('Dra. Ratna Kurniasih, M.Pd.');
    expect(plate.textContent).toContain(`Kepala ${SCHOOL}`);
    expect(Array.from(plate.querySelectorAll('span[aria-hidden]')).map((s) => s.textContent)).toContain('RK');
    expect(welcome.querySelector('figure')).toBeNull();
    // Satu-satunya gambar = logo sekolah di kotak putih (dekoratif), bukan foto orang
    expect(Array.from(welcome.querySelectorAll('img')).map((i) => `${i.getAttribute('src')}|${i.getAttribute('alt')}`)).toEqual([
      '/assets/templates/logos/tut-wuri-handayani.svg|',
    ]);
    expect(welcome.querySelector('blockquote')!.parentElement!.className).toContain('@5xl:col-start-6');
    expect(welcome.textContent).toContain('Sekolah yang baik dibangun bersama.');

    const about = section(container, 'about');
    expect(about.querySelector('h2')!.textContent).toBe('Sekolah negeri yang berakar di Purbolinggo');
    expect(about.textContent).toContain('/02');
    // Visi tanpa isi tambahan → judul biasa; Misi & Budaya sekolah → tombol buka-tutup (yang pertama terbuka)
    const pillars = within(about).getAllByRole('button');
    expect(pillars.map((b) => `${b.textContent}:${b.getAttribute('aria-expanded')}`)).toEqual(['Misi:true', 'Budaya sekolah:false']);
    expect(within(about).getByRole('heading', { level: 3, name: 'Visi' })).toBeInTheDocument();
    const misiRegion = document.getElementById(pillars[0].getAttribute('aria-controls')!)!;
    expect(misiRegion).toHaveAttribute('role', 'region');
    expect(misiRegion).not.toHaveAttribute('inert');
    expect(misiRegion.querySelectorAll('li')).toHaveLength(5);
    fireEvent.click(pillars[1]);
    expect(pillars.map((b) => b.getAttribute('aria-expanded'))).toEqual(['false', 'true']);
    expect(misiRegion).toHaveAttribute('inert');
    expect(document.getElementById(pillars[1].getAttribute('aria-controls')!)!.querySelectorAll('li')).toHaveLength(4);
    expect(within(about).getByRole('heading', { level: 3, name: 'Sejarah singkat' })).toBeInTheDocument();
    // Tahun berdiri kosong di demo → tidak tampil (tidak mengarang sejarah)
    expect(about.textContent).not.toContain('Berdiri:');
    expect(within(about).getByText('Delapan dimensi profil lulusan')).toBeInTheDocument();
    expect(about.querySelectorAll('ul.flex-wrap li')).toHaveLength(8);
    cleanup();
    expect(section(demo({ about: { founded: '1984' } }), 'about').textContent).toContain('Berdiri: 1984');
  });

  it('akademik: tab paket (panah kiri/kanan, Home/End, tabindex bergulir), foto berganti pudar, mata pelajaran bernomor, kokurikuler', () => {
    const programs = section(demo(), 'programs');
    const tablist = within(programs).getByRole('tablist', { name: 'Akademik' });
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['01Sains & Teknologi', '02Sosial & Humaniora', '03Bahasa & Budaya']);
    expect(tabs.map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
    const panel = (tab: HTMLElement) => document.getElementById(tab.getAttribute('aria-controls')!)!;
    expect(panel(tabs[0])).not.toHaveAttribute('hidden');
    expect(panel(tabs[1])).toHaveAttribute('hidden');
    expect(panel(tabs[0])).toHaveAttribute('aria-labelledby', tabs[0].id);
    expect(Array.from(panel(tabs[0]).querySelectorAll('ol li')).map((li) => li.textContent)).toEqual([
      '01Biologi',
      '02Kimia',
      '03Fisika',
      '04Matematika Tingkat Lanjut',
      '05Informatika',
    ]);
    // Foto paket ditumpuk; hanya yang aktif terlihat & beralt
    // (lapisan .nw-fade berisi simbol samar untuk paket tanpa foto tidak dihitung: semua paket demo berfoto)
    const photos = () => Array.from(programs.querySelectorAll<HTMLElement>('.nw-fade')).filter((p) => p.querySelector('img'));
    expect(programs.querySelector('.nw-fade svg')!.closest('.nw-fade')!.className).toContain('opacity-0');
    expect(photos()).toHaveLength(3);
    expect(photos().map((p) => p.className.includes('opacity-100'))).toEqual([true, false, false]);
    expect(photos().map((p) => p.querySelector('img')!.getAttribute('alt') !== '')).toEqual([true, false, false]);

    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveFocus();
    expect(tabs.map((t) => t.getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);
    expect(photos().map((p) => p.className.includes('opacity-100'))).toEqual([false, true, false]);
    expect(panel(tabs[1]).querySelector('h3')!.textContent).toBe('Sosial & Humaniora');
    fireEvent.keyDown(tabs[1], { key: 'End' });
    expect(tabs[2]).toHaveFocus();
    expect(panel(tabs[2]).textContent).toContain('Bahasa dan Sastra Lampung (muatan lokal)');
    fireEvent.keyDown(tabs[2], { key: 'ArrowRight' });
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs[0], { key: 'ArrowLeft' });
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs[2], { key: 'Home' });
    expect(tabs[0]).toHaveFocus();
    fireEvent.click(tabs[1]);
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(within(programs).getByRole('heading', { level: 3, name: 'Kokurikuler' })).toBeInTheDocument();
    expect(programs.textContent).toContain('Paket yang dibuka setiap tahun menyesuaikan ketentuan kurikulum');
  });

  it('prestasi: rel geser scroll-snap berlabel dengan tombol sebelumnya/berikutnya (HP & layar lebar), kartu datar radius 8', () => {
    const scrollBy = vi.fn();
    HTMLElement.prototype.scrollBy = scrollBy as unknown as typeof HTMLElement.prototype.scrollBy;
    const achievements = section(demo(), 'achievements');
    const rail = within(achievements).getByRole('list', { name: 'Prestasi murid di berbagai bidang' });
    expect(rail.className).toContain('snap-x');
    expect(rail.className).toContain('snap-mandatory');
    expect(rail.className).toContain('overflow-x-auto');
    const cards = Array.from(rail.querySelectorAll('li'));
    expect(cards).toHaveLength(6);
    expect(cards[0].className).toContain('snap-start');
    expect(cards[0].className).toContain('rounded-[8px]');
    expect(cards[0].textContent).toContain('2026 · Kabupaten');
    expect(cards[0].textContent).toContain('Juara II');
    expect(within(achievements).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)[0]).toBe('Lomba Debat Bahasa Inggris');
    // Dua set tombol (di samping judul di layar lebar, di bawah rel di HP)
    const next = within(achievements).getAllByRole('button', { name: 'Prestasi berikutnya' });
    expect(next).toHaveLength(2);
    expect(within(achievements).getAllByRole('button', { name: 'Prestasi sebelumnya' })[0]).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(next[0]);
    expect(scrollBy).toHaveBeenCalledWith({ left: 16, behavior: 'smooth' });
    // Peringkat kosong → nama lomba tetap jadi H3 (tanpa H3 kosong)
    cleanup();
    const noRank = section(demo({ achievements: { items: [{ title: '', event: 'Olimpiade Sains Kabupaten', year: '2026' }] } }), 'achievements');
    expect(within(noRank).getByRole('heading', { level: 3 })).toHaveTextContent('Olimpiade Sains Kabupaten');
    expect(noRank.textContent?.split('Olimpiade Sains Kabupaten')).toHaveLength(2);
  });

  it('berita: tata letak majalah (1 utama berfoto + 3 berita berfoto kecil + daftar ringkas), isi lengkap dibuka di tempat', () => {
    const news = section(demo(), 'news');
    const articles = Array.from(news.querySelectorAll('article'));
    expect(articles).toHaveLength(6);
    expect(Array.from(news.querySelectorAll('article h3')).map((h) => h.textContent)).toEqual([
      'Bulan Bahasa ditutup dengan debat antarkelas',
      'Kelas XII ikuti simulasi Tes Kemampuan Akademik',
      'Sanggar tari tampil pada penyambutan tamu sekolah',
      'Belajar konservasi gajah sumatra lewat kunjungan edukasi',
      'Pameran kokurikuler: olahan ubi jalar dan kacang tanah',
      'Pengurus OSIS dan MPK masa bakti 2026/2027 dilantik',
    ]);
    // Berita demo tidak menyatakan juara/peringkat sebagai fakta (nama sekolah demo bisa milik sekolah nyata)
    expect(news.textContent).not.toMatch(/juara|peringkat|terbaik/i);
    // Berita utama: foto 3:2 besar, judul serif; tiga berita di samping berfoto kecil; sisanya tanpa foto
    expect(articles[0].querySelector('img')!.getAttribute('sizes')).toBe('(min-width: 1024px) 54vw, 92vw');
    expect(articles[0].querySelector('h3')!.className).toContain('font-normal');
    expect(articles.slice(1, 4).every((a) => a.querySelector('img'))).toBe(true);
    expect(articles.slice(4).some((a) => a.querySelector('img'))).toBe(false);
    expect(news.querySelector('article time')).toHaveAttribute('datetime', '2026-10-26');
    expect(within(news).getByText('Berita lainnya')).toBeInTheDocument();
    const more = within(articles[0]).getByRole('button', { name: /Baca selengkapnya/ });
    expect(more).toHaveAccessibleName('Baca selengkapnya: Bulan Bahasa ditutup dengan debat antarkelas');
    expect(more).toHaveAttribute('aria-expanded', 'false');
    const body = document.getElementById(more.getAttribute('aria-controls')!)!;
    expect(body).toHaveAttribute('inert');
    fireEvent.click(more);
    expect(more).toHaveAttribute('aria-expanded', 'true');
    expect(body).not.toHaveAttribute('inert');
    expect(body.textContent).toContain('energi terbarukan');
    // Tanpa fitur Berita & Pengumuman: tanpa "Lihat semua berita" (belum ada halaman /berita)
    expect(within(news).queryByRole('link', { name: /Lihat semua berita/ })).toBeNull();
  });

  it('pita navy: pengumuman (kartu bertanggal, label "Penting" merah lembut) + linimasa agenda dengan hari & penanda "Selesai"', () => {
    const container = demo();
    const announcements = section(container, 'announcements');
    const band = announcements.parentElement!.parentElement!.parentElement!;
    expect(band).toHaveAttribute('data-tpl-tone', 'inverse');
    expect(band.className).toContain('bg-(--nw-navy)');
    expect(announcements.querySelector('h2')!.textContent).toBe('Pengumuman sekolah');
    const cards = Array.from(announcements.querySelectorAll('li'));
    expect(cards).toHaveLength(5);
    expect(cards[0].className).toContain('ring-white/10');
    expect(Array.from(announcements.querySelectorAll('time')).map((t) => t.getAttribute('datetime'))).toEqual([
      '2026-10-23',
      '2026-10-21',
      '2026-10-19',
      '2026-10-14',
      '2026-10-12',
    ]);
    expect(cards[0].querySelector('time')!.textContent).toBe('23Okt 2026');
    const urgent = within(announcements).getByText('Penting');
    expect(urgent.className).toContain('text-[#9B1C1C]');
    expect(within(announcements).getByText('Kelas XII').className).toContain('bg-white/10');

    const agenda = section(container, 'agenda');
    expect(agenda.querySelector('h2')!.textContent).toBe('Agenda sekolah');
    expect(agenda.querySelector('.nw-timeline')).not.toBeNull();
    expect(agenda.querySelectorAll('ol > li')).toHaveLength(5);
    expect(agenda.textContent).toContain('Peringatan Hari Guru Nasional');
    expect(agenda.textContent).toContain('Rab, 25 Nov 2026');
    expect(agenda.textContent).toContain('12–14 Jul 2027');
    expect(agenda.textContent).toContain('Lapangan upacara');
    // Jarak atas di section sendiri (bukan di pembungkus pita): judul yang dituju "#agenda"/"#pengumuman" tidak
    // tertutup header lengket; pita hanya memberi jarak bawah
    for (const s of [announcements, agenda]) expect(s.className).toContain('pt-16 @3xl:pt-24 @5xl:pt-28');
    expect(band.className).toContain('pb-16');
    expect(band.className).not.toMatch(/(^|\s)py-/);
    // Linimasa berjarak tetap (tidak direntangkan setinggi kolom pengumuman); kolom agenda menempel di layar lebar
    expect(agenda.querySelector('ol')!.className).toContain('gap-8');
    expect(agenda.querySelector('ol')!.className).not.toMatch(/justify-between|h-full/);
    expect(agenda.innerHTML).not.toContain('max-height');
    expect(agenda.parentElement!.className).toContain('@5xl:sticky');
    expect(agenda.parentElement!.className).toContain('@5xl:self-start');
    cleanup();
    // Agenda yang sudah lewat → label "Selesai", pindah ke bawah
    const past = section(
      demo({
        agenda: {
          items: [
            { date: '2001-01-08', title: 'Kegiatan lalu', time: '07.00 WIB', place: 'Aula' },
            { date: '2099-01-08', title: 'Kegiatan nanti', time: '08.00 WIB', place: 'Aula' },
          ],
        },
      }),
      'agenda',
    );
    expect(Array.from(past.querySelectorAll('h3')).map((h) => h.textContent)).toEqual(['Kegiatan nanti', 'Kegiatan lalu']);
    expect(within(past).getAllByText('Selesai')).toHaveLength(1);
    expect(past.querySelectorAll('ol > li')[1].textContent).toContain('Selesai');
    cleanup();
    // Hanya pengumuman → selebar penuh, dua kolom kartu
    const solo = section(demo({ agenda: { enabled: false } }), 'announcements');
    expect(solo.querySelector('ul')!.className).toContain('@6xl:grid-cols-2');
  });

  it('ekstrakurikuler (ikon otomatis, jadwal, daftar lainnya), fasilitas bento berketerangan, guru berinisial', () => {
    const container = demo();
    const clubs = section(container, 'clubs');
    expect(clubs.querySelectorAll('article')).toHaveLength(8);
    expect(within(clubs).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Pramuka',
      'Paskibra',
      'PMR',
      'Sanggar Tari Tradisional Lampung',
      'KIR (Karya Ilmiah Remaja)',
      'Rohis & Kerohanian',
      'Bola Voli & Futsal',
      'English & Debate Club',
    ]);
    expect(clubs.querySelectorAll('article svg').length).toBeGreaterThanOrEqual(8);
    expect(clubs.textContent).toContain('Jumat, 14.00 WIB');
    expect(within(clubs).getByText('Ekstrakurikuler lainnya')).toBeInTheDocument();
    expect(within(clubs).getByText('Robotik & Coding').tagName).toBe('LI');

    const facilities = section(container, 'facilities');
    const figures = Array.from(facilities.querySelectorAll('figure'));
    expect(figures).toHaveLength(3);
    expect(figures.map((f) => f.querySelector('h3')!.textContent)).toEqual(['Laboratorium IPA', 'Perpustakaan & Pojok Baca', 'Lapangan Olahraga Serbaguna']);
    expect(figures[0].querySelector('figcaption')).toHaveAttribute('data-tpl-tone', 'inverse');
    // Nama fasilitas putih 22px (bukan teks besar) di atas foto: gradasi navy tetap ≥ 80% sampai 65% tinggi keterangan,
    // jadi judul selalu di zona pekat (≥ 8:1 bahkan di atas piksel putih); hanya 35% teratas yang memudar
    for (const figure of figures) {
      const caption = figure.querySelector('figcaption')!.className;
      expect(caption).toContain('from-(--nw-navy)/90');
      const via = /via-\(--nw-navy\)\/(\d+) via-(\d+)%/.exec(caption);
      expect(via, caption).not.toBeNull();
      expect(Number(via![1])).toBeGreaterThanOrEqual(80);
      expect(Number(via![2])).toBeGreaterThanOrEqual(65);
    }
    const tiles = Array.from(facilities.querySelectorAll(':scope ul > li'));
    expect(tiles[0].className).toContain('@5xl:col-span-7');
    expect(tiles[0].className).toContain('@5xl:row-span-2');
    expect(tiles.slice(3).map((li) => li.className.includes('@5xl:col-span-4'))).toEqual([true, true, true]);
    expect(tiles.slice(3).map((li) => li.querySelector('h3')!.textContent)).toEqual(['Laboratorium Komputer', 'Masjid & Ruang Ibadah', 'Sanggar Seni']);
    expect(tiles[3].textContent).toMatch(/^04/);

    const teachers = section(container, 'teachers');
    expect(within(teachers).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Sri Handayani, S.Pd.',
      'Muhammad Rizal, S.Pd., M.Si.',
      'Fitri Anggraini, S.Pd.',
      'I Made Suarsana, S.Pd.',
    ]);
    // Demo sengaja tanpa wajah: inisial di kotak navy (nama fiktif tidak ditempel pada foto stok)
    expect(teachers.querySelectorAll('img')).toHaveLength(0);
    // Kata terakhir nama + gelar dalam satu kotak sebaris: gelar tidak turun sendirian
    expect(Array.from(teachers.querySelectorAll('h3 > span.inline-block')).map((s) => s.textContent)).toEqual(['Handayani, S.Pd.', 'Rizal, S.Pd., M.Si.', 'Anggraini, S.Pd.', 'Suarsana, S.Pd.']);
    expect(Array.from(teachers.querySelectorAll('[data-tpl-tone="inverse"] span:first-child')).map((s) => s.textContent)).toEqual(['SH', 'MR', 'FA', 'IM']);
    cleanup();
    // Gelar di depan nama tidak masuk inisial
    const titled = section(demo({ teachers: { items: [{ name: 'Dra. Hj. Siti Aminah, M.Pd.', role: 'Guru' }] } }), 'teachers');
    expect(titled.querySelector('[data-tpl-tone="inverse"] span')!.textContent).toBe('SA');
  });

  it('SPMB: lencana, kartu portal provinsi (tab baru), kartu jalur + kuota, tabel jadwal, syarat dokumen, tautan ke formulir tanya', () => {
    const spmb = section(demo(), 'spmb');
    expect(spmb.querySelector('h2')!.textContent).toBe('Sistem Penerimaan Murid Baru 2027/2028');
    expect(spmb.textContent).toContain('Sekolah tidak menerima pendaftaran langsung.');
    expect(within(spmb).getByText('Tanpa biaya pendaftaran')).toBeInTheDocument();
    const portal = within(spmb).getByRole('link', { name: /Buka Portal SPMB Provinsi/ });
    expect(portal).toHaveAttribute('href', 'https://lampung.spmb.id/');
    expect(portal).toHaveAttribute('target', '_blank');
    expect(portal.getAttribute('rel')).toContain('noopener');
    const pathCards = Array.from(within(spmb).getByRole('heading', { level: 3, name: 'Jalur pendaftaran' }).nextElementSibling!.children);
    expect(pathCards.map((li) => li.querySelector('h3')!.textContent)).toEqual(['Domisili', 'Afirmasi', 'Prestasi', 'Mutasi']);
    expect(pathCards[0].textContent).toContain('Jalur 01');
    expect(pathCards[0].textContent).toContain('min. 30%');
    expect(pathCards[3].textContent).toContain('maks. 5%');
    expect(spmb.textContent).toContain('Persentase pasti mengikuti juknis');
    const table = within(spmb).getByRole('table', { name: 'Perkiraan jadwal, mengikuti juknis dinas' });
    expect(within(table).getAllByRole('columnheader').map((th) => th.textContent)).toEqual(['Waktu', 'Kegiatan', 'Keterangan']);
    expect(within(table).getAllByRole('row')).toHaveLength(6);
    expect(table.querySelector('tbody tr')!.textContent).toContain('April–Mei 2027');
    expect(within(spmb).getByRole('heading', { level: 3, name: 'Siapkan dokumen berikut; cek juknis terbaru' })).toBeInTheDocument();
    expect(spmb.textContent).toContain('Usia paling tinggi 21 tahun pada 1 Juli 2027');
    // "Tanya panitia SPMB" di kartu portal → fokus ke isian pertama formulir
    fireEvent.click(within(spmb).getByRole('button', { name: 'Tanya panitia SPMB' }));
    expect(within(spmb).getByLabelText('Nama')).toHaveFocus();
  });

  it('formulir tanya SPMB: galat per isian + fokus ke isian pertama, lalu pesan WhatsApp apa adanya; tidak ada data yang dikirim', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const spmb = section(demo(), 'spmb');
    const form = within(spmb).getByRole('form', { name: 'Tanya panitia SPMB' });
    expect(form.textContent).toContain('Formulir ini hanya untuk bertanya, bukan pendaftaran.');
    expect(form.textContent).toContain('data tidak disimpan di website dan tidak ada pembayaran daring');
    expect(form.querySelector('input[type="file"]')).toBeNull();
    const submit = within(form).getByRole('button', { name: /Susun pesan WhatsApp/ });
    expect(submit).toHaveAttribute('type', 'submit');
    fireEvent.click(submit);
    const name = within(form).getByLabelText('Nama');
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveFocus();
    expect(document.getElementById(name.getAttribute('aria-describedby')!)).toHaveTextContent('Tulis nama Anda.');
    expect(within(form).getByLabelText('Asal SMP/MTs')).toHaveAttribute('aria-invalid', 'true');
    expect(within(form).getByLabelText('Pertanyaan')).toHaveAttribute('aria-invalid', 'true');
    expect(INPUT).toContain('focus:ring-(--tpl-accent-ink)');
    expect(INPUT).toContain('text-[16px]');
    expect(INPUT).not.toMatch(/ring-\(--tpl-accent\)/);

    fireEvent.change(name, { target: { value: 'Alya Putri' } });
    expect(name).not.toHaveAttribute('aria-invalid');
    const role = within(form).getByRole('group', { name: 'Saya' });
    expect(within(role).getAllByRole('radio').map((r) => (r as HTMLInputElement).value)).toEqual(['Calon murid', 'Orang tua/wali']);
    fireEvent.click(within(role).getByLabelText('Orang tua/wali'));
    fireEvent.change(within(form).getByLabelText('Asal SMP/MTs'), { target: { value: 'SMP Negeri 1 Purbolinggo' } });
    const path = within(form).getByLabelText('Jalur yang diminati') as HTMLSelectElement;
    expect(Array.from(path.options).map((o) => o.value)).toEqual(['Domisili', 'Afirmasi', 'Prestasi', 'Mutasi', 'Belum tahu']);
    expect(path.value).toBe('Belum tahu');
    fireEvent.change(path, { target: { value: 'Prestasi' } });
    fireEvent.change(within(form).getByLabelText('Pertanyaan'), { target: { value: 'Apakah piagam lomba tari bisa dipakai?' } });
    fireEvent.click(submit);

    expect(within(spmb).queryByRole('form')).toBeNull();
    expect(within(spmb).getByRole('heading', { name: /Pesan siap dikirim/ })).toBeInTheDocument();
    const message = spmbMessage(SCHOOL, 'SPMB 2027/2028', {
      name: 'Alya Putri',
      role: 'Orang tua/wali',
      origin: 'SMP Negeri 1 Purbolinggo',
      path: 'Prestasi',
      question: 'Apakah piagam lomba tari bisa dipakai?',
    });
    expect(spmb.querySelector('pre')?.textContent).toBe(message);
    expect(within(spmb).getByRole('link', { name: 'Buka WhatsApp' }).getAttribute('href')).toBe(`https://wa.me/6281234567890?text=${encodeURIComponent(message)}`);
    expect(fetchSpy).not.toHaveBeenCalled();
    // "Tanya panitia SPMB" di kartu portal setelah pesan disusun (isian sudah tidak ada) → ke judul hasil, bukan diam
    act(() => (document.activeElement as HTMLElement | null)?.blur());
    fireEvent.click(within(spmb).getByRole('button', { name: 'Tanya panitia SPMB' }));
    expect(within(spmb).getByRole('heading', { name: /Pesan siap dikirim/ })).toHaveFocus();
    fireEvent.click(within(spmb).getByRole('button', { name: 'Ubah pertanyaan' }));
    expect(within(spmb).getByRole('form')).toBeInTheDocument();
    fetchSpy.mockRestore();
  });

  it('galeri bento berketerangan, cerita alumni (kutipan besar + kartu, inisial), FAQ tertutup, kontak + peta, footer navy', () => {
    const container = demo();
    const gallery = section(container, 'gallery');
    expect(Array.from(gallery.querySelectorAll('figcaption')).map((f) => f.textContent)).toEqual([
      'Petugas pengibar bendera saat upacara hari Senin',
      'Pengurus OSIS seusai latihan dasar kepemimpinan',
      'Guru dan tenaga kependidikan saat acara sekolah',
      'Praktik berkebun di lahan sekolah',
    ]);
    expect(gallery.querySelector('li')!.className).toContain('col-span-2');
    expect(gallery.querySelector('li')!.className).toContain('@5xl:row-span-3');

    const alumni = section(container, 'testimonials');
    expect(alumni.querySelectorAll('blockquote')).toHaveLength(4);
    expect(alumni.querySelector('blockquote')!.className).toContain('italic');
    expect(alumni.textContent).toContain('Salsabila Putri Ramadhani');
    expect(alumni.textContent).toContain('Lulusan 2025 · Farmasi');
    expect(alumni.querySelectorAll('img')).toHaveLength(0);
    // Tautan tracer study kosong → tidak tampil
    expect(within(alumni).queryByRole('link')).toBeNull();

    const faq = section(container, 'faq');
    const questions = within(faq).getAllByRole('button');
    expect(questions).toHaveLength(6);
    expect(questions.map((q) => q.getAttribute('aria-expanded'))).toEqual(['false', 'false', 'false', 'false', 'false', 'false']);
    fireEvent.click(questions[3]);
    expect(questions[3]).toHaveAttribute('aria-expanded', 'true');
    const answer = document.getElementById(questions[3].getAttribute('aria-controls')!)!;
    expect(answer).toHaveAttribute('role', 'region');
    expect(answer).not.toHaveAttribute('inert');
    expect(answer.textContent).toContain('paket mata pelajaran');
    fireEvent.click(questions[1]);
    expect(questions[3]).toHaveAttribute('aria-expanded', 'false');
    expect(questions[1]).toHaveAttribute('aria-expanded', 'true');
    expect(within(faq).getByRole('heading', { level: 3, name: 'Masih ada pertanyaan?' })).toBeInTheDocument();
    // Label netral (WhatsApp atau Kontak); ikon WhatsApp hanya bila tujuannya wa.me
    const help = within(faq).getByRole('link', { name: 'Ajukan pertanyaan' });
    expect(wa(help)).toContain(`Halo Panitia SPMB ${SCHOOL}, saya ingin bertanya.`);
    expect(help.querySelector('svg')).not.toBeNull();

    const contact = section(container, 'contact');
    const iframe = contact.querySelector('iframe')!;
    expect(iframe).toHaveAttribute('title', `Peta lokasi ${SCHOOL}`);
    expect(iframe).toHaveAttribute('loading', 'lazy');
    expect(within(contact).getByRole('link', { name: /Buka di Google Maps/ })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/search/?api=1&query=Purbolinggo%2C%20Lampung%20Timur%2C%20Lampung',
    );
    expect(within(contact).getByRole('link', { name: /Telepon/ })).toHaveAttribute('href', 'tel:+6281234567890');
    expect(within(contact).getByRole('link', { name: /Email/ })).toHaveAttribute('href', 'mailto:info@sman1purbolinggo.example');
    expect(wa(within(contact).getByRole('link', { name: /Hubungi lewat WhatsApp/ }))).toContain(`Halo ${SCHOOL}, saya ingin bertanya tentang sekolah.`);
    expect(contact.textContent).toContain('Senin–Jumat 07.00–15.30 WIB');
    expect(contact.textContent).toContain('(alamat contoh)');

    const footer = container.querySelector('footer')!;
    // Pita selebar layar: tanpa jarak tepi / sudut membulat di pita; isinya di dalam CONTAINER
    expect(footer.className).not.toMatch(/rounded|mx-|max-w-/);
    expect(footer.className).toContain('bg-(--nw-navy)');
    expect(footer).toHaveAttribute('data-tpl-tone', 'inverse');
    expect(footer).toHaveAttribute('id', 'footer');
    expect(footer.firstElementChild!.className).toContain('max-w-[1680px]');
    // Nama sekolah sebagai wordmark serif besar (hiasan)
    const wordmark = Array.from(footer.querySelectorAll('p[aria-hidden="true"]')).find((p) => p.textContent === SCHOOL)!;
    expect(wordmark.className).toContain('font-normal');
    expect(wordmark.className).toContain('clamp(');
    expect(linkList(within(footer).getByRole('navigation', { name: 'Tautan footer' }))).toEqual([
      'Profil|#tentang',
      'Akademik|#programs',
      'Prestasi|#achievements',
      'Berita|#berita',
      'Agenda|#agenda',
      'Kontak|#kontak',
    ]);
    // Tautan cepat dari CMS: anchor Indonesia diterjemahkan ke section yang tampil
    for (const [label, href] of [
      ['Informasi SPMB', '#spmb'],
      ['Pengumuman', '#pengumuman'],
      ['Tanya jawab', '#faq'],
    ])
      expect(within(footer).getByRole('link', { name: label }), label).toHaveAttribute('href', href);
    // Layanan sekolah (E-Learning, PPID, …) tanpa alamat di demo: bukan tautan mati, tombol yang membuka catatan CMS
    const services = ['E-Learning', 'PPID (informasi publik)', 'Legalisir ijazah', 'Tracer study alumni', 'Layanan pengaduan'];
    for (const label of services) expect(within(footer).queryByRole('link', { name: label }), label).toBeNull();
    const ppid = within(footer).getByRole('button', { name: 'PPID (informasi publik)' });
    expect(ppid).toHaveAttribute('aria-expanded', 'false');
    expect(ppid.className).toContain('min-h-11');
    const note = document.getElementById(ppid.getAttribute('aria-controls')!)!;
    expect(note).not.toBeVisible();
    fireEvent.click(ppid);
    expect(ppid).toHaveAttribute('aria-expanded', 'true');
    expect(note).toBeVisible();
    expect(note.textContent).toContain('PPID (informasi publik): Alamat layanan ini diisi sekolah lewat CMS.');
    expect(within(note).getByRole('link', { name: 'Lihat kontak' })).toHaveAttribute('href', '#kontak');
    // Tombol lain berpindah catatan; tombol yang sama menutupnya
    fireEvent.click(within(footer).getByRole('button', { name: 'E-Learning' }));
    expect(ppid).toHaveAttribute('aria-expanded', 'false');
    expect(note.textContent).toMatch(/^E-Learning: /);
    fireEvent.click(within(footer).getByRole('button', { name: 'E-Learning' }));
    expect(note).not.toBeVisible();
    expect(within(footer).getByRole('link', { name: 'Lihat informasi SPMB' })).toHaveAttribute('href', '#spmb');
    expect(within(footer).getByRole('link', { name: '0812-3456-7890' })).toHaveAttribute('href', 'tel:+6281234567890');
    expect(footer.textContent).toContain(`© ${new Date().getFullYear()} ${SCHOOL}`);
    expect(footer.textContent).toContain('Situs demo template.');
    cleanup();
    // Media sosial dari CMS lewat safeUrl: tautan berbahaya dibuang
    const social = demo({ footer: { instagram: 'https://instagram.com/sman1purbolinggo', facebook: 'javascript:alert(1)', youtube: 'https://youtube.com/@sman1', tiktok: '', linkedin: '' } }).querySelector('footer')!;
    expect(within(social).getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://instagram.com/sman1purbolinggo');
    expect(within(social).getByRole('link', { name: 'YouTube' })).toHaveAttribute('href', 'https://youtube.com/@sman1');
    expect(within(social).queryByRole('link', { name: 'Facebook' })).toBeNull();
    cleanup();
    // Anchor Indonesia lain diterjemahkan; anchor ke section tersembunyi dibuang; tanpa catatan CMS tautan tanpa alamat
    // disembunyikan (bukan tombol tanpa isi)
    const custom = demo({
      agenda: { enabled: false },
      footer: {
        links_note: '',
        links: [
          { label: 'Ekstrakurikuler', url: '#ekstrakurikuler' },
          { label: 'Lokasi & kontak', url: '#kontak' },
          { label: 'Agenda sekolah', url: '#agenda' },
          { label: 'PPID', url: '' },
          { label: 'E-Learning', url: 'https://elearning.sekolah.test' },
        ],
      },
    }).querySelector('footer')!;
    expect(within(custom).getByRole('link', { name: 'Ekstrakurikuler' })).toHaveAttribute('href', '#clubs');
    expect(within(custom).getByRole('link', { name: 'Lokasi & kontak' })).toHaveAttribute('href', '#kontak');
    expect(within(custom).getByRole('link', { name: 'E-Learning' })).toHaveAttribute('href', 'https://elearning.sekolah.test');
    expect(within(custom).queryByText('Agenda sekolah')).toBeNull();
    expect(within(custom).queryByText('PPID')).toBeNull();
    expect(within(custom).queryByRole('button', { name: /PPID|E-Learning/ })).toBeNull();
  });

  it('datar: tidak ada kelas shadow di template (kecuali tombol melayang Shell); sumber tanpa shadow-', () => {
    const container = demo();
    const shadows = Array.from(container.querySelectorAll('[class*="shadow"]')).filter(
      (el) => !el.closest('[aria-label="Chat WhatsApp"]') && !/Chat WhatsApp|Kembali ke atas/.test(el.getAttribute('aria-label') ?? ''),
    );
    expect(shadows.map((el) => el.className)).toEqual([]);
    const source = [...SOURCES.map((f) => `${f}.tsx`), 'styles.ts', 'model.ts', 'hooks.ts', 'icons.ts', 'nawasena.css']
      .map((f) => readFileSync(resolve(ROOT, `src/templates/nawasena/${f}`), 'utf8'))
      .join('\n');
    expect(source).not.toMatch(/\bshadow-|drop-shadow|box-shadow/);
    // Tanpa framer-motion, tanpa impor dari folder template lain
    expect(source).not.toMatch(/framer-motion|from '\.\.\/(?!shared\/|kit\/|types')/);
  });
});

describe('Nawasena: berita & pengumuman dari tulisan (site_posts)', () => {
  it('beranda (fitur aktif): newsroom bertautan + filter kategori di kepala section, papan pengumuman navy, strip pengumuman bertautan', () => {
    const container = withPosts();
    expect(def.features?.posts).toBe(true);
    const news = section(container, 'news');
    expect(news).toHaveAttribute('data-pro-section', 'news');
    // Label bernomor & judul Nawasena tetap: satu H2
    expect(news.querySelectorAll('h2')).toHaveLength(1);
    expect(news.querySelector('h2')!.textContent).toBe('Kabar terbaru dari sekolah');
    expect(news.textContent).toContain('/05');
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
    // Rel filter di baris sendiri selebar penuh di bawah judul (bukan di kolom kanan kepala section yang sempit):
    // menggulir di dalam lebarnya sendiri, tidak melebarkan halaman HP
    expect(filters.parentElement!.className).toContain('mt-8');
    expect(filters.parentElement!.className).toContain('min-w-0');
    expect(filters.parentElement!.previousElementSibling!.contains(news.querySelector('h2'))).toBe(true);
    fireEvent.click(within(filters).getByRole('button', { name: 'Kegiatan' }));
    expect(within(filters).getByRole('button', { name: 'Kegiatan' })).toHaveAttribute('aria-pressed', 'true');
    expect(Array.from(news.querySelectorAll('article h3')).map((h) => h.textContent)).toEqual([NEWS[1].title]);
    expect(within(news).getByRole('status')).toHaveTextContent('1 berita kategori Kegiatan');
    expect(within(news).getByRole('link', { name: /Lihat semua berita/ })).toHaveAttribute('href', '/berita');

    const announcements = section(container, 'announcements');
    expect(announcements).toHaveAttribute('data-pro-section', 'announcements');
    expect(announcements.querySelectorAll('h2')).toHaveLength(1);
    expect(announcements.closest('[data-tpl-tone="inverse"]')!.className).toContain('bg-(--nw-navy)');
    expect(within(announcements).getByRole('link', { name: ANNOUNCEMENTS[0].title }).closest('article')!.className).toContain('relative');
    expect(announcements.textContent).toContain('Lihat detail');
    expect(within(announcements).getByText('Penting').closest('[data-pro-badge]')!.className).toContain('text-[#9B1C1C]');
    expect(within(announcements).getByRole('link', { name: /Lihat semua pengumuman/ })).toHaveAttribute('href', '/pengumuman');
    // Agenda tetap dari konten CMS
    expect(section(container, 'agenda').querySelectorAll('ol > li')).toHaveLength(5);

    // Strip di bawah hero: pengumuman terbaru dari tulisan, bertautan ke halamannya; "Lihat semua" → /pengumuman
    const hero = section(container, 'hero');
    expect(within(hero).getByRole('link', { name: ANNOUNCEMENTS[0].title })).toHaveAttribute('href', '/pengumuman/jadwal-ujian-akhir-semester');
    for (const a of within(hero).getAllByRole('link', { name: 'Lihat semua pengumuman' })) expect(a).toHaveAttribute('href', '/pengumuman');
  });

  it('/pengumuman: header navy pekat tanpa hero, footer bukan section, tautan section menuju "/#anchor"', () => {
    const container = withPosts({ route: { kind: 'list', postKind: 'pengumuman' } });
    const header = container.querySelector('header')!;
    expect(header.className).not.toContain('h-0');
    expect(header.firstElementChild!.className).toContain('bg-(--nw-navy)');
    expect(container.querySelector('[data-hero-layout]')).toBeNull();
    expect(sectionKeys(container)).toEqual([]);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelector('h1')!.className).toContain('font-normal');
    expect(within(header).getByRole('link', { name: 'SPMB 2027' })).toHaveAttribute('href', '/#spmb');
    const footer = Array.from(container.querySelectorAll('footer')).pop()!;
    expect(footer.className).toContain('bg-(--nw-navy)');
    expect(footer.hasAttribute('id')).toBe(false);
    expect(footer.hasAttribute('data-tpl-section')).toBe(false);
    expect(within(footer).getByRole('link', { name: 'Lihat informasi SPMB' })).toHaveAttribute('href', '/#spmb');
    expect(linkList(within(footer).getByRole('navigation', { name: 'Tautan footer' }))).toContain('Berita|/#berita');
    // Tema Nawasena: label pengumuman mendesak merah lembut
    expect(within(container.querySelector('main')!).getByText('Penting').closest('span[class*="rounded"]')!.className).toContain('text-[#B42318]');
  });

  it('/berita/{slug}: satu H1, chip kategori warna tema Nawasena, kembali ke daftar', () => {
    const container = withPosts({ route: { kind: 'post', postKind: 'berita', slug: POST.slug }, post: POST });
    const main = container.querySelector('main')!;
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelector('h1')).toHaveTextContent(POST.title);
    expect(within(main).getByText('Prestasi').closest('span[class*="rounded"]')!.className).toContain('bg-(--nw-tint)');
    expect(within(main).getByRole('link', { name: /Semua berita/ })).toHaveAttribute('href', '/berita');
  });
});

describe('Nawasena: warna tema bisa diganti', () => {
  it('biru bawaan → --tpl-accent & navy #0B1736; hijau dari CMS → semua turunan ikut; warna terang → teks tombol gelap', () => {
    const base = demo();
    expect(rootStyle(base, '--tpl-accent')).toBe('#2563eb');
    expect(rootStyle(base, '--tpl-on-accent')).toBe('#ffffff');
    expect(rootStyle(base, '--nw-navy')).toBe('#0b1736');
    const baseVars = ['--nw-navy', '--nw-bright', '--nw-ink', '--nw-tint'].map((v) => rootStyle(base, v));
    cleanup();

    const green = demo({ brand: { accent_color: '#047857' } });
    expect(rootStyle(green, '--tpl-accent')).toBe('#047857');
    const vars = nawasenaVars('#047857') as Record<string, string>;
    ['--nw-navy', '--nw-bright', '--nw-ink', '--nw-tint'].forEach((v, i) => {
      expect(rootStyle(green, v), v).toBe(vars[v]);
      expect(rootStyle(green, v), v).not.toBe(baseVars[i]);
    });
    cleanup();

    const yellow = demo({ brand: { accent_color: '#FACC15' } });
    expect(rootStyle(yellow, '--tpl-on-accent')).toBe('#121620');
    const submit = section(yellow, 'spmb').querySelector('button[type="submit"]')!;
    expect(submit.className).toContain('text-(--tpl-on-accent)');
    expect(submit.className).toContain('bg-(--tpl-accent)');
  });
});

describe('Nawasena: SEO situs pembeli', () => {
  it('judul tab & meta description terbaca sebagai website SMA negeri', () => {
    expect(siteTitle('nawasena', null)).toBe('SMA Negeri 1 Purbolinggo — SMA Negeri di Lampung Timur');
    expect(siteTitle('nawasena', null).length).toBeLessThanOrEqual(60);
    const restore = applySiteHead('nawasena', null);
    expect(document.title).toBe('SMA Negeri 1 Purbolinggo — SMA Negeri di Lampung Timur');
    const description = document.head.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
    expect(description).toMatch(/^Sekolah menengah atas negeri di Purbolinggo, Lampung Timur\. /);
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(200);
    expect(document.head.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#2563EB');
    restore();
  });

  it('satu H1, tiap section diawali tepat satu H2 (pita angka juga), H3 hanya di bawah H2, tanpa h4–h6', () => {
    const container = demo();
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelectorAll('h4, h5, h6')).toHaveLength(0);
    for (const key of ORDER.filter((k) => k !== 'hero')) {
      const levels = Array.from(section(container, key).querySelectorAll('h1, h2, h3')).map((h) => h.tagName);
      expect(levels[0], key).toBe('H2');
      expect(levels.filter((l) => l === 'H2'), key).toHaveLength(1);
    }
    expect(section(container, 'hero').querySelector('h2, h3')).toBeNull();
    expect(container.querySelector('footer')!.querySelector('h1, h2, h3')).toBeNull();
  });

  it('gambar: alt deskriptif berbahasa Indonesia, width/height, srcset & sizes; hanya foto slide 1 yang eager', () => {
    const container = demo();
    const imgs = Array.from(container.querySelectorAll('img'));
    expect(imgs.length).toBeGreaterThan(14);
    for (const img of imgs) {
      const src = img.getAttribute('src') ?? '';
      expect(img.hasAttribute('alt'), src).toBe(true);
      if (src.endsWith('.svg')) {
        expect(src, 'hanya logo demo').toBe('/assets/templates/logos/tut-wuri-handayani.svg');
        // Header, footer, dan papan monogram sambutan (logo di kotak putih, sambutan tanpa foto)
        expect(img.closest('header, footer, [data-nw-plate]'), src).not.toBeNull();
        expect(img.getAttribute('alt'), 'logo dekoratif: nama sekolah tertulis di sampingnya').toBe('');
        continue;
      }
      expect(Number(img.getAttribute('width')), src).toBeGreaterThan(0);
      expect(Number(img.getAttribute('height')), src).toBeGreaterThan(0);
      expect(img.getAttribute('srcset'), src).toMatch(/ (800|240)w, /);
      expect(img.getAttribute('sizes'), src).toBeTruthy();
      const alt = img.getAttribute('alt')!;
      if (alt !== '') expect(alt.split(' ').length, src).toBeGreaterThanOrEqual(5);
    }
    // Foto beralt kosong hanya foto tab akademik yang sedang tersembunyi (aria-hidden)
    const decorative = imgs.filter((img) => img.getAttribute('alt') === '' && !img.getAttribute('src')?.endsWith('.svg'));
    expect(decorative).toHaveLength(2);
    for (const img of decorative) {
      expect(img.closest('[data-tpl-section="programs"]')).not.toBeNull();
      expect(img.closest('[aria-hidden="true"]')).not.toBeNull();
    }
    const eager = imgs.filter((img) => img.getAttribute('loading') !== 'lazy' && !img.getAttribute('src')?.endsWith('.svg'));
    expect(eager.map((img) => img.getAttribute('src'))).toEqual(['/assets/templates/photos/nawasena-hero-1-1920.webp']);
  });

  it('tautan asli untuk navigasi, tombol hanya untuk aksi (kecuali kirim formulir); SVG dekoratif tersembunyi; target sentuh 44px', () => {
    const container = demo();
    for (const a of container.querySelectorAll('a')) expect(a.getAttribute('href'), a.textContent ?? '').toMatch(/^(#[a-z]|https:\/\/|mailto:|tel:)/);
    for (const button of container.querySelectorAll('button')) {
      expect(button.getAttribute('type'), button.textContent ?? '').toBe(button.closest('form') && /WhatsApp/.test(button.textContent ?? '') ? 'submit' : 'button');
    }
    for (const svg of container.querySelectorAll('svg')) expect(svg.closest('[aria-hidden="true"], [aria-hidden=""]') ?? svg.getAttribute('aria-hidden'), svg.outerHTML.slice(0, 60)).toBeTruthy();
    // Tombol ikon di template: minimal 44px (h-11 w-11)
    for (const label of ['Slide sebelumnya', 'Slide berikutnya', 'Jeda slide otomatis', 'Jeda pengumuman berjalan', 'Buka menu'])
      expect(within(container).getByRole('button', { name: label }).className, label).toContain('h-11 w-11');
  });
});

describe('Nawasena: konten opsional kosong', () => {
  it('hero tanpa foto → latar navy cadangan, tanpa slider & tanpa kontrol slide', () => {
    const hero = section(demo({ hero: { image: '', slides: [] } }), 'hero');
    expect(hero.querySelector('.nw-slide')).toBeNull();
    expect(hero.querySelector('.nw-hero-fallback')).not.toBeNull();
    expect(within(hero).queryByRole('group', { name: 'Kontrol slide' })).toBeNull();
    expect(hero.hasAttribute('aria-roledescription')).toBe(false);
    expect(hero.querySelector('[data-nw-slide-status]')).toBeNull();
    expect(hero.innerHTML).not.toContain('pb-[104px]');
    expect(hero.querySelector('h1')!.textContent).toBe(SLIDE_TITLES[0]);
    cleanup();
    // Satu foto saja → tanpa rel nomor slide, foto tetap LCP
    const single = section(demo({ hero: { slides: [] } }), 'hero');
    expect(within(single).queryByRole('group', { name: 'Kontrol slide' })).toBeNull();
    expect(single.querySelectorAll('img[fetchpriority="high"]')).toHaveLength(1);
  });

  it('hero dimatikan → header navy pekat (bukan h-0), pita angka jadi section pertama', () => {
    const container = demo({ hero: { enabled: false } });
    const header = container.querySelector('header')!;
    expect(header.className).not.toContain('h-0');
    expect(header.firstElementChild!.className).toContain('bg-(--nw-navy)');
    expect(sectionKeys(container)[0]).toBe('stats');
  });

  it('pita angka 4 item → 4 kolom; sambutan berfoto (papan nama / tanpa papan) & tanpa foto + tanpa nama → selebar penuh; fasilitas tanpa foto → kartu teks saja', () => {
    const photo = '/assets/templates/photos/nawasena-profil-1200.webp';
    const container = demo({
      stats: { items: [{ value: '1', label: 'A' }, { value: '2', label: 'B' }, { value: '3', label: 'C' }, { value: '4', label: 'D' }] },
      welcome: { name: '', role: '', photo },
      facilities: { items: [{ name: 'Kantin sehat', caption: 'Menu bergizi.', image: '' }, { name: 'UKS', caption: '', image: '' }] },
    });
    expect(section(container, 'stats').querySelector('dl')!.className).toContain('@6xl:grid-cols-4');
    const welcome = section(container, 'welcome');
    // Foto tanpa nama & jabatan → foto saja, sudut membulat penuh
    expect(welcome.querySelector('figcaption')).toBeNull();
    expect(welcome.querySelector('[data-nw-plate]')).toBeNull();
    expect(welcome.querySelector('figure img')!.parentElement!.className + welcome.querySelector('figure > *')!.className).toContain('rounded-[8px]');
    cleanup();
    // Foto + nama → papan nama navy menempel di bawah foto (figcaption)
    const named = section(demo({ welcome: { photo } }), 'welcome');
    expect(named.querySelector('figcaption')).toHaveAttribute('data-tpl-tone', 'inverse');
    expect(named.querySelector('figcaption')!.textContent).toContain('Dra. Ratna Kurniasih, M.Pd.');
    expect(named.querySelector('[data-nw-plate]')).toBeNull();
    cleanup();
    // Tanpa foto, nama, dan jabatan → tanpa kolom kiri: judul & isi selebar penuh
    const bare = section(demo({ welcome: { name: '', role: '', photo: '' } }), 'welcome');
    expect(bare.querySelector('figure, [data-nw-plate], img')).toBeNull();
    expect(bare.querySelector('blockquote')!.parentElement!.className).toContain('@5xl:col-span-12');
    cleanup();
    const facilities = section(
      demo({ facilities: { items: [{ name: 'Kantin sehat', caption: 'Menu bergizi.', image: '' }, { name: 'UKS', caption: '', image: '' }] } }),
      'facilities',
    );
    expect(facilities.querySelector('figure')).toBeNull();
    expect(Array.from(facilities.querySelectorAll('h3')).map((h) => h.textContent)).toEqual(['Kantin sehat', 'UKS']);
    expect(Array.from(facilities.querySelectorAll(':scope ul > li')).map((li) => li.className.includes('@5xl:col-span-6'))).toEqual([true, true]);
  });

  it('pengumuman & agenda keduanya kosong → pita navy tidak dirender; berita disembunyikan → nomor bergeser', () => {
    const container = demo({ announcements: { items: [] }, agenda: { enabled: false }, news: { enabled: false } });
    expect(sectionKeys(container)).not.toContain('announcements');
    expect(sectionKeys(container)).not.toContain('agenda');
    expect(section(container, 'clubs').textContent).toContain('/05');
    // Strip pengumuman ikut hilang
    expect(within(section(container, 'hero')).queryByRole('list', { name: 'Pengumuman terbaru' })).toBeNull();
  });

  it('tanpa WhatsApp: formulir tanya diganti tombol ke Kontak, bantuan FAQ ke Kontak, tidak ada tautan wa.me', () => {
    const container = demo({ contact: { whatsapp: '' } });
    const spmb = section(container, 'spmb');
    expect(within(spmb).queryByRole('form')).toBeNull();
    expect(within(spmb).getByRole('link', { name: 'Hubungi panitia' })).toHaveAttribute('href', '#kontak');
    expect(within(spmb).queryByRole('button', { name: 'Tanya panitia SPMB' })).toBeNull();
    // Bantuan FAQ ke Kontak dengan label netral, tanpa ikon WhatsApp (tidak menjanjikan WhatsApp)
    const help = within(section(container, 'faq')).getByRole('link', { name: 'Ajukan pertanyaan' });
    expect(help).toHaveAttribute('href', '#kontak');
    expect(help.querySelector('svg')).toBeNull();
    expect(container.textContent).not.toContain('Tanya lewat WhatsApp');
    expect(within(section(container, 'contact')).queryByRole('link', { name: /Hubungi lewat WhatsApp/ })).toBeNull();
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
  });

  it('nomor WhatsApp panitia SPMB terpisah dipakai formulir tanya & bantuan FAQ', () => {
    const container = demo({ spmb: { whatsapp: '085700001111' } });
    const spmb = section(container, 'spmb');
    const form = within(spmb).getByRole('form');
    fireEvent.change(within(form).getByLabelText('Nama'), { target: { value: 'Bima Sakti' } });
    fireEvent.change(within(form).getByLabelText('Asal SMP/MTs'), { target: { value: 'MTs Negeri 1 Lampung Timur' } });
    fireEvent.change(within(form).getByLabelText('Pertanyaan'), { target: { value: 'Kapan juknis SPMB terbit?' } });
    act(() => {
      fireEvent.submit(form);
    });
    expect(within(spmb).getByRole('link', { name: 'Buka WhatsApp' }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/6285700001111\?text=/);
    expect(within(section(container, 'faq')).getByRole('link', { name: 'Ajukan pertanyaan' }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/6285700001111\?text=/);
    // Tombol WhatsApp di Kontak tetap ke nomor sekolah
    expect(within(section(container, 'contact')).getByRole('link', { name: /Hubungi lewat WhatsApp/ }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/6281234567890\?text=/);
  });

  it('portal SPMB kosong → tanpa kartu portal (tanpa label "Portal resmi" yatim); SPMB dimatikan → tombol hero & header ke WhatsApp/Kontak', () => {
    const withPortal = section(demo(), 'spmb');
    expect(within(withPortal).getByText('Portal resmi')).toBeInTheDocument();
    cleanup();
    // Label kartu portal dari CMS
    const custom = section(demo({ spmb: { portal_title: 'Pendaftaran daring' } }), 'spmb');
    expect(within(custom).getByText('Pendaftaran daring')).toBeInTheDocument();
    expect(within(custom).queryByText('Portal resmi')).toBeNull();
    cleanup();
    const noPortal = section(demo({ spmb: { portal_url: '' } }), 'spmb');
    expect(within(noPortal).queryByRole('link', { name: /Portal SPMB/ })).toBeNull();
    expect(within(noPortal).queryByText('Portal resmi')).toBeNull();
    expect(within(noPortal).queryByRole('button', { name: 'Tanya panitia SPMB' })).toBeNull();
    // Formulir tanya tetap ada dengan judulnya sendiri
    expect(within(noPortal).getByRole('form', { name: 'Tanya panitia SPMB' })).toBeInTheDocument();
    cleanup();
    const container = demo({ spmb: { enabled: false } });
    expect(sectionKeys(container)).not.toContain('spmb');
    expect(within(section(container, 'hero')).getByRole('link', { name: 'Informasi SPMB' }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/6281234567890/);
  });

  it('kontak menyala tetapi kosong → section tidak dirender DAN tidak ada menu "Kontak" atau tautan "#kontak" yang mati', () => {
    const empty = { title: '', address: '', phone: '', email: '', hours: '', maps_query: '', maps_url: '', whatsapp: '' };
    const content = resolveContent(def, { contact: empty, spmb: { enabled: false } });
    expect(readNawasena(content).shown('contact')).toBe(false);
    expect(readNawasena(content).contactAction).toBeNull();
    expect(navItems(content).map((i) => i.key)).not.toContain('contact');
    const container = demo({ contact: empty, spmb: { enabled: false } });
    expect(sectionKeys(container)).not.toContain('contact');
    expect(container.querySelector('a[href="#kontak"]')).toBeNull();
    cleanup();
    // Hanya WhatsApp → section tetap tampil (judul bawaan "Kontak" + tombol WhatsApp)
    const waOnly = demo({ contact: { ...empty, whatsapp: '081234567890' } });
    expect(within(section(waOnly, 'contact')).getByRole('heading', { level: 2, name: 'Kontak' })).toBeInTheDocument();
  });

  it('teks kecil yang tampil bisa diubah di CMS: label rencana studi, judul berita lainnya, tombol WhatsApp kontak; panggung foto akademik tanpa foto → simbol samar', () => {
    const container = demo({
      programs: {
        fit_label: 'Cocok untuk',
        items: [
          { name: 'Sains', fit: 'Kedokteran.', image: '/assets/templates/photos/nawasena-program-sains-1200.webp' },
          { name: 'Bahasa', fit: 'Sastra.', image: '' },
        ],
      },
      news: { more_title: 'Kabar lain' },
      contact: { whatsapp_label: 'Chat tata usaha' },
    });
    const programs = section(container, 'programs');
    expect(programs.textContent).toContain('Cocok untuk');
    expect(programs.textContent).not.toContain('Rencana studi');
    const stage = programs.querySelector('.aspect-\\[4\\/3\\]')!;
    const mark = stage.querySelector('svg')!.closest('div')!;
    expect(mark.className).toContain('opacity-0');
    fireEvent.click(within(programs).getByRole('tab', { name: /Bahasa/ }));
    expect(mark.className).toContain('opacity-100');
    expect(within(section(container, 'news')).getByText('Kabar lain')).toBeInTheDocument();
    expect(within(section(container, 'contact')).getByRole('link', { name: 'Chat tata usaha' }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\//);
    // Skema: field-field itu ada & berbatas
    const maxOf = (sectionKey: string, key: string) =>
      (def.sections.find((s) => s.key === sectionKey)!.fields.find((f) => f.key === key) as { maxLength?: number } | undefined)?.maxLength;
    expect(maxOf('programs', 'fit_label')).toBe(24);
    expect(maxOf('news', 'more_title')).toBe(30);
    expect(maxOf('contact', 'whatsapp_label')).toBe(30);
    expect(maxOf('spmb', 'portal_title')).toBe(40);
  });
});

describe('Nawasena: pratinjau CMS', () => {
  it('pratinjau diam (gerak mati bila Component dirender langsung): slide & strip tidak berjalan, tanpa tautan wa.me / Google Maps terbuka', () => {
    const { container } = render(<def.Component content={resolveContent(def, null)} preview />);
    expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'off');
    expect(container.querySelector('.nw-progress')).toHaveAttribute('data-run', 'false');
    expect(container.querySelector('[aria-label="Jeda slide otomatis"]')).toBeNull();
    expect(container.querySelector('[aria-label="Jeda pengumuman berjalan"]')).toBeNull();
    expect(within(container).queryByRole('list', { name: 'Pengumuman terbaru' })).toBeNull();
    // Strip pengumuman diam: satu baris pengumuman terbaru
    expect(within(section(container, 'hero')).getByText('Asesmen sumatif akhir semester ganjil: 30 November–5 Desember 2026')).toBeInTheDocument();
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    expect(container.querySelector('a[href^="https://www.google.com/maps"]')).toBeNull();
    fireEvent.click(within(container).getByRole('button', { name: /^Slide 3 dari 4/ }));
    expect(container.querySelector('h1')!.textContent).toBe(SLIDE_TITLES[2]);
  });
});

describe('Nawasena: editor CMS', () => {
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

  it('warna tema memakai field warna CMS (pilihan cepat + hex sendiri), bantuan menyebut biru bawaan & navy otomatis', () => {
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
    expect(within(container).getByRole('button', { name: 'Pakai warna #047857' })).toBeInTheDocument();
    expect(container.querySelector('input[type="color"]')).not.toBeNull();
    const help = ('help' in color && color.help) || '';
    expect(help).toContain('#2563EB');
    expect(help).toContain('"Pakai bawaan"');
    expect(help).toMatch(/navy .*otomatis/);
  });
});

describe('Nawasena: data katalog', () => {
  const sql = (file: string) => readFileSync(resolve(ROOT, file), 'utf8');

  it.each(['database/seed.templates.sql', 'database/migrations/2026-10-27_039_nawasena_template.sql'])(
    '%s: baris nawasena dengan template_code, kategori, harga, dan pratinjau tangkapan layar .webp',
    (file) => {
      const text = sql(file);
      expect(text).toContain("'nawasena'");
      expect(text).toContain("'Sekolah & Pendidikan'");
      expect(text).toContain('1690000.00');
      expect(text).toContain("'/assets/templates/nawasena-preview.webp'");
      expect(text).toContain('\'["/assets/templates/nawasena-1.webp","/assets/templates/nawasena-2.webp"]\'');
      expect(text).toMatch(/menyusun pesan WhatsApp untuk panitia; tidak ada penyimpanan data pendaftar atau pembayaran online/);
      expect(text).toMatch(/pendaftaran tetap di portal provinsi/);
      // Domain tidak termasuk harga template (sama dengan 035–037 & 040)
      const row = text.slice(text.indexOf("'nawasena'"));
      expect(row).toContain('Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)');
      expect(row.slice(0, row.indexOf('1690000.00'))).not.toContain('"Domain sendiri dan sertifikat SSL (HTTPS)"');
      // Tidak menjanjikan "semua teks" bisa diubah: beberapa label kecil (formulir, kontak, judul kolom footer) tetap
      // (sama dengan 035–037 & 040)
      expect(row).toMatch(/label formulir, label kontak, judul kolom footer, dan beberapa label kecil tetap berbahasa Indonesia/);
      expect(row.slice(0, row.indexOf('1690000.00'))).not.toContain('Semua teks, foto, jadwal');
    },
  );

  it('migrasi 039 aman diulang (INSERT IGNORE + UPDATE berdasarkan slug, tanpa DELETE) dan tercatat di schema_migrations', () => {
    const raw = sql('database/migrations/2026-10-27_039_nawasena_template.sql');
    expect(raw).toMatch(/Domain tidak termasuk harga template/);
    const text = raw.replace(/^--.*$/gm, '');
    expect(text).toMatch(/INSERT IGNORE INTO templates/);
    expect(text).toMatch(/WHERE slug = 'nawasena';/);
    expect(text).toMatch(/sort_order\s+= 22/);
    expect(text).toMatch(/status\s+= 'published'/);
    expect(text).toMatch(/price\s+= 1690000\.00/);
    expect(text).not.toMatch(/\bDELETE\b/);
    expect(text).toContain("VALUES ('2026-10-27_039', 'templates: katalog Nawasena')");
  });

  it('gambar pratinjau katalog ada di public/, 1600×1000 (VP8/VP8X), dan ringan', () => {
    for (const name of ['nawasena-preview', 'nawasena-1', 'nawasena-2']) {
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

describe('Nawasena: konten aneh', () => {
  it('angka, null, dan string di tempat list tidak membuat crash; tautan berbahaya dibuang', () => {
    const weird = {
      hero: { slides: 'x', primary_url: 'javascript:alert(1)', header_url: 'vbscript:x', ticker_label: 5 },
      stats: { items: [{ value: 7 }, 'x', null] },
      welcome: { photo: 'javascript:alert(1)', body: 3, button_url: 'javascript:alert(1)', button_label: 'Baca' },
      about: { pillars: [{ title: 'Visi', detail: 7 }], dimensions: 'x', image: 'javascript:alert(1)' },
      programs: { items: [{ name: 1, image: 'javascript:alert(1)', subjects: null }] },
      achievements: { items: [null, { title: 3 }] },
      news: { items: [{ title: 'Berita', date: 9, category: null, url: 'javascript:alert(1)', image: 'javascript:alert(1)' }] },
      announcements: { items: [{ title: 'P', badge: 3, url: 'javascript:alert(1)' }] },
      agenda: { items: [{ title: 'A', date: 'besok' }] },
      clubs: { items: 'x', more: 4 },
      facilities: { items: [{ name: 'Lab', image: 'javascript:alert(1)' }] },
      teachers: { items: [{ name: 'Guru', photo: 'javascript:alert(1)' }] },
      spmb: { paths: [{ name: 2 }], schedule: 'x', requirements: [null], badges: 3, portal_url: 'javascript:alert(1)', whatsapp: 'abc' },
      gallery: { items: [{ image: 'javascript:alert(1)' }] },
      testimonials: { items: [{ quote: 'Baik', photo: 'javascript:alert(1)' }] },
      faq: { items: [{ question: 2, answer: null }] },
      footer: { links: [{ label: 'X', url: 'javascript:alert(1)' }], instagram: 'javascript:alert(1)' },
      brand: { accent_color: 'biru', logo: 'javascript:alert(1)' },
    } as unknown as SiteContent;
    const { container } = render(<def.Component content={resolveContent(def, weird)} />);
    expect(container.querySelector('a[href^="javascript:"], a[href^="vbscript:"]')).toBeNull();
    expect(container.querySelector('img[src^="javascript:"]')).toBeNull();
    expect(section(container, 'agenda').textContent).toContain('besok');
    expect(container.querySelector('h1')!.textContent).toBe(SLIDE_TITLES[0]);
    expect(rootStyle(container, '--nw-navy')).toBe('#0b1736');
    cleanup();
    // content kosong / null tidak crash
    for (const c of [{}, null]) {
      const { container: empty, unmount } = render(<def.Component content={c as unknown as SiteContent} />);
      expect(empty.querySelector('[data-tpl-root]')).not.toBeNull();
      unmount();
    }
  });
});
