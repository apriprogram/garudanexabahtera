// Hook kecil PayNow: section yang sedang dibaca (garis aktif di menu), "sudah digulir" (header transparan → malam
// indigo), dan angka hasil simulasi yang bergulir pelan (≤ 400 ms, hanya bila gerak menyala). Tanpa
// IntersectionObserver / requestAnimationFrame (perayap, jsdom lama) → nilai akhir langsung, tanpa error. Ditulis di
// folder ini (pola sama dengan jumantara/hooks.ts, tidak diimpor dari sana).
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
 * Angka yang bergulir dari nilai sebelumnya ke `target` dalam `duration` ms (ease-out). `enabled` false → langsung
 * `target`. Nilai yang dikembalikan selalu bulat.
 */
export function useTween(target: number, enabled: boolean, duration = 360): number {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = from.current;
    from.current = target;
    // Gerak mati: nilai dikembalikan langsung (lihat return di bawah), state tidak perlu diikuti
    if (!enabled || typeof window.requestAnimationFrame !== 'function') return;
    let frame = 0;
    if (start === target) {
      frame = window.requestAnimationFrame(() => setShown(target));
      return () => window.cancelAnimationFrame(frame);
    }
    // Waktu mulai = stempel waktu frame PERTAMA (jam rAF bisa berbeda dari performance.now(), mis. sedikit lebih awal
    // saat input diproses di awal frame); t dibatasi 0…1 agar angka tidak pernah melampaui awal/akhir
    let began = -1;
    const tick = (now: number) => {
      if (began < 0) began = now;
      const t = Math.min(1, Math.max(0, (now - began) / Math.max(1, duration)));
      const value = Math.round(start + (target - start) * (1 - (1 - t) ** 3));
      from.current = value;
      setShown(value);
      if (t < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [target, enabled, duration]);
  return enabled ? shown : target;
}
