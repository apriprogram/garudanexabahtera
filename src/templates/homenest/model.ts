// Turunan konten HomeNest (fungsi murni, tanpa React): warna tema (pita hijau tua, teks aksen di krem), section yang
// tampil, menu, tujuan tautan, harga (baca "Rp1.450.000.000" / "1,45 M" / "985 jt", tulis "Rp1,45 M"), rentang harga
// filter, saringan & urutan listing, simulasi KPR (anuitas, bunga tetap), formulir jadwal kunjungan → pesan WhatsApp,
// dan peta. Semua tahan konten mentah (null, angka, list rusak). Formulir & simulasi hanya MENGHITUNG/MENYUSUN pesan:
// tidak ada data yang dikirim ke server atau disimpan di website; simulasi KPR bukan penawaran bank.
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
import { HOMENEST_ACCENT } from './defaultContent';

// ─── Warna ────────────────────────────────────────────────────────────────────

type Rgb = [number, number, number];
const WHITE: Rgb = [255, 255, 255];
/** Krem pita A (#F4EFE4) */
export const CREAM: Rgb = [244, 239, 228];
/** Hijau-hitam #0E1612: mix(#2E5141, NIGHT, 0,5) = #1E342A (pita & footer bawaan) */
const NIGHT: Rgb = [14, 22, 18];
const toHex = (rgb: Rgb) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
/** Campuran dibulatkan: kontras dihitung dari warna yang benar-benar ditulis sebagai hex. */
const mix = (a: Rgb, b: Rgb, amountOfA: number): Rgb => a.map((c, i) => Math.round(c * amountOfA + b[i] * (1 - amountOfA))) as Rgb;

const accentOf = (raw: string): Rgb => parseHex(raw) ?? (parseHex(HOMENEST_ACCENT) as Rgb);

/**
 * Variabel warna lokal HomeNest (di samping --tpl-accent* milik Shell), semuanya dari SATU warna tema:
 * --hn-deep: hijau tua pita tur, panel KPR, dan footer (tema 50% + hijau-hitam), putih ≥ 12:1 (krem ≥ 11:1);
 * --hn-ink: teks aksen di krem #F4EFE4 / putih hangat (harga, label, ikon), ≥ 4,5:1 di krem.
 */
export function homenestVars(accentRaw: string): CSSProperties {
  const accent = accentOf(accentRaw);
  let deep = mix(accent, NIGHT, 0.5);
  for (let i = 0; i < 16 && contrast(deep, WHITE) < 12; i += 1) deep = mix(deep, NIGHT, 0.8);
  let ink = accent;
  for (let i = 0; i < 24 && contrast(ink, CREAM) < 4.5; i += 1) ink = mix(ink, NIGHT, 0.85);
  return { '--hn-deep': toHex(deep), '--hn-ink': toHex(ink) } as CSSProperties;
}

// ─── Section di halaman ───────────────────────────────────────────────────────

/** Kunci section yang punya tempat di halaman (urutan halaman; = section skema tanpa `brand`). */
export const PAGE_SECTIONS = ['hero', 'listings', 'tour', 'kpr', 'developer', 'amenities', 'testimonials', 'agents', 'faq', 'contact', 'footer'] as const;
const KNOWN_SECTIONS = new Set<string>(PAGE_SECTIONS);

