// Turunan konten HealthLink (fungsi murni, tanpa React): warna tema (tombol gelap, kotak ikon, pita aplikasi), section
// yang tampil, menu, tujuan tautan (aplikasi/portal pembeli atau WhatsApp), pencarian & saringan dokter, pengingat
// kontrol (.ics dan tautan Google Calendar dibuat di perangkat pengunjung), dan nomor darurat. Semua tahan konten
// mentah (null, angka, list rusak). Tidak ada yang dikirim ke server atau disimpan di website.
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
import { HEALTHLINK_ACCENT } from './defaultContent';
import { iconKey, type IconKey } from './icons';

// ─── Warna ────────────────────────────────────────────────────────────────────

type Rgb = [number, number, number];
const WHITE: Rgb = [255, 255, 255];
/** Kanvas abu sangat muda halaman (#F5F7FA) */
const CANVAS: Rgb = [245, 247, 250];
/** Hitam kebiruan untuk menggelapkan warna tema */
const NIGHT: Rgb = [6, 16, 24];
const toHex = (rgb: Rgb) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
/** Campuran dibulatkan: kontras dihitung dari warna yang benar-benar ditulis sebagai hex. */
const mix = (a: Rgb, b: Rgb, amountOfA: number): Rgb => a.map((c, i) => Math.round(c * amountOfA + b[i] * (1 - amountOfA))) as Rgb;

const accentOf = (raw: string): Rgb => parseHex(raw) ?? (parseHex(HEALTHLINK_ACCENT) as Rgb);

/**
 * Variabel warna lokal HealthLink, semuanya dari SATU warna tema:
 * --hl-solid: warna tema digelapkan sampai ≥ 4,5:1 di kanvas (tombol berteks putih, teks aksen, nomor langkah);
 * --hl-solid-hover; --hl-tint: tint 12% (kotak ikon, chip, saringan aktif); --hl-tint-ink: ikon/teks di atas tint
 * ≥ 4,5:1; --hl-deep: pita aplikasi (putih ≥ 12:1); --hl-bright: teks aksen di atas pita ≥ 4,5:1.
 */
export function healthlinkVars(accentRaw: string): CSSProperties {
  const accent = accentOf(accentRaw);
  let solid = accent;
  for (let i = 0; i < 24 && contrast(solid, CANVAS) < 4.5; i += 1) solid = mix(solid, NIGHT, 0.9);
  const hover = mix(solid, NIGHT, 0.85);
  const tint = mix(accent, WHITE, 0.12);
  let tintInk = solid;
  for (let i = 0; i < 24 && contrast(tintInk, tint) < 4.5; i += 1) tintInk = mix(tintInk, NIGHT, 0.9);
  let deep = mix(accent, NIGHT, 0.28);
  for (let i = 0; i < 12 && contrast(deep, WHITE) < 12; i += 1) deep = mix(deep, NIGHT, 0.8);
  let bright = accent;
  for (let i = 0; i < 24 && contrast(bright, deep) < 4.5; i += 1) bright = mix(bright, WHITE, 0.8);
  return {
    '--hl-solid': toHex(solid),
    '--hl-solid-hover': toHex(hover),
    '--hl-tint': toHex(tint),
    '--hl-tint-ink': toHex(tintInk),
    '--hl-deep': toHex(deep),
    '--hl-bright': toHex(bright),
  } as CSSProperties;
}

// ─── Section di halaman ───────────────────────────────────────────────────────

/** Kunci section yang punya tempat di halaman (urutan halaman; = section skema tanpa `brand`). */
export const PAGE_SECTIONS = [
  'hero',
  'services',
  'steps',
  'doctors',
  'prescription',
  'records',
  'reminders',
  'hospitals',
  'pricing',
  'download',
  'faq',
  'contact',
  'footer',
] as const;
const KNOWN_SECTIONS = new Set<string>(PAGE_SECTIONS);

/** [kunci list, maks. item (= skema), syarat item dirender] per section. Satu sumber untuk komponen dan menu. */
const ITEMS: Record<string, [listKey: string, max: number, keep: (item: ListItem) => boolean]> = {
  services: ['items', 6, (i) => !!field(i, 'title')],
  steps: ['steps', 4, (i) => !!field(i, 'title')],
  doctors: ['items', 9, (i) => !!field(i, 'name')],
  hospitals: ['items', 8, (i) => !!field(i, 'name')],
  pricing: ['plans', 3, (i) => !!(field(i, 'name') || field(i, 'price'))],
  faq: ['items', 8, (i) => !!field(i, 'question')],
};

