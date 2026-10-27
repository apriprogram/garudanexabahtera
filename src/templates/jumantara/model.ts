// Turunan konten Jumantara (fungsi murni, tanpa React): warna tema (kobalt-hitam untuk pita gelap, versi terang di
// pita gelap, tinta di latar terang), menu, slide hero, tautan bilah utilitas, tanggal Indonesia (termasuk nama hari),
// filter ekstrakurikuler, formulir tanya panitia SPMB → pesan WhatsApp, garis pemisah antar-section putih, dan tujuan
// tautan "#…". Semua tahan konten mentah (null, angka, list rusak). Formulir SPMB hanya menyusun pesan WhatsApp: tidak
// ada data yang dikirim ke server atau disimpan, dan bukan pendaftaran (pendaftaran lewat portal SPMB provinsi).
import type { CSSProperties } from 'react';
import type { ListItem, SectionContent, SiteContent } from '../types';
import { isUrgentBadge } from '../shared/posts/model';
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
  safeUrl,
  sectionFromAnchor,
  text,
  whatsappHref,
  type LinkAction,
} from '../shared/utils';
import { JUMANTARA_ACCENT } from './defaultContent';

// ─── Warna ────────────────────────────────────────────────────────────────────

type Rgb = [number, number, number];
const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];
/** Dasar kobalt-hitam pita gelap (dicampur sedikit warna tema) */
const NIGHT_BASE: Rgb = [5, 8, 22];
const toHex = (rgb: Rgb) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
/** Campuran dibulatkan ke bilangan bulat: kontras dihitung dari warna yang benar-benar ditulis sebagai hex. */
const mix = (a: Rgb, b: Rgb, amountOfA: number): Rgb => a.map((c, i) => Math.round(c * amountOfA + b[i] * (1 - amountOfA))) as Rgb;

/**
 * Variabel warna lokal Jumantara (di samping --tpl-accent* milik Shell), semuanya dari SATU warna tema:
 * --jm-night: kobalt-hitam (tema 11% + dasar gelap) untuk bilah utilitas, SPMB, footer, dan lapisan foto hero; putih ≥ 17:1;
 * --jm-bright: warna tema dicerahkan sampai ≥ 5,5:1 terhadap --jm-night (label & ikon di pita gelap);
 * --jm-ink: warna tema digelapkan sampai ≥ 5:1 di putih DAN ≥ 4,6:1 di --jm-tint (label kecil, chip, tanggal);
 * --jm-tint / --jm-line: bidang lembut 7% dan garis hover 32% warna tema.
 */
