// Simbol bawaan Madani (SVG satu warna lewat currentColor, tanpa huruf): lengkung mihrab berisi buku terbuka dan
// bintang segi delapan. Path sama persis dengan public/assets/templates/logos/madani-mark.svg. Dipakai
// <BrandMark mark={…}> bila sekolah belum mengunggah logo. Ikon masjid dipakai untuk fasilitas "Masjid".
export const MadaniMark = ({ className = 'h-8 w-8' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden focusable="false">
    <path d="M7 28.5V14.8a9 9 0 0 1 18 0v13.7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M4 28.5h24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M11 24.2c1.7-.9 3.3-.9 5 0 1.7-.9 3.3-.9 5 0v-6.4c-1.7-.9-3.3-.9-5 0-1.7-.9-3.3-.9-5 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M16 17.8v6.4" stroke="currentColor" strokeWidth="1.8" />
    <path d="M14.6 9.6h2.8v2.8h-2.8Z M16 9l2 2-2 2-2-2Z" fill="currentColor" />
  </svg>
);

/** Ikon masjid gaya garis (24×24, setara ikon lucide). Dekoratif. */
export const MosqueIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden focusable="false">
    <path d="M2 21h20" />
    <path d="M7 21v-7h10v7" />
    <path d="M7 14a5 5 0 0 1 10 0" />
    <path d="M12 9V6.5" />
    <path d="M10.5 21v-2.5a1.5 1.5 0 0 1 3 0V21" />
    <path d="M3.5 21V11l1-1.5 1 1.5v10" />
    <path d="M18.5 21V11l1-1.5 1 1.5v10" />
  </svg>
);
