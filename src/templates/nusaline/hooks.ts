// Hook Nusaline: section yang sedang dibaca (garis aktif di menu), "sudah digulir" (header transparan di atas foto hero →
// midnight padat), dan PROGRES FILM: posisi gulir di dalam trek film → variabel CSS --p (0–1, 4 desimal) di panggung
// sticky, tanpa setState per frame (React hanya menerima bab aktif lewat callback), plus penyesuaian panggung di layar
// pendek (bus tidak tertutup teks). Bekerja di jendela browser (demo desktop, situs live) maupun di wadah gulir sendiri
// (bingkai HP demo `overflow-y-auto`). Tanpa IntersectionObserver (perayap, jsdom) → tidak terpasang. Ditulis di folder
// ini (pola sama dengan homenest/hooks.ts, tidak diimpor dari sana).
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react';
import { useSiteData } from '../shared/siteData';
import { fitFilmBus, scrollProgress, type BusFit, type FilmBox } from './model';

/**
 * Layar sangat pendek (HP dimiringkan, ± 360–430px): panggung film tidak muat untuk teks + bus, jadi film tampil sebagai
 * papan cerita diam (seperti reduced motion). Ikut berubah saat layar diputar.
 */
const SHORT_QUERY = '(max-height: 480px)';

function subscribeShort(onChange: () => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => undefined;
  const media = window.matchMedia(SHORT_QUERY);
  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }
  media.addListener?.(onChange);
  return () => media.removeListener?.(onChange);
}

const readShort = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && !!window.matchMedia(SHORT_QUERY)?.matches;

/** true bila tinggi layar ≤ 480px (lihat SHORT_QUERY). Server/prerender: false. */
export const useShortViewport = (): boolean => useSyncExternalStore(subscribeShort, readShort, () => false);

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
 * Kotak teks panggung film (px relatif panggung): elemen `[data-film-text]` yang tampil. Daftar bab: tinggi kartu bab
 * tertinggi tanpa transform (kartu bab bertumpuk di posisi yang sama dan bergeser 14px saat berganti).
 */
function filmTextBoxes(stage: HTMLElement, origin: DOMRect): FilmBox[] {
  const boxes: FilmBox[] = [];
  for (const el of Array.from(stage.querySelectorAll<HTMLElement>('[data-film-text]'))) {
    const r = el.getBoundingClientRect();
    const height = el.tagName === 'OL' ? Math.max(el.offsetHeight, ...Array.from(el.children, (li) => (li as HTMLElement).offsetHeight)) : r.height;
    // Teks yang disembunyikan secara visual (1px) tidak menghalangi
    if (r.width > 2 && height > 2) boxes.push({ left: r.left - origin.left, top: r.top - origin.top, right: r.right - origin.left, bottom: r.top - origin.top + height });
  }
  return boxes;
}

/**
 * Panggung film yang pas di layar mana pun (lihat model fitFilmBus). Teks pendukung disembunyikan secara visual bertahap
 * (data-fit 1 = kalimat pengantar, 2 = + label, 3 = + kalimat bab & petunjuk gulir) hanya bila perlu: teks melewati garis
 * jalan, bus tertutup, atau (HP) bus hanya muat di bawah teks bila diperkecil di bawah 85%. Lalu --nl-fit-w / --nl-fit-x
 * (px) bila bus perlu digeser atau diperkecil.
 */
function fitFilmStage(stage: HTMLElement): void {
  stage.style.removeProperty('--nl-fit-w');
  stage.style.removeProperty('--nl-fit-x');
  const origin = stage.getBoundingClientRect();
  if (origin.width < 1 || origin.height < 1) return;
  const phone = origin.width < 768;
  let fit: BusFit | null = null;
  for (let level = 0; level <= 3; level += 1) {
    stage.setAttribute('data-fit', String(level));
    const boxes = filmTextBoxes(stage, origin);
    fit = fitFilmBus(origin.width, origin.height, boxes, phone);
    const textFits = boxes.every((b) => b.bottom <= 0.86 * origin.height);
    if (textFits && fit.ok && (!phone || fit.width >= fit.base * 0.85)) break;
  }
  if (fit && (fit.width !== fit.base || fit.x !== fit.x0)) {
    stage.style.setProperty('--nl-fit-w', `${fit.width}px`);
    stage.style.setProperty('--nl-fit-x', `${fit.x}px`);
  }
}

/** Wadah gulir terdekat (overflow-y auto/scroll yang benar-benar bisa digulir), atau null = jendela browser. */
function findScroller(el: HTMLElement): HTMLElement | null {
  let node = el.parentElement;
  while (node && node !== document.body && node !== document.documentElement) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) return node;
    node = node.parentElement;
  }
  return null;
}

