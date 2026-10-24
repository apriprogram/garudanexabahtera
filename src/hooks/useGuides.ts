// Artikel panduan dari API (src/content/panduan/index.ts): nilai awal dari data preload HTML prerender (sama di server
// dan saat hidrasi), lalu dimuat ulang dari API setelah mount supaya artikel yang terbit/diubah admin sesudah deploy
// langsung tampil. Pola sama dengan usePublishedTemplates.
import { useCallback, useEffect, useState } from 'react';
import { articleFromApi, guidesFromApi, type Article, type ArticleSummary } from '../content/panduan';
import { ApiError, apiGet, apiPost, peekApiGet } from '../lib/api';
import { useHydrated } from '../lib/preload';

export type GuidesStatus = 'loading' | 'ready' | 'error';

interface GuidesState {
  status: GuidesStatus;
  /** Artikel terbit, terbaru dulu. */
  articles: ArticleSummary[];
}

export interface Guides extends GuidesState {
  /** Minta ulang get_guides setelah gagal (tombol "Coba lagi"); request gagal sudah dibuang dari cache apiGet. */
  retry: () => void;
}

function initialGuides(): GuidesState {
  const primed = peekApiGet<unknown>('get_guides');
  return primed ? { status: 'ready', articles: guidesFromApi(primed) } : { status: 'loading', articles: [] };
}

/** Daftar artikel terbit (get_guides, satu request bersama per muat halaman). */
export function useGuides(): Guides {
  const [state, setState] = useState<GuidesState>(initialGuides);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    apiGet<unknown>('get_guides')
      .then((res) => {
        if (alive) setState({ status: 'ready', articles: guidesFromApi(res) });
      })
      .catch(() => {
        // Gagal memuat ulang: data preload (bila ada) tetap dipakai
        if (alive) setState((prev) => (prev.status === 'ready' ? prev : { status: 'error', articles: [] }));
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState((prev) => (prev.status === 'error' ? { status: 'loading', articles: [] } : prev));
    setAttempt((n) => n + 1);
  }, []);

  return { ...state, retry };
}

/** 'missing' = slug tidak ada atau belum terbit (404 dari API) → halaman 404. */
export type GuideStatus = 'loading' | 'ready' | 'missing' | 'error';

export interface GuideState {
  status: GuideStatus;
  article: Article | null;
}

/**
 * Nilai awal: artikel dari data preload, atau memuat. `fromPreloadList` (hanya render server dan hidrasi): daftar artikel
 * terbit di data preload tanpa slug ini → langsung 404, supaya HTML prerender sama dengan hidrasi. Di luar itu daftar
 * preload bisa sudah usang (artikel terbit setelah deploy), jadi jawaban get_guide yang menentukan.
 */
function initialGuide(slug: string, fromPreloadList: boolean): GuideState {
  const article = articleFromApi(peekApiGet<unknown>('get_guide', { slug }));
  if (article) return { status: 'ready', article };
  const listed = fromPreloadList ? peekApiGet<unknown>('get_guides') : undefined;
  if (listed && !guidesFromApi(listed).some((guide) => guide.slug === slug)) return { status: 'missing', article: null };
  return { status: 'loading', article: null };
}

/** Satu artikel lengkap (get_guide). */
export function useGuide(slug: string): GuideState {
  // false saat render server & hidrasi; navigasi di browser (dan render klien biasa) mulai dari 'loading'
  const hydrated = useHydrated();
  const [state, setState] = useState<GuideState>(() => initialGuide(slug, !hydrated));
  const [loadedSlug, setLoadedSlug] = useState(slug);
  // Pindah artikel (tautan "artikel terkait", selalu setelah hidrasi): mulai dari data preload artikel itu, atau memuat
  if (loadedSlug !== slug) {
    setLoadedSlug(slug);
    setState(initialGuide(slug, false));
  }

  useEffect(() => {
    let alive = true;
    apiGet<unknown>('get_guide', { slug })
      .then((res) => {
        if (!alive) return;
        const article = articleFromApi(res);
        setState(article ? { status: 'ready', article } : { status: 'missing', article: null });
      })
      .catch((err: unknown) => {
        if (!alive) return;
        if (err instanceof ApiError && err.status === 404) setState({ status: 'missing', article: null });
        else setState((prev) => (prev.status === 'ready' ? prev : { status: 'error', article: null }));
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  return state;
}

const VIEWED_KEY = 'gn-viewed-guides';

function readViewed(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.sessionStorage.getItem(VIEWED_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Jumlah dilihat (permintaan pemilik 2026-10-24, tampil di admin → Panduan): halaman /panduan atau /panduan/{slug}
 * dihitung sekali per sesi browser lewat guide_view (server membatasi per IP). null = jangan hitung (artikel belum
 * dimuat atau tidak ada).
 */
export function useGuideView(page: string | null): void {
  useEffect(() => {
    if (!page) return;
    const viewed = readViewed();
    if (viewed.includes(page)) return;
    try {
      window.sessionStorage.setItem(VIEWED_KEY, JSON.stringify([...viewed, page]));
    } catch {
      // penyimpanan diblokir: tetap dihitung, paling banyak sekali per muat halaman
    }
    apiPost('guide_view', { page }).catch(() => undefined);
  }, [page]);
}
