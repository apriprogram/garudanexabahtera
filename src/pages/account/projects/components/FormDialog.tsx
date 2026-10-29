// Light dialog with a form inside (approve & sign, request revision). Bottom sheet on phones, centered card from sm.
// Accessible: role dialog + aria-modal, labelled by its title, focus moves to the first field and stays inside
// (Tab cycles), Escape / backdrop close unless busy, focus returns to the opener, page scroll locked while open.
// Escape pressed inside a dialog opened on top of this one (e.g. a delete confirmation) only closes that dialog.
import { useEffect, useId, useRef, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { LoaderCircle, X } from 'lucide-react';

const FOCUSABLE = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

interface FormDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  /** submit button text and icon */
  submitLabel: string;
  submitIcon?: ReactNode;
  cancelLabel?: string;
  busy?: boolean;
  /** message from the server, shown above the buttons */
  error?: string | null;
  onSubmit: () => void;
  onClose: () => void;
  children: ReactNode;
}

export function FormDialog({
  open,
  title,
  description,
  submitLabel,
  submitIcon,
  cancelLabel = 'Batal',
  busy = false,
  error,
  onSubmit,
  onClose,
  children,
}: FormDialogProps) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  // Latest values for the Escape handler without re-running the open effect
  const latest = useRef({ busy, onClose });
  useEffect(() => {
    latest.current = { busy, onClose };
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>('input:not([type=checkbox]):not([disabled]),textarea:not([disabled])');
    (first ?? panel)?.focus();
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape' || latest.current.busy) return;
      const owner = e.target instanceof Element ? e.target.closest('[role="dialog"],[role="alertdialog"]') : null;
      if (owner && owner !== panel) return;
      latest.current.onClose();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open]);

  // Keep Tab inside the dialog
  const trapTab = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;
    const nodes = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter((n) => n.tabIndex >= 0);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!open) return null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!busy) onSubmit();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-fg/30" onClick={() => !busy && onClose()} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        onKeyDown={trapTab}
        className="relative flex max-h-[92dvh] w-full flex-col rounded-t-[24px] bg-surface shadow-float ring-1 ring-line outline-none sm:max-h-[min(90dvh,860px)] sm:max-w-xl sm:rounded-[24px]"
      >
        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-fg sm:text-lg">
              {title}
            </h2>
            {description && (
              <div id={descId} className="mt-1 text-sm leading-relaxed text-muted">
                {description}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Tutup"
            className="relative -mr-1.5 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-subtle transition-colors after:absolute after:-inset-1 hover:bg-alt hover:text-fg disabled:opacity-50"
          >
            <X className="h-[18px] w-[18px]" aria-hidden />
          </button>
        </div>
        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 pb-2 sm:px-6">{children}</div>
          <div className="border-t border-line px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-6">
            {error && (
              <p className="mb-3 rounded-xl bg-danger-50 px-3 py-2.5 text-sm text-danger-700" role="alert">
                {error}
              </p>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>
                {cancelLabel}
              </button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : submitIcon}
                {submitLabel}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
