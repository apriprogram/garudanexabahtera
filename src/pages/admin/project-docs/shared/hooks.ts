// Hooks shared by the admin project-docs pages: data loading through the typed pd_* wrappers
// (src/features/project-docs/api.ts, POST only), the viewer's role and the unsaved-changes guard.
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, errorMessage } from '../../../../lib/api';
import { getCurrentUser } from '../../../../lib/auth';
import { DEVELOPER_DOC_TYPES, type DocType } from '../../../../features/project-docs/types';

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
export function useUnsavedGuard(dirty: boolean, navigate: (to: string) => void) {
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
    /** Ask before leaving to `to` (own buttons that navigate in code). */
    request: (to: string) => (dirtyRef.current ? setPending(to) : navigate(to)),
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
