// Muat satu situs milik pembeli (customer_get_site) bersama data halaman (mis. daftar tulisan, pengaturan SEO) secara
// paralel. Dipakai halaman Berita & Pengumuman dan SEO. Pola hasil-berkunci sama dengan SiteEditor: hasil disimpan
// bersama kuncinya (situs + muat ulang), kunci beda = sedang memuat, jadi effect tidak perlu setState sinkron.
import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiGet, errorMessage } from '../../../lib/api';
import type { Site } from '../../../types/platform';

export type SiteLoad<T> =
  | { status: 'loading' }
  | { status: 'not_found' }
  | { status: 'error'; message: string }
  | { status: 'ready'; site: Site; data: T };

type Settled<T> = Exclude<SiteLoad<T>, { status: 'loading' }>;

/** id situs dari parameter rute (":siteId"); bukan angka → 0 (= tidak ditemukan). */
export const parseSiteId = (raw: string | undefined): number => (/^\d+$/.test(raw ?? '') && Number(raw) > 0 ? Number(raw) : 0);

/**
 * `fetchData` harus stabil (fungsi tingkat modul): ia ikut kunci effect. Situs tidak ada / bukan milik pembeli
 * (404/403 dari salah satu permintaan) = not_found; galat lain = error dengan pesan yang aman ditampilkan.
 */
export function useSiteLoader<T>(siteId: number, fetchData: (siteId: number) => Promise<T>, errorText: string) {
  const [result, setResult] = useState<{ key: string; value: Settled<T> } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = `${siteId}:${reloadKey}`;
  const load: SiteLoad<T> = !siteId ? { status: 'not_found' } : result?.key === requestKey ? result.value : { status: 'loading' };

  useEffect(() => {
    if (!siteId) return;
    let cancelled = false;
    const key = `${siteId}:${reloadKey}`;
    Promise.all([apiGet<{ site: Site }>('customer_get_site', { site_id: siteId }), fetchData(siteId)])
      .then(([{ site }, data]) => {
        if (!cancelled) setResult({ key, value: { status: 'ready', site, data } });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const value: Settled<T> =
          err instanceof ApiError && (err.status === 404 || err.status === 403)
            ? { status: 'not_found' }
            : { status: 'error', message: errorMessage(err, errorText) };
        setResult({ key, value });
      });
    return () => {
      cancelled = true;
    };
  }, [siteId, reloadKey, fetchData, errorText]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  /** Ubah data yang sudah dimuat (mis. tulisan dihapus) tanpa memuat ulang. */
  const updateData = useCallback((update: (data: T) => T) => {
    setResult((prev) => (prev && prev.value.status === 'ready' ? { ...prev, value: { ...prev.value, data: update(prev.value.data) } } : prev));
  }, []);

  /** Server menjawab SITE_SUSPENDED saat menyimpan: tandai situs nonaktif (halaman jadi hanya-baca). */
  const markSuspended = useCallback(() => {
    setResult((prev) =>
      prev && prev.value.status === 'ready' ? { ...prev, value: { ...prev.value, site: { ...prev.value.site, status: 'suspended' } } } : prev,
    );
  }, []);

  return { load, reload, updateData, markSuspended };
}
