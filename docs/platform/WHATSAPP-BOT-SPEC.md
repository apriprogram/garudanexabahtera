# Bot WhatsApp lewat WAHA (jawab otomatis + alih ke admin manusia)

Permintaan pemilik (2026-10-29): webhook agar garudanexa.com terhubung ke chatbot WhatsApp lewat
[WAHA (WhatsApp HTTP API)](https://waha.devlike.pro/docs/overview/introduction/). Klien yang menulis ke nomor WhatsApp
bisnis dijawab otomatis oleh Nexa AI. Bila AI tidak berfungsi, atau klien benar-benar ingin bicara dengan admin, chat
dialihkan ke admin manusia: nomor WA admin menerima notifikasi "klien butuh respons admin (human)" dan bot diam di chat
itu sampai admin selesai.

Kode: `backend/modules/waha.php` (produksi cPanel) = `backend/modules/waha.js` (Node), dipanggil dari `backend/api.php`
dan `backend/server.js`. Jawaban AI memakai penyedia tab admin **Tanya Nexa** lewat `nexa_live_context` /
`nexa_provider_reply` di `nexa.php` (= `nexaLiveContext` / `nexaProviderReply` di `nexa.js`), sama dengan widget
Nexa di situs. Panel admin: `src/pages/admin/nexa/WhatsAppBotPanel.tsx` di tab Tanya Nexa.

## 1. Alur singkat

```
klien ──WhatsApp──▶ nomor bisnis (session WAHA) ──POST event──▶ /api.php?action=waha_webhook
                                                                   │ 1. HMAC sah? (WAHA_HMAC_KEY)        tidak → 401
                                                                   │ 2. bot aktif, event message/message.any, session
                                                                   │    sama, chat pribadi, pesan < 1 jam  tidak → 200 ignored
                                                                   │ 3. id pesan belum pernah diproses      ganda → 200 ignored
                                                                   │ 4. jawab 200, lalu proses:
                                                                   ▼
      fromMe dari API (kiriman bot) → abaikan · fromMe dari aplikasi (admin membalas manual) → jeda bot
      dari nomor admin → hanya perintah SELESAI · chat sedang dijeda → diam (pesan diteruskan ke admin)
      minta admin / AI mati / AI gagal / AI [[ADMIN]] / batas pesan → ALIH KE ADMIN · selain itu → JAWABAN AI
```

## 2. Data (migrasi `2026-10-31_054_waha_whatsapp_bot.sql`)

- `waha_seen (message_key CHAR(64) PK, created_at)`: sha256 dari `payload.id` WAHA. Yang disimpan hash, bukan id-nya,
  karena id WhatsApp memuat nomor telepon. `INSERT IGNORE` yang tidak menambah baris berarti pesan ganda. Retry WAHA,
  atau event `message` dan `message.any` untuk pesan yang sama, jadi diproses sekali. Setiap pesan baru menghapus maks. 50
  baris yang lebih tua dari 3 hari.
- `waha_chats` (satu baris per chat):
  - `chat_id` unik, `phone` (angka, bila diketahui), `name` (nama profil WhatsApp);
  - `history`: JSON 12 pesan terakhir untuk AI. Riwayat diabaikan bila pesan klien terakhir lebih dari 24 jam lalu;
  - `last_message`, `last_in_at`;
  - `paused_until`: bot dijeda sampai waktu ini;
  - `handoff_status`: `''` | `menunggu` | `ditangani` | `selesai`.
- `waha_handoffs` (log alih ke admin): `chat_id`, `phone`, `name`, `reason`, `message`, `status`, `notified`,
  `created_at`, `handled_at`, `closed_at`.

Skema saja, aman dijalankan ulang (CREATE TABLE IF NOT EXISTS, INSERT IGNORE), boleh sebelum atau sesudah deploy kode.
Juga di `database/schema.sql` (tabel + baseline) dan `database/README.md`. Tanpa tabel ini webhook menjawab 503
`WAHA_NOT_READY` (WAHA mengulang sesuai kebijakan retry) dan tab admin menampilkan petunjuk menjalankan migrasi.

## 3. Webhook `waha_webhook` (publik, POST)

- **URL**: `https://garudanexa.com/api.php?action=waha_webhook`. Pakai domain tanpa `www`, karena `www` dialihkan 301 dan
  POST bisa berubah jadi GET.
- **Tanda tangan**: `X-Webhook-Hmac` = HMAC-SHA512 heksadesimal (huruf besar/kecil diterima) atas body mentah dengan
  kunci `WAHA_HMAC_KEY`. `X-Webhook-Hmac-Algorithm` boleh kosong atau `sha512`; selain itu ditolak. Dibandingkan
  waktu-konstan (`hash_equals` / `timingSafeEqual`). Contoh resmi WAHA (body
  `{"event":"message","session":"default","engine":"WEBJS"}`, kunci `my-secret-key`) ada di tes.
  - Tanpa `WAHA_HMAC_KEY` di server → 503 `WAHA_OFFLINE`; tidak ada pesan yang diproses tanpa tanda tangan.
  - Tanda tangan salah → 401 `WAHA_SIGNATURE`. Setelah 20 kali per IP dalam 15 menit → 429. Permintaan bertanda tangan
    sah tidak pernah ditahan batas ini, jadi IP yang salah dikenali di belakang proxy tidak memutus WAHA.
- **Diabaikan** (200 `{success: true, ignored}`):
  - `disabled`: saklar bot mati;
  - `event`: selain `message` / `message.any`;
  - `session`: session lain;
  - `payload`: id atau chat tidak ada;
  - `chat`: grup `@g.us`, status/siaran `@broadcast`, saluran `@newsletter`;
  - `stale`: `payload.timestamp` lebih dari 1 jam lalu, mis. WAHA menyusulkan pesan lama setelah putus;
  - `not_configured`: belum ada alamat WAHA;
  - `duplicate`: pesan ganda.
- **Diterima** → 200 `{success: true, accepted: true}` lebih dulu. PHP memutus sambungan dengan
  `litespeed_finish_request()` / `fastcgi_finish_request()` lalu memproses (AI bisa beberapa detik); Node memproses di
  latar setelah `res.json`. Galat proses hanya dicatat di log (`[waha] …`).
- Chat `@s.whatsapp.net` dibaca sebagai `@c.us`; nomor perangkat (`628…:12@c.us`) dibuang.
- Pesan dari nomor bisnis (`fromMe`) memakai `payload.to` sebagai chat.

## 4. Rute pesan

| Kondisi | Tindakan |
|---|---|
| `fromMe` + `source: "api"` (kiriman bot sendiri) | diabaikan |
| `fromMe` dari aplikasi (admin membalas manual dari nomor bisnis) | bot dijeda `waha_pause_hours`; alih ke admin yang `menunggu` → `ditangani` |
| dari nomor admin | hanya `SELESAI` / `SELESAI <nomor>` yang diproses; pesan lain diam (tidak dijawab AI, tidak ada balas-balasan) |
| chat sedang dijeda | bot diam; selama `menunggu`, pesan klien diteruskan ke admin ("💬 Pesan lanjutan…", maks. 5/jam per chat) |
| klien minta admin (§6) | alih ke admin, alasan `permintaan` atau `website` |
| pesan tanpa teks (foto, stiker, voice note) | "Maaf, saya baru bisa membaca pesan teks… ketik *ADMIN*…" |
| batas 20 jawaban AI per chat per jam / 60 per hari | alih ke admin, alasan `batas` |
| batas harian semua chat (`WAHA_DAILY_LIMIT`, bawaan 500) | alih ke admin, alasan `ai_batas` |
| penyedia AI belum diatur / gagal / jawaban kosong | alih ke admin, alasan `ai_mati` / `ai_gagal` |
| AI menjawab `[[ADMIN]]` | alih ke admin, alasan `ai_memutuskan` |
| selain itu | jawaban AI |

**Jawaban AI.**
- Instruksi Nexa yang sama dengan widget, ditambah aturan kanal WhatsApp (`WAHA_CHANNEL_INSTRUCTIONS`):
  - lebih ringkas;
  - jangan menyarankan WhatsApp atau `wa.me`;
  - tanpa kode `[proyek:…]`;
  - balas hanya `[[ADMIN]]` untuk permintaan bicara dengan admin/manusia, status pesanan, pembayaran, atau proyek,
    keluhan, dan keputusan yang hanya bisa diberikan tim.
- Teks AI diubah untuk WhatsApp (`waha_format_reply`):
  - `**tebal**` → `*tebal*`;
  - path situs (`/harga`, `/template/…`, …) → `https://garudanexa.com/…`;
  - `[teks](url)` → `teks (url)`;
  - judul markdown dan kode proyek dibuang;
  - maks. 4000 karakter.
- Sebelum membalas, bot menandai chat dibaca (`POST /api/sendSeen`, anjuran WAHA agar nomor tidak diblokir), lalu
  `POST /api/sendText` `{session, chatId, text}` dengan header `X-Api-Key`.
- Jawaban pertama satu percakapan ditutup "Ketik *ADMIN* kapan saja untuk bicara dengan admin kami."
- Saklar widget situs (`nexa_enabled`) tidak berlaku untuk WhatsApp; WhatsApp punya saklar sendiri (`waha_enabled`).

## 5. Alih ke admin manusia

1. `waha_chats` dijeda `waha_pause_hours` (bawaan 12 jam, 1–72), `handoff_status = menunggu`.
2. Klien menerima: "Terima kasih sudah menghubungi Garuda Nexa. Pesan Anda sudah kami teruskan ke admin, dan admin kami
   akan segera membalas Anda."
3. Nomor admin (`waha_admin_number` / `WAHA_ADMIN_NUMBER`) menerima, maks. 60 notifikasi per jam:

   ```
   🔔 *Klien butuh respons admin (human)*
   Nama: Budi
   Nomor: +6282222222222
   Alasan: Klien minta bicara dengan admin
   Pesan terakhir:
   > Hai
   > ADMIN

   Balas klien: https://wa.me/6282222222222

   Bot dijeda untuk chat ini selama 12 jam. Bila sudah selesai, balas *SELESAI 6282222222222* agar bot aktif lagi.
   ```

   Klien `@lid` (WhatsApp menyembunyikan nomornya): nomor dicari lewat `GET /api/{session}/lids/{lid}`. Bila tetap
   tidak ada, notifikasi menyebut ID privasinya dan admin membalas lewat chat WhatsApp bisnis.
4. Baris `waha_handoffs` dicatat. `notified = 1` bila WAHA menerima notifikasinya.

**Bot aktif lagi** saat salah satu terjadi:
- jeda habis;
- admin menekan **Selesai, aktifkan bot** di log tab Tanya Nexa (`waha_close_handoff`);
- nomor admin mengirim `SELESAI <nomor>`. Format `0812…` diterima. Tanpa nomor: bila hanya satu chat menunggu, chat itu
  diaktifkan; bila lebih, bot membalas daftarnya.

Balasan manual admin dari nomor bisnis (aplikasi WhatsApp/HP yang sama dengan session WAHA) memperpanjang jeda.
WAHA hanya mengirim event itu bila session berlangganan `message.any`.

## 6. "Tombol" hubungi admin

- **Di WhatsApp**: klien mengetik **ADMIN**. Juga dianggap permintaan admin:
  - satu kata kunci, boleh ditemani "tolong/dong/please": `admin`, `cs`, `manusia`, `human`, `operator`, `petugas`,
    `agent`, `agen`;
  - frasa jelas: "bicara dengan admin", "hubungkan ke admin", "customer service", "bicara dengan orang", "bukan bot",
    "talk to a human", dan seterusnya (`WAHA_ADMIN_PHRASES`).
  - Sapaan seperti "halo admin" tetap dijawab AI (pemilik: alihkan hanya bila klien *benar-benar* ingin admin); AI
    sendiri boleh memutuskan `[[ADMIN]]`.
  - Tombol interaktif WhatsApp tidak dipakai: dokumentasi WAHA menandai `sendButtons` "DEPRECATED - Buttons do not work
    at the moment!" dan pesan daftar "may stop working at any time".
- **Di widget Nexa situs**:
  - Chip topik **Hubungi admin** membuka `wa.me/<nomor WhatsApp situs>` dengan pesan awal
    `NEXA_ADMIN_WA_TEXT` (`src/components/layout/nexa/adminHandoff.ts`): "Halo Admin Garuda Nexa, saya butuh bantuan
    admin (dari chat Nexa di website)."
  - Tombol "Chat WhatsApp" pada jawaban bawaan (kontak, pertanyaan yang belum terjawab) memakai pesan yang sama,
    ditambah "Pertanyaan saya: …".
  - Begitu pengunjung mengirimnya, bot mengenali frasa "butuh bantuan admin" + "dari chat Nexa" (alasan `website`) dan
    memicu notifikasi admin yang sama.
  - Syaratnya: nomor WhatsApp di footer situs (`footer_whatsapp`) adalah nomor bisnis yang terhubung ke WAHA. Tanpa
    bot, pesan awal itu tetap jelas bagi admin yang membacanya.

## 7. Pengaturan

| Isian tab Tanya Nexa (`hero_settings`) | Cadangan `.env` | Catatan |
|---|---|---|
| Jawab otomatis (`waha_enabled`) | – | bawaan aktif |
| Alamat WAHA (`waha_url`) | `WAHA_URL` | `http(s)://host[:port][/path]`, tanpa query/userinfo |
| API key (`waha_api_key`) | `WAHA_API_KEY` | lihat aturan di bawah tabel |
| Session (`waha_session`) | `WAHA_SESSION` | huruf/angka/`-`/`_`, bawaan `default` |
| Nomor WhatsApp admin (`waha_admin_number`) | `WAHA_ADMIN_NUMBER` | 8–15 angka, `0812…` → `62812…`; harus beda dengan nomor bot |
| Lama jeda bot (`waha_pause_hours`) | – | 1–72 jam, bawaan 12 |
| – | `WAHA_HMAC_KEY` | **hanya .env**, rahasia, sama dengan `hmac.key` session WAHA |
| – | `WAHA_DAILY_LIMIT` | jawaban AI per hari semua chat, bawaan 500 |

**API key.**
- Hanya tampil bertopeng 4 karakter terakhir.
- Kunci yang tersimpan dihapus bila alamat pindah server tanpa kunci baru.
- `WAHA_API_KEY` dari .env hanya dikirim ke server `WAHA_URL`. Kunci tidak pernah terkirim ke alamat lain yang diisi di
  admin.

Setting `waha_*` tidak ikut `get_settings` publik dan ditolak di `update_settings` (403). Tombol **Kirim pesan uji ke
admin** (`waha_test`) mengirim pesan ke nomor admin dengan pengaturan tersimpan. Pesan galatnya menyebut sebab umum:
server tidak terjangkau, API key ditolak (401), session tidak ada (404), atau session belum dipindai QR (422).

## 8. Pemasangan

1. Jalankan migrasi 054 (phpMyAdmin atau `mysql < database/migrations/2026-10-31_054_waha_whatsapp_bot.sql`).
2. `.env` server: isi `WAHA_HMAC_KEY` (kunci dari pemilik; jangan di-commit). Opsional: `WAHA_URL`, `WAHA_API_KEY`,
   `WAHA_SESSION`, `WAHA_ADMIN_NUMBER`. Isian non-rahasia juga bisa lewat tab Tanya Nexa.
3. Session WAHA (dasbor WAHA atau `POST /api/sessions` / `PUT /api/sessions/{session}`):

   ```json
   {
     "name": "default",
     "config": {
       "webhooks": [
         {
           "url": "https://garudanexa.com/api.php?action=waha_webhook",
           "events": ["message", "message.any"],
           "hmac": { "key": "<sama dengan WAHA_HMAC_KEY>" },
           "retries": { "policy": "exponential", "delaySeconds": 2, "attempts": 5 }
         }
       ]
     }
   }
   ```

   Pindai QR dengan WhatsApp nomor bisnis, lalu tekan **Kirim pesan uji ke admin** di tab Tanya Nexa.
4. Penyedia AI di tab Tanya Nexa harus aktif. Tanpa penyedia, setiap chat baru langsung dialihkan ke admin (`ai_mati`).
5. Bila log WAHA menunjukkan webhook dijawab HTML 403/503 (tantangan Cloudflare untuk permintaan server), buat aturan
   WAF "skip" untuk URL `/api.php` dengan query `action=waha_webhook`. Keamanannya tetap dijaga tanda tangan HMAC.

## 9. Uji lokal dengan WAHA tiruan (`scripts/waha-mock.mjs`)

```bash
# API PHP worktree (contoh port 8099) + WAHA tiruan (3999); kunci HMAC diambil dari .env
WAHA_URL=http://127.0.0.1:3999 WAHA_API_KEY=mock WAHA_ADMIN_NUMBER=6281111111111 php -S 127.0.0.1:8099 -t backend
WAHA_API_KEY=mock node --env-file=.env scripts/waha-mock.mjs serve --port 3999 --webhook "http://127.0.0.1:8099/api.php?action=waha_webhook"
# kirim pesan klien / balasan manual admin / perintah admin
node --env-file=.env scripts/waha-mock.mjs send --webhook "http://127.0.0.1:8099/api.php?action=waha_webhook" --from 6282222222222 --name Budi --text "ADMIN"
node --env-file=.env scripts/waha-mock.mjs send --webhook "…" --from 6282222222222 --from-me --source app --text "Halo, saya admin"
node --env-file=.env scripts/waha-mock.mjs send --webhook "…" --from 6281111111111 --text "SELESAI 6282222222222"
```

WAHA tiruan mencetak setiap `sendText`/`sendSeen` dan memantulkan kiriman API sebagai `message.any`
(`fromMe`, `source: "api"`), sama seperti WAHA asli.

Diuji 2026-10-29 di DB lokal:
- tanda tangan salah → 401;
- ADMIN → alih ke admin + notifikasi;
- kiriman ulang → `duplicate`;
- pesan lanjutan diteruskan;
- balasan manual → `ditangani`;
- grup diabaikan;
- `SELESAI` → bot aktif;
- pertanyaan → jawaban Gemini berformat WhatsApp;
- pesan uji dari tab admin terkirim.

## 10. Tes

- `__tests__/backend/waha.test.ts`: fungsi murni dan alur lengkap dijalankan di PHP CLI dan Node, lalu dibandingkan.
  - Alur lengkap memakai database tiruan bernaskah, WAHA tiruan, dan AI tiruan.
  - Mencakup HMAC, pesan ganda, rute AI vs admin, jeda, perintah SELESAI, `@lid`, dan aksi admin.
- `src/pages/admin/__tests__/whatsappBotPanel.test.tsx`: panel admin.
- `src/components/layout/__tests__/chrome.test.tsx`: chip Hubungi admin & tautan WhatsApp jawaban bawaan.

## 11. Catatan

- Nama profil diambil dari `_data` per engine (WEBJS `notifyName`, NOWEB `pushName`, GOWS `Info.PushName`).
- Teks bawaan (pemberitahuan alih ke admin, pesan media) berbahasa Indonesia. Jawaban AI mengikuti bahasa klien.
- Node (`server.js`) setara dengan PHP. Batas laju Node ada di memori proses, PHP di berkas sementara (`rate_limit_*`).
