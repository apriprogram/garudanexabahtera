// Grafis SVG GlowStory (satu warna lewat currentColor, tanpa huruf, ringan):
// - GlowMark: simbol bawaan (tetes serum + kilau kecil). Path sama persis dengan public/assets/templates/logos/
//   glowstory-mark.svg. Dipakai <BrandMark mark={…}> bila pembeli belum mengunggah logo.
// - Sprig: garis tangan ranting berdaun (dekorasi hero, kuis, ajakan).
// - Spark: kilau empat sudut pemisah strip berjalan.
export const GlowMark = ({ className = 'h-8 w-8' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden focusable="false">
    <path d="M14 4.5c0 0-8.5 9.6-8.5 15.3a8.5 8.5 0 0 0 17 0C22.5 14.1 14 4.5 14 4.5Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
    <path d="M9.6 20.2a4.4 4.4 0 0 0 4.4 4.4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M25.5 3.5l1.1 2.9 2.9 1.1-2.9 1.1-1.1 2.9-1.1-2.9-2.9-1.1 2.9-1.1Z" fill="currentColor" />
  </svg>
);

export const Sprig = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 120 220" fill="none" className={className} aria-hidden focusable="false">
    <g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M62 216C58 170 56 120 64 70 68 46 74 26 84 6" />
      <path d="M61 176c-14-4-26-14-32-28 14 1 27 10 32 28Z" />
      <path d="M61 150c13-6 23-17 27-31-14 3-24 13-27 31Z" />
      <path d="M60 122c-13-5-23-16-27-30 14 2 24 12 27 30Z" />
      <path d="M63 96c12-7 21-19 23-33-13 4-22 15-23 33Z" />
      <path d="M66 70c-12-6-20-17-22-30 13 3 21 13 22 30Z" />
      <path d="M71 46c10-7 17-18 18-30-12 5-18 15-18 30Z" />
      <path d="M44 165c-6-2-10-6-12-11M75 135c5-3 9-7 10-12M46 108c-6-3-9-7-10-12" opacity=".6" />
    </g>
  </svg>
);

export const Spark = ({ className = 'h-3 w-3' }: { className?: string }) => (
  <svg viewBox="0 0 12 12" className={className} aria-hidden focusable="false">
    <path d="M6 0l1.4 4.6L12 6 7.4 7.4 6 12 4.6 7.4 0 6l4.6-1.4Z" fill="currentColor" />
  </svg>
);
