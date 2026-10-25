// Registry foto demo TaniMakmur (toko tani fiktif, Kota Batu). Semua foto asli dari Unsplash (Unsplash License), WebP,
// kredit di public/assets/templates/photos/CREDITS.md (section "TaniMakmur"). Foto berdaun/bertanah rapat dihaluskan
// sedikit saat dikonversi agar ringan; hero digelapkan tipis untuk nuansa hijau tua referensi.
//
// Konvensi file (kit/photos.ts):
//   suasana → `<kunci>-<lebar>.webp` + `<kunci>-800.webp` (hero 1920×1200; kategori & panduan 4:3 1200×900; paket
//             tanam 1:1 1200×1200; konsultasi 4:5 1200×1500; foto bulat hero 1000×1000)
//   kecil   → `<kunci>-<lebar>.webp` + `<kunci>-240.webp` (produk 1:1 640, potret 1:1 480, kartu kutipan hero 4:3 480)
import { definePhotos } from '../kit/photos';

export const TANI_PHOTOS = definePhotos({
  scenes: [
    ['tanimakmur-hero', 1920, 1200, 'Hamparan kebun sayur hijau berbaris rapi dengan pepohonan di kejauhan'],
    ['tanimakmur-cabai', 1000, 1000, 'Cabai rawit merah dan hijau menggantung di batang tanaman'],
    ['tanimakmur-benih', 1200, 900, 'Bibit muda di deretan pot hitam dilihat dari atas'],
    ['tanimakmur-pupuk', 1200, 900, 'Tangan menggenggam kompos gembur berwarna cokelat tua'],
    ['tanimakmur-pestisida', 1200, 900, 'Perempuan berkacamata menyemprot tanaman dengan sprayer kuning'],
    ['tanimakmur-alat', 1200, 900, 'Gunting dahan, sarung tangan, keranjang semai, dan pot di meja putih'],
    ['tanimakmur-paket-cabai', 1200, 1200, 'Tanaman cabai berbuah lebat di pot tanah liat di rak balkon'],
    ['tanimakmur-paket-hidroponik', 1200, 1200, 'Deretan selada hidroponik di dalam rumah tanam beratap plastik'],
    ['tanimakmur-paket-tomat', 1200, 1200, 'Tomat ceri merah ranum bergelantungan di batang tanaman'],
    ['tanimakmur-paket-sayur', 1200, 1200, 'Pakcoy dan selada keriting hijau segar di kebun'],
    ['tanimakmur-konsultasi', 1200, 1500, 'Petani muda bertopi anyaman tersenyum sambil memegang ponsel di ladang'],
    ['tanimakmur-tips-pot', 1200, 900, 'Menyiram tanaman di pot besar di balkon rumah'],
    ['tanimakmur-tips-semai', 1200, 900, 'Kecambah muda tumbuh di baki semai'],
    ['tanimakmur-tips-kompos', 1200, 900, 'Sekop kecil berisi tanah kompos di samping gunting tanaman'],
    ['tanimakmur-tips-hidroponik', 1200, 900, 'Daun selada keriting hijau dilihat dari dekat'],
  ],
  portraits: [
    ['tanimakmur-ladang', 480, 360, 'Petani bertopi caping tersenyum di tepi sawah'],
    ['tanimakmur-produk-benih-cabai', 640, 640, 'Cabai rawit merah di tanaman dengan butir air di daun'],
    ['tanimakmur-produk-benih-tomat', 640, 640, 'Tandan tomat merah dan hijau di batang'],
    ['tanimakmur-produk-kompos', 640, 640, 'Dua tangan menampung kompos organik'],
    ['tanimakmur-produk-npk', 640, 640, 'Butiran pupuk putih dilihat dari dekat'],
    ['tanimakmur-produk-mimba', 640, 640, 'Perempuan menyemprot tanaman dengan botol semprot hijau di rumah tanam'],
    ['tanimakmur-produk-tower', 640, 640, 'Tower hidroponik putih berisi selada muda'],
    ['tanimakmur-produk-sprayer', 640, 640, 'Sprayer punggung hijau di rak kayu di samping keranjang'],
    ['tanimakmur-produk-sekop', 640, 640, 'Sekop tanam stainless bergagang kayu di atas papan'],
    ['tanimakmur-penyuluh-1', 480, 480, 'Potret perempuan berkerudung tersenyum di antara dedaunan'],
    ['tanimakmur-penyuluh-2', 480, 480, 'Potret bapak petani bertopi tersenyum'],
    ['tanimakmur-portrait-1', 480, 480, 'Potret perempuan muda berambut panjang tersenyum di dekat jendela'],
    ['tanimakmur-portrait-2', 480, 480, 'Potret pria berambut panjang tersenyum di luar ruangan'],
    ['tanimakmur-portrait-3', 480, 480, 'Potret ibu tersenyum lebar'],
  ],
});

/** Path foto demo untuk defaultContent, mis. `taniPhoto('hero')` → `/assets/templates/photos/tanimakmur-hero-1920.webp`. */
export const taniPhoto = (name: string): string => TANI_PHOTOS.src(`tanimakmur-${name}`);
