// Gambar besar Kemudi (SVG orisinal, dekoratif, aria-hidden): <FilmScene> = panggung film "Mobil siap, Anda tinggal
// jalan" (viewBox 1200×700): garis bantu cetak biru, garis tepi MPV yang tergambar (pathLength=1), MPV terisi warna
// tema, kaca, roda berputar, batang pindai, garis kecepatan, bayangan gerak, dan garis + titik keterangan. Semua lapisan
// digerakkan CSS dari var(--p) (./kemudi.css); tanpa gerak = bingkai poster (garis utuh, mobil terisi, semua
// keterangan). ± 75 elemen. Garis ber-pathLength=1 sengaja tanpa vector-effect (lihat `line`). <CityMap> = peta kota abstrak antar-jemput (jalan, jalan lingkar, sungai, taman) dengan
// rute ke zona terpilih yang tergambar sekali dan penanda mobil yang mengikutinya (JS di ./Delivery.tsx).
import type { CSSProperties, RefObject } from 'react';
import { FILM_CALLOUTS, FILM_CAR, FILM_GUIDES, FILM_H, FILM_SPEED_LINES, FILM_W, MAP_ART, MAP_H, MAP_W, calloutPath } from './geometry';
import { calloutWindows } from './model';

/**
 * Garis cetak biru: pathLength=1 (garis tergambar lewat stroke-dashoffset 1 → 0) TANPA vector-effect non-scaling-stroke —
 * kombinasi keduanya membuat Chrome memotong garis di gambar yang lebih lebar dari 1200px (layar ≥ ± 1950px). Tebal
 * garis dalam satuan gambar (`--sw`, dikalikan `--km-sw` per lebar layar di ./kemudi.css) agar tetap ± 2px di HP sampai 4K.
 */
const line = (width: number, a: number, d: number) => ({ strokeWidth: width, style: { '--a': a, '--d': d, '--sw': width } as CSSProperties });

const BP = 'km-draw km-w fill-none';

