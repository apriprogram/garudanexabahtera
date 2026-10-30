// Registry foto demo Pesiar (Pesiar Bali, usaha fiktif). Semua foto asli dari Unsplash (Unsplash License, bukan
// Unsplash+), WebP teroptimasi, kredit di public/assets/templates/photos/CREDITS.md (section "Pesiar"). Dipotong;
// foto bertekstur rapat dihaluskan sangat tipis sebelum dikompres; `pesiar-bandara-*`: stiker "FREE WiFi" di pilar
// dihapus dengan klon tekstur kayu pilar itu sendiri (bukan blur). Grafis (peta Bali, mobil garis, ikon, logo)
// bukan foto: SVG di kode (./scenes.tsx, ./vehicles.tsx, ./marks.tsx).
//
// Konvensi file (kit/photos.ts):
//   hero        → `<kunci>-1920.webp` + `-1280.webp` + `-800.webp` (16:9 1920×1080, latar hero selebar layar)
//   kartu tur   → `<kunci>-960.webp` + `-800.webp` (4:5 960×1200)
//   perhentian  → `<kunci>-1200.webp` + `-800.webp` (4:3 1200×900, kartu foto film & daftar perhentian)
//   bandara     → `<kunci>-1200.webp` + `-800.webp` (16:7 1200×525, kepala kartu formulir)
//   panorama    → `<kunci>-1920.webp` + `-800.webp` (21:6 1920×549, strip di atas footer)
import type { PhotoAsset } from '../shared/assets';
import { definePhotos, type KitPhotoSpec, type PhotoSet } from '../kit/photos';

const DIR = '/assets/templates/photos';

const HERO: readonly KitPhotoSpec[] = [
  ['pesiar-hero', 1920, 1080, 'Sawah terasering hijau di bawah gunung berkabut saat pagi di Bali'],
];

const BASE = definePhotos({
  scenes: [
    ['pesiar-ubud', 960, 1200, 'Pura bergapura bata merah dengan kolam teratai di Ubud'],
    ['pesiar-uluwatu', 960, 1200, 'Pura kecil di puncak tebing karang di atas laut saat sore'],
    ['pesiar-tanahlot', 960, 1200, 'Pura di atas batu karang berpohon yang dikelilingi ombak'],
    ['pesiar-lempuyang', 960, 1200, 'Gapura candi bentar kembar dengan langit biru berawan'],
    ['pesiar-seminyak', 1200, 900, 'Kolam renang vila dengan kursi berjemur dan bangunan beratap genteng'],
    ['pesiar-celuk', 1200, 900, 'Tangan perajin menyolder perhiasan perak di atas balok kayu'],
    ['pesiar-tegallalang', 1200, 900, 'Sawah terasering dan pohon kelapa di Tegallalang'],
    ['pesiar-kintamani', 1200, 900, 'Gunung Batur dan danau di bawahnya dilihat dari punggung bukit Kintamani'],
    ['pesiar-tirtaempul', 1200, 900, 'Pengunjung berdoa di bawah pancuran kolam pura mata air'],
    ['pesiar-senja', 1200, 900, 'Matahari terbenam keemasan di atas pantai berpasir'],
    ['pesiar-bandara', 1200, 525, 'Ruang kedatangan bandara berdinding kaca menghadap taman palem dan jalur penjemputan'],
    ['pesiar-panorama', 1920, 549, 'Langit senja ungu di atas ombak yang memecah di pantai'],
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

export const PESIAR_PHOTOS: PhotoSet = Object.freeze({
  src: (key: string) => HERO_BY_KEY.get(key)?.src ?? BASE.src(key),
  asset: (src: string | null | undefined) => heroOf(src) ?? BASE.asset(src),
  alt: (src: string | null | undefined, fallback: string) => heroOf(src)?.alt ?? BASE.alt(src, fallback),
  keys: Object.freeze([...HERO.map((spec) => spec[0]), ...BASE.keys]),
});

/** Path foto demo untuk defaultContent, mis. `pesiarPhoto('hero')` → `/assets/templates/photos/pesiar-hero-1920.webp`. */
export const pesiarPhoto = (name: string): string => PESIAR_PHOTOS.src(`pesiar-${name}`);
