// Turunan konten Cakrawala (fungsi murni, diuji di __tests__/cakrawala.test.tsx): warna tema (biru tinta, tinta di
// latar terang, warna terang di pita gelap), menu, slide hero, tujuan tombol, tanggal Indonesia, filter berita,
// formulir PPDB → pesan WhatsApp, lamaran BKK → pesan WhatsApp, peta lokasi. Semua tahan konten mentah (null, angka,
// list rusak). Formulir PPDB hanya menyusun pesan WhatsApp: tidak ada data yang dikirim ke server atau disimpan.
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
import { CAKRAWALA_ACCENT } from './defaultContent';

// ─── Warna ────────────────────────────────────────────────────────────────────

type Rgb = [number, number, number];
const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];
/** Biru malam: dasar pita gelap & footer (dicampur sedikit warna tema) */
const NIGHT: Rgb = [4, 10, 28];
const toHex = (rgb: Rgb) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
const mix = (a: Rgb, b: Rgb, amountOfA: number): Rgb => a.map((c, i) => c * amountOfA + b[i] * (1 - amountOfA)) as Rgb;

/**
 * Variabel warna lokal Cakrawala (di samping --tpl-accent* milik Shell), semuanya diturunkan dari SATU warna tema:
 * --ck-deep: biru tinta (warna tema 26% + biru malam) untuk pita gelap, footer, dan lapisan foto hero; teks putih ≥ 12:1;
 * --ck-bright: warna tema dicerahkan sampai ≥ 5:1 terhadap --ck-deep (ikon, angka, label di pita gelap);
 * --ck-ink: warna tema digelapkan sampai ≥ 5:1 di putih (tetap ≥ 4,5:1 di panel bertint);
 * --ck-soft / --ck-tint / --ck-line: bidang lembut 5% / 10% dan garis 18% warna tema.
 */
