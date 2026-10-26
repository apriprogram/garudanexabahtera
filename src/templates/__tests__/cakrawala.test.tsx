// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/cakrawala.test.tsx
// Cakrawala (template website SMK/SMA 2026-10-25): skema CMS & konten demo, helper model (warna tema, menu, slide hero,
// tanggal, filter berita, formulir PPDB → pesan WhatsApp, lamaran BKK, ikon otomatis), demo (urutan section, hero
// slider, PPDB bertab + formulir, berita berfilter, pengumuman & agenda, BKK, kontak + peta, footer), kustomisasi
// warna, SEO situs pembeli, konten opsional kosong, pratinjau CMS diam, editor CMS, data katalog (migrasi 025 + seed
// + gambar pratinjau), dan konten aneh.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionEditor } from '../../pages/account/cms/SectionEditor';
import { validateContent } from '../../pages/account/cms/validation';
import { TEMPLATES, resolveContent } from '../index';
import { iconKey } from '../cakrawala/icons';
import {
  cakrawalaVars,
  careerMessage,
  displayDate,
  EMPTY_PPDB,
  filterNews,
  heroSlides,
  isUrgent,
  navItems,
  newsCategories,
  PAGE_SECTIONS,
  parseSchoolDate,
  ppdbMessage,
  programNoun,
  programOption,
  readCakrawala,
  sectionTarget,
  titleTarget,
  validatePpdb,
  validPhone,
  wrapIndex,
} from '../cakrawala/model';
import { INPUT } from '../cakrawala/styles';
import { CAKRAWALA_PHOTOS } from '../cakrawala/photos';
import { applySiteHead, siteTitle } from '../siteHead';
import { SiteRenderer } from '../SiteRenderer';
import { contrast, parseHex } from '../shared/utils';
import { isListField, type ListItem, type SiteContent } from '../types';

// Demo panjang (19 section) + getByRole di jsdom: bisa lewat 5 dtk saat suite berjalan paralel
vi.setConfig({ testTimeout: 30_000 });

const ROOT = process.cwd();
const def = TEMPLATES.cakrawala;
const ORDER = [
  'hero',
  'highlights',
  'stats',
  'welcome',
  'about',
  'programs',
  'industry',
  'achievements',
  'ppdb',
  'news',
  'announcements',
  'agenda',
  'testimonials',
  'careers',
  'facilities',
  'gallery',
  'faq',
  'contact',
];
const sectionKeys = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-tpl-section]')).map((s) => s.getAttribute('data-tpl-section'));
const section = (root: HTMLElement, key: string) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`)!;
const demo = (content: unknown = null, preview = false) => render(<SiteRenderer templateCode="cakrawala" content={content} preview={preview} />).container;
const rgb = (hex: string) => parseHex(hex)!;
const publicFile = (url: string) => resolve(ROOT, 'public', url.replace(/^\//, ''));
const rootStyle = (container: HTMLElement, name: string) => {
  const holder = Array.from(container.querySelectorAll<HTMLElement>('[style]')).find((el) => el.style.getPropertyValue(name));
  return holder?.style.getPropertyValue(name) ?? '';
};
const urls = (src: string) => {
  const asset = CAKRAWALA_PHOTOS.asset(src)!;
  return [asset.src, ...asset.srcSet!.split(',').map((part) => part.trim().split(' ')[0])].filter((u, i, all) => all.indexOf(u) === i);
};
const wa = (el: Element | null) => decodeURIComponent(el?.getAttribute('href') ?? '');

let scrolled: (string | null)[] = [];
beforeEach(() => {
  scrolled = [];
  Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
    scrolled.push(this.getAttribute('data-tpl-section'));
  });
});
afterEach(cleanup);

describe('Cakrawala: skema & konten bawaan', () => {
  it('urutan form = urutan halaman, semua section bisa disembunyikan, field unik, list berbatas', () => {
    expect(def.code).toBe('cakrawala');
    expect(def.name).toBe('Cakrawala');
    expect(def.sections.map((s) => s.key)).toEqual(['brand', ...ORDER, 'footer']);
    const fields = (key: string) => def.sections.find((s) => s.key === key)!.fields.map((f) => f.key);
    expect(fields('brand')).toEqual(['company_name', 'tagline', 'logo', 'accent_color']);
    expect(def.sections[0].fields.find((f) => f.key === 'accent_color')?.type).toBe('color');
    expect(fields('hero')).toEqual(expect.arrayContaining(['topbar_text', 'image', 'slides', 'primary_label', 'secondary_label', 'card_title', 'trust_text']));
    expect(fields('ppdb')).toEqual(expect.arrayContaining(['facts', 'paths', 'schedule', 'requirements', 'steps', 'fees', 'form_button', 'whatsapp']));
    expect(fields('contact')).toEqual(expect.arrayContaining(['address', 'maps_query', 'maps_url', 'phone', 'email', 'whatsapp', 'hours']));
    for (const s of def.sections) {
      const keys = s.fields.map((f) => f.key);
      expect(new Set(keys).size, s.key).toBe(keys.length);
      for (const f of s.fields) if (isListField(f)) expect(f.max, `${s.key}.${f.key}`).toBeGreaterThan(0);
      expect(def.defaultContent[s.key], s.key).toBeTypeOf('object');
      expect(s.introduced).toBeUndefined();
      if (s.key !== 'brand') expect(s.toggleable, s.key).toBe(true);
    }
    const slides = def.sections.find((s) => s.key === 'hero')!.fields.find((f) => f.key === 'slides');
    expect(slides && isListField(slides) ? slides.max : 0).toBe(3);
  });

  it('konten demo lolos validasi CMS, logo Tut Wuri Handayani (SVG), semua foto terdaftar, ada di public/, dan tercatat di CREDITS.md', () => {
    const c = def.defaultContent;
    expect(validateContent(def, resolveContent(def, null))).toEqual({});
    expect(c.brand.logo).toBe('/assets/templates/logos/tut-wuri-handayani.svg');
    expect(existsSync(publicFile(c.brand.logo as string))).toBe(true);
    expect(c.brand.accent_color).toBe('#1D4ED8');
    expect(c.hero.image).toBe('/assets/templates/photos/cakrawala-hero-1-1920.webp');
    const photos = JSON.stringify(c).match(/\/assets\/templates\/photos\/[a-z0-9-]+\.webp/g) ?? [];
    expect(photos.length).toBeGreaterThanOrEqual(20);
    for (const src of photos) expect(CAKRAWALA_PHOTOS.asset(src), src).not.toBeNull();
    const credits = readFileSync(resolve(ROOT, 'public/assets/templates/photos/CREDITS.md'), 'utf8');
    for (const key of CAKRAWALA_PHOTOS.keys) {
      for (const url of urls(CAKRAWALA_PHOTOS.src(key))) expect(existsSync(publicFile(url)), url).toBe(true);
      expect(credits, key).toContain(`\`${key}-*\``);
      expect(photos, `${key} dipakai di konten demo`).toContain(CAKRAWALA_PHOTOS.src(key));
    }
    expect(existsSync(publicFile('/assets/templates/logos/cakrawala-mark.svg'))).toBe(true);
  });

  it('foto demo ringan: slide hero 800/1280/1920, WebP ≤ 140 KB per file, total ≤ 2,5 MB', () => {
    expect(CAKRAWALA_PHOTOS.asset(def.defaultContent.hero.image as string)!.srcSet).toBe(
      '/assets/templates/photos/cakrawala-hero-1-800.webp 800w, /assets/templates/photos/cakrawala-hero-1-1280.webp 1280w, /assets/templates/photos/cakrawala-hero-1-1920.webp 1920w',
    );
    let total = 0;
    for (const key of CAKRAWALA_PHOTOS.keys) {
      for (const url of urls(CAKRAWALA_PHOTOS.src(key))) {
        const kb = statSync(publicFile(url)).size / 1024;
        expect(kb, url).toBeLessThanOrEqual(140);
        total += kb;
      }
    }
    expect(total).toBeLessThanOrEqual(2500);
  });

  it('salinan demo jujur: formulir PPDB hanya lewat WhatsApp, tanpa klaim sistem akademik atau jaminan kerja', () => {
    const text = JSON.stringify(def.defaultContent);
    expect(text).not.toMatch(/dijamin|pasti diterima|pasti bekerja|e-rapor|absensi online|pembayaran online|terbaik nomor/i);
    expect(text).toMatch(/data tidak disimpan di website/);
    expect(text).toMatch(/tidak dipungut biaya/);
  });
});

