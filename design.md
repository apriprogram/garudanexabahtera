# Design system Garuda Nexa

Satu sistem desain untuk tiga area: **website publik**, **akun pembeli** (`/akun/*`), dan **panel admin** (`/admin/*`).
Kontrak lengkap platform: `docs/platform/SPEC.md` (§1 design system, §8 halaman publik).

Stack: Vite + React 19 + TypeScript + Tailwind CSS v4 (`@theme` di CSS, tanpa `tailwind.config`).

## Brand

- **Warna brand diambil dari logo** (`public/assets/logo/logogarudanexa.png`): **#211FFE** = `brand-600` = `primary`.
- Skala `brand` (kelas `bg-brand-50` … `bg-brand-900`, `text-brand-*`, `ring-brand-*`):
  50 `#EEEEFF` · 100 `#DFDEFF` · 200 `#C2C1FF` · 300 `#9C9AFF` · 400 `#6C6AFF` · 500 `#3E3CFF` · **600 `#211FFE`** · 700 `#1A18D4` · 800 `#1614A8` · 900 `#121083`.
- `primary` = brand-600 (aksi utama), `primary-hover` = brand-700.
- Status: sukses `success` `#12B76A` (`success-50`, `success-700`); `warning*` & `danger*` dari `src/styles/admin.css`; info = brand.

### Logo (SVG, path sayap persis dari `public/logogarudanexa.svg`)

**Logo utama = sayap biru brand TANPA latar** (navbar, footer, sidebar admin, favicon). Versi berkotak biru hanya untuk
ilustrasi di dalam kartu/mockup dan halaman masuk/daftar.

| File | Isi | Pakai di React (`src/components/ui/LogoMark.tsx`) |
|---|---|---|
| `public/favicon.svg` | Favicon: sayap biru brand tanpa latar di kotak transparan (tab gelap: brand-400) | `<link rel="icon">` di `index.html` |
| `public/brand/logo-wings.svg` | Sayap saja, `fill="currentColor"` | `<LogoMark className="h-5 text-primary" />` (warna lewat kelas teks) |
| (komponen) | Sayap `h-5`/`sm:h-6` + "Garuda Nexa Bahtera"; `size="sm"` = sayap 18/22px + nama 15/16px | `<BrandLogo />` (footer); `<BrandLogo size="sm" />` (navbar) |
| (sidebar admin) | Sayap `text-adm-link` (biru brand di tema terang, brand-300 di tema gelap) | `<LogoMark className="h-5 text-adm-link" />` |
| `public/brand/logo-mark.svg` | Kotak rounded biru brand + sayap putih | `<LogoBadge className="h-8 w-8" />` (ilustrasi, halaman auth) |

## File gaya

| File | Isi | Pemilik |
|---|---|---|
| `src/index.css` | Token brand & peran website, skala font HP, tinggi navbar `--nav-h` (`h-nav`/`pt-nav`), `container-site`, `section-y`, `section-screen`, `.btn*`, `.card-flat`/`.card-site`, `.lift`, `.eyebrow`, `grid-dots`, `glow-brand`, `.reveal`/`.split-word`, form `*-site`, `.chip-site`, `.badge-site`, `.link-site` | Website |
| `src/styles/admin.css` | Palet & token `adm-*` panel admin, pemetaan `slate/blue/primary` di `.admin-panel`, mode gelap/terang admin | Panel admin |

## Website publik & akun pembeli (TEMA TERANG SAJA)

Gaya **"Calm Workspace" dari BELAJAR CPNS** (`E:\_____________\WEBSITE\GARUDANEXA\Belajar CPNS\BISA-PNS-app\apps\web`,
konsep "Order. Balance. Clarity."), diterapkan dengan brand Garuda Nexa:

- **Datar, hampir tanpa shadow.** Permukaan putih + garis tipis di dalam (`ring-1 ring-inset ring-line`) di atas latar
  putih / abu sangat muda. `shadow-float` HANYA untuk lapisan melayang (dropdown, popover, modal, toast, tombol WhatsApp).
  `shadow-soft` sudah dinetralkan (`--shadow-soft: 0 0 #0000`, tanpa bayangan); nama kelasnya tetap ada agar halaman lama
  tidak rusak, tetapi jangan dipakai lagi. Tepi kartu = `ring-1 ring-inset ring-line`.
