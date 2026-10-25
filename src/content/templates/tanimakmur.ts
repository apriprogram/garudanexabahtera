// TaniMakmur: salinan SEO & H1 (pola Lampiran A). Isi panjang halaman: tanimakmur.content.ts.
// Jujur: pemesanan lewat WhatsApp, template ini TIDAK punya keranjang, ongkir otomatis, atau pembayaran online, dan tidak
// menjanjikan hasil panen.
import type { TemplateSeoCopy } from '../../seo/templateSeo';
import type { TemplatePageCopy } from './page.types';

export const seo: TemplateSeoCopy = {
  title: '{nama}: Template Website Toko Pertanian – {harga_singkat}',
  description: 'Website toko tani: benih, pupuk & paket per tanaman, pesan via WhatsApp. {harga} sudah termasuk domain, hosting & SSL tahun pertama. Lihat demo.',
  niche: 'Toko Pertanian',
  // Isi halaman (tanimakmur.ts, tanimakmur.content.ts) terakhir diubah: lastmod sitemap
  updated: '2026-10-25',
};

export const page: TemplatePageCopy = {
  h1: '{nama}: Template Website Toko Pertanian & Urban Farming',
  niche: 'toko pertanian',
};