/** Item yang dirender untuk section `key` (lihat ITEMS); section tanpa daftar → []. */
export function sectionItems(key: string, section: SectionContent): ListItem[] {
  const rule = ITEMS[key];
  return rule ? list(section, rule[0], rule[1]).filter(rule[2]) : [];
}

/** Section tampil dan berisi? Kunci yang tidak dikenal → false. */
export function sectionShown(content: SiteContent, key: string): boolean {
  if (!KNOWN_SECTIONS.has(key)) return false;
  const s = getSection(content, key);
  if (!isEnabled(s)) return false;
  if (key in ITEMS) return sectionItems(key, s).length > 0;
  if (key === 'prescription') return !!(text(s, 'title') || list(s, 'steps', 4).some((i) => field(i, 'title')) || hasImage(text(s, 'image')));
  if (key === 'records') return !!(text(s, 'title') || list(s, 'visits', 4).some((i) => field(i, 'title')) || list(s, 'points', 4).length > 0);
  if (key === 'download') return !!(text(s, 'title') || text(s, 'android_url') || text(s, 'ios_url'));
  return true;
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

export interface HealthLinkNavItem {
  key: string;
  label: string;
}

const NAV: HealthLinkNavItem[] = [
  { key: 'services', label: 'Layanan' },
  { key: 'doctors', label: 'Dokter' },
  { key: 'prescription', label: 'Resep' },
  { key: 'hospitals', label: 'RS mitra' },
  { key: 'pricing', label: 'Biaya' },
  { key: 'faq', label: 'FAQ' },
];

/** Label menu dari label kecil section bila singkat (≤ 14 huruf, ≤ 2 kata), selain itu label bawaan. */
const shortLabel = (section: SectionContent, fallback: string) => {
  const eyebrow = text(section, 'eyebrow');
  return eyebrow && eyebrow.length <= 14 && eyebrow.split(/\s+/).length <= 2 ? eyebrow : fallback;
};

/** Menu hanya untuk section yang benar-benar tampil (tanpa tautan mati). */
export function navItems(content: SiteContent): HealthLinkNavItem[] {
  return NAV.filter(({ key }) => sectionShown(content, key)).map(({ key, label }) => ({ key, label: shortLabel(getSection(content, key), label) }));
}

// ─── Tujuan tautan "#…" ───────────────────────────────────────────────────────

/** Anchor berbahasa Indonesia yang wajar diketik pembeli → kunci section (#kontak, #layanan sudah dari sectionFromAnchor). */
const ANCHOR_ALIASES: Record<string, string> = {
  cara: 'steps',
  'cara-konsultasi': 'steps',
  langkah: 'steps',
  dokter: 'doctors',
  'dokter-online': 'doctors',
  cari: 'doctors',
  resep: 'prescription',
  obat: 'prescription',
  'tebus-obat': 'prescription',
  apotek: 'prescription',
  'rekam-medis': 'records',
  rekam: 'records',
  riwayat: 'records',
  pengingat: 'reminders',
  kontrol: 'reminders',
  rs: 'hospitals',
  'rs-mitra': 'hospitals',
  mitra: 'hospitals',
  'rumah-sakit': 'hospitals',
  biaya: 'pricing',
  harga: 'pricing',
  paket: 'pricing',
  aplikasi: 'download',
  unduh: 'download',
  'tanya-jawab': 'faq',
  bantuan: 'contact',
};

/** Target tautan section ("dokter", "doctors", "kontak") → kunci section, atau null bila tidak dikenal. */
export function sectionTarget(target: string): string | null {
  const clean = sectionFromAnchor(target);
  const key = ANCHOR_ALIASES[clean] ?? clean;
  return KNOWN_SECTIONS.has(key) ? key : null;
}

// ─── Teks kecil ───────────────────────────────────────────────────────────────

/** Baris textarea → daftar (baris kosong dibuang), maks. `max`. */
export const splitLines = (raw: string, max = 4): string[] =>
  (raw || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•·*]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, max);

