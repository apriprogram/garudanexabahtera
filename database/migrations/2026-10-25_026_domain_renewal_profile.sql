-- ============================================================================
-- Migration 2026-10-25_026 — domain berbayar, masa aktif & perpanjangan, profil pembeli
-- ============================================================================
-- Keputusan pemilik 2026-10-25 (docs/platform/ACCOUNT-DOMAIN-RENEWAL-SPEC.md):
--   1. Domain tidak lagi termasuk harga template: harganya (per ekstensi, backend/modules/domains.php) ditambahkan ke
--      pesanan. template_orders.domain_price = harga domain tahun pertama yang ikut dibayar (sudah termasuk di `price`),
--      domain_check = hasil cek RDAP saat dipesan (available / unknown). Pesanan lama: 0 / NULL.
--   2. Masa aktif hosting & jasa template dan domain: service_* / domain_* (mulai saat situs aktif, 1 tahun), bertambah
--      saat perpanjangan lunas. Pesanan yang sudah aktif diisi dari activated_at (+1 tahun).
--   3. template_renewals: tagihan perpanjangan 1–3 tahun (hosting & jasa + domain), dibayar lewat Midtrans
--      (order_id GNR-YYYYMMDD-XXXXXX-<percobaan>). pending_order_id = order_id selama menunggu pembayaran (NULL
--      sesudahnya): UNIQUE, jadi satu pesanan hanya punya satu tagihan perpanjangan terbuka.
--   4. users: company_name, address, city (halaman Profil); avatar pembeli berisi path file (/assets/avatars/...).
--   5. Setting template_price_includes: baris "Domain tahun pertama" dihapus bila ada (domain tidak termasuk lagi).
--
-- Aman dijalankan ulang (kolom ditambah hanya bila belum ada, CREATE TABLE IF NOT EXISTS, backfill hanya baris NULL).
-- Jalankan SEBELUM deploy kode yang memakainya:
--   C:/xampp/mysql/bin/mysql.exe -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-25_026_domain_renewal_profile.sql
-- phpMyAdmin (produksi): import file ini lewat tab SQL. Bila impor menolak prosedur (information_schema), jalankan
-- pernyataan ALTER TABLE ... ADD COLUMN, CREATE TABLE, UPDATE, dan INSERT schema_migrations di bawah satu per satu.
-- ============================================================================

SET NAMES utf8mb4;

DROP PROCEDURE IF EXISTS gn_exec;
DROP PROCEDURE IF EXISTS gn_add_column;

DELIMITER $$

CREATE PROCEDURE gn_exec(IN stmt TEXT)
BEGIN
  SET @gn_sql = stmt;
  PREPARE gn_stmt FROM @gn_sql;
  EXECUTE gn_stmt;
  DEALLOCATE PREPARE gn_stmt;
END$$

