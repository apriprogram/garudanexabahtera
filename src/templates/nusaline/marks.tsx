// Simbol Nusaline (SVG satu warna lewat currentColor, tanpa huruf): bulan sabit yang "memeluk" tiga titik jalur yang naik
// ke kanan atas — perjalanan malam dari kota ke kota. Path sama persis dengan
// public/assets/templates/logos/nusaline-mark.svg; dipakai <BrandMark mark={…}> bila PO belum mengunggah logo.
export const NusalineMark = ({ className = 'h-8 w-8' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="currentColor" className={className} aria-hidden focusable="false">
    <path d="M13.48 5.01A10 10 0 1 0 21.73 19.87A8.5 8.5 0 1 1 13.48 5.01z" />
    <path d="M17.6 15.6a2 2 0 1 0 4 0a2 2 0 1 0-4 0zM22.2 11.6a2 2 0 1 0 4 0a2 2 0 1 0-4 0zM25.7 7a2.9 2.9 0 1 0 5.8 0a2.9 2.9 0 1 0-5.8 0z" />
  </svg>
);
