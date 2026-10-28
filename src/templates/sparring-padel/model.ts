// Turunan konten Sparring Padel (fungsi murni, tanpa React): warna tema (biru-malam, neon terang, tinta tema di pita
// abu), section yang tampil, menu, tujuan tautan "#jadwal", jam booking dari CMS, dan PESAN WHATSAPP untuk bilah
// booking hero, tombol "Book" per baris jadwal, formulir cari lawan main, dan "Daftar" turnamen. Semua tahan konten
// mentah (null, angka, list rusak). JUJUR: formulir hanya MENYUSUN pesan — tidak ada data yang dikirim ke server atau
// disimpan di website; jadwal & harga di halaman adalah contoh yang dikonfirmasi admin; tidak ada pembayaran online.
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
import { SPARRING_ACCENT } from './defaultContent';

// ─── Warna ────────────────────────────────────────────────────────────────────

type Rgb = [number, number, number];
const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];
/** Tinta gelap --tpl-on-accent untuk warna tema terang (= INK di shared/utils accentVars) */
const ON_LIGHT: Rgb = [18, 22, 32];
/** Biru-malam dasar #050C1A: mix(#00D2B4, NAVY, 0.05) = #051622 (bawaan) */
const NAVY: Rgb = [5, 12, 26];
/** Pita abu-dingin #F2F5F7 (turnamen, FAQ) */
export const BAND: Rgb = [242, 245, 247];
const toHex = (rgb: Rgb) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
/** Campuran dibulatkan: kontras dihitung dari warna yang benar-benar ditulis sebagai hex. */
const mix = (a: Rgb, b: Rgb, amountOfA: number): Rgb => a.map((c, i) => Math.round(c * amountOfA + b[i] * (1 - amountOfA))) as Rgb;

const accentOf = (raw: string): Rgb => parseHex(raw) ?? (parseHex(SPARRING_ACCENT) as Rgb);

/**
 * Variabel warna lokal Sparring Padel (di samping --tpl-accent* milik Shell), semuanya dari SATU warna tema:
 * --sp-night: biru-malam (tema 5% + navy), digelapkan sampai putih ≥ 15:1 (hero, header, pita lapangan & komunitas);
 * --sp-neon: warna tema dicerahkan sampai ≥ 4,5:1 di biru-malam DAN di kartu gelap (putih 5% di atasnya);
 * --sp-ink: warna tema digelapkan sampai ≥ 4,5:1 di pita abu #F2F5F7 (otomatis juga di putih).
 */
export function sparringVars(accentRaw: string): CSSProperties {
  const accent = accentOf(accentRaw);
  let night = mix(accent, NAVY, 0.05);
  for (let i = 0; i < 12 && contrast(night, WHITE) < 15; i += 1) night = mix(night, BLACK, 0.85);
  const card = mix(WHITE, night, 0.05);
  let neon = accent;
  for (let i = 0; i < 24 && (contrast(neon, night) < 4.5 || contrast(neon, card) < 4.5); i += 1) neon = mix(neon, WHITE, 0.8);
  let ink = accent;
  for (let i = 0; i < 24 && contrast(ink, BAND) < 4.5; i += 1) ink = mix(ink, BLACK, 0.9);
  return { '--sp-night': toHex(night), '--sp-neon': toHex(neon), '--sp-ink': toHex(ink) } as CSSProperties;
}

/** Hex kartu gelap (putih 5% di atas --sp-night) untuk uji kontras. */
export const darkCardOf = (nightHex: string): string => toHex(mix(WHITE, parseHex(nightHex) ?? NAVY, 0.05));

/** true bila teks di atas bidang warna tema berwarna putih (aturan sama dengan --tpl-on-accent di accentVars). */
export function accentIsDark(accentRaw: string): boolean {
  const accent = accentOf(accentRaw);
  return contrast(accent, WHITE) >= contrast(accent, ON_LIGHT);
}

// ─── Section di halaman ───────────────────────────────────────────────────────

/** Kunci section yang punya tempat di halaman (urutan halaman; = section skema tanpa `brand`). */
export const PAGE_SECTIONS = ['hero', 'schedule', 'courts', 'matchmaking', 'tournaments', 'rental', 'community', 'gallery', 'faq', 'contact', 'footer'] as const;
const KNOWN_SECTIONS = new Set<string>(PAGE_SECTIONS);

