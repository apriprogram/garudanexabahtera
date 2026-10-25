// Satu-satunya sumber fakta perusahaan (docs/platform/SEO-PLAN.md Lampiran B) untuk FAQ, footer, /tentang, /kontak,
// JSON-LD dan llms.txt. Dibuat WP1, lalu milik WP6.
//
// Aturan:
// - null = belum diketahui. Komponen TIDAK BOLEH merender field null, juga tidak dengan placeholder.
// - Tanpa harga template: rentangnya dihitung dari data template (API/DB), bukan ditulis di sini. Harga domain dan biaya
//   hosting & jasa tahun ke-2 diambil dari src/lib/domainPricing.ts (bawaan; admin bisa mengubah biaya hosting).
// - Jasa custom tanpa angka harga (design.md): biayanya lewat penawaran setelah konsultasi gratis.
// - garudanexa.id / @garudanexa tidak disebut dan tidak masuk sameAs sampai pemilik memutuskan hubungannya.
// Modul murni (tanpa React), aman diimpor dari skrip Node dan prerender.
import { HUB_PATHS, SITE_ORIGIN } from '../seo/paths';
import { DOMAIN_PRICE_FROM, DOMAIN_TLDS, HOSTING_RENEWAL_DEFAULT, rupiahCompact, type DomainTld } from './domainPricing';

export interface CompanyAddress {
  streetAddress: string;
  locality: string;
  region: string;
  postalCode: string;
  /** Kode negara ISO 3166-1 alpha-2. */
  country: 'ID';
}

/** Anggota direksi (nama & gelar persis dari pemilik). */
export interface CompanyLeader {
  name: string;
  role: string;
  /** Foto 4:5 di public/assets/team. */
  photo: string;
}

/** Titik kantor di peta (bukan alamat tertulis: alamat tetap `address`). */
export interface CompanyLocation {
  latitude: number;
  longitude: number;
  /** Tautan Google Maps dari pemilik (dibuka di tab baru). */
  mapsUrl: string;
}

export interface CompanyService {
  key: 'template' | 'website' | 'mobile';
  name: string;
  summary: string;
  /** Halaman layanan di situs. */
  path: string;
}

export interface CompanyFacts {
  /** Nama merek. */
  name: string;
  /** Nama badan hukum. */
  legalName: string;
  /** Origin situs utama (https, tanpa www, tanpa garis miring di akhir). */
  url: string;
  email: string;
  /** WhatsApp & telepon, hanya angka dengan kode negara (wa.me, tel:+…). Sama dengan nomor bawaan useSiteSettings. */
  whatsapp: string;
  /** Tampilan internasional, mis. untuk llms.txt dan JSON-LD. Format lokal: displayPhone() di useSiteSettings. */
  whatsappDisplay: string;
  /** Alamat kantor, identik dengan Google Business Profile. null = belum ada, jangan tampilkan alamat. */
  address: CompanyAddress | null;
  /** Nomor Induk Berusaha. */
  nib: string | null;
  /** Nomor tanda daftar PSE Kominfo. */
  pse: string | null;
  /** Jam layanan, mis. "Senin–Jumat 09.00–17.00 WIB". */
  serviceHours: string | null;
  areaServed: { countryCode: 'ID'; label: string };
  /** Bahasa layanan (BCP 47). */
  languages: readonly string[];
  services: readonly CompanyService[];
  templatePackage: {
    /** Yang sudah termasuk harga template (sama dengan bawaan TEMPLATE_PRICE_INCLUDES_DEFAULT). Domain tidak termasuk. */
    includes: readonly string[];
    /**
     * Biaya per tahun mulai tahun ke-2, satu kalimat utuh (hosting & jasa bawaan + domain sesuai ekstensi). Halaman yang
     * membaca setting memakai hostingRenewalPrice(settings) untuk angka hosting yang diatur admin.
     */
    renewalCost: string | null;
    /** Harga domain per tahun per ekstensi (tahun pertama = perpanjangan), dipilih dan dibayar saat memesan. */
    domainPrices: readonly DomainTld[];
    /** Waktu sampai website aktif setelah pembayaran dikonfirmasi, mis. "3–5 hari kerja". */
    activationTime: string | null;
    paymentProvider: string;
    /** Isi website dikelola pembeli sendiri lewat CMS. */
    contentManagement: string;
  };
  /** Cara penentuan biaya jasa custom (tanpa angka, keputusan default 1). */
  customPricing: string;
  /** Jaminan pengembalian dana (kebijakan pengembalian dana, LEGAL_UPDATED_AT). */
  refundGuarantee: string;
  /** Kepemilikan konten dan data. */
  contentOwnership: string;
  /** Produk sendiri yang boleh disebut. null = menunggu konfirmasi pemilik. */
  ownProducts: readonly string[] | null;
  /** Profil resmi yang benar-benar ada (Organization.sameAs). Kosong = tidak ada yang dirender. */
  sameAs: readonly string[];
  /** Direksi untuk /tentang. Kosong = bagian direksi tidak dirender. */
  leadership: readonly CompanyLeader[];
  /** Lokasi kantor untuk peta di /tentang. null = tanpa peta. */
  location: CompanyLocation | null;
}

