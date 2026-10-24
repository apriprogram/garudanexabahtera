// Simbol bawaan Serenity (SVG satu warna lewat currentColor, tanpa huruf): matahari terbit di atas dua gelombang.
// Path sama persis dengan public/assets/templates/logos/serenity-mark.svg. Dipakai <BrandMark mark={…}> bila pembeli
// belum mengunggah logo.
export const SerenityMark = ({ className = 'h-8 w-8' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden focusable="false">
    <path d="M8.5 17.5a7.5 7.5 0 0 1 15 0Z" fill="currentColor" />
    <path d="M3.5 22c2.1 0 2.1-1.6 4.2-1.6s2.1 1.6 4.2 1.6 2.1-1.6 4.1-1.6 2.1 1.6 4.2 1.6 2.1-1.6 4.1-1.6 2.1 1.6 4.2 1.6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7.5 27c1.7 0 1.7-1.3 3.4-1.3s1.7 1.3 3.4 1.3 1.7-1.3 3.4-1.3 1.7 1.3 3.4 1.3 1.7-1.3 3.4-1.3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity=".55" />
  </svg>
);
