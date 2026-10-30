// Mobil Pesiar sebagai gambar GARIS tunggal (monoline) — tampak samping per kelas (sedan, MPV, minibus) dengan livery
// dua warna yang rapi: badan bawah warna tema dipotong TEPAT oleh garis luar badan (clipPath, tanpa geser), ban tinta
// dengan velg pasir, plus penanda mobil tampak atas untuk peta film. Orisinal, generik, TANPA merek/lencana/pelat; viewBox
// sama (360 × 150) untuk semua kelas, garis tinta 2 dengan ujung bulat, ≤ 25 elemen per mobil. `pathLength=1` di setiap
// garis agar bisa tergambar sekali saat masuk layar (./pesiar.css .ps-draw); warna (livery & ban) menyusul memudar
// (.ps-car-panel). Semua dekoratif (aria-hidden): nama & kapasitas mobil ada di teks kartu.
import { useId } from 'react';
import type { CarKind } from './model';

interface Shape {
  /** Siluet badan (garis luar, juga batas potong livery) */
  body: string;
  /** Kaca samping */
  glass: string;
  /** Pilar, pintu, pegangan, spion, lampu */
  details: string[];
  /** Tepi atas livery warna tema (di bawah garis jendela) */
  band: number;
  /** Pusat roda belakang & depan */
  wheels: [number, number];
}

const SHAPES: Record<CarKind, Shape> = {
  sedan: {
    body: 'M30 116L30 103C30 93 35 89 45 88L84 85C101 83 117 64 138 58C158 53 190 52 207 56C222 60 238 72 251 80L302 87C318 89 328 95 330 105L330 116L292.7 116A26 26 0 0 0 241.3 116L124.7 116A26 26 0 0 0 73.3 116Z',
    glass: 'M127 82C133 71 141 64 151 62L198 61C210 61 222 70 234 81Z',
    details: ['M181 61L181 110', 'M127 85L128 108', 'M236 84L234 106', 'M149 92L159 92', 'M204 92L214 92', 'M235 82C239 77 245 77 248 81', 'M313 91C319 92 324 95 326 98', 'M33 95L44 93'],
    band: 90,
    wheels: [99, 267],
  },
  // MPV: atap tinggi yang sedikit turun ke belakang, kaca depan panjang & miring, kap pendek, buritan hampir tegak; dua
  // pilar (C miring di belakang pintu geser, B di antara pintu) → tiga kaca berbeda ukuran.
  mpv: {
    body: 'M30 116L31 74C31 54 39 43 58 41L198 36C211 35.5 219 39 227 46L264 80L306 86C321 88 331 96 332 106L332 116L294.7 116A26 26 0 0 0 243.3 116L125.7 116A26 26 0 0 0 74.3 116Z',
    glass: 'M43 78L47 58C48 52 52 49 58 48.6L196 43C204 43 210 45 216 51L245 78Z',
    details: ['M112 46L114 79L114 110', 'M186 44L186 110', 'M247 81L250 108', 'M124 92L134 92', 'M196 92L206 92', 'M244 77C248 72 254 72 257 76', 'M318 90C324 91 329 95 330 99', 'M33 80L33 94'],
    band: 87,
    wheels: [100, 269],
  },
  minibus: {
    body: 'M26 116L26 41C26 33 31 29 40 29L289 27C299 27 306 31 310 38L327 70C332 78 335 87 335 97L335 116L304.7 116A26 26 0 0 0 253.3 116L118.7 116A26 26 0 0 0 67.3 116Z',
    glass: 'M36 73L36 43C36 40 38 38 42 38L287 36C294 36 299 39 302 44L319 71Z',
    details: ['M86 38L86 73', 'M136 37L136 73', 'M186 37L186 110', 'M236 36L236 110', 'M268 36L270 108', 'M200 88L211 88', 'M278 88L289 88', 'M321 70C325 65 331 65 334 69', 'M327 95L334 99', 'M28 74L28 90'],
    band: 80,
    wheels: [93, 279],
  },
};

const INK = '#1E2622';
const SAND = '#F5EFE6';

/** Mobil tampak samping bergaya garis (kelas `kind`). Ukuran mengikuti lebar wadah (viewBox 360 × 150). */
export function LineCar({ kind, className = '' }: { kind: CarKind; className?: string }) {
  const s = SHAPES[kind];
  const clip = `${useId().replace(/:/g, '')}-body`;
  return (
    <svg viewBox="0 0 360 150" className={`ps-draw block h-auto w-full overflow-visible ${className}`} aria-hidden focusable="false">
      <defs>
        <clipPath id={clip}>
          <path d={s.body} />
        </clipPath>
      </defs>
      {/* Warna (memudar setelah garis tergambar): livery dipotong garis luar badan, ban tinta + velg pasir */}
      <g className="ps-car-panel">
        <rect x={0} y={s.band} width={360} height={40} clipPath={`url(#${clip})`} fillOpacity={0.9} className="fill-(--tpl-accent)" />
        {s.wheels.map((x) => (
          <g key={x}>
            <circle cx={x} cy={112} r={21} fill={INK} />
            <circle cx={x} cy={112} r={11.5} fill={SAND} />
            <circle cx={x} cy={112} r={3.5} fill={INK} />
          </g>
        ))}
      </g>
      <g fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 134L348 134" strokeOpacity="0.28" pathLength={1} />
        <path d={s.body} pathLength={1} />
        <path d={s.glass} pathLength={1} />
        {s.details.map((d) => (
          <path key={d} d={d} pathLength={1} />
        ))}
        {s.wheels.map((x) => (
          <circle key={x} cx={x} cy={112} r={21} pathLength={1} />
        ))}
      </g>
    </svg>
  );
}

/**
 * Penanda mobil tampak atas untuk peta film (menghadap ke kanan/timur pada rotasi 0, satuan peta). Halo warna tema
 * terang agar terlihat di peta gelap; atap warna tema; kaca depan/belakang hijau tua; dua lampu depan.
 */
export function CarMarker() {
  return (
    <>
      <circle r={34} className="fill-(--ps-bright)" fillOpacity={0.2} />
      <rect x={-24} y={-11.5} width={48} height={23} rx={8} fill="#F5EFE6" stroke="#17332B" strokeWidth={2} />
      <rect x={-9} y={-8} width={20} height={16} rx={4} className="fill-(--tpl-accent)" />
      <path d="M11 -8L17.5 -9.5Q20 0 17.5 9.5L11 8Z" fill="#17332B" fillOpacity={0.78} />
      <path d="M-9 -8L-14.5 -9Q-16 0 -14.5 9L-9 8Z" fill="#17332B" fillOpacity={0.62} />
      <rect x={20} y={-9} width={3} height={5} rx={1} fill="#FFE7A8" />
      <rect x={20} y={4} width={3} height={5} rx={1} fill="#FFE7A8" />
    </>
  );
}
