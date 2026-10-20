-- ============================================================================
-- Garuda Nexa Bahtera — minimal seed data for a FRESH database
-- ============================================================================
-- Run after database/schema.sql:
--   mysql -u root db_garudanexabahtera < database/seed.sql
-- Idempotent (INSERT IGNORE): re-running never overwrites existing values.
--
-- No admin account is seeded on purpose — a well-known default password in a
-- tracked file is a security hole. Create the first admin as described in
-- database/README.md ("Membuat akun admin pertama").
-- ============================================================================

SET NAMES utf8mb4;

-- Landing page defaults (everything else is edited from the admin panel).
INSERT IGNORE INTO hero_settings (setting_key, setting_value) VALUES
  ('hero_title',       'Leading With Vision, Moving With Purpose'),
  ('hero_subtitle',    'We don''t just build apps and websites. We build digital systems that help your business and institution grow faster, more efficiently, and more professionally.'),
  ('contact_email',    'info@garudanexa.com'),
  ('site_logo',        '/assets/logo/logogarudanexa.png'),
  ('hero_logos',       '[]'),
  ('hero_images',      '[]'),
  ('disabled_sections','[]');

-- Singleton row: the backend only ever UPDATEs this WHERE id = 1.
INSERT IGNORE INTO visitor_stats (id, total_visits) VALUES (1, 0);

-- (The monitoring singleton rows and categories were removed: the Monitoring Server feature
--  is gone and its tables are deprecated, see migration 2026-10-19_005.)
-- Example template catalog: database/seed.templates.sql (optional, prices are examples).
