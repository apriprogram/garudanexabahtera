// Turunan konten Portline (fungsi murni, diuji di __tests__/portline.test.tsx): warna tema (navy judul & footer, es,
// pita biru pejal, versi terang di latar gelap, tinta di latar terang), bahasa teks bawaan, menu, slide hero, tanggal,
// tagar & filter berita, tata letak mosaik, formulir enquiry (validasi → pesan WhatsApp / email), tujuan tautan "#…",
// section yang tampil, lebar mulai menu lengkap, dan teks antarmuka dari CMS (readUi). Semua tahan konten mentah (null,
// angka, list rusak). Formulir hanya MENYUSUN pesan: tidak ada data yang dikirim ke server atau disimpan.
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
import { langOf, MONTHS, uiCopy, type Lang, type UiCopy } from './copy';
import { PORTLINE_ACCENT } from './defaultContent';

// ─── Warna ────────────────────────────────────────────────────────────────────

type Rgb = [number, number, number];
const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];
/** Tinta gelap --tpl-on-accent untuk warna tema terang (= INK di shared/utils accentVars) */
const ON_LIGHT: Rgb = [18, 22, 32];
/** Dasar navy samudra: dengan 28% biru #1565C0 menghasilkan #0A2A4F (judul & footer) */
const OCEAN: Rgb = [6, 19, 35];
const toHex = (rgb: Rgb) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
/** Campuran dibulatkan ke bilangan bulat: kontras dihitung dari warna yang benar-benar ditulis sebagai hex. */
const mix = (a: Rgb, b: Rgb, amountOfA: number): Rgb => a.map((c, i) => Math.round(c * amountOfA + b[i] * (1 - amountOfA))) as Rgb;

/**
 * Variabel warna lokal Portline (di samping --tpl-accent* milik Shell), semuanya dari SATU warna tema:
 * --pl-deep: navy (tema 28% + navy samudra) untuk judul, footer, dan lapisan foto hero; putih ≥ 12:1;
 * --pl-deep-2: kolom merek footer, sedikit lebih terang; putih ≥ 9:1;
 * --pl-band: pita biru pejal (tema digelapkan sampai putih ≥ 6,5:1);
 * --pl-bright: tema dicerahkan sampai ≥ 5:1 di --pl-deep (label & tautan di latar gelap);
 * --pl-ink: tema digelapkan sampai ≥ 5:1 di putih DAN ≥ 4,6:1 di --pl-ice (label kecil, tautan, tagar);
 * --pl-ice / --pl-ice-2 / --pl-line: pita es 9%, bidang lembut 16%, garis 26% warna tema.
 */
export function portlineVars(accentRaw: string): CSSProperties {
  const accent = parseHex(accentRaw) ?? (parseHex(PORTLINE_ACCENT) as Rgb);
  let deep = mix(accent, OCEAN, 0.28);
  for (let i = 0; i < 12 && contrast(deep, WHITE) < 12; i += 1) deep = mix(deep, OCEAN, 0.8);
  let deep2 = mix(deep, accent, 0.83);
  for (let i = 0; i < 12 && contrast(deep2, WHITE) < 9; i += 1) deep2 = mix(deep2, OCEAN, 0.85);
  let band = accent;
  for (let i = 0; i < 24 && contrast(band, WHITE) < 6.5; i += 1) band = mix(band, BLACK, 0.88);
  let bright = accent;
  for (let i = 0; i < 24 && contrast(bright, deep) < 5; i += 1) bright = mix(bright, WHITE, 0.82);
  const ice = mix(accent, WHITE, 0.09);
  let ink = accent;
  for (let i = 0; i < 24 && (contrast(ink, WHITE) < 5 || contrast(ink, ice) < 4.6); i += 1) ink = mix(ink, BLACK, 0.88);
  return {
    '--pl-deep': toHex(deep),
    '--pl-deep-2': toHex(deep2),
    '--pl-band': toHex(band),
    '--pl-bright': toHex(bright),
    '--pl-ink': toHex(ink),
    '--pl-ice': toHex(ice),
    '--pl-ice-2': toHex(mix(accent, WHITE, 0.16)),
    '--pl-line': toHex(mix(accent, WHITE, 0.26)),
  } as CSSProperties;
}

