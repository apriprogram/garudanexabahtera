// Simbol NusaNiaga (SVG satu warna lewat currentColor, tanpa huruf): cakram fajar ("arunika") yang terlihat dari balik
// empat bilah vertikal, dipotong seperti foto hero. Path sama persis dengan
// public/assets/templates/logos/nusaniaga-mark.svg; dipakai <BrandMark mark={…}> bila perusahaan belum mengunggah logo.
export const NusaNiagaMark = ({ className = 'h-8 w-8' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="currentColor" className={className} aria-hidden focusable="false">
    <path d="M3 16A13 13 0 0 1 8 5.75V26.25A13 13 0 0 1 3 16Z" />
    <path d="M10 4.47A13 13 0 0 1 15 3.04V28.96A13 13 0 0 1 10 27.53Z" />
    <path d="M17 3.04A13 13 0 0 1 22 4.47V27.53A13 13 0 0 1 17 28.96Z" />
    <path d="M24 5.75A13 13 0 0 1 29 16A13 13 0 0 1 24 26.25Z" />
  </svg>
);
