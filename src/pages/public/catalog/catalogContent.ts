// Isi halaman katalog /template (docs/platform/SEO-PLAN.md §5.5 langkah 1, Lampiran A). Disederhanakan atas permintaan
// pemilik 2026-10-24: judul "Pilih Template" saja (tanpa kalimat pengantar & strip "Sudah termasuk"), lalu chip kategori,
// kolom cari, grid, dan FAQ (CATALOG_FAQ_IDS di src/content/faq.ts, jawaban sama dengan beranda, /harga, llms-full.txt).
// Kata kunci "template website siap pakai" tetap di judul & deskripsi halaman (CatalogPage.seo.ts) dan di FAQ.

/** H1 "Pilih Template": kata kedua berwarna brand (sama dengan judul section beranda). */
export const CATALOG_H1_LEAD = 'Pilih';
export const CATALOG_H1_ACCENT = 'Template';
export const CATALOG_H1 = `${CATALOG_H1_LEAD} ${CATALOG_H1_ACCENT}`;
