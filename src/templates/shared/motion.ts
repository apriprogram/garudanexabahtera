// Gerak template: kapan boleh bergerak + helper murni (angka, jeda bertahap) + hook parallax.
// Komponen gerak ada di ./Animated.tsx (Reveal, Marquee, CountUp); CSS-nya di ./template.css.
// Aturan: gerak hanya bila tempat render mengizinkan (runtime.motion: demo & situs live, BUKAN pratinjau CMS),
// pengunjung tidak memilih prefers-reduced-motion, dan browser punya IntersectionObserver. Selain itu semua isi
// langsung tampil apa adanya.
import { useEffect, useSyncExternalStore, type RefObject } from 'react';
import { useTemplateRuntime } from './runtime';

const REDUCE_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(onChange: () => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => undefined;
  const media = window.matchMedia(REDUCE_QUERY);
  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }
  media.addListener?.(onChange);
  return () => media.removeListener?.(onChange);
}

const readReducedMotion = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && !!window.matchMedia(REDUCE_QUERY)?.matches;

/** true bila pengunjung memilih kurangi gerak (ikut berubah saat pengaturan OS diganti). */
export const usePrefersReducedMotion = (): boolean => useSyncExternalStore(subscribeReducedMotion, readReducedMotion, () => true);

const canObserve = () => typeof window !== 'undefined' && typeof window.IntersectionObserver === 'function';

/** Boleh bergerak di render ini? Pakai untuk memilih versi statis vs bergerak (mis. marquee vs grid logo). */
export function useMotionEnabled(): boolean {
  const { motion } = useTemplateRuntime();
  const reduced = usePrefersReducedMotion();
  return motion && !reduced && canObserve();
}

/** Jeda bertahap untuk daftar: stagger(i) = 0, 80, 160 … (maks. 6 langkah agar item ke-10 tidak menunggu lama). */
export const stagger = (index: number, step = 80, maxSteps = 6): number => Math.min(Math.max(0, Math.floor(index)), maxSteps) * step;

/**
 * Panggil `onEnter` sekali saat elemen masuk layar (juga di dalam wadah gulir seperti bingkai HP demo).
 * Mengembalikan fungsi pembatal. Tanpa IntersectionObserver → langsung dipanggil.
 */
export function observeOnce(el: Element, onEnter: () => void, rootMargin = '0px 0px -8% 0px'): () => void {
  if (!canObserve()) {
    onEnter();
    return () => undefined;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        onEnter();
      }
    },
    { rootMargin, threshold: 0.08 },
  );
  observer.observe(el);
  return () => observer.disconnect();
}

const inViewport = (el: Element) => {
  const rect = el.getBoundingClientRect();
  const height = window.innerHeight || document.documentElement.clientHeight || 0;
  return rect.bottom > 0 && rect.top < height && rect.width > 0;
};

/**
 * Siklus gerak masuk yang aman:
 * - `arm` (sembunyikan / siapkan) baru dipanggil saat elemen MENDEKATI layar (≤ 35% tinggi layar di bawahnya) atau
 *   sudah terlihat saat dipasang (sinkron, sebelum digambar). Elemen jauh di bawah tetap tampil normal sampai
 *   didekati, jadi perayap / tangkapan halaman penuh tidak melihat bidang kosong.
 * - `enter` dipanggil saat elemen benar-benar masuk layar.
 * - Pengaman: 2,5 dtk setelah `arm`, bila elemen sudah di layar tetapi `enter` belum terjadi (tab latar, browser
 *   menahan observer) → `enter` dipanggil.
 * Tanpa IntersectionObserver → tidak ada yang disembunyikan (arm tidak dipanggil). Mengembalikan pembatal.
 */
