// Registry foto demo GadgetKu.id (toko aksesori HP, fiktif). Semua foto asli dari Unsplash (Unsplash License), WebP,
// kredit di public/assets/templates/photos/CREDITS.md (section "GadgetKu.id"). Logo, ikon, mockup casing, dan garis
// HP digambar sebagai SVG di kode (lebih ringan dari foto).
//
// Konvensi file (kit/photos.ts):
//   suasana → `<kunci>-<lebar>.webp` + `<kunci>-800.webp` (hero 1920×1200; kategori 4:3 1200×900; produk 1:1
//             1200×1200; contoh foto casing custom 3:4 1200×1600)
//   potret  → `<kunci>-480.webp` + `<kunci>-240.webp`
import { definePhotos } from '../kit/photos';

export const GADGETKU_PHOTOS = definePhotos({
  scenes: [
    ['gadgetku-hero', 1920, 1200, 'Bagian belakang HP hitam dengan tiga kamera di atas permukaan gelap'],
    ['gadgetku-kat-casing', 1200, 900, 'Empat casing HP warna pastel di samping bunga matahari'],
    ['gadgetku-kat-tg', 1200, 900, 'Layar kaca HP yang mengilap di atas meja abu-abu'],
    ['gadgetku-kat-charger', 1200, 900, 'Kepala charger putih dengan kabel di depan dinding kuning'],
    ['gadgetku-kat-kabel', 1200, 900, 'Tiga kabel data jalin oranye dengan ujung USB-C, micro USB, dan USB-A di latar biru'],
    ['gadgetku-kat-earphone', 1200, 900, 'Earphone nirkabel hitam di samping kotak pengisinya'],
    ['gadgetku-kat-powerbank', 1200, 900, 'Tangan memegang power bank hijau yang sedang mengisi daya HP di antara daun palem'],
    ['gadgetku-casing-silikon', 1200, 1200, 'HP berbalut casing silikon biru berdiri di samping tanaman sukulen'],
    ['gadgetku-casing-bening', 1200, 1200, 'Casing bening dengan lingkaran magnet di atas meja abu-abu'],
    ['gadgetku-tg-fullcover', 1200, 1200, 'HP dengan layar penuh bergambar daun hijau di atas latar hitam'],
    ['gadgetku-tg-antispy', 1200, 1200, 'Layar HP mengilap di atas alas kuning berlubang'],
    ['gadgetku-charger-20w', 1200, 1200, 'Kepala charger putih dan kabel USB di atas meja kayu'],
    ['gadgetku-charger-45w', 1200, 1200, 'Charger putih kecil di atas permukaan hijau gelap'],
    ['gadgetku-kabel-usbc', 1200, 1200, 'Kabel USB-C jalin hitam tergulung di atas meja abu-abu'],
    ['gadgetku-kabel-lightning', 1200, 1200, 'Kabel data putih dengan ujung USB-A di latar putih'],
    ['gadgetku-tws', 1200, 1200, 'Sepasang earbuds nirkabel hitam di latar putih'],
    ['gadgetku-tws-gaming', 1200, 1200, 'Earbuds bluetooth hitam di depan kotak pengisi dengan cahaya merah ungu'],
    ['gadgetku-powerbank', 1200, 1200, 'Power bank putih dengan kabel tiga cabang di atas lantai semen'],
    ['gadgetku-custom-sample', 1200, 1600, 'Kucing oranye putih bersandar di keranjang anyaman'],
  ],
  portraits: [
    ['gadgetku-portrait-1', 480, 480, 'Potret pria muda berkaus putih tersenyum'],
    ['gadgetku-portrait-2', 480, 480, 'Potret perempuan muda berhijab biru tersenyum'],
    ['gadgetku-portrait-3', 480, 480, 'Potret perempuan muda berambut panjang tersenyum'],
  ],
});

/** Path foto demo untuk defaultContent, mis. `gadgetkuPhoto('hero')` → `/assets/templates/photos/gadgetku-hero-1920.webp`. */
export const gadgetkuPhoto = (name: string): string => GADGETKU_PHOTOS.src(`gadgetku-${name}`);
