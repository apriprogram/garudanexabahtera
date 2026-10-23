// Keterbacaan teks hero di atas latar gambar/video: matematika kontras WCAG murni (tanpa DOM) agar mudah diuji.
// Pengambilan sampel piksel ada di heroSampling.ts (browser), keputusan dipakai Hero.tsx dan pratinjau admin
// (Pengaturan website → Hero → "Latar hero").
//
// Aturan keputusan (decideHeroLegibility), permintaan pemilik 2026-10-23: gambar/video TIDAK PERNAH ditutup lapisan
// yang tidak dipilih admin, dan hero tanpa bayangan apa pun (teks, pendar, kotak).
// - lapisan = setting admin `hero_overlay` (0..80%) PERSIS, website tidak pernah menebalkannya; 0 = tanpa lapisan,
//   gambar/video tampil penuh;
// - sampel = piksel latar DI BELAKANG BLOK TEKS (canvas kecil). Lapisan dicampur per piksel dengan warna aslinya,
//   lalu dipakai persentil yang kokoh: 95% piksel paling gelap harus lolos untuk teks terang (persentil tinggi), 95%
//   piksel paling terang untuk teks gelap (persentil rendah). Titik kecil (≤ 5%) diabaikan, pita terang/gelap tidak;
// - nada 'light' = teks putih (lapisan obsidian bila ada); 'dark' = teks gelap (tampilan bawaan, lapisan putih);
// - target WCAG: teks isi ≥ 4,5:1, judul besar ≥ 3:1. Tidak lolos → admin diberi peringatan + saran lapisan / nada
//   (readableOverlay); website tidak menebalkan lapisan dan tidak menambah apa pun sendiri;
// - setting 'light' / 'dark' memaksa nadanya; 'auto' memilih nada yang paling terbaca di lapisan admin (seri → terang);
// - tayangan (2+ gambar): kasus terburuk dari semua gambar, jadi nada tidak berganti antar-slide;
// - belum / tidak bisa diukur (fallbackLegibility): 'auto' = teks gelap seperti halaman tanpa media, karena selama
//   gambar/video dimuat yang ada di belakang teks masih halaman putih (teks putih di sana tidak terlihat).

export type Rgb = readonly [number, number, number];

/** Setting `hero_text_tone`: 'auto' (bawaan) memilih sendiri, 'light' / 'dark' memaksa. */
export type HeroTextTone = 'auto' | 'light' | 'dark';
/** Nada teks yang dipakai: 'light' = teks terang (lapisan gelap bila ada), 'dark' = teks gelap (lapisan putih bila ada). */
export type HeroTone = 'light' | 'dark';

export const HERO_TEXT_TONES: readonly HeroTextTone[] = ['auto', 'light', 'dark'];
/** Setting `hero_overlay` (persen, bilangan bulat, dipakai persis): bawaan 0 = tanpa lapisan, batas atas admin 80. */
export const HERO_OVERLAY_DEFAULT = 0;
export const HERO_OVERLAY_MAX = 80;
/** Lapisan paling tebal yang bisa dipilih admin (alpha 0..1): batas hitungan saran lapisan (requiredAlpha). */
const MAX_ALPHA = HERO_OVERLAY_MAX / 100;
/** Target WCAG 1.4.3: teks isi 4,5:1, teks besar (judul ≥ 24px / ≥ 18,66px tebal) 3:1. */
export const BODY_TARGET = 4.5;
export const HEADLINE_TARGET = 3;
/** Bagian piksel yang boleh tidak lolos (derau, bintang kecil): persentil 5% / 95%. */
export const LOW_PERCENTILE = 0.05;
export const HIGH_PERCENTILE = 0.95;

/*
 * Warna yang dipakai teks hero, SAMA dengan token di src/index.css (heroContrast.test.ts mencocokkannya):
 * --color-on-media, --color-on-media-muted, --color-on-media-accent (= brand-200), --site-fg, --site-muted, primary.
 */
export const COLORS = {
  /** Lapisan nada terang = obsidian (`fg`) */
  scrimDark: '#121620',
  /** Lapisan nada gelap = putih */
  scrimLight: '#FFFFFF',
  onMedia: '#FFFFFF',
  onMediaMuted: '#EEF0F5',
  onMediaAccent: '#C2C1FF',
  fg: '#121620',
  muted: '#4B5262',
  primary: '#211FFE',
} as const;

/* ─── Warna & luminans ────────────────────────────────────────────────────── */

