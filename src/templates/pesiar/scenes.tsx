// Grafis peta film Pesiar (SVG orisinal, data di ./map): <BaliBase> = laut bergaris kedalaman, pulau Bali + Nusa
// Penida, dataran tinggi, sawah berarsir, kontur Gunung Batur/Agung/Batukaru, danau, sungai, jalan, landasan bandara,
// nama kota & tempat; <RouteLayer> = rute contoh (garis putus "rencana" + garis aksen "sudah dilalui" per ruas), pin
// perhentian + nama, dan penanda mobil. Film bergerak memakai keduanya sebagai dua SVG bertumpuk di dalam satu lapisan
// kamera (./Film.tsx); poster diam memakai <PosterMap> (satu SVG, seluruh rute tergambar). Semua aria-hidden: isi film
// ada di daftar perhentian (<ol>). ± 100 elemen SVG.
import { useId, type Ref } from 'react';
import { CarMarker } from './vehicles';
import { COAST_D, HIGHLAND_D, ISLETS_D, LAKES_D, MAP_H, MAP_W, MARKS, PLANE_D, POSTER_BOX, RINGS, RIVERS_D, ROADS, ROUTE_LEGS, RUNWAY, STOP_LABELS, STOP_POINTS, TERRACES_D, TOWNS } from './map';

const SAND = '#F5EFE6';
const LAND = '#22463B';
const HIGH = '#2A5246';
const LAKE = '#10251F';
const DEEP = '#17332B';

/** Lapisan dasar peta (tanpa <svg> pembungkus). `hatchId` = id pola arsir sawah (unik per SVG). */
function BaseShapes({ hatchId }: { hatchId: string }) {
  return (
    <>
      <defs>
        <pattern id={hatchId} width="22" height="12" patternUnits="userSpaceOnUse">
          <path d="M0 8Q5.5 3 11 8T22 8" fill="none" stroke={SAND} strokeOpacity="0.17" strokeWidth="1.4" />
        </pattern>
      </defs>
      {/* Garis kedalaman laut: pantai digambar ulang dengan garis tebal tembus pandang */}
      {[64, 40, 18].map((w, i) => (
        <path key={w} d={COAST_D} fill="none" stroke={SAND} strokeOpacity={[0.03, 0.045, 0.07][i]} strokeWidth={w} strokeLinejoin="round" />
      ))}
      <path d={COAST_D} fill={LAND} stroke={SAND} strokeOpacity="0.42" strokeWidth="2" />
      {ISLETS_D.map((d) => (
        <path key={d.slice(0, 16)} d={d} fill={LAND} stroke={SAND} strokeOpacity="0.42" strokeWidth="2" />
      ))}
      <path d={HIGHLAND_D} fill={HIGH} fillOpacity="0.7" />
      {TERRACES_D.map((d) => (
        <path key={d.slice(0, 16)} d={d} fill={`url(#${hatchId})`} />
      ))}
      {RINGS.map((r) => (
        <path key={r.d.slice(0, 18)} d={r.d} fill="none" stroke={SAND} strokeOpacity="0.17" strokeWidth={r.w} />
      ))}
      {LAKES_D.map((d) => (
        <path key={d.slice(0, 16)} d={d} fill={LAKE} stroke={SAND} strokeOpacity="0.36" strokeWidth="1.6" />
      ))}
      {RIVERS_D.map((d) => (
        <path key={d.slice(0, 16)} d={d} fill="none" stroke="#7FB0A4" strokeOpacity="0.45" strokeWidth="2" strokeLinecap="round" />
      ))}
      {ROADS.map((r) => (
        <path key={r.d.slice(0, 18)} d={r.d} fill="none" stroke={SAND} strokeOpacity={r.tier === 1 ? 0.3 : 0.2} strokeWidth={r.tier === 1 ? 2.6 : 1.8} strokeLinecap="round" />
      ))}
      {/* Bandara: landasan tipis + pesawat kecil tampak atas + nama */}
      <line x1={RUNWAY[0]} y1={RUNWAY[1]} x2={RUNWAY[2]} y2={RUNWAY[3]} stroke={SAND} strokeOpacity="0.32" strokeWidth="5" strokeLinecap="round" />
      <path d={PLANE_D} transform={`translate(${(RUNWAY[0] + RUNWAY[2]) / 2} ${RUNWAY[1] - 20})`} fill={SAND} fillOpacity="0.78" />
      <text x={RUNWAY[2] + 14} y={RUNWAY[1] - 12} className="ps-map-town" fill={SAND} fillOpacity="0.72">
        BANDARA
      </text>
      {TOWNS.map((t) => (
        <g key={t.name} className={t.minor ? 'ps-map-minor' : undefined}>
          <circle cx={t.x} cy={t.y} r="4" fill={SAND} fillOpacity="0.7" />
          <text x={t.x + t.dx} y={t.y + t.dy} textAnchor={t.anchor} className="ps-map-town" fill={SAND} fillOpacity="0.72">
            {t.name.toUpperCase()}
          </text>
        </g>
      ))}
      {MARKS.map((t) => (
        <text key={t.name} x={t.x + t.dx} y={t.y + t.dy} textAnchor={t.anchor} className="ps-map-mark" fill={SAND} fillOpacity="0.64">
          {t.name}
        </text>
      ))}
    </>
  );
}

