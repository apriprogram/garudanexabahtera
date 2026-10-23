// Startup Clean: salinan SEO & H1 (Lampiran A). Isi panjang halaman: startup-clean.content.ts.
import type { TemplateSeoCopy } from '../../seo/templateSeo';
import type { TemplatePageCopy } from './page.types';

export const seo: TemplateSeoCopy = {
  title: '{nama}: Template Website UMKM & Startup – {harga_singkat}',
  description:
    'Website company profile modern untuk UMKM & startup. {harga} sudah termasuk domain, hosting & SSL tahun pertama. Kelola isi lewat CMS. Lihat demo.',
  niche: 'UMKM & Startup',
};

export const page: TemplatePageCopy = {
  h1: '{nama}: Template Website UMKM & Startup',
  niche: 'UMKM & startup',
};
