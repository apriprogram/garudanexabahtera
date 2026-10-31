// Burung Garuda ASCII di latar hero Prompt AI: sprite (rasterisasi pose, cermin, cache) dan perilaku terbang → singgah →
// lepas landas → pergi → muncul lagi (angka acak tetap, tanpa NaN), adegan diam untuk reduced motion.
// Jalankan: node ../../../node_modules/vitest/vitest.mjs run src/components/sections/hero/prompt
import { describe, expect, it } from 'vitest';
import { cellWidth } from '../garudaEngine';
import { bezierAt, birdLength, createScene, makePerches, makeRoute, stepScene, stillScene, type BirdState } from '../garudaFlight';
import { FLAP_FRAMES, foldAt, mirrorSprite, spriteSet, spriteSetSteps, spriteToText, type Sprite } from '../garudaSprites';

/** Pembangkit acak tetap (LCG) supaya adegan bisa diulang. */
const lcg = (seed: number) => () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 2 ** 32;
};

const filled = (sprite: Sprite) => sprite.cells.reduce((n, level) => n + (level ? 1 : 0), 0);

describe('garudaSprites', () => {
  it('semua pose terisi, titik acuan di dalam grid, kepadatan maksimum 4, di-cache per ukuran', () => {
    const set = spriteSet(20, 1.5);
    expect(set.flap).toHaveLength(FLAP_FRAMES);
    for (const sprite of [...set.flap, set.glide, set.flare, set.perch]) {
      expect(sprite.cells).toHaveLength(sprite.cols * sprite.rows);
      expect(filled(sprite)).toBeGreaterThan(40);
      expect(Math.max(...sprite.cells)).toBe(4);
      expect(sprite.ax).toBeGreaterThanOrEqual(0);
      expect(sprite.ax).toBeLessThanOrEqual(sprite.cols);
      expect(sprite.ay).toBeGreaterThanOrEqual(0);
      expect(sprite.ay).toBeLessThanOrEqual(sprite.rows);
    }
    // Tampak dari bawah: rentang sayap (baris) sebanding dengan panjang badan (kolom)
    expect(set.glide.rows).toBeGreaterThan(set.glide.cols * 0.8);
    // Sayap terlipat (tengah kepakan) lebih ringkas dari terbentang; glide = kepakan fase 0
    expect(filled(set.flap[FLAP_FRAMES / 2])).toBeLessThan(filled(set.flap[0]));
    expect(spriteToText(set.flap[0])).toBe(spriteToText(set.glide));
    expect(spriteSet(20, 1.5)).toBe(set);
    expect(spriteToText(set.perch)).toContain('#');
  });

  it('spriteSetSteps: satu pose per langkah, hasilnya sama dengan spriteSet dan masuk cache; ukuran di cache tanpa langkah', () => {
    const { steps, done } = spriteSetSteps(14, 1.5);
    expect(steps).toHaveLength(FLAP_FRAMES + 2);
    expect(() => done()).toThrow();
    for (const step of steps) step();
    const set = done();
    expect(set.glide).toBe(set.flap[0]);
    expect(spriteSet(14, 1.5)).toBe(set);
    expect(spriteSetSteps(14, 1.5).steps).toHaveLength(0);
    expect(spriteSetSteps(14, 1.5).done()).toBe(set);
  });

  it('foldAt: terbentang di 0 dan 1, terlipat penuh di 0,5', () => {
    expect(foldAt(0)).toBeCloseTo(0);
    expect(foldAt(0.5)).toBeCloseTo(1);
    expect(foldAt(1)).toBeCloseTo(0);
    expect(foldAt(0.25)).toBeCloseTo(0.5);
  });

  it('mirrorSprite membalik kolom dan titik acuan', () => {
    const sprite = spriteSet(16, 1.5).glide;
    const mirrored = mirrorSprite(sprite);
    for (let r = 0; r < sprite.rows; r++) {
      for (let c = 0; c < sprite.cols; c++) {
        expect(mirrored.cells[r * sprite.cols + (sprite.cols - 1 - c)]).toBe(sprite.cells[r * sprite.cols + c]);
      }
    }
    expect(mirrored.ax).toBeCloseTo(sprite.cols - 1 - sprite.ax);
    expect(mirrored.ay).toBe(sprite.ay);
  });
});

