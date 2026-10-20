import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, HelpCircle, X } from 'lucide-react';
import { cn } from './cn';
import { renderIcon, type IconLike } from './icon';
import { Button, IconButton } from './Button';

const FOCUSABLE = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';
const SIZES = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-xl',
  lg: 'sm:max-w-3xl',
  xl: 'sm:max-w-5xl',
  full: 'sm:max-w-[min(1280px,calc(100vw-48px))]',
} as const;
export type ModalSize = keyof typeof SIZES;

/*
 * Kunci scroll bersama untuk Modal & Drawer: nilai overflow asli disimpan saat kunci pertama dipasang dan
 * dikembalikan saat kunci terakhir dilepas, sehingga urutan buka/tutup lapisan bertumpuk tidak meninggalkan
 * body dalam keadaan terkunci.
 */
let lockCount = 0;
let savedOverflow = '';
function lockScroll() {
  if (lockCount === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  lockCount += 1;
}
function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) document.body.style.overflow = savedOverflow;
}

/** Kandidat fokus awal: kontrol form yang terlihat (bukan file/hidden/disabled). */
function firstFocusable(panel: HTMLElement | null) {
  if (!panel) return null;
  const nodes = Array.from(
    panel.querySelectorAll<HTMLElement>('input:not([type=hidden]):not([type=file]):not([disabled]),textarea:not([disabled]),select:not([disabled])'),
  ).filter((n) => n.offsetParent !== null);
  return nodes[0] ?? null;
}

/** Portal ke akar .admin-panel supaya token tema (adm-*) tetap berlaku. */
function getPortalRoot() {
  if (typeof document === 'undefined') return null;
  return (document.querySelector('.admin-panel') as HTMLElement | null) ?? document.body;
}

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  icon?: IconLike;
  eyebrow?: ReactNode;
  size?: ModalSize;
  /** Tombol aksi (rata kanan; di HP bertumpuk) */
  footer?: ReactNode;
  closeOnOverlay?: boolean;
  hideClose?: boolean;
  initialFocus?: RefObject<HTMLElement | null>;
  /**
   * true → children dirender langsung tanpa pembungkus body (pakai <ModalBody>/<ModalFooter> sendiri,
   * mis. saat body + footer dibungkus <form>). Bungkus form dengan `flex min-h-0 flex-1 flex-col`.
   */
  customBody?: boolean;
  className?: string;
  bodyClassName?: string;
  /** z-index lapisan (default 100) */
  zIndex?: number;
  /** id elemen di dalam panel yang menamai dialog bila tidak ada title/eyebrow */
  labelledBy?: string;
  children?: ReactNode;
};

/**
 * Modal: overlay gelap transparan tanpa blur, panel rounded-[24px] shadow-float; di HP jadi bottom-sheet.
 * ESC menutup, fokus dikurung, scroll halaman dikunci.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  eyebrow,
  size = 'md',
  footer,
  closeOnOverlay = true,
  hideClose,
  initialFocus,
  customBody,
  className,
  bodyClassName,
  zIndex = 100,
  labelledBy,
  children,
}: ModalProps) {
  const root = getPortalRoot();
  const panelRef = useRef<HTMLDivElement>(null);
  const lastActive = useRef<Element | null>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return undefined;
    lastActive.current = document.activeElement;
    lockScroll();
    const t = window.setTimeout(() => {
      const panel = panelRef.current;
      const target = initialFocus?.current || panel?.querySelector<HTMLElement>('[data-autofocus]') || firstFocusable(panel) || panel;
      target?.focus({ preventScroll: true });
    }, 30);
    return () => {
      window.clearTimeout(t);
      unlockScroll();
      const el = lastActive.current as HTMLElement | null;
      if (el && typeof el.focus === 'function') el.focus({ preventScroll: true });
    };
  }, [open, initialFocus]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key === 'Tab' && panelRef.current) {
      const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null);
      if (!nodes.length) {
        e.preventDefault();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  if (!root) return null;
  const hasHead = !!(title || eyebrow);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 flex items-end justify-center sm:items-center sm:p-6" style={{ zIndex }} onKeyDown={onKeyDown}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-adm-overlay"
            onClick={closeOnOverlay ? onClose : undefined}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={hasHead ? titleId : labelledBy}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            className={cn(
              'relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[24px] bg-adm-surface text-adm-fg shadow-float outline-none ring-1 ring-adm-line',
              'max-sm:pb-[env(safe-area-inset-bottom)] sm:max-h-[88vh] sm:rounded-[24px]',
              SIZES[size],
              className,
            )}
          >
            {/* Pegangan bottom-sheet di HP */}
            <span className="mx-auto mt-2 block h-1 w-10 shrink-0 rounded-full bg-adm-line-strong sm:hidden" aria-hidden />
            {hasHead ? (
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-adm-line px-5 py-4 sm:px-6">
                <div className="flex min-w-0 items-start gap-3">
                  {icon && (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-adm-muted ring-1 ring-inset ring-adm-line">
                      {renderIcon(icon, 'h-[18px] w-[18px]')}
                    </span>
                  )}
                  <div className={cn('min-w-0', icon && !description && !eyebrow && 'flex min-h-9 flex-col justify-center')}>
                    {eyebrow && (
                      <span className="mb-2 inline-flex rounded-lg bg-adm-ghost px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-adm-muted">{eyebrow}</span>
                    )}
                    {title && (
                      <h2 id={titleId} className="text-base font-semibold leading-snug tracking-tight text-adm-fg sm:text-lg">
                        {title}
                      </h2>
                    )}
                    {description && (
                      <p id={descId} className="mt-1 text-[13px] leading-relaxed text-adm-muted sm:text-sm">
                        {description}
                      </p>
                    )}
                  </div>
                </div>
                {!hideClose && <IconButton icon={<X />} label="Tutup" variant="soft" size="sm" onClick={onClose} className="-mr-1 shrink-0" />}
              </div>
            ) : (
              !hideClose && (
                <div className="absolute right-4 top-4 z-10">
                  <IconButton icon={<X />} label="Tutup" variant="soft" size="sm" onClick={onClose} />
                </div>
              )
            )}
            {customBody ? children : <ModalBody className={bodyClassName}>{children}</ModalBody>}
            {footer && <ModalFooter>{footer}</ModalFooter>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    root,
  );
}

