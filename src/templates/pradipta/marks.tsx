// Simbol Pradipta (SVG satu warna lewat currentColor, tanpa huruf): matahari terbit di atas garis cakrawala dengan tiga
// titik cahaya — "pradipta" berarti bercahaya. Path sama persis dengan public/assets/templates/logos/pradipta-mark.svg;
// dipakai <BrandMark mark={…}> bila sekolah mengosongkan logo.
export const PradiptaMark = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden focusable="false">
    <path d="M9 20a7 7 0 0 1 14 0z" fill="currentColor" />
    <path d="M4.5 22h23a1.5 1.5 0 0 1 0 3h-23a1.5 1.5 0 0 1 0-3z" fill="currentColor" />
    <path d="M9.5 27h13a1 1 0 0 1 0 2h-13a1 1 0 0 1 0-2z" fill="currentColor" />
    <path d="M16 6.5a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3z" fill="currentColor" />
    <path d="M8.6 10.1a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3z" fill="currentColor" />
    <path d="M23.4 10.1a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3z" fill="currentColor" />
  </svg>
);
