// Turunan konten GadgetKu.id (fungsi murni, diuji di __tests__/gadgetku.test.tsx): warna aksen di latar gelap, daftar
// tipe HP & kecocokan produk, harga/diskon/hemat bundling, menu, pencarian di header, dan tautan pesan WhatsApp. Semua
// tahan konten mentah (null, angka, list rusak).
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
import { GADGETKU_ACCENT } from './defaultContent';

// ─── Warna ────────────────────────────────────────────────────────────────────

type Rgb = [number, number, number];
const WHITE: Rgb = [255, 255, 255];
/** Latar gelap template (hero, strip layanan, footer) */
export const NIGHT = '#0B0C0E';
const NIGHT_RGB: Rgb = [11, 12, 14];
const toHex = (rgb: Rgb) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
const mix = (a: Rgb, b: Rgb, amountOfA: number): Rgb => a.map((c, i) => c * amountOfA + b[i] * (1 - amountOfA)) as Rgb;

/**
 * Variabel warna lokal GadgetKu (di samping --tpl-accent* milik Shell):
 * --gk-on-dark: aksen yang dicerahkan sampai ≥ 7:1 terhadap latar gelap — kata sorotan, ikon, dan tombol utama di
 *   hero/strip/footer (teks di atas tombol itu = tinta gelap, otomatis ≥ 7:1 juga);
 * --gk-tint: bidang lembut warna aksen (panel custom casing, chip terpilih di latar putih).
 */
export function gadgetkuVars(accentRaw: string): CSSProperties {
  const accent = parseHex(accentRaw) ?? (parseHex(GADGETKU_ACCENT) as Rgb);
  let onDark = accent;
  for (let i = 0; i < 16 && contrast(onDark, NIGHT_RGB) < 7; i += 1) onDark = mix(onDark, WHITE, 0.8);
  return {
    '--gk-on-dark': toHex(onDark),
    '--gk-tint': toHex(mix(accent, WHITE, 0.16)),
  } as CSSProperties;
}

// ─── Teks ─────────────────────────────────────────────────────────────────────

/**
 * Huruf kecil tanpa diakritik, tanda baca jadi spasi, spasi dirapatkan. Semua penulisan port USB-C disamakan:
 * "USB-C", "Type-C", "USB Type-C", "USB Type C", "Tipe C" → "usb c".
 */
export const normalize = (value: string) =>
  (value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\b(?:usb )?(?:type|tipe) c\b/g, 'usb c')
    .trim();

// ─── Tipe HP & kecocokan ──────────────────────────────────────────────────────

export interface PhoneModel {
  /** Kunci unik "merek|tipe" (huruf kecil) */
  id: string;
  brand: string;
  model: string;
  port: string;
  /** Nama lengkap untuk teks, mis. "Samsung Galaxy A55"; tipe yang sudah diawali merek/seri tidak diberi merek ("Xiaomi 14T", "iPhone 15") */
  label: string;
}

/** Nama seri yang sudah dikenal tanpa merek ("iPhone 15", "Redmi Note 13", "POCO X6"), jadi mereknya tidak ditambahkan. */
const SERIES = /^(iphone|ipad|redmi|poco)\b/;

const fullName = (brand: string, model: string) => {
  const name = normalize(model);
  return brand && !name.startsWith(normalize(brand)) && !SERIES.test(name) ? `${brand} ${model}` : model;
};

/** Daftar tipe HP dari section `finder` (maks. 40): tanpa tipe → dibuang, duplikat → sekali. */
export function phoneModels(finder: SectionContent): PhoneModel[] {
  const seen = new Set<string>();
  const models: PhoneModel[] = [];
  for (const item of list(finder, 'models', 40)) {
    const model = field(item, 'model');
    if (!model) continue;
    const rawBrand = field(item, 'brand');
    const brand = rawBrand || 'Lainnya';
    const id = `${normalize(brand)}|${normalize(model)}`;
    if (seen.has(id)) continue;
    seen.add(id);
    models.push({ id, brand, model, port: field(item, 'port'), label: fullName(rawBrand, model) });
  }
  return models;
}

/** Merek unik sesuai urutan pertama muncul. */
export const brandsOf = (models: PhoneModel[]): string[] => {
  const seen = new Set<string>();
  return models.filter((m) => !seen.has(normalize(m.brand)) && seen.add(normalize(m.brand))).map((m) => m.brand);
};

