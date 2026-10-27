// Turunan konten Saudagar (fungsi murni, tanpa React; diuji di __tests__/saudagar.test.tsx): warna tema (tinta aksen
// di kertas/putih/kraft, versi terang di pita espresso, tint batang panen), menu terbelah kiri-kanan, tab komoditas dari
// kategori + kartu, kalender panen (teks bulan → rentang), tujuan tautan, dan formulir permintaan penawaran → pesan
// WhatsApp. Semua tahan konten mentah (null, angka, list rusak). Formulir hanya MENYUSUN pesan: tidak ada data yang
// dikirim ke server atau disimpan.
import type { CSSProperties } from 'react';
import type { ListItem, SectionContent, SiteContent } from '../types';
import { SOCIAL_FIELDS } from '../shared/social';
import {
  contrast,
  field,
  getSection,
  hasImage,
  isEnabled,
  list,
  mailHref,
  mapsInfo,
  paragraphs,
  parseHex,
  resolveAction,
  safeUrl,
  sectionFromAnchor,
  text,
  whatsappHref,
  type LinkAction,
} from '../shared/utils';
import { SAUDAGAR_ACCENT } from './defaultContent';

// ─── Warna ────────────────────────────────────────────────────────────────────

type Rgb = [number, number, number];
const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];
/** Kertas krem (latar pita), kraft (kartu), espresso (pita ajakan) — tetap, tidak ikut warna tema */
export const PAPER: Rgb = [247, 242, 232];
export const KRAFT: Rgb = [239, 230, 211];
export const ESPRESSO: Rgb = [42, 29, 21];
const toHex = (rgb: Rgb) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
/** Campuran dibulatkan: kontras dihitung dari warna yang benar-benar ditulis sebagai hex. */
const mix = (a: Rgb, b: Rgb, amountOfA: number): Rgb => a.map((c, i) => Math.round(c * amountOfA + b[i] * (1 - amountOfA))) as Rgb;

/**
 * Variabel warna lokal Saudagar (di samping --tpl-accent* milik Shell), semuanya dari SATU warna tema:
 * --sg-ink: warna tema digelapkan sampai ≥ 5:1 di putih DAN ≥ 4,6:1 di kertas & kraft (SEMUA teks berwarna tema);
 * --sg-bright: warna tema dicerahkan sampai ≥ 5:1 di espresso (label & sorotan di pita ajakan);
 * --sg-tint / --sg-line: isi batang panen (32%) dan garis lembut (22%) di atas kertas.
 */
export function saudagarVars(accentRaw: string): CSSProperties {
  const accent = parseHex(accentRaw) ?? (parseHex(SAUDAGAR_ACCENT) as Rgb);
  let ink = accent;
  for (let i = 0; i < 24 && (contrast(ink, WHITE) < 5 || contrast(ink, PAPER) < 4.6 || contrast(ink, KRAFT) < 4.6); i += 1) ink = mix(ink, BLACK, 0.9);
  let bright = accent;
  for (let i = 0; i < 24 && contrast(bright, ESPRESSO) < 5; i += 1) bright = mix(bright, WHITE, 0.82);
  return {
    '--sg-ink': toHex(ink),
    '--sg-bright': toHex(bright),
    '--sg-tint': toHex(mix(accent, PAPER, 0.32)),
    '--sg-line': toHex(mix(accent, PAPER, 0.22)),
  } as CSSProperties;
}

// ─── Section & tujuan tautan ──────────────────────────────────────────────────

/** Kunci section yang punya tempat di halaman (urutan halaman; = section skema tanpa `brand`). */
export const PAGE_SECTIONS = ['hero', 'about', 'products', 'quality', 'season', 'markets', 'gallery', 'testimonials', 'faq', 'cta', 'contact', 'footer'] as const;
const KNOWN_SECTIONS = new Set<string>(PAGE_SECTIONS);

/** Anchor yang wajar diketik pembeli → kunci section (anchor bersama #kontak, #tentang, #galeri, #testimoni,
 *  #ajakan, #beranda sudah diterjemahkan sectionFromAnchor). */
