// Registry foto demo LOKAL untuk template baru (arena-club, aura-studio, finova). Kunci & ukuran per template
// didefinisikan di folder template masing-masing (mis. `arena-club/photos.ts`), jadi tiga template bisa dikerjakan
// paralel tanpa menyentuh `shared/assets.ts` (milik perombakan template lama).
//
// Pengganti lokal untuk perubahan bersama yang diinginkan: `shared/assets.ts` belum bisa diperluas dengan foto
// template lain, sehingga `photoAsset()` bersama tidak memberi srcset untuk foto baru. `<KitPhoto>`/`<KitAvatar>`
// (./Photo.tsx) mencari di registry bersama DULU, lalu di PhotoSet template ini.
//
// Konvensi file sama dengan foto lama (public/assets/templates/photos/, kredit di CREDITS.md):
//   foto suasana  → `<kunci>-<lebar>.webp` + `<kunci>-800.webp`  (lebar biasanya 1600; foto tegak 4:5 boleh 1200)
//   potret persegi → `<kunci>-480.webp` + `<kunci>-240.webp`
// `<lebar>` = angka lebar di spec. Kunci WAJIB diawali kode template, mis. "arena-club-hero".
import { photoAsset, type PhotoAsset } from '../shared/assets';

const PHOTO_DIR = '/assets/templates/photos';

/** [kunci, lebar varian terbesar, tinggi varian terbesar, deskripsi isi foto (alt bawaan, bahasa Indonesia)] */
export type KitPhotoSpec = readonly [key: string, width: number, height: number, alt: string];

export interface PhotoSet {
  /** Path untuk defaultContent (varian terbesar), mis. `ARENA_PHOTOS.src('arena-club-hero')`. Kunci tak dikenal → "". */
  src: (key: string) => string;
  /** Aset dari nilai konten: registry bersama dulu, lalu set ini. Bukan foto demo → null (dipakai apa adanya). */
  asset: (src: string | null | undefined) => PhotoAsset | null;
  /** Alt bawaan foto demo, selain itu `fallback` (keterangan/judul dari konten). */
  alt: (src: string | null | undefined, fallback: string) => string;
  /** Semua kunci (untuk uji: setiap file harus ada di public/). */
  keys: readonly string[];
}

const toAsset = ([key, width, height, alt]: KitPhotoSpec, small: number): PhotoAsset => ({
  src: `${PHOTO_DIR}/${key}-${width}.webp`,
  width,
  height,
  srcSet: `${PHOTO_DIR}/${key}-${small}.webp ${small}w, ${PHOTO_DIR}/${key}-${width}.webp ${width}w`,
  alt,
});

const normalize = (src: string | null | undefined): string => {
  const value = (src || '').trim().replace(/[?#].*$/, '');
  if (!value) return '';
  return value.startsWith('/') ? value : `/${value}`;
};

/**
 * Buat registry foto satu template. `scenes` memakai varian kecil 800w, `portraits` 240w (sama dengan foto lama).
 *
 * ```ts
 * export const ARENA_PHOTOS = definePhotos({
 *   scenes: [['arena-club-hero', 1600, 1067, 'Dua pemain padel bersiap di lapangan biru']],
 *   portraits: [['arena-club-coach-1', 480, 480, 'Potret pelatih']],
 * });
 * ```
 */
export function definePhotos({ scenes = [], portraits = [] }: { scenes?: readonly KitPhotoSpec[]; portraits?: readonly KitPhotoSpec[] }): PhotoSet {
  const byKey = new Map<string, PhotoAsset>();
  for (const spec of scenes) byKey.set(spec[0], toAsset(spec, 800));
  for (const spec of portraits) byKey.set(spec[0], toAsset(spec, 240));
  const bySrc = new Map(Array.from(byKey.values(), (asset) => [asset.src, asset] as const));

  const asset = (src: string | null | undefined): PhotoAsset | null => {
    const shared = photoAsset(src);
    if (shared) return shared;
    const value = normalize(src);
    return value ? bySrc.get(value) ?? null : null;
  };

  return Object.freeze({
    src: (key: string) => byKey.get(key)?.src ?? '',
    asset,
    alt: (src: string | null | undefined, fallback: string) => asset(src)?.alt ?? fallback,
    keys: Object.freeze(Array.from(byKey.keys())),
  });
}

/** Set kosong: hanya registry bersama (perilaku sama dengan <Photo> bersama). */
export const NO_PHOTOS: PhotoSet = definePhotos({});