export function jumantaraVars(accentRaw: string): CSSProperties {
  const accent = parseHex(accentRaw) ?? (parseHex(JUMANTARA_ACCENT) as Rgb);
  let night = mix(accent, NIGHT_BASE, 0.11);
  for (let i = 0; i < 12 && contrast(night, WHITE) < 17; i += 1) night = mix(night, NIGHT_BASE, 0.8);
  let bright = accent;
  for (let i = 0; i < 20 && contrast(bright, night) < 5.5; i += 1) bright = mix(bright, WHITE, 0.85);
  const tint = mix(accent, WHITE, 0.07);
  let ink = accent;
  for (let i = 0; i < 24 && (contrast(ink, WHITE) < 5 || contrast(ink, tint) < 4.6); i += 1) ink = mix(ink, BLACK, 0.88);
  return {
    '--jm-night': toHex(night),
    '--jm-bright': toHex(bright),
    '--jm-ink': toHex(ink),
    '--jm-tint': toHex(tint),
    '--jm-line': toHex(mix(accent, WHITE, 0.32)),
  } as CSSProperties;
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

export interface JumantaraNavItem {
  key: string;
  label: string;
}

/** Urutan menu atas: yang paling dicari orang tua, murid, dan alumni. SPMB punya tombol sendiri di kanan. */
const NAV: { key: string; label: string }[] = [
  { key: 'about', label: 'Profil' },
  { key: 'programs', label: 'Akademik' },
  { key: 'clubs', label: 'Kesiswaan' },
  { key: 'news', label: 'Berita' },
  { key: 'announcements', label: 'Pengumuman' },
  { key: 'contact', label: 'Kontak' },
];

/** Label menu dari label kecil section bila singkat (≤ 12 huruf, ≤ 2 kata); selain itu label bawaan. */
const shortLabel = (section: SectionContent, fallback: string) => {
  const eyebrow = text(section, 'eyebrow');
  return eyebrow && eyebrow.length <= 12 && eyebrow.split(/\s+/).length <= 2 ? eyebrow : fallback;
};

/** Menu hanya untuk section yang benar-benar tampil (tanpa tautan mati). */
export function navItems(content: SiteContent): JumantaraNavItem[] {
  return NAV.filter(({ key }) => sectionShown(content, key)).map(({ key, label }) => ({ key, label: shortLabel(getSection(content, key), label) }));
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

export interface HeroSlide {
  image: string;
  /** Label singkat di bilah progres ("Profil", "Pembelajaran") */
  label: string;
  eyebrow: string;
  title: string;
  subtitle: string;
}

export const MAX_SLIDES = 4;

/** Slide pertama = isi hero; slide tambahan (maks. 3) hanya yang berfoto, teks kosong ikut slide pertama. */
export function heroSlides(hero: SectionContent, fallbackTitle: string): HeroSlide[] {
  const first: HeroSlide = {
    image: text(hero, 'image'),
    label: text(hero, 'slide_label'),
    eyebrow: text(hero, 'eyebrow'),
    title: text(hero, 'title') || fallbackTitle,
    subtitle: text(hero, 'subtitle'),
  };
  const extra = list(hero, 'slides', 8)
    .filter((item) => hasImage(field(item, 'image')))
    .slice(0, MAX_SLIDES - 1)
    .map((item) => ({
      image: field(item, 'image'),
      label: field(item, 'label'),
      eyebrow: field(item, 'eyebrow') || first.eyebrow,
      title: field(item, 'title') || first.title,
      subtitle: field(item, 'subtitle') || first.subtitle,
    }));
  return [first, ...extra];
}

/** Nama slide untuk bilah progres & pembaca layar: label, kalau kosong judul. */
export const slideName = (slide: HeroSlide): string => slide.label || slide.title;

/** Indeks slide berikut/sebelumnya yang berputar (0 … count-1). */
export const wrapIndex = (i: number, count: number): number => (count > 0 ? ((Math.floor(i) % count) + count) % count : 0);

/** Slide berganti otomatis sebanyak dua putaran penuh, lalu berhenti di slide pertama (WCAG 2.2.2). */
export const AUTOPLAY_ROUNDS = 2;

// ─── Tanggal ──────────────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTHS_LONG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export interface SchoolDate {
  /** "YYYY-MM-DD" untuk atribut datetime */
  iso: string;
  day: string;
  month: string;
  year: string;
  /** "14 Okt 2026" */
  label: string;
  /** "Rabu, 25 November 2026" */
  long: string;
}

/** Tanggal ISO "YYYY-MM-DD" (tanggal kalender yang valid) → bagian tanggal; selain itu null. */
export function parseSchoolDate(raw: string | null | undefined): SchoolDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((raw || '').trim());
  if (!match) return null;
  const [y, m, d] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  const month = MONTHS[m - 1];
  return {
    iso: match[0],
    day: String(d),
    month,
    year: String(y),
    label: `${d} ${month} ${y}`,
    long: `${DAYS[date.getUTCDay()]}, ${d} ${MONTHS_LONG[m - 1]} ${y}`,
  };
}

/** Ubin tanggal untuk teks bebas: 6 huruf pertama (sisanya di keterangan). */
export const shortFreeDate = (raw: string | null | undefined): string => {
  const value = (raw || '').trim();
  return value.length > 6 ? `${value.slice(0, 6).trim()}…` : value;
};

// ─── Teks ─────────────────────────────────────────────────────────────────────

/** Paragraf (dipisah baris kosong). */
export const paragraphsOf = (raw: string): string[] => paragraphs(raw || '');

/** Butir per baris (mapel, misi, profil lulusan). */
export const linesOf = (raw: string): string[] =>
  (raw || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•*\s]+/, '').trim())
    .filter(Boolean);

