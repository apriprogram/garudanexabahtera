// Turunan konten Serenity (fungsi murni, diuji di __tests__/serenity.test.tsx): warna gradasi judul, menu, aksi
// tombol, tautan WhatsApp per kelas/paket, daftar isi pencarian halaman. Semua tahan konten mentah (null, angka,
// list rusak).
import type { CSSProperties } from 'react';
import type { ListItem, SectionContent, SiteContent } from '../types';
import { SOCIAL_FIELDS } from '../shared/social';
import {
  contrast,
  field,
  getSection,
  isEnabled,
  list,
  parseHex,
  resolveAction,
  safeImage,
  safeUrl,
  text,
  whatsappHref,
  type LinkAction,
} from '../shared/utils';
import { SERENITY_ACCENT } from './defaultContent';

// ─── Warna ────────────────────────────────────────────────────────────────────

type Rgb = [number, number, number];
const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];
/** Ujung gradasi judul di latar terang: biru tinta (5,7:1 di putih) */
const SKY_INK: Rgb = [47, 98, 201];
const toHex = (rgb: Rgb) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
const mix = (a: Rgb, b: Rgb, amountOfA: number): Rgb => a.map((c, i) => c * amountOfA + b[i] * (1 - amountOfA)) as Rgb;

/**
 * Variabel warna lokal Serenity (di samping --tpl-accent* milik Shell):
 * --sr-hl-from/via/to: gradasi pastel untuk kata sorotan di atas foto gelap (awal = aksen dipucatkan sampai ≥ 7:1
 *   terhadap tinta gelap #0B1530, jadi tetap terbaca di atas lapisan gelap foto);
 * --sr-ink-from/to: gradasi kata sorotan di latar terang (keduanya ≥ 4,5:1 di putih);
 * --sr-tint: bidang sangat lembut warna aksen (latar panel "Cara memulai", kartu bantuan).
 */