describe('Cakrawala: helper model', () => {
  it('warna tema: biru tinta gelap (putih ≥ 12:1), versi terang ≥ 5:1 di atasnya, tinta ≥ 5:1 di putih; warna tidak valid → bawaan', () => {
    const white = rgb('#ffffff');
    // Termasuk semua pilihan cepat ColorField CMS (#B45309 dulu 4,39:1 tinta di tint) dan merah/magenta jenuh
    for (const accent of ['#1D4ED8', '#047857', '#FACC15', '#B91C1C', '#0E1A1C', '#7DD3FC', '#211FFE', '#0E7490', '#B45309', '#7C3AED', '#BE185D', '#1F2937', '#FF0000', '#FF00FF']) {
      const vars = cakrawalaVars(accent) as Record<string, string>;
      const deep = rgb(vars['--ck-deep']);
      expect(contrast(deep, white), accent).toBeGreaterThanOrEqual(12);
      expect(contrast(rgb(vars['--ck-bright']), deep), accent).toBeGreaterThanOrEqual(5);
      expect(contrast(rgb(vars['--ck-ink']), white), accent).toBeGreaterThanOrEqual(5);
      expect(contrast(rgb(vars['--ck-ink']), rgb(vars['--ck-tint'])), accent).toBeGreaterThanOrEqual(4.5);
    }
    // Chip kecil (tinta tema di --ck-tint) lolos AA untuk SEMUA warna: kisi RGB 18 langkah (5.832 warna)
    const steps = Array.from({ length: 18 }, (_, i) => Math.round((i * 255) / 17));
    const worst = { inkOnTint: Infinity, inkOnWhite: Infinity, whiteOnDeep: Infinity, brightOnDeep: Infinity };
    for (const r of steps)
      for (const g of steps)
        for (const b of steps) {
          const vars = cakrawalaVars(`#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`) as Record<string, string>;
          const ink = rgb(vars['--ck-ink']);
          const deep = rgb(vars['--ck-deep']);
          worst.inkOnTint = Math.min(worst.inkOnTint, contrast(ink, rgb(vars['--ck-tint'])));
          worst.inkOnWhite = Math.min(worst.inkOnWhite, contrast(ink, white));
          worst.whiteOnDeep = Math.min(worst.whiteOnDeep, contrast(white, deep));
          worst.brightOnDeep = Math.min(worst.brightOnDeep, contrast(rgb(vars['--ck-bright']), deep));
        }
    expect(worst.inkOnTint).toBeGreaterThanOrEqual(4.5);
    expect(worst.inkOnWhite).toBeGreaterThanOrEqual(5);
    expect(worst.whiteOnDeep).toBeGreaterThanOrEqual(12);
    expect(worst.brightOnDeep).toBeGreaterThanOrEqual(5);
    expect(cakrawalaVars('bukan warna')).toEqual(cakrawalaVars('#1D4ED8'));
    // Hijau menghasilkan pita gelap kehijauan, bukan biru
    const green = rgb((cakrawalaVars('#047857') as Record<string, string>)['--ck-deep']);
    expect(green[1]).toBeGreaterThan(green[2] - 12);
  });

  it('menu: Profil, Jurusan, PPDB, Berita, BKK, Kontak; label singkat dari label section (SMA: "Peminatan")', () => {
    const content = resolveContent(def, null);
    expect(navItems(content).map((i) => i.label)).toEqual(['Profil', 'Jurusan', 'PPDB', 'Berita', 'BKK', 'Kontak']);
    const sma = resolveContent(def, { programs: { eyebrow: 'Peminatan' }, careers: { enabled: false }, news: { items: [] } });
    expect(navItems(sma).map((i) => `${i.key}:${i.label}`)).toEqual(['about:Profil', 'programs:Peminatan', 'ppdb:PPDB', 'contact:Kontak']);
    // PPDB tetap "PPDB" walau label kecilnya "PPDB 2027/2028"
    expect(navItems(resolveContent(def, { ppdb: { eyebrow: 'Daftar' } })).find((i) => i.key === 'ppdb')?.label).toBe('PPDB');
  });

  it('slide hero: slide 1 = isi hero, tambahan hanya yang berfoto (maks. 3), teks kosong ikut slide 1; indeks berputar', () => {
    const base = { image: '/a.webp', eyebrow: 'Label', title: 'Judul utama', highlight: 'utama', subtitle: 'Deskripsi' };
    expect(heroSlides({ ...base, slides: [{ image: '', title: 'Tanpa foto' }, { image: '/b.webp' }, { image: '/c.webp', title: 'Judul C', highlight: 'C' }] }, 'Sekolah')).toEqual([
      base,
      { image: '/b.webp', eyebrow: 'Label', title: 'Judul utama', highlight: 'utama', subtitle: 'Deskripsi' },
      { image: '/c.webp', eyebrow: 'Label', title: 'Judul C', highlight: 'C', subtitle: 'Deskripsi' },
    ]);
    expect(heroSlides({}, 'Sekolah')).toEqual([{ image: '', eyebrow: '', title: 'Sekolah', highlight: '', subtitle: '' }]);
    expect(heroSlides({ slides: Array.from({ length: 6 }, (_, i) => ({ image: `/s${i}.webp` })) }, 'S')).toHaveLength(4);
    expect(heroSlides({ slides: [{ image: 'javascript:alert(1)' }] }, 'S')).toHaveLength(1);
    expect([wrapIndex(4, 4), wrapIndex(-1, 4), wrapIndex(2, 4), wrapIndex(1, 0)]).toEqual([0, 3, 2, 0]);
  });

  it('tanggal: ISO valid → "14 Okt 2026" (+ datetime), teks bebas apa adanya, tanggal mustahil → teks', () => {
    expect(parseSchoolDate('2026-10-14')).toEqual({ iso: '2026-10-14', day: '14', month: 'Okt', year: '2026', label: '14 Okt 2026' });
    expect(parseSchoolDate('2026-02-30')).toBeNull();
    expect(parseSchoolDate('14 Okt')).toBeNull();
    expect(displayDate(' 2027-07-01 ')).toBe('1 Jul 2027');
    expect(displayDate('Juli 2027')).toBe('Juli 2027');
    expect(displayDate('')).toBe('');
  });

  it('berita: kategori unik berurutan tanpa beda huruf besar, filter tak dikenal → semua; label penting', () => {
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
    expect([isUrgent('Penting'), isUrgent('WAJIB'), isUrgent('Info'), isUrgent('')]).toEqual([true, true, false, false]);
  });

  it('PPDB: nomor HP Indonesia, validasi wajib isi & pilihan yang tersedia, pesan WhatsApp per baris', () => {
    expect(['081234567890', '+62 812-3456-7890', '6281234567890', '8123456789'].map(validPhone)).toEqual([true, true, true, true]);
    expect(['12345', '0812abc34567', '', '9912345678'].map(validPhone)).toEqual([false, false, false, false]);
    const options = { programs: ['PPLG — Pengembangan Perangkat Lunak dan Gim'], paths: ['Jalur reguler'] };
    expect(Object.keys(validatePpdb(EMPTY_PPDB, options))).toEqual(['name', 'origin', 'program', 'path', 'phone']);
    expect(validatePpdb({ ...EMPTY_PPDB, name: 'Ra', origin: 'SMP 1', program: 'Lain', path: 'Jalur reguler', phone: '0812' }, options)).toEqual({
      name: 'Tulis nama lengkap calon siswa.',
      program: 'Pilih program keahlian.',
      phone: 'Tulis nomor WhatsApp yang aktif, mis. 081234567890.',
    });
    // Tanpa daftar jurusan/jalur (bagian disembunyikan) → pilihan tidak wajib
    expect(validatePpdb({ ...EMPTY_PPDB, name: 'Rani Putri', origin: 'SMP Negeri 3', phone: '081234567890' }, { programs: [], paths: [] })).toEqual({});
    // SMA: sebutan program mengikuti label kecil section Program
    expect(validatePpdb({ ...EMPTY_PPDB, name: 'Rani Putri', origin: 'SMP Negeri 3', phone: '081234567890' }, { programs: ['MIPA'], paths: [], programNoun: 'peminatan' })).toEqual({
      program: 'Pilih peminatan.',
    });
    expect(
      [{ eyebrow: 'Peminatan' }, { eyebrow: 'Program keahlian' }, { eyebrow: ' Peminatan  MIPA ' }, { eyebrow: '' }, {}, { eyebrow: 'Pilih jurusan yang sesuai minat dan bakatmu' }].map(programNoun),
    ).toEqual(['peminatan', 'program keahlian', 'peminatan MIPA', 'program keahlian', 'program keahlian', 'program keahlian']);
    expect(ppdbMessage('SMK Cakrawala Karya', { name: ' Rani Putri ', origin: 'SMP Negeri 3', program: 'DKV — Desain Komunikasi Visual', path: '', phone: '0812 3456 7890', note: 'Mohon\ninfo   beasiswa' })).toBe(
      'Halo Panitia PPDB SMK Cakrawala Karya, saya ingin mendaftar.\nNama calon siswa: Rani Putri\nAsal sekolah: SMP Negeri 3\nPilihan program: DKV — Desain Komunikasi Visual\nNo. WhatsApp: 0812 3456 7890\nCatatan: Mohon info beasiswa\nMohon info langkah selanjutnya. Terima kasih.',
    );
    expect(programOption({ code: 'TKRO', name: 'Teknik Kendaraan Ringan Otomotif' })).toBe('TKRO — Teknik Kendaraan Ringan Otomotif');
    expect(programOption({ name: 'MIPA' })).toBe('MIPA');
    expect(careerMessage('SMK X', { position: 'Teknisi', company: 'PT Y' })).toBe('Halo BKK SMK X, saya ingin melamar posisi Teknisi di PT Y. Mohon info persyaratan dan cara mengirim berkas.');
  });

  it('tujuan kartu info & ikon otomatis dari judul (SMK dan SMA)', () => {
    const all = () => true;
    expect(['PPDB online', 'Teaching factory', 'Bursa Kerja Khusus', 'Peminatan MIPA', 'Prestasi lomba'].map((t) => titleTarget(t, all))).toEqual([
      'ppdb',
      'industry',
      'careers',
      'programs',
      'achievements',
    ]);
    expect(titleTarget('Bursa Kerja Khusus', (k) => k !== 'careers')).toBeNull();
    expect(iconKey('PPLG Pengembangan Perangkat Lunak dan Gim')).toBe('code');
    expect(iconKey('TJKT Teknik Jaringan Komputer dan Telekomunikasi')).toBe('network');
    expect(iconKey('DKV Desain Komunikasi Visual')).toBe('design');
    expect(iconKey('AKL Akuntansi dan Keuangan Lembaga')).toBe('accounting');
    expect(iconKey('TKRO Teknik Kendaraan Ringan Otomotif')).toBe('car');
    expect(iconKey('PHT Perhotelan')).toBe('hotel');
    expect(iconKey('MIPA Matematika dan Ilmu Pengetahuan Alam')).toBe('science');
    expect(iconKey('Siswa aktif')).toBe('students');
    expect(iconKey('Akreditasi (Unggul)')).toBe('certificate');
    expect(iconKey('Sesuatu yang lain', 2)).toBe('award');
  });

  it('tautan "#…": anchor Indonesia (#berita, #jurusan, #pendaftaran) ke section yang benar, anchor tak dikenal → cadangan', () => {
    expect([...PAGE_SECTIONS]).toEqual(def.sections.map((s) => s.key).filter((k) => k !== 'brand'));
    expect(['berita', '#Jurusan', 'pendaftaran', 'profil', 'kontak', 'tentang', 'beranda', 'news', 'lokasi', 'bkk'].map(sectionTarget)).toEqual([
      'news',
      'programs',
      'ppdb',
      'about',
      'contact',
      'about',
      'hero',
      'news',
      'contact',
      'careers',
    ]);
    expect(['xyz', 'brand', ''].map(sectionTarget)).toEqual([null, null, null]);

    const m = readCakrawala(resolveContent(def, null));
    const fallback = { kind: 'section', target: 'ppdb' } as const;
    expect(m.shown('berita')).toBe(false);
    expect(m.shown('xyz')).toBe(false);
    expect(m.linkOr('#berita', fallback)).toEqual({ kind: 'section', target: 'news' });
    expect(m.linkOr('#jurusan', fallback)).toEqual({ kind: 'section', target: 'programs' });
    expect(m.linkOr('#kontak', fallback)).toEqual({ kind: 'section', target: 'contact' });
    expect(m.linkOr('#beranda', fallback)).toEqual({ kind: 'section', target: 'hero' });
    expect(m.linkOr('#salah-ketik', fallback)).toBe(fallback);
    expect(m.linkOr('', fallback)).toEqual(fallback);
    // Section tersembunyi → cadangan
    const hidden = readCakrawala(resolveContent(def, { news: { enabled: false } }));
    expect(hidden.linkOr('#berita', fallback)).toBe(fallback);
  });
});