describe('garudaFlight', () => {
  it('lintasan Bézier mulai di awal, berakhir di tujuan, panjangnya ≥ jarak lurus', () => {
    const route = makeRoute([0, 100], [600, 300], lcg(3));
    expect(bezierAt(route, 0)).toEqual([0, 100]);
    expect(bezierAt(route, 1)).toEqual([600, 300]);
    expect(route.length).toBeGreaterThanOrEqual(Math.hypot(600, 200) - 1e-6);
  });

  it('ukuran: lebar sel 7–9 px, panjang badan 150–230 px, dahan HP 2 / desktop 4 di dalam hero', () => {
    expect(cellWidth(375)).toBe(7);
    expect(cellWidth(1440)).toBe(8);
    expect(cellWidth(4000)).toBe(9);
    expect(birdLength(375)).toBe(150);
    expect(birdLength(1440)).toBe(230);
    expect(makePerches(375, 640)).toHaveLength(2);
    const perches = makePerches(1280, 720);
    expect(perches).toHaveLength(4);
    for (const perch of perches) {
      expect(perch.x).toBeGreaterThan(0);
      expect(perch.x).toBeLessThan(1280);
      expect(perch.y).toBeGreaterThan(0);
      expect(perch.y).toBeLessThan(720);
      expect(perch.taken).toBe(false);
    }
  });

  it('adegan: burung muncul, terbang, singgah di dahan, lepas landas, keluar, muncul lagi; tanpa NaN; dahan konsisten', () => {
    const scene = createScene(1280, 720, lcg(7));
    expect(scene.birds.map((bird) => bird.size)).toEqual([1, 0.62, 0.45]);
    const seen = new Set<BirdState>();
    let spawns = 0;
    for (let i = 0; i < 240 * 30; i++) {
      const before = scene.birds.map((bird) => bird.state);
      stepScene(scene, 1 / 30);
      scene.birds.forEach((bird, index) => {
        seen.add(bird.state);
        if (before[index] === 'gone' && bird.state === 'fly') spawns++;
        expect(Number.isFinite(bird.x) && Number.isFinite(bird.y) && Number.isFinite(bird.phase)).toBe(true);
        if (bird.state === 'perch') expect(bird.perch?.taken).toBe(true);
      });
      // Dahan terpakai = burung yang memegangnya (menuju, mendarat, hinggap, lepas landas)
      expect(scene.perches.filter((perch) => perch.taken)).toHaveLength(scene.birds.filter((bird) => bird.perch !== null).length);
      expect(scene.dots.length).toBeLessThanOrEqual(120);
    }
    expect([...seen]).toEqual(expect.arrayContaining(['fly', 'land', 'perch', 'takeoff', 'gone']));
    expect(spawns).toBeGreaterThan(3);
    expect(scene.time).toBeCloseTo(240, 0);
  });

  it('HP: dua burung; adegan diam: satu meluncur di kanan atas, satu hinggap di dahan kiri bawah', () => {
    expect(createScene(375, 640, lcg(1)).birds).toHaveLength(2);
    const still = stillScene(1280, 720);
    const [glider, sitter] = still.birds;
    expect(glider).toMatchObject({ state: 'fly', gliding: true, facing: -1 });
    expect(glider.x).toBeGreaterThan(640);
    expect(sitter).toMatchObject({ state: 'perch', facing: 1 });
    expect(sitter.perch).toBe(still.perches[0]);
    expect(still.perches[0].taken).toBe(true);
  });
});
