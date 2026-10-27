// Hook kecil Saudagar: section yang sedang dibaca (garis tinta tema di bawah item menu) dan bulan berjalan untuk kalender
// panen. Tanpa IntersectionObserver (perayap, jsdom lama) → nilai awal, tanpa error.
import { useEffect, useState, useSyncExternalStore, type RefObject } from 'react';
import { useSiteData } from '../shared/siteData';

/**
 * Kunci section yang sedang di tengah layar (dari daftar `keys`), atau null. Section dicari & diamati ulang setiap
 * halaman berganti (header tetap terpasang). Pola sama dengan hook template sekolah, ditulis ulang di folder ini.
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

const noSubscribe = () => () => undefined;
const readMonth = () => new Date().getMonth();
/** Server / prerender: belum ada bulan berjalan (tanpa sorotan), sehingga HTML awal sama di mana pun. */
const serverMonth = () => -1;

/** Indeks bulan berjalan (0–11) di perangkat pengunjung; prerender → -1 (tanpa sorotan). */
export const useCurrentMonth = (): number => useSyncExternalStore(noSubscribe, readMonth, serverMonth);
