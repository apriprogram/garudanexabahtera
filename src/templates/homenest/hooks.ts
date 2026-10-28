// Hook kecil HomeNest: section yang sedang dibaca (garis aktif di menu atas), "sudah digulir" (header transparan di atas
// foto hero → krem padat), dan angka KPR yang bergerak ke nilai baru. Tanpa IntersectionObserver / requestAnimationFrame
// (perayap, jsdom lama) → nilai awal / langsung nilai akhir, tanpa error. Ditulis di folder ini (pola sama dengan
// jumantara/hooks.ts dan Animated.tsx CountUp, tidak diimpor dari sana).
import { useEffect, useRef, useState, type RefObject } from 'react';
import { useSiteData } from '../shared/siteData';

/** Kunci section yang sedang di tengah layar (dari daftar `keys`), atau null. */
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
 * Angka yang bergerak dari nilai lama ke nilai baru (± 450 ms) setiap `value` berubah. Nilai akhir selalu ada di DOM
 * (`finalRef`, dibaca pembaca layar & uji); angka berjalan ditulis ke `runRef` (aria-hidden) yang tidak berisi anak
 * React, jadi React tidak pernah menimpa teksnya. `format` harus fungsi tetap (tingkat modul). Gerak mati → diam.
 */
export function useTween(
  finalRef: RefObject<HTMLElement | null>,
  runRef: RefObject<HTMLElement | null>,
  value: number,
  format: (n: number) => string,
  enabled: boolean,
  duration = 450,
): void {
  const previous = useRef(value);
  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    const final = finalRef.current;
    const run = runRef.current;
    if (!enabled || !final || !run || from === value || typeof window.requestAnimationFrame !== 'function') return;
    let frame = 0;
    const start = performance.now();
    const reset = () => {
      run.textContent = '';
      final.style.opacity = '';
    };
    final.style.opacity = '0';
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      run.textContent = format(from + (value - from) * eased);
      if (t < 1) frame = window.requestAnimationFrame(tick);
      else reset();
    };
    frame = window.requestAnimationFrame(tick);
    // Pengaman bila frame ditahan browser (tab latar): nilai akhir tetap muncul
    const safety = window.setTimeout(reset, duration + 400);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(safety);
      reset();
    };
  }, [value, enabled, duration, format, finalRef, runRef]);
}
