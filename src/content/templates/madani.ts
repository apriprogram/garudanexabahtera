// Madani: salinan SEO & H1 (pola Lampiran A). Isi panjang halaman: madani.content.ts.
// Kata kunci utama "template website sekolah Islam" (judul, meta, H1, paragraf pembuka); pendukung "website SMA Islam",
// "website sekolah Islam terpadu", "website PPDB online", "website madrasah aliyah" (isi halaman, wajar).
// Jujur: formulir PPDB hanya menyusun pesan WhatsApp (tanpa penyimpanan data, akun pendaftar, atau pembayaran online);
// BUKAN sistem informasi sekolah (tanpa e-rapor, absensi, database siswa).
import type { TemplateSeoCopy } from '../../seo/templateSeo';
import type { TemplatePageCopy } from './page.types';

export const seo: TemplateSeoCopy = {
  title: '{nama}: Template Website Sekolah Islam – {harga_singkat}',
  description: 'Template website sekolah Islam untuk SMA IT & MA, PPDB via WhatsApp. {harga} sudah termasuk hosting & SSL tahun pertama; domain mulai {domain_mulai}/tahun.',
  niche: 'Sekolah Islam',
  // Isi halaman (madani.ts, madani.content.ts) terakhir diubah: lastmod sitemap
  updated: '2026-10-25',
};

export const page: TemplatePageCopy = {
  h1: '{nama}: Template Website Sekolah Islam & PPDB Online',
  niche: 'sekolah Islam',
};