/** Contoh tipe HP untuk pintasan: tipe pertama tiap merek, maks. `max`. */
export const samplePhones = (models: PhoneModel[], max: number): PhoneModel[] =>
  brandsOf(models)
    .slice(0, max)
    .flatMap((brand) => models.find((m) => m.brand === brand) ?? []);

const UNIVERSAL = new Set(['semua', 'semua hp', 'semua tipe', 'semua tipe hp', 'semua merek', 'universal', 'all']);

/** Isi "Cocok untuk" → token (dipisah koma, titik koma, atau baris). */
export const compatTokens = (raw: string): string[] =>
  (raw || '')
    .split(/[,;\n]+/)
    .map((token) => token.trim())
    .filter(Boolean);

/** Produk untuk semua HP: "Cocok untuk" kosong atau berisi "Semua HP"/"Universal". */
export const isUniversal = (product: ListItem): boolean => {
  const tokens = compatTokens(field(product, 'compatible')).map(normalize);
  return tokens.length === 0 || tokens.some((token) => UNIVERSAL.has(token));
};

/**
 * Produk cocok untuk tipe HP bila salah satu token "Cocok untuk" sama dengan: tipe ("Galaxy A55"), merek + tipe
 * ("Samsung Galaxy A55"), merek ("Samsung" = semua tipe Samsung), port ("USB-C"), atau "Semua HP". Kosong = semua HP.
 * Pencocokan per token utuh: "iPhone 15" TIDAK cocok dengan "iPhone 15 Pro".
 */
export function isCompatible(product: ListItem, phone: PhoneModel): boolean {
  if (isUniversal(product)) return true;
  const targets = new Set([normalize(phone.model), normalize(`${phone.brand} ${phone.model}`), normalize(phone.brand)]);
  if (phone.port) targets.add(normalize(phone.port));
  return compatTokens(field(product, 'compatible')).some((token) => targets.has(normalize(token)));
}

/** Ringkasan "Cocok untuk" di kartu produk: "Semua HP", atau dua token pertama + "+N". */
export function compatSummary(raw: string, max = 2): string {
  const tokens = compatTokens(raw);
  if (tokens.length === 0 || tokens.some((token) => UNIVERSAL.has(normalize(token)))) return 'Semua HP';
  const shown = tokens.slice(0, max).join(', ');
  return tokens.length > max ? `${shown} +${tokens.length - max}` : shown;
}

// ─── Harga ────────────────────────────────────────────────────────────────────

/**
 * Harga teks → angka rupiah; tanpa angka → null. "Rp1.290.000" / "Rp 59.000" / "59000" (desimal ",50" diabaikan), juga
 * singkatan yang umum di toko: "Rp149rb" / "149 ribu" / "149K" → 149000, "Rp1,5 jt" / "2 juta" → 1500000 / 2000000.
 */
export function parseRupiah(raw: string): number | null {
  const value = (raw || '').toLowerCase();
  const unit = /\d\s*(?:jt|juta)\b/.test(value) ? 1e6 : /\d\s*(?:rb|ribu|k)\b/.test(value) ? 1e3 : 1;
  if (unit > 1) {
    const number = value.match(/\d+(?:[.,]\d+)?/);
    return number ? Math.round(Number(number[0].replace(',', '.')) * unit) : null;
  }
  const digits = value.replace(/,\d{1,2}\s*$/, '').replace(/\D/g, '');
  return digits ? Number(digits) : null;
}

/** 15000 → "Rp15.000" */
export const formatRupiah = (value: number): string => `Rp${Math.round(value).toLocaleString('id-ID')}`;

/** Selisih harga normal − harga (rupiah); tidak lebih murah / tidak terbaca → 0. */
export function savings(price: string, oldPrice: string): number {
  const now = parseRupiah(price);
  const before = parseRupiah(oldPrice);
  return now !== null && before !== null && before > now ? before - now : 0;
}

/** Persen diskon dibulatkan (min. 1%), 0 bila tidak ada diskon. */
export function discountPercent(price: string, oldPrice: string): number {
  const before = parseRupiah(oldPrice);
  const saved = savings(price, oldPrice);
  return before && saved ? Math.max(1, Math.round((saved / before) * 100)) : 0;
}

/** Label kartu produk: label sendiri, atau "-25%" dari harga coret, atau "". */
export const productBadge = (item: ListItem): string => {
  const badge = field(item, 'badge');
  if (badge) return badge;
  const pct = discountPercent(field(item, 'price'), field(item, 'old_price'));
  return pct ? `-${pct}%` : '';
};

