// Grafis orisinal Finova (SVG satu warna lewat currentColor, tanpa huruf): simbol bawaan, peta titik Indonesia, dan
// grafik garis mini untuk kartu UI. Semua dekoratif (aria-hidden).
import { useId } from 'react';
import { CITY_DOTS, INDONESIA_DOTS } from './map';

/**
 * Simbol bawaan Finova: atap lumbung membulat yang menaungi koin berlubang persegi (kepeng). Path sama persis dengan
 * public/assets/templates/logos/finova-mark.svg. Dipakai <BrandMark mark={…}> bila pembeli belum mengunggah logo.
 */
export const FinovaMark = ({ className = 'h-8 w-8' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="currentColor" className={className} aria-hidden focusable="false">
    <path d="M15.1 3.28a1.5 1.5 0 0 1 1.8 0l12.2 9.15c1.15.86.54 2.7-.9 2.7H3.8c-1.44 0-2.05-1.84-.9-2.7Z" />
    <path fillRule="evenodd" d="M16 17a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Zm-1.75 4.75v3.5h3.5v-3.5Z" />
  </svg>
);

/** Peta titik Indonesia dengan beberapa titik kota bercincin (warna lewat kelas teks pemanggil). */
export const IndonesiaMap = ({ className = '' }: { className?: string }) => (
  <svg viewBox="-8 -8 936 356" className={className} aria-hidden focusable="false" data-fin-map="">
    <path d={INDONESIA_DOTS} fill="none" stroke="currentColor" strokeOpacity=".28" strokeWidth="6.5" strokeLinecap="round" />
    {CITY_DOTS.map(([x, y]) => (
      <g key={`${x}-${y}`}>
        <circle cx={x} cy={y} r="14" fill="var(--fin-hl)" fillOpacity=".35" />
        <circle cx={x} cy={y} r="6.5" fill="var(--tpl-accent)" />
      </g>
    ))}
  </svg>
);

/**
 * Grafik garis mini (dekoratif). Garis "digambar" saat kartu pembungkusnya (<Reveal>) muncul (CSS .fin-draw di
 * ./finova.css); gerak mati → garis langsung utuh.
 */
export function LineChart({ className = '', points = '0,34 14,30 28,32 42,22 56,26 70,14 84,18 100,6', tone = 'accent' }: { className?: string; points?: string; tone?: 'accent' | 'light' }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const stroke = tone === 'light' ? 'var(--fin-hl)' : 'var(--tpl-accent)';
  const last = points.trim().split(/\s+/).pop()?.split(',') ?? ['100', '6'];
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={stroke} stopOpacity=".28" />
          <stop offset="1" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,40 ${points} 100,40`} fill={`url(#${id}-fill)`} />
      <polyline
        className="fin-draw"
        pathLength={1}
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill={stroke} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Batang mingguan dekoratif (kartu grafik produk). Batang ke-`active` diberi warna tombol. */
export function BarChart({ className = '', values = [42, 64, 38, 76, 52, 88, 58], active = 5 }: { className?: string; values?: number[]; active?: number }) {
  return (
    <svg viewBox={`0 0 ${values.length * 14} 60`} preserveAspectRatio="none" className={className} aria-hidden focusable="false">
      {values.map((v, i) => (
        <rect
          key={i}
          x={i * 14 + 3}
          y={60 - (v / 100) * 60}
          width="8"
          height={(v / 100) * 60}
          rx="3"
          fill={i === active ? 'var(--fin-hl)' : 'var(--fin-mint)'}
          stroke={i === active ? 'var(--tpl-accent)' : 'none'}
          strokeWidth={i === active ? 1 : 0}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
