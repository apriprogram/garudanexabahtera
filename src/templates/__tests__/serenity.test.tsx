// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/serenity.test.tsx
// Serenity (template studio yoga 2026-10-25): skema CMS & konten demo, helper model (gradasi judul, menu, pencarian
// halaman, isi paket, ikon otomatis), demo (urutan section, hero foto layar penuh dengan menu transparan, kartu kaca,
// strip fitur, program, paket unggulan, FAQ, footer), pencarian di menu, konten opsional kosong, pratinjau CMS diam,
// editor CMS, data katalog (migrasi 018 + seed + gambar pratinjau), dan konten aneh.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionEditor } from '../../pages/account/cms/SectionEditor';
import { validateContent } from '../../pages/account/cms/validation';
import { TEMPLATES, resolveContent } from '../index';
import { iconKey } from '../serenity/icons';
import { featureLines, featuredPlan, heroSlides, navItems, searchEntries, searchFilter, serenityVars } from '../serenity/model';
import { SERENITY_PHOTOS } from '../serenity/photos';
import { SiteRenderer } from '../SiteRenderer';
import { contrast, parseHex } from '../shared/utils';
import { isListField, type SiteContent } from '../types';

const ROOT = process.cwd();
const def = TEMPLATES.serenity;
const ORDER = ['hero', 'about', 'services', 'steps', 'pricing', 'testimonials', 'faq', 'cta', 'contact'];
const sectionKeys = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-tpl-section]')).map((s) => s.getAttribute('data-tpl-section'));
const section = (root: HTMLElement, key: string) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`)!;
const demo = (content: unknown = null, preview = false) => render(<SiteRenderer templateCode="serenity" content={content} preview={preview} />).container;
const rgb = (hex: string) => parseHex(hex)!;
const publicFile = (url: string) => resolve(ROOT, 'public', url.replace(/^\//, ''));

let scrolled: (string | null)[] = [];
beforeEach(() => {
  scrolled = [];
  Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
    scrolled.push(this.getAttribute('data-tpl-section'));
  });
});
afterEach(cleanup);

describe('Serenity: skema & konten bawaan', () => {
  it('urutan form = urutan halaman, section baru berkunci Inggris pendek, field unik, list berbatas', () => {
    expect(def.code).toBe('serenity');
    expect(def.sections.map((s) => s.key)).toEqual(['brand', ...ORDER, 'footer']);
    const fields = (key: string) => def.sections.find((s) => s.key === key)!.fields.map((f) => f.key);
    expect(fields('brand')).toEqual(['company_name', 'tagline', 'logo', 'accent_color']);
    expect(fields('hero')).toEqual(
      expect.arrayContaining(['highlight', 'secondary_label', 'secondary_url', 'header_label', 'header_url', 'image', 'slides', 'card_title', 'card_text', 'card_url', 'features']),
    );
    expect(fields('about')).toEqual(expect.arrayContaining(['highlight', 'badge_value', 'badge_label', 'points', 'stats']));
    expect(fields('services')).toEqual(['eyebrow', 'title', 'subtitle', 'items']);
    expect(fields('pricing')).toEqual(['eyebrow', 'title', 'subtitle', 'note', 'items']);
    expect(fields('faq')).toEqual(expect.arrayContaining(['help_title', 'help_text', 'button_label', 'button_url', 'items']));
    const logo = def.sections[0].fields.find((f) => f.key === 'logo');
    expect(logo && 'help' in logo ? logo.help : '').toMatch(/simbol matahari & gelombang/);
    for (const s of def.sections) {
      const keys = s.fields.map((f) => f.key);
      expect(new Set(keys).size, s.key).toBe(keys.length);
      for (const f of s.fields) if (isListField(f)) expect(f.max, `${s.key}.${f.key}`).toBeGreaterThan(0);
      expect(def.defaultContent[s.key], s.key).toBeTypeOf('object');
      expect(s.introduced).toBeUndefined();
    }
  });

  it('konten demo lolos validasi CMS, logo kosong, semua foto terdaftar, ada di public/, dan tercatat di CREDITS.md', () => {
    const c = def.defaultContent;
    expect(validateContent(def, resolveContent(def, null))).toEqual({});
    expect(c.brand.logo).toBe('');
    expect(c.hero.image).toBe('/assets/templates/photos/serenity-hero-1920.webp');
    const photos = JSON.stringify(c).match(/\/assets\/templates\/photos\/[a-z0-9-]+\.webp/g) ?? [];
    expect(photos.length).toBeGreaterThanOrEqual(15);
    for (const src of photos) expect(SERENITY_PHOTOS.asset(src), src).not.toBeNull();
    const credits = readFileSync(resolve(ROOT, 'public/assets/templates/photos/CREDITS.md'), 'utf8');
    for (const key of SERENITY_PHOTOS.keys) {
      const asset = SERENITY_PHOTOS.asset(SERENITY_PHOTOS.src(key))!;
      const urls = [asset.src, ...asset.srcSet!.split(',').map((part) => part.trim().split(' ')[0])];
      for (const url of urls) expect(existsSync(publicFile(url)), url).toBe(true);
      expect(credits, key).toContain(`\`${key}-*\``);
      expect(photos, `${key} dipakai di konten demo`).toContain(SERENITY_PHOTOS.src(key));
    }
    expect(existsSync(publicFile('/assets/templates/logos/serenity-mark.svg'))).toBe(true);
  });

  it('salinan demo jujur: tanpa klaim medis, FAQ menyebut latihan kebugaran bukan pengobatan', () => {
    const text = JSON.stringify(def.defaultContent);
    expect(text).not.toMatch(/menyembuhkan|mengobati|terapi|terbukti secara klinis|dijamin|menurunkan berat/i);
    expect(text).toMatch(/latihan kebugaran, bukan pengobatan/);
  });
});

