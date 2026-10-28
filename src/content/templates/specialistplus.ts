// SpecialistPlus: salinan SEO & H1 (pola Lampiran A). Isi panjang halaman: specialistplus.content.ts.
// Kata kunci utama "template website klinik spesialis" (judul, meta, H1, paragraf pembuka); pendukung "website klinik
// spesialis", "website laboratorium klinik", "website medical check-up", "website pusat diagnostik" (isi halaman).
// Jujur: tombol daftar, pesan paket MCU, dan formulir hasil lab hanya menyusun pesan WhatsApp (data tidak disimpan di
// website), hasil lab tidak ditampilkan di website, tidak ada rekam medis, pembayaran online, antrean real-time, atau
// konsultasi video; jadwal & harga adalah teks dari CMS.
import type { TemplateSeoCopy } from '../../seo/templateSeo';
import type { TemplatePageCopy } from './page.types';

export const seo: TemplateSeoCopy = {
  title: '{nama}: Template Klinik Spesialis & Lab – {harga_singkat}',
  description:
    'Template website klinik spesialis: jadwal dokter, MCU & hasil lab. {harga} sudah termasuk hosting & SSL tahun pertama; domain mulai {domain_mulai}/tahun.',
  niche: 'Klinik Spesialis',
  // Isi halaman (specialistplus.ts, specialistplus.content.ts) terakhir diubah: lastmod sitemap
  updated: '2026-10-28',
};

export const page: TemplatePageCopy = {
  h1: '{nama}: Template Website Klinik Spesialis & Laboratorium',
  niche: 'klinik spesialis',
};
