// Turunan konten Nawasena (fungsi murni, tanpa React): warna navy dari satu warna tema, menu, nomor label "/01", slide
// hero, strip pengumuman, tanggal Indonesia (+ hari untuk agenda), urutan agenda (yang lewat → "Selesai"), formulir
// tanya SPMB → pesan WhatsApp, sel bento galeri & fasilitas, tujuan tautan "#…". Semua tahan konten mentah (null,
// angka, list rusak). Formulir tanya SPMB hanya MENYUSUN pesan WhatsApp: tidak ada data yang dikirim ke server atau
// disimpan, dan formulir itu bukan pendaftaran (pendaftaran di portal SPMB provinsi).
import type { CSSProperties } from 'react';
import type { ListItem, SectionContent, SiteContent } from '../types';
import { POST_PATH_KEY, isUrgentBadge } from '../shared/posts/model';
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
import { NAWASENA_ACCENT } from './defaultContent';

// ─── Warna ────────────────────────────────────────────────────────────────────

type Rgb = [number, number, number];
const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];
/** Tinta gelap --tpl-on-accent untuk warna tema terang (= INK di shared/utils accentVars) */
const ON_LIGHT: Rgb = [18, 22, 32];
/** Dasar navy malam (dicampur sedikit warna tema) */
const NIGHT: Rgb = [7, 13, 29];
/** Abu kertas pita terang (#F5F7FB) */
const SURFACE: Rgb = [245, 247, 251];
const toHex = (rgb: Rgb) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
/** Campuran dibulatkan ke bilangan bulat: kontras dihitung dari warna yang benar-benar ditulis sebagai hex. */
const mix = (a: Rgb, b: Rgb, amountOfA: number): Rgb => a.map((c, i) => Math.round(c * amountOfA + b[i] * (1 - amountOfA))) as Rgb;

export interface NawasenaPalette {
  navy: string;
  bright: string;
  ink: string;
  tint: string;
  soft: string;
  line: string;
  /** Kartu putih 5% di atas navy (untuk uji kontras) */
  card: string;
}

/**
 * Palet Nawasena dari SATU warna tema (warna tidak valid → biru bawaan #2563EB):
 * navy = tema 12% + navy malam, digelapkan sampai putih ≥ 15:1 (hero, pita angka, pita pengumuman, footer, judul);
 * bright = tema dicerahkan sampai ≥ 5:1 di navy DAN ≥ 4,6:1 di kartu putih 5% (teks tema di pita navy);
 * ink = tema digelapkan sampai ≥ 5:1 di putih, ≥ 4,6:1 di #F5F7FB, dan ≥ 4,5:1 di tint (teks tema di latar terang);
 * tint / soft / line = bidang 10% / 5% dan garis 24% warna tema (bidang saja, bukan teks).
 */
export function nawasenaPalette(accentRaw: string): NawasenaPalette {
  const accent = parseHex(accentRaw) ?? (parseHex(NAWASENA_ACCENT) as Rgb);
  let navy = mix(accent, NIGHT, 0.12);
  for (let i = 0; i < 12 && contrast(navy, WHITE) < 15; i += 1) navy = mix(navy, NIGHT, 0.8);
  const card = mix(WHITE, navy, 0.05);
  let bright = accent;
  for (let i = 0; i < 20 && (contrast(bright, navy) < 5 || contrast(bright, card) < 4.6); i += 1) bright = mix(bright, WHITE, 0.8);
  const tint = mix(accent, WHITE, 0.1);
  let ink = accent;
  for (let i = 0; i < 24 && (contrast(ink, WHITE) < 5 || contrast(ink, SURFACE) < 4.6 || contrast(ink, tint) < 4.5); i += 1) ink = mix(ink, BLACK, 0.88);
  return {
    navy: toHex(navy),
    bright: toHex(bright),
    ink: toHex(ink),
    tint: toHex(tint),
    soft: toHex(mix(accent, WHITE, 0.05)),
    line: toHex(mix(accent, WHITE, 0.24)),
    card: toHex(card),
  };
}

/** Variabel CSS lokal Nawasena (di samping --tpl-accent* milik Shell). */
export function nawasenaVars(accentRaw: string): CSSProperties {
  const p = nawasenaPalette(accentRaw);
  return {
    '--nw-navy': p.navy,
    '--nw-bright': p.bright,
    '--nw-ink': p.ink,
    '--nw-tint': p.tint,
    '--nw-soft': p.soft,
    '--nw-line': p.line,
  } as CSSProperties;
}

