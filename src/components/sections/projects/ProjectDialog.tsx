import React, { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, Globe, Heart, Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import { LogoMark } from '../../ui/LogoMark';
import { TINT } from '../templates/catalog';
import { compactCount, type useEngagement } from '../templates/useTemplateEngagement';
import type { ProjectCardData } from './projectItems';

export type Engagement = ReturnType<typeof useEngagement>;

/** Bingkai media di dialog: sudut membulat, latar tipis selagi gambar/video dimuat. */
const FRAME = `overflow-hidden rounded-2xl sm:rounded-[20px] ${TINT}`;

/**
 * Satu gambar detail: tinggi mengikuti gambar (tangkapan layar panjang tampil utuh), selagi dimuat kotak 4:3 berkilau,
 * gagal dimuat → bingkainya disembunyikan.
 */
const MediaImage: React.FC<{ src: string; alt: string; eager: boolean }> = ({ src, alt, eager }) => {
  const [state, setState] = useState<'loading' | 'done' | 'broken'>('loading');
  if (state === 'broken') return null;
  return (
    <figure className={`${FRAME} ${state === 'loading' ? 'aspect-[4/3] animate-pulse' : ''}`}>
      <img
        src={src}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setState('done')}
        onError={() => setState('broken')}
        className="block h-auto w-full"
      />
    </figure>
  );
};

/** Avatar bulat logo Garuda Nexa (pengganti foto pembuat di shot Dribbble). */
const Avatar: React.FC<{ large?: boolean }> = ({ large = false }) => (
  <span
    className={`flex shrink-0 items-center justify-center rounded-full bg-brand-50 ring-1 ring-inset ring-brand-100 ${large ? 'h-14 w-14' : 'h-11 w-11'}`}
    aria-hidden
  >
    <LogoMark className={`text-primary ${large ? 'h-6' : 'h-[18px]'}`} />
  </span>
);

/**
 * Detail proyek (dialog modal, portal ke <body>) bergaya shot Dribbble (permintaan pemilik 2026-10-24): lembar putih
 * hampir setinggi layar yang digulir sendiri, tombol tutup di latar gelap (desktop) atau di sudut lembar (HP). Isi:
 * judul, baris pembuat (logo Garuda Nexa + jenis proyek) dengan ♥ suka, 👁 dilihat, "Kunjungi Situs" (bila ada tautan)
 * dan "Pesan Serupa"; chip tools, deskripsi, lalu gambar detail + video bertumpuk dalam bingkai membulat (tanpa gambar
 * detail → gambar kartu); penutup ajakan "Pesan Serupa". Fokus dijaga di dalam dialog dan kembali ke pemicu saat
 * ditutup (Esc, tombol tutup, klik latar); halaman di belakangnya tidak ikut bergulir.
 */
