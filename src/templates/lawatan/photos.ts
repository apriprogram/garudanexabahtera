// Registry foto demo Lawatan (Lawatan Tour & Travel, biro fiktif). Semua foto asli dari Unsplash (Unsplash License, bukan
// Unsplash+), WebP teroptimasi langsung dari CDN Unsplash, kredit di public/assets/templates/photos/CREDITS.md (section
// "Lawatan"). Tanpa blur/inpaint: semua foto hanya dipotong. Tidak ada nama PO bus, livery, atau pelat nomor yang
// terbaca. Foto rombongan tidak semuanya diambil di Indonesia; demo tidak menyebut lokasi asli foto rombongan.
//
// Konvensi file (kit/photos.ts), ukuran sesuai tempat tampilnya (anggaran total ≤ 2,5 MB):
//   hero              → `<kunci>-1920.webp` + `-1280.webp` + `-800.webp` (16:9; latar hero selebar layar, terpotong tegak
//                       di HP lewat object-position)
//   kartu paket       → `<kunci>-1200.webp` + `-800.webp` (4:3 1200×900)
//   kartu pos film &  → `<kunci>-960.webp` + `-800.webp` (4:3 960×720; rombongan-3 3:2 960×640): kartu film ≤ 440px
//   ubin galeri kecil   (≥ 2240px: 680px), ubin galeri 25vw, jadi 960 cukup untuk layar 2×
//   galeri mendatar   → `<kunci>-1200.webp` + `-800.webp` (3:2 1200×800, ubin lebar 50vw)
//   galeri tegak      → `<kunci>-960.webp` + `-800.webp` (4:5 960×1200)
// Tidak ada foto yang tampil dua kali di halaman demo: galeri memakai foto rombongan sendiri (bukan foto paket/film).
import type { PhotoAsset } from '../shared/assets';
import { definePhotos, type KitPhotoSpec, type PhotoSet } from '../kit/photos';

const DIR = '/assets/templates/photos';

const HERO: readonly KitPhotoSpec[] = [
  ['lawatan-hero', 1920, 1080, 'Gunung Bromo, Batok, dan Semeru menjulang di atas lautan kabut saat matahari terbit'],
];

const BASE = definePhotos({
  scenes: [
    ['lawatan-jogja', 1200, 900, 'Kolam dan gerbang bangunan Taman Sari Yogyakarta di bawah langit biru cerah'],
    ['lawatan-bromo', 1200, 900, 'Kawah Bromo dan Gunung Semeru berasap di siang hari dengan kabut di lembah'],
    ['lawatan-bali', 1200, 900, 'Pura Ulun Danu Bratan bertingkat di tepi danau saat cahaya sore keemasan'],
    ['lawatan-bandung', 1200, 900, 'Danau kawah berwarna toska di Kawah Putih dengan pengunjung berjalan di tepiannya'],
    ['lawatan-dieng', 1200, 900, 'Bukit berumput keemasan dan gunung di kejauhan di bawah langit biru'],
    ['lawatan-lombok', 1200, 900, 'Pantai berpasir dengan ombak kecil dan bukit hijau di ujung teluk'],
    ['lawatan-berangkat', 960, 720, 'Penumpang duduk di kursi bus berwarna oranye dengan jendela lebar di sampingnya'],
    ['lawatan-borobudur', 960, 720, 'Stupa batu Candi Borobudur dengan pegunungan berkabut di belakangnya saat fajar'],
    ['lawatan-malioboro', 960, 720, 'Andong berjajar menunggu penumpang di tepi jalan kota Yogyakarta'],
    ['lawatan-prambanan', 960, 720, 'Menara batu kompleks Candi Prambanan di bawah langit biru berawan'],
    ['lawatan-hotel', 960, 720, 'Kamar hotel terang dengan dua ranjang putih dan jendela lebar ke taman'],
    ['lawatan-rombongan-1', 1200, 800, 'Tujuh orang mengangkat tangan menghadap laut di tepi pantai yang cerah'],
    ['lawatan-rombongan-2', 960, 1200, 'Penumpang berkerudung berdiri di dek kapal penyeberangan menghadap laut'],
    ['lawatan-rombongan-3', 960, 640, 'Siluet enam orang melambai di puncak bukit saat matahari terbenam'],
    ['lawatan-rombongan-4', 960, 720, 'Enam orang duduk berangkulan di tembok tepi laut menghadap kereta gantung'],
    ['lawatan-rombongan-5', 960, 720, 'Rombongan wisatawan berfoto bersama di lautan pasir dengan gunung hijau di belakangnya'],
    ['lawatan-rombongan-6', 960, 720, 'Empat pendaki muda berpose di puncak bukit berumput dengan gunung di kejauhan'],
    ['lawatan-rombongan-7', 960, 720, 'Barisan pendaki di puncak gunung menanti matahari terbit dalam kabut pagi'],
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

export const LAWATAN_PHOTOS: PhotoSet = Object.freeze({
  src: (key: string) => HERO_BY_KEY.get(key)?.src ?? BASE.src(key),
  asset: (src: string | null | undefined) => heroOf(src) ?? BASE.asset(src),
  alt: (src: string | null | undefined, fallback: string) => heroOf(src)?.alt ?? BASE.alt(src, fallback),
  keys: Object.freeze([...HERO.map((spec) => spec[0]), ...BASE.keys]),
});

/** Path foto demo untuk defaultContent, mis. `lawatanPhoto('hero')` → `/assets/templates/photos/lawatan-hero-1920.webp`. */
export const lawatanPhoto = (name: string): string => LAWATAN_PHOTOS.src(`lawatan-${name}`);
