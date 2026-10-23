// Corporate Nexa: salinan SEO & H1 (Lampiran A). Isi panjang halaman: corporate-nexa.content.ts.
import type { TemplateSeoCopy } from '../../seo/templateSeo';
import type { TemplatePageCopy } from './page.types';

export const seo: TemplateSeoCopy = {
  title: '{nama}: Template Company Profile – {harga_singkat}',
  description:
    'Template company profile untuk perusahaan jasa, konsultan & kontraktor. {harga} sudah termasuk domain, hosting & SSL tahun pertama. Lihat demo.',
  niche: 'Company Profile Perusahaan',
  // Isi halaman (corporate-nexa.ts, corporate-nexa.content.ts) terakhir diubah: lastmod sitemap
  updated: '2026-10-23',
};

export const page: TemplatePageCopy = {
  h1: '{nama}: Template Website Company Profile Perusahaan',
  niche: 'company profile perusahaan',
};
