// Isi halaman jasa custom (docs/platform/SEO-PLAN.md §5.6 langkah 5): /jasa-pembuatan-website dan
// /jasa-pembuatan-aplikasi-mobile. Hanya layanan yang benar-benar ditawarkan (form Pesan Custom, strip layanan beranda,
// Syarat & Ketentuan); proses dan hasil hanya sejauh yang sudah dijanjikan situs dan dokumen legal. Tanpa angka harga.
// Modul murni (tanpa React): dipakai halaman, *.seo.ts dan tes.
import { ARTICLE_SLUGS, type PlannedArticleSlug } from '../seo/paths';
import { MOBILE_SERVICE_META, WEB_SERVICE_META, type ServiceKey, type ServiceMeta } from './servicesMeta';

export type { ServiceKey, ServiceMeta } from './servicesMeta';

export interface ServiceCard {
  title: string;
  text: string;
  /** Contoh isi/fitur, ditampilkan sebagai daftar pendek. */
  points: readonly string[];
}

export interface ServiceStep {
  title: string;
  text: string;
}

export interface ServiceSection {
  title: string;
  paragraphs: readonly string[];
}

/** Kalimat penutup dengan tautan ke artikel panduan; tampil hanya bila artikelnya sudah terbit (guideLink). */
export interface ServiceGuide {
  slug: PlannedArticleSlug;
  /** Teks sebelum tautan, mis. "Perbandingan lengkapnya ada di panduan". */
  lead: string;
  /** Teks tautan (anchor kontekstual). */
  anchor: string;
}

export interface ServiceContent extends ServiceMeta {
  badge: string;
  /** Nilai ?layanan= di /pesan-custom. */
  orderParam: 'website' | 'mobile';
  whatsappMessage: string;
  kinds: { title: string; intro: string; cards: readonly ServiceCard[] };
  /** Bagian teks bebas (mis. kapan custom vs template, satu basis kode). */
  sections: readonly ServiceSection[];
  process: { title: string; intro: string; steps: readonly ServiceStep[] };
  deliverables: { title: string; intro: string; items: readonly string[] };
  costTitle: string;
  costIntro: string;
  /** Panduan terkait: `about` di bagian pertama `sections`, `cost` di bagian biaya. */
  guides: { about?: ServiceGuide; cost?: ServiceGuide };
  faqTitle: string;
  cta: { title: string; text: string };
}

const STEPS_INTRO = 'Alurnya sama dengan yang tertulis di formulir Pesan Custom dan di Syarat & Ketentuan kami.';

