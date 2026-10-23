-- ============================================================================
-- Migration 2026-10-24_013 — templates: like and view counters for the catalog cards
-- ============================================================================
-- Owner request 2026-10-23 (Dribbble-style template cards): a heart with the number of likes and an eye with the number
-- of views on every template card.
--   like_count  +1 / -1 through the public action template_like (the visitor's own like state lives in the browser)
--   view_count  +1 through template_view when a visitor opens a template from a card (once per browser session)
-- Both actions are POST only and rate limited per IP (PF_LIKES_PER_HOUR / PF_VIEWS_PER_HOUR in templates.php, the
-- same limits in templates.js). get_templates / get_template return the counts.
--
-- Schema only, two columns with default 0, no data change. Safe to re-run (information_schema check, same helper as
-- migrations 010 and 012). Run BEFORE deploying the code that reads them:
--   C:/xampp/mysql/bin/mysql.exe -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-24_013_template_likes_views.sql
-- phpMyAdmin note: its import switches to information_schema for files that mention it; in production run the two
-- ALTER TABLE ... ADD COLUMN statements and the schema_migrations INSERT through the SQL tab instead.
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

CALL gn_add_column('templates', 'like_count', "INT NOT NULL DEFAULT 0 AFTER sort_order");
CALL gn_add_column('templates', 'view_count', "INT NOT NULL DEFAULT 0 AFTER like_count");

DROP PROCEDURE IF EXISTS gn_add_column;
DROP PROCEDURE IF EXISTS gn_exec;

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-24_013', 'templates: like_count, view_count (catalog card likes and views)');

SELECT column_name, column_type, column_default FROM information_schema.columns
 WHERE table_schema = DATABASE() AND table_name = 'templates' AND column_name IN ('like_count', 'view_count')
 ORDER BY ordinal_position;
