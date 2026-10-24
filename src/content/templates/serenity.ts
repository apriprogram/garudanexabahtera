// Serenity: salinan SEO & H1 (pola Lampiran A). Isi panjang halaman: serenity.content.ts.
// Jujur: pendaftaran kelas lewat WhatsApp, template ini TIDAK punya sistem jadwal/pembayaran, tanpa klaim medis.
import type { TemplateSeoCopy } from '../../seo/templateSeo';
import type { TemplatePageCopy } from './page.types';

export const seo: TemplateSeoCopy = {
  title: '{nama}: Template Website Studio Yoga – {harga_singkat}',
  description:
    'Website studio yoga & pilates: kelas, paket & daftar via WhatsApp. {harga} sudah termasuk domain, hosting & SSL tahun pertama. Lihat demo.',
  niche: 'Studio Yoga & Pilates',
  // Isi halaman (serenity.ts, serenity.content.ts) terakhir diubah: lastmod sitemap
  updated: '2026-10-25',
};

export const page: TemplatePageCopy = {
  h1: '{nama}: Template Website Studio Yoga & Pilates',
  niche: 'studio yoga',
};