describe('Serenity: helper model', () => {
  it('gradasi judul: pastel ≥ 7:1 terhadap tinta malam, tinta aksen ≥ 4,5:1 di putih, warna tidak valid → bawaan', () => {
    const night = rgb('#0B1530');
    const white = rgb('#ffffff');
    for (const accent of ['#6E5BD8', '#FFE600', '#0B3D2E', '#ff0000']) {
      const vars = serenityVars(accent) as Record<string, string>;
      expect(contrast(rgb(vars['--sr-hl-from']), night), accent).toBeGreaterThanOrEqual(7);
      expect(contrast(rgb(vars['--sr-ink-from']), white), accent).toBeGreaterThanOrEqual(4.5);
      expect(contrast(rgb(vars['--sr-ink-to']), white), accent).toBeGreaterThanOrEqual(4.5);
    }
    expect(serenityVars('bukan warna')).toEqual(serenityVars('#6E5BD8'));
  });

  it('menu mengikuti section yang tampil; label singkat dari label section', () => {
    const content = resolveContent(def, null);
    expect(navItems(content).map((i) => i.label)).toEqual(['Beranda', 'Tentang Kami', 'Kelas', 'Paket', 'Tanya Jawab', 'Kontak']);
    const edited = resolveContent(def, { pricing: { enabled: false }, about: { eyebrow: 'Kisah panjang studio kami' }, faq: { items: [] } });
    expect(navItems(edited).map((i) => i.key)).toEqual(['hero', 'about', 'services', 'contact']);
    expect(navItems(edited)[1].label).toBe('Tentang');
  });

  it('pencarian halaman: kelas, langkah, paket, FAQ; semua kata harus cocok; tanpa diakritik', () => {
    const content = resolveContent(def, null);
    const entries = searchEntries(content, navItems(content));
    expect(entries.find((e) => e.label === 'Vinyasa Flow')).toEqual({ label: 'Vinyasa Flow', group: 'Kelas', target: 'services' });
    expect(entries.find((e) => e.label === 'Member Bulanan')).toEqual({ label: 'Member Bulanan', group: 'Paket', target: 'pricing' });
    expect(entries.find((e) => e.label === 'Daftar lewat WhatsApp')?.target).toBe('steps');
    expect(entries.some((e) => e.target === 'faq' && /bawa/.test(e.label))).toBe(true);
    expect(searchFilter(entries, 'privat').map((e) => `${e.label}|${e.group}`)).toEqual(['Kelas Privat|Kelas', 'Kelas Privat|Paket']);
    expect(searchFilter(entries, 'paket member').map((e) => e.label)).toEqual(['Member Bulanan']);
    expect(searchFilter(entries, 'VÍNYASA').map((e) => e.label)).toContain('Vinyasa Flow');
    expect(searchFilter(entries, '   ')).toEqual([]);
    expect(searchFilter(entries, 'zzz')).toEqual([]);
  });

  it('slide hero: slide pertama = isi hero, slide tambahan hanya yang berfoto, teks kosong ikut slide pertama', () => {
    const base = { image: '/a.webp', eyebrow: 'Label', title: 'Judul utama', highlight: 'utama', subtitle: 'Deskripsi' };
    expect(heroSlides({ ...base, slides: [{ image: '' , title: 'Tanpa foto' }, { image: '/b.webp' }, { image: '/c.webp', title: 'Judul C', highlight: 'C' }] }, 'Usaha')).toEqual([
      base,
      { image: '/b.webp', eyebrow: 'Label', title: 'Judul utama', highlight: 'utama', subtitle: 'Deskripsi' },
      { image: '/c.webp', eyebrow: 'Label', title: 'Judul C', highlight: 'C', subtitle: 'Deskripsi' },
    ]);
    expect(heroSlides({}, 'Usaha')).toEqual([{ image: '', eyebrow: '', title: 'Usaha', highlight: '', subtitle: '' }]);
    const many = Array.from({ length: 6 }, (_, i) => ({ image: `/s${i}.webp` }));
    expect(heroSlides({ slides: many }, 'Usaha')).toHaveLength(4);
    expect(heroSlides({ slides: [{ image: 'javascript:alert(1)' }] }, 'Usaha')).toHaveLength(1);
  });

  it('isi paket per baris, paket unggulan = paket berlabel pertama, ikon otomatis dari nama kelas', () => {
    expect(featureLines('- Satu\n\n• Dua\r\n✓ Tiga  \n')).toEqual(['Satu', 'Dua', 'Tiga']);
    expect(featureLines('')).toEqual([]);
    expect(featuredPlan([{ name: 'A' }, { name: 'B', badge: 'Favorit' }, { name: 'C', badge: 'Lain' }])).toBe(1);
    expect(featuredPlan([{ name: 'A' }])).toBe(-1);
    expect(iconKey('Hatha Yoga')).toBe('sun');
    expect(iconKey('Vinyasa Flow')).toBe('breath');
    expect(iconKey('Yin & Restoratif')).toBe('sleep');
    expect(iconKey('Yoga Pemula')).toBe('growth');
    expect(iconKey('Kelas Privat')).toBe('heart');
    expect(iconKey('Retret Yoga')).toBe('retreat');
    expect(iconKey('Yoga untuk Semua')).toBe('yoga');
    expect(iconKey('Sesuatu yang lain', 3)).toBe('sparkles');
  });
});

