// Hook kecil Nawasena: section yang sedang dibaca (garis bawah item menu), "sudah digulir" (header jadi navy pekat),
// elemen terlihat di layar (slider hero berhenti saat di luar layar), dan posisi rel geser (tombol prestasi
// sebelumnya/berikutnya). Tanpa IntersectionObserver/ResizeObserver (perayap, jsdom lama) → nilai awal, tanpa error.
// Ditulis di folder ini (pola sama dengan bestari/hooks.ts, tidak diimpor).
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
  // Halaman selain beranda tidak punya section: tanpa penanda
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
 * true selama minimal `ratio` bagian elemen `target` terlihat di layar. Nilai awal true (tanpa IntersectionObserver,
 * mis. perayap/jsdom, slider tetap berjalan seperti biasa).
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

/** Posisi rel geser horizontal: sudah di awal / di akhir (toleransi 4px). Diperbarui saat digulir dan saat ukuran berubah. */
export function useRailEdges(rail: RefObject<HTMLElement | null>): { atStart: boolean; atEnd: boolean } {
  const [edges, setEdges] = useState({ atStart: true, atEnd: false });
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const update = () => {
      const atStart = el.scrollLeft <= 4;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      setEdges((prev) => (prev.atStart === atStart && prev.atEnd === atEnd ? prev : { atStart, atEnd }));
    };
    el.addEventListener('scroll', update, { passive: true });
    // ResizeObserver memanggil `update` sekali saat mulai mengamati (posisi awal) dan setiap ukuran berubah
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null;
    observer?.observe(el);
    const frame = observer ? 0 : window.requestAnimationFrame(update);
    return () => {
      el.removeEventListener('scroll', update);
      observer?.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [rail]);
  return edges;
}
