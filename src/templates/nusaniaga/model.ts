// Turunan konten NusaNiaga (fungsi murni, tanpa React): warna turunan dari SATU warna aksen (tinta aksen yang tetap
// terbaca di putih, pita abu, dan tint), menu, section yang tampil, tujuan tombol, daftar negara asal, area pengantaran,
// dan formulir permintaan penawaran → pesan WhatsApp. Semua tahan konten mentah (null, angka, list rusak).
// Formulir hanya MENYUSUN pesan: tidak ada data yang dikirim ke server atau disimpan, tidak ada pembayaran.
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
  parseHex,
  resolveAction,
  safeUrl,
  sectionFromAnchor,
  text,
  whatsappHref,
  type LinkAction,
} from '../shared/utils';
import { NUSANIAGA_ACCENT } from './defaultContent';

// ─── Warna ────────────────────────────────────────────────────────────────────

type Rgb = [number, number, number];
const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];
/** Tinta gelap --tpl-on-accent untuk warna aksen terang (= INK di shared/utils accentVars) */
const ON_LIGHT: Rgb = [18, 22, 32];
/** Pita abu sejuk #F2F4F7 */
const SURFACE: Rgb = [242, 244, 247];
const toHex = (rgb: Rgb) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
/** Campuran dibulatkan ke bilangan bulat: kontras dihitung dari warna yang benar-benar ditulis sebagai hex. */
const mix = (a: Rgb, b: Rgb, amountOfA: number): Rgb => a.map((c, i) => Math.round(c * amountOfA + b[i] * (1 - amountOfA))) as Rgb;

/**
 * Variabel warna lokal NusaNiaga (di samping --tpl-accent* milik Shell), semuanya dari SATU warna aksen:
 * --nn-ink: aksen digelapkan sampai ≥ 4,8:1 di putih DAN ≥ 4,6:1 di pita abu #F2F4F7 dan di --nn-tint (label berbingkai,
 *   sorotan judul, chip satuan, kode negara, nomor langkah); --tpl-accent-ink milik Shell hanya menjamin putih;
 * --nn-tint: bidang lembut 8% (chip satuan, kotak ikon, lencana negara);
 * --nn-line: garis 30% (ring chip satuan, ring kartu saat disorot).
 */
export function nusaniagaVars(accentRaw: string): CSSProperties {
  const accent = parseHex(accentRaw) ?? (parseHex(NUSANIAGA_ACCENT) as Rgb);
  const tint = mix(accent, WHITE, 0.08);
  let ink = accent;
  for (let i = 0; i < 24 && (contrast(ink, WHITE) < 4.8 || contrast(ink, SURFACE) < 4.6 || contrast(ink, tint) < 4.6); i += 1) {
    ink = mix(ink, BLACK, 0.88);
  }
  return {
    '--nn-ink': toHex(ink),
    '--nn-tint': toHex(tint),
    '--nn-line': toHex(mix(accent, WHITE, 0.3)),
  } as CSSProperties;
}

/**
 * true bila teks di atas bidang aksen berwarna putih (aturan sama dengan --tpl-on-accent di accentVars). Pita ajakan
 * baru boleh data-tpl-tone="inverse" (cincin fokus putih) bila ini true; aksen terang memakai teks & cincin gelap.
 */
export function accentIsDark(accentRaw: string): boolean {
  const accent = parseHex(accentRaw) ?? (parseHex(NUSANIAGA_ACCENT) as Rgb);
  return contrast(accent, WHITE) >= contrast(accent, ON_LIGHT);
}

// ─── Section ─────────────────────────────────────────────────────────────────

/** Kunci section yang punya tempat di halaman (urutan halaman = urutan CMS tanpa `brand`). */
export const PAGE_SECTIONS = [
  'hero',
  'clients',
  'services',
  'products',
  'process',
  'coverage',
  'advantages',
  'testimonials',
  'faq',
  'cta',
  'contact',
  'footer',
] as const;
const KNOWN_SECTIONS = new Set<string>(PAGE_SECTIONS);

/**
 * Daftar yang benar-benar dirender per section: [kunci list, maks. (= skema), syarat item]. Satu sumber untuk komponen,
 * menu, dan tujuan tautan, agar section kosong tidak meninggalkan tautan mati.
 */
const ITEMS: Record<string, [listKey: string, max: number, keep: (item: ListItem) => boolean]> = {
  services: ['items', 6, (i) => !!field(i, 'title')],
  products: ['items', 9, (i) => !!field(i, 'name')],
  process: ['steps', 6, (i) => !!field(i, 'title')],
  coverage: ['origins', 12, (i) => !!field(i, 'country')],
  testimonials: ['items', 6, (i) => !!field(i, 'quote')],
  faq: ['items', 8, (i) => !!field(i, 'question')],
};

