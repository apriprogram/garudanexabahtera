// Data geometri SVG Lawatan (tanpa React): garis rute hero (versi layar lebar & HP), panorama bukit film, dan piktogram
// titik rute. Semua digambar sendiri (bukan jiplakan foto/merek), satu warna lewat currentColor / variabel tema.
import type { StopKey } from './icons';

export interface HeroRoute {
  /** viewBox [lebar, tinggi]: rasio kira-kira sama dengan kotak foto hero */
  box: readonly [number, number];
  d: string;
  start: readonly [number, number];
  end: readonly [number, number];
  /** Skala bus */
  bus: number;
  /** Bagian jalur tempat bus berhenti (sebelum pin tujuan) */
  park: number;
  /** Titik parkir bus = titik jalur pada `park` (dihitung dari jalur; keadaan diam) */
  parked: readonly [number, number];
  /** preserveAspectRatio: 'slice' (bawaan, mengisi kotak) atau 'meet' (utuh di tengah, tidak terpotong) */
  fit?: 'slice' | 'meet';
  /** Pengali tebal garis, jarak titik, dan ukuran pin (bawaan 1) */
  ink?: number;
}

/**
 * Layar lebar: kotak foto ± 1440×722. Rute melengkung di langit di ATAS panel kartu pos (kiri, y < 230), lalu turun ke
 * lereng gunung di kanan, di luar panel.
 */
export const HERO_ROUTE_WIDE: HeroRoute = {
  box: [1440, 722],
  d: 'M130 214 C 300 92, 540 66, 760 140 C 950 204, 1110 228, 1290 296',
  start: [130, 214],
  end: [1290, 296],
  bus: 1,
  park: 0.92,
  parked: [1198.6, 264.4],
};

/**
 * Layar sangat lebar (≥ 1920px): kotak foto 1920–3440 × 530–812 jauh lebih pipih dari HERO_ROUTE_WIDE, yang dengan
 * `slice` terpotong di atas (2560×1300: lengkungan keluar foto). Versi ini lebih landai dan memakai `meet`: selalu utuh,
 * diskalakan oleh tinggi kotak lalu ditaruh di tengah. Titik awal (x 180, y 140) tetap di atas panel kartu pos (puncak
 * panel ± 199–344px dari atas foto), puncak lengkungan y ± 55, pin tujuan di kanan panel.
 */
export const HERO_ROUTE_ULTRA: HeroRoute = {
  box: [1920, 600],
  d: 'M180 140 C 400 50, 760 28, 1080 92 C 1330 142, 1520 184, 1720 250',
  start: [180, 140],
  end: [1720, 250],
  bus: 1.3,
  park: 0.92,
  parked: [1600, 212.9],
  fit: 'meet',
  ink: 1.25,
};

/** HP: kotak foto ± 390×420; panel menutup mulai y ≈ 300, jadi rute tetap di 2/3 atas. */
export const HERO_ROUTE_TALL: HeroRoute = {
  box: [390, 420],
  d: 'M34 214 C 64 132, 140 84, 210 108 C 268 128, 318 168, 356 178',
  start: [34, 214],
  end: [356, 178],
  bus: 0.72,
  park: 0.9,
  parked: [320.1, 163],
};

/** Panorama bukit jauh film (viewBox 2400×160): punggung bukit belakang, gunung berasap, bukit depan. */
export const HILLS = {
  box: [2400, 160] as const,
  far: 'M0 160V112C120 96 210 70 330 78S520 112 640 98 820 54 960 64 1150 104 1290 96 1460 58 1600 66 1800 104 1940 92 2140 60 2260 70 2370 96 2400 100V160Z',
  volcano: 'M700 160 L860 38 Q872 30 884 38 L1050 160Z',
  smoke: 'M866 30c-6-8 2-16 10-12 2-10 16-10 18 0 10-2 14 10 6 14',
  near: 'M0 160V136C140 124 260 112 400 120S640 146 800 138 1080 112 1240 120 1520 146 1680 136 1960 114 2120 122 2320 140 2400 134V160Z',
  cloud: 'M1500 40h70c10 0 10-14 0-14-2-12-20-14-26-4-8-6-20 0-18 8-10 0-12 10-26 10Z',
} as const;

/** Piktogram titik rute 24×24 (garis 1,6px, ujung bulat). */
export const STOP_GLYPHS: Record<StopKey, readonly string[]> = {
  school: ['M4 20V10.5L12 5.5l8 5V20', 'M10 20v-5h4v5', 'M12 5.5V2.5l3.2 1.3L12 5', 'M3 20h18'],
  stupa: ['M5 21h14', 'M7 21v-2.2h10V21', 'M8.2 18.8c0-4.2 1.7-6.6 3.8-6.6s3.8 2.4 3.8 6.6', 'M12 12.2V6.2', 'M10.6 8.6h2.8'],
  hotel: ['M5 21V5.5h14V21', 'M9 9.5h2M13 9.5h2M9 13.5h2M13 13.5h2', 'M10.5 21v-3.5h3V21', 'M3 21h18'],
  city: ['M7 21V7.5', 'M7 7.5c0-2.2 1.5-3.4 3.6-3.4h1.2', 'M11.8 4.1v2.6h2.6V4.1', 'M15 21v-8.5h5V21', 'M3 21h18'],
  temple: ['M12 3v3', 'M9.6 9 12 6l2.4 3', 'M8.4 13 12 9l3.6 4', 'M7.2 17 12 13l4.8 4', 'M7.2 17v4M16.8 17v4', 'M5 21h14'],
  beach: ['M3 17c2.1 0 2.1-1.6 4.5-1.6s2.4 1.6 4.5 1.6 2.1-1.6 4.5-1.6 2.4 1.6 4.5 1.6', 'M3 21c2.1 0 2.1-1.6 4.5-1.6s2.4 1.6 4.5 1.6 2.1-1.6 4.5-1.6 2.4 1.6 4.5 1.6', 'M16 11.5a3 3 0 1 0-6 0'],
  mountain: ['M2.5 20 9.5 8.5l3.7 6 2.3-3.4L21.5 20Z', 'M8.1 10.8 9.5 12.6l1.4-1.8'],
  home: ['M4 11 12 4.5l8 6.5', 'M6 9.4V20h12V9.4', 'M10 20v-5h4v5'],
  pin: ['M12 21s-6-5.6-6-10.2a6 6 0 0 1 12 0C18 15.4 12 21 12 21Z', 'M12 12.6a1.9 1.9 0 1 0 0-3.8 1.9 1.9 0 0 0 0 3.8Z'],
};
