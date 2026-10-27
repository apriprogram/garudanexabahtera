-- ============================================================================
-- Migration 2026-10-27_031 — site_visit_stats + site_visitors: statistik kunjungan situs pembeli
-- ============================================================================
-- Permintaan pemilik 2026-10-27 (docs/platform/SITE-STATS-SPEC.md): CMS /akun/situs/:id/statistik menampilkan
-- statistik kunjungan setiap situs pembeli (semua template, gratis) dalam bentuk grafik. Pencatatan tanpa cookie dan
-- tanpa menyimpan alamat IP; yang disimpan hanya angka agregat per hari.
--   site_visit_stats  angka per situs per hari (tanggal WIB) per metrik: total, page (path), hour ('00'..'23'),
--                     source (grup sumber), referrer (host atau 'utm:{utm_source}'), device (desktop|mobile|tablet),
--                     browser (nama). views = tampilan halaman, visits = kunjungan (halaman pertama satu sesi browser),
--                     visitors = pengunjung unik hari itu (hanya metrik total dan device).
--   site_visitors     penanda pengunjung unik per hari: 16 hex pertama sha256(AUTH_SECRET|site_id|day|ip|user_agent),
--                     bukan IP. Baris lebih dari 2 hari dihapus berkala oleh kode (±1 dari 50 permintaan).
-- Tidak ada foreign key, mengikuti tabel situs lain (site_*).
-- Aksi (backend/modules/site_stats.php = site_stats.js): site_visit (publik, dikirim CustomerSite di domain pembeli) dan
-- customer_get_site_stats (pembeli). Kode tanpa tabel ini tidak rusak: pencatatan dilewati, dasbor menjawab 503
-- STATS_NOT_READY.
--
-- Skema saja, aman dijalankan ulang (CREATE TABLE IF NOT EXISTS, INSERT IGNORE; tanpa ALTER, tanpa prosedur, tanpa
-- information_schema), jadi bisa diimpor lewat phpMyAdmin. Tidak bergantung pada migrasi lain selain tabel situs (004).
-- Jalankan SEBELUM deploy kode yang memakainya:
--   C:/xampp/mysql/bin/mysql.exe -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-27_031_site_stats.sql
-- ============================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS site_visit_stats (
  site_id   INT NOT NULL,                       -- template_sites.id
  day       DATE NOT NULL,                      -- tanggal Asia/Jakarta (WIB)
  metric    VARCHAR(10) NOT NULL,               -- 'total' | 'page' | 'hour' | 'source' | 'referrer' | 'device' | 'browser'
  dim       VARCHAR(191) NOT NULL DEFAULT '',   -- total: ''; page: path; hour: '00'..'23'; source: kunci grup;
                                                -- referrer: host atau 'utm:{utm_source}'; device: desktop|mobile|tablet; browser: nama
  views     INT UNSIGNED NOT NULL DEFAULT 0,    -- tampilan halaman
  visits    INT UNSIGNED NOT NULL DEFAULT 0,    -- kunjungan (halaman pertama satu sesi browser)
  visitors  INT UNSIGNED NOT NULL DEFAULT 0,    -- pengunjung unik hari itu (hanya metric total dan device)
  PRIMARY KEY (site_id, day, metric, dim),
  KEY idx_site_visit_metric (site_id, metric, day)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Penanda pengunjung unik per hari: hash, bukan IP. Baris > 2 hari dihapus berkala.
CREATE TABLE IF NOT EXISTS site_visitors (
  site_id  INT NOT NULL,
  day      DATE NOT NULL,
  visitor  CHAR(16) NOT NULL,                   -- 16 hex pertama sha256(AUTH_SECRET|site_id|day|ip|user_agent)
  PRIMARY KEY (site_id, day, visitor)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-27_031', 'site_visit_stats, site_visitors: statistik kunjungan situs pembeli (agregat harian, tanpa IP)');
