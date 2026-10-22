// Keterbacaan teks hero di atas gambar/video: luminans & kontras WCAG, pencampuran lapisan per piksel, persentil
// latar, keputusan nada + lapisan (minimum admin, batas 85%, nada yang dipaksa, kasus terburuk tayangan), cadangan
// aman, geometri object-fit: cover, parser setting hero_text_tone / hero_overlay, dan token CSS yang harus sama dengan
// warna yang dihitung.
// Jalankan: npx vitest run src/components/sections/hero/__tests__/heroContrast.test.ts
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BODY_TARGET,
  COLORS,
  HEADLINE_TARGET,
  HERO_DARK_FALLBACK_ALPHA,
  HERO_FALLBACK_ALPHA,
  HERO_SCRIM_CAP,
  backgroundSample,
  compositeRgb,
  contrastRatio,
  coverSourceRect,
  decideHeroLegibility,
  fallbackLegibility,
  formatRatio,
  hexToRgb,
  linearToSrgb,
  luminanceStats,
  overlayAlpha,
  relativeLuminance,
  requiredAlpha,
  scrimRgb,
  scrimmedLuminance,
  solidSample,
  srgbToLinear,
  textContrast,
  toneContrast,
  type BackgroundSample,
  type Rgb,
} from '../heroContrast';
import { parseHeroOverlay, parseHeroText, parseHeroTextTone } from '../heroBgConfig';
import { HERO_TONE_CLASSES } from '../heroTone';

/** n piksel RGBA warna yang sama */
const pixels = (n: number, [r, g, b]: Rgb, a = 255) => Array.from({ length: n }, () => [r, g, b, a]).flat();
/** Latar abu-abu polos berluminans L */
const gray = (luminance: number): BackgroundSample => {
  const v = linearToSrgb(luminance);
  return solidSample([v, v, v]);
};
/** Sampel dari beberapa kelompok [jumlah, warna] */
const sampleOf = (...groups: [number, Rgb][]) => backgroundSample(groups.flatMap(([n, color]) => pixels(n, color)))!;
const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];
const OBSIDIAN = hexToRgb(COLORS.scrimDark);
const passes = (c: { body: number; headline: number }) => c.body >= BODY_TARGET && c.headline >= HEADLINE_TARGET;

describe('warna & luminans', () => {
  it('hex → RGB (6 dan 3 digit), selain itu error', () => {
    expect(hexToRgb('#211FFE')).toEqual([33, 31, 254]);
    expect(hexToRgb('fff')).toEqual([255, 255, 255]);
    expect(() => hexToRgb('#12345')).toThrow();
  });

  it('fungsi transfer sRGB bolak-balik, dibatasi 0..1', () => {
    for (const c of [0, 1, 10, 50, 128, 200, 255]) expect(linearToSrgb(srgbToLinear(c))).toBeCloseTo(c, 6);
    expect(srgbToLinear(10)).toBeCloseTo(10 / 255 / 12.92, 9); // bagian linear dekat hitam
    expect(srgbToLinear(-5)).toBe(0);
    expect(srgbToLinear(300)).toBe(1);
  });

  it('luminans relatif WCAG', () => {
    expect(relativeLuminance(WHITE)).toBeCloseTo(1, 9);
    expect(relativeLuminance(BLACK)).toBe(0);
    expect(relativeLuminance(hexToRgb(COLORS.primary))).toBeCloseTo(0.0846, 3);
    expect(relativeLuminance(hexToRgb(COLORS.muted))).toBeCloseTo(0.0841, 3);
    expect(relativeLuminance(hexToRgb(COLORS.onMediaAccent))).toBeCloseTo(0.5683, 3);
  });

  it('rasio kontras: 21:1 hitam-putih, simetris, 1:1 untuk warna yang sama', () => {
    expect(contrastRatio(1, 0)).toBeCloseTo(21, 9);
    expect(contrastRatio(0, 1)).toBeCloseTo(21, 9);
    expect(contrastRatio(0.3, 0.3)).toBe(1);
    expect(contrastRatio(relativeLuminance(hexToRgb(COLORS.muted)), 1)).toBeCloseTo(7.82, 1);
  });

  it('lapisan dicampur di ruang sRGB: alpha 0 = latar, 1 = lapisan, 0,5 = tengah', () => {
    expect(compositeRgb(BLACK, 0, [200, 100, 50])).toEqual([200, 100, 50]);
    expect(compositeRgb(BLACK, 1, [200, 100, 50])).toEqual([0, 0, 0]);
    expect(compositeRgb(WHITE, 0.5, BLACK)).toEqual([127.5, 127.5, 127.5]);
    expect(compositeRgb([10, 20, 30], 2, BLACK)).toEqual([10, 20, 30]); // alpha dibatasi
  });

  it('lapisan dicampur dengan WARNA ASLI piksel (biru jenuh di bawah lapisan putih lebih gelap dari abu-abu setara)', () => {
    const blue = hexToRgb('#211FFE');
    const exact = relativeLuminance(compositeRgb(WHITE, 0.5, blue));
    expect(scrimmedLuminance('dark', sampleOf([1, blue]), 0.5)).toBeCloseTo(exact, 6);
    // Abu-abu dengan luminans sama akan menaksir terlalu terang (teks gelap kurang kontras dari perkiraan)
    expect(scrimmedLuminance('dark', gray(relativeLuminance(blue)), 0.5)).toBeGreaterThan(exact + 0.05);
    expect(scrimmedLuminance('light', sampleOf([1, blue]), 0.6)).toBeCloseTo(relativeLuminance(compositeRgb(OBSIDIAN, 0.6, blue)), 6);
  });
});

