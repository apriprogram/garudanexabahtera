// MediCare General: salinan SEO & H1 (pola Lampiran A). Isi panjang halaman: medicare-general.content.ts.
// Kata kunci utama "template website rumah sakit" (judul, meta, H1, paragraf pembuka); pendukung "website rumah sakit
// umum", "website RS dengan jadwal dokter", "pendaftaran online rumah sakit", "website IGD 24 jam" (isi halaman). Jujur:
// formulir pendaftaran hanya menyusun pesan WhatsApp (data pasien tidak disimpan di website), tidak ada rekam medis,
// pembayaran online, konsultasi video, atau antrean otomatis; jadwal dokter adalah teks yang diperbarui lewat CMS.
import type { TemplateSeoCopy } from '../../seo/templateSeo';
import type { TemplatePageCopy } from './page.types';

export const seo: TemplateSeoCopy = {
  title: '{nama}: Template Website Rumah Sakit – {harga_singkat}',
  description: 'Template website rumah sakit + jadwal dokter, IGD & pendaftaran. {harga} sudah termasuk hosting & SSL tahun pertama; domain mulai {domain_mulai}/tahun.',
  niche: 'Rumah Sakit',
  // Isi halaman (medicare-general.ts, medicare-general.content.ts) terakhir diubah: lastmod sitemap
  updated: '2026-10-28',
};

export const page: TemplatePageCopy = {
  h1: '{nama}: Template Website Rumah Sakit Umum',
  niche: 'rumah sakit',
};