/** Item utama yang dirender untuk section `key` (lihat ITEMS); section tanpa daftar utama → []. */
export function sectionItems(key: string, section: SectionContent): ListItem[] {
  const rule = ITEMS[key];
  return rule ? list(section, rule[0], rule[1]).filter(rule[2]) : [];
}

/** Industri di strip berjalan (maks. 10). */
export const industryItems = (clients: SectionContent): ListItem[] => list(clients, 'industries', 10).filter((i) => !!field(i, 'name'));

/** Nama/logo klien (maks. 12). */
export const clientItems = (clients: SectionContent): ListItem[] =>
  list(clients, 'items', 12).filter((i) => !!field(i, 'name') || hasImage(field(i, 'logo')));

/** Alasan di Keunggulan (maks. 6) dan angka besar (maks. 4). */
export const advantageItems = (advantages: SectionContent): ListItem[] => list(advantages, 'items', 6).filter((i) => !!field(i, 'title'));
export const statItems = (advantages: SectionContent): ListItem[] => list(advantages, 'stats', 4).filter((i) => !!field(i, 'value'));

/** Teks dipisah "·" atau koma → label (area pengantaran, negara asal produk). */
export const splitList = (raw: string, max = 16): string[] =>
  (raw || '')
    .split(/\s*[·,]\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, max);

/** Poin layanan: satu baris = satu poin, maks. 3. */
export const pointLines = (raw: string, max = 3): string[] =>
  (raw || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•·*]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, max);

/** Section tampil dan berisi? Kunci yang tidak dikenal (mis. salah ketik di field URL) → false. */
export function sectionShown(content: SiteContent, key: string): boolean {
  if (!KNOWN_SECTIONS.has(key)) return false;
  const s = getSection(content, key);
  if (!isEnabled(s)) return false;
  if (key === 'clients') return industryItems(s).length > 0 || clientItems(s).length > 0;
  if (key === 'coverage') return sectionItems(key, s).length > 0 || splitList(text(s, 'areas')).length > 0;
  if (key === 'advantages') return advantageItems(s).length > 0 || statItems(s).length > 0;
  if (key === 'cta') return !!(text(s, 'title') || text(s, 'subtitle'));
  if (key in ITEMS) return sectionItems(key, s).length > 0;
  return true;
}

// ─── Menu & tujuan tautan ─────────────────────────────────────────────────────

export interface NavItem {
  key: string;
  label: string;
}

/** Urutan menu atas: yang paling dicari bagian pengadaan pabrik. */
const NAV: NavItem[] = [
  { key: 'services', label: 'Layanan' },
  { key: 'products', label: 'Produk' },
  { key: 'process', label: 'Proses' },
  { key: 'coverage', label: 'Jangkauan' },
  { key: 'faq', label: 'FAQ' },
  { key: 'contact', label: 'Kontak' },
];

/** Label menu dari label berbingkai section bila singkat (≤ 14 huruf, ≤ 2 kata), mis. "Proses impor"; selain itu bawaan. */
const shortLabel = (section: SectionContent, fallback: string) => {
  const eyebrow = text(section, 'eyebrow');
  return eyebrow && eyebrow.length <= 14 && eyebrow.split(/\s+/).length <= 2 ? eyebrow : fallback;
};

/** Menu hanya untuk section yang benar-benar tampil (tanpa tautan mati). */
export function navItems(content: SiteContent): NavItem[] {
  return NAV.filter(({ key }) => sectionShown(content, key)).map(({ key, label }) => ({ key, label: shortLabel(getSection(content, key), label) }));
}

/** Anchor yang wajar diketik pembeli → kunci section (anchor bersama #kontak, #layanan, #keunggulan, #testimoni, #klien
 *  sudah diterjemahkan sectionFromAnchor). */
const ANCHOR_ALIASES: Record<string, string> = {
  produk: 'products',
  product: 'products',
  proses: 'process',
  'proses-impor': 'process',
  alur: 'process',
  jangkauan: 'coverage',
  negara: 'coverage',
  'negara-asal': 'coverage',
  markets: 'coverage',
  pasar: 'coverage',
  industri: 'clients',
  'tanya-jawab': 'faq',
  pertanyaan: 'faq',
  penawaran: 'contact',
  formulir: 'contact',
  'minta-penawaran': 'contact',
  lokasi: 'contact',
};

/** Target tautan section ("produk", "products", "kontak") → kunci section di halaman, atau null bila tidak dikenal. */
export function sectionTarget(target: string): string | null {
  const clean = sectionFromAnchor(target);
  const key = ANCHOR_ALIASES[clean] ?? clean;
  return KNOWN_SECTIONS.has(key) ? key : null;
}

export interface SocialLink {
  key: string;
  label: string;
  href: string;
}

