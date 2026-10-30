// Geometri SVG Kemudi (data murni, tanpa React): enam siluet mobil tampak samping per kelas (viewBox 480×200, tanah
// y = 178, muka ke kanan, cahaya dari kiri atas), MPV cetak biru untuk film (siluet MPV yang sama diskalakan 2,5× ke
// viewBox 1200×700), titik & garis keterangan film, dan peta kota abstrak antar-jemput (viewBox 600×480: jalan, sungai,
// taman, rute dari garasi ke tiap zona). Semua garis gambar orisinal: bentuk geometris umum per kelas, bukan jiplakan
// merek/tipe mana pun, tanpa emblem, tanpa pelat nomor. Dipakai ./vehicles.tsx dan ./scenes.tsx.
import type { BodyKind } from './model';

const r2 = (n: number) => Math.round(n * 100) / 100;
const polar = (cx: number, cy: number, r: number, deg: number): string => {
  const a = (deg * Math.PI) / 180;
  return `${r2(cx + r * Math.cos(a))} ${r2(cy + r * Math.sin(a))}`;
};

export interface Wheel {
  cx: number;
  cy: number;
  r: number;
  /** Lima jendela jari-jari velg (gelap) */
  spokes: string;
  /** Rongga spakbor gelap di atas ban (busur lengkungan + garis bawah bodi) */
  well: string;
}

/** Roda: ban r, velg 0,64r, lima jendela jari-jari di antara 0,27r dan 0,57r, rongga spakbor (lengkungan `arch`). */
export function wheelOf(cx: number, cy: number, r: number, arch: number, sill: number): Wheel {
  const spokes: string[] = [];
  const inner = r * 0.27;
  const outer = r * 0.57;
  for (let k = 0; k < 5; k += 1) {
    const a = k * 72 - 54;
    spokes.push(
      `M${polar(cx, cy, inner, a - 22)} L${polar(cx, cy, outer, a - 26)} A${r2(outer)} ${r2(outer)} 0 0 1 ${polar(cx, cy, outer, a + 26)} L${polar(cx, cy, inner, a + 22)} A${r2(inner)} ${r2(inner)} 0 0 0 ${polar(cx, cy, inner, a - 22)} Z`,
    );
  }
  const dx = Math.sqrt(Math.max(0, arch * arch - (sill - cy) ** 2));
  return { cx, cy, r, spokes: spokes.join(' '), well: `M${r2(cx - dx)} ${sill} A${arch} ${arch} 0 1 1 ${r2(cx + dx)} ${sill} Z` };
}

export interface CarShape {
  /** Siluet bodi (warna tema) */
  body: string;
  /** Pita terang atap (cahaya dari atas) */
  hi: string;
  /** Pita bawah lebih gelap */
  lower: string;
  /** Kaca samping (path) */
  glass: string[];
  /** Kaca bersudut membulat [x, y, w, h] (minibus) */
  glassRects?: [number, number, number, number][];
  /** Garis tiang di kaca hitam menerus (MPV premium) */
  glassLines?: string[];
  /** Strip krom di bawah kaca */
  chrome?: string;
  /** Garis pintu */
  seams: string[];
  handles: string[];
  mirror: string;
  head: string;
  tail: string;
  /** Plastik gelap (bumper, spakbor SUV, rel atap) */
  trims: string[];
  /** Pelat pelindung bawah (perak) */
  skid?: string;
  wheels: Wheel[];
}

/**
 * Enam siluet kelas mobil. Panjang & tinggi berbeda agar kelasnya terbaca: city car terkecil, MPV ringkas lebih rendah &
 * pendek dari MPV, minibus terpanjang.
 */
