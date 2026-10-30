// Registry foto demo Nusaline (PO bus malam fiktif). Semua foto asli dari Unsplash (Unsplash License, bukan Unsplash+),
// WebP teroptimasi, kredit di public/assets/templates/photos/CREDITS.md (section "Nusaline"). Suntingan: kabin eksekutif
// dipotong kiri + tulisan kaca ditutup retus klon dari kaca kosong di bawahnya, pelat mobil di foto kabin malam ditutup
// retus klon dari pintu bagasi di sebelahnya, papan nama toko di foto Tugu Yogyakarta ditutup dengan latar di sekitarnya
// (semuanya retus klon, bukan blur; 2026-10-30) dan tepi kanannya dipotong, kursi Super
// Eksekutif dipotong ke sepasang kursi + lorong (sesuai kelas 2-1; lambang pabrikan di sandaran tangan kursi seberang
// tidak ikut); dua foto dihaluskan sangat ringan agar ringan. Kendaraan, livery, denah kursi, dan kabin tidur (kelas
// Sleeper tanpa foto) di template digambar SVG (./vehicles.tsx), bukan foto.
//
// Konvensi file (kit/photos.ts):
//   hero        → `<kunci>-1920.webp` + `-1280.webp` + `-800.webp` (16:9 1920×1080; latar hero selebar layar)
//   kabin/kelas → `<kunci>-1200.webp` + `-800.webp` (3:2 1200×800)
//   kota & foto kecil → `<kunci>-1000.webp` + `-800.webp` (4:3 1000×750)
import type { PhotoAsset } from '../shared/assets';
import { definePhotos, type KitPhotoSpec, type PhotoSet } from '../kit/photos';

const DIR = '/assets/templates/photos';

const HERO: readonly KitPhotoSpec[] = [
  ['nusaline-hero', 1920, 1080, 'Jejak lampu kendaraan di jalan tol berkelok pada malam hari dengan lampu kota di kaki bukit'],
];

const BASE = definePhotos({
  scenes: [
    ['nusaline-cabin', 1200, 800, 'Kabin bus malam dilihat dari lorong belakang dengan deretan kursi dan jalan raya di depan'],
    ['nusaline-eksekutif', 1200, 800, 'Kabin bus dengan deretan kursi hitam kuning berjajar dua-dua dan tirai di jendela'],
    ['nusaline-premium', 1200, 800, 'Sepasang kursi kulit cokelat yang lebar dengan penutup sandaran putih di samping lorong kabin bus'],
    ['nusaline-snack', 1000, 750, 'Kacang almon dan keripik pisang dalam dua mangkuk kuning di atas selimut abu-abu'],
    ['nusaline-bagasi', 1000, 750, 'Tangan meraih koper hitam di samping koper perak dalam cahaya sore'],
    ['nusaline-jakarta', 1000, 750, 'Simpang susun jalan layang Jakarta saat senja dengan gedung tinggi dan arus kendaraan'],
    ['nusaline-semarang', 1000, 750, 'Gedung bersejarah bermenara kembar di Semarang pada malam hari dengan jendela berlampu kuning'],
    ['nusaline-yogyakarta', 1000, 750, 'Tugu Yogyakarta pada malam hari dengan jejak lampu kendaraan yang melintas'],
    ['nusaline-surabaya', 1000, 750, 'Jembatan di tepi laut Surabaya saat matahari rendah dengan pesepeda di jalurnya'],
    ['nusaline-malang', 1000, 750, 'Tugu di tengah kolam teratai di bawah pepohonan rindang di Kota Malang'],
    ['nusaline-bali', 1000, 750, 'Patung dan air mancur di taman kota Denpasar di bawah langit biru berawan'],
  ],
});

/** Hero selebar layar: srcset 800 / 1280 / 1920. */
const heroAsset = ([key, width, height, alt]: KitPhotoSpec): PhotoAsset => ({
  src: `${DIR}/${key}-${width}.webp`,
  width,
  height,
  srcSet: `${DIR}/${key}-800.webp 800w, ${DIR}/${key}-1280.webp 1280w, ${DIR}/${key}-${width}.webp ${width}w`,
  alt,
});

const HERO_BY_KEY = new Map(HERO.map((spec) => [spec[0], heroAsset(spec)] as const));
const HERO_BY_SRC = new Map(Array.from(HERO_BY_KEY.values(), (asset) => [asset.src, asset] as const));

const clean = (src: string | null | undefined) => {
  const value = (src || '').trim().replace(/[?#].*$/, '');
  return value && !value.startsWith('/') ? `/${value}` : value;
};

const heroOf = (src: string | null | undefined): PhotoAsset | null => HERO_BY_SRC.get(clean(src)) ?? null;

export const NUSALINE_PHOTOS: PhotoSet = Object.freeze({
  src: (key: string) => HERO_BY_KEY.get(key)?.src ?? BASE.src(key),
  asset: (src: string | null | undefined) => heroOf(src) ?? BASE.asset(src),
  alt: (src: string | null | undefined, fallback: string) => heroOf(src)?.alt ?? BASE.alt(src, fallback),
  keys: Object.freeze([...HERO.map((spec) => spec[0]), ...BASE.keys]),
});

/** Path foto demo untuk defaultContent, mis. `nusalinePhoto('hero')` → `/assets/templates/photos/nusaline-hero-1920.webp`. */
export const nusalinePhoto = (name: string): string => NUSALINE_PHOTOS.src(`nusaline-${name}`);