/** Panggung film: `callouts` = jumlah keterangan yang dirender (0–4). */
export function FilmScene({ callouts }: { callouts: number }) {
  const car = FILM_CAR;
  const windows = calloutWindows(Math.min(callouts, FILM_CALLOUTS.length));
  const details = [...car.seams, ...car.handles, car.mirror, car.head, car.tail];
  return (
    <svg viewBox={`0 0 ${FILM_W} ${FILM_H}`} className="km-scene absolute inset-0 h-full w-full overflow-visible" aria-hidden="true" focusable="false">
      {/* Garis bantu cetak biru */}
      <g className="km-guides">
        <path d={FILM_GUIDES.ground} pathLength={1} className={`${BP} stroke-white/30`} {...line(2.1, -0.2, 0.1)} />
        <path d={FILM_GUIDES.axleLine} pathLength={1} className={`${BP} stroke-white/[0.14]`} {...line(2.1, -0.2, 0.1)} />
        <path d={FILM_GUIDES.axles} pathLength={1} className={`${BP} stroke-white/[0.14]`} {...line(2.1, -0.2, 0.1)} />
        <path d={FILM_GUIDES.length} pathLength={1} className={`${BP} stroke-white/30`} {...line(2.1, 0.19, 0.1)} />
        <path d={FILM_GUIDES.height} pathLength={1} className={`${BP} stroke-white/30`} {...line(2.1, 0.21, 0.09)} />
      </g>

      {/* Sketsa titik-titik (hanya di awal film): pena menelusurinya saat garis tepi tergambar */}
      <path d={car.body} className="km-sketch fill-none stroke-white/25" strokeWidth={1.4} strokeDasharray="2 7" strokeLinecap="round" vectorEffect="non-scaling-stroke" />

      {/* Garis tepi MPV (tetap tinggal di "kertas" saat mobil berangkat) */}
      <g className="km-bp" strokeLinejoin="round" strokeLinecap="round">
        <path d={car.body} pathLength={1} className={`${BP} stroke-(--km-bright)`} {...line(3.1, 0.05, 0.17)} />
        {car.wheels.map((w, i) => (
          <g key={w.cx}>
            <circle cx={w.cx} cy={w.cy} r={w.r} pathLength={1} className={`${BP} stroke-(--km-bright)`} {...line(2.3, 0.08 + i * 0.02, 0.15)} />
            <circle cx={w.cx} cy={w.cy} r={Math.round(w.r * 64) / 100} pathLength={1} className={`${BP} stroke-white/40`} {...line(1.7, 0.12 + i * 0.02, 0.13)} />
          </g>
        ))}
        {car.glass.map((d, i) => (
          <path key={d} d={d} pathLength={1} className={`${BP} stroke-white/45`} {...line(2, 0.11 + i * 0.025, 0.1)} />
        ))}
        {details.map((d, i) => (
          <path key={d} d={d} pathLength={1} className={`${BP} stroke-white/35`} {...line(1.7, Math.min(0.2, 0.15 + i * 0.006), 0.1)} />
        ))}
      </g>

      {/* Mobil (bergerak ke kanan di babak terakhir) */}
      <g className="km-car">
        <g className="km-speed" strokeLinecap="round">
          {FILM_SPEED_LINES.map(([x, y, len]) => (
            <path key={y} d={`M${x} ${y} L${x + len} ${y}`} className="fill-none stroke-(--km-bright)" strokeWidth={4} />
          ))}
        </g>
        <path d={car.body} transform="translate(-110 0)" className="km-ghost fill-(--tpl-accent)" style={{ '--g': 0.16 } as CSSProperties} />
        <path d={car.body} transform="translate(-220 0)" className="km-ghost fill-(--tpl-accent)" style={{ '--g': 0.07 } as CSSProperties} />
        <g className="km-fill">
          {car.wheels.map((w) => (
            <path key={`well-${w.cx}`} d={w.well} className="fill-[#0B0F14]" />
          ))}
          <path d={car.body} className="fill-(--tpl-accent)" />
          <path d={car.lower} className="fill-(--km-body-lo)" />
          <path d={car.hi} className="fill-(--km-body-hi)" />
          {car.trims.map((d) => (
            <path key={d} d={d} className="fill-[#262D37]" />
          ))}
          {car.seams.map((d) => (
            <path key={d} d={d} className="fill-none stroke-[#0D1117]/30" strokeWidth={3} strokeLinecap="round" />
          ))}
          {car.handles.map((d) => (
            <path key={d} d={d} className="fill-[#0D1117]/35" />
          ))}
          <path d={car.mirror} className="fill-(--km-body-lo)" />
          <path d={car.head} className="fill-[#EEF3FA]" />
          <path d={car.tail} className="fill-[#E5484D]" />
        </g>
        <g className="km-glass">
          {car.glass.map((d) => (
            <path key={d} d={d} className="fill-[#17202B]" />
          ))}
        </g>
        {car.wheels.map((w) => (
          <g key={`wheel-${w.cx}`} className="km-wheel">
            <circle cx={w.cx} cy={w.cy} r={w.r} className="fill-[#10141A]" />
            <g className="km-spin">
              <circle cx={w.cx} cy={w.cy} r={Math.round(w.r * 64) / 100} className="fill-[#CBD3DD]" />
              <path d={w.spokes} className="fill-[#2A313B]" />
              <circle cx={w.cx} cy={w.cy} r={Math.round(w.r * 16) / 100} className="fill-[#8792A2]" />
            </g>
          </g>
        ))}
      </g>

      {/* Batang pindai babak "Cek" */}
      <g className="km-scan">
        <rect x={-36} y={40} width={72} height={560} className="fill-(--km-bright)" opacity={0.12} />
        <rect x={-12} y={40} width={24} height={560} className="fill-(--km-bright)" opacity={0.22} />
        <rect x={-1.5} y={40} width={3} height={560} className="fill-white" opacity={0.9} />
      </g>

      {/* Garis & titik keterangan */}
      {windows.map(([a, b], i) => {
        const c = FILM_CALLOUTS[i];
        return (
          <g key={i} className="km-co km-w" style={{ '--a': a, '--d': b - a } as CSSProperties}>
            <path d={calloutPath(c)} pathLength={1} className="km-co-line fill-none stroke-white/60" strokeWidth={2} style={{ '--sw': 2 } as CSSProperties} />
            <circle cx={c.anchor[0]} cy={c.anchor[1]} r={9} className="km-co-dot fill-(--km-bright)" />
            <circle cx={c.anchor[0]} cy={c.anchor[1]} r={3.5} className="km-co-dot fill-white" />
          </g>
        );
      })}
    </svg>
  );
}

/** Peta kota abstrak (bukan peta asli): jalan, jalan lingkar, sungai, taman, dan rute garasi → zona `route`. */
export function CityMap({ route, routeKey, routeRef, markerRef }: { route: string; routeKey: string; routeRef: RefObject<SVGPathElement | null>; markerRef: RefObject<SVGGElement | null> }) {
  return (
    <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="absolute inset-0 h-full w-full" aria-hidden="true" focusable="false">
      <rect width={MAP_W} height={MAP_H} className="fill-[#E9EDF2]" />
      {MAP_ART.parks.map(([x, y, w, h]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} rx={10} className="fill-[#D7E8DC]" />
      ))}
      <path d={MAP_ART.river} className="fill-none stroke-[#CFE0F4]" strokeWidth={26} strokeLinecap="round" />
      <path d={MAP_ART.streets.join(' ')} className="fill-none stroke-white" strokeWidth={9} />
      <path d={MAP_ART.ring} className="fill-none stroke-[#D5DBE3]" strokeWidth={17} />
      <path d={MAP_ART.ring} className="fill-none stroke-white" strokeWidth={12} />
      {route && (
        <path key={routeKey} ref={routeRef} d={route} pathLength={1} className="km-route fill-none stroke-(--tpl-accent)" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      )}
      <g ref={markerRef} className="km-marker">
        <rect x={-12} y={-7} width={24} height={14} rx={4} className="fill-(--tpl-accent) stroke-white" strokeWidth={2} />
        <rect x={2} y={-4.5} width={6} height={9} rx={1.5} className="fill-[#17202B]" />
        <rect x={-9} y={-4} width={4} height={8} rx={1.2} className="fill-[#17202B]" />
      </g>
    </svg>
  );
}
