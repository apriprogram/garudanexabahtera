// Bestari: salinan SEO & H1 (pola Lampiran A). Isi panjang halaman: bestari.content.ts.
// Kata kunci utama "template website SD" (judul, meta, H1, paragraf pembuka); pendukung "website sekolah dasar",
// "website SD swasta", "website PPDB SD", dan "website sekolah" (isi halaman). Jujur: formulir PPDB hanya menyusun pesan
// WhatsApp untuk panitia, TIDAK ada penyimpanan data pendaftar, pembayaran online, e-rapor, atau sistem akademik.
import type { TemplateSeoCopy } from '../../seo/templateSeo';
import type { TemplatePageCopy } from './page.types';

export const seo: TemplateSeoCopy = {
  title: '{nama}: Template Website SD & Sekolah Dasar – {harga_singkat}',
  description: 'Template website SD dengan slider foto, PPDB via WhatsApp & berita. {harga} sudah termasuk hosting & SSL tahun pertama; domain mulai {domain_mulai}/tahun.',
  niche: 'Sekolah Dasar (SD)',
  // Isi halaman (bestari.ts, bestari.content.ts) terakhir diubah: lastmod sitemap
  updated: '2026-10-26',
};

export const page: TemplatePageCopy = {
  h1: '{nama}: Template Website SD dengan Halaman PPDB',
  niche: 'sekolah dasar',
};
