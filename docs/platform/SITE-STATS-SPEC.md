# Statistik kunjungan situs pembeli (CMS `/akun/situs/:id/statistik`)

Permintaan pemilik (2026-10-27): "pada halaman cms buat fitur statistik kunjungan secara detail buat dalam bentuk grafik".

Setiap situs pembeli (semua template, gratis) mencatat kunjungannya sendiri. Pembeli melihatnya di CMS dalam bentuk
grafik: tren harian, sumber kunjungan, perangkat, jam ramai, hari ramai, halaman terpopuler, dan situs perujuk.
Pencatatan tanpa cookie dan **tanpa menyimpan alamat IP**; yang disimpan hanya angka agregat per hari.

## 1. Data (migrasi `2026-10-27_031_site_stats.sql`)

```sql
CREATE TABLE IF NOT EXISTS site_visit_stats (
  site_id   INT NOT NULL,                       -- template_sites.id
  day       DATE NOT NULL,                      -- tanggal Asia/Jakarta (WIB)
  metric    VARCHAR(10) NOT NULL,               -- 'total' | 'page' | 'hour' | 'source' | 'referrer' | 'device' | 'browser'
  dim       VARCHAR(191) NOT NULL DEFAULT '',   -- total: ''; page: path; hour: '00'..'23'; source: kunci grup;
                                                -- referrer: host atau 'utm:{utm_source}'; device: desktop|mobile|tablet; browser: nama
  views     INT UNSIGNED NOT NULL DEFAULT 0,    -- tampilan halaman
  visits    INT UNSIGNED NOT NULL DEFAULT 0,    -- kunjungan (halaman pertama satu sesi browser)
  visitors  INT UNSIGNED NOT NULL DEFAULT 0,    -- pengunjung unik hari itu (hanya metric total dan device)
  PRIMARY KEY (site_id, day, metric, dim),
  KEY idx_site_visit_metric (site_id, metric, day)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Penanda pengunjung unik per hari: hash, bukan IP. Baris > 2 hari dihapus berkala.
CREATE TABLE IF NOT EXISTS site_visitors (
  site_id  INT NOT NULL,
  day      DATE NOT NULL,
  visitor  CHAR(16) NOT NULL,                   -- 16 hex pertama sha256(AUTH_SECRET|site_id|day|ip|user_agent)
  PRIMARY KEY (site_id, day, visitor)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Juga `INSERT IGNORE INTO schema_migrations` versi `2026-10-27_031`, `database/schema.sql` (tabel + baseline),
`database/README.md`. Tanpa ALTER, tanpa prosedur. Kode tahan tabel belum ada (errno 1146): pencatatan diam-diam
dilewati, dasbor menjawab 503 `STATS_NOT_READY` ("Statistik belum siap. Coba lagi nanti.").

## 2. Pencatatan: aksi publik `site_visit` (POST)

Input: `{site_id, path, referrer, utm_source, first}`. Jawaban selalu `{success: true}` (juga saat tidak dihitung),
supaya tidak bisa dipakai menebak.

Dihitung hanya bila **semua** terpenuhi:
- situs ada dan `status='active'`;
- host dari header `Origin` (atau, bila kosong, `Referer`) sama dengan domain situs atau varian `www.`-nya — pratinjau di
  garudanexa.com, demo, localhost, dan panggilan dari situs lain tidak dihitung;
- user-agent bukan perayap (`SP_BOT_PATTERN`, ditambah `headless|lighthouse|pingdom|uptime`) dan tidak kosong;
- batas laju per IP 600/jam (pola `rate_limit_wait/hit` / `createLimiter`); lewat batas = tidak dihitung. Kunci
  `sv|{HMAC-SHA256(AUTH_SECRET, ip)}` dengan IPv6 per prefiks /64 (`nexa_ip_bucket` / `nexaIpBucket`), supaya nama berkas
  batas laju PHP di folder temp tidak memuat atau bisa dicocokkan ke alamat IP (`ip_limit_key` di api.php, juga dipakai
  `site_post_view`); berkas batas laju yang kedaluwarsa dihapus `rate_limit_prune` (maks. 200 per panggilan) bersama
  pembersihan `site_visitors` di bawah;
- `path` adalah rute yang memang tampil di situs itu (sama dengan `CustomerSite`): `/` selalu; `/berita` dan `/pengumuman`
  hanya bila fitur Berita & Pengumuman aktif (`sa_posts_enabled` / `postsEnabled`); `/berita/{slug}` dan
  `/pengumuman/{slug}` juga hanya bila ada tulisan terbit dengan jenis dan slug itu. Path lain (halaman tidak ditemukan,
  garis miring di akhir, path buatan skrip) tidak dihitung, jadi tidak membuat baris `page` baru.

Normalisasi (pakai helper yang sudah ada di `backend/modules/visits.php|js`):
- `path`: `visit_landing_path` (path tanpa query/fragment), lalu harus salah satu rute di atas.
- `referrer`: `visit_referrer_host`; host sama dengan domain situs (atau www) = tidak ada perujuk.
- `utm_source`: `visit_utm_source`.
- Perangkat & browser: `parse_user_agent` (Desktop/Mobile/Tablet → `desktop`/`mobile`/`tablet`).
- Hari & jam: waktu server dikonversi ke Asia/Jakarta (UTC+7, tanpa musim panas) di kode, bukan di MySQL.

Grup sumber (`source`, urutan tetap untuk tampilan):
| Kunci | Label | Aturan (host perujuk / utm_source) |
|---|---|---|
| `mesin_pencari` | Mesin pencari | `google.*`, `bing.com`, `duckduckgo.com`, `yahoo.com`, `search.yahoo.com`, `yandex.*`, `ecosia.org`, `baidu.com` |
| `media_sosial` | Media sosial | `facebook.com`, `m.facebook.com`, `l.facebook.com`, `lm.facebook.com`, `instagram.com`, `l.instagram.com`, `t.co`, `x.com`, `twitter.com`, `tiktok.com`, `youtube.com`, `linkedin.com`, `lnkd.in`, `threads.net`, `pinterest.com`, `wa.me`, `web.whatsapp.com`, `whatsapp.com`, `t.me`, `telegram.org`; atau `utm_source` ∈ {facebook, instagram, tiktok, whatsapp, wa, twitter, x, youtube, linkedin, telegram} |
| `ai` | Asisten AI | `chatgpt.com`, `perplexity.ai`, `gemini.google.com`, `copilot.microsoft.com`, `claude.ai` |
| `lainnya` | Situs lain | perujuk/utm lain |
| `langsung` | Langsung | tanpa perujuk dan tanpa utm |

(`gemini.google.com` dicek sebelum `google.*`.)

Penambahan per peristiwa (satu `INSERT … ON DUPLICATE KEY UPDATE` per baris):
- selalu: `total ''`, `page {path}`, `hour {HH}` → `views + 1`, dan `visits + 1` bila `first`;
- hanya bila `first` (halaman pertama sesi): `source {grup}`, `referrer {host|utm:x}` (bila ada), `device {d}`,
  `browser {nama}` → `visits + 1` (views tetap 0);
- batas perujuk: paling banyak 200 baris `referrer` berbeda per situs per hari. Perujuk yang sudah punya baris hari itu
  tetap ditambah; perujuk baru setelah batas dicatat di baris `referrer '*'` (tidak pernah dihasilkan normalisasi),
  yang di dasbor tampil sebagai "Perujuk lain". Grup `source` tetap dihitung dari perujuk aslinya;
- pengunjung unik: `INSERT IGNORE site_visitors`; bila barisnya baru → `total ''` dan `device {d}` `visitors + 1`.
- Pembersihan: ±1 dari 50 permintaan menghapus `site_visitors` dengan `day < hari ini − 2` (`LIMIT 1000`).

Klien (`src/templates/CustomerSite.tsx`, hanya domain pembeli — **bukan** `SitePreview`, demo, atau pratinjau CMS):
- satu panggilan per rute yang ditampilkan (beranda, daftar, tulisan; bukan "tidak ditemukan"), setelah rute siap;
- `first` = belum ada penanda sesi di `sessionStorage` (`gn-site-visit`), lalu penanda diset (try/catch);
- `referrer` = `document.referrer`, `utm_source` dari query halaman pertama;
- `fetch` POST `keepalive: true`, galat diabaikan, tidak memblokir render.

## 3. Dasbor: aksi pembeli `customer_get_site_stats` (GET)

Input: `site_id`, `range` ∈ {7, 30, 90, 365} (bawaan 30; lainnya → 400 `VALIDATION` `errors.range`). Situs milik pembeli
(status apa pun) — bukan miliknya → 404 `SITE_NOT_FOUND`.

```ts
interface SiteStatsResponse {
  range: 7 | 30 | 90 | 365;
  from: string;            // YYYY-MM-DD (WIB), to − range + 1
  to: string;              // hari ini WIB
  totals: { views: number; visits: number; visitors: number };
  previous: { views: number; visits: number; visitors: number };  // periode sama panjang tepat sebelum from
  today: { views: number; visits: number; visitors: number };
  daily: { day: string; views: number; visits: number; visitors: number }[];  // setiap hari from..to, 0 bila kosong
  pages: { path: string; title: string | null; views: number }[];           // 10 teratas
  sources: { key: string; label: string; visits: number }[];                // semua grup, urutan §2
  referrers: { host: string; visits: number }[];                            // 10 teratas (utm:x → "x (utm)", '*' → "Perujuk lain")
  devices: { key: 'desktop' | 'mobile' | 'tablet'; label: string; visits: number; visitors: number }[];
  browsers: { name: string; visits: number }[];                             // 6 teratas
  hours: { hour: number; views: number }[];                                 // 24 baris, 0–23 WIB
  tracking_since: string | null;                                            // hari pertama ada data
}
```
- `pages.title`: `/` → "Beranda", `/berita` → "Berita", `/pengumuman` → "Pengumuman", `/berita/{slug}` dan
  `/pengumuman/{slug}` → judul tulisan bila ada di `site_posts` situs itu, selain itu `null`.
- `visitors` total = jumlah pengunjung unik harian (dijelaskan di UI: "dihitung per hari").
- Rate limit baca: 120/jam per pengguna (`ss-read|{user}`).
- Tipe ada di `src/types/siteStats.ts`.

## 4. Halaman CMS `/akun/situs/:siteId/statistik`

- `SiteNav`: pil baru **Statistik** (setelah SEO), untuk semua template. Breadcrumb "Statistik".
- Pemilih rentang (segmented, `aria-pressed`): 7 hari · 30 hari · 90 hari · 12 bulan. Tersimpan di query `?rentang=`.
- Kartu ringkasan: Tampilan halaman, Kunjungan, Pengunjung unik, Hari ini — masing-masing dengan perubahan % terhadap
  periode sebelumnya (naik hijau, turun merah, "baru" bila sebelumnya 0).
- Grafik (`recharts`, dimuat lazy bersama halaman):
  1. **Tren** — area chart harian tampilan halaman + pengunjung unik (legend yang bisa disembunyikan per seri); 12 bulan
     → titik mingguan (dijumlah per minggu Senin–Minggu). Tooltip tanggal Indonesia.
  2. **Sumber kunjungan** — bar horizontal dengan persentase.
  3. **Perangkat** — donut (Komputer / HP / Tablet) + legenda persen.
  4. **Jam ramai** — bar 24 jam (WIB), jam tertinggi disorot.
  5. **Hari ramai** — bar Senin–Minggu (dihitung di klien dari `daily`).
- Tabel: Halaman terpopuler (judul/path, tampilan, bar proporsi; tautan buka di tab baru ke `https://{domain}{path}`),
  Situs perujuk, Browser.
