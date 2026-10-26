// Hook kecil Madani: section yang sedang dibaca (pil menu aktif), "sudah digulir" (bilah putih lengket), dan tinggi
// elemen (kartu formulir PPDB yang lengket). Tanpa IntersectionObserver / ResizeObserver (perayap, jsdom) → nilai awal.
import { useEffect, useState, type RefObject } from 'react';
import { useSiteData } from '../shared/siteData';

/**
 * Kunci section yang sedang di tengah layar (dari daftar `keys`), atau null. Header tetap terpasang saat pindah halaman
 * di dalam situs (beranda ↔ /berita/{slug}), jadi section dicari & diamati ulang setiap halaman berganti: section beranda
 * yang dipasang lagi adalah elemen baru.
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

/** Tinggi elemen (px, dibulatkan) yang diperbarui saat ukurannya berubah. Tanpa ResizeObserver → 0. */
export function useElementHeight(target: RefObject<HTMLElement | null>, active = true): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const el = target.current;
    if (!el || !active || typeof ResizeObserver !== 'function') return;
    const measure = () => setHeight(Math.round(el.getBoundingClientRect().height));
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    measure();
    return () => observer.disconnect();
  }, [target, active]);
  return height;
}

/**
 * true setelah penanda `sentinel` (di dekat awal situs) tidak terlihat lagi dan tepi bawahnya di separuh atas layar —
 * halaman sudah digulir melewatinya. Juga berlaku di bingkai HP demo / panel pratinjau CMS yang punya gulir sendiri:
 * penanda terpotong tepi atas bingkai (± 100 px dari atas layar, jadi `top` masih positif) = sudah dilewati. Sama
 * dengan usePastFirstScreen di shared/Shell.
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
