// Registry foto demo HealthLink (layanan telemedicine fiktif di Yogyakarta). Semua foto asli dari Unsplash (Unsplash
// License, bukan Unsplash+; dicek di halaman foto 2026-10-28), dipotong dan dikompres ke WebP lewat CDN Unsplash.
// Kredit: public/assets/templates/photos/CREDITS.md (section "HealthLink"). Tidak ada foto yang diberi nama dokter
// fiktif: dokter di template tampil dengan inisial, bukan foto.
//
// Konvensi file (kit/photos.ts):
//   hero      → `<kunci>-1920.webp` + `-1280.webp` + `-800.webp` (16:9; subjek di kanan tengah karena kartu aplikasi
//               menutupi sisi kiri di layar lebar, dan foto HP dipotong hampir persegi di atas kartu)
//   tegak 4:5 → `<kunci>-960.webp` + `-800.webp` (960×1200)
//   kartu 4:3 → `<kunci>-1200.webp` + `-800.webp` (1200×900)
import type { PhotoAsset } from '../shared/assets';
import { definePhotos, type KitPhotoSpec, type PhotoSet } from '../kit/photos';

const DIR = '/assets/templates/photos';

const HERO: readonly KitPhotoSpec[] = [
  ['healthlink-hero', 1920, 1080, 'Perempuan tersenyum memegang ponsel di dapur rumah yang terang dengan laptop di meja'],
];

const BASE = definePhotos({
  scenes: [
    ['healthlink-video', 960, 1200, 'Dokter berjas putih melakukan panggilan video dengan pasien lewat laptop di meja kerja'],
    ['healthlink-apotek', 1200, 900, 'Apoteker berjas putih tersenyum mengambil kotak obat dari rak apotek'],
    ['healthlink-kurir', 1200, 900, 'Kurir berhelm mengendarai skuter dengan kotak pengantaran putih di jalan kota'],
    ['healthlink-pengingat', 1200, 900, 'Pasangan lansia tersenyum melihat layar ponsel bersama di ruang keluarga'],
    ['healthlink-rs-1', 1200, 900, 'Kamar rawat inap terang berisi dua tempat tidur pasien dan tirai hijau toska'],
    ['healthlink-rs-2', 1200, 900, 'Dua petugas laboratorium berjas putih bekerja dengan alat dan komputer'],
    ['healthlink-rs-3', 1200, 900, 'Ruang praktik dokter gigi yang bersih dengan kursi periksa modern'],
    ['healthlink-rs-4', 1200, 900, 'Ruang tunggu rumah sakit dengan deretan kursi hijau di dekat jendela besar'],
    ['healthlink-unduh', 960, 1200, 'Tangan memegang ponsel berlayar putih saat bersantai di sofa rumah'],
    ['healthlink-bantuan', 1200, 900, 'Petugas layanan pelanggan bermikrofon kepala tersenyum di depan komputer'],
    ['healthlink-keluarga', 1200, 900, 'Keluarga kecil makan bersama di meja makan rumah sambil tersenyum'],
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

export const HEALTHLINK_PHOTOS: PhotoSet = Object.freeze({
  src: (key: string) => HERO_BY_KEY.get(key)?.src ?? BASE.src(key),
  asset: (src: string | null | undefined) => heroOf(src) ?? BASE.asset(src),
  alt: (src: string | null | undefined, fallback: string) => heroOf(src)?.alt ?? BASE.alt(src, fallback),
  keys: Object.freeze([...HERO.map((spec) => spec[0]), ...BASE.keys]),
});

/** Path foto demo untuk defaultContent, mis. `healthlinkPhoto('hero')` → `/assets/templates/photos/healthlink-hero-1920.webp`. */
export const healthlinkPhoto = (name: string): string => HEALTHLINK_PHOTOS.src(`healthlink-${name}`);
