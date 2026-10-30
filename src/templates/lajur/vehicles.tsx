// Ilustrasi kendaraan Lajur (SVG asli, digambar dari parameter — bukan jiplakan merek/model mana pun): tampak samping
// datar bus menghadap kanan, livery gaya bus pariwisata/maskapai: badan PUTIH MUTIARA, pita bawah warna tema yang naik
// sampai atap di panel belakang (tepinya miring "/") dengan tiga bilah "///" putih (motif logo), marka lajur putus-putus
// di pita, pita kaca gelap menerus (pilar tinta tipis, ujung belakang miring), kaca depan & hidung condong ke depan,
// rok tinta tipis, pintu kaca tinggi, spion "bug-eye", pod AC, lampu, roda berpelek & jari-jari. Tiga kelas, satu
// viewBox per kelas (tinggi sama 126 = garis tanah): big 400, medium 304, micro 236 (micro = van atap tinggi berhidung
// pendek). Tanpa logo merek, tanpa pelat, tanpa tulisan. Cahaya dari kiri atas. `glow` (film) menambah lapisan malam
// di badan + cahaya kabin. Juga ikon mini (BusGlyph) dan denah kursi tampak atas (SeatMap) yang dibuat dari seatPlan
// (./model). Semua dekoratif: aria-hidden, teks setaranya ada di HTML di sebelahnya.
import { SEAT_GEOMETRY, seatBlock, seatMapSize } from './geometry';
import type { BusSize, SeatPlan } from './model';

interface BodySpec {
  /** Lebar viewBox */
  w: number;
  x0: number;
  x1: number;
  roof: number;
  bottom: number;
  front: 'coach' | 'nose';
  r: number;
  rear: number;
  front_axle: number;
  /** Kaca samping [atas, bawah] */
  glass: [number, number];
  door: [number, number];
  /** Bawah pintu kaca */
  doorBottom: number;
  ac: [number, number] | null;
  /** Panel belakang beraksen: lebarnya di garis atap, pecahan panjang badan */
  panel: number;
}

const SPECS: Record<BusSize, BodySpec> = {
  big: { w: 400, x0: 8, x1: 392, roof: 10, bottom: 112, front: 'coach', r: 15.5, rear: 114, front_axle: 309, glass: [26, 64], door: [338, 360], doorBottom: 104, ac: [150, 250], panel: 0.2 },
  medium: { w: 304, x0: 8, x1: 296, roof: 16, bottom: 112, front: 'coach', r: 15, rear: 92, front_axle: 230, glass: [30, 64], door: [246, 266], doorBottom: 104, ac: [110, 190], panel: 0.22 },
  micro: { w: 236, x0: 8, x1: 228, roof: 24, bottom: 110, front: 'nose', r: 13, rear: 74, front_axle: 192, glass: [36, 62], door: [146, 170], doorBottom: 98, ac: null, panel: 0.24 },
};

const GROUND = 126;
const INK = '#14161A';
/** Badan putih mutiara, tepi atap abu hangat (garis bentuk di panel terang), kaca gelap, pilar tinta */
const PEARL = '#F7F6F2';
const ROOF_EDGE = '#D3CFC4';
const GLASS = '#1B2230';
const PILLAR = '#0E1116';
/** Kemiringan livery (dx per dy): tepi panel belakang, ujung kaca, dan tiga bilah sejajar "///" */
const SLANT = 0.32;
/** Tinggi rok tinta di bawah badan */
const SKIRT = 10;
/** Hidung "coach" condong: titik atas-depan (x1 − 12, atap + 16) → bawah (x1 + 1, bawah − 14) */
const NOSE_TOP = 16;
const NOSE_RAKE = 13;

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Tepi depan bus "coach" pada ketinggian y (garis condong; di atas lengkung atap dipakai titik atasnya). */
function coachFront(s: BodySpec, y: number): number {
  const y0 = s.roof + NOSE_TOP;
  const y1 = s.bottom - 14;
  return s.x1 - 12 + (NOSE_RAKE * (Math.min(y1, Math.max(y0, y)) - y0)) / (y1 - y0);
}

