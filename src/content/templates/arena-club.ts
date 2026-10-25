// Arena Club: salinan SEO & H1 (Lampiran A). Isi panjang halaman: arena-club.content.ts.
// Jujur: pemesanan lapangan lewat WhatsApp, template ini TIDAK punya sistem booking.
import type { TemplateSeoCopy } from '../../seo/templateSeo';
import type { TemplatePageCopy } from './page.types';

export const seo: TemplateSeoCopy = {
  title: '{nama}: Template Website Klub Olahraga – {harga_singkat}',
  description:
    'Website klub olahraga untuk padel, futsal & gym, pesan via WhatsApp. {harga} sudah termasuk hosting & SSL tahun pertama; domain mulai {domain_mulai}/tahun.',
  niche: 'Klub Olahraga, Padel & Futsal',
  // Isi halaman (arena-club.ts, arena-club.content.ts) terakhir diubah: lastmod sitemap
  updated: '2026-10-23',
};

export const page: TemplatePageCopy = {
  h1: '{nama}: Template Website Klub Olahraga, Padel & Futsal',
  niche: 'klub olahraga',
};