describe('Cakrawala: demo', () => {
  it('urutan section, satu h1, hero slider berfoto (data-hero-layout horizon), bilah pengumuman, menu pil', () => {
    const container = demo();
    expect(sectionKeys(container)).toEqual(ORDER);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const hero = section(container, 'hero');
    expect(hero.getAttribute('data-hero-layout')).toBe('horizon');
    expect(hero.getAttribute('data-tpl-tone')).toBe('inverse');
    expect(hero.querySelector('h1')!.textContent).toBe('Terampil hari ini, siap berkarya esok hari');
    // Bagian sorotan judul di atas foto: tetap putih (kontras tidak bergantung foto) + garis bawah warna tema
    const mark = hero.querySelector('h1 span')!;
    expect(mark.textContent).toBe('siap berkarya');
    expect(mark.className).toContain('text-white');
    expect(mark.className).toContain('decoration-(--ck-bright)');
    expect(mark.className).not.toContain('text-(--ck-bright)');
    const img = hero.querySelector<HTMLImageElement>('img[fetchpriority="high"]')!;
    expect(img.getAttribute('src')).toBe('/assets/templates/photos/cakrawala-hero-1-1920.webp');
    expect(img.getAttribute('srcset')).toContain('-1280.webp 1280w');
    expect(img.getAttribute('loading')).toBe('eager');
    expect(Number(img.getAttribute('width'))).toBe(1920);
    expect(Number(img.getAttribute('height'))).toBe(1080);
    expect(img.getAttribute('alt')).toMatch(/siswa/i);
    expect(container.querySelectorAll('img[fetchpriority="high"]')).toHaveLength(1);
    expect(within(hero).getByRole('link', { name: 'Daftar PPDB' })).toHaveAttribute('href', '#ppdb');
    expect(within(hero).getByRole('link', { name: 'Profil sekolah' })).toHaveAttribute('href', '#tentang');
    expect(within(hero).getByRole('link', { name: 'Lihat jadwal' })).toHaveAttribute('href', '#ppdb');
    // Teks kepercayaan: demo singkat agar muat di 390px; teks panjang pembeli turun baris (maks. 2), tidak terpotong "…"
    const trust = within(hero).getByText('Dipercaya 1.200+ keluarga');
    expect(trust.className).toContain('line-clamp-2');
    expect(trust.className).not.toContain('truncate');

    expect(container.textContent).toContain('PPDB 2027/2028 Gelombang 1 dibuka hingga 31 Januari 2027');
    expect(within(container).getByRole('link', { name: 'Daftar sekarang' })).toHaveAttribute('href', '#ppdb');
    const header = container.querySelector('header')!;
    expect(header.className).toContain('h-0');
    const nav = within(header).getAllByRole('navigation', { name: 'Menu utama' })[0];
    expect(Array.from(nav.querySelectorAll('a')).map((a) => `${a.textContent}|${a.getAttribute('href')}`)).toEqual([
      'Profil|#tentang',
      'Jurusan|#programs',
      'PPDB|#ppdb',
      'Berita|#berita',
      'BKK|#careers',
      'Kontak|#kontak',
    ]);
    // Logo demo (Tut Wuri Handayani) di menu; logo dikosongkan → simbol cakrawala bawaan
    expect(header.querySelector('img[src="/assets/templates/logos/tut-wuri-handayani.svg"]'), 'logo demo').not.toBeNull();
    expect(demo({ brand: { logo: '' } }).querySelector('header svg[viewBox="0 0 32 32"]'), 'CakrawalaMark').not.toBeNull();
    fireEvent.click(within(nav).getByRole('link', { name: 'BKK' }));
    expect(scrolled).toEqual(['careers']);
  });

  it('hero slider: 4 slide, tombol per slide + sebelumnya/berikutnya, panah keyboard, geser, jeda, berhenti saat disorot', () => {
    const hero = section(demo(), 'hero');
    expect(hero.getAttribute('aria-roledescription')).toBe('carousel');
    const controls = within(hero).getByRole('group', { name: 'Kontrol slide' });
    const dots = within(controls).getAllByRole('button', { name: /^Slide \d dari 4$/ });
    expect(dots).toHaveLength(4);
    expect(dots[0]).toHaveAttribute('aria-current', 'true');
    const progress = () => controls.querySelector('.ck-progress')!;
    expect(progress()).toHaveAttribute('data-run', 'true');
    expect(progress()).toHaveAttribute('data-hold', 'false');
    // Hanya foto slide 1 yang dimuat di awal (eager); foto lain menyusul (lazy). Foto bulat alumni di chip = lazy.
    expect(hero.querySelectorAll('.ck-slide img')).toHaveLength(1);
    expect(Array.from(hero.querySelectorAll('img.rounded-full')).every((i) => i.getAttribute('loading') === 'lazy')).toBe(true);

    fireEvent.click(within(controls).getByRole('button', { name: 'Slide berikutnya' }));
    expect(dots[1]).toHaveAttribute('aria-current', 'true');
    expect(hero.querySelector('h1')!.textContent).toBe('Kelas yang dekat dengan dunia kerja nyata');
    const imgs = Array.from(hero.querySelectorAll<HTMLImageElement>('.ck-slide img'));
    expect(imgs.map((i) => i.getAttribute('fetchpriority'))).toEqual(['high', null, null, null]);
    expect(imgs.slice(1).every((i) => i.getAttribute('loading') === 'lazy')).toBe(true);
    expect(imgs.map((i) => i.getAttribute('alt') !== '')).toEqual([false, true, false, false]);
    expect(hero.querySelectorAll('h1')).toHaveLength(1);

    fireEvent.click(within(controls).getByRole('button', { name: 'Slide sebelumnya' }));
    fireEvent.click(within(controls).getByRole('button', { name: 'Slide sebelumnya' }));
    expect(dots[3]).toHaveAttribute('aria-current', 'true');
    fireEvent.keyDown(dots[3], { key: 'ArrowRight' });
    expect(dots[0]).toHaveAttribute('aria-current', 'true');
    // Geser ke kiri di HP → slide berikutnya; geser vertikal (gulir) diabaikan
    fireEvent.touchStart(hero, { touches: [{ clientX: 300, clientY: 200 }] });
    fireEvent.touchEnd(hero, { changedTouches: [{ clientX: 180, clientY: 210 }] });
    expect(dots[1]).toHaveAttribute('aria-current', 'true');
    fireEvent.touchStart(hero, { touches: [{ clientX: 300, clientY: 200 }] });
    fireEvent.touchEnd(hero, { changedTouches: [{ clientX: 240, clientY: 420 }] });
    expect(dots[1]).toHaveAttribute('aria-current', 'true');
    fireEvent.click(dots[2]);
    expect(dots[2]).toHaveAttribute('aria-current', 'true');

    // Disorot / difokus → bilah progres berhenti; jeda → tidak berjalan
    fireEvent.mouseEnter(hero);
    expect(progress()).toHaveAttribute('data-hold', 'true');
    fireEvent.mouseLeave(hero);
    expect(progress()).toHaveAttribute('data-hold', 'false');
    fireEvent.click(within(controls).getByRole('button', { name: 'Jeda slide otomatis' }));
    expect(within(controls).getByRole('button', { name: 'Putar slide otomatis' })).toBeInTheDocument();
    expect(progress()).toHaveAttribute('data-run', 'false');
  });

  it('hero slider: wilayah live tetap (tidak dipasang ulang) mengumumkan slide yang dipilih manual; diam saat berganti otomatis', () => {
    const hero = section(demo(), 'hero');
    const status = () => hero.querySelector<HTMLElement>('[data-ck-slide-status]')!;
    const live = status();
    expect(hero.querySelectorAll('[aria-live]')).toHaveLength(1);
    expect(live).toHaveClass('sr-only');
    expect(live).toHaveAttribute('aria-atomic', 'true');
    expect(live).toHaveTextContent('Slide 1 dari 4: Terampil hari ini, siap berkarya esok hari');
    // Berganti otomatis tanpa disorot/difokus → off
    expect(live).toHaveAttribute('aria-live', 'off');
    // Fokus di kontrol (keyboard) → polite; pilihan berikutnya diumumkan di node yang SAMA
    const controls = within(hero).getByRole('group', { name: 'Kontrol slide' });
    const next = within(controls).getByRole('button', { name: 'Slide berikutnya' });
    act(() => next.focus());
    expect(status()).toBe(live);
    expect(live).toHaveAttribute('aria-live', 'polite');
    fireEvent.click(next);
    expect(status()).toBe(live);
    expect(live.isConnected).toBe(true);
    expect(live).toHaveTextContent('Slide 2 dari 4: Kelas yang dekat dengan dunia kerja nyata');
    // Dijeda → tetap polite walau fokus pindah keluar hero
    fireEvent.click(within(controls).getByRole('button', { name: 'Jeda slide otomatis' }));
    act(() => (document.activeElement as HTMLElement | null)?.blur());
    expect(hero.contains(document.activeElement)).toBe(false);
    expect(live).toHaveAttribute('aria-live', 'polite');
    fireEvent.click(next);
    expect(status()).toBe(live);
    expect(live).toHaveTextContent(/^Slide 3 dari 4: /);
    // Slide aktif tidak lagi membawa aria-live sendiri
    expect(hero.querySelectorAll('.grid > [aria-live]')).toHaveLength(0);
  });

  it('kartu info menuju section dari judul, statistik dengan ikon, sambutan, profil + visi misi', () => {
    const container = demo();
    const highlights = section(container, 'highlights');
    expect(highlights.querySelector('h2.sr-only')?.textContent).toBe('Informasi singkat');
    expect(Array.from(highlights.querySelectorAll('a')).map((a) => `${a.textContent}|${a.getAttribute('href')}`)).toEqual([
      'Mulai daftar|#ppdb',
      'Lihat unit produksi|#industry',
      'Lihat lowongan|#careers',
    ]);
    const stats = section(container, 'stats');
    expect(Array.from(stats.querySelectorAll('dt')).map((d) => d.textContent)).toEqual(['Siswa aktif', 'Guru & instruktur', 'Prestasi lomba', 'Alumni', 'Akreditasi (Unggul)']);
    expect(stats.querySelectorAll('dd svg')).toHaveLength(5);
    const welcome = section(container, 'welcome');
    expect(welcome.querySelector('blockquote')?.textContent).toMatch(/^Kami ingin setiap lulusan/);
    expect(welcome.textContent).toContain('Hendra Kurniawan, M.Pd.');
    expect(within(welcome).getByRole('link', { name: 'Kenali profil sekolah' })).toHaveAttribute('href', '#tentang');
    const about = section(container, 'about');
    expect(about.textContent).toContain('Berdiri sejak2004');
    expect(about.querySelectorAll('ol li')).toHaveLength(4);
    expect(within(about).getByRole('heading', { level: 3, name: 'Visi' })).toBeInTheDocument();
  });

  it('program keahlian, teaching factory & mitra, prestasi', () => {
    const container = demo();
    const programs = section(container, 'programs');
    const cards = Array.from(programs.querySelector('ul')!.children);
    expect(cards).toHaveLength(6);
    expect(within(programs).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Pengembangan Perangkat Lunak dan Gim',
      'Teknik Jaringan Komputer dan Telekomunikasi',
      'Desain Komunikasi Visual',
      'Akuntansi dan Keuangan Lembaga',
      'Teknik Kendaraan Ringan Otomotif',
      'Perhotelan',
    ]);
    expect(within(programs).getByRole('list', { name: 'Kompetensi PPLG' }).querySelectorAll('li')).toHaveLength(4);
    expect(wa(within(programs).getByRole('link', { name: 'Tanya tentang program Desain Komunikasi Visual (DKV)' }))).toContain(
      'Halo SMK Cakrawala Karya, saya ingin bertanya tentang program Desain Komunikasi Visual (DKV).',
    );
    const industry = section(container, 'industry');
    expect(industry.getAttribute('class')).not.toContain('shadow');
    expect(industry.textContent).toContain('Bengkel Cakrawala Motor');
    expect(industry.querySelector('figcaption')?.textContent).toBe('Roti buatan kelas kuliner dijual di kafe sekolah');
    expect(industry.textContent).toContain('Arunika Hotel');
    expect(within(section(container, 'achievements')).getAllByRole('heading', { level: 3 })).toHaveLength(4);
  });

  it('PPDB: fakta, tab Jalur/Jadwal/Syarat/Alur/Biaya dengan panah keyboard, linimasa bertanggal', () => {
    const ppdb = section(demo(), 'ppdb');
    expect(Array.from(ppdb.querySelectorAll('dl')[0].querySelectorAll('dd')).map((d) => d.textContent)).toEqual(['1 Nov 2026 – 31 Jan 2027', '432 kursi', 'Gratis']);
    const tablist = within(ppdb).getByRole('tablist', { name: 'Informasi PPDB' });
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Jalur', 'Jadwal', 'Syarat', 'Alur', 'Biaya']);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs.map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1', '-1', '-1']);
    const panel = (tab: HTMLElement) => document.getElementById(tab.getAttribute('aria-controls')!)!;
    expect(panel(tabs[0])).not.toHaveAttribute('hidden');
    expect(panel(tabs[1])).toHaveAttribute('hidden');
    // Panel tersembunyi tetap ada di HTML (perayap)
    expect(panel(tabs[2]).textContent).toContain('Fotokopi akta kelahiran');

    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveFocus();
    const times = Array.from(panel(tabs[1]).querySelectorAll('h3')).map((h) => h.textContent);
    expect(times).toEqual(['Pendaftaran gelombang 1', 'Tes minat bakat & wawancara', 'Pengumuman hasil', 'Daftar ulang', 'MPLS']);
    fireEvent.keyDown(tabs[1], { key: 'End' });
    expect(tabs[4]).toHaveAttribute('aria-selected', 'true');
    expect(panel(tabs[4]).textContent).toContain('Rp3.500.000');
    fireEvent.keyDown(tabs[4], { key: 'ArrowRight' });
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(tabs[3]);
    expect(panel(tabs[3]).querySelectorAll('ol > li')).toHaveLength(4);
  });

  it('formulir PPDB: galat per isian + fokus ke isian pertama, lalu pesan WhatsApp apa adanya; tidak ada data yang dikirim', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const ppdb = section(demo(), 'ppdb');
    const form = within(ppdb).getByRole('form', { name: 'Formulir pendaftaran singkat' });
    expect(form.textContent).toContain('Data tidak disimpan di website ini dan tidak ada pembayaran online');
    const submit = within(form).getByRole('button', { name: /Kirim lewat WhatsApp/ });
    expect(submit).toHaveAttribute('type', 'submit');
    fireEvent.click(submit);
    const name = within(form).getByLabelText('Nama lengkap calon siswa');
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveFocus();
    // Cincin fokus memakai versi kontras warna tema (≥ 3:1 di putih juga untuk warna tema terang), bukan warna mentah
    expect(INPUT).toContain('focus:ring-(--tpl-accent-ink)');
    expect(INPUT).not.toMatch(/ring-\(--tpl-accent\)/);
    expect(name.className).toContain('focus:ring-(--tpl-accent-ink)');
    expect(form.textContent).toContain('Tulis nama lengkap calon siswa.');
    expect(within(form).getByLabelText('Nomor WhatsApp orang tua/siswa')).toHaveAttribute('aria-invalid', 'true');

    fireEvent.change(name, { target: { value: 'Rani Putri' } });
    expect(name).not.toHaveAttribute('aria-invalid');
    fireEvent.change(within(form).getByLabelText('Asal sekolah (SMP/MTs)'), { target: { value: 'SMP Negeri 3 Bandung' } });
    const program = within(form).getByLabelText('Pilihan program keahlian') as HTMLSelectElement;
    expect(Array.from(program.options).map((o) => o.value)).toContain('PPLG — Pengembangan Perangkat Lunak dan Gim');
    fireEvent.change(program, { target: { value: 'DKV — Desain Komunikasi Visual' } });
    fireEvent.change(within(form).getByLabelText('Jalur pendaftaran'), { target: { value: 'Jalur prestasi' } });
    fireEvent.change(within(form).getByLabelText('Nomor WhatsApp orang tua/siswa'), { target: { value: '0812-3456-7890' } });
    fireEvent.click(submit);

    expect(within(ppdb).queryByRole('form')).toBeNull();
    expect(within(ppdb).getByRole('heading', { name: /Pesan siap dikirim/ })).toBeInTheDocument();
    const message =
      'Halo Panitia PPDB SMK Cakrawala Karya, saya ingin mendaftar.\nNama calon siswa: Rani Putri\nAsal sekolah: SMP Negeri 3 Bandung\nPilihan program: DKV — Desain Komunikasi Visual\nJalur: Jalur prestasi\nNo. WhatsApp: 0812-3456-7890\nMohon info langkah selanjutnya. Terima kasih.';
    expect(ppdb.querySelector('pre')?.textContent).toBe(message);
    const open = within(ppdb).getByRole('link', { name: 'Buka WhatsApp' });
    expect(open.getAttribute('href')).toBe(`https://wa.me/6281234567890?text=${encodeURIComponent(message)}`);
    expect(fetchSpy).not.toHaveBeenCalled();
    fireEvent.click(within(ppdb).getByRole('button', { name: 'Ubah data' }));
    expect(within(ppdb).getByRole('form')).toBeInTheDocument();
    fetchSpy.mockRestore();
  });

  it('berita: filter kategori (aria-pressed) + isi lengkap dibuka di kartu; pengumuman berlabel; agenda bertanggal', () => {
    const container = demo();
    const news = section(container, 'news');
    const filters = within(news).getByRole('group', { name: 'Saring berita menurut kategori' });
    expect(within(filters).getAllByRole('button').map((b) => b.textContent)).toEqual(['Semua', 'Prestasi', 'Kegiatan', 'Alumni']);
    expect(news.querySelectorAll('article')).toHaveLength(3);
    expect(news.querySelector('article time')).toHaveAttribute('datetime', '2026-10-14');
    fireEvent.click(within(filters).getByRole('button', { name: 'Kegiatan' }));
    expect(within(filters).getByRole('button', { name: 'Kegiatan' })).toHaveAttribute('aria-pressed', 'true');
    expect(Array.from(news.querySelectorAll('article h3')).map((h) => h.textContent)).toEqual(['Tiga siswa terpilih menjadi anggota Paskibraka tingkat kota']);
    expect(within(news).getByRole('status')).toHaveTextContent('1 berita kategori Kegiatan');
    const more = within(news).getByRole('button', { name: /Baca selengkapnya/ });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById(more.getAttribute('aria-controls')!)).toHaveAttribute('inert');
    fireEvent.click(more);
    expect(more).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(more.getAttribute('aria-controls')!)).not.toHaveAttribute('inert');
    expect(within(news).getByRole('link', { name: /Berita lainnya di Instagram/ })).toHaveAttribute('href', 'https://instagram.com/smkcakrawalakarya');

    const announcements = section(container, 'announcements');
    expect(within(announcements).getAllByText('Penting')).toHaveLength(2);
    expect(within(announcements).getAllByText('Penting')[0].className).toContain('text-[#B42318]');
    const agenda = section(container, 'agenda');
    expect(Array.from(agenda.querySelectorAll('time')).map((t) => t.getAttribute('datetime'))).toEqual(['2026-11-07', '2026-11-14', '2026-11-25', '2026-12-12']);
    expect(agenda.textContent).toContain('Aula sekolah');
  });

  it('alumni, BKK (lamar via WhatsApp per posisi), fasilitas, galeri, FAQ, kontak + peta, footer', () => {
    const container = demo();
    const alumni = section(container, 'testimonials');
    expect(alumni.querySelectorAll('blockquote')).toHaveLength(3);
    expect(alumni.textContent).toContain('86%');
    for (const img of alumni.querySelectorAll('img')) expect(img.getAttribute('srcset')).toContain('-240.webp 240w');

    const careers = section(container, 'careers');
    const apply = within(careers).getByRole('link', { name: 'Lamar via BKK untuk posisi Mekanik servis berkala di Garda Otomotif' });
    expect(wa(apply)).toContain('Halo BKK SMK Cakrawala Karya, saya ingin melamar posisi Mekanik servis berkala di Garda Otomotif.');
    expect(careers.textContent).toContain('BKK tidak pernah meminta biaya');
    expect(careers.querySelector('time')).toHaveAttribute('datetime', '2026-11-30');

    expect(within(section(container, 'facilities')).getAllByRole('heading', { level: 3 })).toHaveLength(4);
    const gallery = section(container, 'gallery');
    expect(Array.from(gallery.querySelectorAll('figcaption')).map((f) => f.textContent)).toHaveLength(4);

    const faq = section(container, 'faq');
    const questions = within(faq).getAllByRole('button');
    expect(questions).toHaveLength(5);
    expect(questions[0]).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(questions[3]);
    expect(questions[0]).toHaveAttribute('aria-expanded', 'false');
    expect(questions[3]).toHaveAttribute('aria-expanded', 'true');
    expect(wa(within(faq).getByRole('link', { name: 'Tanya panitia PPDB' }))).toContain('Halo Panitia PPDB SMK Cakrawala Karya, saya ingin bertanya.');

    const contact = section(container, 'contact');
    const iframe = contact.querySelector('iframe')!;
    expect(iframe).toHaveAttribute('title', 'Peta lokasi SMK Cakrawala Karya');
    expect(iframe).toHaveAttribute('loading', 'lazy');
    expect(iframe.getAttribute('src')).toBe('https://maps.google.com/maps?q=Kota%20Bandung%2C%20Jawa%20Barat&z=15&output=embed');
    expect(within(contact).getByRole('link', { name: 'Buka di Google Maps' })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/search/?api=1&query=Kota%20Bandung%2C%20Jawa%20Barat',
    );
    expect(within(contact).getByRole('link', { name: /Telepon/ })).toHaveAttribute('href', 'tel:+62225550170');
    expect(within(contact).getByRole('link', { name: /Email/ })).toHaveAttribute('href', 'mailto:info@cakrawalakarya.sch.id');
    expect(within(contact).getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://instagram.com/smkcakrawalakarya');
    expect(contact.textContent).toContain('Senin–Jumat 07.00–15.00 WIB');

    const footer = container.querySelector('footer')!;
    expect(within(footer).getByRole('navigation', { name: 'Tautan footer' }).querySelectorAll('a')).toHaveLength(6);
    expect(within(footer).getByRole('link', { name: 'Daftar PPDB' })).toHaveAttribute('href', '#ppdb');
    expect(footer.textContent).toContain(`© ${new Date().getFullYear()} SMK Cakrawala Karya. Semua hak dilindungi.`);
    expect(footer.textContent).toContain('Teknik Kendaraan Ringan Otomotif');
  });

  it('datar: tidak ada kelas shadow di template (kecuali tombol melayang Shell)', () => {
    const container = demo();
    const shadows = Array.from(container.querySelectorAll('[class*="shadow"]')).filter(
      (el) => !el.closest('[aria-label="Chat WhatsApp"]') && !/Chat WhatsApp|Kembali ke atas/.test(el.getAttribute('aria-label') ?? ''),
    );
    expect(shadows.map((el) => el.className)).toEqual([]);
    const source = ['Cakrawala', 'Header', 'Hero', 'Intro', 'Welcome', 'Programs', 'Industry', 'Ppdb', 'News', 'People', 'Campus', 'Closing', 'Footer', 'ui', 'styles']
      .map((f) => readFileSync(resolve(ROOT, `src/templates/cakrawala/${f}.${f === 'styles' ? 'ts' : 'tsx'}`), 'utf8'))
      .join('\n');
    expect(source).not.toMatch(/\bshadow-/);
  });
});

