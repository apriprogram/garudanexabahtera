// Isi halaman /template/smashhall. Sumber fakta: src/templates/smashhall (schema.ts, SmashHall.tsx, Header.tsx, Hero.tsx,
// Availability.tsx, Facilities.tsx, Membership.tsx, Training.tsx, Championships.tsx, Shop.tsx, Faq.tsx, Contact.tsx,
// BookingForm.tsx, Footer.tsx). Kata kunci: "template website GOR badminton" di paragraf pembuka; "website GOR
// badminton", "website klub badminton", "website akademi badminton", dan "website booking lapangan badminton" di isi.
// Klaim wajib jujur: booking hanya menyusun pesan WhatsApp ke admin, jadwal yang tampil adalah contoh dan ketersediaan
// dikonfirmasi admin, tidak ada pembayaran online, tidak ada akun member, tidak ada keranjang belanja, data formulir
// tidak disimpan di website. Demo: GOR SmashHall, Bandung (fiktif).
import type { TemplatePageContent } from './page.types';

export const content: TemplatePageContent = {
  lead: '{nama} adalah template website GOR badminton untuk pengelola gedung, klub, dan akademi yang ingin pemainnya bisa mengecek lapangan kosong lalu langsung booking lewat WhatsApp. Tampilannya putih, bersih, dan sporty: foto lapangan yang terang di hero, strip ketersediaan delapan lapangan hari ini, lalu paket member, jadwal latihan, akademi, kejuaraan, dan toko perlengkapan dalam satu halaman.',
  suitableFor: {
    intro:
      'Pilih {nama} bila pemain biasanya bertanya lewat chat "lapangan jam tujuh masih ada?" dan Anda ingin jawabannya sudah terlihat di website GOR badminton Anda sebelum mereka menghubungi admin.',
    items: [
      'GOR atau sport center bulu tangkis dengan beberapa lapangan yang disewakan per jam.',
      'Klub badminton yang punya jadwal main rutin, member bulanan, dan sparing antarklub.',
      'Akademi atau sekolah badminton dengan kelas anak, remaja, dan dewasa.',
      'Gedung olahraga yang juga menjual kok, grip, atau sepatu di lobi.',
      'Komunitas yang rutin mengadakan turnamen internal dan ingin pendaftarannya rapi.',
    ],
  },
  parts: [
    {
      name: 'Menu atas',
      text: 'Bilah putih yang tetap terlihat saat digulir: logo, tautan ke setiap bagian, jam buka, dan tombol Booking.',
    },
    {
      name: 'Hero foto + strip lapangan',
      text: 'Foto GOR selebar layar dengan judul, deskripsi, dua tombol, dan strip kaca berisi ketersediaan lapangan hari ini dalam bentuk pil kecil kosong atau penuh.',
    },
    {
      name: 'Ketersediaan lapangan',
      text: 'Pilihan tujuh hari, tabel hingga 8 lapangan × 8 jam yang bisa dipilih, hingga 3 baris harga sewa per jam, dan tombol yang menyusun pesan booking WhatsApp untuk slot terpilih.',
    },
    { name: 'Fasilitas', text: 'Satu foto, empat angka besar seperti jumlah lapangan dan jam buka, serta hingga 10 chip fasilitas dengan ikon otomatis.' },
    {
      name: 'Member bulanan',
      text: 'Hingga 3 kartu paket dengan harga bulanan atau paket 3 bulan, jumlah sesi, daftar keuntungan, dan satu paket sorotan berwarna gelap.',
    },
    { name: 'Latihan & pelatih', text: 'Hingga 10 baris jadwal latihan (hari, jam, program, level, pelatih) dan hingga 4 kartu pelatih dengan inisial nama.' },
    { name: 'Akademi', text: 'Hingga 3 kelompok usia dengan foto, jadwal, fokus latihan, biaya per bulan, dan tombol daftar lewat WhatsApp.' },
    { name: 'Kejuaraan', text: 'Pita gelap dengan foto dan garis waktu hingga 5 turnamen: tanggal, kategori, status pendaftaran, biaya, atau hasilnya.' },
    { name: 'Perlengkapan', text: 'Hingga 8 produk seperti raket, kok, grip, dan sepatu dengan foto, harga, catatan singkat, dan tombol pesan via WhatsApp.' },
    { name: 'Galeri', text: 'Hingga 8 foto suasana GOR dengan keterangan; foto pertama tampil besar.' },
    { name: 'Tanya jawab', text: 'Hingga 8 pertanyaan yang bisa dibuka dan ditutup, misalnya soal cara booking, pembayaran, dan sewa raket.' },
    {
      name: 'Kontak & formulir',
      text: 'Alamat, WhatsApp, telepon, email, jam buka, peta Google Maps, dan formulir booking & pendaftaran yang menanyakan keperluan, tanggal, jam, dan jumlah pemain.',
    },
    { name: 'Footer', text: 'Footer putih bergaris warna aksen dengan deskripsi singkat, menu, kontak, jam buka, dan tautan media sosial.' },
  ],
  partsNote:
    'Booking hanya menyusun pesan WhatsApp ke admin; jadwal yang tampil adalah contoh yang Anda isi sendiri lewat CMS dan ketersediaan dikonfirmasi admin. Tidak ada pembayaran online, tidak ada akun member, dan tidak ada keranjang belanja: pendaftaran member, akademi, turnamen, serta pesanan toko juga lewat WhatsApp. Data formulir tidak disimpan di website.',
  cms: [
    'Nama GOR, tagline, logo, dan satu warna aksen; warna teks di atas tombol menyesuaikan otomatis.',
    'Semua judul, deskripsi, teks tombol, tujuan tautan, legenda tabel, dan judul kolom jadwal latihan.',
    'Daftar lapangan, jam yang ditampilkan, dan slot penuh per hari (cukup tulis, misalnya, "L1 19.00, L3 20.00").',
    'Harga sewa, paket member, jadwal latihan, pelatih, kelompok akademi, dan daftar turnamen.',
    'Foto hero, fasilitas, akademi, kejuaraan, produk toko, dan galeri beserta keterangannya.',
    'Alamat, telepon, email, nomor WhatsApp admin, jam buka, dan link Google Maps.',
    'Menampilkan atau menyembunyikan setiap bagian, misalnya Toko bila GOR Anda tidak berjualan perlengkapan.',
  ],
  cmsNote:
    'Tabel ketersediaan tidak tersambung ke sistem booking; perbarui slot penuh lewat CMS. Tata letak, urutan bagian, dan isian formulir mengikuti desain template.',
  demo: [
    'Demo {nama} memakai GOR fiktif bernama GOR SmashHall di Bandung dengan delapan lapangan karpet vinyl yang buka setiap hari. Di sana terlihat cara pemain mengecek slot kosong, membandingkan paket member, dan mendaftar turnamen tanpa bertanya satu per satu.',
    'Nama GOR, pelatih, juara turnamen, harga, jadwal, dan alamat di demo adalah contoh. Ganti semuanya dengan data asli GOR Anda sebelum alamat website dibagikan.',
  ],
  custom:
    '{nama} dibuat sebagai satu halaman agar cepat aktif. Bila Anda butuh sistem booking lapangan real-time yang mencegah jadwal bentrok, pembayaran online, akun member dengan saldo sesi, toko online dengan keranjang, atau papan skor turnamen otomatis, semua itu termasuk website custom; biayanya kami sampaikan setelah konsultasi gratis.',
  faq: [
    {
      question: 'Apakah {nama} sudah bisa menerima booking lapangan otomatis?',
      answer:
        'Belum. Pemain memilih slot kosong di tabel, lalu website menyusun pesan WhatsApp ke admin Anda. Admin yang mengonfirmasi jadwal dan pembayaran. Booking otomatis dengan pembayaran online bisa dibuat sebagai pekerjaan custom.',
    },
    {
      question: 'Bagaimana cara memperbarui lapangan yang sudah penuh?',
      answer:
        'Di CMS, setiap hari punya isian "slot penuh". Tulis kode lapangan dan jamnya, misalnya "L2 19.00, L5 20.00", lalu simpan. Tabel dan strip di hero langsung mengikuti.',
    },
    {
      question: 'Apakah website klub badminton ini punya akun member?',
      answer:
        'Tidak. Paket member tampil sebagai kartu harga, dan tombol Gabung menyusun pesan WhatsApp. Tidak ada login atau pembayaran online, jadi data member tetap Anda kelola sendiri.',
    },
    {
      question: 'Bisakah dipakai untuk akademi badminton saja?',
      answer:
        'Bisa. Sembunyikan bagian Ketersediaan, Member, atau Toko lewat CMS, lalu tonjolkan Akademi, Latihan & pelatih, dan Kejuaraan. Website akademi badminton Anda tetap rapi tanpa bagian kosong.',
    },
    {
      question: 'Bisakah warna website disamakan dengan logo GOR?',
      answer:
        'Bisa. Ganti warna aksen di bagian Identitas & warna; tombol, pil jadwal, ikon kok, dan garis footer ikut menyesuaikan, dan warna teks dipilih otomatis agar tetap terbaca.',
    },
  ],
  imageAlts: {
    'smashhall-preview.webp': 'Tampilan beranda template website GOR badminton {nama} di desktop dan HP: foto lapangan, judul, dan strip ketersediaan lapangan',
    'smashhall-1.webp': 'Tabel ketersediaan lapangan template {nama}: pilihan hari, lapangan × jam kosong atau penuh, dan harga sewa per jam',
    'smashhall-2.webp': 'Bagian kejuaraan template {nama}: foto GOR dan garis waktu turnamen internal & antarklub dengan status pendaftaran dan hasil',
  },
  guides: ['template-vs-jasa-website-custom'],
};
