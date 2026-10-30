// Turunan konten Lawatan (fungsi murni, tanpa React): warna tema (hijau tua footer & panel estimasi, teks aksen di krem),
// section yang tampil + nomor label "01", menu, tujuan tautan, harga ("875000" / "Rp875.000" / "875 rb" → rupiah; tulis
// "Rp875rb" di perangko harga), paket & saringan jenis trip, formulir hitung biaya (estimasi, validasi, pesan WhatsApp),
// pesan per paket, film itinerary (titik rute, bab per kemajuan gulir, km), tata letak galeri, dan baris kontak. Semua
// tahan konten mentah (null, angka, list rusak). Formulir hanya MENGHITUNG/MENYUSUN pesan: tidak ada data yang dikirim
// ke server atau disimpan di website, tidak ada pembayaran online; harga contoh dikonfirmasi admin.
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
import { LAWATAN_ACCENT } from './defaultContent';

// ─── Warna ────────────────────────────────────────────────────────────────────

type Rgb = [number, number, number];
const WHITE: Rgb = [255, 255, 255];
/** Krem pita A & kartu pos (#FBF6EE) */
export const CREAM: Rgb = [251, 246, 238];
/**
 * Warna suasana waktu section film (./lawatan.css `.lw-film[data-daypart]`): pagi, siang, sore, malam. Teks aksen
 * (--lw-ink) dijaga ≥ 4,5:1 di yang paling gelap (malam #EEEBF1), jadi juga di krem dan putih.
 */
export const FILM_TINTS = { pagi: '#FBF1E4', siang: '#F3F5EC', sore: '#FAEEDF', malam: '#EEEBF1' } as const;
const DARKEST_TINT: Rgb = [238, 235, 241];
/** Hijau-hitam #0D1610: mix(#277A36, NIGHT, 0,45) = #194321 (footer & panel estimasi bawaan) */
const NIGHT: Rgb = [13, 22, 16];
const toHex = (rgb: Rgb) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
/** Campuran dibulatkan: kontras dihitung dari warna yang benar-benar ditulis sebagai hex. */
const mix = (a: Rgb, b: Rgb, amountOfA: number): Rgb => a.map((c, i) => Math.round(c * amountOfA + b[i] * (1 - amountOfA))) as Rgb;

const accentOf = (raw: string): Rgb => parseHex(raw) ?? (parseHex(LAWATAN_ACCENT) as Rgb);

/**
 * Variabel warna lokal Lawatan (di samping --tpl-accent* milik Shell), semuanya dari SATU warna tema:
 * --lw-deep: hijau tua footer & panel estimasi (tema 45% + hijau-hitam, digelapkan sampai putih ≥ 10:1);
 * --lw-ink: teks aksen di krem #FBF6EE / putih / warna suasana film (judul sorotan, label, harga, tautan, nama titik
 * aktif), ≥ 4,5:1 di warna film paling gelap (FILM_TINTS.malam) sehingga juga di krem & putih.
 */
export function lawatanVars(accentRaw: string): CSSProperties {
  const accent = accentOf(accentRaw);
  let deep = mix(accent, NIGHT, 0.45);
  for (let i = 0; i < 16 && contrast(deep, WHITE) < 10; i += 1) deep = mix(deep, NIGHT, 0.8);
  let ink = accent;
  for (let i = 0; i < 24 && contrast(ink, DARKEST_TINT) < 4.5; i += 1) ink = mix(ink, NIGHT, 0.85);
  return { '--lw-deep': toHex(deep), '--lw-ink': toHex(ink) } as CSSProperties;
}

// ─── Section di halaman ───────────────────────────────────────────────────────

/** Kunci section yang punya tempat di halaman (urutan halaman; = section skema tanpa `brand`). */
export const PAGE_SECTIONS = ['hero', 'packages', 'film', 'included', 'custom', 'testimonials', 'gallery', 'faq', 'contact', 'footer'] as const;
const KNOWN_SECTIONS = new Set<string>(PAGE_SECTIONS);

/** Section berlabel perangko bernomor "01 · …" (urutan halaman). */
const NUMBERED = ['packages', 'film', 'included', 'custom', 'testimonials', 'gallery', 'faq', 'contact'];

