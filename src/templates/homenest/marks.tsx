// Simbol HomeNest (SVG satu warna lewat currentColor, tanpa huruf): atap pelana di atas mangkuk sarang setengah
// lingkaran — rumah sebagai tempat pulang. Path sama persis dengan public/assets/templates/logos/homenest-mark.svg;
// dipakai <BrandMark mark={…}> bila perusahaan belum mengunggah logo.
export const HomeNestMark = ({ className = 'h-8 w-8' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="currentColor" className={className} aria-hidden focusable="false">
    <path d="M16 3.5 29 15.2 26.6 17.8 16 8.6 5.4 17.8 3 15.2z" />
    <path fillRule="evenodd" d="M6.5 19.5h19a9.5 9.5 0 0 1-19 0zM10.6 19.5a5.4 5.4 0 0 0 10.8 0z" />
  </svg>
);
