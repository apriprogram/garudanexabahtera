// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/jumantara.test.tsx
// Jumantara (landing page SMA negeri "Clean institutional", 2026-10-27): skema CMS & konten demo (contoh SMA Negeri 1
// Purbolinggo, data lain fiktif), helper model (warna tema kobalt-hitam, menu, slide hero, tanggal + nama hari, filter
// ekstrakurikuler, formulir tanya panitia SPMB → pesan WhatsApp, garis rambut antar-section, ikon otomatis, anchor
// Indonesia), demo (urutan section, bilah utilitas, header transparan → putih, hero slider "stories" dengan bilah progres
// bersegmen + pita angka, layanan cepat, sambutan, profil bertab, mapel pilihan, berita, pengumuman & agenda, prestasi,
// ekstrakurikuler berfilter, rel fasilitas, guru, SPMB bertab + formulir, alumni, galeri, FAQ, kontak + peta, footer),
// berita & pengumuman dari tulisan (site_posts: section profesional, halaman /pengumuman & /berita/{slug}), kustomisasi
// warna, SEO situs pembeli, konten opsional kosong, pratinjau CMS diam, editor CMS, data katalog (migrasi 038 + seed +
// gambar pratinjau), dan konten aneh.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionEditor } from '../../pages/account/cms/SectionEditor';
import { validateContent } from '../../pages/account/cms/validation';
import { TEMPLATES, resolveContent } from '../index';
import { iconKey } from '../jumantara/icons';
import {
  allShort,
  AUTOPLAY_ROUNDS,
  clubCategories,
  degreeSplit,
  EMPTY_SPMB,
  filterByCategory,
  heroSlides,
  isPdf,
  isUrgent,
  jumantaraVars,
  keepName,
  linesOf,
  navItems,
  PAGE_SECTIONS,
  parseSchoolDate,
  pathChoices,
  readJumantara,
  sectionTarget,
  shortFreeDate,
  spmbMessage,
  validateSpmb,
  wrapIndex,
} from '../jumantara/model';
import { INPUT } from '../jumantara/styles';
import { JUMANTARA_PHOTOS } from '../jumantara/photos';
import { applySiteHead, siteTitle } from '../siteHead';
import { SiteRenderer } from '../SiteRenderer';
import { SITE_DATA_DEFAULT, type SiteData } from '../shared/siteData';
import { contrast, parseHex } from '../shared/utils';
import { isListField, type ListItem, type SiteContent } from '../types';
import { ANNOUNCEMENTS, NEWS, POST } from './fixtures/sitePosts';

// Demo panjang (17 section + footer) + getByRole di jsdom: bisa lewat 5 dtk saat suite berjalan paralel
vi.setConfig({ testTimeout: 30_000 });

const ROOT = process.cwd();
const def = TEMPLATES.jumantara;
const SCHOOL = 'SMA Negeri 1 Purbolinggo';
const ORDER = [
  'hero',
  'services',
  'welcome',
  'about',
  'programs',
  'news',
  'announcements',
  'agenda',
  'achievements',
  'clubs',
  'facilities',
  'teachers',
  'spmb',
  'testimonials',
  'gallery',
  'faq',
  'contact',
];
const sectionKeys = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-tpl-section]')).map((s) => s.getAttribute('data-tpl-section'));
const section = (root: HTMLElement, key: string) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`)!;
const demo = (content: unknown = null, preview = false) => render(<SiteRenderer templateCode="jumantara" content={content} preview={preview} />).container;
const rgb = (hex: string) => parseHex(hex)!;
const publicFile = (url: string) => resolve(ROOT, 'public', url.replace(/^\//, ''));
const rootStyle = (container: HTMLElement, name: string) => {
  const holder = Array.from(container.querySelectorAll<HTMLElement>('[style]')).find((el) => el.style.getPropertyValue(name));
  return holder?.style.getPropertyValue(name) ?? '';
};
const urls = (src: string) => {
  const asset = JUMANTARA_PHOTOS.asset(src)!;
  return [asset.src, ...asset.srcSet!.split(',').map((part) => part.trim().split(' ')[0])].filter((u, i, all) => all.indexOf(u) === i);
};
const wa = (el: Element | null) => decodeURIComponent(el?.getAttribute('href') ?? '');
const linkList = (root: Element) => Array.from(root.querySelectorAll('a')).map((a) => `${a.textContent}|${a.getAttribute('href')}`);
const vars = (accent: string) => jumantaraVars(accent) as Record<string, string>;
// React memetakan onAnimationEnd ke nama event yang didukung browser; jsdom tanpa AnimationEvent → versi webkit
const ANIMATION_END =
  'AnimationEvent' in window ? 'animationend' : 'WebkitAnimation' in document.createElement('div').style ? 'webkitAnimationEnd' : 'animationend';
const animationEnd = (el: Element) =>
  act(() => {
    el.dispatchEvent(new Event(ANIMATION_END, { bubbles: true }));
  });
const SOURCE_DIR = resolve(ROOT, 'src/templates/jumantara');
const sourceText = () =>
  readdirSync(SOURCE_DIR)
    .filter((name) => /\.(ts|tsx|css)$/.test(name))
    .map((name) => readFileSync(resolve(SOURCE_DIR, name), 'utf8'))
    .join('\n');
/**
 * Situs live dengan fitur Berita & Pengumuman aktif dan tulisan dari SiteDataContext (CustomerSite / SitePreview); `data`
 * menimpa rute dsb.
 */
const withPosts = (data: Partial<SiteData> = {}, content: unknown = null) =>
  render(
    <SiteRenderer
      templateCode="jumantara"
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

describe('Jumantara: skema & konten bawaan', () => {
  it('urutan form = urutan halaman, semua section bisa disembunyikan, field unik, list berbatas', () => {
    expect(def.code).toBe('jumantara');
    expect(def.name).toBe('Jumantara');
    expect(def.sections.map((s) => s.key)).toEqual(['brand', ...ORDER, 'footer']);
    const fields = (key: string) => def.sections.find((s) => s.key === key)!.fields.map((f) => f.key);
    expect(fields('brand')).toEqual(['company_name', 'tagline', 'logo', 'accent_color']);
    expect(def.sections[0].fields.find((f) => f.key === 'accent_color')?.type).toBe('color');
    expect(fields('hero')).toEqual(
      expect.arrayContaining(['topbar_links', 'image', 'slides', 'slide_label', 'stats', 'stats_note', 'primary_label', 'secondary_label', 'header_label']),
    );
    expect(fields('spmb')).toEqual(
      expect.arrayContaining(['portal_label', 'portal_url', 'paths', 'schedule', 'requirements', 'form_title', 'form_text', 'form_button', 'whatsapp']),
    );
    expect(fields('contact')).toEqual(expect.arrayContaining(['address', 'maps_query', 'maps_url', 'phone', 'email', 'whatsapp', 'whatsapp_message', 'hours']));
    expect(fields('footer')).toEqual(expect.arrayContaining(['instagram', 'facebook', 'linkedin', 'youtube', 'tiktok']));
    const contact = def.sections.find((s) => s.key === 'contact')!;
    expect(contact.fields.find((f) => f.key === 'whatsapp')?.type).toBe('phone');
    for (const s of def.sections) {
      const keys = s.fields.map((f) => f.key);
      expect(new Set(keys).size, s.key).toBe(keys.length);
      for (const f of s.fields) {
        if (isListField(f)) {
          expect(f.max, `${s.key}.${f.key}`).toBeGreaterThan(0);
          for (const sub of f.fields) if (['text', 'textarea'].includes(sub.type)) expect(sub.maxLength, `${s.key}.${f.key}.${sub.key}`).toBeGreaterThan(0);
        } else if (['text', 'textarea'].includes(f.type)) expect(f.maxLength, `${s.key}.${f.key}`).toBeGreaterThan(0);
      }
      expect(def.defaultContent[s.key], s.key).toBeTypeOf('object');
      expect(s.introduced).toBeUndefined();
      if (s.key !== 'brand') expect(s.toggleable, s.key).toBe(true);
    }
    const hero = def.sections.find((s) => s.key === 'hero')!;
    const slides = hero.fields.find((f) => f.key === 'slides');
    expect(slides && isListField(slides) ? slides.max : 0).toBe(3);
    // Label CMS menyebut SPMB dan PPDB, agar sekolah yang memakai istilah mana pun paham
    expect(def.sections.find((s) => s.key === 'spmb')!.label).toMatch(/SPMB.*PPDB/);
  });

  it('berita & pengumuman berbentuk data sama dengan template sekolah lain (siap untuk CRUD berita)', () => {
    const itemKeys = (sectionKey: string) => {
      const list = def.sections.find((s) => s.key === sectionKey)!.fields.find((f) => f.key === 'items');
      return list && isListField(list) ? [...list.fields.map((f) => f.key)].sort() : [];
    };
    const same = (code: string, key: string) => {
      const other = TEMPLATES[code].sections.find((s) => s.key === key)!.fields.find((f) => f.key === 'items');
      return other && isListField(other) ? [...other.fields.map((f) => f.key)].sort() : [];
    };
    for (const code of ['bestari', 'cakrawala', 'madani']) {
      expect(itemKeys('news'), code).toEqual(same(code, 'news'));
      expect(itemKeys('announcements'), code).toEqual(same(code, 'announcements'));
    }
    expect(itemKeys('agenda')).toEqual(same('cakrawala', 'agenda'));
    expect(def.features?.posts).toBe(true);
  });

  it('konten demo lolos validasi CMS, logo Tut Wuri Handayani (SVG), semua foto terdaftar, ada di public/, dan tercatat di CREDITS.md', () => {
    const c = def.defaultContent;
    expect(validateContent(def, resolveContent(def, null))).toEqual({});
    expect(c.brand.company_name).toBe(SCHOOL);
    expect(c.brand.logo).toBe('/assets/templates/logos/tut-wuri-handayani.svg');
    expect(existsSync(publicFile(c.brand.logo as string))).toBe(true);
    expect(c.brand.accent_color).toBe('#2F5BEA');
    expect(c.hero.image).toBe('/assets/templates/photos/jumantara-hero-1-1920.webp');
    const photos = JSON.stringify(c).match(/\/assets\/templates\/photos\/[a-z0-9-]+\.webp/g) ?? [];
    expect(photos.length).toBeGreaterThanOrEqual(19);
    for (const src of photos) expect(JUMANTARA_PHOTOS.asset(src), src).not.toBeNull();
    const credits = readFileSync(resolve(ROOT, 'public/assets/templates/photos/CREDITS.md'), 'utf8');
    expect(credits).toContain('## Jumantara');
    for (const key of JUMANTARA_PHOTOS.keys) {
      expect(key.startsWith('jumantara-'), key).toBe(true);
      for (const url of urls(JUMANTARA_PHOTOS.src(key))) expect(existsSync(publicFile(url)), url).toBe(true);
      expect(credits, key).toContain(`\`${key}-*\``);
      expect(photos, `${key} dipakai di konten demo`).toContain(JUMANTARA_PHOTOS.src(key));
      expect(JUMANTARA_PHOTOS.alt(JUMANTARA_PHOTOS.src(key), '').split(' ').length, key).toBeGreaterThanOrEqual(5);
    }
    // Simbol bawaan juga tersedia sebagai SVG mandiri, path sama dengan komponen
    const mark = readFileSync(publicFile('/assets/templates/logos/jumantara-mark.svg'), 'utf8');
    const component = readFileSync(resolve(ROOT, 'src/templates/jumantara/marks.tsx'), 'utf8');
    const paths = mark.match(/ d="[^"]+"/g) ?? [];
    expect(paths.length).toBeGreaterThan(0);
    for (const d of paths) expect(component, d).toContain(d.trim());
    expect(mark).toMatch(/viewBox="0 0 32 32"/);
    expect(mark).toMatch(/<title>/);
  });

  it('foto demo ringan: slide hero 800/1280/1920, WebP ≤ 140 KB per file (800w ≤ 90 KB), total ≤ 2,5 MB', () => {
    expect(JUMANTARA_PHOTOS.asset(def.defaultContent.hero.image as string)!.srcSet).toBe(
      '/assets/templates/photos/jumantara-hero-1-800.webp 800w, /assets/templates/photos/jumantara-hero-1-1280.webp 1280w, /assets/templates/photos/jumantara-hero-1-1920.webp 1920w',
    );
    let total = 0;
    for (const key of JUMANTARA_PHOTOS.keys) {
      for (const url of urls(JUMANTARA_PHOTOS.src(key))) {
        expect(url, url).toMatch(/\.webp$/);
        const kb = statSync(publicFile(url)).size / 1024;
        expect(kb, url).toBeLessThanOrEqual(140);
        if (url.endsWith('-800.webp')) expect(kb, url).toBeLessThanOrEqual(90);
        total += kb;
      }
    }
    expect(total).toBeLessThanOrEqual(2500);
  });

  it('salinan demo jujur: formulir SPMB hanya untuk bertanya lewat WhatsApp, tanpa klaim akreditasi/NPSN/peringkat', () => {
    const text = JSON.stringify(def.defaultContent);
    expect(text).not.toMatch(/dijamin|garansi|pasti diterima|pasti lolos|e-rapor|absensi online|pembayaran online|terbaik nomor|termurah|#1|nomor 1/i);
    // Data sekolah sungguhan tidak diklaim: tanpa NPSN, akreditasi, tahun berdiri, atau istilah PPDB/zonasi lama
    expect(text).not.toMatch(/\bNPSN\b|akreditasi|terakreditasi|berdiri sejak|\bPPDB\b|zonasi/i);
    expect(text).toMatch(/Data tidak disimpan di website dan tidak ada pembayaran daring/);
    expect(text).toMatch(/hanya untuk bertanya, bukan pendaftaran/);
    expect(text).toMatch(/portal resmi SPMB Provinsi Lampung/);
    expect(text).toMatch(/alamat contoh/);
    expect(text).toMatch(/ilustrasi/);
    // Kurikulum Merdeka: kelompok mapel pilihan, bukan jurusan IPA/IPS tetap
    expect(text).toMatch(/paket mata pelajaran/);
    expect(text).not.toMatch(/\b(jurusan|kelas) (IPA|IPS)\b/i);
    // SMA, bukan SD
    expect(text).not.toMatch(/\bSD\b|sekolah dasar|TK\/PAUD|kelas [1-6]\b/i);
    // Email & telepon demo, bukan milik sekolah sungguhan
    expect(def.defaultContent.contact.email).toMatch(/\.example$/);
    expect(def.defaultContent.contact.whatsapp).toBe('081234567890');
  });
});

