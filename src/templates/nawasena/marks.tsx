// Simbol Nawasena (SVG satu warna lewat currentColor, tanpa huruf): perisai lambang sekolah berisi tiga anak tangga yang
// naik ke kanan — tangga menuju masa depan yang cerah. Path sama persis dengan
// public/assets/templates/logos/nawasena-mark.svg; dipakai <BrandMark mark={…}> bila sekolah belum mengunggah logo.
export const NawasenaMark = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="currentColor" fillRule="evenodd" className={className} aria-hidden focusable="false">
    <path d="M16 2.5 27 6.5v8.2c0 7-4.6 12.3-11 14.8C9.6 27 5 21.7 5 14.7V6.5ZM16 5.2 7.5 8.3v6.4c0 5.6 3.5 10 8.5 12.2 5-2.2 8.5-6.6 8.5-12.2V8.3Z" />
    <path d="M11 21.5h2.6v-4H11ZM14.7 21.5h2.6V15h-2.6ZM18.4 21.5H21v-9h-2.6Z" />
  </svg>
);
