// Primitif kecil CMS (tema terang, token dari src/index.css): sakelar, kotak pemberitahuan, penghitung karakter.
import type { ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Teks untuk pembaca layar, mis. "Tampilkan bagian Testimoni" */
  label: string;
  disabled?: boolean;
  id?: string;
}

/** Sakelar on/off (role="switch"); tampak 24px, area sentuh 44px. */
export function Switch({ checked, onChange, label, disabled, id }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors after:absolute after:-inset-2.5 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-primary hover:bg-primary-hover' : 'bg-line-strong hover:bg-subtle'
      }`}
    >
      <span
        aria-hidden
        className={`inline-block h-5 w-5 rounded-full bg-white shadow-soft transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
      />
    </button>
  );
}

export type NoticeTone = 'info' | 'success' | 'warning' | 'danger';

const NOTICE_TONE: Record<NoticeTone, { box: string; icon: ReactNode }> = {
  info: { box: 'bg-brand-50 text-brand-800 ring-brand-100', icon: <Info className="h-[18px] w-[18px] text-primary" aria-hidden /> },
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

/** Kotak pemberitahuan di dalam halaman. */
export function Notice({
  tone = 'info',
  title,
  children,
  action,
  className = '',
}: {
  tone?: NoticeTone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const style = NOTICE_TONE[tone];
  return (
    <div
      role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}
      className={`flex gap-3 rounded-2xl px-4 py-3.5 text-sm ring-1 ring-inset ${style.box} ${className}`}
    >
      <span className="mt-px shrink-0">{style.icon}</span>
      <div className="min-w-0 flex-1 leading-relaxed">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5 opacity-90' : ''}>{children}</div>}
        {action && <div className="mt-3 flex flex-wrap gap-2">{action}</div>}
      </div>
    </div>
  );
}

/** Penghitung karakter "12/120"; merah bila melewati batas. */
export function CharCount({ length, max, id }: { length: number; max: number; id?: string }) {
  const over = length > max;
  const near = !over && length >= max * 0.9;
  return (
    <span
      id={id}
      aria-live={near || over ? 'polite' : 'off'}
      className={`shrink-0 text-xs tabular-nums ${over ? 'font-medium text-danger' : near ? 'text-warning-700' : 'text-subtle'}`}
    >
      {length}/{max}
    </span>
  );
}
