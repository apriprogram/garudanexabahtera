// Turunan konten Nusaline (fungsi murni, tanpa React): warna tema (neon di atas midnight, teks aksen di pita terang),
// section yang tampil, menu, tujuan tautan, jam & durasi ("19.00", "12j 30m"), jadwal keberangkatan (tiba + "+1" dihitung
// dari jam berangkat + durasi), saringan rute/kelas, formulir cari jadwal (validasi) → pesan WhatsApp, denah kursi
// (dibuat dari konfigurasi kelas "2-2" / "2-1" / "1-1" + jumlah kursi), garis waktu film (jam 19.00 → 07.00 melewati
// tengah malam, jarak km, bus berhenti saat naik, istirahat, dan tiba), titik naik per kota, dan papan keberangkatan
// mini. Semua tahan konten mentah (null, angka, list rusak). Formulir hanya MENYUSUN pesan WhatsApp: tidak ada pembayaran
// online, e-tiket, pilihan kursi real-time, atau data yang dikirim/disimpan di website.
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
import { NUSALINE_ACCENT } from './defaultContent';

// ─── Warna ────────────────────────────────────────────────────────────────────

type Rgb = [number, number, number];
const WHITE: Rgb = [255, 255, 255];
/** Midnight #0B1026: latar hero, film, footer (tetap, tidak ikut warna tema) */
export const MIDNIGHT: Rgb = [11, 16, 38];
/** Pita terang #F2F4FA */
export const BAND: Rgb = [242, 244, 250];
/** Tinta #0E1230 */
const INK: Rgb = [14, 18, 48];
const toHex = (rgb: Rgb) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
/** Campuran dibulatkan: kontras dihitung dari warna yang benar-benar ditulis sebagai hex. */
const mix = (a: Rgb, b: Rgb, amountOfA: number): Rgb => a.map((c, i) => Math.round(c * amountOfA + b[i] * (1 - amountOfA))) as Rgb;
/** Kartu gelap paling terang yang dipakai (putih 8% di atas midnight) */
export const NIGHT_CARD: Rgb = mix(WHITE, MIDNIGHT, 0.08);

const accentOf = (raw: string): Rgb => parseHex(raw) ?? (parseHex(NUSALINE_ACCENT) as Rgb);

/**
 * Variabel warna lokal Nusaline (di samping --tpl-accent* milik Shell), dari SATU warna tema:
 * --nl-neon: warna tema dicerahkan sampai ≥ 5:1 di kartu gelap (putih 8% di atas midnight) → teks aksen di latar gelap;
 * --nl-ink: warna tema digelapkan sampai ≥ 4,5:1 di pita #F2F4FA dan di putih → teks aksen di latar terang;
 * --nl-livery-dark: warna tema 50% + midnight (rok bus di film, dekoratif).
 */
export function nusalineVars(accentRaw: string): CSSProperties {
  const accent = accentOf(accentRaw);
  let neon = accent;
  for (let i = 0; i < 30 && contrast(neon, NIGHT_CARD) < 5; i += 1) neon = mix(neon, WHITE, 0.86);
  let ink = accent;
  for (let i = 0; i < 30 && (contrast(ink, BAND) < 4.5 || contrast(ink, WHITE) < 4.5); i += 1) ink = mix(ink, INK, 0.86);
  return { '--nl-neon': toHex(neon), '--nl-ink': toHex(ink), '--nl-livery-dark': toHex(mix(accent, MIDNIGHT, 0.5)) } as CSSProperties;
}

// ─── Section di halaman ───────────────────────────────────────────────────────

/** Kunci section yang punya tempat di halaman (urutan halaman; = section skema tanpa `brand`). */
export const PAGE_SECTIONS = ['hero', 'schedule', 'classes', 'film', 'routes', 'onboard', 'steps', 'testimonials', 'faq', 'contact', 'footer'] as const;
const KNOWN_SECTIONS = new Set<string>(PAGE_SECTIONS);

