// Isi halaman /template/altura. Sumber fakta: src/templates/altura (schema.ts, Altura.tsx, Header.tsx, Hero.tsx, Intro.tsx,
// Proof.tsx, Projects.tsx, People.tsx, Closing.tsx, Footer.tsx). Kata kunci: "template website perusahaan properti" di
// paragraf pembuka; "website developer properti" dan "template company profile bahasa Inggris" di isi. Klaim wajib jujur:
// konten demo berbahasa Inggris tetapi semua teks di setiap bagian (termasuk nama menu, label formulir, pesan galat, dan
// judul kolom footer) bisa diganti lewat CMS, termasuk ke bahasa Indonesia; formulir enquiry
// hanya menyusun pesan WhatsApp atau email (tanpa penyimpanan data); tidak ada sistem listing, booking, atau transaksi
// sungguhan; nama, angka, proyek, dan penghargaan di demo fiktif. Demo: Altura Developments, Singapura (fiktif).
import type { TemplatePageContent } from './page.types';

export const content: TemplatePageContent = {
  lead:
    '{nama} adalah template website perusahaan properti berbahasa Inggris untuk perusahaan besar, multinasional, eksportir, dan perusahaan yang melayani klien luar negeri. Tampilannya seperti developer kelas dunia: hero dua panel dengan foto menara, angka raksasa, proyek unggulan, dan portofolio berfilter sudah tersusun, Anda tinggal mengganti foto dan teksnya.',
  suitableFor: {
    intro:
      'Pilih {nama} bila calon pembeli, investor, atau mitra Anda berasal dari berbagai negara dan menilai perusahaan dari website-nya sebelum rapat pertama. Sebagai template company profile bahasa Inggris, {nama} menampilkan skala usaha, proyek, pimpinan, dan kantor Anda dengan nada korporat yang tenang.',
    items: [
      'Developer dan pengelola properti yang membutuhkan website developer properti untuk menara hunian, kawasan, hotel, atau perkantoran.',
      'Grup usaha, holding, atau anak perusahaan asing di Indonesia yang perlu profil resmi berbahasa Inggris.',
      'Eksportir, kontraktor, dan perusahaan jasa B2B yang sering mengirim tautan profil ke calon klien di luar negeri.',
      'Perusahaan yang ingin tampil premium tetapi tetap bisa mengganti seluruh isi, termasuk ke bahasa Indonesia.',
    ],
  },
  parts: [
    {
      name: 'Menu pil & hero dua panel',
      text: 'Menu putih membulat yang menumpang di atas hero dan tetap menempel saat digulir, lalu foto menara di kiri dan panel krem berisi judul besar, tombol, lingkaran angka pengalaman, serta pil berfoto yang membuka video perusahaan atau bagian proyek.',
    },
    { name: 'Tentang & tiga pilar', text: 'Judul besar dengan paragraf profil, lalu tiga kartu bernomor: gelap, berwarna tema dengan foto gedung, dan berfoto.' },
    { name: 'Deret layanan & pita angka', text: 'Hingga 8 pil layanan yang berjalan pelan, dan hingga 4 angka raksasa di atas foto cakrawala yang menghitung naik.' },
    { name: 'Keunggulan', text: 'Foto tim dan hingga 6 keunggulan dengan ikon yang dipilih otomatis dari judulnya.' },
    {
      name: 'Proyek unggulan',
      text: 'Hingga 6 proyek dalam kartu tinggi bertumpuk: kartu yang dipilih melebar dengan foto, jenis, lokasi, deskripsi, dan tombol; di HP menjadi rel geser.',
    },
    { name: 'Portofolio berfilter', text: 'Hingga 12 properti dengan tombol filter kategori, harga, lokasi, dan tiga spesifikasi seperti luas, kamar, atau lantai.' },
    { name: 'Pimpinan & penghargaan', text: 'Hingga 4 kartu potret pimpinan dengan tautan LinkedIn, dan hingga 12 penghargaan dalam deret pil yang bergerak pelan.' },
    { name: 'Testimoni & wawasan', text: 'Hingga 6 kutipan dengan foto dan kartu nilai, lalu hingga 6 artikel berfoto dengan kategori dan tanggal.' },
    {
      name: 'Ajakan, kontak & footer',
      text: 'Panel foto malam dengan dua tombol, daftar kantor, peta opsional, formulir enquiry, dan footer gelap dengan nama perusahaan raksasa.',
    },
  ],
  partsNote:
    'Setiap bagian bisa disembunyikan dari CMS. Formulir enquiry memeriksa nama, email, keperluan, dan pesan, lalu menyusun pesan yang dikirim pengunjung sendiri lewat WhatsApp atau email; data tidak disimpan di website dan tidak dikirim ke server.',
  cms: [
    'Nama perusahaan, tagline, logo, dan satu warna tema; warna teks di atasnya serta nuansa pita gelap menyesuaikan otomatis.',
    'Judul, deskripsi, foto menara, lingkaran angka, pil berfoto, dan tombol di menu atas.',
    'Isi tiga pilar, pil layanan, angka, keunggulan, proyek unggulan, dan properti di portofolio beserta kategorinya.',
    'Pimpinan, penghargaan, testimoni, artikel wawasan, dan isi panel ajakan.',
    'Telepon, email, WhatsApp, jam layanan, daftar kantor, kata kunci peta, dan pilihan keperluan di formulir.',
    'Nama menu, label kecil di kontak, judul kolom footer, dan semua teks formulir: label isian, tombol, catatan, pesan galat, serta isi pesan yang tersusun.',
  ],
  cmsNote:
    'Konten demo berbahasa Inggris, tetapi semua teks di setiap bagian, termasuk label formulir, pesan galat, dan judul kolom footer, bisa Anda ganti ke bahasa Indonesia atau bahasa lain. Versi dua bahasa dengan tombol ganti bahasa termasuk pekerjaan custom.',
  demo: [
    'Demo {nama} memakai Altura Developments, developer dan pengelola investasi properti fiktif yang berkantor pusat di Singapura dengan kantor di Dubai, London, dan Sydney. Ada contoh menara hunian, kawasan campuran, kantor, dan resor lengkap dengan harga, spesifikasi, pimpinan, serta penghargaan.',
    'Semua nama orang, proyek, angka, harga, alamat, dan penghargaan di demo fiktif dan hanya contoh. Tulis data perusahaan Anda apa adanya, dan ganti foto Unsplash di demo dengan foto proyek serta tim Anda sendiri.',
  ],
  custom:
    '{nama} adalah website profil perusahaan, bukan portal properti. Bila Anda membutuhkan listing yang terhubung ke database, pencarian unit dengan peta, kalkulator cicilan, jadwal kunjungan yang tersimpan, area investor, atau versi dua bahasa, fitur itu termasuk website custom. Ceritakan kebutuhan perusahaan Anda, lalu kami kirim penawaran setelah konsultasi gratis.',
  mobileLink: true,
  faq: [
    {
      question: 'Apakah {nama} bisa dipakai dengan bahasa Indonesia?',
      answer:
        'Bisa. Konten demo memang berbahasa Inggris untuk perusahaan yang melayani klien internasional, tetapi semua teks di setiap bagian, dari menu, judul, dan tombol sampai label formulir, pesan galat, dan judul kolom footer, bisa Anda tulis ulang dalam bahasa Indonesia lewat CMS.',
    },
    {
      question: 'Apakah pengunjung bisa membeli atau memesan unit langsung di website?',
      answer:
        'Tidak. {nama} tidak memiliki sistem listing, booking, atau pembayaran. Pengunjung mengisi formulir enquiry, lalu pesan yang tersusun dikirim sendiri lewat WhatsApp atau email ke tim Anda. Data formulir tidak disimpan di website.',
    },
    {
      question: 'Apakah template ini hanya cocok untuk developer properti?',
      answer:
        'Tidak harus. Bagiannya umum untuk perusahaan besar: profil, pilar, angka, keunggulan, proyek, pimpinan, penghargaan, dan kantor. Grup usaha, eksportir, atau kontraktor bisa memakainya dengan mengganti isi proyek dan portofolio.',
    },
    {
      question: 'Bagaimana filter portofolio bekerja?',
      answer:
        'Tombol filter dibuat otomatis dari kolom Kategori setiap properti, misalnya Residential, Commercial, atau Hospitality. Pengunjung menekan tombol untuk menyaring kartu, dan ikon spesifikasi seperti luas atau jumlah kamar dipilih dari teks yang Anda tulis.',
    },
    {
      question: 'Bisakah warna limau diganti dengan warna perusahaan kami?',
      answer:
        'Bisa. Pilih warna tema di CMS; tombol, lingkaran angka, kartu pilar, dan nuansa pita gelap ikut berubah, dan warna teks di atasnya disesuaikan otomatis agar tetap terbaca.',
    },
  ],
  imageAlts: {
    'altura-preview.webp': 'Tampilan beranda template website perusahaan properti {nama} di desktop dan HP dengan hero dua panel foto menara',
    'altura-1.webp': 'Bagian proyek unggulan template {nama} dengan kartu proyek bertumpuk yang melebar berfoto',
    'altura-2.webp': 'Bagian portofolio template {nama} dengan tombol filter kategori dan kartu properti berharga',
  },
  guides: ['biaya-website-company-profile', 'template-vs-jasa-website-custom'],
};
