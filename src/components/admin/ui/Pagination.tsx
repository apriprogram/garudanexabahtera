import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn, FOCUS_INSET } from './cn';

function pagesToShow(page: number, total: number): (number | string)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, page, page - 1, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((p) => set.add(p));
  if (page >= total - 2) [total - 1, total - 2, total - 3].forEach((p) => set.add(p));
  const arr = [...set].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | string)[] = [];
  arr.forEach((p, i) => {
    if (i && p - arr[i - 1] > 1) out.push(`gap-${p}`);
    out.push(p);
  });
  return out;
}

const BTN = cn(
  'relative inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-[13px] font-medium tabular-nums transition-colors disabled:pointer-events-none disabled:opacity-40',
  'max-sm:after:absolute max-sm:after:-inset-y-1.5 max-sm:after:inset-x-0',
  FOCUS_INSET,
);
const IDLE = 'bg-adm-surface text-adm-muted ring-1 ring-inset ring-adm-line hover:bg-adm-hover hover:text-adm-fg';

export type PaginationProps = {
  page: number;
  totalPages: number;
  onChange?: (page: number) => void;
  /** total & perPage → "Menampilkan 11–20 dari 42" */
  total?: number;
  perPage?: number;
  /** Teks ringkasan kustom di kiri */
  summary?: ReactNode;
  className?: string;
};

/** Pagination: ringkasan di kiri, tombol angka 32px di kanan (aktif cobalt). */
export function Pagination({ page, totalPages, onChange, total, perPage, summary, className }: PaginationProps) {
  const tp = Math.max(1, totalPages || 1);
  const from = total != null && perPage ? Math.min(total, (page - 1) * perPage + 1) : null;
  const to = total != null && perPage ? Math.min(total, page * perPage) : null;
  const go = (p: number) => {
    const n = Math.max(1, Math.min(tp, p));
    if (n !== page) onChange?.(n);
  };
  return (
    <nav aria-label="Navigasi halaman" className={cn('flex flex-col items-center justify-between gap-3 sm:flex-row', className)}>
      <p className="text-[13px] text-adm-muted">
        {summary ??
          (from != null ? (
            <>
              Menampilkan <span className="font-semibold tabular-nums text-adm-fg">{from}–{to}</span> dari{' '}
              <span className="font-semibold tabular-nums text-adm-fg">{total}</span>
            </>
          ) : (
            <>
              Halaman <span className="font-semibold text-adm-fg">{page}</span> dari {tp}
            </>
          ))}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-1">
        <button type="button" className={cn(BTN, IDLE, 'px-0')} onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Halaman sebelumnya">
          <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
        </button>
        {pagesToShow(page, tp).map((p) =>
          typeof p === 'string' ? (
            <span key={p} className="px-1 text-adm-subtle" aria-hidden>
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => go(p)}
              aria-current={p === page ? 'page' : undefined}
              aria-label={`Halaman ${p}`}
              className={cn(BTN, p === page ? 'bg-cobalt text-white ring-1 ring-inset ring-cobalt' : IDLE)}
            >
              {p}
            </button>
          ),
        )}
        <button type="button" className={cn(BTN, IDLE, 'px-0')} onClick={() => go(page + 1)} disabled={page >= tp} aria-label="Halaman berikutnya">
          <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
    </nav>
  );
}

export default Pagination;
