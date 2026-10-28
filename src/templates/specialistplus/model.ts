// Turunan konten SpecialistPlus (fungsi murni, tanpa React): warna tema (navy, versi terang teal), section yang tampil,
// menu, kode label "SPX-02 · MCU", tujuan tautan, klinik spesialis + dokternya (hari praktik gabungan untuk konsol
// hero), pesan WhatsApp daftar dokter & pesan paket MCU, matriks perbandingan MCU, kelompok batang waktu hasil, baris
// spesifikasi alat, dan formulir permintaan hasil lab. Semua tahan konten mentah (null, angka, list rusak). Formulir
// hanya MENYUSUN pesan: tidak ada data yang dikirim ke server, disimpan di website, atau ditempel ke URL portal.
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
import { SPECIALISTPLUS_ACCENT } from './defaultContent';

// ─── Warna ────────────────────────────────────────────────────────────────────

type Rgb = [number, number, number];
const WHITE: Rgb = [255, 255, 255];
/** Tinta gelap --tpl-on-accent untuk warna tema terang (= INK di shared/utils accentVars) */
const ON_LIGHT: Rgb = [18, 22, 32];
/** Navy dasar #0B1A38: 95% navy + 5% warna tema = #0B203C untuk teal bawaan */
const NAVY_BASE: Rgb = [11, 26, 56];
/** Hitam kebiruan untuk menggelapkan navy bila warna tema sangat terang */
const NIGHT: Rgb = [6, 12, 24];
const toHex = (rgb: Rgb) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
/** Campuran dibulatkan: kontras dihitung dari warna yang benar-benar ditulis sebagai hex. */
const mix = (a: Rgb, b: Rgb, amountOfA: number): Rgb => a.map((c, i) => Math.round(c * amountOfA + b[i] * (1 - amountOfA))) as Rgb;

const accentOf = (raw: string): Rgb => parseHex(raw) ?? (parseHex(SPECIALISTPLUS_ACCENT) as Rgb);

/**
 * Variabel warna lokal SpecialistPlus (di samping --tpl-accent* milik Shell), semuanya dari SATU warna tema:
 * --spx-navy: navy header/hero/pita hasil lab/footer (navy dasar + 5% warna tema), putih ≥ 14:1;
 * --spx-navy-2: navy sedikit lebih terang (hover tombol navy);
 * --spx-lift: permukaan paling terang di atas navy (putih 12%) — batas bawah kontras teks terang;
 * --spx-bright: warna tema dicerahkan sampai ≥ 4,5:1 di atas navy DAN --spx-lift (teks teal di navy).
 */
export function spxVars(accentRaw: string): CSSProperties {
  const accent = accentOf(accentRaw);
  let navy = mix(accent, NAVY_BASE, 0.05);
  for (let i = 0; i < 12 && contrast(navy, WHITE) < 14; i += 1) navy = mix(navy, NIGHT, 0.8);
  const lift = mix(WHITE, navy, 0.12);
  let bright = accent;
  for (let i = 0; i < 24 && (contrast(bright, navy) < 4.5 || contrast(bright, lift) < 4.5); i += 1) bright = mix(bright, WHITE, 0.8);
  return {
    '--spx-navy': toHex(navy),
    '--spx-navy-2': toHex(mix(WHITE, navy, 0.08)),
    '--spx-lift': toHex(lift),
    '--spx-bright': toHex(bright),
  } as CSSProperties;
}

/** true bila teks di atas bidang warna tema berwarna putih (aturan sama dengan --tpl-on-accent di accentVars). */
export function accentIsDark(accentRaw: string): boolean {
  const accent = accentOf(accentRaw);
  return contrast(accent, WHITE) >= contrast(accent, ON_LIGHT);
}

// ─── Teks kecil ───────────────────────────────────────────────────────────────