/** Status dokter "Online"/"Tersedia"/"Aktif" → titik hijau; selain itu (mis. "Jadwal 19.00") titik abu. */
export const isOnline = (status: string): boolean => /\b(online|tersedia|aktif|siaga)\b/i.test(status || '');

/** Nomor dua digit "01". */
export const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Nomor HP Indonesia yang ditulis rapat ("081234567890") → "0812-3456-7890" untuk dibaca; format lain apa adanya. */
export const displayPhone = (raw: string): string => {
  const value = (raw || '').trim();
  return /^08\d{8,11}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8)}` : value;
};

/** Nomor darurat pendek (mis. "119") atau nomor biasa → tel:; bukan angka 3-15 digit → "". */
export function emergencyTel(raw: string): string {
  const value = (raw || '').trim();
  const digits = value.replace(/[\s().-]/g, '');
  if (/^\d{3,6}$/.test(digits)) return `tel:${digits}`;
  return /^\+?\d{7,15}$/.test(digits) ? telHref(value) : '';
}

/** Teks bersih satu baris: karakter kontrol dibuang, spasi dirapikan, dipotong ke `max`. */
export function cleanText(raw: string, max: number): string {
  const visible = Array.from(raw || '', (ch) => {
    const code = ch.charCodeAt(0);
    return code < 32 || code === 127 ? ' ' : ch;
  }).join('');
  return Array.from(visible.replace(/\s+/g, ' ').trim()).slice(0, max).join('').trim();
}

// ─── Dokter: cari & saring ────────────────────────────────────────────────────

/** Teks untuk dicocokkan: huruf kecil, tanpa aksen, tanda baca → spasi. */
export const normalizeSearch = (raw: string): string =>
  (raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Spesialis unik (urutan pertama muncul) untuk tombol saringan. */
export function specialtiesOf(items: ListItem[]): string[] {
  const seen = new Map<string, string>();
  for (const item of items) {
    const label = field(item, 'specialty');
    const key = normalizeSearch(label);
    if (key && !seen.has(key)) seen.set(key, label);
  }
  return Array.from(seen.values());
}

/**
 * Dokter yang cocok: `specialty` (kosong = semua) dibandingkan tanpa beda huruf besar/aksen; `query` dipecah per kata
 * dan SETIAP kata harus ada di nama, spesialis, atau kata kunci keluhan.
 */
export function filterDoctors(items: ListItem[], query: string, specialty: string): ListItem[] {
  const words = normalizeSearch(query).split(' ').filter(Boolean);
  const wanted = normalizeSearch(specialty);
  return items.filter((item) => {
    if (wanted && normalizeSearch(field(item, 'specialty')) !== wanted) return false;
    if (words.length === 0) return true;
    const haystack = ` ${normalizeSearch(`${field(item, 'name')} ${field(item, 'specialty')} ${field(item, 'keywords')}`)} `;
    return words.every((word) => haystack.includes(word));
  });
}

// ─── Pengingat kontrol (.ics & Google Calendar, dibuat di perangkat) ─────────

export interface ReminderForm {
  type: string;
  date: string;
  time: string;
  alarm: string;
  note: string;
}

export type ReminderErrors = Partial<Record<keyof ReminderForm, string>>;

/** Pilihan "Ingatkan": kunci → [label, TRIGGER iCalendar]. */
export const ALARMS: Record<string, readonly [label: string, trigger: string]> = {
  '30m': ['30 menit sebelumnya', '-PT30M'],
  '1h': ['1 jam sebelumnya', '-PT1H'],
  '1d': ['1 hari sebelumnya', '-P1D'],
};
export const DEFAULT_ALARM = '1h';
/** Pilihan jenis bila `reminders.types` kosong. */
export const DEFAULT_TYPES = ['Kontrol ke dokter', 'Tebus obat lanjutan', 'Cek laboratorium'] as const;
export const REMINDER_NOTE_MAX = 80;
/** Lama acara di kalender (menit). */
export const REMINDER_MINUTES = 30;

/** Pilihan "Jenis pengingat" dari CMS (maks. 6), atau bawaan bila kosong. */
export function reminderTypes(section: SectionContent): string[] {
  const own = list(section, 'types', 6)
    .map((item) => cleanText(field(item, 'label'), 30))
    .filter(Boolean);
  return own.length > 0 ? Array.from(new Set(own)) : [...DEFAULT_TYPES];
}

/** Tanggal lokal "YYYY-MM-DD" (bukan UTC: pengunjung di WIB tengah malam tetap mendapat tanggal hari ini). */
export const isoDate = (d: Date): string => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const validDate = (value: string): boolean => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d;
};
const validTime = (value: string): boolean => /^([01]\d|2[0-3]):[0-5]\d$/.test(value || '');

/** Pesan galat per isian (kosong = valid). `today` = "YYYY-MM-DD" lokal. */
export function validateReminder(form: ReminderForm, types: readonly string[], today: string): ReminderErrors {
  const errors: ReminderErrors = {};
  if (!types.includes(form.type)) errors.type = 'Pilih jenis pengingat.';
  if (!form.date) errors.date = 'Pilih tanggal.';
  else if (!validDate(form.date)) errors.date = 'Tanggal tidak valid.';
  else if (form.date < today) errors.date = 'Pilih tanggal hari ini atau sesudahnya.';
  if (!form.time) errors.time = 'Pilih jam.';
  else if (!validTime(form.time)) errors.time = 'Jam tidak valid.';
  return errors;
}

/** Urutan isian (fokus ke galat pertama). */
export const REMINDER_FIELDS: (keyof ReminderForm)[] = ['type', 'date', 'time'];

const stamp = (date: string, time: string, plusMinutes = 0): string => {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const t = new Date(y, mo - 1, d, h, mi + plusMinutes);
  return `${t.getFullYear()}${pad2(t.getMonth() + 1)}${pad2(t.getDate())}T${pad2(t.getHours())}${pad2(t.getMinutes())}00`;
};

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/** "Kamis, 5 November 2026 · 09.00" (tanpa Intl, sama di semua peramban). */
export function reminderWhen(date: string, time: string): string {
  if (!validDate(date) || !validTime(time)) return '';
  const [y, mo, d] = date.split('-').map(Number);
  const day = new Date(y, mo - 1, d).getDay();
  return `${DAYS[day]}, ${d} ${MONTHS[mo - 1]} ${y} · ${time.replace(':', '.')}`;
}

/** Judul acara: "Kontrol ke dokter — HealthLink". */
export const reminderTitle = (form: ReminderForm, brand: string): string => {
  const name = cleanText(brand, 60);
  return name ? `${cleanText(form.type, 30)} — ${name}` : cleanText(form.type, 30);
};

const reminderDetails = (form: ReminderForm, brand: string): string => {
  const note = cleanText(form.note, REMINDER_NOTE_MAX);
  const source = cleanText(brand, 60);
  return [note && `Catatan: ${note}`, source && `Dibuat dari situs ${source}.`].filter(Boolean).join('\n');
};

/** Teks iCalendar: \ ; , dan baris baru di-escape (RFC 5545 §3.3.11). */
const icsText = (value: string): string => value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Lipat baris panjang (RFC 5545 §3.1): potongan ≤ 60 karakter, lanjutan diawali satu spasi. */
const fold = (line: string): string => {
  const chars = Array.from(line);
  if (chars.length <= 74) return line;
  const parts: string[] = [];
  for (let i = 0; i < chars.length; i += 60) parts.push(chars.slice(i, i + 60).join(''));
  return parts.join('\r\n ');
};

/**
 * File .ics satu acara (waktu lokal "mengambang", tanpa zona: kalender pengunjung memakai zona perangkatnya) dengan
 * pengingat sesuai pilihan. `now` hanya untuk DTSTAMP & UID.
 */
export function reminderIcs(form: ReminderForm, brand: string, now: Date): string {
  const alarm = ALARMS[form.alarm] ?? ALARMS[DEFAULT_ALARM];
  const title = reminderTitle(form, brand);
  const details = reminderDetails(form, brand);
  const utc = `${now.getUTCFullYear()}${pad2(now.getUTCMonth() + 1)}${pad2(now.getUTCDate())}T${pad2(now.getUTCHours())}${pad2(now.getUTCMinutes())}${pad2(now.getUTCSeconds())}Z`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Garuda Nexa//Template HealthLink//ID',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${stamp(form.date, form.time)}-${now.getTime()}@pengingat.healthlink`,
    `DTSTAMP:${utc}`,
    `DTSTART:${stamp(form.date, form.time)}`,
    `DTEND:${stamp(form.date, form.time, REMINDER_MINUTES)}`,
    `SUMMARY:${icsText(title)}`,
    details && `DESCRIPTION:${icsText(details)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsText(title)}`,
    `TRIGGER:${alarm[1]}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean) as string[];
  return `${lines.map(fold).join('\r\n')}\r\n`;
}

/** Nama file unduhan, mis. "pengingat-2026-11-05.ics". */
export const reminderFileName = (form: ReminderForm): string => `pengingat-${validDate(form.date) ? form.date : 'kontrol'}.ics`;

/** Tautan "Tambahkan ke Google Calendar" (tanpa ctz: zona kalender pengunjung). */
export function googleCalendarHref(form: ReminderForm, brand: string): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: reminderTitle(form, brand),
    dates: `${stamp(form.date, form.time)}/${stamp(form.date, form.time, REMINDER_MINUTES)}`,
    details: reminderDetails(form, brand),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// ─── Lain-lain ────────────────────────────────────────────────────────────────

export interface SocialLink {
  key: string;
  label: string;
  href: string;
}

export const socialLinks = (footer: SectionContent): SocialLink[] =>
  SOCIAL_FIELDS.map(({ key, label }) => ({ key, label, href: safeUrl(text(footer, key)) ?? '' })).filter((s) => s.href);

/** Pesan WhatsApp bawaan per aksi. */
export const MESSAGES = {
  chat: (brand: string) => `Halo ${brand}, saya ingin chat dengan dokter.`,
  video: (brand: string) => `Halo ${brand}, saya ingin menjadwalkan video call dengan dokter.`,
  doctor: (brand: string, name: string, specialty: string) =>
    `Halo ${brand}, saya ingin konsultasi dengan ${name}${specialty ? ` (${specialty})` : ''}.`,
  plan: (brand: string, plan: string) => `Halo ${brand}, saya tertarik dengan paket ${plan}.`,
  prescription: (brand: string) => `Halo ${brand}, saya ingin menebus resep digital.`,
  records: (brand: string) => `Halo ${brand}, saya ingin bertanya tentang aplikasi dan riwayat kesehatan saya.`,
  download: (brand: string) => `Halo ${brand}, saya ingin tautan unduhan aplikasinya.`,
} as const;

// ─── Model ────────────────────────────────────────────────────────────────────

export function readHealthLink(content: SiteContent) {
  const section = (key: string) => getSection(content, key);
  const brand = section('brand');
  const hero = section('hero');
  const contact = section('contact');
  const footer = section('footer');

  const companyName = text(brand, 'company_name') || 'Nama Layanan';
  const whatsapp = text(contact, 'whatsapp');
  const waLink = whatsappHref(whatsapp, text(contact, 'whatsapp_message'));
  const waAction: LinkAction | null = waLink ? { kind: 'external', href: waLink } : null;

  /** Section tampil & berisi di halaman (sectionShown). */
  const shown = (key: string): boolean => sectionShown(content, key);
  /** Item yang dirender untuk section `key` (sectionItems). */
  const items = (key: string): ListItem[] => sectionItems(key, section(key));
  const sectionAction = (key: string): LinkAction | null => (shown(key) ? { kind: 'section', target: key } : null);
  const contactAction = sectionAction('contact');
  /**
   * Isi field URL: "#dokter", "#resep" dsb. hanya bila section itu tampil (anchor Indonesia diterjemahkan);
   * anchor tak dikenal / section tersembunyi / kosong → `fallback`.
   */
  const linkOr = (raw: string, fallback: LinkAction | null): LinkAction | null => {
    const action = resolveAction(raw, fallback);
    if (action?.kind !== 'section') return action;
    const target = sectionTarget(action.target);
    if (target === 'hero') return { kind: 'section', target };
    return target && shown(target) ? { kind: 'section', target } : fallback;
  };
  /** WhatsApp dengan pesan bebas ke nomor Bantuan; tanpa nomor → bagian Bantuan; tanpa keduanya → null. */
  const waWith = (message: string): LinkAction | null => {
    const link = whatsappHref(whatsapp, message);
    return link ? { kind: 'external', href: link } : contactAction;
  };

  const chatUrl = safeUrl(text(hero, 'chat_url'));
  /** Tujuan "chat dokter": aplikasi/portal pembeli, kalau tidak WhatsApp, kalau tidak Bantuan. */
  const chatAction = linkOr(text(hero, 'chat_url'), waWith(MESSAGES.chat(companyName)));
  const videoAction = linkOr(text(hero, 'video_url'), waWith(MESSAGES.video(companyName)));

  /** Tujuan otomatis untuk ikon ubin/layanan. */
  const actionForIcon = (icon: IconKey): LinkAction | null => {
    switch (icon) {
      case 'chat':
        return chatAction;
      case 'video':
        return videoAction;
      case 'prescription':
      case 'pharmacy':
      case 'delivery':
        return sectionAction('prescription') ?? chatAction;
      case 'records':
      case 'lab':
        return sectionAction('records') ?? chatAction;
      case 'reminder':
        return sectionAction('reminders') ?? chatAction;
      case 'hospital':
        return sectionAction('hospitals') ?? chatAction;
      case 'family':
        return sectionAction('pricing') ?? chatAction;
      default:
        return sectionAction('doctors') ?? chatAction;
    }
  };
  /** Tautan ubin/kartu layanan: isian sendiri, kalau kosong tujuan otomatis dari ikon judulnya. */
  const itemAction = (title: string, raw: string): LinkAction | null => linkOr(raw, actionForIcon(iconKey(title)));
  /** Tombol chat di kartu dokter: aplikasi/portal (sama untuk semua dokter) atau WhatsApp dengan nama dokter. */
  const doctorAction = (item: ListItem): LinkAction | null =>
    chatUrl ? { kind: 'external', href: chatUrl } : waWith(MESSAGES.doctor(companyName, field(item, 'name'), field(item, 'specialty')));
  const planAction = (item: ListItem): LinkAction | null => waWith(MESSAGES.plan(companyName, field(item, 'name') || field(item, 'price')));

  const download = section('download');
  const stores = [
    { key: 'android', label: text(download, 'android_label'), href: safeUrl(text(download, 'android_url')) ?? '' },
    { key: 'ios', label: text(download, 'ios_label'), href: safeUrl(text(download, 'ios_url')) ?? '' },
  ].filter((s) => s.label && s.href);

  const tiles = list(hero, 'tiles', 4).filter((item) => field(item, 'label'));
  const chips = list(hero, 'chips', 2).filter((item) => field(item, 'label') || field(item, 'text'));
  const emergencyHref = emergencyTel(text(contact, 'emergency_phone'));

  return {
    brand,
    hero,
    services: section('services'),
    steps: section('steps'),
    doctors: section('doctors'),
    prescription: section('prescription'),
    records: section('records'),
    reminders: section('reminders'),
    hospitals: section('hospitals'),
    pricing: section('pricing'),
    download,
    faq: section('faq'),
    contact,
    footer,
    companyName,
    tagline: text(brand, 'tagline'),
    logo: text(brand, 'logo'),
    colors: healthlinkVars(text(brand, 'accent_color')),
    whatsapp,
    waAction,
    contactAction,
    chatAction,
    videoAction,
    shown,
    items,
    sectionAction,
    linkOr,
    waWith,
    itemAction,
    doctorAction,
    planAction,
    tiles,
    chips,
    stores,
    emergencyHref,
    emergencyPhone: text(contact, 'emergency_phone'),
    prescriptionAction: linkOr(text(section('prescription'), 'button_url'), waWith(MESSAGES.prescription(companyName))),
    recordsAction: linkOr(text(section('records'), 'button_url'), waWith(MESSAGES.records(companyName))),
    downloadFallback: waWith(MESSAGES.download(companyName)),
    /** Tombol di menu atas */
    headerLabel: text(hero, 'header_label'),
    headerAction: linkOr(text(hero, 'header_url'), chatAction),
    /** Bilah aksi bawah (HP) */
    dockChatLabel: text(hero, 'dock_chat_label'),
    dockVideoLabel: text(hero, 'dock_video_label'),
    nav: navItems(content),
    socials: socialLinks(footer),
    tel: telHref(text(contact, 'phone')),
    mail: mailHref(text(contact, 'email')),
    map: mapsInfo(text(contact, 'maps_url'), text(contact, 'maps_query') || text(contact, 'address')),
    year: new Date().getFullYear(),
  };
}

export type HealthLinkModel = ReturnType<typeof readHealthLink>;