/** true bila teks di atas bidang warna tema berwarna putih (aturan sama dengan --tpl-on-accent di accentVars). */
export function accentIsDark(accentRaw: string): boolean {
  const accent = parseHex(accentRaw) ?? (parseHex(NAWASENA_ACCENT) as Rgb);
  return contrast(accent, WHITE) >= contrast(accent, ON_LIGHT);
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

export interface NawasenaNavItem {
  key: string;
  label: string;
}

/** Urutan menu atas: yang paling dicari orang tua, murid, dan alumni di website SMA negeri. */
const NAV: { key: string; label: string }[] = [
  { key: 'about', label: 'Profil' },
  { key: 'programs', label: 'Akademik' },
  { key: 'achievements', label: 'Prestasi' },
  { key: 'news', label: 'Berita' },
  { key: 'agenda', label: 'Agenda' },
  { key: 'contact', label: 'Kontak' },
];

/** Label menu = label kecil section bila singkat (≤ 14 huruf, ≤ 2 kata), selain itu label bawaan. */
const shortLabel = (section: SectionContent, fallback: string) => {
  const eyebrow = text(section, 'eyebrow');
  return eyebrow && eyebrow.length <= 14 && eyebrow.split(/\s+/).length <= 2 ? eyebrow : fallback;
};

/** Menu hanya untuk section yang benar-benar tampil (aturan sama dengan sectionShown: tanpa tautan mati). */
export function navItems(content: SiteContent): NawasenaNavItem[] {
  return NAV.filter(({ key }) => sectionShown(content, key)).map(({ key, label }) => ({ key, label: shortLabel(getSection(content, key), label) }));
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

export interface HeroSlide {
  image: string;
  eyebrow: string;
  title: string;
  subtitle: string;
}

export const MAX_SLIDES = 4;

/** Slide 1 = isi hero; slide tambahan (maks. 3) hanya yang berfoto, teks kosong ikut slide 1. */
export function heroSlides(hero: SectionContent, fallbackTitle: string): HeroSlide[] {
  const first: HeroSlide = {
    image: text(hero, 'image'),
    eyebrow: text(hero, 'eyebrow'),
    title: text(hero, 'title') || fallbackTitle,
    subtitle: text(hero, 'subtitle'),
  };
  const extra = list(hero, 'slides', 8)
    .filter((item) => hasImage(field(item, 'image')))
    .slice(0, MAX_SLIDES - 1)
    .map((item) => ({
      image: field(item, 'image'),
      eyebrow: field(item, 'eyebrow') || first.eyebrow,
      title: field(item, 'title') || first.title,
      subtitle: field(item, 'subtitle') || first.subtitle,
    }));
  return [first, ...extra];
}

/** Indeks slide berikut/sebelumnya yang berputar (0 … count-1). */
export const wrapIndex = (i: number, count: number): number => (count > 0 ? ((Math.floor(i) % count) + count) % count : 0);

// ─── Tanggal ──────────────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const WEEKDAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export interface SchoolDate {
  /** "YYYY-MM-DD" untuk atribut datetime */
  iso: string;
  day: string;
  month: string;
  year: string;
  /** "Rab" */
  weekday: string;
  /** "25 Nov 2026" */
  label: string;
  /** "Rab, 25 Nov 2026" */
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
  const weekday = WEEKDAYS[date.getUTCDay()];
  const label = `${d} ${month} ${y}`;
  return { iso: match[0], day: String(d), month, year: String(y), weekday, label, long: `${weekday}, ${label}` };
}

/** Tanggal untuk tampilan: ISO → "25 Nov 2026", teks bebas ("12–14 Jul 2027") apa adanya. */
export const displayDate = (raw: string | null | undefined): string => parseSchoolDate(raw)?.label ?? (raw || '').trim();

/** Hari ini "YYYY-MM-DD" (waktu lokal pengunjung). */
export const todayIso = (now = new Date()): string =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

// ─── Berita, pengumuman, agenda ──────────────────────────────────────────────

/** Paragraf isi (dipisah baris kosong). */
export const paragraphsOf = (raw: string): string[] => paragraphs(raw || '');

/** Baris teks (satu butir per baris; baris kosong dibuang). */
export const linesOf = (raw: string): string[] =>
  (raw || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-•*]|\d+[.)])\s+/, '').trim())
    .filter(Boolean);

