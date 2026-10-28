// Turunan konten MomKid Hospital (fungsi murni, tanpa React): warna pastel dari warna tema (teks berwarna tema yang
// tetap terbaca, peach lembut, lapisan hero), menu, tujuan tautan "#…", nada latar section (krem/putih bergantian, pita
// mint & peach), item yang dirender per section, jadwal imunisasi (umur → jadwal berikutnya), hari praktik dokter,
// pesan WhatsApp (paket, dokter, imunisasi, laktasi), dan formulir pendaftaran kunjungan. Semua tahan konten mentah
// (null, angka, list rusak). Formulir hanya MENYUSUN pesan: tidak ada data yang dikirim ke server atau disimpan di
// website; tidak ada rekam medis atau pembayaran.
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
import { MOMKID_ACCENT } from './defaultContent';

// ─── Warna ────────────────────────────────────────────────────────────────────

type Rgb = [number, number, number];
/** Krem halaman #FFF9F5 */
export const CREAM: Rgb = [255, 249, 245];
/** Cokelat tua hangat: arah penggelapan teks berwarna tema */
const DEEP: Rgb = [46, 26, 22];
const toHex = (rgb: Rgb) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
/** Campuran dibulatkan: kontras dihitung dari warna yang benar-benar ditulis sebagai hex. */
const mix = (a: Rgb, b: Rgb, amountOfA: number): Rgb => a.map((c, i) => Math.round(c * amountOfA + b[i] * (1 - amountOfA))) as Rgb;

const accentOf = (raw: string): Rgb => parseHex(raw) ?? (parseHex(MOMKID_ACCENT) as Rgb);

/** Kontras minimum teks berwarna tema di atas peach paling pekat (--mk-peach) dan mint. */
export const ACCENT_TEXT_MIN = 4.6;
/** Mint tetap #DDF3EA (pita imunisasi, kartu, footer) */
export const MINT: Rgb = [221, 243, 234];
/** Teks kedua #6A5559: harus tetap ≥ 4,6:1 di atas bidang peach turunan warna tema */
export const MUTED: Rgb = [106, 85, 89];

/** Campuran warna tema di atas krem, dicerahkan ke krem bila teks kedua di atasnya < 4,6:1 (warna tema sangat gelap). */
function tint(accent: Rgb, amount: number): Rgb {
  let value = mix(accent, CREAM, amount);
  for (let i = 0; i < 24 && contrast(MUTED, value) < ACCENT_TEXT_MIN; i += 1) value = mix(value, CREAM, 0.85);
  return value;
}

/**
 * Variabel warna lokal MomKid (di samping --tpl-accent* milik Shell), semuanya dari SATU warna tema:
 * --mk-peach-soft: 12% warna tema di atas krem (kartu pastel, lapisan hero);
 * --mk-peach: 22% warna tema di atas krem (pita ajakan, panel aktif);
 * (keduanya dicerahkan bila perlu agar teks kedua #6A5559 tetap ≥ 4,6:1 — tinta ≥ 10:1);
 * --mk-accent-text: warna tema digelapkan ke cokelat tua sampai ≥ 4,6:1 di atas --mk-peach DAN mint (jadi juga di
 * krem, putih, dan peach lembut) — dipakai untuk SEMUA teks berwarna tema.
 */
export function momkidVars(accentRaw: string): CSSProperties {
  const accent = accentOf(accentRaw);
  const peachSoft = tint(accent, 0.12);
  const peach = tint(accent, 0.22);
  let ink = accent;
  for (let i = 0; i < 40 && Math.min(contrast(ink, peach), contrast(ink, MINT)) < ACCENT_TEXT_MIN; i += 1) ink = mix(ink, DEEP, 0.9);
  return {
    '--mk-peach-soft': toHex(peachSoft),
    '--mk-peach': toHex(peach),
    '--mk-accent-text': toHex(ink),
  } as CSSProperties;
}

// ─── Section di halaman ───────────────────────────────────────────────────────

