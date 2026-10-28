// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/paynow.test.tsx
// PayNow (landing page dompet digital & payment gateway, batch 2026-10-28): skema CMS & konten demo, foto, salinan
// jujur (tanpa klaim izin/pengawasan/sertifikasi, baris legal fiktif, "Contoh tarif"), helper model (palet gradasi dari
// satu warna, menu, tujuan tautan, simulasi biaya dengan pembulatan, formulir merchant → pesan WhatsApp, pewarnaan kode),
// demo (urutan section, hero wallet, header + menu HP, tab fitur & tab kode dengan papan ketik, simulasi biaya, salin
// kode, akordeon, formulir), datar tanpa bayangan, gerak (pratinjau CMS diam, CSS pn- bergerbang data-tpl-motion), warna
// tema, SEO situs pembeli, judul & gambar & tautan, konten opsional kosong, editor CMS, data katalog (migrasi 043 +
// pratinjau), halaman katalog, dan konten aneh.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionEditor } from '../../pages/account/cms/SectionEditor';
import { validateContent } from '../../pages/account/cms/validation';
import { content as pageContent } from '../../content/templates/paynow.content';
import { page as pageCopy, seo as seoCopy } from '../../content/templates/paynow';
import { content as finovaPage } from '../../content/templates/finova.content';
import { TEMPLATES, resolveContent } from '../index';
import { businessIcon, paymentIcon, screenKind, securityIcon } from '../paynow/icons';
import {
  DEFAULT_CATEGORIES,
  EMPTY_MERCHANT,
  MAX_AMOUNT,
  PAGE_SECTIONS,
  accentIsDark,
  cleanText,
  codeLines,
  codeSamples,
  displayPhone,
  endpoints,
  feeOf,
  feeRates,
  formatPercent,
  formatRupiah,
  formatThousands,
  greetingInitial,
  isCredit,
  merchantCategories,
  merchantMailHref,
  merchantMessage,
  methodTone,
  navItems,
  parseAmount,
  parsePercent,
  parseRate,
  parseRupiah,
  paynowPalette,
  paynowVars,
  rateLabel,
  readPaynow,
  sectionShown,
  sectionTarget,
  simulateFee,
  tokenizeLine,
  validateMerchant,
  type FeeRate,
  type MerchantForm,
} from '../paynow/model';
import { PAYNOW_PHOTOS } from '../paynow/photos';
import { applySiteHead, siteTitle } from '../siteHead';
import { SiteRenderer } from '../SiteRenderer';
import { accentVars, contrast, parseHex } from '../shared/utils';
import { isListField, type ListItem, type SiteContent } from '../types';

// Demo panjang + getByRole di jsdom: bisa lewat 5 dtk saat suite berjalan paralel
vi.setConfig({ testTimeout: 30_000 });

const ROOT = process.cwd();
const DIR = resolve(ROOT, 'src/templates/paynow');
const def = TEMPLATES.paynow;
const ORDER = ['hero', 'trust', 'features', 'fees', 'security', 'developers', 'stats', 'testimonials', 'faq', 'download', 'contact'];
const LEGAL = 'PayNow adalah merek contoh (fiktif). Cantumkan nama badan usaha, izin, dan lembaga pengawas Anda di sini.';
const sectionKeys = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-tpl-section]')).map((s) => s.getAttribute('data-tpl-section'));
const section = (root: HTMLElement, key: string) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`)!;
const demo = (content: unknown = null, preview = false) => render(<SiteRenderer templateCode="paynow" content={content} preview={preview} />).container;
// Pratinjau CMS (gerak mati): angka langsung nilai akhir, marquee statis
const still = (content: unknown = null) => render(<def.Component content={resolveContent(def, content as SiteContent)} preview />).container;
const rgb = (hex: string) => parseHex(hex)!;
const publicFile = (url: string) => resolve(ROOT, 'public', url.replace(/^\//, ''));
const rootStyle = (container: HTMLElement, name: string) => {
  const holder = Array.from(container.querySelectorAll<HTMLElement>('[style]')).find((el) => el.style.getPropertyValue(name));
  return holder?.style.getPropertyValue(name) ?? '';
};
const urls = (src: string) => {
  const asset = PAYNOW_PHOTOS.asset(src)!;
  return [asset.src, ...asset.srcSet!.split(',').map((part) => part.trim().split(' ')[0])].filter((u, i, all) => all.indexOf(u) === i);
};
const text = (el: Element | null) => el?.textContent ?? '';
const sourceFiles = () => readdirSync(DIR).filter((f) => /\.(tsx?|css)$/.test(f));
const source = () => sourceFiles().map((f) => readFileSync(resolve(DIR, f), 'utf8')).join('\n');
const demoRates = () => feeRates(resolveContent(def, null).fees);
const merchant = (patch: Partial<MerchantForm> = {}): MerchantForm => ({
  ...EMPTY_MERCHANT,
  name: 'Rina Kartika',
  business: 'Kedai Kopi Senja',
  category: 'Makanan & minuman',
  city: 'Bandung',
  ...patch,
});
const CATEGORIES = ['Makanan & minuman', 'Toko retail', 'Jasa', 'Toko online', 'Pendidikan', 'Lainnya'];
const ACCENTS = ['#4B3FE4', '#1D4ED8', '#7C3AED', '#FACC15', '#10B981', '#0EA5E9', '#E11D48', '#FFFFFF', '#000000', '#C6F135', '#6EE7B7', '#A61E3A', '#F4C534'];

let scrolled: (string | null)[] = [];
beforeEach(() => {
  scrolled = [];
  Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
    scrolled.push(this.getAttribute('data-tpl-section'));
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('PayNow: skema & konten bawaan', () => {
  it('urutan form = urutan halaman, semua section bisa disembunyikan, field unik, list & teks berbatas', () => {
    expect(def.code).toBe('paynow');
    expect(def.name).toBe('PayNow');
    expect(def.features).toBeUndefined();
    expect(def.sections.map((s) => s.key)).toEqual(['brand', ...ORDER, 'footer']);
    expect([...PAGE_SECTIONS]).toEqual([...ORDER, 'footer']);
    const fields = (key: string) => def.sections.find((s) => s.key === key)!.fields.map((f) => f.key);
    expect(fields('brand')).toEqual(['company_name', 'tagline', 'logo', 'accent_color']);
    expect(def.sections[0].fields.find((f) => f.key === 'accent_color')?.type).toBe('color');
    expect(fields('hero')).toEqual(
      expect.arrayContaining(['image', 'highlight', 'primary_label', 'secondary_label', 'header_label', 'chips', 'balance', 'actions', 'transactions', 'notifications']),
    );
    expect(fields('fees')).toEqual(expect.arrayContaining(['table_label', 'rates', 'default_amount', 'note']));
    expect(fields('developers')).toEqual(expect.arrayContaining(['endpoints', 'steps', 'samples', 'note', 'link_url']));
    expect(fields('contact')).toEqual(expect.arrayContaining(['address', 'maps_url', 'phone', 'email', 'whatsapp', 'whatsapp_message', 'hours', 'form_categories']));
    expect(fields('footer')).toEqual(expect.arrayContaining(['legal', 'instagram', 'facebook', 'linkedin', 'youtube', 'tiktok']));
    const contact = def.sections.find((s) => s.key === 'contact')!;
    expect(contact.fields.find((f) => f.key === 'whatsapp')?.type).toBe('phone');
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
          for (const sub of f.fields) if (['text', 'textarea'].includes(sub.type)) expect(sub.maxLength, `${s.key}.${f.key}.${sub.key}`).toBeGreaterThan(0);
        } else if (['text', 'textarea', 'phone', 'email'].includes(f.type)) {
          expect(f.maxLength, `${s.key}.${f.key}`).toBeGreaterThan(0);
        }
      }
    }
    // Batas yang disebut di halaman katalog (paynow.content.ts) dan dipakai model (ITEMS)
    expect(max).toEqual({
      'hero.chips': 3,
      'hero.actions': 4,
      'hero.transactions': 3,
      'hero.notifications': 3,
      'trust.items': 16,
      'features.items': 5,
      'fees.rates': 6,
      'security.items': 6,
      'developers.endpoints': 6,
      'developers.steps': 4,
      'developers.samples': 4,
      'stats.items': 4,
      'testimonials.items': 6,
      'faq.items': 8,
      'contact.form_categories': 8,
    });
    const parts = JSON.stringify(pageContent.parts);
    for (const phrase of ['Hingga 16 chip', 'Hingga 5 tab', 'Hingga 6 contoh tarif', 'hingga 6 fitur keamanan', 'Hingga 6 endpoint, 4 langkah', 'hingga 4 angka', 'Hingga 6 kartu cerita', 'Hingga 8 pertanyaan', 'hingga 3 transaksi', 'hingga 3 kartu notifikasi']) {
      expect(parts, phrase).toContain(phrase);
    }
  });

  it('konten demo lolos validasi CMS, logo kosong, semua foto terdaftar, ada di public/, tercatat di CREDITS.md, dan dipakai', () => {
    const c = def.defaultContent;
    expect(validateContent(def, resolveContent(def, null))).toEqual({});
    expect(c.brand.logo).toBe('');
    expect(c.brand.accent_color).toBe('#4B3FE4');
    expect(c.contact.whatsapp).toBe('081234567890');
    expect(c.hero.image).toBe('/assets/templates/photos/paynow-hero-1920.webp');
    for (const s of def.sections) if (s.key !== 'brand') expect(c[s.key].enabled, s.key).toBe(true);
    const photos = JSON.stringify(c).match(/\/assets\/templates\/photos\/[a-z0-9-]+\.webp/g) ?? [];
    for (const src of photos) expect(PAYNOW_PHOTOS.asset(src), src).not.toBeNull();
    expect(PAYNOW_PHOTOS.keys).toHaveLength(14);
    for (const key of PAYNOW_PHOTOS.keys) {
      expect(key.startsWith('paynow-'), key).toBe(true);
      for (const url of urls(PAYNOW_PHOTOS.src(key))) expect(existsSync(publicFile(url)), url).toBe(true);
      expect(photos, `${key} dipakai di konten demo`).toContain(PAYNOW_PHOTOS.src(key));
      expect(PAYNOW_PHOTOS.alt(PAYNOW_PHOTOS.src(key), '').split(' ').length, key).toBeGreaterThanOrEqual(5);
    }
    // Simbol bawaan juga tersedia sebagai SVG mandiri, path sama dengan komponen
    const mark = readFileSync(publicFile('/assets/templates/logos/paynow-mark.svg'), 'utf8');
    const component = readFileSync(resolve(DIR, 'marks.tsx'), 'utf8');
    const paths = mark.match(/ d="[^"]+"/g) ?? [];
    expect(paths).toHaveLength(1);
    for (const d of paths) expect(component, d).toContain(d.trim());
    expect(mark).toMatch(/viewBox="0 0 32 32"/);
    expect(mark).toMatch(/width="32" height="32"/);
    expect(mark).toMatch(/role="img"/);
    expect(mark).toMatch(/<title>/);
    expect(mark).toMatch(/fill="currentColor"/);
    // Judul tab situs pembeli ≤ 60 karakter, deskripsi hero 120–155 karakter, H1 ≤ 9 kata
    expect(`${c.brand.company_name} — ${c.brand.tagline}`.length).toBeLessThanOrEqual(60);
    expect(String(c.hero.subtitle).length).toBeGreaterThanOrEqual(120);
    expect(String(c.hero.subtitle).length).toBeLessThanOrEqual(155);
    expect(String(c.hero.title).split(/\s+/).length).toBeLessThanOrEqual(9);
    expect(String(c.hero.title)).toContain(String(c.hero.highlight));
  });

  it('CREDITS.md mencantumkan setiap kunci foto', () => {
    // CREDITS.md gets this template's section at integration
    const credits = readFileSync(resolve(ROOT, 'public/assets/templates/photos/CREDITS.md'), 'utf8');
    for (const key of PAYNOW_PHOTOS.keys) expect(credits, key).toContain(`\`${key}-*\``);
  });

  it('foto demo ringan: hero 800/1280/1920, WebP ≤ 140 KB per file, 800w ≤ 90 KB, total ≤ 2,5 MB', () => {
    expect(PAYNOW_PHOTOS.asset(def.defaultContent.hero.image as string)!.srcSet).toBe(
      '/assets/templates/photos/paynow-hero-800.webp 800w, /assets/templates/photos/paynow-hero-1280.webp 1280w, /assets/templates/photos/paynow-hero-1920.webp 1920w',
    );
    let total = 0;
    for (const key of PAYNOW_PHOTOS.keys) {
      for (const url of urls(PAYNOW_PHOTOS.src(key))) {
        expect(url, url).toMatch(/\.webp$/);
        const file = readFileSync(publicFile(url));
        expect(file.toString('ascii', 0, 4) + file.toString('ascii', 8, 12), url).toBe('RIFFWEBP');
        const kb = statSync(publicFile(url)).size / 1024;
        expect(kb, url).toBeLessThanOrEqual(140);
        if (url.endsWith('-800.webp')) expect(kb, url).toBeLessThanOrEqual(90);
        total += kb;
      }
    }
    expect(total).toBeLessThanOrEqual(2500);
  });

  it('salinan demo jujur: merek fiktif, contoh tarif & kode, tanpa klaim izin/pengawasan/sertifikasi atau janji', () => {
    const c = def.defaultContent;
    const all = JSON.stringify(c);
    expect(all).not.toMatch(
      /dijamin|garansi|pasti |terbaik|nomor 1|#1|termurah|100%|berizin|diawasi|Bank Indonesia|\bOJK\b|PCI[ -]?DSS|terdaftar di|bersertifikat|sertifikasi|\bISO\b/i,
    );
    expect(c.footer.legal).toBe(LEGAL);
    expect(c.fees.table_label).toBe('Contoh tarif');
    expect(c.fees.note).toMatch(/^Contoh tarif untuk simulasi/);
    expect(c.developers.note).toBe('Contoh kode untuk ilustrasi; alamat API dan kunci di atas tidak aktif.');
    expect(c.stats.note).toBe('Angka contoh untuk merek fiktif.');
    expect(c.contact.form_text).toMatch(/hanya menyusun pesan WhatsApp/);
    expect(c.contact.form_text).toMatch(/data tidak disimpan di website/);
    // Alamat contoh: email .test, API di domain .example (tidak aktif), tautan toko/dokumentasi example.com
    expect(c.contact.email).toMatch(/\.test$/);
    for (const item of c.developers.samples as ListItem[]) {
      const code = String(item.code);
      expect(code, String(item.label)).toContain('https://api.paynow.example/v1/charges');
      expect(code, String(item.label)).toContain('PAYNOW_SECRET_KEY');
      expect(code, String(item.label)).not.toMatch(/\b(sk|pk)_(live|test)_|Bearer [A-Za-z0-9]{16,}/);
      expect(code.length, String(item.label)).toBeLessThanOrEqual(1600);
    }
    for (const key of ['play_url', 'app_url']) expect(String(c.download[key]), key).toMatch(/^https:\/\/example\.com\//);
    expect(String(c.developers.link_url)).toMatch(/^https:\/\/example\.com\//);
    // Teks singkat: kartu ≤ 120 huruf, kepala section satu kalimat
    for (const [key, list, prop] of [
      ['features', 'items', 'text'],
      ['security', 'items', 'text'],
      ['testimonials', 'items', 'quote'],
    ] as const) {
      for (const item of c[key][list] as ListItem[]) expect(String(item[prop]).length, `${key}.${prop}`).toBeLessThanOrEqual(120);
    }
    for (const key of ['features', 'fees', 'security', 'developers', 'faq', 'download', 'contact']) {
      const sub = String(c[key].subtitle ?? '');
      expect(sub.replace(/[.?!]$/, ''), `${key}.subtitle`).not.toMatch(/[.!]\s/);
    }
  });
});

