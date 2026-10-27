// Nawasena: salinan SEO & H1 (pola Lampiran A). Isi panjang halaman: nawasena.content.ts.
// Kata kunci utama "template website profil sekolah" (judul, meta, H1, paragraf pembuka); pendukung "website profil SMA"
// dan "website sekolah negeri" (isi halaman). Tidak memakai "template website SMA" / "PPDB online" milik Bestari.
// Jujur: formulir tanya SPMB hanya menyusun pesan WhatsApp untuk panitia, pendaftaran tetap di portal SPMB provinsi,
// TIDAK ada penyimpanan data pendaftar, pembayaran online, e-rapor, absensi, atau sistem informasi akademik.
import type { TemplateSeoCopy } from '../../seo/templateSeo';
import type { TemplatePageCopy } from './page.types';

export const seo: TemplateSeoCopy = {
  title: '{nama}: Template Website Profil Sekolah SMA – {harga_singkat}',
  // Pembuka meta menyebut ciri khasnya (strip pengumuman berjalan), bukan fitur yang juga dimiliki Jumantara/Pradipta
  description: 'Template website profil sekolah SMA negeri: pengumuman berjalan. {harga} sudah termasuk hosting & SSL tahun pertama; domain mulai {domain_mulai}/tahun.',
  niche: 'Profil Sekolah SMA',
  // Isi halaman (nawasena.ts, nawasena.content.ts) terakhir diubah: lastmod sitemap
  updated: '2026-10-27',
};

export const page: TemplatePageCopy = {
  h1: '{nama}: Template Website Profil Sekolah untuk SMA',
  niche: 'profil sekolah SMA',
};
