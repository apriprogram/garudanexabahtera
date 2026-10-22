-- ============================================================================
-- Migration 2026-10-22_007 — templates: real screenshot previews (WebP) instead of the SVG mockups
-- ============================================================================
-- Corporate Nexa and Startup Clean were redesigned (docs/platform/TEMPLATE-DESIGN.md). The catalog card,
-- the detail gallery (/template/:slug), the order page and the hero showcase on the home page all read
-- templates.preview_image + templates.gallery, which still point to the illustrated SVG mockups from the seed.
-- This repoints them to real screenshots of the new demos (1600x1000 WebP, 55–110 KB each):
--   /assets/templates/<code>-preview.webp   desktop hero in a browser frame + phone view
--   /assets/templates/<code>-1.webp, -2.webp  two desktop sections
-- The files ship with the frontend build (public/assets/templates/). The old SVG files stay in place: code
-- fallbacks still reference /assets/templates/<code>-preview.svg.
--
-- Data only, no schema change. Each UPDATE matches the OLD seed value exactly, so a template whose images an
-- admin already changed (Pesanan Template > Kelola Template) is left alone, and re-running is a no-op.
-- Run (BACKUP first, see database/README.md):
--   mysql -u root db_garudanexabahtera < database/migrations/2026-10-22_007_template_previews.sql
-- ============================================================================

SET NAMES utf8mb4;

UPDATE templates SET preview_image = '/assets/templates/corporate-nexa-preview.webp'
 WHERE template_code = 'corporate-nexa' AND preview_image = '/assets/templates/corporate-nexa-preview.svg';

UPDATE templates SET gallery = '["/assets/templates/corporate-nexa-1.webp","/assets/templates/corporate-nexa-2.webp"]'
 WHERE template_code = 'corporate-nexa'
   AND REPLACE(gallery, ' ', '') = '["/assets/templates/corporate-nexa-1.svg","/assets/templates/corporate-nexa-2.svg"]';

UPDATE templates SET preview_image = '/assets/templates/startup-clean-preview.webp'
 WHERE template_code = 'startup-clean' AND preview_image = '/assets/templates/startup-clean-preview.svg';

UPDATE templates SET gallery = '["/assets/templates/startup-clean-1.webp","/assets/templates/startup-clean-2.webp"]'
 WHERE template_code = 'startup-clean'
   AND REPLACE(gallery, ' ', '') = '["/assets/templates/startup-clean-1.svg","/assets/templates/startup-clean-2.svg"]';

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-22_007', 'templates: real screenshot previews (.webp) instead of SVG mockups');

SELECT id, slug, template_code, preview_image, gallery FROM templates ORDER BY sort_order, id;
