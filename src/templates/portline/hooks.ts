// Hook kecil Portline: section yang sedang dibaca (garis bawah item menu), "sudah digulir" (bilah utilitas dilipat,
// header jadi putih), dan rel geser horizontal dengan tombol ‹ › (liputan media). Tanpa IntersectionObserver /
// ResizeObserver (perayap, jsdom lama) → nilai awal, tanpa error.
import { useEffect, useState, type RefObject } from 'react';

/** Kunci section yang sedang di tengah layar (dari daftar `keys`), atau null. */
export function useActiveSection(anchor: RefObject<HTMLElement | null>, keys: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  const signature = keys.join(',');
  useEffect(() => {
    const root = anchor.current?.closest('[data-tpl-root]');
    if (!root || typeof IntersectionObserver !== 'function' || !signature) return;
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
  }, [anchor, signature]);
  return active;
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
 * Rel geser horizontal: apakah masih bisa digeser ke kiri/kanan (tombol ‹ › nonaktif di ujung, disembunyikan bila semua
 * muat). Diukur ulang saat digulir, saat ukurannya berubah, dan saat jumlah item (`count`) berubah.
 */
export function useRail(rail: RefObject<HTMLElement | null>, count: number) {
  const [edges, setEdges] = useState({ start: true, end: true });
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const measure = () => {
      const max = el.scrollWidth - el.clientWidth;
      const next = { start: el.scrollLeft <= 2, end: el.scrollLeft >= max - 2 };
      setEdges((prev) => (prev.start === next.start && prev.end === next.end ? prev : next));
    };
    const frame = window.requestAnimationFrame(measure);
    el.addEventListener('scroll', measure, { passive: true });
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(el);
    return () => {
      window.cancelAnimationFrame(frame);
      el.removeEventListener('scroll', measure);
      observer?.disconnect();
    };
  }, [rail, count]);
  return edges;
}

/** Geser rel satu "halaman" (lebar item pertama + jarak); halus kecuali pengunjung memilih kurangi gerak. */
export function scrollRail(el: HTMLElement | null, direction: 1 | -1) {
  if (!el || typeof el.scrollBy !== 'function') return;
  const first = el.firstElementChild as HTMLElement | null;
  const step = first ? first.getBoundingClientRect().width + 24 : el.clientWidth * 0.8;
  const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollBy({ left: direction * step, behavior: reduce ? 'auto' : 'smooth' });
}
