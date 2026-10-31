// Koreografi tiga burung Garuda ASCII di latar hero Prompt AI (GarudaAscii.tsx), dibuat sinematik & alami: kadang terbang
// serempak dalam formasi (longgar atau rapi), kadang berputar-putar mengitari satu titik seperti elang melayang, kadang
// acak ke sana kemari; kadang menjauh kecil di langit, sering mendekat besar ke arah layar sampai seukuran layar lalu
// keluar dan kembali. Sesekali satu burung (bentuk elang Jawa berjambul) hinggap di sisi kiri / kanan hero, setinggi
// hero, di sebuah dahan: mendarat, berteriak, berbalik menghadap halaman, menoleh, berkedip, mengepakkan sayap, berteriak
// lagi, lalu terbang lagi. Murni (tanpa DOM, angka acak
// disuntikkan) supaya bisa diuji; model & rasterisasinya di garudaSprites.ts, menggambarnya di garudaEngine.ts.
// - Kedalaman: titik dunia (x, y, z) px → layar dengan skala s = F / z, jadi burung yang menjauh mengecil dan yang
//   mendekat membesar secara halus; laju dunia ∝ s^−0,65 (jauh pelan di layar, dekat tidak melesat).
// - Terbang alami (steering): burung selalu menghadap arah terbangnya dan memutar arah itu menuju titik sasaran dengan
//   laju putar terbatas, jadi tiap belokan berupa lengkung lebar yang mulus; laju berubah perlahan, makin cepat saat
//   menukik dan melambat saat menanjak; bank mengikuti laju belok. Sasaran berikutnya dipilih sebelum yang sekarang
//   tercapai persis, jadi tidak ada patahan.
// - Babak (bergantian acak, ±12–18 detik): FORMASI = satu pemimpin terbang ke titik-titik acak, dua lainnya mengikuti
//   dengan pegas teredam, kadang longgar (bergoyang), kadang rapi (V, eselon miring, berjajar: posisi tepat, kepakan &
//   luncuran serempak); BERPUTAR = tiap burung mengejar titik di depannya pada lingkaran yang sama (jari-jari &
//   ketinggian sendiri, lebih banyak meluncur); ACAK = tiap burung ke titik acak sendiri (jauh, sedang, dekat, rendah).
// - Tukikan ke layar (±tiap 7–11 detik, di luar formasi): mendekat dari satu sisi, membesar sampai seukuran layar, lalu
//   melewati tepi seberang dan kembali dari sana sambil menjauh.
// - Bertengger: titik kaki di sisi yang lega (kiri / kanan konten), skala dipilih supaya tinggi burung ≈ tinggi hero.
//   Mendarat = kurva Hermite dari posisi & kecepatan burung ke dahan (melambat sampai diam, badan mendongak, sayap
//   mengerem, kaki terjulur), dahan melentur (pegas); lepas landas = jongkok, sayap terbuka, kurva Hermite yang
//   dipercepat, lalu kembali ke babak. Di HP / layar sempit tidak bertengger (tidak ada ruang di samping konten).
// - Kepakan: downstroke (lebih lama) → upstroke dengan easing kosinus, ujung sayap menyusul lengan (gelombang), sayap
//   setengah terlipat & tersapu ke belakang saat upstroke; meluncur dengan peralihan halus; menukik = sayap dilipat.
// - Partikel (halus, sedikit): kilau dari ujung sayap, bulu yang lepas saat melintas sangat dekat / mendarat / mengepak.
import { FLAT_X, FLAT_Z, UP, birdGeometry, footOf, shapesBounds, type BirdGeometry, type BirdPose, type Vec3 } from './garudaSprites';

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

/** Titik jalan di layar: x, y (px), skala. */
export type Way = [number, number, number];

export type ActKind = 'formation' | 'circle' | 'wander';
/** Gaya formasi: longgar (bergoyang), V rapi, eselon (diagonal), berjajar. */
export type FormationStyle = 'loose' | 'v' | 'echelon' | 'line';
/** Tugas burung: acak, mengorbit, memimpin / mengikuti formasi, menukik ke layar, bertengger. */
export type Task = 'wander' | 'orbit' | 'lead' | 'follow' | 'zoom' | 'perch';

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
}

/** Kurva Hermite di dunia (mendarat / lepas landas): titik & turunan di kedua ujung, lama (detik), bank awal. */
interface Curve {
  p0: V3;
  v0: V3;
  p1: V3;
  v1: V3;
  dur: number;
  roll0?: number;
}

/** Burung yang sedang bertengger (paling banyak satu) dan dahannya. */
export interface Perch {
  bird: number;
  /** −1 = sisi kiri hero, +1 = kanan; `inward` = arah ke konten. */
  side: 1 | -1;
  inward: 1 | -1;
  /** Titik telapak kaki di layar (px) dan skala burung saat bertengger. */
  x: number;
  y: number;
  s: number;
  phase: 'approach' | 'land' | 'sit' | 'launch' | 'leave';
  /** Lama fase sekarang (detik). */
  t: number;
  curve: Curve | null;
  /** Lama bertengger (detik). */
  sitFor: number;
  /** Arah hadap saat bertengger (berbalik dari menghadap tepi ke menghadap halaman). */
  yaw: number;
  crouch: number;
  turn: { from: number; to: number; t: number } | null;
  action: { kind: 'scream' | 'spread' | 'flick'; t: number; dur: number; shed: boolean } | null;
  /** Teriakan pertama setelah mendarat sudah terjadi. */
  called: boolean;
  actionIn: number;
  headYaw: number;
  headPitch: number;
  aimYaw: number;
  aimPitch: number;
  aimIn: number;
  blinkIn: number;
  blinkT: number;
  /** Pegas dahan: lendutan di titik kaki (px, + ke bawah) dan kecepatannya. */
  bend: number;
  bendV: number;
  /** Dahan tampil 0..1 (muncul saat burung mendekat, memudar setelah pergi). */
  show: number;
}

