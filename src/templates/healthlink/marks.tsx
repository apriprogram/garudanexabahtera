// Simbol HealthLink (SVG satu warna lewat currentColor, tanpa huruf, BUKAN palang merah): dua mata rantai kapsul yang
// saling mengait (pasien ↔ dokter/rumah sakit) dan satu titik bulat "online" di kanan atas. Path sama persis dengan
// public/assets/templates/logos/healthlink-mark.svg; dipakai <BrandMark mark={…}> bila layanan belum mengunggah logo.
export const HealthLinkMark = ({ className = 'h-8 w-8' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="currentColor" className={className} aria-hidden focusable="false">
    <path fillRule="evenodd" d="M8 12H13A6 6 0 0 1 13 24H8A6 6 0 0 1 8 12ZM8 15H13A3 3 0 0 1 13 21H8A3 3 0 0 1 8 15Z" />
    <path fillRule="evenodd" d="M18 12H23A6 6 0 0 1 23 24H18A6 6 0 0 1 18 12ZM18 15H23A3 3 0 0 1 23 21H18A3 3 0 0 1 18 15Z" />
    <path d="M27 3a3 3 0 1 1 0 6a3 3 0 1 1 0-6z" />
  </svg>
);
