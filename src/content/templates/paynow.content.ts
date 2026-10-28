// Isi halaman /template/paynow. Sumber fakta: src/templates/paynow (schema.ts, PayNow.tsx, Header.tsx, Hero.tsx,
// Bands.tsx, Features.tsx, Fees.tsx, Security.tsx, Developers.tsx, Stories.tsx, Closing.tsx, Contact.tsx, Footer.tsx).
// Kata kunci: "template landing page dompet digital" di paragraf pembuka; "template website payment gateway",
// "landing page e-wallet", dan "website aplikasi pembayaran" di isi. Klaim wajib jujur: halaman pemasaran — tidak
// memproses pembayaran, tidak menyimpan saldo, contoh kode API hanya ilustrasi, tarif = contoh dari CMS, izin usaha &
// lembaga pengawas diisi pemilik merek, formulir merchant hanya menyusun pesan WhatsApp (data tidak disimpan di website).
// Demo: PayNow, merek dompet digital & payment gateway fiktif dari Jakarta.
import type { TemplatePageContent } from './page.types';

export const content: TemplatePageContent = {
  lead: '{nama} adalah template landing page dompet digital dan payment gateway untuk memperkenalkan aplikasi pembayaran Anda kepada pengguna dan merchant. Bagian pembukanya berupa foto suasana bertransaksi di bawah gradasi biru-ungu, lengkap dengan mockup HP berisi saldo dan kartu notifikasi, lalu halaman menuntun pengunjung dari fitur dan simulasi biaya sampai unduh aplikasi.',
  suitableFor: {
    intro:
      'Pilih {nama} bila produk Anda perlu dijelaskan kepada dua kelompok sekaligus: pengguna yang ingin membayar dengan mudah, dan pemilik usaha yang ingin menerima pembayaran digital. Teksnya singkat, angkanya jelas, dan setiap bagian bisa diubah lewat CMS.',
    items: [
      'Startup dompet digital atau e-wallet yang butuh landing page e-wallet untuk mengarahkan pengunjung ke Google Play dan App Store.',
      'Penyedia payment gateway yang ingin memperlihatkan contoh tarif, endpoint API, dan cara mulai di sandbox.',
      'Aplikasi kasir, koperasi digital, atau agregator QRIS yang mencari website aplikasi pembayaran yang tampil tepercaya.',
      'Tim produk yang menyiapkan halaman peluncuran fitur baru sebelum aplikasinya rilis.',
    ],
  },
  parts: [
    { name: 'Menu atas', text: 'Transparan di atas foto pembuka, lalu berubah menjadi bilah gelap saat digulir, dengan tombol Daftar merchant.' },
    {
      name: 'Hero dompet',
      text: 'Foto latar selebar layar, judul, dua tombol, tiga chip, dan mockup HP berisi saldo, empat tombol fitur, hingga 3 transaksi contoh, serta hingga 3 kartu notifikasi.',
    },
    { name: 'Strip jenis usaha', text: 'Hingga 16 chip jenis usaha seperti kedai kopi dan laundry, tanpa logo perusahaan.' },
    { name: 'Fitur bertab', text: 'Hingga 5 tab (misalnya QRIS, Transfer, Tagihan, Top-up) dengan tiga poin, foto, dan layar HP yang berganti per tab.' },
    { name: 'Simulasi biaya', text: 'Hingga 6 contoh tarif per metode bayar dan kalkulator biaya, total dibayar pelanggan, serta dana yang diterima merchant.' },
    { name: 'Keamanan', text: 'Section gelap dengan foto dan hingga 6 fitur keamanan seperti PIN, biometrik, dan notifikasi.' },
    { name: 'Developer & API', text: 'Hingga 6 endpoint, 4 langkah sandbox, dan jendela contoh kode bertab (cURL, Node.js, PHP) dengan tombol salin.' },
    { name: 'Angka', text: 'Pita gradasi dengan hingga 4 angka yang menghitung naik dan catatan kecil di bawahnya.' },
    { name: 'Cerita merchant', text: 'Hingga 6 kartu cerita dengan foto usaha, kutipan, foto orang atau inisial, serta jenis usaha dan kotanya.' },
    { name: 'Tanya jawab', text: 'Hingga 8 pertanyaan yang bisa dibuka dan ditutup, dengan tautan chat ke tim Anda.' },
    { name: 'Unduh aplikasi', text: 'Tombol Google Play dan App Store berupa teks, kode QR unduhan opsional, dan foto tegak.' },
    {
      name: 'Daftar merchant & footer',
      text: 'Kontak, formulir pendaftaran merchant, lalu footer gelap berisi menu, media sosial, dan baris legal untuk nama badan usaha serta izin Anda.',
    },
  ],
  partsNote:
    'Template ini halaman pemasaran; tidak memproses pembayaran, tidak menyimpan saldo, dan contoh kode API hanya ilustrasi. Izin usaha dan lembaga pengawas diisi pemilik merek. Formulir pendaftaran merchant hanya menyusun pesan WhatsApp; data tidak disimpan di website.',
  cms: [
    'Nama merek, tagline, logo, dan satu warna aksen; gradasi biru-ungu dan section gelap ikut menyesuaikan.',
    'Semua judul, deskripsi, teks tombol, dan tujuan tautan, termasuk tautan Google Play dan App Store.',
    'Isi mockup HP: sapaan, saldo, tombol fitur, transaksi contoh, dan kartu notifikasi.',
    'Tab fitur beserta foto dan isi layar HP-nya, serta daftar contoh tarif untuk simulasi biaya.',
    'Endpoint, langkah sandbox, dan contoh kode API yang tampil di jendela kode.',
    'Angka, cerita merchant, tanya jawab, kontak, pilihan jenis usaha di formulir, dan baris legal footer.',
    'Menampilkan atau menyembunyikan setiap bagian, misalnya Developer & API bila produk Anda belum punya API.',
  ],
  cmsNote:
    'Saldo, transaksi, dan tarif yang tampil adalah teks yang Anda tulis sendiri; simulasi biaya hanya menghitung dari contoh tarif itu dan tidak terhubung ke sistem pembayaran mana pun.',
  demo: [
    'Demo {nama} memakai PayNow, merek dompet digital dan payment gateway fiktif dari Jakarta. Di sana terlihat bagaimana fitur QRIS, transfer, tagihan, dan isi saldo dijelaskan lewat layar HP, bagaimana merchant menghitung biaya dari contoh tarif, dan bagaimana tim teknis melihat contoh integrasi API.',
    'Angka pengguna, tarif, alamat API, cerita merchant, dan alamat kantor di demo adalah contoh fiktif. Ganti dengan data asli sebelum website dibagikan, dan tulis informasi izin serta lembaga pengawas hanya sesuai dokumen yang benar-benar Anda miliki.',
  ],
  custom:
    '{nama} memperkenalkan produk; ia tidak menjalankan layanan keuangan. Bila Anda butuh pendaftaran pengguna, dasbor merchant, pembayaran yang benar-benar diproses, dokumentasi API lengkap, atau aplikasi Android dan iOS, semuanya dikerjakan sebagai proyek custom. Kami membahas alur dan kebutuhan keamanannya saat konsultasi gratis, lalu mengirim penawaran.',
  mobileLink: true,
  faq: [
    {
      question: 'Apakah {nama} bisa memproses pembayaran atau menyimpan saldo?',
      answer:
        'Tidak. {nama} adalah template landing page dompet digital untuk memperkenalkan produk. Saldo dan transaksi di mockup HP hanya teks yang Anda tulis, dan tidak ada pembayaran yang diproses di website.',
    },
    {
      question: 'Apakah contoh kode API di template ini bisa dipakai?',
      answer:
        'Contoh kode hanya ilustrasi. Ganti alamat API, endpoint, dan kodenya dengan milik layanan Anda lewat CMS, lalu tautkan tombol dokumentasi ke halaman dokumentasi resmi Anda.',
    },
    {
      question: 'Bagaimana cara kerja simulasi biaya?',
      answer:
        'Anda mengisi daftar tarif per metode bayar, misalnya persen dan biaya tetap. Pengunjung memasukkan nominal dan metode, lalu melihat biaya, total yang dibayar pelanggan, dan dana yang diterima merchant. Tarif di demo adalah contoh.',
    },
    {
      question: 'Di mana saya mencantumkan izin usaha?',
      answer:
        'Footer punya baris legal yang bisa Anda isi dengan nama badan usaha, izin, dan lembaga pengawas. Isi hanya dengan informasi yang benar-benar Anda miliki; template ini tidak menambahkan klaim izin apa pun.',
    },
    {
      question: 'Bagaimana formulir pendaftaran merchant bekerja?',
      answer:
        'Calon merchant mengisi nama, nama usaha, jenis usaha, kota, dan layanan yang diminati. Formulir lalu menyusun pesan WhatsApp ke nomor Anda; data tidak disimpan di website.',
    },
  ],
  imageAlts: {
    'paynow-preview.webp': 'Tampilan beranda template landing page dompet digital {nama} di desktop dan HP: foto bergradasi biru-ungu dengan mockup HP dan notifikasi',
    'paynow-1.webp': 'Bagian fitur template {nama} dengan tab QRIS, transfer, tagihan, dan isi saldo serta layar HP contoh',
    'paynow-2.webp': 'Bagian developer template {nama} berisi jendela contoh kode API, endpoint, dan langkah sandbox',
  },
  guides: ['biaya-aplikasi-android-ios', 'template-vs-jasa-website-custom'],
};
