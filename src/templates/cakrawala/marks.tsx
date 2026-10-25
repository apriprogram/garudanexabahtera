// Simbol Cakrawala & logo mitra contoh (SVG satu warna lewat currentColor, tanpa huruf di dalam simbol).
// <CakrawalaMark>: matahari setengah terbit di atas garis cakrawala, tiga sinar, dan garis jalan di bawahnya. Path sama
// persis dengan public/assets/templates/logos/cakrawala-mark.svg; dipakai <BrandMark mark={…}> bila belum ada logo.
// <PartnerMark>: empat simbol geometris sederhana untuk mitra industri yang belum mengunggah logo (bergiliran per urutan).
export const CakrawalaMark = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden focusable="false">
    <path d="M8.5 20.5a7.5 7.5 0 0 1 15 0" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    <path d="M12.6 20.5a3.4 3.4 0 0 1 6.8 0Z" fill="currentColor" />
    <path d="M16 5.5v3.4M6.4 9.4l2.4 2.4M25.6 9.4l-2.4 2.4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M3.5 20.5h25M9.5 25.5h13" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
  </svg>
);

const SHAPES = [
  // Heksagon dengan titik
  <g key="hex">
    <path d="M12 2.6 20.2 7.3v9.4L12 21.4 3.8 16.7V7.3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="2.6" fill="currentColor" />
  </g>,
  // Dua setengah lingkaran
  <g key="arc">
    <path d="M3 13a9 9 0 0 1 18 0Z" fill="currentColor" />
    <path d="M7 17.5h10M9.5 21h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </g>,
  // Kotak bertumpuk
  <g key="stack">
    <rect x="3" y="3" width="11" height="11" rx="2.5" fill="currentColor" />
    <rect x="10" y="10" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="2" />
  </g>,
  // Segitiga & garis
  <g key="peak">
    <path d="M12 3.5 21 19.5H3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M8.5 13.5h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </g>,
];

export const PartnerMark = ({ shape, className = 'h-6 w-6' }: { shape: number; className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden focusable="false">
    {SHAPES[Math.abs(Math.floor(shape)) % SHAPES.length]}
  </svg>
);
