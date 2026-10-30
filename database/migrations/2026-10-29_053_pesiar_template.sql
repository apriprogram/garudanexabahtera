-- ============================================================================
-- Migration 2026-10-29_053 — katalog: template baru Pesiar (private tour & sewa mobil dengan sopir)
-- ============================================================================
-- Data saja, tanpa perubahan skema. Target: db_garudanexabahtera yang SUDAH punya tabel
-- `templates` (migrasi 004). Kompatibel MySQL 8.0 (produksi) dan MariaDB 10.4 (XAMPP lokal).
--
-- Jalankan (BACKUP dulu, lihat database/README.md), SETELAH kode yang mendaftarkan
-- template_code pesiar (src/templates/index.ts) ter-deploy:
--   mysql -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-29_053_pesiar_template.sql
--
-- Insert-or-update berdasarkan slug, aman diulang (pola sama dengan migrasi 028 dan 048):
--   1. INSERT IGNORE  → baris dibuat bila slug belum ada (uq_templates_slug).
--   2. UPDATE … WHERE slug = 'pesiar' → isi katalog disamakan dengan nilai di file ini.
-- PERHATIAN: menjalankan ulang MENIMPA perubahan admin (harga, deskripsi, gambar, status) pada slug ini.
-- Tidak ada DELETE. Template lain tidak disentuh.
--
-- Kategori "Travel & Transportasi" adalah kategori baru; halaman kategorinya ditambahkan di kode yang sama.
-- Gambar pratinjau = tangkapan layar asli demo (WebP 1600x1000): pesiar-preview.webp (hero desktop dalam bingkai
-- peramban + hero HP), galeri pesiar-1.webp & pesiar-2.webp (bagian demo). Foto di dalam template dari Unsplash
-- (public/assets/templates/photos/CREDITS.md, section "Pesiar"); peta Bali, gambar mobil, dan ikon adalah SVG orisinal.
-- Demo: Pesiar Bali, usaha FIKTIF di Denpasar; tur, harga, sopir, dan tamu di demo adalah contoh. Harga contoh per
-- mobil; formulir Rancang tur dan antar-jemput bandara hanya menyusun pesan WhatsApp (data tidak disimpan di website);
-- tidak ada pembayaran online, e-tiket, ketersediaan mobil real-time, atau pelacakan penerbangan otomatis.
--
-- Harga contoh Rp1.590.000 (termasuk setup + hosting + SSL tahun pertama). Domain tidak termasuk harga template
-- (dibayar terpisah, dipilih saat memesan). Bisa diubah admin (Pesanan Template > Kelola template).
-- ============================================================================

SET NAMES utf8mb4;

-- 1. Buat baris bila belum ada ----------------------------------------------------
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('pesiar', 'Pesiar', 'Travel & Transportasi', '', '', '[]', 1590000.00,
   '/assets/templates/pesiar-preview.webp', '[]', 'pesiar', NULL, 'published', 36);

-- 2. Samakan isi katalog ----------------------------------------------------------
UPDATE templates SET
  name              = 'Pesiar',
  category          = 'Travel & Transportasi',
  short_description = 'Template website private tour & sewa mobil dengan sopir: tur sehari, rancang tur sendiri dengan harga per mobil, film peta Bali, antar-jemput bandara, dan pemesanan lewat WhatsApp.',
  description       = 'Pesiar menampilkan usaha private tour Anda seperti majalah perjalanan: foto Bali selebar layar dengan judul besar di tengah, lalu kartu tur sehari berisi lama tur, tempat yang dikunjungi, dan harga mulai per mobil. Tamu bisa merancang tur sendiri dengan memilih hingga lima tempat, area jemput, tanggal, dan mobil; panel di sampingnya menghitung perkiraan durasi dan harga per mobil, lalu menyusun pesan WhatsApp. Saat digulir, film peta Bali memperlihatkan sehari perjalanan bersama sopir: mobil menyusuri rute, jam berjalan, dan foto muncul di tiap perhentian. Ada juga tabel harga antar-jemput bandara per area dan formulirnya, kelas mobil dengan gambar garis, daftar sopir, isi harga, cerita tamu, tanya jawab, serta kontak dengan Google Maps.

Cocok untuk usaha tur, rental mobil dengan sopir, dan layanan antar-jemput bandara. Harga yang tampil adalah contoh per mobil yang Anda atur sendiri; formulir hanya menyusun pesan WhatsApp dan data tidak disimpan di website. Tidak ada pembayaran online, e-tiket, ketersediaan mobil real-time, atau pelacakan penerbangan otomatis. Teks, harga, foto, dan satu warna aksen bisa Anda ubah sendiri lewat CMS tanpa coding.',
  features          = '["Hero foto selebar layar dengan judul di tengah dan dua tombol","Kartu tur sehari dengan harga per mobil dan tombol pesan WhatsApp","Rancang tur sendiri: perkiraan durasi dan harga per mobil","Film peta Bali yang bergerak saat digulir","Tabel harga dan formulir antar-jemput bandara ke WhatsApp","Kelas mobil dengan gambar garis, daftar sopir, dan isi harga","Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)"]',
  price             = 1590000.00,
  preview_image     = '/assets/templates/pesiar-preview.webp',
  gallery           = '["/assets/templates/pesiar-1.webp","/assets/templates/pesiar-2.webp"]',
  template_code     = 'pesiar',
  demo_url          = NULL,
  status            = 'published',
  sort_order        = 36
WHERE slug = 'pesiar';

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-29_053', 'templates: katalog Pesiar');

SELECT id, slug, name, category, price, status, sort_order FROM templates ORDER BY sort_order, id;
