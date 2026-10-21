import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { LoaderCircle } from 'lucide-react';
import { useFocusTrap } from '../../../hooks/useFocusTrap';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  loading?: boolean;
  /** Pesan gagal dari aksi konfirmasi (tampil di dalam dialog) */
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Dialog konfirmasi terang. Di HP tampil sebagai lembar dari bawah. Esc / klik latar = batal.
 * Fokus terkunci di dalam dialog (useFocusTrap): mulai di tombol batal (elemen fokus pertama), Tab berputar di antara
 * kedua tombol, dan fokus kembali ke pemicu saat ditutup. Selama memuat kedua tombol nonaktif, jadi fokus dipindah ke
 * kotak dialog agar tidak jatuh ke <body> (di luar dialog modal).
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Kembali',
  tone = 'primary',
  loading = false,
  error,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useFocusTrap<HTMLDivElement>(open, {
    onEscape: () => {
      if (!loading) onClose();
    },
  });

  // Kunci gulir halaman di belakang dialog
  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  // Tombol nonaktif tidak bisa memegang fokus: saat memuat, fokus ke kotak dialog (tetap di dalam dialog)
  const wasLoading = useRef(loading);
  useEffect(() => {
    if (open && loading && !wasLoading.current) dialogRef.current?.focus({ preventScroll: true });
    wasLoading.current = loading;
  }, [open, loading, dialogRef]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-fg/30" onClick={() => !loading && onClose()} aria-hidden />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        aria-busy={loading || undefined}
        tabIndex={-1}
        className="relative w-full rounded-t-[24px] bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-float ring-1 ring-line focus:outline-none sm:max-w-md sm:rounded-[24px] sm:p-6"
      >
        <h2 id={titleId} className="text-base font-semibold text-fg sm:text-lg">
          {title}
        </h2>
        {description && (
          <div id={descId} className="mt-2 text-sm leading-relaxed text-muted">
            {description}
          </div>
        )}
        {error && (
          <p className="mt-3 rounded-xl bg-danger-50 px-3 py-2.5 text-sm text-danger-700" role="alert">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
