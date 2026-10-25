// Turunan konten Madani (fungsi murni, diuji di __tests__/madani.test.tsx): warna tema (primer + turunan + sorotan),
// menu, slide hero, tanggal, daftar per baris, peta, dan pesan WhatsApp formulir PPDB. Semua tahan konten mentah
// (null, angka, list rusak).
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
  paragraphs,
  parseHex,
  resolveAction,
  safeImage,
  safeUrl,
  text,
  whatsappHref,
  type LinkAction,
} from '../shared/utils';
import { MADANI_ACCENT } from './defaultContent';

// ─── Warna ────────────────────────────────────────────────────────────────────

type Rgb = [number, number, number];
const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];
/** Krem hangat untuk latar panel (tetap, tidak ikut warna tema) */
export const CREAM: Rgb = [246, 244, 236];
const clamp = (n: number, min = 0, max = 255) => Math.min(max, Math.max(min, n));
export const toHex = (rgb: Rgb) => `#${rgb.map((c) => Math.round(clamp(c)).toString(16).padStart(2, '0')).join('')}`;
const mix = (a: Rgb, b: Rgb, amountOfA: number): Rgb => a.map((c, i) => c * amountOfA + b[i] * (1 - amountOfA)) as Rgb;

function rgbToHsl([r, g, b]: Rgb): [number, number, number] {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === rn ? (gn - bn) / d + (gn < bn ? 6 : 0) : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  h *= 60;
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    hue < 60 ? [c, x, 0] : hue < 120 ? [x, c, 0] : hue < 180 ? [0, c, x] : hue < 240 ? [0, x, c] : hue < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/**
 * Warna sorotan otomatis dari warna tema: rona digeser ke arah kuning-hijau (hijau tua → hijau limau, biru → mint,
 * ungu → biru langit), lalu dibuat terang (L 70%). Warna abu (saturasi rendah) → limau lembut bawaan.
 */
export function autoHighlight(primary: Rgb): Rgb {
  const [h, s] = rgbToHsl(primary);
  if (s < 0.12) return hslToRgb(78, 0.62, 0.7);
  return hslToRgb(h - 75, 0.68, 0.7);
}

/**
 * Variabel warna Madani (di samping --tpl-accent* milik Shell):
 * --md-deep: pita gelap, judul, footer (warna tema digelapkan sampai ≥ 11:1 terhadap putih);
 * --md-ink: teks warna tema di latar putih/krem (≥ 4,5:1 terhadap krem);
 * --md-tint / --md-tint-2: bidang sangat lembut warna tema (chip, ikon, kartu);
 * --md-hl: warna sorotan (tombol utama, kata sorotan, kartu sorotan) dari brand.highlight_color atau otomatis;
 * --md-on-hl: teks di atas sorotan: pita gelap bila ≥ 4,6:1, selain itu hitam atau putih (yang lebih kontras; salah
 *   satunya selalu ≥ 4,58:1 terhadap warna apa pun);
 * --md-hl-soft: sorotan saat disorot kursor, digeser MENJAUHI warna teksnya (lebih terang untuk teks gelap, lebih
 *   gelap untuk teks putih) sehingga kontras tidak turun;
 * --md-hl-ink: sorotan sebagai TEKS di atas pita gelap (≥ 4,5:1 terhadap --md-deep).
 * Tombol warna tema (BTN.primary) memakai --md-ink + teks putih: --md-ink ≥ 4,6:1 terhadap krem, jadi juga terhadap putih.
 */
export function madaniVars(accentRaw: string, highlightRaw = ''): CSSProperties {
  const primary = parseHex(accentRaw) ?? (parseHex(MADANI_ACCENT) as Rgb);
  let deep = mix(primary, BLACK, 0.62);
  for (let i = 0; i < 20 && contrast(deep, WHITE) < 11; i += 1) deep = mix(deep, BLACK, 0.88);
  let ink = primary;
  for (let i = 0; i < 20 && contrast(ink, CREAM) < 4.6; i += 1) ink = mix(ink, BLACK, 0.86);
  const hl = parseHex(highlightRaw) ?? autoHighlight(primary);
  let onHl = deep;
  if (contrast(hl, onHl) < 4.6) onHl = contrast(hl, BLACK) >= contrast(hl, WHITE) ? BLACK : WHITE;
  const lightText = contrast(onHl, BLACK) > contrast(hl, BLACK);
  const hlSoft = lightText ? mix(hl, BLACK, 0.85) : mix(hl, WHITE, 0.35);
  let hlInk = hl;
  for (let i = 0; i < 20 && contrast(hlInk, deep) < 4.6; i += 1) hlInk = mix(hlInk, WHITE, 0.8);
  return {
    '--md-primary': toHex(primary),
    '--md-deep': toHex(deep),
    '--md-ink': toHex(ink),
    '--md-tint': toHex(mix(primary, WHITE, 0.08)),
    '--md-tint-2': toHex(mix(primary, WHITE, 0.16)),
    '--md-hl': toHex(hl),
    '--md-on-hl': toHex(onHl),
    '--md-hl-ink': toHex(hlInk),
    '--md-hl-soft': toHex(hlSoft),
  } as CSSProperties;
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

export interface MadaniNavItem {
  key: string;
  label: string;
}

type NavKey = 'about' | 'programs' | 'achievements' | 'ppdb' | 'news' | 'gallery' | 'contact';

/** Urutan menu = urutan halaman. Kontak selalu di akhir. */
const NAV: { key: NavKey; label: string }[] = [
  { key: 'about', label: 'Profil' },
  { key: 'programs', label: 'Program' },
  { key: 'achievements', label: 'Prestasi' },
  { key: 'ppdb', label: 'PPDB' },
  { key: 'news', label: 'Berita' },
  { key: 'gallery', label: 'Galeri' },
  { key: 'contact', label: 'Kontak' },
];

const anyItem = (section: SectionContent, key: string, max: number, has: (item: ListItem) => boolean) => list(section, key, max).some(has);

/**
 * Section tujuan menu/tombol benar-benar berisi: syarat yang SAMA dengan syarat tampil di komponennya (About, Ppdb, dan
 * Contact memakai fungsi ini langsung; Programs, Achievements, News, Gallery memakai filter item yang sama), agar menu
 * dan tombol tidak menunjuk section yang tidak dirender. Kesamaannya diuji di __tests__/madani.test.tsx.
 */
export const SECTION_FILLED: Record<NavKey, (section: SectionContent) => boolean> = {
  about: (s) =>
    !!text(s, 'title') ||
    paragraphs(text(s, 'body')).length > 0 ||
    anyItem(s, 'facts', 6, (f) => !!(field(f, 'label') && field(f, 'value'))) ||
    !!text(s, 'vision') ||
    anyItem(s, 'missions', 8, (item) => !!field(item, 'text')) ||
    anyItem(s, 'values', 4, (item) => !!field(item, 'title')),
  programs: (s) => anyItem(s, 'items', 6, (item) => !!field(item, 'title')),
  achievements: (s) => !!text(s, 'title') || anyItem(s, 'items', 10, (item) => !!field(item, 'title')),
  ppdb: (s) =>
    !!(text(s, 'title') || text(s, 'form_title') || text(s, 'form_button')) ||
    anyItem(s, 'tracks', 5, (item) => !!field(item, 'name')) ||
    anyItem(s, 'schedule', 8, (item) => !!field(item, 'title')),
  news: (s) => anyItem(s, 'items', 6, (item) => !!field(item, 'title')),
  gallery: (s) => anyItem(s, 'items', 6, (item) => hasImage(field(item, 'image'))),
  contact: (s) =>
    !!(text(s, 'title') || text(s, 'address') || text(s, 'phone') || text(s, 'email') || text(s, 'hours')) ||
    !!(text(s, 'whatsapp') && whatsappHref(text(s, 'whatsapp'), text(s, 'whatsapp_message'))) ||
    !!mapFor(s).embed,
};

/** Section tampil di halaman: dinyalakan di CMS dan berisi. */
const shown = (content: SiteContent, key: NavKey) => {
  const section = getSection(content, key);
  return isEnabled(section) && SECTION_FILLED[key](section);
};

/**
 * Menu atas & footer: section yang tampil (dan berisi). Label sengaja tetap dan singkat agar muat di pil menu (label
 * kecil section di CMS tidak mengubah menu).
 */
export function navItems(content: SiteContent): MadaniNavItem[] {
  return NAV.filter(({ key }) => shown(content, key)).map(({ key, label }) => ({ key, label }));
}

// ─── Slide hero ───────────────────────────────────────────────────────────────

export interface HeroSlide {
  image: string;
  eyebrow: string;
  title: string;
  highlight: string;
  subtitle: string;
}

/**
 * Slide hero: slide pertama = isi hero; slide tambahan (`hero.slides`, maks. 3) hanya bila fotonya bisa ditampilkan.
 * Teks slide tambahan yang kosong memakai teks slide pertama (sorotan ikut judul pertama bila judulnya kosong).
 */
export function heroSlides(hero: SectionContent, fallbackTitle: string): HeroSlide[] {
  const first: HeroSlide = {
    image: text(hero, 'image'),
    eyebrow: text(hero, 'eyebrow'),
    title: text(hero, 'title') || fallbackTitle,
    highlight: text(hero, 'highlight'),
    subtitle: text(hero, 'subtitle'),
  };
  const extra = list(hero, 'slides', 3)
    .filter((item) => safeImage(field(item, 'image')))
    .map((item): HeroSlide => {
      const title = field(item, 'title');
      return {
        image: field(item, 'image'),
        eyebrow: field(item, 'eyebrow') || first.eyebrow,
        title: title || first.title,
        highlight: title ? field(item, 'highlight') : first.highlight,
        subtitle: field(item, 'subtitle') || first.subtitle,
      };
    });
  return [first, ...extra];
}

// ─── Teks ─────────────────────────────────────────────────────────────────────

/** Satu baris = satu poin (baris kosong & penanda daftar "-", "•", "✓" dibuang). */
export const lines = (raw: string, max = 12): string[] =>
  (raw || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-•*✓]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, max);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTHS_LONG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export interface SchoolDate {
  /** "2026-11-14" untuk atribut dateTime */
  iso: string;
  day: string;
  /** "Nov" */
  month: string;
  year: string;
  /** "Sab" */
  weekday: string;
  /** "14 Nov 2026" */
  short: string;
  /** "14 November 2026" */
  long: string;
}

/**
 * Tanggal dari CMS: "2026-11-14" atau "14/11/2026" (juga "14-11-2026") → bagian-bagian tanggal berbahasa Indonesia.
 * Tanggal tidak valid / teks bebas → null (template menampilkan teks aslinya).
 */
export function parseSchoolDate(raw: string): SchoolDate | null {
  const value = (raw || '').trim();
  let y: number, m: number, d: number;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);
  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(value);
  if (iso) [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else if (dmy) [y, m, d] = [Number(dmy[3]), Number(dmy[2]), Number(dmy[1])];
  else return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    iso: `${y}-${pad(m)}-${pad(d)}`,
    day: String(d),
    month: MONTHS[m - 1],
    year: String(y),
    weekday: DAYS[date.getUTCDay()],
    short: `${d} ${MONTHS[m - 1]} ${y}`,
    long: `${d} ${MONTHS_LONG[m - 1]} ${y}`,
  };
}

