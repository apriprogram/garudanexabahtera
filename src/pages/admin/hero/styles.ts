import { cn } from '../../../components/admin/ui';

/*
 * Kotak unggah (label) bergaris putus-putus; status seret-lepas → cobalt. Dipakai gambar, logo, dan video hero.
 * disabled: selama menyimpan (input di dalamnya juga dinonaktifkan), tanpa efek hover.
 */
export const dropZoneClass = (active: boolean, shape: string, disabled = false) =>
  cn(
    'group flex flex-col items-center justify-center gap-1.5 border-2 border-dashed transition-colors duration-150',
    'focus-within:ring-2 focus-within:ring-cobalt',
    shape,
    disabled
      ? 'cursor-not-allowed border-adm-line-strong opacity-60'
      : cn('cursor-pointer', active ? 'border-cobalt bg-adm-cobalt-soft' : 'border-adm-line-strong hover:border-cobalt hover:bg-adm-hover'),
  );
