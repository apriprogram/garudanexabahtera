-- ============================================================================
-- Migration 2026-10-24_012 — template_orders: automatic 20% discount on an account's first template order
-- ============================================================================
-- Owner decision 2026-10-23: every account's first template order is 20% cheaper at payment, without a code, for
-- ready-made templates only (custom work is quoted). The server decides it when the order is created
-- (pf_first_order_quote in backend/modules/templates.php = firstOrderQuote in templates.js):
--   list_price       catalogue price at order time (before the discount)
--   discount_amount  rupiah taken off (0 = no discount)
--   discount_code    'PERTAMA20' when the first-order discount was applied, otherwise NULL
-- `price` stays the amount to pay (Midtrans gross_amount and the notification amount check use it), so revenue
-- totals keep using `price`. Orders from before this migration have list_price NULL = no discount.
--
-- Schema only, three nullable / defaulted columns, no data change. Safe to re-run: each column is added only when
-- information_schema does not list it yet (same helper as migration 010; MySQL 8 has no ADD COLUMN IF NOT EXISTS).
-- Run BEFORE deploying the code that writes these columns:
--   C:/xampp/mysql/bin/mysql.exe -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-24_012_first_order_discount.sql
-- phpMyAdmin note: its import switches to information_schema for files that mention it; in production run the three
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

CALL gn_add_column('template_orders', 'list_price', "DECIMAL(15,2) DEFAULT NULL AFTER price");
CALL gn_add_column('template_orders', 'discount_amount', "DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER list_price");
CALL gn_add_column('template_orders', 'discount_code', "VARCHAR(40) DEFAULT NULL AFTER discount_amount");

DROP PROCEDURE IF EXISTS gn_add_column;
DROP PROCEDURE IF EXISTS gn_exec;

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-24_012', 'template_orders: list_price, discount_amount, discount_code (20% first-order discount)');

SELECT column_name, column_type, is_nullable, column_default FROM information_schema.columns
 WHERE table_schema = DATABASE() AND table_name = 'template_orders'
   AND column_name IN ('price', 'list_price', 'discount_amount', 'discount_code')
 ORDER BY ordinal_position;
