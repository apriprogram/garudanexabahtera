// Hook kecil Jumantara: section yang sedang dibaca (penanda item menu), "sudah digulir" (header jadi putih), hero di
// luar layar & tab browser tersembunyi (slider hero berhenti), dan progres rel geser fasilitas. Tanpa
// IntersectionObserver (perayap, jsdom lama) → nilai awal, tanpa error.
import { useEffect, useState, type RefObject } from 'react';
import { useSiteData } from '../shared/siteData';

/**
 * Kunci section yang sedang di tengah layar (dari daftar `keys`), atau null. Header tetap terpasang saat pindah halaman
 * di dalam situs (beranda ↔ /berita/{slug}), jadi section dicari & diamati ulang setiap halaman berganti.
 */
export function useActiveSection(anchor: RefObject<HTMLElement | null>, keys: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  const signature = keys.join(',');
  const page = useSiteData().route.kind;
  useEffect(() => {
    const root = anchor.current?.closest('[data-tpl-root]');
    if (page !== 'home' || !root || typeof IntersectionObserver !== 'function' || !signature) return;
    const targets = signature
      .split(',')
      .map((key) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`))
      .filter((el): el is HTMLElement => !!el);
    const visible = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible.set(entry.target.getAttribute('data-tpl-section') ?? '', entry.isIntersecting);
        setActive(targets.map((el) => el.getAttribute('data-tpl-section') ?? '').find((key) => visible.get(key)) ?? null);
      },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    for (const el of targets) observer.observe(el);
    return () => observer.disconnect();
  }, [anchor, signature, page]);
  return page === 'home' ? active : null;
}

/**
 * true setelah penanda `sentinel` tidak terlihat lagi dan tepi bawahnya di separuh atas layar (halaman sudah digulir
 * melewatinya). Juga di bingkai HP demo / panel pratinjau CMS yang punya gulir sendiri.
 */
export function useScrolledPast(sentinel: RefObject<HTMLElement | null>): boolean {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || typeof IntersectionObserver !== 'function') return;
    const observer = new IntersectionObserver(([entry]) => {
      const viewport = entry.rootBounds?.height ?? window.innerHeight;
      setPast(!entry.isIntersecting && entry.boundingClientRect.bottom < viewport / 2);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [sentinel]);
  return past;
}

/**
 * true selama minimal `ratio` bagian elemen terlihat (slider otomatis berhenti saat hero digulir keluar layar). Nilai
 * awal true: tanpa IntersectionObserver perilaku tidak berubah.
 */
export function useInView(target: RefObject<HTMLElement | null>, ratio: number): boolean {
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = target.current;
    if (!el || typeof IntersectionObserver !== 'function') return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio >= ratio - 0.01), {
      threshold: [0, ratio],
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, ratio]);
  return inView;
}

/** true selama tab browser tersembunyi (slider otomatis ikut berhenti). */
export function useDocumentHidden(): boolean {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const update = () => setHidden(document.visibilityState === 'hidden');
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  return hidden;
}

export interface RailState {
  /** 0 … 1: posisi gulir rel */
  progress: number;
  /** Bagian rel yang terlihat (0 … 1), untuk lebar bilah progres */
  visible: number;
  atStart: boolean;
  atEnd: boolean;
}

/** Posisi rel geser horizontal (diperbarui per frame saat digulir dan saat ukuran berubah). */
export function useRail(rail: RefObject<HTMLElement | null>): RailState {
  const [state, setState] = useState<RailState>({ progress: 0, visible: 1, atStart: true, atEnd: true });
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const max = el.scrollWidth - el.clientWidth;
      const left = Math.max(0, el.scrollLeft);
      const next: RailState = {
        progress: max > 1 ? Math.min(1, left / max) : 1,
        visible: el.scrollWidth > 0 ? Math.min(1, el.clientWidth / el.scrollWidth) : 1,
        atStart: left <= 1,
        atEnd: max <= 1 || left >= max - 1,
      };
      setState((prev) =>
        Math.abs(prev.progress - next.progress) < 0.002 && prev.atStart === next.atStart && prev.atEnd === next.atEnd && Math.abs(prev.visible - next.visible) < 0.002
          ? prev
          : next,
      );
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    measure();
    el.addEventListener('scroll', onScroll, { passive: true });
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(onScroll) : null;
    observer?.observe(el);
    return () => {
      el.removeEventListener('scroll', onScroll);
      observer?.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [rail]);
  return state;
}
