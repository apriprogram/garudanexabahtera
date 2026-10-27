-- ============================================================================
-- Migration 2026-10-27_030 — site_addon_orders: fitur tambahan berbayar per situs pembeli (Berita & Pengumuman)
-- ============================================================================
-- Permintaan pemilik 2026-10-27 (docs/platform/SITE-ADDONS-SPEC.md): berita & pengumuman template sekolah (madani,
-- cakrawala, bestari) menjadi fitur berbayar. Saat template dibeli fitur ini terkunci; pembeli membelinya di menu
-- Fitur tambahan (/akun/fitur) dan setelah lunas fitur langsung aktif di CMS. Selama belum aktif, situs memakai berita
-- biasa dari konten CMS dan /berita, /pengumuman serta halaman tulisan menjawab 404.
--   site_addon_orders  satu baris per tagihan/aktivasi fitur. addon_number = GNF-YYYYMMDD-XXXXXX (Midtrans order_id
--                      = addon_number + '-' + percobaan), addon_code = 'posts', status = menunggu_pembayaran | lunas |
--                      dibatalkan. Fitur aktif = baris lunas dengan revoked_at NULL. pending_key = '{site_id}:{addon_code}'
--                      selama menunggu pembayaran (UNIQUE: satu tagihan terbuka per situs per fitur), NULL sesudahnya.
--                      source = beli (dibayar pembeli) | admin (diaktifkan gratis oleh staf) | migrasi (pewarisan di bawah).
-- Tidak ada foreign key, mengikuti tabel marketplace lain (template_*, site_*).
-- Aksi (backend/modules/site_addons.php = site_addons.js): customer_get_site_addons, customer_buy_site_addon,
-- customer_pay_site_addon, customer_cancel_site_addon, dev_simulate_site_addon_payment, admin_set_site_addon, dan
-- midtrans_notification untuk order_id GNF-…. site_posts.*, get_site_public, customer_get_site dan backend/site.php
-- membaca tabel ini sebagai gerbang tulisan; tabel belum ada = fitur tidak aktif.
--
-- Pewarisan: fitur tulisan sudah live gratis sejak 2026-10-26, jadi setiap situs yang SUDAH punya tulisan (site_posts)
-- mendapat baris lunas source 'migrasi' (harga 0, addon_number GNF-MIGRASI-{site_id}, INSERT IGNORE = sekali per situs).
--
-- Skema + data pewarisan, aman dijalankan ulang (CREATE TABLE IF NOT EXISTS, INSERT IGNORE; tanpa ALTER, tanpa
-- prosedur, tanpa information_schema), jadi bisa diimpor lewat phpMyAdmin. Butuh migrasi 029 (tabel site_posts).
-- Jalankan SEBELUM deploy kode yang memakainya:
--   C:/xampp/mysql/bin/mysql.exe -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-27_030_site_addons.sql
-- ============================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS site_addon_orders (
  id                     INT NOT NULL AUTO_INCREMENT,
  addon_number           VARCHAR(40) NOT NULL,          -- 'GNF-YYYYMMDD-XXXXXX' (migrasi: 'GNF-MIGRASI-{site_id}')
  site_id                INT NOT NULL,                  -- template_sites.id
  order_id               INT NOT NULL,                  -- template_orders.id situs itu (nota, log riwayat)
  user_id                INT NOT NULL,
  addon_code             VARCHAR(20) NOT NULL,          -- 'posts'
  price                  DECIMAL(15,2) NOT NULL,        -- Midtrans gross_amount; 0 = hadiah admin / migrasi
  status                 ENUM('menunggu_pembayaran','lunas','dibatalkan') NOT NULL DEFAULT 'menunggu_pembayaran',
  pending_key            VARCHAR(40) DEFAULT NULL,      -- '{site_id}:{addon_code}' selama menunggu_pembayaran, NULL sesudahnya
  source                 VARCHAR(12) NOT NULL DEFAULT 'beli',   -- 'beli' | 'admin' | 'migrasi'
  payment_status         VARCHAR(30) NOT NULL DEFAULT 'pending',
  payment_type           VARCHAR(40) DEFAULT NULL,
  midtrans_order_id      VARCHAR(60) DEFAULT NULL,      -- addon_number + '-' + percobaan
  payment_attempt        INT NOT NULL DEFAULT 0,
  snap_token             VARCHAR(255) DEFAULT NULL,
  payment_url            VARCHAR(500) DEFAULT NULL,
  payment_created_at     DATETIME DEFAULT NULL,         -- halaman Snap percobaan saat ini (dipakai ulang 23 jam)
  paid_at                DATETIME DEFAULT NULL,         -- juga waktu aktif untuk source admin/migrasi
  paid_midtrans_order_id VARCHAR(60) DEFAULT NULL,      -- percobaan Midtrans yang melunasi (cek refund / bayar dobel)
  cancelled_at           DATETIME DEFAULT NULL,
  revoked_at             DATETIME DEFAULT NULL,         -- dinonaktifkan admin (refund, kesalahan); baris tetap untuk nota
  granted_by             INT DEFAULT NULL,              -- users.id staf (source admin)
  note                   VARCHAR(255) NOT NULL DEFAULT '',
  created_at             TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_addon_number (addon_number),
  UNIQUE KEY uq_addon_midtrans (midtrans_order_id),
  UNIQUE KEY uq_addon_pending (pending_key),
  KEY idx_addon_site (site_id, addon_code, status),
  KEY idx_addon_user (user_id),
  KEY idx_addon_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Situs yang sudah memakai berita sebelum fitur berbayar: fitur tetap aktif (sekali per situs, uq_addon_number)
INSERT IGNORE INTO site_addon_orders (addon_number, site_id, order_id, user_id, addon_code, price, status, source,
                                      payment_status, paid_at, note)
SELECT CONCAT('GNF-MIGRASI-', s.id), s.id, s.order_id, s.user_id, 'posts', 0, 'lunas', 'migrasi', 'settlement', NOW(),
       'Sudah memakai berita sebelum fitur berbayar'
  FROM template_sites s
 WHERE EXISTS (SELECT 1 FROM site_posts p WHERE p.site_id = s.id);

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-27_030', 'site_addon_orders: fitur tambahan berbayar (Berita & Pengumuman) + pewarisan situs yang sudah punya tulisan');

SELECT site_id, addon_number, source, paid_at FROM site_addon_orders WHERE source = 'migrasi' ORDER BY site_id;
