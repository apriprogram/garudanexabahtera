import { cn } from './cn';

const SIZES = { xs: 'h-3.5 w-3.5 border-[1.5px]', sm: 'h-4 w-4 border-2', md: 'h-6 w-6 border-2', lg: 'h-8 w-8 border-[2.5px]' };

/** Pemutar memuat. Warna mengikuti `currentColor` (atur lewat text-*). */
export function Spinner({ size = 'md', className, label }: { size?: keyof typeof SIZES; className?: string; label?: string }) {
  return (
    <span
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('inline-block shrink-0 animate-spin rounded-full border-current border-t-transparent', SIZES[size], className)}
    />
  );
}

export default Spinner;
