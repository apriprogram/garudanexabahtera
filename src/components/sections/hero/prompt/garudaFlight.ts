// Koreografi tiga burung Garuda ASCII di latar hero Prompt AI (GarudaAscii.tsx), dibuat sinematik: kadang terbang serempak
// dalam formasi, kadang berputar-putar mengitari satu titik seperti elang melayang di udara panas, kadang acak ke sana
// kemari; kadang menjauh kecil di langit, kadang mendekat besar. Sesekali satu burung menukik ke kamera sampai seukuran
// layar (detailnya terlihat jelas), melewati tepi layar seolah keluar, lalu kembali dari tepi itu sambil menjauh. Murni
// (tanpa DOM, angka acak disuntikkan) supaya bisa diuji; model & rasterisasinya di garudaSprites.ts, menggambarnya di
// garudaEngine.ts.
// - Kedalaman: titik dunia (x, y, z) px → layar dengan skala s = F / z, jadi burung yang menjauh mengecil dan yang
//   mendekat membesar secara halus. Rute = spline Catmull-Rom sentripetal di ruang dunia lewat titik jalan yang dipilih
//   di layar + skala, ditempuh per panjang busur; laju dunia ∝ s^−0,65 (jauh pelan di layar, dekat tidak melesat). Rute
//   baru selalu mulai dari posisi & arah burung saat itu, dan lajunya berubah halus, jadi tidak ada lompatan.
// - Babak (bergantian acak, ±12–18 detik): FORMASI = satu pemimpin menempuh rute acak, dua lainnya mengikuti dengan
//   pegas teredam, kadang longgar (bergoyang, tidak kaku), kadang rapi (V, eselon miring, atau berjajar: posisi tepat,
//   kepakan & luncuran serempak); BERPUTAR = tiap burung mengorbit titik yang sama dengan jari-jari & ketinggian sendiri
//   (lebih banyak meluncur); ACAK = tiap burung ke titik-titik acak sendiri (jauh, sedang, dekat, rendah). TUKIKAN dapat
//   terjadi di babak berputar / acak.
// - Belok & tukik halus: rute acak tidak berbalik tajam (belokan > ±100° ditolak), tukikan satu sapuan searah; arah hadap
//   diambil dari kecepatan yang dihaluskan, bank mengikuti laju belok yang juga dihaluskan (miring ke dalam belokan lalu
//   kembali datar perlahan). Saat menukik sayap sedikit dilipat & tersapu ke belakang. Saat sangat dekat burung menoleh
//   ke kamera.
// - Kepakan: downstroke (lebih lama) → upstroke dengan easing kosinus, ujung sayap menyusul lengan (gelombang), sayap
//   setengah terlipat & tersapu ke belakang saat upstroke; sesekali meluncur dengan peralihan halus; badan naik sedikit
//   tiap downstroke. Fase kontinu (bukan frame), frekuensi sedikit beda per burung → kepakan tidak serempak.
// - Partikel (halus, sedikit): kilau dari ujung sayap tiap akhir downstroke dan jejak tipis saat meluncur; sehelai bulu
//   kadang lepas saat burung melintas sangat dekat.
import { FLAT_X, FLAT_Z, UP, birdGeometry, type BirdGeometry, type BirdPose, type Vec3 } from './garudaSprites';

type V3 = [number, number, number];

export interface Rect {
  l: number;
  t: number;
  r: number;
  b: number;
}

export type ParticleKind = 'spark' | 'feather';

export interface Particle {
  kind: ParticleKind;
  /** Posisi & kecepatan di layar (px, px/detik). */
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  /** Skala glyph (1 = sel normal). */
  size: number;
  /** Fase & frekuensi ayunan (bulu) dan simpangan (px), laju jatuh akhir (px/detik). */
  phase: number;
  freq: number;
  amp: number;
  fall: number;
  seed: number;
}

export interface Path {
  /** Titik kendali di dunia, termasuk titik bayangan di kedua ujung (arah awal & akhir). */
  pts: V3[];
  /** Jarak kumulatif per sampel (SAMPLES per segmen). */
  lens: Float64Array;
  total: number;
}

/** Titik jalan di layar: x, y (px), skala. */
export type Way = [number, number, number];

export type ActKind = 'formation' | 'circle' | 'wander';
/** Gaya formasi: longgar (bergoyang), V rapi, eselon (diagonal), berjajar. */
export type FormationStyle = 'loose' | 'v' | 'echelon' | 'line';
/** Tugas burung: rute acak, mengorbit, memimpin formasi, mengikuti formasi, menukik ke kamera. */
export type Task = 'wander' | 'orbit' | 'lead' | 'follow' | 'zoom';

export interface Act {
  kind: ActKind;
  /** Waktu adegan babak ini berakhir. */
  until: number;
  /** Pemimpin formasi (indeks burung) dan gaya formasinya. */
  leader: number;
  style: FormationStyle;
  /** Pusat orbit (dunia) dan arah putar (+1 / −1). */
  centre: V3;
  spin: 1 | -1;
  /** Jadwal tukikan (waktu adegan, NaN = tidak ada) dan burungnya. */
  zoomAt: number;
  zoomBird: number;
}

