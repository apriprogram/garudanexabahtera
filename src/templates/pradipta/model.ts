// Turunan konten Pradipta (fungsi murni, tanpa React): warna turunan dari SATU warna tema (pita langit, cincin, tinta
// kecil, malam untuk lapisan bawah foto hero), menu atas, slide hero, nada pita putih/langit yang berselang-seling
// menurut section yang tampil, tanggal Indonesia + hari (ubin kalender agenda), filter kategori berita & ekskul, prestasi
// per tahun, sel galeri bento, dan formulir tanya SPMB tiga langkah → pesan WhatsApp. Semua tahan konten mentah (null,
// angka, list rusak). Formulir SPMB hanya menyusun pesan WhatsApp untuk panitia: tidak ada data yang dikirim ke server
// atau disimpan, tidak ada unggah berkas, tidak ada pembayaran.
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
  safeUrl,
  sectionFromAnchor,
  text,
  whatsappHref,
  type LinkAction,
} from '../shared/utils';
import { PRADIPTA_ACCENT } from './defaultContent';
import type { Tone } from './styles';

// ─── Warna ────────────────────────────────────────────────────────────────────

type Rgb = [number, number, number];
const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];
/** Biru malam (#06111C): dasar lapisan bawah foto hero */
const NIGHT: Rgb = [6, 17, 28];
const toHex = (rgb: Rgb) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
/** Campuran dibulatkan ke bilangan bulat: kontras dihitung dari warna yang benar-benar ditulis sebagai hex. */
const mix = (a: Rgb, b: Rgb, amountOfA: number): Rgb => a.map((c, i) => Math.round(c * amountOfA + b[i] * (1 - amountOfA))) as Rgb;

/**
 * Variabel warna lokal Pradipta (di samping --tpl-accent* milik Shell), semuanya dari SATU warna tema:
 * --pd-sky (6,5%): latar pita langit, ubin akses cepat, kartu formulir SPMB, pita atas footer;
 * --pd-sky2 (12%): lintasan menu, label section, chip, bulatan ikon;
 * --pd-ring (24%): cincin 1px kartu putih di pita putih dan garis di area langit;
 * --pd-ink: warna tema digelapkan sampai ≥ 5:1 di putih DAN ≥ 4,6:1 di --pd-sky2 (semua teks kecil berwarna tema);
 * --pd-night: biru malam bernuansa tema, putih ≥ 15:1 (hanya lapisan gradasi bawah foto hero).
 */
