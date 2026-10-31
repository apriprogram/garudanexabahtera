-- ============================================================================
-- Migration 2026-11-01_055 — admin_invoices + admin_invoice_items + admin_proposals: menu admin "Generate"
-- ============================================================================
-- Permintaan pemilik 2026-11-01: menu Generate di panel super admin dengan dua tab, Invoice dan Proposal. Admin
-- mengisi form manual atau lewat suara (dirapikan Nexa AI / parser lokal), lalu Simpan menghasilkan dokumen
-- berkop PT Garuda Nexa Bahtera yang bisa dilihat, dicetak, dan diunduh PDF. Tabel ini menampung riwayatnya.
--   admin_invoices       satu baris per invoice: nomor INV-YYYYMM-NNN (otomatis dari tanggal invoice), klien, diskon,
--                        PPN opsional, total (dihitung ulang server), catatan, info pembayaran, status.
--   admin_invoice_items  item baris invoice (deskripsi, qty, satuan, harga, subtotal), dihapus bersama invoice-nya.
--   admin_proposals      satu baris per proposal: nomor PRP-YYYYMM-NNN, klien, judul proyek, ringkasan, ruang lingkup,
--                        tahapan, rincian biaya (JSON), PPN opsional, total, syarat & ketentuan, masa berlaku, status.
-- Uang dalam rupiah bulat (BIGINT). Tabel ini terpisah dari invoice dokumen proyek (pd_invoices, nomor
-- 001/INV/GNB/…): nomornya sengaja berformat lain supaya tidak tertukar.
-- Aksi (backend/modules/admin_generate.php = admin_generate.js, semuanya ADMIN_ACTIONS): gen_invoices_list,
-- gen_invoice_get, gen_invoice_save, gen_invoice_delete, gen_proposals_list, gen_proposal_get, gen_proposal_save,
-- gen_proposal_delete, gen_voice_parse. Tanpa tabel ini halaman Generate menampilkan petunjuk menjalankan migrasi ini.
--
-- Skema saja, aman dijalankan ulang (CREATE TABLE IF NOT EXISTS, INSERT IGNORE; tanpa ALTER, tanpa prosedur, tanpa
-- information_schema), jadi bisa diimpor lewat phpMyAdmin. Tidak bergantung pada migrasi lain. Boleh dijalankan
-- sebelum atau sesudah deploy kodenya:
--   C:/xampp/mysql/bin/mysql.exe -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-11-01_055_admin_generate.sql
-- ============================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS admin_invoices (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number   VARCHAR(40) NOT NULL,                  -- INV-YYYYMM-NNN, urut per bulan tanggal invoice
  invoice_date     DATE NOT NULL,
  due_date         DATE NULL,                             -- jatuh tempo (opsional)
  client_name      VARCHAR(150) NOT NULL,
  client_company   VARCHAR(150) NOT NULL DEFAULT '',
  client_email     VARCHAR(150) NOT NULL DEFAULT '',
  client_phone     VARCHAR(40) NOT NULL DEFAULT '',
  client_address   VARCHAR(1000) NOT NULL DEFAULT '',
  discount_type    VARCHAR(10) NOT NULL DEFAULT 'amount', -- 'amount' (rupiah) | 'percent'
  discount_value   DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_enabled      TINYINT(1) NOT NULL DEFAULT 0,         -- PPN dipakai
  tax_rate         DECIMAL(5,2) NOT NULL DEFAULT 11.00,   -- persen PPN
  subtotal         BIGINT NOT NULL DEFAULT 0,             -- Σ item
  discount_amount  BIGINT NOT NULL DEFAULT 0,
  tax_amount       BIGINT NOT NULL DEFAULT 0,
  total            BIGINT NOT NULL DEFAULT 0,             -- subtotal − diskon + PPN
  notes            TEXT NULL,
  payment_info     TEXT NULL,                             -- rekening / cara bayar
  status           VARCHAR(12) NOT NULL DEFAULT 'draft',  -- 'draft' | 'terkirim' | 'lunas'
  created_by       INT NULL,                              -- users.id admin pembuat
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_admin_invoice_number (invoice_number),
  KEY idx_admin_invoice_date (invoice_date),
  KEY idx_admin_invoice_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_invoice_items (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id   INT NOT NULL,
  sort_order   SMALLINT NOT NULL DEFAULT 0,
  description  VARCHAR(500) NOT NULL,
  qty          DECIMAL(12,2) NOT NULL DEFAULT 1,
  unit         VARCHAR(30) NOT NULL DEFAULT '',           -- satuan: paket, bulan, unit, …
  price        BIGINT NOT NULL DEFAULT 0,                 -- harga satuan
  subtotal     BIGINT NOT NULL DEFAULT 0,                 -- round(qty × price)
  KEY idx_admin_invoice_items (invoice_id, sort_order),
  CONSTRAINT fk_admin_invoice_items_invoice FOREIGN KEY (invoice_id) REFERENCES admin_invoices (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_proposals (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  proposal_number  VARCHAR(40) NOT NULL,                  -- PRP-YYYYMM-NNN, urut per bulan tanggal proposal
  proposal_date    DATE NOT NULL,
  valid_until      DATE NULL,                             -- masa berlaku penawaran (opsional)
  client_name      VARCHAR(150) NOT NULL,
  client_company   VARCHAR(150) NOT NULL DEFAULT '',
  client_email     VARCHAR(150) NOT NULL DEFAULT '',
  client_phone     VARCHAR(40) NOT NULL DEFAULT '',
  client_address   VARCHAR(1000) NOT NULL DEFAULT '',
  title            VARCHAR(200) NOT NULL,                 -- judul proyek
  summary          TEXT NULL,                             -- latar belakang / ringkasan
  scope            MEDIUMTEXT NULL,                       -- JSON ["fitur", …]: ruang lingkup
  timeline         MEDIUMTEXT NULL,                       -- JSON [{phase, duration, description}]: tahapan
  items            MEDIUMTEXT NULL,                       -- JSON [{description, qty, unit, price, subtotal}]: biaya
  tax_enabled      TINYINT(1) NOT NULL DEFAULT 0,
  tax_rate         DECIMAL(5,2) NOT NULL DEFAULT 11.00,
  subtotal         BIGINT NOT NULL DEFAULT 0,
  tax_amount       BIGINT NOT NULL DEFAULT 0,
  total            BIGINT NOT NULL DEFAULT 0,
  terms            TEXT NULL,                             -- syarat & ketentuan
  status           VARCHAR(12) NOT NULL DEFAULT 'draft',  -- 'draft' | 'terkirim' | 'disetujui' | 'ditolak'
  created_by       INT NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_admin_proposal_number (proposal_number),
  KEY idx_admin_proposal_date (proposal_date),
  KEY idx_admin_proposal_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-11-01_055', 'admin_invoices, admin_invoice_items, admin_proposals: menu admin Generate (invoice & proposal)');
