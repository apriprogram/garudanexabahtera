import { useEffect, useState } from 'react';

interface SectionSpyOptions {
  /** false = tidak memantau (mis. navbar di luar beranda). */
  enabled?: boolean;
  /** true = saat garis tengah layar tidak mengenai section mana pun, section terakhir tetap dianggap aktif. */
  sticky?: boolean;
}

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((id, i) => id === b[i]);

/**
 * Scroll-spy section beranda (port `useActiveSection` BELAJAR CPNS):
 * - `activeId`: section yang sedang dilewati garis tengah layar (null bila tidak ada);
 * - `presentIds`: id dari daftar yang elemennya benar-benar ada di halaman (section bisa muncul belakangan
 *   setelah data dimuat, atau disembunyikan admin), urutannya mengikuti `ids`.
 */
export const useSectionSpy = (ids: string[], { enabled = true, sticky = false }: SectionSpyOptions = {}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [presentIds, setPresentIds] = useState<string[]>([]);
  const key = ids.join('|');

  useEffect(() => {
    if (!enabled || !key || typeof IntersectionObserver === 'undefined') return undefined;
    const list = key.split('|');
    const crossing = new Set<string>();
    const observed = new Map<string, Element>();

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => (entry.isIntersecting ? crossing.add(entry.target.id) : crossing.delete(entry.target.id)));
        const current = list.find((id) => crossing.has(id)) ?? null;
        if (current || !sticky) setActiveId(current);
      },
      { rootMargin: '-50% 0px -50% 0px', threshold: 0 },
    );

    // Pasang/lepas observer mengikuti elemen yang ada sekarang
    const collect = () => {
      const present: string[] = [];
      list.forEach((id) => {
        const el = document.getElementById(id);
        const prev = observed.get(id);
        if (prev && prev !== el) {
          io.unobserve(prev);
          observed.delete(id);
          crossing.delete(id);
        }
        if (el) {
          present.push(id);
          if (!observed.has(id)) {
            observed.set(id, el);
            io.observe(el);
          }
        }
      });
      setPresentIds((prev) => (sameList(prev, present) ? prev : present));
    };

    const raf = requestAnimationFrame(collect);
    let pending = 0;
    const mo = new MutationObserver(() => {
      if (!pending) pending = requestAnimationFrame(() => {
        pending = 0;
        collect();
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(raf);
      if (pending) cancelAnimationFrame(pending);
      mo.disconnect();
      io.disconnect();
    };
  }, [key, enabled, sticky]);

  return { activeId: enabled ? activeId : null, presentIds: enabled ? presentIds : [] };
};
