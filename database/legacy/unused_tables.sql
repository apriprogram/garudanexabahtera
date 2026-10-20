-- ============================================================================
-- LEGACY / UNUSED TABLES — reference only, NOT part of the canonical schema
-- ============================================================================
-- These tables exist in the local and production databases (created by the
-- old database.sql / monitoring_migration.sql or by hand) but no code in this
-- repo reads or writes them (checked 2026-10-19: backend/server.js,
-- backend/api.php, src/**). They are kept so nothing is lost.
--
-- Before dropping any of them: make a backup, confirm no other app on the
-- same MySQL server uses them, then write a migration in database/migrations/.
--
-- Not listed here: saas_* tables. They exist only in the local XAMPP database
-- and belong to the "website desa" SaaS app, not to this project.
--
-- monitor_notifications and monitor_pings (below) are also dropped by the
-- not-yet-approved migration 2026-10-19_005_drop_monitoring_tables.sql.
-- ============================================================================

-- From database.sql; superseded by list_products + hero_settings.products_data. 0 rows.
CREATE TABLE IF NOT EXISTS products (
  id          INT NOT NULL AUTO_INCREMENT,
  name        VARCHAR(255) NOT NULL,
  description TEXT DEFAULT NULL,
  price       DECIMAL(15,2) DEFAULT NULL,
  image_url   VARCHAR(255) DEFAULT NULL,
  category    VARCHAR(100) DEFAULT NULL,
  is_featured TINYINT(1) DEFAULT 0,
  created_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- From database.sql; never queried. 0 rows.
CREATE TABLE IF NOT EXISTS services (
  id          INT NOT NULL AUTO_INCREMENT,
  title       VARCHAR(255) NOT NULL,
  description TEXT DEFAULT NULL,
  icon        VARCHAR(100) DEFAULT NULL,
  is_active   TINYINT(1) DEFAULT 1,
  order_index INT DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- From monitoring_migration.sql; the backend uses monitoring_notifications instead. 0 rows.
CREATE TABLE IF NOT EXISTS monitor_notifications (
  id        INT NOT NULL AUTO_INCREMENT,
  type      ENUM('website_down','server_high_cpu','server_high_ram','server_disk_full','ssl_expiring','ai_error','critical_error') NOT NULL,
  channel   ENUM('email','whatsapp','telegram','dashboard') DEFAULT 'dashboard',
  is_active TINYINT(1) DEFAULT 1,
  config    JSON DEFAULT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Origin unknown (old ping experiment, June 2026). 144 test rows whose
-- product_id (1001-1004, 9999) matches no list_products row.
CREATE TABLE IF NOT EXISTS monitor_pings (
  id            INT NOT NULL AUTO_INCREMENT,
  product_id    INT NOT NULL,
  status        VARCHAR(20) NOT NULL,
  response_time INT NOT NULL,
  http_status   INT NOT NULL,
  description   TEXT DEFAULT NULL,
  category      VARCHAR(50) DEFAULT 'fitur',
  created_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
