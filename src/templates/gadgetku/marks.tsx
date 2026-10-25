// Simbol bawaan GadgetKu (SVG satu warna lewat currentColor, tanpa huruf): HP membulat dengan kilat di tengah. Path sama
// persis dengan public/assets/templates/logos/gadgetku-mark.svg. Dipakai <BrandMark mark={…}> bila pembeli belum
// mengunggah logo.
export const GadgetkuMark = ({ className = 'h-8 w-8' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden focusable="false">
    <rect x="7.5" y="2.5" width="17" height="27" rx="5.5" stroke="currentColor" strokeWidth="2.4" />
    <path d="M17.6 8.2 11.9 17h3.9l-1.4 6.8 5.7-8.8h-3.9z" fill="currentColor" />
  </svg>
);
