# Prompt: tambah proyek ke portofolio garudanexa.com

Prompt siap pakai untuk agen AI (Claude Code di aplikasi Claude, dengan Claude in Chrome tersambung). Agen mengenali
proyek, mengambil tangkapan layar dan video, menulis nama, kategori, deskripsi, dan tools, lalu mengunggah semuanya
sendiri lewat panel admin (Pengaturan website › Proyek). Setelah itu agen memeriksa hasilnya di beranda dan melapor.

## Cara pakai

1. Login dulu ke `https://garudanexa.com/admin` di Chrome Anda. Agen tidak boleh mengetik password, jadi login selalu
   Anda yang melakukan.
2. Buka sesi baru Claude Code di folder proyek ini, dan pastikan Claude in Chrome tersambung. Alat unggah file hanya
   tersedia di Chrome.
3. Salin blok prompt di bawah, isi bagian **DATA PROYEK**, lalu kirim.
4. Untuk beberapa proyek sekaligus, isi blok DATA PROYEK berulang (Proyek 1, Proyek 2, …). Agen mengerjakannya satu per
   satu.

Batas yang dipakai di prompt sama dengan editor admin (`src/components/sections/projects/portfolio.ts`,
`src/pages/admin/portfolio/`): maksimal 12 tools (masing-masing 40 karakter), deskripsi 3.000 karakter, 12 gambar detail,
gambar asli maksimal 25 MB (dikecilkan otomatis), dan video MP4/WebM maksimal 30 MB (batas server `UPLOAD_MAX_VIDEO_MB`;
angka pastinya tertulis di editor). Bila batas di kode berubah, perbarui prompt ini juga.

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
