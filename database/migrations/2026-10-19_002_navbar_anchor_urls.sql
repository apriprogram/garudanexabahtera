-- ============================================================================
-- Migration 2026-10-19_002 — navbar_menus: dead route URLs -> landing page anchors
-- ============================================================================
-- The original navbar seed points to routes the SPA does not have (/web, /pos,
-- /about, /careers, …, #company). React Router sends them to the "*" route, which
-- renders the login page. This repoints them to sections that exist on the
-- landing page, using the same mapping as the menu in
-- src/components/layout/Navbar.tsx.
--
-- Data only, no schema change. Each UPDATE matches the OLD url value, so rows an
-- admin has already edited are left alone, and re-running is a no-op.
-- Run after 2026-10-19_001:
--   mysql -u root db_garudanexabahtera < database/migrations/2026-10-19_002_navbar_anchor_urls.sql
--
--   /web /pos /ischool /attendance /isantri /enterprise  -> #products
--   #company (parent "Perusahaan"), /about               -> #process
--   /contact, /partner, /careers                         -> #kontak
-- "Karir" has no section of its own; it now points to the contact block. Hide it
-- in admin > Navbar Manager (is_active = 0) if a careers link is not wanted.
-- ============================================================================

SET NAMES utf8mb4;

UPDATE navbar_menus SET url = '#products'
 WHERE url IN ('/web', '/pos', '/ischool', '/attendance', '/isantri', '/enterprise');

UPDATE navbar_menus SET url = '#process'
 WHERE url IN ('#company', '/about');

UPDATE navbar_menus SET url = '#kontak'
 WHERE url IN ('/contact', '/partner', '/careers');

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-19_002', 'navbar_menus: dead route URLs to landing page anchors');

SELECT id, parent_id, label_id, url, is_active FROM navbar_menus ORDER BY parent_id IS NOT NULL, parent_id, sort_order;
