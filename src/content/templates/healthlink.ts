// HealthLink: salinan SEO & H1 (pola Lampiran A). Isi panjang halaman: healthlink.content.ts.
// Kata kunci utama "template website telemedicine" (judul, meta, H1, paragraf pembuka); pendukung "website konsultasi
// dokter online", "website telemedicine rumah sakit", "landing page aplikasi kesehatan" (isi halaman). Jujur: template
// ini halaman pemasaran layanan; konsultasi lewat WhatsApp atau aplikasi pembeli, rekam medis tidak disimpan di website,
// tidak ada pembayaran online, pengingat kontrol dibuat di perangkat pengunjung.
import type { TemplateSeoCopy } from '../../seo/templateSeo';
import type { TemplatePageCopy } from './page.types';

export const seo: TemplateSeoCopy = {
  title: '{nama}: Template Website Telemedicine – {harga_singkat}',
  description: 'Template website telemedicine: chat dokter, resep, pengingat kontrol. {harga} sudah termasuk hosting & SSL tahun pertama; domain mulai {domain_mulai}/tahun.',
  niche: 'Telemedicine',
  // Isi halaman (healthlink.ts, healthlink.content.ts) terakhir diubah: lastmod sitemap
  updated: '2026-10-28',
};

export const page: TemplatePageCopy = {
  h1: '{nama}: Template Website Telemedicine & Konsultasi Online',
  niche: 'telemedicine',
};
