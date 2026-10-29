// Hook bersama halaman admin pesanan template, Project Clients, dan Dashboard.
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet, errorMessage } from '../../../../lib/api';

type QueryState<T> = { key: string; data: T | null; error: string | null };

/**
 * Ambil data aksi baca (GET) dan muat ulang saat `params` berubah atau `reload()` dipanggil.
 * Data lama tetap tampil selama memuat ulang (tidak berkedip); `loading` = permintaan terbaru belum selesai.
 */
export function useApiQuery<T>(action: string, params: Record<string, string | number | undefined> = {}) {
  const [nonce, setNonce] = useState(0);
  const paramsJson = JSON.stringify(params);
  const key = `${action}?${paramsJson}#${nonce}`;
  const [state, setState] = useState<QueryState<T> | null>(null);

  useEffect(() => {
    let active = true;
    const requestKey = `${action}?${paramsJson}#${nonce}`;
    apiGet<T>(action, JSON.parse(paramsJson) as Record<string, string | number | undefined>)
      .then((data) => {
        if (active) setState({ key: requestKey, data, error: null });
      })
      .catch((err: unknown) => {
        if (active) setState((prev) => ({ key: requestKey, data: prev?.data ?? null, error: errorMessage(err, 'Gagal memuat data.') }));
      });
    return () => {
      active = false;
    };
  }, [action, paramsJson, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  /** Ubah data lokal (mis. pembaruan optimistis) tanpa memuat ulang. */
  const mutate = useCallback((fn: (data: T) => T) => {
    setState((prev) => (prev && prev.data != null ? { ...prev, data: fn(prev.data) } : prev));
  }, []);

  return {
    data: state?.data ?? null,
    error: state?.error ?? null,
    /** Permintaan terbaru belum selesai (termasuk muat ulang). */
    loading: state?.key !== key,
    /** Belum ada respons sama sekali (tampilkan skeleton). */
    initialLoading: state === null,
    reload,
    mutate,
  };
}

/** Nilai yang tertunda (debounce), mis. kotak cari. */
export function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export type ToastTone = 'success' | 'error' | 'info' | 'warning';
export type ToastState = { id: number; tone: ToastTone; message: string; description?: string } | null;

/**
 * Notifikasi singkat di atas tengah layar. Pasangkan dengan komponen <Toast>.
 * - Hilang sendiri: sukses/info 4 detik, gagal/peringatan 6 detik.
 * - `description` = kalimat kedua opsional di bawah judul, mis. pesan galat dari server.
 */
export function useToast() {
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef<number | undefined>(undefined);

  const dismiss = useCallback(() => {
    window.clearTimeout(timer.current);
    setToast(null);
  }, []);

  const show = useCallback((tone: ToastTone, message: string, description?: string) => {
    window.clearTimeout(timer.current);
    setToast({ id: Date.now(), tone, message, description });
    timer.current = window.setTimeout(() => setToast(null), tone === 'error' || tone === 'warning' ? 6000 : 4000);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return { toast, show, dismiss };
}
