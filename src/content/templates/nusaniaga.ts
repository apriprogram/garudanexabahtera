// NusaNiaga: salinan SEO & H1 (pola Lampiran A). Isi panjang halaman: nusaniaga.content.ts.
// Kata kunci utama "template website importir" (judul, meta, H1, paragraf pembuka); pendukung "website importir",
// "website distributor bahan baku", "website supplier mesin industri", "company profile importir" (isi halaman). Judul
// memakai "Importir & Trading" karena "Importir & Distributor" membuat judul 62 huruf (> 60, jatuh diam-diam ke judul
// buatan). Jujur: formulir permintaan penawaran hanya menyusun pesan WhatsApp (data tidak disimpan di website), tidak ada
// pelacakan kiriman real-time, harga & stok tidak diperbarui otomatis.
import type { TemplateSeoCopy } from '../../seo/templateSeo';
import type { TemplatePageCopy } from './page.types';

export const seo: TemplateSeoCopy = {
  title: '{nama}: Template Website Importir & Trading – {harga_singkat}',
  description:
    'Template website importir & distributor bahan baku + form penawaran. {harga} sudah termasuk hosting & SSL tahun pertama; domain mulai {domain_mulai}/tahun.',
  niche: 'Importir & Distributor Bahan Baku Industri',
  // Isi halaman (nusaniaga.ts, nusaniaga.content.ts) terakhir diubah: lastmod sitemap
  updated: '2026-10-27',
};

export const page: TemplatePageCopy = {
  h1: '{nama}: Template Website Importir & Distributor',
  niche: 'importir & distributor bahan baku',
};
