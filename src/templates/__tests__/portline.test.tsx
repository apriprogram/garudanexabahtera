// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/portline.test.tsx
// Portline (company profile berbahasa Inggris untuk grup pelayaran & logistik, 2026-10-27): skema CMS & konten demo,
// helper model (warna tema, bahasa teks bawaan, menu, slide, tanggal, tagar & mosaik, formulir enquiry → WhatsApp/email,
// tujuan tautan, ikon & simbol otomatis), demo (urutan section, lang="en", header dua lapis, hero slider berindeks,
// newsroom bertagar + panel baca, liputan, angka, perusahaan grup → formulir dengan unit terpilih, armada melebar,
// jaringan, keberlanjutan, karier, pimpinan, kontak + formulir, footer), bahasa Indonesia, konten opsional kosong,
// pratinjau CMS diam, editor CMS, data katalog (migrasi 032 + seed + gambar pratinjau), dan konten aneh.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionEditor } from '../../pages/account/cms/SectionEditor';
import { validateContent } from '../../pages/account/cms/validation';
import { TEMPLATES, resolveContent } from '../index';
import { SiteRenderer } from '../SiteRenderer';
import { langOf, uiCopy } from '../portline/copy';
import { iconKey } from '../portline/icons';
import {
  accentIsDark,
  displayDate,
  EMPTY_ENQUIRY,
  enquiryMailto,
  enquiryMessage,
  filterNews,
  glyphIndex,
  heroSlides,
  lines,
  mosaicCells,
  navItems,
  navTier,
  newsTags,
  PAGE_SECTIONS,
  parseStoryDate,
  portlineVars,
  readPortline,
  readUi,
  sectionShown,
  sectionTarget,
  specPair,
  storyTags,
  validateEnquiry,
  validPhone,
  wrapIndex,
  type EnquiryForm,
} from '../portline/model';
import { PORTLINE_PHOTOS } from '../portline/photos';
import { contrast, parseHex } from '../shared/utils';
import { isListField, type SiteContent } from '../types';

// Demo panjang (11 section) + getByRole di jsdom: bisa lewat 5 dtk saat suite berjalan paralel
vi.setConfig({ testTimeout: 30_000 });

const ROOT = process.cwd();
const def = TEMPLATES.portline;
const ORDER = ['hero', 'newsroom', 'press', 'stats', 'divisions', 'fleet', 'network', 'sustainability', 'careers', 'leadership', 'contact'];
const sectionKeys = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-tpl-section]')).map((s) => s.getAttribute('data-tpl-section'));
const section = (root: HTMLElement, key: string) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`)!;
const demo = (content: unknown = null, preview = false) => render(<SiteRenderer templateCode="portline" content={content} preview={preview} />).container;
const rgb = (hex: string) => parseHex(hex)!;
const publicFile = (url: string) => resolve(ROOT, 'public', url.replace(/^\//, ''));
const urls = (src: string) => {
  const asset = PORTLINE_PHOTOS.asset(src)!;
  return [asset.src, ...asset.srcSet!.split(',').map((part) => part.trim().split(' ')[0])].filter((u, i, all) => all.indexOf(u) === i);
};
const linkList = (root: Element) => Array.from(root.querySelectorAll('a')).map((a) => `${a.textContent}|${a.getAttribute('href')}`);
const form = (over: Partial<EnquiryForm> = {}): EnquiryForm => ({ ...EMPTY_ENQUIRY, ...over });

let scrolled: (string | null)[] = [];
beforeEach(() => {
  scrolled = [];
  Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
    scrolled.push(this.getAttribute('data-tpl-section'));
  });
});
afterEach(cleanup);

describe('Portline: skema & konten bawaan', () => {
  it('urutan form = urutan halaman, semua section bisa disembunyikan, field unik, list berbatas, label CMS berbahasa Indonesia', () => {
    expect(def.code).toBe('portline');
    expect(def.name).toBe('Portline');
    // `enquiry` = label & pesan formulir di dalam section Kontak (bukan section halaman sendiri)
    expect(def.sections.map((s) => s.key)).toEqual(['brand', ...ORDER, 'enquiry', 'footer']);
    expect([...PAGE_SECTIONS]).toEqual([...ORDER, 'footer']);
    const fields = (key: string) => def.sections.find((s) => s.key === key)!.fields.map((f) => f.key);
    expect(fields('brand')).toEqual(['company_name', 'tagline', 'logo', 'accent_color', 'language']);
    expect(fields('hero')).toEqual(
      expect.arrayContaining(['utility_1_label', 'utility_2_label', 'utility_2_url', 'lang_current', 'lang_other', 'lang_other_url', 'title', 'image', 'slides', 'companies', 'service_label']),
    );
    expect(fields('contact')).toEqual(
      expect.arrayContaining(['address', 'phone', 'email', 'whatsapp', 'hours', 'enquiry_types', 'offices', 'form_button', 'headquarters_label', 'phone_label', 'email_label', 'hours_label', 'map_label', 'offices_title']),
    );
    // Semua teks formulir yang tampil punya field CMS (bawaan Inggris di konten demo)
    expect(fields('enquiry')).toEqual(Object.keys(def.defaultContent.enquiry));
    expect(fields('footer')).toEqual(expect.arrayContaining(['col_company', 'col_group', 'col_fleet', 'col_careers', 'col_media', 'col_contact']));
    expect(fields('newsroom')).toEqual(expect.arrayContaining(['menu_label', 'all_label', 'read_label']));
    expect(fields('fleet')).toEqual(expect.arrayContaining(['menu_label', 'specs_label']));
    for (const s of def.sections) {
      const keys = s.fields.map((f) => f.key);
      expect(new Set(keys).size, s.key).toBe(keys.length);
      for (const f of s.fields) if (isListField(f)) expect(f.max, `${s.key}.${f.key}`).toBeGreaterThan(0);
      expect(def.defaultContent[s.key], s.key).toBeTypeOf('object');
      expect(s.introduced).toBeUndefined();
      if (s.key !== 'brand' && s.key !== 'enquiry') expect(s.toggleable, s.key).toBe(true);
    }
    // Bagian non-halaman tanpa sakelar tampil & tanpa `enabled`
    expect(def.sections.find((s) => s.key === 'enquiry')!.toggleable).toBeFalsy();
    expect(def.defaultContent.enquiry.enabled).toBeUndefined();
    // Panel CMS untuk pembeli Indonesia: label & bantuan berbahasa Indonesia (placeholder boleh contoh Inggris)
    const labels = def.sections.flatMap((s) => [s.label, ...s.fields.flatMap((f) => [f.label, ...(isListField(f) ? f.fields.map((x) => x.label) : [])])]).join(' ');
    for (const label of ['Judul', 'Foto', 'Nama perusahaan', 'Warna tema', 'Bahasa situs', 'Label isian: email', 'Pesan galat: nama', 'Nama di menu']) expect(labels).toContain(label);
    expect(labels).not.toMatch(/\b(Title|Description|Photo|Company name)\b/);
    const slides = def.sections.find((s) => s.key === 'hero')!.fields.find((f) => f.key === 'slides');
    expect(slides && isListField(slides) ? slides.max : 0).toBe(3);
  });

  it('konten demo lolos validasi CMS, logo bawaan kosong, semua foto terdaftar, ada di public/, dipakai, dan tercatat di CREDITS.md', () => {
    const c = def.defaultContent;
    expect(validateContent(def, resolveContent(def, null))).toEqual({});
    expect(c.brand.logo).toBe('');
    expect(c.brand.accent_color).toBe('#1565C0');
    expect(c.brand.language).toBe('en');
    expect(c.hero.image).toBe('/assets/templates/photos/portline-hero-1-1920.webp');
    const photos = JSON.stringify(c).match(/\/assets\/templates\/photos\/[a-z0-9-]+\.webp/g) ?? [];
    expect(photos.length).toBeGreaterThanOrEqual(20);
    for (const src of photos) expect(PORTLINE_PHOTOS.asset(src), src).not.toBeNull();
    const credits = readFileSync(resolve(ROOT, 'public/assets/templates/photos/CREDITS.md'), 'utf8');
    expect(credits).toContain('## Portline (Quaymoor Group, fiktif)');
    // Nama fotografer sudah diverifikasi sesi integrasi
    expect(credits.slice(credits.indexOf('## Portline'))).not.toContain('(verifikasi)');
    for (const key of PORTLINE_PHOTOS.keys) {
      for (const url of urls(PORTLINE_PHOTOS.src(key))) expect(existsSync(publicFile(url)), url).toBe(true);
      expect(credits, key).toContain(`\`${key}-*\``);
      expect(photos, `${key} dipakai di konten demo`).toContain(PORTLINE_PHOTOS.src(key));
    }
    // Simbol bawaan juga tersedia sebagai SVG mandiri, path sama dengan komponen
    const mark = readFileSync(publicFile('/assets/templates/logos/portline-mark.svg'), 'utf8');
    const component = readFileSync(resolve(ROOT, 'src/templates/portline/marks.tsx'), 'utf8');
    const paths = mark.match(/ d="[^"]+"/g) ?? [];
    expect(paths.length).toBeGreaterThanOrEqual(3);
    for (const d of paths) expect(component, d).toContain(d.trim());
  });

  it('foto demo ringan: slide hero 800/1280/1920, WebP ≤ 220 KB per file, total ≤ 3,5 MB', () => {
    expect(PORTLINE_PHOTOS.asset(def.defaultContent.hero.image as string)!.srcSet).toBe(
      '/assets/templates/photos/portline-hero-1-800.webp 800w, /assets/templates/photos/portline-hero-1-1280.webp 1280w, /assets/templates/photos/portline-hero-1-1920.webp 1920w',
    );
    let total = 0;
    for (const key of PORTLINE_PHOTOS.keys) {
      for (const url of urls(PORTLINE_PHOTOS.src(key))) {
        expect(url, url).toMatch(/\.webp$/);
        const kb = statSync(publicFile(url)).size / 1024;
        expect(kb, url).toBeLessThanOrEqual(220);
        total += kb;
      }
    }
    expect(total).toBeLessThanOrEqual(3500);
  });

  it('salinan demo jujur & fiktif: berbahasa Inggris, tanpa merek nyata, klaim regulator/sertifikasi, atau janji emisi', () => {
    const c = def.defaultContent;
    const text = JSON.stringify(c);
    // Perusahaan demo = nama gabungan fiktif; "Portline" hanya nama template (ada perusahaan pelayaran nyata bernama
    // Portline di Lisbon), jadi tidak dipakai di salinan demo
    expect(text).toMatch(/Quaymoor Group/);
    expect(text).not.toMatch(/\bPortline\b/);
    expect(text).not.toMatch(/\b(Maersk|MSC|COSCO|Evergreen|Hapag|CMA CGM|Yang Ming|ONE Line|DP World|PSA|Hanjin|HANJIN|K ?LINE|K ?Line|Tidewater|Northwind|Lisbon)\b/);
    expect(text).not.toMatch(/ISO \d+|IMO approved|NYSE|listed on|certified|guaranteed|zero[- ]emission|carbon[- ]neutral|net[- ]zero|100% safe/i);
    // Komitmen keberlanjutan ditulis sebagai program, bukan hasil terukur
    expect(text).not.toMatch(/\d+\s?% (less|lower|reduction)/i);
    // Data kontak demo jelas fiktif: email domain .example, telepon & WhatsApp blok 555, media sosial berakhiran -demo
    expect(c.contact.email).toMatch(/\.example$/);
    expect(c.careers.email).toMatch(/\.example$/);
    // Semua alamat email di salinan demo & teks cadangan (termasuk contoh di pesan galat) memakai domain .example
    const emails = [text, JSON.stringify(uiCopy('en').form.errors), JSON.stringify(uiCopy('id').form.errors)].join(' ').match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) ?? [];
    expect(emails.length).toBeGreaterThan(3);
    for (const email of emails) expect(email, email).toMatch(/\.example$/);
    const phones = [c.contact.phone as string, c.contact.whatsapp as string, ...(c.contact.offices as Record<string, string>[]).map((o) => o.phone)];
    for (const phone of phones) expect(phone.replace(/\D/g, ''), phone).toMatch(/555/);
    for (const key of ['instagram', 'facebook', 'linkedin', 'youtube', 'tiktok']) {
      const url = c.footer[key] as string;
      if (url) expect(url, key).toMatch(/-demo\/?$/);
    }
    for (const leader of c.leadership.items as Record<string, string>[]) expect(leader.linkedin, leader.name).toBe('');
    // Kontrol hanya menjanjikan aksi yang benar-benar dilakukan: tanpa "Track a shipment"/"View detail" di demo
    expect(text).not.toMatch(/Track a shipment|View detail/);
  });
});

