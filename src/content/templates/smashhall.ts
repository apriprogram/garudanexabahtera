// SmashHall: salinan SEO & H1 (pola Lampiran A). Isi panjang halaman: smashhall.content.ts.
// Kata kunci utama "template website GOR badminton" (judul, meta, H1, paragraf pembuka); pendukung "website GOR
// badminton", "website klub badminton", "website akademi badminton", "website booking lapangan badminton" (isi halaman).
// Jujur: booking & formulir hanya menyusun pesan WhatsApp ke admin, jadwal yang tampil adalah contoh, tidak ada
// pembayaran online, akun member, maupun keranjang belanja.
import type { TemplateSeoCopy } from '../../seo/templateSeo';
import type { TemplatePageCopy } from './page.types';

export const seo: TemplateSeoCopy = {
  title: '{nama}: Template Website GOR Badminton – {harga_singkat}',
  description: 'Template website GOR badminton: cek lapangan, member & akademi. {harga} sudah termasuk hosting & SSL tahun pertama; domain mulai {domain_mulai}/tahun.',
  niche: 'GOR Badminton',
  // Isi halaman (smashhall.ts, smashhall.content.ts) terakhir diubah: lastmod sitemap
  updated: '2026-10-28',
};

export const page: TemplatePageCopy = {
  h1: '{nama}: Template Website GOR & Klub Badminton',
  niche: 'GOR badminton',
};
