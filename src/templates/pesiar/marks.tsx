// Simbol Pesiar (SVG satu warna lewat currentColor, tanpa huruf): tiga kelopak bougainvillea yang memusat pada satu
// titik — bunga kertas khas Bali sekaligus arah tiga jalan. Path sama persis dengan
// public/assets/templates/logos/pesiar-mark.svg; dipakai <BrandMark mark={…}> bila usaha belum mengunggah logo.
export const PesiarMark = ({ className = 'h-8 w-8' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="currentColor" className={className} aria-hidden focusable="false">
    <path d="M16 13.4C12.3 11.5 10.9 6.7 16 2.6C21.1 6.7 19.7 11.5 16 13.4ZM18.25 17.3C21.75 15.05 26.6 16.23 27.6 22.7C21.5 25.07 18.05 21.45 18.25 17.3ZM13.75 17.3C13.95 21.45 10.5 25.07 4.4 22.7C5.4 16.23 10.25 15.05 13.75 17.3Z" />
    <path d="M16 14.2a1.8 1.8 0 1 1 0 3.6a1.8 1.8 0 1 1 0-3.6Z" />
  </svg>
);
