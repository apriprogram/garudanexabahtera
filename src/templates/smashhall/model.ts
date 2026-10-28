// Turunan konten SmashHall (fungsi murni, tanpa React): warna tema (aksen terang di pita gelap), section yang tampil,
// menu, tujuan tautan, data ketersediaan lapangan (jam, lapangan, hari, slot penuh dari teks CMS), pesan WhatsApp
// (booking slot, paket member, akademi, turnamen, produk), formulir booking & pendaftaran, dan peta lokasi. Semua tahan
// konten mentah (null, angka, list rusak). Tidak ada data yang dikirim ke server atau disimpan di website: semua tombol
// hanya MENYUSUN pesan WhatsApp untuk admin. Jadwal adalah contoh dari CMS, bukan sistem booking.
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
import { SMASHHALL_ACCENT } from './defaultContent';

// ─── Warna ────────────────────────────────────────────────────────────────────

type Rgb = [number, number, number];
const WHITE: Rgb = [255, 255, 255];
/** Tinta hampir hitam #171512: pita kejuaraan & kartu paket sorotan */
export const NIGHT: Rgb = [23, 21, 18];
const toHex = (rgb: Rgb) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
/** Campuran dibulatkan: kontras dihitung dari warna yang benar-benar ditulis sebagai hex. */
const mix = (a: Rgb, b: Rgb, amountOfA: number): Rgb => a.map((c, i) => Math.round(c * amountOfA + b[i] * (1 - amountOfA))) as Rgb;

const accentOf = (raw: string): Rgb => parseHex(raw) ?? (parseHex(SMASHHALL_ACCENT) as Rgb);

/**
 * Variabel warna lokal SmashHall (di samping --tpl-accent* milik Shell), dari SATU warna tema:
 * --sh-bright = warna tema dicerahkan sampai ≥ 4,5:1 di atas tinta #171512 (teks & ikon aksen di pita gelap).
 */
export function smashhallVars(accentRaw: string): CSSProperties {
  let bright = accentOf(accentRaw);
  for (let i = 0; i < 24 && contrast(bright, NIGHT) < 4.5; i += 1) bright = mix(bright, WHITE, 0.8);
  return { '--sh-bright': toHex(bright) } as CSSProperties;
}

// ─── Teks kecil ───────────────────────────────────────────────────────────────

/** Teks bersih satu baris: karakter kontrol dibuang, spasi dirapikan, dipotong ke `max`. */
export function cleanText(raw: string, max: number): string {
  const visible = Array.from(raw || '', (ch) => {
    const code = ch.charCodeAt(0);
    return code < 32 || code === 127 ? ' ' : ch;
  }).join('');
  return Array.from(visible.replace(/\s+/g, ' ').trim()).slice(0, max).join('').trim();
}

/** Daftar dipisah baris baru (atau "·" / "|") → butir bersih. */
export const splitLines = (raw: string): string[] =>
  (raw || '')
    .split(/\r?\n|\s*[·|•]\s*/)
    .map((line) => line.trim())
    .filter(Boolean);

/** "16 Nov" → ["16", "Nov"]; format lain → [teks, ""]. */
export function splitDate(raw: string): [string, string] {
  const match = /^\s*(\d{1,2})\s+(\S.*)$/.exec(raw || '');
  return match ? [match[1], match[2].trim()] : [(raw || '').trim(), ''];
}

/** Nada label status turnamen: "dibuka" → open (oranye), "selesai" → done (abu), selain itu netral. */
export function statusTone(status: string): 'open' | 'done' | 'neutral' {
  if (/selesai|ditutup|tutup|berakhir/i.test(status || '')) return 'done';
  if (/dibuka|\bbuka\b|open/i.test(status || '')) return 'open';
  return 'neutral';
}