/** Bintang 1–5 dari angka rating ("4,9", "4,9/5", "3.8"), dibulatkan; kosong/tidak terbaca → null. */
export function ratingStars(raw: string): number | null {
  const value = Math.round(Number.parseFloat((raw || '').replace(',', '.')));
  return Number.isFinite(value) ? Math.min(5, Math.max(1, value)) : null;
}

/** Bintang satu ulasan 1–5 (kosong/tidak terbaca → 5, sesuai bawaan field "Bintang"). */
export const stars = (raw: string): number => ratingStars(raw) ?? 5;

/** Isi paket: satu baris = satu barang (penanda daftar "-", "•" dibuang). */
export const bundleLines = (raw: string): string[] =>
  (raw || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-•*✓+]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 8);

/** Paket yang disorot: paket pertama berlabel; tanpa label → -1. */
export const featuredBundle = (items: ListItem[]): number => items.findIndex((item) => field(item, 'badge') !== '');

// ─── Kategori ─────────────────────────────────────────────────────────────────

/** Kategori sama bila salah satu memuat yang lain ("Kabel Data" ~ "Kabel"). Kosong tidak pernah sama. */
export const sameCategory = (a: string, b: string): boolean => {
  const x = normalize(a);
  const y = normalize(b);
  return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
};

/** Kategori produk unik sesuai urutan muncul (untuk chip penyaring). */
export function productCategories(products: ListItem[]): string[] {
  const out: string[] = [];
  for (const item of products) {
    const category = field(item, 'category');
    if (category && !out.some((c) => normalize(c) === normalize(category))) out.push(category);
  }
  return out;
}

/** Produk dalam kategori; kategori kosong = semua. */
export const inCategory = (products: ListItem[], category: string): ListItem[] =>
  category ? products.filter((item) => sameCategory(field(item, 'category'), category)) : products;

// ─── Menu ─────────────────────────────────────────────────────────────────────

export interface NavItem {
  key: string;
  label: string;
}

const NAV: { key: string; label: string; listKey?: string }[] = [
  { key: 'finder', label: 'Cari HP', listKey: 'models' },
  { key: 'products', label: 'Produk', listKey: 'items' },
  { key: 'bundles', label: 'Bundling', listKey: 'items' },
  { key: 'custom', label: 'Custom Casing' },
  { key: 'testimonials', label: 'Ulasan', listKey: 'items' },
  { key: 'faq', label: 'FAQ', listKey: 'items' },
  { key: 'contact', label: 'Kontak' },
];

/** Label menu dari label section bila pendek (≤ 12 huruf, ≤ 2 kata); selain itu label bawaan. */
const shortLabel = (section: SectionContent, fallback: string) => {
  const eyebrow = text(section, 'eyebrow');
  return eyebrow && eyebrow.length <= 12 && eyebrow.split(/\s+/).length <= 2 ? eyebrow : fallback;
};

export function navItems(content: SiteContent): NavItem[] {
  return NAV.filter(({ key, listKey }) => {
    const section = getSection(content, key);
    if (!isEnabled(section)) return false;
    return listKey ? list(section, listKey).length > 0 : true;
  }).map(({ key, label }) => ({ key, label: shortLabel(getSection(content, key), label) }));
}

// ─── Pencarian di header ──────────────────────────────────────────────────────

export interface SearchEntry {
  /** Teks yang tampil (nama produk, paket, tipe HP, pertanyaan) */
  label: string;
  /** Keterangan kecil, mis. kategori atau "Cari aksesoris" */
  group: string;
  /** Kunci section tujuan */
  target: string;
  /** Kata tambahan yang ikut dicari (tidak tampil), mis. isi "Cocok untuk" */
  keywords?: string;
  /** Tipe HP yang dipilih di pencarian per tipe saat hasil diklik */
  phone?: string;
  /** Kategori yang disaring di Produk saat hasil diklik */
  category?: string;
}

/**
 * Isi yang bisa dicari dari tombol cari di menu: tipe HP (→ pencarian per tipe dengan tipe itu terpilih), produk
 * (nama, kategori, isi "Cocok untuk"), kategori, paket, dan pertanyaan FAQ. Hanya section yang tampil.
 */
