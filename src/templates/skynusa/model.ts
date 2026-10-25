// Turunan konten SkyNusa (fungsi murni, diuji di __tests__/skynusa.test.tsx): warna mint pita gelap, menu, harga rupiah,
// filter produk per kebutuhan, kalkulator sewa harian, keranjang demo + pesan WhatsApp, dan tujuan tombol. Semua tahan
// konten mentah (null, angka, list rusak). Keranjang & kalkulator hanya demo di peramban: pesanan dikirim lewat WhatsApp.
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
import { SKYNUSA_ACCENT } from './defaultContent';

// ─── Warna ────────────────────────────────────────────────────────────────────

type Rgb = [number, number, number];
const WHITE: Rgb = [255, 255, 255];
/** Latar pita gelap (#0F191B) */
const DARK: Rgb = [15, 25, 27];
const toHex = (rgb: Rgb) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
const mix = (a: Rgb, b: Rgb, amountOfA: number): Rgb => a.map((c, i) => c * amountOfA + b[i] * (1 - amountOfA)) as Rgb;

/**
 * Variabel warna lokal SkyNusa (di samping --tpl-accent* milik Shell):
 * --sn-mint: aksen dipucatkan sampai ≥ 8:1 terhadap pita gelap (tombol mint bertinta gelap, angka & ikon di pita gelap);
 * --sn-mint-hover: mint lebih terang untuk hover;
 * --sn-tint: bidang sangat lembut warna aksen (lingkaran ikon di latar terang).
 */
