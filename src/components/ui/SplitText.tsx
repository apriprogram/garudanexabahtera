import React, { Fragment } from 'react';
import { useInView } from '../../hooks/useInView';

export interface SplitPart {
  text: string;
  /** Kelas untuk kata-kata bagian ini, mis. `text-primary` untuk kata kunci biru. */
  className?: string;
}

interface SplitTextProps {
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div';
  /** Teks utuh, atau beberapa bagian dengan warna berbeda (judul dua warna). */
  parts: string | SplitPart[];
  /** Jeda awal (ms) dan jeda antarkata (ms). */
  delay?: number;
  stagger?: number;
  /** false = kata-kata disembunyikan (dipakai panel tab yang tidak aktif); true lagi = animasi diputar ulang. */
  active?: boolean;
  className?: string;
  id?: string;
}

/**
 * Teks yang muncul kata per kata dari balik "masker" saat terlihat (port SplitText BELAJAR CPNS).
 * Teks tetap utuh untuk pembaca layar (spasi asli dipertahankan); reduced motion = langsung tampil.
 */
export const SplitText: React.FC<SplitTextProps> = ({
  as: Tag = 'span',
  parts,
  delay = 0,
  stagger = 45,
  active = true,
  className = '',
  id,
}) => {
  const [ref, inView] = useInView<HTMLElement>({ rootMargin: '0px 0px -5% 0px' });
  const segments = typeof parts === 'string' ? [{ text: parts }] : parts;
  let index = 0;

  return (
    <Tag
      // ref generik: semua tag di atas adalah HTMLElement
      ref={ref as React.Ref<never>}
      id={id}
      className={`split ${inView && active ? 'is-in' : ''} ${className}`}
      style={{ '--d': `${delay}ms`, '--s': `${stagger}ms` } as React.CSSProperties}
    >
      {segments.map((segment, si) =>
        segment.text
          .split(/\s+/)
          .filter(Boolean)
          .map((word, wi) => (
            <Fragment key={`${si}-${wi}`}>
              <span className="split-word">
                <span className={segment.className} style={{ '--i': index++ } as React.CSSProperties}>
                  {word}
                </span>
              </span>{' '}
            </Fragment>
          )),
      )}
    </Tag>
  );
};
