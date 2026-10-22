// Isi harga & perbandingan (docs/platform/SEO-PLAN.md §5.6 langkah 4 & 6, Lampiran D): tabel template vs custom
// (versi pendek di beranda, lengkap di /harga), tabel cara membuat website (tanpa nama pesaing), dan faktor biaya
// custom (tanpa angka, design.md). Harga template hanya dari data; field COMPANY_FACTS yang null tidak disebut.
// Modul murni (tanpa React), dipakai halaman, *.seo.ts dan tes.
import { COMPANY_FACTS, type CompanyFacts } from '../lib/companyFacts';
import { formatPriceShort, isPrice } from '../seo/format';
import { HUB_PATHS } from '../seo/paths';
import type { Template } from '../types/platform';

/** Tanggal (YYYY-MM-DD) di WIB (UTC+7) dari waktu ISO; tidak valid → null. */
export function wibDate(iso: string | null | undefined): string | null {
  const time = iso ? Date.parse(iso) : Number.NaN;
  return Number.isNaN(time) ? null : new Date(time + 7 * 3600_000).toISOString().slice(0, 10);
}

/** Harga template terbit yang valid. */
export const templatePrices = (templates: readonly Pick<Template, 'price' | 'status'>[]): number[] =>
  templates.filter((t) => t && t.status !== 'draft' && isPrice(t.price)).map((t) => t.price);

/** Harga termurah (rupiah) atau null. */
export const minTemplatePrice = (templates: readonly Pick<Template, 'price' | 'status'>[]): number | null => {
  const prices = templatePrices(templates);
  return prices.length ? Math.min(...prices) : null;
};

/** Rentang ringkas "Rp990 rb–Rp1,79 jt" (satu harga bila semua sama), atau null. */
export function shortPriceRange(templates: readonly Pick<Template, 'price' | 'status'>[]): string | null {
  const prices = templatePrices(templates);
  if (!prices.length) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatPriceShort(min) : `${formatPriceShort(min)}–${formatPriceShort(max)}`;
}

/** "Rp990 ribu" / "Rp1,5 juta" untuk kalimat (intro beranda). */
export function priceInWords(price: number): string {
  return formatPriceShort(price).replace(/ rb$/, ' ribu').replace(/ jt$/, ' juta');
}

export interface ComparisonCell {
  text: string;
  /** Tautan aksi (baris "Mulai"). */
  href?: string;
}

export interface ComparisonRow {
  label: string;
  cells: readonly ComparisonCell[];
}

export interface ComparisonTable {
  columns: readonly string[];
  rows: readonly ComparisonRow[];
}

export interface ComparisonContext {
  /** Rentang harga template ringkas (shortPriceRange); null = belum ada data. */
  priceRange: string | null;
  /** Tanggal harga (YYYY-MM-DD, ditampilkan sebagai "per {tanggal}"); null = tanpa tanggal. */
  priceDate: string | null;
  facts?: CompanyFacts;
}

const cells = (...texts: string[]): ComparisonCell[] => texts.map((text) => ({ text }));

/**
 * Template vs website custom vs aplikasi mobile custom (Lampiran D). `full` menambah baris pembayaran, pengelolaan isi
 * dan biaya tahun berikutnya (versi /harga). `formatDate` mengubah YYYY-MM-DD menjadi teks tanggal.
 */
export function templateVsCustomTable(
  { priceRange, priceDate, facts = COMPANY_FACTS }: ComparisonContext,
  { full = false, formatDate = (d: string) => d }: { full?: boolean; formatDate?: (date: string) => string } = {},
): ComparisonTable {
  const pkg = facts.templatePackage;
  const price = priceRange ? `Tertera, ${priceRange}${priceDate ? ` (per ${formatDate(priceDate)})` : ''}` : 'Tertera di setiap template';
  const rows: ComparisonRow[] = [
    { label: 'Harga', cells: cells(price, 'Lewat penawaran setelah konsultasi gratis', 'Lewat penawaran setelah konsultasi gratis') },
    { label: 'Sudah termasuk', cells: cells('Setup, domain, hosting, dan SSL tahun pertama', 'Dibahas saat konsultasi', 'Dibahas saat konsultasi') },
    {
      label: 'Waktu online',
      cells: cells(
        pkg.activationTime ? `${pkg.activationTime} setelah pembayaran dikonfirmasi` : 'Setelah pembayaran dikonfirmasi dan domain aktif',
        'Sesuai jadwal di penawaran',
        'Sesuai jadwal di penawaran',
      ),
    },
    {
      label: 'Desain',
      cells: cells('Pilih dari katalog; ubah teks, foto, dan warna aksen di CMS', 'Dirancang dari nol', 'Dirancang dari nol'),
    },
    {
      label: 'Cocok untuk',
      cells: cells(
        'UMKM, klinik, klub, dan startup yang ingin cepat online',
        'Alur atau fitur khusus, sekolah, dan instansi',
        'Aplikasi Android & iOS, seperti kasir dan absensi',
      ),
    },
  ];
  if (full) {
    rows.push(
      { label: 'Pembayaran', cells: cells(`Online via ${pkg.paymentProvider}`, 'Sesuai tahapan di penawaran', 'Sesuai tahapan di penawaran') },
      { label: 'Mengubah isi', cells: cells('Sendiri lewat CMS di Akun Saya', 'Sesuai fitur yang disepakati', 'Sesuai fitur yang disepakati') },
      {
        label: 'Tahun berikutnya',
        cells: cells(
          pkg.renewalCost ? `Perpanjangan domain & hosting ${pkg.renewalCost} per tahun` : 'Perpanjangan domain & hosting per tahun',
          'Dibahas di penawaran',
          'Dibahas di penawaran',
        ),
      },
    );
  }
  rows.push({
    label: 'Mulai',
    cells: [
      { text: 'Pilih Template', href: HUB_PATHS.catalog },
      { text: 'Pesan Custom', href: `${HUB_PATHS.customOrder}?layanan=website` },
      { text: 'Pesan Custom', href: `${HUB_PATHS.customOrder}?layanan=mobile` },
    ],
  });
  return { columns: ['Template siap pakai', 'Website custom', 'Aplikasi mobile custom'], rows };
}