describe('Serenity: demo', () => {
  it('urutan section, satu h1, hero layar penuh berfoto, menu transparan dengan garis bawah item aktif', () => {
    const container = demo();
    expect(sectionKeys(container)).toEqual(ORDER);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const hero = section(container, 'hero');
    expect(hero.getAttribute('data-hero-layout')).toBe('fullbleed');
    expect(hero.getAttribute('data-tpl-tone')).toBe('inverse');
    const h1 = hero.querySelector('h1')!;
    expect(h1.textContent).toBe('Temukan Keseimbangandi Setiap Gerakan');
    expect(h1.querySelector('br')).not.toBeNull();
    expect(h1.querySelector('.sr-grad-pastel')?.textContent).toBe('di Setiap Gerakan');
    const img = hero.querySelector<HTMLImageElement>('img[fetchpriority="high"]')!;
    expect(img.getAttribute('src')).toBe('/assets/templates/photos/serenity-hero-1920.webp');
    expect(img.getAttribute('srcset')).toBe('/assets/templates/photos/serenity-hero-800.webp 800w, /assets/templates/photos/serenity-hero-1920.webp 1920w');
    expect(img.getAttribute('loading')).toBe('eager');
    expect(img.getAttribute('alt')).toMatch(/bukit/i);
    expect(container.querySelectorAll('img[fetchpriority="high"]')).toHaveLength(1);

    const header = container.querySelector('header')!;
    expect(header.className).toContain('h-0');
    expect(header.getAttribute('data-tpl-tone')).toBe('inverse');
    const nav = within(header).getAllByRole('navigation', { name: 'Menu utama' })[0];
    expect(Array.from(nav.querySelectorAll('a')).map((a) => a.textContent)).toEqual(['Beranda', 'Tentang Kami', 'Kelas', 'Paket', 'Tanya Jawab', 'Kontak']);
    expect(within(nav).getByRole('link', { name: 'Beranda' })).toHaveAttribute('aria-current', 'true');
    expect(within(header).getByRole('link', { name: 'Daftar Kelas' })).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\/6281234567890/));
    expect(within(header).getByRole('button', { name: 'Cari di halaman' })).toHaveAttribute('aria-expanded', 'false');
    expect(header.querySelector('svg[viewBox="0 0 32 32"]'), 'SerenityMark').not.toBeNull();
  });

  it('hero: tombol utama ke WhatsApp, tombol video ke YouTube, kartu kaca ke Kelas, strip 4 jenis kelas + penanda 01–04', () => {
    const hero = section(demo(), 'hero');
    expect(within(hero).getByRole('link', { name: 'Coba Kelas Pertama' })).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\//));
    const video = within(hero).getByRole('link', { name: 'Tonton Video' });
    expect(video).toHaveAttribute('href', 'https://www.youtube.com/@arunayoga');
    expect(video).toHaveAttribute('target', '_blank');
    expect(within(hero).getByRole('link', { name: /Yoga untuk Semua/ })).toHaveAttribute('href', '#layanan');
    const features = within(hero).getByRole('list', { name: 'Yang bisa Anda temukan' });
    expect(Array.from(features.querySelectorAll('li')).map((li) => li.textContent)).toEqual([
      'Hatha YogaFondasi pose & napas',
      'Vinyasa FlowGerak yang mengalir',
      'Yin YogaPeregangan yang dalam',
      'Kelas PrivatSesuai kebutuhan Anda',
    ]);
    expect(hero.textContent).toContain('0104');
  });

  it('hero slider: 4 slide, kontrol per slide, klik mengganti foto & teks, hanya foto pertama yang eager', () => {
    const hero = section(demo(), 'hero');
    expect(hero.getAttribute('aria-roledescription')).toBe('carousel');
    const controls = within(hero).getByRole('group', { name: 'Kontrol slide' });
    const dots = within(controls).getAllByRole('button', { name: /^Slide \d dari 4$/ });
    expect(dots).toHaveLength(4);
    expect(dots[0]).toHaveAttribute('aria-current', 'true');
    // Demo bergerak: bilah progres berjalan (memicu slide berikut saat animasinya selesai) dan bisa dijeda
    const pause = within(controls).getByRole('button', { name: 'Jeda slide otomatis' });
    expect(controls.querySelector('.sr-progress')).toHaveAttribute('data-run', 'true');
    fireEvent.click(pause);
    expect(within(controls).getByRole('button', { name: 'Putar slide otomatis' })).toBeInTheDocument();
    expect(controls.querySelector('.sr-progress')).toHaveAttribute('data-run', 'false');
    expect(hero.querySelectorAll('img')).toHaveLength(1);

    fireEvent.click(dots[1]);
    expect(dots[1]).toHaveAttribute('aria-current', 'true');
    expect(hero.querySelector('h1')!.textContent).toBe('Rehat Sejenakdi Alam Terbuka');
    expect(within(hero).getByText('Retret yoga setiap bulan')).toBeInTheDocument();
    // Setelah pengunjung memilih slide, foto slide lain ikut dimuat (lazy) agar pergantian berikutnya mulus
    const imgs = Array.from(hero.querySelectorAll<HTMLImageElement>('img'));
    expect(imgs.map((img) => img.getAttribute('src'))).toEqual([
      '/assets/templates/photos/serenity-hero-1920.webp',
      '/assets/templates/photos/serenity-slide-gunung-1920.webp',
      '/assets/templates/photos/serenity-slide-kelas-1920.webp',
      '/assets/templates/photos/serenity-slide-langit-1920.webp',
    ]);
    expect(imgs.map((img) => img.getAttribute('fetchpriority'))).toEqual(['high', null, null, null]);
    expect(imgs.slice(1).every((img) => img.getAttribute('loading') === 'lazy')).toBe(true);
    expect(imgs.map((img) => img.getAttribute('alt') !== '')).toEqual([false, true, false, false]);
    expect(imgs[1].getAttribute('alt')).toMatch(/pegunungan/);
    // Teks slide lain tetap di DOM (tinggi hero stabil) tetapi tersembunyi dari pembaca layar; tetap satu h1
    expect(hero.querySelectorAll('h1')).toHaveLength(1);
    expect(within(hero).getAllByRole('heading', { level: 1 })).toHaveLength(1);
    // Tombol & strip fitur tetap sama di setiap slide
    expect(within(hero).getByRole('link', { name: 'Coba Kelas Pertama' })).toBeInTheDocument();
    expect(within(hero).getByRole('list', { name: 'Yang bisa Anda temukan' })).toBeInTheDocument();
  });

  it('tentang, kelas, langkah, paket unggulan gelap, cerita peserta, FAQ accordion, ajakan, kontak, footer', () => {
    const container = demo();
    const about = section(container, 'about');
    expect(about.querySelector('.sr-grad-ink')?.textContent).toBe('mengenal tubuh sendiri');
    expect(about.textContent).toContain('Sejak 2018');
    expect(about.querySelectorAll('dl > div')).toHaveLength(3);

    const programs = section(container, 'services');
    expect(programs.querySelectorAll('ul > li')).toHaveLength(6);
    const ask = within(programs).getByRole('link', { name: 'Tanya jadwal Vinyasa Flow' });
    expect(decodeURIComponent(ask.getAttribute('href') ?? '')).toContain('Halo Aruna Yoga, saya ingin bertanya tentang Vinyasa Flow.');
    for (const img of programs.querySelectorAll('img')) expect(img.getAttribute('loading')).toBe('lazy');

    expect(section(container, 'steps').querySelectorAll('ol > li')).toHaveLength(4);

    const pricing = section(container, 'pricing');
    // Daftar pertama di section = grid paket (isi paket juga berupa daftar, di dalam kartu)
    const plans = Array.from(pricing.querySelector('ul')!.children) as HTMLElement[];
    expect(plans).toHaveLength(3);
    const dark = plans.filter((li) => li.getAttribute('data-tpl-tone') === 'inverse');
    expect(dark).toHaveLength(1);
    expect(dark[0].textContent).toContain('Paling diminati');
    expect(dark[0].querySelectorAll('ul li')).toHaveLength(4);
    expect(decodeURIComponent(within(dark[0]).getByRole('link', { name: 'Pilih Member Bulanan' }).getAttribute('href') ?? '')).toContain('paket Member Bulanan');

    const stories = section(container, 'testimonials');
    expect(stories.querySelectorAll('blockquote')).toHaveLength(3);
    for (const img of stories.querySelectorAll('img')) expect(img.getAttribute('srcset')).toContain('-240.webp 240w');

    const faq = section(container, 'faq');
    const buttons = within(faq).getAllByRole('button');
    expect(buttons).toHaveLength(5);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(buttons[2]);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'false');
    expect(buttons[2]).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(buttons[2].getAttribute('aria-controls')!)).not.toHaveAttribute('inert');

    const cta = section(container, 'cta');
    expect(within(cta).getByRole('link', { name: 'Lihat paket' })).toHaveAttribute('href', '#pricing');
    expect(cta.querySelector('.sr-grad-pastel')?.textContent).toBe('mulai hari ini');

    const contact = section(container, 'contact');
    expect(within(contact).getByRole('link', { name: /WhatsApp 081234567890/ })).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\//));
    expect(contact.querySelector('iframe[title="Peta lokasi Aruna Yoga"]')).not.toBeNull();

    const footer = container.querySelector('footer')!;
    expect(within(footer).getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://instagram.com/arunayoga');
    expect(within(footer).getByRole('navigation', { name: 'Tautan footer' }).querySelectorAll('a')).toHaveLength(5);
    expect(footer.textContent).toContain(`© ${new Date().getFullYear()} Aruna Yoga. Semua hak dilindungi.`);
  });

  it('datar: tidak ada kelas shadow di kode template', () => {
    const container = demo();
    const shadows = Array.from(container.querySelectorAll('[class*="shadow"]')).filter((el) => !el.closest('[aria-label="Chat WhatsApp"]') && !/Chat WhatsApp/.test(el.getAttribute('aria-label') ?? ''));
    expect(shadows.map((el) => el.className)).toEqual([]);
  });
});

