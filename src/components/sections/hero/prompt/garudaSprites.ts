// Sprite ASCII burung Garuda untuk latar hero gaya Prompt AI (GarudaAscii.tsx).
//
// Idenya dari ascii-sharks (github.com/stackedlol/ascii-sharks, MIT © 2026 drewdi): makhluk tidak digambar sebagai teks
// tetap, melainkan BENTUK yang dirasterisasi ke grid sel monospace, lalu tiap sel diberi glyph sesuai kepadatannya
// (isi padat, tepi ringan). Di sini bentuknya burung Garuda parametrik: badan, kepala, paruh bengkok, sayap bersendi
// (lengan + tangan) dengan bulu primer yang mengembang, ekor kipas, dan kaki; satuan = panjang badan (1.0), +x = arah
// terbang, +y = ke bawah. Pose:
// - flap[0..7] (tampak dari bawah, terbang melintas): fase kepakan; sayap terbentang penuh → memendek & menyapu ke
//   belakang (terlipat) → terbentang lagi;
// - glide (tampak dari bawah): sayap terbentang, untuk meluncur dan pose diam reduced motion;
// - flare (tampak samping): sayap terangkat, kaki terjulur: mendarat & lepas landas;
// - perch (tampak samping): hinggap, sayap terlipat di badan, kaki di dahan.
// Dirasterisasi sekali per ukuran (jumlah sel per panjang badan), hasilnya di-cache. Kode sendiri, bukan salinan.
// Murni (tanpa DOM) supaya bisa diuji.

export const FLAP_FRAMES = 8;

/** Kepadatan sel 0..4 (0 = kosong, 4 = paling padat); glyph & warnanya dipilih saat menggambar (GarudaAscii). */
export type Level = 0 | 1 | 2 | 3 | 4;

export interface Sprite {
  cols: number;
  rows: number;
  /** Kepadatan per sel, baris demi baris (rows × cols). */
  cells: Uint8Array;
  /** Titik acuan (koordinat sel, pecahan): pusat badan untuk pose terbang, telapak kaki untuk pose samping. */
  ax: number;
  ay: number;
}

export interface SpriteSet {
  flap: Sprite[];
  glide: Sprite;
  flare: Sprite;
  perch: Sprite;
}

type Pt = readonly [number, number];
type ShapeLevel = 2 | 3 | 4;
interface Poly {
  kind: 'poly';
  points: Pt[];
  level: ShapeLevel;
  hole?: boolean;
}
interface Ellipse {
  kind: 'ellipse';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** Rotasi (radian, searah jarum jam di layar karena +y ke bawah). */
  rot: number;
  level: ShapeLevel;
  hole?: boolean;
}
type Shape = Poly | Ellipse;

const deg = (d: number) => (d * Math.PI) / 180;
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
const mul = (a: Pt, k: number): Pt => [a[0] * k, a[1] * k];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const unit = (v: Pt): Pt => {
  const n = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / n, v[1] / n];
};

const poly = (points: Pt[], level: ShapeLevel, hole = false): Poly => ({ kind: 'poly', points, level, hole });
const ellipse = (cx: number, cy: number, rx: number, ry: number, rot: number, level: ShapeLevel, hole = false): Ellipse => ({
  kind: 'ellipse',
  cx,
  cy,
  rx,
  ry,
  rot,
  level,
  hole,
});

/** Garis tebal dari `a` ke `b` (segi empat selebar `width`). */
function strip(a: Pt, b: Pt, width: number, level: ShapeLevel, tipWidth = width): Poly {
  const d = unit([b[0] - a[0], b[1] - a[1]]);
  const n: Pt = [-d[1] * 0.5, d[0] * 0.5];
  return poly([add(a, mul(n, width)), add(b, mul(n, tipWidth)), add(b, mul(n, -tipWidth)), add(a, mul(n, -width))], level);
}

/* ─── Sayap ───────────────────────────────────────────────────────────────── */

/**
 * Sayap bersendi: tulang lengan `p0→p1` lalu tangan `p1→p2`; tebal sayap (chord) memanjang di sumbu x (tepi depan ke
 * +x, tepi belakang ke −x, tempat bulu primer menjulur). `chord` = [pangkal, siku, ujung] jarak tepi belakang dari tulang;
 * `front` jarak tepi depan. Bulu primer: 5 jari dari tepi belakang tangan, mengembang ke arah `fingerDir(t)`.
 */