-- ADD COLUMN only if missing. def = "<type and options> [AFTER col]"
CREATE PROCEDURE gn_add_column(IN tbl VARCHAR(64), IN col VARCHAR(64), IN def TEXT)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = DATABASE() AND table_name = tbl AND column_name = col) THEN
    CALL gn_exec(CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN `', col, '` ', def));
  END IF;
END$$

DELIMITER ;

-- 1. Profil pembeli
CALL gn_add_column('users', 'company_name', "VARCHAR(150) DEFAULT NULL AFTER phone");
CALL gn_add_column('users', 'address', "VARCHAR(255) DEFAULT NULL AFTER company_name");
CALL gn_add_column('users', 'city', "VARCHAR(100) DEFAULT NULL AFTER address");

-- 2. Domain berbayar + masa aktif
CALL gn_add_column('template_orders', 'domain_price', "DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER discount_code");
CALL gn_add_column('template_orders', 'domain_check', "VARCHAR(20) DEFAULT NULL AFTER domain_price");
CALL gn_add_column('template_orders', 'service_started_at', "DATETIME DEFAULT NULL AFTER activated_at");
CALL gn_add_column('template_orders', 'service_expires_at', "DATETIME DEFAULT NULL AFTER service_started_at");
CALL gn_add_column('template_orders', 'domain_started_at', "DATETIME DEFAULT NULL AFTER service_expires_at");
CALL gn_add_column('template_orders', 'domain_expires_at', "DATETIME DEFAULT NULL AFTER domain_started_at");

-- Pesanan yang sudah aktif: masa aktif 1 tahun sejak situs diaktifkan
UPDATE template_orders
   SET service_started_at = activated_at,
       service_expires_at = DATE_ADD(activated_at, INTERVAL 1 YEAR)
 WHERE status = 'aktif' AND activated_at IS NOT NULL AND service_expires_at IS NULL;
UPDATE template_orders
   SET domain_started_at = activated_at,
       domain_expires_at = DATE_ADD(activated_at, INTERVAL 1 YEAR)
 WHERE status = 'aktif' AND activated_at IS NOT NULL AND domain_expires_at IS NULL;

-- 3. Tagihan perpanjangan
CREATE TABLE IF NOT EXISTS template_renewals (
  id                     INT NOT NULL AUTO_INCREMENT,
  renewal_number         VARCHAR(40) NOT NULL,        -- 'GNR-YYYYMMDD-XXXXXX'
  order_id               INT NOT NULL,
  user_id                INT NOT NULL,
  domain                 VARCHAR(253) NOT NULL,       -- domain of the order when the renewal was created
  years                  TINYINT NOT NULL,            -- 1..3
  hosting_price_per_year DECIMAL(15,2) NOT NULL,
  domain_price_per_year  DECIMAL(15,2) NOT NULL,
  price_per_year         DECIMAL(15,2) NOT NULL,
  price                  DECIMAL(15,2) NOT NULL,      -- years × price_per_year (Midtrans gross_amount)
  status                 ENUM('menunggu_pembayaran','lunas','dibatalkan') NOT NULL DEFAULT 'menunggu_pembayaran',
  pending_order_id       INT DEFAULT NULL,            -- = order_id while menunggu_pembayaran, else NULL (one open renewal per order)
  payment_status         VARCHAR(30) NOT NULL DEFAULT 'pending',
  payment_type           VARCHAR(40) DEFAULT NULL,
  midtrans_order_id      VARCHAR(60) DEFAULT NULL,    -- renewal_number + '-' + attempt
  payment_attempt        INT NOT NULL DEFAULT 0,
  snap_token             VARCHAR(255) DEFAULT NULL,
  payment_url            VARCHAR(500) DEFAULT NULL,
  payment_created_at     DATETIME DEFAULT NULL,       -- Snap page of the current attempt (reused for 23 hours)
  paid_at                DATETIME DEFAULT NULL,
  paid_midtrans_order_id VARCHAR(60) DEFAULT NULL,    -- Midtrans order_id of the attempt that paid (refund / double payment checks)
  cancelled_at           DATETIME DEFAULT NULL,
  service_expires_before DATETIME DEFAULT NULL,
  service_expires_after  DATETIME DEFAULT NULL,
  domain_expires_before  DATETIME DEFAULT NULL,
  domain_expires_after   DATETIME DEFAULT NULL,
  created_at             TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_renewals_number (renewal_number),
  UNIQUE KEY uq_renewals_midtrans (midtrans_order_id),
  UNIQUE KEY uq_renewals_pending (pending_order_id),
  KEY idx_renewals_order (order_id, created_at),
  KEY idx_renewals_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Tabel yang dibuat versi awal migrasi ini (uji lokal) belum punya kolom ini
CALL gn_add_column('template_renewals', 'paid_midtrans_order_id', "VARCHAR(60) DEFAULT NULL AFTER paid_at");

DROP PROCEDURE IF EXISTS gn_add_column;
DROP PROCEDURE IF EXISTS gn_exec;

-- 4. "Sudah termasuk": domain tidak termasuk lagi (setting yang pernah disimpan admin)
UPDATE hero_settings
   SET setting_value = TRIM(BOTH '\n' FROM REPLACE(REPLACE(REPLACE(CONCAT('\n', REPLACE(setting_value, '\r\n', '\n'), '\n'),
                       '\n- Domain tahun pertama\n', '\n'), '\n• Domain tahun pertama\n', '\n'), '\nDomain tahun pertama\n', '\n'))
 WHERE setting_key = 'template_price_includes' AND setting_value LIKE '%Domain tahun pertama%';

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-25_026', 'domain berbayar (domain_price), masa aktif, template_renewals, profil pembeli (users company/address/city)');

SELECT column_name, column_type, is_nullable, column_default FROM information_schema.columns
 WHERE table_schema = DATABASE()
   AND ((table_name = 'template_orders' AND column_name IN ('domain_price', 'domain_check', 'service_started_at', 'service_expires_at',
                                                           'domain_started_at', 'domain_expires_at'))
        OR (table_name = 'users' AND column_name IN ('company_name', 'address', 'city')))
 ORDER BY table_name, ordinal_position;
SELECT COUNT(*) AS renewals_table_rows FROM template_renewals;