describe('Serenity: pencarian di menu', () => {
  it('cari → hasil → klik menggulir ke section dan menutup kolom; tanpa hasil → ajakan bertanya; Esc menutup', () => {
    const container = demo();
    const header = container.querySelector('header')!;
    const toggle = within(header).getByRole('button', { name: 'Cari di halaman' });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(header.className).toContain('h-0');
    const panel = document.getElementById(toggle.getAttribute('aria-controls')!)!;
    const input = within(panel).getByRole('searchbox', { name: 'Cari di halaman' });
    expect(input).toHaveFocus();
    // Tanpa kueri: pintasan ke bagian halaman
    expect(within(panel).getByRole('link', { name: 'Paket' })).toHaveAttribute('href', '#pricing');

    fireEvent.change(input, { target: { value: 'privat' } });
    const results = within(header).getByRole('list', { name: 'Hasil pencarian' });
    expect(Array.from(results.querySelectorAll('a')).map((a) => a.textContent)).toEqual(['Kelas PrivatKelas', 'Kelas PrivatPaket']);
    expect(within(header).getByRole('status')).toHaveTextContent('2 hasil');
    fireEvent.click(within(results).getAllByRole('link')[0]);
    expect(scrolled).toEqual(['services']);
    expect(within(header).queryByRole('searchbox')).toBeNull();

    fireEvent.click(toggle);
    fireEvent.change(within(header).getByRole('searchbox'), { target: { value: 'renang' } });
    expect(header.textContent).toContain('Tidak ada hasil untuk “renang”.');
    expect(within(header).getByRole('link', { name: /Tanyakan langsung kepada kami/ })).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\//));
    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });
    expect(within(header).queryByRole('searchbox')).toBeNull();
    expect(toggle).toHaveFocus();
  });
});