/** Daftar dipisah koma atau baris baru (mis. ekstrakurikuler lainnya). */
export const tagsOf = (raw: string): string[] =>
  (raw || '')
    .split(/[,\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean);

/**
 * Nama bergelar → [awal nama, kata terakhir nama + gelar] ("Muhammad ", "Rizal, S.Pd., M.Si."), supaya bagian kedua
 * tampil utuh dan gelar tidak turun sendirian ke baris terakhir. Tanpa gelar (tanpa koma) → null.
 */
export function degreeSplit(name: string): [string, string] | null {
  const comma = name.indexOf(',');
  if (comma < 0) return null;
  const cut = name.lastIndexOf(' ', comma) + 1;
  return [name.slice(0, cut), name.slice(cut)];
}

/** Label pengumuman yang ditonjolkan merah lembut ("Penting", "Wajib", "Segera", "Mendesak"): aturan bersama tulisan. */
export const isUrgent = (badge: string): boolean => isUrgentBadge(badge);

export interface TickerItem {
  title: string;
  date: string;
  /** Path halaman tulisan (fitur Berita & Pengumuman), selain itu null = teks biasa */
  path: string | null;
}

/**
 * Isi strip pengumuman di bawah hero: maks. 5 pengumuman terbaru (tanggal ISO terbaru dulu; tanpa tanggal ISO tetap di
 * urutan CMS setelahnya). `items` = item section pengumuman yang SUDAH digabung tulisan (useContentWithPosts).
 */
export function tickerItems(items: ListItem[], max = 5): TickerItem[] {
  return items
    .map((item, i) => ({ item, i, iso: parseSchoolDate(field(item, 'date'))?.iso ?? '' }))
    .sort((a, b) => (a.iso === b.iso ? a.i - b.i : !a.iso ? 1 : !b.iso ? -1 : a.iso < b.iso ? 1 : -1))
    .slice(0, max)
    .map(({ item }) => ({ title: field(item, 'title'), date: displayDate(field(item, 'date')), path: field(item, POST_PATH_KEY) || null }));
}

export interface AgendaEntry {
  item: ListItem;
  date: SchoolDate | null;
  /** Tanggal ISO sebelum hari ini → "Selesai" */
  past: boolean;
}

/** Agenda: yang akan datang dulu (urutan CMS), yang sudah lewat (tanggal ISO < hari ini) di belakang dengan label Selesai. */
export function agendaEntries(items: ListItem[], today = todayIso()): AgendaEntry[] {
  const entries = items.map((item) => {
    const date = parseSchoolDate(field(item, 'date'));
    return { item, date, past: !!date && date.iso < today };
  });
  return [...entries.filter((e) => !e.past), ...entries.filter((e) => e.past)];
}

// ─── Formulir tanya SPMB ─────────────────────────────────────────────────────

export const ASKER_ROLES = ['Calon murid', 'Orang tua/wali'] as const;
export const PATH_UNKNOWN = 'Belum tahu';

export interface SpmbQuestion {
  name: string;
  role: string;
  origin: string;
  path: string;
  question: string;
}

export type SpmbErrors = Partial<Record<keyof SpmbQuestion, string>>;

export const EMPTY_QUESTION: SpmbQuestion = { name: '', role: ASKER_ROLES[0], origin: '', path: PATH_UNKNOWN, question: '' };

/**
 * Pilihan jalur di formulir: nama jalur dari CMS + "Belum tahu" di akhir. Nama ganda (huruf besar/kecil diabaikan) dan
 * jalur bernama "Belum tahu" hanya muncul sekali, jadi setiap <option> unik.
 */
export function pathOptions(spmb: SectionContent): string[] {
  const seen = new Set([PATH_UNKNOWN.toLowerCase()]);
  const names = list(spmb, 'paths', 6)
    .map((item) => field(item, 'name'))
    .filter((name) => {
      const key = name.toLowerCase();
      if (!name || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return [...names, PATH_UNKNOWN];
}

/** Pesan galat per isian (kosong = valid). */
export function validateSpmbQuestion(form: SpmbQuestion, paths: string[]): SpmbErrors {
  const errors: SpmbErrors = {};
  const name = form.name.trim();
  const origin = form.origin.trim();
  const question = form.question.trim();
  if (name.length < 3 || name.length > 60) errors.name = 'Tulis nama Anda.';
  if (!(ASKER_ROLES as readonly string[]).includes(form.role)) errors.role = 'Pilih salah satu.';
  if (origin.length < 3 || origin.length > 80) errors.origin = 'Tulis asal sekolah.';
  if (!paths.includes(form.path)) errors.path = 'Pilih jalur yang diminati.';
  if (question.length < 10) errors.question = 'Tulis pertanyaan minimal 10 huruf.';
  else if (question.length > 500) errors.question = 'Pertanyaan paling banyak 500 huruf.';
  return errors;
}

/** Pesan WhatsApp untuk panitia SPMB (formulir ini bukan pendaftaran). */
export function spmbMessage(school: string, topic: string, form: SpmbQuestion): string {
  return [
    `Halo Panitia SPMB ${school},`,
    `saya ingin bertanya tentang ${topic || 'SPMB'}.`,
    '',
    `Nama: ${form.name.trim()}`,
    `Saya: ${form.role}`,
    `Asal sekolah: ${form.origin.trim()}`,
    `Jalur yang diminati: ${form.path}`,
    '',
    'Pertanyaan:',
    form.question.trim(),
    '',
    '(Dikirim dari formulir tanya SPMB di website sekolah. Formulir ini bukan pendaftaran.)',
  ].join('\n');
}

// ─── Bento galeri & fasilitas ────────────────────────────────────────────────

/** Lebar kolom (dari 12) untuk sisa ubin: baris berisi 3 (4 kolom), sisa 1 → penuh, sisa 2 → separuh. */
function restSpans(n: number): number[] {
  return Array.from({ length: n }, (_, i) => {
    const left = n - (i - (i % 3));
    if (left >= 3) return 4;
    return left === 2 ? 6 : 12;
  });
}

const SPAN: Record<number, string> = {
  3: '@5xl:col-span-3',
  4: '@5xl:col-span-4',
  5: '@5xl:col-span-5',
  6: '@5xl:col-span-6',
  7: '@5xl:col-span-7',
  12: '@5xl:col-span-12',
};
const ROWS: Record<number, string> = { 1: '@5xl:row-span-1', 2: '@5xl:row-span-2', 3: '@5xl:row-span-3' };

export interface BentoCell {
  /** Kelas grid layar lebar (+ HP untuk galeri) */
  className: string;
  /** Lebar kolom dari 12 di layar lebar */
  span: number;
  /** Tampil selebar penuh di HP (galeri) */
  wide: boolean;
  /** Atribut sizes untuk srcset */
  sizes: string;
}

const sizesFor = (span: number, wide: boolean) =>
  `(min-width: 1024px) ${Math.round((span / 12) * 92)}vw, ${wide ? '92vw' : '46vw'}`;

/**
 * Sel bento galeri (12 kolom, baris 200px di layar lebar): 1 foto → penuh; 2 → 6 + 6; 3 → 6 tinggi + dua 6;
 * ≥ 4 → foto 1 tegak 6×3, foto 2 6×2, foto 3–4 3×1, sisanya baris 4 kolom. HP 2 kolom: foto 1 (dan foto terakhir
 * bila sisanya ganjil) selebar penuh.
 */
export function galleryCells(n: number): BentoCell[] {
  const rest = restSpans(Math.max(0, n - 4));
  return Array.from({ length: n }, (_, i) => {
    let span = 12;
    let rows = 2;
    if (n === 2) span = 6;
    else if (n === 3) [span, rows] = i === 0 ? [6, 2] : [6, 1];
    else if (n >= 4) {
      if (i === 0) [span, rows] = [6, 3];
      else if (i === 1) [span, rows] = [6, 2];
      else if (i < 4) [span, rows] = [3, 1];
      else [span, rows] = [rest[i - 4], 1];
    }
    const wide = i === 0 || (i === n - 1 && (n - 1) % 2 === 1);
    return { className: `${wide ? 'col-span-2' : ''} ${SPAN[span]} ${ROWS[rows]}`, span, wide, sizes: sizesFor(span, wide) };
  });
}

/**
 * Sel bento fasilitas: ubin FOTO dulu (1 → penuh 12×2; 2 → 7×2 + 5×2; ≥ 3 → 7×2, 5×1, 5×1, sisanya 4 kolom), lalu
 * ubin TEKS (tanpa foto) dalam baris 4 kolom (sisa 1 → penuh, sisa 2 → separuh).
 */
export function facilityCells(photoCount: number, textCount: number): { photos: BentoCell[]; texts: BentoCell[] } {
  const extra = restSpans(Math.max(0, photoCount - 3));
  const photos = Array.from({ length: photoCount }, (_, i) => {
    let span = 12;
    let rows = 2;
    if (photoCount === 2) span = i === 0 ? 7 : 5;
    else if (photoCount >= 3) {
      if (i === 0) [span, rows] = [7, 2];
      else if (i < 3) [span, rows] = [5, 1];
      else [span, rows] = [extra[i - 3], 1];
    }
    return { className: `${SPAN[span]} ${ROWS[rows]}`, span, wide: true, sizes: sizesFor(span, true) };
  });
  const texts = restSpans(textCount).map((span) => ({ className: SPAN[span], span, wide: true, sizes: '' }));
  return { photos, texts };
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
  'stats',
  'welcome',
  'about',
  'programs',
  'achievements',
  'news',
  'announcements',
  'agenda',
  'clubs',
  'facilities',
  'teachers',
  'spmb',
  'gallery',
  'testimonials',
  'faq',
  'contact',
  'footer',
] as const;
const KNOWN_SECTIONS = new Set<string>(PAGE_SECTIONS);

/** Section berlabel bernomor "/01 — …" (urutan halaman; hero & pita angka tanpa nomor). */
const NUMBERED = [
  'welcome',
  'about',
  'programs',
  'achievements',
  'news',
  'announcements',
  'agenda',
  'clubs',
  'facilities',
  'teachers',
  'spmb',
  'gallery',
  'testimonials',
  'faq',
  'contact',
];

/** Anchor berbahasa Indonesia yang wajar diketik pembeli → kunci section (anchor bersama seperti #kontak, #tentang,
 *  #galeri, #testimoni, #berita, #pengumuman, #agenda sudah diterjemahkan sectionFromAnchor). */
const ANCHOR_ALIASES: Record<string, string> = {
  profil: 'about',
  'visi-misi': 'about',
  sejarah: 'about',
  sambutan: 'welcome',
  statistik: 'stats',
  angka: 'stats',
  akademik: 'programs',
  program: 'programs',
  kurikulum: 'programs',
  prestasi: 'achievements',
  ekstrakurikuler: 'clubs',
  ekskul: 'clubs',
  fasilitas: 'facilities',
  guru: 'teachers',
  ppdb: 'spmb',
  pendaftaran: 'spmb',
  'murid-baru': 'spmb',
  kegiatan: 'agenda',
  jadwal: 'agenda',
  alumni: 'testimonials',
  faq: 'faq',
  'tanya-jawab': 'faq',
  lokasi: 'contact',
};

/** Target tautan section ("spmb", "#berita", "kontak") → kunci section di halaman, atau null bila tidak dikenal. */
export function sectionTarget(target: string): string | null {
  const clean = sectionFromAnchor(target);
  const key = ANCHOR_ALIASES[clean] ?? clean;
  return KNOWN_SECTIONS.has(key) ? key : null;
}

// ─── Section yang tampil ──────────────────────────────────────────────────────

/**
 * Item `items` yang benar-benar dirender per section (maks. sama dengan schema, syarat sama dengan komponen). Satu
 * sumber untuk komponen, menu, nomor "/01", dan tujuan tautan, agar section kosong tidak meninggalkan nomor bolong
 * atau tautan mati.
 */
const ITEMS: Record<string, [max: number, keep: (item: ListItem) => boolean]> = {
  stats: [6, (i) => !!(field(i, 'value') || field(i, 'label'))],
  programs: [5, (i) => !!field(i, 'name')],
  achievements: [10, (i) => !!(field(i, 'title') || field(i, 'event'))],
  news: [7, (i) => !!field(i, 'title')],
  announcements: [8, (i) => !!field(i, 'title')],
  agenda: [8, (i) => !!field(i, 'title')],
  clubs: [12, (i) => !!field(i, 'name')],
  facilities: [8, (i) => !!field(i, 'name')],
  teachers: [8, (i) => !!field(i, 'name')],
  gallery: [8, (i) => hasImage(field(i, 'image'))],
  testimonials: [6, (i) => !!field(i, 'quote')],
  faq: [10, (i) => !!field(i, 'question')],
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
  if (key === 'about') return !!(text(s, 'title') || text(s, 'body') || text(s, 'history_text') || list(s, 'pillars', 5).some((i) => field(i, 'title')));
  if (key === 'contact') return contactShown(s);
  return true;
}

/**
 * Section Kontak berisi? Syarat sama dengan komponen Contact: judul, salah satu baris kontak (alamat, telepon, email, jam
 * layanan), peta (kata kunci / tautan / alamat), atau nomor WhatsApp. Kosong semua → section tidak dirender, jadi menu
 * "Kontak" dan tombol yang jatuh ke "#kontak" juga tidak muncul (tanpa tautan mati).
 */
function contactShown(s: SectionContent): boolean {
  if (['title', 'address', 'phone', 'email', 'hours'].some((k) => text(s, k))) return true;
  if (mapsInfo(text(s, 'maps_url'), text(s, 'maps_query') || text(s, 'address')).embed) return true;
  return !!whatsappHref(text(s, 'whatsapp'), text(s, 'whatsapp_message'));
}

// ─── Model ────────────────────────────────────────────────────────────────────

export function readNawasena(content: SiteContent) {
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
  const contactAction: LinkAction | null = sectionShown(content, 'contact') ? { kind: 'section', target: 'contact' } : null;
  /** Tujuan "hubungi": WhatsApp bila ada nomor, kalau tidak section Kontak, kalau tidak null (tombol disembunyikan). */
  const startAction: LinkAction | null = waAction ?? contactAction;

  /** Section tampil & berisi di halaman (sectionShown). */
  const shown = (key: string): boolean => sectionShown(content, key);
  /** Item yang dirender untuk section `key` (sectionItems). */
  const items = (key: string): ListItem[] => sectionItems(key, section(key));
  const sectionAction = (key: string): LinkAction | null => (shown(key) ? { kind: 'section', target: key } : null);
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

  /** Nomor label "01", "02" … menurut urutan section berpenomor yang tampil; tidak berpenomor → "". */
  const numbered = NUMBERED.filter(shown);
  const number = (key: string): string => {
    const i = numbered.indexOf(key);
    return i < 0 ? '' : String(i + 1).padStart(2, '0');
  };

  /** Nomor WhatsApp panitia SPMB: isian SPMB, kalau kosong nomor di Kontak. */
  const spmbWhatsapp = text(spmb, 'whatsapp') || whatsapp;
  /** WhatsApp dengan pesan bebas ke nomor `to` (bawaan nomor Kontak); tanpa nomor → null. */
  const waWith = (message: string, to = whatsapp): LinkAction | null => {
    const link = whatsappHref(to, message);
    return link ? { kind: 'external', href: link } : null;
  };
  const spmbAction = sectionAction('spmb') ?? startAction;

  return {
    brand,
    hero,
    stats: section('stats'),
    welcome: section('welcome'),
    about: section('about'),
    programs: section('programs'),
    achievements: section('achievements'),
    news: section('news'),
    announcements: section('announcements'),
    agenda: section('agenda'),
    clubs: section('clubs'),
    facilities: section('facilities'),
    teachers: section('teachers'),
    spmb,
    gallery: section('gallery'),
    testimonials: section('testimonials'),
    faq: section('faq'),
    contact,
    footer,
    companyName,
    tagline: text(brand, 'tagline'),
    logo: text(brand, 'logo'),
    colors: nawasenaVars(text(brand, 'accent_color')),
    /** data-tpl-tone untuk bidang warna tema: "inverse" (cincin fokus putih) hanya bila teksnya putih */
    accentTone: accentIsDark(text(brand, 'accent_color')) ? ('inverse' as const) : undefined,
    whatsapp,
    spmbWhatsapp,
    waAction,
    contactAction,
    startAction,
    shown,
    items,
    number,
    sectionAction,
    linkOr,
    waWith,
    spmbAction,
    /** Tombol utama hero: tautan sendiri, kalau kosong ke SPMB, kalau tidak ada ke WhatsApp/Kontak */
    primaryAction: linkOr(text(hero, 'primary_url'), spmbAction),
    /** Tombol kedua hero: tautan sendiri, kalau kosong ke Profil (tanpa Profil → disembunyikan) */
    secondaryAction: linkOr(text(hero, 'secondary_url'), sectionAction('about')),
    /** Tombol di menu atas */
    headerLabel: text(hero, 'header_label'),
    headerAction: linkOr(text(hero, 'header_url'), spmbAction),
    nav: navItems(content),
    socials: socialLinks(footer),
    map: mapsInfo(text(contact, 'maps_url'), text(contact, 'maps_query') || text(contact, 'address')),
    year: new Date().getFullYear(),
  };
}

export type NawasenaModel = ReturnType<typeof readNawasena>;