export function cakrawalaVars(accentRaw: string): CSSProperties {
  const accent = parseHex(accentRaw) ?? (parseHex(CAKRAWALA_ACCENT) as Rgb);
  let deep = mix(accent, NIGHT, 0.26);
  for (let i = 0; i < 12 && contrast(deep, WHITE) < 12; i += 1) deep = mix(deep, NIGHT, 0.8);
  let bright = accent;
  for (let i = 0; i < 20 && contrast(bright, deep) < 5; i += 1) bright = mix(bright, WHITE, 0.8);
  let ink = accent;
  for (let i = 0; i < 20 && contrast(ink, WHITE) < 5; i += 1) ink = mix(ink, BLACK, 0.88);
  return {
    '--ck-deep': toHex(deep),
    '--ck-bright': toHex(bright),
    '--ck-ink': toHex(ink),
    '--ck-soft': toHex(mix(accent, WHITE, 0.05)),
    '--ck-tint': toHex(mix(accent, WHITE, 0.1)),
    '--ck-line': toHex(mix(accent, WHITE, 0.18)),
  } as CSSProperties;
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

export interface CakrawalaNavItem {
  key: string;
  label: string;
}

/** Urutan menu atas (≠ urutan halaman: hanya bagian yang paling dicari orang tua & calon siswa). */
const NAV: { key: string; label: string; listKey?: string; fixed?: boolean }[] = [
  { key: 'about', label: 'Profil' },
  { key: 'programs', label: 'Jurusan', listKey: 'items' },
  { key: 'ppdb', label: 'PPDB', fixed: true },
  { key: 'news', label: 'Berita', listKey: 'items' },
  { key: 'careers', label: 'BKK', listKey: 'items' },
  { key: 'contact', label: 'Kontak' },
];

/** Label menu dari label kecil section bila singkat (≤ 12 huruf, ≤ 2 kata), mis. "Peminatan"; selain itu label bawaan. */
const shortLabel = (section: SectionContent, fallback: string) => {
  const eyebrow = text(section, 'eyebrow');
  return eyebrow && eyebrow.length <= 12 && eyebrow.split(/\s+/).length <= 2 ? eyebrow : fallback;
};

export function navItems(content: SiteContent): CakrawalaNavItem[] {
  return NAV.filter(({ key, listKey }) => {
    const section = getSection(content, key);
    if (!isEnabled(section)) return false;
    return listKey ? list(section, listKey).length > 0 : true;
  }).map(({ key, label, fixed }) => ({ key, label: fixed ? label : shortLabel(getSection(content, key), label) }));
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

export interface HeroSlide {
  image: string;
  eyebrow: string;
  title: string;
  highlight: string;
  subtitle: string;
}

export const MAX_SLIDES = 4;

/** Slide pertama = isi hero; slide tambahan (maks. 3) hanya yang bergambar, teks kosong ikut slide pertama. */
export function heroSlides(hero: SectionContent, fallbackTitle: string): HeroSlide[] {
  const first: HeroSlide = {
    image: text(hero, 'image'),
    eyebrow: text(hero, 'eyebrow'),
    title: text(hero, 'title') || fallbackTitle,
    highlight: text(hero, 'highlight'),
    subtitle: text(hero, 'subtitle'),
  };
  const extra = list(hero, 'slides', 8)
    .filter((item) => hasImage(field(item, 'image')))
    .slice(0, MAX_SLIDES - 1)
    .map((item) => {
      const ownTitle = field(item, 'title');
      return {
        image: field(item, 'image'),
        eyebrow: field(item, 'eyebrow') || first.eyebrow,
        title: ownTitle || first.title,
        highlight: ownTitle ? field(item, 'highlight') : first.highlight,
        subtitle: field(item, 'subtitle') || first.subtitle,
      };
    });
  return [first, ...extra];
}

/** Indeks slide berikut/sebelumnya yang berputar (0 … count-1). */
export const wrapIndex = (i: number, count: number): number => (count > 0 ? ((Math.floor(i) % count) + count) % count : 0);

// ─── Tujuan kartu info ────────────────────────────────────────────────────────

const TARGETS: [RegExp, string][] = [
  [/ppdb|pendaftaran|daftar|penerimaan|spmb/i, 'ppdb'],
  [/teaching|tefa|produksi|industri|sertifikasi/i, 'industry'],
  [/bkk|bursa|lowongan|karier|karir|loker/i, 'careers'],
  [/jurusan|program|keahlian|peminatan/i, 'programs'],
  [/prestasi|lomba|juara/i, 'achievements'],
  [/berita|kabar/i, 'news'],
  [/pengumuman|info/i, 'announcements'],
  [/agenda|kegiatan|acara/i, 'agenda'],
  [/fasilitas|lab|bengkel/i, 'facilities'],
  [/alumni|lulusan/i, 'testimonials'],
  [/profil|tentang|visi|misi/i, 'about'],
];

/** Section tujuan dari judul (mis. "PPDB online" → ppdb); hanya bila section itu tampil, selain itu null. */
export function titleTarget(title: string, shown: (key: string) => boolean): string | null {
  const match = TARGETS.find(([pattern, key]) => pattern.test(title || '') && shown(key));
  return match ? match[1] : null;
}

// ─── Tanggal ──────────────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export interface SchoolDate {
  /** "YYYY-MM-DD" untuk atribut datetime */
  iso: string;
  day: string;
  month: string;
  year: string;
  /** "14 Okt 2026" */
  label: string;
}

/** Tanggal ISO "YYYY-MM-DD" (tanggal kalender yang valid) → bagian tanggal; selain itu null. */
export function parseSchoolDate(raw: string | null | undefined): SchoolDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((raw || '').trim());
  if (!match) return null;
  const [y, m, d] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  const month = MONTHS[m - 1];
  return { iso: match[0], day: String(d), month, year: String(y), label: `${d} ${month} ${y}` };
}

/** Tanggal untuk tampilan: ISO → "14 Okt 2026", teks bebas ("Juli 2027") apa adanya. */
export const displayDate = (raw: string | null | undefined): string => parseSchoolDate(raw)?.label ?? (raw || '').trim();

// ─── Berita ───────────────────────────────────────────────────────────────────

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** Kategori berita untuk tombol filter: urut kemunculan, tanpa duplikat (tanpa beda huruf besar). */
export function newsCategories(items: ListItem[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const category = field(item, 'category');
    const key = normalize(category);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(category);
  }
  return result;
}

