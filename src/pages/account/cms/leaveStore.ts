// Pertanyaan "tinggalkan halaman?" yang sedang menunggu jawaban, dibaca LeaveDialog lewat useSyncExternalStore.
// Hanya satu pertanyaan sekaligus: pertanyaan baru membatalkan yang lama.

export interface LeaveRequest {
  message: string;
  resolve: (leave: boolean) => void;
}

let current: LeaveRequest | null = null;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

export const subscribeLeave = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getLeaveRequest = () => current;

/** Jawab pertanyaan yang terbuka (true = tinggalkan halaman). Tidak ada pertanyaan → tidak terjadi apa-apa. */
export function settleLeave(leave: boolean) {
  const request = current;
  if (!request) return;
  current = null;
  emit();
  request.resolve(leave);
}

export function requestLeave(message: string): Promise<boolean> {
  settleLeave(false);
  return new Promise((resolve) => {
    current = { message, resolve };
    emit();
  });
}
