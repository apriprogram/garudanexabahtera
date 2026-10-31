// Burung Garuda ASCII di latar hero Prompt AI: rasterisasi (kepadatan, garis berarah, pahat, potong, glyph mata), model 3D
// (detail bertambah saat dekat), kepakan halus, lintasan, dan koreografi tiga burung (formasi, berputar, acak, tukikan
// seukuran layar; tanpa NaN, skala & posisi berubah halus), adegan diam untuk reduced motion.
// Jalankan: node ../../../node_modules/vitest/vitest.mjs run src/components/sections/hero/prompt
import { describe, expect, it } from 'vitest';
import { cellWidth } from '../garudaEngine';
import {
  BIRDS,
  DOWNSTROKE,
  FORMATIONS,
  MAX_PARTICLES,
  birdLength,
  createScene,
  flapWings,
  makePath,
  pathAt,
  pathTangent,
  restPose,
  stepScene,
  stillScene,
  zoomScale,
  type ActKind,
  type FormationStyle,
  type Task,
} from '../garudaFlight';
import { CLOSE_UNIT, DETAIL_UNIT, DIR_GLYPHS, bodyFrame, birdGeometry, dirCode, rasterize, spriteToText, type Shape } from '../garudaSprites';

/** Pembangkit acak tetap (LCG) supaya adegan bisa diulang. */
const lcg = (seed: number) => () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 2 ** 32;
};

const square = (x0: number, y0: number, x1: number, y1: number, level: 1 | 2 | 3 | 4 = 4): Shape => ({
  kind: 'poly',
  points: [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ],
  level,
});

describe('rasterize', () => {
  it('isi padat = 4, tepi setengah tertutup lebih ringan, titik acuan di tengah sel, potong ke kotak terlihat', () => {
    const sprite = rasterize([square(-2, -3, 2, 3)], 1, 1.5);
    expect(sprite.cols).toBe(5);
    expect(sprite.ax % 1).toBeCloseTo(0.5);
    expect(sprite.ay % 1).toBeCloseTo(0.5);
    // Sel tengah penuh, kolom paling luar hanya setengah tertutup
    const mid = Math.floor(sprite.rows / 2) * sprite.cols;
    expect(sprite.cells[mid + 2]).toBe(4);
    expect(sprite.cells[mid]).toBeLessThan(4);
    expect(sprite.cells[mid]).toBeGreaterThan(0);
    const clipped = rasterize([square(-2, -3, 2, 3)], 1, 1.5, [0, 0], [0, -3, 2, 3]);
    expect(clipped.cols).toBeLessThan(sprite.cols);
    expect(rasterize([square(-2, -3, 2, 3)], 1, 1.5, [0, 0], [5, 5, 6, 6]).cols).toBe(0);
  });

  it('garis tipis diberi arah: tegak "|", miring "/" atau "\\", mendatar "-"/"_"', () => {
    const line = (x0: number, y0: number, x1: number, y1: number): Shape => {
      const len = Math.hypot(x1 - x0, y1 - y0);
      const nx = (-(y1 - y0) / len) * 0.2;
      const ny = ((x1 - x0) / len) * 0.2;
      return { kind: 'poly', points: [[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]], level: 3 };
    };
    const glyphs = (shape: Shape) => {
      const sprite = rasterize([shape], 1, 1);
      return new Set([...sprite.dirs].filter(Boolean).map((d) => DIR_GLYPHS[d]));
    };
    expect(glyphs(line(0, -6, 0, 6))).toEqual(new Set(['|']));
    expect([...glyphs(line(-5, 5, 5, -5))]).toContain('/');
    expect([...glyphs(line(-5, -5, 5, 5))]).toContain('\\');
    expect([...glyphs(line(-6, 0.3, 6, 0.3))].every((g) => g === '-' || g === '_')).toBe(true);
  });

  it('pahat menurunkan kepadatan (guratan terang berarah), glyph khusus di sel pusat lingkaran', () => {
    const solid = square(-6, -6, 6, 6);
    const groove: Shape = { kind: 'poly', points: [[-0.6, -5], [0.6, -5], [0.6, 5], [-0.6, 5]], level: 2, carve: true, dir: dirCode(0, 1) };
    const sprite = rasterize([solid, groove], 1, 1);
    const mid = Math.floor(sprite.rows / 2) * sprite.cols + Math.floor(sprite.cols / 2);
    expect(sprite.cells[mid]).toBeLessThan(4);
    expect(DIR_GLYPHS[sprite.dirs[mid]]).toBe('|');
    const eye = rasterize([solid, { kind: 'circle', cx: 2, cy: 2, r: 0.6, level: 1, carve: true, glyph: '@' }], 1, 1);
    expect([...eye.marks.values()]).toEqual(['@']);
  });
});