/** [kunci list, maks. item (= skema), syarat item dirender] per section. Satu sumber untuk komponen dan menu. */
const ITEMS: Record<string, [listKey: string, max: number, keep: (item: ListItem) => boolean]> = {
  courts: ['items', 6, (i) => !!field(i, 'name')],
  tournaments: ['items', 6, (i) => !!field(i, 'title')],
  rental: ['items', 6, (i) => !!field(i, 'name')],
  gallery: ['items', 8, (i) => hasImage(field(i, 'image'))],
  faq: ['items', 8, (i) => !!field(i, 'question') && !!field(i, 'answer')],
};

/** Item yang dirender untuk section `key` (lihat ITEMS); section tanpa daftar → []. */
export function sectionItems(key: string, section: SectionContent): ListItem[] {
  const rule = ITEMS[key];
  return rule ? list(section, rule[0], rule[1]).filter(rule[2]) : [];
}

/** Baris jadwal yang dirender (sesi wajib punya nama atau jam, dan harga). */
export const scheduleRows = (section: SectionContent, key: 'weekday' | 'weekend'): ListItem[] =>
  list(section, key, 5).filter((row) => (field(row, 'label') || field(row, 'time')) && !!field(row, 'price'));

/** Angka komunitas yang dirender. */
export const communityStats = (section: SectionContent): ListItem[] => list(section, 'stats', 4).filter((i) => !!field(i, 'value') && !!field(i, 'label'));

/** Kegiatan komunitas (strip berjalan). */
export const communityActivities = (section: SectionContent): string[] =>
  list(section, 'activities', 8)
    .map((i) => field(i, 'label'))
    .filter(Boolean);

