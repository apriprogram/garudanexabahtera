// Jumantara: salinan SEO & H1 (pola Lampiran A). Isi panjang halaman: jumantara.content.ts.
// Kata kunci utama "template website sekolah negeri" (judul, meta, H1, paragraf pembuka); pendukung "website SMA
// profesional" (isi halaman). Tidak memakai "template website SMA" milik Bestari (pola Madani: "template website sekolah
// Islam"). Jujur: formulir SPMB hanya menyusun pesan WhatsApp untuk bertanya, TIDAK ada penyimpanan data pendaftar,
// pembayaran online, e-rapor, atau sistem akademik; pendaftaran tetap di portal SPMB provinsi.
import type { TemplateSeoCopy } from '../../seo/templateSeo';
import type { TemplatePageCopy } from './page.types';

export const seo: TemplateSeoCopy = {
  title: '{nama}: Template Website Sekolah Negeri – {harga_singkat}',
  // Pembuka meta menyebut ciri khasnya (ubin layanan cepat & PPID), bukan fitur yang juga dimiliki Nawasena/Pradipta
  description:
    'Template website sekolah negeri untuk SMA: layanan cepat & PPID. {harga} sudah termasuk hosting & SSL tahun pertama; domain mulai {domain_mulai}/tahun.',
  niche: 'SMA Negeri',
  // Isi halaman (jumantara.ts, jumantara.content.ts) terakhir diubah: lastmod sitemap
  updated: '2026-10-27',
};

export const page: TemplatePageCopy = {
  h1: '{nama}: Template Website Sekolah Negeri untuk SMA',
  niche: 'sekolah SMA negeri',
};
