// Perilaku burung Garuda ASCII di latar hero Prompt AI (GarudaAscii.tsx): muncul dari tepi layar, terbang melintas di
// lintasan Bézier yang melengkung sambil mengepak (sesekali meluncur), singgah di salah satu "dahan" (titik tetap di
// pinggir hero), hinggap sebentar, lepas landas lagi, keluar layar, lalu muncul lagi dari sisi lain. Murni (tanpa DOM,
// angka acak disuntikkan) supaya bisa diuji; menggambarnya ada di garudaEngine.ts.

export type Pt = readonly [number, number];

export type BirdState = 'fly' | 'land' | 'perch' | 'takeoff' | 'gone';

export interface Perch {
  x: number;
  y: number;
  taken: boolean;
}

export interface Route {
  p0: Pt;
  p1: Pt;
  p2: Pt;
  p3: Pt;
  /** Panjang perkiraan (px), untuk mengubah kecepatan px/detik menjadi laju parameter. */
  length: number;
}

export interface Bird {
  /** 1 = burung besar (panjang badan = Scene.length px); yang kecil terbang lebih pelan, seolah lebih jauh. */
  size: number;
  state: BirdState;
  /** Titik acuan sprite (px): pusat badan saat terbang, telapak kaki saat mendarat/hinggap. */
  x: number;
  y: number;
  /** +1 menghadap kanan, −1 kiri. */
  facing: 1 | -1;
  /** Kemiringan badan mengikuti arah lintasan (radian, dihaluskan). */
  bank: number;
  /** Fase kepakan 0..1 (0 = sayap terbentang). */
  phase: number;
  gliding: boolean;
  /** Sisa waktu meluncur / mengepak sebelum berganti (detik). */
  modeLeft: number;
  route: Route | null;
  /** Posisi di lintasan 0..1. */
  progress: number;
  /** Lintasan ini berakhir di dahan (mendarat), bukan keluar layar. */
  landing: boolean;
  perch: Perch | null;
  /** Lama keadaan sekarang (detik). */
  stateTime: number;
  /** Lama hinggap yang dipilih (detik). */
  perchFor: number;
  /** Sisa jeda sebelum muncul lagi (detik), keadaan 'gone'. */
  wait: number;
  /** Titik awal mendarat / lepas landas (interpolasi ke/dari dahan). */
  from: Pt;
}

/** Titik kecil di belakang burung yang terbang (riak), snap ke grid saat digambar. */
export interface Dot {
  x: number;
  y: number;
  life: number;
  max: number;
}

export interface Scene {
  w: number;
  h: number;
  /** Panjang badan burung besar (px). */
  length: number;
  birds: Bird[];
  perches: Perch[];
  dots: Dot[];
  time: number;
  rng: () => number;
}

export const LAND_SECONDS = 0.45;
export const TAKEOFF_SECONDS = 0.4;
const DOT_EVERY = 0.09;
const MAX_DOTS = 120;
const BANK_MAX = 0.3;

const rand = (rng: () => number, min: number, max: number) => min + (max - min) * rng();
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/* ─── Lintasan ───────────────────────────────────────────────────────────── */

export function bezierAt(route: Route, t: number): Pt {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [
    a * route.p0[0] + b * route.p1[0] + c * route.p2[0] + d * route.p3[0],
    a * route.p0[1] + b * route.p1[1] + c * route.p2[1] + d * route.p3[1],
  ];
}

export function bezierTangent(route: Route, t: number): Pt {
  const u = 1 - t;
  return [
    3 * u * u * (route.p1[0] - route.p0[0]) + 6 * u * t * (route.p2[0] - route.p1[0]) + 3 * t * t * (route.p3[0] - route.p2[0]),
    3 * u * u * (route.p1[1] - route.p0[1]) + 6 * u * t * (route.p2[1] - route.p1[1]) + 3 * t * t * (route.p3[1] - route.p2[1]),
  ];
}

/**
 * Lintasan melengkung halus dari `from` ke `to`: titik kendali di sepertiga dan dua pertiga jarak, digeser tegak lurus
 * (terutama naik-turun) secara acak supaya tiap penerbangan berbeda: busur, gelombang S, atau terjun landai.
 */
export function makeRoute(from: Pt, to: Pt, rng: () => number): Route {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dist = Math.hypot(dx, dy) || 1;
  const amp = dist * 0.28;
  const lift1 = rand(rng, -amp, amp);
  const lift2 = rng() < 0.5 ? -lift1 * rand(rng, 0.2, 1) : lift1 * rand(rng, 0.2, 1);
  const route: Route = {
    p0: from,
    p1: [from[0] + dx / 3, from[1] + dy / 3 + lift1],
    p2: [from[0] + (2 * dx) / 3, from[1] + (2 * dy) / 3 + lift2],
    p3: to,
    length: 0,
  };
  let length = 0;
  let prev = from;
  for (let i = 1; i <= 24; i++) {
    const p = bezierAt(route, i / 24);
    length += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    prev = p;
  }
  route.length = Math.max(1, length);
  return route;
}

