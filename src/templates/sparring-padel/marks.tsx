// Simbol Sparring Padel (SVG satu warna lewat currentColor, tanpa huruf): kepala raket padel berlubang tiga dengan
// gagang, dan bola di kanan atas — siap memukul. Path sama persis dengan
// public/assets/templates/logos/sparring-padel-mark.svg; dipakai <BrandMark mark={…}> bila klub belum mengunggah logo.
// Juga ikon garis raket & bola untuk ubin Sewa (komponen saja; pemilih ikon di ./icons).
export const SparringMark = ({ className = 'h-8 w-8' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="currentColor" className={className} aria-hidden focusable="false">
    <path
      fillRule="evenodd"
      d="M12.5 2a8.5 8.5 0 0 1 8.5 8.5v1a8.5 8.5 0 0 1-8.5 8.5a8.5 8.5 0 0 1-8.5-8.5v-1A8.5 8.5 0 0 1 12.5 2zM9.5 7.9a1.6 1.6 0 1 0 0 3.2a1.6 1.6 0 1 0 0-3.2zm6 0a1.6 1.6 0 1 0 0 3.2a1.6 1.6 0 1 0 0-3.2zm-3 4.6a1.6 1.6 0 1 0 0 3.2a1.6 1.6 0 1 0 0-3.2z"
    />
    <path d="M11 19.6h3v8.9a1.5 1.5 0 0 1-3 0z" />
    <path d="M26.5 2.5a3.5 3.5 0 1 1 0 7a3.5 3.5 0 1 1 0-7z" />
  </svg>
);

/** Ikon garis raket padel (ubin Sewa), gaya sama dengan lucide (stroke 1.75). */
export const RacketIcon = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden focusable="false">
    <path d="M10 2.8c3.4 0 6.2 2.8 6.2 6.2v.6c0 3.4-2.8 6.2-6.2 6.2S3.8 13 3.8 9.6V9c0-3.4 2.8-6.2 6.2-6.2z" />
    <path d="M10 15.8V21" />
    <path d="M8 8.2h.01M12 8.2h.01M10 11h.01" />
    <circle cx="19" cy="18.5" r="2.5" />
  </svg>
);

/** Ikon garis bola padel (ubin Sewa). */
export const BallIcon = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden focusable="false">
    <circle cx="12" cy="12" r="9" />
    <path d="M5.6 5.7c2.6 1.7 4 4 4 6.3s-1.4 4.6-4 6.3" />
    <path d="M18.4 5.7c-2.6 1.7-4 4-4 6.3s1.4 4.6 4 6.3" />
  </svg>
);
