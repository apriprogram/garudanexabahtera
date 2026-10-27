// Hook kecil Velora: section yang sedang dibaca (penanda item menu), "sudah digulir" (menu berubah menjadi bilah gelap
// lengket), apakah pil menu muat di header, dan mode rel kartu teknologi (rel geser atau deret melebar). Tanpa
// IntersectionObserver / ResizeObserver (perayap, jsdom) → nilai awal, tanpa error.
import { useEffect, useState, type RefObject } from 'react';
import { pillNavFits } from './model';

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

/** Lebar alami elemen: lebar sekarang + teks yang terpotong (.truncate) di dalamnya. */
const naturalWidth = (el: Element | null): number =>
  el instanceof HTMLElement
    ? el.offsetWidth + Array.from(el.querySelectorAll<HTMLElement>('.truncate')).reduce((sum, t) => sum + Math.max(0, t.scrollWidth - t.clientWidth), 0)
    : 0;

/**
 * true bila pil menu (ul `[data-vl-pill] ul`, selalu selebar isinya) muat di baris header `row` bersama logo (anak pertama)
 * dan aksi kanan (anak terakhir); diukur ulang saat ukuran baris/pil/logo/aksi berubah (font dimuat, label CMS diganti).
 */
export function usePillNavFits(row: RefObject<HTMLElement | null>, signature: string): boolean {
  const [fits, setFits] = useState(true);
  useEffect(() => {
    const el = row.current;
    const nav = el?.querySelector<HTMLElement>('[data-vl-pill] ul');
    if (!el || !nav || typeof ResizeObserver !== 'function') return;
    const measure = () => {
      // Pil disembunyikan CSS (wadah < 1152px) → lebar 0 → keadaan dipertahankan
      if (!nav.offsetWidth) return;
      setFits(pillNavFits({ row: el.clientWidth, nav: nav.offsetWidth, logo: naturalWidth(el.firstElementChild), actions: naturalWidth(el.lastElementChild) }));
    };
    const observer = new ResizeObserver(measure);
    for (const target of [el, nav, el.firstElementChild, el.lastElementChild]) if (target) observer.observe(target);
    return () => observer.disconnect();
  }, [row, signature]);
  return fits;
}

/**
 * Mode rel kartu teknologi: `wide` = deret melebar (rel tidak menggulir, wadah ≥ 1152px: kartu dipilih lewat tombol),
 * `scrollable` = isi rel lebih lebar dari rel (rel geser: boleh difokus dan digulir dengan keyboard). Awal (jsdom,
 * sebelum diukur): deret melebar yang bisa difokus.
 */
export function useRailMode(rail: RefObject<HTMLElement | null>, signature: string): { wide: boolean; scrollable: boolean } {
  const [mode, setMode] = useState({ wide: true, scrollable: true });
  useEffect(() => {
    const el = rail.current;
    if (!el || typeof ResizeObserver !== 'function') return;
    const measure = () => {
      const wide = getComputedStyle(el).overflowX === 'visible';
      const scrollable = !wide && el.scrollWidth > el.clientWidth + 1;
      setMode((prev) => (prev.wide === wide && prev.scrollable === scrollable ? prev : { wide, scrollable }));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [rail, signature]);
  return mode;
}
