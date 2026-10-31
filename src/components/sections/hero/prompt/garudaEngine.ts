// Mesin kanvas tiga burung Garuda ASCII (GarudaAscii.tsx): memasang kanvas, loop animasi 60 fps (requestAnimationFrame),
// dan menggambar adegan garudaFlight.ts: partikel, lalu burung-burung (yang jauh dulu, yang dekat paling depan) yang
// dirasterisasi ulang tiap frame dari modelnya (garudaSprites.ts). Tampilan mengikuti video rujukan dan ascii-sharks
// (github.com/stackedlol/ascii-sharks, MIT): sel glyph monospace abu-abu tipis di atas latar putih, sel padat lebih gelap,
// tepi ringan / bergaris menurut arahnya, sel burung diberi "kotak" samar seperti tuts, sedikit kerlip glyph.
// - Kedalaman: burung jauh = kecil, glyph sedikit lebih kecil & lebih pudar (seperti tertutup udara); dekat = besar,
//   lebih banyak sel (lebih detail), lebih pekat. Burung yang lewat di belakang judul / kotak prompt diredupkan.
// - Burung seukuran layar: hanya bagian yang terlihat yang dirasterisasi, dan kotak "tuts" dilewati bila selnya sangat
//   banyak (hemat waktu frame).
// - Hemat: berhenti saat kanvas tidak terlihat atau tab disembunyikan, DPR maks. 2, reduced motion = satu gambar diam.
import { contentBox, createScene, stepScene, stillScene, type Bird, type Rect, type Scene } from './garudaFlight';
import { DIR_GLYPHS, rasterize } from './garudaSprites';

/** --site-fg (#121620): semua sel memakai warna teks utama dengan alpha rendah, jadi abu-abu di atas putih. */
const FG = '18, 22, 32';
/** Alpha glyph per kepadatan 0..4 (design.md: komposisi netral, tanpa warna lain di latar). */
const ALPHA = [0, 0.18, 0.3, 0.44, 0.58];
/** Sel paling pekat: warna teks utama dengan alpha ini di atas putih (untuk cek kontras teks hero di atas kanvas). */
export const GLYPH_ALPHA_MAX = ALPHA[4];
/** Glyph isi burung per kepadatan: tepi ringan → isi padat. */
const GLYPHS = ['', ".'`,", ':;=+', '%SXt', '@#8&'];
const CELL_ASPECT = 1.5;
const MAX_DT = 0.05;
const SHIMMER_SECONDS = 0.35;
/** Kotak "tuts" memudar antara jumlah sel ini (burung seukuran layar: tanpa kotak, hemat waktu frame). */
const BOX_FADE_CELLS: readonly [number, number] = [1800, 3200];
const FONT_STACK = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Lebar sel (px) untuk lebar hero `w`: 7 px di HP sampai 9 px di layar lebar. */
export const cellWidth = (w: number): number => clamp(Math.round(w / 170), 7, 9);

/**
 * Hash 32-bit deterministik per sel: glyph yang sama untuk sel yang sama (tanpa kedip), kecuali yang sengaja berkerlip.
 * Diaduk ulang (avalanche) supaya sisa bagi kecil tidak berpola berulang di burung besar.
 */
const hash = (c: number, r: number, seed: number): number => {
  let x = Math.imul(c + 1, 73856093) ^ Math.imul(r + 1, 19349663) ^ Math.imul(seed + 1, 83492791);
  x = Math.imul(x ^ (x >>> 15), 0x2c1b3c6d);
  x = Math.imul(x ^ (x >>> 12), 0x297a2d39);
  return (x ^ (x >>> 15)) >>> 0;
};

const font = (cellH: number) => `500 ${(cellH * 0.82).toFixed(2)}px ${FONT_STACK}`;
const rgba = (alpha: number) => `rgba(${FG}, ${alpha.toFixed(3)})`;

/** Kotak elemen hero bertanda data-garuda-avoid (judul, kotak prompt, chip) relatif terhadap kanvas. */
function measureAvoid(canvas: HTMLCanvasElement): Rect[] {
  const host = canvas.closest('section');
  if (!host) return [];
  const base = canvas.getBoundingClientRect();
  return Array.from(host.querySelectorAll('[data-garuda-avoid]'), (el) => {
    const r = el.getBoundingClientRect();
    return { l: r.left - base.left, t: r.top - base.top, r: r.right - base.left, b: r.bottom - base.top };
  }).filter((r) => r.r > r.l && r.b > r.t);
}