/** Ukuran livery bersama (atas pita, atas rok, tepi panel belakang di ketinggian y). */
function livery(s: BodySpec) {
  const band = s.glass[1] + 4;
  const skirt = s.bottom - SKIRT;
  const roofX = s.x0 + s.panel * (s.x1 - s.x0);
  /** Tepi miring panel belakang ("/": makin ke atas makin ke depan) */
  const panelX = (y: number) => roofX - SLANT * (y - s.roof);
  return { band, skirt, roofX, panelX };
}

function bodyPath(s: BodySpec): string {
  const { x0, x1, roof, bottom } = s;
  if (s.front === 'coach') {
    return `M${x0 + 8} ${roof}H${x1 - 34}C${x1 - 22} ${roof} ${x1 - 14} ${roof + 5} ${x1 - 12} ${roof + NOSE_TOP}L${x1 + 1} ${bottom - 14}Q${x1 + 2} ${bottom - 2} ${x1 - 6} ${bottom}H${x0 + 6}Q${x0} ${bottom} ${x0} ${bottom - 8}V${roof + 8}Q${x0} ${roof} ${x0 + 8} ${roof}Z`;
  }
  return `M${x0 + 8} ${roof}H${x1 - 36}C${x1 - 28} ${roof} ${x1 - 24} ${roof + 3} ${x1 - 22} ${roof + 8}L${x1 - 14} ${roof + 34}Q${x1 - 12} ${roof + 37} ${x1 - 8} ${roof + 38}L${x1 - 3} ${roof + 40}Q${x1} ${roof + 41} ${x1} ${roof + 46}V${bottom - 8}Q${x1} ${bottom} ${x1 - 8} ${bottom}H${x0 + 6}Q${x0} ${bottom} ${x0} ${bottom - 8}V${roof + 8}Q${x0} ${roof} ${x0 + 8} ${roof}Z`;
}

/** Warna tema: pita bawah (atas pita → rok) + panel belakang sampai atap, tepi depannya miring sejajar bilah. */
function accentPath(s: BodySpec): string {
  const { x0, x1, roof } = s;
  const { band, skirt, roofX, panelX } = livery(s);
  // Tepi depan pita mengikuti hidung: coach = garis condong lalu lengkung bawah; nose = kap mesin lalu tegak
  const front =
    s.front === 'coach'
      ? `H${r1(coachFront(s, band))}L${x1 + 1} ${s.bottom - 14}L${x1 + 1.07} ${skirt}`
      : `H${x1 - 0.8}L${x1} ${roof + 46}V${skirt}`;
  return `M${x0} ${skirt}V${roof + 8}Q${x0} ${roof} ${x0 + 8} ${roof}H${r1(roofX)}L${r1(panelX(band))} ${band}${front}Z`;
}

/** Tiga bilah "///" putih di panel belakang (sejajar tepi panel). */
function barsPath(s: BodySpec): string {
  const { band, panelX } = livery(s);
  const yB = band + 22;
  const yT = s.glass[0] + 4;
  const bw = s.front === 'nose' ? 4 : s.panel > 0.2 ? 4.5 : 5;
  const step = bw * 2;
  let d = '';
  for (let k = 0; k < 3; k += 1) {
    const at = (y: number) => panelX(y) - 7 - k * step;
    d += `M${r1(at(yB))} ${yB}L${r1(at(yT))} ${yT}H${r1(at(yT) - bw)}L${r1(at(yB) - bw)} ${yB}Z`;
  }
  return d;
}

