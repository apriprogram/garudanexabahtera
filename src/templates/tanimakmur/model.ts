// Turunan konten TaniMakmur (fungsi murni, diuji di __tests__/tanimakmur.test.tsx): warna aksen di krem & hijau tua,
// menu, pencarian halaman, isi paket & jadwal tanam, harga & hemat, kategori produk untuk filter, bintang, dan aksi
// tombol (WhatsApp berisi nama produk/paket). Semua tahan konten mentah (null, angka, list rusak).
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
import { TANI_ACCENT } from './defaultContent';
import { COLOR } from './styles';

// ─── Warna ────────────────────────────────────────────────────────────────────

type Rgb = [number, number, number];
const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];
const toHex = (rgb: Rgb) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
const mix = (a: Rgb, b: Rgb, amountOfA: number): Rgb => a.map((c, i) => c * amountOfA + b[i] * (1 - amountOfA)) as Rgb;

/**
 * Variabel warna lokal TaniMakmur (di samping --tpl-accent* milik Shell):
 * --tm-glow: aksen sebagai TEKS di atas hijau tua (kata sorotan hero/konsultasi, angka, harga paket); dicerahkan
 *   sampai ≥ 4,5:1 terhadap #1E3A16, jadi aksen gelap pilihan pembeli tetap terbaca;
 * --tm-ink: aksen sebagai teks di latar krem (≥ 4,5:1 terhadap #F6F2E3);
 * --tm-soft: bidang lembut aksen di krem (chip, label harga hemat).
 */
