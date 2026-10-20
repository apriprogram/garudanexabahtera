import type { HTMLAttributes, MouseEventHandler, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { cn, FOCUS_INSET } from './cn';
import { TD_CLASS, TH_CLASS } from './styles';

/*
 * Tabel gaya admin: header ghost uppercase kecil, baris lega (h-14), garis 1px adm-line, hover adm-hover.
 *
 * <Panel padding="none">
 *   <TableContainer>                    // overflow-x-auto (scroll di dalam kartu di HP)
 *     <Table>
 *       <THead><tr><Th>Nama</Th><Th align="right">Aksi</Th></tr></THead>
 *       <TBody><Tr><Td>…</Td></Tr></TBody>
 *     </Table>
 *   </TableContainer>
 * </Panel>
 *
 * Untuk mode kartu di HP: bungkus tabel dengan `hidden md:block` dan tampilkan <MobileList> berisi <MobileCard> di `md:hidden`.
 */

export function TableContainer({ maxHeight, className, children }: { maxHeight?: number | string; className?: string; children: ReactNode }) {
  return (
    <div className={cn('w-full overflow-x-auto overscroll-x-contain', maxHeight != null && 'overflow-y-auto', className)} style={maxHeight != null ? { maxHeight } : undefined}>
      {children}
    </div>
  );
}

export function Table({ className, dense, minWidth = 640, children, ...props }: HTMLAttributes<HTMLTableElement> & { dense?: boolean; minWidth?: number | false }) {
  return (
    <table
      className={cn('w-full border-separate border-spacing-0 text-left text-sm', dense && '[&_td]:h-11 [&_td]:py-2', className)}
      style={minWidth ? { minWidth } : undefined}
      {...props}
    >
      {children}
    </table>
  );
}

/** sticky: header menempel saat TableContainer di-scroll vertikal. */
export function THead({ sticky, className, children }: { sticky?: boolean; className?: string; children: ReactNode }) {
  return <thead className={cn(sticky && '[&_th]:sticky [&_th]:top-0 [&_th]:z-[1]', className)}>{children}</thead>;
}

export function TBody({ className, children }: { className?: string; children: ReactNode }) {
  return <tbody className={cn('[&>tr:last-child>td]:border-b-0', className)}>{children}</tbody>;
}

/** Tr: onClick → baris dapat diklik. selected → sorot. */
export function Tr({ className, onClick, selected, children, ...props }: HTMLAttributes<HTMLTableRowElement> & { selected?: boolean }) {
  return (
    <tr
      onClick={onClick}
      className={cn('group/tr transition-colors', onClick && 'cursor-pointer', selected ? '[&>td]:bg-adm-cobalt-soft' : 'hover:[&>td]:bg-adm-hover', className)}
      {...props}
    >
      {children}
    </tr>
  );
}

type Align = 'left' | 'center' | 'right';

export type ThProps = ThHTMLAttributes<HTMLTableCellElement> & {
  align?: Align;
  width?: number | string;
  sort?: 'asc' | 'desc' | null;
  onSort?: () => void;
};


export function Th({ align = 'left', width, sort, onSort, className, children, ...props }: ThProps) {
  const sortable = typeof onSort === 'function';
  const Icon = sort === 'asc' ? ArrowUp : sort === 'desc' ? ArrowDown : ChevronsUpDown;
  return (
    <th
      scope="col"
      style={width != null ? { width } : undefined}
      aria-sort={sort === 'asc' ? 'ascending' : sort === 'desc' ? 'descending' : sortable ? 'none' : undefined}
      className={cn(TH_CLASS, align === 'right' && 'text-right', align === 'center' && 'text-center', className)}
      {...props}
    >
      {sortable ? (
        <button
          type="button"
          onClick={onSort}
          className={cn('inline-flex items-center gap-1 rounded-md uppercase tracking-[0.08em] hover:text-adm-fg', FOCUS_INSET, align === 'right' && 'flex-row-reverse')}
        >
          {children}
          <Icon className={cn('h-3.5 w-3.5', sort ? 'text-adm-fg' : 'text-adm-subtle')} aria-hidden />
        </button>
      ) : (
        children
      )}
    </th>
  );
}


export function Td({
  align = 'left',
  muted,
  mono,
  nowrap,
  className,
  children,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { align?: Align; muted?: boolean; mono?: boolean; nowrap?: boolean }) {
  return (
    <td
      className={cn(
        TD_CLASS,
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        muted ? 'text-adm-muted' : 'text-adm-fg',
        mono && 'font-mono tabular-nums',
        nowrap && 'whitespace-nowrap',
        className,
      )}
      {...props}
    >
      {children}
    </td>
  );
}

/** Baris kosong/memuat di dalam tabel. colSpan = jumlah kolom. */
export function TableEmpty({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-12 text-center text-sm text-adm-muted">
        {children}
      </td>
    </tr>
  );
}

/** Baris skeleton tabel. */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c} className={TD_CLASS}>
              <span className="block h-4 animate-pulse rounded-md bg-adm-ghost" style={{ width: `${40 + ((r * 7 + c * 13) % 50)}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Mode kartu di HP                                                     */
/* ------------------------------------------------------------------ */

/** Daftar kartu bertumpuk pengganti tabel di < 768px. Taruh di `md:hidden`. */
export function MobileList({ className, children }: { className?: string; children: ReactNode }) {
  return <ul className={cn('divide-y divide-adm-line', className)}>{children}</ul>;
}

export type MobileCardProps = {
  /** Baris atas: judul utama (mis. nama + avatar) */
  title: ReactNode;
  subtitle?: ReactNode;
  /** Elemen kiri (avatar/ikon) */
  leading?: ReactNode;
  /** Pojok kanan atas (status pill / menu) */
  trailing?: ReactNode;
  /** Pasangan label-nilai di bawah judul */
  meta?: { label: ReactNode; value: ReactNode }[];
  /** Tombol aksi di baris bawah */
  actions?: ReactNode;
  onClick?: () => void;
  /** Menu klik-kanan / tekan lama (sama seperti baris tabel desktop) */
  onContextMenu?: MouseEventHandler<HTMLLIElement>;
  className?: string;
  children?: ReactNode;
};

/** Satu baris tabel versi HP: judul + meta 2 kolom + aksi. */
export function MobileCard({ title, subtitle, leading, trailing, meta, actions, onClick, onContextMenu, className, children }: MobileCardProps) {
  return (
    <li className={cn('px-4 py-3.5', onClick && 'cursor-pointer active:bg-adm-hover', className)} onClick={onClick} onContextMenu={onContextMenu}>
      <div className="flex items-start gap-3">
        {leading}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-adm-fg">{title}</div>
              {subtitle && <div className="mt-0.5 truncate text-xs text-adm-muted">{subtitle}</div>}
            </div>
            {trailing && <div className="flex shrink-0 items-center gap-1.5">{trailing}</div>}
          </div>
          {meta && meta.length > 0 && (
            <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2">
              {meta.map((m, i) => (
                <div key={i} className="min-w-0">
                  <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-adm-subtle">{m.label}</dt>
                  <dd className="mt-0.5 truncate text-[13px] text-adm-fg">{m.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {children}
          {actions && <div className="mt-3 flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      </div>
    </li>
  );
}

/** Bar filter di atas tabel (di dalam Panel padding="none"): kiri segmented, kanan cari/aksi. */
export function FilterBar({ left, right, className, children }: { left?: ReactNode; right?: ReactNode; className?: string; children?: ReactNode }) {
  return (
    <div className={cn('border-b border-adm-line px-4 py-3 sm:px-5', className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {left && <div className="no-scrollbar min-w-0 overflow-x-auto">{left}</div>}
        {right && <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center lg:justify-end">{right}</div>}
      </div>
      {children}
    </div>
  );
}

export default Table;
