import { useCallback, useState, useSyncExternalStore } from 'react';
import { apiPost } from '../../../lib/api';

/*
 * Suka & dilihat di kartu template (permintaan pemilik 2026-10-23) dan kartu proyek beranda (2026-10-24), gaya Dribbble.
 * Server hanya menghitung (template_like / template_view, showcase_like / showcase_view; dibatasi per IP); status "saya
 * sudah suka" per browser di localStorage, "sudah dihitung dilihat" per sesi di sessionStorage. Server & hidrasi: belum
 * disukai (snapshot server), jadi HTML prerender cocok dengan render pertama klien.
 */
type EngagementKind = 'template' | 'project';

const KINDS: Record<EngagementKind, { like: string; view: string; param: string; liked: string; viewed: string; event: string }> = {
  template: {
    like: 'template_like',
    view: 'template_view',
    param: 'slug',
    liked: 'gn-liked-templates',
    viewed: 'gn-viewed-templates',
    event: 'gn-liked-templates-change',
  },
  project: {
    like: 'showcase_like',
    view: 'showcase_view',
    param: 'key',
    liked: 'gn-liked-projects',
    viewed: 'gn-viewed-projects',
    event: 'gn-liked-projects-change',
  },
};

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

const serverSnapshot = () => '';

/** Angka ringkas Indonesia: 950 → "950", 3300 → "3,3 rb". */
export const compactCount = (value: number): string =>
  new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(Math.max(0, value));

/**
 * Suka & dilihat satu kartu. Angka = angka dasar + selisih klik pengunjung yang belum dijawab server. Angka dasar dari
 * props (bisa datang belakangan, mis. statistik proyek yang dimuat setelah halaman tampil) sampai server menjawab suka /
 * dilihat dengan angka terbaru; jadi klik sebelum statistik tiba tidak membekukan angka lama.
 */
export function useEngagement(kind: EngagementKind, id: string, initialLikes = 0, initialViews = 0) {
  const cfg = KINDS[kind];
  const subscribe = useCallback(
    (onChange: () => void) => {
      window.addEventListener('storage', onChange);
      window.addEventListener(cfg.event, onChange);
      return () => {
        window.removeEventListener('storage', onChange);
        window.removeEventListener(cfg.event, onChange);
      };
    },
    [cfg.event],
  );
  const likedSnapshot = useCallback(() => window.localStorage?.getItem(cfg.liked) ?? '', [cfg.liked]);
  const likedRaw = useSyncExternalStore(subscribe, likedSnapshot, serverSnapshot);
  const liked = likedRaw !== '' && readList('local', cfg.liked).includes(id);
  const [likesServer, setLikesServer] = useState<number | null>(null);
  const [viewsServer, setViewsServer] = useState<number | null>(null);
  const [likesDelta, setLikesDelta] = useState(0);
  const [viewsDelta, setViewsDelta] = useState(0);
  const likes = Math.max(0, (likesServer ?? initialLikes) + likesDelta);
  const views = Math.max(0, (viewsServer ?? initialViews) + viewsDelta);
  const [busy, setBusy] = useState(false);

  const toggleLike = useCallback(async () => {
    if (busy) return;
    const next = !liked;
    const step = next ? 1 : -1;
    const list = readList('local', cfg.liked).filter((item) => item !== id);
    writeList('local', cfg.liked, next ? [...list, id] : list);
    window.dispatchEvent(new Event(cfg.event));
    setLikesDelta((delta) => delta + step);
    setBusy(true);
    try {
      const data = await apiPost<{ like_count?: number }>(cfg.like, { [cfg.param]: id, liked: next });
      if (typeof data.like_count === 'number') {
        setLikesServer(data.like_count);
        setLikesDelta(0);
      }
    } catch {
      // Gagal (mis. dibatasi): kembalikan status & angka
      writeList('local', cfg.liked, next ? list : [...list, id]);
      window.dispatchEvent(new Event(cfg.event));
      setLikesDelta((delta) => delta - step);
    } finally {
      setBusy(false);
    }
  }, [busy, cfg, id, liked]);

  /** Kartu dibuka: dihitung sekali per sesi browser (angka di kartu ikut naik). */
  const recordView = useCallback(() => {
    const viewed = readList('session', cfg.viewed);
    if (viewed.includes(id)) return;
    writeList('session', cfg.viewed, [...viewed, id]);
    setViewsDelta((delta) => delta + 1);
    apiPost<{ view_count?: number }>(cfg.view, { [cfg.param]: id })
      .then((data) => {
        if (typeof data.view_count !== 'number') return;
        setViewsServer(data.view_count);
        setViewsDelta((delta) => delta - 1);
      })
      .catch(() => {
        // hitungan dilihat bersifat informatif; gagal kirim tidak mengganggu pengunjung (angka +1 tetap di layar)
      });
  }, [cfg, id]);

  return { liked, likes, views, toggleLike, recordView, busy };
}

/** Kartu template (slug). */
export function useTemplateEngagement(slug: string, initialLikes = 0, initialViews = 0) {
  return useEngagement('template', slug, initialLikes, initialViews);
}
