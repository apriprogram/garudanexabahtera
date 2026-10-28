// Simbol MediCare General (SVG satu warna lewat currentColor, tanpa huruf, BUKAN palang/salib): lingkaran tebal yang
// memeluk satu denyut garis jantung (EKG) — perawatan yang selalu siaga. Path sama persis dengan
// public/assets/templates/logos/medicare-general-mark.svg; dipakai <BrandMark mark={…}> bila RS belum mengunggah logo.
export const MediCareMark = ({ className = 'h-8 w-8' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="currentColor" className={className} aria-hidden focusable="false">
    <path d="M16 1a15 15 0 1 1 0 30a15 15 0 1 1 0-30zm0 3.5a11.5 11.5 0 1 0 0 23a11.5 11.5 0 1 0 0-23z" />
    <path d="M6.5 18.3L11.91 18.3L13.14 14.95L17.06 26.82L19.83 17.59L20.29 18.3L25.5 18.3L25.5 15.7L21.71 15.7L18.97 11.41L16.94 18.18L13.26 7.05L10.09 15.7L6.5 15.7z" />
  </svg>
);