/**
 * Progres film yang digulir. `track` = section tinggi (trek), `stage` = panggung sticky. Saat aktif:
 * - `--film-vh` (px) di trek = tinggi area gulir yang terlihat dikurangi --tpl-sticky-top (diukur saat pasang & resize);
 *   tinggi trek & panggung dihitung CSS dari angka ini;
 * - `--p` di panggung = clamp((atas area terlihat − atas trek) / (tinggi trek − tinggi area terlihat), 0, 1), 4 desimal,
 *   ditulis lewat style.setProperty hanya saat berubah, dibatasi requestAnimationFrame;
 * - `onProgress(p)` dipanggil di frame yang sama (tulis teks jam/km langsung ke DOM, setState hanya untuk bab aktif);
 * - saat pasang, resize, dan setelah huruf dimuat: panggung disesuaikan agar bus tidak tertutup teks (fitFilmStage).
 * Pendengar `scroll` (capture, menangkap gulir bingkai HP) dan `resize` hanya terpasang selama trek dekat layar
 * (IntersectionObserver); setiap kali trek kembali dekat layar, ukuran diukur ulang dulu (layar bisa diputar atau
 * diubah ukurannya saat pengunjung di bagian lain halaman). Semuanya dilepas saat unmount.
 */
export function useFilmProgress(
  track: RefObject<HTMLElement | null>,
  stage: RefObject<HTMLElement | null>,
  enabled: boolean,
  onProgress: (p: number) => void,
): void {
  const callback = useRef(onProgress);
  useLayoutEffect(() => {
    callback.current = onProgress;
  });

  useLayoutEffect(() => {
    const trackEl = track.current;
    const stageEl = stage.current;
    if (!enabled || !trackEl || !stageEl || typeof window === 'undefined' || typeof IntersectionObserver !== 'function') return;
    const scroller = findScroller(trackEl);
    let frame = 0;
    let listening = false;
    let last = -1;
    const stickyTop = () => Number.parseFloat(getComputedStyle(stageEl).top) || 0;
    const viewHeight = () => (scroller ? scroller.clientHeight : window.innerHeight);
    let sticky = stickyTop();

    let disposed = false;
    const measure = () => {
      sticky = stickyTop();
      // Batas bawah 240px hanya pengaman (wadah 0px); layar ≤ 480px sudah memakai papan cerita diam (useShortViewport)
      trackEl.style.setProperty('--film-vh', `${Math.max(240, Math.round(viewHeight() - sticky))}px`);
      fitFilmStage(stageEl);
    };
    const update = () => {
      frame = 0;
      const viewTop = (scroller ? scroller.getBoundingClientRect().top : 0) + sticky;
      const rect = trackEl.getBoundingClientRect();
      const rounded = scrollProgress(viewTop, rect.top, rect.height, viewHeight() - sticky);
      if (rounded === last) return;
      last = rounded;
      stageEl.style.setProperty('--p', rounded.toFixed(4));
      callback.current(rounded);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const onResize = () => {
      measure();
      onScroll();
    };
    const listen = (on: boolean) => {
      if (on === listening) return;
      listening = on;
      if (on) {
        // Ukuran layar mungkin berubah selama trek jauh dari layar (pendengar resize terlepas): ukur ulang dulu
        measure();
        // capture: gulir wadah mana pun (bingkai HP demo) ikut terdengar di window
        window.addEventListener('scroll', onScroll, { passive: true, capture: true });
        window.addEventListener('resize', onResize, { passive: true });
        onScroll();
      } else {
        window.removeEventListener('scroll', onScroll, { capture: true });
        window.removeEventListener('resize', onResize);
      }
    };
    measure();
    update();
    // Huruf judul dimuat belakangan → baris judul bisa berubah: ukur ulang sekali setelah huruf siap
    document.fonts?.ready.then(() => {
      if (!disposed) measure();
    });
    const observer = new IntersectionObserver((entries) => listen(entries.some((e) => e.isIntersecting)), { rootMargin: '25% 0px 25% 0px' });
    observer.observe(trackEl);
    return () => {
      disposed = true;
      observer.disconnect();
      listen(false);
      if (frame) window.cancelAnimationFrame(frame);
      trackEl.style.removeProperty('--film-vh');
      stageEl.style.removeProperty('--p');
      stageEl.style.removeProperty('--nl-fit-w');
      stageEl.style.removeProperty('--nl-fit-x');
      stageEl.removeAttribute('data-fit');
    };
  }, [enabled, track, stage]);
}
