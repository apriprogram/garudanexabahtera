// Isi halaman /template/puncakgear. Sumber fakta: src/templates/puncakgear (schema.ts, PuncakGear.tsx, Header.tsx,
// Hero.tsx, Categories.tsx, Products.tsx, Guides.tsx, Rental.tsx, Safety.tsx, Faq.tsx). Klaim wajib jujur: pesanan dan
// sewa lewat WhatsApp, TANPA keranjang belanja, pembayaran online, stok, atau booking; info jalur di demo bukan sumber
// resmi. Demo: Tapak Rimba Outdoor, Malang (fiktif).
import type { TemplatePageContent } from './page.types';

export const content: TemplatePageContent = {
  lead:
    '{nama} adalah template website untuk toko perlengkapan mendaki dan penyewaan alat camping yang ingin tampil gagah sekaligus membantu calon pembeli bersiap. Selain kategori dan produk terlaris, ada panduan per gunung dengan daftar perlengkapan yang bisa dicentang dan kalkulator sewa untuk pendaki pemula, jadi pengunjung tahu apa yang harus dibeli atau disewa sebelum menghubungi Anda.',
  suitableFor: {
    intro:
      'Pilih {nama} bila pelanggan Anda sering bertanya "untuk ke Rinjani perlu bawa apa?" atau "sewa tenda tiga hari berapa?". Jawaban itu sudah tersedia di halaman, lalu pengunjung tinggal mengirim daftar yang rapi lewat WhatsApp. Template ini tidak punya keranjang belanja maupun pembayaran online; transaksi tetap Anda konfirmasi sendiri.',
    items: [
      'Toko outdoor yang menjual tenda, carrier, sleeping bag, sepatu gunung, dan perlengkapan darurat.',
      'Penyewaan alat camping dan mendaki yang ingin menampilkan harga sewa per hari.',
      'Basecamp di kaki gunung yang juga menjual atau menyewakan perlengkapan.',
      'Komunitas atau operator open trip yang ingin membagikan daftar perlengkapan per gunung.',
    ],
  },
  parts: [
    {
      name: 'Menu atas',
      text: 'Logo atau simbol puncak bawaan, tautan bagian dengan garis aksen di bagian yang sedang dibaca, tombol sewa, dan tombol cari; di HP menu dilipat.',
    },
    {
      name: 'Pencarian di menu',
      text: 'Pengunjung mengetik kata seperti "tenda" atau "Semeru", lalu diarahkan ke produk, gunung, alat sewa, tips, atau pertanyaan yang cocok. Memilih gunung langsung membuka panduannya.',
    },
    {
      name: 'Hero (bagian pembuka)',
      text: 'Foto selebar layar dengan judul huruf kapital besar, tombol pil warna aksen, tautan sewa, keterangan lokasi, kartu produk putih, serta kalimat besar dan satu angka di bagian bawah.',
    },
    { name: 'Kategori', text: 'Hingga 6 kartu foto tegak. Klik kartu menggulir ke produk dan langsung menyaring produk dengan kategori yang sama.' },
    {
      name: 'Produk terlaris',
      text: 'Hingga 12 kartu produk dengan foto, label, rating, harga, dan harga coret, plus chip filter kategori. Tombol Pesan membuka WhatsApp berisi nama dan harga produk.',
    },
    {
      name: 'Panduan per gunung',
      text: 'Hingga 6 kartu gunung. Gunung terpilih membuka panel berisi ketinggian, lama pendakian, tingkat kesulitan, jalur populer, catatan keselamatan, dan daftar perlengkapan yang bisa dicentang.',
    },
    {
      name: 'Sewa alat',
      text: 'Bagian gelap berisi syarat sewa dan kalkulator: pilih hingga 10 alat dan lama sewa 1–14 hari, total dan diskon lama sewa dihitung otomatis lalu dikirim lewat WhatsApp.',
    },
    { name: 'Tips keselamatan', text: 'Hingga 8 tips bernomor dengan ikon otomatis, foto, dan kartu nomor darurat.' },
    { name: 'Cerita pendaki', text: 'Hingga 6 kutipan pelanggan dengan nama, keterangan gunung, dan foto atau inisial.' },
    { name: 'Tanya jawab', text: 'Hingga 8 pertanyaan yang bisa dibuka-tutup, dengan kartu konsultasi WhatsApp di sampingnya.' },
    { name: 'Basecamp & footer', text: 'Alamat, telepon, email, jam buka, tombol WhatsApp, peta Google Maps, lalu footer gelap dengan menu dan media sosial.' },
  ],
  partsNote: 'Centang perlengkapan dan pilihan di kalkulator hanya tersimpan di peramban pengunjung selama halaman dibuka; tidak ada data yang dikirim sebelum pengunjung menekan tombol WhatsApp.',
  cms: [
    'Nama toko, tagline, logo, dan satu warna aksen untuk tombol, chip, centang, dan garis kontur.',
    'Foto, judul, tombol, kartu produk, kalimat besar, dan angka di hero.',
    'Kategori dan produk lengkap dengan kategori, harga, harga coret, label, rating, foto, dan tautan marketplace bila ada.',
    'Daftar gunung: lokasi, ketinggian, lama pendakian, jalur, catatan keselamatan, perlengkapan, dan tautan info resmi.',
    'Alat sewa beserta harga per hari, syarat sewa, serta diskon untuk sewa beberapa hari.',
    'Tips keselamatan, nomor darurat, cerita pendaki, tanya jawab, nomor WhatsApp, alamat basecamp, dan media sosial.',
  ],
  cmsNote:
    'Kalkulator membaca angka dari kolom harga sewa, jadi tulis harga seperti Rp35.000. Ikon kategori, alat sewa, dan tips dipilih otomatis dari namanya.',
  demo: [
    'Demo {nama} memakai Tapak Rimba Outdoor, toko dan basecamp sewa fiktif di Malang. Ada lima kategori, delapan produk, panduan untuk Rinjani, Semeru, Prau, Merbabu, dan Sindoro, serta delapan alat sewa dengan diskon untuk sewa empat hari atau lebih.',
    'Nama pelanggan, harga, dan rating di demo hanyalah contoh. Info jalur di panduan bersifat umum dan bukan sumber resmi: status pendakian bisa berubah, jadi setiap panduan sebaiknya menyarankan pengunjung mengecek pengumuman pengelola gunung, seperti yang dilakukan demo.',
  ],
  custom:
    '{nama} menampilkan katalog dan mengarahkan pesanan ke WhatsApp. Bila toko Anda butuh keranjang belanja, pembayaran online, stok yang berkurang otomatis, jadwal sewa dengan cek ketersediaan, atau aplikasi untuk pelanggan, fitur itu termasuk website atau aplikasi custom. Ceritakan alur penjualan dan penyewaan di toko Anda, lalu kami kirim penawaran setelah konsultasi gratis.',
  mobileLink: true,
  faq: [
    {
      question: 'Apakah pembeli bisa checkout dan membayar langsung di website?',
      answer:
        'Belum. Tombol Pesan di setiap produk membuka WhatsApp berisi nama dan harga produk, lalu Anda mengonfirmasi stok, ongkir, dan pembayaran di chat. Bila butuh keranjang dan pembayaran online, fitur itu bisa dibuat lewat jasa custom.',
    },
    {
      question: 'Bagaimana kalkulator sewa menghitung biaya?',
      answer:
        'Pengunjung mencentang alat dan memilih lama sewa. Harga per hari semua alat terpilih dikalikan jumlah hari, lalu dipotong diskon bila lama sewa mencapai batas yang Anda atur. Hasilnya perkiraan; daftar alat dan totalnya ikut terkirim di pesan WhatsApp.',
    },
    {
      question: 'Bisakah saya menambah gunung lain di panduan?',
      answer:
        'Bisa, hingga enam gunung. Isi nama, lokasi, ketinggian, lama pendakian, jalur, catatan keselamatan, dan perlengkapan satu baris satu barang. Tambahkan juga tautan info resmi pengelola agar pengunjung bisa mengecek status jalur terbaru.',
    },
    {
      question: 'Apakah foto di demo boleh saya pakai?',
      answer:
        'Foto demo berasal dari Unsplash dan hanya contoh suasana. Sebaiknya ganti dengan foto produk dan basecamp Anda sendiri lewat CMS, supaya pembeli melihat barang yang benar-benar Anda jual.',
    },
    {
      question: 'Toko saya hanya menyewakan alat. Apakah tetap cocok?',
      answer:
        'Cocok. Sembunyikan bagian Produk dan Kategori dari CMS, lalu tonjolkan Sewa Alat dan Panduan per gunung. Teks tombol di menu dan hero bisa diganti, misalnya menjadi "Cek Harga Sewa".',
    },
  ],
  imageAlts: {
    'puncakgear-preview.webp': 'Tampilan beranda template website toko perlengkapan mendaki {nama} di desktop dan HP dengan hero foto pendaki di puncak bukit',
    'puncakgear-1.webp': 'Bagian produk terlaris template {nama} dengan filter kategori dan kartu tenda, carrier, sleeping bag, serta sepatu gunung',
    'puncakgear-2.webp': 'Bagian panduan per gunung template {nama} dengan kartu Rinjani, Semeru, dan Prau serta daftar perlengkapan yang bisa dicentang',
  },
  guides: ['template-vs-jasa-website-custom', 'biaya-website-company-profile'],
};