export function pradiptaVars(accentRaw: string): CSSProperties {
  const accent = parseHex(accentRaw) ?? (parseHex(PRADIPTA_ACCENT) as Rgb);
  const sky2 = mix(accent, WHITE, 0.12);
  let ink = accent;
  for (let i = 0; i < 24 && (contrast(ink, WHITE) < 5 || contrast(ink, sky2) < 4.6); i += 1) ink = mix(ink, BLACK, 0.88);
  let night = mix(accent, NIGHT, 0.16);
  for (let i = 0; i < 12 && contrast(night, WHITE) < 15; i += 1) night = mix(night, NIGHT, 0.8);
  return {
    '--pd-sky': toHex(mix(accent, WHITE, 0.065)),
    '--pd-sky2': toHex(sky2),
    '--pd-ring': toHex(mix(accent, WHITE, 0.24)),
    '--pd-ink': toHex(ink),
    '--pd-night': toHex(night),
  } as CSSProperties;
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

export interface NavItem {
  key: string;
  label: string;
}

/** Menu atas: bagian yang paling dicari calon murid dan orang tua (SPMB berlabel tetap). */
const NAV: { key: string; label: string; fixed?: boolean }[] = [
  { key: 'about', label: 'Profil' },
  { key: 'programs', label: 'Akademik' },
  { key: 'studentlife', label: 'Ekskul' },
  { key: 'news', label: 'Berita' },
  { key: 'spmb', label: 'SPMB', fixed: true },
  { key: 'contact', label: 'Kontak' },
];

/** Label default tiap section untuk tautan footer "Jelajahi". */
const SECTION_LABELS: Record<string, string> = {
  quicklinks: 'Akses cepat',
  stats: 'Statistik',
  about: 'Profil',
  welcome: 'Sambutan',
  programs: 'Akademik',
  studentlife: 'Ekskul',
  achievements: 'Prestasi',
  facilities: 'Fasilitas',
  news: 'Berita',
  announcements: 'Pengumuman',
  agenda: 'Agenda',
  teachers: 'Guru',
  spmb: 'SPMB',
  testimonials: 'Testimoni',
  gallery: 'Galeri',
  faq: 'Tanya jawab',
  contact: 'Kontak',
};

/** Label dari label kecil section bila singkat (≤ 12 huruf, ≤ 2 kata), mis. "Akademik"; selain itu label bawaan. */
export const shortLabel = (section: SectionContent, fallback: string): string => {
  const eyebrow = text(section, 'eyebrow');
  return eyebrow && eyebrow.length <= 12 && eyebrow.split(/\s+/).length <= 2 ? eyebrow : fallback;
};

/** Menu hanya untuk section yang benar-benar tampil (aturan sectionShown: tanpa tautan mati). */
export function navItems(content: SiteContent): NavItem[] {
  return NAV.filter(({ key }) => sectionShown(content, key)).map(({ key, label, fixed }) => ({
    key,
    label: fixed ? label : shortLabel(getSection(content, key), label),
  }));
}

/**
 * Pemilik penunjuk menu per section (urut halaman `order`): item menu itu sendiri, atau item menu TERAKHIR sebelumnya
 * (sambutan → Profil, prestasi & fasilitas → Ekskul, pengumuman/agenda/guru → Berita, testimoni/galeri/FAQ → SPMB,
 * footer → Kontak); section sebelum item menu pertama (hero, akses cepat, statistik) → null.
 */
export function navOwners(order: readonly string[], navKeys: readonly string[]): Record<string, string | null> {
  const owners: Record<string, string | null> = {};
  let owner: string | null = null;
  for (const key of order) {
    if (navKeys.includes(key)) owner = key;
    owners[key] = owner;
  }
  return owners;
}

/** Section yang diutamakan di footer "Jelajahi" (SPMB & Kontak selalu ikut bila tampil), lalu cadangannya. */
const FOOTER_FIRST = ['about', 'programs', 'studentlife', 'achievements', 'news', 'announcements', 'teachers', 'spmb', 'contact'];
const FOOTER_MORE = ['agenda', 'facilities', 'gallery', 'faq', 'testimonials', 'stats', 'welcome', 'quicklinks'];

/** Tautan footer "Jelajahi": maks. 9 section yang tampil (utama dulu, lalu cadangan), urut halaman. */
export function footerLinks(content: SiteContent): NavItem[] {
  const order = (key: string) => (PAGE_SECTIONS as readonly string[]).indexOf(key);
  return [...FOOTER_FIRST, ...FOOTER_MORE]
    .filter((key) => sectionShown(content, key))
    .slice(0, 9)
    .sort((a, b) => order(a) - order(b))
    .map((key) => ({ key, label: key === 'spmb' ? SECTION_LABELS.spmb : shortLabel(getSection(content, key), SECTION_LABELS[key]) }));
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

export interface HeroSlide {
  image: string;
  chip: string;
  title: string;
  subtitle: string;
  /** Teks pendek di thumbnail slide */
  caption: string;
  primaryLabel: string;
  primaryUrl: string;
  secondaryLabel: string;
  secondaryUrl: string;
}

export const MAX_SLIDES = 4;

/** Slide 1 = isi hero; slide tambahan (maks. 3) hanya yang berfoto; isian kosong ikut slide 1. */
export function heroSlides(hero: SectionContent, fallbackTitle: string): HeroSlide[] {
  const first: HeroSlide = {
    image: text(hero, 'image'),
    chip: text(hero, 'chip'),
    title: text(hero, 'title') || fallbackTitle,
    subtitle: text(hero, 'subtitle'),
    caption: text(hero, 'caption'),
    primaryLabel: text(hero, 'primary_label'),
    primaryUrl: text(hero, 'primary_url'),
    secondaryLabel: text(hero, 'secondary_label'),
    secondaryUrl: text(hero, 'secondary_url'),
  };
  const extra = list(hero, 'slides', 8)
    .filter((item) => hasImage(field(item, 'image')))
    .slice(0, MAX_SLIDES - 1)
    .map(
      (item): HeroSlide => ({
        image: field(item, 'image'),
        chip: field(item, 'chip') || first.chip,
        title: field(item, 'title') || first.title,
        subtitle: field(item, 'subtitle') || first.subtitle,
        caption: field(item, 'caption') || field(item, 'title') || first.caption,
        primaryLabel: field(item, 'primary_label') || first.primaryLabel,
        primaryUrl: field(item, 'primary_url') || first.primaryUrl,
        secondaryLabel: field(item, 'secondary_label') || first.secondaryLabel,
        secondaryUrl: field(item, 'secondary_url') || first.secondaryUrl,
      }),
    );
  return [first, ...extra];
}

/** Indeks slide berikut/sebelumnya yang berputar (0 … count-1). */
export const wrapIndex = (i: number, count: number): number => (count > 0 ? ((Math.floor(i) % count) + count) % count : 0);

/** "01", "02" … */
export const pad2 = (n: number): string => String(n).padStart(2, '0');

// ─── Tujuan ubin akses cepat ──────────────────────────────────────────────────

const TARGETS: [RegExp, string][] = [
  [/spmb|ppdb|pendaftaran|daftar|penerimaan|murid baru|siswa baru/i, 'spmb'],
  [/pengumuman/i, 'announcements'],
  [/agenda|kalender|jadwal|kegiatan/i, 'agenda'],
  [/berita|kabar/i, 'news'],
  [/kontak|layanan|hubungi|alamat|lokasi/i, 'contact'],
  [/guru|tenaga kependidikan/i, 'teachers'],
  [/ekskul|ekstrakurikuler/i, 'studentlife'],
  [/prestasi|lomba|juara/i, 'achievements'],
  [/akademik|mapel|mata pelajaran|kurikulum/i, 'programs'],
  [/profil|tentang|visi|misi/i, 'about'],
];

/** Section tujuan dari judul (mis. "SPMB 2027/2028" → spmb) bila section itu tampil, selain itu null. */
export function titleTarget(title: string, shown: (key: string) => boolean): string | null {
  const match = TARGETS.find(([pattern, key]) => pattern.test(title || '') && shown(key));
  return match ? match[1] : null;
}

// ─── Tanggal ──────────────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export interface SchoolDate {
  /** "YYYY-MM-DD" untuk atribut datetime */
  iso: string;
  day: string;
  month: string;
  year: string;
  /** Hari singkat: "Rab" */
  weekday: string;
  /** "25 Nov 2026" */
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
  return { iso: match[0], day: String(d), month, year: String(y), weekday: DAYS[date.getUTCDay()], label: `${d} ${month} ${y}` };
}

/** Tanggal untuk tampilan: ISO → "25 Nov 2026", teks bebas ("Juni 2027") apa adanya. */
export const displayDate = (raw: string | null | undefined): string => parseSchoolDate(raw)?.label ?? (raw || '').trim();

// ─── Kategori (berita & ekstrakurikuler) ──────────────────────────────────────

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** Kategori untuk tombol filter: urut kemunculan, tanpa duplikat (tanpa beda huruf besar). */
export function uniqueCategories(items: ListItem[], key = 'category'): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const category = field(item, key);
    const id = normalize(category);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(category);
  }
  return result;
}

