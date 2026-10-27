// Turunan konten Dermaga (fungsi murni, tanpa React): warna tema (pita pasar, footer teal-hitam, warna terang di atas
// keduanya), menu, nomor label "01 / LAYANAN", geometri garis rute hero (pin & chip pelabuhan sinkron), item yang
// dirender per section, tujuan tautan, formulir permintaan penawaran → pesan WhatsApp, dan peta lokasi. Semua tahan
// konten mentah (null, angka, list rusak). Formulir hanya MENYUSUN pesan: tidak ada data yang dikirim ke server atau
// disimpan di website.
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
import { DERMAGA_ACCENT } from './defaultContent';

// ─── Warna ────────────────────────────────────────────────────────────────────

type Rgb = [number, number, number];
const WHITE: Rgb = [255, 255, 255];
/** Tinta gelap --tpl-on-accent untuk warna tema terang (= INK di shared/utils accentVars) */
const ON_LIGHT: Rgb = [18, 22, 32];
/** Hitam kebiruan dingin #0A0F12: mix(#0F5C63, NIGHT, 0.25) = #0B2226 (footer bawaan) */
const NIGHT: Rgb = [10, 15, 18];
const toHex = (rgb: Rgb) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
/** Campuran dibulatkan: kontras dihitung dari warna yang benar-benar ditulis sebagai hex. */
const mix = (a: Rgb, b: Rgb, amountOfA: number): Rgb => a.map((c, i) => Math.round(c * amountOfA + b[i] * (1 - amountOfA))) as Rgb;

const accentOf = (raw: string): Rgb => parseHex(raw) ?? (parseHex(DERMAGA_ACCENT) as Rgb);

/**
 * Variabel warna lokal Dermaga (di samping --tpl-accent* milik Shell), semuanya dari SATU warna tema:
 * --dm-deep: teal-hitam footer (tema 25% + hitam dingin), putih ≥ 14:1;
 * --dm-band: pita pasar = warna tema bila putih di atasnya ≥ 7:1, selain itu digelapkan ke --dm-deep;
 * --dm-bright: warna tema dicerahkan sampai ≥ 4,5:1 di atas pita (pelabuhan, nomor label, nama besar footer).
 */
export function dermagaVars(accentRaw: string): CSSProperties {
  const accent = accentOf(accentRaw);
  let deep = mix(accent, NIGHT, 0.25);
  for (let i = 0; i < 12 && contrast(deep, WHITE) < 14; i += 1) deep = mix(deep, NIGHT, 0.8);
  let band = accent;
  for (let i = 0; i < 24 && contrast(band, WHITE) < 7; i += 1) band = mix(band, deep, 0.85);
  let bright = accent;
  for (let i = 0; i < 24 && contrast(bright, band) < 4.5; i += 1) bright = mix(bright, WHITE, 0.8);
  return { '--dm-deep': toHex(deep), '--dm-band': toHex(band), '--dm-bright': toHex(bright) } as CSSProperties;
}

/** true bila teks di atas bidang warna tema berwarna putih (aturan sama dengan --tpl-on-accent di accentVars). */
export function accentIsDark(accentRaw: string): boolean {
  const accent = accentOf(accentRaw);
  return contrast(accent, WHITE) >= contrast(accent, ON_LIGHT);
}

// ─── Section di halaman ───────────────────────────────────────────────────────

/** Kunci section yang punya tempat di halaman (urutan halaman; = section skema tanpa `brand`). */
export const PAGE_SECTIONS = ['hero', 'clients', 'about', 'services', 'markets', 'process', 'gallery', 'testimonials', 'faq', 'cta', 'contact', 'footer'] as const;
const KNOWN_SECTIONS = new Set<string>(PAGE_SECTIONS);

/** Section yang memakai label bernomor "01 / LAYANAN" (urutan halaman). */
const NUMBERED = ['about', 'services', 'markets', 'process', 'gallery', 'testimonials', 'faq', 'contact'];