export interface Bird {
  index: number;
  task: Task;
  /** Pusat badan di dunia (koordinat kamera, px; z = jarak) dan kecepatannya (px dunia/detik). */
  pos: V3;
  vel: V3;
  path: Path | null;
  dist: number;
  /** Laju jelajah rute (px layar/detik di s = 1) dan laju sekarang (px dunia/detik, berubah halus). */
  cruise: number;
  speed: number;
  /** Posisi di formasi relatif pemimpin (panjang badan: belakang, samping kanan, atas) dan urutannya (0 = pemimpin). */
  slot: V3;
  rank: number;
  /** Orbit: jari-jari (× jarak pusat) dan ketinggian (panjang badan) burung ini. */
  orbit: [number, number];
  /** Pengali frekuensi kepakan (tiap burung sedikit beda). */
  hzScale: number;
  /** Arah gerak yang dihaluskan (satuan, dunia); false sampai burung pertama kali bergerak. */
  heading: V3;
  steady: boolean;
  /** Arah hadap, dongak, bank (radian, dihaluskan) dan laju belok yang dihaluskan (radian/detik). */
  yaw: number;
  pitch: number;
  roll: number;
  turn: number;
  /** Fase kepakan 0..1 (0 = puncak, sayap di atas). */
  phase: number;
  /** Bobot meluncur 0..1 (halus) dan targetnya. */
  glide: number;
  gliding: boolean;
  /** Sisa waktu mengepak / meluncur sebelum berganti (detik). */
  modeLeft: number;
  trailIn: number;
  /** Sudah melepas bulu di tukikan ini. */
  shed: boolean;
  pose: BirdPose;
  geometry: BirdGeometry | null;
  /** Pusat badan di layar (px), skala (panjang badan = L0·s px), dan kecepatannya di layar. */
  x: number;
  y: number;
  s: number;
  vx: number;
  vy: number;
}

export interface Scene {
  w: number;
  h: number;
  /** Titik pusat proyeksi dan jarak fokus (px). */
  cx: number;
  cy: number;
  F: number;
  /** Panjang badan burung (px) di s = 1. */
  L0: number;
  /** Lebar sel glyph (px), dipasang mesin: menentukan tingkat detail model. */
  cell: number;
  /** Kotak konten tengah (judul, kotak prompt, chip): burung yang lewat di belakangnya diredupkan mesin. */
  content: Rect;
  birds: Bird[];
  particles: Particle[];
  act: Act;
  time: number;
  rng: () => number;
}

export const BIRDS = 3;
export const MAX_PARTICLES = 60;
/** Bagian siklus kepakan yang berupa downstroke (lebih lama dari upstroke, seperti burung sungguhan). */
export const DOWNSTROKE = 0.54;
const SAMPLES = 24;

