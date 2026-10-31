// Mesin kanvas burung Garuda ASCII (GarudaAscii.tsx): memasang kanvas, loop animasi, dan menggambar adegan
// garudaFlight.ts dengan sprite garudaSprites.ts. Tampilan mengikuti video rujukan dan ascii-sharks
// (github.com/stackedlol/ascii-sharks, MIT): sel glyph monospace abu-abu tipis di atas latar putih, sel padat lebih
// gelap dan tepi ringan, tiap sel diberi "kotak" samar seperti tuts, sedikit kerlip glyph, titik riak di belakang burung;
// dahan = deretan '=' di bawah burung yang hinggap. Ringan: ±30 fps (24 fps di HP), berhenti saat kanvas tidak terlihat
// atau tab disembunyikan, DPR maks. 2, reduced motion = satu gambar diam. Sprite dirasterisasi dicicil per potongan
// idle (bukan di dalam frame), burung yang spritenya belum siap belum digambar (ia masih di luar layar).
import { LAND_SECONDS, TAKEOFF_SECONDS, createScene, stepScene, stillScene, type Bird, type Scene } from './garudaFlight';
import { FLAP_FRAMES, mirrorSprite, spriteSetSteps, type Sprite, type SpriteSet } from './garudaSprites';

/** --site-fg (#121620): semua sel memakai warna teks utama dengan alpha rendah, jadi abu-abu di atas putih. */
const FG = '18, 22, 32';
/** Alpha glyph per kepadatan 0..4 (design.md: komposisi netral, tanpa warna lain di latar). */
const ALPHA = [0, 0.18, 0.3, 0.44, 0.58];
/** Sel paling pekat: warna teks utama dengan alpha ini di atas putih (untuk cek kontras teks hero di atas kanvas). */
export const GLYPH_ALPHA_MAX = ALPHA[4];
/** Glyph per kepadatan: tepi ringan → isi padat. */
const GLYPHS = ['', ".'`,", ':;=+', '%SXt', '@#8&'];
const CELL_ASPECT = 1.5;
const MAX_DT = 0.05;
const SHIMMER_SECONDS = 0.35;
const BRANCH_GLYPH = '=';
/** Lama maksimal satu potongan rasterisasi sprite (ms) sebelum menyerahkan kembali ke browser. */
const BUILD_SLICE_MS = 8;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Lebar sel (px) untuk lebar hero `w`: 7 px di HP sampai 9 px di layar lebar. */
export const cellWidth = (w: number): number => clamp(Math.round(w / 170), 7, 9);

/** Hash 32-bit deterministik per sel: glyph yang sama untuk sel yang sama (tanpa kedip), kecuali yang sengaja berkerlip. */
const hash = (c: number, r: number, seed: number): number =>
  (Math.imul(c + 1, 73856093) ^ Math.imul(r + 1, 19349663) ^ Math.imul(seed + 1, 83492791)) >>> 0;

/** Jalankan `callback` saat browser senggang (requestIdleCallback; Safari: setTimeout). */
const whenIdle = (callback: () => void): void => {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number };
  if (typeof w.requestIdleCallback === 'function') w.requestIdleCallback(callback, { timeout: 250 });
  else window.setTimeout(callback, 16);
};

interface Sprites {
  right: SpriteSet;
  left: SpriteSet;
}

