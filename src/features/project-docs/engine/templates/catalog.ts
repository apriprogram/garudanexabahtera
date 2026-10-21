// Default, service-specific content of the templates (website, aplikasi mobile, desain UI/UX, aplikasi custom):
// business goals, requirements, deliverables, UAT scenarios and hand-over items. Written as solid starting points that
// the admin tailors per project in the editor.
import type { ServiceType } from '../../types';

type PerService<T> = Record<ServiceType, T>;

export const GOALS: PerService<string[]> = {
  website: [
    'Memperkuat kehadiran digital dan kredibilitas {{client.name}} di mata calon pelanggan dan mitra.',
    'Menyajikan informasi produk dan layanan yang akurat, mudah ditemukan, dan dapat diperbarui sendiri.',
    'Menghasilkan prospek (leads) melalui formulir kontak dan tombol WhatsApp.',
    'Mendukung pemasaran digital melalui optimasi mesin pencari (SEO) dasar.',
  ],
  mobile_app: [
    'Menghadirkan layanan {{client.name}} yang dapat diakses pelanggan kapan saja melalui ponsel.',
    'Mendigitalkan proses bisnis utama agar lebih cepat, terukur, dan minim kesalahan.',
    'Meningkatkan keterlibatan pengguna melalui notifikasi dan fitur yang personal.',
    'Menyediakan data operasional untuk pengambilan keputusan.',
  ],
  ui_ux: [
    'Menghasilkan pengalaman pengguna yang mudah dipahami dan konsisten dengan identitas merek {{client.name}}.',
    'Mengurangi hambatan pengguna dalam menyelesaikan tugas utama.',
    'Menyediakan desain dan design system yang siap dikembangkan oleh tim pengembang.',
  ],
  other: [
    'Mendigitalkan dan mengotomatiskan proses bisnis yang saat ini dilakukan secara manual.',
    'Menyediakan data yang terpusat, akurat, dan dapat diakses sesuai hak akses.',
    'Mempercepat pelaporan dan pengambilan keputusan manajemen.',
    'Menekan biaya operasional dan risiko kesalahan manusia.',
  ],
};

/** [kebutuhan, prioritas MoSCoW] */
export const FUNCTIONAL: PerService<[string, string][]> = {
  website: [
    ['Halaman beranda yang menampilkan profil singkat, keunggulan, layanan unggulan, dan ajakan bertindak (CTA)', 'Must have'],
    ['Halaman tentang kami: profil, visi dan misi, tim, serta legalitas', 'Must have'],
    ['Halaman layanan/produk beserta detailnya', 'Must have'],
    ['Halaman portofolio atau galeri proyek', 'Should have'],
    ['Halaman kontak dengan formulir, peta lokasi, dan tombol WhatsApp', 'Must have'],
    ['Blog/artikel dengan kategori dan pencarian', 'Should have'],
    ['Panel admin (CMS) untuk mengelola halaman, layanan, portofolio, artikel, dan pengaturan situs', 'Must have'],
    ['SEO dasar: judul dan deskripsi meta, URL ramah SEO, sitemap.xml, robots.txt', 'Must have'],
    ['Integrasi Google Analytics, Google Search Console, dan media sosial', 'Should have'],
    ['Dukungan dua bahasa (Indonesia dan Inggris)', 'Could have'],
  ],
  mobile_app: [
    ['Registrasi, login, dan lupa kata sandi (email atau nomor HP)', 'Must have'],
    ['Profil pengguna dan pengaturan akun', 'Must have'],
    ['Fitur inti sesuai proses bisnis klien (katalog, pemesanan, atau transaksi)', 'Must have'],
    ['Riwayat transaksi dan status pesanan', 'Must have'],
    ['Notifikasi push', 'Should have'],
    ['Integrasi pembayaran (payment gateway)', 'Should have'],
    ['Panel admin berbasis web untuk mengelola data, pengguna, dan konten', 'Must have'],
    ['Dashboard dan laporan ringkas untuk admin', 'Should have'],
    ['Mode gelap dan pilihan bahasa', 'Could have'],
    ['Publikasi aplikasi ke Google Play dan App Store', 'Must have'],
  ],
  ui_ux: [
    ['Riset dan analisis kebutuhan pengguna (persona, user journey)', 'Must have'],
    ['Arsitektur informasi dan user flow', 'Must have'],
    ['Wireframe seluruh halaman/layar utama', 'Must have'],
    ['Desain antarmuka high-fidelity untuk desktop dan mobile', 'Must have'],
    ['Prototipe interaktif untuk presentasi dan uji pengguna', 'Must have'],
    ['Design system/UI kit: warna, tipografi, komponen, ikon', 'Should have'],
    ['Uji kegunaan (usability testing) dengan perwakilan pengguna', 'Should have'],
    ['Serah terima desain untuk pengembang: spesifikasi dan aset', 'Must have'],
  ],
  other: [
    ['Login dan manajemen pengguna dengan hak akses berbasis peran', 'Must have'],
    ['Pengelolaan data master sesuai proses bisnis', 'Must have'],
    ['Modul transaksi/proses inti sesuai alur kerja klien', 'Must have'],
    ['Alur persetujuan (approval) bertingkat', 'Should have'],
    ['Dashboard ringkasan dan indikator kinerja', 'Should have'],
    ['Laporan dengan filter serta ekspor PDF/Excel', 'Must have'],
    ['Notifikasi email dan dalam aplikasi', 'Should have'],
    ['Log aktivitas (audit trail)', 'Should have'],
    ['Integrasi API dengan sistem lain', 'Could have'],
    ['Pencadangan data terjadwal', 'Must have'],
  ],
};