const ANCHOR_ALIASES: Record<string, string> = {
  komoditas: 'products',
  produk: 'products',
  spesifikasi: 'products',
  mutu: 'quality',
  kualitas: 'quality',
  musim: 'season',
  panen: 'season',
  kalender: 'season',
  pasar: 'markets',
  tujuan: 'markets',
  ekspor: 'markets',
  'tanya-jawab': 'faq',
  penawaran: 'contact',
  formulir: 'contact',
};

/** Target tautan section ("komoditas", "products", "#kontak") → kunci section, atau null bila tidak dikenal. */
export function sectionTarget(target: string): string | null {
  const clean = sectionFromAnchor(target);
  const key = ANCHOR_ALIASES[clean] ?? clean;
  return KNOWN_SECTIONS.has(key) ? key : null;
}

// ─── Komoditas: tab kategori + kartu ──────────────────────────────────────────

export const MAX_CATEGORIES = 4;
export const MAX_PRODUCTS = 12;
/** Kunci tab untuk kartu tanpa kategori (= kategori bernama "Lainnya"). */
const OTHER_TAB = 'lainnya';

export interface ProductTab {
  /** Kunci stabil (nama dinormalisasi; kartu tanpa kategori → "lainnya") */
  key: string;
  name: string;
  intro: string;
  image: string;
  origin: string;
  items: ListItem[];
}

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Tab komoditas: satu per kategori (urutan CMS) yang punya ≥ 1 kartu bernama; kategori kartu yang tidak terdaftar
 * ditambahkan di belakang (tanpa foto/pengantar); kartu tanpa kategori → tab "Lainnya" (sama dengan kategori bernama
 * "Lainnya" bila ada, jadi tidak muncul dua tab "Lainnya"). Maks. 4 tab; kartu di luar tab yang tampil tidak dirender.
 */
export function productTabs(products: SectionContent): ProductTab[] {
  const items = list(products, 'items', MAX_PRODUCTS).filter((item) => field(item, 'name'));
  const tabs = new Map<string, ProductTab>();
  for (const category of list(products, 'categories', MAX_CATEGORIES)) {
    const name = field(category, 'name');
    const key = normalize(name);
    if (!key || tabs.has(key)) continue;
    tabs.set(key, { key, name, intro: field(category, 'intro'), image: field(category, 'image'), origin: field(category, 'origin'), items: [] });
  }
  for (const item of items) {
    const raw = field(item, 'category');
    const key = normalize(raw) || OTHER_TAB;
    if (!tabs.has(key)) tabs.set(key, { key, name: raw || 'Lainnya', intro: '', image: '', origin: '', items: [] });
    tabs.get(key)!.items.push(item);
  }
  return Array.from(tabs.values())
    .filter((tab) => tab.items.length > 0)
    .slice(0, MAX_CATEGORIES);
}

/** Label spesifikasi (dari CMS, kosong → bawaan) dalam urutan baris kartu. */
export const SPEC_ROWS = [
  ['grade', 'label_grade', 'Grade'],
  ['origin', 'label_origin', 'Asal'],
  ['moisture', 'label_moisture', 'Kadar air'],
  ['packaging', 'label_packaging', 'Kemasan'],
  ['moq', 'label_moq', 'Min. pesanan'],
] as const;

export function specRows(products: SectionContent, item: ListItem): { key: string; label: string; value: string }[] {
  return SPEC_ROWS.map(([key, labelKey, fallback]) => ({ key, label: text(products, labelKey) || fallback, value: field(item, key) })).filter((row) => row.value);
}

// ─── Kalender panen ───────────────────────────────────────────────────────────

