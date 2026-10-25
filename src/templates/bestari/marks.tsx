// Simbol Bestari (SVG satu warna lewat currentColor, tanpa huruf): buku terbuka dengan tunas dua daun di atasnya —
// belajar yang tumbuh. Path sama persis dengan public/assets/templates/logos/bestari-mark.svg; dipakai
// <BrandMark mark={…}> bila sekolah belum mengunggah logo.
export const BestariMark = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden focusable="false">
    <path d="M4 12.5c4-1.6 8-1.2 12 1.4v13.6c-4-2.6-8-3-12-1.4Z" fill="currentColor" />
    <path d="M28 12.5c-4-1.6-8-1.2-12 1.4v13.6c4-2.6 8-3 12-1.4Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
    <path d="M16 11.2V5.8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M16 7.6c-.4-2.6-2.4-4-5-3.8.3 2.6 2.3 4 5 3.8Z" fill="currentColor" />
    <path d="M16 6.8c.5-2.4 2.4-3.6 4.8-3.3-.4 2.4-2.3 3.6-4.8 3.3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);