/** Peta dasar sebagai SVG sendiri (lapisan bawah kamera film). */
export function BaliBase({ className = '' }: { className?: string }) {
  const hatch = `${useId().replace(/:/g, '')}-hatch`;
  return (
    <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} preserveAspectRatio="none" className={className} aria-hidden focusable="false">
      <BaseShapes hatchId={hatch} />
    </svg>
  );
}

export type PinState = 'next' | 'visited' | 'active';

/**
 * Pin perhentian + nama untuk rute `legs` ruas (pin 0 … legs; rute 5 ruas kembali ke pin 0, jadi Seminyak 0 & 5 satu
 * pin). `names[i]` = nama perhentian i ("" → tanpa label).
 */
function Pins({ names, legs, state }: { names: readonly string[]; legs: number; state: (i: number) => PinState }) {
  const loop = legs >= ROUTE_LEGS.length;
  return (
    <>
      {STOP_POINTS.slice(0, Math.min(5, legs + 1)).map(([x, y], i) => {
        // Pin Seminyak juga mewakili perhentian terakhir (kembali ke hotel) bila rute utuh
        const s = i === 0 && loop && state(5) === 'active' ? 'active' : state(i);
        const label = STOP_LABELS[i];
        return (
          <g key={i} className="ps-pin" data-state={s} transform={`translate(${x} ${y})`}>
            <circle className="ps-pin-ring" r="22" fill="none" strokeWidth="2" />
            <circle className="ps-pin-dot" r="10.5" strokeWidth="3" />
            {names[i] && (
              <text x={label.dx} y={label.dy} textAnchor={label.anchor} className="ps-map-stop">
                {names[i]}
              </text>
            )}
          </g>
        );
      })}
    </>
  );
}

/** Garis rute (`legs` ruas pertama): putus-putus pasir (rencana) di bawah, garis aksen terang per ruas di atas (pathLength 1). */
function RouteLines({ legs, legRef, drawn }: { legs: number; legRef?: (i: number) => Ref<SVGPathElement>; drawn: boolean }) {
  const used = ROUTE_LEGS.slice(0, legs);
  return (
    <>
      {used.map((leg) => (
        <path key={`plan-${leg.d.slice(0, 14)}`} d={leg.d} fill="none" stroke={SAND} strokeOpacity="0.55" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" />
      ))}
      {used.map((leg, i) => (
        <path
          key={`trip-${leg.d.slice(0, 14)}`}
          ref={legRef?.(i)}
          d={leg.d}
          pathLength={1}
          fill="none"
          className="ps-leg stroke-(--ps-bright)"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="1 1"
          strokeDashoffset={drawn ? 0 : 1}
          visibility={drawn ? undefined : 'hidden'}
        />
      ))}
    </>
  );
}

/**
 * Lapisan rute untuk film bergerak (SVG sendiri, di atas peta dasar, satu sistem koordinat). Posisi mobil & panjang
 * garis ditulis ./Film.tsx langsung ke DOM lewat `legRef`/`markerRef` (bukan state React per frame).
 */
export function RouteLayer({
  names,
  legs,
  state,
  legRef,
  markerRef,
  className = '',
}: {
  names: readonly string[];
  /** Jumlah ruas yang dipakai (= perhentian − 1, maks. 5) */
  legs: number;
  state: (i: number) => PinState;
  legRef: (i: number) => Ref<SVGPathElement>;
  markerRef: Ref<SVGGElement>;
  className?: string;
}) {
  const [x, y] = STOP_POINTS[0];
  return (
    <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} preserveAspectRatio="none" className={className} aria-hidden focusable="false">
      <RouteLines legs={legs} legRef={legRef} drawn={false} />
      <Pins names={names} legs={legs} state={state} />
      <g ref={markerRef} transform={`translate(${x} ${y}) rotate(-25)`}>
        <CarMarker />
      </g>
    </svg>
  );
}

/** Poster diam (gerak mati): peta dipotong ke sekitar rute, seluruh rute (`legs` ruas) tergambar, semua pin, mobil di Seminyak. */
export function PosterMap({ names, legs, className = '' }: { names: readonly string[]; legs: number; className?: string }) {
  const hatch = `${useId().replace(/:/g, '')}-hatch`;
  const [x, y] = STOP_POINTS[0];
  return (
    <svg
      viewBox={`${POSTER_BOX.x} ${POSTER_BOX.y} ${POSTER_BOX.w} ${POSTER_BOX.h}`}
      className={`ps-poster block h-auto w-full ${className}`}
      style={{ background: DEEP }}
      aria-hidden
      focusable="false"
    >
      <BaseShapes hatchId={hatch} />
      <RouteLines legs={legs} drawn />
      <Pins names={names} legs={legs} state={() => 'visited'} />
      <g transform={`translate(${x} ${y}) rotate(-25)`}>
        <CarMarker />
      </g>
    </svg>
  );
}
