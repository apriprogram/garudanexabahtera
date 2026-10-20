import type { ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';

export type NoticeTone = 'info' | 'success' | 'warning' | 'danger';

const TONE: Record<NoticeTone, { box: string; icon: ReactNode }> = {
  info: {
    box: 'bg-brand-50 text-brand-800 ring-brand-100',
    icon: <Info className="h-[18px] w-[18px] text-primary" aria-hidden />,
  },
  success: {
    box: 'bg-success-50 text-success-700 ring-success/20',
    icon: <CircleCheck className="h-[18px] w-[18px] text-success" aria-hidden />,
  },
  warning: {
    box: 'bg-warning-50 text-warning-700 ring-warning/25',
    icon: <TriangleAlert className="h-[18px] w-[18px] text-warning" aria-hidden />,
  },
  danger: {
    box: 'bg-danger-50 text-danger-700 ring-danger/20',
    icon: <CircleAlert className="h-[18px] w-[18px] text-danger" aria-hidden />,
  },
};

interface NoticeProps {
  tone?: NoticeTone;
  title?: ReactNode;
  children?: ReactNode;
  /** Tombol/tautan di bawah isi */
  action?: ReactNode;
  onClose?: () => void;
  className?: string;
}

/** Kotak pemberitahuan (sukses, gagal, peringatan, info). Gagal/peringatan dibacakan pembaca layar. */
export function Notice({ tone = 'info', title, children, action, onClose, className = '' }: NoticeProps) {
  const style = TONE[tone];
  const urgent = tone === 'danger' || tone === 'warning';
  return (
    <div
      role={urgent ? 'alert' : 'status'}
      className={`flex gap-3 rounded-2xl px-4 py-3.5 text-sm ring-1 ring-inset ${style.box} ${className}`}
    >
      <span className="mt-px shrink-0">{style.icon}</span>
      <div className="min-w-0 flex-1 leading-relaxed">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5 opacity-90' : ''}>{children}</div>}
        {action && <div className="mt-3 flex flex-wrap gap-2">{action}</div>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup pemberitahuan"
          className="relative -mr-1 -mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full opacity-70 transition-opacity after:absolute after:-inset-2 hover:opacity-100"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  );
}
