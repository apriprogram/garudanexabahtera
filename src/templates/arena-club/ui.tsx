// Komponen kecil Arena Club: label pil bergaris, tombol pil ↗, dan tombol panah rel (Sebelumnya/Berikutnya).
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode, type RefObject } from 'react';
import { usePrefersReducedMotion } from '../shared/motion';
import { ActionLink } from '../shared/Shell';
import type { LinkAction } from '../shared/utils';
import { C } from './styles';

/** Label section: pil kecil bergaris tipis (bukan teks kapital beraksen seperti template lain). */
export function SectionPill({ children, tone = 'light', className = '' }: { children: ReactNode; tone?: 'light' | 'dark'; className?: string }) {
  if (!children) return null;
  const look = tone === 'dark' ? 'text-white ring-white/30' : `${C.ink} ring-[#0B1220]/15 bg-white`;
  return (
    <p className={`inline-flex w-fit max-w-full items-center rounded-full px-3.5 py-1 text-[13px] font-medium ring-1 ring-inset ${look} ${className}`}>
      <span className="truncate">{children}</span>
    </p>
  );
}

/** Tombol pil dengan ikon ↗ di dalam label. Tanpa aksi atau label → tidak dirender. */
export function PillLink({
  action,
  label,
  className,
  onNavigate,
  ariaLabel,
}: {
  action: LinkAction | null;
  label: string;
  className: string;
  onNavigate?: () => void;
  ariaLabel?: string;
}) {
  if (!action || !label) return null;
  return (
    <ActionLink action={action} className={className} onNavigate={onNavigate} aria-label={ariaLabel}>
      <span className="truncate">{label}</span>
      <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden />
    </ActionLink>
  );
}

/**
 * Tombol ← → untuk rel gulir horizontal. Menggeser satu kartu; tombol dinonaktifkan di ujung rel. Rel yang tidak
 * perlu digulir (semua kartu muat) → tombol disembunyikan.
 */
export function RailArrows({ railRef, className = '', label }: { railRef: RefObject<HTMLElement | null>; className?: string; label: string }) {
  const reduced = usePrefersReducedMotion();
  const [state, setState] = useState({ scrollable: false, atStart: true, atEnd: false });

  const measure = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const max = rail.scrollWidth - rail.clientWidth;
    const next = { scrollable: max > 4, atStart: rail.scrollLeft <= 4, atEnd: rail.scrollLeft >= max - 4 };
    setState((prev) => (prev.scrollable === next.scrollable && prev.atStart === next.atStart && prev.atEnd === next.atEnd ? prev : next));
  }, [railRef]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const frame = window.requestAnimationFrame(measure);
    rail.addEventListener('scroll', measure, { passive: true });
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(rail);
    return () => {
      window.cancelAnimationFrame(frame);
      rail.removeEventListener('scroll', measure);
      observer?.disconnect();
    };
  }, [railRef, measure]);

  const move = (dir: 1 | -1) => {
    const rail = railRef.current;
    if (!rail) return;
    const card = rail.querySelector<HTMLElement>(':scope > *');
    const step = card ? card.getBoundingClientRect().width + 20 : rail.clientWidth * 0.8;
    rail.scrollBy({ left: dir * step, behavior: reduced ? 'auto' : 'smooth' });
  };

  if (!state.scrollable) return null;
  const btn =
    'flex h-11 w-11 items-center justify-center rounded-full text-[#0B1220] ring-1 ring-inset ring-[#0B1220]/15 transition-colors hover:bg-[#0B1220]/[0.05] disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent';
  return (
    <div className={`flex items-center gap-2 ${className}`} role="group" aria-label={label}>
      <button type="button" className={btn} onClick={() => move(-1)} disabled={state.atStart} aria-label="Sebelumnya">
        <ArrowLeft className="h-[18px] w-[18px]" aria-hidden />
      </button>
      <button type="button" className={btn} onClick={() => move(1)} disabled={state.atEnd} aria-label="Berikutnya">
        <ArrowRight className="h-[18px] w-[18px]" aria-hidden />
      </button>
    </div>
  );
}
