// Turunan konten Finova (fungsi murni, diuji di __tests__/finova.test.tsx): warna panel & tombol, menu, aksi
// tombol, angka bersuperskrip, kelompok tautan footer, tata letak bento. Semua tahan konten mentah (null, angka, list
// rusak).
import type { CSSProperties } from 'react';
import type { ListItem, SectionContent, SiteContent } from '../types';
import { parseCount, formatCount } from '../shared/motion';
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
import { FINOVA_ACCENT, FINOVA_HIGHLIGHT } from './defaultContent';

// ─── Warna ────────────────────────────────────────────────────────────────────

type Rgb = [number, number, number];
const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];
/** Tinta di atas tombol limau (brief §3.2: on-highlight #0F2620) */
const HL_INK: Rgb = [15, 38, 32];
const toHex = (rgb: Rgb) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
const mix = (a: Rgb, b: Rgb, amountOfA: number): Rgb => a.map((c, i) => c * amountOfA + b[i] * (1 - amountOfA)) as Rgb;

/**
 * Variabel warna lokal Finova (di samping --tpl-accent* milik Shell):
 * --fin-top / --fin-deep: gradasi panel gelap (hero, CTA), diturunkan dari warna utama dan digelapkan sampai teks
 *   putih ≥ 11:1, jadi pembeli dengan warna utama terang tetap mendapat panel gelap yang terbaca;
 * --fin-hl / --fin-on-hl: warna tombol (limau) + teks di atasnya (tinta bila lebih kontras, selain itu putih); warna
 *   tombol yang terlalu gelap untuk panel diterangkan sampai ≥ 3:1 terhadap panel;
 * --fin-hl-ink: warna tombol yang digelapkan sampai ≥ 4,5:1 di putih (ikon/teks kecil di latar terang);
 * --fin-mint: tint lembut warna utama untuk mockup kartu.
 */
export function finovaVars(accentRaw: string, highlightRaw: string): CSSProperties {
  const accent = parseHex(accentRaw) ?? (parseHex(FINOVA_ACCENT) as Rgb);
  let deep = accent;
  for (let i = 0; i < 16 && contrast(deep, WHITE) < 11; i += 1) deep = mix(deep, BLACK, 0.85);
  const top = mix(accent, BLACK, 0.2);
  let hl = parseHex(highlightRaw) ?? (parseHex(FINOVA_HIGHLIGHT) as Rgb);
  for (let i = 0; i < 16 && contrast(hl, deep) < 3; i += 1) hl = mix(hl, WHITE, 0.8);
  const onHl = contrast(hl, HL_INK) >= contrast(hl, WHITE) ? HL_INK : WHITE;
  let hlInk = hl;
  for (let i = 0; i < 16 && contrast(hlInk, WHITE) < 4.5; i += 1) hlInk = mix(hlInk, BLACK, 0.85);
  return {
    '--fin-top': toHex(top),
    '--fin-deep': toHex(deep),
    '--fin-hl': toHex(hl),
    '--fin-on-hl': toHex(onHl),
    '--fin-hl-ink': toHex(hlInk),
    '--fin-mint': toHex(mix(accent, WHITE, 0.2)),
  } as CSSProperties;
}

// ─── Angka bersuperskrip ──────────────────────────────────────────────────────

export interface StatParts {
  /** Teks angka (dengan awalan, mis. "Rp") yang dihitung naik oleh <CountUp> */
  number: string;
  /** Satuan kecil di superskrip (mis. "jt+", "+", "%"), "" bila tidak ada */
  unit: string;
}

/**
 * "2,4 jt+" → { number: "2,4", unit: "jt+" }; "120+" → { "120", "+" }; "4,8" → { "4,8", "" }. Teks yang bukan satu
 * angka ("24/7", "4,8/5") → { number: teks utuh, unit: "" } dan ditampilkan apa adanya.
 */
