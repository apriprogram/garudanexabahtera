// Simbol SmashHall (SVG satu warna lewat currentColor, tanpa huruf): kok bulu tangkis tegak — rok bulu berbentuk
// trapesium dengan dua celah bulu (evenodd), pita, dan gabus setengah lingkaran. Path simbol sama persis dengan
// public/assets/templates/logos/smashhall-mark.svg; dipakai <BrandMark mark={…}> bila GOR belum mengunggah logo.
// <ShuttleIcon> = versi garis (stroke) untuk penanda label section, kartu, dan kok yang "terbang" di hero.
export const SmashHallMark = ({ className = 'h-8 w-8' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="currentColor" className={className} aria-hidden focusable="false">
    <path fillRule="evenodd" d="M5 3h22l-6 16H11zM11.6 5l2.3 12h.9L13.2 5zM18.8 5l-1.6 12h.9l2.3-12z" />
    <path d="M11 20.5h10v2H11z" />
    <path d="M11 24h10a5 5 0 0 1-10 0z" />
  </svg>
);

/** Ikon kok garis 24×24 (dekoratif). */
export const ShuttleIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden focusable="false">
    <path d="M5 3h14l-4 10.5H9z" />
    <path d="M10 3.5l1.2 9.5M14 3.5l-1.2 9.5" />
    <path d="M9 16h6a3 3 0 0 1-6 0z" />
  </svg>
);
