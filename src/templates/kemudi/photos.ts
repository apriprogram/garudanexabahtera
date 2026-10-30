// Registry foto demo Kemudi (Kemudi Rent Car, rental mobil fiktif). Semua foto asli dari Unsplash (Unsplash License,
// bukan Unsplash+), WebP teroptimasi, kredit di public/assets/templates/photos/CREDITS.md (section "Kemudi").
// Suntingan: hero dipotong (mobil sedikit di kanan tengah) dan hutan di luar mobil diberi blur halus (tilt-shift) agar
// ringan; foto cuci mobil diberi blur halus di luar spons; logo pada kunci mobil disamarkan; rambu batas kecepatan di
// foto ulasan dihapus (diklon dari area di dekatnya); foto jalan kota dipotong tanpa papan nama gedung. Tidak ada merek,
// logo, papan nama, atau pelat nomor yang terbaca. Foto tidak semuanya diambil di Bandung; demo tidak menyebut lokasi
// asli foto.
// Mobil di kartu armada, film, dan peta adalah ilustrasi SVG (./vehicles.tsx, ./scenes.tsx), bukan foto.
//
// Konvensi file (kit/photos.ts):
//   hero        → `<kunci>-1920.webp` + `-1280.webp` + `-800.webp` (16:9 1920×1080)
//   foto tegak  → `<kunci>-960.webp` + `-800.webp` (4:5 960×1200: syarat sewa, ulasan)
//   mendatar    → `<kunci>-1200.webp` + `-800.webp` (4:3 1200×900: harga, tanya jawab)
//   zona antar  → `<kunci>-480.webp` + `-240.webp` (1:1, gambar kecil di daftar zona)
import type { PhotoAsset } from '../shared/assets';
import { definePhotos, type KitPhotoSpec, type PhotoSet } from '../kit/photos';

const DIR = '/assets/templates/photos';

const HERO: readonly KitPhotoSpec[] = [['kemudi-hero', 1920, 1080, 'Mobil putih melaju di jalan aspal yang membelah hutan hijau, dilihat dari atas']];

const BASE = definePhotos({
  scenes: [
    ['kemudi-kunci', 960, 1200, 'Tangan menyerahkan kunci mobil ke tangan penyewa di depan mobil putih'],
    ['kemudi-sopir', 960, 1200, 'Tangan pengemudi memegang setir di kabin mobil yang terang'],
    ['kemudi-interior', 1200, 900, 'Kursi mobil berlapis kulit terang di kabin yang bersih'],
    ['kemudi-keluarga', 960, 1200, 'Jalan desa yang teduh di antara pohon pisang dan pepohonan tropis, dilihat dari balik kemudi mobil'],
    ['kemudi-bersih', 1200, 900, 'Tangan mencuci badan mobil dengan spons dan busa sabun'],
  ],
  portraits: [
    ['kemudi-kota', 480, 480, 'Jalan kota lebar dengan lampu jalan berhias dan gedung lama'],
    ['kemudi-stasiun', 480, 480, 'Dinding gedung stasiun berjendela lengkung saat senja'],
    ['kemudi-bandara', 480, 480, 'Koper di ban berjalan pengambilan bagasi di bandara'],
    ['kemudi-lembang', 480, 480, 'Jalan berkelok di antara kebun teh hijau dan perbukitan'],
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

export const KEMUDI_PHOTOS: PhotoSet = Object.freeze({
  src: (key: string) => HERO_BY_KEY.get(key)?.src ?? BASE.src(key),
  asset: (src: string | null | undefined) => heroOf(src) ?? BASE.asset(src),
  alt: (src: string | null | undefined, fallback: string) => heroOf(src)?.alt ?? BASE.alt(src, fallback),
  keys: Object.freeze([...HERO.map((spec) => spec[0]), ...BASE.keys]),
});

/** Path foto demo untuk defaultContent, mis. `kemudiPhoto('hero')` → `/assets/templates/photos/kemudi-hero-1920.webp`. */
export const kemudiPhoto = (name: string): string => KEMUDI_PHOTOS.src(`kemudi-${name}`);