/** Rok tinta 10 unit di bawah badan, mengikuti lengkung bawah hidung. */
function skirtPath(s: BodySpec): string {
  const { x0, x1, bottom } = s;
  const top = bottom - SKIRT;
  // Coach: potongan lengkung Q hidung dari t ≈ 0,18 (y = bawah − 10) sampai ujungnya
  const front = s.front === 'coach' ? `H${x1 + 1.07}Q${x1 + 0.56} ${r1(bottom - 1.64)} ${x1 - 6} ${bottom}` : `H${x1}V${bottom - 8}Q${x1} ${bottom} ${x1 - 8} ${bottom}`;
  return `M${x0} ${top}${front}H${x0 + 6}Q${x0} ${bottom} ${x0} ${bottom - 8}Z`;
}

/** Kaca samping (ujung belakang miring) + pintu + kaca depan condong (satu path, juga cahaya kabin di film). */
function glassPath(s: BodySpec): string {
  const [top, bottom] = s.glass;
  const [d0, d1] = s.door;
  const { panelX } = livery(s);
  const gx = (y: number) => r1(panelX(y) + 4);
  const side = `M${gx(top)} ${top}H${d0 - 4}V${bottom}H${gx(bottom)}Z`;
  const door = `M${d0} ${top}H${d1}V${s.doorBottom}H${d0}Z`;
  let front: string;
  if (s.front === 'coach') {
    const fb = top + 54;
    const edge = (y: number) => r1(coachFront(s, y) - 3);
    front = `M${d1 + 4} ${top}H${r1(edge(top) - 4)}Q${r1(edge(top) + 0.4)} ${top} ${edge(top + 6)} ${top + 6}L${edge(fb)} ${fb}H${d1 + 4}Z`;
  } else {
    front = `M${d1 + 4} ${top}H${s.x1 - 28}Q${s.x1 - 25} ${top} ${s.x1 - 23.6} ${top + 3}L${s.x1 - 16} ${top + 24}H${d1 + 4}Z`;
  }
  return `${side}${door}${front}`;
}

function Wheel({ cx, cy, r, className }: { cx: number; cy: number; r: number; className?: string }) {
  const rim = r * 0.62;
  const spokes = [0, 72, 144, 216, 288]
    .map((deg) => {
      const a = (deg * Math.PI) / 180;
      const x = (n: number) => (cx + Math.cos(a) * n).toFixed(2);
      const y = (n: number) => (cy + Math.sin(a) * n).toFixed(2);
      return `M${x(r * 0.2)} ${y(r * 0.2)}L${x(rim * 0.92)} ${y(rim * 0.92)}`;
    })
    .join('');
  return (
    <g className={className}>
      <circle cx={cx} cy={cy} r={r} fill="#111316" />
      <circle cx={cx} cy={cy} r={rim} fill="#C9CED6" />
      <path d={spokes} stroke="#7D8590" strokeWidth={r * 0.13} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={r * 0.2} fill="#4B5159" />
    </g>
  );
}

/**
 * Bus tampak samping. `wheelClassName` = kelas untuk dua roda (diputar CSS: transform-box fill-box). `glow` (film)
 * menambah lapisan malam di badan (kelas `lj-bus-night`) dan cahaya kabin (kelas `lj-cabin`); kaca, lampu, dan roda
 * tetap di atasnya. Ukuran: atur lebar lewat `className`, tinggi mengikuti viewBox.
 */
