// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/velora.test.tsx
// Velora (company profile berbahasa Inggris untuk grup otomotif / perusahaan besar, 2026-10-27): skema CMS & konten demo,
// helper model (warna dari satu aksen, menu, tujuan tautan, filter model, tanggal, formulir test drive → pesan
// WhatsApp/email, newsletter mailto, ikon otomatis), demo (urutan section, lang="en", hero kartu foto "showroom" dengan
// kata berpil + chip, menu pil + panel menu, filter model, carousel teknologi, dinding testimoni, newsroom, formulir test
// drive, dealer + peta, footer + newsletter), kejujuran CMS (SEMUA teks yang tampil berasal dari field CMS; data kontak
// demo jelas fiktif; tombol putar hanya untuk tautan video), konten opsional kosong, pratinjau CMS diam, editor CMS, data
// katalog (migrasi 033 + seed + gambar pratinjau), dan konten aneh.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionEditor } from '../../pages/account/cms/SectionEditor';
import { validateContent } from '../../pages/account/cms/validation';
import { TEMPLATES, resolveContent } from '../index';
import { SiteRenderer } from '../SiteRenderer';
import { contrast, parseHex } from '../shared/utils';
import { isListField, type ListItem, type SectionContent, type SiteContent } from '../types';
import { iconKey } from '../velora/icons';
import {
  accentIsDark,
  driveCopy,
  driveMessage,
  EMPTY_DRIVE,
  filterModels,
  fillTokens,
  isVideoUrl,
  lineupFilters,
  LOGO_MIN,
  mailtoHref,
  menuLabel,
  modelCategories,
  monthNames,
  navItems,
  newsletterHref,
  PAGE_SECTIONS,
  parseIsoDate,
  pillNavFits,
  readVelora,
  sectionTarget,
  todayIso,
  validateDrive,
  validPhone,
  veloraVars,
} from '../velora/model';
import { VELORA_PHOTOS } from '../velora/photos';

// Demo panjang (11 section) + getByRole di jsdom: bisa lewat 5 dtk saat suite berjalan paralel
vi.setConfig({ testTimeout: 30_000 });

const ROOT = process.cwd();
const def = TEMPLATES.velora;
const ORDER = ['hero', 'philosophy', 'bento', 'lineup', 'how', 'engineering', 'stats', 'testimonials', 'newsroom', 'cta', 'contact'];
const sectionKeys = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-tpl-section]')).map((s) => s.getAttribute('data-tpl-section'));
const section = (root: HTMLElement, key: string) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`)!;
const demo = (content: unknown = null, preview = false) => render(<SiteRenderer templateCode="velora" content={content} preview={preview} />).container;
const live = (content: unknown = null) => render(<def.Component content={resolveContent(def, content as SiteContent)} />).container;
const rgb = (hex: string) => parseHex(hex)!;
const publicFile = (url: string) => resolve(ROOT, 'public', url.replace(/^\//, ''));
const vars = (accent: string) => veloraVars(accent) as Record<string, string>;
const BONE = '#F4F4F2';
const NIGHT = '#0D0E10';
const GRAPHITE = '#1B1D21';

let scrolled: (string | null)[] = [];
beforeEach(() => {
  scrolled = [];
  Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
    scrolled.push(this.getAttribute('data-tpl-section'));
  });
});
afterEach(cleanup);

describe('Velora: skema & konten bawaan', () => {
  it('urutan form = urutan halaman, semua section bisa disembunyikan, field unik, list berbatas', () => {
    expect(def.code).toBe('velora');
    expect(def.name).toBe('Velora');
    expect(def.features).toBeUndefined();
    expect(def.sections.map((s) => s.key)).toEqual(['brand', ...ORDER, 'footer']);
    expect(PAGE_SECTIONS).toEqual([...ORDER, 'footer']);
    const fields = (key: string) => def.sections.find((s) => s.key === key)!.fields.map((f) => f.key);
    expect(fields('brand')).toEqual(['company_name', 'tagline', 'logo', 'accent_color', 'month_names']);
    expect(fields('hero')).toEqual(expect.arrayContaining(['eyebrow', 'title', 'highlight', 'subtitle', 'image', 'header_label', 'review_title', 'review_url']));
    expect(fields('lineup')).toEqual(expect.arrayContaining(['items', 'all_label', 'button_label']));
    expect(fields('cta')).toEqual(expect.arrayContaining(['form_title', 'form_button', 'whatsapp', 'email', 'image', 'points']));
    expect(fields('contact')).toEqual(expect.arrayContaining(['address', 'maps_query', 'maps_url', 'phone', 'email', 'whatsapp', 'hours', 'offices']));
    expect(fields('footer')).toEqual(expect.arrayContaining(['newsletter_title', 'newsletter_email', 'instagram', 'facebook', 'linkedin', 'youtube', 'tiktok']));
    for (const s of def.sections) {
      const keys = s.fields.map((f) => f.key);
      expect(new Set(keys).size, s.key).toBe(keys.length);
      if (s.key !== 'brand') expect(s.toggleable, s.key).toBe(true);
      for (const f of s.fields) if (isListField(f)) expect(f.max, `${s.key}.${f.key}`).toBeGreaterThan(0);
      expect(def.defaultContent[s.key], s.key).toBeTypeOf('object');
    }
  });

  it('label CMS berbahasa Indonesia, konten demo berbahasa Inggris', () => {
    const labels = def.sections.flatMap((s) => [s.label, ...s.fields.map((f) => f.label)]);
    expect(labels).toContain('Nama perusahaan');
    expect(labels).toContain('Kata di dalam pil');
    expect(labels).toContain('Jajaran model');
    const c = def.defaultContent;
    expect(c.brand.company_name).toBe('Velora Motor Group');
    expect(c.brand.logo).toBe('');
    expect(c.hero.title).toBe('Seven decades of driving what comes next');
    expect(String(c.hero.title)).toContain(String(c.hero.highlight));
    expect(c.lineup.title).toBe('Our model lineup');
    expect(c.cta.form_button).toBe('Prepare my request');
  });

  it('konten demo lolos validasi CMS, semua foto terdaftar, ada di public/, dan tercatat di CREDITS.md', () => {
    const content = resolveContent(def, null);
    expect(validateContent(def, content)).toEqual({});
    const credits = readFileSync(resolve(ROOT, 'public/assets/templates/photos/CREDITS.md'), 'utf8');
    expect(credits).toContain('## Velora (Velora Motor Group, fiktif)');
    const images: string[] = [];
    const collect = (value: unknown) => {
      if (typeof value === 'string' && value.startsWith('/assets/templates/photos/')) images.push(value);
      else if (Array.isArray(value)) value.forEach((item) => Object.values(item as ListItem).forEach(collect));
      else if (value && typeof value === 'object') Object.values(value).forEach(collect);
    };
    collect(def.defaultContent);
    expect(images.length).toBeGreaterThanOrEqual(25);
    for (const src of images) {
      const asset = VELORA_PHOTOS.asset(src);
      expect(asset, src).not.toBeNull();
      expect(existsSync(publicFile(src)), src).toBe(true);
    }
    expect(VELORA_PHOTOS.keys.length).toBe(30);
    for (const key of VELORA_PHOTOS.keys) {
      expect(key.startsWith('velora-'), key).toBe(true);
      expect(credits, key).toContain(`\`${key}-*\``);
    }
  });

  it('foto demo ringan: WebP ≤ 220 KB per file, total ≤ 3,5 MB; alt bawaan berbahasa Inggris', () => {
    let total = 0;
    for (const key of VELORA_PHOTOS.keys) {
      const asset = VELORA_PHOTOS.asset(VELORA_PHOTOS.src(key))!;
      const files = [asset.src, ...asset.srcSet!.split(',').map((part) => part.trim().split(' ')[0])];
      for (const file of new Set(files)) {
        expect(file.endsWith('.webp'), file).toBe(true);
        const kb = statSync(publicFile(file)).size / 1024;
        expect(kb, file).toBeLessThanOrEqual(220);
        total += kb;
      }
      expect(asset.alt, key).toMatch(/^[A-Z][a-z]/);
      expect(asset.alt, key).not.toMatch(/\b(dan|di|yang|dengan)\b/);
    }
    expect(total).toBeLessThan(3.5 * 1024);
  });

  it('salinan demo jujur: tanpa merek mobil nyata, klaim sertifikasi/regulator, atau janji investasi; formulir hanya menyusun pesan', () => {
    const text = JSON.stringify(def.defaultContent);
    expect(text).not.toMatch(/\b(Porsche|BMW|Mercedes|Audi|Tesla|Ferrari|Toyota|Hyundai|Kia|Jaguar|Maserati|Polestar|Volvo|Lexus|Chevrolet|Corvette|Geely|Nissan|Terra|Range Rover|Land Rover|KUKA|Zaptec)\b/i);
    // Contoh email pengunjung di pesan galat & placeholder skema memakai domain contoh, bukan domain perusahaan nyata
    expect(text).not.toMatch(/company\.com/);
    expect(JSON.stringify(def.sections)).not.toMatch(/company\.com/);
    expect(text).not.toMatch(/ISO 9001|certified by|NYSE|NASDAQ|listed on|guaranteed|return on investment|zero emission|safest/i);
    // Data kontak demo jelas fiktif: email di domain .example, telepon blok 555, akun sosial berakhiran -demo
    const c = def.defaultContent;
    for (const email of [c.contact.email, c.cta.email, c.footer.newsletter_email].map(String).filter(Boolean)) expect(email).toMatch(/@velora\.example$/);
    const phones = [c.contact.phone, c.contact.whatsapp, ...(c.contact.offices as ListItem[]).map((o) => o.phone)].map(String);
    for (const phone of phones) expect(phone.replace(/\D/g, ''), phone).toMatch(/555/);
    for (const key of ['instagram', 'facebook', 'linkedin', 'youtube', 'tiktok']) {
      const url = String(c.footer[key] ?? '');
      if (url) expect(url, key).toMatch(/-demo$/);
    }
    expect(text).not.toMatch(/velora-motor\.example|veloramotorgroup/);
    // Tautan kartu sorotan hero bukan video sungguhan → tanpa tombol putar (lihat uji demo)
    expect(isVideoUrl(String(c.hero.review_url))).toBe(false);
    const schema = JSON.stringify(def.sections);
    expect(schema).toMatch(/hanya menyusun pesan WhatsApp\/email/);
    expect(schema).toMatch(/tanpa penyimpanan data/);
  });
});

