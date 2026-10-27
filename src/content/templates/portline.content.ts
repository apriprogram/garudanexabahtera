// Isi halaman /template/portline. Sumber fakta: src/templates/portline (schema.ts, Portline.tsx, Header.tsx, Hero.tsx,
// Newsroom.tsx, Group.tsx, Fleet.tsx, World.tsx, People.tsx, Contact.tsx, Footer.tsx, copy.ts). Kata kunci: "template
// website perusahaan pelayaran" di paragraf pembuka; "website perusahaan logistik" dan "template company profile bahasa
// Inggris" di isi. Klaim wajib jujur: formulir hanya menyusun pesan WhatsApp/email (tanpa penyimpanan data), tombol
// utilitas ("Shipment enquiry" di demo) hanya tautan atau formulir (bukan pelacak kiriman), tidak ada booking atau
// transaksi, semua teks yang tampil (termasuk menu, label formulir, pesan galat, judul kolom footer) bisa diganti di CMS.
// Demo: Quaymoor Group, Rotterdam (fiktif; "Portline" hanya nama template), konten berbahasa Inggris.
import type { TemplatePageContent } from './page.types';

export const content: TemplatePageContent = {
  lead:
    '{nama} adalah template website perusahaan pelayaran yang membuat bisnis Anda tampil seperti grup internasional sejak layar pertama. Konten demonya berbahasa Inggris, lengkap dengan slider foto kapal dan terminal, newsroom, armada, jaringan global, dan formulir enquiry; Anda tinggal mengganti foto, angka, dan teksnya.',
  suitableFor: {
    intro:
      'Pilih {nama} bila calon klien, mitra, atau investor Anda membaca dalam bahasa Inggris. Template ini cocok sebagai template company profile bahasa Inggris untuk perusahaan besar dengan beberapa unit bisnis, kantor di beberapa kota, dan kabar perusahaan yang rutin diperbarui.',
    items: [
      'Perusahaan pelayaran, agen kapal, operator terminal, dan galangan yang melayani pemilik kapal atau pencharter dari luar negeri.',
      'Perusahaan freight forwarder dan ekspedisi yang butuh website perusahaan logistik dengan daftar layanan, jaringan kota, dan formulir permintaan penawaran.',
      'Eksportir, perusahaan energi, dan grup usaha dengan beberapa anak perusahaan yang ingin tampil rapi di depan pembeli dan mitra internasional.',
      'Anak perusahaan asing di Indonesia yang memerlukan website berbahasa Inggris yang tetap bisa ditulis ulang dalam bahasa Indonesia.',
    ],
  },
  parts: [
    {
      name: 'Header dua lapis',
      text: 'Bilah atas dengan dua tombol biru berikon, lalu menu huruf kapital yang menandai bagian yang sedang dibaca; transparan di atas foto, putih saat digulir.',
    },
    {
      name: 'Hero slider berindeks',
      text: 'Hingga 4 foto selebar layar dengan indeks 01 / 02 / 03 di kanan, lingkaran radar tipis, judul besar, dan tautan teks. Slide berganti pelan dan berhenti saat disorot, ditambah deret hingga 6 logo atau nama perusahaan grup.',
    },
    {
      name: 'Newsroom & liputan media',
      text: 'Hingga 8 berita dalam mosaik ubin dengan filter tagar (#Lines, #Terminals, dan seterusnya) dan isi lengkap yang dibuka di bawah mosaik, lalu hingga 8 kutipan liputan media dengan tombol geser.',
    },
    { name: 'Angka perusahaan', text: 'Empat angka besar berikon garis, misalnya jumlah kapal, terminal, negara, dan karyawan, yang menghitung naik saat terlihat.' },
    {
      name: 'Perusahaan grup',
      text: 'Hingga 6 kartu unit bisnis berfoto dengan lencana ikon bulat dan tombol yang membuka formulir dengan unit bisnis itu terpilih, ditambah kartu ajakan opsional.',
    },
    { name: 'Armada', text: 'Hingga 6 kelas kapal atau unit armada dalam carousel kartu yang melebar, lengkap dengan jenis, kapasitas, deskripsi, dan empat baris data utama.' },
    { name: 'Jaringan global', text: 'Hingga 6 kawasan yang dibuka satu per satu berisi kota hub dan angka singkat, serta foto dengan kartu keterangan.' },
    { name: 'Keberlanjutan, karier & pimpinan', text: 'Pita biru dengan pernyataan besar dan hingga 4 komitmen, banner karier dengan poin dan email rekrutmen, serta hingga 6 profil pimpinan dengan tautan LinkedIn.' },
    { name: 'Kontak & footer', text: 'Kantor pusat, jam kantor, hingga 6 kantor regional, formulir enquiry, dan footer navy multi-kolom dengan kolom merek, telepon, email, dan media sosial.' },
  ],
  partsNote:
    'Setiap bagian bisa disembunyikan dari CMS. Formulir enquiry memeriksa nama, email, dan pesan, lalu menyusun pesan yang dikirim pengunjung sendiri lewat WhatsApp atau email; data tidak disimpan di website. Tombol utilitas seperti "Shipment enquiry" hanyalah tautan ke halaman pilihan Anda atau ke formulir, bukan sistem pelacakan.',
  cms: [
    'Nama perusahaan, tagline, logo, satu warna tema, dan bahasa situs (Inggris atau Indonesia).',
    'Foto dan teks setiap slide hero, label indeks, tombol utilitas, pilihan bahasa, dan logo perusahaan grup.',
    'Berita lengkap dengan tanggal, tagar, foto, dan isi, serta daftar liputan media.',
    'Angka perusahaan, kartu perusahaan grup, kelas armada, kawasan jaringan, komitmen keberlanjutan, dan poin karier.',
    'Profil pimpinan, alamat kantor pusat, kantor regional, jenis pertanyaan di formulir, WhatsApp, dan email penerima.',
    'Nama menu, label kontak, judul kolom footer, serta label, tombol, pesan galat, dan isi pesan formulir enquiry.',
  ],
  cmsNote:
    'Semua teks yang tampil bisa Anda tulis ulang, termasuk ke bahasa Indonesia. Pilihan bahasa EN | ID di header hanya tampil bila Anda mengisi tautan ke versi bahasa lain. Ikon angka dan lencana dipilih otomatis dari teks.',
  demo: [
    'Demo {nama} memakai Quaymoor Group, grup pelayaran dan logistik fiktif yang berkantor pusat di Rotterdam dengan lima anak perusahaan: container lines, terminal, kapal energi, darat dan udara, serta galangan. Ada contoh berita kapal baru, liputan media, kelas kapal, dan kantor regional di Singapura, Dubai, Houston, dan Jakarta.',
    'Nama perusahaan, pimpinan, kapal, media, angka, alamat, dan nomor telepon di demo hanyalah contoh. Tulis data perusahaan Anda apa adanya, termasuk izin dan sertifikasi yang benar-benar dimiliki. Foto dari Unsplash sudah dipotong atau dibersihkan dari tulisan merek yang terbaca; sebaiknya ganti dengan foto armada atau kantor Anda sendiri.',
  ],
  custom:
    '{nama} adalah website profil perusahaan. Bila Anda membutuhkan pelacakan kiriman dari sistem Anda, portal pelanggan, pemesanan ruang muat, atau website dengan dua versi bahasa penuh, fitur itu termasuk website atau aplikasi custom. Ceritakan alur kerja tim Anda, lalu kami kirim penawaran setelah konsultasi gratis.',
  mobileLink: true,
  faq: [
    {
      question: 'Apakah website ini harus berbahasa Inggris?',
      answer:
        'Tidak. Konten demo berbahasa Inggris, tetapi semua teks yang tampil, termasuk nama menu, label formulir, dan pesan galat, bisa Anda tulis ulang dalam bahasa Indonesia lewat CMS.',
    },
    {
      question: 'Apakah pengunjung bisa melacak kiriman di website ini?',
      answer:
        'Tidak ada sistem pelacakan di template ini. Tombol utilitas di header (di demo "Shipment enquiry") bisa Anda arahkan ke halaman pelacakan milik sistem Anda sendiri; bila tautannya dikosongkan, tombol membuka formulir kontak dengan topik status pengiriman.',
    },
    {
      question: 'Bagaimana formulir enquiry bekerja?',
      answer:
        'Pengunjung mengisi nama, perusahaan, email, telepon, jenis pertanyaan, unit bisnis, dan pesan. Setelah diperiksa, {nama} menampilkan pesan lengkap dengan tombol untuk membukanya di WhatsApp atau email tim Anda. Tidak ada data yang disimpan di website.',
    },
    {
      question: 'Apakah cocok untuk perusahaan logistik yang tidak punya kapal?',
      answer:
        'Cocok. Bagian armada bisa diisi armada truk atau gudang, atau disembunyikan. Kartu perusahaan grup bisa diganti menjadi daftar layanan seperti freight forwarding, kepabeanan, dan pergudangan.',
    },
    {
      question: 'Bisakah warna websitenya diganti?',
      answer:
        'Bisa. Pilih satu warna tema di CMS; tombol, tagar, garis aktif, pita keberlanjutan, serta navy untuk judul dan footer ikut menyesuaikan, dan warna teks di atasnya diatur otomatis agar tetap terbaca.',
    },
  ],
  imageAlts: {
    'portline-preview.webp': 'Tampilan beranda template website perusahaan pelayaran {nama} di desktop dan HP dengan slider foto kapal kontainer dan indeks 01/02/03',
    'portline-1.webp': 'Bagian newsroom template {nama} dengan mosaik ubin berita, ubin unggulan biru, dan filter tagar',
    'portline-2.webp': 'Bagian armada template {nama} dengan carousel kartu kelas kapal yang melebar dan kartu data utama',
  },
  guides: ['biaya-website-company-profile', 'template-vs-jasa-website-custom'],
};
