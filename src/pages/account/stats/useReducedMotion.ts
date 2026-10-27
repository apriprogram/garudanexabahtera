// Pilihan "kurangi gerak" (prefers-reduced-motion) untuk grafik statistik: ikut berubah bila pengguna mengubahnya di
// sistem saat halaman terbuka. Browser tanpa matchMedia / render server = gerak tidak dikurangi.
import { useSyncExternalStore } from 'react';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

const subscribe = (onChange: () => void) => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => undefined;
  const media = window.matchMedia(REDUCED_MOTION);
  media.addEventListener?.('change', onChange);
  return () => media.removeEventListener?.('change', onChange);
};

const read = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && !!window.matchMedia(REDUCED_MOTION)?.matches;

/** true = pengguna memilih gerak dikurangi: animasi grafik dimatikan. */
export const usePrefersReducedMotion = () => useSyncExternalStore(subscribe, read, () => false);
