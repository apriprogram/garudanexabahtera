// Isi halaman /template/glowstory. Sumber fakta: src/templates/glowstory (schema.ts, GlowStory.tsx, Header.tsx,
// Products.tsx, Quiz.tsx, Refill.tsx, Reviews.tsx, store.tsx). Klaim wajib jujur: keranjang hanya daftar belanja di
// halaman yang dikirim sebagai pesanan WhatsApp, TANPA checkout, pembayaran online, stok, atau penagihan langganan
// otomatis; kuis = saran umum, bukan diagnosis; tanpa klaim medis atau hasil pada kulit. Demo: Seruni Beauty,
// Yogyakarta (fiktif), merek dan produknya juga fiktif. Kata kunci: lihat glowstory.ts.
import type { TemplatePageContent } from './page.types';

export const content: TemplatePageContent = {
  lead:
    '{nama} adalah template website toko skincare untuk Anda yang menjual skincare, makeup, dan perawatan tubuh, terutama dari brand lokal. Sebagai website toko kecantikan, halamannya sudah berisi katalog produk dengan daftar belanja yang dikirim lewat WhatsApp, kuis jenis kulit, kalkulator langganan isi ulang, dan ulasan pelanggan berfoto yang membuat pembeli kembali lagi.',
  suitableFor: {
    intro:
      'Pilih {nama} bila Anda butuh website toko kosmetik online yang membantu pembeli memilih sebelum memesan: mereka sering bertanya "produk mana yang cocok untuk kulit saya?", dan sebagian produk Anda cepat habis sehingga layak dilanggan. Pesanan masuk ke WhatsApp sebagai daftar belanja yang rapi. Template ini tidak memproses pembayaran online.',
    items: [
      'Toko skincare dan makeup yang mengkurasi produk dari beberapa brand lokal.',
      'Brand kecantikan lokal yang ingin punya website toko skincare lokal sendiri, terpisah dari marketplace.',
      'Reseller atau distributor resmi perawatan tubuh dan wewangian.',
      'Klinik atau salon yang juga menjual produk perawatan untuk dipakai di rumah.',
    ],
  },
  parts: [
    {
      name: 'Menu atas & daftar belanja',
      text: 'Tautan bagian di kiri, logo di tengah, serta tombol cari dan tombol keranjang yang menampilkan jumlah barang di daftar belanja. Di HP menu dilipat.',
    },
    {
      name: 'Pencarian di menu',
      text: 'Pengunjung mengetik "sunscreen" atau "kulit berminyak" lalu langsung diarahkan ke bagian yang cocok.',
    },
    {
      name: 'Hero (bagian pembuka)',
      text: 'Judul besar dengan satu kata miring berwarna, tombol belanja, tautan ke kuis, dan kolase tiga foto dengan kartu produk unggulan.',
    },
    { name: 'Strip berjalan', text: 'Pita gelap berisi hingga 8 keunggulan toko, misalnya gratis ongkir atau kemasan isi ulang, yang bergerak pelan.' },
    {
      name: 'Kategori',
      text: 'Hingga 4 kartu foto kategori. Tombolnya langsung menyaring daftar produk sesuai kategori yang dipilih.',
    },
    {
      name: 'Produk terlaris',
      text: 'Hingga 12 kartu produk dengan merek, harga, harga coret, rating, dan label seperti "Terlaris" atau "-20%", plus tombol saring per kategori.',
    },
    {
      name: 'Kuis jenis kulit',
      text: 'Dua sampai empat pertanyaan pilihan ganda. Hasilnya satu dari hingga 4 tipe kulit, lengkap dengan rutinitas pagi dan malam beserta harga produknya.',
    },
    {
      name: 'Langganan isi ulang',
      text: 'Pengunjung memilih satu dari hingga 6 produk dan satu dari hingga 4 jadwal kirim. Harga per kiriman, hemat per kiriman, dan perkiraan hemat setahun langsung dihitung.',
    },
    { name: 'Ulasan berfoto', text: 'Ringkasan rating dan hingga 6 ulasan; foto pelanggan bisa diperbesar.' },
    { name: 'Brand lokal', text: 'Strip hingga 12 nama atau logo brand yang Anda jual, lengkap dengan kota asalnya.' },
    { name: 'Tanya jawab', text: 'Hingga 8 pertanyaan yang bisa dibuka-tutup, dengan kartu bantuan dan tombol WhatsApp di sampingnya.' },
    { name: 'Ajakan, kontak & footer', text: 'Pita ajakan berwarna aksen, kartu kontak (telepon, email, jam layanan, alamat gudang), lalu footer dengan menu dan media sosial.' },
  ],
  partsNote:
    'Keranjang di sini adalah daftar belanja di halaman, bukan sistem checkout: isinya hilang saat halaman ditutup, dan tidak ada stok atau pembayaran otomatis. Tombol "Pesan lewat WhatsApp" mengirim daftar barang, jumlah, dan subtotal ke nomor toko; ongkir dan pembayaran tetap Anda konfirmasi di chat.',
  cms: [
    'Nama toko, tagline, logo, dan satu warna aksen untuk tombol, label diskon, dan kata miring di judul.',
    'Foto kolase hero, kartu produk unggulan, angka rating, dan isi strip berjalan.',
    'Kategori dan produk lengkap dengan foto, merek, harga, harga coret, rating, label, dan tautan marketplace bila ada.',
    'Pertanyaan kuis, tipe kulit, serta rutinitas pagi dan malam dengan format satu baris per langkah.',
    'Produk langganan, jadwal kirim, potongan per jadwal, dan keuntungan berlangganan.',
    'Ulasan dan foto pelanggan, daftar brand, tanya jawab, nomor WhatsApp, dan tautan media sosial.',
  ],
  cmsNote:
    'Poin kuis diatur dari urutan jawaban: jawaban pertama setiap pertanyaan memberi poin untuk tipe kulit pertama, dan seterusnya. Produk tanpa harga angka tetap tampil, tetapi tombolnya berubah menjadi "Tanya produk".',
  demo: [
    'Demo {nama} memakai Seruni Beauty, toko kecantikan fiktif di Yogyakarta, dengan delapan produk dari enam brand lokal fiktif: serum niasinamida, pelembap gel, sunscreen, gel pembersih, lipstik, bedak tabur, losion tubuh, dan lulur kopi. Kuis contohnya membedakan kulit kering, berminyak, kombinasi, dan sensitif.',
    'Nama pengulas, angka ulasan, dan harga di demo hanyalah contoh. Hasil kuis adalah saran umum, bukan diagnosis, dan template ini tidak menjanjikan hasil apa pun pada kulit. Tulis manfaat produk sesuai izin edarnya, dan pakai ulasan atau foto pelanggan hanya dengan persetujuan mereka.',
  ],
  custom:
    '{nama} cocok untuk toko yang melayani pesanan lewat chat. Bila Anda membutuhkan pembayaran online, stok yang berkurang otomatis, akun pelanggan dengan riwayat pesanan, ongkir otomatis per kurir, atau langganan yang menagih sendiri setiap bulan, fitur itu termasuk website atau aplikasi custom. Ceritakan alur penjualan toko Anda, lalu kami kirim penawaran setelah konsultasi gratis.',
  mobileLink: true,
  faq: [
    {
      question: 'Apakah pembeli bisa membayar langsung di website?',
      answer:
        'Belum. Pembeli memasukkan produk ke keranjang lalu menekan "Pesan lewat WhatsApp"; daftar barang dan subtotalnya terkirim ke nomor Anda. Ongkir dan pembayaran Anda konfirmasi di chat. Pembayaran online bisa ditambahkan lewat jasa custom.',
    },
    {
      question: 'Bagaimana cara mengatur hasil kuis jenis kulit?',
      answer:
        'Di CMS Anda menulis 2–4 pertanyaan dan hingga 4 tipe kulit. Jawaban ke-1 setiap pertanyaan memberi poin untuk tipe ke-1, jawaban ke-2 untuk tipe ke-2, dan seterusnya. Rutinitas ditulis satu baris per langkah, misalnya "Serum | Serum Niasinamida | Rp119.000".',
    },
    {
      question: 'Apakah langganan isi ulang menagih pembeli secara otomatis?',
      answer:
        'Tidak. Kalkulator menunjukkan harga per kiriman dan perkiraan hemat setahun, lalu tombolnya membuka WhatsApp berisi produk dan jadwal yang dipilih. Template ini tidak menagih otomatis; pengingat dan pembayaran tiap kiriman tetap Anda atur sendiri.',
    },
    {
      question: 'Bisakah produk diarahkan ke Shopee atau Tokopedia?',
      answer:
        'Bisa. Isi tautan beli di setiap produk, maka tombol keranjangnya berubah menjadi tombol "Beli" yang membuka halaman produk Anda di marketplace.',
    },
    {
      question: 'Apakah foto di demo boleh saya pakai?',
      answer:
        'Foto demo berasal dari Unsplash dan hanya contoh suasana. Ganti dengan foto produk Anda sendiri lewat CMS agar pembeli melihat kemasan yang sebenarnya.',
    },
  ],
  imageAlts: {
    'glowstory-preview.webp': 'Tampilan beranda template website toko skincare {nama} di desktop dan HP dengan kolase foto produk perawatan kulit',
    'glowstory-1.webp': 'Bagian produk terlaris template {nama} dengan kartu serum, pelembap, sunscreen, dan tombol keranjang',
    'glowstory-2.webp': 'Kuis jenis kulit template {nama} yang menampilkan hasil rutinitas pagi dan malam beserta harga produknya',
  },
  guides: ['template-vs-jasa-website-custom', 'biaya-website-company-profile'],
};