export function taniVars(accentRaw: string): CSSProperties {
  const accent = parseHex(accentRaw) ?? (parseHex(TANI_ACCENT) as Rgb);
  const forest = parseHex(COLOR.forest) as Rgb;
  const cream = parseHex(COLOR.cream) as Rgb;
  let glow = accent;
  for (let i = 0; i < 16 && contrast(glow, forest) < 4.6; i += 1) glow = mix(glow, WHITE, 0.8);
  let ink = accent;
  for (let i = 0; i < 16 && contrast(ink, cream) < 4.6; i += 1) ink = mix(ink, BLACK, 0.86);
  return {
    '--tm-glow': toHex(glow),
    '--tm-ink': toHex(ink),
    '--tm-soft': toHex(mix(accent, cream, 0.22)),
  } as CSSProperties;
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

export interface TaniNavItem {
  key: string;
  label: string;
}

/** Urutan menu = urutan halaman. Section yang list-nya kosong tidak masuk menu. */
const NAV: { key: string; label: string; listKey?: string }[] = [
  { key: 'categories', label: 'Kategori', listKey: 'items' },
  { key: 'bundles', label: 'Paket Tanam', listKey: 'items' },
  { key: 'products', label: 'Terlaris', listKey: 'items' },
  { key: 'consult', label: 'Konsultasi' },
  { key: 'tips', label: 'Panduan', listKey: 'items' },
  { key: 'contact', label: 'Kontak' },
];

/** Label menu dari label section bila singkat (≤ 14 huruf, ≤ 2 kata); selain itu label bawaan. */
const shortLabel = (section: SectionContent, fallback: string) => {
  const eyebrow = text(section, 'eyebrow');
  return eyebrow && eyebrow.length <= 14 && eyebrow.split(/\s+/).length <= 2 ? eyebrow : fallback;
};

export function navItems(content: SiteContent): TaniNavItem[] {
  return NAV.filter(({ key, listKey }) => {
    const section = getSection(content, key);
    if (!isEnabled(section)) return false;
    return listKey ? list(section, listKey).length > 0 : true;
  }).map(({ key, label }) => ({ key, label: key === 'contact' ? label : shortLabel(getSection(content, key), label) }));
}

// ─── Pencarian halaman ────────────────────────────────────────────────────────

export interface SearchEntry {
  /** Teks yang tampil (nama produk, paket, panduan, pertanyaan, judul section) */
  label: string;
  /** Nama bagian tujuan, mis. "Terlaris" */
  group: string;
  /** Kunci section tujuan */
  target: string;
}

/** Huruf kecil tanpa diakritik, spasi dirapatkan. */
export const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** Isi yang bisa dicari dari tombol cari di menu. Hanya section yang tampil. */
export function searchEntries(content: SiteContent, nav: TaniNavItem[]): SearchEntry[] {
  const entries: SearchEntry[] = [];
  const groupOf = (key: string, fallback: string) => nav.find((item) => item.key === key)?.label ?? fallback;
  for (const item of nav) {
    const title = text(getSection(content, item.key), 'title');
    entries.push({ label: title || item.label, group: item.label, target: item.key });
  }
  const add = (key: string, labelOf: (item: ListItem) => string, fallbackGroup: string) => {
    const section = getSection(content, key);
    if (!isEnabled(section)) return;
    for (const item of list(section, 'items')) {
      const label = labelOf(item);
      if (label) entries.push({ label, group: groupOf(key, fallbackGroup), target: key });
    }
  };
  add('categories', (item) => field(item, 'title'), 'Kategori');
  add('bundles', (item) => field(item, 'title') || field(item, 'crop'), 'Paket Tanam');
  add('products', (item) => field(item, 'name'), 'Terlaris');
  add('tips', (item) => field(item, 'title'), 'Panduan');
  add('faq', (item) => field(item, 'question'), shortLabel(getSection(content, 'faq'), 'Tanya jawab'));
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

// ─── Harga ────────────────────────────────────────────────────────────────────

/** "Rp105.000" / "rp 1.250.000,-" / "105000" → angka rupiah; tanpa angka → null. "Gratis" → 0. */
export function parseRupiah(raw: string): number | null {
  const value = (raw || '').trim();
  if (!value) return null;
  if (/^gratis$/i.test(value)) return 0;
  const digits = value.replace(/,\d{1,2}\s*-?$/, '').replace(/[^\d]/g, '');
  return digits ? Number(digits) : null;
}

/** 14000 → "Rp14.000". */
export const formatRupiah = (amount: number): string => `Rp${Math.round(amount).toLocaleString('id-ID').replace(/,/g, '.')}`;

/** Selisih harga coret − harga; hanya bila harga coret lebih mahal. Selain itu "". */
export function savings(price: string, comparePrice: string): string {
  const now = parseRupiah(price);
  const before = parseRupiah(comparePrice);
  return now !== null && before !== null && before > now ? formatRupiah(before - now) : '';
}

/** Rating "4,9" / "4.9" / 5 → 0–5 (satu desimal); tidak valid → null. */
export function parseRating(raw: string): number | null {
  const value = Number((raw || '').trim().replace(',', '.'));
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(Math.min(5, value) * 10) / 10;
}

/** 4.9 → "4,9" (angka Indonesia). */
export const formatRating = (value: number): string => (Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ','));

// ─── Paket tanam ──────────────────────────────────────────────────────────────

const lines = (raw: string, max: number): string[] =>
  (raw || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-•*✓]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, max);

export interface BundleLine {
  name: string;
  /** Harga apa adanya ("Rp28.000", "Gratis") atau "" */
  price: string;
}

/** Isi paket: satu baris satu barang, harga opsional setelah "|" (penanda daftar "-", "•" dibuang; maks. 10). */
export const bundleLines = (raw: string): BundleLine[] =>
  lines(raw, 10).map((line) => {
    const cut = line.lastIndexOf('|');
    if (cut < 0) return { name: line, price: '' };
    return { name: line.slice(0, cut).trim() || line.slice(cut + 1).trim(), price: line.slice(0, cut).trim() ? line.slice(cut + 1).trim() : '' };
  });

export interface Stage {
  label: string;
  /** Lama tahap dalam minggu (0,5–52) */
  weeks: number;
  /** Minggu mulai (0 = awal semai) */
  start: number;
}

/** Jadwal tanam: "Semai | 4" atau "Semai 4 minggu" per baris → tahap berurutan (maks. 6, baris tanpa angka dibuang). */
export function stageLines(raw: string): Stage[] {
  const stages: Stage[] = [];
  let start = 0;
  for (const line of lines(raw, 6)) {
    const match = /^(.*?)[\s|:]*(\d+(?:[.,]\d+)?)\s*(?:minggu|mgg|pekan)?\.?$/i.exec(line);
    if (!match) continue;
    const label = match[1].replace(/[|:]\s*$/, '').trim();
    const weeks = Math.min(52, Math.max(0.5, Number(match[2].replace(',', '.'))));
    if (!label) continue;
    stages.push({ label, weeks, start });
    start += weeks;
  }
  return stages;
}

