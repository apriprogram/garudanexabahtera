// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/madani.test.tsx
// Madani (template website sekolah Islam 2026-10-25): skema CMS & konten demo (kelengkapan skema ↔ konten), helper model
// (warna tema & sorotan, menu, slide hero, tanggal, peta, formulir PPDB), demo (urutan section, satu H1, hero slider
// berbingkai dengan kontrol & geser, tab profil, statistik, program, prestasi, PPDB: jalur, linimasa, formulir → pesan
// WhatsApp; berita buka di tempat, pengumuman & agenda, galeri, alumni, FAQ, ajakan, peta, footer), ganti warna tema,
// SEO situs pembeli, konten opsional kosong, pratinjau CMS diam, editor CMS, data katalog (migrasi 024 + seed + pratinjau),
// dan konten aneh.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionEditor } from '../../pages/account/cms/SectionEditor';
import { validateContent } from '../../pages/account/cms/validation';
import { TEMPLATES, resolveContent } from '../index';
import { iconKey } from '../madani/icons';
import { CREAM, autoHighlight, heroSlides, lines, madaniVars, mapFor, navItems, parseSchoolDate, ppdbMessage, validatePpdb, EMPTY_PPDB } from '../madani/model';
import { MADANI_PHOTOS } from '../madani/photos';
import { applySiteHead, siteTitle } from '../siteHead';
import { SiteRenderer } from '../SiteRenderer';
import { contrast, parseHex } from '../shared/utils';
import { isListField, type SiteContent } from '../types';

const ROOT = process.cwd();
const def = TEMPLATES.madani;
const ORDER = [
  'hero',
  'highlights',
  'welcome',
  'about',
  'stats',
  'programs',
  'achievements',
  'facilities',
  'ppdb',
  'news',
  'announcements',
  'agenda',
  'gallery',
  'alumni',
  'faq',
  'cta',
  'contact',
];
const sectionKeys = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-tpl-section]')).map((s) => s.getAttribute('data-tpl-section'));
const section = (root: HTMLElement, key: string) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`)!;
const demo = (content: unknown = null, preview = false) => render(<SiteRenderer templateCode="madani" content={content} preview={preview} />).container;
const rgb = (hex: string) => parseHex(hex)!;
const publicFile = (url: string) => resolve(ROOT, 'public', url.replace(/^\//, ''));
const WHITE = rgb('#ffffff');

let scrolled: (string | null)[] = [];
beforeEach(() => {
  scrolled = [];
  Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
    scrolled.push(this.getAttribute('data-tpl-section') ?? this.tagName.toLowerCase());
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Madani: skema & konten bawaan', () => {
  it('urutan form = urutan halaman, semua section (kecuali identitas) bisa disembunyikan, field unik, list berbatas', () => {
    expect(def.code).toBe('madani');
    expect(def.name).toBe('Madani');
    expect(def.sections.map((s) => s.key)).toEqual(['brand', ...ORDER, 'footer']);
    const brand = def.sections[0];
    expect(brand.fields.map((f) => f.key)).toEqual(['company_name', 'tagline', 'logo', 'accent_color', 'highlight_color']);
    expect(brand.fields.filter((f) => f.type === 'color').map((f) => f.key)).toEqual(['accent_color', 'highlight_color']);
    for (const s of def.sections) {
      if (s.key !== 'brand') expect(s.toggleable, s.key).toBe(true);
      const keys = s.fields.map((f) => f.key);
      expect(new Set(keys).size, s.key).toBe(keys.length);
      for (const f of s.fields) if (isListField(f)) expect(f.max, `${s.key}.${f.key}`).toBeGreaterThan(0);
      expect(def.defaultContent[s.key], s.key).toBeTypeOf('object');
      expect(s.introduced).toBeUndefined();
    }
  });

  it('skema lengkap: setiap isi demo punya field CMS dan setiap field CMS ada di konten demo (juga isi list)', () => {
    for (const s of def.sections) {
      const content = def.defaultContent[s.key] as Record<string, unknown>;
      const schemaKeys = s.fields.map((f) => f.key).sort();
      const contentKeys = Object.keys(content).filter((k) => k !== 'enabled').sort();
      expect(contentKeys, s.key).toEqual(schemaKeys);
      for (const f of s.fields) {
        if (!isListField(f)) continue;
        const items = content[f.key] as Record<string, string>[];
        expect(Array.isArray(items), `${s.key}.${f.key}`).toBe(true);
        expect(items.length, `${s.key}.${f.key}`).toBeLessThanOrEqual(f.max!);
        const sub = f.fields.map((x) => x.key).sort();
        for (const item of items) expect(Object.keys(item).sort(), `${s.key}.${f.key}`).toEqual(sub);
      }
    }
  });

  it('konten demo lolos validasi CMS, logo kosong, semua foto terdaftar, ada di public/, dan tercatat di CREDITS.md', () => {
    const c = def.defaultContent;
    expect(validateContent(def, resolveContent(def, null))).toEqual({});
    expect(c.brand.logo).toBe('');
    expect(c.brand.accent_color).toBe('#1B6B47');
    expect(c.hero.image).toBe('/assets/templates/photos/madani-hero-1920.webp');
    const photos = JSON.stringify(c).match(/\/assets\/templates\/photos\/[a-z0-9-]+\.webp/g) ?? [];
    expect(photos.length).toBeGreaterThanOrEqual(25);
    for (const src of photos) expect(MADANI_PHOTOS.asset(src), src).not.toBeNull();
    const credits = readFileSync(resolve(ROOT, 'public/assets/templates/photos/CREDITS.md'), 'utf8');
    for (const key of MADANI_PHOTOS.keys) {
      const asset = MADANI_PHOTOS.asset(MADANI_PHOTOS.src(key))!;
      const urls = [asset.src, ...asset.srcSet!.split(',').map((part) => part.trim().split(' ')[0])];
      for (const url of urls) expect(existsSync(publicFile(url)), url).toBe(true);
      expect(credits, key).toContain(`\`${key}-*\``);
      expect(photos, `${key} dipakai di konten demo`).toContain(MADANI_PHOTOS.src(key));
    }
    expect(existsSync(publicFile('/assets/templates/logos/madani-mark.svg'))).toBe(true);
  });

  it('salinan demo jujur: sekolah fiktif, formulir tanpa penyimpanan data, pembayaran tidak lewat website', () => {
    const text = JSON.stringify(def.defaultContent);
    expect(text).toMatch(/tidak menyimpan data/);
    expect(text).toMatch(/tidak lewat website/);
    expect(text).toMatch(/Website ini tidak menerima pembayaran/);
    expect(text).not.toMatch(/dijamin|pasti diterima|lulus 100%|terbaik se-Indonesia|e-rapor/i);
  });
});

