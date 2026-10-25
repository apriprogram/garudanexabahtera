// Turunan konten PuncakGear (fungsi murni, diuji di __tests__/puncakgear.test.tsx): warna aksen di latar gelap, menu,
// pencarian halaman, filter produk, harga rupiah, kalkulator sewa, daftar perlengkapan per gunung, dan pesan WhatsApp.
// Semua tahan konten mentah (null, angka, list rusak).
import type { CSSProperties } from 'react';
import type { ListItem, SectionContent, SiteContent } from '../types';
import { SOCIAL_FIELDS } from '../shared/social';
import {
  contrast,
  field,
  getSection,
  isEnabled,
  list,
  parseHex,
  resolveAction,
  safeUrl,
  text,
  whatsappHref,
  type LinkAction,
} from '../shared/utils';
import { PUNCAK_ACCENT } from './defaultContent';

// ─── Warna ────────────────────────────────────────────────────────────────────

type Rgb = [number, number, number];
const WHITE: Rgb = [255, 255, 255];
/** Latar gelap template (bagian sewa, panel panduan, footer) */
export const NIGHT_HEX = '#0E1512';
const NIGHT: Rgb = [14, 21, 18];
const toHex = (rgb: Rgb) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
const mix = (a: Rgb, b: Rgb, amountOfA: number): Rgb => a.map((c, i) => c * amountOfA + b[i] * (1 - amountOfA)) as Rgb;

/**
 * Variabel warna lokal PuncakGear (di samping --tpl-accent* milik Shell):
 * --pg-glow: aksen untuk teks/ikon/garis di latar gelap (diterangkan sampai ≥ 7:1 terhadap #0E1512);
 * --pg-tint: bidang lembut warna aksen di latar terang (chip, kartu darurat).
 */
export function puncakVars(accentRaw: string): CSSProperties {
  const accent = parseHex(accentRaw) ?? (parseHex(PUNCAK_ACCENT) as Rgb);
  let glow = accent;
  for (let i = 0; i < 16 && contrast(glow, NIGHT) < 7; i += 1) glow = mix(glow, WHITE, 0.8);
  return {
    '--pg-glow': toHex(glow),
    '--pg-tint': toHex(mix(accent, WHITE, 0.22)),
  } as CSSProperties;
}

// ─── Teks bantu ───────────────────────────────────────────────────────────────

/** Huruf kecil tanpa diakritik, spasi dirapatkan. */
export const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** Teks berbaris (syarat sewa, perlengkapan): satu baris satu poin, penanda daftar ("-", "•", "✓") dibuang. */
export const lines = (raw: string, max = 16): string[] =>
  (raw || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-•*✓]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, max);

// ─── Rupiah ───────────────────────────────────────────────────────────────────

/** "Rp35.000" / "35000" / "Rp 1.249.000,00" → angka; tanpa angka → null. */
export function parseRupiah(raw: string): number | null {
  const digits = (raw || '').replace(/[,.]\d{1,2}\s*$/, '').replace(/[^0-9]/g, '');
  if (!digits) return null;
  const value = Number(digits);
  return Number.isFinite(value) && value > 0 && value < 1e11 ? value : null;
}