export function serenityVars(accentRaw: string): CSSProperties {
  const accent = parseHex(accentRaw) ?? (parseHex(SERENITY_ACCENT) as Rgb);
  const night: Rgb = [11, 21, 48];
  let pastel = mix(accent, WHITE, 0.45);
  for (let i = 0; i < 16 && contrast(pastel, night) < 7; i += 1) pastel = mix(pastel, WHITE, 0.8);
  let ink = accent;
  for (let i = 0; i < 16 && contrast(ink, WHITE) < 4.6; i += 1) ink = mix(ink, BLACK, 0.86);
  return {
    '--sr-hl-from': toHex(pastel),
    '--sr-hl-via': '#c3d5ff',
    '--sr-hl-to': '#dff5ee',
    '--sr-ink-from': toHex(ink),
    '--sr-ink-to': toHex(SKY_INK),
    '--sr-tint': toHex(mix(accent, WHITE, 0.07)),
    '--sr-tint-2': toHex(mix(SKY_INK, WHITE, 0.07)),
  } as CSSProperties;
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

export interface SerenityNavItem {
  key: string;
  label: string;
}

/** Urutan menu = urutan halaman. Beranda selalu ada saat hero tampil (item aktif di atas lipatan). */
const NAV: { key: string; label: string; listKey?: string; textKey?: string }[] = [
  { key: 'hero', label: 'Beranda' },
  { key: 'about', label: 'Tentang', textKey: 'title' },
  { key: 'services', label: 'Kelas', listKey: 'items' },
  { key: 'pricing', label: 'Paket', listKey: 'items' },
  { key: 'faq', label: 'FAQ', listKey: 'items' },
  { key: 'contact', label: 'Kontak' },
];

/** Label menu dari label section bila singkat (≤ 14 huruf, ≤ 2 kata); selain itu label bawaan. */
const shortLabel = (section: SectionContent, fallback: string) => {
  const eyebrow = text(section, 'eyebrow');
  return eyebrow && eyebrow.length <= 14 && eyebrow.split(/\s+/).length <= 2 ? eyebrow : fallback;
};

export function navItems(content: SiteContent): SerenityNavItem[] {
  return NAV.filter(({ key, listKey, textKey }) => {
    const section = getSection(content, key);
    if (!isEnabled(section)) return false;
    if (listKey) return list(section, listKey).length > 0;
    if (textKey) return !!text(section, textKey);
    return true;
  }).map(({ key, label }) => ({ key, label: key === 'hero' || key === 'contact' ? label : shortLabel(getSection(content, key), label) }));
}

// ─── Pencarian halaman ────────────────────────────────────────────────────────

export interface SearchEntry {
  /** Teks yang tampil (judul program, nama paket, pertanyaan, judul section) */
  label: string;
  /** Nama bagian tujuan, mis. "Program" */
  group: string;
  /** Kunci section tujuan */
  target: string;
}

/** Huruf kecil tanpa diakritik, spasi dirapatkan. */
export const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Isi yang bisa dicari dari tombol cari di menu: judul section (menu), kelas, langkah, paket, dan pertanyaan FAQ.
 * Hanya section yang tampil.
 */
export function searchEntries(content: SiteContent, nav: SerenityNavItem[]): SearchEntry[] {
  const entries: SearchEntry[] = [];
  const groupOf = (key: string, fallback: string) => nav.find((item) => item.key === key)?.label ?? fallback;
  for (const item of nav) {
    if (item.key === 'hero') continue;
    const title = text(getSection(content, item.key), 'title');
    entries.push({ label: title || item.label, group: item.label, target: item.key });
  }
  const add = (key: string, listKey: string, labelKey: string, fallbackGroup: string) => {
    const section = getSection(content, key);
    if (!isEnabled(section)) return;
    for (const item of list(section, listKey)) {
      const label = field(item, labelKey);
      if (label) entries.push({ label, group: groupOf(key, fallbackGroup), target: key });
    }
  };
  add('services', 'items', 'title', 'Kelas');
  add('steps', 'items', 'title', shortLabel(getSection(content, 'steps'), 'Cara memulai'));
  add('pricing', 'items', 'name', 'Paket');
  add('faq', 'items', 'question', 'FAQ');
  return entries;
}

/** Hasil pencarian: semua kata kueri harus ada di label/kelompok. Kueri kosong → []. */
export function searchFilter(entries: SearchEntry[], query: string, max = 8): SearchEntry[] {
  const words = normalize(query).split(' ').filter(Boolean);
  if (words.length === 0) return [];
  return entries.filter((entry) => {
    const haystack = normalize(`${entry.label} ${entry.group}`);
    return words.every((word) => haystack.includes(word));
  }).slice(0, max);
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

// ─── Tautan ───────────────────────────────────────────────────────────────────

export interface SocialLink {
  key: string;
  label: string;
  href: string;
}

export const socialLinks = (footer: SectionContent): SocialLink[] =>
  SOCIAL_FIELDS.map(({ key, label }) => ({ key, label, href: safeUrl(text(footer, key)) ?? '' })).filter((s) => s.href);

/** Isi paket: satu baris = satu poin (baris kosong & penanda daftar "-", "•" dibuang). */
export const featureLines = (raw: string): string[] =>
  (raw || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-•*✓]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 10);

/** Paket yang disorot: paket pertama berlabel; tanpa label → -1 (semua sama). */
export const featuredPlan = (items: ListItem[]): number => items.findIndex((item) => field(item, 'badge') !== '');

// ─── Model ────────────────────────────────────────────────────────────────────

export function readSerenity(content: SiteContent) {
  const brand = getSection(content, 'brand');
  const hero = getSection(content, 'hero');
  const about = getSection(content, 'about');
  const services = getSection(content, 'services');
  const steps = getSection(content, 'steps');
  const testimonials = getSection(content, 'testimonials');
  const pricing = getSection(content, 'pricing');
  const faq = getSection(content, 'faq');
  const cta = getSection(content, 'cta');
  const contact = getSection(content, 'contact');
  const footer = getSection(content, 'footer');

  const companyName = text(brand, 'company_name') || 'Nama Usaha';
  const whatsapp = text(contact, 'whatsapp');
  const waMessage = text(contact, 'whatsapp_message');
  const waLink = whatsappHref(whatsapp, waMessage);
  const waAction: LinkAction | null = waLink ? { kind: 'external', href: waLink } : null;
  const contactAction: LinkAction | null = isEnabled(contact) ? { kind: 'section', target: 'contact' } : null;
  /** Tujuan "daftar/mulai": WhatsApp bila ada nomor, kalau tidak section Kontak, kalau tidak null (tombol disembunyikan). */
  const startAction: LinkAction | null = waAction ?? contactAction;
  const programsShown = isEnabled(services) && list(services, 'items').length > 0;
  const programsAction: LinkAction | null = programsShown ? { kind: 'section', target: 'services' } : null;
  const primaryAction = resolveAction(text(hero, 'primary_url'), startAction);
  const nav = navItems(content);

  /** WhatsApp dengan pesan berisi nama kelas/paket; tanpa nomor → aksi "daftar" biasa. */
  const askAbout = (subject: string): LinkAction | null => {
    const link = subject ? whatsappHref(whatsapp, `Halo ${companyName}, saya ingin bertanya tentang ${subject}.`) : '';
    return link ? { kind: 'external', href: link } : startAction;
  };

  return {
    brand,
    hero,
    about,
    services,
    steps,
    testimonials,
    pricing,
    faq,
    cta,
    contact,
    footer,
    companyName,
    tagline: text(brand, 'tagline'),
    logo: text(brand, 'logo'),
    colors: serenityVars(text(brand, 'accent_color')),
    whatsapp,
    waAction,
    contactAction,
    startAction,
    programsAction,
    primaryAction,
    askAbout,
    /** Tombol menu atas: teks & tautan sendiri, kalau kosong mengikuti tombol utama hero */
    headerLabel: text(hero, 'header_label') || text(hero, 'primary_label'),
    headerAction: resolveAction(text(hero, 'header_url'), primaryAction),
    nav,
    search: searchEntries(content, nav),
    socials: socialLinks(footer),
    year: new Date().getFullYear(),
  };
}

export type SerenityModel = ReturnType<typeof readSerenity>;
