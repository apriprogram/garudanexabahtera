// Turunan konten Aura Studio (murni, tanpa React): section, aksi reservasi/WhatsApp, menu, kategori perawatan,
// pilihan daftar hero, dan susunan bento. Semua pembacaan tahan konten mentah/aneh (getSection/text/list/field).
import { field, getSection, hasImage, isEnabled, list, resolveAction, safeUrl, text, whatsappHref, type LinkAction } from '../shared/utils';
import type { ListItem, SiteContent } from '../types';

export interface Treatment {
  /** Indeks asli di list `services.items` (kunci stabil) */
  index: number;
  title: string;
  description: string;
  image: string;
  category: string;
  count: string;
  price: string;
}

export interface NavLink {
  key: string;
  label: string;
}

/** Item perawatan yang punya isi (judul atau foto); field dirapikan. */
export function treatmentsOf(items: ListItem[]): Treatment[] {
  return items
    .map((item, index) => ({
      index,
      title: field(item, 'title'),
      description: field(item, 'description'),
      image: field(item, 'image'),
      category: field(item, 'category'),
      count: field(item, 'count'),
      price: field(item, 'price'),
    }))
    .filter((t) => t.title || t.image);
}

/** Kategori unik sesuai urutan kemunculan (pembanding tanpa beda huruf besar/kecil & spasi). */
export function categoriesOf(treatments: Treatment[]): string[] {
  const seen = new Map<string, string>();
  for (const t of treatments) {
    const key = categoryKey(t.category);
    if (key && !seen.has(key)) seen.set(key, t.category);
  }
  return Array.from(seen.values());
}

export const categoryKey = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Perawatan untuk satu tab. Item tanpa kategori ikut tampil di tab pertama agar tidak hilang.
 * Tanpa kategori sama sekali (`category` null) → semua item.
 */
export function treatmentsIn(treatments: Treatment[], categories: string[], category: string | null): Treatment[] {
  if (!category || categories.length === 0) return treatments;
  const key = categoryKey(category);
  const first = categoryKey(categories[0]) === key;
  return treatments.filter((t) => {
    const own = categoryKey(t.category);
    return own === key || (first && !own);
  });
}

/**
 * Daftar singkat di hero (maks. `max`): bergiliran satu perawatan dari tiap kategori (Wajah, Kuku, Wajah, …) agar
 * semua jenis layanan terwakili; tanpa kategori → urutan biasa.
 */
export function heroPicks(treatments: Treatment[], max = 3): Treatment[] {
  const withTitle = treatments.filter((t) => t.title);
  const categories = categoriesOf(withTitle);
  if (categories.length <= 1) return withTitle.slice(0, max);
  const groups = categories.map((c) => withTitle.filter((t) => categoryKey(t.category) === categoryKey(c)));
  const loose = withTitle.filter((t) => !categoryKey(t.category));
  const picks: Treatment[] = [];
  for (let round = 0; picks.length < max; round += 1) {
    let added = false;
    for (const group of groups) {
      if (picks.length >= max) break;
      if (group[round]) {
        picks.push(group[round]);
        added = true;
      }
    }
    if (!added) break;
  }
  for (const t of loose) if (picks.length < max) picks.push(t);
  return picks;
}

export type BentoSlot = 'tall' | 'wide' | 'tallWide' | 'half' | 'third' | 'full';

/**
 * Susunan bento 12 kolom (desktop) untuk `count` ubin (termasuk kartu "lebih banyak"):
 * 2 ubin tinggi + 2 ubin lebar (seperti referensi), sisanya baris bertiga; baris terakhir yang tidak penuh melebar.
 *   1 → full · 2 → half, half · 3 → tall, tall, tallWide · ≥4 → tall, tall, wide, wide, third…
 */
export function bentoSlots(count: number): BentoSlot[] {
  if (count <= 0) return [];
  if (count === 1) return ['full'];
  if (count === 2) return ['half', 'half'];
  if (count === 3) return ['tall', 'tall', 'tallWide'];
  const slots: BentoSlot[] = ['tall', 'tall', 'wide', 'wide'];
  const rest = count - 4;
  const fullRows = Math.floor(rest / 3);
  for (let i = 0; i < fullRows * 3; i += 1) slots.push('third');
  const left = rest % 3;
  if (left === 1) slots.push('full');
  if (left === 2) slots.push('half', 'half');
  return slots;
}

/** Lebar kolom desktop (12 kolom) tiap slot; dipakai uji "setiap baris penuh". */
export const SLOT_SPAN: Record<BentoSlot, { cols: number; rows: number }> = {
  tall: { cols: 3, rows: 2 },
  wide: { cols: 6, rows: 1 },
  tallWide: { cols: 6, rows: 2 },
  half: { cols: 6, rows: 1 },
  third: { cols: 4, rows: 1 },
  full: { cols: 12, rows: 1 },
};

/**
 * Kelas grid ubin ke-`index`. HP (2 kolom): ubin tinggi = 1 kolom × 2 baris; ubin lebar/penuh = selebar baris; ubin kecil
 * (half/third) berpasangan, dan ubin kecil terakhir yang sendirian (jumlahnya ganjil) selebar baris.
 * Desktop (@4xl, 12 kolom): lihat SLOT_SPAN.
 */
