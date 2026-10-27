// Registry foto demo Dermaga (PT Lintas Dermaga Nusantara, perusahaan ekspor-impor & freight forwarding fiktif). Semua
// foto asli dari Unsplash (Unsplash License, bukan Unsplash+), WebP teroptimasi, kredit di
// public/assets/templates/photos/CREDITS.md (section "Dermaga"). Nama pelayaran, operator terminal, dan merek alat yang
// masih terbaca dikaburkan (blur) saat dipotong; foto TIDAK diubah ke SVG (WebP + srcset).
//
// Konvensi file (kit/photos.ts):
//   hero          → `<kunci>-1920.webp` + `-1280.webp` + `-800.webp` (16:9 1920×1080; dipotong 21:9 di desktop dan 4:5
//                   di ponsel lewat object-position, jadi crane ada di sepertiga tengah)
//   suasana       → `<kunci>-1200.webp` + `<kunci>-800.webp` (3:2 1200×800); galeri lebar `-1600` + `-800` (16:9 1600×900)
//   potret        → `<kunci>-480.webp` + `<kunci>-240.webp` (testimoni 1:1)
import type { PhotoAsset } from '../shared/assets';
import { definePhotos, type KitPhotoSpec, type PhotoSet } from '../kit/photos';

const DIR = '/assets/templates/photos';

const HERO: readonly KitPhotoSpec[] = [
  ['dermaga-hero', 1920, 1080, 'Deretan crane peti kemas di terminal pelabuhan saat senja dengan lampu dermaga menyala'],
];

const BASE = definePhotos({
  scenes: [
    ['dermaga-tentang', 1200, 800, 'Dua petugas berhelm dan berompi oranye memeriksa data di tablet di lapangan penumpukan kontainer'],
    ['dermaga-fcl', 1200, 800, 'Crane pelabuhan berwarna biru mengangkat satu kontainer di atas dermaga terminal'],
    ['dermaga-konsolidasi', 1200, 800, 'Palet berisi kardus terbungkus plastik tersusun rapi di gudang konsolidasi'],
    ['dermaga-dokumen', 1200, 800, 'Tangan memeriksa dan menandatangani dokumen pengiriman di meja kerja'],
    ['dermaga-sourcing', 1200, 800, 'Tangan mengukur contoh komponen logam dengan jangka sorong digital sebelum pembelian'],
    ['dermaga-inspeksi', 1200, 800, 'Tangan merekatkan lakban pada paket berbungkus kertas cokelat sebelum dikirim'],
    ['dermaga-trucking', 1200, 800, 'Truk pengangkut kontainer melaju di jalan raya berkabut di antara perbukitan hijau'],
    ['dermaga-kapal', 1200, 800, 'Kapal kontainer bermuatan penuh berlayar di laut lepas dilihat dari atas'],
    ['dermaga-galeri-terminal', 1600, 900, 'Crane dermaga, tangki, dan tumpukan kontainer berwarna di terminal tepi laut saat sore'],
    ['dermaga-galeri-forklift', 1200, 800, 'Forklift oranye di gudang dengan rak palet dan tumpukan lembaran papan'],
    ['dermaga-galeri-bolder', 1200, 800, 'Tali tambat kapal terikat pada bolder besi di tepi dermaga'],
    ['dermaga-galeri-kontainer', 1200, 800, 'Dua kontainer merah dan oranye berdiri berdampingan di bawah langit biru'],
    ['dermaga-galeri-tim', 1200, 800, 'Empat anggota tim berdiskusi sambil mencatat dan melihat laptop di kantor'],
  ],
  portraits: [
    ['dermaga-portrait-1', 480, 480, 'Potret pria muda berkaus abu-abu tersenyum dengan latar putih polos'],
    ['dermaga-portrait-2', 480, 480, 'Potret perempuan berkerudung hitam tersenyum dengan latar bunga yang kabur'],
    ['dermaga-portrait-3', 480, 480, 'Potret pria berkacamata dan berjanggut mengenakan kemeja abu-abu bermotif'],
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

export const DERMAGA_PHOTOS: PhotoSet = Object.freeze({
  src: (key: string) => HERO_BY_KEY.get(key)?.src ?? BASE.src(key),
  asset: (src: string | null | undefined) => heroOf(src) ?? BASE.asset(src),
  alt: (src: string | null | undefined, fallback: string) => heroOf(src)?.alt ?? BASE.alt(src, fallback),
  keys: Object.freeze([...HERO.map((spec) => spec[0]), ...BASE.keys]),
});

/** Path foto demo untuk defaultContent, mis. `dermagaPhoto('hero')` → `/assets/templates/photos/dermaga-hero-1920.webp`. */
export const dermagaPhoto = (name: string): string => DERMAGA_PHOTOS.src(`dermaga-${name}`);
