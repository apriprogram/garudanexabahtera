// Pesiar: salinan SEO & H1 (pola Lampiran A). Isi panjang halaman: pesiar.content.ts.
// Kata kunci utama "template website private tour" + "website sewa mobil dengan sopir" (judul, meta, H1, paragraf
// pembuka); pendukung "website tour Bali", "website antar-jemput bandara", "website rental mobil Bali" (isi halaman).
// Jujur: data demo fiktif, harga contoh per mobil, formulir Rancang tur & antar-jemput hanya menyusun pesan WhatsApp,
// tidak ada pembayaran online, e-tiket, ketersediaan mobil real-time, atau pelacakan penerbangan otomatis.
import type { TemplateSeoCopy } from '../../seo/templateSeo';
import type { TemplatePageCopy } from './page.types';

export const seo: TemplateSeoCopy = {
  title: '{nama}: Template Website Sewa Mobil & Sopir – {harga_singkat}',
  description: 'Template website private tour Bali & sewa mobil dengan sopir. {harga} sudah termasuk hosting & SSL tahun pertama; domain mulai {domain_mulai}/tahun.',
  niche: 'Sewa Mobil dengan Sopir',
  // Isi halaman (pesiar.ts, pesiar.content.ts) terakhir diubah: lastmod sitemap
  updated: '2026-10-30',
};

export const page: TemplatePageCopy = {
  h1: '{nama}: Template Website Private Tour & Sewa Mobil dengan Sopir',
  niche: 'private tour & sewa mobil dengan sopir',
};
