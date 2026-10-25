// Startup Clean: salinan SEO & H1 (Lampiran A). Isi panjang halaman: startup-clean.content.ts.
import type { TemplateSeoCopy } from '../../seo/templateSeo';
import type { TemplatePageCopy } from './page.types';

export const seo: TemplateSeoCopy = {
  title: '{nama}: Template Website UMKM & Startup – {harga_singkat}',
  description:
    'Website company profile modern untuk UMKM & startup. {harga} sudah termasuk hosting & SSL tahun pertama; domain mulai {domain_mulai}/tahun. Lihat demo.',
  niche: 'UMKM & Startup',
  // Isi halaman (startup-clean.ts, startup-clean.content.ts) terakhir diubah: lastmod sitemap
  updated: '2026-10-23',
};

export const page: TemplatePageCopy = {
  h1: '{nama}: Template Website UMKM & Startup',
  niche: 'UMKM & startup',
};
