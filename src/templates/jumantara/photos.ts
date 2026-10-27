// Registry foto demo Jumantara (contoh: SMA Negeri 1 Purbolinggo; orang, berita, dan angka di demo fiktif). Semua foto
// asli dari Unsplash (Unsplash License, bukan Unsplash+), dipotong lewat CDN Unsplash lalu disimpan sebagai WebP +
// srcset; kredit di public/assets/templates/photos/CREDITS.md (section "Jumantara"). Papan nama, label nama di seragam,
// lencana, dan logo penerbit yang terbaca dikaburkan; beberapa foto diberi penghalusan ringan agar muat anggaran ukuran.
// Orang di foto tidak berhubungan dengan nama kepala sekolah, guru, atau alumni di demo; karena itu sambutan kepala
// sekolah di demo tidak memakai foto.
//
// Konvensi file (kit/photos.ts):
//   slide hero → `<kunci>-1920.webp` + `-1280.webp` + `-800.webp` (16:9 1920×1080; hero selebar layar)
//   suasana    → `<kunci>-<lebar>.webp` + `<kunci>-800.webp` (tegak 4:5 960×1200; mendatar 3:2 1200×800)
import type { PhotoAsset } from '../shared/assets';
import { definePhotos, type KitPhotoSpec, type PhotoSet } from '../kit/photos';

const DIR = '/assets/templates/photos';

const HERO: readonly KitPhotoSpec[] = [
  ['jumantara-hero-1', 1920, 1080, 'Dua siswi dengan rok abu-abu berjalan di halaman gedung sekolah yang berhias umbul-umbul merah putih'],
  ['jumantara-hero-2', 1920, 1080, 'Tiga siswi berkemeja putih membaca buku pelajaran bersama di teras sekolah'],
  ['jumantara-hero-3', 1920, 1080, 'Penari remaja berkostum hijau dan kuning dengan mahkota dan busur menari bersama di lapangan'],
  ['jumantara-hero-4', 1920, 1080, 'Barisan petugas upacara berseragam putih dan berpeci hitam memberi hormat di lapangan'],
];

const BASE = definePhotos({
  scenes: [
    ['jumantara-profil', 960, 1200, 'Gedung sekolah tiga lantai beratap genteng dengan selasar biru di bawah langit cerah'],
    ['jumantara-berita-1', 1200, 800, 'Murid berdiskusi mengelompokkan kertas catatan warna-warni di meja bersama guru pendamping'],
    ['jumantara-berita-2', 1200, 800, 'Siswi berkerudung putih mengerjakan soal di depan deretan komputer laboratorium'],
    ['jumantara-berita-3', 1200, 800, 'Lima penari remaja berkebaya dan berkain batik menari sambil memegang caping'],
    ['jumantara-berita-4', 1200, 800, 'Petugas upacara mengibarkan bendera merah putih di lapangan disaksikan barisan murid'],
    ['jumantara-fasilitas-lab', 960, 1200, 'Labu ukur berisi larutan berwarna berjajar di meja laboratorium kimia'],
    ['jumantara-fasilitas-perpustakaan', 960, 1200, 'Rak perpustakaan putih penuh buku dengan punggung berwarna-warni'],
    ['jumantara-fasilitas-komputer', 960, 1200, 'Ruang komputer terang dengan deretan monitor, kursi abu-abu, dan layar proyektor'],
    ['jumantara-fasilitas-lapangan', 960, 1200, 'Lapangan olahraga beratap dengan jaring dan tribun bertingkat saat matahari sore'],
    ['jumantara-fasilitas-ibadah', 960, 1200, 'Ruang salat masjid yang tenang dengan mihrab kayu berukir kaligrafi'],
    ['jumantara-fasilitas-sanggar', 960, 1200, 'Bilah bambu alat musik tradisional dan pemukulnya dalam bingkai kayu merah'],
    ['jumantara-galeri-1', 960, 1200, 'Dua siswi berkerudung dan berseragam olahraga tersenyum dengan tangan bertepung saat praktik membuat adonan'],
    ['jumantara-galeri-2', 960, 1200, 'Siswi berkerudung putih tersenyum bersama teman-temannya di ruang kelas'],
    ['jumantara-galeri-3', 960, 1200, 'Tiga anggota pramuka berkerudung membaca map biru saat kegiatan di luar ruangan'],
    ['jumantara-galeri-4', 960, 1200, 'Remaja berpeci dan berbaju koko hijau membaca buku dengan saksama di meja kayu'],
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

export const JUMANTARA_PHOTOS: PhotoSet = Object.freeze({
  src: (key: string) => HERO_BY_KEY.get(key)?.src ?? BASE.src(key),
  asset: (src: string | null | undefined) => heroOf(src) ?? BASE.asset(src),
  alt: (src: string | null | undefined, fallback: string) => heroOf(src)?.alt ?? BASE.alt(src, fallback),
  keys: Object.freeze([...HERO.map((spec) => spec[0]), ...BASE.keys]),
});

/** Path foto demo untuk defaultContent, mis. `jumantaraPhoto('hero-1')` → `/assets/templates/photos/jumantara-hero-1-1920.webp`. */
export const jumantaraPhoto = (name: string): string => JUMANTARA_PHOTOS.src(`jumantara-${name}`);