- **Satu aksen**: biru brand (`primary`). Pemetaan dari palet CPNS: cobalt → `primary`/`brand-*`, obsidian → `fg`
  (teks, chip nomor, ikon aktif), mist → `line`/`muted`/`subtle`, ghost → `alt`. Komposisi ±80% netral, ±15% biru brand.
- **Satu-satunya gradien**: cahaya biru brand lembut (`glow-brand`, kanvas hero, CTA). Tidak ada blok gelap; CTA `#kontak` biru brand.
- Ruang lega, satu fokus per kartu, gerak tenang (`ease-calm`), selalu menghormati `prefers-reduced-motion`.

Tidak ada latar gelap dan tidak ada toggle tema. Token `:root` sudah terang; kelas `light-theme` di `<body>` (dipakai
mode terang panel admin) tidak mengubah apa pun di halaman publik. Jangan memakai varian `light-theme:` di halaman publik.

### Token peran (pakai ini, bukan hex)

| Kelas | Nilai | Untuk (padanan CPNS) |
|---|---|---|
| `bg-canvas` | `#FFFFFF` | Latar halaman (white) |
| `bg-alt` | `#F7F8FB` | Section selang-seling, latar lembut, tab/segmen, skeleton (ghost) |
| `bg-surface` | `#FFFFFF` | Kartu, input |
| `text-fg` / `bg-fg` | `#121620` | Teks utama, judul, chip nomor section, ikon aktif (obsidian) |
| `text-muted` | `#4B5262` | Deskripsi, teks sekunder (mist-700) |
| `text-subtle` | `#6B7383` | Keterangan kecil, eyebrow, placeholder (mist-500) |
| `ring-line` / `border-line` | `#E3E6EE` | Garis kartu, pemisah (mist-100) |
| `ring-line-strong` / `border-line-strong` | `#CBD0DB` | Garis input, hover (mist) |
| `bg-primary` / `text-primary` | `#211FFE` | Aksi, tautan, kata kunci judul (cobalt) |
| `shadow-float` | dari admin.css | HANYA lapisan melayang |

### Bentuk & ukuran

- Radius: kontrol/input 12px (`rounded-xl`), kartu 24px (`card-flat`/`card-site`; gambar di dalam kartu `p-1.5` → 19px),
  accordion 20px, bingkai visual hero 20 → 28px, tombol/chip/tab pill (`rounded-full`).
- **Container** `container-site`: maks 1680px, gutter 20/32/48/64px. **Section**: `section-y` (48 → 80 → 96px) atau
  `section-screen` (beranda: ≈ satu layar di ≥ 1024px, isi di tengah; di HP tinggi mengikuti isi; `scroll-margin-top`
  bawaan dari `--nav-h`, jadi judulnya mendarat 32px / 40px di bawah navbar, tanpa kelas `scroll-mt-*` tambahan).
- Tipografi Inter + **JetBrains Mono** (`font-mono`: nomor section, nomor langkah, penghitung). Angka `tabular-nums`.
- Skala (HP → desktop): H1 hero `text-[26px] → sm:text-[52px] lg:text-[48px] xl:text-[60px] 2xl:text-[72px]`;
  H2 section `text-2xl → sm:text-5xl xl:text-[56px]` (lewat `SectionHeading`); judul kartu besar `text-xl → sm:text-[28-34px]`;
  judul kartu `text-base → sm:text-xl`; deskripsi `text-[14px] → sm:text-lg text-muted`; teks kartu `text-sm → sm:text-[15px]`.
- Harga selalu `formatRupiah()` dari `src/types/platform.ts`.

### Kelas komponen (nama stabil, dipakai semua halaman)