export const WEB_SERVICE: ServiceContent = {
  ...WEB_SERVICE_META,
  badge: 'Jasa website custom',
  orderParam: 'website',
  whatsappMessage: 'Halo Garuda Nexa, saya ingin konsultasi pembuatan website custom.',
  kinds: {
    title: 'Jenis website yang kami buat',
    intro:
      'Setiap website custom dirancang dari nol mengikuti tujuan dan alur kerja Anda. Berikut jenis yang paling sering diminta; kebutuhan lain bisa Anda ceritakan saat konsultasi.',
    cards: [
      {
        title: 'Website company profile',
        text: 'Wajah resmi perusahaan atau UMKM di internet: siapa Anda, apa layanannya, dan bagaimana pelanggan menghubungi Anda.',
        points: ['Profil, layanan, dan portofolio', 'Formulir kontak dan tombol WhatsApp', 'Isi bisa diperbarui tim Anda'],
      },
      {
        title: 'Website sekolah & pesantren',
        text: 'Pusat informasi untuk orang tua, siswa, dan santri, dengan tampilan yang sesuai identitas lembaga.',
        points: ['Profil, agenda, berita, dan galeri', 'Informasi pendaftaran', 'Halaman guru, program, dan fasilitas'],
      },
      {
        title: 'Website instansi & desa',
        text: 'Informasi layanan publik yang rapi dan mudah dicari warga, dari profil lembaga sampai pengumuman.',
        points: ['Profil, struktur, dan layanan', 'Berita, pengumuman, dan dokumen', 'Kontak dan lokasi kantor'],
      },
      {
        title: 'Landing page produk',
        text: 'Satu halaman yang fokus menjelaskan satu produk atau kampanye dan mengarahkan pengunjung ke satu tindakan.',
        points: ['Keunggulan dan cara kerja produk', 'Tanya jawab dan testimoni pelanggan Anda', 'Tombol beli, daftar, atau WhatsApp'],
      },
      {
        title: 'Toko online & sistem informasi',
        text: 'Website yang bekerja seperti aplikasi: ada akun pengguna, data yang dikelola, dan laporan.',
        points: ['Katalog, pesanan, atau pendaftaran', 'Panel admin dengan peran pengguna', 'Laporan dan ekspor data'],
      },
    ],
  },
  sections: [
    {
      title: 'Website custom atau template siap pakai?',
      paragraphs: [
        'Pilih website custom bila Anda membutuhkan alur, fitur, atau tampilan yang tidak tersedia di template: misalnya pendaftaran dengan beberapa tahap, data yang dikelola banyak orang, atau desain yang harus mengikuti panduan merek tertentu. Biayanya disusun dari cakupan pekerjaan, jadi Anda hanya membayar fitur yang memang dibutuhkan.',
        'Bila yang Anda perlukan adalah website profil yang cepat online dengan harga pasti, template siap pakai biasanya lebih tepat. Harga template sudah termasuk setup, domain, hosting, dan SSL tahun pertama, dan isinya Anda kelola sendiri lewat CMS. Ragu memilih? Ceritakan kebutuhan Anda saat konsultasi; kami akan menyarankan jalur yang paling masuk akal, termasuk bila jawabannya template.',
      ],
    },
  ],
  process: {
    title: 'Proses pembuatan website custom',
    intro: STEPS_INTRO,
    steps: [
      {
        title: 'Konsultasi',
        text: 'Ceritakan kebutuhan Anda lewat formulir Pesan Custom atau WhatsApp. Konsultasi gratis dan tidak mengikat; kami bertanya soal tujuan, pengguna, fitur, dan tenggat.',
      },
      {
        title: 'Penawaran',
        text: 'Kami mengirim penawaran tertulis berisi rancangan solusi, lingkup pekerjaan, biaya, jadwal, tahapan pembayaran, revisi, dan kepemilikan kode sumber.',
      },
      {
        title: 'Pengerjaan',
        text: 'Setelah Anda menyetujui penawaran, desain dan pengembangan berjalan bertahap. Anda mendapat kabar progres berkala dan ikut menguji hasilnya.',
      },
      {
        title: 'Rilis & pendampingan',
        text: 'Website dipasang dan siap dipakai. Setelah rilis kami tetap mendampingi, dan pemeliharaan rutin bisa dimasukkan ke penawaran sejak awal.',
      },
    ],
  },
  deliverables: {
    title: 'Yang Anda terima',
    intro: 'Rincian akhirnya mengikuti penawaran yang Anda setujui. Hal berikut berlaku untuk setiap proyek website custom:',
    items: [
      'Penawaran tertulis sebelum pekerjaan dimulai, tanpa biaya untuk konsultasinya.',
      'Lingkup, jadwal, tahapan pembayaran, jumlah revisi, dan kepemilikan kode sumber yang jelas sejak awal.',
      'Kabar progres berkala selama pengerjaan dan kesempatan menguji website sebelum rilis.',
      'Isi dan data yang Anda masukkan tetap milik Anda.',
      'Pendampingan setelah rilis, dengan opsi pemeliharaan rutin lewat penawaran atau perjanjian proyek.',
    ],
  },
  costTitle: 'Faktor yang menentukan biaya website custom',
  costIntro:
    'Kami tidak memasang daftar harga untuk website custom, karena dua website dengan jumlah halaman yang sama bisa sangat berbeda isinya. Biaya disusun dari faktor berikut dan dituliskan di penawaran:',
  guides: {
    about: {
      slug: ARTICLE_SLUGS.templateVsCustom,
      lead: 'Perbandingan lengkapnya, dari biaya, waktu, fitur, sampai perawatan, ada di panduan',
      anchor: 'template vs jasa website custom',
    },
    cost: {
      slug: ARTICLE_SLUGS.websiteCost,
      lead: 'Kisaran biaya di pasar, termasuk domain, hosting, SSL, dan perawatan per tahun, kami rangkum di panduan',
      anchor: 'biaya membuat website company profile',
    },
  },
  faqTitle: 'Pertanyaan tentang jasa pembuatan website',
  cta: {
    title: 'Ceritakan website yang Anda butuhkan',
    text: 'Isi formulir Pesan Custom atau hubungi kami lewat WhatsApp. Konsultasi gratis, dan kami melayani klien di seluruh Indonesia secara online.',
  },
};

