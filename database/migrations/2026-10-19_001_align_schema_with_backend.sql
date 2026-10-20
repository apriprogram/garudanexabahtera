-- ============================================================================
-- Migration 2026-10-19_001 — align schema with backend queries + data cleanup
-- ============================================================================
-- Target  : an EXISTING db_garudanexabahtera (local XAMPP MariaDB 10.4 or
--           production MySQL 8.0). Fresh installs use database/schema.sql.
-- Safe to re-run: every step checks information_schema first.
-- No DROP, no DELETE. Back up before running (see database/README.md).
--
-- Run:  mysql -u root db_garudanexabahtera < database/migrations/2026-10-19_001_align_schema_with_backend.sql
--
-- What it does
--  1. monitor_websites      + category, status, last_checked, notes
--  2. monitor_website_logs  + error_message; status ENUM -> VARCHAR(20) ('unknown' allowed)
--  3. monitor_servers       + status, last_seen, notes; type ENUM -> VARCHAR(50) ('linux' allowed)
--  4. monitor_server_logs   + ram_used, ram_percent, disk_used, disk_percent, network_in, network_out;
--                           status ENUM -> VARCHAR(20)
--  5. monitor_ai_agents     + notes
--  6. monitor_ai_logs       + model, cost, error_count, prompt, response; agent_id nullable;
--                           cost backfilled from cost_estimate (kept, deprecated)
--  7. monitor_errors        + resolved_at, resolved_by; source ENUM -> VARCHAR(50)
--  8. list_products         + position (+ index)
--  9. documents.parent_id   BIGINT UNSIGNED -> INT (same type as documents.id) + index + FK (cascade)
-- 10. navbar_menus          index (parent_id, sort_order) + self FK (cascade)
-- 11. monitoring_api_logs   index (api_id, checked_at) + FK to monitoring_api (cascade)
-- 12. visitor_logs          index on visited_at (every dashboard query filters/groups by it)
-- 13. monitoring_server_metrics  byte columns DECIMAL(12,2) -> DECIMAL(20,2) (overflowed above ~9.3 GB)
-- 14. monitor_ai_usage, monitor_audit_logs, monitor_error_center: indexes for dashboard queries
-- 15. monitoring_settings.wa_phone: column default '' (existing row unchanged)
-- 16. singleton rows (visitor_stats, monitoring_settings/_server_status/_database id=1) ensured
-- 17. DATA: hero_settings.products_data, product "absensi": base64 image (16.7 KB) replaced by
--           '/assets/product/absensi.jpg' — only when the value is exactly the known image
--           (sha256 guard), so a different image is never overwritten.
-- FK steps are skipped with a NOTICE row when existing data would violate them (no rows are deleted).
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
DROP PROCEDURE IF EXISTS gn_add_index;
DROP PROCEDURE IF EXISTS gn_add_fk;
DROP PROCEDURE IF EXISTS gn_modify_unless_type;
DROP PROCEDURE IF EXISTS gn_make_not_null;
DROP PROCEDURE IF EXISTS gn_migrate_2026_10_19_001;

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

-- ADD INDEX/UNIQUE only if no index with that name exists. def = "INDEX name (cols)" / "UNIQUE KEY name (cols)"
CREATE PROCEDURE gn_add_index(IN tbl VARCHAR(64), IN idx VARCHAR(64), IN def TEXT)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.statistics
                 WHERE table_schema = DATABASE() AND table_name = tbl AND index_name = idx) THEN
    CALL gn_exec(CONCAT('ALTER TABLE `', tbl, '` ADD ', def));
  END IF;
END$$

-- ADD FOREIGN KEY only if missing. def = "FOREIGN KEY (col) REFERENCES t (id) ON DELETE …"
CREATE PROCEDURE gn_add_fk(IN tbl VARCHAR(64), IN fk VARCHAR(64), IN def TEXT)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_schema = DATABASE() AND table_name = tbl
                   AND constraint_name = fk AND constraint_type = 'FOREIGN KEY') THEN
    CALL gn_exec(CONCAT('ALTER TABLE `', tbl, '` ADD CONSTRAINT `', fk, '` ', def));
  END IF;
END$$

-- MODIFY COLUMN unless its COLUMN_TYPE already equals want_type (compared without display width).
CREATE PROCEDURE gn_modify_unless_type(IN tbl VARCHAR(64), IN col VARCHAR(64), IN want_type VARCHAR(64), IN def TEXT)
BEGIN
  DECLARE cur VARCHAR(255) DEFAULT NULL;
  SELECT LOWER(column_type) INTO cur FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = tbl AND column_name = col;
  IF cur IS NOT NULL AND cur <> LOWER(want_type) THEN
    CALL gn_exec(CONCAT('ALTER TABLE `', tbl, '` MODIFY COLUMN `', col, '` ', def));
  END IF;
