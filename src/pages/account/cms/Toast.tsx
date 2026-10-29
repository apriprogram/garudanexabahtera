// Notifikasi melayang (toast) akun pembeli: sukses simpan, gagal simpan, item dihapus (+ Urungkan). State: useToast.ts.
// Tampilan bersama admin: components/feedback/FloatingToast.tsx (kartu di atas tengah layar).
import { FloatingToast } from '../../../components/feedback/FloatingToast';

export type ToastTone = 'success' | 'danger' | 'info';

export interface ToastData {
  id: number;
  tone: ToastTone;
  message: string;
  /** Kalimat kedua opsional di bawah judul, mis. pesan galat dari server. */
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function Toast({ toast, onClose }: { toast: ToastData | null; onClose: () => void }) {
  return (
    <FloatingToast
      variant="account"
      toast={
        toast && {
          id: toast.id,
          tone: toast.tone === 'danger' ? 'error' : toast.tone,
          title: toast.message,
          description: toast.description,
          action: toast.action,
        }
      }
      onClose={onClose}
    />
  );
}