/**
 * Nama sekolah di dalam judul tidak dipenggal di tengah ("…di SMA / Negeri 1 …"): spasi di nama diganti spasi tak
 * terputus. Hanya untuk nama ≤ 26 huruf, agar tetap muat satu baris di HP (judul H2 28px).
 */
export const keepName = (value: string, name: string): string =>
  name && name.length <= 26 && name.includes(' ') && value.includes(name) ? value.replace(name, name.replace(/ /g, ' ')) : value;

/**
 * Nama bergelar → [awal nama, kata terakhir nama + gelar] ("Dewi ", "Anggraini, S.Si."), supaya bagian kedua tampil
 * utuh dan gelar tidak turun sendirian ke baris terakhir. Tanpa gelar (tanpa koma) → null.
 */
export function degreeSplit(name: string): [string, string] | null {
  const comma = name.indexOf(',');
  if (comma < 0) return null;
  const cut = name.lastIndexOf(' ', comma) + 1;
  return [name.slice(0, cut), name.slice(cut)];
}

/** Butir pendek semua (≤ 32 huruf) → tampil sebagai chip; selain itu daftar bernomor. */
export const allShort = (lines: string[]): boolean => lines.length > 0 && lines.every((line) => line.length <= 32);

/** Label pengumuman yang ditonjolkan merah lembut ("Penting", "Wajib", "Segera", "Mendesak"): aturan bersama tulisan. */
export const isUrgent = (badge: string): boolean => isUrgentBadge(badge);

