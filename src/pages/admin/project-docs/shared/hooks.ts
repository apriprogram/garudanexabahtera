// Hooks shared by the admin project-docs pages: data loading through the typed pd_* wrappers
// (src/features/project-docs/api.ts, POST only), the viewer's role, the unsaved-changes guard and the toast that
// travels to the next page.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ApiError, errorMessage } from '../../../../lib/api';
import { getCurrentUser } from '../../../../lib/auth';
import { DEVELOPER_DOC_TYPES, type DocType } from '../../../../features/project-docs/types';
import type { ToastTone } from '../../template-orders/shared/hooks';

/** Toast halaman (useToast().show): drawer, modal, dan panel melapor lewat callback ini, bukan merender <Toast> sendiri. */
export type Notify = (tone: ToastTone, message: string, description?: string) => void;

/** Kalimat kedua toast galat: pesan dari server, atau ajakan mencoba lagi. */
export const errorDetail = (err: unknown) => errorMessage(err, 'Terjadi kesalahan. Coba lagi.');

/**
 * State navigasi antarhalaman proyek. `toast` = hasil aksi yang langsung diikuti pindah halaman (dokumen dibuat lalu
 * editornya dibuka, draft dihapus lalu kembali ke workspace): toast halaman asal ikut hilang saat halaman itu ditutup,
 * jadi halaman tujuan yang menampilkannya lewat useNavToast.
 */
export interface PdNavState {
  toast?: { tone: ToastTone; message: string; description?: string };
}

/** Opsi navigate() yang membawa toast ke halaman berikutnya. */
export const navToast = (tone: ToastTone, message: string, description?: string): { state: PdNavState } => ({
  state: { toast: { tone, message, ...(description ? { description } : {}) } },
});

/**
 * Menampilkan sekali toast dari halaman sebelumnya (PdNavState.toast) begitu halaman siap (`ready`: <Toast> sudah
 * dirender), lalu menghapus state itu dari riwayat agar tidak muncul lagi saat halaman dimuat ulang.
 */
export function useNavToast(show: Notify, ready: boolean) {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = (location.state as PdNavState | null)?.toast;
  const { pathname, search, hash } = location;
  useEffect(() => {
    if (!toast || !ready) return;
    show(toast.tone, toast.message, toast.description);
    navigate(`${pathname}${search}${hash}`, { replace: true, state: null });
  }, [toast, ready, show, navigate, pathname, search, hash]);
}

type QueryState<T> = { key: string; data: T | null; error: string | null; notFound: boolean };

/**
 * Runs `fetcher` when `key` changes or reload() is called (null key = do not load). Old data stays visible while
 * reloading; `initialLoading` = no answer yet (show a skeleton), `loading` = the newest request is still running.
 */
export function usePdQuery<T>(key: string | null, fetcher: () => Promise<T>) {
  const [nonce, setNonce] = useState(0);
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });
  const requestKey = key === null ? null : `${key}#${nonce}`;
  const [state, setState] = useState<QueryState<T> | null>(null);

  useEffect(() => {
    if (requestKey === null) return undefined;
    let active = true;
    fetcherRef
      .current()
      .then((data) => {
        if (active) setState({ key: requestKey, data, error: null, notFound: false });
      })
      .catch((err: unknown) => {
        if (!active) return;
        const notFound = err instanceof ApiError && err.status === 404;
        setState((prev) => ({ key: requestKey, data: notFound ? null : (prev?.data ?? null), error: errorMessage(err, 'Gagal memuat data.'), notFound }));
      });
    return () => {
      active = false;
    };
  }, [requestKey]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  /** Local update (optimistic) without a reload. */
  const mutate = useCallback((fn: (data: T) => T) => {
    setState((prev) => (prev && prev.data != null ? { ...prev, data: fn(prev.data) } : prev));
  }, []);

  return {
    data: state?.data ?? null,
    error: state?.error ?? null,
    notFound: state?.notFound ?? false,
    loading: requestKey !== null && state?.key !== requestKey,
    initialLoading: requestKey !== null && state === null,
    reload,
    mutate,
  };
}

/** Role of the logged-in staff member (spec §0: admin = Administrator, user = Developer). */
export function useViewer() {
  const [viewer] = useState(getCurrentUser);
  const isAdmin = viewer?.role === 'admin';
  return {
    viewer,
    isAdmin,
    /** Developer may create/save/submit/withdraw only BRD, Jadwal and UAT (enforced by the backend too). */
    canEditType: (type: DocType) => isAdmin || DEVELOPER_DOC_TYPES.includes(type),
  };
}

/**
 * Unsaved-changes guard for a BrowserRouter app (useBlocker needs a data router): warns on reload/close and catches
 * clicks on in-app links anywhere on the page (sidebar, breadcrumbs, back links). `pending` holds the blocked path;
 * the page shows a ConfirmDialog and calls proceed() or cancel().
 */
export function useUnsavedGuard(dirty: boolean, navigate: (to: string, options?: { state: PdNavState }) => void) {
  const [pending, setPending] = useState<string | null>(null);
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Older browsers need returnValue set to show the dialog
      e.returnValue = '';
    };
    const onClick = (e: MouseEvent) => {
      if (!dirtyRef.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const to = `${url.pathname}${url.search}${url.hash}`;
      if (to === `${window.location.pathname}${window.location.search}${window.location.hash}`) return;
      e.preventDefault();
      e.stopPropagation();
      setPending(to);
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [dirty]);

  return {
    pending,
    /**
     * Ask before leaving to `to` (own buttons that navigate in code). `options` (navToast) only travels with an
     * immediate navigation; while the dialog asks, the current page still shows the caller's own toast.
     */
    request: (to: string, options?: { state: PdNavState }) => (dirtyRef.current ? setPending(to) : navigate(to, options)),
    proceed: () => {
      const to = pending;
      dirtyRef.current = false;
      setPending(null);
      if (to) navigate(to);
    },
    cancel: () => setPending(null),
  };
}

/** Field errors of an ApiError (`{errors: {field: message}}`), {} for other errors. */
export const fieldErrorsOf = (err: unknown): Record<string, string> => (err instanceof ApiError && err.fieldErrors ? err.fieldErrors : {});
