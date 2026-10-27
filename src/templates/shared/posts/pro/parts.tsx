// Bagian kecil section berita & pengumuman profesional: judul selebar kartu, tanggal, petunjuk "Baca selengkapnya",
// dan tombol filter kategori/label (aria-pressed). Warna dari PostTheme template (../theme.ts).
import { ArrowRight } from 'lucide-react';
import { SiteLink } from '../../SiteLink';
import type { PostTheme } from '../theme';
import { proDate, tagKey } from './model';

/** Judul sebagai tautan selebar kartu (kartu `relative`); cincin fokus mengelilingi kartu. */
export const PRO_STRETCH =
  "after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-(--tpl-accent-ink) decoration-current/40 underline-offset-4 group-hover:underline";

/** Judul item: tautan ke halaman tulisan (tulisan) atau teks biasa (item CMS, tanpa tautan detail). */
export function ProTitle({ title, path }: { title: string; path: string | null }) {
  if (!path) return <>{title}</>;
  return (
    <SiteLink path={path} className={PRO_STRETCH}>
      {title}
    </SiteLink>
  );
}

/** Tanggal: <time> bila formatnya dikenali, selain itu teks apa adanya. */
export function ProDateText({ raw, className = '' }: { raw: string; className?: string }) {
  if (!raw) return null;
  const date = proDate(raw);
  return date ? (
    <time dateTime={date.iso} className={className}>
      {date.label}
    </time>
  ) : (
    <span className={className}>{raw}</span>
  );
}

/** Petunjuk tautan di kartu tulisan (hiasan: tautannya judul kartu). */
export function ProMore({ label, theme, className = '' }: { label: string; theme: PostTheme; className?: string }) {
  return (
    <span aria-hidden className={`inline-flex min-h-10 items-center gap-1.5 text-[14px] font-semibold ${theme.accent} ${className}`}>
      <span className="underline decoration-current/30 underline-offset-4 group-hover:decoration-current">{label}</span>
      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
    </span>
  );
}

/** Tautan "Lihat semua …" ke halaman daftar (tombol pil tema). */
export function ProAllLink({ path, label, theme }: { path: string; label: string; theme: PostTheme }) {
  return (
    <SiteLink path={path} className={theme.button}>
      {label}
      <ArrowRight aria-hidden className="h-4 w-4" />
    </SiteLink>
  );
}

/**
 * Tombol filter "Semua" + kategori/label (aria-pressed), satu baris yang bisa digeser di HP. Kurang dari dua pilihan →
 * tidak dirender (filter tidak berguna).
 */
export function TagFilter({
  tags,
  value,
  onChange,
  label,
  theme,
  allLabel = 'Semua',
}: {
  tags: string[];
  value: string | null;
  onChange: (tag: string | null) => void;
  /** aria-label grup, mis. "Saring berita menurut kategori" */
  label: string;
  theme: PostTheme;
  allLabel?: string;
}) {
  if (tags.length < 2) return null;
  return (
    <div role="group" aria-label={label} className="-mx-1 flex max-w-full gap-1.5 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {[null, ...tags].map((tag) => {
        const pressed = tag === null ? value === null : value !== null && tagKey(value) === tagKey(tag);
        return (
          <button
            key={tag ?? ''}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(tag)}
            className={`h-10 shrink-0 rounded-full px-4 text-[14px] font-semibold transition-colors ${pressed ? theme.filterOn : theme.filterOff}`}
          >
            {tag ?? allLabel}
          </button>
        );
      })}
    </div>
  );
}
