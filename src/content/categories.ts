// Halaman kategori /template/kategori/{slug} (docs/platform/SEO-PLAN.md §2, §5.5 langkah 2, Lampiran A): pemetaan
// kolom `category` di DB ke 5 slug kategori, plus judul, meta, H1 dan nama di breadcrumb/menu.
//
// File ini kecil dan ikut bundel utama (modul *.seo.ts, Navbar, Footer, beranda). Isi panjang halaman kategori
// (intro, checklist "Apa yang perlu ada di website …" ≥ 300 kata, FAQ) ada di categories.content.ts, yang hanya dimuat
// chunk halaman kategori.
//
// Aturan index (rencana §2): kategori diindeks bila punya ≥ 2 template terbit, ATAU punya panduan ≥ 300 kata unik +
// FAQ (`hasGuide`, dicek tes categories.test.ts terhadap categories.content.ts) dan minimal 1 template. Kategori tanpa
// template selalu noindex,follow.
// Nama, harga dan jumlah template TIDAK ditulis di sini: semuanya dari data template (DB/API).
import type { Template } from '../types/platform';
import { formatPriceShort, isPrice } from '../seo/format';
import { CATEGORY_SLUGS, type CategorySlug, type PlannedArticleSlug } from '../seo/paths';
import { categorySlugOf } from '../seo/templateSeo';

export interface CategoryMeta {
  slug: CategorySlug;
  /** Nama pendek untuk breadcrumb, chip, menu dan footer (huruf kapital hanya di awal). */
  name: string;
  /** H1 (Lampiran A). */
  h1: string;
  /** <title> ≤ 60 karakter (Lampiran A). */
  title: string;
  /**
   * Meta description ≤ 155 karakter. Token {harga_min} = harga template termurah di kategori ini ("Rp990 rb");
   * bila tidak ada harga, `descriptionNoPrice` yang dipakai.
   */
  description: string;
  descriptionNoPrice: string;
  /** Niche dalam kalimat: "Apa yang perlu ada di website {niche}". */
  niche: string;
  /** Isi categories.content.ts punya panduan ≥ 300 kata + FAQ (dicek tes). */
  hasGuide: boolean;
  /** Artikel panduan niche, urut prioritas; yang pertama sudah terbit yang ditautkan (selain itu /panduan). */
  guides: readonly PlannedArticleSlug[];
}

/**
 * Tanggal terakhir isi halaman katalog /template (CatalogPage + catalogContent.ts) dan halaman kategori
 * (categories.content.ts) berubah. lastmod sitemap = tanggal ini atau tanggal template terbaru, mana yang lebih akhir.
 * Ubah setiap kali teksnya diubah.
 */
export const CATALOG_UPDATED = '2026-10-24';
export const CATEGORIES_UPDATED = '2026-10-25';

