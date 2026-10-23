-- ============================================================================
-- Garuda Nexa Bahtera — CANONICAL DATABASE SCHEMA
-- ============================================================================
-- Single source of truth for the structure of `db_garudanexabahtera`.
-- Matches what backend/server.js (production) and backend/api.php (XAMPP)
-- actually query, after migrations up to 2026-10-21_006 are applied.
-- (2026-10-19_005 — drop the monitoring tables — is written but NOT approved yet;
--  the monitoring tables below are kept and marked DEPRECATED until it runs.)
--
-- Fresh install (runs against the database you select; no USE inside, so the
-- same file works for docker-entrypoint-initdb.d and a custom MYSQL_DB):
--   mysql -u root -e "CREATE DATABASE db_garudanexabahtera CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
--   mysql -u root db_garudanexabahtera < database/schema.sql
--   mysql -u root db_garudanexabahtera < database/seed.sql
-- Existing DB: do NOT run this file; apply database/migrations/*.sql in order.
--
-- Works on MySQL 8.0 (production, docker) and MariaDB 10.4+ (XAMPP).
-- All tables: InnoDB, utf8mb4 / utf8mb4_unicode_ci.
-- When changing the schema: add a new migration AND update this file.
-- ============================================================================

SET NAMES utf8mb4;

-- ----------------------------------------------------------------------------
-- Migration bookkeeping
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     VARCHAR(100) NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  applied_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- CORE: users, site content, clients, products
-- ============================================================================

-- All accounts. Passwords are bcrypt hashes (bcryptjs, cost 10).
-- role: admin / user = staff (admin panel), customer = template buyer (/akun, migration 004).
CREATE TABLE IF NOT EXISTS users (
  id         INT NOT NULL AUTO_INCREMENT,
  name       VARCHAR(255) NOT NULL,
  email      VARCHAR(255) NOT NULL,
  password   VARCHAR(255) NOT NULL,
  phone      VARCHAR(20) DEFAULT NULL,
  role       ENUM('admin','user','customer') DEFAULT 'user',
  status     ENUM('active','inactive') DEFAULT 'active',
  avatar     LONGTEXT DEFAULT NULL,           -- currently base64 data URI
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Key/value store for all landing-page content (hero, products_data, portfolio_data, footer…).
-- setting_key MUST stay UNIQUE: the backend writes with INSERT … ON DUPLICATE KEY UPDATE.
-- JSON values (products_data, portfolio_data, hero_images, …) must hold asset PATHS,
-- never base64 data URIs (they bloat every get_settings response).
CREATE TABLE IF NOT EXISTS hero_settings (
  id            INT NOT NULL AUTO_INCREMENT,
  setting_key   VARCHAR(100) NOT NULL,
  setting_value LONGTEXT DEFAULT NULL,
  updated_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY setting_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Client projects (admin > Project Clients). Rows with source = 'website' come from the public
-- custom-order form (submit_custom_order); show_on_website = 1 lists the project in the public
-- Projects section (get_public_projects returns only id, name, service_type, image, description).
-- client_id … payment_terms, updated_at: project documents workspace (migration 006,
-- docs/platform/PROJECT-DOCS-SPEC.md §3); the contract value is `price`.
CREATE TABLE IF NOT EXISTS project_client (
  id            INT NOT NULL AUTO_INCREMENT,
  name          VARCHAR(255) NOT NULL,
  client_name   VARCHAR(255) NOT NULL,
  client_email  VARCHAR(255) DEFAULT NULL,
  client_phone  VARCHAR(50) DEFAULT NULL,
  service_type  ENUM('website','mobile_app','ui_ux','other') DEFAULT 'website',
  status        ENUM('active','pending','completed','canceled') DEFAULT 'active',
  assigned_user VARCHAR(255) DEFAULT NULL,
  price         DECIMAL(15,2) DEFAULT NULL,
  start_date    DATE DEFAULT NULL,
  end_date      DATE DEFAULT NULL,
  image         LONGTEXT DEFAULT NULL,        -- asset path (older rows: base64)
  project_files LONGTEXT DEFAULT NULL,        -- JSON array of {name,type,size,url}
  description   TEXT DEFAULT NULL,
  show_on_website TINYINT(1) NOT NULL DEFAULT 0,
  source        ENUM('admin','website') NOT NULL DEFAULT 'admin',
  client_id     INT DEFAULT NULL,             -- pd_clients.id
  code          VARCHAR(32) DEFAULT NULL,     -- PRJ-YYYY-NNN, assigned when the workspace is first saved
  stage_override VARCHAR(20) DEFAULT NULL,    -- admin override of the derived stage
  use_mou       TINYINT(1) NOT NULL DEFAULT 0,
  has_maintenance TINYINT(1) NOT NULL DEFAULT 0,
  maintenance_fee DECIMAL(15,2) DEFAULT NULL,
  maintenance_period ENUM('bulanan','tahunan') DEFAULT NULL,
  maintenance_start DATE DEFAULT NULL,
  maintenance_end DATE DEFAULT NULL,
  scope_summary TEXT DEFAULT NULL,
  payment_terms LONGTEXT DEFAULT NULL,        -- JSON PaymentTerm[]
  created_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_project_client_code (code),
  KEY idx_project_client_client (client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Company products shown in admin > List Products.
CREATE TABLE IF NOT EXISTS list_products (
  id            INT NOT NULL AUTO_INCREMENT,
  title         VARCHAR(255) NOT NULL,
  description   TEXT DEFAULT NULL,
  link_button   VARCHAR(500) DEFAULT NULL,
  image         TEXT DEFAULT NULL,
  logo          TEXT DEFAULT NULL,
  created_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  users         TEXT DEFAULT NULL,            -- login accounts, AES-256-GCM "enc:v1:..." (backend/modules/list_products.js)
  project_files LONGTEXT DEFAULT NULL,        -- JSON array
  notes         TEXT DEFAULT NULL,
  position      INT NOT NULL DEFAULT 0,       -- display order (update_product_order)
  PRIMARY KEY (id),
  KEY idx_position (position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admin changelog.
CREATE TABLE IF NOT EXISTS changelogs (
  id          INT NOT NULL AUTO_INCREMENT,
  change_date DATE NOT NULL,
  time        TIME NOT NULL,
  title       VARCHAR(255) NOT NULL,
  description TEXT DEFAULT NULL,
  category    VARCHAR(50) DEFAULT 'fitur',
  created_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_date (change_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admin document manager (files + folders, self-referencing tree).
CREATE TABLE IF NOT EXISTS documents (
  id         INT NOT NULL AUTO_INCREMENT,
  name       VARCHAR(255) NOT NULL,
  type       ENUM('file','folder') NOT NULL,
  size       INT DEFAULT NULL,
  mime_type  VARCHAR(100) DEFAULT NULL,
  path       TEXT DEFAULT NULL,
  parent_id  INT DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_documents_parent (parent_id),
  CONSTRAINT fk_documents_parent FOREIGN KEY (parent_id) REFERENCES documents (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Website navbar (two levels: parent_id NULL = top level).
CREATE TABLE IF NOT EXISTS navbar_menus (
  id             INT NOT NULL AUTO_INCREMENT,
  parent_id      INT DEFAULT NULL,
  label_id       VARCHAR(255) NOT NULL,
  label_en       VARCHAR(255) NOT NULL,
  url            VARCHAR(255) DEFAULT '#',
  icon           VARCHAR(50) DEFAULT 'Globe',
  description_id TEXT DEFAULT NULL,
  description_en TEXT DEFAULT NULL,
  sort_order     INT DEFAULT 0,
  is_active      TINYINT(1) DEFAULT 1,
  created_at     TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_navbar_parent_sort (parent_id, sort_order),
  CONSTRAINT fk_navbar_parent FOREIGN KEY (parent_id) REFERENCES navbar_menus (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TEMPLATE MARKETPLACE (migration 2026-10-19_004, docs/platform/SPEC.md §3–§6)
-- Order flow: menunggu_pembayaran -> menunggu_approval -> proses_domain -> aktif
--             (ditolak / dibatalkan as side exits). Status changes are written as
--             UPDATE ... WHERE id = ? AND status = ? and logged in template_order_logs.
-- ============================================================================

-- Template catalog. Public pages only see status = 'published'.
CREATE TABLE IF NOT EXISTS templates (
  id                INT NOT NULL AUTO_INCREMENT,
  slug              VARCHAR(120) NOT NULL,
  name              VARCHAR(150) NOT NULL,
  category          VARCHAR(80) NOT NULL DEFAULT 'Company Profile',
  short_description VARCHAR(255) DEFAULT NULL,
  description       TEXT DEFAULT NULL,
  features          TEXT DEFAULT NULL,            -- JSON array of string
  price             DECIMAL(15,2) NOT NULL DEFAULT 0,
  preview_image     VARCHAR(500) DEFAULT NULL,
  gallery           TEXT DEFAULT NULL,            -- JSON array of image path
  template_code     VARCHAR(60) NOT NULL,         -- renderer key in src/templates (e.g. 'corporate-nexa')
  demo_url          VARCHAR(500) DEFAULT NULL,    -- optional; empty = /demo/:slug
  status            ENUM('draft','published') NOT NULL DEFAULT 'draft',
  sort_order        INT NOT NULL DEFAULT 0,
  like_count         INT NOT NULL DEFAULT 0,      -- catalog card likes (migration 013)
  view_count         INT NOT NULL DEFAULT 0,      -- catalog card views (migration 013)
  created_at        TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_templates_slug (slug),
  KEY idx_templates_status (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Template orders by customers (users.role = 'customer'). Name/code/price are snapshots.
CREATE TABLE IF NOT EXISTS template_orders (
  id                 INT NOT NULL AUTO_INCREMENT,
  order_number       VARCHAR(40) NOT NULL,        -- 'GN-YYYYMMDD-XXXXXX'
  user_id            INT NOT NULL,
  template_id        INT DEFAULT NULL,
  template_name      VARCHAR(150) NOT NULL,       -- snapshot at order time
  template_code      VARCHAR(60) NOT NULL,
  price              DECIMAL(15,2) NOT NULL,      -- snapshot at order time
  list_price         DECIMAL(15,2) DEFAULT NULL,  -- catalogue price before the first-order discount (migration 012)
  discount_amount    DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount_code      VARCHAR(40) DEFAULT NULL,     -- 'PERTAMA20' = automatic first-order discount
  customer_name      VARCHAR(150) NOT NULL,
  customer_email     VARCHAR(150) NOT NULL,
  customer_phone     VARCHAR(30) NOT NULL,
  company_name       VARCHAR(150) DEFAULT NULL,
  notes              TEXT DEFAULT NULL,
  domain_primary     VARCHAR(253) NOT NULL,
  domain_alternative VARCHAR(253) DEFAULT NULL,
  domain             VARCHAR(253) DEFAULT NULL,   -- final domain, set by staff
  status             ENUM('menunggu_pembayaran','menunggu_approval','proses_domain','aktif','ditolak','dibatalkan')
                     NOT NULL DEFAULT 'menunggu_pembayaran',
  payment_status     VARCHAR(30) NOT NULL DEFAULT 'pending',  -- last Midtrans transaction_status
  payment_type       VARCHAR(40) DEFAULT NULL,
  midtrans_order_id  VARCHAR(60) DEFAULT NULL,    -- order_number + '-' + attempt
  payment_attempt    INT NOT NULL DEFAULT 0,
  snap_token         VARCHAR(255) DEFAULT NULL,
  payment_url        VARCHAR(500) DEFAULT NULL,
  paid_at            DATETIME DEFAULT NULL,
  approved_at        DATETIME DEFAULT NULL,
  approved_by        INT DEFAULT NULL,
  rejected_reason    VARCHAR(500) DEFAULT NULL,
  activated_at       DATETIME DEFAULT NULL,
  cancelled_at       DATETIME DEFAULT NULL,
  created_at         TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_number (order_number),
  UNIQUE KEY uq_orders_midtrans (midtrans_order_id),
  KEY idx_orders_user (user_id),
  KEY idx_orders_status (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One live site per activated order; content = CMS JSON (NULL = template default content).
CREATE TABLE IF NOT EXISTS template_sites (
  id            INT NOT NULL AUTO_INCREMENT,
  order_id      INT NOT NULL,
  user_id       INT NOT NULL,
  template_id   INT DEFAULT NULL,
  template_code VARCHAR(60) NOT NULL,
  domain        VARCHAR(253) NOT NULL,
  status        ENUM('active','suspended') NOT NULL DEFAULT 'active',
  content       MEDIUMTEXT DEFAULT NULL,          -- JSON SiteContent; NULL = template default
  activated_at  DATETIME DEFAULT NULL,
  updated_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sites_order (order_id),
  UNIQUE KEY uq_sites_domain (domain),
  KEY idx_sites_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Status / payment history per order.
CREATE TABLE IF NOT EXISTS template_order_logs (
  id          INT NOT NULL AUTO_INCREMENT,
  order_id    INT NOT NULL,
  event       VARCHAR(40) NOT NULL,   -- created|payment_created|payment_update|approved|rejected|domain_set|activated|cancelled|note
  from_status VARCHAR(30) DEFAULT NULL,
  to_status   VARCHAR(30) DEFAULT NULL,
  actor_type  ENUM('system','customer','staff','midtrans') NOT NULL,
  actor_id    INT DEFAULT NULL,
  note        VARCHAR(500) DEFAULT NULL,
  payload     TEXT DEFAULT NULL,      -- Midtrans notification fields (no signature / card data)
  created_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_logs_order (order_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- PROJECT DOCUMENTS (migration 2026-10-21_006, docs/platform/PROJECT-DOCS-SPEC.md §3)
-- One workspace per custom project (project_client): BRD, MoU, Proposal, PKS + SOW, Jadwal,
-- UAT, BAST, Invoice, Kuitansi, SLA. Document status: draft -> menunggu_persetujuan ->
-- disetujui -> selesai. Default settings (pd_company, pd_numbering, pd_tax, pd_payment_terms,
-- pd_sla_defaults in hero_settings) are seeded by database/seed.sql.
-- ============================================================================

-- Clients; user_id links a customer account (role customer) that may approve and sign.
CREATE TABLE IF NOT EXISTS pd_clients (
  id         INT NOT NULL AUTO_INCREMENT,
  type       ENUM('perusahaan','perorangan') NOT NULL DEFAULT 'perusahaan',
  name       VARCHAR(255) NOT NULL,               -- company or person name
  pic_name   VARCHAR(255) DEFAULT NULL,
  pic_title  VARCHAR(255) DEFAULT NULL,
  email      VARCHAR(255) DEFAULT NULL,
  phone      VARCHAR(50) DEFAULT NULL,
  address    TEXT DEFAULT NULL,
  city       VARCHAR(120) DEFAULT NULL,
  npwp       VARCHAR(32) DEFAULT NULL,
  user_id    INT DEFAULT NULL,                    -- users.id with role customer
  notes      TEXT DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Milestones (Jadwal); project progress = Σ(weight × progress) / Σ weight.
CREATE TABLE IF NOT EXISTS pd_milestones (
  id           INT NOT NULL AUTO_INCREMENT,
  project_id   INT NOT NULL,                      -- project_client.id
  title        VARCHAR(255) NOT NULL,
  description  TEXT DEFAULT NULL,
  start_date   DATE DEFAULT NULL,
  due_date     DATE DEFAULT NULL,
  weight       INT NOT NULL DEFAULT 1,            -- relative weight
  progress     TINYINT NOT NULL DEFAULT 0,        -- 0..100
  status       ENUM('belum_mulai','berjalan','selesai','tertunda') NOT NULL DEFAULT 'belum_mulai',
  sort_order   INT NOT NULL DEFAULT 0,
  completed_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Documents. `number` (007/PKS/GNB/X/2026) is assigned once at creation through pd_counters.
CREATE TABLE IF NOT EXISTS pd_documents (
  id                 INT NOT NULL AUTO_INCREMENT,
  project_id         INT NOT NULL,
  doc_type           ENUM('brd','mou','proposal','pks','timeline','uat','bast','invoice','receipt','sla') NOT NULL,
  number             VARCHAR(64) NOT NULL,
  title              VARCHAR(255) NOT NULL,
  status             ENUM('draft','menunggu_persetujuan','disetujui','selesai') NOT NULL DEFAULT 'draft',
  version            INT NOT NULL DEFAULT 1,
  content            LONGTEXT NOT NULL,           -- JSON DocContent of the current version
  snapshot           LONGTEXT DEFAULT NULL,       -- JSON MergeData frozen at submit/issue
  content_hash       CHAR(64) DEFAULT NULL,       -- SHA-256 of canonical JSON {content, snapshot}
  revision_requested TINYINT(1) NOT NULL DEFAULT 0,
  review_note        TEXT DEFAULT NULL,
  doc_date           DATE NOT NULL,
  submitted_at       DATETIME DEFAULT NULL,
  approved_at        DATETIME DEFAULT NULL,
  completed_at       DATETIME DEFAULT NULL,
  created_by         INT DEFAULT NULL,
  updated_by         INT DEFAULT NULL,
  created_at         TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_number (number),
  KEY idx_project_type (project_id, doc_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Revision history: one row per saved version (full content).
CREATE TABLE IF NOT EXISTS pd_document_revisions (
  id          INT NOT NULL AUTO_INCREMENT,
  document_id INT NOT NULL,
  version     INT NOT NULL,
  content     LONGTEXT NOT NULL,
  change_note VARCHAR(500) DEFAULT NULL,
  changed_by  INT DEFAULT NULL,
  created_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_doc_version (document_id, version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Client approvals / rejections per document version.
CREATE TABLE IF NOT EXISTS pd_approvals (
  id          INT NOT NULL AUTO_INCREMENT,
  document_id INT NOT NULL,
  version     INT NOT NULL,
  user_id     INT NOT NULL,
  decision    ENUM('approved','rejected') NOT NULL,
  note        TEXT DEFAULT NULL,
  ip          VARCHAR(64) DEFAULT NULL,
  user_agent  VARCHAR(255) DEFAULT NULL,
  created_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_doc (document_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Electronic signatures (audit trail); the PNG lives in private storage (storage/project-docs).
CREATE TABLE IF NOT EXISTS pd_signatures (
  id           INT NOT NULL AUTO_INCREMENT,
  document_id  INT NOT NULL,
  version      INT NOT NULL,
  party        ENUM('pihak_pertama','pihak_kedua') NOT NULL,
  user_id      INT NOT NULL,
  signer_name  VARCHAR(255) NOT NULL,
  signer_title VARCHAR(255) DEFAULT NULL,
  method       ENUM('draw','type') NOT NULL,
  image_file   VARCHAR(255) NOT NULL,             -- file name in private storage
  content_hash CHAR(64) NOT NULL,
  ip           VARCHAR(64) DEFAULT NULL,
  user_agent   VARCHAR(255) DEFAULT NULL,
  signed_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_doc_version_party (document_id, version, party)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Invoices (one pd_documents row each); totals are always recomputed by the server.
CREATE TABLE IF NOT EXISTS pd_invoices (
  id             INT NOT NULL AUTO_INCREMENT,
  project_id     INT NOT NULL,
  document_id    INT NOT NULL,
  term_key       VARCHAR(40) DEFAULT NULL,        -- PaymentTerm.key or NULL for manual
  kind           ENUM('dp','termin','pelunasan','maintenance','lainnya') NOT NULL,
  issue_date     DATE NOT NULL,
  due_date       DATE NOT NULL,
  items          LONGTEXT NOT NULL,               -- JSON InvoiceItem[]
  subtotal       DECIMAL(15,2) NOT NULL,
  discount       DECIMAL(15,2) NOT NULL DEFAULT 0,
  dpp            DECIMAL(15,2) NOT NULL,
  ppn_rate       DECIMAL(5,2) NOT NULL DEFAULT 0,
  ppn_amount     DECIMAL(15,2) NOT NULL DEFAULT 0,
  pph23_rate     DECIMAL(5,2) NOT NULL DEFAULT 0,
  pph23_amount   DECIMAL(15,2) NOT NULL DEFAULT 0,
  total          DECIMAL(15,2) NOT NULL,
  amount_due     DECIMAL(15,2) NOT NULL,
  amount_paid    DECIMAL(15,2) NOT NULL DEFAULT 0,
  payment_status ENUM('belum_dibayar','sebagian','lunas','dibatalkan') NOT NULL DEFAULT 'belum_dibayar',
  notes          TEXT DEFAULT NULL,
  created_at     TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_document (document_id),
  KEY idx_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payments recorded by an admin; each one issues a receipt document (Kuitansi).
CREATE TABLE IF NOT EXISTS pd_payments (
  id                  INT NOT NULL AUTO_INCREMENT,
  invoice_id          INT NOT NULL,
  amount              DECIMAL(15,2) NOT NULL,
  paid_at             DATE NOT NULL,
  method              ENUM('transfer','tunai','qris','lainnya') NOT NULL DEFAULT 'transfer',
  reference           VARCHAR(120) DEFAULT NULL,
  proof_file          VARCHAR(255) DEFAULT NULL,  -- file name in private storage
  note                TEXT DEFAULT NULL,
  receipt_document_id INT DEFAULT NULL,
  recorded_by         INT NOT NULL,
  created_at          TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_invoice (invoice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- In-app notifications: user_id = one user, or user_id NULL + role = broadcast to that role.
CREATE TABLE IF NOT EXISTS pd_notifications (
  id         INT NOT NULL AUTO_INCREMENT,
  user_id    INT DEFAULT NULL,
  role       ENUM('admin','user','customer') DEFAULT NULL,
  type       VARCHAR(40) NOT NULL,
  title      VARCHAR(255) NOT NULL,
  body       VARCHAR(500) DEFAULT NULL,
  link       VARCHAR(255) DEFAULT NULL,
  project_id INT DEFAULT NULL,
  dedupe_key VARCHAR(120) DEFAULT NULL,
  read_at    DATETIME DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_dedupe (dedupe_key),
  KEY idx_user (user_id),
  KEY idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Read state of role broadcasts, per user.
CREATE TABLE IF NOT EXISTS pd_notification_reads (
  notification_id INT NOT NULL,
  user_id         INT NOT NULL,
  read_at         DATETIME NOT NULL,
  PRIMARY KEY (notification_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Atomic numbering: INSERT … ON DUPLICATE KEY UPDATE last_seq = LAST_INSERT_ID(last_seq + 1).
CREATE TABLE IF NOT EXISTS pd_counters (
  counter_key VARCHAR(16) NOT NULL,               -- document CODE (BRD, PKS, ...) or PRJ
  year        SMALLINT NOT NULL,
  last_seq    INT NOT NULL DEFAULT 0,
  PRIMARY KEY (counter_key, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Project activity log (every state change).
CREATE TABLE IF NOT EXISTS pd_activity (
  id          INT NOT NULL AUTO_INCREMENT,
  project_id  INT NOT NULL,
  document_id INT DEFAULT NULL,
  user_id     INT DEFAULT NULL,
  action      VARCHAR(40) NOT NULL,
  detail      VARCHAR(500) DEFAULT NULL,
  created_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- VISITORS
-- ============================================================================

-- Single row (id = 1) holding the running visit counter.
CREATE TABLE IF NOT EXISTS visitor_stats (
  id           INT NOT NULL AUTO_INCREMENT,
  total_visits INT DEFAULT 0,
  updated_at   TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One row per tracked visit (plain INSERT from track_visit; no per-IP dedup).
-- referrer_host / landing_path / utm_source: where the session came from (backend/modules/visits.php; host only, no
-- full referrer URL or query string). NULL in rows from before migration 2026-10-23_010.
CREATE TABLE IF NOT EXISTS visitor_logs (
  id            INT NOT NULL AUTO_INCREMENT,
  visited_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  ip_address    VARCHAR(45) DEFAULT '',
  user_agent    TEXT DEFAULT NULL,
  device        VARCHAR(20) DEFAULT '',
  browser       VARCHAR(50) DEFAULT '',
  os            VARCHAR(50) DEFAULT '',
  country       VARCHAR(100) DEFAULT 'Unknown',
  referrer_host VARCHAR(255) DEFAULT NULL,
  landing_path  VARCHAR(255) DEFAULT NULL,
  utm_source    VARCHAR(100) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_visitor_visited_at (visited_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS visitor_stats_daily (
  id         INT NOT NULL AUTO_INCREMENT,
  website_id INT DEFAULT NULL,
  date       DATE DEFAULT NULL,
  visitors   INT DEFAULT 0,
  pageviews  INT DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY website_id (website_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ############################################################################
-- ##  DEPRECATED, akan dihapus oleh migrasi 005                             ##
-- ##  (database/migrations/2026-10-19_005_drop_monitoring_tables.sql)       ##
-- ############################################################################
-- Fitur Monitoring Server sudah dihapus dari kode (admin panel, api.php, server.js).
-- Semua tabel monitor_* dan monitoring_* di bawah TIDAK dipakai kode lagi. Definisinya
-- dibiarkan di sini sampai pengguna menyetujui migrasi 005; setelah 005 dijalankan,
-- hapus seluruh bagian ini sampai penanda "AKHIR BAGIAN DEPRECATED" dan tambahkan
-- baris baseline 2026-10-19_005 di bawah.
-- ############################################################################

-- ============================================================================
-- MONITORING (A, DEPRECATED) — `monitor_*` tables (formerly backend/server.js)
-- ============================================================================

CREATE TABLE IF NOT EXISTS monitor_websites (
  id             INT NOT NULL AUTO_INCREMENT,
  name           VARCHAR(255) NOT NULL,
  url            VARCHAR(500) NOT NULL,
  category       VARCHAR(100) DEFAULT 'Umum',
  check_interval INT DEFAULT 5,               -- minutes
  status         VARCHAR(20) NOT NULL DEFAULT 'unknown',
  last_checked   DATETIME DEFAULT NULL,
  notes          TEXT DEFAULT NULL,
  is_active      TINYINT(1) DEFAULT 1,
  created_at     TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS monitor_website_logs (
  id               BIGINT NOT NULL AUTO_INCREMENT,
  website_id       INT NOT NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'unknown',
  response_time_ms INT DEFAULT NULL,
  http_status      INT DEFAULT NULL,
  error_message    TEXT DEFAULT NULL,
  checked_at       TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_website_logs_checked (website_id, checked_at),
  CONSTRAINT monitor_website_logs_ibfk_1 FOREIGN KEY (website_id) REFERENCES monitor_websites (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS monitor_ssl (
  id           INT NOT NULL AUTO_INCREMENT,
  website_id   INT NOT NULL,
  issuer       VARCHAR(255) DEFAULT NULL,
  valid_from   DATE DEFAULT NULL,
  valid_to     DATE DEFAULT NULL,
  days_left    INT DEFAULT 0,
  is_valid     TINYINT(1) DEFAULT 1,
  last_checked TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY website_id (website_id),
  CONSTRAINT monitor_ssl_ibfk_1 FOREIGN KEY (website_id) REFERENCES monitor_websites (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS monitor_servers (
  id         INT NOT NULL AUTO_INCREMENT,
  name       VARCHAR(255) NOT NULL,
  host       VARCHAR(500) NOT NULL,
  type       VARCHAR(50) DEFAULT 'vps',       -- vps / dedicated / docker / shared / linux …
  status     VARCHAR(20) NOT NULL DEFAULT 'unknown',
  last_seen  DATETIME DEFAULT NULL,
  notes      TEXT DEFAULT NULL,
  is_active  TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Two writers: monitor_push_metrics / monitor-agent.sh (usage %, load) and
-- record_server_log (absolute used/total + percent + network).
CREATE TABLE IF NOT EXISTS monitor_server_logs (
  id          BIGINT NOT NULL AUTO_INCREMENT,
  server_id   INT NOT NULL,
  cpu_usage   DECIMAL(5,2) DEFAULT 0.00,
  ram_usage   DECIMAL(5,2) DEFAULT 0.00,
  ram_used    DECIMAL(20,2) DEFAULT 0.00,
  ram_total   BIGINT DEFAULT 0,
  ram_percent DECIMAL(5,2) DEFAULT 0.00,
  disk_usage  DECIMAL(5,2) DEFAULT 0.00,
  disk_used   DECIMAL(20,2) DEFAULT 0.00,
  disk_total  BIGINT DEFAULT 0,
  disk_percent DECIMAL(5,2) DEFAULT 0.00,
  network_in  DECIMAL(20,2) DEFAULT 0.00,
  network_out DECIMAL(20,2) DEFAULT 0.00,
  load_1min   DECIMAL(5,2) DEFAULT 0.00,
  load_5min   DECIMAL(5,2) DEFAULT 0.00,
  load_15min  DECIMAL(5,2) DEFAULT 0.00,
  status      VARCHAR(20) NOT NULL DEFAULT 'unknown',
  checked_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_server_logs_checked (server_id, checked_at),
  CONSTRAINT monitor_server_logs_ibfk_1 FOREIGN KEY (server_id) REFERENCES monitor_servers (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS monitor_ai_agents (
  id         INT NOT NULL AUTO_INCREMENT,
  name       VARCHAR(255) NOT NULL,
  provider   VARCHAR(100) DEFAULT 'openai',
  model      VARCHAR(255) DEFAULT 'gpt-4',
  notes      TEXT DEFAULT NULL,
  is_active  TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- `cost` is canonical. `cost_estimate` is DEPRECATED (kept because
-- src/pages/admin/monitoring/Agents.tsx still reads it); do not write to it.
CREATE TABLE IF NOT EXISTS monitor_ai_logs (
  id               BIGINT NOT NULL AUTO_INCREMENT,
  agent_id         INT DEFAULT NULL,
  model            VARCHAR(255) DEFAULT NULL,
  tokens_input     INT DEFAULT 0,
  tokens_output    INT DEFAULT 0,
  total_tokens     INT DEFAULT 0,
  response_time_ms INT DEFAULT NULL,
  cost             DECIMAL(10,6) DEFAULT 0.000000,
  cost_estimate    DECIMAL(10,6) DEFAULT 0.000000,
  error_count      INT DEFAULT 0,
  status           ENUM('success','timeout','rate_limited','error') DEFAULT 'success',
  error_message    TEXT DEFAULT NULL,
  prompt           MEDIUMTEXT DEFAULT NULL,
  response         MEDIUMTEXT DEFAULT NULL,
  created_at       TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ai_logs_created (agent_id, created_at),
  CONSTRAINT monitor_ai_logs_ibfk_1 FOREIGN KEY (agent_id) REFERENCES monitor_ai_agents (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS monitor_ai_usage (
  id                INT NOT NULL AUTO_INCREMENT,
  agent_id          INT DEFAULT NULL,
  user_id           INT DEFAULT NULL,
  website_id        INT DEFAULT NULL,
  model             VARCHAR(100) DEFAULT NULL,
  prompt_tokens     INT DEFAULT 0,
  completion_tokens INT DEFAULT 0,
  total_tokens      INT DEFAULT 0,
  cost              DECIMAL(10,6) DEFAULT 0.000000,
  duration          INT DEFAULT NULL,           -- ms
  status            ENUM('success','error') DEFAULT 'success',
  error_type        VARCHAR(100) DEFAULT NULL,
  created_at        TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ai_usage_created (created_at),
  KEY idx_ai_usage_website (website_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Error log written by log_error. `details` must be valid JSON or NULL.
CREATE TABLE IF NOT EXISTS monitor_errors (
  id             BIGINT NOT NULL AUTO_INCREMENT,
  source         VARCHAR(50) NOT NULL,        -- website/server/database/api/ai_agent/system/unknown
  severity       ENUM('info','warning','critical') DEFAULT 'warning',
  code           VARCHAR(100) DEFAULT NULL,
  message        TEXT NOT NULL,
  details        JSON DEFAULT NULL,
  recommendation TEXT DEFAULT NULL,
  is_resolved    TINYINT(1) DEFAULT 0,
  resolved_at    DATETIME DEFAULT NULL,
  resolved_by    VARCHAR(100) DEFAULT NULL,
  created_at     TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_errors_created (created_at),
  KEY idx_errors_source (source)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Second error list (dashboard "Error Center", resolve_error).
CREATE TABLE IF NOT EXISTS monitor_error_center (
  id          INT NOT NULL AUTO_INCREMENT,
  source      ENUM('website','server','ai','database','api') NOT NULL,
  severity    ENUM('info','warning','critical') DEFAULT 'warning',
  category    VARCHAR(100) DEFAULT NULL,      -- 404, 500, Timeout, …
  message     TEXT DEFAULT NULL,
  stack_trace TEXT DEFAULT NULL,
  solution    TEXT DEFAULT NULL,
  is_resolved TINYINT(1) DEFAULT 0,
  created_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_error_center_resolved (is_resolved, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS monitor_audit_logs (
  id         BIGINT NOT NULL AUTO_INCREMENT,
  user_id    INT DEFAULT NULL,
  action     VARCHAR(255) NOT NULL,
  details    JSON DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- MONITORING (B, DEPRECATED) — `monitoring_*` tables (formerly api.php / server.js)
-- ============================================================================

CREATE TABLE IF NOT EXISTS monitoring_categories (
  id         INT NOT NULL AUTO_INCREMENT,
  name       VARCHAR(100) NOT NULL,
  icon       VARCHAR(50) DEFAULT 'Globe',
  sort_order INT DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS monitoring_websites (
  id           INT NOT NULL AUTO_INCREMENT,
  name         VARCHAR(255) NOT NULL,
  url          VARCHAR(500) NOT NULL,
  category     VARCHAR(100) DEFAULT 'Umum',
  status       ENUM('online','offline','unknown') DEFAULT 'unknown',
  is_active    TINYINT(1) DEFAULT 1,
  uptime_total DECIMAL(5,2) DEFAULT 100.00,
  last_checked DATETIME DEFAULT NULL,
  notes        TEXT DEFAULT NULL,
  created_at   TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS monitoring_website_checks (
  id               BIGINT NOT NULL AUTO_INCREMENT,
  website_id       INT NOT NULL,
  status           ENUM('online','offline') NOT NULL,
  response_time_ms INT DEFAULT 0,
  http_status      INT DEFAULT 0,
  error_message    TEXT DEFAULT NULL,
  checked_at       TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_website_time (website_id, checked_at),
  CONSTRAINT monitoring_website_checks_ibfk_1 FOREIGN KEY (website_id) REFERENCES monitoring_websites (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS monitoring_domains (
  id                    INT NOT NULL AUTO_INCREMENT,
  domain                VARCHAR(255) NOT NULL,
  website_id            INT DEFAULT NULL,
  registrar             VARCHAR(255) DEFAULT '',
  registration_date     DATE DEFAULT NULL,
  expiry_date           DATE DEFAULT NULL,
  days_until_expiry     INT DEFAULT 0,
  ssl_issuer            VARCHAR(255) DEFAULT '',
  ssl_expiry_date       DATE DEFAULT NULL,
  ssl_days_until_expiry INT DEFAULT 0,
  dns_info              TEXT DEFAULT NULL,
  status                ENUM('valid','expiring_soon','expired','unknown') DEFAULT 'unknown',
  last_checked          TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  created_at            TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY website_id (website_id),
  CONSTRAINT monitoring_domains_ibfk_1 FOREIGN KEY (website_id) REFERENCES monitoring_websites (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS monitoring_api (
  id               INT NOT NULL AUTO_INCREMENT,
  name             VARCHAR(255) NOT NULL,
  endpoint         VARCHAR(500) NOT NULL,
  method           ENUM('GET','POST','PUT','DELETE') DEFAULT 'GET',
  status           ENUM('active','inactive','down') DEFAULT 'active',
  response_time_ms INT DEFAULT 0,
  success_count    INT DEFAULT 0,
  fail_count       INT DEFAULT 0,
  last_checked     TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at       TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS monitoring_api_logs (
  id               INT NOT NULL AUTO_INCREMENT,
  api_id           INT NOT NULL,
  status           ENUM('active','inactive','down') DEFAULT 'active',
  response_time_ms INT DEFAULT 0,
  checked_at       TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_api_logs_checked (api_id, checked_at),
  CONSTRAINT fk_monitoring_api_logs_api FOREIGN KEY (api_id) REFERENCES monitoring_api (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Single row (id = 1), updated by monitor_update_server.
CREATE TABLE IF NOT EXISTS monitoring_server_status (
  id             INT NOT NULL DEFAULT 1,
  server_name    VARCHAR(255) DEFAULT 'Garuda Nexa Server',
  status         ENUM('healthy','warning','critical','down') DEFAULT 'healthy',
  cpu_usage      DECIMAL(5,2) DEFAULT 0.00,
  ram_used       BIGINT DEFAULT 0,
  ram_total      BIGINT DEFAULT 0,
  ram_percent    DECIMAL(5,2) DEFAULT 0.00,
  disk_used      BIGINT DEFAULT 0,
  disk_total     BIGINT DEFAULT 0,
  disk_percent   DECIMAL(5,2) DEFAULT 0.00,
  network_in     BIGINT DEFAULT 0,
  network_out    BIGINT DEFAULT 0,
  uptime_seconds BIGINT DEFAULT 0,
  os_info        VARCHAR(255) DEFAULT 'Linux',
  last_updated   TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- History of monitor_update_server. Sizes can be raw bytes, hence DECIMAL(20,2).
CREATE TABLE IF NOT EXISTS monitoring_server_metrics (
  id          BIGINT NOT NULL AUTO_INCREMENT,
  server_name VARCHAR(255) DEFAULT 'Garuda Nexa Server',
  cpu_usage   DECIMAL(5,2) DEFAULT 0.00,
  ram_used    DECIMAL(20,2) DEFAULT 0.00,
  ram_total   DECIMAL(20,2) DEFAULT 0.00,
  disk_used   DECIMAL(20,2) DEFAULT 0.00,
  disk_total  DECIMAL(20,2) DEFAULT 0.00,
  network_in  DECIMAL(20,2) DEFAULT 0.00,
  network_out DECIMAL(20,2) DEFAULT 0.00,
  recorded_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_recorded (recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Single row (id = 1).
CREATE TABLE IF NOT EXISTS monitoring_database (
  id                 INT NOT NULL DEFAULT 1,
  db_name            VARCHAR(255) DEFAULT 'db_garudanexabahtera',
  status             ENUM('connected','disconnected','error') DEFAULT 'connected',
  size_mb            DECIMAL(10,2) DEFAULT 0.00,
  active_connections INT DEFAULT 0,
  last_backup        DATETIME DEFAULT NULL,
  backup_status      VARCHAR(50) DEFAULT 'No backup yet',
  last_checked       TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS monitoring_security_logs (
  id          BIGINT NOT NULL AUTO_INCREMENT,
  type        ENUM('login','suspicious','blocked_ip','system') NOT NULL,
  description TEXT NOT NULL,
  ip_address  VARCHAR(45) DEFAULT '',
  user_agent  TEXT DEFAULT NULL,
  severity    ENUM('low','medium','high','critical') DEFAULT 'low',
  status      ENUM('new','reviewed','resolved') DEFAULT 'new',
  created_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_type (type),
  KEY idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS monitoring_notifications (
  id         BIGINT NOT NULL AUTO_INCREMENT,
  type       VARCHAR(50) NOT NULL,
  title      VARCHAR(255) NOT NULL,
  message    TEXT NOT NULL,
  severity   ENUM('info','warning','critical') DEFAULT 'info',
  is_read    TINYINT(1) DEFAULT 0,
  sent_wa    TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_read (is_read),
  KEY idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Single row (id = 1). wa_phone is set from the admin panel, not here.
CREATE TABLE IF NOT EXISTS monitoring_settings (
  id                   INT NOT NULL DEFAULT 1,
  check_interval       INT DEFAULT 30,
  wa_notifications     TINYINT(1) DEFAULT 1,
  wa_phone             VARCHAR(20) DEFAULT '',
  wa_group             VARCHAR(100) DEFAULT 'Garuda Nexa',
  notify_website_down  TINYINT(1) DEFAULT 1,
  notify_high_resource TINYINT(1) DEFAULT 1,
  notify_ssl_expiry    INT DEFAULT 30,
  notify_domain_expiry INT DEFAULT 30,
  created_at           TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ############################################################################
-- ##  AKHIR BAGIAN DEPRECATED (tabel monitoring, migrasi 005)               ##
-- ############################################################################

-- A fresh install already has every migration up to this baseline.
-- (002, 003, 007 and the navbar/FAQ data steps of 004 only touch existing rows, which a
--  fresh install does not have; with an empty navbar_menus the frontend uses its
--  built-in menu, and seed.templates.sql already uses the .webp previews of 007.)
INSERT IGNORE INTO schema_migrations (version, description) VALUES
  ('2026-10-19_001', 'baseline: canonical schema aligned with backend queries'),
  ('2026-10-19_002', 'baseline: navbar_menus anchor URLs (no rows to fix)'),
  ('2026-10-19_003', 'baseline: navbar top-level links (no navbar rows)'),
  ('2026-10-19_004', 'baseline: template marketplace tables, customer role, project_client show_on_website/source'),
  ('2026-10-21_006', 'baseline: project documents pd_* tables, project_client workspace columns (settings: seed.sql)'),
  ('2026-10-22_007', 'baseline: template preview images (no template rows; seed.templates.sql uses .webp)'),
  ('2026-10-23_009', 'baseline: SEO FAQ/contact data fix (no faq_data rows; seed.sql has the new hero/CTA values)'),
  ('2026-10-23_010', 'baseline: visitor_logs referrer_host, landing_path, utm_source (visit source)'),
  ('2026-10-23_011', 'baseline: navbar page links (no navbar rows; the built-in menu is Template, Jasa, Harga, Panduan)'),
  ('2026-10-24_012', 'baseline: template_orders list_price, discount_amount, discount_code (first-order discount)'),
  ('2026-10-24_013', 'baseline: templates like_count, view_count (catalog card likes and views)');

-- ----------------------------------------------------------------------------
-- NOT MANAGED HERE (exist in some databases, never queried by this repo):
--   products, services, monitor_notifications, monitor_pings  -> database/legacy/unused_tables.sql
--   saas_*  (local XAMPP only, belong to the "website desa" SaaS app)
-- Do not drop them without a backup and a check that nothing else uses them.
-- ----------------------------------------------------------------------------
