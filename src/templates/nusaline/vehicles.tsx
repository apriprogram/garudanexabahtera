// Kendaraan & denah Nusaline (SVG asli, digambar di kode — bukan foto, bukan merek/tipe nyata, tanpa pelat/tulisan):
// - <SleeperBus>: bus tidur potongan samping (livery warna tema + garis neon), dua tingkat kabin berisi penumpang
//   tidur, sopir, lampu depan + sorotnya, tiga roda yang berputar mengikuti --nl-d (film). ± 40 elemen.
// - <SeatMap>: denah tampak atas satu dek: sopir, pintu, toilet, lorong, dan kursi/kabin yang dibuat dari konfigurasi
//   kelas (./model seatGeometry). Mendatar (depan di kanan) di layar lebar; TEGAK (depan di atas, seperti denah kursi
//   di aplikasi tiket) di HP agar kursinya cukup besar. Kursi muncul berurutan saat tab kelas berganti (./nusaline.css).
// Semua dekoratif (aria-hidden); arti denah dibacakan lewat teks di sebelahnya.
import { useId, type CSSProperties } from 'react';
import { DECK, type DeckGeometry } from './model';
import { BERTH, BUS, DECK_SHAPES, busPods, seatPath, wheelSpokes } from './paths';

const PODS = busPods();
const SPOKES = BUS.wheels.map((x) => wheelSpokes(x, BUS.wheelY));

/** Bus tidur potongan samping. `className` mengatur ukuran/posisi (lapisan film). */
export function SleeperBus({ className = '' }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox={BUS.viewBox} className={className} aria-hidden="true" focusable="false" overflow="visible">
      <defs>
        <linearGradient id={`${id}-beam`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#FFF4D8" stopOpacity="0.5" />
          <stop offset="1" stopColor="#FFF4D8" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path className="nl-beam" d={BUS.beam} fill={`url(#${id}-beam)`} />
      <path d={BUS.body} fill="var(--tpl-accent)" />
      <path d={BUS.skirt} fill="var(--nl-livery-dark)" />
      <path d={BUS.stripe} fill="var(--nl-neon)" />
      <path d={BUS.markers} fill="#FFB648" />
      {/* Kabin terpotong: dasar biru redup + lapisan lampu amber (opasitas mengikuti progres film) */}
      <path d={BUS.cut} fill="#1E2A63" />
      <path className="nl-cabin-warm" d={BUS.cut} fill="#FFB45E" />
      <path d={PODS.cones} fill="#FFD27A" opacity="0.16" />
      <path d={BUS.deck} fill="#0B1026" opacity="0.6" />
      <path d={PODS.frames} fill="#FFFFFF" fillOpacity="0.06" stroke="#FFFFFF" strokeOpacity="0.3" strokeWidth="1.5" />
      <path d={PODS.mattress} fill="#FFFFFF" opacity="0.2" />
      <path d={PODS.blankets} fill="var(--nl-neon)" opacity="0.88" />
      <path d={PODS.pillows} fill="#EEF1FA" />
      <path d={PODS.heads} fill="#D9DEF2" />
      <path d={PODS.lamps} fill="#FFD27A" />
      <path d={BUS.cut} fill="none" stroke="var(--nl-neon)" strokeOpacity="0.55" strokeWidth="2" />
      {/* Kabin sopir */}
      <path d={BUS.window} fill="#131B47" />
      <path d={BUS.glare} fill="#FFFFFF" opacity="0.08" />
      <path d={BUS.windshield} fill="#131B47" />
      <path d={BUS.driver} fill="#070A18" opacity="0.9" />
      <path d={BUS.mirror} fill="#0B1026" />
      <path d={BUS.headlight} fill="#FFF3D6" />
      <path d={BUS.tail} fill="#FF4D6D" />
      <path d={BUS.wells} fill="#070A18" />
      {BUS.wheels.map((x, i) => (
        <g key={x}>
          <circle cx={x} cy={BUS.wheelY} r="37" fill="#090B16" />
          <g className="nl-wheel">
            <circle cx={x} cy={BUS.wheelY} r="22" fill="#BFC6DB" />
            <path d={SPOKES[i]} fill="#59617D" />
            <circle cx={x + 14} cy={BUS.wheelY} r="2.4" fill="#59617D" />
          </g>
          <circle cx={x} cy={BUS.wheelY} r="5.5" fill="#3A4160" />
        </g>
      ))}
    </svg>
  );
}

/**
 * Ilustrasi kabin tidur (potongan dua tingkat, dilihat dari lorong): jendela malam dengan jejak lampu, kasur, bantal,
 * penumpang tidur telentang di bawah selimut warna tema (bahu, lengan di atas selimut, lipatan), lampu baca menyala
 * dengan pendar di kabin atas, tirai setengah tertutup di kabin bawah, port USB. Pengganti foto kelas kabin tidur bila PO
 * belum mengunggah foto (foto pembeli menggantikannya). Dekoratif (aria-hidden). `meet`: dua kabin selalu utuh, sisa
 * kotak berwarna sama dengan latar.
 */