const ProjectDialog: React.FC<{
  item: ProjectCardData;
  engagement: Engagement;
  returnFocusRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}> = ({ item, engagement, returnFocusRef, onClose }) => {
  const titleId = useId();
  const ref = useFocusTrap<HTMLDivElement>(true, { onEscape: onClose, returnFocusRef });
  const { liked, likes, views, toggleLike, busy } = engagement;

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Gambar detail berurutan; tanpa galeri → gambar kartu
  const images = item.gallery.length > 0 ? item.gallery : item.image ? [item.image] : [];

  return createPortal(
    <div className="fixed inset-0 z-[70]">
      {/* Latar: klik di luar lembar menutup dialog (lapisan dialog di atasnya tembus klik kecuali lembar & tombol) */}
      <div className="absolute inset-0 bg-fg/60 backdrop-blur-sm motion-safe:animate-fade-in" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="pointer-events-none absolute inset-0 flex flex-col pt-[max(12px,env(safe-area-inset-top))] sm:pt-14"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup detail proyek"
          className="pointer-events-auto absolute right-4 top-[calc(max(12px,env(safe-area-inset-top))+12px)] z-10 flex h-10 w-10 items-center justify-center rounded-full bg-surface/90 text-fg ring-1 ring-inset ring-line backdrop-blur transition-colors hover:text-primary sm:right-5 sm:top-2 sm:bg-transparent sm:text-white sm:ring-0 sm:backdrop-blur-none sm:hover:bg-white/10 sm:hover:text-white"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>

        <div className="pointer-events-auto min-h-0 w-full flex-1 overflow-y-auto overscroll-contain rounded-t-[24px] bg-surface motion-safe:animate-fade-up sm:rounded-t-[28px]">
          <article className="mx-auto w-full max-w-[1080px] px-5 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-6 sm:px-10 sm:pb-16 sm:pt-12 lg:px-12">
            <header>
              {/* Ruang kanan di HP untuk tombol tutup yang melayang di sudut lembar */}
              <h2 id={titleId} className="pr-12 text-xl font-semibold leading-snug tracking-[-0.02em] text-fg sm:pr-0 sm:text-[28px] sm:leading-tight">
                {item.title}
              </h2>
              {/* HP: pembuat | suka & dilihat, lalu tombol selebar lembar di baris kedua. Desktop: satu baris, aksi di kanan */}
              <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:mt-6 sm:flex sm:flex-wrap sm:gap-3">
                <div className="flex min-w-0 items-center gap-3 sm:mr-auto sm:pr-3">
                  <Avatar />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-fg sm:text-[15px]">Garuda Nexa</p>
                    {item.label && (
                      <p className="truncate text-[13px] text-muted">
                        <span className="sr-only">Jenis proyek </span>
                        {item.label}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => void toggleLike()}
                    // aria-disabled, bukan disabled: tombol yang difokus tetap memegang fokus selama permintaan berjalan
                    aria-disabled={busy}
                    aria-pressed={liked}
                    aria-label={`${liked ? 'Batal suka' : 'Suka'} ${item.title}, ${likes} suka`}
                    className={`relative inline-flex h-11 items-center gap-2 rounded-full bg-surface px-4 text-sm font-medium tabular-nums ring-1 ring-inset ring-line transition-colors hover:ring-line-strong max-sm:h-10 max-sm:px-3.5 max-sm:after:absolute max-sm:after:inset-x-0 max-sm:after:-inset-y-1 ${liked ? 'text-[#e8466f]' : 'text-fg'}`}
                  >
                    <Heart className={`h-[18px] w-[18px] ${liked ? 'fill-current' : ''}`} aria-hidden />
                    {compactCount(likes)}
                  </button>
                  <span className="inline-flex h-11 items-center gap-1.5 px-2 text-sm tabular-nums text-muted max-sm:h-10" title={`${views} kali dilihat`}>
                    <Eye className="h-[18px] w-[18px]" aria-hidden />
                    {compactCount(views)}
                    <span className="sr-only"> kali dilihat</span>
                  </span>
                </div>

                <div className={`col-span-2 grid gap-2 sm:flex sm:gap-3 ${item.url ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Kunjungi Situs ${item.title} (tab baru)`}
                      className="btn btn-outline"
                    >
                      <Globe className="h-4 w-4" aria-hidden />
                      Kunjungi Situs
                    </a>
                  )}
                  <Link to="/pesan-custom" className="btn btn-dark">
                    <Sparkles className="h-4 w-4" aria-hidden />
                    Pesan Serupa
                  </Link>
                </div>
              </div>
            </header>

            {item.tools.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2 sm:mt-8" aria-label="Tools yang dipakai">
                {item.tools.map((tool) => (
                  <li
                    key={tool}
                    className="inline-flex h-8 items-center rounded-full bg-alt px-3 text-[13px] font-medium text-fg ring-1 ring-inset ring-line max-sm:h-7 max-sm:text-xs"
                  >
                    {tool}
                  </li>
                ))}
              </ul>
            )}

            {item.description && (
              <p className="mt-5 max-w-3xl whitespace-pre-line text-[14px] leading-relaxed text-muted sm:mt-6 sm:text-base">{item.description}</p>
            )}

            {(images.length > 0 || item.video) && (
              <div className="mt-8 space-y-4 sm:mt-12 sm:space-y-6">
                {images.map((src, index) => (
                  <MediaImage
                    key={`${index}-${src.slice(-48)}`}
                    src={src}
                    alt={images.length > 1 ? `${item.title}, gambar ${index + 1} dari ${images.length}` : `Tampilan ${item.title}`}
                    eager={index === 0}
                  />
                ))}
                {item.video && (
                  <figure className={FRAME}>
                    <video
                      src={item.video}
                      poster={item.image || undefined}
                      controls
                      playsInline
                      preload="metadata"
                      aria-label={`Video ${item.title}`}
                      className="block h-auto w-full"
                    />
                  </figure>
                )}
              </div>
            )}

            {/* Penutup gaya Dribbble: logo pembuat di tengah + ajakan */}
            <footer className="mt-12 flex flex-col items-center border-t border-line pt-10 text-center sm:mt-16 sm:pt-12">
              <Avatar large />
              <p className="mt-4 text-lg font-semibold text-fg sm:text-xl">Tertarik dengan proyek seperti ini?</p>
              <p className="mt-1 text-sm text-muted sm:text-[15px]">Ceritakan kebutuhan Anda, konsultasinya gratis.</p>
              <Link to="/pesan-custom" className="btn btn-primary mt-5">
                <Sparkles className="h-4 w-4" aria-hidden />
                Pesan Serupa
              </Link>
            </footer>
          </article>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ProjectDialog;
