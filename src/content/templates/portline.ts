// Portline: salinan SEO & H1 (pola Lampiran A). Isi panjang halaman: portline.content.ts.
// Kata kunci utama "template website perusahaan pelayaran" (judul, meta, H1, paragraf pembuka); pendukung "website
// perusahaan logistik" dan "template company profile bahasa Inggris" (isi halaman). Jujur: formulir enquiry hanya
// menyusun pesan WhatsApp/email, TIDAK ada pelacakan kiriman, booking, atau transaksi sungguhan; demo fiktif.
import type { TemplateSeoCopy } from '../../seo/templateSeo';
import type { TemplatePageCopy } from './page.types';

export const seo: TemplateSeoCopy = {
  title: '{nama}: Template Website Perusahaan Pelayaran – {harga_singkat}',
  description: 'Template website perusahaan pelayaran & logistik berbahasa Inggris. {harga} sudah termasuk hosting & SSL tahun pertama; domain mulai {domain_mulai}/tahun.',
  niche: 'Perusahaan Pelayaran & Logistik',
  // Isi halaman (portline.ts, portline.content.ts) terakhir diubah: lastmod sitemap
  updated: '2026-10-27',
};

export const page: TemplatePageCopy = {
  h1: '{nama}: Template Website Perusahaan Pelayaran & Logistik',
  niche: 'perusahaan pelayaran & logistik',
};
