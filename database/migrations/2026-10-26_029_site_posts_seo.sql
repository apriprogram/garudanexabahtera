-- ============================================================================
-- Migration 2026-10-26_029 — site_posts, site_post_views, site_seo: berita & pengumuman template sekolah + SEO situs pembeli
-- ============================================================================
-- Permintaan pemilik 2026-10-26 (docs/platform/SITE-POSTS-SEO-SPEC.md): template sekolah (madani, cakrawala) bisa
-- menulis berita dan pengumuman (foto, judul, isi, CRUD) dengan halaman sendiri /berita/{slug} dan /pengumuman/{slug},
-- pembeli melihat berapa kali tiap tulisan dilihat, dan setiap situs pembeli punya pengaturan SEO di /akun.
--   site_posts       satu baris per tulisan; slug unik per situs (lintas jenis). kind = berita | pengumuman,
--                    status = draft | published (daftar nilai dijaga kode). image = /assets/sites/{site}/posts/post_<12hex>.<ext>
--                    (Node: URL S3). published_at = tanggal tampil, diisi hari ini (WIB) saat terbit tanpa tanggal.
--   site_post_views  jumlah dilihat per tulisan, terpisah supaya tayangan tidak mengubah site_posts.updated_at (lastmod
--                    sitemap). Baris dihapus bersama tulisannya.
--   site_seo         pengaturan SEO per situs (semua template); tidak ada baris = semua nilai bawaan (index_mode auto).
--                    og_image = /assets/sites/{site}/seo/seo_<12hex>.<ext>.
-- Tidak ada foreign key, mengikuti tabel marketplace lain (template_*, guide_*).
-- Aksi (backend/modules/site_posts.php = site_posts.js): get_site_seo, get_site_posts, get_site_post, site_post_view
-- (publik, situs active; site_post_view dibatasi per IP seperti guide_view) dan customer_get_site_posts,
-- customer_save_site_post, customer_delete_site_post, customer_get_site_seo, customer_save_site_seo (pembeli pemilik
-- situs). backend/site.php membaca ketiga tabel untuk kepala halaman, robots.txt dan sitemap.xml domain pembeli.
--
-- Skema saja, aman dijalankan ulang (CREATE TABLE IF NOT EXISTS, tanpa ALTER dan tanpa information_schema), jadi bisa
-- diimpor lewat phpMyAdmin sekaligus atau per pernyataan di tab SQL. Jalankan SEBELUM deploy kode yang membacanya:
--   C:/xampp/mysql/bin/mysql.exe -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-26_029_site_posts_seo.sql
-- ============================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS site_posts (
  id              INT NOT NULL AUTO_INCREMENT,
  site_id         INT NOT NULL,                           -- template_sites.id
  kind            VARCHAR(12)  NOT NULL,                  -- 'berita' | 'pengumuman'
  slug            VARCHAR(120) NOT NULL,
  title           VARCHAR(160) NOT NULL,
  excerpt         VARCHAR(300) NOT NULL DEFAULT '',
  body            MEDIUMTEXT   NOT NULL,                  -- teks biasa; paragraf dipisah baris kosong
  category        VARCHAR(40)  NOT NULL DEFAULT '',
  badge           VARCHAR(20)  NOT NULL DEFAULT '',       -- pengumuman: "Penting", "Wajib", …
  image           VARCHAR(500) DEFAULT NULL,              -- /assets/sites/{site}/posts/post_<12hex>.<ext>
  image_alt       VARCHAR(200) NOT NULL DEFAULT '',
  link_url        VARCHAR(500) NOT NULL DEFAULT '',       -- tautan tambahan (lampiran PDF, Drive, Instagram)
  status          VARCHAR(12)  NOT NULL DEFAULT 'draft',  -- 'draft' | 'published'
  published_at    DATE DEFAULT NULL,                      -- tanggal tampil; diisi hari ini (WIB) saat pertama terbit bila kosong
  seo_title       VARCHAR(70)  NOT NULL DEFAULT '',
  seo_description VARCHAR(160) NOT NULL DEFAULT '',
  noindex         TINYINT(1)   NOT NULL DEFAULT 0,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_site_posts_slug (site_id, slug),
  KEY idx_site_posts_list (site_id, kind, status, published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Penghitung terpisah supaya tayangan tidak mengubah site_posts.updated_at (lastmod sitemap)
CREATE TABLE IF NOT EXISTS site_post_views (
  post_id         INT NOT NULL,
  site_id         INT NOT NULL,
  view_count      INT UNSIGNED NOT NULL DEFAULT 0,
  last_viewed_at  DATETIME DEFAULT NULL,
  PRIMARY KEY (post_id),
  KEY idx_site_post_views_site (site_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS site_seo (
  site_id             INT NOT NULL,
  title               VARCHAR(70)  NOT NULL DEFAULT '',
  description         VARCHAR(160) NOT NULL DEFAULT '',
  og_image            VARCHAR(500) DEFAULT NULL,          -- /assets/sites/{site}/seo/seo_<12hex>.<ext>
  google_verification VARCHAR(100) NOT NULL DEFAULT '',
  bing_verification   VARCHAR(100) NOT NULL DEFAULT '',
  index_mode          VARCHAR(10)  NOT NULL DEFAULT 'auto',   -- 'auto' | 'index' | 'noindex'
  schema_type         VARCHAR(40)  NOT NULL DEFAULT '',       -- '' = otomatis
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (site_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-26_029', 'site_posts, site_post_views, site_seo: berita & pengumuman template sekolah + SEO situs pembeli');
