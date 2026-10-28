// Hook kecil MomKid (ditulis di folder ini; pola sama dengan dermaga/hooks.ts, tidak diimpor dari sana):
// - useActiveSection: section yang sedang dibaca (kapsul menu atas menyorot tautannya);
// - usePlayOnce: gerak khas yang diputar SEKALI saat elemen masuk layar (chip hero, garis waktu imunisasi, kilau di
//   ajakan). Menulis data-mk-play="pending" → "on" langsung ke DOM (tanpa render ulang), lewat watchEntrance bersama:
//   elemen jauh di bawah tetap tampil utuh sampai didekati. Gerak mati (pratinjau CMS, prefers-reduced-motion, tanpa
//   IntersectionObserver) → atribut tidak pernah ditulis, jadi CSS menampilkan keadaan akhir.
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

/** Putar gerak khas sekali saat `ref` masuk layar: data-mk-play "pending" (siap) → "on" (berjalan). */
export function usePlayOnce(ref: RefObject<HTMLElement | null>): void {
  const enabled = useMotionEnabled();
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !enabled || el.dataset.mkPlay === 'on' || document.visibilityState === 'hidden') return;
    return watchEntrance(el, {
      arm: () => {
        el.dataset.mkPlay = 'pending';
      },
      enter: () => {
        el.dataset.mkPlay = 'on';
      },
    });
  }, [ref, enabled]);
}
