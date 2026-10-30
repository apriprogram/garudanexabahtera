// Turunan konten Pesiar (fungsi murni, tanpa React): warna tema (teks aksen di pasir, aksen terang di hijau tua),
// section yang tampil, menu, tujuan tautan, harga ("Rp750rb", "Rp1,1 jt"), tur sehari, perencana tur (pilih ≤ 5
// tempat, urutkan, perkiraan jam = jemput & antar + jam tiap tempat, harga per mobil = paket dasar + jam tambahan),
// antar-jemput bandara (harga per zona × mobil, formulir), validasi, penyusun pesan WhatsApp, dan garis waktu film
// (posisi mobil, jam, kamera) untuk ./Film.tsx. Semua tahan konten mentah (null, angka, list rusak). Formulir hanya
// MENYUSUN pesan WhatsApp: tidak ada data yang dikirim ke server atau disimpan, tidak ada pembayaran online, tidak ada
// pelacakan penerbangan. Harga = contoh per mobil, dikonfirmasi admin.
import type { CSSProperties } from 'react';
import type { ListItem, SectionContent, SiteContent } from '../types';
import { SOCIAL_FIELDS } from '../shared/social';
import {
  contrast,
  field,
  getSection,
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
import { PESIAR_ACCENT } from './defaultContent';
import { ROUTE_BOX, ROUTE_LEGS } from './map';

// ─── Warna ────────────────────────────────────────────────────────────────────

type Rgb = [number, number, number];
const WHITE: Rgb = [255, 255, 255];
/** Pasir pita A (#F5EFE6) */
export const SAND: Rgb = [245, 239, 230];
/** Hijau tua film, panel hasil perencana, footer (#17332B, netral tetap) */
export const DEEP: Rgb = [23, 51, 43];
/** Hijau-hitam untuk menggelapkan teks aksen */
const NIGHT: Rgb = [14, 26, 22];
const toHex = (rgb: Rgb) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
/** Campuran dibulatkan: kontras dihitung dari warna yang benar-benar ditulis sebagai hex. */
const mix = (a: Rgb, b: Rgb, amountOfA: number): Rgb => a.map((c, i) => Math.round(c * amountOfA + b[i] * (1 - amountOfA))) as Rgb;

const accentOf = (raw: string): Rgb => parseHex(raw) ?? (parseHex(PESIAR_ACCENT) as Rgb);

/**
 * Variabel warna lokal Pesiar (di samping --tpl-accent* milik Shell), dari SATU warna tema:
 * --ps-ink: teks aksen di pasir/putih (nomor label, harga, tautan), ≥ 4,6:1 di pasir;
 * --ps-bright: aksen terang di hijau tua (rute yang sudah dilalui, sorotan di film/panel/footer), ≥ 4,8:1 di hijau tua.
 */
export function pesiarVars(accentRaw: string): CSSProperties {
  const accent = accentOf(accentRaw);
  let ink = accent;
  for (let i = 0; i < 30 && contrast(ink, SAND) < 4.6; i += 1) ink = mix(ink, NIGHT, 0.9);
  let bright = accent;
  for (let i = 0; i < 40 && contrast(bright, DEEP) < 4.8; i += 1) bright = mix(bright, WHITE, 0.9);
  return { '--ps-ink': toHex(ink), '--ps-bright': toHex(bright) } as CSSProperties;
}

// ─── Section di halaman ───────────────────────────────────────────────────────

/**
 * Kunci section yang punya tempat di halaman (urutan halaman; = section skema tanpa `brand`). Jalur keputusan: pilih tur
 * → rancang → film (sehari bersama sopir) → isi harga paket → mobil & sopir → produk kedua (antar-jemput bandara) →
 * cerita tamu → tanya jawab → kontak.
 */
export const PAGE_SECTIONS = ['hero', 'tours', 'planner', 'film', 'included', 'cars', 'transfer', 'testimonials', 'faq', 'contact', 'footer'] as const;
const KNOWN_SECTIONS = new Set<string>(PAGE_SECTIONS);

/** [kunci list, maks. item (= skema), syarat item dirender] per section. Satu sumber untuk komponen dan menu. */
const ITEMS: Record<string, [listKey: string, max: number, keep: (item: ListItem) => boolean]> = {
  tours: ['items', 8, (i) => !!field(i, 'name')],
  planner: ['destinations', 16, (i) => !!field(i, 'name')],
  film: ['stops', 6, (i) => !!field(i, 'name')],
  transfer: ['zones', 8, (i) => !!field(i, 'name')],
  cars: ['items', 4, (i) => !!field(i, 'name')],
  testimonials: ['items', 6, (i) => !!field(i, 'quote')],
  faq: ['items', 8, (i) => !!field(i, 'question')],
};

/** Item yang dirender untuk section `key` (lihat ITEMS); section tanpa daftar → []. */
export function sectionItems(key: string, section: SectionContent): ListItem[] {
  const rule = ITEMS[key];
  return rule ? list(section, rule[0], rule[1]).filter(rule[2]) : [];
}

/** Baris teks list sederhana (`yes`/`no` di Termasuk, `notes` di Bandara, `trust` di hero). */
export const textItems = (section: SectionContent, key: string, max: number): string[] =>
  list(section, key, max)
    .map((i) => field(i, 'text'))
    .filter(Boolean);

/** Section tampil dan berisi? Kunci yang tidak dikenal (mis. salah ketik di field URL) → false. */
export function sectionShown(content: SiteContent, key: string): boolean {
  if (!KNOWN_SECTIONS.has(key)) return false;
  const s = getSection(content, key);
  if (!isEnabled(s)) return false;
  if (key in ITEMS) return sectionItems(key, s).length > 0;
  if (key === 'included') return textItems(s, 'yes', 8).length + textItems(s, 'no', 8).length > 0;
  // hero, contact, footer
  return true;
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

export interface PesiarNavItem {
  key: string;
  label: string;
}

/** Menu singkat (≤ 6 kata benda pendek, sama dengan label section; urutan halaman). */
const NAV: PesiarNavItem[] = [
  { key: 'tours', label: 'Tur' },
  { key: 'planner', label: 'Rancang' },
  { key: 'cars', label: 'Mobil' },
  { key: 'transfer', label: 'Bandara' },
  { key: 'faq', label: 'FAQ' },
  { key: 'contact', label: 'Kontak' },
];

/** Menu hanya untuk section yang benar-benar tampil (tanpa tautan mati). */
export function navItems(content: SiteContent): PesiarNavItem[] {
  return NAV.filter(({ key }) => sectionShown(content, key));
}

// ─── Tujuan tautan "#…" ───────────────────────────────────────────────────────

/** Anchor berbahasa Indonesia yang wajar diketik pembeli → kunci section. */
const ANCHOR_ALIASES: Record<string, string> = {
  tur: 'tours',
  paket: 'tours',
  'paket-tur': 'tours',
  rancang: 'planner',
  'rancang-tur': 'planner',
  perencana: 'planner',
  perjalanan: 'film',
  'sehari-bersama': 'film',
  bandara: 'transfer',
  'antar-jemput': 'transfer',
  jemput: 'transfer',
  mobil: 'cars',
  armada: 'cars',
  sopir: 'cars',
  harga: 'included',
  termasuk: 'included',
  'tanya-jawab': 'faq',
  lokasi: 'contact',
  kantor: 'contact',
};

/** Target tautan section ("rancang", "planner", "kontak") → kunci section di halaman, atau null bila tidak dikenal. */
export function sectionTarget(target: string): string | null {
  const clean = sectionFromAnchor(target);
  const key = ANCHOR_ALIASES[clean] ?? clean;
  return KNOWN_SECTIONS.has(key) ? key : null;
}

// ─── Angka, harga, jam ────────────────────────────────────────────────────────

/** "750.000" (pemisah ribuan titik). */
export const groupThousands = (n: number): string => {
  const value = Math.round(Math.abs(n));
  return `${n < 0 ? '-' : ''}${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};

/** "Rp750.000" */
export const formatRupiah = (n: number): string => `Rp${groupThousands(n)}`;

/** Desimal Indonesia dengan maks. `digits` angka di belakang koma, nol di belakang dibuang: 1.5 → "1,5", 2 → "2". */
export const formatDecimal = (n: number, digits = 1): string => {
  const [whole, frac = ''] = (Math.round(n * 10 ** digits) / 10 ** digits).toFixed(digits).split('.');
  const trimmed = frac.replace(/0+$/, '');
  return `${groupThousands(Number(whole))}${trimmed ? `,${trimmed}` : ''}`;
};

/** Spasi tak terputus antara angka dan satuan ("Rp1,1 jt" tidak terbelah di akhir baris). */
export const NBSP = String.fromCharCode(160);

/** Harga singkat: ≥ 1 juta → "Rp1,1 jt", ≥ 1.000 → "Rp750rb", selain itu rupiah penuh; 0 / tidak valid → "". */
export function formatPriceShort(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n >= 1e6) return `Rp${formatDecimal(n / 1e6, 2)}${NBSP}jt`;
  if (n >= 1e3 && n % 1e3 === 0) return `Rp${groupThousands(n / 1e3)}rb`;
  return formatRupiah(n);
}

const UNITS: [RegExp, number][] = [
  [/^(jt|juta)$/i, 1e6],
  [/^(rb|ribu|k)$/i, 1e3],
];

/**
 * Harga dari CMS → rupiah. SATU angka, boleh diawali "Rp"/"mulai" dan diikuti kata tanpa angka ("per mobil", "/jam"):
 * angka biasa ("750000", "Rp750.000", "Rp750.000,00", "Rp 750.000,-") = rupiah (bagian desimal dibuang); dengan satuan
 * ("750rb", "85rb/jam", "1,1 jt / mobil", "1.25 juta", "750 ribu per mobil") = desimal × satuan. Angka kedua (rentang
 * "750.000 - 900.000", "2 x 375.000") atau tidak terbaca → 0 (harga disembunyikan, bukan angka-angka digabung).
 * Maks. 12 digit.
 */
export function parsePrice(raw: string | number | null | undefined): number {
  const value = String(raw ?? '').trim();
  if (!value) return 0;
  const found = /(\d[\d.,]*)\s*(jt|juta|rb|ribu|k)?(?![a-z])/i.exec(value);
  if (!found) return 0;
  // Angka kedua di belakangnya → ambigu, harga disembunyikan
  if (/\d/.test(value.slice(found.index + found[0].length))) return 0;
  const number = found[1].replace(/[.,]+$/, '');
  const unit = found[2] ? UNITS.find(([pattern]) => pattern.test(found[2])) : undefined;
  if (unit) {
    const n = Number.parseFloat(number.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? Math.round(n * unit[1]) : 0;
  }
  // Rupiah penuh: bagian desimal ",00" / ",5" dibuang, lalu pemisah ribuan
  const digits = number.replace(/,\d{1,2}$/, '').replace(/\D/g, '').slice(0, 12);
  return digits ? Number(digits) : 0;
}

/**
 * Jam dari CMS: "1,5" / "1.5" / "1,5 jam" / "± 1,5 jam" → 1.5, "90 menit" → 1.5; kosong/tidak valid → `fallback`.
 * Dibatasi 0–24.
 */
export function parseHours(raw: string | number | null | undefined, fallback = 0): number {
  const value = String(raw ?? '')
    .trim()
    .replace(/^(?:±|~|≈|\+\/-|sekitar|kira-kira)\s*/i, '');
  const n = Number.parseFloat(value.replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return fallback;
  const hours = /^\d+(?:[.,]\d+)?\s*(?:menit|mnt)\b/i.test(value) ? n / 60 : n;
  return Math.min(24, hours);
}

/** Jumlah bulat dari CMS ("6 penumpang" → 6); kosong → 0. */
export const parseCount = (raw: string): number => {
  const n = Number.parseInt((raw || '').replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** "± 9,5 jam" */
export const formatHours = (h: number): string => `±${NBSP}${formatDecimal(h, 1)}${NBSP}jam`;

// ─── Tur sehari ───────────────────────────────────────────────────────────────

export interface Tour {
  index: number;
  name: string;
  /** Lama tur (jam) seperti di CMS, 0 = tidak ditulis */
  hours: number;
  /** Nama tempat berurutan (dari "Celuk, Ubud, Tegallalang") */
  stops: string[];
  price: number;
  image: string;
}

/** "Celuk, Ubud; Tegallalang → Kintamani" → ["Celuk", "Ubud", "Tegallalang", "Kintamani"] (maks. 8). */
export const splitStops = (raw: string): string[] =>
  (raw || '')
    .split(/\s*(?:,|;|→|->|\n)\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);

export function readTours(section: SectionContent): Tour[] {
  return sectionItems('tours', section).map((item, index) => ({
    index,
    name: field(item, 'name'),
    hours: parseHours(field(item, 'hours')),
    stops: splitStops(field(item, 'stops')),
    price: parsePrice(field(item, 'price')),
    image: field(item, 'image'),
  }));
}

/** Pesan WhatsApp untuk satu tur. */
export function tourMessage(tour: Tour, company: string): string {
  const name = company || 'admin';
  const facts = [tour.hours ? `${formatDecimal(tour.hours)} jam` : '', tour.price ? `mulai ${formatRupiah(tour.price)} per mobil` : ''].filter(Boolean).join(', ');
  return [
    `Halo ${name}, saya ingin memesan tur ${tour.name}${facts ? ` (${facts})` : ''}.`,
    tour.stops.length ? `Rute: ${tour.stops.join(' → ')}` : '',
    'Mohon info tanggal yang tersedia. Terima kasih.',
  ]
    .filter(Boolean)
    .join('\n');
}

// ─── Mobil ────────────────────────────────────────────────────────────────────

export type CarKind = 'sedan' | 'mpv' | 'minibus';

export interface Car {
  index: number;
  name: string;
  seats: number;
  luggage: string;
  /** Harga paket dasar (mis. 10 jam) per mobil */
  price: number;
  /** Harga per jam tambahan */
  overtime: number;
  image: string;
  kind: CarKind;
}

/** Gambar garis mobil dipilih dari kata kelas di nama ("sedan", "mpv/suv", "minibus/van") lalu dari jumlah kursi. */
export function carKind(name: string, seats: number): CarKind {
  if (/\b(minibus|mini bus|microbus|van|bus)\b/i.test(name)) return 'minibus';
  if (/\b(mpv|suv|keluarga|family)\b/i.test(name)) return 'mpv';
  if (/\b(sedan|city car|hatchback)\b/i.test(name)) return 'sedan';
  return seats >= 9 ? 'minibus' : seats >= 5 ? 'mpv' : 'sedan';
}

export function readCars(section: SectionContent): Car[] {
  return sectionItems('cars', section).map((item, index) => {
    const name = field(item, 'name');
    const seats = parseCount(field(item, 'seats'));
    return {
      index,
      name,
      seats,
      luggage: field(item, 'luggage'),
      price: parsePrice(field(item, 'price')),
      overtime: parsePrice(field(item, 'overtime')),
      image: field(item, 'image'),
      kind: carKind(name, seats),
    };
  });
}

/** "MPV 6 penumpang (atau setara)" — nama kelas mobil (+ jumlah penumpang bila nama belum memuat angka), tanpa merek. */
export const carLabel = (car: Car | null | undefined): string =>
  car ? `${car.name}${car.seats > 0 && !/\d/.test(car.name) ? ` ${car.seats} penumpang` : ''} (atau setara)` : '';

// ─── Perencana tur ────────────────────────────────────────────────────────────

export interface Destination {
  /** Kunci stabil: nama huruf kecil (nama ganda → nama + urutan) */
  id: string;
  name: string;
  area: string;
  hours: number;
}

export function readDestinations(section: SectionContent): Destination[] {
  const seen = new Set<string>();
  return sectionItems('planner', section).map((item, i) => {
    const name = field(item, 'name');
    let id = name.toLowerCase();
    if (seen.has(id)) id = `${id}-${i}`;
    seen.add(id);
    return { id, name, area: field(item, 'area'), hours: parseHours(field(item, 'hours'), 1) };
  });
}

/** Maksimal tempat per tur. */
export const MAX_STOPS = 5;

/** Pilih/lepas tempat. Sudah penuh (`max`) → daftar tidak berubah. */
export function toggleStop(stops: readonly string[], id: string, max = MAX_STOPS): string[] {
  if (stops.includes(id)) return stops.filter((s) => s !== id);
  return stops.length >= max ? [...stops] : [...stops, id];
}

/** Pindahkan tempat ke atas (−1) / ke bawah (+1); di ujung → tidak berubah. */
export function moveStop(stops: readonly string[], index: number, dir: -1 | 1): string[] {
  const target = index + dir;
  if (index < 0 || index >= stops.length || target < 0 || target >= stops.length) return [...stops];
  const next = [...stops];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Tempat tur → id tempat perencana (nama sama, tanpa beda huruf besar-kecil; tidak dikenal dilewati; maks. 5). */
export function stopsFromTour(tour: Tour, destinations: readonly Destination[], max = MAX_STOPS): string[] {
  const ids: string[] = [];
  for (const name of tour.stops) {
    const found = destinations.find((d) => d.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (found && !ids.includes(found.id)) ids.push(found.id);
    if (ids.length >= max) break;
  }
  return ids;
}

export interface PlannerSettings {
  /** Jam paket dasar (bawaan 10) */
  baseHours: number;
  /** Jam jemput & antar kembali (bawaan 2) */
  bufferHours: number;
}

/** Jam paket dasar (bulat, ≥ 1; kosong/0/tidak terbaca → 10) dan jam jemput & antar (kosong/tidak terbaca → 2). */
export function plannerSettings(planner: SectionContent): PlannerSettings {
  const base = Math.round(parseHours(text(planner, 'base_hours'), 10));
  return { baseHours: base >= 1 ? base : 10, bufferHours: parseHours(text(planner, 'buffer_hours'), 2) };
}

export interface PlanEstimate {
  /** Perkiraan lama tur (jam, kelipatan 0,5) */
  hours: number;
  baseHours: number;
  /** Jam tambahan yang ditagih (dibulatkan ke atas) */
  extraHours: number;
  /** Perkiraan harga per mobil; 0 bila mobil/harga tidak ada */
  price: number;
}

/**
 * Perkiraan durasi & harga: jam = jemput & antar + Σ jam tempat (dibulatkan ke 0,5); tanpa tempat → 0 jam. Harga =
 * harga paket mobil bila jam ≤ paket dasar, selain itu + ceil(jam − paket) × harga per jam tambahan. Perkiraan saja.
 */
export function planEstimate(stops: readonly Destination[], car: Car | null, settings: PlannerSettings): PlanEstimate {
  const raw = stops.length ? settings.bufferHours + stops.reduce((sum, s) => sum + s.hours, 0) : 0;
  const hours = Math.round(raw * 2) / 2;
  const extraHours = Math.max(0, Math.ceil(hours - settings.baseHours - 1e-9));
  const price = car && car.price > 0 && stops.length ? car.price + extraHours * car.overtime : 0;
  return { hours, baseHours: settings.baseHours, extraHours, price };
}

/** Area jemput dari CMS ("Seminyak, Kuta, Ubud") → pilihan (unik, maks. 12). */
export const pickupAreas = (raw: string): string[] =>
  Array.from(new Set((raw || '').split(/\s*[,;\n]\s*/).map((s) => s.trim()).filter(Boolean))).slice(0, 12);

export interface PlannerForm {
  /** id tempat berurutan */
  stops: string[];
  pickup: string;
  /** YYYY-MM-DD */
  date: string;
  /** indeks mobil di daftar Mobil */
  car: number;
}

export type PlannerErrors = Partial<Record<'stops' | 'date', string>>;

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
export function formatLongDate(iso: string): string {
  const date = parseIsoDate(iso);
  return date ? `${DAYS[date.getUTCDay()]}, ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}` : '';
}

const dateError = (iso: string, today: string, empty: string): string | undefined => {
  if (!iso) return empty;
  if (!parseIsoDate(iso)) return 'Tanggal tidak valid.';
  if (iso < today) return 'Pilih tanggal hari ini atau sesudahnya.';
  return undefined;
};

/** Pesan galat per isian perencana (kosong = valid): minimal 1 tempat, tanggal tidak sebelum hari ini. */
export function validatePlanner(form: PlannerForm, destinations: readonly Destination[], today: string): PlannerErrors {
  const errors: PlannerErrors = {};
  if (!form.stops.some((id) => destinations.some((d) => d.id === id))) errors.stops = 'Pilih minimal 1 tempat tujuan.';
  const date = dateError(form.date, today, 'Pilih tanggal tur.');
  if (date) errors.date = date;
  return errors;
}

/** Pesan WhatsApp perencana: salam, baris per isian, perkiraan, penutup. */
export function plannerMessage(form: PlannerForm, destinations: readonly Destination[], cars: readonly Car[], settings: PlannerSettings, company: string): string {
  const chosen = form.stops.map((id) => destinations.find((d) => d.id === id)).filter((d): d is Destination => !!d);
  const car = cars[form.car] ?? null;
  const estimate = planEstimate(chosen, car, settings);
  const rows = [
    `Tanggal: ${formatLongDate(form.date)}`,
    form.pickup && `Jemput di: ${form.pickup}`,
    `Rute: ${chosen.map((d) => d.name).join(' → ')}`,
    `Perkiraan durasi: ${formatHours(estimate.hours).split(NBSP).join(' ')}`,
    car && `Mobil: ${carLabel(car)}`,
    estimate.price > 0 && `Perkiraan harga per mobil: ${formatRupiah(estimate.price)}`,
  ].filter(Boolean);
  return [`Halo ${company || 'admin'}, saya ingin memesan tur pribadi.`, '', ...rows, '', 'Mohon konfirmasi ketersediaan. Terima kasih.'].join('\n');
}

// ─── Antar-jemput bandara ─────────────────────────────────────────────────────

export interface Zone {
  name: string;
  /** "± 40 menit" */
  time: string;
  /** Harga per mobil sesuai urutan daftar Mobil (maks. 4); 0 = tidak tersedia */
  prices: number[];
}

export function readZones(section: SectionContent): Zone[] {
  return sectionItems('transfer', section).map((item) => ({
    name: field(item, 'name'),
    time: field(item, 'time'),
    prices: [1, 2, 3, 4].map((n) => parsePrice(field(item, `price_${n}`))),
  }));
}

/** Harga zona untuk mobil ke-`carIndex` (0 bila tidak ada). */
export const transferPrice = (zone: Zone | null | undefined, carIndex: number): number => zone?.prices[carIndex] ?? 0;

export type Direction = 'arrive' | 'depart';

export const DIRECTIONS: { key: Direction; label: string; time: string }[] = [
  { key: 'arrive', label: 'Jemput di bandara', time: 'Jam mendarat' },
  { key: 'depart', label: 'Antar ke bandara', time: 'Jam terbang' },
];

export interface TransferForm {
  direction: Direction;
  date: string;
  /** "HH:MM" (input type=time) */
  time: string;
  flight: string;
  /** indeks zona */
  zone: number;
  hotel: string;
  pax: string;
  /** indeks mobil */
  car: number;
}

export type TransferErrors = Partial<Record<'date' | 'time' | 'flight' | 'hotel' | 'pax', string>>;

export const TRANSFER_LIMITS = { flight: 8, hotel: 80, pax: 2 } as const;

/** Teks bersih satu baris: karakter kontrol dibuang, spasi dirapikan, dipotong ke `max`. */
export function cleanText(raw: string, max: number): string {
  const visible = Array.from(raw || '', (ch) => {
    const code = ch.charCodeAt(0);
    return code < 32 || code === 127 ? ' ' : ch;
  }).join('');
  return Array.from(visible.replace(/\s+/g, ' ').trim()).slice(0, max).join('').trim();
}

/** Nomor penerbangan "ga404" → "GA 404" (2 huruf/angka maskapai + 1–4 angka); tidak cocok → null. */
export function normalizeFlight(raw: string): string | null {
  const m = /^([a-z0-9]{2})\s*-?\s*(\d{1,4}[a-z]?)$/i.exec((raw || '').trim());
  return m && /[a-z]/i.test(m[1]) ? `${m[1].toUpperCase()} ${m[2].toUpperCase()}` : null;
}

/** Kursi mobil terbesar di daftar (0 bila tidak ada mobil berkursi). */
export const maxSeats = (cars: readonly Car[]): number => cars.reduce((max, c) => Math.max(max, c.seats), 0);

/** Rombongan lebih besar dari mobil terbesar: boleh dipesan, butuh lebih dari satu mobil (dikonfirmasi admin). */
export const needsMoreCars = (pax: number, cars: readonly Car[]): boolean => {
  const max = maxSeats(cars);
  return max > 0 && pax > max;
};

/**
 * Validasi formulir antar-jemput: tanggal ≥ hari ini, jam, nomor penerbangan (opsional), hotel, penumpang. Penumpang
 * melebihi kursi mobil terpilih → galat yang menyebut mobil terkecil yang cukup; melebihi mobil TERBESAR → tidak galat
 * (rombongan besar butuh lebih dari satu mobil, ditulis di pesan untuk dikonfirmasi admin).
 */
export function validateTransfer(form: TransferForm, cars: readonly Car[], today: string): TransferErrors {
  const errors: TransferErrors = {};
  const date = dateError(form.date, today, 'Pilih tanggal.');
  if (date) errors.date = date;
  if (!/^([01]\d|2[0-3])[:.][0-5]\d$/.test((form.time || '').trim())) errors.time = 'Isi jam, mis. 14:35.';
  if (form.flight.trim() && !normalizeFlight(form.flight)) errors.flight = 'Contoh: GA 404.';
  if (cleanText(form.hotel, TRANSFER_LIMITS.hotel).length < 2) errors.hotel = 'Tulis nama hotel atau alamat.';
  const pax = Number(form.pax);
  const car = cars[form.car];
  if (!/^\d{1,2}$/.test(form.pax.trim()) || pax < 1) errors.pax = 'Isi jumlah penumpang.';
  else if (car && car.seats > 0 && pax > car.seats) {
    const fits = cars.filter((c) => c.seats >= pax).sort((a, b) => a.seats - b.seats)[0];
    if (fits) errors.pax = `${car.name} muat ${car.seats} penumpang. Pilih ${fits.name} (${fits.seats} penumpang).`;
  }
  return errors;
}

/** Pesan WhatsApp antar-jemput bandara. */
export function transferMessage(form: TransferForm, zones: readonly Zone[], cars: readonly Car[], company: string): string {
  const direction = DIRECTIONS.find((d) => d.key === form.direction) ?? DIRECTIONS[0];
  const zone = zones[form.zone] ?? null;
  const car = cars[form.car] ?? null;
  const price = transferPrice(zone, form.car);
  const flight = normalizeFlight(form.flight);
  const place = [zone?.name, cleanText(form.hotel, TRANSFER_LIMITS.hotel)].filter(Boolean).join(' — ');
  const rows = [
    `Layanan: ${direction.label}`,
    `Tanggal: ${formatLongDate(form.date)}`,
    `${direction.time}: ${form.time.trim().replace(':', '.')}`,
    flight && `Nomor penerbangan: ${flight}`,
    place && `${form.direction === 'arrive' ? 'Tujuan' : 'Jemput di'}: ${place}`,
    `Penumpang: ${Number(form.pax)} orang${needsMoreCars(Number(form.pax), cars) ? ' (lebih dari satu mobil, mohon dikonfirmasi)' : ''}`,
    car && `Mobil: ${carLabel(car)}`,
    price > 0 && `Perkiraan harga: ${formatRupiah(price)}`,
  ].filter(Boolean);
  return [`Halo ${company || 'admin'}, saya ingin memesan antar-jemput bandara.`, '', ...rows, '', 'Mohon konfirmasi. Terima kasih.'].join('\n');
}

/** mailto: dengan subjek dan isi pesan (dipotong 1800 huruf); email tidak valid → "". */
export function messageMailHref(email: string, subject: string, body: string): string {
  const mail = mailHref(email);
  if (!mail) return '';
  return `${mail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(Array.from(body).slice(0, 1800).join(''))}`;
}

// ─── Film: garis waktu sehari bersama sopir ───────────────────────────────────

export interface FilmStop {
  time: string;
  name: string;
  text: string;
  image: string;
}

export function readFilmStops(section: SectionContent): FilmStop[] {
  return sectionItems('film', section).map((item) => ({
    time: field(item, 'time'),
    name: field(item, 'name'),
    text: field(item, 'text'),
    image: field(item, 'image'),
  }));
}

/** "09.30" / "9:30" → 570 (menit sejak 00.00); tidak valid → null. */
export function parseClock(raw: string): number | null {
  const m = /^(\d{1,2})[.:](\d{2})/.exec((raw || '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h < 24 && min < 60 ? h * 60 + min : null;
}

/** 570 → "09.30" (dibulatkan ke bawah per 5 menit). */
export function formatClock(minutes: number): string {
  const m = Math.max(0, Math.floor(minutes / 5) * 5) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}.${String(m % 60).padStart(2, '0')}`;
}

/** Jam bawaan 6 perhentian: 08.00, 09.30, 11.00, 13.00, 15.30, 18.00. */
const DEFAULT_TIMES = [480, 570, 660, 780, 930, 1080];

/** Jam tiap perhentian (menit) dari CMS; tidak terbaca / tidak naik → jam bawaan perhentian itu. */
export function filmMinutes(stops: readonly FilmStop[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < DEFAULT_TIMES.length; i += 1) {
    const own = stops[i] ? parseClock(stops[i].time) : null;
    const prev = out[i - 1] ?? -1;
    out.push(own !== null && own > prev ? own : Math.max(DEFAULT_TIMES[i], prev + 5));
  }
  return out;
}

/** Panjang polyline (unit peta). */
export const polylineLength = (points: readonly (readonly [number, number])[]): number =>
  points.reduce((sum, p, i) => (i === 0 ? 0 : sum + Math.hypot(p[0] - points[i - 1][0], p[1] - points[i - 1][1])), 0);

/** Titik pada polyline di fraksi `t` (0–1) panjangnya: cadangan getPointAtLength (jsdom, browser lama). */
export function pointOnPolyline(points: readonly (readonly [number, number])[], t: number): [number, number] {
  if (points.length === 0) return [0, 0];
  const total = polylineLength(points);
  let left = Math.min(1, Math.max(0, t)) * total;
  for (let i = 1; i < points.length; i += 1) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const seg = Math.hypot(x1 - x0, y1 - y0);
    if (left <= seg || i === points.length - 1) {
      const u = seg > 0 ? Math.min(1, left / seg) : 0;
      return [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u];
    }
    left -= seg;
  }
  const last = points[points.length - 1];
  return [last[0], last[1]];
}

