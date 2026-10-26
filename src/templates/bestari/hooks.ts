// Hook kecil Bestari: section yang sedang dibaca (penanda item menu) dan "sudah digulir" (bilah info atas dilipat).
// Tanpa IntersectionObserver (perayap, jsdom lama) → nilai awal, tanpa error.
import { useEffect, useState, type RefObject } from 'react';
import { useSiteData } from '../shared/siteData';

/**
 * Kunci section yang sedang di tengah layar (dari daftar `keys`), atau null. Header tetap terpasang saat pindah halaman
 * di dalam situs (beranda ↔ /berita/{slug}), jadi section dicari & diamati ulang setiap halaman berganti: section beranda
 * yang dipasang lagi adalah elemen baru. Sama dengan madani/hooks.ts dan cakrawala/hooks.ts.
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
  // Halaman selain beranda tidak punya section: tanpa penanda (nilai lama dari beranda tidak dipakai)
  return page === 'home' ? active : null;
}

/**
 * true setelah penanda `sentinel` tidak terlihat lagi dan tepi bawahnya di separuh atas layar (halaman sudah digulir
 * melewatinya). Juga di bingkai HP demo / panel pratinjau CMS yang punya gulir sendiri: penanda terpotong tepi atas
 * bingkai (± 100 px dari atas layar, jadi `top` masih positif) = sudah dilewati. Sama dengan madani/hooks.ts.
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
