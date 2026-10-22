// Turunan konten yang sama untuk semua template Company Profile (section, aksi kontak, menu).
import type { SectionContent, SiteContent } from '../types';
import { field, getSection, isEnabled, list, safeImage, text, whatsappHref, type LinkAction } from './utils';

/** Item strip logo klien (section `clients`, list `items` { name, logo }); item tanpa nama & logo dibuang. */
export function clientItems(section: SectionContent | null | undefined, max = 12): { name: string; logo: string }[] {
  return list(section, 'items', max)
    .map((item) => ({ name: field(item, 'name'), logo: field(item, 'logo') }))
    .filter((item) => item.name || safeImage(item.logo));
}

export interface NavItem {
  key: string;
  label: string;
}

const NAV_LABELS: [string, string][] = [
  ['about', 'Tentang'],
  ['services', 'Layanan'],
  ['advantages', 'Keunggulan'],
  ['gallery', 'Galeri'],
  ['testimonials', 'Testimoni'],
  ['contact', 'Kontak'],
];

/** Menu header dari section yang aktif dan berisi. `servicesLabel` menimpa label "Layanan" (mis. "Fitur"). */
export function navItems(content: SiteContent, servicesLabel = 'Layanan'): NavItem[] {
  const hasList = (key: string, listKey: string) => list(getSection(content, key), listKey).length > 0;
  const filled: Record<string, boolean> = {
    about: !!(text(getSection(content, 'about'), 'title') || text(getSection(content, 'about'), 'body')),
    services: hasList('services', 'items'),
    advantages: hasList('advantages', 'items') || hasList('advantages', 'stats'),
    gallery: hasList('gallery', 'items'),
    testimonials: hasList('testimonials', 'items'),
    contact: true,
  };
  return NAV_LABELS.filter(([key]) => isEnabled(getSection(content, key)) && filled[key]).map(([key, label]) => ({
    key,
    label: key === 'services' ? servicesLabel : label,
  }));
}

export function readCompanyProfile(content: SiteContent, servicesLabel = 'Layanan') {
  const brand = getSection(content, 'brand');
  const hero = getSection(content, 'hero');
  const clients = getSection(content, 'clients');
  const about = getSection(content, 'about');
  const services = getSection(content, 'services');
  const advantages = getSection(content, 'advantages');
  const gallery = getSection(content, 'gallery');
  const testimonials = getSection(content, 'testimonials');
  const cta = getSection(content, 'cta');
  const contact = getSection(content, 'contact');
  const footer = getSection(content, 'footer');

  const companyName = text(brand, 'company_name') || 'Nama Perusahaan';
  const waLink = whatsappHref(text(contact, 'whatsapp'), text(contact, 'whatsapp_message'));

  /** Tujuan tombol "Hubungi": section Kontak bila tampil, kalau tidak WhatsApp, kalau tidak ada → null (tombol disembunyikan). */
  const contactAction: LinkAction | null = isEnabled(contact)
    ? { kind: 'section', target: 'contact' }
    : waLink
      ? { kind: 'external', href: waLink }
      : null;
  const servicesAction: LinkAction | null =
    isEnabled(services) && list(services, 'items').length > 0 ? { kind: 'section', target: 'services' } : null;
  const waAction: LinkAction | null = waLink ? { kind: 'external', href: waLink } : null;

  // Label menu untuk section layanan mengikuti label kecilnya bila singkat (mis. "Fitur", "Menu", "Produk")
  const servicesEyebrow = text(services, 'eyebrow');
  const servicesNav =
    servicesEyebrow && servicesEyebrow.length <= 14 && servicesEyebrow.split(/\s+/).length <= 2 ? servicesEyebrow : servicesLabel;

  return {
    brand,
    hero,
    /** Section strip logo (opsional, template yang memakai skema `clients`) */
    clients,
    about,
    services,
    advantages,
    gallery,
    testimonials,
    cta,
    contact,
    footer,
    companyName,
    tagline: text(brand, 'tagline'),
    logo: text(brand, 'logo'),
    waLink,
    contactAction,
    servicesAction,
    waAction,
    nav: navItems(content, servicesNav),
    year: new Date().getFullYear(),
  };
}

export type CompanyProfileModel = ReturnType<typeof readCompanyProfile>;