export function watchEntrance(el: Element, { arm, enter }: { arm: () => void; enter: () => void }): () => void {
  if (!canObserve()) return () => undefined;
  let armed = false;
  let entered = false;
  let stopEnter: () => void = () => undefined;
  let safety = 0;
  const doEnter = () => {
    if (entered) return;
    entered = true;
    stopEnter();
    window.clearTimeout(safety);
    enter();
  };
  const doArm = () => {
    if (armed) return;
    armed = true;
    arm();
    stopEnter = observeOnce(el, doEnter);
    safety = window.setTimeout(() => {
      if (!entered && inViewport(el)) doEnter();
    }, 2500);
  };
  let armObserver: IntersectionObserver | null = null;
  if (inViewport(el)) doArm();
  else {
    armObserver = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        armObserver?.disconnect();
        doArm();
      },
      { rootMargin: '0px 0px 35% 0px' },
    );
    armObserver.observe(el);
  }
  return () => {
    armObserver?.disconnect();
    stopEnter();
    window.clearTimeout(safety);
  };
}

// ─── Angka berjalan ───────────────────────────────────────────────────────────

export interface CountParts {
  prefix: string;
  value: number;
  decimals: number;
  decimalSep: string;
  /** Pemisah ribuan yang dipakai di teks asli ("." untuk "12.000"), "" bila tidak ada */
  groupSep: string;
  suffix: string;
}

const COUNT_PATTERN = /^(\D*?)(\d{1,3}(?:([.\s,])\d{3})+|\d+)(?:([,.])(\d{1,2}))?(\D*)$/;

/**
 * Pecah angka statistik berformat Indonesia: "350+", "12.000+", "98%", "4,8", "2 jt+", "Rp 5 M".
 * Teks yang bukan satu angka (mis. "24/7", "4,8/5", "–") → null (ditampilkan apa adanya, tanpa animasi).
 */
export function parseCount(raw: string): CountParts | null {
  const match = COUNT_PATTERN.exec((raw || '').trim());
  if (!match) return null;
  const [, prefix, integer, groupSep = '', decimalSep = ',', decimals = '', suffix] = match;
  const whole = Number(integer.replace(/[.\s,]/g, ''));
  const value = decimals ? whole + Number(decimals) / 10 ** decimals.length : whole;
  if (!Number.isFinite(value)) return null;
  return { prefix, value, decimals: decimals.length, decimalSep, groupSep, suffix };
}

/** Tulis angka `n` dengan format yang sama seperti teks aslinya. formatCount(p, p.value) = teks asli. */
export function formatCount(parts: CountParts, n: number): string {
  const [integer, fraction] = Math.max(0, n).toFixed(parts.decimals).split('.');
  const grouped = parts.groupSep ? integer.replace(/\B(?=(\d{3})+(?!\d))/g, parts.groupSep) : integer;
  return `${parts.prefix}${grouped}${fraction ? parts.decimalSep + fraction : ''}${parts.suffix}`;
}

// ─── Parallax ─────────────────────────────────────────────────────────────────

/**
 * Isi variabel CSS `--tpl-parallax` (-1 … 1) pada elemen sesuai posisinya di layar; dipakai kelas
 * `tpl-photo-parallax` (lihat <Photo parallax>). Hanya mendengarkan gulir selama elemen terlihat.
 */
export function useParallax(ref: RefObject<HTMLElement | null>, enabled: boolean): void {
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || !canObserve()) return;
    let frame = 0;
    let listening = false;
    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const viewport = window.innerHeight || document.documentElement.clientHeight || 1;
      const progress = (viewport / 2 - (rect.top + rect.height / 2)) / (viewport / 2 + rect.height / 2);
      el.style.setProperty('--tpl-parallax', Math.max(-1, Math.min(1, progress)).toFixed(3));
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const listen = (on: boolean) => {
      if (on === listening) return;
      listening = on;
      // capture: gulir di wadah mana pun (bingkai HP demo) ikut terdengar
      if (on) {
        document.addEventListener('scroll', onScroll, { capture: true, passive: true });
        window.addEventListener('resize', onScroll, { passive: true });
        onScroll();
      } else {
        document.removeEventListener('scroll', onScroll, { capture: true });
        window.removeEventListener('resize', onScroll);
      }
    };
    const observer = new IntersectionObserver((entries) => listen(entries.some((e) => e.isIntersecting)));
    observer.observe(el);
    update();
    return () => {
      observer.disconnect();
      listen(false);
      if (frame) window.cancelAnimationFrame(frame);
      el.style.removeProperty('--tpl-parallax');
    };
  }, [ref, enabled]);
}
