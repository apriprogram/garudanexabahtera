// Building blocks of the customer project pages: status pill, progress bar, stage stepper, section card.
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import type { Stage } from '../../../../features/project-docs/types';
import { visibleStages, type StatusView, type Tone } from './projectCopy';

const TONE_CLASS: Record<Tone, { pill: string; dot: string }> = {
  warning: { pill: 'bg-warning-50 text-warning-700 ring-warning/25', dot: 'bg-warning' },
  brand: { pill: 'bg-brand-50 text-brand-700 ring-brand-200', dot: 'bg-primary' },
  info: { pill: 'bg-brand-50 text-brand-800 ring-brand-100', dot: 'bg-brand-400' },
  success: { pill: 'bg-success-50 text-success-700 ring-success/25', dot: 'bg-success' },
  danger: { pill: 'bg-danger-50 text-danger-700 ring-danger/20', dot: 'bg-danger' },
  neutral: { pill: 'bg-alt text-muted ring-line', dot: 'bg-subtle' },
};

/** Pill with a colored dot (same look as the order StatusPill). */
export function TonePill({ view, className = '' }: { view: StatusView; className?: string }) {
  const tone = TONE_CLASS[view.tone];
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-medium ring-1 ring-inset ${tone.pill} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} aria-hidden />
      {view.label}
    </span>
  );
}

/** Weighted milestone progress (0–100) with its number. */
export function ProgressBar({ value, label = 'Progres pengerjaan', className = '' }: { value: number; label?: string; className?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="text-muted">{label}</span>
        <span className="font-semibold tabular-nums text-fg">{pct}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="mt-1.5 h-2 overflow-hidden rounded-full bg-alt ring-1 ring-inset ring-line"
      >
        <div className="h-full rounded-full bg-primary transition-[width] duration-500 ease-calm" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/**
 * Project stages in order (PROJECT-DOCS-SPEC §2): done steps checked, the current one ringed. One row that scrolls
 * sideways inside the card on narrow screens (the current step is scrolled into view), never the page.
 */
export function StageStepper({ stage, hasMaintenance }: { stage: Stage; hasMaintenance: boolean }) {
  const stages = visibleStages(stage, hasMaintenance);
  const current = Math.max(0, stages.findIndex((s) => s.key === stage));
  const finished = stage === 'selesai';
  const rowRef = useRef<HTMLOListElement>(null);
  const currentRef = useRef<HTMLLIElement>(null);

  // Center the current step in the scroll row (only the row scrolls, not the page)
  useLayoutEffect(() => {
    const row = rowRef.current;
    const item = currentRef.current;
    if (!row || !item || row.scrollWidth <= row.clientWidth) return;
    row.scrollLeft = Math.max(0, item.offsetLeft - (row.clientWidth - item.offsetWidth) / 2);
  }, [stage]);

  return (
    <div>
      <p className="text-[13px] text-muted">
        Tahap <span className="font-semibold tabular-nums text-fg">{current + 1}</span> dari{' '}
        <span className="tabular-nums">{stages.length}</span>
        <span aria-hidden> · </span>
        <span className="font-semibold text-fg">{stages[current]?.label}</span>
      </p>
      <ol ref={rowRef} aria-label="Tahapan proyek" className="no-scrollbar -mx-1 mt-4 flex overflow-x-auto px-1 pb-1">
        {stages.map((s, i) => {
          const done = i < current || finished;
          const active = i === current && !finished;
          return (
            <li
              key={s.key}
              ref={i === current ? currentRef : undefined}
              aria-current={active ? 'step' : undefined}
              className="relative flex min-w-[84px] flex-1 flex-col items-center text-center"
            >
              {i > 0 && (
                <span className={`absolute right-1/2 top-3.5 h-0.5 w-full -translate-y-1/2 ${done || active ? 'bg-primary' : 'bg-line'}`} aria-hidden />
              )}
              <span
                className={`relative z-[1] flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${
                  done ? 'bg-primary text-white' : active ? 'bg-surface text-primary ring-2 ring-primary' : 'bg-surface text-subtle ring-1 ring-inset ring-line-strong'
                }`}
                aria-hidden
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className={`mt-2 px-1 text-xs leading-snug ${active ? 'font-semibold text-fg' : done ? 'text-muted' : 'text-subtle'}`}>
                {s.label}
                <span className="sr-only">{done ? ' (selesai)' : active ? ' (tahap saat ini)' : ''}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Card with an icon title, optional count and action on the right. */
export function SectionCard({
  title,
  icon,
  count,
  aside,
  children,
  className = '',
  id,
}: {
  title: string;
  icon: ReactNode;
  count?: number;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} aria-label={headingId ? undefined : title} className={`card-site p-5 sm:p-6 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id={headingId} className="flex min-w-0 items-center gap-2 text-[15px] font-semibold text-fg sm:text-base">
          <span className="shrink-0 text-primary">{icon}</span>
          <span className="truncate">{title}</span>
          {count !== undefined && <span className="rounded-full bg-alt px-2 py-0.5 text-xs font-medium tabular-nums text-muted">{count}</span>}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
