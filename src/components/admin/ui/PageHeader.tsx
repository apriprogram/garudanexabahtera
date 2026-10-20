import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn, FOCUS_INSET } from './cn';

export type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  /** Tombol aksi di kanan; di HP dibungkus dua per baris */
  actions?: ReactNode;
  /** Tautan kembali: { to, label } atau { onClick, label } */
  back?: { to?: string; onClick?: () => void; label?: string };
  eyebrow?: ReactNode;
  /** Chip/badge di bawah deskripsi */
  meta?: ReactNode;
  className?: string;
  children?: ReactNode;
};

/** Kepala halaman admin: judul (20/28px) + satu kalimat deskripsi + aksi di kanan. */
export function PageHeader({ title, description, actions, back, eyebrow, meta, className, children }: PageHeaderProps) {
  const backCls = cn(
    'relative mb-3 inline-flex min-h-8 items-center gap-1.5 rounded-lg text-xs font-medium text-adm-muted transition-colors hover:text-adm-fg sm:text-[13px]',
    'max-sm:after:absolute max-sm:after:-inset-1.5',
    FOCUS_INSET,
  );
  return (
    <header className={cn('mb-5 sm:mb-7', className)}>
      {back &&
        (back.to ? (
          <Link to={back.to} className={backCls}>
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            {back.label || 'Kembali'}
          </Link>
        ) : (
          <button type="button" onClick={back.onClick} className={backCls}>
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            {back.label || 'Kembali'}
          </button>
        ))}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          {eyebrow && <p className="mb-1.5 text-xs font-medium text-adm-muted sm:text-[13px]">{eyebrow}</p>}
          <h1 className="text-[20px] font-semibold leading-[1.3] tracking-[-0.01em] text-adm-fg sm:text-[28px] sm:leading-tight sm:tracking-[-0.02em]">{title}</h1>
          {description && <p className="mt-1.5 max-w-2xl text-[13px] leading-normal text-adm-muted sm:text-sm sm:leading-relaxed">{description}</p>}
          {meta && <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 max-sm:[&>*]:min-w-[calc(50%-4px)] max-sm:[&>*]:grow">{actions}</div>
        )}
      </div>
      {children && <div className="mt-5">{children}</div>}
    </header>
  );
}

export default PageHeader;
