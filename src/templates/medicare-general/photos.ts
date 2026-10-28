// Registry foto demo MediCare General (RS MediCare General, rumah sakit umum fiktif di Semarang). Semua foto asli dari
// Unsplash (Unsplash License, bukan Unsplash+), WebP teroptimasi, kredit di public/assets/templates/photos/CREDITS.md
// (section "MediCare General"). Tanpa nama/merek rumah sakit yang terbaca, tanpa pasien yang tampak kesakitan, tanpa
// jarum atau darah. Dokter di demo TIDAK diberi foto (inisial saja); orang di foto bukan tokoh di demo.
//
// Konvensi file (kit/photos.ts):
//   hero      → `<kunci>-1920.webp` + `-1280.webp` + `-800.webp` (16:9 1920×1080; layar lebar menutupi seluruh hero,
//               HP pita foto di atas teks, jadi subjek di sepertiga kanan)
//   suasana   → `<kunci>-1200.webp` + `<kunci>-800.webp` (3:2 1200×800)
import type { PhotoAsset } from '../shared/assets';
import { definePhotos, type KitPhotoSpec, type PhotoSet } from '../kit/photos';

const DIR = '/assets/templates/photos';

const HERO: readonly KitPhotoSpec[] = [
  ['medicare-general-hero', 1920, 1080, 'Selasar rumah sakit yang terang dengan dinding kaca melengkung dan kursi tunggu biru muda'],
];

const BASE = definePhotos({
  scenes: [
    ['medicare-general-pendaftaran', 1200, 800, 'Ruang tunggu dengan sofa biru toska dan jendela loket pendaftaran'],
    ['medicare-general-igd', 1200, 800, 'Ambulans putih bergaris oranye dan biru melaju di jalan kota'],
    ['medicare-general-kamar-vvip', 1200, 800, 'Kamar rawat inap dengan ranjang pasien, meja kerja, dan lukisan di dinding'],
    ['medicare-general-kamar-vip', 1200, 800, 'Kamar rawat inap satu ranjang dengan sofa biru untuk penunggu pasien'],
    ['medicare-general-kamar-kelas-1', 1200, 800, 'Kamar rawat inap dengan ranjang pasien dan monitor di dinding biru'],
    ['medicare-general-kamar-kelas-2', 1200, 800, 'Ruang rawat inap dengan tiga ranjang pasien dan lantai biru'],
    ['medicare-general-kamar-kelas-3', 1200, 800, 'Bangsal rawat inap dengan deretan ranjang dan tirai merah muda'],
    ['medicare-general-lab', 1200, 800, 'Laboratorium dengan deretan alat analisis dan seorang petugas berjas putih'],
    ['medicare-general-radiologi', 1200, 800, 'Ruang pemeriksaan dengan mesin pemindai berbentuk cincin dan meja pasien'],
    ['medicare-general-farmasi', 1200, 800, 'Apoteker mengambil kotak obat dari rak di instalasi farmasi'],
    ['medicare-general-gedung', 1200, 800, 'Gedung rumah sakit bata merah dengan kanopi pintu masuk di bawah langit biru'],
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

export const MEDICARE_PHOTOS: PhotoSet = Object.freeze({
  src: (key: string) => HERO_BY_KEY.get(key)?.src ?? BASE.src(key),
  asset: (src: string | null | undefined) => heroOf(src) ?? BASE.asset(src),
  alt: (src: string | null | undefined, fallback: string) => heroOf(src)?.alt ?? BASE.alt(src, fallback),
  keys: Object.freeze([...HERO.map((spec) => spec[0]), ...BASE.keys]),
});

/** Path foto demo untuk defaultContent, mis. `medicarePhoto('hero')` → `/assets/templates/photos/medicare-general-hero-1920.webp`. */
export const medicarePhoto = (name: string): string => MEDICARE_PHOTOS.src(`medicare-general-${name}`);
