// Isi halaman /template/lajur. Sumber fakta: src/templates/lajur (schema.ts, Lajur.tsx, Header.tsx, Hero.tsx, Quote.tsx,
// Fleet.tsx, Convoy.tsx, Film.tsx, Routes.tsx, Plan.tsx, Stories.tsx, Closing.tsx, Footer.tsx, model.ts). Kata kunci:
// "template website sewa bus pariwisata" di paragraf pembuka; "website PO bus pariwisata" dan "website rental bus" di isi.
// Klaim wajib jujur: data demo fiktif, harga contoh, formulir hanya menyusun pesan WhatsApp (harga final dan ketersediaan
// armada dikonfirmasi admin), tidak ada pembayaran online, e-tiket, ketersediaan armada real-time, akun member, atau
// pelacakan GPS. Tanpa merek/model kendaraan dan tanpa klaim izin, asuransi, atau sertifikat.
// Demo: Lajur Trans Wisata (fiktif), garasi di Semarang, rombongan ke Jawa, Bali, dan Madura.
import type { TemplatePageContent } from './page.types';

export const content: TemplatePageContent = {
  lead: '{nama} adalah template website sewa bus pariwisata untuk PO dan usaha rental bus yang melayani rombongan sekolah, kantor, dan keluarga. Pengunjung langsung mengisi jumlah peserta, tanggal, tujuan, dan lama sewa di halaman depan, melihat rekomendasi armada, lalu mengirim permintaan penawaran lewat WhatsApp.',
  suitableFor: {
    intro:
      'Pilih {nama} bila calon penyewa biasanya bertanya hal yang sama: berapa bus untuk sekian peserta, berapa harganya, dan apa saja yang sudah termasuk. Website PO bus pariwisata ini menjawabnya dengan gambar armada, kalkulator rombongan, dan daftar biaya yang jelas.',
    items: [
      'PO bus pariwisata yang menyewakan big bus, medium bus, dan microbus dengan sopir.',
      'Usaha rental bus yang sering menerima rombongan study tour, gathering kantor, dan ziarah.',
      'Pemilik armada kecil yang ingin website rental bus yang rapi tanpa sistem pemesanan rumit.',
      'Biro perjalanan yang punya armada sendiri dan ingin menampilkan tujuan favorit beserta harganya.',
    ],
  },
  parts: [
    {
      name: 'Menu atas',
      text: 'Bilah putih dengan garis amber, logo atau simbol jalan bawaan, menu Armada, Rombongan, Tujuan, Harga, FAQ, dan Kontak, nomor telepon, serta tombol Minta penawaran.',
    },
    {
      name: 'Hero & bilah penawaran',
      text: 'Foto besar sebagai latar, judul dengan kata yang disorot, dua tombol, dan bilah berisi jumlah peserta, tanggal berangkat, tujuan, serta lama sewa. Rekomendasi armada muncul langsung dari jumlah peserta.',
    },
    {
      name: 'Armada',
      text: 'Hingga 6 jenis bus dalam tab, masing-masing dengan gambar bus bawaan atau foto Anda, jumlah kursi, susunan kursi, denah kursi, fasilitas berikon, dan harga mulai.',
    },
    {
      name: 'Kalkulator rombongan',
      text: 'Penggeser 10 sampai 300 peserta yang menyusun kombinasi bus dengan jumlah bus paling sedikit, lengkap dengan sisa kursi, perkiraan harga (satuan mengikuti harga armada), dan tombol WhatsApp.',
    },
    {
      name: 'Film sehari perjalanan',
      text: 'Animasi bus berjalan dari pagi sampai malam yang bergerak saat halaman digulir, dengan jam berjalan dan hingga 5 bab perjalanan, misalnya penjemputan, istirahat, tiba di tujuan, dan kembali.',
    },
    {
      name: 'Tujuan favorit',
      text: 'Hingga 8 kartu tujuan dengan foto tegak, lama perjalanan, kota asal, harga mulai per bus, dan tombol tanya rute lewat WhatsApp.',
    },
    {
      name: 'Harga termasuk',
      text: 'Tabel harga mulai tiap jenis bus (diambil dari bagian Armada), lalu dua kolom yang memisahkan biaya yang sudah termasuk harga sewa (hingga 10 butir) dan yang belum (hingga 8 butir) beserta keterangannya.',
    },
    { name: 'Cara sewa', text: 'Hingga 5 langkah bernomor yang dihubungkan garis lajur, dari mengirim kebutuhan sampai bus berangkat.' },
    { name: 'Testimoni', text: 'Hingga 6 kutipan pelanggan dengan inisial, peran, kota, dan perjalanan, tanpa foto wajah.' },
    { name: 'Galeri', text: 'Strip hingga 6 foto tegak selebar layar dengan keterangan singkat.' },
    { name: 'Tanya jawab', text: 'Hingga 8 pertanyaan yang bisa dibuka dan ditutup, misalnya soal pemesanan, biaya, dan titik jemput.' },
    { name: 'Kontak & garasi', text: 'Alamat garasi, jam buka, telepon, WhatsApp, email, dan peta Google Maps.' },
    { name: 'Footer', text: 'Pita ajakan berwarna aksen, deskripsi, menu, kontak, dan lima tautan media sosial.' },
  ],
  partsNote:
    'Formulir hanya menyusun pesan WhatsApp; harga final dan ketersediaan armada dikonfirmasi admin. Tidak ada pembayaran online, e-tiket, ketersediaan armada real-time, akun member, atau pelacakan GPS. Rekomendasi armada dan perkiraan harga dihitung dari data contoh yang Anda isi di CMS.',
  cms: [
    'Nama usaha, tagline, logo, dan satu warna aksen; tombol, gambar bus, garis lajur, dan footer ikut menyesuaikan warnanya.',
    'Semua judul, kalimat pengantar, teks tombol, dan tujuan tautan.',
    'Data bus: nama kelas, jumlah kursi, susunan kursi, jumlah unit, harga mulai, fasilitas, dan foto bila ada.',
    'Bab film perjalanan, tujuan favorit beserta foto dan harganya, serta daftar biaya termasuk dan belum termasuk.',
    'Langkah sewa, testimoni, galeri, dan tanya jawab. Tambah, ubah urutan, atau hapus.',
    'Alamat garasi, telepon, email, nomor WhatsApp, jam buka, link Google Maps, dan menampilkan atau menyembunyikan setiap bagian.',
  ],
  cmsNote:
    'Gambar bus dipilih otomatis dari jumlah kursi, jadi tidak ada merek atau model kendaraan yang tergambar. Tata letak, animasi, dan urutan bagian mengikuti desain template.',
  demo: [
    'Demo {nama} memakai usaha fiktif Lajur Trans Wisata dengan garasi di Semarang dan armada contoh big bus 50 kursi, medium bus 33 kursi, serta microbus 15 kursi. Coba isi jumlah peserta di bilah penawaran, lalu geser kalkulator rombongan dan gulir film perjalanannya.',
    'Harga, tujuan, testimoni, alamat, dan nomor kontak di demo adalah contoh. Ganti dengan data asli sebelum website dibagikan, dan tulis keterangan izin atau perlindungan perjalanan hanya bila sesuai dokumen yang Anda miliki.',
  ],
  custom:
    '{nama} dibuat sebagai satu halaman pemasaran agar cepat aktif. Pemesanan dengan pembayaran online, jadwal armada yang tersambung ke sistem, e-tiket, akun pelanggan, atau pelacakan bus termasuk website custom. Kami merancangnya sesuai alur kerja PO Anda, dan biayanya kami sampaikan setelah konsultasi gratis.',
  faq: [
    {
      question: 'Bagaimana cara kerja bilah minta penawaran di {nama}?',
      answer:
        'Pengunjung mengisi jumlah peserta, tanggal berangkat, tujuan, dan lama sewa. Formulir menyusun pesan WhatsApp lengkap dengan rekomendasi armada ke nomor Anda; tidak ada pembayaran online, dan harga final serta ketersediaan armada Anda konfirmasi sendiri.',
    },
    {
      question: 'Dari mana rekomendasi jumlah bus dihitung?',
      answer:
        'Dari data bus yang Anda isi: jumlah kursi, harga, dan bila perlu jumlah unit per jenis. Template mencari kombinasi dengan jumlah bus paling sedikit, lalu kursi kosong paling sedikit, maksimal delapan bus.',
    },
    {
      question: 'Apakah gambar bus bisa diganti foto armada sendiri?',
      answer:
        'Bisa. Setiap jenis bus punya kolom foto. Bila diisi, foto Anda menggantikan gambar bus bawaan; bila kosong, gambar bawaan dipilih dari jumlah kursinya.',
    },
    {
      question: 'Apakah animasi film perjalanan memberatkan website?',
      answer:
        'Tidak banyak. Animasinya digambar dengan SVG dan CSS tanpa video, berjalan hanya saat bagian itu digulir, dan berubah menjadi gambar diam bila pengunjung memilih mengurangi gerak.',
    },
    {
      question: 'Bisakah warna website disamakan dengan warna armada?',
      answer:
        'Bisa. Ganti warna aksen di bagian Identitas & warna; tombol, livery gambar bus, garis lajur, dan footer ikut berubah, dan warna teks dijaga otomatis agar tetap terbaca.',
    },
  ],
  imageAlts: {
    'lajur-preview.webp': 'Tampilan beranda template website sewa bus pariwisata {nama} di desktop dan HP: foto jalan pegunungan dan bilah minta penawaran',
    'lajur-1.webp': 'Bagian armada template {nama} dengan tab jenis bus, gambar bus berlivery, fasilitas, dan harga mulai',
    'lajur-2.webp': 'Film sehari perjalanan di template {nama}: bus berlivery di depan gerbang candi pada siang hari, adegan SVG yang bergerak saat halaman digulir',
  },
  guides: ['template-vs-jasa-website-custom', 'biaya-website-company-profile'],
};
