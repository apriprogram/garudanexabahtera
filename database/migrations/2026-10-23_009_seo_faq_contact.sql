-- ============================================================================
-- Migration 2026-10-23_009 — SEO WP6: FAQ facts, contact placeholder, legacy hero fields, CTA heading
-- ============================================================================
-- docs/platform/SEO-PLAN.md §5.6 steps 2–4 (audit CONTENT-07). Data only, no schema change.
--
-- 1. hero_settings.faq_data: items that STILL hold an old seeded answer get the current answer from
--    src/content/faq.ts (one answer per question on the home page, /harga, template pages and llms-full.txt):
--    - "Berapa lama proses pembuatan satu website?"  no more "beberapa hari kerja" promise
--    - "Apakah sudah termasuk hosting dan domain?"   hosting + SSL year 1 included (owner decision 2026-10-21);
--                                                     question renamed to the one on the site
--    - "Apakah website yang dibuat bisa saya edit sendiri?"  no blog claim
--    - "Bagaimana dengan sistem keamanannya?"        SSL claim limited to templates
--    - "Siapa pemilik konten yang saya buat?"         matches Syarat & Ketentuan (template licence, custom code)
--    Items an admin has edited (answer differs from the old seed) are left alone. JSON stays valid.
-- 2. contact_whatsapp: the placeholder 628123456789 becomes the official number 6285188009152.
-- 3. hero_title / hero_subtitle: the legacy English seed values are cleared ('' = the home page uses its built-in
--    keyword headline, see src/components/sections/hero/heroHeadline.ts). Admin-written titles stay.
-- 4. cta_title: the old default "Siap membangun sistem digital? …" becomes "Konsultasi gratis untuk website atau
--    aplikasi Anda" (H2 of the blue CTA block). An admin-written title stays.
--
-- Every UPDATE matches the OLD value exactly, so re-running is a no-op and production edits are never overwritten.
-- Run (BACKUP first, see database/README.md):
--   mysql -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-23_009_seo_faq_contact.sql
-- ============================================================================

SET NAMES utf8mb4;

DROP PROCEDURE IF EXISTS gn_migrate_2026_10_23_009;

DELIMITER $$

