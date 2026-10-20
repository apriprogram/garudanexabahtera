import type { ReactNode } from 'react';
import { cn } from './cn';
import { type IconLike } from './icon';
import { IconBox, InfoTip, Panel, type IconBoxTone } from './Panel';
import { DeltaPill, type Tone } from './Badge';

export type StatTileProps = {
  title: ReactNode;
  value: ReactNode;
  suffix?: ReactNode;
  icon?: IconLike;
  tone?: IconBoxTone;
  info?: string;
  delta?: ReactNode;
  deltaTone?: Tone;
  caption?: ReactNode;
  chart?: ReactNode;
  action?: ReactNode;
  loading?: boolean;
  /** Sembunyikan kotak ikon di HP agar muat di grid 2 kolom */
  compact?: boolean;
  onClick?: () => void;
  className?: string;
};

/** Kartu statistik: judul + angka besar (22/30px tabular) + delta + keterangan/mini chart. */
export function StatTile({ title, value, suffix, icon, tone = 'default', info, delta, deltaTone, caption, chart, action, loading, compact, onClick, className }: StatTileProps) {
  return (
    <Panel className={cn('flex flex-col', className)} interactive={!!onClick} onClick={onClick}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex min-w-0 items-center gap-1.5 text-[13px] font-semibold text-adm-fg sm:text-[14px]">
          <span className="truncate">{title}</span>
          <InfoTip text={info} />
        </h3>
        {action}
      </div>
      <div className="mt-3 flex items-center gap-3 sm:mt-4">
        {icon && <IconBox icon={icon} tone={tone} className={compact ? 'max-sm:hidden' : undefined} />}
        {loading ? (
          <span className="h-8 w-24 animate-pulse rounded-lg bg-adm-ghost" />
        ) : (
          <p className="flex min-w-0 items-baseline gap-1 text-[22px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-adm-fg sm:text-[30px] sm:tracking-[-0.03em]">
            <span className="truncate">{value ?? '—'}</span>
            {suffix && <span className="text-sm font-medium tracking-normal text-adm-subtle">{suffix}</span>}
          </p>
        )}
        {!loading && <DeltaPill tone={deltaTone}>{delta}</DeltaPill>}
      </div>
      {(chart || caption) && (
        <div className="mt-3 flex min-h-[36px] items-end gap-3 sm:mt-4 sm:gap-4">
          {chart && <div className="w-[46%] shrink-0">{loading ? <span className="block h-8 animate-pulse rounded-lg bg-adm-ghost" /> : chart}</div>}
          {caption && <p className="min-w-0 flex-1 text-xs leading-relaxed text-adm-muted">{caption}</p>}
        </div>
      )}
    </Panel>
  );
}

/** Sparkline garis halus (SVG). */
export function Sparkline({ values = [], height = 36, color = '#3765F6', className, label }: { values?: number[]; height?: number; color?: string; className?: string; label?: string }) {
  const pts = values.length > 1 ? values : [0, ...(values.length ? values : [0])];
  const w = 120;
  const max = Math.max(1, ...pts);
  const min = Math.min(0, ...pts);
  const xy = pts.map((v, i) => [(i / (pts.length - 1)) * w, height - 4 - ((v - min) / (max - min || 1)) * (height - 8)]);
  let d = `M${xy[0][0]},${xy[0][1]}`;
  for (let i = 1; i < xy.length; i++) {
    const [x0, y0] = xy[i - 1];
    const [x1, y1] = xy[i];
    const cx = (x0 + x1) / 2;
    d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className={cn('block h-9 w-full overflow-visible', className)} role="img" aria-label={label || 'Tren'}>
      <path d={d} fill="none" stroke={color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Batang mini (aktivitas). */
export function MiniBars({ values = [], className, label }: { values?: number[]; className?: string; label?: string }) {
  const max = Math.max(1, ...values);
  return (
    <div className={cn('flex h-9 items-end gap-[3px]', className)} role="img" aria-label={label || 'Batang aktivitas'}>
      {(values.length ? values : [0]).map((v, i) => (
        <span key={i} className={cn('min-w-[3px] flex-1 rounded-sm', i === values.length - 1 ? 'bg-cobalt' : 'bg-cobalt/60')} style={{ height: `${Math.max(8, (v / max) * 100)}%` }} />
      ))}
    </div>
  );
}

const BAR_TONES: Record<Tone, string> = { cobalt: 'bg-cobalt', mint: 'bg-adm-mint-fg', warning: 'bg-warning', danger: 'bg-danger', mist: 'bg-mist-500' };

/** Bar progres tipis. */
export function ThinProgress({ value = 0, max = 100, tone = 'cobalt', className, label }: { value?: number; max?: number; tone?: Tone; className?: string; label?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div
      className={cn('h-2 w-full overflow-hidden rounded-full bg-adm-ghost', className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <span className={cn('block h-full rounded-full transition-[width] duration-500', BAR_TONES[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default StatTile;
