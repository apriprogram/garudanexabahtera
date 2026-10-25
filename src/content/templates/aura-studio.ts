// Aura Studio: salinan SEO & H1 (Lampiran A). Isi panjang halaman: aura-studio.content.ts.
// Jujur: tanpa klaim medis; reservasi lewat WhatsApp.
import type { TemplateSeoCopy } from '../../seo/templateSeo';
import type { TemplatePageCopy } from './page.types';

export const seo: TemplateSeoCopy = {
  title: '{nama}: Template Website Klinik & Salon – {harga_singkat}',
  description:
    'Template website klinik kecantikan, salon & spa. {harga} sudah termasuk hosting & SSL tahun pertama; domain mulai {domain_mulai}/tahun. Lihat demo.',
  niche: 'Klinik Kecantikan & Salon',
  // Isi halaman (aura-studio.ts, aura-studio.content.ts) terakhir diubah: lastmod sitemap
  updated: '2026-10-23',
};

export const page: TemplatePageCopy = {
  h1: '{nama}: Template Website Klinik Kecantikan & Salon',
  niche: 'klinik kecantikan & salon',
};
