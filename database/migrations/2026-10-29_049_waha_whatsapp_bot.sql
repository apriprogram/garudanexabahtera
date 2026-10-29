-- ============================================================================
-- Migration 2026-10-29_049 — waha_seen + waha_chats + waha_handoffs: chatbot WhatsApp lewat WAHA
-- ============================================================================
-- Permintaan pemilik 2026-10-29 (docs/platform/WHATSAPP-BOT-SPEC.md): pesan klien ke nomor WhatsApp bisnis yang
-- terhubung ke WAHA (WhatsApp HTTP API) dijawab otomatis oleh Nexa AI. Bila AI mati/gagal, klien minta admin, atau AI
-- memutuskan perlu admin, chat dialihkan ke admin manusia: klien diberi tahu, nomor WA admin menerima notifikasi, dan
-- bot dijeda untuk chat itu.
--   waha_seen      penanda pesan yang sudah diproses: sha256 dari id pesan WAHA (bukan id-nya, karena id WhatsApp
--                  memuat nomor telepon). Webhook ganda (retry WAHA, event message + message.any) diabaikan. Baris
--                  lebih dari 3 hari dihapus oleh kode setiap ada pesan baru.
--   waha_chats     status per chat: jeda bot (paused_until), status alih ke admin, riwayat singkat untuk AI (12 pesan
--                  terakhir; diabaikan setelah 24 jam tanpa pesan), nama profil & nomor klien.
--   waha_handoffs  log alih ke admin untuk tab admin Tanya Nexa: alasan, pesan pemicu, status, notifikasi terkirim.
-- Pengaturan (saklar, URL WAHA, API key, session, nomor admin, lama jeda) ada di hero_settings waha_* lewat tab admin
-- Tanya Nexa (aksi waha_get_config / waha_save_config); kunci HMAC webhook hanya di .env server (WAHA_HMAC_KEY).
-- Aksi (backend/modules/waha.php = waha.js): waha_webhook (publik, bertanda tangan HMAC), waha_get_config,
-- waha_save_config, waha_test, waha_close_handoff (admin). Tanpa tabel ini webhook menjawab 503 dan tab admin
-- menampilkan petunjuk menjalankan migrasi ini.
--
-- Skema saja, aman dijalankan ulang (CREATE TABLE IF NOT EXISTS, INSERT IGNORE; tanpa ALTER, tanpa prosedur, tanpa
-- information_schema), jadi bisa diimpor lewat phpMyAdmin. Tidak bergantung pada migrasi lain. Boleh dijalankan
-- sebelum atau sesudah deploy kodenya:
--   C:/xampp/mysql/bin/mysql.exe -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-29_049_waha_whatsapp_bot.sql
-- ============================================================================

SET NAMES utf8mb4;

-- Pesan yang sudah diproses (dedup webhook). Primary key = penanda; INSERT IGNORE yang tidak menambah baris = ganda.
CREATE TABLE IF NOT EXISTS waha_seen (
  message_key  CHAR(64) NOT NULL,                       -- sha256 hex dari payload.id WAHA
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (message_key),
  KEY idx_waha_seen_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Status per chat WhatsApp (satu baris per chat klien).
CREATE TABLE IF NOT EXISTS waha_chats (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  chat_id         VARCHAR(100) NOT NULL,                -- id chat WAHA: 628…@c.us atau …@lid
  phone           VARCHAR(20) NULL,                     -- nomor berkode negara (angka saja) bila diketahui
  name            VARCHAR(100) NULL,                    -- nama profil WhatsApp klien
  history         MEDIUMTEXT NULL,                      -- JSON [{role, content}]: 12 pesan terakhir untuk Nexa AI
  last_message    VARCHAR(1000) NULL,                   -- pesan klien terakhir
  last_in_at      DATETIME NULL,                        -- waktu pesan klien terakhir
  paused_until    DATETIME NULL,                        -- bot dijeda sampai waktu ini (NULL / lewat = bot aktif)
  handoff_status  VARCHAR(12) NOT NULL DEFAULT '',      -- '' | 'menunggu' | 'ditangani' | 'selesai'
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_waha_chat (chat_id),
  KEY idx_waha_chat_phone (phone),
  KEY idx_waha_chat_handoff (handoff_status, paused_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Log alih ke admin manusia (tab admin Tanya Nexa).
CREATE TABLE IF NOT EXISTS waha_handoffs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  chat_id     VARCHAR(100) NOT NULL,
  phone       VARCHAR(20) NULL,
  name        VARCHAR(100) NULL,
  reason      VARCHAR(20) NOT NULL,                     -- 'permintaan' | 'website' | 'ai_memutuskan' | 'ai_mati' |
                                                        -- 'ai_gagal' | 'ai_batas' | 'batas'
  message     VARCHAR(1000) NULL,                       -- pesan klien yang memicu
  status      VARCHAR(12) NOT NULL DEFAULT 'menunggu',  -- 'menunggu' | 'ditangani' | 'selesai'
  notified    TINYINT(1) NOT NULL DEFAULT 0,            -- 1 = notifikasi ke nomor WA admin terkirim
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  handled_at  DATETIME NULL,                            -- admin membalas manual dari nomor bisnis
  closed_at   DATETIME NULL,                            -- selesai (tombol admin atau perintah SELESAI)
  KEY idx_waha_handoff_chat (chat_id, status),
  KEY idx_waha_handoff_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-29_049', 'waha_seen, waha_chats, waha_handoffs: chatbot WhatsApp lewat WAHA (dedup, jeda bot, log alih ke admin)');