/** Bagian progres: pembuka (kamera mendekat), tiap singgah, perjalanan dibagi menurut panjang ruas, penutup. */
export const FILM_SHAPE = { intro: 0.08, outro: 0.08, firstDwell: 0.03, dwell: 0.045, lastDwell: 0.03 } as const;

export interface FilmPlan {
  /** Progres tiba di perhentian i (6) */
  arrive: number[];
  /** Progres berangkat dari perhentian i (5; perhentian terakhir tidak berangkat) */
  leave: number[];
  /** Jam tiba (menit) per perhentian */
  minutes: number[];
  /** Jam berangkat (menit) dari perhentian i (5): ./filmDepartures */
  depart: number[];
}

/** Perkiraan lama perjalanan (menit) 5 ruas rute contoh: Seminyak → Celuk → Tegallalang → Kintamani → Tirta Empul → Seminyak. */
export const DRIVE_MINUTES: readonly number[] = [75, 45, 45, 45, 90];

/**
 * Jam berangkat dari tiap perhentian = jam tiba di perhentian berikutnya − perkiraan lama perjalanan ruas itu, dengan
 * singgah minimal 15 menit (atau 20% jeda bila jedanya pendek). Jam bawaan: 08.15, 10.15, 12.15, 14.45, 16.30 — mobil
 * baru meninggalkan Kintamani setelah makan siang, jadi jam film dan mobil yang berjalan tidak saling bertentangan.
 */
