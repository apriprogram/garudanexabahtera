// Registry foto demo NusaNiaga (PT Arunika Niaga Internasional, importir & distributor fiktif). Semua foto asli dari
// Unsplash (Unsplash License, bukan Unsplash+), WebP teroptimasi, kredit di public/assets/templates/photos/CREDITS.md
// (section "NusaNiaga"). Merek mesin, nama kapal/pelayaran, label crane, dan logo pada baju dikaburkan saat dipotong;
// cetakan ukuran/merek pada seal bearing dikaburkan; foto hero diberi sedikit penghalusan agar muat anggaran ukuran.
//
// Konvensi file (kit/photos.ts):
//   hero tegak  → `<kunci>-1440.webp` + `-1200.webp` + `-800.webp` (4:5 1440×1800; dipotong jadi bilah vertikal oleh CSS)
//   foto 16:10  → `<kunci>-1200.webp` + `<kunci>-800.webp` (1200×750); jangkauan `-1600.webp` + `-800.webp` (1600×1000)
//   potret      → `<kunci>-480.webp` + `<kunci>-240.webp` (testimoni 1:1)
import type { PhotoAsset } from '../shared/assets';
import { definePhotos, type KitPhotoSpec, type PhotoSet } from '../kit/photos';

const DIR = '/assets/templates/photos';

const HERO: KitPhotoSpec = [
  'nusaniaga-hero',
  1440,
  1800,
  'Lorong gudang dengan rak palet tinggi berisi kardus yang tertata rapi',
];

const BASE = definePhotos({
  scenes: [
    ['nusaniaga-resin', 1200, 750, 'Butiran resin plastik putih bertumpuk di atas permukaan gelap'],
    ['nusaniaga-baja', 1200, 750, 'Dua gulungan baja lembaran diikat rantai di atas trailer truk'],
    ['nusaniaga-benang', 1200, 750, 'Gulungan benang industri putih tersusun rapi di rak pabrik tekstil'],
    ['nusaniaga-mesin-injeksi', 1200, 750, 'Deretan mesin injeksi plastik dengan lengan robot di lantai produksi pabrik'],
    ['nusaniaga-cnc', 1200, 750, 'Mesin CNC memotong benda kerja logam dengan semburan cairan pendingin'],
    ['nusaniaga-bearing', 1200, 750, 'Tiga bearing bola dengan seal karet hitam di atas meja putih'],
    ['nusaniaga-gudang', 1200, 750, 'Petugas gudang mencatat pada papan klip'],
    ['nusaniaga-pelabuhan', 1600, 1000, 'Crane kapal mengangkat kontainer dari kapal kargo di pelabuhan pada siang hari'],
    ['nusaniaga-teknisi', 1200, 750, 'Teknisi mengatur panel kontrol mesin CNC'],
  ],
  portraits: [
    ['nusaniaga-portrait-1', 480, 480, 'Potret pria berkaus hitam tersenyum di selasar kantor'],
    ['nusaniaga-portrait-2', 480, 480, 'Potret perempuan berkerudung hitam dan berblazer merah muda tersenyum'],
    ['nusaniaga-portrait-3', 480, 480, 'Potret pria muda berkacamata dan berkemeja kotak-kotak tersenyum ramah'],
  ],
});

/** Hero tegak: srcset 800 / 1200 / 1440. */
const heroAsset = ([key, width, height, alt]: KitPhotoSpec): PhotoAsset => ({
  src: `${DIR}/${key}-${width}.webp`,
  width,
  height,
  srcSet: `${DIR}/${key}-800.webp 800w, ${DIR}/${key}-1200.webp 1200w, ${DIR}/${key}-${width}.webp ${width}w`,
  alt,
});

const HERO_ASSET = heroAsset(HERO);

const clean = (src: string | null | undefined) => {
  const value = (src || '').trim().replace(/[?#].*$/, '');
  return value && !value.startsWith('/') ? `/${value}` : value;
};

const heroOf = (src: string | null | undefined): PhotoAsset | null => (clean(src) === HERO_ASSET.src ? HERO_ASSET : null);

export const NUSANIAGA_PHOTOS: PhotoSet = Object.freeze({
  src: (key: string) => (key === HERO[0] ? HERO_ASSET.src : BASE.src(key)),
  asset: (src: string | null | undefined) => heroOf(src) ?? BASE.asset(src),
  alt: (src: string | null | undefined, fallback: string) => heroOf(src)?.alt ?? BASE.alt(src, fallback),
  keys: Object.freeze([HERO[0], ...BASE.keys]),
});

/** Path foto demo untuk defaultContent, mis. `nusaniagaPhoto('hero')` → `/assets/templates/photos/nusaniaga-hero-1440.webp`. */
export const nusaniagaPhoto = (name: string): string => NUSANIAGA_PHOTOS.src(`nusaniaga-${name}`);
