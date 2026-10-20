// Galeri detail template: gambar utama + thumbnail + tampilan perbesar (lightbox terang). Gambar rusak → placeholder.
import { ChevronLeft, ChevronRight, ImageOff, Maximize2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { LogoMark } from '../../../components/ui/LogoMark';

function Picture({ src, alt, broken, onBroken, className = '', fit = 'cover' }: {
  src: string;
  alt: string;
  broken: boolean;
  onBroken: () => void;
  className?: string;
  fit?: 'cover' | 'contain';
}) {
  if (broken) {
    return (
      <div className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-brand-50 to-brand-100 text-brand-300 ${className}`}>
        <LogoMark className="h-8 sm:h-10" />
        <span className="sr-only">{alt} (gambar tidak tersedia)</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={onBroken}
      className={`h-full w-full ${fit === 'cover' ? 'object-cover object-top' : 'object-contain'} ${className}`}
    />
  );
}

const arrowClass =
  'absolute top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/95 text-fg shadow-soft ring-1 ring-inset ring-line transition-colors hover:bg-surface hover:text-primary after:absolute after:-inset-1';

export function TemplateGallery({ images, name }: { images: string[]; name: string }) {
  const [index, setIndex] = useState(0);
  const [broken, setBroken] = useState<Record<string, true>>({});
  const [zoom, setZoom] = useState(false);
  const count = images.length;
  const safeIndex = count > 0 ? Math.min(index, count - 1) : 0;
  const current = images[safeIndex];

  const go = useCallback((delta: number) => setIndex((i) => (count > 0 ? (i + delta + count) % count : 0)), [count]);
  const markBroken = (src: string) => setBroken((prev) => (prev[src] ? prev : { ...prev, [src]: true }));
  const label = (i: number) => `${name}, gambar ${i + 1} dari ${count}`;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (count < 2) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(1);
    }
  };

  if (count === 0) {
    return (
      <div className="flex aspect-[16/10] flex-col items-center justify-center gap-3 rounded-[24px] bg-gradient-to-br from-brand-50 to-brand-100 text-center ring-1 ring-inset ring-line">
        <ImageOff className="h-8 w-8 text-brand-300" aria-hidden />
        <p className="text-sm text-muted">Pratinjau gambar belum tersedia</p>
      </div>
    );
  }

  return (
    <div onKeyDown={onKeyDown}>
      <div className="group relative aspect-[16/10] overflow-hidden rounded-[24px] bg-alt shadow-soft ring-1 ring-inset ring-line">
        <button
          type="button"
          onClick={() => setZoom(true)}
          className="absolute inset-0 cursor-zoom-in focus-visible:outline-offset-[-2px]"
          aria-label={`Perbesar ${label(safeIndex)}`}
        >
          <Picture key={current} src={current} alt={label(safeIndex)} broken={!!broken[current]} onBroken={() => markBroken(current)} />
        </button>
        <span className="pointer-events-none absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 text-muted opacity-0 shadow-soft ring-1 ring-inset ring-line transition-opacity group-hover:opacity-100 max-sm:hidden" aria-hidden>
          <Maximize2 className="h-4 w-4" />
        </span>
        {count > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} className={`${arrowClass} left-3`} aria-label="Gambar sebelumnya">
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button type="button" onClick={() => go(1)} className={`${arrowClass} right-3`} aria-label="Gambar berikutnya">
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
            <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-surface/95 px-2.5 py-1 text-xs font-medium tabular-nums text-fg shadow-soft ring-1 ring-inset ring-line">
              {safeIndex + 1} / {count}
            </span>
          </>
        )}
      </div>

      {count > 1 && (
        <ul className="mt-3 grid grid-cols-4 gap-2 sm:gap-3" aria-label="Pilih gambar">
          {images.map((src, i) => (
            <li key={`${src}-${i}`}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-current={i === safeIndex ? 'true' : undefined}
                aria-label={`Tampilkan ${label(i)}`}
                className={`relative block aspect-[16/10] w-full overflow-hidden rounded-xl bg-alt transition-[box-shadow,opacity] ${
                  i === safeIndex ? 'ring-2 ring-primary' : 'opacity-75 ring-1 ring-inset ring-line hover:opacity-100 hover:ring-line-strong'
                }`}
              >
                <Picture src={src} alt="" broken={!!broken[src]} onBroken={() => markBroken(src)} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {zoom && (
        <Lightbox
          images={images}
          index={safeIndex}
          name={name}
          broken={broken}
          onBroken={markBroken}
          onIndex={setIndex}
          onClose={() => setZoom(false)}
        />
      )}
    </div>
  );
}

function Lightbox({
  images,
  index,
  name,
  broken,
  onBroken,
  onIndex,
  onClose,
}: {
  images: string[];
  index: number;
  name: string;
  broken: Record<string, true>;
  onBroken: (src: string) => void;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const count = images.length;
  const src = images[index];

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && count > 1) onIndex((index - 1 + count) % count);
      else if (e.key === 'ArrowRight' && count > 1) onIndex((index + 1) % count);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [count, index, onClose, onIndex]);

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-canvas/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Galeri ${name}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex items-center justify-between gap-4 px-4 pb-2 pt-[max(12px,env(safe-area-inset-top))] sm:px-6 sm:pt-5">
        <p className="min-w-0 truncate text-sm font-medium text-fg">
          {name}
          {count > 1 && <span className="ml-2 tabular-nums text-subtle">{index + 1} / {count}</span>}
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-fg shadow-soft ring-1 ring-inset ring-line transition-colors hover:text-primary after:absolute after:-inset-1"
          aria-label="Tutup galeri"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-[max(16px,env(safe-area-inset-bottom))] sm:px-16 sm:pb-8"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="relative h-full max-h-[min(80vh,900px)] w-full max-w-6xl overflow-hidden rounded-2xl bg-surface shadow-float ring-1 ring-line">
          <Picture key={src} src={src} alt={`${name}, gambar ${index + 1} dari ${count}`} broken={!!broken[src]} onBroken={() => onBroken(src)} fit="contain" />
        </div>
        {count > 1 && (
          <>
            <button type="button" onClick={() => onIndex((index - 1 + count) % count)} className={`${arrowClass} left-2 sm:left-4`} aria-label="Gambar sebelumnya">
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button type="button" onClick={() => onIndex((index + 1) % count)} className={`${arrowClass} right-2 sm:right-4`} aria-label="Gambar berikutnya">
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
