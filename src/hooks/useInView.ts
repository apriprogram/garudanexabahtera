import { useEffect, useRef, useState } from 'react';

interface InViewOptions {
  /** Bagian elemen yang harus terlihat (0 = begitu tepi atasnya masuk). Default 0 agar elemen tinggi tetap terpicu. */
  threshold?: number;
  rootMargin?: string;
}

/**
 * true sekali saat elemen masuk viewport (lalu berhenti memantau). Dipakai <Reveal> dan <SplitText>.
 * Tanpa IntersectionObserver (browser lama) langsung dianggap terlihat.
 */
export const useInView = <T extends Element>({ threshold = 0, rootMargin = '0px 0px -8% 0px' }: InViewOptions = {}) => {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(() => typeof window !== 'undefined' && typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, rootMargin]);

  return [ref, inView] as const;
};

/** Preferensi "kurangi gerakan" dari sistem (dibaca sekali saat komponen dipasang). */
export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