describe('Madani: helper model', () => {
  it('warna tema: pita gelap ≥ 11:1, tinta tema ≥ 4,5:1 di krem, teks di atas sorotan ≥ 4,5:1, sorotan di pita gelap ≥ 4,5:1', () => {
    for (const accent of ['#1B6B47', '#1D4ED8', '#FFE600', '#7C3AED', '#B91C1C', '#111111', '#E0F2FE']) {
      const v = madaniVars(accent) as Record<string, string>;
      expect(contrast(rgb(v['--md-deep']), WHITE), accent).toBeGreaterThanOrEqual(11);
      expect(contrast(rgb(v['--md-ink']), CREAM), accent).toBeGreaterThanOrEqual(4.5);
      expect(contrast(rgb(v['--md-hl']), rgb(v['--md-on-hl'])), accent).toBeGreaterThanOrEqual(4.5);
      expect(contrast(rgb(v['--md-hl-ink']), rgb(v['--md-deep'])), accent).toBeGreaterThanOrEqual(4.5);
      expect(v['--md-primary'], accent).toBe(accent.toLowerCase());
    }
    expect(madaniVars('bukan warna')).toEqual(madaniVars('#1B6B47'));
    // Warna sorotan dari CMS dipakai apa adanya; kosong/tidak valid → otomatis
    expect((madaniVars('#1D4ED8', '#FACC15') as Record<string, string>)['--md-hl']).toBe('#facc15');
    expect(madaniVars('#1D4ED8', 'kuning')).toEqual(madaniVars('#1D4ED8', ''));
  });

  it('sorotan otomatis: hijau tua → hijau limau, biru → hijau mint (bukan warna yang sama dengan tema)', () => {
    const hue = (c: number[]) => {
      const [r, g, b] = c.map((x) => x / 255);
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const d = max - min;
      const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return (h * 60 + 360) % 360;
    };
    const lime = autoHighlight(rgb('#1B6B47'));
    expect(hue(lime)).toBeGreaterThan(65);
    expect(hue(lime)).toBeLessThan(95);
    const mint = autoHighlight(rgb('#1D4ED8'));
    expect(hue(mint)).toBeGreaterThan(130);
    expect(hue(mint)).toBeLessThan(175);
  });

  it('menu mengikuti section yang tampil dan berisi', () => {
    const content = resolveContent(def, null);
    expect(navItems(content).map((i) => i.label)).toEqual(['Profil', 'Program', 'Prestasi', 'PPDB', 'Berita', 'Galeri', 'Kontak']);
    const edited = resolveContent(def, { achievements: { enabled: false }, news: { items: [] }, ppdb: { enabled: 'false' } });
    expect(navItems(edited).map((i) => i.key)).toEqual(['about', 'programs', 'gallery', 'contact']);
  });

  it('slide hero: slide pertama = isi hero, slide tambahan hanya yang berfoto (maks. 3), teks kosong ikut slide pertama', () => {
    const base = { image: '/a.webp', eyebrow: 'Label', title: 'Judul utama', highlight: 'utama', subtitle: 'Deskripsi' };
    expect(heroSlides({ ...base, slides: [{ image: '', title: 'Tanpa foto' }, { image: '/b.webp' }, { image: '/c.webp', title: 'Judul C', highlight: 'C' }] }, 'Sekolah')).toEqual([
      base,
      { ...base, image: '/b.webp' },
      { image: '/c.webp', eyebrow: 'Label', title: 'Judul C', highlight: 'C', subtitle: 'Deskripsi' },
    ]);
    expect(heroSlides({}, 'Sekolah')).toEqual([{ image: '', eyebrow: '', title: 'Sekolah', highlight: '', subtitle: '' }]);
    expect(heroSlides({ slides: Array.from({ length: 6 }, (_, i) => ({ image: `/s${i}.webp` })) }, 'S')).toHaveLength(4);
    expect(heroSlides({ slides: [{ image: 'javascript:alert(1)' }] }, 'S')).toHaveLength(1);
  });

  it('tanggal sekolah: format tahun-bulan-tanggal & tanggal/bulan/tahun → bahasa Indonesia; teks bebas/tanggal mustahil → null', () => {
    expect(parseSchoolDate('2026-11-14')).toEqual({ iso: '2026-11-14', day: '14', month: 'Nov', year: '2026', weekday: 'Sab', short: '14 Nov 2026', long: '14 November 2026' });
    expect(parseSchoolDate('5/2/2027')?.long).toBe('5 Februari 2027');
    expect(parseSchoolDate('2027-02-05')?.weekday).toBe('Jum');
    expect(parseSchoolDate('2026-02-30')).toBeNull();
    expect(parseSchoolDate('Minggu depan')).toBeNull();
    expect(parseSchoolDate('')).toBeNull();
  });

  it('daftar per baris, peta dari kata kunci/alamat, ikon otomatis', () => {
    expect(lines('- Satu\n\n• Dua\r\n✓ Tiga  \n')).toEqual(['Satu', 'Dua', 'Tiga']);
    const fromAddress = mapFor({ address: 'Jl. Raya Cendekia No. 17, Bogor' });
    expect(fromAddress.embed).toBe(`https://maps.google.com/maps?q=${encodeURIComponent('Jl. Raya Cendekia No. 17, Bogor')}&z=15&output=embed`);
    expect(fromAddress.link).toContain('google.com/maps/search/');
    const fromQuery = mapFor({ address: 'Jl. X', maps_query: 'SMA IT Nurul Azka Bogor', maps_url: 'https://maps.app.goo.gl/abc' });
    expect(fromQuery.embed).toContain(encodeURIComponent('SMA IT Nurul Azka Bogor'));
    expect(fromQuery.link).toBe('https://maps.app.goo.gl/abc');
    const embed = mapFor({ address: 'Jl. X', maps_url: '<iframe src="https://www.google.com/maps/embed?pb=123"></iframe>' });
    expect(embed.embed).toBe('https://www.google.com/maps/embed?pb=123');
    expect(mapFor({}).embed).toBeNull();
    expect(iconKey('Akreditasi A (Unggul)')).toBe('award');
    expect(iconKey('Masjid Sekolah')).toBe('mosque');
    expect(iconKey('Tahfidz Al-Qur’an')).toBe('quran');
    expect(iconKey('Laboratorium Komputer')).toBe('computer');
    expect(iconKey('Laboratorium IPA')).toBe('science');
    expect(iconKey('Asrama Putra & Putri')).toBe('boarding');
    expect(iconKey('Sesuatu', 1)).toBe('award');
  });

  it('formulir PPDB: validasi per field (jalur & program hanya bila ada pilihannya) dan pesan WhatsApp berisi data yang diisi saja', () => {
    const opts = { tracks: ['Reguler', 'Tahfidz'], programs: ['Asrama (boarding)'] };
    expect(Object.keys(validatePpdb(EMPTY_PPDB, opts)).sort()).toEqual(['gender', 'parent', 'phone', 'program', 'school', 'student', 'track']);
    expect(Object.keys(validatePpdb(EMPTY_PPDB, { tracks: [], programs: [] })).sort()).toEqual(['gender', 'parent', 'phone', 'school', 'student']);
    const ok = { ...EMPTY_PPDB, student: 'Fatimah Azzahra', gender: 'Putri', school: 'SMP IT Al-Ihsan', track: 'Tahfidz', program: 'Asrama (boarding)', parent: 'Ahmad Fauzi', phone: '0812-3456-7890' };
    expect(validatePpdb(ok, opts)).toEqual({});
    expect(validatePpdb({ ...ok, phone: '12345' }, opts).phone).toMatch(/WhatsApp/);
    expect(validatePpdb({ ...ok, track: 'Jalur lain' }, opts).track).toBeTruthy();
    const message = ppdbMessage(ok, { school: 'SMA IT Nurul Azka', period: 'PPDB 2027/2028' });
    expect(message).toBe(
      [
        'Assalamu’alaikum, Panitia PPDB SMA IT Nurul Azka.',
        'Saya ingin mendaftar PPDB 2027/2028. Berikut data calon siswa:',
        '',
        'Nama calon siswa: Fatimah Azzahra',
        'Jenis kelamin: Putri',
        'Asal sekolah: SMP IT Al-Ihsan',
        'Jalur: Tahfidz',
        'Program: Asrama (boarding)',
        'Nama orang tua/wali: Ahmad Fauzi',
        'No. WhatsApp: 0812-3456-7890',
        '',
        'Mohon informasi langkah berikutnya. Terima kasih.',
      ].join('\n'),
    );
  });
});

