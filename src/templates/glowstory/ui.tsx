// Komponen kecil GlowStory: label section mono kapital, judul dengan kata MIRING berwarna, tombol pil + panah, bintang
// rating, dan kepala section (label + judul + deskripsi). Ditulis di folder ini (bukan dibagi dengan template lain).
import { ArrowRight, Star } from 'lucide-react';
import type { ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { ActionLink } from '../shared/Shell';
import { splitHighlight, type LinkAction } from '../shared/utils';
import { C, MONO, TYPE_G } from './styles';

/** Label section: garis pendek + teks mono kapital ("— TERLARIS"). `tone` dark = di atas pita gelap/aksen. */
export function Eyebrow({ children, tone = 'light', className = '' }: { children: ReactNode; tone?: 'light' | 'dark'; className?: string }) {
  return (
    <p className={`flex items-center gap-3 ${MONO} ${tone === 'dark' ? 'text-current opacity-80' : C.muted} ${className}`}>
      <span aria-hidden className="h-px w-6 shrink-0 bg-current opacity-60" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/** Judul dengan kata sorotan miring. `tone` light = warna aksen-teks di krem; `dark` = aksen terang di pita gelap; `plain` = miring saja. */
export function Highlighted({ title, highlight, tone = 'light' }: { title: string; highlight: string; tone?: 'light' | 'dark' | 'plain' }) {
  const parts = splitHighlight(title, highlight);
  if (!parts) return <>{title}</>;
  const [before, mark, after] = parts;
  const color = tone === 'light' ? 'text-(--gs-accent-text)' : tone === 'dark' ? 'text-(--gs-accent-light)' : '';
  return (
    <>
      {before}
      <em className={`gs-italic ${color}`}>{mark}</em>
      {after}
    </>
  );
}

/** Tombol pil + panah. Tanpa label atau aksi → tidak dirender. */
export function PillLink({
  action,
  label,
  className,
  arrow = true,
  onNavigate,
}: {
  action: LinkAction | null;
  label: string;
  className: string;
  arrow?: boolean;
  onNavigate?: () => void;
}) {
  if (!action || !label) return null;
  return (
    <ActionLink action={action} className={`group ${className}`} onNavigate={onNavigate}>
      <span className="truncate">{label}</span>
      {arrow && <ArrowRight className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />}
    </ActionLink>
  );
}

/** Lima bintang dengan isian sebagian (mis. 4,7). Label teks untuk pembaca layar dipasang pemanggil. */
export function Stars({ value, className = 'h-3.5 w-3.5' }: { value: number; className?: string }) {
  return (
    <span aria-hidden className="inline-flex items-center gap-0.5">
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <span key={i} className="relative inline-flex">
            <Star className={`${className} text-current opacity-25`} strokeWidth={1.5} />
            {fill > 0 && (
              <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star className={`${className} fill-current text-current`} strokeWidth={1.5} />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

/** Kepala section: label + judul (kata miring) kiri, deskripsi kanan (layar lebar) atau di bawah judul. */
export function SectionHead({
  eyebrow,
  title,
  highlight,
  subtitle,
  align = 'split',
  children,
}: {
  eyebrow: string;
  title: string;
  highlight: string;
  subtitle?: string;
  align?: 'split' | 'center' | 'stack';
  children?: ReactNode;
}) {
  if (!eyebrow && !title && !subtitle && !children) return null;
  if (align === 'center') {
    return (
      <div className="mx-auto max-w-[760px] text-center">
        {eyebrow && (
          <Reveal>
            <Eyebrow className="justify-center">{eyebrow}</Eyebrow>
          </Reveal>
        )}
        {title && (
          <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-4' : ''} mx-auto max-w-[18ch] text-balance ${C.ink} ${TYPE_G.h2}`}>
            <Highlighted title={title} highlight={highlight} />
          </Reveal>
        )}
        {subtitle && (
          <Reveal as="p" delay={160} className={`mx-auto mt-4 max-w-[52ch] ${TYPE_G.lead} ${C.muted}`}>
            {subtitle}
          </Reveal>
        )}
        {children}
      </div>
    );
  }
  return (
    <div className={align === 'split' ? 'grid gap-5 @5xl:grid-cols-12 @5xl:items-end @5xl:gap-10' : ''}>
      <div className="min-w-0 @5xl:col-span-7">
        {eyebrow && (
          <Reveal>
            <Eyebrow>{eyebrow}</Eyebrow>
          </Reveal>
        )}
        {title && (
          <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-4' : ''} max-w-[18ch] text-balance ${C.ink} ${TYPE_G.h2}`}>
            <Highlighted title={title} highlight={highlight} />
          </Reveal>
        )}
      </div>
      {(subtitle || children) && (
        <div className={`min-w-0 ${align === 'split' ? '@5xl:col-span-5 @5xl:justify-self-end @5xl:pb-2' : 'mt-4'}`}>
          {subtitle && (
            <Reveal as="p" delay={160} className={`max-w-[46ch] ${TYPE_G.lead} ${C.muted}`}>
              {subtitle}
            </Reveal>
          )}
          {children}
        </div>
      )}
    </div>
  );
}