/** Pasang animasi di `canvas` (mengisi kotak induknya). Mengembalikan fungsi untuk melepasnya. */
export function startGaruda(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  const reduced = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

  let w = 0;
  let h = 0;
  let dpr = 1;
  let cw = 8;
  let ch = 12;
  let scene: Scene | null = null;
  let contentKey = '';
  let raf = 0;
  // Kanvas di dalam viewport (IntersectionObserver) DAN tab terlihat: keduanya dipegang terpisah, karena ganti tab
  // tidak memicu IntersectionObserver dan loop tidak boleh jalan lagi untuk hero yang masih di luar layar
  let intersecting = true;
  let visible = true;
  let disposed = false;
  let last = 0;
  /** Redup per burung saat lewat di belakang konten (berubah halus). */
  let fades: number[] = [];

  const drawParticles = () => {
    if (!scene || !scene.particles.length) return;
    ctx.font = font(ch);
    for (const p of scene.particles) {
      const t = p.age / p.life;
      const life = Math.min(1, p.age / 0.12) * (1 - t * t);
      let glyph: string;
      let alpha: number;
      if (p.kind === 'spark') {
        // Kilau: bintang → plus → titik, sesekali berkedip
        glyph = Math.floor(p.age * 14 + p.seed * 7) % 5 === 0 ? "'" : t < 0.3 ? '*' : t < 0.65 ? '+' : '.';
        alpha = 0.4;
      } else {
        // Bulu berayun: condong ke arah ayunannya
        const sway = Math.cos(p.phase);
        glyph = sway > 0.35 ? ')' : sway < -0.35 ? '(' : '~';
        alpha = 0.36;
      }
      ctx.fillStyle = rgba(alpha * life);
      ctx.setTransform(dpr * p.size, 0, 0, dpr * p.size, dpr * p.x, dpr * p.y);
      ctx.fillText(glyph, 0, 0);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const drawBird = (bird: Bird, now: number, dt: number) => {
    const geo = bird.geometry;
    if (!scene || !geo) return;
    const bodyPx = scene.L0 * bird.s;
    if (bodyPx < 4) return;
    // Jauh: glyph sedikit lebih kecil & pudar; dekat: lebih besar & pekat (sel per panjang badan tetap bertambah)
    const near = clamp((bird.s - 0.2) / 1, 0, 1);
    const scale = 0.86 + 0.24 * near;
    const bcw = cw * scale;
    const bch = ch * scale;
    // Bagian yang terlihat saja (satuan panjang badan, relatif pusat badan)
    const clip = [(-bird.x - bcw) / bodyPx, (-bird.y - bch) / bodyPx, (w - bird.x + bcw) / bodyPx, (h - bird.y + bch) / bodyPx] as const;
    const sprite = rasterize(geo.shapes, bcw / bodyPx, bch / bodyPx, [0, 0], clip);
    if (!sprite.cols) return;
    const left = bird.x - sprite.ax * bcw;
    const top = bird.y - sprite.ay * bch;
    const width = sprite.cols * bcw;
    const height = sprite.rows * bch;

    // Redup saat melintas di belakang judul / kotak prompt (keterbacaan), berubah halus
    const { content } = scene;
    const ox = Math.max(0, Math.min(left + width, content.r) - Math.max(left, content.l));
    const oy = Math.max(0, Math.min(top + height, content.b) - Math.max(top, content.t));
    const target = 1 - 0.35 * ((ox * oy) / (width * height));
    const prev = fades[bird.index] ?? target;
    const fade = prev + (target - prev) * clamp(dt * 5, 0, 1);
    fades[bird.index] = fade;
    const alphaK = (0.55 + 0.45 * near) * fade;

    const { cells, dirs, marks, cols } = sprite;
    // Kotak samar di belakang glyph (tampilan "tuts" seperti video rujukan), satu path per kepadatan; memudar saat
    // burung sangat besar
    const boxK = clamp((BOX_FADE_CELLS[1] - cells.length) / (BOX_FADE_CELLS[1] - BOX_FADE_CELLS[0]), 0, 1);
    if (boxK > 0) {
      for (let level = 1; level <= 4; level++) {
        ctx.beginPath();
        let any = false;
        for (let i = 0; i < cells.length; i++) {
          if (cells[i] !== level) continue;
          const c = i % cols;
          const r = (i - c) / cols;
          ctx.rect(left + c * bcw + 0.5, top + r * bch + 0.5, bcw - 1, bch - 1);
          any = true;
        }
        if (any) {
          ctx.fillStyle = rgba(0.028 * level * alphaK * boxK);
          ctx.fill();
        }
      }
    }
    ctx.font = font(bch);
    const shimmer = Math.floor(now / 1000 / SHIMMER_SECONDS);
    for (let level = 1; level <= 4; level++) {
      ctx.fillStyle = rgba(ALPHA[level] * alphaK);
      const set = GLYPHS[level];
      for (let i = 0; i < cells.length; i++) {
        if (cells[i] !== level) continue;
        const c = i % cols;
        const r = (i - c) / cols;
        let glyph: string = DIR_GLYPHS[dirs[i]];
        if (!glyph) {
          // Glyph per sel relatif terhadap badan (tetap saat terbang); sebagian kecil berganti tiap SHIMMER_SECONDS
          const base = hash(c + sprite.c0, r + sprite.r0, 3 + bird.index);
          const pick = base % 7 === 0 ? hash(c + sprite.c0, r + sprite.r0, 3 + bird.index + shimmer) : base;
          glyph = set[pick % set.length];
        }
        ctx.fillText(glyph, left + c * bcw + bcw / 2, top + r * bch + bch / 2 + 0.5);
      }
    }
    // Mata: glyph khusus, sepekat sel terpadat
    if (marks.size) {
      ctx.fillStyle = rgba(ALPHA[4] * alphaK);
      for (const [i, glyph] of marks) {
        const c = i % cols;
        const r = (i - c) / cols;
        ctx.fillText(glyph, left + c * bcw + bcw / 2, top + r * bch + bch / 2 + 0.5);
      }
    }
  };

  const draw = (now: number, dt: number) => {
    if (!scene) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    drawParticles();
    // Yang jauh dulu, yang dekat menutupinya
    const birds = [...scene.birds].sort((a, b) => b.pos[2] - a.pos[2]);
    for (const bird of birds) drawBird(bird, now, dt);
  };

  const frame = (now: number) => {
    raf = 0;
    if (!visible || !scene) return;
    // Stempel waktu frame bisa sedikit lebih awal dari performance.now() di kick(): langkah tidak boleh negatif
    const dt = clamp((now - last) / 1000, 0, MAX_DT);
    last = now;
    stepScene(scene, dt);
    draw(now, dt);
    raf = requestAnimationFrame(frame);
  };

  const kick = () => {
    if (raf || !visible || reduced || !scene) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  /**
   * Ukuran berubah (jarang: putar layar) → adegan dibangun ulang; hanya kotak konten yang berubah (font selesai dimuat)
   * → kotaknya saja diperbarui, burung terus terbang.
   */
  const layout = (force: boolean) => {
    const rect = canvas.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    if (width < 1 || height < 1) return;
    const avoid = measureAvoid(canvas);
    const key = avoid.map((r) => `${Math.round(r.l / 8)},${Math.round(r.t / 8)},${Math.round(r.r / 8)},${Math.round(r.b / 8)}`).join('|');
    if (!force && width === w && height === h && key === contentKey) return;
    contentKey = key;
    if (!force && scene && width === w && height === h) {
      scene.content = contentBox(w, h, avoid);
      if (reduced) draw(0, 0);
      return;
    }
    if (width !== w || height !== h) {
      w = width;
      h = height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      cw = cellWidth(w);
      ch = Math.round(cw * CELL_ASPECT);
    }
    scene = reduced ? stillScene(w, h, { avoid, cell: cw }) : createScene(w, h, { avoid, cell: cw });
    fades = [];
    if (reduced) draw(0, 0);
    else kick();
  };

  const io = new IntersectionObserver(([entry]) => {
    intersecting = Boolean(entry?.isIntersecting);
    visible = intersecting && !document.hidden;
    if (visible) kick();
  });
  const onVisibility = () => {
    visible = intersecting && !document.hidden;
    if (visible) kick();
  };
  const ro = new ResizeObserver(() => layout(false));

  layout(true);
  ro.observe(canvas);
  io.observe(canvas);
  document.addEventListener('visibilitychange', onVisibility);
  // Judul memakai font web: setelah selesai dimuat kotaknya bisa berubah (dipakai untuk meredupkan burung)
  document.fonts?.ready.then(() => {
    if (!disposed) layout(false);
  });

  return () => {
    disposed = true;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    ro.disconnect();
    io.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