export const COMPATIBILITY: PerService<string> = {
  website:
    '**Kompatibilitas**: tampil baik di Chrome, Firefox, Safari, dan Edge versi terbaru, serta responsif di ponsel, tablet, dan desktop.',
  mobile_app: '**Kompatibilitas**: berjalan di Android 8.0 ke atas dan iOS 15 ke atas, pada berbagai ukuran layar ponsel.',
  ui_ux: '**Kompatibilitas**: desain responsif untuk desktop dan mobile serta memenuhi pedoman aksesibilitas WCAG 2.1 AA.',
  other: '**Kompatibilitas**: berjalan di Chrome, Firefox, Safari, dan Edge versi terbaru, dengan tampilan yang responsif.',
};

export const SOLUTION: PerService<string[]> = {
  website: [
    '**Desain khusus** sesuai identitas merek, bukan template massal.',
    '**Teknologi modern** dengan performa tinggi dan optimasi SEO dasar.',
    '**Panel admin (CMS)** agar konten dapat diperbarui sendiri tanpa bantuan programmer.',
    '**Keamanan** dengan sertifikat SSL, perlindungan formulir, dan pencadangan berkala.',
    '**Pendampingan** berupa pelatihan penggunaan dan garansi perbaikan setelah serah terima.',
  ],
  mobile_app: [
    '**Aplikasi Android dan iOS** dengan antarmuka yang intuitif dan konsisten.',
    '**Backend dan API yang aman** serta siap dikembangkan.',
    '**Panel admin web** untuk mengelola data, pengguna, dan konten.',
    '**Pendampingan publikasi** ke Google Play dan App Store.',
    '**Garansi perbaikan** dan opsi pemeliharaan setelah serah terima.',
  ],
  ui_ux: [
    '**Riset pengguna** untuk memahami kebutuhan dan perilaku pengguna sasaran.',
    '**Desain high-fidelity** yang konsisten dengan identitas merek.',
    '**Prototipe interaktif** untuk validasi alur sebelum pengembangan.',
    '**Design system** agar pengembangan berikutnya cepat dan seragam.',
  ],
  other: [
    '**Aplikasi web berbasis peran** sesuai struktur organisasi klien.',
    '**Alur kerja digital** yang menggantikan proses manual.',
    '**Laporan dan dashboard** untuk pemantauan kinerja.',
    '**Arsitektur yang aman dan modular** sehingga mudah dikembangkan.',
    '**Pendampingan** berupa pelatihan, dokumentasi, dan garansi perbaikan.',
  ],
};

