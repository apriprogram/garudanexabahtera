// Grafik SVG Lawatan, digambar sendiri dan ringan (tanpa foto, tanpa merek): bus pariwisata datar tampak samping (badan
// warna tema, pita jendela gelap, garis livery krem, roda berpelek krem dengan satu takik agar putarannya terlihat; tanpa
// tulisan/pelat),
// piktogram titik rute, panorama bukit film, garis rute hero (tergambar sekali lewat hooks useRouteDraw), gambar perangko
// hero, dan cap pos. Semua dekoratif: aria-hidden, warna dari currentColor / variabel tema.
import { useId, useRef } from 'react';
import { useRouteDraw } from './hooks';
import type { StopKey } from './icons';
import { HILLS, STOP_GLYPHS, type HeroRoute } from './paths';

/**
 * Bus dalam koordinat lokal: lebar −22…22, roda menyentuh y = 0 (titik jangkar = tengah bawah), untuk disisipkan ke SVG
 * lain (garis rute hero). Badan = `body` (bawaan --tpl-accent; krem di atas perangko warna tema); jendela tinta; livery &
 * lampu krem; roda tinta dengan pelek krem + takik (putaran terlihat, tidak terbaca sebagai ikon "×"). ≤ 16 elemen.
 */
export function BusShape({ wheelClassName = '', body = 'var(--tpl-accent)' }: { wheelClassName?: string; body?: string }) {
  return (
    <g>
      <path d="M-21 -3.4V-15.2Q-21 -18.4 -17.8 -18.4H14.6Q18.6 -18.4 20.2 -14.8L22 -9.4V-4.6Q22 -3.4 20.8 -3.4Z" fill={body} />
      <path d="M-18.4 -15.6H13.4V-10H-18.4Z" fill="#1D2320" opacity="0.88" />
      <path d="M15.4 -15.6H18.4L20.6 -10H15.4Z" fill="#1D2320" opacity="0.88" />
      <path d="M-21 -7.6H22V-6.2H-21Z" fill="#FBF6EE" opacity="0.9" />
      <path d="M15.6 -9.2H18.6V-3.8H15.6Z" fill="#FBF6EE" opacity="0.35" />
      <path d="M20.6 -6H22V-4.8H20.6Z" fill="#FFE7A3" />
      {[-12.6, 10.4].map((x) => (
        <g key={x} transform={`translate(${x} -3.1)`}>
          <g className={wheelClassName}>
            <circle r="3.1" fill="#1D2320" />
            <circle r="1.5" fill="none" stroke="#FBF6EE" strokeWidth="0.7" />
            <circle r="0.5" fill="#FBF6EE" />
            <path d="M0 -1.5V-2.5" stroke="#FBF6EE" strokeWidth="0.8" strokeLinecap="round" />
          </g>
        </g>
      ))}
    </g>
  );
}

/** Bus mandiri (garis rute film): viewBox −23…23 × −21…1. */
export function BusIcon({ className = 'h-7 w-[58px]', wheelClassName = '' }: { className?: string; wheelClassName?: string }) {
  return (
    <svg viewBox="-23 -21 46 22" className={className} aria-hidden focusable="false">
      <BusShape wheelClassName={wheelClassName} />
    </svg>
  );
}

