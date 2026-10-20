// Notifikasi melayang (toast) untuk CMS: sukses simpan, gagal simpan, item dihapus (+ Urungkan). State: useToast.ts.
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';

export type ToastTone = 'success' | 'danger' | 'info';

export interface ToastData {
  id: number;
  tone: ToastTone;
  message: string;
  action?: { label: string; onClick: () => void };
}

const ICON = {
  success: <CircleCheck className="h-5 w-5 shrink-0 text-success" aria-hidden />,
  danger: <CircleAlert className="h-5 w-5 shrink-0 text-danger" aria-hidden />,
  info: <Info className="h-5 w-5 shrink-0 text-primary" aria-hidden />,
};

/** Toast di bawah layar (HP: selebar layar dikurangi gutter; desktop: kanan bawah). */
export function Toast({ toast, onClose }: { toast: ToastData | null; onClose: () => void }) {
  return (
    <div
      aria-live={toast?.tone === 'danger' ? 'assertive' : 'polite'}
      className="pointer-events-none fixed inset-x-0 bottom-[max(16px,env(safe-area-inset-bottom))] z-50 flex justify-center px-4 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:px-0"
    >
      {toast && (
        <div
          key={toast.id}
          role={toast.tone === 'danger' ? 'alert' : 'status'}
          className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl bg-surface px-4 py-3 shadow-float ring-1 ring-inset ring-line"
        >
          <span className="mt-px">{ICON[toast.tone]}</span>
          <p className="min-w-0 flex-1 text-sm leading-relaxed text-fg">{toast.message}</p>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick();
                onClose();
              }}
              className="relative -my-1 shrink-0 rounded-full px-2.5 py-1 text-sm font-semibold text-primary transition-colors after:absolute after:-inset-1.5 hover:bg-brand-50"
            >
              {toast.action.label}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup notifikasi"
            className="relative -mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-subtle transition-colors after:absolute after:-inset-2 hover:bg-alt hover:text-fg"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
