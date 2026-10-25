// Turunan konten Bestari (fungsi murni, diuji di __tests__/bestari.test.tsx): warna tema (pita gelap hangat, tinta di
// latar terang, warna terang di pita gelap), menu, nomor section "(01)", slide hero, tujuan tombol, tanggal Indonesia,
// filter berita, formulir PPDB SD (tanggal lahir → usia per tanggal acuan) → pesan WhatsApp, peta lokasi. Semua tahan
// konten mentah (null, angka, list rusak). Formulir PPDB hanya menyusun pesan WhatsApp: tidak ada data yang dikirim ke
// server atau disimpan.
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
import { BESTARI_ACCENT } from './defaultContent';

// ─── Warna ────────────────────────────────────────────────────────────────────

type Rgb = [number, number, number];
const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];
/** Cokelat malam: dasar pita gelap & footer (dicampur sedikit warna tema) */
const NIGHT: Rgb = [24, 16, 12];
const toHex = (rgb: Rgb) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
/** Campuran dibulatkan ke bilangan bulat: kontras dihitung dari warna yang benar-benar ditulis sebagai hex. */
const mix = (a: Rgb, b: Rgb, amountOfA: number): Rgb => a.map((c, i) => Math.round(c * amountOfA + b[i] * (1 - amountOfA))) as Rgb;

/**
 * Variabel warna lokal Bestari (di samping --tpl-accent* milik Shell), semuanya diturunkan dari SATU warna tema:
 * --bs-deep: cokelat malam bernuansa tema (tema 22% + cokelat malam) untuk footer & lapisan foto hero; putih ≥ 13:1;
 * --bs-bright: warna tema dicerahkan sampai ≥ 5:1 terhadap --bs-deep (label, ikon, angka di pita gelap);
 * --bs-ink: warna tema digelapkan sampai ≥ 5:1 di putih DAN ≥ 4,6:1 di --bs-tint (label kecil, chip, tanggal);
 * --bs-soft / --bs-tint / --bs-line: bidang lembut 6% / 12% dan garis 24% warna tema.
 */
