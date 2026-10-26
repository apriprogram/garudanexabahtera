// Bagian kecil halaman tulisan: remah roti, chip & tanggal, foto artikel, blok kosong/gagal, dan kerangka memuat.
import { AlertCircle, ChevronRight, RotateCw } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { safeImage } from '../utils';
import { SiteLink } from '../SiteLink';
import { isUrgentBadge, postDate } from './model';
import type { PostTheme } from './theme';

/** Judul halaman (H1) daftar/artikel/tidak ditemukan: 28 → 38 → 46px, font & warna dari tema. */
export const PAGE_H1 = 'text-balance text-[28px] leading-[1.14] tracking-[-0.028em] @3xl:text-[38px] @5xl:text-[46px]';

export interface Crumb {
  label: string;
  /** Path relatif akar situs; tidak diisi = halaman ini (aria-current) */
  path?: string;
}

/**
 * Remah roti: Beranda › Berita › Judul. Item terakhir = halaman ini. Judul tulisan (item ketiga) disembunyikan di layar
 * sempit: H1 tepat di bawahnya sudah menampilkannya, dan baris kedua yang diawali "›" terlihat janggal di HP.
 */
export function Breadcrumb({ items, theme }: { items: Crumb[]; theme: PostTheme }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className={`flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[13.5px] ${theme.muted}`}>
        {items.map((item, i) => (
          <li
            key={`${item.label}-${i}`}
            className={`min-w-0 items-center gap-1.5 ${item.path ? 'flex' : `max-w-full ${i >= 2 ? 'hidden @xl:flex' : 'flex'}`}`}
          >
            {i > 0 && <ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0 opacity-60" />}
            {item.path ? (
              <SiteLink path={item.path} className={`inline-flex min-h-8 items-center font-medium underline-offset-4 transition-colors hover:underline ${theme.accent}`}>
                {item.label}
              </SiteLink>
            ) : (
              <span aria-current="page" className="min-w-0 truncate">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Tanggal terbit: <time> bila YYYY-MM-DD valid; `long` = dengan nama hari. */
export function PostDateText({ value, long = false, className = '' }: { value: string | null | undefined; long?: boolean; className?: string }) {
  const date = postDate(value);
  if (!date) return null;
  return (
    <time dateTime={date.iso} className={className}>
      {long ? date.long : date.label}
    </time>
  );
}

/** Chip kategori (berita) atau label (pengumuman; merah lembut bila mendesak). */
export function PostChip({ label, badge = false, theme }: { label: string; badge?: boolean; theme: PostTheme }) {
  if (!label) return null;
  const tone = badge && isUrgentBadge(label) ? theme.urgent : theme.chip;
  return (
    <span className={`inline-flex h-7 max-w-full items-center rounded-full px-3 text-[12px] font-semibold uppercase tracking-[0.06em] ${tone}`}>
      <span className="truncate">{label}</span>
    </span>
  );
}

/** Bingkai foto utama artikel (juga dipakai kerangka memuat): rasio tetap 4:3 → 16:10, maks. setinggi 80% layar. */
export const POST_IMAGE_FRAME = 'aspect-[4/3] max-h-[min(80vh,860px)] w-full @3xl:aspect-[16/10]';

/**
 * Foto utama artikel di bingkai lembut berukuran tetap (POST_IMAGE_FRAME): ruangnya sudah tersedia sebelum foto selesai
 * dimuat, jadi isi di bawahnya tidak bergeser. Foto utuh di dalamnya (object-contain: poster pengumuman tegak tidak
 * terpotong). Dimuat segera (foto LCP halaman). Gagal dimuat → disembunyikan.
 */
export function PostImage({ src, alt, theme }: { src: string | null | undefined; alt: string; theme: PostTheme }) {
  const url = safeImage(src);
  const [broken, setBroken] = useState<string | null>(null);
  if (!url || broken === url) return null;
  return (
    <figure className={`relative mt-8 overflow-hidden @3xl:mt-10 ${POST_IMAGE_FRAME} ${theme.photoRadius} ${theme.soft}`}>
      <img
        src={url}
        alt={alt}
        width={1600}
        height={1000}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        onError={() => setBroken(url)}
        className="absolute inset-0 block h-full w-full object-contain"
      />
    </figure>
  );
}

/** Blok tengah untuk keadaan kosong/gagal: ikon, judul, teks, aksi. */
export function StatusBlock({
  icon,
  title,
  children,
  actions,
  theme,
  alert = false,
}: {
  icon: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  theme: PostTheme;
  alert?: boolean;
}) {
  return (
    <div role={alert ? 'alert' : undefined} className={`flex flex-col items-center px-5 py-12 text-center @3xl:py-16 ${theme.radius} ${theme.soft}`}>
      <span aria-hidden className={`flex h-12 w-12 items-center justify-center rounded-full bg-white ${theme.accent}`}>
        {icon}
      </span>
      <p className={`mt-4 text-[17px] font-semibold ${theme.heading}`}>{title}</p>
      {children && <p className={`mt-1.5 max-w-[46ch] text-[14.5px] leading-relaxed ${theme.muted}`}>{children}</p>}
      {actions && <div className="mt-6 flex w-full flex-col justify-center gap-2.5 @xl:w-auto @xl:flex-row">{actions}</div>}
    </div>
  );
}

/** Gagal memuat (bukan 404): pesan + Coba lagi. */
export function LoadError({ message, retry, theme }: { message: string; retry: () => void; theme: PostTheme }) {
  return (
    <StatusBlock
      alert
      theme={theme}
      icon={<AlertCircle className="h-6 w-6" />}
      title="Belum bisa dimuat"
      actions={
        <button type="button" onClick={retry} className={theme.buttonGhost}>
          <RotateCw aria-hidden className="h-4 w-4" />
          Coba lagi
        </button>
      }
    >
      {message}
    </StatusBlock>
  );
}

/** Kerangka memuat (tanpa gerak bila pengunjung memilih reduced motion). */
export function Skeleton({ className, theme }: { className: string; theme: PostTheme }) {
  return <div aria-hidden className={`motion-safe:animate-pulse ${theme.soft} ${className}`} />;
}