export function filmDepartures(minutes: readonly number[]): number[] {
  return minutes.slice(0, -1).map((at, i) => {
    const gap = Math.max(0, minutes[i + 1] - at);
    const drive = Math.max(0, Math.min(DRIVE_MINUTES[i] ?? gap / 2, gap - Math.min(15, gap * 0.2)));
    return minutes[i + 1] - drive;
  });
}

/**
 * Rencana progres film dari panjang 5 ruas dan jam 6 perhentian. Bagian perjalanan dibagi menurut panjang^0,6 (ruas
 * pulang yang panjang tidak menghabiskan gulir; mobil sedikit lebih cepat di sana). Panjang 0 semua → dibagi rata.
 */
export function filmPlan(legLengths: readonly number[], minutes: readonly number[]): FilmPlan {
  const legs = legLengths.length;
  const dwells = Array.from({ length: legs + 1 }, (_, i) => (i === 0 ? FILM_SHAPE.firstDwell : i === legs ? FILM_SHAPE.lastDwell : FILM_SHAPE.dwell));
  const drive = 1 - FILM_SHAPE.intro - FILM_SHAPE.outro - dwells.reduce((a, b) => a + b, 0);
  const weights = legLengths.map((l) => Math.max(0, l) ** 0.6);
  const total = weights.reduce((a, b) => a + b, 0);
  const arrive: number[] = [];
  const leave: number[] = [];
  let p = FILM_SHAPE.intro;
  for (let i = 0; i <= legs; i += 1) {
    arrive.push(p);
    p += dwells[i];
    if (i < legs) {
      leave.push(p);
      p += drive * (total > 0 ? weights[i] / total : 1 / legs);
    }
  }
  return { arrive, leave, minutes: [...minutes], depart: filmDepartures(minutes) };
}

