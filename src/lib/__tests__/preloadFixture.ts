// Data uji prerender/hidrasi (WP2): respons API mentah seperti yang diambil scripts/prerender.mjs dari get_settings,
// get_navbar_menus, get_templates, get_public_projects dan get_template per slug. Isinya disingkat dari DB lokal.
import type { Template } from '../../types/platform';
import { PRELOAD_URLS, type PreloadData } from '../preload';

const template = (t: Partial<Template> & Pick<Template, 'id' | 'slug' | 'name' | 'category' | 'price'>): Template => ({
  short_description: `${t.name} untuk bisnis yang ingin cepat online.`,
  description: `${t.name} siap dipakai. Semua teks, foto, dan warna bisa diubah sendiri lewat CMS tanpa coding.`,
  features: ['Desain responsif untuk HP, tablet, dan desktop', 'Kelola teks, foto, dan warna sendiri lewat CMS'],
  preview_image: `/assets/templates/${t.slug}-preview.webp`,
  gallery: [`/assets/templates/${t.slug}-1.webp`],
  template_code: t.slug,
  demo_url: null,
  status: 'published',
  sort_order: t.id,
  created_at: '2026-10-20 00:06:11',
  updated_at: '2026-10-22 23:44:30',
  ...t,
});

export const FIXTURE_TEMPLATES: Template[] = [
  template({ id: 1, slug: 'corporate-nexa', name: 'Corporate Nexa', category: 'Company Profile', price: 1500000 }),
  template({ id: 2, slug: 'startup-clean', name: 'Startup Clean', category: 'Company Profile', price: 990000 }),
  template({ id: 14, slug: 'arena-club', name: 'Arena Club', category: 'Olahraga & Komunitas', price: 1290000 }),
  template({ id: 15, slug: 'aura-studio', name: 'Aura Studio', category: 'Kecantikan & Klinik', price: 1390000 }),
  template({ id: 16, slug: 'finova', name: 'Finova', category: 'Fintech & Startup', price: 1790000 }),
];

export const FIXTURE_SETTINGS = {
  contact_email: 'info@garudanexa.com',
  footer_whatsapp: '6285188009152',
  footer_copyright: '© 2026 PT. Garuda Nexa Bahtera. Semua hak dilindungi.',
  disabled_sections: '["pricing"]',
  hero_bg_mode: 'image',
  hero_images: JSON.stringify(['/assets/bg/hero-uji-1.jpg', '/assets/bg/hero-uji-2.jpg']),
  faq_data: JSON.stringify([
    { question: 'Apakah website bisa saya edit sendiri?', answer: 'Bisa, lewat CMS tanpa coding.' },
  ]),
};

/** Semua respons API (seperti prerender-data.json), per URL request. */
export const FIXTURE_API: Record<string, unknown> = {
  [PRELOAD_URLS.settings]: FIXTURE_SETTINGS,
  [PRELOAD_URLS.navbar]: [],
  [PRELOAD_URLS.templates]: {
    success: true,
    templates: FIXTURE_TEMPLATES,
    categories: ['Company Profile', 'Olahraga & Komunitas', 'Kecantikan & Klinik', 'Fintech & Startup'],
  },
  [PRELOAD_URLS.projects]: { success: true, projects: [] },
  ...Object.fromEntries(FIXTURE_TEMPLATES.map((t) => [PRELOAD_URLS.template(t.slug), { success: true, template: t }])),
};

export const FIXTURE_BUILT_AT = '2026-10-23T03:00:00.000Z';

/** Data preload satu halaman (subset seperti apiFor() di scripts/prerender.mjs). */
export function fixturePreload(path: string): PreloadData {
  const urls = [PRELOAD_URLS.settings, PRELOAD_URLS.navbar, PRELOAD_URLS.templates];
  if (path === '/') urls.push(PRELOAD_URLS.projects);
  const slug = /^\/template\/([a-z0-9-]+)$/.exec(path)?.[1];
  if (slug && FIXTURE_API[PRELOAD_URLS.template(slug)]) urls.push(PRELOAD_URLS.template(slug));
  // 404.html dirender di /404 dengan path null (lihat scripts/prerender.mjs)
  return { path: path === '/404' ? null : path, builtAt: FIXTURE_BUILT_AT, api: Object.fromEntries(urls.map((url) => [url, FIXTURE_API[url]])) };
}

/** fetch palsu yang menjawab dari FIXTURE_API (effect penyegar data setelah hidrasi). */
export function fixtureFetch(input: RequestInfo | URL): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname + input.search : input.url;
  const path = url.replace(/^https?:\/\/[^/]+/, '');
  const body = FIXTURE_API[path];
  return Promise.resolve(
    body === undefined
      ? new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      : new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }),
  );
}
