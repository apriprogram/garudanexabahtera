// Isi halaman /template/kemudi. Sumber fakta: src/templates/kemudi (schema.ts, Kemudi.tsx, Header.tsx, Hero.tsx,
// Fleet.tsx, Film.tsx, Pricing.tsx, Requirements.tsx, Delivery.tsx, Steps.tsx, Closing.tsx, Footer.tsx, model.ts). Kata
// kunci: "template website rental mobil" di paragraf pembuka; "website sewa mobil", "website rent car", dan "rental mobil
// lepas kunci" di isi. Klaim wajib jujur: data demo fiktif, harga contoh, pemesanan hanya menyusun pesan WhatsApp
// (ketersediaan & harga final dikonfirmasi admin, tidak ada pembayaran online), dokumen tidak diunggah atau disimpan di
// website, tidak ada pelacakan GPS atau ketersediaan real-time, mobil ditulis sebagai kelas tanpa merek/tipe.
// Demo: Kemudi Rent Car (fiktif), garasi di Bandung.
import type { TemplatePageContent } from './page.types';

export const content: TemplatePageContent = {
  lead: '{nama} adalah template website rental mobil untuk usaha sewa mobil lepas kunci dan dengan sopir. Pengunjung langsung memilih layanan, mobil, dan jadwal di kartu pesan, melihat perkiraan harganya, lalu mengirim pesanan yang sudah tersusun rapi ke WhatsApp Anda.',
  suitableFor: {
    intro:
      'Pilih {nama} bila pelanggan Anda biasanya bertanya harga dan jadwal lewat chat sebelum menyewa. Website sewa mobil ini menjawab pertanyaan itu lebih dulu: mobil apa yang ada, berapa perkiraan biayanya, apa syaratnya, dan ke mana mobil bisa diantar.',
    items: [
      'Rental mobil lepas kunci harian di kota wisata atau kota bisnis.',
      'Usaha sewa mobil dengan sopir untuk perjalanan keluarga, kantor, atau rombongan kecil.',
      'Rent car yang melayani antar-jemput ke stasiun, bandara, dan hotel.',
      'Pemilik beberapa mobil yang ingin website rent car sendiri, terpisah dari marketplace.',
    ],
  },
  parts: [
    {
      name: 'Menu atas',
      text: 'Bilah putih yang menempel dan memendek saat digulir, berisi logo atau simbol setir bawaan, tautan ke setiap bagian, dan tombol Pesan Mobil.',
    },
    {
      name: 'Hero foto & kartu pesan',
      text: 'Foto besar selebar layar dengan judul singkat dan kartu pesan: pilihan lepas kunci atau dengan sopir, mobil, tanggal dan jam ambil serta kembali, perkiraan harga, dan tombol pesan via WhatsApp.',
    },
    {
      name: 'Armada mobil',
      text: 'Hingga 12 kartu mobil dengan ilustrasi sesuai kelas (city car, MPV, MPV ringkas, SUV, MPV premium, minibus) atau foto Anda, jumlah kursi, transmisi, bahan bakar, bagasi, dan harga mulai. Saringan kelas dibuat otomatis dari data.',
    },
    {
      name: 'Film proses',
      text: 'Pita gelap berisi animasi yang berjalan saat halaman digulir: mobil cetak biru tergambar, diwarnai, diberi hingga 4 keterangan, lalu berangkat. Hingga 4 tahap dengan teks Anda sendiri.',
    },
    { name: 'Harga sewa', text: 'Tabel harga dari data armada: 12 jam, 24 jam, dengan sopir per 12 jam, dan tambahan luar kota, ditambah foto dan hingga 6 butir yang sudah termasuk.' },
    {
      name: 'Syarat sewa',
      text: 'Dua tab, lepas kunci dan dengan sopir, masing-masing berisi hingga 6 dokumen dengan ikon otomatis, hingga 6 aturan singkat, dan foto.',
    },
    { name: 'Antar-jemput', text: 'Hingga 6 zona antar dengan biaya dan waktu tempuh, ditampilkan bersama peta kota ilustrasi yang menggambar rute dari garasi ke zona pilihan.' },
    { name: 'Cara sewa', text: 'Hingga 5 langkah berurutan dengan ikon otomatis dan garis penghubung.' },
    { name: 'Ulasan pelanggan', text: 'Foto suasana dan hingga 6 ulasan dengan inisial, nama depan, keterangan, dan baris bintang opsional per ulasan.' },
    { name: 'Tanya jawab', text: 'Hingga 8 pertanyaan yang bisa dibuka dan ditutup, foto pendamping, dan tautan tanya lewat WhatsApp.' },
    { name: 'Garasi & kontak', text: 'Alamat garasi, jam buka, telepon, WhatsApp, email, dan peta Google Maps.' },
    { name: 'Footer', text: 'Ajakan besar dengan nomor telepon dan tombol chat, deskripsi, menu, kontak, dan tautan media sosial.' },
  ],
  partsNote:
    'Pemesanan hanya menyusun pesan WhatsApp; ketersediaan dan harga final dikonfirmasi admin; tidak ada pembayaran online; dokumen tidak diunggah atau disimpan di website. Perkiraan harga dihitung dari harga yang Anda isi di CMS, per blok 24 jam, 12 jam, atau 12 jam dengan sopir. Tidak ada ketersediaan mobil real-time dan tidak ada pelacakan GPS.',
  cms: [
    'Nama rental, tagline, logo, dan satu warna aksen; tombol, pilihan aktif, dan warna bodi mobil ilustrasi ikut menyesuaikan.',
    'Semua judul, kalimat pengantar, teks tombol, dan tujuan tautan.',
    'Daftar mobil: nama, kelas, kursi, transmisi, bahan bakar, bagasi, harga 12 jam, 24 jam, dengan sopir, tambahan luar kota, dan foto opsional.',
    'Tahap dan keterangan di film proses, serta teks penutupnya.',
    'Catatan harga, butir yang sudah termasuk, dokumen dan aturan syarat sewa, serta zona antar-jemput dengan biayanya.',
    'Langkah cara sewa, ulasan, tanya jawab, dan foto di setiap bagian.',
    'Alamat garasi, telepon, email, nomor WhatsApp, jam buka, link Google Maps, dan menampilkan atau menyembunyikan setiap bagian.',
  ],
  cmsNote:
    'Tata letak, urutan bagian, dan cara hitung perkiraan harga mengikuti desain template. Ilustrasi mobil dipilih dari kolom Kelas; ganti dengan foto mobil Anda bila ingin. Peta antar-jemput adalah ilustrasi, bukan peta asli.',
  demo: [
    'Demo {nama} memakai merek Kemudi Rent Car, rental mobil fiktif di Bandung dengan enam mobil dari lima kelas. Coba ganti layanan di kartu pesan, ubah tanggal kembali, lalu tekan Pesan di salah satu kartu mobil untuk melihat kartu pesan terisi otomatis.',
    'Harga, alamat garasi, zona antar, ulasan, dan nomor kontak di demo adalah contoh. Mobil ditulis sebagai kelas, misalnya MPV keluarga atau minibus, karena unit di garasi bisa berganti. Isi data asli rental Anda sebelum website dibagikan.',
  ],
  custom:
    '{nama} dibuat sebagai satu halaman pemasaran agar cepat aktif. Booking dengan pembayaran online, kalender ketersediaan mobil, akun pelanggan, atau pelacakan kendaraan termasuk website custom. Kami merancangnya sesuai alur sewa Anda, dan biayanya kami sampaikan setelah konsultasi gratis.',
  faq: [
    {
      question: 'Apakah pelanggan bisa membayar sewa lewat website {nama}?',
      answer:
        'Tidak. Kartu pesan hanya menyusun pesan WhatsApp berisi mobil, layanan, jadwal, dan perkiraan harga. Pembayaran, deposit, dan konfirmasi ketersediaan tetap diatur admin Anda.',
    },
    {
      question: 'Bagaimana perkiraan harga dihitung?',
      answer:
        'Lama sewa dihitung per blok 24 jam dari harga yang Anda isi; blok terakhir yang tidak lebih dari 12 jam memakai harga 12 jam bila ada. Layanan dengan sopir dihitung per blok 12 jam. Hasilnya perkiraan, bukan tagihan.',
    },
    {
      question: 'Apakah ada nama merek mobil di template ini?',
      answer:
        'Tidak. Demo menulis mobil sebagai kelas seperti city car, MPV, SUV, atau minibus dengan ilustrasi buatan sendiri. Anda boleh menulis nama mobil sendiri dan mengganti ilustrasi dengan foto unit Anda.',
    },
    {
      question: 'Apakah pelanggan perlu mengunggah KTP atau SIM?',
      answer:
        'Tidak. Bagian Syarat sewa hanya menampilkan dokumen yang perlu dibawa. Dokumen dicek langsung saat serah terima; website tidak mengunggah atau menyimpan dokumen pelanggan.',
    },
    {
      question: 'Bisakah animasi film dimatikan?',
      answer:
        'Animasi otomatis diam bagi pengunjung yang memilih mengurangi gerak di perangkatnya, dan bagian itu tampil sebagai gambar diam dengan daftar tahap. Bagian Film proses juga bisa disembunyikan dari CMS.',
    },
  ],
  imageAlts: {
    'kemudi-preview.webp': 'Tampilan beranda template website rental mobil {nama} di desktop dan HP: foto udara mobil di jalan hutan dan kartu pesan dengan perkiraan harga',
    'kemudi-1.webp': 'Daftar armada template {nama} dengan saringan kelas, ilustrasi mobil per kelas, spesifikasi, dan harga sewa',
    'kemudi-2.webp': 'Film proses template {nama} dalam bingkai diam: mobil cetak biru dengan empat keterangan dan empat tahap sewa di pita gelap',
  },
  guides: ['template-vs-jasa-website-custom', 'biaya-website-company-profile'],
};
