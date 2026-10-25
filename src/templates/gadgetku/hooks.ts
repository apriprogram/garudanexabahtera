// Hook kecil GadgetKu: section yang sedang dibaca (garis bawah item menu) dan ukuran elemen (mockup casing). Tanpa
// IntersectionObserver / ResizeObserver (perayap, jsdom) → nilai awal, tanpa error.
import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';

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

/** Rasio tinggi ÷ lebar elemen (diperbarui saat ukurannya berubah); belum terukur → `fallback`. */
export function useAspect(ref: RefObject<HTMLElement | null>, fallback: number): number {
  const [ratio, setRatio] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      if (el.clientWidth > 0 && el.clientHeight > 0) setRatio(el.clientHeight / el.clientWidth);
    };
    measure();
    if (typeof ResizeObserver !== 'function') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return ratio;
}
