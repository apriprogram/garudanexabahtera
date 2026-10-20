-- ############################################################################
-- ############################################################################
-- ##                                                                        ##
-- ##   JANGAN DIJALANKAN SEBELUM BACKUP - menunggu persetujuan pengguna     ##
-- ##                                                                        ##
-- ##   Migrasi ini MENGHAPUS PERMANEN 25 tabel monitoring beserta isinya.   ##
-- ##   Belum disetujui. Jangan jalankan sampai pemilik proyek menyetujui    ##
-- ##   dan backup lengkap sudah dibuat serta dicek (lihat README).          ##
-- ##                                                                        ##
-- ############################################################################
-- ############################################################################
--
-- Migration 2026-10-19_005 — hapus tabel fitur Monitoring Server (sudah dihapus dari kode)
--
-- Latar belakang: halaman Monitoring Server / Monitor produk di panel admin dan semua
-- endpoint monitoring di backend/api.php dan backend/server.js sudah dihapus
-- (lihat docs/platform/SPEC.md). Tabel di bawah tidak dibaca/ditulis kode lagi.
--
-- Tabel yang DIHAPUS (25):
--   monitor_*    (13): monitor_ai_agents, monitor_ai_logs, monitor_ai_usage, monitor_audit_logs,
--                      monitor_error_center, monitor_errors, monitor_notifications, monitor_pings,
--                      monitor_server_logs, monitor_servers, monitor_ssl, monitor_website_logs,
--                      monitor_websites
--   monitoring_* (12): monitoring_api, monitoring_api_logs, monitoring_categories, monitoring_database,
--                      monitoring_domains, monitoring_notifications, monitoring_security_logs,
--                      monitoring_server_metrics, monitoring_server_status, monitoring_settings,
--                      monitoring_website_checks, monitoring_websites
--
-- Langkah aman:
--   1. Backup:   mysqldump -u root --single-transaction --routines --triggers db_garudanexabahtera > backups/db_<tanggal>_pre-005.sql
--   2. Cek file backup selesai: baris terakhirnya "-- Dump completed ..."
--   3. Jalankan: mysql -u root db_garudanexabahtera < database/migrations/2026-10-19_005_drop_monitoring_tables.sql
--   4. Setelah itu hapus bagian "DEPRECATED ... migrasi 005" dari database/schema.sql dan
--      tambahkan baris baseline 2026-10-19_005 di sana.
-- Rollback: restore backup dari langkah 1.
--
-- Idempoten (DROP TABLE IF EXISTS). Tabel anak dihapus lebih dulu; pemeriksaan foreign key
-- dimatikan sementara supaya urutan tidak gagal karena FK yang tidak tercatat di repo.
-- ############################################################################

SET NAMES utf8mb4;

SET @gn_fk_checks = @@foreign_key_checks;
SET foreign_key_checks = 0;

-- monitor_* (anak dulu)
DROP TABLE IF EXISTS monitor_website_logs;
DROP TABLE IF EXISTS monitor_ssl;
DROP TABLE IF EXISTS monitor_server_logs;
DROP TABLE IF EXISTS monitor_ai_logs;
DROP TABLE IF EXISTS monitor_ai_usage;
DROP TABLE IF EXISTS monitor_audit_logs;
DROP TABLE IF EXISTS monitor_error_center;
DROP TABLE IF EXISTS monitor_errors;
DROP TABLE IF EXISTS monitor_notifications;
DROP TABLE IF EXISTS monitor_pings;
DROP TABLE IF EXISTS monitor_websites;
DROP TABLE IF EXISTS monitor_servers;
DROP TABLE IF EXISTS monitor_ai_agents;

-- monitoring_* (anak dulu)
DROP TABLE IF EXISTS monitoring_website_checks;
DROP TABLE IF EXISTS monitoring_domains;
DROP TABLE IF EXISTS monitoring_api_logs;
DROP TABLE IF EXISTS monitoring_websites;
DROP TABLE IF EXISTS monitoring_api;
DROP TABLE IF EXISTS monitoring_categories;
DROP TABLE IF EXISTS monitoring_database;
DROP TABLE IF EXISTS monitoring_notifications;
DROP TABLE IF EXISTS monitoring_security_logs;
DROP TABLE IF EXISTS monitoring_server_metrics;
DROP TABLE IF EXISTS monitoring_server_status;
DROP TABLE IF EXISTS monitoring_settings;

SET foreign_key_checks = @gn_fk_checks;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version     VARCHAR(100) NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  applied_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-19_005', 'drop monitoring tables (monitor_*, monitoring_*): feature removed');

SELECT version, applied_at FROM schema_migrations ORDER BY version;