/** Piktogram titik rute (sekolah, stupa, hotel, kota, candi, pantai, gunung, rumah, pin). */
export function StopGlyph({ kind, className = 'h-6 w-6' }: { kind: StopKey; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden focusable="false">
      {STOP_GLYPHS[kind].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/** Panorama bukit jauh di pita rute film (lapisan paling lambat); direntang mengisi kotaknya (bukit boleh memipih). */
export function Hills({ className = '' }: { className?: string }) {
  return (
    <svg viewBox={`0 0 ${HILLS.box[0]} ${HILLS.box[1]}`} preserveAspectRatio="none" className={className} aria-hidden focusable="false">
      <path d={HILLS.far} fill="#1D2320" opacity="0.05" />
      <path d={HILLS.volcano} fill="#1D2320" opacity="0.06" />
      <path d={HILLS.smoke} fill="none" stroke="#1D2320" strokeOpacity="0.16" strokeWidth="1.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <path d={HILLS.cloud} fill="none" stroke="#1D2320" strokeOpacity="0.14" strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <path d={HILLS.near} fill="var(--tpl-accent)" opacity="0.1" />
    </svg>
  );
}

/**
 * Garis rute titik-titik putih di atas foto hero + pin awal & tujuan + bus kecil. Gerak menyala: garis tergambar sekali
 * dan bus mengikutinya (useRouteDraw); diam: garis utuh, bus di tujuan. `route.fit` 'meet' (layar sangat lebar) = gambar
 * utuh di tengah kotak foto, tidak pernah terpotong di atas/bawah; `route.ink` membesarkan garis, titik, dan pin.
 */
export function HeroRouteArt({ route, motion, className = '' }: { route: HeroRoute; motion: boolean; className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const maskId = `lw-route-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  useRouteDraw(ref, motion, route.park);
  const [w, h] = route.box;
  const k = route.ink ?? 1;
  return (
    <svg ref={ref} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio={`xMidYMid ${route.fit ?? 'slice'}`} className={className} aria-hidden focusable="false">
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={w} height={h}>
          <path data-route-mask d={route.d} pathLength={1} fill="none" stroke="#fff" strokeWidth={16 * k} strokeDasharray="1" strokeDashoffset="0" />
        </mask>
      </defs>
      <path data-route d={route.d} fill="none" stroke="#FFFFFF" strokeOpacity="0.9" strokeWidth={2.8 * k} strokeLinecap="round" strokeDasharray={`0.1 ${11 * k}`} mask={`url(#${maskId})`} />
      <circle cx={route.start[0]} cy={route.start[1]} r={7 * k} fill="#FFFFFF" />
      <circle cx={route.start[0]} cy={route.start[1]} r={3.2 * k} fill="var(--tpl-accent)" />
      <g transform={`translate(${route.end[0]} ${route.end[1]})`}>
        <circle r={11 * k} fill="#FFFFFF" fillOpacity="0.35" />
        <circle r={6.5 * k} fill="#FFFFFF" />
        <circle r={3.4 * k} fill="var(--tpl-accent)" />
      </g>
      <g data-route-bus transform={`translate(${route.parked[0]} ${route.parked[1]})`}>
        <g transform={`scale(${route.bus})`}>
          <BusShape />
        </g>
      </g>
    </svg>
  );
}

/**
 * Gambar di dalam perangko hero (krem di atas warna tema), senada dengan simbol lawatan-mark: bingkai garis dalam khas
 * perangko, rute titik-titik dari kiri yang melengkung ke PIN tujuan di kanan atas, dan bus pariwisata berbadan krem di
 * jalan sebagai pokok gambar. Tanpa gunung & matahari, jadi tidak terbaca sebagai ikon "gambar/foto".
 */
export function StampArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 96" className={className} aria-hidden focusable="false">
      <rect x="5" y="5" width="70" height="86" rx="1.5" fill="none" stroke="#FBF6EE" strokeOpacity="0.55" strokeWidth="1.2" />
      <path d="M15 53C18 38 31 31 45 34" fill="none" stroke="#FBF6EE" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="0.1 6" />
      <circle cx="15" cy="54" r="3" fill="#FBF6EE" />
      <path d="M56 45S47 36.6 47 30.2a9 9 0 0 1 18 0C65 36.6 56 45 56 45Z" fill="#FBF6EE" />
      <circle cx="56" cy="30.2" r="3.4" fill="var(--tpl-accent)" />
      <path d="M10 83.5H70" stroke="#FBF6EE" strokeOpacity="0.5" strokeWidth="1.4" strokeLinecap="round" />
      <g transform="translate(40 82.6) scale(1.12)">
        <BusShape body="#FBF6EE" />
      </g>
    </svg>
  );
}

/** Cap pos: dua lingkaran + garis tanggal + tiga garis bergelombang. Warna dari currentColor. */
export function Postmark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 128 64" fill="none" stroke="currentColor" strokeLinecap="round" className={className} aria-hidden focusable="false">
      <circle cx="32" cy="32" r="27" strokeWidth="2" />
      <circle cx="32" cy="32" r="21" strokeWidth="1.2" />
      <path d="M22 27h20M19 32h26M23 37h18" strokeWidth="1.6" />
      <path d="M64 20q8-6 16 0t16 0 16 0 14 0M64 32q8-6 16 0t16 0 16 0 14 0M64 44q8-6 16 0t16 0 16 0 14 0" strokeWidth="2" />
    </svg>
  );
}

/** Ikon cap pos mini untuk label perangko (14px). */
export function PostmarkDot({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" className={className} aria-hidden focusable="false">
      <circle cx="8" cy="8" r="6.4" strokeWidth="1.3" />
      <circle cx="8" cy="8" r="3.2" strokeWidth="1.1" />
    </svg>
  );
}