describe('sampel latar', () => {
  it('latar polos: rendah = tinggi = rata-rata; tanpa piksel → null', () => {
    expect(luminanceStats(pixels(16, WHITE))).toEqual({ low: expect.closeTo(1, 9), high: expect.closeTo(1, 9), mean: expect.closeTo(1, 9) });
    expect(luminanceStats([])).toBeNull();
    expect(backgroundSample([])).toBeNull();
  });

  it('piksel transparan dicampur dengan putih (latar halaman)', () => {
    expect(luminanceStats(pixels(4, BLACK, 0))?.high).toBeCloseTo(1, 9);
    expect(luminanceStats(pixels(4, BLACK, 127.5))?.mean).toBeCloseTo(relativeLuminance([127.5, 127.5, 127.5]), 6);
  });

  it('persentil, bukan rata-rata saja: titik terang ≤ 5% diabaikan, pita terang 10% tidak', () => {
    const fewSpots = luminanceStats([...pixels(97, BLACK), ...pixels(3, WHITE)]);
    expect(fewSpots?.high).toBe(0);
    expect(fewSpots?.mean).toBeCloseTo(0.03, 9);
    const brightBand = luminanceStats([...pixels(90, BLACK), ...pixels(10, WHITE)]);
    expect(brightBand?.high).toBeCloseTo(1, 9);
    expect(brightBand?.low).toBe(0);
    expect(brightBand?.mean).toBeCloseTo(0.1, 9); // rata-rata saja menyembunyikan pita terang
    // Keputusan memakai aturan yang sama
    expect(requiredAlpha('light', sampleOf([97, BLACK], [3, WHITE]))).toBe(0);
    expect(requiredAlpha('light', sampleOf([90, BLACK], [10, WHITE]))).toBe(requiredAlpha('light', solidSample(WHITE)));
  });
});

describe('lapisan yang diperlukan', () => {
  it('teks terang di atas hitam / teks gelap di atas putih: tanpa lapisan', () => {
    expect(requiredAlpha('light', solidSample(BLACK))).toBe(0);
    expect(requiredAlpha('dark', solidSample(WHITE))).toBe(0);
  });

  it('paling tipis yang lolos: 0,002 lebih tipis sudah tidak lolos', () => {
    const cases: [ 'light' | 'dark', BackgroundSample][] = [
      ['light', solidSample(WHITE)],
      ['light', gray(0.4)],
      ['light', sampleOf([60, hexToRgb('#0A1A40')], [40, hexToRgb('#E8F0FF')])],
      ['dark', solidSample(BLACK)],
      ['dark', gray(0.2)],
      ['dark', sampleOf([1, hexToRgb('#211FFE')])],
    ];
    for (const [tone, sample] of cases) {
      const alpha = requiredAlpha(tone, sample);
      expect(alpha, tone).not.toBeNull();
      expect(passes(toneContrast(tone, sample, alpha!)), tone).toBe(true);
      expect(passes(toneContrast(tone, sample, alpha! - 0.002)), tone).toBe(false);
    }
  });

  it('naik seiring latar makin terang (teks terang) / makin gelap (teks gelap), selalu ≤ 85%', () => {
    let lastLight = -1;
    let lastDark = 2;
    for (let i = 0; i <= 20; i += 1) {
      const light = requiredAlpha('light', gray(i / 20))!;
      const dark = requiredAlpha('dark', gray(i / 20))!;
      expect(light).toBeGreaterThanOrEqual(lastLight);
      expect(dark).toBeLessThanOrEqual(lastDark);
      expect(Math.max(light, dark)).toBeLessThanOrEqual(HERO_SCRIM_CAP);
      lastLight = light;
      lastDark = dark;
    }
    // Putih polos butuh ±62% obsidian, hitam polos ±77% putih
    expect(requiredAlpha('light', solidSample(WHITE))).toBeCloseTo(0.624, 2);
    expect(requiredAlpha('dark', solidSample(BLACK))).toBeCloseTo(0.77, 2);
  });

  it('kontras teks: judul ≥ 3:1 & isi ≥ 4,5:1 diperiksa terpisah', () => {
    // Latar 0,156: aksen brand-200 (judul) tepat di 3:1, poin on-media-muted tepat di 4,5:1
    const c = textContrast('light', 0.156);
    expect(c.headline).toBeCloseTo(3, 1);
    expect(c.body).toBeCloseTo(4.5, 1);
    expect(textContrast('dark', 1).body).toBeCloseTo(7.82, 1);
  });

  it('lapisan admin (persen) → alpha 0..0,8; bukan angka → 40%', () => {
    expect(overlayAlpha(40)).toBe(0.4);
    expect(overlayAlpha(0)).toBe(0);
    expect(overlayAlpha(120)).toBe(0.8);
    expect(overlayAlpha(-5)).toBe(0);
    expect(overlayAlpha(Number.NaN)).toBe(0.4);
  });
});

