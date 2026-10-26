// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/bestari.test.tsx
// Bestari (template website SMA 2026-10-26): skema CMS & konten demo, helper model (warna tema, menu, nomor section,
// slide hero, tanggal, filter berita, formulir PPDB SMA dengan tanggal lahir → usia → pesan WhatsApp, ikon otomatis),
// demo (urutan section, hero slider + gerak masuk hanya setelah pergantian, kartu sorotan, profil "+", alasan bernomor,
// program, guru, PPDB bertab + formulir, berita berfilter, pengumuman & agenda, testimoni, galeri, FAQ, kontak + peta,
// footer), kustomisasi warna, SEO situs pembeli, konten opsional kosong, pratinjau CMS diam, editor CMS, data katalog
// (migrasi 028 + seed + gambar pratinjau), dan konten aneh.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionEditor } from '../../pages/account/cms/SectionEditor';
import { validateContent } from '../../pages/account/cms/validation';
import { TEMPLATES, resolveContent } from '../index';
import { iconKey } from '../bestari/icons';
import {
  accentIsDark,
  ageAt,
  bentoCells,
  bestariVars,
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
  readBestari,
  sectionTarget,
  titleTarget,
  todayIso,
  validatePpdb,
  validPhone,
  wrapIndex,
} from '../bestari/model';
import { INPUT } from '../bestari/styles';
import { BESTARI_PHOTOS } from '../bestari/photos';
import { applySiteHead, siteTitle } from '../siteHead';
import { SiteRenderer } from '../SiteRenderer';
import { contrast, parseHex } from '../shared/utils';
import { isListField, type ListItem, type SiteContent } from '../types';

// Demo panjang (19 section) + getByRole di jsdom: bisa lewat 5 dtk saat suite berjalan paralel
vi.setConfig({ testTimeout: 30_000 });

const ROOT = process.cwd();
const def = TEMPLATES.bestari;
const ORDER = [
  'hero',
  'highlights',
  'badges',
  'about',
  'stats',
  'welcome',
  'why',
  'programs',
  'achievements',
  'teachers',
  'ppdb',
  'news',
  'announcements',
  'agenda',
  'testimonials',
  'gallery',
  'faq',
  'contact',
];
const sectionKeys = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-tpl-section]')).map((s) => s.getAttribute('data-tpl-section'));
const section = (root: HTMLElement, key: string) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`)!;
const demo = (content: unknown = null, preview = false) => render(<SiteRenderer templateCode="bestari" content={content} preview={preview} />).container;
const rgb = (hex: string) => parseHex(hex)!;
const publicFile = (url: string) => resolve(ROOT, 'public', url.replace(/^\//, ''));
const rootStyle = (container: HTMLElement, name: string) => {
  const holder = Array.from(container.querySelectorAll<HTMLElement>('[style]')).find((el) => el.style.getPropertyValue(name));
  return holder?.style.getPropertyValue(name) ?? '';
};
const urls = (src: string) => {
  const asset = BESTARI_PHOTOS.asset(src)!;
  return [asset.src, ...asset.srcSet!.split(',').map((part) => part.trim().split(' ')[0])].filter((u, i, all) => all.indexOf(u) === i);
};
const wa = (el: Element | null) => decodeURIComponent(el?.getAttribute('href') ?? '');
const linkList = (root: Element) => Array.from(root.querySelectorAll('a')).map((a) => `${a.textContent}|${a.getAttribute('href')}`);

let scrolled: (string | null)[] = [];
beforeEach(() => {
  scrolled = [];
  Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
    scrolled.push(this.getAttribute('data-tpl-section'));
  });
});
afterEach(cleanup);

describe('Bestari: skema & konten bawaan', () => {
  it('urutan form = urutan halaman, semua section bisa disembunyikan, field unik, list berbatas', () => {
    expect(def.code).toBe('bestari');
    expect(def.name).toBe('Bestari');
    expect(def.sections.map((s) => s.key)).toEqual(['brand', ...ORDER, 'footer']);
    const fields = (key: string) => def.sections.find((s) => s.key === key)!.fields.map((f) => f.key);
    expect(fields('brand')).toEqual(['company_name', 'tagline', 'logo', 'accent_color']);
    expect(def.sections[0].fields.find((f) => f.key === 'accent_color')?.type).toBe('color');
    expect(fields('hero')).toEqual(expect.arrayContaining(['topbar_text', 'image', 'slides', 'stats', 'primary_label', 'secondary_label', 'header_label']));
    expect(fields('ppdb')).toEqual(
      expect.arrayContaining(['facts', 'paths', 'schedule', 'requirements', 'steps', 'fees', 'grades', 'age_reference', 'form_button', 'whatsapp']),
    );
    expect(fields('contact')).toEqual(expect.arrayContaining(['address', 'maps_query', 'maps_url', 'phone', 'email', 'whatsapp', 'hours']));
    for (const s of def.sections) {
      const keys = s.fields.map((f) => f.key);
      expect(new Set(keys).size, s.key).toBe(keys.length);
      for (const f of s.fields) if (isListField(f)) expect(f.max, `${s.key}.${f.key}`).toBeGreaterThan(0);
      expect(def.defaultContent[s.key], s.key).toBeTypeOf('object');
      expect(s.introduced).toBeUndefined();
      if (s.key !== 'brand') expect(s.toggleable, s.key).toBe(true);
    }
    const hero = def.sections.find((s) => s.key === 'hero')!;
    const slides = hero.fields.find((f) => f.key === 'slides');
    expect(slides && isListField(slides) ? slides.max : 0).toBe(3);
  });

  it('berita & pengumuman berbentuk data sama dengan template sekolah lain (siap untuk CRUD berita)', () => {
    const itemKeys = (sectionKey: string) => {
      const list = def.sections.find((s) => s.key === sectionKey)!.fields.find((f) => f.key === 'items');
      return list && isListField(list) ? list.fields.map((f) => f.key) : [];
    };
    const same = (code: string, key: string) => {
      const other = TEMPLATES[code].sections.find((s) => s.key === key)!.fields.find((f) => f.key === 'items');
      return other && isListField(other) ? [...other.fields.map((f) => f.key)].sort() : [];
    };
    expect([...itemKeys('news')].sort()).toEqual(same('cakrawala', 'news'));
    expect([...itemKeys('news')].sort()).toEqual(same('madani', 'news'));
    expect([...itemKeys('announcements')].sort()).toEqual(same('cakrawala', 'announcements'));
    expect([...itemKeys('announcements')].sort()).toEqual(same('madani', 'announcements'));
    expect([...itemKeys('agenda')].sort()).toEqual(same('cakrawala', 'agenda'));
  });

  it('konten demo lolos validasi CMS, logo Tut Wuri Handayani (SVG), semua foto terdaftar, ada di public/, dan tercatat di CREDITS.md', () => {
    const c = def.defaultContent;
    expect(validateContent(def, resolveContent(def, null))).toEqual({});
    expect(c.brand.logo).toBe('/assets/templates/logos/tut-wuri-handayani.svg');
    expect(existsSync(publicFile(c.brand.logo as string))).toBe(true);
    expect(c.brand.accent_color).toBe('#C2410C');
    expect(c.hero.image).toBe('/assets/templates/photos/bestari-hero-1-1920.webp');
    const photos = JSON.stringify(c).match(/\/assets\/templates\/photos\/[a-z0-9-]+\.webp/g) ?? [];
    expect(photos.length).toBeGreaterThanOrEqual(25);
    for (const src of photos) expect(BESTARI_PHOTOS.asset(src), src).not.toBeNull();
    const credits = readFileSync(resolve(ROOT, 'public/assets/templates/photos/CREDITS.md'), 'utf8');
    for (const key of BESTARI_PHOTOS.keys) {
      for (const url of urls(BESTARI_PHOTOS.src(key))) expect(existsSync(publicFile(url)), url).toBe(true);
      expect(credits, key).toContain(`\`${key}-*\``);
      expect(photos, `${key} dipakai di konten demo`).toContain(BESTARI_PHOTOS.src(key));
    }
    // Simbol bawaan juga tersedia sebagai SVG mandiri, path sama dengan komponen
    const mark = readFileSync(publicFile('/assets/templates/logos/bestari-mark.svg'), 'utf8');
    const component = readFileSync(resolve(ROOT, 'src/templates/bestari/marks.tsx'), 'utf8');
    for (const d of mark.match(/ d="[^"]+"/g) ?? []) expect(component, d).toContain(d.trim());
  });

  it('foto demo ringan: slide hero 800/1280/1920, WebP ≤ 140 KB per file, total ≤ 3 MB; foto disimpan WebP, bukan SVG', () => {
    expect(BESTARI_PHOTOS.asset(def.defaultContent.hero.image as string)!.srcSet).toBe(
      '/assets/templates/photos/bestari-hero-1-800.webp 800w, /assets/templates/photos/bestari-hero-1-1280.webp 1280w, /assets/templates/photos/bestari-hero-1-1920.webp 1920w',
    );
    let total = 0;
    for (const key of BESTARI_PHOTOS.keys) {
      for (const url of urls(BESTARI_PHOTOS.src(key))) {
        expect(url, url).toMatch(/\.webp$/);
        const kb = statSync(publicFile(url)).size / 1024;
        expect(kb, url).toBeLessThanOrEqual(140);
        total += kb;
      }
    }
    expect(total).toBeLessThanOrEqual(3000);
  });

  it('salinan demo jujur: formulir PPDB hanya lewat WhatsApp, tes masuk dijelaskan apa adanya, tanpa klaim sistem akademik', () => {
    const text = JSON.stringify(def.defaultContent);
    expect(text).not.toMatch(/dijamin|pasti diterima|pasti lolos|e-rapor|absensi online|pembayaran online|terbaik nomor|tes calistung/i);
    expect(text).toMatch(/data tidak disimpan di website/);
    expect(text).toMatch(/Tes potensi skolastik singkat dan wawancara minat/);
    // SMA, bukan SD: tidak ada sisa salinan sekolah dasar
    expect(text).not.toMatch(/\bSD\b|sekolah dasar|TK\/PAUD|kelas [1-6]\b/i);
    expect(JSON.stringify(def.sections)).not.toMatch(/\bSD\b|sekolah dasar|TK\/PAUD|kelas [1-6]\b|observasi kesiapan|senang belajar/i);
  });
});

