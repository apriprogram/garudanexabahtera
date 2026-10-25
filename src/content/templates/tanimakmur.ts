// TaniMakmur: salinan SEO & H1 (pola Lampiran A). Isi panjang halaman: tanimakmur.content.ts.
// Kata kunci utama "template website toko pertanian" (judul, meta, H1, lead); turunan di isi: "website toko pertanian
// online", "website toko benih dan pupuk", "website toko alat tani" (diuji di src/content/__tests__/templatePages.test.ts).
// Jujur: pemesanan lewat WhatsApp, template ini TIDAK punya keranjang, ongkir otomatis, atau pembayaran online, dan tidak
// menjanjikan hasil panen.
import type { TemplateSeoCopy } from '../../seo/templateSeo';
import type { TemplatePageCopy } from './page.types';

export const seo: TemplateSeoCopy = {
  title: '{nama}: Template Website Toko Pertanian – {harga_singkat}',
  description:
    'Template website toko pertanian untuk benih, pupuk & alat tani. {harga} sudah termasuk hosting & SSL tahun pertama; domain mulai {domain_mulai}/tahun.',
  niche: 'Toko Pertanian Online',
  // Isi halaman (tanimakmur.ts, tanimakmur.content.ts) terakhir diubah: lastmod sitemap
  updated: '2026-10-25',
};

export const page: TemplatePageCopy = {
  h1: '{nama}: Template Website Toko Pertanian & Urban Farming',
  niche: 'toko pertanian online',
};
