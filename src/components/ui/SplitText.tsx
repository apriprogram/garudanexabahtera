import React, { Fragment } from 'react';
import { useReveal } from './useReveal';

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
 * Teks yang muncul kata per kata dari balik "masker" saat digulir ke dalam layar (port SplitText BELAJAR CPNS).
 * - HTML prerender dan render hidrasi: kata-kata langsung terlihat (judul di atas lipatan, mis. H1 hero, tidak pernah
 *   disembunyikan); hanya judul di bawah lipatan yang disembunyikan setelah dipasang lalu muncul saat digulir
 *   (useReveal). Reduced motion = langsung tampil.
 * - Antarkata ada spasi asli (node teks), jadi pembaca layar dan crawler membaca "kata kata", bukan "katakata".
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
  const [ref, state] = useReveal<HTMLElement>({ rootMargin: '0px 0px -5% 0px' });
  const hidden = !active || state === 'armed';
  const segments = typeof parts === 'string' ? [{ text: parts }] : parts;
  let index = 0;

  return (
    <Tag
      // ref generik: semua tag di atas adalah HTMLElement
      ref={ref as React.Ref<never>}
      id={id}
      className={['split', hidden ? 'is-hidden' : '', className].filter(Boolean).join(' ')}
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
