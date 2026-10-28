// Isi halaman /template/homenest. Sumber fakta: src/templates/homenest (schema.ts, HomeNest.tsx, Header.tsx, Hero.tsx,
// Listings.tsx, Tour.tsx, Kpr.tsx, Estate.tsx, Stories.tsx, Agents.tsx, Closing.tsx, Footer.tsx, model.ts). Kata kunci:
// "template website properti" dan "website jual rumah" di paragraf pembuka; "website developer perumahan", "website
// agen properti", dan "website perumahan" di isi. Klaim wajib jujur: data demo fiktif, simulasi KPR hanya perkiraan
// (bukan penawaran bank), formulir jadwal kunjungan hanya menyusun pesan WhatsApp (data tidak disimpan di website),
// tidak ada tur 360° bawaan, tidak ada pembayaran tanda jadi online, listing tidak tersambung ke portal properti.
// Demo: HomeNest oleh PT Sarang Hunian Lestari (fiktif), rumah di Bogor, Depok, Tangerang Selatan, dan Bekasi.
import type { TemplatePageContent } from './page.types';

export const content: TemplatePageContent = {
  lead: '{nama} adalah template website properti untuk developer perumahan, agen, dan tim pemasaran yang ingin punya website jual rumah yang tenang dan elegan. Foto rumah tampil besar sebagai latar, calon pembeli langsung bisa mencari rumah menurut lokasi, tipe, dan harga, menghitung simulasi KPR, lalu menjadwalkan kunjungan lewat WhatsApp.',
  suitableFor: {
    intro:
      'Pilih {nama} bila calon pembeli biasanya membuka website perumahan Anda sebelum datang ke kantor pemasaran. Mereka ingin melihat rumah yang tersedia, membandingkan harga dan luasnya, memperkirakan angsuran, dan tahu siapa yang bisa dihubungi.',
    items: [
      'Developer yang membutuhkan website developer perumahan untuk beberapa klaster.',
      'Agen properti atau kantor broker yang memasarkan rumah dan kavling di beberapa kota.',
      'Tim pemasaran satu klaster yang ingin rumah contohnya lebih sering dikunjungi.',
      'Agen perorangan yang ingin website agen properti dengan jadwal kunjungan.',
    ],
  },
  parts: [
    {
      name: 'Menu atas',
      text: 'Bilah transparan di atas foto hero yang berubah krem saat digulir, berisi logo atau simbol bawaan, tautan ke setiap bagian, dan tombol Jadwalkan Kunjungan.',
    },
    {
      name: 'Hero foto & cari rumah',
      text: 'Foto rumah selebar layar sebagai latar, judul di tengah, kalimat singkat, dan panel cari (lokasi, tipe, harga) yang langsung menyaring daftar rumah.',
    },
    {
      name: 'Daftar rumah',
      text: 'Hingga 12 kartu rumah dengan foto, status, klaster, kota, harga, luas tanah dan bangunan, serta kamar tidur dan mandi. Saringan lokasi, tipe, rentang harga, dan urutan dibuat otomatis dari data rumah.',
    },
    {
      name: 'Tur virtual',
      text: 'Pita hijau tua berisi hingga 6 foto ruang yang bisa dipilih, plus tombol putar yang membuka tautan tur virtual milik Anda di tab baru.',
    },
    {
      name: 'Simulasi KPR',
      text: 'Kalkulator angsuran dari harga, uang muka, tenor, dan bunga per tahun, dengan tombol untuk mengirim angka simulasi ke agen lewat WhatsApp.',
    },
    { name: 'Profil developer', text: 'Cerita singkat, nama developer, hingga 4 angka, 3 foto proyek, dan 3 nilai kerja, dengan garis rumah tipis yang tergambar sekali.' },
    { name: 'Fasilitas kawasan', text: 'Satu foto tegak dan hingga 10 fasilitas dengan ikon otomatis dan jaraknya, misalnya stasiun, gerbang tol, atau sekolah.' },
    { name: 'Cerita pembeli', text: 'Hingga 6 kutipan pembeli dengan nama dan keterangan, tanpa foto wajah.' },
    {
      name: 'Agen & jadwal kunjungan',
      text: 'Hingga 4 agen dengan inisial, area, dan tombol WhatsApp, serta formulir jadwal kunjungan berisi rumah yang diminati, tanggal, waktu, dan agen.',
    },
    { name: 'Tanya jawab', text: 'Hingga 8 pertanyaan yang bisa dibuka dan ditutup, misalnya soal tanda jadi, KPR, dan rumah inden.' },
    { name: 'Kantor pemasaran', text: 'Alamat, telepon, WhatsApp, email, jam buka, dan peta Google Maps.' },
    { name: 'Footer', text: 'Nama merek berukuran besar, deskripsi, catatan kecil, menu, kontak, dan tautan media sosial.' },
  ],
  partsNote:
    'Simulasi KPR hanya perkiraan dengan bunga tetap, bukan penawaran bank, dan tidak memakai suku bunga bank tertentu. Formulir jadwal kunjungan hanya menyusun pesan WhatsApp; data tidak disimpan di website. Tidak ada tur 360° bawaan: tombol tur membuka tautan tur milik Anda. Tidak ada pembayaran tanda jadi atau booking online.',
  cms: [
    'Nama merek, tagline, logo, dan satu warna aksen; pita tur, panel KPR, dan footer ikut menyesuaikan warnanya.',
    'Semua judul, kalimat pengantar, teks tombol, dan tujuan tautan.',
    'Daftar rumah: nama, klaster, kota, tipe, harga, luas tanah, luas bangunan, kamar, status, dan foto. Tambah, ubah urutan, atau hapus.',
    'Batas rentang harga di saringan, misalnya di bawah Rp1 M sampai di atas Rp3 M.',
    'Foto ruang tur, tautan tur virtual, serta nilai awal harga, uang muka, tenor, dan bunga di simulasi KPR.',
    'Profil developer, angka, foto proyek, fasilitas kawasan, cerita pembeli, agen, dan tanya jawab.',
    'Alamat, telepon, email, nomor WhatsApp, jam buka, link Google Maps, dan menampilkan atau menyembunyikan setiap bagian.',
  ],
  cmsNote:
    'Tata letak, urutan bagian, dan isian formulir mengikuti desain template. Listing diperbarui lewat CMS, tidak tersambung ke portal properti, dan status ketersediaan unit adalah teks yang Anda ubah sendiri.',
  demo: [
    'Demo {nama} memakai merek HomeNest dari developer fiktif PT Sarang Hunian Lestari dengan sembilan rumah, townhouse, dan kavling di Bogor, Depok, Tangerang Selatan, dan Bekasi. Coba panel cari di hero, lalu tekan Simulasi KPR di salah satu kartu.',
    'Klaster, harga, agen, cerita pembeli, alamat, dan tautan tur di demo adalah contoh. Ganti dengan data asli sebelum website dibagikan, dan tulis keterangan legalitas hanya sesuai dokumen yang Anda miliki.',
  ],
  custom:
    '{nama} dibuat sebagai satu halaman pemasaran agar cepat aktif. Halaman detail per unit, siteplan interaktif, pembayaran tanda jadi online, integrasi portal properti, atau akun pembeli termasuk website custom. Kami merancangnya sesuai alur penjualan Anda, dan biayanya kami sampaikan setelah konsultasi gratis.',
  faq: [
    {
      question: 'Apakah simulasi KPR di {nama} memakai bunga bank tertentu?',
      answer:
        'Tidak. Simulasi menghitung angsuran dengan bunga tetap dari angka yang Anda isi di CMS atau yang diubah pengunjung. Hasilnya perkiraan, bukan penawaran bank; angsuran sebenarnya mengikuti bank pemberi KPR.',
    },
    {
      question: 'Bagaimana cara kerja formulir jadwal kunjungan?',
      answer:
        'Pengunjung memilih rumah yang diminati, tanggal, waktu, dan agen. Formulir lalu menyusun pesan WhatsApp ke nomor agen atau kantor Anda; data tidak disimpan di website, jadi arsipnya ada di WhatsApp Anda.',
    },
    {
      question: 'Apakah ada tur 360° di dalam template?',
      answer:
        'Tidak ada tur 360° bawaan. Bagian Tur virtual menampilkan foto per ruang, dan tombol putarnya membuka tautan tur yang Anda punya, misalnya video atau layanan tur virtual pilihan Anda.',
    },
    {
      question: 'Berapa banyak rumah yang bisa ditampilkan?',
      answer:
        'Hingga 12 rumah, townhouse, atau kavling. Pilihan lokasi dan tipe di saringan dibuat otomatis dari data rumah, dan rentang harganya bisa Anda atur sendiri.',
    },
    {
      question: 'Bisakah warna website disamakan dengan logo developer?',
      answer:
        'Bisa. Ganti warna aksen di bagian Identitas & warna; tombol, harga, pita tur, panel KPR, dan footer ikut menyesuaikan, dan warna teks dijaga otomatis agar tetap terbaca.',
    },
  ],
  imageAlts: {
    'homenest-preview.webp': 'Tampilan beranda template website properti {nama} di desktop dan HP: foto rumah besar, judul di tengah, dan panel cari rumah',
    'homenest-1.webp': 'Daftar rumah template {nama} dengan saringan lokasi, tipe, dan harga serta kartu berisi harga dan luas bangunan',
    'homenest-2.webp': 'Bagian template {nama} untuk calon pembeli rumah: tur virtual per ruang atau simulasi KPR',
  },
  guides: ['template-vs-jasa-website-custom', 'biaya-website-company-profile'],
};
