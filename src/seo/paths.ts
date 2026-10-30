// Alamat halaman publik host utama (docs/platform/SEO-PLAN.md §2, §5.8) untuk tautan internal, sitemap, dan *.seo.ts.
// Tulis tautan lewat konstanta ini, jangan string lepas, supaya satu URL tidak punya dua ejaan.
// Modul murni (tanpa React), aman diimpor dari skrip Node, prerender, dan *.seo.ts.
import { LEGAL_PATHS } from '../lib/legal';

/** Origin kanonis: https, tanpa www, tanpa garis miring di akhir. */
export const SITE_ORIGIN = 'https://garudanexa.com';

/** Halaman hub (diindeks setelah isinya jadi). */
export const HUB_PATHS = {
  home: '/',
  catalog: '/template',
  webService: '/jasa-pembuatan-website',
  mobileService: '/jasa-pembuatan-aplikasi-mobile',
  pricing: '/harga',
  about: '/tentang',
  contact: '/kontak',
  guides: '/panduan',
  customOrder: '/pesan-custom',
} as const;

export type HubKey = keyof typeof HUB_PATHS;

/**
 * Slug halaman kategori /template/kategori/{slug}. Nama kategori di DB dipetakan ke slug ini oleh
 * src/content/categories.ts (WP5). "kategori" sendiri tidak boleh menjadi slug template (ditolak kedua backend).
 */
export const CATEGORY_SLUGS = [
  'company-profile',
  'kecantikan-klinik',
  'olahraga-komunitas',
  'fintech-startup',
  'yoga-wellness',
  'toko-online',
  'sekolah-pendidikan',
  'kesehatan-rumah-sakit',
  'properti-real-estate',
  'travel-transportasi',
] as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export const isCategorySlug = (value: string): value is CategorySlug => (CATEGORY_SLUGS as readonly string[]).includes(value);

/**
 * Slug 4 artikel panduan pertama (rencana §5.8), yang ditautkan dari halaman lain. Artikelnya dikelola admin
 * (database); tautkan hanya artikel yang sudah terbit (guideLink dengan daftar dari useGuides()).
 */
export const ARTICLE_SLUGS = {
  websiteCost: 'biaya-website-company-profile',
  templateVsCustom: 'template-vs-jasa-website-custom',
  appCost: 'biaya-aplikasi-android-ios',
  beautyClinicWebsite: 'website-klinik-kecantikan',
} as const;

export type PlannedArticleSlug = (typeof ARTICLE_SLUGS)[keyof typeof ARTICLE_SLUGS];

export const PLANNED_ARTICLE_SLUGS: readonly PlannedArticleSlug[] = Object.values(ARTICLE_SLUGS);

/** Prefix rute yang dibagi beberapa halaman. */
export const CATEGORY_PREFIX = '/template/kategori/';
export const TEMPLATE_PREFIX = '/template/';
export const GUIDE_PREFIX = '/panduan/';

export const templatePath = (slug: string) => `${TEMPLATE_PREFIX}${slug}`;
export const categoryPath = (slug: CategorySlug) => `${CATEGORY_PREFIX}${slug}`;
export const articlePath = (slug: string) => `${GUIDE_PREFIX}${slug}`;
export const demoPath = (slug: string) => `/demo/${slug}`;
export const orderPath = (slug: string) => `/pesan/${slug}`;

export { LEGAL_PATHS };

/** URL absolut kanonis dari path situs ("/harga" → "https://garudanexa.com/harga"). */
export const absoluteUrl = (path: string) => (path === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}`);

/** "/harga/?utm_source=x#a" → "/harga"; "" → "/". Path kanonis: diawali "/", tanpa query/hash/garis miring di akhir. */
export function normalizePathname(pathname: string): string {
  const path = pathname.split(/[?#]/, 1)[0] || '/';
  const withSlash = path.startsWith('/') ? path : `/${path}`;
  return withSlash.replace(/\/{2,}/g, '/').replace(/(.)\/+$/, '$1');
}

/** URL kanonis (absolut, apex, tanpa query dan garis miring di akhir) untuk path apa pun. */
export const canonicalUrl = (pathname: string) => absoluteUrl(normalizePathname(pathname));

/**
 * Rute aplikasi (akun, checkout, login, admin, pratinjau situs): selalu noindex,follow (rencana §2) dan kepalanya tidak
 * bergantung pada data. `/pesan-custom` BUKAN rute aplikasi.
 */
const APP_PATH = /^\/(?:akun|admin|masuk|daftar|login|auth)(?:\/.*)?$|^\/(?:pesan|situs)\/[^/]+(?:\/.*)?$/;

export const isAppPath = (pathname: string): boolean => APP_PATH.test(normalizePathname(pathname));