describe('Portline: helper model', () => {
  it('warna tema: navy judul (putih ≥ 12:1), pita biru (putih ≥ 6,5:1), versi terang ≥ 5:1 di navy, tinta ≥ 5:1 di putih & ≥ 4,6:1 di es', () => {
    const white = rgb('#ffffff');
    const defaults = portlineVars('#1565C0') as Record<string, string>;
    expect(defaults['--pl-deep']).toBe('#0a2a4f');
    expect(defaults['--pl-ice']).toBe('#eaf1f9');
    for (const accent of ['#1565C0', '#047857', '#FACC15', '#B91C1C', '#0E1A1C', '#7DD3FC', '#211FFE', '#0E7490', '#7C3AED', '#FF00FF', '#FFFFFF']) {
      const v = portlineVars(accent) as Record<string, string>;
      const deep = rgb(v['--pl-deep']);
      expect(contrast(deep, white), `${accent} deep`).toBeGreaterThanOrEqual(12);
      expect(contrast(rgb(v['--pl-deep-2']), white), `${accent} deep-2`).toBeGreaterThanOrEqual(9);
      expect(contrast(rgb(v['--pl-band']), white), `${accent} band`).toBeGreaterThanOrEqual(6.5);
      expect(contrast(rgb(v['--pl-bright']), deep), `${accent} bright`).toBeGreaterThanOrEqual(5);
      expect(contrast(rgb(v['--pl-ink']), white), `${accent} ink`).toBeGreaterThanOrEqual(5);
      expect(contrast(rgb(v['--pl-ink']), rgb(v['--pl-ice'])), `${accent} ink/ice`).toBeGreaterThanOrEqual(4.6);
    }
    expect(portlineVars('bukan warna')).toEqual(portlineVars('#1565C0'));
    expect(accentIsDark('#1565C0')).toBe(true);
    expect(accentIsDark('#FACC15')).toBe(false);
  });

  it('bahasa teks bawaan: "id" → Indonesia, lainnya → Inggris; teks antarmuka lengkap di kedua bahasa', () => {
    expect(langOf('id')).toBe('id');
    expect(langOf(' ID ')).toBe('id');
    expect(langOf('en')).toBe('en');
    expect(langOf('')).toBe('en');
    expect(langOf('fr')).toBe('en');
    const keys = (o: object): string[] => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v).map((x) => `${k}.${x}`) : [k]));
    expect(keys(uiCopy('id')).sort()).toEqual(keys(uiCopy('en')).sort());
    expect(uiCopy('en').form.submit).toBe('Prepare message');
    expect(uiCopy('id').form.submit).toBe('Susun pesan');
  });

  it('menu: section yang tampil, "Nama di menu" dari CMS, lalu label section yang singkat, lalu cadangan sesuai bahasa', () => {
    const content = resolveContent(def, null);
    expect(navItems(content).map((n) => `${n.key}:${n.label}`)).toEqual([
      'newsroom:Newsroom',
      'divisions:Group',
      'fleet:Fleet',
      'network:Network',
      'sustainability:Sustainability',
      'careers:Careers',
      'contact:Contact',
    ]);
    const id = resolveContent(def, {
      brand: { language: 'id' },
      divisions: { menu_label: '' },
      fleet: { menu_label: '', eyebrow: '' },
      network: { menu_label: '' },
      careers: { enabled: false },
    });
    expect(navItems(id).map((n) => n.label)).toEqual(['Newsroom', 'Grup', 'Armada', 'Global network', 'Sustainability', 'Contact']);
    expect(sectionShown(resolveContent(def, { fleet: { items: [] } }), 'fleet')).toBe(false);
    expect(sectionShown(content, 'tidak-ada')).toBe(false);
  });

  it('menu atas lengkap hanya bila muat: label & nama perusahaan panjang → ambang lebih lebar atau tombol menu', () => {
    const nav = (labels: string[]) => labels.map((label, i) => ({ key: `k${i}`, label }));
    const defaults = navItems(resolveContent(def, null));
    expect(navTier(defaults, 'Quaymoor Group')).toBe('6xl');
    expect(navTier([], 'Quaymoor Group')).toBe('6xl');
    // 7 label 14 huruf (batas label section) → tidak muat satu baris di 1536px → selalu tombol menu
    expect(navTier(nav(Array(7).fill('Latest updates')), 'Quaymoor Group')).toBe('none');
    expect(navTier(nav(Array(7).fill('Our vessels')), 'Quaymoor Group')).toBe('96rem');
    // Nama perusahaan panjang ikut dihitung (nama dipotong setelah ± 320px)
    const seven = nav(['Newsroom', 'Group', 'Fleet', 'Global network', 'Sustainability', 'Careers', 'Contact']);
    expect(navTier(seven, 'Quaymoor Group')).toBe('6xl');
    expect(navTier(seven, 'Quaymoor International Shipping Holdings Group')).toBe('7xl');
    expect(readPortline(resolveContent(def, { fleet: { menu_label: 'Vessel classes' }, network: { menu_label: 'Where we work' }, careers: { menu_label: 'Join our crews' } })).navTier).not.toBe('6xl');
  });

  it('slide hero: slide 1 = isi hero, tambahan hanya yang berfoto (maks. 3), teks kosong ikut slide 1; indeks berputar', () => {
    const hero = def.defaultContent.hero;
    expect(heroSlides(hero, 'X').map((s) => s.label)).toEqual(['Ocean freight', 'Terminals', 'Logistics']);
    const slides = heroSlides({ title: 'A', subtitle: 'B', slides: [{ title: 'tanpa foto' }, { image: '/x.webp' }, { image: '/y.webp' }, { image: '/z.webp' }, { image: '/w.webp' }] }, 'X');
    expect(slides).toHaveLength(4);
    expect(slides[1]).toEqual({ image: '/x.webp', label: '', title: 'A', subtitle: 'B' });
    expect(heroSlides({}, 'Nama')[0].title).toBe('Nama');
    expect(wrapIndex(3, 3)).toBe(0);
    expect(wrapIndex(-1, 3)).toBe(2);
    expect(wrapIndex(1, 0)).toBe(0);
  });

  it('tanggal: ISO valid → "14 Oct 2026" / "14 Okt 2026", teks bebas apa adanya, tanggal mustahil → teks', () => {
    expect(parseStoryDate('2026-10-14')).toEqual({ iso: '2026-10-14', label: '14 Oct 2026' });
    expect(parseStoryDate('2026-10-14', 'id')!.label).toBe('14 Okt 2026');
    expect(parseStoryDate('2026-02-30')).toBeNull();
    expect(displayDate('Autumn 2026')).toBe('Autumn 2026');
    expect(displayDate('2026-13-01')).toBe('2026-13-01');
    expect(displayDate(null)).toBe('');
  });

  it('tagar & mosaik: tagar unik tanpa beda huruf besar, filter benar-benar menyaring (maks. 5), sel mosaik tanpa celah', () => {
    expect(storyTags('Lines, #Terminals, lines;Energy')).toEqual(['Lines', 'Terminals', 'Energy']);
    const items = [{ title: 'A', tags: 'Lines' }, { title: 'B', tags: 'Energy, lines' }, { title: 'C', tags: 'Terminals' }];
    expect(newsTags(items)).toEqual(['Lines', 'Energy', 'Terminals']);
    expect(filterNews(items, 'LINES').map((i) => i.title)).toEqual(['A', 'B']);
    expect(filterNews(items, 'tidak-ada').map((i) => i.title)).toEqual(['A', 'B', 'C']);
    expect(filterNews(Array.from({ length: 8 }, (_, i) => ({ title: String(i) })), null)).toHaveLength(5);
    // Grid 12 kolom × 2 baris terisi penuh untuk 1–5 ubin
    for (let n = 1; n <= 5; n += 1) {
      const cells = mosaicCells(n);
      expect(cells).toHaveLength(n);
      const area = cells.reduce((sum, [cls]) => sum + Number(/col-span-(\d+)/.exec(cls)![1]) * (/row-span-2/.test(cls) ? 2 : 1), 0);
      expect(area, `${n} ubin`).toBe(24);
    }
    expect(mosaicCells(0)).toEqual([]);
  });

  it('formulir enquiry: validasi per isian, pesan baris per isian, mailto bersubjek; isian opsional kosong tidak ikut', () => {
    const types = ['Freight quote', 'Media'];
    expect(validateEnquiry(form(), types)).toEqual({
      name: 'Please enter your full name.',
      email: 'Please enter a valid email address, e.g. name@company.example.',
      type: 'Please choose an enquiry type.',
      message: 'Please write a short message (at least 10 characters).',
    });
    expect(validateEnquiry(form(), [], uiCopy('id').form.errors).name).toBe('Tulis nama lengkap Anda.');
    expect(validateEnquiry(form(), []).type).toBeUndefined();
    const ok = form({ name: 'Rina Hartono', email: 'rina@contoh.co.id', type: 'Freight quote', message: 'Two 40ft reefers Jakarta to Rotterdam in March.' });
    expect(validateEnquiry(ok, types)).toEqual({});
    expect(validateEnquiry({ ...ok, phone: 'abc' }, types).phone).toBeTruthy();
    expect(validPhone('+31 10 555 0140')).toBe(true);
    expect(validPhone('12')).toBe(false);
    // Baris pesan memakai label isian formulir (dari CMS)
    const message = enquiryMessage('Quaymoor Group', { ...ok, unit: 'Quaymoor Terminals' });
    expect(message.split('\n')).toEqual([
      'Hello Quaymoor Group, I would like to make an enquiry.',
      'Full name: Rina Hartono',
      'Work email: rina@contoh.co.id',
      'Enquiry type: Freight quote',
      'Business unit: Quaymoor Terminals',
      'Message: Two 40ft reefers Jakarta to Rotterdam in March.',
      'Thank you.',
    ]);
    expect(enquiryMessage('PT Uji', ok, uiCopy('id').form).split('\n')[0]).toBe('Halo PT Uji, saya ingin bertanya.');
    expect(enquiryMailto('enquiries@quaymoor.example', 'Freight quote – Quaymoor Group', 'Hi\nthere')).toBe(
      'mailto:enquiries@quaymoor.example?subject=Freight%20quote%20%E2%80%93%20Quaymoor%20Group&body=Hi%0Athere',
    );
    expect(enquiryMailto('bukan email', 'a', 'b')).toBe('');
  });

  it('teks antarmuka dari CMS (readUi): bawaan Inggris, isian CMS menang, isian kosong → cadangan sesuai bahasa situs', () => {
    const ui = readUi(resolveContent(def, null));
    expect([ui.headquarters, ui.call, ui.viewMap, ui.offices, ui.readStory, ui.specs, ui.footerCareers]).toEqual([
      'Headquarters',
      'Call',
      'View on map',
      'Regional offices',
      'Read story',
      'Key figures',
      'Careers',
    ]);
    expect(ui.form.email).toBe('Work email');
    const custom = readUi(
      resolveContent(def, {
        contact: { headquarters_label: 'Head office', form_button: 'Kirim' },
        enquiry: { label_email: 'Email', error_name: 'Isi nama.', greeting: 'Halo tim {company}!', closing: 'Salam.', subject: 'Pertanyaan' },
        footer: { col_media: 'Press', col_fleet: 'Vessels' },
      }),
    );
    expect([custom.headquarters, custom.form.submit, custom.form.email, custom.form.errors.name, custom.footerMedia, custom.footerFleet]).toEqual([
      'Head office',
      'Kirim',
      'Email',
      'Isi nama.',
      'Press',
      'Vessels',
    ]);
    expect(custom.form.greeting('Quaymoor Group')).toBe('Halo tim Quaymoor Group!');
    expect(custom.form.subject('', 'Quaymoor Group')).toBe('Pertanyaan – Quaymoor Group');
    expect(custom.form.subject('Media', 'Quaymoor Group')).toBe('Media – Quaymoor Group');
    expect(enquiryMessage('Quaymoor Group', form({ name: 'Rina', email: 'r@x.co', message: 'Halo semuanya' }), custom.form).split('\n')).toEqual([
      'Halo tim Quaymoor Group!',
      'Full name: Rina',
      'Email: r@x.co',
      'Message: Halo semuanya',
      'Salam.',
    ]);
    const emptied = readUi(resolveContent(def, { brand: { language: 'id' }, contact: { headquarters_label: '' }, enquiry: { label_name: '', note: '' }, footer: { col_company: '', col_group: '', col_fleet: '' } }));
    expect([emptied.headquarters, emptied.form.name, emptied.form.privacy, emptied.footerCompany, emptied.footerGroup, emptied.footerFleet]).toEqual([
      'Kantor pusat',
      'Nama lengkap',
      uiCopy('id').form.privacy,
      'Perusahaan',
      'Perusahaan grup',
      'Armada',
    ]);
    // Isian lain tetap dari CMS (bawaan Inggris) walau bahasa situs "id"
    expect(emptied.form.email).toBe('Work email');
  });

  it('tujuan "#…", ikon & simbol otomatis, data utama armada', () => {
    expect(sectionTarget('#berita')).toBe('newsroom');
    expect(sectionTarget('kontak')).toBe('contact');
    expect(sectionTarget('#armada')).toBe('fleet');
    expect(sectionTarget('#karier')).toBe('careers');
    expect(sectionTarget('#about')).toBe('divisions');
    expect(sectionTarget('#tidak-ada')).toBeNull();
    expect(iconKey('Vessels in operation')).toBe('ship');
    expect(iconKey('Container & bulk terminals')).toBe('terminal');
    expect(iconKey('Countries served')).toBe('globe');
    expect(iconKey('Employees worldwide')).toBe('people');
    expect(iconKey('Quaymoor Air & Road')).toBe('air');
    expect(iconKey('Quaymoor Shipyards')).toBe('yard');
    expect(iconKey('Track a shipment')).toBe('search');
    expect(iconKey('Shipment enquiry')).toBe('message');
    expect(iconKey('Short-sea feeder')).toBe('ship');
    expect(iconKey('Hopper dredger')).toBe('ship');
    expect(['Quaymoor Container Lines', 'Quaymoor Terminals', 'Quaymoor Energy Shipping', 'Quaymoor Air & Road', 'Quaymoor Shipyards'].map((n, i) => glyphIndex(n, i))).toEqual([0, 1, 2, 3, 4]);
    expect(specPair('Length overall: 366 m')).toEqual(['Length overall', '366 m']);
    expect(specPair('Ice class')).toEqual(['', 'Ice class']);
    expect(lines('a\n\n b \r\nc')).toEqual(['a', 'b', 'c']);
  });
});

