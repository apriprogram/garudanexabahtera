// Turunan konten Lajur (fungsi murni, tanpa React): warna tema (teks aksen di putih/abu, aksen terang di pita tinta),
// section yang tampil, menu & nomor label, tujuan tautan "#…", armada (kursi, susunan, unit, harga, fasilitas), denah
// kursi, kombinasi armada (recommendConvoy), formulir minta penawaran → pesan WhatsApp, pesan per rute, dan jam film.
// Semua tahan konten mentah (null, angka, list rusak). Formulir & kalkulator hanya MENGHITUNG/MENYUSUN pesan: tidak ada
// data yang dikirim ke server atau disimpan di website; harga contoh, final dan ketersediaan armada dari admin.
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
  mapsInfo,
  parseHex,
  resolveAction,
  safeUrl,
  sectionFromAnchor,
  text,
  whatsappHref,
  type LinkAction,
} from '../shared/utils';
import { LAJUR_ACCENT } from './defaultContent';

// ─── Warna ────────────────────────────────────────────────────────────────────

type Rgb = [number, number, number];
const WHITE: Rgb = [255, 255, 255];
/** Pita abu hangat #F3F2EE (latar teks aksen paling gelap yang dipakai) */
export const GREY: Rgb = [243, 242, 238];
/** Tinta #14161A (pita film & footer) */
export const INK: Rgb = [20, 22, 26];
/** Hitam hangat untuk menggelapkan aksen (amber → cokelat tua, bukan hijau zaitun) */
const WARM_BLACK: Rgb = [20, 16, 10];
const toHex = (rgb: Rgb) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
/** Campuran dibulatkan: kontras dihitung dari warna yang benar-benar ditulis sebagai hex. */
const mix = (a: Rgb, b: Rgb, amountOfA: number): Rgb => a.map((c, i) => Math.round(c * amountOfA + b[i] * (1 - amountOfA))) as Rgb;

const accentOf = (raw: string): Rgb => parseHex(raw) ?? (parseHex(LAJUR_ACCENT) as Rgb);

/** Latar sorotan judul hero paling terang yang mungkin: tinta 80% di atas piksel foto putih (rgb 67 69 72). */
export const HERO_SCRIM: Rgb = mix(INK, WHITE, 0.8);

/**
 * Variabel warna lokal Lajur (di samping --tpl-accent* milik Shell), semuanya dari SATU warna tema:
 * --lj-ink: teks aksen di putih & abu #F3F2EE (≥ 4,5:1 di abu, jadi juga di putih);
 * --lj-bright: aksen di pita tinta (≥ 4,5:1 di #14161A; aksen gelap dicerahkan);
 * --lj-hero: sorotan H1 hero di atas lapisan tinta foto (≥ 4,5:1 di HERO_SCRIM; dicerahkan lebih jauh bila perlu,
 * batasnya putih 9,7:1 — amber bawaan tidak berubah).
 */
export function lajurVars(accentRaw: string): CSSProperties {
  const accent = accentOf(accentRaw);
  let ink = accent;
  for (let i = 0; i < 30 && contrast(ink, GREY) < 4.5; i += 1) ink = mix(ink, WARM_BLACK, 0.88);
  let bright = accent;
  for (let i = 0; i < 30 && contrast(bright, INK) < 4.5; i += 1) bright = mix(bright, WHITE, 0.85);
  let hero = bright;
  for (let i = 0; i < 40 && contrast(hero, HERO_SCRIM) < 4.5; i += 1) hero = mix(hero, WHITE, 0.85);
  return { '--lj-ink': toHex(ink), '--lj-bright': toHex(bright), '--lj-hero': toHex(hero) } as CSSProperties;
}

// ─── Angka & teks ─────────────────────────────────────────────────────────────

