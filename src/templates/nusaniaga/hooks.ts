// Hook kecil NusaNiaga: section yang sedang dibaca (titik aksen di item menu) dan apakah rel produk bisa digeser.
// Tanpa IntersectionObserver / ResizeObserver (perayap, jsdom lama) → nilai aman, tanpa error.
import { useEffect, useState, type RefObject } from 'react';
import { useSiteData } from '../shared/siteData';

/**
 * true bila isi elemen lebih lebar dari elemennya (rel geser di HP), false bila tampil sebagai grid statis. Diukur ulang
 * saat elemen atau anak pertamanya berubah ukuran. Tanpa ResizeObserver → true (tetap bisa difokus untuk digeser).
 */
export function useScrollable(ref: RefObject<HTMLElement | null>): boolean {
  const [scrollable, setScrollable] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver !== 'function') return;
    const measure = () => setScrollable(el.scrollWidth > el.clientWidth + 1);
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    measure();
    return () => observer.disconnect();
  }, [ref]);
  return scrollable;
}

/**
 * Kunci section yang sedang di tengah layar (dari daftar `keys`), atau null. Section dicari di dalam root template yang
 * memuat `anchor`, dan diamati ulang bila daftar kunci atau halaman berganti.
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