export function Coach({ size, className = '', wheelClassName, glow = false }: { size: BusSize; className?: string; wheelClassName?: string; glow?: boolean }) {
  const s = SPECS[size];
  const cy = GROUND - s.r;
  const [top, bottom] = s.glass;
  const mid = (top + bottom) / 2;
  const { band, skirt, roofX, panelX } = livery(s);
  const arch = (x: number) => `M${x - s.r - 4} ${s.bottom}A${s.r + 4} ${s.r + 4} 0 0 1 ${x + s.r + 4} ${s.bottom}Z`;
  const glassStart = panelX(mid) + 4;
  const sheen = Math.round(glassStart + (s.door[0] - glassStart) * 0.32);
  const dashY = Math.round(band + (skirt - band) * 0.5);
  const roofEnd = s.front === 'coach' ? `H${s.x1 - 34}C${s.x1 - 22.6} ${s.roof + 1.3} ${s.x1 - 15.2} ${s.roof + 6} ${s.x1 - 13.3} ${s.roof + NOSE_TOP}` : `H${s.x1 - 36}C${s.x1 - 28.6} ${s.roof + 1.3} ${s.x1 - 24.8} ${s.roof + 4.2} ${s.x1 - 23.2} ${s.roof + 8.6}`;
  const lamp = s.front === 'coach' ? coachFront(s, skirt - 8) : s.x1;
  return (
    <svg viewBox={`0 0 ${s.w} ${GROUND}`} className={className} aria-hidden focusable="false">
      {/* Pod AC di atap: nada tinta tipis agar terlihat di panel terang maupun langit film */}
      {s.ac && (
        <path
          d={`M${s.ac[0]} ${s.roof}V${s.roof - 3}Q${s.ac[0]} ${s.roof - 5} ${s.ac[0] + 2} ${s.roof - 5}H${s.ac[1] - 2}Q${s.ac[1]} ${s.roof - 5} ${s.ac[1]} ${s.roof - 3}V${s.roof}Z`}
          fill={INK}
          fillOpacity={0.2}
        />
      )}
      <path d={bodyPath(s)} fill={PEARL} />
      {/* Livery warna tema: pita bawah + panel belakang sampai atap, tiga bilah "///" dan marka lajur putih */}
      <path d={accentPath(s)} className="fill-(--tpl-accent)" />
      <path d={barsPath(s)} fill={PEARL} />
      <path d={`M${r1(panelX(dashY) + 12)} ${dashY}H${s.door[0] - 8}`} stroke={PEARL} strokeWidth={2.4} strokeDasharray="14 9" />
      {/* Tepi atap abu hangat: garis bentuk bus putih di latar terang */}
      <path d={`M${r1(roofX + 1)} ${s.roof + 1.3}${roofEnd}`} fill="none" stroke={ROOF_EDGE} strokeWidth={2.6} />
      {glow && <path d={bodyPath(s)} fill="#0E1430" className="lj-bus-night" />}
      <path d={glassPath(s)} fill={GLASS} />
      {glow && <path d={glassPath(s)} fill="#FFCF7A" className="lj-cabin" />}
      {/* Pilar jendela tinta tipis: kaca terbaca sebagai satu pita gelap */}
      <path d={`M${r1(glassStart + 38)} ${mid}H${s.door[0] - 6}`} stroke={PILLAR} strokeWidth={bottom - top} strokeDasharray="2 42" />
      {/* Kilau tipis di tepi atas kaca + pantulan miring */}
      <path d={`M${r1(glassStart + 6)} ${top + 2.2}H${s.door[0] - 6}`} stroke="#FFFFFF" strokeOpacity={0.14} strokeWidth={1.6} />
      <path d={`M${sheen} ${top}h22l-30 ${bottom - top}h-22zM${sheen + 28} ${top}h6l-30 ${bottom - top}h-6z`} fill="#FFFFFF" fillOpacity={0.09} />
      <path d={`M${(s.door[0] + s.door[1]) / 2} ${top + 2}V${s.doorBottom - 2}`} stroke={PILLAR} strokeWidth={1.6} />
      {/* Rok tinta tipis & lengkung roda */}
      <path d={skirtPath(s)} fill="#17191D" />
      <path d={`${arch(s.rear)}${arch(s.front_axle)}`} fill="#0B0C0E" />
      {/* Lampu: belakang merah, depan putih + sein */}
      <rect x={s.x0} y={band + 2} width={3.4} height={20} rx={1} fill="#E5484D" />
      {s.front === 'coach' ? (
        <>
          <path d={`M${r1(lamp - 7.5)} ${skirt - 8}H${r1(lamp - 0.6)}L${r1(lamp)} ${skirt - 2}H${r1(lamp - 7.5)}Z`} fill="#FFF6DD" />
          <path d={`M${s.x1 - 6} ${skirt + 2}h7l.2 3h-7.2z`} fill="#FFB45E" />
          <path d={`M${s.x1 - 20} ${s.roof + 2}C${s.x1 - 6} ${s.roof + 2} ${s.x1 + 3} ${s.roof + 8} ${s.x1 + 4.5} ${s.roof + 22}`} fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
          <rect x={s.x1 + 2.2} y={s.roof + 21} width={4.6} height={13} rx={1.2} fill={INK} />
        </>
      ) : (
        <>
          <path d={`M${s.x1 - 6} ${s.roof + 48}h5.6l.4 6h-6z`} fill="#FFF6DD" />
          <path d={`M${s.x1 - 24} ${s.roof + 12}C${s.x1 - 17} ${s.roof + 12} ${s.x1 - 13} ${s.roof + 16} ${s.x1 - 12} ${s.roof + 22}`} fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" />
          <rect x={s.x1 - 14.5} y={s.roof + 21} width={4} height={10} rx={1} fill={INK} />
        </>
      )}
      <Wheel cx={s.rear} cy={cy} r={s.r} className={wheelClassName} />
      <Wheel cx={s.front_axle} cy={cy} r={s.r} className={wheelClassName} />
    </svg>
  );
}

