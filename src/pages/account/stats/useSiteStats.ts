// Muat statistik kunjungan satu situs untuk satu rentang (customer_get_site_stats, docs/platform/SITE-STATS-SPEC.md §3).
// Pola hasil-berkunci sama dengan useSiteLoader: hasil disimpan bersama kuncinya (situs + rentang + muat ulang), kunci
// beda = sedang memuat. Saat rentang diganti, data rentang sebelumnya tetap ditampilkan (redup) sampai yang baru tiba.
import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiGet, errorMessage } from '../../../lib/api';
import type { SiteStatsRange, SiteStatsResponse } from '../../../types/siteStats';
import { normalizeStats } from './statsModel';

export const STATS_LOAD_ERROR = 'Statistik gagal dimuat. Silakan coba lagi.';
const STATS_NOT_READY = 'Statistik belum siap. Coba lagi nanti.';

export type StatsLoad =
  | { status: 'loading'; previous: SiteStatsResponse | null }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: SiteStatsResponse };

type Settled = Exclude<StatsLoad, { status: 'loading' }>;

/** Pesan galat yang aman ditampilkan: 503 STATS_NOT_READY (tabel belum ada), jaringan, atau pesan server. */
function statsError(err: unknown): string {
  if (err instanceof ApiError && err.code === 'STATS_NOT_READY') return err.message || STATS_NOT_READY;
  if (err instanceof ApiError) return errorMessage(err, STATS_LOAD_ERROR);
  return STATS_LOAD_ERROR;
}

/** `siteId` 0 = tidak ada permintaan (halaman menampilkan "Situs tidak ditemukan"). */
export function useSiteStats(siteId: number, range: SiteStatsRange) {
  const [result, setResult] = useState<{ key: string; siteId: number; value: Settled } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = `${siteId}:${range}:${reloadKey}`;

  useEffect(() => {
    if (!siteId) return;
    let cancelled = false;
    const key = `${siteId}:${range}:${reloadKey}`;
    apiGet<unknown>('customer_get_site_stats', { site_id: siteId, range })
      .then((raw) => {
        if (!cancelled) setResult({ key, siteId, value: { status: 'ready', data: normalizeStats(raw, range) } });
      })
      .catch((err: unknown) => {
        if (!cancelled) setResult({ key, siteId, value: { status: 'error', message: statsError(err) } });
      });
    return () => {
      cancelled = true;
    };
  }, [siteId, range, reloadKey]);

  const kept = result && result.siteId === siteId && result.value.status === 'ready' ? result.value.data : null;
  const load: StatsLoad = result?.key === requestKey ? result.value : { status: 'loading', previous: kept };
  const retry = useCallback(() => setReloadKey((k) => k + 1), []);
  return { load, retry };
}