// ─── Peta ─────────────────────────────────────────────────────────────────────

/**
 * Peta lokasi (shared mapsInfo): sematan Google Maps dari "kata kunci peta" (atau alamat bila kosong), kecuali CMS
 * berisi URL/kode sematan resmi; tombol "Buka di Google Maps" memakai link dari CMS bila ada, selain itu pencarian
 * kata kunci/alamat.
 */
export const mapFor = (contact: SectionContent): { embed: string | null; link: string | null } =>
  mapsInfo(text(contact, 'maps_url'), text(contact, 'maps_query') || text(contact, 'address'));

// ─── Formulir PPDB ────────────────────────────────────────────────────────────

export interface PpdbForm {
  student: string;
  gender: string;
  school: string;
  track: string;
  program: string;
  parent: string;
  phone: string;
  note: string;
}

export type PpdbErrors = Partial<Record<keyof PpdbForm, string>>;

export const EMPTY_PPDB: PpdbForm = { student: '', gender: '', school: '', track: '', program: '', parent: '', phone: '', note: '' };

/** Urutan field = urutan formulir (untuk fokus ke error pertama). */
export const PPDB_FIELDS: (keyof PpdbForm)[] = ['student', 'gender', 'school', 'track', 'program', 'parent', 'phone', 'note'];

