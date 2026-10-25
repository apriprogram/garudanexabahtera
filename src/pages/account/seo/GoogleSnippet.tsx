// Pratinjau cuplikan hasil Google (ikon + nama situs, alamat, judul biru, deskripsi). Teksnya dari buildSiteHead
// (src/templates/siteSeo.ts), aturan yang sama dengan kepala halaman dari server, jadi yang tampil di sini sama dengan
// yang dibaca Google. Dipakai halaman SEO situs dan bagian SEO editor tulisan.
import { useState } from 'react';
import { imageSrc } from '../cms/content';

interface GoogleSnippetProps {
  /** URL lengkap halaman, mis. https://sekolah.sch.id/berita/juara-olimpiade */
  url: string;
  siteName: string;
  /** Logo situs (path / URL) untuk ikon kecil; kosong = huruf pertama nama situs */
  icon?: string | null;
  title: string;
  description: string;
  /** Teks pengganti bila judul / deskripsi masih kosong */
  titlePlaceholder?: string;
  descriptionPlaceholder?: string;
  className?: string;
}

/** "https://sekolah.sch.id/berita/juara" → "sekolah.sch.id › berita › juara" (gaya alamat di hasil Google). */
function breadcrumb(url: string): string {
  const [host = '', ...parts] = url.replace(/^https?:\/\//i, '').replace(/\/+$/, '').split('/');
  return [host, ...parts.filter(Boolean)].join(' › ');
}

export function GoogleSnippet({
  url,
  siteName,
  icon,
  title,
  description,
  titlePlaceholder = 'Judul halaman',
  descriptionPlaceholder = 'Deskripsi halaman',
  className = '',
}: GoogleSnippetProps) {
  const src = imageSrc(icon ?? '');
  const [broken, setBroken] = useState<string | null>(null);
  const initial = Array.from(siteName.trim())[0]?.toUpperCase() ?? '?';

  return (
    <figure className={`rounded-2xl bg-surface p-4 ring-1 ring-inset ring-line sm:p-5 ${className}`}>
      <figcaption className="eyebrow mb-3">Pratinjau di Google</figcaption>
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-alt text-[11px] font-semibold text-muted ring-1 ring-inset ring-line" aria-hidden>
          {src && broken !== src ? <img src={src} alt="" onError={() => setBroken(src)} className="h-full w-full object-contain p-0.5" /> : initial}
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm text-fg">{siteName || 'Nama situs'}</p>
          <p className="truncate text-xs text-muted">{breadcrumb(url)}</p>
        </div>
      </div>
      <p className={`mt-2.5 line-clamp-2 break-words text-lg leading-snug ${title ? 'text-[#1a0dab]' : 'italic text-subtle'}`}>{title || titlePlaceholder}</p>
      <p className={`mt-1 line-clamp-3 break-words text-sm leading-relaxed ${description ? 'text-muted' : 'italic text-subtle'}`}>
        {description || descriptionPlaceholder}
      </p>
    </figure>
  );
}
