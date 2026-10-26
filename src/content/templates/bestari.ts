// Bestari: salinan SEO & H1 (pola Lampiran A). Isi panjang halaman: bestari.content.ts.
// Kata kunci utama "template website SMA" (judul, meta, H1, paragraf pembuka); pendukung "website SMA swasta",
// "website PPDB SMA", "website SMA negeri", dan "website sekolah" (isi halaman). Jujur: formulir PPDB hanya menyusun
// pesan WhatsApp untuk panitia, TIDAK ada penyimpanan data pendaftar, pembayaran online, e-rapor, atau sistem akademik.
import type { TemplateSeoCopy } from '../../seo/templateSeo';
import type { TemplatePageCopy } from './page.types';

export const seo: TemplateSeoCopy = {
  title: '{nama}: Template Website SMA & PPDB Online – {harga_singkat}',
  description: 'Template website SMA dengan slider foto, PPDB via WhatsApp & berita. {harga} sudah termasuk hosting & SSL tahun pertama; domain mulai {domain_mulai}/tahun.',
  niche: 'Sekolah Menengah Atas (SMA)',
  // Isi halaman (bestari.ts, bestari.content.ts) terakhir diubah: lastmod sitemap
  updated: '2026-10-26',
};

export const page: TemplatePageCopy = {
  h1: '{nama}: Template Website SMA dengan Halaman PPDB',
  niche: 'sekolah menengah atas',
};