describe('model burung', () => {
  it('kerangka badan ortonormal di arah mana pun', () => {
    for (const [yaw, pitch, roll] of [[0, 0, 0], [1.2, 0.4, -0.5], [-2.5, -0.3, 0.7]]) {
      const { f, r, u } = bodyFrame(yaw, pitch, roll);
      const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
      expect(dot(f, f)).toBeCloseTo(1);
      expect(dot(r, r)).toBeCloseTo(1);
      expect(dot(f, r)).toBeCloseTo(0);
      expect(dot(f, u)).toBeCloseTo(0);
      expect(dot(r, u)).toBeCloseTo(0);
    }
  });

  it('makin dekat (sel per panjang badan lebih banyak) makin detail: bulu, guratan, mata', () => {
    const pose = flapWings(0.3, 1, { ...restPose(), yaw: 0.3 });
    const far = birdGeometry(pose, 5);
    const near = birdGeometry(pose, DETAIL_UNIT + 1);
    const close = birdGeometry(pose, CLOSE_UNIT + 4);
    expect(near.shapes.length).toBeGreaterThan(far.shapes.length);
    expect(close.shapes.length).toBeGreaterThan(near.shapes.length);
    expect(far.shapes.some((s) => s.carve)).toBe(false);
    expect(close.shapes.filter((s) => s.carve).length).toBeGreaterThan(20);
    expect(near.shapes.some((s) => s.kind === 'circle' && s.glyph)).toBe(true);
    for (const geo of [far, near, close]) {
      for (const shape of geo.shapes) {
        const values = shape.kind === 'circle' ? [shape.cx, shape.cy, shape.r] : shape.points.flat();
        expect(values.every(Number.isFinite)).toBe(true);
      }
      expect(geo.tips.flat().every(Number.isFinite)).toBe(true);
    }
    // Sprite dekat: banyak sel, ada sel padat dan garis berarah (tulang bulu, tepi)
    const sprite = rasterize(close.shapes, 1 / 40, 1.5 / 40);
    expect(sprite.cells.filter(Boolean).length).toBeGreaterThan(400);
    expect(sprite.dirs.filter(Boolean).length).toBeGreaterThan(60);
    expect(spriteToText(sprite)).toContain('#');
  });

  it('kepakan halus: downstroke lebih lama, tanpa lompatan (termasuk di pergantian siklus), terlipat hanya saat upstroke', () => {
    const pose = restPose();
    const at = (phase: number) => ({ ...flapWings(phase, 1, pose) });
    expect(DOWNSTROKE).toBeGreaterThan(0.5);
    expect(at(0).arm).toBeGreaterThan(0);
    expect(at(DOWNSTROKE).arm).toBeLessThan(0);
    expect(at(DOWNSTROKE * 0.5).fold).toBe(0);
    expect(at((1 + DOWNSTROKE) / 2).fold).toBeGreaterThan(0.3);
    let prev = at(0.999);
    for (let i = 0; i <= 1000; i++) {
      const next = at(i / 1000);
      expect(Math.abs(next.arm - prev.arm)).toBeLessThan(0.02);
      expect(Math.abs(next.hand - prev.hand)).toBeLessThan(0.02);
      expect(Math.abs(next.fold - prev.fold)).toBeLessThan(0.02);
      prev = next;
    }
  });
});