export function skynusaVars(accentRaw: string): CSSProperties {
  const accent = parseHex(accentRaw) ?? (parseHex(SKYNUSA_ACCENT) as Rgb);
  let mint = mix(accent, WHITE, 0.5);
  for (let i = 0; i < 20 && contrast(mint, DARK) < 8; i += 1) mint = mix(mint, WHITE, 0.82);
  return {
    '--sn-mint': toHex(mint),
    '--sn-mint-hover': toHex(mix(mint, WHITE, 0.75)),
    '--sn-tint': toHex(mix(accent, WHITE, 0.1)),
  } as CSSProperties;
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

export interface SkyNusaNavItem {
  key: string;
  label: string;
}

/** Urutan menu = urutan halaman. Section tampil dan berisi → masuk menu. */
const NAV: { key: string; label: string; listKey?: string; textKey?: string }[] = [
  { key: 'products', label: 'Drone', listKey: 'items' },
  { key: 'bundles', label: 'Paket', listKey: 'items' },
  { key: 'rental', label: 'Sewa', listKey: 'items' },
  { key: 'warranty', label: 'Garansi', textKey: 'title' },
  { key: 'academy', label: 'Kelas Terbang', textKey: 'title' },
  { key: 'contact', label: 'Kontak' },
];

/** Label menu dari label section bila singkat (≤ 14 huruf, ≤ 2 kata); selain itu label bawaan. */
const shortLabel = (section: SectionContent, fallback: string) => {
  const eyebrow = text(section, 'eyebrow');
  return eyebrow && eyebrow.length <= 14 && eyebrow.split(/\s+/).length <= 2 ? eyebrow : fallback;
};

export function navItems(content: SiteContent): SkyNusaNavItem[] {
  return NAV.filter(({ key, listKey, textKey }) => {
    const section = getSection(content, key);
    if (!isEnabled(section)) return false;
    if (listKey) return list(section, listKey).length > 0;
    if (textKey) return !!text(section, textKey);
    return true;
  }).map(({ key, label }) => ({ key, label: key === 'contact' ? label : shortLabel(getSection(content, key), label) }));
}

// ─── Harga ────────────────────────────────────────────────────────────────────

/**
 * Harga dari teks CMS → angka rupiah. "Rp12.900.000", "12900000", "Rp 350.000,00", "7,5 jt", "250 rb".
 * Kosong / tanpa angka / 0 → null (tidak dihitung di keranjang & kalkulator).
 */
export function parsePrice(raw: string | null | undefined): number | null {
  const value = (raw || '').trim().toLowerCase();
  if (!value) return null;
  const short = value.match(/(\d+(?:[.,]\d+)?)\s*(jt|juta|rb|ribu)\b/);
  if (short) {
    const n = parseFloat(short[1].replace(',', '.')) * (/^j/.test(short[2]) ? 1_000_000 : 1_000);
    return n > 0 ? Math.round(n) : null;
  }
  const digits = value.replace(/,\d{1,2}$/, '').replace(/\D/g, '');
  if (!digits) return null;
  const n = Number(digits);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** 12900000 → "Rp12.900.000" (pemisah ribuan titik, tanpa desimal). */
export const formatRupiah = (n: number): string => `Rp${String(Math.max(0, Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

/** Selisih harga coret − harga; tanpa selisih positif → null. */
export function savings(priceRaw: string, oldPriceRaw: string): number | null {
  const price = parsePrice(priceRaw);
  const old = parsePrice(oldPriceRaw);
  return price !== null && old !== null && old > price ? old - price : null;
}

/** Isi baris per baris (spesifikasi, isi paket): baris kosong & penanda daftar "-", "•" dibuang. */
export const lines = (raw: string, max = 8): string[] =>
  (raw || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-•*✓]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, max);

// ─── Filter produk per kebutuhan ──────────────────────────────────────────────

/** Huruf kecil tanpa diakritik, spasi dirapatkan. */
export const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** "Foto, Wedding" → ["Foto", "Wedding"] (pemisah koma, titik koma, garis miring, titik tengah). */
export const splitTags = (raw: string): string[] =>
  (raw || '')
    .split(/[,;/•·|]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 6);

/** Label filter kategori: kolom `tag`, kalau kosong judul kategori. */
export const categoryTag = (item: ListItem): string => field(item, 'tag') || field(item, 'title');

export const hasTag = (product: ListItem, tag: string): boolean => {
  const wanted = normalize(tag);
  return !!wanted && splitTags(field(product, 'use')).some((t) => normalize(t) === wanted);
};

/** Pilihan filter = label kategori (urut kategori, tanpa duplikat) yang punya minimal satu produk. */
export function filterTags(categories: ListItem[], products: ListItem[]): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const item of categories) {
    const tag = categoryTag(item);
    const key = normalize(tag);
    if (!key || seen.has(key) || !products.some((p) => hasTag(p, tag))) continue;
    seen.add(key);
    tags.push(tag);
  }
  return tags;
}

/** Produk yang tampil untuk filter aktif (null / filter tak dikenal → semua). */
export const filterProducts = (products: ListItem[], tag: string | null): ListItem[] =>
  tag && products.some((p) => hasTag(p, tag)) ? products.filter((p) => hasTag(p, tag)) : products;

// ─── Kalkulator sewa ──────────────────────────────────────────────────────────

export const MAX_RENT_DAYS = 30;

/** Angka bulat dari teks CMS ("3", "10%", "3 hari"); tanpa angka → 0. */
export const toInt = (raw: string): number => {
  const n = parseInt((raw || '').replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
};

/** Lama sewa 1–30 hari (angka aneh → 1). */
export const clampDays = (n: number): number => (Number.isFinite(n) ? Math.min(MAX_RENT_DAYS, Math.max(1, Math.floor(n))) : 1);

export interface RentalQuote {
  days: number;
  rate: number;
  subtotal: number;
  /** Persen potongan yang berlaku (0 bila belum memenuhi minimal hari) */
  percent: number;
  discount: number;
  total: number;
}

/** Biaya sewa: tarif × hari, potongan `percent`% (maks. 90) bila lama sewa ≥ `minDays` (0 = tanpa potongan). */
export function rentalQuote(rate: number, rawDays: number, minDays: number, percent: number): RentalQuote {
  const days = clampDays(rawDays);
  const safeRate = Number.isFinite(rate) && rate > 0 ? Math.round(rate) : 0;
  const pct = minDays > 0 && days >= minDays ? Math.min(Math.max(Math.floor(percent) || 0, 0), 90) : 0;
  const subtotal = safeRate * days;
  const discount = Math.round((subtotal * pct) / 100);
  return { days, rate: safeRate, subtotal, percent: pct, discount, total: subtotal - discount };
}

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const pad2 = (n: number) => String(n).padStart(2, '0');

/** Tanggal lokal → "YYYY-MM-DD" (nilai input type="date"). */
export const isoDate = (date: Date): string => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

/** "YYYY-MM-DD" → Date UTC tengah malam; format/tanggal tidak valid → null. */
export function parseIsoDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((iso || '').trim());
  if (!match) return null;
  const [y, m, d] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? date : null;
}

/** Tambah `days` hari ke tanggal ISO; tidak valid → "". */
export function addDaysIso(iso: string, days: number): string {
  const date = parseIsoDate(iso);
  if (!date) return '';
  date.setUTCDate(date.getUTCDate() + days);
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

/** "2026-11-07" → "Sab, 7 Nov 2026"; tidak valid → "". */
export function formatDateId(iso: string): string {
  const date = parseIsoDate(iso);
  return date ? `${DAY_NAMES[date.getUTCDay()]}, ${date.getUTCDate()} ${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCFullYear()}` : '';
}

/** Pesan WhatsApp pengajuan sewa (unit, tanggal, lama, estimasi biaya). Tanpa tanggal → "tanggal menyusul". */
export function rentalMessage(company: string, unit: string, startIso: string, quote: RentalQuote): string {
  const start = formatDateId(startIso);
  const end = formatDateId(addDaysIso(startIso, quote.days));
  const when = start ? `mulai ${start} (kembali ${end})` : '(tanggal menyusul)';
  const cost = quote.total > 0 ? ` Estimasi biaya ${formatRupiah(quote.total)}${quote.discount > 0 ? ` setelah potongan ${quote.percent}%` : ''}.` : '';
  return `Halo ${company}, saya ingin sewa ${unit || 'drone'} selama ${quote.days} hari ${when}.${cost} Apakah unitnya tersedia?`;
}

// ─── Keranjang demo ───────────────────────────────────────────────────────────

export const MAX_QTY = 9;

export interface CartLine {
  /** `produk:<nama>` / `paket:<nama>` */
  id: string;
  name: string;
  /** Jenis baris untuk pesan WhatsApp, mis. "Paket" */
  kind: string;
  priceLabel: string;
  price: number | null;
  qty: number;
}

export const cartCount = (cart: CartLine[]): number => cart.reduce((sum, line) => sum + line.qty, 0);

/** Total harga yang diketahui; `complete` false bila ada baris tanpa harga (total "mulai dari"). */
export function cartTotal(cart: CartLine[]): { total: number; complete: boolean } {
  let total = 0;
  let complete = true;
  for (const line of cart) {
    if (line.price === null) complete = false;
    else total += line.price * line.qty;
  }
  return { total, complete };
}

/** Tambah satu unit (baris sama → jumlah naik, maks. 9). */
export function addToCart(cart: CartLine[], item: Omit<CartLine, 'qty'>): CartLine[] {
  const existing = cart.find((line) => line.id === item.id);
  if (existing) return cart.map((line) => (line.id === item.id ? { ...line, qty: Math.min(MAX_QTY, line.qty + 1) } : line));
  return [...cart, { ...item, qty: 1 }];
}

/** Ubah jumlah; ≤ 0 → baris dihapus. */
export const setCartQty = (cart: CartLine[], id: string, qty: number): CartLine[] =>
  qty <= 0 ? cart.filter((line) => line.id !== id) : cart.map((line) => (line.id === id ? { ...line, qty: Math.min(MAX_QTY, Math.floor(qty)) } : line));

/** Nama baris untuk pesan: jenis + nama, kecuali nama sudah diawali jenisnya ("Paket Wedding", bukan "Paket Paket Wedding"). */
const lineLabel = (line: CartLine): string =>
  !line.kind || normalize(line.name).startsWith(normalize(line.kind)) ? line.name : `${line.kind} ${line.name}`;

/** Pesan WhatsApp berisi daftar pesanan bernomor + perkiraan total. */
export function cartMessage(company: string, cart: CartLine[]): string {
  const rows = cart.map((line, i) => `${i + 1}. ${lineLabel(line)} × ${line.qty}${line.price !== null ? ` (${formatRupiah(line.price * line.qty)})` : ''}`);
  const { total, complete } = cartTotal(cart);
  const sum = total > 0 ? `\nPerkiraan total: ${complete ? '' : 'mulai '}${formatRupiah(total)}` : '';
  return `Halo ${company}, saya ingin memesan:\n${rows.join('\n')}${sum}\nMohon info ketersediaan stok dan cara pembayarannya.`;
}

// ─── Tujuan tombol ────────────────────────────────────────────────────────────

/** Strip keunggulan hero → section terkait dari judul (paket, garansi, kelas, sewa); tanpa kecocokan → null. */
const FEATURE_TARGETS: [RegExp, string][] = [
  [/paket|bundl/i, 'bundles'],
  [/garansi|servis|service|bengkel/i, 'warranty'],
  [/kelas|belajar|latihan|terbang gratis/i, 'academy'],
  [/sewa|rental/i, 'rental'],
];

export function featureTarget(title: string, shown: (key: string) => boolean): string | null {
  const match = FEATURE_TARGETS.find(([pattern, key]) => pattern.test(title || '') && shown(key));
  return match ? match[1] : null;
}

export interface SocialLink {
  key: string;
  label: string;
  href: string;
}

export const socialLinks = (footer: SectionContent): SocialLink[] =>
  SOCIAL_FIELDS.map(({ key, label }) => ({ key, label, href: safeUrl(text(footer, key)) ?? '' })).filter((s) => s.href);

/** Paket yang disorot: paket pertama berlabel; tanpa label → -1. */
export const featuredIndex = (items: ListItem[]): number => items.findIndex((item) => field(item, 'badge') !== '');

// ─── Model ────────────────────────────────────────────────────────────────────

export function readSkyNusa(content: SiteContent) {
  const brand = getSection(content, 'brand');
  const hero = getSection(content, 'hero');
  const categories = getSection(content, 'categories');
  const products = getSection(content, 'products');
  const bundles = getSection(content, 'bundles');
  const rental = getSection(content, 'rental');
  const warranty = getSection(content, 'warranty');
  const academy = getSection(content, 'academy');
  const testimonials = getSection(content, 'testimonials');
  const faq = getSection(content, 'faq');
  const cta = getSection(content, 'cta');
  const contact = getSection(content, 'contact');
  const footer = getSection(content, 'footer');

  const companyName = text(brand, 'company_name') || 'Nama Toko';
  const whatsapp = text(contact, 'whatsapp');
  const waLink = whatsappHref(whatsapp, text(contact, 'whatsapp_message'));
  const waAction: LinkAction | null = waLink ? { kind: 'external', href: waLink } : null;
  const contactAction: LinkAction | null = isEnabled(contact) ? { kind: 'section', target: 'contact' } : null;
  /** Tujuan "hubungi/pesan": WhatsApp bila ada nomor, kalau tidak section Kontak, kalau tidak null (tombol disembunyikan). */
  const startAction: LinkAction | null = waAction ?? contactAction;
  const productItems = list(products, 'items', 8).filter((item) => field(item, 'name'));
  const shown = (key: string): boolean => {
    const section = getSection(content, key);
    if (!isEnabled(section)) return false;
    if (key === 'products') return productItems.length > 0;
    if (key === 'bundles' || key === 'rental') return list(section, 'items').length > 0;
    return !!text(section, 'title');
  };
  const sectionAction = (key: string): LinkAction | null => (shown(key) ? { kind: 'section', target: key } : null);

  /** WhatsApp dengan pesan berisi nama produk/paket; tanpa nomor → aksi "hubungi" biasa. */
  const askAbout = (subject: string): LinkAction | null => {
    const link = subject ? whatsappHref(whatsapp, `Halo ${companyName}, saya ingin bertanya tentang ${subject}.`) : '';
    return link ? { kind: 'external', href: link } : startAction;
  };
  /** WhatsApp dengan pesan bebas (keranjang, sewa); tanpa nomor → null (tombol kirim disembunyikan). */
  const waWith = (message: string): LinkAction | null => {
    const link = whatsappHref(whatsapp, message);
    return link ? { kind: 'external', href: link } : null;
  };
  const nav = navItems(content);

  return {
    brand,
    hero,
    categories,
    products,
    bundles,
    rental,
    warranty,
    academy,
    testimonials,
    faq,
    cta,
    contact,
    footer,
    companyName,
    tagline: text(brand, 'tagline'),
    logo: text(brand, 'logo'),
    colors: skynusaVars(text(brand, 'accent_color')),
    whatsapp,
    waAction,
    contactAction,
    startAction,
    shown,
    askAbout,
    waWith,
    productItems,
    filterTags: shown('products') && isEnabled(categories) ? filterTags(list(categories, 'items', 4), productItems) : [],
    /** Tombol utama hero: tautan sendiri, kalau kosong ke Drone, kalau tidak ada ke WhatsApp/Kontak */
    primaryAction: resolveAction(text(hero, 'primary_url'), sectionAction('products') ?? startAction),
    /** Tombol kedua hero: tautan sendiri, kalau kosong ke Sewa (tanpa Sewa → disembunyikan) */
    secondaryAction: resolveAction(text(hero, 'secondary_url'), sectionAction('rental')),
    /** Tombol menu atas: teks & tautan sendiri, kalau kosong WhatsApp/Kontak */
    headerLabel: text(hero, 'header_label'),
    headerAction: resolveAction(text(hero, 'header_url'), startAction),
    nav,
    socials: socialLinks(footer),
    year: new Date().getFullYear(),
  };
}

export type SkyNusaModel = ReturnType<typeof readSkyNusa>;