/** Kunci section yang punya tempat di halaman (urutan halaman; = section skema tanpa `brand`). */
export const PAGE_SECTIONS = [
  'hero',
  'journey',
  'packages',
  'immunization',
  'pediatrics',
  'lactation',
  'tour',
  'articles',
  'testimonials',
  'faq',
  'cta',
  'contact',
  'footer',
] as const;
const KNOWN_SECTIONS = new Set<string>(PAGE_SECTIONS);

/** [kunci list, maks. item (= skema), syarat item dirender] per section. Satu sumber untuk komponen, menu, nada. */
const ITEMS: Record<string, [listKey: string, max: number, keep: (item: ListItem) => boolean]> = {
  journey: ['stages', 4, (i) => !!(field(i, 'name') || field(i, 'title'))],
  packages: ['items', 4, (i) => !!field(i, 'name')],
  // Sama dengan immunizationStops: umur harus angka dan vaksin tidak kosong (menu tidak menautkan garis waktu kosong)
  immunization: ['items', 12, (i) => parseAge(field(i, 'age')) !== null && splitTags(field(i, 'vaccines')).length > 0],
  pediatrics: ['items', 8, (i) => !!field(i, 'name')],
  tour: ['items', 8, (i) => hasImage(field(i, 'image'))],
  articles: ['items', 6, (i) => !!field(i, 'title')],
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
  if (key === 'lactation') return !!(text(s, 'title') || hasImage(text(s, 'image')) || list(s, 'services', 6).some((i) => field(i, 'title')));
  if (key === 'cta') return !!(text(s, 'title') || text(s, 'subtitle'));
  return true;
}

/** Nada latar section. Pita tetap: imunisasi mint, ajakan peach, footer mint; section biasa krem/putih bergantian. */
export type Tone = 'cream' | 'white' | 'mint' | 'peach';
const BANDS: Record<string, Tone> = { immunization: 'mint', cta: 'peach', footer: 'mint' };

/** Nada setiap section yang tampil (urutan halaman; hero tidak ikut). */
export function sectionTones(content: SiteContent): Record<string, Tone> {
  const tones: Record<string, Tone> = {};
  let plain = 0;
  for (const key of PAGE_SECTIONS) {
    if (key === 'hero' || !sectionShown(content, key)) continue;
    if (BANDS[key]) tones[key] = BANDS[key];
    else {
      tones[key] = plain % 2 === 0 ? 'cream' : 'white';
      plain += 1;
    }
  }
  return tones;
}

