// Simbol Portline (SVG satu warna lewat currentColor, tanpa huruf): sudut pelabuhan dengan dua busur radar dan satu
// titik kapal di lintasannya — jaringan yang menjangkau dari satu dermaga. Path sama persis dengan
// public/assets/templates/logos/portline-mark.svg; dipakai <BrandMark mark={…}> bila perusahaan belum mengunggah logo.
// Glyph perusahaan grup: enam simbol geometris orisinal untuk deret logo anak usaha di hero (tanpa logo unggahan).
export const PortlineMark = ({ className = 'h-8 w-8' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden focusable="false">
    <path d="M4 28V18a10 10 0 0 1 10 10Z" fill="currentColor" />
    <path d="M4 11.5A16.5 16.5 0 0 1 20.5 28" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M4 4.5A23.5 23.5 0 0 1 27.5 28" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="3.2 3.6" />
    <circle cx="24.5" cy="7.5" r="3" fill="currentColor" />
  </svg>
);

const GLYPHS = [
  // Dua chevron bertumpuk (layanan laut)
  <g key="0">
    <path d="M3 9l9 5 9-5" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
    <path d="M3 15l9 5 9-5" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
  </g>,
  // Kisi 2×2 (terminal)
  <g key="1">
    <rect x="3" y="3" width="8" height="8" fill="currentColor" />
    <rect x="13" y="3" width="8" height="8" stroke="currentColor" strokeWidth="2" />
    <rect x="3" y="13" width="8" height="8" stroke="currentColor" strokeWidth="2" />
    <rect x="13" y="13" width="8" height="8" fill="currentColor" />
  </g>,
  // Tetes dalam lingkaran (energi)
  <g key="2">
    <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="2" />
    <path d="M12 6.5c2.6 3.2 3.9 5.4 3.9 7.2a3.9 3.9 0 0 1-7.8 0c0-1.8 1.3-4 3.9-7.2Z" fill="currentColor" />
  </g>,
  // Panah sayap (darat & udara)
  <g key="3">
    <path d="M2.5 19.5L21.5 4.5 15 21l-3.2-6.2Z" fill="currentColor" />
    <path d="M11.8 14.8L21.5 4.5" stroke="currentColor" strokeWidth="1.2" />
  </g>,
  // Segi enam bergaris (galangan)
  <g key="4">
    <path d="M12 2.8l8 4.6v9.2l-8 4.6-8-4.6V7.4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M12 7.5l4 2.3v4.4l-4 2.3-4-2.3V9.8Z" fill="currentColor" />
  </g>,
  // Gelombang dalam persegi (lainnya)
  <g key="5">
    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M6 13.5c2 0 2-2 4-2s2 2 4 2 2-2 4-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </g>,
];

export const CompanyGlyph = ({ index = 0, className = 'h-6 w-6' }: { index?: number; className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden focusable="false">
    {GLYPHS[Math.abs(Math.floor(index)) % GLYPHS.length]}
  </svg>
);
