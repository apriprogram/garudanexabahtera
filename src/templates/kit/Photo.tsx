// <KitPhoto> & <KitAvatar>: perilaku SAMA dengan <Photo>/<Avatar> bersama (shared/Photo.tsx, shared/media.tsx) —
// srcset/sizes, width/height, lazy kecuali `priority`, zoom-out/parallax lewat CSS bersama (shared/template.css),
// pengganti netral bila kosong/gagal — ditambah registry foto LOKAL template (./photos.ts, lewat prop `photos` atau
// <PhotoSetContext.Provider>). Ilustrasi lama (ArtKind) sengaja tidak didukung: desain baru memakai foto asli.
//
// Bila suatu saat shared/assets.ts bisa didaftari foto template lain, komponen ini bisa diganti <Photo> bersama.
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useMotionEnabled, useParallax, watchEntrance } from '../shared/motion';
import { PhotoPlaceholder } from '../shared/Photo';
import { initials, safeImage } from '../shared/utils';
import { usePhotoSet } from './context';
import type { PhotoSet } from './photos';

export interface KitPhotoProps {
  /** Nilai field gambar dari konten (path aset, URL, data-URI) */
  src: string;
  /** Teks alternatif; "" untuk foto dekoratif */
  alt: string;
  /** Kelas wadah: ukuran, rasio, radius (mis. "aspect-[4/3] rounded-[28px]") */
  className?: string;
  /** Kelas tambahan <img> (mis. "transition-[scale] duration-700 group-hover:scale-[1.04]") */
  imgClassName?: string;
  /** Atribut sizes untuk srcset foto demo (default "100vw") */
  sizes?: string;
  /** Foto di atas lipatan (HANYA hero): eager + fetchpriority="high" */
  priority?: boolean;
  /** Bila gambar kosong/gagal: "tint" (default) = bidang lembut aksen, "none" = tidak merender apa pun */
  fallback?: 'tint' | 'none';
  /** Zoom-out 1.08 → 1 saat foto masuk layar (gerak mati → diam) */
  zoom?: boolean;
  /** Parallax vertikal ringan; true = 6% tinggi foto, angka = persen (maks. 12). Mengalahkan `zoom`. */
  parallax?: boolean | number;
  /** object-position, mis. "50% 30%" */
  position?: string;
  /** Ukuran intrinsik untuk gambar non-demo (opsional) */
  width?: number;
  height?: number;
  /** Registry foto; bawaan dari <PhotoSetContext.Provider> */
  photos?: PhotoSet;
  /** Lapisan di atas foto (scrim, keterangan, chip) */
  children?: ReactNode;
}

export function KitPhoto({
  src,
  alt,
  className = '',
  imgClassName = '',
  sizes = '100vw',
  priority = false,
  fallback = 'tint',
  zoom = false,
  parallax = false,
  position,
  width,
  height,
  photos,
  children,
}: KitPhotoProps) {
  const ref = useRef<HTMLDivElement>(null);
  const contextSet = usePhotoSet();
  const set = photos ?? contextSet;
  const url = safeImage(src);
  const asset = url ? set.asset(url) : null;
  const [broken, setBroken] = useState<string | null>(null);
  const showing = !!url && broken !== url;
  const motion = useMotionEnabled();
  const strength = parallax === true ? 6 : typeof parallax === 'number' ? Math.max(0, Math.min(parallax, 12)) : 0;
  const parallaxOn = motion && showing && strength > 0;
  const zoomOn = motion && showing && zoom && !parallaxOn;

  useParallax(ref, parallaxOn);

  // Zoom-out saat masuk layar: wadah ditandai pending → shown (CSS di shared/template.css)
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !zoomOn || el.dataset.reveal === 'shown' || document.visibilityState === 'hidden') return;
    return watchEntrance(el, {
      arm: () => {
        el.dataset.reveal = 'pending';
      },
      enter: () => {
        el.dataset.reveal = 'shown';
      },
    });
  }, [zoomOn]);

  if (!showing) {
    if (fallback === 'none') return null;
    return (
      <PhotoPlaceholder className={className} label={alt || undefined}>
        {children}
      </PhotoPlaceholder>
    );
  }

  const motionClass = parallaxOn ? 'tpl-photo-parallax' : zoomOn ? 'tpl-photo-zoom' : '';
  const style: CSSProperties = {};
  if (position) style.objectPosition = position;
  if (parallaxOn) (style as Record<string, string>)['--tpl-parallax-strength'] = `${strength}%`;
  const containerPosition = /\b(absolute|fixed|sticky)\b/.test(className) ? '' : 'relative';

  return (
    <div ref={ref} className={`${containerPosition} isolate overflow-hidden bg-(--tpl-accent-50) ${className}`}>
      <img
        src={url}
        srcSet={asset?.srcSet}
        sizes={asset ? sizes : undefined}
        width={asset?.width ?? width}
        height={asset?.height ?? height}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding={priority ? 'auto' : 'async'}
        onError={() => setBroken(url)}
        style={style}
        className={`absolute inset-0 h-full w-full object-cover ${motionClass} ${imgClassName}`}
      />
      {children}
    </div>
  );
}

/** Foto bulat (testimoni, pelatih, bukti sosial) atau inisial. `sizes` = lebar tampil (srcset potret 240/480). */
export function KitAvatar({
  name,
  photo,
  className = 'h-11 w-11',
  sizes = '48px',
  photos,
}: {
  name: string;
  photo: string;
  className?: string;
  sizes?: string;
  photos?: PhotoSet;
}) {
  const contextSet = usePhotoSet();
  const set = photos ?? contextSet;
  const url = safeImage(photo);
  const asset = url ? set.asset(url) : null;
  const [broken, setBroken] = useState<string | null>(null);
  if (url && broken !== url) {
    return (
      <img
        src={url}
        srcSet={asset?.srcSet}
        sizes={asset ? sizes : undefined}
        width={asset?.width}
        height={asset?.height}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setBroken(url)}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-(--tpl-accent-100) text-[13px] font-semibold text-(--tpl-accent-ink) ${className}`}
      aria-hidden
    >
      {initials(name, '?')}
    </span>
  );
}
