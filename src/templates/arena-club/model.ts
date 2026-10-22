// Turunan konten Arena Club (fungsi murni, diuji di __tests__/arena-club.test.tsx): menu, aksi tombol, paket
// unggulan, baris titik level, tanggal acara. Semua tahan konten mentah (null, angka, list rusak).
import type { ListItem, SectionContent, SiteContent } from '../types';
import { SOCIAL_FIELDS } from '../shared/social';
import { field, getSection, isEnabled, list, paragraphs, resolveAction, safeImage, safeUrl, text, whatsappHref, type LinkAction } from '../shared/utils';

export interface ArenaNavItem {
  key: string;
  label: string;
}

/** Urutan menu = urutan halaman. `desktop: false` → hanya di menu HP & footer (grup pil desktop tetap ringkas). */
const NAV: { key: string; label: string; desktop: boolean }[] = [
  { key: 'about', label: 'Tentang', desktop: true },
  { key: 'services', label: 'Program', desktop: true },
  { key: 'pricing', label: 'Membership', desktop: true },
  { key: 'team', label: 'Pelatih', desktop: true },
  { key: 'events', label: 'Acara', desktop: true },
  { key: 'gallery', label: 'Galeri', desktop: false },
  { key: 'contact', label: 'Kontak', desktop: true },
];

/** Label menu pendek dari label pil section (mis. "Program", "Kelas") bila singkat; selain itu label bawaan. */
const shortLabel = (section: SectionContent, fallback: string) => {
  const eyebrow = text(section, 'eyebrow');
  return eyebrow && eyebrow.length <= 14 && eyebrow.split(/\s+/).length <= 2 ? eyebrow : fallback;
};

export function navItems(content: SiteContent, scope: 'all' | 'desktop' = 'all'): ArenaNavItem[] {
  const has = (key: string, listKey: string) => list(getSection(content, key), listKey).length > 0;
  const about = getSection(content, 'about');
  const filled: Record<string, boolean> = {
    about: !!(text(about, 'title') || text(about, 'body')),
    services: has('services', 'items'),
    pricing: has('pricing', 'items'),
    team: has('team', 'items'),
    events: has('events', 'items'),
    gallery: has('gallery', 'items'),
    contact: true,
  };
  return NAV.filter((item) => (scope === 'all' || item.desktop) && filled[item.key] && isEnabled(getSection(content, item.key))).map(
    (item) => ({ key: item.key, label: item.key === 'services' ? shortLabel(getSection(content, 'services'), item.label) : item.label }),
  );
}

export interface SocialLink {
  key: string;
  label: string;
  href: string;
}

/** Tautan sosial footer yang valid (urutan SOCIAL_FIELDS). */
export function socialLinks(footer: SectionContent): SocialLink[] {
  return SOCIAL_FIELDS.map(({ key, label }) => ({ key, label, href: safeUrl(text(footer, key)) ?? '' })).filter((s) => s.href);
}

/** Pecah paket: unggulan = paket pertama berlabel `badge`, kalau tidak ada paket pertama; sisanya urut. */
export function splitPlans(items: ListItem[]): { featured: ListItem | null; others: ListItem[] } {
  if (items.length === 0) return { featured: null, others: [] };
  const index = Math.max(0, items.findIndex((item) => field(item, 'badge') !== ''));
  return { featured: items[index], others: items.filter((_, i) => i !== index) };
}

/** Benefit paket: satu baris = satu benefit (penanda "-", "•", "*" di depan dibuang), maks. 8. */
export const featureLines = (raw: string): string[] =>
  (raw || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-•*]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 8);

export interface LevelRow {
  label: string;
  value: string;
  /** Titik terisi (0–10), relatif terhadap angka terbesar */
  dots: number;
}

