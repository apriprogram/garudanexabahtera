// Isi halaman /template/nusaniaga. Sumber fakta: src/templates/nusaniaga (schema.ts, NusaNiaga.tsx, Header.tsx, Hero.tsx,
// Clients.tsx, Offer.tsx, Process.tsx, Coverage.tsx, Proof.tsx, Closing.tsx, Contact.tsx, Inquiry.tsx, Footer.tsx). Kata
// kunci: "template website importir" di paragraf pembuka; "website importir", "website distributor bahan baku", "website
// supplier mesin industri", dan "company profile importir" di isi. Klaim wajib jujur: formulir permintaan penawaran hanya
// menyusun pesan WhatsApp (data tidak disimpan di website), tidak ada pelacakan kiriman atau kontainer real-time, harga,
// stok, dan kurs tidak diperbarui otomatis, Produk bukan toko online. Demo: PT Arunika Niaga Internasional, Cikarang (fiktif).
import type { TemplatePageContent } from './page.types';

export const content: TemplatePageContent = {
  lead: '{nama} adalah template website importir untuk perusahaan yang mendatangkan bahan baku, mesin, dan suku cadang dari luar negeri lalu menyalurkannya ke pabrik. Hero-nya menampilkan foto gudang yang dipotong menjadi bilah vertikal di samping judul besar, diikuti layanan, produk, proses impor, negara asal, dan formulir permintaan penawaran.',
  suitableFor: {
    intro:
      'Bagian pengadaan pabrik biasanya memeriksa website importir sebelum meminta penawaran: barang apa yang dipasok, dari negara mana, bagaimana prosesnya, dan siapa yang bisa dihubungi. {nama} menjawab keempatnya dalam satu halaman, sehingga website distributor bahan baku Anda tampil rapi di depan calon pelanggan industri.',
    items: [
      'Importir bahan baku seperti resin plastik, baja, benang, atau bahan kemasan yang menjual ke pabrik.',
      'Perusahaan yang butuh website supplier mesin industri, lengkap dengan layanan instalasi, pelatihan operator, dan suku cadang.',
      'Agen sourcing yang mencarikan pemasok luar negeri untuk klien di Indonesia.',
      'Perusahaan trading yang selama ini hanya punya company profile importir dalam bentuk PDF.',
    ],
  },
  parts: [
    { name: 'Menu atas', text: 'Logo atau simbol bawaan beserta nama perusahaan, tautan ke bagian utama (Layanan, Produk, Proses, Jangkauan, FAQ, Kontak), dan tombol penawaran di blok warna aksen di ujung kanan.' },
    {
      name: 'Hero bilah',
      text: 'Judul dengan bagian yang disorot warna aksen, deskripsi, dua tombol, chip negara asal yang menuju bagian Jangkauan, dan satu foto tegak yang tampil sebagai bilah-bilah vertikal.',
    },
    { name: 'Klien & industri', text: 'Hingga 12 nama atau logo klien, ditambah strip berjalan berisi hingga 10 industri yang Anda layani.' },
    { name: 'Layanan', text: 'Hingga 6 kartu layanan dengan ikon, deskripsi, dan tiga poin singkat, misalnya sourcing, impor, gudang, dan distribusi.' },
    {
      name: 'Produk',
      text: 'Hingga 9 produk atau kategori dengan foto, jenis (bahan baku, mesin, atau suku cadang), negara asal, dan keterangan kemasan atau minimum pesanan.',
    },
    { name: 'Proses impor', text: 'Hingga 6 langkah dalam daftar buka-tutup; garis alur di sampingnya terisi saat bagian ini mulai terlihat.' },
    { name: 'Jangkauan', text: 'Hingga 12 negara asal beserta produk dari tiap negara, daftar area pengantaran, dan satu foto.' },
    { name: 'Keunggulan & angka', text: 'Hingga 6 alasan memilih perusahaan Anda dan 4 angka besar bersatuan, misalnya jumlah negara, SKU, atau luas gudang.' },
    { name: 'Testimoni', text: 'Hingga 6 kutipan klien dengan nama, jabatan, foto, dan produk yang mereka beli.' },
    { name: 'Tanya jawab', text: 'Hingga 8 pertanyaan dalam daftar buka-tutup, ditambah tautan ke WhatsApp.' },
    { name: 'Ajakan', text: 'Pita warna aksen selebar layar dengan judul, deskripsi, dan dua tombol.' },
    {
      name: 'Kontak & formulir penawaran',
      text: 'Alamat, telepon, email, WhatsApp, jam operasional, peta Google Maps, dan formulir yang menanyakan kebutuhan, produk, volume, negara asal, Incoterm, dan lokasi pabrik.',
    },
    { name: 'Footer', text: 'Deskripsi, menu, daftar produk, kontak, dan tautan Instagram, Facebook, LinkedIn, YouTube, serta TikTok.' },
  ],
  partsNote:
    'Formulir permintaan penawaran hanya menyusun pesan WhatsApp untuk tim Anda; data tidak disimpan di website. Tidak ada pelacakan kiriman atau kontainer real-time, dan harga, stok, maupun kurs tidak diperbarui otomatis karena semuanya teks yang Anda ubah sendiri.',
  cms: [
    'Nama perusahaan, tagline, logo, dan satu warna aksen untuk tombol, label, blok menu, garis proses, dan pita ajakan.',
    'Semua judul, deskripsi, teks tombol, dan tujuan tautannya.',
    'Foto hero, foto produk, foto jangkauan, foto proses dan keunggulan, serta foto testimoni.',
    'Daftar layanan, produk, langkah proses, negara asal, keunggulan, angka, testimoni, dan tanya jawab: tambah, ubah urutan, atau hapus.',
    'Daftar industri di strip berjalan serta nama atau logo klien.',
    'Pilihan kebutuhan di formulir, nomor WhatsApp, pesan awal, alamat, jam operasional, dan link Google Maps.',
    'Menampilkan atau menyembunyikan bagian yang belum Anda perlukan.',
  ],
  cmsNote:
    'Tata letak, bentuk bilah di hero, dan urutan bagian mengikuti desain template. Bagian Produk adalah daftar di satu halaman, bukan toko online: tidak ada keranjang, stok otomatis, atau pembayaran.',
  demo: [
    'Demo {nama} memakai perusahaan fiktif PT Arunika Niaga Internasional, importir dan distributor bahan baku serta mesin di Cikarang. Di sana terlihat bagaimana resin plastik, baja lembaran, benang, mesin injeksi, dan suku cadang disajikan bersama negara asalnya, proses impor lima langkah, serta testimoni dari bagian pengadaan pabrik.',
    'Website Anda dimulai dengan isi contoh yang sama. Ganti nama klien, angka, negara asal, dan testimoni dengan data perusahaan Anda sebelum alamatnya dibagikan. Template tidak memuat klaim izin impor, sertifikat, atau legalitas apa pun; tulis hanya yang sesuai dengan dokumen perusahaan Anda.',
  ],
  custom:
    'Butuh lebih dari company profile importir? Portal pelanggan untuk melacak pesanan, daftar produk dengan pencarian dan filter, kalkulator landed cost, formulir yang tersimpan ke database, harga yang tersambung ke sistem stok, atau versi dua bahasa termasuk website custom. Kami merancangnya sesuai alur kerja perusahaan Anda dan menyampaikan biayanya lewat penawaran setelah konsultasi gratis.',
  faq: [
    {
      question: 'Apakah {nama} cocok untuk distributor yang tidak mengimpor sendiri?',
      answer:
        'Cocok. Bagian Jangkauan bisa diisi negara asal merek atau pabrik pemasok Anda, dan langkah proses bisa diubah menjadi alur pemesanan dari gudang Anda. Semua teks dan jumlah langkah diatur lewat CMS.',
    },
    {
      question: 'Bagaimana formulir permintaan penawaran bekerja?',
      answer:
        'Pengunjung mengisi kebutuhan, produk, volume, negara asal, Incoterm, dan lokasi pabrik. Formulir lalu menyusun pesan WhatsApp yang dikirim pengunjung sendiri ke nomor Anda; data tidak disimpan di website dan tidak masuk ke database.',
    },
    {
      question: 'Bisakah pelanggan melacak kontainer atau status pesanan di website?',
      answer:
        'Tidak. Tidak ada pelacakan kiriman atau kontainer real-time di template ini. Kabar status tetap dikirim tim Anda lewat WhatsApp atau email; portal pelacakan termasuk pekerjaan custom.',
    },
    {
      question: 'Apakah harga dan stok produk bisa tampil otomatis?',
      answer:
        'Tidak. Harga, stok, dan kurs di {nama} tidak diperbarui otomatis. Banyak importir memilih tidak menampilkan harga di website dan mengirimkannya lewat penawaran tertulis.',
    },
    {
      question: 'Bisakah warna website disamakan dengan logo perusahaan?',
      answer:
        'Bisa. Ganti warna aksen di bagian Identitas; tombol, label, blok menu, garis proses, dan pita ajakan ikut berubah, sementara warna teks di atasnya disesuaikan otomatis agar tetap terbaca.',
    },
  ],
  imageAlts: {
    'nusaniaga-preview.webp':
      'Tampilan beranda template website importir {nama} di desktop dan HP: judul, chip negara asal, dan foto gudang yang dipotong menjadi bilah vertikal',
    'nusaniaga-1.webp': 'Bagian produk template {nama}: foto resin plastik, baja lembaran, benang, dan mesin beserta negara asalnya',
    'nusaniaga-2.webp': 'Bagian proses impor template {nama}: daftar langkah buka-tutup dengan garis alur berwarna aksen',
  },
  guides: ['biaya-website-company-profile', 'template-vs-jasa-website-custom'],
};
