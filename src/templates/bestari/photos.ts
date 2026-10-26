// Registry foto demo Bestari (SD swasta fiktif). Semua foto asli dari Unsplash (Unsplash License, bukan Unsplash+),
// WebP teroptimasi, kredit di public/assets/templates/photos/CREDITS.md (section "Bestari"). Murid & guru Indonesia di
// sekolah nyata; potongan tanpa logo merek yang terbaca. Foto TIDAK diubah ke SVG: foto sebagai SVG menjadi berkas
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
  ['bestari-hero-1', 1920, 1080, 'Murid SD berseragam merah putih mengacungkan tangan dengan gembira di dalam kelas'],
  ['bestari-hero-2', 1920, 1080, 'Puluhan murid SD bertopi merah putih melompat bersama di halaman sekolah'],
  ['bestari-hero-3', 1920, 1080, 'Murid berseragam pramuka cokelat berlatih gerakan tari bersama di halaman'],
  ['bestari-hero-4', 1920, 1080, 'Murid laki-laki berseragam merah putih tertawa bersandar di pagar bambu gazebo sekolah'],
];

const BASE = definePhotos({
  scenes: [
    ['bestari-tentang-1', 960, 1200, 'Murid perempuan berkerudung merah membaca buku di tengah rumput hijau yang tinggi'],
    ['bestari-tentang-2', 1200, 900, 'Murid kelas rendah berbaju batik tersenyum sambil menulis di meja kelas'],
    ['bestari-kepsek', 960, 1200, 'Kepala sekolah berkerudung merah tersenyum sambil bertopang dagu di ruang kerjanya'],
    ['bestari-alasan', 960, 1200, 'Murid laki-laki tersenyum lebar ke arah kamera di ruang kelas'],
    ['bestari-program-literasi', 960, 1200, 'Guru berkemeja putih membacakan buku untuk murid berbaju batik di sudut baca kelas'],
    ['bestari-program-sains', 960, 1200, 'Tangan meletakkan robot pengikut garis rakitan di atas lintasan hitam putih'],
    ['bestari-program-seni', 960, 1200, 'Murid berkostum tari merah putih dan bermahkota menari bersama di halaman'],
    ['bestari-program-pramuka', 960, 1200, 'Dua murid berseragam pramuka berlari riang di selasar sekolah'],
    ['bestari-ppdb', 1200, 900, 'Dua anak perempuan tersenyum di depan gedung sekolah, salah satunya mengacungkan jempol'],
    ['bestari-berita-1', 1200, 800, 'Murid berikat kepala merah putih membaca naskah puisi'],
    ['bestari-berita-2', 1200, 800, 'Guru berpeci memberi hormat bersama murid bertopi merah saat upacara'],
    ['bestari-berita-3', 1200, 800, 'Murid berkaus merah berkumpul di lapangan sekolah saat pekan olahraga'],
    ['bestari-guru-1', 960, 1200, 'Guru perempuan berkerudung memegang map merah dan tersenyum'],
    ['bestari-guru-2', 960, 1200, 'Guru laki-laki berkemeja putih tersenyum di ruang pertemuan'],
    ['bestari-guru-3', 960, 1200, 'Guru perempuan berkerudung merah muda dan blazer duduk tersenyum di ruang guru'],
    ['bestari-galeri-1', 1200, 800, 'Upacara pengibaran bendera merah putih di lapangan rumput yang luas'],
    ['bestari-galeri-2', 960, 1200, 'Murid pramuka siaga duduk di teras sekolah sambil mencatat, salah satunya membuat tanda hati'],
    ['bestari-galeri-3', 1200, 800, 'Murid kelas rendah berbaju batik menulis di buku latihan'],
    ['bestari-galeri-4', 960, 1200, 'Dua murid berbaju koko dan berpeci putih tertawa di selasar sekolah'],
    ['bestari-galeri-5', 1200, 800, 'Anak perempuan tertawa sambil menunjuk pipinya di halaman berumput'],
  ],
  portraits: [
    ['bestari-ortu-1', 480, 480, 'Potret ibu berambut hitam panjang tersenyum lebar'],
    ['bestari-ortu-2', 480, 480, 'Potret bapak berkacamata dan berkemeja kotak-kotak tersenyum'],
    ['bestari-alumni-1', 480, 480, 'Potret remaja perempuan berkerudung abu-abu dan berkacamata tersenyum'],
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