/** Section tampil dan berisi? Kunci yang tidak dikenal (mis. salah ketik di field URL) → false. */
export function sectionShown(content: SiteContent, key: string): boolean {
  if (!KNOWN_SECTIONS.has(key)) return false;
  const s = getSection(content, key);
  if (!isEnabled(s)) return false;
  if (key in ITEMS) return sectionItems(key, s).length > 0;
  if (key === 'schedule') return scheduleRows(s, 'weekday').length + scheduleRows(s, 'weekend').length > 0;
  if (key === 'community') return communityStats(s).length > 0 || communityActivities(s).length > 0 || !!text(s, 'title');
  return true;
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

export interface SparringNavItem {
  key: string;
  label: string;
}

const NAV: SparringNavItem[] = [
  { key: 'schedule', label: 'Jadwal' },
  { key: 'courts', label: 'Lapangan' },
  { key: 'matchmaking', label: 'Cari lawan' },
  { key: 'tournaments', label: 'Turnamen' },
  { key: 'rental', label: 'Sewa' },
  { key: 'gallery', label: 'Galeri' },
  { key: 'faq', label: 'FAQ' },
  { key: 'contact', label: 'Lokasi' },
];

/** Label menu dari label kecil section bila singkat (≤ 14 huruf, ≤ 2 kata), selain itu label bawaan. */
const shortLabel = (section: SectionContent, fallback: string) => {
  const eyebrow = text(section, 'eyebrow');
  return eyebrow && eyebrow.length <= 14 && eyebrow.split(/\s+/).length <= 2 ? eyebrow : fallback;
};

/** Menu hanya untuk section yang benar-benar tampil (tanpa tautan mati). */
export function navItems(content: SiteContent): SparringNavItem[] {
  return NAV.filter(({ key }) => sectionShown(content, key)).map(({ key, label }) => ({ key, label: shortLabel(getSection(content, key), label) }));
}

// ─── Tujuan tautan "#…" ───────────────────────────────────────────────────────

/** Anchor berbahasa Indonesia yang wajar diketik pembeli → kunci section (#kontak, #galeri sudah diterjemahkan
 *  sectionFromAnchor). */
const ANCHOR_ALIASES: Record<string, string> = {
  jadwal: 'schedule',
  harga: 'schedule',
  'jadwal-harga': 'schedule',
  lapangan: 'courts',
  court: 'courts',
  'cari-lawan': 'matchmaking',
  lawan: 'matchmaking',
  sparring: 'matchmaking',
  turnamen: 'tournaments',
  event: 'tournaments',
  sewa: 'rental',
  raket: 'rental',
  coaching: 'rental',
  komunitas: 'community',
  'tanya-jawab': 'faq',
  lokasi: 'contact',
  booking: 'hero',
  book: 'hero',
  pesan: 'hero',
};

/** Target tautan section ("jadwal", "schedule", "kontak") → kunci section di halaman, atau null bila tidak dikenal. */
export function sectionTarget(target: string): string | null {
  const clean = sectionFromAnchor(target);
  const key = ANCHOR_ALIASES[clean] ?? clean;
  return KNOWN_SECTIONS.has(key) ? key : null;
}

// ─── Teks kecil ───────────────────────────────────────────────────────────────

/** Nomor HP Indonesia yang ditulis rapat ("081234567890") → "0812-3456-7890" untuk dibaca; format lain apa adanya. */
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

/** Jenis lapangan dari isian CMS: "Outdoor", "outdoor", "Luar ruang" → outdoor; lainnya indoor. */
export const courtType = (raw: string): 'indoor' | 'outdoor' => (/out|luar|terbuka/i.test(raw || '') ? 'outdoor' : 'indoor');

// ─── Jam booking ──────────────────────────────────────────────────────────────

/** Jam buka-tutup dari teks CMS ("06.00–24.00", "7-22", "06:00 - 23:00") → [buka, tutup]; tidak terbaca → [6, 24]. */
export function parseHours(raw: string): [number, number] {
  const match = /(\d{1,2})(?:[.:]\d{2})?\s*[-–—s/d]+\s*(\d{1,2})(?:[.:]\d{2})?/i.exec(raw || '');
  if (!match) return [6, 24];
  const open = Number(match[1]);
  const close = Number(match[2]);
  if (!(open >= 0 && open <= 23 && close >= 1 && close <= 24 && close > open)) return [6, 24];
  return [open, close];
}

/** Pilihan jam mulai per jam: "06.00" … satu jam sebelum tutup. */
export function hourSlots(raw: string): string[] {
  const [open, close] = parseHours(raw);
  return Array.from({ length: close - open }, (_, i) => `${pad2(open + i)}.00`);
}

/** Tanggal lokal hari ini "2026-10-28" (zona waktu browser). */
export function todayIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/** "2026-11-14" → "Sabtu, 14 November 2026"; tidak valid → "". Tanpa Intl (hasil sama di semua browser & uji). */
export function formatDateId(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((iso || '').trim());
  if (!match) return '';
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return '';
  return `${DAY_NAMES[date.getUTCDay()]}, ${d} ${MONTH_NAMES[m - 1]} ${y}`;
}

// ─── Bilah booking hero ───────────────────────────────────────────────────────

export const COURT_CHOICES = ['Indoor', 'Outdoor'] as const;
export const PLAYER_CHOICES = ['2', '4'] as const;

export interface BookingForm {
  date: string;
  court: string;
  time: string;
  players: string;
}

export type BookingErrors = Partial<Record<keyof BookingForm, string>>;

export const EMPTY_BOOKING: BookingForm = { date: '', court: 'Indoor', time: '', players: '4' };

/** Galat per isian (kosong = valid). `slots` = pilihan jam, `today` = "YYYY-MM-DD" (tanggal lampau ditolak). */
export function validateBooking(form: BookingForm, slots: readonly string[], today: string): BookingErrors {
  const errors: BookingErrors = {};
  if (!formatDateId(form.date)) errors.date = 'Pilih tanggal main.';
  else if (today && form.date < today) errors.date = 'Tanggal sudah lewat.';
  if (!slots.includes(form.time)) errors.time = 'Pilih jam mulai.';
  return errors;
}

/** Urutan isian wajib (fokus ke galat pertama). */
export const BOOKING_REQUIRED: (keyof BookingForm)[] = ['date', 'time'];

const greet = (company: string, intent: string) => {
  const name = cleanText(company, 80);
  return name ? `Halo ${name}, ${intent}` : `Halo, ${intent}`;
};

/** Pesan WhatsApp booking: salam, baris kosong, baris tetap, lalu permintaan konfirmasi. */
export function bookingMessage(form: BookingForm, companyName: string): string {
  const court = (COURT_CHOICES as readonly string[]).includes(form.court) ? form.court : 'Indoor';
  const players = (PLAYER_CHOICES as readonly string[]).includes(form.players) ? form.players : '4';
  const rows = [`Tanggal: ${formatDateId(form.date)}`, `Lapangan: ${court}`, `Jam mulai: ${cleanText(form.time, 5)}`, `Pemain: ${players} orang`];
  return `${greet(companyName, 'saya ingin booking lapangan padel.')}\n\n${rows.join('\n')}\n\nMohon konfirmasi ketersediaan dan harganya.`;
}

/** Ringkasan satu baris untuk panel "Pesan booking siap". */
export const bookingSummary = (form: BookingForm): string[] =>
  [formatDateId(form.date), form.court, form.time && `Mulai ${form.time}`, `${form.players} pemain`].filter(Boolean);

// ─── Jadwal, turnamen, sewa, komunitas ────────────────────────────────────────

/** Pesan tombol "Book" per baris jadwal. */
export function scheduleMessage(companyName: string, dayLabel: string, row: ListItem, unit: string): string {
  const session = [field(row, 'label'), field(row, 'time')].filter(Boolean).join(' ');
  const price = field(row, 'price');
  const rows = [dayLabel && `Hari: ${cleanText(dayLabel, 40)}`, session && `Sesi: ${cleanText(session, 48)}`, price && `Harga: ${cleanText(`${price}${unit}`, 40)}`].filter(
    Boolean,
  );
  return `${greet(companyName, 'saya ingin booking lapangan padel.')}\n\n${rows.join('\n')}\nTanggal: \n\nMohon info lapangan yang tersedia.`;
}

/** Pesan tombol "Daftar" turnamen: data acara + baris Nama/Pasangan untuk diisi. */
export function tournamentMessage(companyName: string, item: ListItem): string {
  const date = [field(item, 'day'), field(item, 'month')].filter(Boolean).join(' ');
  const rows = [
    `Turnamen: ${cleanText(field(item, 'title'), 60)}`,
    date && `Tanggal: ${cleanText(date, 12)}`,
    field(item, 'category') && `Kategori: ${cleanText(field(item, 'category'), 48)}`,
  ].filter(Boolean);
  return `${greet(companyName, 'saya ingin mendaftar turnamen.')}\n\n${rows.join('\n')}\nNama: \nPasangan: `;
}

/** Maksud pesan WhatsApp bawaan tautan Sewa dan tombol Komunitas (salam + nama klub ditambahkan waIntent). */
export const RENTAL_MESSAGE = 'saya ingin menyewa perlengkapan padel.';
export const COMMUNITY_MESSAGE = 'saya ingin bergabung dengan grup komunitas.';

// ─── Cari lawan main ──────────────────────────────────────────────────────────

export interface Level {
  level: string;
  name: string;
  text: string;
}

/** Level bawaan bila daftar level di CMS kosong (nama saja). */
const DEFAULT_LEVELS: Level[] = Array.from({ length: 7 }, (_, i) => ({ level: String(i + 1), name: `Level ${i + 1}`, text: '' }));

/** Level dari CMS (maks. 7, angka dari isian atau urutan), atau 1–7 bawaan. */
export function levelsOf(section: SectionContent): Level[] {
  const own = list(section, 'levels', 7)
    .filter((i) => field(i, 'name'))
    .map((i, index) => ({ level: cleanText(field(i, 'level'), 3) || String(index + 1), name: field(i, 'name'), text: field(i, 'text') }));
  return own.length > 0 ? own : DEFAULT_LEVELS;
}

export const MATCH_DAYS = ['Hari apa saja', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'] as const;
export const MATCH_TIMES = ['Jam berapa saja', 'Pagi (06.00–10.00)', 'Siang (10.00–15.00)', 'Sore (15.00–18.00)', 'Malam (18.00–24.00)'] as const;

export interface MatchForm {
  name: string;
  level: string;
  day: string;
  time: string;
}

export type MatchErrors = Partial<Record<keyof MatchForm, string>>;

export const EMPTY_MATCH: MatchForm = { name: '', level: '', day: MATCH_DAYS[0], time: MATCH_TIMES[0] };
export const MATCH_REQUIRED: (keyof MatchForm)[] = ['level', 'name'];

/** Galat per isian (kosong = valid). `levels` = nomor level yang tersedia. */
export function validateMatch(form: MatchForm, levels: readonly string[]): MatchErrors {
  const errors: MatchErrors = {};
  if (!levels.includes(form.level)) errors.level = 'Pilih level Anda.';
  if (cleanText(form.name, 60).length < 2) errors.name = 'Tulis nama Anda.';
  return errors;
}

/** Pesan WhatsApp cari lawan main. */
export function matchMessage(form: MatchForm, levels: readonly Level[], companyName: string): string {
  const level = levels.find((l) => l.level === form.level);
  const pick = (allowed: readonly string[], raw: string) => (allowed.includes(raw) ? raw : allowed[0]);
  const rows = [
    `Nama: ${cleanText(form.name, 60)}`,
    `Level: ${level ? `${level.level} – ${cleanText(level.name, 24)}` : cleanText(form.level, 3)}`,
    `Hari: ${pick(MATCH_DAYS, form.day)}`,
    `Jam: ${pick(MATCH_TIMES, form.time)}`,
  ];
  return `${greet(companyName, 'saya ingin dicarikan lawan atau pasangan main padel.')}\n\n${rows.join('\n')}`;
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

export function readSparring(content: SiteContent) {
  const section = (key: string) => getSection(content, key);
  const brand = section('brand');
  const hero = section('hero');
  const contact = section('contact');
  const footer = section('footer');

  const companyName = text(brand, 'company_name') || 'Nama Klub';
  const whatsapp = text(contact, 'whatsapp');
  const waLink = whatsappHref(whatsapp, text(contact, 'whatsapp_message'));
  const waAction: LinkAction | null = waLink ? { kind: 'external', href: waLink } : null;

  /** Section tampil & berisi di halaman (sectionShown). */
  const shown = (key: string): boolean => sectionShown(content, key);
  /** Item yang dirender untuk section `key` (sectionItems). */
  const items = (key: string): ListItem[] => sectionItems(key, section(key));
  const sectionAction = (key: string): LinkAction | null => (shown(key) ? { kind: 'section', target: key } : null);
  const contactAction = sectionAction('contact');
  const bookingShown = isEnabled(hero);
  /** Tujuan "Book Now" di menu atas: bilah booking hero, kalau tidak WhatsApp, kalau tidak Lokasi. */
  const bookAction: LinkAction | null = bookingShown ? { kind: 'section', target: 'hero' } : waAction ?? contactAction;
  /**
   * Isi field URL: "#jadwal", "#lapangan", "#kontak" dsb. hanya bila section itu tampil (anchor Indonesia
   * diterjemahkan); anchor tak dikenal / section tersembunyi / kosong → `fallback`.
   */
  const linkOr = (raw: string, fallback: LinkAction | null): LinkAction | null => {
    const action = resolveAction(raw, fallback);
    if (action?.kind !== 'section') return action;
    const target = sectionTarget(action.target);
    if (target === 'hero') return bookingShown ? { kind: 'section', target } : fallback;
    return target && shown(target) ? { kind: 'section', target } : fallback;
  };
  /** WhatsApp dengan pesan bebas ke nomor Kontak; tanpa nomor → null. */
  const waWith = (message: string): LinkAction | null => {
    const link = whatsappHref(whatsapp, message);
    return link ? { kind: 'external', href: link } : null;
  };
  /** WhatsApp dengan salam + maksud (nama klub otomatis). */
  const waIntent = (intent: string): LinkAction | null => waWith(greet(companyName, intent));

  return {
    brand,
    hero,
    schedule: section('schedule'),
    courts: section('courts'),
    matchmaking: section('matchmaking'),
    tournaments: section('tournaments'),
    rental: section('rental'),
    community: section('community'),
    gallery: section('gallery'),
    faq: section('faq'),
    contact,
    footer,
    companyName,
    tagline: text(brand, 'tagline'),
    logo: text(brand, 'logo'),
    colors: sparringVars(text(brand, 'accent_color')),
    whatsapp,
    waAction,
    contactAction,
    bookAction,
    shown,
    items,
    sectionAction,
    linkOr,
    waWith,
    waIntent,
    /** Tombol utama hero: tautan sendiri, kalau kosong ke Jadwal */
    primaryAction: linkOr(text(hero, 'primary_url'), sectionAction('schedule') ?? contactAction),
    /** Tombol kedua hero: tautan sendiri, kalau kosong ke Cari lawan main */
    secondaryAction: linkOr(text(hero, 'secondary_url'), sectionAction('matchmaking')),
    /** Tombol di menu atas */
    headerLabel: text(hero, 'header_label'),
    headerAction: linkOr(text(hero, 'header_url'), bookAction),
    nav: navItems(content),
    socials: socialLinks(footer),
    map: mapsInfo(text(contact, 'maps_url'), text(contact, 'maps_query') || text(contact, 'address')),
    year: new Date().getFullYear(),
  };
}

export type SparringModel = ReturnType<typeof readSparring>;
