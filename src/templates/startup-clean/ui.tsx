// Komponen kecil Startup Clean: label pil, judul section, bintang, dan kartu angka kaca (tanpa bayangan).
import { Star, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { CountUp, Reveal } from '../shared/Animated';
import { FONT_DISPLAY, MEASURE, SURFACE } from '../shared/layout';
import { H2, LEAD, isRating } from './styles';

/** Label pil di atas judul: titik aksen + teks accent-ink di atas putih (kontras ≥ 4.5:1). */
export function Eyebrow({ children, icon, glass = false }: { children: ReactNode; icon?: ReactNode; glass?: boolean }) {
  if (!children) return null;
  const surface = glass ? 'bg-white/80 ring-(--tpl-accent-200) backdrop-blur' : 'bg-white ring-black/[0.08]';
  return (
    <p
      className={`inline-flex max-w-full items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-semibold text-(--tpl-accent-ink) ring-1 ring-inset ${surface}`}
    >
      {icon ?? <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-(--tpl-accent)" />}
      <span className="truncate">{children}</span>
    </p>
  );
}

/** Eyebrow + H2 + deskripsi; muncul pelan saat digulir. */
export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  className = '',
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: 'center' | 'left';
  className?: string;
}) {
  if (!eyebrow && !title && !subtitle) return null;
  const center = align === 'center';
  return (
    <Reveal className={`${center ? `${MEASURE} text-center` : 'max-w-[720px]'} ${className}`}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      {title && <h2 className={`${eyebrow ? 'mt-5' : ''} text-balance ${H2}`}>{title}</h2>}
      {subtitle && <p className={`mt-5 max-w-[60ch] ${center ? 'mx-auto' : ''} ${LEAD}`}>{subtitle}</p>}
    </Reveal>
  );
}

/** Lima bintang dekoratif warna aksen. */
export function Stars({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <span className="flex gap-0.5 text-(--tpl-accent)" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`${className} fill-current`} strokeWidth={1.5} />
      ))}
    </span>
  );
}

/**
 * Kartu angka kaca (hero & badge cerita): angka berjalan + bintang bila nilainya rating + keterangan.
 * `icon` hanya untuk angka biasa (lingkaran aksen di kiri).
 */
export function GlassStat({ value, label, icon = true, className = '' }: { value: string; label: string; icon?: boolean; className?: string }) {
  const rating = isRating(value);
  return (
    <div className={`${SURFACE.glass} flex items-center gap-3 px-3.5 py-3 text-left @3xl:gap-3.5 @3xl:px-4 @3xl:py-3.5 @5xl:px-5 @5xl:py-4 ${className}`}>
      {icon && !rating && (
        <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--tpl-accent) text-(--tpl-on-accent) @xl:flex @5xl:h-11 @5xl:w-11">
          <TrendingUp className="h-5 w-5" aria-hidden />
        </span>
      )}
      <div className="min-w-0">
        <p className={`${FONT_DISPLAY} text-[20px] font-bold leading-none tracking-[-0.02em] text-fg @3xl:text-[24px] @5xl:text-[28px]`}>
          <CountUp value={value} />
        </p>
        {rating && <Stars className="mt-1.5 h-3.5 w-3.5" />}
        {label && <p className="mt-1.5 truncate text-[12px] font-medium text-muted @3xl:text-[13px]">{label}</p>}
      </div>
    </div>
  );
}
