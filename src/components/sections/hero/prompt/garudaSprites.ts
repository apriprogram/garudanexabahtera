// Model burung Garuda ASCII untuk latar hero gaya Prompt AI (GarudaAscii.tsx) dan rasterisasinya ke grid glyph.
//
// Idenya dari ascii-sharks (github.com/stackedlol/ascii-sharks, MIT © 2026 drewdi): makhluk tidak digambar sebagai teks
// tetap, melainkan BENTUK yang dirasterisasi ke grid sel monospace, lalu tiap sel diberi glyph sesuai kepadatannya
// (isi padat, tepi ringan, garis tipis = '/', '\', '|', '-', '_' menurut arahnya). Di sini bentuknya burung Garuda 3D
// sederhana yang dibangun ulang TIAP FRAME dari pose (tanpa frame sprite tetap, jadi kepakan & belokan halus):
// - badan = rantai bola (dada, perut, tunggir), leher, kepala dengan paruh bengkok dan mata, ekor kipas berlekuk;
// - sayap bersendi: lengan → lengan bawah → tangan, bulu sekunder di sepanjang lengan, dan bulu primer yang mengembang
//   seperti jari (celah di ujungnya); elevasi lengan & tangan terpisah (tangan menyusul = kepakan bergelombang),
//   lipatan sayap (terbentang → terlipat rapat di sisi badan), sapuan maju (mengerem) / mundur;
// - kaki berbulu ("celana" elang), tarsus, dan cakar: terlipat (tak tergambar) saat terbang; pose bisa menjulurkannya.
// Pose diproyeksikan dari kamera yang sedikit mendongak, jadi burung yang berbelok, menjauh, atau mendekat terlihat dari
// sudut yang benar (dari samping, belakang, atau depan). Satuan = panjang badan (paruh–ujung ekor = 1). Makin dekat
// burung, makin banyak sel per panjang badan, jadi makin detail: bulu primer terpisah, mata, jambul, cakar, dan lekuk
// ekor ikut dibentuk di ukuran besar; lebih dekat lagi tiap helai bulu sayap & ekor bergaris tepi (lekukan helai), paruh
// terpisah jadi rahang atas berkait & rahang bawah; saat sangat dekat (seukuran layar / bertengger) bulu bertambah dan
// tiap bulu punya tulang bulu, deret sisik bulu penutup, guratan bulu dada & "celana", sera & lubang hidung, lingkar mata,
// alis, dan mata ('@') yang terlihat jelas. Murni (tanpa DOM) supaya bisa diuji. Kode sendiri, bukan salinan.

/** Kepadatan sel 0..4 (0 = kosong, 4 = paling padat); glyph & warnanya dipilih saat menggambar (garudaEngine.ts). */
export type Level = 0 | 1 | 2 | 3 | 4;
export type Pt = readonly [number, number];
export type Vec3 = readonly [number, number, number];
type V3 = [number, number, number];

/**
 * Bentuk 2D untuk rasterisasi: poligon (genap-ganjil) atau lingkaran. Bentuk `carve` memahat: kepadatan di dalamnya
 * dibatasi paling tinggi `level` (0 = lubang), diterapkan setelah semua bentuk padat (tulang bulu, batas bulu). `glyph`
 * (lingkaran) = sel di pusatnya digambar dengan glyph itu (mata).
 */
export type Shape =
  | { kind: 'poly'; points: Pt[]; level: Level; carve?: boolean; dir?: number }
  | { kind: 'circle'; cx: number; cy: number; r: number; level: Level; carve?: boolean; glyph?: string };

export interface Sprite {
  cols: number;
  rows: number;
  /** Kepadatan per sel, baris demi baris (rows × cols). */
  cells: Uint8Array;
  /** Arah garis di sel tepi / tipis / guratan (indeks DIR_GLYPHS), 0 = tanpa arah (sel isi). */
  dirs: Uint8Array;
  /** Glyph khusus per sel (mata). */
  marks: Map<number, string>;
  /** Kepadatan kontinu per sel 0..1 (luasan × level): alpha glyph ikut ini, jadi tepi memudar halus saat bergerak. */
  dens: Float32Array;
  /** Titik acuan dalam koordinat sel dari tepi kiri-atas (pecahan); selalu tepat di tengah satu sel. */
  ax: number;
  ay: number;
  /** Indeks kolom & baris pertama relatif terhadap sel titik acuan (glyph per sel tetap saat burung bergerak). */
  c0: number;
  r0: number;
}

/** Glyph garis per arah: 1 mendatar, 2 naik ke kanan, 3 tegak, 4 turun ke kanan, 5 mendatar di dasar sel. */
export const DIR_GLYPHS = ['', '-', '/', '|', '\\', '_'] as const;

