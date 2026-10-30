// Simbol Kemudi (SVG satu warna lewat currentColor, tanpa huruf): lingkar setir dengan jari-jari berbentuk T dan
// tonjolan poros di tengah — "kemudi" = setir. Path sama persis dengan public/assets/templates/logos/kemudi-mark.svg;
// dipakai <BrandMark mark={…}> bila rental belum mengunggah logo.
export const KemudiMark = ({ className = 'h-8 w-8' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="currentColor" className={className} aria-hidden focusable="false">
    <path fillRule="evenodd" d="M16 2.5a13.5 13.5 0 1 1 0 27a13.5 13.5 0 1 1 0-27zM16 6a10 10 0 1 0 0 20a10 10 0 1 0 0-20z" />
    <path d="M6 14.5h6.6a3.6 3.6 0 0 1 6.8 0H26v3h-6.8l-1 8.6h-4.4l-1-8.6H6z" />
  </svg>
);