describe('Portline: demo', () => {
  it('urutan section, satu h1, lang="en", hero slider harbor selebar layar, header dua lapis', () => {
    const container = demo();
    // data-tpl-section="enquiry" = formulir di dalam Kontak (panel CMS menggulir ke sana)
    expect(sectionKeys(container)).toEqual([...ORDER, 'enquiry', 'footer']);
    expect(section(container, 'enquiry').closest('[data-tpl-section="contact"]')).not.toBeNull();
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelector('[lang="en"]')).not.toBeNull();
    const hero = section(container, 'hero');
    expect(hero.getAttribute('data-hero-layout')).toBe('harbor');
    expect(hero.getAttribute('data-tpl-tone')).toBe('inverse');
    expect(hero.querySelector('h1')!.textContent).toBe('Connecting world trade, port by port');
    expect(hero.querySelector('h1')!.className).toContain('uppercase');
    const img = hero.querySelector<HTMLImageElement>('img[fetchpriority="high"]')!;
    expect(img.getAttribute('src')).toBe('/assets/templates/photos/portline-hero-1-1920.webp');
    expect(img.getAttribute('loading')).toBe('eager');
    expect(img.getAttribute('alt')).toMatch(/Container ship/);
    expect(container.querySelectorAll('img[fetchpriority="high"]')).toHaveLength(1);
    // Foto selebar layar: bukan di dalam CONTAINER / bingkai membulat
    const slide = hero.querySelector<HTMLElement>('.pl-slide')!;
    expect(slide.parentElement!.className).not.toMatch(/rounded|max-w-|mx-auto|px-/);
    // Tautan "About Quaymoor": satu di atas foto (layar lebar) dan satu di bawah foto (HP), salah satunya display:none
    const about = within(hero).getAllByRole('link', { name: /About Quaymoor/ });
    expect(about).toHaveLength(2);
    for (const link of about) expect(link).toHaveAttribute('href', '#divisions');
    expect(about[0].closest('.hidden')).not.toBeNull();
    expect(about[1].closest('[class*="@3xl:hidden"]')).not.toBeNull();
    // Deret perusahaan grup + label layanan di dalam hero
    expect(within(hero).getAllByRole('list', { name: 'Group companies' }).length).toBeGreaterThan(0);
    expect(hero.textContent).toContain('Energy Shipping');
    expect(within(hero).getByRole('link', { name: /Liner, bulk & tanker services/ })).toHaveAttribute('href', '#fleet');

    const header = container.querySelector('header')!;
    expect(header.className).toContain('h-0');
    expect(header.className).toContain('sticky');
    expect(header.firstElementChild!.getAttribute('data-tpl-tone')).toBe('inverse');
    // Bilah utilitas: dua tombol biru pejal; pilihan bahasa tersembunyi selama versi bahasa lain belum punya tautan
    expect(within(header).getByRole('link', { name: 'Container Lines' })).toHaveAttribute('href', '#divisions');
    expect(within(header).getByRole('link', { name: 'Shipment enquiry' })).toHaveAttribute('href', '#kontak');
    expect(within(header).queryByRole('group', { name: 'Language' })).toBeNull();
    const nav = within(header).getAllByRole('navigation', { name: 'Menu utama' })[0];
    expect(linkList(nav)).toEqual([
      'Newsroom|#newsroom',
      'Group|#divisions',
      'Fleet|#fleet',
      'Network|#network',
      'Sustainability|#sustainability',
      'Careers|#careers',
      'Contact|#kontak',
    ]);
    expect(nav.className).toContain('@6xl:block');
    expect(nav.querySelector('a')!.className).toContain('uppercase');
    expect(header.querySelector('svg[viewBox="0 0 32 32"]'), 'PortlineMark').not.toBeNull();
    fireEvent.click(within(nav).getByRole('link', { name: 'Fleet' }));
    expect(scrolled).toEqual(['fleet']);
  });

  it('menu atas: label menu panjang → menu lengkap baru tampil di wadah lebih lebar (nama perusahaan tidak terpotong)', () => {
    const long = { menu_label: '' };
    const header = demo({
      newsroom: { menu_label: 'Latest updates' },
      divisions: { menu_label: 'Our companies' },
      fleet: { menu_label: 'Vessel classes' },
      network: { menu_label: 'Where we work' },
      sustainability: long,
      careers: { menu_label: 'Join our crews' },
      contact: { menu_label: 'Get in touch' },
    }).querySelector('header')!;
    const nav = within(header).getAllByRole('navigation', { name: 'Menu utama' })[0];
    expect(nav.className).not.toContain('@6xl:block');
    expect(within(header).getByRole('button', { name: 'Buka menu' }).className).not.toContain('@6xl:hidden');
  });

  it('pilihan bahasa "EN | ID" hanya tampil bila versi bahasa lain punya tautan; dikosongkan → disembunyikan', () => {
    const header = demo({ hero: { lang_other_url: 'https://id.contoh.co.id' } }).querySelector('header')!;
    const langGroup = within(header).getByRole('group', { name: 'Language' });
    expect(within(langGroup).getByText('EN')).toHaveAttribute('aria-current', 'true');
    expect(within(header).getByRole('link', { name: 'ID' })).toHaveAttribute('href', 'https://id.contoh.co.id');
    cleanup();
    expect(demo({ hero: { lang_current: '', lang_other_url: 'https://id.contoh.co.id' } }).querySelector('[role="group"][aria-label="Language"]')).toBeNull();
  });

  it('menu HP: tombol buka/tutup (aria-expanded), tombol utilitas di panel, Esc menutup dan fokus kembali', () => {
    const header = demo().querySelector('header')!;
    const toggle = within(header).getByRole('button', { name: 'Buka menu' });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const panel = document.getElementById(toggle.getAttribute('aria-controls')!)!;
    expect(within(panel).getAllByRole('link').map((a) => a.textContent)).toEqual([
      'Newsroom',
      'Group',
      'Fleet',
      'Network',
      'Sustainability',
      'Careers',
      'Contact',
      'Container Lines',
      'Shipment enquiry',
    ]);
    // Panel dibuka: header langsung putih tanpa transisi (tautan navy tidak sempat tampil di atas foto gelap)
    expect(header.firstElementChild!.className).toContain('duration-0');
    expect(header.firstElementChild!.className).toContain('bg-white');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
  });

  it('hero slider: indeks 01/02/03 berlabel, klik & panah keyboard ganti slide, H1 tetap, tombol jeda, berhenti saat disorot', () => {
    const hero = section(demo(), 'hero');
    expect(hero.getAttribute('aria-roledescription')).toBe('carousel');
    const controls = within(hero).getByRole('group', { name: 'Slide controls' });
    const buttons = within(controls).getAllByRole('button', { name: /^Slide \d of 3/ });
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual(['Slide 1 of 3: Ocean freight', 'Slide 2 of 3: Terminals', 'Slide 3 of 3: Logistics']);
    expect(buttons[0]).toHaveAttribute('aria-current', 'true');
    const status = () => hero.querySelector('[aria-atomic="true"]')!.textContent;
    const shownTitle = () => hero.querySelector('[data-enter] .pl-rise, [data-enter] h1, [data-enter] p')!.textContent;
    fireEvent.click(buttons[1]);
    expect(status()).toBe('Slide 2 of 3: Terminals that keep cargo moving');
    expect(shownTitle()).toBe('Terminals that keep cargo moving');
    // H1 halaman tetap judul slide 1 (tidak berganti tiap slide), satu-satunya H1
    expect(hero.querySelector('h1')!.textContent).toBe('Connecting world trade, port by port');
    expect(hero.querySelectorAll('h1')).toHaveLength(1);
    expect(buttons[1]).toHaveAttribute('aria-current', 'true');
    fireEvent.keyDown(controls, { key: 'ArrowDown' });
    expect(status()).toBe('Slide 3 of 3: Day and night, from quay to door');
    fireEvent.keyDown(controls, { key: 'ArrowDown' });
    expect(status()).toBe('Slide 1 of 3: Connecting world trade, port by port');
    expect(shownTitle()).toBe('Connecting world trade, port by port');
    // Zoom pelan & teks naik hanya setelah pergantian (slide pertama saat dimuat tidak dianimasikan)
    expect(hero.querySelector('[data-enter="true"]')).not.toBeNull();
    const progress = hero.querySelector('.pl-progress-y')!;
    expect(progress).toHaveAttribute('data-run', 'true');
    fireEvent.mouseEnter(hero);
    expect(hero.querySelector('.pl-progress-y')).toHaveAttribute('data-hold', 'true');
    fireEvent.mouseLeave(hero);
    fireEvent.click(within(controls).getByRole('button', { name: 'Pause slideshow' }));
    expect(hero.querySelector('.pl-progress-y')).toHaveAttribute('data-run', 'false');
    expect(within(controls).getByRole('button', { name: 'Play slideshow' })).toBeInTheDocument();
    // Garis berjalan selesai → slide berikutnya
    fireEvent.click(within(controls).getByRole('button', { name: 'Play slideshow' }));
    const ended = (el: Element) => {
      const before = status();
      fireEvent.animationEnd(el);
      // jsdom tanpa AnimationEvent: React mendengarkan nama berawalan webkit
      if (status() === before) fireEvent(el, new Event('webkitAnimationEnd', { bubbles: true }));
    };
    ended(hero.querySelector('.pl-progress-y')!);
    expect(status()).toBe('Slide 2 of 3: Terminals that keep cargo moving');
    // HP, tablet & laptop kecil (< @6xl): garis tegak display:none, garis MENDATAR yang berjalan juga memajukan slide
    ended(hero.querySelector('.pl-progress-x')!);
    expect(status()).toBe('Slide 3 of 3: Day and night, from quay to door');
  });

  it('LCP aman: foto & teks slide pertama tidak dianimasikan masuk', () => {
    const hero = section(demo(), 'hero');
    expect(hero.querySelector('.pl-slide')!.hasAttribute('data-zoom')).toBe(false);
    expect(hero.querySelector('[data-enter="true"]')).toBeNull();
  });

  it('newsroom: tagar menyaring (aria-pressed), ubin unggulan, "Read story" membuka panel baca, tutup mengembalikan fokus', async () => {
    const news = section(demo(), 'newsroom');
    const filters = within(news).getByRole('group', { name: 'Filter stories by topic' });
    expect(within(filters).getAllByRole('button').map((b) => b.textContent)).toEqual(['#All', '#Lines', '#Energy', '#Terminals', '#Logistics']);
    expect(news.querySelectorAll('article')).toHaveLength(5);
    expect(news.querySelector('article')!.textContent).toContain('Read story');
    fireEvent.click(within(filters).getByRole('button', { name: '#Lines' }));
    expect(within(filters).getByRole('button', { name: '#Lines' })).toHaveAttribute('aria-pressed', 'true');
    expect(Array.from(news.querySelectorAll('article h3')).map((h) => h.textContent)).toEqual([
      'Quaymoor Meridian joins the Asia–Europe loop',
      'Fleet operations centre opens in Rotterdam',
    ]);
    const read = within(news).getByRole('button', { name: 'Fleet operations centre opens in Rotterdam' });
    expect(read).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(read);
    const reader = within(news).getByRole('region', { name: /Story: Fleet operations centre/ });
    expect(reader.textContent).toContain('Captains can reach a duty planner at any hour');
    expect(within(reader).getByRole('heading', { level: 3 })).toHaveFocus();
    fireEvent.click(within(reader).getByRole('button', { name: 'Close story' }));
    expect(within(news).queryByRole('region')).toBeNull();
    await waitFor(() => expect(within(news).getByRole('button', { name: 'Fleet operations centre opens in Rotterdam' })).toHaveFocus());
    // Tautan berita diisi → "Read story" membuka tautan, bukan panel
    cleanup();
    const linked = section(demo({ newsroom: { items: [{ title: 'Kabar', body: 'Isi', url: 'https://contoh.co.id/kabar' }] } }), 'newsroom');
    expect(within(linked).getByRole('link', { name: 'Kabar' })).toHaveAttribute('href', 'https://contoh.co.id/kabar');
  });

  it('liputan media, angka berikon, perusahaan grup → formulir dengan unit bisnis terpilih', () => {
    const container = demo();
    const press = section(container, 'press');
    expect(within(press).getByRole('list', { name: 'Press coverage' }).querySelectorAll('li')).toHaveLength(4);
    expect(press.textContent).toContain('Harbour Ledger');
    expect(press.querySelector('time')).toHaveAttribute('dateTime', '2026-10-16');
    const stats = section(container, 'stats');
    expect(Array.from(stats.querySelectorAll('dt')).map((d) => d.textContent)).toEqual(['Vessels in operation', 'Container & bulk terminals', 'Countries served', 'Employees worldwide']);
    expect(Array.from(stats.querySelectorAll('dd')).map((d) => d.textContent)).toEqual(['140+', '38', '90+', '21,000']);
    const divisions = section(container, 'divisions');
    expect(divisions.querySelectorAll('article')).toHaveLength(5);
    expect(divisions.textContent).toContain('One partner for the whole route?');
    // Tombol kartu tanpa tautan sendiri membuka formulir, jadi labelnya "Talk to this team" (bukan "View detail")
    fireEvent.click(within(divisions).getByRole('link', { name: 'Talk to this team: Quaymoor Terminals' }));
    expect(scrolled).toEqual(['contact']);
    expect(within(section(container, 'contact')).getByLabelText(/^Business unit/)).toHaveValue('Quaymoor Terminals');
    // "Shipment enquiry" tanpa tautan sendiri → formulir dengan topik status pengiriman (bukan pelacak)
    fireEvent.click(within(container.querySelector('header')!).getByRole('link', { name: 'Shipment enquiry' }));
    expect(within(section(container, 'contact')).getByLabelText(/^Enquiry type/)).toHaveValue('Shipment status');
  });

  it('armada: kartu aktif lebar + kartu sempit yang bisa diklik, tombol ← → berputar, data utama', () => {
    const fleet = section(demo(), 'fleet');
    const show = within(fleet).getAllByRole('button', { name: /^Show / });
    expect(show.map((b) => b.getAttribute('aria-label'))).toEqual(['Show Atlas class', 'Show Halcyon class', 'Show Coastline class']);
    const grow = () => Array.from(fleet.querySelectorAll<HTMLElement>('.pl-fleet-card')).map((c) => c.style.flexGrow);
    expect(grow()).toEqual(['5.2', '1', '1', '1']);
    const live = fleet.querySelector('[aria-live="polite"]')!;
    expect(live.textContent).toBe('Meridian class, Container ship');
    show[1].focus();
    fireEvent.click(show[1]);
    expect(grow()).toEqual(['1', '1', '5.2', '1']);
    // Tombol kartu sempit hilang saat melebar: fokus pindah ke judul kartu aktif (bukan jatuh ke body), perubahan diumumkan
    expect(document.activeElement!.tagName).toBe('H3');
    expect(document.activeElement!.textContent).toBe('Halcyon class');
    expect(fleet.contains(document.activeElement)).toBe(true);
    expect(live.textContent).toBe('Halcyon class, Product & LPG tanker');
    fireEvent.click(within(fleet).getByRole('button', { name: 'Next vessel class' }));
    expect(grow()).toEqual(['1', '1', '1', '5.2']);
    fireEvent.click(within(fleet).getByRole('button', { name: 'Next vessel class' }));
    expect(grow()).toEqual(['5.2', '1', '1', '1']);
    expect(fleet.textContent).toContain('Length overall');
    expect(fleet.textContent).toContain('15,000 TEU');
    // Rel HP: scroll-padding = gutter, kartu pertama sejajar judul (tidak menempel ke tepi layar)
    expect(fleet.querySelector('ul.pl-rail')!.className).toContain('scroll-px-5');
  });

  it('jaringan (kawasan buka-tutup + kartu kantor pusat), keberlanjutan, karier, pimpinan', () => {
    const container = demo();
    const network = section(container, 'network');
    const regions = within(network).getAllByRole('button', { expanded: false });
    expect(within(network).getByRole('button', { name: /Europe/, expanded: true })).toBeInTheDocument();
    fireEvent.click(regions[0]);
    expect(within(network).getByRole('button', { name: /Asia-Pacific/ })).toHaveAttribute('aria-expanded', 'true');
    expect(within(network).getByRole('button', { name: /Europe/ })).toHaveAttribute('aria-expanded', 'false');
    expect(network.textContent).toContain('Terminals on five continents');
    const sustain = section(container, 'sustainability');
    expect(sustain.getAttribute('data-tpl-tone')).toBe('inverse');
    expect(sustain.className).toContain('bg-(--pl-band)');
    expect(within(sustain).getByRole('heading', { level: 2 }).textContent).toMatch(/^Every voyage/);
    expect(sustain.querySelectorAll('ol > li')).toHaveLength(3);
    const careers = section(container, 'careers');
    expect(within(careers).getByRole('link', { name: 'Talk to recruitment' })).toHaveAttribute('href', '#kontak');
    expect(within(careers).getByRole('link', { name: /careers@quaymoor\.example/ })).toHaveAttribute('href', 'mailto:careers@quaymoor.example');
    fireEvent.click(within(careers).getByRole('link', { name: 'Talk to recruitment' }));
    expect(within(section(container, 'contact')).getByLabelText(/^Enquiry type/)).toHaveValue('Careers');
    const leaders = section(container, 'leadership');
    expect(Array.from(leaders.querySelectorAll('h3')).map((h) => h.textContent)).toEqual(['Maarten de Vries', 'Amara Okafor', 'Daniel Mensah', 'Sofia Lindqvist']);
    expect(within(leaders).queryByRole('link')).toBeNull();
  });

  it('formulir enquiry: galat per isian + fokus ke isian pertama, lalu pesan apa adanya ke WhatsApp & email; tanpa pengiriman data', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const contact = section(demo(), 'contact');
    const f = within(contact);
    fireEvent.click(f.getByRole('button', { name: 'Prepare message' }));
    expect(f.getByLabelText(/^Full name/)).toHaveFocus();
    expect(f.getByLabelText(/^Full name/)).toHaveAttribute('aria-invalid', 'true');
    expect(contact.textContent).toContain('Please enter a valid email address');
    expect(contact.textContent).toContain('Please choose an enquiry type.');
    fireEvent.change(f.getByLabelText(/^Full name/), { target: { value: 'Rina Hartono' } });
    fireEvent.change(f.getByLabelText(/^Company/), { target: { value: 'PT Kopi Nusantara' } });
    fireEvent.change(f.getByLabelText(/^Work email/), { target: { value: 'rina@kopinusantara.co.id' } });
    fireEvent.change(f.getByLabelText(/^Enquiry type/), { target: { value: 'Freight quote' } });
    fireEvent.change(f.getByLabelText(/^Message/), { target: { value: 'Two 40ft containers of coffee to Rotterdam in March.' } });
    fireEvent.click(f.getByRole('button', { name: 'Prepare message' }));
    await waitFor(() => expect(f.getByRole('heading', { name: 'Your message is ready' })).toHaveFocus());
    expect(contact.querySelector('pre')!.textContent).toBe(
      'Hello Quaymoor Group, I would like to make an enquiry.\nFull name: Rina Hartono\nCompany: PT Kopi Nusantara\nWork email: rina@kopinusantara.co.id\nEnquiry type: Freight quote\nMessage: Two 40ft containers of coffee to Rotterdam in March.\nThank you.',
    );
    const wa = f.getByRole('link', { name: 'Open WhatsApp' }).getAttribute('href')!;
    expect(wa.startsWith('https://wa.me/31655500140?text=')).toBe(true);
    expect(decodeURIComponent(wa)).toContain('Company: PT Kopi Nusantara');
    const mail = f.getByRole('link', { name: 'Send by email' }).getAttribute('href')!;
    expect(mail.startsWith('mailto:enquiries@quaymoor.example?subject=Freight%20quote')).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
    fireEvent.click(f.getByRole('button', { name: 'Edit details' }));
    expect(f.getByLabelText(/^Full name/)).toHaveValue('Rina Hartono');
    fetchSpy.mockRestore();
  });

  it('label kontak, label & pesan formulir, judul kolom footer, "Read story", dan "Key figures" bisa ditulis ulang di CMS', async () => {
    const container = demo({
      newsroom: { read_label: 'Baca selengkapnya' },
      fleet: { specs_label: 'Data kapal' },
      contact: { headquarters_label: 'Kantor pusat', phone_label: 'Telepon', map_label: 'Buka peta', offices_title: 'Kantor kami', form_title: 'Kirim pertanyaan', form_button: 'Susun pesan' },
      enquiry: {
        label_name: 'Nama',
        label_email: 'Email',
        prompt_type: 'Pilih topik',
        placeholder_message: 'Tulis kebutuhan Anda',
        optional_label: 'boleh kosong',
        note: 'Data tidak disimpan.',
        error_name: 'Nama wajib diisi.',
        ready_title: 'Pesan siap',
        whatsapp_label: 'Kirim ke WhatsApp',
      },
      footer: { col_company: 'Perusahaan', col_group: 'Grup usaha', col_fleet: 'Armada', col_careers: 'Karier', col_media: 'Media', col_contact: 'Kontak' },
    });
    expect(section(container, 'newsroom').querySelector('article')!.textContent).toContain('Baca selengkapnya');
    expect(section(container, 'fleet').textContent).toContain('Data kapal');
    const contact = section(container, 'contact');
    const f = within(contact);
    for (const label of ['Kantor pusat', 'Telepon', 'Kantor kami', 'Kirim pertanyaan', 'Data tidak disimpan.', '(boleh kosong)']) expect(contact.textContent, label).toContain(label);
    expect(f.getByRole('link', { name: 'Buka peta' })).toBeInTheDocument();
    expect(f.getByLabelText(/^Enquiry type/).querySelector('option')!.textContent).toBe('Pilih topik');
    expect(f.getByLabelText(/^Message/)).toHaveAttribute('placeholder', 'Tulis kebutuhan Anda');
    fireEvent.click(f.getByRole('button', { name: 'Susun pesan' }));
    expect(f.getByLabelText(/^Nama/)).toHaveFocus();
    expect(contact.textContent).toContain('Nama wajib diisi.');
    fireEvent.change(f.getByLabelText(/^Nama/), { target: { value: 'Rina' } });
    fireEvent.change(f.getByLabelText(/^Email/), { target: { value: 'rina@contoh.co.id' } });
    fireEvent.change(f.getByLabelText(/^Enquiry type/), { target: { value: 'Media' } });
    fireEvent.change(f.getByLabelText(/^Message/), { target: { value: 'Permintaan wawancara.' } });
    fireEvent.click(f.getByRole('button', { name: 'Susun pesan' }));
    await waitFor(() => expect(f.getByRole('heading', { name: 'Pesan siap' })).toHaveFocus());
    expect(contact.querySelector('pre')!.textContent).toContain('Nama: Rina\nEmail: rina@contoh.co.id');
    expect(f.getByRole('link', { name: 'Kirim ke WhatsApp' })).toBeInTheDocument();
    const footerNav = within(container.querySelector('footer')!).getByRole('navigation', { name: 'Footer links' });
    expect(Array.from(footerNav.querySelectorAll('p')).map((p) => p.textContent)).toEqual(['Perusahaan', 'Grup usaha', 'Armada', 'Karier', 'Media', 'Kontak']);
  });

  it('kontak & footer: kantor pusat, kantor regional, kolom footer otomatis, kolom merek, media sosial', () => {
    const container = demo();
    const contact = section(container, 'contact');
    expect(within(contact).getByRole('link', { name: '+31 10 555 0140' })).toHaveAttribute('href', 'tel:+31105550140');
    expect(within(contact).getByRole('link', { name: 'View on map' }).getAttribute('href')).toContain('google.com/maps');
    expect(contact.textContent).toContain('Jakarta');
    const footer = container.querySelector('footer')!;
    expect(footer.getAttribute('data-tpl-section')).toBe('footer');
    const nav = within(footer).getByRole('navigation', { name: 'Footer links' });
    expect(nav.textContent).toContain('Quaymoor Shipyards');
    expect(nav.textContent).toContain('Coastline class');
    // Kolom footer: Company, Group companies, Fleet, Careers, Media, Contact (judul dari CMS)
    expect(Array.from(nav.querySelectorAll('p')).map((p) => p.textContent)).toEqual(['Company', 'Group companies', 'Fleet', 'Careers', 'Media', 'Contact']);
    expect(nav.textContent).toContain('Officer cadet programme');
    expect(within(footer).getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', 'https://www.linkedin.com/company/quaymoor-group-demo');
    expect(footer.textContent).toContain(`© ${new Date().getFullYear()} Quaymoor Group. All rights reserved.`);
  });

  it('judul kolom footer tidak ikut label kecil section: eyebrow & judul newsroom dikosongkan → field footer / nama di menu', () => {
    const container = demo({ divisions: { eyebrow: '' }, fleet: { eyebrow: '' }, newsroom: { title: '', menu_label: 'Stories' } });
    const nav = within(container.querySelector('footer')!).getByRole('navigation', { name: 'Footer links' });
    expect(Array.from(nav.querySelectorAll('p')).map((p) => p.textContent)).toEqual(['Company', 'Group companies', 'Fleet', 'Careers', 'Media', 'Contact']);
    const media = Array.from(nav.children).find((col) => col.querySelector('p')!.textContent === 'Media')!;
    expect(media.querySelector('a')!.textContent).toBe('Stories');
  });

  it('datar: tidak ada kelas shadow di file template', () => {
    const dir = resolve(ROOT, 'src/templates/portline');
    for (const name of readdirSync(dir)) {
      expect(readFileSync(join(dir, name), 'utf8'), name).not.toMatch(/\bshadow-/);
    }
  });
});