/** 35000 → "Rp35.000" (titik ribuan, tanpa desimal). */
export const formatRupiah = (value: number): string =>
  `Rp${String(Math.max(0, Math.round(value))).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

/** Bilangan bulat dari teks CMS ("4", " 10 % ") dalam batas; tidak valid → null. */
const toInt = (raw: string, min: number, max: number): number | null => {
  const match = (raw || '').match(/\d+/);
  if (!match) return null;
  const value = Number(match[0]);
  return value >= min && value <= max ? value : null;
};

/** Rating produk "4,9" / "4.9" → 4.9 (1–5), selain itu null. */
export function parseRating(raw: string): number | null {
  const value = Number((raw || '').trim().replace(',', '.'));
  return Number.isFinite(value) && value >= 1 && value <= 5 ? Math.round(value * 10) / 10 : null;
}

// ─── Kalkulator sewa ──────────────────────────────────────────────────────────

export const MIN_DAYS = 1;
export const MAX_DAYS = 14;
export const clampDays = (days: number) => (Number.isFinite(days) ? Math.min(MAX_DAYS, Math.max(MIN_DAYS, Math.round(days))) : MIN_DAYS);

export interface RentalItem {
  name: string;
  /** Harga per hari; null = harga tidak terbaca (tidak bisa dipilih di kalkulator) */
  price: number | null;
  priceLabel: string;
  note: string;
}

export interface RentalDiscount {
  days: number;
  percent: number;
}

export const rentalItems = (rental: SectionContent): RentalItem[] =>
  list(rental, 'items', 10)
    .filter((item) => field(item, 'name'))
    .map((item) => ({ name: field(item, 'name'), price: parseRupiah(field(item, 'price')), priceLabel: field(item, 'price'), note: field(item, 'note') }));

/** Diskon lama sewa dari CMS ("4" hari, "10" %); salah satu kosong/tidak valid → null. */
export function rentalDiscount(rental: SectionContent): RentalDiscount | null {
  const days = toInt(text(rental, 'discount_days'), 2, MAX_DAYS);
  const percent = toInt(text(rental, 'discount_percent'), 1, 90);
  return days && percent ? { days, percent } : null;
}

export interface RentalQuote {
  count: number;
  perDay: number;
  days: number;
  subtotal: number;
  discount: number;
  total: number;
}

/** Perkiraan biaya: jumlah harga per hari alat terpilih × hari, dikurangi diskon bila lama sewa ≥ batas diskon. */
export function rentalQuote(items: RentalItem[], selected: readonly number[], daysRaw: number, discount: RentalDiscount | null): RentalQuote {
  const days = clampDays(daysRaw);
  const picked = Array.from(new Set(selected)).filter((i) => items[i]?.price != null);
  const perDay = picked.reduce((sum, i) => sum + (items[i].price ?? 0), 0);
  const subtotal = perDay * days;
  const cut = discount && days >= discount.days ? Math.round((subtotal * discount.percent) / 100) : 0;
  return { count: picked.length, perDay, days, subtotal, discount: cut, total: subtotal - cut };
}

// ─── Produk ───────────────────────────────────────────────────────────────────

export const productList = (products: SectionContent): ListItem[] =>
  list(products, 'items', 12).filter((item) => field(item, 'name') || field(item, 'price'));

/** Kategori unik dari produk, urut kemunculan (huruf besar/kecil & spasi diabaikan saat membandingkan). */
export function productCategories(items: ListItem[]): string[] {
  const seen = new Map<string, string>();
  for (const item of items) {
    const category = field(item, 'category');
    if (category && !seen.has(normalize(category))) seen.set(normalize(category), category);
  }
  return Array.from(seen.values());
}

/** Filter kategori: '' = semua. */
export const filterProducts = (items: ListItem[], category: string): ListItem[] =>
  category ? items.filter((item) => normalize(field(item, 'category')) === normalize(category)) : items;

/** Kategori produk yang cocok dengan nama kartu kategori, atau '' bila tidak ada produk sekategori. */
export const categoryFilterFor = (items: ListItem[], title: string): string =>
  productCategories(items).find((category) => normalize(category) === normalize(title)) ?? '';

// ─── Panduan gunung ───────────────────────────────────────────────────────────

export const guideList = (guides: SectionContent): ListItem[] => list(guides, 'items', 6).filter((item) => field(item, 'name'));

// ─── Pesan WhatsApp ───────────────────────────────────────────────────────────

export const orderMessage = (company: string, name: string, price: string) =>
  `Halo ${company}, saya ingin memesan ${name}${price ? ` (${price})` : ''}. Apakah stoknya tersedia?`;

export function rentalMessage(company: string, items: RentalItem[], quote: RentalQuote, selected: readonly number[]): string {
  const rows = Array.from(new Set(selected))
    .filter((i) => items[i]?.price != null)
    .map((i) => `- ${items[i].name} (${formatRupiah(items[i].price ?? 0)}/hari)`);
  const discount = quote.discount ? `\nDiskon lama sewa: -${formatRupiah(quote.discount)}` : '';
  return `Halo ${company}, saya ingin menyewa alat selama ${quote.days} hari:\n${rows.join('\n')}${discount}\nPerkiraan total: ${formatRupiah(quote.total)}`;
}

export function guideMessage(company: string, mountain: string, missing: string[]): string {
  if (missing.length === 0) return `Halo ${company}, saya berencana mendaki ${mountain} dan ingin konsultasi perlengkapan.`;
  return `Halo ${company}, saya berencana mendaki ${mountain}. Perlengkapan yang belum saya punya: ${missing.join(', ')}. Bisa bantu cek stok untuk beli atau sewa?`;
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

export interface PuncakNavItem {
  key: string;
  label: string;
}

/** Urutan menu = urutan halaman. Beranda selalu ada saat hero tampil. */
const NAV: { key: string; label: string; has?: (section: SectionContent) => boolean }[] = [
  { key: 'hero', label: 'Beranda' },
  { key: 'products', label: 'Produk', has: (s) => productList(s).length > 0 },
  { key: 'guides', label: 'Panduan', has: (s) => guideList(s).length > 0 },
  { key: 'rental', label: 'Sewa Alat', has: (s) => rentalItems(s).length > 0 },
  { key: 'safety', label: 'Keselamatan', has: (s) => list(s, 'items').some((item) => field(item, 'title')) },
  { key: 'faq', label: 'FAQ', has: (s) => list(s, 'items').some((item) => field(item, 'question')) },
  { key: 'contact', label: 'Kontak' },
];

/** Label menu dari label section bila singkat (≤ 14 huruf, ≤ 2 kata); selain itu label bawaan. */
const shortLabel = (section: SectionContent, fallback: string) => {
  const eyebrow = text(section, 'eyebrow');
  return eyebrow && eyebrow.length <= 14 && eyebrow.split(/\s+/).length <= 2 ? eyebrow : fallback;
};

export function navItems(content: SiteContent): PuncakNavItem[] {
  return NAV.filter(({ key, has }) => {
    const section = getSection(content, key);
    return isEnabled(section) && (!has || has(section));
  }).map(({ key, label }) => ({ key, label: key === 'hero' || key === 'contact' ? label : shortLabel(getSection(content, key), label) }));
}

// ─── Pencarian halaman ────────────────────────────────────────────────────────

export interface SearchEntry {
  /** Teks yang tampil (nama produk, gunung, alat, pertanyaan, judul section) */
  label: string;
  /** Nama bagian tujuan, mis. "Produk" */
  group: string;
  /** Kunci section tujuan */
  target: string;
  /** Pilih gunung ke-n di Panduan saat dibuka */
  guide?: number;
  /** Saring produk dengan kategori ini saat dibuka */
  category?: string;
}

/** Isi yang bisa dicari: judul section, kategori, produk, gunung, alat sewa, tips, dan pertanyaan FAQ (section tampil saja). */
export function searchEntries(content: SiteContent, nav: PuncakNavItem[]): SearchEntry[] {
  const entries: SearchEntry[] = [];
  const groupOf = (key: string, fallback: string) => nav.find((item) => item.key === key)?.label ?? fallback;
  const shown = (key: string) => isEnabled(getSection(content, key));
  for (const item of nav) {
    if (item.key === 'hero') continue;
    const title = text(getSection(content, item.key), 'title');
    entries.push({ label: title || item.label, group: item.label, target: item.key });
  }
  const products = getSection(content, 'products');
  const productItems = shown('products') ? productList(products) : [];
  if (shown('categories') && productItems.length > 0) {
    for (const item of list(getSection(content, 'categories'), 'items', 6)) {
      const category = categoryFilterFor(productItems, field(item, 'title'));
      if (category) entries.push({ label: field(item, 'title'), group: 'Kategori', target: 'products', category });
    }
  }
  for (const item of productItems) {
    // Kategori ikut dibawa: memilih produk menyaring ke kategorinya ('' = Semua), jadi produk itu pasti tampil
    if (field(item, 'name')) entries.push({ label: field(item, 'name'), group: groupOf('products', 'Produk'), target: 'products', category: field(item, 'category') });
  }
  if (shown('guides')) {
    guideList(getSection(content, 'guides')).forEach((item, i) => {
      entries.push({ label: field(item, 'name'), group: groupOf('guides', 'Panduan'), target: 'guides', guide: i });
    });
  }
  if (shown('rental')) {
    for (const item of rentalItems(getSection(content, 'rental'))) entries.push({ label: `Sewa ${item.name}`, group: groupOf('rental', 'Sewa Alat'), target: 'rental' });
  }
  const add = (key: string, labelKey: string, fallbackGroup: string) => {
    if (!shown(key)) return;
    for (const item of list(getSection(content, key), 'items')) {
      const label = field(item, labelKey);
      if (label) entries.push({ label, group: groupOf(key, fallbackGroup), target: key });
    }
  };
  add('safety', 'title', 'Keselamatan');
  add('faq', 'question', 'FAQ');
  return entries;
}

/** Hasil pencarian: semua kata kueri harus ada di label/kelompok. Kueri kosong → []. */
export function searchFilter(entries: SearchEntry[], query: string, max = 8): SearchEntry[] {
  const words = normalize(query).split(' ').filter(Boolean);
  if (words.length === 0) return [];
  return entries
    .filter((entry) => {
      const haystack = normalize(`${entry.label} ${entry.group}`);
      return words.every((word) => haystack.includes(word));
    })
    .slice(0, max);
}

// ─── Tautan ───────────────────────────────────────────────────────────────────

export interface SocialLink {
  key: string;
  label: string;
  href: string;
}

export const socialLinks = (footer: SectionContent): SocialLink[] =>
  SOCIAL_FIELDS.map(({ key, label }) => ({ key, label, href: safeUrl(text(footer, key)) ?? '' })).filter((s) => s.href);

// ─── Model ────────────────────────────────────────────────────────────────────

export function readPuncak(content: SiteContent) {
  const brand = getSection(content, 'brand');
  const hero = getSection(content, 'hero');
  const categories = getSection(content, 'categories');
  const products = getSection(content, 'products');
  const guides = getSection(content, 'guides');
  const rental = getSection(content, 'rental');
  const safety = getSection(content, 'safety');
  const testimonials = getSection(content, 'testimonials');
  const faq = getSection(content, 'faq');
  const contact = getSection(content, 'contact');
  const footer = getSection(content, 'footer');

  const companyName = text(brand, 'company_name') || 'Nama Toko';
  const whatsapp = text(contact, 'whatsapp');
  const waLink = whatsappHref(whatsapp, text(contact, 'whatsapp_message'));
  const waAction: LinkAction | null = waLink ? { kind: 'external', href: waLink } : null;
  const contactAction: LinkAction | null = isEnabled(contact) ? { kind: 'section', target: 'contact' } : null;
  /** Tujuan "tanya/pesan": WhatsApp bila ada nomor, kalau tidak section Kontak, kalau tidak null (tombol disembunyikan). */
  const startAction: LinkAction | null = waAction ?? contactAction;
  const section = (key: string, ok: boolean): LinkAction | null => (ok && isEnabled(getSection(content, key)) ? { kind: 'section', target: key } : null);
  const productsAction = section('products', productList(products).length > 0);
  const guidesAction = section('guides', guideList(guides).length > 0);
  const rentalAction = section('rental', rentalItems(rental).length > 0);
  const nav = navItems(content);

  /** WhatsApp dengan pesan `message`; tanpa nomor → aksi "tanya" biasa. */
  const askWith = (message: string): LinkAction | null => {
    const link = message ? whatsappHref(whatsapp, message) : '';
    return link ? { kind: 'external', href: link } : startAction;
  };

  return {
    brand,
    hero,
    categories,
    products,
    guides,
    rental,
    safety,
    testimonials,
    faq,
    contact,
    footer,
    companyName,
    tagline: text(brand, 'tagline'),
    logo: text(brand, 'logo'),
    colors: puncakVars(text(brand, 'accent_color')),
    whatsapp,
    waAction,
    contactAction,
    startAction,
    productsAction,
    guidesAction,
    rentalAction,
    askWith,
    primaryAction: resolveAction(text(hero, 'primary_url'), productsAction ?? startAction),
    secondaryAction: resolveAction(text(hero, 'secondary_url'), rentalAction),
    /** Tombol bergaris di menu atas: teks & tautan sendiri, kalau kosong ke Sewa Alat */
    headerLabel: text(hero, 'header_label'),
    headerAction: resolveAction(text(hero, 'header_url'), rentalAction ?? startAction),
    nav,
    search: searchEntries(content, nav),
    socials: socialLinks(footer),
    year: new Date().getFullYear(),
  };
}

export type PuncakModel = ReturnType<typeof readPuncak>;