CREATE PROCEDURE gn_migrate_2026_10_23_009()
BEGIN
  DECLARE faq LONGTEXT DEFAULT NULL;
  DECLARE n INT DEFAULT 0;
  DECLARE i INT DEFAULT 0;
  DECLARE changed INT DEFAULT 0;
  DECLARE q TEXT;
  DECLARE a TEXT;
  DECLARE new_q TEXT;
  DECLARE new_a TEXT;

  -- 1. faq_data ----------------------------------------------------------------
  SET faq = (SELECT setting_value FROM hero_settings WHERE setting_key = 'faq_data' LIMIT 1);
  IF faq IS NOT NULL AND JSON_VALID(faq) = 1 AND JSON_TYPE(faq) = 'ARRAY' THEN
    SET n = JSON_LENGTH(faq);
  END IF;
  WHILE i < n DO
    SET q = TRIM(IFNULL(JSON_UNQUOTE(JSON_EXTRACT(faq, CONCAT('$[', i, '].question'))), ''));
    SET a = TRIM(IFNULL(JSON_UNQUOTE(JSON_EXTRACT(faq, CONCAT('$[', i, '].answer'))), ''));
    SET new_q = NULL;
    SET new_a = NULL;

    IF a = 'Website dari template bisa aktif dalam beberapa hari kerja setelah pembayaran dikonfirmasi dan domain selesai diproses. Untuk website atau aplikasi mobile custom, jadwal pengerjaan disepakati bersama setelah konsultasi kebutuhan.' THEN
      SET new_a = 'Website dari template aktif setelah pembayaran dikonfirmasi, pesanan kami setujui, dan domain selesai diproses; setiap tahapnya bisa Anda pantau di Akun Saya. Lama proses domain bergantung pada registrar dan jenis domainnya; misalnya .co.id memerlukan dokumen tambahan. Untuk website atau aplikasi mobile custom, jadwal pengerjaan disepakati bersama dan dituliskan di penawaran.';
    ELSEIF a = 'Untuk website dari template, domain yang Anda ajukan saat pemesanan kami proses sampai situs Anda aktif. Untuk website atau aplikasi mobile custom, kebutuhan hosting dan domain dibahas bersama saat konsultasi.' THEN
      SET new_q = 'Apa saja yang sudah termasuk dalam harga template?';
      SET new_a = 'Untuk template, harga sudah termasuk template dan setup awal, domain, hosting, serta sertifikat SSL (HTTPS) untuk tahun pertama. Isi website Anda kelola sendiri lewat CMS di Akun Saya. Mulai tahun ke-2, perpanjangan domain dan hosting ditagih per tahun, dan nominalnya kami informasikan sebelum jatuh tempo. Untuk website atau aplikasi custom, domain dan hosting dibahas saat konsultasi.';
    ELSEIF a = 'Tentu. Kami menggunakan sistem CMS (Content Management System) yang memudahkan Anda untuk mengubah teks, gambar, atau menambahkan artikel blog tanpa harus mengerti bahasa pemrograman.' THEN
      SET new_a = 'Bisa. Setelah website aktif, buka Akun Saya lalu kelola situs Anda. Lewat CMS Anda dapat mengubah teks, gambar, layanan, galeri, testimoni, dan kontak dengan pratinjau langsung, tanpa perlu keahlian coding. Bagian yang bisa diubah mengikuti template yang Anda pilih.';
    ELSEIF a IN (
      'Setiap website yang kami bangun dilengkapi dengan sertifikat SSL (HTTPS) gratis dan sistem keamanan standar industri untuk melindungi data Anda dan pengunjung.',
      'Setiap website yang kami bangun dilengkapi sertifikat SSL (HTTPS) dan sistem keamanan standar industri untuk melindungi data Anda dan pengunjung.'
    ) THEN
      SET new_a = 'Website dari template sudah memakai sertifikat SSL (HTTPS) yang termasuk dalam harga tahun pertama, jadi alamatnya diawali https:// dan data yang dikirim pengunjung terenkripsi. Untuk website atau aplikasi mobile custom, kebutuhan keamanan seperti SSL, hosting, dan perlindungan data dibahas saat konsultasi dan dituliskan di penawaran.';
    ELSEIF a IN (
      'Seluruh konten dan data yang ada pada website atau aplikasi Anda sepenuhnya adalah milik Anda. Kami hanya membantu dalam proses pengembangan dan pemeliharaan sistem.',
      'Seluruh konten dan data pada website atau aplikasi Anda sepenuhnya milik Anda. Kami membantu proses pengembangan dan pemeliharaan sistemnya.'
    ) THEN
      SET new_a = 'Isi yang Anda masukkan, seperti teks, gambar, logo, dan data, tetap milik Anda. Untuk template, desain dan kodenya tetap milik Garuda Nexa dan Anda mendapat hak pakai untuk satu situs pada domain pesanan selama layanan aktif. Untuk proyek custom, kepemilikan kode sumber diatur di penawaran tertulis.';
    END IF;

    IF new_a IS NOT NULL THEN
      SET faq = JSON_SET(faq, CONCAT('$[', i, '].answer'), new_a);
      IF new_q IS NOT NULL THEN
        SET faq = JSON_SET(faq, CONCAT('$[', i, '].question'), new_q);
      END IF;
      SET changed = changed + 1;
    END IF;
    SET i = i + 1;
  END WHILE;
  IF changed > 0 THEN
    UPDATE hero_settings SET setting_value = faq WHERE setting_key = 'faq_data';
  END IF;

  -- 2. contact_whatsapp placeholder --------------------------------------------
  UPDATE hero_settings SET setting_value = '6285188009152'
   WHERE setting_key = 'contact_whatsapp' AND TRIM(setting_value) = '628123456789';

  -- 3. legacy English hero fields ------------------------------------------------
  UPDATE hero_settings SET setting_value = ''
   WHERE setting_key = 'hero_title' AND TRIM(setting_value) = 'Leading With Vision, Moving With Purpose';
  UPDATE hero_settings SET setting_value = ''
   WHERE setting_key = 'hero_subtitle'
     AND TRIM(setting_value) = 'We don''t just build apps and websites. We build digital systems that help your business and institution grow faster, more efficiently, and more professionally.';

  -- 4. CTA heading ---------------------------------------------------------------
  UPDATE hero_settings SET setting_value = 'Konsultasi gratis untuk\nwebsite atau aplikasi Anda'
   WHERE setting_key = 'cta_title'
     AND LOWER(TRIM(REPLACE(setting_value, '\r', ''))) IN (
       'siap membangun sistem digital?\nkonsultasikan sekarang juga!',
       'siap membangun sistem digital? konsultasikan sekarang juga!'
     );

  INSERT IGNORE INTO schema_migrations (version, description)
  VALUES ('2026-10-23_009', 'seo: FAQ facts (hosting, SSL, timing, ownership), contact_whatsapp placeholder, legacy hero fields, CTA heading');
END$$

DELIMITER ;

CALL gn_migrate_2026_10_23_009();

DROP PROCEDURE IF EXISTS gn_migrate_2026_10_23_009;

SELECT setting_key, LEFT(setting_value, 120) AS setting_value
  FROM hero_settings
 WHERE setting_key IN ('faq_data', 'contact_whatsapp', 'hero_title', 'hero_subtitle', 'cta_title')
 ORDER BY setting_key;