/** "#RRGGBB" / "#RGB" → [r, g, b] 0..255; selain itu → error (hanya dipakai dengan konstanta). */
export function hexToRgb(hex: string): Rgb {
  const raw = hex.replace(/^#/, '');
  const full = raw.length === 3 ? raw.replace(/./g, (c) => c + c) : raw;
  if (!/^[0-9a-f]{6}$/i.test(full)) throw new Error(`Warna tidak valid: ${hex}`);
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Kanal sRGB 0..255 (boleh pecahan) → linear 0..1 (fungsi transfer sRGB). */
export function srgbToLinear(channel: number): number {
  const c = Math.min(1, Math.max(0, channel / 255));
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Linear 0..1 → kanal sRGB 0..255 (pecahan, tidak dibulatkan). */
export function linearToSrgb(linear: number): number {
  const l = Math.min(1, Math.max(0, linear));
  const c = l <= 0.0031308 ? l * 12.92 : 1.055 * l ** (1 / 2.4) - 0.055;
  return c * 255;
}

/** Luminans relatif WCAG 0..1. */
export function relativeLuminance([r, g, b]: Rgb): number {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

/** Rasio kontras WCAG dua luminans (urutan bebas), 1..21. */
export function contrastRatio(a: number, b: number): number {
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return (hi + 0.05) / (lo + 0.05);
}

/** Warna `top` dengan alpha 0..1 di atas `bottom`, dicampur di ruang sRGB (seperti browser menggambar rgb(… / a)). */
export function compositeRgb(top: Rgb, alpha: number, bottom: Rgb): Rgb {
  const a = Math.min(1, Math.max(0, alpha));
  return [top[0] * a + bottom[0] * (1 - a), top[1] * a + bottom[1] * (1 - a), top[2] * a + bottom[2] * (1 - a)];
}

/** Luminans piksel (r, g, b) setelah ditutup lapisan `top` dengan alpha `a` (tanpa alokasi, dipakai per piksel). */
const compositeLuminance = (top: Rgb, a: number, r: number, g: number, b: number): number =>
  0.2126 * srgbToLinear(r + (top[0] - r) * a) + 0.7152 * srgbToLinear(g + (top[1] - g) * a) + 0.0722 * srgbToLinear(b + (top[2] - b) * a);

/* ─── Sampel latar ────────────────────────────────────────────────────────── */

/** Luminans latar (tanpa lapisan): `low` = persentil 5%, `high` = persentil 95%, `mean` = rata-rata. */
export interface LuminanceStats {
  low: number;
  high: number;
  mean: number;
}

/** Piksel latar di belakang blok teks (r, g, b berurutan, 0..255, transparansi sudah dicampur putih) + statistiknya. */
export interface BackgroundSample {
  rgb: Float32Array;
  count: number;
  stats: LuminanceStats;
}

/** Jumlah piksel yang boleh tidak lolos (5%, dibulatkan ke bawah). */
const allowedFailures = (count: number) => Math.floor((1 - HIGH_PERCENTILE) * count + 1e-9);
/** Indeks persentil di daftar terurut naik, sama persis dengan hitungan enoughPass(). */
const percentileIndex = (count: number, p: number) => (p >= 0.5 ? count - 1 - allowedFailures(count) : allowedFailures(count));

/**
 * Data RGBA (ImageData.data) → sampel latar. Piksel tembus pandang dicampur dengan putih (latar halaman di bawah
 * gambar). Tanpa piksel → null.
 */
export function backgroundSample(rgba: ArrayLike<number>): BackgroundSample | null {
  const count = Math.floor(rgba.length / 4);
  if (count === 0) return null;
  const rgb = new Float32Array(count * 3);
  const values = new Float64Array(count);
  let sum = 0;
  for (let i = 0; i < count; i += 1) {
    const a = rgba[i * 4 + 3] / 255;
    for (let c = 0; c < 3; c += 1) rgb[i * 3 + c] = rgba[i * 4 + c] * a + 255 * (1 - a);
    const l = relativeLuminance([rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]]);
    values[i] = l;
    sum += l;
  }
  values.sort();
  return {
    rgb,
    count,
    stats: { low: values[percentileIndex(count, LOW_PERCENTILE)], high: values[percentileIndex(count, HIGH_PERCENTILE)], mean: sum / count },
  };
}

/** Latar polos satu warna (mis. putih / hitam untuk cadangan, atau tes). */
export const solidSample = (color: Rgb): BackgroundSample => backgroundSample([color[0], color[1], color[2], 255])!;

/** Statistik luminans saja (tanpa menyimpan piksel). */
export const luminanceStats = (rgba: ArrayLike<number>): LuminanceStats | null => backgroundSample(rgba)?.stats ?? null;

/* ─── Keputusan nada & lapisan ────────────────────────────────────────────── */

interface Role {
  luminance: number;
  target: number;
  kind: 'body' | 'headline';
}

interface ToneSpec {
  scrim: Rgb;
  roles: Role[];
  /** Persentil luminans latar (setelah lapisan) yang harus lolos: tertinggi untuk teks terang, terendah untuk gelap */
  percentile: number;
  /** Batas luminans latar (setelah lapisan) agar semua teks lolos: maksimum (teks terang) / minimum (teks gelap) */
  limit: number;
}

const role = (hex: string, kind: Role['kind']): Role => ({
  luminance: relativeLuminance(hexToRgb(hex)),
  target: kind === 'body' ? BODY_TARGET : HEADLINE_TARGET,
  kind,
});

/*
 * Teks yang langsung di atas latar (bukan di atas permukaannya sendiri seperti pill toggle atau tombol biru):
 * terang = judul putih, kata aksen brand-200, poin on-media-muted & teks tombol garis putih;
 * gelap = judul fg, aksen primary, poin muted, teks tombol garis fg.
 */
const LIGHT_ROLES = [role(COLORS.onMedia, 'headline'), role(COLORS.onMediaAccent, 'headline'), role(COLORS.onMediaMuted, 'body'), role(COLORS.onMedia, 'body')];
const DARK_ROLES = [role(COLORS.fg, 'headline'), role(COLORS.primary, 'headline'), role(COLORS.muted, 'body'), role(COLORS.fg, 'body')];

const TONES: Record<HeroTone, ToneSpec> = {
  light: {
    scrim: hexToRgb(COLORS.scrimDark),
    roles: LIGHT_ROLES,
    percentile: HIGH_PERCENTILE,
    // Teks lebih terang dari latar: latar maksimum = (L teks + 0,05) / target − 0,05, yang paling ketat
    limit: Math.min(...LIGHT_ROLES.map((r) => (r.luminance + 0.05) / r.target - 0.05)),
  },
  dark: {
    scrim: hexToRgb(COLORS.scrimLight),
    roles: DARK_ROLES,
    percentile: LOW_PERCENTILE,
    // Teks lebih gelap dari latar: latar minimum = target × (L teks + 0,05) − 0,05, yang paling ketat
    limit: Math.max(...DARK_ROLES.map((r) => r.target * (r.luminance + 0.05) - 0.05)),
  },
};

/** Warna lapisan per nada (dipakai CSS lewat --scrim-rgb). */
export const scrimRgb = (tone: HeroTone): Rgb => TONES[tone].scrim;

/** Kontras terendah teks isi & judul nada ini di atas latar berluminans `background` (sudah termasuk lapisan). */
export function textContrast(tone: HeroTone, background: number): { body: number; headline: number } {
  let body = Infinity;
  let headline = Infinity;
  for (const r of TONES[tone].roles) {
    const ratio = contrastRatio(r.luminance, background);
    if (r.kind === 'body') body = Math.min(body, ratio);
    else headline = Math.min(headline, ratio);
  }
  return { body, headline };
}

/** Luminans latar pada persentil nada ini setelah ditutup lapisan `alpha` (warna asli tiap piksel dicampur). */
export function scrimmedLuminance(tone: HeroTone, sample: BackgroundSample, alpha: number): number {
  const { scrim, percentile } = TONES[tone];
  const a = Math.min(1, Math.max(0, alpha));
  const values = new Float64Array(sample.count);
  for (let i = 0; i < sample.count; i += 1) {
    values[i] = compositeLuminance(scrim, a, sample.rgb[i * 3], sample.rgb[i * 3 + 1], sample.rgb[i * 3 + 2]);
  }
  values.sort();
  return values[percentileIndex(sample.count, percentile)];
}

/** Kontras terendah teks nada ini di atas sampel dengan lapisan `alpha` (pada persentil yang dipakai). */
export const toneContrast = (tone: HeroTone, sample: BackgroundSample, alpha: number) =>
  textContrast(tone, scrimmedLuminance(tone, sample, alpha));

const passes = (c: { body: number; headline: number }) => c.body >= BODY_TARGET && c.headline >= HEADLINE_TARGET;

/** true bila cukup piksel lolos (paling banyak 5% boleh gagal) dengan lapisan `alpha`. */
function enoughPass(tone: HeroTone, sample: BackgroundSample, alpha: number): boolean {
  const { scrim, limit } = TONES[tone];
  const allowed = allowedFailures(sample.count);
  let failing = 0;
  for (let i = 0; i < sample.count; i += 1) {
    const l = compositeLuminance(scrim, alpha, sample.rgb[i * 3], sample.rgb[i * 3 + 1], sample.rgb[i * 3 + 2]);
    if (tone === 'light' ? l > limit : l < limit) {
      failing += 1;
      if (failing > allowed) return false;
    }
  }
  return true;
}

const requiredCache = new WeakMap<BackgroundSample, Partial<Record<HeroTone, number | null>>>();

/**
 * Lapisan paling tipis (alpha 0..0,8, naik per 0,001) agar teks nada ini lolos di atas sampel; null bila tetap tidak
 * lolos dengan lapisan paling tebal yang bisa dipilih admin. Hanya untuk SARAN di admin (readableOverlay): website
 * tidak pernah memasang lapisan selain setting admin. Disimpan per sampel (slider admin tidak menghitung ulang).
 */
export function requiredAlpha(tone: HeroTone, sample: BackgroundSample): number | null {
  const cached = requiredCache.get(sample)?.[tone];
  if (cached !== undefined) return cached;
  let result: number | null;
  if (enoughPass(tone, sample, 0)) {
    result = 0;
  } else if (!enoughPass(tone, sample, MAX_ALPHA)) {
    result = null;
  } else {
    let lo = 0;
    let hi = MAX_ALPHA;
    for (let i = 0; i < 14; i += 1) {
      const mid = (lo + hi) / 2;
      if (enoughPass(tone, sample, mid)) hi = mid;
      else lo = mid;
    }
    // Dibulatkan ke atas ke 0,001 (tetap lolos), tidak melewati batas
    result = Math.min(MAX_ALPHA, Math.ceil(hi * 1000 - 1e-6) / 1000);
    while (result < MAX_ALPHA && !enoughPass(tone, sample, result)) result = Math.min(MAX_ALPHA, result + 0.001);
  }
  requiredCache.set(sample, { ...requiredCache.get(sample), [tone]: result });
  return result;
}

/** `hero_overlay` (persen) → alpha lapisan yang dipakai persis, 0..0,8; bukan angka → bawaan (0). */
export const overlayAlpha = (percent: number): number =>
  Math.min(HERO_OVERLAY_MAX, Math.max(0, Number.isFinite(percent) ? percent : HERO_OVERLAY_DEFAULT)) / 100;

export interface HeroLegibility {
  tone: HeroTone;
  /** Alpha lapisan di belakang blok teks = setting admin persis (0..0,8); 0 = tanpa lapisan */
  overlayAlpha: number;
  /** Kontras terendah (gambar terburuk) dengan lapisan ini; null = latar tidak bisa diukur */
  contrast: { body: number; headline: number } | null;
  /** Semua teks lolos target di lapisan ini; null = tidak diukur (cadangan) */
  readable: boolean | null;
  /** false = cadangan (sedang mengukur, atau latar tidak bisa diukur) */
  measured: boolean;
}

/** Skor keterbacaan: kontras terendah dibanding targetnya (≥ 1 = semua teks lolos). */
const legibilityScore = (c: { body: number; headline: number }) => Math.min(c.body / BODY_TARGET, c.headline / HEADLINE_TARGET);

const sampleList = (samples: BackgroundSample | readonly BackgroundSample[]): readonly BackgroundSample[] =>
  Array.isArray(samples) ? (samples as readonly BackgroundSample[]) : [samples as BackgroundSample];

/**
 * Nada untuk latar dengan sampel `samples` (satu per gambar tayangan; kasus terburuk dipakai), setting nada, dan
 * lapisan admin (persen, dipakai persis). Lihat aturan di kepala file. Tanpa sampel → cadangan.
 */
export function decideHeroLegibility(
  samples: BackgroundSample | readonly BackgroundSample[],
  setting: HeroTextTone,
  overlayPercent: number,
): HeroLegibility {
  const list = sampleList(samples);
  if (list.length === 0) return fallbackLegibility(setting, overlayPercent);
  const alpha = overlayAlpha(overlayPercent);
  // Kontras terendah nada ini dari semua gambar, di lapisan admin
  const worst = (tone: HeroTone) => {
    let body = Infinity;
    let headline = Infinity;
    for (const sample of list) {
      const c = toneContrast(tone, sample, alpha);
      body = Math.min(body, c.body);
      headline = Math.min(headline, c.headline);
    }
    return { body, headline };
  };
  let tone: HeroTone;
  let contrast: { body: number; headline: number };
  if (setting === 'light' || setting === 'dark') {
    tone = setting;
    contrast = worst(setting);
  } else {
    const light = worst('light');
    const dark = worst('dark');
    // Seri → terang
    const darkWins = legibilityScore(dark) > legibilityScore(light);
    tone = darkWins ? 'dark' : 'light';
    contrast = darkWins ? dark : light;
  }
  return { tone, overlayAlpha: alpha, contrast, readable: passes(contrast), measured: true };
}

/**
 * Saran untuk admin bila teks kurang terbaca: lapisan paling tipis (persen bulat 0..80) agar teks nada ini lolos di
 * atas SEMUA sampel; null bila tidak ada sampel atau tetap tidak lolos dengan 80%. Website tidak memakainya.
 */
export function readableOverlay(samples: BackgroundSample | readonly BackgroundSample[], tone: HeroTone): number | null {
  const list = sampleList(samples);
  if (list.length === 0) return null;
  let req = 0;
  for (const sample of list) {
    const alpha = requiredAlpha(tone, sample);
    if (alpha === null) return null;
    req = Math.max(req, alpha);
  }
  // requiredAlpha = kelipatan 0,001 yang sudah lolos: persen dibulatkan ke atas agar tetap lolos (max: bukan -0)
  return Math.min(HERO_OVERLAY_MAX, Math.max(0, Math.ceil(req * 100 - 1e-6)));
}

/**
 * Cadangan selama latar diukur, atau bila tidak bisa diukur (gambar lintas domain tanpa CORS, canvas tercemar, video
 * tanpa frame, hemat data dengan 2+ gambar), dengan lapisan admin persis (tanpa lapisan tambahan):
 * - 'auto' / 'dark' → teks gelap (tampilan halaman tanpa media): selama gambar/video belum tampil, di belakang teks
 *   masih halaman putih, jadi teks putih tidak terlihat sama sekali; lapisan nada gelap = putih, tidak menggelapkan;
 * - 'light' → teks terang, pilihan admin dihormati (admin memilihnya untuk media yang gelap).
 * HTML prerender dan render pertama di browser memakai ini, jadi keduanya sama (tanpa selisih hidrasi, tanpa kilasan
 * lapisan gelap).
 */
export function fallbackLegibility(setting: HeroTextTone, overlayPercent: number): HeroLegibility {
  const tone: HeroTone = setting === 'light' ? 'light' : 'dark';
  return { tone, overlayAlpha: overlayAlpha(overlayPercent), contrast: null, readable: null, measured: false };
}

/* ─── Geometri object-fit: cover ──────────────────────────────────────────── */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Potongan gambar sumber (piksel asli) yang tampil di `region` sebuah kotak boxW × boxH bila gambar berukuran
 * naturalW × naturalH dipasang `object-fit: cover` di tengah (object-position 50% 50%, bawaan). Region dipotong ke
 * dalam kotak; ukuran tidak valid → null.
 */
export function coverSourceRect(naturalW: number, naturalH: number, boxW: number, boxH: number, region: Rect): Rect | null {
  if (!(naturalW > 0 && naturalH > 0 && boxW > 0 && boxH > 0)) return null;
  const x0 = Math.max(0, region.x);
  const y0 = Math.max(0, region.y);
  const x1 = Math.min(boxW, region.x + region.w);
  const y1 = Math.min(boxH, region.y + region.h);
  if (!(x1 > x0 && y1 > y0)) return null;
  const scale = Math.max(boxW / naturalW, boxH / naturalH);
  const offsetX = (boxW - naturalW * scale) / 2;
  const offsetY = (boxH - naturalH * scale) / 2;
  const sx = Math.max(0, (x0 - offsetX) / scale);
  const sy = Math.max(0, (y0 - offsetY) / scale);
  const ex = Math.min(naturalW, (x1 - offsetX) / scale);
  const ey = Math.min(naturalH, (y1 - offsetY) / scale);
  return ex > sx && ey > sy ? { x: sx, y: sy, w: ex - sx, h: ey - sy } : null;
}

/** "7,1:1" (satu desimal, koma Indonesia, dibulatkan ke bawah agar tidak melebih-lebihkan). */
export const formatRatio = (ratio: number): string => `${(Math.floor(ratio * 10) / 10).toFixed(1).replace('.', ',')}:1`;