export const CAR_SHAPES: Record<BodyKind, CarShape> = {
  city: {
    body: 'M100 154 L96 132 Q94 112 100 100 L118 80 Q124 72 136 71 L246 69 Q258 69 266 75 L304 102 Q312 106 324 107 L364 112 Q382 115 386 128 L388 146 Q388 160 374 160 L354.9 160 A30 30 0 1 0 297.1 160 L178.9 160 A30 30 0 1 0 121.1 160 L108 160 Q100 160 100 154 Z',
    hi: 'M136 71 L246 69 Q258 69 266 75 L268 77 Q258 73 246 73 L137 75 Q126 76 120 82 L118 80 Q124 72 136 71 Z',
    lower: 'M96.9 134 L387.1 134 L388 146 Q388 160 374 160 L354.9 160 A30 30 0 1 0 297.1 160 L178.9 160 A30 30 0 1 0 121.1 160 L108 160 Q100 160 100 154 L96.9 134 Z',
    glass: ['M124 104 L133 86 Q138 78 148 78 L204 77 L204 104 Z', 'M212 77 L246 76 Q256 76 262 81 L289 104 L212 104 Z'],
    seams: ['M208 104 L208 157', 'M293 106 Q297 128 293 154', 'M128 106 L130 122'],
    handles: ['M224 112 h13 v3 h-13 z', 'M152 112 h13 v3 h-13 z'],
    mirror: 'M282 99 L296 97 Q299 97 299 100 L298 105 L286 106 Z',
    head: 'M362 114 L380 117 Q385 119 386 126 L368 125 Q362 121 362 114 Z',
    tail: 'M96.5 106 Q98 101 104 99 L104 121 L96 121 Z',
    trims: [],
    wheels: [wheelOf(150, 152, 26, 30, 160), wheelOf(326, 152, 26, 30, 160)],
  },
  mpv: {
    body: 'M60 154 L54 126 Q52 96 62 80 L80 58 Q86 52 98 52 L284 50 Q298 50 308 58 L348 92 Q356 97 368 98 L410 104 Q424 107 427 120 L428 146 Q428 160 414 160 L385.7 160 A31 31 0 1 0 326.3 160 L153.7 160 A31 31 0 1 0 94.3 160 L68 160 Q60 160 60 154 Z',
    hi: 'M98 52 L284 50 Q298 50 308 58 L310 60 Q298 54 284 54 L98 56 Q88 56 82 62 L80 58 Q86 52 98 52 Z',
    lower: 'M53.4 132 L427.7 132 L428 146 Q428 160 414 160 L385.7 160 A31 31 0 1 0 326.3 160 L153.7 160 A31 31 0 1 0 94.3 160 L68 160 Q60 160 60 154 L54.6 132 Z',
    glass: ['M66 100 L72 84 L86 66 Q90 61 98 61 L128 60 L128 100 Z', 'M136 60 L214 59 L214 100 L136 100 Z', 'M222 59 L284 58 Q294 58 302 64 L336 100 L222 100 Z'],
    seams: ['M218 100 L218 157', 'M132 100 L132 122', 'M339 102 Q343 126 337 154'],
    handles: ['M236 110 h13 v3 h-13 z', 'M152 110 h13 v3 h-13 z'],
    mirror: 'M326 92 L342 90 Q345 90 345 93 L344 99 L330 100 Z',
    head: 'M402 104 L422 108 Q426 111 427 118 L408 116 Q402 112 402 104 Z',
    tail: 'M55 102 Q56 94 64 88 L66 116 L54 118 Z',
    trims: ['M60 148 L91 148 L94.3 160 L68 160 Q60 160 60 154 Z', 'M389 148 L428 148 Q428 160 414 160 L385.7 160 Z'],
    wheels: [wheelOf(124, 151, 27, 31, 160), wheelOf(356, 151, 27, 31, 160)],
  },
  // MPV ringkas ("MPV hemat"): atap 10 lebih rendah dan sedikit turun ke belakang, 7,5% lebih pendek, jarak sumbu roda
  // 8,6% lebih pendek, roda lebih kecil, kaca belakang naik ("kick-up") → dua MPV di armada tidak tampak kembar
  'mpv-compact': {
    body: 'M76 154 L71 128 Q69 106 79 90 L96 70 Q102 63 114 63 L272 59 Q284 59 294 66 L332 98 Q340 103 352 104 L398 109 Q411 112 414 124 L416 146 Q416 160 402 160 L374.9 160 A30 30 0 1 0 317.1 160 L162.9 160 A30 30 0 1 0 105.1 160 L84 160 Q76 160 76 154 Z',
    hi: 'M114 63 L272 59 Q284 59 294 66 L296 68 Q284 63 272 63 L114 67 Q104 67 98 73 L96 70 Q102 63 114 63 Z',
    lower: 'M71.8 132 L414.7 132 L416 146 Q416 160 402 160 L374.9 160 A30 30 0 1 0 317.1 160 L162.9 160 A30 30 0 1 0 105.1 160 L84 160 Q76 160 76 154 L71.8 132 Z',
    glass: ['M88 94 L94 82 L104 74 Q108 70 116 70 L134 69.5 L134 94 Z', 'M142 69.3 L214 67.8 L214 102 L154 102 L142 94 Z', 'M222 67.6 L270 66.4 Q280 66.4 287 72 L320 102 L222 102 Z'],
    seams: ['M218 102 L218 157', 'M138 98 L138 122', 'M324 104 Q328 128 322 154'],
    handles: ['M232 112 h13 v3 h-13 z', 'M158 112 h13 v3 h-13 z'],
    mirror: 'M312 96 L327 94 Q330 94 330 97 L329 103 L316 104 Z',
    head: 'M390 109 L409 112 Q413 115 414 122 L396 120 Q390 116 390 109 Z',
    tail: 'M71 108 Q72 98 80 92 L82 118 L70 120 Z',
    trims: ['M75 148 L102 148 L105.1 160 L84 160 Q76 160 76 154 Z', 'M378 148 L416 148 Q416 160 402 160 L374.9 160 Z'],
    wheels: [wheelOf(134, 152, 26, 30, 160), wheelOf(346, 152, 26, 30, 160)],
  },
  suv: {
    body: 'M64 150 L60 118 Q58 90 66 76 L76 54 Q80 48 92 48 L292 48 Q304 48 312 55 L340 82 Q346 86 356 86 L408 90 Q420 92 422 104 L424 140 Q424 152 412 152 L384.8 152 A35 35 0 1 0 315.2 152 L164.8 152 A35 35 0 1 0 95.2 152 L72 152 Q64 152 64 150 Z',
    hi: 'M92 48 L292 48 Q304 48 312 55 L314 57 Q302 52 292 52 L92 52 Q82 52 78 58 L76 54 Q80 48 92 48 Z',
    lower: 'M59.6 124 L423.3 124 L424 140 Q424 152 412 152 L384.8 152 A35 35 0 1 0 315.2 152 L164.8 152 A35 35 0 1 0 95.2 152 L72 152 Q64 152 64 150 L60.2 124 Z',
    glass: ['M70 92 L74 76 L82 62 Q85 58 92 58 L124 58 L124 92 Z', 'M132 58 L206 58 L206 92 L132 92 Z', 'M214 58 L288 58 Q298 58 305 64 L330 92 L214 92 Z'],
    seams: ['M210 92 L210 150', 'M128 92 L128 114', 'M333 94 Q337 118 331 140'],
    handles: ['M228 102 h14 v3 h-14 z', 'M146 102 h14 v3 h-14 z'],
    mirror: 'M318 82 L334 80 Q337 80 337 83 L336 89 L322 90 Z',
    head: 'M398 90 L418 93 Q421 95 421 100 L402 98 Q398 95 398 90 Z',
    tail: 'M61 98 Q62 88 68 80 L70 112 L60 114 Z',
    trims: [
      'M100 44.5 L282 44.5 L282 48.5 L100 48.5 Z',
      'M89.2 152 A41 41 0 1 1 170.8 152 L164.8 152 A35 35 0 1 0 95.2 152 Z',
      'M309.2 152 A41 41 0 1 1 390.8 152 L384.8 152 A35 35 0 1 0 315.2 152 Z',
      'M164.8 143 L315.2 143 L315.2 152 L164.8 152 Z',
    ],
    skid: 'M404 140 L424 138 L424 146 Q422 152 412 152 L402 152 Z',
    wheels: [wheelOf(130, 148, 30, 35, 152), wheelOf(350, 148, 30, 35, 152)],
  },
  premium: {
    body: 'M48 154 L42 124 L42 70 Q42 44 62 38 Q70 35 84 35 L296 34 Q312 34 322 42 L370 86 Q378 92 390 94 L424 100 Q438 103 439 118 L440 146 Q440 160 426 160 L399.7 160 A31 31 0 1 0 340.3 160 L151.7 160 A31 31 0 1 0 92.3 160 L56 160 Q48 160 48 154 Z',
    hi: 'M84 35 L296 34 Q312 34 322 42 L324 44 Q312 38 296 38 L84 39 Q70 39 62 42 Q50 47 46 60 L43 62 Q44 44 62 38 Q70 35 84 35 Z',
    lower: 'M42 132 L439.6 132 L440 146 Q440 160 426 160 L399.7 160 A31 31 0 1 0 340.3 160 L151.7 160 A31 31 0 1 0 92.3 160 L56 160 Q48 160 48 154 L42 132 Z',
    glass: ['M50 96 L50 70 Q50 50 66 45 Q74 43 86 43 L292 42 Q304 42 312 48 L356 96 Z'],
    glassLines: ['M142 43 L142 96', 'M238 42.5 L238 96'],
    chrome: 'M50 99 L354 99 L352 102 L50 102 Z',
    seams: ['M144 103 L144 157', 'M240 103 L240 157', 'M357 99 Q362 124 356 154'],
    handles: ['M224 110 h12 v3 h-12 z', 'M262 110 h12 v3 h-12 z'],
    mirror: 'M346 88 L362 86 Q365 86 365 89 L364 95 L350 96 Z',
    head: 'M408 101 L432 105 Q436 107 436 112 L414 110 Q408 107 408 101 Z',
    tail: 'M43 80 Q44 64 52 56 L54 112 L42 114 Z',
    trims: ['M48 148 L89 148 L92.3 160 L56 160 Q48 160 48 154 Z', 'M403 148 L440 148 Q440 160 426 160 L399.7 160 Z'],
    wheels: [wheelOf(122, 151, 27, 31, 160), wheelOf(370, 151, 27, 31, 160)],
  },
  minibus: {
    body: 'M30 154 L24 126 L22 46 Q22 30 38 30 L382 30 Q398 30 406 42 L432 86 Q436 92 444 94 L450 96 Q458 99 458 112 L458 148 Q458 160 446 160 L412.9 160 A30 30 0 1 0 355.1 160 L140.9 160 A30 30 0 1 0 83.1 160 L38 160 Q30 160 30 154 Z',
    hi: 'M38 30 L382 30 Q398 30 406 42 L404 44 Q396 34 382 34 L38 34 Q27 34 26 46 L22 46 Q22 30 38 30 Z',
    lower: 'M23.6 132 L458 132 L458 148 Q458 160 446 160 L412.9 160 A30 30 0 1 0 355.1 160 L140.9 160 A30 30 0 1 0 83.1 160 L38 160 Q30 160 30 154 L24 132 Z',
    glass: ['M344 48 L386 48 Q396 48 402 56 L426 94 L344 94 Z'],
    glassRects: [
      [32, 48, 58, 46],
      [100, 48, 70, 46],
      [186, 48, 66, 46],
      [262, 48, 68, 46],
    ],
    seams: ['M180 44 L180 157', 'M258 44 L258 157', 'M338 44 L338 157', 'M431 97 Q437 126 433 154'],
    handles: ['M242 108 h12 v3 h-12 z', 'M352 108 h12 v3 h-12 z'],
    mirror: 'M424 80 L438 78 Q441 78 441 81 L440 87 L428 88 Z',
    head: 'M440 98 L456 102 Q458 104 458 110 L444 108 Z',
    tail: 'M23 66 L30 64 L30 108 L23 110 Z',
    trims: ['M30 148 L80 148 L83.1 160 L38 160 Q30 160 30 154 Z', 'M416 148 L458 148 Q458 160 446 160 L412.9 160 Z'],
    wheels: [wheelOf(112, 152, 26, 30, 160), wheelOf(384, 152, 26, 30, 160)],
  },
};

