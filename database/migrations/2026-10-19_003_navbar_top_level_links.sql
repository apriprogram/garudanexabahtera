-- ============================================================================
-- Migration 2026-10-19_003 — navbar_menus: add top-level Harga / Proses / FAQ
-- ============================================================================
-- The public navbar now reads navbar_menus (get_navbar_menus). The DB menu only
-- had Produk, Portofolio and Perusahaan, while the built-in menu also linked to
-- Pricing, Process and FAQ. This adds those three top-level links and moves
-- "Perusahaan" to the end:
--
--   1 Produk (#products) · 2 Portofolio (#portfolio) · 3 Harga (#pricing)
--   4 Proses (#process)  · 5 FAQ (#faq)              · 6 Perusahaan (dropdown)
--
-- Harga stays hidden on the site while "pricing" is in hero_settings.disabled_sections.
--
-- Data only. Idempotent: a link is inserted only if no top-level row with that
-- label exists yet, and only into a navbar that already has top-level rows (an
-- empty navbar keeps the frontend's built-in menu). "Perusahaan" is re-sorted only
-- while it still has its original sort_order 3, so an admin's reordering is kept.
-- Run after 2026-10-19_002:
--   mysql -u root db_garudanexabahtera < database/migrations/2026-10-19_003_navbar_top_level_links.sql
-- ============================================================================

SET NAMES utf8mb4;

INSERT INTO navbar_menus (parent_id, label_id, label_en, url, icon, sort_order, is_active)
SELECT NULL, 'Harga', 'Pricing', '#pricing', 'Globe', 3, 1 FROM DUAL
 WHERE EXISTS (SELECT 1 FROM navbar_menus WHERE parent_id IS NULL)
   AND NOT EXISTS (SELECT 1 FROM navbar_menus WHERE parent_id IS NULL AND label_en = 'Pricing');

INSERT INTO navbar_menus (parent_id, label_id, label_en, url, icon, sort_order, is_active)
SELECT NULL, 'Proses', 'Process', '#process', 'Globe', 4, 1 FROM DUAL
 WHERE EXISTS (SELECT 1 FROM navbar_menus WHERE parent_id IS NULL)
   AND NOT EXISTS (SELECT 1 FROM navbar_menus WHERE parent_id IS NULL AND label_en = 'Process');

INSERT INTO navbar_menus (parent_id, label_id, label_en, url, icon, sort_order, is_active)
SELECT NULL, 'FAQ', 'FAQ', '#faq', 'Globe', 5, 1 FROM DUAL
 WHERE EXISTS (SELECT 1 FROM navbar_menus WHERE parent_id IS NULL)
   AND NOT EXISTS (SELECT 1 FROM navbar_menus WHERE parent_id IS NULL AND label_en = 'FAQ');

UPDATE navbar_menus SET sort_order = 6
 WHERE parent_id IS NULL AND label_en = 'Company' AND sort_order = 3;

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-19_003', 'navbar_menus: top-level Harga, Proses, FAQ links');

SELECT id, label_id, url, sort_order, is_active FROM navbar_menus WHERE parent_id IS NULL ORDER BY sort_order;