const deg = (d: number) => (d * Math.PI) / 180;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const clamp01 = (v: number) => clamp(v, 0, 1);
const smooth = (e0: number, e1: number, v: number) => {
  const t = clamp01((v - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
const easeInOut = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(t));
const wrap = (v: number) => v - Math.floor(v);
const rand = (rng: () => number, min: number, max: number) => min + (max - min) * rng();
/** Selisih sudut terpendek a − b (−π..π). */
const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const approach = (v: number, target: number, k: number) => v + (target - v) * clamp01(k);
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const axpy = (a: Vec3, b: Vec3, k: number): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const mix3 = (a: Vec3, b: Vec3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const dist3 = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const norm3 = (a: Vec3): V3 => {
  const n = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / n, a[1] / n, a[2] / n];
};
const pick = <T>(items: readonly T[], rng: () => number): T => items[Math.floor(rng() * items.length)];

/* ─── Pose ────────────────────────────────────────────────────────────────── */

export const restPose = (): BirdPose => ({
  yaw: 0,
  pitch: 0,
  roll: 0,
  arm: deg(7),
  hand: deg(13),
  fold: 0.05,
  sweep: 0,
  tail: 0.25,
  tailPitch: 0,
  legs: 0,
  grip: 0,
  crouch: 0,
  headYaw: 0,
  headPitch: 0,
  lift: 0,
});

const stroke = (phase: number, up: number, down: number) =>
  phase < DOWNSTROKE ? lerp(up, down, easeInOut(phase / DOWNSTROKE)) : lerp(down, up, easeInOut((phase - DOWNSTROKE) / (1 - DOWNSTROKE)));

/**
 * Sayap pada fase kepakan `phase` (0 = puncak, sayap di atas) dengan tenaga `power` (1 = jelajah, lebih = menanjak):
 * lengan turun-naik dengan easing kosinus (turunan nol di kedua ujung → tanpa sentakan), tangan menyusul lengan dengan
 * ayunan lebih lebar, sayap setengah terlipat & tersapu ke belakang saat upstroke.
 */
export function flapWings(phase: number, power: number, out: BirdPose): BirdPose {
  const up = deg(46 + 16 * power);
  const down = deg(-22 - 14 * power);
  out.arm = stroke(phase, up, down);
  out.hand = stroke(wrap(phase - 0.075), up * 1.12, down * 1.18) + deg(4);
  const upstroke = phase >= DOWNSTROKE ? Math.sin((Math.PI * (phase - DOWNSTROKE)) / (1 - DOWNSTROKE)) ** 2 : 0;
  const downstroke = phase < DOWNSTROKE ? Math.sin((Math.PI * phase) / DOWNSTROKE) ** 2 : 0;
  out.fold = 0.5 * upstroke * Math.min(1.2, power);
  out.sweep = -deg(10) * upstroke + deg(3) * downstroke;
  return out;
}

/* ─── Lintasan ────────────────────────────────────────────────────────────── */

/** Catmull-Rom sentripetal (Barry–Goldman): tanpa simpul / lonjakan walau jarak titik jalan tidak rata. */
function catmull(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, u: number): V3 {
  const knot = (a: Vec3, b: Vec3) => Math.max(1e-3, Math.sqrt(dist3(a, b)));
  const t1 = knot(p0, p1);
  const t2 = t1 + knot(p1, p2);
  const t3 = t2 + knot(p2, p3);
  const t = lerp(t1, t2, u);
  const m = (a: Vec3, b: Vec3, ta: number, tb: number) => mix3(a, b, (t - ta) / (tb - ta));
  const a1 = m(p0, p1, 0, t1);
  const a2 = m(p1, p2, t1, t2);
  const a3 = m(p2, p3, t2, t3);
  return m(m(a1, a2, 0, t2), m(a2, a3, t1, t3), t1, t2);
}

/**
 * Lintasan halus lewat `points` (dunia). `startDir` (satuan) = arah terbang di awal (melanjutkan arah burung saat itu);
 * tanpa itu ujung-ujungnya mengikuti titik tetangga.
 */
export function makePath(points: readonly Vec3[], startDir?: Vec3): Path {
  const n = points.length;
  const first = points[0];
  const last = points[n - 1];
  const lead = startDir ? axpy(first, startDir, -dist3(first, points[1]) * 0.6) : mix3(points[1], first, 2);
  const tail = mix3(points[n - 2], last, 2);
  const pts: V3[] = [lead, ...points.map((p) => [p[0], p[1], p[2]] as V3), tail];
  const segments = n - 1;
  const lens = new Float64Array(segments * SAMPLES + 1);
  let prev: V3 = [first[0], first[1], first[2]];
  for (let i = 1; i < lens.length; i++) {
    const seg = Math.min(segments - 1, Math.floor((i - 1) / SAMPLES));
    const u = (i - seg * SAMPLES) / SAMPLES;
    const p = catmull(pts[seg], pts[seg + 1], pts[seg + 2], pts[seg + 3], u);
    lens[i] = lens[i - 1] + dist3(prev, p);
    prev = p;
  }
  return { pts, lens, total: lens[lens.length - 1] };
}

/** Titik di lintasan pada jarak `d` dari awal (px dunia). */
export function pathAt(path: Path, d: number): V3 {
  const { lens, pts } = path;
  const target = clamp(d, 0, path.total);
  let lo = 0;
  let hi = lens.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (lens[mid] <= target) lo = mid;
    else hi = mid;
  }
  const frac = (target - lens[lo]) / (lens[hi] - lens[lo] || 1);
  const segments = pts.length - 3;
  const seg = Math.min(segments - 1, Math.floor(lo / SAMPLES));
  const u = clamp01((lo - seg * SAMPLES + frac) / SAMPLES);
  return catmull(pts[seg], pts[seg + 1], pts[seg + 2], pts[seg + 3], u);
}

/** Arah lintasan (satuan) pada jarak `d`. */
export function pathTangent(path: Path, d: number): V3 {
  const a = pathAt(path, d - 2);
  const b = pathAt(path, d + 2);
  const n = dist3(a, b) || 1;
  return [(b[0] - a[0]) / n, (b[1] - a[1]) / n, (b[2] - a[2]) / n];
}

/* ─── Adegan ──────────────────────────────────────────────────────────────── */

/** Panjang badan burung (px) di s = 1 untuk lebar hero `w` (HP: relatif lebih besar, kontennya selebar layar). */
export const birdLength = (w: number): number => clamp(Math.round(w * 0.12), 70, 168);

/** Skala tukikan terdekat: rentang sayap (±2 panjang badan) kira-kira selebar layar. */
export const zoomScale = (scene: Pick<Scene, 'w' | 'L0'>): number => clamp((scene.w * 0.5) / scene.L0, 2.6, 5.5);

/** Skala terkecil supaya burung terjauh masih ±18 px (beberapa glyph). */
const minScale = (scene: Scene) => 18 / scene.L0;
/** Skala terbesar yang boleh dicapai (burung tidak pernah sampai di belakang kamera). */
const maxScale = (scene: Scene) => zoomScale(scene) * 1.25;

/** Laju dunia relatif terhadap skala: jauh sedikit lebih cepat di dunia (tetap bergerak di layar), dekat lebih pelan. */
const depthSpeed = (s: number) => Math.pow(clamp(s, 0.1, 7), -0.65);

/** Titik layar (px) + skala → dunia. */
export const toWorld = (scene: Scene, x: number, y: number, s: number): V3 => [(x - scene.cx) / s, (y - scene.cy) / s, scene.F / s];

/** Dunia → layar (px) + skala. */
export function project(scene: Scene, p: Vec3): { x: number; y: number; s: number } {
  const s = scene.F / Math.max(1, p[2]);
  return { x: scene.cx + p[0] * s, y: scene.cy + p[1] * s, s };
}

/** Arah terbang (satuan, dunia) untuk hadap `yaw` dan dongak `pitch`. */
export function headingOf(yaw: number, pitch: number): V3 {
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  return [0, 1, 2].map((i) => cp * (Math.cos(yaw) * FLAT_X[i] + Math.sin(yaw) * FLAT_Z[i]) + sp * UP[i]) as V3;
}

/** Kotak konten tengah dari kotak elemen yang dihindari (abaikan yang selebar hero); tanpa itu, perkiraan tata letak. */
export function contentBox(w: number, h: number, avoid: readonly Rect[]): Rect {
  const narrow = avoid.filter((r) => r.r - r.l < w * 0.9 && r.r > r.l && r.b > r.t);
  if (narrow.length) {
    return {
      l: Math.min(...narrow.map((r) => r.l)),
      t: Math.min(...narrow.map((r) => r.t)),
      r: Math.max(...narrow.map((r) => r.r)),
      b: Math.max(...narrow.map((r) => r.b)),
    };
  }
  return w < 640 ? { l: 16, t: h * 0.18, r: w - 16, b: h * 0.92 } : { l: w * 0.25, t: h * 0.32, r: w * 0.75, b: h * 0.8 };
}

const newBird = (index: number, rng: () => number): Bird => ({
  index,
  task: 'wander',
  pos: [0, 0, 1e4],
  vel: [0, 0, 0],
  path: null,
  dist: 0,
  cruise: 0,
  speed: 0,
  slot: [0, 0, 0],
  rank: 0,
  orbit: [0.4, 0],
  hzScale: rand(rng, 0.9, 1.12),
  heading: [1, 0, 0],
  steady: false,
  yaw: 0,
  pitch: 0,
  roll: 0,
  turn: 0,
  phase: rng(),
  glide: 0,
  gliding: false,
  modeLeft: rand(rng, 1, 3),
  trailIn: 0,
  shed: false,
  pose: restPose(),
  geometry: null,
  x: -9999,
  y: -9999,
  s: 0,
  vx: 0,
  vy: 0,
});

export interface SceneOptions {
  /** 0..1 (Math.random, atau tetap di tes). */
  rng?: () => number;
  /** Kotak elemen hero bertanda data-garuda-avoid (px, relatif kanvas). */
  avoid?: readonly Rect[];
  /** Lebar sel glyph (px). */
  cell?: number;
}

/**
 * Gaya formasi: posisi kedua pengikut di belakang pemimpin (panjang badan: belakang, samping kanan, atas) dan apakah
 * rapi (posisi tepat, pegas lebih kaku, kepakan & luncuran serempak dengan pemimpin).
 */
export const FORMATIONS: Record<FormationStyle, { slots: readonly [V3, V3]; tidy: boolean }> = {
  loose: { slots: [[-1.4, 1.7, 0.25], [-1.7, -1.9, -0.3]], tidy: false },
  v: { slots: [[-1.2, 1.5, 0], [-1.2, -1.5, 0]], tidy: true },
  echelon: { slots: [[-1.1, 1.4, 0.05], [-2.2, 2.8, 0.1]], tidy: true },
  line: { slots: [[-0.1, 1.9, 0], [-0.1, -1.9, 0]], tidy: true },
};
/** Undian gaya formasi: longgar & V lebih sering. */
const STYLES: readonly FormationStyle[] = ['loose', 'loose', 'v', 'v', 'echelon', 'line'];

/** Adegan baru: ketiga burung datang bersama dari kejauhan dalam formasi, lalu babak-babak acak. */
export function createScene(w: number, h: number, options: SceneOptions = {}): Scene {
  const rng = options.rng ?? Math.random;
  const L0 = birdLength(w);
  const scene: Scene = {
    w,
    h,
    cx: w / 2,
    cy: h * 0.45,
    F: clamp(w * 0.55, 240, 820),
    L0,
    cell: options.cell ?? 8,
    content: contentBox(w, h, options.avoid ?? []),
    birds: [],
    particles: [],
    act: { kind: 'formation', until: 0, leader: 0, style: 'loose', centre: [0, 0, 1], spin: 1, zoomAt: NaN, zoomBird: 0 },
    time: 0,
    rng,
  };
  scene.birds = Array.from({ length: BIRDS }, (_, i) => newBird(i, rng));
  // Masuk dari kejauhan di luar layar, sisi acak
  const side = rng() < 0.5 ? 1 : -1;
  const s = Math.max(minScale(scene), 0.22);
  const entry = toWorld(scene, side > 0 ? w * 1.12 : -w * 0.12, h * rand(rng, 0.08, 0.2), s);
  for (const bird of scene.birds) bird.pos = [entry[0], entry[1], entry[2]];
  startAct(scene, 'formation');
  // Babak pertama lebih singkat: tukikan pertama tidak menunggu terlalu lama
  scene.act.until = rand(rng, 8, 11);
  return scene;
}

/* ─── Rute ────────────────────────────────────────────────────────────────── */

type Zone = 'far' | 'mid' | 'near' | 'low' | 'side';

/**
 * Titik acak di zona `zone`: jauh = kecil tinggi di langit (di bawah banner promo, di atas judul) atau di samping
 * konten; sedang; dekat = besar di sisi kiri / kanan konten; rendah = di bawah konten; samping = sedang di tepi.
 */
function zonePoint(scene: Scene, zone: Zone): Way {
  const { rng, w, h, content } = scene;
  const ms = minScale(scene);
  // Sisi kiri / kanan konten; di HP konten selebar layar, jadi di mana saja
  const flank = () =>
    content.r - content.l > w * 0.8 ? w * rand(rng, 0.15, 0.85) : (rng() < 0.5 ? content.l / 2 : (content.r + w) / 2) + (rng() - 0.5) * 0.08 * w;
  // Langit di bawah banner promo & di atas judul
  const sky = (): number => rand(rng, h * 0.16, Math.max(h * 0.18, content.t - h * 0.08));
  switch (zone) {
    case 'far':
      return rng() < 0.6
        ? [w * rand(rng, 0.1, 0.9), sky(), Math.max(ms, rand(rng, 0.26, 0.42))]
        : [flank(), h * rand(rng, 0.2, 0.7), Math.max(ms, rand(rng, 0.28, 0.45))];
    case 'mid':
      return rng() < 0.6 ? [flank(), h * rand(rng, 0.2, 0.7), Math.max(ms, rand(rng, 0.6, 0.95))] : [w * rand(rng, 0.15, 0.85), sky(), Math.max(ms, rand(rng, 0.55, 0.85))];
    case 'near':
      return [flank(), h * rand(rng, 0.3, 0.75), rand(rng, 1.3, 1.95)];
    case 'low':
      return [w * rand(rng, 0.25, 0.75), h * rand(rng, 0.85, 0.97), Math.max(ms, rand(rng, 0.7, 1.05))];
    case 'side':
      return [rng() < 0.5 ? w * rand(rng, 0.02, 0.14) : w * rand(rng, 0.86, 0.98), h * rand(rng, 0.2, 0.6), Math.max(ms, rand(rng, 0.8, 1.25))];
  }
}

/**
 * Urutan zona acak tanpa zona yang sama berurutan, mulai dari posisi & arah layar burung: titik yang membuat belokan
 * lebih dari ±100° diundi ulang (beberapa kali), jadi burung berbelok melengkung, tidak berbalik tajam.
 */
function randomWays(scene: Scene, bird: Bird, count: number, zones: readonly Zone[]): Way[] {
  const out: Way[] = [];
  let prev: Zone | null = null;
  let at: [number, number] = [bird.x, bird.y];
  let dir: [number, number] = [bird.vx, bird.vy];
  for (let i = 0; i < count; i++) {
    let way: Way | null = null;
    let zone: Zone = zones[0];
    for (let attempt = 0; attempt < 8; attempt++) {
      zone = pick(zones, scene.rng);
      if (zone === prev) zone = zones[(zones.indexOf(zone) + 1) % zones.length];
      const candidate = zonePoint(scene, zone);
      const dx = candidate[0] - at[0];
      const dy = candidate[1] - at[1];
      const n = Math.hypot(dx, dy) * Math.hypot(dir[0], dir[1]);
      way = candidate;
      if (n < 1e-6 || (dx * dir[0] + dy * dir[1]) / n > -0.17) break;
    }
    out.push(way!);
    dir = [way![0] - at[0], way![1] - at[1]];
    at = [way![0], way![1]];
    prev = zone;
  }
  return out;
}

/** Laju jelajah supaya rute selesai ±`seconds` detik (laju dunia ∝ s^−0,65, dihitung dari tabel panjang busur). */
function cruiseFor(scene: Scene, path: Path, seconds: number): number {
  let effective = 0;
  let prev = pathAt(path, 0);
  const steps = 48;
  for (let i = 1; i <= steps; i++) {
    const p = pathAt(path, (path.total * i) / steps);
    const s = scene.F / Math.max(1, (p[2] + prev[2]) / 2);
    effective += dist3(p, prev) / depthSpeed(s);
    prev = p;
  }
  return clamp(effective / seconds, scene.L0 * 1.4, scene.L0 * 3.6);
}

/** Pasang rute baru lewat titik layar `ways`, mulai dari posisi & arah burung sekarang. */
function setRoute(scene: Scene, bird: Bird, ways: readonly Way[], seconds: number, task: Task): void {
  const world = [[...bird.pos] as V3, ...ways.map(([x, y, s]) => toWorld(scene, x, y, clamp(s, minScale(scene), maxScale(scene))))];
  const moving = Math.hypot(bird.vel[0], bird.vel[1], bird.vel[2]) > 1;
  const path = makePath(world, moving ? norm3(bird.vel) : undefined);
  bird.path = path;
  bird.dist = 0;
  bird.cruise = cruiseFor(scene, path, seconds);
  bird.task = task;
  if (!moving) bird.speed = bird.cruise * depthSpeed(scene.F / bird.pos[2]);
}

/** Rute acak ke sana kemari: 2–3 titik dari zona jauh, sedang, dekat, rendah, samping. */
function wanderRoute(scene: Scene, bird: Bird): void {
  const count = 2 + Math.floor(scene.rng() * 2);
  setRoute(scene, bird, randomWays(scene, bird, count, ['far', 'mid', 'near', 'low', 'side']), rand(scene.rng, 5.5, 8) * count * 0.5, 'wander');
}

/** Rute pemimpin formasi: lengkung lebar jauh ↔ dekat (tanpa sudut tajam, supaya pengikut tidak tertinggal). */
function leadRoute(scene: Scene, bird: Bird): void {
  setRoute(scene, bird, randomWays(scene, bird, 3, ['far', 'mid', 'near', 'side']), rand(scene.rng, 9, 12), 'lead');
}

/** Sumbu kedalaman kamera: orbit di bidang ini, jadi sisi dekatnya tidak naik keluar dari atas layar. */
const DEPTH: Vec3 = [0, 0, 1];

/**
 * Satu putaran orbit mengitari pusat babak (searah untuk semua burung), dengan jari-jari & ketinggian burung ini: di sisi
 * dekat burung membesar, di sisi jauh mengecil.
 */
function orbitRoute(scene: Scene, bird: Bird): void {
  const { centre, spin } = scene.act;
  const [radiusK, height] = bird.orbit;
  const radius = centre[2] * radiusK;
  // Sudut awal = posisi burung terhadap pusat
  const rel: V3 = [bird.pos[0] - centre[0], bird.pos[1] - centre[1], bird.pos[2] - centre[2]];
  const start = Math.atan2(dot(rel, DEPTH), dot(rel, FLAT_X));
  const steps = 8;
  const world: V3[] = [[...bird.pos] as V3];
  for (let k = 1; k <= steps; k++) {
    const a = start + spin * (k / steps) * Math.PI * 2;
    // Naik-turun sedikit sepanjang putaran supaya tidak seperti piringan
    const bob = Math.sin(a * 2) * 0.35 * scene.L0;
    const p = axpy(axpy(centre, FLAT_X, Math.cos(a) * radius), DEPTH, Math.sin(a) * radius);
    world.push(axpy(p, UP, height * scene.L0 + bob));
  }
  // Jaga dalam batas skala (tidak menembus kamera)
  for (const p of world) p[2] = Math.max(p[2], scene.F / maxScale(scene));
  const moving = Math.hypot(bird.vel[0], bird.vel[1], bird.vel[2]) > 1;
  const path = makePath(world, moving ? norm3(bird.vel) : undefined);
  bird.path = path;
  bird.dist = 0;
  bird.cruise = cruiseFor(scene, path, rand(scene.rng, 10, 13));
  bird.task = 'orbit';
}

/**
 * Tukikan sinematik dalam satu sapuan searah: dari sisi tempat burung berada, mendekat, menukik ke kamera sampai seukuran
 * layar di dekat tengah, terus melewati tepi seberang (keluar). Rute berikutnya mulai dari luar tepi itu, jadi burung
 * kembali masuk sambil menjauh.
 */
function zoomRoute(scene: Scene, bird: Bird): void {
  const { rng, w, h } = scene;
  const big = zoomScale(scene);
  // Sapuan ke arah seberang posisi burung sekarang (tanpa berbalik)
  const side = bird.x < w / 2 ? 1 : -1;
  const ways: Way[] = [
    [w * (0.5 - side * rand(rng, 0.32, 0.42)), h * rand(rng, 0.18, 0.4), rand(rng, 0.5, 0.75)],
    [w * (0.5 - side * rand(rng, 0.05, 0.2)), h * rand(rng, 0.25, 0.5), big * 0.45],
    [w * (0.5 + side * rand(rng, 0, 0.12)), h * rand(rng, 0.35, 0.6), big],
    [w * (0.5 + side * 1.05), h * rand(rng, 0.3, 0.7), big * 1.1],
  ];
  setRoute(scene, bird, ways, rand(rng, 7, 8.5), 'zoom');
  bird.shed = false;
}

/** Babak baru: formasi, berputar, atau acak (berbeda dari babak sebelumnya), ±12–18 detik. */
function startAct(scene: Scene, kind: ActKind): void {
  const { rng, w, h, birds } = scene;
  const zooming = birds.filter((bird) => bird.task === 'zoom').map((bird) => bird.index);
  const free = birds.filter((bird) => bird.task !== 'zoom');
  const act: Act = {
    kind,
    until: scene.time + rand(rng, 12, 18),
    leader: free.length ? pick(free, rng).index : 0,
    style: pick(STYLES, rng),
    // Pusat orbit di kiri / kanan konten, sedikit di atas titik hilang: sisi dekatnya tetap di dalam layar
    centre: toWorld(scene, w * (rng() < 0.5 ? rand(rng, 0.26, 0.38) : rand(rng, 0.62, 0.74)), h * rand(rng, 0.3, 0.42), rand(rng, 0.62, 0.78)),
    spin: rng() < 0.5 ? 1 : -1,
    zoomAt: NaN,
    zoomBird: 0,
  };
  scene.act = act;
  if (kind !== 'formation' && rng() < 0.75) {
    act.zoomAt = scene.time + rand(rng, 2.5, 7);
    act.zoomBird = pick(birds, rng).index;
  }
  for (const bird of birds) {
    if (zooming.includes(bird.index)) continue;
    if (kind === 'formation') {
      if (bird.index === act.leader) leadRoute(scene, bird);
      else {
        bird.task = 'follow';
        bird.path = null;
      }
    } else if (kind === 'circle') {
      bird.orbit = [rand(rng, 0.28, 0.45), rand(rng, -1.2, 1.2)];
      orbitRoute(scene, bird);
    } else wanderRoute(scene, bird);
  }
  // Posisi formasi: urutan pengikut acak, eselon kadang ke kiri
  const followers = birds.filter((bird) => bird.index !== act.leader);
  const flip = rng() < 0.5;
  const mirror = rng() < 0.5 ? -1 : 1;
  followers.forEach((bird, i) => {
    const [back, sideways, up] = FORMATIONS[act.style].slots[flip ? 1 - i : i];
    bird.slot = [back, sideways * mirror, up];
    bird.rank = i + 1;
  });
  birds[act.leader].slot = [0, 0, 0];
  birds[act.leader].rank = 0;
}

/** Rute selesai: lanjutkan sesuai babak (tukikan yang selesai bergabung lagi dengan babaknya). */
function nextRoute(scene: Scene, bird: Bird): void {
  const { act } = scene;
  if (act.kind === 'formation') {
    if (bird.index === act.leader) leadRoute(scene, bird);
    else {
      bird.task = 'follow';
      bird.path = null;
    }
  } else if (act.kind === 'circle') orbitRoute(scene, bird);
  else wanderRoute(scene, bird);
}

/* ─── Langkah ─────────────────────────────────────────────────────────────── */

/** Pose & bentuk terbaru, posisi layar, kecepatan layar (untuk partikel). */
function place(scene: Scene, bird: Bird, dt: number): void {
  const { x, y, s } = project(scene, bird.pos);
  if (dt > 0 && bird.s > 0) {
    bird.vx = (x - bird.x) / dt;
    bird.vy = (y - bird.y) / dt;
  }
  bird.x = x;
  bird.y = y;
  bird.s = s;
  bird.geometry = birdGeometry(bird.pose, (scene.L0 * s) / scene.cell);
}

function emit(scene: Scene, particle: Omit<Particle, 'age' | 'seed'>): void {
  if (scene.particles.length >= MAX_PARTICLES) return;
  scene.particles.push({ ...particle, age: 0, seed: scene.rng() });
}

const spark = (scene: Scene, bird: Bird, x: number, y: number, small: boolean) => {
  const { rng } = scene;
  emit(scene, {
    kind: 'spark',
    x,
    y,
    vx: bird.vx * 0.08 + rand(rng, -10, 10),
    vy: bird.vy * 0.08 + rand(rng, -6, 10),
    life: small ? rand(rng, 0.45, 0.8) : rand(rng, 0.6, 1.1),
    size: clamp(bird.s * (small ? 0.75 : 1), 0.45, 2.2),
    phase: 0,
    freq: 0,
    amp: 0,
    fall: 0,
  });
};

const feather = (scene: Scene, bird: Bird) => {
  const { rng } = scene;
  const size = clamp(bird.s * 0.7, 0.8, 2.4);
  emit(scene, { kind: 'feather', x: bird.x, y: bird.y, vx: bird.vx * 0.15, vy: rand(rng, -10, 10), life: rand(rng, 4, 6), size, phase: rand(rng, 0, 6.28), freq: rand(rng, 1.4, 2), amp: rand(rng, 14, 22) * size, fall: rand(rng, 12, 18) * size });
};

/** Gerak burung: menempuh rutenya, atau (pengikut formasi) mengejar posisinya di belakang pemimpin dengan pegas teredam. */
function move(scene: Scene, bird: Bird, dt: number): void {
  const { L0 } = scene;
  if (bird.task === 'follow') {
    const leader = scene.birds[scene.act.leader];
    const tidy = FORMATIONS[scene.act.style].tidy;
    // Kerangka datar pemimpin dari arah geraknya yang dihaluskan: maju & kanan; posisi formasi + goyangan pelan (longgar)
    const flat = axpy(leader.heading, UP, -dot(leader.heading, UP));
    const f = Math.hypot(flat[0], flat[1], flat[2]) > 0.1 ? norm3(flat) : headingOf(leader.yaw, 0);
    const r: V3 = [f[1] * UP[2] - f[2] * UP[1], f[2] * UP[0] - f[0] * UP[2], f[0] * UP[1] - f[1] * UP[0]];
    const t = scene.time * (0.45 + 0.1 * bird.index);
    const sway = tidy ? 0.06 : 1;
    const [back, sideways, up] = bird.slot;
    let target = axpy(leader.pos, f, (back + 0.25 * sway * Math.sin(t)) * L0);
    target = axpy(target, r, -(sideways + 0.3 * sway * Math.sin(t * 0.7 + 1)) * L0);
    target = axpy(target, UP, (up + 0.25 * sway * Math.sin(t * 1.3 + 2)) * L0);
    // Pegas teredam kritis: menyusul tanpa memantul; formasi rapi lebih kaku (ω 3,2 vs 2,2 per detik)
    const w = tidy ? 3.2 : 2.2;
    for (let i = 0; i < 3; i++) {
      const accel = (target[i] - bird.pos[i]) * w * w + (leader.vel[i] - bird.vel[i]) * 2 * w;
      bird.vel[i] += accel * dt;
      bird.pos[i] += bird.vel[i] * dt;
    }
  } else if (bird.path) {
    const path = bird.path;
    const target = bird.cruise * depthSpeed(scene.F / Math.max(1, bird.pos[2]));
    bird.speed = approach(bird.speed, target, dt * 1.5);
    bird.dist = Math.min(path.total, bird.dist + bird.speed * dt);
    const next = pathAt(path, bird.dist);
    if (dt > 0) bird.vel = [(next[0] - bird.pos[0]) / dt, (next[1] - bird.pos[1]) / dt, (next[2] - bird.pos[2]) / dt];
    bird.pos = next;
  }
  // Tidak pernah menembus kamera
  bird.pos[2] = Math.max(bird.pos[2], scene.F / maxScale(scene));
}

function stepBird(scene: Scene, bird: Bird, dt: number): void {
  const { rng, L0 } = scene;
  move(scene, bird, dt);

  // Arah gerak dihaluskan (belok & tukik melengkung), lalu hadap & dongak darinya; bank dari laju belok yang dihaluskan:
  // miring ke dalam belokan, kembali datar perlahan
  const speed = Math.hypot(bird.vel[0], bird.vel[1], bird.vel[2]);
  if (speed > 1) {
    const now: V3 = [bird.vel[0] / speed, bird.vel[1] / speed, bird.vel[2] / speed];
    bird.heading = bird.steady ? norm3(mix3(bird.heading, now, clamp01(dt * 4))) : now;
    if (!bird.steady) bird.yaw = Math.atan2(dot(now, FLAT_Z), dot(now, FLAT_X));
    bird.steady = true;
  }
  const dir = bird.heading;
  const fx = dot(dir, FLAT_X);
  const fz = dot(dir, FLAT_Z);
  const climb = Math.asin(clamp(dot(dir, UP), -1, 1));
  const prevYaw = bird.yaw;
  // Laju putar dibatasi (±2,4 rad/detik) dan melemah saat gerak hampir tegak (arah datar tak menentu)
  const flatness = smooth(0.12, 0.45, Math.hypot(fx, fz));
  if (flatness > 0) bird.yaw += clamp(angleDiff(Math.atan2(fz, fx), bird.yaw) * clamp01(dt * 6) * flatness, -2.4 * dt, 2.4 * dt);
  bird.pitch = approach(bird.pitch, clamp(climb, -0.6, 0.6), dt * 3);
  bird.turn = approach(bird.turn, dt > 0 ? angleDiff(bird.yaw, prevYaw) / dt : 0, dt * 3);
  const yawRate = bird.turn;
  const bank = clamp(yawRate * 0.7, -0.85, 0.85) - bird.roll;
  bird.roll += clamp(bank * clamp01(dt * 2.5), -1.4 * dt, 1.4 * dt);
  // Menukik: sayap sedikit dilipat & tersapu ke belakang, lebih banyak meluncur
  const dive = smooth(0.15, 0.45, -climb);

  // Kepakan: lebih cepat & kuat saat menanjak; meluncur bila mendatar / menurun, lebih sering saat berputar (melayang)
  const soaring = bird.task === 'orbit';
  const power = 1 + clamp(climb * 1.5, 0, 0.35);
  const leader = scene.birds[scene.act.leader];
  const inStep = bird.task === 'follow' && FORMATIONS[scene.act.style].tidy;
  const hz = (1.5 + 0.6 * clamp01(climb * 2)) * (inStep ? leader.hzScale : bird.hzScale) * (soaring ? 0.9 : 1);
  const canGlide = climb < 0.1;
  bird.modeLeft -= dt;
  if (bird.gliding) {
    if (bird.modeLeft <= 0 || !canGlide) {
      bird.gliding = false;
      bird.modeLeft = soaring ? rand(rng, 1, 2) : rand(rng, 1.8, 3.6);
    }
  } else if (canGlide && (bird.modeLeft <= 0 || dive > 0.5) && bird.phase > 0.8 && bird.phase < 0.97) {
    // Mulai meluncur di akhir upstroke (sayap sedang naik ke posisi terbentang)
    bird.gliding = true;
    bird.modeLeft = soaring ? rand(rng, 2.5, 4.5) : rand(rng, 1.2, 2.6) + (climb < -0.1 ? 1 : 0);
  }
  // Formasi rapi: meluncur & mengepak bersama pemimpin, fase sedikit bergeser per urutan (gelombang kecil di formasi)
  if (inStep) bird.gliding = leader.gliding;
  bird.glide = approach(bird.glide, bird.gliding ? 1 : 0, dt * 2.4);
  const g = bird.glide;
  const before = bird.phase;
  bird.phase = wrap(bird.phase + dt * hz * (1 - 0.9 * g));
  if (inStep) {
    const lag = wrap(wrap(leader.phase - 0.07 * bird.rank) - bird.phase + 0.5) - 0.5;
    bird.phase = wrap(bird.phase + lag * clamp01(dt * 2.5));
  }

  const pose = bird.pose;
  flapWings(bird.phase, power, pose);
  pose.arm = lerp(pose.arm, deg(7) + deg(2) * Math.sin(scene.time * 1.3 + bird.index), g);
  pose.hand = lerp(pose.hand, deg(13), g);
  pose.fold = lerp(pose.fold, 0.05, g);
  pose.sweep = lerp(pose.sweep, -deg(2), g) - deg(14) * dive * g;
  pose.fold = Math.max(pose.fold, 0.32 * dive * g);
  pose.yaw = bird.yaw;
  pose.roll = bird.roll;
  pose.pitch = bird.pitch * 0.7 + deg(3) * Math.cos(2 * Math.PI * bird.phase) * (1 - g);
  pose.tail = 0.25 + 0.2 * (1 - g) + 0.3 * clamp01(Math.abs(yawRate) * 0.8);
  pose.tailPitch = -clamp(bird.pitch, -0.3, 0.3) * 0.3;
  // Kepala tetap datar & melirik ke dalam belokan; saat sangat dekat menoleh ke kamera (menghadap kanan layar = sisi
  // kanan burung ke kamera → menoleh ke kanan)
  const near = smooth(1.6, 2.6, bird.s);
  pose.headYaw = clamp(yawRate * 0.25, -0.5, 0.5) * (1 - near) + 0.55 * Math.cos(bird.yaw) * near;
  pose.headPitch = -pose.pitch * 0.65;

  // Badan naik tiap downstroke
  const bob = 0.03 * Math.sin(2 * Math.PI * (bird.phase - 0.08)) * (1 - g) * power;
  const pos = bird.pos;
  bird.pos = axpy(pos, UP, bob * L0);
  place(scene, bird, dt);
  bird.pos = pos;

  // Kilau dari ujung sayap: tiap akhir downstroke, dan jejak tipis saat meluncur (jarang: tidak ramai)
  const geo = bird.geometry!;
  const bodyPx = L0 * bird.s;
  const visible = bird.x > -bodyPx && bird.x < scene.w + bodyPx && bird.y > -bodyPx && bird.y < scene.h + bodyPx;
  const tipAt = (i: number): [number, number] => [bird.x + geo.tips[i][0] * bodyPx, bird.y + geo.tips[i][1] * bodyPx];
  if (visible && g < 0.5 && before < DOWNSTROKE && bird.phase >= DOWNSTROKE) {
    for (let i = 0; i < 2; i++) if (rng() < 0.45) spark(scene, bird, ...tipAt(i), false);
  }
  bird.trailIn -= dt;
  if (visible && g > 0.6 && bird.trailIn <= 0) {
    bird.trailIn = 0.12;
    if (rng() < 0.3) spark(scene, bird, ...tipAt(rng() < 0.5 ? 0 : 1), true);
  }
  // Melintas sangat dekat: kadang sehelai bulu lepas
  if (visible && bird.task === 'zoom' && !bird.shed && bird.s > zoomScale(scene) * 0.6) {
    bird.shed = true;
    if (rng() < 0.6) feather(scene, bird);
  }

  if (bird.path && bird.dist >= bird.path.total) nextRoute(scene, bird);
}

function stepParticles(scene: Scene, dt: number): void {
  const list = scene.particles;
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.age += dt;
    if (p.kind === 'spark') {
      p.vx *= 1 - clamp01(dt * 1.6);
      p.vy += 14 * dt;
    } else {
      // Bulu: jatuh pelan sambil berayun; melambat di ujung ayunan
      p.phase += p.freq * dt;
      p.vx *= 1 - clamp01(dt * 0.8);
      p.vy = approach(p.vy, p.fall * (0.55 + 0.45 * Math.abs(Math.cos(p.phase))), dt * 2);
      p.x += p.amp * p.freq * Math.cos(p.phase) * dt;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.age >= p.life || p.y > scene.h + 30 || p.x < -60 || p.x > scene.w + 60) list.splice(i, 1);
  }
}

