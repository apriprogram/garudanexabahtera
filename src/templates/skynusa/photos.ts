// Registry foto demo SkyNusa (toko drone fiktif). Semua foto asli dari Unsplash (Unsplash License), WebP, kredit di
// public/assets/templates/photos/CREDITS.md (section "SkyNusa"). Foto produk berlatar putih/langit dipotong 4:3 agar
// baling-baling tidak terpotong (foto berlatar putih diberi bidang putih, bukan dipotong).
//
// Konvensi file (kit/photos.ts):
//   suasana → `<kunci>-<lebar>.webp` + `<kunci>-800.webp` (hero & sewa 4:5 1200×1500; kategori, produk, paket, servis,
//             kelas 4:3 1200×900; ajakan 16:9 1600×900)
//   potret  → `<kunci>-480.webp` + `<kunci>-240.webp`
import { definePhotos } from '../kit/photos';

export const SKYNUSA_PHOTOS = definePhotos({
  scenes: [
    ['skynusa-hero', 1200, 1500, 'Drone lipat abu-abu melayang di langit berkabut dengan puncak pepohonan samar di bawahnya'],
    ['skynusa-foto', 1200, 900, 'Foto udara pulau berbukit hijau dengan teluk biru dan pantai melengkung'],
    ['skynusa-wedding', 1200, 900, 'Foto udara pengantin bergaun putih dengan kerudung panjang dikelilingi tamu di taman'],
    ['skynusa-pemetaan', 1200, 900, 'Foto udara tegak lurus petak-petak sawah hijau yang dipisah pematang'],
    ['skynusa-mini', 1200, 900, 'Drone mini putih dengan kamera kecil di atas latar putih'],
    ['skynusa-lipat', 1200, 900, 'Drone lipat abu-abu dengan kamera gimbal melayang di depan latar putih'],
    ['skynusa-sinema', 1200, 900, 'Drone sinema besar dengan kamera gimbal terbang di langit biru di atas pegunungan bersalju'],
    ['skynusa-survei', 1200, 900, 'Drone putih berkaki tinggi terbang di langit biru cerah'],
    ['skynusa-paket-pemula', 1200, 900, 'Drone mini kuning, remote, tas, baling-baling cadangan, dan pelindung baling-baling tertata di meja kayu'],
    ['skynusa-paket-wedding', 1200, 900, 'Drone lipat, remote, kamera, dan beberapa lensa tertata di meja kayu gelap'],
    ['skynusa-paket-pemetaan', 1200, 900, 'Pengisi daya baterai drone abu-abu dengan tiga slot di atas meja'],
    ['skynusa-sewa', 1200, 1500, 'Seorang pria mengamati drone yang melayang di atas perbukitan dan dataran luas'],
    ['skynusa-servis', 1200, 900, 'Teknisi berkacamata pelindung menyolder papan elektronik di meja kerja dengan drone di belakangnya'],
    ['skynusa-kelas', 1200, 900, 'Pria memegang remote sambil menerbangkan drone di langit biru'],
    ['skynusa-cta', 1600, 900, 'Bukit kebun teh berkabut dengan jalan berkelok di antara barisan tanaman'],
  ],
  portraits: [
    ['skynusa-portrait-1', 480, 480, 'Potret pria berkacamata membawa kamera di jalan kota'],
    ['skynusa-portrait-2', 480, 480, 'Potret perempuan berhijab abu-abu bertopang dagu di dekat dedaunan'],
    ['skynusa-portrait-3', 480, 480, 'Potret pria muda berkumis tipis dengan latar cahaya senja'],
  ],
});

/** Path foto demo untuk defaultContent, mis. `skynusaPhoto('hero')` → `/assets/templates/photos/skynusa-hero-1200.webp`. */
export const skynusaPhoto = (name: string): string => SKYNUSA_PHOTOS.src(`skynusa-${name}`);
