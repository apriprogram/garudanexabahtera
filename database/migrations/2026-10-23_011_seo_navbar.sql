-- ============================================================================
-- Migration 2026-10-23_011 — navbar_menus: real page links (SEO plan WP5)
-- ============================================================================
-- docs/platform/SEO-PLAN.md §5.5 step 5. The public navbar becomes
--
--   1 Template (/template) · 2 Jasa ▾ (Website custom, Aplikasi mobile) · 3 Harga (/harga) · 4 Panduan (/panduan)
--
-- with the "Konsultasi Gratis" button on the right (code, not a menu row). Home-page anchors (#projects, #process,
-- #faq) are no longer top-level links; they stay reachable from the home page itself.
-- The same structure is the frontend's built-in menu (src/components/layout/Navbar.tsx, DEFAULT_ITEMS), used when
-- navbar_menus is empty, so a fresh install needs nothing (baseline row in schema.sql).
--
-- Data only. Rules:
--   * Runs once: every statement is skipped when 2026-10-23_011 is already recorded in schema_migrations, so an admin
--     who later deletes or hides a row in Kelola navbar does not get it back on a re-run.
--   * Only for a navbar that already has top-level rows (an empty navbar keeps the built-in menu).
--   * Rows an admin customised are not clobbered: an existing row is changed only while it still has the exact
--     values migration 2026-10-19_004 / _003 gave it (label + url). New rows are added only when no top-level row
--     with that label_en exists. Nothing is deleted; replaced rows are only deactivated (is_active = 0).
-- Run after 2026-10-22_008 (and 009/010 if present; independent of them):
--   C:/xampp/mysql/bin/mysql.exe -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-23_011_seo_navbar.sql
-- ============================================================================

SET NAMES utf8mb4;

-- Snapshot the guards first: later statements change the rows the guards look at.
SET @gn011_pending = (SELECT COUNT(*) = 0 FROM schema_migrations WHERE version = '2026-10-23_011');
SET @gn011_has_menu = (SELECT COUNT(*) > 0 FROM navbar_menus WHERE parent_id IS NULL);
SET @gn011_run = @gn011_pending AND @gn011_has_menu;

-- 1. Template: the #templates anchor becomes the catalog page (label and order untouched)
UPDATE navbar_menus
   SET url = '/template'
 WHERE @gn011_run AND parent_id IS NULL AND label_id = 'Template' AND url IN ('#templates', '/#templates');

-- 2. Home anchors that were top-level links: deactivated while still at their 004 defaults
UPDATE navbar_menus
   SET is_active = 0
 WHERE @gn011_run AND parent_id IS NULL
   AND ((label_id = 'Projects' AND url IN ('#projects', '/#projects'))
     OR (label_id = 'Proses'   AND url IN ('#process', '/#process'))
     OR (label_id = 'FAQ'      AND url IN ('#faq', '/#faq')));

-- 3. Jasa ▾ with two sub-menus (inserted only if there is no top-level "Services" row yet)
INSERT INTO navbar_menus (parent_id, label_id, label_en, url, icon, description_id, description_en, sort_order, is_active)
SELECT NULL, 'Jasa', 'Services', '/jasa-pembuatan-website', 'Briefcase', NULL, NULL, 2, 1 FROM DUAL
 WHERE @gn011_run
   AND NOT EXISTS (SELECT 1 FROM navbar_menus WHERE parent_id IS NULL AND label_en = 'Services');

SET @gn011_jasa = (SELECT id FROM navbar_menus WHERE parent_id IS NULL AND label_en = 'Services' ORDER BY id LIMIT 1);

INSERT INTO navbar_menus (parent_id, label_id, label_en, url, icon, description_id, description_en, sort_order, is_active)
SELECT @gn011_jasa, 'Website custom', 'Custom website', '/jasa-pembuatan-website', 'Monitor',
       'Company profile, sekolah, instansi, dan sistem web', 'Company profile, school, institution and web systems', 1, 1 FROM DUAL
 WHERE @gn011_run AND @gn011_jasa IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM navbar_menus WHERE parent_id = @gn011_jasa AND url = '/jasa-pembuatan-website');

INSERT INTO navbar_menus (parent_id, label_id, label_en, url, icon, description_id, description_en, sort_order, is_active)
SELECT @gn011_jasa, 'Aplikasi mobile', 'Mobile app', '/jasa-pembuatan-aplikasi-mobile', 'Smartphone',
       'Aplikasi Android & iOS sesuai alur bisnis', 'Android & iOS apps built around your business flow', 2, 1 FROM DUAL
 WHERE @gn011_run AND @gn011_jasa IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM navbar_menus WHERE parent_id = @gn011_jasa AND url = '/jasa-pembuatan-aplikasi-mobile');

-- 4. Harga: reuse the old #pricing row (inactive since 004) while it is unchanged, otherwise add a row
UPDATE navbar_menus
   SET url = '/harga', sort_order = 3, is_active = 1
 WHERE @gn011_run AND parent_id IS NULL AND label_id = 'Harga' AND url IN ('#pricing', '/#pricing');

INSERT INTO navbar_menus (parent_id, label_id, label_en, url, icon, description_id, description_en, sort_order, is_active)
SELECT NULL, 'Harga', 'Pricing', '/harga', 'Globe', NULL, NULL, 3, 1 FROM DUAL
 WHERE @gn011_run
   AND NOT EXISTS (SELECT 1 FROM navbar_menus WHERE parent_id IS NULL AND label_en = 'Pricing');

-- 5. Panduan
INSERT INTO navbar_menus (parent_id, label_id, label_en, url, icon, description_id, description_en, sort_order, is_active)
SELECT NULL, 'Panduan', 'Guides', '/panduan', 'BookOpen', NULL, NULL, 4, 1 FROM DUAL
 WHERE @gn011_run
   AND NOT EXISTS (SELECT 1 FROM navbar_menus WHERE parent_id IS NULL AND label_en = 'Guides');

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-23_011', 'navbar_menus: Template /template, Jasa (website, aplikasi mobile), Harga /harga, Panduan /panduan');

SELECT id, parent_id, label_id, url, sort_order, is_active FROM navbar_menus
 ORDER BY parent_id IS NOT NULL, parent_id, sort_order, id;
