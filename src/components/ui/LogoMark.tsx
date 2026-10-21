import React from 'react';

/** Path sayap Garuda Nexa (persis dari public/logogarudanexa.svg, viewBox 0 0 257 156). */
const WINGS_PATH =
  'M140 112l17 -14c5,-4 7,-8 9,-11 2,-4 2,-7 2,-10l-2 -19 0 0 84 -57c5,-3 7,0 7,3l0 10c0,7 -3,12 -8,15l-31 21 33 -5c5,0 6,0 6,3l0 9c0,5 -5,10 -10,11l-39 5 31 15c3,1 2,4 0,6l-8 7c-3,2 -9,2 -12,0l-23 -11 13 24c1,2 0,3 -3,3l-15 0c-2,0 -4,-1 -6,-4l-4 -8c-3,3 -6,7 -10,10l-29 25c-5,5 -12,11 -13,16 -2,-5 -9,-11 -14,-16l-29 -25c-4,-3 -7,-7 -10,-10l-4 8c-2,3 -4,4 -6,4l-15 0c-2,0 -4,-1 -2,-3l12 -24 -23 11c-3,2 -9,2 -11,0l-9 -7c-2,-2 -3,-5 0,-6l31 -15 -39 -5c-5,-1 -10,-6 -10,-11l0 -9c0,-3 1,-3 6,-3l33 5 -31 -21c-5,-3 -8,-8 -8,-15l0 -10c0,-3 2,-6 7,-3l84 57 0 0 -1 19c-1,3 0,6 1,10 2,3 5,7 9,11l17 14c7,6 12,12 12,16 0,-4 4,-10 11,-16z';

/**
 * Sayap Garuda Nexa saja (= public/brand/logo-wings.svg). Warnanya mengikuti `currentColor`,
 * jadi atur lewat kelas teks: `text-primary` di latar terang, `text-white` di latar biru brand.
 */
export const LogoMark: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 257 156" fill="currentColor" className={`w-auto shrink-0 ${className}`} aria-hidden>
    <path d={WINGS_PATH} />
  </svg>
);

/**
 * Lambang berlatar: kotak biru brand rounded + sayap putih (= public/brand/logo-mark.svg). Hanya untuk ilustrasi
 * di dalam kartu/mockup; navbar, footer, sidebar admin dan favicon memakai sayap tanpa latar (`LogoMark`).
 * Ukuran lewat kelas, mis. `h-8 w-8`.
 */
export const LogoBadge: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 512 512" className={`shrink-0 ${className}`} aria-hidden>
    <rect width="512" height="512" rx="112" fill="var(--color-primary)" />
    <path fill="#fff" transform="translate(60 137) scale(1.52529)" d={WINGS_PATH} />
  </svg>
);

const BRAND_SIZES = {
  // Footer, akun: sayap 20px & nama 15px di HP, 24px & 17px di desktop
  md: { gap: 'gap-2.5', mark: 'h-5 sm:h-6', name: 'text-[15px] sm:text-[17px]' },
  // Navbar 56/64px: sayap 18px & nama 15px di HP, 22px & 16px di desktop
  sm: { gap: 'gap-2 sm:gap-2.5', mark: 'h-[18px] sm:h-[22px]', name: 'text-[15px] sm:text-[16px]' },
};

/**
 * Logo + nama perusahaan untuk navbar/footer: sayap biru brand tanpa latar, ukuran `md` (bawaan) atau `sm` (navbar).
 * "Bahtera" tampil mulai `sm`; `compact` = tanpa "Bahtera"; `fullFrom="xl"` = "Bahtera" baru tampil mulai 1280px
 * (navbar: memberi ruang menu di 1024px).
 */
export const BrandLogo: React.FC<{ className?: string; compact?: boolean; fullFrom?: 'sm' | 'xl'; size?: 'md' | 'sm' }> = ({
  className = '',
  compact = false,
  fullFrom = 'sm',
  size = 'md',
}) => {
  const s = BRAND_SIZES[size];
  return (
    <span className={`inline-flex min-w-0 items-center ${s.gap} ${className}`}>
      <LogoMark className={`text-primary ${s.mark}`} />
      <span className={`min-w-0 truncate font-bold tracking-[-0.03em] text-fg ${s.name}`}>
        Garuda Nexa
        {!compact && <span className={`hidden font-semibold text-subtle ${fullFrom === 'xl' ? 'xl:inline' : 'sm:inline'}`}> Bahtera</span>}
      </span>
    </span>
  );
};
