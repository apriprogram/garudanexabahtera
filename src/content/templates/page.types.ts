// Tipe isi halaman /template/{slug} (docs/platform/SEO-PLAN.md §5.5 langkah 3). Nama file bertitik sengaja: glob
// salinan SEO di src/seo/templateSeo.ts (`*.ts` tanpa `*.*.ts`) dan glob isi halaman (`*.content.ts`) tidak memuatnya.
//
// Dua file per template, kunci = slug template di DB:
// - {slug}.ts          kecil, ikut bundel utama: `seo` (TemplateSeoCopy, judul & meta) dan `page` (H1, niche).
// - {slug}.content.ts  isi panjang halaman (600–900 kata), hanya dimuat chunk halaman detail template.
//
// Token di semua teks: {nama} = nama template dari DB (template boleh diganti nama di admin). Harga TIDAK ditulis di
// sini: harga, isi paket dan biaya tahun ke-2 selalu dari data (DB, setting harga, COMPANY_FACTS).
// Klaim harus cocok dengan kode template di src/templates/{slug} (bagian, field CMS, batas jumlah item).
import type { FaqItem } from '../../seo/jsonld';
import type { PlannedArticleSlug } from '../../seo/paths';

/** `export const page` di {slug}.ts. */
export interface TemplatePageCopy {
  /** H1 (Lampiran A), mis. "{nama}: Template Website Klinik Kecantikan & Salon". */
  h1: string;
  /** Niche dalam kalimat, huruf kecil kecuali singkatan, mis. "klinik kecantikan & salon" (alt gambar, judul bagian). */
  niche: string;
}

export interface TemplatePart {
  /** Nama bagian seperti di CMS, mis. "Paket membership". */
  name: string;
  /** Satu-dua kalimat: isi bagian dan batas jumlah item (dari schema.ts template). */
  text: string;
}

/** `export const content` di {slug}.content.ts. */
export interface TemplatePageContent {
  /** Pembuka di bawah H1: untuk siapa dan apa isinya (kalimat harga & paket ditambahkan dari data). */
  lead: string;
  suitableFor: { intro: string; items: readonly string[] };
  /** "Halaman & bagian yang Anda dapatkan", urut seperti di halaman template. */
  parts: readonly TemplatePart[];
  /** Catatan di bawah daftar bagian (mis. cara kerja formulir kontak). */
  partsNote?: string;
  /** "Yang bisa Anda ubah sendiri lewat CMS". */
  cms: readonly string[];
  /** Batas CMS yang perlu diketahui sebelum membeli. */
  cmsNote?: string;
  /** "Contoh website {niche} dengan {nama}": paragraf tentang demo (isi demo fiktif). */
  demo: readonly string[];
  /** "Butuh fitur lain?": paragraf menuju jasa custom. */
  custom: string;
  /** Tampilkan juga tautan ke jasa aplikasi mobile di bagian "Butuh fitur lain?". */
  mobileLink?: boolean;
  /** "Pertanyaan tentang {nama}": 4–6 butir. */
  faq: readonly FaqItem[];
  /** Alt gambar per nama file (mis. "aura-studio-1.webp"); gambar lain memakai alt umum. */
  imageAlts: Readonly<Record<string, string>>;
  /** Artikel panduan yang paling relevan, urut prioritas; yang pertama sudah terbit yang ditautkan (selain itu /panduan). */
  guides: readonly PlannedArticleSlug[];
}