/** Label dipisah "·", "|", "/" atau koma → daftar. */
export const splitTags = (raw: string): string[] =>
  (raw || '')
    .split(/\s*[·|,•]\s*|\s+\/\s+/)
    .map((tag) => tag.trim())
    .filter(Boolean);

/** Nomor dua digit "01". */
export const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Kode label section: "SPX-02" (dengan awalan) atau "02" (tanpa); nomor kosong → "". */
export function labelCode(prefix: string, number: string): string {
  if (!number) return '';
  const clean = (prefix || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6);
  return clean ? `${clean}-${number}` : number;
}

/** Nomor HP Indonesia yang ditulis rapat ("081234567890") → "0812-3456-7890"; format lain apa adanya. */
export const displayPhone = (raw: string): string => {
  const value = (raw || '').trim();
  return /^08\d{8,11}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8)}` : value;
};

/** Teks bersih satu baris: karakter kontrol dibuang, spasi dirapikan, dipotong ke `max`. */
export function cleanText(raw: string, max: number): string {
  const visible = Array.from(String(raw ?? ''), (ch) => {
    const code = ch.charCodeAt(0);
    return code < 32 || code === 127 ? ' ' : ch;
  }).join('');
  return Array.from(visible.replace(/\s+/g, ' ').trim()).slice(0, max).join('').trim();
}

/** Inisial dokter tanpa gelar: "dr. Lintang Harahap, Sp.JP" → "LH"; "Prof. Dr. dr. Budi Santoso" → "BS". */
export function doctorInitials(name: string): string {
  const core = (name || '')
    .replace(/,.*$/, '')
    .replace(/^((prof|dr|drg|ns|apt|h|hj)\.?\s+)+/i, '')
    .trim();
  const words = core.split(/\s+/).filter((w) => /^[A-Za-zÀ-ÿ]/.test(w));
  const letters = words.length > 1 ? [words[0][0], words[words.length - 1][0]] : words.length === 1 ? [words[0][0]] : ['?'];
  return letters.join('').toUpperCase();
}

// ─── Section di halaman ───────────────────────────────────────────────────────

/** Kunci section yang punya tempat di halaman (urutan halaman; = section skema tanpa `brand`). */
export const PAGE_SECTIONS = [
  'hero',
  'specialists',
  'mcu',
  'labresults',
  'technology',
  'turnaround',
  'testimonials',
  'faq',
  'contact',
  'footer',
] as const;
const KNOWN_SECTIONS = new Set<string>(PAGE_SECTIONS);

/** Section yang memakai kode label "SPX-01 · …" (urutan halaman). */
const NUMBERED = ['specialists', 'mcu', 'labresults', 'technology', 'turnaround', 'testimonials', 'faq', 'contact'];

/** [kunci list, maks. item (= skema), syarat item dirender] per section. Satu sumber untuk komponen, menu, nomor. */
const ITEMS: Record<string, [listKey: string, max: number, keep: (item: ListItem) => boolean]> = {
  specialists: ['items', 8, (i) => !!(field(i, 'tab') || field(i, 'name'))],
  technology: ['items', 6, (i) => !!field(i, 'name')],
  turnaround: ['items', 12, (i) => !!field(i, 'name') && toNumber(field(i, 'value')) > 0],
  testimonials: ['items', 6, (i) => !!field(i, 'quote')],
  faq: ['items', 8, (i) => !!field(i, 'question')],
};

/** Angka dari teks CMS ("6", "1,5", "± 6") → number; selain itu 0. */
export function toNumber(raw: string): number {
  const match = /(\d+(?:[.,]\d+)?)/.exec(String(raw ?? ''));
  if (!match) return 0;
  const value = Number(match[1].replace(',', '.'));
  return Number.isFinite(value) ? value : 0;
}

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
  if (key === 'mcu') return mcuMatrix(list(s, 'packages', 4), list(s, 'rows', 16)).packages.length > 0;
  return true;
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

export interface SpxNavItem {
  key: string;
  label: string;
}

const NAV: SpxNavItem[] = [
  { key: 'specialists', label: 'Spesialis' },
  { key: 'mcu', label: 'Paket MCU' },
  { key: 'labresults', label: 'Hasil Lab' },
  { key: 'technology', label: 'Teknologi' },
  { key: 'faq', label: 'FAQ' },
  { key: 'contact', label: 'Kontak' },
];

/** Label menu dari label section bila singkat (≤ 14 huruf, ≤ 2 kata), selain itu label bawaan. */
const shortLabel = (section: SectionContent, fallback: string) => {
  const eyebrow = text(section, 'eyebrow');
  return eyebrow && eyebrow.length <= 14 && eyebrow.split(/\s+/).length <= 2 ? eyebrow : fallback;
};

/** Menu hanya untuk section yang benar-benar tampil (tanpa tautan mati). */
export function navItems(content: SiteContent): SpxNavItem[] {
  return NAV.filter(({ key }) => sectionShown(content, key)).map(({ key, label }) => ({ key, label: shortLabel(getSection(content, key), label) }));
}

// ─── Tujuan tautan "#…" ───────────────────────────────────────────────────────

/** Anchor berbahasa Indonesia yang wajar diketik pembeli → kunci section (#kontak, #testimoni sudah diterjemahkan
 *  sectionFromAnchor). */
const ANCHOR_ALIASES: Record<string, string> = {
  spesialis: 'specialists',
  klinik: 'specialists',
  dokter: 'specialists',
  'jadwal-dokter': 'specialists',
  jadwal: 'specialists',
  paket: 'mcu',
  'paket-mcu': 'mcu',
  'medical-check-up': 'mcu',
  'hasil-lab': 'labresults',
  lab: 'labresults',
  hasil: 'labresults',
  teknologi: 'technology',
  alat: 'technology',
  'waktu-hasil': 'turnaround',
  'tanya-jawab': 'faq',
  lokasi: 'contact',
  pendaftaran: 'contact',
};

/** Target tautan section ("hasil-lab", "mcu", "kontak") → kunci section di halaman, atau null bila tidak dikenal. */
export function sectionTarget(target: string): string | null {
  const clean = sectionFromAnchor(target);
  const key = ANCHOR_ALIASES[clean] ?? clean;
  return KNOWN_SECTIONS.has(key) ? key : null;
}

// ─── Klinik spesialis & dokter ────────────────────────────────────────────────

/** Urutan hari (Senin dulu) dan singkatannya. */
export const DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'] as const;
const DAY_PREFIX: Record<string, number> = { sen: 0, sel: 1, rab: 2, kam: 3, jum: 4, sab: 5, min: 6, ahd: 6 };

/** Indeks hari dari teks "Sen · Rab · Jum", "Senin, Kamis", "Sen–Jum" (rentang diperluas). Unik & urut. */
export function dayIndexes(raw: string): number[] {
  const found = new Set<number>();
  const value = String(raw ?? '').toLowerCase();
  for (const part of value.split(/[·|,/•]|\s+dan\s+/)) {
    const range = /([a-z]{3})[a-z]*\s*[–—-]\s*([a-z]{3})/.exec(part);
    if (range && range[1] in DAY_PREFIX && range[2] in DAY_PREFIX) {
      const from = DAY_PREFIX[range[1]];
      const to = DAY_PREFIX[range[2]];
      for (let d = from; d <= (to >= from ? to : to + 7); d += 1) found.add(d % 7);
      continue;
    }
    for (const word of part.match(/[a-z]+/g) ?? []) {
      const key = word.slice(0, 3);
      if (key in DAY_PREFIX) found.add(DAY_PREFIX[key]);
    }
  }
  return Array.from(found).sort((a, b) => a - b);
}

/** Hari berurutan → teks ringkas: tiga hari atau lebih berturut-turut jadi rentang ("Sen–Jum"); kosong → "". */
export function compactDays(indexes: number[]): string {
  const days = Array.from(new Set(indexes)).filter((d) => d >= 0 && d < 7).sort((a, b) => a - b);
  const parts: string[] = [];
  let i = 0;
  while (i < days.length) {
    let j = i;
    while (j + 1 < days.length && days[j + 1] === days[j] + 1) j += 1;
    if (j - i >= 2) parts.push(`${DAYS[days[i]]}–${DAYS[days[j]]}`);
    else for (let k = i; k <= j; k += 1) parts.push(DAYS[days[k]]);
    i = j + 1;
  }
  return parts.join(' · ');
}

/** Kunci perbandingan nama klinik (huruf kecil, tanpa spasi ganda). */
const clinicKey = (raw: string) => cleanText(raw, 60).toLowerCase();

export interface Specialty {
  index: number;
  tab: string;
  name: string;
  code: string;
  summary: string;
  conditions: string[];
  procedures: string[];
  nextSlot: string;
  image: string;
  doctors: ListItem[];
  /** Hari praktik gabungan semua dokter klinik ini, mis. "Sen–Jum" ("" bila tidak ada) */
  days: string;
}

/**
 * Klinik spesialis yang dirender (maks. 8) beserta dokternya. Dokter cocok bila kolom "Klinik" sama dengan nama tab,
 * nama lengkap, atau kode klinik (huruf besar/kecil diabaikan).
 */
export function specialtiesOf(section: SectionContent): Specialty[] {
  const doctors = list(section, 'doctors', 24).filter((d) => !!field(d, 'name'));
  return sectionItems('specialists', section).map((item, index) => {
    const tab = field(item, 'tab') || field(item, 'name');
    const name = field(item, 'name') || tab;
    const code = field(item, 'code').toUpperCase().slice(0, 4);
    const keys = new Set([tab, name, code].filter(Boolean).map(clinicKey));
    const own = doctors.filter((d) => keys.has(clinicKey(field(d, 'clinic'))));
    return {
      index,
      tab,
      name,
      code,
      summary: field(item, 'summary'),
      conditions: splitTags(field(item, 'conditions')),
      procedures: splitTags(field(item, 'procedures')),
      nextSlot: field(item, 'next_slot'),
      image: field(item, 'image'),
      doctors: own,
      days: compactDays(own.flatMap((d) => dayIndexes(field(d, 'days')))),
    };
  });
}

/** Pesan WhatsApp daftar konsultasi ke satu dokter. */
export function registerMessage(doctor: ListItem, clinic: string, companyName: string): string {
  const name = cleanText(field(doctor, 'name'), 60);
  const days = cleanText(field(doctor, 'days'), 40);
  const hours = cleanText(field(doctor, 'hours'), 24);
  const company = cleanText(companyName, 80);
  const schedule = [days, hours].filter(Boolean).join(', ');
  const greeting = company ? `Halo ${company}, saya ingin mendaftar konsultasi.` : 'Halo, saya ingin mendaftar konsultasi.';
  const rows = [
    `Dokter: ${name}`,
    clinic && `Klinik: ${cleanText(clinic, 48)}`,
    schedule && `Jadwal: ${schedule}`,
    'Mohon info slot yang tersedia.',
  ].filter(Boolean);
  return `${greeting}\n\n${rows.join('\n')}`;
}

// ─── Paket MCU ────────────────────────────────────────────────────────────────

export interface McuPackage {
  code: string;
  name: string;
  price: string;
  audience: string;
  duration: string;
  badge: string;
}

export interface McuRow {
  label: string;
  /** Termasuk di paket ke-i (urutan = `packages`) */
  cells: boolean[];
}

export interface McuMatrix {
  packages: McuPackage[];
  rows: McuRow[];
}

/** Kode paket dari teks "A · B · C", "a, c", "A/B" → set huruf besar. */
export const packageCodes = (raw: string): Set<string> =>
  new Set(
    String(raw ?? '')
      .split(/[\s·|,/•]+/)
      .map((code) => code.trim().toUpperCase())
      .filter(Boolean),
  );

/**
 * Matriks perbandingan MCU: paket bernama (maks. 4; kode kosong → A, B, C, D sesuai urutan) dan pemeriksaan berlabel
 * (maks. 16) dengan tanda termasuk per paket berdasarkan kode di kolom "Termasuk di paket".
 */
export function mcuMatrix(rawPackages: ListItem[], rawRows: ListItem[]): McuMatrix {
  const packages: McuPackage[] = rawPackages
    .filter((p) => !!field(p, 'name'))
    .slice(0, 4)
    .map((p, i) => ({
      code: (field(p, 'code').toUpperCase().replace(/[^A-Z0-9]/g, '') || String.fromCharCode(65 + i)).slice(0, 2),
      name: field(p, 'name'),
      price: field(p, 'price'),
      audience: field(p, 'audience'),
      duration: field(p, 'duration'),
      badge: field(p, 'badge'),
    }));
  const rows = rawRows
    .filter((r) => !!field(r, 'label'))
    .slice(0, 16)
    .map((r) => {
      const codes = packageCodes(field(r, 'packages'));
      return { label: field(r, 'label'), cells: packages.map((p) => codes.has(p.code)) };
    });
  return { packages, rows };
}

/** Jumlah pemeriksaan yang termasuk di paket ke-`i`. */
export const includedCount = (matrix: McuMatrix, i: number): number => matrix.rows.filter((row) => row.cells[i]).length;

/** Pesan WhatsApp pesan paket MCU. */
export function mcuMessage(pkg: McuPackage, companyName: string): string {
  const company = cleanText(companyName, 80);
  const name = cleanText(pkg.name, 28);
  const price = cleanText(pkg.price, 16);
  const greeting = company ? `Halo ${company},` : 'Halo,';
  return `${greeting} saya ingin memesan Paket MCU ${name}${price ? ` (${price})` : ''}. Mohon info jadwal dan persiapannya.`;
}

// ─── Waktu hasil ──────────────────────────────────────────────────────────────

export interface TurnaroundRow {
  name: string;
  value: number;
  unit: string;
  /** Teks nilai, mis. "6 jam" */
  label: string;
  /** Lebar batang (persen dari nilai terbesar di kelompoknya, min. 6) */
  width: number;
}

export interface TurnaroundGroup {
  name: string;
  unit: string;
  max: number;
  rows: TurnaroundRow[];
}

const formatNumber = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10).replace('.', ','));

/** Pemeriksaan dikelompokkan menurut kolom "Kelompok" (urutan kemunculan; kosong → "Pemeriksaan"). */
export function turnaroundGroups(items: ListItem[]): TurnaroundGroup[] {
  const groups = new Map<string, { name: string; rows: Omit<TurnaroundRow, 'width'>[] }>();
  for (const item of items) {
    const value = toNumber(field(item, 'value'));
    if (!field(item, 'name') || value <= 0) continue;
    const name = field(item, 'group') || 'Pemeriksaan';
    const key = name.toLowerCase();
    if (!groups.has(key)) groups.set(key, { name, rows: [] });
    const unit = field(item, 'unit');
    groups.get(key)!.rows.push({ name: field(item, 'name'), value, unit, label: [formatNumber(value), unit].filter(Boolean).join(' ') });
  }
  return Array.from(groups.values()).map((group) => {
    const max = Math.max(...group.rows.map((row) => row.value));
    const units = Array.from(new Set(group.rows.map((row) => row.unit).filter(Boolean)));
    return {
      name: group.name,
      unit: units.length === 1 ? units[0] : '',
      max,
      rows: group.rows.map((row) => ({ ...row, width: Math.max(6, Math.round((row.value / max) * 100)) })),
    };
  });
}

// ─── Spesifikasi alat ─────────────────────────────────────────────────────────

/** "Label: nilai" per baris → baris spesifikasi (maks. 4; baris tanpa ":" jadi nilai tanpa label). */
export function specRows(raw: string): { label: string; value: string }[] {
  return String(raw ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4)
    .map((line) => {
      const at = line.indexOf(':');
      return at > 0 ? { label: line.slice(0, at).trim(), value: line.slice(at + 1).trim() } : { label: '', value: line };
    })
    .filter((row) => row.value || row.label);
}

// ─── Formulir permintaan hasil lab ────────────────────────────────────────────

export const CHANNELS = ['WhatsApp', 'Email', 'Ambil di lab'] as const;
export type Channel = (typeof CHANNELS)[number];

export interface LabForm {
  reg: string;
  /** yyyy-mm-dd (input type=date) */
  birth: string;
  name: string;
  channel: Channel;
}

export type LabErrors = Partial<Record<keyof LabForm, string>>;

export const EMPTY_LAB: LabForm = { reg: '', birth: '', name: '', channel: 'WhatsApp' };

/** Batas panjang per isian (juga atribut maxLength). */
export const LAB_LIMITS: Record<'reg' | 'name', number> = { reg: 24, name: 60 };

/** Urutan isian wajib (fokus ke galat pertama). */
export const LAB_REQUIRED: (keyof LabForm)[] = ['reg', 'birth', 'name'];

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/** "1980-03-12" → "12 Maret 1980"; tanggal tidak valid → "". */
export function formatBirth(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((iso || '').trim());
  if (!match) return '';
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return '';
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** Tanggal hari ini (zona waktu pengunjung) sebagai "yyyy-mm-dd". */
export const todayIso = (now = new Date()): string =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

/** Pesan galat per isian wajib (kosong = valid). `today` = "yyyy-mm-dd". */
export function validateLab(form: LabForm, today: string): LabErrors {
  const errors: LabErrors = {};
  const reg = cleanText(form.reg, LAB_LIMITS.reg);
  if (reg.length < 4 || !/^[A-Za-z0-9][A-Za-z0-9/.-]*$/.test(reg.replace(/\s+/g, ''))) errors.reg = 'Tulis nomor registrasi (huruf, angka, atau tanda -).';
  const birth = (form.birth || '').trim();
  if (!formatBirth(birth)) errors.birth = 'Pilih tanggal lahir.';
  else if (birth < '1900-01-01' || birth > today) errors.birth = 'Tanggal lahir tidak valid.';
  if (cleanText(form.name, LAB_LIMITS.name).length < 2) errors.name = 'Tulis nama pasien.';
  return errors;
}

/** Pesan WhatsApp permintaan hasil lab (tanpa hasil apa pun; admin yang mencocokkan data). */
export function labMessage(form: LabForm, companyName: string): string {
  const company = cleanText(companyName, 80);
  const channel = (CHANNELS as readonly string[]).includes(form.channel) ? form.channel : 'WhatsApp';
  const greeting = company
    ? `Halo ${company}, saya ingin meminta hasil pemeriksaan laboratorium.`
    : 'Halo, saya ingin meminta hasil pemeriksaan laboratorium.';
  const rows = [
    `No. registrasi: ${cleanText(form.reg, LAB_LIMITS.reg).replace(/\s+/g, '')}`,
    `Nama pasien: ${cleanText(form.name, LAB_LIMITS.name)}`,
    `Tanggal lahir: ${formatBirth(form.birth)}`,
    `Kirim hasil lewat: ${channel}`,
  ];
  return `${greeting}\n\n${rows.join('\n')}`;
}

/** mailto: dengan subjek dan isi pesan (dipotong 1800 huruf); email tidak valid → "". */
export function mailWith(email: string, subject: string, body: string): string {
  const mail = mailHref(email);
  if (!mail) return '';
  return `${mail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(Array.from(body).slice(0, 1800).join(''))}`;
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

export function readSpecialistPlus(content: SiteContent) {
  const section = (key: string) => getSection(content, key);
  const brand = section('brand');
  const hero = section('hero');
  const specialists = section('specialists');
  const mcu = section('mcu');
  const contact = section('contact');
  const footer = section('footer');

  const companyName = text(brand, 'company_name') || 'Nama Klinik';
  const whatsapp = text(contact, 'whatsapp');
  const waLink = whatsappHref(whatsapp, text(contact, 'whatsapp_message'));
  const waAction: LinkAction | null = waLink ? { kind: 'external', href: waLink } : null;

  /** Section tampil & berisi di halaman (sectionShown). */
  const shown = (key: string): boolean => sectionShown(content, key);
  /** Item yang dirender untuk section `key` (sectionItems). */
  const items = (key: string): ListItem[] => sectionItems(key, section(key));
  const sectionAction = (key: string): LinkAction | null => (shown(key) ? { kind: 'section', target: key } : null);
  const contactAction = isEnabled(contact) ? ({ kind: 'section', target: 'contact' } as LinkAction) : null;
  /**
   * Isi field URL: "#spesialis", "#hasil-lab", "#kontak" dsb. hanya bila section itu tampil (anchor Indonesia
   * diterjemahkan); anchor tak dikenal / section tersembunyi / kosong → `fallback`.
   */
  const linkOr = (raw: string, fallback: LinkAction | null): LinkAction | null => {
    const action = resolveAction(raw, fallback);
    if (action?.kind !== 'section') return action;
    const target = sectionTarget(action.target);
    if (target === 'hero') return { kind: 'section', target };
    if (target === 'contact') return contactAction ?? fallback;
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
  const prefix = text(hero, 'label_code');
  /** Kode label lengkap "SPX-02" untuk section `key` ("" bila tidak berpenomor). */
  const code = (key: string): string => labelCode(prefix, number(key));

  const stats = list(hero, 'stats', 3).filter((item) => field(item, 'value') || field(item, 'label'));
  const specialties = specialtiesOf(specialists);
  const specialistsAction = sectionAction('specialists');

  return {
    brand,
    hero,
    specialists,
    mcu,
    labresults: section('labresults'),
    technology: section('technology'),
    turnaround: section('turnaround'),
    testimonials: section('testimonials'),
    faq: section('faq'),
    contact,
    footer,
    companyName,
    tagline: text(brand, 'tagline'),
    logo: text(brand, 'logo'),
    colors: spxVars(text(brand, 'accent_color')),
    whatsapp,
    waAction,
    contactAction,
    shown,
    items,
    number,
    code,
    sectionAction,
    linkOr,
    waWith,
    stats,
    specialties,
    matrix: mcuMatrix(list(mcu, 'packages', 4), list(mcu, 'rows', 16)),
    /** Tombol utama hero: tautan sendiri, kalau kosong ke Spesialis (atau Kontak) */
    primaryAction: linkOr(text(hero, 'primary_url'), specialistsAction ?? contactAction),
    /** Tombol kedua hero: tautan sendiri, kalau kosong ke Paket MCU */
    secondaryAction: linkOr(text(hero, 'secondary_url'), sectionAction('mcu')),
    /** Tombol di menu atas */
    headerLabel: text(hero, 'header_label'),
    headerAction: linkOr(text(hero, 'header_url'), specialistsAction ?? contactAction ?? waAction),
    nav: navItems(content),
    socials: socialLinks(footer),
    map: mapsInfo(text(contact, 'maps_url'), text(contact, 'maps_query') || text(contact, 'address')),
    year: new Date().getFullYear(),
  };
}

export type SpxModel = ReturnType<typeof readSpecialistPlus>;