export const DELIVERABLES: PerService<string[]> = {
  website: [
    'Website yang telah dipasang (deploy) pada domain dan hosting yang disepakati.',
    'Panel admin (CMS) beserta akun administrator.',
    'Kode sumber lengkap dan basis data.',
    'Panduan penggunaan panel admin.',
    'Pelatihan penggunaan bagi pengelola website.',
  ],
  mobile_app: [
    'Aplikasi Android dan iOS yang siap dipublikasikan atau telah terbit di toko aplikasi.',
    'Backend, API, dan panel admin web yang telah dipasang di server.',
    'Kode sumber aplikasi, backend, dan panel admin.',
    'Dokumentasi teknis/API dan panduan penggunaan.',
    'Pelatihan penggunaan bagi pengelola aplikasi.',
  ],
  ui_ux: [
    'Laporan riset pengguna, persona, dan user journey.',
    'Wireframe dan desain high-fidelity seluruh layar dalam ruang lingkup.',
    'Prototipe interaktif alur utama.',
    'Design system/UI kit dan aset grafis siap pakai.',
    'Dokumen serah terima desain untuk pengembang.',
  ],
  other: [
    'Aplikasi yang telah dipasang (deploy) di server yang disepakati.',
    'Akun administrator dan pengaturan hak akses awal.',
    'Kode sumber lengkap dan skema basis data.',
    'Dokumentasi teknis dan panduan penggunaan.',
    'Pelatihan penggunaan bagi pengguna kunci (key user).',
  ],
};

/** SOW features: [fitur, keterangan] */
export const FEATURES: PerService<[string, string][]> = {
  website: [
    ['Halaman publik', 'Beranda, Tentang kami, Layanan/Produk, Portofolio, Blog, dan Kontak'],
    ['Panel admin (CMS)', 'Kelola halaman, layanan, portofolio, artikel, media, dan pengaturan situs'],
    ['Formulir kontak & WhatsApp', 'Formulir dengan validasi dan notifikasi email, tombol WhatsApp'],
    ['SEO dasar', 'Meta judul/deskripsi, URL ramah SEO, sitemap.xml, robots.txt, Open Graph'],
    ['Keamanan', 'SSL/HTTPS, kata sandi terenkripsi, perlindungan spam, pencadangan berkala'],
    ['Analitik', 'Pemasangan Google Analytics dan Google Search Console'],
  ],
  mobile_app: [
    ['Autentikasi', 'Registrasi, login, lupa kata sandi, dan profil pengguna'],
    ['Fitur inti', 'Alur utama sesuai Dokumen Kebutuhan Bisnis'],
    ['Notifikasi', 'Notifikasi push untuk status dan informasi penting'],
    ['Panel admin web', 'Kelola pengguna, data, konten, dan laporan'],
    ['Backend & API', 'API aman dengan autentikasi token dan basis data'],
    ['Publikasi', 'Pendampingan rilis ke Google Play dan App Store'],
  ],
  ui_ux: [
    ['Riset pengguna', 'Wawancara/survei, persona, dan user journey'],
    ['Arsitektur informasi', 'Sitemap/struktur navigasi dan user flow'],
    ['Wireframe', 'Kerangka seluruh layar dalam ruang lingkup'],
    ['Desain high-fidelity', 'Versi desktop dan mobile'],
    ['Prototipe', 'Prototipe interaktif alur utama'],
    ['Design system', 'Warna, tipografi, komponen, ikon, dan panduan penggunaan'],
  ],
  other: [
    ['Manajemen pengguna', 'Login, peran, dan hak akses'],
    ['Data master', 'Pengelolaan data referensi sesuai proses bisnis'],
    ['Proses inti', 'Modul transaksi dan alur persetujuan'],
    ['Laporan & dashboard', 'Laporan dengan filter, ekspor PDF/Excel, dan ringkasan kinerja'],
    ['Notifikasi & log', 'Notifikasi dalam aplikasi/email dan log aktivitas'],
    ['Keamanan & cadangan', 'SSL/HTTPS, enkripsi kata sandi, dan pencadangan terjadwal'],
  ],
};

