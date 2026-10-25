// SVG bawaan TaniMakmur (satu warna lewat currentColor, tanpa huruf), dipakai bila pembeli belum mengunggah gambar:
// - TaniMark: tunas dua daun di atas tanah. Path sama persis dengan public/assets/templates/logos/tanimakmur-mark.svg.
// - Ikon tanaman untuk pemilih paket (cabai, tomat, hidroponik, sayur daun), dipilih dari nama tanaman di ./icons.
// - FieldLines & LeafArt: garis tipis dan daun dekoratif (aria-hidden), pengganti foto yang ringan.
import type { SVGProps } from 'react';

export const TaniMark = ({ className = 'h-8 w-8' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden focusable="false">
    <path d="M15.6 16.4C15.1 11.7 11.4 8.6 6 8.8c.3 5.3 4.1 8.3 9.6 7.6Z" fill="currentColor" />
    <path d="M16.4 13.6c.4-5.1 4.3-8.4 9.9-8.3-.1 5.7-4 8.9-9.9 8.3Z" fill="currentColor" opacity=".72" />
    <path d="M16 23V12.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M5.5 26.5c3.1-2.2 6.7-3.3 10.5-3.3s7.4 1.1 10.5 3.3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

type IconProps = { className?: string };
const base = (className: string): SVGProps<SVGSVGElement> => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  className,
  'aria-hidden': true,
  focusable: 'false',
});

export const ChiliIcon = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg {...base(className)}>
    <path d="M9 3.5c.4 1.6 1.4 2.7 3 3.2" />
    <path d="M11.6 6.6c2.7-.6 4.9 1 4.9 3.8 0 4.6-2.8 8.9-9 10.1 1.7-2.6 2.2-5.8 2-8.9-.1-2.4.6-4.3 2.1-5Z" />
    <path d="M13.6 9.6c.3 1.6 0 3.4-.9 5" />
  </svg>
);

export const TomatoIcon = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg {...base(className)}>
    <path d="M12 7.2c-4.3 0-7.5 2.9-7.5 6.8S7.7 21 12 21s7.5-3.1 7.5-7-3.2-6.8-7.5-6.8Z" />
    <path d="M12 7.2 9.4 5.2M12 7.2l2.6-2M12 7.2l-3.6.9M12 7.2l3.6.9M12 7.2V3.5" />
  </svg>
);

export const HydroIcon = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg {...base(className)}>
    <path d="M12 12.5V9.4" />
    <path d="M12 10.6C11 7.7 8.6 6.2 5.6 6.5c.4 3 2.8 4.6 6.4 4.1Z" />
    <path d="M12 9.6c.8-3 3.3-4.6 6.4-4.4-.3 3.1-2.8 4.9-6.4 4.4Z" />
    <path d="M7.2 12.5h9.6l-1.1 5.8a1.6 1.6 0 0 1-1.6 1.3H9.9a1.6 1.6 0 0 1-1.6-1.3Z" />
    <path d="M3.5 21.5c1.4 0 1.4-.9 2.8-.9s1.4.9 2.8.9 1.4-.9 2.9-.9 1.4.9 2.8.9 1.4-.9 2.8-.9 1.4.9 2.9.9" />
  </svg>
);

export const LeafyIcon = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg {...base(className)}>
    <path d="M12 21C7.1 20 4.6 16.6 4.9 11.6 5.1 8.1 7 5.6 9.4 4.6 11 8.1 12 13 12 21Z" />
    <path d="M12 21c4.9-1 7.4-4.4 7.1-9.4-.2-3.5-2.1-6-4.5-7C13 8.1 12 13 12 21Z" />
    <path d="M8.6 9.6c1 2.4 1.7 5.6 2.1 9M15.4 9.6c-1 2.4-1.7 5.6-2.1 9" />
  </svg>
);

/** Dua garis diagonal tipis yang menyilang di belakang isi hero (bingkai "ladang" referensi). */
export const FieldLines = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={className} aria-hidden focusable="false">
    <line x1="0" y1="8" x2="100" y2="92" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    <line x1="100" y1="4" x2="34" y2="100" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
  </svg>
);

/** Daun besar bergaris (dekorasi panel gelap & pengganti foto kosong). */
export const LeafArt = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 200 200" fill="none" className={className} aria-hidden focusable="false">
    <path d="M100 188C46 170 20 128 26 76 30 44 52 20 80 10c18 34 26 86 20 178Z" stroke="currentColor" strokeWidth="1.5" />
    <path d="M100 188c54-18 80-60 74-112-4-32-26-56-54-66-18 34-26 86-20 178Z" stroke="currentColor" strokeWidth="1.5" />
    <path d="M80 10c6 60 12 118 20 178M120 10c-6 60-12 118-20 178" stroke="currentColor" strokeWidth="1" opacity=".6" />
    <path d="M44 70c16 6 30 16 42 30M38 112c18 4 34 12 50 26M156 70c-16 6-30 16-42 30M162 112c-18 4-34 12-50 26" stroke="currentColor" strokeWidth="1" opacity=".5" />
  </svg>
);