export const CATEGORIES: Readonly<Record<CategorySlug, CategoryMeta>> = {
  'company-profile': {
    slug: 'company-profile',
    name: 'Company profile',
    h1: 'Template website company profile',
    title: 'Template Website Company Profile Siap Pakai | Garuda Nexa',
    description:
      'Template website company profile untuk perusahaan, UMKM & startup. Mulai {harga_min}, termasuk domain, hosting & SSL tahun pertama. Lihat demonya.',
    descriptionNoPrice:
      'Template website company profile untuk perusahaan, UMKM & startup, sudah termasuk domain, hosting & SSL tahun pertama. Lihat demonya.',
    niche: 'company profile',
    hasGuide: true,
    guides: ['biaya-website-company-profile', 'template-vs-jasa-website-custom'],
  },
  'kecantikan-klinik': {
    slug: 'kecantikan-klinik',
    name: 'Klinik kecantikan & salon',
    h1: 'Template website klinik kecantikan & salon',
    title: 'Template Website Klinik Kecantikan & Salon | Garuda Nexa',
    description:
      'Contoh website klinik kecantikan, salon, spa & barbershop yang siap dipakai: daftar perawatan, harga, galeri, reservasi WhatsApp. Lihat demonya.',
    descriptionNoPrice:
      'Contoh website klinik kecantikan, salon, spa & barbershop yang siap dipakai: daftar perawatan, harga, galeri, reservasi WhatsApp. Lihat demonya.',
    niche: 'klinik kecantikan & salon',
    hasGuide: true,
    guides: ['website-klinik-kecantikan', 'template-vs-jasa-website-custom'],
  },
  'olahraga-komunitas': {
    slug: 'olahraga-komunitas',
    name: 'Klub olahraga',
    h1: 'Template website klub olahraga',
    title: 'Template Website Klub Olahraga, Padel & Futsal | Garuda Nexa',
    description:
      'Website klub olahraga siap pakai untuk padel, tenis, futsal, badminton & gym: paket membership, pelatih, jadwal, pesan lapangan via WhatsApp.',
    descriptionNoPrice:
      'Website klub olahraga siap pakai untuk padel, tenis, futsal, badminton & gym: paket membership, pelatih, jadwal, pesan lapangan via WhatsApp.',
    niche: 'klub olahraga',
    hasGuide: true,
    guides: ['template-vs-jasa-website-custom'],
  },
  'fintech-startup': {
    slug: 'fintech-startup',
    name: 'Fintech & startup',
    h1: 'Template website fintech & startup',
    title: 'Template Website Fintech & Startup | Garuda Nexa',
    description:
      'Template landing page untuk fintech, aplikasi pembayaran & SaaS. Tampilan modern, FAQ, testimoni, tautan unduh aplikasi. Lihat demonya.',
    descriptionNoPrice:
      'Template landing page untuk fintech, aplikasi pembayaran & SaaS. Tampilan modern, FAQ, testimoni, tautan unduh aplikasi. Lihat demonya.',
    niche: 'fintech & startup',
    hasGuide: true,
    guides: ['biaya-aplikasi-android-ios', 'template-vs-jasa-website-custom'],
  },
  // Toko online (2026-10-25): SkyNusa, TaniMakmur, PuncakGear, GadgetKu.id, GlowStory (kategori DB "Toko Online")
  'toko-online': {
    slug: 'toko-online',
    name: 'Toko online',
    h1: 'Template website toko online',
    title: 'Template Website Toko Online Siap Pakai | Garuda Nexa',
    description:
      'Template website toko online untuk drone, pertanian, outdoor, aksesoris HP & skincare. Mulai {harga_min}, termasuk domain, hosting & SSL. Lihat demonya.',
    descriptionNoPrice:
      'Template website toko online untuk drone, pertanian, outdoor, aksesoris HP & skincare, sudah termasuk domain, hosting & SSL. Lihat demonya.',
    niche: 'toko online',
    hasGuide: true,
    guides: ['template-vs-jasa-website-custom'],
  },
};

/** Urutan tampil kategori (chip katalog, footer, beranda). */
export const CATEGORY_LIST: readonly CategoryMeta[] = CATEGORY_SLUGS.map((slug) => CATEGORIES[slug]);

/**
 * Halaman kategori untuk nama kategori DB ("Kecantikan & Klinik" → kecantikan-klinik), atau null bila tidak punya
 * halaman kategori. Aturan sama dengan categorySlugOf (JSON-LD halaman template) dan backend/seo.php.
 */
export function categoryOf(dbCategory: string | null | undefined): CategoryMeta | null {
  const slug = categorySlugOf(dbCategory);
  return slug ? CATEGORIES[slug] : null;
}

/** Template terbit di kategori ini, urutan sama dengan daftar masukan (urutan API = sort_order). */
export const templatesInCategory = (templates: readonly Template[], slug: CategorySlug): Template[] =>
  templates.filter((t) => t && t.status !== 'draft' && categoryOf(t.category)?.slug === slug);

/** Aturan index rencana §2 (lihat komentar di atas). */
export const isCategoryIndexable = (meta: CategoryMeta, templateCount: number): boolean =>
  templateCount >= 2 || (templateCount >= 1 && meta.hasGuide);

/** Meta description kategori dengan harga termurah dari data. */
export function categoryDescription(meta: CategoryMeta, templates: readonly Template[]): string {
  const prices = templates.map((t) => t.price).filter(isPrice);
  if (!meta.description.includes('{harga_min}')) return meta.description;
  return prices.length ? meta.description.replace('{harga_min}', formatPriceShort(Math.min(...prices))) : meta.descriptionNoPrice;
}