/** Berita untuk filter aktif (null / kategori tak dikenal → semua). */
export function filterNews(items: ListItem[], category: string | null): ListItem[] {
  if (!category) return items;
  const wanted = normalize(category);
  const matches = items.filter((item) => normalize(field(item, 'category')) === wanted);
  return matches.length > 0 ? matches : items;
}

/** Paragraf isi berita (dipisah baris kosong). */
export const paragraphsOf = (raw: string): string[] =>
  (raw || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

/** Label pengumuman yang ditonjolkan merah lembut ("Penting", "Wajib", "Segera", "Mendesak"). */
export const isUrgent = (badge: string): boolean => /penting|wajib|segera|mendesak|urgent/i.test(badge || '');

// ─── PPDB ─────────────────────────────────────────────────────────────────────

export interface PpdbForm {
  name: string;
  origin: string;
  program: string;
  path: string;
  phone: string;
  note: string;
}

export type PpdbErrors = Partial<Record<keyof PpdbForm, string>>;

export const EMPTY_PPDB: PpdbForm = { name: '', origin: '', program: '', path: '', phone: '', note: '' };

/** Nomor HP Indonesia: 9–15 digit setelah tanda baca dibuang, diawali 0, 62, +62, atau 8. */
export function validPhone(raw: string): boolean {
  const value = (raw || '').trim();
  if (/[^\d\s()+.-]/.test(value)) return false;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 9 && digits.length <= 15 && /^(0|62|8)/.test(digits);
}

/** Pesan galat per isian (kosong = valid). `programs`/`paths` = pilihan yang tersedia (wajib dipilih bila ada). */
export function validatePpdb(form: PpdbForm, options: { programs: string[]; paths: string[] }): PpdbErrors {
  const errors: PpdbErrors = {};
  if (form.name.trim().length < 3) errors.name = 'Tulis nama lengkap calon siswa.';
  if (form.origin.trim().length < 3) errors.origin = 'Tulis nama sekolah asal (SMP/MTs).';
  if (options.programs.length > 0 && !options.programs.includes(form.program)) errors.program = 'Pilih program keahlian.';
  if (options.paths.length > 0 && !options.paths.includes(form.path)) errors.path = 'Pilih jalur pendaftaran.';
  if (!validPhone(form.phone)) errors.phone = 'Tulis nomor WhatsApp yang aktif, mis. 081234567890.';
  return errors;
}

/** Pesan WhatsApp pendaftaran untuk panitia PPDB (baris per isian; catatan kosong tidak ikut). */
export function ppdbMessage(school: string, form: PpdbForm): string {
  const rows = [
    `Nama calon siswa: ${form.name.trim()}`,
    `Asal sekolah: ${form.origin.trim()}`,
    form.program && `Pilihan program: ${form.program}`,
    form.path && `Jalur: ${form.path}`,
    `No. WhatsApp: ${form.phone.trim()}`,
    form.note.trim() && `Catatan: ${form.note.trim().replace(/\s+/g, ' ')}`,
  ].filter(Boolean);
  return `Halo Panitia PPDB ${school}, saya ingin mendaftar.\n${rows.join('\n')}\nMohon info langkah selanjutnya. Terima kasih.`;
}

/** Nama pilihan program untuk formulir: "PPLG — Pengembangan Perangkat Lunak dan Gim" (atau nama/kode saja). */
export const programOption = (item: ListItem): string => {
  const code = field(item, 'code');
  const name = field(item, 'name');
  return code && name ? `${code} — ${name}` : name || code;
};

// ─── BKK ──────────────────────────────────────────────────────────────────────

/** Pesan WhatsApp lamaran lewat BKK. */
export function careerMessage(school: string, item: ListItem): string {
  const position = field(item, 'position') || 'lowongan';
  const company = field(item, 'company');
  return `Halo BKK ${school}, saya ingin melamar posisi ${position}${company ? ` di ${company}` : ''}. Mohon info persyaratan dan cara mengirim berkas.`;
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

export function readCakrawala(content: SiteContent) {
  const section = (key: string) => getSection(content, key);
  const brand = section('brand');
  const hero = section('hero');
  const contact = section('contact');
  const footer = section('footer');
  const ppdb = section('ppdb');

  const companyName = text(brand, 'company_name') || 'Nama Sekolah';
  const whatsapp = text(contact, 'whatsapp');
  const waLink = whatsappHref(whatsapp, text(contact, 'whatsapp_message'));
  const waAction: LinkAction | null = waLink ? { kind: 'external', href: waLink } : null;
  const contactAction: LinkAction | null = isEnabled(contact) ? { kind: 'section', target: 'contact' } : null;
  /** Tujuan "hubungi": WhatsApp bila ada nomor, kalau tidak section Kontak, kalau tidak null (tombol disembunyikan). */
  const startAction: LinkAction | null = waAction ?? contactAction;

  const shown = (key: string): boolean => {
    const s = section(key);
    if (!isEnabled(s)) return false;
    switch (key) {
      case 'programs':
      case 'news':
      case 'careers':
      case 'facilities':
      case 'gallery':
      case 'faq':
      case 'achievements':
      case 'announcements':
      case 'agenda':
      case 'testimonials':
      case 'highlights':
      case 'stats':
        return list(s, 'items').length > 0;
      default:
        return true;
    }
  };
  const sectionAction = (key: string): LinkAction | null => (shown(key) ? { kind: 'section', target: key } : null);
  /** Isi field URL: "#ppdb" dsb. hanya bila section itu tampil; kosong → `fallback`. */
  const linkOr = (raw: string, fallback: LinkAction | null): LinkAction | null => {
    const action = resolveAction(raw, fallback);
    if (action?.kind === 'section' && action.target !== 'hero' && !shown(sectionFromAnchor(action.target))) return fallback;
    return action;
  };

  /** Nomor WhatsApp panitia PPDB: isian PPDB, kalau kosong nomor di Kontak. */
  const ppdbWhatsapp = text(ppdb, 'whatsapp') || whatsapp;
  /** WhatsApp dengan pesan bebas ke nomor `number` (bawaan nomor Kontak); tanpa nomor → null. */
  const waWith = (message: string, number = whatsapp): LinkAction | null => {
    const link = whatsappHref(number, message);
    return link ? { kind: 'external', href: link } : null;
  };
  const ppdbAction = sectionAction('ppdb') ?? startAction;

  return {
    brand,
    hero,
    highlights: section('highlights'),
    stats: section('stats'),
    welcome: section('welcome'),
    about: section('about'),
    programs: section('programs'),
    industry: section('industry'),
    achievements: section('achievements'),
    ppdb,
    news: section('news'),
    announcements: section('announcements'),
    agenda: section('agenda'),
    testimonials: section('testimonials'),
    careers: section('careers'),
    facilities: section('facilities'),
    gallery: section('gallery'),
    faq: section('faq'),
    contact,
    footer,
    companyName,
    tagline: text(brand, 'tagline'),
    logo: text(brand, 'logo'),
    colors: cakrawalaVars(text(brand, 'accent_color')),
    whatsapp,
    ppdbWhatsapp,
    waAction,
    contactAction,
    startAction,
    shown,
    sectionAction,
    linkOr,
    waWith,
    ppdbAction,
    /** Tombol utama hero: tautan sendiri, kalau kosong ke PPDB, kalau tidak ada ke WhatsApp/Kontak */
    primaryAction: linkOr(text(hero, 'primary_url'), ppdbAction),
    /** Tombol kedua hero: tautan sendiri, kalau kosong ke Profil (tanpa Profil → disembunyikan) */
    secondaryAction: linkOr(text(hero, 'secondary_url'), sectionAction('about')),
    /** Tombol di menu atas */
    headerLabel: text(hero, 'header_label'),
    headerAction: linkOr(text(hero, 'header_url'), ppdbAction),
    /** Pengumuman di atas menu */
    topbarAction: linkOr(text(hero, 'topbar_url'), ppdbAction),
    nav: navItems(content),
    socials: socialLinks(footer),
    map: mapsInfo(text(contact, 'maps_url'), text(contact, 'maps_query') || text(contact, 'address')),
    year: new Date().getFullYear(),
  };
}

export type CakrawalaModel = ReturnType<typeof readCakrawala>;
