// Data uji SEO: 5 template terbit seperti get_templates (DB lokal 2026-10-23, deskripsi dipendekkan), settings, dan
// artikel panduan terbit seperti get_guides (data uji preload).
import { FIXTURE_GUIDES, guideSummary } from '../../lib/__tests__/preloadFixture';
import type { Template } from '../../types/platform';
import type { SeoData } from '../types';

const base = (t: Partial<Template> & Pick<Template, 'id' | 'slug' | 'name' | 'category' | 'price'>): Template => ({
  short_description: null,
  description: null,
  features: [],
  preview_image: `/assets/templates/${t.slug}-preview.webp`,
  gallery: [`/assets/templates/${t.slug}-1.webp`, `/assets/templates/${t.slug}-2.webp`],
  template_code: t.slug,
  demo_url: null,
  status: 'published',
  sort_order: t.id,
  created_at: '2026-10-20 00:06:11',
  updated_at: '2026-10-22 23:44:30',
  ...t,
});

export const TEMPLATES: Template[] = [
  base({
    id: 1,
    slug: 'corporate-nexa',
    name: 'Corporate Nexa',
    category: 'Company Profile',
    price: 1500000,
    short_description: 'Company profile elegan untuk perusahaan yang ingin tampil profesional dan terpercaya.',
    description: 'Corporate Nexa dirancang untuk perusahaan jasa, konsultan, kontraktor, dan distributor.',
    features: ['Desain responsif untuk HP, tablet, dan desktop', 'Ubah teks, gambar, dan warna sendiri lewat CMS'],
  }),
  base({
    id: 2,
    slug: 'startup-clean',
    name: 'Startup Clean',
    category: 'Company Profile',
    price: 990000,
    short_description: 'Company profile modern dan ringan untuk startup, UMKM, dan bisnis digital.',
    description: 'Startup Clean cocok untuk startup, UMKM, studio kreatif, dan bisnis digital.',
  }),
  base({
    id: 14,
    slug: 'arena-club',
    name: 'Arena Club',
    category: 'Olahraga & Komunitas',
    price: 1290000,
    sort_order: 3,
    updated_at: '2026-10-23 02:37:00',
    short_description: 'Website klub olahraga yang enerjik untuk lapangan padel, tenis, futsal, badminton, gym, dan akademi olahraga.',
    description: 'Arena Club dirancang untuk klub dan tempat olahraga.',
    features: ['Tombol pesan lapangan langsung ke WhatsApp'],
  }),
  base({
    id: 15,
    slug: 'aura-studio',
    name: 'Aura Studio',
    category: 'Kecantikan & Klinik',
    price: 1390000,
    sort_order: 4,
    updated_at: '2026-10-23 02:37:00',
    short_description:
      'Website elegan untuk klinik kecantikan, salon, nail art, spa, dan barbershop yang ingin tampil premium dan tepercaya.',
    description: 'Aura Studio menghadirkan tampilan lembut dan elegan untuk bisnis kecantikan.\n\nGaleri perawatan dan reservasi WhatsApp.',
    features: ['Tombol reservasi langsung ke WhatsApp'],
  }),
  base({
    id: 16,
    slug: 'finova',
    name: 'Finova',
    category: 'Fintech & Startup',
    price: 1790000,
    sort_order: 5,
    updated_at: '2026-10-23 02:37:00',
    short_description: 'Landing page modern untuk fintech, koperasi, aplikasi pembayaran, konsultan keuangan, dan produk SaaS.',
    description: 'Finova memberi kesan aman, modern, dan meyakinkan untuk produk keuangan.',
  }),
];

/** Settings seperti DB lokal: profil sosial masih "#" (= belum ada). */
export const SETTINGS: Record<string, unknown> = {
  footer_instagram: '#',
  footer_facebook: '#',
  footer_linkedin: '#',
  footer_tiktok: '#',
  footer_youtube: '#',
  footer_whatsapp: '6285188009152',
  disabled_sections: '["pricing"]',
};

export const seoData = (templates: Template[] = TEMPLATES, settings: Record<string, unknown> = SETTINGS): SeoData => ({
  settings,
  navbar: [],
  templates,
  projects: [],
  templateBySlug: Object.fromEntries(templates.map((t) => [t.slug, t])),
  guides: FIXTURE_GUIDES.map(guideSummary),
  builtAt: '2026-10-23T05:00:00.000Z',
});

export const DATA = seoData();
