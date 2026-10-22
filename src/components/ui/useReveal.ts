import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../../hooks/useInView';
import { useHydrated } from '../../lib/preload';

/**
 * Keadaan animasi muncul <Reveal> / <SplitText>:
 * - 'static': terlihat penuh tanpa animasi (HTML prerender, atas lipatan, reduced motion, tanpa IntersectionObserver);
 * - 'armed': disembunyikan, menunggu masuk viewport;
 * - 'in': sudah masuk viewport, transisi ke tampil.
 */
export type RevealState = 'static' | 'armed' | 'in';

const canAnimate = () => typeof IntersectionObserver !== 'undefined' && !prefersReducedMotion();

/**
 * Sebagian elemen ada di layar (tanpa margin): sudah terlihat pengunjung, jangan disembunyikan lagi. Memakai kotak dari
 * entri IntersectionObserver, bukan getBoundingClientRect(), supaya tidak memaksa tata letak isi section yang masih
 * dilewati `content-visibility: auto` (.section-screen di index.css).
 */
const onScreenNow = (rect: DOMRectReadOnly | undefined) => {
  if (!rect) return false;
  const height = window.innerHeight || document.documentElement.clientHeight;
  return rect.bottom > 0 && rect.top < height && (rect.width > 0 || rect.height > 0);
};

/**
 * Animasi muncul saat digulir yang aman untuk HTML prerender (docs/platform/SEO-PLAN.md §5.7):
 * - render server dan render hidrasi selalu 'static', jadi isi terlihat tanpa JavaScript dan HTML klien pertama
 *   sama persis dengan HTML server;
 * - setelah dipasang, hanya elemen yang belum terlihat (di bawah lipatan) yang disembunyikan ('armed') lalu muncul
 *   saat masuk viewport ('in'); elemen yang sudah di layar tetap diam;
 * - komponen yang baru dipasang setelah hidrasi (navigasi di klien, panel tab yang diaktifkan) langsung 'armed'
 *   sehingga tetap beranimasi seperti biasa;
 * - reduced motion atau browser tanpa IntersectionObserver: selalu 'static'.
 */
export function useReveal<T extends Element>({ rootMargin = '0px 0px -8% 0px' }: { rootMargin?: string } = {}) {
  const ref = useRef<T | null>(null);
  // false saat render server & render hidrasi, true untuk render klien lainnya. Dibaca sekali saat render pertama:
  // komponen yang dihidrasi tetap dianggap "dari server" walau nilainya menjadi true setelah hidrasi.
  const clientRender = useHydrated();
  const [state, setState] = useState<RevealState>(() => (clientRender && canAnimate() ? 'armed' : 'static'));
  const settled = state === 'in';

  useEffect(() => {
    const el = ref.current;
    if (!el || settled || !canAnimate()) return undefined;
    let first = true;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        // Panggilan pertama: elemen di pita bawah rootMargin juga sudah terlihat pengunjung
        const visible = entry.isIntersecting || (first && onScreenNow(entry.boundingClientRect as DOMRectReadOnly | undefined));
        first = false;
        if (visible) {
          // 'static' tetap diam (sudah terlihat sejak awal); 'armed' tampil dengan transisi
          setState((current) => (current === 'armed' ? 'in' : current));
          io.disconnect();
          return;
        }
        // Belum terlihat (di bawah lipatan): sembunyikan sampai masuk viewport
        setState((current) => (current === 'static' ? 'armed' : current));
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin, settled]);

  return [ref, state] as const;
}