describe('Jumantara: helper model', () => {
  it('warna tema: kobalt-hitam (putih ≥ 17:1), versi terang ≥ 5,5:1 di atasnya, tinta ≥ 5:1 di putih & ≥ 4,6:1 di tint; warna tidak valid → bawaan', () => {
    const white = rgb('#ffffff');
    const base = vars('#2F5BEA');
    expect(base['--jm-night']).toBe('#0a112d');
    expect(contrast(rgb('#2F5BEA'), white)).toBeGreaterThanOrEqual(4.5);
    // Semua warna (kisi RGB 18 langkah, 5.832 warna) tetap lolos AA
    const steps = Array.from({ length: 18 }, (_, i) => Math.round((i * 255) / 17));
    const worst = { inkOnTint: Infinity, inkOnWhite: Infinity, whiteOnNight: Infinity, brightOnNight: Infinity };
    for (const r of steps)
      for (const g of steps)
        for (const b of steps) {
          const v = vars(`#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`);
          const ink = rgb(v['--jm-ink']);
          const night = rgb(v['--jm-night']);
          worst.inkOnTint = Math.min(worst.inkOnTint, contrast(ink, rgb(v['--jm-tint'])));
          worst.inkOnWhite = Math.min(worst.inkOnWhite, contrast(ink, white));
          worst.whiteOnNight = Math.min(worst.whiteOnNight, contrast(white, night));
          worst.brightOnNight = Math.min(worst.brightOnNight, contrast(rgb(v['--jm-bright']), night));
        }
    expect(worst.inkOnTint).toBeGreaterThanOrEqual(4.6);
    expect(worst.inkOnWhite).toBeGreaterThanOrEqual(5);
    expect(worst.whiteOnNight).toBeGreaterThanOrEqual(17);
    expect(worst.brightOnNight).toBeGreaterThanOrEqual(5.5);
    expect(vars('bukan warna')).toEqual(base);
    // Biru kobalt, bukan biru Cakrawala / terakota Bestari / hijau Madani
    const accent = rgb(def.defaultContent.brand.accent_color as string);
    expect(accent[2]).toBeGreaterThan(accent[0] + 120);
    expect(accent[2]).toBeGreaterThan(accent[1] + 120);
    for (const code of ['bestari', 'cakrawala', 'madani']) expect(def.defaultContent.brand.accent_color, code).not.toBe(TEMPLATES[code].defaultContent.brand.accent_color);
    // Hijau dari CMS menghasilkan pita gelap yang lebih hijau & kurang biru dari bawaan (turunan warna tema, bukan tetap)
    const green = rgb(vars('#047857')['--jm-night']);
    const cobalt = rgb(base['--jm-night']);
    expect(green[1] - green[0]).toBeGreaterThan(cobalt[1] - cobalt[0]);
    expect(green[2]).toBeLessThan(cobalt[2]);
  });

  it('menu: Profil, Akademik, Kesiswaan, Berita, Pengumuman, Kontak; label singkat dari label section', () => {
    const content = resolveContent(def, null);
    expect(navItems(content).map((i) => `${i.key}:${i.label}`)).toEqual([
      'about:Profil',
      'programs:Akademik',
      'clubs:Kesiswaan',
      'news:Berita',
      'announcements:Pengumuman',
      'contact:Kontak',
    ]);
    const other = resolveContent(def, { programs: { eyebrow: 'Kurikulum sekolah kami' }, clubs: { enabled: false }, news: { items: [] } });
    expect(navItems(other).map((i) => `${i.key}:${i.label}`)).toEqual(['about:Profil', 'programs:Akademik', 'announcements:Pengumuman', 'contact:Kontak']);
    expect(navItems(resolveContent(def, { about: { eyebrow: 'Tentang' } })).find((i) => i.key === 'about')?.label).toBe('Tentang');
  });

  it('slide hero: slide 1 = isi hero, tambahan hanya yang berfoto (maks. 3), teks kosong ikut slide 1; indeks berputar', () => {
    const base = { image: '/a.webp', slide_label: 'Profil', eyebrow: 'Label', title: 'Judul utama', subtitle: 'Deskripsi' };
    const first = { image: '/a.webp', label: 'Profil', eyebrow: 'Label', title: 'Judul utama', subtitle: 'Deskripsi' };
    expect(heroSlides({ ...base, slides: [{ image: '', title: 'Tanpa foto' }, { image: '/b.webp' }, { image: '/c.webp', label: 'C', title: 'Judul C' }] }, 'Sekolah')).toEqual([
      first,
      { image: '/b.webp', label: '', eyebrow: 'Label', title: 'Judul utama', subtitle: 'Deskripsi' },
      { image: '/c.webp', label: 'C', eyebrow: 'Label', title: 'Judul C', subtitle: 'Deskripsi' },
    ]);
    expect(heroSlides({}, 'Sekolah')).toEqual([{ image: '', label: '', eyebrow: '', title: 'Sekolah', subtitle: '' }]);
    expect(heroSlides({ slides: Array.from({ length: 6 }, (_, i) => ({ image: `/s${i}.webp` })) }, 'S')).toHaveLength(4);
    expect(heroSlides({ slides: [{ image: 'javascript:alert(1)' }] }, 'S')).toHaveLength(1);
    expect([wrapIndex(4, 4), wrapIndex(-1, 4), wrapIndex(2, 4), wrapIndex(1, 0)]).toEqual([0, 3, 2, 0]);
    expect(AUTOPLAY_ROUNDS).toBe(2);
  });

  it('tanggal: ISO valid → "25 Nov 2026" + nama hari lengkap, teks bebas apa adanya, tanggal mustahil → teks', () => {
    expect(parseSchoolDate('2026-11-25')).toEqual({ iso: '2026-11-25', day: '25', month: 'Nov', year: '2026', label: '25 Nov 2026', long: 'Rabu, 25 November 2026' });
    // Hari di agenda demo benar
    expect(def.defaultContent.agenda.items).toBeInstanceOf(Array);
    const days = (def.defaultContent.agenda.items as ListItem[]).map((i) => parseSchoolDate(i.date as string)?.long.split(',')[0]);
    expect(days).toEqual(['Rabu', 'Jumat', 'Sabtu', 'Sabtu', 'Senin']);
    expect(parseSchoolDate('2026-02-30')).toBeNull();
    expect(parseSchoolDate('25 Nov')).toBeNull();
    expect(parseSchoolDate(' 2027-07-12 ')?.label).toBe('12 Jul 2027');
    expect([shortFreeDate('Juni'), shortFreeDate('Akhir Juni 2027'), shortFreeDate('')]).toEqual(['Juni', 'Akhir…', '']);
  });

  it('teks: butir per baris, chip bila pendek; label penting; lampiran PDF', () => {
    expect(linesOf('- Visi\n\n• Misi satu\r\n  * Tiga ')).toEqual(['Visi', 'Misi satu', 'Tiga']);
    expect([allShort(['Kolaborasi', 'Kreativitas']), allShort(['Menyelenggarakan pembelajaran mendalam yang berpusat pada murid.']), allShort([])]).toEqual([true, false, false]);
    expect([isUrgent('Penting'), isUrgent('WAJIB'), isUrgent('Segera'), isUrgent('Info'), isUrgent('')]).toEqual([true, true, true, false, false]);
    expect([isPdf('/surat.pdf'), isPdf('https://x.test/a.PDF?dl=1'), isPdf('https://x.test/a.pdf.html'), isPdf('')]).toEqual([true, true, false, false]);
    // Nama bergelar: kata terakhir + gelar jadi satu bagian (gelar tidak turun sendirian ke baris terakhir)
    expect(degreeSplit('Dewi Anggraini, S.Si.')).toEqual(['Dewi ', 'Anggraini, S.Si.']);
    expect(degreeSplit('Muhammad Rizal, S.Pd., M.Si.')).toEqual(['Muhammad ', 'Rizal, S.Pd., M.Si.']);
    expect(degreeSplit('Rizal, S.Pd.')).toEqual(['', 'Rizal, S.Pd.']);
    expect(degreeSplit('Agus Riyanto')).toBeNull();
    // Nama sekolah di judul tidak dipenggal; nama panjang (> 26 huruf) dibiarkan agar tetap muat di HP
    expect(keepName('Selamat datang di SMA Negeri 1 Purbolinggo', SCHOOL)).toBe('Selamat datang di SMA Negeri 1 Purbolinggo');
    const long = 'SMA Negeri 2 Kota Bandar Lampung';
    expect(keepName(`Selamat datang di ${long}`, long)).toBe(`Selamat datang di ${long}`);
    expect(keepName('Profil sekolah', SCHOOL)).toBe('Profil sekolah');
  });

  it('ekstrakurikuler: kategori unik berurutan tanpa beda huruf besar, filter tak dikenal → semua', () => {
    const items: ListItem[] = [
      { name: 'A', category: 'Olahraga' },
      { name: 'B', category: 'seni' },
      { name: 'C', category: 'olahraga ' },
      { name: 'D', category: '' },
    ];
    expect(clubCategories(items)).toEqual(['Olahraga', 'seni']);
    expect(filterByCategory(items, 'OLAHRAGA').map((i) => i.name)).toEqual(['A', 'C']);
    expect(filterByCategory(items, null)).toHaveLength(4);
    expect(filterByCategory(items, 'Robotik')).toHaveLength(4);
  });

  it('formulir tanya panitia SPMB: validasi nama & pertanyaan, pesan WhatsApp per baris (asal kosong → "-")', () => {
    expect(Object.keys(validateSpmb(EMPTY_SPMB))).toEqual(['name', 'question']);
    expect(validateSpmb({ ...EMPTY_SPMB, name: 'Al', question: 'Kapan?' })).toEqual({
      name: 'Tulis nama Anda (minimal 3 huruf).',
      question: 'Tulis pertanyaan Anda (minimal 10 karakter).',
    });
    const filled = { name: '  Bima   Saputra ', origin: '', path: 'Domisili', question: 'Apakah ada\nsosialisasi   untuk orang tua?' };
    expect(validateSpmb(filled)).toEqual({});
    expect(spmbMessage(SCHOOL, filled)).toBe(
      'Halo Panitia SPMB SMA Negeri 1 Purbolinggo, saya ingin bertanya.\nNama: Bima Saputra\nAsal sekolah: -\nJalur yang diminati: Domisili\nPertanyaan: Apakah ada sosialisasi untuk orang tua?',
    );
    expect(spmbMessage('X', { ...filled, path: '' })).toContain('Jalur yang diminati: Belum tahu');
    // Isian dipotong sesuai batas
    expect(spmbMessage('X', { ...filled, name: 'a'.repeat(200) })).toContain(`Nama: ${'a'.repeat(60)}\n`);
    // Pilihan jalur: unik (tanpa beda huruf besar/spasi), tanpa nama kosong & tanpa "Belum tahu" (ditambahkan sendiri)
    expect(pathChoices([{ name: 'Domisili' }, { name: ' domisili ' }, { name: '' }, { name: 'belum  tahu' }, { name: 'Prestasi' }, null as unknown as ListItem])).toEqual([
      'Domisili',
      'Prestasi',
    ]);
  });

  it('ikon otomatis dari teks (layanan, mapel, ekstrakurikuler); tanpa kecocokan → ikon cadangan', () => {
    expect(['E-Learning', 'Perpustakaan Digital', 'PPID', 'Legalisir Ijazah', 'Tracer Study', 'Pengaduan', 'Info SPMB'].map((t) => iconKey(t))).toEqual([
      'elearning',
      'library',
      'ppid',
      'stamp',
      'tracer',
      'report',
      'register',
    ]);
    expect(['Sains & Teknologi', 'Sosial & Humaniora', 'Bahasa & Budaya', 'Kokurikuler'].map((t) => iconKey(t))).toEqual(['science', 'social', 'language', 'project']);
    expect(
      ['Pramuka', 'Paskibra', 'PMR', 'Sanggar Tari Lampung', 'Karya Ilmiah Remaja', 'English & Debate Club', 'Bola Voli & Futsal', 'Rohis & Kerohanian'].map((t) => iconKey(t)),
    ).toEqual(['scout', 'flag', 'health', 'art', 'science', 'debate', 'sport', 'faith']);
    expect([iconKey('Sesuatu yang lain', 0), iconKey('Sesuatu yang lain', 1), iconKey('', 7)]).toEqual(['school', 'book', 'book']);
  });

  it('tautan "#…": anchor Indonesia (#spmb, #ppdb, #fasilitas, #kesiswaan, #akademik) ke section yang benar, anchor tak dikenal → cadangan', () => {
    expect([...PAGE_SECTIONS]).toEqual(def.sections.map((s) => s.key).filter((k) => k !== 'brand'));
    expect(['berita', '#PPDB', 'spmb', 'pendaftaran', 'profil', 'kontak', 'tentang', 'beranda', 'guru', 'fasilitas', 'kesiswaan', 'akademik', 'layanan', 'testimoni', 'galeri'].map(sectionTarget)).toEqual([
      'news',
      'spmb',
      'spmb',
      'spmb',
      'about',
      'contact',
      'about',
      'hero',
      'teachers',
      'facilities',
      'clubs',
      'programs',
      'services',
      'testimonials',
      'gallery',
    ]);
    expect(['xyz', 'brand', ''].map(sectionTarget)).toEqual([null, null, null]);
    const m = readJumantara(resolveContent(def, null));
    const fallback = { kind: 'section', target: 'contact' } as const;
    expect(m.shown('berita')).toBe(false);
    expect(m.linkOr('#berita', fallback)).toEqual({ kind: 'section', target: 'news' });
    expect(m.linkOr('#ppdb', fallback)).toEqual({ kind: 'section', target: 'spmb' });
    expect(m.linkOr('#beranda', fallback)).toEqual({ kind: 'section', target: 'hero' });
    expect(m.linkOr('#salah-ketik', fallback)).toBe(fallback);
    expect(m.linkOr('', fallback)).toEqual(fallback);
    expect(m.linkOr('#footer', null)).toEqual({ kind: 'section', target: 'footer' });
    const hidden = readJumantara(resolveContent(def, { spmb: { enabled: false } }));
    expect(hidden.linkOr('#spmb', fallback)).toBe(fallback);
    // Tombol hero tanpa SPMB → WhatsApp sekolah
    expect(hidden.primaryAction).toEqual({ kind: 'external', href: expect.stringMatching(/^https:\/\/wa\.me\/6281234567890/) });
    // Tautan cepat bilah atas yang kosong → Layanan
    expect(m.topbarLinks.map((l) => `${l.label}:${JSON.stringify(l.action)}`)).toEqual([
      'PPID:{"kind":"section","target":"services"}',
      'E-Learning:{"kind":"section","target":"services"}',
      'Pengaduan:{"kind":"section","target":"contact"}',
    ]);
  });

  it('garis rambut hanya di antara dua section putih berurutan (mengikuti section yang tampil)', () => {
    const m = readJumantara(resolveContent(def, null));
    const white = ORDER.filter((k) => m.ruleAbove(k));
    expect(white).toEqual(['about', 'clubs', 'gallery']);
    // Layanan disembunyikan: sambutan langsung di bawah hero (foto) → tanpa garis; prestasi disembunyikan: ekskul di bawah
    // agenda (tint) → tanpa garis
    const other = readJumantara(resolveContent(def, { services: { enabled: false }, achievements: { items: [] }, testimonials: { enabled: false } }));
    expect(ORDER.filter((k) => other.ruleAbove(k))).toEqual(['about']);
    // Section aktif tetapi kosong tidak dihitung tampil
    const empty = readJumantara(resolveContent(def, { welcome: { title: '', quote: '', body: '' }, testimonials: { items: [{ name: 'Tanpa kutipan' }] } }));
    expect([empty.shown('welcome'), empty.shown('testimonials')]).toEqual([false, false]);
    expect(ORDER.filter((k) => empty.ruleAbove(k))).toEqual(['clubs']);
  });
});