function wing(
  spine: [Pt, Pt, Pt],
  chord: [number, number, number],
  front: [number, number, number],
  fingerDir: (t: number) => Pt,
  fingerLen: (t: number) => number,
  level: ShapeLevel,
): Shape[] {
  const [p0, p1, p2] = spine;
  const lead: Pt[] = [
    [p0[0] + front[0], p0[1]],
    [p1[0] + front[1], p1[1]],
    [p2[0] + front[2], p2[1]],
  ];
  const trail: Pt[] = [
    [p2[0] - chord[2], p2[1]],
    [p1[0] - chord[1], p1[1]],
    [p0[0] - chord[0], p0[1]],
  ];
  const shapes: Shape[] = [poly([...lead, ...trail], level)];
  const fingerLevel: ShapeLevel = level > 2 ? ((level - 1) as ShapeLevel) : 2;
  for (let j = 0; j < 4; j++) {
    const t = j / 3;
    const base: Pt = [lerp(p1[0] - chord[1], p2[0] - chord[2], t), lerp(p1[1], p2[1], t)];
    const dir = unit(fingerDir(t));
    const tip = add(base, mul(dir, fingerLen(t)));
    shapes.push(strip(base, tip, 0.04, fingerLevel, 0.018));
  }
  return shapes;
}

/* ─── Tampak dari bawah (terbang melintas) ───────────────────────────────── */

/** Ekor kipas tampak dari bawah (simetris, dua lekukan per sisi). */
const TAIL_BOTTOM: Pt[] = [
  [0.14, -0.06],
  [-0.02, -0.15],
  [-0.1, -0.18],
  [-0.14, -0.12],
  [-0.12, -0.05],
  [-0.16, 0],
  [-0.12, 0.05],
  [-0.14, 0.12],
  [-0.1, 0.18],
  [-0.02, 0.15],
  [0.14, 0.06],
];

function bodyBottom(): Shape[] {
  return [
    ellipse(0.4, 0, 0.33, 0.085, 0, 4), // badan
    ellipse(0.76, 0, 0.085, 0.07, 0, 4), // kepala
    poly([[0.82, -0.03], [0.94, 0], [0.82, 0.03]], 3), // paruh
    poly(TAIL_BOTTOM, 3),
  ];
}

/**
 * Satu sayap tampak dari bawah. `side` +1 = sayap di +y (bawah layar), −1 = di −y. `fold` 0 = terbentang penuh,
 * 1 = terlipat: lengan & tangan memendek dan menyapu ke belakang, bulu primer merapat.
 */
function wingBottom(side: 1 | -1, fold: number): Shape[] {
  const root: Pt = [0.46, side * 0.07];
  const sweepArm = deg(14 + 44 * fold);
  const sweepHand = sweepArm + deg(22 + 34 * fold);
  const armLen = 0.4 * (1 - 0.22 * fold);
  const handLen = 0.36 * (1 - 0.38 * fold);
  const p1 = add(root, mul([-Math.sin(sweepArm), side * Math.cos(sweepArm)], armLen));
  const p2 = add(p1, mul([-Math.sin(sweepHand), side * Math.cos(sweepHand)], handLen));
  return wing(
    [root, p1, p2],
    [0.18, 0.14, 0.06],
    [0.12, 0.09, 0.04],
    (t) => [-1, side * (0.2 + 1.1 * t) * (1 - 0.7 * fold)],
    (t) => (0.15 + 0.13 * t) * (1 - 0.55 * fold),
    3,
  );
}

const flightShapes = (fold: number): Shape[] => [...wingBottom(-1, fold), ...wingBottom(1, fold), ...bodyBottom()];

/* ─── Tampak samping (mendarat, hinggap) ─────────────────────────────────── */

/** Kepala, leher, paruh bengkok, dan mata (lubang) tampak samping; `head` = pusat kepala. */
function headSide(head: Pt, neckBase: Pt): Shape[] {
  const [hx, hy] = head;
  return [
    poly([[neckBase[0] - 0.06, neckBase[1]], [hx - 0.05, hy + 0.02], [hx + 0.06, hy + 0.05], [neckBase[0] + 0.08, neckBase[1] + 0.02]], 4),
    ellipse(hx, hy, 0.09, 0.085, 0, 4),
    poly([[hx + 0.07, hy - 0.04], [hx + 0.2, hy + 0.005], [hx + 0.185, hy + 0.045], [hx + 0.08, hy + 0.05]], 3), // paruh
    ellipse(hx + 0.025, hy - 0.025, 0.02, 0.02, 0, 2, true), // mata
  ];
}

function legs(hip: Pt, foot: Pt, spread: number, level: ShapeLevel): Shape[] {
  const back: Pt = [hip[0] - spread, hip[1] + 0.01];
  const backFoot: Pt = [foot[0] - spread, foot[1]];
  return [
    strip(hip, foot, 0.035, level),
    strip(back, backFoot, 0.035, level),
    strip([foot[0] - 0.05, foot[1]], [foot[0] + 0.1, foot[1]], 0.03, 2),
    strip([backFoot[0] - 0.05, backFoot[1]], [backFoot[0] + 0.1, backFoot[1]], 0.03, 2),
  ];
}

