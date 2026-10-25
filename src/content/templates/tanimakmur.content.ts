// Isi halaman /template/tanimakmur. Sumber fakta: src/templates/tanimakmur (schema.ts, TaniMakmur.tsx, Header.tsx, Hero.tsx,
// Categories.tsx, Bundles.tsx, Products.tsx, Consult.tsx, Tips.tsx, Faq.tsx, Contact.tsx). Klaim wajib jujur: pemesanan
// lewat WhatsApp, TANPA keranjang/ongkir otomatis/pembayaran online, tanpa janji hasil panen. Demo: TaniMakmur, Kota Batu
// (fiktif).
import type { TemplatePageContent } from './page.types';

export const content: TemplatePageContent = {
  lead:
    '{nama} adalah template website untuk toko pertanian yang menjual benih, pupuk, pestisida organik, dan alat tani skala kecil, dengan pembeli utama petani muda dan penghobi urban farming. Pembuka foto ladang selebar layar, kategori produk, paket per jenis tanaman, daftar produk terlaris, dan konsultasi lewat WhatsApp sudah tersusun, jadi Anda tinggal mengganti foto, produk, dan harga dengan milik toko sendiri.',
  suitableFor: {
    intro:
      'Pilih {nama} bila pembeli Anda sering bertanya dulu sebelum membeli: benih apa yang cocok untuk balkon, pupuk mana untuk cabai, atau berapa lama sampai panen. Halaman ini menjawab pertanyaan itu lewat paket per tanaman dan jadwal tanam, lalu mengarahkan pembeli ke WhatsApp. Stok, ongkos kirim, dan pembayaran tetap Anda konfirmasi sendiri di chat; tidak ada keranjang belanja otomatis.',
    items: [
      'Toko benih, pupuk, dan alat tani yang mulai berjualan online di luar marketplace.',
      'Kios saprotan di daerah sentra sayur yang ingin melayani pesanan dari kota lain.',
      'Penjual perlengkapan hidroponik dan kebun balkon untuk warga perkotaan.',
      'Usaha urban farming atau kelompok tani yang menjual paket tanam beserta pendampingan.',
    ],
  },
  parts: [
    {
      name: 'Menu atas',
      text: 'Logo atau simbol tunas bawaan, tautan bagian dengan garis bawah warna aksen, tombol konsultasi, dan tombol cari berbentuk kotak; di HP menu dilipat.',
    },
    {
      name: 'Pencarian di menu',
      text: 'Pengunjung mengetik kata seperti "kompos" atau "hidroponik" lalu langsung diarahkan ke produk, paket, panduan, atau pertanyaan yang cocok di halaman.',
    },
    {
      name: 'Hero (bagian pembuka)',
      text: 'Foto ladang selebar layar, judul besar, foto bulat dengan lingkaran ajakan, kartu kutipan petani, hingga 3 kartu angka, dan strip keunggulan toko yang berjalan.',
    },
    {
      name: 'Kategori',
      text: 'Hingga 6 kartu kategori bernomor dengan foto dan jumlah produk. Klik kartu menggulir ke produk terlaris dan langsung memfilter kategori yang sama.',
    },
    {
      name: 'Pilih tanamanmu',
      text: 'Tombol pilihan untuk hingga 6 tanaman, misalnya cabai, hidroponik, dan tomat. Tanaman yang dipilih menampilkan paketnya: foto, isi paket dengan harga, grafik jadwal tanam per minggu, total harga beserta selisih hemat, dan tombol pesan.',
    },
    {
      name: 'Produk terlaris',
      text: 'Hingga 12 kartu produk dengan foto, label, ukuran, bintang ulasan, harga coret, dan tombol pesan ke WhatsApp berisi nama produknya.',
    },
    {
      name: 'Konsultasi penyuluh',
      text: 'Panel hijau tua berisi langkah konsultasi, kartu penyuluh, jam layanan, tombol WhatsApp, dan foto dengan contoh percakapan.',
    },
    { name: 'Panduan', text: 'Hingga 6 kartu tips urban farming dengan foto, label, lama baca, ringkasan, dan tautan ke artikel atau permintaan panduan lewat WhatsApp.' },
    { name: 'Testimoni', text: 'Hingga 6 ulasan pembeli dengan bintang, kutipan, produk yang dibeli, nama, dan foto atau inisial.' },
    { name: 'Tanya jawab', text: 'Hingga 8 pertanyaan yang bisa dibuka-tutup, dengan kartu bantuan dan tombol WhatsApp di sampingnya.' },
    { name: 'Kontak & footer', text: 'Alamat kios, telepon, email, jam buka, info pengiriman, peta Google Maps, lalu footer berisi kategori, menu, dan media sosial.' },
  ],
  partsNote: 'Setiap bagian bisa disembunyikan dari CMS bila belum Anda perlukan, misalnya Panduan atau Konsultasi penyuluh.',
  cms: [
    'Nama toko, tagline, logo, dan satu warna aksen untuk lingkaran ajakan, tombol pesan, label, dan bintang ulasan.',
    'Foto ladang, foto bulat, kartu kutipan, angka, dan teks strip keunggulan di bagian pembuka.',
    'Kategori dan produk lengkap dengan foto, harga, harga coret, label, rating, dan tautan sendiri, misalnya ke lapak marketplace.',
    'Paket per tanaman: isi paket satu baris satu barang, harga, harga normal, perkiraan panen, dan jadwal tanam per tahap.',
    'Langkah konsultasi, nama penyuluh, jam layanan, contoh percakapan, panduan, testimoni, dan tanya jawab.',
    'Nomor WhatsApp dan pesan awal untuk semua tombol pesan, alamat kios, info pengiriman, dan link Google Maps.',
  ],
  cmsNote:
    'Grafik jadwal tanam dibuat otomatis dari teks seperti "Semai | 4", dan selisih hemat dihitung dari harga paket dan harga normal.',
  demo: [
    'Demo {nama} memakai toko tani fiktif di Kota Batu dengan empat kategori: benih, pupuk, pestisida organik, dan alat tani. Empat paket contoh menunjukkan cara menyusun paket cabai rawit dalam pot, starter kit hidroponik sayur daun, tomat ceri rambat, dan sayur daun cepat panen, masing-masing dengan isi dan jadwal tanamnya.',
    'Nama pembeli, penyuluh, angka, dan harga di demo hanyalah contoh. Tulis perkiraan panen apa adanya dengan tanda kira-kira, karena hasil tetap bergantung pada cuaca, sinar matahari, dan perawatan. Untuk pestisida, cantumkan dosis dan cara pakai sesuai label kemasan.',
  ],
  custom:
    '{nama} menampilkan produk dan mengarahkan pembeli ke WhatsApp. Bila toko Anda butuh keranjang belanja, ongkos kirim otomatis, pembayaran online, stok yang terhubung ke gudang, atau aplikasi pencatatan kebun untuk pelanggan, fitur itu termasuk website atau aplikasi custom. Ceritakan alur pesanan di toko Anda, lalu kami kirim penawaran setelah konsultasi gratis.',
  mobileLink: true,
  faq: [
    {
      question: 'Apakah pembeli bisa checkout dan membayar langsung di website?',
      answer:
        'Belum. Setiap tombol pesan membuka WhatsApp ke nomor toko dengan pesan berisi nama produk atau paketnya, lalu Anda mengonfirmasi stok, ongkos kirim, dan cara bayar di chat. {nama} tidak punya keranjang atau pembayaran online; fitur itu bisa dibuat lewat jasa custom.',
    },
    {
      question: 'Bagaimana cara menambah paket untuk tanaman lain?',
      answer:
        'Tambahkan item baru di bagian Pilih tanamanmu, isi nama tanaman, nama paket, foto, isi paket satu baris satu barang, dan jadwal tanamnya. Tombol pilihan dan grafik jadwal muncul sendiri, termasuk ikon tanaman untuk cabai, tomat, hidroponik, dan sayur daun.',
    },
    {
      question: 'Apakah produk bisa dihubungkan ke lapak marketplace saya?',
      answer:
        'Bisa. Setiap produk punya kolom tautan sendiri, jadi tombol pesannya bisa membuka halaman produk di marketplace. Bila tautan dikosongkan, tombol akan membuka WhatsApp berisi nama produknya.',
    },
    {
      question: 'Bagaimana kalau toko saya tidak punya penyuluh?',
      answer:
        'Ganti judulnya menjadi konsultasi dengan admin atau pemilik toko, atau sembunyikan bagian itu dari CMS. Daftar penyuluh, contoh percakapan, dan langkah konsultasi semuanya opsional.',
    },
    {
      question: 'Apakah foto di demo boleh saya pakai?',
      answer:
        'Foto demo berasal dari Unsplash dan hanya contoh suasana. Sebaiknya ganti dengan foto produk, kebun, dan kios Anda sendiri lewat CMS supaya pembeli melihat barang yang sebenarnya.',
    },
  ],
  imageAlts: {
    'tanimakmur-preview.webp': 'Tampilan beranda template website toko pertanian {nama} di desktop dan HP dengan hero foto ladang hijau',
    'tanimakmur-1.webp': 'Bagian Pilih tanamanmu template {nama} dengan paket cabai, isi paket, dan grafik jadwal tanam',
    'tanimakmur-2.webp': 'Bagian produk terlaris template {nama} dengan kartu benih, pupuk, dan filter kategori',
  },
  guides: ['template-vs-jasa-website-custom', 'biaya-website-company-profile'],
};
