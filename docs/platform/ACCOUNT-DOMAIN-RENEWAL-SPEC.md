# Domain berbayar, masa aktif, perpanjangan, nota, dan profil pembeli

Kontrak bersama untuk `backend/modules/templates.php` = `templates.js` (dan modul baru `domains.*`, `account.*`), frontend
akun (`src/pages/account/**`), halaman pesan (`/pesan/:slug`), halaman Harga, dan panel admin. Melengkapi SPEC.md §6.

## 0. Keputusan pemilik (2026-10-25)

1. Domain **tidak lagi termasuk** harga template. Domain dipilih saat memesan, ketersediaannya dicek langsung, dan
   harganya ditambahkan ke total pesanan. Harga template tetap mencakup template + setup awal, hosting, dan SSL tahun
   pertama.
2. Harga domain per tahun (sama untuk tahun pertama dan perpanjangan): **.com Rp250.000, .id Rp250.000, .web.id dan
   .my.id Rp50.000** (dari pemilik). Ekstensi lain memakai harga pasaran (keputusan sesi, bisa diubah di kode):
   .co.id Rp350.000, .net Rp250.000, .org Rp250.000, .biz.id Rp100.000, .or.id Rp100.000, .sch.id Rp75.000,
   .ac.id Rp75.000. "sh.id" dari pemilik diartikan .sch.id (sekolah).
3. Perpanjangan per tahun = **hosting & jasa** (setting `template_hosting_renewal_price`, bawaan Rp500.000, bisa diubah
   admin di Pengaturan website > Harga) **+ harga domain** sesuai ekstensi domain pesanan. Bisa 1, 2, atau 3 tahun
   sekaligus, dibayar lewat Midtrans (simulasi di lokal).
4. Halaman /harga mencantumkan harga domain per ekstensi dan biaya perpanjangan hosting & domain tahun berikutnya,
   dengan penjelasan cara perpanjangan.
5. Akun pembeli: nota resmi (pembelian & perpanjangan), masa aktif + hitung mundur, menu Profil (biodata + foto).

## 1. Harga & aturan domain

Sumber kebenaran: `backend/modules/domains.php` = `domains.js` = `src/lib/domainPricing.ts` (tes `__tests__/backend/domain-renewal.test.ts` memastikan sama, termasuk PHP vs Node end-to-end).

| Ekstensi | Harga/tahun | Catatan pendaftaran |
|---|---|---|
| com | 250000 | |
| id | 250000 | |
| co.id | 350000 | Untuk badan usaha: butuh NIB atau akta perusahaan |
| my.id | 50000 | |
| web.id | 50000 | |
| biz.id | 100000 | |
| net | 250000 | |
| org | 250000 | |
| or.id | 100000 | Untuk organisasi: butuh akta atau SK organisasi |
| sch.id | 75000 | Untuk sekolah: butuh surat keterangan/NPSN sekolah |
| ac.id | 75000 | Untuk perguruan tinggi: butuh SK pendirian |

Urutan tampilan = urutan tabel. Ekstensi dicocokkan dengan akhiran terpanjang ("toko.co.id" → co.id).

Normalisasi input domain (sama di semua tempat): trim, huruf kecil, buang `http://`/`https://`, buang awalan `www.`,
buang path/port/query (`/…`, `:…`, `?…`, `#…`), buang titik di akhir. Domain yang dipesan harus **tepat satu label +
ekstensi yang didukung** (`namabisnis.com`, `toko.co.id`), label 1–63 karakter `[a-z0-9-]`, tidak diawali/diakhiri `-`.
Pesan galat (field `domain`/`domain_primary`):

- kosong: `"<Label> wajib diisi."` (pola pf_str)
- tanpa ekstensi: `"Tambahkan ekstensi domain, mis. .com atau .id."`
- format: `"Format domain tidak valid, contoh: namabisnis.com"`
- ekstensi tidak dijual / subdomain: `"Ekstensi domain belum tersedia. Pilih ekstensi dari daftar."`
  (subdomain seperti `a.b.com` juga memakai pesan ini karena `b.com` bukan ekstensi)

## 1b. DewaBiz (registrar, permintaan pemilik 2026-10-25)

Bila `DEWABIZ_RESELLER_ID` + `DEWABIZ_API_KEY` diisi (`.env`, Basic auth ke `https://api.dewabiz.co.id/v1`, IP server
di-whitelist di dashboard DewaBiz):
- Daftar ekstensi yang dijual = ekstensi aktif dari `GET /account/prices` (semua halaman, cache 6 jam; cache lama dipakai
  bila DewaBiz gagal). Harga beli = maksimum harga registrasi dan perpanjangan 1 tahun.
