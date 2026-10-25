// Isi halaman /template/gadgetku. Sumber fakta: src/templates/gadgetku (schema.ts, model.ts, Header.tsx, Hero.tsx,
// Finder.tsx, Products.tsx, Bundles.tsx, CustomCase.tsx, Contact.tsx, Footer.tsx). Klaim wajib jujur: pesanan lewat
// WhatsApp, TANPA keranjang/pembayaran online/sinkron stok marketplace; foto custom casing tidak dikirim ke server.
// Demo: GadgetKu.id, Depok (fiktif).
import type { TemplatePageContent } from './page.types';

export const content: TemplatePageContent = {
  lead:
    '{nama} adalah template website untuk toko aksesori HP: casing, tempered glass, charger, kabel data, earphone, dan power bank. Pembeli memilih merek dan tipe HP-nya lalu langsung melihat aksesori yang cocok, tanpa bertanya satu per satu ke admin. Ada juga paket bundling hemat dan pratinjau casing custom dengan foto pembeli sendiri.',
  suitableFor: {
    intro:
      'Pilih {nama} bila pertanyaan yang paling sering masuk ke chat toko Anda adalah "ada untuk HP saya?". Website menjawabnya lebih dulu, lalu pembeli memesan lewat WhatsApp dengan nama produk, harga, dan tipe HP di pesannya. Template ini tidak punya keranjang belanja maupun pembayaran online.',
    items: [
      'Toko aksesori HP di ruko, mal, atau pusat elektronik yang ingin punya katalog online.',
      'Penjual di Shopee atau Tokopedia yang ingin website dengan nama tokonya sendiri.',
      'Usaha casing custom dan cetak foto yang ingin pembeli mencoba desainnya sebelum memesan.',
      'Grosir aksesori yang menawarkan paket bundling untuk konter HP dan reseller.',
    ],
  },
  parts: [
    {
      name: 'Bilah pengumuman & menu atas',
      text: 'Bilah hitam untuk promo seperti gratis ongkir atau COD, lalu menu putih yang menempel saat digulir dengan tombol cari dan Chat Admin. Di HP menu dilipat.',
    },
    {
      name: 'Pencarian di menu',
      text: 'Ketik "a55", "charger", atau nama paket. Hasil berupa tipe HP langsung membuka pencarian per tipe dengan tipe itu terpilih.',
    },
    {
      name: 'Hero (bagian pembuka)',
      text: 'Kartu gelap dengan foto produk, judul berkata sorotan warna aksen, dua tombol, kartu contoh casing custom, kartu rating toko, dan baris merek HP otomatis dari daftar tipe.',
    },
    {
      name: 'Cari per tipe HP',
      text: 'Pilih merek, lalu tipe (hingga 40 tipe di CMS, lengkap dengan port pengisian). Produk yang cocok tampil dengan tombol pesan berisi nama produk dan tipe HP; kategori yang belum tersedia untuk tipe itu disebutkan.',
    },
    { name: 'Kategori', text: 'Hingga 6 kartu foto besar berlabel. Klik kartu, daftar produk di bawahnya langsung tersaring ke kategori tersebut.' },
    {
      name: 'Produk terbaru',
      text: 'Hingga 16 produk dalam baris yang bisa digeser, dengan penyaring kategori, harga coret, label diskon otomatis, rating, jumlah terjual, dan tombol pesan WhatsApp.',
    },
    {
      name: 'Bundling hemat',
      text: 'Hingga 4 paket: daftar barang berikon, harga paket, harga normal dicoret, dan label "Hemat Rp…" yang dihitung otomatis. Paket berlabel pertama tampil gelap.',
    },
    {
      name: 'Custom casing',
      text: 'Mockup casing tempat pengunjung memilih foto dari perangkatnya, menggeser dan memperbesarnya, memilih warna casing dan tipe HP, lalu memesan lewat WhatsApp.',
    },
    { name: 'Strip layanan', text: 'Panel hitam dengan hingga 4 keunggulan toko dan ikon otomatis dari judulnya.' },
    { name: 'Ulasan pembeli', text: 'Ringkasan rating toko dan hingga 6 ulasan dengan bintang, produk yang dibeli, nama, dan foto atau inisial.' },
    { name: 'Tanya jawab', text: 'Hingga 8 pertanyaan yang bisa dibuka-tutup, ditemani kartu bantuan dengan tombol WhatsApp.' },
    { name: 'Kontak & toko', text: 'Alamat dengan tautan peta, jam buka, telepon, email, WhatsApp, serta tautan ke toko Anda di Shopee dan Tokopedia.' },
    { name: 'Footer', text: 'Panel hitam berisi menu belanja per kategori, menu bantuan, kontak, metode pembayaran, dan media sosial.' },
  ],
  partsNote: 'Setiap bagian bisa disembunyikan dari CMS, misalnya Custom Casing bila toko Anda belum menawarkannya.',
  cms: [
    'Nama toko, tagline, logo, warna aksen, dan teks pengumuman di bilah atas.',
    'Daftar merek dan tipe HP beserta port pengisiannya, yang dipakai pencarian per tipe dan baris merek di hero.',
    'Produk lengkap dengan foto, kategori, harga, harga coret, label, rating, jumlah terjual, dan kolom "Cocok untuk".',
    'Kategori berfoto, paket bundling dan isinya, serta foto contoh, harga, dan langkah layanan custom casing.',
    'Keunggulan toko, ulasan pembeli, dan tanya jawab.',
    'Nomor WhatsApp dan pesan awal, alamat, jam buka, tautan Shopee dan Tokopedia, metode pembayaran, dan media sosial.',
  ],
  cmsNote:
    'Kolom "Cocok untuk" diisi tipe HP (misalnya Galaxy A55), merek (Samsung), port (USB-C atau Lightning), atau "Semua HP"; dari kolom inilah pencarian per tipe memilih produk.',
  demo: [
    'Demo {nama} memakai toko fiktif GadgetKu.id di Depok dengan 19 tipe HP dari enam merek dan 11 produk, dari casing hingga power bank. Coba pilih Samsung lalu Galaxy A55 untuk melihat hasilnya tersaring.',
    'Nama pembeli, rating, jumlah terjual, dan harga di demo hanyalah contoh. Foto yang dipilih pengunjung di bagian custom casing hanya tampil di browser mereka, tidak dikirim ke server Anda; pembeli mengirim fotonya lewat chat WhatsApp saat memesan, lalu Anda yang memeriksa hasil cetaknya.',
  ],
  custom:
    '{nama} menampilkan katalog dan mengarahkan pesanan ke WhatsApp. Bila toko Anda butuh keranjang belanja dengan pembayaran online, ongkos kirim otomatis, stok yang tersambung ke marketplace, atau aplikasi untuk reseller, fitur itu termasuk website atau aplikasi custom. Ceritakan alur penjualan toko Anda, lalu kami kirim penawaran setelah konsultasi gratis.',
  mobileLink: true,
  faq: [
    {
      question: 'Bisakah pembeli checkout dan membayar langsung di website?',
      answer:
        'Belum. {nama} tidak punya keranjang dan pembayaran online. Tombol pesan membuka WhatsApp dengan nama produk, harga, dan tipe HP pembeli, lalu pembayaran Anda konfirmasi sendiri, misalnya transfer, QRIS, atau COD.',
    },
    {
      question: 'Bagaimana cara menambah tipe HP baru di pencarian?',
      answer:
        'Tambahkan merek, tipe, dan port pengisiannya di daftar tipe HP pada CMS, lalu tulis tipe tersebut di kolom "Cocok untuk" pada casing dan tempered glass yang sesuai. Produk bertuliskan "Semua HP" otomatis ikut tampil.',
    },
    {
      question: 'Apakah foto custom casing dari pembeli tersimpan di server saya?',
      answer:
        'Tidak. Foto hanya dibaca di browser pengunjung untuk pratinjau dan hilang saat halaman ditutup. Pembeli mengirim fotonya lewat chat WhatsApp ketika memesan, jadi Anda tetap bisa memeriksa resolusi foto sebelum mencetak.',
    },
    {
      question: 'Apakah stok bisa tersambung dengan Shopee atau Tokopedia?',
      answer:
        'Tidak otomatis. Bagian kontak menampilkan tautan toko Anda di Shopee dan Tokopedia, dan tiap produk boleh diberi tautan ke halaman marketplace-nya. Stok tetap dikonfirmasi admin saat chat; sinkronisasi stok bisa dibuat lewat jasa custom.',
    },
    {
      question: 'Bisakah dipakai untuk toko selain aksesori HP?',
      answer:
        'Bisa, selama barangnya dipilih per tipe perangkat, misalnya aksesori laptop atau tali smartwatch. Daftar tipe, kategori, judul bagian, dan warna bisa Anda ganti dari CMS.',
    },
  ],
  imageAlts: {
    'gadgetku-preview.webp': 'Tampilan beranda template website toko aksesori HP {nama} di desktop dan HP dengan hero kartu gelap',
    'gadgetku-1.webp': 'Bagian cari aksesori per tipe HP template {nama} dengan hasil untuk Samsung Galaxy A55',
    'gadgetku-2.webp': 'Bagian custom casing template {nama} dengan mockup casing berisi foto dan pilihan warna',
  },
  guides: ['template-vs-jasa-website-custom', 'biaya-website-company-profile'],
};
