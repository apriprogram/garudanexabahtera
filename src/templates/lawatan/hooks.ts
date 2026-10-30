// Hook Lawatan: section yang sedang dibaca (garis aktif di menu), kemajuan film gulir (--p, --q, --film-vh, bab aktif, km),
// apakah panggung film muat di layar, geseran rel kartu pos (--reel-shift), garis rute hero yang tergambar sekali dengan
// bus kecil, dan angka estimasi yang bergerak ke nilai baru. Tanpa IntersectionObserver / requestAnimationFrame (perayap,
// jsdom) → keadaan akhir, tanpa error. Ditulis di folder ini (pola sama dengan homenest/hooks.ts dan shared/motion
// useParallax, tidak diimpor dari sana).
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react';
import { useSiteData } from '../shared/siteData';
import { chapterAt, filmProgress, filmSize, filmTooShort, kmAlong, reelProgress, steadyHeight } from './model';

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

/** Wadah gulir terdekat (overflow-y auto/scroll dan isinya lebih tinggi), mis. bingkai HP demo; null = jendela. */
function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let node = el.parentElement; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (/(auto|scroll|overlay)/.test(overflowY) && node.scrollHeight > node.clientHeight) return node;
  }
  return null;
}

const canAnimate = () => typeof window !== 'undefined' && typeof window.IntersectionObserver === 'function' && typeof window.requestAnimationFrame === 'function';

/** Layar sentuh (bilah alamat HP bisa muncul/hilang dan mengubah tinggi jendela). */
const isCoarse = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && !!window.matchMedia('(pointer: coarse)')?.matches;

/** --tpl-sticky-top (px) yang berlaku di elemen ini (bar demo / header situs), 0 bila tidak ada. */
const stickyTopOf = (el: Element): number => Number.parseFloat(getComputedStyle(el).getPropertyValue('--tpl-sticky-top')) || 0;

/**
 * Wadah ukur "apakah panggung film muat" (lihat useFilmFits). Elemen jangkar didaftarkan lewat callback ref `attach`
 * (dipanggil saat commit, bukan saat render); hasil disimpan dan dibaca `get` (snapshot useSyncExternalStore).
 */
function createFitStore() {
  let el: HTMLElement | null = null;
  let fits = true;
  let height = 0;
  let width = -1;
  const listeners = new Set<() => void>();
  const measure = () => {
    if (!el || typeof window === 'undefined') return;
    const scroller = scrollParent(el);
    const root = el.closest<HTMLElement>('[data-tpl-root]') ?? el;
    const nextWidth = root.clientWidth;
    const raw = (scroller ? scroller.clientHeight : window.innerHeight) - stickyTopOf(el);
    height = scroller ? raw : steadyHeight(raw, height, nextWidth === width, isCoarse());
    width = nextWidth;
    const next = !filmTooShort(height, width);
    if (next === fits) return;
    fits = next;
    for (const notify of listeners) notify();
  };
  return {
    attach: (node: HTMLElement | null) => {
      el = node;
      measure();
    },
    subscribe: (notify: () => void) => {
      listeners.add(notify);
      window.addEventListener('resize', measure, { passive: true });
      measure();
      return () => {
        listeners.delete(notify);
        window.removeEventListener('resize', measure);
      };
    },
    get: () => fits,
  };
}

const fitsAlways = () => true;
const subscribeNothing = () => () => undefined;

/**
 * Apakah panggung film muat di layar (tinggi terlihat − --tpl-sticky-top ≥ batas model `filmTooShort`: layar lebar 520px,
 * HP 460px)? HP mendatar dan layar pendek lain → false → papan cerita statis (kartu tidak terpotong dan tidak menutupi
 * pita rute). Diukur saat jangkar dipasang dan setiap ukuran jendela berubah (layar sentuh: bilah alamat diabaikan).
 * Tanpa setState di efek: useSyncExternalStore dengan nilai yang hanya berubah bila hasilnya berubah. Pasang `attach`
 * sebagai `ref` pada elemen yang ada di film bergerak MAUPUN papan cerita.
 */
export function useFilmFits(enabled: boolean): { fits: boolean; attach: (node: HTMLElement | null) => void } {
  const [store] = useState(createFitStore);
  const fits = useSyncExternalStore(enabled ? store.subscribe : subscribeNothing, enabled ? store.get : fitsAlways, fitsAlways);
  return { fits, attach: store.attach };
}

export interface FilmProgressOptions {
  /** Section tinggi (trek); `--film-vh` ditulis di sini */
  track: RefObject<HTMLElement | null>;
  /** Panggung lengket; `--p` (0 … 1, 4 desimal) ditulis di sini */
  stage: RefObject<HTMLElement | null>;
  /** Jumlah bab (titik) */
  count: number;
  /** Gerak menyala (useMotionEnabled) */
  enabled: boolean;
  /** Elemen penghitung km (teks ditulis langsung, hanya saat angkanya berubah) */
  kmRef?: RefObject<HTMLElement | null>;
  /** Km per titik dipisah koma ("0,105,148"), kosong = tanpa penghitung; string agar dependensi efek stabil */
  kms?: string;
}

