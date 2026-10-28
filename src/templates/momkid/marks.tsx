// Simbol MomKid (SVG satu warna lewat currentColor, tanpa huruf): ayunan/buaian berbentuk mangkuk yang memeluk kepala
// bayi, dan satu bintang kecil di kanan atas. Path sama persis dengan public/assets/templates/logos/momkid-mark.svg;
// dipakai <BrandMark mark={…}> bila rumah sakit belum mengunggah logo.
export const MomkidMark = ({ className = 'h-8 w-8' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="currentColor" className={className} aria-hidden focusable="false">
    <path d="M4 16.5a12 12 0 0 0 24 0h-4.6a7.4 7.4 0 0 1-14.8 0z" />
    <path d="M16 10.5a4.5 4.5 0 1 1 0 9a4.5 4.5 0 1 1 0-9z" />
    <path d="M26 3c.5 2.3 1.4 3.2 3.7 3.7-2.3.5-3.2 1.4-3.7 3.7-.5-2.3-1.4-3.2-3.7-3.7 2.3-.5 3.2-1.4 3.7-3.7z" />
  </svg>
);
