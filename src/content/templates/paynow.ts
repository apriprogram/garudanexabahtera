// PayNow: salinan SEO & H1 (pola Lampiran A). Isi panjang halaman: paynow.content.ts.
// Kata kunci utama "template landing page dompet digital" (judul, meta, H1, paragraf pembuka); pendukung "template
// website payment gateway", "landing page e-wallet", "website aplikasi pembayaran" (isi halaman). Finova memegang
// "template website fintech & startup", jadi kata kunci itu tidak dipakai di sini. Jujur: halaman pemasaran — tidak
// memproses pembayaran, tidak menyimpan saldo, contoh kode API hanya ilustrasi, izin & lembaga pengawas diisi pemilik
// merek, formulir merchant hanya menyusun pesan WhatsApp.
import type { TemplateSeoCopy } from '../../seo/templateSeo';
import type { TemplatePageCopy } from './page.types';

export const seo: TemplateSeoCopy = {
  title: '{nama}: Template Landing Page Dompet Digital – {harga_singkat}',
  description:
    'Landing page dompet digital & payment gateway + simulasi biaya & API. {harga} sudah termasuk hosting & SSL tahun pertama; domain mulai {domain_mulai}/tahun.',
  niche: 'Dompet Digital',
  // Isi halaman (paynow.ts, paynow.content.ts) terakhir diubah: lastmod sitemap
  updated: '2026-10-28',
};

export const page: TemplatePageCopy = {
  h1: '{nama}: Template Landing Page Dompet Digital & Payment Gateway',
  niche: 'dompet digital',
};