export const DEFAULT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** 12 label bulan dipisah koma dari CMS; jumlah lain / kosong → label bawaan. */
export function monthLabels(raw: string): string[] {
  const parts = (raw || '')
    .split(/[,;]/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length === 12 ? parts : DEFAULT_MONTHS;
}

const MONTH_PREFIXES: [RegExp, number][] = [
  [/^jan/, 1],
  [/^feb|^peb/, 2],
  [/^mar/, 3],
  [/^apr/, 4],
  [/^(mei|may)/, 5],
  [/^jun/, 6],
  [/^jul/, 7],
  [/^(agu|agt|ags|aug)/, 8],
  [/^sep/, 9],
  [/^(okt|oct)/, 10],
  [/^nov|^nop/, 11],
  [/^(des|dec)/, 12],
];

/** Satu kata bulan ("Mei", "agustus", "8") → 1–12, selain itu null. */
function monthOf(token: string): number | null {
  const value = token.trim().toLowerCase().replace(/\.$/, '');
  if (/^\d{1,2}$/.test(value)) {
    const n = Number(value);
    return n >= 1 && n <= 12 ? n : null;
  }
  if (!/^[a-z]{3,10}$/.test(value)) return null;
  return MONTH_PREFIXES.find(([pattern]) => pattern.test(value))?.[1] ?? null;
}

/**
 * Teks musim → rentang bulan [awal, akhir] (1–12). "Mei–Sep" → [[5,9]]; "Apr–Jul, Okt–Des" → dua rentang; "Nov–Feb"
 * (melewati akhir tahun) → [[11,12],[1,2]]; "Okt" → [[10,10]]; "Jan–Des" → [[1,12]]. Pemisah rentang: – — - s.d. s/d
 * sampai to. Satu kata tidak dikenal → [] (baris tampil sebagai teks saja, tanpa batang).
 */
export function parseMonths(raw: string): [number, number][] {
  const value = (raw || '').trim();
  if (!value) return [];
  const ranges: [number, number][] = [];
  for (const part of value.split(/[,;]/)) {
    const chunk = part.trim();
    if (!chunk) continue;
    const ends = chunk.split(/\s*(?:–|—|-|s\.d\.?|s\/d|sampai|hingga|\bto\b)\s*/i).filter((p) => p.trim() !== '');
    if (ends.length < 1 || ends.length > 2) return [];
    const start = monthOf(ends[0]);
    const end = ends.length === 2 ? monthOf(ends[1]) : start;
    if (start === null || end === null) return [];
    if (start <= end) ranges.push([start, end]);
    else ranges.push([start, 12], [1, end]);
  }
  return ranges;
}

// ─── Section yang tampil ──────────────────────────────────────────────────────

/** Item yang dirender per section (maks. sama dengan skema, syarat sama dengan komponen). */
const ITEMS: Record<string, [listKey: string, max: number, keep: (item: ListItem) => boolean]> = {
  quality: ['steps', 6, (i) => !!field(i, 'title')],
  season: ['items', 8, (i) => !!field(i, 'name')],
  gallery: ['items', 9, (i) => hasImage(field(i, 'image'))],
  testimonials: ['items', 6, (i) => !!field(i, 'quote')],
  faq: ['items', 8, (i) => !!(field(i, 'question') && field(i, 'answer'))],
};

/** Item yang dirender untuk section `key` (lihat ITEMS); section tanpa daftar item → []. */
export function sectionItems(key: string, section: SectionContent): ListItem[] {
  const rule = ITEMS[key];
  return rule ? list(section, rule[0], rule[1]).filter(rule[2]) : [];
}

export const marketOrigins = (markets: SectionContent): ListItem[] => list(markets, 'origins', 6).filter((i) => field(i, 'name'));
export const marketDestinations = (markets: SectionContent): ListItem[] => list(markets, 'destinations', 10).filter((i) => field(i, 'country'));

/**
 * Section tampil dan berisi? Syaratnya sama dengan komponennya (tanpa tautan mati ke section yang tidak dirender).
 * Kunci yang tidak dikenal → false.
 */
export function sectionShown(content: SiteContent, key: string): boolean {
  if (!KNOWN_SECTIONS.has(key)) return false;
  const s = getSection(content, key);
  if (!isEnabled(s)) return false;
  if (key in ITEMS) return sectionItems(key, s).length > 0;
  if (key === 'products') return productTabs(s).length > 0;
  if (key === 'markets') return marketOrigins(s).length > 0 || marketDestinations(s).length > 0;
  // Tentang (About.tsx): pernyataan, cerita, foto, atau angka
  if (key === 'about') {
    return !!text(s, 'title') || paragraphs(text(s, 'body')).length > 0 || hasImage(text(s, 'image')) || list(s, 'stats', 3).some((i) => !!field(i, 'value'));
  }
  // Ajakan (Closing.tsx Cta): judul, deskripsi, atau tombol yang punya tujuan (tautan sendiri, formulir, WhatsApp)
  if (key === 'cta') {
    if (text(s, 'title') || text(s, 'subtitle')) return true;
    if (!text(s, 'button_label')) return false;
    const contact = getSection(content, 'contact');
    return !!resolveAction(text(s, 'button_url'), null) || isEnabled(contact) || !!whatsappHref(text(contact, 'whatsapp'));
  }
  return true;
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

export interface SaudagarNavItem {
  key: string;
  label: string;
  /** Sisi di masthead layar lebar */
  side: 'left' | 'right' | 'panel';
}

/** Menu (label bawaan template). Kontak hanya di panel HP & footer; layar lebar mencapainya lewat tombol pil. */
const NAV: SaudagarNavItem[] = [
  { key: 'about', label: 'Tentang', side: 'left' },
  { key: 'products', label: 'Komoditas', side: 'left' },
  { key: 'quality', label: 'Mutu', side: 'left' },
  { key: 'season', label: 'Musim', side: 'right' },
  { key: 'markets', label: 'Pasar', side: 'right' },
  { key: 'gallery', label: 'Galeri', side: 'right' },
  { key: 'contact', label: 'Kontak', side: 'panel' },
];

/** Label kecil section dipakai sebagai nama menu bila satu kata ≤ 12 huruf (masthead tetap muat). */
export const NAV_LABEL_MAX = 12;

/**
 * Menu hanya untuk section yang benar-benar tampil (tanpa tautan mati). Nama menu = label kecil section dari CMS bila
 * berupa satu kata ≤ 12 huruf (mis. "Produk", "Products"); lebih panjang / kosong → label bawaan. Kontak tetap "Kontak".
 */
export function navItems(content: SiteContent): SaudagarNavItem[] {
  return NAV.filter(({ key }) => sectionShown(content, key)).map(({ key, label, side }) => {
    const eyebrow = text(getSection(content, key), 'eyebrow');
    const own = key !== 'contact' && eyebrow.length <= NAV_LABEL_MAX && !/\s/.test(eyebrow);
    return { key, side, label: own && eyebrow ? eyebrow : label };
  });
}

// ─── Formulir permintaan penawaran ────────────────────────────────────────────

export interface QuoteForm {
  name: string;
  company: string;
  country: string;
  port: string;
  product: string;
  volume: string;
  unit: string;
  incoterm: string;
  shipment: string;
  sample: boolean;
  notes: string;
}

export type QuoteErrors = Partial<Record<keyof QuoteForm, string>>;

/** Pilihan komoditas dari tautan kartu; `n` bertambah setiap klik (komoditas yang sama boleh dipilih ulang). */
export interface QuotePreset {
  product: string;
  n: number;
}

export const EMPTY_QUOTE: QuoteForm = {
  name: '',
  company: '',
  country: '',
  port: '',
  product: '',
  volume: '',
  unit: '',
  incoterm: '',
  shipment: '',
  sample: false,
  notes: '',
};

/** Pilihan komoditas "lainnya" (ditulis di catatan). */
export const OTHER_PRODUCT = 'Lainnya (tulis di catatan)';
/** Pilihan Incoterm bila pembeli belum tahu. */
export const UNKNOWN_INCOTERM = 'Belum tahu';
export const NOTES_MAX = 400;

/** Volume: angka berformat Indonesia ("2", "18.000", "2,5"), > 0, maks. 12 karakter. */
export function validVolume(raw: string): boolean {
  const value = (raw || '').replace(/\s/g, '');
  if (!value || value.length > 12 || !/^\d+([.,]\d+)*$/.test(value)) return false;
  return /[1-9]/.test(value);
}

/** Pesan galat per isian (kosong = valid). */
export function validateQuote(form: QuoteForm): QuoteErrors {
  const errors: QuoteErrors = {};
  const name = form.name.trim();
  if (name.length < 2 || name.length > 80) errors.name = 'Tulis nama Anda.';
  if (form.company.trim().length > 100) errors.company = 'Nama perusahaan maksimal 100 karakter.';
  const country = form.country.trim();
  if (!country || country.length > 60) errors.country = 'Tulis negara tujuan.';
  if (form.port.trim().length > 60) errors.port = 'Pelabuhan tujuan maksimal 60 karakter.';
  if (!form.product.trim()) errors.product = 'Pilih komoditas.';
  if (!validVolume(form.volume)) errors.volume = 'Tulis volume berupa angka, mis. 2 atau 18.000.';
  if (form.shipment.trim().length > 40) errors.shipment = 'Target pengiriman maksimal 40 karakter.';
  if (form.notes.trim().length > NOTES_MAX) errors.notes = `Catatan maksimal ${NOTES_MAX} karakter.`;
  return errors;
}

/** Urutan isian yang divalidasi (fokus ke galat pertama). */
export const QUOTE_ORDER: (keyof QuoteForm)[] = ['name', 'company', 'country', 'port', 'product', 'volume', 'shipment', 'notes'];

/** Rapikan isian: buang karakter kontrol, satukan spasi. */
const clean = (value: string) =>
  (value || '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Pesan WhatsApp permintaan penawaran (baris per isian; isian opsional yang kosong tidak ikut). Salam pembuka dari CMS
 * (`form_greeting`), kosong → "Halo {nama perusahaan}, saya ingin meminta penawaran.".
 */
export function quoteMessage(form: QuoteForm, ctx: { greeting: string; company: string }): string {
  const greeting = clean(ctx.greeting) || `Halo ${clean(ctx.company) || 'tim penjualan'}, saya ingin meminta penawaran.`;
  const incoterm = clean(form.incoterm);
  const volume = [clean(form.volume), clean(form.unit)].filter(Boolean).join(' ');
  const rows = [
    `Nama: ${clean(form.name)}`,
    clean(form.company) && `Perusahaan: ${clean(form.company)}`,
    `Negara tujuan: ${clean(form.country)}`,
    clean(form.port) && `Pelabuhan tujuan: ${clean(form.port)}`,
    clean(form.product) && `Komoditas: ${clean(form.product)}`,
    volume && `Volume: ${volume}`,
    `Incoterm: ${incoterm && incoterm !== UNKNOWN_INCOTERM ? incoterm : 'belum ditentukan'}`,
    clean(form.shipment) && `Target pengiriman: ${clean(form.shipment)}`,
    form.sample && 'Sampel: Ya, mohon kirim sampel sebelum kontrak.',
    clean(form.notes) && `Catatan: ${clean(form.notes)}`,
  ].filter(Boolean);
  return `${greeting}\n\n${rows.join('\n')}`;
}

/** Tautan email cadangan (tanpa nomor WhatsApp): subjek + isi pesan, di-encode. */
export function quoteMailHref(email: string, message: string, product: string): string {
  const mail = mailHref(email);
  if (!mail) return '';
  const subject = `Permintaan penawaran${product ? `: ${clean(product)}` : ''}`;
  return `${mail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
}

/** Daftar label dari list CMS (`incoterms`, `units`), urut & tanpa duplikat. */
export function labelList(section: SectionContent, key: string, max: number): string[] {
  return Array.from(new Set(list(section, key, max).map((item) => field(item, 'label')).filter(Boolean)));
}

// ─── Lain-lain ────────────────────────────────────────────────────────────────

export interface SocialLink {
  key: string;
  label: string;
  href: string;
}

export const socialLinks = (footer: SectionContent): SocialLink[] =>
  SOCIAL_FIELDS.map(({ key, label }) => ({ key, label, href: safeUrl(text(footer, key)) ?? '' })).filter((s) => s.href);

/** Rentang angka "08.00–12.00" tidak dipatah di tanda pisah (word joiner U+2060 di kedua sisinya; hanya tampilan). */
export const keepRanges = (value: string): string => value.replace(/(\d)\s?–\s?(\d)/g, '$1⁠–⁠$2');

// ─── Model ────────────────────────────────────────────────────────────────────

export function readSaudagar(content: SiteContent) {
  const section = (key: string) => getSection(content, key);
  const brand = section('brand');
  const hero = section('hero');
  const contact = section('contact');
  const footer = section('footer');
  const products = section('products');

  const companyName = text(brand, 'company_name') || 'Nama Perusahaan';
  const whatsapp = text(contact, 'whatsapp');
  const waLink = whatsappHref(whatsapp, text(contact, 'whatsapp_message'));
  const waAction: LinkAction | null = waLink ? { kind: 'external', href: waLink } : null;

  /** Section tampil & berisi di halaman (sectionShown). */
  const shown = (key: string): boolean => sectionShown(content, key);
  /** Item yang dirender untuk section `key` (sectionItems). */
  const items = (key: string): ListItem[] => sectionItems(key, section(key));
  const sectionAction = (key: string): LinkAction | null => (shown(key) ? { kind: 'section', target: key } : null);
  /** Kontak (formulir) bila tampil, kalau tidak WhatsApp, kalau tidak null (tombol disembunyikan). */
  const quoteAction: LinkAction | null = sectionAction('contact') ?? waAction;
  /**
   * Isi field URL: "#kontak", "#komoditas" dsb. hanya bila section itu tampil; anchor tak dikenal / section
   * tersembunyi / kosong → `fallback`.
   */
  const linkOr = (raw: string, fallback: LinkAction | null): LinkAction | null => {
    const action = resolveAction(raw, fallback);
    if (action?.kind !== 'section') return action;
    const target = sectionTarget(action.target);
    if (target === 'hero') return { kind: 'section', target };
    return target && shown(target) ? { kind: 'section', target } : fallback;
  };
  /** WhatsApp dengan pesan bebas ke nomor Kontak; tanpa nomor → null. */
  const waWith = (message: string): LinkAction | null => {
    const link = whatsappHref(whatsapp, message);
    return link ? { kind: 'external', href: link } : null;
  };

  return {
    brand,
    hero,
    about: section('about'),
    products,
    quality: section('quality'),
    season: section('season'),
    markets: section('markets'),
    gallery: section('gallery'),
    testimonials: section('testimonials'),
    faq: section('faq'),
    cta: section('cta'),
    contact,
    footer,
    companyName,
    tagline: text(brand, 'tagline'),
    logo: text(brand, 'logo'),
    colors: saudagarVars(text(brand, 'accent_color')),
    whatsapp,
    waAction,
    quoteAction,
    shown,
    items,
    sectionAction,
    linkOr,
    waWith,
    tabs: productTabs(products),
    /** Tombol utama hero: tautan sendiri, kalau kosong ke formulir (Kontak), kalau tidak ada ke WhatsApp */
    primaryAction: linkOr(text(hero, 'primary_url'), quoteAction),
    /** Tautan kedua hero: tautan sendiri, kalau kosong ke Komoditas (tanpa Komoditas → Tentang / disembunyikan) */
    secondaryAction: linkOr(text(hero, 'secondary_url'), sectionAction('products') ?? sectionAction('about')),
    headerLabel: text(hero, 'header_label'),
    headerAction: linkOr(text(hero, 'header_url'), quoteAction),
    nav: navItems(content),
    socials: socialLinks(footer),
    map: mapsInfo(text(contact, 'maps_url'), text(contact, 'maps_query') || text(contact, 'address')),
    year: new Date().getFullYear(),
  };
}

export type SaudagarModel = ReturnType<typeof readSaudagar>;
