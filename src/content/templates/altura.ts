// Altura: salinan SEO & H1 (pola Lampiran A). Isi panjang halaman: altura.content.ts.
// Kata kunci utama "template website perusahaan properti" (judul, meta, H1, paragraf pembuka); pendukung "website
// developer properti" dan "template company profile bahasa Inggris" (isi halaman). Jujur: konten demo berbahasa Inggris
// dan semuanya bisa diganti lewat CMS (termasuk ke bahasa Indonesia); formulir enquiry hanya menyusun pesan WhatsApp/email
// (tanpa penyimpanan data); tidak ada sistem listing, booking, atau transaksi sungguhan; nama & angka demo fiktif.
import type { TemplateSeoCopy } from '../../seo/templateSeo';
import type { TemplatePageCopy } from './page.types';

export const seo: TemplateSeoCopy = {
  title: '{nama}: Template Website Perusahaan Properti – {harga_singkat}',
  description:
    'Template website perusahaan properti berbahasa Inggris. {harga} sudah termasuk hosting & SSL tahun pertama; domain mulai {domain_mulai}/tahun.',
  niche: 'Perusahaan Properti & Company Profile Bahasa Inggris',
  // Isi halaman (altura.ts, altura.content.ts) terakhir diubah: lastmod sitemap
  updated: '2026-10-27',
};

export const page: TemplatePageCopy = {
  h1: '{nama}: Template Website Perusahaan Properti Berbahasa Inggris',
  niche: 'perusahaan properti berbahasa Inggris',
};