export interface Bird {
  index: number;
  task: Task;
  /** Pusat badan di dunia (koordinat kamera, px; z = jarak), kecepatan (px dunia/detik), arah terbang (satuan), laju. */
  pos: V3;
  vel: V3;
  heading: V3;
  speed: number;
  /** Laju jelajah (px layar/detik di s = 1). */
  cruise: number;
  /** Titik sasaran berikutnya (dunia). */
  targets: V3[];
  /** Posisi di formasi relatif pemimpin (panjang badan: belakang, samping kanan, atas) dan urutannya (0 = pemimpin). */
  slot: V3;
  rank: number;
  /** Orbit: jari-jari (× jarak pusat) dan ketinggian (panjang badan) burung ini. */
  orbit: [number, number];
  /** Pengali frekuensi kepakan (tiap burung sedikit beda). */
  hzScale: number;
  /** Arah hadap, dongak, bank (radian, dihaluskan) dan laju belok yang dihaluskan (radian/detik). */
  yaw: number;
  pitch: number;
  roll: number;
  yawRate: number;
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
  /** Batas atas ruang bertengger (px dari atas kanvas): bawah navbar & banner promo, supaya kepala tidak tertutup. */
  ceiling: number;
  birds: Bird[];
  particles: Particle[];
  act: Act;
  perch: Perch | null;
  /** Waktu adegan bertengger berikutnya (Infinity = tidak ada ruang), sisi berikutnya, tukikan berikutnya. */
  perchAt: number;
  perchSide: 1 | -1;
  zoomAt: number;
  time: number;
  rng: () => number;
}

