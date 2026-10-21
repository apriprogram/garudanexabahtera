import { cn } from '../../../components/admin/ui';

/* Kotak unggah (label) bergaris putus-putus; status seret-lepas → cobalt. Dipakai gambar, logo, dan video hero. */
export const dropZoneClass = (active: boolean, shape: string) =>
  cn(
    'group flex cursor-pointer flex-col items-center justify-center gap-1.5 border-2 border-dashed transition-colors duration-150',
    'focus-within:ring-2 focus-within:ring-cobalt',
    shape,
    active ? 'border-cobalt bg-adm-cobalt-soft' : 'border-adm-line-strong hover:border-cobalt hover:bg-adm-hover',
  );
