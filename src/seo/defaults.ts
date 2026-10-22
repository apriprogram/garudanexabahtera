// Nilai head bawaan host utama: kepala halaman stub (noindex) dan 404. Kepala halaman yang sudah jadi: pageHead() di
// page.ts. Modul murni (tanpa React), aman diimpor dari *.seo.ts dan skrip Node.
import { COMPANY_FACTS } from '../lib/companyFacts';
import { DEFAULT_OG_ALT, ogCardUrl } from './og';
import type { SeoHead } from './types';

/** Akhiran judul halaman non-template (Lampiran A.2: halaman template tanpa akhiran). */
export const TITLE_SUFFIX = ` | ${COMPANY_FACTS.name}`;

/** Kartu OG bawaan 1200×630 (public/og/default.jpg, dibuat scripts/seo/og-images.mjs). */
export const DEFAULT_OG_IMAGE = ogCardUrl('default');
export const DEFAULT_OG_IMAGE_ALT = DEFAULT_OG_ALT;

/**
 * Kepala halaman yang isinya belum jadi: noindex,follow tanpa canonical, jadi tidak pernah terindeks atau masuk
 * sitemap (getIndexableRoutes hanya menerima rute `index,follow`). Ganti dengan kepala lengkap saat halamannya jadi.
 */
export function stubHead({ title, description }: { title: string; description: string }): SeoHead {
  return {
    title,
    description,
    canonical: null,
    robots: 'noindex,follow',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    ogImageAlt: DEFAULT_OG_IMAGE_ALT,
    jsonLd: [],
  };
}

/** Kepala untuk path yang tidak dimiliki halaman mana pun, atau yang pemiliknya bilang tidak ada (head() = null). */
export function notFoundHead(): SeoHead {
  return stubHead({
    title: `Halaman tidak ditemukan${TITLE_SUFFIX}`,
    description: 'Halaman yang Anda cari tidak ada atau sudah dipindahkan.',
  });
}