describe('Bestari: helper model', () => {
  it('warna tema: cokelat malam gelap (putih ≥ 13:1), versi terang ≥ 5:1 di atasnya, tinta ≥ 5:1 di putih; warna tidak valid → bawaan', () => {
    const white = rgb('#ffffff');
    for (const accent of ['#C2410C', '#047857', '#FACC15', '#B91C1C', '#0E1A1C', '#7DD3FC', '#211FFE', '#0E7490', '#B45309', '#7C3AED', '#BE185D', '#1F2937', '#FF0000', '#FF00FF']) {
      const vars = bestariVars(accent) as Record<string, string>;
      const deep = rgb(vars['--bs-deep']);
      expect(contrast(deep, white), accent).toBeGreaterThanOrEqual(13);
      expect(contrast(rgb(vars['--bs-bright']), deep), accent).toBeGreaterThanOrEqual(5);
      expect(contrast(rgb(vars['--bs-ink']), white), accent).toBeGreaterThanOrEqual(5);
      expect(contrast(rgb(vars['--bs-ink']), rgb(vars['--bs-tint'])), accent).toBeGreaterThanOrEqual(4.5);
    }
    // Semua warna (kisi RGB 18 langkah, 5.832 warna) tetap lolos AA
    const steps = Array.from({ length: 18 }, (_, i) => Math.round((i * 255) / 17));
    const worst = { inkOnTint: Infinity, inkOnWhite: Infinity, whiteOnDeep: Infinity, brightOnDeep: Infinity };
    for (const r of steps)
      for (const g of steps)
        for (const b of steps) {
          const vars = bestariVars(`#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`) as Record<string, string>;
          const ink = rgb(vars['--bs-ink']);
          const deep = rgb(vars['--bs-deep']);
          worst.inkOnTint = Math.min(worst.inkOnTint, contrast(ink, rgb(vars['--bs-tint'])));
          worst.inkOnWhite = Math.min(worst.inkOnWhite, contrast(ink, white));
          worst.whiteOnDeep = Math.min(worst.whiteOnDeep, contrast(white, deep));
          worst.brightOnDeep = Math.min(worst.brightOnDeep, contrast(rgb(vars['--bs-bright']), deep));
        }
    expect(worst.inkOnTint).toBeGreaterThanOrEqual(4.5);
    expect(worst.inkOnWhite).toBeGreaterThanOrEqual(5);
    expect(worst.whiteOnDeep).toBeGreaterThanOrEqual(13);
    expect(worst.brightOnDeep).toBeGreaterThanOrEqual(5);
    expect(bestariVars('bukan warna')).toEqual(bestariVars('#C2410C'));
    // Palet berbeda dari Madani (hijau) & Cakrawala (biru): terakota hangat
    const accent = rgb(def.defaultContent.brand.accent_color as string);
    expect(accent[0]).toBeGreaterThan(accent[1] + 80);
    expect(accent[0]).toBeGreaterThan(accent[2] + 80);
    // Hijau dari CMS menghasilkan pita gelap kehijauan
    const green = rgb((bestariVars('#047857') as Record<string, string>)['--bs-deep']);
    expect(green[1]).toBeGreaterThan(green[0] - 6);
  });

  it('menu: Profil, Program, Guru, PPDB, Berita, Kontak; label singkat dari label section', () => {
    const content = resolveContent(def, null);
    expect(navItems(content).map((i) => `${i.key}:${i.label}`)).toEqual(['about:Profil', 'programs:Program', 'teachers:Guru kami', 'ppdb:PPDB', 'news:Berita', 'contact:Kontak']);
    const smp = resolveContent(def, { programs: { eyebrow: 'Ekskul' }, teachers: { enabled: false }, news: { items: [] } });
    expect(navItems(smp).map((i) => `${i.key}:${i.label}`)).toEqual(['about:Profil', 'programs:Ekskul', 'ppdb:PPDB', 'contact:Kontak']);
    expect(navItems(resolveContent(def, { ppdb: { eyebrow: 'Daftar' } })).find((i) => i.key === 'ppdb')?.label).toBe('PPDB');
  });

  it('nomor label section "(01)" mengikuti section berpenomor yang tampil', () => {
    const m = readBestari(resolveContent(def, null));
    expect(['about', 'stats', 'welcome', 'why', 'programs', 'teachers', 'ppdb', 'news', 'testimonials', 'gallery', 'faq', 'contact'].map(m.number)).toEqual([
      '01',
      '02',
      '03',
      '04',
      '05',
      '07',
      '08',
      '09',
      '10',
      '11',
      '12',
      '13',
    ]);
    expect([m.number('hero'), m.number('announcements'), m.number('xyz')]).toEqual(['', '', '']);
    const hidden = readBestari(resolveContent(def, { stats: { enabled: false }, why: { items: [] } }));
    expect([hidden.number('about'), hidden.number('welcome'), hidden.number('programs'), hidden.number('stats')]).toEqual(['01', '02', '03', '']);
    // Section yang aktif tetapi kosong (item tanpa isi wajib) tidak memakai nomor & tidak masuk menu
    const empty = resolveContent(def, { testimonials: { items: [{ name: 'Tanpa kutipan' }] }, welcome: { title: '', quote: '', body: '' }, news: { items: [{ date: '2026-10-01' }] } });
    const e = readBestari(empty);
    expect([e.shown('testimonials'), e.shown('welcome'), e.shown('news')]).toEqual([false, false, false]);
    expect([e.number('stats'), e.number('why'), e.number('gallery')]).toEqual(['02', '03', '08']);
    expect(navItems(empty).map((i) => i.key)).not.toContain('news');
    // "#footer" menuju footer (bukan tautan mati)
    expect(e.linkOr('#footer', null)).toEqual({ kind: 'section', target: 'footer' });
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

  it('PPDB SMA: usia per tanggal acuan (13–21 tahun), validasi tanggal lahir & pilihan, pesan WhatsApp per baris', () => {
    expect(ageAt('2021-03-14', '2027-07-01')).toEqual({ years: 6, months: 3 });
    expect(ageAt('2021-07-01', '2027-07-01')).toEqual({ years: 6, months: 0 });
    expect(ageAt('2021-07-02', '2027-07-01')).toEqual({ years: 5, months: 11 });
    expect(ageAt('2028-01-01', '2027-07-01')).toBeNull();
    expect(ageAt('2021-02-30', '2027-07-01')).toBeNull();
    expect(['081234567890', '+62 812-3456-7890', '6281234567890', '8123456789'].map(validPhone)).toEqual([true, true, true, true]);
    expect(['12345', '0812abc34567', '', '9912345678'].map(validPhone)).toEqual([false, false, false, false]);

    const options = { grades: ['Kelas 10'], paths: ['Jalur reguler'], reference: '2027-07-01', today: '2026-10-26' };
    expect(Object.keys(validatePpdb(EMPTY_PPDB, options))).toEqual(['name', 'birth', 'parent', 'grade', 'path', 'phone']);
    const filled = { ...EMPTY_PPDB, name: 'Alya Putri', birth: '2012-03-14', parent: 'Ibu Sari', grade: 'Kelas 10', path: 'Jalur reguler', phone: '081234567890' };
    expect(validatePpdb(filled, options)).toEqual({});
    expect(validatePpdb({ ...filled, birth: '2027-01-01' }, options).birth).toBe('Tanggal lahir tidak boleh setelah hari ini.');
    // Usia SMA wajar: 13 sampai 21 tahun (21 tahun lebih beberapa bulan masih boleh) pada tanggal acuan
    expect(validatePpdb({ ...filled, birth: '2015-01-01' }, options).birth).toBe('Periksa kembali tahun lahir calon siswa.');
    expect(validatePpdb({ ...filled, birth: '2004-01-01' }, options).birth).toBe('Periksa kembali tahun lahir calon siswa.');
    expect(validatePpdb({ ...filled, birth: '2014-07-01' }, options)).toEqual({});
    expect(validatePpdb({ ...filled, birth: '2006-03-01' }, options)).toEqual({});
    expect(validatePpdb({ ...filled, grade: 'Kelas 7' }, options)).toEqual({ grade: 'Pilih kelas yang dituju.' });
    // Tanpa pilihan kelas/jalur (bagian kosong) → pilihan tidak wajib; acuan kosong → hari ini
    expect(validatePpdb({ ...filled, grade: '', path: '' }, { grades: [], paths: [], today: '2026-10-26' })).toEqual({});

    expect(ppdbMessage('SMA Bestari Cendekia', { ...filled, name: ' Alya Putri ', origin: 'SMP Negeri 5 Yogyakarta', note: 'Mohon\ninfo   beasiswa' }, '2027-07-01')).toBe(
      'Halo Panitia PPDB SMA Bestari Cendekia, saya ingin mendaftarkan calon siswa berikut.\nNama calon siswa: Alya Putri\nTanggal lahir: 14 Mar 2012 (usia per 1 Jul 2027: 15 tahun 3 bulan)\nNama orang tua/wali: Ibu Sari\nPilihan kelas: Kelas 10\nJalur: Jalur reguler\nAsal sekolah: SMP Negeri 5 Yogyakarta\nNo. WhatsApp: 081234567890\nCatatan: Mohon info beasiswa\nMohon info langkah selanjutnya. Terima kasih.',
    );
    // Tanpa tanggal acuan: tanggal lahir saja
    expect(ppdbMessage('SMA X', filled)).toContain('Tanggal lahir: 14 Mar 2012\n');
  });

  it('galeri bento tanpa sel kosong untuk 1–8 foto (4 kolom layar lebar, 2 kolom HP)', () => {
    const span = (cls: string, re: RegExp, fallback: number) => Number(re.exec(cls)?.[1] ?? fallback);
    for (let n = 1; n <= 8; n += 1) {
      const cells = bentoCells(n);
      expect(cells).toHaveLength(n);
      // Layar lebar: jumlah sel (kolom × baris) habis dibagi 4 → tidak ada lubang di baris terakhir
      const area = cells.reduce((sum, [cls]) => sum + span(cls, /@3xl:col-span-(\d)/, 1) * span(cls, /@3xl:row-span-(\d)/, 1), 0);
      expect(area % 4, `n=${n}`).toBe(0);
      // HP: foto lebar memakai 2 kolom, sisanya berpasangan
      const narrow = cells.filter(([, wide]) => !wide).length;
      expect(narrow % 2, `n=${n}`).toBe(0);
      expect(cells[0][1]).toBe(true);
      // sizes mengikuti lebar sel di layar lebar (4 kolom → 92vw, 2 → 48vw, 1 → 24vw) dan di HP (lebar → 92vw)
      for (const [cls, wide, sizes] of cells) {
        const cols = span(cls, /@3xl:col-span-(\d)/, 1);
        expect(sizes, `n=${n} ${cls}`).toBe(`(min-width: 768px) ${cols === 4 ? '92vw' : cols === 2 ? '48vw' : '24vw'}, ${wide ? '92vw' : '46vw'}`);
      }
    }
  });

  it('kartu berwarna tema hanya bertema "inverse" (cincin fokus putih) bila teksnya putih', () => {
    expect(['#C2410C', '#047857', '#1D4ED8', '#1F2937'].map(accentIsDark)).toEqual([true, true, true, true]);
    expect(['#FACC15', '#7DD3FC', '#F59E0B'].map(accentIsDark)).toEqual([false, false, false]);
    const yellow = demo({ brand: { accent_color: '#FACC15' } });
    expect(section(yellow, 'highlights').querySelectorAll('li')[1].hasAttribute('data-tpl-tone')).toBe(false);
    cleanup();
    expect(section(demo(), 'highlights').querySelectorAll('li')[1]).toHaveAttribute('data-tpl-tone', 'inverse');
  });

  it('tujuan kartu sorotan & ikon otomatis dari teks', () => {
    const all = () => true;
    expect(['Pendaftaran siswa baru', 'Bimbingan masuk PTN', 'Open house 7 November', 'Guru kami', 'Prestasi lomba'].map((t) => titleTarget(t, all))).toEqual([
      'ppdb',
      'programs',
      'agenda',
      'teachers',
      'achievements',
    ]);
    expect(titleTarget('Open house 7 November', (k) => k !== 'agenda')).toBeNull();
    // "wali kelas" / "Guru kelas" → Guru, bukan Program (aturan guru di atas aturan "kelas")
    expect([titleTarget('Kenali wali kelas', all), titleTarget('Guru kelas berpengalaman', all), titleTarget('Kelas bilingual', all)]).toEqual(['teachers', 'teachers', 'programs']);
    expect(
      ['Terakreditasi A', 'Sekolah Adiwiyata', 'Bebas perundungan', 'Kurikulum Merdeka', 'Bimbingan kuliah', 'Sains & robotika', 'Marching band & seni', 'Basket & futsal'].map((t) =>
        iconKey(t),
      ),
    ).toEqual(['certificate', 'leaf', 'shield', 'book', 'alumni', 'robot', 'music', 'sport']);
    expect(['Siswa per kelas', 'Ekstrakurikuler', 'Prestasi lomba', 'Lulusan kuliah'].map((t) => iconKey(t))).toEqual(['students', 'sparkles', 'trophy', 'alumni']);
    // Kata kunci SD/SMP lama tetap dikenali (template bisa dipakai jenjang lain)
    expect(['Kelas bilingual', 'Seni & budaya', 'Pramuka & olahraga', 'Debat bahasa Inggris'].map((t) => iconKey(t))).toEqual(['language', 'art', 'scout', 'news']);
    expect(iconKey('Sesuatu yang lain', 2)).toBe('award');
  });

  it('tautan "#…": anchor Indonesia (#berita, #program, #pendaftaran, #guru) ke section yang benar, anchor tak dikenal → cadangan', () => {
    expect([...PAGE_SECTIONS]).toEqual(def.sections.map((s) => s.key).filter((k) => k !== 'brand'));
    expect(['berita', '#Program', 'pendaftaran', 'profil', 'kontak', 'tentang', 'beranda', 'guru', 'lokasi', 'keunggulan'].map(sectionTarget)).toEqual([
      'news',
      'programs',
      'ppdb',
      'about',
      'contact',
      'about',
      'hero',
      'teachers',
      'contact',
      'why',
    ]);
    expect(['xyz', 'brand', ''].map(sectionTarget)).toEqual([null, null, null]);
    const m = readBestari(resolveContent(def, null));
    const fallback = { kind: 'section', target: 'ppdb' } as const;
    expect(m.shown('berita')).toBe(false);
    expect(m.linkOr('#berita', fallback)).toEqual({ kind: 'section', target: 'news' });
    expect(m.linkOr('#guru', fallback)).toEqual({ kind: 'section', target: 'teachers' });
    expect(m.linkOr('#beranda', fallback)).toEqual({ kind: 'section', target: 'hero' });
    expect(m.linkOr('#salah-ketik', fallback)).toBe(fallback);
    expect(m.linkOr('', fallback)).toEqual(fallback);
    const hidden = readBestari(resolveContent(def, { news: { enabled: false } }));
    expect(hidden.linkOr('#berita', fallback)).toBe(fallback);
  });
});

describe('Bestari: demo', () => {
  it('urutan section, satu h1, hero slider full-bleed (data-hero-layout canvas), bilah info, navbar', () => {
    const container = demo();
    // Footer juga tujuan tautan "#footer" (landmark <footer> ber-data-tpl-section)
    expect(sectionKeys(container)).toEqual([...ORDER, 'footer']);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const hero = section(container, 'hero');
    expect(hero.getAttribute('data-hero-layout')).toBe('canvas');
    expect(hero.getAttribute('data-tpl-tone')).toBe('inverse');
    expect(hero.querySelector('h1')!.textContent).toBe('Tempat remaja tumbuh percaya diri dan siap kuliah');
    // Bagian sorotan judul di atas foto: miring dan tetap putih (kontras tidak bergantung foto)
    const mark = hero.querySelector('h1 span')!;
    expect(mark.textContent).toBe('siap kuliah');
    expect(mark.className).toContain('italic');
    expect(mark.className).toContain('text-white');
    // Foto hero selebar layar: bukan di dalam CONTAINER / bingkai membulat
    const slide = hero.querySelector<HTMLElement>('.bs-slide')!;
    expect(slide.parentElement!.parentElement).toBe(hero);
    expect(slide.parentElement!.className).not.toMatch(/rounded|max-w-|mx-auto|px-/);
    const img = hero.querySelector<HTMLImageElement>('img[fetchpriority="high"]')!;
    expect(img.getAttribute('src')).toBe('/assets/templates/photos/bestari-hero-1-1920.webp');
    expect(img.getAttribute('srcset')).toContain('-1280.webp 1280w');
    expect(img.getAttribute('loading')).toBe('eager');
    expect(Number(img.getAttribute('width'))).toBe(1920);
    expect(Number(img.getAttribute('height'))).toBe(1080);
    expect(img.getAttribute('alt')).toMatch(/SMA berseragam putih abu-abu/i);
    expect(container.querySelectorAll('img[fetchpriority="high"]')).toHaveLength(1);
    expect(within(hero).getByRole('link', { name: 'Daftar PPDB' })).toHaveAttribute('href', '#ppdb');
    expect(within(hero).getByRole('link', { name: 'Kenali sekolah' })).toHaveAttribute('href', '#tentang');
    // Tiga angka besar di hero; teks akhir selalu di DOM (hitung naik hanya lapisan aria-hidden)
    expect(Array.from(hero.querySelectorAll('dt')).map((d) => d.textContent)).toEqual(['Siswa aktif', 'Guru & staf', 'Akreditasi']);
    expect(Array.from(hero.querySelectorAll('dd')).map((d) => d.textContent)).toEqual(['700+', '58', 'A']);
    expect(hero.querySelector('dd')!.className).toContain('@6xl:text-[length:clamp(46px,3.9cqw,68px)]');
    // Angka panjang mengecil sebatas lebar kolomnya (dd = container, cqi), angka pendek tetap ukuran penuh
    const fit = (el: Element) => (el.querySelector('dd > span') as HTMLElement).style.getPropertyValue('--bs-fit');
    expect(hero.querySelector('dd > span')!.className).toContain('text-[length:min(1em,var(--bs-fit))]');
    expect(fit(hero)).toBe('45.5cqi');
    const long = section(demo({ hero: { stats: [{ value: '12.500+', label: 'Alumni' }, { value: '58', label: 'Guru' }, { value: 'A', label: 'Akreditasi' }] } }), 'hero');
    expect(Array.from(long.querySelectorAll('dd')).map((d) => d.textContent)).toEqual(['12.500+', '58', 'A']);
    expect(fit(long)).toBe('26.0cqi');

    // Navbar biasa: selebar layar, menempel di atas; di atas foto (belum digulir) transparan & bertema gelap (teks
    // putih), tanpa pil berbingkai
    const header = container.querySelector('header')!;
    expect(header.className).toContain('h-0');
    expect(header.className).toContain('sticky');
    const navbar = header.firstElementChild!;
    expect(navbar.getAttribute('data-tpl-tone')).toBe('inverse');
    expect(navbar.className).toContain('bg-transparent');
    expect(header.innerHTML).not.toMatch(/rounded-\[31px\]|ring-white\/40/);
    expect(header.textContent).toContain('PPDB 2027/2028 gelombang 1 dibuka 3 November 2026');
    expect(within(header).getByRole('link', { name: 'Daftar' })).toHaveAttribute('href', '#ppdb');
    expect(within(header).getByRole('link', { name: /info@bestaricendekia\.sch\.id/ })).toHaveAttribute('href', 'mailto:info@bestaricendekia.sch.id');
    expect(within(header).getByRole('link', { name: /\(0274\) 555-0182/ })).toHaveAttribute('href', 'tel:+622745550182');
    // Pengumuman utuh (boleh turun baris, tidak dipotong "…"); hero memberi ruang di atas judul untuk bilah info + navbar
    expect(within(header).getByText(/PPDB 2027\/2028 gelombang/).className).not.toContain('truncate');
    expect(hero.innerHTML).toContain('pt-[172px]');
    expect(hero.innerHTML).toContain('@5xl:pt-[196px]');
    // Logo & nama: tautan flex (bukan inline) agar duduk tepat di tengah tinggi navbar
    expect(within(header).getByRole('link', { name: /ke awal halaman/ }).className).toMatch(/^flex .*items-center/);
    const nav = within(header).getAllByRole('navigation', { name: 'Menu utama' })[0];
    expect(linkList(nav)).toEqual(['Profil|#tentang', 'Program|#programs', 'Guru kami|#teachers', 'PPDB|#ppdb', 'Berita|#news', 'Kontak|#kontak']);
    expect(header.querySelector('img[src="/assets/templates/logos/tut-wuri-handayani.svg"]'), 'logo demo').not.toBeNull();
    expect(demo({ brand: { logo: '' } }).querySelector('header svg[viewBox="0 0 32 32"]'), 'BestariMark').not.toBeNull();
    fireEvent.click(within(nav).getByRole('link', { name: 'Guru kami' }));
    expect(scrolled).toEqual(['teachers']);
  });

  it('bilah info tanpa pengumuman: di HP disembunyikan (email & telepon hanya tampil di layar lebar)', () => {
    const header = demo({ hero: { topbar_text: '' } }).querySelector('header')!;
    const bar = header.querySelector('[data-bs-infobar]')!;
    expect(bar.className).toContain('hidden @3xl:block');
    expect(within(header).getByRole('link', { name: /info@bestaricendekia/ })).toBeInTheDocument();
    cleanup();
    expect(demo().querySelector('header [data-bs-infobar]')!.className).not.toContain('hidden @3xl:block');
  });

  it('menu HP: tombol buka/tutup (aria-expanded), Esc menutup dan fokus kembali ke tombol', () => {
    const header = demo().querySelector('header')!;
    const toggle = within(header).getByRole('button', { name: 'Buka menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const panel = document.getElementById(toggle.getAttribute('aria-controls')!)!;
    expect(within(panel).getAllByRole('link').map((a) => a.textContent)).toEqual(['Profil', 'Program', 'Guru kami', 'PPDB', 'Berita', 'Kontak', 'Daftar PPDB']);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
  });

  it('hero slider: 4 slide, tombol per slide + sebelumnya/berikutnya, panah keyboard, geser, jeda, berhenti saat disorot', () => {
    const hero = section(demo(), 'hero');
    expect(hero.getAttribute('aria-roledescription')).toBe('carousel');
    const controls = within(hero).getByRole('group', { name: 'Kontrol slide' });
    const dots = within(controls).getAllByRole('button', { name: /^Slide \d dari 4/ });
    expect(dots).toHaveLength(4);
    // Nama aksesibel memuat label yang tampil di layar lebar (Label in Name)
    expect(dots.map((d) => d.getAttribute('aria-label'))).toEqual([
      'Slide 1 dari 4: SMA swasta · Yogyakarta',
      'Slide 2 dari 4: Kurikulum Merdeka · Kelas 10–12',
      'Slide 3 dari 4: Seni & ekstrakurikuler',
      'Slide 4 dari 4: Karakter & kepemimpinan',
    ]);
    // HP: hanya slide aktif yang tampil (+ "/ 04"), slide lain disembunyikan lewat kelas container query
    expect(dots.map((d) => d.parentElement!.className.includes('hidden @3xl:block'))).toEqual([false, true, true, true]);
    expect(dots[0]).toHaveAttribute('aria-current', 'true');
    const progress = () => controls.querySelector('.bs-progress')!;
    expect(progress()).toHaveAttribute('data-run', 'true');
    expect(progress()).toHaveAttribute('data-hold', 'false');
    // Hanya foto slide 1 yang dimuat di awal (eager)
    expect(hero.querySelectorAll('.bs-slide img')).toHaveLength(1);

    fireEvent.click(within(controls).getByRole('button', { name: 'Slide berikutnya' }));
    expect(dots[1]).toHaveAttribute('aria-current', 'true');
    expect(hero.querySelector('h1')!.textContent).toBe('Pilih mapel sesuai rencana kuliahmu');
    const imgs = Array.from(hero.querySelectorAll<HTMLImageElement>('.bs-slide img'));
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

    fireEvent.mouseEnter(hero);
    expect(progress()).toHaveAttribute('data-hold', 'true');
    fireEvent.mouseLeave(hero);
    expect(progress()).toHaveAttribute('data-hold', 'false');
    fireEvent.click(within(controls).getByRole('button', { name: 'Jeda slide otomatis' }));
    expect(within(controls).getByRole('button', { name: 'Putar slide otomatis' })).toBeInTheDocument();
    expect(progress()).toHaveAttribute('data-run', 'false');
  });

  it('LCP aman: foto & teks slide pertama tidak dianimasikan masuk; zoom pelan & teks naik hanya setelah pergantian', () => {
    const hero = section(demo(), 'hero');
    const slides = () => Array.from(hero.querySelectorAll<HTMLElement>('.bs-slide'));
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
    // CSS: animasi hanya untuk data-zoom / data-enter, dan dimatikan saat prefers-reduced-motion
    const css = readFileSync(resolve(ROOT, 'src/templates/bestari/bestari.css'), 'utf8');
    expect(css).toMatch(/\.bs-slide\[data-zoom='a'\] img/);
    expect(css).toMatch(/\[data-enter='true'\] \.bs-rise/);
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    for (const selector of ['.bs-progress', '.bs-slide[data-zoom] img', '.bs-rise', '.bs-collapse']) expect(reduced, selector).toContain(selector);
  });

  it('hero slider: wilayah live tetap (tidak dipasang ulang) mengumumkan slide yang dipilih manual; diam saat berganti otomatis', () => {
    const hero = section(demo(), 'hero');
    const status = () => hero.querySelector<HTMLElement>('[data-bs-slide-status]')!;
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
    expect(live).toHaveTextContent('Slide 2 dari 4: Pilih mapel sesuai rencana kuliahmu');
  });

  it('kartu sorotan (tengah berwarna tema) menuju section dari judul; lencana; profil dua warna + daftar "+"; angka', () => {
    const container = demo();
    const highlights = section(container, 'highlights');
    expect(highlights.querySelector('h2.sr-only')?.textContent).toBe('Informasi singkat');
    expect(linkList(highlights)).toEqual(['Mulai daftar|#ppdb', 'Lihat program|#programs', 'Lihat agenda|#agenda']);
    const cards = Array.from(highlights.querySelectorAll('li'));
    expect(cards[1].className).toContain('bg-(--tpl-accent)');
    expect(cards[0].className).not.toContain('bg-(--tpl-accent)');

    const badges = section(container, 'badges');
    expect(Array.from(badges.querySelectorAll('li')).map((l) => l.textContent)).toEqual(['Terakreditasi A', 'Sekolah Adiwiyata', 'Bebas perundungan', 'Kurikulum Merdeka', 'Bimbingan kuliah']);
    expect(badges.querySelectorAll('li svg')).toHaveLength(5);

    const about = section(container, 'about');
    const h2 = about.querySelector('h2')!;
    expect(h2.textContent).toMatch(/^Di SMA Bestari Cendekia, siswa belajar karena ingin tahu/);
    expect(h2.querySelector('span')!.className).toContain('text-[#857D75]');
    expect(about.textContent).toContain('Berdiri sejak2008');
    expect(within(about).getByText('Profil sekolah')).toBeInTheDocument();
    const pillars = within(about).getAllByRole('button', { name: /Visi|Misi|Kurikulum/ });
    expect(pillars.map((b) => b.getAttribute('aria-expanded'))).toEqual(['true', 'false', 'false']);
    const misi = within(about).getByRole('button', { name: 'Misi' });
    fireEvent.click(misi);
    expect(misi).toHaveAttribute('aria-expanded', 'true');
    const region = document.getElementById(misi.getAttribute('aria-controls')!)!;
    expect(region).not.toHaveAttribute('inert');
    expect(region.querySelectorAll('li')).toHaveLength(4);
    expect(within(about).getByRole('link', { name: 'Jadwalkan kunjungan' }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/6281234567890/);

    const stats = section(container, 'stats');
    expect(Array.from(stats.querySelectorAll('dt')).map((d) => d.textContent)).toEqual(['Siswa per kelas', 'Ekstrakurikuler', 'Prestasi lomba', 'Lulusan kuliah']);
    expect(stats.querySelectorAll('dd svg')).toHaveLength(4);
  });

  it('sambutan, alasan bernomor (satu terbuka) + kutipan guru, program berfoto, prestasi, guru', () => {
    const container = demo();
    const welcome = section(container, 'welcome');
    expect(welcome.querySelector('blockquote')?.textContent).toMatch(/^Setiap siswa membawa mimpinya sendiri/);
    expect(welcome.textContent).toContain('Dra. Siti Rahmawati, M.Pd.');
    expect(within(welcome).getByRole('link', { name: 'Kenali guru kami' })).toHaveAttribute('href', '#teachers');

    const why = section(container, 'why');
    const reasons = within(why).getAllByRole('button');
    expect(reasons).toHaveLength(4);
    expect(reasons.map((b) => b.getAttribute('aria-expanded'))).toEqual(['true', 'false', 'false', 'false']);
    fireEvent.click(reasons[2]);
    expect(reasons.map((b) => b.getAttribute('aria-expanded'))).toEqual(['false', 'false', 'true', 'false']);
    expect(why.querySelector('figure')?.textContent).toContain('Ratna Sari, M.Pd.');
    expect(why.textContent).toContain('1 : 13');

    const programs = section(container, 'programs');
    expect(within(programs).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Bimbingan masuk PTN',
      'Sains & robotika',
      'Marching band & seni',
      'Basket & futsal',
    ]);
    expect(wa(within(programs).getByRole('link', { name: 'Tanya tentang program Sains & robotika' }))).toContain(
      'Halo SMA Bestari Cendekia, saya ingin bertanya tentang program Sains & robotika.',
    );
    // Carousel: rel berlabel yang bisa difokus, kartu lebar tetap (tidak ikut melebar di desktop), slide bernomor
    const rail = within(programs).getByRole('region', { name: 'Daftar program: Belajar lewat riset, lomba, dan panggung' });
    expect(rail).toHaveAttribute('tabindex', '0');
    expect(rail).toHaveAttribute('aria-roledescription', 'carousel');
    expect(rail.className).toContain('snap-x');
    const slides = Array.from(rail.querySelectorAll('li'));
    expect(slides.map((li) => li.getAttribute('aria-label'))).toEqual([
      '1 dari 4: Bimbingan masuk PTN',
      '2 dari 4: Sains & robotika',
      '3 dari 4: Marching band & seni',
      '4 dari 4: Basket & futsal',
    ]);
    expect(slides[0].className).toContain('@xl:w-[300px]');
    // Tombol geser hanya tampil bila rel bisa digulir (jsdom tidak punya tata letak → tidak tampil)
    expect(within(programs).queryByRole('button', { name: 'Program berikutnya' })).toBeNull();
    expect(within(section(container, 'achievements')).getAllByRole('heading', { level: 3 })).toHaveLength(5);
    // Peringkat kosong → nama lomba jadi judul, tidak ada <h3> kosong dan tidak dobel
    const noRank = section(demo({ achievements: { items: [{ title: '', event: 'Olimpiade Sains Kota', year: '2026' }] } }), 'achievements');
    expect(within(noRank).getByRole('heading', { level: 3 })).toHaveTextContent('Olimpiade Sains Kota');
    expect(noRank.textContent?.split('Olimpiade Sains Kota')).toHaveLength(2);
    const teachers = section(container, 'teachers');
    expect(Array.from(teachers.querySelectorAll('figcaption')).map((f) => f.firstChild?.textContent)).toEqual(['Dewi Lestari, S.Pd.', 'Rizky Pratama, S.Pd.', 'Ratna Sari, M.Pd.']);
    expect(wa(within(teachers).getByRole('link', { name: 'Tanya wali kelas' }))).toContain('saya ingin bertanya kepada wali kelas');
  });

  it('PPDB: fakta, tab Jalur/Jadwal/Syarat/Alur/Biaya dengan panah keyboard, linimasa', () => {
    const ppdb = section(demo(), 'ppdb');
    expect(Array.from(ppdb.querySelectorAll('dl')[0].querySelectorAll('dd')).map((d) => d.textContent)).toEqual([
      '3 Nov 2026 – 30 Jan 2027',
      '216 kursi',
      'Paling tinggi 21 tahun',
      'Gratis',
    ]);
    const tablist = within(ppdb).getByRole('tablist', { name: 'Informasi PPDB' });
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Jalur', 'Jadwal', 'Syarat', 'Alur', 'Biaya']);
    expect(tabs.map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1', '-1', '-1']);
    const panel = (tab: HTMLElement) => document.getElementById(tab.getAttribute('aria-controls')!)!;
    expect(panel(tabs[1])).toHaveAttribute('hidden');
    expect(panel(tabs[2]).textContent).toContain('Fotokopi akta kelahiran');
    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveFocus();
    expect(Array.from(panel(tabs[1]).querySelectorAll('h3')).map((h) => h.textContent)).toEqual([
      'Pendaftaran gelombang 1',
      'Tes potensi & wawancara',
      'Pengumuman hasil',
      'Daftar ulang',
      'Masa pengenalan lingkungan sekolah',
    ]);
    fireEvent.keyDown(tabs[1], { key: 'End' });
    expect(panel(tabs[4]).textContent).toContain('Rp9.500.000');
    fireEvent.keyDown(tabs[4], { key: 'ArrowRight' });
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('formulir PPDB SMA: galat per isian + fokus ke isian pertama, usia per tanggal acuan, lalu pesan WhatsApp apa adanya; tidak ada data yang dikirim', () => {
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
    expect(INPUT).toContain('focus:ring-(--tpl-accent-ink)');
    expect(INPUT).not.toMatch(/ring-\(--tpl-accent\)/);
    const birth = within(form).getByLabelText('Tanggal lahir calon siswa');
    expect(birth).toHaveAttribute('type', 'date');
    expect(birth).toHaveAttribute('aria-invalid', 'true');
    expect(form.textContent).toContain('Pilih tanggal lahir calon siswa.');

    fireEvent.change(name, { target: { value: 'Alya Putri' } });
    fireEvent.change(birth, { target: { value: '2012-03-14' } });
    expect(birth).not.toHaveAttribute('aria-invalid');
    expect(document.getElementById(birth.getAttribute('aria-describedby')!)).toHaveTextContent('Usia per 1 Jul 2027: 15 tahun 3 bulan');
    fireEvent.change(within(form).getByLabelText('Nama orang tua/wali'), { target: { value: 'Ibu Sari Wulandari' } });
    const grade = within(form).getByLabelText('Kelas yang dituju') as HTMLSelectElement;
    expect(Array.from(grade.options).map((o) => o.value)).toEqual(['', 'Kelas 10', 'Pindahan kelas 10', 'Pindahan kelas 11']);
    fireEvent.change(grade, { target: { value: 'Kelas 10' } });
    fireEvent.change(within(form).getByLabelText('Jalur pendaftaran'), { target: { value: 'Jalur prestasi' } });
    fireEvent.change(within(form).getByLabelText(/Asal sekolah/), { target: { value: 'SMP Negeri 5 Yogyakarta' } });
    fireEvent.change(within(form).getByLabelText('Nomor WhatsApp orang tua'), { target: { value: '0812-3456-7890' } });
    fireEvent.click(submit);

    expect(within(ppdb).queryByRole('form')).toBeNull();
    expect(within(ppdb).getByRole('heading', { name: /Pesan siap dikirim/ })).toBeInTheDocument();
    const message =
      'Halo Panitia PPDB SMA Bestari Cendekia, saya ingin mendaftarkan calon siswa berikut.\nNama calon siswa: Alya Putri\nTanggal lahir: 14 Mar 2012 (usia per 1 Jul 2027: 15 tahun 3 bulan)\nNama orang tua/wali: Ibu Sari Wulandari\nPilihan kelas: Kelas 10\nJalur: Jalur prestasi\nAsal sekolah: SMP Negeri 5 Yogyakarta\nNo. WhatsApp: 0812-3456-7890\nMohon info langkah selanjutnya. Terima kasih.';
    expect(ppdb.querySelector('pre')?.textContent).toBe(message);
    expect(within(ppdb).getByRole('link', { name: 'Buka WhatsApp' }).getAttribute('href')).toBe(`https://wa.me/6281234567890?text=${encodeURIComponent(message)}`);
    expect(fetchSpy).not.toHaveBeenCalled();
    fireEvent.click(within(ppdb).getByRole('button', { name: 'Ubah data' }));
    expect(within(ppdb).getByRole('form')).toBeInTheDocument();
    fetchSpy.mockRestore();
  });

  it('berita: filter kategori (aria-pressed) + isi lengkap dibuka di kartu; pengumuman berlabel; agenda bertanggal', () => {
    const container = demo();
    const news = section(container, 'news');
    const filters = within(news).getByRole('group', { name: 'Saring berita menurut kategori' });
    expect(within(filters).getAllByRole('button').map((b) => b.textContent)).toEqual(['Semua', 'Prestasi', 'Kegiatan', 'Olahraga']);
    expect(news.querySelectorAll('article')).toHaveLength(3);
    expect(news.querySelector('article time')).toHaveAttribute('datetime', '2026-10-16');
    fireEvent.click(within(filters).getByRole('button', { name: 'Kegiatan' }));
    expect(within(filters).getByRole('button', { name: 'Kegiatan' })).toHaveAttribute('aria-pressed', 'true');
    expect(Array.from(news.querySelectorAll('article h3')).map((h) => h.textContent)).toEqual(['Kokurikuler: siswa kelas 10 mengolah sisa makanan menjadi kompos']);
    expect(within(news).getByRole('status')).toHaveTextContent('1 berita kategori Kegiatan');
    const more = within(news).getByRole('button', { name: /Baca selengkapnya/ });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById(more.getAttribute('aria-controls')!)).toHaveAttribute('inert');
    fireEvent.click(more);
    expect(more).toHaveAttribute('aria-expanded', 'true');
    expect(within(news).getByRole('link', { name: /Berita lainnya di Instagram/ })).toHaveAttribute('href', 'https://instagram.com/smabestaricendekia');

    const announcements = section(container, 'announcements');
    expect(within(announcements).getAllByText('Penting')).toHaveLength(2);
    expect(within(announcements).getAllByText('Penting')[0].className).toContain('text-[#B42318]');
    const agenda = section(container, 'agenda');
    expect(Array.from(agenda.querySelectorAll('time')).map((t) => t.getAttribute('datetime'))).toEqual(['2026-11-07', '2026-11-14', '2026-11-25', '2026-12-12']);
    expect(agenda.textContent).toContain('Aula sekolah');
  });

  it('testimoni, galeri, FAQ, kontak + peta, footer selebar layar', () => {
    const container = demo();
    const testimonials = section(container, 'testimonials');
    expect(testimonials.querySelectorAll('blockquote')).toHaveLength(3);
    expect(testimonials.textContent).toContain('2.100+');
    for (const img of testimonials.querySelectorAll('img')) expect(img.getAttribute('srcset')).toContain('-240.webp 240w');

    const gallery = section(container, 'gallery');
    expect(gallery.querySelectorAll('figcaption')).toHaveLength(5);
    expect(gallery.querySelector('li')!.className).toContain('col-span-2');
    // Rel guru di HP: wilayah berlabel yang bisa difokus & digulir dengan keyboard
    const rail = within(section(container, 'teachers')).getByRole('region', { name: /Daftar guru/ });
    expect(rail).toHaveAttribute('tabindex', '0');
    expect(rail.className).toContain('scroll-px-5');

    const faq = section(container, 'faq');
    const questions = within(faq).getAllByRole('button');
    expect(questions).toHaveLength(5);
    expect(questions[0]).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(questions[3]);
    expect(questions[0]).toHaveAttribute('aria-expanded', 'false');
    expect(questions[3]).toHaveAttribute('aria-expanded', 'true');
    expect(wa(within(faq).getByRole('link', { name: /Tanya panitia PPDB/ }))).toContain('Halo Panitia PPDB SMA Bestari Cendekia, saya ingin bertanya.');

    const contact = section(container, 'contact');
    const iframe = contact.querySelector('iframe')!;
    expect(iframe).toHaveAttribute('title', 'Peta lokasi SMA Bestari Cendekia');
    expect(iframe).toHaveAttribute('loading', 'lazy');
    expect(within(contact).getByRole('link', { name: /Buka di Google Maps/ })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/search/?api=1&query=Kota%20Yogyakarta%2C%20DI%20Yogyakarta',
    );
    expect(within(contact).getByRole('link', { name: /Telepon/ })).toHaveAttribute('href', 'tel:+622745550182');
    expect(within(contact).getByRole('link', { name: /Email/ })).toHaveAttribute('href', 'mailto:info@bestaricendekia.sch.id');
    expect(within(contact).getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://instagram.com/smabestaricendekia');
    expect(contact.textContent).toContain('Senin–Jumat 07.00–15.00 WIB');

    const footer = container.querySelector('footer')!;
    // Pita selebar layar: tanpa jarak tepi / sudut membulat di pita; isinya di dalam CONTAINER
    expect(footer.className).not.toMatch(/rounded|mx-|max-w-/);
    expect(footer.firstElementChild!.className).toContain('max-w-[1680px]');
    expect(within(footer).getByRole('navigation', { name: 'Tautan footer' }).querySelectorAll('a')).toHaveLength(6);
    expect(within(footer).getByRole('link', { name: 'Daftar PPDB' })).toHaveAttribute('href', '#ppdb');
    expect(footer.textContent).toContain(`© ${new Date().getFullYear()} SMA Bestari Cendekia. Semua hak dilindungi.`);
    expect(footer.textContent).toContain('Basket & futsal');
  });

  it('datar: tidak ada kelas shadow di template (kecuali tombol melayang Shell)', () => {
    const container = demo();
    const shadows = Array.from(container.querySelectorAll('[class*="shadow"]')).filter(
      (el) => !el.closest('[aria-label="Chat WhatsApp"]') && !/Chat WhatsApp|Kembali ke atas/.test(el.getAttribute('aria-label') ?? ''),
    );
    expect(shadows.map((el) => el.className)).toEqual([]);
    const source = ['Bestari', 'Header', 'Hero', 'Intro', 'About', 'Programs', 'Ppdb', 'News', 'Community', 'Closing', 'Footer', 'ui', 'styles']
      .map((f) => readFileSync(resolve(ROOT, `src/templates/bestari/${f}.${f === 'styles' ? 'ts' : 'tsx'}`), 'utf8'))
      .join('\n');
    expect(source).not.toMatch(/\bshadow-/);
  });
});

describe('Bestari: warna tema bisa diganti', () => {
  it('terakota bawaan → --tpl-accent; hijau dari CMS → semua turunan ikut; warna terang → teks tombol gelap', () => {
    const base = demo();
    expect(rootStyle(base, '--tpl-accent')).toBe('#c2410c');
    expect(rootStyle(base, '--tpl-on-accent')).toBe('#ffffff');
    const baseDeep = rootStyle(base, '--bs-deep');
    cleanup();

    const green = demo({ brand: { accent_color: '#047857' } });
    expect(rootStyle(green, '--tpl-accent')).toBe('#047857');
    expect(rootStyle(green, '--bs-deep')).not.toBe(baseDeep);
    expect(rootStyle(green, '--bs-deep')).toBe((bestariVars('#047857') as Record<string, string>)['--bs-deep']);
    cleanup();

    const yellow = demo({ brand: { accent_color: '#FACC15' } });
    expect(rootStyle(yellow, '--tpl-on-accent')).toBe('#121620');
    const submit = section(yellow, 'ppdb').querySelector('button[type="submit"]')!;
    expect(submit.className).toContain('text-(--tpl-on-accent)');
    expect(submit.className).toContain('bg-(--tpl-accent)');
  });
});

describe('Bestari: SEO situs pembeli', () => {
  it('judul tab & meta description terbaca sebagai website SMA', () => {
    expect(siteTitle('bestari', null)).toBe('SMA Bestari Cendekia — SMA Swasta di Yogyakarta');
    const restore = applySiteHead('bestari', null);
    expect(document.title).toBe('SMA Bestari Cendekia — SMA Swasta di Yogyakarta');
    const description = document.head.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
    expect(description).toMatch(/^SMA swasta di Kota Yogyakarta dengan kelas kecil/);
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(200);
    expect(document.head.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#C2410C');
    restore();
  });

  it('satu H1, tiap section diawali H2 (kartu sorotan & lencana: H2 untuk pembaca layar), H3 hanya di bawah H2', () => {
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
    expect(imgs.length).toBeGreaterThan(20);
    for (const img of imgs) {
      const src = img.getAttribute('src') ?? '';
      expect(img.hasAttribute('alt'), src).toBe(true);
      if (src.endsWith('.svg')) {
        expect(src, 'hanya logo demo').toBe('/assets/templates/logos/tut-wuri-handayani.svg');
        expect(img.closest('header, footer'), src).not.toBeNull();
        continue;
      }
      expect(Number(img.getAttribute('width')), src).toBeGreaterThan(0);
      expect(Number(img.getAttribute('height')), src).toBeGreaterThan(0);
      expect(img.getAttribute('srcset'), src).toMatch(/ (800|240)w, /);
      expect(img.getAttribute('sizes'), src).toBeTruthy();
      // Foto dekoratif (avatar, foto kecil di samping nama) boleh alt kosong; foto isi wajib deskriptif
      const alt = img.getAttribute('alt')!;
      if (!img.className.includes('rounded-full') && alt !== '') expect(alt.split(' ').length, src).toBeGreaterThanOrEqual(5);
    }
    // Satu-satunya foto isi beralt kosong: foto kecil di samping nama pemberi kutipan (nama sudah tertulis)
    const decorative = imgs.filter((img) => img.getAttribute('alt') === '' && !img.className.includes('rounded-full') && !img.getAttribute('src')?.endsWith('.svg'));
    expect(decorative.map((img) => img.closest('figure')?.textContent)).toEqual([expect.stringContaining('Ratna Sari, M.Pd.')]);
    const eager = imgs.filter((img) => img.getAttribute('loading') !== 'lazy' && !img.getAttribute('src')?.endsWith('.svg'));
    expect(eager.map((img) => img.getAttribute('src'))).toEqual(['/assets/templates/photos/bestari-hero-1-1920.webp']);
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

describe('Bestari: konten opsional kosong', () => {
  it('hero tanpa foto → latar gradasi, tanpa slider; kartu sorotan dimatikan → hero tanpa ruang tumpang', () => {
    const container = demo({ hero: { image: '', slides: [], stats: [] }, highlights: { enabled: false } });
    const hero = section(container, 'hero');
    expect(hero.querySelector('img')).toBeNull();
    expect(hero.querySelector('.bs-hero-fallback')).not.toBeNull();
    expect(within(hero).queryByRole('group', { name: 'Kontrol slide' })).toBeNull();
    expect(hero.hasAttribute('aria-roledescription')).toBe(false);
    expect(hero.innerHTML).not.toContain('@5xl:pb-[124px]');
    expect(hero.querySelector('dl')).toBeNull();
    expect(sectionKeys(container)).not.toContain('highlights');
  });

  it('hero dimatikan → navbar putih tanpa bilah info', () => {
    const container = demo({ hero: { enabled: false } });
    const header = container.querySelector('header')!;
    expect(header.className).not.toContain('h-0');
    expect(header.firstElementChild!.className).toContain('bg-white');
    expect(header.firstElementChild!.hasAttribute('data-tpl-tone')).toBe(false);
    expect(header.textContent).not.toContain('PPDB 2027/2028 gelombang');
    expect(sectionKeys(container)[0]).toBe('highlights');
  });

  it('Berita disembunyikan: pengumuman & agenda punya jarak atas sendiri', () => {
    const wrapper = (container: HTMLElement) => section(container, 'announcements').parentElement!.parentElement!;
    expect(wrapper(demo()).className).not.toContain('pt-14');
    cleanup();
    expect(wrapper(demo({ news: { enabled: false } })).className).toContain('pt-14');
    cleanup();
    expect(wrapper(demo({ news: { items: [{ title: '', excerpt: 'x' }] } })).className).toContain('pt-14');
  });

  it('tanpa WhatsApp: formulir PPDB diganti tombol ke Kontak, tanya program & wali kelas ke PPDB/Kontak', () => {
    const container = demo({ contact: { whatsapp: '' } });
    const ppdb = section(container, 'ppdb');
    expect(within(ppdb).queryByRole('form')).toBeNull();
    expect(within(ppdb).getByRole('link', { name: 'Hubungi panitia' })).toHaveAttribute('href', '#kontak');
    expect(within(section(container, 'programs')).getAllByRole('link', { name: /Tanya tentang program/ })[0]).toHaveAttribute('href', '#ppdb');
    expect(within(section(container, 'teachers')).getByRole('link', { name: 'Tanya wali kelas' })).toHaveAttribute('href', '#kontak');
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
  });

  it('tanggal acuan usia kosong → usia dihitung per hari ini (petunjuk & pesan WhatsApp)', () => {
    const ppdb = section(demo({ ppdb: { age_reference: '' } }), 'ppdb');
    const form = within(ppdb).getByRole('form');
    const birth = within(form).getByLabelText('Tanggal lahir calon siswa');
    fireEvent.change(birth, { target: { value: '2011-01-15' } });
    const hint = document.getElementById(birth.getAttribute('aria-describedby')!)!;
    const today = parseSchoolDate(todayIso())!;
    expect(hint.textContent?.startsWith(`Usia per ${today.label}: `), hint.textContent ?? '').toBe(true);
    expect(hint.textContent).toMatch(/\d+ tahun/);
  });

  it('nomor WhatsApp panitia PPDB terpisah; tanpa pilihan kelas/jalur → isian itu tidak tampil', () => {
    const ppdb = section(demo({ ppdb: { whatsapp: '085700001111', paths: [], grades: [] } }), 'ppdb');
    const form = within(ppdb).getByRole('form');
    expect(within(form).queryByLabelText('Kelas yang dituju')).toBeNull();
    expect(within(form).queryByLabelText('Jalur pendaftaran')).toBeNull();
    fireEvent.change(within(form).getByLabelText('Nama lengkap calon siswa'), { target: { value: 'Bima Sakti' } });
    fireEvent.change(within(form).getByLabelText('Tanggal lahir calon siswa'), { target: { value: '2011-12-01' } });
    fireEvent.change(within(form).getByLabelText('Nama orang tua/wali'), { target: { value: 'Pak Sakti' } });
    fireEvent.change(within(form).getByLabelText('Nomor WhatsApp orang tua'), { target: { value: '081298765432' } });
    act(() => {
      fireEvent.submit(form);
    });
    expect(within(ppdb).getByRole('link', { name: 'Buka WhatsApp' }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/6285700001111\?text=/);
  });
});

describe('Bestari: pratinjau CMS', () => {
  it('pratinjau diam (gerak mati bila Component dirender langsung) dan tanpa tautan wa.me / Google Maps yang terbuka', () => {
    const { container } = render(<def.Component content={resolveContent(def, null)} preview />);
    expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'off');
    expect(container.querySelector('.bs-progress')).toHaveAttribute('data-run', 'false');
    expect(container.querySelector('[aria-label="Jeda slide otomatis"]')).toBeNull();
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    expect(container.querySelector('a[href^="https://www.google.com/maps"]')).toBeNull();
    fireEvent.click(within(container).getByRole('button', { name: /^Slide 3 dari 4/ }));
    expect(container.querySelector('h1')!.textContent).toBe('Panggung dan lapangan untuk berani tampil');
  });
});

describe('Bestari: editor CMS', () => {
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
    const help = ('help' in color && color.help) || '';
    expect(help).toContain('hijau #047857');
    expect(help).toContain('"Pakai bawaan" untuk terakota bawaan #C2410C');
    expect(within(container).queryByRole('button', { name: 'Pakai warna #C2410C' })).toBeNull();
  });
});

describe('Bestari: data katalog', () => {
  const sql = (file: string) => readFileSync(resolve(ROOT, file), 'utf8');

  it.each(['database/seed.templates.sql', 'database/migrations/2026-10-26_028_bestari_template.sql'])(
    '%s: baris bestari dengan template_code, kategori, harga, dan pratinjau tangkapan layar .webp',
    (file) => {
      const text = sql(file);
      expect(text).toContain("'bestari'");
      expect(text).toContain("'Sekolah & Pendidikan'");
      expect(text).toContain('1690000.00');
      expect(text).toContain("'/assets/templates/bestari-preview.webp'");
      expect(text).toContain('\'["/assets/templates/bestari-1.webp","/assets/templates/bestari-2.webp"]\'');
      expect(text).toMatch(/menyusun pesan WhatsApp untuk panitia; tidak ada penyimpanan data pendaftar atau pembayaran online/);
    },
  );

  it('migrasi 028 aman diulang (INSERT IGNORE + UPDATE berdasarkan slug, tanpa DELETE) dan tercatat di schema_migrations', () => {
    const text = sql('database/migrations/2026-10-26_028_bestari_template.sql').replace(/^--.*$/gm, '');
    expect(text).toMatch(/INSERT IGNORE INTO templates/);
    expect(text).toMatch(/WHERE slug = 'bestari';/);
    expect(text).toMatch(/sort_order\s+= 14/);
    expect(text).toMatch(/status\s+= 'published'/);
    expect(text).not.toMatch(/\bDELETE\b/);
    expect(text).toContain("VALUES ('2026-10-26_028', 'templates: katalog Bestari')");
  });

  it('gambar pratinjau katalog ada di public/, 1600×1000, dan ringan', () => {
    for (const name of ['bestari-preview', 'bestari-1', 'bestari-2']) {
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

describe('Bestari: konten aneh', () => {
  it('angka, null, dan string di tempat list tidak membuat crash; tautan berbahaya dibuang', () => {
    const weird = {
      hero: { slides: 'x', highlight: 'tidak ada di judul', primary_url: 'javascript:alert(1)', stats: [{ value: 5 }, null] },
      highlights: { items: [null, { title: 3 }] },
      badges: { items: 'x' },
      about: { pillars: [{ title: 'Visi', detail: 7 }], points: null },
      stats: { items: [{ value: 7 }, 'x'] },
      why: { items: [{ title: 2, text: null }] },
      programs: { items: [{ name: 1, image: 'javascript:alert(1)' }] },
      teachers: { items: [{ name: 'Guru', photo: 'javascript:alert(1)' }] },
      ppdb: { paths: [{ name: 2 }], schedule: [{ date: '2026-13-40', title: 'Tes' }], fees: 'x', grades: 'x', age_reference: 'besok', whatsapp: 'abc' },
      news: { items: [{ title: 'Berita', date: 9, category: null, url: 'javascript:alert(1)' }] },
      announcements: { items: [{ title: 'P', badge: 3 }] },
      agenda: { items: [{ title: 'A', date: 'besok' }] },
      testimonials: { items: [{ quote: 'Baik', photo: 'javascript:alert(1)' }] },
      faq: { items: [{ question: 2, answer: null }] },
      brand: { accent_color: 'oranye' },
    } as unknown as SiteContent;
    const { container } = render(<def.Component content={resolveContent(def, weird)} />);
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
    expect(container.querySelector('img[src^="javascript:"]')).toBeNull();
    expect(section(container, 'agenda').textContent).toContain('besok');
    expect(container.querySelector('h1')!.textContent).toBe('Tempat remaja tumbuh percaya diri dan siap kuliah');
  });
});
