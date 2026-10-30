// Isi halaman /template/nusaline. Sumber fakta: src/templates/nusaline (schema.ts, Nusaline.tsx, Header.tsx, Hero.tsx,
// Schedule.tsx, Classes.tsx, Film.tsx, Routes.tsx, Onboard.tsx, Stories.tsx, Closing.tsx, Footer.tsx, model.ts). Kata
// kunci: "template website PO bus" dan "website bus malam" di paragraf pembuka; "website tiket bus" dan "website PO bus
// antarkota" di isi. Klaim wajib jujur: data demo fiktif, pemesanan hanya menyusun pesan WhatsApp (tidak ada pembayaran
// online, e-tiket, atau pilihan kursi real-time), jadwal dan harga contoh dikonfirmasi admin, tanpa klaim izin trayek.
// Demo: Nusaline, PO bus malam fiktif di Jakarta Timur dengan rute Jakarta–Semarang–Yogyakarta–Surabaya–Malang–Denpasar.
import type { TemplatePageContent } from './page.types';

export const content: TemplatePageContent = {
  lead: '{nama} adalah template website PO bus untuk perusahaan otobus antarkota dan bus malam yang ingin calon penumpang langsung menemukan jadwal. Hero foto jalan malam memuat kartu cari jadwal dan papan keberangkatan, lalu tabel jadwal, pilihan kelas dengan denah kursi, dan tombol Pesan yang menyusun pesan WhatsApp ke admin Anda.',
  suitableFor: {
    intro:
      'Pilih {nama} bila penumpang Anda biasanya bertanya jam berangkat, kelas, dan harga lewat WhatsApp sebelum membeli tiket di agen. Website bus malam ini menjawab pertanyaan itu lebih dulu, lalu mengarahkan pesanan ke admin dengan pesan yang sudah lengkap.',
    items: [
      'PO bus antarkota dengan keberangkatan harian di beberapa rute.',
      'Operator bus malam eksekutif, super eksekutif, atau sleeper.',
      'Agen tiket bus yang ingin website tiket bus dengan daftar titik naik.',
      'PO baru yang membutuhkan website PO bus antarkota yang rapi tanpa membangun sistem tiket.',
    ],
  },
  parts: [
    {
      name: 'Menu atas',
      text: 'Bilah transparan di atas foto hero yang berubah biru malam saat digulir, berisi logo atau simbol bawaan, tautan Jadwal, Kelas, Rute, Fasilitas, FAQ, Kontak, dan tombol Cek Jadwal.',
    },
    {
      name: 'Hero & cari jadwal',
      text: 'Foto malam selebar layar, judul dengan kata sorotan, dua tombol, kartu cari jadwal (dari, ke, tanggal, jumlah penumpang 1–6), dan papan keberangkatan mini dari tiga jadwal pertama.',
    },
    {
      name: 'Jadwal keberangkatan',
      text: 'Hingga 16 baris jadwal dengan jam berangkat, jam tiba dan tanda +1 yang dihitung otomatis dari durasi, kelas, harga mulai, saringan rute dan kelas, serta tombol Pesan ke WhatsApp.',
    },
    {
      name: 'Kelas & denah kursi',
      text: 'Hingga 4 kelas dalam tab. Denah kursi tampak atas dibuat otomatis dari konfigurasi 2-2, 2-1, atau 1-1 kabin tidur, lengkap dengan fitur, jarak kaki, harga mulai, dan foto opsional.',
    },
    {
      name: 'Film perjalanan',
      text: 'Animasi seperti video yang berjalan saat digulir: bus potongan samping melaju dari malam sampai matahari terbit, jam dan penghitung km bergerak, dan hingga 5 bab perjalanan yang bisa Anda ubah.',
    },
    {
      name: 'Rute & titik naik',
      text: 'Diagram jalur hingga 8 kota. Pengunjung memilih kota untuk melihat foto kota dan hingga 24 agen dengan alamat dan jam buka.',
    },
    { name: 'Fasilitas di kabin', text: 'Susunan bento berisi satu foto kabin besar, hingga 8 fasilitas dengan ikon otomatis, dan dua foto kecil.' },
    { name: 'Cara pesan', text: 'Hingga 4 langkah bernomor berbentuk sobekan tiket, plus catatan tentang cara kerja pemesanan.' },
    { name: 'Cerita penumpang', text: 'Hingga 6 kutipan penumpang dengan inisial, nama, rute, dan kelas, tanpa foto wajah.' },
    { name: 'Tanya jawab & kontak', text: 'Hingga 8 pertanyaan yang bisa dibuka-tutup, lalu kantor pusat, call center, WhatsApp, email, jam operasional, dan peta Google Maps.' },
    { name: 'Footer', text: 'Daftar rute huruf mono yang langsung menyaring tabel jadwal, deskripsi, menu, kontak, dan tautan media sosial.' },
  ],
  partsNote:
    'Pemesanan hanya menyusun pesan WhatsApp berisi rute, tanggal, jam, kelas, dan jumlah penumpang; tidak ada pembayaran online, e-tiket, atau pilihan kursi real-time. Jadwal, harga, dan kursi tetap dikonfirmasi admin Anda.',
  cms: [
    'Nama PO, tagline, logo, dan satu warna aksen; warna neon di latar gelap dan livery bus di film ikut menyesuaikan.',
    'Semua judul, kalimat pengantar, teks tombol, dan tujuan tautan.',
    'Jadwal: kota asal, kota tujuan, jam berangkat, lama perjalanan, kelas, dan harga mulai. Tambah, ubah urutan, atau hapus.',
    'Kelas: nama, konfigurasi kursi, jumlah kursi atau kabin, jarak kaki, fitur, harga, dan foto.',
    'Bab film perjalanan (jam, judul, keterangan) dan jarak km yang dihitung di film.',
    'Kota di rute, kode kota, foto kota, serta agen dan titik naik per kota.',
    'Fasilitas kabin, langkah pemesanan, cerita penumpang, tanya jawab, kontak, peta, dan menampilkan atau menyembunyikan setiap bagian.',
  ],
  cmsNote:
    'Tata letak, urutan bagian, dan animasi mengikuti desain template. Jadwal adalah data yang Anda ubah sendiri lewat CMS; website tidak tersambung ke sistem tiket, tidak mengunci kursi, dan tidak menampilkan ketersediaan kursi secara langsung.',
  demo: [
    'Demo {nama} memakai merek Nusaline, PO bus malam fiktif dengan kantor pusat di Jakarta Timur dan keberangkatan harian ke Semarang, Yogyakarta, Surabaya, Malang, dan Denpasar. Coba kartu cari jadwal di hero, lalu gulir pelan ke film perjalanan semalam.',
    'Jadwal, harga, agen, alamat, dan penumpang di demo adalah contoh. Ganti dengan data asli sebelum website dibagikan, dan tulis keterangan izin atau layanan hanya sesuai dokumen yang Anda miliki.',
  ],
  custom:
    '{nama} dibuat sebagai satu halaman pemasaran agar cepat aktif. Sistem tiket dengan pilihan kursi, pembayaran online, e-tiket, akun penumpang, atau pelacakan bus termasuk website custom. Kami merancangnya sesuai alur penjualan tiket Anda, dan biayanya kami sampaikan setelah konsultasi gratis.',
  faq: [
    {
      question: 'Bagaimana penumpang memesan tiket di {nama}?',
      answer:
        'Penumpang memilih jadwal lalu menekan tombol Pesan. Website menyusun pesan WhatsApp berisi rute, tanggal, jam berangkat, kelas, dan jumlah penumpang ke nomor admin Anda. Tidak ada pembayaran online di website; admin mengonfirmasi kursi dan cara bayarnya.',
    },
    {
      question: 'Apakah penumpang bisa memilih kursi langsung di website?',
      answer:
        'Tidak. Denah di bagian Kelas menggambarkan susunan kursi atau kabin, bukan kursi yang masih kosong. Permintaan nomor kursi dikirim lewat WhatsApp dan dikonfirmasi admin.',
    },
    {
      question: 'Bagaimana jam tiba dan tanda +1 dihitung?',
      answer:
        'Anda cukup mengisi jam berangkat dan lama perjalanan, misalnya 19.00 dan 12 jam. Template menghitung jam tiba, menandai +1 bila tiba keesokan hari, dan menampilkan durasinya.',
    },
    {
      question: 'Apakah film perjalanan memperlambat website?',
      answer:
        'Film digambar dengan SVG ringan dan digerakkan oleh guliran, tanpa file video. Bagi pengunjung yang mematikan animasi di perangkatnya, atau membuka website di HP yang dimiringkan, film tampil sebagai gambar diam dengan daftar bab.',
    },
    {
      question: 'Bisakah warna website disamakan dengan livery bus kami?',
      answer:
        'Bisa. Ganti warna aksen di bagian Identitas & warna; tombol, sorotan neon, dan livery bus di film ikut berubah, dan warna teks dijaga otomatis agar tetap terbaca.',
    },
  ],
  imageAlts: {
    'nusaline-preview.webp': 'Tampilan beranda template website PO bus {nama} di desktop dan HP: foto jalan malam, kartu cari jadwal, dan papan keberangkatan',
    'nusaline-1.webp': 'Tabel jadwal keberangkatan template {nama} dengan jam berangkat, jam tiba, kelas, harga mulai, dan tombol Pesan',
    'nusaline-2.webp': 'Film perjalanan semalam template {nama}: ilustrasi bus tidur potongan samping melaju di jalan malam, dengan jam dan jarak km',
  },
  guides: ['template-vs-jasa-website-custom', 'biaya-website-company-profile'],
};