/** Mendarat / lepas landas: badan agak tegak, kedua sayap terangkat ke atas-belakang, ekor mengipas ke bawah, kaki terjulur. */
function flareShapes(): Shape[] {
  const raised = (shoulder: Pt, scale: number, level: ShapeLevel): Shape[] => {
    const p1 = add(shoulder, mul([-0.34, -0.94], 0.34 * scale));
    const p2 = add(p1, mul([0.22, -0.97], 0.3 * scale));
    return wing(
      [shoulder, p1, p2],
      [0.16 * scale, 0.14 * scale, 0.06 * scale],
      [0.1 * scale, 0.08 * scale, 0.04 * scale],
      (t) => [-1, -(0.2 + 1.0 * t)],
      (t) => (0.14 + 0.12 * t) * scale,
      level,
    );
  };
  return [
    ...raised([0.38, -0.06], 0.85, 2), // sayap jauh (lebih muda)
    ellipse(0.4, 0.02, 0.28, 0.12, deg(-20), 4), // badan
    ...headSide([0.66, -0.17], [0.52, -0.08]),
    poly([[0.24, 0.13], [0.02, 0.4], [-0.03, 0.35], [-0.06, 0.38], [-0.1, 0.32], [-0.14, 0.33], [0.16, 0.03]], 3), // ekor
    ...legs([0.46, 0.1], [0.56, 0.3], 0.08, 3),
    ...raised([0.48, -0.08], 1, 3), // sayap dekat
  ];
}

/** Hinggap: badan tegak, sayap terlipat memanjang ke ekor, ekor menjuntai ke bawah-belakang, kaki di dahan. */
function perchShapes(): Shape[] {
  return [
    ellipse(0.4, 0.08, 0.27, 0.14, deg(-38), 4), // badan
    ...headSide([0.62, -0.27], [0.5, -0.14]),
    poly([[0.56, -0.16], [0.62, -0.06], [0.44, 0.08], [0.2, 0.24], [0.08, 0.28], [0.1, 0.2], [0.28, 0.02], [0.46, -0.14]], 3), // sayap terlipat
    poly([[0.2, 0.14], [0.28, 0.22], [0.02, 0.44], [-0.08, 0.42], [-0.02, 0.34], [0.04, 0.36], [0.1, 0.26]], 3), // ekor
    ...legs([0.44, 0.2], [0.47, 0.34], 0.08, 3),
  ];
}

/* ─── Rasterisasi ─────────────────────────────────────────────────────────── */

function bbox(shape: Shape): [number, number, number, number] {
  if (shape.kind === 'ellipse') {
    const r = Math.max(shape.rx, shape.ry);
    return [shape.cx - r, shape.cy - r, shape.cx + r, shape.cy + r];
  }
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of shape.points) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  return [x0, y0, x1, y1];
}

function inside(shape: Shape, x: number, y: number): boolean {
  if (shape.kind === 'ellipse') {
    const dx = x - shape.cx;
    const dy = y - shape.cy;
    const c = Math.cos(shape.rot);
    const s = Math.sin(shape.rot);
    const u = (dx * c + dy * s) / shape.rx;
    const v = (-dx * s + dy * c) / shape.ry;
    return u * u + v * v <= 1;
  }
  // Ray casting genap-ganjil
  const pts = shape.points;
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

const SUB = 3; // sampel per sisi sel (3×3)

/**
 * Bentuk (satuan badan) → sprite dengan `unit` sel per satuan ke samping dan `aspect` = tinggi/lebar sel. Tiap sel
 * diambil 3×3 sampel: kepadatan = min(level bentuk tertinggi yang kena, level dari luasan yang tertutup), jadi isi
 * bentuk padat dan tepinya ringan. Lubang (mata) mengosongkan sampel.
 */
function rasterize(shapes: Shape[], unit: number, aspect: number, anchor: Pt): Sprite {
  const boxes = shapes.map(bbox);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x0, y0, x1, y1] of boxes) {
    minX = Math.min(minX, x0);
    minY = Math.min(minY, y0);
    maxX = Math.max(maxX, x1);
    maxY = Math.max(maxY, y1);
  }
  const cellW = 1 / unit;
  const cellH = aspect / unit;
  const cols = Math.max(1, Math.ceil((maxX - minX) / cellW) + 1);
  const rows = Math.max(1, Math.ceil((maxY - minY) / cellH) + 1);
  const cells = new Uint8Array(cols * rows);
  const solid = shapes.map((shape, i) => ({ shape, box: boxes[i] })).filter(({ shape }) => !shape.hole);
  const holes = shapes.map((shape, i) => ({ shape, box: boxes[i] })).filter(({ shape }) => shape.hole);
  const total = SUB * SUB;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let covered = 0;
      let top = 0;
      for (let sy = 0; sy < SUB; sy++) {
        const y = minY + (r + (sy + 0.5) / SUB) * cellH;
        for (let sx = 0; sx < SUB; sx++) {
          const x = minX + (c + (sx + 0.5) / SUB) * cellW;
          let level = 0;
          for (const { shape, box } of solid) {
            if (shape.level <= level || x < box[0] || x > box[2] || y < box[1] || y > box[3]) continue;
            if (inside(shape, x, y)) level = shape.level;
          }
          if (level && holes.some(({ shape, box }) => x >= box[0] && x <= box[2] && y >= box[1] && y <= box[3] && inside(shape, x, y))) level = 0;
          if (level) {
            covered++;
            if (level > top) top = level;
          }
        }
      }
      const f = covered / total;
      const byArea = f >= 0.8 ? 4 : f >= 0.5 ? 3 : f >= 0.22 ? 2 : f > 0 ? 1 : 0;
      cells[r * cols + c] = Math.min(top, byArea);
    }
  }
  return { cols, rows, cells, ax: (anchor[0] - minX) / cellW, ay: (anchor[1] - minY) / cellH };
}