export const OUT_OF_SCOPE: PerService<string[]> = {
  website: [
    'Pembuatan konten (penulisan teks, fotografi, video) kecuali disebutkan lain.',
    'Biaya domain, hosting, dan lisensi berbayar yang tidak tercantum dalam penawaran.',
    'Pemasaran digital berbayar (iklan) dan pengelolaan media sosial.',
    'Fitur di luar daftar fitur pada Lampiran ini.',
  ],
  mobile_app: [
    'Biaya akun pengembang Google Play Console dan Apple Developer Program.',
    'Biaya server, layanan notifikasi, SMS/WhatsApp gateway, dan payment gateway.',
    'Pembuatan konten dan pemasukan data awal dalam jumlah besar.',
    'Fitur di luar daftar fitur pada Lampiran ini.',
  ],
  ui_ux: [
    'Pengembangan (coding) aplikasi atau website.',
    'Pembuatan identitas merek (logo) baru dan fotografi.',
    'Penulisan konten di luar teks antarmuka (microcopy).',
    'Layar atau alur di luar daftar fitur pada Lampiran ini.',
  ],
  other: [
    'Migrasi data dari sistem lama kecuali disebutkan lain.',
    'Biaya server, lisensi, dan layanan pihak ketiga yang tidak tercantum dalam penawaran.',
    'Integrasi dengan sistem lain yang tidak disebutkan dalam Dokumen Kebutuhan Bisnis.',
    'Fitur di luar daftar fitur pada Lampiran ini.',
  ],
};

/** UAT scenarios: [fitur, langkah, hasil yang diharapkan] */
export const UAT_SCENARIOS: PerService<[string, string, string][]> = {
  website: [
    ['Halaman beranda', 'Buka alamat website di browser desktop dan ponsel', 'Halaman tampil lengkap dan rapi, termuat kurang dari 3 detik'],
    ['Navigasi menu', 'Klik setiap menu dan tautan', 'Semua tautan menuju halaman yang benar, tidak ada tautan rusak'],
    ['Formulir kontak', 'Kirim formulir dengan data valid dan tidak valid', 'Data valid terkirim dengan konfirmasi; data tidak valid ditolak dengan pesan jelas'],
    ['Tombol WhatsApp', 'Klik tombol WhatsApp', 'Membuka percakapan WhatsApp ke nomor yang benar'],
    ['Login admin', 'Masuk ke panel admin dengan akun yang diberikan', 'Berhasil masuk; kata sandi salah ditolak'],
    ['Kelola konten', 'Tambah, ubah, dan hapus konten melalui panel admin', 'Perubahan langsung tampil di website'],
    ['Tampilan responsif', 'Buka website di ponsel, tablet, dan desktop', 'Tata letak menyesuaikan tanpa tampilan terpotong'],
    ['SEO dasar', 'Periksa judul halaman, meta deskripsi, dan sitemap.xml', 'Elemen SEO terpasang di setiap halaman'],
    ['Keamanan', 'Akses website melalui http://', 'Dialihkan otomatis ke https:// dengan sertifikat SSL yang valid'],
  ],
  mobile_app: [
    ['Instalasi', 'Pasang aplikasi dari berkas atau tautan pengujian', 'Aplikasi terpasang dan terbuka tanpa galat'],
    ['Registrasi & login', 'Daftar akun baru lalu masuk', 'Akun terbuat, login berhasil, data salah ditolak'],
    ['Lupa kata sandi', 'Minta atur ulang kata sandi', 'Kode/tautan diterima dan kata sandi dapat diganti'],
    ['Fitur inti', 'Jalankan alur utama dari awal hingga selesai', 'Proses berjalan sesuai Dokumen Kebutuhan Bisnis tanpa galat'],
    ['Notifikasi', 'Picu kejadian yang mengirim notifikasi', 'Notifikasi diterima di perangkat'],
    ['Panel admin', 'Kelola data melalui panel admin web', 'Perubahan tersimpan dan tampil di aplikasi'],
    ['Kompatibilitas', 'Uji di Android dan iOS dengan ukuran layar berbeda', 'Tampilan dan fungsi konsisten'],
    ['Koneksi lemah', 'Gunakan aplikasi pada koneksi lambat atau terputus', 'Muncul pesan yang jelas dan data tidak rusak'],
  ],
  ui_ux: [
    ['Kelengkapan layar', 'Cocokkan daftar layar dengan ruang lingkup', 'Semua layar dalam ruang lingkup tersedia'],
    ['Konsistensi visual', 'Periksa warna, tipografi, dan komponen', 'Konsisten dengan design system dan identitas merek'],
    ['Prototipe', 'Jalankan alur utama pada prototipe', 'Semua interaksi alur utama berfungsi'],
    ['Responsif', 'Periksa versi desktop dan mobile', 'Tersedia dan proporsional di setiap ukuran'],
    ['Aksesibilitas', 'Periksa kontras warna dan ukuran target sentuh', 'Memenuhi WCAG 2.1 AA'],
    ['Aset & handoff', 'Periksa ekspor aset dan spesifikasi', 'Aset lengkap dan siap dipakai pengembang'],
  ],
  other: [
    ['Login & hak akses', 'Masuk dengan setiap peran pengguna', 'Setiap peran hanya melihat menu dan data sesuai haknya'],
    ['Data master', 'Tambah, ubah, cari, dan hapus data master', 'Data tersimpan dan tervalidasi dengan benar'],
    ['Proses inti', 'Jalankan alur transaksi utama dari awal hingga akhir', 'Status dan perhitungan sesuai Dokumen Kebutuhan Bisnis'],
    ['Persetujuan', 'Ajukan lalu setujui atau tolak transaksi', 'Alur persetujuan dan notifikasi berjalan'],
    ['Laporan', 'Buat laporan dengan filter lalu ekspor', 'Angka sesuai data; ekspor PDF/Excel berhasil'],
    ['Log aktivitas', 'Ubah data lalu periksa log aktivitas', 'Perubahan tercatat beserta pengguna dan waktunya'],
    ['Keamanan', 'Akses halaman tanpa login atau tanpa hak', 'Akses ditolak dan dialihkan ke halaman login'],
  ],
};

