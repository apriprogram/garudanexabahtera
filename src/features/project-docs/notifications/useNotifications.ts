// In-app notifications of the logged-in user (spec §5 pd_notifications_list / pd_notifications_read): loads on mount,
// then every 60 s while the browser tab is visible (a hidden tab does not poll; it refreshes as soon as it becomes
// visible again when the last load is older than the interval). The backend creates the due-soon / overdue invoice
// notices lazily inside pd_notifications_list, so polling also keeps those current. Marking read is optimistic.
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, errorMessage } from '../../../lib/api';
import { pdNotificationsList, pdNotificationsRead } from '../api';
import type { PdNotification } from '../types';

export const POLL_INTERVAL_MS = 60_000;

export interface NotificationsState {
  items: PdNotification[];
  unread: number;
  /** loading = nothing loaded yet; error = the last load failed and nothing was loaded before */
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  /** time of the last successful load (ms), the reference for "5 menit lalu" */
  loadedAt: number;
}

const isVisible = () => typeof document === 'undefined' || document.visibilityState !== 'hidden';

export function useNotifications() {
  const [state, setState] = useState<NotificationsState>({ items: [], unread: 0, status: 'loading', error: null, loadedAt: 0 });
  const lastLoad = useRef(0);
  // Not logged in any more / no access: stop asking (the auth wrapper handles the redirect on 401)
  const stopped = useRef(false);

  // setState only in the promise callbacks, so the effect below may call load() directly
  const load = useCallback((): Promise<void> => {
    if (stopped.current) return Promise.resolve();
    lastLoad.current = Date.now();
    return pdNotificationsList().then(
      (res) =>
        setState({
          items: Array.isArray(res.notifications) ? res.notifications : [],
          unread: Math.max(0, Number(res.unread) || 0),
          status: 'ready',
          error: null,
          loadedAt: Date.now(),
        }),
      (err: unknown) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) stopped.current = true;
        const message = errorMessage(err, 'Gagal memuat notifikasi.');
        setState((prev) => ({ ...prev, status: prev.status === 'ready' ? 'ready' : 'error', error: message }));
      },
    );
  }, []);

  useEffect(() => {
    if (isVisible()) void load();
    const timer = window.setInterval(() => {
      if (isVisible()) void load();
    }, POLL_INTERVAL_MS);
    const onVisibility = () => {
      if (isVisible() && Date.now() - lastLoad.current >= POLL_INTERVAL_MS) void load();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [load]);

  /** Marks one notification read (no-op when it already is); reloads when the server refuses. */
  const markRead = useCallback(
    (notification: PdNotification) => {
      if (notification.read) return;
      const { id } = notification;
      setState((prev) => ({
        ...prev,
        items: prev.items.map((n) => (n.id === id ? { ...n, read: true } : n)),
        unread: Math.max(0, prev.unread - 1),
      }));
      pdNotificationsRead({ id }).catch(() => void load());
    },
    [load],
  );

  /** Marks every notification read. */
  const markAllRead = useCallback(() => {
    setState((prev) => ({ ...prev, items: prev.items.map((n) => (n.read ? n : { ...n, read: true })), unread: 0 }));
    pdNotificationsRead({ all: true }).catch(() => void load());
  }, [load]);

  return { ...state, reload: load, markRead, markAllRead };
}