export function splitStat(raw: string): StatParts {
  const value = (raw || '').trim();
  const parts = parseCount(value);
  if (!parts) return { number: value, unit: '' };
  return { number: formatCount({ ...parts, suffix: '' }, parts.value), unit: parts.suffix.trim() };
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

export interface FinovaNavItem {
  key: string;
  label: string;
}

/** Urutan menu = urutan halaman. Beranda selalu ada (item aktif saat panel hero terlihat). */
const NAV: { key: string; label: string; listKey?: string; textKey?: string }[] = [
  { key: 'hero', label: 'Beranda' },
  { key: 'about', label: 'Produk', textKey: 'title' },
  { key: 'services', label: 'Fitur', listKey: 'items' },
  { key: 'testimonials', label: 'Testimoni', listKey: 'items' },
  { key: 'faq', label: 'FAQ', listKey: 'items' },
  { key: 'contact', label: 'Kontak' },
];

/** Label menu dari chip section bila singkat (≤ 14 huruf, ≤ 2 kata); selain itu label bawaan. */
const shortLabel = (section: SectionContent, fallback: string) => {
  const eyebrow = text(section, 'eyebrow');
  return eyebrow && eyebrow.length <= 14 && eyebrow.split(/\s+/).length <= 2 ? eyebrow : fallback;
};

export function navItems(content: SiteContent): FinovaNavItem[] {
  return NAV.filter(({ key, listKey, textKey }) => {
    const section = getSection(content, key);
    if (!isEnabled(section)) return false;
    if (listKey) return list(section, listKey).length > 0;
    if (textKey) return !!text(section, textKey);
    return true;
  }).map(({ key, label }) => ({ key, label: key === 'hero' || key === 'contact' ? label : shortLabel(getSection(content, key), label) }));
}

// ─── Tautan ───────────────────────────────────────────────────────────────────

export interface SocialLink {
  key: string;
  label: string;
  href: string;
}

export const socialLinks = (footer: SectionContent): SocialLink[] =>
  SOCIAL_FIELDS.map(({ key, label }) => ({ key, label, href: safeUrl(text(footer, key)) ?? '' })).filter((s) => s.href);

export interface LinkGroup {
  title: string;
  links: { label: string; action: LinkAction | null }[];
}

/** Tautan footer dikelompokkan per `group` (urutan kemunculan pertama); tanpa judul → "Tautan". Maks. 4 kolom. */
export function linkGroups(items: ListItem[], fallback: LinkAction | null): LinkGroup[] {
  const groups = new Map<string, LinkGroup>();
  for (const item of items) {
    const label = field(item, 'label');
    if (!label) continue;
    const title = field(item, 'group') || 'Tautan';
    const group = groups.get(title.toLowerCase()) ?? { title, links: [] };
    group.links.push({ label, action: resolveAction(field(item, 'url'), fallback) });
    groups.set(title.toLowerCase(), group);
  }
  return Array.from(groups.values()).slice(0, 4);
}

// ─── Bento fitur ──────────────────────────────────────────────────────────────

export type BentoKind = 'half' | 'wide' | 'full' | 'side';

/**
 * Ukuran kartu bento per jumlah fitur (grid 12 kolom desktop): 1 → penuh; 2 → 6/6; 3 → 6/6 + lebar 12;
 * 4 → 6/6 + lebar 8 + samping 4. Kartu "wide"/"full" kedua dari tiga+ fitur menampilkan peta + kartu angka.
 */
export function bentoLayout(count: number): BentoKind[] {
  if (count <= 0) return [];
  if (count === 1) return ['full'];
  if (count === 2) return ['half', 'half'];
  if (count === 3) return ['half', 'half', 'full'];
  return ['half', 'half', 'wide', 'side'];
}

// ─── Model ────────────────────────────────────────────────────────────────────

export function readFinova(content: SiteContent) {
  const brand = getSection(content, 'brand');
  const hero = getSection(content, 'hero');
  const clients = getSection(content, 'clients');
  const advantages = getSection(content, 'advantages');
  const about = getSection(content, 'about');
  const services = getSection(content, 'services');
  const testimonials = getSection(content, 'testimonials');
  const faq = getSection(content, 'faq');
  const cta = getSection(content, 'cta');
  const contact = getSection(content, 'contact');
  const footer = getSection(content, 'footer');

  const companyName = text(brand, 'company_name') || 'Nama Usaha';
  const whatsapp = text(contact, 'whatsapp');
  const waLink = whatsappHref(whatsapp, text(contact, 'whatsapp_message'));
  const waAction: LinkAction | null = waLink ? { kind: 'external', href: waLink } : null;
  const contactAction: LinkAction | null = isEnabled(contact) ? { kind: 'section', target: 'contact' } : null;
  /** Tujuan "mulai/hubungi": WhatsApp bila ada nomor, kalau tidak section Kontak, kalau tidak null (tombol disembunyikan). */
  const startAction: LinkAction | null = waAction ?? contactAction;
  const servicesShown = isEnabled(services) && list(services, 'items').length > 0;
  const featuresAction: LinkAction | null = servicesShown ? { kind: 'section', target: 'services' } : null;

  const store = (key: 'app_store' | 'play_store', fallbackLabel: string) => {
    const href = safeUrl(text(cta, `${key}_url`));
    return href && /^https?:/i.test(href) ? { key, label: text(cta, `${key}_label`) || fallbackLabel, action: { kind: 'external', href } as LinkAction } : null;
  };

  return {
    brand,
    hero,
    clients,
    advantages,
    about,
    services,
    testimonials,
    faq,
    cta,
    contact,
    footer,
    companyName,
    tagline: text(brand, 'tagline'),
    logo: text(brand, 'logo'),
    colors: finovaVars(text(brand, 'accent_color'), text(brand, 'highlight_color')),
    whatsapp,
    waAction,
    contactAction,
    startAction,
    featuresAction,
    /** Tombol menu atas = tombol utama hero */
    headerLabel: text(hero, 'primary_label'),
    headerAction: resolveAction(text(hero, 'primary_url'), startAction),
    nav: navItems(content),
    socials: socialLinks(footer),
    stores: [store('app_store', 'App Store'), store('play_store', 'Google Play')].filter((s) => s !== null),
    /** Foto pengguna (testimoni) untuk avatar bertumpuk di bukti sosial hero, maks. 4 */
    proofPeople: list(testimonials, 'items', 12)
      .filter((item) => safeImage(field(item, 'photo')))
      .slice(0, 4)
      .map((item) => ({ name: field(item, 'name'), photo: field(item, 'photo') })),
    year: new Date().getFullYear(),
  };
}

export type FinovaModel = ReturnType<typeof readFinova>;