export function bentoClass(slots: BentoSlot[], index: number): string {
  const slot = slots[index];
  const desktop: Record<BentoSlot, string> = {
    tall: '@4xl:col-span-3 @4xl:row-span-2',
    wide: '@4xl:col-span-6 @4xl:row-span-1',
    tallWide: '@4xl:col-span-6 @4xl:row-span-2',
    half: '@4xl:col-span-6 @4xl:row-span-1',
    third: '@4xl:col-span-4 @4xl:row-span-1',
    full: '@4xl:col-span-12 @4xl:row-span-1',
  };
  if (!slot) return '';
  let phone = 'col-span-1 row-span-1';
  if (slot === 'tall') phone = 'col-span-1 row-span-2';
  else if (slot === 'wide' || slot === 'tallWide' || slot === 'full') phone = 'col-span-2 row-span-1';
  else {
    const small = slots.flatMap((s, i) => (s === 'half' || s === 'third' ? [i] : []));
    if (small.length % 2 === 1 && small[small.length - 1] === index) phone = 'col-span-2 row-span-1';
  }
  return `${phone} ${desktop[slot]}`;
}

/** Menu utama sesuai urutan halaman (section aktif dan berisi). */
export function navLinks(content: SiteContent): NavLink[] {
  const sec = (key: string) => getSection(content, key);
  // Sama dengan syarat tampil tiap section (item kosong/tanpa foto tidak dihitung)
  const some = (key: string, listKey: string, ok: (item: ListItem) => boolean) => list(sec(key), listKey).some(ok);
  const candidates: [string, string, boolean][] = [
    ['services', 'Layanan', treatmentsOf(list(sec('services'), 'items', 12)).length > 0],
    ['featured', 'Unggulan', !!(text(sec('featured'), 'title') || text(sec('featured'), 'body'))],
    ['about', 'Tentang', !!(text(sec('about'), 'title') || text(sec('about'), 'body'))],
    ['gallery', 'Galeri', some('gallery', 'items', (item) => hasImage(field(item, 'image')))],
    ['testimonials', 'Testimoni', some('testimonials', 'items', (item) => !!field(item, 'quote'))],
    ['team', 'Tim', some('team', 'items', (item) => !!field(item, 'name') || hasImage(field(item, 'photo')))],
    ['contact', 'Kontak', true],
  ];
  return candidates.filter(([key, , filled]) => filled && isEnabled(sec(key))).map(([key, label]) => ({ key, label }));
}

export interface SocialLink {
  key: string;
  label: string;
  href: string;
}

const SOCIAL_KEYS: [string, string][] = [
  ['instagram', 'Instagram'],
  ['tiktok', 'TikTok'],
  ['facebook', 'Facebook'],
  ['youtube', 'YouTube'],
  ['linkedin', 'LinkedIn'],
];

/** Tautan sosial footer yang valid (safeUrl), sesuai urutan tampil. */
export function socialLinks(footer: ReturnType<typeof getSection>): SocialLink[] {
  return SOCIAL_KEYS.flatMap(([key, label]) => {
    const href = safeUrl(text(footer, key));
    return href ? [{ key, label, href }] : [];
  });
}

export function readAura(content: SiteContent) {
  const sec = (key: string) => getSection(content, key);
  const brand = sec('brand');
  const contact = sec('contact');
  const footer = sec('footer');
  const hero = sec('hero');
  const services = sec('services');
  const companyName = text(brand, 'company_name') || 'Nama Studio';
  const waLink = whatsappHref(text(contact, 'whatsapp'), text(contact, 'whatsapp_message'));
  const waAction: LinkAction | null = waLink ? { kind: 'external', href: waLink } : null;
  const contactAction: LinkAction | null = isEnabled(contact) ? { kind: 'section', target: 'contact' } : null;
  const treatments = treatmentsOf(list(services, 'items', 12));
  const servicesOn = isEnabled(services) && treatments.length > 0;
  const servicesAction: LinkAction | null = servicesOn ? { kind: 'section', target: 'services' } : null;
  /** Reservasi: tautan tombol hero → WhatsApp → Kontak */
  const reserveAction = resolveAction(text(hero, 'primary_url'), waAction ?? contactAction);
  const socials = socialLinks(footer);

  /** Reservasi satu perawatan: WhatsApp dengan nama perawatan → Kontak */
  const treatmentAction = (title: string): LinkAction | null => {
    const number = text(contact, 'whatsapp');
    const message = title ? `Halo ${companyName}, saya ingin reservasi ${title}.` : text(contact, 'whatsapp_message');
    const href = whatsappHref(number, message);
    return href ? { kind: 'external', href } : contactAction;
  };

  return {
    brand,
    hero,
    advantages: sec('advantages'),
    services,
    featured: sec('featured'),
    about: sec('about'),
    clients: sec('clients'),
    gallery: sec('gallery'),
    testimonials: sec('testimonials'),
    team: sec('team'),
    cta: sec('cta'),
    contact,
    footer,
    companyName,
    tagline: text(brand, 'tagline'),
    logo: text(brand, 'logo'),
    waLink,
    waAction,
    contactAction,
    reserveAction,
    reserveLabel: text(hero, 'primary_label') || 'Reservasi',
    servicesAction,
    servicesOn,
    treatments,
    categories: categoriesOf(treatments),
    treatmentAction,
    socials,
    instagram: socials.find((s) => s.key === 'instagram') ?? null,
    nav: navLinks(content),
    year: new Date().getFullYear(),
  };
}

export type AuraModel = ReturnType<typeof readAura>;