/** Sprite yang dicerminkan ke kiri-kanan (burung menghadap −x). */
export function mirrorSprite(sprite: Sprite): Sprite {
  const cells = new Uint8Array(sprite.cells.length);
  for (let r = 0; r < sprite.rows; r++) {
    for (let c = 0; c < sprite.cols; c++) cells[r * sprite.cols + (sprite.cols - 1 - c)] = sprite.cells[r * sprite.cols + c];
  }
  return { ...sprite, cells, ax: sprite.cols - 1 - sprite.ax };
}

/** Lipatan sayap untuk fase kepakan `phase` (0..1): 0 terbentang → 0,5 terlipat → 1 terbentang (halus). */
export const foldAt = (phase: number): number => (1 - Math.cos(2 * Math.PI * phase)) / 2;

const cache = new Map<string, SpriteSet>();

/**
 * Rasterisasi satu set sprite (burung dengan `unit` sel per panjang badan, sel setinggi `aspect` × lebarnya) sebagai
 * daftar langkah: satu pose per langkah (±10 ms di laptop, ±30 ms di HP), supaya mesin bisa mencicilnya per potongan
 * idle dan tidak menjadi satu tugas panjang ±100 ms di dalam frame animasi. Jalankan semua `steps`, lalu `done()`
 * mengembalikan set lengkap (dan menyimpannya di cache; ukuran yang sudah ada di cache memberi `steps` kosong).
 */
export function spriteSetSteps(unit: number, aspect: number): { steps: Array<() => void>; done: () => SpriteSet } {
  const key = `${unit}:${aspect.toFixed(3)}`;
  const cached = cache.get(key);
  if (cached) return { steps: [], done: () => cached };
  const bodyCentre: Pt = [0.4, 0];
  const flap: Sprite[] = [];
  let flare: Sprite | undefined;
  let perch: Sprite | undefined;
  const steps: Array<() => void> = [
    ...Array.from({ length: FLAP_FRAMES }, (_, i) => () => {
      flap[i] = rasterize(flightShapes(foldAt(i / FLAP_FRAMES)), unit, aspect, bodyCentre);
    }),
    () => {
      flare = rasterize(flareShapes(), unit, aspect, [0.56, 0.3]);
    },
    () => {
      perch = rasterize(perchShapes(), unit, aspect, [0.47, 0.34]);
    },
  ];
  const done = (): SpriteSet => {
    const existing = cache.get(key);
    if (existing) return existing;
    if (flap.length !== FLAP_FRAMES || !flare || !perch) throw new Error('spriteSetSteps: belum semua langkah dijalankan');
    // Luncur = kepakan fase 0 (sayap terbentang penuh), sprite yang sama
    const set: SpriteSet = { flap, glide: flap[0], flare, perch };
    cache.set(key, set);
    return set;
  };
  return { steps, done };
}

/** Semua pose sekaligus (tes, pose diam reduced motion); rasterisasi hanya sekali per ukuran (di-cache). */
export function spriteSet(unit: number, aspect: number): SpriteSet {
  const { steps, done } = spriteSetSteps(unit, aspect);
  for (const step of steps) step();
  return done();
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
