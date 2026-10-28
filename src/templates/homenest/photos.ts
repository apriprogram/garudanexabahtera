// Registry foto demo HomeNest (PT Sarang Hunian Lestari, developer fiktif). Semua foto asli dari Unsplash (Unsplash
// License, bukan Unsplash+), WebP teroptimasi, kredit di public/assets/templates/photos/CREDITS.md (section "HomeNest").
// Tanpa blur/inpaint: hanya dipotong (lembah `sawo` dipotong di kiri, teras `tour-taman` dipotong mendatar dari foto
// tegak). Foto tidak semuanya diambil di Indonesia; demo tidak menyebut lokasi asli foto.
//
// Konvensi file (kit/photos.ts):
//   hero          → `<kunci>-1920.webp` + `-1280.webp` + `-800.webp` (16:9 1920×1080; latar hero selebar layar, terpotong
//                   tegak di HP lewat object-position)
//   kartu rumah   → `<kunci>-1200.webp` + `-800.webp` (4:3 1200×900; tiga dipakai ulang di foto proyek developer)
//   ruang tur     → `<kunci>-1600.webp` + `-800.webp` (3:2 1600×1067)
//   fasilitas     → `<kunci>-960.webp` + `-800.webp` (4:5 960×1200)
import type { PhotoAsset } from '../shared/assets';
import { definePhotos, type KitPhotoSpec, type PhotoSet } from '../kit/photos';

const DIR = '/assets/templates/photos';

const HERO: readonly KitPhotoSpec[] = [
  ['homenest-hero', 1920, 1080, 'Rumah modern berfasad kisi kayu dan dinding batu alam berdiri di atas taman rumput saat sore'],
];

const BASE = definePhotos({
  scenes: [
    ['homenest-kenari', 1200, 900, 'Undakan batu menuju pintu masuk rumah berdinding batu alam dengan kisi kayu di atasnya'],
    ['homenest-palem', 1200, 900, 'Rumah dua lantai berdinding kayu dengan atap pelana dan pohon kamboja di halaman'],
    ['homenest-laras', 1200, 900, 'Deretan townhouse tiga lantai berwarna krem di balik pepohonan taman perumahan'],
    ['homenest-jati', 1200, 900, 'Rumah beratap genteng dengan tangga bata dan pohon berbunga kuning di tepi jalan menanjak'],
    ['homenest-rasamala', 1200, 900, 'Hamparan lahan hijau dengan rumah kecil dan gunung di kejauhan di bawah langit cerah'],
    ['homenest-nara', 1200, 900, 'Rumah modern dua lantai dengan kisi kayu, pagar hitam, dan dinding roster putih'],
    ['homenest-lanai', 1200, 900, 'Rumah modern dua lantai berdinding kayu dan batu dengan carport pergola dan halaman rumput'],
    ['homenest-sawo', 1200, 900, 'Lembah hijau berpohon kelapa dengan jalan setapak menurun dan perbukitan saat pagi'],
    ['homenest-saga', 1200, 900, 'Rumah beratap ilalang dengan kolam renang biru dan taman tropis yang rimbun'],
    ['homenest-tour-keluarga', 1600, 1067, 'Ruang keluarga berlangit-langit tinggi dengan sofa putih, kursi kayu, dan dinding panel kayu'],
    ['homenest-tour-dapur', 1600, 1067, 'Meja makan kayu dengan kursi berbantal di ruang berdinding kaca yang menghadap kebun rimbun'],
    ['homenest-tour-kamar', 1600, 1067, 'Kamar tidur terang berdinding kayu muda dengan tirai putih dan ranjang berselimut krem'],
    ['homenest-tour-taman', 1600, 1067, 'Teras kayu beratap anyaman dengan kursi rotan, ayunan gantung, dan hammock di tepi taman'],
    ['homenest-fasilitas', 960, 1200, 'Pohon palem tinggi berjajar di taman rumput dengan jalan setapak batu di bawah langit biru'],
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

export const HOMENEST_PHOTOS: PhotoSet = Object.freeze({
  src: (key: string) => HERO_BY_KEY.get(key)?.src ?? BASE.src(key),
  asset: (src: string | null | undefined) => heroOf(src) ?? BASE.asset(src),
  alt: (src: string | null | undefined, fallback: string) => heroOf(src)?.alt ?? BASE.alt(src, fallback),
  keys: Object.freeze([...HERO.map((spec) => spec[0]), ...BASE.keys]),
});

/** Path foto demo untuk defaultContent, mis. `homenestPhoto('hero')` → `/assets/templates/photos/homenest-hero-1920.webp`. */
export const homenestPhoto = (name: string): string => HOMENEST_PHOTOS.src(`homenest-${name}`);
