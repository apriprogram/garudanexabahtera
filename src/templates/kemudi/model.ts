// Turunan konten Kemudi (fungsi murni, tanpa React): warna tema (teks aksen di abu, aksen terang di grafit, sisi
// terang/gelap bodi mobil SVG), section yang tampil + nomor label, menu, tujuan tautan, harga mobil (baca "450000" /
// "Rp450.000" / "450rb" / "1,1 jt", tulis "Rp450rb" / "Rp1,1 jt" / "Rp450.000"), kelas bodi mobil dari teks kelas,
// saringan armada, HITUNG SEWA (blok 24 jam, blok terakhir ≤ 12 jam memakai harga 12 jam; dengan sopir per blok 12
// jam), validasi tanggal & jam, pesan WhatsApp pemesanan, jendela progres film, zona antar, dan peta. Semua tahan
// konten mentah (null, angka, list rusak). Formulir hanya MENYUSUN pesan WhatsApp: tidak ada pembayaran online, tidak
// ada data yang dikirim ke server atau disimpan, ketersediaan & harga final dikonfirmasi admin.
import type { CSSProperties } from 'react';
import type { ListItem, SectionContent, SiteContent } from '../types';
import { SOCIAL_FIELDS } from '../shared/social';
import {
  contrast,
  field,
  getSection,
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
import { KEMUDI_ACCENT } from './defaultContent';

// ─── Warna ────────────────────────────────────────────────────────────────────

type Rgb = [number, number, number];
const WHITE: Rgb = [255, 255, 255];
/** Abu dingin pita B (#F2F4F7) */
export const GREY: Rgb = [242, 244, 247];
/** Tinta #0D1117 */
export const INK: Rgb = [13, 17, 23];
/** Grafit pita film & footer (#161B22) */
export const GRAPHITE: Rgb = [22, 27, 34];
const toHex = (rgb: Rgb) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
/** Campuran dibulatkan: kontras dihitung dari warna yang benar-benar ditulis sebagai hex. */
const mix = (a: Rgb, b: Rgb, amountOfA: number): Rgb => a.map((c, i) => Math.round(c * amountOfA + b[i] * (1 - amountOfA))) as Rgb;

const accentOf = (raw: string): Rgb => parseHex(raw) ?? (parseHex(KEMUDI_ACCENT) as Rgb);

/**
 * Variabel warna lokal Kemudi (di samping --tpl-accent* milik Shell), semuanya dari SATU warna tema:
 * --km-ink: teks aksen di putih & abu #F2F4F7 (harga, tautan, label), ≥ 4,5:1 di abu (berarti juga di putih);
 * --km-bright: aksen dicerahkan sampai ≥ 4,5:1 di grafit (teks/garis aksen di pita film & footer);
 * --km-body-hi / --km-body-lo: sisi terang (atap, cahaya dari kiri atas) dan sisi gelap (bawah) bodi mobil SVG.
 */
export function kemudiVars(accentRaw: string): CSSProperties {
  const accent = accentOf(accentRaw);
  let ink = accent;
  for (let i = 0; i < 24 && contrast(ink, GREY) < 4.5; i += 1) ink = mix(ink, INK, 0.85);
  let bright = accent;
  for (let i = 0; i < 24 && contrast(bright, GRAPHITE) < 4.5; i += 1) bright = mix(bright, WHITE, 0.85);
  return {
    '--km-ink': toHex(ink),
    '--km-bright': toHex(bright),
    '--km-body-hi': toHex(mix(accent, WHITE, 0.74)),
    '--km-body-lo': toHex(mix(accent, INK, 0.7)),
  } as CSSProperties;
}

// ─── Section di halaman ───────────────────────────────────────────────────────

/** Kunci section yang punya tempat di halaman (urutan halaman; = section skema tanpa `brand`). */
export const PAGE_SECTIONS = ['hero', 'fleet', 'film', 'pricing', 'requirements', 'delivery', 'steps', 'testimonials', 'faq', 'contact', 'footer'] as const;
const KNOWN_SECTIONS = new Set<string>(PAGE_SECTIONS);

/** Section berlabel bernomor "01  Mobil" (urutan halaman; nomor = urutan di antara yang tampil). */
const NUMBERED = ['fleet', 'film', 'pricing', 'requirements', 'delivery', 'steps', 'testimonials', 'faq', 'contact'];

/** [kunci list, maks. item (= skema), syarat item dirender] per section. Satu sumber untuk komponen, menu, nomor. */
const ITEMS: Record<string, [listKey: string, max: number, keep: (item: ListItem) => boolean]> = {
  fleet: ['items', 12, (i) => !!field(i, 'name')],
  film: ['chapters', 4, (i) => !!field(i, 'title')],
  delivery: ['zones', 6, (i) => !!field(i, 'name')],
  steps: ['items', 5, (i) => !!field(i, 'title')],
  testimonials: ['items', 6, (i) => !!field(i, 'quote')],
  faq: ['items', 8, (i) => !!field(i, 'question')],
};

/** Item yang dirender untuk section `key` (lihat ITEMS); section tanpa daftar → []. */
export function sectionItems(key: string, section: SectionContent): ListItem[] {
  const rule = ITEMS[key];
  return rule ? list(section, rule[0], rule[1]).filter(rule[2]) : [];
}

/** Dokumen & aturan syarat sewa per layanan (lepas kunci `self_…`, dengan sopir `driver_…`). */
export function requirementLists(section: SectionContent, prefix: 'self' | 'driver'): { docs: ListItem[]; rules: string[] } {
  return {
    docs: list(section, `${prefix}_docs`, 6).filter((i) => !!field(i, 'title')),
    rules: list(section, `${prefix}_rules`, 6)
      .map((i) => field(i, 'text'))
      .filter(Boolean),
  };
}

/** Section tampil dan berisi? Kunci yang tidak dikenal (mis. salah ketik di field URL) → false. */
export function sectionShown(content: SiteContent, key: string): boolean {
  if (!KNOWN_SECTIONS.has(key)) return false;
  const s = getSection(content, key);
  if (!isEnabled(s)) return false;
  if (key in ITEMS) return sectionItems(key, s).length > 0;
  if (key === 'pricing') return readFleet(getSection(content, 'fleet')).some((car) => car.p12 > 0 || car.p24 > 0 || car.driver > 0);
  if (key === 'requirements') {
    return (['self', 'driver'] as const).some((prefix) => {
      const { docs, rules } = requirementLists(s, prefix);
      return docs.length + rules.length > 0;
    });
  }
  // hero, contact, footer
  return true;
}

/** Nomor label section ("01") di antara section bernomor yang tampil; tidak bernomor/tersembunyi → "". */
export function sectionIndex(content: SiteContent, key: string): string {
  const shown = NUMBERED.filter((k) => sectionShown(content, k));
  const i = shown.indexOf(key);
  return i < 0 ? '' : String(i + 1).padStart(2, '0');
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

export interface KemudiNavItem {
  key: string;
  label: string;
}

/** Menu singkat (label = kata benda pendek seperti label section). */
const NAV: KemudiNavItem[] = [
  { key: 'fleet', label: 'Mobil' },
  { key: 'pricing', label: 'Harga' },
  { key: 'requirements', label: 'Syarat' },
  { key: 'steps', label: 'Cara Sewa' },
  { key: 'faq', label: 'FAQ' },
  { key: 'contact', label: 'Kontak' },
];

/** Menu hanya untuk section yang benar-benar tampil (tanpa tautan mati). */
export function navItems(content: SiteContent): KemudiNavItem[] {
  return NAV.filter(({ key }) => sectionShown(content, key));
}

// ─── Tujuan tautan "#…" ───────────────────────────────────────────────────────

/** Anchor berbahasa Indonesia yang wajar diketik pembeli → kunci section. */
const ANCHOR_ALIASES: Record<string, string> = {
  mobil: 'fleet',
  armada: 'fleet',
  'pilih-mobil': 'fleet',
  pesan: 'hero',
  booking: 'hero',
  proses: 'film',
  harga: 'pricing',
  tarif: 'pricing',
  syarat: 'requirements',
  persyaratan: 'requirements',
  antar: 'delivery',
  'antar-jemput': 'delivery',
  zona: 'delivery',
  'cara-sewa': 'steps',
  langkah: 'steps',
  ulasan: 'testimonials',
  'tanya-jawab': 'faq',
  garasi: 'contact',
  lokasi: 'contact',
};

/** Target tautan section ("mobil", "fleet", "kontak") → kunci section di halaman, atau null bila tidak dikenal. */
export function sectionTarget(target: string): string | null {
  const clean = sectionFromAnchor(target);
  const key = ANCHOR_ALIASES[clean] ?? clean;
  return KNOWN_SECTIONS.has(key) ? key : null;
}

// ─── Angka & harga ────────────────────────────────────────────────────────────

/** "1.450.000" (pemisah ribuan titik). */
export const groupThousands = (n: number): string => {
  const value = Math.round(Math.abs(n));
  return `${n < 0 ? '-' : ''}${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};

/** "Rp450.000" */
export const formatRupiah = (n: number): string => `Rp${groupThousands(n)}`;

/** Desimal Indonesia dengan maks. `digits` angka di belakang koma, nol di belakang dibuang: 1.25 → "1,25". */
export const formatDecimal = (n: number, digits = 2): string => {
  const [whole, frac = ''] = (Math.round(n * 10 ** digits) / 10 ** digits).toFixed(digits).split('.');
  const trimmed = frac.replace(/0+$/, '');
  return `${groupThousands(Number(whole))}${trimmed ? `,${trimmed}` : ''}`;
};

/** Spasi tak terputus antara angka dan satuan ("Rp1,1 jt" tidak terbelah di akhir baris). */
export const NBSP = String.fromCharCode(160);

/** Harga singkat kartu: ≥ 1 juta → "Rp1,1 jt", ribuan bulat → "Rp450rb", selain itu rupiah penuh; 0 / tidak valid → "". */
export function formatPriceShort(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n >= 1e6) return `Rp${formatDecimal(n / 1e6, 2)}${NBSP}jt`;
  if (n % 1000 === 0) return `Rp${n / 1000}rb`;
  return formatRupiah(n);
}

const UNIT_SCALE: Record<string, number> = { jt: 1e6, juta: 1e6, rb: 1e3, ribu: 1e3, k: 1e3 };

/**
 * Harga dari CMS → rupiah. Hanya angka PERTAMA yang dibaca; teks sesudahnya diabaikan ("450rb/hari", "450 ribu per
 * hari", "Rp 1,1 jt/hari", "450.000 / 24 jam"). Angka biasa ("450000", "Rp450.000", "Rp 450.000,-") = rupiah; dengan
 * satuan ("450rb", "1,1 jt", "1.5 juta") = desimal × satuan. Tidak terbaca / kosong → 0 (harga tidak tersedia). Maks.
 * 12 digit.
 */
export function parsePrice(raw: string | number | null | undefined): number {
  const value = String(raw ?? '').trim();
  const start = value.search(/\d/);
  if (start < 0) return 0;
  const rest = value.slice(start);
  const withUnit = /^(\d[\d.,]*)\s*(jt|juta|rb|ribu|k)(?![a-z])/i.exec(rest);
  if (withUnit) {
    const n = Number.parseFloat(withUnit[1].replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? Math.round(n * UNIT_SCALE[withUnit[2].toLowerCase()]) : 0;
  }
  // Ribuan berkelompok ("450.000", "1.250.000", "450 000") atau angka rapat; desimal ",00" / ",-" dibuang
  const amount = /^(\d{1,3}(?:[., ]\d{3})+|\d+)/.exec(rest)?.[1] ?? '';
  const digits = amount.replace(/\D/g, '').slice(0, 12);
  return digits ? Number(digits) : 0;
}

// ─── Armada ───────────────────────────────────────────────────────────────────

/** Siluet mobil SVG per kelas (`mpv-compact` = MPV ringkas: atap lebih rendah, lebih pendek). */
export type BodyKind = 'city' | 'mpv' | 'mpv-compact' | 'suv' | 'premium' | 'minibus';

/** Urutan penting: aturan yang lebih khusus di atas (MPV premium / MPV ringkas sebelum city car & MPV). */
const BODY_RULES: [RegExp, BodyKind][] = [
  [/mini ?bus|micro ?bus|van besar|1[0-9] kursi|rombongan/i, 'minibus'],
  [/premium|vip|eksekutif|executive|luxury|mewah/i, 'premium'],
  [/\bsuv\b|4x4|4wd|off-?road|jeep|double cabin/i, 'suv'],
  [/(compact|kompak|low) ?mpv|mpv ?(compact|kompak|hemat|ringkas)/i, 'mpv-compact'],
  [/city|hatch|kecil|compact|sedan|lcgc|5 kursi/i, 'city'],
  [/mpv|keluarga|family|7 kursi|8 kursi/i, 'mpv'],
];

/** Kata yang menandai MPV ringkas/hemat di kelas ATAU nama ("MPV" + "MPV hemat" → dua siluet MPV yang berbeda). */
const COMPACT_MPV = /hemat|ekonomis|irit|ringkas|kompak|compact|low ?mpv|5\s*\+\s*2/i;

/** Kelas bodi dari teks kelas (+ nama sebagai cadangan); tidak cocok → MPV. MPV bernama "hemat" dsb. → MPV ringkas. */
export function bodyKind(cls: string, name = ''): BodyKind {
  const kind = BODY_RULES.find(([pattern]) => pattern.test(cls || ''))?.[1] ?? BODY_RULES.find(([pattern]) => pattern.test(name || ''))?.[1] ?? 'mpv';
  return kind === 'mpv' && COMPACT_MPV.test(`${cls || ''} ${name || ''}`) ? 'mpv-compact' : kind;
}

export interface FleetCar {
  /** Urutan di CMS (kunci React & isian "Mobil") */
  index: number;
  name: string;
  /** Teks kelas apa adanya (chip saringan), mis. "MPV" */
  cls: string;
  kind: BodyKind;
  seats: string;
  transmission: string;
  fuel: string;
  luggage: string;
  /** Rupiah; 0 = tidak tersedia */
  p12: number;
  p24: number;
  driver: number;
  /** Teks bebas kolom luar kota, mis. "+Rp75.000/hari" */
  out: string;
  image: string;
}

export function readFleet(section: SectionContent): FleetCar[] {
  return sectionItems('fleet', section).map((item, index) => {
    const name = field(item, 'name');
    const cls = field(item, 'class');
    return {
      index,
      name,
      cls,
      kind: bodyKind(cls, name),
      seats: field(item, 'seats'),
      transmission: field(item, 'transmission'),
      fuel: field(item, 'fuel'),
      luggage: field(item, 'luggage'),
      p12: parsePrice(field(item, 'price_12')),
      p24: parsePrice(field(item, 'price_24')),
      driver: parsePrice(field(item, 'price_driver')),
      out: field(item, 'price_out'),
      image: field(item, 'image'),
    };
  });
}

export type RentalMode = 'self' | 'driver';

export const MODES: { key: RentalMode; label: string }[] = [
  { key: 'self', label: 'Lepas kunci' },
  { key: 'driver', label: 'Dengan sopir' },
];

export const modeLabel = (mode: RentalMode): string => MODES.find((m) => m.key === mode)?.label ?? '';

/** Harga layanan ini terisi? Lepas kunci = harga 24 jam; dengan sopir = harga sopir per 12 jam. */
export const pricedFor = (car: FleetCar, mode: RentalMode): boolean => (mode === 'self' ? car.p24 > 0 : car.driver > 0);

/**
 * Mobil "harga via admin": tanpa harga lepas kunci 24 jam DAN tanpa harga sopir (kolom harga dikosongkan di CMS). Boleh
 * dipesan di kedua layanan; kartu menulis "Harga via admin", kartu pesan tanpa perkiraan, pesan WhatsApp menanyakan harga.
 */
export const unpriced = (car: FleetCar): boolean => !pricedFor(car, 'self') && !pricedFor(car, 'driver');

/**
 * Layanan tersedia untuk mobil ini? Ada harga layanan itu (lepas kunci 24 jam / sopir per 12 jam), atau mobil tanpa harga
 * sama sekali (harga via admin). Mobil yang hanya berharga di satu layanan = khusus layanan itu.
 */
export const supports = (car: FleetCar | undefined, mode: RentalMode): boolean => !!car && (pricedFor(car, mode) || unpriced(car));

/** "7 kursi" dari isian angka ("7") atau teks bebas ("7 kursi") apa adanya. */
export const seatsLabel = (seats: string): string => (/^\d+$/.test(seats.trim()) ? `${seats.trim()} kursi` : seats.trim());
/** "3 koper" dari isian angka, teks bebas apa adanya. */
export const luggageLabel = (luggage: string): string => (/^\d+$/.test(luggage.trim()) ? `${luggage.trim()} koper` : luggage.trim());

/** "MPV keluarga, 7 kursi" (kursi tidak diulang bila sudah ada di nama). */
export const carLabel = (car: FleetCar): string => {
  const seats = seatsLabel(car.seats);
  return seats && !/kursi/i.test(car.name) ? `${car.name}, ${seats}` : car.name;
};

/** Chip spesifikasi kartu (kosong dibuang). */
export const carSpecs = (car: FleetCar): { key: 'seats' | 'transmission' | 'fuel' | 'luggage'; label: string }[] =>
  (
    [
      { key: 'seats', label: seatsLabel(car.seats) },
      { key: 'transmission', label: car.transmission },
      { key: 'fuel', label: car.fuel },
      { key: 'luggage', label: luggageLabel(car.luggage) },
    ] as const
  ).filter((s) => s.label);

/** Kelas unik untuk chip saringan (urutan kemunculan; beda huruf besar-kecil dianggap sama) + jumlah mobil. */
export function fleetClasses(cars: FleetCar[]): { label: string; count: number }[] {
  const seen = new Map<string, { label: string; count: number }>();
  for (const car of cars) {
    const key = car.cls.trim().toLowerCase();
    if (!key) continue;
    const entry = seen.get(key);
    if (entry) entry.count += 1;
    else seen.set(key, { label: car.cls.trim(), count: 1 });
  }
  return Array.from(seen.values());
}

/** Mobil di kelas `cls` ('' = semua; tanpa beda huruf besar-kecil). */
export const filterFleet = (cars: FleetCar[], cls: string): FleetCar[] =>
  cls ? cars.filter((car) => car.cls.trim().toLowerCase() === cls.trim().toLowerCase()) : cars;

/**
 * Kolom kartu armada di layar sangat lebar (≥ 1920px): 4, kecuali bila 3 kolom menyisakan lebih sedikit tempat kosong di
 * baris terakhir (3, 5, 6, 9 mobil → 3 kolom penuh; 7, 8, 10–12 → 4).
 */
export function fleetColumns(n: number): 3 | 4 {
  const count = Math.max(1, Math.floor(n) || 1);
  const holes = (cols: number) => (cols - (count % cols)) % cols;
  return holes(3) < holes(4) ? 3 : 4;
}

/** "6 mobil" / "Tidak ada mobil di kelas ini". */
export const fleetCount = (n: number): string => (n === 0 ? 'Tidak ada mobil di kelas ini' : `${n} mobil`);

// ─── Tanggal & jam ────────────────────────────────────────────────────────────

/** Pilihan jam ambil/kembali (per jam, 06.00–22.00). */
export const HOURS: readonly string[] = Array.from({ length: 17 }, (_, i) => `${String(i + 6).padStart(2, '0')}.00`);

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const DAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** "2026-11-14" → Date UTC tengah malam, atau null bila bukan tanggal yang ada. */
const parseIsoDate = (iso: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((iso || '').trim());
  if (!m) return null;
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return date.getUTCMonth() === Number(m[2]) - 1 && date.getUTCDate() === Number(m[3]) ? date : null;
};

/** "09.00" / "9:30" → menit sejak tengah malam; tidak valid → null. */
export const parseTime = (raw: string): number | null => {
  const m = /^(\d{1,2})[.:](\d{2})$/.exec((raw || '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h < 24 && min < 60 ? h * 60 + min : null;
};

/** Tanggal + jam → menit sejak epoch (jam dinding lokal, tanpa zona waktu); tidak valid → null. */
export function stamp(date: string, time: string): number | null {
  const d = parseIsoDate(date);
  const t = parseTime(time);
  return d && t !== null ? d.getTime() / 60000 + t : null;
}

/** Menit sejak epoch untuk jam dinding lokal `now` (dibandingkan dengan stamp()). */
export const nowStamp = (now: Date): number => Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes()) / 60000;

/** Tanggal lokal "YYYY-MM-DD" dari Date (+ geser `days` hari). */
export const isoDate = (now: Date, days = 0): string => {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** "2026-10-30" → "Jumat, 30 Oktober 2026"; tidak valid → "". */
export function formatLongDate(iso: string): string {
  const date = parseIsoDate(iso);
  return date ? `${DAYS[date.getUTCDay()]}, ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}` : '';
}

/** "2026-10-30" → "Jum, 30 Okt"; tidak valid → "". */
export function formatShortDate(iso: string): string {
  const date = parseIsoDate(iso);
  return date ? `${DAYS_SHORT[date.getUTCDay()]}, ${date.getUTCDate()} ${MONTHS_SHORT[date.getUTCMonth()]}` : '';
}

/** Lama sewa: 2880 → "2 hari", 2160 → "1 hari 12 jam", 630 → "10 jam 30 menit". */
export function durationLabel(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const d = Math.floor(total / 1440);
  const h = Math.floor((total % 1440) / 60);
  const m = total % 60;
  return [d && `${d} hari`, h && `${h} jam`, m && `${m} menit`].filter(Boolean).join(' ') || '0 jam';
}

/** "48 jam" / "12,5 jam" (jam total untuk pesan). */
export const hoursLabel = (minutes: number): string => `${formatDecimal(minutes / 60, 1)} jam`;

// ─── Hitung sewa ──────────────────────────────────────────────────────────────

/** Sewa terpanjang yang dihitung di website (lebih lama → hubungi admin). */
export const MAX_DAYS = 30;

export interface Quote {
  mode: RentalMode;
  minutes: number;
  /** Lepas kunci: jumlah blok 24 jam yang dihitung (termasuk blok terakhir) */
  days: number;
  /** Lepas kunci: blok yang dibayar dengan harga 24 jam */
  full: number;
  /** Lepas kunci: blok terakhir (≤ 12 jam) dibayar dengan harga 12 jam */
  half: boolean;
  /** Dengan sopir: jumlah blok 12 jam */
  blocks: number;
  total: number;
  /** Rincian singkat, mis. "1 hari × Rp450.000 + 12 jam Rp350.000" */
  breakdown: string;
  /** Lama sewa, mis. "1 hari 12 jam" */
  duration: string;
}

/**
 * Perkiraan harga sewa untuk `minutes` menit (≥ 1). Lepas kunci: hari = ceil(jam / 24); bila blok terakhir ≤ 12 jam
 * dan harga 12 jam ada (dan lebih murah dari harga 24 jam), blok itu dihitung harga 12 jam. Dengan sopir: blok =
 * ceil(jam / 12) × harga sopir per 12 jam. Layanan tanpa harga (juga mobil "harga via admin") atau durasi ≤ 0 → null.
 */
export function quoteRental(car: FleetCar | undefined, mode: RentalMode, minutes: number): Quote | null {
  if (!car || !Number.isFinite(minutes) || minutes <= 0 || !pricedFor(car, mode)) return null;
  const duration = durationLabel(minutes);
  if (mode === 'driver') {
    const blocks = Math.ceil(minutes / 720);
    return { mode, minutes, days: 0, full: 0, half: false, blocks, total: blocks * car.driver, breakdown: `${blocks} blok 12 jam × ${formatRupiah(car.driver)}`, duration };
  }
  const days = Math.ceil(minutes / 1440);
  const last = minutes - (days - 1) * 1440;
  const half = last <= 720 && car.p12 > 0 && car.p12 < car.p24;
  const full = half ? days - 1 : days;
  const total = full * car.p24 + (half ? car.p12 : 0);
  const parts = [full > 0 && `${full} hari × ${formatRupiah(car.p24)}`, half && `12 jam ${formatRupiah(car.p12)}`].filter(Boolean);
  return { mode, minutes, days, full, half, blocks: 0, total, breakdown: parts.join(' + '), duration };
}

// ─── Formulir pesan mobil (hero) ──────────────────────────────────────────────

export interface Booking {
  mode: RentalMode;
  /** Indeks mobil di armada (FleetCar.index); -1 = belum ada mobil */
  car: number;
  pickupDate: string;
  pickupTime: string;
  returnDate: string;
  returnTime: string;
}

export type BookingErrors = Partial<Record<'car' | 'pickup' | 'return', string>>;

/** Mobil pertama yang mendukung `mode`, utamakan kelas MPV (contoh harga paling umum); tidak ada → -1. */
export function firstCar(cars: FleetCar[], mode: RentalMode): number {
  const ok = cars.filter((car) => supports(car, mode));
  return (ok.find((car) => car.kind === 'mpv') ?? ok[0])?.index ?? -1;
}

/**
 * Isian awal: ambil besok 09.00, kembali lusa+1 09.00 (2 hari), lepas kunci bila ada mobil lepas kunci, mobil MPV
 * pertama. Tanpa mobil → car -1.
 */
export function defaultBooking(cars: FleetCar[], now: Date = new Date()): Booking {
  const mode: RentalMode = cars.some((car) => supports(car, 'self')) || !cars.some((car) => supports(car, 'driver')) ? 'self' : 'driver';
  const car = firstCar(cars, mode);
  return { mode, car: car >= 0 ? car : (cars[0]?.index ?? -1), pickupDate: isoDate(now, 1), pickupTime: '09.00', returnDate: isoDate(now, 3), returnTime: '09.00' };
}

/** Ganti layanan; mobil yang tidak mendukung layanan baru diganti mobil pertama yang mendukung (bila ada). */
export function withMode(booking: Booking, mode: RentalMode, cars: FleetCar[]): Booking {
  const current = cars.find((car) => car.index === booking.car);
  if (supports(current, mode)) return { ...booking, mode };
  const next = firstCar(cars, mode);
  return { ...booking, mode, car: next >= 0 ? next : booking.car };
}

/** Pilih mobil `index` (tombol "Pesan" di kartu); layanan diganti bila mobil itu tidak mendukung layanan sekarang. */
export function withCar(booking: Booking, index: number, cars: FleetCar[]): Booking {
  const car = cars.find((c) => c.index === index);
  if (!car) return booking;
  const mode = supports(car, booking.mode) ? booking.mode : booking.mode === 'self' ? 'driver' : 'self';
  return { ...booking, car: index, mode: supports(car, mode) ? mode : booking.mode };
}

/** Lama sewa dalam menit (kembali − ambil); isian tidak valid → null. */
export function bookingMinutes(b: Booking): number | null {
  const from = stamp(b.pickupDate, b.pickupTime);
  const to = stamp(b.returnDate, b.returnTime);
  return from === null || to === null ? null : to - from;
}

/** Pesan galat per isian (kosong = valid). Waktu ambil tidak boleh sebelum `now`; maks. 30 hari. */
export function validateBooking(b: Booking, cars: FleetCar[], now: Date = new Date()): BookingErrors {
  const errors: BookingErrors = {};
  const car = cars.find((c) => c.index === b.car);
  if (!car) errors.car = 'Pilih mobil.';
  else if (!supports(car, b.mode)) errors.car = b.mode === 'self' ? 'Mobil ini khusus dengan sopir.' : 'Mobil ini belum tersedia dengan sopir.';
  const from = stamp(b.pickupDate, b.pickupTime);
  const to = stamp(b.returnDate, b.returnTime);
  if (!b.pickupDate) errors.pickup = 'Pilih tanggal ambil.';
  else if (!parseIsoDate(b.pickupDate)) errors.pickup = 'Tanggal tidak valid.';
  else if (from === null) errors.pickup = 'Pilih jam ambil.';
  else if (from < nowStamp(now)) errors.pickup = 'Waktu ambil sudah lewat.';
  if (!b.returnDate) errors.return = 'Pilih tanggal kembali.';
  else if (!parseIsoDate(b.returnDate)) errors.return = 'Tanggal tidak valid.';
  else if (to === null) errors.return = 'Pilih jam kembali.';
  else if (from !== null && to <= from) errors.return = 'Waktu kembali harus setelah waktu ambil.';
  else if (from !== null && to - from < 60) errors.return = 'Minimal sewa 1 jam.';
  else if (from !== null && to - from > MAX_DAYS * 1440) errors.return = `Lebih dari ${MAX_DAYS} hari? Hubungi admin lewat WhatsApp.`;
  return errors;
}

/** Urutan isian yang divalidasi (fokus ke galat pertama). */
export const BOOKING_FIELDS: (keyof BookingErrors)[] = ['car', 'pickup', 'return'];

/**
 * Pesan WhatsApp pemesanan: salam, baris kosong, rincian, baris kosong, penutup. Tanpa perkiraan (mobil "harga via
 * admin") → tanpa baris durasi & harga, penutup menanyakan harga.
 */
export function bookingMessage(b: Booking, car: FleetCar, quote: Quote | null, company: string): string {
  const name = company.trim();
  const rows = [
    `Mobil: ${carLabel(car)} (atau setara)`,
    `Layanan: ${modeLabel(b.mode)}`,
    `Ambil: ${formatLongDate(b.pickupDate)}, ${b.pickupTime}`,
    `Kembali: ${formatLongDate(b.returnDate)}, ${b.returnTime}`,
    quote && `Durasi: ${quote.duration} (${hoursLabel(quote.minutes)})`,
    quote && `Perkiraan harga: ${formatRupiah(quote.total)} (${quote.breakdown})`,
  ].filter(Boolean);
  const closing = quote ? 'Mohon info ketersediaan. Terima kasih.' : 'Mohon info harga & ketersediaan. Terima kasih.';
  return `${name ? `Halo ${name}, saya` : 'Halo, saya'} ingin sewa mobil.\n\n${rows.join('\n')}\n\n${closing}`;
}

// ─── Film (gulir = video) ─────────────────────────────────────────────────────

/**
 * Batas babak film: gambar garis → isi warna & cek → keterangan → mobil berangkat. Bab "Jalan" mulai 0,78, sedikit
 * sebelum mobil melaju (0,8): teksnya sudah terbaca saat mobil bergerak, bukan di tengah pergantian teks.
 */
export const FILM_PHASES = [0, 0.3, 0.5, 0.78, 1] as const;
/** Babak keterangan (callout) di dalam film. */
export const CALLOUT_SPAN = [0.5, 0.8] as const;

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

/**
 * Progres film 0–1 dari posisi gulir: `viewTop`/`viewHeight` = tepi atas & tinggi area terlihat di bawah bilah lengket,
 * `trackTop`/`trackHeight` = tepi atas (getBoundingClientRect) & tinggi trek. 0 saat trek baru menyentuh tepi atas area
 * terlihat, 1 saat ujung bawah trek sampai di tepi bawahnya; trek tidak lebih tinggi dari area terlihat → 0.
 */
export function filmProgress(viewTop: number, viewHeight: number, trackTop: number, trackHeight: number): number {
  const span = trackHeight - viewHeight;
  return span > 0 ? clamp01((viewTop - trackTop) / span) : 0;
}

/** Jendela progres [awal, akhir] per bab: 4 bab = babak film; jumlah lain = dibagi rata. */
export function chapterWindows(n: number): [number, number][] {
  const count = Math.max(0, Math.floor(n));
  if (count === 4) return [0, 1, 2, 3].map((i) => [FILM_PHASES[i], FILM_PHASES[i + 1]]);
  return Array.from({ length: count }, (_, i) => [i / count, (i + 1) / count]);
}

/** Bab yang aktif di progres `p` (0–1) dari `n` bab; tanpa bab → -1. */
export function chapterAt(p: number, n: number): number {
  const windows = chapterWindows(n);
  if (windows.length === 0) return -1;
  const v = clamp01(p);
  const i = windows.findIndex(([, end]) => v < end);
  return i < 0 ? windows.length - 1 : i;
}

/** Jendela progres per keterangan (dibagi rata di babak 0,5–0,8). */
export function calloutWindows(n: number): [number, number][] {
  const count = Math.max(0, Math.floor(n));
  const [a, b] = CALLOUT_SPAN;
  return Array.from({ length: count }, (_, i) => [a + ((b - a) * i) / count, a + ((b - a) * (i + 1)) / count]);
}

/** Jumlah item pemeriksaan yang sudah "dicek" di HUD (0–12) pada progres p (babak cek 0,30–0,48). */
export const CHECK_TOTAL = 12;
export const checkCount = (p: number): number => Math.round(clamp01((p - 0.3) / 0.18) * CHECK_TOTAL);

/**
 * Panggung film terlalu pendek untuk video (HP mendatar, jendela sangat pendek): di bawah tinggi ini film tampil sebagai
 * storyboard diam (seperti kurangi gerak), karena mobil tidak lagi muat di samping judul, keterangan, dan bab.
 */
export const FILM_MIN_STAGE = 480;

// ─── Antar-jemput ─────────────────────────────────────────────────────────────

export interface Zone {
  index: number;
  name: string;
  detail: string;
  fee: string;
  free: boolean;
  image: string;
}

export function readZones(section: SectionContent): Zone[] {
  return sectionItems('delivery', section).map((item, index) => {
    const fee = field(item, 'fee');
    return { index, name: field(item, 'name'), detail: field(item, 'detail'), fee, free: /gratis|free/i.test(fee), image: field(item, 'image') };
  });
}

// ─── Lain-lain ────────────────────────────────────────────────────────────────

/** Nomor HP Indonesia yang ditulis rapat ("081234567890") → "0812-3456-7890" untuk dibaca; format lain apa adanya. */
export const displayPhone = (raw: string): string => {
  const value = (raw || '').trim();
  return /^08\d{8,11}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8)}` : value;
};

/** Bintang ulasan 1–5 dari CMS; kosong/tidak valid → 0 (tanpa bintang). */
export const ratingOf = (raw: string): number => {
  const n = Number.parseInt((raw || '').trim(), 10);
  return Number.isFinite(n) && n >= 1 && n <= 5 ? n : 0;
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

export function readKemudi(content: SiteContent) {
  const section = (key: string) => getSection(content, key);
  const brand = section('brand');
  const hero = section('hero');
  const fleet = section('fleet');
  const contact = section('contact');
  const footer = section('footer');

  const companyName = text(brand, 'company_name') || 'Nama Rental';
  const whatsapp = text(contact, 'whatsapp');
  const waLink = whatsappHref(whatsapp, text(contact, 'whatsapp_message'));
  const waAction: LinkAction | null = waLink ? { kind: 'external', href: waLink } : null;

  /** Section tampil & berisi di halaman (sectionShown). */
  const shown = (key: string): boolean => sectionShown(content, key);
  /** Item yang dirender untuk section `key` (sectionItems). */
  const items = (key: string): ListItem[] => sectionItems(key, section(key));
  const sectionAction = (key: string): LinkAction | null => (shown(key) ? { kind: 'section', target: key } : null);
  /** Semua mobil dari CMS (urutan CMS), juga bila section armada disembunyikan: tabel harga & formulir hero memakainya */
  const cars = readFleet(fleet);
  /** Tujuan "Pesan Mobil": kartu pesan di hero (hanya bila ada mobil), kalau tidak Kontak, kalau tidak WhatsApp. */
  const bookAction: LinkAction | null = (cars.length > 0 ? sectionAction('hero') : null) ?? sectionAction('contact') ?? waAction;
  /**
   * Isi field URL: "#mobil", "#harga", "#kontak" dsb. hanya bila section itu tampil (anchor Indonesia diterjemahkan);
   * anchor tak dikenal / section tersembunyi / kosong → `fallback`.
   */
  const linkOr = (raw: string, fallback: LinkAction | null): LinkAction | null => {
    const action = resolveAction(raw, fallback);
    if (action?.kind !== 'section') return action;
    const target = sectionTarget(action.target);
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
    fleet,
    film: section('film'),
    pricing: section('pricing'),
    requirements: section('requirements'),
    delivery: section('delivery'),
    steps: section('steps'),
    testimonials: section('testimonials'),
    faq: section('faq'),
    contact,
    footer,
    companyName,
    tagline: text(brand, 'tagline'),
    logo: text(brand, 'logo'),
    colors: kemudiVars(text(brand, 'accent_color')),
    whatsapp,
    waAction,
    bookAction,
    shown,
    items,
    sectionAction,
    linkOr,
    waWith,
    /** Nomor label "01" section (kosong bila tidak bernomor/tersembunyi) */
    index: (key: string): string => sectionIndex(content, key),
    cars,
    zones: shown('delivery') ? readZones(section('delivery')) : [],
    headerLabel: text(hero, 'header_label'),
    headerAction: linkOr(text(hero, 'header_url'), bookAction),
    nav: navItems(content),
    socials: socialLinks(footer),
    map: mapsInfo(text(contact, 'maps_url'), text(contact, 'maps_query') || text(contact, 'address')),
    year: new Date().getFullYear(),
  };
}

export type KemudiModel = ReturnType<typeof readKemudi>;
