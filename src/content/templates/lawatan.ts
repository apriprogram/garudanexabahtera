// Lawatan: salinan SEO & H1 (pola Lampiran A). Isi panjang halaman: lawatan.content.ts.
// Kata kunci utama "template website tour and travel" (judul, meta, H1, paragraf pembuka); pendukung "website paket
// wisata" dan "website study tour" (isi halaman). Jujur: data demo fiktif, formulir hitung biaya hanya menyusun pesan
// WhatsApp, harga paket contoh dan dikonfirmasi admin, tidak ada pembayaran online atau kuota real-time.
import type { TemplateSeoCopy } from '../../seo/templateSeo';
import type { TemplatePageCopy } from './page.types';

export const seo: TemplateSeoCopy = {
  title: '{nama}: Template Website Tour & Travel – {harga_singkat}',
  description: 'Template website tour & travel rombongan: paket, itinerary, estimasi. {harga} sudah termasuk hosting & SSL tahun pertama; domain mulai {domain_mulai}/tahun.',
  niche: 'Tour & Travel',
  // Isi halaman (lawatan.ts, lawatan.content.ts) terakhir diubah: lastmod sitemap
  updated: '2026-10-30',
};

export const page: TemplatePageCopy = {
  h1: '{nama}: Template Website Tour & Travel Rombongan',
  niche: 'tour & travel',
};