// ─── Film: MPV cetak biru (viewBox 1200×700) ─────────────────────────────────

/** Skala & geser siluet MPV ke panggung film: x × 2,5, y × 2,5 + 55 → tanah di y = 500. */
export const FILM_SCALE = 2.5;
export const FILM_DY = 55;
export const FILM_W = 1200;
export const FILM_H = 700;
export const FILM_GROUND = 178 * FILM_SCALE + FILM_DY;

/**
 * Skalakan data path ABSOLUT (M L H V Q C S T A Z, huruf besar; huruf kecil h/v diskalakan tanpa geser) ke ruang film.
 * Busur: jari-jari diskalakan, flag tidak.
 */
export function scalePath(d: string, s = FILM_SCALE, dx = 0, dy = FILM_DY): string {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  const out: string[] = [];
  let cmd = '';
  let args: number[] = [];
  const flush = () => {
    if (!cmd) return;
    const upper = cmd.toUpperCase();
    const rel = cmd !== upper;
    const sx = (n: number) => r2(n * s + (rel ? 0 : dx));
    const sy = (n: number) => r2(n * s + (rel ? 0 : dy));
    const k = (n: number) => r2(n * s);
    const parts: (number | string)[] = [];
    if (upper === 'A') {
      for (let i = 0; i + 6 < args.length + 1; i += 7) parts.push(k(args[i]), k(args[i + 1]), args[i + 2], args[i + 3], args[i + 4], sx(args[i + 5]), sy(args[i + 6]));
    } else if (upper === 'H') parts.push(...args.map(sx));
    else if (upper === 'V') parts.push(...args.map(sy));
    else parts.push(...args.map((n, i) => (i % 2 === 0 ? sx(n) : sy(n))));
    out.push(`${cmd}${parts.join(' ')}`);
    args = [];
  };
  for (const token of tokens) {
    if (/[a-zA-Z]/.test(token)) {
      flush();
      cmd = token;
      if (token.toUpperCase() === 'Z') {
        out.push(token);
        cmd = '';
      }
    } else args.push(Number(token));
  }
  flush();
  return out.join(' ');
}

