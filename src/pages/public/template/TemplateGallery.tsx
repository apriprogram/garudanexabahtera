// Galeri detail template: gambar utama (bisa digeser di HP) + thumbnail + ubin "Lihat Demo" + tampilan perbesar
// (lightbox terang, fokus keyboard terkunci di dalamnya). Gambar rusak → placeholder.
// Alt deskriptif per gambar (`alts`, docs/platform/SEO-PLAN.md §5.5 langkah 7); thumbnail gambar yang sedang tampil
// adalah duplikat dekoratif (alt=""). width/height = ukuran tangkapan layar template (1600×1000, rasio bingkai 16:10).
import { ChevronLeft, ChevronRight, Eye, ImageOff, Maximize2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { LogoMark } from '../../../components/ui/LogoMark';
import { useFocusTrap } from '../../../hooks/useFocusTrap';

/** Ukuran asli tangkapan layar template (public/assets/templates/*.webp). */
const IMAGE_WIDTH = 1600;
const IMAGE_HEIGHT = 1000;

function Picture({ src, alt, broken, onBroken, className = '', fit = 'cover', eager = false }: {
  src: string;
  alt: string;
  broken: boolean;
  onBroken: () => void;
  className?: string;
  fit?: 'cover' | 'contain';
  /** Gambar utama di atas lipatan (kandidat LCP): dimuat segera. Thumbnail & lightbox: lazy. */
  eager?: boolean;
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
      width={IMAGE_WIDTH}
      height={IMAGE_HEIGHT}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : undefined}
      decoding="async"
      onError={onBroken}
      draggable={false}
      className={`h-full w-full ${fit === 'cover' ? 'object-cover object-top' : 'object-contain'} ${className}`}
    />
  );
}

const arrowClass =
  'absolute top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/95 text-fg ring-1 ring-inset ring-line transition-colors hover:bg-surface hover:text-primary after:absolute after:-inset-1';
// Panah di gambar utama versi HP: lebih kecil & lebih ke tepi agar tidak menutupi pratinjau; area sentuh tetap ±44px
const frameArrowClass = `${arrowClass} max-sm:h-8 max-sm:w-8 max-sm:bg-surface/80 max-sm:after:-inset-1.5`;

/** Geser horizontal minimal (px) agar dihitung sebagai swipe, bukan ketukan. */
const SWIPE_MIN = 40;

// Thumbnail + ubin demo mengisi satu baris penuh (tidak ada kolom kosong)
const GRID_COLS: Record<number, string> = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' };