describe('Serenity: konten opsional kosong', () => {
  it('hero tanpa foto → latar gradasi tanpa img; tanpa tautan video → tanpa tombol video; kartu kaca & fitur kosong → disembunyikan', () => {
    const hero = section(demo({ hero: { image: '', slides: [], secondary_url: '', card_title: '', card_text: '', features: [] } }), 'hero');
    expect(hero.querySelector('img')).toBeNull();
    expect(hero.className).toContain('sr-hero-fallback');
    expect(within(hero).queryByRole('link', { name: 'Tonton Video' })).toBeNull();
    expect(within(hero).queryByRole('link', { name: /Yoga untuk Semua/ })).toBeNull();
    expect(within(hero).queryByRole('list', { name: 'Yang bisa Anda temukan' })).toBeNull();
    expect(within(hero).getByRole('link', { name: 'Coba Kelas Pertama' })).toBeInTheDocument();
    expect(within(hero).queryByRole('group', { name: 'Kontrol slide' })).toBeNull();
    expect(hero.hasAttribute('aria-roledescription')).toBe(false);
  });

  it('kelas tanpa gambar → gradasi bawaan; paket tanpa label → tanpa kartu gelap; tanpa WhatsApp → tombol ke Kontak', () => {
    const container = demo({
      services: { items: [{ title: 'Meditasi Pagi', description: 'Sesi singkat.', image: '' }] },
      pricing: { items: [{ name: 'Dasar', price: 'Rp50.000', badge: '', button_label: 'Pilih' }] },
      contact: { whatsapp: '' },
    });
    const programs = section(container, 'services');
    expect(programs.querySelector('img')).toBeNull();
    expect(programs.querySelector('[style*="linear-gradient"]')).not.toBeNull();
    expect(within(programs).getByRole('link', { name: 'Tanya jadwal Meditasi Pagi' })).toHaveAttribute('href', '#kontak');
    const pricing = section(container, 'pricing');
    expect(pricing.querySelector('[data-tpl-tone="inverse"]')).toBeNull();
    expect(within(pricing).getByRole('link', { name: 'Pilih' })).toHaveAttribute('href', '#kontak');
  });

  it('hero dimatikan: header jadi bilah putih biasa tanpa "Beranda"', () => {
    const container = demo({ hero: { enabled: false } });
    expect(sectionKeys(container)).toEqual(ORDER.filter((k) => k !== 'hero'));
    const header = container.querySelector('header')!;
    expect(header.className).not.toContain('h-0');
    expect(header.hasAttribute('data-tpl-tone')).toBe(false);
    expect(within(header).getAllByRole('navigation', { name: 'Menu utama' })[0].textContent).not.toContain('Beranda');
  });
});

