// Berita & pengumuman situs pembeli (template sekolah) dan pengaturan SEO situs.
// Kontrak lengkap: docs/platform/SITE-POSTS-SEO-SPEC.md. Bentuk respons PHP (backend/modules/site_posts.php) dan
// Node (site_posts.js) harus sama persis dengan tipe di file ini.

export type SitePostKind = 'berita' | 'pengumuman';
export type SitePostStatus = 'draft' | 'published';
export type SiteIndexMode = 'auto' | 'index' | 'noindex';

export const SITE_POST_KINDS: readonly SitePostKind[] = ['berita', 'pengumuman'];

/** Jenis organisasi untuk JSON-LD (schema.org). '' = otomatis dari kategori template. */
export const SITE_SCHEMA_TYPES = [
  '',
  'Organization',
  'LocalBusiness',
  'School',
  'EducationalOrganization',
  'Preschool',
  'ElementarySchool',
  'MiddleSchool',
  'HighSchool',
  'CollegeOrUniversity',
] as const;
export type SiteSchemaType = (typeof SITE_SCHEMA_TYPES)[number];

/** Batas yang sama di kedua backend dan form akun. */
export const SITE_POST_LIMITS = {
  title: 160,
  slug: 120,
  excerpt: 300,
  body: 20000,
  category: 40,
  badge: 20,
  imageAlt: 200,
  linkUrl: 500,
  seoTitle: 70,
  seoDescription: 160,
  maxPostsPerSite: 500,
} as const;

export const SITE_SEO_LIMITS = {
  title: 70,
  description: 160,
  verification: 100,
} as const;

/** Ringkasan tulisan terbit (daftar di beranda situs & halaman /berita). */
export interface SitePostSummary {
  id: number;
  kind: SitePostKind;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  badge: string;
  /** Path /assets/sites/{id}/posts/… (PHP) atau URL S3 lengkap (Node); null = tanpa foto */
  image: string | null;
  image_alt: string;
  link_url: string;
  /** YYYY-MM-DD */
  published_at: string | null;
  /** ISO 8601 */
  updated_at: string;
}

/** Satu tulisan terbit lengkap (halaman /berita/{slug}). */
export interface SitePostPublic extends SitePostSummary {
  body: string;
  seo_title: string;
  seo_description: string;
  noindex: boolean;
}

/** Tulisan di panel akun pembeli (termasuk draf) dengan jumlah dilihat. */
export interface SitePostAdmin extends SitePostPublic {
  status: SitePostStatus;
  view_count: number;
  /** ISO 8601; null = belum pernah dilihat */
  last_viewed_at: string | null;
  created_at: string;
  /** URL publik lengkap (https://{domain}/berita/{slug}) */
  url: string;
}

/** Isi form simpan tulisan (customer_save_site_post). */
export interface SitePostInput {
  id?: number;
  kind: SitePostKind;
  title: string;
  /** Kosong = dibuat dari judul */
  slug?: string;
  excerpt?: string;
  body?: string;
  category?: string;
  badge?: string;
  /** data:image/… = unggah baru; path lama = tidak berubah; null/'' = hapus foto */
  image?: string | null;
  image_alt?: string;
  link_url?: string;
  status: SitePostStatus;
  /** YYYY-MM-DD; kosong saat terbit = hari ini (WIB) */
  published_at?: string | null;
  seo_title?: string;
  seo_description?: string;
  noindex?: boolean;
}

/** Pengaturan SEO situs (customer_get_site_seo / customer_save_site_seo). */
export interface SiteSeoSettings {
  title: string;
  description: string;
  og_image: string | null;
  google_verification: string;
  bing_verification: string;
  index_mode: SiteIndexMode;
  schema_type: SiteSchemaType;
  updated_at: string | null;
}

/** Alasan situs tidak tampil di Google (kode → teks di UI). */
export type SiteIndexReason = 'manual_noindex' | 'default_content' | 'suspended';

export interface SiteSeoStatus {
  indexable: boolean;
  reasons: SiteIndexReason[];
}

export interface SiteSeoResponse {
  seo: SiteSeoSettings;
  status: SiteSeoStatus;
  urls: { home: string; sitemap: string; robots: string };
}

/** SEO situs untuk pengunjung (get_site_seo): tanpa kode verifikasi. */
export interface SiteSeoPublic {
  title: string;
  description: string;
  og_image: string | null;
  schema_type: SiteSchemaType;
  /** Hasil akhir aturan index_mode (lihat spec §5) */
  indexable: boolean;
}
