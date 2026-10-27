// Simbol Dermaga (SVG satu warna lewat currentColor, tanpa huruf): dua blok kontainer bertumpuk di atas garis dermaga
// dan satu pin bulat di sudut kanan atas — barang yang siap berangkat. Path sama persis dengan
// public/assets/templates/logos/dermaga-mark.svg; dipakai <BrandMark mark={…}> bila perusahaan belum mengunggah logo.
export const DermagaMark = ({ className = 'h-8 w-8' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="currentColor" className={className} aria-hidden focusable="false">
    <path d="M3 27h26v2H3z" />
    <path d="M5 19h15v6H5z" />
    <path d="M9 11h15v6H9z" />
    <path d="M26.5 4a3.5 3.5 0 1 1 0 7a3.5 3.5 0 1 1 0-7z" />
  </svg>
);