/** [kunci list, maks. item (= skema), syarat item dirender] per section. Satu sumber untuk komponen dan menu. */
const ITEMS: Record<string, [listKey: string, max: number, keep: (item: ListItem) => boolean]> = {
  packages: ['items', 9, (i) => !!field(i, 'title')],
  film: ['stops', 6, (i) => !!field(i, 'name')],
  included: ['items', 8, (i) => !!field(i, 'title')],
  testimonials: ['items', 6, (i) => !!field(i, 'quote')],
  gallery: ['items', 8, (i) => hasImage(field(i, 'image'))],
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
  // custom (formulir selalu ada), contact, hero, footer
  return true;
}

/** Nomor label perangko ("01") menurut urutan section bernomor yang TAMPIL; section lain → "". */
export function sectionNumber(content: SiteContent, key: string): string {
  const shown = NUMBERED.filter((k) => sectionShown(content, k));
  const index = shown.indexOf(key);
  return index < 0 ? '' : pad2(index + 1);
}

/** Section tampil berikutnya setelah `key` (tujuan tautan "Lewati animasi"), atau null. */
export function nextShown(content: SiteContent, key: string): string | null {
  const start = PAGE_SECTIONS.indexOf(key as (typeof PAGE_SECTIONS)[number]);
  if (start < 0) return null;
  return PAGE_SECTIONS.slice(start + 1).find((k) => k !== 'footer' && sectionShown(content, k)) ?? null;
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

export interface LawatanNavItem {
  key: string;
  label: string;
}

/** Menu singkat (≤ 6 kata benda = label section). */
const NAV: LawatanNavItem[] = [
  { key: 'packages', label: 'Paket' },
  { key: 'film', label: 'Itinerary' },
  { key: 'included', label: 'Termasuk' },
  { key: 'testimonials', label: 'Testimoni' },
  { key: 'faq', label: 'FAQ' },
  { key: 'contact', label: 'Kontak' },
];

/** Menu hanya untuk section yang benar-benar tampil (tanpa tautan mati). */
export function navItems(content: SiteContent): LawatanNavItem[] {
  return NAV.filter(({ key }) => sectionShown(content, key));
}

// ─── Tujuan tautan "#…" ───────────────────────────────────────────────────────

/** Anchor berbahasa Indonesia yang wajar diketik pembeli → kunci section (#kontak, #testimoni, #galeri sudah
 *  diterjemahkan sectionFromAnchor). */
const ANCHOR_ALIASES: Record<string, string> = {
  paket: 'packages',
  'paket-wisata': 'packages',
  itinerary: 'film',
  jadwal: 'film',
  perjalanan: 'film',
  rute: 'film',
  termasuk: 'included',
  fasilitas: 'included',
  hitung: 'custom',
  'hitung-biaya': 'custom',
  biaya: 'custom',
  rancang: 'custom',
  konsultasi: 'custom',
  estimasi: 'custom',
  ulasan: 'testimonials',
  'tanya-jawab': 'faq',
  lokasi: 'contact',
  kantor: 'contact',
};

/** Target tautan section ("paket", "packages", "kontak") → kunci section di halaman, atau null bila tidak dikenal. */
export function sectionTarget(target: string): string | null {
  const clean = sectionFromAnchor(target);
  const key = ANCHOR_ALIASES[clean] ?? clean;
  return KNOWN_SECTIONS.has(key) ? key : null;
}

// ─── Angka & harga ────────────────────────────────────────────────────────────

/** Spasi tak terputus antara angka dan satuan ("Rp1,25 jt" tidak terbelah di akhir baris). */
export const NBSP = String.fromCharCode(160);

/** "39.375.000" (pemisah ribuan titik). */
export const groupThousands = (n: number): string => {
  const value = Math.round(Math.abs(n));
  return `${n < 0 ? '-' : ''}${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};

/** "Rp875.000" */
export const formatRupiah = (n: number): string => `Rp${groupThousands(n)}`;

/** Desimal Indonesia dengan maks. `digits` angka di belakang koma, nol di belakang dibuang: 1.25 → "1,25". */
export const formatDecimal = (n: number, digits = 2): string => {
  const [whole, frac = ''] = (Math.round(n * 10 ** digits) / 10 ** digits).toFixed(digits).split('.');
  const trimmed = frac.replace(/0+$/, '');
  return `${groupThousands(Number(whole))}${trimmed ? `,${trimmed}` : ''}`;
};

/** Harga singkat perangko: < 1 juta → "Rp875rb", ≥ 1 juta → "Rp1,15 jt", < 1.000 → rupiah penuh; 0 / tidak valid → "". */
export function formatPriceShort(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n >= 1e6) return `Rp${formatDecimal(n / 1e6, 2)}${NBSP}jt`;
  if (n >= 1e3) return `Rp${formatDecimal(n / 1e3, 1)}rb`;
  return formatRupiah(n);
}

const UNITS: [RegExp, number][] = [
  [/^(jt|juta)$/i, 1e6],
  [/^(rb|ribu|k)$/i, 1e3],
];

/**
 * Harga dari CMS → rupiah. Angka biasa ("875000", "Rp875.000", "Rp875.000,00") = rupiah; dengan satuan di mana pun
 * ("875 rb", "mulai 1,15 jt", "875rb/orang", "Rp 875 rb per orang") = desimal × satuan. Tidak terbaca → 0 ("Harga
 * menyusul"). Maks. 12 digit.
 */
export function parsePrice(raw: string | number | null | undefined): number {
  const value = String(raw ?? '').trim();
  if (!value) return 0;
  const withUnit = /(\d[\d.,]*)\s*(jt|juta|rb|ribu|k)\b/i.exec(value);
  if (withUnit) {
    const unit = UNITS.find(([pattern]) => pattern.test(withUnit[2]));
    if (unit) {
      const n = Number.parseFloat(withUnit[1].replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
      return Number.isFinite(n) && n > 0 ? Math.round(n * unit[1]) : 0;
    }
  }
  // Tanpa satuan: sen ",00" bukan digit rupiah (hanya di sini; "1,15 jt" di atas tetap desimal)
  const digits = value.replace(/,\d{1,2}(?!\d)/, '').replace(/\D/g, '').slice(0, 12);
  return digits ? Number(digits) : 0;
}

/** Bilangan bulat positif dari CMS ("40", "40 orang") → 40; kosong/tidak valid → 0. */
export const parseCount = (raw: string | null | undefined): number => {
  const n = Number.parseInt(String(raw ?? '').replace(/\D+/g, ' ').trim().split(' ')[0] || '', 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Daftar dari teks dipisah koma, "·", "|", ";" atau baris baru (urut, unik tanpa beda huruf besar-kecil). */
export const splitList = (raw: string, max = 12): string[] => {
  const seen = new Map<string, string>();
  for (const part of (raw || '').split(/\s*[,·|;\n]\s*/)) {
    const value = part.trim();
    if (value && !seen.has(value.toLowerCase())) seen.set(value.toLowerCase(), value);
  }
  return Array.from(seen.values()).slice(0, max);
};

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

// ─── Paket wisata ─────────────────────────────────────────────────────────────

export interface TourPackage {
  /** Urutan di CMS (kunci React) */
  index: number;
  title: string;
  /** Jenis trip paket (untuk saringan), mis. ["Study tour", "Keluarga"] */
  types: string[];
  duration: string;
  /** Minimal peserta (0 = tidak disebut) */
  minPeople: number;
  transport: string;
  /** Harga mulai per orang (rupiah; 0 = harga menyusul) */
  price: number;
  /** Yang termasuk (kartu menampilkan 3 pertama) */
  includes: string[];
  /** Satu baris per hari, tanpa awalan "Hari n" */
  itinerary: string[];
  image: string;
}

/** Baris itinerary: per baris baru, awalan "Hari 1:" / "H1 -" dibuang, maks. 7 hari. */
export const itineraryLines = (raw: string): string[] =>
  (raw || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(hari|h)\s*\d+\s*[:.\-–—]?\s*/i, '').trim())
    .filter(Boolean)
    .slice(0, 7);

export function readPackages(section: SectionContent): TourPackage[] {
  return sectionItems('packages', section).map((item, index) => ({
    index,
    title: field(item, 'title'),
    types: splitList(field(item, 'types'), 5),
    duration: field(item, 'duration'),
    minPeople: parseCount(field(item, 'min_people')),
    transport: field(item, 'transport'),
    price: parsePrice(field(item, 'price')),
    includes: splitList(field(item, 'includes'), 6),
    itinerary: itineraryLines(field(item, 'itinerary')),
    image: field(item, 'image'),
  }));
}

/** Jenis trip untuk chip saringan: isian CMS `trip_types` (maks. 5), kalau kosong dari data paket (urutan muncul). */
export function tripTypes(section: SectionContent, packages: TourPackage[]): string[] {
  const own = splitList(text(section, 'trip_types'), 5);
  return own.length > 0 ? own : splitList(packages.flatMap((p) => p.types).join(','), 5);
}

/** Paket yang cocok dengan jenis trip ('' = semua; tanpa beda huruf besar-kecil). Tidak mengubah daftar asli. */
export const filterPackages = (packages: TourPackage[], type: string): TourPackage[] =>
  type ? packages.filter((p) => p.types.some((t) => same(t, type))) : [...packages];

/**
 * Kolom kisi paket di layar ≥ 1920px: 4 bila baris terakhir penuh/hampir penuh (4, 7, 8 kartu), selain itu tetap 3
 * (6 kartu = 3 + 3, bukan 4 + 2 yang menyisakan lubang; jarak kolom 56px → kartu 560px di 1920).
 */
export const packageColsWide = (count: number): 3 | 4 => (count > 3 && (count % 4 === 0 || count % 4 === 3) ? 4 : 3);

/**
 * Kolom kisi paket di layar ≥ 2400px (kartu tidak melebar ± 790px): 4–6 kartu satu baris (≤ 3 kartu: 4 kolom, sisanya
 * kosong seperti hasil saringan), 7–8 kartu 4 + 3 / 4 + 4, 9 kartu 5 + 4.
 */
export const packageColsHuge = (count: number): 4 | 5 | 6 => (count >= 5 && count <= 6 ? (count as 5 | 6) : count === 9 ? 5 : 4);

/** "6 paket" / "Belum ada paket" (kalimat hasil saringan). */
export const packageCount = (n: number): string => (n === 0 ? 'Belum ada paket' : `${n} paket`);

/** Baris meta kartu: durasi · min. peserta · transport. */
export const packageMeta = (p: TourPackage): string[] => [p.duration, p.minPeople ? `min. ${p.minPeople} orang` : '', p.transport].filter(Boolean);

/** Pesan WhatsApp untuk satu paket. */
export function packageMessage(p: TourPackage, company: string): string {
  const price = p.price > 0 ? ` (mulai ${formatRupiah(p.price)}/orang)` : '';
  return `${company ? `Halo ${company}, kami` : 'Halo, kami'} ingin memesan paket ${p.title}${price}. Mohon info jadwal dan penawarannya. Terima kasih.`;
}

// ─── Formulir hitung & rancang trip ───────────────────────────────────────────

export interface PlanForm {
  /** Judul paket, atau CUSTOM_PACKAGE */
  pkg: string;
  /** Jenis trip ('' = belum dipilih) */
  type: string;
  /** Jumlah peserta (teks isian) */
  people: string;
  /** "Desember 2026" atau UNSURE_MONTH ("Belum ditentukan") */
  month: string;
  hotel: string;
  room: string;
  note: string;
}

export type PlanErrors = Partial<Record<keyof PlanForm, string>>;

export const CUSTOM_PACKAGE = 'Rancang sendiri';
/** Bulan berangkat belum dipilih (tanpa kata "pasti": daftar kata terlarang salinan jujur). */
export const UNSURE_MONTH = 'Belum ditentukan';
export const UNSET = 'Belum ditentukan';
export const HOTELS = [UNSET, 'Bintang 2', 'Bintang 3', 'Bintang 4'] as const;
export const ROOMS = [UNSET, 'Sekamar 2 orang', 'Sekamar 3 orang', 'Sekamar 4 orang'] as const;
export const PEOPLE_LIMITS = [1, 500] as const;
export const PLAN_LIMITS: Record<keyof PlanForm, number> = { pkg: 80, type: 40, people: 3, month: 20, hotel: 20, room: 20, note: 300 };
/** Urutan isian yang divalidasi (fokus ke galat pertama). */
export const PLAN_FIELDS: (keyof PlanForm)[] = ['pkg', 'type', 'people', 'month', 'hotel', 'room'];

/** Nilai awal formulir: paket pertama (kalau ada), 40 peserta, bulan belum ditentukan. */
export const emptyPlan = (firstPackage = '', type = ''): PlanForm => ({
  pkg: firstPackage || CUSTOM_PACKAGE,
  type,
  people: '40',
  month: UNSURE_MONTH,
  hotel: UNSET,
  room: UNSET,
  note: '',
});

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
  `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/** Pilihan rencana berangkat: `count` bulan mulai BULAN DEPAN dari `today` ("2026-10-29" → "November 2026", …). */
export function monthOptions(today: string, count = 12): string[] {
  const m = /^(\d{4})-(\d{2})/.exec(today || '');
  const year = m ? Number(m[1]) : new Date().getFullYear();
  const month = m ? Number(m[2]) - 1 : new Date().getMonth();
  return Array.from({ length: Math.max(0, count) }, (_, i) => {
    const k = month + 1 + i;
    return `${MONTHS[k % 12]} ${year + Math.floor(k / 12)}`;
  });
}

/** Jumlah peserta dari isian: bilangan bulat 1–500, selain itu 0. */
export const peopleOf = (raw: string): number => {
  const value = (raw || '').trim();
  if (!/^\d{1,3}$/.test(value)) return 0;
  const n = Number(value);
  return n >= PEOPLE_LIMITS[0] && n <= PEOPLE_LIMITS[1] ? n : 0;
};

export interface PlanEstimate {
  people: number;
  /** Harga per orang */
  unit: number;
  total: number;
}

/** Estimasi = peserta × harga mulai paket. Tanpa paket/harga atau peserta tidak valid → null. */
export function planEstimate(pkg: TourPackage | null | undefined, people: number): PlanEstimate | null {
  if (!pkg || pkg.price <= 0 || !Number.isInteger(people) || people < PEOPLE_LIMITS[0] || people > PEOPLE_LIMITS[1]) return null;
  return { people, unit: pkg.price, total: pkg.price * people };
}

/** "45 × Rp875.000" */
export const estimateFormula = (e: PlanEstimate): string => `${e.people} × ${formatRupiah(e.unit)}`;

/** Pesan galat per isian (kosong = valid). */
export function validatePlan(form: PlanForm, packageTitles: readonly string[], types: readonly string[], months: readonly string[]): PlanErrors {
  const errors: PlanErrors = {};
  if (form.pkg !== CUSTOM_PACKAGE && !packageTitles.includes(form.pkg)) errors.pkg = 'Pilih paket dari daftar.';
  if (types.length > 0 && !types.includes(form.type)) errors.type = 'Pilih jenis trip.';
  if (!peopleOf(form.people)) errors.people = `Isi jumlah peserta ${PEOPLE_LIMITS[0]}–${PEOPLE_LIMITS[1]}.`;
  if (form.month !== UNSURE_MONTH && !months.includes(form.month)) errors.month = 'Pilih rencana bulan berangkat.';
  if (!(HOTELS as readonly string[]).includes(form.hotel)) errors.hotel = 'Pilih hotel dari daftar.';
  if (!(ROOMS as readonly string[]).includes(form.room)) errors.room = 'Pilih susunan kamar dari daftar.';
  return errors;
}

/**
 * Pesan WhatsApp konsultasi: salam, baris kosong, baris per isian (hotel/kamar/estimasi/catatan kosong tidak ikut).
 * `customLabel` = teks pilihan paket bebas dari CMS (custom.custom_label), sama dengan yang dilihat pengunjung.
 */
export function planMessage(form: PlanForm, estimate: PlanEstimate | null, company: string, customLabel: string = CUSTOM_PACKAGE): string {
  const name = cleanText(company, 80);
  const people = peopleOf(form.people);
  const note = cleanText(form.note, PLAN_LIMITS.note);
  const rows = [
    `Paket: ${form.pkg === CUSTOM_PACKAGE ? cleanText(customLabel || CUSTOM_PACKAGE, 30) || CUSTOM_PACKAGE : cleanText(form.pkg, PLAN_LIMITS.pkg)}`,
    `Jenis trip: ${cleanText(form.type, PLAN_LIMITS.type) || 'Belum ditentukan'}`,
    `Jumlah peserta: ${people} orang`,
    `Rencana berangkat: ${form.month}`,
    form.hotel !== UNSET && `Hotel: ${form.hotel}`,
    form.room !== UNSET && `Kamar: ${form.room}`,
    estimate && `Perkiraan total: ${formatRupiah(estimate.total)} (${estimateFormula(estimate)}, estimasi)`,
    note && `Catatan: ${note}`,
  ].filter(Boolean);
  return `${name ? `Halo ${name}, kami` : 'Halo, kami'} ingin konsultasi paket wisata.\n\n${rows.join('\n')}\n\nMohon info penawaran lengkapnya. Terima kasih.`;
}

/** mailto: dengan subjek dan isi pesan (dipotong 1800 huruf); email tidak valid → "". */
export function messageMailHref(email: string, subject: string, body: string): string {
  const mail = mailHref(email);
  if (!mail) return '';
  return `${mail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(Array.from(body).slice(0, 1800).join(''))}`;
}

// ─── Film itinerary ───────────────────────────────────────────────────────────

export interface FilmStop {
  index: number;
  name: string;
  day: string;
  time: string;
  /** Jarak tempuh KUMULATIF sejak berangkat (km, naik di setiap titik), null bila kosong/tidak valid */
  km: number | null;
  text: string;
  image: string;
}

/** "105" → 105, "12,6" → 13, "1.150" (titik ribuan Indonesia) → 1150; selain itu null. */
const kmOf = (raw: string): number | null => {
  const value = (raw || '').trim().replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  if (!/^\d{1,5}(\.\d+)?$/.test(value)) return null;
  return Math.round(Number(value));
};

export function readStops(section: SectionContent): FilmStop[] {
  return sectionItems('film', section).map((item, index) => ({
    index,
    name: field(item, 'name'),
    day: field(item, 'day'),
    time: field(item, 'time'),
    km: kmOf(field(item, 'km')),
    text: field(item, 'text'),
    image: field(item, 'image'),
  }));
}

/** Panjang trek film (× tinggi layar) — layar lebar 4, HP 3 (≈ 0,75 × 4). */
export const FILM_TRACK = { wide: 4, phone: 3 } as const;

/**
 * Ukuran panggung film dari tinggi terlihat & lebarnya (px): panggung pendek → 'compact' (kalimat kartu disembunyikan
 * secara visual agar kartu ≥ 200px tetap muat; lihat ./lawatan.css). Batas: layar lebar (≥ 768px) < 610px, HP < 546px.
 */
export const filmSize = (viewHeight: number, width: number): 'regular' | 'compact' => (viewHeight < (width >= 768 ? 610 : 546) ? 'compact' : 'regular');

/**
 * Panggung film TIDAK muat (tinggi terlihat px di bawah header lengket, lebar wadah px): penghitung + pita rute + kartu pos
 * ringkas butuh ± 520px di layar lebar dan ± 460px di HP. HP mendatar (740×360, 844×390, 915×412) → true → papan cerita
 * statis; laptop 1024×600 dan HP tegak 320×568 tetap memutar film.
 */
export const filmTooShort = (viewHeight: number, width: number): boolean => viewHeight < (width >= 768 ? 520 : 460);

/**
 * Tinggi terlihat yang stabil: di layar sentuh, perubahan tinggi < 160px pada lebar yang sama (bilah alamat HP muncul/
 * hilang saat arah gulir berbalik) diabaikan, jadi panjang trek & kemajuan film tidak melompat. Lebar berubah (diputar),
 * perubahan besar, atau penunjuk halus (mouse) → nilai baru.
 */
export const steadyHeight = (next: number, last: number, sameWidth: boolean, coarse: boolean): number =>
  coarse && last > 0 && sameWidth && Math.abs(next - last) < 160 ? last : next;

/**
 * Kemajuan REL kartu pos dengan jeda di setiap titik (4 desimal): di tiap bab rel diam pada ¼ pertama dan ¼ terakhir jarak
 * antar-titik, lalu bergeser halus (smoothstep) di tengahnya — kartu aktif selalu berhenti utuh di tempatnya, sementara
 * bus, garis tempuh, dan km tetap mengikuti p apa adanya. Pembulatan q × (n − 1) = chapterAt(p).
 */
export function reelProgress(p: number, n: number): number {
  if (n <= 1 || !Number.isFinite(p)) return 0;
  const x = Math.min(1, Math.max(0, p)) * (n - 1);
  const i = Math.min(n - 2, Math.floor(x));
  const t = Math.min(1, Math.max(0, (x - i - 0.25) / 0.5));
  return Math.round(((i + t * t * (3 - 2 * t)) / (n - 1)) * 10000) / 10000;
}

/** Film bergerak butuh ≥ 2 titik; selain itu papan cerita statis. */
export const filmPlayable = (stops: readonly FilmStop[]): boolean => stops.length >= 2;

/** Posisi titik ke-i di garis rute (0 … 1). */
export const stopPosition = (i: number, n: number): number => (n <= 1 ? 0 : Math.min(1, Math.max(0, i / (n - 1))));

/** Bab aktif untuk kemajuan p (0 … 1): titik terdekat. */
export const chapterAt = (p: number, n: number): number => {
  if (n <= 1 || !Number.isFinite(p)) return 0;
  return Math.min(n - 1, Math.max(0, Math.round(Math.min(1, Math.max(0, p)) * (n - 1))));
};

/** Jendela kemajuan per bab: [awal, akhir] di sekitar titiknya (bab pertama mulai 0, terakhir berakhir 1). */
export function chapterWindows(n: number): { start: number; end: number }[] {
  if (n <= 0) return [];
  if (n === 1) return [{ start: 0, end: 1 }];
  const half = 0.5 / (n - 1);
  return Array.from({ length: n }, (_, i) => ({
    start: Math.max(0, Number((i / (n - 1) - half).toFixed(4))),
    end: Math.min(1, Number((i / (n - 1) + half).toFixed(4))),
  }));
}

/**
 * Kemajuan film (kontrak batch §C): p = clamp((viewTop − trackTop) / (trackHeight − viewHeight), 0, 1), 4 desimal.
 * viewTop = tepi atas area terlihat (wadah gulir/jendela + header lengket), trackTop = tepi atas trek (koordinat yang
 * sama), trackHeight = tinggi trek, viewHeight = tinggi terlihat. Trek tidak lebih tinggi dari layar → 0.
 */
export function filmProgress(viewTop: number, trackTop: number, trackHeight: number, viewHeight: number): number {
  const range = trackHeight - viewHeight;
  if (!(range > 0) || !Number.isFinite(viewTop) || !Number.isFinite(trackTop)) return 0;
  return Math.round(Math.min(1, Math.max(0, (viewTop - trackTop) / range)) * 10000) / 10000;
}

/** Penghitung km tampil bila SEMUA titik punya km (≥ 2 titik). */
export const filmHasKm = (stops: readonly FilmStop[]): boolean => stops.length >= 2 && stops.every((s) => s.km !== null);

/** Km pada kemajuan p dari daftar km per titik: interpolasi lurus antar-titik, dibulatkan; < 2 titik → 0. */
export function kmAlong(kms: readonly number[], p: number): number {
  if (kms.length < 2 || kms.some((k) => !Number.isFinite(k))) return 0;
  const x = Math.min(1, Math.max(0, Number.isFinite(p) ? p : 0)) * (kms.length - 1);
  const i = Math.min(kms.length - 2, Math.floor(x));
  return Math.round(kms[i] + (kms[i + 1] - kms[i]) * (x - i));
}

/** Km pada kemajuan p untuk titik film (0 bila tidak semua titik punya km). */
export const kmAt = (stops: readonly FilmStop[], p: number): number => (filmHasKm(stops) ? kmAlong(stops.map((s) => s.km as number), p) : 0);

/** Bagian hari dari jam "06.00" / "15:30" (warna suasana panggung film): < 10 pagi, < 15 siang, < 18 sore, selain itu malam; tak terbaca → siang. */
export function dayPart(time: string): 'pagi' | 'siang' | 'sore' | 'malam' {
  const match = /^(\d{1,2})[.:]/.exec((time || '').trim());
  const hour = match ? Number(match[1]) : 12;
  if (hour < 4 || hour >= 18) return 'malam';
  if (hour < 10) return 'pagi';
  if (hour < 15) return 'siang';
  return 'sore';
}

/** "Hari 1 · 06.00" */
export const stopStamp = (s: FilmStop): string => [s.day, s.time].filter(Boolean).join(' · ');

// ─── Galeri ───────────────────────────────────────────────────────────────────

export type GallerySpan = 'tall' | 'wide' | 'one';

/**
 * Mosaik persegi panjang penuh (kisi 4 kolom layar lebar / 2 kolom HP, tanpa lubang) untuk tepat 6 foto (4 × 2 sel; HP
 * 2 × 4) atau 8 foto (4 × 3 sel; HP 2 × 6); jumlah lain → kisi rata.
 */
export const galleryLayout = (count: number): GallerySpan[] =>
  count === 8
    ? ['tall', 'wide', 'one', 'one', 'one', 'tall', 'wide', 'one']
    : count === 6
      ? ['tall', 'wide', 'one', 'one', 'one', 'one']
      : Array.from({ length: Math.max(0, count) }, () => 'one');

// ─── Testimoni ────────────────────────────────────────────────────────────────

/**
 * Kutipan dipecah agar kata berstrip ("terburu-buru", "Bromo-nya") tidak terbelah di akhir baris: indeks GANJIL = kata
 * berstrip (dibungkus whitespace-nowrap oleh komponen), indeks genap = teks biasa.
 */
export const splitHyphenated = (quote: string): string[] => (quote || '').split(/(\S+-\S+)/);

/** Nama tanpa sapaan ("Pak Hendra" → "Hendra", "Bu Siti" → "Siti") untuk inisial avatar. */
export const withoutHonorific = (name: string): string => (name || '').replace(/^(bapak|pak|ibu|bu|mas|mbak|kak)\.?\s+/i, '');

// ─── Lain-lain ────────────────────────────────────────────────────────────────

/** Nomor HP Indonesia yang ditulis rapat ("081234567890") → "0812-3456-7890" untuk dibaca; format lain apa adanya. */
export const displayPhone = (raw: string): string => {
  const value = (raw || '').trim();
  return /^08\d{8,11}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8)}` : value;
};

/** Kata pada perangko besar footer: kata pertama nama merek tanpa PT/CV ("Lawatan Tour & Travel" → "Lawatan"). */
export const stampWordOf = (company: string): string => company.replace(/^(pt|cv|ud)\.?\s+/i, '').trim().split(/\s+/)[0] || company;

export interface SocialLink {
  key: string;
  label: string;
  href: string;
}

export const socialLinks = (footer: SectionContent): SocialLink[] =>
  SOCIAL_FIELDS.map(({ key, label }) => ({ key, label, href: safeUrl(text(footer, key)) ?? '' })).filter((s) => s.href);

// ─── Model ────────────────────────────────────────────────────────────────────

export function readLawatan(content: SiteContent) {
  const section = (key: string) => getSection(content, key);
  const brand = section('brand');
  const hero = section('hero');
  const packages = section('packages');
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
  /** Tujuan "Konsultasi Trip": formulir hitung biaya, kalau tidak Kontak, kalau tidak WhatsApp. */
  const consultAction: LinkAction | null = sectionAction('custom') ?? sectionAction('contact') ?? waAction;
  /**
   * Isi field URL: "#paket", "#hitung", "#kontak" dsb. hanya bila section itu tampil (anchor Indonesia diterjemahkan);
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

  const packageList = shown('packages') ? readPackages(packages) : [];

  return {
    brand,
    hero,
    packages,
    film: section('film'),
    included: section('included'),
    custom: section('custom'),
    testimonials: section('testimonials'),
    gallery: section('gallery'),
    faq: section('faq'),
    contact,
    footer,
    companyName,
    stampWord: stampWordOf(companyName),
    tagline: text(brand, 'tagline'),
    logo: text(brand, 'logo'),
    colors: lawatanVars(text(brand, 'accent_color')),
    whatsapp,
    waAction,
    consultAction,
    shown,
    items,
    sectionAction,
    linkOr,
    waWith,
    /** Nomor label perangko per section ("01") */
    number: (key: string) => sectionNumber(content, key),
    next: (key: string) => nextShown(content, key),
    /** Paket yang dirender (urutan CMS) */
    tours: packageList,
    types: tripTypes(packages, packageList),
    stops: shown('film') ? readStops(section('film')) : [],
    headerLabel: text(hero, 'header_label'),
    headerAction: linkOr(text(hero, 'header_url'), consultAction),
    nav: navItems(content),
    socials: socialLinks(footer),
    map: mapsInfo(text(contact, 'maps_url'), text(contact, 'maps_query') || text(contact, 'address')),
    year: new Date().getFullYear(),
  };
}

export type LawatanModel = ReturnType<typeof readLawatan>;