export const socialLinks = (footer: SectionContent): SocialLink[] =>
  SOCIAL_FIELDS.map(({ key, label }) => ({ key, label, href: safeUrl(text(footer, key)) ?? '' })).filter((s) => s.href);

// ─── Formulir permintaan penawaran ───────────────────────────────────────────

export interface InquiryForm {
  name: string;
  company: string;
  need: string;
  product: string;
  volume: string;
  origin: string;
  incoterm: string;
  location: string;
  start: string;
  note: string;
}

export type InquiryErrors = Partial<Record<keyof InquiryForm, string>>;

/** "Terserah / belum tahu" untuk negara asal: tidak ikut pesan (tidak membawa informasi). */
export const ORIGIN_ANY = 'Terserah / belum tahu';
/** Incoterm bawaan "Belum tahu" juga tidak ikut pesan. */
export const INCOTERM_ANY = 'Belum tahu';
export const INCOTERMS = [INCOTERM_ANY, 'EXW', 'FOB', 'CFR', 'CIF', 'DAP', 'DDP'] as const;

/** Pilihan kebutuhan bila daftar di CMS kosong. */
export const DEFAULT_NEEDS = ['Bahan baku', 'Mesin', 'Suku cadang', 'Sourcing pemasok'];

/** Batas panjang tiap isian (juga maxLength di input). */
export const INQUIRY_LIMITS: Record<keyof InquiryForm, number> = {
  name: 60,
  company: 80,
  need: 30,
  product: 100,
  volume: 40,
  origin: 40,
  incoterm: 30,
  location: 60,
  start: 40,
  note: 400,
};

export const EMPTY_INQUIRY: InquiryForm = {
  name: '',
  company: '',
  need: '',
  product: '',
  volume: '',
  origin: ORIGIN_ANY,
  incoterm: INCOTERM_ANY,
  location: '',
  start: '',
  note: '',
};

/** Karakter kontrol (U+0000–U+001F, U+007F) → spasi. */
const withoutControl = (value: string): string =>
  Array.from(value, (ch) => {
    const code = ch.charCodeAt(0);
    return code < 32 || code === 127 ? ' ' : ch;
  }).join('');

/** Isian bersih: karakter kontrol dibuang, spasi dirapikan, dipotong ke batasnya (per huruf, emoji tidak terbelah). */
export function cleanValue(raw: unknown, max: number): string {
  const value = typeof raw === 'string' ? raw : '';
  const tidy = withoutControl(value).replace(/\s+/g, ' ').trim();
  return Array.from(tidy).slice(0, max).join('').trim();
}

/** Form dengan semua isian dibersihkan (lihat cleanValue). */
export function cleanInquiry(form: InquiryForm): InquiryForm {
  const result = { ...EMPTY_INQUIRY };
  for (const key of Object.keys(INQUIRY_LIMITS) as (keyof InquiryForm)[]) result[key] = cleanValue(form?.[key], INQUIRY_LIMITS[key]);
  return result;
}

/** Pilihan "Kebutuhan" dari CMS (maks. 6, tanpa duplikat); kosong → DEFAULT_NEEDS. */
export function needOptions(contact: SectionContent): string[] {
  const labels = list(contact, 'form_needs', 6)
    .map((item) => cleanValue(field(item, 'label'), INQUIRY_LIMITS.need))
    .filter(Boolean);
  const unique = Array.from(new Set(labels));
  return unique.length > 0 ? unique : DEFAULT_NEEDS;
}

/** Pesan galat per isian wajib (kosong = valid). `needs` = pilihan Kebutuhan yang tersedia. */
export function validateInquiry(form: InquiryForm, { needs }: { needs: string[] }): InquiryErrors {
  const f = cleanInquiry(form);
  const errors: InquiryErrors = {};
  if (f.name.length < 2) errors.name = 'Tulis nama Anda.';
  if (f.company.length < 2) errors.company = 'Tulis nama perusahaan.';
  if (!needs.includes(f.need)) errors.need = 'Pilih kebutuhan Anda.';
  if (!f.product) errors.product = 'Tulis produk dan spesifikasinya.';
  if (!f.volume) errors.volume = 'Tulis perkiraan volume.';
  if (!f.location) errors.location = 'Tulis lokasi pabrik atau kota tujuan.';
  return errors;
}

/** Pesan permintaan penawaran (urutan tetap; isian opsional yang kosong atau bawaan tidak ikut). */
export function inquiryMessage(form: InquiryForm, companyName: string): string {
  const f = cleanInquiry(form);
  const company = cleanValue(companyName, 120);
  const rows = [
    `Nama: ${f.name}`,
    `Perusahaan: ${f.company}`,
    `Kebutuhan: ${f.need}`,
    `Produk/spesifikasi: ${f.product}`,
    `Volume: ${f.volume}`,
    f.origin && f.origin !== ORIGIN_ANY && `Negara asal: ${f.origin}`,
    f.incoterm && f.incoterm !== INCOTERM_ANY && `Incoterm: ${f.incoterm}`,
    `Lokasi pabrik: ${f.location}`,
    f.start && `Mulai dibutuhkan: ${f.start}`,
    f.note && `Catatan: ${f.note}`,
  ].filter(Boolean);
  const greeting = company ? `Halo ${company}, saya ingin meminta penawaran.` : 'Halo, saya ingin meminta penawaran.';
  return `${greeting}\n\n${rows.join('\n')}`;
}

