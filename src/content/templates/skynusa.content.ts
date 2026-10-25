// Isi halaman /template/skynusa. Sumber fakta: src/templates/skynusa (schema.ts, SkyNusa.tsx, Header.tsx, Hero.tsx,
// Categories.tsx, Products.tsx, Bundles.tsx, Rental.tsx, Warranty.tsx, Academy.tsx). Kata kunci: "template website
// toko drone" di paragraf pembuka, "website toko drone", "website toko online drone", dan "website sewa drone" di isi.
// Klaim wajib jujur: keranjang dan kalkulator sewa hanya menyusun pesan WhatsApp, TANPA pembayaran online, stok
// otomatis, atau kalender sewa. Kata "garansi" tidak dipakai di salinan halaman (uji klaim jujur); bagian itu disebut
// "servis lokal". Demo: SkyNusa, Jakarta (fiktif).
import type { TemplatePageContent } from './page.types';

export const content: TemplatePageContent = {
  lead:
    '{nama} adalah template website toko drone untuk penjual drone, penyedia sewa drone, dan bengkel servis drone yang ingin tampil rapi seperti lembar spesifikasi produk. Kartu produk berharga, paket bundling, kalkulator sewa harian, layanan servis, dan kelas terbang sudah tersusun; Anda tinggal mengganti foto, harga, dan isi paket dengan dagangan toko sendiri.',
  suitableFor: {
    intro:
      'Pilih {nama} bila Anda butuh website toko drone yang sederhana: calon pembeli membandingkan beberapa drone, menanyakan isi paket, atau mencoba lewat sewa sebelum membeli. Mereka memilih menurut kebutuhan (foto, video pernikahan, atau pemetaan lahan), lalu mengirim pesanan ke WhatsApp toko. Pembayaran dan stok tetap Anda konfirmasi di chat.',
    items: [
      'Toko atau reseller drone yang ingin website toko online drone sederhana untuk unit, aksesori, dan paket hemat.',
      'Penyedia sewa drone harian yang butuh website sewa drone dengan perkiraan biaya per hari.',
      'Bengkel servis drone yang juga menjual unit dan suku cadang.',
      'Toko kamera atau penyedia jasa foto udara yang ingin menambah lini drone.',
    ],
  },
  parts: [
    { name: 'Menu atas', text: 'Logo atau simbol drone bawaan, tautan bagian, tombol keranjang dengan jumlah barang, dan tombol konsultasi; di HP menu dilipat.' },
    {
      name: 'Keranjang pesanan',
      text: 'Pengunjung menambah drone atau paket dan mengubah jumlahnya; isinya beserta perkiraan total dikirim sebagai pesan WhatsApp, bukan pembayaran online.',
    },
    {
      name: 'Hero (bagian pembuka)',
      text: 'Kanvas abu berkisi tipis dengan judul dua nada, dua tombol, foto drone dengan hingga 3 kartu angka spesifikasi, dan strip 4 keunggulan toko.',
    },
    { name: 'Kategori per kebutuhan', text: 'Hingga 4 kartu foto, misalnya foto, wedding, dan pemetaan, dengan garis teknis. Klik kartu langsung menyaring daftar drone.' },
    {
      name: 'Drone pilihan',
      text: 'Hingga 8 kartu produk dengan foto, label, tiga spesifikasi singkat, harga, harga coret dengan keterangan hemat, tombol keranjang, dan tautan tanya stok.',
    },
    {
      name: 'Paket bundling',
      text: 'Pita gelap berisi hingga 3 paket, misalnya drone ditambah tas dan baterai cadangan, lengkap dengan daftar isi dan selisih harga dibanding beli satuan.',
    },
    {
      name: 'Sewa harian',
      text: 'Kalkulator untuk hingga 6 unit: pilih unit, tanggal mulai, dan lama sewa sampai 30 hari, lalu lihat tanggal kembali, potongan, dan estimasi total.',
    },
    {
      name: 'Servis lokal',
      text: 'Foto bengkel dengan hingga 4 kartu angka, misalnya masa layanan servis dan estimasi pengerjaan, ditambah catatan pengecualian dan tombol klaim.',
    },
    { name: 'Kelas terbang', text: 'Panel gelap dengan foto latihan, hingga 4 sesi bernomor, jadwal, lokasi, dan tombol daftar kelas.' },
    { name: 'Cerita pelanggan', text: 'Hingga 6 kutipan pelanggan dengan nama, keterangan, dan foto atau inisial.' },
    { name: 'Tanya jawab', text: 'Hingga 8 pertanyaan yang bisa dibuka-tutup, dengan kartu bantuan WhatsApp.' },
    { name: 'Ajakan & kontak', text: 'Panel foto dengan tombol WhatsApp, lalu alamat, telepon, email, jam buka, dan peta Google Maps.' },
  ],
  partsNote: 'Setiap bagian bisa disembunyikan dari CMS, misalnya Sewa harian bila toko tidak menyewakan unit.',
  cms: [
    'Nama toko, tagline, logo, dan satu warna aksen yang otomatis dipucatkan menjadi mint di pita gelap.',
    'Judul, foto drone, kartu angka spesifikasi, dan empat keunggulan di bagian pembuka.',
    'Produk dengan foto, harga, harga coret, label, spesifikasi, dan kebutuhan yang cocok untuk filter.',
    'Isi dan harga paket, tarif sewa per hari, potongan sewa panjang, dan catatan jaminan.',
    'Kartu angka servis, sesi kelas terbang, cerita pelanggan, dan tanya jawab.',
    'Nomor WhatsApp untuk semua tombol pesan, alamat, link Google Maps, dan media sosial.',
  ],
  cmsNote:
    'Ikon dan garis teknis dipilih otomatis dari judul, dan total keranjang dihitung dari harga yang Anda tulis, jadi tulis harga lengkap seperti Rp12.900.000.',
  demo: [
    'Demo {nama} memakai SkyNusa, toko drone fiktif di Jakarta Selatan, dengan empat drone contoh: drone mini untuk pemula, drone lipat 4K untuk foto dan wedding, drone sinema dua kamera, dan drone pemetaan dengan modul RTK. Tiga paket contoh memperlihatkan cara menampilkan isi paket dan selisih harganya dibanding membeli satuan.',
    'Nama produk sengaja dibuat umum tanpa merek, dan semua harga, spesifikasi, serta tarif sewa di demo hanyalah contoh. Tulis ketentuan toko Anda apa adanya, termasuk apa yang tidak ditanggung layanan servis. Soal aturan terbang, tanya jawab demo mengarahkan pengunjung ke peraturan yang berlaku.',
  ],
  custom:
    '{nama} menampilkan katalog dan mengarahkan pesanan ke WhatsApp. Bila toko Anda butuh pembayaran online, stok yang berkurang otomatis, ongkos kirim per kota, kalender ketersediaan unit sewa, atau tiket servis yang bisa dilacak pelanggan, fitur itu termasuk website atau aplikasi custom. Ceritakan alur penjualan dan sewa di toko Anda, lalu kami kirim penawaran setelah konsultasi gratis.',
  mobileLink: true,
  faq: [
    {
      question: 'Apakah pembeli bisa membayar langsung di website?',
      answer:
        'Belum. Keranjang di {nama} menyusun daftar barang dan perkiraan total, lalu membuka chat WhatsApp ke nomor toko. Pembayaran, ongkos kirim, dan stok Anda konfirmasi di chat itu. Pembayaran online bisa dibuat lewat jasa custom.',
    },
    {
      question: 'Bagaimana kalkulator sewa harian bekerja?',
      answer:
        'Pengunjung memilih unit, tanggal mulai, dan lama sewa. Tarif per hari, minimal hari untuk potongan, dan besar potongannya Anda isi sendiri di CMS. Hasilnya berupa estimasi biaya dan tanggal kembali yang ikut terkirim di pesan WhatsApp; {nama} tidak punya kalender ketersediaan unit.',
    },
    {
      question: 'Bisakah dipakai untuk toko yang hanya menyewakan drone?',
      answer:
        'Bisa. Sembunyikan bagian Drone pilihan dan Paket bundling, lalu tonjolkan Sewa harian dan Kelas terbang sehingga halaman menjadi website sewa drone. Tombol di bagian pembuka juga bisa diarahkan ke kalkulator sewa.',
    },
    {
      question: 'Apakah foto produk harus berlatar putih?',
      answer:
        'Tidak harus. Foto berlatar putih menyatu dengan panggung abu sehingga tampak seperti produk terpotong, sedangkan foto berlatar langit tetap tampil penuh. Gunakan foto unit yang benar-benar Anda jual.',
    },
    {
      question: 'Bagaimana filter kebutuhan di daftar drone diatur?',
      answer:
        'Setiap kategori punya label filter singkat, misalnya Foto atau Wedding. Tulis label yang sama di isian "Cocok untuk" pada produk, pisahkan dengan koma bila satu drone cocok untuk beberapa kebutuhan.',
    },
  ],
  imageAlts: {
    'skynusa-preview.webp': 'Tampilan beranda template website toko drone {nama} di desktop dan HP dengan foto drone dan kartu spesifikasi',
    'skynusa-1.webp': 'Bagian drone pilihan template {nama} dengan filter kebutuhan dan kartu produk berharga',
    'skynusa-2.webp': 'Bagian sewa harian template {nama} dengan kalkulator unit, tanggal, lama sewa, dan estimasi total',
  },
  guides: ['template-vs-jasa-website-custom', 'biaya-website-company-profile'],
};
