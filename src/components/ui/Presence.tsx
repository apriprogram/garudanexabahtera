import { useEffect, useState, type HTMLAttributes } from 'react';

interface PresenceProps extends HTMLAttributes<HTMLDivElement> {
  /** true = dipasang lalu transisi masuk; false = transisi keluar lalu dilepas dari DOM. */
  show: boolean;
  /** Kelas keadaan tersembunyi (awal masuk & akhir keluar), mis. `translate-y-2 opacity-0`. */
  hiddenClassName: string;
  /** Lama transisi keluar (ms) sebelum isi dilepas; samakan dengan kelas `duration-*` di `className`. */
  exitMs?: number;
}

/**
 * Pengganti ringan AnimatePresence + motion.div untuk panel melayang sederhana (dropdown navbar, menu urutkan):
 * transisi CSS biasa, jadi framer-motion tidak ikut di bundel awal halaman publik (docs/platform/SEO-PLAN.md §5.7).
 * `className` memuat kelas transisi (mis. `transition-[opacity,translate] duration-[180ms]`); reduced motion diatur
 * lewat varian `motion-reduce:` di kelas yang sama. Tertutup = tidak dirender (juga di HTML prerender).
 */
export function Presence({ show, hiddenClassName, exitMs = 200, className = '', children, ...rest }: PresenceProps) {
  const [mounted, setMounted] = useState(show);
  // Sudah melewati satu frame dalam keadaan tersembunyi (titik awal transisi masuk)
  const [entered, setEntered] = useState(show);

  // Dibuka lagi: pasang dulu (pola "sesuaikan state saat render" React)
  if (show && !mounted) setMounted(true);

  useEffect(() => {
    if (show) {
      if (entered) return undefined;
      // Dua frame: browser sempat menghitung gaya tersembunyi, baru kelasnya dilepas sehingga transisi berjalan
      let second = 0;
      const first = requestAnimationFrame(() => {
        second = requestAnimationFrame(() => setEntered(true));
      });
      return () => {
        cancelAnimationFrame(first);
        cancelAnimationFrame(second);
      };
    }
    if (!mounted) return undefined;
    const timer = window.setTimeout(() => {
      setMounted(false);
      setEntered(false);
    }, exitMs);
    return () => window.clearTimeout(timer);
  }, [show, entered, mounted, exitMs]);

  if (!mounted) return null;
  const visible = show && entered;
  return (
    <div {...rest} className={visible ? className : `${className} ${hiddenClassName}`}>
      {children}
    </div>
  );
}

export default Presence;