END$$

-- Turn a nullable column into NOT NULL: fills NULLs with fill_value first (strict mode
-- rejects the ALTER otherwise). def = full new definition incl. NOT NULL.
CREATE PROCEDURE gn_make_not_null(IN tbl VARCHAR(64), IN col VARCHAR(64), IN fill_value VARCHAR(255), IN def TEXT)
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = DATABASE() AND table_name = tbl
               AND column_name = col AND is_nullable = 'YES') THEN
    CALL gn_exec(CONCAT('UPDATE `', tbl, '` SET `', col, '` = ', QUOTE(fill_value), ' WHERE `', col, '` IS NULL'));
    CALL gn_exec(CONCAT('ALTER TABLE `', tbl, '` MODIFY COLUMN `', col, '` ', def));
  END IF;
END$$

CREATE PROCEDURE gn_migrate_2026_10_19_001()
BEGIN
  DECLARE n INT DEFAULT 0;
  DECLARE p VARCHAR(64) DEFAULT NULL;

  -- 1. monitor_websites -------------------------------------------------------
  CALL gn_add_column('monitor_websites', 'category',     "VARCHAR(100) DEFAULT 'Umum' AFTER url");
  CALL gn_add_column('monitor_websites', 'status',       "VARCHAR(20) NOT NULL DEFAULT 'unknown' AFTER check_interval");
  CALL gn_add_column('monitor_websites', 'last_checked', "DATETIME DEFAULT NULL AFTER status");
  CALL gn_add_column('monitor_websites', 'notes',        "TEXT DEFAULT NULL AFTER last_checked");

  -- 2. monitor_website_logs ---------------------------------------------------
  CALL gn_add_column('monitor_website_logs', 'error_message', "TEXT DEFAULT NULL AFTER http_status");
  CALL gn_modify_unless_type('monitor_website_logs', 'status', 'varchar(20)', "VARCHAR(20) DEFAULT 'unknown'");
  CALL gn_make_not_null('monitor_website_logs', 'status', 'unknown', "VARCHAR(20) NOT NULL DEFAULT 'unknown'");

  -- 3. monitor_servers --------------------------------------------------------
  CALL gn_modify_unless_type('monitor_servers', 'type', 'varchar(50)', "VARCHAR(50) DEFAULT 'vps'");
  CALL gn_add_column('monitor_servers', 'status',    "VARCHAR(20) NOT NULL DEFAULT 'unknown' AFTER type");
  CALL gn_add_column('monitor_servers', 'last_seen', "DATETIME DEFAULT NULL AFTER status");
  CALL gn_add_column('monitor_servers', 'notes',     "TEXT DEFAULT NULL AFTER last_seen");

  -- 4. monitor_server_logs ----------------------------------------------------
  CALL gn_add_column('monitor_server_logs', 'ram_used',     "DECIMAL(20,2) DEFAULT 0.00 AFTER ram_usage");
  CALL gn_add_column('monitor_server_logs', 'ram_percent',  "DECIMAL(5,2) DEFAULT 0.00 AFTER ram_total");
  CALL gn_add_column('monitor_server_logs', 'disk_used',    "DECIMAL(20,2) DEFAULT 0.00 AFTER disk_usage");
  CALL gn_add_column('monitor_server_logs', 'disk_percent', "DECIMAL(5,2) DEFAULT 0.00 AFTER disk_total");
  CALL gn_add_column('monitor_server_logs', 'network_in',   "DECIMAL(20,2) DEFAULT 0.00 AFTER disk_percent");
  CALL gn_add_column('monitor_server_logs', 'network_out',  "DECIMAL(20,2) DEFAULT 0.00 AFTER network_in");
  CALL gn_modify_unless_type('monitor_server_logs', 'status', 'varchar(20)', "VARCHAR(20) DEFAULT 'unknown'");
  CALL gn_make_not_null('monitor_server_logs', 'status', 'unknown', "VARCHAR(20) NOT NULL DEFAULT 'unknown'");

  -- 5. monitor_ai_agents ------------------------------------------------------
  CALL gn_add_column('monitor_ai_agents', 'notes', "TEXT DEFAULT NULL AFTER model");

  -- 6. monitor_ai_logs --------------------------------------------------------
  CALL gn_add_column('monitor_ai_logs', 'model',       "VARCHAR(255) DEFAULT NULL AFTER agent_id");
  CALL gn_add_column('monitor_ai_logs', 'cost',        "DECIMAL(10,6) DEFAULT 0.000000 AFTER response_time_ms");
  CALL gn_add_column('monitor_ai_logs', 'error_count', "INT DEFAULT 0 AFTER cost_estimate");
  CALL gn_add_column('monitor_ai_logs', 'prompt',      "MEDIUMTEXT DEFAULT NULL AFTER error_message");
  CALL gn_add_column('monitor_ai_logs', 'response',    "MEDIUMTEXT DEFAULT NULL AFTER prompt");
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = DATABASE() AND table_name = 'monitor_ai_logs'
               AND column_name = 'agent_id' AND is_nullable = 'NO') THEN
    -- same type, only NOT NULL -> NULL; FK checks off so MySQL 8 accepts the change on an FK column
    SET @gn_fk = @@foreign_key_checks;
    SET foreign_key_checks = 0;
    CALL gn_exec('ALTER TABLE `monitor_ai_logs` MODIFY COLUMN `agent_id` INT DEFAULT NULL');
    SET foreign_key_checks = @gn_fk;
  END IF;
  UPDATE monitor_ai_logs SET cost = cost_estimate WHERE cost = 0 AND cost_estimate <> 0;

  -- 7. monitor_errors ---------------------------------------------------------
  CALL gn_modify_unless_type('monitor_errors', 'source', 'varchar(50)', "VARCHAR(50) NOT NULL");
  CALL gn_add_column('monitor_errors', 'resolved_at', "DATETIME DEFAULT NULL AFTER is_resolved");
  CALL gn_add_column('monitor_errors', 'resolved_by', "VARCHAR(100) DEFAULT NULL AFTER resolved_at");

  -- 8. list_products ----------------------------------------------------------
  CALL gn_add_column('list_products', 'position', "INT NOT NULL DEFAULT 0 AFTER notes");
  CALL gn_add_index('list_products', 'idx_position', 'INDEX idx_position (position)');

  -- 9. documents tree ---------------------------------------------------------
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = DATABASE() AND table_name = 'documents'
               AND column_name = 'parent_id' AND data_type <> 'int') THEN
    SELECT COUNT(*) INTO n FROM documents WHERE parent_id > 2147483647;
    IF n = 0 THEN
      CALL gn_exec('ALTER TABLE `documents` MODIFY COLUMN `parent_id` INT DEFAULT NULL');
    ELSE
      SELECT CONCAT('NOTICE: documents.parent_id not converted, ', n, ' value(s) exceed INT') AS gn_notice;
    END IF;
  END IF;
  CALL gn_add_index('documents', 'idx_documents_parent', 'INDEX idx_documents_parent (parent_id)');
  SELECT COUNT(*) INTO n FROM documents d
   WHERE d.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM documents p WHERE p.id = d.parent_id);
  IF n = 0 THEN
    CALL gn_add_fk('documents', 'fk_documents_parent',
      'FOREIGN KEY (parent_id) REFERENCES documents (id) ON DELETE CASCADE');
  ELSE
    SELECT CONCAT('NOTICE: fk_documents_parent skipped, ', n, ' orphan document(s)') AS gn_notice;
  END IF;

  -- 10. navbar_menus ----------------------------------------------------------
  CALL gn_add_index('navbar_menus', 'idx_navbar_parent_sort', 'INDEX idx_navbar_parent_sort (parent_id, sort_order)');
  SELECT COUNT(*) INTO n FROM navbar_menus m
   WHERE m.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM navbar_menus p WHERE p.id = m.parent_id);
  IF n = 0 THEN
    CALL gn_add_fk('navbar_menus', 'fk_navbar_parent',
      'FOREIGN KEY (parent_id) REFERENCES navbar_menus (id) ON DELETE CASCADE');
  ELSE
    SELECT CONCAT('NOTICE: fk_navbar_parent skipped, ', n, ' orphan menu(s)') AS gn_notice;
  END IF;

  -- 11. monitoring_api_logs ---------------------------------------------------
  CALL gn_add_index('monitoring_api_logs', 'idx_api_logs_checked', 'INDEX idx_api_logs_checked (api_id, checked_at)');
  SELECT COUNT(*) INTO n FROM monitoring_api_logs l
   WHERE NOT EXISTS (SELECT 1 FROM monitoring_api a WHERE a.id = l.api_id);
  IF n = 0 THEN
    CALL gn_add_fk('monitoring_api_logs', 'fk_monitoring_api_logs_api',
      'FOREIGN KEY (api_id) REFERENCES monitoring_api (id) ON DELETE CASCADE');
  ELSE
    SELECT CONCAT('NOTICE: fk_monitoring_api_logs_api skipped, ', n, ' orphan log(s)') AS gn_notice;
  END IF;

  -- 12. visitor_logs ----------------------------------------------------------
  CALL gn_add_index('visitor_logs', 'idx_visitor_visited_at', 'INDEX idx_visitor_visited_at (visited_at)');

  -- 13. monitoring_server_metrics ---------------------------------------------
  CALL gn_modify_unless_type('monitoring_server_metrics', 'ram_used',    'decimal(20,2)', 'DECIMAL(20,2) DEFAULT 0.00');
  CALL gn_modify_unless_type('monitoring_server_metrics', 'ram_total',   'decimal(20,2)', 'DECIMAL(20,2) DEFAULT 0.00');
  CALL gn_modify_unless_type('monitoring_server_metrics', 'disk_used',   'decimal(20,2)', 'DECIMAL(20,2) DEFAULT 0.00');
  CALL gn_modify_unless_type('monitoring_server_metrics', 'disk_total',  'decimal(20,2)', 'DECIMAL(20,2) DEFAULT 0.00');
  CALL gn_modify_unless_type('monitoring_server_metrics', 'network_in',  'decimal(20,2)', 'DECIMAL(20,2) DEFAULT 0.00');
  CALL gn_modify_unless_type('monitoring_server_metrics', 'network_out', 'decimal(20,2)', 'DECIMAL(20,2) DEFAULT 0.00');

  -- 14. dashboard indexes -----------------------------------------------------
  CALL gn_add_index('monitor_ai_usage', 'idx_ai_usage_created', 'INDEX idx_ai_usage_created (created_at)');
  CALL gn_add_index('monitor_ai_usage', 'idx_ai_usage_website', 'INDEX idx_ai_usage_website (website_id)');
  CALL gn_add_index('monitor_audit_logs', 'idx_audit_created', 'INDEX idx_audit_created (created_at)');
  CALL gn_add_index('monitor_error_center', 'idx_error_center_resolved',
                    'INDEX idx_error_center_resolved (is_resolved, created_at)');

  -- 15. monitoring_settings ---------------------------------------------------
  CALL gn_exec("ALTER TABLE `monitoring_settings` ALTER COLUMN `wa_phone` SET DEFAULT ''");

  -- 16. singleton rows the backend UPDATEs WHERE id = 1 -----------------------
  INSERT IGNORE INTO visitor_stats (id, total_visits) VALUES (1, 0);
  INSERT IGNORE INTO monitoring_settings (id) VALUES (1);
  INSERT IGNORE INTO monitoring_server_status (id) VALUES (1);
  INSERT IGNORE INTO monitoring_database (id) VALUES (1);

  -- 17. products_data: absensi image base64 -> file path ----------------------
  SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(setting_value, 'one', 'absensi', NULL, '$[*].id')), '.id', '.image')
    INTO p
    FROM hero_settings
   WHERE setting_key = 'products_data' AND JSON_VALID(setting_value);
  IF p IS NOT NULL THEN
    UPDATE hero_settings
       SET setting_value = JSON_SET(setting_value, p, '/assets/product/absensi.jpg')
     WHERE setting_key = 'products_data'
       AND SHA2(JSON_UNQUOTE(JSON_EXTRACT(setting_value, p)), 256)
           = '89b3d783766fd7ac6c76c49dd212cc427a3c0b6f2d78586e61f5e17673e2b3cb';
    IF ROW_COUNT() = 0 AND EXISTS (
         SELECT 1 FROM hero_settings
          WHERE setting_key = 'products_data'
            AND JSON_UNQUOTE(JSON_EXTRACT(setting_value, p)) LIKE 'data:%') THEN
      SELECT 'NOTICE: products_data absensi image is base64 but not the known image; left unchanged' AS gn_notice;
    END IF;
  END IF;

  INSERT IGNORE INTO schema_migrations (version, description)
  VALUES ('2026-10-19_001', 'align schema with backend queries; absensi image to file');
END$$

DELIMITER ;

CALL gn_migrate_2026_10_19_001();

DROP PROCEDURE IF EXISTS gn_migrate_2026_10_19_001;
DROP PROCEDURE IF EXISTS gn_modify_unless_type;
DROP PROCEDURE IF EXISTS gn_make_not_null;
DROP PROCEDURE IF EXISTS gn_add_fk;
DROP PROCEDURE IF EXISTS gn_add_index;
DROP PROCEDURE IF EXISTS gn_add_column;
DROP PROCEDURE IF EXISTS gn_exec;

SELECT version, applied_at FROM schema_migrations ORDER BY version;