/* ─── Adegan ─────────────────────────────────────────────────────────────── */

/** Panjang badan burung besar untuk lebar hero `w` (px). */
export const birdLength = (w: number): number => clamp(Math.round(w * 0.16), 150, 230);

/** Kecepatan terbang (px/detik): ±0,6 panjang badan per detik; yang kecil lebih pelan (lebih jauh). */
export const birdSpeed = (size: number, length: number): number => length * (0.42 + 0.22 * size);

/** Frekuensi kepakan (Hz): burung besar lebih lambat. */
export const flapHz = (size: number): number => 1.8 / Math.sqrt(size);

/** Dahan tempat singgah: di pinggir hero, menjauhi judul & kotak prompt di tengah. */
export function makePerches(w: number, h: number): Perch[] {
  const spots: Pt[] =
    w < 640
      ? [
          [0.2, 0.8],
          [0.8, 0.18],
        ]
      : [
          [0.13, 0.74],
          [0.87, 0.7],
          [0.8, 0.2],
          [0.18, 0.24],
        ];
  return spots.map(([fx, fy]) => ({ x: Math.round(w * fx), y: Math.round(h * fy), taken: false }));
}

const makeBird = (size: number, wait: number): Bird => ({
  size,
  state: 'gone',
  x: -9999,
  y: -9999,
  facing: 1,
  bank: 0,
  phase: 0,
  gliding: false,
  modeLeft: 0,
  route: null,
  progress: 0,
  landing: false,
  perch: null,
  stateTime: 0,
  perchFor: 0,
  wait,
  from: [0, 0],
});

/** Adegan baru: 3 burung (HP: 2) yang muncul bergiliran. `rng` → 0..1 (Math.random, atau tetap di tes). */
export function createScene(w: number, h: number, rng: () => number = Math.random): Scene {
  const sizes = w < 640 ? [1, 0.52] : [1, 0.62, 0.45];
  return {
    w,
    h,
    length: birdLength(w),
    birds: sizes.map((size, i) => makeBird(size, i === 0 ? 0 : 1.5 + i * 2.5)),
    perches: makePerches(w, h),
    dots: [],
    time: 0,
    rng,
  };
}

/** Titik di luar layar di sisi `side` (+1 kanan, −1 kiri), setinggi acak di sepertiga atas–tengah hero. */
const offscreen = (scene: Scene, side: 1 | -1, size: number, yFrom = 0.12, yTo = 0.78): Pt => [
  side > 0 ? scene.w + scene.length * size : -scene.length * size,
  rand(scene.rng, scene.h * yFrom, scene.h * yTo),
];

/** Burung muncul dari salah satu sisi: menuju dahan yang kosong (±60%, burung besar lebih sering) atau melintas. */
export function spawnBird(scene: Scene, bird: Bird): void {
  const { rng } = scene;
  const side: 1 | -1 = rng() < 0.5 ? 1 : -1;
  const from = offscreen(scene, side, bird.size);
  const free = scene.perches.filter((perch) => !perch.taken);
  const wantsPerch = free.length > 0 && rng() < (bird.size >= 1 ? 0.7 : 0.45);
  bird.state = 'fly';
  bird.stateTime = 0;
  bird.progress = 0;
  bird.gliding = false;
  bird.modeLeft = rand(rng, 1.5, 3.5);
  bird.phase = rng();
  bird.bank = 0;
  bird.facing = side > 0 ? -1 : 1;
  if (wantsPerch) {
    const perch = free[Math.floor(rng() * free.length)];
    perch.taken = true;
    bird.perch = perch;
    bird.landing = true;
    // Mendekat dari atas dahan: titik akhir lintasan sedikit di atasnya, lalu fase mendarat turun ke dahan
    bird.route = makeRoute(from, [perch.x, perch.y - scene.length * bird.size * 0.38], rng);
  } else {
    bird.perch = null;
    bird.landing = false;
    bird.route = makeRoute(from, offscreen(scene, side > 0 ? -1 : 1, bird.size), rng);
  }
  [bird.x, bird.y] = from;
}

function finishFlight(scene: Scene, bird: Bird): void {
  if (bird.landing && bird.perch) {
    bird.state = 'land';
    bird.from = [bird.x, bird.y];
  } else {
    bird.state = 'gone';
    bird.wait = rand(scene.rng, 2.5, 7);
    bird.route = null;
  }
  bird.stateTime = 0;
}

