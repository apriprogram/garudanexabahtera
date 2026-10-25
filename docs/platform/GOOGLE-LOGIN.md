# Masuk & daftar akun pembeli dengan Google

Permintaan pemilik 2026-10-25: tombol **"Daftar dengan Google"** di `/daftar` dan **"Login dengan Google"** di `/masuk`, sebagai opsi tambahan. Form email + kata sandi tetap ada dan tetap jadi jalur utama. Teks tombol berasal dari Google (bahasa Indonesia), jadi tulisannya "Login dengan Google", bukan "Masuk dengan Google".

Tombol hanya tampil bila client ID Google sudah diisi (§3). Selama kosong, halaman tampil persis seperti sebelumnya, dan skrip Google tidak dimuat.

---

## 1. Alur

Kami memakai Google Identity Services (GIS) dengan **ID token** dalam mode popup. Hanya client ID yang dibutuhkan; client secret dan redirect URI tidak dipakai.

1. `/masuk` atau `/daftar` memanggil `google_auth_config`. Bila `client_id` terisi, skrip `https://accounts.google.com/gsi/client` dimuat dan tombol resmi Google digambar di bawah tombol kirim form (`src/components/auth/GoogleAuthButton.tsx`).
2. Pembeli memilih akun Google di popup. Google memberi browser sebuah **ID token** (JWT RS256), lalu browser mengirimnya ke `customer_google_auth` sebagai `credential`.
3. Server memverifikasi token (`backend/modules/google_auth.php` = `google_auth.js`):
   - tanda tangan RS256 dengan sertifikat publik Google (`https://www.googleapis.com/oauth2/v1/certs`, berdasarkan `kid`; sertifikat diunduh ulang bila Google mengganti kunci);
   - `iss` = `accounts.google.com` atau `https://accounts.google.com`;
   - `aud` = client ID situs ini (string, persis);
   - `exp` belum lewat dan `iat` tidak di masa depan (toleransi jam 300 detik);
   - `sub` ada; `email` ada dan `email_verified` = true.
4. Akun dipilih (`ga_account_plan` / `accountPlan`):

| Keadaan | Hasil |
|---|---|
| `users.google_sub` = `sub` token | **masuk** (`account: "login"`) |
| Email sama, akun pembeli, belum tertaut, email **Gmail** atau **Google Workspace** (klaim `hd` = domain email) | **ditautkan**: `google_sub` diisi dan **kata sandi diganti acak** dalam UPDATE yang sama, lalu masuk (`account: "linked"`). Browser menampilkan "Akun tertaut ke Google" (kata sandi lama tidak berlaku lagi) sebelum lanjut |
| Email sama tetapi bukan Gmail/Workspace | 409 `GOOGLE_NEEDS_PASSWORD`: masuk dengan kata sandi. Google tidak berwenang atas email itu, jadi akun lama tidak ditautkan tanpa bukti lain |
| Email sama, sudah tertaut ke akun Google lain | 409 `GOOGLE_OTHER_ACCOUNT` |
| Email/akun milik staf (`admin`/`user`) | 403 `GOOGLE_STAFF_ACCOUNT`: staf tetap masuk lewat `/login` dengan kata sandi |
| Akun nonaktif | 403 `ACCOUNT_INACTIVE` |
| Email belum terdaftar | `{ signup_required: true, profile: { name, email } }`. Belum ada akun yang dibuat |

Mengapa kata sandi diganti saat menautkan: `customer_register` tidak memverifikasi email. Seseorang bisa mendaftarkan Gmail orang lain dengan kata sandinya sendiri. Bila akun itu cukup ditautkan, pemilik email asli akan memakai akun yang kata sandi dan token 8 jamnya dipegang pendaftar palsu (pra-pembajakan akun). Kata sandi baru mengubah `password_version`, jadi kata sandi dan semua token lama mati. Pemilik akun sah yang masih ingin masuk dengan kata sandi memakai "Lupa kata sandi?".

5. **Langkah kedua** (email baru): Google tidak memberi nomor HP, padahal tim memakai nomor WhatsApp untuk konfirmasi pesanan. Kartu yang sama menampilkan "Satu langkah lagi": akun Google, nama (terisi dari Google, boleh diubah), Nomor WhatsApp (wajib), dan persetujuan Syarat & Ketentuan + Kebijakan Privasi (`GoogleSignupForm.tsx`). Browser mengirim ulang `credential` yang sama bersama `name` dan `phone`. Server memverifikasi ulang, membuat akun `customer` aktif dengan `google_sub` dan kata sandi acak yang tidak diketahui siapa pun, lalu langsung masuk (`account: "created"`). Token Google berlaku sekitar 1 jam; bila kedaluwarsa, pembeli diminta mengulang dari tombol Google.

Sesudah masuk, sesi sama persis dengan login biasa (`setSession`, lalu `?next` atau `/akun`).

## 2. API

| Action | Akses | Input | Output |
|---|---|---|---|
| `google_auth_config` | publik, GET/POST | – | `{ success, client_id: string \| null }` |
| `customer_google_auth` | publik, POST | `credential`, lalu untuk akun baru `phone` (+ `name?`) | sesi `{ success, user, token, expires_at, account }`, atau `{ success, signup_required, profile }` |

