// Registry foto demo MomKid Hospital (RSIA MomKid, rumah sakit ibu & anak fiktif di Tangerang Selatan). Semua foto asli
// dari Unsplash (Unsplash License, bukan Unsplash+), WebP teroptimasi langsung dari CDN Unsplash, kredit di
// public/assets/templates/photos/CREDITS.md (section "MomKid Hospital"). Hanya dipotong, tanpa blur/inpaint. Orang di
// foto tidak berhubungan dengan nama dokter atau orang tua di demo; foto ruangan bukan ruangan rumah sakit demo.
//
// Konvensi file (kit/photos.ts):
//   hero        → `<kunci>-1920.webp` + `-1280.webp` + `-800.webp` (16:9; subjek di sepertiga kanan untuk latar hero)
//   perjalanan  → `<kunci>-1200.webp` + `-800.webp` (4:3 1200×900)
//   tegak       → `<kunci>-960.webp` + `-800.webp` (4:5 960×1200: laktasi & tur kamar)
//   artikel     → `<kunci>-1200.webp` + `-800.webp` (3:2 1200×800)
//   potret      → `<kunci>-480.webp` + `-240.webp` (testimoni 1:1)
import type { PhotoAsset } from '../shared/assets';
import { definePhotos, type KitPhotoSpec, type PhotoSet } from '../kit/photos';

const DIR = '/assets/templates/photos';

const HERO: readonly KitPhotoSpec[] = [
  ['momkid-hero', 1920, 1080, 'Seorang ibu mencium lembut bayi baru lahir di dekat tirai jendela yang terang'],
];

const BASE = definePhotos({
  scenes: [
    ['momkid-kehamilan', 1200, 900, 'Kedua tangan ibu hamil membentuk hati di atas perut, bergaun merah muda'],
    ['momkid-persalinan', 1200, 900, 'Bayi baru lahir tidur nyenyak di atas selimut rajut berwarna krem'],
    ['momkid-tumbuh', 1200, 900, 'Balita berambut ikal merangkak di lantai dekat mainan warna-warni'],
    ['momkid-laktasi', 960, 1200, 'Ibu duduk bersila di tempat tidur putih sambil menggendong bayinya dan tersenyum'],
    ['momkid-tur-bersalin', 960, 1200, 'Kamar rawat dengan tempat tidur pasien, kursi merah, dan lampu dinding yang hangat'],
    ['momkid-tur-rawat', 960, 1200, 'Kamar rawat berpanel kayu terang dengan dua tempat tidur pasien'],
    ['momkid-tur-bayi', 960, 1200, 'Kamar bayi dengan lemari kayu, boks bayi berselimut, dan hiasan bintang di dinding'],
    ['momkid-tur-menyusui', 960, 1200, 'Kursi goyang kayu di depan jendela besar yang terang dan meja kecil berisi bunga'],
    ['momkid-tur-tunggu', 960, 1200, 'Ruang tunggu dengan sofa krem, kursi berlengan, dan meja bundar berisi majalah'],
    ['momkid-artikel-persalinan', 1200, 800, 'Ibu hamil berkemeja denim memegang perutnya di depan pintu kayu'],
    ['momkid-artikel-tidur', 1200, 800, 'Bayi bertopi rajut abu-abu menguap di samping boneka beruang putih'],
    ['momkid-artikel-mpasi', 1200, 800, 'Mangkuk dan sendok makan bayi berwarna pastel dilihat dari atas'],
  ],
  portraits: [
    ['momkid-portrait-1', 480, 480, 'Potret perempuan berhijab merah muda tersenyum di taman yang hijau'],
    ['momkid-portrait-2', 480, 480, 'Ayah dan ibu memeluk bayi mereka yang sedang tertidur'],
    ['momkid-portrait-3', 480, 480, 'Perempuan berkacamata tersenyum sambil menggendong bayinya yang tertawa'],
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

export const MOMKID_PHOTOS: PhotoSet = Object.freeze({
  src: (key: string) => HERO_BY_KEY.get(key)?.src ?? BASE.src(key),
  asset: (src: string | null | undefined) => heroOf(src) ?? BASE.asset(src),
  alt: (src: string | null | undefined, fallback: string) => heroOf(src)?.alt ?? BASE.alt(src, fallback),
  keys: Object.freeze([...HERO.map((spec) => spec[0]), ...BASE.keys]),
});

/** Path foto demo untuk defaultContent, mis. `momkidPhoto('hero')` → `/assets/templates/photos/momkid-hero-1920.webp`. */
export const momkidPhoto = (name: string): string => MOMKID_PHOTOS.src(`momkid-${name}`);
