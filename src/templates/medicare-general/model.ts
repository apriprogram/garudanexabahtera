// Turunan konten MediCare General (fungsi murni, tanpa React): warna footer dari warna tema, ukuran teks, section yang
// tampil, menu, tujuan tautan "#…", jadwal dokter (hari praktik, inisial, saringan poli & hari), formulir pendaftaran
// 3 langkah → pesan WhatsApp, dan tautan IGD. Semua tahan konten mentah (null, angka, list rusak). Formulir hanya
// MENYUSUN pesan: tidak ada data pasien yang dikirim ke server atau disimpan di website.
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
  telHref,
  text,
  whatsappHref,
  type LinkAction,
} from '../shared/utils';
import { MEDICARE_ACCENT } from './defaultContent';

// ─── Warna ────────────────────────────────────────────────────────────────────

type Rgb = [number, number, number];
const WHITE: Rgb = [255, 255, 255];
/** Biru malam #061228: warna tema digelapkan ke arah ini untuk footer */
const NIGHT: Rgb = [6, 18, 40];
const toHex = (rgb: Rgb) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
/** Campuran dibulatkan: kontras dihitung dari warna yang benar-benar ditulis sebagai hex. */
const mix = (a: Rgb, b: Rgb, amountOfA: number): Rgb => a.map((c, i) => Math.round(c * amountOfA + b[i] * (1 - amountOfA))) as Rgb;
const accentOf = (raw: string): Rgb => parseHex(raw) ?? (parseHex(MEDICARE_ACCENT) as Rgb);

/** Merah darurat tetap (= EMERGENCY di ./styles): putih di atasnya 6,57:1. */
export const EMERGENCY_RGB: Rgb = [183, 28, 28];

/**
 * Variabel warna lokal (di samping --tpl-accent* milik Shell), dari SATU warna tema:
 * --mc-deep: footer = warna tema digelapkan sampai teks putih ≥ 7:1 (bawaan #0A50A5);
 * --mc-bright: warna tema dicerahkan sampai ≥ 4,5:1 di atas --mc-deep (judul kolom footer).
 */
export function medicareVars(accentRaw: string): CSSProperties {
  const accent = accentOf(accentRaw);
  let deep = accent;
  for (let i = 0; i < 40 && contrast(deep, WHITE) < 7; i += 1) deep = mix(deep, NIGHT, 0.88);
  let bright = accent;
  for (let i = 0; i < 40 && contrast(bright, deep) < 4.5; i += 1) bright = mix(bright, WHITE, 0.8);
  return { '--mc-deep': toHex(deep), '--mc-bright': toHex(bright) } as CSSProperties;
}

// ─── Ukuran teks ──────────────────────────────────────────────────────────────

/** Tiga ukuran teks (kontrol "Ukuran teks"): skala dikalikan ke semua kelas huruf `mc-t-*`. */
export const TEXT_SIZES = [
  { label: 'A', name: 'normal', scale: 1 },
  { label: 'A+', name: 'besar', scale: 1.125 },
  { label: 'A++', name: 'sangat besar', scale: 1.25 },
] as const;

/** Kunci localStorage (per perangkat pengunjung; dibaca/ditulis di dalam try/catch). */
export const TEXT_SIZE_KEY = 'medicare-general:text-size';

/** Nilai tersimpan → indeks ukuran 0/1/2; nilai lain → 0 (normal). */
export function parseTextSize(raw: string | null | undefined): number {
  const n = Number((raw ?? '').trim());
  return Number.isInteger(n) && n >= 0 && n < TEXT_SIZES.length ? n : 0;
}

// ─── Section di halaman ───────────────────────────────────────────────────────

/** Kunci section yang punya tempat di halaman (urutan halaman; = section skema tanpa `brand`). */
export const PAGE_SECTIONS = [
  'hero',
  'services',
  'registration',
  'doctors',
  'clinics',
  'emergency',
  'inpatient',
  'insurance',
  'faq',
  'contact',
  'footer',
] as const;
const KNOWN_SECTIONS = new Set<string>(PAGE_SECTIONS);