describe('Velora: helper model', () => {
  it('warna: tinta aksen ≥ 4,6:1 di putih tulang & putih, versi terang ≥ 4,6:1 di hitam & grafit, tombol berteks ≥ 4,5:1', () => {
    for (const accent of ['#E3342F', '#1565C0', '#047857', '#FACC15', '#F97316', '#7C3AED']) {
      const v = vars(accent);
      expect(contrast(rgb(v['--vl-ink']), rgb(BONE)), accent).toBeGreaterThanOrEqual(4.6);
      expect(contrast(rgb(v['--vl-ink']), rgb('#FFFFFF')), accent).toBeGreaterThanOrEqual(4.6);
      expect(contrast(rgb(v['--vl-bright']), rgb(NIGHT)), accent).toBeGreaterThanOrEqual(4.6);
      expect(contrast(rgb(v['--vl-bright']), rgb(GRAPHITE)), accent).toBeGreaterThanOrEqual(4.5);
      expect(contrast(rgb(v['--vl-fill']), rgb(v['--vl-on-fill'])), accent).toBeGreaterThanOrEqual(4.5);
    }
    // Merah bawaan: teks putih di atas merah yang sedikit digelapkan; aksen terang → teks tinta
    expect(vars('#E3342F')['--vl-on-fill']).toBe('#ffffff');
    expect(vars('#E3342F')['--vl-red']).toBe('#e3342f');
    expect(vars('#FACC15')['--vl-on-fill']).toBe('#0d0e10');
    expect(accentIsDark('#E3342F')).toBe(true);
    expect(accentIsDark('#FACC15')).toBe(false);
    // Warna tidak valid → bawaan
    expect(vars('merah')).toEqual(vars('#E3342F'));
  });

  it('menu: pil layar lebar + panel lengkap urut halaman; nama menu SELALU dari CMS (label kecil, lalu judul), tanpa teks bawaan', () => {
    const content = resolveContent(def, null);
    const nav = navItems(content);
    expect(nav.pill.map((i) => i.label)).toEqual(['Models', 'How it works', 'Technology', 'Company', 'Newsroom']);
    expect(nav.all.map((i) => i.key)).toEqual(['philosophy', 'lineup', 'how', 'engineering', 'testimonials', 'newsroom', 'cta', 'contact']);
    const renamed = navItems(resolveContent(def, { lineup: { eyebrow: 'Kendaraan' }, how: { eyebrow: '' }, newsroom: { enabled: false } }));
    // Label kecil kosong → judul ("Ownership in easy steps"); judul panjang dipotong rapi
    expect(renamed.pill.map((i) => i.label)).toEqual(['Kendaraan', 'Ownership in easy steps', 'Technology', 'Company']);
    expect(menuLabel({ title: 'Engineered in Zurich, proven everywhere on every continent' })).toBe('Engineered in Zurich,…');
    // Tanpa label kecil & judul → section tidak masuk menu (tidak ada nama bawaan berbahasa Inggris)
    const nameless = navItems(resolveContent(def, { stats: {}, testimonials: { eyebrow: '', title: '', title_muted: '' } }));
    expect(nameless.all.map((i) => i.key)).not.toContain('testimonials');
  });

  it('pil menu header: muat bila pil + 2 × (aksi kanan atau logo, maks. LOGO_MIN) + jarak ≤ lebar baris; belum diukur → muat', () => {
    // Konten bawaan di wadah 1152px (baris 1056px): pil ±526px, aksi ±198px, logo ±222px → muat
    expect(pillNavFits({ row: 1056, nav: 526, logo: 222, actions: 198 })).toBe(true);
    // Label menu bahasa Indonesia (pil ±740px, "Cari dealer terdekat" ±242px) di 1280px (baris 1152px) → tombol menu saja
    expect(pillNavFits({ row: 1152, nav: 740, logo: 222, actions: 242 })).toBe(false);
    // … di 1440px (baris 1312px) muat lagi
    expect(pillNavFits({ row: 1312, nav: 740, logo: 222, actions: 242 })).toBe(true);
    // Nama perusahaan panjang hanya dihitung sampai LOGO_MIN (sisanya terpotong rapi)
    expect(pillNavFits({ row: 1056, nav: 526, logo: 600, actions: 150 })).toBe(526 + 2 * (LOGO_MIN + 12) <= 1056);
    expect(pillNavFits({ row: 0, nav: 0, logo: 0, actions: 0 })).toBe(true);
  });

  it('tautan "#…": alias (#models, #dealers, #test-drive, #kontak) ke section yang benar, anchor tak dikenal / tersembunyi → cadangan', () => {
    expect(sectionTarget('#models')).toBe('lineup');
    expect(sectionTarget('dealers')).toBe('contact');
    expect(sectionTarget('#kontak')).toBe('contact');
    expect(sectionTarget('#test-drive')).toBe('cta');
    expect(sectionTarget('#ajakan')).toBe('cta');
    expect(sectionTarget('#technology')).toBe('engineering');
    expect(sectionTarget('#tidak-ada')).toBeNull();
    const m = readVelora(resolveContent(def, { lineup: { enabled: false } }));
    const fallback = { kind: 'section', target: 'contact' } as const;
    expect(m.linkOr('#models', fallback)).toEqual(fallback);
    expect(m.linkOr('#how', fallback)).toEqual({ kind: 'section', target: 'how' });
    expect(m.linkOr('javascript:alert(1)', fallback)).toEqual(fallback);
    expect(m.linkOr('https://youtube.com/x', null)).toEqual({ kind: 'external', href: 'https://youtube.com/x' });
    // Tanpa jajaran model, tombol hero menuju test drive
    expect(m.primaryAction).toEqual({ kind: 'section', target: 'cta' });
  });

  it('filter model: kategori unik dari kolom bergaris koma (tanpa beda huruf besar/aksen), filter tak dikenal → semua', () => {
    const items: ListItem[] = [
      { name: 'A', category: 'Electric' },
      { name: 'B', category: 'Coupé' },
      { name: 'C', category: 'SUV, electric' },
      { name: 'D', category: ' performance / coupe ' },
      { name: 'E', category: '' },
    ];
    expect(modelCategories(items[3])).toEqual(['performance', 'coupe']);
    expect(lineupFilters(items)).toEqual(['Electric', 'Coupé', 'SUV', 'performance']);
    expect(filterModels(items, 'electric').map((i) => i.name)).toEqual(['A', 'C']);
    expect(filterModels(items, 'Coupe').map((i) => i.name)).toEqual(['B', 'D']);
    expect(filterModels(items, null)).toHaveLength(5);
    expect(filterModels(items, 'Truck')).toHaveLength(5);
  });

  it('tanggal: ISO valid → "14 Oct 2026" (nama bulan dari CMS), tanggal mustahil/teks → null', () => {
    expect(parseIsoDate('2026-10-14')).toEqual({ iso: '2026-10-14', label: '14 Oct 2026' });
    const id = monthNames('Jan, Feb, Mar, Apr, Mei, Jun, Jul, Agu, Sep, Okt, Nov, Des');
    expect(parseIsoDate('2026-10-14', id)!.label).toBe('14 Okt 2026');
    // Bukan 12 nama → nama bulan bawaan (Inggris)
    expect(monthNames('Jan, Feb')[9]).toBe('Oct');
    expect(monthNames(null)[4]).toBe('May');
    expect(readVelora(resolveContent(def, { brand: { month_names: 'Jan; Feb; Mar; Apr; Mei; Jun; Jul; Agu; Sep; Okt; Nov; Des' } })).months[7]).toBe('Agu');
    expect(parseIsoDate('2026-02-30')).toBeNull();
    expect(parseIsoDate('next week')).toBeNull();
    expect(todayIso(new Date(2026, 9, 7))).toBe('2026-10-07');
  });

  it('formulir test drive: validasi per isian (Inggris), lalu pesan per baris; isian opsional kosong tidak ikut', () => {
    const today = '2026-10-27';
    const empty = validateDrive(EMPTY_DRIVE, { models: ['Velora Aster'], today });
    expect(Object.keys(empty).sort()).toEqual(['email', 'model', 'name']);
    expect(empty.email).toBe('Enter a valid email address, e.g. name@example.com.');
    const form = { ...EMPTY_DRIVE, name: 'Jane Doe', email: 'jane@example.com', model: 'Velora Aster' };
    expect(validateDrive(form, { models: ['Velora Aster'], today })).toEqual({});
    expect(validateDrive({ ...form, phone: '12ab' }, { models: [], today }).phone).toMatch(/country code/);
    expect(validateDrive({ ...form, date: '2026-10-01' }, { models: [], today }).date).toBe('Choose a valid date from today onwards.');
    expect(validateDrive({ ...form, date: '2026-13-01' }, { models: [], today }).date).toBe('Choose a valid date from today onwards.');
    // Pesan galat dari CMS
    const id = driveCopy({ error_name: 'Isi nama lengkap Anda.', error_model: 'Pilih model.' });
    expect(validateDrive(EMPTY_DRIVE, { models: ['A'], today, messages: id.errors })).toMatchObject({ name: 'Isi nama lengkap Anda.', model: 'Pilih model.' });
    expect(validPhone('+41 44 555 01 54')).toBe(true);
    expect(validPhone('0812-3456-7890')).toBe(true);
    expect(validPhone('41+44')).toBe(false);
    expect(validPhone('123')).toBe(false);
    const message = driveMessage('Velora Motor Group', { ...form, phone: '+41 79 555 01 54', studio: 'London', date: '2026-11-07', note: 'Two\n kids  seats' });
    expect(message).toBe(
      [
        'Hello Velora Motor Group, I would like to book a test drive.',
        'Full name: Jane Doe',
        'Email: jane@example.com',
        'Phone: +41 79 555 01 54',
        'Model: Velora Aster',
        'Preferred studio: London',
        'Preferred date: 7 Nov 2026',
        'Notes: Two kids seats',
        'Thank you.',
      ].join('\n'),
    );
    expect(driveMessage('X', form)).not.toMatch(/Phone|studio|date|Notes/);
    // Kalimat pembuka/penutup & label baris pesan dari CMS ({company} diganti nama perusahaan); penutup kosong → hilang
    const indo = driveCopy({ message_intro: 'Halo {company}, saya ingin test drive.', message_closing: '', label_name: 'Nama', label_email: 'Surel', label_model: 'Mobil' });
    expect(driveMessage('PT Maju', form, indo)).toBe(['Halo PT Maju, saya ingin test drive.', 'Nama: Jane Doe', 'Surel: jane@example.com', 'Mobil: Velora Aster'].join('\n'));
    expect(fillTokens('Hi {company} – {email}', { company: 'A', email: 'b@c.de' })).toBe('Hi A – b@c.de');
    // Tanggal di pesan memakai nama bulan CMS
    const idMonths = monthNames('Jan, Feb, Mar, Apr, Mei, Jun, Jul, Agu, Sep, Okt, Nov, Des');
    expect(driveMessage('PT Maju', { ...form, date: '2026-12-07' }, indo, idMonths)).toContain('Preferred date: 7 Des 2026');
  });

  it('mailto: subjek & isi ter-encode; email tidak valid → kosong; newsletter butuh email pengunjung yang valid', () => {
    expect(mailtoHref('sales@velora.example', 'Test drive', 'a b\nc')).toBe('mailto:sales@velora.example?subject=Test%20drive&body=a%20b%0Ac');
    expect(mailtoHref('bukan email', 'x', 'y')).toBe('');
    expect(newsletterHref('news@velora.example', 'Velora', 'me@x.com')).toContain('mailto:news@velora.example?subject=Newsletter%20subscription');
    expect(decodeURIComponent(newsletterHref('news@velora.example', 'Velora', 'me@x.com'))).toContain('please add me@x.com to your newsletter');
    expect(newsletterHref('news@velora.example', 'Velora', 'me@')).toBe('');
  });

  it('tautan video: YouTube/Vimeo/file video → tombol putar; kanal, situs lain, dan anchor → bukan video', () => {
    for (const url of ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtu.be/dQw4w9WgXcQ', 'https://vimeo.com/123456789', '/assets/film.mp4', 'https://cdn.x.com/a/b.webm?x=1']) {
      expect(isVideoUrl(url), url).toBe(true);
    }
    for (const url of ['', 'https://youtube.com/@velora-motor-demo', 'https://example.com/video', '#lineup', 'javascript:alert(1)']) {
      expect(isVideoUrl(url), url).toBe(false);
    }
  });

  it('ikon otomatis dari teks (Inggris & Indonesia), tanpa kecocokan → cadangan berurutan', () => {
    expect(iconKey('Battery systems')).toBe('battery');
    expect(iconKey('Smart manufacturing')).toBe('factory');
    expect(iconKey('Design studio')).toBe('design');
    expect(iconKey('Light & safety')).toBe('safety');
    expect(iconKey('Test drive & finance')).toBe('drive');
    expect(iconKey('Delivery & care')).toBe('delivery');
    expect(iconKey('Mobilitas kota')).toBe('mobility');
    expect(iconKey('Lorem', 0)).toBe('car');
    expect(iconKey('Lorem', 1)).toBe('key');
  });
});

