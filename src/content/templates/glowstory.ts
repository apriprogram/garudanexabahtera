// GlowStory: salinan SEO & H1 (pola Lampiran A). Isi panjang halaman: glowstory.content.ts.
// Jujur: keranjang dikirim sebagai pesanan WhatsApp (tanpa pembayaran online), kuis = saran umum, tanpa klaim medis.
import type { TemplateSeoCopy } from '../../seo/templateSeo';
import type { TemplatePageCopy } from './page.types';

export const seo: TemplateSeoCopy = {
  title: '{nama}: Template Website Toko Kecantikan – {harga_singkat}',
  description: 'Toko kecantikan online: kuis kulit, keranjang ke WhatsApp & langganan isi ulang. {harga} sudah termasuk domain, hosting & SSL tahun pertama.',
  niche: 'Toko Kecantikan & Skincare',
  // Isi halaman (glowstory.ts, glowstory.content.ts) terakhir diubah: lastmod sitemap
  updated: '2026-10-25',
};

export const page: TemplatePageCopy = {
  h1: '{nama}: Template Website Toko Kecantikan & Skincare',
  niche: 'toko kecantikan',
};