/** [kunci list, maks. item (= skema), syarat item dirender] per section. Satu sumber untuk komponen dan menu. */
const ITEMS: Record<string, [listKey: string, max: number, keep: (item: ListItem) => boolean]> = {
  schedule: ['items', 16, (i) => !!field(i, 'from') && !!field(i, 'to') && parseClock(field(i, 'depart')) !== null],
  classes: ['items', 4, (i) => !!field(i, 'name')],
  film: ['chapters', 5, (i) => !!field(i, 'title')],
  routes: ['stops', 8, (i) => !!field(i, 'city')],
  onboard: ['items', 8, (i) => !!field(i, 'title')],
  steps: ['items', 4, (i) => !!field(i, 'title')],
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
  if (key === 'onboard') return sectionItems(key, s).length > 0 || hasImage(text(s, 'image'));
  if (key in ITEMS) return sectionItems(key, s).length > 0;
  // hero, contact, footer
  return true;
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

export interface NavItem {
  key: string;
  label: string;
}

/** Menu singkat (kata benda yang sama dengan label section). */
const NAV: NavItem[] = [
  { key: 'schedule', label: 'Jadwal' },
  { key: 'classes', label: 'Kelas' },
  { key: 'routes', label: 'Rute' },
  { key: 'onboard', label: 'Fasilitas' },
  { key: 'faq', label: 'FAQ' },
  { key: 'contact', label: 'Kontak' },
];

/** Menu hanya untuk section yang benar-benar tampil (tanpa tautan mati). */
export function navItems(content: SiteContent): NavItem[] {
  return NAV.filter(({ key }) => sectionShown(content, key));
}

// ─── Tujuan tautan "#…" ───────────────────────────────────────────────────────

/** Anchor berbahasa Indonesia yang wajar diketik pembeli → kunci section (#kontak, #testimoni sudah lewat shared). */
const ANCHOR_ALIASES: Record<string, string> = {
  jadwal: 'schedule',
  keberangkatan: 'schedule',
  tiket: 'schedule',
  kelas: 'classes',
  armada: 'classes',
  kursi: 'classes',
  perjalanan: 'film',
  rute: 'routes',
  'titik-naik': 'routes',
  agen: 'routes',
  fasilitas: 'onboard',
  kabin: 'onboard',
  'cara-pesan': 'steps',
  pesan: 'steps',
  langkah: 'steps',
  'tanya-jawab': 'faq',
  kantor: 'contact',
  lokasi: 'contact',
};

/** Target tautan section ("jadwal", "schedule", "kontak") → kunci section di halaman, atau null bila tidak dikenal. */
export function sectionTarget(target: string): string | null {
  const clean = sectionFromAnchor(target);
  const key = ANCHOR_ALIASES[clean] ?? clean;
  return KNOWN_SECTIONS.has(key) ? key : null;
}

// ─── Angka, harga, jam ────────────────────────────────────────────────────────

/** "545.000" (pemisah ribuan titik). */
export const groupThousands = (n: number): string => {
  const value = Math.round(Math.abs(n));
  return `${n < 0 ? '-' : ''}${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};

/** "Rp545.000" */
export const formatRupiah = (n: number): string => `Rp${groupThousands(n)}`;

const UNITS: [RegExp, number][] = [
  [/^(jt|juta)$/i, 1e6],
  [/^(rb|ribu|k)$/i, 1e3],
];

/**
 * Harga dari CMS → rupiah: "545000", "Rp545.000", "545 rb", "1,2 jt", juga dengan teks di depan/belakang ("mulai 650rb",
 * "650rb/orang", "1,2 jt per kursi": angka + satuan PERTAMA dipakai). Tidak terbaca → 0. Maks. 12 digit.
 */
export function parsePrice(raw: string | number | null | undefined): number {
  const value = String(raw ?? '').trim();
  if (!value) return 0;
  const withUnit = /(\d[\d.,]*)\s*(jt|juta|rb|ribu|k)(?![a-z])/i.exec(value);
  if (withUnit) {
    const unit = UNITS.find(([pattern]) => pattern.test(withUnit[2]));
    if (unit) {
      const n = Number.parseFloat(withUnit[1].replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
      return Number.isFinite(n) && n > 0 ? Math.round(n * unit[1]) : 0;
    }
  }
  const digits = value.replace(/,\d{1,2}$/, '').replace(/\D/g, '').slice(0, 12);
  return digits ? Number(digits) : 0;
}

export const pad2 = (n: number): string => String(Math.max(0, Math.floor(n))).padStart(2, '0');

/** Jam "19.00" / "19:00" / "7.30" / "07.00 WIB" → menit sejak 00.00 (0–1439), atau null. */
export function parseClock(raw: string | null | undefined): number | null {
  const m = /^\s*(\d{1,2})\s*[.:]\s*(\d{2})\b/.exec(raw || '');
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h <= 23 && min <= 59 ? h * 60 + min : null;
}

/** Menit → "19.00" (melewati tengah malam: 1860 → "07.00"). */
export const formatClock = (minutes: number): string => {
  const total = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${pad2(Math.floor(total / 60))}.${pad2(total % 60)}`;
};

/**
 * Durasi dari CMS → menit: "12 jam", "12j", "11j 30m", "11 jam 30 menit", "11:30", "11.30", "90 menit", "12".
 * Tidak terbaca / 0 / > 72 jam → 0.
 */
export function parseDuration(raw: string | null | undefined): number {
  const value = (raw || '').trim().toLowerCase();
  if (!value) return 0;
  let minutes = 0;
  const clock = /^(\d{1,2})\s*[.:]\s*(\d{2})$/.exec(value);
  if (clock) minutes = Number(clock[1]) * 60 + Number(clock[2]);
  else {
    const hours = /(\d+(?:[.,]\d+)?)\s*(?:j|jam|h|hours?)(?![a-z])/.exec(value);
    const mins = /(\d+)\s*(?:m|mnt|menit|min|minutes?)(?![a-z])/.exec(value);
    if (hours) minutes += Math.round(Number.parseFloat(hours[1].replace(',', '.')) * 60);
    if (mins) minutes += Number(mins[1]);
    if (!hours && !mins && /^\d+(?:[.,]\d+)?$/.test(value)) minutes = Math.round(Number.parseFloat(value.replace(',', '.')) * 60);
  }
  return Number.isFinite(minutes) && minutes > 0 && minutes <= 72 * 60 ? minutes : 0;
}

/** 750 → "12j 30m" (tampilan mono jadwal). */
export const formatDuration = (minutes: number): string => (minutes > 0 ? `${Math.floor(minutes / 60)}j ${pad2(minutes % 60)}m` : '');

/** 750 → "12 jam 30 menit" (dibacakan pembaca layar). */
export const spokenDuration = (minutes: number): string => {
  if (minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h ? `${h} jam` : '', m ? `${m} menit` : ''].filter(Boolean).join(' ');
};

// ─── Jadwal keberangkatan ─────────────────────────────────────────────────────

export interface Departure {
  /** Urutan di CMS */
  index: number;
  from: string;
  to: string;
  /** Menit sejak 00.00 */
  depart: number;
  /** Menit perjalanan; 0 = tidak diisi */
  duration: number;
  /** Jam tiba (menit 0–1439), null bila durasi kosong */
  arrive: number | null;
  /** 0 = tiba hari yang sama, 1 = besok ("+1"), dst. */
  days: number;
  cls: string;
  price: number;
}

export function readDepartures(section: SectionContent): Departure[] {
  return sectionItems('schedule', section).map((item, index) => {
    const depart = parseClock(field(item, 'depart')) ?? 0;
    const duration = parseDuration(field(item, 'duration'));
    const end = depart + duration;
    return {
      index,
      from: field(item, 'from'),
      to: field(item, 'to'),
      depart,
      duration,
      arrive: duration ? end % 1440 : null,
      days: duration ? Math.floor(end / 1440) : 0,
      cls: field(item, 'class'),
      price: parsePrice(field(item, 'price')),
    };
  });
}

/** Nilai unik (urutan kemunculan, beda huruf besar-kecil dianggap sama, ejaan pertama dipakai). */
export const unique = (values: string[]): string[] => {
  const seen = new Map<string, string>();
  for (const value of values) if (value && !seen.has(value.toLowerCase())) seen.set(value.toLowerCase(), value);
  return Array.from(seen.values());
};

export const same = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Kota untuk pilihan Dari / Ke: urutan kota di diagram rute (`order`, mis. Jakarta → … → Denpasar) bila ada, kota lain
 * sesudahnya menurut kemunculan di jadwal (asal dulu, lalu tujuan).
 */
export function scheduleCities(list: Departure[], order: string[] = []): string[] {
  const cities = unique([...list.map((d) => d.from), ...list.map((d) => d.to)]);
  const rank = (city: string) => {
    const at = order.findIndex((o) => same(o, city));
    return at < 0 ? order.length : at;
  };
  return cities.map((city, i) => ({ city, i, r: rank(city) })).sort((a, b) => a.r - b.r || a.i - b.i).map((c) => c.city);
}

export interface RouteChip {
  from: string;
  to: string;
  label: string;
}

/** Chip rute unik "Jakarta → Yogyakarta" (urutan CMS, maks. 8). */
export function routeChips(list: Departure[]): RouteChip[] {
  const seen = new Set<string>();
  const out: RouteChip[] = [];
  for (const d of list) {
    const id = `${d.from.toLowerCase()}|${d.to.toLowerCase()}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ from: d.from, to: d.to, label: `${d.from} → ${d.to}` });
    if (out.length >= 8) break;
  }
  return out;
}

export interface ScheduleFilter {
  /** '' = semua */
  from: string;
  to: string;
  cls: string;
}

export const ALL_ROUTES: ScheduleFilter = { from: '', to: '', cls: '' };

/** Keadaan bersama tabel jadwal (diisi kartu cari di hero, tombol kelas, dan bilah saringan). */
export interface ScheduleState {
  filter: ScheduleFilter;
  /** YYYY-MM-DD, '' = belum ditentukan */
  date: string;
  pax: number;
  /** true setelah saringan diganti (baris beranimasi muncul) */
  changed: boolean;
}

export const isFiltered = (f: ScheduleFilter): boolean => !!(f.from || f.to || f.cls);

/** Keberangkatan yang cocok (tanpa beda huruf besar-kecil), urut jam berangkat (stabil menurut urutan CMS). */
export function applyScheduleFilter(list: Departure[], filter: ScheduleFilter): Departure[] {
  return list
    .filter((d) => (!filter.from || same(d.from, filter.from)) && (!filter.to || same(d.to, filter.to)) && (!filter.cls || same(d.cls, filter.cls)))
    .sort((a, b) => a.depart - b.depart || a.index - b.index);
}

/** "4 jadwal" / "Tidak ada jadwal yang cocok" */
export const resultCount = (n: number): string => (n === 0 ? 'Tidak ada jadwal yang cocok' : `${n} jadwal`);

/** "Jakarta → Surabaya", "Dari Jakarta", "Ke Malang", "Semua rute" (+ " · Sleeper") */
export function filterSummary(filter: ScheduleFilter): string {
  const route =
    filter.from && filter.to ? `${filter.from} → ${filter.to}` : filter.from ? `Dari ${filter.from}` : filter.to ? `Ke ${filter.to}` : 'Semua rute';
  return filter.cls ? `${route} · ${filter.cls}` : route;
}

// ─── Formulir cari jadwal & pesan WhatsApp ────────────────────────────────────

export interface SearchForm {
  from: string;
  to: string;
  /** YYYY-MM-DD, '' = belum ditentukan */
  date: string;
  pax: number;
}

export type SearchErrors = Partial<Record<keyof SearchForm, string>>;

export const PAX_MIN = 1;
export const PAX_MAX = 6;
export const PAX_OPTIONS = Array.from({ length: PAX_MAX - PAX_MIN + 1 }, (_, i) => i + PAX_MIN);

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

/** "2026-10-31" → "Sabtu, 31 Oktober 2026"; tidak valid → "". */
export function formatLongDate(iso: string): string {
  const date = parseIsoDate(iso);
  return date ? `${DAYS[date.getUTCDay()]}, ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}` : '';
}

/** Galat tanggal berangkat (YYYY-MM-DD, '' = belum ditentukan = valid): bukan tanggal yang ada, atau sebelum `today`. */
export function dateError(date: string, today: string): string {
  if (!date) return '';
  if (!parseIsoDate(date)) return 'Tanggal tidak valid.';
  return date < today ? 'Pilih tanggal hari ini atau sesudahnya.' : '';
}

/** Galat per isian (kosong = valid): Dari ≠ Ke, tanggal (opsional) tidak sebelum `today`, penumpang 1–6. */
export function validateSearch(form: SearchForm, today: string): SearchErrors {
  const errors: SearchErrors = {};
  if (form.from && form.to && same(form.from, form.to)) errors.to = 'Kota tujuan harus berbeda dari kota asal.';
  const date = dateError(form.date, today);
  if (date) errors.date = date;
  if (!Number.isInteger(form.pax) || form.pax < PAX_MIN || form.pax > PAX_MAX) errors.pax = `Jumlah penumpang ${PAX_MIN}–${PAX_MAX} orang.`;
  return errors;
}

/** Jumlah penumpang dari isian → 1–6 (rusak → 1). */
export const clampPax = (raw: number | string): number => {
  const n = Math.round(Number(raw));
  return Number.isFinite(n) ? Math.min(PAX_MAX, Math.max(PAX_MIN, n)) : PAX_MIN;
};

/** Teks bersih satu baris: karakter kontrol dibuang, spasi dirapikan, dipotong ke `max`. */
export function cleanText(raw: string, max: number): string {
  const visible = Array.from(raw || '', (ch) => {
    const code = ch.charCodeAt(0);
    return code < 32 || code === 127 ? ' ' : ch;
  }).join('');
  return Array.from(visible.replace(/\s+/g, ' ').trim()).slice(0, max).join('').trim();
}

export interface BookingInput {
  from: string;
  to: string;
  date: string;
  depart: number;
  cls: string;
  pax: number;
}

/**
 * Pesan WhatsApp pemesanan tiket: salam, baris kosong, Rute / Tanggal / Jam berangkat + kelas / Jumlah penumpang, baris
 * kosong, penutup. Tanggal kosong atau rusak → "belum ditentukan"; dengan `today` (YYYY-MM-DD) tanggal yang sudah lewat
 * juga → "belum ditentukan" (isian tanggal di bilah jadwal hanya dibatasi atribut `min`, yang bisa dilewati papan ketik).
 * Hanya menyusun teks: kursi & harga dikonfirmasi admin.
 */
export function bookingMessage(input: BookingInput, company: string, today = ''): string {
  const name = cleanText(company, 80);
  const date = (today && dateError(input.date, today) ? '' : formatLongDate(input.date)) || 'belum ditentukan';
  const cls = cleanText(input.cls, 40);
  const rows = [
    `Rute: ${cleanText(input.from, 40)} → ${cleanText(input.to, 40)}`,
    `Tanggal: ${date}`,
    `Jam berangkat: ${formatClock(input.depart)}${cls ? ` (${cls})` : ''}`,
    `Jumlah penumpang: ${clampPax(input.pax)} orang`,
  ];
  return `${name ? `Halo ${name}, saya` : 'Halo, saya'} ingin pesan tiket bus.\n\n${rows.join('\n')}\n\nMohon info ketersediaan kursi. Terima kasih.`;
}

/** "Halo Nusaline, saya ingin bertanya tentang titik naik di Yogyakarta." */
export const pointsMessage = (city: string, company: string): string =>
  `${cleanText(company, 80) ? `Halo ${cleanText(company, 80)}, saya` : 'Halo, saya'} ingin bertanya tentang titik naik di ${cleanText(city, 40)}.`;

// ─── Kelas & denah kursi ──────────────────────────────────────────────────────

export interface SeatLayout {
  /** Kursi di sisi kiri kendaraan (atas pada denah) */
  left: number;
  /** Kursi di sisi kanan (bawah pada denah) */
  right: number;
  /** Kabin tidur (1-1 / nama "sleeper") */
  pods: boolean;
  total: number;
  /** "2-2" */
  label: string;
  decks: { label: string; rows: number; seats: number }[];
}

/**
 * Konfigurasi kelas → tata letak: "2-2" / "2+2" / "2 - 1" / "1-1" (1–3 per sisi; tidak terbaca → 2-2), jumlah kursi
 * 4–60 (kosong → 8 baris penuh). Kabin tidur (total per baris ≤ 2 atau nama berisi sleeper/kabin/tidur) dengan > 6 baris
 * dibagi dua dek (bawah & atas).
 */
export function seatLayout(layoutRaw: string, seatsRaw: string, name = ''): SeatLayout {
  const m = /^\s*([1-3])\s*[-+x×/]\s*([1-3])\s*$/i.exec(layoutRaw || '');
  const left = m ? Number(m[1]) : 2;
  const right = m ? Number(m[2]) : 2;
  const perRow = left + right;
  const parsed = Number.parseInt((seatsRaw || '').replace(/\D/g, ''), 10);
  const total = Math.min(60, Math.max(4, Number.isFinite(parsed) && parsed > 0 ? parsed : perRow * 8));
  const pods = perRow <= 2 || /sleeper|kabin|tidur/i.test(name);
  const rows = Math.ceil(total / perRow);
  const split = pods && rows > 6;
  const lowerRows = split ? Math.ceil(rows / 2) : rows;
  const lowerSeats = Math.min(total, lowerRows * perRow);
  const decks = split
    ? [
        { label: 'Dek bawah', rows: lowerRows, seats: lowerSeats },
        { label: 'Dek atas', rows: rows - lowerRows, seats: total - lowerSeats },
      ]
    : [{ label: '', rows, seats: total }];
  return { left, right, pods, total, label: `${left}-${right}`, decks };
}

export interface SeatBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DeckGeometry {
  label: string;
  /** Kursi/kabin urut dari depan ke belakang (untuk animasi muncul) */
  seats: SeatBox[];
}

/**
 * Ukuran denah tetap (viewBox) per dek: depan di KANAN, sisi kiri kendaraan di ATAS (pintu), sopir di kanan-depan
 * (bawah denah), toilet di belakang (kiri-bawah denah). Bentuk bodi/sopir/pintu/toilet: ./paths DECK_SHAPES.
 */
export const DECK = { w: 900, h: 250 } as const;

/** Koordinat kursi per dek (satuan viewBox DECK). Baris dari depan (kanan) ke belakang. */
export function seatGeometry(layout: SeatLayout): DeckGeometry[] {
  const x0 = 104;
  const x1 = 752;
  const top = 22;
  const bottom = DECK.h - 22;
  const aisle = layout.pods ? 40 : 38;
  const half = (bottom - top - aisle) / 2;
  return layout.decks.map((deck) => {
    const pitch = (x1 - x0) / Math.max(1, deck.rows);
    const w = layout.pods ? pitch - 12 : Math.min(64, pitch - 14);
    const sideH = (n: number) => Math.min(layout.pods ? 66 : 52, (half - (n - 1) * 6) / n);
    const seats: SeatBox[] = [];
    for (let r = 0; r < deck.rows && seats.length < deck.seats; r += 1) {
      // Baris r dari depan: kolom paling kanan dulu
      const x = x1 - (r + 1) * pitch + (pitch - w) / 2;
      const hl = sideH(layout.left);
      for (let s = 0; s < layout.left && seats.length < deck.seats; s += 1) seats.push({ x, y: top + s * (hl + 6), w, h: hl });
      const hr = sideH(layout.right);
      for (let s = 0; s < layout.right && seats.length < deck.seats; s += 1) seats.push({ x, y: bottom - (s + 1) * hr - s * 6, w, h: hr });
    }
    return { label: deck.label, seats };
  });
}

export interface ClassInfo {
  index: number;
  name: string;
  layout: SeatLayout;
  /** "32 kursi" / "20 kabin" */
  seatsLabel: string;
  legroom: string;
  features: string[];
  price: number;
  image: string;
}

/** Fitur kelas: satu per baris (atau dipisah "·" / ";"), maks. 5. */
export const splitLines = (raw: string, max = 5): string[] =>
  (raw || '')
    .split(/\n|·|;|•/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, max);

export function readClasses(section: SectionContent): ClassInfo[] {
  return sectionItems('classes', section).map((item, index) => {
    const name = field(item, 'name');
    const layout = seatLayout(field(item, 'layout'), field(item, 'seats'), name);
    return {
      index,
      name,
      layout,
      seatsLabel: `${layout.total} ${layout.pods ? 'kabin' : 'kursi'}`,
      legroom: field(item, 'legroom'),
      features: splitLines(field(item, 'features')),
      price: parsePrice(field(item, 'price')),
      image: field(item, 'image'),
    };
  });
}

/** Nama kelas pendek huruf kapital (≤ 9 huruf) untuk papan keberangkatan: "Super Eksekutif" → "SUPER EKS". */
export function shortClass(name: string): string {
  const s = (name || '').trim().toUpperCase();
  if (s.length <= 9) return s;
  const words = s.split(/\s+/);
  if (words.length > 1) {
    const short = `${words[0]} ${words
      .slice(1)
      .map((w) => w.slice(0, 3))
      .join(' ')}`;
    if (short.length <= 9) return short;
  }
  return (words[0] || s).slice(0, 9).trim();
}

// ─── Rute & titik naik ────────────────────────────────────────────────────────

export interface BoardingPoint {
  name: string;
  address: string;
  hours: string;
}

export interface Stop {
  index: number;
  city: string;
  code: string;
  image: string;
  points: BoardingPoint[];
}

/** Kode kota untuk papan & diagram: isian sendiri (≤ 4 huruf) atau 3 huruf pertama nama kota. */
export const cityCode = (city: string, code = ''): string => {
  const own = code.replace(/[^\p{L}\p{N}]/gu, '').toUpperCase().slice(0, 4);
  if (own) return own;
  return (city || '').replace(/[^\p{L}]/gu, '').toUpperCase().slice(0, 3);
};

export function readStops(section: SectionContent): Stop[] {
  const points = list(section, 'points', 24).filter((p) => field(p, 'city') && field(p, 'name'));
  return sectionItems('routes', section).map((item, index) => {
    const city = field(item, 'city');
    return {
      index,
      city,
      code: cityCode(city, field(item, 'code')),
      image: field(item, 'image'),
      points: points
        .filter((p) => same(field(p, 'city'), city))
        .map((p) => ({ name: field(p, 'name'), address: field(p, 'address'), hours: field(p, 'hours') })),
    };
  });
}

/** "3 agen" / "Belum ada agen" */
export const pointsCount = (n: number): string => (n > 0 ? `${n} agen` : 'Belum ada agen');

// ─── Papan keberangkatan mini (hero) ──────────────────────────────────────────

export interface BoardRow {
  time: string;
  from: string;
  to: string;
  cls: string;
  /** Kalimat lengkap untuk pembaca layar */
  spoken: string;
}

/** Tiga keberangkatan pertama di CMS → baris papan "19.00 JKT → SBY SLEEPER" (kode kota dari daftar rute). */
export function boardRows(list: Departure[], stops: Stop[], max = 3): BoardRow[] {
  const codeOf = (city: string) => stops.find((s) => same(s.city, city))?.code || cityCode(city);
  return list.slice(0, max).map((d) => ({
    time: formatClock(d.depart),
    from: codeOf(d.from),
    to: codeOf(d.to),
    cls: shortClass(d.cls),
    spoken: `${formatClock(d.depart)}, ${d.from} ke ${d.to}${d.cls ? `, kelas ${d.cls}` : ''}`,
  }));
}

// ─── Film: garis waktu satu malam ─────────────────────────────────────────────

/**
 * Patokan progres film (p 0 → 1). Angka yang SAMA ditulis di ./nusaline.css (variabel --nl-d): bus berhenti saat naik
 * (p 0–0,05), saat istirahat (p `rest` … + 0,05), dan setelah tiba (p 0,88–1). Jam berjalan dari p 0,02 sampai 0,88.
 * Keterangan bab istirahat tampil `restLead` sebelum bus berhenti (rest area sudah masuk layar) sampai `restTail` setelah
 * bus berangkat lagi; saat itu bab berikutnya mengambil alih (lihat filmTimeline).
 */
export const FILM = { boardEnd: 0.05, clockStart: 0.02, arrive: 0.88, restLen: 0.05, restLead: 0.05, restTail: 0.02, poster: 0.45 } as const;

export interface FilmChapter {
  index: number;
  /** Teks jam seperti di CMS ("19.00"), dirapikan */
  time: string;
  title: string;
  text: string;
  /** Posisi progres saat jam panggung menunjukkan jam bab ini (0–1) */
  at: number;
  /**
   * Awal tampil keterangan bab ini, titik babnya di rel, dan bab aktif (0–1, 4 desimal): sama dengan `at`, kecuali bab
   * istirahat (tampil sejak bus mendekati rest area) dan bab sesudahnya (mengambil alih begitu bus meninggalkan rest area,
   * bukan pada jamnya — bus sudah melaju ke tujuan, keterangan istirahat tidak boleh tertinggal di layar).
   */
  show: number;
}

export interface FilmTimeline {
  chapters: FilmChapter[];
  /** Menit awal jam (bab pertama) */
  start: number;
  /** Lama jam berjalan (menit) */
  span: number;
  /** Jarak total (km), 0 = tanpa penghitung km */
  distance: number;
  /** Awal jendela istirahat (p), atau null */
  rest: number | null;
  /** Pembagi jarak (lama bus bergerak dalam p) */
  dn: number;
}

const REST_WORDS = /istirahat|rest|berhenti|singgah|salat|sholat|shalat|makan/i;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const clampRange = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * Bab film dari CMS → garis waktu. Jam bab berurutan; jam yang lebih kecil dari sebelumnya dianggap lewat tengah malam
 * (+24 jam). Jam rusak → disebar rata. Bab "istirahat" (bukan pertama/terakhir) memberi jendela berhenti.
 */
export function filmTimeline(section: SectionContent): FilmTimeline {
  const items = sectionItems('film', section);
  const raw = items.map((item) => parseClock(field(item, 'time')));
  const known = raw.every((t) => t !== null);
  const times: number[] = [];
  if (known) {
    for (const t of raw as number[]) {
      let value = t;
      while (times.length > 0 && value <= times[times.length - 1]) value += 1440;
      times.push(value);
    }
  }
  const start = known && times.length ? times[0] : 19 * 60;
  const span = known && times.length > 1 ? times[times.length - 1] - start : 12 * 60;
  const n = items.length;
  const timed = items.map((item, index) => {
    const frac = known && n > 1 ? (times[index] - start) / span : n > 1 ? index / (n - 1) : 0;
    const at = index === 0 ? 0 : FILM.clockStart + frac * (FILM.arrive - FILM.clockStart);
    return {
      index,
      time: known ? formatClock(times[index]) : field(item, 'time'),
      title: field(item, 'title'),
      text: field(item, 'text'),
      at: clamp01(at),
    };
  });
  const restChapter = timed.find((c, i) => i > 0 && i < n - 1 && REST_WORDS.test(c.title));
  const rest = restChapter ? Math.round(clampRange(restChapter.at - 0.01, FILM.boardEnd + 0.02, FILM.arrive - FILM.restLen - 0.02) * 1e4) / 1e4 : null;
  const dn = Math.round((1 - FILM.boardEnd - (rest === null ? 0 : FILM.restLen) - (1 - FILM.arrive)) * 1e4) / 1e4;
  // Jendela keterangan mengikuti adegan: bab istirahat sejak rest area mendekat (paling awal di tengah antara jam bab
  // sebelumnya dan jamnya sendiri) sampai sesaat setelah bus berangkat lagi; bab sesudahnya langsung menyusul
  const show = timed.map((c) => c.at);
  if (restChapter && rest !== null) {
    const r = restChapter.index;
    show[r] = Math.max((timed[r - 1].at + timed[r].at) / 2, Math.min(timed[r].at, rest - FILM.restLead));
    show[r + 1] = Math.max(show[r], Math.min(timed[r + 1].at, rest + FILM.restLen + FILM.restTail));
  }
  const chapters = timed.map((c, i) => ({ ...c, show: Math.round(show[i] * 1e4) / 1e4 }));
  return { chapters, start, span, distance: parseDistance(text(section, 'distance')), rest, dn };
}

/** Jarak film dari CMS → km bulat 0–9999: "780", "780 km", "1.200" (titik ribuan), "1.200,5". Tidak terbaca → 0. */
export function parseDistance(raw: string): number {
  const value = (raw || '')
    .replace(/[^\d.,]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');
  return Math.min(9999, Math.max(0, Math.round(Number.parseFloat(value) || 0)));
}

/** Jarak tempuh relatif (0–1) pada progres p: tetap saat naik, istirahat, dan setelah tiba. */
export function distanceAt(p: number, tl: Pick<FilmTimeline, 'rest' | 'dn'>): number {
  const q = clamp01(p);
  const parked = clampRange(q, 0, FILM.boardEnd) + (tl.rest === null ? 0 : clampRange(q - tl.rest, 0, FILM.restLen)) + clampRange(q - FILM.arrive, 0, 1 - FILM.arrive);
  return clamp01((q - parked) / tl.dn);
}

/** Jam (menit, bisa > 1440) pada progres p. */
export const clockAt = (p: number, tl: Pick<FilmTimeline, 'start' | 'span'>): number =>
  tl.start + clamp01((clamp01(p) - FILM.clockStart) / (FILM.arrive - FILM.clockStart)) * tl.span;

/** Km pada progres p (dibulatkan). */
export const kmAt = (p: number, tl: FilmTimeline): number => Math.round(tl.distance * distanceAt(p, tl));

/** Indeks bab yang aktif (keterangan di layar, titik rel menyala) pada progres p: bab terakhir yang `show`-nya ≤ p. */
export function chapterAt(p: number, chapters: Pick<FilmChapter, 'show'>[]): number {
  let active = 0;
  for (let i = 0; i < chapters.length; i += 1) if (p + 1e-6 >= chapters[i].show) active = i;
  return active;
}

/**
 * Jendela tampil keterangan bab i: [awal, akhir] dalam p (akhir = awal bab berikutnya, atau 1,01). Jendela berurutan
 * tanpa tumpang tindih; CSS memudarkan bab lama habis sebelum bab baru muncul.
 */
export const chapterWindow = (chapters: Pick<FilmChapter, 'show'>[], i: number): [number, number] => [chapters[i]?.show ?? 0, chapters[i + 1]?.show ?? 1.01];

/**
 * Progres gulir trek film (dipakai ./hooks useFilmProgress): p = (atas area terlihat − atas trek) / (tinggi trek −
 * tinggi area terlihat), dibatasi 0–1 dan dibulatkan 4 desimal. `viewTop` = tepi atas area terlihat (jendela: 0, atau
 * atas bingkai gulir) + --tpl-sticky-top; `viewHeight` = tinggi area terlihat dikurangi --tpl-sticky-top. Trek yang
 * tidak lebih tinggi dari area terlihat, atau angka rusak → 0.
 */
export function scrollProgress(viewTop: number, trackTop: number, trackHeight: number, viewHeight: number): number {
  const range = trackHeight - viewHeight;
  const raw = (viewTop - trackTop) / range;
  if (!(range > 0) || !Number.isFinite(raw)) return 0;
  return Math.round(Math.min(1, Math.max(0, raw)) * 10000) / 10000;
}

/** Kotak teks di panggung film (px dari kiri-atas panggung). */
export interface FilmBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface BusFit {
  /** Lebar bus = --nl-bus-w (px) = 800 satuan SVG bus (kotak SVG 1000 satuan) */
  width: number;
  /** Pusat bodi bus dari kiri panggung (px) */
  x: number;
  /** Lebar & pusat standar (tanpa penyesuaian) */
  base: number;
  x0: number;
  /** false = bus terkecil pun masih tertutup teks (panggung sangat pendek) */
  ok: boolean;
}

/**
 * Bus film yang tidak tertutup teks panggung (judul, jam & km, keterangan bab) di layar mana pun. Bus standar = lebar
 * (800 satuan) min(92% panggung, 76% tinggi) — HP 80%, HP kecil < 384px 72% — berpusat di 50% (HP 45%, HP kecil 41%:
 * moncong bus bebas dari kolom tombol melayang di kanan bawah), sama dengan ./nusaline.css. Geometri
 * SVG bus (./paths BUS, kotak 1000×270 satuan): tanah 14% tinggi panggung dari bawah, atap terlihat 244 satuan di atas
 * tanah (0,305 × lebar bus), bodi dari 393 satuan di belakang pusat sampai spion 417 satuan di depan. Bertabrakan dengan
 * kotak teks (+ jarak `gap`) → layar lebar: geser ke kanan melewati teks bila muat; bila tidak (atau HP): perkecil
 * bertahap sampai bebas, paling kecil 40% lebar panggung.
 */
export function fitFilmBus(stageW: number, stageH: number, boxes: FilmBox[], phone: boolean, gap = 16): BusFit {
  const narrow = phone && stageW < 384;
  const base = Math.round(Math.min((narrow ? 0.72 : phone ? 0.8 : 0.92) * stageW, 0.76 * stageH));
  const x0 = Math.round((narrow ? 0.41 : phone ? 0.45 : 0.5) * stageW);
  const ground = 0.86 * stageH;
  const margin = Math.max(24, 0.04 * stageW);
  const busBox = (width: number, x: number): FilmBox => ({ left: x - (393 * width) / 800, right: x + (417 * width) / 800, top: ground - 0.305 * width, bottom: ground });
  const hits = (b: FilmBox) => boxes.filter((t) => t.right + gap > b.left && t.left - gap < b.right && t.bottom + gap > b.top && t.top - gap < b.bottom);
  const min = Math.min(base, Math.round(0.4 * stageW));
  for (let width = base; width >= min; width -= 4) {
    const centred = busBox(width, x0);
    const blocking = hits(centred);
    if (blocking.length === 0) return { width, x: x0, base, x0, ok: true };
    if (!phone) {
      // Geser ke kanan: bagian belakang bus tepat setelah teks yang menghalangi (bila depan bus masih di panggung)
      const x = Math.round(Math.max(x0, Math.max(...blocking.map((t) => t.right)) + gap + (393 * width) / 800));
      if (x + (417 * width) / 800 <= stageW - margin && hits(busBox(width, x)).length === 0) return { width, x, base, x0, ok: true };
    }
  }
  return { width: min, x: x0, base, x0, ok: false };
}

// ─── Lain-lain ────────────────────────────────────────────────────────────────

/** Nomor HP Indonesia yang ditulis rapat ("081234567890") → "0812-3456-7890"; format lain apa adanya. */
export const displayPhone = (raw: string): string => {
  const value = (raw || '').trim();
  return /^08\d{8,11}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8)}` : value;
};

export interface SocialLink {
  key: string;
  label: string;
  href: string;
}

export const socialLinks = (footer: SectionContent): SocialLink[] =>
  SOCIAL_FIELDS.map(({ key, label }) => ({ key, label, href: safeUrl(text(footer, key)) ?? '' })).filter((s) => s.href);

/**
 * Subjudul cerita penumpang "Jakarta → Yogyakarta · Eksekutif" → ["Jakarta → Yogyakarta", "Eksekutif"] (dua baris, jadi
 * nama sejajar di semua kartu). Tanpa "·" atau salah satu sisi kosong → [teks, ""].
 */
export function splitRoute(raw: string): [string, string] {
  const value = (raw || '').trim();
  const at = value.lastIndexOf('·');
  const route = at < 0 ? value : value.slice(0, at).trim();
  const cls = at < 0 ? '' : value.slice(at + 1).trim();
  return route && cls ? [route, cls] : [route || cls, ''];
}

/** Highlight judul hero: kata/frasa di dalam judul (tanpa beda huruf besar-kecil) → [sebelum, sorotan, sesudah]. */
export function splitTitle(title: string, highlight: string): [string, string, string] {
  const index = highlight ? title.toLowerCase().indexOf(highlight.toLowerCase()) : -1;
  if (index < 0) return [title, '', ''];
  return [title.slice(0, index), title.slice(index, index + highlight.length), title.slice(index + highlight.length)];
}

// ─── Model ────────────────────────────────────────────────────────────────────

export function readNusaline(content: SiteContent) {
  const section = (key: string) => getSection(content, key);
  const brand = section('brand');
  const hero = section('hero');
  const schedule = section('schedule');
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
  /**
   * Isi field URL: "#jadwal", "#kelas", "#kontak" dsb. hanya bila section itu tampil (anchor Indonesia diterjemahkan);
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
  /** Tujuan "cek jadwal": tabel jadwal, kalau tidak Kontak, kalau tidak WhatsApp. */
  const scheduleAction: LinkAction | null = sectionAction('schedule') ?? sectionAction('contact') ?? waAction;

  const departures = shown('schedule') ? readDepartures(schedule) : [];
  const stops = shown('routes') ? readStops(section('routes')) : [];

  return {
    brand,
    hero,
    schedule,
    classes: section('classes'),
    film: section('film'),
    routes: section('routes'),
    onboard: section('onboard'),
    steps: section('steps'),
    testimonials: section('testimonials'),
    faq: section('faq'),
    contact,
    footer,
    companyName,
    tagline: text(brand, 'tagline'),
    logo: text(brand, 'logo'),
    colors: nusalineVars(text(brand, 'accent_color')),
    whatsapp,
    waAction,
    shown,
    items,
    sectionAction,
    linkOr,
    waWith,
    scheduleAction,
    departures,
    chips: routeChips(departures),
    cities: scheduleCities(departures, stops.map((s) => s.city)),
    classList: shown('classes') ? readClasses(section('classes')) : [],
    stops,
    board: boardRows(departures, stops),
    timeline: filmTimeline(section('film')),
    headerLabel: text(hero, 'header_label'),
    headerAction: linkOr(text(hero, 'header_url'), scheduleAction),
    // Hero: jadwal sudah punya tombolnya sendiri (kartu cari "Cari jadwal" + "Cek Jadwal" di menu atas), jadi dua tombol
    // hero membawa ke keputusan berikutnya: kelas, lalu rute & titik naik. Section tersembunyi → tombolnya tidak tampil.
    primaryAction: sectionAction('classes'),
    secondaryAction: sectionAction('routes'),
    nav: navItems(content),
    socials: socialLinks(footer),
    map: mapsInfo(text(contact, 'maps_url'), text(contact, 'maps_query') || text(contact, 'address')),
    year: new Date().getFullYear(),
  };
}

export type NusalineModel = ReturnType<typeof readNusaline>;
