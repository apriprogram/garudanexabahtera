// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/homenest.test.tsx
// HomeNest (katalog & penjualan rumah "quiet luxury" 2026-10-28): skema CMS & konten demo, foto, salinan jujur
// (simulasi KPR bukan penawaran bank, tanpa nama bank, formulir hanya menyusun pesan WhatsApp), helper model (warna tema,
// menu, tujuan tautan, harga & rentang harga, saringan/urutan listing, simulasi KPR anuitas, formulir jadwal kunjungan →
// pesan WhatsApp), demo (urutan section, hero estate + panel cari → saringan, header + menu HP, listing + tampilkan
// lagi, tab tur, KPR, agen + formulir, akordeon), datar tanpa bayangan, gerak (pratinjau CMS diam, CSS hn- bergerbang
// data-tpl-motion), warna tema, SEO situs pembeli, judul & gambar & tautan, konten opsional kosong, editor CMS, data
// katalog (migrasi 048 + pratinjau + halaman katalog), dan konten aneh.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionEditor } from '../../pages/account/cms/SectionEditor';
import { validateContent } from '../../pages/account/cms/validation';
import { seo as catalogSeo, page as catalogPage } from '../../content/templates/homenest';
import { content as catalogContent } from '../../content/templates/homenest.content';
import { TEMPLATES, resolveContent } from '../index';
import { iconKey } from '../homenest/icons';
import {
  ANY_AGENT,
  CREAM,
  EMPTY_VISIT,
  NBSP,
  NO_LISTING,
  PAGE_SECTIONS,
  agentMessage,
  applyListingFilters,
  cleanText,
  displayPhone,
  filterOptions,
  formatPriceShort,
  formatRupiah,
  formatVisitDate,
  homenestVars,
  kprDefaults,
  kprMessage,
  kprSimulation,
  listingMessage,
  messageMailHref,
  navItems,
  parsePrice,
  priceRanges,
  readAgents,
  readHomeNest,
  readListings,
  resultCount,
  sectionShown,
  sectionTarget,
  tenorOptions,
  todayIso,
  validateVisit,
  visitMessage,
  wordmarkOf,
  type Listing,
  type ListingFilters,
  type VisitForm,
} from '../homenest/model';
import { HOMENEST_PHOTOS } from '../homenest/photos';
import { applySiteHead, siteTitle } from '../siteHead';
import { SiteRenderer } from '../SiteRenderer';
import { contrast, parseHex } from '../shared/utils';
import { isListField, type SiteContent } from '../types';

// Demo panjang + getByRole di jsdom: bisa lewat 5 dtk saat suite berjalan paralel
vi.setConfig({ testTimeout: 30_000 });

const ROOT = process.cwd();
const def = TEMPLATES.homenest;
const ORDER = ['hero', 'listings', 'tour', 'kpr', 'developer', 'amenities', 'testimonials', 'agents', 'faq', 'contact'];
const sectionKeys = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-tpl-section]')).map((s) => s.getAttribute('data-tpl-section'));
const section = (root: HTMLElement, key: string) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`)!;
const demo = (content: unknown = null, preview = false) => render(<SiteRenderer templateCode="homenest" content={content} preview={preview} />).container;
const rgb = (hex: string) => parseHex(hex)!;
const publicFile = (url: string) => resolve(ROOT, 'public', url.replace(/^\//, ''));
const rootStyle = (container: HTMLElement, name: string) => {
  const holder = Array.from(container.querySelectorAll<HTMLElement>('[style]')).find((el) => el.style.getPropertyValue(name));
  return holder?.style.getPropertyValue(name) ?? '';
};
const urls = (src: string) => {
  const asset = HOMENEST_PHOTOS.asset(src)!;
  return [asset.src, ...asset.srcSet!.split(',').map((part) => part.trim().split(' ')[0])].filter((u, i, all) => all.indexOf(u) === i);
};
/** Spasi tak terputus → spasi biasa (harga "Rp1,45 M" memakai NBSP agar tidak terbelah). */
const plain = (s: string | null | undefined) => (s ?? '').split(NBSP).join(' ');
const wait = (ms: number) => act(() => new Promise<void>((r) => setTimeout(r, ms)));
const decode = (a: Element) => decodeURIComponent(a.getAttribute('href') ?? '');
const WA = 'https://wa.me/6281234567890?text=';
const HOMES = resolveContent(def, null);
const LISTINGS = readListings(HOMES.listings);
const titles = (items: Listing[]) => items.map((l) => l.title);
const RANGES = priceRanges('1000, 2000, 3000');
const filters = (patch: Partial<ListingFilters> = {}): ListingFilters => ({ city: '', type: '', range: '', sort: 'featured', ...patch });
const visit = (patch: Partial<VisitForm> = {}): VisitForm => ({
  ...EMPTY_VISIT,
  name: 'Rina Kartika',
  listing: 'Townhouse Laras',
  date: '2030-11-16',
  time: 'Siang (12.00–15.00)',
  agent: 'Yoga Pratama',
  ...patch,
});
const LISTING_NAMES = titles(LISTINGS);
const AGENT_NAMES = ['Nadia Prameswari', 'Yoga Pratama', 'Sekar Ayuningtyas'];
const TSX = ['HomeNest', 'Header', 'Hero', 'Listings', 'Tour', 'Kpr', 'Estate', 'Stories', 'Agents', 'Closing', 'Footer', 'ui', 'marks'];
const TS = ['index', 'styles', 'model', 'icons', 'hooks', 'schema', 'defaultContent', 'photos'];
const source = () =>
  [
    ...TSX.map((f) => readFileSync(resolve(ROOT, `src/templates/homenest/${f}.tsx`), 'utf8')),
    ...TS.map((f) => readFileSync(resolve(ROOT, `src/templates/homenest/${f}.ts`), 'utf8')),
    readFileSync(resolve(ROOT, 'src/templates/homenest/homenest.css'), 'utf8'),
  ].join('\n');

let scrolled: (string | null)[] = [];
beforeEach(() => {
  scrolled = [];
  Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
    scrolled.push(this.getAttribute('data-tpl-section'));
  });
});
afterEach(cleanup);

describe('HomeNest: skema & konten bawaan', () => {
  it('urutan form = urutan halaman, semua section bisa disembunyikan, field unik, teks berbatas, list berbatas', () => {
    expect(def.code).toBe('homenest');
    expect(def.name).toBe('HomeNest');
    expect(def.features).toBeUndefined();
    expect(def.sections.map((s) => s.key)).toEqual(['brand', ...ORDER, 'footer']);
    expect([...PAGE_SECTIONS]).toEqual([...ORDER, 'footer']);
    const fields = (key: string) => def.sections.find((s) => s.key === key)!.fields.map((f) => f.key);
    expect(fields('brand')).toEqual(['company_name', 'tagline', 'logo', 'accent_color']);
    expect(def.sections[0].fields.find((f) => f.key === 'accent_color')?.type).toBe('color');
    expect(fields('hero')).toEqual(['eyebrow', 'title', 'subtitle', 'image', 'search_label', 'header_label', 'header_url']);
    expect(fields('listings')).toEqual(expect.arrayContaining(['price_steps', 'empty_text', 'kpr_label', 'ask_label', 'items']));
    expect(fields('tour')).toEqual(expect.arrayContaining(['button_label', 'url', 'note', 'rooms']));
    expect(fields('kpr')).toEqual(expect.arrayContaining(['default_price', 'default_dp', 'default_tenor', 'default_rate', 'note', 'cta_label']));
    expect(fields('agents')).toEqual(expect.arrayContaining(['items', 'form_title', 'form_text', 'form_button']));
    expect(fields('contact')).toEqual(expect.arrayContaining(['address', 'maps_query', 'maps_url', 'phone', 'email', 'whatsapp', 'whatsapp_message', 'hours']));
    expect(fields('footer')).toEqual(expect.arrayContaining(['wordmark', 'copyright', 'instagram', 'facebook', 'linkedin', 'youtube', 'tiktok']));
    const contact = def.sections.find((s) => s.key === 'contact')!;
    expect(contact.fields.find((f) => f.key === 'whatsapp')?.type).toBe('phone');
    // Hero: foto latar bernama `image` (dibaca tes bersama new-templates)
    expect(def.sections.find((s) => s.key === 'hero')!.fields.find((f) => f.key === 'image')?.type).toBe('image');
    const items = def.sections.find((s) => s.key === 'listings')!.fields.find((f) => f.key === 'items');
    expect(isListField(items!) && items.fields.map((f) => f.key)).toEqual(['title', 'cluster', 'city', 'type', 'price', 'lt', 'lb', 'kt', 'km', 'status', 'image']);
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
          for (const sub of f.fields) {
            expect(sub.introduced, `${s.key}.${f.key}.${sub.key}`).toBeUndefined();
            if (['text', 'textarea', 'phone', 'email'].includes(sub.type)) expect(sub.maxLength, `${s.key}.${f.key}.${sub.key}`).toBeGreaterThan(0);
          }
        } else if (['text', 'textarea', 'phone', 'email'].includes(f.type)) {
          expect(f.maxLength, `${s.key}.${f.key}`).toBeGreaterThan(0);
        }
      }
    }
    // Batas yang disebut di halaman katalog (homenest.content.ts)
    expect(max).toEqual({
      'listings.items': 12,
      'tour.rooms': 6,
      'developer.stats': 4,
      'developer.projects': 3,
      'developer.values': 3,
      'amenities.items': 10,
      'testimonials.items': 6,
      'agents.items': 4,
      'faq.items': 8,
    });
    const page = JSON.stringify(catalogContent);
    expect(page).toContain('12 kartu rumah');
    expect(page).toContain('6 foto ruang');
  });

  it('konten demo lolos validasi CMS, logo kosong, semua foto terdaftar, ada di public/, dipakai, dan beralt deskriptif', () => {
    const c = def.defaultContent;
    expect(validateContent(def, resolveContent(def, null))).toEqual({});
    expect(c.brand.logo).toBe('');
    expect(c.brand.accent_color).toBe('#2E5141');
    expect(c.contact.whatsapp).toBe('081234567890');
    expect(c.contact.phone).toBe('081234567890');
    expect(c.hero.image).toBe('/assets/templates/photos/homenest-hero-1920.webp');
    for (const s of def.sections) if (s.key !== 'brand') expect(c[s.key].enabled, s.key).toBe(true);
    const photos = JSON.stringify(c).match(/\/assets\/templates\/photos\/[a-z0-9-]+\.webp/g) ?? [];
    for (const src of photos) expect(HOMENEST_PHOTOS.asset(src), src).not.toBeNull();
    expect(HOMENEST_PHOTOS.keys).toHaveLength(15);
    for (const key of HOMENEST_PHOTOS.keys) {
      expect(key.startsWith('homenest-'), key).toBe(true);
      for (const url of urls(HOMENEST_PHOTOS.src(key))) expect(existsSync(publicFile(url)), url).toBe(true);
      expect(photos, `${key} dipakai di konten demo`).toContain(HOMENEST_PHOTOS.src(key));
      expect(HOMENEST_PHOTOS.alt(HOMENEST_PHOTOS.src(key), '').split(' ').length, key).toBeGreaterThanOrEqual(5);
    }
    // Simbol bawaan juga tersedia sebagai SVG mandiri, path sama dengan komponen
    const mark = readFileSync(publicFile('/assets/templates/logos/homenest-mark.svg'), 'utf8');
    const component = readFileSync(resolve(ROOT, 'src/templates/homenest/marks.tsx'), 'utf8');
    const paths = mark.match(/ d="[^"]+"/g) ?? [];
    expect(paths).toHaveLength(2);
    for (const d of paths) expect(component, d).toContain(d.trim());
    expect(mark).toMatch(/viewBox="0 0 32 32"/);
    expect(mark).toMatch(/role="img"/);
    expect(mark).toMatch(/<title>/);
    expect(mark).toContain('fill-rule="evenodd"');
    expect(component).toContain('fillRule="evenodd"');
    // Judul tab situs pembeli ≤ 60 huruf, deskripsi hero 120–155, judul hero ≤ 9 kata
    expect(`${c.brand.company_name} — ${c.brand.tagline}`.length).toBeLessThanOrEqual(60);
    expect(String(c.hero.subtitle).length).toBeGreaterThanOrEqual(120);
    expect(String(c.hero.subtitle).length).toBeLessThanOrEqual(155);
    expect(String(c.hero.title).split(' ').length).toBeLessThanOrEqual(9);
    // Angka di salinan = data: 9 unit, 4 kota, 9 klaster (satu rumah per klaster)
    const homes = c.listings.items as { cluster: string; city: string }[];
    expect(homes).toHaveLength(9);
    expect(String(c.listings.subtitle)).toMatch(/^Sembilan unit di empat kota/);
    expect(new Set(homes.map((h) => h.city)).size).toBe(4);
    expect(new Set(homes.map((h) => h.cluster)).size).toBe(9);
    expect(c.developer.stats).toEqual(expect.arrayContaining([{ value: '9', label: 'Klaster aktif' }, { value: '4', label: 'Kota' }]));
    // Kartu & kalimat pendek (owner: "text jangan keramaian")
    for (const room of c.tour.rooms as { caption: string }[]) expect(room.caption.length).toBeLessThanOrEqual(90);
    for (const v of c.developer.values as { text: string }[]) expect(v.text.length).toBeLessThanOrEqual(120);
    for (const t of c.testimonials.items as { quote: string }[]) expect(t.quote.length).toBeLessThanOrEqual(120);
  });

  // CREDITS.md gets this template's section at integration
  it('setiap kunci foto tercatat di CREDITS.md', () => {
    const credits = readFileSync(resolve(ROOT, 'public/assets/templates/photos/CREDITS.md'), 'utf8');
    expect(HOMENEST_PHOTOS.keys.filter((key) => !credits.includes(`\`${key}-*\``))).toEqual([]);
  });

  it('foto demo ringan: hero 800/1280/1920, WebP ≤ 140 KB per file (800w ≤ 90 KB), total ≤ 2,5 MB', () => {
    expect(HOMENEST_PHOTOS.asset(def.defaultContent.hero.image as string)!.srcSet).toBe(
      '/assets/templates/photos/homenest-hero-800.webp 800w, /assets/templates/photos/homenest-hero-1280.webp 1280w, /assets/templates/photos/homenest-hero-1920.webp 1920w',
    );
    let total = 0;
    for (const key of HOMENEST_PHOTOS.keys) {
      for (const url of urls(HOMENEST_PHOTOS.src(key))) {
        expect(url, url).toMatch(/\.webp$/);
        const kb = statSync(publicFile(url)).size / 1024;
        expect(kb, url).toBeLessThanOrEqual(url.endsWith('-800.webp') ? 90 : 140);
        expect(readFileSync(publicFile(url)).toString('ascii', 8, 12), url).toBe('WEBP');
        total += kb;
      }
    }
    expect(total).toBeLessThanOrEqual(2500);
  });

  it('salinan demo jujur: simulasi bukan penawaran bank, tanpa nama bank, formulir hanya menyusun pesan, tur hanya contoh', () => {
    const text = JSON.stringify(def.defaultContent);
    expect(text).not.toMatch(/dijamin|garansi|pasti |terbaik|nomor 1|termurah|#1|100%|SHM dijamin|pasti naik|naik nilai|bersertifikat|izin resmi/i);
    expect(text).not.toMatch(/\b(BCA|BRI|BNI|BTN|BSI|Mandiri|CIMB|Danamon|Permata|OCBC|Maybank|Panin|Mega|Bukopin)\b/);
    expect(text).not.toMatch(/360/);
    expect(text).toMatch(/bukan penawaran bank/);
    expect(text).toMatch(/data tidak disimpan di website/);
    expect(text).toContain('Tautan tur pada demo ini hanya contoh.');
    expect(def.defaultContent.tour.url).toBe('https://example.com/virtual-tour');
    expect(text).toMatch(/tidak lewat website ini/);
    expect(text).toContain('@homenest.test');
    expect(text).not.toMatch(/@(gmail|yahoo)\./);
    // Agen dan pembeli fiktif tanpa foto wajah (monogram/inisial)
    for (const s of ['agents', 'testimonials']) expect(JSON.stringify(def.defaultContent[s]), s).not.toMatch(/\.webp/);
  });
});

