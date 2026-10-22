// Simbol bawaan Arena Club (SVG orisinal, tanpa huruf, satu warna lewat currentColor + opasitas): lapangan dilihat
// dari atas (kotak servis kiri lebih muda, net di tengah) dengan bola di sudut kanan atas. Path sama persis dengan
// public/assets/templates/logos/arena-club-mark.svg. Dipakai <BrandMark mark={…}> bila pembeli belum mengunggah logo.

export const ArenaMark = ({ className = 'h-8 w-8' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="currentColor" className={className} aria-hidden focusable="false">
    <path d="M13.25 2H8a6 6 0 0 0-6 6v5.25h11.25Z" opacity=".55" />
    <path d="M13.25 14.75H2V20a6 6 0 0 0 6 6h5.25Z" opacity=".55" />
    <path d="M14.75 2h4.66A7.5 7.5 0 0 0 26 14.43V20a6 6 0 0 1-6 6h-5.25Z" />
    <circle cx="25" cy="7" r="5" />
  </svg>
);

/** Ikon lapangan kecil untuk kartu bento gelap (dekoratif). */
export const CourtIcon = ({ className = 'h-7 w-7' }: { className?: string }) => (
  <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.6" className={className} aria-hidden focusable="false">
    <rect x="3" y="6" width="22" height="16" rx="3" />
    <path d="M14 6v16M3 14h7M18 14h7M10 9.5v9M18 9.5v9" strokeLinecap="round" />
  </svg>
);