export const MOBILE_SERVICE: ServiceContent = {
  ...MOBILE_SERVICE_META,
  badge: 'Jasa aplikasi mobile',
  orderParam: 'mobile',
  whatsappMessage: 'Halo Garuda Nexa, saya ingin konsultasi pembuatan aplikasi mobile Android/iOS.',
  kinds: {
    title: 'Aplikasi yang bisa kami buat',
    intro:
      'Aplikasi untuk pelanggan, tim internal, atau layanan bisnis Anda. Beberapa jenis berikut juga tampil di strip layanan beranda kami; kebutuhan lain bisa Anda ceritakan saat konsultasi.',
    cards: [
      {
        title: 'Aplikasi kasir (POS)',
        text: 'Transaksi penjualan dan pengelolaan stok untuk UMKM dan retail, dengan laporan yang bisa dibuka pemilik usaha.',
        points: ['Transaksi dan struk', 'Stok dan daftar produk', 'Laporan penjualan'],
      },
      {
        title: 'Aplikasi absensi digital',
        text: 'Kehadiran karyawan atau siswa yang tercatat dari HP, dengan panel web untuk admin.',
        points: ['Absen masuk dan pulang', 'Rekap kehadiran', 'Panel admin di web'],
      },
      {
        title: 'Aplikasi sekolah',
        text: 'Administrasi dan informasi akademik sekolah dalam satu sistem, dari data siswa sampai pengumuman.',
        points: ['Data siswa dan guru', 'Pengumuman untuk orang tua', 'Panel admin sekolah'],
      },
      {
        title: 'Aplikasi pesantren',
        text: 'Manajemen data dan informasi pesantren yang lebih terstruktur, untuk pengelola dan wali santri.',
        points: ['Data santri', 'Informasi untuk wali santri', 'Panel pengelola'],
      },
      {
        title: 'Aplikasi layanan & internal',
        text: 'Aplikasi untuk pelanggan Anda atau alur kerja tim di lapangan, sesuai proses yang sudah berjalan.',
        points: ['Akun pengguna dan peran', 'Formulir dan notifikasi', 'Data tersambung ke panel admin'],
      },
    ],
  },
  sections: [
    {
      title: 'Satu aplikasi untuk Android dan iOS',
      paragraphs: [
        'Aplikasi kami bangun dengan React Native, sehingga Android dan iOS memakai satu basis kode. Fitur di kedua platform sama, pengujian lebih ringkas, dan pembaruan bisa dirilis bersamaan. Bila Anda baru membutuhkan salah satu platform, hal itu bisa diatur di penawaran.',
        'Banyak aplikasi bisnis juga membutuhkan panel web untuk pengelola, misalnya untuk melihat laporan kasir atau rekap absensi. Bila aplikasi Anda membutuhkan server, database, atau panel admin, kebutuhan itu ikut dirancang dan dicantumkan di penawaran beserta biayanya.',
      ],
    },
  ],
  process: {
    title: 'Proses sampai rilis di Play Store & App Store',
    intro: STEPS_INTRO,
    steps: [
      {
        title: 'Konsultasi',
        text: 'Ceritakan alur bisnis yang ingin dibuatkan aplikasinya lewat formulir Pesan Custom atau WhatsApp. Konsultasi gratis dan tidak mengikat.',
      },
      {
        title: 'Penawaran',
        text: 'Kami mengirim penawaran tertulis berisi fitur, platform, kebutuhan server, biaya, jadwal, tahapan pembayaran, revisi, dan kepemilikan kode sumber.',
      },
      {
        title: 'Pengerjaan',
        text: 'Desain dan pengembangan berjalan bertahap setelah penawaran disetujui. Anda mendapat kabar progres berkala dan ikut menguji aplikasinya sebelum rilis.',
      },
      {
        title: 'Rilis & pendampingan',
        text: 'Kami membantu proses rilis ke Google Play Store dan Apple App Store, lalu tetap mendampingi setelah aplikasi dipakai.',
      },
    ],
  },
  deliverables: {
    title: 'Yang Anda terima',
    intro: 'Rincian akhirnya mengikuti penawaran yang Anda setujui. Hal berikut berlaku untuk setiap proyek aplikasi mobile:',
    items: [
      'Penawaran tertulis sebelum pekerjaan dimulai, tanpa biaya untuk konsultasinya.',
      'Fitur, platform, jadwal, tahapan pembayaran, revisi, dan kepemilikan kode sumber serta akun toko aplikasi yang jelas sejak awal.',
      'Kabar progres berkala dan kesempatan menguji aplikasi di perangkat Anda sebelum rilis.',
      'Bantuan proses rilis ke Google Play Store dan Apple App Store.',
      'Pendampingan setelah rilis, dengan opsi pemeliharaan rutin lewat penawaran atau perjanjian proyek.',
    ],
  },
  costTitle: 'Faktor yang menentukan biaya aplikasi',
  costIntro:
    'Biaya aplikasi mobile bergantung pada fitur dan platformnya, jadi kami tidak memasang daftar harga. Faktor berikut menentukan biaya dan dituliskan di penawaran:',
  guides: {
    cost: {
      slug: ARTICLE_SLUGS.appCost,
      lead: 'Kisaran biaya di pasar dan biaya rutin setelah rilis, seperti akun Google Play dan Apple, kami rangkum di panduan',
      anchor: 'biaya pembuatan aplikasi Android & iOS',
    },
  },
  faqTitle: 'Pertanyaan tentang jasa pembuatan aplikasi',
  cta: {
    title: 'Ceritakan aplikasi yang Anda butuhkan',
    text: 'Isi formulir Pesan Custom atau hubungi kami lewat WhatsApp. Konsultasi gratis, dan kami melayani klien di seluruh Indonesia secara online.',
  },
};

export const SERVICES: Record<ServiceKey, ServiceContent> = { website: WEB_SERVICE, mobile: MOBILE_SERVICE };
