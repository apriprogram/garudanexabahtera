-- ============================================================================
-- Migration 2026-10-24_015 — navbar_menus: hide the "Kontak" top-level link again
-- ============================================================================
-- Owner request 2026-10-24 (same day as 014): the navbar keeps Tentang but not Kontak. /kontak stays reachable from the
-- footer, the About page and the CTA. The built-in menu (Navbar.tsx DEFAULT_ITEMS) no longer has Kontak either.
--
-- Data only, runs once (skipped when 2026-10-24_015 is recorded). The row is only deactivated (is_active = 0), never
-- deleted, and only while it still has the exact values migration 014 gave it, so a Kontak link an admin set up
-- differently in Kelola navbar is left alone. No information_schema; each statement also works on its own in the
-- phpMyAdmin SQL tab (that route does not run multi-statement batches).
--   C:/xampp/mysql/bin/mysql.exe -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-24_015_navbar_hide_kontak.sql
-- ============================================================================

SET NAMES utf8mb4;

UPDATE navbar_menus
   SET is_active = 0
 WHERE parent_id IS NULL AND label_id = 'Kontak' AND label_en = 'Contact' AND url = '/kontak' AND is_active = 1
   AND NOT EXISTS (SELECT 1 FROM (SELECT version FROM schema_migrations WHERE version = '2026-10-24_015') AS done);

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-24_015', 'navbar_menus: Kontak top-level link hidden (is_active = 0)');

SELECT id, parent_id, label_id, url, sort_order, is_active FROM navbar_menus
 WHERE parent_id IS NULL ORDER BY sort_order, id;