const toNumber = (raw: string): number => {
  const digits = (raw || '').replace(/[^\d,.]/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number.parseFloat(digits);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** Baris titik level: 10 titik per baris, panjang terisi = nilai / nilai terbesar (min. 1 bila nilainya > 0). */
export function levelRows(items: ListItem[], total = 10): LevelRow[] {
  const rows = items
    .map((item) => ({ label: field(item, 'label'), value: field(item, 'value'), n: toNumber(field(item, 'value')) }))
    .filter((row) => row.label || row.value);
  const max = Math.max(0, ...rows.map((row) => row.n));
  return rows.map(({ label, value, n }) => ({
    label,
    value,
    dots: max > 0 && n > 0 ? Math.min(total, Math.max(1, Math.round((n / max) * total))) : 0,
  }));
}

/** Tanggal acara: angka di depan ditulis besar ("14 Des 2026" → ["14", "Des 2026"]); bukan angka → [teks, ""]. */
export function splitDate(raw: string): [string, string] {
  const value = (raw || '').trim();
  const match = /^(\d{1,2})(?:[\s.\-/]+)(.+)$/.exec(value);
  return match ? [match[1], match[2].trim()] : [value, ''];
}

/** Kartu gelap "Tentang": paragraf pertama dipecah jadi kalimat pertama (terang) + sisanya (redup). */
export function leadSentence(body: string): { lead: string; rest: string; more: string[] } {
  const [first = '', ...more] = paragraphs(body);
  const match = /^(.+?[.!?])(\s+)(.+)$/s.exec(first);
  return match ? { lead: match[1], rest: match[3], more } : { lead: first, rest: '', more };
}

export function readArena(content: SiteContent) {
  const brand = getSection(content, 'brand');
  const hero = getSection(content, 'hero');
  const about = getSection(content, 'about');
  const advantages = getSection(content, 'advantages');
  const services = getSection(content, 'services');
  const pricing = getSection(content, 'pricing');
  const team = getSection(content, 'team');
  const events = getSection(content, 'events');
  const gallery = getSection(content, 'gallery');
  const testimonials = getSection(content, 'testimonials');
  const clients = getSection(content, 'clients');
  const cta = getSection(content, 'cta');
  const contact = getSection(content, 'contact');
  const footer = getSection(content, 'footer');

  const companyName = text(brand, 'company_name') || 'Nama Klub';
  const whatsapp = text(contact, 'whatsapp');
  const waLink = whatsappHref(whatsapp, text(contact, 'whatsapp_message'));
  const waAction: LinkAction | null = waLink ? { kind: 'external', href: waLink } : null;
  const contactAction: LinkAction | null = isEnabled(contact) ? { kind: 'section', target: 'contact' } : null;
  /** Tujuan "pesan/daftar": WhatsApp bila ada nomor, kalau tidak section Kontak, kalau tidak null (tombol disembunyikan). */
  const bookAction: LinkAction | null = waAction ?? contactAction;

  /** WhatsApp dengan pesan khusus (paket, program, acara); tanpa nomor → bookAction. */
  const askAction = (message: string): LinkAction | null => {
    const href = whatsappHref(whatsapp, message);
    return href ? { kind: 'external', href } : contactAction;
  };

  const sectionShown = (section: SectionContent, listKey: string) => isEnabled(section) && list(section, listKey).length > 0;
  const membershipAction: LinkAction | null = sectionShown(pricing, 'items')
    ? { kind: 'section', target: 'pricing' }
    : sectionShown(services, 'items')
      ? { kind: 'section', target: 'services' }
      : null;

  return {
    brand,
    hero,
    about,
    advantages,
    services,
    pricing,
    team,
    events,
    gallery,
    testimonials,
    clients,
    cta,
    contact,
    footer,
    companyName,
    tagline: text(brand, 'tagline'),
    logo: text(brand, 'logo'),
    whatsapp,
    waAction,
    contactAction,
    bookAction,
    askAction,
    membershipAction,
    headerLabel: text(brand, 'header_label'),
    headerAction: resolveAction(text(brand, 'header_url'), bookAction),
    nav: navItems(content),
    desktopNav: navItems(content, 'desktop'),
    socials: socialLinks(footer),
    /** Foto 3 pelatih pertama untuk bukti sosial di banner */
    proofPhotos: list(team, 'items', 8)
      .filter((item) => safeImage(field(item, 'photo')))
      .slice(0, 3)
      .map((item) => ({ name: field(item, 'name'), photo: field(item, 'photo') })),
    year: new Date().getFullYear(),
  };
}

export type ArenaModel = ReturnType<typeof readArena>;