/**
 * Kemajuan film gulir (kontrak batch-delta §C): p = clamp((viewTop − track.top) / (track.height − viewH), 0, 1) dengan
 * viewTop/viewH dari wadah gulir terdekat (bingkai HP demo) atau jendela, dikurangi --tpl-sticky-top. `--film-vh` =
 * tinggi terlihat − sticky top; di layar sentuh tingginya stabil (bilah alamat yang muncul/hilang diabaikan, model
 * steadyHeight) agar trek & p tidak melompat. Gulir didengar di window (passive + capture: gulir bingkai HP ikut),
 * dibatasi requestAnimationFrame, hanya selama trek dekat layar (IntersectionObserver). Tanpa setState per frame: `--p`,
 * `--q` (rel kartu pos berjeda di tiap titik, model reelProgress) & km ditulis langsung ke DOM; state React hanya bab
 * aktif (berubah ≤ jumlah titik kali). Foto kartu pos (lazy) dimuat begitu trek ± satu layar lagi terlihat, jadi kartu
 * tidak meluncur masuk sebagai panel kosong. Mengembalikan indeks bab aktif.
 */
export function useFilmProgress({ track, stage, count, enabled, kmRef, kms = '' }: FilmProgressOptions): number {
  const [chapter, setChapter] = useState(0);
  useEffect(() => {
    const trackEl = track.current;
    const stageEl = stage.current;
    if (!enabled || !trackEl || !stageEl || !canAnimate()) return;
    const scroller = scrollParent(trackEl);
    const coarse = isCoarse();
    const kmList = kms ? kms.split(',').map(Number) : [];
    let frame = 0;
    let listening = false;
    let lastP = -1;
    let lastQ = -1;
    let lastVh = -1;
    let lastWidth = -1;
    let lastKm = -1;
    let lastChapter = -1;
    let viewH = 0;

    const update = () => {
      frame = 0;
      const sticky = stickyTopOf(stageEl);
      const viewTop = (scroller ? scroller.getBoundingClientRect().top : 0) + sticky;
      const width = stageEl.clientWidth;
      const raw = (scroller ? scroller.clientHeight : window.innerHeight) - sticky;
      viewH = scroller ? raw : steadyHeight(raw, viewH, width === lastWidth, coarse);
      const vh = Math.max(320, Math.round(viewH));
      if (vh !== lastVh || width !== lastWidth) {
        lastVh = vh;
        lastWidth = width;
        trackEl.style.setProperty('--film-vh', `${vh}px`);
        // Panggung pendek → kartu ringkas (./lawatan.css)
        stageEl.setAttribute('data-size', filmSize(vh, width));
      }
      const rect = trackEl.getBoundingClientRect();
      const p = filmProgress(viewTop, rect.top, rect.height, viewH);
      if (p !== lastP) {
        lastP = p;
        stageEl.style.setProperty('--p', p.toFixed(4));
        const q = reelProgress(p, count);
        if (q !== lastQ) {
          lastQ = q;
          stageEl.style.setProperty('--q', q.toFixed(4));
        }
        const kmEl = kmRef?.current;
        if (kmEl && kmList.length > 1) {
          const km = kmAlong(kmList, p);
          if (km !== lastKm) {
            lastKm = km;
            kmEl.textContent = String(km);
          }
        }
      }
      const next = chapterAt(p, count);
      if (next !== lastChapter) {
        lastChapter = next;
        setChapter(next);
      }
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const listen = (on: boolean) => {
      if (on === listening) return;
      listening = on;
      if (on) {
        window.addEventListener('scroll', schedule, { passive: true, capture: true });
        window.addEventListener('resize', schedule, { passive: true });
        schedule();
      } else {
        window.removeEventListener('scroll', schedule, { capture: true });
        window.removeEventListener('resize', schedule);
      }
    };
    const observer = new IntersectionObserver((entries) => listen(entries.some((e) => e.isIntersecting)), { root: scroller, rootMargin: '25% 0px 25% 0px' });
    observer.observe(trackEl);
    // Foto kartu pos: lazy → eager SEKALI saat trek ± satu layar lagi terlihat (6 file ± 50 KB, hanya untuk pengunjung
    // yang sampai ke film), jadi kartu di luar panggung sudah termuat sebelum bergeser masuk
    const preload = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        preload.disconnect();
        stageEl.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach((img) => {
          img.loading = 'eager';
        });
      },
      { root: scroller, rootMargin: '100% 0px 100% 0px' },
    );
    preload.observe(trackEl);
    // Ukuran awal (--film-vh) & posisi awal, sebelum trek terlihat
    schedule();
    return () => {
      observer.disconnect();
      preload.disconnect();
      listen(false);
      if (frame) window.cancelAnimationFrame(frame);
      stageEl.style.removeProperty('--p');
      stageEl.style.removeProperty('--q');
      stageEl.removeAttribute('data-size');
      trackEl.style.removeProperty('--film-vh');
    };
  }, [track, stage, count, enabled, kmRef, kms]);
  return enabled ? chapter : 0;
}

