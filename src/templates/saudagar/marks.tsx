// Simbol Saudagar (SVG satu warna lewat currentColor, tanpa huruf): pintu lengkung pasar yang menaungi sebutir biji
// terbelah (dibaca kopi, kakao, atau pala). Path sama persis dengan public/assets/templates/logos/saudagar-mark.svg;
// dipakai <BrandMark mark={…}> bila perusahaan belum mengunggah logo, dan di lingkaran asal tanpa foto.
export const SaudagarMark = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="currentColor" className={className} aria-hidden focusable="false">
    <path d="M5 29V15a11 11 0 0 1 22 0v14h-3.5V15a7.5 7.5 0 0 0-15 0v14z" />
    <path d="M15.3 13.6c-2.3 2-3.3 4.2-3.3 6.4s1 4.4 3.3 6.4z" />
    <path d="M16.7 13.6c2.3 2 3.3 4.2 3.3 6.4s-1 4.4-3.3 6.4z" />
  </svg>
);
