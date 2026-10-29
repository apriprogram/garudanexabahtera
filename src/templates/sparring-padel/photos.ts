// Registry foto demo Sparring Padel (klub padel fiktif di Kemang, Jakarta Selatan). Semua foto asli dari Unsplash
// (Unsplash License, bukan Unsplash+), WebP teroptimasi, kredit di public/assets/templates/photos/CREDITS.md (section
// "Sparring Padel"). Merek yang terbaca (muka raket, spanduk, sablon kaus/celana, bola) dikaburkan saat dipotong; muka
// raket di hero dan Court 3–4 ditutup bidang raket polos gelap berlubang (tidak tampak seperti cakram abu-abu). Foto
// turnamen, smash, dan servis memakai kunci `-v2`: mereknya dihapus dengan retus klon (tanpa blur); nama baru karena
// Cloudflare menyimpan tiap URL gambar 30 hari, file lama tetap ada untuk konten situs yang masih menautnya.
//
// Konvensi file (kit/photos.ts):
//   hero          → `<kunci>-1920.webp` + `-1280.webp` + `-800.webp` (16:9 1920×1080; pemain di sepertiga kanan, jadi
//                   teks di kiri; HP memotong tegak di sekitar pemain lewat object-position)
//   lapangan/galeri mendatar → `-1200.webp` + `-800.webp` (3:2 1200×800)
//   tegak         → `-960.webp` + `-800.webp` (4:5 960×1200)
//   komunitas     → `-1600.webp` + `-800.webp` (16:9 1600×900)
import type { PhotoAsset } from '../shared/assets';
import { definePhotos, type KitPhotoSpec, type PhotoSet } from '../kit/photos';

const DIR = '/assets/templates/photos';

const HERO: readonly KitPhotoSpec[] = [
  ['sparring-padel-hero', 1920, 1080, 'Pemain padel perempuan memukul bola rendah di lapangan biru yang gelap'],
];

const BASE = definePhotos({
  scenes: [
    ['sparring-padel-court-panorama', 1200, 800, 'Net dan lantai rumput sintetis biru di lapangan padel indoor'],
    ['sparring-padel-court-classic', 1200, 800, 'Pemain padel pria bersiap memukul bola di lapangan indoor biru'],
    ['sparring-padel-court-open', 1200, 800, 'Lapangan padel outdoor biru berdinding kaca dan jaring di siang hari'],
    ['sparring-padel-court-rooftop', 1200, 800, 'Lapangan padel merah beratap membran di atap gedung kota'],
    ['sparring-padel-match-v2', 960, 1200, 'Empat pemain padel bersalaman di net setelah pertandingan'],
    ['sparring-padel-rental', 960, 1200, 'Bola padel kuning di lantai biru dengan bayangan jaring'],
    ['sparring-padel-night', 1600, 900, 'Deretan lapangan padel biru dilihat dari udara pada malam hari'],
    ['sparring-padel-galeri-smash-v2', 960, 1200, 'Pemain padel melompat untuk smash di lapangan indoor'],
    ['sparring-padel-galeri-serve-v2', 960, 1200, 'Pemain padel melempar bola untuk servis di depan net'],
    ['sparring-padel-galeri-rally', 960, 1200, 'Gerak kabur pemain padel berlari mengejar bola di lapangan biru'],
    ['sparring-padel-galeri-blur', 1200, 800, 'Pemain padel bergerak cepat di lapangan indoor pada malam hari'],
    ['sparring-padel-galeri-mabar', 1200, 800, 'Dua pemain padel berdiri di dekat net dengan raket dan bola'],
    ['sparring-padel-galeri-bola', 1200, 800, 'Bola padel berserakan di lapangan biru dekat net'],
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

export const SPARRING_PHOTOS: PhotoSet = Object.freeze({
  src: (key: string) => HERO_BY_KEY.get(key)?.src ?? BASE.src(key),
  asset: (src: string | null | undefined) => heroOf(src) ?? BASE.asset(src),
  alt: (src: string | null | undefined, fallback: string) => heroOf(src)?.alt ?? BASE.alt(src, fallback),
  keys: Object.freeze([...HERO.map((spec) => spec[0]), ...BASE.keys]),
});

/** Path foto demo untuk defaultContent, mis. `sparringPhoto('hero')` → `/assets/templates/photos/sparring-padel-hero-1920.webp`. */
export const sparringPhoto = (name: string): string => SPARRING_PHOTOS.src(`sparring-padel-${name}`);
