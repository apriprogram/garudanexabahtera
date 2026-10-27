// Registry foto demo Nawasena (landing page SMA negeri; nama "SMA Negeri 1 Purbolinggo" hanya contoh, data demo fiktif).
// Semua foto asli dari Unsplash (Unsplash License, bukan Unsplash+), WebP teroptimasi, kredit di
// public/assets/templates/photos/CREDITS.md (section "Nawasena"). Sebagian besar kegiatan sekolah di Indonesia (salam pagi
// kepada guru, kelas, pentas budaya, pramuka, upacara, kegiatan OSIS, berkebun); beberapa foto netral (lab, perpustakaan,
// lapangan, gajah) diambil di luar Indonesia atau tidak diketahui tempatnya dan demo tidak menyebut tempatnya. Label nama
// murid, lencana sekolah, spanduk bernama sekolah, logo penerbit, dan tulisan kaus dikaburkan; foto bertekstur padat diberi
// penghalusan ringan agar tiap varian ≤ 140 KB. Orang di foto tidak berhubungan dengan nama fiktif di demo; karena itu sambutan kepala sekolah di demo
// TIDAK memakai foto wajah (papan monogram), sama seperti kartu guru dan alumni yang memakai inisial. Foto TIDAK diubah ke
// SVG (foto sebagai SVG menjadi berkas megabyte), jadi disimpan WebP + srcset.
//
// Konvensi file (kit/photos.ts):
//   slide hero   → `<kunci>-1920.webp` + `-1280.webp` + `-800.webp` (16:9 1920×1080; latar slider selebar layar)
//   suasana      → `<kunci>-<lebar>.webp` + `<kunci>-800.webp` (tegak 4:5 960×1200; mendatar 4:3 1200×900 /
//                  3:2 1200×800)
import type { PhotoAsset } from '../shared/assets';
import { definePhotos, type KitPhotoSpec, type PhotoSet } from '../kit/photos';

const DIR = '/assets/templates/photos';

const HERO: readonly KitPhotoSpec[] = [
  ['nawasena-hero-1', 1920, 1080, 'Murid berseragam putih abu-abu menyalami guru berbatik di depan gedung sekolah pada pagi hari'],
  ['nawasena-hero-2', 1920, 1080, 'Murid berseragam putih mengerjakan tugas lewat ponsel di bangku kelas'],
  ['nawasena-hero-3', 1920, 1080, 'Dua penari berkain batik dan berselendang merah tampil di depan murid pada acara sekolah'],
  ['nawasena-hero-4', 1920, 1080, 'Barisan murid berseragam pramuka cokelat dengan setangan leher merah putih berlatih di halaman'],
];

const BASE = definePhotos({
  scenes: [
    ['nawasena-profil', 1200, 800, 'Gedung sekolah bertingkat tiga mengelilingi lapangan olahraga hijau di halaman sekolah'],
    ['nawasena-program-sains', 1200, 900, 'Deretan mikroskop di atas meja hitam laboratorium biologi'],
    ['nawasena-program-sosial', 1200, 900, 'Murid berkacamata menyampaikan pendapat kepada temannya sambil duduk di halaman'],
    ['nawasena-program-bahasa', 1200, 900, 'Lima siswi berkerudung biru muda membaca buku cerita bersama'],
    ['nawasena-berita-1', 1200, 800, 'Murid berkemeja putih bersorak dan berswafoto bersama di lapangan'],
    ['nawasena-berita-2', 1200, 800, 'Murid berseragam putih abu-abu mengerjakan soal lewat ponsel di ruang kelas'],
    ['nawasena-berita-3', 1200, 800, 'Lima murid berkostum tari merah dan berhiasan kepala tersenyum di depan latar panggung bergambar laut'],
    ['nawasena-berita-4', 1200, 800, 'Induk gajah dan anaknya berjalan di antara pepohonan hutan'],
    ['nawasena-fasilitas-lab', 1200, 900, 'Labu kaca berisi larutan merah, biru, dan hijau di meja laboratorium'],
    ['nawasena-fasilitas-perpustakaan', 1200, 900, 'Rak buku bertingkat dan meja baca bundar di perpustakaan yang terang'],
    ['nawasena-fasilitas-lapangan', 1200, 900, 'Lapangan bola voli merah bergaris putih dilihat dari atas'],
    ['nawasena-galeri-1', 960, 1200, 'Petugas pengibar bendera bersarung tangan putih memegang bendera merah putih'],
    ['nawasena-galeri-2', 1200, 800, 'Murid berseragam batik biru dan bawahan abu-abu tersenyum bersama pembina yang memegang bingkisan'],
    ['nawasena-galeri-3', 1200, 900, 'Guru dan tenaga kependidikan duduk di kursi kayu merah di halaman sekolah saat acara'],
    ['nawasena-galeri-4', 1200, 900, 'Murid memasang tali di atas bedengan bermulsa saat praktik berkebun di sekolah'],
  ],
});

/** Slide hero: srcset 800 / 1280 / 1920. */
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

export const NAWASENA_PHOTOS: PhotoSet = Object.freeze({
  src: (key: string) => HERO_BY_KEY.get(key)?.src ?? BASE.src(key),
  asset: (src: string | null | undefined) => heroOf(src) ?? BASE.asset(src),
  alt: (src: string | null | undefined, fallback: string) => heroOf(src)?.alt ?? BASE.alt(src, fallback),
  keys: Object.freeze([...HERO.map((spec) => spec[0]), ...BASE.keys]),
});

/** Path foto demo untuk defaultContent, mis. `nawasenaPhoto('hero-1')` → `/assets/templates/photos/nawasena-hero-1-1920.webp`. */
export const nawasenaPhoto = (name: string): string => NAWASENA_PHOTOS.src(`nawasena-${name}`);