/** [kunci list, maks. item (= skema), syarat item dirender] per section. Satu sumber untuk komponen dan menu. */
const ITEMS: Record<string, [listKey: string, max: number, keep: (item: ListItem) => boolean]> = {
  listings: ['items', 12, (i) => !!field(i, 'title')],
  tour: ['rooms', 6, (i) => hasImage(field(i, 'image'))],
  amenities: ['items', 10, (i) => !!field(i, 'title')],
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
  if (key === 'developer') {
    return !!(text(s, 'title') || text(s, 'body') || list(s, 'stats', 4).some((i) => field(i, 'value')) || list(s, 'projects', 3).some((i) => hasImage(field(i, 'image'))));
  }
  // kpr, agents (formulir selalu ada), contact, hero, footer
  return true;
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

export interface HomeNestNavItem {
  key: string;
  label: string;
}

/** Menu singkat (label tetap agar muat satu baris di samping logo). */
const NAV: HomeNestNavItem[] = [
  { key: 'listings', label: 'Rumah' },
  { key: 'tour', label: 'Tur' },
  { key: 'kpr', label: 'KPR' },
  { key: 'developer', label: 'Developer' },
  { key: 'amenities', label: 'Fasilitas' },
  { key: 'agents', label: 'Agen' },
  { key: 'contact', label: 'Kontak' },
];

/** Menu hanya untuk section yang benar-benar tampil (tanpa tautan mati). */
export function navItems(content: SiteContent): HomeNestNavItem[] {
  return NAV.filter(({ key }) => sectionShown(content, key));
}

// ─── Tujuan tautan "#…" ───────────────────────────────────────────────────────

/** Anchor berbahasa Indonesia yang wajar diketik pembeli → kunci section. */
const ANCHOR_ALIASES: Record<string, string> = {
  rumah: 'listings',
  listing: 'listings',
  properti: 'listings',
  unit: 'listings',
  katalog: 'listings',
  tur: 'tour',
  'tur-virtual': 'tour',
  'virtual-tour': 'tour',
  simulasi: 'kpr',
  'simulasi-kpr': 'kpr',
  pengembang: 'developer',
  profil: 'developer',
  fasilitas: 'amenities',
  agen: 'agents',
  kunjungan: 'agents',
  jadwal: 'agents',
  'tanya-jawab': 'faq',
  lokasi: 'contact',
  kantor: 'contact',
};

/** Target tautan section ("rumah", "listings", "kontak") → kunci section di halaman, atau null bila tidak dikenal. */
export function sectionTarget(target: string): string | null {
  const clean = sectionFromAnchor(target);
  const key = ANCHOR_ALIASES[clean] ?? clean;
  return KNOWN_SECTIONS.has(key) ? key : null;
}

// ─── Angka & harga ────────────────────────────────────────────────────────────

/** "1.450.000.000" (pemisah ribuan titik). */
export const groupThousands = (n: number): string => {
  const value = Math.round(Math.abs(n));
  return `${n < 0 ? '-' : ''}${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};

/** "Rp1.450.000.000" */
export const formatRupiah = (n: number): string => `Rp${groupThousands(n)}`;

/** Desimal Indonesia dengan maks. `digits` angka di belakang koma, nol di belakang dibuang: 1.45 → "1,45", 3.4 → "3,4". */
export const formatDecimal = (n: number, digits = 2): string => {
  const [whole, frac = ''] = (Math.round(n * 10 ** digits) / 10 ** digits).toFixed(digits).split('.');
  const trimmed = frac.replace(/0+$/, '');
  return `${groupThousands(Number(whole))}${trimmed ? `,${trimmed}` : ''}`;
};

/** Spasi tak terputus antara angka dan satuan ("Rp1,45 M" tidak terbelah di akhir baris). */
export const NBSP = String.fromCharCode(160);

/** Harga singkat: ≥ 1 miliar → "Rp1,45 M", ≥ 1 juta → "Rp985 jt", selain itu rupiah penuh; 0 / tidak valid → "". */
export function formatPriceShort(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n >= 1e9) return `Rp${formatDecimal(n / 1e9, 2)}${NBSP}M`;
  if (n >= 1e6) return `Rp${formatDecimal(n / 1e6, 1)}${NBSP}jt`;
  return formatRupiah(n);
}

const UNITS: [RegExp, number][] = [
  [/^(m|miliar|milyar)$/i, 1e9],
  [/^(jt|juta)$/i, 1e6],
  [/^(rb|ribu)$/i, 1e3],
];

/**
 * Harga dari CMS → rupiah. Angka biasa ("1450000000", "Rp1.450.000.000") = rupiah; dengan satuan ("1,45 M", "Rp985 jt",
 * "1.5 miliar") = desimal × satuan. Tidak terbaca → 0 ("Harga menyusul"). Maks. 15 digit.
 */
export function parsePrice(raw: string | number | null | undefined): number {
  const value = String(raw ?? '').trim();
  if (!value) return 0;
  const withUnit = /^(?:rp\.?\s*)?(\d[\d.,]*)\s*([a-z]+)\.?$/i.exec(value);
  if (withUnit) {
    const unit = UNITS.find(([pattern]) => pattern.test(withUnit[2]));
    if (unit) {
      const n = Number.parseFloat(withUnit[1].replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
      return Number.isFinite(n) && n > 0 ? Math.round(n * unit[1]) : 0;
    }
  }
  const digits = value.replace(/\D/g, '').slice(0, 15);
  return digits ? Number(digits) : 0;
}

/** Desimal dari CMS/isian: "7,5" → 7.5, "7.5" → 7.5; tidak terbaca → `fallback`. */
export function parseDecimal(raw: string | number | null | undefined, fallback = 0): number {
  const n = Number.parseFloat(String(raw ?? '').trim().replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

/** Luas/jumlah dari CMS: "120", "120 m²" → 120; kosong → 0. */
export const parseCount = (raw: string): number => {
  const n = Number.parseFloat((raw || '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

// ─── Rentang harga filter ─────────────────────────────────────────────────────

export interface PriceRange {
  id: string;
  label: string;
  /** Rupiah, termasuk */
  min: number;
  /** Rupiah, tidak termasuk; null = tanpa batas atas */
  max: number | null;
}

/**
 * Rentang harga dari batas dalam JUTA rupiah ("1000, 2000, 3000"): Di bawah Rp1 M · Rp1 M – Rp2 M · Rp2 M – Rp3 M ·
 * Di atas Rp3 M. Batas diurutkan, duplikat & nilai tidak valid dibuang, maks. 5 batas. Kosong → [] (filter harga hilang).
 */
export function priceRanges(raw: string): PriceRange[] {
  const steps = Array.from(
    new Set(
      (raw || '')
        .split(/[,;\s]+/)
        .map((part) => Number.parseFloat(part.replace(/\./g, '')))
        .filter((n) => Number.isFinite(n) && n > 0)
        .map((n) => Math.round(n * 1e6)),
    ),
  )
    .sort((a, b) => a - b)
    .slice(0, 5);
  if (steps.length === 0) return [];
  const ranges: PriceRange[] = [{ id: 'r0', label: `Di bawah ${formatPriceShort(steps[0])}`, min: 0, max: steps[0] }];
  for (let i = 1; i < steps.length; i += 1) {
    ranges.push({ id: `r${i}`, label: `${formatPriceShort(steps[i - 1])} – ${formatPriceShort(steps[i])}`, min: steps[i - 1], max: steps[i] });
  }
  ranges.push({ id: `r${steps.length}`, label: `Di atas ${formatPriceShort(steps[steps.length - 1])}`, min: steps[steps.length - 1], max: null });
  return ranges;
}

// ─── Listing ──────────────────────────────────────────────────────────────────

export interface Listing {
  /** Urutan di CMS (kunci React & urutan "Rekomendasi") */
  index: number;
  title: string;
  cluster: string;
  city: string;
  type: string;
  price: number;
  lt: string;
  lb: string;
  kt: string;
  km: string;
  status: string;
  image: string;
}

export function readListings(section: SectionContent): Listing[] {
  return sectionItems('listings', section).map((item, index) => ({
    index,
    title: field(item, 'title'),
    cluster: field(item, 'cluster'),
    city: field(item, 'city'),
    type: field(item, 'type'),
    price: parsePrice(field(item, 'price')),
    lt: field(item, 'lt'),
    lb: field(item, 'lb'),
    kt: field(item, 'kt'),
    km: field(item, 'km'),
    status: field(item, 'status'),
    image: field(item, 'image'),
  }));
}

/** Nilai unik (urutan kemunculan, beda huruf besar-kecil dianggap sama, ejaan pertama dipakai). */
const unique = (values: string[]): string[] => {
  const seen = new Map<string, string>();
  for (const value of values) if (value && !seen.has(value.toLowerCase())) seen.set(value.toLowerCase(), value);
  return Array.from(seen.values());
};

export const filterOptions = (listings: Listing[]): { cities: string[]; types: string[] } => ({
  cities: unique(listings.map((l) => l.city)),
  types: unique(listings.map((l) => l.type)),
});

export type SortKey = 'featured' | 'price-asc' | 'price-desc' | 'area-desc';

export const SORTS: { key: SortKey; label: string }[] = [
  { key: 'featured', label: 'Rekomendasi' },
  { key: 'price-asc', label: 'Harga terendah' },
  { key: 'price-desc', label: 'Harga tertinggi' },
  { key: 'area-desc', label: 'Bangunan terluas' },
];

export interface ListingFilters {
  /** '' = semua */
  city: string;
  type: string;
  /** id PriceRange, '' = semua */
  range: string;
  sort: SortKey;
}

export const DEFAULT_FILTERS: ListingFilters = { city: '', type: '', range: '', sort: 'featured' };

/** true bila ada saringan aktif (urutan saja tidak dihitung). */
export const isFiltered = (f: ListingFilters): boolean => !!(f.city || f.type || f.range);

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const areaOf = (l: Listing) => parseCount(l.lb) || parseCount(l.lt);

/**
 * Listing yang cocok dengan saringan (kota & tipe tanpa beda huruf besar-kecil; harga min ≤ harga < max, harga kosong tidak
 * masuk rentang mana pun), lalu diurutkan (stabil; harga kosong selalu paling akhir pada urutan harga).
 */
export function applyListingFilters(listings: Listing[], filters: ListingFilters, ranges: PriceRange[]): Listing[] {
  const range = ranges.find((r) => r.id === filters.range) ?? null;
  const out = listings.filter(
    (l) =>
      (!filters.city || same(l.city, filters.city)) &&
      (!filters.type || same(l.type, filters.type)) &&
      (!range || (l.price > 0 && l.price >= range.min && (range.max === null || l.price < range.max))),
  );
  const byIndex = (a: Listing, b: Listing) => a.index - b.index;
  const priced = (dir: 1 | -1) => (a: Listing, b: Listing) => {
    if (!a.price || !b.price) return (a.price ? 0 : 1) - (b.price ? 0 : 1) || byIndex(a, b);
    return (a.price - b.price) * dir || byIndex(a, b);
  };
  switch (filters.sort) {
    case 'price-asc':
      return out.sort(priced(1));
    case 'price-desc':
      return out.sort(priced(-1));
    case 'area-desc':
      return out.sort((a, b) => areaOf(b) - areaOf(a) || byIndex(a, b));
    default:
      return out.sort(byIndex);
  }
}

/** "9 rumah" (kalimat hasil saringan; Bahasa Indonesia tanpa bentuk jamak). */
export const resultCount = (n: number): string => (n === 0 ? 'Tidak ada rumah yang cocok' : `${n} rumah`);

/** "Klaster Kenari Asri · Bogor" / tipe + kota bila klaster kosong. */
export const listingPlace = (l: Listing): string => [l.cluster || l.type, l.city].filter(Boolean).join(' · ');

/** Pesan WhatsApp untuk satu rumah. */
export function listingMessage(l: Listing, company: string): string {
  const where = [l.cluster, l.city].filter(Boolean).join(', ');
  const price = formatPriceShort(l.price).split(NBSP).join(' ');
  return `Halo ${company || 'tim pemasaran'}, saya tertarik dengan ${l.title}${where ? ` (${where})` : ''}${price ? ` seharga ${price}` : ''}. Apakah masih tersedia?`;
}

// ─── Simulasi KPR ─────────────────────────────────────────────────────────────

export interface KprInput {
  /** Harga rumah (rupiah) */
  price: number;
  /** Uang muka (persen harga) */
  dpPercent: number;
  /** Tenor (tahun) */
  years: number;
  /** Bunga per tahun (persen), dianggap tetap selama tenor */
  ratePercent: number;
}

export interface KprResult extends KprInput {
  downPayment: number;
  principal: number;
  months: number;
  monthly: number;
  totalPaid: number;
  totalInterest: number;
}

const clamp = (n: number, min: number, max: number) => (Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min);

export const KPR_LIMITS = { price: 1e13, dp: [0, 90] as const, years: [1, 30] as const, rate: [0, 30] as const };

/**
 * Angsuran KPR anuitas (bunga tetap): pinjaman P = harga − uang muka, r = bunga/12/100, n = tahun × 12,
 * angsuran = P·r / (1 − (1 + r)^−n) (r = 0 → P/n). Nilai dibatasi (uang muka 0-90%, tenor 1-30 thn, bunga 0-30%) dan
 * dibulatkan ke rupiah. Perkiraan saja — bukan penawaran bank.
 */
export function kprSimulation(input: KprInput): KprResult {
  const price = Math.round(clamp(input.price, 0, KPR_LIMITS.price));
  const dpPercent = clamp(input.dpPercent, ...KPR_LIMITS.dp);
  const years = Math.round(clamp(input.years, ...KPR_LIMITS.years));
  const ratePercent = clamp(input.ratePercent, ...KPR_LIMITS.rate);
  const downPayment = Math.round((price * dpPercent) / 100);
  const principal = price - downPayment;
  const months = years * 12;
  const r = ratePercent / 100 / 12;
  const exact = principal <= 0 ? 0 : r === 0 ? principal / months : (principal * r) / (1 - (1 + r) ** -months);
  const monthly = Math.round(exact);
  const totalPaid = monthly * months;
  return { price, dpPercent, years, ratePercent, downPayment, principal, months, monthly, totalPaid, totalInterest: Math.max(0, totalPaid - principal) };
}

/** Pilihan tenor (tahun); tenor bawaan CMS yang lain ikut ditambahkan. */
export function tenorOptions(defaultYears: number): number[] {
  const base = [5, 10, 15, 20, 25];
  const own = Math.round(clamp(defaultYears, ...KPR_LIMITS.years));
  return base.includes(own) ? base : [...base, own].sort((a, b) => a - b);
}

/** Nilai awal simulasi dari CMS (kosong/tidak valid → harga 1 M, uang muka 20%, 15 tahun, 7,5%). */
export function kprDefaults(kpr: SectionContent): KprInput {
  const price = parsePrice(text(kpr, 'default_price'));
  return {
    price: price > 0 ? Math.min(price, KPR_LIMITS.price) : 1e9,
    dpPercent: clamp(parseDecimal(text(kpr, 'default_dp'), 20), ...KPR_LIMITS.dp),
    years: Math.round(clamp(parseDecimal(text(kpr, 'default_tenor'), 15), ...KPR_LIMITS.years)),
    ratePercent: clamp(parseDecimal(text(kpr, 'default_rate'), 7.5), ...KPR_LIMITS.rate),
  };
}

/** Pesan WhatsApp "tanya agen soal KPR" berisi angka simulasi. */
export function kprMessage(result: KprResult, company: string): string {
  return [
    `Halo ${company || 'tim pemasaran'}, saya ingin bertanya tentang KPR.`,
    '',
    `Harga rumah: ${formatRupiah(result.price)}`,
    `Uang muka: ${formatDecimal(result.dpPercent, 1)}% (${formatRupiah(result.downPayment)})`,
    `Tenor: ${result.years} tahun`,
    `Bunga simulasi: ${formatDecimal(result.ratePercent, 2)}% per tahun`,
    `Perkiraan angsuran: ${formatRupiah(result.monthly)} per bulan`,
  ].join('\n');
}

// ─── Formulir jadwal kunjungan ────────────────────────────────────────────────

export interface VisitForm {
  name: string;
  listing: string;
  /** YYYY-MM-DD (input type=date) */
  date: string;
  time: string;
  agent: string;
  note: string;
}

export type VisitErrors = Partial<Record<keyof VisitForm, string>>;

export const NO_LISTING = 'Belum menentukan';
export const ANY_AGENT = 'Siapa saja';
export const VISIT_TIMES = ['Pagi (09.00–12.00)', 'Siang (12.00–15.00)', 'Sore (15.00–17.00)'] as const;

export const VISIT_LIMITS: Record<keyof VisitForm, number> = { name: 60, listing: 80, date: 10, time: 24, agent: 60, note: 300 };

export const EMPTY_VISIT: VisitForm = { name: '', listing: NO_LISTING, date: '', time: VISIT_TIMES[0], agent: ANY_AGENT, note: '' };

/** Teks bersih satu baris: karakter kontrol dibuang, spasi dirapikan, dipotong ke `max`. */
export function cleanText(raw: string, max: number): string {
  const visible = Array.from(raw || '', (ch) => {
    const code = ch.charCodeAt(0);
    return code < 32 || code === 127 ? ' ' : ch;
  }).join('');
  return Array.from(visible.replace(/\s+/g, ' ').trim()).slice(0, max).join('').trim();
}

/** Tanggal lokal hari ini "YYYY-MM-DD". */
export const todayIso = (now: Date = new Date()): string =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/** "2026-11-14" → Date UTC tengah malam, atau null bila bukan tanggal yang ada. */
const parseIsoDate = (iso: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((iso || '').trim());
  if (!m) return null;
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return date.getUTCMonth() === Number(m[2]) - 1 && date.getUTCDate() === Number(m[3]) ? date : null;
};

/** "2026-11-14" → "Sabtu, 14 November 2026"; tidak valid → "". */
export function formatVisitDate(iso: string): string {
  const date = parseIsoDate(iso);
  return date ? `${DAYS[date.getUTCDay()]}, ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}` : '';
}

/** Pesan galat per isian (kosong = valid). `today` = "YYYY-MM-DD" (tanggal kunjungan tidak boleh sebelum hari ini). */
export function validateVisit(form: VisitForm, listings: readonly string[], agents: readonly string[], today: string): VisitErrors {
  const errors: VisitErrors = {};
  if (cleanText(form.name, VISIT_LIMITS.name).length < 2) errors.name = 'Tulis nama Anda.';
  if (form.listing !== NO_LISTING && !listings.includes(form.listing)) errors.listing = 'Pilih rumah dari daftar.';
  if (!form.date) errors.date = 'Pilih tanggal kunjungan.';
  else if (!parseIsoDate(form.date)) errors.date = 'Tanggal tidak valid.';
  else if (form.date < today) errors.date = 'Pilih tanggal hari ini atau sesudahnya.';
  if (!(VISIT_TIMES as readonly string[]).includes(form.time)) errors.time = 'Pilih waktu kunjungan.';
  if (form.agent !== ANY_AGENT && !agents.includes(form.agent)) errors.agent = 'Pilih agen dari daftar.';
  return errors;
}

/** Urutan isian yang divalidasi (fokus ke galat pertama). */
export const VISIT_FIELDS: (keyof VisitForm)[] = ['name', 'listing', 'date', 'time', 'agent'];

/** Pesan WhatsApp jadwal kunjungan: salam, baris kosong, lalu baris per isian (catatan kosong tidak ikut). */
export function visitMessage(form: VisitForm, company: string): string {
  const name = cleanText(company, 80);
  const rows = [
    `Nama: ${cleanText(form.name, VISIT_LIMITS.name)}`,
    `Rumah: ${form.listing === NO_LISTING ? 'Belum menentukan, mohon saran' : cleanText(form.listing, VISIT_LIMITS.listing)}`,
    `Tanggal: ${formatVisitDate(form.date)}`,
    `Waktu: ${form.time}`,
    `Agen: ${form.agent === ANY_AGENT ? 'Siapa saja' : cleanText(form.agent, VISIT_LIMITS.agent)}`,
    cleanText(form.note, VISIT_LIMITS.note) && `Catatan: ${cleanText(form.note, VISIT_LIMITS.note)}`,
  ].filter(Boolean);
  return `${name ? `Halo ${name}, saya` : 'Halo, saya'} ingin menjadwalkan kunjungan.\n\n${rows.join('\n')}`;
}

/** mailto: dengan subjek dan isi pesan (dipotong 1800 huruf); email tidak valid → "". */
export function messageMailHref(email: string, subject: string, body: string): string {
  const mail = mailHref(email);
  if (!mail) return '';
  return `${mail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(Array.from(body).slice(0, 1800).join(''))}`;
}

// ─── Agen ─────────────────────────────────────────────────────────────────────

export interface Agent {
  name: string;
  firstName: string;
  area: string;
  /** Nomor WhatsApp agen sendiri, kalau kosong nomor Kontak */
  whatsapp: string;
}

export function readAgents(section: SectionContent, fallbackWhatsapp: string): Agent[] {
  return list(section, 'items', 4)
    .filter((i) => field(i, 'name'))
    .map((i) => {
      const name = field(i, 'name');
      const own = field(i, 'whatsapp');
      return { name, firstName: name.split(/\s+/)[0], area: field(i, 'area'), whatsapp: whatsappHref(own) ? own : fallbackWhatsapp };
    });
}

/** "Halo Nadia, saya ingin bertanya tentang rumah di Bogor & Depok." */
export const agentMessage = (agent: Agent): string =>
  `Halo ${agent.firstName}, saya ingin bertanya tentang rumah${agent.area ? ` di ${agent.area}` : ''}.`;

// ─── Lain-lain ────────────────────────────────────────────────────────────────

/** Nomor HP Indonesia yang ditulis rapat ("081234567890") → "0812-3456-7890" untuk dibaca; format lain apa adanya. */
export const displayPhone = (raw: string): string => {
  const value = (raw || '').trim();
  return /^08\d{8,11}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8)}` : value;
};