/** [kunci list, maks. item (= skema), syarat item dirender] per section. Satu sumber untuk komponen, menu, nomor. */
const ITEMS: Record<string, [listKey: string, max: number, keep: (item: ListItem) => boolean]> = {
  clients: ['items', 12, (i) => !!(field(i, 'name') || hasImage(field(i, 'logo')))],
  services: ['items', 9, (i) => !!field(i, 'title')],
  markets: ['regions', 8, (i) => !!field(i, 'name')],
  process: ['steps', 6, (i) => !!field(i, 'title')],
  gallery: ['items', 9, (i) => hasImage(field(i, 'image'))],
  testimonials: ['items', 6, (i) => !!field(i, 'quote')],
  faq: ['items', 8, (i) => !!field(i, 'question')],
};

/** Item yang dirender untuk section `key` (lihat ITEMS); section tanpa daftar → []. */
export function sectionItems(key: string, section: SectionContent): ListItem[] {
  const rule = ITEMS[key];
  return rule ? list(section, rule[0], rule[1]).filter(rule[2]) : [];
}

/** Section tampil dan berisi? Kunci yang tidak dikenal (mis. salah ketik di field URL) → false. */
export function sectionShown(content: SiteContent, key: string): boolean {
  if (!KNOWN_SECTIONS.has(key)) return false;
  const s = getSection(content, key);
  if (!isEnabled(s)) return false;
  if (key in ITEMS) return sectionItems(key, s).length > 0;
  if (key === 'about') return !!(text(s, 'title') || text(s, 'body') || hasImage(text(s, 'image')) || list(s, 'facts', 6).some((i) => field(i, 'value')));
  if (key === 'cta') return !!(text(s, 'title') || text(s, 'subtitle'));
  return true;
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

export interface DermagaNavItem {
  key: string;
  label: string;
}

const NAV: { key: string; label: string }[] = [
  { key: 'about', label: 'Tentang' },
  { key: 'services', label: 'Layanan' },
  { key: 'markets', label: 'Pasar' },
  { key: 'process', label: 'Proses' },
  { key: 'gallery', label: 'Galeri' },
  { key: 'faq', label: 'FAQ' },
  { key: 'contact', label: 'Kontak' },
];

/** Label menu dari label kecil section bila singkat (≤ 14 huruf, ≤ 2 kata), selain itu label bawaan. */
const shortLabel = (section: SectionContent, fallback: string) => {
  const eyebrow = text(section, 'eyebrow');
  return eyebrow && eyebrow.length <= 14 && eyebrow.split(/\s+/).length <= 2 ? eyebrow : fallback;
};

/** Menu hanya untuk section yang benar-benar tampil (tanpa tautan mati). */
export function navItems(content: SiteContent): DermagaNavItem[] {
  return NAV.filter(({ key }) => sectionShown(content, key)).map(({ key, label }) => ({ key, label: shortLabel(getSection(content, key), label) }));
}

// ─── Tujuan tautan "#…" ───────────────────────────────────────────────────────

/** Anchor berbahasa Indonesia yang wajar diketik pembeli → kunci section (#kontak, #layanan, #galeri, dst. sudah
 *  diterjemahkan sectionFromAnchor). */
const ANCHOR_ALIASES: Record<string, string> = {
  profil: 'about',
  pasar: 'markets',
  rute: 'markets',
  tujuan: 'markets',
  proses: 'process',
  'cara-kerja': 'process',
  langkah: 'process',
  'tanya-jawab': 'faq',
  penawaran: 'contact',
  formulir: 'contact',
  lokasi: 'contact',
};

/** Target tautan section ("pasar", "markets", "kontak") → kunci section di halaman, atau null bila tidak dikenal. */
export function sectionTarget(target: string): string | null {
  const clean = sectionFromAnchor(target);
  const key = ANCHOR_ALIASES[clean] ?? clean;
  return KNOWN_SECTIONS.has(key) ? key : null;
}

// ─── Garis rute hero ──────────────────────────────────────────────────────────

export interface RouteLayout {
  /** viewBox SVG; rasio sama dengan kotak foto (21:9 layar lebar, 4:5 HP), jadi skala seragam */
  width: number;
  height: number;
  /** Satu jalur lengkung melewati ketiga pin */
  path: string;
  pins: readonly [readonly [number, number], readonly [number, number], readonly [number, number]];
  /** Nilai CSS `translate` chip relatif ke pin-nya (chip tidak menutupi crane di foto demo) */
  chips: readonly [string, string, string];
  /** Jari-jari pin: [luar putih, warna tema, titik tengah] */
  radius: readonly [number, number, number];
  /** Tebal garis: [lapisan gelap, garis putih] */
  stroke: readonly [number, number];
}

/** Layar lebar (@3xl+): foto 21:9; dari kiri bawah menyapu ke kanan, lalu naik ke langit kanan atas. */
export const ROUTE_WIDE: RouteLayout = {
  width: 2100,
  height: 900,
  path: 'M105 640 C 600 720, 1250 700, 1640 470 C 1820 364, 1890 250, 1930 150',
  pins: [
    [105, 640],
    [1640, 470],
    [1930, 150],
  ],
  // Asal: di atas pin. Transit: kanan-bawah pin (garis keluar ke kanan-atas). Tujuan: kiri pin, sejajar tengah (garis
  // turun curam ke kiri-bawah) — tidak ada chip yang duduk di atas garis.
  chips: ['-12px calc(-100% - 20px)', '18px 14px', 'calc(-100% - 22px) -50%'],
  radius: [17, 13, 5],
  stroke: [7, 3],
};

/** HP (< @3xl): foto 4:5; garis rute tegak dari bawah ke atas. */
export const ROUTE_TALL: RouteLayout = {
  width: 800,
  height: 1000,
  path: 'M170 860 C 170 640, 560 620, 560 470 S 260 260, 640 150',
  pins: [
    [170, 860],
    [560, 470],
    [640, 150],
  ],
  // Tujuan: kiri-ATAS pin, karena garis keluar dari pin tujuan landai ke kiri-bawah (chip sejajar tengah menutupinya)
  chips: ['18px -50%', 'calc(-100% - 18px) -50%', 'calc(-100% - 12px) calc(-100% - 8px)'],
  radius: [20, 15, 6],
  stroke: [9, 4],
};

/** Jeda munculnya pin & chip per posisi (detik): garis mulai digambar 0,4 dtk dan selesai ± 1,8 dtk. */
export const PIN_DELAYS = [0.4, 1.1, 1.8] as const;

/** Posisi pin yang dipakai untuk n pelabuhan: 1 → asal saja, 2 → asal & tujuan, 3 → asal, transit, tujuan. */
export function routeSlots(count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [0];
  if (count === 2) return [0, 2];
  return [0, 1, 2];
}

/** Persen posisi pin di kotak foto, mis. "5.00%". */
export const percent = (value: number, total: number): string => `${((value / total) * 100).toFixed(2)}%`;

// ─── Teks kecil ───────────────────────────────────────────────────────────────

/** Label dipisah "·", "|", "/" atau koma → daftar (tag layanan, Incoterm). */
export const splitTags = (raw: string): string[] =>
  (raw || '')
    .split(/\s*[·|,•]\s*|\s+\/\s+/)
    .map((tag) => tag.trim())
    .filter(Boolean);

/** Nama besar di footer: isian sendiri, selain itu nama perusahaan tanpa "PT"/"CV" di depan. */
export const wordmarkOf = (custom: string, company: string): string => custom || company.replace(/^(pt|cv|ud)\.?\s+/i, '').trim() || company;

/** Nomor dua digit "01". */
export const pad2 = (n: number): string => String(n).padStart(2, '0');

// ─── Formulir permintaan penawaran ────────────────────────────────────────────

export interface InquiryForm {
  name: string;
  company: string;
  service: string;
  product: string;
  volume: string;
  load: string;
  incoterm: string;
  country: string;
  port: string;
  schedule: string;
  note: string;
}

export type InquiryErrors = Partial<Record<keyof InquiryForm, string>>;

export const LOADS = ['FCL', 'LCL', 'Belum tahu'] as const;
export const INCOTERMS = ['EXW', 'FOB', 'CFR', 'CIF', 'DAP', 'DDP', 'Belum tahu'] as const;
/** Pilihan "Jenis layanan" bila `contact.form_services` kosong. */
export const DEFAULT_SERVICES = ['Ekspor', 'Impor', 'Trading / sourcing', 'Dokumen saja'] as const;

export const EMPTY_INQUIRY: InquiryForm = {
  name: '',
  company: '',
  service: '',
  product: '',
  volume: '',
  load: 'Belum tahu',
  incoterm: 'Belum tahu',
  country: '',
  port: '',
  schedule: '',
  note: '',
};

/** Batas panjang per isian (juga atribut maxLength di formulir). */
export const INQUIRY_LIMITS: Record<keyof InquiryForm, number> = {
  name: 60,
  company: 80,
  service: 30,
  product: 80,
  volume: 40,
  load: 12,
  incoterm: 12,
  country: 60,
  port: 60,
  schedule: 40,
  note: 400,
};

/** Layanan impor → kolom negara menjadi "Negara asal". */
export const isImport = (service: string): boolean => /impor/i.test(service || '');

/** Teks bersih satu baris: karakter kontrol dibuang, spasi dirapikan, dipotong ke `max`. */
export function cleanText(raw: string, max: number): string {
  const visible = Array.from(raw || '', (ch) => {
    const code = ch.charCodeAt(0);
    return code < 32 || code === 127 ? ' ' : ch;
  }).join('');
  return Array.from(visible.replace(/\s+/g, ' ').trim()).slice(0, max).join('').trim();
}

/** Pilihan "Jenis layanan" dari CMS (maks. 6), atau bawaan bila kosong. */
export function inquiryServices(contact: SectionContent): string[] {
  const own = list(contact, 'form_services', 6)
    .map((item) => cleanText(field(item, 'label'), INQUIRY_LIMITS.service))
    .filter(Boolean);
  return own.length > 0 ? Array.from(new Set(own)) : [...DEFAULT_SERVICES];
}

/** Pesan galat per isian wajib (kosong = valid). `services` = pilihan yang tersedia. */
export function validateInquiry(form: InquiryForm, services: readonly string[]): InquiryErrors {
  const errors: InquiryErrors = {};
  const value = (key: keyof InquiryForm) => cleanText(form[key], INQUIRY_LIMITS[key]);
  if (value('name').length < 2) errors.name = 'Tulis nama Anda.';
  if (!services.includes(form.service)) errors.service = 'Pilih jenis layanan.';
  if (!value('product')) errors.product = 'Tulis komoditas atau produk.';
  if (!value('volume')) errors.volume = 'Tulis perkiraan volume.';
  if (!value('country')) errors.country = isImport(form.service) ? 'Tulis negara asal.' : 'Tulis negara tujuan.';
  return errors;
}

/** Urutan isian wajib (fokus ke galat pertama). */
export const REQUIRED_FIELDS: (keyof InquiryForm)[] = ['name', 'service', 'product', 'volume', 'country'];

/**
 * Pesan WhatsApp permintaan penawaran: salam, baris kosong, lalu baris tetap per isian; isian opsional yang kosong tidak
 * ikut. Nama perusahaan kosong → salam tanpa nama.
 */
export function inquiryMessage(form: InquiryForm, companyName: string): string {
  const value = (key: keyof InquiryForm) => cleanText(form[key], INQUIRY_LIMITS[key]);
  const company = cleanText(companyName, 80);
  const pick = (allowed: readonly string[], raw: string) => (allowed.includes(raw) ? raw : 'Belum tahu');
  const rows = [
    `Nama: ${value('name')}`,
    value('company') && `Perusahaan: ${value('company')}`,
    value('service') && `Layanan: ${value('service')}`,
    `Komoditas/produk: ${value('product')}`,
    `Volume: ${value('volume')}`,
    `Muatan: ${pick(LOADS, form.load)}`,
    `Incoterm: ${pick(INCOTERMS, form.incoterm)}`,
    `${isImport(form.service) ? 'Negara asal' : 'Negara tujuan'}: ${value('country')}`,
    value('port') && `Pelabuhan: ${value('port')}`,
    value('schedule') && `Perkiraan jadwal: ${value('schedule')}`,
    value('note') && `Catatan: ${value('note')}`,
  ].filter(Boolean);
  const greeting = company ? `Halo ${company}, saya ingin meminta penawaran pengiriman.` : 'Halo, saya ingin meminta penawaran pengiriman.';
  return `${greeting}\n\n${rows.join('\n')}`;
}

/** mailto: dengan subjek "Permintaan penawaran" dan isi pesan (dipotong 1800 huruf); email tidak valid → "". */
export function inquiryMailHref(email: string, body: string): string {
  const mail = mailHref(email);
  if (!mail) return '';
  return `${mail}?subject=${encodeURIComponent('Permintaan penawaran')}&body=${encodeURIComponent(Array.from(body).slice(0, 1800).join(''))}`;
}

// ─── Lain-lain ────────────────────────────────────────────────────────────────

export interface SocialLink {
  key: string;
  label: string;
  href: string;
}

export const socialLinks = (footer: SectionContent): SocialLink[] =>
  SOCIAL_FIELDS.map(({ key, label }) => ({ key, label, href: safeUrl(text(footer, key)) ?? '' })).filter((s) => s.href);

// ─── Model ────────────────────────────────────────────────────────────────────

export function readDermaga(content: SiteContent) {
  const section = (key: string) => getSection(content, key);
  const brand = section('brand');
  const hero = section('hero');
  const contact = section('contact');
  const footer = section('footer');

  const companyName = text(brand, 'company_name') || 'Nama Perusahaan';
  const whatsapp = text(contact, 'whatsapp');
  const waLink = whatsappHref(whatsapp, text(contact, 'whatsapp_message'));
  const waAction: LinkAction | null = waLink ? { kind: 'external', href: waLink } : null;

  /** Section tampil & berisi di halaman (sectionShown). */
  const shown = (key: string): boolean => sectionShown(content, key);
  /** Item yang dirender untuk section `key` (sectionItems). */
  const items = (key: string): ListItem[] => sectionItems(key, section(key));
  const sectionAction = (key: string): LinkAction | null => (shown(key) ? { kind: 'section', target: key } : null);
  const contactAction = sectionAction('contact');
  /** Tujuan "minta penawaran": formulir di Kontak, kalau tidak WhatsApp, kalau tidak null (tombol disembunyikan). */
  const quoteAction: LinkAction | null = contactAction ?? waAction;
  /** Tujuan "chat": WhatsApp bila ada nomor, kalau tidak Kontak. */
  const chatAction: LinkAction | null = waAction ?? contactAction;
  /**
   * Isi field URL: "#layanan", "#pasar", "#kontak" dsb. hanya bila section itu tampil (anchor Indonesia diterjemahkan);
   * anchor tak dikenal / section tersembunyi / kosong → `fallback`.
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

  /** Nomor label "01", "02" … menurut urutan section berpenomor yang tampil DAN berlabel; selain itu "". */
  const numbered = NUMBERED.filter((key) => shown(key) && !!text(section(key), 'eyebrow'));
  const number = (key: string): string => {
    const i = numbered.indexOf(key);
    return i < 0 ? '' : pad2(i + 1);
  };

  const ports = list(hero, 'ports', 3).filter((item) => field(item, 'code') || field(item, 'name'));
  const stats = list(hero, 'stats', 4).filter((item) => field(item, 'value') || field(item, 'label'));

  return {
    brand,
    hero,
    clients: section('clients'),
    about: section('about'),
    services: section('services'),
    markets: section('markets'),
    process: section('process'),
    gallery: section('gallery'),
    testimonials: section('testimonials'),
    faq: section('faq'),
    cta: section('cta'),
    contact,
    footer,
    companyName,
    tagline: text(brand, 'tagline'),
    logo: text(brand, 'logo'),
    colors: dermagaVars(text(brand, 'accent_color')),
    whatsapp,
    waAction,
    contactAction,
    quoteAction,
    chatAction,
    shown,
    items,
    number,
    sectionAction,
    linkOr,
    waWith,
    ports,
    stats,
    /** Tombol utama hero: tautan sendiri, kalau kosong ke formulir di Kontak */
    primaryAction: linkOr(text(hero, 'primary_url'), quoteAction),
    /** Tombol kedua hero: tautan sendiri, kalau kosong ke Layanan */
    secondaryAction: linkOr(text(hero, 'secondary_url'), sectionAction('services')),
    /** Tombol di menu atas */
    headerLabel: text(hero, 'header_label'),
    headerAction: linkOr(text(hero, 'header_url'), contactAction ?? waAction),
    nav: navItems(content),
    socials: socialLinks(footer),
    map: mapsInfo(text(contact, 'maps_url'), text(contact, 'maps_query') || text(contact, 'address')),
    year: new Date().getFullYear(),
  };
}

export type DermagaModel = ReturnType<typeof readDermaga>;