describe('Madani: demo', () => {
  it('urutan section, satu H1, hero berbingkai berfoto (hanya foto pertama eager), menu pil dengan tombol PPDB', () => {
    const container = demo();
    expect(sectionKeys(container)).toEqual(ORDER);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const hero = section(container, 'hero');
    expect(hero.getAttribute('data-hero-layout')).toBe('framed-slider');
    expect(hero.getAttribute('data-tpl-tone')).toBe('inverse');
    const h1 = hero.querySelector('h1')!;
    expect(h1.textContent).toBe('Tumbuh Berilmu, Berakhlak, dan Berprestasi');
    expect(h1.querySelector('span')?.textContent).toBe('Berakhlak');
    const img = hero.querySelector<HTMLImageElement>('img[fetchpriority="high"]')!;
    expect(img.getAttribute('src')).toBe('/assets/templates/photos/madani-hero-1920.webp');
    expect(img.getAttribute('srcset')).toBe('/assets/templates/photos/madani-hero-800.webp 800w, /assets/templates/photos/madani-hero-1920.webp 1920w');
    expect(img.getAttribute('loading')).toBe('eager');
    expect(img.getAttribute('width')).toBe('1920');
    expect(img.getAttribute('height')).toBe('1200');
    expect(img.getAttribute('alt')).toMatch(/siswi berjilbab/i);
    expect(container.querySelectorAll('img[fetchpriority="high"]')).toHaveLength(1);
    expect(Array.from(container.querySelectorAll('img')).filter((i) => i.getAttribute('loading') !== 'lazy')).toHaveLength(1);

    const header = container.querySelector('header')!;
    expect(header.className).toContain('h-0');
    expect(header.getAttribute('data-tpl-tone')).toBe('inverse');
    const nav = within(header).getAllByRole('navigation', { name: 'Menu utama' })[0];
    expect(Array.from(nav.querySelectorAll('a')).map((a) => a.textContent)).toEqual(['Profil', 'Program', 'Prestasi', 'PPDB', 'Berita', 'Galeri', 'Kontak']);
    expect(within(header).getByRole('link', { name: 'PPDB 2027' })).toHaveAttribute('href', '#ppdb');
    expect(header.querySelector('svg[viewBox="0 0 32 32"]'), 'MadaniMark').not.toBeNull();
  });

  it('hero: tombol Daftar PPDB ke bagian PPDB, Profil Sekolah ke Profil, kartu info PPDB', () => {
    const hero = section(demo(), 'hero');
    expect(within(hero).getByRole('link', { name: 'Daftar PPDB' })).toHaveAttribute('href', '#ppdb');
    expect(within(hero).getByRole('link', { name: 'Profil Sekolah' })).toHaveAttribute('href', '#tentang');
    const card = within(hero).getByRole('link', { name: /Gelombang 1 dibuka/ });
    expect(card).toHaveAttribute('href', '#ppdb');
    expect(card.textContent).toContain('Akreditasi A');
    expect(card.textContent).toContain('1 Desember 2026 – 31 Januari 2027');
  });

  it('hero slider: 4 slide, titik per slide, sebelumnya/berikutnya, panah keyboard, geser di HP, jeda; tetap satu H1', () => {
    const hero = section(demo(), 'hero');
    expect(hero.getAttribute('aria-roledescription')).toBe('carousel');
    const controls = within(hero).getByRole('group', { name: 'Kontrol slide' });
    const dots = within(controls).getAllByRole('button', { name: /^Slide \d dari 4$/ });
    expect(dots).toHaveLength(4);
    expect(dots[0]).toHaveAttribute('aria-current', 'true');
    expect(controls.textContent).toContain('01 / 04');
    // Demo bergerak: bilah progres berjalan (memicu slide berikut saat animasinya selesai) dan bisa dijeda
    expect(controls.querySelector('.md-progress')).toHaveAttribute('data-run', 'true');
    fireEvent.click(within(controls).getByRole('button', { name: 'Jeda slide otomatis' }));
    expect(within(controls).getByRole('button', { name: 'Putar slide otomatis' })).toBeInTheDocument();
    expect(controls.querySelector('.md-progress')).toHaveAttribute('data-run', 'false');

    fireEvent.click(within(controls).getByRole('button', { name: 'Slide berikutnya' }));
    expect(dots[1]).toHaveAttribute('aria-current', 'true');
    expect(hero.querySelector('h1')!.textContent).toBe('Belajar Nyaman di Lingkungan yang Asri');
    fireEvent.click(dots[2]);
    expect(dots[2]).toHaveAttribute('aria-current', 'true');
    expect(hero.querySelector('h1')!.textContent).toBe('Adab Dahulu, Lalu Ilmu');
    expect(within(hero).getByText('Pembinaan adab setiap pekan')).toBeInTheDocument();
    fireEvent.keyDown(controls, { key: 'ArrowRight' });
    expect(dots[3]).toHaveAttribute('aria-current', 'true');
    fireEvent.keyDown(controls, { key: 'ArrowRight' });
    expect(dots[0]).toHaveAttribute('aria-current', 'true');
    fireEvent.click(within(controls).getByRole('button', { name: 'Slide sebelumnya' }));
    expect(dots[3]).toHaveAttribute('aria-current', 'true');

    // Geser ke kiri di HP → slide berikutnya; geser vertikal (gulir) diabaikan
    const frame = hero.firstElementChild as HTMLElement;
    fireEvent.touchStart(frame, { touches: [{ clientX: 300, clientY: 400 }] });
    fireEvent.touchEnd(frame, { changedTouches: [{ clientX: 160, clientY: 410 }] });
    expect(dots[0]).toHaveAttribute('aria-current', 'true');
    fireEvent.touchStart(frame, { touches: [{ clientX: 200, clientY: 400 }] });
    fireEvent.touchEnd(frame, { changedTouches: [{ clientX: 140, clientY: 200 }] });
    expect(dots[0]).toHaveAttribute('aria-current', 'true');

    // Foto slide lain dimuat lazy setelah slide dipilih; alt hanya untuk slide aktif
    const imgs = Array.from(hero.querySelectorAll<HTMLImageElement>('img'));
    expect(imgs.map((i) => i.getAttribute('src'))).toEqual([
      '/assets/templates/photos/madani-hero-1920.webp',
      '/assets/templates/photos/madani-slide-kampus-1920.webp',
      '/assets/templates/photos/madani-slide-kajian-1920.webp',
      '/assets/templates/photos/madani-slide-santri-1920.webp',
    ]);
    expect(imgs.slice(1).every((i) => i.getAttribute('loading') === 'lazy')).toBe(true);
    expect(imgs.map((i) => i.getAttribute('alt') !== '')).toEqual([true, false, false, false]);
    expect(within(hero).getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('strip info, sambutan, tab profil (WAI-ARIA), statistik dengan kartu sorotan terakhir', () => {
    const container = demo();
    expect(section(container, 'highlights').querySelectorAll('li')).toHaveLength(4);
    const welcome = section(container, 'welcome');
    expect(welcome.querySelector('blockquote')?.textContent).toMatch(/adab siswa/);
    expect(welcome.textContent).toContain('Ustadzah Rahmi Fauziah, M.Pd.');

    const about = section(container, 'about');
    const tabs = within(about).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Profil', 'Visi', 'Misi', 'Nilai']);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(within(about).getByRole('tabpanel').textContent).toContain('berdiri sejak 2009');
    fireEvent.click(tabs[1]);
    expect(within(about).getByRole('tabpanel').textContent).toMatch(/generasi Qur’ani/);
    fireEvent.keyDown(tabs[1], { key: 'ArrowRight' });
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[2]).toHaveFocus();
    expect(within(about).getByRole('tabpanel').querySelectorAll('ol li')).toHaveLength(5);
    fireEvent.keyDown(tabs[2], { key: 'End' });
    expect(within(about).getByRole('tabpanel').querySelectorAll('li')).toHaveLength(4);

    const stats = section(container, 'stats');
    const cards = stats.querySelectorAll('dl > div');
    expect(cards).toHaveLength(5);
    expect(cards[4]).toHaveAttribute('data-stat-highlight', 'true');
    expect(stats.querySelectorAll('[data-stat-highlight]')).toHaveLength(1);
  });

  it('program (tanya lewat WhatsApp), prestasi, fasilitas berikon', () => {
    const container = demo();
    const programs = section(container, 'programs');
    expect(within(programs).getByRole('list', { name: 'Daftar program' }).children).toHaveLength(6);
    const ask = within(programs).getByRole('link', { name: 'Tanya tentang Tahfidz Al-Qur’an' });
    expect(decodeURIComponent(ask.getAttribute('href') ?? '')).toContain('Saya ingin bertanya tentang program Tahfidz Al-Qur’an.');
    for (const img of programs.querySelectorAll('img')) expect(img.getAttribute('loading')).toBe('lazy');

    const achievements = section(container, 'achievements');
    expect(within(achievements).getByRole('list', { name: 'Daftar prestasi' }).querySelectorAll('li')).toHaveLength(6);
    expect(achievements.textContent).toContain('127');
    expect(section(container, 'facilities').querySelectorAll('ul li')).toHaveLength(8);
  });

  it('PPDB: tab jalur, tombol "Daftar lewat jalur" memilih jalur di formulir, linimasa, syarat, alur, biaya', () => {
    const ppdb = section(demo(), 'ppdb');
    const tablist = within(ppdb).getByRole('tablist', { name: 'Jalur pendaftaran' });
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Reguler', 'Prestasi', 'Tahfidz', 'Beasiswa Yatim & Dhuafa']);
    expect(within(ppdb).getByRole('tabpanel').textContent).toContain('96 kursi');
    fireEvent.click(tabs[2]);
    const panel = within(ppdb).getByRole('tabpanel');
    expect(panel.textContent).toContain('hafalan Al-Qur’an minimal 5 juz');
    fireEvent.click(within(panel).getByRole('button', { name: 'Daftar lewat jalur Tahfidz' }));
    expect(within(within(ppdb).getByRole('form')).getByLabelText('Jalur pendaftaran')).toHaveValue('Tahfidz');
    expect(scrolled).toContain('form');

    expect(ppdb.textContent).toContain('Gelombang 1 dibuka');
    const timeline = Array.from(ppdb.querySelectorAll('ol')).find((ol) => ol.textContent?.includes('Daftar ulang'))!;
    expect(timeline.querySelectorAll(':scope > li')).toHaveLength(5);
    expect(timeline.textContent).toContain('Dibuka');
    expect(ppdb.textContent).toContain('Pas foto 3×4 berlatar merah (2 lembar)');
    expect(ppdb.textContent).toContain('Langkah 4');
    expect(ppdb.querySelectorAll('dl > div')).toHaveLength(4);
    expect(ppdb.textContent).toContain('tidak lewat website');
  });

  it('PPDB formulir: error per field + fokus; pratinjau menampilkan pesan tanpa membuka WhatsApp', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const ppdb = section(demo(null, true), 'ppdb');
    const form = within(ppdb).getByRole('form', { name: 'Formulir minat pendaftaran' });
    expect(form.textContent).toContain('tidak menyimpan data');
    fireEvent.click(within(form).getByRole('button', { name: /Kirim lewat WhatsApp/ }));
    const student = within(form).getByLabelText('Nama lengkap calon siswa');
    expect(student).toHaveAttribute('aria-invalid', 'true');
    expect(student).toHaveFocus();
    expect(document.getElementById(student.getAttribute('aria-describedby')!)?.textContent).toMatch(/nama lengkap/);
    expect(within(form).getByLabelText('Nomor WhatsApp orang tua')).toHaveAttribute('aria-invalid', 'true');

    fireEvent.change(student, { target: { value: 'Fatimah Azzahra' } });
    fireEvent.click(within(form).getByLabelText('Putri'));
    fireEvent.change(within(form).getByLabelText('Asal sekolah (SMP/MTs)'), { target: { value: 'SMP IT Al-Ihsan' } });
    fireEvent.change(within(form).getByLabelText('Jalur pendaftaran'), { target: { value: 'Prestasi' } });
    fireEvent.change(within(form).getByLabelText('Program'), { target: { value: 'Asrama (boarding)' } });
    fireEvent.change(within(form).getByLabelText('Nama orang tua / wali'), { target: { value: 'Ahmad Fauzi' } });
    fireEvent.change(within(form).getByLabelText('Nomor WhatsApp orang tua'), { target: { value: '081234567890' } });
    fireEvent.click(within(form).getByRole('button', { name: /Kirim lewat WhatsApp/ }));
    expect(student).not.toHaveAttribute('aria-invalid');
    expect(form.textContent).toContain('Ini pratinjau');
    const message = form.querySelector('[data-ppdb-message]')!.textContent!;
    expect(message).toContain('Panitia PPDB SMA IT Nurul Azka');
    expect(message).toContain('Saya ingin mendaftar PPDB 2027/2028.');
    expect(message).toContain('Jalur: Prestasi');
    expect(message).toContain('Jenis kelamin: Putri');
    expect(open).not.toHaveBeenCalled();
  });

  it('PPDB formulir di situs live: WhatsApp panitia dibuka di tab baru dengan pesan lengkap', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const form = within(section(demo(), 'ppdb')).getByRole('form');
    const fill = (label: string, value: string) => fireEvent.change(within(form).getByLabelText(label), { target: { value } });
    fill('Nama lengkap calon siswa', 'Muhammad Faris');
    fireEvent.click(within(form).getByLabelText('Putra'));
    fill('Asal sekolah (SMP/MTs)', 'MTs Al-Hikmah');
    fill('Jalur pendaftaran', 'Reguler');
    fill('Program', 'Reguler (pulang-pergi)');
    fill('Nama orang tua / wali', 'Siti Aminah');
    fill('Nomor WhatsApp orang tua', '0813 2222 3333');
    fill('Catatan (opsional)', 'Ingin tahu jadwal open house');
    fireEvent.submit(form);
    expect(open).toHaveBeenCalledTimes(1);
    const [href, target] = open.mock.calls[0];
    expect(String(href)).toMatch(/^https:\/\/wa\.me\/6281298760421\?text=/);
    const text = decodeURIComponent(String(href).split('?text=')[1]);
    expect(text).toContain('Nama calon siswa: Muhammad Faris');
    expect(text).toContain('Catatan: Ingin tahu jadwal open house');
    expect(target).toBe('_blank');
    expect(within(form).getByRole('link', { name: 'Buka lagi' })).toHaveAttribute('href', String(href));
  });

  it('berita (isi dibuka di tempat), pengumuman bertanggal dengan lencana Penting, agenda', () => {
    const container = demo();
    const news = section(container, 'news');
    const cards = news.querySelectorAll('article');
    expect(cards).toHaveLength(3);
    expect(cards[0].querySelector('time')).toHaveAttribute('dateTime', '2026-10-12');
    expect(cards[0].textContent).toContain('12 Oktober 2026');
    const more = within(cards[0] as HTMLElement).getByRole('button', { name: /Baca selengkapnya/ });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    const body = document.getElementById(more.getAttribute('aria-controls')!)!;
    expect(body).toHaveAttribute('inert');
    fireEvent.click(more);
    expect(more).toHaveAttribute('aria-expanded', 'true');
    expect(body).not.toHaveAttribute('inert');
    expect(body.textContent).toContain('seleksi tingkat nasional');

    const ann = section(container, 'announcements');
    expect(ann.querySelectorAll('li')).toHaveLength(4);
    expect(ann.querySelectorAll('[data-announcement-badge]')).toHaveLength(2);
    expect(ann.querySelector('time')).toHaveAttribute('dateTime', '2026-10-24');
    expect(within(ann).getByRole('link', { name: /Lihat detail/ })).toHaveAttribute('href', '#ppdb');

    const agenda = section(container, 'agenda');
    expect(agenda.querySelectorAll('li')).toHaveLength(5);
    expect(agenda.textContent).toContain('Sab, 14 Nov 2026');
    expect(agenda.textContent).toContain('Tarhib Ramadan 1448 H');
  });

  it('galeri, alumni, FAQ accordion, ajakan, lokasi dengan peta, footer', () => {
    const container = demo();
    const gallery = section(container, 'gallery');
    expect(gallery.querySelectorAll('figure')).toHaveLength(6);
    expect(gallery.querySelectorAll('figcaption')).toHaveLength(6);

    const alumni = section(container, 'alumni');
    expect(alumni.querySelectorAll('blockquote')).toHaveLength(3);
    expect(alumni.textContent).toContain('94%');
    for (const img of alumni.querySelectorAll('img')) expect(img.getAttribute('srcset')).toContain('-240.webp 240w');

    const faq = section(container, 'faq');
    const buttons = within(faq).getAllByRole('button');
    expect(buttons).toHaveLength(6);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(buttons[3]);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'false');
    expect(buttons[3]).toHaveAttribute('aria-expanded', 'true');
    expect(within(faq).getByRole('link', { name: /Chat panitia PPDB/ })).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\/6281298760421/));

    const cta = section(container, 'cta');
    expect(within(cta).getByRole('link', { name: 'Daftar PPDB' })).toHaveAttribute('href', '#ppdb');
    expect(within(cta).getByRole('link', { name: 'Tanya panitia' })).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\/6281298760421/));

    const contact = section(container, 'contact');
    const iframe = contact.querySelector('iframe')!;
    expect(iframe).toHaveAttribute('title', 'Peta lokasi SMA IT Nurul Azka');
    expect(iframe).toHaveAttribute('loading', 'lazy');
    expect(iframe.getAttribute('src')).toContain(encodeURIComponent('Jl. Raya Cendekia No. 17'));
    expect(within(contact).getByRole('link', { name: 'Buka di Google Maps' })).toHaveAttribute('href', expect.stringContaining('google.com/maps/search/'));
    expect(within(contact).getByRole('link', { name: /WhatsApp\s*081290453318/ })).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\/6281290453318/));
    expect(within(contact).getByRole('link', { name: /Telepon/ })).toHaveAttribute('href', 'tel:+622517530417');
    expect(within(contact).getByRole('list', { name: 'Media sosial sekolah' }).querySelectorAll('a')).toHaveLength(3);

    const footer = container.querySelector('footer')!;
    expect(within(footer).getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://instagram.com/smait.nurulazka');
    expect(within(footer).getByRole('navigation', { name: 'Tautan footer' }).querySelectorAll('a')).toHaveLength(7);
    expect(footer.textContent).toContain(`© ${new Date().getFullYear()} SMA IT Nurul Azka. Semua hak dilindungi.`);
  });

  it('datar: tidak ada kelas shadow di kode template', () => {
    const container = demo();
    const shadows = Array.from(container.querySelectorAll('[class*="shadow"]')).filter(
      (el) => !el.closest('[aria-label="Chat WhatsApp"]') && !/Chat WhatsApp|Kembali ke atas/.test(el.getAttribute('aria-label') ?? ''),
    );
    expect(shadows.map((el) => el.className)).toEqual([]);
  });
});

