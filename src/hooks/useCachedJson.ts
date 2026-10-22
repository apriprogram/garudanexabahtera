import { useEffect, useState } from 'react';

const TIMEOUT_MS = 8000;

// Cache tingkat modul per URL: semua komponen berbagi satu request per muat halaman. Yang disimpan respons MENTAH;
// `normalize` dijalankan saat dibaca, jadi data preload bisa dimasukkan tanpa tahu fungsi normalize pemanggil.
const cache = new Map<string, unknown>();
const pending = new Map<string, Promise<unknown>>();
// Respons dari HTML prerender (src/lib/preload.ts). Dipakai untuk render pertama (hidrasi = sama dengan server) dan
// sebagai cadangan bila request gagal; tetap diminta ulang sekali ke server supaya isinya terbaru.
const primed = new Map<string, unknown>();

/** Simpan respons mentah dari preload untuk URL ini. */
export const primeCachedJson = (url: string, data: unknown) => {
  primed.set(url, data);
};

/** Kosongkan semua cache (tes, dan prerender sebelum merender halaman berikutnya). */
export const clearCachedJson = () => {
  cache.clear();
  pending.clear();
  primed.clear();
};

const readKnown = <T,>(url: string, normalize: (data: unknown) => T): T | null => {
  if (cache.has(url)) return normalize(cache.get(url));
  if (primed.has(url)) return normalize(primed.get(url));
  return null;
};

/**
 * Ambil JSON publik sekali per muat halaman. `normalize` mengubah respons mentah ke bentuk yang aman dipakai;
 * kalau request gagal, data preload (bila ada) atau `fallback` dikembalikan dan request boleh dicoba lagi saat
 * komponen dipasang ulang.
 */
export const loadCachedJson = <T,>(url: string, normalize: (data: unknown) => T, fallback: T): Promise<T> => {
  if (cache.has(url)) return Promise.resolve(normalize(cache.get(url)));
  let request = pending.get(url);
  if (!request) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
    request = fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<unknown>;
      })
      .then((data) => {
        cache.set(url, data);
        return data;
      })
      .catch((err: unknown) => {
        console.error(`Gagal memuat ${url}:`, err);
        pending.delete(url);
        throw err;
      })
      .finally(() => window.clearTimeout(timer));
    pending.set(url, request);
  }
  return request.then(normalize, () => (primed.has(url) ? normalize(primed.get(url)) : fallback));
};

/** `loaded` bernilai true setelah request selesai (berhasil atau gagal), atau langsung bila data preload ada. */
export const useCachedJson = <T,>(url: string, normalize: (data: unknown) => T, fallback: T) => {
  const [data, setData] = useState<T | null>(() => readKnown(url, normalize));

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