function stepFlight(scene: Scene, bird: Bird, dt: number): void {
  const route = bird.route;
  if (!route) return finishFlight(scene, bird);
  // Mendekati dahan: melambat sampai ±35% supaya pendaratannya lembut
  const slow = bird.landing ? clamp((1 - bird.progress) * 4, 0.35, 1) : 1;
  bird.progress = Math.min(1, bird.progress + (birdSpeed(bird.size, scene.length) * slow * dt) / route.length);
  const [x, y] = bezierAt(route, bird.progress);
  const [tx, ty] = bezierTangent(route, bird.progress);
  bird.x = x;
  bird.y = y;
  if (Math.abs(tx) > 1e-3) bird.facing = tx > 0 ? 1 : -1;
  const targetBank = clamp(Math.atan2(ty, Math.abs(tx)) * 0.55, -BANK_MAX, BANK_MAX);
  bird.bank += (targetBank - bird.bank) * Math.min(1, dt * 4);

  // Kepakan: sesekali meluncur (sayap terbentang = fase 0), lalu mengepak lagi; menjelang mendarat selalu mengepak
  bird.modeLeft -= dt;
  if (bird.gliding) {
    if (bird.modeLeft <= 0 || (bird.landing && bird.progress > 0.75)) {
      bird.gliding = false;
      bird.modeLeft = rand(scene.rng, 1.5, 3.5);
    }
  } else {
    bird.phase = (bird.phase + dt * flapHz(bird.size)) % 1;
    if (bird.modeLeft <= 0 && !(bird.landing && bird.progress > 0.6) && bird.phase < 0.12) {
      bird.gliding = true;
      bird.phase = 0;
      bird.modeLeft = rand(scene.rng, 1, 2.2);
    }
  }
  if (bird.progress >= 1) finishFlight(scene, bird);
}

/** Lepas landas: naik sedikit dari dahan, lalu terbang keluar layar ke arah hadap (dahan dilepas). */
function launch(scene: Scene, bird: Bird): void {
  const perch = bird.perch;
  if (perch) perch.taken = false;
  bird.perch = null;
  bird.landing = false;
  bird.state = 'fly';
  bird.stateTime = 0;
  bird.progress = 0;
  bird.gliding = false;
  bird.modeLeft = rand(scene.rng, 2, 4);
  bird.phase = 0;
  const to = offscreen(scene, bird.facing, bird.size, 0.08, 0.5);
  bird.route = makeRoute([bird.x, bird.y], to, scene.rng);
}

/** Satu langkah simulasi (`dt` detik, sudah dibatasi pemanggil). */
export function stepScene(scene: Scene, dt: number): void {
  scene.time += dt;
  for (const bird of scene.birds) {
    bird.stateTime += dt;
    switch (bird.state) {
      case 'gone':
        bird.wait -= dt;
        if (bird.wait <= 0) spawnBird(scene, bird);
        break;
      case 'fly':
        stepFlight(scene, bird, dt);
        break;
      case 'land': {
        // Dari titik akhir lintasan turun ke dahan (telapak kaki tepat di dahan)
        const perch = bird.perch!;
        const t = Math.min(1, bird.stateTime / LAND_SECONDS);
        const ease = 1 - (1 - t) * (1 - t);
        bird.x = bird.from[0] + (perch.x - bird.from[0]) * ease;
        bird.y = bird.from[1] + (perch.y - bird.from[1]) * ease;
        bird.bank = 0;
        if (t >= 1) {
          bird.state = 'perch';
          bird.stateTime = 0;
          bird.perchFor = rand(scene.rng, 2.5, 6);
        }
        break;
      }
      case 'perch':
        if (bird.stateTime >= bird.perchFor) {
          bird.state = 'takeoff';
          bird.stateTime = 0;
          bird.from = [bird.x, bird.y];
          // Lepas landas ke arah yang lebih lega (sisi terjauh dari dahan)
          bird.facing = bird.x < scene.w / 2 ? 1 : -1;
        }
        break;
      case 'takeoff': {
        const t = Math.min(1, bird.stateTime / TAKEOFF_SECONDS);
        bird.y = bird.from[1] - scene.length * bird.size * 0.3 * t * t;
        if (t >= 1) launch(scene, bird);
        break;
      }
    }
  }

  // Riak titik di belakang burung yang terbang
  for (const bird of scene.birds) {
    if (bird.state !== 'fly') continue;
    const stamp = Math.floor(scene.time / DOT_EVERY);
    if (stamp !== Math.floor((scene.time - dt) / DOT_EVERY) && scene.dots.length < MAX_DOTS) {
      const span = scene.length * bird.size;
      scene.dots.push({
        x: bird.x - bird.facing * rand(scene.rng, 0.1, 0.5) * span,
        y: bird.y + rand(scene.rng, -0.4, 0.4) * span,
        life: 1.1,
        max: 1.1,
      });
    }
  }
  for (let i = scene.dots.length - 1; i >= 0; i--) {
    const dot = scene.dots[i];
    dot.life -= dt;
    dot.y += dt * 5;
    if (dot.life <= 0) scene.dots.splice(i, 1);
  }
}

/** Adegan diam (reduced motion): satu burung meluncur di kanan atas, satu hinggap di dahan kiri bawah. */
export function stillScene(w: number, h: number): Scene {
  const scene = createScene(w, h, () => 0.5);
  const [glider, sitter] = scene.birds;
  Object.assign(glider, { state: 'fly', gliding: true, phase: 0, x: w * 0.78, y: h * 0.3, facing: -1, bank: 0.08 });
  const perch = scene.perches[0];
  perch.taken = true;
  if (sitter) Object.assign(sitter, { state: 'perch', x: perch.x, y: perch.y, facing: 1, perch });
  return scene;
}
