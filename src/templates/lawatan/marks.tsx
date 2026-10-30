// Simbol Lawatan (SVG satu warna lewat currentColor, tanpa huruf): perangko bergerigi (tiga lekuk besar per sisi, tetap
// terbaca di 32px) berisi rute titik-titik dari kiri bawah menuju pin lokasi di kanan atas — gema garis rute di foto hero.
// Path sama persis dengan public/assets/templates/logos/lawatan-mark.svg; dipakai <BrandMark mark={…}> bila biro belum
// mengunggah logo. `framed={false}` = hanya rute + pin (viewBox dipangkas ke bidang dalam) untuk perangko besar footer yang
// sudah bergerigi sendiri, jadi tidak ada "perangko di dalam perangko".
export const LawatanMark = ({ className = 'h-8 w-8', framed = true }: { className?: string; framed?: boolean }) => (
  <svg viewBox={framed ? '0 0 32 32' : '6.2 6.2 19.6 19.6'} fill="currentColor" className={className} aria-hidden focusable="false">
    {framed && (
      <path
        fillRule="evenodd"
        d="M2 2H5.4A2.4 2.4 0 0 0 10.2 2H13.6A2.4 2.4 0 0 0 18.4 2H21.8A2.4 2.4 0 0 0 26.6 2H30V5.4A2.4 2.4 0 0 0 30 10.2V13.6A2.4 2.4 0 0 0 30 18.4V21.8A2.4 2.4 0 0 0 30 26.6V30H26.6A2.4 2.4 0 0 0 21.8 30H18.4A2.4 2.4 0 0 0 13.6 30H10.2A2.4 2.4 0 0 0 5.4 30H2V26.6A2.4 2.4 0 0 0 2 21.8V18.4A2.4 2.4 0 0 0 2 13.6V10.2A2.4 2.4 0 0 0 2 5.4ZM6.2 6.2V25.8H25.8V6.2Z"
      />
    )}
    <path d="M8.4 22a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0-3.6 0ZM11.59 19.82a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0ZM14.79 19.24a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0ZM20.4 18.97C20.4 18.97 16.3 15.14 16.3 12A4.1 4.1 0 0 1 24.5 12C24.5 15.14 20.4 18.97 20.4 18.97ZM20.4 10.4A1.6 1.6 0 0 0 20.4 13.6A1.6 1.6 0 0 0 20.4 10.4Z" />
  </svg>
);
