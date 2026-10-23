import { useCallback, useState, useSyncExternalStore } from 'react';
import { apiPost } from '../../../lib/api';

/*
 * Suka & dilihat di kartu template (permintaan pemilik 2026-10-23, gaya Dribbble). Server hanya menghitung
 * (template_like / template_view, dibatasi per IP); status "saya sudah suka" per browser di localStorage, "sudah
 * dihitung dilihat" per sesi di sessionStorage. Server & hidrasi: belum disukai (snapshot server), jadi HTML prerender
 * cocok dengan render pertama klien.
 */
const LIKED_KEY = 'gn-liked-templates';
const VIEWED_KEY = 'gn-viewed-templates';
const LIKED_EVENT = 'gn-liked-templates-change';

function readList(storage: 'local' | 'session', key: string): string[] {
  try {
    const raw = (storage === 'local' ? window.localStorage : window.sessionStorage).getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function writeList(storage: 'local' | 'session', key: string, list: string[]): void {
  try {
    (storage === 'local' ? window.localStorage : window.sessionStorage).setItem(key, JSON.stringify(list));
  } catch {
    // penyimpanan diblokir: status hanya berlaku sampai halaman dimuat ulang
  }
}

const subscribe = (onChange: () => void) => {
  window.addEventListener('storage', onChange);
  window.addEventListener(LIKED_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(LIKED_EVENT, onChange);
  };
};
const likedSnapshot = () => window.localStorage?.getItem(LIKED_KEY) ?? '';
const serverSnapshot = () => '';

/** Angka ringkas Indonesia: 950 → "950", 3300 → "3,3 rb". */
export const compactCount = (value: number): string =>
  new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(Math.max(0, value));

export function useTemplateEngagement(slug: string, initialLikes = 0, initialViews = 0) {
  const likedRaw = useSyncExternalStore(subscribe, likedSnapshot, serverSnapshot);
  const liked = likedRaw !== '' && readList('local', LIKED_KEY).includes(slug);
  const [likes, setLikes] = useState(initialLikes);
  const [views, setViews] = useState(initialViews);
  const [busy, setBusy] = useState(false);

  const toggleLike = useCallback(async () => {
    if (busy) return;
    const next = !liked;
    const list = readList('local', LIKED_KEY).filter((item) => item !== slug);
    writeList('local', LIKED_KEY, next ? [...list, slug] : list);
    window.dispatchEvent(new Event(LIKED_EVENT));
    setLikes((count) => Math.max(0, count + (next ? 1 : -1)));
    setBusy(true);
    try {
      const data = await apiPost<{ like_count?: number }>('template_like', { slug, liked: next });
      if (typeof data.like_count === 'number') setLikes(data.like_count);
    } catch {
      // Gagal (mis. dibatasi): kembalikan status & angka
      writeList('local', LIKED_KEY, next ? list : [...list, slug]);
      window.dispatchEvent(new Event(LIKED_EVENT));
      setLikes((count) => Math.max(0, count + (next ? -1 : 1)));
    } finally {
      setBusy(false);
    }
  }, [busy, liked, slug]);

  /** Template dibuka dari kartu: dihitung sekali per sesi browser (angka di kartu ikut naik). */
  const recordView = useCallback(() => {
    const viewed = readList('session', VIEWED_KEY);
    if (viewed.includes(slug)) return;
    writeList('session', VIEWED_KEY, [...viewed, slug]);
    setViews((count) => count + 1);
    apiPost('template_view', { slug }).catch(() => {
      // hitungan dilihat bersifat informatif; gagal kirim tidak mengganggu pengunjung
    });
  }, [slug]);

  return { liked, likes, views, toggleLike, recordView, busy };
}
