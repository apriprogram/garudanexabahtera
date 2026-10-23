// Isi halaman katalog /template (docs/platform/SEO-PLAN.md §5.5 langkah 1, Lampiran A): intro 80–120 kata,
// perbandingan dengan website builder DIY (tanpa nama pesaing). FAQ 5 butir: CATALOG_FAQ_IDS di src/content/faq.ts
// (jawaban yang sama dengan beranda, /harga dan llms-full.txt). Fakta paket dari setting harga & COMPANY_FACTS.
import { COMPANY_FACTS } from '../../../lib/companyFacts';
import { includesSentence } from './pricing';

export const CATALOG_H1 = 'Template website siap pakai';

/** Paragraf intro katalog. `includes` = daftar "Sudah termasuk" dari setting harga. */
export function catalogIntro(includes: readonly string[]): string[] {
  const included = includesSentence(includes);
  return [
    `Di ${COMPANY_FACTS.name} Anda membeli website yang sudah jadi, bukan sekadar file desain. Pilih template, lihat demonya, lalu pesan dan bayar online lewat ${COMPANY_FACTS.templatePackage.paymentProvider}.${included ? ` ${included}` : ''}`,
    'Setelah pembayaran dikonfirmasi, tim kami memeriksa pesanan dan menyiapkan domain Anda; statusnya bisa Anda pantau di Akun Saya. Begitu website aktif, teks, foto, warna, dan kontaknya Anda ubah sendiri lewat CMS dengan pratinjau langsung, tanpa coding.',
  ];
}

export interface ComparisonRow {
  aspect: string;
  template: string;
  diy: string;
}

export const COMPARISON_COLUMNS = { template: 'Template siap pakai', diy: 'Website builder DIY' } as const;

/** Perbandingan umum dengan layanan website builder "rakit sendiri"; sengaja tanpa nama pesaing atau angka harga. */
export const COMPARISON: readonly ComparisonRow[] = [
  {
    aspect: 'Yang Anda kerjakan',
    template: 'Pilih template dan isi data pesanan; setelah aktif, ganti teks dan foto lewat CMS.',
    diy: 'Pilih tema, susun halaman, hubungkan domain, lalu terbitkan sendiri.',
  },
  {
    aspect: 'Domain, hosting & SSL',
    template: 'Termasuk untuk tahun pertama dan disiapkan oleh tim kami.',
    diy: 'Bergantung paket yang dipilih; pengaturan domain umumnya dilakukan sendiri.',
  },
  {
    aspect: 'Cara bayar',
    template: 'Sekali bayar di awal; mulai tahun ke-2 ada perpanjangan domain & hosting per tahun.',
    diy: 'Umumnya langganan bulanan atau tahunan.',
  },
  {
    aspect: 'Desain',
    template: 'Sudah jadi dan rapi di HP; tata letak tetap, isi dan warna bisa diatur.',
    diy: 'Bebas diubah dengan editor seret-lepas; hasil akhirnya bergantung pada Anda.',
  },
  {
    aspect: 'Mengubah isi',
    template: 'Formulir per bagian dengan pratinjau langsung, tanpa coding.',
    diy: 'Edit langsung di kanvas halaman; perlu waktu untuk membiasakan diri.',
  },
  {
    aspect: 'Cocok untuk',
    template: 'Usaha yang ingin cepat online tanpa mengurus hal teknis.',
    diy: 'Yang punya waktu dan ingin merancang tata letak sendiri.',
  },
];
