// State satu toast CMS; toast hilang otomatis (sukses 3,5 dtk, info 6 dtk, gagal 8 dtk).
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ToastData, ToastTone } from './Toast';

const DURATION: Record<ToastTone, number> = { success: 3500, info: 6000, danger: 8000 };

export function useToast() {
  const [toast, setToast] = useState<ToastData | null>(null);
  const counter = useRef(0);

  const dismiss = useCallback(() => setToast(null), []);
  const show = useCallback((tone: ToastTone, message: string, action?: ToastData['action']) => {
    counter.current += 1;
    setToast({ id: counter.current, tone, message, action });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast((current) => (current?.id === toast.id ? null : current)), DURATION[toast.tone]);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return { toast, show, dismiss };
}