describe('Velora: demo', () => {
  it('urutan section, lang="en", satu h1, hero "showroom" berfoto prioritas dengan kata berpil + chip aksen', () => {
    const container = demo();
    expect(sectionKeys(container)).toEqual([...ORDER, 'footer']);
    const root = container.querySelector('[lang="en"]');
    expect(root).not.toBeNull();
    expect(root!.closest('[data-tpl-root]')).not.toBeNull();
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const hero = section(container, 'hero');
    expect(hero).toHaveAttribute('data-hero-layout', 'showroom');
    expect(hero).toHaveAttribute('data-tpl-tone', 'inverse');
    const img = hero.querySelector('img[fetchpriority="high"]')!;
    expect(img).toHaveAttribute('src', '/assets/templates/photos/velora-hero-1600.webp');
    expect(img).toHaveAttribute('loading', 'eager');
    const h1 = container.querySelector('h1')!;
    expect(h1.textContent).toBe('Seven decades of driving what comes next');
    const pill = within(h1).getByText('driving');
    expect(pill.className).toMatch(/rounded-\[0\.62em\]/);
    // HP: sorotan panjang boleh terbagi dua baris di dalam pil (tidak terpotong); layar lebar: satu baris
    expect(pill.parentElement!.className).toContain('@2xl:whitespace-nowrap');
    expect(pill.parentElement!.className.split(' ')).not.toContain('whitespace-nowrap');
    expect(h1.querySelector('.vl-chip')).toHaveAttribute('aria-hidden', 'true');
    expect(within(hero).getByText('Drive the future today')).toBeInTheDocument();
    const explore = within(hero).getByRole('link', { name: 'Explore models' });
    expect(explore).toHaveAttribute('href', '#lineup');
    // Kartu sorotan: tanpa tautan video → ke jajaran model dengan panah (bukan tombol putar)
    const review = within(hero).getByRole('link', { name: /Model spotlight/ });
    expect(review).toHaveAttribute('href', '#lineup');
    expect(review.textContent).toContain('Kestrel GT · plug-in hybrid grand tourer');
    expect(review.querySelector('.lucide-play')).toBeNull();
    expect(review.querySelector('.lucide-arrow-up-right')).not.toBeNull();
  });

  it('kartu sorotan dengan tautan video → tombol putar', () => {
    const container = live({ hero: { review_url: 'https://www.youtube.com/watch?v=abcdefghijk', review_title: 'Model review' } });
    const review = within(section(container, 'hero')).getByRole('link', { name: /Model review/ });
    expect(review).toHaveAttribute('href', 'https://www.youtube.com/watch?v=abcdefghijk');
    expect(review.querySelector('.lucide-play')).not.toBeNull();
  });

  it('header: menu di dalam pil putih, pil "Find a dealer" ke Dealer & kontak, tombol bulat membuka panel menu (Esc menutup)', () => {
    const container = live();
    const header = container.querySelector('header')!;
    const navs = within(header).getAllByRole('navigation', { name: 'Menu utama' });
    expect(navs).toHaveLength(1);
    expect(within(navs[0]).getAllByRole('link').map((a) => a.textContent)).toEqual(['Models', 'How it works', 'Technology', 'Company', 'Newsroom']);
    expect(within(header).getByRole('link', { name: 'Find a dealer' })).toHaveAttribute('href', '#kontak');
    const button = within(header).getByRole('button', { name: 'Buka menu' });
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    const panel = within(header).getAllByRole('navigation', { name: 'Menu utama' })[1];
    expect(within(panel).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(
      expect.arrayContaining(['#philosophy', '#lineup', '#how', '#engineering', '#testimoni', '#newsroom', '#ajakan', '#kontak']),
    );
    fireEvent.click(within(panel).getByRole('link', { name: 'Models' }));
    expect(scrolled).toEqual(['lineup']);
    expect(within(header).getByRole('button', { name: 'Buka menu' })).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(within(header).getByRole('button', { name: 'Buka menu' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(within(header).getByRole('button', { name: 'Buka menu' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('filosofi (3 prinsip bernomor) & bento: kartu foto berchip menuju section, baris abu berpanah', () => {
    const container = live();
    const philosophy = section(container, 'philosophy');
    expect(within(philosophy).getByRole('heading', { level: 2 }).textContent).toBe('Our philosophy rests on three convictions');
    expect(philosophy.querySelectorAll('ol > li')).toHaveLength(3);
    const bento = section(container, 'bento');
    expect(bento).toHaveAttribute('aria-label', 'Explore Velora');
    const links = within(bento).getAllByRole('link');
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['#how', '#engineering', '#lineup', '#how', '#ajakan', '#kontak']);
    expect(links[0].textContent).toContain('Mobility');
    expect(links[0].querySelector('img')).toHaveAttribute('alt', 'Aerial view of a car on a hairpin mountain road above green valleys');
  });

  it('jajaran model: tombol filter (aria-pressed) benar-benar menyaring dan jumlahnya diumumkan', () => {
    const container = live();
    const lineup = section(container, 'lineup');
    const group = within(lineup).getByRole('group', { name: 'Filter models' });
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['All', 'Electric', 'Coupé', 'SUV', 'Performance']);
    const names = () => Array.from(lineup.querySelectorAll('ul li')).map((li) => li.querySelector('span[class*="text-[22px]"]')?.textContent);
    expect(names()).toEqual(['Velora Aster', 'Kestrel GT', 'Velora Skarvane', 'Velora Lumen', 'Vanta R']);
    fireEvent.click(within(group).getByRole('button', { name: 'Electric' }));
    expect(within(group).getByRole('button', { name: 'Electric' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(group).getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false');
    expect(names()).toEqual(['Velora Aster', 'Velora Skarvane', 'Velora Lumen']);
    expect(lineup.querySelector('[aria-live="polite"]')!.textContent).toBe('Showing 3 of 5 models: Electric');
    fireEvent.click(within(group).getByRole('button', { name: 'Coupé' }));
    expect(names()).toEqual(['Kestrel GT', 'Vanta R']);
    // Kartu tanpa tautan sendiri → test drive; harga & spesifikasi tampil
    const card = within(lineup).getAllByRole('link')[0];
    expect(card).toHaveAttribute('href', '#ajakan');
    expect(card.textContent).toContain('From $96,500');
    expect(card.textContent).toContain('480 kW system power');
    expect(within(lineup).getByRole('link', { name: 'Book a test drive' })).toHaveAttribute('href', '#ajakan');
  });

  it('kartu model: nama tautan = nama model + teks tombol CMS (harga & spesifikasi = deskripsi); klik memilih model itu di formulir test drive', () => {
    const container = live();
    const lineup = section(container, 'lineup');
    const card = within(lineup).getByRole('link', { name: 'Kestrel GT Book a test drive' });
    expect(card).toHaveAttribute('href', '#ajakan');
    expect(card).toHaveAccessibleDescription(/From \$96,500/);
    expect(card).toHaveAccessibleDescription(/480 kW system power/);
    const select = () => within(section(container, 'cta')).getByLabelText('Model') as HTMLSelectElement;
    expect(select().value).toBe('');
    fireEvent.click(card);
    expect(select().value).toBe('Kestrel GT');
    expect(scrolled).toContain('cta');
    // Kartu lain menimpa pilihan; pilihan manual tetap bisa diganti
    fireEvent.click(within(lineup).getByRole('link', { name: 'Velora Skarvane Book a test drive' }));
    expect(select().value).toBe('Velora Skarvane');
    fireEvent.change(select(), { target: { value: 'Vanta R' } });
    expect(select().value).toBe('Vanta R');
    // Kartu dengan tautan sendiri: nama tautan = nama model saja, formulir tidak diubah
    cleanup();
    const own = live({ lineup: { items: [{ name: 'Solo', category: 'Electric', url: 'https://velora.example/solo' }, { name: 'Duo', category: 'SUV' }] } });
    const soloCard = within(section(own, 'lineup')).getByRole('link', { name: 'Solo' });
    expect(soloCard).toHaveAttribute('href', 'https://velora.example/solo');
  });

  it('teknologi: kartu terpilih melebar (aria-expanded), tombol ← → berputar; angka bertitik aksen', () => {
    const container = live();
    const eng = section(container, 'engineering');
    const cards = () => Array.from(eng.querySelectorAll<HTMLElement>('.vl-eng-card'));
    expect(cards()).toHaveLength(5);
    expect(cards().map((c) => c.dataset.active)).toEqual(['true', 'false', 'false', 'false', 'false']);
    const buttons = within(eng).getAllByRole('button', { expanded: false });
    fireEvent.click(within(eng).getByRole('button', { name: 'Battery systems' }));
    expect(within(eng).getByRole('button', { name: 'Battery systems' })).toHaveAttribute('aria-expanded', 'true');
    expect(cards()[2].dataset.active).toBe('true');
    fireEvent.click(within(eng).getByRole('button', { name: 'Next card' }));
    expect(cards()[3].dataset.active).toBe('true');
    fireEvent.click(within(eng).getByRole('button', { name: 'Previous card' }));
    fireEvent.click(within(eng).getByRole('button', { name: 'Previous card' }));
    fireEvent.click(within(eng).getByRole('button', { name: 'Previous card' }));
    fireEvent.click(within(eng).getByRole('button', { name: 'Previous card' }));
    expect(cards()[4].dataset.active).toBe('true');
    expect(buttons.length).toBeGreaterThan(0);
    const stats = section(container, 'stats');
    expect(Array.from(stats.querySelectorAll('dt')).map((d) => d.textContent)).toEqual([
      'Vehicles delivered per year',
      'Countries with Velora studios',
      'Dealers and service partners',
      'Years of engineering',
    ]);
    expect(stats.textContent).toContain('2,400');
  });

  it('testimoni: dinding potret (tombol ber-aria-pressed) memilih kutipan; tombol ← → berputar', () => {
    const container = live();
    const t = section(container, 'testimonials');
    const tiles = within(t).getAllByRole('button', { name: /^Show the quote from/ });
    expect(tiles).toHaveLength(10);
    expect(tiles[0]).toHaveAttribute('aria-pressed', 'true');
    expect(t.querySelector('blockquote')!.textContent).toContain('engineered rather than styled');
    fireEvent.click(within(t).getByRole('button', { name: 'Show the quote from Amara Okafor' }));
    expect(t.querySelector('blockquote')!.textContent).toContain('Charging at home covers my whole week');
    expect(t.querySelector('figcaption')!.textContent).toContain('Lumen owner, London');
    fireEvent.click(within(t).getByRole('button', { name: 'Next testimonial' }));
    expect(t.querySelector('figcaption')!.textContent).toContain('Lucas Brenner');
    fireEvent.click(within(t).getByRole('button', { name: 'Previous testimonial' }));
    fireEvent.click(within(t).getByRole('button', { name: 'Previous testimonial' }));
    fireEvent.click(within(t).getByRole('button', { name: 'Previous testimonial' }));
    fireEvent.click(within(t).getByRole('button', { name: 'Previous testimonial' }));
    expect(t.querySelector('figcaption')!.textContent).toContain('Kenji Watanabe');
    expect(within(t).getByText('10 / 10')).toBeInTheDocument();
  });

  it('newsroom: tanggal "14 Oct 2026" dengan datetime, kategori; berita bertautan memakai teks tautan CMS', () => {
    let container = live();
    const news = section(container, 'newsroom');
    expect(news.querySelector('time[datetime="2026-10-14"]')!.textContent).toBe('14 Oct 2026');
    expect(within(news).getAllByRole('heading', { level: 3 })).toHaveLength(3);
    expect(within(news).queryByRole('link')).toBeNull();
    cleanup();
    container = live({
      newsroom: {
        read_label: 'Baca berita',
        items: [{ title: 'Satu', date: 'Oktober 2026', url: 'https://velora.example/news/1' }],
      },
    });
    const link = within(section(container, 'newsroom')).getByRole('link');
    expect(link).toHaveAttribute('href', 'https://velora.example/news/1');
    expect(link.textContent).toContain('Baca berita');
    expect(link.textContent).toContain('Oktober 2026');
  });

  it('formulir test drive: galat per isian + fokus ke isian pertama, lalu pesan apa adanya dengan tautan WhatsApp & email; tidak ada yang dikirim', () => {
    const container = live();
    const cta = section(container, 'cta');
    const form = cta.querySelector('form')!;
    expect(within(cta).getByRole('heading', { level: 2 }).textContent).toBe('Book a test drive');
    const model = within(form).getByLabelText('Model') as HTMLSelectElement;
    expect(Array.from(model.options).map((o) => o.textContent)).toEqual(['Choose a model', 'Velora Aster', 'Kestrel GT', 'Velora Skarvane', 'Velora Lumen', 'Vanta R']);
    const studio = within(form).getByLabelText(/Preferred studio/) as HTMLSelectElement;
    expect(Array.from(studio.options).map((o) => o.textContent)).toEqual(['Any studio', 'Zurich', 'Munich', 'London', 'Dubai', 'Singapore']);
    fireEvent.click(within(form).getByRole('button', { name: 'Prepare my request' }));
    const name = within(form).getByLabelText('Full name');
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(document.activeElement).toBe(name);
    expect(form.textContent).toContain('Please enter your full name.');
    expect(form.textContent).toContain('Choose a model to drive.');
    fireEvent.change(name, { target: { value: 'Jane Doe' } });
    fireEvent.change(within(form).getByLabelText('Email'), { target: { value: 'jane@example.com' } });
    fireEvent.change(model, { target: { value: 'Kestrel GT' } });
    fireEvent.change(studio, { target: { value: 'London' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Prepare my request' }));
    expect(cta.querySelector('form')).toBeNull();
    expect(within(cta).getByRole('heading', { name: 'Your request is ready' })).toBeInTheDocument();
    expect(cta.textContent).toContain('Check the message, then send it by WhatsApp or email.');
    const message = cta.querySelector('pre')!.textContent!;
    expect(message).toContain('Model: Kestrel GT');
    expect(message).toContain('Preferred studio: London');
    const wa = within(cta).getByRole('link', { name: 'Send via WhatsApp' });
    expect(wa.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/41795550154\?text=/);
    expect(decodeURIComponent(wa.getAttribute('href')!.split('?text=')[1])).toBe(message);
    const mail = within(cta).getByRole('link', { name: 'Send via email' });
    expect(mail.getAttribute('href')).toMatch(/^mailto:enquiries@velora\.example\?subject=Test%20drive%20request%20%E2%80%93%20Kestrel%20GT&body=/);
    fireEvent.click(within(cta).getByRole('button', { name: 'Edit details' }));
    expect((within(cta).getByLabelText('Full name') as HTMLInputElement).value).toBe('Jane Doe');
    expect(cta.textContent).toContain('Nothing is stored on this website.');
  });

  it('nama bulan dari CMS tampil di tanggal berita; label kecil test drive di atas foto berwarna putih', () => {
    const container = live({ brand: { month_names: 'Jan, Feb, Mar, Apr, Mei, Jun, Jul, Agu, Sep, Okt, Nov, Des' } });
    const news = section(container, 'newsroom');
    expect(news.querySelector('time[datetime="2026-10-14"]')!.textContent).toBe('14 Okt 2026');
    expect(news.querySelector('time[datetime="2026-09-30"]')!.textContent).toBe('30 Sep 2026');
    const label = within(section(container, 'cta')).getByText('Test drive', { selector: 'p span' }).closest('p')!;
    expect(label.className).toContain('text-white');
    // Tanpa foto latar → bidang grafit pejal, label kembali ke warna aksen terang
    cleanup();
    const plain = live({ cta: { image: '' } });
    const plainLabel = within(section(plain, 'cta')).getByText('Test drive', { selector: 'p span' }).closest('p')!;
    expect(plainLabel.className).toContain('text-(--vl-bright)');
  });

  it('footer: nama perusahaan panjang ("PT …", 80 huruf) membungkus di kolomnya, tidak melebarkan halaman', () => {
    const long = 'PT Velora Motor Group International Indonesia Sejahtera Bersama Mandiri Abadi'.padEnd(80, 'x');
    const container = live({ brand: { company_name: long } });
    const link = within(container.querySelector('footer')!).getByRole('link', { name: `${long}, back to top` });
    expect(link.className).toMatch(/\bmax-w-full\b/);
    expect(link.className).toMatch(/\bmin-w-0\b/);
    const name = within(link).getByText(long);
    expect(name.className).toContain('whitespace-normal!');
    expect(name.className).toContain('[overflow-wrap:anywhere]');
    // Header tetap satu baris (terpotong rapi)
    const headerName = within(container.querySelector('header')!).getByText(long);
    expect(headerName.className).not.toContain('whitespace-normal!');
  });

  it('dealer & kontak: kantor pusat, studio, tombol WhatsApp & Google Maps, peta; footer: model, menu, sosial, hak cipta otomatis', () => {
    const container = live();
    const contact = section(container, 'contact');
    expect(contact.textContent).toContain('Velora Platz 1, 8005 Zurich, Switzerland');
    expect(within(contact).getAllByRole('link', { name: '+41 44 555 01 54' })[0]).toHaveAttribute('href', 'tel:+41445550154');
    expect(within(contact).getByRole('link', { name: /Chat on WhatsApp/ }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/41795550154/);
    expect(within(contact).getByRole('link', { name: /Open in Google Maps/ }).getAttribute('href')).toContain('google.com/maps');
    expect(contact.querySelector('iframe')!.getAttribute('src')).toContain('output=embed');
    expect(Array.from(contact.querySelectorAll('ul li span[class*="text-[18px]"]')).map((s) => s.textContent)).toEqual(['Zurich', 'Munich', 'London', 'Dubai', 'Singapore']);
    const footer = container.querySelector('footer')!;
    expect(footer).toHaveAttribute('data-tpl-section', 'footer');
    expect(footer.textContent).toContain('Engineered in Zurich. Driven everywhere');
    expect(footer.textContent).not.toContain('everywhere..');
    expect(footer.textContent).toContain(`© ${new Date().getFullYear()} Velora Motor Group. All rights reserved.`);
    expect(within(footer).getByRole('navigation', { name: 'Footer links' })).toBeInTheDocument();
    expect(within(footer).getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', 'https://linkedin.com/company/velora-motor-demo');
    expect(within(footer).queryByRole('link', { name: 'Facebook' })).toBeNull();
    expect(Array.from(footer.querySelectorAll('p')).map((p) => p.textContent)).toEqual(expect.arrayContaining(['Models', 'Explore', 'Contact']));
    expect(within(footer).getAllByRole('link', { name: 'Kestrel GT' })[0]).toHaveAttribute('href', '#lineup');
  });

  it('newsletter: email tidak valid → galat; valid → tautan mailto ke email perusahaan (tanpa backend)', () => {
    const container = live();
    const footer = container.querySelector('footer')!;
    const input = within(footer).getByLabelText('Your email address');
    fireEvent.change(input, { target: { value: 'saya@' } });
    fireEvent.click(within(footer).getByRole('button', { name: 'Subscribe' }));
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(footer.textContent).toContain('Enter a valid email address');
    fireEvent.change(input, { target: { value: 'me@example.com' } });
    fireEvent.click(within(footer).getByRole('button', { name: 'Subscribe' }));
    const open = within(footer).getByRole('link', { name: 'Open email app' });
    expect(open.getAttribute('href')).toMatch(/^mailto:enquiries@velora\.example\?subject=Newsletter%20subscription/);
    expect(decodeURIComponent(open.getAttribute('href')!)).toContain('Hello Velora Motor Group, please add me@example.com to your newsletter.');
    expect(footer.textContent).toContain('Open your email app to send the subscription request for me@example.com.');
    fireEvent.click(within(footer).getByRole('button', { name: 'Change email' }));
    expect(within(footer).getByLabelText('Your email address')).toBeInTheDocument();
  });

  it('datar: tidak ada kelas shadow di template; setiap section diawali H2 (bento: aria-label)', () => {
    const files = ['Velora.tsx', 'Header.tsx', 'Hero.tsx', 'Company.tsx', 'Lineup.tsx', 'Ownership.tsx', 'Engineering.tsx', 'Stories.tsx', 'TestDrive.tsx', 'Contact.tsx', 'Footer.tsx', 'ui.tsx', 'styles.ts', 'velora.css'];
    for (const file of files) expect(readFileSync(resolve(ROOT, 'src/templates/velora', file), 'utf8'), file).not.toMatch(/shadow-|box-shadow/);
    const container = live();
    expect(container.querySelector('[class*="shadow-"]:not([aria-label="Chat WhatsApp"]):not([aria-label="Kembali ke atas"])')).toBeNull();
    for (const key of ORDER.filter((k) => k !== 'hero' && k !== 'bento')) {
      expect(section(container, key).querySelector('h2'), key).not.toBeNull();
    }
  });
});

describe('Velora: kejujuran CMS (keputusan integrasi #1)', () => {
  /** Semua field teks skema (bukan URL/gambar/email/telepon/warna) → penanda unik, termasuk isi list. */
  const TEXTUAL = new Set(['text', 'textarea']);
  const mk = (section: string, key: string) => `Q${section}${key}Q`;
  const marked = (): SiteContent => {
    const base = resolveContent(def, null);
    const out: SiteContent = {};
    for (const s of def.sections) {
      const section: SectionContent = { ...base[s.key] };
      for (const f of s.fields) {
        if (isListField(f)) {
          section[f.key] = ((base[s.key][f.key] as ListItem[]) ?? []).map((item, i) => {
            const next: ListItem = { ...item };
            for (const sub of f.fields) if (TEXTUAL.has(sub.type)) next[sub.key] = mk(s.key, `${f.key}${sub.key}${i}`);
            return next;
          });
        } else if (TEXTUAL.has(f.type)) {
          section[f.key] = mk(s.key, f.key);
        }
      }
      out[s.key] = section;
    }
    // Penanda di judul hero/sorotan tidak boleh berisi kata sorotan bawaan
    out.hero.highlight = '';
    return out;
  };
  /** Data yang bukan field teks (email kontak demo, isian pengunjung) boleh tampil. */
  const DATA_WORDS = new Set(['enquiries', 'velora', 'example', 'Ann', 'Lee', 'ann', 'com', 'me', 'site', 'org']);
  /**
   * Kata yang tampil (tanpa .sr-only) setelah penanda CMS, angka, dan tanda baca dibuang. Yang tersisa = teks yang TIDAK
   * berasal dari CMS (harus kosong).
   */
  const leftover = (root: HTMLElement): string[] => {
    const clone = root.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.sr-only, script, style').forEach((el) => el.remove());
    const words = (clone.textContent ?? '').replace(/Q[a-z_0-9]+Q/g, ' ').match(/[A-Za-z]+/g) ?? [];
    return words.filter((word) => !DATA_WORDS.has(word));
  };

  it('setiap teks yang tampil di halaman (menu, formulir, kontak, footer) berasal dari field CMS', () => {
    const content = marked();
    const { container } = render(<def.Component content={content} />);
    // Data kontak (email, telepon) bukan field teks
    expect(leftover(container)).toEqual([]);
    // Formulir test drive setelah galat & setelah diisi
    const cta = section(container, 'cta');
    const form = cta.querySelector('form')!;
    fireEvent.click(within(form).getByRole('button', { name: mk('cta', 'form_button') }));
    for (const key of ['error_name', 'error_email', 'error_model']) expect(form.textContent).toContain(mk('cta', key));
    expect(leftover(cta)).toEqual([]);
    fireEvent.change(within(form).getByLabelText(mk('cta', 'label_name')), { target: { value: 'Ann Lee' } });
    fireEvent.change(within(form).getByLabelText(mk('cta', 'label_email')), { target: { value: 'ann@example.com' } });
    fireEvent.change(within(form).getByLabelText(mk('cta', 'label_model')), { target: { value: mk('lineup', 'itemsname0') } });
    fireEvent.click(within(form).getByRole('button', { name: mk('cta', 'form_button') }));
    expect(within(cta).getByRole('heading', { name: new RegExp(mk('cta', 'ready_title')) })).toBeInTheDocument();
    expect(cta.querySelector('pre')!.textContent).toContain(`${mk('cta', 'label_name')}: Ann Lee`);
    expect(leftover(cta)).toEqual([]);
    // Newsletter: galat & setelah diisi
    const footer = container.querySelector('footer')!;
    const input = within(footer).getByLabelText(mk('footer', 'newsletter_label'));
    fireEvent.change(input, { target: { value: 'x@' } });
    fireEvent.click(within(footer).getByRole('button', { name: mk('footer', 'newsletter_button') }));
    expect(footer.textContent).toContain(mk('footer', 'newsletter_error'));
    fireEvent.change(input, { target: { value: 'me@site.org' } });
    fireEvent.click(within(footer).getByRole('button', { name: mk('footer', 'newsletter_button') }));
    expect(within(footer).getByRole('link', { name: new RegExp(mk('footer', 'newsletter_open')) })).toBeInTheDocument();
    expect(leftover(footer)).toEqual([]);
  });

  it('label CMS dalam bahasa Indonesia benar-benar tampil (formulir, kontak, footer)', () => {
    const container = live({
      cta: { label_name: 'Nama lengkap', optional_label: 'opsional', form_note: 'Tidak ada data yang disimpan.', talk_label: 'Ingin bicara langsung?' },
      contact: { label_address: 'Kantor pusat', whatsapp_label: 'Chat WhatsApp', maps_label: 'Buka di Google Maps' },
      footer: { links_title: 'Jelajahi', contact_title: 'Kontak', newsletter_label: 'Alamat email Anda' },
    });
    const cta = section(container, 'cta');
    expect(within(cta).getByLabelText('Nama lengkap')).toBeInTheDocument();
    expect(cta.textContent).toContain('(opsional)');
    expect(cta.textContent).toContain('Tidak ada data yang disimpan.');
    expect(cta.textContent).toContain('Ingin bicara langsung?');
    expect(within(cta).getByRole('link', { name: /Chat WhatsApp/ })).toBeInTheDocument();
    const contact = section(container, 'contact');
    expect(contact.textContent).toContain('Kantor pusat');
    expect(within(contact).getByRole('link', { name: /Buka di Google Maps/ })).toBeInTheDocument();
    const footer = container.querySelector('footer')!;
    expect(footer.textContent).toContain('Jelajahi');
    expect(within(footer).getByLabelText('Alamat email Anda')).toBeInTheDocument();
  });
});

describe('Velora: konten opsional kosong', () => {
  it('hero tanpa foto & tanpa kartu ulasan → bidang aksen lembut, judul tanpa pil bila sorotan tidak ada di judul', () => {
    const container = live({ hero: { image: '', review_title: '', highlight: 'tidak ada' } });
    const hero = section(container, 'hero');
    expect(hero.querySelector('img[fetchpriority="high"]')).toBeNull();
    expect(within(hero).queryByRole('link', { name: /Model spotlight/ })).toBeNull();
    expect(container.querySelector('h1')!.querySelector('.vl-chip')).toBeNull();
    expect(container.querySelector('h1')!.textContent).toBe('Seven decades of driving what comes next');
  });

  it('hero dimatikan → header tidak menumpang (bukan h-0); bento tanpa foto → baris saja; how tanpa foto → satu kolom', () => {
    const container = live({ hero: { enabled: false }, bento: { items: [] }, how: { image: '' } });
    expect(container.querySelector('header')!.className).not.toMatch(/\bh-0\b/);
    const bento = section(container, 'bento');
    expect(bento.querySelector('img')).toBeNull();
    expect(within(bento).getAllByRole('link')).toHaveLength(3);
    expect(section(container, 'how').querySelector('img')).toBeNull();
  });

  it('tanpa WhatsApp & email: formulir test drive diganti tombol ke Dealer & kontak; newsletter tersembunyi', () => {
    const container = live({ contact: { whatsapp: '', email: '' } });
    const cta = section(container, 'cta');
    expect(cta.querySelector('form')).toBeNull();
    expect(within(cta).getByRole('link', { name: 'Contact us' })).toHaveAttribute('href', '#kontak');
    expect(within(container.querySelector('footer')!).queryByRole('button', { name: 'Subscribe' })).toBeNull();
  });

  it('satu kategori model → tanpa tombol filter; testimoni tanpa foto → tanpa dinding, kutipan tetap; section kosong tidak dirender', () => {
    const container = live({
      lineup: { items: [{ name: 'Solo', category: 'Electric' }] },
      testimonials: { items: [{ name: 'Ann', quote: 'Great.' }] },
      newsroom: { items: [] },
      stats: { items: [{ value: '' }] },
    });
    expect(within(section(container, 'lineup')).queryByRole('group', { name: 'Filter models' })).toBeNull();
    const t = section(container, 'testimonials');
    expect(within(t).queryAllByRole('button', { name: /^Show the quote from/ })).toHaveLength(0);
    expect(t.querySelector('blockquote')!.textContent).toContain('Great.');
    expect(section(container, 'newsroom')).toBeNull();
    expect(section(container, 'stats')).toBeNull();
    expect(navItems(resolveContent(def, { newsroom: { items: [] } })).all.map((i) => i.key)).not.toContain('newsroom');
  });

  it('aksen dari CMS menurunkan variabel lokal; warna terang → teks tombol tinta', () => {
    const container = live({ brand: { accent_color: '#FACC15' } });
    const root = container.querySelector<HTMLElement>('[lang="en"]')!;
    expect(root.style.getPropertyValue('--vl-red')).toBe('#facc15');
    expect(root.style.getPropertyValue('--vl-on-fill')).toBe('#0d0e10');
  });
});

describe('Velora: pratinjau CMS', () => {
  it('pratinjau diam (gerak mati bila Component dirender langsung) dan tanpa tautan wa.me / mailto / Google Maps yang terbuka', () => {
    const { container } = render(<def.Component content={resolveContent(def, null)} preview />);
    expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'off');
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
    expect(container.querySelector('a[href^="https://www.google.com/maps"]')).toBeNull();
    // Pratinjau: section tanpa id anchor (tidak mengubah hash halaman CMS)
    expect(container.querySelector('[data-tpl-section="lineup"]')).not.toHaveAttribute('id');
  });
});

describe('Velora: editor CMS', () => {
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
        const items = box.queryAllByRole('button', { name: new RegExp(`^${f.itemLabel} 1(?![0-9])`) });
        if (items.length === 0) continue;
        fireEvent.click(items[0]);
        for (const sub of f.fields) expect(container.textContent, `${s.key}.${f.key}.${sub.key}`).toContain(sub.label);
      }
      unmount();
    }
  }, 60_000);
});

describe('Velora: data katalog', () => {
  const sql = (file: string) => readFileSync(resolve(ROOT, file), 'utf8');

  it.each(['database/seed.templates.sql', 'database/migrations/2026-10-27_033_velora_template.sql'])(
    '%s: baris velora dengan template_code, kategori Company Profile, harga, dan pratinjau tangkapan layar .webp',
    (file) => {
      const text = sql(file);
      expect(text).toContain("'velora'");
      expect(text).toContain("'Company Profile'");
      expect(text).toContain('1890000.00');
      expect(text).toContain("'/assets/templates/velora-preview.webp'");
      expect(text).toContain('\'["/assets/templates/velora-1.webp","/assets/templates/velora-2.webp"]\'');
      expect(text).toMatch(/hanya menyusun pesan WhatsApp atau email; tidak ada penyimpanan data, sistem booking, atau pembayaran online/);
      expect(text).toMatch(/berbahasa Inggris/);
      // Janji CMS sesuai kode: semua teks yang tampil, termasuk label formulir, adalah field CMS (lihat uji kejujuran CMS)
      expect(text).toMatch(/semua teks yang tampil \(termasuk label formulir\)/);
      expect(text).not.toMatch(/kartu ulasan video/);
    },
  );

  it('migrasi 033 aman diulang (INSERT IGNORE + UPDATE berdasarkan slug, tanpa DELETE) dan tercatat di schema_migrations', () => {
    const text = sql('database/migrations/2026-10-27_033_velora_template.sql').replace(/^--.*$/gm, '');
    expect(text).toMatch(/INSERT IGNORE INTO templates/);
    expect(text).toMatch(/WHERE slug = 'velora';/);
    expect(text).toMatch(/sort_order\s+= 17/);
    expect(text).toMatch(/status\s+= 'published'/);
    expect(text).not.toMatch(/\bDELETE\b/);
    expect(text).toContain("VALUES ('2026-10-27_033', 'templates: katalog Velora')");
  });

  it('gambar pratinjau katalog ada di public/, 1600×1000, dan ringan', () => {
    for (const name of ['velora-preview', 'velora-1', 'velora-2']) {
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

describe('Velora: konten aneh', () => {
  it('angka, null, dan string di tempat list tidak membuat crash; tautan berbahaya dibuang', () => {
    const weird = {
      hero: { highlight: 7, primary_url: 'javascript:alert(1)', review_url: 'vbscript:x', review_image: 'javascript:alert(1)' },
      philosophy: { points: 'x' },
      bento: { items: [null, { label: 3, image: 'javascript:alert(1)' }], rows: [{ title: 'Row', url: 'javascript:alert(1)' }] },
      lineup: { items: [{ name: 5, category: null, image: 'javascript:alert(1)', url: 'javascript:alert(1)' }, 'x'] },
      how: { steps: [{ title: 2, url: 'javascript:alert(1)' }] },
      engineering: { items: [{ title: 'E', image: 9 }] },
      stats: { items: [{ value: 7 }, null] },
      testimonials: { items: [{ quote: 'Ok', photo: 'javascript:alert(1)' }] },
      newsroom: { items: [{ title: 'N', date: 9, url: 'javascript:alert(1)' }] },
      cta: { points: 'x', whatsapp: 'abc', email: 'bukan' },
      contact: { offices: [{ city: 1, phone: 'abc' }], maps_url: 'javascript:alert(1)' },
      footer: { newsletter_email: 'javascript:alert(1)', facebook: 'facebook.com/uji' },
      brand: { accent_color: 'merah' },
    } as unknown as SiteContent;
    const { container } = render(<def.Component content={resolveContent(def, weird)} />);
    expect(container.querySelector('a[href^="javascript:"], a[href^="vbscript:"]')).toBeNull();
    expect(container.querySelector('img[src^="javascript:"]')).toBeNull();
    expect(container.querySelector('h1')!.textContent).toBe('Seven decades of driving what comes next');
    expect(container.querySelector('a[href="https://facebook.com/uji"]')).not.toBeNull();
    expect(() => render(<def.Component content={{} as SiteContent} />)).not.toThrow();
    expect(() => render(<def.Component content={null as unknown as SiteContent} />)).not.toThrow();
  });
});
