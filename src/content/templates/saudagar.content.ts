// Isi halaman /template/saudagar. Sumber fakta: src/templates/saudagar (schema.ts, Saudagar.tsx, Header.tsx, Hero.tsx,
// About.tsx, Products.tsx, Quality.tsx, Season.tsx, Markets.tsx, Gallery.tsx, Testimonials.tsx, Faq.tsx, Closing.tsx,
// InquiryForm.tsx, Footer.tsx). Kata kunci: "template website eksportir" di paragraf pembuka; "website eksportir kopi"
// dan "website perusahaan ekspor hasil bumi" di isi. Klaim wajib jujur: formulir permintaan penawaran hanya menyusun
// pesan WhatsApp (data tidak disimpan di website), harga komoditas tidak diperbarui otomatis, tidak memproses
// pembayaran, tidak ada pelacakan kiriman atau portal pembeli. Demo: PT Saudagar Hasil Bumi, Makassar (fiktif).
import type { TemplatePageContent } from './page.types';

export const content: TemplatePageContent = {
  lead: '{nama} adalah template website eksportir untuk perusahaan yang mengirim kopi, kakao, rempah, dan kelapa ke pembeli luar negeri. Tampilannya hangat dan berkelas: judul serif, foto berbingkai lengkung, kartu spesifikasi komoditas, dan kalender musim panen, semuanya bisa Anda ubah sendiri lewat CMS.',
  suitableFor: {
    intro:
      'Pilih {nama} bila pembeli Anda biasanya meminta spesifikasi, sampel, dan jadwal stok sebelum menandatangani kontrak. Website eksportir kopi, kakao, atau rempah yang rapi membantu mereka memeriksa grade, kadar air, kemasan, dan minimum pemesanan tanpa menunggu profil PDF dikirim.',
    items: [
      'Eksportir kopi hijau, biji kakao, cengkeh, pala, atau kayu manis yang menjual ke importir dan roastery di luar negeri.',
      'Pedagang dan pengepul yang ingin naik kelas dengan website perusahaan ekspor hasil bumi berdomain sendiri.',
      'Koperasi atau kelompok tani yang mulai menjual langsung ke pembeli luar negeri dan butuh profil yang meyakinkan.',
      'Pemasok kelapa, kopra, atau arang tempurung yang melayani pabrik di dalam dan luar negeri.',
    ],
  },
  parts: [
    {
      name: 'Header bergaya masthead',
      text: 'Nama perusahaan di tengah, menu terbagi di kiri dan kanan, dan tombol permintaan penawaran; di HP menu dilipat ke panel di bawah header.',
    },
    {
      name: 'Hero tiga foto lengkung',
      text: 'Judul serif dengan satu bagian miring, deskripsi, dua tombol, dan tiga foto berbingkai lengkung dengan keterangan asal; dua foto samping boleh dikosongkan.',
    },
    { name: 'Tentang perusahaan', text: 'Pernyataan besar, cerita perusahaan, nama pendiri, foto berbingkai lengkung, dan hingga 3 angka besar.' },
    {
      name: 'Spesifikasi komoditas',
      text: 'Tab hingga 4 kategori dengan foto dan pengantar, serta hingga 12 kartu berisi grade, asal, kadar air, kemasan, dan minimum pemesanan.',
    },
    {
      name: 'Proses mutu',
      text: 'Hingga 6 langkah bernomor dari pembelian di petani sampai kontainer disegel, satu foto, dan daftar dokumen yang disiapkan bersama pembeli.',
    },
    {
      name: 'Kalender musim panen',
      text: 'Hingga 8 baris komoditas dengan batang musim panen dan panen raya per bulan, diisi sendiri dengan nama bulan seperti Mei–Sep.',
    },
    { name: 'Asal & pasar tujuan', text: 'Hingga 6 daerah asal dengan foto bulat dan hingga 10 negara tujuan beserta pelabuhan, komoditas, dan Incoterm.' },
    { name: 'Galeri', text: 'Hingga 9 foto berbingkai lengkung dengan keterangan dan lokasi, dari kebun dan penjemuran sampai pemuatan.' },
    { name: 'Testimoni & tanya jawab', text: 'Hingga 6 kutipan pembeli dengan foto bulat, lalu hingga 8 pertanyaan buka-tutup dengan tautan WhatsApp.' },
    {
      name: 'Ajakan, formulir & footer',
      text: 'Pita ajakan berwarna gelap, formulir permintaan penawaran, alamat dan peta Google Maps, lalu footer dengan nama perusahaan besar dan media sosial.',
    },
  ],
  partsNote:
    'Formulir permintaan penawaran menanyakan komoditas, volume, Incoterm, negara dan pelabuhan tujuan, lalu hanya menyusun pesan WhatsApp untuk tim penjualan Anda; data tidak disimpan di website. {nama} tidak memproses pembayaran, dan tidak ada pelacakan kiriman atau kontainer.',
  cms: [
    'Nama perusahaan, tagline, logo, dan satu warna aksen; versi gelap untuk teks dibuat otomatis agar tetap terbaca.',
    'Judul, bagian miring, deskripsi, tombol, tiga foto hero, dan keterangan asal setiap foto.',
    'Kategori dan kartu komoditas: nama, varietas, grade, asal, kadar air, kemasan, minimum pemesanan, catatan, dan nama label spesifikasinya.',
    'Langkah mutu, daftar dokumen, baris kalender panen, nama bulan, daerah asal, dan negara tujuan.',
    'Galeri, testimoni, tanya jawab, teks ajakan, serta pilihan Incoterm dan satuan volume di formulir.',
    'Alamat untuk peta, telepon, email, nomor WhatsApp, jam kerja, dan tautan media sosial.',
  ],
  cmsNote:
    'Harga komoditas tidak diperbarui otomatis: website tidak terhubung ke bursa atau sistem stok, jadi harga tetap Anda kirim lewat penawaran. Kalender panen juga berupa teks yang Anda isi sendiri, bukan data cuaca.',
  demo: [
    'Demo {nama} memakai PT Saudagar Hasil Bumi, eksportir fiktif di Makassar yang membeli kopi Toraja, kakao Luwu, cengkeh, pala, dan kopra dari kelompok tani, lalu mengirimnya ke pembeli di Asia dan Eropa. Kartu spesifikasi, kalender panen, dan daftar pelabuhan tujuan di demo bisa langsung Anda ganti.',
    'Nama perusahaan, pembeli, angka, spesifikasi, dan musim panen di demo hanyalah contoh. Tulis data perusahaan Anda apa adanya, dan sebutkan izin atau sertifikat hanya bila memang Anda miliki. Foto demo berasal dari Unsplash, jadi sebaiknya diganti dengan foto kebun, gudang, dan proses muat Anda sendiri.',
  ],
  custom:
    '{nama} adalah website profil perusahaan ekspor. Bila Anda membutuhkan daftar harga harian yang terhubung ke sistem stok, portal pembeli untuk memantau kontrak dan pengapalan, versi dua bahasa, atau formulir yang menyimpan permintaan ke database, semua itu termasuk website atau aplikasi custom. Ceritakan alur penjualan Anda, lalu kami kirim penawaran setelah konsultasi gratis.',
  mobileLink: false,
  faq: [
    {
      question: 'Apakah formulir permintaan penawaran menyimpan data pembeli?',
      answer:
        'Tidak. Formulir menanyakan nama, perusahaan, negara dan pelabuhan tujuan, komoditas, volume, Incoterm, dan kebutuhan sampel, lalu menyusunnya menjadi pesan yang dibuka di WhatsApp tim penjualan Anda. Datanya tidak tersimpan di server, jadi arsipkan percakapan itu di WhatsApp atau sistem Anda sendiri.',
    },
    {
      question: 'Apakah harga komoditas bisa tampil dan berubah otomatis?',
      answer:
        'Tidak. {nama} tidak terhubung ke bursa atau data harga, jadi kartu komoditas sengaja berisi spesifikasi, bukan harga. Harga Anda kirim lewat penawaran setelah volume, kualitas, dan Incoterm disepakati dengan pembeli.',
    },
    {
      question: 'Bisakah isi website ditulis dalam bahasa Inggris?',
      answer:
        'Semua teks dari CMS bisa Anda tulis dalam bahasa Inggris, termasuk label spesifikasi serta nama bulan dan keterangan di kalender panen. Nama menu mengikuti label kecil tiap bagian bila hanya satu kata. Judul kolom footer, label kontak seperti Alamat dan Jam kerja, label formulir, dan baris isi pesan WhatsApp tertanam di template dalam bahasa Indonesia; website dua bahasa dengan tombol ganti bahasa termasuk pekerjaan custom.',
    },
    {
      question: 'Bagaimana kalau saya hanya menjual satu komoditas, misalnya kopi?',
      answer:
        'Isi satu kategori saja. Tab otomatis hilang dan kartu spesifikasi tampil langsung. Baris kalender panen, daerah asal, dan negara tujuan juga bisa dikurangi atau disembunyikan dari CMS.',
    },
    {
      question: 'Apakah pembeli bisa memantau pengiriman di website?',
      answer:
        'Belum. Website ini berfungsi sebagai profil perusahaan dan pintu masuk permintaan penawaran. Jadwal kapal, nomor kontainer, dan dokumen pengapalan tetap Anda kirim langsung ke pembeli lewat email atau WhatsApp.',
    },
  ],
  imageAlts: {
    'saudagar-preview.webp': 'Tampilan beranda template website eksportir {nama} di desktop dan HP dengan tiga foto hasil bumi berbingkai lengkung',
    'saudagar-1.webp': 'Bagian spesifikasi komoditas template {nama} dengan tab kopi, kakao, rempah, dan kelapa serta kartu grade dan kadar air',
    'saudagar-2.webp': 'Kalender musim panen template {nama} dengan batang bulan panen dan panen raya untuk setiap komoditas',
  },
  guides: ['biaya-website-company-profile', 'template-vs-jasa-website-custom'],
};