/** Item untuk filter aktif (null / kategori tak dikenal → semua). */
export function filterByCategory(items: ListItem[], category: string | null, key = 'category'): ListItem[] {
  if (!category) return items;
  const wanted = normalize(category);
  const matches = items.filter((item) => normalize(field(item, key)) === wanted);
  return matches.length > 0 ? matches : items;
}

export const newsCategories = (items: ListItem[]): string[] => uniqueCategories(items);
export const filterNews = (items: ListItem[], category: string | null): ListItem[] => filterByCategory(items, category);
export const ekskulCategories = (items: ListItem[]): string[] => uniqueCategories(items);
export const filterEkskul = (items: ListItem[], category: string | null): ListItem[] => filterByCategory(items, category);

/** Paragraf isi (dipisah baris kosong). */
export const paragraphsOf = (raw: string): string[] => paragraphs(raw || '');

/**
 * Nama bergelar → [awal nama, kata terakhir nama + gelar] ("Agus ", "Prasetyo, S.Pd."), supaya bagian kedua tampil
 * utuh dan gelar tidak turun sendirian ke baris terakhir. Tanpa gelar (tanpa koma) → null.
 */
export function degreeSplit(name: string): [string, string] | null {
  const comma = name.indexOf(',');
  if (comma < 0) return null;
  const cut = name.lastIndexOf(' ', comma) + 1;
  return [name.slice(0, cut), name.slice(cut)];
}