describe('decideHeroLegibility', () => {
  const DARK_IMAGE = sampleOf([80, hexToRgb('#0B1430')], [20, hexToRgb('#1D3A8A')]);
  const BRIGHT_IMAGE = sampleOf([70, hexToRgb('#F4F7FF')], [30, hexToRgb('#DCE6F5')]);
  // Gelap di atas, putih di bawah blok teks (seperti gambar latar lokal saat ini)
  const MIXED = sampleOf([55, hexToRgb('#06102C')], [15, hexToRgb('#1A6BFF')], [30, hexToRgb('#F2F6FF')]);

  it('otomatis: gambar gelap → teks terang dengan lapisan admin saja', () => {
    expect(decideHeroLegibility(DARK_IMAGE, 'auto', 40)).toMatchObject({ tone: 'light', overlayAlpha: 0.4, readable: true, measured: true });
    expect(decideHeroLegibility(DARK_IMAGE, 'auto', 0)).toMatchObject({ tone: 'light', overlayAlpha: 0 });
  });

  it('otomatis: gambar terang → teks gelap (lapisan putih)', () => {
    const result = decideHeroLegibility(BRIGHT_IMAGE, 'auto', 0);
    expect(result).toMatchObject({ tone: 'dark', overlayAlpha: 0, readable: true });
    expect(result.contrast!.body).toBeGreaterThanOrEqual(BODY_TARGET);
  });

  it('otomatis memilih nada yang butuh lapisan paling tipis; lapisan dinaikkan di atas minimum admin bila perlu', () => {
    const result = decideHeroLegibility(MIXED, 'auto', 40);
    const light = requiredAlpha('light', MIXED)!;
    const dark = requiredAlpha('dark', MIXED)!;
    expect(result.tone).toBe(light <= dark ? 'light' : 'dark');
    expect(result.overlayAlpha).toBe(Math.min(light, dark));
    expect(result.overlayAlpha).toBeGreaterThan(0.4);
    expect(result.contrast!.body).toBeGreaterThanOrEqual(BODY_TARGET);
    expect(result.contrast!.headline).toBeGreaterThanOrEqual(HEADLINE_TARGET);
  });

  it('lapisan admin = minimum, juga bila latar sudah cukup kontras', () => {
    expect(decideHeroLegibility(DARK_IMAGE, 'auto', 75).overlayAlpha).toBe(0.75);
    expect(decideHeroLegibility(BRIGHT_IMAGE, 'auto', 25)).toMatchObject({ tone: 'dark', overlayAlpha: 0.25 });
  });

  it('nada dipaksa: tetap nada itu, lapisan dinaikkan agar lolos (maks. 85%)', () => {
    const light = decideHeroLegibility(BRIGHT_IMAGE, 'light', 10);
    expect(light).toMatchObject({ tone: 'light', overlayAlpha: requiredAlpha('light', BRIGHT_IMAGE), readable: true });
    const dark = decideHeroLegibility(DARK_IMAGE, 'dark', 10);
    expect(dark).toMatchObject({ tone: 'dark', overlayAlpha: requiredAlpha('dark', DARK_IMAGE), readable: true });
    expect(dark.overlayAlpha).toBeLessThanOrEqual(HERO_SCRIM_CAP);
    // Lapisan admin lebih tebal dari yang diperlukan tetap dipakai
    expect(decideHeroLegibility(DARK_IMAGE, 'light', 60).overlayAlpha).toBe(0.6);
  });

  it('tayangan: kasus terburuk dari semua gambar (nada tidak berganti antar-slide)', () => {
    const both = decideHeroLegibility([DARK_IMAGE, BRIGHT_IMAGE], 'auto', 0);
    const worstLight = Math.max(requiredAlpha('light', DARK_IMAGE)!, requiredAlpha('light', BRIGHT_IMAGE)!);
    const worstDark = Math.max(requiredAlpha('dark', DARK_IMAGE)!, requiredAlpha('dark', BRIGHT_IMAGE)!);
    expect(both.tone).toBe(worstLight <= worstDark ? 'light' : 'dark');
    expect(both.overlayAlpha).toBe(Math.min(worstLight, worstDark));
    // Lolos di tiap gambar, dan kontras yang dilaporkan = gambar terburuk
    for (const sample of [DARK_IMAGE, BRIGHT_IMAGE]) expect(passes(toneContrast(both.tone, sample, both.overlayAlpha))).toBe(true);
    expect(both.contrast!.body).toBe(
      Math.min(...[DARK_IMAGE, BRIGHT_IMAGE].map((s) => toneContrast(both.tone, s, both.overlayAlpha).body)),
    );
    expect(decideHeroLegibility([], 'auto', 40)).toEqual(fallbackLegibility('auto', 40));
  });
});