- Harga jual = harga tetap pemilik (.com/.id 250.000, .my.id/.web.id 50.000) atau harga beli × (100 + markup)% dengan
  markup = setting `domain_markup_percent` (0–500, bawaan 25), dibulatkan ke atas ke Rp1.000, dan **tidak pernah di bawah
  harga beli**. Ekstensi populer (urutan tabel §1) tampil dulu, sisanya urut abjad. Harga beli tidak pernah dikirim.
- Ketersediaan: `GET /domains/availability?domain=` (available 1 = tersedia; 0 atau `is_premium_name` = tidak tersedia).
  Jawaban yang gagal → RDAP (§2) → DNS.
- Aksi publik `get_domain_prices` (GET) → `{source: 'dewabiz'|'default', domains: [{tld, price, requirement}]}`; frontend
  memakainya lewat `src/lib/useDomainPrices.ts` (render awal = tabel bawaan).
- Tanpa kredensial: tabel §1 dan RDAP. Pesan galat ekstensi: "Ekstensi domain belum tersedia. Pilih ekstensi dari daftar."

## 2. Cek ketersediaan (RDAP)

Server bertanya ke RDAP registri (tanpa API berbayar):
- com → `https://rdap.verisign.com/com/v1/domain/<d>`, net → `https://rdap.verisign.com/net/v1/domain/<d>`
- org → `https://rdap.publicinterestregistry.org/rdap/domain/<d>`
- semua ekstensi .id → `https://rdap.pandi.id/rdap/domain/<d>`

HTTP 200 = `taken`, 404 = `available`, lainnya/timeout (6 detik) = `unknown`. Saat `unknown` (tanpa override env)
dicek DNS NS: ada NS = `taken`, tidak ada = tetap `unknown`. Env `DOMAIN_RDAP_URL` (untuk tes): `off` = selalu
`unknown` tanpa jaringan; selain itu templat URL dengan `{domain}` (mis. `http://127.0.0.1:9999/domain/{domain}`,
http diizinkan hanya lewat override ini) untuk semua ekstensi, tanpa fallback DNS.

## 3. Database (migrasi `2026-10-25_026_domain_renewal_profile.sql`, juga di schema.sql)

- `users`: `company_name VARCHAR(150) NULL`, `address VARCHAR(255) NULL`, `city VARCHAR(100) NULL` (setelah `phone`).
  `avatar` pembeli = path file (`/assets/avatars/avatar_<12hex>.<ext>` di PHP, URL S3 di Node).
- `template_orders`: `domain_price DECIMAL(15,2) NOT NULL DEFAULT 0` (setelah `discount_code`), `domain_check
  VARCHAR(20) NULL` (hasil cek saat dipesan: available/unknown), `service_started_at`, `service_expires_at`,
  `domain_started_at`, `domain_expires_at` (DATETIME NULL, setelah `activated_at`). Backfill pesanan `aktif`:
  started = `activated_at`, expires = `activated_at + 1 tahun`. `price` tetap jumlah yang dibayar (template setelah
  diskon + domain). Pesanan lama: `domain_price` 0 (domain dulu termasuk harga template).
- Tabel baru `template_renewals` (lihat migrasi), nomor `GNR-YYYYMMDD-XXXXXX`, Midtrans order_id `<nomor>-<percobaan>`.
- Setting `template_price_includes` di DB: baris `Domain tahun pertama` dihapus (bila ada).

## 4. Aksi API baru / berubah

Semua aksi `customer_*` = CUSTOMER_ACTIONS (token role customer). GET juga boleh untuk `customer_get_profile`,
`customer_get_invoice`, `customer_check_domain`. Bentuk sukses `{success: true, ...}`, galat `{error, code?, errors?}`.