export function searchEntries(content: SiteContent, models: PhoneModel[]): SearchEntry[] {
  const entries: SearchEntry[] = [];
  const shown = (key: string) => isEnabled(getSection(content, key));
  if (shown('finder')) {
    for (const phone of models) entries.push({ label: phone.label, group: 'Cari aksesoris yang cocok', target: 'finder', phone: phone.id, keywords: phone.port });
  }
  if (shown('products')) {
    const products = getSection(content, 'products');
    for (const item of list(products, 'items', 16)) {
      const name = field(item, 'name');
      // Kategori ikut dibawa: Produk tersaring ke kategori produk itu, jadi kartunya terlihat tanpa menggeser baris
      if (name) entries.push({ label: name, group: field(item, 'category') || 'Produk', target: 'products', keywords: field(item, 'compatible'), category: field(item, 'category') || undefined });
    }
    if (shown('categories')) {
      for (const item of list(getSection(content, 'categories'), 'items', 6)) {
        const title = field(item, 'title');
        if (title) entries.push({ label: title, group: 'Kategori', target: 'products', category: title });
      }
    }
  }
  if (shown('bundles')) {
    for (const item of list(getSection(content, 'bundles'), 'items', 4)) {
      const name = field(item, 'name');
      if (name) entries.push({ label: name, group: 'Bundling hemat', target: 'bundles', keywords: field(item, 'items') });
    }
  }
  if (shown('custom') && text(getSection(content, 'custom'), 'title')) {
    entries.push({ label: text(getSection(content, 'custom'), 'title'), group: 'Custom casing', target: 'custom', keywords: 'casing custom foto' });
  }
  if (shown('faq')) {
    for (const item of list(getSection(content, 'faq'), 'items', 8)) {
      const question = field(item, 'question');
      if (question) entries.push({ label: question, group: 'FAQ', target: 'faq' });
    }
  }
  return entries;
}