describe('Cakrawala: warna tema bisa diganti', () => {
  it('biru bawaan → --tpl-accent biru; hijau dari CMS → semua turunan ikut; warna terang → teks tombol gelap', () => {
    const blue = demo();
    expect(rootStyle(blue, '--tpl-accent')).toBe('#1d4ed8');
    expect(rootStyle(blue, '--tpl-on-accent')).toBe('#ffffff');
    const blueDeep = rootStyle(blue, '--ck-deep');
    cleanup();

    const green = demo({ brand: { accent_color: '#047857' } });
    expect(rootStyle(green, '--tpl-accent')).toBe('#047857');
    expect(rootStyle(green, '--ck-deep')).not.toBe(blueDeep);
    expect(rootStyle(green, '--ck-deep')).toBe((cakrawalaVars('#047857') as Record<string, string>)['--ck-deep']);
    cleanup();

    const yellow = demo({ brand: { accent_color: '#FACC15' } });
    expect(rootStyle(yellow, '--tpl-on-accent')).toBe('#121620');
    // Tombol utama memakai warna kontras otomatis, bukan putih tetap
    const submit = section(yellow, 'ppdb').querySelector('button[type="submit"]')!;
    expect(submit.className).toContain('text-(--tpl-on-accent)');
    expect(submit.className).toContain('bg-(--tpl-accent)');
  });
});

