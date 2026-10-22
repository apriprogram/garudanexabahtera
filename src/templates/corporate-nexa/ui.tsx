// Komponen kecil Corporate Nexa: label di atas judul, kepala section, dan foto dengan pengganti bermerek.
import type { ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { TYPE } from '../shared/layout';
import { StructureMark } from '../shared/marks';
import { Photo, PhotoPlaceholder, type PhotoProps } from '../shared/Photo';
import { hasImage } from '../shared/utils';
import { H2, LEAD } from './styles';

export function Eyebrow({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p className={`flex items-center gap-3 ${TYPE.eyebrow} text-(--tpl-accent-ink)`}>
      <span aria-hidden className="h-px w-8 shrink-0 bg-(--tpl-accent)" />
      {children}
    </p>
  );
}

/**
 * Kepala section. `split`: judul di kiri (7 kolom) dan paragraf pengantar di kanan (5 kolom) pada layar lebar,
 * gaya editorial; tanpa `split` semuanya bertumpuk di kiri.
 */
export function SectionHeader({ eyebrow, title, lead, split = false }: { eyebrow: string; title: string; lead?: string; split?: boolean }) {
  if (!eyebrow && !title && !lead) return null;
  const heading = (
    <>
      <Eyebrow>{eyebrow}</Eyebrow>
      {title && <h2 className={`${eyebrow ? 'mt-5' : ''} ${H2}`}>{title}</h2>}
    </>
  );
  if (split && lead && (eyebrow || title)) {
    return (
      <div className="grid gap-6 @5xl:grid-cols-12 @5xl:items-end @5xl:gap-12">
        <Reveal className="min-w-0 @5xl:col-span-7">{heading}</Reveal>
        <Reveal delay={80} className="min-w-0 @5xl:col-span-5 @5xl:pb-1.5">
          <p className={`max-w-[56ch] ${LEAD}`}>{lead}</p>
        </Reveal>
      </div>
    );
  }
  return (
    <Reveal className="max-w-3xl">
      {heading}
      {lead && <p className={`${eyebrow || title ? 'mt-5' : ''} max-w-[60ch] ${LEAD}`}>{lead}</p>}
    </Reveal>
  );
}

/** Bidang pengganti bermerek (gradasi aksen + simbol template) untuk slot foto wajib yang masih kosong. */
export function BlankVisual({ className = '', children }: { className?: string; children?: ReactNode }) {
  return (
    <PhotoPlaceholder className={className}>
      <span aria-hidden className="absolute inset-0 flex items-center justify-center">
        <StructureMark className="h-14 w-14 text-(--tpl-accent-200) @3xl:h-20 @3xl:w-20" />
      </span>
      {children}
    </PhotoPlaceholder>
  );
}

/**
 * Foto slot wajib (hero, tentang): foto bila ada (gagal dimuat → bidang lembut), selain itu bidang bermerek.
 * Nilai lama apa pun (path unggahan, URL, data-URI) diterima apa adanya.
 */
export function Visual({ src, className = '', children, ...props }: Omit<PhotoProps, 'fallback'>) {
  if (!hasImage(src)) return <BlankVisual className={className}>{children}</BlankVisual>;
  return (
    <Photo src={src} className={className} fallback="tint" {...props}>
      {children}
    </Photo>
  );
}