| Kelas | Tampilan | Kapan |
|---|---|---|
| `btn` + `btn-primary` | Biru brand solid | Satu aksi utama per area (Pesan, Bayar, Simpan) |
| `btn` + `btn-outline` | Putih + garis tipis (CPNS secondary) | Aksi netral: Batal, Kembali, Lihat Demo (halaman template) |
| `btn` + `btn-outline-clear` | Transparan, garis `line-strong` → hover `muted`, tanpa latar | Aksi kedua di atas visual: "Lihat demo" & "Konsultasi Gratis" di hero (tinggi sama dengan tombol utama) |
| `btn` + `btn-outline-primary` | Putih, garis & teks biru | Aksi kedua yang tetap menonjol |
| `btn` + `btn-secondary` | Latar biru muda, teks biru | Aksi tonal |
| `btn` + `btn-soft` | Latar abu lembut tanpa garis | Aksi tersier di kartu |
| `btn` + `btn-light` / `btn-on-brand` | Putih / garis putih | Di atas latar biru brand (CTA `#kontak`) |
| `btn` + `btn-danger` / `btn-ghost` | Merah solid / tanpa latar | Aksi merusak / tersier |
| `btn-sm` / (default) / `btn-lg` / `btn-xl` | 36 / 44 / 48 / 56px desktop; HP 32 / 40 / 40 / 40px teks 12-13px, area sentuh diperluas | |
| `card-flat` = `card-site` | Putih, rounded 24, garis tipis di dalam, **tanpa shadow** | Kartu & panel |
| `lift` | Hover: naik 4px + garis jadi biru (box-shadow inset = garis, bukan bayangan); mati di HP | Kartu yang bisa disorot |
| `eyebrow` | 12px huruf besar, tracking lebar, `text-subtle` | Judul kolom footer, label kecil |
| `grid-dots` / `grid-dots-light` | Pola titik halus gelap / putih | Latar visual, CTA biru |
| `glow-brand` | Cahaya biru lembut dari atas (pseudo-element) | Kartu sorotan |
| `label-site`, `input-site`, `help-site`, `error-site` | Label 13px, input 44px rounded-xl (16px di HP), bantuan, error merah | `aria-invalid="true"` = garis merah |
| `chip-site` | Pill filter; aktif = `aria-pressed`/`aria-selected` (biru solid) | Filter kategori |
| `badge-site` / `link-site` | Pill kecil biru muda / teks biru bergaris bawah saat hover | |

**Tombol CTA tanpa panah.** "Pilih Template", "Konsultasi Gratis" (navbar, hero, proses), tombol utama mode Custom
("Pesan Website / Aplikasi Mobile Custom", "Pesan Custom") dan tombol WhatsApp CTA `#kontak` tidak memakai ikon
`ArrowRight`/`ArrowUpRight`. Ikon depan (mis. `LayoutTemplate`, `MessageCircle`, `Play`) tetap boleh, polos tanpa
lingkaran/garis. Tab baru cukup diumumkan lewat `sr-only` ("(tab baru)"), bukan ikon panah.

State wajib: default, hover, focus (outline biru global `:focus-visible`), disabled (`disabled` / `aria-disabled` = pudar),
loading (ikon `Loader2 animate-spin` + `disabled`, atau skeleton `animate-pulse bg-alt`), error, empty.

### Gerak (`src/components/ui`, `src/index.css`)

- `<Reveal>` (props lama tetap: `delay` dalam detik, `direction`, `height`; baru: `variant="scale|fade"`, `className`):
  muncul saat digulir = memudar + naik 32px + blur 8px (HP: tanpa blur, 16px). Murni CSS `.reveal` + IntersectionObserver.
- `<SplitText parts={[{ text }, { text, className: 'text-primary' }]} />`: judul muncul kata per kata dari balik masker.
- `stagger-item`, `animate-fade-up`, `animate-scale-in`, `animate-fade-in`, kurva `ease-calm`.
- Reduced motion: semua di atas langsung tampil; kanvas hero statis; tayangan hero tidak berputar otomatis.

### Layout publik (`src/components/layout`, `src/components/ui`)