describe('Cakrawala: SEO situs pembeli', () => {
  it('judul tab & meta description terbaca sebagai website sekolah', () => {
    expect(siteTitle('cakrawala', null)).toBe('SMK Cakrawala Karya — Sekolah Vokasi Swasta di Bandung');
    const restore = applySiteHead('cakrawala', null);
    expect(document.title).toBe('SMK Cakrawala Karya — Sekolah Vokasi Swasta di Bandung');
    const description = document.head.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
    expect(description).toMatch(/^SMK swasta di Kota Bandung dengan enam program keahlian/);
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(200);
    expect(document.head.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#1D4ED8');
    restore();
  });

  it('satu H1, tiap section diawali H2 (kartu info: H2 untuk pembaca layar), H3 hanya di bawah H2', () => {
    const container = demo();
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelectorAll('h4, h5, h6')).toHaveLength(0);
    for (const key of ORDER.filter((k) => k !== 'hero')) {
      const levels = Array.from(section(container, key).querySelectorAll('h1, h2, h3')).map((h) => h.tagName);
      expect(levels[0], key).toBe('H2');
      expect(levels.filter((l) => l === 'H2'), key).toHaveLength(1);
    }
    expect(section(container, 'hero').querySelector('h2')).toBeNull();
  });

  it('gambar: alt deskriptif berbahasa Indonesia, width/height, srcset & sizes; hanya foto slide 1 yang eager', () => {
    const container = demo();
    const imgs = Array.from(container.querySelectorAll('img'));
    expect(imgs.length).toBeGreaterThan(15);
    for (const img of imgs) {
      const src = img.getAttribute('src') ?? '';
      expect(img.hasAttribute('alt'), src).toBe(true);
      // Logo sekolah = SVG vektor di menu/footer bertinggi tetap: tanpa srcset/sizes, dan tidak memuat duluan
      if (src.endsWith('.svg')) {
        expect(src, 'hanya logo demo').toBe('/assets/templates/logos/tut-wuri-handayani.svg');
        expect(img.closest('header, footer'), src).not.toBeNull();
        continue;
      }
      expect(Number(img.getAttribute('width')), src).toBeGreaterThan(0);
      expect(Number(img.getAttribute('height')), src).toBeGreaterThan(0);
      expect(img.getAttribute('srcset'), src).toMatch(/ (800|240)w, /);
      expect(img.getAttribute('sizes'), src).toBeTruthy();
      if (!img.className.includes('rounded-full')) expect(img.getAttribute('alt')!.split(' ').length, src).toBeGreaterThanOrEqual(5);
    }
    // Logo menu ikut dimuat di awal (di atas lipatan; berkas yang sama dipakai ulang di footer)
    const eager = imgs.filter((img) => img.getAttribute('loading') !== 'lazy' && !img.getAttribute('src')?.endsWith('.svg'));
    expect(eager.map((img) => img.getAttribute('src'))).toEqual(['/assets/templates/photos/cakrawala-hero-1-1920.webp']);
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

describe('Cakrawala: konten opsional kosong', () => {
  it('hero tanpa foto → latar gradasi, tanpa slider; kartu info dimatikan → hero tanpa ruang tumpang', () => {
    const container = demo({ hero: { image: '', slides: [], trust_text: '', card_title: '', card_text: '' }, highlights: { enabled: false } });
    const hero = section(container, 'hero');
    expect(hero.querySelector('img')).toBeNull();
    expect(hero.querySelector('.ck-hero-fallback')).not.toBeNull();
    expect(within(hero).queryByRole('group', { name: 'Kontrol slide' })).toBeNull();
    expect(hero.hasAttribute('aria-roledescription')).toBe(false);
    expect(hero.innerHTML).not.toContain('@5xl:pb-[136px]');
    expect(sectionKeys(container)).not.toContain('highlights');
  });

  it('SMA: Program keahlian → Peminatan, BKK & teaching factory disembunyikan; formulir memakai peminatan', () => {
    const container = demo({
      programs: { eyebrow: 'Peminatan', title: 'Tiga peminatan', items: [{ code: 'MIPA', name: 'Matematika dan Ilmu Pengetahuan Alam' }, { code: 'IPS', name: 'Ilmu Pengetahuan Sosial' }] },
      careers: { enabled: false },
      industry: { enabled: false },
      highlights: { items: [{ title: 'PPDB online', text: 'Daftar', link_label: 'Daftar' }] },
    });
    expect(sectionKeys(container)).not.toContain('careers');
    expect(sectionKeys(container)).not.toContain('industry');
    const nav = within(container.querySelector('header')!).getAllByRole('navigation', { name: 'Menu utama' })[0];
    expect(nav.textContent).toContain('Peminatan');
    expect(nav.textContent).not.toContain('BKK');
    // Formulir PPDB memakai sebutan dari label kecil "Peminatan" (bukan istilah SMK "program keahlian")
    const ppdb = section(container, 'ppdb');
    expect(within(ppdb).getByRole('form').textContent).not.toMatch(/program keahlian/i);
    const select = within(ppdb).getByLabelText('Pilihan peminatan') as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.value)).toEqual(['', 'MIPA — Matematika dan Ilmu Pengetahuan Alam', 'IPS — Ilmu Pengetahuan Sosial']);
    expect(select.options[0].textContent).toBe('Pilih peminatan');
    fireEvent.click(within(ppdb).getByRole('button', { name: /Kirim lewat WhatsApp/ }));
    expect(select).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById(select.getAttribute('aria-describedby')!)).toHaveTextContent('Pilih peminatan.');
  });

  it('Berita disembunyikan: pengumuman & agenda punya jarak atas sendiri (tidak menempel di panel PPDB)', () => {
    const wrapper = (container: HTMLElement) => section(container, 'announcements').parentElement!.parentElement!;
    const PAD = 'pt-14';
    // Bawaan: jarak dari bawah section Berita, wadah tanpa jarak atas sendiri
    expect(wrapper(demo()).className).not.toContain(PAD);
    cleanup();
    expect(wrapper(demo({ news: { enabled: false } })).className).toContain(PAD);
    cleanup();
    // Berita aktif tetapi tanpa judul → tidak dirender → sama dengan disembunyikan
    expect(wrapper(demo({ news: { items: [{ title: '', excerpt: 'x' }] } })).className).toContain(PAD);
    cleanup();
    // Berita & PPDB disembunyikan → tepat di bawah Prestasi yang sudah punya jarak bawah → tanpa jarak ganda
    const c = demo({ news: { enabled: false }, ppdb: { enabled: false } });
    expect(sectionKeys(c).slice(sectionKeys(c).indexOf('achievements'), sectionKeys(c).indexOf('achievements') + 2)).toEqual(['achievements', 'announcements']);
    expect(wrapper(c).className).not.toContain(PAD);
  });

  it('nama mitra industri panjang (40 huruf) boleh turun baris, tidak melebar keluar panel di HP', () => {
    const long = 'PT Nusantara Teknologi Rekayasa Industri';
    expect(long).toHaveLength(40);
    const industry = section(demo({ industry: { partners: [{ name: long, logo: '' }] } }), 'industry');
    const name = within(industry).getByText(long);
    expect(name.className).not.toContain('whitespace-nowrap');
    expect(name.className).toContain('min-w-0');
    expect(name.closest('li')!.className).toContain('max-w-full');
    expect(name.closest('li')!.className).toContain('min-w-0');
  });

  it('tanpa WhatsApp: formulir PPDB diganti tombol ke Kontak, lamaran BKK & tanya program ke Kontak', () => {
    const container = demo({ contact: { whatsapp: '' } });
    const ppdb = section(container, 'ppdb');
    expect(within(ppdb).queryByRole('form')).toBeNull();
    expect(within(ppdb).getByRole('link', { name: 'Hubungi panitia' })).toHaveAttribute('href', '#kontak');
    expect(within(section(container, 'careers')).getAllByRole('link', { name: /Lamar via BKK/ })[0]).toHaveAttribute('href', '#kontak');
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
  });

  it('nomor WhatsApp panitia PPDB terpisah dari nomor sekolah', () => {
    const ppdb = section(demo({ ppdb: { whatsapp: '085700001111', paths: [], programs: [] }, programs: { enabled: false } }), 'ppdb');
    const form = within(ppdb).getByRole('form');
    expect(within(form).queryByLabelText('Pilihan program keahlian')).toBeNull();
    expect(within(form).queryByLabelText('Jalur pendaftaran')).toBeNull();
    fireEvent.change(within(form).getByLabelText('Nama lengkap calon siswa'), { target: { value: 'Bima Sakti' } });
    fireEvent.change(within(form).getByLabelText('Asal sekolah (SMP/MTs)'), { target: { value: 'MTs Al Ikhlas' } });
    fireEvent.change(within(form).getByLabelText('Nomor WhatsApp orang tua/siswa'), { target: { value: '081298765432' } });
    act(() => {
      fireEvent.submit(form);
    });
    expect(within(ppdb).getByRole('link', { name: 'Buka WhatsApp' }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/6285700001111\?text=/);
  });
});

describe('Cakrawala: pratinjau CMS', () => {
  it('pratinjau diam (gerak mati bila Component dirender langsung) dan tanpa tautan wa.me / Google Maps yang terbuka', () => {
    const { container } = render(<def.Component content={resolveContent(def, null)} preview />);
    expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'off');
    expect(container.querySelector('.ck-progress')).toHaveAttribute('data-run', 'false');
    expect(container.querySelector('[aria-label="Jeda slide otomatis"]')).toBeNull();
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    expect(container.querySelector('a[href^="https://www.google.com/maps"]')).toBeNull();
    // Slide tetap bisa dipilih manual
    fireEvent.click(within(container).getByRole('button', { name: 'Slide 3 dari 4' }));
    expect(container.querySelector('h1')!.textContent).toBe('Praktik di bengkel berstandar industri');
  });
});

describe('Cakrawala: editor CMS', () => {
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
        fireEvent.click(box.getByRole('button', { name: new RegExp(`^${f.itemLabel} 1(?![0-9])`) }));
        for (const sub of f.fields) expect(container.textContent, `${s.key}.${f.key}.${sub.key}`).toContain(sub.label);
      }
      unmount();
    }
  }, 60_000);

  it('warna tema memakai field warna CMS (pilihan cepat + hex sendiri)', () => {
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
    // Bantuan hanya menunjuk pilihan cepat yang memang ada; biru bawaan (#1D4ED8, bukan pilihan cepat) lewat "Pakai bawaan"
    const help = ('help' in color && color.help) || '';
    expect(help).toContain('hijau #047857');
    expect(help).toContain('"Pakai bawaan" untuk biru bawaan #1D4ED8');
    expect(within(container).queryByRole('button', { name: 'Pakai warna #1D4ED8' })).toBeNull();
  });
});