export function TemplateGallery({
  images,
  alts = [],
  name,
  demo,
}: {
  images: string[];
  /** Alt deskriptif per gambar (urutan sama dengan `images`); kosong → "{nama}, gambar n dari N". */
  alts?: string[];
  name: string;
  /** Tautan demo untuk ubin "Lihat Demo" di baris thumbnail (diisi bila baris belum penuh). */
  demo?: { href: string; external: boolean };
}) {
  const [index, setIndex] = useState(0);
  const [broken, setBroken] = useState<Record<string, true>>({});
  const [zoom, setZoom] = useState(false);
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);
  const swiped = useRef(false);
  const zoomRef = useRef<HTMLButtonElement>(null);
  const count = images.length;
  const safeIndex = count > 0 ? Math.min(index, count - 1) : 0;
  const current = images[safeIndex];

  const go = useCallback((delta: number) => setIndex((i) => (count > 0 ? (i + delta + count) % count : 0)), [count]);
  const markBroken = (src: string) => setBroken((prev) => (prev[src] ? prev : { ...prev, [src]: true }));
  const label = (i: number) => `${name}, gambar ${i + 1} dari ${count}`;
  const altOf = (i: number) => alts[i] || label(i);

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

  // Geser di gambar utama (sentuh atau seret mouse) = gambar sebelumnya/berikutnya; klik perbesar dibatalkan
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    swiped.current = false;
    swipe.current = count > 1 && e.isPrimary ? { x: e.clientX, y: e.clientY, id: e.pointerId } : null;
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start || start.id !== e.pointerId) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > SWIPE_MIN && Math.abs(dx) > Math.abs(dy)) {
      swiped.current = true;
      go(dx < 0 ? 1 : -1);
    }
  };
  const onZoomClick = () => {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    setZoom(true);
  };

  if (count === 0) {
    return (
      <div className="flex aspect-[16/10] flex-col items-center justify-center gap-3 rounded-[24px] bg-gradient-to-br from-brand-50 to-brand-100 text-center ring-1 ring-inset ring-line">
        <ImageOff className="h-8 w-8 text-brand-300" aria-hidden />
        <p className="text-sm text-muted">Pratinjau gambar belum tersedia</p>
      </div>
    );
  }

  const demoTile = demo && count < 4;
  const columns = GRID_COLS[Math.min(count + (demoTile ? 1 : 0), 4)] ?? 'grid-cols-4';

  return (
    <div onKeyDown={onKeyDown}>
      <div
        className="group relative aspect-[16/10] touch-pan-y overflow-hidden rounded-[24px] bg-alt ring-1 ring-inset ring-line"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          swipe.current = null;
        }}
      >
        <button
          ref={zoomRef}
          type="button"
          onClick={onZoomClick}
          className="absolute inset-0 cursor-zoom-in focus-visible:outline-offset-[-2px]"
          aria-label={`Perbesar ${label(safeIndex)}`}
        >
          <Picture key={current} src={current} alt={altOf(safeIndex)} broken={!!broken[current]} onBroken={() => markBroken(current)} eager />
        </button>
        <span className="pointer-events-none absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 text-muted opacity-0 ring-1 ring-inset ring-line transition-opacity group-hover:opacity-100 max-sm:hidden" aria-hidden>
          <Maximize2 className="h-4 w-4" />
        </span>
        {count > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} className={`${frameArrowClass} left-3 max-sm:left-2`} aria-label="Gambar sebelumnya">
              <ChevronLeft className="h-5 w-5 max-sm:h-4 max-sm:w-4" aria-hidden />
            </button>
            <button type="button" onClick={() => go(1)} className={`${frameArrowClass} right-3 max-sm:right-2`} aria-label="Gambar berikutnya">
              <ChevronRight className="h-5 w-5 max-sm:h-4 max-sm:w-4" aria-hidden />
            </button>
            <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-surface/95 px-2.5 py-1 text-xs font-medium tabular-nums text-fg ring-1 ring-inset ring-line max-sm:bottom-2 max-sm:right-2">
              {safeIndex + 1} / {count}
            </span>
          </>
        )}
      </div>

      {count > 1 && (
        <ul className={`mt-3 grid ${columns} gap-2 sm:gap-3`} aria-label="Pilih gambar">
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
                <Picture src={src} alt={i === safeIndex ? '' : altOf(i)} broken={!!broken[src]} onBroken={() => markBroken(src)} />
              </button>
            </li>
          ))}
          {demoTile && (
            <li>
              <DemoTile demo={demo} name={name} />
            </li>
          )}
        </ul>
      )}

      {zoom && (
        <Lightbox
          images={images}
          alts={images.map((_, i) => altOf(i))}
          index={safeIndex}
          name={name}
          broken={broken}
          onBroken={markBroken}
          onIndex={setIndex}
          onClose={() => setZoom(false)}
          returnFocusRef={zoomRef}
        />
      )}
    </div>
  );
}

/** Ubin terakhir baris thumbnail: buka demo (tab baru bila demo_url eksternal). */
function DemoTile({ demo, name }: { demo: { href: string; external: boolean }; name: string }) {
  const className =
    'flex aspect-[16/10] w-full flex-col items-center justify-center gap-1 rounded-xl bg-surface px-1 text-center text-[11px] font-semibold text-primary ring-1 ring-inset ring-brand-200 transition-colors hover:bg-brand-50 hover:ring-primary sm:gap-1.5 sm:text-[13px]';
  const content = (
    <>
      <Eye className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" aria-hidden />
      Lihat Demo
    </>
  );
  return demo.external ? (
    <a href={demo.href} target="_blank" rel="noopener noreferrer" className={className} aria-label={`Lihat Demo ${name} (tab baru)`}>
      {content}
    </a>
  ) : (
    <Link to={demo.href} className={className} aria-label={`Lihat Demo ${name}`}>
      {content}
    </Link>
  );
}

function Lightbox({
  images,
  alts,
  index,
  name,
  broken,
  onBroken,
  onIndex,
  onClose,
  returnFocusRef,
}: {
  images: string[];
  alts: string[];
  index: number;
  name: string;
  broken: Record<string, true>;
  onBroken: (src: string) => void;
  onIndex: (i: number) => void;
  onClose: () => void;
  /** Tombol perbesar: menerima fokus lagi saat lightbox ditutup (juga bila klik tidak memfokuskannya, mis. Safari) */
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}) {
  // Tab/Shift+Tab berputar di dalam dialog, Escape menutup, fokus kembali ke tombol perbesar saat ditutup
  const dialogRef = useFocusTrap<HTMLDivElement>(true, { onEscape: onClose, returnFocusRef });
  const count = images.length;
  const src = images[index];

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && count > 1) onIndex((index - 1 + count) % count);
      else if (e.key === 'ArrowRight' && count > 1) onIndex((index + 1) % count);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [count, index, onIndex]);

  return createPortal(
    <div
      ref={dialogRef}
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
          type="button"
          onClick={onClose}
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-fg ring-1 ring-inset ring-line transition-colors hover:text-primary after:absolute after:-inset-1"
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
          <Picture key={src} src={src} alt={alts[index] || `${name}, gambar ${index + 1} dari ${count}`} broken={!!broken[src]} onBroken={() => onBroken(src)} fit="contain" eager />
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
