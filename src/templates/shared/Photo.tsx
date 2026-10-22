// Foto responsif untuk desain template baru: srcset/sizes untuk foto demo (./assets), width/height, lazy kecuali
// `priority` (hero: eager + fetchpriority high), zoom-out halus saat muncul atau parallax ringan, dan pengganti
// netral TANPA ilustrasi bila gambar kosong/gagal dimuat. Menerima nilai konten lama (satu URL/path/data-URI).
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { ArtKind } from './art';
import { photoAsset } from './assets';
import { Art } from './media';
import { useMotionEnabled, useParallax, watchEntrance } from './motion';
import { safeImage } from './utils';

export interface PhotoProps {
  /** Nilai field gambar dari konten (path aset, URL, data-URI) */
  src: string;
  /** Teks alternatif; "" untuk foto dekoratif */
  alt: string;
  /** Kelas wadah: ukuran, rasio, radius (mis. "aspect-[4/3] rounded-[28px]") */
  className?: string;
  /** Kelas tambahan <img> (mis. "group-hover:scale-[1.03] transition-[scale] duration-700") */
  imgClassName?: string;
  /** Atribut sizes untuk srcset foto demo (default "100vw"), mis. "(min-width: 1024px) 50vw, 100vw" */
  sizes?: string;
  /** Foto di atas lipatan (hero): eager + fetchpriority="high" */
  priority?: boolean;
  /**
   * Bila gambar kosong/gagal: "tint" (default) = bidang lembut warna aksen tanpa ilustrasi, "none" = tidak merender
   * apa pun (template menyembunyikan slotnya), atau jenis ilustrasi lama (ArtKind) untuk kompatibilitas.
   */
  fallback?: 'tint' | 'none' | ArtKind;
  /** Zoom-out 1.08 → 1 saat foto masuk layar (gerak mati → diam) */
  zoom?: boolean;
  /** Parallax vertikal ringan; true = 6% tinggi foto, angka = persen. Mengalahkan `zoom`. */
  parallax?: boolean | number;
  /** object-position, mis. "50% 30%" */
  position?: string;
  /** Ukuran intrinsik untuk gambar non-demo (opsional) */
  width?: number;
  height?: number;
  /** Lapisan di atas foto (scrim, keterangan, chip) */
  children?: ReactNode;
}

/** Bidang pengganti netral (gradasi warna aksen + kisi tipis), tanpa ilustrasi. */
export function PhotoPlaceholder({ className = '', label, children }: { className?: string; label?: string; children?: ReactNode }) {
  const position = /\b(absolute|fixed|sticky)\b/.test(className) ? '' : 'relative';
  return (
    <div className={`${position} overflow-hidden bg-(--tpl-accent-50) ${className}`} role={label ? 'img' : undefined} aria-label={label || undefined}>
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(135deg,var(--tpl-accent-100),var(--tpl-accent-50)_55%,#ffffff)]" />
      <div
        aria-hidden
        className="absolute inset-0 opacity-70 [background-image:linear-gradient(var(--tpl-accent-100)_1px,transparent_1px),linear-gradient(90deg,var(--tpl-accent-100)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_78%)]"
      />
      {children}
    </div>
  );
}

export function Photo({
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
  children,
}: PhotoProps) {
  const ref = useRef<HTMLDivElement>(null);
  const url = safeImage(src);
  const asset = photoAsset(url);
  const [broken, setBroken] = useState<string | null>(null);
  const showing = !!url && broken !== url;
  const motion = useMotionEnabled();
  const strength = parallax === true ? 6 : typeof parallax === 'number' ? Math.max(0, Math.min(parallax, 12)) : 0;
  const parallaxOn = motion && showing && strength > 0;
  const zoomOn = motion && showing && zoom && !parallaxOn;

  useParallax(ref, parallaxOn);

  // Zoom-out saat masuk layar: wadah ditandai pending → shown (CSS di ./template.css)
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
    if (fallback === 'tint') return <PhotoPlaceholder className={className} label={alt || undefined}>{children}</PhotoPlaceholder>;
    return <Art kind={fallback} className={className} label={alt || undefined} />;
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
