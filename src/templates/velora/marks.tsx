// Simbol Velora (SVG satu warna lewat currentColor, tanpa huruf): cincin dengan garis cakrawala dan jalan yang menyempit
// ke titik hilang di cakrawala — perjalanan yang terus ke depan. Path sama persis dengan
// public/assets/templates/logos/velora-mark.svg; dipakai <BrandMark mark={…}> bila perusahaan belum mengunggah logo.
export const VeloraMark = ({ className = 'h-7 w-7' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden focusable="false">
    <circle cx="16" cy="16" r="13.2" stroke="currentColor" strokeWidth="2.4" />
    <path d="M4.6 13.6h22.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M9.6 26.2c3.4-4 6.1-8.1 7.7-12.6h1.5c-.3 4.7.1 9.4 1.3 14.8-3.7.6-7.3-.1-10.5-2.2Z" fill="currentColor" />
  </svg>
);