export interface FilmFrame {
  /** Ruas tempat mobil berada (0–4) */
  leg: number;
  /** Posisi pada ruas (0–1, sudah diperhalus) */
  t: number;
  /** Jam (menit) */
  minutes: number;
  /** Kamera: 0 = seluruh rute, 1 = mengikuti mobil */
  k: number;
  /** Perhentian aktif (0–5): perhentian terakhir yang sudah (hampir) dicapai */
  chapter: number;
  /** Kartu foto perhentian tampil (mobil singgah, kamera sudah dekat) */
  dwell: boolean;
  /** Mobil sedang berjalan di antara dua perhentian */
  moving: boolean;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
/** Perhalusan masuk-keluar (mobil mulai pelan, berhenti pelan). */
export const easeInOut = (u: number): number => (1 - Math.cos(Math.PI * clamp01(u))) / 2;

/** Keadaan film di progres `p` (0–1). Murni: dipakai komponen untuk menulis DOM, dan diuji. */
export function filmFrame(p: number, plan: FilmPlan): FilmFrame {
  const x = clamp01(Number.isFinite(p) ? p : 0);
  const { arrive, leave, minutes } = plan;
  const legs = leave.length;
  const last = arrive.length - 1;
  // Kamera: mendekat di pembuka, menjauh di penutup
  const k = x < FILM_SHAPE.intro ? easeInOut(x / FILM_SHAPE.intro) : x > 1 - FILM_SHAPE.outro ? easeInOut((1 - x) / FILM_SHAPE.outro) : 1;
  // Ruas & posisi mobil
  let leg = 0;
  let t = 0;
  let moving = false;
  for (let i = 0; i < legs; i += 1) {
    if (x >= leave[i]) {
      leg = i;
      moving = x < arrive[i + 1];
      t = moving ? easeInOut((x - leave[i]) / Math.max(1e-6, arrive[i + 1] - leave[i])) : 1;
    }
  }
  // Jam: selama singgah di perhentian i dari jam tiba ke jam berangkat (singgah panjang seperti makan siang dipercepat),
  // selama perjalanan dari jam berangkat ke jam tiba berikutnya → mobil baru bergerak setelah jam berangkatnya
  let clock = minutes[0] ?? 480;
  for (let i = 0; i < last; i += 1) {
    const depart = Math.min(minutes[i + 1], Math.max(minutes[i], plan.depart[i] ?? minutes[i]));
    if (x >= arrive[i]) clock = minutes[i] + (depart - minutes[i]) * clamp01((x - arrive[i]) / Math.max(1e-6, leave[i] - arrive[i]));
    if (x >= leave[i]) clock = depart + (minutes[i + 1] - depart) * clamp01((x - leave[i]) / Math.max(1e-6, arrive[i + 1] - leave[i]));
  }
  if (x >= arrive[last]) clock = minutes[last];
  // Perhentian aktif berganti sedikit sebelum tiba. Kartu tampil selama singgah, hanya saat kamera sudah dekat:
  // perhentian pertama setelah kamera hampir selesai mendekat, perhentian terakhir sampai kamera mulai menjauh
  // (akhir film = seluruh rute utuh tanpa kartu).
  let chapter = 0;
  for (let i = 0; i <= last; i += 1) if (x >= arrive[i] - 0.015) chapter = i;
  const from = chapter === 0 ? FILM_SHAPE.intro * 0.8 : arrive[chapter] - 0.008;
  const until = chapter < legs ? leave[chapter] + 0.005 : 1 - FILM_SHAPE.outro + 0.012;
  const dwell = x >= from && x <= until;
  return { leg, t, minutes: clock, k, chapter, dwell, moving };
}

/** Panjang 5 ruas rute contoh (polyline, unit peta). */
export const ROUTE_LENGTHS: readonly number[] = ROUTE_LEGS.map((leg) => polylineLength(leg.points));

/**
 * Jumlah ruas yang dipakai film untuk `stops` perhentian dari CMS (1–6): perhentian mengisi pin peta yang tetap
 * berurutan, jadi 3 perhentian = 2 ruas pertama; 6 perhentian = 5 ruas (ruas ke-5 kembali ke pin pertama).
 */
export const filmLegCount = (stops: number): number => Math.min(ROUTE_LEGS.length, Math.max(0, Math.floor(stops) - 1));

/** Seberapa jauh kamera "melihat ke depan" ke perhentian berikutnya saat mobil berjalan (di tengah ruas). */
export const LOOK_AHEAD = 0.45;

/**
 * Titik yang diikuti kamera saat mobil berjalan: bergeser dari mobil ke arah perhentian berikutnya, paling jauh di tengah
 * ruas (sin), nol saat berangkat dan tiba — tanpa lompatan, dan tujuan (mis. Seminyak di ruas pulang yang panjang)
 * sudah terlihat sebelum mobil tiba.
 */
export function lookAhead(point: readonly [number, number], next: readonly [number, number] | undefined, t: number, weight = LOOK_AHEAD): [number, number] {
  if (!next) return [point[0], point[1]];
  const w = weight * Math.sin(Math.PI * clamp01(t));
  return [point[0] + (next[0] - point[0]) * w, point[1] + (next[1] - point[1]) * w];
}

/**
 * Progres film (kontrak batch): `viewTop` = tepi atas area terlihat di bawah bilah lengket (px, koordinat layar),
 * `viewH` = tinggi area itu, `trackTop`/`trackHeight` = kotak jalur tinggi. p = (viewTop − trackTop) / (trackHeight −
 * viewH), dibatasi 0–1; jalur tidak lebih tinggi dari layar → 0. Dipakai ./hooks useFilmProgress, diuji terpisah.
 */
export function filmProgress(viewTop: number, viewH: number, trackTop: number, trackHeight: number): number {
  const range = trackHeight - viewH;
  if (!(range > 0) || !Number.isFinite(viewTop - trackTop)) return 0;
  return clamp01((viewTop - trackTop) / range);
}

// ─── Kamera film ──────────────────────────────────────────────────────────────

export interface FilmGeometry {
  /** Ukuran panggung (px) */
  width: number;
  height: number;
  /** Titik fokus kamera di panggung (px): mobil dijaga di titik ini */
  fx: number;
  fy: number;
  /** Skala peta saat seluruh rute terlihat (px per unit) */
  fit: number;
  /** Pembesaran saat mengikuti mobil (1,8 desktop, 1,3 HP & tablet) */
  zoom: number;
  /**
   * HP & tablet (kartu menempel di bawah, tidak terikat titik fokus): rentang layar mendatar (px) tempat rute + nama
   * perhentian dijaga utuh; kamera hanya bergeser mendatar sejauh itu masih muat. Layar lebar: null (kartu di samping pin).
   */
  keepX: readonly [number, number] | null;
}

/** Batas mendatar rute + nama perhentian di kiri/kanan pin (unit peta; label HP 36 unit). */
export const ROUTE_VIEW = { left: ROUTE_BOX.x - 190, right: ROUTE_BOX.x + ROUTE_BOX.w + 140 } as const;

/** Kotak rute + ruang napas (unit peta). */
export const ROUTE_FRAME = {
  x: ROUTE_BOX.x - ROUTE_BOX.w * 0.28,
  y: ROUTE_BOX.y - ROUTE_BOX.h * 0.1,
  w: ROUTE_BOX.w * 1.56,
  h: ROUTE_BOX.h * 1.2,
} as const;

/** Lebar panggung (px) mulai tata letak lebar film: kolom teks kiri + kartu di samping pin (= @5xl / 64rem di CSS). */
export const FILM_WIDE = 1024;

/**
 * Geometri kamera untuk panggung `width × height`. Lebar (≥ FILM_WIDE): kolom teks di kiri (peta disamarkan di sana,
 * ./pesiar.css .ps-cam-mask), peta di kanan (fokus 66% / tengah area peta); lebih sempit (HP, tablet): judul di atas
 * jalur film, di panggung hanya jam di atas (peta disamarkan di pita itu) dan kartu di bawah, fokus di tengah area peta.
 * `fit` memuat kotak rute di area peta.
 */
export function filmGeometry(width: number, height: number): FilmGeometry {
  const wide = width >= FILM_WIDE;
  // Area peta mulai di bawah pita jam (HP: jam 34–40px; tablet ≥ 768px: jam 64px)
  const top = width >= 768 ? 230 : 190;
  const area = wide
    ? { x: width * 0.36, y: 96, w: width * 0.6, h: Math.max(200, height - 96 - 112) }
    : { x: 16, y: top, w: width - 32, h: Math.max(200, height - top - 210) };
  const fit = Math.max(0.05, Math.min(area.w / ROUTE_FRAME.w, area.h / ROUTE_FRAME.h));
  return { width, height, fx: area.x + area.w / 2, fy: area.y + area.h / 2, fit, zoom: wide ? 1.8 : 1.3, keepX: wide ? null : [8, Math.max(8, width - 8)] };
}

export interface CameraState {
  /** Geser (px) */
  x: number;
  y: number;
  /** Skala (px per unit peta) */
  scale: number;
}

/**
 * Kamera di antara "seluruh rute" (k = 0) dan "ikuti mobil" (k = 1). HP & tablet (`geo.keepX`): geser mendatar
 * dibatasi agar rute + nama perhentian tetap utuh di layar (mis. "Seminyak" di ruas pulang tidak terpotong di tepi kiri);
 * bila tidak muat, kamera di tengah-tengahnya.
 */
export function cameraAt(geo: FilmGeometry, point: readonly [number, number], k: number): CameraState {
  const u = clamp01(k);
  const scale = geo.fit * (1 + (geo.zoom - 1) * u);
  const cx = ROUTE_FRAME.x + ROUTE_FRAME.w / 2;
  const cy = ROUTE_FRAME.y + ROUTE_FRAME.h / 2;
  let tx = cx + (point[0] - cx) * u;
  const ty = cy + (point[1] - cy) * u;
  if (geo.keepX) {
    const lo = ROUTE_VIEW.right - (geo.keepX[1] - geo.fx) / scale;
    const hi = ROUTE_VIEW.left + (geo.fx - geo.keepX[0]) / scale;
    tx = lo <= hi ? Math.min(hi, Math.max(lo, tx)) : (lo + hi) / 2;
  }
  return { x: geo.fx - tx * scale, y: geo.fy - ty * scale, scale };
}

// ─── Lain-lain ────────────────────────────────────────────────────────────────

/** Nomor HP Indonesia yang ditulis rapat ("081234567890") → "0812-3456-7890" untuk dibaca; format lain apa adanya. */
export const displayPhone = (raw: string): string => {
  const value = (raw || '').trim();
  return /^08\d{8,11}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8)}` : value;
};

export const pad2 = (n: number): string => String(n).padStart(2, '0');

export interface SocialLink {
  key: string;
  label: string;
  href: string;
}

export const socialLinks = (footer: SectionContent): SocialLink[] =>
  SOCIAL_FIELDS.map(({ key, label }) => ({ key, label, href: safeUrl(text(footer, key)) ?? '' })).filter((s) => s.href);

// ─── Model ────────────────────────────────────────────────────────────────────

export function readPesiar(content: SiteContent) {
  const section = (key: string) => getSection(content, key);
  const brand = section('brand');
  const hero = section('hero');
  const contact = section('contact');
  const footer = section('footer');
  const planner = section('planner');

  const companyName = text(brand, 'company_name') || 'Nama Usaha';
  const whatsapp = text(contact, 'whatsapp');
  const waLink = whatsappHref(whatsapp, text(contact, 'whatsapp_message'));
  const waAction: LinkAction | null = waLink ? { kind: 'external', href: waLink } : null;

  /** Section tampil & berisi di halaman (sectionShown). */
  const shown = (key: string): boolean => sectionShown(content, key);
  /** Item yang dirender untuk section `key` (sectionItems). */
  const items = (key: string): ListItem[] => sectionItems(key, section(key));
  const sectionAction = (key: string): LinkAction | null => (shown(key) ? { kind: 'section', target: key } : null);
  /** Tujuan "pesan": perencana, kalau tidak tur, kalau tidak kontak, kalau tidak WhatsApp. */
  const bookAction: LinkAction | null = sectionAction('planner') ?? sectionAction('tours') ?? sectionAction('contact') ?? waAction;
  /**
   * Isi field URL: "#rancang", "#bandara", "#kontak" dsb. hanya bila section itu tampil (anchor Indonesia
   * diterjemahkan); anchor tak dikenal / section tersembunyi / kosong → `fallback`.
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
  /** Section tampil berikutnya setelah `key` (tujuan "Lewati animasi"). */
  const nextShown = (key: string): string | null => {
    const start = PAGE_SECTIONS.indexOf(key as (typeof PAGE_SECTIONS)[number]);
    return PAGE_SECTIONS.slice(start + 1).find((k) => (k === 'footer' ? isEnabled(footer) : shown(k))) ?? null;
  };

  // Mobil dibaca walau section Mobil disembunyikan: harga perencana & bandara memakai daftar yang sama
  const cars = readCars(section('cars'));
  /** Nomor label section "01", "02" … menurut section yang tampil (hero & footer tidak bernomor). */
  const numbered = PAGE_SECTIONS.filter((k) => k !== 'hero' && k !== 'footer' && shown(k));
  const number = (key: string): string => {
    const i = numbered.indexOf(key as (typeof PAGE_SECTIONS)[number]);
    return i >= 0 ? pad2(i + 1) : '';
  };

  return {
    brand,
    hero,
    tours: section('tours'),
    planner,
    film: section('film'),
    transfer: section('transfer'),
    carsSection: section('cars'),
    included: section('included'),
    testimonials: section('testimonials'),
    faq: section('faq'),
    contact,
    footer,
    companyName,
    tagline: text(brand, 'tagline'),
    logo: text(brand, 'logo'),
    colors: pesiarVars(text(brand, 'accent_color')),
    whatsapp,
    waAction,
    bookAction,
    shown,
    items,
    sectionAction,
    linkOr,
    waWith,
    nextShown,
    number,
    tourList: shown('tours') ? readTours(section('tours')) : [],
    destinations: readDestinations(planner),
    settings: plannerSettings(planner),
    pickups: pickupAreas(text(planner, 'pickup_areas')),
    cars,
    zones: readZones(section('transfer')),
    stops: readFilmStops(section('film')),
    headerLabel: text(hero, 'header_label'),
    headerAction: linkOr(text(hero, 'header_url'), bookAction),
    nav: navItems(content),
    socials: socialLinks(footer),
    map: mapsInfo(text(contact, 'maps_url'), text(contact, 'maps_query') || text(contact, 'address')),
    year: new Date().getFullYear(),
  };
}

export type PesiarModel = ReturnType<typeof readPesiar>;
