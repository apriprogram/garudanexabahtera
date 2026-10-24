# Prompt: tambah proyek ke portofolio garudanexa.com

Prompt siap pakai untuk agen AI (Claude Code di aplikasi Claude, dengan Claude in Chrome tersambung). Agen mengenali
proyek, mengambil tangkapan layar dan video, menulis nama, kategori, deskripsi, dan tools, lalu mengunggah semuanya
sendiri lewat panel admin (Pengaturan website › Proyek). Setelah itu agen memeriksa hasilnya di beranda dan melapor.

Ada dua cara unggah:

- **editor**: agen mengisi editor "Tambah portofolio" satu proyek demi satu proyek;
- **zip**: agen menyiapkan satu ZIP berisi `proyek.json` dan semua gambar/video, lalu mengunggahnya sekali lewat
  tombol **Impor proyek**. Cara ini paling cepat untuk banyak proyek atau untuk memindahkan data proyek dari tempat
  lain. Formatnya ada di bagian [Format ZIP untuk Impor proyek](#format-zip-untuk-impor-proyek) di bawah; ZIP yang sama
  juga bisa Anda buat dan unggah sendiri tanpa agen.

## Cara pakai

1. Login dulu ke `https://garudanexa.com/admin` di Chrome Anda. Agen tidak boleh mengetik password, jadi login selalu
   Anda yang melakukan.
2. Buka sesi baru Claude Code di folder proyek ini, dan pastikan Claude in Chrome tersambung. Alat unggah file hanya
   tersedia di Chrome.
3. Salin blok prompt di bawah, isi bagian **DATA PROYEK**, lalu kirim.
4. Untuk beberapa proyek sekaligus, isi blok DATA PROYEK berulang (Proyek 1, Proyek 2, …) dan pilih `Cara unggah: zip`.
   Agen menyiapkan semuanya, lalu mengimpornya dalam satu ZIP.

Batas yang dipakai di prompt sama dengan editor admin (`src/components/sections/projects/portfolio.ts`,
`src/pages/admin/portfolio/`): maksimal 12 tools (masing-masing 40 karakter), deskripsi 3.000 karakter, 12 gambar detail,
gambar asli maksimal 25 MB (dikecilkan otomatis), dan video MP4/WebM maksimal 30 MB (batas server `UPLOAD_MAX_VIDEO_MB`;
angka pastinya tertulis di editor). Impor ZIP memeriksa batas yang sama. Bila batas di kode berubah, perbarui prompt
ini juga.

---

```text
Tolong tambahkan proyek berikut ke portofolio garudanexa.com (Pengaturan website › Proyek), dari menyiapkan isi dan media
sampai proyeknya tampil di beranda, lalu laporkan hasilnya dalam bahasa Indonesia.

=== DATA PROYEK (isi oleh pemilik) ===
- URL situs proyek: https://...            (kosongkan bila belum publik / aplikasi mobile)
- Kode sumber (opsional): path folder atau URL GitHub
- Nama proyek (opsional; kosong = tentukan dari situs/kode):
- Klien / bidang usaha (opsional):
- Poin penting yang harus disebut (opsional):
- File media yang sudah ada (opsional): path folder berisi gambar/video
- Tujuan unggah: https://garudanexa.com   (atau http://localhost:5173 untuk uji lokal)
- Cara unggah: zip   (zip = satu ZIP lewat "Impor proyek"; editor = isi editor satu per satu)
- Bila nama proyek sudah ada: tambah   (tambah = jadi proyek baru; ganti = ganti proyek lama bernama sama)
- Minta konfirmasi sebelum menyimpan: ya   (ya = tunjukkan ringkasan dulu, saya jawab OK)
=====================================

ATURAN
- Saya sudah login di Chrome. Jangan mengetik password, token, atau kunci API apa pun. Bila panel admin meminta login,
  berhenti dan minta saya login.
- Ubah hanya proyek ini. Jangan menghapus atau mengubah proyek lain maupun setelan lain di Pengaturan website.
- Jangan tampilkan data pribadi pelanggan, data keuangan asli, atau isi dashboard internal di gambar/video. Pakai halaman
  publik atau akun demo, atau samarkan bagian sensitif. Bila ragu, tanyakan saya.
- Tulis hanya fakta yang terlihat di situs, kode, atau data dari saya. Jangan mengarang angka hasil, nama klien, atau
  testimoni.
- Simpan semua file kerja di folder sementara di luar folder proyek, mis. %TEMP%\proyek-<slug>. Jangan menginstal paket
  di folder proyek (drive E: hampir penuh) dan jangan meng-commit file tangkapan.

LANGKAH 1: KENALI PROYEKNYA
- Buka URL situs (dan kode sumber bila ada). Catat: untuk siapa, masalah yang diselesaikan, fitur utama, dan halaman
  yang paling menarik untuk ditampilkan.
- Tentukan tools/teknologi HANYA dari bukti:
  - kode: package.json, composer.json, pubspec.yaml, requirements.txt, Dockerfile, dan sejenisnya;
  - situs: meta generator, nama file script/CSS, header respons.
  Tulis nama resminya, mis. React JS, Next.js, Vue.js, Laravel, Node.js, Flutter, React Native, Tailwind CSS, MySQL,
  PostgreSQL, Figma, WordPress. Maksimal 12.
- Cek URL bisa dibuka publik (status 200, bukan halaman login/error). Bila tidak, kosongkan Tautan situs.

LANGKAH 2: SIAPKAN ISIAN (sesuai field editor)
- Nama proyek (wajib): singkat dan jelas, mis. "Web App Dashboard", "Sistem Kasir Toko Maju".
- Tag / kategori (wajib): format "BIDANG / PLATFORM" huruf besar, mis. "SAAS / FINANCE", "RETAIL / ANDROID",
  "PENDIDIKAN / WEB".
- Tautan situs (opsional): URL lengkap https://… dari langkah 1.
- Deskripsi proyek (opsional, maks. 3.000 karakter; ideal 400–900): 2–3 paragraf pendek bahasa Indonesia. Paragraf 1:
  kebutuhan/masalah klien. Paragraf 2: solusi dan fitur utama. Paragraf 3: hasil yang nyata (tanpa angka karangan).
  Baris baru dipertahankan.
- Tools / teknologi (opsional): daftar dari langkah 1, maks. 12, tiap nama ≤ 40 karakter.

LANGKAH 3: AMBIL GAMBAR & VIDEO
Pakai Playwright lewat skrip sementara di folder kerja, mis. `npm init -y && npm i playwright` di %TEMP%\proyek-<slug>.
Browser Playwright biasanya sudah ada di %LOCALAPPDATA%\ms-playwright. Sebelum memotret: tutup banner cookie/popup/widget
chat, dan gulir sampai bawah agar gambar lazy-load termuat.
- Gambar kartu / mockup (WAJIB, 1 file): rasio 4:3, mis. viewport 1440×1080, yang dipotret bagian atas beranda (hero),
  karena bagian atas gambar yang terlihat di kartu. Boleh lebih menarik: buat halaman HTML kecil berlatar gradasi lembut
  berisi bingkai browser/ponsel dengan tangkapan layar di dalamnya, lalu potret 1600×1200. JPG/PNG/WEBP, ≤ 25 MB.
- Gambar detail (opsional, maks. 12; ideal 3–6): potongan section penting di desktop lebar 1440 (tiap gambar tinggi
  ≤ 8000 px), plus minimal 1 tampilan ponsel (lebar 390). Urutkan dari atas ke bawah halaman. Beri nama berurutan:
  02-detail-1.jpg, 03-detail-2.jpg, …
- Video (opsional): 10–20 detik, gulir pelan dari atas ke bawah beranda, tanpa suara, 1440×900, WebM atau MP4, ≤ 30 MB.
  Rekam dengan konteks Playwright `recordVideo: { dir, size: { width: 1440, height: 900 } }`, gulir bertahap
  (mis. window.scrollBy 6 px tiap 16 ms), lalu tutup konteks untuk menyimpan file .webm. WebM diterima apa adanya.
- Proyek tanpa URL publik (aplikasi mobile/internal): pakai file dari "File media yang sudah ada". Gambar kartu dibuat
  dari tangkapan layar itu dengan bingkai ponsel di halaman HTML seperti di atas. Bila file kurang, minta saya.
- Periksa semua gambar/video sebelum diunggah (lihat sendiri): tidak ada data sensitif, popup, atau bagian kosong.

LANGKAH 4: UNGGAH LEWAT PANEL ADMIN (Claude in Chrome)
Bila "Cara unggah: zip", kerjakan LANGKAH 4B saja. Bila "editor", kerjakan langkah 1–10 di bawah.
1. Buka <Tujuan unggah>/admin/settings, lalu pilih menu Proyek di kolom kiri.
2. Bila proyek bernama sama sudah ada, buka dengan ikon pensil di kartunya (tombol "Edit <nama proyek>"). Bila belum,
   klik "Tambah portofolio".
3. Isi: Nama proyek, Tag / kategori, Tautan situs, Deskripsi proyek. Tools: ketik satu nama lalu Enter, ulangi
   (atau klik saran yang cocok).
4. Gambar kartu (mockup): unggah lewat kotak "Tambah gambar kartu" (alat file_upload pada input file).
5. Gambar detail: unggah lewat "Tambah gambar detail" (bisa beberapa file sekaligus). Rapikan urutan dengan tombol panah.
6. Video: unggah lewat "Tambah video" dan tunggu progresnya selesai.
7. Tunggu semua unggahan selesai: tombol "Simpan proyek" bertuliskan "Menunggu unggahan..." selama masih mengunggah.
   Bila ada pesan error (file terlalu besar/format salah), perbaiki filenya lalu unggah ulang.
8. Bila "Minta konfirmasi sebelum menyimpan: ya", tampilkan ringkasan isian dan daftar file ke saya, lalu tunggu OK.
9. Klik "Simpan proyek", lalu klik "Simpan semua perubahan" di kanan atas. TANPA langkah kedua ini, proyek BELUM tersimpan
   di website.
10. Pastikan saklar "Tampil di website" di bagian Proyek menyala. Bila mati, jangan diubah; laporkan ke saya.

LANGKAH 4B: UNGGAH SEKALIGUS LEWAT ZIP ("Impor proyek")
1. Susun folder kerja %TEMP%\proyek-portofolio: satu subfolder per proyek (mis. kasir-toko\) berisi cover.jpg,
   detail-1.jpg, detail-2.jpg, …, demo.webm. Pakai nama file huruf kecil tanpa spasi/aksen.
2. Tulis %TEMP%\proyek-portofolio\proyek.json (UTF-8): daftar proyek dengan kolom title, desc, url, description,
   tools, image, gallery, video sesuai LANGKAH 2. Nama file ditulis relatif terhadap proyek.json, mis.
   "image": "kasir-toko/cover.jpg". Ikuti bagian "Format ZIP untuk Impor proyek" di
   docs/prompts/upload-proyek-portofolio.md. Periksa ulang: JSON valid, semua file yang disebut ada, dan batasnya
   dipatuhi.
3. Buat ZIP-nya dengan PowerShell:
   Compress-Archive -Path "$env:TEMP\proyek-portofolio\*" -DestinationPath "$env:TEMP\proyek-portofolio.zip" -Force
4. Buka <Tujuan unggah>/admin/settings, pilih menu Proyek, lalu klik "Impor proyek".
5. Unggah ZIP ke input "Pilih file ZIP proyek" (alat file_upload).
6. Baca pratinjaunya. Tiap proyek berlabel "Baru", "Baru (nama sudah ada)", "Ganti proyek lama", atau "Dilewati". Teks
   merah = masalah (proyek itu dilewati), teks kuning = isian yang dipotong. Bila ada yang merah: perbaiki folder kerja,
   buat ulang ZIP, klik "Pilih file lain", lalu unggah lagi.
7. Bila muncul pilihan "proyek bernama sama", klik sesuai "Bila nama proyek sudah ada": "Tambah sebagai proyek baru"
   atau "Ganti proyek bernama sama".
8. Bila "Minta konfirmasi sebelum menyimpan: ya", tampilkan ringkasan pratinjau ke saya, lalu tunggu OK.
9. Klik "Impor N proyek" dan tunggu sampai muncul "N proyek masuk daftar". Proyek berlabel "Gagal" menampilkan
   alasannya; perbaiki, lalu impor ulang proyek itu saja dalam ZIP baru.
10. Klik "Selesai", lalu klik "Simpan semua perubahan" di kanan atas. TANPA langkah ini, proyek BELUM tersimpan di
    website.
11. Pastikan saklar "Tampil di website" di bagian Proyek menyala. Bila mati, jangan diubah; laporkan ke saya.

LANGKAH 5: CEK HASIL & LAPORAN
- Buka <Tujuan unggah>/#projects (muat ulang penuh). Kartu proyek harus tampil dengan gambar mockup. Klik kartunya:
  detail harus memuat judul, kategori, chip tools, deskripsi, tombol "Kunjungi Situs" (bila ada tautan), gambar detail,
  dan video. Cek juga di lebar ponsel 390.
- Bila proyek tersimpan tapi tidak muncul di beranda, kemungkinan section Projects sedang menampilkan "Project Clients"
  (proyek klien yang dicentang tampil di website), bukan portofolio. Laporkan ke saya, jangan ubah apa pun.
- Laporan (bahasa Indonesia), urutkan:
  1. Selesai / belum: satu kalimat.
  2. Tabel isian: nama, kategori, tautan, tools, dan cuplikan deskripsi.
  3. File yang diunggah: nama, ukuran, dan urutan.
  4. Tangkapan layar kartu dan detail di beranda.
  5. Yang dilewati beserta alasannya, dan yang perlu saya cek (mis. izin klien untuk menampilkan proyek, data sensitif).
```

---

## Format ZIP untuk Impor proyek

Admin › Pengaturan website › Proyek › **Impor proyek** menerima satu ZIP berisi `proyek.json` dan file gambar/video
yang disebut di dalamnya. Tanpa ZIP, klik **Pilih folder** di jendela yang sama lalu pilih folder yang berisi
`proyek.json`.

Setelah file dipilih, admin menampilkan pratinjau per proyek: gambar kartu, isi singkat, dan masalahnya. Proyek yang
bermasalah dilewati. Bila ada nama yang sama dengan proyek yang sudah ada, pilih **Tambah sebagai proyek baru** atau
**Ganti proyek bernama sama**. Mengganti berarti proyek lama diganti seluruhnya.

Media diunggah satu per satu lewat unggahan yang sama dengan editor (`upload_project_image`, `upload_project_video`).
Tiap proyek yang selesai langsung masuk daftar, tetapi baru tampil di website setelah **Simpan semua perubahan**. Kodenya
ada di `src/pages/admin/portfolio/` (`portfolioImport.ts`, `zipReader.ts`, `PortfolioImportDialog.tsx`).

Susunan ZIP. `proyek.json` boleh juga berada di dalam satu folder teratas, mis. hasil ZIP sebuah folder:

```text
proyek-portofolio.zip
├── proyek.json
├── kasir-toko/
│   ├── cover.jpg
│   ├── detail-1.jpg
│   ├── detail-2.jpg
│   └── demo.webm
└── company-profile/
    ├── cover.png
    └── detail-1.webp
```

Isi `proyek.json` adalah daftar proyek berbentuk entri `portfolio_data` (`src/components/sections/projects/portfolio.ts`):

```json
[
  {
    "title": "Sistem Kasir Toko Maju",
    "desc": "RETAIL / ANDROID",
    "url": "",
    "description": "Toko Maju butuh kasir yang tetap jalan saat internet putus.\n\nAplikasi Android dengan stok, struk Bluetooth, dan laporan harian.",
    "tools": ["Flutter", "Laravel", "MySQL"],
    "image": "kasir-toko/cover.jpg",
    "gallery": ["kasir-toko/detail-1.jpg", "kasir-toko/detail-2.jpg"],
    "video": "kasir-toko/demo.webm"
  },
  {
    "title": "Company Profile CV Sinar",
    "desc": "JASA / WEB",
    "url": "https://contoh.com",
    "description": "Situs profil perusahaan dengan katalog layanan dan formulir kontak.",
    "tools": ["React JS", "Tailwind CSS"],
    "image": "company-profile/cover.png",
    "gallery": ["company-profile/detail-1.webp"]
  }
]
```

Aturannya sama dengan editor:

- Wajib: `title` (nama proyek), `desc` (tag / kategori), dan `image` (gambar kartu 4:3). Opsional: `url`,
  `description` (baris baru `\n` dipertahankan), `tools` (daftar, atau satu teks dipisah koma), `gallery` (berurutan),
  dan `video`. Kolom lain diabaikan dan dicatat di pratinjau.
- Nama file ditulis relatif terhadap `proyek.json` dengan pemisah `/`; huruf besar/kecil tidak dibedakan. Pakai nama
  tanpa spasi/aksen. Tautan `https://…` dan data URI ditolak. Path yang sudah ada di situs tujuan
  (`/assets/projects/…`) dipakai apa adanya, tanpa diunggah ulang.
- Batas: 12 tools (masing-masing 40 karakter), deskripsi 3.000 karakter, dan 12 gambar detail. Isian yang melebihi
  batas dipotong dan dicatat (teks kuning). Gambar JPG/PNG/WEBP/GIF maks. 25 MB, dikecilkan otomatis. Video MP4/WebM
  maks. 30 MB (`UPLOAD_MAX_VIDEO_MB`).
- Proyek dilewati (teks merah) bila kolom wajib kosong, tautan situs tidak valid, file yang disebut tidak ada atau
  jenis/ukurannya salah, atau namanya sama dengan proyek lain di `proyek.json`.
- Simpan `proyek.json` sebagai UTF-8 (BOM boleh). Pakai ZIP biasa (Deflate atau tanpa kompresi), bukan ZIP berkata
  sandi atau ZIP terbagi. Browser yang didukung: Chrome, Edge, atau Firefox terbaru.

Membuat ZIP-nya dari folder kerja yang berisi `proyek.json`, dengan PowerShell:

```powershell
Compress-Archive -Path "$env:TEMP\proyek-portofolio\*" -DestinationPath "$env:TEMP\proyek-portofolio.zip" -Force
```

atau dengan Python, dari folder induknya:

```bash
python -m zipfile -c proyek-portofolio.zip proyek-portofolio
```