const GLYPH: Record<BusSize, number> = { big: 32, medium: 26, micro: 20 };

/** Ikon bus mini (4–5 elemen): badan aksen, pita kaca tinta, dua roda. Lebar mengikuti kelas (32 / 26 / 20). */
export function BusGlyph({ size, className = '' }: { size: BusSize; className?: string }) {
  const w = GLYPH[size];
  const nose = size === 'micro';
  return (
    <svg viewBox={`0 0 ${w} 14`} width={w} height={14} className={className} aria-hidden focusable="false">
      <path
        d={nose ? `M1.5 2.5h${w - 7}l3 3.5h1.5v5h-${w - 1}z` : `M2.5 1h${w - 5}q2 0 2 2v8.5h-${w - 1}v-8.5q0-2 2-2z`}
        className="fill-(--tpl-accent)"
      />
      <path d={nose ? `M3 4h${w - 9}v2.5h-${w - 9}z` : `M3 3h${w - 6.5}v3.2h-${w - 6.5}z`} fill="#1B2230" />
      <path d={`M1 9.8h${w - 2}v1.7h-${w - 2}z`} fill="#17191D" />
      <circle cx={nose ? 5 : 6.5} cy={11.6} r={2.2} fill={INK} />
      <circle cx={w - (nose ? 5 : 6.5)} cy={11.6} r={2.2} fill={INK} />
    </svg>
  );
}

const { seat: SEAT, gap: GAP, aisle: AISLE, pitch: PITCH, wall: WALL } = SEAT_GEOMETRY;

/**
 * Denah kursi tampak atas, depan di kanan (sama dengan gambar samping). Kiri bus = sisi atas (pintu di depan kiri),
 * kanan bus = sisi bawah (sopir di depan kanan: setir kanan). Baris biasa kiri+kanan lorong, bangku belakang menutup
 * lorong, kotak WC di belakang bila `toilet`.
 */
