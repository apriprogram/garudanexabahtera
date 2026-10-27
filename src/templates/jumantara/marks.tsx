// Simbol Jumantara (SVG satu warna lewat currentColor, tanpa huruf): tiga ubin membulat yang tersusun rapi dan bintang
// berujung empat di sel kanan atas — tatanan yang tertib di bawah langit (jumantara = langit). Path sama persis dengan
// public/assets/templates/logos/jumantara-mark.svg; dipakai bila sekolah belum mengunggah logo.
export const JumantaraMark = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden focusable="false">
    <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h5A2.5 2.5 0 0 1 14 6.5v5a2.5 2.5 0 0 1-2.5 2.5h-5A2.5 2.5 0 0 1 4 11.5Z" fill="currentColor" />
    <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18h5a2.5 2.5 0 0 1 2.5 2.5v5a2.5 2.5 0 0 1-2.5 2.5h-5A2.5 2.5 0 0 1 4 25.5Z" fill="currentColor" />
    <path d="M18 20.5a2.5 2.5 0 0 1 2.5-2.5h5a2.5 2.5 0 0 1 2.5 2.5v5a2.5 2.5 0 0 1-2.5 2.5h-5a2.5 2.5 0 0 1-2.5-2.5Z" fill="currentColor" />
    <path d="M23 3.5c.6 3.2 1.8 4.4 5 5-3.2.6-4.4 1.8-5 5-.6-3.2-1.8-4.4-5-5 3.2-.6 4.4-1.8 5-5Z" fill="currentColor" />
  </svg>
);
