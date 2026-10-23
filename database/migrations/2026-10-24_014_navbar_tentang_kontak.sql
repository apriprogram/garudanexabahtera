-- ============================================================================
-- Migration 2026-10-24_014 — navbar_menus: "Tentang" and "Kontak" page links
-- ============================================================================
-- Owner request 2026-10-24: the About page (/tentang, rebuilt with company profile, directors, contact and map) and the
-- contact page (/kontak) get their own top-level navbar links after Panduan:
--
--   1 Template · 2 Jasa ▾ · 3 Harga · 4 Panduan · 5 Tentang (/tentang) · 6 Kontak (/kontak)
--
-- The same structure is the frontend's built-in menu (src/components/layout/Navbar.tsx, DEFAULT_ITEMS), used when
-- navbar_menus is empty, so a fresh install needs nothing (baseline row in schema.sql).
--
-- Data only. Rules (same as 2026-10-23_011):
--   * Runs once: every statement is skipped when 2026-10-24_014 is already recorded in schema_migrations, so an admin
--     who later deletes or hides a row in Kelola navbar does not get it back on a re-run.
--   * Only for a navbar that already has top-level rows (an empty navbar keeps the built-in menu).
--   * A row is added only when no top-level row with that label_en exists. Nothing is changed or deleted.
-- No information_schema: it can also be imported through phpMyAdmin.
--   C:/xampp/mysql/bin/mysql.exe -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-24_014_navbar_tentang_kontak.sql
-- ============================================================================

SET NAMES utf8mb4;

SET @gn014_pending = (SELECT COUNT(*) = 0 FROM schema_migrations WHERE version = '2026-10-24_014');
SET @gn014_has_menu = (SELECT COUNT(*) > 0 FROM navbar_menus WHERE parent_id IS NULL);
SET @gn014_run = @gn014_pending AND @gn014_has_menu;

-- 5. Tentang
INSERT INTO navbar_menus (parent_id, label_id, label_en, url, icon, description_id, description_en, sort_order, is_active)
SELECT NULL, 'Tentang', 'About', '/tentang', 'Info', NULL, NULL, 5, 1 FROM DUAL
 WHERE @gn014_run
   AND NOT EXISTS (SELECT 1 FROM navbar_menus WHERE parent_id IS NULL AND label_en = 'About');

-- 6. Kontak
INSERT INTO navbar_menus (parent_id, label_id, label_en, url, icon, description_id, description_en, sort_order, is_active)
SELECT NULL, 'Kontak', 'Contact', '/kontak', 'MessageSquare', NULL, NULL, 6, 1 FROM DUAL
 WHERE @gn014_run
   AND NOT EXISTS (SELECT 1 FROM navbar_menus WHERE parent_id IS NULL AND label_en = 'Contact');

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-24_014', 'navbar_menus: Tentang /tentang, Kontak /kontak');

SELECT id, parent_id, label_id, url, sort_order, is_active FROM navbar_menus
 ORDER BY parent_id IS NOT NULL, parent_id, sort_order, id;