/** Daftar mata pelajaran "Biologi, Kimia, …" → chip. */
export const splitList = (raw: string): string[] =>
  (raw || '')
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

/** Tautan lampiran berupa PDF? (label "PDF" di samping "Lampiran") */
export const isPdf = (href: string): boolean => /\.pdf([?#].*)?$/i.test(href || '');

// ─── Prestasi per tahun ───────────────────────────────────────────────────────

export interface YearGroup {
  year: string;
  items: ListItem[];
}

/** Prestasi dikelompokkan per tahun: tahun terbaru dulu, tahun bukan angka sesudahnya (urut kemunculan). */
export function achievementsByYear(items: ListItem[]): YearGroup[] {
  const groups: YearGroup[] = [];
  for (const item of items) {
    const year = field(item, 'year');
    const group = groups.find((g) => g.year === year);
    if (group) group.items.push(item);
    else groups.push({ year, items: [item] });
  }
  const num = (year: string) => (/^\d{4}$/.test(year) ? Number(year) : -Infinity);
  return groups
    .map((g, i) => ({ g, i }))
    .sort((a, b) => num(b.g.year) - num(a.g.year) || a.i - b.i)
    .map(({ g }) => g);
}

// ─── Galeri bento ─────────────────────────────────────────────────────────────

/**
 * Sel galeri tanpa sel kosong: layar lebar 4 kolom (baris 240px): foto 1 = 2×2, foto 2 = 2×1, foto 3–4 = 1×1, foto 5–8
 * mengisi satu baris (1 → penuh, 2 → separuh, 3 → 2+1+1, 4 → 1×4). HP 2 kolom: foto 1 selebar penuh (4:3), sisanya
 * persegi, foto terakhir selebar penuh bila sisanya ganjil. Mengembalikan [kelas sel, sizes].
 */
export function galleryCells(n: number): [string, string][] {
  const desk = (i: number): string => {
    if (n === 1) return '@3xl:col-span-4 @3xl:row-span-2';
    if (n === 2) return '@3xl:col-span-2 @3xl:row-span-2';
    if (n === 3) return i === 0 ? '@3xl:col-span-2 @3xl:row-span-2' : '@3xl:col-span-2';
    if (i === 0) return '@3xl:col-span-2 @3xl:row-span-2';
    if (i === 1) return '@3xl:col-span-2';
    if (i < 4) return '@3xl:col-span-1';
    const rest = n - 4;
    if (rest === 1) return '@3xl:col-span-4';
    if (rest === 2) return '@3xl:col-span-2';
    if (rest === 3) return i === 4 ? '@3xl:col-span-2' : '@3xl:col-span-1';
    return '@3xl:col-span-1';
  };
  const wide = (i: number) => i === 0 || (i === n - 1 && (n - 1) % 2 === 1);
  return Array.from({ length: n }, (_, i) => {
    const cls = desk(i);
    const span = Number(/@3xl:col-span-(\d)/.exec(cls)?.[1] ?? 1);
    const deskVw = span >= 4 ? '92vw' : span >= 2 ? '46vw' : '23vw';
    const phone = wide(i) ? 'col-span-2 aspect-[4/3]' : 'aspect-square';
    return [`${phone} @3xl:aspect-auto ${cls}`, `(min-width: 768px) ${deskVw}, ${wide(i) ? '92vw' : '46vw'}`];
  });
}

// ─── Formulir tanya SPMB (3 langkah) ──────────────────────────────────────────

export interface SpmbForm {
  /** Nama calon murid */
  student: string;
  /** Asal SMP/MTs/sederajat */
  origin: string;
  /** Domisili (opsional) */
  domicile: string;
  /** Jalur yang diminati (nama jalur atau "Belum tahu") */
  path: string;
  /** Topik pertanyaan (opsional, boleh lebih dari satu) */
  topics: string[];
  /** Pertanyaan (opsional) */
  question: string;
  /** Nama orang tua/wali atau calon murid yang bisa dihubungi */
  contact: string;
  /** Nomor WhatsApp */
  phone: string;
  /** Pengirim: orang tua/wali atau calon murid */
  role: 'parent' | 'student';
}

export type SpmbErrors = Partial<Record<keyof SpmbForm, string>>;

export const EMPTY_SPMB: SpmbForm = { student: '', origin: '', domicile: '', path: '', topics: [], question: '', contact: '', phone: '', role: 'parent' };

/** Batas panjang isian (juga dipakai maxLength di formulir dan pemotongan di pesan). */
export const SPMB_MAX = { student: 60, origin: 80, domicile: 60, question: 300, contact: 60, phone: 20 } as const;

/** Pilihan jalur tambahan untuk yang belum memutuskan. */
export const UNSURE_PATH = 'Belum tahu';

/** Pilihan jalur di formulir: nama jalur CMS tanpa duplikat (dan tanpa "Belum tahu" ganda), lalu "Belum tahu". */
export const pathChoices = (paths: string[]): string[] => [...new Set(paths.map((p) => p.trim()).filter((p) => p && p !== UNSURE_PATH)), UNSURE_PATH];

/** Topik pertanyaan tanpa duplikat (urut kemunculan). */
export const uniqueTopics = (topics: string[]): string[] => [...new Set(topics.map((t) => t.trim()).filter(Boolean))];

/** Isian per langkah: 1 Data siswa, 2 Pilihan, 3 Kontak (urutan = urutan fokus ke isian bergalat pertama). */
export const STEP_FIELDS: (keyof SpmbForm)[][] = [
  ['student', 'origin', 'domicile'],
  ['path', 'topics', 'question'],
  ['contact', 'phone', 'role'],
];

export const STEP_LABELS = ['Data siswa', 'Pilihan', 'Kontak'] as const;

/** Rapikan isian: spasi berlebih dirapatkan, dipotong ke batas panjang. */
const tidy = (value: string, max: number) => (value || '').replace(/\s+/g, ' ').trim().slice(0, max);

/** Nomor WhatsApp → bentuk "08…": spasi, strip, titik, kurung dibuang; +62 / 62 → 0. */
export function normalizeWa(raw: string): string {
  let digits = (raw || '').trim().replace(/[\s().-]/g, '');
  if (digits.startsWith('+62')) digits = `0${digits.slice(3)}`;
  else if (digits.startsWith('62')) digits = `0${digits.slice(2)}`;
  return digits;
}

/** Nomor WhatsApp Indonesia yang wajar: 08 + 8–12 digit. */
export const validWa = (raw: string): boolean => /^08\d{8,12}$/.test(normalizeWa(raw));

/** Nama orang: huruf (termasuk beraksen), spasi, titik, koma, apostrof, dan strip. */
const NAME_PATTERN = /^[\p{L}][\p{L} .,'’-]*$/u;

/**
 * Galat isian langkah `step` (0–2) saja; kosong = langkah valid. `paths` = nama jalur dari CMS (pilihan "Belum tahu"
 * selalu tersedia).
 */
export function validateSpmbStep(step: number, form: SpmbForm, paths: string[]): SpmbErrors {
  const errors: SpmbErrors = {};
  if (step === 0) {
    const student = form.student.trim();
    if (student.length < 3) errors.student = 'Tulis nama calon murid (minimal 3 huruf).';
    else if (student.length > SPMB_MAX.student || !NAME_PATTERN.test(student)) errors.student = 'Nama hanya berisi huruf, spasi, titik, atau tanda petik.';
    const origin = form.origin.trim();
    if (origin.length < 3) errors.origin = 'Tulis asal SMP/MTs/sederajat.';
    else if (origin.length > SPMB_MAX.origin) errors.origin = `Maksimal ${SPMB_MAX.origin} karakter.`;
    if (form.domicile.trim().length > SPMB_MAX.domicile) errors.domicile = `Maksimal ${SPMB_MAX.domicile} karakter.`;
  } else if (step === 1) {
    if (!pathChoices(paths).includes(form.path)) errors.path = 'Pilih jalur yang diminati, atau "Belum tahu".';
    if (form.question.length > SPMB_MAX.question) errors.question = `Maksimal ${SPMB_MAX.question} karakter.`;
  } else if (step === 2) {
    const contact = form.contact.trim();
    if (contact.length < 3) errors.contact = 'Tulis nama yang bisa dihubungi (minimal 3 huruf).';
    else if (contact.length > SPMB_MAX.contact || !NAME_PATTERN.test(contact)) errors.contact = 'Nama hanya berisi huruf, spasi, titik, atau tanda petik.';
    if (!validWa(form.phone)) errors.phone = 'Tulis nomor WhatsApp aktif, mis. 081234567890.';
  }
  return errors;
}

/** Pesan WhatsApp untuk panitia SPMB (isian opsional yang kosong → "-"). */
export function spmbMessage(school: string, form: SpmbForm): string {
  const topics = form.topics.map((t) => tidy(t, 40)).filter(Boolean);
  const dash = (value: string) => value || '-';
  return [
    `Halo Panitia SPMB ${tidy(school, 80)}, saya ingin bertanya.`,
    '',
    `Nama calon murid: ${tidy(form.student, SPMB_MAX.student)}`,
    `Asal sekolah: ${tidy(form.origin, SPMB_MAX.origin)}`,
    `Domisili: ${dash(tidy(form.domicile, SPMB_MAX.domicile))}`,
    `Jalur yang diminati: ${dash(tidy(form.path, 40))}`,
    `Topik: ${dash(topics.join(', '))}`,
    `Pertanyaan: ${dash(tidy(form.question, SPMB_MAX.question))}`,
    '',
    `${form.role === 'student' ? 'Calon murid' : 'Orang tua/wali'}: ${tidy(form.contact, SPMB_MAX.contact)}`,
    `Nomor WhatsApp: ${normalizeWa(form.phone)}`,
    '',
    '(Dikirim dari formulir tanya SPMB di website sekolah. Data tidak disimpan di website.)',
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

// ─── Section, anchor, dan nada pita ───────────────────────────────────────────

/** Kunci section yang punya tempat di halaman (urutan halaman; = section skema tanpa `brand`). */
export const PAGE_SECTIONS = [
  'hero',
  'quicklinks',
  'stats',
  'about',
  'welcome',
  'programs',
  'studentlife',
  'achievements',
  'facilities',
  'news',
  'announcements',
  'agenda',
  'teachers',
  'spmb',
  'testimonials',
  'gallery',
  'faq',
  'contact',
  'footer',
] as const;
const KNOWN_SECTIONS = new Set<string>(PAGE_SECTIONS);

/** Anchor berbahasa Indonesia yang wajar diketik pembeli → kunci section (#kontak, #tentang, #galeri, #testimoni,
 *  #berita, #pengumuman, #agenda sudah diterjemahkan sectionFromAnchor). */
const ANCHOR_ALIASES: Record<string, string> = {
  profil: 'about',
  'visi-misi': 'about',
  sambutan: 'welcome',
  statistik: 'stats',
  program: 'programs',
  akademik: 'programs',
  mapel: 'programs',
  ekskul: 'studentlife',
  ekstrakurikuler: 'studentlife',
  prestasi: 'achievements',
  fasilitas: 'facilities',
  sarana: 'facilities',
  guru: 'teachers',
  ppdb: 'spmb',
  pendaftaran: 'spmb',
  akses: 'quicklinks',
  layanan: 'quicklinks',
  // "#layanan" diterjemahkan sectionFromAnchor ke kunci bersama `services`
  services: 'quicklinks',
  kegiatan: 'agenda',
  jadwal: 'agenda',
  alumni: 'testimonials',
  'orang-tua': 'testimonials',
  'tanya-jawab': 'faq',
  lokasi: 'contact',
};

/** Target tautan section ("berita", "news", "kontak") → kunci section di halaman, atau null bila tidak dikenal. */
export function sectionTarget(target: string): string | null {
  const clean = sectionFromAnchor(target);
  const key = ANCHOR_ALIASES[clean] ?? clean;
  return KNOWN_SECTIONS.has(key) ? key : null;
}

/**
 * Item `items` yang benar-benar dirender per section (maks. sama dengan skema). Satu sumber untuk komponen, menu,
 * nada pita, dan tujuan tautan, agar section kosong tidak meninggalkan tautan mati atau pita kembar.
 */
const ITEMS: Record<string, [max: number, keep: (item: ListItem) => boolean]> = {
  quicklinks: [4, (i) => !!field(i, 'title')],
  stats: [6, (i) => !!(field(i, 'value') || field(i, 'label'))],
  programs: [5, (i) => !!field(i, 'title')],
  studentlife: [12, (i) => !!field(i, 'name')],
  achievements: [10, (i) => !!(field(i, 'title') || field(i, 'event'))],
  facilities: [8, (i) => !!field(i, 'name')],
  news: [9, (i) => !!field(i, 'title')],
  announcements: [8, (i) => !!field(i, 'title')],
  agenda: [8, (i) => !!field(i, 'title')],
  teachers: [8, (i) => !!field(i, 'name')],
  testimonials: [6, (i) => !!field(i, 'quote')],
  gallery: [8, (i) => hasImage(field(i, 'image'))],
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
  if (key === 'about')
    return !!(text(s, 'title') || text(s, 'body') || text(s, 'vision') || list(s, 'mission', 6).some((i) => field(i, 'text')) || list(s, 'values', 8).some((i) => field(i, 'title')));
  return true;
}

/** Pita berurutan di bawah hero & akses cepat; pengumuman + agenda berbagi satu pita. */
const BANDS: string[][] = [
  ['stats'],
  ['about'],
  ['welcome'],
  ['programs'],
  ['studentlife'],
  ['achievements'],
  ['facilities'],
  ['news'],
  ['announcements', 'agenda'],
  ['teachers'],
  ['spmb'],
  ['testimonials'],
  ['gallery'],
  ['faq'],
  ['contact'],
];

/**
 * Nada pita per section: langit dan putih berselang-seling menurut pita yang TAMPIL (menyembunyikan section tidak
 * membuat dua pita langit berdempetan). Pita pertama langit; akses cepat selalu putih (menyambung kartu hero). `footer`
 * = nada pita ajakan di atas footer: KEBALIKAN pita terakhir yang tampil (langit → putih bergaris, putih → langit).
 */
export function bandTones(content: SiteContent): Record<string, Tone> {
  const tones: Record<string, Tone> = { quicklinks: 'white' };
  let n = 0;
  for (const band of BANDS) {
    const tone: Tone = n % 2 === 0 ? 'sky' : 'white';
    for (const key of band) tones[key] = tone;
    if (band.some((key) => sectionShown(content, key))) n += 1;
  }
  // Pita terakhir yang tampil berindeks n-1 (genap = langit); tanpa pita → akses cepat putih di atasnya
  tones.footer = n > 0 && (n - 1) % 2 === 0 ? 'white' : 'sky';
  return tones;
}

// ─── Model ────────────────────────────────────────────────────────────────────

export function readPradipta(content: SiteContent) {
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
  const contactAction: LinkAction | null = isEnabled(contact) ? { kind: 'section', target: 'contact' } : null;
  /** Tujuan "hubungi": WhatsApp bila ada nomor, kalau tidak section Kontak, kalau tidak null (tombol disembunyikan). */
  const startAction: LinkAction | null = waAction ?? contactAction;

  const shown = (key: string): boolean => sectionShown(content, key);
  const items = (key: string): ListItem[] => sectionItems(key, section(key));
  const sectionAction = (key: string): LinkAction | null => (shown(key) ? { kind: 'section', target: key } : null);
  /**
   * Isi field URL: "#spmb", "#berita", "#program" dsb. hanya bila section itu tampil (anchor Indonesia diterjemahkan
   * ke kunci section); anchor tak dikenal / section tersembunyi / kosong → `fallback`.
   */
  const linkOr = (raw: string, fallback: LinkAction | null): LinkAction | null => {
    const action = resolveAction(raw, fallback);
    if (action?.kind !== 'section') return action;
    const target = sectionTarget(action.target);
    if (target === 'hero') return { kind: 'section', target };
    return target && shown(target) ? { kind: 'section', target } : fallback;
  };

  /** Nomor WhatsApp panitia SPMB: isian SPMB, kalau kosong nomor di Kontak. */
  const spmbWhatsapp = text(spmb, 'whatsapp') || whatsapp;
  /** WhatsApp dengan pesan bebas ke nomor `to` (bawaan nomor Kontak); tanpa nomor → null. */
  const waWith = (message: string, to = whatsapp): LinkAction | null => {
    const link = whatsappHref(to, message);
    return link ? { kind: 'external', href: link } : null;
  };
  const spmbAction = sectionAction('spmb') ?? startAction;
  const tones = bandTones(content);

  return {
    brand,
    hero,
    quicklinks: section('quicklinks'),
    stats: section('stats'),
    about: section('about'),
    welcome: section('welcome'),
    programs: section('programs'),
    studentlife: section('studentlife'),
    achievements: section('achievements'),
    facilities: section('facilities'),
    news: section('news'),
    announcements: section('announcements'),
    agenda: section('agenda'),
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
    colors: pradiptaVars(text(brand, 'accent_color')),
    whatsapp,
    spmbWhatsapp,
    waAction,
    contactAction,
    startAction,
    spmbAction,
    shown,
    items,
    sectionAction,
    linkOr,
    waWith,
    /** Nada pita section (langit / putih); `footer` = pita ajakan di atas footer (kebalikan pita terakhir) */
    tone: (key: string): Tone => tones[key] ?? 'white',
    /** Pemilik penunjuk menu per section yang tampil (urut halaman), lihat navOwners */
    navOwners: navOwners(
      PAGE_SECTIONS.filter((key) => sectionShown(content, key)),
      navItems(content).map((item) => item.key),
    ),
    /** Tombol di menu atas: tautan sendiri, kalau kosong ke SPMB, kalau tidak ada ke WhatsApp/Kontak */
    headerLabel: text(hero, 'header_label'),
    headerAction: linkOr(text(hero, 'header_url'), spmbAction),
    nav: navItems(content),
    footerLinks: footerLinks(content),
    socials: socialLinks(footer),
    map: mapsInfo(text(contact, 'maps_url'), text(contact, 'maps_query') || text(contact, 'address')),
    year: new Date().getFullYear(),
  };
}

export type PradiptaModel = ReturnType<typeof readPradipta>;