/** Validasi formulir minat PPDB. Jalur/program hanya wajib bila ada pilihannya. */
export function validatePpdb(form: PpdbForm, opts: { tracks: string[]; programs: string[] }): PpdbErrors {
  const errors: PpdbErrors = {};
  if (form.student.trim().length < 3) errors.student = 'Tulis nama lengkap calon siswa (minimal 3 huruf).';
  if (!form.gender) errors.gender = 'Pilih putra atau putri.';
  if (form.school.trim().length < 3) errors.school = 'Tulis asal sekolah.';
  if (opts.tracks.length > 0 && !opts.tracks.includes(form.track)) errors.track = 'Pilih jalur pendaftaran.';
  if (opts.programs.length > 0 && !opts.programs.includes(form.program)) errors.program = 'Pilih program.';
  if (form.parent.trim().length < 3) errors.parent = 'Tulis nama orang tua atau wali.';
  const digits = form.phone.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 15) errors.phone = 'Tulis nomor WhatsApp yang aktif, mis. 081234567890.';
  return errors;
}

/** Pesan WhatsApp untuk panitia PPDB (tanpa data lain selain yang diisi pengunjung). */
export function ppdbMessage(form: PpdbForm, ctx: { school: string; period: string }): string {
  const rows: [string, string][] = [
    ['Nama calon siswa', form.student],
    ['Jenis kelamin', form.gender],
    ['Asal sekolah', form.school],
    ['Jalur', form.track],
    ['Program', form.program],
    ['Nama orang tua/wali', form.parent],
    ['No. WhatsApp', form.phone],
    ['Catatan', form.note],
  ];
  const period = ctx.period ? ` ${ctx.period}` : '';
  return [
    `Assalamu’alaikum, Panitia PPDB ${ctx.school}.`,
    `Saya ingin mendaftar${period}. Berikut data calon siswa:`,
    '',
    ...rows.filter(([, value]) => value.trim()).map(([label, value]) => `${label}: ${value.trim()}`),
    '',
    'Mohon informasi langkah berikutnya. Terima kasih.',
  ].join('\n');
}