const MPV = CAR_SHAPES.mpv;
const filmPoint = (x: number, y: number): [number, number] => [r2(x * FILM_SCALE), r2(y * FILM_SCALE + FILM_DY)];

/** MPV film: path & roda dalam koordinat panggung (1200×700). */
export const FILM_CAR = {
  body: scalePath(MPV.body),
  hi: scalePath(MPV.hi),
  lower: scalePath(MPV.lower),
  glass: MPV.glass.map((g) => scalePath(g)),
  seams: MPV.seams.map((g) => scalePath(g)),
  handles: MPV.handles.map((g) => scalePath(g)),
  mirror: scalePath(MPV.mirror),
  head: scalePath(MPV.head),
  tail: scalePath(MPV.tail),
  trims: MPV.trims.map((g) => scalePath(g)),
  wheels: MPV.wheels.map((w) => {
    const [cx, cy] = filmPoint(w.cx, w.cy);
    return wheelOf(cx, cy, r2(w.r * FILM_SCALE), r2(31 * FILM_SCALE), 160 * FILM_SCALE + FILM_DY);
  }),
};

/**
 * Keterangan film: titik jangkar di mobil (koordinat panggung), titik ujung garis tegak (tempat label), dan letak label
 * terhadap ujung garis ('above' = label di atas ujung, 'below' = di bawahnya; selalu di tengah garis). Urutan = urutan
 * muncul, dibaca seperti huruf Z (kiri → kanan, atas → bawah): kaca tengah (kursi & koper, label x 400) → atap (AC, 675)
 * → panel belakang (BBM, 212,5) → roda depan (dicek, 890). Jangkar saling berjauhan (≥ 190 satuan) agar lencana bernomor
 * di HP (24px, panggung ± 350px) tidak bertumpuk; label atas tidak bersinggungan.
 */