const deg = (d: number) => (d * Math.PI) / 180;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (e0: number, e1: number, v: number) => {
  const t = clamp01((v - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: Vec3): V3 => {
  const n = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / n, a[1] / n, a[2] / n];
};
const axpy = (a: Vec3, b: Vec3, k: number): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const mix3 = (a: Vec3, b: Vec3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/* ─── Kamera & kerangka badan ─────────────────────────────────────────────── */

/** Kamera mendongak: burung di langit tampak dari bawah (perut & kedua sayap terlihat, siluet elang yang khas). */
export const VIEW_TILT = deg(40);
/** Arah "atas" sebenarnya dalam koordinat kamera (x kanan layar, y ke bawah layar, z menjauh dari kamera). */
export const UP: Vec3 = [0, -Math.cos(VIEW_TILT), Math.sin(VIEW_TILT)];
/** Arah mendatar: ke kanan layar, dan menjauh dari kamera. */
export const FLAT_X: Vec3 = [1, 0, 0];
export const FLAT_Z: Vec3 = [0, Math.sin(VIEW_TILT), Math.cos(VIEW_TILT)];

export interface BirdPose {
  /** Arah hadap di bidang datar (radian): 0 = ke kanan layar, π/2 = menjauh, −π/2 = mendekat ke kamera. */
  yaw: number;
  /** Mendongak (+) / menunduk (−) terhadap bidang datar (radian). */
  pitch: number;
  /** Bank (radian): + = sayap kanan naik (berbelok ke kiri). */
  roll: number;
  /** Elevasi lengan sayap dan tangan (bulu primer), radian, + = ke atas. */
  arm: number;
  hand: number;
  /** Lipatan sayap: 0 terbentang .. 1 terlipat rapat di sisi badan. */
  fold: number;
  /** Sapuan sayap: + maju (mengerem saat mendarat), − ke belakang (upstroke), radian. */
  sweep: number;
  /** Kipas ekor 0 rapat .. 1 mengembang; ekor menunduk (+, radian). */
  tail: number;
  tailPitch: number;
  /** Kaki terjulur ke bawah-depan (mendarat) 0..1; mencengkeram (lurus ke bawah) 0..1; jongkok 0..1. */
  legs: number;
  grip: number;
  crouch: number;
  /** Kepala menoleh (+ ke kanan burung) dan mendongak (+), relatif terhadap badan. */
  headYaw: number;
  headPitch: number;
  /** Satu sayap sedikit terangkat saat merapikan bulu: + sayap kanan, − sayap kiri. */
  lift: number;
  /** Mata berkedip (> 0,5 = terpejam). */
  blink: number;
  /** Paruh terbuka 0..1 (berteriak) dan jambul berdiri 0..1. */
  beak: number;
  crest: number;
}

export interface Frame {
  /** Arah maju, kanan (sayap kanan), dan atas burung dalam koordinat kamera. */
  f: V3;
  r: V3;
  u: V3;
}

export function bodyFrame(yaw: number, pitch: number, roll: number): Frame {
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const f = norm([
    cp * (cy * FLAT_X[0] + sy * FLAT_Z[0]) + sp * UP[0],
    cp * (cy * FLAT_X[1] + sy * FLAT_Z[1]) + sp * UP[1],
    cp * (cy * FLAT_X[2] + sy * FLAT_Z[2]) + sp * UP[2],
  ]);
  const r0 = norm(cross(f, UP));
  const u0 = cross(r0, f);
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  return {
    f,
    r: [r0[0] * cr + u0[0] * sr, r0[1] * cr + u0[1] * sr, r0[2] * cr + u0[2] * sr],
    u: [u0[0] * cr - r0[0] * sr, u0[1] * cr - r0[1] * sr, u0[2] * cr - r0[2] * sr],
  };
}

/** Titik lokal burung (a maju, b kanan, c atas) → koordinat kamera. */
const toCam = (fr: Frame, p: Vec3): V3 => [
  p[0] * fr.f[0] + p[1] * fr.r[0] + p[2] * fr.u[0],
  p[0] * fr.f[1] + p[1] * fr.r[1] + p[2] * fr.u[1],
  p[0] * fr.f[2] + p[1] * fr.r[2] + p[2] * fr.u[2],
];
/** Vektor kamera → koordinat lokal burung. */
const localOf = (fr: Frame, v: Vec3): V3 => [dot(v, fr.f), dot(v, fr.r), dot(v, fr.u)];

/* ─── Kaki ────────────────────────────────────────────────────────────────── */

interface Leg {
  hip: V3;
  knee: V3;
  foot: V3;
  /** Maju mendatar & ke bawah sebenarnya, dalam koordinat lokal (untuk jari kaki). */
  fwd: V3;
  down: V3;
}

/**
 * Kaki sisi `side`: terlipat ke belakang di bawah ekor (terbang) → terjulur ke bawah-depan (mendarat) → lurus ke bawah
 * (mencengkeram dahan). Sendi pergelangan menekuk ke belakang, makin dalam saat jongkok.
 */
function leg(fr: Frame, pose: BirdPose, side: 1 | -1): Leg {
  const downCam: V3 = [-UP[0], -UP[1], -UP[2]];
  const fwdCam = norm(axpy(fr.f, UP, -dot(fr.f, UP)));
  const fwd = localOf(fr, fwdCam);
  const down = localOf(fr, downCam);
  const reach = localOf(fr, norm(axpy([fwdCam[0] * 0.5, fwdCam[1] * 0.5, fwdCam[2] * 0.5], downCam, 0.86)));
  const tucked: V3 = [-0.94, 0, -0.34];
  const dir = norm(mix3(norm(mix3(tucked, reach, pose.legs)), down, pose.grip));
  const len = lerp(0.14, 0.26, Math.max(pose.legs, pose.grip)) * (1 - 0.3 * pose.crouch);
  const hip: V3 = [-0.03, side * 0.036, -0.07];
  const foot = axpy(hip, dir, len);
  const knee = axpy(mix3(hip, foot, 0.5), fwd, -(0.03 + 0.07 * pose.crouch));
  return { hip, knee, foot, fwd, down };
}

/** Titik tengah telapak kaki (koordinat kamera, satuan panjang badan, relatif pusat badan): untuk bertengger. */
export function footOf(pose: BirdPose): V3 {
  const fr = bodyFrame(pose.yaw, pose.pitch, pose.roll);
  return toCam(fr, mix3(leg(fr, pose, 1).foot, leg(fr, pose, -1).foot, 0.5));
}

/* ─── Model ───────────────────────────────────────────────────────────────── */

/** Rantai bola badan [maju, atas, jari-jari]: dada → perut → tunggir. */
const BODY: ReadonlyArray<Vec3> = [
  [0.15, 0.002, 0.095],
  [0.04, -0.004, 0.104],
  [-0.07, 0, 0.09],
  [-0.16, 0.008, 0.068],
  [-0.235, 0.012, 0.048],
];
/** Pangkal leher: kepala berputar di sekitar titik ini (menoleh / menunduk). */
const NECK: Vec3 = [0.25, 0, 0.03];
/** Sayap elang: panjang & lebar (bentang ±2,2 panjang badan), bulu primer luar terpanjang seperti jari. */
const ARM = 0.24;
const FOREARM = 0.28;
const HAND = 0.16;
const PRIMARY_LEN_FULL = [0.27, 0.31, 0.35, 0.39, 0.41, 0.39, 0.34];
const PRIMARY_LEN_LOW = [0.3, 0.36, 0.4, 0.36];

/** Selubung cembung titik 2D (monotone chain), untuk paruh yang tetap berbentuk dari sudut mana pun. */
function hull(points: Pt[]): Pt[] {
  const pts = [...points].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const turn = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Pt[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && turn(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Pt[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && turn(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

export interface BirdGeometry {
  /** Bentuk di layar (satuan panjang badan, relatif pusat badan; x ke kanan, y ke bawah). */
  shapes: Shape[];
  /** Ujung kedua sayap di layar (satuan panjang badan): asal partikel kilau. */
  tips: [Pt, Pt];
  /** Ujung paruh di layar (satuan panjang badan): asal "suara" saat berteriak. */
  beak: Pt;
}

/** Mulai berapa sel per panjang badan model memakai detail (bulu terpisah, mata) dan detail sangat dekat. */
export const DETAIL_UNIT = 11;
/** Mulai berapa sel per panjang badan tiap helai bulu bergaris tepi & paruh dibentuk rahang atas-bawah. */
export const FINE_UNIT = 18;
export const CLOSE_UNIT = 28;
const PRIMARY_LEN_CLOSE = [0.25, 0.28, 0.31, 0.35, 0.38, 0.41, 0.41, 0.38, 0.32];

/**
 * Bentuk burung untuk `pose` bila digambar dengan `unit` sel per panjang badan. Burung jauh cukup siluet ringkas (sel-nya
 * sedikit, detail kecil tidak akan terlihat); dekat (DETAIL_UNIT): bulu lebih banyak dan terpisah, mata, cakar, lekuk
 * ekor; sangat dekat (CLOSE_UNIT): bulu terbanyak plus guratan selebar ±1 sel (tulang bulu, batas bulu penutup, bulu
 * dada, garis mulut) yang muncul sebagai garis glyph di dalam sayap & badan.
 */
export function birdGeometry(pose: BirdPose, unit: number): BirdGeometry {
  const detail = unit >= DETAIL_UNIT;
  const fine = unit >= FINE_UNIT;
  const close = unit >= CLOSE_UNIT;
  /** Lebar guratan (satuan badan): ±1,2 sel supaya terbaca sebagai garis. */
  const line = 1.2 / Math.max(unit, 1);
  const fr = bodyFrame(pose.yaw, pose.pitch, pose.roll);
  const shapes: Shape[] = [];
  const P = (p: Vec3): Pt => {
    const v = toCam(fr, p);
    return [v[0], v[1]];
  };
  const poly = (points: Vec3[], level: Level) => shapes.push({ kind: 'poly', points: points.map(P), level });
  const circle = (p: Vec3, r: number, level: Level, carve = false) => {
    const [cx, cy] = P(p);
    shapes.push({ kind: 'circle', cx, cy, r, level, carve });
  };
  /** Garis tebal 2D dari `a` ke `b` (lebar `w0` → `w1`), untuk kaki & cakar; `carve` = guratan. */
  const strip = (a: Vec3, b: Vec3, w0: number, w1: number, level: Level, carve = false) => {
    const pa = P(a);
    const pb = P(b);
    const dx = pb[0] - pa[0];
    const dy = pb[1] - pa[1];
    const n = Math.hypot(dx, dy) || 1;
    const nx = -dy / n / 2;
    const ny = dx / n / 2;
    shapes.push({
      kind: 'poly',
      points: [
        [pa[0] + nx * w0, pa[1] + ny * w0],
        [pb[0] + nx * w1, pb[1] + ny * w1],
        [pb[0] - nx * w1, pb[1] - ny * w1],
        [pa[0] - nx * w0, pa[1] - ny * w0],
      ],
      level,
      carve,
    });
  };
  /** Guratan: garis pahat selebar ±1 sel, arahnya ikut dicatat supaya sel yang tertutup penuh pun bergaris. */
  const groove = (a: Vec3, b: Vec3, level: Level) => {
    strip(a, b, line, line, level, true);
    const pa = P(a);
    const pb = P(b);
    (shapes[shapes.length - 1] as Extract<Shape, { kind: 'poly' }>).dir = dirCode(pb[0] - pa[0], pb[1] - pa[1]);
  };

  // Badan & leher
  for (const [a, c, r] of BODY) circle([a, 0, c], r, 4);
  circle([0.245, 0, 0.026], 0.072, 4);
  if (fine) {
    // Dada & perut pucat (khas elang Jawa): bagian bawah badan lebih terang, punggung & sayap tetap gelap; dari bawah
    // (terbang) terlihat di tengah badan, dari samping (bertengger) di depan-bawah
    for (const [a, c, r] of BODY.slice(0, 3)) circle([a, 0, c - 0.5 * r], 0.62 * r, 2, true);
  }
  if (fine) {
    // Guratan bulu dada & perut: baris-baris garis pendek mengarah ke belakang (lebih rapat saat sangat dekat)
    for (let a = 0.17; a > -0.16; a -= close ? 0.055 : 0.08) {
      for (const b of [-0.05, 0, 0.05]) {
        const c = -0.075 + Math.abs(b) * 0.4;
        groove([a, b + 0.012, c], [a - 0.035, b, c - 0.006], 3);
      }
    }
  }

  // Kepala: menoleh (sumbu atas burung) & mendongak (sumbu kanan burung) di sekitar pangkal leher
  const hp = Math.cos(pose.headPitch);
  const hs = Math.sin(pose.headPitch);
  const yc = Math.cos(pose.headYaw);
  const ys = Math.sin(pose.headYaw);
  const head = (a: number, b: number, c: number): V3 => {
    const x = a - NECK[0];
    const z = c - NECK[2];
    const x1 = x * hp - z * hs;
    const z1 = x * hs + z * hp;
    return [NECK[0] + x1 * yc - b * ys, x1 * ys + b * yc, NECK[2] + z1];
  };
  circle(head(0.335, 0, 0.05), 0.068, 4);
  // Wajah & pipi pucat (kepala elang Jawa kecokelatan muda), mahkota & jambul tetap gelap
  if (fine) circle(head(0.352, 0, 0.034), 0.05, 3, true);
  /** Tiap titik kepala diproyeksikan; hull = bentuk paruh yang tetap utuh dari sudut mana pun. */
  const headHull = (pts: V3[], level: Level) => shapes.push({ kind: 'poly', points: hull(pts.map(P)), level });
  // Sisi kepala yang menghadap kamera (mata, lubang hidung, alis)
  const camSide = toCam(fr, head(0.35, 0.05, 0.06))[2] < toCam(fr, head(0.35, -0.05, 0.06))[2] ? 1 : -1;

  // Jambul (khas elang Jawa, Garuda): beberapa helai panjang di belakang kepala, berujung gelap; tegak saat bertengger
  // (makin tegak saat berteriak / mengepak), rebah ke belakang saat terbang
  {
    const n = close ? 5 : detail ? 3 : 2;
    const raise = clamp01(smooth(0.3, 0.9, pose.pitch) + 0.5 * pose.crest);
    for (let k = 0; k < n; k++) {
      const b = (k - (n - 1) / 2) * 0.014;
      const elev = deg(14 + 50 * raise + 7 * k);
      const len = (0.24 - 0.025 * k) * (1 + 0.2 * pose.crest);
      const a0 = 0.318 - 0.014 * k;
      const c0 = 0.106 - 0.005 * k;
      const base = head(a0, b, c0);
      // Sedikit melengkung ke belakang: titik tengah lebih tegak dari ujung
      const mid = head(a0 - len * 0.5 * Math.cos(elev + 0.12), b * 1.3, c0 + len * 0.5 * Math.sin(elev + 0.12));
      const tip = head(a0 - len * Math.cos(elev), b * 1.6, c0 + len * Math.sin(elev));
      strip(base, mid, 0.044 - 0.003 * k, 0.026, detail ? 3 : 4);
      strip(mid, tip, 0.026, 0.008, 4);
    }
  }

  // Paruh bengkok khas elang
  if (fine) {
    // Rahang atas tebal dengan kait di ujung (lebih terang dari kepala, kait gelap), rahang bawah lebih tipis yang
    // membuka saat berteriak (berputar di sudut mulut), celah mulut di antaranya; tenggorokan pucat di bawahnya
    headHull([head(0.385, 0, 0.084), head(0.39, 0.028, 0.055), head(0.39, -0.028, 0.055), head(0.44, 0, 0.078), head(0.474, 0, 0.054), head(0.484, 0, 0.032), head(0.4, 0, 0.034)], 2);
    strip(head(0.478, 0, 0.036), head(0.466, 0, -0.002), 0.024, 0.008, 4);
    const open = deg(30) * clamp01(pose.beak);
    const jaw = (a: number, b: number, c: number): V3 => {
      const x = a - 0.395;
      const z = c - 0.032;
      return head(0.395 + x * Math.cos(open) + z * Math.sin(open), b, 0.032 - x * Math.sin(open) + z * Math.cos(open));
    };
    headHull([jaw(0.396, 0, 0.016), jaw(0.392, 0.022, 0.03), jaw(0.392, -0.022, 0.03), jaw(0.452, 0, 0.022), jaw(0.44, 0, 0.012)], 2);
    if (pose.beak > 0.1) shapes.push({ kind: 'poly', points: [P(head(0.398, 0, 0.032)), P(head(0.47, 0, 0.032)), P(jaw(0.452, 0, 0.026))], level: 1, carve: true });
    else groove(head(0.398, 0, 0.031), head(0.458, 0, 0.026), 1);
    circle(head(0.35, 0, 0.012), 0.034, 2, true);
  } else {
    headHull([head(0.39, 0, 0.078), head(0.44, 0, 0.074), head(0.478, 0, 0.034), head(0.468, 0, 0.006), head(0.4, 0, 0.018), head(0.392, 0.026, 0.05), head(0.392, -0.026, 0.05)], 3);
  }
  if (close) {
    // Sera (pangkal paruh yang berdaging) lebih terang, lubang hidung, alis di atas mata
    strip(head(0.388, 0, 0.084), head(0.392, 0, 0.034), 0.016, 0.016, 2, true);
    circle(head(0.408, camSide * 0.02, 0.064), 0.008, 1, true);
    groove(head(0.322, camSide * 0.05, 0.098), head(0.372, camSide * 0.047, 0.088), 2);
  }
  if (detail) {
    // Mata di sisi yang menghadap kamera: lingkar mata, rongga terang, glyph mata di tengahnya
    const eye = head(0.352, camSide * 0.047, 0.066);
    if (close) circle(eye, 0.03, 2, true);
    const [ex, ey] = P(eye);
    shapes.push({ kind: 'circle', cx: ex, cy: ey, r: close ? 0.02 : 0.017, level: 1, carve: true, glyph: pose.blink > 0.5 ? '-' : close ? '@' : 'o' });
  }

  // Ekor kipas: menunduk `tailPitch`, makin lebar saat mengembang; detail = lekuk antar-bulu
  {
    const root: V3 = [-0.24, 0, 0.012];
    const dir: V3 = [-Math.cos(pose.tailPitch), 0, -Math.sin(pose.tailPitch)];
    const half = lerp(0.055, 0.16, clamp01(pose.tail));
    const n = close ? 12 : detail ? 8 : 4;
    const pts: V3[] = [[root[0], -0.032, root[2]]];
    for (let k = 0; k <= n; k++) {
      const b = lerp(-half, half, k / n);
      const len = 0.28 * (1 - 0.12 * (b / half) ** 2) - (detail && k % 2 === 1 ? 0.014 : 0);
      pts.push([root[0] + dir[0] * len, b, root[2] + dir[2] * len]);
    }
    pts.push([root[0], 0.032, root[2]]);
    poly(pts, 3);
    if (fine) {
      // Ekor bergaris melintang (khas elang Jawa)
      for (const f of [0.42, 0.64, 0.86]) {
        const w = lerp(0.032, half, f) * 0.95;
        const at = (b: number): V3 => [root[0] + dir[0] * 0.28 * f, b, root[2] + dir[2] * 0.28 * f];
        groove(at(-w), at(w), 2);
      }
      // Batas antar-helai ekor: dari pangkal ke tiap lekuk di ujung ekor
      for (let k = 1; k < n; k += 2) {
        const end = pts[k + 1];
        groove([root[0] + dir[0] * 0.06, end[1] * 0.35, root[2] + dir[2] * 0.06], [lerp(root[0], end[0], 0.97), end[1] * 0.98, lerp(root[2], end[2], 0.97)], 2);
      }
    }
    if (close) {
      // Tulang bulu ekor: dari pangkal ke tiap ujung bulu
      for (let k = 2; k < n; k += 2) {
        const end = pts[k + 1];
        groove([root[0] + dir[0] * 0.05, end[1] * 0.3, root[2] + dir[2] * 0.05], [lerp(root[0], end[0], 0.9), end[1] * 0.92, lerp(root[2], end[2], 0.9)], 2);
      }
    }
  }

  // Sayap
  const tips: Pt[] = [];
  for (const side of [1, -1] as const) {
    // Sayap yang menghadap kamera lebih pekat dari sayap di balik badan
    const near = side * fr.r[2] < 0;
    const lift = Math.max(0, pose.lift * side);
    const arm = pose.arm + lift * deg(28);
    const hand = pose.hand + lift * deg(28);
    const fold = clamp01(pose.fold - lift * 0.18);
    const sweep = pose.sweep;
    const spanA: V3 = [0, side * Math.cos(arm), Math.sin(arm)];
    const spanH: V3 = [0, side * Math.cos(hand), Math.sin(hand)];
    // Arah di bidang sayap: sudut `alpha` dari sumbu bentang ke arah belakang (tepi belakang sayap)
    const along = (span: Vec3, alpha: number): V3 => [-Math.sin(alpha), span[1] * Math.cos(alpha), span[2] * Math.cos(alpha)];
    const S: V3 = [0.13, side * 0.06, 0.035];
    const E = axpy(S, along(spanA, lerp(deg(8), deg(75), fold) - sweep), ARM);
    const W = axpy(E, along(spanA, lerp(deg(-6), deg(-100), fold) - sweep), FOREARM);
    const H = axpy(W, along(spanH, lerp(deg(12), deg(98), fold) - sweep * 0.6), HAND);
    const coverts: Level = near ? 4 : 3;
    const flight: Level = near ? 3 : 2;
    const back = (p: Vec3, k: number): V3 => [p[0] - k, p[1], p[2]];
    /** Satu bulu: pangkal `base`, arah `beta` di bidang `span`, ujung menyempit (celah antar-bulu primer). */
    const feather = (base: V3, span: Vec3, beta: number, len: number, width: number, tipWidth: number): V3 => {
      const d = along(span, beta);
      const n = along(span, beta - Math.PI / 2);
      const tip = axpy(base, d, len);
      const mid = axpy(base, d, len * 0.78);
      poly([axpy(base, n, -width / 2), axpy(mid, n, -tipWidth / 2), tip, axpy(mid, n, tipWidth / 2), axpy(base, n, width / 2)], flight);
      // Lekukan helai: tepi bulu (tempat helai bertumpuk) sebagai garis; sangat dekat + tulang bulu di tengah
      if (fine && near) groove(axpy(axpy(base, d, len * 0.3), n, width * 0.42), axpy(axpy(base, d, len * 0.94), n, tipWidth * 0.45), 2);
      if (close && near) groove(axpy(base, d, len * 0.12), axpy(base, d, len * 0.86), 2);
      return tip;
    };

    // Bulu penutup (tepi depan yang tebal): pita per tulang + selaput antara bahu dan pergelangan
    poly([S, E, back(E, 0.1), back(S, 0.12)], coverts);
    poly([E, W, back(W, 0.085), back(E, 0.1)], coverts);
    poly([W, H, back(H, 0.05), back(W, 0.085)], coverts);
    poly([S, W, E], coverts);
    if (close && near) {
      // Batas bulu penutup kecil & besar, lalu dua deret sisik bulu penutup (goresan pendek mengarah ke belakang)
      groove(back(S, 0.075), back(E, 0.065), 3);
      groove(back(E, 0.065), back(W, 0.055), 3);
      groove(back(W, 0.055), back(H, 0.035), 3);
      for (const depth of [0.035, 0.1]) {
        for (let k = 0; k < 8; k++) {
          const u = (k + 0.5) / 8;
          const d = u * (ARM + FOREARM);
          const base = d < ARM ? mix3(S, E, d / ARM) : mix3(E, W, (d - ARM) / FOREARM);
          const at = back(base, depth);
          groove(at, axpy(back(at, 0.028), spanA, 0.012), 3);
        }
      }
    }

    // Bulu sekunder di sepanjang lengan & lengan bawah: lebar, tepi belakang lurus
    const nS = close ? 14 : detail ? 10 : 5;
    for (let k = 0; k < nS; k++) {
      const u = 0.1 + (0.9 * (k + 0.5)) / nS;
      const d = u * (ARM + FOREARM);
      const base = d < ARM ? mix3(S, E, d / ARM) : mix3(E, W, (d - ARM) / FOREARM);
      const beta = lerp(deg(93), deg(101), fold) + (u - 0.5) * deg(8) - sweep * 0.3;
      const len = lerp(0.15, 0.24, clamp01((u - 0.05) / 0.4)) * (1 - 0.08 * fold);
      const width = ((0.9 * (ARM + FOREARM)) / nS) * 1.75;
      feather(base, spanA, beta, len, width, width * 0.72);
    }

    // Bulu primer di tangan: mengembang seperti jari saat terbentang, merapat ke belakang saat terlipat
    const lens = close ? PRIMARY_LEN_CLOSE : detail ? PRIMARY_LEN_FULL : PRIMARY_LEN_LOW;
    let tip: V3 = H;
    let longest = 0;
    for (let k = 0; k < lens.length; k++) {
      const u = k / (lens.length - 1);
      const base = mix3(W, H, 0.15 + 0.85 * u);
      // Terbentang: bulu primer menyebar seperti jari sampai yang terluar sedikit ke depan
      const ext = lerp(deg(82), deg(-4), u ** 0.8);
      const beta = lerp(ext, lerp(deg(100), deg(106), u), fold) - sweep * 0.5;
      const width = close ? 0.05 : detail ? 0.06 : 0.085;
      const end = feather(base, spanH, beta, lens[k], width, width * 0.34);
      if (lens[k] > longest) {
        longest = lens[k];
        tip = end;
      }
    }
    tips.push(P(tip));
  }

  // Kaki (hanya bila tidak terlipat penuh): "celana" bulu, tarsus, cakar
  const legL = leg(fr, pose, -1);
  const legR = leg(fr, pose, 1);
  if (Math.max(pose.legs, pose.grip) > 0.04) {
    for (const lg of [legL, legR]) {
      strip(lg.hip, lg.knee, 0.092, 0.062, 4);
      strip(lg.knee, lg.foot, 0.034, 0.03, 3);
      if (close) {
        // "Celana" berbulu: guratan helai menurun
        for (const k of [-0.022, 0.022]) groove(axpy(lg.hip, lg.fwd, k), axpy(mix3(lg.hip, lg.knee, 0.85), lg.fwd, k * 0.7), 3);
      }
      if (detail || pose.grip > 0.5) {
        const curl = 0.022 * pose.grip - 0.03 * pose.legs * (1 - pose.grip);
        strip(lg.foot, axpy(axpy(lg.foot, lg.fwd, 0.078), lg.down, curl), 0.026, 0.016, 3);
        strip(lg.foot, axpy(axpy(lg.foot, lg.fwd, -0.052), lg.down, curl * 0.8), 0.024, 0.014, 3);
      }
    }
  }

  return { shapes, tips: [tips[0], tips[1]], beak: P(head(0.484, 0, 0.03)) };
}

/* ─── Rasterisasi ─────────────────────────────────────────────────────────── */

const SUB = 4; // sampel per sisi sel (4×4)

/** Indeks DIR_GLYPHS untuk garis berarah (dx, dy) di layar (y ke bawah). */
export function dirCode(dx: number, dy: number): number {
  const a = Math.abs((Math.atan2(dy, dx) * 180) / Math.PI);
  const folded = a > 90 ? 180 - a : a;
  if (folded < 22.5) return 1;
  if (folded > 67.5) return 3;
  return dx * dy > 0 ? 4 : 2;
}

/** Titik di dalam poligon (genap-ganjil). */
function insidePoly(points: readonly Pt[], x: number, y: number): boolean {
  let hit = false;
  for (let i = 0, k = points.length - 1; i < points.length; k = i++) {
    const [xi, yi] = points[i];
    const [xk, yk] = points[k];
    if (yi > y !== yk > y && x < ((xk - xi) * (y - yi)) / (yk - yi) + xi) hit = !hit;
  }
  return hit;
}
let scratch = new Uint8Array(0);
const xs: number[] = [];

/** Kotak pembatas semua bentuk padat [x0, y0, x1, y1]. */
export function shapesBounds(shapes: readonly Shape[]): [number, number, number, number] {
  const out: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const shape of shapes) {
    if (shape.carve) continue;
    const [x0, y0, x1, y1] = bounds(shape);
    out[0] = Math.min(out[0], x0);
    out[1] = Math.min(out[1], y0);
    out[2] = Math.max(out[2], x1);
    out[3] = Math.max(out[3], y1);
  }
  return out;
}

function bounds(shape: Shape): [number, number, number, number] {
  if (shape.kind === 'circle') return [shape.cx - shape.r, shape.cy - shape.r, shape.cx + shape.r, shape.cy + shape.r];
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of shape.points) {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  return [x0, y0, x1, y1];
}

/** Isi sampel yang tertutup `shape` baris demi baris (scanline): padat = ambil level tertinggi, pahat = batasi. */
function paint(shape: Shape, buf: Uint8Array, left: number, top: number, sw: number, sh: number, subCols: number, subRows: number): void {
  const [, y0, , y1] = bounds(shape);
  const ja = Math.max(0, Math.ceil((y0 - top) / sh - 0.5));
  const jb = Math.min(subRows - 1, Math.floor((y1 - top) / sh - 0.5));
  const level = shape.level;
  for (let j = ja; j <= jb; j++) {
    const y = top + (j + 0.5) * sh;
    xs.length = 0;
    if (shape.kind === 'circle') {
      const dy = y - shape.cy;
      const d = shape.r * shape.r - dy * dy;
      if (d < 0) continue;
      const dx = Math.sqrt(d);
      xs.push(shape.cx - dx, shape.cx + dx);
    } else {
      const pts = shape.points;
      for (let i = 0, k = pts.length - 1; i < pts.length; k = i++) {
        const yi = pts[i][1];
        const yk = pts[k][1];
        if (yi > y !== yk > y) xs.push(pts[i][0] + ((y - yi) * (pts[k][0] - pts[i][0])) / (yk - yi));
      }
      if (xs.length > 2) xs.sort((a, b) => a - b);
      else if (xs.length === 2 && xs[0] > xs[1]) xs.reverse();
    }
    const row = j * subCols;
    for (let p = 0; p + 1 < xs.length; p += 2) {
      const ia = Math.max(0, Math.ceil((xs[p] - left) / sw - 0.5));
      const ib = Math.min(subCols - 1, Math.floor((xs[p + 1] - left) / sw - 0.5));
      for (let i = ia; i <= ib; i++) {
        const idx = row + i;
        if (shape.carve) {
          if (buf[idx] > level) buf[idx] = level;
        } else if (buf[idx] < level) buf[idx] = level;
      }
    }
  }
}

/**
 * Bentuk → sprite dengan sel selebar `cellW` dan setinggi `cellH` (satuan yang sama dengan bentuk). Grid diselaraskan
 * supaya `anchor` tepat di tengah satu sel; `clip` (opsional) membatasi ke kotak yang terlihat. Tiap sel diambil 4×4
 * sampel: kepadatan = min(rata-rata level sampel yang tertutup, level dari luasan yang tertutup), jadi isi padat, tepi
 * ringan, dan guratan sedikit lebih terang. Sel tepi / garis tipis / guratan diberi arah dari sebaran sampelnya (momen
 * kedua): garis miring jadi '/' atau '\', tegak '|', mendatar '-' atau '_'.
 */
export function rasterize(shapes: readonly Shape[], cellW: number, cellH: number, anchor: Pt = [0, 0], clip?: readonly [number, number, number, number]): Sprite {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const shape of shapes) {
    if (shape.carve) continue;
    const [x0, y0, x1, y1] = bounds(shape);
    if (x0 < minX) minX = x0;
    if (y0 < minY) minY = y0;
    if (x1 > maxX) maxX = x1;
    if (y1 > maxY) maxY = y1;
  }
  // Hanya bagian yang terlihat (burung yang sebagian keluar layar tidak dirasterisasi seluruhnya)
  if (clip) {
    minX = Math.max(minX, clip[0]);
    minY = Math.max(minY, clip[1]);
    maxX = Math.min(maxX, clip[2]);
    maxY = Math.min(maxY, clip[3]);
  }
  if (!(minX <= maxX) || !(minY <= maxY) || !(cellW > 0) || !(cellH > 0)) {
    return { cols: 0, rows: 0, cells: new Uint8Array(0), dirs: new Uint8Array(0), marks: new Map(), dens: new Float32Array(0), ax: 0, ay: 0, c0: 0, r0: 0 };
  }
  const c0 = Math.floor((minX - anchor[0]) / cellW + 0.5);
  const r0 = Math.floor((minY - anchor[1]) / cellH + 0.5);
  const cols = Math.floor((maxX - anchor[0]) / cellW + 0.5) - c0 + 1;
  const rows = Math.floor((maxY - anchor[1]) / cellH + 0.5) - r0 + 1;
  const left = anchor[0] + (c0 - 0.5) * cellW;
  const top = anchor[1] + (r0 - 0.5) * cellH;
  const sw = cellW / SUB;
  const sh = cellH / SUB;
  const subCols = cols * SUB;
  const subRows = rows * SUB;
  const n = subCols * subRows;
  if (scratch.length < n) scratch = new Uint8Array(Math.ceil(n * 1.5));
  const buf = scratch;
  buf.fill(0, 0, n);
  for (const shape of shapes) if (!shape.carve) paint(shape, buf, left, top, sw, sh, subCols, subRows);
  for (const shape of shapes) if (shape.carve) paint(shape, buf, left, top, sw, sh, subCols, subRows);

  const cells = new Uint8Array(cols * rows);
  const dens = new Float32Array(cols * rows);
  const dirs = new Uint8Array(cols * rows);
  const total = SUB * SUB;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let covered = 0;
      let peak = 0;
      let low = 5;
      let sum = 0;
      for (let j = 0; j < SUB; j++) {
        const row = (r * SUB + j) * subCols + c * SUB;
        for (let i = 0; i < SUB; i++) {
          const v = buf[row + i];
          if (!v) continue;
          covered++;
          sum += v;
          if (v > peak) peak = v;
          if (v < low) low = v;
        }
      }
      if (!covered) continue;
      const f = covered / total;
      const byArea = f >= 0.75 ? 4 : f >= 0.45 ? 3 : f >= 0.2 ? 2 : 1;
      const index = r * cols + c;
      cells[index] = Math.min(Math.round(sum / covered), byArea);
      dens[index] = sum / (total * 4);
      // Arah garis: sebaran sampel yang tertutup (tepi / garis tipis), atau sampel yang lebih terang di sel penuh (guratan)
      const edge = f < 0.8;
      if (!edge && low >= peak) continue;
      let n = 0;
      let sx = 0;
      let sy = 0;
      let sxx = 0;
      let syy = 0;
      let sxy = 0;
      for (let j = 0; j < SUB; j++) {
        const row = (r * SUB + j) * subCols + c * SUB;
        const y = (j + 0.5) * sh;
        for (let i = 0; i < SUB; i++) {
          const v = buf[row + i];
          if (edge ? !v : !v || v >= peak) continue;
          const x = (i + 0.5) * sw;
          n++;
          sx += x;
          sy += y;
          sxx += x * x;
          syy += y * y;
          sxy += x * y;
        }
      }
      if (n < 2) continue;
      const mx = sx / n;
      const my = sy / n;
      const cxx = sxx / n - mx * mx;
      const cyy = syy / n - my * my;
      const cxy = sxy / n - mx * my;
      const trace = cxx + cyy;
      if (trace > 0 && Math.hypot(cxx - cyy, 2 * cxy) / trace > 0.55) {
        const angle = (0.5 * Math.atan2(2 * cxy, cxx - cyy) * 180) / Math.PI;
        const a = Math.abs(angle);
        dirs[index] = a < 22.5 ? (edge && my > cellH * 0.62 ? 5 : 1) : a > 67.5 ? 3 : angle > 0 ? 4 : 2;
      }
    }
  }
  // Guratan berarah: sel yang pusatnya di dalam guratan (tertutup penuh, tanpa arah dari sebaran sampel) ikut bergaris
  for (const shape of shapes) {
    if (shape.kind !== 'poly' || !shape.carve || !shape.dir) continue;
    const [x0, y0, x1, y1] = bounds(shape);
    const ca = Math.max(0, Math.floor((x0 - left) / cellW));
    const cb = Math.min(cols - 1, Math.floor((x1 - left) / cellW));
    const ra = Math.max(0, Math.floor((y0 - top) / cellH));
    const rb = Math.min(rows - 1, Math.floor((y1 - top) / cellH));
    for (let r = ra; r <= rb; r++) {
      for (let c = ca; c <= cb; c++) {
        const index = r * cols + c;
        if (!cells[index] || dirs[index]) continue;
        if (insidePoly(shape.points, left + (c + 0.5) * cellW, top + (r + 0.5) * cellH)) dirs[index] = shape.dir;
      }
    }
  }
  // Glyph khusus (mata) di sel pusat lingkarannya
  const marks = new Map<number, string>();
  for (const shape of shapes) {
    if (shape.kind !== 'circle' || !shape.glyph) continue;
    const c = Math.floor((shape.cx - left) / cellW);
    const r = Math.floor((shape.cy - top) / cellH);
    if (c >= 0 && c < cols && r >= 0 && r < rows && cells[r * cols + c]) marks.set(r * cols + c, shape.glyph);
  }
  return { cols, rows, cells, dirs, marks, dens, ax: 0.5 - c0, ay: 0.5 - r0, c0, r0 };
}

/** Pratinjau teks sprite (tes & pengembangan): kepadatan 0..4 → " .:+#". */
export function spriteToText(sprite: Sprite): string {
  const ramp = ' .:+#';
  const lines: string[] = [];
  for (let r = 0; r < sprite.rows; r++) {
    let line = '';
    for (let c = 0; c < sprite.cols; c++) line += ramp[sprite.cells[r * sprite.cols + c]];
    lines.push(line.replace(/\s+$/, ''));
  }
  return lines.join('\n');
}
