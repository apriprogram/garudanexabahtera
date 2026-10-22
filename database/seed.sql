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
  -- Empty = the home page uses its built-in keyword headline (src/components/sections/hero/heroHeadline.ts).
  ('hero_title',       ''),
  ('hero_subtitle',    ''),
  ('cta_title',        'Konsultasi gratis untuk
website atau aplikasi Anda'),
  ('contact_email',    'info@garudanexa.com'),
  ('site_logo',        '/assets/logo/logogarudanexa.png'),
  ('hero_logos',       '[]'),
  ('hero_images',      '[]'),
  ('disabled_sections','[]');

-- Project documents defaults (same values as migration 2026-10-21_006, docs/platform/PROJECT-DOCS-SPEC.md §3).
-- NPWP, address, signatory and bank accounts stay empty on purpose: the admin fills them in
-- "Pengaturan dokumen"; never commit real legal data here.
INSERT IGNORE INTO hero_settings (setting_key, setting_value) VALUES
  ('pd_company', '{"name":"PT Garuda Nexa Bahtera","address":"","city":"","phone":"","email":"","website":"https://garudanexa.com","npwp":"","signatory_name":"","signatory_title":"Direktur","bank_accounts":[{"bank":"","number":"","holder":""}]}'),
  ('pd_numbering', '{"prefix":"GNB"}'),
  ('pd_tax', '{"ppn_enabled":false,"ppn_rate":12,"dpp_numerator":11,"dpp_denominator":12,"pph23_rate":2}'),
  ('pd_payment_terms', '[{"key":"dp","label":"Uang muka (DP)","percent":50,"trigger":"kontrak","due_days":7},{"key":"termin2","label":"Termin 2","percent":30,"trigger":"uji","due_days":7},{"key":"pelunasan","label":"Pelunasan","percent":20,"trigger":"serah_terima","due_days":7}]'),
  ('pd_sla_defaults', '{"support_hours":"Senin–Jumat 09.00–17.00 WIB","uptime":"99,5%","priorities":[{"level":"P1 – Kritis","response":"2 jam","resolution":"1 hari kerja"},{"level":"P2 – Tinggi","response":"4 jam","resolution":"2 hari kerja"},{"level":"P3 – Normal","response":"1 hari kerja","resolution":"5 hari kerja"}]}');

-- Singleton row: the backend only ever UPDATEs this WHERE id = 1.
INSERT IGNORE INTO visitor_stats (id, total_visits) VALUES (1, 0);

-- (The monitoring singleton rows and categories were removed: the Monitoring Server feature
--  is gone and its tables are deprecated, see migration 2026-10-19_005.)
-- Example template catalog: database/seed.templates.sql (optional, prices are examples).