export const FILM_CALLOUTS: { anchor: [number, number]; end: [number, number]; side: 'above' | 'below' }[] = [
  { anchor: filmPoint(160, 80), end: [400, 62], side: 'above' },
  // Ujung 142 (bukan lebih tinggi): di panggung ± 540–610px (laptop 1024 px) label atap tidak menempel ke label kaca
  { anchor: filmPoint(270, 51), end: [675, 142], side: 'above' },
  { anchor: filmPoint(85, 98), end: [212.5, 600], side: 'below' },
  { anchor: filmPoint(356, 151), end: [890, 600], side: 'below' },
];

/** Garis keterangan siku: dari jangkar tegak lurus ke tinggi ujung (label menempel di ujung). */
export const calloutPath = ({ anchor, end }: { anchor: [number, number]; end: [number, number] }): string =>
  `M${anchor[0]} ${anchor[1]} L${end[0]} ${end[1]}`;

/** Garis bantu cetak biru: tanah, sumbu roda, garis ukur panjang & tinggi (dengan ujung tegak). */
export const FILM_GUIDES = (() => {
  const [rear, front] = FILM_CAR.wheels;
  const roof = 50 * FILM_SCALE + FILM_DY;
  return {
    ground: `M40 ${FILM_GROUND} L1160 ${FILM_GROUND}`,
    axles: `M${rear.cx} ${roof - 40} L${rear.cx} ${FILM_GROUND + 30} M${front.cx} ${roof - 40} L${front.cx} ${FILM_GROUND + 30}`,
    axleLine: `M80 ${rear.cy} L1120 ${rear.cy}`,
    length: `M130 ${FILM_GROUND + 48} L1070 ${FILM_GROUND + 48} M130 ${FILM_GROUND + 38} L130 ${FILM_GROUND + 58} M1070 ${FILM_GROUND + 38} L1070 ${FILM_GROUND + 58}`,
    height: `M1118 ${roof} L1118 ${FILM_GROUND} M1108 ${roof} L1128 ${roof} M1108 ${FILM_GROUND} L1128 ${FILM_GROUND}`,
  };
})();