/** true bila teks di atas bidang warna tema berwarna putih (aturan sama dengan --tpl-on-accent di accentVars). */
export function accentIsDark(accentRaw: string): boolean {
  const accent = parseHex(accentRaw) ?? (parseHex(PORTLINE_ACCENT) as Rgb);
  return contrast(accent, WHITE) >= contrast(accent, ON_LIGHT);
}

// ─── Section yang tampil & tujuan tautan ─────────────────────────────────────

/** Kunci section yang punya tempat di halaman (urutan halaman; = section skema tanpa `brand`). */
export const PAGE_SECTIONS = [
  'hero',
  'newsroom',
  'press',
  'stats',
  'divisions',
  'fleet',
  'network',
  'sustainability',
  'careers',
  'leadership',
  'contact',
  'footer',
] as const;
const KNOWN_SECTIONS = new Set<string>(PAGE_SECTIONS);

/**
 * Item `items` yang benar-benar dirender per section (maks. sama dengan skema, syarat sama dengan komponen). Satu
 * sumber untuk komponen, menu, dan tujuan tautan, agar section kosong tidak meninggalkan tautan mati.
 */
const ITEMS: Record<string, [max: number, keep: (item: ListItem) => boolean]> = {
  newsroom: [8, (i) => !!field(i, 'title')],
  press: [8, (i) => !!field(i, 'headline')],
  stats: [4, (i) => !!(field(i, 'value') || field(i, 'label'))],
  divisions: [6, (i) => !!field(i, 'name')],
  fleet: [6, (i) => !!field(i, 'name')],
  network: [6, (i) => !!field(i, 'region')],
  sustainability: [4, (i) => !!field(i, 'title')],
  leadership: [6, (i) => !!field(i, 'name')],
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
  if (key === 'network' || key === 'sustainability') return !!(text(s, 'title') || sectionItems(key, s).length > 0);
  if (key === 'careers') return !!(text(s, 'title') || text(s, 'text'));
  if (key in ITEMS) return sectionItems(key, s).length > 0;
  return true;
}

/** Anchor yang wajar diketik pembeli → kunci section (anchor bersama #kontak, #berita dst. sudah diterjemahkan). */
const ANCHOR_ALIASES: Record<string, string> = {
  news: 'newsroom',
  media: 'newsroom',
  stories: 'newsroom',
  'in-the-press': 'press',
  liputan: 'press',
  numbers: 'stats',
  angka: 'stats',
  about: 'divisions',
  group: 'divisions',
  grup: 'divisions',
  companies: 'divisions',
  services: 'divisions',
  layanan: 'divisions',
  armada: 'fleet',
  vessels: 'fleet',
  kapal: 'fleet',
  jaringan: 'network',
  offices: 'contact',
  keberlanjutan: 'sustainability',
  esg: 'sustainability',
  jobs: 'careers',
  karier: 'careers',
  karir: 'careers',
  team: 'leadership',
  tim: 'leadership',
  management: 'leadership',
  pimpinan: 'leadership',
  enquiry: 'contact',
  enquiries: 'contact',
};