export function bestariVars(accentRaw: string): CSSProperties {
  const accent = parseHex(accentRaw) ?? (parseHex(BESTARI_ACCENT) as Rgb);
  let deep = mix(accent, NIGHT, 0.22);
  for (let i = 0; i < 12 && contrast(deep, WHITE) < 13; i += 1) deep = mix(deep, NIGHT, 0.8);
  let bright = accent;
  for (let i = 0; i < 20 && contrast(bright, deep) < 5; i += 1) bright = mix(bright, WHITE, 0.8);
  const tint = mix(accent, WHITE, 0.12);
  let ink = accent;
  for (let i = 0; i < 24 && (contrast(ink, WHITE) < 5 || contrast(ink, tint) < 4.6); i += 1) ink = mix(ink, BLACK, 0.88);
  return {
    '--bs-deep': toHex(deep),
    '--bs-bright': toHex(bright),
    '--bs-ink': toHex(ink),
    '--bs-soft': toHex(mix(accent, WHITE, 0.06)),
    '--bs-tint': toHex(tint),
    '--bs-line': toHex(mix(accent, WHITE, 0.24)),
  } as CSSProperties;
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

export interface BestariNavItem {
  key: string;
  label: string;
}

/** Urutan menu atas: bagian yang paling dicari orang tua calon murid. */
const NAV: { key: string; label: string; listKey?: string; fixed?: boolean }[] = [
  { key: 'about', label: 'Profil' },
  { key: 'programs', label: 'Program', listKey: 'items' },
  { key: 'teachers', label: 'Guru', listKey: 'items' },
  { key: 'ppdb', label: 'PPDB', fixed: true },
  { key: 'news', label: 'Berita', listKey: 'items' },
  { key: 'contact', label: 'Kontak' },
];

/** Label menu dari label kecil section bila singkat (≤ 12 huruf, ≤ 2 kata), mis. "Ekskul"; selain itu label bawaan. */
const shortLabel = (section: SectionContent, fallback: string) => {
  const eyebrow = text(section, 'eyebrow');
  return eyebrow && eyebrow.length <= 12 && eyebrow.split(/\s+/).length <= 2 ? eyebrow : fallback;
};

export function navItems(content: SiteContent): BestariNavItem[] {
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

// ─── Tujuan kartu sorotan ─────────────────────────────────────────────────────

const TARGETS: [RegExp, string][] = [
  [/ppdb|spmb|pendaftaran|daftar|penerimaan|murid baru/i, 'ppdb'],
  [/open house|kunjungan|agenda|jadwal|kegiatan/i, 'agenda'],
  [/program|bilingual|literasi|ekstrakurikuler|ekskul|kelas/i, 'programs'],
  [/guru|pengajar|wali kelas/i, 'teachers'],
  [/prestasi|lomba|juara/i, 'achievements'],
  [/berita|kabar/i, 'news'],
  [/pengumuman|info/i, 'announcements'],
  [/testimoni|orang tua|alumni/i, 'testimonials'],
  [/profil|tentang|visi|misi/i, 'about'],
];

/** Section tujuan dari judul (mis. "Pendaftaran murid baru" → ppdb); hanya bila section itu tampil, selain itu null. */
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

// ─── Berita & pengumuman ──────────────────────────────────────────────────────

/** Berita yang tampil (berjudul, maks. 9); kosong → section Berita tidak dirender. */
export const newsItems = (news: SectionContent): ListItem[] => list(news, 'items', 9).filter((item) => field(item, 'title'));

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

// ─── PPDB (SD) ────────────────────────────────────────────────────────────────

export interface PpdbForm {
  /** Nama lengkap calon murid */
  name: string;
  /** Tanggal lahir "YYYY-MM-DD" (input type=date) */
  birth: string;
  /** Nama orang tua/wali */
  parent: string;
  /** Pilihan kelas (mis. "Kelas 1 bilingual") */
  grade: string;
  path: string;
  /** Asal TK/PAUD (opsional) */
  origin: string;
  phone: string;
  note: string;
}

export type PpdbErrors = Partial<Record<keyof PpdbForm, string>>;

export const EMPTY_PPDB: PpdbForm = { name: '', birth: '', parent: '', grade: '', path: '', origin: '', phone: '', note: '' };

/** Nomor HP Indonesia: 9–15 digit setelah tanda baca dibuang, diawali 0, 62, +62, atau 8. */
export function validPhone(raw: string): boolean {
  const value = (raw || '').trim();
  if (/[^\d\s()+.-]/.test(value)) return false;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 9 && digits.length <= 15 && /^(0|62|8)/.test(digits);
}

export interface Age {
  years: number;
  months: number;
}

/** Usia (tahun + bulan penuh) pada tanggal `on`; tanggal tidak valid atau lahir setelah `on` → null. */
export function ageAt(birthRaw: string, onRaw: string): Age | null {
  const birth = parseSchoolDate(birthRaw);
  const on = parseSchoolDate(onRaw);
  if (!birth || !on || birth.iso > on.iso) return null;
  const [by, bm, bd] = birth.iso.split('-').map(Number);
  const [oy, om, od] = on.iso.split('-').map(Number);
  let months = (oy - by) * 12 + (om - bm);
  if (od < bd) months -= 1;
  return { years: Math.floor(months / 12), months: months % 12 };
}

export const ageLabel = (age: Age): string => `${age.years} tahun${age.months ? ` ${age.months} bulan` : ''}`;

/** Hari ini "YYYY-MM-DD" (waktu lokal pengunjung). */
export const todayIso = (now = new Date()): string =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

/** Batas usia wajar calon murid SD (kelas 1 sampai pindahan kelas atas) pada tanggal acuan. */
const MIN_AGE = 4;
const MAX_AGE = 13;

/**
 * Pesan galat per isian (kosong = valid). `grades`/`paths` = pilihan yang tersedia (wajib dipilih bila ada).
 * `reference` = tanggal acuan usia dari CMS (mis. "2027-07-01"; tidak valid/kosong → `today`).
 */
export function validatePpdb(form: PpdbForm, options: { grades: string[]; paths: string[]; reference?: string; today?: string }): PpdbErrors {
  const errors: PpdbErrors = {};
  const today = options.today ?? todayIso();
  const reference = parseSchoolDate(options.reference)?.iso ?? today;
  if (form.name.trim().length < 3) errors.name = 'Tulis nama lengkap calon murid.';
  const birth = parseSchoolDate(form.birth);
  const age = birth ? ageAt(birth.iso, reference) : null;
  if (!birth) errors.birth = 'Pilih tanggal lahir calon murid.';
  else if (birth.iso > today) errors.birth = 'Tanggal lahir tidak boleh setelah hari ini.';
  else if (!age || age.years < MIN_AGE || age.years >= MAX_AGE) errors.birth = 'Periksa kembali tahun lahir calon murid.';
  if (form.parent.trim().length < 3) errors.parent = 'Tulis nama orang tua atau wali.';
  if (options.grades.length > 0 && !options.grades.includes(form.grade)) errors.grade = 'Pilih kelas yang dituju.';
  if (options.paths.length > 0 && !options.paths.includes(form.path)) errors.path = 'Pilih jalur pendaftaran.';
  if (!validPhone(form.phone)) errors.phone = 'Tulis nomor WhatsApp yang aktif, mis. 081234567890.';
  return errors;
}

/** Pesan WhatsApp pendaftaran untuk panitia PPDB (baris per isian; isian opsional yang kosong tidak ikut). */
export function ppdbMessage(school: string, form: PpdbForm, reference = ''): string {
  const birth = parseSchoolDate(form.birth);
  const ref = parseSchoolDate(reference);
  const age = birth && ref ? ageAt(birth.iso, ref.iso) : null;
  const birthText = birth ? `${birth.label}${age && ref ? ` (usia per ${ref.label}: ${ageLabel(age)})` : ''}` : form.birth.trim();
  const rows = [
    `Nama calon murid: ${form.name.trim()}`,
    `Tanggal lahir: ${birthText}`,
    `Nama orang tua/wali: ${form.parent.trim()}`,
    form.grade && `Pilihan kelas: ${form.grade}`,
    form.path && `Jalur: ${form.path}`,
    form.origin.trim() && `Asal TK/PAUD: ${form.origin.trim()}`,
    `No. WhatsApp: ${form.phone.trim()}`,
    form.note.trim() && `Catatan: ${form.note.trim().replace(/\s+/g, ' ')}`,
  ].filter(Boolean);
  return `Halo Panitia PPDB ${school}, saya ingin mendaftarkan anak saya.\n${rows.join('\n')}\nMohon info langkah selanjutnya. Terima kasih.`;
}

// ─── Lain-lain ────────────────────────────────────────────────────────────────

export interface SocialLink {
  key: string;
  label: string;
  href: string;
}

export const socialLinks = (footer: SectionContent): SocialLink[] =>
  SOCIAL_FIELDS.map(({ key, label }) => ({ key, label, href: safeUrl(text(footer, key)) ?? '' })).filter((s) => s.href);

// ─── Tujuan tautan "#…" ───────────────────────────────────────────────────────

/** Kunci section yang punya tempat di halaman (urutan halaman; = section skema tanpa `brand`). */
export const PAGE_SECTIONS = [
  'hero',
  'highlights',
  'badges',
  'about',
  'stats',
  'welcome',
  'why',
  'programs',
  'achievements',
  'teachers',
  'ppdb',
  'news',
  'announcements',
  'agenda',
  'testimonials',
  'gallery',
  'faq',
  'contact',
  'footer',
] as const;
const KNOWN_SECTIONS = new Set<string>(PAGE_SECTIONS);

/** Section yang memakai label berpenomor "(01)" (urutan halaman). */
const NUMBERED = ['about', 'stats', 'welcome', 'why', 'programs', 'achievements', 'teachers', 'ppdb', 'news', 'testimonials', 'gallery', 'faq', 'contact'];

/** Anchor berbahasa Indonesia yang wajar diketik pembeli → kunci section (anchor bersama seperti #kontak, #tentang,
 *  #galeri, #testimoni sudah diterjemahkan sectionFromAnchor). */
const ANCHOR_ALIASES: Record<string, string> = {
  profil: 'about',
  'visi-misi': 'about',
  sambutan: 'welcome',
  statistik: 'stats',
  // "#keunggulan" diterjemahkan sectionFromAnchor ke kunci bersama `advantages`
  advantages: 'why',
  'mengapa-kami': 'why',
  program: 'programs',
  ekskul: 'programs',
  ekstrakurikuler: 'programs',
  prestasi: 'achievements',
  guru: 'teachers',
  pendaftaran: 'ppdb',
  spmb: 'ppdb',
  berita: 'news',
  pengumuman: 'announcements',
  kegiatan: 'agenda',
  jadwal: 'agenda',
  'orang-tua': 'testimonials',
  alumni: 'testimonials',
  'tanya-jawab': 'faq',
  lokasi: 'contact',
};

/** Target tautan section ("berita", "news", "kontak") → kunci section di halaman, atau null bila tidak dikenal. */
export function sectionTarget(target: string): string | null {
  const clean = sectionFromAnchor(target);
  const key = ANCHOR_ALIASES[clean] ?? clean;
  return KNOWN_SECTIONS.has(key) ? key : null;
}

// ─── Model ────────────────────────────────────────────────────────────────────

export function readBestari(content: SiteContent) {
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

  /** Section tampil di halaman? Kunci yang tidak dikenal (mis. salah ketik di field URL) → false. */
  const shown = (key: string): boolean => {
    if (!KNOWN_SECTIONS.has(key)) return false;
    const s = section(key);
    if (!isEnabled(s)) return false;
    switch (key) {
      case 'highlights':
      case 'badges':
      case 'stats':
      case 'why':
      case 'programs':
      case 'achievements':
      case 'teachers':
      case 'announcements':
      case 'agenda':
      case 'testimonials':
      case 'gallery':
      case 'faq':
        return list(s, 'items').length > 0;
      case 'news':
        return newsItems(s).length > 0;
      default:
        return true;
    }
  };
  const sectionAction = (key: string): LinkAction | null => (shown(key) ? { kind: 'section', target: key } : null);
  /**
   * Isi field URL: "#ppdb", "#berita", "#kontak" dsb. hanya bila section itu tampil (anchor Indonesia diterjemahkan ke
   * kunci section); anchor tak dikenal / section tersembunyi / kosong → `fallback`.
   */
  const linkOr = (raw: string, fallback: LinkAction | null): LinkAction | null => {
    const action = resolveAction(raw, fallback);
    if (action?.kind !== 'section') return action;
    const target = sectionTarget(action.target);
    if (target === 'hero') return { kind: 'section', target };
    return target && shown(target) ? { kind: 'section', target } : fallback;
  };

  /** Nomor label section "(01)", "(02)" … menurut urutan section berpenomor yang tampil; tidak berpenomor → "". */
  const numbered = NUMBERED.filter(shown);
  const number = (key: string): string => {
    const i = numbered.indexOf(key);
    return i < 0 ? '' : String(i + 1).padStart(2, '0');
  };

  /** Nomor WhatsApp panitia PPDB: isian PPDB, kalau kosong nomor di Kontak. */
  const ppdbWhatsapp = text(ppdb, 'whatsapp') || whatsapp;
  /** WhatsApp dengan pesan bebas ke nomor `number` (bawaan nomor Kontak); tanpa nomor → null. */
  const waWith = (message: string, to = whatsapp): LinkAction | null => {
    const link = whatsappHref(to, message);
    return link ? { kind: 'external', href: link } : null;
  };
  const ppdbAction = sectionAction('ppdb') ?? startAction;

  return {
    brand,
    hero,
    highlights: section('highlights'),
    badges: section('badges'),
    about: section('about'),
    stats: section('stats'),
    welcome: section('welcome'),
    why: section('why'),
    programs: section('programs'),
    achievements: section('achievements'),
    teachers: section('teachers'),
    ppdb,
    news: section('news'),
    announcements: section('announcements'),
    agenda: section('agenda'),
    testimonials: section('testimonials'),
    gallery: section('gallery'),
    faq: section('faq'),
    contact,
    footer,
    companyName,
    tagline: text(brand, 'tagline'),
    logo: text(brand, 'logo'),
    colors: bestariVars(text(brand, 'accent_color')),
    whatsapp,
    ppdbWhatsapp,
    waAction,
    contactAction,
    startAction,
    shown,
    number,
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
    /** Pengumuman di bilah paling atas */
    topbarAction: linkOr(text(hero, 'topbar_url'), ppdbAction),
    nav: navItems(content),
    socials: socialLinks(footer),
    map: mapsInfo(text(contact, 'maps_url'), text(contact, 'maps_query') || text(contact, 'address')),
    year: new Date().getFullYear(),
  };
}

export type BestariModel = ReturnType<typeof readBestari>;