Galat (`{ error, code }`):
- `GOOGLE_NOT_CONFIGURED` 503
- `GOOGLE_TOKEN_INVALID` 401, dihitung ke batas percobaan
- `GOOGLE_EMAIL_UNVERIFIED` 403
- `GOOGLE_UNAVAILABLE` 503 (sertifikat Google tidak bisa diunduh)
- `GOOGLE_NEEDS_PASSWORD` / `GOOGLE_OTHER_ACCOUNT` 409
- `GOOGLE_STAFF_ACCOUNT` / `ACCOUNT_INACTIVE` 403
- `VALIDATION` 400 (`errors.name`, `errors.phone`)
- `GOOGLE_RETRY` 409 (klik ganda saat akun dibuat)
- 429 (terlalu banyak percobaan)

Batas percobaan per IP:
- 20 token gagal per 15 menit;
- 5 akun baru per jam, sama dengan `customer_register`.

`user` di respons tidak memuat `password` maupun `google_sub`.

**Database:** `users.google_sub VARCHAR(255) ascii_bin NULL`, `UNIQUE KEY uq_users_google_sub` (migration `2026-10-25_027_google_sign_in.sql`).

**Tes:**
- `__tests__/backend/google-auth.test.ts` menjalankan verifikasi token, rencana akun, validasi, dan alur lengkap di PHP dan Node dengan kunci RSA buatan tes. Hasil keduanya harus identik.
- `src/components/auth/__tests__/googleAuth.test.tsx` menguji tampilan.

## 3. Mengaktifkan (langkah pemilik)

Client ID dibuat sendiri oleh pemilik di Google Cloud Console. Client ID bukan rahasia, karena ikut tampil di halaman. **Client secret tidak dibutuhkan:** jangan disalin ke mana pun.

1. Buka <https://console.cloud.google.com/>, lalu pilih atau buat project, misalnya "Garuda Nexa".
2. Buka **Google Auth Platform** (di tampilan lama: *APIs & Services → OAuth consent screen*) → **Branding**:
   - nama aplikasi `Garuda Nexa`;
   - email dukungan;
   - domain resmi `garudanexa.com`;
   - Kebijakan Privasi `https://garudanexa.com/kebijakan-privasi`;
   - Syarat & Ketentuan `https://garudanexa.com/syarat-ketentuan`.

   Di **Audience**, pilih *External*, lalu **Publish app**. Cakupan dasar (`openid`, `email`, `profile`) tidak perlu verifikasi Google.
3. Buka **Clients** (tampilan lama: *Credentials*) → **Create client** → jenis **Web application**, nama `garudanexa.com`. Isi:
   - **Authorized JavaScript origins:**
     - `https://garudanexa.com`
     - `http://localhost:5173` (dev lokal)
     - `http://localhost` (Google menyarankan keduanya untuk localhost)
     - `https://www.garudanexa.com`, hanya bila www tidak dialihkan ke domain utama.
   - **Authorized redirect URIs:** kosongkan, karena mode popup tidak memakainya.

   Klik **Create**, lalu salin **Client ID** (bentuknya `123456789012-xxxxxxxx.apps.googleusercontent.com`).
4. Taruh client ID di salah satu tempat berikut (yang pertama terisi dengan format benar yang dipakai):
   - **Produksi (cPanel), setelah migration 027 dijalankan dan kode ini terbit:** phpMyAdmin → database situs → tab **SQL**:
     ```sql
     INSERT INTO hero_settings (setting_key, setting_value) VALUES ('google_client_id', 'TEMPEL-CLIENT-ID-DI-SINI')
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);
     ```
   - **Lokal / Node:** baris `GOOGLE_CLIENT_ID=TEMPEL-CLIENT-ID-DI-SINI` di `.env`. Bisa juga dipakai di produksi, di `.env` satu folder di atas `public_html`.

   Mematikan: kosongkan nilainya (`UPDATE hero_settings SET setting_value = '' WHERE setting_key = 'google_client_id';`) atau hapus baris `.env`.

   Client ID sengaja **tidak bisa diubah dari panel admin**. Nilainya menentukan token Google mana yang dipercaya (`aud`), jadi `update_settings` menolak kunci `google_client_id` (403), dan `get_settings` tidak mengirimkannya. Browser membacanya lewat `google_auth_config`. Di Docker, `GOOGLE_CLIENT_ID` diteruskan dari `.env` lewat `docker-compose.yml`.
5. Cek: buka `https://garudanexa.com/daftar`. Tombol "Daftar dengan Google" muncul di bawah "Daftar Akun". Di `/masuk`, "Login dengan Google" muncul di bawah "Masuk".

Pengujian lokal butuh origin `http://localhost:5173` di langkah 3. Tanpa itu, popup Google menolak dengan pesan *origin_mismatch*.

## 4. Catatan

- Akun yang dibuat atau ditautkan lewat Google punya kata sandi acak. Bila pembeli ingin masuk dengan email + kata sandi, ia memakai "Lupa kata sandi?" (bantuan tim lewat WhatsApp). Halaman profil belum punya fitur "atur kata sandi".
- Belum ada tombol "putuskan tautan Google" di profil. Admin bisa mengosongkan `users.google_sub` lewat database bila perlu.
- Tidak memakai One Tap (popup otomatis) atau FedCM prompt: hanya tombol, sesuai permintaan.
