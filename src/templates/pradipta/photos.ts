// Registry foto demo Pradipta (landing page SMA negeri; nama "SMA Negeri 1 Purbolinggo" hanya contoh, data demo fiktif).
// Semua foto asli dari Unsplash (Unsplash License, bukan Unsplash+), WebP teroptimasi, kredit di
// public/assets/templates/photos/CREDITS.md (section "Pradipta"). Kegiatan sekolah di Indonesia: belajar di halaman,
// upacara, tari tradisional, voli pasir, futsal, paduan suara, Pramuka, Paskibra, praktikum, gamelan. Papan nama, badge
// bertulisan, tulisan di kaus, poster, dan coretan nama dikaburkan; beberapa foto bertekstur padat diberi penghalusan
// ringan agar tiap varian ≤ 140 KB. Orang di foto tidak berhubungan dengan nama fiktif di demo; karena itu kepala sekolah
// dan guru di demo tampil berinisial, tanpa potret wajah. Foto TIDAK diubah ke SVG (foto sebagai SVG menjadi berkas
// megabyte), jadi disimpan WebP + srcset.
//
// Konvensi file (kit/photos.ts):
//   slide hero   → `<kunci>-1920.webp` + `-1280.webp` + `-800.webp` (16:9 1920×1080; latar slider: layar lebar memakai
//                  1920/1280, HP & tablet 1280/1920 karena foto menutupi wadah 6:5 / 16:10; 800 untuk thumbnail slide)
//   suasana      → `<kunci>-<lebar>.webp` + `<kunci>-800.webp` (tegak 4:5 960×1200; mendatar 4:3 1200×900 /
//                  3:2 1200×800)
//   kartu ekskul → `<kunci>-800.webp` saja (4:3 800×600)
import type { PhotoAsset } from '../shared/assets';
import { definePhotos, type KitPhotoSpec, type PhotoSet } from '../kit/photos';

const DIR = '/assets/templates/photos';

const HERO: readonly KitPhotoSpec[] = [
  ['pradipta-hero-1', 1920, 1080, 'Guru berkerudung tersenyum di antara murid berseragam putih abu-abu yang duduk di halaman sekolah'],
  ['pradipta-hero-2', 1920, 1080, 'Barisan murid dan petugas pengibar bendera mengikuti upacara di lapangan sekolah di bawah langit biru'],
  ['pradipta-hero-3', 1920, 1080, 'Tiga siswi berkostum tari tradisional dengan selendang kuning tersenyum sebelum tampil'],
  ['pradipta-hero-4', 1920, 1080, 'Murid berkaus hijau tosca melompat memukul dan membendung bola di lapangan voli pasir'],
];

const BASE = definePhotos({
  scenes: [
    ['pradipta-profil', 960, 1200, 'Empat murid berseragam olahraga bercengkerama di bawah pohon mangga di tepi sawah'],
    ['pradipta-sains', 1200, 900, 'Murid menimbang sampel sayuran dengan timbangan digital lalu memotretnya untuk catatan praktikum'],
    ['pradipta-sosial', 1200, 900, 'Murid laki-laki berseragam batik tertawa sambil berdiskusi bersama teman di ruang kelas'],
    ['pradipta-bahasa', 1200, 900, 'Pemateri berbatik berbicara dengan mikrofon di depan murid berseragam putih di aula'],
    ['pradipta-berita-1', 1200, 800, 'Pelajar berbatik menyampaikan pendapat dengan mikrofon di depan peserta yang menyimak'],
    ['pradipta-berita-2', 1200, 800, 'Murid berseragam putih mengerjakan simulasi tes lewat ponsel di meja kelas'],
    ['pradipta-berita-3', 1200, 800, 'Murid berseragam batik belajar menganyam bersama dalam kegiatan kokurikuler'],
    ['pradipta-berita-4', 1200, 800, 'Murid berkemeja putih berkalung tanda peserta tersenyum saat mengikuti pelatihan'],
    ['pradipta-galeri-1', 1200, 900, 'Paduan suara murid berseragam putih abu-abu berlatih bersama dirigen di taman sekolah'],
    ['pradipta-galeri-2', 1200, 900, 'Dua murid belajar di meja perpustakaan yang terang dilihat dari lantai atas'],
    ['pradipta-galeri-3', 1200, 900, 'Anggota Pramuka putri bertopi cokelat memegang tongkat merah dalam barisan'],
    ['pradipta-galeri-4', 1200, 900, 'Siswi berkebaya memainkan gamelan di atas panggung pentas seni sekolah'],
  ],
});