/** Target tautan section ("newsroom", "#berita", "kontak") → kunci section di halaman, atau null bila tidak dikenal. */
export function sectionTarget(target: string): string | null {
  const clean = sectionFromAnchor(target);
  const key = ANCHOR_ALIASES[clean] ?? clean;
  return KNOWN_SECTIONS.has(key) ? key : null;
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

export interface PortlineNavItem {
  key: string;
  label: string;
}

const NAV_KEYS = ['newsroom', 'divisions', 'fleet', 'network', 'sustainability', 'careers', 'contact'];

/**
 * Label menu: "Nama di menu" (menu_label) bila diisi, kalau tidak label kecil section bila singkat (≤ 14 huruf, ≤ 2
 * kata), selain itu nama bawaan bahasa situs.
 */
export function navItems(content: SiteContent, lang: Lang = langOf(text(getSection(content, 'brand'), 'language'))): PortlineNavItem[] {
  const ui = uiCopy(lang);
  return NAV_KEYS.filter((key) => sectionShown(content, key)).map((key) => {
    const section = getSection(content, key);
    const menu = text(section, 'menu_label');
    const eyebrow = text(section, 'eyebrow');
    const short = eyebrow && eyebrow.length <= 14 && eyebrow.split(/\s+/).length <= 2;
    return { key, label: menu || (short ? eyebrow : ui.nav[key]) };
  });
}

/**
 * Lebar wadah tempat menu atas lengkap (bilah utilitas + menu KAPITAL) mulai tampil; di bawahnya header memakai tombol
 * menu. Dihitung dari panjang label menu & nama perusahaan agar menu tidak menimpa / memotong nama perusahaan:
 * "6xl" (≥ 1152px), "7xl" (≥ 1280px), "96rem" (≥ 1536px), atau "none" (selalu tombol menu).
 */
export type NavTier = '6xl' | '7xl' | '96rem' | 'none';

/** Lebar huruf rata-rata (px) menu KAPITAL 13px semibold + tracking 0.08em, dan nama perusahaan 19px Barlow KAPITAL. */
const NAV_CHAR = 10.2;
const NAME_CHAR = 12.4;

export function navTier(nav: PortlineNavItem[], companyName: string, hasLogo = false): NavTier {
  if (nav.length === 0) return '6xl';
  const chars = nav.reduce((sum, item) => sum + item.label.length, 0);
  // Logo = simbol 40px + jarak 10px + nama; nama sangat panjang boleh terpotong setelah ± 320px
  const logo = hasLogo ? 200 : Math.min(320, 50 + (companyName || '').length * NAME_CHAR);
  const fits = (inner: number, perItem: number) => logo + 24 + chars * NAV_CHAR + nav.length * perItem <= inner;
  if (fits(1152 - 96, 24)) return '6xl';
  if (fits(1280 - 96, 32)) return '7xl';
  if (fits(1536 - 128, 32)) return '96rem';
  return 'none';
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

export interface HeroSlide {
  image: string;
  label: string;
  title: string;
  subtitle: string;
}

export const MAX_SLIDES = 4;

/** Slide pertama = isi hero; slide tambahan (maks. 3) hanya yang berfoto, teks kosong ikut slide pertama. */
export function heroSlides(hero: SectionContent, fallbackTitle: string): HeroSlide[] {
  const first: HeroSlide = {
    image: text(hero, 'image'),
    label: text(hero, 'slide_label'),
    title: text(hero, 'title') || fallbackTitle,
    subtitle: text(hero, 'subtitle'),
  };
  const extra = list(hero, 'slides', 8)
    .filter((item) => hasImage(field(item, 'image')))
    .slice(0, MAX_SLIDES - 1)
    .map((item) => ({
      image: field(item, 'image'),
      label: field(item, 'label'),
      title: field(item, 'title') || first.title,
      subtitle: field(item, 'subtitle') || first.subtitle,
    }));
  return [first, ...extra];
}

/** Indeks slide berikut/sebelumnya yang berputar (0 … count-1). */
export const wrapIndex = (i: number, count: number): number => (count > 0 ? ((Math.floor(i) % count) + count) % count : 0);

// ─── Tanggal ──────────────────────────────────────────────────────────────────

export interface StoryDate {
  /** "YYYY-MM-DD" untuk atribut datetime */
  iso: string;
  /** "14 Oct 2026" (en) / "14 Okt 2026" (id) */
  label: string;
}

/** Tanggal ISO "YYYY-MM-DD" (tanggal kalender yang valid) → bagian tanggal; selain itu null. */
export function parseStoryDate(raw: string | null | undefined, lang: Lang = 'en'): StoryDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((raw || '').trim());
  if (!match) return null;
  const [y, m, d] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return { iso: match[0], label: `${d} ${MONTHS[lang][m - 1]} ${y}` };
}

/** Tanggal untuk tampilan: ISO → "14 Oct 2026", teks bebas ("Autumn 2026") apa adanya. */
export const displayDate = (raw: string | null | undefined, lang: Lang = 'en'): string => parseStoryDate(raw, lang)?.label ?? (raw || '').trim();

// ─── Newsroom ─────────────────────────────────────────────────────────────────

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** Tagar satu berita dari "Lines, Terminals" / "#Lines #Energy" → ["Lines", "Terminals"] (tanpa duplikat). */
export function storyTags(raw: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of (raw || '').split(/[,;#]+/)) {
    const tag = part.trim().replace(/\s+/g, ' ');
    const key = normalize(tag);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
  }
  return result.slice(0, 4);
}

/** Tagar untuk tombol filter: urut kemunculan, tanpa duplikat (tanpa beda huruf besar). */
export function newsTags(items: ListItem[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    for (const tag of storyTags(field(item, 'tags'))) {
      const key = normalize(tag);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(tag);
    }
  }
  return result.slice(0, 6);
}

/** Maksimum ubin mosaik per tampilan. */
export const MOSAIC_MAX = 5;

/** Berita untuk tagar aktif (null / tagar tak dikenal → semua), maks. MOSAIC_MAX. */
export function filterNews(items: ListItem[], tag: string | null): ListItem[] {
  if (!tag) return items.slice(0, MOSAIC_MAX);
  const wanted = normalize(tag);
  const matches = items.filter((item) => storyTags(field(item, 'tags')).some((t) => normalize(t) === wanted));
  return (matches.length > 0 ? matches : items).slice(0, MOSAIC_MAX);
}

/**
 * Kelas sel mosaik (layar ≥ @4xl, grid 12 kolom × 2 baris) per jumlah ubin agar tidak ada sel kosong. Ubin pertama
 * selalu ubin unggulan (lapisan biru pejal). Mengembalikan [kelas sel, atribut sizes].
 */
export function mosaicCells(n: number): [string, string][] {
  const L: Record<number, string[]> = {
    1: ['@4xl:col-span-12 @4xl:row-span-2'],
    2: ['@4xl:col-span-7 @4xl:row-span-2', '@4xl:col-span-5 @4xl:row-span-2'],
    3: ['@4xl:col-span-5 @4xl:row-span-2', '@4xl:col-span-7', '@4xl:col-span-7'],
    4: [
      '@4xl:col-start-1 @4xl:col-span-4 @4xl:row-start-1 @4xl:row-span-2',
      '@4xl:col-start-5 @4xl:col-span-4 @4xl:row-start-1',
      '@4xl:col-start-9 @4xl:col-span-4 @4xl:row-start-1 @4xl:row-span-2',
      '@4xl:col-start-5 @4xl:col-span-4 @4xl:row-start-2',
    ],
    5: [
      '@4xl:col-start-1 @4xl:col-span-4 @4xl:row-start-1 @4xl:row-span-2',
      '@4xl:col-start-5 @4xl:col-span-4 @4xl:row-start-1',
      '@4xl:col-start-9 @4xl:col-span-4 @4xl:row-start-1',
      '@4xl:col-start-5 @4xl:col-span-4 @4xl:row-start-2',
      '@4xl:col-start-9 @4xl:col-span-4 @4xl:row-start-2',
    ],
  };
  const count = Math.max(0, Math.min(MOSAIC_MAX, Math.floor(n)));
  if (count === 0) return [];
  return L[count].map((cls) => {
    const span = Number(/col-span-(\d+)/.exec(cls)?.[1] ?? 4);
    return [cls, `(min-width: 896px) ${Math.round((span / 12) * 100)}vw, 92vw`];
  });
}

// ─── Formulir enquiry ─────────────────────────────────────────────────────────

export interface EnquiryForm {
  name: string;
  company: string;
  email: string;
  phone: string;
  type: string;
  unit: string;
  message: string;
}

export type EnquiryErrors = Partial<Record<keyof EnquiryForm, string>>;

export const EMPTY_ENQUIRY: EnquiryForm = { name: '', company: '', email: '', phone: '', type: '', unit: '', message: '' };

export const validEmail = (raw: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((raw || '').trim());

/** Telepon internasional: 7–15 digit setelah tanda baca dibuang, hanya angka, spasi, ( ) + . - */
export function validPhone(raw: string): boolean {
  const value = (raw || '').trim();
  if (/[^\d\s()+.-]/.test(value)) return false;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

/**
 * Pesan galat per isian (kosong = valid). `types` = pilihan jenis pertanyaan (wajib dipilih bila ada). `e` = teks galat
 * (CMS lewat readUi, bawaan: Inggris).
 */
export function validateEnquiry(form: EnquiryForm, types: string[], e: UiCopy['form']['errors'] = uiCopy('en').form.errors): EnquiryErrors {
  const errors: EnquiryErrors = {};
  if (form.name.trim().length < 2) errors.name = e.name;
  if (!validEmail(form.email)) errors.email = e.email;
  if (form.phone.trim() && !validPhone(form.phone)) errors.phone = e.phone;
  if (types.length > 0 && !types.includes(form.type)) errors.type = e.type;
  if (form.message.trim().length < 10) errors.message = e.message;
  return errors;
}

/**
 * Isi pesan enquiry: salam pembuka, satu baris per isian dengan label isian formulir (isian opsional yang kosong tidak
 * ikut), lalu penutup. `f` = teks formulir (CMS lewat readUi, bawaan: Inggris).
 */
export function enquiryMessage(company: string, form: EnquiryForm, f: UiCopy['form'] = uiCopy('en').form): string {
  const rows = [
    `${f.name}: ${form.name.trim()}`,
    form.company.trim() && `${f.company}: ${form.company.trim()}`,
    `${f.email}: ${form.email.trim()}`,
    form.phone.trim() && `${f.phone}: ${form.phone.trim()}`,
    form.type && `${f.type}: ${form.type}`,
    form.unit && `${f.unit}: ${form.unit}`,
    `${f.message}: ${form.message.trim().replace(/\s+/g, ' ')}`,
  ].filter(Boolean);
  return `${f.greeting(company)}\n${rows.join('\n')}\n${f.thanks}`;
}

/** mailto: dengan subjek & isi (tanpa email tujuan yang valid → ""). */
export function enquiryMailto(to: string, subject: string, body: string): string {
  const base = mailHref(to);
  return base ? `${base}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` : '';
}

// ─── Lain-lain ────────────────────────────────────────────────────────────────

export interface SocialLink {
  key: string;
  label: string;
  href: string;
}

export const socialLinks = (footer: SectionContent): SocialLink[] =>
  SOCIAL_FIELDS.map(({ key, label }) => ({ key, label, href: safeUrl(text(footer, key)) ?? '' })).filter((s) => s.href);

/** Daftar teks dari textarea (satu butir per baris) atau dipisah koma. */
export const lines = (raw: string): string[] =>
  (raw || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

/** "Length overall: 366 m" → ["Length overall", "366 m"]; tanpa titik dua → ["", teks]. */
export function specPair(line: string): [string, string] {
  const i = line.indexOf(':');
  return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : ['', line.trim()];
}

/** Simbol bawaan logo perusahaan grup dari namanya (laut, terminal, energi, darat & udara, galangan); lainnya urut. */
export function glyphIndex(name: string, index = 0): number {
  const rules: [RegExp, number][] = [
    [/\blines?\b|\bliners?\b|ocean|container|kontainer/i, 0],
    [/terminal|\bports?\b|pelabuhan/i, 1],
    [/energy|energi|tanker|\bgas\b/i, 2],
    [/\bair\b|\broad\b|logistic|logistik|inland|darat/i, 3],
    [/yard|galangan|marine|repair/i, 4],
  ];
  const match = rules.find(([pattern]) => pattern.test(name || ''));
  return match ? match[1] : (5 + Math.abs(Math.floor(index))) % 6;
}

/** Prefill formulir kontak dari tombol lain (unit bisnis / jenis pertanyaan). */
export interface EnquiryPrefill {
  type?: string;
  unit?: string;
}

/** Jenis pertanyaan yang cocok dengan kata kunci (mis. "status" → "Shipment status"), atau "". */
export function matchType(types: string[], pattern: RegExp): string {
  return types.find((t) => pattern.test(t)) ?? '';
}

// ─── Teks antarmuka ───────────────────────────────────────────────────────────

/**
 * Teks antarmuka situs: label & pesan yang TAMPIL diambil dari CMS (label baris kontak, judul kolom footer, "Read
 * story", "Key figures", seluruh label/pesan formulir di section `enquiry`); field kosong → teks bawaan bahasa situs
 * (./copy). Label aria tetap dari ./copy sesuai bahasa situs. `{company}` di salam pembuka diganti nama perusahaan.
 */
export function readUi(content: SiteContent, lang: Lang = langOf(text(getSection(content, 'brand'), 'language'))): UiCopy {
  const base = uiCopy(lang);
  const pick = (key: string, name: string, fallback: string) => text(getSection(content, key), name) || fallback;
  const e = (name: string, fallback: string) => pick('enquiry', name, fallback);
  const greeting = text(getSection(content, 'enquiry'), 'greeting');
  const subject = text(getSection(content, 'enquiry'), 'subject');
  const f = base.form;
  return {
    ...base,
    readStory: pick('newsroom', 'read_label', base.readStory),
    specs: pick('fleet', 'specs_label', base.specs),
    headquarters: pick('contact', 'headquarters_label', base.headquarters),
    call: pick('contact', 'phone_label', base.call),
    email: pick('contact', 'email_label', base.email),
    hours: pick('contact', 'hours_label', base.hours),
    viewMap: pick('contact', 'map_label', base.viewMap),
    offices: pick('contact', 'offices_title', base.offices),
    footerCompany: pick('footer', 'col_company', base.footerCompany),
    footerCareers: pick('footer', 'col_careers', base.footerCareers),
    footerMedia: pick('footer', 'col_media', base.footerMedia),
    footerContact: pick('footer', 'col_contact', base.footerContact),
    form: {
      ...f,
      title: pick('contact', 'form_title', f.title),
      submit: pick('contact', 'form_button', f.submit),
      name: e('label_name', f.name),
      company: e('label_company', f.company),
      email: e('label_email', f.email),
      phone: e('label_phone', f.phone),
      type: e('label_type', f.type),
      typePlaceholder: e('prompt_type', f.typePlaceholder),
      unit: e('label_unit', f.unit),
      unitPlaceholder: e('prompt_unit', f.unitPlaceholder),
      message: e('label_message', f.message),
      messagePlaceholder: e('placeholder_message', f.messagePlaceholder),
      optional: e('optional_label', f.optional),
      privacy: e('note', f.privacy),
      readyTitle: e('ready_title', f.readyTitle),
      readyText: e('ready_text', f.readyText),
      openWhatsapp: e('whatsapp_label', f.openWhatsapp),
      sendEmail: e('email_label', f.sendEmail),
      edit: e('edit_label', f.edit),
      noChannel: e('no_channel_text', f.noChannel),
      errors: {
        name: e('error_name', f.errors.name),
        email: e('error_email', f.errors.email),
        phone: e('error_phone', f.errors.phone),
        type: e('error_type', f.errors.type),
        message: e('error_message', f.errors.message),
      },
      greeting: greeting ? (company: string) => greeting.replace(/\{company\}/gi, company) : f.greeting,
      thanks: e('closing', f.thanks),
      subject: (type: string, company: string) => f.subject(type || subject, company),
    },
  };
}

// ─── Model ────────────────────────────────────────────────────────────────────

export function readPortline(content: SiteContent) {
  const section = (key: string) => getSection(content, key);
  const brand = section('brand');
  const hero = section('hero');
  const contact = section('contact');
  const footer = section('footer');
  const lang = langOf(text(brand, 'language'));
  const ui = readUi(content, lang);

  const companyName = text(brand, 'company_name') || 'Company name';
  const nav = navItems(content, lang);
  const whatsapp = text(contact, 'whatsapp');
  const waLink = whatsappHref(whatsapp, text(contact, 'whatsapp_message'));
  const waAction: LinkAction | null = waLink ? { kind: 'external', href: waLink } : null;
  const shown = (key: string): boolean => sectionShown(content, key);
  const items = (key: string): ListItem[] => sectionItems(key, section(key));
  const sectionAction = (key: string): LinkAction | null => (shown(key) ? { kind: 'section', target: key } : null);
  const contactAction = sectionAction('contact');
  /** Tujuan "hubungi": section Kontak (formulir), kalau tidak WhatsApp, kalau tidak null (tombol disembunyikan). */
  const startAction: LinkAction | null = contactAction ?? waAction;

  /**
   * Isi field URL: "#fleet", "#kontak", "#berita" dsb. hanya bila section itu tampil (alias diterjemahkan ke kunci
   * section); anchor tak dikenal / section tersembunyi / kosong → `fallback`.
   */
  const linkOr = (raw: string, fallback: LinkAction | null): LinkAction | null => {
    const action = resolveAction(raw, fallback);
    if (action?.kind !== 'section') return action;
    const target = sectionTarget(action.target);
    if (target === 'hero') return { kind: 'section', target };
    return target && shown(target) ? { kind: 'section', target } : fallback;
  };

  const types = list(contact, 'enquiry_types', 8)
    .map((item) => field(item, 'name'))
    .filter(Boolean);
  const units = items('divisions').map((item) => field(item, 'name'));

  return {
    lang,
    ui,
    brand,
    hero,
    newsroom: section('newsroom'),
    press: section('press'),
    stats: section('stats'),
    divisions: section('divisions'),
    fleet: section('fleet'),
    network: section('network'),
    sustainability: section('sustainability'),
    careers: section('careers'),
    leadership: section('leadership'),
    contact,
    footer,
    companyName,
    tagline: text(brand, 'tagline'),
    logo: text(brand, 'logo'),
    colors: portlineVars(text(brand, 'accent_color')),
    /** data-tpl-tone untuk bidang berwarna tema: "inverse" (cincin fokus putih) hanya bila teksnya putih */
    accentTone: accentIsDark(text(brand, 'accent_color')) ? ('inverse' as const) : undefined,
    whatsapp,
    waAction,
    contactAction,
    startAction,
    shown,
    items,
    sectionAction,
    linkOr,
    types,
    units,
    email: text(contact, 'email'),
    phone: text(contact, 'phone'),
    /** Tautan teks hero ("About Quaymoor >"): tautan sendiri, kalau kosong ke Grup, kalau tidak ke Armada */
    heroLink: linkOr(text(hero, 'link_url'), sectionAction('divisions') ?? sectionAction('fleet')),
    /** Label layanan di strip anak usaha: tautan sendiri, kalau kosong ke Armada */
    serviceAction: linkOr(text(hero, 'service_url'), sectionAction('fleet')),
    utility1: linkOr(text(hero, 'utility_1_url'), sectionAction('divisions') ?? startAction),
    utility2: linkOr(text(hero, 'utility_2_url'), startAction),
    /** Pilihan bahasa hanya bila bahasa lain punya tautan (kontrol yang tampak seperti tombol harus berfungsi) */
    langAction: text(hero, 'lang_current') && text(hero, 'lang_other') ? linkOr(text(hero, 'lang_other_url'), null) : null,
    nav,
    navTier: navTier(nav, companyName, hasImage(text(brand, 'logo'))),
    socials: socialLinks(footer),
    map: mapsInfo(text(contact, 'maps_url'), text(contact, 'maps_query') || text(contact, 'address')),
    year: new Date().getFullYear(),
  };
}

export type PortlineModel = ReturnType<typeof readPortline>;