/** [kunci list, maks. item (= skema), syarat item dirender]. Satu sumber untuk komponen, menu, dan uji. */
const ITEMS: Record<string, [listKey: string, max: number, keep: (item: ListItem) => boolean]> = {
  services: ['items', 9, (i) => !!field(i, 'title')],
  doctors: ['items', 30, (i) => !!field(i, 'name')],
  inpatient: ['items', 6, (i) => !!field(i, 'name')],
  faq: ['items', 8, (i) => !!field(i, 'question')],
};

/** Item yang dirender untuk section `key` (lihat ITEMS); section tanpa daftar → []. */
export function sectionItems(key: string, section: SectionContent): ListItem[] {
  const rule = ITEMS[key];
  return rule ? list(section, rule[0], rule[1]).filter(rule[2]) : [];
}

/** Daftar poliklinik yang dirender (bernama). */
export const clinicItems = (section: SectionContent): ListItem[] => list(section, 'items', 16).filter((i) => !!field(i, 'name'));
/** Kartu penunjang medis yang dirender (berjudul). */
export const supportItems = (section: SectionContent): ListItem[] => list(section, 'support', 4).filter((i) => !!field(i, 'title'));
/** Langkah (judul wajib) dari list `key`. */
export const stepItems = (section: SectionContent, key: string, max = 5): ListItem[] => list(section, key, max).filter((i) => !!field(i, 'title'));
/** Nama penjamin yang dirender. */
export const insurerItems = (section: SectionContent): ListItem[] => list(section, 'insurers', 24).filter((i) => !!field(i, 'name'));

/** Tab asuransi yang punya isi: [kunci, label]. Label kosong → nama bawaan. */
export function insuranceTabs(section: SectionContent): { key: 'bpjs' | 'insurers' | 'general'; label: string }[] {
  const tabs: { key: 'bpjs' | 'insurers' | 'general'; label: string }[] = [];
  if (stepItems(section, 'bpjs_steps').length > 0 || text(section, 'bpjs_note')) tabs.push({ key: 'bpjs', label: text(section, 'bpjs_label') || 'Pasien BPJS' });
  if (insurerItems(section).length > 0 || text(section, 'insurers_intro')) tabs.push({ key: 'insurers', label: text(section, 'insurers_label') || 'Asuransi' });
  if (stepItems(section, 'general_steps').length > 0) tabs.push({ key: 'general', label: text(section, 'general_label') || 'Pasien umum' });
  return tabs;
}

