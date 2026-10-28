# Garuda Nexa Bahtera — marketplace template & jasa custom

Website PT Garuda Nexa Bahtera: pembeli memilih **template website** (bayar lewat Midtrans, domain diaktifkan admin,
isi situs diubah sendiri lewat CMS di `/akun`) atau memesan **website / aplikasi mobile custom** (`/pesan-custom`).
Staf mengelola semuanya di panel admin (`/admin`). Kontrak lengkap (peran, skema DB, status order, API) ada di
[`docs/platform/SPEC.md`](docs/platform/SPEC.md).

- **Frontend:** Vite 8 + React 19 + TypeScript + Tailwind CSS v4 (`src/`)
- **Backend produksi:** Node/Express `backend/server.js` (port 4000) di belakang nginx, MySQL 8, upload ke S3
- **Backend dev lokal:** PHP `backend/api.php` (XAMPP PHP + MySQL), upload ke `public/assets/`

Keduanya menerima request yang sama: `/api.php?action=...` (GET) atau `POST /api.php` dengan body JSON `{ "action": "...", ... }`.

## Menjalankan di lokal

Langkah lengkap ada di file [`cara menjalankan aplikasi`](cara%20menjalankan%20aplikasi). Ringkasnya:

```bash
php -d post_max_size=256M -d upload_max_filesize=256M -S 127.0.0.1:8000 -t backend
```

```bash
npm run dev
```

Lalu buka http://localhost:5173. Isi `AUTH_SECRET` di `.env` (salin dari `.env.example`) supaya login admin bisa dipakai.
Pembayaran template memakai `MIDTRANS_*` dan `APP_URL` di `.env` (lihat SPEC §5); tanpa server key order tetap dibuat
tetapi tombol bayar belum aktif, dan `MIDTRANS_SIMULATOR=1` menyediakan tombol simulasi bayar untuk uji lokal.

Untuk memakai backend Node secara lokal: jalankan `node backend/server.js` (port 4000) lalu `npm run dev` dengan `API_BACKEND=node`. `API_TARGET` bisa dipakai untuk mengarahkan proxy ke URL lain.

## Struktur

| Path | Isi |
| --- | --- |
| `src/components/sections`, `src/components/layout`, `src/pages/public` | Halaman publik (beranda, detail & demo template, form pesan template, form pesan custom, masuk/daftar) |
| `src/pages/account` | Akun pembeli `/akun` (daftar & detail pesanan, pembayaran, CMS situs) |
| `src/templates` | Template website (renderer + definisi field CMS) |
| `src/pages/admin` | Panel admin: Dashboard, Pesanan Template (Order Masuk, Input Domain, Kelola Template, Template Aktif), Project Clients, Pengaturan website, Kelola navbar, Dokumen, Changelog, Pengguna |
| `src/components/admin` | Kerangka panel admin (`nav.ts` = isi sidebar, `Sidebar`, `Header`) + primitif UI admin (`ui/`) |
| `backend/server.js` | API produksi (Node) |
| `backend/api.php` | API untuk dev lokal (PHP), isi action-nya disamakan dengan `server.js` |
| `backend/security.js` | Token login & kebijakan akses per action (dicerminkan di awal `api.php`) |
| `database/` | `schema.sql`, migrasi bertanggal di `migrations/`, seed (lihat `database/README.md`) |
| `public/assets` | Aset statis + hasil upload saat dev lokal |
| `docker-compose.yml`, `nginx.conf`, `Dockerfile.node` | Deploy produksi |

## Menambah action API

Tambahkan di **dua** tempat: switch POST/GET di `backend/server.js` dan switch di `backend/api.php`, dengan bentuk respons yang sama
(action platform template ada di `backend/modules/templates.php` dan `backend/modules/templates.js`). Action yang tidak terdaftar
sebagai publik di `backend/security.js` / `api.php` otomatis butuh login; daftar peran (`admin`, `user` = staf, `customer` = pembeli)
dan action per peran ada di SPEC §2.

## Peran & akses panel

- `/admin/*` hanya untuk staf (`admin`, `user`). Belum login → `/login`; akun pembeli (`customer`) → `/akun`.
- Menu Pengguna, Kelola navbar, dan Changelog hanya tampil untuk `admin`.
- Rute lama `/admin/monitoring-server` dan `/admin/products/*` (fitur monitoring yang sudah dihapus) dialihkan ke `/admin`.

## Build

```bash
npm run build
```

Hasilnya di `dist/` (dipakai nginx dan diunggah oleh workflow GitHub Actions).
