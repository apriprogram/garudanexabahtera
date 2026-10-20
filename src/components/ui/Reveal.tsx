import React from 'react';
import { useInView } from '../../hooks/useInView';

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
 * Animasi muncul saat digulir, gaya BELAJAR CPNS: memudar + naik + blur halus (HP: tanpa blur, geser 16px;
 * reduced motion: langsung tampil). Murni CSS (`.reveal` di src/index.css) + IntersectionObserver.
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
  const [ref, inView] = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      data-variant={variant ?? direction}
      className={`reveal ${inView ? 'is-in' : ''} ${className}`}
      style={{ width, height, '--d': `${Math.round(delay * 1000)}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  );
};
