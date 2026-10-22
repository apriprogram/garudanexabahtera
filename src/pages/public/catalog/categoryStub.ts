// Nama sementara 4 halaman kategori selama stub (judul & H1 dari SEO-PLAN Lampiran A, tanpa angka harga).
// WP5 menggantinya dengan src/content/categories.ts (pemetaan kategori DB → slug, H1, intro, FAQ).
import type { CategorySlug } from '../../../seo/paths';

export interface CategoryStub {
  /** Nama di breadcrumb */
  name: string;
  /** H1 */
  heading: string;
  /** <title> */
  title: string;
}

export const CATEGORY_STUBS: Record<CategorySlug, CategoryStub> = {
  'company-profile': {
    name: 'Company profile',
    heading: 'Template website company profile',
    title: 'Template Website Company Profile Siap Pakai | Garuda Nexa',
  },
  'kecantikan-klinik': {
    name: 'Klinik kecantikan & salon',
    heading: 'Template website klinik kecantikan & salon',
    title: 'Template Website Klinik Kecantikan & Salon | Garuda Nexa',
  },
  'olahraga-komunitas': {
    name: 'Klub olahraga',
    heading: 'Template website klub olahraga',
    title: 'Template Website Klub Olahraga, Padel & Futsal | Garuda Nexa',
  },
  'fintech-startup': {
    name: 'Fintech & startup',
    heading: 'Template website fintech & startup',
    title: 'Template Website Fintech & Startup | Garuda Nexa',
  },
};
