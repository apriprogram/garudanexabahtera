// Registry foto demo Cakrawala (SMK fiktif). Semua foto asli dari Unsplash (Unsplash License, bukan Unsplash+), WebP,
// kredit di public/assets/templates/photos/CREDITS.md (section "Cakrawala"). Siswa & guru Indonesia di sekolah nyata;
// tanpa logo merek yang terbaca (celemek berlogo dipotong).
//
// Konvensi file (kit/photos.ts):
//   slide hero   → `<kunci>-1920.webp` + `-1280.webp` + `-800.webp` (16:9 1920×1080; tiga lebar karena hero hampir
//                  selebar layar)
//   suasana      → `<kunci>-<lebar>.webp` + `<kunci>-800.webp` (4:3 1200×900; berita & galeri mendatar 3:2 1200×800;
//                  galeri tegak 4:5 1200×1500; kepala sekolah 4:5 960×1200)
//   potret       → `<kunci>-480.webp` + `<kunci>-240.webp` (alumni 1:1)
import type { PhotoAsset } from '../shared/assets';
import { definePhotos, type KitPhotoSpec, type PhotoSet } from '../kit/photos';

const DIR = '/assets/templates/photos';

const HERO: readonly KitPhotoSpec[] = [
  ['cakrawala-hero-1', 1920, 1080, 'Siswa berseragam putih abu-abu belajar bersama di gazebo halaman sekolah'],
  ['cakrawala-hero-2', 1920, 1080, 'Siswa berseragam batik biru mengerjakan ujian tertulis di ruang kelas'],
  ['cakrawala-hero-3', 1920, 1080, 'Siswa berkacamata pelindung menggerinda besi di bengkel las didampingi instruktur'],
  ['cakrawala-hero-4', 1920, 1080, 'Siswa tata boga berseragam koki memasak sup di dapur praktik, disimak teman sekelas'],
];

const BASE = definePhotos({
  scenes: [
    ['cakrawala-kepsek', 960, 1200, 'Potret kepala sekolah berkemeja batik tersenyum di halaman sekolah'],
    ['cakrawala-profil', 1200, 900, 'Gedung sekolah dua lantai dengan ratusan siswa duduk di halaman saat apel pagi'],
    ['cakrawala-ppdb', 1200, 900, 'Guru memeriksa berkas pendaftaran bersama dua siswa baru di lapangan sekolah'],
    ['cakrawala-tefa', 1200, 900, 'Tangan siswa menghias adonan roti di atas loyang di dapur produksi sekolah'],
    ['cakrawala-lab', 1200, 900, 'Laboratorium komputer yang terang dengan siswi berhijab bekerja di deretan komputer'],
    ['cakrawala-bengkel', 1200, 900, 'Dinding bengkel otomotif dengan deretan kunci pas dan kunci sok tergantung rapi'],
    ['cakrawala-resto', 1200, 900, 'Ruang restoran praktik dengan meja dan kursi kayu yang tertata rapi'],
    ['cakrawala-aula', 1200, 900, 'Aula serbaguna berlantai kayu dengan deretan kursi hijau tosca'],
    ['cakrawala-berita-1', 1200, 800, 'Siswi berhijab berseragam Paskibra putih dengan peci hitam duduk berbaris'],
    ['cakrawala-berita-2', 1200, 800, 'Tangan mekanik memutar obeng pada karburator sepeda motor'],
    ['cakrawala-berita-3', 1200, 800, 'Alumni berhijab bertoga tersenyum di antara tanaman hijau saat wisuda'],
    ['cakrawala-galeri-1', 1200, 1500, 'Siswa berbaju putih dan merah melambaikan bendera merah putih di tribun upacara kemerdekaan'],
    ['cakrawala-galeri-2', 1200, 800, 'Siswi berseragam olahraga biru duduk bersama guru di bawah pohon halaman sekolah'],
    ['cakrawala-galeri-3', 1200, 1500, 'Lulusan bertoga memegang tabung ijazah dan tersenyum di taman kampus'],
    ['cakrawala-galeri-4', 1200, 800, 'Guru berkebaya hijau berhijab krem tersenyum di depan ruang kelas'],
  ],
  portraits: [
    ['cakrawala-alumni-1', 480, 480, 'Potret alumni pria berjas tersenyum di depan dinding batu'],
    ['cakrawala-alumni-2', 480, 480, 'Potret alumni perempuan berhijab abu-abu menoleh ke samping'],
    ['cakrawala-alumni-3', 480, 480, 'Potret alumni pria muda berkacamata merapikan rambut'],
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

export const CAKRAWALA_PHOTOS: PhotoSet = Object.freeze({
  src: (key: string) => HERO_BY_KEY.get(key)?.src ?? BASE.src(key),
  asset: (src: string | null | undefined) => heroOf(src) ?? BASE.asset(src),
  alt: (src: string | null | undefined, fallback: string) => heroOf(src)?.alt ?? BASE.alt(src, fallback),
  keys: Object.freeze([...HERO.map((spec) => spec[0]), ...BASE.keys]),
});

/** Path foto demo untuk defaultContent, mis. `cakrawalaPhoto('hero-1')` → `/assets/templates/photos/cakrawala-hero-1-1920.webp`. */
export const cakrawalaPhoto = (name: string): string => CAKRAWALA_PHOTOS.src(`cakrawala-${name}`);
