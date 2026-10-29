// Angka notifikasi di kanan menu sidebar admin. Sumbernya admin_dashboard_summary (staf + admin), sama dengan kartu
// "Perlu tindakan" di Dashboard:
// - order template perlu approval
// - order menunggu domain
// - pesanan custom baru dari website
// Dimuat saat dibuka, tiap 60 detik selama tab terlihat, dan saat pindah halaman (paling cepat tiap 10 detik).
// Halaman yang mengubah pesanan memanggil refreshAdminNavBadges() agar angkanya langsung ikut berubah.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ApiError, apiGet } from '../../lib/api';
import type { DashboardSummary } from '../../types/platform';
import type { AdminNavBadgeKey } from './nav';

export type AdminNavBadges = Partial<Record<AdminNavBadgeKey, number>>;

const POLL_INTERVAL_MS = 60_000;
const NAVIGATION_MIN_MS = 10_000;
const REFRESH_EVENT = 'gn:admin-nav-badges';

/** Minta sidebar memuat ulang angka notifikasi (panggil setelah approve/tolak/isi domain/ubah pesanan custom). */
export const refreshAdminNavBadges = () => window.dispatchEvent(new Event(REFRESH_EVENT));

const isVisible = () => typeof document === 'undefined' || document.visibilityState !== 'hidden';
const count = (value: unknown) => Math.max(0, Number(value) || 0);

export function useAdminNavBadges(): AdminNavBadges {
  const { pathname } = useLocation();
  const [badges, setBadges] = useState<AdminNavBadges>({});
  const lastLoad = useRef(0);
  // Hanya respons permintaan terbaru yang dipakai (permintaan bisa selesai tidak berurutan)
  const seq = useRef(0);
  // Token habis / bukan staf: berhenti meminta (redirect 401 diurus pembungkus auth)
  const stopped = useRef(false);

  // setState hanya di callback promise, jadi effect di bawah boleh memanggil load() langsung
  const load = useCallback(() => {
    if (stopped.current) return;
    lastLoad.current = Date.now();
    const id = ++seq.current;
    apiGet<DashboardSummary>('admin_dashboard_summary').then(
      (s) => {
        if (id !== seq.current) return;
        setBadges({
          approval: count(s?.template_orders?.by_status?.menunggu_approval),
          domain: count(s?.template_orders?.by_status?.proses_domain),
          customNew: count(s?.custom_projects?.from_website_pending),
        });
      },
      (err: unknown) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) stopped.current = true;
      },
    );
  }, []);

  // Saat dibuka dan setiap pindah halaman (dibatasi agar klik menu beruntun tidak membanjiri server)
  useEffect(() => {
    if (isVisible() && Date.now() - lastLoad.current >= NAVIGATION_MIN_MS) load();
  }, [pathname, load]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (isVisible()) load();
    }, POLL_INTERVAL_MS);
    const onVisibility = () => {
      if (isVisible() && Date.now() - lastLoad.current >= POLL_INTERVAL_MS) load();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener(REFRESH_EVENT, load);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener(REFRESH_EVENT, load);
    };
  }, [load]);

  return badges;
}