describe('HomeNest: helper model', () => {
  it('warna tema: hijau tua putih ≥ 12:1, krem ≥ 10:1, krem 72% ≥ 4,5:1; teks aksen ≥ 4,5:1 di krem & putih hangat; tidak valid → bawaan', () => {
    const white = rgb('#ffffff');
    const warm = rgb('#FBF9F4');
    expect(homenestVars('#2E5141')).toEqual({ '--hn-deep': '#1e342a', '--hn-ink': '#2e5141' });
    for (const accent of ['#2E5141', '#1D4ED8', '#A61E3A', '#B7791F', '#FACC15', '#C6F135', '#FFFFFF', '#000000', '#6EE7B7', '#7C3AED', '#12A07F', '#F4EFE4']) {
      const vars = homenestVars(accent) as Record<string, string>;
      const deep = rgb(vars['--hn-deep']);
      const ink = rgb(vars['--hn-ink']);
      const creamOnDeep = CREAM.map((c, i) => Math.round(c * 0.72 + deep[i] * 0.28)) as [number, number, number];
      expect(contrast(deep, white), accent).toBeGreaterThanOrEqual(12);
      expect(contrast(deep, CREAM), accent).toBeGreaterThanOrEqual(10);
      expect(contrast(creamOnDeep, deep), accent).toBeGreaterThanOrEqual(4.5);
      expect(contrast(ink, CREAM), accent).toBeGreaterThanOrEqual(4.5);
      expect(contrast(ink, warm), accent).toBeGreaterThanOrEqual(4.5);
    }
    expect(homenestVars('zzz')).toEqual(homenestVars('#2E5141'));
    expect(homenestVars('')).toEqual(homenestVars('#2E5141'));
  });

  it('menu: label tetap pendek, section kosong/tersembunyi keluar dari menu', () => {
    expect(navItems(HOMES).map((i) => `${i.key}:${i.label}`)).toEqual([
      'listings:Rumah',
      'tour:Tur',
      'kpr:KPR',
      'developer:Developer',
      'amenities:Fasilitas',
      'agents:Agen',
      'contact:Kontak',
    ]);
    const less = resolveContent(def, {
      listings: { items: [{ city: 'tanpa nama' }] },
      tour: { rooms: [{ name: 'tanpa foto', image: '' }] },
      kpr: { enabled: false },
      amenities: { items: [] },
    });
    expect(navItems(less).map((i) => i.key)).toEqual(['developer', 'agents', 'contact']);
  });

  it('tujuan tautan: anchor Indonesia dan kunci section; anchor tak dikenal → null; tujuan tombol menu atas', () => {
    expect(sectionTarget('#rumah')).toBe('listings');
    expect(sectionTarget('#listing')).toBe('listings');
    expect(sectionTarget('tur-virtual')).toBe('tour');
    expect(sectionTarget('#simulasi-kpr')).toBe('kpr');
    expect(sectionTarget('#kpr')).toBe('kpr');
    expect(sectionTarget('#pengembang')).toBe('developer');
    expect(sectionTarget('#fasilitas')).toBe('amenities');
    expect(sectionTarget('#agen')).toBe('agents');
    expect(sectionTarget('#jadwal')).toBe('agents');
    expect(sectionTarget('#kontak')).toBe('contact');
    expect(sectionTarget('#beranda')).toBe('hero');
    expect(sectionTarget('#tidak-ada')).toBeNull();
    const m = readHomeNest(HOMES);
    expect(m.headerAction).toEqual({ kind: 'section', target: 'agents' });
    expect(m.linkOr('#rumah', null)).toEqual({ kind: 'section', target: 'listings' });
    expect(m.linkOr('#tidak-ada', m.visitAction)).toEqual({ kind: 'section', target: 'agents' });
    expect(m.linkOr('https://contoh.test/brosur', null)).toEqual({ kind: 'external', href: 'https://contoh.test/brosur' });
    expect(m.linkOr('javascript:alert(1)', null)).toBeNull();
    const noAgents = readHomeNest(resolveContent(def, { agents: { enabled: false } }));
    expect(noAgents.headerAction).toEqual({ kind: 'section', target: 'contact' });
    expect(noAgents.linkOr('#agen', null)).toBeNull();
    const onlyWa = readHomeNest(resolveContent(def, { agents: { enabled: false }, contact: { enabled: false } }));
    expect(onlyWa.headerAction?.kind).toBe('external');
    const none = readHomeNest(resolveContent(def, { agents: { enabled: false }, contact: { enabled: false, whatsapp: '' } }));
    expect(none.headerAction).toBeNull();
    expect(readHomeNest(resolveContent(def, { hero: { header_url: '#kpr' } })).headerAction).toEqual({ kind: 'section', target: 'kpr' });
  });

  it('section tampil hanya bila berisi', () => {
    for (const key of ORDER) expect(sectionShown(HOMES, key), key).toBe(true);
    const empty = resolveContent(def, {
      listings: { items: [{ city: 'tanpa nama', price: '1000000000' }] },
      tour: { rooms: [{ name: 'tanpa foto', image: '' }] },
      developer: { title: '', body: '', stats: [{ label: 'tanpa angka' }], projects: [{ name: 'tanpa foto' }] },
      amenities: { items: [{ detail: 'tanpa nama' }] },
      testimonials: { items: [{ name: 'tanpa kutipan' }] },
      faq: { items: [{ answer: 'tanpa pertanyaan' }] },
    });
    for (const key of ['listings', 'tour', 'developer', 'amenities', 'testimonials', 'faq']) expect(sectionShown(empty, key), key).toBe(false);
    // KPR, agen (formulir selalu ada), dan kontak tampil selama diaktifkan
    for (const key of ['kpr', 'agents', 'contact']) expect(sectionShown(empty, key), key).toBe(true);
    expect(sectionShown(resolveContent(def, { kpr: { enabled: false } }), 'kpr')).toBe(false);
    expect(sectionShown(HOMES, 'tidak-ada')).toBe(false);
    expect(sectionShown(HOMES, 'brand')).toBe(false);
  });

  it('harga: baca angka biasa / bersatuan, tulis singkat "Rp1,45 M" / "Rp985 jt" dan penuh "Rp1.450.000.000"', () => {
    expect(parsePrice('1450000000')).toBe(1_450_000_000);
    expect(parsePrice('Rp1.450.000.000')).toBe(1_450_000_000);
    expect(parsePrice('Rp 1.450.000.000,-')).toBe(1_450_000_000);
    expect(parsePrice('1,45 M')).toBe(1_450_000_000);
    expect(parsePrice('1.5 miliar')).toBe(1_500_000_000);
    expect(parsePrice('2 m')).toBe(2_000_000_000);
    expect(parsePrice('Rp985 jt')).toBe(985_000_000);
    expect(parsePrice('985 juta')).toBe(985_000_000);
    expect(parsePrice('1.250 jt')).toBe(1_250_000_000);
    expect(parsePrice('750 rb')).toBe(750_000);
    expect(parsePrice(12345)).toBe(12345);
    expect(parsePrice('')).toBe(0);
    expect(parsePrice('Harga menyusul')).toBe(0);
    expect(parsePrice(null)).toBe(0);
    expect(parsePrice('9'.repeat(30))).toBe(999_999_999_999_999);
    expect(plain(formatPriceShort(1_450_000_000))).toBe('Rp1,45 M');
    expect(formatPriceShort(1_450_000_000)).toBe(`Rp1,45${NBSP}M`);
    expect(plain(formatPriceShort(3_400_000_000))).toBe('Rp3,4 M');
    expect(plain(formatPriceShort(2_000_000_000))).toBe('Rp2 M');
    expect(plain(formatPriceShort(985_000_000))).toBe('Rp985 jt');
    expect(plain(formatPriceShort(620_000_000))).toBe('Rp620 jt');
    expect(plain(formatPriceShort(950_000))).toBe('Rp950.000');
    expect(formatPriceShort(0)).toBe('');
    expect(formatPriceShort(-5)).toBe('');
    expect(formatPriceShort(Number.NaN)).toBe('');
    expect(formatRupiah(1_450_000_000)).toBe('Rp1.450.000.000');
    expect(formatRupiah(0)).toBe('Rp0');
  });

  it('rentang harga dari batas juta rupiah: urut, unik, maks. 5 batas; kosong → tanpa saringan harga', () => {
    expect(RANGES.map((r) => ({ ...r, label: plain(r.label) }))).toEqual([
      { id: 'r0', label: 'Di bawah Rp1 M', min: 0, max: 1e9 },
      { id: 'r1', label: 'Rp1 M – Rp2 M', min: 1e9, max: 2e9 },
      { id: 'r2', label: 'Rp2 M – Rp3 M', min: 2e9, max: 3e9 },
      { id: 'r3', label: 'Di atas Rp3 M', min: 3e9, max: null },
    ]);
    expect(priceRanges('3000;1000 1000, x, -5, 0').map((r) => plain(r.label))).toEqual(['Di bawah Rp1 M', 'Rp1 M – Rp3 M', 'Di atas Rp3 M']);
    expect(priceRanges('500, 750').map((r) => plain(r.label))).toEqual(['Di bawah Rp500 jt', 'Rp500 jt – Rp750 jt', 'Di atas Rp750 jt']);
    expect(priceRanges('1.500, 2.500').map((r) => r.max)).toEqual([1.5e9, 2.5e9, null]);
    expect(priceRanges('1, 2, 3, 4, 5, 6, 7')).toHaveLength(6);
    expect(priceRanges('')).toEqual([]);
    expect(priceRanges('abc')).toEqual([]);
  });

  it('saringan & urutan listing: kota/tipe tanpa beda huruf, rentang harga (min termasuk, max tidak), urutan stabil, harga kosong terakhir', () => {
    expect(filterOptions(LISTINGS)).toEqual({ cities: ['Bogor', 'Depok', 'Tangerang Selatan', 'Bekasi'], types: ['Rumah', 'Townhouse', 'Kavling'] });
    const mixed = [
      { ...LISTINGS[0], city: 'bogor', type: '' },
      { ...LISTINGS[1], city: 'Bogor ' },
    ];
    expect(filterOptions(mixed)).toEqual({ cities: ['bogor', 'Bogor '], types: ['Rumah'] });
    const apply = (patch: Partial<ListingFilters>, items = LISTINGS) => titles(applyListingFilters(items, filters(patch), RANGES));
    expect(apply({})).toEqual(LISTING_NAMES);
    expect(apply({ city: 'bogor' })).toEqual(['Rumah Teras Kenari', 'Kavling Bukit Rasamala', 'Rumah Pendopo Saga']);
    expect(apply({ city: 'Bogor', type: 'Rumah' })).toEqual(['Rumah Teras Kenari', 'Rumah Pendopo Saga']);
    expect(apply({ type: 'kavling' })).toEqual(['Kavling Bukit Rasamala', 'Kavling Tepian Sawo']);
    expect(apply({ range: 'r0' })).toEqual(['Rumah Serambi Jati', 'Kavling Bukit Rasamala', 'Kavling Tepian Sawo']);
    expect(apply({ range: 'r1' })).toEqual(['Rumah Teras Kenari', 'Rumah Taman Palem', 'Townhouse Laras', 'Townhouse Nara']);
    expect(apply({ range: 'r2' })).toEqual(['Rumah Lanai']);
    expect(apply({ range: 'r3' })).toEqual(['Rumah Pendopo Saga']);
    expect(apply({ range: 'tidak-ada' })).toEqual(LISTING_NAMES);
    expect(apply({ type: 'Kavling', range: 'r3' })).toEqual([]);
    expect(apply({ sort: 'price-asc' })).toEqual([
      'Kavling Tepian Sawo',
      'Kavling Bukit Rasamala',
      'Rumah Serambi Jati',
      'Rumah Taman Palem',
      'Rumah Teras Kenari',
      'Townhouse Nara',
      'Townhouse Laras',
      'Rumah Lanai',
      'Rumah Pendopo Saga',
    ]);
    expect(apply({ sort: 'price-desc' })).toEqual([...apply({ sort: 'price-asc' })].reverse());
    // Luas bangunan, kavling memakai luas tanah; seri → urutan CMS
    expect(apply({ sort: 'area-desc' })).toEqual([
      'Rumah Pendopo Saga',
      'Rumah Lanai',
      'Kavling Bukit Rasamala',
      'Townhouse Laras',
      'Kavling Tepian Sawo',
      'Townhouse Nara',
      'Rumah Teras Kenari',
      'Rumah Taman Palem',
      'Rumah Serambi Jati',
    ]);
    // Batas rentang: tepat Rp1 M masuk "Rp1 M – Rp2 M"; harga kosong tidak masuk rentang dan selalu terakhir di urutan harga
    const edge = [
      { ...LISTINGS[0], index: 0, title: 'Tanpa harga', price: 0 },
      { ...LISTINGS[1], index: 1, title: 'Satu miliar', price: 1e9 },
      { ...LISTINGS[2], index: 2, title: 'Murah', price: 5e8 },
    ];
    expect(apply({ range: 'r0' }, edge)).toEqual(['Murah']);
    expect(apply({ range: 'r1' }, edge)).toEqual(['Satu miliar']);
    expect(apply({ sort: 'price-asc' }, edge)).toEqual(['Murah', 'Satu miliar', 'Tanpa harga']);
    expect(apply({ sort: 'price-desc' }, edge)).toEqual(['Satu miliar', 'Murah', 'Tanpa harga']);
    // Tidak mengubah daftar asli
    expect(titles(LISTINGS)).toEqual(LISTING_NAMES);
    expect(resultCount(9)).toBe('9 rumah');
    expect(resultCount(1)).toBe('1 rumah');
    expect(resultCount(0)).toBe('Tidak ada rumah yang cocok');
  });

  it('pesan WhatsApp per rumah dan per agen', () => {
    expect(listingMessage(LISTINGS[0], 'HomeNest')).toBe(
      'Halo HomeNest, saya tertarik dengan Rumah Teras Kenari (Klaster Kenari Asri, Bogor) seharga Rp1,45 M. Apakah masih tersedia?',
    );
    expect(listingMessage({ ...LISTINGS[4], cluster: '', price: 0 }, '')).toBe('Halo tim pemasaran, saya tertarik dengan Kavling Bukit Rasamala (Bogor). Apakah masih tersedia?');
    const agents = readAgents(HOMES.agents, '081234567890');
    expect(agents).toEqual([
      { name: 'Nadia Prameswari', firstName: 'Nadia', area: 'Bogor & Depok', whatsapp: '081234567890' },
      { name: 'Yoga Pratama', firstName: 'Yoga', area: 'Tangerang Selatan', whatsapp: '081234567890' },
      { name: 'Sekar Ayuningtyas', firstName: 'Sekar', area: 'Bekasi', whatsapp: '081234567890' },
    ]);
    expect(agentMessage(agents[0])).toBe('Halo Nadia, saya ingin bertanya tentang rumah di Bogor & Depok.');
    expect(agentMessage({ ...agents[1], area: '' })).toBe('Halo Yoga, saya ingin bertanya tentang rumah.');
    const own = readAgents({ items: [{ name: 'Agen A', whatsapp: '0811 2222 3333' }, { name: 'Agen B', whatsapp: 'abc' }, { area: 'tanpa nama' }] } as unknown as SiteContent['agents'], '081234567890');
    expect(own.map((a) => a.whatsapp)).toEqual(['0811 2222 3333', '081234567890']);
  });

  it('simulasi KPR anuitas: angka pasti, bunga 0%, nilai dibatasi, isian rusak', () => {
    expect(kprSimulation({ price: 1_450_000_000, dpPercent: 20, years: 15, ratePercent: 7.5 })).toEqual({
      price: 1_450_000_000,
      dpPercent: 20,
      years: 15,
      ratePercent: 7.5,
      downPayment: 290_000_000,
      principal: 1_160_000_000,
      months: 180,
      monthly: 10_753_343,
      totalPaid: 1_935_601_740,
      totalInterest: 775_601_740,
    });
    expect(kprSimulation({ price: 1_450_000_000, dpPercent: 20, years: 20, ratePercent: 7.5 }).monthly).toBe(9_344_881);
    expect(kprSimulation({ price: 985_000_000, dpPercent: 10, years: 20, ratePercent: 6.25 })).toMatchObject({ principal: 886_500_000, monthly: 6_479_679, totalInterest: 668_622_960 });
    // Bunga 0% → pinjaman dibagi rata
    expect(kprSimulation({ price: 1_200_000_000, dpPercent: 20, years: 10, ratePercent: 0 })).toMatchObject({
      principal: 960_000_000,
      monthly: 8_000_000,
      totalPaid: 960_000_000,
      totalInterest: 0,
    });
    // Di luar batas → dibatasi (uang muka ≤ 90%, tenor ≤ 30 thn, bunga ≤ 30%)
    expect(kprSimulation({ price: 1e9, dpPercent: 150, years: 99, ratePercent: 45 })).toMatchObject({
      dpPercent: 90,
      years: 30,
      ratePercent: 30,
      principal: 100_000_000,
      months: 360,
      monthly: 2_500_345,
    });
    // Isian rusak/negatif → 0 / batas bawah, tanpa NaN
    const broken = kprSimulation({ price: -5, dpPercent: Number.NaN, years: 0, ratePercent: -3 });
    expect(broken).toEqual({ price: 0, dpPercent: 0, years: 1, ratePercent: 0, downPayment: 0, principal: 0, months: 12, monthly: 0, totalPaid: 0, totalInterest: 0 });
    expect(kprSimulation({ price: Number.POSITIVE_INFINITY, dpPercent: 20, years: 15, ratePercent: 7.5 }).price).toBe(0);
    expect(kprSimulation({ price: 1e9, dpPercent: 100, years: 15, ratePercent: 7.5 })).toMatchObject({ dpPercent: 90, principal: 100_000_000 });
  });

  it('nilai awal KPR dari CMS (koma desimal, kosong/rusak → 1 M, 20%, 15 thn, 7,5%) dan pilihan tenor', () => {
    expect(kprDefaults(HOMES.kpr)).toEqual({ price: 1_450_000_000, dpPercent: 20, years: 15, ratePercent: 7.5 });
    expect(kprDefaults({} as SiteContent['kpr'])).toEqual({ price: 1e9, dpPercent: 20, years: 15, ratePercent: 7.5 });
    expect(kprDefaults({ default_price: 'abc', default_dp: 'x', default_tenor: '', default_rate: 'naik' } as unknown as SiteContent['kpr'])).toEqual({
      price: 1e9,
      dpPercent: 20,
      years: 15,
      ratePercent: 7.5,
    });
    expect(kprDefaults({ default_price: '1,2 M', default_dp: '95', default_tenor: '12.6', default_rate: '6,25' } as unknown as SiteContent['kpr'])).toEqual({
      price: 1_200_000_000,
      dpPercent: 90,
      years: 13,
      ratePercent: 6.25,
    });
    expect(tenorOptions(15)).toEqual([5, 10, 15, 20, 25]);
    expect(tenorOptions(12)).toEqual([5, 10, 12, 15, 20, 25]);
    expect(tenorOptions(99)).toEqual([5, 10, 15, 20, 25, 30]);
    expect(kprMessage(kprSimulation({ price: 1_450_000_000, dpPercent: 20, years: 15, ratePercent: 7.5 }), 'HomeNest')).toBe(
      [
        'Halo HomeNest, saya ingin bertanya tentang KPR.',
        '',
        'Harga rumah: Rp1.450.000.000',
        'Uang muka: 20% (Rp290.000.000)',
        'Tenor: 15 tahun',
        'Bunga simulasi: 7,5% per tahun',
        'Perkiraan angsuran: Rp10.753.343 per bulan',
      ].join('\n'),
    );
    expect(kprMessage(kprSimulation({ price: 1e9, dpPercent: 12.5, years: 10, ratePercent: 6.25 }), '').split('\n')).toEqual(
      expect.arrayContaining(['Halo tim pemasaran, saya ingin bertanya tentang KPR.', 'Uang muka: 12,5% (Rp125.000.000)', 'Bunga simulasi: 6,25% per tahun']),
    );
  });

  it('formulir jadwal kunjungan: validasi per isian, tanggal tidak sebelum hari ini, pesan WhatsApp berurutan', () => {
    const today = '2026-10-28';
    expect(validateVisit(visit(), LISTING_NAMES, AGENT_NAMES, today)).toEqual({});
    expect(validateVisit(EMPTY_VISIT, LISTING_NAMES, AGENT_NAMES, today)).toEqual({ name: 'Tulis nama Anda.', date: 'Pilih tanggal kunjungan.' });
    expect(validateVisit(visit({ name: ' a ' }), LISTING_NAMES, AGENT_NAMES, today).name).toBe('Tulis nama Anda.');
    expect(validateVisit(visit({ date: '2026-10-27' }), LISTING_NAMES, AGENT_NAMES, today).date).toBe('Pilih tanggal hari ini atau sesudahnya.');
    expect(validateVisit(visit({ date: today }), LISTING_NAMES, AGENT_NAMES, today)).toEqual({});
    expect(validateVisit(visit({ date: '2027-02-30' }), LISTING_NAMES, AGENT_NAMES, today).date).toBe('Tanggal tidak valid.');
    expect(validateVisit(visit({ date: '14/11/2026' }), LISTING_NAMES, AGENT_NAMES, today).date).toBe('Tanggal tidak valid.');
    expect(validateVisit(visit({ listing: 'Rumah lain' }), LISTING_NAMES, AGENT_NAMES, today).listing).toBe('Pilih rumah dari daftar.');
    expect(validateVisit(visit({ listing: NO_LISTING }), LISTING_NAMES, AGENT_NAMES, today)).toEqual({});
    expect(validateVisit(visit({ agent: 'Orang lain' }), LISTING_NAMES, AGENT_NAMES, today).agent).toBe('Pilih agen dari daftar.');
    expect(validateVisit(visit({ agent: ANY_AGENT }), LISTING_NAMES, AGENT_NAMES, today)).toEqual({});
    expect(validateVisit(visit({ time: 'Malam' }), LISTING_NAMES, AGENT_NAMES, today).time).toBe('Pilih waktu kunjungan.');

    expect(visitMessage(visit({ note: 'Datang  berdua\ndengan anak.' }), 'HomeNest')).toBe(
      [
        'Halo HomeNest, saya ingin menjadwalkan kunjungan.',
        '',
        'Nama: Rina Kartika',
        'Rumah: Townhouse Laras',
        'Tanggal: Sabtu, 16 November 2030',
        'Waktu: Siang (12.00–15.00)',
        'Agen: Yoga Pratama',
        'Catatan: Datang berdua dengan anak.',
      ].join('\n'),
    );
    const short = visitMessage(visit({ listing: NO_LISTING, agent: ANY_AGENT, date: '2026-11-14', time: 'Pagi (09.00–12.00)' }), '');
    expect(short.split('\n')).toEqual([
      'Halo, saya ingin menjadwalkan kunjungan.',
      '',
      'Nama: Rina Kartika',
      'Rumah: Belum menentukan, mohon saran',
      'Tanggal: Sabtu, 14 November 2026',
      'Waktu: Pagi (09.00–12.00)',
      'Agen: Siapa saja',
    ]);
    expect(formatVisitDate('2026-10-28')).toBe('Rabu, 28 Oktober 2026');
    expect(formatVisitDate('2024-02-29')).toBe('Kamis, 29 Februari 2024');
    expect(formatVisitDate('2026-13-01')).toBe('');
    expect(formatVisitDate('')).toBe('');
    expect(todayIso(new Date(2026, 9, 28, 23, 59))).toBe('2026-10-28');
    expect(todayIso(new Date(2027, 0, 5))).toBe('2027-01-05');
    expect(cleanText('a\u0000b\u0007  c', 10)).toBe('a b c');
    expect(cleanText('x'.repeat(500), 300)).toHaveLength(300);
    expect(messageMailHref('pemasaran@homenest.test', 'Jadwal kunjungan', 'Baris 1\nBaris 2')).toBe(
      'mailto:pemasaran@homenest.test?subject=Jadwal%20kunjungan&body=Baris%201%0ABaris%202',
    );
    expect(messageMailHref('bukan email', 'x', 'y')).toBe('');
  });

  it('teks kecil: nomor HP berkelompok, nama besar footer tanpa PT/CV, ikon fasilitas otomatis', () => {
    expect(displayPhone('081234567890')).toBe('0812-3456-7890');
    expect(displayPhone('(021) 555-0182')).toBe('(021) 555-0182');
    expect(displayPhone('')).toBe('');
    expect(wordmarkOf('', 'HomeNest')).toBe('HomeNest');
    expect(wordmarkOf('', 'PT Sarang Hunian Lestari')).toBe('Sarang Hunian Lestari');
    expect(wordmarkOf('Sarang', 'PT Sarang Hunian Lestari')).toBe('Sarang');
    expect(wordmarkOf('', 'PT')).toBe('PT');
    expect((HOMES.amenities.items as { title: string }[]).map((i) => iconKey(i.title))).toEqual(['park', 'pool', 'security', 'mosque', 'school', 'train', 'road', 'market']);
    expect(iconKey('Rumah sakit')).toBe('hospital');
    expect(iconKey('Clubhouse')).toBe('club');
    expect(iconKey('Lapangan basket')).toBe('sport');
    expect(iconKey('Area bermain anak')).toBe('play');
    expect(iconKey('Sesuatu')).toBe('pin');
  });
});

