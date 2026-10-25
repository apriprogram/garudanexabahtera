// Registry foto demo PuncakGear (Tapak Rimba Outdoor, fiktif). Semua foto asli dari Unsplash (Unsplash License), WebP,
// kredit di public/assets/templates/photos/CREDITS.md (section "PuncakGear"). Logo merek yang terbaca di dua foto
// (sepatu produk, carrier kategori) disamarkan agar demo tidak terkesan menjual merek tertentu.
//
// Konvensi file (kit/photos.ts):
//   suasana → `<kunci>-<lebar>.webp` + `<kunci>-800.webp` (hero 1920×1200; kartu kategori & sewa 4:5 1200×1500;
//             produk 1:1 1200×1200; panduan gunung 4:3 1600×1200; keselamatan 16:10 1600×1000)
//   potret  → `<kunci>-480.webp` + `<kunci>-240.webp`
import { definePhotos } from '../kit/photos';

export const PUNCAK_PHOTOS = definePhotos({
  scenes: [
    ['puncakgear-hero', 1920, 1200, 'Pendaki membawa carrier dan trekking pole berjalan di puncak bukit berumput di bawah langit biru berawan'],
    ['puncakgear-kategori-tenda', 1200, 1500, 'Tenda dome oranye berdiri di padang rumput hijau dengan latar pegunungan'],
    ['puncakgear-kategori-carrier', 1200, 1500, 'Pendaki berkupluk dilihat dari belakang membawa carrier biru besar di tengah hutan berkabut'],
    ['puncakgear-kategori-sleeping-bag', 1200, 1500, 'Dua pendaki duduk dalam sleeping bag di atas matras sambil memandang pegunungan'],
    ['puncakgear-kategori-sepatu', 1200, 1500, 'Sepasang sepatu gunung abu-abu di atas batu di antara dedaunan'],
    ['puncakgear-kategori-darurat', 1200, 1500, 'Pendaki berdiri di puncak berbatu saat senja dengan headlamp merah menyala'],
    ['puncakgear-produk-tenda', 1200, 1200, 'Tenda dome merah berdiri di lembah pegunungan'],
    ['puncakgear-produk-carrier', 1200, 1200, 'Carrier oranye dengan botol minum di sisinya bersandar di batu'],
    ['puncakgear-produk-sleeping-bag', 1200, 1200, 'Sleeping bag oranye dan biru terhampar di camp berbatu dengan latar pegunungan'],
    ['puncakgear-produk-sepatu', 1200, 1200, 'Sepatu gunung mid hitam di atas tumpukan batu dengan latar perbukitan'],
    ['puncakgear-produk-trekking-pole', 1200, 1200, 'Sepasang trekking pole bersilang di padang rumput'],
    ['puncakgear-produk-matras', 1200, 1200, 'Matras foam gulung terikat di carrier dengan latar pegunungan'],
    ['puncakgear-produk-kompor', 1200, 1200, 'Kompor portabel dengan panci kecil di atas meja kayu perkemahan'],
    ['puncakgear-produk-p3k', 1200, 1200, 'Tas P3K hijau bertuliskan First Aid'],
    ['puncakgear-rinjani', 1600, 1200, 'Danau Segara Anak di kaldera Gunung Rinjani dilihat dari puncak'],
    ['puncakgear-semeru', 1600, 1200, 'Pendaki dan tenda di tepi Ranu Kumbolo, jalur pendakian Gunung Semeru'],
    ['puncakgear-prau', 1600, 1200, 'Pemandangan deretan gunung dari Gunung Prau dengan bukit hijau di depan'],
    ['puncakgear-merbabu', 1600, 1200, 'Gunung Merapi saat fajar dilihat dari savana Gunung Merbabu'],
    ['puncakgear-sindoro', 1600, 1200, 'Gunung Sindoro menjulang di atas ladang dan permukiman'],
    ['puncakgear-sewa', 1200, 1500, 'Rombongan pendaki menanjak di punggungan berumput dengan gunung besar dan lautan awan di belakang'],
    ['puncakgear-keselamatan', 1600, 1000, 'Pendaki beristirahat di bebatuan puncak sambil memandang gunung di atas lautan awan'],
  ],
  portraits: [
    ['puncakgear-portrait-1', 480, 480, 'Potret perempuan berhijab berkacamata tersenyum dengan latar gunung berkabut'],
    ['puncakgear-portrait-2', 480, 480, 'Potret pria berkupluk oranye tersenyum membawa carrier di jalur hutan'],
    ['puncakgear-portrait-3', 480, 480, 'Potret pria berjaket merah dengan latar gunung di atas lautan awan'],
  ],
});

/** Path foto demo untuk defaultContent, mis. `puncakPhoto('hero')` → `/assets/templates/photos/puncakgear-hero-1920.webp`. */
export const puncakPhoto = (name: string): string => PUNCAK_PHOTOS.src(`puncakgear-${name}`);
