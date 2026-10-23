// Keterbacaan teks hero di atas gambar/video: luminans & kontras WCAG, pencampuran lapisan per piksel, persentil
// latar, keputusan nada (lapisan admin dipakai PERSIS, tidak pernah dinaikkan; nada yang dipaksa; kasus terburuk
// tayangan), saran lapisan untuk admin, cadangan (lapisan admin, bawaan 0), geometri object-fit: cover, parser setting
// hero_text_tone / hero_overlay, token CSS yang harus sama dengan warna yang dihitung, dan hero tanpa bayangan.
// Jalankan: npx vitest run src/components/sections/hero/__tests__/heroContrast.test.ts
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BODY_TARGET,
  COLORS,
  HEADLINE_TARGET,
  HERO_OVERLAY_DEFAULT,
  HERO_OVERLAY_MAX,
  backgroundSample,
  compositeRgb,
  contrastRatio,
  coverSourceRect,
  decideHeroLegibility,
  decideNavTone,
  navContrast,
  NAV_MIN_CONTRAST,
  fallbackLegibility,
  formatRatio,
  hexToRgb,
  linearToSrgb,
  luminanceStats,
  overlayAlpha,
  readableOverlay,
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
/** Skor keterbacaan seperti decideHeroLegibility: kontras terendah ÷ target */
const score = (c: { body: number; headline: number }) => Math.min(c.body / BODY_TARGET, c.headline / HEADLINE_TARGET);
/** Kontras terendah nada ini dari semua sampel di alpha ini */
const worst = (tone: 'light' | 'dark', samples: BackgroundSample[], alpha: number) => ({
  body: Math.min(...samples.map((s) => toneContrast(tone, s, alpha).body)),
  headline: Math.min(...samples.map((s) => toneContrast(tone, s, alpha).headline)),
});

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

  it('naik seiring latar makin terang (teks terang) / makin gelap (teks gelap), selalu ≤ 80% (batas admin)', () => {
    let lastLight = -1;
    let lastDark = 2;
    for (let i = 0; i <= 20; i += 1) {
      const light = requiredAlpha('light', gray(i / 20))!;
      const dark = requiredAlpha('dark', gray(i / 20))!;
      expect(light).toBeGreaterThanOrEqual(lastLight);
      expect(dark).toBeLessThanOrEqual(lastDark);
      expect(Math.max(light, dark)).toBeLessThanOrEqual(HERO_OVERLAY_MAX / 100);
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

  it('lapisan admin (persen) → alpha persis 0..0,8; bukan angka → bawaan 0 (tanpa lapisan)', () => {
    expect(HERO_OVERLAY_DEFAULT).toBe(0);
    expect(overlayAlpha(40)).toBe(0.4);
    expect(overlayAlpha(37)).toBe(0.37);
    expect(overlayAlpha(0)).toBe(0);
    expect(overlayAlpha(120)).toBe(0.8);
    expect(overlayAlpha(-5)).toBe(0);
    expect(overlayAlpha(Number.NaN)).toBe(0);
  });
});

describe('decideHeroLegibility', () => {
  const DARK_IMAGE = sampleOf([80, hexToRgb('#0B1430')], [20, hexToRgb('#1D3A8A')]);
  const BRIGHT_IMAGE = sampleOf([70, hexToRgb('#F4F7FF')], [30, hexToRgb('#DCE6F5')]);
  // Gelap di atas, putih di bawah blok teks (seperti gambar latar lokal saat ini)
  const MIXED = sampleOf([55, hexToRgb('#06102C')], [15, hexToRgb('#1A6BFF')], [30, hexToRgb('#F2F6FF')]);

  it('otomatis, tidak ada nada yang lolos: nada yang terbaca di bagian latar terbesar menang', () => {
    const mostlyLight = sampleOf([35, hexToRgb('#06102C')], [65, hexToRgb('#F2F6FF')]);
    const mostlyDark = sampleOf([65, hexToRgb('#06102C')], [35, hexToRgb('#F2F6FF')]);
    expect(decideHeroLegibility(mostlyLight, 'auto', 0)).toMatchObject({ tone: 'dark', readable: false });
    expect(decideHeroLegibility(mostlyDark, 'auto', 0)).toMatchObject({ tone: 'light', readable: false });
    // Gambar terburuk menentukan: tayangan dengan satu gambar mayoritas gelap → teks terang
    expect(decideHeroLegibility([mostlyLight, mostlyDark], 'auto', 0).tone).toBe('light');
  });

  it('otomatis: gambar gelap → teks terang dengan lapisan admin persis (0 = tanpa lapisan)', () => {
    expect(decideHeroLegibility(DARK_IMAGE, 'auto', 40)).toMatchObject({ tone: 'light', overlayAlpha: 0.4, readable: true, measured: true });
    expect(decideHeroLegibility(DARK_IMAGE, 'auto', 0)).toMatchObject({ tone: 'light', overlayAlpha: 0, readable: true });
  });

  it('otomatis: gambar terang → teks gelap, tetap tanpa lapisan di 0%', () => {
    const result = decideHeroLegibility(BRIGHT_IMAGE, 'auto', 0);
    expect(result).toMatchObject({ tone: 'dark', overlayAlpha: 0, readable: true });
    expect(result.contrast!.body).toBeGreaterThanOrEqual(BODY_TARGET);
  });

  it('lapisan = setting admin PERSIS, tidak pernah dinaikkan otomatis (juga bila kurang terbaca)', () => {
    for (const sample of [DARK_IMAGE, BRIGHT_IMAGE, MIXED, solidSample(WHITE), solidSample(BLACK)]) {
      for (const setting of ['auto', 'light', 'dark'] as const) {
        for (const percent of [0, 1, 20, 37, 55, 80]) {
          expect(decideHeroLegibility(sample, setting, percent).overlayAlpha, `${setting} ${percent}`).toBe(percent / 100);
        }
      }
    }
    // Latar campuran di 20%: kurang terbaca, lapisan tetap 20% (dulu dinaikkan sampai lolos)
    const mixed = decideHeroLegibility(MIXED, 'auto', 20);
    expect(mixed.overlayAlpha).toBe(0.2);
    expect(mixed.readable).toBe(false);
    expect(mixed.contrast).toEqual(toneContrast(mixed.tone, MIXED, 0.2));
    // Teks terang dipaksa di atas putih polos tanpa lapisan: tetap 0, dilaporkan tidak terbaca
    expect(decideHeroLegibility(solidSample(WHITE), 'light', 0)).toMatchObject({ tone: 'light', overlayAlpha: 0, readable: false });
  });

  it('otomatis memilih nada yang paling terbaca di lapisan admin (bagian latar terbaca, lalu skor kontras ÷ target)', () => {
    for (const percent of [0, 20, 40, 70]) {
      const result = decideHeroLegibility(MIXED, 'auto', percent);
      expect(result.contrast, String(percent)).toEqual(toneContrast(result.tone, MIXED, percent / 100));
    }
    // MIXED tanpa lapisan: sebagian besar langit gelap → teks terang
    expect(decideHeroLegibility(MIXED, 'auto', 0).tone).toBe('light');
    // Separuh langit gelap, separuh cahaya putih, pita biru terang di tengah: teks gelap masih terbaca di biru, putih
    // hilang di cahaya putih → gelap
    const SKY = sampleOf([25, hexToRgb('#06102C')], [28, hexToRgb('#1A6BFF')], [47, hexToRgb('#F2F6FF')]);
    expect(decideHeroLegibility(SKY, 'auto', 0).tone).toBe('dark');
    // Abu-abu menengah di 0%: nada dengan skor lebih tinggi menang, sama dengan perbandingan manual
    for (let i = 0; i <= 20; i += 1) {
      const sample = gray(i / 20);
      const result = decideHeroLegibility(sample, 'auto', 0);
      const light = score(toneContrast('light', sample, 0));
      const dark = score(toneContrast('dark', sample, 0));
      expect(result.tone, String(i)).toBe(dark > light ? 'dark' : 'light');
    }
  });

  it('nada dipaksa: tetap nada itu dengan lapisan admin persis, walau kurang terbaca', () => {
    const light = decideHeroLegibility(BRIGHT_IMAGE, 'light', 10);
    expect(light).toMatchObject({ tone: 'light', overlayAlpha: 0.1, readable: false });
    const dark = decideHeroLegibility(DARK_IMAGE, 'dark', 10);
    expect(dark).toMatchObject({ tone: 'dark', overlayAlpha: 0.1, readable: false });
    expect(decideHeroLegibility(DARK_IMAGE, 'light', 60)).toMatchObject({ tone: 'light', overlayAlpha: 0.6, readable: true });
    // Produksi: video gelap, teks terang dipaksa, 0% → tanpa lapisan
    expect(decideHeroLegibility(DARK_IMAGE, 'light', 0)).toMatchObject({ tone: 'light', overlayAlpha: 0 });
  });

  it('tayangan: kasus terburuk dari semua gambar (nada tidak berganti antar-slide), lapisan tetap persis', () => {
    const both = decideHeroLegibility([DARK_IMAGE, BRIGHT_IMAGE], 'auto', 0);
    const light = worst('light', [DARK_IMAGE, BRIGHT_IMAGE], 0);
    const dark = worst('dark', [DARK_IMAGE, BRIGHT_IMAGE], 0);
    expect(both.tone).toBe(score(dark) > score(light) ? 'dark' : 'light');
    expect(both.overlayAlpha).toBe(0);
    expect(both.contrast).toEqual(both.tone === 'dark' ? dark : light);
    expect(decideHeroLegibility([], 'auto', 40)).toEqual(fallbackLegibility('auto', 40));
  });
});

describe('readableOverlay (saran lapisan di admin)', () => {
  const MIXED = sampleOf([55, hexToRgb('#06102C')], [15, hexToRgb('#1A6BFF')], [30, hexToRgb('#F2F6FF')]);
  const DARK_IMAGE = sampleOf([80, hexToRgb('#0B1430')], [20, hexToRgb('#1D3A8A')]);

  it('persen bulat paling tipis yang lolos: 1% lebih tipis sudah tidak lolos', () => {
    for (const tone of ['light', 'dark'] as const) {
      for (const sample of [MIXED, solidSample(WHITE), solidSample(BLACK), gray(0.3)]) {
        const percent = readableOverlay(sample, tone);
        expect(percent, tone).not.toBeNull();
        expect(percent!).toBeLessThanOrEqual(HERO_OVERLAY_MAX);
        expect(decideHeroLegibility(sample, tone, percent!).readable, tone).toBe(true);
        if (percent! > 0) expect(decideHeroLegibility(sample, tone, percent! - 1).readable, tone).toBe(false);
      }
    }
    // Putih polos butuh 63% obsidian untuk teks terang; latar gelap tidak butuh lapisan
    expect(readableOverlay(solidSample(WHITE), 'light')).toBe(63);
    expect(readableOverlay(DARK_IMAGE, 'light')).toBe(0);
  });

  it('tayangan: kasus terburuk; tanpa sampel → null', () => {
    expect(readableOverlay([DARK_IMAGE, MIXED], 'light')).toBe(Math.max(readableOverlay(DARK_IMAGE, 'light')!, readableOverlay(MIXED, 'light')!));
    expect(readableOverlay([], 'light')).toBeNull();
  });

  it('latar paling ekstrem pun punya saran ≤ 80% untuk kedua nada (admin selalu dapat angka lapisan)', () => {
    // Putih = terburuk untuk teks terang, hitam = terburuk untuk teks gelap; setengah-setengah = keduanya
    const half = sampleOf([50, WHITE], [50, BLACK]);
    expect(readableOverlay(half, 'light')).toBe(readableOverlay(solidSample(WHITE), 'light'));
    expect(readableOverlay(half, 'dark')).toBe(readableOverlay(solidSample(BLACK), 'dark'));
    for (const tone of ['light', 'dark'] as const) {
      expect(readableOverlay(half, tone), tone).not.toBeNull();
      expect(readableOverlay(half, tone)!, tone).toBeLessThanOrEqual(HERO_OVERLAY_MAX);
    }
  });
});

describe('cadangan (sedang mengukur / tidak bisa diukur / HTML prerender)', () => {
  it('otomatis: teks gelap seperti halaman tanpa media (bukan putih di atas halaman putih), lapisan admin persis', () => {
    for (const setting of ['auto', 'dark'] as const) {
      expect(fallbackLegibility(setting, 40)).toEqual({ tone: 'dark', overlayAlpha: 0.4, contrast: null, readable: null, measured: false });
      expect(fallbackLegibility(setting, 0)).toEqual({ tone: 'dark', overlayAlpha: 0, contrast: null, readable: null, measured: false });
    }
    expect(fallbackLegibility('auto', 80).overlayAlpha).toBe(0.8);
    expect(fallbackLegibility('auto', Number.NaN).overlayAlpha).toBe(0);
    // Selama gambar/video dimuat yang ada di belakang teks = halaman putih: teks cadangan terbaca di sana
    const page = solidSample(WHITE);
    const pending = fallbackLegibility('auto', 0);
    expect(decideHeroLegibility(page, pending.tone, 0).readable).toBe(true);
    // Lapisan nada gelap = putih: tidak pernah menggelapkan media
    expect(scrimRgb(pending.tone)).toEqual(hexToRgb('#FFFFFF'));
  });

  it('nada terang yang dipaksa: teks terang, lapisan admin persis', () => {
    expect(fallbackLegibility('light', 0)).toEqual({ tone: 'light', overlayAlpha: 0, contrast: null, readable: null, measured: false });
    expect(fallbackLegibility('light', 25)).toMatchObject({ tone: 'light', overlayAlpha: 0.25 });
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

  it('hero tanpa bayangan (permintaan pemilik 2026-10-23): tanpa kelas bayangan teks, lapisan & tombol hero datar', () => {
    const css = readFileSync(join(resolve(__dirname, '../../../../..'), 'src', 'index.css'), 'utf8').replace(/\r\n/g, '\n');
    // Kelas bayangan teks / pendar hero dari percobaan sebelumnya sudah dihapus seluruhnya
    expect(css).not.toMatch(/hero-shadow|text-shadow/);
    const rules = (name: string) => [...css.matchAll(new RegExp(`\\.${name}\\s*\\{([^}]*)\\}`, 'g'))].map((m) => m[1]);
    for (const name of ['hero-scrim', 'hero-scrim-x', 'btn', 'btn-xl', 'btn-primary', 'btn-outline-clear', 'btn-outline-on-media']) {
      const bodies = rules(name);
      expect(bodies.length, name).toBeGreaterThan(0);
      for (const body of bodies) expect(body, name).not.toMatch(/shadow|glow|filter|blur/);
    }
    // Kelas teks per nada: warna & garis saja
    for (const [look, classes] of Object.entries(HERO_TONE_CLASSES)) {
      for (const value of Object.values(classes)) expect(value, look).not.toMatch(/shadow|glow|blur/);
    }
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

  it('lapisan: angka dibulatkan & dibatasi 0..80, selain itu bawaan 0 (tanpa lapisan)', () => {
    const cases: [unknown, number][] = [
      ['40', 40], ['0', 0], ['80', 80], ['55', 55], [' 40.5 ', 41], ['\t12\n', 12], ['0.5', 1], ['80.49', 80],
      ['-3', 0], ['-0.4', 0], ['81', 80], ['999999999999999999999', 80], [42.5, 43], [-0.4, 0], [1e21, 80],
      ['', 0], ['abc', 0], ['1e2', 0], ['+5', 0], ['5%', 0], ['4,5', 0], [null, 0], [undefined, 0], [true, 0], [Number.NaN, 0], [[3], 0],
    ];
    for (const [raw, expected] of cases) expect(parseHeroOverlay(raw), JSON.stringify(raw)).toBe(expected);
    expect(Object.is(parseHeroOverlay('-0.4'), 0)).toBe(true);
  });

  it('dari get_settings', () => {
    expect(parseHeroText({})).toEqual({ tone: 'auto', overlay: 0 });
    expect(parseHeroText({ hero_text_tone: 'dark', hero_overlay: '15' })).toEqual({ tone: 'dark', overlay: 15 });
  });
});

describe('decideNavTone: navbar transparan di atas pita teks strip latar (tanpa lapisan)', () => {
  const solid = (hex: string) => solidSample(hexToRgb(hex));
  const halves = (a: string, b: string) =>
    backgroundSample([...Array.from({ length: 50 }, () => [...hexToRgb(a), 255]), ...Array.from({ length: 50 }, () => [...hexToRgb(b), 255])].flat())!;

  it('strip gelap → teks putih; strip terang → teks gelap', () => {
    expect(decideNavTone([solid('#0B1430')])).toBe('light');
    expect(decideNavTone([solid('#F4F7FF')])).toBe('dark');
  });

  it('teks putih navbar = putih penuh: 4,5:1 sampai luminans latar ±0,18', () => {
    expect(navContrast('light', solid('#777777')).body).toBeGreaterThan(4.4);
    expect(navContrast('light', solid('#0B1430')).headline).toBeGreaterThan(15);
  });

  it('tidak lolos 4,5:1 tapi ≥ 3:1: nada yang lebih terbaca tetap dipakai (permintaan pemilik), di bawah 3:1 juga', () => {
    // #8A8A8A: putih ±3,45:1 (di bawah 4,5:1), teks gelap muted ±2,3:1 → tetap putih
    expect(navContrast('light', solid('#8A8A8A')).body).toBeLessThan(BODY_TARGET);
    expect(navContrast('light', solid('#8A8A8A')).body).toBeGreaterThanOrEqual(NAV_MIN_CONTRAST);
    expect(decideNavTone([solid('#8A8A8A')])).toBe('light');
    // Seperti gambar langit pemilik: hampir semua gelap, pita terang di belakang menu ±3,8:1 untuk putih
    const sky = backgroundSample(
      [...Array.from({ length: 90 }, () => [6, 16, 60, 255]), ...Array.from({ length: 10 }, () => [64, 112, 230, 255])].flat(),
    )!;
    expect(navContrast('light', sky).body).toBeLessThan(BODY_TARGET);
    expect(decideNavTone([sky])).toBe('light');
    // Separuh gelap separuh terang: tidak ada nada ≥ 3:1 → tetap transparan dengan nada yang lebih terbaca
    // (permintaan pemilik 2026-10-23: desktop DAN HP); hanya tanpa sampel → putih kaca
    expect(decideNavTone([halves('#0B1430', '#F4F7FF')])).toMatch(/^(light|dark)$/);
    expect(decideNavTone([])).toBeNull();
  });

  it('kasus terburuk tayangan: nada harus terbaca di semua gambar', () => {
    expect(decideNavTone([solid('#0B1430'), solid('#1D3A8A')])).toBe('light');
    expect(decideNavTone([solid('#0B1430'), solid('#F4F7FF')])).toMatch(/^(light|dark)$/);
  });

  it('dekat batas: abu sangat gelap → putih, hampir putih → gelap; kedua nada tidak pernah lolos 4,5:1 bersamaan', () => {
    expect(decideNavTone([solid('#2A2E38')])).toBe('light');
    expect(decideNavTone([solid('#FAFBFD')])).toBe('dark');
    for (let v = 0; v <= 255; v += 5) {
      const hex = `#${v.toString(16).padStart(2, '0').repeat(3)}`;
      const light = navContrast('light', solid(hex)).body >= BODY_TARGET;
      const dark = navContrast('dark', solid(hex)).body >= BODY_TARGET;
      expect(light && dark, hex).toBe(false);
    }
  });

  it('bintik terang kecil (≤ 5% piksel, mis. bintang) tidak membatalkan teks terang', () => {
    const starfield = backgroundSample(
      [...Array.from({ length: 97 }, () => [11, 20, 48, 255]), ...Array.from({ length: 3 }, () => [255, 255, 255, 255])].flat(),
    )!;
    expect(decideNavTone([starfield])).toBe('light');
  });
});