/** Garis kecepatan di belakang mobil saat berangkat (koordinat panggung, x < bumper belakang). */
export const FILM_SPEED_LINES: [number, number, number][] = [
  [-150, 250, 120],
  [-230, 300, 200],
  [-130, 352, 100],
  [-260, 404, 230],
  [-170, 456, 140],
];

// ─── Peta kota abstrak (viewBox 600×480) ─────────────────────────────────────

export const MAP_W = 600;
export const MAP_H = 480;

/** Garasi (titik awal rute). */
export const MAP_GARAGE: [number, number] = [250, 270];

/**
 * Slot pin zona (urutan zona di CMS) + rute dari garasi lewat jalan. Maks. 6 zona. Zona 1 (terpilih saat pertama tampil)
 * sengaja dua blok ke kanan + satu blok ke atas, agar gambar rute pertama terbaca (bukan garis pendek di samping garasi).
 */
export const MAP_SLOTS: { pin: [number, number]; route: string }[] = [
  { pin: [410, 210], route: 'M250 270 L398 270 Q410 270 410 258 L410 210' },
  { pin: [170, 170], route: 'M250 270 L250 182 Q250 170 238 170 L170 170' },
  { pin: [110, 330], route: 'M250 270 L250 318 Q250 330 238 330 L110 330' },
  { pin: [410, 70], route: 'M250 270 L250 132 Q250 120 262 120 L398 120 Q410 120 410 108 L410 70' },
  { pin: [490, 330], route: 'M250 270 L318 270 Q330 270 330 282 L330 318 Q330 330 342 330 L490 330' },
  { pin: [90, 120], route: 'M250 270 L250 132 Q250 120 238 120 L90 120' },
];

/** Jalan kota (garis putih), jalan lingkar, sungai, dan taman. */
export const MAP_ART = {
  streets: [
    'M0 70 L600 70',
    'M0 120 L600 120',
    'M0 170 L600 170',
    'M0 270 L600 270',
    'M0 330 L600 330',
    'M0 400 L600 400',
    'M90 0 L90 480',
    'M170 0 L170 480',
    'M250 0 L250 480',
    'M330 0 L330 480',
    'M410 0 L410 480',
    'M490 0 L490 480',
  ],
  ring: 'M130 95 Q130 45 180 45 L420 45 Q470 45 470 95 L470 365 Q470 430 405 430 L195 430 Q130 430 130 365 Z',
  river: 'M-20 450 C 90 410 120 300 210 300 S 300 360 380 300 S 470 160 620 130',
  parks: [
    [342, 182, 56, 76],
    [102, 182, 56, 76],
    [422, 342, 56, 46],
  ] as [number, number, number, number][],
};
