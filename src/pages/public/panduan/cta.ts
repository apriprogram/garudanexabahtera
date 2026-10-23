// Isi ajakan di akhir artikel panduan, per jenis (frontmatter `cta`, src/content/panduan/parse.ts). Label tombol
// mengikuti glosarium design.md; tanpa angka harga jasa custom.
import { LayoutTemplate, PencilRuler, ReceiptText, Smartphone } from 'lucide-react';
import type { ArticleCta } from '../../../content/panduan';
import { HUB_PATHS } from '../../../seo/paths';

export interface CtaCopy {
  title: string;
  text: string;
  primary: { label: string; to: string };
  more: { label: string; to: string; icon: typeof LayoutTemplate };
}

export const CTA_COPY: Readonly<Record<ArticleCta, CtaCopy>> = {
  template: {
    title: 'Ingin website bisnis yang cepat online?',
    text: 'Pilih template siap pakai: harganya sudah termasuk setup, domain, hosting, dan SSL tahun pertama, lalu isinya Anda ubah sendiri lewat CMS. Butuh fitur di luar template? Konsultasikan dulu, gratis.',
    primary: { label: 'Pilih Template', to: HUB_PATHS.catalog },
    more: { label: 'Lihat harga semua template', to: HUB_PATHS.pricing, icon: ReceiptText },
  },
  website: {
    title: 'Butuh website dengan fitur custom?',
    text: 'Ceritakan kebutuhan Anda lewat konsultasi gratis. Setelah itu kami kirim penawaran tertulis berisi cakupan, jadwal, dan biaya, dan pengerjaan baru dimulai setelah Anda setuju.',
    primary: { label: 'Pesan Custom', to: HUB_PATHS.customOrder },
    more: { label: 'Jasa pembuatan website custom', to: HUB_PATHS.webService, icon: PencilRuler },
  },
  mobile: {
    title: 'Punya rencana aplikasi Android atau iOS?',
    text: 'Ceritakan alur bisnis yang ingin dibuatkan aplikasinya lewat konsultasi gratis. Setelah itu kami kirim penawaran tertulis berisi cakupan, jadwal, dan biaya sebelum pengerjaan dimulai.',
    primary: { label: 'Pesan Custom', to: HUB_PATHS.customOrder },
    more: { label: 'Jasa pembuatan aplikasi Android & iOS', to: HUB_PATHS.mobileService, icon: Smartphone },
  },
};