describe('Madani: warna tema bisa diganti', () => {
  it('warna tema biru dari CMS → variabel aksen Shell & --md-* ikut berubah; sorotan khusus dipakai', () => {
    const root = demo({ brand: { accent_color: '#1D4ED8' } }).querySelector<HTMLElement>('[data-tpl-root]')!;
    expect(root.style.getPropertyValue('--tpl-accent')).toBe('#1d4ed8');
    const madani = root.querySelector<HTMLElement>('[style*="--md-primary"]')!;
    expect(madani.style.getPropertyValue('--md-primary')).toBe('#1d4ed8');
    const blue = madaniVars('#1D4ED8') as Record<string, string>;
    expect(madani.style.getPropertyValue('--md-deep')).toBe(blue['--md-deep']);
    expect(madani.style.getPropertyValue('--md-hl')).toBe(blue['--md-hl']);
    expect(blue['--md-deep']).not.toBe((madaniVars('#1B6B47') as Record<string, string>)['--md-deep']);
    cleanup();
    const custom = demo({ brand: { accent_color: '#1D4ED8', highlight_color: '#FACC15' } }).querySelector<HTMLElement>('[style*="--md-primary"]')!;
    expect(custom.style.getPropertyValue('--md-hl')).toBe('#facc15');
  });
});

