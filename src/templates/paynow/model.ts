// Turunan konten PayNow (fungsi murni, tanpa React): warna tema (malam indigo, gradasi biru → indigo → ungu, lavender,
// warna terang di atas gelap), section tampil & item yang dirender, menu, tujuan tautan, simulasi biaya (contoh tarif
// dari CMS), formulir pendaftaran merchant → pesan WhatsApp, dan contoh kode API. Semua tahan konten mentah (null,
// angka, list rusak). JUJUR: template ini halaman pemasaran — tidak memproses pembayaran, tidak menyimpan saldo, dan
// formulir hanya MENYUSUN pesan (tidak ada data yang dikirim ke server atau disimpan di website).
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
  parseHex,
  resolveAction,
  safeUrl,
  sectionFromAnchor,
  text,
  whatsappHref,
  type LinkAction,
} from '../shared/utils';
import { PAYNOW_ACCENT } from './defaultContent';

// ─── Warna ────────────────────────────────────────────────────────────────────

type Rgb = [number, number, number];
const WHITE: Rgb = [255, 255, 255];
/** Tinta gelap --tpl-on-accent untuk warna tema terang (= INK di shared/utils accentVars) */
const ON_LIGHT: Rgb = [18, 22, 32];
/** Biru-hitam pekat: dasar malam indigo */
const DEEP: Rgb = [6, 6, 26];
const toHex = (rgb: Rgb) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
/** Campuran dibulatkan: kontras dihitung dari warna yang benar-benar ditulis sebagai hex. */
const mix = (a: Rgb, b: Rgb, amountOfA: number): Rgb => a.map((c, i) => Math.round(c * amountOfA + b[i] * (1 - amountOfA))) as Rgb;

