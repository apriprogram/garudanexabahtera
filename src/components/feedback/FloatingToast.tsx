// Notifikasi melayang (toast) bersama panel admin dan akun pembeli.
// - Bentuk: kartu putih rounded dengan ikon bulat berwarna di kiri, judul, deskripsi opsional, tombol aksi
//   (mis. Urungkan), dan tombol tutup.
// - Letak: di atas tengah layar.
// - State tetap di hook tiap area:
//   - admin: pages/admin/template-orders/shared/hooks.ts useToast + <Toast> di shared/OrderUi.tsx
//   - akun: pages/account/cms/useToast.ts + <Toast> di cms/Toast.tsx
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

export type FloatingToastTone = 'success' | 'error' | 'info' | 'warning' | 'neutral';

export interface FloatingToastData {
  id: number;
  tone: FloatingToastTone;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

/** admin = token adm-* (tema terang & gelap panel admin); account = token situs (akun pembeli, terang). */
export type FloatingToastVariant = 'admin' | 'account';

const STYLE = {
  admin: {
    card: 'bg-adm-surface ring-adm-line',
    title: 'text-adm-fg',
    description: 'text-adm-muted',
    action: 'bg-adm-surface text-adm-fg ring-adm-line-strong hover:bg-adm-hover',
    close: 'text-adm-subtle hover:bg-adm-hover hover:text-adm-fg',
    neutral: 'bg-adm-subtle',
    focus: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt',
    closeLabel: 'Tutup',
  },
  account: {
    card: 'bg-surface ring-line',
    title: 'text-fg',
    description: 'text-muted',
    action: 'bg-surface text-fg ring-line-strong hover:bg-alt',
    close: 'text-subtle hover:bg-alt hover:text-fg',
    neutral: 'bg-subtle',
    focus: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
    closeLabel: 'Tutup notifikasi',
  },
} as const;

const TONE_BG: Record<Exclude<FloatingToastTone, 'neutral'>, string> = {
  success: 'bg-success',
  error: 'bg-danger',
  info: 'bg-primary',
  warning: 'bg-warning',
};

/** Isi ikon (putih di atas lingkaran berwarna): centang, tanda seru, atau huruf i. */
function ToneGlyph({ tone }: { tone: FloatingToastTone }) {
  if (tone === 'success') {
    return <path d="M6.25 10.4l2.5 2.5 5-5.4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />;
  }
  if (tone === 'error' || tone === 'warning') {
    return (
      <>
        <rect x="9" y="4.75" width="2" height="7" rx="1" />
        <circle cx="10" cy="14.6" r="1.2" />
      </>
    );
  }
  return (
    <>
      <circle cx="10" cy="5.6" r="1.2" />
      <rect x="9" y="8.25" width="2" height="7" rx="1" />
    </>
  );
}

export function FloatingToast({
  toast,
  onClose,
  variant,
}: {
  toast: FloatingToastData | null;
  onClose: () => void;
  variant: FloatingToastVariant;
}) {
  const s = STYLE[variant];
  const urgent = toast?.tone === 'error';
  return (
    <div
      aria-live={urgent ? 'assertive' : 'polite'}
      className="pointer-events-none fixed inset-x-0 top-[max(16px,env(safe-area-inset-top))] z-[150] flex justify-center px-4 sm:top-6"
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            role={urgent ? 'alert' : 'status'}
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
            className={`pointer-events-auto flex w-full max-w-[560px] items-start gap-3.5 rounded-2xl px-4 py-3.5 shadow-float ring-1 ring-inset sm:px-5 sm:py-4 ${s.card}`}
          >
            {/* Ikon sedikit lebih besar dari teks (22px) agar jenis notifikasinya langsung terbaca */}
            <span
              className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-white ${
                toast.tone === 'neutral' ? s.neutral : TONE_BG[toast.tone]
              }`}
              aria-hidden
            >
              <svg viewBox="0 0 20 20" className="h-[22px] w-[22px]" fill="currentColor">
                <ToneGlyph tone={toast.tone} />
              </svg>
            </span>
            <div className="min-w-0 flex-1 pt-px">
              <p className={`text-[15px] font-medium leading-snug ${s.title}`}>{toast.title}</p>
              {toast.description && <p className={`mt-1 text-sm leading-relaxed ${s.description}`}>{toast.description}</p>}
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.onClick();
                    onClose();
                  }}
                  className={`mt-3 inline-flex h-9 items-center rounded-lg px-3.5 text-sm font-medium shadow-sm ring-1 ring-inset transition-colors ${s.action} ${s.focus}`}
                >
                  {toast.action.label}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={s.closeLabel}
              className={`relative -mr-1 -mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors after:absolute after:-inset-1.5 ${s.close} ${s.focus}`}
            >
              <X className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
