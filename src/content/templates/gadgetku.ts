// GadgetKu.id: salinan SEO & H1 (pola Lampiran A). Isi panjang halaman: gadgetku.content.ts.
// Kata kunci utama "template website toko aksesoris HP" (title, meta, H1, paragraf pembuka); kata kunci pendamping
// "website toko aksesoris handphone", "website toko online aksesoris HP", "website toko casing HP" di isi halaman.
// Jujur: pesanan lewat WhatsApp, template ini TIDAK punya keranjang, pembayaran online, atau sinkron stok marketplace;
// foto custom casing pengunjung hanya tampil di browsernya.
import type { TemplateSeoCopy } from '../../seo/templateSeo';
import type { TemplatePageCopy } from './page.types';

export const seo: TemplateSeoCopy = {
  title: '{nama}: Template Website Toko Aksesoris HP – {harga_singkat}',
  description:
    'Template website toko aksesoris HP: cari per tipe HP, bundling, custom casing. {harga} sudah termasuk domain, hosting & SSL tahun pertama.',
  niche: 'Toko Aksesoris HP',
  // Isi halaman (gadgetku.ts, gadgetku.content.ts) terakhir diubah: lastmod sitemap
  updated: '2026-10-25',
};

export const page: TemplatePageCopy = {
  h1: '{nama}: Template Website Toko Aksesoris HP',
  niche: 'toko aksesoris HP',
};