/** Nomor HP Indonesia yang ditulis rapat ("081234567890") → "0812-3456-7890"; format lain apa adanya. */
export const displayPhone = (raw: string): string => {
  const value = (raw || '').trim();
  return /^08\d{8,11}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8)}` : value;
};

// ─── Ketersediaan lapangan ────────────────────────────────────────────────────

export interface Court {
  name: string;
  short: string;
}

/** "19", "19.00", "19:00", "7.30" → "19.00" / "07.30"; bukan jam → "". */
export function normalizeHour(raw: string): string {
  const match = /^(\d{1,2})(?:[.:](\d{2}))?$/.exec((raw || '').trim());
  if (!match) return '';
  const hour = Number(match[1]);
  const minute = match[2] ?? '00';
  if (hour > 24 || Number(minute) > 59) return '';
  return `${String(hour).padStart(2, '0')}.${minute}`;
}

/** Jam kolom tabel dari teks CMS ("16.00 · 17.00 …"), unik, maks. 8. */
export function parseHours(raw: string): string[] {
  const hours = (raw || '')
    .split(/\s*[·,|;•]\s*|\s+/)
    .map(normalizeHour)
    .filter(Boolean);
  return Array.from(new Set(hours)).slice(0, 8);
}

/** Lapangan dari CMS (maks. 8): nama/kode kosong diisi "Lapangan n" / "Ln". */
export function courtsOf(section: SectionContent): Court[] {
  return list(section, 'courts', 8)
    .filter((item) => field(item, 'name') || field(item, 'short'))
    .map((item, i) => ({
      name: field(item, 'name') || `Lapangan ${i + 1}`,
      short: cleanText(field(item, 'short'), 4) || `L${i + 1}`,
    }));
}

/** Hari dari CMS (maks. 7) yang bernama. */
export const daysOf = (section: SectionContent): ListItem[] => list(section, 'days', 7).filter((item) => !!field(item, 'label'));

export interface SlotLabels {
  free: string;
  full: string;
  chosen: string;
}

/** Legenda slot dari CMS (tabel & strip hero); kosong → "Kosong" / "Penuh" / "Dipilih". */
export const slotLabels = (section: SectionContent): SlotLabels => ({
  free: cleanText(text(section, 'free_label'), 16) || 'Kosong',
  full: cleanText(text(section, 'full_label'), 16) || 'Penuh',
  chosen: cleanText(text(section, 'chosen_label'), 16) || 'Dipilih',
});

/** Judul kolom jadwal latihan bawaan (Hari · Jam · Program · Level · Pelatih). */
export const TRAINING_COLUMNS = ['Hari', 'Jam', 'Program', 'Level', 'Pelatih'] as const;

/** Lima judul kolom jadwal dari teks CMS dipisah "·" / "|" / koma; kolom kosong → judul bawaan. */
export function trainingColumns(raw: string): string[] {
  const parts = (raw || '').split(/\s*[·|,•]\s*/).map((part) => cleanText(part, 24));
  return TRAINING_COLUMNS.map((fallback, i) => parts[i] || fallback);
}

/** Kunci sel "indeksLapangan|jam". */
export const slotKey = (court: number, hour: string): string => `${court}|${hour}`;

/**
 * Slot PENUH dari teks CMS, mis. "L1 19.00, L3 20.00, L5 semua". Kode lapangan dicocokkan dengan kode singkat (tanpa
 * beda huruf besar/kecil) atau nomor urut ("3", "L3"); jam dinormalkan ("19" = "19.00"). Isian tak dikenal dilewati.
 */
export function parseFull(raw: string, courts: Court[], hours: string[]): Set<string> {
  const full = new Set<string>();
  for (const token of (raw || '').split(/[,;\n·]+/)) {
    const match = /^\s*(\S+)\s+(semua|\S+)\s*$/i.exec(token);
    if (!match) continue;
    const code = match[1].toLowerCase();
    let court = courts.findIndex((c) => c.short.toLowerCase() === code);
    if (court < 0) {
      const n = Number(/^l?(\d{1,2})$/i.exec(code)?.[1] ?? NaN);
      court = Number.isInteger(n) && n >= 1 && n <= courts.length ? n - 1 : -1;
    }
    if (court < 0) continue;
    if (/^semua$/i.test(match[2])) {
      for (const hour of hours) full.add(slotKey(court, hour));
      continue;
    }
    const hour = normalizeHour(match[2]);
    if (hour && hours.includes(hour)) full.add(slotKey(court, hour));
  }
  return full;
}

/** Indeks hari "hari ini": 7 hari (Senin–Minggu) → hari ini menurut tanggal; selain itu hari pertama. */
export function todayIndex(count: number, date: Date = new Date()): number {
  if (count <= 0) return 0;
  return count === 7 ? (date.getDay() + 6) % 7 : 0;
}

/** Pesan WhatsApp booking satu slot. */
export function bookingMessage(companyName: string, day: string, hour: string, court: string): string {
  const company = cleanText(companyName, 80);
  const greeting = company ? `Halo ${company}, saya ingin booking lapangan.` : 'Halo, saya ingin booking lapangan.';
  return `${greeting}\n\nHari: ${cleanText(day, 24)}\nJam: ${hour}\nLapangan: ${cleanText(court, 24)}\n\nMohon konfirmasi ketersediaannya. Terima kasih.`;
}

// ─── Paket member ─────────────────────────────────────────────────────────────

/** Harga per bulan untuk periode yang dipilih (paket 3 bulan kosong → harga bulanan). */
export const planPrice = (plan: ListItem, quarterly: boolean): string =>
  quarterly ? field(plan, 'price_quarter') || field(plan, 'price') : field(plan, 'price');

/** Indeks paket sorotan: paket PERTAMA yang berlabel; tanpa label → -1. */
export const featuredIndex = (plans: ListItem[]): number => plans.findIndex((plan) => !!field(plan, 'badge'));

/** Pesan WhatsApp gabung member. */
export function joinMessage(companyName: string, plan: string, period: string, price: string, unit: string): string {
  const company = cleanText(companyName, 80);
  const detail = [period, price && `${price}${unit}`].filter(Boolean).join(': ');
  return `Halo${company ? ` ${company}` : ''}, saya ingin gabung member ${cleanText(plan, 24)}${detail ? ` (${detail})` : ''}.`;
}

/** Pesan WhatsApp pendek: "Halo {nama}, saya ingin {isi}." */
export const askMessage = (companyName: string, body: string): string => {
  const company = cleanText(companyName, 80);
  return `Halo${company ? ` ${company}` : ''}, saya ingin ${body}.`;
};

/** Pesan WhatsApp pesan produk toko (tanpa keranjang belanja). */
export function orderMessage(companyName: string, item: string, price: string): string {
  return `${askMessage(companyName, `memesan ${cleanText(item, 40)}${price ? ` (${cleanText(price, 20)})` : ''}`)} Apakah stoknya ada?`;
}

// ─── Formulir booking & pendaftaran ───────────────────────────────────────────

export const PURPOSES = ['Booking lapangan', 'Member bulanan', 'Akademi', 'Kejuaraan', 'Perlengkapan', 'Lainnya'] as const;
export const PLAYERS = ['2 orang', '4 orang', 'Lainnya'] as const;
/** Pilihan jam bila tabel ketersediaan tidak punya jam. */
export const UNKNOWN_TIME = 'Belum tahu';

export interface BookingForm {
  purpose: string;
  name: string;
  date: string;
  time: string;
  players: string;
  note: string;
}

export type BookingErrors = Partial<Record<keyof BookingForm, string>>;

export const EMPTY_BOOKING: BookingForm = { purpose: '', name: '', date: '', time: UNKNOWN_TIME, players: '', note: '' };

/** Batas panjang per isian (juga atribut maxLength). */
export const BOOKING_LIMITS: Record<keyof BookingForm, number> = { purpose: 24, name: 60, date: 10, time: 12, players: 12, note: 300 };

/** Urutan isian wajib (fokus ke galat pertama). */
export const REQUIRED_BOOKING: (keyof BookingForm)[] = ['purpose', 'name', 'date'];

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const WEEKDAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/** "2026-11-14" → "Sabtu, 14 November 2026"; tanggal tidak valid → "". */
export function formatDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((iso || '').trim());
  if (!match) return '';
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return '';
  return `${WEEKDAYS[date.getUTCDay()]}, ${day} ${MONTHS[month - 1]} ${year}`;
}

/** Galat per isian (kosong = valid). Tanggal wajib untuk booking lapangan. */
export function validateBooking(form: BookingForm): BookingErrors {
  const errors: BookingErrors = {};
  if (!(PURPOSES as readonly string[]).includes(form.purpose)) errors.purpose = 'Pilih keperluan.';
  if (cleanText(form.name, BOOKING_LIMITS.name).length < 2) errors.name = 'Tulis nama Anda.';
  if (form.purpose === 'Booking lapangan' && !formatDate(form.date)) errors.date = 'Pilih tanggal main.';
  else if (form.date && !formatDate(form.date)) errors.date = 'Tanggal tidak valid.';
  return errors;
}

const PURPOSE_VERB: Record<string, string> = {
  'Booking lapangan': 'booking lapangan',
  'Member bulanan': 'gabung member bulanan',
  Akademi: 'mendaftar akademi',
  Kejuaraan: 'mendaftar kejuaraan',
  Perlengkapan: 'memesan perlengkapan',
  Lainnya: 'bertanya',
};

/** Pesan WhatsApp formulir: salam sesuai keperluan, baris kosong, lalu baris isian yang terisi. */
export function bookingFormMessage(form: BookingForm, companyName: string): string {
  const value = (key: keyof BookingForm) => cleanText(form[key], BOOKING_LIMITS[key]);
  const date = formatDate(form.date);
  const time = value('time');
  const players = (PLAYERS as readonly string[]).includes(form.players) ? form.players : '';
  const rows = [
    `Nama: ${value('name')}`,
    `Keperluan: ${value('purpose')}`,
    date && `Tanggal: ${date}`,
    time && time !== UNKNOWN_TIME && `Jam: ${time}`,
    players && `Jumlah pemain: ${players}`,
    value('note') && `Catatan: ${value('note')}`,
  ].filter(Boolean);
  return `${askMessage(companyName, PURPOSE_VERB[form.purpose] ?? 'bertanya')}\n\n${rows.join('\n')}`;
}

/** mailto: dengan subjek dan isi pesan (dipotong 1800 huruf); email tidak valid → "". */
export function bookingMailHref(email: string, body: string): string {
  const mail = mailHref(email);
  if (!mail) return '';
  return `${mail}?subject=${encodeURIComponent('Booking & pendaftaran')}&body=${encodeURIComponent(Array.from(body).slice(0, 1800).join(''))}`;
}

// ─── Section di halaman ───────────────────────────────────────────────────────

/** Kunci section yang punya tempat di halaman (urutan halaman; = section skema tanpa `brand`). */
export const PAGE_SECTIONS = [
  'hero',
  'availability',
  'facilities',
  'membership',
  'training',
  'academy',
  'championships',
  'shop',
  'gallery',
  'faq',
  'contact',
  'footer',
] as const;
const KNOWN_SECTIONS = new Set<string>(PAGE_SECTIONS);

/** [kunci list, maks. item (= skema), syarat item dirender] per section berdaftar. */
const ITEMS: Record<string, [listKey: string, max: number, keep: (item: ListItem) => boolean]> = {
  membership: ['plans', 3, (i) => !!field(i, 'name')],
  academy: ['groups', 3, (i) => !!field(i, 'name')],
  championships: ['events', 5, (i) => !!field(i, 'name')],
  shop: ['items', 8, (i) => !!field(i, 'name')],
  gallery: ['items', 8, (i) => hasImage(field(i, 'image'))],
  faq: ['items', 8, (i) => !!field(i, 'question')],
};

/** Item yang dirender untuk section `key` (lihat ITEMS); section tanpa daftar → []. */
export function sectionItems(key: string, section: SectionContent): ListItem[] {
  const rule = ITEMS[key];
  return rule ? list(section, rule[0], rule[1]).filter(rule[2]) : [];
}

export const trainingSessions = (section: SectionContent): ListItem[] =>
  list(section, 'sessions', 10).filter((i) => field(i, 'day') || field(i, 'program'));
export const trainingCoaches = (section: SectionContent): ListItem[] => list(section, 'coaches', 4).filter((i) => !!field(i, 'name'));
export const facilityStats = (section: SectionContent): ListItem[] => list(section, 'stats', 4).filter((i) => field(i, 'value') || field(i, 'label'));
export const facilityItems = (section: SectionContent): ListItem[] => list(section, 'items', 10).filter((i) => !!field(i, 'label'));

/** Section tampil dan berisi? Kunci yang tidak dikenal (mis. salah ketik di field URL) → false. */
export function sectionShown(content: SiteContent, key: string): boolean {
  if (!KNOWN_SECTIONS.has(key)) return false;
  const s = getSection(content, key);
  if (!isEnabled(s)) return false;
  if (key in ITEMS) return sectionItems(key, s).length > 0;
  if (key === 'availability') return courtsOf(s).length > 0 && parseHours(text(s, 'hours')).length > 0 && daysOf(s).length > 0;
  if (key === 'training') return trainingSessions(s).length > 0 || trainingCoaches(s).length > 0;
  if (key === 'facilities') return !!(text(s, 'title') || hasImage(text(s, 'image')) || facilityStats(s).length > 0 || facilityItems(s).length > 0);
  return true;
}

// ─── Menu & tautan ────────────────────────────────────────────────────────────

export interface SmashNavItem {
  key: string;
  label: string;
}

const NAV: SmashNavItem[] = [
  { key: 'availability', label: 'Jadwal' },
  { key: 'membership', label: 'Member' },
  { key: 'training', label: 'Latihan' },
  { key: 'academy', label: 'Akademi' },
  { key: 'championships', label: 'Kejuaraan' },
  { key: 'shop', label: 'Toko' },
  { key: 'contact', label: 'Kontak' },
];

/** Label menu dari label kecil section bila singkat (≤ 10 huruf, ≤ 2 kata), selain itu label bawaan. */
const shortLabel = (section: SectionContent, fallback: string) => {
  const eyebrow = text(section, 'eyebrow');
  return eyebrow && eyebrow.length <= 10 && eyebrow.split(/\s+/).length <= 2 ? eyebrow : fallback;
};

/** Menu hanya untuk section yang benar-benar tampil (tanpa tautan mati). */
export function navItems(content: SiteContent): SmashNavItem[] {
  return NAV.filter(({ key }) => sectionShown(content, key)).map(({ key, label }) => ({ key, label: shortLabel(getSection(content, key), label) }));
}

/** Anchor berbahasa Indonesia yang wajar diketik pembeli → kunci section. */
const ANCHOR_ALIASES: Record<string, string> = {
  jadwal: 'availability',
  ketersediaan: 'availability',
  booking: 'availability',
  lapangan: 'availability',
  fasilitas: 'facilities',
  member: 'membership',
  paket: 'membership',
  latihan: 'training',
  pelatih: 'training',
  akademi: 'academy',
  kejuaraan: 'championships',
  turnamen: 'championships',
  toko: 'shop',
  perlengkapan: 'shop',
  'tanya-jawab': 'faq',
  formulir: 'contact',
  lokasi: 'contact',
};

/** Target tautan section ("jadwal", "availability", "kontak") → kunci section di halaman, atau null bila tidak dikenal. */
export function sectionTarget(target: string): string | null {
  const clean = sectionFromAnchor(target);
  const key = ANCHOR_ALIASES[clean] ?? clean;
  return KNOWN_SECTIONS.has(key) ? key : null;
}

export interface SocialLink {
  key: string;
  label: string;
  href: string;
}

export const socialLinks = (footer: SectionContent): SocialLink[] =>
  SOCIAL_FIELDS.map(({ key, label }) => ({ key, label, href: safeUrl(text(footer, key)) ?? '' })).filter((s) => s.href);

// ─── Model ────────────────────────────────────────────────────────────────────

export function readSmashhall(content: SiteContent, now: Date = new Date()) {
  const section = (key: string) => getSection(content, key);
  const brand = section('brand');
  const hero = section('hero');
  const availability = section('availability');
  const contact = section('contact');
  const footer = section('footer');

  const companyName = text(brand, 'company_name') || 'Nama GOR';
  const whatsapp = text(contact, 'whatsapp');
  const waLink = whatsappHref(whatsapp, text(contact, 'whatsapp_message'));
  const waAction: LinkAction | null = waLink ? { kind: 'external', href: waLink } : null;

  const shown = (key: string): boolean => sectionShown(content, key);
  const items = (key: string): ListItem[] => sectionItems(key, section(key));
  const sectionAction = (key: string): LinkAction | null => (shown(key) ? { kind: 'section', target: key } : null);
  const contactAction = sectionAction('contact');
  /**
   * Isi field URL: "#jadwal", "#member", "#kontak" dsb. hanya bila section itu tampil; anchor tak dikenal / section
   * tersembunyi / kosong → `fallback`.
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
  /** Tujuan "booking": tabel ketersediaan, kalau tidak formulir di Kontak, kalau tidak WhatsApp. */
  const bookAction = sectionAction('availability') ?? contactAction ?? waAction;

  // Data ketersediaan: dipakai section Ketersediaan DAN strip di hero (walau section-nya disembunyikan)
  const hours = parseHours(text(availability, 'hours'));
  const courts = courtsOf(availability);
  const days = daysOf(availability);
  const fullByDay = days.map((day) => parseFull(field(day, 'full'), courts, hours));

  return {
    brand,
    hero,
    availability,
    facilities: section('facilities'),
    membership: section('membership'),
    training: section('training'),
    academy: section('academy'),
    championships: section('championships'),
    shop: section('shop'),
    gallery: section('gallery'),
    faq: section('faq'),
    contact,
    footer,
    companyName,
    tagline: text(brand, 'tagline'),
    logo: text(brand, 'logo'),
    colors: smashhallVars(text(brand, 'accent_color')),
    whatsapp,
    waAction,
    contactAction,
    bookAction,
    shown,
    items,
    sectionAction,
    linkOr,
    waWith,
    hours,
    courts,
    days,
    /** Legenda slot (kosong / penuh / dipilih) */
    labels: slotLabels(availability),
    /** Slot penuh per hari (kunci slotKey) */
    fullByDay,
    today: todayIndex(days.length, now),
    /** Tombol utama hero: tautan sendiri, kalau kosong ke Ketersediaan */
    primaryAction: linkOr(text(hero, 'primary_url'), bookAction),
    /** Tombol kedua hero: tautan sendiri, kalau kosong ke Member (lalu Kontak) */
    secondaryAction: linkOr(text(hero, 'secondary_url'), sectionAction('membership') ?? contactAction),
    headerLabel: text(hero, 'header_label'),
    headerAction: linkOr(text(hero, 'header_url'), bookAction),
    nav: navItems(content),
    socials: socialLinks(footer),
    map: mapsInfo(text(contact, 'maps_url'), text(contact, 'maps_query') || text(contact, 'address')),
    year: now.getFullYear(),
  };
}

export type SmashModel = ReturnType<typeof readSmashhall>;