/** Section tampil dan berisi? Kunci yang tidak dikenal (mis. salah ketik di field URL) → false. */
export function sectionShown(content: SiteContent, key: string): boolean {
  if (!KNOWN_SECTIONS.has(key)) return false;
  const s = getSection(content, key);
  if (!isEnabled(s)) return false;
  if (key in ITEMS) return sectionItems(key, s).length > 0;
  if (key === 'clinics') return clinicItems(s).length > 0 || supportItems(s).length > 0;
  if (key === 'insurance') return insuranceTabs(s).length > 0;
  if (key === 'emergency') {
    const igd = telHref(text(getSection(content, 'contact'), 'igd_phone'));
    return !!(igd || text(s, 'title') || stepItems(s, 'steps', 4).length > 0);
  }
  return true;
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

export interface MedicareNavItem {
  key: string;
  label: string;
}

const NAV: { key: string; label: string }[] = [
  { key: 'services', label: 'Layanan' },
  { key: 'doctors', label: 'Jadwal Dokter' },
  { key: 'clinics', label: 'Poliklinik' },
  { key: 'inpatient', label: 'Rawat Inap' },
  { key: 'insurance', label: 'Asuransi' },
  { key: 'contact', label: 'Kontak' },
];

/** Label menu dari label kecil section bila singkat (≤ 14 huruf, ≤ 2 kata), selain itu label bawaan. */
const shortLabel = (section: SectionContent, fallback: string) => {
  const eyebrow = text(section, 'eyebrow');
  return eyebrow && eyebrow.length <= 14 && eyebrow.split(/\s+/).length <= 2 ? eyebrow : fallback;
};

/** Menu hanya untuk section yang benar-benar tampil (tanpa tautan mati). */
export function navItems(content: SiteContent): MedicareNavItem[] {
  return NAV.filter(({ key }) => sectionShown(content, key)).map(({ key, label }) => ({ key, label: shortLabel(getSection(content, key), label) }));
}

// ─── Tujuan tautan "#…" ───────────────────────────────────────────────────────

/** Anchor berbahasa Indonesia yang wajar diketik pembeli → kunci section (#kontak, #layanan sudah diterjemahkan
 *  sectionFromAnchor). */
const ANCHOR_ALIASES: Record<string, string> = {
  pendaftaran: 'registration',
  daftar: 'registration',
  'daftar-online': 'registration',
  registrasi: 'registration',
  jadwal: 'doctors',
  dokter: 'doctors',
  'jadwal-dokter': 'doctors',
  poli: 'clinics',
  poliklinik: 'clinics',
  penunjang: 'clinics',
  igd: 'emergency',
  darurat: 'emergency',
  'gawat-darurat': 'emergency',
  'rawat-inap': 'inpatient',
  kamar: 'inpatient',
  asuransi: 'insurance',
  bpjs: 'insurance',
  'tanya-jawab': 'faq',
  lokasi: 'contact',
  peta: 'contact',
};

/** Target tautan section ("jadwal", "doctors", "kontak") → kunci section di halaman, atau null bila tidak dikenal. */
export function sectionTarget(target: string): string | null {
  const clean = sectionFromAnchor(target);
  const key = ANCHOR_ALIASES[clean] ?? clean;
  return KNOWN_SECTIONS.has(key) ? key : null;
}

// ─── Teks kecil ───────────────────────────────────────────────────────────────

/** Butir dipisah "·", "|", "•", ";" atau koma → daftar (fasilitas kamar). */
export const splitTags = (raw: string): string[] =>
  (raw || '')
    .split(/\s*[·|,•;]\s*/)
    .map((tag) => tag.trim())
    .filter(Boolean);

/** Nomor HP Indonesia yang ditulis rapat ("081234567891") → "0812-3456-7891" untuk dibaca; format lain apa adanya. */
export const displayPhone = (raw: string): string => {
  const value = (raw || '').trim();
  return /^08\d{8,11}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8)}` : value;
};

/** Nomor dua digit "01". */
export const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Teks bersih satu baris: karakter kontrol dibuang, spasi dirapikan, dipotong ke `max`. */
export function cleanText(raw: string, max: number): string {
  const visible = Array.from(raw || '', (ch) => {
    const code = ch.charCodeAt(0);
    return code < 32 || code === 127 ? ' ' : ch;
  }).join('');
  return Array.from(visible.replace(/\s+/g, ' ').trim()).slice(0, max).join('').trim();
}

// ─── Jadwal dokter ────────────────────────────────────────────────────────────

/** Nama hari, Senin = 0 … Minggu = 6 (urutan kalender praktik di Indonesia). */
export const DAY_NAMES = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'] as const;
/** Singkatan chip hari. */
export const DAY_SHORT = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'] as const;

const DAY_PREFIX: [RegExp, number][] = [
  [/^sen/, 0],
  [/^sel/, 1],
  [/^rab/, 2],
  [/^kam/, 3],
  [/^jum/, 4],
  [/^sab/, 5],
  [/^(min|ahad)/, 6],
];

/** "Senin", "sen", "Jum'at" → 0…6; bukan nama hari → -1. */
export function dayIndex(token: string): number {
  const clean = (token || '').toLowerCase().replace(/[^a-z]/g, '');
  return DAY_PREFIX.find(([pattern]) => pattern.test(clean))?.[1] ?? -1;
}

/**
 * Hari praktik dari teks bebas → indeks hari terurut unik. Mendukung daftar ("Senin, Rabu & Jumat"), rentang
 * ("Senin–Sabtu", "Senin - Jumat", "Senin s.d. Jumat", "Senin sampai Kamis"), dan "Setiap hari". Tidak terbaca → [].
 */
export function parseDays(raw: string): number[] {
  const value = (raw || '').toLowerCase().trim();
  if (!value) return [];
  if (/(setiap|tiap) hari/.test(value) && !/kecuali/.test(value)) return [0, 1, 2, 3, 4, 5, 6];
  const days = new Set<number>();
  const parts = value.split(/\s*(?:,|·|\/|;|&|\bdan\b)\s*/);
  for (const part of parts) {
    const range = /^([a-z']+)\.?\s*(?:–|—|-|s\.?\s*d\.?|sampai|hingga)\s*([a-z']+)/.exec(part.trim());
    if (range) {
      const from = dayIndex(range[1]);
      const to = dayIndex(range[2]);
      if (from >= 0 && to >= 0) {
        for (let d = from, i = 0; i < 7; i += 1, d = (d + 1) % 7) {
          days.add(d);
          if (d === to) break;
        }
        continue;
      }
    }
    for (const word of part.split(/\s+/)) {
      const d = dayIndex(word);
      if (d >= 0) days.add(d);
    }
  }
  return Array.from(days).sort((a, b) => a - b);
}

/** Inisial avatar dokter tanpa gelar: "dr. Laras Anindita, Sp.A" → "LA", "drg. Yoga Pradana" → "YP". */
export function doctorInitials(name: string): string {
  const core = (name || '')
    .split(',')[0]
    .replace(/\b(prof|dr|drg|ns|apt|drs|dra)\.?\s+/gi, '')
    .replace(/[^\p{L}\s'-]/gu, ' ')
    .trim();
  const words = core.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return Array.from(words[0]).slice(0, 2).join('').toUpperCase();
  return `${Array.from(words[0])[0]}${Array.from(words[words.length - 1])[0]}`.toUpperCase();
}

/** Kunci pembanding nama poli: "Poli Anak" = "anak" = "Poliklinik Anak"; "&" = "dan". */
export function poliKey(raw: string): string {
  return (raw || '')
    .toLowerCase()
    .replace(/&/g, ' dan ')
    .replace(/^\s*(poliklinik|poli|klinik)\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Pilihan poli unik (urutan pertama muncul) dari daftar nama. */
export function uniquePolis(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of names) {
    const value = (name || '').trim();
    const key = poliKey(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

export interface DoctorFilter {
  /** Nama poli ("" = semua) */
  poli: string;
  /** Indeks hari 0…6 (-1 = semua hari) */
  day: number;
}

/**
 * Saring jadwal dokter per poli & hari. Dokter yang hari praktiknya tidak terbaca (mis. "Dengan perjanjian") tetap
 * tampil di semua pilihan hari, agar tidak hilang karena salah ketik.
 */
export function filterDoctors(doctors: ListItem[], { poli, day }: DoctorFilter): ListItem[] {
  const key = poliKey(poli);
  return doctors.filter((doc) => {
    if (key && poliKey(field(doc, 'poli')) !== key) return false;
    if (day < 0) return true;
    const days = parseDays(field(doc, 'days'));
    return days.length === 0 || days.includes(day);
  });
}

// ─── Formulir pendaftaran ─────────────────────────────────────────────────────

export interface RegistrationForm {
  poli: string;
  doctor: string;
  name: string;
  birth: string;
  phone: string;
  payer: string;
  insurer: string;
  date: string;
  session: string;
  complaint: string;
}

export type RegistrationErrors = Partial<Record<keyof RegistrationForm, string>>;

export const PAYERS = ['BPJS', 'Umum', 'Asuransi'] as const;
export const SESSIONS = ['Pagi', 'Siang', 'Sore'] as const;

export const EMPTY_REGISTRATION: RegistrationForm = {
  poli: '',
  doctor: '',
  name: '',
  birth: '',
  phone: '',
  payer: '',
  insurer: '',
  date: '',
  session: '',
  complaint: '',
};

/** Batas panjang per isian (juga atribut maxLength di formulir). */
export const REG_LIMITS: Record<keyof RegistrationForm, number> = {
  poli: 40,
  doctor: 60,
  name: 60,
  birth: 10,
  phone: 20,
  payer: 12,
  insurer: 50,
  date: 10,
  session: 10,
  complaint: 200,
};

/** Judul tiga langkah (label formulir tetap). */
export const STEP_TITLES = ['Poli & dokter', 'Data pasien', 'Jadwal kunjungan'] as const;

/** Isian per langkah, urut fokus galat. */
export const STEP_FIELDS: (keyof RegistrationForm)[][] = [
  ['poli', 'doctor'],
  ['name', 'birth', 'phone', 'payer', 'insurer'],
  ['date', 'session', 'complaint'],
];

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "2026-11-02" → [2026, 11, 2] bila tanggal kalender valid, selain itu null. */
function isoParts(raw: string): [number, number, number] | null {
  const match = ISO_DATE.exec((raw || '').trim());
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? [y, m, d] : null;
}

/** Tanggal lokal hari ini "YYYY-MM-DD" (untuk batas min/max isian tanggal). */
export function todayIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
/** Nama hari menurut getUTCDay (Minggu = 0). */
const WEEKDAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/** "2026-11-02" → "Senin, 2 November 2026" (tanpa hari: "2 November 2026"); tidak valid → apa adanya. */
export function formatDateId(raw: string, withWeekday = true): string {
  const parts = isoParts(raw);
  if (!parts) return (raw || '').trim();
  const [y, m, d] = parts;
  const date = `${d} ${MONTHS[m - 1]} ${y}`;
  return withWeekday ? `${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}, ${date}` : date;
}

/** Nomor HP Indonesia: 08… / +628… / 628…, 10–14 digit; spasi, titik, strip boleh. */
export function isValidPhone(raw: string): boolean {
  const digits = (raw || '').replace(/[\s().-]/g, '');
  return /^(\+?62|0)8\d{7,11}$/.test(digits);
}

export interface RegistrationContext {
  /** Pilihan poli di formulir */
  polis: readonly string[];
  /** Jadwal dokter (untuk memeriksa dokter yang dipilih) */
  doctors: readonly ListItem[];
  /** Hari ini "YYYY-MM-DD" */
  today: string;
}

/** Dokter yang praktik di poli tersebut (urutan jadwal). */
export function doctorsForPoli(doctors: readonly ListItem[], poli: string): ListItem[] {
  const key = poliKey(poli);
  return key ? doctors.filter((doc) => poliKey(field(doc, 'poli')) === key) : [];
}

/** Pesan galat isian satu langkah (0/1/2). Kosong = langkah valid. */
export function validateStep(step: number, form: RegistrationForm, ctx: RegistrationContext): RegistrationErrors {
  const errors: RegistrationErrors = {};
  const value = (key: keyof RegistrationForm) => cleanText(form[key], REG_LIMITS[key]);
  if (step === 0) {
    if (!ctx.polis.some((p) => poliKey(p) === poliKey(form.poli) && poliKey(p))) errors.poli = 'Pilih poli tujuan.';
    else if (value('doctor') && !doctorsForPoli(ctx.doctors, form.poli).some((doc) => field(doc, 'name') === form.doctor)) {
      errors.doctor = 'Pilih dokter dari daftar, atau "Dokter mana saja".';
    }
  } else if (step === 1) {
    if (value('name').length < 2) errors.name = 'Tulis nama pasien.';
    const birth = isoParts(form.birth);
    if (!birth || birth[0] < 1900) errors.birth = 'Isi tanggal lahir pasien.';
    else if (form.birth > ctx.today) errors.birth = 'Tanggal lahir tidak boleh setelah hari ini.';
    if (!isValidPhone(form.phone)) errors.phone = 'Tulis nomor HP yang aktif, mis. 081234567890.';
    if (!(PAYERS as readonly string[]).includes(form.payer)) errors.payer = 'Pilih jenis pasien.';
  } else if (step === 2) {
    if (!isoParts(form.date)) errors.date = 'Pilih tanggal kunjungan.';
    else if (form.date < ctx.today) errors.date = 'Tanggal kunjungan tidak boleh sebelum hari ini.';
    if (!(SESSIONS as readonly string[]).includes(form.session)) errors.session = 'Pilih sesi kunjungan.';
  }
  return errors;
}

/** Galat semua langkah sekaligus. */
export function validateRegistration(form: RegistrationForm, ctx: RegistrationContext): RegistrationErrors {
  return { ...validateStep(0, form, ctx), ...validateStep(1, form, ctx), ...validateStep(2, form, ctx) };
}

/** Langkah pertama yang masih bergalat, atau -1. */
export function firstInvalidStep(form: RegistrationForm, ctx: RegistrationContext): number {
  for (let step = 0; step < STEP_FIELDS.length; step += 1) if (Object.keys(validateStep(step, form, ctx)).length > 0) return step;
  return -1;
}

/**
 * Pesan WhatsApp pendaftaran: salam, baris kosong, lalu baris tetap per isian; isian opsional yang kosong tidak ikut.
 * Nama rumah sakit kosong → salam tanpa nama.
 */
export function registrationMessage(form: RegistrationForm, hospitalName: string): string {
  const value = (key: keyof RegistrationForm) => cleanText(form[key], REG_LIMITS[key]);
  const hospital = cleanText(hospitalName, 80);
  const payer = (PAYERS as readonly string[]).includes(form.payer) ? form.payer : '';
  const session = (SESSIONS as readonly string[]).includes(form.session) ? form.session.toLowerCase() : '';
  const visit = [formatDateId(value('date')), session && `sesi ${session}`].filter(Boolean).join(', ');
  const rows = [
    `Poli: ${value('poli')}`,
    `Dokter: ${value('doctor') || 'Dokter mana saja'}`,
    `Nama pasien: ${value('name')}`,
    `Tanggal lahir: ${formatDateId(value('birth'), false)}`,
    `No. HP: ${value('phone')}`,
    payer && `Jenis pasien: ${payer === 'Asuransi' && value('insurer') ? `Asuransi (${value('insurer')})` : payer}`,
    `Rencana kunjungan: ${visit}`,
    value('complaint') && `Keluhan: ${value('complaint')}`,
  ].filter(Boolean);
  const greeting = hospital ? `Halo ${hospital}, saya ingin mendaftar berobat rawat jalan.` : 'Halo, saya ingin mendaftar berobat rawat jalan.';
  return `${greeting}\n\n${rows.join('\n')}`;
}

/** mailto: dengan subjek "Pendaftaran berobat" dan isi pesan (dipotong 1800 huruf); email tidak valid → "". */
export function registrationMailHref(email: string, body: string): string {
  const mail = mailHref(email);
  if (!mail) return '';
  return `${mail}?subject=${encodeURIComponent('Pendaftaran berobat')}&body=${encodeURIComponent(Array.from(body).slice(0, 1800).join(''))}`;
}

// ─── Lain-lain ────────────────────────────────────────────────────────────────

export interface SocialLink {
  key: string;
  label: string;
  href: string;
}

export const socialLinks = (footer: SectionContent): SocialLink[] =>
  SOCIAL_FIELDS.map(({ key, label }) => ({ key, label, href: safeUrl(text(footer, key)) ?? '' })).filter((s) => s.href);

/** Tautan telepon sebagai aksi (tel:…), atau null. */
const telAction = (raw: string): LinkAction | null => {
  const href = telHref(raw);
  return href ? { kind: 'external', href } : null;
};

// ─── Model ────────────────────────────────────────────────────────────────────

export function readMedicare(content: SiteContent) {
  const section = (key: string) => getSection(content, key);
  const brand = section('brand');
  const hero = section('hero');
  const contact = section('contact');
  const footer = section('footer');

  const companyName = text(brand, 'company_name') || 'Nama Rumah Sakit';
  const whatsapp = text(contact, 'whatsapp');
  const waLink = whatsappHref(whatsapp, text(contact, 'whatsapp_message'));
  const waAction: LinkAction | null = waLink ? { kind: 'external', href: waLink } : null;
  const igdPhone = text(contact, 'igd_phone');
  const ambulancePhone = text(contact, 'ambulance_phone');

  /** Section tampil & berisi di halaman (sectionShown). */
  const shown = (key: string): boolean => sectionShown(content, key);
  /** Item yang dirender untuk section `key` (sectionItems). */
  const items = (key: string): ListItem[] => sectionItems(key, section(key));
  const sectionAction = (key: string): LinkAction | null => (shown(key) ? { kind: 'section', target: key } : null);
  const contactAction = sectionAction('contact');
  /** Tujuan "daftar": formulir pendaftaran, kalau tidak WhatsApp, kalau tidak Kontak. */
  const registerAction: LinkAction | null = sectionAction('registration') ?? waAction ?? contactAction;
  /**
   * Isi field URL: "#jadwal", "#igd", "#kontak" dsb. hanya bila section itu tampil (anchor Indonesia diterjemahkan);
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

  const tiles = list(hero, 'tiles', 2)
    .filter((tile) => field(tile, 'title'))
    .map((tile, i) => ({
      title: field(tile, 'title'),
      text: field(tile, 'text'),
      action: linkOr(field(tile, 'url'), i === 0 ? registerAction : sectionAction('doctors') ?? registerAction),
    }));

  return {
    brand,
    hero,
    services: section('services'),
    registration: section('registration'),
    doctors: section('doctors'),
    clinics: section('clinics'),
    emergency: section('emergency'),
    inpatient: section('inpatient'),
    insurance: section('insurance'),
    faq: section('faq'),
    contact,
    footer,
    companyName,
    tagline: text(brand, 'tagline'),
    logo: text(brand, 'logo'),
    colors: medicareVars(text(brand, 'accent_color')),
    whatsapp,
    waAction,
    contactAction,
    registerAction,
    shown,
    items,
    sectionAction,
    linkOr,
    waWith,
    /** Label IGD di strip atas (kosong → "IGD 24 jam") */
    igdLabel: text(contact, 'igd_label') || 'IGD 24 jam',
    igdPhone,
    igdAction: telAction(igdPhone),
    ambulancePhone,
    ambulanceAction: telAction(ambulancePhone),
    tiles,
    /** Tombol utama hero: tautan sendiri, kalau kosong ke Poliklinik */
    primaryAction: linkOr(text(hero, 'primary_url'), sectionAction('clinics') ?? registerAction),
    /** Tombol kedua hero: tautan sendiri, kalau kosong ke Asuransi & BPJS */
    secondaryAction: linkOr(text(hero, 'secondary_url'), sectionAction('insurance') ?? contactAction),
    /** Tombol di menu atas */
    headerLabel: text(hero, 'header_label'),
    headerAction: linkOr(text(hero, 'header_url'), registerAction),
    nav: navItems(content),
    socials: socialLinks(footer),
    map: mapsInfo(text(contact, 'maps_url'), text(contact, 'maps_query') || text(contact, 'address')),
    year: new Date().getFullYear(),
  };
}

export type MedicareModel = ReturnType<typeof readMedicare>;

/** Foto opsional terisi? (dipakai komponen untuk menyesuaikan tata letak). */
export const hasPhoto = (raw: string): boolean => hasImage(raw);
