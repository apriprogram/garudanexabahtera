// Artikel panduan (/panduan/{slug}, docs/platform/SEO-PLAN.md §5.8). Sejak 2026-10-24 disimpan di database (tabel
// guide_articles, migrasi 2026-10-24_017) dan dikelola admin di Pengaturan website → Panduan: tambah, edit, pratinjau,
// hapus, terbitkan (permintaan pemilik). API publik hanya mengirim artikel terbit (`reviewed` terisi = sudah disunting
// & dicek faktanya oleh manusia):
// - get_guides: ringkasan semua artikel terbit (daftar /panduan, head, sitemap, llms.txt, tautan dari halaman lain).
//   Ikut data preload setiap halaman prerender dan SeoData.guides (src/lib/preload.ts).
// - get_guide&slug=…: artikel lengkap dengan isi Markdown, ikut preload halaman artikelnya.
// Komponen membacanya lewat src/hooks/useGuides.ts. Artikel yang terbit atau diubah setelah deploy langsung tampil di
// browser; HTML prerender, sitemap dan llms.txt ikut diperbarui pada deploy berikutnya, dan sementara itu artikel baru
// dilayani backend/seo.php (.htaccess).
//
// Bundel utama hanya mengimpor core.ts (kecil); penolong Markdown ada di parse.ts (halaman artikel, admin, tes).
export * from './core';