/**
 * Foto kartu ekstrakurikuler: SATU varian 800×600 (kartu selebar ±300px; hemat anggaran 2,5 MB). Tiap kartu berfoto
 * sendiri, tidak memakai ulang foto slide hero.
 */
const CARDS: readonly KitPhotoSpec[] = [
  ['pradipta-ekskul-pramuka', 800, 600, 'Tiga anggota Pramuka putri berseragam cokelat dan bertopi hitam berdiri dalam barisan'],
  ['pradipta-ekskul-paskibra', 800, 600, 'Bendera Merah Putih berkibar di ujung tiang dengan latar langit biru berawan'],
  ['pradipta-ekskul-tari', 800, 600, 'Siswi berbusana adat dan bermahkota emas membawa cerana saat menarikan tari persembahan'],
  ['pradipta-ekskul-voli', 800, 600, 'Dua murid berkaus biru bermain futsal di lapangan semen sekolah yang teduh'],
];

/** Slide hero: srcset 800 / 1280 / 1920. */
const heroAsset = ([key, width, height, alt]: KitPhotoSpec): PhotoAsset => ({
  src: `${DIR}/${key}-${width}.webp`,
  width,
  height,
  srcSet: `${DIR}/${key}-800.webp 800w, ${DIR}/${key}-1280.webp 1280w, ${DIR}/${key}-${width}.webp ${width}w`,
  alt,
});

/** Kartu: satu berkas `<kunci>-800.webp`. */
const cardAsset = ([key, width, height, alt]: KitPhotoSpec): PhotoAsset => ({
  src: `${DIR}/${key}-${width}.webp`,
  width,
  height,
  srcSet: `${DIR}/${key}-${width}.webp ${width}w`,
  alt,
});

const HERO_BY_KEY = new Map([...HERO.map((spec) => [spec[0], heroAsset(spec)] as const), ...CARDS.map((spec) => [spec[0], cardAsset(spec)] as const)]);
const HERO_BY_SRC = new Map(Array.from(HERO_BY_KEY.values(), (asset) => [asset.src, asset] as const));

const clean = (src: string | null | undefined) => {
  const value = (src || '').trim().replace(/[?#].*$/, '');
  return value && !value.startsWith('/') ? `/${value}` : value;
};

const heroOf = (src: string | null | undefined): PhotoAsset | null => HERO_BY_SRC.get(clean(src)) ?? null;

export const PRADIPTA_PHOTOS: PhotoSet = Object.freeze({
  src: (key: string) => HERO_BY_KEY.get(key)?.src ?? BASE.src(key),
  asset: (src: string | null | undefined) => heroOf(src) ?? BASE.asset(src),
  alt: (src: string | null | undefined, fallback: string) => heroOf(src)?.alt ?? BASE.alt(src, fallback),
  keys: Object.freeze([...HERO.map((spec) => spec[0]), ...CARDS.map((spec) => spec[0]), ...BASE.keys]),
});

/** Path foto demo untuk defaultContent, mis. `pradiptaPhoto('hero-1')` → `/assets/templates/photos/pradipta-hero-1-1920.webp`. */
export const pradiptaPhoto = (name: string): string => PRADIPTA_PHOTOS.src(`pradipta-${name}`);