/** "3.200.000" (pemisah ribuan titik). */
export const groupThousands = (n: number): string => {
  const value = Math.round(Math.abs(n));
  return `${n < 0 ? '-' : ''}${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};

/** "Rp3.200.000" */
export const formatRupiah = (n: number): string => `Rp${groupThousands(n)}`;

/** Spasi tak terputus (harga & satuan tidak terbelah di akhir baris). */
export const NBSP = String.fromCharCode(160);

/** Satuan angka di harga (urut dari besar): miliar, juta, ribu. */
const UNIT_WORDS: [RegExp, number][] = [
  [/^(m|miliar|milyar)$/, 1e9],
  [/^(jt|juta)$/, 1e6],
  [/^(rb|ribu|k)$/, 1e3],
];
/** Angka + satuan: "3,2 jt", "1.250 jt", "750rb", "3 juta" (satuan harus kata utuh: "50 kursi" bukan "k"). */
const AMOUNT_WITH_UNIT = /(\d[\d.,]*)\s*(miliar|milyar|juta|ribu|jt|rb|m|k)(?![a-z])\.?/g;

/** "1.250" → 1250, "3,2" → 3,2, "3.2" → 3,2 (titik + tepat 3 digit = pemisah ribuan, koma = desimal). */
const decimalOf = (raw: string): number => Number.parseFloat(raw.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));

/**
 * Harga dari CMS → rupiah. Dibuang dulu: kata di depan ("mulai", "harga", "dari", "Rp", "IDR"), satuan di belakang
 * ("/ hari", "per bus", "rupiah"), dan ekor sen ",00" / ",-". Lalu:
 * - ada kata satuan → hanya dari satuan, TIDAK menggabung digit: "3,2 jt" = 3.200.000, "3 juta 200 ribu" = 3.200.000
 *   (satuan mengecil dijumlahkan), rentang "3 jt – 4 jt" = harga pertama;
 * - tanpa satuan → semua digit (maks. 12): "Rp3.200.000" = 3.200.000.
 * Tidak terbaca → 0 ("Harga menyusul").
 */
export function parsePrice(raw: string | number | null | undefined): number {
  let value = String(raw ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  if (!value) return 0;
  value = value.replace(/\s*(?:\/|\bper\b).*$/, '');
  for (let guard = 0; guard < 4; guard += 1) {
    const next = value.replace(/^(?:mulai|harga|dari|hanya|rp|idr)\b\.?:?\s*|^rp\.?\s*/, '');
    if (next === value) break;
    value = next;
  }
  value = value
    .replace(/\s*\b(?:rupiah|idr)\b\.?\s*$/, '')
    .replace(/[.,](?:00|-)\s*$/, '')
    .trim();
  const parts = Array.from(value.matchAll(AMOUNT_WITH_UNIT));
  if (parts.length > 0) {
    let total = 0;
    let lastUnit = Number.POSITIVE_INFINITY;
    for (const [, number, word] of parts) {
      const unit = UNIT_WORDS.find(([pattern]) => pattern.test(word))?.[1] ?? 0;
      const n = decimalOf(number);
      // Satuan harus mengecil ("3 juta 200 ribu"); satuan sama/membesar = rentang → berhenti di harga pertama
      if (!(unit > 0 && unit < lastUnit && Number.isFinite(n) && n > 0)) break;
      total += n * unit;
      lastUnit = unit;
    }
    return Math.round(Math.min(total, 999_999_999_999));
  }
  // Ekor sen setelah kelompok ribuan ("3.200.000,50" / "3,200,000.50") dibuang sebelum digit digabung
  const digits = value
    .replace(/^(\d{1,3}(?:\.\d{3})+),\d{1,2}$/, '$1')
    .replace(/^(\d{1,3}(?:,\d{3})+)\.\d{1,2}$/, '$1')
    .replace(/\D/g, '')
    .slice(0, 12);
  return digits ? Number(digits) : 0;
}

/** Bilangan bulat dari CMS/isian ("50", "50 kursi") dibatasi `min`–`max`; kosong/rusak → `fallback`. */
export function parseWhole(raw: string | number | null | undefined, min: number, max: number, fallback: number): number {
  const match = /\d+/.exec(String(raw ?? ''));
  if (!match) return fallback;
  const n = Number(match[0].slice(0, 6));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

export const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Teks bersih satu baris: karakter kontrol dibuang, spasi dirapikan, dipotong ke `max`. */
export function cleanText(raw: string, max: number): string {
  const visible = Array.from(raw || '', (ch) => {
    const code = ch.charCodeAt(0);
    return code < 32 || code === 127 ? ' ' : ch;
  }).join('');
  return Array.from(visible.replace(/\s+/g, ' ').trim()).slice(0, max).join('').trim();
}

/** Monogram testimoni: dua kata → dua huruf awal ("Rina Kartika" → "RK"), satu kata → satu huruf ("Rina" → "R"). */
export function monogram(name: string): string {
  const words = (name || '')
    .replace(/^(bu|bapak|pak|ibu|mas|mbak)\.?\s+/i, '')
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean);
  if (words.length === 0) return '?';
  return (words.length >= 2 ? words[0][0] + words[1][0] : words[0][0]).toUpperCase();
}

/** Nomor HP Indonesia yang ditulis rapat ("081234567890") → "0812-3456-7890"; format lain apa adanya. */
export const displayPhone = (raw: string): string => {
  const value = (raw || '').trim();
  return /^08\d{8,11}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8)}` : value;
};

// ─── Tanggal ──────────────────────────────────────────────────────────────────

