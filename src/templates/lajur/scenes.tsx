// Adegan film Lajur "sehari bersama rombongan" (SVG/HTML asli, ringan, dekoratif & aria-hidden). Semua lapisan
// digerakkan CSS dari dua angka di panggung (./lajur.css): --p = WAKTU 0→1 (langit fajar → siang → senja → malam,
// matahari & bulan di busur elips, bintang, lampu warung & kota), --d = JARAK yang ditempuh (turunan --p berpotongan:
// bus berhenti di rest area dan di gerbang tujuan sementara jam terus berjalan). Lapisan dari belakang: langit ×4,
// bintang, matahari/bulan, awan (HP saja: langit layar tegak tidak kosong; −14cqw·d − 6cqw·p), gunung jauh (−12%·d),
// bukit + pohon + kota di ujung (−40%·d), dunia dekat 4,5× lebar layar
// (−350%·d: tiang listrik berkabel khas jalan antarkota, pagar, marka jalan, halte jemput + rombongan, papan rest area +
// warung, gerbang candi bentar terbelah + rambu parkir bus, warung berlampu + halte pulang), aspal, lalu bus berlivery
// warna tema (roda berputar sesuai jarak; malam hari badan meredup, kabin & sorot lampu menyala). Tanpa teks yang
// terbaca, tanpa merek. ≈ 100 elemen SVG; hanya transform/opacity yang berubah per gulir.
import type { CSSProperties } from 'react';
import { Coach } from './vehicles';

/** Garis punggung (bukit/gunung) halus dari titik-titik [x, y] → path tertutup sampai dasar `base`. */
function ridge(points: [number, number][], base: number): string {
  const [first, ...rest] = points;
  let d = `M${first[0]} ${base}L${first[0]} ${first[1]}`;
  for (let i = 0; i < rest.length; i += 1) {
    const [x, y] = rest[i];
    const [px, py] = i === 0 ? first : rest[i - 1];
    const mx = (px + x) / 2;
    d += `Q${px} ${py} ${mx} ${(py + y) / 2}`;
  }
  const last = rest[rest.length - 1] ?? first;
  return `${d}L${last[0]} ${last[1]}L${last[0]} ${base}Z`;
}

