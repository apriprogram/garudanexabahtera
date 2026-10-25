// Simbol & ikon garis bawaan SkyNusa (SVG satu warna lewat currentColor, tanpa huruf).
// <SkyNusaMark>: drone quadcopter tampak atas — badan persegi membulat, empat lengan diagonal, empat rotor. Path sama
// persis dengan public/assets/templates/logos/skynusa-mark.svg; dipakai <BrandMark mark={…}> bila belum ada logo.
// <DroneIcon>: versi ikon 24px bergaris 1,8 (lucide-react versi ini belum punya ikon drone), dipakai lewat ./icons.
export const SkyNusaMark = ({ className = 'h-8 w-8' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden focusable="false">
    <path d="M10.6 10.6 13 13M21.4 10.6 19 13M10.6 21.4 13 19M21.4 21.4 19 19" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="7.5" cy="7.5" r="4.25" stroke="currentColor" strokeWidth="2" />
    <circle cx="24.5" cy="7.5" r="4.25" stroke="currentColor" strokeWidth="2" />
    <circle cx="7.5" cy="24.5" r="4.25" stroke="currentColor" strokeWidth="2" />
    <circle cx="24.5" cy="24.5" r="4.25" stroke="currentColor" strokeWidth="2" />
    <rect x="11.75" y="11.75" width="8.5" height="8.5" rx="2.6" fill="currentColor" />
  </svg>
);

export const DroneIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden focusable="false">
    <circle cx="5.5" cy="5.5" r="3" />
    <circle cx="18.5" cy="5.5" r="3" />
    <circle cx="5.5" cy="18.5" r="3" />
    <circle cx="18.5" cy="18.5" r="3" />
    <path d="M7.7 7.7 10 10M16.3 7.7 14 10M7.7 16.3 10 14M16.3 16.3 14 14" />
    <rect x="9.5" y="9.5" width="5" height="5" rx="1.4" />
  </svg>
);
