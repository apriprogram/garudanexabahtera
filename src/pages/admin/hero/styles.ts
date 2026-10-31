import { cn } from '../../../components/admin/ui';

/*
 * Kotak unggah (label) bergaris putus-putus; status seret-lepas → cobalt. Dipakai gambar, logo, dan video hero.
 * disabled: selama menyimpan (input di dalamnya juga dinonaktifkan), tanpa efek hover.
 * relative: input file sr-only (position absolute) di dalamnya harus berpatokan ke kotak ini. Tanpa itu patokannya panel
 * Modal (overflow-hidden), jadi panel ikut bisa digulir dan fokus ke input setelah memilih file menggulirnya: judul
 * modal hilang ke atas dan ada ruang kosong di bawah footer (modal proyek, pemilik 2026-11-01).
 */
export const dropZoneClass = (active: boolean, shape: string, disabled = false) =>
  cn(
    'group relative flex flex-col items-center justify-center gap-1.5 border-2 border-dashed transition-colors duration-150',
    'focus-within:ring-2 focus-within:ring-cobalt',
    shape,
    disabled
      ? 'cursor-not-allowed border-adm-line-strong opacity-60'
      : cn('cursor-pointer', active ? 'border-cobalt bg-adm-cobalt-soft' : 'border-adm-line-strong hover:border-cobalt hover:bg-adm-hover'),
  );