/** Tanggal lokal hari ini "YYYY-MM-DD". */
export const todayIso = (now: Date = new Date()): string =>
  `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;

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
export function formatLongDate(iso: string): string {
  const date = parseIsoDate(iso);
  return date ? `${DAYS[date.getUTCDay()]}, ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}` : '';
}

// ─── Section di halaman ───────────────────────────────────────────────────────

/** Kunci section yang punya tempat di halaman (urutan halaman; = section skema tanpa `brand`). */
export const PAGE_SECTIONS = ['hero', 'fleet', 'convoy', 'film', 'routes', 'included', 'steps', 'testimonials', 'gallery', 'faq', 'contact', 'footer'] as const;
const KNOWN_SECTIONS = new Set<string>(PAGE_SECTIONS);

/** [kunci list, maks. item (= skema), syarat item dirender] per section. Satu sumber untuk komponen dan menu. */
const ITEMS: Record<string, [listKey: string, max: number, keep: (item: ListItem) => boolean]> = {
  fleet: ['items', 6, (i) => !!field(i, 'name') && parseWhole(field(i, 'seats'), 0, 99, 0) > 0],
  film: ['chapters', 5, (i) => !!field(i, 'title')],
  routes: ['items', 8, (i) => !!field(i, 'name')],
  steps: ['items', 5, (i) => !!field(i, 'title')],
  testimonials: ['items', 6, (i) => !!field(i, 'quote')],
  gallery: ['items', 6, (i) => hasImage(field(i, 'image'))],
  faq: ['items', 8, (i) => !!field(i, 'question')],
};

/** Item yang dirender untuk section `key` (lihat ITEMS); section tanpa daftar → []. */
export function sectionItems(key: string, section: SectionContent): ListItem[] {
  const rule = ITEMS[key];
  return rule ? list(section, rule[0], rule[1]).filter(rule[2]) : [];
}

/** Daftar termasuk / belum termasuk (section `included`). */
export const includedItems = (section: SectionContent, key: 'included' | 'excluded'): ListItem[] =>
  list(section, key, key === 'included' ? 10 : 8).filter((i) => !!field(i, 'text'));

/**
 * Section tampil dan berisi? Kunci tak dikenal → false. Kalkulator rombongan memakai data bus di section Armada (juga
 * bila Armada disembunyikan), jadi tampil selama ada bus berkursi.
 */
export function sectionShown(content: SiteContent, key: string): boolean {
  if (!KNOWN_SECTIONS.has(key)) return false;
  const s = getSection(content, key);
  if (!isEnabled(s)) return false;
  if (key in ITEMS) return sectionItems(key, s).length > 0;
  if (key === 'convoy') return sectionItems('fleet', getSection(content, 'fleet')).length > 0;
  if (key === 'included') return includedItems(s, 'included').length + includedItems(s, 'excluded').length > 0;
  // hero, contact, footer
  return true;
}

// ─── Menu & nomor label ───────────────────────────────────────────────────────

export interface LajurNavItem {
  key: string;
  label: string;
}

/** Menu singkat: kata benda yang sama dengan label section (maks. 6 + tombol). */
const NAV: LajurNavItem[] = [
  { key: 'fleet', label: 'Armada' },
  { key: 'convoy', label: 'Rombongan' },
  { key: 'routes', label: 'Tujuan' },
  { key: 'included', label: 'Harga' },
  { key: 'faq', label: 'FAQ' },
  { key: 'contact', label: 'Kontak' },
];

/** Menu hanya untuk section yang benar-benar tampil (tanpa tautan mati). */
export function navItems(content: SiteContent): LajurNavItem[] {
  return NAV.filter(({ key }) => sectionShown(content, key));
}

/** Section bernomor "01 · ARMADA" (urutan halaman, tanpa hero & footer). */
const NUMBERED = ['fleet', 'convoy', 'film', 'routes', 'included', 'steps', 'testimonials', 'gallery', 'faq', 'contact'];

/** Nomor label per section yang tampil: { fleet: '01', convoy: '02', … }. */
export function sectionNumbers(content: SiteContent): Record<string, string> {
  const shown = NUMBERED.filter((key) => sectionShown(content, key));
  return Object.fromEntries(shown.map((key, i) => [key, pad2(i + 1)]));
}

// ─── Tujuan tautan "#…" ───────────────────────────────────────────────────────

/** Anchor berbahasa Indonesia yang wajar diketik pembeli → kunci section. */
const ANCHOR_ALIASES: Record<string, string> = {
  armada: 'fleet',
  bus: 'fleet',
  rombongan: 'convoy',
  kalkulator: 'convoy',
  'hitung-bus': 'convoy',
  perjalanan: 'film',
  tujuan: 'routes',
  rute: 'routes',
  destinasi: 'routes',
  harga: 'included',
  termasuk: 'included',
  biaya: 'included',
  'cara-sewa': 'steps',
  'cara-pesan': 'steps',
  langkah: 'steps',
  'tanya-jawab': 'faq',
  garasi: 'contact',
  alamat: 'contact',
  lokasi: 'contact',
  penawaran: 'hero',
};

/** Target tautan section ("armada", "fleet", "kontak") → kunci section di halaman, atau null bila tidak dikenal. */
export function sectionTarget(target: string): string | null {
  const clean = sectionFromAnchor(target);
  const key = ANCHOR_ALIASES[clean] ?? clean;
  return KNOWN_SECTIONS.has(key) ? key : null;
}

// ─── Armada ───────────────────────────────────────────────────────────────────

export type BusSize = 'big' | 'medium' | 'micro';

export interface FleetUnit {
  /** Urutan di CMS (kunci React & urutan pilihan) */
  index: number;
  name: string;
  seats: number;
  /** Kursi kiri-kanan lorong per baris, mis. [2, 2] */
  layout: [number, number];
  /** Jumlah unit; 0 = tidak dibatasi */
  units: number;
  /** Rupiah; 0 = harga menyusul */
  price: number;
  priceUnit: string;
  facilities: string[];
  image: string;
  size: BusSize;
}

/** Gambar bus dipilih dari jumlah kursi: ≥ 40 big bus, ≥ 24 medium bus, selain itu microbus. */
export const busSize = (seats: number): BusSize => (seats >= 40 ? 'big' : seats >= 24 ? 'medium' : 'micro');

/** "2-2", "2 - 1", "2x2" → [2, 2]; kosong/rusak → 2-1 untuk ≤ 20 kursi, selain itu 2-2. */
export function parseLayout(raw: string, seats: number): [number, number] {
  const m = /^\s*([1-3])\s*[-–x+/]\s*([1-3])\s*$/i.exec(raw || '');
  if (m) return [Number(m[1]), Number(m[2])];
  return seats <= 20 ? [2, 1] : [2, 2];
}

/** "AC, Kursi reclining; Toilet" → ['AC', 'Kursi reclining', 'Toilet'] (maks. 8, tanpa duplikat). */
export function parseFacilities(raw: string): string[] {
  const seen = new Map<string, string>();
  for (const part of (raw || '').split(/[,;\n]+/)) {
    const value = cleanText(part, 32);
    if (value && !seen.has(value.toLowerCase())) seen.set(value.toLowerCase(), value);
  }
  return Array.from(seen.values()).slice(0, 8);
}

export function readFleet(section: SectionContent): FleetUnit[] {
  return sectionItems('fleet', section).map((item, index) => {
    const seats = parseWhole(field(item, 'seats'), 1, 99, 1);
    return {
      index,
      name: field(item, 'name'),
      seats,
      layout: parseLayout(field(item, 'layout'), seats),
      units: parseWhole(field(item, 'units'), 0, 99, 0),
      price: parsePrice(field(item, 'price')),
      priceUnit: field(item, 'price_unit'),
      facilities: parseFacilities(field(item, 'facilities')),
      image: field(item, 'image'),
      size: busSize(seats),
    };
  });
}

/** "Big bus 50 kursi" */
export const unitLabel = (unit: FleetUnit): string => `${unit.name} ${unit.seats} kursi`;

// ─── Denah kursi ──────────────────────────────────────────────────────────────

export interface SeatPlan {
  /** Baris biasa (kiri + kanan lorong) */
  rows: number;
  left: number;
  right: number;
  /** Kursi di baris paling belakang (bangku penuh selebar bus, menutup lorong) */
  back: number;
}

/**
 * Denah kursi dari jumlah kursi & susunan: baris biasa sebanyak mungkin, sisa 1–(kiri+kanan+2) kursi di bangku
 * belakang. 50 / 2-2 → 11 baris + 6 di belakang; 33 / 2-2 → 7 + 5; 15 / 2-1 → 4 + 3. Maks. 99 kursi.
 */
export function seatPlan(seats: number, layout: [number, number]): SeatPlan {
  const [left, right] = layout;
  const per = left + right;
  const total = Math.max(0, Math.min(99, Math.round(Number.isFinite(seats) ? seats : 0)));
  if (total <= per + 2) return { rows: 0, left, right, back: total };
  const rows = Math.ceil((total - (per + 2)) / per);
  return { rows, left, right, back: total - rows * per };
}

// ─── Kombinasi armada ─────────────────────────────────────────────────────────

export interface ConvoyPick {
  unit: FleetUnit;
  count: number;
}

export interface Convoy {
  /** Jenis bus terpakai (urutan CMS), masing-masing ≥ 1 unit */
  picks: ConvoyPick[];
  buses: number;
  seats: number;
  /** Kursi kosong */
  spare: number;
  /** Jumlah harga per hari (rupiah); 0 bila ada bus tanpa harga */
  price: number;
}

/** Batas jumlah bus dalam satu rekomendasi otomatis. */
export const MAX_BUSES = 8;
export const PEOPLE_LIMITS = [1, 500] as const;

/**
 * Kombinasi armada untuk `people` peserta: JUMLAH BUS paling sedikit, lalu kursi kosong paling sedikit, lalu kombinasi
 * yang semua busnya berharga (harga 0 = "menyusul", bukan paling murah), lalu harga paling rendah, lalu lebih banyak bus
 * yang urutannya di atas di CMS (deterministik). Maks. `maxBuses` bus; `units` > 0 membatasi jumlah satu jenis.
 * `only` = indeks jenis bus pilihan pengunjung (hanya jenis itu). Tidak muat → null.
 * Contoh armada demo (50, 33, 15 kursi): 120 → 2 Big + 1 Medium (133, sisa 13); 112 → 2 Big + 1 Microbus (sisa 3).
 */
export function recommendConvoy(fleet: FleetUnit[], people: number, only: number | null = null, maxBuses = MAX_BUSES): Convoy | null {
  const types = fleet.filter((u) => u.seats > 0 && (only === null || u.index === only));
  const need = Math.max(1, Math.round(Number.isFinite(people) ? people : 1));
  if (types.length === 0) return null;
  const counts = new Array<number>(types.length).fill(0);
  type Best = { counts: number[]; buses: number; spare: number; priced: boolean; price: number };
  let best: Best | null = null;
  const better = (buses: number, spare: number, priced: boolean, price: number, candidate: number[]) => {
    if (!best) return true;
    if (buses !== best.buses) return buses < best.buses;
    if (spare !== best.spare) return spare < best.spare;
    if (priced !== best.priced) return priced;
    if (price !== best.price) return price < best.price;
    for (let i = 0; i < candidate.length; i += 1) if (candidate[i] !== best.counts[i]) return candidate[i] > best.counts[i];
    return false;
  };
  const walk = (i: number, buses: number, seats: number, price: number, priced: boolean) => {
    if (seats >= need) {
      const spare = seats - need;
      if (better(buses, spare, priced, price, counts)) best = { counts: [...counts], buses, spare, priced, price };
      return;
    }
    if (i >= types.length || buses >= maxBuses) return;
    const unit = types[i];
    const cap = Math.min(maxBuses - buses, unit.units > 0 ? unit.units : maxBuses);
    for (let n = cap; n >= 0; n -= 1) {
      counts[i] = n;
      walk(i + 1, buses + n, seats + n * unit.seats, price + n * unit.price, priced && (n === 0 || unit.price > 0));
    }
    counts[i] = 0;
  };
  walk(0, 0, 0, 0, true);
  const found = best as Best | null;
  if (!found) return null;
  const picks = types.map((unit, i) => ({ unit, count: found.counts[i] })).filter((p) => p.count > 0);
  return {
    picks,
    buses: found.buses,
    seats: picks.reduce((sum, p) => sum + p.count * p.unit.seats, 0),
    spare: found.spare,
    price: found.priced ? found.price : 0,
  };
}

/** "2 Big bus + 1 Medium bus" (atau dengan kursi: "2 Big bus 50 kursi + 1 Medium bus 33 kursi"). */
export const convoyLabel = (convoy: Convoy, withSeats = false): string =>
  convoy.picks.map((p) => `${p.count} ${withSeats ? unitLabel(p.unit) : p.unit.name}`).join(' + ');

/**
 * Satuan harga perkiraan kombinasi: satuan yang SAMA di semua bus terpilih ("/ hari"; boleh kosong ""). Satuan
 * berbeda (mis. "/ hari" + "/ trip") → null: jumlahnya tidak bermakna, perkiraan disembunyikan.
 */
export function convoyPriceUnit(convoy: Convoy): string | null {
  const units = new Set(convoy.picks.map((p) => cleanText(p.unit.priceUnit, 20)));
  return units.size === 1 ? [...units][0] : null;
}

/** Satuan untuk kalimat pesan: "/ hari" → "per hari", "per trip" tetap; kosong → "". */
export const unitWords = (unit: string): string => cleanText(unit, 20).replace(/^\/\s*/, 'per ');

/** "133 kursi · sisa 13 kursi" / "100 kursi · semua kursi terisi" */
export const convoySeats = (convoy: Convoy): string =>
  `${convoy.seats} kursi · ${convoy.spare > 0 ? `sisa ${convoy.spare} kursi` : 'semua kursi terisi'}`;

/** Urutan ikon bus untuk jalan konvoi: [{ key, unit }] sepanjang jumlah bus (urutan CMS). */
export const convoySlots = (convoy: Convoy | null): { key: string; unit: FleetUnit }[] =>
  convoy ? convoy.picks.flatMap((p) => Array.from({ length: p.count }, (_, i) => ({ key: `${p.unit.index}-${i}`, unit: p.unit }))) : [];

/** Pesan WhatsApp dari kalkulator rombongan (perkiraan harga hanya bila semua bus berharga & satuannya sama). */
export function convoyMessage(people: number, convoy: Convoy | null, company: string): string {
  const name = cleanText(company, 80);
  const unit = convoy ? convoyPriceUnit(convoy) : null;
  const rows = [
    convoy ? `Rekomendasi armada: ${convoyLabel(convoy, true)} (${convoy.seats} kursi)` : 'Rekomendasi armada: mohon disusun admin',
    convoy && convoy.price > 0 && unit !== null ? `Perkiraan harga: mulai ${formatRupiah(convoy.price)}${unit ? ` ${unitWords(unit)}` : ''}` : '',
  ].filter(Boolean);
  return [
    `Halo ${name || 'admin'}, saya ingin minta penawaran sewa bus untuk ${people} peserta.`,
    '',
    ...rows,
    '',
    'Mohon info harga dan ketersediaan armada. Terima kasih.',
  ].join('\n');
}

// ─── Formulir minta penawaran (hero) ─────────────────────────────────────────

export interface QuoteForm {
  /** Teks isian angka (boleh kosong saat diketik) */
  people: string;
  /** YYYY-MM-DD (input type=date) */
  date: string;
  destination: string;
  /** "1"–"7" */
  days: string;
}

export type QuoteErrors = Partial<Record<keyof QuoteForm, string>>;

export const QUOTE_DAYS = [1, 2, 3, 4, 5, 6, 7] as const;
export const DESTINATION_MAX = 60;
export const EMPTY_QUOTE: QuoteForm = { people: '45', date: '', destination: '', days: '1' };
/** Urutan isian yang divalidasi (fokus ke galat pertama). */
export const QUOTE_FIELDS: (keyof QuoteForm)[] = ['people', 'date', 'destination', 'days'];

/** Jumlah peserta dari isian; bukan angka bulat 1–500 → null. */
export function quotePeople(raw: string): number | null {
  const value = (raw || '').trim();
  if (!/^\d{1,4}$/.test(value)) return null;
  const n = Number(value);
  return n >= PEOPLE_LIMITS[0] && n <= PEOPLE_LIMITS[1] ? n : null;
}

/**
 * Angka dasar tombol −/+ peserta: digit isian dibatasi 1–500 ("600" → 500, jadi − tetap bisa dipakai); kosong/0 → 0
 * (tombol + mengisi 1, tombol − mati).
 */
export function peopleStepBase(raw: string): number {
  const n = Number((raw || '').replace(/\D/g, '').slice(0, 4)) || 0;
  return n === 0 ? 0 : Math.min(PEOPLE_LIMITS[1], Math.max(PEOPLE_LIMITS[0], n));
}

/** Galat per isian (kosong = valid). `today` = "YYYY-MM-DD": tanggal berangkat tidak boleh sebelum hari ini. */
export function validateQuote(form: QuoteForm, today: string): QuoteErrors {
  const errors: QuoteErrors = {};
  if (quotePeople(form.people) === null) errors.people = 'Isi jumlah peserta 1–500.';
  if (!form.date) errors.date = 'Pilih tanggal berangkat.';
  else if (!parseIsoDate(form.date)) errors.date = 'Tanggal tidak valid.';
  else if (form.date < today) errors.date = 'Pilih tanggal hari ini atau sesudahnya.';
  if (cleanText(form.destination, DESTINATION_MAX).length < 2) errors.destination = 'Tulis tujuan perjalanan.';
  if (!(QUOTE_DAYS as readonly number[]).includes(Number(form.days))) errors.days = 'Pilih lama sewa.';
  return errors;
}

/**
 * Pesan WhatsApp minta penawaran: salam, baris kosong, jumlah peserta, (jenis bus pilihan), rekomendasi armada,
 * tanggal panjang, lama sewa, tujuan, baris kosong, penutup.
 */
export function quoteMessage(form: QuoteForm, convoy: Convoy | null, company: string, preferred: FleetUnit | null = null): string {
  const name = cleanText(company, 80);
  const people = quotePeople(form.people) ?? 0;
  const rows = [
    `Jumlah peserta: ${people} orang`,
    preferred ? `Jenis bus: ${unitLabel(preferred)}` : '',
    `Rekomendasi armada: ${convoy ? convoyLabel(convoy, true) : 'mohon disusun admin'}`,
    `Tanggal berangkat: ${formatLongDate(form.date)}`,
    `Lama sewa: ${Number(form.days) || 1} hari`,
    `Tujuan: ${cleanText(form.destination, DESTINATION_MAX)}`,
  ].filter(Boolean);
  return [`Halo ${name || 'admin'}, saya ingin minta penawaran sewa bus.`, '', ...rows, '', 'Mohon info harga dan ketersediaan armada. Terima kasih.'].join('\n');
}

/** mailto: dengan subjek dan isi pesan (dipotong 1800 huruf); email tidak valid → "". */
export function messageMailHref(email: string, subject: string, body: string): string {
  const value = (email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return '';
  return `mailto:${value}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(Array.from(body).slice(0, 1800).join(''))}`;
}

// ─── Rute ─────────────────────────────────────────────────────────────────────

export interface Route {
  index: number;
  name: string;
  duration: string;
  price: number;
  image: string;
}

export function readRoutes(section: SectionContent): Route[] {
  return sectionItems('routes', section).map((item, index) => ({
    index,
    name: field(item, 'name'),
    duration: field(item, 'duration'),
    price: parsePrice(field(item, 'price')),
    image: field(item, 'image'),
  }));
}

/** "2 hari · dari Semarang" */
export const routeMeta = (route: Route, origin: string): string => [route.duration, origin].filter(Boolean).join(' · ');

/** Pesan WhatsApp "tanya rute ini". */
export function routeMessage(route: Route, origin: string, company: string): string {
  const name = cleanText(company, 80);
  const meta = routeMeta(route, origin);
  return `Halo ${name || 'admin'}, saya ingin bertanya tentang sewa bus ke ${route.name}${meta ? ` (${meta})` : ''}. Mohon info harga dan ketersediaan armada.`;
}

// ─── Film ─────────────────────────────────────────────────────────────────────

export interface Chapter {
  time: string;
  title: string;
  text: string;
}

export const readChapters = (section: SectionContent): Chapter[] =>
  sectionItems('film', section).map((item) => ({ time: field(item, 'time'), title: field(item, 'title'), text: field(item, 'text') }));

/** "05.00" / "5:30" → menit sejak 00.00; tidak terbaca → null. */
export function parseClock(raw: string): number | null {
  const m = /^\s*(\d{1,2})[.:](\d{2})\s*$/.exec(raw || '');
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h <= 23 && min <= 59 ? h * 60 + min : null;
}

export interface FilmClock {
  /** Titik kunci [progres p 0–1 (naik), menit sejak 00.00 (naik; lewat tengah malam = +24 jam)] */
  points: [number, number][];
}

/** Tanpa jam bab yang terbaca: 05.00 → 21.00 merata. */
const DEFAULT_CLOCK: FilmClock = { points: [[0, 5 * 60], [1, 21 * 60]] };
/** Adegan selalu berakhir malam: jam akhir film paling awal 21.00. */
const NIGHT_END = 21 * 60;

/**
 * Awal jendela tiap bab (progres 0–1). Empat bab = jadwal ADEGAN film (./lajur.css): penjemputan 0, berhenti di rest
 * area 0,24, parkir di gerbang tujuan 0,50, perjalanan pulang 0,66 — keterangan, rel, dan jam berganti tepat saat
 * adegannya dimulai. Jumlah bab lain → jendela sama lebar (i/n).
 */
const SCENE_STARTS = [0, 0.24, 0.5, 0.66];
export function chapterStarts(count: number): number[] {
  if (count <= 0) return [];
  if (count === SCENE_STARTS.length) return [...SCENE_STARTS];
  return Array.from({ length: count }, (_, i) => i / count);
}

/**
 * Jam film dari jam bab: titik kunci di AWAL jendela tiap bab (chapterStarts), jadi saat bab menjadi aktif jam besar
 * menunjukkan jam bab itu, lalu satu titik akhir di p = 1 (malam): ≥ 1 jam setelah bab terakhir, paling awal 21.00. Di
 * antaranya jam berjalan lurus. Jam yang tidak terbaca dilewati (tanpa satu pun → 05.00 → 21.00); bab pertama tidak
 * terbaca → mulai 05.00 (atau jam bab terbaca pertama bila lebih pagi); jam yang lebih kecil dari sebelumnya = hari
 * berikutnya. Demo 05.00 · 10.00 · 13.00 · 16.00 → p 0 · 0,24 · 0,5 · 0,66, lalu 21.00 di p = 1.
 */
export function filmClock(chapters: Chapter[]): FilmClock {
  const starts = chapterStarts(chapters.length);
  const points: [number, number][] = [];
  let previous = -1;
  chapters.forEach((chapter, i) => {
    const parsed = parseClock(chapter.time);
    if (parsed === null) return;
    let minutes = parsed;
    while (minutes < previous) minutes += 24 * 60;
    previous = minutes;
    points.push([starts[i], minutes]);
  });
  if (points.length === 0) return DEFAULT_CLOCK;
  if (points[0][0] > 0) points.unshift([0, Math.min(5 * 60, points[0][1])]);
  points.push([1, Math.max(points[points.length - 1][1] + 60, NIGHT_END)]);
  return { points };
}

const clamp01 = (p: number) => (Number.isFinite(p) ? Math.min(1, Math.max(0, p)) : 0);

/** Menit pada progres `p`: garis lurus antar titik kunci; sebelum titik pertama & sesudah titik terakhir tetap. */
export function clockMinutes(p: number, clock: FilmClock): number {
  const t = clamp01(p);
  const points = clock.points.length > 0 ? clock.points : DEFAULT_CLOCK.points;
  if (t <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i += 1) {
    const [p1, m1] = points[i];
    const [p0, m0] = points[i - 1];
    if (t <= p1) return p1 > p0 ? m0 + ((m1 - m0) * (t - p0)) / (p1 - p0) : m1;
  }
  return points[points.length - 1][1];
}

/** Teks jam film pada progres `p` (0–1), dibulatkan ke 5 menit: "05.00" … "21.00". */
export function clockAt(p: number, clock: FilmClock): string {
  const minutes = Math.round(clockMinutes(p, clock) / 5) * 5;
  const day = ((minutes % 1440) + 1440) % 1440;
  return `${pad2(Math.floor(day / 60))}.${pad2(day % 60)}`;
}

/**
 * Progres film (kontrak batch §C): p = clamp((viewTop − trackTop) / (trackHeight − viewHeight), 0, 1). viewTop = tepi
 * atas area terlihat (wadah gulir + sticky top), viewHeight = tinggi area terlihat. Jalur tidak lebih tinggi dari
 * area terlihat atau angka rusak → 0.
 */
export function filmProgress(viewTop: number, trackTop: number, trackHeight: number, viewHeight: number): number {
  const distance = trackHeight - viewHeight;
  if (!(distance > 0) || !Number.isFinite(viewTop) || !Number.isFinite(trackTop)) return 0;
  return Math.min(1, Math.max(0, (viewTop - trackTop) / distance));
}

/** Bab aktif pada progres `p`: bab terakhir yang jendelanya sudah dimulai (chapterStarts). Tanpa bab → -1. */
export function chapterAt(p: number, count: number): number {
  if (count <= 0) return -1;
  const t = clamp01(p);
  const starts = chapterStarts(count);
  let index = 0;
  for (let i = 1; i < starts.length; i += 1) if (t >= starts[i]) index = i;
  return index;
}

/** Progres poster film statis (siang, bus parkir di gerbang tujuan). */
export const POSTER_P = 0.55;

// ─── Lain-lain ────────────────────────────────────────────────────────────────

export interface SocialLink {
  key: string;
  label: string;
  href: string;
}

export const socialLinks = (footer: SectionContent): SocialLink[] =>
  SOCIAL_FIELDS.map(({ key, label }) => ({ key, label, href: safeUrl(text(footer, key)) ?? '' })).filter((s) => s.href);

// ─── Model ────────────────────────────────────────────────────────────────────

export function readLajur(content: SiteContent) {
  const section = (key: string) => getSection(content, key);
  const brand = section('brand');
  const hero = section('hero');
  const fleetSection = section('fleet');
  const routesSection = section('routes');
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
  /** Tujuan "minta penawaran": formulir di hero, kalau tidak Kontak, kalau tidak WhatsApp. */
  const quoteAction: LinkAction | null = sectionAction('hero') ?? sectionAction('contact') ?? waAction;
  /**
   * Isi field URL: "#armada", "#harga", "#kontak" dsb. hanya bila section itu tampil (anchor Indonesia diterjemahkan);
   * anchor tak dikenal / section tersembunyi / kosong → `fallback`.
   */
  const linkOr = (raw: string, fallback: LinkAction | null): LinkAction | null => {
    const action = resolveAction(raw, fallback);
    if (action?.kind !== 'section') return action;
    const target = sectionTarget(action.target);
    if (target === 'hero') return shown('hero') ? { kind: 'section', target } : fallback;
    return target && shown(target) ? { kind: 'section', target } : fallback;
  };
  /** WhatsApp dengan pesan bebas ke nomor Kontak; tanpa nomor → null. */
  const waWith = (message: string): LinkAction | null => {
    const link = whatsappHref(whatsapp, message);
    return link ? { kind: 'external', href: link } : null;
  };

  const fleet = readFleet(fleetSection);
  const routes = shown('routes') ? readRoutes(routesSection) : [];
  const chapters = readChapters(section('film'));
  const numbers = sectionNumbers(content);
  /** Section tampil berikutnya setelah film (tujuan "Lewati animasi"). */
  const afterFilm = PAGE_SECTIONS.slice(PAGE_SECTIONS.indexOf('film') + 1).find((key) => key !== 'footer' && shown(key)) ?? null;

  return {
    brand,
    hero,
    fleetSection,
    convoy: section('convoy'),
    film: section('film'),
    routesSection,
    included: section('included'),
    steps: section('steps'),
    testimonials: section('testimonials'),
    gallery: section('gallery'),
    faq: section('faq'),
    contact,
    footer,
    companyName,
    tagline: text(brand, 'tagline'),
    logo: text(brand, 'logo'),
    colors: lajurVars(text(brand, 'accent_color')),
    whatsapp,
    waAction,
    quoteAction,
    shown,
    items,
    sectionAction,
    linkOr,
    waWith,
    /** Armada (juga dipakai kalkulator & rekomendasi hero bila section Armada disembunyikan) */
    fleet,
    routes,
    chapters,
    numbers,
    afterFilm,
    headerLabel: text(hero, 'header_label'),
    headerAction: linkOr(text(hero, 'header_url'), quoteAction),
    nav: navItems(content),
    socials: socialLinks(footer),
    map: mapsInfo(text(contact, 'maps_url'), text(contact, 'maps_query') || text(contact, 'address')),
    year: new Date().getFullYear(),
  };
}

export type LajurModel = ReturnType<typeof readLajur>;