// ─── Tautan ───────────────────────────────────────────────────────────────────

export interface SocialLink {
  key: string;
  label: string;
  href: string;
}

export const socialLinks = (footer: SectionContent): SocialLink[] =>
  SOCIAL_FIELDS.map(({ key, label }) => ({ key, label, href: safeUrl(text(footer, key)) ?? '' })).filter((s) => s.href);

// ─── Model ────────────────────────────────────────────────────────────────────

const SECTION_KEYS = [
  'brand',
  'hero',
  'highlights',
  'welcome',
  'about',
  'stats',
  'programs',
  'achievements',
  'facilities',
  'ppdb',
  'news',
  'announcements',
  'agenda',
  'gallery',
  'alumni',
  'faq',
  'cta',
  'contact',
  'footer',
] as const;

type SectionKey = (typeof SECTION_KEYS)[number];

export function readMadani(content: SiteContent) {
  const s = Object.fromEntries(SECTION_KEYS.map((key) => [key, getSection(content, key)])) as Record<SectionKey, SectionContent>;
  const { brand, hero, contact, ppdb, footer } = s;

  const companyName = text(brand, 'company_name') || 'Nama Sekolah';
  const whatsapp = text(contact, 'whatsapp');
  const waLink = whatsappHref(whatsapp, text(contact, 'whatsapp_message'));
  const waAction: LinkAction | null = waLink ? { kind: 'external', href: waLink } : null;
  // Tujuan section hanya bila section itu tampil DAN berisi (lihat SECTION_FILLED), agar tombol tidak mati
  const contactAction: LinkAction | null = shown(content, 'contact') ? { kind: 'section', target: 'contact' } : null;
  /** Nomor panitia PPDB (bagian PPDB) atau nomor sekolah */
  const ppdbWhatsapp = text(ppdb, 'whatsapp') || whatsapp;
  const ppdbWa = whatsappHref(ppdbWhatsapp, `Assalamu’alaikum, Panitia PPDB ${companyName}. Saya ingin bertanya tentang pendaftaran.`);
  const ppdbAskAction: LinkAction | null = ppdbWa ? { kind: 'external', href: ppdbWa } : waAction ?? contactAction;
  /** Tujuan "Daftar PPDB": bagian PPDB bila tampil, lalu WhatsApp panitia, lalu Kontak */
  const ppdbAction: LinkAction | null = shown(content, 'ppdb') ? { kind: 'section', target: 'ppdb' } : ppdbAskAction;
  const aboutAction: LinkAction | null = shown(content, 'about') ? { kind: 'section', target: 'about' } : null;
  const primaryAction = resolveAction(text(hero, 'primary_url'), ppdbAction);
  const nav = navItems(content);

  /** WhatsApp dengan pesan berisi nama program; tanpa nomor → Kontak. */
  const askAbout = (subject: string): LinkAction | null => {
    const link = subject ? whatsappHref(whatsapp, `Assalamu’alaikum, ${companyName}. Saya ingin bertanya tentang ${subject}.`) : '';
    return link ? { kind: 'external', href: link } : contactAction;
  };

  return {
    ...s,
    companyName,
    tagline: text(brand, 'tagline'),
    logo: text(brand, 'logo'),
    colors: madaniVars(text(brand, 'accent_color'), text(brand, 'highlight_color')),
    whatsapp,
    waAction,
    contactAction,
    ppdbWhatsapp,
    ppdbAction,
    ppdbAskAction,
    aboutAction,
    primaryAction,
    secondaryAction: resolveAction(text(hero, 'secondary_url'), aboutAction),
    askAbout,
    headerLabel: text(hero, 'header_label') || text(hero, 'primary_label'),
    headerAction: resolveAction(text(hero, 'header_url'), primaryAction),
    nav,
    socials: socialLinks(footer),
    year: new Date().getFullYear(),
  };
}

export type MadaniModel = ReturnType<typeof readMadani>;
