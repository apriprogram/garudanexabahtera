// Panggung film Nusaline (SVG asli, dekoratif, aria-hidden): satu malam di jalan, dari Jakarta sampai Surabaya. Lapisan
// dari belakang ke depan, semuanya digerakkan CSS dari variabel --p (progres gulir) dan turunannya --nl-d (jarak tempuh,
// berhenti saat naik/istirahat/tiba) di ./nusaline.css:
//   1. langit: pita gradien 400% (malam → subuh → matahari terbit) yang bergeser naik;
//   2. benda langit: bintang (memudar setelah p 0,7), bulan tenggelam, cahaya matahari naik;
//   3. jauh: pegunungan, siluet kota asal (keluar di awal), kota singgah (Semarang, lewat tengah malam: babak tengah
//      film punya peristiwa sendiri) dan kota tujuan (masuk di akhir);
//   4. tengah: bukit, sawah bertingkat, pohon kelapa, lampu desa;
//   5. dekat: jalan, marka, pagar, lampu jalan, terminal asal, rest area bermusala, terminal tujuan;
//   6. bus tidur potongan samping (./vehicles) di tengah panggung.
// Ukuran semua lapisan memakai satuan bus (--nl-u) di wadah container query `.nl-scene`, jadi proporsinya sama di
// desktop dan HP. ± 80 elemen SVG; hanya transform/opacity yang berubah.
import { useId } from 'react';
import { MOUNTAINS, NEAR_TRAVEL, REST_AREA, TERMINAL, circle, midland, roadside, skyline, stars } from './paths';
import { SleeperBus } from './vehicles';

const STARS = stars();
const CITY_A = skyline(300, 1300, 11);
/** Kota singgah lebar (−200…1800): saat lewat, lampunya terlihat di KIRI dan KANAN bus, tidak tertutup bodi bus */
const CITY_M = skyline(-200, 1800, 37);
const CITY_B = skyline(380, 1240, 23);
const MID = midland();
const ROAD = roadside();
const CRATERS = `${circle(890, 132, 6)}${circle(912, 152, 4)}${circle(898, 160, 3)}`;

export function FilmScene({ restX }: { restX: number | null }) {
  const id = useId().replace(/:/g, '');
  return (
    <div className="nl-scene" aria-hidden="true">
      <div className="nl-sky" />
      <svg aria-hidden="true" className="nl-celestial" viewBox="0 0 1600 760" preserveAspectRatio="xMidYMid slice" focusable="false">
        <defs>
          <radialGradient id={`${id}-sun`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#FFE3A3" stopOpacity="0.95" />
            <stop offset="0.35" stopColor="#FFB27A" stopOpacity="0.55" />
            <stop offset="1" stopColor="#FF8A7A" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle className="nl-sun" cx="760" cy="560" r="340" fill={`url(#${id}-sun)`} />
        <g className="nl-stars">
          <path d={STARS.small} fill="#FFFFFF" opacity="0.65" />
          <path d={STARS.bright} fill="#FFFFFF" />
        </g>
        <g className="nl-moon">
          <circle cx="900" cy="140" r="30" fill="#F2EEDF" />
          <path d={CRATERS} fill="#D8D2BD" />
        </g>
      </svg>
      <svg aria-hidden="true" className="nl-far" viewBox="0 0 1600 260" preserveAspectRatio="xMidYMax slice" focusable="false">
        <g className="nl-mountains">
          <path d={MOUNTAINS.back} fill="#161D4A" />
          <path d={MOUNTAINS.front} fill="#10173C" />
        </g>
        <g className="nl-city-a">
          <path d={CITY_A.blocks} fill="#0D1332" />
          <path d={CITY_A.windows} fill="#FFD27A" opacity="0.75" />
        </g>
        <g className="nl-city-m">
          <path d={CITY_M.blocks} fill="#0F1536" />
          <path d={CITY_M.windows} fill="#FFD9A0" opacity="0.65" />
        </g>
        <g className="nl-city-b">
          <path d={CITY_B.blocks} fill="#111737" />
          <path d={CITY_B.windows} fill="#FFE2A6" opacity="0.6" />
        </g>
      </svg>
      <svg aria-hidden="true" className="nl-mid" viewBox="-1400 0 5200 200" preserveAspectRatio="xMinYMax meet" focusable="false">
        <path d={MID.hills} fill="#131B45" />
        <path d={MID.hillsNear} fill="#0E1537" />
        <path d={MID.terraces} fill="none" stroke="#28336E" strokeWidth="2" />
        <path d={MID.palms} fill="#0A0F29" />
        <path d={MID.lights} fill="#FFC870" />
      </svg>
      <div className="nl-ground" />
      <svg aria-hidden="true" className="nl-near" viewBox="-1400 0 10800 380" preserveAspectRatio="xMinYMax meet" focusable="false">
        <path d="M-1400 300H9400V380H-1400Z" fill="#141A35" />
        <path d={ROAD.pools} fill="#FFE7B0" opacity="0.12" />
        <path d={ROAD.dashes} fill="#E6E9F6" opacity="0.5" />
        {/* Terminal asal (bus menunggu di sini saat naik) */}
        <g>
          <path d={TERMINAL.wall} fill="#1A2050" />
          <path d={TERMINAL.windows} fill="#FFD9A0" opacity="0.8" />
          <path d={`${TERMINAL.roof}${TERMINAL.posts}`} fill="#2A3166" />
          <path d={TERMINAL.sign} fill="var(--nl-neon)" />
          <path d={TERMINAL.icon} fill="#0B1026" opacity="0.82" />
        </g>
        {restX !== null && (
          <g transform={`translate(${restX} 0)`}>
            <path d={`${REST_AREA.canopy}${REST_AREA.posts}${REST_AREA.mosque}`} fill="#222A5C" />
            <path d={REST_AREA.windows} fill="#FFD08A" opacity="0.85" />
            <path d={REST_AREA.sign} fill="var(--nl-neon)" />
            <path d={REST_AREA.icon} fill="#0B1026" opacity="0.82" />
          </g>
        )}
        {/* Terminal tujuan */}
        <g transform={`translate(${NEAR_TRAVEL} 0)`}>
          <path d={TERMINAL.wall} fill="#232A5E" />
          <path d={TERMINAL.windows} fill="#FFE6B8" opacity="0.7" />
          <path d={`${TERMINAL.roof}${TERMINAL.posts}`} fill="#323A73" />
          <path d={TERMINAL.sign} fill="var(--nl-neon)" />
          <path d={TERMINAL.icon} fill="#0B1026" opacity="0.82" />
        </g>
        <path d={ROAD.rail} fill="#2B3263" />
        <path d={ROAD.poles} fill="#1E2552" />
        <path d={ROAD.heads} fill="#FFE2A6" />
        <path d="M-1400 376H9400V380H-1400Z" fill="#2B3263" />
      </svg>
      <SleeperBus className="nl-bus" />
    </div>
  );
}
