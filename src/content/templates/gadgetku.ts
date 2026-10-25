// GadgetKu.id: salinan SEO & H1 (pola Lampiran A). Isi panjang halaman: gadgetku.content.ts.
// Jujur: pesanan lewat WhatsApp, template ini TIDAK punya keranjang, pembayaran online, atau sinkron stok marketplace;
// foto custom casing pengunjung hanya tampil di browsernya.
import type { TemplateSeoCopy } from '../../seo/templateSeo';
import type { TemplatePageCopy } from './page.types';

export const seo: TemplateSeoCopy = {
  title: '{nama}: Template Website Toko Aksesori HP – {harga_singkat}',
  description:
    'Website toko aksesori HP: cari per tipe HP, bundling & custom casing, pesan via WhatsApp. {harga} sudah termasuk domain, hosting & SSL tahun pertama.',
  niche: 'Toko Aksesori HP',
  // Isi halaman (gadgetku.ts, gadgetku.content.ts) terakhir diubah: lastmod sitemap
  updated: '2026-10-25',
};

export const page: TemplatePageCopy = {
  h1: '{nama}: Template Website Toko Aksesori HP',
  niche: 'toko aksesori HP',
};
