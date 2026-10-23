// Isi halaman /template/finova. Sumber fakta: src/templates/finova (schema.ts, Finova.tsx, Hero.tsx, Product.tsx,
// Features.tsx, Faq.tsx, Closing.tsx, Footer.tsx). Klaim wajib jujur (rencana §5.5): TANPA klaim OJK/regulator atau
// izin; template tidak memproses transaksi. "Koperasi" boleh karena copy demo memuat iuran koperasi.
// Demo: Lumbung Arta (fiktif).
import type { TemplatePageContent } from './page.types';

export const content: TemplatePageContent = {
  lead:
    '{nama} adalah template landing page untuk startup fintech, koperasi simpan pinjam, aplikasi pembayaran dan dompet digital, konsultan keuangan, serta produk SaaS. Bagian pembukanya berupa panel gelap dengan kartu saldo melayang, lalu angka besar, kartu tampilan aplikasi, fitur bento, testimoni, dan tanya jawab yang membuat produk Anda mudah dipahami.',
  suitableFor: {
    intro:
      '{nama} dibuat untuk produk keuangan yang perlu dijelaskan dengan tenang: apa manfaatnya, bagaimana cara kerjanya, dan jawaban atas pertanyaan yang biasanya membuat calon pengguna ragu. Isinya cocok untuk halaman perkenalan aplikasi atau layanan, bukan untuk menjalankan transaksi.',
    items: [
      'Startup fintech yang ingin memperkenalkan aplikasinya dan mengarahkan pengunjung ke App Store atau Google Play.',
      'Koperasi simpan pinjam yang ingin menjelaskan layanan dan cara bergabung kepada calon anggota.',
      'Aplikasi pembayaran, dompet digital, atau pencatat keuangan keluarga.',
      'Konsultan keuangan dan produk SaaS yang membutuhkan halaman fitur, testimoni, dan FAQ.',
    ],
  },
  parts: [
    {
      name: 'Hero (panel gelap)',
      text: 'Menu, label kecil, judul dengan kata sorotan, deskripsi, dua tombol, foto produk dengan kartu saldo melayang dan hingga 3 transaksi contoh, serta bukti sosial berupa angka dan foto pengguna.',
    },
    { name: 'Mitra & afiliasi', text: 'Strip logo satu warna di bagian bawah panel pembuka, hingga 8 logo.' },
    { name: 'Angka besar', text: 'Hingga 4 angka raksasa dengan satuan kecil di pojoknya, misalnya 2,4 jt+.' },
    {
      name: 'Produk',
      text: 'Penjelasan manfaat dengan hingga 4 poin dan dua kartu tampilan aplikasi (grafik dan daftar rekening) yang teksnya bisa diubah, atau tangkapan layar aplikasi Anda sendiri.',
    },
    {
      name: 'Fitur (bento)',
      text: 'Hingga 4 fitur dalam kartu abu; kartu lebar bisa menampilkan peta Indonesia dan satu kartu angka.',
    },
    { name: 'Testimoni', text: 'Hingga 6 testimoni dengan potret besar dan tombol panah untuk berpindah.' },
    { name: 'Tanya jawab (FAQ)', text: 'Hingga 8 pertanyaan yang bisa dibuka-tutup, dengan kartu bantuan WhatsApp di sampingnya.' },
    { name: 'Ajakan (CTA)', text: 'Pita gelap berkisi dengan tombol utama serta tombol unduh App Store dan Google Play.' },
    { name: 'Kontak', text: 'Alamat, telepon, email, WhatsApp, jam layanan, dan peta Google Maps.' },
    {
      name: 'Footer',
      text: 'Logo, deskripsi, tombol unduh, hingga 16 tautan dalam beberapa kolom, catatan kecil di bagian bawah, dan media sosial.',
    },
  ],
  cms: [
    'Nama usaha atau aplikasi, tagline, logo, warna utama, dan warna tombol (dua warna merek).',
    'Kartu saldo, transaksi contoh, angka bukti sosial, dan angka besar.',
    'Teks dan nominal pada kartu tampilan aplikasi, atau tangkapan layar aplikasi Anda sebagai penggantinya.',
    'Fitur, testimoni, serta daftar pertanyaan FAQ beserta jawabannya.',
    'Tautan App Store dan Google Play; tombol yang tautannya kosong otomatis disembunyikan.',
    'Kolom tautan footer, catatan kecil untuk informasi izin usaha, kontak, dan media sosial.',
  ],
  cmsNote:
    'Kartu saldo dan grafik hanyalah tampilan berisi teks yang Anda tulis. {nama} tidak terhubung ke rekening, tidak menyimpan data pengguna, dan tidak memproses transaksi.',
  demo: [
    'Demo {nama} memakai Lumbung Arta, aplikasi keuangan fiktif untuk keluarga dan pelaku usaha, termasuk fitur iuran koperasi. Contohnya memperlihatkan bagaimana tabungan, pembayaran tagihan, anggaran, dan arus kas usaha dijelaskan lewat kartu saldo, kartu tampilan aplikasi, dan fitur bento.',
    'Angka pengguna, logo mitra, dan testimoni di demo adalah contoh fiktif. Ganti dengan data asli, dan jangan menampilkan logo bank, jaringan kartu, atau lembaga lain tanpa izin pemiliknya.',
  ],
  custom:
    '{nama} memperkenalkan produk; ia tidak menjalankan layanan keuangan. Bila Anda butuh pendaftaran anggota atau pengguna, simulasi pinjaman, dasbor saldo, integrasi pembayaran, atau aplikasi Android dan iOS, semuanya dikerjakan sebagai proyek custom. Kami membahas alur dan kebutuhan keamanannya saat konsultasi gratis, lalu mengirim penawaran.',
  mobileLink: true,
  faq: [
    {
      question: 'Apakah {nama} cocok untuk koperasi?',
      answer:
        'Cocok untuk memperkenalkan koperasi kepada calon anggota. Demo sudah memuat contoh fitur iuran koperasi, dan Anda bisa menjelaskan layanan, cara menjadi anggota, serta tanya jawab lewat bagian Produk, Fitur, dan FAQ, lalu mengarahkan pengunjung ke WhatsApp pengurus.',
    },
    {
      question: 'Bisakah menambahkan tautan Play Store dan App Store?',
      answer:
        'Bisa. Isi tautan App Store dan Google Play di bagian Ajakan; tombolnya tampil di blok ajakan dan footer. Bila salah satu tautan kosong, tombolnya disembunyikan, jadi tetap rapi walau aplikasi Anda baru ada di satu toko.',
    },
    {
      question: 'Apakah {nama} bisa memproses transaksi atau menampilkan saldo asli?',
      answer:
        'Tidak. {nama} adalah website perkenalan; kartu saldo dan grafik di dalamnya hanya tampilan berisi teks yang Anda tulis. Transaksi, login pengguna, dan dasbor keuangan dibuat sebagai aplikasi atau sistem custom.',
    },
    {
      question: 'Bisakah mencantumkan informasi izin usaha?',
      answer:
        'Footer punya kolom catatan kecil untuk informasi izin usaha atau catatan penting lain. Isi hanya dengan izin yang benar-benar Anda miliki; template ini tidak menambahkan klaim izin atau pengawasan lembaga mana pun.',
    },
    {
      question: 'Berapa warna merek yang bisa diatur?',
      answer:
        'Dua: warna utama untuk panel gelap, ajakan, dan teks sorotan, serta warna tombol dan sorotan. Keduanya dipilih lewat CMS sehingga tampilan bisa disesuaikan dengan identitas merek Anda.',
    },
  ],
  imageAlts: {
    'finova-preview.webp': 'Tampilan beranda template website fintech {nama} di desktop dan HP dengan panel gelap dan kartu saldo',
    'finova-1.webp': 'Bagian produk template {nama} dengan poin manfaat dan kartu tampilan aplikasi',
    'finova-2.webp': 'Bagian testimoni template {nama} dengan potret pengguna dan kartu kutipan',
  },
  guides: ['biaya-aplikasi-android-ios', 'template-vs-jasa-website-custom'],
};
