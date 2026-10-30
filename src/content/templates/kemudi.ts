// Kemudi: salinan SEO & H1 (pola Lampiran A). Isi panjang halaman: kemudi.content.ts.
// Kata kunci utama "template website rental mobil" (judul, meta, H1, paragraf pembuka); pendukung "website sewa mobil",
// "website rent car", "website rental mobil lepas kunci" (isi halaman). Jujur: data demo fiktif, harga contoh,
// pemesanan hanya menyusun pesan WhatsApp (tidak ada pembayaran online, ketersediaan & harga final dikonfirmasi admin),
// dokumen tidak diunggah atau disimpan di website, tanpa nama merek/tipe mobil.
import type { TemplateSeoCopy } from '../../seo/templateSeo';
import type { TemplatePageCopy } from './page.types';

export const seo: TemplateSeoCopy = {
  title: '{nama}: Template Website Rental Mobil – {harga_singkat}',
  description: 'Template website rental mobil: armada, hitung sewa, pesan WhatsApp. {harga} sudah termasuk hosting & SSL tahun pertama; domain mulai {domain_mulai}/tahun.',
  niche: 'Rental Mobil',
  // Isi halaman (kemudi.ts, kemudi.content.ts) terakhir diubah: lastmod sitemap
  updated: '2026-10-30',
};

export const page: TemplatePageCopy = {
  h1: '{nama}: Template Website Rental Mobil',
  niche: 'rental mobil',
};
