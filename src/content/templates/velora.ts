// Velora: salinan SEO & H1 (pola Lampiran A). Isi panjang halaman: velora.content.ts.
// Kata kunci utama "template website perusahaan otomotif" (judul, meta, H1, paragraf pembuka); pendukung "website dealer
// mobil", "template company profile bahasa Inggris", dan "website perusahaan multinasional" (isi halaman). Jujur: formulir
// test drive & newsletter hanya menyusun pesan WhatsApp/email; TIDAK ada sistem booking, stok, pembayaran, atau
// penyimpanan data; nama & angka demo fiktif.
import type { TemplateSeoCopy } from '../../seo/templateSeo';
import type { TemplatePageCopy } from './page.types';

export const seo: TemplateSeoCopy = {
  title: '{nama}: Template Website Perusahaan Otomotif – {harga_singkat}',
  description: 'Template website perusahaan otomotif & dealer, berbahasa Inggris. {harga} sudah termasuk hosting & SSL tahun pertama; domain mulai {domain_mulai}/tahun.',
  niche: 'Perusahaan Otomotif',
  // Isi halaman (velora.ts, velora.content.ts) terakhir diubah: lastmod sitemap
  updated: '2026-10-27',
};

export const page: TemplatePageCopy = {
  h1: '{nama}: Template Website Perusahaan Otomotif Berbahasa Inggris',
  niche: 'perusahaan otomotif',
};