describe('lintasan & koreografi', () => {
  it('lintasan: mulai & berakhir di titik jalan, panjang ≥ jarak lurus, arah awal mengikuti arah burung', () => {
    const path = makePath(
      [
        [0, 0, 500],
        [300, -100, 800],
        [600, 50, 600],
      ],
      [0, 1, 0],
    );
    expect(pathAt(path, 0)).toEqual([0, 0, 500]);
    pathAt(path, path.total).forEach((v, i) => expect(v).toBeCloseTo([600, 50, 600][i]));
    expect(path.total).toBeGreaterThanOrEqual(Math.hypot(600, 50, 100) - 1e-6);
    expect(pathTangent(path, 1)[1]).toBeGreaterThan(0);
  });

  it('ukuran: sel 7–9 px, burung lebih besar di layar lebar, tukikan ±seukuran layar', () => {
    expect(cellWidth(375)).toBe(7);
    expect(cellWidth(1440)).toBe(8);
    expect(cellWidth(4000)).toBe(9);
    expect(birdLength(375)).toBe(70);
    expect(birdLength(1440)).toBe(168);
    const scene = createScene(1366, 768, { rng: lcg(1) });
    expect(scene.birds).toHaveLength(BIRDS);
    // Rentang sayap ±2 panjang badan ≈ lebar layar
    expect(scene.L0 * zoomScale(scene) * 2).toBeGreaterThan(1366 * 0.85);
  });

  it('3 burung: formasi longgar & rapi, berputar, acak, tukikan seukuran layar lalu kembali; jauh & dekat; halus', () => {
    const scene = createScene(1366, 768, { rng: lcg(7), cell: 8 });
    const acts = new Set<ActKind>();
    const styles = new Set<FormationStyle>();
    let syncGap = 0;
    let syncSamples = 0;
    const tasks = new Set<Task>();
    const dt = 1 / 60;
    let minS = Infinity;
    let maxS = 0;
    let followGap = 0;
    let followSamples = 0;
    let prev = scene.birds.map((bird) => ({ x: bird.x, y: bird.y, s: bird.s, yaw: bird.yaw, roll: bird.roll }));
    let maxYawStep = 0;
    let maxRollStep = 0;
    for (let i = 0; i < 240 * 60; i++) {
      stepScene(scene, dt);
      acts.add(scene.act.kind);
      if (scene.act.kind === 'formation') styles.add(scene.act.style);
      scene.birds.forEach((bird, b) => {
        tasks.add(bird.task);
        expect(Number.isFinite(bird.x) && Number.isFinite(bird.y) && Number.isFinite(bird.s) && Number.isFinite(bird.phase)).toBe(true);
        expect(bird.geometry).not.toBeNull();
        minS = Math.min(minS, bird.s);
        maxS = Math.max(maxS, bird.s);
        if (i > 0) {
          // Halus: skala berubah < 7% per frame, posisi tidak melompat (relatif terhadap ukuran burung di layar)
          expect(Math.abs(bird.s - prev[b].s) / prev[b].s).toBeLessThan(0.07);
          expect(Math.hypot(bird.x - prev[b].x, bird.y - prev[b].y)).toBeLessThan(40 + scene.L0 * bird.s * 0.12);
          if (i > 60) {
            maxYawStep = Math.max(maxYawStep, Math.abs(Math.atan2(Math.sin(bird.yaw - prev[b].yaw), Math.cos(bird.yaw - prev[b].yaw))));
            maxRollStep = Math.max(maxRollStep, Math.abs(bird.roll - prev[b].roll));
          }
        }
        if (bird.task === 'follow') {
          const leader = scene.birds[scene.act.leader];
          followGap += Math.hypot(bird.pos[0] - leader.pos[0], bird.pos[1] - leader.pos[1], bird.pos[2] - leader.pos[2]) / scene.L0;
          followSamples++;
          // Formasi rapi: kepakan pengikut serempak dengan pemimpin (selisih fase kecil, sesuai urutannya)
          if (FORMATIONS[scene.act.style].tidy && scene.time > scene.act.until - 6) {
            const lag = Math.abs((((leader.phase - 0.07 * bird.rank - bird.phase) % 1) + 1.5) % 1 - 0.5);
            syncGap += lag;
            syncSamples++;
          }
        }
      });
      prev = scene.birds.map((bird) => ({ x: bird.x, y: bird.y, s: bird.s, yaw: bird.yaw, roll: bird.roll }));
      expect(scene.particles.length).toBeLessThanOrEqual(MAX_PARTICLES);
    }
    expect([...acts]).toEqual(expect.arrayContaining(['formation', 'circle', 'wander']));
    // Belok halus: arah hadap & bank tidak pernah berubah mendadak antar-frame
    expect(maxYawStep).toBeLessThan(0.08);
    expect(maxRollStep).toBeLessThan(0.03);
    expect([...styles].some((style) => FORMATIONS[style].tidy)).toBe(true);
    expect(styles.size).toBeGreaterThan(1);
    expect(syncSamples).toBeGreaterThan(0);
    expect(syncGap / syncSamples).toBeLessThan(0.05);
    expect([...tasks]).toEqual(expect.arrayContaining(['lead', 'follow', 'orbit', 'wander', 'zoom']));
    expect(minS).toBeLessThan(0.4);
    expect(maxS).toBeGreaterThan(zoomScale(scene) * 0.9);
    expect(maxS).toBeLessThanOrEqual(zoomScale(scene) * 1.25 + 1e-6);
    // Pengikut formasi rata-rata dekat pemimpinnya (bergerombol)
    expect(followGap / followSamples).toBeLessThan(4);
    expect(scene.time).toBeCloseTo(240, 0);
  });

  it('HP: ukuran burung relatif lebih besar; adegan diam: tiga burung di luar kotak konten', () => {
    const mobile = createScene(375, 640, { rng: lcg(3) });
    expect(mobile.L0 / 375).toBeGreaterThan(0.15);
    const avoid = [{ l: 323, t: 230, r: 1043, b: 580 }];
    const still = stillScene(1366, 768, { avoid });
    expect(still.birds).toHaveLength(BIRDS);
    for (const bird of still.birds) {
      expect(bird.geometry).not.toBeNull();
      const inside = bird.x > 323 && bird.x < 1043 && bird.y > 230 && bird.y < 580;
      expect(inside).toBe(false);
    }
  });
});