describe('Madani: SEO situs pembeli', () => {
  it('judul tab & meta description bawaan terbaca sebagai website sekolah Islam (siteHead dari tagline & deskripsi hero)', () => {
    expect(siteTitle('madani', null)).toBe('SMA IT Nurul Azka — Sekolah Islam Terpadu & Boarding di Bogor');
    const restore = applySiteHead('madani', null);
    expect(document.title).toBe('SMA IT Nurul Azka — Sekolah Islam Terpadu & Boarding di Bogor');
    const description = document.head.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
    expect(description).toMatch(/^SMA Islam Terpadu di Bogor dengan program tahfidz/);
    expect(description).toMatch(/2027\/2028/);
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(200);
    expect(document.head.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#1B6B47');
    restore();
  });

  it('satu H1, lalu tiap section diawali H2 dan H3 hanya di bawah H2 (urutan logis)', () => {
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

  it('gambar: alt deskriptif berbahasa Indonesia, ukuran tetap (width/height), srcset & sizes; hanya foto hero yang eager', () => {
    const container = demo();
    const imgs = Array.from(container.querySelectorAll('img'));
    expect(imgs.length).toBeGreaterThan(20);
    for (const img of imgs) {
      const src = img.getAttribute('src') ?? '';
      expect(img.hasAttribute('alt'), src).toBe(true);
      expect(Number(img.getAttribute('width')), src).toBeGreaterThan(0);
      expect(Number(img.getAttribute('height')), src).toBeGreaterThan(0);
      expect(img.getAttribute('srcset'), src).toMatch(/ (800|240)w, /);
      expect(img.getAttribute('sizes'), src).toBeTruthy();
      // Alt kosong hanya untuk avatar di samping nama (dekoratif)
      if (!img.className.includes('rounded-full')) expect(img.getAttribute('alt')!.split(' ').length, src).toBeGreaterThanOrEqual(5);
    }
    const eager = imgs.filter((img) => img.getAttribute('loading') !== 'lazy');
    expect(eager.map((img) => img.getAttribute('src'))).toEqual(['/assets/templates/photos/madani-hero-1920.webp']);
  });

  it('tautan asli untuk navigasi, tombol bertipe jelas; SVG dekoratif tersembunyi dari pembaca layar', () => {
    const container = demo();
    for (const a of container.querySelectorAll('a')) expect(a.getAttribute('href'), a.textContent ?? '').toMatch(/^(#[a-z]|https:\/\/|mailto:|tel:)/);
    for (const button of container.querySelectorAll('button')) expect(['button', 'submit'], button.textContent ?? '').toContain(button.getAttribute('type'));
    expect(container.querySelectorAll('button[type="submit"]')).toHaveLength(1);
    for (const svg of container.querySelectorAll('svg')) expect(svg.closest('[aria-hidden="true"], [aria-hidden=""]') ?? svg.getAttribute('aria-hidden'), svg.outerHTML.slice(0, 60)).toBeTruthy();
  });
});

describe('Madani: konten opsional kosong', () => {
  it('hero tanpa foto & slide → latar gradasi tanpa img dan tanpa kontrol slide; kartu info kosong → disembunyikan', () => {
    const hero = section(demo({ hero: { image: '', slides: [], card_title: '', card_text: '' } }), 'hero');
    expect(hero.querySelector('img')).toBeNull();
    expect(hero.querySelector('.md-hero-fallback')).not.toBeNull();
    expect(within(hero).queryByRole('group', { name: 'Kontrol slide' })).toBeNull();
    expect(hero.hasAttribute('aria-roledescription')).toBe(false);
    expect(within(hero).queryByRole('link', { name: /Gelombang 1/ })).toBeNull();
    expect(within(hero).getByRole('link', { name: 'Daftar PPDB' })).toBeInTheDocument();
  });

  it('PPDB disembunyikan → tombol Daftar PPDB membuka WhatsApp panitia; tanpa nomor sama sekali → ke Kontak', () => {
    let container = demo({ ppdb: { enabled: false } });
    expect(sectionKeys(container)).not.toContain('ppdb');
    expect(within(section(container, 'hero')).getByRole('link', { name: 'Daftar PPDB' })).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\/6281298760421/));
    cleanup();
    container = demo({ ppdb: { enabled: false, whatsapp: '' }, contact: { whatsapp: '' } });
    expect(within(section(container, 'hero')).getByRole('link', { name: 'Daftar PPDB' })).toHaveAttribute('href', '#kontak');
    expect(within(section(container, 'programs')).getByRole('link', { name: 'Tanya tentang Coding & Robotik' })).toHaveAttribute('href', '#kontak');
  });

  it('pengumuman disembunyikan → agenda selebar penuh; jalur, biaya, dan formulir kosong → bagian itu hilang', () => {
    const container = demo({ announcements: { enabled: false }, ppdb: { tracks: [], fees: [], form_title: '', form_button: '' } });
    expect(sectionKeys(container)).not.toContain('announcements');
    expect(section(container, 'agenda').className).toContain('@5xl:col-span-12');
    const ppdb = section(container, 'ppdb');
    expect(within(ppdb).queryByRole('tablist')).toBeNull();
    expect(within(ppdb).queryByRole('form')).toBeNull();
    expect(ppdb.querySelector('dl')).toBeNull();
    expect(ppdb.textContent).toContain('Jadwal PPDB');
  });

  it('hero dimatikan: header jadi bilah putih biasa', () => {
    const container = demo({ hero: { enabled: false } });
    expect(sectionKeys(container)).toEqual(ORDER.filter((k) => k !== 'hero'));
    const header = container.querySelector('header')!;
    expect(header.className).not.toContain('h-0');
    expect(header.hasAttribute('data-tpl-tone')).toBe(false);
  });
});

describe('Madani: menu HP', () => {
  it('tombol menu membuka panel (aria-expanded), klik tautan menggulir & menutup, Esc menutup dan fokus kembali', () => {
    const container = demo();
    const header = container.querySelector('header')!;
    const toggle = within(header).getByRole('button', { name: 'Buka menu' });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const panel = document.getElementById(toggle.getAttribute('aria-controls')!)!;
    fireEvent.click(within(panel).getByRole('link', { name: 'Berita' }));
    expect(scrolled).toEqual(['news']);
    expect(document.getElementById(toggle.getAttribute('aria-controls')!)).toBeNull();
    fireEvent.click(toggle);
    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
  });
});

describe('Madani: pratinjau CMS', () => {
  it('pratinjau diam (gerak mati bila Component dirender langsung) dan tanpa tautan wa.me', () => {
    const { container } = render(<def.Component content={resolveContent(def, null)} preview />);
    expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'off');
    expect(container.querySelector('.md-progress')).toHaveAttribute('data-run', 'false');
    expect(container.querySelector('[aria-label="Jeda slide otomatis"]')).toBeNull();
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    expect(container.querySelector('a[href^="https://instagram.com"]')).toBeNull();
  });
});

describe('Madani: editor CMS', () => {
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
    // Banyak field + list: bisa lewat 5 dtk saat seluruh suite berjalan paralel
  }, 30_000);

  it('warna tema di CMS: field warna dengan pilihan cepat (hijau & biru) dan isian hex', () => {
    const brand = def.sections[0];
    const { container } = render(
      <SectionEditor
        section={brand}
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
    const presets = within(container).getByRole('group', { name: 'Pilihan cepat warna tema' });
    expect(within(presets).getByRole('button', { name: 'Pakai warna #047857' })).toBeInTheDocument();
    expect(within(presets).getByRole('button', { name: 'Pakai warna #211FFE' })).toBeInTheDocument();
    expect(within(container).getByDisplayValue('#1B6B47')).toBeInTheDocument();
  });
});

describe('Madani: data katalog', () => {
  const sql = (file: string) => readFileSync(resolve(ROOT, file), 'utf8');

  it.each(['database/seed.templates.sql', 'database/migrations/2026-10-25_024_madani_template.sql'])(
    '%s: baris madani dengan template_code, kategori, harga, dan pratinjau tangkapan layar .webp',
    (file) => {
      const text = sql(file);
      expect(text).toContain("'madani'");
      expect(text).toContain("'Sekolah & Pendidikan'");
      expect(text).toContain('1690000.00');
      expect(text).toContain("'/assets/templates/madani-preview.webp'");
      expect(text).toContain('\'["/assets/templates/madani-1.webp","/assets/templates/madani-2.webp"]\'');
      expect(text).toMatch(/fiktif/);
    },
  );

  it('seed: satu statement INSERT IGNORE sendiri untuk madani (sort_order 12, published)', () => {
    const text = sql('database/seed.templates.sql');
    const statement = text.slice(text.indexOf("-- Madani (2026-10-25"));
    expect(statement).toMatch(/^-- Madani[\s\S]*?INSERT IGNORE INTO templates[\s\S]*?'madani', NULL, 'published', 12\);/);
  });

  it('migrasi 024 aman diulang (INSERT IGNORE + UPDATE berdasarkan slug, tanpa DELETE) dan tercatat di schema_migrations', () => {
    const text = sql('database/migrations/2026-10-25_024_madani_template.sql').replace(/^--.*$/gm, '');
    expect(text).toMatch(/INSERT IGNORE INTO templates/);
    expect(text).toMatch(/WHERE slug = 'madani';/);
    expect(text).not.toMatch(/\bDELETE\b/);
    expect(text).toContain("VALUES ('2026-10-25_024', 'templates: katalog Madani')");
  });

  it('gambar pratinjau katalog ada di public/, WebP 1600×1000, dan ringan', () => {
    for (const name of ['madani-preview', 'madani-1', 'madani-2']) {
      const path = resolve(ROOT, `public/assets/templates/${name}.webp`);
      expect(existsSync(path), name).toBe(true);
      const kb = statSync(path).size / 1024;
      expect(kb, name).toBeGreaterThan(10);
      expect(kb, name).toBeLessThan(220);
      const buf = readFileSync(path);
      expect(buf.subarray(8, 12).toString('ascii'), name).toBe('WEBP');
    }
  });
});

describe('Madani: konten aneh', () => {
  it('angka, null, dan string di tempat list tidak membuat crash', () => {
    const weird = {
      hero: { slides: 'x', highlight: 'tidak ada di judul', card_title: 5, primary_url: 'javascript:alert(1)' },
      highlights: { items: [null, { title: 3 }] },
      about: { facts: 'x', missions: [null, { text: 7 }], values: [{ title: 1 }], body: 9 },
      stats: { items: [{ value: 12 }, null] },
      programs: { items: [{ title: 1 }, null, 'x'] },
      ppdb: { tracks: [{ name: 2, requirements: null }], schedule: 'x', fees: [{ name: 'A', amount: 5 }], program_options: 4 },
      news: { items: [{ title: 'Berita', date: 20261012 }] },
      announcements: { items: [{ title: 'P', date: 'bukan tanggal', badge: 1 }] },
      agenda: { items: [{ title: 'A', date: null }] },
      brand: { accent_color: 'hijau', highlight_color: 12 },
    } as unknown as SiteContent;
    const { container } = render(<def.Component content={resolveContent(def, weird)} />);
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
    expect(container.querySelectorAll('h1')).toHaveLength(1);
  });
});