| Aksi | Input | Output | Galat khusus |
|---|---|---|---|
| `customer_check_domain` | `domain` (nama + ekstensi pilihan) | `{check: DomainCheck, checks: DomainCheck[]}`: `checks` = nama yang sama di semua ekstensi (yang diminta dulu), dicek paralel | 400 VALIDATION `{domain}`, 429 (40 cek / 10 menit / akun) |
| `customer_create_order` | + domain wajib ekstensi didukung | + `order.domain_price` | 409 `DOMAIN_UNAVAILABLE` `{domain_primary: "Domain <d> sudah dipakai orang lain. Cek nama lain."}` bila `taken`; 429 setelah 20 cek ketersediaan / 10 menit / akun |
| `customer_get_order` | — | + `renewals: Renewal[]` (terbaru dulu), `renewal: RenewalOffer` | |
| `customer_create_renewal` | `order_number`, `years` (1–3) | `{renewal, payment_url, payment_error?}` | 400 VALIDATION `{years: "Pilih masa perpanjangan 1, 2, atau 3 tahun."}`; 409 `RENEWAL_NOT_AVAILABLE`, `RENEWAL_PENDING`, `RENEWAL_TOO_LONG` |
| `customer_pay_renewal` | `renewal_number` | `{payment_url}` | 404 `RENEWAL_NOT_FOUND`, 409 `INVALID_STATUS`, 409 `PAYMENT_UNDER_REVIEW` (kartu ditinjau bank, `payment_status` capture), 503 `PAYMENT_NOT_CONFIGURED`, 502 `PAYMENT_GATEWAY_ERROR` |
| `customer_cancel_renewal` | `renewal_number` | `{renewal}` | 404, 409 `INVALID_STATUS` |
| `dev_simulate_renewal_payment` | `renewal_number` | `{renewal, order}` | 403 `SIMULATOR_DISABLED`, 404, 409 `INVALID_STATUS` |
| `customer_get_invoice` | `order_number`, `renewal_number?` | `{order, renewal: Renewal\|null, company: CompanySettings}` | 404 `ORDER_NOT_FOUND`/`RENEWAL_NOT_FOUND`, 409 `INVOICE_NOT_AVAILABLE` ("Nota tersedia setelah pembayaran lunas.") |
| `customer_get_profile` | — | `{profile}` | |
| `customer_update_profile` | `name`, `phone`, `company_name?`, `address?`, `city?`, `avatar?` | `{profile}` | 400 VALIDATION per field; 409 `PROFILE_CHANGED` bila foto berubah di tempat lain saat foto baru disimpan |
| `admin_get_domain_pricing` (staf, GET) | — | `{source, markup_percent, markup_default, hosting_renewal_price}` | `domain_markup_percent` tidak ikut `get_settings` publik |
| `admin_get_template_order` | — | + `renewals` (staf) | |
| `midtrans_notification` | order_id `GNR-…` → jalur perpanjangan | | jumlah dicek terhadap `renewal.price` |

Pesan galat perpanjangan (persis):
- bukan aktif: `"Perpanjangan hanya untuk pesanan yang situsnya sudah aktif."` (409 RENEWAL_NOT_AVAILABLE)
- ekstensi tanpa harga: `"Perpanjangan online untuk domain ini belum tersedia. Hubungi kami via WhatsApp."` (409 RENEWAL_NOT_AVAILABLE)
- ada tagihan: `"Masih ada tagihan perpanjangan <nomor> yang belum dibayar. Bayar atau batalkan dulu."` (409 RENEWAL_PENDING)
- lewat batas: `"Masa aktif paling lama 10 tahun ke depan. Pilih masa perpanjangan yang lebih pendek."` (409 RENEWAL_TOO_LONG)
- pesanan/perpanjangan tidak ditemukan: `"Pesanan tidak ditemukan."` / `"Tagihan perpanjangan tidak ditemukan."`

Profil (`customer_update_profile`): `name` wajib 2–100 ("Nama"), `phone` wajib (pf_phone, label "Nomor HP"),
`company_name` ≤150 ("Nama perusahaan"), `address` ≤255 ("Alamat"), `city` ≤100 ("Kota"). `avatar`: kunci tidak
dikirim atau sama dengan yang tersimpan = tidak berubah; `null`/`""` = hapus; data URI PNG/JPG/WEBP ≤ 2 MB = unggah
baru (file lama buatan server dihapus); selain itu 400 `{avatar: "Foto profil tidak valid."}`, format lain
`{avatar: "Foto profil harus JPG, PNG, atau WEBP."}`, terlalu besar `{avatar: "Ukuran foto maksimal 2 MB."}`.
Email tidak bisa diubah di sini.

### Bentuk data