- `Navbar` (fixed, tinggi **`--nav-h` = 56px HP & tablet / 64px ≥ 1024px**, di `src/index.css`): transparan di puncak,
  putih kaca (`bg-canvas/85` + blur) saat digulir, **tanpa garis bawah, shadow, atau bar progres di semua state** (juga saat
  menu HP terbuka). Menu tengah dengan sorotan pill yang meluncur saat hover (36px), titik biru = section aktif di beranda.
  Logo `BrandLogo size="sm"`, tombol bahasa/akun 36px, CTA "Konsultasi Gratis" 40px (HP 32px, "Konsultasi").
  **Offset navbar selalu lewat variabel**, jangan menulis angka: konten pertama halaman lain `pt-nav`, tinggi `h-nav`,
  anchor `scroll-mt-[calc(var(--nav-h)+1rem)]`, kolom sticky
  `lg:top-[calc(var(--nav-h)+1.5rem)]`, section beranda lewat `section-screen`. `scroll.ts` membaca `scroll-margin-top`
  elemen, jadi ikut otomatis. Menu dari "Navbar Manager" (`useNavbarMenus`); bawaan Template
  `#templates`, Projects `#projects`, Proses `#process`, FAQ `#faq`. Kanan: bahasa, "Masuk" → `/masuk` (customer: "Akun Saya"
  → `/akun`; staf: "Panel Admin" → `/admin`), CTA pill "Konsultasi Gratis" → `#kontak`. HP: logo + CTA ringkas + hamburger;
  menu HP berupa lapisan di bawah navbar (item 44px, bahasa, akun, CTA).
- `Footer`: blok CTA biru brand `id="kontak"` (pola titik putih + cahaya lembut, judul kata per kata), lalu footer putih
  bergaris rambut (logo, kolom tautan `eyebrow`, hak cipta, media sosial). Prop `alt` = latar abu di area CTA; `chrome` = transparan (beranda).
- `SectionChrome`: latar halaman ber-crossfade per section + indikator titik section di kanan (≥ 1280px). Dipakai beranda.
- `SmartLink`: `href="#templates"` menggulir halus berkurva (`scroll.ts`, batal bila pengguna menggulir) bila section ada,
  kalau tidak membuka `/#templates`; `/rute` = navigasi SPA; `https://` = tab baru.
- `SectionHeading` (`components/ui`): chip "01 · Label" (nomor mono di pil gelap) + judul kata per kata (opsional `accent`
  biru) + deskripsi rata kanan + aksi. `layout="stack"` untuk kolom sticky (FAQ). `titleId` untuk `aria-labelledby`.

### Beranda (`src/pages/public/Home.tsx`)

Urutan: Hero `#beranda` → strip layanan (`LogoTicker`) → `#templates` → `#projects` → `#process` → `#faq` → CTA `#kontak` →
Footer. Section bisa disembunyikan lewat setting `disabled_sections` (JSON array id: `templates`, `projects`, `process`,
`faq`); nomor chip menyesuaikan otomatis. Latar per section (crossfade): beranda/templates/faq putih, projects/process/kontak
abu (`alt`); prop `alt` tiap section mengikuti ini. `main.page-chrome > section` dibuat transparan oleh `index.css`.

- **Hero**: kanvas medan titik interaktif + cahaya biru mengikuti kursor (berkelana saat diam, berhenti saat tak terlihat,
  ±30 fps di HP). Kiri: toggle mode [Template siap pakai | Website & Aplikasi Custom] berindikator meluncur → judul dua warna,
  3 poin, tombol tanpa panah setinggi `btn-xl` (Template: "Pilih Template" → `#templates` + "Lihat demo" template yang
  sedang tampil; Custom: "Pesan Website / Aplikasi Mobile Custom" → `/pesan-custom` + "Konsultasi Gratis"; tombol kedua =
  `btn-outline-clear` dengan ikon polos, HP: sama lebar dalam satu baris). Kanan (HP: di bawah): bingkai browser datar yang menayangkan
  pratinjau template dari `get_templates` (cadangan `/assets/templates/*-preview.svg`) + rail langkah Pilih template → Bayar via
  Midtrans → Domain aktif → Kelola lewat CMS (bisa diklik & dijeda).
- **Projects**: kartu sorotan lebar (≥ 3 proyek) + grid kartu datar bergambar.
- **Proses**: kontrol segmen Template / Custom → bento (2 kartu langkah, 1 kartu tinggi, 1 kartu lebar biru muda).
- **FAQ**: judul sticky kiri, accordion bernomor kanan (satu terbuka; terbuka = putih bergaris, tertutup = abu lembut).

## Panel admin (`src/pages/admin`, `src/components/admin`)

Gaya "Calm Workspace" dari BELAJAR CPNS (`E:\_____________\WEBSITE\GARUDANEXA\Belajar CPNS\BISA-PNS-app\apps\web`):