describe('cadangan aman (sedang mengukur / tidak bisa diukur)', () => {
  it('teks terang dengan lapisan yang lolos di atas putih polos, minimal 55%', () => {
    expect(HERO_FALLBACK_ALPHA).toBeGreaterThanOrEqual(0.55);
    expect(HERO_FALLBACK_ALPHA).toBeGreaterThanOrEqual(requiredAlpha('light', solidSample(WHITE))!);
    for (const setting of ['auto', 'light'] as const) {
      expect(fallbackLegibility(setting, 40)).toEqual({ tone: 'light', overlayAlpha: HERO_FALLBACK_ALPHA, contrast: null, readable: true, measured: false });
    }
    // Lolos di atas latar apa pun
    for (const color of [WHITE, BLACK, hexToRgb('#FFE14D'), hexToRgb('#211FFE')]) {
      expect(passes(toneContrast('light', solidSample(color), HERO_FALLBACK_ALPHA))).toBe(true);
    }
  });

  it('nada gelap yang dipaksa: lapisan putih yang lolos di atas hitam polos; lapisan admin tetap minimum', () => {
    expect(fallbackLegibility('dark', 0)).toMatchObject({ tone: 'dark', overlayAlpha: HERO_DARK_FALLBACK_ALPHA });
    for (const color of [WHITE, BLACK, hexToRgb('#211FFE'), hexToRgb('#C00000')]) {
      expect(passes(toneContrast('dark', solidSample(color), HERO_DARK_FALLBACK_ALPHA))).toBe(true);
    }
    expect(fallbackLegibility('auto', 80).overlayAlpha).toBe(0.8);
  });
});

describe('coverSourceRect (object-fit: cover di tengah)', () => {
  it('gambar 4:3 di kotak lebar: atas & bawah terpotong', () => {
    const rect = coverSourceRect(1440, 1080, 1351, 900, { x: 0, y: 0, w: 1351, h: 900 })!;
    expect(rect.x).toBeCloseTo(0, 6);
    expect(rect.w).toBeCloseTo(1440, 6);
    expect(rect.y).toBeCloseTo((1080 - 900 / (1351 / 1440)) / 2, 6);
    expect(rect.h).toBeCloseTo(900 / (1351 / 1440), 6);
  });

  it('gambar lebar di kotak HP tinggi: kiri & kanan terpotong; region dipetakan ke piksel sumber', () => {
    const rect = coverSourceRect(1920, 1080, 390, 844, { x: 20, y: 80, w: 350, h: 280 })!;
    const scale = 844 / 1080;
    const offsetX = (390 - 1920 * scale) / 2;
    expect(rect.x).toBeCloseTo((20 - offsetX) / scale, 6);
    expect(rect.y).toBeCloseTo(80 / scale, 6);
    expect(rect.w).toBeCloseTo(350 / scale, 6);
    expect(rect.h).toBeCloseTo(280 / scale, 6);
  });

  it('region di luar kotak dipotong; ukuran tidak valid / region kosong → null', () => {
    expect(coverSourceRect(100, 100, 100, 100, { x: -20, y: 90, w: 50, h: 40 })).toEqual({ x: 0, y: 90, w: 30, h: 10 });
    expect(coverSourceRect(0, 100, 100, 100, { x: 0, y: 0, w: 10, h: 10 })).toBeNull();
    expect(coverSourceRect(100, 100, 100, 100, { x: 120, y: 0, w: 10, h: 10 })).toBeNull();
  });
});