/** mailto: dengan subjek dan isi (isi terenkode dipotong ≤ maxEncoded karakter); email tidak valid → "". */
export function mailtoHref(email: string, subject: string, body: string, maxEncoded = 1800): string {
  const base = mailHref(email);
  if (!base) return '';
  // Dipotong per huruf (bukan per unit UTF-16) agar emoji tidak terbelah dan encodeURIComponent tidak gagal
  let chars = Array.from(body || '');
  while (chars.length > 0 && encodeURIComponent(chars.join('')).length > maxEncoded) chars = chars.slice(0, -20);
  return `${base}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(chars.join(''))}`;
}

// ─── Model ────────────────────────────────────────────────────────────────────

export function readNusaNiaga(content: SiteContent) {
  const section = (key: string) => getSection(content, key);
  const brand = section('brand');
  const hero = section('hero');
  const coverage = section('coverage');
  const contact = section('contact');
  const footer = section('footer');
  const accent = text(brand, 'accent_color');

  const companyName = text(brand, 'company_name') || 'Nama Perusahaan';
  const whatsapp = text(contact, 'whatsapp');
  const waLink = whatsappHref(whatsapp, text(contact, 'whatsapp_message'));
  const waAction: LinkAction | null = waLink ? { kind: 'external', href: waLink } : null;

  /** Section tampil & berisi di halaman (sectionShown). */
  const shown = (key: string): boolean => sectionShown(content, key);
  /** Item utama yang dirender untuk section `key` (sectionItems). */
  const items = (key: string): ListItem[] => sectionItems(key, section(key));
  const sectionAction = (key: string): LinkAction | null => (shown(key) ? { kind: 'section', target: key } : null);
  const contactAction = sectionAction('contact');
  /** Tujuan "minta penawaran": formulir di Kontak, kalau tidak WhatsApp, kalau tidak null (tombol disembunyikan). */
  const quoteAction: LinkAction | null = contactAction ?? waAction;
  /**
   * Isi field URL: "#produk", "#kontak", "#jangkauan" dsb. hanya bila section itu tampil; anchor tak dikenal / section
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

  /** Chip negara asal di hero: 8 negara pertama dari Jangkauan (juga bila Jangkauan disembunyikan, tetapi tanpa tautan). */
  const origins = list(coverage, 'origins', 12)
    .filter((item) => !!field(item, 'country'))
    .slice(0, 8);

  return {
    brand,
    hero,
    clients: section('clients'),
    services: section('services'),
    products: section('products'),
    process: section('process'),
    coverage,
    advantages: section('advantages'),
    testimonials: section('testimonials'),
    faq: section('faq'),
    cta: section('cta'),
    contact,
    footer,
    companyName,
    tagline: text(brand, 'tagline'),
    logo: text(brand, 'logo'),
    colors: nusaniagaVars(accent),
    /** data-tpl-tone untuk pita aksen: "inverse" (cincin fokus putih) hanya bila teksnya putih */
    accentTone: accentIsDark(accent) ? ('inverse' as const) : undefined,
    whatsapp,
    waAction,
    contactAction,
    quoteAction,
    shown,
    items,
    sectionAction,
    linkOr,
    waWith,
    origins,
    /** Chip negara menjadi tautan ke Jangkauan hanya bila section itu tampil */
    originAction: sectionAction('coverage'),
    /** Tombol utama hero: tautan sendiri, kalau kosong ke formulir di Kontak (tanpa Kontak → WhatsApp) */
    primaryAction: linkOr(text(hero, 'primary_url'), quoteAction),
    /** Tombol kedua hero: tautan sendiri, kalau kosong ke Produk (tanpa Produk → disembunyikan) */
    secondaryAction: linkOr(text(hero, 'secondary_url'), sectionAction('products')),
    /** Blok tombol di menu atas */
    headerLabel: text(hero, 'header_label'),
    headerAction: linkOr(text(hero, 'header_url'), quoteAction),
    nav: navItems(content),
    socials: socialLinks(footer),
    map: mapsInfo(text(contact, 'maps_url'), text(contact, 'maps_query') || text(contact, 'address')),
    year: new Date().getFullYear(),
  };
}

export type NusaNiagaModel = ReturnType<typeof readNusaNiaga>;
