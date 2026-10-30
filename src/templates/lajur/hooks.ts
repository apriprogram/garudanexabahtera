// Hook kecil Lajur: section yang sedang dibaca (garis aktif di menu atas) dan progres FILM yang digerakkan gulir.
// Tanpa IntersectionObserver / requestAnimationFrame (perayap, jsdom) → nilai awal, tanpa error. Ditulis di folder ini
// (pola sama dengan homenest/hooks.ts dan shared/motion.ts useParallax, tidak diimpor dari sana).
import { useEffect, useState, type RefObject } from 'react';
import { useSiteData } from '../shared/siteData';
import { chapterAt, clockAt, filmProgress, type FilmClock } from './model';

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

/** Wadah gulir terdekat (overflow-y auto/scroll dan benar-benar bisa digulir), selain itu null = jendela. */
function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let node = el.parentElement; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) return node;
  }
  return null;
}

const px = (value: string): number => {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Progres film 0 → 1 dari posisi gulir (kontrak batch 2026-10-29 §C). `track` = section tinggi (N × tinggi panggung),
 * `stage` = panggung sticky. Wadah gulir: induk terdekat yang bisa digulir (bingkai HP demo) atau jendela (desktop di
 * bawah bilah demo 64px). viewTop = tepi atas wadah + --tpl-sticky-top, viewH = tinggi wadah − sticky top,
 * p = clamp((viewTop − track.top) / (track.height − viewH)). Menulis `--p` (4 desimal) ke panggung dan `--film-vh`
 * (tinggi terlihat) ke track — TANPA setState per frame; state hanya bab aktif (berubah ≤ 5 kali) dan teks jam ditulis
 * langsung ke `clock` saat berubah. Pendengar gulir (window, capture: ikut gulir bingkai HP) + resize, dibatasi rAF,
 * hanya selama track dekat layar (IntersectionObserver). Semua dibersihkan saat unmount atau gerak mati.
 */
export function useFilmProgress({
  enabled,
  track,
  stage,
  clock,
  chapters,
  range,
}: {
  enabled: boolean;
  track: RefObject<HTMLElement | null>;
  stage: RefObject<HTMLElement | null>;
  clock: RefObject<HTMLElement | null>;
  chapters: number;
  range: FilmClock;
}): number {
  const [active, setActive] = useState(0);
  // Titik kunci jam sebagai teks: efek hanya dipasang ulang bila jam bab benar-benar berubah
  const signature = range.points.map((point) => point.join(':')).join(',');
  useEffect(() => {
    const trackEl = track.current;
    const stageEl = stage.current;
    if (!enabled || !trackEl || !stageEl || typeof IntersectionObserver !== 'function' || typeof window.requestAnimationFrame !== 'function') return;
    const scroller = scrollParent(trackEl);
    const span: FilmClock = { points: signature.split(',').map((pair) => pair.split(':').map(Number) as [number, number]) };
    let frame = 0;
    let listening = false;
    let lastP = '';
    let lastClock = '';
    let lastChapter = -1;
    const stickyTop = () => px(getComputedStyle(stageEl).getPropertyValue('--tpl-sticky-top'));
    const view = () => {
      const top = stickyTop();
      const height = (scroller ? scroller.clientHeight : window.innerHeight) - top;
      return { top: (scroller ? scroller.getBoundingClientRect().top : 0) + top, height: Math.max(1, height) };
    };
    const measure = () => {
      trackEl.style.setProperty('--film-vh', `${Math.round(view().height)}px`);
    };
    const update = () => {
      frame = 0;
      const { top, height } = view();
      const rect = trackEl.getBoundingClientRect();
      const p = filmProgress(top, rect.top, rect.height, height);
      const value = p.toFixed(4);
      if (value !== lastP) {
        lastP = value;
        stageEl.style.setProperty('--p', value);
      }
      const time = clockAt(p, span);
      if (time !== lastClock && clock.current) {
        lastClock = time;
        clock.current.textContent = time;
      }
      const chapter = Math.max(0, chapterAt(p, chapters));
      if (chapter !== lastChapter) {
        lastChapter = chapter;
        setActive(chapter);
      }
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
        window.addEventListener('scroll', onScroll, { passive: true, capture: true });
        window.addEventListener('resize', onResize, { passive: true });
        onResize();
      } else {
        window.removeEventListener('scroll', onScroll, { capture: true });
        window.removeEventListener('resize', onResize);
      }
    };
    measure();
    frame = window.requestAnimationFrame(update);
    const observer = new IntersectionObserver((entries) => listen(entries.some((e) => e.isIntersecting)), { rootMargin: '240px 0px' });
    observer.observe(trackEl);
    return () => {
      observer.disconnect();
      listen(false);
      if (frame) window.cancelAnimationFrame(frame);
      stageEl.style.removeProperty('--p');
      trackEl.style.removeProperty('--film-vh');
    };
  }, [enabled, track, stage, clock, chapters, signature]);
  return active;
}
