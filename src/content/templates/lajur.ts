// Lajur: salinan SEO & H1 (pola Lampiran A). Isi panjang halaman: lajur.content.ts.
// Kata kunci utama "template website sewa bus pariwisata" (judul, meta, H1, paragraf pembuka); pendukung "website PO bus
// pariwisata" dan "website rental bus" (isi halaman). Jujur: data demo fiktif, harga contoh, formulir hanya menyusun
// pesan WhatsApp (harga final & ketersediaan armada dari admin), tanpa pembayaran online, e-tiket, ketersediaan armada
// real-time, akun member, atau pelacakan GPS; tanpa klaim izin/asuransi.
import type { TemplateSeoCopy } from '../../seo/templateSeo';
import type { TemplatePageCopy } from './page.types';

export const seo: TemplateSeoCopy = {
  title: '{nama}: Template Website Sewa Bus Pariwisata – {harga_singkat}',
  description: 'Template website sewa bus pariwisata: armada, kalkulator rombongan. {harga} sudah termasuk hosting & SSL tahun pertama; domain mulai {domain_mulai}/tahun.',
  niche: 'Sewa Bus Pariwisata',
  // Isi halaman (lajur.ts, lajur.content.ts) terakhir diubah: lastmod sitemap
  updated: '2026-10-30',
};

export const page: TemplatePageCopy = {
  h1: '{nama}: Template Website Sewa Bus Pariwisata',
  niche: 'sewa bus pariwisata',
};