/** Isi modal yang dapat digulir. */
export function ModalBody({ className, children }: { className?: string; children?: ReactNode }) {
  return <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6', className)}>{children}</div>;
}

/** Footer modal: tombol rata kanan; di HP bertumpuk (aksi utama di atas). */
export function ModalFooter({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <div className={cn('flex shrink-0 flex-col-reverse gap-2 border-t border-adm-line px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6', className)}>
      {children}
    </div>
  );
}

export type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => unknown;
  title?: ReactNode;
  description?: ReactNode;
  confirmText?: ReactNode;
  cancelText?: ReactNode;
  tone?: 'danger' | 'default';
  loading?: boolean;
  icon?: IconLike;
  children?: ReactNode;
};

/** Dialog konfirmasi (hapus, dll.). onConfirm dipanggil apa adanya; pemanggil yang menutup bila perlu. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Kamu yakin?',
  description,
  confirmText,
  cancelText = 'Batal',
  tone = 'default',
  loading,
  icon,
  children,
}: ConfirmDialogProps) {
  const isDanger = tone === 'danger';
  const tid = useId();
  return (
    <Modal open={open} onClose={loading ? () => {} : onClose} size="sm" hideClose closeOnOverlay={!loading} bodyClassName="pt-6" zIndex={110} labelledBy={tid}>
      <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
        <span className={cn('mb-4 flex h-11 w-11 items-center justify-center rounded-xl', isDanger ? 'bg-adm-danger-soft text-adm-danger-fg' : 'bg-adm-cobalt-soft text-adm-cobalt-fg')}>
          {renderIcon(icon || (isDanger ? <AlertTriangle /> : <HelpCircle />), 'h-5 w-5')}
        </span>
        <h2 id={tid} className="text-base font-semibold tracking-tight text-adm-fg sm:text-lg">{title}</h2>
        {description && <div className="mt-1.5 text-sm leading-relaxed text-adm-muted">{description}</div>}
        {children && <div className="mt-4 w-full">{children}</div>}
      </div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {/* Aksi berbahaya: fokus awal di Batal agar Enter beruntun tidak langsung menghapus */}
        <Button variant="secondary" onClick={onClose} disabled={loading} data-autofocus={isDanger || undefined}>
          {cancelText}
        </Button>
        <Button variant={isDanger ? 'danger' : 'primary'} onClick={() => onConfirm()} loading={loading} data-autofocus={!isDanger || undefined}>
          {confirmText || (isDanger ? 'Ya, hapus' : 'Ya, lanjutkan')}
        </Button>
      </div>
    </Modal>
  );
}

/**
 * Panel geser dari kanan (drawer) — untuk form panjang/detail. Di HP jadi bottom-sheet penuh.
 */
export function Drawer({
  open,
  onClose,
  title,
  description,
  footer,
  width = 'sm:max-w-lg',
  customBody,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  width?: string;
  customBody?: boolean;
  children?: ReactNode;
}) {
  const root = getPortalRoot();
  // onClose sering berupa fungsi inline (identitas baru tiap render): simpan di ref agar efek kunci hanya bergantung pada `open`
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!open) return undefined;
    lockScroll();
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && onCloseRef.current();
    document.addEventListener('keydown', onKey);
    return () => {
      unlockScroll();
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  if (!root) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-end sm:items-stretch">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-adm-overlay" onClick={onClose} aria-hidden />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            className={cn(
              'relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[24px] bg-adm-surface text-adm-fg shadow-float ring-1 ring-adm-line',
              'max-sm:pb-[env(safe-area-inset-bottom)] sm:m-2 sm:max-h-none sm:rounded-[20px]',
              width,
            )}
          >
            {title && (
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-adm-line px-5 py-4 sm:px-6">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold tracking-tight text-adm-fg sm:text-lg">{title}</h2>
                  {description && <p className="mt-1 text-[13px] text-adm-muted sm:text-sm">{description}</p>}
                </div>
                <IconButton icon={<X />} label="Tutup" variant="soft" size="sm" onClick={onClose} />
              </div>
            )}
            {customBody ? children : <ModalBody>{children}</ModalBody>}
            {footer && <ModalFooter>{footer}</ModalFooter>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    root,
  );
}

export default Modal;