export const COMPANY_FACTS: CompanyFacts = {
  name: 'Garuda Nexa',
  legalName: 'PT Garuda Nexa Bahtera',
  url: SITE_ORIGIN,
  email: 'info@garudanexa.com',
  whatsapp: '6285188009152',
  whatsappDisplay: '+62 851-8800-9152',
  address: null,
  nib: null,
  pse: null,
  serviceHours: null,
  areaServed: { countryCode: 'ID', label: 'Seluruh Indonesia (online)' },
  languages: ['id'],
  services: [
    {
      key: 'template',
      name: 'Template website siap pakai',
      summary: 'Pilih template, lihat demo, pesan dan bayar online via Midtrans, lalu kelola isi website lewat CMS.',
      path: HUB_PATHS.catalog,
    },
    {
      key: 'website',
      name: 'Jasa pembuatan website custom',
      summary: 'Website yang dirancang dari nol sesuai kebutuhan, dengan penawaran setelah konsultasi gratis.',
      path: HUB_PATHS.webService,
    },
    {
      key: 'mobile',
      name: 'Jasa pembuatan aplikasi mobile Android & iOS',
      summary: 'Aplikasi Android dan iOS sesuai alur bisnis, dengan penawaran setelah konsultasi gratis.',
      path: HUB_PATHS.mobileService,
    },
  ],
  templatePackage: {
    // Domain tidak lagi termasuk harga template (pemilik 2026-10-25): dipilih dan dibayar saat memesan
    includes: ['Template website + setup awal', 'Hosting tahun pertama', 'Sertifikat SSL (HTTPS) tahun pertama'],
    renewalCost: `Hosting & jasa ${rupiahCompact(HOSTING_RENEWAL_DEFAULT)}/tahun ditambah perpanjangan domain sesuai ekstensi (mulai ${rupiahCompact(DOMAIN_PRICE_FROM)}/tahun).`,
    domainPrices: DOMAIN_TLDS,
    activationTime: null,
    paymentProvider: 'Midtrans',
    contentManagement: 'Isi website (teks, foto, kontak) diubah sendiri lewat CMS di akun pembeli.',
  },
  customPricing: 'Biaya website dan aplikasi custom disampaikan lewat penawaran setelah konsultasi gratis.',
  refundGuarantee:
    'Pesanan yang sudah lunas tetapi ditolak (misalnya domain tidak tersedia) mendapat pengembalian dana penuh ke metode pembayaran semula, paling lambat 7 hari kerja setelah pesanan ditolak.',
  contentOwnership: 'Isi yang dimasukkan pembeli (teks, gambar, logo, dan data) tetap milik pembeli.',
  ownProducts: null,
  sameAs: [],
  // Direksi & lokasi peta dari pemilik 2026-10-24 (jabatan rinci belum diberikan: "Direksi")
  leadership: [
    { name: 'Muhammad Fajri, S.T.', role: 'Direksi', photo: '/assets/team/muhammad-fajri.webp' },
    { name: 'Dede Apriyansah, S.Kom.', role: 'Direksi', photo: '/assets/team/dede-apriyansah.webp' },
  ],
  location: { latitude: -5.1350242, longitude: 105.3194528, mapsUrl: 'https://maps.app.goo.gl/FVNdCXafRWFUFCYD8' },
};
