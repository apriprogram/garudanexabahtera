// Hook kecil header Serenity: section yang sedang dibaca (garis bawah item menu) dan "sudah digulir" (bilah terang
// lengket). Tanpa IntersectionObserver (perayap, jsdom lama) → nilai awal, tanpa error.
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

/** true setelah penanda `sentinel` keluar dari layar (halaman sudah digulir melewatinya). */
export function useScrolledPast(sentinel: RefObject<HTMLElement | null>): boolean {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || typeof IntersectionObserver !== 'function') return;
    const observer = new IntersectionObserver(([entry]) => setPast(!entry.isIntersecting && entry.boundingClientRect.top < 0));
    observer.observe(el);
    return () => observer.disconnect();
  }, [sentinel]);
  return past;
}
