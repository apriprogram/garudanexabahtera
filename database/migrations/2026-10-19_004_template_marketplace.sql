-- ============================================================================
-- Migration 2026-10-19_004 — template marketplace + jasa custom
-- ============================================================================
-- Kontrak: docs/platform/SPEC.md §3. Target: db_garudanexabahtera yang SUDAH ada
-- (MariaDB 10.4 XAMPP lokal atau MySQL 8.0 produksi). Instalasi baru memakai
-- database/schema.sql (sudah berisi semua yang ada di sini).
--
-- Jalankan (BACKUP dulu, lihat database/README.md):
--   mysql -u root db_garudanexabahtera < database/migrations/2026-10-19_004_template_marketplace.sql
--
-- Aman diulang: tabel memakai CREATE TABLE IF NOT EXISTS, kolom dicek lewat
-- information_schema, dan langkah data (navbar, FAQ) hanya jalan sekali, yaitu
-- selama versi 2026-10-19_004 belum tercatat di schema_migrations.
-- Tidak ada DROP TABLE / DELETE. Menu navbar lama hanya dinonaktifkan (is_active = 0).
--
-- Isi
--  1. users.role               + 'customer'  (ENUM('admin','user','customer'))
--  2. templates                tabel baru: katalog template (draft/published)
--  3. template_orders          tabel baru: pesanan template + data pembayaran Midtrans
--  4. template_sites           tabel baru: situs aktif per pesanan (konten CMS JSON)
--  5. template_order_logs      tabel baru: riwayat status / pembayaran per pesanan
--  6. project_client           + show_on_website (tampil di section Projects),
--                              + source ('admin' | 'website' = dari form custom publik)
--  7. DATA navbar_menus        menu atas menjadi Template (#templates), Projects (#projects),
--                              Proses (#process), FAQ (#faq). Baris "Produk" dipakai ulang
--                              jadi Template, "Portofolio" jadi Projects. Menu atas lain
--                              (Harga, Perusahaan, ...) dan SEMUA sub-menu dinonaktifkan.
--                              Navbar kosong dibiarkan kosong (frontend pakai menu bawaan).
--  8. DATA hero_settings.faq_data  jawaban FAQ yang menyebut harga/paket/biaya jasa custom
--                              ditulis ulang netral (JSON tetap valid). Lainnya tidak disentuh.
-- ============================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version     VARCHAR(100) NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  applied_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Katalog template ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS templates (
  id                INT NOT NULL AUTO_INCREMENT,
  slug              VARCHAR(120) NOT NULL,
  name              VARCHAR(150) NOT NULL,
  category          VARCHAR(80) NOT NULL DEFAULT 'Company Profile',
  short_description VARCHAR(255) DEFAULT NULL,
  description       TEXT DEFAULT NULL,
  features          TEXT DEFAULT NULL,            -- JSON array of string
  price             DECIMAL(15,2) NOT NULL DEFAULT 0,
  preview_image     VARCHAR(500) DEFAULT NULL,
  gallery           TEXT DEFAULT NULL,            -- JSON array of image path
  template_code     VARCHAR(60) NOT NULL,         -- renderer key in src/templates (e.g. 'corporate-nexa')
  demo_url          VARCHAR(500) DEFAULT NULL,    -- optional; empty = /demo/:slug
  status            ENUM('draft','published') NOT NULL DEFAULT 'draft',
  sort_order        INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_templates_slug (slug),
  KEY idx_templates_status (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Pesanan template ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS template_orders (
  id                 INT NOT NULL AUTO_INCREMENT,
  order_number       VARCHAR(40) NOT NULL,        -- 'GN-YYYYMMDD-XXXXXX'
  user_id            INT NOT NULL,
  template_id        INT DEFAULT NULL,
  template_name      VARCHAR(150) NOT NULL,       -- snapshot at order time
  template_code      VARCHAR(60) NOT NULL,
  price              DECIMAL(15,2) NOT NULL,      -- snapshot at order time
  customer_name      VARCHAR(150) NOT NULL,
  customer_email     VARCHAR(150) NOT NULL,
  customer_phone     VARCHAR(30) NOT NULL,
  company_name       VARCHAR(150) DEFAULT NULL,
  notes              TEXT DEFAULT NULL,
  domain_primary     VARCHAR(253) NOT NULL,
  domain_alternative VARCHAR(253) DEFAULT NULL,
  domain             VARCHAR(253) DEFAULT NULL,   -- final domain, set by staff
  status             ENUM('menunggu_pembayaran','menunggu_approval','proses_domain','aktif','ditolak','dibatalkan')
                     NOT NULL DEFAULT 'menunggu_pembayaran',
  payment_status     VARCHAR(30) NOT NULL DEFAULT 'pending',  -- last Midtrans transaction_status
  payment_type       VARCHAR(40) DEFAULT NULL,
  midtrans_order_id  VARCHAR(60) DEFAULT NULL,    -- order_number + '-' + attempt
  payment_attempt    INT NOT NULL DEFAULT 0,
  snap_token         VARCHAR(255) DEFAULT NULL,
  payment_url        VARCHAR(500) DEFAULT NULL,
  paid_at            DATETIME DEFAULT NULL,
  approved_at        DATETIME DEFAULT NULL,
  approved_by        INT DEFAULT NULL,
  rejected_reason    VARCHAR(500) DEFAULT NULL,
  activated_at       DATETIME DEFAULT NULL,
  cancelled_at       DATETIME DEFAULT NULL,
  created_at         TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_number (order_number),
  UNIQUE KEY uq_orders_midtrans (midtrans_order_id),
  KEY idx_orders_user (user_id),
  KEY idx_orders_status (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Situs aktif (satu per pesanan) --------------------------------------------
CREATE TABLE IF NOT EXISTS template_sites (
  id            INT NOT NULL AUTO_INCREMENT,
  order_id      INT NOT NULL,
  user_id       INT NOT NULL,
  template_id   INT DEFAULT NULL,
  template_code VARCHAR(60) NOT NULL,
  domain        VARCHAR(253) NOT NULL,
  status        ENUM('active','suspended') NOT NULL DEFAULT 'active',
  content       MEDIUMTEXT DEFAULT NULL,          -- JSON SiteContent; NULL = template default
  activated_at  DATETIME DEFAULT NULL,
  updated_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sites_order (order_id),
  UNIQUE KEY uq_sites_domain (domain),
  KEY idx_sites_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Riwayat pesanan ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS template_order_logs (
  id          INT NOT NULL AUTO_INCREMENT,
  order_id    INT NOT NULL,
  event       VARCHAR(40) NOT NULL,   -- created|payment_created|payment_update|approved|rejected|domain_set|activated|cancelled|note
  from_status VARCHAR(30) DEFAULT NULL,
  to_status   VARCHAR(30) DEFAULT NULL,
  actor_type  ENUM('system','customer','staff','midtrans') NOT NULL,
  actor_id    INT DEFAULT NULL,
  note        VARCHAR(500) DEFAULT NULL,
  payload     TEXT DEFAULT NULL,      -- Midtrans notification fields (no signature / card data)
  created_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_logs_order (order_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP PROCEDURE IF EXISTS gn_exec;
DROP PROCEDURE IF EXISTS gn_add_column;
DROP PROCEDURE IF EXISTS gn_modify_unless_type;
DROP PROCEDURE IF EXISTS gn_migrate_2026_10_19_004;

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

-- MODIFY COLUMN unless its COLUMN_TYPE already equals want_type.
CREATE PROCEDURE gn_modify_unless_type(IN tbl VARCHAR(64), IN col VARCHAR(64), IN want_type VARCHAR(255), IN def TEXT)
BEGIN
  DECLARE cur VARCHAR(255) DEFAULT NULL;
  SELECT LOWER(column_type) INTO cur FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = tbl AND column_name = col;
  IF cur IS NOT NULL AND cur <> LOWER(want_type) THEN
    CALL gn_exec(CONCAT('ALTER TABLE `', tbl, '` MODIFY COLUMN `', col, '` ', def));
  END IF;
END$$

CREATE PROCEDURE gn_migrate_2026_10_19_004()
BEGIN
  DECLARE first_run INT DEFAULT 0;
  DECLARE t_id INT DEFAULT NULL;   -- Template
  DECLARE p_id INT DEFAULT NULL;   -- Projects
  DECLARE s_id INT DEFAULT NULL;   -- Proses
  DECLARE f_id INT DEFAULT NULL;   -- FAQ
  DECLARE faq LONGTEXT DEFAULT NULL;
  DECLARE i INT DEFAULT 0;
  DECLARE n INT DEFAULT 0;
  DECLARE q TEXT DEFAULT NULL;
  DECLARE a TEXT DEFAULT NULL;
  DECLARE changed INT DEFAULT 0;

  SELECT COUNT(*) = 0 INTO first_run FROM schema_migrations WHERE version = '2026-10-19_004';

  -- 1. users.role ---------------------------------------------------------------
  CALL gn_modify_unless_type('users', 'role', "enum('admin','user','customer')",
                             "ENUM('admin','user','customer') DEFAULT 'user'");

  -- 6. project_client ------------------------------------------------------------
  CALL gn_add_column('project_client', 'show_on_website', "TINYINT(1) NOT NULL DEFAULT 0 AFTER description");
  CALL gn_add_column('project_client', 'source', "ENUM('admin','website') NOT NULL DEFAULT 'admin' AFTER show_on_website");

  -- 7. navbar_menus (data, first run only, only for a navbar that has rows) --------
  IF first_run = 1 AND EXISTS (SELECT 1 FROM navbar_menus WHERE parent_id IS NULL) THEN
    -- Template: reuse "Produk" (its product sub-menus no longer fit), otherwise add a row
    SET t_id = (SELECT id FROM navbar_menus WHERE parent_id IS NULL AND url = '#templates' ORDER BY id LIMIT 1);
    IF t_id IS NULL THEN
      SET t_id = (SELECT id FROM navbar_menus WHERE parent_id IS NULL AND label_en = 'Products' ORDER BY id LIMIT 1);
      IF t_id IS NULL THEN
        INSERT INTO navbar_menus (parent_id, label_id, label_en, url, icon, sort_order, is_active)
        VALUES (NULL, 'Template', 'Templates', '#templates', 'Globe', 1, 1);
        SET t_id = LAST_INSERT_ID();
      END IF;
    END IF;
    UPDATE navbar_menus
       SET label_id = 'Template', label_en = 'Templates', url = '#templates',
           description_id = NULL, description_en = NULL, sort_order = 1, is_active = 1
     WHERE id = t_id;

    -- Projects: reuse "Portofolio", otherwise add a row
    SET p_id = (SELECT id FROM navbar_menus WHERE parent_id IS NULL AND url = '#projects' ORDER BY id LIMIT 1);
    IF p_id IS NULL THEN
      SET p_id = (SELECT id FROM navbar_menus WHERE parent_id IS NULL AND label_en = 'Portfolio' ORDER BY id LIMIT 1);
      IF p_id IS NULL THEN
        INSERT INTO navbar_menus (parent_id, label_id, label_en, url, icon, sort_order, is_active)
        VALUES (NULL, 'Projects', 'Projects', '#projects', 'Globe', 2, 1);
        SET p_id = LAST_INSERT_ID();
      END IF;
    END IF;
    UPDATE navbar_menus
       SET label_id = 'Projects', label_en = 'Projects', url = '#projects',
           description_id = NULL, description_en = NULL, sort_order = 2, is_active = 1
     WHERE id = p_id;

    -- Proses (matched by label: "Perusahaan" also points to #process)
    SET s_id = (SELECT id FROM navbar_menus WHERE parent_id IS NULL AND label_en = 'Process' ORDER BY id LIMIT 1);
    IF s_id IS NULL THEN
      INSERT INTO navbar_menus (parent_id, label_id, label_en, url, icon, sort_order, is_active)
      VALUES (NULL, 'Proses', 'Process', '#process', 'Globe', 3, 1);
      SET s_id = LAST_INSERT_ID();
    END IF;
    UPDATE navbar_menus SET url = '#process', sort_order = 3, is_active = 1 WHERE id = s_id;

    -- FAQ
    SET f_id = (SELECT id FROM navbar_menus WHERE parent_id IS NULL AND label_en = 'FAQ' ORDER BY id LIMIT 1);
    IF f_id IS NULL THEN
      INSERT INTO navbar_menus (parent_id, label_id, label_en, url, icon, sort_order, is_active)
      VALUES (NULL, 'FAQ', 'FAQ', '#faq', 'Globe', 4, 1);
      SET f_id = LAST_INSERT_ID();
    END IF;
    UPDATE navbar_menus SET url = '#faq', sort_order = 4, is_active = 1 WHERE id = f_id;

    -- Everything else is switched off, never deleted (Harga, Perusahaan, all sub-menus)
    UPDATE navbar_menus SET is_active = 0
     WHERE parent_id IS NULL AND id NOT IN (t_id, p_id, s_id, f_id);
    UPDATE navbar_menus SET is_active = 0 WHERE parent_id IS NOT NULL;
    UPDATE navbar_menus SET sort_order = 5 WHERE parent_id IS NULL AND label_en = 'Pricing';
    UPDATE navbar_menus SET sort_order = 6 WHERE parent_id IS NULL AND label_en = 'Company';
  END IF;

  -- 8. hero_settings.faq_data: no custom-service prices/packages ----------------
  SET faq = (SELECT setting_value FROM hero_settings WHERE setting_key = 'faq_data' LIMIT 1);
  IF faq IS NOT NULL AND JSON_VALID(faq) = 1 THEN
    SET n = IF(JSON_TYPE(faq) = 'ARRAY', JSON_LENGTH(faq), 0);
  END IF;
  IF n > 0 THEN
    SET i = 0;
    WHILE i < n DO
      SET q = JSON_UNQUOTE(JSON_EXTRACT(faq, CONCAT('$[', i, '].question')));
      SET a = JSON_UNQUOTE(JSON_EXTRACT(faq, CONCAT('$[', i, '].answer')));
      IF LOWER(CONCAT(IFNULL(q, ''), ' ', IFNULL(a, ''))) REGEXP 'paket|harga|biaya|tarif|rp ?[0-9]' THEN
        IF LOWER(IFNULL(q, '')) REGEXP 'hosting|domain' THEN
          SET q = 'Apakah sudah termasuk hosting dan domain?';
          SET a = 'Untuk website dari template, domain yang Anda ajukan saat pemesanan kami proses sampai situs Anda aktif. Untuk website atau aplikasi mobile custom, kebutuhan hosting dan domain dibahas bersama saat konsultasi.';
        ELSEIF LOWER(IFNULL(q, '')) REGEXP 'lama|waktu|durasi|berapa hari' THEN
          SET a = 'Website dari template bisa aktif dalam beberapa hari kerja setelah pembayaran dikonfirmasi dan domain selesai diproses. Untuk website atau aplikasi mobile custom, jadwal pengerjaan disepakati bersama setelah konsultasi kebutuhan.';
        ELSE
          IF LOWER(IFNULL(q, '')) REGEXP 'paket|harga|biaya|tarif|rp ?[0-9]' THEN
            SET q = 'Bagaimana cara memesan website atau aplikasi?';
          END IF;
          SET a = 'Pilih template siap pakai di bagian Template lalu pesan langsung secara online, atau ajukan kebutuhan website dan aplikasi mobile custom melalui formulir pesanan custom. Tim kami akan menghubungi Anda untuk konsultasi.';
        END IF;
        SET faq = JSON_SET(faq, CONCAT('$[', i, '].question'), q, CONCAT('$[', i, '].answer'), a);
        SET changed = changed + 1;
      END IF;
      SET i = i + 1;
    END WHILE;
    IF changed > 0 THEN
      UPDATE hero_settings SET setting_value = faq WHERE setting_key = 'faq_data';
    END IF;
  END IF;

  INSERT IGNORE INTO schema_migrations (version, description)
  VALUES ('2026-10-19_004', 'template marketplace: templates, orders, sites, logs; customer role; project_client show_on_website/source; navbar + FAQ');
END$$

DELIMITER ;

CALL gn_migrate_2026_10_19_004();

DROP PROCEDURE IF EXISTS gn_migrate_2026_10_19_004;
DROP PROCEDURE IF EXISTS gn_modify_unless_type;
DROP PROCEDURE IF EXISTS gn_add_column;
DROP PROCEDURE IF EXISTS gn_exec;

SELECT version, applied_at FROM schema_migrations ORDER BY version;
SELECT id, parent_id, label_id, url, sort_order, is_active FROM navbar_menus WHERE parent_id IS NULL ORDER BY sort_order, id;
