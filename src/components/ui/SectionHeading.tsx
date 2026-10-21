import React from 'react';
import { Reveal } from './Reveal';
import { SplitText } from './SplitText';

interface SectionHeadingProps {
  /** Nomor section, mis. "01". */
  index: string;
  label: string;
  /** Judul. String = muncul kata per kata; node lain dirender apa adanya. */
  title: React.ReactNode;
  /** Kata kunci berwarna biru brand di akhir judul (opsional, hanya bila `title` string). */
  accent?: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** `split`: judul kiri, deskripsi kanan (layar lebar). `stack`: deskripsi di bawah judul (mis. kolom FAQ). */
  layout?: 'split' | 'stack';
  className?: string;
  /** id judul (untuk aria-labelledby section). */
  titleId?: string;
}

/** Chip label bernomor gaya BELAJAR CPNS: "01 · Label" (nomor mono di pil gelap). */
export const SectionChip: React.FC<{ index: string; label: string; className?: string }> = ({ index, label, className = '' }) => (
  <span
    className={`inline-flex h-6 items-center gap-1.5 rounded-full bg-surface pl-0.5 pr-2.5 text-[11px] font-medium text-muted ring-1 ring-inset ring-line sm:h-8 sm:gap-2 sm:pl-1 sm:pr-3.5 sm:text-[13px] ${className}`}
  >
    <span className="flex h-5 items-center rounded-full bg-fg px-2 font-mono text-[11px] font-semibold tabular-nums text-white sm:h-6">
      {index}
    </span>
    {label}
  </span>
);

const TITLE_CLASS =
  'mt-4 block text-2xl font-semibold leading-[1.2] tracking-[-0.025em] text-fg sm:mt-5 sm:text-5xl sm:leading-[1.02] sm:tracking-[-0.035em] xl:text-[56px]';

/**
 * Kepala section website (gaya CPNS): chip bernomor + judul yang muncul kata per kata di kiri,
 * deskripsi (rata kanan) + aksi opsional di kanan pada layar lebar.
 */
export const SectionHeading: React.FC<SectionHeadingProps> = ({
  index,
  label,
  title,
  accent,
  description,
  action,
  layout = 'split',
  className = '',
  titleId,
}) => {
  const heading = (
    <div className={layout === 'split' ? 'max-w-3xl' : ''}>
      <Reveal>
        <SectionChip index={index} label={label} />
      </Reveal>
      {typeof title === 'string' ? (
        <SplitText
          as="h2"
          id={titleId}
          delay={120}
          className={TITLE_CLASS}
          parts={[{ text: title }, ...(accent ? [{ text: accent, className: 'text-primary' }] : [])]}
        />
      ) : (
        <Reveal delay={0.1}>
          <h2 id={titleId} className={TITLE_CLASS}>
            {title}
          </h2>
        </Reveal>
      )}
    </div>
  );

  if (layout === 'stack') {
    // max-w-lg: judul dua warna FAQ muat dua baris ("Pertanyaan yang / sering ditanyakan"); kolom grid tetap membatasi
    return (
      <div className={`max-w-lg ${className}`}>
        {heading}
        {description && (
          <Reveal delay={0.25}>
            <p className="mt-2.5 text-[14px] leading-relaxed text-muted sm:mt-5 sm:text-lg sm:leading-relaxed">{description}</p>
          </Reveal>
        )}
        {action && (
          <Reveal delay={0.32} className="mt-5 sm:mt-7">
            {action}
          </Reveal>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-3 sm:gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-12 ${className}`}>
      {heading}
      {(description || action) && (
        <Reveal delay={0.25} className="lg:max-w-sm lg:shrink-0 lg:pb-1.5">
          <div className="flex flex-col items-start gap-4 sm:gap-5 lg:items-end">
            {description && (
              <p className="text-[14px] leading-relaxed text-muted sm:text-lg sm:leading-relaxed lg:text-right">{description}</p>
            )}
            {action}
          </div>
        </Reveal>
      )}
    </div>
  );
};
