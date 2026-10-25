// Registry foto demo GlowStory (Seruni Beauty, fiktif). Semua foto asli dari Unsplash (Unsplash License), WebP, kredit
// di public/assets/templates/photos/CREDITS.md (section "GlowStory"). Foto dipilih tanpa merek asli yang terbaca:
// produk demo adalah merek lokal FIKTIF, jadi label kemasan di foto harus polos.
//
// Konvensi file (kit/photos.ts): `<kunci>-<lebar>.webp` + `<kunci>-800.webp`.
//   hero besar, kategori, produk, kuis, isi ulang, foto ulasan → 4:5 1200×1500
//   dua foto kecil kolase hero & panel ajakan → 4:3 1200×900
import { definePhotos } from '../kit/photos';

export const GLOWSTORY_PHOTOS = definePhotos({
  scenes: [
    ['glowstory-hero', 1200, 1500, 'Botol serum kaca amber dengan pipet di atas alas kayu, bayangan daun di dinding'],
    ['glowstory-hero-2', 1200, 900, 'Tetesan serum dan krim dalam cawan kaca dengan daun hijau di latar krem'],
    ['glowstory-hero-3', 1200, 900, 'Olesan lipstik empat warna dari nude hingga merah di latar merah muda'],
    ['glowstory-skincare', 1200, 1500, 'Botol serum merah muda dengan pipet di samping spons putih'],
    ['glowstory-makeup', 1200, 1500, 'Kuas rias, lipstik, maskara, dan bedak padat di latar krem'],
    ['glowstory-bodycare', 1200, 1500, 'Handuk, garam mandi, sikat badan, dan sabun batang dari atas'],
    ['glowstory-serum', 1200, 1500, 'Botol serum amber berlabel polos di atas balok beton'],
    ['glowstory-pelembap', 1200, 1500, 'Toples pelembap kaca buram di samping kotak kemasan'],
    ['glowstory-sunscreen', 1200, 1500, 'Dua tube tabir surya putih di atas balok berwarna peach'],
    ['glowstory-pembersih', 1200, 1500, 'Tube pembersih wajah putih di atas olesan krim'],
    ['glowstory-lipstik', 1200, 1500, 'Tiga lipstik silver dengan batu kristal di latar merah muda'],
    ['glowstory-bedak', 1200, 1500, 'Dua wadah bedak tabur dan kuas kecil dengan taburan bedak'],
    ['glowstory-losion', 1200, 1500, 'Botol losion tubuh putih berpompa di atas kain cokelat'],
    ['glowstory-lulur', 1200, 1500, 'Toples lulur kopi dengan sendok kayu dan biji kopi'],
    ['glowstory-quiz', 1200, 1500, 'Perempuan berambut pendek dengan titik krim di pipi di depan dinding terakota'],
    ['glowstory-refill', 1200, 1500, 'Botol isi ulang merah muda berpompa di latar oranye'],
    ['glowstory-review-1', 1200, 1500, 'Tetesan serum dari pipet ke punggung tangan'],
    ['glowstory-review-2', 1200, 1500, 'Dua perempuan memakai masker wajah tertawa sambil berswafoto'],
    ['glowstory-review-3', 1200, 1500, 'Tiga olesan losion di lengan di atas kain linen'],
    ['glowstory-review-4', 1200, 1500, 'Perempuan tersenyum mengedipkan mata sambil memegang cermin bedak'],
    ['glowstory-cta', 1200, 900, 'Aneka botol perawatan kulit dan aksesori tersusun di latar terakota'],
  ],
});

/** Path foto demo untuk defaultContent, mis. `glowPhoto('hero')` → `/assets/templates/photos/glowstory-hero-1200.webp`. */
export const glowPhoto = (name: string): string => GLOWSTORY_PHOTOS.src(`glowstory-${name}`);
