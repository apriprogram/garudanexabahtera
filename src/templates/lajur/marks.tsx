// Simbol Lajur (SVG satu warna lewat currentColor, tanpa huruf): ubin persegi membulat dengan TIGA BILAH MIRING yang
// terpotong (fill-rule evenodd) — motif livery dan marka lajur yang dipakai di seluruh template (label section, footer).
// Path sama persis dengan public/assets/templates/logos/lajur-mark.svg; dipakai <BrandMark mark={…}> bila perusahaan
// belum mengunggah logo.
export const LajurMark = ({ className = 'h-8 w-8' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="currentColor" className={className} aria-hidden focusable="false">
    <path fillRule="evenodd" d="M7 2h18a5 5 0 0 1 5 5v18a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zM6 25 10 7h4l-4 18zM12.4 25l4-18h4l-4 18zM18.8 25l4-18h4l-4 18z" />
  </svg>
);
