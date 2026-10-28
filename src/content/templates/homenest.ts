// HomeNest: salinan SEO & H1 (pola Lampiran A). Isi panjang halaman: homenest.content.ts.
// Kata kunci utama "template website properti" + "website jual rumah" (judul, meta, H1, paragraf pembuka); pendukung
// "website developer perumahan", "website agen properti", "website perumahan" (isi halaman). Jujur: data demo fiktif,
// simulasi KPR hanya perkiraan (bukan penawaran bank), formulir jadwal kunjungan hanya menyusun pesan WhatsApp (data
// tidak disimpan di website), tidak ada tur 360° bawaan, tidak ada pembayaran tanda jadi online.
import type { TemplateSeoCopy } from '../../seo/templateSeo';
import type { TemplatePageCopy } from './page.types';

export const seo: TemplateSeoCopy = {
  title: '{nama}: Template Website Jual Rumah & Properti – {harga_singkat}',
  description: 'Template website jual rumah & properti: filter listing, simulasi KPR. {harga} sudah termasuk hosting & SSL tahun pertama; domain mulai {domain_mulai}/tahun.',
  niche: 'Properti',
  // Isi halaman (homenest.ts, homenest.content.ts) terakhir diubah: lastmod sitemap
  updated: '2026-10-28',
};

export const page: TemplatePageCopy = {
  h1: '{nama}: Template Website Properti dan Jual Rumah',
  niche: 'properti',
};
