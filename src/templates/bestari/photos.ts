// Registry foto demo Bestari (SMA swasta fiktif). Semua foto asli dari Unsplash (Unsplash License, bukan Unsplash+),
// WebP teroptimasi, kredit di public/assets/templates/photos/CREDITS.md (section "Bestari"). Siswa & guru Indonesia di
// sekolah nyata; nama sekolah asal di dasi & jersey dipotong atau disamarkan, beberapa foto masih menampilkan merek kecil
// (bola basket, drum, kaus, tali kartu). Foto TIDAK diubah ke SVG: foto sebagai SVG menjadi berkas
// megabyte yang tampak seperti lukisan (skill design-system pemilik), jadi disimpan WebP + srcset.
//
// Konvensi file (kit/photos.ts):
//   slide hero   → `<kunci>-1920.webp` + `-1280.webp` + `-800.webp` (16:9 1920×1080; hero selebar layar)
//   suasana      → `<kunci>-<lebar>.webp` + `<kunci>-800.webp` (tegak 4:5 960×1200; mendatar 4:3 1200×900 /
//                  3:2 1200×800)
//   potret       → `<kunci>-480.webp` + `<kunci>-240.webp` (testimoni 1:1)
import type { PhotoAsset } from '../shared/assets';
import { definePhotos, type KitPhotoSpec, type PhotoSet } from '../kit/photos';

const DIR = '/assets/templates/photos';

const HERO: readonly KitPhotoSpec[] = [
  ['bestari-hero-1', 1920, 1080, 'Siswa dan siswi SMA berseragam putih abu-abu duduk di ruang kelas memperhatikan guru'],
  ['bestari-hero-2', 1920, 1080, 'Siswa berseragam batik biru mengerjakan ujian tertulis di ruang kelas'],
  ['bestari-hero-3', 1920, 1080, 'Siswi marching band berseragam biru emas memegang simbal saat tampil di jalan'],
  ['bestari-hero-4', 1920, 1080, 'Siswi petugas upacara berpeci hitam dan berselempang merah putih bersiap bersama pembina'],
];

const BASE = definePhotos({
  scenes: [
    ['bestari-tentang-1', 960, 1200, 'Tiga siswi berkerudung putih dengan rok kotak-kotak berdiskusi sambil membaca di selasar sekolah'],
    ['bestari-tentang-2', 1200, 900, 'Siswa dan siswi membaca buku dan majalah bersama di gazebo sekolah'],
    ['bestari-kepsek', 960, 1200, 'Kepala sekolah berkerudung merah tersenyum sambil bertopang dagu di ruang kerjanya'],
    ['bestari-alasan', 960, 1200, 'Siswi berkemeja putih dan berdasi abu-abu tersenyum di halaman sekolah'],
    ['bestari-program-kuliah', 960, 1200, 'Siswi berkerudung merah muda membaca buku pelajaran sambil menunjuk teks di meja kantin'],
    ['bestari-program-sains', 960, 1200, 'Tangan meletakkan robot pengikut garis rakitan di atas lintasan hitam putih'],
    ['bestari-program-seni', 960, 1200, 'Siswi marching band berseragam biru memegang simbal di depan drum besar'],
    ['bestari-program-olahraga', 960, 1200, 'Tim basket putri berpose; siswi berkerudung hitam berjersey biru muda memegang bola di depan rekan-rekannya'],
    ['bestari-ppdb', 1200, 900, 'Siswi berkerudung putih dengan tali kartu tanda peserta tersenyum ke arah kamera'],
    ['bestari-berita-1', 1200, 800, 'Siswa bertanding futsal di lapangan sekolah yang dikelilingi pepohonan'],
    ['bestari-berita-2', 1200, 800, 'Tangan siswa berseragam kotak-kotak memilah sayur dan buah untuk proyek kompos'],
    ['bestari-berita-3', 1200, 800, 'Ratusan siswa SMA bersorak riang saat acara pekan olahraga dan seni'],
    ['bestari-guru-1', 960, 1200, 'Guru perempuan berkerudung memegang map merah dan tersenyum'],
    ['bestari-guru-2', 960, 1200, 'Guru laki-laki berkacamata dan bersweter putih tersenyum di ruang perpustakaan'],
    ['bestari-guru-3', 960, 1200, 'Guru perempuan berkerudung merah muda dan blazer duduk tersenyum di ruang guru'],
    ['bestari-galeri-1', 1200, 800, 'Siswa dan siswi berseragam putih abu-abu mendengarkan guru di ruang kelas'],
    ['bestari-galeri-2', 960, 1200, 'Siswi berkerudung hitam dan bermasker membaca buku dengan saksama'],
    ['bestari-galeri-3', 1200, 800, 'Siswa berseragam putih belajar di meja kayu ruang kelas'],
    ['bestari-galeri-4', 960, 1200, 'Siswa berkemeja putih dan berompi merah melambaikan bendera merah putih di tribun upacara kemerdekaan'],
    ['bestari-galeri-5', 1200, 800, 'Tiga siswa berfoto di depan Candi Borobudur saat kunjungan belajar'],
  ],
  portraits: [
    ['bestari-ortu-1', 480, 480, 'Potret ibu berambut hitam panjang tersenyum lebar'],
    ['bestari-ortu-2', 480, 480, 'Potret bapak berkacamata dan berkemeja kotak-kotak tersenyum'],
    ['bestari-alumni-1', 480, 480, 'Potret perempuan muda berkerudung abu-abu dan berkacamata tersenyum'],
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

export const BESTARI_PHOTOS: PhotoSet = Object.freeze({
  src: (key: string) => HERO_BY_KEY.get(key)?.src ?? BASE.src(key),
  asset: (src: string | null | undefined) => heroOf(src) ?? BASE.asset(src),
  alt: (src: string | null | undefined, fallback: string) => heroOf(src)?.alt ?? BASE.alt(src, fallback),
  keys: Object.freeze([...HERO.map((spec) => spec[0]), ...BASE.keys]),
});

/** Path foto demo untuk defaultContent, mis. `bestariPhoto('hero-1')` → `/assets/templates/photos/bestari-hero-1-1920.webp`. */
export const bestariPhoto = (name: string): string => BESTARI_PHOTOS.src(`bestari-${name}`);