describe('Cakrawala: data katalog', () => {
  const sql = (file: string) => readFileSync(resolve(ROOT, file), 'utf8');

  it.each(['database/seed.templates.sql', 'database/migrations/2026-10-25_025_cakrawala_template.sql'])(
    '%s: baris cakrawala dengan template_code, kategori, harga, dan pratinjau tangkapan layar .webp',
    (file) => {
      const text = sql(file);
      expect(text).toContain("'cakrawala'");
      expect(text).toContain("'Sekolah & Pendidikan'");
      expect(text).toContain('1690000.00');
      expect(text).toContain("'/assets/templates/cakrawala-preview.webp'");
      expect(text).toContain('\'["/assets/templates/cakrawala-1.webp","/assets/templates/cakrawala-2.webp"]\'');
      expect(text).toMatch(/menyusun pesan WhatsApp untuk panitia; tidak ada penyimpanan data pendaftar atau pembayaran online/);
    },
  );

  it('migrasi 025 aman diulang (INSERT IGNORE + UPDATE berdasarkan slug, tanpa DELETE) dan tercatat di schema_migrations', () => {
    const text = sql('database/migrations/2026-10-25_025_cakrawala_template.sql').replace(/^--.*$/gm, '');
    expect(text).toMatch(/INSERT IGNORE INTO templates/);
    expect(text).toMatch(/WHERE slug = 'cakrawala';/);
    expect(text).toMatch(/sort_order\s+= 13/);
    expect(text).toMatch(/status\s+= 'published'/);
    expect(text).not.toMatch(/\bDELETE\b/);
    expect(text).toContain("VALUES ('2026-10-25_025', 'templates: katalog Cakrawala')");
  });

  it('gambar pratinjau katalog ada di public/, 1600×1000, dan ringan', () => {
    for (const name of ['cakrawala-preview', 'cakrawala-1', 'cakrawala-2']) {
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

describe('Cakrawala: konten aneh', () => {
  it('angka, null, dan string di tempat list tidak membuat crash; tautan berbahaya dibuang', () => {
    const weird = {
      hero: { slides: 'x', highlight: 'tidak ada di judul', primary_url: 'javascript:alert(1)', card_title: 5 },
      highlights: { items: [null, { title: 3 }] },
      stats: { items: [{ value: 7 }, 'x'] },
      programs: { items: [{ code: 1, name: null, skills: 4 }] },
      industry: { partners: [{ name: 'X', logo: 'javascript:alert(1)' }], units: 'x' },
      ppdb: { paths: [{ name: 2 }], schedule: [{ date: '2026-13-40', title: 'Tes' }], fees: 'x', whatsapp: 'abc' },
      news: { items: [{ title: 'Berita', date: 9, category: null, url: 'javascript:alert(1)' }] },
      announcements: { items: [{ title: 'P', badge: 3 }] },
      agenda: { items: [{ title: 'A', date: 'besok' }] },
      careers: { items: [{ position: 'Teknisi', url: 'javascript:alert(1)' }] },
      faq: { items: [{ question: 2, answer: null }] },
      brand: { accent_color: 'biru' },
    } as unknown as SiteContent;
    const { container } = render(<def.Component content={resolveContent(def, weird)} />);
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
    expect(section(container, 'agenda').textContent).toContain('besok');
    expect(container.querySelector('h1')!.textContent).toBe('Terampil hari ini, siap berkarya esok hari');
  });
});
