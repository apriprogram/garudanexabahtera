import { useEffect, useState } from 'react';

const TIMEOUT_MS = 8000;

// Cache tingkat modul per URL: semua komponen berbagi satu request per muat halaman
const cache = new Map<string, unknown>();
const pending = new Map<string, Promise<unknown>>();

/**
 * Ambil JSON publik sekali per muat halaman. `normalize` mengubah respons mentah ke bentuk yang aman dipakai;
 * kalau request gagal, `fallback` dikembalikan dan request boleh dicoba lagi saat komponen dipasang ulang.
 */
export const loadCachedJson = <T,>(url: string, normalize: (data: unknown) => T, fallback: T): Promise<T> => {
  if (cache.has(url)) return Promise.resolve(cache.get(url) as T);
  let request = pending.get(url) as Promise<T> | undefined;
  if (!request) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
    request = fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const value = normalize(data);
        cache.set(url, value);
        return value;
      })
      .catch((err) => {
        console.error(`Gagal memuat ${url}:`, err);
        pending.delete(url);
        return fallback;
      })
      .finally(() => window.clearTimeout(timer));
    pending.set(url, request);
  }
  return request;
};

/** `loaded` bernilai true setelah request selesai (berhasil atau gagal). */
export const useCachedJson = <T,>(url: string, normalize: (data: unknown) => T, fallback: T) => {
  const [data, setData] = useState<T | null>(() => (cache.has(url) ? (cache.get(url) as T) : null));

  useEffect(() => {
    if (cache.has(url)) return undefined;
    let alive = true;
    loadCachedJson(url, normalize, fallback).then((value) => {
      if (alive) setData(value);
    });
    return () => {
      alive = false;
    };
    // normalize & fallback dianggap konstan (didefinisikan di tingkat modul oleh pemanggil)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return { data: data ?? fallback, loaded: data !== null };
};
