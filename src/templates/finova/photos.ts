// Registry foto demo Finova (Lumbung Arta, fiktif). Semua foto asli dari Unsplash (Unsplash License), WebP, kredit di
// public/assets/templates/photos/CREDITS.md (section "Finova").
//
// Konvensi file (kit/photos.ts):
//   suasana → `<kunci>-<lebar>.webp` + `<kunci>-800.webp` (mendatar 1600×1067; tegak 4:5 1200×1500)
//   potret  → `<kunci>-1200.webp` + `<kunci>-240.webp`
// Potret testimoni sengaja 4:5 1200×1500: foto besar di section Testimoni memakai varian 1200, avatar bertumpuk di
// hero memakai varian 240 sehingga lingkaran 40px tidak mengunduh foto besar.
import { definePhotos } from '../kit/photos';

export const FINOVA_PHOTOS = definePhotos({
  scenes: [
    ['finova-hero', 1200, 1500, 'Tangan memegang ponsel yang menampilkan kode QR pembayaran di atas latar gelap'],
    ['finova-card', 1600, 1067, 'Tangan memegang kartu hitam polos'],
    ['finova-owner', 1600, 1067, 'Pemilik usaha jahit tersenyum di samping mesin jahitnya'],
    ['finova-community', 1600, 1067, 'Pengurus koperasi berdiskusi di sekeliling meja rapat'],
    ['finova-app', 1200, 1500, 'Perempuan berhijab tersenyum sambil menunjukkan ponselnya'],
  ],
  portraits: [
    ['finova-portrait-1', 1200, 1500, 'Potret perempuan berhijab memakai blazer abu-abu'],
    ['finova-portrait-2', 1200, 1500, 'Potret pria muda berkemeja garis tersenyum'],
    ['finova-portrait-3', 1200, 1500, 'Potret perempuan berhijab memakai blazer kotak-kotak tersenyum'],
    ['finova-portrait-4', 1200, 1500, 'Potret pria berkemeja denim duduk di meja kerja'],
  ],
});

/** Path foto demo untuk defaultContent, mis. `finovaPhoto('hero')` → `/assets/templates/photos/finova-hero-1200.webp`. */
export const finovaPhoto = (name: string): string => FINOVA_PHOTOS.src(`finova-${name}`);
