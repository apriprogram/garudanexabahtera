// Registry foto demo SpecialistPlus (SpecialistPlus Medical Center, pusat klinik spesialis & laboratorium fiktif di
// Medan). Semua foto asli dari Unsplash (Unsplash License, bukan Unsplash+), WebP teroptimasi, kredit di
// public/assets/templates/photos/CREDITS.md (section "SpecialistPlus"). Tulisan merek alat MRI dan ruang kateterisasi
// dikaburkan (blur lokal) saat dipotong; merek di foto CT scan dan lab otomatis dihapus dengan retus klon (tanpa blur,
// kunci `-v2`: Cloudflare menyimpan tiap URL gambar 30 hari, file lama tetap ada). Tanpa pasien dalam keadaan darurat,
// darah, atau jarum.
//
// Konvensi file (kit/photos.ts):
//   hero      → `<kunci>-1920.webp` + `-1280.webp` + `-800.webp` (16:9 1920×1080; foto latar selebar hero)
//   alat/klinik → `<kunci>-1200.webp` + `<kunci>-800.webp` (4:3 1200×900)
//   lobi      → `<kunci>-1200.webp` + `<kunci>-800.webp` (3:2 1200×800)
import type { PhotoAsset } from '../shared/assets';
import { definePhotos, type KitPhotoSpec, type PhotoSet } from '../kit/photos';

const DIR = '/assets/templates/photos';

const HERO: readonly KitPhotoSpec[] = [
  ['specialistplus-hero', 1920, 1080, 'Ruang terapi modern dengan mesin pencitraan putih dan meja pasien di tengah ruangan'],
];

const BASE = definePhotos({
  scenes: [
    ['specialistplus-mri', 1200, 900, 'Mesin MRI di ruang radiologi dengan lampu periksa di langit-langit'],
    ['specialistplus-ct-v2', 1200, 900, 'Petugas radiologi menyiapkan pasien yang berbaring di meja CT scan'],
    ['specialistplus-cathlab', 1200, 900, 'Ruang kateterisasi jantung dengan lengan C, meja pasien, dan deretan monitor'],
    ['specialistplus-mammografi', 1200, 900, 'Petugas tersenyum mendampingi pasien saat pemeriksaan mammografi'],
    ['specialistplus-lab-v2', 1200, 900, 'Alat analisis laboratorium otomatis berpenutup bening dengan layar monitor'],
    ['specialistplus-jantung', 1200, 900, 'Kertas rekaman EKG dengan garis irama jantung di atas kisi biru'],
    ['specialistplus-ortopedi', 1200, 900, 'Model tulang belakang manusia dengan bantalan sendi berwarna kuning dan merah'],
    ['specialistplus-onkologi', 1200, 900, 'Mesin terapi radiasi dan meja pasien di ruang berlantai kayu'],
    ['specialistplus-saraf', 1200, 900, 'Dua dokter mengamati film MRI otak di depan jendela terang'],
    ['specialistplus-paru', 1200, 900, 'Foto rontgen dada yang memperlihatkan tulang rusuk dan kedua paru'],
    ['specialistplus-dalam', 1200, 900, 'Dokter mengukur tekanan darah pasien di meja konsultasi'],
    ['specialistplus-lobi', 1200, 800, 'Lobi gedung yang terang dengan meja resepsionis putih dan pilar tinggi'],
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

export const SPECIALISTPLUS_PHOTOS: PhotoSet = Object.freeze({
  src: (key: string) => HERO_BY_KEY.get(key)?.src ?? BASE.src(key),
  asset: (src: string | null | undefined) => heroOf(src) ?? BASE.asset(src),
  alt: (src: string | null | undefined, fallback: string) => heroOf(src)?.alt ?? BASE.alt(src, fallback),
  keys: Object.freeze([...HERO.map((spec) => spec[0]), ...BASE.keys]),
});

/** Path foto demo untuk defaultContent, mis. `spxPhoto('hero')` → `/assets/templates/photos/specialistplus-hero-1920.webp`. */
export const spxPhoto = (name: string): string => SPECIALISTPLUS_PHOTOS.src(`specialistplus-${name}`);
