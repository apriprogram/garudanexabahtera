// Registry foto demo Aura Studio (Unsplash, WebP; kredit di public/assets/templates/photos/CREDITS.md).
// Foto suasana: `<kunci>-<lebar>.webp` + `-800.webp`; potret testimoni persegi: `-480.webp` + `-240.webp`.
// Teks keempat = alt bawaan (deskripsi isi foto) untuk foto demo; foto unggahan pembeli memakai keterangan/judul.
import { definePhotos } from '../kit/photos';

export const AURA_PHOTOS = definePhotos({
  scenes: [
    ['aura-studio-hero', 1200, 1500, 'Perempuan menyentuh pipi dengan kulit wajah yang tampak lembap dan segar'],
    ['aura-studio-facial', 1200, 1500, 'Terapis mengoleskan masker krim ke wajah pelanggan yang berbaring'],
    ['aura-studio-texture', 1200, 1500, 'Olesan krim putih di atas permukaan krem'],
    ['aura-studio-therapist', 1600, 900, 'Terapis bersarung tangan merawat wajah pelanggan dengan alat perawatan'],
    ['aura-studio-products', 1600, 900, 'Botol pompa putih, handuk abu-abu, dan bunga tulip merah muda'],
    ['aura-studio-lash', 1600, 1200, 'Terapis memasang bulu mata pelanggan dengan pinset'],
    ['aura-studio-sage', 1600, 1200, 'Tekstur krim hijau sage dan putih yang mengilap'],
    ['aura-studio-manicure', 1200, 1200, 'Tangan dengan kuku alami berwarna nude yang rapi'],
    ['aura-studio-nailart', 1200, 1500, 'Kuku dengan nail art mauve, putih, dan glitter perak'],
    ['aura-studio-nail-care', 1600, 1200, 'Tangan dengan manikur putih susu dan cincin tipis'],
    ['aura-studio-nail-salon', 1600, 1200, 'Nail artist bersarung tangan merapikan kuku pelanggan'],
    ['aura-studio-interior', 1200, 1500, 'Rak kutek berbentuk lengkung dengan lampu dan tanaman hijau'],
    ['aura-studio-lounge', 1200, 1500, 'Sudut studio putih dengan kursi, wastafel, dan tanaman'],
    ['aura-studio-room', 1200, 1500, 'Ruang perawatan pribadi dengan ranjang dan jendela terang'],
    ['aura-studio-massage', 1200, 1500, 'Terapis memijat wajah pelanggan yang berbaring rileks'],
    ['aura-studio-glow', 1200, 1500, 'Perempuan berlatar putih menyentuh leher dengan kulit bercahaya'],
    ['aura-studio-team-1', 1200, 1500, 'Potret terapis senior berblazer putih di studio'],
    ['aura-studio-team-2', 1200, 1500, 'Potret terapis wajah berkaus merah muda'],
    ['aura-studio-team-3', 1200, 1500, 'Potret nail artist berhijab hitam tersenyum'],
  ],
  portraits: [
    ['aura-studio-portrait-1', 480, 480, 'Potret pelanggan berhijab krem tersenyum'],
    ['aura-studio-portrait-2', 480, 480, 'Potret pelanggan berambut panjang tersenyum'],
    ['aura-studio-portrait-3', 480, 480, 'Potret pelanggan tersenyum dengan tangan di dagu'],
  ],
});

/** Path foto demo untuk defaultContent, mis. `auraPhoto('aura-studio-hero')`. */
export const auraPhoto = (key: string): string => AURA_PHOTOS.src(key);
