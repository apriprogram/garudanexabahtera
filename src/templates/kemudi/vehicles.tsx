// Ilustrasi mobil Kemudi (SVG orisinal, tanpa merek/emblem/pelat): <CarSide> tampak samping datar geometris per kelas
// (city car, MPV, MPV ringkas, SUV, MPV premium, minibus; viewBox 480×200, tanah y = 178, muka ke kanan, cahaya dari kiri atas) dengan
// bodi warna tema (--tpl-accent, sisi terang/gelap --km-body-hi/lo), kaca gelap, velg lima jari-jari, dan rongga
// spakbor gelap; ≤ 32 elemen per mobil. <CarGlyph> = mobil mungil untuk trek mini di kartu pesan. Semua dekoratif
// (aria-hidden); nama kelas mobil selalu tertulis di teks di sampingnya. Bentuk dari ./geometry.
import { CAR_SHAPES } from './geometry';
import type { BodyKind } from './model';

const GLASS = 'fill-[#17202B]';
const TRIM = 'fill-[#262D37]';

/**
 * Mobil tampak samping. `floor` = lantai: bidang abu tipis + garis 2px di tanah, dilebarkan ke kiri-kanan sehingga
 * mengisi wadah selebar apa pun (viewBox dipotong 0 14 480 186, rata bawah).
 */
export function CarSide({ kind, floor = false, className = '' }: { kind: BodyKind; floor?: boolean; className?: string }) {
  const car = CAR_SHAPES[kind] ?? CAR_SHAPES.mpv;
  return (
    <svg viewBox={floor ? '0 14 480 186' : '0 0 480 200'} preserveAspectRatio="xMidYMax meet" className={className} aria-hidden="true" focusable="false" data-car={kind}>
      {floor && (
        <>
          <rect x={-480} y={179} width={1440} height={40} className="fill-[#ECEFF3]" />
          <path d="M-480 179.6 H960" className="fill-none stroke-[#0D1117]/[0.12]" strokeWidth={2} />
        </>
      )}
      {car.wheels.map((w) => (
        <path key={`well-${w.cx}`} d={w.well} className="fill-[#0B0F14]" />
      ))}
      <path d={car.body} className="fill-(--tpl-accent)" />
      <path d={car.lower} className="fill-(--km-body-lo)" />
      <path d={car.hi} className="fill-(--km-body-hi)" />
      {car.trims.map((d) => (
        <path key={d} d={d} className={TRIM} />
      ))}
      {car.skid && <path d={car.skid} className="fill-[#C9D1DC]" />}
      {car.glass.map((d) => (
        <path key={d} d={d} className={GLASS} />
      ))}
      {car.glassRects?.map(([x, y, w, h]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} rx={5} className={GLASS} />
      ))}
      {car.glassLines?.map((d) => (
        <path key={d} d={d} className="fill-none stroke-white/15" strokeWidth={2} />
      ))}
      {car.chrome && <path d={car.chrome} className="fill-[#DCE3EC]" />}
      {car.seams.map((d) => (
        <path key={d} d={d} className="fill-none stroke-[#0D1117]/30" strokeWidth={1.4} strokeLinecap="round" />
      ))}
      {car.handles.map((d) => (
        <path key={d} d={d} className="fill-[#0D1117]/35" />
      ))}
      <path d={car.mirror} className="fill-(--km-body-lo)" />
      <path d={car.head} className="fill-[#EEF3FA]" />
      <path d={car.tail} className="fill-[#E5484D]" />
      {car.wheels.map((w) => (
        <g key={`wheel-${w.cx}`}>
          <circle cx={w.cx} cy={w.cy} r={w.r} className="fill-[#10141A]" />
          <circle cx={w.cx} cy={w.cy} r={Math.round(w.r * 64) / 100} className="fill-[#CBD3DD]" />
          <path d={w.spokes} className="fill-[#2A313B]" />
          <circle cx={w.cx} cy={w.cy} r={Math.round(w.r * 16) / 100} className="fill-[#8792A2]" />
        </g>
      ))}
    </svg>
  );
}

/** Mobil mungil (40×20) untuk trek mini kartu pesan & penanda. */
export function CarGlyph({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 20" className={className} aria-hidden="true" focusable="false">
      <path d="M3 14.5 L3 10.5 Q3 8.5 5 8 L10 7.4 L14.5 3.6 Q15.5 3 17 3 L27 3 Q28.6 3 29.6 4 L33.5 7.6 L36 8.4 Q37.5 9 37.5 10.6 L37.5 14 Q37.5 15.5 36 15.5 L4 15.5 Q3 15.5 3 14.5 Z" className="fill-(--tpl-accent)" />
      <path d="M15.6 5 L20 5 L20 8 L12.6 8 Z M21.4 5 L27 5 Q28 5 28.6 5.6 L31.2 8 L21.4 8 Z" className="fill-[#17202B]" />
      <circle cx="10.5" cy="15.5" r="3.4" className="fill-[#10141A]" />
      <circle cx="30" cy="15.5" r="3.4" className="fill-[#10141A]" />
      <circle cx="10.5" cy="15.5" r="1.4" className="fill-[#CBD3DD]" />
      <circle cx="30" cy="15.5" r="1.4" className="fill-[#CBD3DD]" />
    </svg>
  );
}