describe('PayNow: helper model', () => {
  it('palet dari satu warna: gradasi biru → tema → ungu (putih ≥ 4,5:1), malam ≥ 16:1, glow ≥ 7:1, lavender; tidak valid → bawaan', () => {
    expect(paynowPalette('#4B3FE4')).toEqual({ night: '#110f3a', blue: '#2b6de1', band: '#4b3fe4', violet: '#9e3fe4', glow: '#aea9f3', mist: '#f6f5fe' });
    const white = rgb('#ffffff');
    const ink = rgb('#0E0F2C');
    const muted = rgb('#4B4E6D');
    for (const accent of ACCENTS) {
      const p = paynowPalette(accent);
      for (const stop of [p.blue, p.band, p.violet]) expect(contrast(rgb(stop), white), `${accent} ${stop}`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(rgb(p.night), white), accent).toBeGreaterThanOrEqual(16);
      expect(contrast(rgb(p.glow), rgb(p.night)), accent).toBeGreaterThanOrEqual(7);
      expect(contrast(rgb(p.mist), ink), accent).toBeGreaterThanOrEqual(15);
      expect(contrast(rgb(p.mist), muted), accent).toBeGreaterThanOrEqual(7);
      // Lapisan hero di sisi teks ≥ 80% malam: walau piksel foto putih, teks putih ≥ 7:1
      const night = rgb(p.night);
      const scrim = night.map((c) => Math.round(c * 0.8 + 255 * 0.2)) as [number, number, number];
      expect(contrast(scrim, white), accent).toBeGreaterThanOrEqual(7);
      // Gradasi memakai tiga titik yang sama
      expect((paynowVars(accent) as Record<string, string>)['--pn-grad']).toBe(`linear-gradient(115deg, ${p.blue} 0%, ${p.band} 52%, ${p.violet} 100%)`);
    }
    expect(paynowPalette('zzz')).toEqual(paynowPalette('#4B3FE4'));
    expect(paynowPalette('')).toEqual(paynowPalette('#4B3FE4'));
    expect(accentIsDark('#4B3FE4')).toBe(true);
    expect(accentIsDark('#FACC15')).toBe(false);
  });

  it('warna teks tema (--pn-ink) ≥ 4,5:1 di putih, lavender, dan lencana metode untuk warna apa pun', () => {
    for (const accent of ACCENTS) {
      const vars = paynowVars(accent) as Record<string, string>;
      const shell = accentVars(accent, '#4B3FE4') as Record<string, string>;
      const pnInk = rgb(vars['--pn-ink']);
      expect(contrast(pnInk, rgb('#ffffff')), accent).toBeGreaterThanOrEqual(4.5);
      expect(contrast(pnInk, rgb(vars['--pn-mist'])), accent).toBeGreaterThanOrEqual(4.5);
      expect(contrast(pnInk, rgb(shell['--tpl-accent-100'])), accent).toBeGreaterThanOrEqual(4.5);
    }
    // Warna bawaan: tinta = warna tema itu sendiri (tampilan demo tidak berubah)
    expect((paynowVars('#4B3FE4') as Record<string, string>)['--pn-ink']).toBe('#4b3fe4');
  });

  it('menu: label pendek dari label section, section kosong atau mati keluar dari menu', () => {
    const content = resolveContent(def, null);
    expect(navItems(content).map((i) => `${i.key}:${i.label}`)).toEqual([
      'features:Fitur',
      'fees:Biaya',
      'security:Keamanan',
      'developers:Developer',
      'faq:FAQ',
      'download:Unduh',
    ]);
    const less = resolveContent(def, {
      features: { eyebrow: 'Fitur utama' },
      fees: { eyebrow: 'Tarif' },
      developers: { enabled: false },
      faq: { items: [] },
      download: { title: '', play_url: '', app_url: '' },
    });
    expect(navItems(less).map((i) => `${i.key}:${i.label}`)).toEqual(['features:Fitur utama', 'fees:Tarif', 'security:Keamanan']);
  });

  it('tujuan tautan: anchor Indonesia dan kunci section; section tersembunyi → cadangan', () => {
    expect(sectionTarget('#biaya')).toBe('fees');
    expect(sectionTarget('#fitur')).toBe('features');
    expect(sectionTarget('api')).toBe('developers');
    expect(sectionTarget('#merchant')).toBe('contact');
    expect(sectionTarget('#kontak')).toBe('contact');
    expect(sectionTarget('#unduh')).toBe('download');
    expect(sectionTarget('#beranda')).toBe('hero');
    expect(sectionTarget('#tidak-ada')).toBeNull();
    const m = readPaynow(resolveContent(def, null));
    expect(m.linkOr('#biaya', null)).toEqual({ kind: 'section', target: 'fees' });
    expect(m.linkOr('#tidak-ada', m.contactAction)).toEqual({ kind: 'section', target: 'contact' });
    expect(m.linkOr('https://contoh.test/daftar', null)).toEqual({ kind: 'external', href: 'https://contoh.test/daftar' });
    expect(m.primaryAction).toEqual({ kind: 'section', target: 'download' });
    expect(m.secondaryAction).toEqual({ kind: 'section', target: 'fees' });
    expect(m.headerAction).toEqual({ kind: 'section', target: 'contact' });
    expect(m.companyName).toBe('PayNow');
    expect(m.stores.map((s) => `${s.label}:${s.href}`)).toEqual(['Google Play:https://example.com/paynow-android', 'App Store:https://example.com/paynow-ios']);
    // Tanpa Unduh → tombol utama ke Daftar merchant; tanpa simulasi biaya → tombol kedua ke Daftar merchant
    const noDownload = readPaynow(resolveContent(def, { download: { enabled: false }, fees: { rates: [] } }));
    expect(noDownload.primaryAction).toEqual({ kind: 'section', target: 'contact' });
    expect(noDownload.secondaryAction).toEqual({ kind: 'section', target: 'contact' });
    expect(noDownload.linkOr('#unduh', null)).toBeNull();
    // Daftar merchant mati → WhatsApp; tanpa nomor → tidak ada tombol
    const hidden = readPaynow(resolveContent(def, { contact: { enabled: false } }));
    expect(hidden.headerAction?.kind).toBe('external');
    expect(hidden.headerAction && 'href' in hidden.headerAction ? hidden.headerAction.href : '').toMatch(/^https:\/\/wa\.me\/6281234567890\?text=/);
    const silent = readPaynow(resolveContent(def, { contact: { enabled: false, whatsapp: '' } }));
    expect(silent.headerAction).toBeNull();
    // Tautan toko tidak aman/kosong → tombol disembunyikan
    const unsafe = readPaynow(resolveContent(def, { download: { play_url: 'javascript:alert(1)', app_url: '' } }));
    expect(unsafe.stores).toEqual([]);
  });

  it('section tampil hanya bila berisi', () => {
    const content = resolveContent(def, null);
    for (const key of ORDER) expect(sectionShown(content, key), key).toBe(true);
    const empty = resolveContent(def, {
      trust: { items: [] },
      features: { items: [{ title: 'tanpa label' }] },
      fees: { rates: [{ name: 'QRIS' }, { percent: '1' }] },
      security: { items: [{ text: 'tanpa judul' }] },
      developers: { samples: [{ label: 'cURL' }], endpoints: [{ method: 'GET' }] },
      stats: { items: [{ label: 'tanpa angka' }] },
      testimonials: { items: [{ name: 'tanpa kutipan' }] },
      faq: { items: [] },
      download: { title: '', play_url: '', app_url: '' },
    });
    for (const key of ['trust', 'features', 'fees', 'security', 'developers', 'stats', 'testimonials', 'faq', 'download']) expect(sectionShown(empty, key), key).toBe(false);
    expect(sectionShown(content, 'tidak-ada')).toBe(false);
    expect(sectionShown(resolveContent(def, { contact: { enabled: false } }), 'contact')).toBe(false);
    // Developer cukup salah satu: contoh kode ATAU endpoint
    expect(sectionShown(resolveContent(def, { developers: { samples: [] } }), 'developers')).toBe(true);
    expect(sectionShown(resolveContent(def, { developers: { endpoints: [] } }), 'developers')).toBe(true);
  });

  it('simulasi biaya: tarif dari CMS, label tarif, biaya dibulatkan ke rupiah, nominal kosong/aneh/terlalu besar', () => {
    expect(parsePercent('0,7')).toBe(0.7);
    expect(parsePercent('0.7%')).toBe(0.7);
    expect(parsePercent('2,9 %')).toBe(2.9);
    expect(parsePercent('')).toBe(0);
    expect(parsePercent('abc')).toBe(0);
    expect(parsePercent('-1')).toBe(0);
    expect(parsePercent('150')).toBe(100);
    expect(parseRupiah('Rp2.000')).toBe(2000);
    expect(parseRupiah('Rp 4.000')).toBe(4000);
    expect(parseRupiah('4000')).toBe(4000);
    expect(parseRupiah('')).toBe(0);
    expect(parseRupiah('x')).toBe(0);
    expect(parseRupiah('99999999999999')).toBe(MAX_AMOUNT);
    expect(parseAmount('250.000')).toBe(250000);
    expect(formatThousands(1250000)).toBe('1.250.000');
    expect(formatRupiah(1250000)).toBe('Rp1.250.000');
    expect(formatRupiah(0)).toBe('Rp0');
    expect(formatRupiah(-5)).toBe('Rp0');
    expect(formatRupiah(Number.NaN)).toBe('Rp0');
    expect(formatPercent(0.7)).toBe('0,7%');
    expect(formatPercent(2)).toBe('2%');

    const rates = demoRates();
    expect(rates.map((r) => r.name)).toEqual(['QRIS', 'Virtual account', 'Kartu debit & kredit', 'E-wallet lain', 'Gerai minimarket']);
    expect(rates.map(rateLabel)).toEqual(['0,7%', 'Rp4.000', '2,9% + Rp2.000', '1,5%', 'Rp5.000']);
    expect(parseRate({ name: '', percent: '1' })).toBeNull();
    expect(parseRate({ name: 'Tunai' })).toBeNull();
    expect(parseRate({ name: 'Tunai', percent: '0', flat: '0' })).toBeNull();
    expect(parseRate({ name: 'Paylater', percent: '2,5%', flat: 'Rp1.500' })).toEqual({ name: 'Paylater', percent: 2.5, flat: 1500 });

    const [qris, va, card] = rates;
    expect(feeOf(250000, qris)).toBe(1750);
    expect(feeOf(0, qris)).toBe(0);
    expect(feeOf(-100, card)).toBe(0);
    // Pembulatan ke rupiah terdekat: 12.357 × 0,7% = 86,499 → 86; 12.358 × 0,7% = 86,506 → 87
    expect(feeOf(12357, qris)).toBe(86);
    expect(feeOf(12358, qris)).toBe(87);
    expect(feeOf(99999, card)).toBe(4900);
    expect(feeOf(250000, card)).toBe(9250);
    expect(feeOf(1, va)).toBe(4000);

    expect(simulateFee(250000, qris, 'merchant')).toEqual({ fee: 1750, paid: 250000, received: 248250 });
    expect(simulateFee(250000, qris, 'customer')).toEqual({ fee: 1750, paid: 251750, received: 250000 });
    expect(simulateFee(250000, card, 'merchant')).toEqual({ fee: 9250, paid: 250000, received: 240750 });
    // Biaya tetap lebih besar dari nominal: merchant tidak menerima angka negatif
    expect(simulateFee(2500, va, 'merchant')).toEqual({ fee: 4000, paid: 2500, received: 0 });
    expect(simulateFee(2500, va, 'customer')).toEqual({ fee: 4000, paid: 6500, received: 2500 });
    expect(simulateFee(0, va, 'customer')).toEqual({ fee: 0, paid: 0, received: 0 });
    expect(simulateFee(Number.NaN, qris, 'merchant')).toEqual({ fee: 0, paid: 0, received: 0 });
    expect(simulateFee(5e9, qris, 'merchant')).toEqual({ fee: 7_000_000, paid: 1_000_000_000, received: 993_000_000 });
    expect(simulateFee(1000.6, null, 'merchant')).toEqual({ fee: 0, paid: 1001, received: 1001 });
    // Baris tarif rusak dibuang, maks. 6
    const many = Array.from({ length: 9 }, (_, i) => ({ name: `Metode ${i}`, percent: '1' }));
    expect(feeRates({ rates: [...many] } as unknown as SiteContent['fees'])).toHaveLength(6);
    expect(feeRates({ rates: [{ name: 'A', percent: 'x' }, null, 5, { name: 'B', flat: '1000' }] } as unknown as SiteContent['fees']).map((r: FeeRate) => r.name)).toEqual(['B']);
  });

  it('formulir merchant: validasi per isian, pesan WhatsApp berurutan, pilihan di luar daftar → "Belum tahu", catatan kosong tidak ikut', () => {
    expect(validateMerchant(merchant(), CATEGORIES)).toEqual({});
    expect(validateMerchant(EMPTY_MERCHANT, CATEGORIES)).toEqual({
      name: 'Tulis nama Anda.',
      business: 'Tulis nama usaha.',
      category: 'Pilih jenis usaha.',
      city: 'Tulis kota usaha.',
    });
    expect(validateMerchant(merchant({ name: ' a ' }), CATEGORIES).name).toBe('Tulis nama Anda.');
    expect(validateMerchant(merchant({ category: 'Bukan pilihan' }), CATEGORIES).category).toBe('Pilih jenis usaha.');
    expect(validateMerchant(merchant({ city: '   ' }), CATEGORIES).city).toBe('Tulis kota usaha.');

    const full = merchantMessage(
      merchant({ volume: '100–1.000', service: 'QRIS di kasir', note: 'Butuh QRIS  untuk\ndua kasir.' }),
      'PayNow',
    );
    expect(full).toBe(
      [
        'Halo PayNow, saya ingin mendaftar sebagai merchant.',
        '',
        'Nama: Rina Kartika',
        'Nama usaha: Kedai Kopi Senja',
        'Jenis usaha: Makanan & minuman',
        'Kota: Bandung',
        'Transaksi per bulan: 100–1.000',
        'Layanan yang diminati: QRIS di kasir',
        'Catatan: Butuh QRIS untuk dua kasir.',
      ].join('\n'),
    );
    const short = merchantMessage(merchant({ volume: 'Satu juta', service: '<b>x</b>' }), '');
    expect(short).toBe(
      [
        'Halo, saya ingin mendaftar sebagai merchant.',
        '',
        'Nama: Rina Kartika',
        'Nama usaha: Kedai Kopi Senja',
        'Jenis usaha: Makanan & minuman',
        'Kota: Bandung',
        'Transaksi per bulan: Belum tahu',
        'Layanan yang diminati: Belum tahu',
      ].join('\n'),
    );
    expect(cleanText('a\u0000b\u0007  c', 10)).toBe('a b c');
    expect(cleanText('x'.repeat(500), 300)).toHaveLength(300);
    expect(merchantMailHref('merchant@paynow.test', 'Baris 1\nBaris 2')).toBe(
      'mailto:merchant@paynow.test?subject=Pendaftaran%20merchant&body=Baris%201%0ABaris%202',
    );
    expect(merchantMailHref('bukan email', 'x')).toBe('');
    expect(merchantCategories(resolveContent(def, null).contact)).toEqual(CATEGORIES);
    expect(merchantCategories({ form_categories: [{ label: 'Jasa' }, { label: 'Jasa' }, { label: '' }] } as unknown as SiteContent['contact'])).toEqual(['Jasa']);
    expect(merchantCategories({ form_categories: 'x' } as unknown as SiteContent['contact'])).toEqual([...DEFAULT_CATEGORIES]);
  });

  it('contoh kode: pewarnaan hanya membagi teks (gabungan = baris asli), "https://" bukan komentar; baris dirapikan', () => {
    const samples = codeSamples(resolveContent(def, null).developers);
    expect(samples.map((s) => s.label)).toEqual(['cURL', 'Node.js', 'PHP']);
    expect(endpoints(resolveContent(def, null).developers).map((e) => `${e.method} ${e.path}`)).toEqual([
      'POST /v1/charges',
      'GET /v1/charges/{id}',
      'POST /v1/qris',
      'POST /v1/refunds',
    ]);
    for (const sample of samples) {
      for (const line of codeLines(String(sample.code))) expect(tokenizeLine(line).map((t) => t.text).join(''), line).toBe(line);
    }
    expect(tokenizeLine('curl https://api.paynow.example/v1/charges \\')).toEqual([{ kind: 'plain', text: 'curl https://api.paynow.example/v1/charges \\' }]);
    expect(tokenizeLine('console.log(data.status); // "pending"')).toEqual([
      { kind: 'plain', text: 'console.log(data.status); ' },
      { kind: 'comment', text: '// "pending"' },
    ]);
    expect(tokenizeLine('"amount": 45000,')).toEqual([
      { kind: 'string', text: '"amount"' },
      { kind: 'plain', text: ': ' },
      { kind: 'number', text: '45000' },
      { kind: 'plain', text: ',' },
    ]);
    expect(tokenizeLine('# komentar')).toEqual([{ kind: 'comment', text: '# komentar' }]);
    expect(tokenizeLine('<script>alert(1)</script>').map((t) => t.text).join('')).toBe('<script>alert(1)</script>');
    expect(codeLines('a\r\n\tb  \r\n\n')).toEqual(['a', '  b']);
    expect(codeLines(Array.from({ length: 80 }, (_, i) => `baris ${i}`).join('\n'))).toHaveLength(60);
    expect(codeLines('')).toEqual(['']);
  });

  it('teks kecil & ikon otomatis', () => {
    expect(displayPhone('081234567890')).toBe('0812-3456-7890');
    expect(displayPhone('(021) 555-0148')).toBe('(021) 555-0148');
    expect(displayPhone('')).toBe('');
    expect(isCredit('+Rp500.000')).toBe(true);
    expect(isCredit('−Rp45.000')).toBe(false);
    expect(methodTone('post')).toBe('post');
    expect(methodTone('PATCH')).toBe('post');
    expect(methodTone('GET')).toBe('get');
    expect(methodTone('DELETE')).toBe('other');
    expect(greetingInitial('Halo, Rani')).toBe('R');
    expect(greetingInitial('')).toBe('P');
    expect(['QRIS', 'Transfer', 'Tagihan', 'Top-up', 'Token listrik', 'Pulsa', 'Lainnya'].map(paymentIcon)).toEqual(['qris', 'transfer', 'bill', 'topup', 'bolt', 'phone', 'topup']);
    expect(['QRIS', 'Transfer', 'Tagihan', 'Top-up', 'Pulsa'].map(screenKind)).toEqual(['qris', 'transfer', 'bill', 'topup', 'generic']);
    expect(
      ['Kedai kopi', 'Warung makan', 'Toko kelontong', 'Apotek', 'Bengkel motor', 'Laundry', 'Salon & barbershop', 'Toko online', 'Kantin kantor', 'Toko buah', 'Percetakan', 'Kursus & les', 'Lainnya'].map(
        businessIcon,
      ),
    ).toEqual(['coffee', 'food', 'basket', 'pill', 'wrench', 'shirt', 'scissors', 'bag', 'food', 'fruit', 'printer', 'school', 'store']);
    expect(['PIN 6 digit', 'Biometrik', 'Notifikasi real-time', 'Enkripsi data', 'Lainnya'].map(securityIcon)).toEqual(['pin', 'fingerprint', 'bell', 'lock', 'shield']);
  });
});

