-- ============================================================================
-- Migration 2026-10-21_006 — Project Documentation & Agreement Management
-- ============================================================================
-- Kontrak: docs/platform/PROJECT-DOCS-SPEC.md §3. Target: db_garudanexabahtera yang SUDAH ada
-- (MariaDB 10.4 XAMPP lokal atau MySQL 8.0 produksi). Instalasi baru memakai
-- database/schema.sql + database/seed.sql (sudah berisi semua yang ada di sini).
--
-- Jalankan (BACKUP dulu, lihat database/README.md):
--   mysql -u root db_garudanexabahtera < database/migrations/2026-10-21_006_project_documents.sql
--
-- Aman diulang: tabel memakai CREATE TABLE IF NOT EXISTS, kolom dan index dicek lewat
-- information_schema, pengaturan bawaan memakai INSERT IGNORE (nilai yang sudah diubah admin
-- tidak ditimpa). Tidak ada DROP TABLE / DELETE / UPDATE data.
--
-- Isi
--  1. pd_clients              tabel baru: klien (perusahaan/perorangan), bisa ditautkan ke akun customer
--  2. project_client          + client_id, code (PRJ-YYYY-NNN, unik), stage_override, use_mou,
--                             has_maintenance, maintenance_fee/period/start/end, scope_summary,
--                             payment_terms (JSON PaymentTerm[]), updated_at
--  3. pd_milestones           jadwal/milestone per proyek (bobot + progres)
--  4. pd_documents            dokumen proyek (BRD, MoU, Proposal, PKS+SOW, Jadwal, UAT, BAST, Invoice,
--                             Kuitansi, SLA): nomor unik, status, versi, konten JSON, snapshot beku
--  5. pd_document_revisions   riwayat revisi (satu baris per versi)
--  6. pd_approvals            persetujuan/penolakan klien per versi
--  7. pd_signatures           tanda tangan elektronik per versi & pihak (+ hash dokumen)
--  8. pd_invoices             tagihan (DP/termin/pelunasan/maintenance), total dihitung server
--  9. pd_payments             pembayaran tercatat (+ bukti, kuitansi otomatis)
-- 10. pd_notifications        notifikasi in-app (per user atau broadcast per role)
--     pd_notification_reads   status baca broadcast per user
-- 11. pd_counters             penomoran dokumen atomik per kode & tahun
-- 12. pd_activity             log aktivitas proyek
-- 13. DATA hero_settings      pd_company, pd_numbering, pd_tax, pd_payment_terms, pd_sla_defaults
--                             (INSERT IGNORE; NPWP/rekening sengaja kosong, diisi admin)
-- ============================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version     VARCHAR(100) NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  applied_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1. Klien ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pd_clients (
  id         INT NOT NULL AUTO_INCREMENT,
  type       ENUM('perusahaan','perorangan') NOT NULL DEFAULT 'perusahaan',
  name       VARCHAR(255) NOT NULL,               -- company or person name
  pic_name   VARCHAR(255) DEFAULT NULL,
  pic_title  VARCHAR(255) DEFAULT NULL,
  email      VARCHAR(255) DEFAULT NULL,
  phone      VARCHAR(50) DEFAULT NULL,
  address    TEXT DEFAULT NULL,
  city       VARCHAR(120) DEFAULT NULL,
  npwp       VARCHAR(32) DEFAULT NULL,
  user_id    INT DEFAULT NULL,                    -- users.id with role customer (login for the client)
  notes      TEXT DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Milestone ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pd_milestones (
  id           INT NOT NULL AUTO_INCREMENT,
  project_id   INT NOT NULL,                      -- project_client.id
  title        VARCHAR(255) NOT NULL,
  description  TEXT DEFAULT NULL,
  start_date   DATE DEFAULT NULL,
  due_date     DATE DEFAULT NULL,
  weight       INT NOT NULL DEFAULT 1,            -- relative weight
  progress     TINYINT NOT NULL DEFAULT 0,        -- 0..100
  status       ENUM('belum_mulai','berjalan','selesai','tertunda') NOT NULL DEFAULT 'belum_mulai',
  sort_order   INT NOT NULL DEFAULT 0,
  completed_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Dokumen --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pd_documents (
  id                 INT NOT NULL AUTO_INCREMENT,
  project_id         INT NOT NULL,
  doc_type           ENUM('brd','mou','proposal','pks','timeline','uat','bast','invoice','receipt','sla') NOT NULL,
  number             VARCHAR(64) NOT NULL,        -- 007/PKS/GNB/X/2026, assigned once at creation
  title              VARCHAR(255) NOT NULL,
  status             ENUM('draft','menunggu_persetujuan','disetujui','selesai') NOT NULL DEFAULT 'draft',
  version            INT NOT NULL DEFAULT 1,
  content            LONGTEXT NOT NULL,           -- JSON DocContent of the current version
  snapshot           LONGTEXT DEFAULT NULL,       -- JSON MergeData frozen at submit/issue
  content_hash       CHAR(64) DEFAULT NULL,       -- SHA-256 of canonical JSON {content, snapshot}
  revision_requested TINYINT(1) NOT NULL DEFAULT 0,
  review_note        TEXT DEFAULT NULL,
  doc_date           DATE NOT NULL,               -- tanggal dokumen
  submitted_at       DATETIME DEFAULT NULL,
  approved_at        DATETIME DEFAULT NULL,
  completed_at       DATETIME DEFAULT NULL,
  created_by         INT DEFAULT NULL,
  updated_by         INT DEFAULT NULL,
  created_at         TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_number (number),
  KEY idx_project_type (project_id, doc_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Riwayat revisi -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pd_document_revisions (
  id          INT NOT NULL AUTO_INCREMENT,
  document_id INT NOT NULL,
  version     INT NOT NULL,
  content     LONGTEXT NOT NULL,
  change_note VARCHAR(500) DEFAULT NULL,
  changed_by  INT DEFAULT NULL,
  created_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_doc_version (document_id, version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Persetujuan klien ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS pd_approvals (
  id          INT NOT NULL AUTO_INCREMENT,
  document_id INT NOT NULL,
  version     INT NOT NULL,
  user_id     INT NOT NULL,
  decision    ENUM('approved','rejected') NOT NULL,
  note        TEXT DEFAULT NULL,
  ip          VARCHAR(64) DEFAULT NULL,
  user_agent  VARCHAR(255) DEFAULT NULL,
  created_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_doc (document_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Tanda tangan elektronik ----------------------------------------------------
CREATE TABLE IF NOT EXISTS pd_signatures (
  id           INT NOT NULL AUTO_INCREMENT,
  document_id  INT NOT NULL,
  version      INT NOT NULL,
  party        ENUM('pihak_pertama','pihak_kedua') NOT NULL,
  user_id      INT NOT NULL,
  signer_name  VARCHAR(255) NOT NULL,
  signer_title VARCHAR(255) DEFAULT NULL,
  method       ENUM('draw','type') NOT NULL,
  image_file   VARCHAR(255) NOT NULL,             -- file name in private storage (random hex + .png)
  content_hash CHAR(64) NOT NULL,
  ip           VARCHAR(64) DEFAULT NULL,
  user_agent   VARCHAR(255) DEFAULT NULL,
  signed_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_doc_version_party (document_id, version, party)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Invoice --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pd_invoices (
  id             INT NOT NULL AUTO_INCREMENT,
  project_id     INT NOT NULL,
  document_id    INT NOT NULL,                    -- pd_documents.id (doc_type invoice)
  term_key       VARCHAR(40) DEFAULT NULL,        -- PaymentTerm.key or NULL for manual
  kind           ENUM('dp','termin','pelunasan','maintenance','lainnya') NOT NULL,
  issue_date     DATE NOT NULL,
  due_date       DATE NOT NULL,
  items          LONGTEXT NOT NULL,               -- JSON InvoiceItem[]
  subtotal       DECIMAL(15,2) NOT NULL,
  discount       DECIMAL(15,2) NOT NULL DEFAULT 0,
  dpp            DECIMAL(15,2) NOT NULL,
  ppn_rate       DECIMAL(5,2) NOT NULL DEFAULT 0,
  ppn_amount     DECIMAL(15,2) NOT NULL DEFAULT 0,
  pph23_rate     DECIMAL(5,2) NOT NULL DEFAULT 0,
  pph23_amount   DECIMAL(15,2) NOT NULL DEFAULT 0,
  total          DECIMAL(15,2) NOT NULL,
  amount_due     DECIMAL(15,2) NOT NULL,
  amount_paid    DECIMAL(15,2) NOT NULL DEFAULT 0,
  payment_status ENUM('belum_dibayar','sebagian','lunas','dibatalkan') NOT NULL DEFAULT 'belum_dibayar',
  notes          TEXT DEFAULT NULL,
  created_at     TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_document (document_id),
  KEY idx_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Pembayaran -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pd_payments (
  id                  INT NOT NULL AUTO_INCREMENT,
  invoice_id          INT NOT NULL,
  amount              DECIMAL(15,2) NOT NULL,
  paid_at             DATE NOT NULL,
  method              ENUM('transfer','tunai','qris','lainnya') NOT NULL DEFAULT 'transfer',
  reference           VARCHAR(120) DEFAULT NULL,
  proof_file          VARCHAR(255) DEFAULT NULL,  -- file name in private storage
  note                TEXT DEFAULT NULL,
  receipt_document_id INT DEFAULT NULL,           -- pd_documents.id (doc_type receipt)
  recorded_by         INT NOT NULL,
  created_at          TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_invoice (invoice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Notifikasi in-app ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS pd_notifications (
  id         INT NOT NULL AUTO_INCREMENT,
  user_id    INT DEFAULT NULL,                    -- one user, or NULL = every user of `role`
  role       ENUM('admin','user','customer') DEFAULT NULL,
  type       VARCHAR(40) NOT NULL,
  title      VARCHAR(255) NOT NULL,
  body       VARCHAR(500) DEFAULT NULL,
  link       VARCHAR(255) DEFAULT NULL,
  project_id INT DEFAULT NULL,
  dedupe_key VARCHAR(120) DEFAULT NULL,
  read_at    DATETIME DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_dedupe (dedupe_key),
  KEY idx_user (user_id),
  KEY idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Role broadcasts track reads per user
CREATE TABLE IF NOT EXISTS pd_notification_reads (
  notification_id INT NOT NULL,
  user_id         INT NOT NULL,
  read_at         DATETIME NOT NULL,
  PRIMARY KEY (notification_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Penomoran -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pd_counters (
  counter_key VARCHAR(16) NOT NULL,               -- document CODE (BRD, PKS, ...) or PRJ
  year        SMALLINT NOT NULL,
  last_seq    INT NOT NULL DEFAULT 0,
  PRIMARY KEY (counter_key, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Aktivitas -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pd_activity (
  id          INT NOT NULL AUTO_INCREMENT,
  project_id  INT NOT NULL,
  document_id INT DEFAULT NULL,
  user_id     INT DEFAULT NULL,
  action      VARCHAR(40) NOT NULL,
  detail      VARCHAR(500) DEFAULT NULL,
  created_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP PROCEDURE IF EXISTS gn_exec;
DROP PROCEDURE IF EXISTS gn_add_column;
DROP PROCEDURE IF EXISTS gn_add_index;
DROP PROCEDURE IF EXISTS gn_migrate_2026_10_21_006;

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

-- ADD INDEX only if no index with that name exists. def = "UNIQUE KEY name (cols)" / "KEY name (cols)"
CREATE PROCEDURE gn_add_index(IN tbl VARCHAR(64), IN idx VARCHAR(64), IN def TEXT)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.statistics
                 WHERE table_schema = DATABASE() AND table_name = tbl AND index_name = idx) THEN
    CALL gn_exec(CONCAT('ALTER TABLE `', tbl, '` ADD ', def));
  END IF;
END$$

CREATE PROCEDURE gn_migrate_2026_10_21_006()
BEGIN
  -- 2. project_client: workspace columns (contract value stays in the existing `price`) ---------
  CALL gn_add_column('project_client', 'client_id', "INT NULL DEFAULT NULL AFTER source");
  CALL gn_add_column('project_client', 'code', "VARCHAR(32) NULL DEFAULT NULL AFTER client_id");
  CALL gn_add_column('project_client', 'stage_override', "VARCHAR(20) NULL DEFAULT NULL AFTER code");
  CALL gn_add_column('project_client', 'use_mou', "TINYINT(1) NOT NULL DEFAULT 0 AFTER stage_override");
  CALL gn_add_column('project_client', 'has_maintenance', "TINYINT(1) NOT NULL DEFAULT 0 AFTER use_mou");
  CALL gn_add_column('project_client', 'maintenance_fee', "DECIMAL(15,2) NULL DEFAULT NULL AFTER has_maintenance");
  CALL gn_add_column('project_client', 'maintenance_period', "ENUM('bulanan','tahunan') NULL DEFAULT NULL AFTER maintenance_fee");
  CALL gn_add_column('project_client', 'maintenance_start', "DATE NULL DEFAULT NULL AFTER maintenance_period");
  CALL gn_add_column('project_client', 'maintenance_end', "DATE NULL DEFAULT NULL AFTER maintenance_start");
  CALL gn_add_column('project_client', 'scope_summary', "TEXT NULL DEFAULT NULL AFTER maintenance_end");
  CALL gn_add_column('project_client', 'payment_terms', "LONGTEXT NULL DEFAULT NULL AFTER scope_summary");
  CALL gn_add_column('project_client', 'updated_at', "TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP AFTER created_at");
  CALL gn_add_index('project_client', 'uq_project_client_code', 'UNIQUE KEY uq_project_client_code (code)');
  CALL gn_add_index('project_client', 'idx_project_client_client', 'KEY idx_project_client_client (client_id)');

  -- 13. Default settings (never overwrite what the admin already saved) -------------------------
  INSERT IGNORE INTO hero_settings (setting_key, setting_value) VALUES
    ('pd_company', '{"name":"PT Garuda Nexa Bahtera","address":"","city":"","phone":"","email":"","website":"https://garudanexa.com","npwp":"","signatory_name":"","signatory_title":"Direktur","bank_accounts":[{"bank":"","number":"","holder":""}]}'),
    ('pd_numbering', '{"prefix":"GNB"}'),
    ('pd_tax', '{"ppn_enabled":false,"ppn_rate":12,"dpp_numerator":11,"dpp_denominator":12,"pph23_rate":2}'),
    ('pd_payment_terms', '[{"key":"dp","label":"Uang muka (DP)","percent":50,"trigger":"kontrak","due_days":7},{"key":"termin2","label":"Termin 2","percent":30,"trigger":"uji","due_days":7},{"key":"pelunasan","label":"Pelunasan","percent":20,"trigger":"serah_terima","due_days":7}]'),
    ('pd_sla_defaults', '{"support_hours":"Senin–Jumat 09.00–17.00 WIB","uptime":"99,5%","priorities":[{"level":"P1 – Kritis","response":"2 jam","resolution":"1 hari kerja"},{"level":"P2 – Tinggi","response":"4 jam","resolution":"2 hari kerja"},{"level":"P3 – Normal","response":"1 hari kerja","resolution":"5 hari kerja"}]}');

  INSERT IGNORE INTO schema_migrations (version, description)
  VALUES ('2026-10-21_006', 'project documents: pd_* tables, project_client workspace columns, pd_* settings');
END$$

DELIMITER ;

CALL gn_migrate_2026_10_21_006();

DROP PROCEDURE IF EXISTS gn_migrate_2026_10_21_006;
DROP PROCEDURE IF EXISTS gn_add_index;
DROP PROCEDURE IF EXISTS gn_add_column;
DROP PROCEDURE IF EXISTS gn_exec;

SELECT version, applied_at FROM schema_migrations ORDER BY version;
SELECT setting_key, JSON_VALID(setting_value) AS json_ok FROM hero_settings WHERE setting_key LIKE 'pd\_%' ORDER BY setting_key;