/** Satu langkah simulasi (`dt` detik, sudah dibatasi pemanggil). */
export function stepScene(scene: Scene, dt: number): void {
  scene.time += dt;
  const { act } = scene;
  if (scene.time >= act.until) {
    const kinds: ActKind[] = ['formation', 'circle', 'wander'];
    startAct(scene, pick(kinds.filter((kind) => kind !== act.kind), scene.rng));
  } else if (scene.time >= act.zoomAt) {
    // Tukikan terjadwal (hanya di babak berputar / acak)
    act.zoomAt = NaN;
    zoomRoute(scene, scene.birds[act.zoomBird]);
  }
  for (const bird of scene.birds) stepBird(scene, bird, dt);
  stepParticles(scene, dt);
}

/** Bentuk tiap burung di pose & posisinya sekarang (adegan diam, setelah tata letak berubah). */
function refresh(scene: Scene): void {
  for (const bird of scene.birds) place(scene, bird, 0);
}

/**
 * Adegan diam (reduced motion): tiga burung meluncur di langit, satu dekat di sisi kanan, dua lebih jauh di kiri & atas,
 * tidak di belakang judul.
 */
export function stillScene(w: number, h: number, options: SceneOptions = {}): Scene {
  const scene = createScene(w, h, { ...options, rng: options.rng ?? (() => 0.5) });
  const { content } = scene;
  const spots: Way[] = [
    [(content.r + w) / 2, h * 0.42, w < 640 ? 0.7 : 1.1],
    [content.l / 2, h * 0.22, 0.5],
    [w * 0.7, h * 0.19, 0.32],
  ];
  scene.birds.forEach((bird, i) => {
    const [x, y, s] = spots[i];
    bird.yaw = i === 1 ? -0.4 : Math.PI + 0.3;
    bird.pose = { ...restPose(), yaw: bird.yaw, roll: i === 0 ? 0.12 : 0 };
    bird.pos = toWorld(scene, x, y, Math.max(minScale(scene), s));
  });
  refresh(scene);
  return scene;
}