describe('Portline: bahasa Indonesia', () => {
  it('brand.language "id": atribut lang & label aria Indonesia; label yang dikosongkan di CMS memakai cadangan Indonesia', () => {
    const container = demo({
      brand: { language: 'id' },
      divisions: { menu_label: '' },
      contact: { form_button: '' },
      enquiry: { label_name: '', error_name: '' },
    });
    expect(container.querySelector('[lang="id"]')).not.toBeNull();
    const contact = section(container, 'contact');
    expect(within(contact).getByLabelText(/^Nama lengkap/)).toBeInTheDocument();
    // Label lain tetap teks CMS (bawaan Inggris) sampai ditulis ulang
    expect(within(contact).getByLabelText(/^Work email/)).toBeInTheDocument();
    fireEvent.click(within(contact).getByRole('button', { name: 'Susun pesan' }));
    expect(contact.textContent).toContain('Tulis nama lengkap Anda.');
    expect(within(section(container, 'hero')).getByRole('group', { name: 'Kontrol slide' })).toBeInTheDocument();
    expect(container.querySelector('header nav')!.textContent).toContain('Grup');
  });
});

describe('Portline: konten opsional kosong', () => {
  it('hero tanpa foto & tanpa logo grup → latar gradasi, tanpa strip; foto lain kosong → tata letak menyesuaikan', () => {
    const container = demo({
      hero: { image: '', slides: [], companies: [], service_label: '' },
      network: { image: '' },
      sustainability: { image: '' },
      careers: { image: '' },
      divisions: { items: [{ name: 'Freight forwarding', description: 'Door to door.' }], cta_title: '' },
      leadership: { items: [{ name: 'Rina Hartono', role: 'Direktur' }] },
    });
    const hero = section(container, 'hero');
    expect(hero.querySelector('.pl-hero-fallback')).not.toBeNull();
    expect(hero.querySelector('img')).toBeNull();
    expect(within(hero).queryByRole('group', { name: 'Slide controls' })).toBeNull();
    expect(within(hero).queryByRole('list', { name: 'Group companies' })).toBeNull();
    expect(section(container, 'network').querySelector('img')).toBeNull();
    expect(section(container, 'sustainability').querySelector('img')).toBeNull();
    expect(section(container, 'careers').querySelector('img')).toBeNull();
    const divisions = section(container, 'divisions');
    expect(divisions.querySelectorAll('article')).toHaveLength(1);
    expect(divisions.querySelector('img')).toBeNull();
    expect(section(container, 'leadership').textContent).toContain('RH');
  });

  it('tanpa WhatsApp & email → formulir diganti ajakan menelepon; hero dimatikan → header putih', () => {
    const container = demo({ contact: { whatsapp: '', email: '' }, hero: { enabled: false } });
    const contact = section(container, 'contact');
    expect(within(contact).queryByRole('button', { name: 'Prepare message' })).toBeNull();
    expect(contact.textContent).toContain('Contact our team by phone');
    const header = container.querySelector('header')!;
    expect(header.className).not.toContain('h-0');
    expect(header.firstElementChild!.className).toContain('bg-white');
  });

  it('section tanpa isi tidak dirender dan tidak muncul di menu', () => {
    const container = demo({ newsroom: { items: [] }, press: { items: [] }, fleet: { items: [] } });
    expect(sectionKeys(container)).not.toContain('newsroom');
    expect(sectionKeys(container)).not.toContain('press');
    expect(sectionKeys(container)).not.toContain('fleet');
    expect(container.querySelector('header nav')!.textContent).not.toMatch(/Newsroom|Our fleet/);
  });
});

