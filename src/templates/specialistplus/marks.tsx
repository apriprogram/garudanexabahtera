// Simbol SpecialistPlus (SVG satu warna lewat currentColor, tanpa huruf, bukan palang merah): cincin pemindai dengan
// garis pindai mendatar, satu titik data di atasnya, dan garis pendek di bawahnya — pemeriksaan yang terbaca jelas.
// Path sama persis dengan public/assets/templates/logos/specialistplus-mark.svg; dipakai <BrandMark mark={…}> bila
// klinik belum mengunggah logo.
export const SpecialistPlusMark = ({ className = 'h-8 w-8' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="currentColor" className={className} aria-hidden focusable="false">
    <path fillRule="evenodd" d="M16 2a14 14 0 1 1 0 28a14 14 0 1 1 0-28zM16 5a11 11 0 1 0 0 22a11 11 0 1 0 0-22z" />
    <path d="M8 15h16v2.2H8z" />
    <path d="M16 8.6a2.1 2.1 0 1 1 0 4.2a2.1 2.1 0 1 1 0-4.2z" />
    <path d="M12 20h8v2.2h-8z" />
  </svg>
);
