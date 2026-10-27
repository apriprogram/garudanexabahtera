// Isi halaman /template/dermaga. Sumber fakta: src/templates/dermaga (schema.ts, Dermaga.tsx, Header.tsx, Hero.tsx,
// Company.tsx, Services.tsx, Markets.tsx, Community.tsx, Closing.tsx, Contact.tsx, Inquiry.tsx, Footer.tsx). Kata kunci:
// "template website ekspor impor" di paragraf pembuka; "website perusahaan ekspor impor", "website freight forwarding",
// "company profile ekspor impor", dan "website perusahaan trading" di isi. Klaim wajib jujur: formulir permintaan
// penawaran hanya menyusun pesan WhatsApp (data tidak disimpan di website), tidak ada pelacakan kiriman atau kontainer
// real-time, tarif & jadwal kapal tidak diperbarui otomatis, tidak ada pembayaran online, garis rute hanya ilustrasi.
// Demo: PT Lintas Dermaga Nusantara, Surabaya (fiktif).
import type { TemplatePageContent } from './page.types';

export const content: TemplatePageContent = {
  lead: '{nama} adalah template website ekspor impor untuk perusahaan general trading, freight forwarder, dan eksportir yang ingin tampil rapi di depan pembeli luar negeri. Hero-nya memperlihatkan garis rute di atas foto terminal peti kemas, lalu halaman menuntun calon klien dari layanan, pasar tujuan, dan proses kerja sampai formulir permintaan penawaran.',
  suitableFor: {
    intro:
      'Pilih {nama} bila calon pembeli dan pemasok biasanya memeriksa website perusahaan ekspor impor Anda sebelum meminta harga. Mereka ingin tahu barang apa yang Anda tangani, ke negara mana Anda rutin mengirim, dan bagaimana memulai kerja sama.',
    items: [
      'Freight forwarder yang butuh website freight forwarding untuk pengiriman laut FCL maupun LCL.',
      'Perusahaan general trading yang mengekspor atau mengimpor berbagai jenis barang.',
      'Produsen yang mulai menjual ke luar negeri dan butuh company profile ekspor impor yang meyakinkan.',
      'Importir dan agen sourcing yang mencarikan barang dari luar negeri untuk pabrik atau toko di Indonesia.',
      'Pengelola gudang konsolidasi atau usaha logistik pelabuhan yang ingin memperkenalkan layanannya.',
    ],
  },
  parts: [
    {
      name: 'Menu atas',
      text: 'Bilah putih yang tetap terlihat saat digulir, berisi logo atau simbol bawaan, tautan ke setiap bagian, dan tombol Minta Penawaran.',
    },
    {
      name: 'Hero rute',
      text: 'Judul besar, deskripsi, dua tombol, foto lebar dengan garis rute dan tiga label pelabuhan, serta empat angka ringkas seperti jumlah pengiriman dan negara tujuan.',
    },
    { name: 'Klien', text: 'Hingga 12 nama atau logo klien, masing-masing dengan keterangan sektor dan kotanya.' },
    { name: 'Tentang kami', text: 'Cerita perusahaan, satu foto, dan hingga 6 baris fakta seperti tahun berdiri, luas gudang, dan bahasa layanan.' },
    { name: 'Layanan', text: 'Hingga 9 kartu layanan bernomor dengan deskripsi, label singkat seperti FCL atau LCL, dan foto opsional.' },
    {
      name: 'Pasar & rute',
      text: 'Pita berwarna selebar layar berisi hingga 8 kawasan tujuan beserta pelabuhannya, daftar Incoterm yang dilayani, dan foto kapal.',
    },
    { name: 'Proses kerja', text: 'Hingga 6 langkah dari konsultasi sampai serah terima, lengkap dengan dokumen yang dihasilkan di setiap langkah.' },
    { name: 'Galeri', text: 'Hingga 9 foto gudang, terminal, atau tim dengan keterangan; foto pertama tampil lebar.' },
    { name: 'Testimoni', text: 'Hingga 6 kutipan klien dengan nama, jabatan, rute pengiriman, dan foto.' },
    { name: 'Tanya jawab', text: 'Hingga 8 pertanyaan yang bisa dibuka dan ditutup, misalnya soal volume minimum dan Incoterm.' },
    { name: 'Ajakan', text: 'Blok penutup dengan garis rute kecil, tombol ke formulir penawaran, dan tautan WhatsApp.' },
    {
      name: 'Kontak & formulir penawaran',
      text: 'Alamat, telepon, email, WhatsApp, jam kerja, peta Google Maps, dan formulir yang menanyakan produk, volume, Incoterm, serta negara tujuan atau asal.',
    },
    { name: 'Footer', text: 'Deskripsi singkat, menu, tautan media sosial, dan nama perusahaan berukuran besar.' },
  ],
  partsNote:
    'Formulir permintaan penawaran hanya menyusun pesan WhatsApp berisi data kiriman; data tidak disimpan di website. Tidak ada pelacakan kiriman atau kontainer real-time, kalkulator tarif, maupun pembayaran online. Jadwal dan tarif yang tampil adalah teks yang Anda perbarui sendiri lewat CMS.',
  cms: [
    'Nama perusahaan, tagline, logo, dan satu warna aksen; pita pasar dan footer gelap ikut menyesuaikan warnanya.',
    'Semua judul, deskripsi, teks tombol, dan tujuan tautan.',
    'Foto hero, foto tentang kami, foto layanan, foto pasar, dan galeri beserta keterangannya.',
    'Tiga label pelabuhan di hero, angka ringkas, kawasan tujuan, Incoterm, dan langkah proses.',
    'Daftar klien, layanan, testimoni, dan tanya jawab: tambah, ubah urutan, atau hapus.',
    'Alamat, telepon, email, nomor WhatsApp, jam kerja, link Google Maps, dan pilihan layanan di formulir.',
    'Menampilkan atau menyembunyikan setiap bagian, misalnya Testimoni bila belum ada izin dari klien.',
  ],
  cmsNote: 'Tata letak, urutan bagian, dan isian formulir mengikuti desain template. Garis rute di hero adalah ilustrasi, bukan peta pelayaran sebenarnya.',
  demo: [
    'Demo {nama} memakai perusahaan fiktif PT Lintas Dermaga Nusantara dari Surabaya, sebuah perusahaan general trading dan freight forwarding. Di sana terlihat bagaimana layanan dari konsolidasi LCL sampai dokumen pengapalan, rute ke lima kawasan, dan lima langkah kerja disusun untuk calon klien yang belum pernah bekerja sama dengan Anda.',
    'Nama klien, angka, testimoni, dan alamat di demo adalah contoh. Ganti semuanya dengan data asli perusahaan Anda sebelum alamat website dibagikan, dan tulis klaim legalitas hanya sesuai dokumen yang benar-benar Anda miliki.',
  ],
  custom:
    '{nama} dibuat sebagai satu halaman company profile agar cepat aktif. Bila perusahaan Anda butuh portal pelacakan kontainer, kalkulator tarif, akun pelanggan, daftar barang dengan pencarian, website dua bahasa, atau formulir yang menyimpan permintaan ke database, semua itu termasuk website custom. Kami merancangnya sesuai alur kerja tim Anda, dan biayanya kami sampaikan setelah konsultasi gratis.',
  faq: [
    {
      question: 'Apakah {nama} cocok untuk freight forwarder sekaligus perusahaan trading?',
      answer:
        'Cocok. Bagian layanan, pasar, dan proses bersifat umum, jadi bisa diisi jasa pengiriman, pengurusan dokumen, maupun jual beli barang. Ini juga bisa menjadi website perusahaan trading biasa: sembunyikan bagian yang tidak Anda perlukan lewat CMS.',
    },
    {
      question: 'Bagaimana cara kerja formulir permintaan penawaran?',
      answer:
        'Pengunjung mengisi produk, volume, Incoterm, serta negara tujuan atau asal. Formulir lalu menyusun pesan WhatsApp ke nomor Anda; data tidak disimpan di website, jadi balasan dan arsipnya ada di WhatsApp Anda.',
    },
    {
      question: 'Bisakah pelanggan melacak kontainer di website?',
      answer:
        'Tidak. {nama} tidak terhubung ke sistem pelayaran, jadi tidak ada pelacakan kiriman real-time. Kabar status tetap Anda kirim lewat WhatsApp atau email. Portal pelacakan bisa dibuat sebagai pekerjaan custom.',
    },
    {
      question: 'Apakah tarif dan jadwal kapal diperbarui otomatis?',
      answer:
        'Tidak. Angka, rute, dan Incoterm yang tampil adalah teks biasa yang Anda ubah sendiri lewat CMS kapan saja. Untuk tarif yang sering berubah, tuliskan di penawaran, bukan di website.',
    },
    {
      question: 'Bisakah warna website disamakan dengan logo perusahaan?',
      answer:
        'Bisa. Ganti warna aksen di bagian Identitas & warna; tombol, nomor bagian, pita pasar, dan footer gelap ikut menyesuaikan, dan warna teks dipilih otomatis agar tetap terbaca.',
    },
  ],
  imageAlts: {
    'dermaga-preview.webp': 'Tampilan beranda template website ekspor impor {nama} di desktop dan HP: judul, foto terminal peti kemas dengan garis rute, dan angka ringkas',
    'dermaga-1.webp': 'Bagian layanan template {nama}: kartu bernomor untuk freight forwarding, konsolidasi LCL, dan dokumen ekspor impor',
    'dermaga-2.webp': 'Pita pasar template {nama} berisi kawasan tujuan, pelabuhan, dan Incoterm yang dilayani',
  },
  guides: ['biaya-website-company-profile', 'template-vs-jasa-website-custom'],
};
