// GlowStory: salinan SEO & H1 (pola Lampiran A). Isi panjang halaman: glowstory.content.ts.
// Kata kunci utama "template website toko skincare"; pendukung "website toko kosmetik online", "website toko
// kecantikan", "website toko skincare lokal" (dipakai di H1, lead, dan isi halaman).
// Jujur: keranjang = daftar belanja yang dikirim lewat WhatsApp (tanpa checkout/pembayaran online), langganan isi ulang
// = kalkulator + pesan WhatsApp (tanpa penagihan otomatis), kuis = saran umum, tanpa klaim medis.
import type { TemplateSeoCopy } from '../../seo/templateSeo';
import type { TemplatePageCopy } from './page.types';

export const seo: TemplateSeoCopy = {
  title: '{nama}: Template Website Toko Skincare – {harga_singkat}',
  description: 'Template website toko skincare & kosmetik online: kuis kulit, pesan via WhatsApp. {harga} sudah termasuk domain, hosting & SSL tahun pertama.',
  niche: 'Toko Skincare & Kosmetik',
  // Isi halaman (glowstory.ts, glowstory.content.ts) terakhir diubah: lastmod sitemap
  updated: '2026-10-25',
};

export const page: TemplatePageCopy = {
  h1: '{nama}: Template Website Toko Skincare & Kosmetik Online',
  niche: 'toko skincare & kosmetik',
};
