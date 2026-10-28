// Registry foto demo SmashHall (GOR SmashHall, GOR & klub badminton FIKTIF di Bandung). Semua foto asli dari Unsplash
// (Unsplash License, bukan Unsplash+), WebP teroptimasi, kredit di public/assets/templates/photos/CREDITS.md (section
// "SmashHall"). Logo merek, bendera, dan papan tulisan di foto hero & anak dihapus dengan retus klon (tanpa noda blur);
// di foto lain tulisan spanduk/logo yang masih terbaca dikaburkan saat dipotong. Foto hero dicerminkan agar pemain
// berada di sisi kanan (teks hero di kiri).
//
// Konvensi file (kit/photos.ts):
//   hero          → `<kunci>-1920.webp` + `-1280.webp` + `-800.webp` (16:9 1920×1080)
//   kartu 4:3     → `<kunci>-1200.webp` + `-800.webp` (1200×900): fasilitas, akademi, toko
//   galeri 3:2    → `<kunci>-1200.webp` + `-800.webp` (1200×800); lebar 16:9 `-1600` + `-800` (1600×900)
import type { PhotoAsset } from '../shared/assets';
import { definePhotos, type KitPhotoSpec, type PhotoSet } from '../kit/photos';

const DIR = '/assets/templates/photos';

const HERO: readonly KitPhotoSpec[] = [
  ['smashhall-hero', 1920, 1080, 'Pemain bulu tangkis berkaus putih menjangkau kok dengan langkah lebar di lapangan hijau yang terang'],
];

const BASE = definePhotos({
  scenes: [
    ['smashhall-lapangan', 1200, 900, 'Deretan lapangan bulu tangkis indoor berlantai biru dengan net terpasang di gedung berdinding biru muda'],
    ['smashhall-anak', 1200, 900, 'Dua anak laki-laki memegang raket bersiap bermain bulu tangkis di lapangan hijau'],
    ['smashhall-remaja', 1200, 900, 'Remaja putri berkacamata menjangkau kok dengan raket di lapangan bulu tangkis indoor'],
    ['smashhall-dewasa', 1200, 900, 'Empat orang dewasa bermain ganda bulu tangkis di lapangan biru dalam gedung'],
    ['smashhall-kejuaraan', 1200, 900, 'Gedung olahraga berlantai biru muda dengan beberapa lapangan bulu tangkis saat pertandingan berlangsung'],
    ['smashhall-raket', 1200, 900, 'Raket bulu tangkis oranye dan tiga kok putih di atas permukaan hijau'],
    ['smashhall-kok', 1200, 900, 'Tiga kok bulu tangkis putih dengan pita hijau dilihat dari dekat'],
    ['smashhall-grip', 1200, 900, 'Gulungan grip raket berwarna biru di atas latar abu-abu muda'],
    ['smashhall-sepatu', 1200, 900, 'Sepasang sepatu olahraga indoor putih dengan sol karet berwarna madu'],
    ['smashhall-galeri-smash', 1600, 900, 'Pemain bulu tangkis melompat tinggi untuk smash di lapangan indoor yang gelap'],
    ['smashhall-galeri-raket', 1200, 800, 'Dua pemain muda di lapangan hijau terlihat dari balik bingkai raket'],
    ['smashhall-galeri-net', 1200, 800, 'Kok putih tersangkut di bibir net dengan lapangan biru di latar belakang'],
    ['smashhall-galeri-latihan', 1200, 800, 'Pemain pria menjangkau kok di atas kepala saat latihan di gedung bulu tangkis'],
    ['smashhall-galeri-senar', 1200, 800, 'Tangan menggenggam raket bulu tangkis merah di atas lantai kayu lapangan'],
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

export const SMASHHALL_PHOTOS: PhotoSet = Object.freeze({
  src: (key: string) => HERO_BY_KEY.get(key)?.src ?? BASE.src(key),
  asset: (src: string | null | undefined) => heroOf(src) ?? BASE.asset(src),
  alt: (src: string | null | undefined, fallback: string) => heroOf(src)?.alt ?? BASE.alt(src, fallback),
  keys: Object.freeze([...HERO.map((spec) => spec[0]), ...BASE.keys]),
});

/** Path foto demo untuk defaultContent, mis. `smashhallPhoto('hero')` → `/assets/templates/photos/smashhall-hero-1920.webp`. */
export const smashhallPhoto = (name: string): string => SMASHHALL_PHOTOS.src(`smashhall-${name}`);