/** Hasil pencarian: semua kata kueri harus ada di label/keterangan/kata tambahan. Kueri kosong → []. */
export function searchFilter(entries: SearchEntry[], query: string, max = 8): SearchEntry[] {
  const words = normalize(query).split(' ').filter(Boolean);
  if (words.length === 0) return [];
  return entries
    .filter((entry) => {
      const haystack = ` ${normalize(`${entry.label} ${entry.group} ${entry.keywords ?? ''}`)} `;
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

/** Metode bayar dipisah "·", koma, atau "|". */
export const paymentMethods = (raw: string): string[] =>
  (raw || '')
    .split(/\s*[·,|•]\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);

// ─── Warna casing custom ──────────────────────────────────────────────────────

export interface CaseColor {
  /** Kunci unik (nama ternormalisasi) */
  key: string;
  /** Nama dari CMS, mis. "Hitam doff" (ikut dikirim di pesan WhatsApp) */
  label: string;
  /** Warna bingkai mockup casing (CSS) */
  frame: string;
  /** Latar contoh warna di tombol (CSS) */
  swatch: string;
}

const CLEAR = { frame: 'rgb(208 214 222 / 0.7)', swatch: 'linear-gradient(135deg, #ffffff 0%, #d5dbe3 100%)' };
/** Warna yang dikenali dari kata di nama (kata pertama yang cocok menang); nama lain → abu netral. */
const CASE_SWATCHES: [RegExp, string | typeof CLEAR][] = [
  [/\b(bening|transparan|clear)\b/, CLEAR],
  [/\b(hitam|black)\b/, '#16181B'],
  [/\b(putih|white)\b/, '#F4F4F1'],
  [/\bnavy\b/, '#1B2A4A'],
  [/\b(biru|blue)\b/, '#2F5BD3'],
  [/\b(merah muda|pink)\b/, '#F2A7BF'],
  [/\b(merah|red|maroon)\b/, '#B4232C'],
  [/\bmint\b/, '#9FE3C7'],
  [/\b(hijau|green|sage)\b/, '#4E8A5E'],
  [/\b(kuning|yellow)\b/, '#F2C230'],
  [/\b(oranye|orange|jingga)\b/, '#EE8A2B'],
  [/\b(ungu|purple|lilac|lavender)\b/, '#8A6FD1'],
  [/\b(abu abu|abu|grey|gray|silver|perak)\b/, '#A7ACB3'],
  [/\b(cokelat|coklat|brown)\b/, '#7B5A3C'],
  [/\b(krem|cream|beige|nude)\b/, '#E8DAC3'],
  [/\b(emas|gold)\b/, '#C9A227'],
];
const NEUTRAL = '#D9DCE1';

/** Pilihan warna casing dari CMS ("Bening, Hitam doff, Navy"): dipisah koma/baris, duplikat sekali, maks. 6. */
export function caseColors(raw: string): CaseColor[] {
  const out: CaseColor[] = [];
  for (const part of (raw || '').split(/[,;\n]+/)) {
    const label = part.trim();
    const key = normalize(label);
    if (!key || out.some((c) => c.key === key)) continue;
    const found = CASE_SWATCHES.find(([pattern]) => pattern.test(key))?.[1] ?? NEUTRAL;
    const { frame, swatch } = typeof found === 'string' ? { frame: found, swatch: found } : found;
    out.push({ key, label, frame, swatch });
    if (out.length >= 6) break;
  }
  return out;
}

/** Bingkai mockup bila pilihan warna dikosongkan (casing bening). */
export const DEFAULT_CASE_FRAME = CLEAR.frame;

// ─── Model ────────────────────────────────────────────────────────────────────

export function readGadgetku(content: SiteContent) {
  const brand = getSection(content, 'brand');
  const hero = getSection(content, 'hero');
  const finder = getSection(content, 'finder');
  const categories = getSection(content, 'categories');
  const products = getSection(content, 'products');
  const bundles = getSection(content, 'bundles');
  const custom = getSection(content, 'custom');
  const perks = getSection(content, 'perks');
  const testimonials = getSection(content, 'testimonials');
  const faq = getSection(content, 'faq');
  const contact = getSection(content, 'contact');
  const footer = getSection(content, 'footer');

  const companyName = text(brand, 'company_name') || 'Nama Toko';
  const whatsapp = text(contact, 'whatsapp');
  const waLink = whatsappHref(whatsapp, text(contact, 'whatsapp_message'));
  const waAction: LinkAction | null = waLink ? { kind: 'external', href: waLink } : null;
  const contactAction: LinkAction | null = isEnabled(contact) ? { kind: 'section', target: 'contact' } : null;
  /** Tujuan "chat/pesan": WhatsApp bila ada nomor, kalau tidak section Kontak, kalau tidak null (tombol disembunyikan). */
  const startAction: LinkAction | null = waAction ?? contactAction;

  const models = phoneModels(finder);
  const productItems = list(products, 'items', 16).filter((item) => field(item, 'name'));
  const finderShown = isEnabled(finder) && models.length > 0;
  const productsShown = isEnabled(products) && productItems.length > 0;
  const customShown = isEnabled(custom) && !!text(custom, 'title');
  const section = (shown: boolean, target: string): LinkAction | null => (shown ? { kind: 'section', target } : null);
  const finderAction = section(finderShown, 'finder');
  const productsAction = section(productsShown, 'products');
  const customAction = section(customShown, 'custom');

  /** WhatsApp dengan pesan pesanan; tanpa nomor → aksi chat biasa (section Kontak). */
  const orderAction = (subject: string): LinkAction | null => {
    const link = subject ? whatsappHref(whatsapp, `Halo ${companyName}, saya mau pesan ${subject}.`) : '';
    return link ? { kind: 'external', href: link } : startAction;
  };
  /** WhatsApp untuk pertanyaan stok (mis. tipe HP tidak ada di daftar). */
  const askAction = (question: string): LinkAction | null => {
    const link = question ? whatsappHref(whatsapp, `Halo ${companyName}, ${question}`) : '';
    return link ? { kind: 'external', href: link } : startAction;
  };

  const nav = navItems(content);

  return {
    brand,
    hero,
    finder,
    categories,
    products,
    bundles,
    custom,
    perks,
    testimonials,
    faq,
    contact,
    footer,
    companyName,
    tagline: text(brand, 'tagline'),
    logo: text(brand, 'logo'),
    announcement: text(brand, 'announcement'),
    colors: gadgetkuVars(text(brand, 'accent_color')),
    whatsapp,
    waAction,
    contactAction,
    startAction,
    finderAction,
    productsAction,
    customAction,
    orderAction,
    askAction,
    models,
    productItems,
    primaryAction: resolveAction(text(hero, 'primary_url'), finderAction ?? productsAction ?? startAction),
    secondaryAction: resolveAction(text(hero, 'secondary_url'), productsAction),
    headerLabel: text(hero, 'header_label'),
    headerAction: resolveAction(text(hero, 'header_url'), startAction),
    nav,
    search: searchEntries(content, models),
    socials: socialLinks(footer),
    year: new Date().getFullYear(),
  };
}

export type GadgetkuModel = ReturnType<typeof readGadgetku>;

/** Pilihan pengunjung yang dibagi antar section: tipe HP (pencarian per tipe) dan kategori (penyaring produk). */
export interface Shop {
  /** `PhoneModel.id` yang dipilih, "" = belum memilih */
  phoneId: string;
  pickPhone: (id: string) => void;
  /** Kategori produk yang disaring, "" = semua */
  category: string;
  pickCategory: (category: string) => void;
}
