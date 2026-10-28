// MomKid Hospital: salinan SEO & H1 (pola Lampiran A). Isi panjang halaman: momkid.content.ts.
// Kata kunci utama "template website rumah sakit ibu dan anak" (H1, paragraf pembuka); pendukung "website RSIA",
// "website klinik bersalin", "website rumah sakit ibu & anak" (judul, meta, isi). Jujur: formulir pendaftaran hanya
// menyusun pesan WhatsApp (data tidak disimpan di website), tidak ada rekam medis, pembayaran online, atau konsultasi
// video; jadwal imunisasi hanya ringkasan yang diedit pemilik situs (ikuti anjuran dokter anak).
import type { TemplateSeoCopy } from '../../seo/templateSeo';
import type { TemplatePageCopy } from './page.types';

export const seo: TemplateSeoCopy = {
  title: '{nama}: Template Website RS Ibu & Anak – {harga_singkat}',
  description: 'Template website rumah sakit ibu & anak + daftar kunjungan WhatsApp. {harga} sudah termasuk hosting & SSL tahun pertama; domain mulai {domain_mulai}/tahun.',
  niche: 'RS Ibu & Anak',
  // Isi halaman (momkid.ts, momkid.content.ts) terakhir diubah: lastmod sitemap
  updated: '2026-10-28',
};

export const page: TemplatePageCopy = {
  h1: '{nama}: Template Website Rumah Sakit Ibu dan Anak',
  niche: 'rumah sakit ibu dan anak',
};
