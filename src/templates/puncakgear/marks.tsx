// Simbol bawaan PuncakGear (SVG satu warna lewat currentColor, tanpa huruf): dua puncak gunung dengan bendera kecil di
// puncak tertinggi. Path sama persis dengan public/assets/templates/logos/puncakgear-mark.svg. Dipakai
// <BrandMark mark={…}> bila pembeli belum mengunggah logo.
export const PuncakMark = ({ className = 'h-8 w-8' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden focusable="false">
    <path d="M2.5 27 12.4 10.6l4.3 7.1 3.1-5L29.5 27Z" fill="currentColor" />
    <path d="M12.4 10.6V3.8l5.4 2.1-5.4 2.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
