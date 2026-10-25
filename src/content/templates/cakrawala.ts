// Cakrawala: salinan SEO & H1 (pola Lampiran A). Isi panjang halaman: cakrawala.content.ts.
// Kata kunci utama "template website SMK" (judul, meta, H1, paragraf pembuka); pendukung "website sekolah", "website SMK
// negeri dan swasta", "website PPDB online", "website sekolah vokasi" (isi halaman). Jujur: formulir PPDB hanya menyusun
// pesan WhatsApp untuk panitia, TIDAK ada penyimpanan data pendaftar, pembayaran online, e-rapor, atau sistem akademik.
import type { TemplateSeoCopy } from '../../seo/templateSeo';
import type { TemplatePageCopy } from './page.types';

export const seo: TemplateSeoCopy = {
  title: '{nama}: Template Website SMK & SMA – {harga_singkat}',
  description: 'Template website SMK dengan hero slider, PPDB lewat WhatsApp, berita & BKK. {harga} sudah termasuk domain, hosting & SSL tahun pertama.',
  niche: 'Sekolah SMK & SMA',
  // Isi halaman (cakrawala.ts, cakrawala.content.ts) terakhir diubah: lastmod sitemap
  updated: '2026-10-25',
};

export const page: TemplatePageCopy = {
  h1: '{nama}: Template Website SMK & SMA dengan Halaman PPDB',
  niche: 'sekolah SMK & SMA',
};
