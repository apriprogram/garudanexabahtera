// Nusaline: salinan SEO & H1 (pola Lampiran A). Isi panjang halaman: nusaline.content.ts.
// Kata kunci utama "template website PO bus" + "website bus malam" (judul, meta, H1, paragraf pembuka); pendukung
// "website tiket bus", "website PO bus antarkota" (isi halaman). Jujur: data demo fiktif, pemesanan hanya menyusun pesan
// WhatsApp (tanpa pembayaran online, e-tiket, atau pilihan kursi real-time), jadwal & harga contoh dikonfirmasi admin.
import type { TemplateSeoCopy } from '../../seo/templateSeo';
import type { TemplatePageCopy } from './page.types';

export const seo: TemplateSeoCopy = {
  title: '{nama}: Template Website PO Bus Antarkota – {harga_singkat}',
  description: 'Template website PO bus & bus malam: jadwal, kelas, pesan via WA. {harga} sudah termasuk hosting & SSL tahun pertama; domain mulai {domain_mulai}/tahun.',
  niche: 'PO Bus Antarkota',
  // Isi halaman (nusaline.ts, nusaline.content.ts) terakhir diubah: lastmod sitemap
  updated: '2026-10-30',
};

export const page: TemplatePageCopy = {
  h1: '{nama}: Template Website PO Bus Antarkota',
  niche: 'PO bus antarkota',
};