type Hsl = [number, number, number];
function toHsl([r8, g8, b8]: Rgb): Hsl {
  const [r, g, b] = [r8 / 255, g8 / 255, b8 / 255];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function fromHsl([hue, s, l]: Hsl): Rgb {
  const h = (((hue % 360) + 360) % 360) / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t0: number) => {
    let t = t0;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map((c) => Math.round(c * 255)) as Rgb;
}

/** Warna tema digeser hue-nya `shift` derajat, lalu digelapkan (L turun) sampai teks putih di atasnya ≥ 4,6:1. */
function gradientStop(accent: Rgb, shift: number): Rgb {
  const [h, s, l] = toHsl(accent);
  let light = l;
  let color = fromHsl([h + shift, s, light]);
  for (let i = 0; i < 60 && contrast(color, WHITE) < 4.6; i += 1) {
    light = Math.max(0, light - 0.015);
    color = fromHsl([h + shift, s, light]);
  }
  return color;
}

const accentOf = (raw: string): Rgb => parseHex(raw) ?? (parseHex(PAYNOW_ACCENT) as Rgb);

export interface PaynowPalette {
  night: string;
  blue: string;
  band: string;
  violet: string;
  glow: string;
  mist: string;
}

/**
 * Palet PayNow dari SATU warna tema:
 * night  = malam indigo (tema 16% + biru-hitam), putih ≥ 16:1 — header tergulir, section keamanan, jendela kode, footer;
 * blue / band / violet = tiga titik gradasi (hue −26°, tema, hue +30°), masing-masing putih ≥ 4,6:1;
 * glow   = tema dicerahkan sampai ≥ 7:1 di atas night (kata sorotan, label di gelap);
 * mist   = lavender 5% tema (section terang).
 */
export function paynowPalette(accentRaw: string): PaynowPalette {
  const accent = accentOf(accentRaw);
  let night = mix(accent, DEEP, 0.16);
  for (let i = 0; i < 12 && contrast(night, WHITE) < 16; i += 1) night = mix(night, DEEP, 0.8);
  let glow = mix(accent, WHITE, 0.45);
  for (let i = 0; i < 24 && contrast(glow, night) < 7; i += 1) glow = mix(glow, WHITE, 0.85);
  return {
    night: toHex(night),
    blue: toHex(gradientStop(accent, -26)),
    band: toHex(gradientStop(accent, 0)),
    violet: toHex(gradientStop(accent, 30)),
    glow: toHex(glow),
    mist: toHex(mix(accent, WHITE, 0.05)),
  };
}

const BLACK: Rgb = [0, 0, 0];

/**
 * Tinta teks warna tema (label section, tautan teks, angka "Diterima merchant", lencana POST): warna tema digelapkan
 * sampai ≥ 4,6:1 di putih, di lavender (mist), dan di bidang 14% tema (--tpl-accent-100). --tpl-accent-ink milik Shell
 * hanya dijamin di putih; warna terang (kuning, hijau muda) bisa turun di bawah 4,5:1 di lavender.
 */
export function paynowInk(accentRaw: string): string {
  const accent = accentOf(accentRaw);
  const grounds = [WHITE, mix(accent, WHITE, 0.05), mix(accent, WHITE, 0.14)];
  let ink = accent;
  for (let i = 0; i < 40 && Math.min(...grounds.map((g) => contrast(ink, g))) < 4.6; i += 1) ink = mix(ink, BLACK, 0.9);
  return toHex(ink);
}

/** Variabel CSS lokal PayNow (di samping --tpl-accent* milik Shell). */
export function paynowVars(accentRaw: string): CSSProperties {
  const p = paynowPalette(accentRaw);
  return {
    '--pn-ink': paynowInk(accentRaw),
    '--pn-night': p.night,
    '--pn-blue': p.blue,
    '--pn-band': p.band,
    '--pn-violet': p.violet,
    '--pn-glow': p.glow,
    '--pn-mist': p.mist,
    '--pn-grad': `linear-gradient(115deg, ${p.blue} 0%, ${p.band} 52%, ${p.violet} 100%)`,
  } as CSSProperties;
}

/** true bila teks di atas bidang warna tema berwarna putih (aturan sama dengan --tpl-on-accent di accentVars). */
export function accentIsDark(accentRaw: string): boolean {
  const accent = accentOf(accentRaw);
  return contrast(accent, WHITE) >= contrast(accent, ON_LIGHT);
}

// ─── Section di halaman ───────────────────────────────────────────────────────

/** Kunci section yang punya tempat di halaman (urutan halaman; = section skema tanpa `brand`). */
export const PAGE_SECTIONS = [
  'hero',
  'trust',
  'features',
  'fees',
  'security',
  'developers',
  'stats',
  'testimonials',
  'faq',
  'download',
  'contact',
  'footer',
] as const;
const KNOWN_SECTIONS = new Set<string>(PAGE_SECTIONS);

/** [kunci list, maks. item (= skema), syarat item dirender] per section. Satu sumber untuk komponen dan menu. */
const ITEMS: Record<string, [listKey: string, max: number, keep: (item: ListItem) => boolean]> = {
  trust: ['items', 16, (i) => !!field(i, 'label')],
  features: ['items', 5, (i) => !!field(i, 'label')],
  fees: ['rates', 6, (i) => parseRate(i) !== null],
  security: ['items', 6, (i) => !!field(i, 'title')],
  stats: ['items', 4, (i) => !!field(i, 'value')],
  testimonials: ['items', 6, (i) => !!field(i, 'quote')],
  faq: ['items', 8, (i) => !!field(i, 'question')],
};

/** Item yang dirender untuk section `key` (lihat ITEMS); section tanpa daftar → []. */
export function sectionItems(key: string, section: SectionContent): ListItem[] {
  const rule = ITEMS[key];
  return rule ? list(section, rule[0], rule[1]).filter(rule[2]) : [];
}

/** Contoh kode API yang dirender (label + kode wajib), maks. 4. */
export const codeSamples = (developers: SectionContent): ListItem[] =>
  list(developers, 'samples', 4).filter((i) => !!field(i, 'label') && !!field(i, 'code'));

/** Endpoint API yang dirender (path wajib), maks. 6. */
export const endpoints = (developers: SectionContent): ListItem[] => list(developers, 'endpoints', 6).filter((i) => !!field(i, 'path'));

/** Section tampil dan berisi? Kunci yang tidak dikenal (mis. salah ketik di field URL) → false. */
export function sectionShown(content: SiteContent, key: string): boolean {
  if (!KNOWN_SECTIONS.has(key)) return false;
  const s = getSection(content, key);
  if (!isEnabled(s)) return false;
  if (key in ITEMS) return sectionItems(key, s).length > 0;
  if (key === 'developers') return codeSamples(s).length > 0 || endpoints(s).length > 0;
  if (key === 'download') return !!(text(s, 'title') || safeUrl(text(s, 'play_url')) || safeUrl(text(s, 'app_url')));
  return true;
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

export interface PaynowNavItem {
  key: string;
  label: string;
}

const NAV: PaynowNavItem[] = [
  { key: 'features', label: 'Fitur' },
  { key: 'fees', label: 'Biaya' },
  { key: 'security', label: 'Keamanan' },
  { key: 'developers', label: 'Developer' },
  { key: 'faq', label: 'FAQ' },
  { key: 'download', label: 'Unduh' },
];

/** Label menu dari label kecil section bila singkat (≤ 12 huruf, ≤ 2 kata), selain itu label bawaan. */
const shortLabel = (section: SectionContent, fallback: string) => {
  const eyebrow = text(section, 'eyebrow');
  return eyebrow && eyebrow.length <= 12 && eyebrow.split(/\s+/).length <= 2 ? eyebrow : fallback;
};

/** Menu hanya untuk section yang benar-benar tampil (tanpa tautan mati). */
export function navItems(content: SiteContent): PaynowNavItem[] {
  return NAV.filter(({ key }) => sectionShown(content, key)).map(({ key, label }) => ({ key, label: shortLabel(getSection(content, key), label) }));
}

// ─── Tujuan tautan "#…" ───────────────────────────────────────────────────────

/** Anchor berbahasa Indonesia yang wajar diketik pembeli → kunci section. */
const ANCHOR_ALIASES: Record<string, string> = {
  fitur: 'features',
  layanan: 'features',
  biaya: 'fees',
  tarif: 'fees',
  simulasi: 'fees',
  keamanan: 'security',
  developer: 'developers',
  api: 'developers',
  dokumentasi: 'developers',
  angka: 'stats',
  statistik: 'stats',
  merchant: 'contact',
  daftar: 'contact',
  pendaftaran: 'contact',
  unduh: 'download',
  aplikasi: 'download',
  'tanya-jawab': 'faq',
  kepercayaan: 'trust',
};

/** Target tautan section ("biaya", "fees", "kontak") → kunci section di halaman, atau null bila tidak dikenal. */
export function sectionTarget(target: string): string | null {
  const clean = sectionFromAnchor(target);
  const key = ANCHOR_ALIASES[clean] ?? clean;
  return KNOWN_SECTIONS.has(key) ? key : null;
}

// ─── Teks kecil ───────────────────────────────────────────────────────────────

/** Label dipisah "·", "|", "•" atau koma → daftar. */
export const splitTags = (raw: string): string[] =>
  (raw || '')
    .split(/\s*[·|•,]\s*/)
    .map((tag) => tag.trim())
    .filter(Boolean);

/** Nomor dua digit "01". */
export const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Nomor HP Indonesia yang ditulis rapat ("081234567890") → "0812-3456-7890"; format lain apa adanya. */
export const displayPhone = (raw: string): string => {
  const value = (raw || '').trim();
  return /^08\d{8,11}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8)}` : value;
};

/** Nominal transaksi bertanda "+" (uang masuk) → true. */
export const isCredit = (amount: string): boolean => /^\s*\+/.test(amount || '');

/** Metode HTTP endpoint (huruf besar, maks. 6) → kelas warna lencana. */
export const methodTone = (method: string): 'post' | 'get' | 'other' => {
  const m = (method || '').trim().toUpperCase();
  if (m === 'POST' || m === 'PUT' || m === 'PATCH') return 'post';
  if (m === 'GET') return 'get';
  return 'other';
};

// ─── Simulasi biaya ───────────────────────────────────────────────────────────

/** Nominal terbesar yang dihitung (Rp1 miliar). */
export const MAX_AMOUNT = 1_000_000_000;

export interface FeeRate {
  name: string;
  /** Persen 0–100 (mis. 0,7) */
  percent: number;
  /** Biaya tetap dalam rupiah */
  flat: number;
}

/** "0,7", "0.7%", "2,9 %" → 0.7 / 2.9; kosong/tidak valid → 0; dibatasi 0–100. */
export function parsePercent(raw: string): number {
  const value = (raw || '').replace(/%/g, '').trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(value)) return 0;
  return Math.min(100, Number(value));
}

/** "Rp2.000", "2000", "Rp 4.000" → 2000 (angka bulat; titik/koma ribuan dibuang). */
export function parseRupiah(raw: string): number {
  const digits = (raw || '').replace(/[^\d]/g, '');
  if (!digits) return 0;
  return Math.min(MAX_AMOUNT, Number(digits.slice(0, 12)));
}

/** Nominal dari isian pengguna: hanya angka, dibatasi 0 … Rp1 miliar. */
export const parseAmount = (raw: string): number => parseRupiah(raw);

/** 1250000 → "1.250.000" (pemisah ribuan Indonesia). */
export const formatThousands = (n: number): string =>
  Math.max(0, Math.round(Number.isFinite(n) ? n : 0))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** 1250000 → "Rp1.250.000". */
export const formatRupiah = (n: number): string => `Rp${formatThousands(n)}`;

/** Persen untuk dibaca: 0.7 → "0,7%", 2 → "2%". */
export const formatPercent = (n: number): string => `${String(Math.round(n * 100) / 100).replace('.', ',')}%`;

/** Baris tarif dari CMS → tarif; tanpa nama, atau tanpa persen DAN biaya tetap → null. */
export function parseRate(item: ListItem): FeeRate | null {
  const name = field(item, 'name');
  const percent = parsePercent(field(item, 'percent'));
  const flat = parseRupiah(field(item, 'flat'));
  if (!name || (percent <= 0 && flat <= 0)) return null;
  return { name, percent, flat };
}

/** Tarif yang dipakai simulasi (maks. 6, urutan CMS). */
export const feeRates = (fees: SectionContent): FeeRate[] => sectionItems('fees', fees).map((i) => parseRate(i) as FeeRate);

/** Tarif untuk dibaca: "0,7%", "Rp4.000", "2,9% + Rp2.000". */
export function rateLabel(rate: FeeRate): string {
  const parts = [rate.percent > 0 ? formatPercent(rate.percent) : '', rate.flat > 0 ? formatRupiah(rate.flat) : ''].filter(Boolean);
  return parts.join(' + ');
}

/** Biaya satu transaksi: nominal × persen + biaya tetap, dibulatkan ke rupiah; nominal 0 → 0. */
export function feeOf(amount: number, rate: FeeRate): number {
  if (!(amount > 0)) return 0;
  return Math.round((amount * rate.percent) / 100 + rate.flat);
}

export type FeeBearer = 'merchant' | 'customer';

export interface FeeResult {
  fee: number;
  /** Dibayar pelanggan */
  paid: number;
  /** Diterima merchant */
  received: number;
}

/**
 * Simulasi: biaya ditanggung merchant → pelanggan membayar nominal, merchant menerima nominal − biaya (tidak negatif);
 * ditanggung pelanggan → pelanggan membayar nominal + biaya, merchant menerima nominal utuh.
 */
export function simulateFee(amountRaw: number, rate: FeeRate | null, bearer: FeeBearer): FeeResult {
  const amount = Math.min(MAX_AMOUNT, Math.max(0, Math.round(Number.isFinite(amountRaw) ? amountRaw : 0)));
  const fee = rate ? feeOf(amount, rate) : 0;
  if (bearer === 'customer') return { fee, paid: amount > 0 ? amount + fee : 0, received: amount };
  return { fee, paid: amount, received: Math.max(0, amount - fee) };
}

// ─── Formulir pendaftaran merchant ────────────────────────────────────────────

export interface MerchantForm {
  name: string;
  business: string;
  category: string;
  city: string;
  volume: string;
  service: string;
  note: string;
}

export type MerchantErrors = Partial<Record<keyof MerchantForm, string>>;

/** Perkiraan transaksi per bulan (pilihan tetap). */
export const VOLUMES = ['Belum tahu', 'Kurang dari 100', '100–1.000', '1.000–10.000', 'Lebih dari 10.000'] as const;
/** Layanan yang diminati (pilihan tetap). */
export const SERVICES = ['Belum tahu', 'QRIS di kasir', 'Link pembayaran', 'Integrasi API', 'Aplikasi dompet'] as const;
/** Pilihan "Jenis usaha" bila `contact.form_categories` kosong. */
export const DEFAULT_CATEGORIES = ['Makanan & minuman', 'Toko retail', 'Jasa', 'Toko online', 'Lainnya'] as const;

export const EMPTY_MERCHANT: MerchantForm = {
  name: '',
  business: '',
  category: '',
  city: '',
  volume: 'Belum tahu',
  service: 'Belum tahu',
  note: '',
};

/** Batas panjang per isian (juga atribut maxLength di formulir). */
export const MERCHANT_LIMITS: Record<keyof MerchantForm, number> = {
  name: 60,
  business: 80,
  category: 30,
  city: 60,
  volume: 24,
  service: 24,
  note: 300,
};

/** Teks bersih satu baris: karakter kontrol dibuang, spasi dirapikan, dipotong ke `max`. */
export function cleanText(raw: string, max: number): string {
  const visible = Array.from(raw || '', (ch) => {
    const code = ch.charCodeAt(0);
    return code < 32 || code === 127 ? ' ' : ch;
  }).join('');
  return Array.from(visible.replace(/\s+/g, ' ').trim()).slice(0, max).join('').trim();
}

/** Pilihan "Jenis usaha" dari CMS (maks. 8, unik), atau bawaan bila kosong. */
export function merchantCategories(contact: SectionContent): string[] {
  const own = list(contact, 'form_categories', 8)
    .map((item) => cleanText(field(item, 'label'), MERCHANT_LIMITS.category))
    .filter(Boolean);
  return own.length > 0 ? Array.from(new Set(own)) : [...DEFAULT_CATEGORIES];
}

/** Urutan isian wajib (fokus ke galat pertama). */
export const MERCHANT_REQUIRED: (keyof MerchantForm)[] = ['name', 'business', 'category', 'city'];

/** Pesan galat per isian wajib (kosong = valid). `categories` = pilihan yang tersedia. */
export function validateMerchant(form: MerchantForm, categories: readonly string[]): MerchantErrors {
  const errors: MerchantErrors = {};
  const value = (key: keyof MerchantForm) => cleanText(form[key], MERCHANT_LIMITS[key]);
  if (value('name').length < 2) errors.name = 'Tulis nama Anda.';
  if (!value('business')) errors.business = 'Tulis nama usaha.';
  if (!categories.includes(form.category)) errors.category = 'Pilih jenis usaha.';
  if (!value('city')) errors.city = 'Tulis kota usaha.';
  return errors;
}

/**
 * Pesan WhatsApp pendaftaran merchant: salam, baris kosong, lalu baris tetap per isian; pilihan di luar daftar →
 * "Belum tahu"; catatan kosong tidak ikut. Nama merek kosong → salam tanpa nama.
 */
export function merchantMessage(form: MerchantForm, brandName: string): string {
  const value = (key: keyof MerchantForm) => cleanText(form[key], MERCHANT_LIMITS[key]);
  const brand = cleanText(brandName, 60);
  const pick = (allowed: readonly string[], raw: string) => (allowed.includes(raw) ? raw : 'Belum tahu');
  const rows = [
    `Nama: ${value('name')}`,
    `Nama usaha: ${value('business')}`,
    `Jenis usaha: ${value('category')}`,
    `Kota: ${value('city')}`,
    `Transaksi per bulan: ${pick(VOLUMES, form.volume)}`,
    `Layanan yang diminati: ${pick(SERVICES, form.service)}`,
    value('note') && `Catatan: ${value('note')}`,
  ].filter(Boolean);
  const greeting = brand ? `Halo ${brand}, saya ingin mendaftar sebagai merchant.` : 'Halo, saya ingin mendaftar sebagai merchant.';
  return `${greeting}\n\n${rows.join('\n')}`;
}

/** mailto: dengan subjek "Pendaftaran merchant" dan isi pesan (dipotong 1800 huruf); email tidak valid → "". */
export function merchantMailHref(email: string, body: string): string {
  const mail = mailHref(email);
  if (!mail) return '';
  return `${mail}?subject=${encodeURIComponent('Pendaftaran merchant')}&body=${encodeURIComponent(Array.from(body).slice(0, 1800).join(''))}`;
}

// ─── Contoh kode ──────────────────────────────────────────────────────────────

export type CodeToken = { kind: 'plain' | 'string' | 'comment' | 'number'; text: string };

// Komentar hanya di awal baris atau setelah spasi ("https://…" bukan komentar)
const TOKEN = /((?<=^|\s)\/\/.*$|(?<=^|\s)#.*$|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|\b\d+(?:\.\d+)?\b)/g;

/**
 * Pewarnaan sederhana satu baris kode (string, komentar, angka) untuk jendela kode. Hanya membagi teks; tidak pernah
 * menghasilkan HTML. Gabungan semua token = baris aslinya.
 */
export function tokenizeLine(line: string): CodeToken[] {
  const out: CodeToken[] = [];
  let last = 0;
  for (const match of line.matchAll(TOKEN)) {
    const start = match.index ?? 0;
    if (start > last) out.push({ kind: 'plain', text: line.slice(last, start) });
    const value = match[0];
    const kind: CodeToken['kind'] = /^(\/\/|#)/.test(value) ? 'comment' : /^\d/.test(value) ? 'number' : 'string';
    out.push({ kind, text: value });
    last = start + value.length;
  }
  if (last < line.length) out.push({ kind: 'plain', text: line.slice(last) });
  return out;
}

/** Kode dari CMS → baris (tab jadi 2 spasi, CRLF dirapikan, maks. 60 baris). */
export const codeLines = (code: string): string[] =>
  (code || '')
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, '  ')
    .replace(/\s+$/, '')
    .split('\n')
    .slice(0, 60);

// ─── Lain-lain ────────────────────────────────────────────────────────────────

export interface SocialLink {
  key: string;
  label: string;
  href: string;
}

export const socialLinks = (footer: SectionContent): SocialLink[] =>
  SOCIAL_FIELDS.map(({ key, label }) => ({ key, label, href: safeUrl(text(footer, key)) ?? '' })).filter((s) => s.href);

/** Huruf awal untuk avatar bulat (nama sapaan "Halo, Rani" → "R"). */
export const greetingInitial = (greeting: string): string => {
  const name = (greeting || '').split(',').pop()?.trim() || greeting || '';
  return (Array.from(name.replace(/[^\p{L}\p{N}]/gu, ''))[0] ?? 'P').toUpperCase();
};

// ─── Model ────────────────────────────────────────────────────────────────────

export function readPaynow(content: SiteContent) {
  const section = (key: string) => getSection(content, key);
  const brand = section('brand');
  const hero = section('hero');
  const contact = section('contact');
  const footer = section('footer');
  const download = section('download');

  const companyName = text(brand, 'company_name') || 'Nama Merek';
  const whatsapp = text(contact, 'whatsapp');
  const waLink = whatsappHref(whatsapp, text(contact, 'whatsapp_message'));
  const waAction: LinkAction | null = waLink ? { kind: 'external', href: waLink } : null;

  const shown = (key: string): boolean => sectionShown(content, key);
  const items = (key: string): ListItem[] => sectionItems(key, section(key));
  const sectionAction = (key: string): LinkAction | null => (shown(key) ? { kind: 'section', target: key } : null);
  const contactAction = sectionAction('contact');
  /**
   * Isi field URL: "#biaya", "#fitur", "#kontak" dsb. hanya bila section itu tampil (anchor Indonesia diterjemahkan);
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

  const playUrl = safeUrl(text(download, 'play_url'));
  const appUrl = safeUrl(text(download, 'app_url'));
  /** Tombol toko aplikasi yang tampil (tautan kosong/tidak aman → disembunyikan). */
  const stores = [
    playUrl && text(download, 'play_label') ? { key: 'play', label: text(download, 'play_label'), href: playUrl } : null,
    appUrl && text(download, 'app_label') ? { key: 'app', label: text(download, 'app_label'), href: appUrl } : null,
  ].filter((s): s is { key: string; label: string; href: string } => !!s);

  const downloadAction = sectionAction('download');

  return {
    brand,
    hero,
    trust: section('trust'),
    features: section('features'),
    fees: section('fees'),
    security: section('security'),
    developers: section('developers'),
    stats: section('stats'),
    testimonials: section('testimonials'),
    faq: section('faq'),
    download,
    contact,
    footer,
    companyName,
    tagline: text(brand, 'tagline'),
    logo: text(brand, 'logo'),
    colors: paynowVars(text(brand, 'accent_color')),
    whatsapp,
    waAction,
    contactAction,
    shown,
    items,
    sectionAction,
    linkOr,
    waWith,
    stores,
    chips: list(hero, 'chips', 3).filter((i) => !!field(i, 'label')),
    actions: list(hero, 'actions', 4).filter((i) => !!field(i, 'label')),
    transactions: list(hero, 'transactions', 3).filter((i) => !!field(i, 'title')),
    notifications: list(hero, 'notifications', 3).filter((i) => !!field(i, 'title')),
    /** Tombol utama hero: tautan sendiri, kalau kosong ke Unduh aplikasi, lalu WhatsApp */
    primaryAction: linkOr(text(hero, 'primary_url'), downloadAction ?? contactAction ?? waAction),
    /** Tombol kedua hero: tautan sendiri, kalau kosong ke Simulasi biaya, lalu Daftar merchant */
    secondaryAction: linkOr(text(hero, 'secondary_url'), sectionAction('fees') ?? contactAction),
    headerLabel: text(hero, 'header_label'),
    headerAction: linkOr(text(hero, 'header_url'), contactAction ?? waAction),
    nav: navItems(content),
    socials: socialLinks(footer),
    hasHeroImage: hasImage(text(hero, 'image')),
    year: new Date().getFullYear(),
  };
}

export type PaynowModel = ReturnType<typeof readPaynow>;
