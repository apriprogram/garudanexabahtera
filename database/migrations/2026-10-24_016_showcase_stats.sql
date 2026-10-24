-- ============================================================================
-- Migration 2026-10-24_016 — showcase_stats: likes and views for the project cards on the home page
-- ============================================================================
-- Owner request 2026-10-24: project cards (#projects) get a heart with the number of likes and an eye with the number of
-- views, like the template cards. A view is counted when a visitor opens a project's detail pop-up.
-- The cards come from two sources, so the counters live in their own table keyed by a string:
--   p-{id}            project_client row shown on the website (show_on_website = 1)
--   f-{title slug}    item of the fallback portfolio (setting portfolio_data, or the built-in default list)
-- Public actions get_showcase_stats / showcase_like / showcase_view (backend/modules/templates.php = templates.js) accept
-- only keys of projects that are actually on the website, rate limited per IP like template_like / template_view.
--
-- Schema only, safe to re-run (CREATE TABLE IF NOT EXISTS). No information_schema, so it can be imported through
-- phpMyAdmin as a whole or run statement by statement in the SQL tab.
--   C:/xampp/mysql/bin/mysql.exe -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-24_016_showcase_stats.sql
-- ============================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS showcase_stats (
  item_key    VARCHAR(120) NOT NULL,
  like_count  INT NOT NULL DEFAULT 0,
  view_count  INT NOT NULL DEFAULT 0,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (item_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-24_016', 'showcase_stats: likes and views for the home project cards');
