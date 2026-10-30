// Registry foto demo Lajur (Lajur Trans Wisata, PO sewa bus pariwisata FIKTIF). Semua foto asli dari Unsplash (Unsplash
// License, bukan Unsplash+), WebP hasil kompres Chrome, kredit di public/assets/templates/photos/CREDITS.md (section
// "Lajur"). Suntingan: beberapa foto diambil dari sumber 72–90% lalu diperbesar agar muat batas berkas; pada `sunset`
// tulisan LED, nomor armada, dan logo kecil bus, serta pada `interior` logo bodi dan emblem kursi, ditutup retus klon dari
// permukaan di sekitarnya (bukan blur). Tidak ada nama PO, pelat, atau logo merek yang terbaca. Demo tidak menyebut
// lokasi asli foto.
//
// Konvensi file (kit/photos.ts):
//   hero            → `<kunci>-1920.webp` + `-1280.webp` + `-800.webp` (16:9 1920×1080, latar hero selebar layar)
//   kartu & galeri  → `<kunci>-960.webp` + `-800.webp` (4:5 960×1200: kartu tujuan dan strip galeri)
import type { PhotoAsset } from '../shared/assets';
import { definePhotos, type KitPhotoSpec, type PhotoSet } from '../kit/photos';

const DIR = '/assets/templates/photos';

const HERO: readonly KitPhotoSpec[] = [
  ['lajur-hero', 1920, 1080, 'Jalan beton dua lajur dengan marka putih berkelok di antara bukit hijau menuju teluk di bawah langit mendung'],
];

const BASE = definePhotos({
  scenes: [
    ['lajur-bromo', 960, 1200, 'Kaldera gunung berapi berpasir dengan kerucut gunung di belakangnya saat matahari terbit'],
    ['lajur-jogja', 960, 1200, 'Menara-menara candi batu yang runcing berjajar di bawah langit cerah'],
    ['lajur-dieng', 960, 1200, 'Candi batu tua di dataran tinggi berkabut dengan bukit hijau di belakangnya'],
    ['lajur-bali', 960, 1200, 'Gerbang candi bentar dari bata merah dengan bunga merah di depannya'],
    ['lajur-malang', 960, 1200, 'Kampung beratap warna-warni di tepi sungai dilihat dari udara'],
    ['lajur-pantai', 960, 1200, 'Pantai berbukit karang hijau dengan ombak putih di bawah langit biru'],
    ['lajur-bandung', 960, 1200, 'Asap belerang mengepul dari tebing kawah di atas danau berwarna hijau toska'],
    ['lajur-karimunjawa', 960, 1200, 'Dermaga kayu panjang menjorok ke laut tenang saat matahari terbenam'],
    ['lajur-rombongan-1', 960, 1200, 'Rombongan duduk di bukit berumput sambil memandang gunung berasap di kejauhan'],
    ['lajur-rombongan-2', 960, 1200, 'Rombongan wisatawan berjalan di jalan tanah menuju bukit saat sore yang hangat'],
    ['lajur-interior', 960, 1200, 'Dua kursi bus reclining berlapis kulit cokelat dengan sandaran kaki dan tirai jendela'],
    ['lajur-istirahat', 960, 1200, 'Tangan memegang cangkir kaleng berisi kopi di atas lembah pegunungan berkabut'],
    ['lajur-sunset', 960, 1200, 'Matahari terbenam di tepi jalan raya dengan siluet bus di sisi kanan'],
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

export const LAJUR_PHOTOS: PhotoSet = Object.freeze({
  src: (key: string) => HERO_BY_KEY.get(key)?.src ?? BASE.src(key),
  asset: (src: string | null | undefined) => heroOf(src) ?? BASE.asset(src),
  alt: (src: string | null | undefined, fallback: string) => heroOf(src)?.alt ?? BASE.alt(src, fallback),
  keys: Object.freeze([...HERO.map((spec) => spec[0]), ...BASE.keys]),
});

/** Path foto demo untuk defaultContent, mis. `lajurPhoto('hero')` → `/assets/templates/photos/lajur-hero-1920.webp`. */
export const lajurPhoto = (name: string): string => LAJUR_PHOTOS.src(`lajur-${name}`);
