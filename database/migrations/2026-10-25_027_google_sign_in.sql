-- ============================================================================
-- Migration 2026-10-25_027 — masuk & daftar akun pembeli dengan Google
-- ============================================================================
-- Permintaan pemilik 2026-10-25 (docs/platform/GOOGLE-LOGIN.md): tombol "Daftar/Masuk dengan Google" di /daftar dan
-- /masuk, di samping form email + kata sandi yang tetap ada.
--   users.google_sub = id akun Google (klaim `sub` ID token: stabil, maks 255 karakter ASCII, peka huruf besar/kecil,
--   karena itu ascii_bin). UNIQUE: satu akun Google hanya tertaut ke satu akun. NULL = belum pernah masuk lewat Google.
--   Diisi backend/modules/google_auth.php (= google_auth.js) saat akun pembeli dibuat lewat Google, atau saat akun lama
--   dengan email Gmail/Google Workspace yang sama pertama kali masuk lewat Google.
-- Client ID Google tidak disimpan di sini: setting google_client_id (hero_settings) atau env GOOGLE_CLIENT_ID, lihat
-- docs/platform/GOOGLE-LOGIN.md §3.
--
-- Aman dijalankan ulang (kolom dan indeks ditambah hanya bila belum ada). Jalankan SEBELUM deploy kode yang memakainya:
--   C:/xampp/mysql/bin/mysql.exe -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-25_027_google_sign_in.sql
-- phpMyAdmin (produksi): import file ini lewat tab SQL. Bila impor menolak prosedur (information_schema), jalankan dua
-- pernyataan ini satu per satu, lalu INSERT schema_migrations di bawah:
--   ALTER TABLE users ADD COLUMN google_sub VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL AFTER avatar;
--   ALTER TABLE users ADD UNIQUE KEY uq_users_google_sub (google_sub);
-- ============================================================================

SET NAMES utf8mb4;

DROP PROCEDURE IF EXISTS gn_exec;
DROP PROCEDURE IF EXISTS gn_add_column;
DROP PROCEDURE IF EXISTS gn_add_index;

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

-- ADD INDEX only if no index with that name exists. def = "UNIQUE KEY name (cols)"
CREATE PROCEDURE gn_add_index(IN tbl VARCHAR(64), IN idx VARCHAR(64), IN def TEXT)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.statistics
                 WHERE table_schema = DATABASE() AND table_name = tbl AND index_name = idx) THEN
    CALL gn_exec(CONCAT('ALTER TABLE `', tbl, '` ADD ', def));
  END IF;
END$$

DELIMITER ;

CALL gn_add_column('users', 'google_sub', "VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL AFTER avatar");
CALL gn_add_index('users', 'uq_users_google_sub', "UNIQUE KEY uq_users_google_sub (google_sub)");

DROP PROCEDURE IF EXISTS gn_add_index;
DROP PROCEDURE IF EXISTS gn_add_column;
DROP PROCEDURE IF EXISTS gn_exec;

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-25_027', 'users.google_sub (masuk & daftar pembeli dengan Google)');

SELECT column_name, column_type, collation_name, is_nullable FROM information_schema.columns
 WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'google_sub';
SELECT index_name, non_unique FROM information_schema.statistics
 WHERE table_schema = DATABASE() AND table_name = 'users' AND index_name = 'uq_users_google_sub';
