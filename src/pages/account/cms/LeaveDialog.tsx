// Dialog "tinggalkan halaman?" untuk penjaga perubahan belum disimpan (useLeaveGuard), pengganti window.confirm.
// Gaya sama dengan dialog konfirmasi akun (ConfirmDialog): latar gelap transparan tanpa blur, di HP lembar dari bawah,
// Esc/klik latar = tetap di halaman. Masuk & keluar beranimasi (latar memudar, panel naik); dimatikan bila pengguna
// memilih kurangi gerakan.
import { useEffect, useId, useSyncExternalStore } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import { getLeaveRequest, settleLeave, subscribeLeave } from './leaveStore';

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const stay = () => settleLeave(false);

export default function LeaveDialog() {
  const request = useSyncExternalStore(subscribeLeave, getLeaveRequest, () => null);
  const open = !!request;
  const titleId = useId();
  const descId = useId();
  const dialogRef = useFocusTrap<HTMLDivElement>(open, { onEscape: stay });

  // Kunci gulir halaman di belakang dialog
  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {request && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6">
            <motion.div
              className="absolute inset-0 bg-fg/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={stay}
              aria-hidden
            />
            <motion.div
              ref={dialogRef}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={descId}
              tabIndex={-1}
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.24, ease: EASE_OUT } }}
              exit={{ opacity: 0, y: 16, scale: 0.98, transition: { duration: 0.16, ease: 'easeIn' } }}
              className="relative w-full rounded-t-[24px] bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-float ring-1 ring-line focus:outline-none sm:max-w-md sm:rounded-[24px] sm:p-6"
            >
              <h2 id={titleId} className="text-base font-semibold text-fg sm:text-lg">
                Perubahan belum disimpan
              </h2>
              <p id={descId} className="mt-2 text-sm leading-relaxed text-muted">
                {request.message}
              </p>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" className="btn btn-outline" onClick={stay}>
                  Tetap di sini
                </button>
                <button type="button" className="btn btn-danger" onClick={() => settleLeave(true)}>
                  Tinggalkan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