describe('HomeNest: demo', () => {
  it('urutan section, satu H1, hero estate: foto latar LCP (eager, srcset, ukuran, alt) tanpa reveal, Ken Burns di wadah', () => {
    const container = demo();
    expect(sectionKeys(container)).toEqual([...ORDER, 'footer']);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const hero = section(container, 'hero');
    expect(hero.getAttribute('data-hero-layout')).toBe('estate');
    expect(hero.getAttribute('data-tpl-tone')).toBe('inverse');
    expect(hero.querySelector('h1')!.textContent).toBe('Rumah yang tenang, tak jauh dari kota');
    expect(hero.textContent).toContain('Bogor · Depok · Tangerang Selatan · Bekasi');
    const img = hero.querySelector<HTMLImageElement>('img[fetchpriority="high"]')!;
    expect(img.getAttribute('src')).toBe('/assets/templates/photos/homenest-hero-1920.webp');
    expect(img.getAttribute('srcset')).toContain(' 800w');
    expect(img.getAttribute('srcset')).toContain(' 1280w');
    expect(img.getAttribute('sizes')).toBe('100vw');
    expect(img.getAttribute('loading')).toBe('eager');
    expect(Number(img.getAttribute('width'))).toBe(1920);
    expect(Number(img.getAttribute('height'))).toBe(1080);
    expect(img.getAttribute('alt')!.split(' ').length).toBeGreaterThanOrEqual(5);
    // Foto = LATAR seluruh hero (absolute inset-0 di belakang teks), tidak pernah disembunyikan: tanpa Reveal, tanpa
    // kelas gerak di <img>; Ken Burns hanya di wadahnya
    expect(img.closest('.tpl-reveal')).toBeNull();
    expect(img.className).not.toMatch(/tpl-photo|hn-|opacity|clip/);
    const kenburns = img.closest('.hn-kenburns')!;
    expect(kenburns).not.toBeNull();
    expect(kenburns.className).toContain('absolute inset-0');
    // HP: foto sampai tepi atas panel cari (melebur ke hijau tua di belakang panel); ≥ @3xl seluruh hero
    expect(kenburns.parentElement!.className).toMatch(/\babsolute inset-x-0 top-0 bottom-\[230px\] .*@3xl:bottom-0/);
    expect(hero.querySelector('.hn-hero-scrim')).toHaveAttribute('aria-hidden', 'true');
    const eager = Array.from(container.querySelectorAll('img')).filter((i) => i.getAttribute('loading') !== 'lazy');
    expect(eager.map((i) => i.getAttribute('src'))).toEqual(['/assets/templates/photos/homenest-hero-1920.webp']);
  });

  it('panel cari di hero: Lokasi/Tipe/Harga dari data → saringan daftar rumah, gulir ke listing, fokus ke jumlah hasil', async () => {
    const container = demo();
    const hero = section(container, 'hero');
    const form = within(hero).getByRole('search', { name: 'Cari rumah' });
    expect(form.getAttribute('action')).toBeNull();
    const options = (label: string) => Array.from((within(form).getByLabelText(label) as HTMLSelectElement).options).map((o) => plain(o.textContent));
    expect(options('Lokasi')).toEqual(['Semua lokasi', 'Bogor', 'Depok', 'Tangerang Selatan', 'Bekasi']);
    expect(options('Tipe')).toEqual(['Semua tipe', 'Rumah', 'Townhouse', 'Kavling']);
    expect(options('Harga')).toEqual(['Semua harga', 'Di bawah Rp1 M', 'Rp1 M – Rp2 M', 'Rp2 M – Rp3 M', 'Di atas Rp3 M']);
    expect(form.className).toContain('@3xl:grid-cols-[1.15fr_1fr_1.15fr_auto]');
    const submit = within(form).getByRole('button', { name: 'Cari Rumah' });
    expect(submit).toHaveAttribute('type', 'submit');
    fireEvent.change(within(form).getByLabelText('Lokasi'), { target: { value: 'Bogor' } });
    fireEvent.change(within(form).getByLabelText('Tipe'), { target: { value: 'Rumah' } });
    // Belum dikirim → daftar belum tersaring
    const listings = section(container, 'listings');
    expect(within(listings).getByRole('status').textContent).toBe('9 rumah');
    act(() => {
      fireEvent.submit(form);
    });
    expect(scrolled).toEqual(['listings']);
    const status = within(listings).getByRole('status');
    expect(status.textContent).toBe('2 rumah dari 9');
    expect(Array.from(listings.querySelectorAll('article h3')).map((h) => h.textContent)).toEqual(['Rumah Teras Kenari', 'Rumah Pendopo Saga']);
    expect((within(listings).getByLabelText('Lokasi') as HTMLSelectElement).value).toBe('Bogor');
    expect((within(listings).getByLabelText('Tipe') as HTMLSelectElement).value).toBe('Rumah');
    expect(listings.querySelector('ul[data-filtered]')).toHaveAttribute('data-filtered', 'true');
    await wait(100);
    expect(status).toHaveFocus();
    expect(status).toHaveAttribute('tabindex', '-1');
    // role="status" sudah polite; aria-live eksplisit hanya untuk region keterangan pratinjau milik Shell (shell.test.tsx)
    expect(status).not.toHaveAttribute('aria-live');
  });

  it('header di atas foto: menu + tombol "Jadwalkan Kunjungan"; menu HP buka/tutup, Esc menutup dan fokus kembali', () => {
    const container = demo();
    const header = container.querySelector('header')!;
    expect(header.className).toContain('sticky');
    expect(header.querySelector('svg[viewBox="0 0 32 32"]'), 'HomeNestMark').not.toBeNull();
    // Paling atas: transparan di atas foto hero (teks krem, data-tpl-tone="inverse")
    expect(header.querySelector('[data-tpl-tone="inverse"]')!.className).toContain('bg-transparent');
    const nav = within(header).getByRole('navigation', { name: 'Menu utama' });
    expect(Array.from(nav.querySelectorAll('a')).map((a) => `${a.textContent}${a.getAttribute('href')}`)).toEqual([
      'Rumah#listings',
      'Tur#tour',
      'KPR#kpr',
      'Developer#developer',
      'Fasilitas#amenities',
      'Agen#agents',
      'Kontak#kontak',
    ]);
    fireEvent.click(within(nav).getByRole('link', { name: 'KPR' }));
    expect(scrolled).toEqual(['kpr']);
    expect(within(header).getAllByRole('link', { name: 'Jadwalkan Kunjungan' })[0]).toHaveAttribute('href', '#agents');
    const toggle = within(header).getByRole('button', { name: 'Buka menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle.className).toMatch(/\bh-11\b/);
    expect(toggle.className).toMatch(/\bw-11\b/);
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAccessibleName('Tutup menu');
    // Menu terbuka → bilah krem padat
    expect(header.querySelector('[data-tpl-tone="inverse"]')).toBeNull();
    expect(within(header).getAllByRole('navigation', { name: 'Menu utama' })).toHaveLength(2);
    const panel = document.getElementById(toggle.getAttribute('aria-controls')!)!;
    expect(panel).toHaveAttribute('aria-label', 'Menu utama');
    expect(within(panel).getAllByRole('link').map((a) => a.textContent)).toEqual(['Rumah', 'Tur', 'KPR', 'Developer', 'Fasilitas', 'Agen', 'Kontak', 'Jadwalkan Kunjungan']);
    fireEvent.click(within(panel).getByRole('link', { name: 'Fasilitas' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(scrolled).toEqual(['kpr', 'amenities']);
    fireEvent.click(toggle);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
    expect(within(header).getAllByRole('navigation', { name: 'Menu utama' })).toHaveLength(1);
  });

  it('daftar rumah: 6 kartu (3 di HP) + "Lihat semua 9 rumah", kartu lengkap, saringan & urutan, kosong → atur ulang', async () => {
    const container = demo();
    const listings = section(container, 'listings');
    const cards = () => Array.from(listings.querySelectorAll('article'));
    const names = () => cards().map((c) => c.querySelector('h3')!.textContent);
    expect(within(listings).getByRole('group', { name: 'Saring dan urutkan rumah' })).toBeInTheDocument();
    expect(within(listings).getByRole('status').textContent).toBe('9 rumah');
    expect(names()).toEqual(LISTING_NAMES.slice(0, 6));
    expect(listings.querySelector('ul[data-filtered]')).toHaveAttribute('data-filtered', 'false');
    // Kartu: chip status, klaster · kota, nama, harga singkat, spesifikasi singkat (kepanjangan untuk pembaca layar)
    const first = cards()[0];
    expect(first.textContent).toContain('Siap huni');
    expect(first.textContent).toContain('Klaster Kenari Asri · Bogor');
    expect(plain(first.querySelector('h3 + p')!.textContent)).toBe('Rp1,45 M');
    expect(Array.from(first.querySelectorAll('dl > div')).map((d) => `${d.querySelector('dt')!.textContent}=${d.querySelector('dd')!.textContent}`)).toEqual([
      'LTLuas tanah=120 m²',
      'LBLuas bangunan=96 m²',
      'KTKamar tidur=3',
      'KMKamar mandi=2',
    ]);
    expect(first.querySelector('dt .sr-only')!.textContent).toBe('Luas tanah');
    // Kavling: hanya luas tanah
    const kavling = cards()[4];
    expect(kavling.querySelectorAll('dl > div')).toHaveLength(1);
    expect(kavling.querySelector('dl')!.getAttribute('style')).toContain('repeat(1, minmax(0, 1fr))');
    const ask = within(first).getByRole('link', { name: 'Tanya unit: Rumah Teras Kenari (WhatsApp)' });
    expect(decode(ask)).toBe(`${WA}Halo HomeNest, saya tertarik dengan Rumah Teras Kenari (Klaster Kenari Asri, Bogor) seharga Rp1,45 M. Apakah masih tersedia?`);
    expect(within(first).getByRole('button', { name: 'Simulasi KPR: Rumah Teras Kenari' })).toHaveAttribute('type', 'button');
    // HP: kartu 4-6 disembunyikan lewat container query (halaman HP lebih pendek)
    const items = () => Array.from(listings.querySelectorAll<HTMLElement>('ul[data-filtered] > li'));
    expect(items().map((li) => li.className.includes('hidden @2xl:block'))).toEqual([false, false, false, true, true, true]);
    // Lihat semua → 9 kartu, fokus ke kartu pertama yang tadinya tersembunyi (jsdom tanpa CSS: kartu ke-7)
    const more = within(listings).getByRole('button', { name: 'Lihat semua 9 rumah' });
    expect(more.parentElement!.className).not.toContain('@2xl:hidden');
    fireEvent.click(more);
    expect(names()).toEqual(LISTING_NAMES);
    expect(items().some((li) => li.className.includes('hidden'))).toBe(false);
    expect(within(listings).queryByRole('button', { name: /Lihat semua/ })).toBeNull();
    await wait(10);
    expect(listings.querySelectorAll('ul[data-filtered] > li')[6]).toHaveFocus();
    // Saringan: Depok → 2 rumah, kartu bergerak muncul, "Atur ulang"
    fireEvent.change(within(listings).getByLabelText('Lokasi'), { target: { value: 'Depok' } });
    expect(names()).toEqual(['Rumah Taman Palem', 'Townhouse Nara']);
    expect(within(listings).getByRole('status').textContent).toBe('2 rumah dari 9');
    expect(listings.querySelector('ul[data-filtered]')).toHaveAttribute('data-filtered', 'true');
    expect(listings.querySelectorAll('li.hn-pop')).toHaveLength(2);
    fireEvent.change(within(listings).getByLabelText('Urutkan'), { target: { value: 'price-desc' } });
    expect(names()).toEqual(['Townhouse Nara', 'Rumah Taman Palem']);
    fireEvent.click(within(listings).getByRole('button', { name: 'Atur ulang' }));
    expect(within(listings).getByRole('status').textContent).toBe('9 rumah');
    expect((within(listings).getByLabelText('Urutkan') as HTMLSelectElement).value).toBe('featured');
    expect(within(listings).queryByRole('button', { name: 'Atur ulang' })).toBeNull();
    // Kosong → kotak bergaris + "Atur ulang filter" (urutan dipertahankan)
    fireEvent.change(within(listings).getByLabelText('Urutkan'), { target: { value: 'area-desc' } });
    fireEvent.change(within(listings).getByLabelText('Tipe'), { target: { value: 'Kavling' } });
    fireEvent.change(within(listings).getByLabelText('Harga'), { target: { value: 'r3' } });
    expect(cards()).toHaveLength(0);
    expect(within(listings).getByRole('status').textContent).toBe('Tidak ada rumah yang cocok');
    expect(listings.textContent).toContain('Belum ada rumah yang cocok dengan pilihan ini.');
    fireEvent.click(within(listings).getByRole('button', { name: 'Atur ulang filter' }));
    expect(cards().length).toBeGreaterThan(0);
    expect((within(listings).getByLabelText('Urutkan') as HTMLSelectElement).value).toBe('area-desc');
    expect(names()[0]).toBe('Rumah Pendopo Saga');
  });

  it('tombol "Simulasi KPR" di kartu mengisi harga ke kalkulator dan menggulir ke sana', () => {
    const container = demo();
    const listings = section(container, 'listings');
    const kpr = section(container, 'kpr');
    expect(within(kpr).getByText('Rp10.753.343')).toBeInTheDocument();
    fireEvent.click(within(listings).getByRole('button', { name: 'Simulasi KPR: Rumah Taman Palem' }));
    expect(scrolled).toEqual(['kpr']);
    expect((within(kpr).getByLabelText('Harga rumah') as HTMLInputElement).value).toBe('1.180.000.000');
    expect(within(kpr).getByText('Rp8.750.997')).toBeInTheDocument();
  });

  it('tur virtual: tab ruang (ARIA + panah/Home/End), satu foto aktif, tombol putar ke tautan tur di tab baru', () => {
    const container = demo();
    const tour = section(container, 'tour');
    expect(tour.getAttribute('data-tpl-tone')).toBe('inverse');
    const tablist = within(tour).getByRole('tablist', { name: 'Pilih ruang' });
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['01Ruang keluarga', '02Dapur & ruang makan', '03Kamar utama', '04Taman belakang']);
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false', 'false']);
    expect(tabs.map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1', '-1']);
    const panel = within(tour).getByRole('tabpanel');
    expect(panel).toHaveAttribute('aria-labelledby', tabs[0].id);
    for (const tab of tabs) expect(tab).toHaveAttribute('aria-controls', panel.id);
    // Foto ruang: hanya yang aktif terbaca (alt deskriptif); sisanya aria-hidden, alt kosong
    const photos = () => Array.from(panel.querySelectorAll<HTMLElement>('.hn-tour-img'));
    expect(photos().map((p) => p.getAttribute('data-active'))).toEqual(['true', 'false', 'false', 'false']);
    expect(photos()[0].querySelector('img')!.getAttribute('alt')!.split(' ').length).toBeGreaterThanOrEqual(5);
    for (const p of photos().slice(1)) {
      expect(p).toHaveAttribute('aria-hidden', 'true');
      expect(p.querySelector('img')).toHaveAttribute('alt', '');
    }
    expect(panel.textContent).toContain('Plafon tinggi dan cahaya dari dua sisi.');
    tabs[0].focus();
    fireEvent.keyDown(tabs[0], { key: 'ArrowDown' });
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveFocus();
    expect(panel).toHaveAttribute('aria-labelledby', tabs[1].id);
    expect(photos()[1]).toHaveAttribute('data-active', 'true');
    expect(panel.textContent).toContain('Dapur & ruang makan');
    fireEvent.keyDown(tabs[1], { key: 'End' });
    expect(tabs[3]).toHaveFocus();
    fireEvent.keyDown(tabs[3], { key: 'ArrowRight' });
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs[0], { key: 'ArrowUp' });
    expect(tabs[3]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs[3], { key: 'Home' });
    expect(tabs[0]).toHaveFocus();
    fireEvent.click(tabs[2]);
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    expect(panel.textContent).toContain('Kamar utama');
    const play = within(tour).getByRole('link', { name: 'Buka tur virtual' });
    expect(play).toHaveAttribute('href', 'https://example.com/virtual-tour');
    expect(play).toHaveAttribute('target', '_blank');
    expect(play).toHaveAttribute('rel', 'noopener noreferrer');
    expect(tour.textContent).toContain('Tautan tur pada demo ini hanya contoh.');
  });

  it('simulasi KPR: hasil awal Rp10.753.343/bulan, isian mengubah hasil, catatan jujur, WhatsApp berisi angka simulasi', () => {
    const container = demo();
    const kpr = section(container, 'kpr');
    expect(within(kpr).getByRole('form', { name: 'Isian simulasi KPR' }).getAttribute('action')).toBeNull();
    const price = within(kpr).getByLabelText('Harga rumah') as HTMLInputElement;
    expect(price.value).toBe('1.450.000.000');
    expect(price).toHaveAttribute('inputmode', 'numeric');
    const dp = within(kpr).getByLabelText('Uang muka') as HTMLInputElement;
    expect(dp.type).toBe('range');
    expect(dp.value).toBe('20');
    expect(dp).toHaveAttribute('aria-valuetext', '20 persen, Rp290.000.000');
    expect((within(kpr).getByLabelText('15 tahun') as HTMLInputElement).checked).toBe(true);
    expect(within(kpr).getAllByRole('radio').map((r) => (r as HTMLInputElement).value)).toEqual(['5', '10', '15', '20', '25']);
    expect((within(kpr).getByLabelText('Bunga per tahun') as HTMLInputElement).value).toBe('7,5');
    const panel = kpr.querySelector<HTMLElement>('[data-tpl-tone="inverse"]')!;
    expect(panel.className).toContain('bg-(--hn-deep)');
    expect(within(panel).getByText('Rp10.753.343')).toBeInTheDocument();
    expect(panel.querySelector('[aria-live="polite"]')!.textContent).toBe('Perkiraan angsuran Rp10.753.343 per bulan selama 15 tahun');
    const rows = () => Array.from(panel.querySelectorAll('dl > div')).map((d) => `${d.querySelector('dt')!.textContent}: ${d.querySelector('dd')!.textContent}`);
    expect(rows()).toEqual(['Pokok pinjaman: Rp1.160.000.000', 'Uang muka: Rp290.000.000', 'Total bunga (perkiraan): Rp775.601.740', 'Jumlah angsuran: 180 bulan']);
    expect(panel.textContent).toContain('bukan penawaran bank');
    const ask = within(panel).getByRole('link', { name: 'Tanya agen soal KPR' });
    expect(decode(ask)).toBe(`${WA}${kprMessage(kprSimulation({ price: 1_450_000_000, dpPercent: 20, years: 15, ratePercent: 7.5 }), 'HomeNest')}`);
    fireEvent.click(within(kpr).getByLabelText('20 tahun'));
    expect(within(panel).getByText('Rp9.344.881')).toBeInTheDocument();
    fireEvent.click(within(kpr).getByLabelText('15 tahun'));
    fireEvent.change(within(kpr).getByLabelText('Bunga per tahun'), { target: { value: '0' } });
    expect(within(panel).getByText('Rp6.444.444')).toBeInTheDocument();
    fireEvent.change(within(kpr).getByLabelText('Bunga per tahun'), { target: { value: '6,25%' } });
    expect((within(kpr).getByLabelText('Bunga per tahun') as HTMLInputElement).value).toBe('6,25');
    expect(within(panel).getByText('Rp9.946.105')).toBeInTheDocument();
    fireEvent.change(within(kpr).getByLabelText('Bunga per tahun'), { target: { value: '7,5' } });
    fireEvent.change(price, { target: { value: 'Rp2.000.000.000' } });
    expect(price.value).toBe('2.000.000.000');
    expect(within(panel).getByText('Rp14.832.198')).toBeInTheDocument();
    fireEvent.change(dp, { target: { value: '30' } });
    expect(rows()[1]).toBe('Uang muka: Rp600.000.000');
    expect(decode(within(panel).getByRole('link', { name: 'Tanya agen soal KPR' }))).toContain('Uang muka: 30% (Rp600.000.000)');
    fireEvent.change(price, { target: { value: '' } });
    expect(price.value).toBe('');
    expect(panel.querySelector('[aria-live="polite"]')!.textContent).toBe('Perkiraan angsuran Rp0 per bulan selama 15 tahun');
    expect(panel.textContent).not.toMatch(/NaN|Infinity|undefined/);
  });

  it('developer, fasilitas, cerita pembeli: garis rumah dekoratif, angka, proyek, nilai; ikon fasilitas; kutipan tanpa foto', () => {
    const container = demo();
    const developer = section(container, 'developer');
    expect(developer.textContent).toContain('PT Sarang Hunian Lestari');
    const draw = developer.querySelector('.hn-draw')!;
    expect(draw.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(draw.querySelectorAll('path[pathLength="1"]').length).toBeGreaterThanOrEqual(8);
    expect(Array.from(developer.querySelectorAll('dl > div')).map((d) => d.querySelector('dt')!.textContent)).toEqual(['Pengalaman', 'Klaster aktif', 'Rumah terbangun', 'Kota']);
    expect(developer.querySelector('dl')!.textContent).toContain('1.800+');
    expect(developer.querySelectorAll('img')).toHaveLength(3);
    expect(Array.from(developer.querySelectorAll('h3')).map((h) => h.textContent)).toEqual(['Jalan yang teduh', 'Sejuk alami', 'Progres terbuka']);
    const amenities = section(container, 'amenities');
    expect(amenities.querySelectorAll('li')).toHaveLength(8);
    expect(amenities.querySelectorAll('li svg[aria-hidden="true"]')).toHaveLength(8);
    expect(amenities.querySelectorAll('img')).toHaveLength(1);
    expect(amenities.textContent).toContain('12 menit');
    const testimonials = section(container, 'testimonials');
    expect(testimonials.querySelectorAll('figure')).toHaveLength(3);
    expect(testimonials.querySelectorAll('blockquote')).toHaveLength(3);
    expect(testimonials.querySelector('img')).toBeNull();
    expect(Array.from(testimonials.querySelectorAll('figcaption')).map((f) => f.textContent)).toEqual([
      'Raka & DindaPembeli di Depok',
      'Bu LestariPembeli di Bogor',
      'HendraPembeli di Tangerang Selatan',
    ]);
  });

  it('agen: monogram inisial (tanpa foto), tombol WhatsApp per agen; formulir kunjungan: galat + fokus, pesan WhatsApp, ubah data', () => {
    const container = demo();
    const agents = section(container, 'agents');
    expect(agents.querySelectorAll('img')).toHaveLength(0);
    const rows = Array.from(agents.querySelectorAll('ul > li'));
    expect(rows.map((li) => li.querySelector('span[aria-hidden]')!.textContent)).toEqual(['NP', 'YP', 'SA']);
    expect(decode(within(agents).getByRole('link', { name: 'Chat Nadia' }))).toBe(`${WA}Halo Nadia, saya ingin bertanya tentang rumah di Bogor & Depok.`);
    const formEl = within(agents).getByRole('form', { name: 'Jadwalkan kunjungan' });
    expect(formEl.getAttribute('action')).toBeNull();
    expect(formEl).toHaveAttribute('novalidate');
    expect(agents.textContent).toContain('data tidak disimpan di website');
    const listing = within(formEl).getByLabelText('Rumah yang diminati') as HTMLSelectElement;
    expect(Array.from(listing.options).map((o) => o.value)).toEqual([NO_LISTING, ...LISTING_NAMES]);
    const agentSelect = within(formEl).getByLabelText('Agen') as HTMLSelectElement;
    expect(Array.from(agentSelect.options).map((o) => o.value)).toEqual([ANY_AGENT, ...AGENT_NAMES]);
    const date = within(formEl).getByLabelText('Tanggal kunjungan') as HTMLInputElement;
    expect(date.type).toBe('date');
    expect(date.min).toBe(todayIso());
    // Kirim kosong → galat + fokus ke isian pertama yang salah
    act(() => {
      fireEvent.submit(formEl);
    });
    const name = within(formEl).getByLabelText('Nama');
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAttribute('aria-describedby', `${name.id}-error`);
    expect(document.getElementById(`${name.id}-error`)!.textContent).toBe('Tulis nama Anda.');
    expect(name).toHaveFocus();
    expect(formEl.textContent).toContain('Pilih tanggal kunjungan.');
    fireEvent.change(name, { target: { value: 'Rina Kartika' } });
    expect(name).not.toHaveAttribute('aria-invalid');
    fireEvent.change(listing, { target: { value: 'Townhouse Laras' } });
    fireEvent.change(date, { target: { value: '2030-11-16' } });
    fireEvent.click(within(formEl).getByLabelText(/^Siang/));
    fireEvent.change(agentSelect, { target: { value: 'Yoga Pratama' } });
    fireEvent.change(within(formEl).getByLabelText(/^Catatan/), { target: { value: 'Datang berdua.' } });
    expect(within(formEl).getByRole('button', { name: 'Susun pesan WhatsApp' })).toHaveAttribute('type', 'submit');
    act(() => {
      fireEvent.submit(formEl);
    });
    expect(within(agents).getByRole('heading', { level: 3, name: 'Pesan siap dikirim' })).toBeInTheDocument();
    const message = agents.querySelector('pre')!.textContent!;
    expect(message).toBe(
      [
        'Halo HomeNest, saya ingin menjadwalkan kunjungan.',
        '',
        'Nama: Rina Kartika',
        'Rumah: Townhouse Laras',
        'Tanggal: Sabtu, 16 November 2030',
        'Waktu: Siang (12.00–15.00)',
        'Agen: Yoga Pratama',
        'Catatan: Datang berdua.',
      ].join('\n'),
    );
    expect(decode(within(agents).getByRole('link', { name: 'Buka WhatsApp' }))).toBe(`${WA}${message}`);
    expect(agents.textContent).toContain('data tidak disimpan di website');
    fireEvent.click(within(agents).getByRole('button', { name: 'Ubah data' }));
    const again = within(agents).getByRole('form', { name: 'Jadwalkan kunjungan' });
    expect((within(again).getByLabelText('Nama') as HTMLInputElement).value).toBe('Rina Kartika');
    expect((within(again).getByLabelText('Rumah yang diminati') as HTMLSelectElement).value).toBe('Townhouse Laras');
  });

  it('akordeon tanya jawab: aria-expanded/aria-controls, panel role=region (inert saat tertutup), satu terbuka, tautan WhatsApp', () => {
    const faq = section(demo(), 'faq');
    const buttons = within(faq).getAllByRole('button');
    expect(buttons).toHaveLength(5);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'true');
    expect(buttons[0].closest('h3')).not.toBeNull();
    const region = document.getElementById(buttons[0].getAttribute('aria-controls')!)!;
    expect(region).toHaveAttribute('role', 'region');
    expect(region).toHaveAttribute('aria-labelledby', buttons[0].id);
    expect(region).toHaveAttribute('data-open', 'true');
    expect(region).not.toHaveAttribute('inert');
    fireEvent.click(buttons[2]);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'false');
    expect(buttons[2]).toHaveAttribute('aria-expanded', 'true');
    expect(region).toHaveAttribute('data-open', 'false');
    expect(region).toHaveAttribute('inert');
    fireEvent.click(buttons[2]);
    expect(buttons.every((b) => b.getAttribute('aria-expanded') === 'false')).toBe(true);
    expect(decode(within(faq).getByRole('link', { name: /Tanya lewat WhatsApp/ }))).toBe(`${WA}Halo HomeNest, saya ingin bertanya tentang rumah yang dijual.`);
    expect(faq.textContent).toContain('tidak lewat website ini');
  });

  it('kantor pemasaran: baris kontak bertautan (≥ 44px), peta; footer hijau tua dengan nama besar, menu, kontak, media sosial', () => {
    const container = demo();
    const contact = section(container, 'contact');
    expect(Array.from(contact.querySelectorAll('dt')).map((dt) => dt.textContent)).toEqual(['Alamat', 'Telepon', 'WhatsApp', 'Email', 'Jam buka']);
    expect(within(contact).getAllByRole('link', { name: '0812-3456-7890' }).map((a) => a.getAttribute('href'))).toEqual([
      'tel:+6281234567890',
      expect.stringMatching(/^https:\/\/wa\.me\/6281234567890\?text=/),
    ]);
    for (const link of within(contact).getAllByRole('link', { name: /0812-3456-7890|pemasaran@homenest\.test/ })) {
      expect(link.className).toContain('py-3.5');
      expect(link.className).toContain('-my-3.5');
    }
    expect(within(contact).getByRole('link', { name: 'pemasaran@homenest.test' })).toHaveAttribute('href', 'mailto:pemasaran@homenest.test');
    expect(contact.querySelector('iframe')!.getAttribute('title')).toBe('Peta lokasi HomeNest');
    expect(within(contact).getByRole('link', { name: 'Buka di Google Maps' }).getAttribute('href')).toMatch(/^https:\/\/(www\.)?google\.com\/maps/);
    // Nama tautan unik: "Chat WhatsApp" hanya tombol melayang Shell
    expect(within(container).getAllByRole('link', { name: 'Chat WhatsApp' })).toHaveLength(1);
    expect(
      Array.from(container.querySelectorAll('[data-tpl-section][data-tpl-tone="inverse"]')).map((el) => el.getAttribute('data-tpl-section')),
    ).toEqual(['hero', 'tour', 'footer']);
    const footer = container.querySelector('footer')!;
    expect(footer.getAttribute('data-tpl-section')).toBe('footer');
    expect(footer.className).toContain('bg-(--hn-deep)');
    expect(footer.textContent).toContain(`© ${new Date().getFullYear()} HomeNest`);
    expect(Array.from(footer.querySelectorAll('p[aria-hidden="true"]')).find((p) => p.textContent === 'HomeNest')).toBeDefined();
    expect(Array.from(within(footer).getByRole('navigation', { name: 'Tautan footer' }).querySelectorAll('a')).map((a) => a.getAttribute('href'))).toEqual([
      '#listings',
      '#tour',
      '#kpr',
      '#developer',
      '#amenities',
      '#agents',
      '#kontak',
    ]);
    for (const link of footer.querySelectorAll('a')) expect(link.className, link.textContent ?? '').toContain('min-h-11');
    expect(within(footer).getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://instagram.com/homenest.contoh');
    expect(within(footer).getByRole('link', { name: 'YouTube' })).toHaveAttribute('href', 'https://youtube.com/@homenest.contoh');
    expect(within(footer).getByRole('link', { name: 'TikTok' })).toHaveAttribute('href', 'https://tiktok.com/@homenest.contoh');
    expect(within(footer).queryByRole('link', { name: 'Facebook' })).toBeNull();
    expect(footer.textContent).toContain('Harga dan ketersediaan unit dapat berubah');
  });

  it('datar: tidak ada kelas shadow di template (kecuali tombol melayang Shell), sudut persegi, kode tanpa kiriman data', () => {
    const container = demo();
    const shadows = Array.from(container.querySelectorAll('[class*="shadow"]')).filter(
      (el) => !el.closest('[aria-label="Chat WhatsApp"]') && !/Chat WhatsApp|Kembali ke atas/.test(el.getAttribute('aria-label') ?? ''),
    );
    expect(shadows.map((el) => el.className)).toEqual([]);
    const src = source();
    expect(src).not.toMatch(/\bshadow-|box-shadow|text-shadow|drop-shadow/);
    // Sudut persegi: tanpa rounded-lg/xl/2xl/3xl di template (hanya tombol putar bundar)
    expect(src).not.toMatch(/rounded-(sm|md|lg|xl|2xl|3xl)\b/);
    expect(src.match(/rounded-full/g) ?? []).toHaveLength(1);
    // Kode (tanpa komentar): tanpa framer-motion/router, formulir & simulasi tidak mengirim atau menyimpan apa pun
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/framer-motion|useLocation|useParams|localStorage|sessionStorage|fetch\(|XMLHttpRequest|sendBeacon/);
    // Satu-satunya foto parallax di halaman: foto tegak fasilitas
    expect(code.match(/^\s*parallax\s*$/gm) ?? []).toHaveLength(1);
    // Tidak mengimpor dari folder template lain
    for (const [, from] of code.matchAll(/from '(\.\.\/[^']+)'/g)) expect(from, from).toMatch(/^\.\.\/(shared|kit|types)(\/|$)/);
  });
});

describe('HomeNest: gerak', () => {
  it('pratinjau CMS diam dan tanpa tautan wa.me terbuka', () => {
    const { container } = render(<def.Component content={resolveContent(def, null)} preview />);
    expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'off');
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    expect(container.querySelector('a[href^="javascript:"], a[href^="vbscript:"]')).toBeNull();
    // Hero tetap utuh di pratinjau: foto latar + panel cari
    expect(container.querySelector('[data-hero-layout="estate"] img[fetchpriority="high"]')).not.toBeNull();
    expect(within(container).getByRole('search', { name: 'Cari rumah' })).toBeInTheDocument();
  });

  it('homenest.css: animasi bergerbang [data-tpl-motion=\'on\'], blok reduced-motion & cetak, kelas hn-, Ken Burns skala-saja ≤ 1,06 sekali', () => {
    const css = readFileSync(resolve(ROOT, 'src/templates/homenest/homenest.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).toContain('@layer components');
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(css).toMatch(/@media print/);
    for (const rule of css.match(/^\s*[^@\s{}][^{}]*\{[^}]*\b(transition|animation):[^}]*\}/gm) ?? []) {
      const selector = rule.split('{')[0];
      if (/transition:\s*none|animation:\s*none/.test(rule)) continue;
      expect(selector, rule).toContain("[data-tpl-motion='on']");
    }
    for (const cls of css.match(/\.[a-z][\w-]*/g) ?? []) if (!/^\.(tpl-)/.test(cls)) expect(cls, cls).toMatch(/^\.hn-/);
    expect(css).not.toMatch(/infinite|box-shadow|text-shadow|drop-shadow/);
    // Ken Burns: hanya transform scale (tanpa opacity/clip), maks. 1,06, 12 dtk sekali (tanpa iteration-count)
    const kenburns = /@keyframes hn-kenburns\s*\{([\s\S]*?)\n\}/.exec(css)![1];
    expect(kenburns).not.toMatch(/opacity|clip|filter/);
    const scales = [...kenburns.matchAll(/scale\(([\d.]+)\)/g)].map((m) => Number(m[1]));
    expect(Math.max(...scales)).toBeLessThanOrEqual(1.06);
    expect(Math.min(...scales)).toBe(1);
    expect(css).toMatch(/\[data-tpl-motion='on'\] \.hn-kenburns \{\s*animation: hn-kenburns 12s [^;]*;/);
    // Durasi: garis rumah ≤ 1,6 dtk, kartu ≤ 300 ms, transisi UI ≤ 1 dtk
    for (const [, name, value, unit] of css.matchAll(/animation:\s*hn-([a-z]+)\s+([\d.]+)(m?s)/g)) {
      const ms = Number(value) * (unit === 's' ? 1000 : 1);
      if (name === 'kenburns') continue;
      expect(ms, name).toBeLessThanOrEqual(name === 'draw' ? 1600 : 300);
    }
    for (const [, value, unit] of css.matchAll(/transition:[^;]*?\s([\d.]+)(m?s)/g)) expect(Number(value) * (unit === 's' ? 1000 : 1)).toBeLessThanOrEqual(1000);
    // Keadaan diam = keadaan akhir: garis rumah utuh, foto tur aktif terlihat
    expect(css).toMatch(/\.hn-draw path\s*\{\s*stroke-dasharray: 1;\s*stroke-dashoffset: 0;/);
    expect(css).toMatch(/\.hn-tour-img\[data-active='true'\]\s*\{\s*opacity: 1;/);
  });
});

describe('HomeNest: warna tema bisa diganti', () => {
  it('hijau tua bawaan → --tpl-accent; warna CMS mengalir ke pita & teks aksen; teks di atas aksen kontras', () => {
    const base = demo();
    expect(rootStyle(base, '--tpl-accent')).toBe('#2e5141');
    expect(rootStyle(base, '--hn-deep')).toBe('#1e342a');
    expect(rootStyle(base, '--hn-ink')).toBe('#2e5141');
    cleanup();
    const red = demo({ brand: { accent_color: '#A61E3A' } });
    expect(rootStyle(red, '--tpl-accent')).toBe('#a61e3a');
    for (const name of ['--hn-deep', '--hn-ink']) expect(rootStyle(red, name), name).toBe((homenestVars('#A61E3A') as Record<string, string>)[name]);
    cleanup();
    expect(rootStyle(demo({ brand: { accent_color: '#FACC15' } }), '--tpl-on-accent')).toBe('#121620');
  });
});

describe('HomeNest: SEO situs pembeli, judul, gambar, tautan', () => {
  it('judul tab & meta description dari nama, tagline, dan deskripsi hero; theme-color = aksen', () => {
    expect(siteTitle('homenest', null)).toBe('HomeNest — Jual Rumah di Bogor, Depok, Tangsel & Bekasi');
    expect(siteTitle('homenest', null).length).toBeLessThanOrEqual(60);
    const restore = applySiteHead('homenest', null);
    const description = document.head.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
    expect(description).toMatch(/^Pilihan rumah, townhouse, dan kavling/);
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(200);
    expect(document.head.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#2E5141');
    restore();
  });

  it('satu H1, tiap section diawali tepat satu H2, H3 hanya di bawah H2, tanpa h4–h6; judul kosong → H2 sr-only', () => {
    const container = demo();
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelectorAll('h4, h5, h6')).toHaveLength(0);
    const check = (root: HTMLElement) => {
      for (const key of ORDER.filter((k) => k !== 'hero')) {
        const levels = Array.from(section(root, key).querySelectorAll('h1, h2, h3')).map((h) => h.tagName);
        expect(levels[0], key).toBe('H2');
        expect(levels.filter((l) => l === 'H2'), key).toHaveLength(1);
      }
    };
    check(container);
    expect(section(container, 'hero').querySelector('h2, h3')).toBeNull();
    cleanup();
    const untitled = demo(Object.fromEntries(ORDER.filter((k) => k !== 'hero').map((k) => [k, { title: '' }])));
    check(untitled);
    expect(ORDER.filter((k) => k !== 'hero').map((k) => section(untitled, k).querySelector('h2')!.textContent)).toEqual([
      'Daftar rumah',
      'Tur virtual',
      'Simulasi KPR',
      'PT Sarang Hunian Lestari',
      'Fasilitas kawasan',
      'Cerita pembeli',
      'Hubungi agen',
      'Tanya jawab',
      'Kantor pemasaran',
    ]);
    for (const k of ORDER.filter((key) => key !== 'hero')) expect(section(untitled, k).querySelector('h2'), k).toHaveClass('sr-only');
    // Judul hero kosong → nama perusahaan (tetap satu H1)
    cleanup();
    expect(section(demo({ hero: { title: '' } }), 'hero').querySelector('h1')!.textContent).toBe('HomeNest');
  });

  it('gambar: alt deskriptif (foto ruang tersembunyi alt kosong), width/height, srcset & sizes', () => {
    const container = demo();
    const imgs = Array.from(container.querySelectorAll('img'));
    // hero + 6 kartu + 4 ruang tur + 3 proyek + 1 fasilitas
    expect(imgs).toHaveLength(15);
    for (const img of imgs) {
      const src = img.getAttribute('src') ?? '';
      expect(img.hasAttribute('alt'), src).toBe(true);
      expect(Number(img.getAttribute('width')), src).toBeGreaterThan(0);
      expect(Number(img.getAttribute('height')), src).toBeGreaterThan(0);
      expect(img.getAttribute('srcset'), src).toMatch(/ 800w, /);
      expect(img.getAttribute('sizes'), src).toBeTruthy();
      const alt = img.getAttribute('alt')!;
      if (img.closest('[aria-hidden="true"]')) expect(alt, src).toBe('');
      else expect(alt.split(' ').length, src).toBeGreaterThanOrEqual(5);
    }
  });

  it('tautan asli untuk navigasi, tombol hanya untuk aksi (kecuali kirim formulir); SVG dekoratif tersembunyi', () => {
    const container = demo();
    for (const a of container.querySelectorAll('a')) expect(a.getAttribute('href'), a.textContent ?? '').toMatch(/^(#[a-z]|https:\/\/|mailto:|tel:)/);
    for (const button of container.querySelectorAll('button')) {
      const submit = !!button.closest('form') && /Cari Rumah|Susun pesan/.test(button.textContent ?? '');
      expect(button.getAttribute('type'), button.textContent ?? '').toBe(submit ? 'submit' : 'button');
    }
    for (const svg of container.querySelectorAll('svg')) expect(svg.closest('[aria-hidden="true"], [aria-hidden=""]') ?? svg.getAttribute('aria-hidden'), svg.outerHTML.slice(0, 60)).toBeTruthy();
  });
});

describe('HomeNest: konten opsional kosong', () => {
  it('tanpa rumah → listing & menu "Rumah" hilang, panel cari diganti tombol kunjungan', () => {
    const container = demo({ listings: { items: [] } });
    expect(sectionKeys(container)).not.toContain('listings');
    const hero = section(container, 'hero');
    expect(within(hero).queryByRole('search')).toBeNull();
    expect(within(hero).getByRole('link', { name: 'Jadwalkan Kunjungan' })).toHaveAttribute('href', '#agents');
    expect(Array.from(container.querySelector('header nav')!.querySelectorAll('a')).map((a) => a.textContent)).not.toContain('Rumah');
    // Formulir kunjungan: hanya "Belum menentukan"
    const listing = within(section(container, 'agents')).getByLabelText('Rumah yang diminati') as HTMLSelectElement;
    expect(Array.from(listing.options).map((o) => o.value)).toEqual([NO_LISTING]);
  });

  it('tanpa batas harga → tanpa saringan harga (panel cari 2 isian); harga kosong → "Harga menyusul" tanpa simulasi', () => {
    const container = demo({
      listings: {
        price_steps: '',
        items: [
          { title: 'Rumah A', city: 'Bogor', type: 'Rumah', price: '', image: '/assets/templates/photos/homenest-kenari-1200.webp' },
          { title: 'Rumah B', city: 'Depok', type: 'Rumah', price: '1,2 M', lt: '90', image: '' },
        ],
      },
    });
    const hero = section(container, 'hero');
    const form = within(hero).getByRole('search', { name: 'Cari rumah' });
    expect(within(form).queryByLabelText('Harga')).toBeNull();
    expect(form.className).toContain('@3xl:grid-cols-[1fr_1fr_auto]');
    const listings = section(container, 'listings');
    expect(within(listings).queryByLabelText('Harga')).toBeNull();
    expect(within(listings).getByLabelText('Urutkan')).toBeInTheDocument();
    const [a, b] = Array.from(listings.querySelectorAll('article'));
    expect(a.textContent).toContain('Harga menyusul');
    expect(within(a).queryByRole('button', { name: /Simulasi KPR/ })).toBeNull();
    expect(a.querySelector('dl')).toBeNull();
    expect(plain(b.querySelector('h3 + p')!.textContent)).toBe('Rp1,2 M');
    expect(within(b).getByRole('button', { name: 'Simulasi KPR: Rumah B' })).toBeInTheDocument();
    // Foto kartu kosong → tanpa <img>, kartu tetap utuh
    expect(b.querySelector('img')).toBeNull();
    expect(within(listings).queryByRole('button', { name: /Lihat semua/ })).toBeNull();
  });

  it('KPR disembunyikan → tanpa tombol simulasi di kartu dan tanpa menu KPR; label tombol kartu kosong → tombol hilang', () => {
    const container = demo({ kpr: { enabled: false }, listings: { ask_label: '' } });
    expect(sectionKeys(container)).not.toContain('kpr');
    const listings = section(container, 'listings');
    expect(within(listings).queryByRole('button', { name: /Simulasi KPR/ })).toBeNull();
    expect(within(listings).queryByRole('link', { name: /Tanya unit/ })).toBeNull();
    expect(Array.from(container.querySelector('header nav')!.querySelectorAll('a')).map((a) => a.textContent)).not.toContain('KPR');
  });

  it('tur: satu ruang → tanpa tab; tanpa tautan → tanpa tombol putar; ruang tanpa foto → section hilang', () => {
    const one = section(demo({ tour: { rooms: [{ name: 'Ruang keluarga', caption: 'Terang.', image: '/assets/templates/photos/homenest-tour-keluarga-1600.webp' }], url: '' } }), 'tour');
    expect(within(one).queryByRole('tablist')).toBeNull();
    expect(within(one).queryByRole('tabpanel')).toBeNull();
    expect(within(one).queryByRole('link')).toBeNull();
    expect(one.querySelectorAll('img')).toHaveLength(1);
    cleanup();
    expect(sectionKeys(demo({ tour: { rooms: [{ name: 'Tanpa foto', image: '' }] } }))).not.toContain('tour');
  });

  it('developer tanpa proyek/angka/nilai, fasilitas tanpa foto, agen kosong → tata letak menyesuaikan', () => {
    const container = demo({
      developer: { projects: [], stats: [], values: [] },
      amenities: { image: '' },
      agents: { items: [] },
    });
    const developer = section(container, 'developer');
    expect(developer.querySelector('img')).toBeNull();
    expect(developer.querySelector('dl')).toBeNull();
    expect(developer.querySelector('h3')).toBeNull();
    const amenities = section(container, 'amenities');
    expect(amenities.querySelector('img')).toBeNull();
    expect(amenities.querySelector('ul')!.className).toContain('@5xl:grid-cols-4');
    const agents = section(container, 'agents');
    expect(agents.querySelector('ul')).toBeNull();
    expect(agents.querySelector('form')!.closest('.tpl-reveal')!.className).toContain('@5xl:col-start-3');
    expect(Array.from((within(agents).getByLabelText('Agen') as HTMLSelectElement).options).map((o) => o.value)).toEqual([ANY_AGENT]);
  });

  it('tanpa WhatsApp → formulir menyusun email; tanpa WhatsApp & email → salin pesan; tautan FAQ & tombol KPR hilang', () => {
    const fill = (formEl: HTMLElement) => {
      fireEvent.change(within(formEl).getByLabelText('Nama'), { target: { value: 'Rina' } });
      fireEvent.change(within(formEl).getByLabelText('Tanggal kunjungan'), { target: { value: '2030-11-16' } });
      act(() => {
        fireEvent.submit(formEl);
      });
    };
    const container = demo({ contact: { whatsapp: '' } });
    const agents = section(container, 'agents');
    const formEl = within(agents).getByRole('form', { name: 'Jadwalkan kunjungan' });
    expect(within(formEl).getByRole('button', { name: 'Susun pesan' })).toHaveAttribute('type', 'submit');
    expect(within(agents).queryByRole('link', { name: /^Chat / })).toBeNull();
    fill(formEl);
    expect(within(agents).getByRole('link', { name: 'Kirim lewat email' }).getAttribute('href')).toMatch(
      /^mailto:pemasaran@homenest\.test\?subject=Jadwal%20kunjungan&body=Halo%20HomeNest/,
    );
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    expect(within(section(container, 'faq')).queryByRole('link', { name: /Tanya lewat WhatsApp/ })).toBeNull();
    expect(within(section(container, 'kpr')).queryByRole('link', { name: 'Tanya agen soal KPR' })).toBeNull();
    cleanup();
    const bare = section(demo({ contact: { whatsapp: '', email: '' } }), 'agents');
    fill(within(bare).getByRole('form'));
    expect(within(bare).getByRole('button', { name: 'Salin pesan' })).toBeInTheDocument();
    // Agen dengan nomor sendiri: pesan kunjungan ke nomor agen itu
    cleanup();
    const own = section(demo({ agents: { items: [{ name: 'Nadia Prameswari', area: 'Bogor', whatsapp: '081122223333' }] } }), 'agents');
    expect(within(own).getByRole('link', { name: 'Chat Nadia' }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/6281122223333\?text=/);
    const ownForm = within(own).getByRole('form');
    fireEvent.change(within(ownForm).getByLabelText('Agen'), { target: { value: 'Nadia Prameswari' } });
    fill(ownForm);
    expect(within(own).getByRole('link', { name: 'Buka WhatsApp' }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/6281122223333\?text=/);
  });

  it('header & footer: tanpa label tombol → tanpa tombol; tanpa media sosial; section mati keluar dari halaman & menu', () => {
    const container = demo({
      hero: { header_label: '' },
      footer: { instagram: '', youtube: '', tiktok: '' },
      faq: { enabled: false },
      testimonials: { items: [] },
      developer: { enabled: false },
    });
    expect(within(container.querySelector('header')!).queryByRole('link', { name: 'Jadwalkan Kunjungan' })).toBeNull();
    const footer = container.querySelector('footer')!;
    expect(footer.textContent).not.toContain('Media sosial');
    for (const key of ['faq', 'testimonials', 'developer']) expect(sectionKeys(container), key).not.toContain(key);
    expect(Array.from(container.querySelector('header nav')!.querySelectorAll('a')).map((a) => a.getAttribute('href'))).not.toContain('#developer');
    cleanup();
    expect(demo({ footer: { enabled: false } }).querySelector('footer')).toBeNull();
  });
});

describe('HomeNest: editor CMS', () => {
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

describe('HomeNest: data katalog', () => {
  const MIGRATION = 'database/migrations/2026-10-28_048_homenest_template.sql';
  const sql = () => readFileSync(resolve(ROOT, MIGRATION), 'utf8');

  it('migrasi 048: baris homenest dengan template_code, kategori baru, harga, pratinjau .webp, fitur, salinan jujur', () => {
    const text = sql();
    expect(text).toContain("'homenest'");
    expect(text).toContain("'Properti & Real Estate'");
    expect(text).toContain('1690000.00');
    expect(text).toContain("'/assets/templates/homenest-preview.webp'");
    expect(text).toContain('\'["/assets/templates/homenest-1.webp","/assets/templates/homenest-2.webp"]\'');
    expect(text).toMatch(/bukan penawaran bank/);
    expect(text).toMatch(/data tidak disimpan di website/);
    expect(text).toMatch(/Tidak ada tur 360° bawaan/);
    expect(text).not.toMatch(/termasuk domain|domain, hosting|SHM dijamin|pasti naik|dijamin|garansi|terbaik/i);
    expect(text).toMatch(/kategori baru; halaman kategorinya ditambahkan di kode yang sama/);
    const features = JSON.parse(/features\s+= '(\[[^']*\])'/.exec(text)![1]) as string[];
    expect(features.length).toBeGreaterThanOrEqual(6);
    expect(features.length).toBeLessThanOrEqual(8);
    expect(features[features.length - 1]).toBe('Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)');
    // Berkas galeri yang disebut migrasi benar-benar ada
    const gallery = JSON.parse(/gallery\s+= '(\[[^']*\])'/.exec(text)![1]) as string[];
    for (const url of gallery) expect(existsSync(publicFile(url)), url).toBe(true);
  });

  it('migrasi 048 aman diulang (INSERT IGNORE + UPDATE berdasarkan slug, tanpa DELETE) dan tercatat di schema_migrations', () => {
    const raw = sql();
    expect(raw).toMatch(/Domain\s+(--\s+)?tidak termasuk harga template/);
    expect(raw).toMatch(/FIKTIF/);
    expect(raw).toMatch(/Unsplash/);
    expect(raw).toMatch(/SETELAH kode/);
    expect(raw).toMatch(/MENIMPA perubahan admin/);
    const text = raw.replace(/^--.*$/gm, '');
    expect(text).toMatch(/INSERT IGNORE INTO templates/);
    expect(text).toMatch(/WHERE slug = 'homenest';/);
    expect(text).toMatch(/sort_order\s+= 31/);
    expect(text).toMatch(/status\s+= 'published'/);
    expect(text).not.toMatch(/\bDELETE\b|\bDROP\b|\bTRUNCATE\b/i);
    expect(text).toContain("VALUES ('2026-10-28_048', 'templates: katalog HomeNest')");
  });

  it('gambar pratinjau katalog ada di public/, 1600×1000, VP8/VP8X, dan ringan', () => {
    for (const name of ['homenest-preview', 'homenest-1', 'homenest-2']) {
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

  it('halaman katalog: judul ≤ 60 huruf, deskripsi dengan kalimat domain tetap, H1, salinan jujur', () => {
    const title = (catalogSeo.title ?? '').replace('{nama}', 'HomeNest').replace('{harga_singkat}', 'Rp1,69 jt');
    expect(title).toBe('HomeNest: Template Website Jual Rumah & Properti – Rp1,69 jt');
    expect(title.length).toBeLessThanOrEqual(60);
    expect(catalogSeo.description).toMatch(/^.{1,69} \{harga\} sudah termasuk hosting & SSL tahun pertama; domain mulai \{domain_mulai\}\/tahun\.$/);
    expect(catalogSeo.niche).toBe('Properti');
    expect(catalogSeo.updated).toBe('2026-10-28');
    expect(catalogPage.h1).toBe('{nama}: Template Website Properti dan Jual Rumah');
    expect(catalogPage.niche).toBe('properti');
    const text = JSON.stringify(catalogContent);
    expect(text).toMatch(/fiktif/);
    expect(text).toMatch(/bukan penawaran bank/);
    expect(text).toMatch(/data tidak disimpan di website/);
    expect(text).toMatch(/[Tt]idak ada tur 360° bawaan/);
    expect(text).not.toMatch(/\b(dijamin|garansi|terbaik nomor|rating \d|bintang \d|#1)\b|SHM dijamin|pasti naik|1\.690\.000|termasuk domain/i);
    expect(text).not.toMatch(/\d+ (hari|jam) kerja/);
    expect(catalogContent.guides).toEqual(['template-vs-jasa-website-custom', 'biaya-website-company-profile']);
  });
});

describe('HomeNest: konten aneh', () => {
  it('angka, null, dan string di tempat list tidak membuat crash; tautan & gambar berbahaya dibuang', () => {
    const weird = {
      hero: { image: 'javascript:alert(1)', header_url: 'javascript:alert(1)', subtitle: 7 },
      listings: { items: [null, 'x', { title: 3 }, { title: 'Rumah A', price: 'abc', lt: {}, image: 'javascript:alert(1)' }], price_steps: 7 },
      tour: { rooms: 'x', url: 'javascript:alert(1)' },
      kpr: { default_price: {}, default_rate: 'abc', default_tenor: null },
      developer: { stats: 'x', projects: [{ image: 'javascript:alert(1)', name: 'P' }], values: [null] },
      amenities: { items: [null, { title: 'Taman' }], image: 'vbscript:x' },
      testimonials: { items: 5 },
      agents: { items: [{ name: 'Agen', whatsapp: 'abc' }, 'x'] },
      faq: { items: [{ question: 2, answer: null }], link_url: 'vbscript:x' },
      contact: { whatsapp: 'abc', maps_url: 'javascript:alert(1)' },
      footer: { instagram: 'javascript:alert(1)' },
      brand: { accent_color: 'oranye' },
    } as unknown as SiteContent;
    const { container } = render(<def.Component content={resolveContent(def, weird)} />);
    expect(container.querySelector('a[href^="javascript:"], a[href^="vbscript:"]')).toBeNull();
    expect(container.querySelector('img[src^="javascript:"], img[src^="vbscript:"]')).toBeNull();
    expect(container.querySelector('h1')!.textContent).toBe('Rumah yang tenang, tak jauh dari kota');
    expect(section(container, 'listings').textContent).toContain('Rumah A');
    expect(section(container, 'listings').textContent).toContain('Harga menyusul');
    // List rusak → isi bawaan (resolveContent); tautan tur berbahaya → tanpa tombol putar
    expect(within(section(container, 'tour')).queryByRole('link')).toBeNull();
    expect(section(container, 'kpr').textContent).not.toMatch(/NaN|undefined|Infinity/);
    expect(container.textContent).not.toMatch(/NaN|\[object Object\]/);
    expect(rootStyle(container, '--hn-deep')).toBe('#1e342a');
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
