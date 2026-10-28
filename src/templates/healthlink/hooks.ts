// Hook kecil HealthLink: section yang sedang dibaca (menu atas), "mainkan sekali saat terlihat" untuk gerak khas
// (gelembung chat, titik status dokter, garis alur resep), dan "hero sudah lewat" untuk bilah aksi bawah di HP. Tanpa
// IntersectionObserver (perayap, jsdom) atau gerak mati → keadaan akhir yang statis, tanpa error. Ditulis di folder ini
// (pola sama dengan dermaga/hooks.ts, tidak diimpor dari sana).
import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';
import { useMotionEnabled, watchEntrance } from '../shared/motion';
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
 * Keadaan gerak sekali-jalan: "static" (gerak mati → tampil akhir), "pending" (siap, belum terlihat; CSS menyembunyikan
 * bagian yang akan muncul), "run" (sedang/sudah diputar sekali). Dipasang sebagai `data-play` pada wadahnya.
 */
export type PlayState = 'static' | 'pending' | 'run';

export function usePlayOnce(ref: RefObject<HTMLElement | null>): PlayState {
  const motion = useMotionEnabled();
  const [state, setState] = useState<PlayState>('static');
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !motion || document.visibilityState === 'hidden') return;
    return watchEntrance(el, {
      arm: () => setState((s) => (s === 'run' ? s : 'pending')),
      enter: () => setState('run'),
    });
  }, [ref, motion]);
  return motion ? state : 'static';
}

/**
 * true setelah hero template (dicari dari root `anchor`) sepenuhnya lewat ke atas layar, juga di bingkai HP demo yang
 * punya gulir sendiri. Tanpa hero atau tanpa IntersectionObserver → true (bilah aksi langsung tampil).
 */
export function usePastHero(anchor: RefObject<HTMLElement | null>): boolean {
  const [past, setPast] = useState(false);
  const [observable] = useState(() => typeof IntersectionObserver === 'function');
  useEffect(() => {
    if (!observable) return;
    const hero = anchor.current?.closest('[data-tpl-root]')?.querySelector('[data-tpl-section="hero"]');
    if (!hero) {
      const frame = window.requestAnimationFrame(() => setPast(true));
      return () => window.cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(([entry]) => {
      setPast(!entry.isIntersecting && entry.boundingClientRect.bottom < (entry.rootBounds?.height ?? window.innerHeight) / 2);
    });
    observer.observe(hero);
    return () => observer.disconnect();
  }, [anchor, observable]);
  return !observable || past;
}