/** Nama besar di footer: isian sendiri, selain itu nama perusahaan tanpa "PT"/"CV" di depan. */
export const wordmarkOf = (custom: string, company: string): string => custom || company.replace(/^(pt|cv|ud)\.?\s+/i, '').trim() || company;

export const pad2 = (n: number): string => String(n).padStart(2, '0');

export interface SocialLink {
  key: string;
  label: string;
  href: string;
}

export const socialLinks = (footer: SectionContent): SocialLink[] =>
  SOCIAL_FIELDS.map(({ key, label }) => ({ key, label, href: safeUrl(text(footer, key)) ?? '' })).filter((s) => s.href);

// ─── Model ────────────────────────────────────────────────────────────────────

export function readHomeNest(content: SiteContent) {
  const section = (key: string) => getSection(content, key);
  const brand = section('brand');
  const hero = section('hero');
  const listings = section('listings');
  const agents = section('agents');
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
  /** Tujuan "jadwalkan kunjungan": formulir di Agen, kalau tidak Kontak, kalau tidak WhatsApp. */
  const visitAction: LinkAction | null = sectionAction('agents') ?? sectionAction('contact') ?? waAction;
  /**
   * Isi field URL: "#rumah", "#kpr", "#kontak" dsb. hanya bila section itu tampil (anchor Indonesia diterjemahkan);
   * anchor tak dikenal / section tersembunyi / kosong → `fallback`.
   */
  const linkOr = (raw: string, fallback: LinkAction | null): LinkAction | null => {
    const action = resolveAction(raw, fallback);
    if (action?.kind !== 'section') return action;
    const target = sectionTarget(action.target);
    if (target === 'hero') return { kind: 'section', target };
    return target && shown(target) ? { kind: 'section', target } : fallback;
  };
  /** WhatsApp dengan pesan bebas ke `number` (bawaan: nomor Kontak); tanpa nomor → null. */
  const waWith = (message: string, number = whatsapp): LinkAction | null => {
    const link = whatsappHref(number, message);
    return link ? { kind: 'external', href: link } : null;
  };

  const listingList = shown('listings') ? readListings(listings) : [];

  return {
    brand,
    hero,
    listings,
    tour: section('tour'),
    kpr: section('kpr'),
    developer: section('developer'),
    amenities: section('amenities'),
    testimonials: section('testimonials'),
    agents,
    faq: section('faq'),
    contact,
    footer,
    companyName,
    tagline: text(brand, 'tagline'),
    logo: text(brand, 'logo'),
    colors: homenestVars(text(brand, 'accent_color')),
    whatsapp,
    waAction,
    visitAction,
    shown,
    items,
    sectionAction,
    linkOr,
    waWith,
    /** Rumah yang dirender (urutan CMS) */
    homes: listingList,
    ranges: priceRanges(text(listings, 'price_steps')),
    options: filterOptions(listingList),
    agentList: readAgents(agents, whatsapp),
    kprInput: kprDefaults(section('kpr')),
    headerLabel: text(hero, 'header_label'),
    headerAction: linkOr(text(hero, 'header_url'), visitAction),
    nav: navItems(content),
    socials: socialLinks(footer),
    map: mapsInfo(text(contact, 'maps_url'), text(contact, 'maps_query') || text(contact, 'address')),
    year: new Date().getFullYear(),
  };
}

export type HomeNestModel = ReturnType<typeof readHomeNest>;
