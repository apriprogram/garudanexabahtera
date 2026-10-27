// Pradipta: salinan SEO & H1 (pola Lampiran A). Isi panjang halaman: pradipta.content.ts.
// Kata kunci utama "template landing page SMA" (judul, meta, H1, kalimat pertama pembuka); pendukung "landing page SPMB"
// dan "website SPMB SMA" (isi halaman). Tidak memakai frasa milik Bestari ("template website SMA") atau Cakrawala
// ("SMK & SMA") sebagai judul. Jujur: formulir tanya SPMB hanya menyusun pesan WhatsApp untuk panitia; TIDAK ada
// pendaftaran di website, penyimpanan data, pembayaran online, e-rapor, atau sistem akademik. Demo memakai nama
// "SMA Negeri 1 Purbolinggo" sebagai contoh; data demo lainnya fiktif.
import type { TemplateSeoCopy } from '../../seo/templateSeo';
import type { TemplatePageCopy } from './page.types';

export const seo: TemplateSeoCopy = {
  title: '{nama}: Template Landing Page SMA & SPMB – {harga_singkat}',
  // Pembuka meta menyebut ciri khasnya (thumbnail slide & formulir tanya SPMB), bukan fitur yang juga dimiliki Jumantara/Nawasena
  description:
    'Template landing page SMA negeri: thumbnail slide & tanya SPMB. {harga} sudah termasuk hosting & SSL tahun pertama; domain mulai {domain_mulai}/tahun.',
  niche: 'Landing Page SMA',
  // Isi halaman (pradipta.ts, pradipta.content.ts) terakhir diubah: lastmod sitemap
  updated: '2026-10-27',
};

export const page: TemplatePageCopy = {
  h1: '{nama}: Template Landing Page SMA dengan SPMB',
  niche: 'landing page SMA',
};