```ts
interface DomainCheck { domain: string; tld: string; status: 'available' | 'taken' | 'unknown'; price: number }
// Order (tambahan): domain_price: number; domain_check: string | null; invoice_number: string | null ("INV-" + order_number bila paid_at ada);
//   service_started_at, service_expires_at, domain_started_at, domain_expires_at: string | null
type RenewalStatus = 'menunggu_pembayaran' | 'lunas' | 'dibatalkan';
interface Renewal {
  id: number; renewal_number: string; order_number: string; domain: string; years: number;
  hosting_price_per_year: number; domain_price_per_year: number; price_per_year: number; price: number;
  status: RenewalStatus; status_label: string; payment_status: string; payment_type: string | null;
  payment_url: string | null; // hanya pemilik & masih menunggu pembayaran
  paid_at: string | null; cancelled_at: string | null;
  service_expires_before: string | null; service_expires_after: string | null;
  domain_expires_before: string | null; domain_expires_after: string | null;
  invoice_number: string | null; // "INV-" + renewal_number bila lunas
  created_at: string;
}
interface RenewalOffer {
  available: boolean; reason: string | null; // reason = pesan RENEWAL_NOT_AVAILABLE bila tidak tersedia
  hosting_price_per_year: number; domain_price_per_year: number | null; price_per_year: number | null; max_years: 3;
  options: { years: number; price: number; service_expires_after: string; domain_expires_after: string }[]; // dihitung DB, opsi > batas 10 tahun tidak ikut
}
interface CustomerProfile { id: number; name: string; email: string; phone: string | null; company_name: string | null;
  address: string | null; city: string | null; avatar: string | null }
```

## 5. Aturan masa aktif & perpanjangan

- Aktivasi (`admin_set_order_domain`): `service_*` dan `domain_*` mulai NOW() dan berakhir NOW() + 1 tahun.
- Lunas perpanjangan: dalam satu transaksi, status perpanjangan → `lunas` (bersyarat), lalu
  `expires = DATE_ADD(GREATEST(COALESCE(expires, NOW()), NOW()), INTERVAL years YEAR)` untuk service & domain;
  nilai sebelum/sesudah disimpan di baris perpanjangan; log `renewal_paid`.
- Satu tagihan perpanjangan menunggu pembayaran per pesanan. Batas: tanggal berakhir baru ≤ NOW() + 10 tahun.
- `paid_midtrans_order_id` = percobaan Midtrans yang melunasi. Setelah lunas, kolom pembayaran hanya berubah oleh
  refund/chargeback percobaan itu; pembayaran lain untuk tagihan yang sudah lunas/dibatalkan → catatan staf "perlu refund
  manual". Snap baru hanya disimpan bila percobaannya masih yang terbaru. Pesanan aktif tanpa tanggal berakhir memakai
  `activated_at + 1 tahun`.
- Midtrans: item `HOST` (hosting & jasa × tahun) + `DOM-<ekstensi>` (domain × tahun); finish callback ke
  `/akun/pesanan/<order_number>` (Midtrans menambah `?order_id=GNR-…`). Gagal/kedaluwarsa (percobaan terkini) →
  `dibatalkan`. Lunas setelah dibatalkan → catatan staf untuk refund manual.
- Log pesanan (template_order_logs, order_id = pesanan induk), catatan yang terlihat pembeli:
  `renewal_created` "Perpanjangan N tahun dibuat (GNR-…).", `renewal_paid` "Perpanjangan N tahun lunas (GNR-…). Masa
  aktif sampai 23 Oktober 2029.", `renewal_cancelled` "Perpanjangan GNR-… dibatalkan." / "…dibatalkan otomatis karena
  pembayaran tidak berhasil.". Hanya staf: `renewal_payment_created`, `renewal_payment_update`.
- Frontend: peringatan bila sisa ≤ 30 hari (kuning), ≤ 7 hari (merah), lewat = "Masa aktif berakhir".

## 6. Nota

Dirender di frontend dari `customer_get_invoice` dengan mesin dokumen proyek (DocModel → DocumentPreview, exportPdf;
kop = `pd_settings.company`). Rute: `/akun/pesanan/:orderNumber/nota` dan `/akun/pesanan/:orderNumber/nota/:renewalNumber`.
Nomor nota: `INV-<nomor pesanan / perpanjangan>`. Isi: kop, judul NOTA PEMBELIAN / NOTA PERPANJANGAN, nomor nota,
nomor pesanan, tanggal, status bayar, data pemesan, tabel rincian (template, diskon, domain / hosting & domain per
tahun), total + terbilang, metode & waktu bayar, domain dan masa aktif, catatan "diterbitkan secara elektronik".