describe('Jumantara: demo', () => {
  it('urutan section, satu h1, hero slider selebar layar (data-hero-layout stories), angka sekolah', () => {
    const container = demo();
    // Footer juga tujuan tautan "#footer" (landmark <footer> ber-data-tpl-section)
    expect(sectionKeys(container)).toEqual([...ORDER, 'footer']);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const hero = section(container, 'hero');
    expect(hero.getAttribute('data-hero-layout')).toBe('stories');
    expect(hero.getAttribute('data-tpl-tone')).toBe('inverse');
    expect(hero.querySelector('h1')!.textContent).toBe('Belajar bermakna, tumbuh berkarakter');
    expect(hero.querySelector('h1')!.className).toContain('text-white');
    // Foto selebar layar: langsung di dalam section (bukan di dalam CONTAINER / bingkai membulat), ber-lapisan gelap
    const slide = hero.querySelector<HTMLElement>('.jm-slide')!;
    expect(slide.parentElement!.parentElement).toBe(hero);
    expect(slide.parentElement!.className).not.toMatch(/rounded|max-w-|mx-auto|px-/);
    expect(slide.parentElement!.querySelector('.jm-hero-scrim')).not.toBeNull();
    const img = hero.querySelector<HTMLImageElement>('img[fetchpriority="high"]')!;
    expect(img.getAttribute('src')).toBe('/assets/templates/photos/jumantara-hero-1-1920.webp');
    expect(img.getAttribute('srcset')).toContain('-800.webp 800w');
    expect(img.getAttribute('srcset')).toContain('-1280.webp 1280w');
    expect(img.getAttribute('loading')).toBe('eager');
    // HP/tablet: foto 16:9 menutupi wadah tegak (± 1.170px CSS lebar tampil), jadi browser memilih file yang cukup tajam
    expect(img.getAttribute('sizes')).toBe('(max-width: 1023px) 1200px, 100vw');
    expect(Number(img.getAttribute('width'))).toBe(1920);
    expect(Number(img.getAttribute('height'))).toBe(1080);
    expect(img.getAttribute('alt')).toMatch(/rok abu-abu/);
    expect(container.querySelectorAll('img[fetchpriority="high"]')).toHaveLength(1);
    expect(within(hero).getByRole('link', { name: 'Informasi SPMB' })).toHaveAttribute('href', '#spmb');
    expect(within(hero).getByRole('link', { name: 'Profil sekolah' })).toHaveAttribute('href', '#tentang');
    // Chip label slide (tanpa pil), deskripsi
    expect(hero.textContent).toContain('SMA Negeri · Lampung Timur');
    expect(hero.textContent).toContain('layanan yang mudah dijangkau orang tua');
    // Empat angka sekolah di pita bawah foto; teks akhir selalu di DOM (hitung naik hanya lapisan aria-hidden)
    expect(Array.from(hero.querySelectorAll('dt')).map((d) => d.textContent)).toEqual(['Peserta didik', 'Guru', 'Rombongan belajar', 'Ekstrakurikuler']);
    expect(Array.from(hero.querySelectorAll('dd')).map((d) => d.textContent)).toEqual(['1.048', '62', '30', '20']);
    expect(hero.querySelector('dl')!.className).toContain('@3xl:grid-cols-4');
    expect(hero.querySelector('dd')!.className).toContain('tabular-nums');
    expect(hero.textContent).toContain('Data Tahun Ajaran 2026/2027 · angka ilustrasi');
  });

  it('bilah utilitas kobalt-hitam (telepon, email, jam layanan, tautan cepat) + header transparan di atas hero', () => {
    const container = demo();
    const bar = container.querySelector<HTMLElement>('[data-jm-utility]')!;
    expect(bar).not.toBeNull();
    expect(bar.className).toMatch(/^hidden .*@3xl:block/);
    expect(bar.className).toContain('bg-(--jm-night)');
    expect(bar).toHaveAttribute('data-tpl-tone', 'inverse');
    expect(linkList(bar)).toEqual([
      '0812-3456-7890|tel:+6281234567890',
      'info@sman1purbolinggo.example|mailto:info@sman1purbolinggo.example',
      'PPID|#layanan',
      'E-Learning|#layanan',
      'Pengaduan|#kontak',
    ]);
    expect(bar.textContent).toContain('Senin–Jumat 07.00–16.00 WIB');

    // Header menempel, setinggi 0 di atas hero (foto di belakangnya); belum digulir: transparan & bertema gelap
    const header = container.querySelector('header')!;
    expect(header.className).toContain('h-0');
    expect(header.className).toContain('sticky');
    const navbar = header.firstElementChild!;
    expect(navbar.getAttribute('data-tpl-tone')).toBe('inverse');
    expect(navbar.className).toContain('bg-transparent');
    expect(navbar.className).toContain('border-transparent');
    expect(within(header).getByRole('link', { name: 'Info SPMB' })).toHaveAttribute('href', '#spmb');
    // Logo & nama: tautan flex ke awal halaman
    const home = within(header).getByRole('link', { name: `${SCHOOL}, ke awal halaman` });
    expect(home).toHaveAttribute('href', '#beranda');
    expect(home.className).toMatch(/^flex .*items-center/);
    expect(home.textContent).toContain(SCHOOL);
    expect(home.textContent).toContain('Sekolah negeri di Lampung Timur');
    const nav = within(header).getAllByRole('navigation', { name: 'Menu utama' })[0];
    expect(linkList(nav)).toEqual(['Profil|#tentang', 'Akademik|#programs', 'Kesiswaan|#clubs', 'Berita|#berita', 'Pengumuman|#pengumuman', 'Kontak|#kontak']);
    expect(header.querySelector('img[src="/assets/templates/logos/tut-wuri-handayani.svg"]'), 'logo demo').not.toBeNull();
    fireEvent.click(within(nav).getByRole('link', { name: 'Kesiswaan' }));
    expect(scrolled).toEqual(['clubs']);
    cleanup();
    // Logo kosong → simbol Jumantara (SVG 32×32, tanpa huruf)
    expect(demo({ brand: { logo: '' } }).querySelector('header svg[viewBox="0 0 32 32"]'), 'JumantaraMark').not.toBeNull();
    cleanup();
    // Tanpa kontak & tautan cepat → bilah utilitas tidak dirender
    expect(demo({ contact: { phone: '', email: '', hours: '' }, hero: { topbar_links: [] } }).querySelector('[data-jm-utility]')).toBeNull();
  });

  it('menu HP: tombol buka/tutup (aria-expanded), Esc menutup dan fokus kembali ke tombol', () => {
    const header = demo().querySelector('header')!;
    const toggle = within(header).getByRole('button', { name: 'Buka menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAccessibleName('Tutup menu');
    // Menu terbuka: header putih (teks gelap)
    expect(header.firstElementChild!.hasAttribute('data-tpl-tone')).toBe(false);
    expect(within(header).getAllByRole('navigation', { name: 'Menu utama' })).toHaveLength(2);
    const panel = document.getElementById(toggle.getAttribute('aria-controls')!)!;
    expect(within(panel).getAllByRole('link').map((a) => a.textContent)).toEqual([
      'Profil',
      'Akademik',
      'Kesiswaan',
      'Berita',
      'Pengumuman',
      'Kontak',
      'Info SPMB',
      'PPID',
      'E-Learning',
      'Pengaduan',
      '0812-3456-7890',
      'info@sman1purbolinggo.example',
    ]);
    fireEvent.click(within(panel).getByRole('link', { name: 'Berita' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(scrolled).toEqual(['news']);
    fireEvent.click(toggle);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
  });

  it('hero slider: 4 slide, bilah progres per slide + sebelumnya/berikutnya, panah keyboard, geser, jeda, berhenti saat disorot', () => {
    const hero = section(demo(), 'hero');
    expect(hero.getAttribute('aria-roledescription')).toBe('carousel');
    expect(hero.getAttribute('aria-label')).toBe(`Sorotan ${SCHOOL}`);
    const controls = within(hero).getByRole('group', { name: 'Kontrol slide' });
    const segments = within(controls).getAllByRole('button', { name: /^Slide \d dari 4/ });
    expect(segments).toHaveLength(4);
    // Nama aksesibel memuat nama slide yang tampil di bilah progres (Label in Name)
    expect(segments.map((d) => d.getAttribute('aria-label'))).toEqual([
      'Slide 1 dari 4: Profil',
      'Slide 2 dari 4: Pembelajaran',
      'Slide 3 dari 4: Seni & budaya',
      'Slide 4 dari 4: Kesiswaan',
    ]);
    // Nomor 01–04 selalu tampil; nama slide hanya di layar lebar
    expect(segments.map((d) => d.textContent)).toEqual(['01Profil', '02Pembelajaran', '03Seni & budaya', '04Kesiswaan']);
    expect(segments[0].querySelector('.truncate')!.className).toContain('hidden');
    expect(segments[0]).toHaveAttribute('aria-current', 'true');
    const fill = (i: number) => segments[i].querySelector<HTMLElement>('.jm-seg-fill')!;
    expect([0, 1, 2, 3].map((i) => fill(i).getAttribute('data-state'))).toEqual(['active', 'todo', 'todo', 'todo']);
    expect(fill(0)).toHaveAttribute('data-auto', 'true');
    expect(fill(0)).toHaveAttribute('data-run', 'true');
    expect(fill(0)).toHaveAttribute('data-hold', 'false');
    // Hanya foto slide 1 yang dimuat di awal (eager)
    expect(hero.querySelectorAll('.jm-slide img')).toHaveLength(1);

    fireEvent.click(within(controls).getByRole('button', { name: 'Slide berikutnya' }));
    expect(segments[1]).toHaveAttribute('aria-current', 'true');
    expect([0, 1, 2, 3].map((i) => fill(i).getAttribute('data-state'))).toEqual(['done', 'active', 'todo', 'todo']);
    expect(hero.querySelector('h1')!.textContent).toBe('Kelas yang hidup, pikiran yang kritis');
    expect(hero.textContent).toContain('Pembelajaran mendalam');
    const imgs = Array.from(hero.querySelectorAll<HTMLImageElement>('.jm-slide img'));
    expect(imgs.map((i) => i.getAttribute('fetchpriority'))).toEqual(['high', null, null, null]);
    expect(imgs.slice(1).every((i) => i.getAttribute('loading') === 'lazy')).toBe(true);
    expect(imgs.map((i) => i.getAttribute('alt') !== '')).toEqual([false, true, false, false]);
    expect(Array.from(hero.querySelectorAll('.jm-slide')).map((s) => s.getAttribute('aria-hidden'))).toEqual(['true', null, 'true', 'true']);
    expect(hero.querySelectorAll('h1')).toHaveLength(1);
    // Tombol hero sama untuk semua slide
    expect(within(hero).getByRole('link', { name: 'Informasi SPMB' })).toHaveAttribute('href', '#spmb');

    fireEvent.click(within(controls).getByRole('button', { name: 'Slide sebelumnya' }));
    fireEvent.click(within(controls).getByRole('button', { name: 'Slide sebelumnya' }));
    expect(segments[3]).toHaveAttribute('aria-current', 'true');
    fireEvent.keyDown(segments[3], { key: 'ArrowRight' });
    expect(segments[0]).toHaveAttribute('aria-current', 'true');
    fireEvent.keyDown(segments[0], { key: 'ArrowLeft' });
    expect(segments[3]).toHaveAttribute('aria-current', 'true');
    fireEvent.click(segments[2]);
    expect(hero.querySelector('h1')!.textContent).toBe('Bangga merawat seni dan budaya daerah');
    // Geser ke kiri di HP → slide berikutnya; geser vertikal (gulir) diabaikan
    fireEvent.touchStart(hero, { touches: [{ clientX: 300, clientY: 200 }] });
    fireEvent.touchEnd(hero, { changedTouches: [{ clientX: 180, clientY: 210 }] });
    expect(segments[3]).toHaveAttribute('aria-current', 'true');
    fireEvent.touchStart(hero, { touches: [{ clientX: 300, clientY: 200 }] });
    fireEvent.touchEnd(hero, { changedTouches: [{ clientX: 240, clientY: 420 }] });
    expect(segments[3]).toHaveAttribute('aria-current', 'true');
    fireEvent.touchStart(hero, { touches: [{ clientX: 100, clientY: 200 }] });
    fireEvent.touchEnd(hero, { changedTouches: [{ clientX: 220, clientY: 200 }] });
    expect(segments[2]).toHaveAttribute('aria-current', 'true');

    fireEvent.mouseEnter(hero);
    expect(fill(2)).toHaveAttribute('data-hold', 'true');
    fireEvent.mouseLeave(hero);
    expect(fill(2)).toHaveAttribute('data-hold', 'false');
    fireEvent.click(within(controls).getByRole('button', { name: 'Jeda slide otomatis' }));
    expect(within(controls).getByRole('button', { name: 'Putar slide otomatis' })).toBeInTheDocument();
    // Dijeda di tengah slide 3: isian slide itu membeku di tempat (animasi tetap terpasang, dihentikan)
    expect(fill(2)).toHaveAttribute('data-run', 'false');
    expect(fill(2)).toHaveAttribute('data-auto', 'true');
    // Slide yang dicapai saat dijeda (tombol, bilah, geser) tidak beranimasi: penuh statis, bukan 0%
    fireEvent.click(within(controls).getByRole('button', { name: 'Slide berikutnya' }));
    expect([0, 1, 2, 3].map((i) => fill(i).getAttribute('data-state'))).toEqual(['done', 'done', 'done', 'active']);
    expect(fill(3)).toHaveAttribute('data-auto', 'false');
    fireEvent.click(segments[1]);
    expect(fill(1)).toHaveAttribute('data-auto', 'false');
    fireEvent.click(segments[2]);
    expect(fill(2)).toHaveAttribute('data-auto', 'false');
    // Putar lagi: slide aktif mulai mengisi dari awal
    fireEvent.click(within(controls).getByRole('button', { name: 'Putar slide otomatis' }));
    expect(fill(2)).toHaveAttribute('data-run', 'true');
    expect(fill(2)).toHaveAttribute('data-auto', 'true');
    // CSS: bilah aktif tanpa animasi = penuh (scaleX(1)); animasi hanya untuk data-auto="true"
    const css = readFileSync(resolve(ROOT, 'src/templates/jumantara/jumantara.css'), 'utf8');
    expect(css).toMatch(/\.jm-seg-fill\[data-state='done'\],\s*\.jm-seg-fill\[data-state='active'\] \{\s*transform: scaleX\(1\);/);
  });

  it('berganti otomatis saat bilah slide aktif penuh; berhenti sendiri di slide 1 setelah dua putaran (WCAG 2.2.2)', () => {
    const hero = section(demo(), 'hero');
    const controls = within(hero).getByRole('group', { name: 'Kontrol slide' });
    const current = () => within(controls).getAllByRole('button', { name: /^Slide \d dari 4/ }).findIndex((b) => b.getAttribute('aria-current') === 'true');
    const end = () => animationEnd(controls.querySelector('.jm-seg-fill[data-state="active"]')!);
    end();
    expect(current()).toBe(1);
    // Bilah slide yang tidak aktif tidak memicu pergantian
    animationEnd(controls.querySelector('.jm-seg-fill[data-state="done"]')!);
    expect(current()).toBe(1);
    for (let i = 0; i < 6; i += 1) end();
    expect(current()).toBe(3);
    expect(within(controls).getByRole('button', { name: 'Jeda slide otomatis' })).toBeInTheDocument();
    end();
    // Putaran kedua selesai: kembali ke slide 1 dan dijeda
    expect(current()).toBe(0);
    expect(within(controls).getByRole('button', { name: 'Putar slide otomatis' })).toBeInTheDocument();
    expect(controls.querySelector('.jm-seg-fill[data-state="active"]')).toHaveAttribute('data-run', 'false');
    // Berhenti sendiri: bilah slide 1 penuh statis (bukan animasi beku di 0%), bilah lain kosong
    expect(controls.querySelector('.jm-seg-fill[data-state="active"]')).toHaveAttribute('data-auto', 'false');
    expect(Array.from(controls.querySelectorAll('.jm-seg-fill')).map((f) => f.getAttribute('data-state'))).toEqual(['active', 'todo', 'todo', 'todo']);
  });

  it('LCP aman: foto & teks slide pertama tidak dianimasikan masuk; teks naik hanya setelah pergantian; tanpa Ken Burns', () => {
    const hero = section(demo(), 'hero');
    const textBlock = () => hero.querySelector('h1')!.parentElement!;
    const first = hero.querySelector<HTMLElement>('.jm-slide')!;
    expect(first.className).toContain('opacity-100');
    expect(first.className).not.toMatch(/jm-rise|tpl-reveal|animate-/);
    expect(first.closest('[data-tpl-reveal]')).toBeNull();
    expect(textBlock()).toHaveAttribute('data-enter', 'false');
    const controls = within(hero).getByRole('group', { name: 'Kontrol slide' });
    fireEvent.click(within(controls).getByRole('button', { name: 'Slide berikutnya' }));
    expect(textBlock()).toHaveAttribute('data-enter', 'true');
    expect(Array.from(hero.querySelectorAll('.jm-slide')).map((s) => s.getAttribute('data-active'))).toEqual(['false', 'true', 'false', 'false']);
    // Teks slide lain ditumpuk tak terlihat (tinggi tetap), bukan <h1>, tersembunyi dari pembaca layar
    const ghosts = Array.from(hero.querySelectorAll('[aria-hidden="true"].invisible'));
    expect(ghosts).toHaveLength(3);
    for (const ghost of ghosts) expect(ghost.querySelector('h1')).toBeNull();
    // CSS: pudar foto & isi bilah hanya bila gerak menyala; teks naik hanya data-enter; dimatikan saat prefers-reduced-motion
    const css = readFileSync(resolve(ROOT, 'src/templates/jumantara/jumantara.css'), 'utf8');
    expect(css).toMatch(/\[data-tpl-motion='on'\] \.jm-slide \{/);
    expect(css).toMatch(/\[data-tpl-motion='on'\] \.jm-seg-fill\[data-state='active'\]\[data-auto='true'\]/);
    expect(css).toMatch(/\[data-tpl-motion='on'\] \[data-enter='true'\] \.jm-rise/);
    expect(css).toMatch(/@layer components/);
    const split = css.indexOf('@media (prefers-reduced-motion: reduce)');
    const moving = css.slice(0, split).replace(/\/\*[\s\S]*?\*\//g, '');
    const reduced = css.slice(split);
    // Foto slide hanya memudar (transition opacity), tanpa animasi masuk / Ken Burns
    expect(moving).not.toMatch(/kenburns|\.jm-slide[^{,]*\{[^}]*animation/i);
    for (const selector of ['.jm-slide', '.jm-seg-fill', '.jm-rise', '.jm-tab-bar', '.jm-pop', '.jm-collapse', '.jm-rail']) expect(reduced, selector).toContain(selector);
    // Semua animasi/transisi hanya di bawah [data-tpl-motion='on'] (pratinjau CMS, reduced motion, cetak → statis)
    const rules = Array.from(moving.matchAll(/([^{}]+)\{([^{}]*)\}/g)).filter(([, , body]) => /\b(animation|transition|scroll-behavior)\s*:/.test(body));
    expect(rules.length).toBeGreaterThanOrEqual(8);
    for (const [, selectors] of rules) {
      for (const selector of selectors.split(',')) expect(selector.trim(), selectors.trim()).toMatch(/^\[data-tpl-motion='on'\] /);
    }
  });

  it('hero slider: wilayah live tetap (tidak dipasang ulang) mengumumkan slide yang dipilih manual; diam saat berganti otomatis', () => {
    const hero = section(demo(), 'hero');
    const status = () => hero.querySelector<HTMLElement>('[data-jm-slide-status]')!;
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
    expect(live).toHaveTextContent('Slide 2 dari 4: Kelas yang hidup, pikiran yang kritis');
  });

  it('bilah progres "stories": layar lebar tepat di bawah menu, HP di bawah teks; di DOM sebelum judul & tombol (urutan fokus)', () => {
    const hero = section(demo(), 'hero');
    const controls = within(hero).getByRole('group', { name: 'Kontrol slide' });
    const follows = (el: Element) => !!(controls.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(follows(hero.querySelector('h1')!)).toBe(true);
    expect(follows(within(hero).getByRole('link', { name: 'Informasi SPMB' }))).toBe(true);
    // Kolom flex: HP & tablet → kontrol di bawah teks (order-last); layar lebar → urutan DOM (di atas teks)
    expect(controls.parentElement!.className).toContain('flex-col');
    expect(controls.className.split(' ')).toEqual(expect.arrayContaining(['order-last', 'mt-8', '@5xl:order-none', '@5xl:mt-0', '@5xl:mb-10']));
  });

  it('label slide sepanjang batas CMS (50 huruf) terpotong di chip, tidak melebarkan kolom teks (sel bertumpuk min-w-0)', () => {
    const long = 'SMA Negeri 1 Purbolinggo · Kabupaten Lampung Timur';
    expect(long).toHaveLength(50);
    const slides = (def.defaultContent.hero.slides as ListItem[]).map((s) => ({ ...s, eyebrow: long }));
    const hero = section(demo({ hero: { eyebrow: long, slides } }), 'hero');
    const stack = hero.querySelector('[data-enter]')!.parentElement!;
    // Slide aktif + tiga salinan tak terlihat: semuanya boleh menyusut (kalau tidak, chip nowrap melebarkan halaman HP)
    expect(stack.children).toHaveLength(4);
    for (const cell of Array.from(stack.children)) expect(cell.className.split(' ')).toContain('min-w-0');
    const chips = Array.from(stack.querySelectorAll('p > span.truncate'));
    expect(chips.map((c) => c.textContent)).toEqual([long, long, long, long]);
    for (const chip of chips) expect(chip.parentElement!.className).toContain('max-w-full');
  });

  it('hero digulir keluar layar → bilah slide ditahan (dua putaran tidak habis tanpa dilihat); terlihat ≥ 30% → lanjut', () => {
    // IntersectionObserver tiruan: simpan pengamat + targetnya, picu entri secara manual
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
      const photo = hero.querySelector('.jm-hero-scrim')!.parentElement!;
      const watching = observers.filter((o) => o.targets.includes(photo));
      expect(watching).toHaveLength(1);
      const fire = (isIntersecting: boolean, ratio: number) =>
        act(() => watching[0].cb([{ target: photo, isIntersecting, intersectionRatio: ratio } as unknown as IntersectionObserverEntry], {} as IntersectionObserver));
      const fill = () => hero.querySelector('.jm-seg-fill[data-state="active"]')!;
      expect(fill()).toHaveAttribute('data-hold', 'false');
      fire(false, 0);
      expect(fill()).toHaveAttribute('data-hold', 'true');
      fire(true, 0.2);
      expect(fill()).toHaveAttribute('data-hold', 'true');
      fire(true, 0.6);
      expect(fill()).toHaveAttribute('data-hold', 'false');
      // Tombol tetap berfungsi saat ditahan
      fire(false, 0);
      fireEvent.click(within(hero).getByRole('button', { name: 'Slide berikutnya' }));
      expect(fill().closest('button')).toHaveAttribute('aria-label', 'Slide 2 dari 4: Pembelajaran');
      expect(fill()).toHaveAttribute('data-hold', 'true');
    } finally {
      window.IntersectionObserver = original;
    }
  });

  it('layanan cepat: ubin bergaris rambut, tautan section/keluar, ubin tanpa tautan membuka catatan CMS (aria-expanded)', () => {
    const services = section(demo(), 'services');
    expect(services.querySelector('h2.sr-only')?.textContent).toBe('Layanan sekolah');
    const tiles = Array.from(services.querySelectorAll('ul > li'));
    expect(tiles).toHaveLength(6);
    expect(services.querySelector('ul')!.className).toContain('@5xl:grid-cols-6');
    expect(tiles.map((li) => li.textContent)).toEqual([
      'E-LearningMateri dan tugas kelas',
      'Perpustakaan DigitalKatalog dan e-book',
      'PPIDInformasi publik sekolah',
      'Legalisir IjazahJadwal dan syarat legalisir',
      'Tracer StudyData kelanjutan studi alumni',
      'PengaduanLayanan Sekolah Aman & Nyaman',
    ]);
    expect(linkList(services)).toEqual([
      'Legalisir IjazahJadwal dan syarat legalisir|#pengumuman',
      'PengaduanLayanan Sekolah Aman & Nyaman|#kontak',
    ]);
    expect(services.querySelectorAll('li svg')).toHaveLength(6);
    // Tracer Study belum punya formulir di demo: membuka catatan CMS seperti ubin lain tanpa tautan (bukan tautan
    // melingkar ke section alumni, yang tautannya kembali ke Layanan)
    const tracer = within(services).getByRole('button', { name: /Tracer Study/ });
    expect(tracer).toHaveAttribute('aria-expanded', 'false');
    expect(services.querySelector('a[href="#testimoni"]')).toBeNull();
    expect(within(services).getAllByRole('button').map((b) => `${b.querySelector('.block')?.textContent}:${b.getAttribute('aria-expanded')}`)).toEqual([
      'E-Learning:false',
      'Perpustakaan Digital:false',
      'PPID:false',
      'Tracer Study:false',
    ]);
    const elearning = within(services).getByRole('button', { name: /E-Learning/ });
    expect(elearning).toHaveAttribute('aria-expanded', 'false');
    const note = document.getElementById(elearning.getAttribute('aria-controls')!)!;
    expect(note).toHaveAttribute('hidden');
    // Catatan = buka-tutup biasa, bukan wilayah live yang baru dimunculkan
    expect(note).not.toHaveAttribute('role');
    fireEvent.click(elearning);
    expect(elearning).toHaveAttribute('aria-expanded', 'true');
    expect(note).not.toHaveAttribute('hidden');
    expect(note).toHaveTextContent(/^E-Learning: Tautan layanan ini diisi sekolah di CMS/);
    fireEvent.click(within(note).getByRole('button', { name: 'Tutup' }));
    expect(note).toHaveAttribute('hidden');
    expect(elearning).toHaveFocus();
    cleanup();
    // Tanpa catatan: ubin tanpa tautan bukan tombol (tidak ada aksi palsu)
    const plain = section(demo({ services: { pending_note: '' } }), 'services');
    expect(within(plain).queryAllByRole('button')).toHaveLength(0);
    expect(within(plain).getAllByRole('link')).toHaveLength(2);
  });

  it('sambutan kepala sekolah (kutipan; demo tanpa potret) dan profil dengan fakta singkat + tab Visi/Misi/Profil lulusan', () => {
    const container = demo();
    const welcome = section(container, 'welcome');
    // Nama sekolah di judul tidak dipenggal (spasi tak terputus)
    expect(welcome.querySelector('h2')!.textContent).toBe(`Selamat datang di ${SCHOOL.replace(/ /g, ' ')}`);
    expect(welcome.querySelector('blockquote')?.textContent).toMatch(/^Kami ingin setiap murid merasa aman/);
    expect(welcome.querySelector('blockquote')!.className).toContain('border-(--tpl-accent)');
    expect(welcome.textContent).toContain('Drs. Ahmad Fauzan Hakim, M.Pd.');
    expect(welcome.textContent).toContain(`Kepala ${SCHOOL}`);
    expect(welcome.querySelectorAll('p').length).toBeGreaterThanOrEqual(4);
    // Demo tanpa foto: nama kepala sekolah fiktif tidak ditempel pada wajah foto stok → teks selebar 10 kolom
    expect(def.defaultContent.welcome.photo).toBe('');
    expect(welcome.querySelector('img')).toBeNull();
    expect(welcome.innerHTML).toContain('@5xl:col-span-10');
    expect(within(welcome).getByRole('link', { name: 'Baca profil sekolah' })).toHaveAttribute('href', '#tentang');

    const about = section(container, 'about');
    expect(about.querySelector('h2')!.textContent).toBe('Sekolah negeri yang tumbuh bersama warga Purbolinggo');
    expect(Array.from(about.querySelectorAll('dt')).map((d) => d.textContent)).toEqual(['Status', 'Jenjang', 'Lokasi', 'Hari belajar']);
    expect(Array.from(about.querySelectorAll('dd')).map((d) => d.textContent)).toEqual(['Sekolah negeri', 'SMA, kelas X–XII', 'Purbolinggo, Lampung Timur', 'Senin–Jumat']);
    const tablist = within(about).getByRole('tablist', { name: 'Profil' });
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Visi', 'Misi', 'Profil lulusan']);
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
    expect(tabs.map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
    const panel = (tab: HTMLElement) => document.getElementById(tab.getAttribute('aria-controls')!)!;
    expect(panel(tabs[1])).toHaveAttribute('hidden');
    // Misi (butir panjang) → daftar bernomor 01–05; Profil lulusan (butir pendek) → chip
    expect(panel(tabs[1]).querySelectorAll('ol li')).toHaveLength(5);
    expect(panel(tabs[1]).querySelector('ol li')!.textContent).toMatch(/^01Menyelenggarakan/);
    expect(panel(tabs[2]).querySelectorAll('ul li')).toHaveLength(8);
    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveFocus();
    expect(panel(tabs[1])).not.toHaveAttribute('hidden');
    fireEvent.keyDown(tabs[1], { key: 'End' });
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs[2], { key: 'ArrowRight' });
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs[0], { key: 'Home' });
    expect(tabs[0]).toHaveFocus();
    expect(within(about).getByRole('link', { name: 'Lihat fasilitas sekolah' })).toHaveAttribute('href', '#facilities');
  });

  it('akademik: tiga kartu mapel pilihan + kartu kokurikuler melebar; prestasi; guru dengan inisial', () => {
    const container = demo();
    const programs = section(container, 'programs');
    expect(within(programs).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Sains & Teknologi',
      'Sosial & Humaniora',
      'Bahasa & Budaya',
      'Kokurikuler',
    ]);
    expect(programs.querySelectorAll('ul')[0].children).toHaveLength(3);
    const science = programs.querySelectorAll('article')[0];
    expect(Array.from(science.querySelectorAll('li')).map((l) => l.textContent)).toEqual(['Biologi', 'Kimia', 'Fisika', 'Matematika Tingkat Lanjut', 'Informatika']);
    expect(programs.textContent).toContain('Kelas XI–XII');
    expect(programs.textContent).toContain('Komposisi paket mengikuti ketentuan kurikulum');

    const achievements = section(container, 'achievements');
    expect(within(achievements).getAllByRole('heading', { level: 3 })).toHaveLength(6);
    expect(achievements.textContent).toContain('Data di bawah adalah contoh untuk demo.');
    // Peringkat kosong → nama lomba tetap jadi judul kartu (tidak ada <h3> kosong)
    const noRank = section(demo({ achievements: { items: [{ title: '', event: 'Olimpiade Sains Kabupaten', year: '2026' }] } }), 'achievements');
    expect(within(noRank).getByRole('heading', { level: 3 })).toHaveTextContent('Olimpiade Sains Kabupaten');

    const teachers = section(container, 'teachers');
    expect(within(teachers).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Sri Wahyuni, S.Pd.',
      'Bambang Setiadi, S.Pd.',
      'Dewi Anggraini, S.Si.',
      'Hendra Gunawan, S.Pd.',
      'Rina Marlina, S.Pd.',
      'Yusuf Maulana, S.Kom.',
      'Nur Aini, S.Pd.',
      'Agus Riyanto, S.Pd.',
    ]);
    // Tanpa foto: inisial (bukan wajah orang di foto yang ditempelkan ke nama fiktif)
    expect(teachers.querySelectorAll('img')).toHaveLength(0);
    // Kata terakhir nama + gelar dalam satu kotak sebaris: gelar tidak turun sendirian
    expect(Array.from(teachers.querySelectorAll('h3 > span.inline-block')).map((s) => s.textContent)).toEqual(['Wahyuni, S.Pd.', 'Setiadi, S.Pd.', 'Anggraini, S.Si.', 'Gunawan, S.Pd.', 'Marlina, S.Pd.', 'Maulana, S.Kom.', 'Aini, S.Pd.', 'Riyanto, S.Pd.']);
    expect(teachers.querySelector('article span[aria-hidden]')!.textContent).toBe('SW');
    // Tombol opsional kosong → tidak ada tombol
    expect(within(teachers).queryByRole('link')).toBeNull();
  });

  it('berita: berita utama besar + daftar bergaris; baca selengkapnya membuka isi di tempat; pengumuman berlabel; agenda bertanggal', () => {
    const container = demo();
    const news = section(container, 'news');
    expect(news.querySelector('h2')!.textContent).toBe('Kabar terbaru dari sekolah');
    const articles = news.querySelectorAll('article');
    expect(articles).toHaveLength(4);
    expect(Array.from(news.querySelectorAll('article h3')).map((h) => h.textContent)).toEqual([
      'Projek kokurikuler kelas X: memetakan pangan lokal Lampung Timur',
      'Kelas XII mengikuti simulasi Tes Kemampuan Akademik',
      'Sanggar tari tampil membawakan tari kreasi pada pentas seni sekolah',
      'Pengurus OSIS dan MPK masa bakti 2026/2027 resmi dilantik',
    ]);
    expect(articles[0].querySelector('time')).toHaveAttribute('datetime', '2026-10-24');
    expect(articles[0].querySelector('time')).toHaveTextContent('24 Okt 2026');
    expect(articles[0].textContent).toContain('Kokurikuler');
    expect(articles[0].querySelector('img')!.getAttribute('sizes')).toBe('(min-width: 1024px) 56vw, 100vw');
    expect(articles[1].querySelector('img')!.getAttribute('sizes')).toBe('(min-width: 1280px) 144px, (min-width: 768px) 112px, 88px');
    // Ringkasan berita di daftar hanya di layar lebar (2 baris)
    expect(within(articles[1] as HTMLElement).getByText(/^Simulasi berlangsung/).className).toMatch(/^mt-1\.5 hidden .*@5xl:line-clamp-2/);
    const more = within(articles[0] as HTMLElement).getByRole('button', { name: /Baca selengkapnya/ });
    expect(more).toHaveAccessibleName('Baca selengkapnya: Projek kokurikuler kelas X: memetakan pangan lokal Lampung Timur');
    expect(more).toHaveAttribute('aria-expanded', 'false');
    const body = document.getElementById(more.getAttribute('aria-controls')!)!;
    expect(body).toHaveAttribute('inert');
    expect(body.textContent).toContain('Projek lintas mata pelajaran ini berlangsung enam pekan.');
    fireEvent.click(more);
    expect(more).toHaveAttribute('aria-expanded', 'true');
    expect(body).not.toHaveAttribute('inert');
    expect(within(news).getByRole('link', { name: /Berita lainnya di Instagram/ })).toHaveAttribute('href', 'https://instagram.com/');
    // Tautan berita diisi → tombol baca menjadi tautan keluar
    cleanup();
    const linked = section(demo({ news: { items: [{ title: 'Berita A', date: '2026-10-01', url: 'https://instagram.com/p/abc', excerpt: 'x' }] } }), 'news');
    expect(within(linked).getByRole('link', { name: 'Baca selengkapnya: Berita A' })).toHaveAttribute('href', 'https://instagram.com/p/abc');
    cleanup();

    const again = demo();
    const announcements = section(again, 'announcements');
    expect(announcements.querySelector('h2')!.textContent).toBe('Pengumuman sekolah');
    expect(announcements.querySelectorAll('li')).toHaveLength(5);
    expect(within(announcements).getAllByText('Penting')).toHaveLength(1);
    expect(within(announcements).getByText('Penting').className).toContain('text-[#B42318]');
    expect(announcements.querySelector('time')).toHaveAttribute('datetime', '2026-10-23');
    // Lampiran PDF: chip "PDF" + "Lihat lampiran"
    cleanup();
    const pdf = section(demo({ announcements: { items: [{ title: 'Surat edaran', date: '2026-10-01', url: 'https://sekolah.test/edaran.pdf' }] } }), 'announcements');
    expect(pdf.textContent).toContain('PDF');
    expect(within(pdf).getByRole('link', { name: 'Lihat lampiran' })).toHaveAttribute('href', 'https://sekolah.test/edaran.pdf');
    cleanup();

    const agenda = section(demo(), 'agenda');
    expect(agenda.querySelector('h2')!.textContent).toBe('Agenda sekolah');
    expect(Array.from(agenda.querySelectorAll('time')).map((t) => t.getAttribute('datetime'))).toEqual(['2026-11-25', '2026-12-18', '2027-01-16', '2027-04-24', '2027-07-12']);
    expect(agenda.textContent).toContain('Rabu, 25 November 2026');
    expect(agenda.textContent).toContain('Lapangan upacara');
    // Ubin tanggal warna tema (hari + bulan), dekoratif (tanggal lengkap ada di <time>)
    const tile = agenda.querySelector('li > span[aria-hidden]')!;
    expect(tile.className).toContain('bg-(--tpl-accent)');
    expect(tile.textContent).toBe('25Nov');
    // Pengumuman & agenda berdampingan di satu pita tint
    expect(agenda.parentElement!.parentElement).toBe(section(document.body, 'announcements').parentElement!.parentElement);
    expect(agenda.parentElement!.parentElement!.parentElement!.className).toContain('bg-(--jm-tint)');
  });

  it('ekstrakurikuler: tombol saring kategori (aria-pressed) + status untuk pembaca layar', () => {
    const clubs = section(demo(), 'clubs');
    const filters = within(clubs).getByRole('group', { name: 'Saring ekstrakurikuler' });
    expect(within(filters).getAllByRole('button').map((b) => b.textContent)).toEqual(['Semua', 'Kepemimpinan', 'Seni & Budaya', 'Sains & Bahasa', 'Olahraga', 'Keagamaan']);
    expect(within(filters).getByRole('button', { name: 'Semua' })).toHaveAttribute('aria-pressed', 'true');
    expect(clubs.querySelectorAll('article')).toHaveLength(8);
    fireEvent.click(within(filters).getByRole('button', { name: 'Kepemimpinan' }));
    expect(within(filters).getByRole('button', { name: 'Kepemimpinan' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(filters).getByRole('button', { name: 'Semua' })).toHaveAttribute('aria-pressed', 'false');
    expect(Array.from(clubs.querySelectorAll('article h3')).map((h) => h.textContent)).toEqual(['Pramuka', 'Paskibra', 'PMR']);
    expect(within(clubs).getByRole('status')).toHaveTextContent('3 kegiatan kategori Kepemimpinan');
    expect(clubs.querySelector('ul[data-filtered]')).toHaveAttribute('data-filtered', 'true');
    expect(clubs.textContent).toContain('Jumat, 14.00–16.00');
    expect(clubs.textContent).toContain('Masih ada kegiatan lain');
    fireEvent.click(within(filters).getByRole('button', { name: 'Semua' }));
    expect(clubs.querySelectorAll('article')).toHaveLength(8);
  });

  it('fasilitas: rel geser berlabel yang bisa difokus, kartu foto 4:5, tombol sebelumnya/berikutnya', () => {
    const facilities = section(demo(), 'facilities');
    const rail = within(facilities).getByRole('group', { name: 'Ruang belajar dan berkegiatan: geser untuk melihat semua' });
    expect(rail).toHaveAttribute('tabindex', '0');
    // Snap di wadah gulirnya sendiri; rel menembus jarak tepi wadah sampai tepi layar (scroll-padding = jarak tepi)
    expect(rail.className).toContain('snap-x');
    for (const cls of ['-mx-5', 'px-5', 'scroll-px-5', '@5xl:-mx-12', '@5xl:scroll-px-12', '@min-[96rem]:-mx-16']) expect(rail.className).toContain(cls);
    expect(rail.querySelector('ul')!.className).toContain("after:content-['']");
    const cards = Array.from(rail.querySelectorAll('li'));
    expect(cards).toHaveLength(6);
    expect(cards[0].className).toContain('w-[80%]');
    expect(cards[0].className).toContain('snap-start');
    expect(cards[0].className).toContain('@7xl:w-[22%]');
    expect(within(facilities).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Laboratorium IPA',
      'Perpustakaan & pojok baca',
      'Laboratorium komputer',
      'Lapangan olahraga',
      'Masjid & ruang ibadah',
      'Sanggar seni',
    ]);
    expect(within(facilities).getByRole('button', { name: 'Fasilitas sebelumnya' })).toHaveAttribute('aria-disabled', 'true');
    expect(within(facilities).getByRole('button', { name: 'Fasilitas berikutnya' })).toBeInTheDocument();
  });

  it('SPMB: pita gelap, tombol portal provinsi, lencana, tab Jalur/Jadwal/Syarat dengan panah keyboard, linimasa', () => {
    const spmb = section(demo(), 'spmb');
    expect(spmb).toHaveAttribute('data-tpl-tone', 'inverse');
    expect(spmb.className).toContain('bg-(--jm-night)');
    expect(spmb.querySelector('h2')!.textContent).toBe('Penerimaan murid baru tahun ajaran 2027/2028');
    expect(within(spmb).getByRole('link', { name: /Buka Portal SPMB Provinsi/ })).toHaveAttribute('href', 'https://lampung.spmb.id/');
    expect(spmb.textContent).toContain('Tanpa biaya pendaftaran');
    expect(spmb.textContent).toContain('Pendaftaran melalui portal provinsi');
    const tablist = within(spmb).getByRole('tablist', { name: 'SPMB 2027/2028' });
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Jalur', 'Jadwal', 'Syarat']);
    const panel = (tab: HTMLElement) => document.getElementById(tab.getAttribute('aria-controls')!)!;
    expect(Array.from(panel(tabs[0]).querySelectorAll('h3')).map((h) => h.textContent)).toEqual(['Domisili', 'Afirmasi', 'Prestasi', 'Mutasi']);
    expect(panel(tabs[0]).textContent).toContain('min. 30%');
    expect(panel(tabs[0]).textContent).toContain('mengikuti juknis Dinas Pendidikan');
    expect(panel(tabs[2]).textContent).toContain('Usia paling tinggi 21 tahun pada 1 Juli 2027');
    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveFocus();
    expect(Array.from(panel(tabs[1]).querySelectorAll('h3')).map((h) => h.textContent)).toEqual([
      'Sosialisasi & juknis',
      'Pendaftaran & verifikasi daring',
      'Pengumuman hasil seleksi',
      'Daftar ulang',
      'MPLS & hari pertama sekolah',
    ]);
    expect(panel(tabs[1]).textContent).toContain('Perkiraan jadwal — mengikuti juknis dinas');
    fireEvent.keyDown(tabs[1], { key: 'ArrowLeft' });
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    // Tab yang kosong tidak tampil
    cleanup();
    const noSchedule = section(demo({ spmb: { schedule: [] } }), 'spmb');
    expect(within(noSchedule).getAllByRole('tab').map((t) => t.textContent)).toEqual(['Jalur', 'Syarat']);
  });

  it('formulir tanya panitia SPMB: galat per isian + fokus ke isian pertama, lalu pesan WhatsApp apa adanya; tidak ada data yang dikirim', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    try {
      const spmb = section(demo(), 'spmb');
      const form = within(spmb).getByRole('form', { name: 'Tanya panitia SPMB lewat WhatsApp' });
      expect(form.textContent).toContain('Formulir ini hanya untuk bertanya, bukan pendaftaran. Data tidak disimpan di website dan tidak ada pembayaran daring.');
      expect(form.textContent).toContain('tidak ada data yang disimpan di website');
      expect(form.closest('.jm-light')).not.toBeNull();
      const submit = within(form).getByRole('button', { name: /Kirim lewat WhatsApp/ });
      expect(submit).toHaveAttribute('type', 'submit');
      fireEvent.click(submit);
      const name = within(form).getByLabelText('Nama');
      expect(name).toHaveAttribute('aria-invalid', 'true');
      expect(name).toHaveFocus();
      expect(document.getElementById(name.getAttribute('aria-describedby')!)).toHaveTextContent('Tulis nama Anda (minimal 3 huruf).');
      expect(INPUT).toContain('focus:border-(--tpl-accent-ink)');
      expect(INPUT).not.toMatch(/ring-\(--tpl-accent\)/);
      const question = within(form).getByLabelText('Pertanyaan');
      expect(question).toHaveAttribute('aria-invalid', 'true');
      expect(form.textContent).toContain('Tulis pertanyaan Anda (minimal 10 karakter).');

      fireEvent.change(name, { target: { value: 'Bima Saputra' } });
      expect(name).not.toHaveAttribute('aria-invalid');
      const path = within(form).getByLabelText('Jalur yang diminati') as HTMLSelectElement;
      expect(Array.from(path.options).map((o) => o.value)).toEqual(['Domisili', 'Afirmasi', 'Prestasi', 'Mutasi', 'Belum tahu']);
      expect(path.value).toBe('Belum tahu');
      fireEvent.change(path, { target: { value: 'Prestasi' } });
      fireEvent.change(within(form).getByLabelText(/Asal SMP\/MTs/), { target: { value: 'SMP Negeri 2 Purbolinggo' } });
      fireEvent.change(question, { target: { value: 'Apakah piagam lomba kabupaten bisa dipakai untuk jalur prestasi?' } });
      fireEvent.click(submit);

      expect(within(spmb).queryByRole('form')).toBeNull();
      const heading = within(spmb).getByRole('heading', { name: /Pesan siap dikirim/ });
      act(() => {
        vi.runAllTimers();
      });
      expect(heading).toHaveFocus();
      const message =
        'Halo Panitia SPMB SMA Negeri 1 Purbolinggo, saya ingin bertanya.\nNama: Bima Saputra\nAsal sekolah: SMP Negeri 2 Purbolinggo\nJalur yang diminati: Prestasi\nPertanyaan: Apakah piagam lomba kabupaten bisa dipakai untuk jalur prestasi?';
      expect(spmb.querySelector('pre')?.textContent).toBe(message);
      expect(within(spmb).getByRole('link', { name: 'Buka WhatsApp' }).getAttribute('href')).toBe(`https://wa.me/6281234567890?text=${encodeURIComponent(message)}`);
      expect(fetchSpy).not.toHaveBeenCalled();
      fireEvent.click(within(spmb).getByRole('button', { name: 'Ubah isian' }));
      expect(within(spmb).getByRole('form')).toBeInTheDocument();
      act(() => {
        vi.runAllTimers();
      });
      expect(within(spmb).getByLabelText('Nama')).toHaveFocus();
      expect(within(spmb).getByLabelText('Nama')).toHaveValue('Bima Saputra');
    } finally {
      fetchSpy.mockRestore();
      vi.useRealTimers();
    }
  });

  it('alumni, galeri, FAQ, kontak + peta, footer kobalt-hitam selebar layar', () => {
    const container = demo();
    const testimonials = section(container, 'testimonials');
    expect(testimonials.querySelectorAll('blockquote')).toHaveLength(4);
    expect(testimonials.querySelectorAll('figcaption')).toHaveLength(4);
    expect(testimonials.textContent).toContain('Lulusan 2025 · Pendidikan Biologi, PTN di Lampung (SNBP)');
    expect(within(testimonials).getByRole('link', { name: 'Alumni? Lihat layanan Tracer Study' })).toHaveAttribute('href', '#layanan');

    const gallery = section(container, 'gallery');
    expect(Array.from(gallery.querySelectorAll('figcaption')).map((f) => f.textContent)).toEqual([
      'Praktik membuat adonan di projek kokurikuler',
      'Kebersamaan di ruang kelas',
      'Latihan Pramuka sepulang sekolah',
      'Kegiatan Rohis sepulang sekolah',
    ]);
    expect(gallery.querySelector('ul')!.className).toContain('@5xl:grid-cols-4');
    expect(within(gallery).getByRole('link', { name: /Galeri lengkap di Instagram/ })).toHaveAttribute('href', 'https://instagram.com/');

    const faq = section(container, 'faq');
    const questions = within(faq).getAllByRole('button');
    expect(questions).toHaveLength(6);
    expect(questions[0]).toHaveAttribute('aria-expanded', 'true');
    const region = document.getElementById(questions[3].getAttribute('aria-controls')!)!;
    expect(region).toHaveAttribute('role', 'region');
    expect(region).toHaveAttribute('inert');
    fireEvent.click(questions[3]);
    expect(questions[0]).toHaveAttribute('aria-expanded', 'false');
    expect(questions[3]).toHaveAttribute('aria-expanded', 'true');
    expect(region).not.toHaveAttribute('inert');
    expect(questions[0].closest('h3')).not.toBeNull();
    expect(faq.textContent).toContain('Belum menemukan jawaban?');
    expect(wa(within(faq).getByRole('link', { name: /Tanya lewat WhatsApp/ }))).toContain(`Halo ${SCHOOL}, saya ingin bertanya tentang sekolah.`);

    const contact = section(container, 'contact');
    const iframe = contact.querySelector('iframe')!;
    expect(iframe).toHaveAttribute('title', `Peta lokasi ${SCHOOL}`);
    expect(iframe).toHaveAttribute('loading', 'lazy');
    expect(within(contact).getByRole('link', { name: /Buka di Google Maps/ })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/search/?api=1&query=Purbolinggo%2C%20Lampung%20Timur%2C%20Lampung',
    );
    expect(within(contact).getByRole('link', { name: /Telepon/ })).toHaveAttribute('href', 'tel:+6281234567890');
    expect(within(contact).getByRole('link', { name: /^Email/ })).toHaveAttribute('href', 'mailto:info@sman1purbolinggo.example');
    expect(within(contact).getByRole('link', { name: /Chat WhatsApp sekolah/ }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/6281234567890\?text=/);
    expect(contact.textContent).toContain('Jl. Pendidikan No. 1 (alamat contoh)');
    expect(contact.textContent).toContain('Senin–Jumat 07.00–16.00 WIB');

    const footer = container.querySelector('footer')!;
    // Pita selebar layar: tanpa jarak tepi / sudut membulat di pita; isinya di dalam CONTAINER
    expect(footer).toHaveAttribute('data-tpl-tone', 'inverse');
    expect(footer.className).toContain('bg-(--jm-night)');
    expect(footer.className).not.toMatch(/rounded|mx-|max-w-/);
    expect(footer.firstElementChild!.className).toContain('max-w-[1680px]');
    const links = within(footer).getByRole('navigation', { name: 'Tautan cepat' });
    expect(linkList(links)).toEqual(['Profil|#tentang', 'Akademik|#programs', 'Kesiswaan|#clubs', 'Berita|#berita', 'Pengumuman|#pengumuman', 'Kontak|#kontak']);
    expect(footer.textContent).toContain('Layanan');
    expect(within(footer).getByRole('link', { name: 'Legalisir Ijazah' })).toHaveAttribute('href', '#pengumuman');
    expect(within(footer).getByRole('link', { name: 'E-Learning' })).toHaveAttribute('href', '#layanan');
    expect(within(footer).getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://instagram.com/');
    expect(within(footer).getByRole('link', { name: 'YouTube' })).toHaveAttribute('href', 'https://youtube.com/');
    expect(within(footer).queryByRole('link', { name: 'LinkedIn' })).toBeNull();
    expect(footer.textContent).toContain(`© ${new Date().getFullYear()} ${SCHOOL}. Semua hak dilindungi.`);
    expect(footer.textContent).toContain('Situs demo template.');
    // Nama sekolah besar: dekoratif, satu baris, ukuran dari panjang nama
    const wordmark = footer.querySelector<HTMLElement>('[aria-hidden="true"] p.whitespace-nowrap')!;
    expect(wordmark.textContent).toBe(SCHOOL);
    expect(wordmark.className).toContain('overflow-x-clip');
  });

  it('datar: tidak ada kelas shadow di template (kecuali tombol melayang Shell), sumber tanpa bayangan', () => {
    const container = demo();
    const shadows = Array.from(container.querySelectorAll('[class*="shadow"]')).filter(
      (el) => !el.closest('[aria-label="Chat WhatsApp"]') && !/Chat WhatsApp|Kembali ke atas/.test(el.getAttribute('aria-label') ?? ''),
    );
    expect(shadows.map((el) => el.className)).toEqual([]);
    const source = sourceText();
    expect(source).not.toMatch(/\bshadow-|box-shadow|drop-shadow/);
    // Kartu radius 12, tombol radius 10, tanpa pil
    expect(source).not.toMatch(/rounded-(2xl|3xl)\b/);
    expect(source).not.toMatch(/framer-motion|useLocation|useParams/);
  });
});

describe('Jumantara: berita & pengumuman dari tulisan (site_posts)', () => {
  it('beranda (fitur aktif): newsroom bertautan selebar kartu + filter kategori, "Lihat semua" di samping tombol CMS, papan pengumuman', () => {
    const container = withPosts();
    expect(def.features?.posts).toBe(true);
    const news = section(container, 'news');
    expect(news).toHaveAttribute('data-pro-section', 'news');
    // Label & judul Jumantara tetap: satu H2
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
    expect(within(news).getByRole('link', { name: /Berita lainnya di Instagram/ })).toHaveAttribute('href', 'https://instagram.com/');

    const announcements = section(container, 'announcements');
    expect(announcements).toHaveAttribute('data-pro-section', 'announcements');
    expect(announcements.querySelectorAll('h2')).toHaveLength(1);
    expect(within(announcements).getByRole('link', { name: ANNOUNCEMENTS[0].title }).closest('article')!.className).toContain('relative');
    expect(announcements.textContent).toContain('Lihat detail');
    expect(announcements.textContent).not.toContain('Lihat lampiran');
    expect(within(announcements).getByText('Penting').closest('[data-pro-badge]')!.className).toContain('text-[#B42318]');
    // Papan di pita tint: ubin tanggal putih bergaris rambut (tint di atas tint tidak terlihat)
    expect(announcements.closest('.jm-notices')!.className).toContain('bg-(--jm-tint)');
    const tiles = Array.from(announcements.querySelectorAll('time'));
    expect(tiles.length).toBeGreaterThan(0);
    for (const tile of tiles) {
      expect(tile.className).toContain('bg-white');
      expect(tile.className).toContain('border');
      expect(tile.className).not.toContain('--jm-tint');
    }
    // Agenda tetap dari konten CMS
    expect(section(container, 'agenda').querySelectorAll('time')).toHaveLength(5);
  });

  it('/pengumuman: header putih tanpa hero, footer bukan section, tautan section menuju "/#anchor"', () => {
    const container = withPosts({ route: { kind: 'list', postKind: 'pengumuman' } });
    const header = container.querySelector('header')!;
    expect(header.className).not.toContain('h-0');
    expect(header.firstElementChild!.hasAttribute('data-tpl-tone')).toBe(false);
    expect(header.firstElementChild!.className).toContain('bg-white');
    expect(container.querySelector('[data-hero-layout]')).toBeNull();
    expect(sectionKeys(container)).toEqual([]);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(within(header).getByRole('link', { name: 'Info SPMB' })).toHaveAttribute('href', '/#spmb');
    const footer = Array.from(container.querySelectorAll('footer')).pop()!;
    expect(footer.className).toContain('bg-(--jm-night)');
    expect(footer.hasAttribute('id')).toBe(false);
    expect(footer.hasAttribute('data-tpl-section')).toBe(false);
    expect(linkList(within(footer).getByRole('navigation', { name: 'Tautan cepat' }))).toContain('Berita|/#berita');
    // Tema Jumantara: label pengumuman mendesak merah lembut
    expect(within(container.querySelector('main')!).getByText('Penting').closest('[class*="text-[#B42318]"]')).not.toBeNull();
  });

  it('/berita/{slug}: satu H1, chip kategori warna tema Jumantara, kembali ke daftar', () => {
    const container = withPosts({ route: { kind: 'post', postKind: 'berita', slug: POST.slug }, post: POST });
    const main = container.querySelector('main')!;
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelector('h1')).toHaveTextContent(POST.title);
    expect(within(main).getByText('Prestasi').closest('[class*="bg-(--jm-tint)"]')).not.toBeNull();
    expect(within(main).getByRole('link', { name: /Semua berita/ })).toHaveAttribute('href', '/berita');
  });
});

describe('Jumantara: warna tema bisa diganti', () => {
  it('kobalt bawaan → --tpl-accent; hijau dari CMS → semua turunan ikut; warna terang → teks tombol gelap', () => {
    const base = demo();
    expect(rootStyle(base, '--tpl-accent')).toBe('#2f5bea');
    expect(rootStyle(base, '--tpl-on-accent')).toBe('#ffffff');
    expect(rootStyle(base, '--jm-night')).toBe('#0a112d');
    const baseNight = rootStyle(base, '--jm-night');
    cleanup();

    const green = demo({ brand: { accent_color: '#047857' } });
    expect(rootStyle(green, '--tpl-accent')).toBe('#047857');
    for (const name of ['--jm-night', '--jm-bright', '--jm-ink', '--jm-tint', '--jm-line']) expect(rootStyle(green, name), name).toBe(vars('#047857')[name]);
    expect(rootStyle(green, '--jm-night')).not.toBe(baseNight);
    cleanup();

    const yellow = demo({ brand: { accent_color: '#FACC15' } });
    expect(rootStyle(yellow, '--tpl-on-accent')).toBe('#121620');
    const submit = section(yellow, 'spmb').querySelector('button[type="submit"]')!;
    expect(submit.className).toContain('text-(--tpl-on-accent)');
    expect(submit.className).toContain('bg-(--tpl-accent)');
  });
});

describe('Jumantara: SEO situs pembeli', () => {
  it('judul tab & meta description terbaca sebagai website SMA negeri', () => {
    expect(siteTitle('jumantara', null)).toBe('SMA Negeri 1 Purbolinggo — Sekolah negeri di Lampung Timur');
    expect(siteTitle('jumantara', null).length).toBeLessThanOrEqual(60);
    const restore = applySiteHead('jumantara', null);
    expect(document.title).toBe('SMA Negeri 1 Purbolinggo — Sekolah negeri di Lampung Timur');
    const description = document.head.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
    expect(description).toMatch(/^Sekolah negeri untuk warga Purbolinggo dan sekitarnya: /);
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(200);
    expect(document.head.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#2F5BEA');
    restore();
  });

  it('satu H1, tiap section diawali H2 (layanan: H2 untuk pembaca layar), H3 hanya di bawah H2, tanpa h4–h6', () => {
    const container = demo();
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelectorAll('h4, h5, h6')).toHaveLength(0);
    for (const key of ORDER.filter((k) => k !== 'hero')) {
      const levels = Array.from(section(container, key).querySelectorAll('h1, h2, h3')).map((h) => h.tagName);
      expect(levels[0], key).toBe('H2');
      expect(levels.filter((l) => l === 'H2'), key).toHaveLength(1);
    }
    expect(section(container, 'hero').querySelector('h2')).toBeNull();
    expect(container.querySelector('footer h2, footer h3')).toBeNull();
  });

  it('gambar: alt deskriptif berbahasa Indonesia, width/height, srcset & sizes; hanya foto slide 1 yang eager', () => {
    const container = demo();
    const imgs = Array.from(container.querySelectorAll('img'));
    expect(imgs.length).toBeGreaterThan(15);
    for (const img of imgs) {
      const src = img.getAttribute('src') ?? '';
      expect(img.hasAttribute('alt'), src).toBe(true);
      if (src.endsWith('.svg')) {
        expect(src, 'hanya logo demo').toBe('/assets/templates/logos/tut-wuri-handayani.svg');
        expect(img.closest('header, footer'), src).not.toBeNull();
        // Nama sekolah tertulis di samping logo → alt kosong
        expect(img.getAttribute('alt'), src).toBe('');
        continue;
      }
      expect(Number(img.getAttribute('width')), src).toBeGreaterThan(0);
      expect(Number(img.getAttribute('height')), src).toBeGreaterThan(0);
      expect(img.getAttribute('srcset'), src).toMatch(/ (800|240)w, /);
      expect(img.getAttribute('sizes'), src).toBeTruthy();
      expect(img.getAttribute('alt')!.split(' ').length, src).toBeGreaterThanOrEqual(5);
    }
    const eager = imgs.filter((img) => img.getAttribute('loading') !== 'lazy' && !img.getAttribute('src')?.endsWith('.svg'));
    expect(eager.map((img) => img.getAttribute('src'))).toEqual(['/assets/templates/photos/jumantara-hero-1-1920.webp']);
  });

  it('tautan asli untuk navigasi, tombol hanya untuk aksi (kecuali kirim formulir); SVG dekoratif tersembunyi', () => {
    const container = demo();
    for (const a of container.querySelectorAll('a')) expect(a.getAttribute('href'), a.textContent ?? '').toMatch(/^(#[a-z]|https:\/\/|mailto:|tel:)/);
    for (const button of container.querySelectorAll('button')) {
      expect(button.getAttribute('type'), button.textContent ?? '').toBe(button.closest('form') && /WhatsApp/.test(button.textContent ?? '') ? 'submit' : 'button');
    }
    for (const svg of container.querySelectorAll('svg')) expect(svg.closest('[aria-hidden="true"], [aria-hidden=""]') ?? svg.getAttribute('aria-hidden'), svg.outerHTML.slice(0, 60)).toBeTruthy();
    // Target sentuh ≥ 44px pada kontrol utama (h-11 / min-h-11 / h-12)
    for (const name of ['Slide berikutnya', 'Slide sebelumnya', 'Jeda slide otomatis', 'Buka menu']) {
      expect(within(container).getByRole('button', { name }).className, name).toMatch(/\bh-11\b/);
    }
    // Logo + nama di header & footer, tautan kolom footer, tombol saring ekstrakurikuler
    const brandLinks = within(container).getAllByRole('link', { name: `${SCHOOL}, ke awal halaman` });
    expect(brandLinks).toHaveLength(2);
    for (const a of brandLinks) expect(a.className).toMatch(/\bmin-h-11\b/);
    const footer = container.querySelector('footer')!;
    const columnLinks = Array.from(footer.querySelectorAll('nav a, li > a')).filter((a) => !a.getAttribute('aria-label'));
    expect(columnLinks.length).toBeGreaterThanOrEqual(8);
    for (const a of columnLinks) expect(a.className, a.textContent ?? '').toMatch(/\bmin-h-11\b/);
    const filters = within(section(container, 'clubs')).getByRole('group', { name: 'Saring ekstrakurikuler' });
    for (const b of within(filters).getAllByRole('button')) expect(b.className, b.textContent ?? '').toMatch(/\bh-11\b/);
  });
});

describe('Jumantara: konten opsional kosong', () => {
  it('hero tanpa foto → latar gradasi, tanpa slider & pita angka', () => {
    const container = demo({ hero: { image: '', slides: [], stats: [] } });
    const hero = section(container, 'hero');
    expect(hero.querySelector('img')).toBeNull();
    expect(hero.querySelector('.jm-hero-fallback')).not.toBeNull();
    expect(within(hero).queryByRole('group', { name: 'Kontrol slide' })).toBeNull();
    expect(hero.hasAttribute('aria-roledescription')).toBe(false);
    expect(hero.querySelector('[aria-live]')).toBeNull();
    expect(hero.querySelector('dl')).toBeNull();
    expect(hero.querySelector('h1')!.textContent).toBe('Belajar bermakna, tumbuh berkarakter');
  });

  it('satu slide (tanpa slide tambahan) → tanpa kontrol slide; dua angka → dua kolom', () => {
    const hero = section(demo({ hero: { slides: [], stats: [{ value: '1.048', label: 'Peserta didik' }, { value: '62', label: 'Guru' }] } }), 'hero');
    expect(within(hero).queryByRole('group', { name: 'Kontrol slide' })).toBeNull();
    expect(hero.querySelectorAll('.jm-slide')).toHaveLength(1);
    expect(hero.querySelector('dl')!.className).toContain('@3xl:grid-cols-2');
    expect(hero.querySelectorAll('dd')).toHaveLength(2);
  });

  it('hero dimatikan → header putih biasa (bukan di atas foto), section pertama = layanan', () => {
    const container = demo({ hero: { enabled: false } });
    const header = container.querySelector('header')!;
    expect(header.className).not.toContain('h-0');
    expect(header.firstElementChild!.className).toContain('bg-white');
    expect(header.firstElementChild!.hasAttribute('data-tpl-tone')).toBe(false);
    expect(sectionKeys(container)[0]).toBe('services');
  });

  it('sambutan & profil tanpa foto → teks melebar; tanpa tab → tanpa kartu tab', () => {
    const container = demo({ welcome: { photo: '' }, about: { image: '', tabs: [] } });
    const welcome = section(container, 'welcome');
    expect(welcome.querySelector('img')).toBeNull();
    expect(welcome.innerHTML).toContain('@5xl:col-span-10');
    const about = section(container, 'about');
    expect(about.querySelector('img')).toBeNull();
    expect(about.innerHTML).toContain('@5xl:col-span-10');
    expect(within(about).queryByRole('tablist')).toBeNull();
    cleanup();
    // Sekolah mengisi foto kepala sekolahnya sendiri di CMS → potret di kanan, teks 7 kolom, alt dari nama
    const own = section(demo({ welcome: { photo: '/uploads/kepala-sekolah.webp' } }), 'welcome');
    expect(own.querySelectorAll('img')).toHaveLength(1);
    expect(own.querySelector('img')).toHaveAttribute('src', '/uploads/kepala-sekolah.webp');
    expect(own.querySelector('img')).toHaveAttribute('alt', 'Foto Drs. Ahmad Fauzan Hakim, M.Pd., kepala sekolah');
    expect(own.innerHTML).toContain('@5xl:col-span-7');
  });

  it('pengumuman atau agenda saja → kolom tunggal; keduanya kosong → pita tidak dirender; berita disembunyikan → menu tanpa Berita', () => {
    const onlyAgenda = demo({ announcements: { enabled: false } });
    expect(sectionKeys(onlyAgenda)).not.toContain('announcements');
    expect(section(onlyAgenda, 'agenda').parentElement!.className).toContain('max-w-[720px]');
    cleanup();
    const none = demo({ announcements: { items: [] }, agenda: { enabled: false }, news: { enabled: false } });
    expect(sectionKeys(none)).not.toContain('agenda');
    expect(sectionKeys(none)).not.toContain('news');
    expect(linkList(within(none.querySelector('header')!).getAllByRole('navigation', { name: 'Menu utama' })[0])).toEqual(['Profil|#tentang', 'Akademik|#programs', 'Kesiswaan|#clubs', 'Kontak|#kontak']);
  });

  it('tanpa WhatsApp: formulir SPMB diganti tombol ke Kontak, tombol hero tetap ke SPMB, tidak ada tautan wa.me', () => {
    const container = demo({ contact: { whatsapp: '' } });
    const spmb = section(container, 'spmb');
    expect(within(spmb).queryByRole('form')).toBeNull();
    expect(within(spmb).getByRole('link', { name: 'Hubungi sekolah' })).toHaveAttribute('href', '#kontak');
    expect(spmb.textContent).toContain('Tanya panitia SPMB lewat WhatsApp');
    expect(within(section(container, 'hero')).getByRole('link', { name: 'Informasi SPMB' })).toHaveAttribute('href', '#spmb');
    expect(within(section(container, 'faq')).getByRole('link', { name: /Tanya lewat WhatsApp/ })).toHaveAttribute('href', '#kontak');
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
  });

  it('nomor WhatsApp panitia SPMB terpisah; tanpa daftar jalur → pilihan jalur tidak tampil (pesan: "Belum tahu")', () => {
    const spmb = section(demo({ spmb: { whatsapp: '085700001111', paths: [] } }), 'spmb');
    const form = within(spmb).getByRole('form');
    expect(within(form).queryByLabelText('Jalur yang diminati')).toBeNull();
    expect(within(spmb).queryAllByRole('tab').map((t) => t.textContent)).toEqual(['Jadwal', 'Syarat']);
    fireEvent.change(within(form).getByLabelText('Nama'), { target: { value: 'Sekar Ayu' } });
    fireEvent.change(within(form).getByLabelText('Pertanyaan'), { target: { value: 'Kapan sosialisasi SPMB untuk orang tua?' } });
    act(() => {
      fireEvent.submit(form);
    });
    expect(spmb.querySelector('pre')!.textContent).toContain('Jalur yang diminati: Belum tahu');
    expect(within(spmb).getByRole('link', { name: 'Buka WhatsApp' }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/6285700001111\?text=/);
  });

  it('nama jalur ganda atau "Belum tahu" di CMS → pilihan jalur tetap unik, tanpa peringatan key React', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const paths = [{ name: 'Domisili' }, { name: 'Domisili' }, { name: 'Belum tahu' }, { name: 'PRESTASI' }, { name: 'Prestasi' }];
      const spmb = section(demo({ spmb: { whatsapp: '085700001111', paths } }), 'spmb');
      const select = within(within(spmb).getByRole('form')).getByLabelText<HTMLSelectElement>('Jalur yang diminati');
      expect(Array.from(select.options).map((o) => o.value)).toEqual(['Domisili', 'PRESTASI', 'Belum tahu']);
      expect(errors.mock.calls.flat().join(' ')).not.toMatch(/same key/);
    } finally {
      errors.mockRestore();
    }
  });
});

describe('Jumantara: pratinjau CMS', () => {
  it('pratinjau diam (gerak mati bila Component dirender langsung) dan tanpa tautan wa.me / Google Maps yang terbuka', () => {
    const { container } = render(<def.Component content={resolveContent(def, null)} preview />);
    expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'off');
    const active = container.querySelector('.jm-seg-fill[data-state="active"]')!;
    expect(active).toHaveAttribute('data-auto', 'false');
    expect(container.querySelector('[aria-label="Jeda slide otomatis"]')).toBeNull();
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    expect(container.querySelector('a[href^="https://www.google.com/maps"]')).toBeNull();
    fireEvent.click(within(container).getByRole('button', { name: /^Slide 3 dari 4/ }));
    expect(container.querySelector('h1')!.textContent).toBe('Bangga merawat seni dan budaya daerah');
  });
});

describe('Jumantara: editor CMS', () => {
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
    expect(help).toContain('"Pakai bawaan" untuk biru kobalt bawaan #2F5BEA');
  });
});

describe('Jumantara: data katalog', () => {
  const sql = (file: string) => readFileSync(resolve(ROOT, file), 'utf8');

  it.each(['database/seed.templates.sql', 'database/migrations/2026-10-27_038_jumantara_template.sql'])(
    '%s: baris jumantara dengan template_code, kategori, harga, dan pratinjau tangkapan layar .webp',
    (file) => {
      const text = sql(file);
      expect(text).toContain("'jumantara'");
      expect(text).toContain("'Sekolah & Pendidikan'");
      expect(text).toContain('1690000.00');
      expect(text).toContain("'/assets/templates/jumantara-preview.webp'");
      expect(text).toContain('\'["/assets/templates/jumantara-1.webp","/assets/templates/jumantara-2.webp"]\'');
      expect(text).toMatch(/menyusun pesan WhatsApp; tidak ada penyimpanan data pendaftar atau pembayaran online/);
      expect(text.replace(/^--.*$/gm, '')).not.toMatch(/termasuk domain|\bNPSN\b|terakreditasi/i);
      // Baris jumantara saja (seed juga memuat template lain; migrasi 038 hanya Jumantara)
      const row = file.includes('seed') ? text.slice(text.indexOf("('jumantara',"), text.indexOf("'jumantara', NULL")) : text;
      expect(row).toContain('Jumantara menampilkan');
      // Jujur soal CMS (pola 035–037): label formulir, label kontak, dan "Lihat lampiran" tertulis di kode
      expect(row).toContain('label dan tombol formulir, label kontak, dan tautan lampiran pengumuman tetap berbahasa Indonesia.');
      expect(row).not.toMatch(/Semua teks, foto/);
      // Kata kunci katalog = kata kunci halaman (Jumantara), bukan "template website SMA" milik Bestari
      expect(row).toContain("'Template website sekolah negeri untuk SMA yang rapi dan elegan: ");
    },
  );

  it('migrasi 038 aman diulang (INSERT IGNORE + UPDATE berdasarkan slug, tanpa DELETE) dan tercatat di schema_migrations', () => {
    const text = sql('database/migrations/2026-10-27_038_jumantara_template.sql').replace(/^--.*$/gm, '');
    expect(text).toMatch(/INSERT IGNORE INTO templates/);
    expect(text).toMatch(/WHERE slug = 'jumantara';/);
    expect(text).toMatch(/sort_order\s+= 21/);
    expect(text).toMatch(/status\s+= 'published'/);
    expect(text).not.toMatch(/\bDELETE\b/);
    expect(text).toContain("VALUES ('2026-10-27_038', 'templates: katalog Jumantara')");
  });

  it('gambar pratinjau katalog ada di public/, 1600×1000, dan ringan', () => {
    for (const name of ['jumantara-preview', 'jumantara-1', 'jumantara-2']) {
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

describe('Jumantara: konten aneh', () => {
  it('angka, null, dan string di tempat list tidak membuat crash; tautan berbahaya dibuang', () => {
    const weird = {
      hero: { slides: 'x', topbar_links: [{ label: 'X', url: 'javascript:alert(1)' }, null], primary_url: 'javascript:alert(1)', stats: [{ value: 5 }, null] },
      services: { items: [null, { label: 3, url: 'javascript:alert(1)' }, { label: 'PPID', url: 'javascript:alert(1)' }] },
      welcome: { photo: 'javascript:alert(1)', body: 7 },
      about: { facts: 'x', tabs: [{ title: 'Visi', text: 7 }, null], points: null },
      programs: { items: [{ name: 1, subjects: null }] },
      news: { items: [{ title: 'Berita', date: 9, category: null, url: 'javascript:alert(1)', image: 'javascript:alert(1)' }] },
      announcements: { items: [{ title: 'P', badge: 3, url: 'javascript:alert(1)' }] },
      agenda: { items: [{ title: 'A', date: 'besok' }] },
      achievements: { items: [{ title: 2 }] },
      clubs: { items: [{ name: 'Klub', category: 5 }] },
      facilities: { items: [{ name: 'Lab', image: 'javascript:alert(1)' }] },
      teachers: { items: [{ name: 'Guru', photo: 'javascript:alert(1)' }] },
      spmb: { paths: [{ name: 2 }], schedule: [{ date: '2026-13-40', title: 'Tes' }], requirements: 'x', badges: null, portal_url: 'javascript:alert(1)', whatsapp: 'abc' },
      testimonials: { items: [{ quote: 'Baik', photo: 'javascript:alert(1)' }] },
      gallery: { items: [{ image: 'javascript:alert(1)' }] },
      faq: { items: [{ question: 2, answer: null }] },
      footer: { instagram: 'javascript:alert(1)' },
      brand: { accent_color: 'biru', logo: 'javascript:alert(1)' },
    } as unknown as SiteContent;
    const { container } = render(<def.Component content={resolveContent(def, weird)} />);
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
    expect(container.querySelector('img[src^="javascript:"]')).toBeNull();
    expect(section(container, 'agenda').textContent).toContain('besok');
    expect(container.querySelector('h1')!.textContent).toBe('Belajar bermakna, tumbuh berkarakter');
    cleanup();
    for (const content of [{}, null]) {
      const { container: empty } = render(<def.Component content={content as SiteContent} />);
      expect(empty.querySelector('[data-tpl-root]')).not.toBeNull();
      expect(empty.querySelectorAll('h1')).toHaveLength(1);
      expect(empty.querySelector('h4, h5, h6')).toBeNull();
      // Setiap section yang tampil (selain hero) diawali satu H2 (judul khusus pembaca layar bila judul CMS kosong)
      for (const s of empty.querySelectorAll<HTMLElement>('[data-tpl-section]:not([data-tpl-section="hero"]):not(footer)')) {
        expect(s.querySelector('h1, h2, h3')?.tagName, s.getAttribute('data-tpl-section') ?? '').toBe('H2');
        expect(s.querySelectorAll('h2'), s.getAttribute('data-tpl-section') ?? '').toHaveLength(1);
      }
      // Tidak ada tautan "#…" ke section yang tidak dirender (mis. #kontak tanpa isi Kontak)
      const anchors = new Set(Array.from(empty.querySelectorAll('[data-tpl-section]')).map((s) => s.id).filter(Boolean));
      for (const a of empty.querySelectorAll('a[href^="#"]')) {
        expect(anchors.has(a.getAttribute('href')!.slice(1)), `${a.textContent} → ${a.getAttribute('href')}`).toBe(true);
      }
      expect(empty.querySelector('a[href="#kontak"]')).toBeNull();
      cleanup();
    }
  });

  it('Kontak tanpa isi → tidak ada section Kontak, menu "Kontak", atau tombol ke #kontak; Kontak berisi telepon saja → tampil', () => {
    const blank = { contact: { title: '', subtitle: '', address: '', maps_query: '', maps_url: '', phone: '', email: '', whatsapp: '', hours: '' } };
    const container = demo(blank);
    expect(sectionKeys(container)).not.toContain('contact');
    expect(container.querySelector('a[href="#kontak"]')).toBeNull();
    expect(navItems(resolveContent(def, blank)).map((i) => i.key)).not.toContain('contact');
    expect(readJumantara(resolveContent(def, blank)).contactAction).toBeNull();
    cleanup();
    const phoneOnly = demo({ contact: { ...blank.contact, phone: '0725 123456' } });
    expect(sectionKeys(phoneOnly)).toContain('contact');
    expect(section(phoneOnly, 'contact').querySelector('h2')).toHaveClass('sr-only');
  });

  it('semua section dimatikan → tanpa section dan tanpa footer', () => {
    const off = Object.fromEntries(def.sections.filter((s) => s.toggleable).map((s) => [s.key, { enabled: false }]));
    const container = demo(off);
    expect(container.querySelectorAll('[data-tpl-section]')).toHaveLength(0);
    expect(container.querySelector('footer')).toBeNull();
  });
});
