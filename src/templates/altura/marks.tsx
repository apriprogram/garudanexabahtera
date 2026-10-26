// Simbol Altura (SVG satu warna lewat currentColor, tanpa huruf): menara bertingkat dari tiga teras miring yang naik ke
// kanan di samping blok rendah — ketinggian (altura) dan kawasan yang tumbuh. Path sama persis dengan
// public/assets/templates/logos/altura-mark.svg; dipakai <BrandMark mark={…}> bila perusahaan belum mengunggah logo.
export const AlturaMark = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden focusable="false">
    <path d="M4 28V18.2l8-1.9V28Z" fill="currentColor" />
    <path d="M15 28v-5.6l13-3V28Z" fill="currentColor" />
    <path d="M15 19.6v-5.4l13-3v5.4Z" fill="currentColor" />
    <path d="M15 11.4V6l13-3v5.4Z" fill="currentColor" />
  </svg>
);