/** Lampiran PDF (tautan berakhiran .pdf) → chip "PDF". */
export const isPdf = (url: string): boolean => /\.pdf($|[?#])/i.test((url || '').trim());

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** Kategori ekstrakurikuler untuk tombol saring: urut kemunculan, tanpa duplikat (tanpa beda huruf besar). */
export function clubCategories(items: ListItem[]): string[] {
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

/** Item untuk kategori aktif (null / kategori tak dikenal → semua). */
export function filterByCategory(items: ListItem[], category: string | null): ListItem[] {
  if (!category) return items;
  const wanted = normalize(category);
  const matches = items.filter((item) => normalize(field(item, 'category')) === wanted);
  return matches.length > 0 ? matches : items;
}

// ─── Formulir tanya panitia SPMB ──────────────────────────────────────────────

export interface SpmbForm {
  name: string;
  /** Asal SMP/MTs (opsional) */
  origin: string;
  /** Jalur yang diminati (pilihan dari daftar jalur, atau "Belum tahu") */
  path: string;
  question: string;
}

export type SpmbErrors = Partial<Record<keyof SpmbForm, string>>;

export const UNSURE = 'Belum tahu';
export const SPMB_LIMITS = { name: 60, origin: 80, path: 40, question: 500 } as const;
export const EMPTY_SPMB: SpmbForm = { name: '', origin: '', path: UNSURE, question: '' };

/**
 * Pilihan "Jalur yang diminati" dari nama jalur CMS: unik tanpa beda huruf besar/aksen, tanpa nama kosong dan tanpa
 * "Belum tahu" (pilihan itu selalu ditambahkan sendiri di akhir). Nama ganda tidak membuat opsi kembar.
 */
export function pathChoices(items: ListItem[]): string[] {
  const seen = new Set<string>([normalize(UNSURE)]);
  const result: string[] = [];
  for (const item of items) {
    const name = field(item, 'name');
    const key = normalize(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}

/** Pesan galat per isian (kosong = valid). */
export function validateSpmb(form: SpmbForm): SpmbErrors {
  const errors: SpmbErrors = {};
  if (form.name.trim().length < 3) errors.name = 'Tulis nama Anda (minimal 3 huruf).';
  if (form.question.trim().length < 10) errors.question = 'Tulis pertanyaan Anda (minimal 10 karakter).';
  return errors;
}

const clip = (value: string, max: number) => (value || '').trim().replace(/\s+/g, ' ').slice(0, max).trim();

/** Pesan WhatsApp untuk panitia SPMB (satu baris per isian; asal sekolah kosong → "-"). */
export function spmbMessage(school: string, form: SpmbForm): string {
  return [
    `Halo Panitia SPMB ${school}, saya ingin bertanya.`,
    `Nama: ${clip(form.name, SPMB_LIMITS.name)}`,
    `Asal sekolah: ${clip(form.origin, SPMB_LIMITS.origin) || '-'}`,
    `Jalur yang diminati: ${clip(form.path, SPMB_LIMITS.path) || UNSURE}`,
    `Pertanyaan: ${clip(form.question, SPMB_LIMITS.question)}`,
  ].join('\n');
}

// ─── Lain-lain ────────────────────────────────────────────────────────────────

export interface SocialLink {
  key: string;
  label: string;
  href: string;
}

export const socialLinks = (footer: SectionContent): SocialLink[] =>
  SOCIAL_FIELDS.map(({ key, label }) => ({ key, label, href: safeUrl(text(footer, key)) ?? '' })).filter((s) => s.href);

// ─── Section & tujuan tautan "#…" ─────────────────────────────────────────────

/** Kunci section yang punya tempat di halaman (urutan halaman = urutan CMS tanpa `brand`). */
export const PAGE_SECTIONS = [
  'hero',
  'services',
  'welcome',
  'about',
  'programs',
  'news',
  'announcements',
  'agenda',
  'achievements',
  'clubs',
  'facilities',
  'teachers',
  'spmb',
  'testimonials',
  'gallery',
  'faq',
  'contact',
  'footer',
] as const;
const KNOWN_SECTIONS = new Set<string>(PAGE_SECTIONS);

/** Latar tiap section: dua section putih berurutan dipisah garis rambut selebar CONTAINER. */
const BAND: Record<string, 'white' | 'tint' | 'night' | 'photo' | 'strip'> = {
  hero: 'photo',
  services: 'strip',
  welcome: 'white',
  about: 'white',
  programs: 'tint',
  news: 'white',
  announcements: 'tint',
  agenda: 'tint',
  achievements: 'white',
  clubs: 'white',
  facilities: 'tint',
  teachers: 'white',
  spmb: 'night',
  testimonials: 'white',
  gallery: 'white',
  faq: 'tint',
  contact: 'white',
  footer: 'night',
};

/** Anchor berbahasa Indonesia yang wajar diketik pembeli → kunci section (#kontak, #tentang, #galeri, #testimoni,
 *  #layanan, #berita, #pengumuman sudah diterjemahkan sectionFromAnchor). */
const ANCHOR_ALIASES: Record<string, string> = {
  profil: 'about',
  'visi-misi': 'about',
  sambutan: 'welcome',
  akademik: 'programs',
  program: 'programs',
  mapel: 'programs',
  kokurikuler: 'programs',
  prestasi: 'achievements',
  kesiswaan: 'clubs',
  ekskul: 'clubs',
  ekstrakurikuler: 'clubs',
  fasilitas: 'facilities',
  guru: 'teachers',
  ppdb: 'spmb',
  pendaftaran: 'spmb',
  penerimaan: 'spmb',
  alumni: 'testimonials',
  'tanya-jawab': 'faq',
  lokasi: 'contact',
  kegiatan: 'agenda',
  jadwal: 'agenda',
};

/** Target tautan section ("spmb", "#ppdb", "kontak") → kunci section di halaman, atau null bila tidak dikenal. */
export function sectionTarget(target: string): string | null {
  const clean = sectionFromAnchor(target);
  const key = ANCHOR_ALIASES[clean] ?? clean;
  return KNOWN_SECTIONS.has(key) ? key : null;
}

/**
 * Item `items` yang benar-benar dirender per section (maks. sama dengan schema, syarat sama dengan komponen). Satu
 * sumber untuk komponen, menu, garis pemisah, dan tujuan tautan, agar section kosong tidak meninggalkan tautan mati.
 */
const ITEMS: Record<string, [max: number, keep: (item: ListItem) => boolean]> = {
  services: [8, (i) => !!field(i, 'label')],
  programs: [4, (i) => !!field(i, 'name')],
  news: [4, (i) => !!field(i, 'title')],
  announcements: [6, (i) => !!field(i, 'title')],
  agenda: [6, (i) => !!field(i, 'title')],
  achievements: [8, (i) => !!(field(i, 'title') || field(i, 'event'))],
  clubs: [12, (i) => !!field(i, 'name')],
  facilities: [8, (i) => !!field(i, 'name')],
  teachers: [12, (i) => !!field(i, 'name')],
  testimonials: [6, (i) => !!field(i, 'quote')],
  gallery: [8, (i) => hasImage(field(i, 'image'))],
  faq: [8, (i) => !!field(i, 'question')],
};

/** Item yang dirender untuk section `key` (lihat ITEMS); section tanpa daftar item → []. */
export function sectionItems(key: string, section: SectionContent): ListItem[] {
  const rule = ITEMS[key];
  return rule ? list(section, 'items', rule[0]).filter(rule[1]) : [];
}

/** Section tampil dan berisi? Kunci yang tidak dikenal (mis. salah ketik di field URL) → false. */
export function sectionShown(content: SiteContent, key: string): boolean {
  if (!KNOWN_SECTIONS.has(key)) return false;
  const s = getSection(content, key);
  if (!isEnabled(s)) return false;
  if (key in ITEMS) return sectionItems(key, s).length > 0;
  if (key === 'welcome') return !!(text(s, 'title') || text(s, 'quote') || paragraphs(text(s, 'body')).length);
  if (key === 'about') return !!(text(s, 'title') || text(s, 'body') || list(s, 'tabs', 4).some((i) => field(i, 'title')));
  // SPMB: ada judul/deskripsi, isi tab, tombol portal, teks formulir, atau nomor WhatsApp panitia (isian SPMB/Kontak)
  if (key === 'spmb')
    return !!(
      text(s, 'title') ||
      text(s, 'subtitle') ||
      list(s, 'paths', 6).some((i) => field(i, 'name')) ||
      list(s, 'schedule', 8).some((i) => field(i, 'title') || field(i, 'date')) ||
      list(s, 'requirements', 12).some((i) => field(i, 'text')) ||
      (text(s, 'portal_label') && safeUrl(text(s, 'portal_url'))) ||
      text(s, 'form_title') ||
      text(s, 'form_text') ||
      whatsappHref(text(s, 'whatsapp') || text(getSection(content, 'contact'), 'whatsapp'))
    );
  // Sama dengan syarat Contact (Closing.tsx): judul, baris info, atau peta
  if (key === 'contact')
    return !!(
      text(s, 'title') ||
      text(s, 'address') ||
      text(s, 'phone') ||
      text(s, 'email') ||
      text(s, 'hours') ||
      whatsappHref(text(s, 'whatsapp')) ||
      mapsInfo(text(s, 'maps_url'), text(s, 'maps_query') || text(s, 'address')).embed
    );
  return true;
}

// ─── Model ────────────────────────────────────────────────────────────────────

export interface TopbarLink {
  label: string;
  action: LinkAction;
}

export function readJumantara(content: SiteContent) {
  const section = (key: string) => getSection(content, key);
  const brand = section('brand');
  const hero = section('hero');
  const contact = section('contact');
  const footer = section('footer');
  const spmb = section('spmb');

  const companyName = text(brand, 'company_name') || 'Nama Sekolah';
  const whatsapp = text(contact, 'whatsapp');
  const waLink = whatsappHref(whatsapp, text(contact, 'whatsapp_message'));
  const waAction: LinkAction | null = waLink ? { kind: 'external', href: waLink } : null;

  /** Section tampil & berisi di halaman (sectionShown). */
  const shown = (key: string): boolean => sectionShown(content, key);
  /** Item yang dirender untuk section `key` (sectionItems). */
  const items = (key: string): ListItem[] => sectionItems(key, section(key));
  const sectionAction = (key: string): LinkAction | null => (shown(key) ? { kind: 'section', target: key } : null);
  /** Ke section Kontak hanya bila section itu benar-benar tampil (tanpa tautan "#kontak" mati). */
  const contactAction = sectionAction('contact');
  /** Tujuan "hubungi": WhatsApp bila ada nomor, kalau tidak section Kontak, kalau tidak null (tombol disembunyikan). */
  const startAction: LinkAction | null = waAction ?? contactAction;
  /**
   * Isi field URL: "#spmb", "#berita", "#kontak" dsb. hanya bila section itu tampil (anchor Indonesia diterjemahkan ke
   * kunci section); anchor tak dikenal / section tersembunyi / kosong → `fallback`.
   */
  const linkOr = (raw: string, fallback: LinkAction | null): LinkAction | null => {
    const action = resolveAction(raw, fallback);
    if (action?.kind !== 'section') return action;
    const target = sectionTarget(action.target);
    if (target === 'hero') return { kind: 'section', target };
    return target && shown(target) ? { kind: 'section', target } : fallback;
  };

  /** Garis rambut di atas section putih yang langsung mengikuti section putih lain. */
  const ruleAbove = (key: string): boolean => {
    if (BAND[key] !== 'white') return false;
    const i = PAGE_SECTIONS.indexOf(key as (typeof PAGE_SECTIONS)[number]);
    for (let j = i - 1; j >= 0; j -= 1) {
      const prev = PAGE_SECTIONS[j];
      if (prev === 'hero' ? isEnabled(hero) : shown(prev)) return BAND[prev] === 'white';
    }
    return false;
  };

  /** Nomor WhatsApp panitia SPMB: isian SPMB, kalau kosong nomor di Kontak. */
  const spmbWhatsapp = text(spmb, 'whatsapp') || whatsapp;
  /** WhatsApp dengan pesan bebas ke nomor `to` (bawaan nomor Kontak); tanpa nomor → null. */
  const waWith = (message: string, to = whatsapp): LinkAction | null => {
    const link = whatsappHref(to, message);
    return link ? { kind: 'external', href: link } : null;
  };
  const spmbAction = sectionAction('spmb') ?? startAction;
  /** Tautan bilah utilitas yang kosong → Layanan, kalau tidak ada → Kontak, kalau tidak ada → tidak tampil. */
  const quickFallback = sectionAction('services') ?? contactAction;
  const topbarLinks: TopbarLink[] = list(hero, 'topbar_links', 3)
    .map((item) => ({ label: field(item, 'label'), action: linkOr(field(item, 'url'), quickFallback) }))
    .filter((link): link is TopbarLink => !!link.label && !!link.action);

  return {
    brand,
    hero,
    services: section('services'),
    welcome: section('welcome'),
    about: section('about'),
    programs: section('programs'),
    news: section('news'),
    announcements: section('announcements'),
    agenda: section('agenda'),
    achievements: section('achievements'),
    clubs: section('clubs'),
    facilities: section('facilities'),
    teachers: section('teachers'),
    spmb,
    testimonials: section('testimonials'),
    gallery: section('gallery'),
    faq: section('faq'),
    contact,
    footer,
    companyName,
    tagline: text(brand, 'tagline'),
    logo: text(brand, 'logo'),
    colors: jumantaraVars(text(brand, 'accent_color')),
    whatsapp,
    spmbWhatsapp,
    waAction,
    contactAction,
    startAction,
    shown,
    items,
    sectionAction,
    linkOr,
    ruleAbove,
    waWith,
    spmbAction,
    /** Tombol utama hero: tautan sendiri, kalau kosong ke SPMB, kalau tidak ada ke WhatsApp/Kontak */
    primaryAction: linkOr(text(hero, 'primary_url'), spmbAction),
    /** Tombol kedua hero: tautan sendiri, kalau kosong ke Profil (tanpa Profil → disembunyikan) */
    secondaryAction: linkOr(text(hero, 'secondary_url'), sectionAction('about')),
    /** Tombol di menu atas */
    headerLabel: text(hero, 'header_label'),
    headerAction: linkOr(text(hero, 'header_url'), spmbAction),
    topbarLinks,
    nav: navItems(content),
    socials: socialLinks(footer),
    map: mapsInfo(text(contact, 'maps_url'), text(contact, 'maps_query') || text(contact, 'address')),
    year: new Date().getFullYear(),
  };
}

export type JumantaraModel = ReturnType<typeof readJumantara>;
