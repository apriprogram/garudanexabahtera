// Registry foto demo PayNow (dompet digital & payment gateway fiktif). Semua foto asli dari Unsplash (Unsplash License,
// bukan Unsplash+), WebP teroptimasi, kredit di public/assets/templates/photos/CREDITS.md (section "PayNow"). Merek
// bank/e-wallet/kartu dan kode QR asli yang masih terbaca dikaburkan atau dipotong; foto TIDAK diubah ke SVG.
//
// Konvensi file (kit/photos.ts):
//   hero          → `<kunci>-1920.webp` + `-1280.webp` + `-800.webp` (16:9 1920×1080, latar di bawah lapisan gradasi)
//   tegak         → `<kunci>-960.webp` + `<kunci>-800.webp` (4:5 960×1200: panggung fitur, keamanan, unduh)
//   mendatar      → `<kunci>-1200.webp` + `<kunci>-800.webp` (3:2 1200×800: cerita merchant, daftar merchant)
//   potret        → `<kunci>-480.webp` + `<kunci>-240.webp` (1:1)
import type { PhotoAsset } from '../shared/assets';
import { definePhotos, type KitPhotoSpec, type PhotoSet } from '../kit/photos';

const DIR = '/assets/templates/photos';

const HERO: readonly KitPhotoSpec[] = [['paynow-hero', 1920, 1080, 'Perempuan memeriksa ponsel di depan kios makanan yang terang pada malam hari']];

const BASE = definePhotos({
  scenes: [
    ['paynow-qris', 960, 1200, 'Perempuan berkemeja putih mendekatkan ponsel ke mesin pembayaran di sebuah kafe'],
    ['paynow-transfer', 960, 1200, 'Empat perempuan berkerudung melihat layar ponsel bersama-sama'],
    ['paynow-tagihan', 960, 1200, 'Perempuan berkacamata duduk santai di kursi sambil memegang ponsel di depan rak buku'],
    ['paynow-topup', 960, 1200, 'Perempuan berkacamata tertawa sambil melihat layar ponselnya di luar ruangan'],
    ['paynow-keamanan', 960, 1200, 'Tangan memegang ponsel dengan layar kunci menyala di tengah lampu kota malam hari'],
    ['paynow-unduh', 960, 1200, 'Perempuan berkerudung tersenyum memegang ponsel dan minuman di bawah lampion merah'],
    ['paynow-kopi', 1200, 800, 'Barista menuangkan susu ke gelas kopi di samping mesin espreso'],
    ['paynow-warung', 1200, 800, 'Beberapa perempuan berkerudung makan dan membayar di warung makan pinggir jalan'],
    ['paynow-laundry', 1200, 800, 'Keranjang merah di depan deretan mesin cuci biru di toko laundry'],
    ['paynow-merchant', 1200, 800, 'Pedagang perempuan berkerudung membungkus barang dagangan di kios pasar'],
  ],
  portraits: [
    ['paynow-portrait-1', 480, 480, 'Potret perempuan berkacamata tersenyum di luar ruangan dengan latar pepohonan'],
    ['paynow-portrait-2', 480, 480, 'Potret pria paruh baya tersenyum mengenakan kemeja kotak-kotak dengan latar abu-abu'],
    ['paynow-portrait-3', 480, 480, 'Potret perempuan berkerudung krem tersenyum dengan latar lampu kota malam hari'],
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

export const PAYNOW_PHOTOS: PhotoSet = Object.freeze({
  src: (key: string) => HERO_BY_KEY.get(key)?.src ?? BASE.src(key),
  asset: (src: string | null | undefined) => heroOf(src) ?? BASE.asset(src),
  alt: (src: string | null | undefined, fallback: string) => heroOf(src)?.alt ?? BASE.alt(src, fallback),
  keys: Object.freeze([...HERO.map((spec) => spec[0]), ...BASE.keys]),
});

/** Path foto demo untuk defaultContent, mis. `paynowPhoto('hero')` → `/assets/templates/photos/paynow-hero-1920.webp`. */
export const paynowPhoto = (name: string): string => PAYNOW_PHOTOS.src(`paynow-${name}`);
