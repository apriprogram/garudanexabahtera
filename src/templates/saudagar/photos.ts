// Registry foto demo Saudagar (PT Saudagar Hasil Bumi, eksportir komoditas fiktif). Semua foto asli dari Unsplash
// (Unsplash License, bukan Unsplash+), dipotong dan dikompres ke WebP; kredit di
// public/assets/templates/photos/CREDITS.md (section "Saudagar"). Foto TIDAK diubah ke SVG: foto sebagai SVG menjadi
// berkas megabyte yang tampak seperti lukisan, jadi disimpan WebP + srcset.
//
// Konvensi file (kit/photos.ts):
//   hero (lengkung tengah, LCP) → `saudagar-hero-1200.webp` + `-800.webp` + `-480.webp` (tegak 4:5, 1200×1500).
//                                  Tiga varian karena lengkung tengah hanya ±420px di desktop: 480w untuk layar 1x,
//                                  800w / 1200w untuk layar 2x–3x dan ponsel.
//   suasana tegak 4:5           → `<kunci>-960.webp` + `<kunci>-800.webp` (960×1200; lengkung, kartu, galeri)
//   potret                      → `<kunci>-480.webp` + `<kunci>-240.webp` (testimoni 1:1)
import type { PhotoAsset } from '../shared/assets';
import { definePhotos, type KitPhotoSpec, type PhotoSet } from '../kit/photos';

const DIR = '/assets/templates/photos';

const HERO: KitPhotoSpec = ['saudagar-hero', 1200, 1500, 'Tangan petani memetik buah kopi merah yang matang dari dahan'];

const BASE = definePhotos({
  scenes: [
    ['saudagar-kakao', 960, 1200, 'Buah kakao kuning menggantung di batang pohon yang berlumut'],
    ['saudagar-rempah', 960, 1200, 'Biji pala berselaput fuli merah di atas daun pisang yang basah'],
    ['saudagar-kopi', 960, 1200, 'Kedua tangan meraup biji kopi hijau yang belum disangrai'],
    ['saudagar-kelapa', 960, 1200, 'Dua belahan kelapa berdaging putih di atas kain linen krem'],
    ['saudagar-sortir', 960, 1200, 'Tangan memilah biji kopi hijau di atas keranjang plastik oranye'],
    ['saudagar-mutu', 960, 1200, 'Deretan cangkir uji cita rasa dan kantong sampel biji kopi di meja'],
    ['saudagar-kapal', 960, 1200, 'Siluet kapal kargo di laut saat matahari terbenam'],
    ['saudagar-panen', 960, 1200, 'Petani memetik buah kopi merah ke dalam keranjang di kebun'],
    ['saudagar-jemur', 960, 1200, 'Pekerja meratakan biji kopi yang dijemur di atas alas terpal'],
    ['saudagar-timbang', 960, 1200, 'Buah kakao kuning di atas timbangan dial tua'],
    ['saudagar-gudang', 960, 1200, 'Tumpukan karung goni berisi hasil bumi di rak gudang'],
    ['saudagar-pala', 960, 1200, 'Buah pala di pohon merekah memperlihatkan fuli merah'],
    ['saudagar-muat', 960, 1200, 'Pekerja menata karung di atas truk di pelabuhan kapal kayu'],
  ],
  portraits: [
    ['saudagar-pembeli-1', 480, 480, 'Potret pria berkemeja denim tersenyum tipis di meja kerja'],
    ['saudagar-pembeli-2', 480, 480, 'Potret perempuan berambut cokelat sebahu tersenyum di luar ruangan'],
    ['saudagar-pembeli-3', 480, 480, 'Potret perempuan berkerudung krem dan berkemeja cokelat tersenyum'],
  ],
});

/** Lengkung hero: srcset 480 / 800 / 1200. */
const heroAsset = ([key, width, height, alt]: KitPhotoSpec): PhotoAsset => ({
  src: `${DIR}/${key}-${width}.webp`,
  width,
  height,
  srcSet: `${DIR}/${key}-480.webp 480w, ${DIR}/${key}-800.webp 800w, ${DIR}/${key}-${width}.webp ${width}w`,
  alt,
});

const HERO_ASSET = heroAsset(HERO);

const clean = (src: string | null | undefined) => {
  const value = (src || '').trim().replace(/[?#].*$/, '');
  return value && !value.startsWith('/') ? `/${value}` : value;
};

const heroOf = (src: string | null | undefined): PhotoAsset | null => (clean(src) === HERO_ASSET.src ? HERO_ASSET : null);

export const SAUDAGAR_PHOTOS: PhotoSet = Object.freeze({
  src: (key: string) => (key === HERO[0] ? HERO_ASSET.src : BASE.src(key)),
  asset: (src: string | null | undefined) => heroOf(src) ?? BASE.asset(src),
  alt: (src: string | null | undefined, fallback: string) => heroOf(src)?.alt ?? BASE.alt(src, fallback),
  keys: Object.freeze([HERO[0], ...BASE.keys]),
});

/** Path foto demo untuk defaultContent, mis. `saudagarPhoto('hero')` → `/assets/templates/photos/saudagar-hero-1200.webp`. */
export const saudagarPhoto = (name: string): string => SAUDAGAR_PHOTOS.src(`saudagar-${name}`);
