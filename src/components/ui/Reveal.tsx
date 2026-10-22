import React from 'react';
import { useReveal } from './useReveal';

interface RevealProps {
  children: React.ReactNode;
  width?: 'fit-content' | '100%';
  height?: 'fit-content' | '100%';
  /** Jeda sebelum muncul, dalam DETIK (mis. 0.1). */
  delay?: number;
  /** Arah datang: up = dari bawah (default), down = dari atas, left = bergeser ke kiri, right = bergeser ke kanan. */
  direction?: 'up' | 'down' | 'left' | 'right';
  /** scale = sedikit membesar, fade = hanya memudar. Menimpa `direction`. */
  variant?: 'scale' | 'fade';
  /** Tidak berpengaruh lagi (isi tidak pernah dipotong); tetap ada agar pemanggil lama tetap valid. */
  overflowVisible?: boolean;
  className?: string;
}

/**
 * Animasi muncul saat digulir, gaya BELAJAR CPNS: memudar + naik + blur halus (HP: tanpa blur, geser 16px).
 * Murni CSS (`.reveal` di src/index.css) + IntersectionObserver lewat useReveal: isi SELALU terlihat di HTML
 * prerender dan di atas lipatan; hanya bagian di bawah lipatan yang disembunyikan setelah dipasang lalu muncul saat
 * digulir. Reduced motion: langsung tampil.
 */
export const Reveal: React.FC<RevealProps> = ({
  children,
  width = '100%',
  height = 'fit-content',
  delay = 0,
  direction = 'up',
  variant,
  className = '',
}) => {
  const [ref, state] = useReveal<HTMLDivElement>();
  const stateClass = state === 'armed' ? 'is-armed' : state === 'in' ? 'is-in' : '';

  return (
    <div
      ref={ref}
      data-variant={variant ?? direction}
      className={['reveal', stateClass, className].filter(Boolean).join(' ')}
      style={{ width, height, '--d': `${Math.round(delay * 1000)}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  );
};
