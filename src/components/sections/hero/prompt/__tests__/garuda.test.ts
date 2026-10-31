// Burung Garuda ASCII di latar hero Prompt AI: rasterisasi (kepadatan, garis berarah, pahat, potong, glyph mata), model 3D
// (detail bertambah saat dekat), kepakan halus, belok terbatas & kurva Hermite, dan koreografi tiga burung (formasi,
// berputar, acak, tukikan seukuran layar, bertengger setinggi hero di sisi; tanpa NaN, skala & posisi & hadap berubah
// halus), adegan diam untuk reduced motion.
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
  PERCH_POSE,
  flapWings,
  hermite,
  maxScale,
  perchLayout,
  restPose,
  stepScene,
  stillScene,
  turnToward,
  zoomScale,
  type ActKind,
  type FormationStyle,
  type Task,
} from '../garudaFlight';
import { CLOSE_UNIT, DETAIL_UNIT, DIR_GLYPHS, FINE_UNIT, bodyFrame, birdGeometry, dirCode, footOf, rasterize, shapesBounds, spriteToText, type Shape } from '../garudaSprites';

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
    const fine = birdGeometry(pose, FINE_UNIT + 1);
    expect(near.shapes.length).toBeGreaterThan(far.shapes.length);
    // Helai bulu bergaris tepi & paruh rahang atas-bawah mulai FINE_UNIT; guratan terbanyak saat sangat dekat
    expect(fine.shapes.filter((s) => s.carve).length).toBeGreaterThan(near.shapes.filter((s) => s.carve).length + 8);
    expect(close.shapes.filter((s) => s.carve).length).toBeGreaterThan(fine.shapes.filter((s) => s.carve).length);
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
  it('belok terbatas: arah diputar paling banyak sudut yang diizinkan; kurva Hermite mulai & berakhir di titiknya', () => {
    const h: [number, number, number] = [1, 0, 0];
    const turned = turnToward(h, [0, 0, 1], 0.2);
    expect(Math.acos(turned[0])).toBeCloseTo(0.2);
    expect(Math.hypot(...turned)).toBeCloseTo(1);
    expect(turnToward(h, [0.99, 0, Math.sqrt(1 - 0.99 ** 2)], 0.5)[0]).toBeCloseTo(0.99);
    // Tepat berbalik: tetap berputar ke samping, tidak macet
    expect(Math.acos(turnToward(h, [-1, 0, 0], 0.3)[0])).toBeCloseTo(0.3);
    const curve = { p0: [0, 0, 500] as [number, number, number], v0: [100, 0, 0] as [number, number, number], p1: [300, -50, 300] as [number, number, number], v1: [0, 50, 0] as [number, number, number], dur: 1 };
    expect(hermite(curve, 0)).toEqual([0, 0, 500]);
    hermite(curve, 1).forEach((v, i) => expect(v).toBeCloseTo(curve.p1[i]));
  });

  it('bertengger: setinggi hero di layar lebar, tetap di ruang samping konten; di HP / layar sempit tidak bertengger', () => {
    for (const [w, h, l, r, tall] of [
      [1920, 1080, 600, 1320, 0.78],
      [1366, 768, 323, 1043, 0.55],
    ] as const) {
      const scene = createScene(w, h, { rng: lcg(4), avoid: [{ l, t: h * 0.3, r, b: h * 0.75 }] });
      for (const side of [-1, 1] as const) {
        const layout = perchLayout(scene, side)!;
        expect(layout).not.toBeNull();
        expect(layout.inward).toBe(-side as 1 | -1);
        // Hadap ¾ ke kamera, menghadap halaman (sama dengan garudaFlight)
        const pose = { ...PERCH_POSE, yaw: side < 0 ? 0.6 : Math.PI - 0.6 };
        const [x0, y0, x1] = shapesBounds(birdGeometry(pose, 20).shapes);
        const foot = footOf(pose);
        const body = scene.L0 * layout.s;
        // Tinggi burung (kaki → puncak kepala) mendekati tinggi hero, kaki di atas pudar bawah
        expect((foot[1] - y0) * body).toBeGreaterThan(h * tall);
        expect(layout.y).toBeLessThan(h - 90);
        // Badan di sisi luar konten; punggung & ekor paling banyak ±35% keluar dari tepi layar
        const inner = side < 0 ? layout.x + (x1 - foot[0]) * body : layout.x + (x0 - foot[0]) * body;
        const outer = side < 0 ? layout.x + (x0 - foot[0]) * body : layout.x + (x1 - foot[0]) * body;
        if (side < 0) {
          expect(inner).toBeLessThanOrEqual(l);
          expect(-outer).toBeLessThanOrEqual((x1 - x0) * body * 0.36);
        } else {
          expect(inner).toBeGreaterThanOrEqual(r);
          expect(outer - w).toBeLessThanOrEqual((x1 - x0) * body * 0.36);
        }
        expect(layout.s).toBeLessThanOrEqual(maxScale(scene));
      }
    }
    // Navbar + banner promo di atas hero: kepala & jambul tetap di bawahnya
    {
      const scene = createScene(1920, 1080, { rng: lcg(4), avoid: [{ l: 600, t: 320, r: 1320, b: 810 }], ceiling: 130 });
      const layout = perchLayout(scene, 1)!;
      const pose = { ...PERCH_POSE, yaw: Math.PI - 0.6 };
      const [, y0] = shapesBounds(birdGeometry(pose, 20).shapes);
      expect(layout.y - (footOf(pose)[1] - y0) * scene.L0 * layout.s).toBeGreaterThanOrEqual(130);
    }
    expect(perchLayout(createScene(375, 640, { rng: lcg(4) }), -1)).toBeNull();
    expect(perchLayout(createScene(768, 1000, { rng: lcg(4), avoid: [{ l: 24, t: 300, r: 744, b: 700 }] }), -1)).toBeNull();
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

  it('3 burung: formasi longgar & rapi, berputar, acak, tukikan, bertengger lalu terbang lagi; jauh & dekat; halus', () => {
    const scene = createScene(1366, 768, { rng: lcg(7), cell: 8, avoid: [{ l: 323, t: 230, r: 1043, b: 580 }] });
    const phases = new Set<string>();
    let footGap = 0;
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
      const perch = scene.perch;
      if (perch) {
        phases.add(perch.phase);
        // Bertengger: telapak kaki tepat di dahan (titik kaki + lendutan dahan), kecuali saat melompat kecil berbalik badan
        if (perch.phase === 'sit' && !perch.turn) {
          const bird = scene.birds[perch.bird];
          const foot = footOf(bird.pose);
          const body = scene.L0 * bird.s;
          footGap = Math.max(footGap, Math.hypot(bird.x + foot[0] * body - perch.x, bird.y + foot[1] * body - (perch.y + perch.bend)));
        }
      }
      scene.birds.forEach((bird, b) => {
        tasks.add(bird.task);
        expect(Number.isFinite(bird.x) && Number.isFinite(bird.y) && Number.isFinite(bird.s) && Number.isFinite(bird.phase)).toBe(true);
        expect(bird.geometry).not.toBeNull();
        minS = Math.min(minS, bird.s);
        maxS = Math.max(maxS, bird.s);
        if (i > 0) {
          // Halus: skala berubah < 7% per frame, posisi tidak melompat (relatif terhadap ukuran burung di layar) selama
          // burung terlihat (di luar layar, mis. keluar dari tukikan, gerak perspektifnya memang cepat & tak terlihat)
          expect(Math.abs(bird.s - prev[b].s) / prev[b].s).toBeLessThan(0.07);
          const body = scene.L0 * bird.s;
          const onScreen = bird.x > 0 && bird.x < 1366 && bird.y > -body * 0.3 && bird.y < 768;
          if (onScreen) expect(Math.hypot(bird.x - prev[b].x, bird.y - prev[b].y)).toBeLessThan(40 + body * 0.12);
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
    expect([...tasks]).toEqual(expect.arrayContaining(['lead', 'follow', 'orbit', 'wander', 'zoom', 'perch']));
    expect([...phases]).toEqual(expect.arrayContaining(['approach', 'land', 'sit', 'launch', 'leave']));
    expect(footGap).toBeLessThan(1);
    expect(minS).toBeLessThan(0.4);
    expect(maxS).toBeGreaterThan(zoomScale(scene) * 0.9);
    expect(maxS).toBeLessThanOrEqual(maxScale(scene) + 1e-6);
    // Pengikut formasi rata-rata dekat pemimpinnya (bergerombol)
    expect(followGap / followSamples).toBeLessThan(4);
    expect(scene.time).toBeCloseTo(240, 0);
    // Simulasi 240 detik adegan: ±3 detik sendirian, bisa >5 detik saat file tes lain berjalan bersamaan
  }, 30_000);

  it('HP: ukuran burung relatif lebih besar; adegan diam: satu bertengger di sisi, tiga burung di luar kotak konten', () => {
    const mobile = createScene(375, 640, { rng: lcg(3) });
    expect(mobile.L0 / 375).toBeGreaterThan(0.15);
    const avoid = [{ l: 323, t: 230, r: 1043, b: 580 }];
    const still = stillScene(1366, 768, { avoid });
    expect(still.birds).toHaveLength(BIRDS);
    expect(still.perch?.phase).toBe('sit');
    expect(still.perch?.show).toBe(1);
    for (const bird of still.birds) {
      expect(bird.geometry).not.toBeNull();
      const inside = bird.x > 323 && bird.x < 1043 && bird.y > 230 && bird.y < 580;
      expect(inside).toBe(false);
    }
  });
});
