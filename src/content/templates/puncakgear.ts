// PuncakGear: salinan SEO & H1 (pola Lampiran A). Isi panjang halaman: puncakgear.content.ts.
// Kata kunci utama "template website toko outdoor" (title, meta, H1, paragraf pembuka); kata kunci turunan "website toko
// perlengkapan pendakian", "website toko alat gunung", "website sewa alat pendakian" di isi halaman.
// Jujur: pesanan & sewa lewat WhatsApp, template ini TIDAK punya keranjang belanja, pembayaran, stok, atau sistem booking.
import type { TemplateSeoCopy } from '../../seo/templateSeo';
import type { TemplatePageCopy } from './page.types';

export const seo: TemplateSeoCopy = {
  title: '{nama}: Template Website Toko Outdoor – {harga_singkat}',
  description: 'Template website toko outdoor & sewa alat pendakian + panduan gunung. {harga} sudah termasuk hosting & SSL tahun pertama; domain mulai {domain_mulai}/tahun.',
  niche: 'Toko Outdoor & Sewa Alat Pendakian',
  // Isi halaman (puncakgear.ts, puncakgear.content.ts) terakhir diubah: lastmod sitemap
  updated: '2026-10-25',
};

export const page: TemplatePageCopy = {
  h1: '{nama}: Template Website Toko Outdoor & Perlengkapan Pendakian',
  niche: 'toko outdoor & perlengkapan pendakian',
};