describe('PayNow: demo', () => {
  it('urutan section, satu H1, hero wallet: foto latar LCP (eager, srcset, ukuran, alt) tanpa animasi, mockup HP + notifikasi', () => {
    const container = demo();
    expect(sectionKeys(container)).toEqual([...ORDER, 'footer']);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const hero = section(container, 'hero');
    expect(hero.getAttribute('data-hero-layout')).toBe('wallet');
    expect(hero.getAttribute('data-tpl-tone')).toBe('inverse');
    expect(text(hero.querySelector('h1'))).toBe('Bayar apa saja, cukup dari satu aplikasi');
    expect(text(hero.querySelector('h1 span'))).toBe('satu aplikasi');
    const img = hero.querySelector<HTMLImageElement>('img[fetchpriority="high"]')!;
    expect(img.getAttribute('src')).toBe('/assets/templates/photos/paynow-hero-1920.webp');
    expect(img.getAttribute('srcset')).toContain(' 800w');
    expect(img.getAttribute('srcset')).toContain(' 1280w');
    expect(img.getAttribute('srcset')).toContain(' 1920w');
    expect(img.getAttribute('loading')).toBe('eager');
    expect(img.getAttribute('sizes')).toBe('100vw');
    expect(Number(img.getAttribute('width'))).toBe(1920);
    expect(Number(img.getAttribute('height'))).toBe(1080);
    expect(img.getAttribute('alt')!.split(' ').length).toBeGreaterThanOrEqual(5);
    // Foto latar mengisi hero (bukan kolom), TIDAK di dalam <Reveal>, tanpa zoom/parallax/kelas gerak pn-
    expect(img.closest('.tpl-reveal')).toBeNull();
    expect(img.closest('.pn-phone-in, .pn-notif, .pn-swap, .pn-sheen')).toBeNull();
    expect(img.className).not.toMatch(/tpl-photo|pn-/);
    expect(img.parentElement!.className).toContain('absolute inset-0');
    expect(hero.querySelector('.pn-hero-scrim')).toHaveAttribute('aria-hidden', 'true');
    // Mockup HP dari HTML (tanpa gambar), teks nyata dari CMS
    const phone = hero.querySelector('[data-pn-phone="hero"]')!;
    expect(phone.className).toContain('pn-phone-in');
    expect(phone.querySelector('img')).toBeNull();
    expect(within(phone as HTMLElement).getByRole('figure', { name: 'Contoh tampilan aplikasi' })).toBeInTheDocument();
    expect(phone.textContent).toContain('Halo, Rani');
    expect(phone.textContent).toContain('Saldo PayNow');
    expect(phone.textContent).toContain('Rp2.450.000');
    expect(phone.textContent).toContain('Transaksi terakhir');
    expect(phone.textContent).toContain('+Rp500.000');
    const notes = within(hero).getByRole('list', { name: 'Contoh notifikasi' });
    const items = Array.from(notes.querySelectorAll<HTMLElement>('[data-pn-notif]'));
    expect(items.map((li) => li.textContent)).toEqual([
      'Pembayaran QRIS berhasilRp45.000 ke Kopi Senja',
      'Uang masukRp150.000 dari Dimas',
      'Token listrik terbayarRp100.000 · token terkirim',
    ]);
    // Muncul berurutan lalu diam (jeda < 3 dtk); HP sempit: hanya kartu pertama
    expect(items.map((li) => li.style.getPropertyValue('--pn-at'))).toEqual(['0.9s', '1.4s', '1.9s']);
    expect(items[0].className).not.toMatch(/(^|\s)hidden(\s|$)/);
    for (const li of items.slice(1)) expect(li.className).toContain('hidden @5xl:block');
    expect(Array.from(hero.querySelectorAll('ul')).find((ul) => ul.textContent === 'PIN & biometrikNotifikasi real-timeBantuan 24 jam')).toBeDefined();
    expect(within(hero).getByRole('link', { name: 'Unduh aplikasi' })).toHaveAttribute('href', '#download');
    expect(within(hero).getByRole('link', { name: 'Untuk merchant' })).toHaveAttribute('href', '#fees');
    const eager = Array.from(container.querySelectorAll('img')).filter((i) => i.getAttribute('loading') !== 'lazy');
    expect(eager.map((i) => i.getAttribute('src'))).toEqual(['/assets/templates/photos/paynow-hero-1920.webp']);
    expect(container.querySelectorAll('img[fetchpriority="high"]')).toHaveLength(1);
  });

  it('header transparan di atas foto, menu teks + "Daftar merchant"; menu HP buka/tutup, Esc menutup dan fokus kembali', () => {
    const container = demo();
    const header = container.querySelector('header')!;
    expect(header.className).toContain('sticky');
    expect(header.getAttribute('data-pn-header')).toBe('clear');
    expect(header.querySelector('svg[viewBox="0 0 32 32"]'), 'PaynowMark').not.toBeNull();
    const nav = within(header).getByRole('navigation', { name: 'Menu utama' });
    expect(Array.from(nav.querySelectorAll('a')).map((a) => a.getAttribute('href'))).toEqual(['#features', '#fees', '#security', '#developers', '#faq', '#download']);
    expect(Array.from(nav.querySelectorAll('a')).map((a) => a.textContent)).toEqual(['Fitur', 'Biaya', 'Keamanan', 'Developer', 'FAQ', 'Unduh']);
    fireEvent.click(within(nav).getByRole('link', { name: 'Biaya' }));
    expect(scrolled).toEqual(['fees']);
    expect(within(header).getAllByRole('link', { name: 'Daftar merchant' })[0]).toHaveAttribute('href', '#kontak');
    const toggle = within(header).getByRole('button', { name: 'Buka menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAccessibleName('Tutup menu');
    expect(header.getAttribute('data-pn-header')).toBe('solid');
    expect(within(header).getAllByRole('navigation', { name: 'Menu utama' })).toHaveLength(2);
    const panel = document.getElementById(toggle.getAttribute('aria-controls')!)!;
    expect(panel).toHaveAttribute('aria-label', 'Menu utama');
    expect(within(panel).getAllByRole('link').map((a) => a.textContent)).toEqual(['Fitur', 'Biaya', 'Keamanan', 'Developer', 'FAQ', 'Unduh', 'Daftar merchant']);
    fireEvent.click(within(panel).getByRole('link', { name: 'Keamanan' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(scrolled).toEqual(['fees', 'security']);
    fireEvent.click(toggle);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
    expect(header.getAttribute('data-pn-header')).toBe('clear');
    // Tanpa hero → bilah malam padat sejak awal
    cleanup();
    expect(demo({ hero: { enabled: false } }).querySelector('header')!.getAttribute('data-pn-header')).toBe('solid');
  });

  it('strip jenis usaha: chip teks dengan ikon (tanpa logo) dalam Marquee; pratinjau CMS → daftar statis', () => {
    const trust = section(demo(), 'trust');
    expect(text(trust.querySelector('h2'))).toBe('Dipakai beragam usaha di sekitar Anda');
    expect(trust.querySelector('h2')!.className).toContain('text-balance');
    const strip = within(trust).getByRole('list', { name: 'Dipakai beragam usaha di sekitar Anda' });
    expect(strip.querySelectorAll('li')).toHaveLength(12);
    expect(trust.querySelector('img')).toBeNull();
    // Satu-satunya gerak tanpa henti; tepinya memudar hanya saat marquee berjalan
    expect(trust.querySelector('.tpl-marquee-track')).not.toBeNull();
    expect(trust.querySelector('.pn-fade-x .tpl-marquee')).not.toBeNull();
    cleanup();
    const quiet = section(still(), 'trust');
    expect(quiet.querySelector('.tpl-marquee')).toBeNull();
    expect(within(quiet).getByRole('list', { name: 'Dipakai beragam usaha di sekitar Anda' }).querySelectorAll('li')).toHaveLength(12);
  });

  it('tab fitur: pola tab WAI-ARIA, panah/Home/End berpindah & memindah fokus, layar HP + foto ikut berganti', () => {
    const features = section(demo(), 'features');
    const tablist = within(features).getByRole('tablist', { name: 'Fitur' });
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['QRIS', 'Transfer', 'Tagihan', 'Top-up']);
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false', 'false']);
    expect(tabs.map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1', '-1']);
    const panel = within(features).getByRole('tabpanel');
    expect(panel).toHaveAttribute('aria-labelledby', tabs[0].id);
    for (const tab of tabs) expect(tab).toHaveAttribute('aria-controls', panel.id);
    const screen = () => features.querySelector('[data-pn-screen]')!.getAttribute('data-pn-screen');
    const photo = () => features.querySelector('img')?.getAttribute('src');
    expect(text(panel.querySelector('h3'))).toBe('Scan, bayar, selesai');
    expect(Array.from(panel.querySelectorAll('li')).map((li) => li.textContent)).toEqual(['Cek nominal sebelum bayar', 'Struk digital otomatis', 'Riwayat rapi per hari']);
    expect(screen()).toBe('qris');
    expect(photo()).toBe('/assets/templates/photos/paynow-qris-960.webp');

    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveFocus();
    expect(panel).toHaveAttribute('aria-labelledby', tabs[1].id);
    expect(text(panel.querySelector('h3'))).toBe('Kirim uang dalam hitungan detik');
    expect(screen()).toBe('transfer');
    expect(features.querySelector('[data-pn-screen]')!.textContent).toContain('Dimas Pratama');
    expect(photo()).toBe('/assets/templates/photos/paynow-transfer-960.webp');
    fireEvent.keyDown(tabs[1], { key: 'End' });
    expect(tabs[3]).toHaveFocus();
    expect(screen()).toBe('topup');
    fireEvent.keyDown(tabs[3], { key: 'ArrowRight' });
    expect(tabs[0]).toHaveFocus();
    fireEvent.keyDown(tabs[0], { key: 'ArrowLeft' });
    expect(tabs[3]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs[3], { key: 'Home' });
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs[0], { key: 'ArrowDown' });
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(tabs[2]);
    expect(screen()).toBe('bill');
    expect(Array.from(features.querySelectorAll('[data-pn-screen] li')).map((li) => li.textContent)).toEqual(['Listrik prabayar', 'Air bersih', 'Internet rumah']);
    expect(photo()).toBe('/assets/templates/photos/paynow-tagihan-960.webp');
    // Panggung (foto + HP) dekoratif: isinya mengulang panel
    expect(features.querySelector('[data-pn-screen]')!.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('simulasi biaya bergerak: angka hasil bergulir lalu berhenti di nilai akhir (≤ 400 ms); wilayah live langsung nilai akhir', async () => {
    const fees = section(demo(), 'fees');
    const out = (key: string) => text(fees.querySelector(`[data-pn-fee="${key}"]`));
    expect([out('fee'), out('paid'), out('received')]).toEqual(['Rp1.750', 'Rp250.000', 'Rp248.250']);
    fireEvent.click(within(fees).getByLabelText('Pelanggan'));
    expect(fees.querySelector('[aria-live="polite"]')!.textContent).toBe('Biaya layanan Rp1.750, dibayar pelanggan Rp251.750, diterima merchant Rp250.000.');
    await act(async () => {
      await new Promise((r) => setTimeout(r, 700));
    });
    expect([out('fee'), out('paid'), out('received')]).toEqual(['Rp1.750', 'Rp251.750', 'Rp250.000']);
  });

  it('simulasi biaya: nominal + metode + penanggung → biaya, dibayar, diterima; label "Contoh tarif" & catatan; wilayah live', () => {
    // Gerak mati (pratinjau CMS): angka hasil langsung nilai akhir
    const fees = section(still(), 'fees');
    const out = (key: string) => text(fees.querySelector(`[data-pn-fee="${key}"]`));
    const amount = within(fees).getByLabelText('Nominal transaksi') as HTMLInputElement;
    expect(amount).toHaveAttribute('inputmode', 'numeric');
    expect(amount.value).toBe('250.000');
    const method = within(fees).getByLabelText('Metode bayar') as HTMLSelectElement;
    expect(Array.from(method.options).map((o) => o.textContent)).toEqual([
      'QRIS — 0,7%',
      'Virtual account — Rp4.000',
      'Kartu debit & kredit — 2,9% + Rp2.000',
      'E-wallet lain — 1,5%',
      'Gerai minimarket — Rp5.000',
    ]);
    expect([out('fee'), out('paid'), out('received')]).toEqual(['Rp1.750', 'Rp250.000', 'Rp248.250']);
    const live = fees.querySelector('[aria-live="polite"]')!;
    expect(live.textContent).toBe('Biaya layanan Rp1.750, dibayar pelanggan Rp250.000, diterima merchant Rp248.250.');
    fireEvent.click(within(fees).getByLabelText('Pelanggan'));
    expect([out('fee'), out('paid'), out('received')]).toEqual(['Rp1.750', 'Rp251.750', 'Rp250.000']);
    fireEvent.change(method, { target: { value: '2' } });
    expect([out('fee'), out('paid'), out('received')]).toEqual(['Rp9.250', 'Rp259.250', 'Rp250.000']);
    expect(fees.textContent).toContain('Biaya layanan (2,9% + Rp2.000)');
    fireEvent.change(amount, { target: { value: 'Rp 1.000.000' } });
    expect(amount.value).toBe('1.000.000');
    expect([out('fee'), out('paid'), out('received')]).toEqual(['Rp31.000', 'Rp1.031.000', 'Rp1.000.000']);
    fireEvent.click(within(fees).getByLabelText('Merchant'));
    fireEvent.change(method, { target: { value: '1' } });
    fireEvent.change(amount, { target: { value: '2.500' } });
    expect([out('fee'), out('paid'), out('received')]).toEqual(['Rp4.000', 'Rp2.500', 'Rp0']);
    fireEvent.change(amount, { target: { value: 'abc' } });
    expect(amount.value).toBe('');
    expect([out('fee'), out('paid'), out('received')]).toEqual(['Rp0', 'Rp0', 'Rp0']);
    // "Contoh tarif" selalu tampil (CMS kosong → teks bawaan), daftar tarif, catatan
    expect(within(fees).getByRole('heading', { level: 3, name: 'Contoh tarif' })).toBeInTheDocument();
    expect(Array.from(fees.querySelectorAll('dl[aria-labelledby] dt')).map((dt) => dt.textContent)).toEqual([
      'QRIS',
      'Virtual account',
      'Kartu debit & kredit',
      'E-wallet lain',
      'Gerai minimarket',
    ]);
    expect(fees.textContent).toContain('Contoh tarif untuk simulasi; biaya final mengikuti perjanjian merchant.');
    cleanup();
    const unnamed = section(demo({ fees: { table_label: '', default_amount: '' } }), 'fees');
    expect(within(unnamed).getByRole('heading', { level: 3, name: 'Contoh tarif' })).toBeInTheDocument();
    expect((within(unnamed).getByLabelText('Nominal transaksi') as HTMLInputElement).value).toBe('100.000');
  });

  it('developer: tab kode (panah/Home/End), kode sebagai teks dalam kotak gulir sendiri, tombol salin + status, endpoint, langkah', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const developers = section(demo(), 'developers');
    const win = developers.querySelector<HTMLElement>('[data-pn-code]')!;
    expect(win.getAttribute('data-tpl-tone')).toBe('inverse');
    const tablist = within(win).getByRole('tablist', { name: 'Bahasa contoh kode' });
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['cURL', 'Node.js', 'PHP']);
    const samples = codeSamples(resolveContent(def, null).developers);
    const pre = () => win.querySelector('pre')!;
    const shown = () => Array.from(pre().querySelectorAll('code > span')).map((s) => s.textContent);
    expect(pre().className).toContain('overflow-x-auto');
    expect(pre().className).toContain('min-w-0');
    expect(pre()).toHaveAttribute('tabindex', '0');
    expect(shown()).toEqual(codeLines(String(samples[0].code)));
    expect(within(win).getByRole('tabpanel')).toHaveAttribute('aria-labelledby', tabs[0].id);
    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    expect(tabs[1]).toHaveFocus();
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(shown()).toEqual(codeLines(String(samples[1].code)));
    fireEvent.keyDown(tabs[1], { key: 'End' });
    expect(tabs[2]).toHaveFocus();
    fireEvent.keyDown(tabs[2], { key: 'ArrowRight' });
    expect(tabs[0]).toHaveFocus();
    fireEvent.keyDown(tabs[0], { key: 'ArrowLeft' });
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs[2], { key: 'Home' });
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');

    vi.useFakeTimers();
    const copy = within(win).getByRole('button', { name: 'Salin' });
    await act(async () => {
      fireEvent.click(copy);
    });
    expect(writeText).toHaveBeenCalledWith(samples[0].code);
    expect(copy).toHaveTextContent('Tersalin');
    expect(win.textContent).toContain('Kode disalin ke papan klip.');
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(copy).toHaveTextContent('Salin');
    vi.useRealTimers();
    writeText.mockRejectedValueOnce(new Error('ditolak'));
    await act(async () => {
      fireEvent.click(copy);
    });
    expect(copy).toHaveTextContent('Salin');

    expect(win.textContent).toContain('Contoh kode untuk ilustrasi; alamat API dan kunci di atas tidak aktif.');
    const apis = within(developers).getByRole('list', { name: 'Contoh endpoint API' });
    expect(Array.from(apis.querySelectorAll('li')).map((li) => li.querySelector('code')!.textContent)).toEqual(['/v1/charges', '/v1/charges/{id}', '/v1/qris', '/v1/refunds']);
    expect(text(developers.querySelector('h3'))).toBe('Mulai di sandbox');
    expect(Array.from(developers.querySelectorAll('ol > li')).map((li) => li.textContent)).toEqual([
      '01Daftar sandboxAkun uji tanpa uang sungguhan.',
      '02Ambil kunci ujiKunci API khusus mode uji.',
      '03Uji, lalu go-liveGanti ke kunci produksi setelah lolos uji.',
    ]);
    expect(within(developers).getByRole('link', { name: 'Dokumentasi API' })).toHaveAttribute('href', 'https://example.com/dokumentasi-api');
  });

  it('pita angka bergradasi, cerita merchant, akordeon tanya jawab, unduh aplikasi', () => {
    const container = demo();
    const stats = section(container, 'stats');
    expect(stats.getAttribute('data-tpl-tone')).toBe('inverse');
    expect(stats.className).toContain('pn-grad');
    expect(Array.from(stats.querySelectorAll('dt')).map((dt) => dt.textContent)).toEqual(['Merchant aktif', 'Transaksi per bulan', 'Kota', 'Bantuan pelanggan']);
    expect(Array.from(stats.querySelectorAll('dd')).map((dd) => dd.textContent)).toEqual(['120.000+', '8,5 jt', '250+', '24/7']);
    expect(stats.querySelector('dl')!.className).toContain('grid-cols-2 @3xl:grid-cols-4');
    expect(stats.textContent).toContain('Angka contoh untuk merek fiktif.');

    const stories = section(container, 'testimonials');
    const cards = stories.querySelectorAll('ul > li');
    expect(cards).toHaveLength(3);
    expect(cards[2].className).toContain('@3xl:last:odd:col-span-2');
    expect(cards[2].className).toContain('@6xl:last:odd:col-span-1');
    expect(Array.from(stories.querySelectorAll('figcaption')).map((f) => f.textContent)).toEqual([
      'RaniPemilik kedai kopi · Bandung',
      'AgusPemilik warung makan · Semarang',
      'SariPemilik laundry · Makassar',
    ]);

    const faq = section(container, 'faq');
    const buttons = within(faq).getAllByRole('button');
    expect(buttons).toHaveLength(5);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'true');
    expect(buttons[0].closest('h3')).not.toBeNull();
    const region = document.getElementById(buttons[0].getAttribute('aria-controls')!)!;
    expect(region).toHaveAttribute('role', 'region');
    expect(region).toHaveAttribute('data-open', 'true');
    expect(region.className).toContain('pn-collapse');
    fireEvent.click(buttons[2]);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'false');
    expect(buttons[2]).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(buttons[0].getAttribute('aria-controls')!)).toHaveAttribute('data-open', 'false');
    fireEvent.click(buttons[2]);
    expect(buttons.every((b) => b.getAttribute('aria-expanded') === 'false')).toBe(true);
    expect(decodeURIComponent(within(faq).getByRole('link', { name: /Chat tim kami/ }).getAttribute('href')!)).toBe(
      'https://wa.me/6281234567890?text=Halo PayNow, saya ingin bertanya tentang pendaftaran merchant.',
    );

    const download = section(container, 'download');
    expect(within(download).getByRole('link', { name: 'Google Play' })).toHaveAttribute('href', 'https://example.com/paynow-android');
    expect(within(download).getByRole('link', { name: 'App Store' })).toHaveAttribute('href', 'https://example.com/paynow-ios');
    expect(download.querySelectorAll('img')).toHaveLength(1);
    expect(download.textContent).toContain('Tersedia untuk Android & iOS');
    expect(download.textContent).toContain('Top-up berhasil');
    // Nama tautan unik: "Chat WhatsApp" hanya tombol melayang Shell
    expect(within(container).getAllByRole('link', { name: 'Chat WhatsApp' })).toHaveLength(1);
    cleanup();
    const noWa = section(demo({ contact: { whatsapp: '' } }), 'faq');
    expect(within(noWa).queryByRole('link', { name: /Chat tim kami/ })).toBeNull();
    cleanup();
    const custom = section(demo({ faq: { link_url: '#merchant', link_label: 'Daftar dulu' } }), 'faq');
    expect(within(custom).getByRole('link', { name: 'Daftar dulu' })).toHaveAttribute('href', '#kontak');
  });

  it('formulir pendaftaran merchant: galat + fokus, pesan WhatsApp, fokus ke hasil, ubah data; tidak menyimpan apa pun', async () => {
    const container = demo();
    const contact = section(container, 'contact');
    const formEl = within(contact).getByRole('form', { name: 'Formulir pendaftaran merchant' });
    expect(formEl.getAttribute('action')).toBeNull();
    expect(contact.textContent).toContain('data tidak disimpan di website');
    act(() => {
      fireEvent.submit(formEl);
    });
    const name = within(formEl).getByLabelText('Nama');
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAttribute('aria-describedby', `${name.id}-error`);
    expect(name).toHaveFocus();
    for (const error of ['Tulis nama Anda.', 'Tulis nama usaha.', 'Pilih jenis usaha.', 'Tulis kota usaha.']) expect(formEl.textContent).toContain(error);
    fireEvent.change(name, { target: { value: 'Rina Kartika' } });
    expect(name).not.toHaveAttribute('aria-invalid');
    fireEvent.change(within(formEl).getByLabelText('Nama usaha'), { target: { value: 'Kedai Kopi Senja' } });
    const category = within(formEl).getByLabelText('Jenis usaha') as HTMLSelectElement;
    expect(Array.from(category.options).map((o) => o.value)).toEqual(['', ...CATEGORIES]);
    fireEvent.change(category, { target: { value: 'Makanan & minuman' } });
    fireEvent.change(within(formEl).getByLabelText('Kota'), { target: { value: 'Bandung' } });
    fireEvent.change(within(formEl).getByLabelText(/^Transaksi per bulan/), { target: { value: '100–1.000' } });
    fireEvent.change(within(formEl).getByLabelText(/^Layanan yang diminati/), { target: { value: 'Integrasi API' } });
    await act(async () => {
      fireEvent.submit(formEl);
      await new Promise((r) => setTimeout(r, 0));
    });
    const heading = within(contact).getByRole('heading', { level: 3, name: 'Pesan siap dikirim' });
    expect(heading).toHaveFocus();
    const message = contact.querySelector('pre')!.textContent!;
    expect(message).toBe(
      [
        'Halo PayNow, saya ingin mendaftar sebagai merchant.',
        '',
        'Nama: Rina Kartika',
        'Nama usaha: Kedai Kopi Senja',
        'Jenis usaha: Makanan & minuman',
        'Kota: Bandung',
        'Transaksi per bulan: 100–1.000',
        'Layanan yang diminati: Integrasi API',
      ].join('\n'),
    );
    const wa = within(contact).getByRole('link', { name: 'Buka WhatsApp' });
    expect(decodeURIComponent(wa.getAttribute('href')!)).toBe(`https://wa.me/6281234567890?text=${message}`);
    fireEvent.click(within(contact).getByRole('button', { name: 'Ubah data' }));
    const again = within(contact).getByRole('form');
    expect((within(again).getByLabelText('Nama') as HTMLInputElement).value).toBe('Rina Kartika');
    expect((within(again).getByLabelText('Kota') as HTMLInputElement).value).toBe('Bandung');
  });

  it('kontak: baris kontak dengan target sentuh ≥ 44px, tanpa WhatsApp → email, tanpa keduanya → salin pesan', () => {
    const contact = section(demo(), 'contact');
    const wa = within(contact).getByRole('link', { name: '0812-3456-7890' });
    expect(wa.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/6281234567890\?text=/);
    expect(within(contact).getByRole('link', { name: 'merchant@paynow.test' })).toHaveAttribute('href', 'mailto:merchant@paynow.test');
    expect(within(contact).getByRole('link', { name: '(021) 555-0148' })).toHaveAttribute('href', 'tel:+62215550148');
    expect(within(contact).getByRole('link', { name: 'Lihat peta' }).getAttribute('href')).toMatch(/^https:\/\/www\.google\.com\/maps\/search\//);
    for (const name of ['0812-3456-7890', 'merchant@paynow.test', '(021) 555-0148']) {
      const link = within(contact).getByRole('link', { name });
      // py-3 (12px atas & bawah) + teks ≈ 44px; -my-3 menjaga tinggi baris
      expect(link.className, name).toMatch(/(^|\s)inline-block(\s|$)/);
      expect(link.className, name).toContain('py-3');
      expect(link.className, name).toContain('-my-3');
    }
    cleanup();
    const fill = (formEl: HTMLElement) => {
      fireEvent.change(within(formEl).getByLabelText('Nama'), { target: { value: 'Rina' } });
      fireEvent.change(within(formEl).getByLabelText('Nama usaha'), { target: { value: 'Laundry Sari' } });
      fireEvent.change(within(formEl).getByLabelText('Jenis usaha'), { target: { value: 'Jasa' } });
      fireEvent.change(within(formEl).getByLabelText('Kota'), { target: { value: 'Makassar' } });
      act(() => {
        fireEvent.submit(formEl);
      });
    };
    const container = demo({ contact: { whatsapp: '' } });
    const noWa = section(container, 'contact');
    const formEl = within(noWa).getByRole('form');
    expect(within(formEl).getByRole('button', { name: 'Susun pesan' })).toHaveAttribute('type', 'submit');
    fill(formEl);
    expect(within(noWa).getByRole('link', { name: 'Kirim lewat email' }).getAttribute('href')).toMatch(
      /^mailto:merchant@paynow\.test\?subject=Pendaftaran%20merchant&body=Halo%20PayNow%2C/,
    );
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    cleanup();
    const bare = section(demo({ contact: { whatsapp: '', email: '' } }), 'contact');
    fill(within(bare).getByRole('form'));
    expect(within(bare).getByRole('button', { name: 'Salin pesan' })).toBeInTheDocument();
  });

  it('footer malam: menu, media sosial, tombol toko, baris legal fiktif, hak cipta otomatis; section gelap', () => {
    const container = demo();
    const inverse = Array.from(container.querySelectorAll('[data-tpl-section][data-tpl-tone="inverse"]')).map((el) => el.getAttribute('data-tpl-section'));
    expect(inverse).toEqual(['hero', 'security', 'stats', 'footer']);
    const footer = container.querySelector('footer')!;
    expect(footer.getAttribute('data-tpl-section')).toBe('footer');
    expect(footer.className).toContain('bg-(--pn-night)');
    expect(text(footer.querySelector('[data-pn-legal]'))).toBe(LEGAL);
    expect(footer.textContent).toContain(`© ${new Date().getFullYear()} PayNow`);
    expect(footer.textContent).toContain('Dompet Digital & Payment Gateway');
    expect(Array.from(within(footer).getByRole('navigation', { name: 'Tautan footer' }).querySelectorAll('a')).map((a) => a.getAttribute('href'))).toEqual([
      '#features',
      '#fees',
      '#security',
      '#developers',
      '#faq',
      '#download',
      '#kontak',
    ]);
    expect(within(footer).getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://instagram.com/paynow.contoh');
    expect(within(footer).getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', 'https://linkedin.com/company/paynow-contoh');
    expect(within(footer).getByRole('link', { name: 'YouTube' })).toHaveAttribute('href', 'https://youtube.com/@paynow.contoh');
    expect(within(footer).getByRole('link', { name: 'TikTok' })).toHaveAttribute('href', 'https://tiktok.com/@paynow.contoh');
    expect(within(footer).queryByRole('link', { name: 'Facebook' })).toBeNull();
    expect(within(footer).getByRole('link', { name: 'Google Play' })).toHaveAttribute('href', 'https://example.com/paynow-android');
    for (const link of footer.querySelectorAll('nav a')) expect(link.className).toContain('min-h-11');
  });

  it('datar: tidak ada kelas shadow (kecuali tombol melayang Shell); kode tanpa framer-motion/router/penyimpanan; impor hanya shared/kit/types', () => {
    const container = demo();
    const shadows = Array.from(container.querySelectorAll('[class*="shadow"]')).filter(
      (el) => !el.closest('[aria-label="Chat WhatsApp"]') && !/Chat WhatsApp|Kembali ke atas/.test(el.getAttribute('aria-label') ?? ''),
    );
    expect(shadows.map((el) => el.className)).toEqual([]);
    expect(sourceFiles().length).toBeGreaterThanOrEqual(22);
    const all = source();
    expect(all).not.toMatch(/\bshadow-|box-shadow|drop-shadow|text-shadow/);
    const code = all.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/framer-motion|useLocation|useParams|localStorage|sessionStorage|fetch\(|XMLHttpRequest|setInterval/);
    for (const file of sourceFiles().filter((f) => /\.tsx?$/.test(f))) {
      const body = readFileSync(resolve(DIR, file), 'utf8');
      for (const [, from] of body.matchAll(/^import[^'"]*['"]([^'"]+)['"]/gm)) {
        expect(from, `${file}: ${from}`).toMatch(/^(react|lucide-react|\.\.\/shared\/|\.\.\/kit\/|\.\.\/types$|\.\/)/);
      }
    }
    // .tsx hanya mengekspor komponen (react-refresh); helper di .ts
    for (const file of sourceFiles().filter((f) => f.endsWith('.tsx'))) {
      const body = readFileSync(resolve(DIR, file), 'utf8');
      for (const [, kind, name] of body.matchAll(/^export (const|function|let) (\w+)/gm)) expect(name[0], `${file}: ${kind} ${name}`).toMatch(/[A-Z]/);
    }
  });
});

describe('PayNow: gerak', () => {
  it('pratinjau CMS diam dan tanpa tautan wa.me terbuka', () => {
    const { container } = render(<def.Component content={resolveContent(def, null)} preview />);
    expect(container.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'off');
    expect(container.querySelector('a[href^="https://wa.me"]')).toBeNull();
    expect(container.querySelector('a[href^="javascript:"], a[href^="vbscript:"]')).toBeNull();
    cleanup();
    // Demo & situs live: gerak menyala (CSS di bawah memutuskan apa yang bergerak)
    const live = render(<def.Component content={resolveContent(def, null)} />).container;
    expect(live.querySelector('[data-tpl-root]')).toHaveAttribute('data-tpl-motion', 'on');
  });

  it("paynow.css: animasi bergerbang [data-tpl-motion='on'], blok prefers-reduced-motion & cetak, kelas pn-, sekali jalan ≤ 1,6 dtk, keadaan diam = terlihat", () => {
    const css = readFileSync(resolve(DIR, 'paynow.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).toContain('@layer components');
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(css).toMatch(/@media print/);
    for (const name of ['pn-sheen', 'pn-rise', 'pn-notif', 'pn-swap']) expect(css).toMatch(new RegExp(`@keyframes ${name}\\b`));
    for (const rule of css.match(/^\s*[^@\s{}][^{}]*\{[^}]*\b(transition|animation):[^}]*\}/gm) ?? []) {
      const selector = rule.split('{')[0];
      if (/transition:\s*none|animation:\s*none/.test(rule)) continue;
      expect(selector, rule).toContain("[data-tpl-motion='on']");
    }
    for (const cls of css.match(/\.[a-z][\w-]*/g) ?? []) if (!/^\.(tpl-)/.test(cls)) expect(cls, cls).toMatch(/^\.pn-/);
    for (const [, seconds] of css.matchAll(/animation:\s*pn-[a-z]+\s+([\d.]+)s/g)) expect(Number(seconds)).toBeLessThanOrEqual(1.6);
    for (const [, seconds] of css.matchAll(/transition:[^;]*?([\d.]+)s/g)) expect(Number(seconds)).toBeLessThanOrEqual(1);
    expect(css).not.toMatch(/infinite|animation-iteration-count/);
    // Reduced motion & cetak mematikan setiap kelas yang dianimasikan
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    for (const cls of ['pn-sheen', 'pn-phone-in', 'pn-notif', 'pn-swap', 'pn-tab-ink', 'pn-collapse']) expect(reduced, cls).toContain(`.${cls}`);
    // Di luar @keyframes tidak ada yang disembunyikan (keadaan bawaan = keadaan akhir, semuanya terlihat)
    const outsideKeyframes = css.replace(/@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
    expect(outsideKeyframes).not.toMatch(/opacity:\s*0[;\s}]|visibility:\s*hidden/);
    // Lapisan hero: sisi teks ≥ 80% malam di kedua tata letak
    const scrims = css.match(/\.pn-hero-scrim\s*\{[^}]*\}/g) ?? [];
    expect(scrims).toHaveLength(2);
    for (const scrim of scrims) {
      const night = Array.from(scrim.matchAll(/var\(--pn-night\) (\d+)%/g), (x) => Number(x[1]));
      expect(night.length).toBeGreaterThanOrEqual(2);
      for (const pct of night) expect(pct).toBeGreaterThanOrEqual(80);
    }
  });
});

describe('PayNow: warna tema bisa diganti', () => {
  it('indigo bawaan → --tpl-accent; warna CMS mengalir ke malam, gradasi, glow, lavender; teks di atas kuning gelap', () => {
    const base = demo();
    expect(rootStyle(base, '--tpl-accent')).toBe('#4b3fe4');
    expect(rootStyle(base, '--pn-night')).toBe('#110f3a');
    expect(rootStyle(base, '--pn-blue')).toBe('#2b6de1');
    expect(rootStyle(base, '--pn-violet')).toBe('#9e3fe4');
    expect(rootStyle(base, '--pn-glow')).toBe('#aea9f3');
    expect(rootStyle(base, '--pn-mist')).toBe('#f6f5fe');
    cleanup();
    const red = demo({ brand: { accent_color: '#E11D48' } });
    expect(rootStyle(red, '--tpl-accent')).toBe('#e11d48');
    const vars = paynowVars('#E11D48') as Record<string, string>;
    for (const name of ['--pn-night', '--pn-blue', '--pn-band', '--pn-violet', '--pn-glow', '--pn-mist', '--pn-ink', '--pn-grad']) expect(rootStyle(red, name), name).toBe(vars[name]);
    cleanup();
    expect(rootStyle(demo({ brand: { accent_color: '#FACC15' } }), '--tpl-on-accent')).toBe('#121620');
  });
});

describe('PayNow: SEO situs pembeli, judul, gambar, tautan', () => {
  it('judul tab & meta description dari nama, tagline, dan deskripsi hero; theme-color = aksen', () => {
    expect(siteTitle('paynow', null)).toBe('PayNow — Dompet Digital & Payment Gateway');
    const restore = applySiteHead('paynow', null);
    const description = document.head.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
    expect(description).toMatch(/^Bayar dengan QRIS, kirim uang/);
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(200);
    expect(document.head.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#4B3FE4');
    restore();
  });

  it('satu H1, tiap section diawali tepat satu H2, H3 hanya di bawah H2, tanpa h4–h6; judul kosong → H2 sr-only', () => {
    const container = demo();
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelectorAll('h4, h5, h6')).toHaveLength(0);
    for (const key of ORDER.filter((k) => k !== 'hero')) {
      const levels = Array.from(section(container, key).querySelectorAll('h1, h2, h3')).map((h) => h.tagName);
      expect(levels[0], key).toBe('H2');
      expect(levels.filter((l) => l === 'H2'), key).toHaveLength(1);
    }
    expect(section(container, 'hero').querySelector('h2, h3')).toBeNull();
    cleanup();
    const keys = ORDER.filter((k) => k !== 'hero');
    const untitled = demo(Object.fromEntries(keys.map((k) => [k, { title: '', eyebrow: '' }])));
    for (const key of keys) {
      const levels = Array.from(section(untitled, key).querySelectorAll('h1, h2, h3')).map((h) => h.tagName);
      expect(levels[0], key).toBe('H2');
      expect(levels.filter((l) => l === 'H2'), key).toHaveLength(1);
      expect(section(untitled, key).querySelector('h2'), key).toHaveClass('sr-only');
    }
    expect(keys.map((k) => text(section(untitled, k).querySelector('h2')))).toEqual([
      'Jenis usaha pengguna',
      'Fitur',
      'Simulasi biaya',
      'Keamanan',
      'Developer',
      'Angka',
      'Cerita merchant',
      'Tanya jawab',
      'Unduh aplikasi',
      'Kontak',
    ]);
  });

  it('gambar: alt deskriptif, width/height, srcset & sizes; avatar di keterangan boleh alt kosong', () => {
    const container = demo();
    const imgs = Array.from(container.querySelectorAll('img'));
    expect(imgs.length).toBeGreaterThanOrEqual(10);
    for (const img of imgs) {
      const src = img.getAttribute('src') ?? '';
      expect(img.hasAttribute('alt'), src).toBe(true);
      expect(Number(img.getAttribute('width')), src).toBeGreaterThan(0);
      expect(Number(img.getAttribute('height')), src).toBeGreaterThan(0);
      expect(img.getAttribute('srcset'), src).toMatch(/ (800|240)w, /);
      expect(img.getAttribute('sizes'), src).toBeTruthy();
      const alt = img.getAttribute('alt')!;
      if (img.closest('figcaption')) expect(alt, src).toBe('');
      else expect(alt.split(' ').length, src).toBeGreaterThanOrEqual(5);
    }
  });

  it('tautan asli untuk navigasi, tombol hanya untuk aksi (kecuali kirim formulir); SVG dekoratif tersembunyi', () => {
    const container = demo();
    for (const a of container.querySelectorAll('a')) expect(a.getAttribute('href'), a.textContent ?? '').toMatch(/^(#[a-z]|https:\/\/|mailto:|tel:)/);
    for (const button of container.querySelectorAll('button')) {
      expect(button.getAttribute('type'), button.textContent ?? '').toBe(button.closest('form') && /WhatsApp|Susun pesan/.test(button.textContent ?? '') ? 'submit' : 'button');
    }
    for (const svg of container.querySelectorAll('svg')) expect(svg.closest('[aria-hidden="true"], [aria-hidden=""]') ?? svg.getAttribute('aria-hidden'), svg.outerHTML.slice(0, 60)).toBeTruthy();
  });
});

describe('PayNow: konten opsional kosong', () => {
  it('hero tanpa foto/chip/notifikasi/transaksi/tombol menu atas: tetap satu H1, tanpa gambar eager', () => {
    const container = demo({ hero: { image: '', chips: [], notifications: [], transactions: [], actions: [], balance: '', balance_label: '', header_label: '' } });
    const hero = section(container, 'hero');
    expect(hero.querySelector('img')).toBeNull();
    expect(container.querySelectorAll('img[loading="eager"]')).toHaveLength(0);
    expect(within(hero).queryByRole('list', { name: 'Contoh notifikasi' })).toBeNull();
    expect(hero.querySelector('[data-pn-phone="hero"] ul')).toBeNull();
    expect(hero.querySelector('h1')).not.toBeNull();
    expect(within(container.querySelector('header')!).queryByRole('link', { name: 'Daftar merchant' })).toBeNull();
    cleanup();
    // Tanpa judul → nama merek jadi H1
    expect(text(section(demo({ hero: { title: '', highlight: '' } }), 'hero').querySelector('h1'))).toBe('PayNow');
  });

  it('fitur tanpa foto → bidang gradasi; keamanan & unduh tanpa foto → teks melebar; QR dari CMS → gambar ber-alt', () => {
    const container = demo({
      features: { items: [{ label: 'Pulsa', title: 'Isi pulsa', screen_amount: 'Rp50.000', screen_lines: 'Rp10.000 · Rp25.000' }] },
      security: { image: '' },
      download: { image: '', qr_image: '/assets/templates/logos/paynow-mark.svg' },
    });
    const features = section(container, 'features');
    expect(features.querySelector('img')).toBeNull();
    expect(features.querySelector('[data-pn-screen]')!.getAttribute('data-pn-screen')).toBe('generic');
    expect(within(features).getAllByRole('tab')).toHaveLength(1);
    const security = section(container, 'security');
    expect(security.querySelector('img')).toBeNull();
    expect(security.innerHTML).toContain('@5xl:col-span-12');
    expect(security.innerHTML).toContain('@5xl:grid-cols-4');
    const download = section(container, 'download');
    expect(download.innerHTML).toContain('@5xl:col-span-8');
    const qr = download.querySelector('img')!;
    expect(qr.getAttribute('alt')).toBe('Kode QR untuk mengunduh aplikasi');
    expect(qr.getAttribute('loading')).toBe('lazy');
  });

  it('developer hanya endpoint / hanya kode; angka 3 → 3 kolom; cerita tanpa foto → inisial; footer tanpa sosial & legal', () => {
    const container = demo({
      developers: { samples: [], steps: [], link_url: '' },
      stats: { items: [{ value: '120.000+', label: 'Merchant' }, { value: '250+', label: 'Kota' }, { value: '24/7', label: 'Bantuan' }] },
      testimonials: { items: [{ name: 'Budi Santoso', role: 'Pemilik toko', quote: 'Rapi.', photo: '', image: '' }] },
      footer: { instagram: '', linkedin: '', youtube: '', tiktok: '', legal: '' },
    });
    const developers = section(container, 'developers');
    expect(developers.querySelector('[data-pn-code]')).toBeNull();
    expect(within(developers).getByRole('list', { name: 'Contoh endpoint API' }).className).not.toContain('mt-8');
    expect(developers.querySelector('ol')).toBeNull();
    expect(section(container, 'stats').querySelector('dl')!.className).toContain('grid-cols-2 @3xl:grid-cols-3');
    const stories = section(container, 'testimonials');
    expect(stories.querySelector('img')).toBeNull();
    expect(stories.textContent).toContain('BS');
    const footer = container.querySelector('footer')!;
    expect(footer.textContent).not.toContain('Media sosial');
    expect(footer.querySelector('[data-pn-legal]')).toBeNull();
    cleanup();
    const codeOnly = section(demo({ developers: { endpoints: [] } }), 'developers');
    expect(codeOnly.querySelector('[data-pn-code]')).not.toBeNull();
    expect(within(codeOnly).queryByRole('list', { name: 'Contoh endpoint API' })).toBeNull();
  });

  it('section kosong/mati keluar dari halaman dan menu; tarif rusak menyembunyikan simulasi', () => {
    const hidden = demo({ fees: { rates: [{ name: 'QRIS', percent: 'x' }] }, faq: { enabled: false }, footer: { enabled: false }, testimonials: { items: [] } });
    expect(sectionKeys(hidden)).toEqual(['hero', 'trust', 'features', 'security', 'developers', 'stats', 'download', 'contact']);
    expect(hidden.querySelector('footer')).toBeNull();
    expect(Array.from(hidden.querySelector('header nav')!.querySelectorAll('a')).map((a) => a.getAttribute('href'))).toEqual(['#features', '#security', '#developers', '#download']);
    expect(within(section(hidden, 'hero')).getByRole('link', { name: 'Untuk merchant' })).toHaveAttribute('href', '#kontak');
  });
});

describe('PayNow: editor CMS', () => {
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

describe('PayNow: data katalog & halaman katalog', () => {
  const MIGRATION = 'database/migrations/2026-10-28_043_paynow_template.sql';
  const sql = () => readFileSync(resolve(ROOT, MIGRATION), 'utf8');

  it('migrasi 043: baris paynow dengan template_code, kategori, harga, pratinjau, galeri, dan fitur jujur', () => {
    const text = sql();
    expect(text).toContain("'paynow'");
    expect(text).toContain("'Fintech & Startup'");
    expect(text).toContain('1590000.00');
    expect(text).toContain("'/assets/templates/paynow-preview.webp'");
    expect(text).toContain('\'["/assets/templates/paynow-1.webp","/assets/templates/paynow-2.webp"]\'');
    expect(text).toMatch(/tidak memproses pembayaran, tidak menyimpan saldo, dan contoh kode API hanya ilustrasi/);
    expect(text).toMatch(/data tidak disimpan di website/);
    expect(text).not.toMatch(/termasuk domain|domain, hosting|berizin|diawasi|PCI[ -]?DSS|terdaftar di|bersertifikat|dijamin|garansi/i);
    const features = JSON.parse(/features\s+= '(\[[^']*\])'/.exec(text)![1]) as string[];
    expect(features.length).toBeGreaterThanOrEqual(6);
    expect(features.length).toBeLessThanOrEqual(8);
    expect(features.at(-1)).toBe('Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)');
  });

  it('migrasi 043 aman diulang (INSERT IGNORE + UPDATE berdasarkan slug, tanpa DELETE) dan tercatat di schema_migrations', () => {
    const raw = sql();
    expect(raw).toMatch(/Domain\s+(--\s+)?tidak termasuk harga template/);
    expect(raw).toMatch(/FIKTIF/);
    expect(raw).toMatch(/SETELAH kode/);
    expect(raw).toMatch(/MENIMPA perubahan admin/);
    expect(raw).toMatch(/Unsplash/);
    const text = raw.replace(/^--.*$/gm, '');
    expect(text).toMatch(/INSERT IGNORE INTO templates/);
    expect(text).toMatch(/WHERE slug = 'paynow';/);
    expect(text).toMatch(/sort_order\s+= 26/);
    expect(text).toMatch(/category\s+= 'Fintech & Startup'/);
    expect(text).toMatch(/price\s+= 1590000\.00/);
    expect(text).toMatch(/status\s+= 'published'/);
    expect(text).not.toMatch(/\bDELETE\b/);
    expect(text).toContain("VALUES ('2026-10-28_043', 'templates: katalog PayNow')");
  });

  it('gambar pratinjau katalog ada di public/, 1600×1000, dan ringan', () => {
    for (const name of ['paynow-preview', 'paynow-1', 'paynow-2']) {
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

  it('halaman katalog: judul ≤ 60 huruf, deskripsi dengan kalimat domain tetap, kalimat jujur, tanpa harga tertulis', () => {
    expect((seoCopy.title ?? '').replace('{nama}', 'PayNow').replace('{harga_singkat}', 'Rp1,59 jt').length).toBeLessThanOrEqual(60);
    expect((seoCopy.title ?? '').replace('{nama}', 'PayNow').replace('{harga_singkat}', 'Rp1,89 jt').length).toBeLessThanOrEqual(60);
    const [lead] = (seoCopy.description ?? '').split(' {harga}');
    expect(lead.length).toBeLessThanOrEqual(69);
    expect(seoCopy.description).toContain('{harga} sudah termasuk hosting & SSL tahun pertama; domain mulai {domain_mulai}/tahun.');
    expect(seoCopy.updated).toBe('2026-10-28');
    expect(pageCopy.h1).toBe('{nama}: Template Landing Page Dompet Digital & Payment Gateway');
    expect(pageCopy.niche).toBe('dompet digital');
    const visible = JSON.stringify(pageContent);
    expect(visible).toMatch(/tidak memproses pembayaran, tidak menyimpan saldo, dan contoh kode API hanya ilustrasi/);
    expect(visible).toMatch(/Izin usaha dan lembaga pengawas diisi pemilik merek/);
    expect(visible).toMatch(/data tidak disimpan di website/);
    expect(visible).toMatch(/fiktif/);
    expect(visible).not.toMatch(/berizin|diawasi (oleh )?(Bank Indonesia|OJK)|PCI DSS|terdaftar di|bersertifikat|\b(dijamin|garansi|terbaik nomor|#1)\b|\d+ (hari|jam) kerja|1\.590\.000/i);
    expect(Object.keys(pageContent.imageAlts ?? {})).toEqual(['paynow-preview.webp', 'paynow-1.webp', 'paynow-2.webp']);
    for (const alt of Object.values(pageContent.imageAlts ?? {})) expect(alt).toContain('{nama}');
    expect(pageContent.guides).toEqual(finovaPage.guides);
    expect(pageContent.faq.length).toBeGreaterThanOrEqual(4);
    expect(pageContent.faq.length).toBeLessThanOrEqual(6);
    expect(pageContent.parts.length).toBeGreaterThanOrEqual(8);
  });
});

describe('PayNow: konten aneh', () => {
  it('angka, null, dan string di tempat list tidak membuat crash; tautan & kode berbahaya jadi teks atau dibuang', () => {
    const weird = {
      hero: { image: 'javascript:alert(1)', highlight: 'tidak ada di judul', primary_url: 'javascript:alert(1)', chips: 'x', actions: [null, 3], transactions: [{ title: 5 }], notifications: 'x' },
      trust: { items: [null, { label: 3 }, 'x'] },
      features: { items: [{ label: 'QRIS', image: 'javascript:alert(1)', points: null }, 7] },
      fees: { rates: [{ name: 'QRIS', percent: '0,7' }, { name: 2, percent: {} }], default_amount: 'banyak' },
      security: { items: [null, 'x', { text: 'tanpa judul' }], image: 'vbscript:x' },
      developers: { samples: [{ label: 'Jahat', code: '<img src=x onerror="alert(1)">\n</pre><script>alert(2)</script>' }], endpoints: 9, link_url: 'javascript:alert(1)' },
      stats: { items: [{ value: 5 }, null] },
      testimonials: { items: [{ quote: 'Baik', photo: 'javascript:alert(1)', image: 'javascript:alert(1)' }] },
      faq: { items: [{ question: 2, answer: null }], link_url: 'vbscript:x' },
      download: { play_url: 'javascript:alert(1)', app_url: 'https://example.com/app', qr_image: 'javascript:alert(1)' },
      contact: { whatsapp: 'abc', form_categories: 'x', maps_url: 'javascript:alert(1)' },
      footer: { instagram: 'javascript:alert(1)', legal: 7 },
      brand: { accent_color: 'oranye' },
    } as unknown as SiteContent;
    const { container } = render(<def.Component content={resolveContent(def, weird)} />);
    expect(container.querySelector('a[href^="javascript:"], a[href^="vbscript:"]')).toBeNull();
    expect(container.querySelector('img[src^="javascript:"], img[src^="vbscript:"]')).toBeNull();
    expect(text(container.querySelector('h1'))).toBe('Bayar apa saja, cukup dari satu aplikasi');
    const developers = section(container, 'developers');
    const pre = developers.querySelector('pre')!;
    expect(pre.querySelector('img, script')).toBeNull();
    expect(Array.from(pre.querySelectorAll('code > span')).map((s) => s.textContent)).toEqual(['<img src=x onerror="alert(1)">', '</pre><script>alert(2)</script>']);
    expect(within(section(container, 'fees')).getByLabelText('Metode bayar').querySelectorAll('option')).toHaveLength(1);
    expect((within(section(container, 'fees')).getByLabelText('Nominal transaksi') as HTMLInputElement).value).toBe('100.000');
    expect(sectionKeys(container)).not.toContain('security');
    expect(rootStyle(container, '--tpl-accent')).toBe('#4b3fe4');
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