- Aksesibilitas: setiap grafik punya judul, ringkasan teks (mis. "Tertinggi Selasa, 120 tampilan"), dan tombol
  "Lihat sebagai tabel" yang menampilkan data yang sama dalam `<table>`; warna tidak menjadi satu-satunya pembeda.
- "Unduh CSV" data harian rentang ini (`statistik-{domain}-{from}-{to}.csv`, UTF-8 BOM, pemisah koma).
- Kosong (belum ada data): penjelasan "Statistik mulai tercatat saat pengunjung membuka situs Anda di {domain}.
  Kunjungan dari pratinjau CMS tidak dihitung." Catatan privasi di bawah: "Tanpa cookie. Alamat IP tidak disimpan."
- Galat 503 `STATS_NOT_READY` → keadaan galat dengan Coba lagi. Layout HP: kartu 2 kolom, grafik selebar layar.
- Kartu situs di `/akun` (Beranda & Situs saya): tautan "Statistik" ke halaman ini.

## 5. Tes

- Backend PHP=Node (dua server): pencatatan dihitung hanya dengan Origin domain situs; bot, situs nonaktif, Origin lain,
  path tidak sah atau bukan rute yang tampil (tanpa fitur, tulisan tidak terbit/jenis lain, path buatan) → tidak
  dihitung tetapi tetap `{success:true}`; kunci batas laju (HMAC, IPv6 /64) PHP = Node dan nama berkasnya tanpa IP;
  `first` menambah visits/source/device/browser; pengunjung unik per hari; grup sumber; dasbor (rentang, isi 0, previous,
  pages.title, kepemilikan, validasi, 503 tabel belum ada); paritas jawaban.
- Klien: halaman statistik (data, kosong, galat, pergantian rentang, tabel aksesibel, CSV), SiteNav pil, CustomerSite
  memanggil `site_visit` sekali per rute dengan `first` benar dan tidak memanggil di SitePreview/demo.