export const BIRDS = 3;
export const MAX_PARTICLES = 60;
/** Bagian siklus kepakan yang berupa downstroke (lebih lama dari upstroke, seperti burung sungguhan). */
export const DOWNSTROKE = 0.54;
export const SETTLE_SECONDS = 0.9;
export const CROUCH_SECONDS = 0.5;
export const TURN_SECONDS = 1;
/** Laju putar arah terbang maksimum per tugas (radian/detik): lengkung lebar = belok mulus. */
const TURN_RATE: Record<Task, number> = { wander: 1, lead: 0.75, orbit: 0.8, zoom: 1.15, follow: 0, perch: 1.3 };

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
const sub = (a: Vec3, b: Vec3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale3 = (a: Vec3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const mix3 = (a: Vec3, b: Vec3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const len3 = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
const norm3 = (a: Vec3): V3 => {
  const n = len3(a) || 1;
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
  blink: 0,
  beak: 0,
  crest: 0,
});

/** Bertengger (elang Jawa): badan hampir tegak ±74°, kepala datar, jambul berdiri, sayap terlipat, ekor menjuntai lurus. */
export const PERCH_POSE: BirdPose = { ...restPose(), pitch: deg(74), arm: deg(-78), hand: deg(-78), fold: 1, tail: 0.05, tailPitch: deg(10), grip: 1, headPitch: deg(-58), crest: 0.3 };
/** Saat menyentuh dahan: sayap terangkat tinggi & maju, ekor mengembang menunduk, kaki menapak, sedikit jongkok. */
const TOUCHDOWN: BirdPose = { ...restPose(), pitch: deg(50), arm: deg(56), hand: deg(68), fold: 0, sweep: deg(14), tail: 1, tailPitch: deg(28), legs: 1, grip: 1, crouch: 0.35, headPitch: deg(-42) };
/** Akhir jongkok sebelum melompat dari dahan (= awal kurva lepas landas). */
const LAUNCH: BirdPose = { ...TOUCHDOWN, pitch: deg(36), sweep: deg(6), crouch: 1, headPitch: deg(-30) };

const POSE_KEYS = Object.keys(restPose()) as Array<keyof BirdPose>;

/** Campur dua pose (`t` 0 = a, 1 = b) ke `out`; arah hadap lewat sudut terpendek. */
export function mixPose(a: BirdPose, b: BirdPose, t: number, out: BirdPose): BirdPose {
  for (const key of POSE_KEYS) out[key] = key === 'yaw' ? a.yaw + angleDiff(b.yaw, a.yaw) * t : lerp(a[key], b[key], t);
  return out;
}

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

/* ─── Geometri ────────────────────────────────────────────────────────────── */

/** Arah `h` diputar menuju `want` paling banyak `maxAngle` radian (di bidang keduanya): belok dengan laju terbatas. */
export function turnToward(h: Vec3, want: Vec3, maxAngle: number): V3 {
  const c = clamp(dot(h, want), -1, 1);
  const angle = Math.acos(c);
  if (angle <= maxAngle) return [want[0], want[1], want[2]];
  let side = sub(want, scale3(h, c));
  // Tepat berlawanan: putar lewat arah datar ke samping
  if (len3(side) < 1e-6) side = [h[1] * UP[2] - h[2] * UP[1], h[2] * UP[0] - h[0] * UP[2], h[0] * UP[1] - h[1] * UP[0]];
  side = norm3(side);
  return norm3(axpy(scale3(h, Math.cos(maxAngle)), side, Math.sin(maxAngle)));
}

/** Kurva Hermite kubik: posisi pada parameter `u` 0..1. */
export function hermite(c: Curve, u: number): V3 {
  const u2 = u * u;
  const u3 = u2 * u;
  const a = 2 * u3 - 3 * u2 + 1;
  const b = u3 - 2 * u2 + u;
  const d = -2 * u3 + 3 * u2;
  const e = u3 - u2;
  return [0, 1, 2].map((i) => a * c.p0[i] + b * c.v0[i] + d * c.p1[i] + e * c.v1[i]) as V3;
}

/** Turunan kurva Hermite terhadap `u`. */
function hermiteSlope(c: Curve, u: number): V3 {
  const u2 = u * u;
  const a = 6 * u2 - 6 * u;
  const b = 3 * u2 - 4 * u + 1;
  const d = -6 * u2 + 6 * u;
  const e = 3 * u2 - 2 * u;
  return [0, 1, 2].map((i) => a * c.p0[i] + b * c.v0[i] + d * c.p1[i] + e * c.v1[i]) as V3;
}

/** Panjang badan burung (px) di s = 1 untuk lebar hero `w` (HP: relatif lebih besar, kontennya selebar layar). */
export const birdLength = (w: number): number => clamp(Math.round(w * 0.12), 70, 168);

/** Skala tukikan terdekat: rentang sayap (±2 panjang badan) kira-kira selebar layar. */
export const zoomScale = (scene: Pick<Scene, 'w' | 'L0'>): number => clamp((scene.w * 0.5) / scene.L0, 2.6, 5.5);

/** Skala terkecil supaya burung terjauh masih ±18 px (beberapa glyph). */
const minScale = (scene: Scene) => 18 / scene.L0;
/**
 * Skala terbesar yang boleh dicapai: burung tidak pernah sampai di belakang kamera, dan burung bertengger (tegak, kaki →
 * puncak kepala ±0,55 panjang badan) bisa setinggi hero.
 */
export const maxScale = (scene: Pick<Scene, 'w' | 'L0' | 'h'>) => Math.max(zoomScale(scene) * 1.25, (scene.h * 2.2) / scene.L0);
/** Skala terbesar saat terbang (tukikan paling dekat). */
const flightMax = (scene: Pick<Scene, 'w' | 'L0'>) => zoomScale(scene) * 1.25;

/** Laju dunia relatif terhadap skala: jauh sedikit lebih cepat di dunia (tetap bergerak di layar), dekat lebih pelan. */
const depthSpeed = (s: number) => Math.pow(clamp(s, 0.1, 8), -0.65);

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

const newBird = (index: number, rng: () => number, L0: number): Bird => ({
  index,
  task: 'wander',
  pos: [0, 0, 1e4],
  vel: [0, 0, 0],
  heading: [1, 0, 0],
  speed: 0,
  cruise: L0 * rand(rng, 2.2, 2.7),
  targets: [],
  slot: [0, 0, 0],
  rank: 0,
  orbit: [0.4, 0],
  hzScale: rand(rng, 0.9, 1.12),
  yaw: 0,
  pitch: 0,
  roll: 0,
  yawRate: 0,
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
  /** Bawah elemen bertanda data-garuda-ceiling (px, relatif kanvas): navbar & banner promo di atas hero. */
  ceiling?: number;
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

/** Adegan baru: ketiga burung masuk bersama dari tepi layar dalam formasi, lalu babak-babak acak. */
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
    ceiling: options.ceiling ?? 0,
    birds: [],
    particles: [],
    act: { kind: 'formation', until: 0, leader: 0, style: 'loose', centre: [0, 0, 1], spin: 1 },
    perch: null,
    perchAt: rand(rng, 9, 13),
    perchSide: rng() < 0.5 ? 1 : -1,
    zoomAt: rand(rng, 4, 7),
    time: 0,
    rng,
  };
  scene.birds = Array.from({ length: BIRDS }, (_, i) => newBird(i, rng, L0));
  // Masuk dari tepi layar (sisi acak) pada jarak sedang: langsung terlihat begitu hero tampil
  const side = rng() < 0.5 ? 1 : -1;
  const s = Math.max(minScale(scene), 0.45);
  const entry = toWorld(scene, side > 0 ? w * 1.06 : -w * 0.06, h * rand(rng, 0.18, 0.3), s);
  for (const bird of scene.birds) {
    bird.pos = [entry[0], entry[1], entry[2]];
    bird.speed = bird.cruise * depthSpeed(s);
  }
  startAct(scene, 'formation');
  // Babak pertama lebih singkat; semua burung awalnya menghadap sasaran pertama pemimpin
  scene.act.until = rand(rng, 8, 11);
  const first = scene.birds[scene.act.leader].targets[0];
  for (const bird of scene.birds) {
    bird.heading = norm3(sub(first ?? [0, 0, scene.F], bird.pos));
    bird.vel = scale3(bird.heading, bird.speed);
  }
  return scene;
}

/* ─── Sasaran ─────────────────────────────────────────────────────────────── */

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

const worldWays = (scene: Scene, ways: readonly Way[]): V3[] =>
  ways.map(([x, y, s]) => toWorld(scene, x, y, clamp(s, minScale(scene), flightMax(scene))));

/** Sumbu kedalaman kamera: orbit di bidang ini, jadi sisi dekatnya tidak naik keluar dari atas layar. */
const DEPTH: Vec3 = [0, 0, 1];

/** Titik di lingkaran orbit burung ini, `ahead` radian di depan posisinya sekarang (wortel yang dikejar = putaran mulus). */
function orbitPoint(scene: Scene, bird: Bird, ahead: number): V3 {
  const { centre, spin } = scene.act;
  const [radiusK, height] = bird.orbit;
  const radius = centre[2] * radiusK;
  const rel = sub(bird.pos, centre);
  const a = Math.atan2(dot(rel, DEPTH), dot(rel, FLAT_X)) + spin * ahead;
  // Naik-turun sedikit sepanjang putaran supaya tidak seperti piringan
  const bob = Math.sin(a * 2) * 0.35 * scene.L0;
  const p = axpy(axpy(axpy(centre, FLAT_X, Math.cos(a) * radius), DEPTH, Math.sin(a) * radius), UP, height * scene.L0 + bob);
  p[2] = Math.max(p[2], scene.F / flightMax(scene));
  return p;
}

/** Tugas burung sesuai babak sekarang (formasi: pemimpin / pengikut; berputar; acak), dengan sasaran barunya. */
function assignTask(scene: Scene, bird: Bird): void {
  const { act } = scene;
  bird.targets = [];
  if (act.kind === 'formation') bird.task = bird.index === act.leader ? 'lead' : 'follow';
  else bird.task = act.kind === 'circle' ? 'orbit' : 'wander';
  nextTargets(scene, bird);
}

/** Sasaran berikutnya setelah yang ada habis. Tukikan yang selesai bergabung lagi dengan babaknya. */
function nextTargets(scene: Scene, bird: Bird): void {
  const { rng } = scene;
  if (bird.task === 'wander') bird.targets = worldWays(scene, randomWays(scene, bird, 2 + Math.floor(rng() * 2), ['far', 'mid', 'near', 'low', 'side']));
  else if (bird.task === 'lead') bird.targets = worldWays(scene, randomWays(scene, bird, 3, ['far', 'mid', 'near', 'side']));
  else if (bird.task === 'orbit') bird.targets = [orbitPoint(scene, bird, 0.9)];
  else if (bird.task === 'zoom') assignTask(scene, bird);
}

/**
 * Tukikan ke layar: dari sisi tempat burung berada, mendekat, menukik ke kamera sampai seukuran layar di dekat tengah,
 * terus melewati tepi seberang (keluar). Setelah itu burung kembali dari luar tepi itu sambil menjauh.
 */
function startZoom(scene: Scene, bird: Bird): void {
  const { rng, w, h } = scene;
  const big = zoomScale(scene);
  const side = bird.x < w / 2 ? 1 : -1;
  bird.task = 'zoom';
  bird.shed = false;
  bird.targets = worldWays(scene, [
    [w * (0.5 - side * rand(rng, 0.15, 0.28)), h * rand(rng, 0.25, 0.5), rand(rng, 1, 1.4)],
    [w * (0.5 + side * rand(rng, 0, 0.1)), h * rand(rng, 0.35, 0.6), big],
    [w * (0.5 + side * 1.05), h * rand(rng, 0.3, 0.7), big * 1.1],
  ]);
}

/** Babak baru: formasi, berputar, atau acak, ±12–18 detik (burung yang menukik / bertengger menyusul nanti). */
function startAct(scene: Scene, kind: ActKind): void {
  const { rng, w, h, birds } = scene;
  const busy = (bird: Bird) => bird.task === 'zoom' || bird.task === 'perch';
  const free = birds.filter((bird) => !busy(bird));
  const act: Act = {
    kind,
    until: scene.time + rand(rng, 12, 18),
    leader: free.length ? pick(free, rng).index : 0,
    style: pick(STYLES, rng),
    // Pusat orbit di kiri / kanan konten, sedikit di atas titik hilang: sisi dekatnya tetap di dalam layar
    centre: toWorld(scene, w * (rng() < 0.5 ? rand(rng, 0.26, 0.38) : rand(rng, 0.62, 0.74)), h * rand(rng, 0.3, 0.42), rand(rng, 0.62, 0.78)),
    spin: rng() < 0.5 ? 1 : -1,
  };
  scene.act = act;
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
  for (const bird of free) {
    if (kind === 'circle') bird.orbit = [rand(rng, 0.28, 0.45), rand(rng, -1.2, 1.2)];
    assignTask(scene, bird);
  }
}

/* ─── Bertengger ──────────────────────────────────────────────────────────── */

/**
 * Hadap saat bertengger: menghadap halaman, dan saat mendarat menghadap tepi; keduanya ¾ ke arah kamera (seperti foto
 * elang bertengger) supaya dada bergurat, perut bergaris, wajah & paruh terlihat. Berbalik melewati hadap depan.
 */
const PERCH_TURN = 0.6;
const inwardYaw = (inward: 1 | -1) => (inward > 0 ? PERCH_TURN : Math.PI - PERCH_TURN);
const outwardYaw = (inward: 1 | -1) => (inward > 0 ? Math.PI - PERCH_TURN : PERCH_TURN);

/**
 * Tempat bertengger di sisi `side`: telapak kaki di atas pudar bawah hero, skala supaya tinggi burung ≈ tinggi hero
 * selama lebarnya muat di ruang samping konten (punggung & ekor paling banyak ±35% keluar dari tepi layar, seperti
 * dipotong bingkai kamera; kepala & dada di sisi dalam; layar lebar ≈ setinggi hero, layar 1366 px lebih kecil tapi tetap
 * terlihat sebagai burung). null = tidak ada ruang (HP, tablet).
 */
export function perchLayout(scene: Scene, side: 1 | -1): Pick<Perch, 'side' | 'inward' | 'x' | 'y' | 's'> | null {
  const { w, h, content, L0 } = scene;
  const room = side < 0 ? content.l - 16 : w - content.r - 16;
  if (w < 900 || room < 200 || h < 420) return null;
  const inward: 1 | -1 = side < 0 ? 1 : -1;
  const pose = { ...PERCH_POSE, yaw: inwardYaw(inward) };
  const [x0, y0, x1] = shapesBounds(birdGeometry(pose, 20).shapes);
  const foot = footOf(pose);
  const footY = h - 104;
  // Puncak kepala & jambul di bawah navbar / banner promo (sedikit jarak untuk kepala yang mendongak saat berteriak)
  const top = Math.max(h * 0.03, scene.ceiling + 14);
  if (footY - top < 240) return null;
  const bodyPx = Math.min((footY - top) / (foot[1] - y0), (room * 1.55) / (x1 - x0), L0 * maxScale(scene) * 0.95);
  const left = (x0 - foot[0]) * bodyPx;
  const right = (x1 - foot[0]) * bodyPx;
  let x: number;
  if (side < 0) x = right - left > room ? room - right : room / 2 - (left + right) / 2;
  else x = right - left > room ? w - room - left : w - room / 2 - (left + right) / 2;
  return { side, inward, x, y: footY, s: bodyPx / L0 };
}

/** Pusat badan supaya telapak kaki pose `pose` tepat di dahan (jarak = jarak dahan, jadi kaki tidak bergeser di layar). */
function perchCentre(scene: Scene, perch: Perch, pose: BirdPose, hop = 0): V3 {
  const foot = footOf(pose);
  const p = toWorld(scene, perch.x, perch.y + perch.bend, perch.s);
  return [p[0] - foot[0] * scene.L0 - UP[0] * hop * scene.L0, p[1] - foot[1] * scene.L0 - UP[1] * hop * scene.L0, p[2]];
}

function startPerch(scene: Scene, bird: Bird, layout: Pick<Perch, 'side' | 'inward' | 'x' | 'y' | 's'>): void {
  const { w, h, rng } = scene;
  scene.perch = {
    ...layout,
    bird: bird.index,
    phase: 'approach',
    t: 0,
    curve: null,
    sitFor: rand(rng, 9, 14),
    yaw: outwardYaw(layout.inward),
    crouch: 0,
    turn: null,
    action: null,
    actionIn: 0,
    called: false,
    headYaw: 0,
    headPitch: 0,
    aimYaw: 0,
    aimPitch: 0,
    aimIn: 1,
    blinkIn: rand(rng, 1.5, 3),
    blinkT: 1,
    bend: 0,
    bendV: 0,
    show: 0,
  };
  scene.perchSide = layout.side > 0 ? -1 : 1;
  bird.task = 'perch';
  // Mendekat dari arah halaman, masih jauh (kecil), lalu kurva mendarat membawanya membesar ke dahan
  const { x, y, s, inward } = layout;
  bird.targets = worldWays(scene, [
    [x + inward * w * 0.36, y - h * 0.62, s * 0.3],
    [x + inward * w * 0.22, y - h * 0.5, s * 0.45],
  ]);
}

/** Kurva mendarat: dari posisi & kecepatan burung ke dahan, melambat sampai diam dengan kaki menapak. */
function beginLanding(scene: Scene, bird: Bird, perch: Perch): void {
  const touch = { ...TOUCHDOWN, yaw: outwardYaw(perch.inward) };
  const p1 = perchCentre(scene, perch, touch);
  const dist = len3(sub(p1, bird.pos));
  const dur = clamp((dist / Math.max(bird.speed, 1)) * 1.7, 1.5, 2.6);
  // u = 1 − (1 − τ)² → du/dτ = 2 di awal: turunan awal = kecepatan × lama / 2 supaya laju tidak melompat
  const outward = headingOf(outwardYaw(perch.inward), 0);
  const down: V3 = [-UP[0], -UP[1], -UP[2]];
  perch.curve = { p0: [...bird.pos] as V3, v0: scale3(bird.vel, dur / 2), p1, v1: scale3(norm3(axpy(scale3(outward, 0.6), down, 0.5)), dist * 0.4), dur, roll0: bird.roll };
  perch.phase = 'land';
  perch.t = 0;
}

/** Kurva lepas landas: dari dahan ke depan-atas (ke arah halaman, menjauh), dipercepat dari diam. */
function beginLaunch(scene: Scene, bird: Bird, perch: Perch): void {
  const { w, h } = scene;
  const p1 = toWorld(scene, perch.x + perch.inward * w * 0.3, perch.y - h * 0.55, perch.s * 0.5);
  const dist = len3(sub(p1, bird.pos));
  const up = headingOf(perch.yaw, 0.7);
  perch.curve = { p0: [...bird.pos] as V3, v0: scale3(up, dist * 0.5), p1, v1: scale3(norm3(sub(p1, bird.pos)), dist * 0.45), dur: 1.8 };
  perch.phase = 'launch';
  perch.t = 0;
  perch.bendV += 0.06 * perch.s * scene.L0;
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

/**
 * Terbang menuju sasaran (steering): arah terbang diputar menuju sasaran dengan laju putar terbatas; sasaran dianggap
 * tercapai dalam radius selebar lengkung belok (dibatasi oleh jaraknya dari kamera), lalu sasaran berikutnya.
 * Mengembalikan true bila sasaran habis (bertengger: saatnya mendarat).
 */
function steer(scene: Scene, bird: Bird, dt: number): boolean {
  const rate = TURN_RATE[bird.task];
  if (!bird.targets.length && bird.task !== 'perch') nextTargets(scene, bird);
  let target = bird.targets[0];
  if (target) {
    const reach = Math.min(Math.max(0.6 * scene.L0, (1.1 * bird.speed) / rate), 0.35 * target[2]);
    if (len3(sub(target, bird.pos)) < reach) {
      bird.targets.shift();
      if (!bird.targets.length && bird.task !== 'perch') nextTargets(scene, bird);
      target = bird.targets[0];
    }
  }
  if (target) bird.heading = turnToward(bird.heading, norm3(sub(target, bird.pos)), rate * dt);
  const s = scene.F / Math.max(1, bird.pos[2]);
  const climb = dot(bird.heading, UP);
  // Lebih cepat saat menukik, melambat saat menanjak; berubah perlahan
  const desired = bird.cruise * depthSpeed(s) * (1 + 0.4 * Math.max(0, -climb) - 0.25 * Math.max(0, climb));
  bird.speed = approach(bird.speed, desired, dt * 0.9);
  bird.vel = scale3(bird.heading, bird.speed);
  bird.pos = axpy(bird.pos, bird.vel, dt);
  return !target;
}

/** Pengikut formasi: mengejar posisinya di belakang pemimpin dengan pegas teredam kritis (rapi = lebih kaku, tanpa goyang). */
function followLeader(scene: Scene, bird: Bird, dt: number): void {
  const { L0 } = scene;
  const leader = scene.birds[scene.act.leader];
  const tidy = FORMATIONS[scene.act.style].tidy;
  const flat = axpy(leader.heading, UP, -dot(leader.heading, UP));
  const f = len3(flat) > 0.1 ? norm3(flat) : headingOf(leader.yaw, 0);
  const r: V3 = [f[1] * UP[2] - f[2] * UP[1], f[2] * UP[0] - f[0] * UP[2], f[0] * UP[1] - f[1] * UP[0]];
  const t = scene.time * (0.45 + 0.1 * bird.index);
  const sway = tidy ? 0.06 : 1;
  const [back, sideways, up] = bird.slot;
  let target = axpy(leader.pos, f, (back + 0.25 * sway * Math.sin(t)) * L0);
  target = axpy(target, r, -(sideways + 0.3 * sway * Math.sin(t * 0.7 + 1)) * L0);
  target = axpy(target, UP, (up + 0.25 * sway * Math.sin(t * 1.3 + 2)) * L0);
  // Jarak dari kamera dekat dengan jarak pemimpin: sisi formasi yang menghadap kamera tidak membuat pengikut melesat
  // membesar saat pemimpin sedang dekat
  target[2] = clamp(target[2], leader.pos[2] * 0.8, leader.pos[2] * 1.3);
  const w = tidy ? 3.2 : 2.2;
  for (let i = 0; i < 3; i++) bird.vel[i] += ((target[i] - bird.pos[i]) * w * w + (leader.vel[i] - bird.vel[i]) * 2 * w) * dt;
  // Menyusul dari jauh (mis. baru selesai menukik) tidak melesat: laju dibatasi ±1,5× laju jelajah di jarak ini
  const limit = 1.5 * Math.max(len3(leader.vel), bird.cruise * depthSpeed(scene.F / Math.max(1, bird.pos[2])));
  const fast = len3(bird.vel);
  if (fast > limit) bird.vel = scale3(bird.vel, limit / fast);
  // Menjauh / mendekat kamera tidak lebih dari ±4% ukuran per frame (60 fps)
  bird.vel[2] = clamp(bird.vel[2], -2.4 * bird.pos[2], 2.4 * bird.pos[2]);
  bird.pos = axpy(bird.pos, bird.vel, dt);
  bird.speed = len3(bird.vel);
  if (bird.speed > 1) bird.heading = norm3(mix3(bird.heading, scale3(bird.vel, 1 / bird.speed), clamp01(dt * 5)));
}

/**
 * Pose terbang dari arah & laju burung: hadap, dongak, bank (dihaluskan & dibatasi lajunya), kepakan / luncuran,
 * menukik. `brake` 0..1 = mengerem untuk mendarat (kepak kuat, mendongak, sayap maju, ekor & kaki terjulur), `boost`
 * 0..1 = tenaga lepas landas.
 */
function flightPose(scene: Scene, bird: Bird, dt: number, brake = 0, boost = 0): { power: number; g: number; before: number } {
  const { rng } = scene;
  const dir = bird.heading;
  const fx = dot(dir, FLAT_X);
  const fz = dot(dir, FLAT_Z);
  const climb = Math.asin(clamp(dot(dir, UP), -1, 1));
  const prevYaw = bird.yaw;
  // Laju putar hadap dibatasi (±2,4 rad/detik) dan melemah saat gerak hampir tegak (arah datar tak menentu)
  const flatness = smooth(0.12, 0.45, Math.hypot(fx, fz));
  if (flatness > 0) bird.yaw += clamp(angleDiff(Math.atan2(fz, fx), bird.yaw) * clamp01(dt * 8) * flatness, -2.4 * dt, 2.4 * dt);
  bird.pitch = approach(bird.pitch, clamp(climb, -0.6, 0.6), dt * 3);
  bird.yawRate = approach(bird.yawRate, dt > 0 ? angleDiff(bird.yaw, prevYaw) / dt : 0, dt * 3);
  const bank = clamp(bird.yawRate * 0.75, -0.85, 0.85) * (1 - brake) - bird.roll;
  bird.roll += clamp(bank * clamp01(dt * 2.5), -1.4 * dt, 1.4 * dt);
  const dive = smooth(0.15, 0.45, -climb);

  // Kepakan: lebih cepat & kuat saat menanjak, mengerem, lepas landas; meluncur bila mendatar / menurun
  const soaring = bird.task === 'orbit';
  const power = 1 + clamp(climb * 1.5, 0, 0.35) + 0.35 * brake + 0.35 * boost;
  const leader = scene.birds[scene.act.leader];
  const inStep = bird.task === 'follow' && FORMATIONS[scene.act.style].tidy;
  const hz = (1.5 + 0.6 * clamp01(climb * 2)) * (inStep ? leader.hzScale : bird.hzScale) * (soaring ? 0.9 : 1) * (1 + 0.8 * brake + 0.7 * boost);
  const canGlide = climb < 0.1 && brake === 0 && boost === 0;
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
  // Meluncur: ujung sayap (jari bulu primer) sedikit melengkung ke atas, seperti elang di foto rujukan
  pose.hand = lerp(pose.hand, deg(19), g);
  pose.fold = Math.max(lerp(pose.fold, 0.05, g), 0.32 * dive * g);
  pose.sweep = lerp(pose.sweep, -deg(2), g) - deg(14) * dive * g + deg(16) * brake;
  pose.yaw = bird.yaw;
  pose.roll = bird.roll;
  pose.pitch = bird.pitch * 0.7 + deg(3) * Math.cos(2 * Math.PI * bird.phase) * (1 - g) + deg(62) * brake * brake;
  pose.tail = lerp(0.3 + 0.15 * g + 0.3 * clamp01(Math.abs(bird.yawRate) * 0.8), 1, brake);
  pose.tailPitch = deg(26) * brake - clamp(bird.pitch, -0.3, 0.3) * 0.3;
  pose.legs = smooth(0.25, 0.8, brake);
  pose.grip = 0;
  pose.crouch = 0;
  pose.lift = 0;
  pose.blink = 0;
  pose.beak = 0;
  pose.crest = 0;
  // Kepala tetap datar & melirik ke dalam belokan; saat sangat dekat menoleh ke kamera (menghadap kanan layar = sisi
  // kanan burung ke kamera → menoleh ke kanan)
  const near = smooth(1.6, 2.6, bird.s);
  pose.headYaw = clamp(bird.yawRate * 0.25, -0.5, 0.5) * (1 - near) + 0.55 * Math.cos(bird.yaw) * near;
  pose.headPitch = -pose.pitch * 0.65;
  return { power, g, before };
}

/** Badan naik tiap downstroke, posisi layar & bentuk, lalu kilau ujung sayap. */
function finishFlight(scene: Scene, bird: Bird, dt: number, power: number, g: number, before: number, bobK = 1): void {
  const { rng, L0 } = scene;
  const bob = 0.03 * Math.sin(2 * Math.PI * (bird.phase - 0.08)) * (1 - g) * power * bobK;
  const pos = bird.pos;
  bird.pos = axpy(pos, UP, bob * L0);
  place(scene, bird, dt);
  bird.pos = pos;
  const geo = bird.geometry!;
  const bodyPx = L0 * bird.s;
  const visible = bird.x > -bodyPx && bird.x < scene.w + bodyPx && bird.y > -bodyPx && bird.y < scene.h + bodyPx;
  const tipAt = (i: number): [number, number] => [bird.x + geo.tips[i][0] * bodyPx, bird.y + geo.tips[i][1] * bodyPx];
  if (visible && g < 0.5 && before < DOWNSTROKE && bird.phase >= DOWNSTROKE) {
    for (let i = 0; i < 2; i++) if (rng() < 0.4) spark(scene, bird, ...tipAt(i), false);
  }
  bird.trailIn -= dt;
  if (visible && g > 0.6 && bird.trailIn <= 0) {
    bird.trailIn = 0.12;
    if (rng() < 0.3) spark(scene, bird, ...tipAt(rng() < 0.5 ? 0 : 1), true);
  }
}

/** Burung yang bertengger: mendekat → mendarat → bertengger (gerak kecil) → lepas landas → kembali ke babak. */
function stepPerching(scene: Scene, bird: Bird, dt: number): void {
  const perch = scene.perch!;
  const { rng } = scene;
  perch.t += dt;
  if (perch.phase === 'approach') {
    const done = steer(scene, bird, dt);
    bird.pos[2] = Math.max(bird.pos[2], scene.F / flightMax(scene));
    const { power, g, before } = flightPose(scene, bird, dt);
    finishFlight(scene, bird, dt, power, g, before);
    if (done) beginLanding(scene, bird, perch);
    return;
  }
  if (perch.phase === 'land' || perch.phase === 'launch') {
    const curve = perch.curve!;
    const tau = clamp01(perch.t / curve.dur);
    const landing = perch.phase === 'land';
    // Mendarat melambat sampai diam; lepas landas dipercepat dari diam
    const u = landing ? 1 - (1 - tau) ** 2 : tau * tau;
    const du = (landing ? 2 * (1 - tau) : 2 * tau) / curve.dur;
    bird.pos = hermite(curve, u);
    bird.vel = scale3(hermiteSlope(curve, u), du);
    bird.speed = len3(bird.vel);
    if (bird.speed > 1) bird.heading = norm3(bird.vel);
    const brake = landing ? smooth(0.1, 0.8, tau) : 0;
    const yawBefore = bird.yaw;
    const { power, g, before } = flightPose(scene, bird, dt, brake, landing ? 0 : 1 - tau);
    if (landing) {
      // Hadap berputar perlahan (laju terbatas) ke arah tepi sepanjang pendaratan, bukan dipaksa di akhir
      bird.yaw = yawBefore + clamp(angleDiff(outwardYaw(perch.inward), yawBefore) * clamp01(dt * 2.5), -1.6 * dt, 1.6 * dt);
      mixPose(bird.pose, { ...TOUCHDOWN, yaw: bird.yaw }, smooth(0.55, 1, tau), bird.pose);
      bird.pose.yaw = bird.yaw;
      // Bank kembali datar perlahan sepanjang pendaratan (bukan di akhir saja)
      bird.pose.roll = (curve.roll0 ?? 0) * (1 - smooth(0.15, 1, tau));
      bird.roll = bird.pose.roll;
      // Di ujung kurva menyatu dengan posisi bertumpu kaki pose sekarang (kaki tepat di dahan, tanpa loncatan)
      bird.pos = mix3(bird.pos, perchCentre(scene, perch, bird.pose), smooth(0.7, 1, tau));
      perch.show = Math.max(perch.show, smooth(0, 0.6, tau));
    } else {
      const legs = 1 - smooth(0.15, 0.6, tau);
      mixPose({ ...LAUNCH, yaw: perch.yaw }, bird.pose, smooth(0, 0.35, tau), bird.pose);
      bird.pose.legs = legs;
      bird.pose.grip = 1 - smooth(0, 0.3, tau);
    }
    // Hadap yang digambar = hadap yang dihaluskan berikutnya (tidak melompat saat berganti fase)
    bird.yaw = bird.pose.yaw;
    finishFlight(scene, bird, dt, power, g, before, landing ? 1 - tau : tau);
    if (tau < 1) return;
    if (landing) {
      // Menapak: dahan melentur, kadang sehelai bulu lepas
      perch.phase = 'sit';
      perch.t = 0;
      perch.yaw = bird.yaw;
      perch.bendV += 0.09 * perch.s * scene.L0;
      if (rng() < 0.5) feather(scene, bird);
    } else {
      // Kembali terbang biasa: arah & laju dari akhir kurva, ikut babak sekarang
      perch.phase = 'leave';
      perch.t = 0;
      bird.yawRate = 0;
      assignTask(scene, bird);
    }
    return;
  }

  // Bertengger
  const inYaw = inwardYaw(perch.inward);
  const settle = clamp01(perch.t / SETTLE_SECONDS);
  const ready = perch.t >= perch.sitFor;
  const facingIn = Math.abs(angleDiff(perch.yaw, inYaw)) < 0.2;
  // Setelah berteriak pertama, berbalik menghadap halaman (lewat menghadap kamera, dengan lompatan kecil)
  if (perch.called && !facingIn && !perch.turn && !perch.action) perch.turn = { from: perch.yaw, to: inYaw, t: 0 };

  // Kepala: menoleh cepat ke sasaran acak lalu diam sejenak; lurus ke depan sebelum terbang
  if (ready && facingIn) {
    perch.aimYaw = 0;
    perch.aimPitch = 0;
  } else if (settle >= 1) {
    perch.aimIn -= dt;
    if (perch.aimIn <= 0) {
      perch.aimYaw = rand(rng, -1.1, 1.1);
      perch.aimPitch = rand(rng, -0.25, 0.15);
      perch.aimIn = rand(rng, 0.6, 2);
    }
  }
  perch.headYaw = approach(perch.headYaw, perch.aimYaw, dt * 14);
  perch.headPitch = approach(perch.headPitch, perch.aimPitch, dt * 14);
  // Berkedip sesekali
  perch.blinkIn -= dt;
  if (perch.blinkIn <= 0) {
    perch.blinkIn = rand(rng, 1.8, 4.5);
    perch.blinkT = 0;
  }
  perch.blinkT += dt;

  // Gerak sesekali: berteriak (sekali langsung setelah mendarat), mengepakkan sayap di dahan, mengibas ekor
  if (!ready && settle >= 1 && (facingIn || !perch.called) && !perch.turn && !perch.action) {
    perch.actionIn -= dt;
    if (perch.actionIn <= 0) {
      perch.actionIn = rand(rng, 1.4, 2.8);
      const roll = rng();
      if (!perch.called || roll < 0.42) perch.action = { kind: 'scream', t: 0, dur: 1.8, shed: false };
      else if (roll < 0.84) perch.action = { kind: 'spread', t: 0, dur: 2.6, shed: false };
      else perch.action = { kind: 'flick', t: 0, dur: 0.5, shed: false };
      perch.called = true;
    }
  }

  const pose = bird.pose;
  // Mendarat → bertengger: sayap dilipat (lipatan mendahului turunnya sayap), badan menegak, ekor merapat
  mixPose({ ...TOUCHDOWN, yaw: perch.yaw }, { ...PERCH_POSE, yaw: perch.yaw }, easeInOut(settle), pose);
  pose.fold = smooth(0, 0.65, settle);
  pose.arm = lerp(TOUCHDOWN.arm, PERCH_POSE.arm, smooth(0.1, 1, settle));
  pose.hand = lerp(TOUCHDOWN.hand, PERCH_POSE.hand, smooth(0.1, 1, settle));
  pose.pitch += deg(1.5) * Math.sin(scene.time * 2.2) * settle;
  pose.headYaw = perch.headYaw;
  pose.headPitch += perch.headPitch;
  pose.blink = perch.blinkT < 0.14 ? 1 : 0;
  let hop = 0;

  const action = perch.action;
  if (action) {
    action.t += dt;
    const tau = clamp01(action.t / action.dur);
    const env = smooth(0, 0.18, tau) * (1 - smooth(0.82, 1, tau));
    if (action.kind === 'scream') {
      // Berteriak: kepala mendongak & lurus ke depan, paruh terbuka lebar (sedikit bergetar), jambul berdiri, badan
      // condong ke depan
      pose.headYaw = lerp(pose.headYaw, 0, env);
      pose.headPitch += 0.4 * env;
      pose.beak = env * (0.92 + 0.08 * Math.sin(action.t * 2 * Math.PI * 6));
      pose.crest = Math.max(pose.crest, env);
      pose.pitch -= deg(7) * env;
    } else if (action.kind === 'spread') {
      // Mengepakkan sayap di dahan: sayap terbentang ke atas lalu dikepakkan beberapa kali, ekor mengembang
      const beat = Math.cos(action.t * 2 * Math.PI * 1.8);
      const flapArm = deg(28) + deg(30) * beat;
      pose.arm = lerp(pose.arm, flapArm, env);
      pose.hand = lerp(pose.hand, flapArm + deg(16) + deg(12) * Math.cos(action.t * 2 * Math.PI * 1.8 - 0.6), env);
      pose.fold = lerp(pose.fold, 0.1 + 0.25 * Math.max(0, -beat), env);
      pose.sweep = lerp(pose.sweep, deg(8), env);
      pose.tail += 0.7 * env;
      pose.crest = Math.max(pose.crest, env);
      pose.beak = 0.45 * env;
      pose.pitch -= deg(5) * env;
      // Dahan ikut bergoyang tiap kepakan turun
      perch.bendV += 0.05 * perch.s * scene.L0 * Math.max(0, -beat) * env * dt * 6;
      if (!action.shed && tau > 0.5) {
        action.shed = true;
        if (rng() < 0.35) feather(scene, bird);
      }
    } else {
      // Mengibas ekor ke atas sekali
      pose.tailPitch -= 0.4 * Math.sin(Math.PI * tau);
      pose.tail += 0.5 * Math.sin(Math.PI * tau);
    }
    if (tau >= 1) perch.action = null;
  }

  const turn = perch.turn;
  if (turn) {
    turn.t = Math.min(1, turn.t + dt / TURN_SECONDS);
    const lift = Math.sin(Math.PI * turn.t);
    pose.yaw = turn.from + angleDiff(turn.to, turn.from) * easeInOut(turn.t);
    pose.fold -= 0.18 * lift;
    pose.arm += deg(25) * lift;
    hop = 0.08 * lift;
    if (turn.t >= 1) {
      perch.yaw = turn.to;
      perch.turn = null;
      perch.bendV += 0.03 * perch.s * scene.L0;
    }
  }

  // Siap terbang (menghadap halaman, kepala lurus): jongkok sambil membuka sayap, lalu melompat
  if (ready && facingIn && !perch.turn && !perch.action && Math.abs(perch.headYaw) < 0.08) {
    perch.crouch = Math.min(1, perch.crouch + dt / CROUCH_SECONDS);
  }
  if (perch.crouch > 0) mixPose(pose, { ...LAUNCH, yaw: perch.yaw }, easeInOut(perch.crouch), pose);
  bird.yaw = pose.yaw;
  bird.pitch = 0;
  bird.roll = 0;
  bird.pos = perchCentre(scene, perch, pose, hop);
  bird.vel = [0, 0, 0];
  place(scene, bird, dt);
  if (perch.crouch >= 1) beginLaunch(scene, bird, perch);
}

function stepBird(scene: Scene, bird: Bird, dt: number): void {
  if (bird.task === 'perch') return stepPerching(scene, bird, dt);
  if (bird.task === 'follow') followLeader(scene, bird, dt);
  else steer(scene, bird, dt);
  // Tidak pernah menembus kamera
  bird.pos[2] = Math.max(bird.pos[2], scene.F / flightMax(scene));
  const { power, g, before } = flightPose(scene, bird, dt);
  finishFlight(scene, bird, dt, power, g, before);
  // Melintas sangat dekat: kadang sehelai bulu lepas
  if (bird.task === 'zoom' && !bird.shed && bird.s > zoomScale(scene) * 0.6) {
    bird.shed = true;
    if (scene.rng() < 0.6) feather(scene, bird);
  }
}

/** Pegas dahan (teredam) & tampilnya; dahan hilang setelah burung pergi. */
function stepPerch(scene: Scene, dt: number): void {
  const perch = scene.perch;
  if (!perch) return;
  const target = perch.phase === 'sit' ? 0.012 * perch.s * scene.L0 : 0;
  const half = dt / 2;
  for (let i = 0; i < 2; i++) {
    perch.bendV += (-90 * (perch.bend - target) - 5 * perch.bendV) * half;
    perch.bend += perch.bendV * half;
  }
  if (perch.phase === 'leave') {
    perch.t += dt;
    perch.show = Math.max(0, 1 - perch.t / 1.5);
    if (perch.t >= 1.5) {
      scene.perch = null;
      scene.perchAt = scene.time + rand(scene.rng, 16, 26);
    }
  }
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
  const { rng, birds } = scene;
  scene.time += dt;
  if (scene.time >= scene.act.until) {
    const kinds: ActKind[] = ['formation', 'circle', 'wander'];
    startAct(scene, pick(kinds.filter((kind) => kind !== scene.act.kind), rng));
  }
  // Tukikan ke layar, sering (di luar formasi)
  if (scene.time >= scene.zoomAt) {
    const free = birds.filter((bird) => bird.task === 'wander' || bird.task === 'orbit');
    if (free.length) {
      startZoom(scene, pick(free, rng));
      scene.zoomAt = scene.time + rand(rng, 7, 11);
    } else scene.zoomAt = scene.time + 1.5;
  }
  // Sesekali satu burung bertengger di sisi kiri / kanan (bergantian)
  if (!scene.perch && scene.time >= scene.perchAt) {
    const layout = perchLayout(scene, scene.perchSide) ?? perchLayout(scene, scene.perchSide > 0 ? -1 : 1);
    const free = birds.filter((bird) => bird.task !== 'zoom' && bird.task !== 'lead');
    if (!layout) scene.perchAt = Infinity;
    else if (free.length) startPerch(scene, pick(free, rng), layout);
    else scene.perchAt = scene.time + 2;
  }
  // Dahan dulu, supaya burung yang bertengger memakai lendutan frame ini (kaki tepat di dahan)
  stepPerch(scene, dt);
  for (const bird of birds) stepBird(scene, bird, dt);
  stepParticles(scene, dt);
}

/**
 * Adegan diam (reduced motion): bila ada ruang, satu burung bertengger besar di sisi kiri menghadap halaman, dua lainnya
 * meluncur di langit; tanpa ruang, ketiganya meluncur di luar kotak konten.
 */
export function stillScene(w: number, h: number, options: SceneOptions = {}): Scene {
  const scene = createScene(w, h, { ...options, rng: options.rng ?? (() => 0.5) });
  const { content } = scene;
  const spots: Way[] = [
    [(content.r + w) / 2, h * 0.42, w < 640 ? 0.7 : 1.1],
    [content.l / 2, h * 0.22, 0.5],
    [w * 0.7, h * 0.19, 0.32],
  ];
  const layout = perchLayout(scene, -1);
  scene.birds.forEach((bird, i) => {
    if (i === 1 && layout) {
      startPerch(scene, bird, layout);
      Object.assign(scene.perch!, { phase: 'sit', t: SETTLE_SECONDS, sitFor: Infinity, yaw: inwardYaw(layout.inward), show: 1, headYaw: 0.4, aimYaw: 0.4, aimIn: Infinity, actionIn: Infinity, blinkIn: Infinity });
      stepPerching(scene, bird, 0);
      return;
    }
    const [x, y, s] = spots[i];
    bird.yaw = i === 1 ? -0.4 : Math.PI + 0.3;
    bird.pose = { ...restPose(), yaw: bird.yaw, roll: i === 0 ? 0.12 : 0 };
    bird.pos = toWorld(scene, x, y, Math.max(minScale(scene), s));
    place(scene, bird, 0);
  });
  return scene;
}
