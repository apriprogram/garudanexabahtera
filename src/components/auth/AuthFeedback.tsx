// Umpan balik form auth: pemberitahuan di dalam kartu (gagal, peringatan, sukses, info) dan tombol kirim
// pill biru brand dengan status memproses.
import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, CircleAlert, CircleCheck, Info, LoaderCircle, TriangleAlert, X } from 'lucide-react';

export type AuthAlertTone = 'danger' | 'warning' | 'success' | 'info';

const TONE: Record<AuthAlertTone, { box: string; icon: ReactNode }> = {
  danger: {
    box: 'bg-danger-50 text-danger-700 ring-danger/20',
    icon: <CircleAlert className="h-[18px] w-[18px] text-danger" aria-hidden />,
  },
  warning: {
    box: 'bg-warning-50 text-warning-700 ring-warning/25',
    icon: <TriangleAlert className="h-[18px] w-[18px] text-warning" aria-hidden />,
  },
  success: {
    box: 'bg-success-50 text-success-700 ring-success/20',
    icon: <CircleCheck className="h-[18px] w-[18px] text-success" aria-hidden />,
  },
  info: {
    box: 'bg-brand-50 text-brand-800 ring-brand-100',
    icon: <Info className="h-[18px] w-[18px] text-primary" aria-hidden />,
  },
};

interface AuthAlertProps {
  tone: AuthAlertTone;
  title?: ReactNode;
  children?: ReactNode;
  onClose?: () => void;
  id?: string;
  /** `bottom` (default): di atas form, beri jarak bawah. `top`: di bawah field, beri jarak atas. */
  spacing?: 'bottom' | 'top';
}

/**
 * Pemberitahuan di dalam kartu, muncul/hilang dengan tinggi yang mengalir halus.
 * Bungkus dengan <AnimatePresence initial={false}> agar animasi keluar berjalan.
 * Gagal/peringatan dibacakan langsung oleh pembaca layar (role="alert").
 */
export function AuthAlert({ tone, title, children, onClose, id, spacing = 'bottom' }: AuthAlertProps) {
  const reduce = useReducedMotion();
  const style = TONE[tone];
  const urgent = tone === 'danger' || tone === 'warning';
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={reduce ? { duration: 0 } : { duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
      className="overflow-hidden"
    >
      <div className={spacing === 'bottom' ? 'pb-5' : 'pt-3'}>
        <div
          id={id}
          role={urgent ? 'alert' : 'status'}
          className={`flex gap-3 rounded-2xl px-4 py-3 text-[13px] leading-relaxed ring-1 ring-inset sm:text-sm ${style.box}`}
        >
          <span className="mt-px shrink-0">{style.icon}</span>
          <div className="min-w-0 flex-1">
            {title && <p className="font-semibold">{title}</p>}
            {children && <div className={title ? 'mt-0.5 opacity-90' : ''}>{children}</div>}
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
      </div>
    </motion.div>
  );
}

interface AuthSubmitProps {
  loading: boolean;
  loadingText?: string;
  children: ReactNode;
}

/** Tombol kirim penuh: pill biru brand, panah bergeser saat hover, spinner + teks saat memproses. */
export function AuthSubmit({ loading, loadingText = 'Memproses...', children }: AuthSubmitProps) {
  return (
    <button
      type="submit"
      disabled={loading}
      aria-busy={loading || undefined}
      className="group/btn relative mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-[13px] font-semibold tracking-[-0.01em] text-white transition-[background-color,transform] duration-200 after:absolute after:inset-x-0 after:-inset-y-1 hover:bg-primary-hover active:scale-[0.98] active:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-primary disabled:active:scale-100 motion-reduce:active:scale-100 sm:h-12 sm:text-[15px] sm:after:hidden"
    >
      {loading ? (
        <>
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          {loadingText}
        </>
      ) : (
        <>
          {children}
          <ArrowRight
            className="h-4 w-4 transition-transform duration-200 group-hover/btn:translate-x-1 motion-reduce:transition-none"
            aria-hidden
          />
        </>
      )}
    </button>
  );
}
