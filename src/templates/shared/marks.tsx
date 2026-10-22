// Mark logo bawaan template (SVG orisinal, satu warna: currentColor + opasitas). Path sama persis dengan
// public/assets/templates/logos/*-mark.svg. Dipakai <BrandMark mark={…}> bila pembeli belum mengunggah logo,
// menggantikan kotak inisial. Bentuknya abstrak (tanpa huruf) agar cocok untuk nama perusahaan apa pun.

export type MarkProps = { className?: string };

/** Corporate Nexa: balok isometrik = struktur / bangunan. */
export const StructureMark = ({ className = 'h-8 w-8' }: MarkProps) => (
  <svg viewBox="0 0 32 32" fill="currentColor" className={className} aria-hidden focusable="false">
    <path d="M16 2.5 28.5 9.5 16 16.5 3.5 9.5Z" opacity=".38" />
    <path d="M3.5 11.8 14.9 18.2V30L3.5 23.6Z" />
    <path d="M28.5 11.8V23.6L17.1 30V18.2Z" opacity=".68" />
  </svg>
);

/** Startup Clean: bunga empat kelopak = "kirana" (sinar). */
export const BloomMark = ({ className = 'h-8 w-8' }: MarkProps) => (
  <svg viewBox="0 0 32 32" fill="currentColor" className={className} aria-hidden focusable="false">
    <path d="M16 15.2C11.6 12.2 11.2 6.1 16 2c4.8 4.1 4.4 10.2 0 13.2Z" />
    <path d="M16 16.8c4.4 3 4.8 9.1 0 13.2-4.8-4.1-4.4-10.2 0-13.2Z" />
    <path d="M15.2 16C12.2 20.4 6.1 20.8 2 16c4.1-4.8 10.2-4.4 13.2 0Z" opacity=".5" />
    <path d="M16.8 16c3-4.4 9.1-4.8 13.2 0-4.1 4.8-10.2 4.4-13.2 0Z" opacity=".5" />
  </svg>
);