/**
 * Geseran rel kartu pos: jarak pusat kartu pertama → pusat kartu terakhir (px) ditulis sebagai `--reel-shift` di
 * panggung. Rel diberi padding kiri 50% − ½ kartu (HP: tepi wadah 20px), jadi translateX(−p × shift) menaruh kartu ke-i
 * tepat di posisi kartu aktif (tengah / tepi kiri) pada p = i / (n − 1). Diukur ulang saat ukuran rel berubah
 * (ResizeObserver) atau jendela berubah.
 */
export function useReelShift(stage: RefObject<HTMLElement | null>, strip: RefObject<HTMLElement | null>, enabled: boolean): void {
  useEffect(() => {
    const stageEl = stage.current;
    const stripEl = strip.current;
    if (!enabled || !stageEl || !stripEl || !canAnimate()) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const cards = stripEl.children;
      if (cards.length < 2) return;
      const first = cards[0] as HTMLElement;
      const last = cards[cards.length - 1] as HTMLElement;
      const shift = last.offsetLeft + last.offsetWidth / 2 - (first.offsetLeft + first.offsetWidth / 2);
      stageEl.style.setProperty('--reel-shift', `${Math.max(0, Math.round(shift))}px`);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
    observer?.observe(stripEl);
    window.addEventListener('resize', schedule, { passive: true });
    schedule();
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', schedule);
      if (frame) window.cancelAnimationFrame(frame);
      stageEl.style.removeProperty('--reel-shift');
    };
  }, [stage, strip, enabled]);
}

/**
 * Garis rute hero tergambar SEKALI (± 1,4 dtk) sementara bus kecil mengikutinya. SVG berisi `path[data-route]` (jalur,
 * untuk getPointAtLength), `path[data-route-mask]` (pathLength=1, stroke-dasharray 1: topeng garis titik-titik), dan
 * `g[data-route-bus]`. Keadaan diam (gerak mati / jsdom) = keadaan akhir: garis utuh, bus di ujung (atribut transform
 * dari komponen). SVG yang tersembunyi (versi HP/desktop lain) dilewati.
 */
export function useRouteDraw(svg: RefObject<SVGSVGElement | null>, enabled: boolean, park = 0.92, delay = 500, duration = 1400): void {
  useLayoutEffect(() => {
    const el = svg.current;
    if (!enabled || !el || !canAnimate() || el.getBoundingClientRect().width === 0) return;
    const path = el.querySelector<SVGPathElement>('path[data-route]');
    const mask = el.querySelector<SVGPathElement>('path[data-route-mask]');
    const bus = el.querySelector<SVGGElement>('g[data-route-bus]');
    if (!path || !mask || !bus || typeof path.getTotalLength !== 'function') return;
    const final = bus.getAttribute('transform') ?? '';
    const length = path.getTotalLength();
    let frame = 0;
    const place = (t: number) => {
      const point = path.getPointAtLength(length * t * park);
      mask.style.strokeDashoffset = String(1 - t);
      bus.setAttribute('transform', `translate(${point.x.toFixed(1)} ${point.y.toFixed(1)})`);
    };
    const reset = () => {
      mask.style.strokeDashoffset = '';
      bus.style.opacity = '';
      bus.setAttribute('transform', final);
    };
    // Sebelum digambar: garis belum terlihat, bus di titik awal tetapi tersembunyi sampai berangkat
    place(0);
    bus.style.opacity = '0';
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / duration);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
      place(eased);
      if (t < 1) frame = window.requestAnimationFrame(tick);
      else reset();
    };
    const timer = window.setTimeout(() => {
      bus.style.opacity = '1';
      frame = window.requestAnimationFrame(tick);
    }, delay);
    // Pengaman bila frame ditahan browser (tab latar): keadaan akhir tetap muncul
    const safety = window.setTimeout(reset, delay + duration + 600);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(safety);
      if (frame) window.cancelAnimationFrame(frame);
      reset();
    };
  }, [svg, enabled, park, delay, duration]);
}

/**
 * Angka yang bergerak dari nilai lama ke nilai baru (± 450 ms) setiap `value` berubah. Nilai akhir selalu ada di DOM
 * (`finalRef`, dibaca pembaca layar & uji); angka berjalan ditulis ke `runRef` (aria-hidden) yang tidak berisi anak
 * React. `format` harus fungsi tetap (tingkat modul). Gerak mati → diam.
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
    const safety = window.setTimeout(reset, duration + 400);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(safety);
      reset();
    };
  }, [value, enabled, duration, format, finalRef, runRef]);
}