describe('Portline: pratinjau CMS', () => {
  it('pratinjau diam (gerak mati bila Component dirender langsung) dan tanpa tautan wa.me / mailto yang terbuka', () => {
    const { container } = render(<def.Component content={resolveContent(def, null)} preview />);
    expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'off');
    expect(container.querySelector('.pl-progress-y')).toHaveAttribute('data-run', 'false');
    expect(container.querySelector('[aria-label="Pause slideshow"]')).toBeNull();
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
    // Deret perusahaan grup statis (tanpa Marquee): satu kolom di HP sempit, nama panjang boleh membungkus
    const staticList = within(container).getAllByRole('list', { name: 'Group companies' })[0];
    expect(staticList.className).toMatch(/(^| )grid-cols-1( |$)/);
    expect(staticList.innerHTML).not.toContain('whitespace-nowrap');
    fireEvent.click(within(container).getByRole('button', { name: /^Slide 3 of 3/ }));
    expect(container.querySelector('[data-tpl-section="hero"] [aria-atomic="true"]')!.textContent).toBe('Slide 3 of 3: Day and night, from quay to door');
    expect(container.querySelector('h1')!.textContent).toBe('Connecting world trade, port by port');
  });
});

describe('Portline: editor CMS', () => {
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

describe('Portline: data katalog', () => {
  const sql = (file: string) => readFileSync(resolve(ROOT, file), 'utf8');

  it.each(['database/seed.templates.sql', 'database/migrations/2026-10-27_032_portline_template.sql'])(
    '%s: baris portline dengan template_code, kategori, harga, dan pratinjau tangkapan layar .webp',
    (file) => {
      const text = sql(file);
      expect(text).toContain("'portline'");
      expect(text).toContain("'Company Profile'");
      expect(text).toContain('1890000.00');
      expect(text).toContain("'/assets/templates/portline-preview.webp'");
      expect(text).toContain('\'["/assets/templates/portline-1.webp","/assets/templates/portline-2.webp"]\'');
      expect(text).toMatch(/menyusun pesan WhatsApp atau email untuk tim Anda; tidak ada data yang disimpan/);
      expect(text).toMatch(/bukan sistem pelacakan/);
      // Jujur soal CMS: semua teks yang tampil (termasuk label formulir & pesan galat) bisa diganti
      expect(text).toMatch(/semua teks yang tampil, dari menu, judul, dan tombol sampai label formulir, pesan galat/);
      expect(text).toContain('Quaymoor Group, fiktif');
      expect(text).not.toMatch(/Portline Group|Track a shipment|teks tombol dan label formulir mengikuti/);
    },
  );

  it('migrasi 032 aman diulang (INSERT IGNORE + UPDATE berdasarkan slug, tanpa DELETE), tercatat di schema_migrations & README', () => {
    const text = sql('database/migrations/2026-10-27_032_portline_template.sql').replace(/^--.*$/gm, '');
    expect(text).toMatch(/INSERT IGNORE INTO templates/);
    expect(text).toMatch(/WHERE slug = 'portline';/);
    expect(text).toMatch(/sort_order\s+= 16/);
    expect(text).toMatch(/status\s+= 'published'/);
    expect(text).not.toMatch(/\bDELETE\b/);
    expect(text).toContain("VALUES ('2026-10-27_032', 'templates: katalog Portline')");
    expect(sql('database/README.md')).toContain('2026-10-27_032_portline_template.sql');
  });

  it('gambar pratinjau katalog ada di public/, 1600×1000, dan ringan', () => {
    for (const name of ['portline-preview', 'portline-1', 'portline-2']) {
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

describe('Portline: konten aneh', () => {
  it('angka, null, dan string di tempat list tidak membuat crash; tautan berbahaya dibuang', () => {
    const weird = {
      brand: { accent_color: 'biru', language: 7 },
      hero: { slides: 'x', companies: [null, { name: 3 }], link_url: 'javascript:alert(1)', utility_1_url: 'javascript:alert(1)', lang_other_url: 'vbscript:x' },
      newsroom: { items: [{ title: 'Kabar', date: 9, tags: null, url: 'javascript:alert(1)', image: 'javascript:alert(1)' }] },
      press: { items: 'x' },
      stats: { items: [{ value: 7 }, 'x'] },
      divisions: { items: [{ name: 2, url: 'javascript:alert(1)' }] },
      fleet: { items: [{ name: 'Kelas', specs: 5 }] },
      network: { items: [{ region: 'Asia', hubs: 4 }] },
      sustainability: { items: null },
      careers: { points: 'x', email: 'bukan email' },
      leadership: { items: [{ name: 'Ani', photo: 'javascript:alert(1)', linkedin: 'javascript:alert(1)' }] },
      contact: { enquiry_types: 'x', offices: [{ city: 1 }], whatsapp: 'abc' },
    } as unknown as SiteContent;
    const { container } = render(<def.Component content={resolveContent(def, weird)} />);
    expect(container.querySelector('a[href^="javascript:"], a[href^="vbscript:"]')).toBeNull();
    expect(container.querySelector('img[src^="javascript:"]')).toBeNull();
    expect(container.querySelector('h1')!.textContent).toBe('Connecting world trade, port by port');
    expect(section(container, 'newsroom').textContent).toContain('Kabar');
  });
});