- **Shell** (`pages/admin/Layout.tsx`, `components/admin/Sidebar.tsx`, `Header.tsx`, `nav.ts`): latar `bg-adm-canvas` + gutter 8px, sidebar kartu rounded 20px terpisah (bisa diciutkan, drawer di HP), panel konten `bg-adm-surface` rounded 20px, topbar 56px dengan breadcrumb.
- **Token admin (ikut tema)**: `bg-adm-canvas`, `bg-adm-surface`, `bg-adm-hover`, `bg-adm-ghost` (latar lembut, segmented), `bg-adm-raised` (item aktif di atas ghost), `bg-adm-overlay` (latar modal), `text-adm-fg`, `text-adm-muted`, `text-adm-subtle`, `text-adm-link`, `ring-adm-line` / `border-adm-line`, `ring-adm-line-strong` (hover). Tint status: `bg-adm-{cobalt|mint|warning|danger|mist}-soft` + `text-adm-{…}-fg`. Jangan menulis cabang `isLight ? … : …`.
- **Primitif** (`src/components/admin/ui`, impor dari `components/admin/ui`): `PageHeader`, `Panel`/`PanelHeader`/`PanelFooter`, `StatTile`, `Badge`, `Button`/`IconButton`, `Field`/`Input`/`Select`/`Textarea`/`SearchInput`/`Switch`, `Table` + `MobileList`/`MobileCard` (kartu di < md), `FilterBar`, `Modal`/`ConfirmDialog`/`Drawer` (bottom-sheet di HP), `Tabs`, `EmptyState`/`LoadingState`/`Notice`, `Dropdown`, `Pagination`. Kelas mentah: `buttonClass()`, `panelClass()`, `controlClass()`, `FLOAT_PANEL`, `MENU_ITEM` (di `styles.ts`). Contoh lengkap: `pages/admin/UserManager.tsx`.
- **Palet**: `cobalt` (aksi, tautan, fokus), `obsidian` (teks/primer), `mist-*` (garis, teks sekunder), `ghost` (latar), `mint` (sukses), `danger`, `warning`. Kelas lama `slate-*`, `blue-*`, `primary` di dalam `.admin-panel` otomatis dipetakan ke palet ini. Sesuai SPEC §1 aksen `cobalt-*` memakai skala brand (#211FFE) agar admin, website, dan akun pembeli terasa satu produk; nilainya diatur di `src/styles/admin.css`.
- **Tema**: panel admin boleh punya mode gelap & terang (kelas `light-theme` di `<body>`); website publik & akun pembeli selalu terang.
- **Panel/kartu**: `rounded-[20px] bg-adm-surface ring-1 ring-inset ring-adm-line`, padding `p-4 sm:p-5` / `p-4 sm:p-6`. Judul panel `text-[14px] sm:text-[15px] font-semibold`, deskripsi `text-xs sm:text-[13px] text-adm-muted`.
- **Kepala halaman**: H1 `text-[20px] sm:text-[28px] font-semibold` (sudah diseragamkan lewat `.admin-panel main h1`), deskripsi satu kalimat `text-[13px] text-adm-muted`, aksi kanan.
- **Statistik**: angka `text-[22px] sm:text-[30px] font-semibold tabular-nums`.
- **Tabel**: di dalam kartu; header `text-[11px] uppercase tracking-[0.08em] text-adm-subtle`; baris lega; status = pill; di < 768px jadi kartu bertumpuk atau `overflow-x-auto` di dalam kartu.
- **Tombol**: `h-11 rounded-xl px-4 text-sm font-semibold` (HP `h-10 text-[13px]`); primer `bg-cobalt text-white hover:bg-cobalt-600`; sekunder `bg-adm-surface ring-1 ring-inset ring-adm-line hover:bg-adm-hover`; bahaya `bg-danger text-white`.
- **Input**: `h-11 rounded-xl border border-adm-line bg-adm-surface text-[15px] max-sm:text-[16px] focus:border-cobalt focus:ring-1 focus:ring-cobalt`.
- **Pill status**: `h-6 rounded-full px-2.5 text-xs font-medium` + tint: sukses `bg-mint-50 text-mint-700`, proses `bg-cobalt-50 text-cobalt-700`, menunggu `bg-warning-50 text-warning-700`, gagal `bg-danger-50 text-danger-700`, draf `bg-mist-50 text-mist-700`.
- **Modal**: overlay `bg-obsidian/30` tanpa blur, panel `rounded-[24px] shadow-float`; di HP jadi bottom-sheet.

### Bahasa & istilah (copy panel admin)

Semua teks yang terlihat di panel admin memakai Bahasa Indonesia santai dan menyapa pengguna dengan **"kamu"** (bukan "Anda"). Istilah teknis dan nama produk tetap seperti aslinya.

- **Huruf kapital**: *sentence case* untuk judul halaman, judul panel, label, tombol, tab, menu, dan header tabel ("Tambah pengguna", "Simpan perubahan", "Nama lengkap"). Huruf besar hanya untuk nama diri, produk, dan akronim (Garuda Nexa, i-School, WhatsApp, SEO, URL, CTA, FAQ, PM).
- **Judul halaman** (H1) sama dengan label menunya di `components/admin/nav.ts` (breadcrumb mengambil label itu). Deskripsi halaman satu kalimat, boleh menyapa: "Kelola akun admin dan klien kamu."
- **Tombol**: kata kerja singkat + objek bila perlu: "Simpan", "Tambah proyek", "Hapus", "Batal", "Tutup", "Kembali".
- **Notifikasi sukses**: "<Objek> berhasil <disimpan|ditambahkan|diperbarui|dihapus>." Gagal: "Gagal <menyimpan|menghapus|memuat> <objek>." dan bila ada pesan server: "Gagal menyimpan: <pesan>". Koneksi: "Tidak bisa terhubung ke server." Error tanpa pesan: "kesalahan tidak diketahui".
- **Konfirmasi hapus**: judul "Hapus <objek>?", deskripsi "Tindakan ini tidak bisa dibatalkan." (boleh disertai nama objeknya), tombol "Ya, hapus" + "Batal". Konfirmasi lain: "Ya, <aksi>" (mis. "Ya, reset").
- **Kosong / cari**: "Belum ada <objek>." (boleh ditambah ajakan: "Tambah proyek pertamamu."); hasil pencarian kosong: "<Objek> tidak ditemukan."
- **Memuat**: "Memuat..." atau "Memuat <objek>...".
- **Placeholder**: contoh pakai "mis." ("mis. Aplikasi e-commerce"); isian kosong pakai "Masukkan <objek>" atau "Tulis <objek>..." untuk teks panjang; pencarian "Cari <objek>...".
- **Label opsional/wajib**: "(opsional)", "wajib". Saran ukuran: "Disarankan 1920×1080 px", batas: "maks. 10 MB".

| Inggris | Dipakai | Inggris | Dipakai |
|---|---|---|---|
| Save / Save changes | Simpan / Simpan perubahan | Add / Add new … | Tambah … |
| Cancel | Batal | Create | Buat |
| Delete / Remove | Hapus | Edit | Edit (mis. "Edit profil", "Edit proyek") |
| Update (data) | Perbarui | Close | Tutup |
| Back | Kembali | Next / Previous | Berikutnya / Sebelumnya |
| Search | Cari | Filter / All | Filter / Semua |
| View / View details | Lihat / Lihat detail | Open in new tab | Buka di tab baru |
| Upload / Download | Unggah / Unduh | Preview | Pratinjau |
| Refresh / Reload | Muat ulang | Reset | Reset |
| Copy / Copied | Salin / Tersalin | Print | Cetak |
| Show / Hide | Tampilkan / Sembunyikan | Enable / Disable | Aktifkan / Nonaktifkan |
| Active / Inactive | Aktif / Nonaktif | Online / Offline | Online / Offline |
| Pending | Menunggu | In progress | Berjalan |
| Completed / Resolved | Selesai | Cancelled | Dibatalkan |
| Draft / Published | Draf / Terbit | Success / Failed | Berhasil / Gagal |
| Warning / Critical | Peringatan / Kritis | Error | Error (istilah teknis) |
| User(s) | Pengguna | Role | Peran |
| Administrator / Admin | Administrator / Admin | Client | Klien |
| Full name / Name | Nama lengkap / Nama | Email address | Email |
| Phone number | Nomor HP | Password | Kata sandi |
| Address | Alamat | Contact | Kontak |
| Profile | Profil | Account | Akun |
| Action(s) | Aksi | Status | Status |
| Settings | Pengaturan | General | Umum |
| Dashboard | Dashboard | Overview | Ringkasan |
| Project | Proyek | Service | Layanan |
| Product | Produk | Category | Kategori |
| Portfolio | Portofolio | Process / Step | Proses / Langkah |
| Pricing / Package | Harga / Paket | Feature | Fitur |
| Question / Answer | Pertanyaan / Jawaban | Section | Bagian |
| Title / Subtitle | Judul / Subjudul | Description | Deskripsi |
| Image / Icon / Logo | Gambar / Ikon / Logo | Button | Tombol |
| Link | Link | File / Folder / Document | File / Folder / Dokumen |
| Social media | Media sosial | Copyright | Hak cipta |
| Order (urutan) | Urutan | Drag to reorder | Seret untuk mengubah urutan |
| Budget | Anggaran | Revenue | Pendapatan |
| Timeline | Jadwal | Owner (PM) | Penanggung jawab (PM) |
| Start / End date | Tanggal mulai / Tanggal selesai | Estimated | Perkiraan |
| Date / Time | Tanggal / Waktu | Size | Ukuran |
| Created / Last updated | Dibuat / Terakhir diperbarui | Today / Yesterday | Hari ini / Kemarin |
| Visitor / Visit | Pengunjung / Kunjungan | Device / Browser / OS | Perangkat / Browser / Sistem operasi |
| Location | Lokasi | Average / Peak | Rata-rata / Tertinggi |
| Response time | Waktu respons | Uptime / Downtime | Uptime / Downtime |
| Incident / Alert | Insiden / Peringatan | Severity | Tingkat |
| Check now | Cek sekarang | Mark as resolved | Tandai selesai |
| Optional / Required | Opsional / Wajib | Recommended | Disarankan |
| Zoom in / Zoom out | Perbesar / Perkecil | Send / Message | Kirim / Pesan |
| Welcome back | Selamat datang kembali | Logout | Keluar |

Tetap ditulis apa adanya (istilah teknis/nama): Dashboard, Monitoring, server, website, URL, link, Hero, Navbar, Footer, CTA, FAQ, SEO, Changelog, API, agent, log, CPU, RAM, disk, SSL, uptime, ping, slug, Lucide, nama produk (i-School, i-Santri, Digital Invitation, Website Desa, Garuda Nexa, Garuda Nexa AI). Nilai data/isi bawaan yang tersimpan ke database atau tampil di website publik (mis. `defaultValue`, paket harga bawaan) bukan teks UI, jadi tidak diterjemahkan.

## Aturan HP (< 640px), wajib

- Skala ringkas sudah otomatis lewat token font (`text-sm` = 13px, `text-base` = 15px, `text-2xl` = 20px, dst.). Ukuran px tertulis langsung (`text-[15px]`) tidak ikut mengecil, jadi beri nilai HP sendiri.
- Input/textarea/select `max-sm:text-[16px]` (cegah auto-zoom iOS).
- Target sentuh ≥ 44px (perluas dengan `after:absolute after:-inset-1`, jangan memperbesar tampilan).
- Tidak boleh ada scroll horizontal di 360px & 390px (`body` sudah `overflow-x: clip`).
- Scroll horizontal hanya boleh di dalam baris tertentu (mis. chip filter `overflow-x-auto no-scrollbar`), bukan halaman.
- Elemen fixed (navbar, tombol WhatsApp) memakai `env(safe-area-inset-*)`.
- Uji di 360×740, 390×844, dan 1366×900. Website publik & akun: terang saja. Panel admin: mode gelap & terang.

## Bahasa (website publik & akun pembeli)

Bahasa Indonesia, menyapa pengguna dengan **"Anda"** (panel admin memakai "kamu", lihat di atas). Aksi utama yang sudah
dikenal memakai Title Case ("Pilih Template", "Lihat Demo", "Pesan", "Konsultasi Gratis", "Masuk", "Akun Saya");
teks lain sentence case. Jangan menampilkan harga atau paket untuk jasa custom (biaya disampaikan lewat penawaran).