/** Pasang animasi di `canvas` (mengisi kotak induknya). Mengembalikan fungsi untuk melepasnya. */
export function startGaruda(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  const reduced = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

  let w = 0;
  let h = 0;
  let cw = 8;
  let ch = 12;
  let scene: Scene | null = null;
  let raf = 0;
  // Kanvas di dalam viewport (IntersectionObserver) DAN tab terlihat: keduanya dipegang terpisah, karena ganti tab
  // tidak memicu IntersectionObserver dan loop tidak boleh jalan lagi untuk hero yang masih di luar layar
  let intersecting = true;
  let visible = true;
  let disposed = false;
  let last = 0;
  let lastDraw = 0;
  const spritesByUnit = new Map<number, Sprites>();
  const building = new Set<number>();

  /** Rasterisasi set sprite `unit` dicicil per potongan idle; setelah siap burungnya mulai digambar. */
  const buildSprites = (unit: number) => {
    const { steps, done } = spriteSetSteps(unit, CELL_ASPECT);
    let next = 0;
    const slice = () => {
      if (disposed) return;
      const started = performance.now();
      while (next < steps.length && performance.now() - started < BUILD_SLICE_MS) steps[next++]();
      if (next < steps.length) {
        whenIdle(slice);
        return;
      }
      const right = done();
      spritesByUnit.set(unit, {
        right,
        left: {
          flap: right.flap.map(mirrorSprite),
          glide: mirrorSprite(right.glide),
          flare: mirrorSprite(right.flare),
          perch: mirrorSprite(right.perch),
        },
      });
      building.delete(unit);
      if (reduced) draw(0);
    };
    whenIdle(slice);
  };

  /** Sprite burung ini, atau null bila masih dirasterisasi (burung dilewati dulu; ia mulai dari luar layar). */
  const spritesFor = (bird: Bird, current: Scene): Sprites | null => {
    const unit = Math.max(10, Math.round((bird.size * current.length) / cw));
    const sprites = spritesByUnit.get(unit);
    if (sprites) return sprites;
    if (!building.has(unit)) {
      building.add(unit);
      buildSprites(unit);
    }
    return null;
  };

  const spriteOf = (bird: Bird, set: SpriteSet): Sprite => {
    if (bird.state === 'land' || bird.state === 'takeoff') return set.flare;
    if (bird.state === 'perch') return set.perch;
    if (bird.gliding) return set.glide;
    // Indeks aman untuk fase di luar 0..1 (tidak pernah negatif setelah dt dibatasi, tapi jangan sampai undefined)
    const frame = ((Math.floor(bird.phase * FLAP_FRAMES) % FLAP_FRAMES) + FLAP_FRAMES) % FLAP_FRAMES;
    return set.flap[frame];
  };

  const drawSprite = (sprite: Sprite, x: number, y: number, bank: number, seed: number, shimmer: number) => {
    ctx.save();
    ctx.translate(x, y);
    if (bank) ctx.rotate(bank);
    const left = -sprite.ax * cw;
    const top = -sprite.ay * ch;
    for (let r = 0; r < sprite.rows; r++) {
      for (let c = 0; c < sprite.cols; c++) {
        const level = sprite.cells[r * sprite.cols + c];
        if (!level) continue;
        const px = left + c * cw;
        const py = top + r * ch;
        const base = hash(c, r, seed);
        // Kotak samar di belakang glyph (tampilan "tuts" seperti video rujukan)
        ctx.fillStyle = `rgba(${FG}, ${(0.028 * level).toFixed(3)})`;
        ctx.fillRect(px + 0.5, py + 0.5, cw - 1, ch - 1);
        const set = GLYPHS[level];
        // Sebagian kecil sel berganti glyph tiap SHIMMER_SECONDS: tekstur hidup tanpa kedip menyeluruh
        const pick = base % 7 === 0 ? hash(c, r, seed + shimmer) : base;
        ctx.fillStyle = `rgba(${FG}, ${ALPHA[level]})`;
        ctx.fillText(set[pick % set.length], px + cw / 2, py + ch / 2 + 0.5);
      }
    }
    ctx.restore();
  };

  const drawBranch = (bird: Bird, alpha: number) => {
    const perch = bird.perch;
    if (!perch || alpha <= 0) return;
    const n = Math.round(7 + 5 * bird.size);
    const x0 = perch.x - (n * cw) / 2;
    const y = perch.y + ch * 0.55;
    ctx.fillStyle = `rgba(${FG}, ${(0.3 * alpha).toFixed(3)})`;
    for (let i = 0; i < n; i++) ctx.fillText(BRANCH_GLYPH, x0 + i * cw + cw / 2, y);
  };

  const draw = (now: number) => {
    if (!scene) return;
    ctx.clearRect(0, 0, w, h);
    ctx.font = `500 ${Math.round(ch * 0.82)}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const shimmer = Math.floor(now / 1000 / SHIMMER_SECONDS);

    // Riak: titik kecil di grid sel, memudar
    for (const dot of scene.dots) {
      const gx = Math.floor(dot.x / cw) * cw + cw / 2;
      const gy = Math.floor(dot.y / ch) * ch + ch / 2;
      ctx.fillStyle = `rgba(${FG}, ${(0.35 * (dot.life / dot.max)).toFixed(3)})`;
      ctx.fillRect(gx - 1, gy - 1, 2, 2);
    }

    scene.birds.forEach((bird, index) => {
      if (bird.state === 'gone') return;
      const sprites = spritesFor(bird, scene!);
      if (!sprites) return;
      const sprite = spriteOf(bird, bird.facing > 0 ? sprites.right : sprites.left);
      if (bird.state === 'land') drawBranch(bird, Math.min(1, bird.stateTime / LAND_SECONDS));
      else if (bird.state === 'perch') drawBranch(bird, 1);
      else if (bird.state === 'takeoff') drawBranch(bird, 1 - Math.min(1, bird.stateTime / TAKEOFF_SECONDS));
      // Mengepak: badan naik-turun sedikit mengikuti fase
      const bob = bird.state === 'fly' && !bird.gliding ? Math.sin(bird.phase * Math.PI * 2) * ch * 0.25 : 0;
      drawSprite(sprite, bird.x, bird.y + bob, bird.state === 'fly' ? bird.bank * bird.facing : 0, index, shimmer);
    });
  };

  const frame = (now: number) => {
    raf = 0;
    if (!visible || !scene) return;
    // ±30 fps cukup untuk glyph; HP ±24 fps
    const interval = w < 640 ? 41 : 32;
    if (now - lastDraw < interval) {
      raf = requestAnimationFrame(frame);
      return;
    }
    // Stempel waktu frame bisa sedikit lebih awal dari performance.now() di kick(): langkah tidak boleh negatif
    const dt = clamp((now - last) / 1000, 0, MAX_DT);
    last = now;
    lastDraw = now;
    stepScene(scene, dt);
    draw(now);
    raf = requestAnimationFrame(frame);
  };

  const kick = () => {
    if (raf || !visible || reduced || !scene) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    if (width < 1 || height < 1) return;
    if (width === w && height === h) return;
    w = width;
    h = height;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cw = cellWidth(w);
    ch = Math.round(cw * CELL_ASPECT);
    spritesByUnit.clear();
    building.clear();
    // Ukuran berubah (jarang: putar layar): adegan mulai dari awal supaya dahan & lintasan sesuai ukuran baru
    scene = reduced ? stillScene(w, h) : createScene(w, h);
    // Sprite semua ukuran burung mulai dirasterisasi sekarang (per potongan idle), sebelum burung pertama masuk layar
    for (const bird of scene.birds) spritesFor(bird, scene);
    if (reduced) draw(0);
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
  const ro = new ResizeObserver(resize);

  resize();
  ro.observe(canvas);
  io.observe(canvas);
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    disposed = true;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    ro.disconnect();
    io.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
