// Registry foto demo Serenity (Aruna Yoga, fiktif). Semua foto asli dari Unsplash (Unsplash License), WebP, kredit di
// public/assets/templates/photos/CREDITS.md (section "Serenity"). Foto hero = foto orang di bukit & langit yang diberi
// cahaya senja hangat dan pita sutra pelangi (lukisan digital orisinal) agar senada dengan referensi pemilik.
//
// Konvensi file (kit/photos.ts):
//   suasana → `<kunci>-<lebar>.webp` + `<kunci>-800.webp` (hero 1920×1200 agar tajam sebagai latar layar penuh;
//             tentang 4:5 1200×1500; kartu program 4:3 1200×900; ajakan 16:9 1600×900)
//   potret  → `<kunci>-480.webp` + `<kunci>-240.webp`
import { definePhotos } from '../kit/photos';

export const SERENITY_PHOTOS = definePhotos({
  scenes: [
    ['serenity-hero', 1920, 1200, 'Orang merentangkan tangan di puncak bukit berumput di bawah langit biru dengan pita cahaya pelangi melengkung di langit'],
    ['serenity-about', 1200, 1500, 'Perempuan berpose pohon (vrksasana) di atas matras dalam studio yoga yang terang'],
    ['serenity-hatha', 1200, 900, 'Perempuan melakukan pose lunge rendah dengan tangan terangkat di atas matras'],
    ['serenity-vinyasa', 1200, 900, 'Peserta kelas yoga melakukan pose lunge bersama di studio'],
    ['serenity-yin', 1200, 900, 'Perempuan berbaring rileks di atas matras dalam pose savasana'],
    ['serenity-yoga', 1200, 900, 'Beberapa orang melakukan peregangan yoga di atas matras dalam studio'],
    ['serenity-privat', 1200, 900, 'Perempuan berlatih pose yoga duduk di depan jendela besar'],
    ['serenity-retret', 1200, 900, 'Perempuan berpose yoga di puncak bukit saat matahari terbit di atas pegunungan'],
    ['serenity-cta', 1600, 900, 'Langit senja ungu dan merah muda di atas siluet pegunungan'],
  ],
  portraits: [
    ['serenity-portrait-1', 480, 480, 'Potret perempuan berhijab tersenyum dengan latar dedaunan'],
    ['serenity-portrait-2', 480, 480, 'Potret pria berkemeja putih tersenyum di depan dinding'],
    ['serenity-portrait-3', 480, 480, 'Potret perempuan berhijab hitam tersenyum di jalan kota'],
  ],
});

/** Path foto demo untuk defaultContent, mis. `serenityPhoto('hero')` → `/assets/templates/photos/serenity-hero-1920.webp`. */
export const serenityPhoto = (name: string): string => SERENITY_PHOTOS.src(`serenity-${name}`);