describe('format & token', () => {
  it('rasio satu desimal dengan koma, dibulatkan ke bawah', () => {
    expect(formatRatio(7.19)).toBe('7,1:1');
    expect(formatRatio(4.5135)).toBe('4,5:1');
    expect(formatRatio(4.4999)).toBe('4,4:1');
    expect(formatRatio(21)).toBe('21,0:1');
  });

  it('warna lapisan per nada', () => {
    expect(scrimRgb('light')).toEqual(OBSIDIAN);
    expect(scrimRgb('dark')).toEqual(WHITE);
  });

  it('token CSS sama dengan warna yang dihitung', () => {
    const css = readFileSync(join(resolve(__dirname, '../../../../..'), 'src', 'index.css'), 'utf8').toLowerCase();
    const token = (name: string) => css.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`))?.[1];
    expect(token('--color-on-media')).toBe(COLORS.onMedia.toLowerCase());
    expect(token('--color-on-media-muted')).toBe(COLORS.onMediaMuted.toLowerCase());
    expect(token('--color-on-media-accent')).toBe(COLORS.onMediaAccent.toLowerCase());
    expect(token('--color-brand-200')).toBe(COLORS.onMediaAccent.toLowerCase());
    expect(token('--color-primary')).toBe(COLORS.primary.toLowerCase());
    expect(token('--site-fg')).toBe(COLORS.fg.toLowerCase());
    expect(token('--site-muted')).toBe(COLORS.muted.toLowerCase());
    expect(COLORS.scrimDark).toBe(COLORS.fg);
    expect(css).toMatch(/\.hero-scrim\s*\{[^}]*--scrim-far/);
    expect(css).toContain('@property --scrim-a');
  });

  it('kelas nada terang memakai token on-media, nada gelap = tampilan bawaan', () => {
    expect(HERO_TONE_CLASSES.light).toMatchObject({ title: 'text-on-media', accent: 'text-on-media-accent', point: 'text-on-media-muted', secondary: 'btn-outline-on-media' });
    expect(HERO_TONE_CLASSES.dark).toMatchObject({ title: 'text-fg', accent: 'text-primary', point: 'text-muted', secondary: 'btn-outline-clear' });
    expect(HERO_TONE_CLASSES.default.note).toBe('text-subtle');
    expect(HERO_TONE_CLASSES.dark.note).toBe('text-muted');
  });
});

describe('parser setting hero_text_tone / hero_overlay (sama dengan backend)', () => {
  it('nada dicocokkan persis, selain itu Otomatis', () => {
    expect(['auto', 'light', 'dark'].map(parseHeroTextTone)).toEqual(['auto', 'light', 'dark']);
    for (const raw of ['', 'LIGHT', ' dark', 'terang', null, undefined, 1, ['light']]) expect(parseHeroTextTone(raw), String(raw)).toBe('auto');
  });

  it('lapisan: angka dibulatkan & dibatasi 0..80, selain itu 40', () => {
    const cases: [unknown, number][] = [
      ['40', 40], ['0', 0], ['80', 80], ['55', 55], [' 40.5 ', 41], ['\t12\n', 12], ['0.5', 1], ['80.49', 80],
      ['-3', 0], ['-0.4', 0], ['81', 80], ['999999999999999999999', 80], [42.5, 43], [-0.4, 0], [1e21, 80],
      ['', 40], ['abc', 40], ['1e2', 40], ['+5', 40], ['5%', 40], ['4,5', 40], [null, 40], [undefined, 40], [true, 40], [Number.NaN, 40], [[3], 40],
    ];
    for (const [raw, expected] of cases) expect(parseHeroOverlay(raw), JSON.stringify(raw)).toBe(expected);
    expect(Object.is(parseHeroOverlay('-0.4'), 0)).toBe(true);
  });

  it('dari get_settings', () => {
    expect(parseHeroText({})).toEqual({ tone: 'auto', overlay: 40 });
    expect(parseHeroText({ hero_text_tone: 'dark', hero_overlay: '15' })).toEqual({ tone: 'dark', overlay: 15 });
  });
});