export function BerthIllustration({ className = '' }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 600 400" preserveAspectRatio="xMidYMid meet" className={className} aria-hidden="true" focusable="false">
      <defs>
        {/* Sorot lampu baca: terang di dekat lampu, memudar ke kasur */}
        <linearGradient id={`${id}-cone`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#FFD27A" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FFD27A" stopOpacity="0.06" />
        </linearGradient>
      </defs>
      <path d="M0 0H600V400H0Z" fill="#0B1026" />
      {/* Bingkai dua kabin + rel tirai */}
      <path d={`${BERTH.upper}${BERTH.lower}`} fill="#FFFFFF" fillOpacity="0.05" stroke="#FFFFFF" strokeOpacity="0.22" strokeWidth="2" />
      <path d={BERTH.windows} fill="#16205A" />
      <path d={BERTH.stars} fill="#FFFFFF" opacity="0.7" />
      <path d={BERTH.trails} fill="var(--nl-neon)" opacity="0.75" />
      <path d={BERTH.trailsWarm} fill="#FFD27A" opacity="0.6" />
      {/* Lampu baca menyala (atas, sorot + pendar hangat) dan mati (bawah) */}
      <path d={BERTH.cone} fill={`url(#${id}-cone)`} />
      <path d={BERTH.glow} fill="#FFD27A" opacity="0.35" />
      <path d={BERTH.lampOn} fill="#FFD27A" />
      <path d={BERTH.lampOff} fill="#FFD27A" opacity="0.3" />
      <path d={BERTH.mattress} fill="#FFFFFF" opacity="0.18" />
      <path d={BERTH.pillows} fill="#EEF1FA" />
      <path d={BERTH.head} fill="#D9DEF2" />
      <path d={BERTH.blanket} fill="var(--nl-neon)" opacity="0.9" />
      <path d={BERTH.blanketFolds} fill="#0B1026" opacity="0.28" />
      <path d={BERTH.arm} fill="#C9CFE8" />
      <path d={BERTH.folded} fill="var(--nl-neon)" opacity="0.85" />
      <path d={BERTH.fold} fill="#0B1026" opacity="0.28" />
      <path d={BERTH.ports} fill="#FFFFFF" opacity="0.45" />
      <path d={BERTH.rods} fill="#FFFFFF" opacity="0.25" />
      <path d={BERTH.curtain} fill="var(--tpl-accent)" opacity="0.7" />
      <path d={BERTH.curtainFolds} fill="#0B1026" opacity="0.22" />
    </svg>
  );
}

/**
 * Denah satu dek. `upper` = dek atas (tangga di depan, tanpa sopir/pintu/toilet). `pop` = kursi muncul berurutan.
 * `vertical` = tegak, depan di ATAS: gambar mendatar yang sama diputar −90° (sisi kiri kendaraan + pintu tetap di kiri
 * layar, sopir di kanan depan); label "WC" ditulis di luar putaran agar tetap tegak. `className` mengatur tampil/lebar.
 */
export function SeatMap({
  deck,
  pods,
  pop,
  step,
  upper = false,
  vertical = false,
  className = '',
}: {
  deck: DeckGeometry;
  pods: boolean;
  pop: boolean;
  step: number;
  upper?: boolean;
  vertical?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox={vertical ? `0 0 ${DECK.h} ${DECK.w}` : `0 0 ${DECK.w} ${DECK.h}`}
      className={`h-auto ${className}`}
      aria-hidden="true"
      focusable="false"
      data-orient={vertical ? 'v' : 'h'}
      data-seats={pop ? 'pop' : 'still'}
      style={{ '--nl-step': `${step}ms` } as CSSProperties}
    >
      <g transform={vertical ? `rotate(-90) translate(-${DECK.w} 0)` : undefined}>
        <path d={DECK_SHAPES.outline} fill="#FFFFFF" stroke="#0E1230" strokeOpacity="0.22" strokeWidth="2" />
        <path d={DECK_SHAPES.windshield} fill="none" stroke="#0E1230" strokeOpacity="0.28" strokeWidth="4" strokeLinecap="round" />
        <path d={DECK_SHAPES.aisle} fill="none" stroke="#0E1230" strokeOpacity="0.2" strokeWidth="2" strokeDasharray="8 8" />
        {upper ? (
          <path d={DECK_SHAPES.stairs} fill="#0E1230" fillOpacity="0.06" stroke="#0E1230" strokeOpacity="0.32" strokeWidth="2" />
        ) : (
          <>
            <path d={DECK_SHAPES.door} fill="var(--nl-ink)" />
            <path d={DECK_SHAPES.driver} fill="#0E1230" fillOpacity="0.08" stroke="#0E1230" strokeOpacity="0.3" strokeWidth="2" />
            <path d={DECK_SHAPES.wheel} fill="none" stroke="#0E1230" strokeOpacity="0.55" strokeWidth="3" />
            <path d={DECK_SHAPES.toilet} fill="#0E1230" fillOpacity="0.06" stroke="#0E1230" strokeOpacity="0.28" strokeWidth="2" />
          </>
        )}
        {deck.seats.map((s, i) => (
          <path
            key={`${s.x}-${s.y}`}
            className="nl-seat"
            style={{ '--i': i } as CSSProperties}
            d={seatPath(s.x, s.y, s.w, s.h, pods)}
            fill="var(--tpl-accent-100)"
            stroke="var(--nl-ink)"
            strokeOpacity="0.55"
            strokeWidth="1.5"
          />
        ))}
      </g>
      {/* Toilet: pusat (59, 189) di gambar mendatar → (189, 841) setelah diputar */}
      {!upper && (
        <text
          x={vertical ? 189 : 59}
          y={vertical ? 847 : 196}
          textAnchor="middle"
          fontSize="18"
          fontWeight="600"
          fill="#4B5470"
          fontFamily="'JetBrains Mono', ui-monospace, monospace"
        >
          WC
        </text>
      )}
    </svg>
  );
}