/** Section tampil sebelum/sesudah `key` (null bila tidak ada). */
export function neighbour(content: SiteContent, key: string, step: -1 | 1): string | null {
  const shown = PAGE_SECTIONS.filter((k) => sectionShown(content, k));
  const i = shown.indexOf(key as (typeof PAGE_SECTIONS)[number]);
  if (i < 0) return null;
  return shown[i + step] ?? null;
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

export interface MomkidNavItem {
  key: string;
  label: string;
  /** Tampil juga di kapsul menu layar lebar (selain itu hanya di menu HP & footer) */
  primary: boolean;
}

const NAV: { key: string; label: string; primary: boolean }[] = [
  { key: 'journey', label: 'Layanan', primary: false },
  { key: 'packages', label: 'Paket', primary: true },
  { key: 'immunization', label: 'Imunisasi', primary: true },
  { key: 'pediatrics', label: 'Dokter Anak', primary: true },
  { key: 'lactation', label: 'Laktasi', primary: true },
  { key: 'tour', label: 'Tur Kamar', primary: true },
  { key: 'articles', label: 'Artikel', primary: false },
  { key: 'faq', label: 'Tanya Jawab', primary: false },
  { key: 'contact', label: 'Kontak', primary: true },
];

/** Menu hanya untuk section yang benar-benar tampil (tanpa tautan mati). Label = label bawaan yang singkat. */
export function navItems(content: SiteContent): MomkidNavItem[] {
  return NAV.filter(({ key }) => sectionShown(content, key)).map((item) => ({ ...item }));
}

// ─── Tujuan tautan "#…" ───────────────────────────────────────────────────────

/** Anchor berbahasa Indonesia yang wajar diketik pembeli → kunci section (#kontak, #testimoni, #ajakan sudah
 *  diterjemahkan sectionFromAnchor). */
const ANCHOR_ALIASES: Record<string, string> = {
  perjalanan: 'journey',
  tahap: 'journey',
  layanan: 'journey',
  services: 'journey',
  paket: 'packages',
  'paket-persalinan': 'packages',
  persalinan: 'packages',
  imunisasi: 'immunization',
  vaksin: 'immunization',
  dokter: 'pediatrics',
  'dokter-anak': 'pediatrics',
  jadwal: 'pediatrics',
  laktasi: 'lactation',
  menyusui: 'lactation',
  tur: 'tour',
  'tur-kamar': 'tour',
  kamar: 'tour',
  artikel: 'articles',
  blog: 'articles',
  'tanya-jawab': 'faq',
  pendaftaran: 'contact',
  daftar: 'contact',
  formulir: 'contact',
  lokasi: 'contact',
};

/** Target tautan section ("paket", "packages", "kontak") → kunci section di halaman, atau null bila tidak dikenal. */
export function sectionTarget(target: string): string | null {
  const clean = sectionFromAnchor(target);
  const key = ANCHOR_ALIASES[clean] ?? clean;
  return KNOWN_SECTIONS.has(key) ? key : null;
}

// ─── Teks kecil ───────────────────────────────────────────────────────────────

/** Daftar dipisah "·", "|", "•", koma, atau titik koma → butir (chip layanan, vaksin, isi paket). */
export const splitTags = (raw: string): string[] =>
  (raw || '')
    .split(/\s*[·|,;•]\s*/)
    .map((tag) => tag.trim())
    .filter(Boolean);

/** Nomor HP Indonesia yang ditulis rapat ("081234567890") → "0812-3456-7890" untuk dibaca; format lain apa adanya. */
export const displayPhone = (raw: string): string => {
  const value = (raw || '').trim();
  return /^08\d{8,11}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8)}` : value;
};

/**
 * Kata sandang pendek ("si", "sang") direkatkan ke kata sesudahnya dengan spasi tak-putus, supaya judul tidak terbungkus
 * menjadi "… si / kecil" (text-balance suka memisahkannya). Hanya untuk tampilan judul.
 */
export const glue = (raw: string): string => (raw || '').replace(/(^|\s)(si|sang)\s+(?=\S)/gi, '$1$2\u00A0');

/** Teks bersih satu baris: karakter kontrol dibuang, spasi dirapikan, dipotong ke `max`. */
export function cleanText(raw: string, max: number): string {
  const visible = Array.from(raw || '', (ch) => {
    const code = ch.charCodeAt(0);
    return code < 32 || code === 127 ? ' ' : ch;
  }).join('');
  return Array.from(visible.replace(/\s+/g, ' ').trim()).slice(0, max).join('').trim();
}

// ─── Jadwal imunisasi ─────────────────────────────────────────────────────────

export interface ImmunizationStop {
  /** Umur dalam bulan (0 = saat lahir) */
  months: number;
  label: string;
  vaccines: string[];
}

/** Catatan jadwal yang SELALU tampil bila isian CMS kosong (jadwal hanya ringkasan, bukan anjuran medis). */
export const IMMUNIZATION_NOTE = 'Ringkasan, ikuti anjuran dokter anak.';

/** Umur tertinggi yang diterima (bulan). */
export const MAX_AGE = 60;

/** Label umur bawaan: 0 → "Saat lahir", n → "n bulan". */
export const ageLabel = (months: number): string => (months <= 0 ? 'Saat lahir' : `${months} bulan`);
/** Label pilihan umur di formulir: 0 → "Baru lahir". */
export const ageOptionLabel = (months: number): string => (months <= 0 ? 'Baru lahir' : `${months} bulan`);

/** "4", " 12 ", "6 bulan" → bulan (0–60); bukan angka → null. */
export function parseAge(raw: string): number | null {
  const match = /^\s*(\d{1,3})/.exec(raw || '');
  if (!match) return null;
  return Math.min(MAX_AGE, Math.max(0, Number(match[1])));
}

/** Jadwal dari CMS: urut menurut umur, butir tanpa vaksin atau umur tidak valid dibuang (maks. 12). */
export function immunizationStops(section: SectionContent): ImmunizationStop[] {
  return sectionItems('immunization', section)
    .map((item) => {
      const months = parseAge(field(item, 'age'));
      return months === null ? null : { months, label: field(item, 'label') || ageLabel(months), vaccines: splitTags(field(item, 'vaccines')) };
    })
    .filter((stop): stop is ImmunizationStop => !!stop && stop.vaccines.length > 0)
    .sort((a, b) => a.months - b.months);
}

/** Pilihan umur 0 … umur jadwal terakhir (bulan). */
export function ageOptions(stops: readonly ImmunizationStop[]): number[] {
  const last = stops.length > 0 ? stops[stops.length - 1].months : 0;
  return Array.from({ length: last + 1 }, (_, i) => i);
}

/** Indeks jadwal berikutnya untuk umur `age` (umur jadwal ≥ umur anak); semua sudah lewat → -1. */
export function nextStop(stops: readonly ImmunizationStop[], age: number): number {
  return stops.findIndex((stop) => stop.months >= age);
}

export type StopState = 'done' | 'next' | 'later';

/** Status satu titik jadwal terhadap indeks jadwal berikutnya (-1 = semua sudah lewat). */
export function stopState(index: number, next: number): StopState {
  if (next < 0 || index < next) return 'done';
  return index === next ? 'next' : 'later';
}

/** Panjang isian garis waktu (0–1): sampai titik jadwal berikutnya (titik berjarak sama); semua lewat → 1. */
export function progressOf(stops: readonly ImmunizationStop[], age: number): number {
  if (stops.length < 2) return stops.length === 1 && nextStop(stops, age) < 0 ? 1 : 0;
  const next = nextStop(stops, age);
  return next < 0 ? 1 : next / (stops.length - 1);
}

/** Umur awal dari CMS (`start_age`), dibatasi ke pilihan yang ada. */
export function startAge(section: SectionContent, stops: readonly ImmunizationStop[]): number {
  const options = ageOptions(stops);
  const age = parseAge(text(section, 'start_age')) ?? 0;
  return Math.min(age, options[options.length - 1] ?? 0);
}

// ─── Hari praktik dokter ──────────────────────────────────────────────────────

export const WEEK = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'] as const;
export const WEEK_FULL = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'] as const;

/** "Sen · Rab · Jum", "Senin, Kamis", "sabtu" → indeks hari 0–6 (Senin = 0), urut dan unik. "Senin–Rabu" → 0, 1, 2. */
export function parseDays(raw: string): number[] {
  const found = new Set<number>();
  const dayIndex = (word: string) => WEEK.findIndex((d) => word.toLowerCase().startsWith(d.toLowerCase()));
  for (const part of splitTags(raw)) {
    const range = /^(\p{L}+)\s*[–-]\s*(\p{L}+)$/u.exec(part);
    if (range) {
      const from = dayIndex(range[1]);
      const to = dayIndex(range[2]);
      if (from >= 0 && to >= from) for (let d = from; d <= to; d += 1) found.add(d);
      continue;
    }
    const d = dayIndex(part);
    if (d >= 0) found.add(d);
  }
  return Array.from(found).sort((a, b) => a - b);
}

/** Indeks hari → "Senin, Rabu, dan Jumat" (dibacakan pembaca layar). */
export function daysSentence(days: readonly number[]): string {
  const names = days.map((d) => WEEK_FULL[d]);
  if (names.length <= 1) return names.join('');
  if (names.length === 2) return `${names[0]} dan ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, dan ${names[names.length - 1]}`;
}

// ─── Pesan WhatsApp ───────────────────────────────────────────────────────────

const hello = (company: string) => {
  const name = cleanText(company, 80);
  return name ? `Halo ${name}` : 'Halo';
};

export const packageMessage = (company: string, name: string, room: string): string =>
  `${hello(company)}, saya ingin bertanya tentang paket persalinan ${cleanText(name, 30)}${room ? ` (${cleanText(room, 24)})` : ''}.`;

export const doctorMessage = (company: string, doctor: string, days: string, hours: string): string => {
  const when = [cleanText(days, 40), cleanText(hours, 24)].filter(Boolean).join(', ');
  return `${hello(company)}, saya ingin membuat janji konsultasi dengan ${cleanText(doctor, 60)}${when ? ` (${when})` : ''}.`;
};

export const immunizationMessage = (company: string, age: number): string =>
  `${hello(company)}, saya ingin menjadwalkan imunisasi. Umur anak saya: ${ageOptionLabel(age).toLowerCase()}.`;

export const lactationMessage = (company: string): string => `${hello(company)}, saya ingin mendaftar konsultasi laktasi.`;

// ─── Formulir pendaftaran kunjungan ───────────────────────────────────────────

export interface VisitForm {
  name: string;
  service: string;
  detail: string;
  date: string;
  time: string;
  payment: string;
  note: string;
}

export type VisitErrors = Partial<Record<keyof VisitForm, string>>;

export const TIMES = ['Pagi', 'Siang', 'Sore'] as const;
export const PAYMENTS = ['Umum', 'BPJS Kesehatan', 'Asuransi'] as const;
/** Pilihan "Layanan" bila `contact.form_services` kosong. */
export const DEFAULT_SERVICES = ['Kontrol kehamilan', 'Persalinan', 'Imunisasi', 'Konsultasi dokter anak', 'Klinik laktasi', 'Tur kamar bersalin'] as const;

export const EMPTY_VISIT: VisitForm = { name: '', service: '', detail: '', date: '', time: '', payment: 'Umum', note: '' };

/** Batas panjang per isian (juga atribut maxLength di formulir). */
export const VISIT_LIMITS: Record<keyof VisitForm, number> = {
  name: 60,
  service: 40,
  detail: 40,
  date: 10,
  time: 10,
  payment: 20,
  note: 300,
};

/** Urutan isian wajib (fokus ke galat pertama). */
export const REQUIRED_FIELDS: (keyof VisitForm)[] = ['name', 'service', 'date'];

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/** "2026-11-05" → "5 November 2026"; kosong → ""; tanggal tidak valid → null. */
export function formatVisitDate(raw: string): string | null {
  const value = (raw || '').trim();
  if (!value) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** Pilihan "Layanan" dari CMS (maks. 8), atau bawaan bila kosong. */
export function visitServices(contact: SectionContent): string[] {
  const own = list(contact, 'form_services', 8)
    .map((item) => cleanText(field(item, 'label'), VISIT_LIMITS.service))
    .filter(Boolean);
  return own.length > 0 ? Array.from(new Set(own)) : [...DEFAULT_SERVICES];
}

/** Pesan galat per isian (kosong = valid). Tanggal opsional, tetapi bila diisi harus tanggal yang benar. */
export function validateVisit(form: VisitForm, services: readonly string[]): VisitErrors {
  const errors: VisitErrors = {};
  if (cleanText(form.name, VISIT_LIMITS.name).length < 2) errors.name = 'Tulis nama Anda.';
  if (!services.includes(form.service)) errors.service = 'Pilih layanan.';
  if (formatVisitDate(form.date) === null) errors.date = 'Pilih tanggal yang benar.';
  return errors;
}

/**
 * Pesan WhatsApp pendaftaran: salam, baris kosong, lalu baris tetap per isian; isian opsional yang kosong tidak ikut.
 * Nama rumah sakit kosong → salam tanpa nama.
 */
export function visitMessage(form: VisitForm, companyName: string): string {
  const value = (key: keyof VisitForm) => cleanText(form[key], VISIT_LIMITS[key]);
  const pick = (allowed: readonly string[], raw: string) => (allowed.includes(raw) ? raw : '');
  const date = formatVisitDate(form.date) || '';
  const time = pick(TIMES, form.time);
  const payment = pick(PAYMENTS, form.payment);
  const rows = [
    `Nama: ${value('name')}`,
    `Layanan: ${value('service')}`,
    value('detail') && `Usia kehamilan / umur anak: ${value('detail')}`,
    date && `Tanggal kunjungan: ${date}`,
    time && `Waktu: ${time}`,
    payment && `Pembayaran: ${payment}`,
    value('note') && `Catatan: ${value('note')}`,
  ].filter(Boolean);
  return `${hello(companyName)}, saya ingin mendaftar kunjungan.\n\n${rows.join('\n')}`;
}

/** mailto: dengan subjek "Pendaftaran kunjungan" dan isi pesan (dipotong 1800 huruf); email tidak valid → "". */
export function visitMailHref(email: string, body: string): string {
  const mail = mailHref(email);
  if (!mail) return '';
  return `${mail}?subject=${encodeURIComponent('Pendaftaran kunjungan')}&body=${encodeURIComponent(Array.from(body).slice(0, 1800).join(''))}`;
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

export function readMomkid(content: SiteContent) {
  const section = (key: string) => getSection(content, key);
  const brand = section('brand');
  const hero = section('hero');
  const contact = section('contact');
  const footer = section('footer');

  const companyName = text(brand, 'company_name') || 'Nama Rumah Sakit';
  const whatsapp = text(contact, 'whatsapp');
  const waLink = whatsappHref(whatsapp, text(contact, 'whatsapp_message'));
  const waAction: LinkAction | null = waLink ? { kind: 'external', href: waLink } : null;

  /** Section tampil & berisi di halaman (sectionShown). */
  const shown = (key: string): boolean => sectionShown(content, key);
  /** Item yang dirender untuk section `key` (sectionItems). */
  const items = (key: string): ListItem[] => sectionItems(key, section(key));
  const sectionAction = (key: string): LinkAction | null => (shown(key) ? { kind: 'section', target: key } : null);
  const contactAction = sectionAction('contact');
  /** Tujuan "daftar": formulir di Kontak, kalau tidak WhatsApp, kalau tidak null (tombol disembunyikan). */
  const visitAction: LinkAction | null = contactAction ?? waAction;
  /**
   * Isi field URL: "#paket", "#imunisasi", "#kontak" dsb. hanya bila section itu tampil (anchor Indonesia
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

  const tones = sectionTones(content);
  const firstAfterHero = neighbour(content, 'hero', 1);

  const chips = list(hero, 'chips', 3)
    .map((item) => ({ label: cleanText(field(item, 'label'), 22), action: field(item, 'url') ? linkOr(field(item, 'url'), null) : null }))
    .filter((chip) => chip.label);

  return {
    brand,
    hero,
    journey: section('journey'),
    packages: section('packages'),
    immunization: section('immunization'),
    pediatrics: section('pediatrics'),
    lactation: section('lactation'),
    tour: section('tour'),
    articles: section('articles'),
    testimonials: section('testimonials'),
    faq: section('faq'),
    cta: section('cta'),
    contact,
    footer,
    companyName,
    tagline: text(brand, 'tagline'),
    logo: text(brand, 'logo'),
    colors: momkidVars(text(brand, 'accent_color')),
    whatsapp,
    waAction,
    contactAction,
    visitAction,
    shown,
    items,
    sectionAction,
    linkOr,
    waWith,
    /** Nada latar per section tampil (krem/putih/mint/peach) */
    tone: (key: string): Tone => tones[key] ?? 'cream',
    /** Nada section pertama setelah hero (warna gelombang bawah hero); tanpa section → krem */
    toneAfterHero: (firstAfterHero && tones[firstAfterHero]) || 'cream',
    /** Section sebelum `key` adalah hero (pita tanpa gelombang atas) */
    afterHero: (key: string): boolean => neighbour(content, key, -1) === 'hero',
    chips,
    /** Tombol utama hero: tautan sendiri, kalau kosong ke Paket persalinan, lalu Kontak */
    primaryAction: linkOr(text(hero, 'primary_url'), sectionAction('packages') ?? visitAction),
    /** Tombol kedua hero: tautan sendiri, kalau kosong ke Dokter anak */
    secondaryAction: linkOr(text(hero, 'secondary_url'), sectionAction('pediatrics')),
    /** Tombol di menu atas */
    headerLabel: text(hero, 'header_label'),
    headerAction: linkOr(text(hero, 'header_url'), visitAction),
    nav: navItems(content),
    socials: socialLinks(footer),
    map: mapsInfo(text(contact, 'maps_url'), text(contact, 'maps_query') || text(contact, 'address')),
    year: new Date().getFullYear(),
  };
}

export type MomkidModel = ReturnType<typeof readMomkid>;