/** Cara membuat website: rakit sendiri, freelancer, agensi, template Garuda Nexa. Umum dan faktual, tanpa nama pesaing. */
export function buildOptionsTable(facts: CompanyFacts = COMPANY_FACTS): ComparisonTable {
  return {
    columns: ['Website builder (rakit sendiri)', 'Freelancer', 'Agensi / software house', `Template ${facts.name}`],
    rows: [
      {
        label: 'Siapa yang membuat',
        cells: cells('Anda sendiri, dari editor builder', 'Satu orang yang Anda sewa', 'Tim agensi', 'Desain siap pakai, di-setup tim kami'),
      },
      {
        label: 'Model biaya',
        cells: cells(
          'Umumnya langganan bulanan atau tahunan',
          'Biaya proyek sesuai kesepakatan',
          'Biaya proyek sesuai penawaran',
          'Harga tertera, dibayar sekali untuk tahun pertama',
        ),
      },
      {
        label: 'Domain, hosting & SSL',
        cells: cells('Tergantung paket yang dipilih', 'Sering diurus terpisah', 'Tergantung penawaran', 'Sudah termasuk untuk tahun pertama'),
      },
      {
        label: 'Waktu sampai online',
        cells: cells(
          'Tergantung waktu Anda merakit',
          'Tergantung jadwal freelancer',
          'Sesuai jadwal proyek',
          facts.templatePackage.activationTime
            ? `${facts.templatePackage.activationTime} setelah pembayaran dikonfirmasi`
            : 'Setelah pembayaran dikonfirmasi dan domain aktif',
        ),
      },
      {
        label: 'Mengubah isi',
        cells: cells('Lewat editor builder', 'Tergantung sistem yang dipakai', 'Tergantung sistem yang dipakai', 'Sendiri lewat CMS, tanpa coding'),
      },
      {
        label: 'Cocok untuk',
        cells: cells(
          'Yang punya waktu merakit dan merawat sendiri',
          'Proyek kecil dengan kebutuhan sederhana',
          'Sistem besar atau alur kerja khusus',
          'Usaha yang ingin cepat online dengan harga pasti',
        ),
      },
    ],
  };
}

export interface CostFactor {
  title: string;
  text: string;
}

/** Faktor yang menentukan biaya website & aplikasi custom (tanpa angka harga, keputusan default 1). */
export const CUSTOM_COST_FACTORS: readonly CostFactor[] = [
  { title: 'Jumlah halaman dan fitur', text: 'Company profile beberapa halaman berbeda cakupannya dengan sistem yang punya login, formulir, dan laporan.' },
  { title: 'Desain', text: 'Desain yang dirancang dari nol, atau mengikuti identitas visual dan panduan merek yang sudah Anda miliki.' },
  { title: 'Integrasi', text: 'Sambungan ke pembayaran online, WhatsApp, peta, atau sistem lain yang sudah Anda pakai.' },
  { title: 'Panel admin dan peran pengguna', text: 'Siapa saja yang mengelola data, hak akses tiap peran, dan laporan yang dibutuhkan.' },
  { title: 'Platform', text: 'Website saja, aplikasi Android dan iOS, atau keduanya dengan satu server yang sama.' },
  { title: 'Server, domain, dan hosting', text: 'Kapasitas server, jumlah pengguna, dan siapa yang mengelola domain serta hosting.' },
  { title: 'Jadwal', text: 'Tenggat yang lebih ketat bisa memengaruhi susunan tim dan tahapan pengerjaan.' },
  { title: 'Pemeliharaan setelah rilis', text: 'Pembaruan berkala dan penanganan kendala bisa dimasukkan ke penawaran sejak awal.' },
];