/** "3,5" / "4" minggu untuk tampilan. */
export const formatWeeks = (weeks: number): string => (Number.isInteger(weeks) ? String(weeks) : String(weeks).replace('.', ','));

// ─── Produk ───────────────────────────────────────────────────────────────────

/** Kategori unik dari produk, urut kemunculan pertama (tanpa beda huruf besar/kecil). */
export function productCategories(items: ListItem[]): string[] {
  const seen = new Map<string, string>();
  for (const item of items) {
    const category = field(item, 'category');
    const key = normalize(category);
    if (key && !seen.has(key)) seen.set(key, category);
  }
  return Array.from(seen.values());
}

/** Produk dalam kategori `category` ("" = semua). */
export const filterProducts = (items: ListItem[], category: string): ListItem[] =>
  category ? items.filter((item) => normalize(field(item, 'category')) === normalize(category)) : items;

/** Kategori produk yang cocok dengan nama kartu kategori, atau "" bila tidak ada. */
export const matchCategory = (categories: string[], title: string): string => categories.find((c) => normalize(c) === normalize(title)) ?? '';

// ─── Tautan ───────────────────────────────────────────────────────────────────

export interface SocialLink {
  key: string;
  label: string;
  href: string;
}

export const socialLinks = (footer: SectionContent): SocialLink[] =>
  SOCIAL_FIELDS.map(({ key, label }) => ({ key, label, href: safeUrl(text(footer, key)) ?? '' })).filter((s) => s.href);

// ─── Model ────────────────────────────────────────────────────────────────────

export function readTani(content: SiteContent) {
  const brand = getSection(content, 'brand');
  const hero = getSection(content, 'hero');
  const categories = getSection(content, 'categories');
  const bundles = getSection(content, 'bundles');
  const products = getSection(content, 'products');
  const consult = getSection(content, 'consult');
  const tips = getSection(content, 'tips');
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
  const consultLink = whatsappHref(whatsapp, text(consult, 'wa_message') || text(contact, 'whatsapp_message'));
  const consultAction: LinkAction | null = consultLink ? { kind: 'external', href: consultLink } : startAction;
  const productsShown = isEnabled(products) && list(products, 'items').length > 0;
  const shopAction: LinkAction | null = productsShown ? { kind: 'section', target: 'products' } : startAction;
  const secondaryAction = resolveAction(text(hero, 'secondary_url'), consultAction);
  const nav = navItems(content);

  /** WhatsApp dengan pesan berisi `subject`; tanpa nomor → aksi "tanya" biasa. */
  const waAbout = (message: string): LinkAction | null => {
    const link = message ? whatsappHref(whatsapp, message) : '';
    return link ? { kind: 'external', href: link } : startAction;
  };

  return {
    brand,
    hero,
    categories,
    bundles,
    products,
    consult,
    tips,
    testimonials,
    faq,
    contact,
    footer,
    companyName,
    tagline: text(brand, 'tagline'),
    logo: text(brand, 'logo'),
    colors: taniVars(text(brand, 'accent_color')),
    whatsapp,
    waAction,
    contactAction,
    startAction,
    consultAction,
    shopAction,
    primaryAction: resolveAction(text(hero, 'primary_url'), shopAction),
    secondaryAction,
    /** Pesan produk/paket lewat WhatsApp */
    orderAbout: (subject: string) => waAbout(subject ? `Halo ${companyName}, saya ingin memesan ${subject}.` : ''),
    /** Tanya tentang sesuatu lewat WhatsApp */
    askAbout: (subject: string) => waAbout(subject ? `Halo ${companyName}, saya ingin bertanya tentang ${subject}.` : ''),
    /** Tombol menu atas: teks & tautan sendiri, kalau kosong mengikuti tautan konsultasi hero */
    headerLabel: text(hero, 'header_label') || text(hero, 'secondary_label'),
    headerAction: resolveAction(text(hero, 'header_url'), secondaryAction),
    nav,
    search: searchEntries(content, nav),
    socials: socialLinks(footer),
    year: new Date().getFullYear(),
  };
}

export type TaniModel = ReturnType<typeof readTani>;