/** BAST items: [uraian, keterangan] */
export const HANDOVER: PerService<[string, string][]> = {
  website: [
    ['Domain', 'Nama domain aktif beserta akses pengelolaannya (bila disediakan PIHAK PERTAMA)'],
    ['Hosting/server', 'Akses panel hosting/server dan basis data'],
    ['Kode sumber', 'Kode sumber lengkap pada repositori atau berkas arsip'],
    ['Akun administrator', 'Akun panel admin dengan kata sandi sementara yang wajib diganti'],
    ['Dokumentasi', 'Panduan penggunaan dan dokumentasi teknis'],
    ['Pelatihan', 'Pelatihan penggunaan panel admin bagi pengelola PIHAK KEDUA'],
  ],
  mobile_app: [
    ['Aplikasi Android', 'Aplikasi terbit di Google Play atau berkas AAB/APK'],
    ['Aplikasi iOS', 'Aplikasi terbit di App Store atau build TestFlight'],
    ['Backend & panel admin', 'Akses server, basis data, dan panel admin web'],
    ['Kode sumber', 'Kode sumber aplikasi, backend, dan panel admin'],
    ['Akun administrator', 'Akun admin dengan kata sandi sementara yang wajib diganti'],
    ['Dokumentasi', 'Panduan penggunaan dan dokumentasi teknis/API'],
    ['Pelatihan', 'Pelatihan penggunaan bagi pengelola PIHAK KEDUA'],
  ],
  ui_ux: [
    ['Berkas desain', 'Berkas sumber desain (mis. Figma) dengan akses edit'],
    ['Prototipe interaktif', 'Tautan prototipe alur utama'],
    ['Design system', 'Panduan warna, tipografi, komponen, dan ikon'],
    ['Aset grafis', 'Ekspor aset (SVG/PNG) siap pakai'],
    ['Dokumentasi handoff', 'Spesifikasi ukuran, jarak, dan interaksi untuk pengembang'],
    ['Presentasi desain', 'Sesi penjelasan desain kepada tim PIHAK KEDUA'],
  ],
  other: [
    ['Aplikasi', 'Aplikasi terpasang di server produksi dengan alamat akses'],
    ['Server & basis data', 'Akses server, basis data, dan konfigurasi'],
    ['Kode sumber', 'Kode sumber lengkap pada repositori atau berkas arsip'],
    ['Akun administrator', 'Akun admin dengan kata sandi sementara yang wajib diganti'],
    ['Dokumentasi', 'Panduan penggunaan dan dokumentasi teknis'],
    ['Pelatihan', 'Pelatihan penggunaan bagi pengguna kunci PIHAK KEDUA'],
  ],
};
