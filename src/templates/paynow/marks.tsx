// Simbol PayNow (SVG satu warna lewat currentColor, tanpa huruf): kartu dompet persegi membulat dengan panah maju
// berlubang di tengahnya — bayar, sekarang. Path sama persis dengan public/assets/templates/logos/paynow-mark.svg;
// dipakai <BrandMark mark={…}> bila merek belum mengunggah logo.
export const PaynowMark = ({ className = 'h-8 w-8' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="currentColor" fillRule="evenodd" className={className} aria-hidden focusable="false">
    <path d="M9 3h14a6 6 0 0 1 6 6v14a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6V9a6 6 0 0 1 6-6zm3.4 7.2-2.3 3 3.9 2.8-3.9 2.8 2.3 3 7.9-5.8z" />
  </svg>
);
