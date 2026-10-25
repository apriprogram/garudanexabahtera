// Komponen kecil TaniMakmur: label section berbentuk pil bertunas, judul dengan kata sorotan warna aksen, tombol pil +
// panah, ikon otomatis dari judul/nama tanaman, dan bintang rating. Ditulis di folder ini (bukan dibagi dengan
// template lain).
import { ArrowRight, Sprout, Star } from 'lucide-react';
import type { ReactNode } from 'react';
import { ActionLink } from '../shared/Shell';
import { hasImage, initials, splitHighlight, type LinkAction } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { CROP_ICONS, ICONS, cropKey, iconKey } from './icons';
import { formatRating } from './model';
import { TANI_PHOTOS } from './photos';

/** Label section: pil kecil dengan tunas (latar krem/putih) atau pil kaca (di atas foto & panel hijau tua). */
export function SectionLabel({ children, tone = 'light', className = '' }: { children: ReactNode; tone?: 'light' | 'white' | 'dark'; className?: string }) {
  const tones = {
    light: 'bg-[#ECE6CF] text-[#18230F]',
    white: 'bg-white text-[#18230F]',
    dark: 'bg-white/[0.12] text-white backdrop-blur-md',
  } as const;
  return (
    <p className={`inline-flex max-w-full items-center gap-2 rounded-full py-1.5 pl-2.5 pr-3.5 text-[13px] font-medium leading-snug ${tones[tone]} ${className}`}>
      <Sprout aria-hidden className={`h-4 w-4 shrink-0 ${tone === 'dark' ? 'text-(--tm-glow)' : 'text-[#1E3A16]'}`} strokeWidth={2} />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/** Judul dengan kata sorotan: `dark` = warna aksen terang di atas hijau tua/foto, `light` = aksen gelap + garis bawah. */
export function Highlighted({ title, highlight, tone }: { title: string; highlight: string; tone: 'dark' | 'light' }) {
  const parts = splitHighlight(title, highlight);
  if (!parts) return <>{title}</>;
  const [before, mark, after] = parts;
  return (
    <>
      {before}
      <span className={tone === 'dark' ? 'text-(--tm-glow)' : 'tm-underline text-(--tm-ink)'}>{mark}</span>
      {after}
    </>
  );
}

/** Tombol pil + panah. Tanpa label atau aksi → tidak dirender. */
export function PillLink({
  action,
  label,
  className,
  arrow = true,
  icon,
  onNavigate,
}: {
  action: LinkAction | null;
  label: string;
  className: string;
  arrow?: boolean;
  icon?: ReactNode;
  onNavigate?: () => void;
}) {
  if (!action || !label) return null;
  return (
    <ActionLink action={action} className={`group ${className}`} onNavigate={onNavigate}>
      {icon}
      <span className="truncate">{label}</span>
      {arrow && <ArrowRight className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />}
    </ActionLink>
  );
}

/** Ikon yang dipilih otomatis dari judul (lihat ./icons). Dekoratif. */
export function TitleIcon({ title, index = 0, className = 'h-5 w-5' }: { title: string; index?: number; className?: string }) {
  const Icon = ICONS[iconKey(title, index)];
  return <Icon className={className} aria-hidden />;
}

/** Ikon tanaman (cabai, tomat, hidroponik, sayur daun, tunas). Dekoratif. */
export function CropIcon({ name, className = 'h-5 w-5' }: { name: string; className?: string }) {
  const Icon = CROP_ICONS[cropKey(name)];
  return (
    <span aria-hidden className="contents">
      <Icon className={className} />
    </span>
  );
}

/**
 * Foto bulat orang (testimoni, penyuluh) dengan alt deskriptif: alt foto demo, selain itu "Foto {nama}". Tanpa foto →
 * inisial (dekoratif, nama sudah tertulis di sampingnya).
 */
export function PersonPhoto({ name, photo, sizes = '44px', className = 'h-11 w-11' }: { name: string; photo: string; sizes?: string; className?: string }) {
  if (!hasImage(photo)) {
    return (
      <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-full bg-[#ECE6CF] text-[13px] font-semibold text-[#1E3A16] ${className}`}>
        {initials(name, '?')}
      </span>
    );
  }
  return <KitPhoto src={photo} alt={TANI_PHOTOS.alt(photo, name ? `Foto ${name}` : 'Foto pelanggan')} sizes={sizes} className={`shrink-0 rounded-full ${className}`} />;
}

/** Lima bintang terisi sesuai rating (dibulatkan ke 0,5), dengan label untuk pembaca layar. */
export function Stars({ value, className = 'h-3.5 w-3.5', track = 'text-[#18230F]/20' }: { value: number; className?: string; track?: string }) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <span role="img" aria-label={`Rating ${formatRating(value)} dari 5`} className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => {
        const fill = rounded - i;
        return (
          <span key={i} aria-hidden className="relative inline-flex">
            <Star className={`${className} ${track}`} fill="currentColor" strokeWidth={0} />
            {fill > 0 && (
              <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: fill >= 1 ? '100%' : '50%' }}>
                <Star className={`${className} text-(--tpl-accent)`} fill="currentColor" strokeWidth={0} />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