export function SeatMap({ plan, toilet, className = '' }: { plan: SeatPlan; toilet: boolean; className?: string }) {
  const { w, h } = seatMapSize(plan, toilet);
  const block = seatBlock;
  const leftY = (i: number) => WALL + i * (SEAT + GAP);
  const rightY0 = WALL + block(plan.left) + AISLE;
  const rightY = (i: number) => rightY0 + i * (SEAT + GAP);
  const seats: { x: number; y: number; size: number }[] = [];
  // Bangku belakang selebar bagian dalam: kursi dibagi rata; bila lebih banyak dari yang muat (mis. 6 kursi di bus
  // 2-2), kursinya menyempit sampai berjajar rapat dengan celah 1,2 (tidak saling menumpuk)
  const inner = h - WALL * 2;
  const backSize = plan.back > 1 ? Math.min(SEAT, (inner - (plan.back - 1) * 1.2) / plan.back) : SEAT;
  for (let i = 0; i < plan.back; i += 1) {
    const step = plan.back > 1 ? (inner - backSize) / (plan.back - 1) : 0;
    seats.push({ x: WALL + 3, y: WALL + (plan.back > 1 ? i * step : (inner - SEAT) / 2), size: backSize });
  }
  const firstRow = WALL + PITCH + (toilet ? PITCH : 0);
  for (let r = 0; r < plan.rows; r += 1) {
    const x = firstRow + r * PITCH + 3;
    for (let i = 0; i < plan.left; i += 1) seats.push({ x, y: leftY(i), size: SEAT });
    for (let i = 0; i < plan.right; i += 1) seats.push({ x, y: rightY(i), size: SEAT });
  }
  const cab = firstRow + plan.rows * PITCH;
  const seatPath = seats
    .map((s) => `M${s.x + 3} ${r1(s.y)}h${SEAT - 3}a2 2 0 0 1 2 2v${r1(s.size - 4)}a2 2 0 0 1-2 2h-${SEAT - 3}a3 3 0 0 1-3-3v-${r1(s.size - 6)}a3 3 0 0 1 3-3z`)
    .join('');
  return (
    <svg viewBox={`-2 -2 ${w + 4} ${h + 4}`} className={className} aria-hidden focusable="false">
      {/* Lambung bus + kaca depan */}
      <path d={`M10 0H${w - 22}Q${w} 0 ${w} 22V${h - 22}Q${w} ${h} ${w - 22} ${h}H10Q0 ${h} 0 ${h - 10}V10Q0 0 10 0Z`} fill="#FFFFFF" stroke={INK} strokeOpacity={0.28} strokeWidth={1.5} />
      <path d={`M${w - 9} 18Q${w - 4} ${h / 2} ${w - 9} ${h - 18}`} fill="none" stroke={INK} strokeOpacity={0.35} strokeWidth={2.5} strokeLinecap="round" />
      {/* Pintu depan kiri: celah di dinding atas + anak tangga */}
      <path d={`M${cab + 4} -1.2H${cab + 30}`} stroke="#FFFFFF" strokeWidth={3} />
      <path d={`M${cab + 6} 5H${cab + 28}M${cab + 6} 10H${cab + 28}`} stroke={INK} strokeOpacity={0.25} strokeWidth={1.2} />
      {/* Kursi penumpang */}
      <path d={seatPath} className="fill-(--tpl-accent)" stroke={INK} strokeOpacity={0.3} strokeWidth={1} />
      {/* Sopir di depan kanan + setir */}
      <rect x={cab + 14} y={rightY(plan.right - 1)} width={SEAT} height={SEAT} rx={3} fill={INK} />
      <path d={`M${cab + 32} ${rightY(plan.right - 1) + 1}v${SEAT - 2}`} stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
      {toilet && (
        <g>
          <rect x={WALL + PITCH + 2} y={rightY0} width={PITCH - 4} height={block(plan.right)} rx={2} fill={INK} fillOpacity={0.08} stroke={INK} strokeOpacity={0.3} />
          <text x={WALL + PITCH + PITCH / 2} y={rightY0 + block(plan.right) / 2 + 3} textAnchor="middle" fontSize={7} fontWeight={700} fill={INK} fillOpacity={0.6}>
            WC
          </text>
        </g>
      )}
    </svg>
  );
}