/** Deretan pohon (tajuk bulat di atas batang) sepanjang garis tanah `groundY`, satu path. */
function treeLine(from: number, to: number, step: number, groundY: (x: number) => number): string {
  let d = '';
  for (let i = 0, x = from; x < to; i += 1, x += step + ((i * 37) % 23)) {
    const r = 14 + ((i * 7) % 3) * 6;
    const trunk = 10 + (i % 2) * 6;
    const gy = groundY(x);
    const cy = gy - trunk - r;
    d += `M${x - 2} ${gy}h4v${-trunk - 2}h-4zM${x - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;
    if (i % 3 === 0) d += `M${x + r * 0.4} ${cy - r * 0.6}a${r * 0.7} ${r * 0.7} 0 1 0 ${1.4 * r} 0a${r * 0.7} ${r * 0.7} 0 1 0 ${-1.4 * r} 0z`;
  }
  return d;
}

// Gunung jauh (viewBox 2400×360) dan bukit tengah (viewBox 3200×300): titik punggung tetap (deterministik).
const FAR_BACK: [number, number][] = [
  [0, 230], [180, 170], [320, 200], [520, 96], [700, 190], [860, 150], [1040, 210], [1220, 120], [1420, 60], [1600, 170], [1780, 140], [1980, 200], [2160, 110], [2400, 190],
];
const FAR_FRONT: [number, number][] = [
  [0, 290], [240, 240], [460, 270], [640, 210], [880, 280], [1100, 230], [1320, 290], [1560, 240], [1760, 280], [2000, 220], [2240, 270], [2400, 250],
];
const HILLS: [number, number][] = [
  [0, 190], [260, 150], [520, 186], [780, 132], [1060, 176], [1320, 140], [1580, 190], [1840, 150], [2100, 180], [2360, 160], [2600, 200], [3200, 205],
];
/** Tinggi tanah bukit di x (interpolasi linear titik HILLS, cukup untuk menaruh pohon). */
const hillY = (x: number): number => {
  for (let i = 1; i < HILLS.length; i += 1) {
    const [x1, y1] = HILLS[i];
    const [x0, y0] = HILLS[i - 1];
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0) + 6;
  }
  return 210;
};
const HILLS_PATH = ridge(HILLS, 300) + treeLine(40, 2520, 74, hillY);
/** Kota di ujung kanan bukit (tiba di malam hari): blok gedung, viewBox 560×230. */
const CITY_PATH = [
  [0, 110, 54], [58, 80, 40], [102, 128, 64], [170, 58, 48], [222, 100, 58], [284, 46, 38], [326, 112, 66], [396, 84, 50], [450, 124, 52], [506, 96, 54],
]
  .map(([x, top, w]) => `M${x} 230V${top}h${w}V230z`)
  .join('');

/** Bintang: satu path titik (ujung garis bulat). */
const STARS = Array.from({ length: 34 }, (_, i) => {
  const x = (i * 467) % 1600;
  const y = 18 + ((i * 131) % 300);
  return `M${x} ${y}h0`;
}).join('');

/**
 * Awan datar: pil (x0, x1, atas, bawah) + tonjolan bulat (cx, cy, r) dalam SATU path. Semua sub-path berlawanan arah
 * jarum jam, jadi aturan isi nonzero menggabungkannya (tanpa lubang) dan opasitas berlaku sekali untuk seluruh awan.
 */
function cloudPath(pills: [number, number, number, number][], bumps: [number, number, number][] = []): string {
  let d = '';
  for (const [x0, x1, top, bottom] of pills) {
    const r = (bottom - top) / 2;
    d += `M${x1 - r} ${top}H${x0 + r}a${r} ${r} 0 0 0 0 ${2 * r}H${x1 - r}a${r} ${r} 0 0 0 0 ${-2 * r}z`;
  }
  for (const [cx, cy, r] of bumps) d += `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;
  return d;
}

/**
 * Awan langit HP (layar tegak), satu keluarga kumulus datar: besar di dalam busur matahari, panjang-rendah di kiri atas,
 * kecil di kanan atas. Posisi & tinggi dalam cqw/cqh layar (x, y = kiri-atas; h = tinggi). Lihat .lj-clouds di lajur.css.
 */
const CLOUDS: { viewBox: string; d: string; x: number; y: number; h: number }[] = [
  { viewBox: '0 0 150 54', d: cloudPath([[6, 144, 34, 52]], [[36, 34, 16], [68, 26, 22], [102, 30, 17], [126, 38, 11]]), x: 30, y: 23, h: 11 },
  { viewBox: '0 0 168 30', d: cloudPath([[4, 164, 18, 30]], [[40, 20, 10], [68, 16, 14], [98, 20, 10], [124, 24, 6]]), x: 4, y: 9, h: 5.4 },
  { viewBox: '0 0 90 34', d: cloudPath([[4, 86, 20, 32]], [[30, 20, 12], [54, 16, 14], [72, 23, 8]]), x: 74, y: 5, h: 7 },
];

const actor = (x: number, xPhone: number, at: number): CSSProperties => ({ '--x': x, '--xp': xPhone, '--at': at }) as CSSProperties;

const svgUrl = (body: string) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 220">${body}</svg>`)}")`;
/**
 * Tiang listrik pinggir jalan desa (diulang mendatar oleh CSS, satu tiang tiap 400 unit bus): tiang, palang, dua
 * isolator, dan dua kabel yang melengkung ke tiang berikutnya (parabola tersambung di tepi ubin). Bukan lampu jalan
 * tol: malamnya diterangi jendela kota, lampu warung, dan sorot lampu bus sendiri.
 */
const POLES: CSSProperties = {
  backgroundImage: svgUrl(
    '<path d="M185 41Q385 93 585 41M-215 41Q-15 93 185 41M215 41Q415 87 615 41M-185 41Q15 87 215 41" fill="none" stroke="#2c3138" stroke-width="1.6"/><path d="M197.5 220V33h5v187zM178 44h44v4h-44zM183 38h4v6h-4zM213 38h4v6h-4z" fill="#3d434b"/>',
  ),
};

function Person({ variant }: { variant: 0 | 1 | 2 | 3 }) {
  // viewBox 0 0 24 60: kepala, badan, kaki; variasi tas punggung amber / koper / anak
  const body = variant === 2 ? 'M9 24h6l1 16h-2l-1 14h-2l-1-14H8z' : 'M8 18h8l1.5 20H15l-1 20h-2.5l-.5-17-.5 17H8l-1-20H6.5z';
  const head = variant === 2 ? 'M12 15.5a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2z' : 'M12 15a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z';
  return (
    <svg viewBox="0 0 24 60" className="block h-full w-auto" aria-hidden focusable="false">
      <path d={`${head}${body}`} fill="#15181C" />
      {variant === 1 && <path d="M15.5 21h4a1.5 1.5 0 0 1 1.5 1.5V33h-5.5z" className="fill-(--tpl-accent)" />}
      {variant === 3 && <path d="M17 44h6v14h-6zM19 40h2v4h-2z" fill="#2F4A62" />}
    </svg>
  );
}

function StopSign() {
  return (
    <svg viewBox="0 0 40 120" className="block h-full w-auto" aria-hidden focusable="false">
      <path d="M19 30h2.6v90H19z" fill="#4B525C" />
      <rect x="4" y="2" width="32" height="32" rx="6" className="fill-(--tpl-accent)" />
      <path
        d="M11 10h18q2 0 2 2v12.5H9V12q0-2 2-2zM11.5 12.5h13v5h-13zM26.5 12.5h2.5v6h-2.5zM11.2 26.6a2.3 2.3 0 1 0 4.6 0a2.3 2.3 0 1 0-4.6 0zM24.2 26.6a2.3 2.3 0 1 0 4.6 0a2.3 2.3 0 1 0-4.6 0z"
        fill="#14161A"
        fillRule="evenodd"
      />
    </svg>
  );
}

function RestSign() {
  // Papan hijau rest area dengan ikon pompa BBM, cangkir, dan toilet (tanpa tulisan) di dua tiang + warung beratap belang
  return (
    <svg viewBox="0 0 220 130" className="block h-full w-auto" aria-hidden focusable="false">
      <path d="M22 52h4v78h-4zM96 52h4v78h-4z" fill="#59616B" />
      <rect x="6" y="6" width="110" height="50" rx="6" fill="#1B6B4F" />
      <rect x="10" y="10" width="102" height="42" rx="4" fill="none" stroke="#FFFFFF" strokeOpacity={0.85} strokeWidth={2} />
      {/* pompa BBM · cangkir · toilet */}
      <path
        d="M22 22h12v20H22zM25 25h6v5h-6zM34 26h3l2 3v10a2 2 0 0 1-4 0v-6M52 26h14v6a7 7 0 0 1-14 0zM66 28h3a2.5 2.5 0 0 1 0 5h-3M51 41h16M86 20a3 3 0 1 0 0-.1zM82 26h8l1 9h-2l-1 8h-4l-1-8h-2z"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={2.4}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d="M140 76h70v54h-70z" fill="#E9E2D3" />
      <path d="M134 62h82l-6 14h-70z" fill="#14161A" />
      <path d="M140 76h70v6h-70z" fill="url(#lj-awning)" />
      <path d="M150 92h18v38h-18zM180 92h22v20h-22z" fill="#2C2F35" />
      <defs>
        <pattern id="lj-awning" width="14" height="6" patternUnits="userSpaceOnUse">
          <rect width="7" height="6" className="fill-(--tpl-accent)" />
          <rect x="7" width="7" height="6" fill="#FFFFFF" />
        </pattern>
      </defs>
    </svg>
  );
}

/**
 * Gerbang candi bentar: SATU menara yang dibelah dua — tiap belahan bertepi luar bertingkat dan bermuka dalam tegak
 * (celah 22 unit di tengah), mahkota pendek tiga undak di sisi dalam, tiga pelipit terang, sisi dalam lebih gelap.
 */
const GATE_STEPS: [number, number][] = [
  [6, 150],
  [14, 118],
  [22, 90],
  [30, 64],
  [40, 44],
  [54, 34],
  [64, 26],
  [72, 18],
];
const GATE_INNER = 84;
const mirrorX = (x: number) => 190 - x;
/** Satu belahan (kiri; `flip` = kanan): dari dasar muka dalam, menyusuri undak tepi luar, kembali di puncak. */
const gateHalf = (flip: boolean): string => {
  const x = (n: number) => (flip ? mirrorX(n) : n);
  let d = `M${x(GATE_INNER)} 200H${x(GATE_STEPS[0][0])}`;
  GATE_STEPS.forEach(([sx, top], i) => {
    if (i > 0) d += `H${x(sx)}`;
    d += `V${top}`;
  });
  return `${d}H${x(GATE_INNER)}Z`;
};
/** Pelipit (cornice) di puncak tiga undak bawah, menjorok ke tepi undak di bawahnya. */
const gateMouldings = (flip: boolean): string =>
  GATE_STEPS.slice(0, 3)
    .map(([sx, top]) => (flip ? `M${mirrorX(GATE_INNER)} ${top - 3}H${mirrorX(sx)}V${top}H${mirrorX(GATE_INNER)}Z` : `M${sx} ${top - 3}H${GATE_INNER}V${top}H${sx}Z`))
    .join('');
const GATE_BODY = gateHalf(false) + gateHalf(true);
const GATE_BANDS = gateMouldings(false) + gateMouldings(true);
const GATE_TOP = GATE_STEPS[GATE_STEPS.length - 1][1];

function Gate() {
  return (
    <svg viewBox="0 0 190 200" className="block h-full w-auto" aria-hidden focusable="false">
      <path d={GATE_BODY} fill="#9A4B33" />
      <path d={`M${GATE_INNER - 8} ${GATE_TOP}h8v174h-8zM${mirrorX(GATE_INNER)} ${GATE_TOP}h8v174h-8z`} fill="#6E3122" fillOpacity={0.55} />
      <path d={GATE_BANDS} fill="#B4644A" />
      <path d="M0 192h190v8H0z" fill="#5C2A1D" />
    </svg>
  );
}

/** Warung di tepi jalan dekat titik turun: siluet gelap, bukaan & bohlam yang menyala saat malam (kelas lj-lit). */
function Warung() {
  return (
    <svg viewBox="0 0 120 100" className="block h-full w-auto" aria-hidden focusable="false">
      <path d="M14 32h92v68H14z" fill="#2A2C31" />
      <path d="M6 32h108l-10-15H16z" fill="#17181C" />
      <path d="M24 48h46v26H24zM80 52h16v48H80z" fill="#3B3D44" />
      <g className="lj-lit">
        <circle cx="47" cy="44" r="18" fill="#FFD27A" fillOpacity={0.22} />
        <path d="M24 48h46v26H24zM80 52h16v48H80z" fill="#FFCF7A" fillOpacity={0.9} />
        <circle cx="47" cy="38" r="2.8" fill="#FFF1C7" />
      </g>
    </svg>
  );
}

function ParkingSign() {
  return (
    <svg viewBox="0 0 40 110" className="block h-full w-auto" aria-hidden focusable="false">
      <path d="M18.5 34h3v76h-3z" fill="#59616B" />
      <rect x="4" y="2" width="32" height="34" rx="4" fill="#2457A6" />
      <path d="M14 9h7.5a6 6 0 0 1 0 12H18v8h-4zM18 13v4h3.3a2 2 0 0 0 0-4z" fill="#FFFFFF" fillRule="evenodd" />
    </svg>
  );
}

/** Rombongan (empat orang): `out` = naik ke bus di awal (memudar), selain itu turun di akhir (muncul). */
function Group({ out }: { out: boolean }) {
  const variants: (0 | 1 | 2 | 3)[] = [1, 0, 2, 3];
  return (
    <div className="flex h-full items-end gap-[0.6%]">
      {variants.map((v, i) => (
        <div key={i} className={`lj-person h-full ${out ? 'lj-person-out' : 'lj-person-in'}`} style={{ '--i': i } as CSSProperties}>
          <Person variant={v} />
        </div>
      ))}
    </div>
  );
}

/** Adegan lengkap; ukurannya mengikuti wadah `.lj-screen` (container-type: size). */
export function FilmScene() {
  return (
    <div aria-hidden className="lj-scene absolute inset-0">
      <div className="lj-sky lj-sky-dawn" />
      <div className="lj-sky lj-sky-day" />
      <div className="lj-sky lj-sky-dusk" />
      <div className="lj-sky lj-sky-night" />
      <svg viewBox="0 0 1600 340" preserveAspectRatio="xMidYMin slice" className="lj-stars" focusable="false">
        <path d={STARS} stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" />
      </svg>
      <div className="lj-orb lj-sun">
        <span className="lj-sun-warm" />
      </div>
      <div className="lj-orb lj-moon" />

      {/* HP saja: awan yang ikut warna langit (merah muda fajar & senja, putih siang, hilang malam) */}
      <div className="lj-clouds">
        {CLOUDS.map((c, i) => (
          <svg key={i} viewBox={c.viewBox} className="lj-cloud" style={{ '--cx': c.x, '--cy': c.y, '--ch': c.h } as CSSProperties} focusable="false">
            <path d={c.d} fill="#FFD0BC" className="lj-cloud-warm" />
            <path d={c.d} fill="#FFFFFF" className="lj-cloud-day" />
          </svg>
        ))}
      </div>

      <div className="lj-far">
        <svg viewBox="0 0 2400 360" preserveAspectRatio="xMinYMax slice" className="h-full w-full" focusable="false">
          <path d={ridge(FAR_BACK, 360)} fill="#26304B" fillOpacity={0.42} />
          <path d={ridge(FAR_FRONT, 360)} fill="#202A40" fillOpacity={0.6} />
        </svg>
      </div>

      <div className="lj-mid">
        <svg viewBox="0 0 3200 300" preserveAspectRatio="xMinYMax slice" className="absolute inset-0 h-full w-full" focusable="false">
          <path d={HILLS_PATH} fill="#2A4537" />
          <path d={HILLS_PATH} fill="#0F161A" className="lj-night-tint" />
        </svg>
        {/* Kota di ujung kanan (tampak saat pulang, malam) */}
        <div className="lj-city">
          <svg viewBox="0 0 560 230" className="block h-full w-auto" focusable="false">
            <defs>
              <pattern id="lj-windows" width="16" height="18" patternUnits="userSpaceOnUse">
                <rect x="4" y="5" width="7" height="8" fill="#FFD27A" />
              </pattern>
            </defs>
            <path d={CITY_PATH} fill="#1B2335" />
            <path d={CITY_PATH} fill="url(#lj-windows)" className="lj-city-lights" />
          </svg>
        </div>
      </div>

      {/* Tanah seberang jalan (diam) */}
      <div className="lj-verge" />

      {/* Dunia dekat di seberang jalan: 4,5× lebar layar, bergeser −3,5 layar sepanjang perjalanan */}
      <div className="lj-near">
        <div className="lj-rail-posts" />
        <div className="lj-poles" style={POLES} />
        <div className="lj-actor lj-actor-rest" style={actor(0.56, 0.6, 0.35)}>
          <RestSign />
        </div>
        <div className="lj-actor lj-actor-gate" style={actor(0.74, 0.66, 0.62)}>
          <Gate />
        </div>
        <div className="lj-actor lj-actor-park" style={actor(0.6, 1.4, 0.62)}>
          <ParkingSign />
        </div>
        {/* Titik turun malam hari: warung yang lampunya menyala */}
        <div className="lj-actor lj-actor-warung" style={actor(0.76, 0.52, 1)}>
          <Warung />
        </div>
      </div>

      <div className="lj-asphalt-film" />

      {/* Lajur jalan + trotoar sisi pintu bus (bergerak sama dengan dunia dekat): marka, halte, rombongan */}
      <div className="lj-lane">
        <div className="lj-dashes" />
        {/* HP: rombongan tepat di depan hidung bus yang lebih besar, halte di belakang mereka; keduanya di kiri tombol
            melayang Shell (x ≤ 320 dari 390px) */}
        <div className="lj-actor lj-actor-stop" style={actor(0.585, 0.77, 0)}>
          <StopSign />
        </div>
        <div className="lj-actor lj-actor-people" style={actor(0.475, 0.66, 0)}>
          <Group out />
        </div>
        <div className="lj-actor lj-actor-stop" style={actor(0.585, 0.77, 1)}>
          <StopSign />
        </div>
        <div className="lj-actor lj-actor-people" style={actor(0.475, 0.66, 1)}>
          <Group out={false} />
        </div>
      </div>

      <div className="lj-bus">
        <span className="lj-beam" />
        <svg viewBox="0 0 60 40" className="lj-speed" focusable="false">
          <path d="M8 8h50M0 20h58M14 32h44" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={2.4} strokeLinecap="round" />
        </svg>
        <div className="lj-bus-body">
          <Coach size="big" className="block h-auto w-full" wheelClassName="lj-film-wheel" glow />
        </div>
      </div>
    </div>
  );
}