describe('Serenity: pratinjau CMS', () => {
  it('pratinjau diam (gerak mati bila Component dirender langsung) dan tanpa tautan wa.me', () => {
    const { container } = render(<def.Component content={resolveContent(def, null)} preview />);
    expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'off');
    // Slider tidak berputar sendiri di pratinjau (tanpa tombol jeda), tetapi slide tetap bisa dipilih
    expect(container.querySelector('.sr-progress')).toHaveAttribute('data-run', 'false');
    expect(container.querySelector('[aria-label="Jeda slide otomatis"]')).toBeNull();
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    expect(container.querySelector('a[href^="https://www.youtube.com"]')).toBeNull();
  });
});

describe('Serenity: editor CMS', () => {
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
  }, 20_000);
});

describe('Serenity: data katalog', () => {
  const sql = (file: string) => readFileSync(resolve(ROOT, file), 'utf8');

  it.each(['database/seed.templates.sql', 'database/migrations/2026-10-25_018_serenity_template.sql'])(
    '%s: baris serenity dengan template_code, kategori, dan pratinjau tangkapan layar .webp',
    (file) => {
      const text = sql(file);
      expect(text).toContain("'serenity'");
      expect(text).toContain("'Yoga & Wellness'");
      expect(text).toContain("'/assets/templates/serenity-preview.webp'");
      expect(text).toContain('\'["/assets/templates/serenity-1.webp","/assets/templates/serenity-2.webp"]\'');
    },
  );

  it('migrasi 018 aman diulang (INSERT IGNORE + UPDATE berdasarkan slug, tanpa DELETE) dan tercatat di schema_migrations', () => {
    // Tanpa komentar SQL (komentar kepala menyebut "Tidak ada DELETE")
    const text = sql('database/migrations/2026-10-25_018_serenity_template.sql').replace(/^--.*$/gm, '');
    expect(text).toMatch(/INSERT IGNORE INTO templates/);
    expect(text).toMatch(/WHERE slug = 'serenity';/);
    expect(text).not.toMatch(/\bDELETE\b/);
    expect(text).toContain("VALUES ('2026-10-25_018', 'templates: katalog Serenity')");
  });

  it('gambar pratinjau katalog ada di public/ dan ringan', () => {
    for (const name of ['serenity-preview', 'serenity-1', 'serenity-2']) {
      const path = resolve(ROOT, `public/assets/templates/${name}.webp`);
      expect(existsSync(path), name).toBe(true);
      const kb = statSync(path).size / 1024;
      expect(kb, name).toBeGreaterThan(10);
      expect(kb, name).toBeLessThan(220);
    }
  });
});

describe('Serenity: konten aneh', () => {
  it('angka, null, dan string di tempat list tidak membuat crash', () => {
    const weird = {
      hero: { features: 'x', highlight: 'tidak ada di judul', card_title: 5, secondary_url: 'javascript:alert(1)' },
      about: { points: 'x', stats: [null, { value: 7 }], body: 9 },
      services: { items: [{ title: 1 }, null, 'x'] },
      steps: { items: [{ title: 2, text: null }] },
      pricing: { items: [{ name: 3, features: 4, badge: 5 }] },
      faq: { items: [{ question: 2, answer: null }] },
      brand: { accent_color: 'ungu' },
    } as unknown as SiteContent;
    const { container } = render(<def.Component content={resolveContent(def, weird)} />);
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
  });
});
