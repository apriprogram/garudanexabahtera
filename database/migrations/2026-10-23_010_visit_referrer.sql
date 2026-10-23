-- ============================================================================
-- Migration 2026-10-23_010 — visitor_logs: visit source (SEO plan WP9)
-- ============================================================================
-- docs/platform/SEO-PLAN.md §5.9 step 2. track_visit (backend/modules/visits.php + visits.js) stores where a session
-- came from, once per session, without full referrer URLs or query strings:
--   referrer_host  host of document.referrer only ("chatgpt.com", "google.co.id"; no "www.", path or query)
--   landing_path   path of the first page of the session ("/template/aura-studio"; no query string)
--   utm_source     utm_source of that page only ("chatgpt.com")
-- The admin dashboard (Analitik pengunjung → Sumber kunjungan) groups the last 30 days as chatgpt.com,
-- perplexity.ai, gemini.google.com, copilot.microsoft.com, bing.com, google.*, lainnya and langsung. Rows from
-- before this migration have NULL in all three columns and are left out of that readout.
--
-- Schema only, three nullable columns, no data change. Safe to re-run: each column is added only when
-- information_schema does not list it yet (MySQL 8 has no ADD COLUMN IF NOT EXISTS, so the MariaDB-only syntax is
-- not used; same helper as migrations 001/004/006).
-- The code also works without these columns (it then logs visits without a source and the readout stays empty),
-- but run this BEFORE or right after deploying it:
--   C:/xampp/mysql/bin/mysql.exe -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-23_010_visit_referrer.sql
--
-- Visits per source per month (the plan's acceptance query):
--   SELECT DATE_FORMAT(visited_at, '%Y-%m') AS bulan,
--          COALESCE(referrer_host, CONCAT('utm:', utm_source), '(langsung)') AS sumber,
--          COUNT(*) AS kunjungan
--     FROM visitor_logs
--    WHERE landing_path IS NOT NULL
--    GROUP BY bulan, sumber
--    ORDER BY bulan DESC, kunjungan DESC;
-- ============================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version     VARCHAR(100) NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  applied_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CALL gn_add_column('visitor_logs', 'referrer_host', "VARCHAR(255) DEFAULT NULL AFTER country");
CALL gn_add_column('visitor_logs', 'landing_path', "VARCHAR(255) DEFAULT NULL AFTER referrer_host");
CALL gn_add_column('visitor_logs', 'utm_source', "VARCHAR(100) DEFAULT NULL AFTER landing_path");

DROP PROCEDURE IF EXISTS gn_add_column;
DROP PROCEDURE IF EXISTS gn_exec;

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-23_010', 'visitor_logs: referrer_host, landing_path, utm_source (visit source, SEO WP9)');

SELECT column_name, column_type, is_nullable FROM information_schema.columns
 WHERE table_schema = DATABASE() AND table_name = 'visitor_logs'
   AND column_name IN ('referrer_host', 'landing_path', 'utm_source')
 ORDER BY ordinal_position;
