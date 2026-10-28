// Sparring Padel: salinan SEO & H1 (pola Lampiran A). Isi panjang halaman: sparring-padel.content.ts.
// Kata kunci utama "template website padel" (judul, meta, H1, paragraf pembuka); pendukung "website booking lapangan
// padel", "website lapangan padel", "website klub padel" (isi halaman). Judul & kata kunci berbeda dari Arena Club
// ("klub olahraga"). Jujur: booking hanya menyusun pesan WhatsApp ke admin, jadwal yang tampil contoh, ketersediaan
// dikonfirmasi admin, tidak ada pembayaran online dan tidak ada akun member.
import type { TemplateSeoCopy } from '../../seo/templateSeo';
import type { TemplatePageCopy } from './page.types';

export const seo: TemplateSeoCopy = {
  title: '{nama}: Template Website Lapangan Padel – {harga_singkat}',
  description: 'Template website padel + booking lapangan via WhatsApp & cari lawan. {harga} sudah termasuk hosting & SSL tahun pertama; domain mulai {domain_mulai}/tahun.',
  niche: 'Lapangan Padel',
  // Isi halaman (sparring-padel.ts, sparring-padel.content.ts) terakhir diubah: lastmod sitemap
  updated: '2026-10-28',
};

export const page: TemplatePageCopy = {
  h1: '{nama}: Template Website Padel dengan Booking Lapangan',
  niche: 'lapangan padel',
};
