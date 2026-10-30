// Hook Pesiar: section yang sedang dibaca (garis aktif di menu atas), "sudah digulir" (header transparan di atas foto
// hero → pasir padat), angka harga yang bergerak ke nilai baru, dan PROGRES FILM yang digerakkan gulir. Tanpa
// IntersectionObserver / requestAnimationFrame (perayap, jsdom) → nilai awal / langsung nilai akhir, tanpa error.
// Ditulis di folder ini (pola sama dengan homenest/hooks.ts dan shared/motion.ts useParallax, tidak diimpor dari sana).
import { useEffect, useRef, useState, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import { useSiteData } from '../shared/siteData';
import { filmProgress } from './model';

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
    if (!enabled || !final || !run || from === value || from <= 0 || value <= 0 || typeof window.requestAnimationFrame !== 'function') return;
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

/**
 * true bila halaman punya tata letak nyata (ukuran elemen > 0). Lingkungan tanpa tata letak (jsdom di uji, perayap
 * sederhana) → false: film bergulir butuh ukuran, jadi di sana film tampil sebagai poster diam (kontrak "gerak mati").
 * Dihitung sekali saat komponen dipasang.
 */
export function useLayoutAvailable(): boolean {
  const [available] = useState(() => typeof document !== 'undefined' && document.documentElement.getBoundingClientRect().height > 0);
  return available;
}

/**
 * true selama halaman dicetak (beforeprint → afterprint) atau media cetak aktif (matchMedia('print'), juga emulasi).
 * Dirender SINKRON (flushSync) di beforeprint agar tata letak cetak sudah memakai versi diam (film → poster). Tanpa
 * matchMedia (jsdom lama, perayap) → false.
 */
export function usePrinting(): boolean {
  const [printing, setPrinting] = useState(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && !!window.matchMedia('print')?.matches);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('print');
    if (!media) return;
    const set = (on: boolean) => flushSync(() => setPrinting(on));
    const onChange = () => set(media.matches);
    const onBefore = () => set(true);
    const onAfter = () => set(media.matches);
    media.addEventListener?.('change', onChange);
    window.addEventListener('beforeprint', onBefore);
    window.addEventListener('afterprint', onAfter);
    return () => {
      media.removeEventListener?.('change', onChange);
      window.removeEventListener('beforeprint', onBefore);
      window.removeEventListener('afterprint', onAfter);
    };
  }, []);
  return printing;
}

/**
 * Fokus ke isian / judul hasil formulir tanpa tertutup bilah lengket (bilah demo + header). Fokus bawaan browser hanya
 * menggulir sampai elemen menyentuh tepi layar — di bawah header lengket. Di sini: fokus tanpa gulir, lalu gulir HANYA
 * bila elemen tertutup bilah (di atas scroll-margin-top-nya, lihat FOCUS_SCROLL di ./styles) atau di bawah layar;
 * scrollIntoView memakai scroll-margin-top itu. Tanpa tata letak (jsdom) → hanya fokus.
 */
export function focusField(el: HTMLElement | null | undefined): void {
  if (!el) return;
  el.focus({ preventScroll: true });
  if (typeof el.scrollIntoView !== 'function') return;
  const rect = el.getBoundingClientRect();
  if (rect.height === 0 && rect.width === 0) return;
  const margin = Number.parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  if (rect.top < margin || rect.bottom > window.innerHeight) el.scrollIntoView({ block: 'start' });
}

/** Wadah gulir terdekat (overflow-y auto/scroll dan isinya lebih tinggi), mis. bingkai HP demo; tidak ada → null (window). */
function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let node = el.parentElement; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (/(auto|scroll|overlay)/.test(overflowY) && node.scrollHeight > node.clientHeight + 1) return node;
  }
  return null;
}

export interface FilmViewport {
  /** Tinggi area terlihat di bawah bilah lengket (px) = tinggi panggung */
  height: number;
  /** Lebar panggung (px) */
  width: number;
}

/**
 * Progres film 0 → 1 yang digerakkan gulir (kontrak batch "film"). `track` = jalur tinggi (N × tinggi panggung),
 * `stage` = panggung lengket di dalamnya. Menulis `--film-vh` (tinggi area terlihat dikurangi --tpl-sticky-top) di
 * jalur dan `--p` (4 desimal) di panggung lewat style.setProperty — TANPA setState per frame. `onFrame(p)` dipanggil di
 * requestAnimationFrame hanya saat p berubah; `onMeasure` saat ukuran berubah. Gulir didengar di window dengan capture
 * (juga gulir bingkai HP demo), hanya selama jalur dekat layar (IntersectionObserver). Semua dibersihkan saat lepas.
 */
export function useFilmProgress(
  track: RefObject<HTMLElement | null>,
  stage: RefObject<HTMLElement | null>,
  enabled: boolean,
  onFrame: (p: number) => void,
  onMeasure: (view: FilmViewport) => void,
): void {
  const frameRef = useRef(onFrame);
  const measureRef = useRef(onMeasure);
  useEffect(() => {
    frameRef.current = onFrame;
    measureRef.current = onMeasure;
  });

  useEffect(() => {
    const trackEl = track.current;
    const stageEl = stage.current;
    if (!enabled || !trackEl || !stageEl || typeof IntersectionObserver !== 'function' || typeof window.requestAnimationFrame !== 'function') return;
    const scroller = scrollParent(trackEl);
    let viewTop = 0;
    let viewH = 1;
    let frame = 0;
    let lastP = -1;
    let listening = false;

    const measure = () => {
      const sticky = Number.parseFloat(getComputedStyle(trackEl).getPropertyValue('--tpl-sticky-top')) || 0;
      if (scroller) {
        viewTop = scroller.getBoundingClientRect().top + sticky;
        viewH = Math.max(1, scroller.clientHeight - sticky);
      } else {
        viewTop = sticky;
        viewH = Math.max(1, window.innerHeight - sticky);
      }
      trackEl.style.setProperty('--film-vh', `${Math.round(viewH)}px`);
      measureRef.current({ height: Math.round(viewH), width: stageEl.clientWidth });
    };
    const update = () => {
      frame = 0;
      const rect = trackEl.getBoundingClientRect();
      const p = filmProgress(viewTop, viewH, rect.top, rect.height);
      if (Math.abs(p - lastP) < 0.00005) return;
      lastP = p;
      stageEl.style.setProperty('--p', p.toFixed(4));
      frameRef.current(p);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const onResize = () => {
      measure();
      lastP = -1;
      onScroll();
    };
    const listen = (on: boolean) => {
      if (on === listening) return;
      listening = on;
      if (on) {
        // capture: gulir wadah mana pun (bingkai HP demo) ikut terdengar
        window.addEventListener('scroll', onScroll, { capture: true, passive: true });
        window.addEventListener('resize', onResize, { passive: true });
        onResize();
      } else {
        window.removeEventListener('scroll', onScroll, { capture: true });
        window.removeEventListener('resize', onResize);
      }
    };
    const observer = new IntersectionObserver((entries) => listen(entries.some((e) => e.isIntersecting)), { rootMargin: '25% 0px 25% 0px' });
    observer.observe(trackEl);
    const resizer = typeof ResizeObserver === 'function' ? new ResizeObserver(onResize) : null;
    resizer?.observe(stageEl);
    if (scroller) resizer?.observe(scroller);
    measure();
    update();
    return () => {
      observer.disconnect();
      resizer?.disconnect();
      listen(false);
      if (frame) window.cancelAnimationFrame(frame);
      trackEl.style.removeProperty('--film-vh');
      stageEl.style.removeProperty('--p');
    };
  }, [track, stage, enabled]);
}
