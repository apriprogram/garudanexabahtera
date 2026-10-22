# Brief 3 Template Baru: Arena Club, Aura Studio, Finova (2026-10-22)

Permintaan pemilik (2026-10-22): tiga referensi website → tiga template baru, branding mengikuti gambar referensi,
ketentuan sama dengan template sebelumnya, harga sesuai pasaran. Dokumen ini adalah fondasi untuk tiga engineer yang
bekerja paralel (satu per template) dan verifier.

Aturan desain & teknis tetap `docs/platform/TEMPLATE-DESIGN.md` (premium: wadah penuh, foto asli, satu aksen, garis
tipis tanpa bayangan, gerak tenang, container query) dan `docs/platform/SPEC.md` §7. Brief ini MENAMBAH, tidak
mengganti.

**Permintaan pemilik yang MENGIKAT (ditambahkan 2026-10-22):** ketiga website tidak boleh sama: tata letak, gaya, dan
hero section masing-masing harus berbeda, dan **setiap hero wajib berisi foto**. Sistem tata letak per template ada di
**§4** dan menang atas detail §1–§3 bila ada yang bertentangan. Diuji otomatis di
`src/templates/__tests__/new-templates.test.tsx` (aktif begitu stub diganti).

Referensi (gambar dari pemilik, tidak disimpan di repo) hanya untuk suasana, palet, dan tata letak. **Jangan menyalin
nama merek, logo, atau teks referensi.** Nama perusahaan demo di bawah fiktif dan orisinal.

| Slug | Referensi | Suasana |
| --- | --- | --- |
| `arena-club` | klub tenis/padel ("Horizon Courts") | biru langit cerah + navy, foto hero besar membulat, kartu bento |
| `aura-studio` | studio kosmetologi | abu netral lembut + sage/zaitun, judul kapital elegan, hero belah dua |
| `finova` | landing fintech ("Banklio") | hijau hutan gelap + limau, hero gelap berkisi, kartu UI melayang |

---

## 0. Bersama untuk ketiga template

### 0.1 Katalog

| Slug | Nama tampil | Kategori | Harga | sort_order |
| --- | --- | --- | --- | --- |
| `arena-club` | Arena Club | Olahraga & Komunitas | Rp1.290.000 | 3 |
| `aura-studio` | Aura Studio | Kecantikan & Klinik | Rp1.390.000 | 4 |
| `finova` | Finova | Fintech & Startup | Rp1.790.000 | 5 |

Deskripsi singkat/panjang, fitur, dan tag pencarian ada di `database/seed.templates.sql` dan
`database/migrations/2026-10-22_008_new_templates.sql` (isi sama). Tag pencarian katalog tidak punya kolom sendiri:
kata kunci populer di `src/components/sections/templates/catalog.ts` dicocokkan ke nama/kategori/deskripsi/fitur
(fondasi menambah chip **Olahraga**, **Kecantikan**, **Keuangan**, **Reservasi**, **Membership**; chip lama
**Kesehatan**, **WhatsApp**, **Galeri**, **Testimoni**, **CMS**, **Startup**, **Landing page** ikut cocok).
Deskripsi sengaja memuat kata yang dicari pembeli: Arena → *olahraga, padel, tenis, futsal, badminton, gym, akademi,
membership, WhatsApp, CMS*; Aura → *klinik, kecantikan, salon, nail art, spa, barbershop, reservasi, galeri,
testimoni*; Finova → *fintech, koperasi, aplikasi pembayaran, konsultan keuangan, SaaS, startup, FAQ, landing page*.

**Fitur di katalog adalah janji ke pembeli**: section bertanda *wajib* di §1.4/§2.4/§3.4 harus ada di template final.

### 0.2 Harga (termasuk setup + domain + hosting + SSL tahun pertama)

Patokan internal: Startup Clean Rp990.000 (company profile ringkas, UMKM), Corporate Nexa Rp1.500.000 (company profile
korporat). Pasar Indonesia 2026: jasa website company profile/landing page berbasis template dengan domain + hosting
setahun umumnya Rp800 rb–Rp2,5 jt; jasa kustom agensi untuk landing produk Rp3–7 jt. Biaya pokok domain .com/.id +
hosting + SSL setahun ± Rp400–700 rb, jadi semua harga di bawah tetap menyisakan margin setup & dukungan.

- **Arena Club — Rp1.290.000.** Pembelinya kebanyakan UMKM olahraga (lapangan futsal/badminton/padel, gym, akademi)
  yang sensitif harga, tetapi template ini punya lebih banyak section daripada Startup Clean (paket membership,
  pelatih, jadwal acara), jadi diletakkan di antara Startup Clean dan Corporate Nexa.
- **Aura Studio — Rp1.390.000.** Klinik kecantikan, salon, dan spa bermargin tinggi dan sangat bergantung pada citra
  visual; website klinik kecantikan di pasaran umumnya Rp1,5–3 jt, jadi harga sedikit di bawah Corporate Nexa tetap
  menarik untuk salon/barbershop kecil sekaligus terasa premium untuk klinik.
- **Finova — Rp1.790.000.** Template paling kaya (hero gelap, kartu UI yang teksnya bisa diubah, FAQ, footer lengkap,
  dua warna merek) untuk segmen fintech/koperasi/SaaS yang biasanya membayar agensi beberapa juta; harga tertinggi di
  katalog tetapi masih di bawah Rp2 jt agar terjangkau koperasi dan startup tahap awal.

Harga bisa diubah admin (Pesanan Template > Kelola Template). Nama "Finova" dipakai sebagai nama produk template saja
(perusahaan demonya "Lumbung Arta"); bila pemilik ingin nama yang sama sekali tidak mirip merek luar negeri, ubah nama
tampil di admin, slug tetap `finova`.

### 0.3 Kepemilikan file (kerja paralel)

| Pemilik | File |
| --- | --- |
| Engineer Arena Club | `src/templates/arena-club/**`, `src/templates/__tests__/arena-club.test.tsx`, `public/assets/templates/photos/arena-club-*`, `public/assets/templates/logos/arena-club*`, `public/assets/templates/logos/clients/arena-*` |
| Engineer Aura Studio | `src/templates/aura-studio/**`, `src/templates/__tests__/aura-studio.test.tsx`, `public/assets/templates/photos/aura-studio-*`, `public/assets/templates/logos/aura-studio*` |
| Engineer Finova | `src/templates/finova/**`, `src/templates/__tests__/finova.test.tsx`, `public/assets/templates/photos/finova-*`, `public/assets/templates/logos/finova*`, `public/assets/templates/logos/clients/finova-*` |
| Fondasi (selesai, jangan diubah tanpa koordinasi) | `src/templates/kit/**`, `src/templates/index.ts`, `__tests__/templates.test.tsx`, `__tests__/shell.test.tsx`, `__tests__/kit.test.tsx`, `__tests__/new-templates.test.tsx` (kontrak §4), kata kunci katalog di `src/components/sections/templates/catalog.ts`, migrasi 008, seed |
| Workflow perombakan template lama (JANGAN disentuh) | `src/templates/corporate-nexa/**`, `startup-clean/**`, `shared/**`, migrasi 007 |
| Bersama, tambah saja (append-only) | `public/assets/templates/photos/CREDITS.md`: tambahkan section `## <Nama template> (<perusahaan demo>, fiktif)` di AKHIR file; baca ulang tepat sebelum mengedit; commit hanya hunk sendiri |
| Verifier | `public/assets/templates/<slug>-preview.webp`, `-1.webp`, `-2.webp` + ganti nilai `preview_image`/`gallery` di seed & migrasi 008 |

Butuh perubahan di `shared/**`? Jangan edit: buat versi lokal di folder template sendiri dan catat di laporan
(daftar keinginan bersama ada di §0.6).

### 0.4 Kontrak komponen (diuji otomatis untuk SETIAP template di registry)

Uji generik (`templates.test.tsx`, `shell.test.tsx`, `cms.test.tsx`) berjalan untuk semua template. Komponen pengganti
stub WAJIB:

1. Membungkus semuanya dengan `<TemplateShell content preview motion={motion} defaultAccent={…} displayFont="inter">`
   (meneruskan `motion` apa adanya). Huruf judul lain lewat `useKitFont` (§0.5) pada pembungkus di dalam Shell.
2. Setiap section memakai `<TemplateSection sectionKey="…">` (atribut `data-tpl-section`). Konten bawaan harus
   menghasilkan **≥ 8 section**. Bila SEMUA section `enabled: false` → 0 `[data-tpl-section]` dan **tanpa `<footer>`**.
3. Header: `<nav aria-label="Menu utama">`; tombol menu HP berlabel **"Buka menu"** dengan `aria-expanded`; saat
   terbuka ada nav kedua `aria-label="Menu utama"`; tautan menu memakai `<ActionLink action={{kind:'section',…}}
   onNavigate={tutupMenu}>` (menu ditutup dulu, baru menggulir). Uji memilih tautan "Galeri" bila ada, kalau tidak
   tautan section terakhir di menu (selain `#beranda`).
4. Footer merender tautan sosial dari `footer.instagram/facebook/linkedin/youtube/tiktok` lewat `safeUrl` (uji konten
   aneh mengharapkan `a[href="https://facebook.com/uji"]`).
5. Semua tautan lewat `resolveAction`/`ActionLink`/`safeUrl`, gambar lewat `safeImage`/`<KitPhoto>`; pratinjau tidak
   boleh punya `a[href^="https://wa.me"]` (ActionLink menanganinya). Tidak boleh ada `javascript:`/`vbscript:`.
6. Tahan konten mentah: `content={{}}` dan `content={null}` tidak boleh crash → baca lewat `getSection/text/list/field`.
7. Skema: setiap section di `sections` WAJIB ada di `defaultContent`; konten bawaan lolos `validateContent`
   (maxLength, format URL/telepon/email/warna). Template baru tidak butuh `introduced` (belum ada konten tersimpan).
8. Section baru di luar company profile memakai kunci Inggris pendek (`pricing`, `team`, `events`, `featured`, `faq`).
   `SECTION_ANCHOR` bersama belum mengenalnya → anchor = kunci (`#pricing`); itu diterima.
9. Buat uji sendiri `src/templates/__tests__/<slug>.test.tsx` (pola: `startup-clean.test.tsx`): urutan section,
   field baru tampil, pratinjau diam, slot foto opsional kosong → tata letak menyesuaikan.
10. Kontrak pemilik §4 (`new-templates.test.tsx`, aktif otomatis saat file komponen tidak lagi memuat "STUB
    fondasi"): hero `<TemplateSection sectionKey="hero" data-hero-layout="banner|split|panel">` berisi
    `<KitPhoto priority>` dari foto demo `<slug>-…` (eager, srcset, width/height, alt); `hero.image` bawaan = foto demo
    yang ada di `public/`; registry foto ≥ 6 kunci `<slug>-*`, semua varian ada dan tercatat di `CREDITS.md`
    (`` `<kunci>-*` ``); tidak ada impor dari folder template lain.

Cek sebelum commit: `npx tsc -b`, `npx eslint src/templates/<slug>`, `npx vitest run src/templates src/pages/account`.
Browser: `/demo/<slug>` desktop 1440 + HP 390 (tanpa gulir horizontal), `prefers-reduced-motion`, `/akun/situs/:id`
pratinjau diam, `/template/<slug>`, `/pesan/<slug>`.

### 0.5 Kit template baru — `src/templates/kit/`

Pengganti lokal untuk perubahan bersama yang belum ada (registry foto bersama tertutup untuk template lain, huruf
tambahan). Diuji di `__tests__/kit.test.tsx`.

```ts
// kit/photos.ts — registry foto per template (di <slug>/photos.ts)
export const ARENA_PHOTOS = definePhotos({
  scenes:    [['arena-club-hero', 1600, 900, 'Dua pemain padel di lapangan biru']],   // -1600.webp + -800.webp
  portraits: [['arena-club-portrait-1', 480, 480, 'Potret member']],                     // -480.webp + -240.webp
});
ARENA_PHOTOS.src('arena-club-hero')   // path untuk defaultContent
ARENA_PHOTOS.alt(src, fallback)       // alt bawaan foto demo, selain itu fallback

// kit/context.ts + kit/Photo.tsx — perilaku = <Photo>/<Avatar> bersama + srcset foto lokal
<PhotoSetContext.Provider value={ARENA_PHOTOS}> … </PhotoSetContext.Provider>   // sekali di root template
<KitPhoto src alt className sizes priority fallback="tint"|"none" zoom parallax position>{overlay}</KitPhoto>
<KitAvatar name photo className sizes />

// kit/fonts.ts — huruf judul lokal (Google Fonts, OFL) tanpa menyentuh index.html / Shell
const fontStyle = useKitFont(KIT_FONTS.urbanist);   // atau KIT_FONTS.jost; undefined → {}
<TemplateShell displayFont="inter" …><div style={fontStyle}>…FONT_DISPLAY…</div></TemplateShell>
```

Tetap pakai primitif bersama: `CONTAINER, SECTION_Y, SECTION_GAP, TYPE, SURFACE, RADIUS, FONT_DISPLAY` (layout.ts),
`Reveal, Marquee, CountUp` (Animated.tsx), `stagger, useMotionEnabled, parseCount, formatCount` (motion.ts),
`BrandMark, MapEmbed` (media.tsx), `ClientLogo` (clients.tsx), `ContactForm`, `SOCIAL_FIELDS`, `ActionLink,
TemplateSection` (Shell.tsx), dan helper `utils.ts` (`getSection, text, list, field, isEnabled, splitHighlight,
paragraphs, resolveAction, safeUrl, safeImage, hasImage, whatsappHref, mapsInfo, parseHex, contrast`).

### 0.6 Perubahan bersama yang diinginkan (untuk pemilik `shared/**`, nanti)

1. `shared/assets.ts`: API pendaftaran foto template lain (mis. `registerTemplatePhotos(specs)`) atau `photoAsset`
   yang mengenali pola `-<lebar>.webp` → `<KitPhoto>`/`<KitAvatar>` bisa diganti `<Photo>`/`<Avatar>` bersama.
2. `shared/fonts.ts`: `TemplateFont` + `urbanist`, `jost` → `useKitFont` tidak perlu.
3. `shared/utils.ts` `SECTION_ANCHOR`: `pricing: 'paket'`, `team: 'tim'`, `events: 'acara'`, `featured:
   'unggulan'`, `faq: 'tanya-jawab'` (anchor berbahasa Indonesia).
4. `DEMO_CLIENTS` bertipe tertutup `'corporate-nexa' | 'startup-clean'` → logo mitra fiktif template baru disimpan
   lokal di folder template.

### 0.7 Gaya penulisan demo

Bahasa Indonesia baku-santai, kalimat pendek, tanpa jargon Inggris yang tidak perlu (pakai "Pesan Lapangan",
"Reservasi", "Mulai Gratis"). Angka berformat Indonesia (`1.200+`, `4,9`, `Rp850.000`, `2,4 jt+`). Nama orang di
testimoni fiktif dan tidak berhubungan dengan orang di foto. Tidak ada klaim izin/regulator, klaim medis, atau janji
hasil yang bisa menyesatkan (detail per template di §1.9/§2.9/§3.9).

---

## 1. Arena Club — "Sky court"

### 1.1 Perusahaan demo

**Lintang Padel & Tenis Club** (fiktif), Cilandak, Jakarta Selatan. Tagline: *"Main lebih seru, latihan lebih
terarah"*. Nada: enerjik, ramah, percaya diri. Untuk: klub & lapangan padel/tenis/futsal/badminton/mini soccer, gym,
akademi olahraga.

### 1.2 Palet (sampel sharp dari referensi)

| Token | Hex | Sumber sampel | Pemakaian |
| --- | --- | --- | --- |
| accent (bawaan `brand.accent_color`) | `#2FB2FF` | kartu membership (71% piksel) | kartu paket unggulan, titik level, chip aktif, garis/ikon |
| accent ink (otomatis Shell) | `#2079AE` | `accentVars` | teks aksen di putih (4,75:1) |
| on-accent (otomatis) | ink `#121620` | `accentVars` | teks DI ATAS aksen: navy/hitam, **bukan putih** (putih di #2FB2FF hanya 2,35:1) |
| dark (tetap, tidak ikut aksen) | `#0E1B2E` | tombol "Book now", kartu teks (88%) | tombol utama, kartu bento gelap, footer |
| surface | `#F6F8FC` | kartu statistik & pita membership | kartu abu, latar section bergantian |
| canvas | `#FFFFFF` | latar halaman | |
| ink | `#0B1220` | teks judul (piksel tergelap) | judul & isi kuat |
| muted | `#5B6472` | (turunan, 5,98:1 di putih, 5,63:1 di surface) | isi & label |
| sky foto | `#1E87C9` → `#A7C6E6` | langit hero | hanya nada foto; teks putih di atasnya butuh scrim (putih di #1E87C9 = 3,91:1) |

Tombol utama = navy `#0E1B2E` + teks putih (17,3:1); tombol di atas navy/foto = aksen + teks ink (7,35:1).

### 1.3 Tipografi

Judul **Urbanist** (`useKitFont(KIT_FONTS.urbanist)`, dimuat 300/400/500/600), sans geometris membulat seperti
referensi; isi Inter. Judul besar TIPIS: H1 300–400 (bukan 600/700) tracking −0.03em agar lapang, H2 400; angka
statistik Urbanist 300–400 `tabular-nums`; label/tombol 500–600. Tombol/chip pil penuh (`rounded-full`), kartu radius
28–32, foto hero radius 32.

### 1.4 Section → CMS (urutan halaman)

Field "BARU" ditambahkan engineer di `arena-club/schema.ts` (bentuk `TemplateField`/`TemplateListField` seperti
`shared/schema.ts`; boleh menyalin fungsi pembantunya secara lokal).

| # | Kunci | Wajib | Dari referensi | Desktop (@5xl+) | Field CMS |
| --- | --- | --- | --- | --- | --- |
| 0 | header | ya | logo kiri, menu pil tengah, tombol navy "Book now ↗" | §4.1: bilah putih lengket (`bg-white/90` + blur, garis bawah tipis setelah digulir), BUKAN pil melayang; BrandMark + `ArenaMark` kiri; tautan 14px di tengah dalam SATU grup pil terang (`bg-[#F6F8FC] ring-1 ring-black/[0.06] p-1`), item aktif = pil putih ber-ring; tombol pil navy + ↗ kanan | `brand.*`; tombol = `cta.button_label` → `cta.button_url` / WhatsApp |
| 1 | `hero` | ya | foto lebar membulat, judul terpusat, tombol gelap, bukti sosial avatar kiri-bawah, tautan sosial kanan-bawah | §4.1 `data-hero-layout="banner"`: foto `hero.image` mengisi banner selebar CONTAINER, radius 32, tinggi `min(78svh,720px)` (min. 560), scrim navy dari atas (`from-[#0E1B2E]/55`) + bawah; H1 putih Urbanist 300–400 terpusat maks. 18ch, lead putih/85 maks. 56ch, tombol pil navy + tombol garis putih opsional; kiri-bawah `proof_text` ("Latih bersama pelatih profesional") + 3 avatar bertumpuk (`team.items[0..2].photo`); kanan-bawah tautan sosial ↗ dari footer | `eyebrow` (chip kaca di atas judul, opsional), `title`, `highlight` (garis bawah aksen, BUKAN teks aksen di foto), `subtitle`, `primary_label/url`, `secondary_label/url`, `image`, BARU `proof_text` (text 80) |
| 2 | `about` | ya | pil "About", pernyataan besar kanan; 3 kartu bento: kartu navy berteks, kartu foto + label kaca, kartu angka + baris titik | baris 12 kol: pil eyebrow (4 kol) + pernyataan `title` 28→36px (8 kol); bento 3 kolom tinggi sama (~380px): (a) navy: ikon + `body` paragraf 1 (20–22px putih, sebagian `white/60`) + chip `points[0]`; (b) foto `image` 4:5 + chip kaca `image_label`; (c) surface: `badge_value` (CountUp) + `badge_label` + `badge_text` + baris titik `levels` | `eyebrow`, `title`, `body`, `image`, BARU `image_label` (40), `badge_value`, `badge_label`, BARU `badge_text` (140), `points` (maks. 4, chip di bawah pernyataan), BARU list `levels` maks. 4 `{label (24), value (angka 0–100)}` |
| 3 | `advantages` | ya | "A few more facts… in numbers" + 4 angka | judul terpusat 24–28px, 4 angka sejajar (CountUp, Urbanist 48–56px), label muted, garis tipis atas-bawah | `title`, `stats` (maks. 4); `eyebrow/subtitle/items` tidak dipakai → hapus dari skema Arena |
| 4 | `services` | ya | pil "Services", pernyataan kiri + tombol "Explore More"; rel kartu foto dengan chip kaca, judul di foto, deskripsi di bawah, panah ← → | kiri 4 kol: pil, `title` 24–28px, `subtitle`, tombol navy; kanan 8 kol: rel gulir snap kartu foto 4:5 radius 28 (lebar ±46%/40%), chip kaca `tag`, judul putih di atas gradasi bawah, tombol bulat ↗, `description` di bawah kartu; tombol panah ← → (`aria-label` Sebelumnya/Berikutnya) | `eyebrow`, `title`, `subtitle`, BARU `button_label/button_url`, items maks. 8 `{title, description, image, BARU tag (30)}` |
| 5 | `pricing` BARU | ya | pita abu membulat; kartu paket unggulan biru langit (chip "Most Popular", nama, harga /bulan, chip benefit); judul kanan | pita `surface` radius 40 di dalam CONTAINER; kiri 7 kol: paket ber-`badge` = kartu aksen besar (teks ink), harga 40–48px + `period`, chip benefit dari `features` (satu baris = satu chip), tombol navy; 2 paket lain = kartu putih ring berdampingan di bawahnya; kanan 5 kol: pil eyebrow, H2, subtitle, `note` | `eyebrow`, `title`, `subtitle`, `note` (160), items maks. 4 `{name (40), price (20), period (20), badge (30), description (160), features (textarea 400), button_label (30), button_url}`; tanpa badge → item pertama yang disorot |
| 6 | `team` BARU | ya | menu "Coaches" | judul kiri + rel/grid 4 kolom kartu potret 4:5 radius 24, nama 18px, peran muted, deskripsi 2 baris | `eyebrow`, `title`, `subtitle`, items maks. 8 `{name (60), role (60), photo, description (160)}` |
| 7 | `events` BARU | ya | menu "Events" | daftar baris bergaris: tanggal besar kiri (Urbanist), judul, lokasi muted, chip `tag`, foto 4:3 kecil kanan, tombol ↗ bila `url` | `eyebrow`, `title`, `subtitle`, items maks. 6 `{date (30), title (80), location (80), tag (30), image, url}` |
| 8 | `gallery` | ya | (fasilitas) | bento 12 kol seperti Corporate (1 besar + 4 kecil), keterangan di atas gradasi | standar company profile |
| 9 | `testimonials` | ya | — | 3 kartu `SURFACE.card`, bintang aksen-ink, avatar 44px | standar |
| 10 | `clients` | opsional | — | "Mitra & sponsor": Marquee logo SVG fiktif orisinal (warna ink) | standar (`clients` option) |
| 11 | `cta` | ya | blok "booking" | radius 32, `cta.image` (foto lapangan malam) parallax + scrim `#0E1B2E/70`, H2 putih, tombol aksen (teks ink), `data-tpl-tone="inverse"` | standar + `image` |
| 12 | `contact` | ya | menu "Contacts" | jam buka, alamat, peta radius 28, tombol WhatsApp, (opsional) `ContactForm` | standar |
| 13 | footer | ya | — | navy `#0E1B2E`, teks putih/70, BrandMark putih, menu, sosial, hak cipta; `data-tpl-tone="inverse"` | `footer.*` |

Logo bawaan `ArenaMark` (komponen lokal, `currentColor`, tanpa huruf): persegi membulat berisi garis lapangan (garis
tengah + kotak servis) dengan busur bola di sudut. File lockup demo opsional di `public/assets/templates/logos/
arena-club.svg` (bukan nilai bawaan `brand.logo`).

### 1.5 Gerak

Hero: foto `zoom`/`scale` 1.04 → 1 + parallax ringan, eyebrow → H1 → lead → tombol bertahap, avatar bukti sosial
`stagger`. Bento: kartu `stagger(i)`; titik level "terisi" satu per satu (opacity, 40ms/titik, maks. 0,8 dtk; diam
penuh bila gerak mati). Angka: `<CountUp>`. Rel layanan & pelatih: `<Reveal>` pada wadah rel (bukan per kartu), foto
`zoom`. Paket unggulan: `variant="scale"`. Acara: baris `stagger`. Sponsor: Marquee 40 dtk. CTA: foto parallax.

### 1.6 Foto (Unsplash, WebP; kunci `arena-club-*`)

| Kunci | Rasio / ukuran | Isi (kata kunci Unsplash) | Slot |
| --- | --- | --- | --- |
| `arena-club-hero` | 16:9 1600×900 | dua pemain padel di lapangan luar, langit biru ("padel players outdoor blue sky") | hero |
| `arena-club-coach-lesson` | 4:5 1200×1500 | pelatih/pemain membawa raket, latar langit/biru | bento foto |
| `arena-club-serve` | 4:5 1200×1500 | servis tenis close-up ("tennis serve close up") | layanan 1 |
| `arena-club-balls` | 3:2 1600×1067 | bola tenis/padel di lapangan ("tennis balls court") | layanan 2 |
| `arena-club-junior` | 3:2 | kelas anak ("kids tennis lesson") | layanan / galeri |
| `arena-club-match` | 3:2 | pertandingan/turnamen padel ("padel match") | acara / galeri |
| `arena-club-night` | 16:9 | lapangan di bawah lampu malam ("padel court night") | CTA |
| `arena-club-gym` | 3:2 | latihan fisik atlet ("athlete training gym") | layanan / galeri |
| `arena-club-coach-1..4` | 4:5 1200×1500 atau potret 1:1 480 | potret pelatih, sebaiknya Asia Tenggara | team + bukti sosial |
| `arena-club-portrait-1..3` | 1:1 480 | potret member | testimoni |

### 1.7 HP (bingkai 390px)

Header: mark + nama (truncate) + tombol menu; tombol navy pindah ke panel menu. Hero (§4.1): TETAP banner foto 4:5
radius 24 dengan judul 32–36px terpusat DI ATAS foto (scrim bawah lebih kuat), tombol penuh lebar dan bukti sosial
(avatar + teks) di dalam banner di bawah tombol (sosial disembunyikan di foto, tetap di footer). Pernyataan
about 22px. Bento 1 kolom (kartu foto 4:3). Angka 2×2. Layanan: judul lalu rel snap 80% lebar. Paket: kartu bertumpuk,
unggulan pertama. Pelatih: rel snap 70%. Acara: kartu (tanggal di atas). Tidak ada gulir horizontal halaman.

### 1.8 Aksesibilitas

Teks putih di foto hero/CTA WAJIB scrim (target ≥ 4,5:1; langit polos = 3,9:1 tanpa scrim). Teks di kartu aksen =
ink (7,35:1). Highlight judul di atas foto = garis bawah aksen, bukan teks aksen. Baris titik level: bungkus dengan
`role="img"` + `aria-label="Pemula: 55 member"` dan angkanya tetap teks. Rel: tombol panah ber-label, item fokus
terlihat, `scroll-snap`. Toggle "Game Mode" referensi TIDAK ditiru sebagai kontrol palsu (pakai chip teks).

### 1.9 Catatan salinan

Hindari klaim "lapangan terbaik/nomor 1"; harga paket contoh (mis. Rp450.000, Rp850.000, Rp1.500.000 /bulan) wajar
untuk Jakarta. "Pelatih bersertifikat" boleh sebagai contoh (pembeli mengganti).

---

## 2. Aura Studio — "Quiet sage"

### 2.1 Perusahaan demo

**Sekar Ayu Aesthetic Studio** (fiktif), Coblong, Bandung. Tagline: *"Rawat kulit dan kuku dengan sentuhan ahli"*.
Nada: tenang, hangat, elegan, tidak berlebihan. Untuk: klinik kecantikan/estetika, salon, nail art, spa, lash & brow,
barbershop.

### 2.2 Palet (sampel sharp dari referensi)

| Token | Hex | Sumber sampel | Pemakaian |
| --- | --- | --- | --- |
| accent (bawaan) | `#B8D4A3` | tombol "записаться" `#C5DCB6`, petak `#BEC4A2` | tombol reservasi, chip, tombol bulat panah, tint |
| accent ink (otomatis) | `#617056` | `accentVars` | eyebrow, ikon, teks aksen di putih (5,31:1) |
| on-accent (otomatis) | ink `#121620` | | teks di tombol sage (10,5:1) |
| olive (dekoratif, tetap) | `#BEC4A2` | petak "Лечение акне" | bidang/kartu lembut; teks di atasnya ink (9,4:1) |
| surface | `#F0F0F0` | kartu "Почему мы" (99%) | kartu, chip abu |
| page | `#E9E9E7` | latar luar `#E5E5E5` | pita section bergantian (opsional) |
| portrait bg | `#ACACAC` | latar foto potret | hanya nada foto |
| ink | `#1C1C1C` | judul `#141414` | judul & isi |
| muted | `#5E5E5E` | (turunan; referensi `#828282` hanya 3,9:1) | isi kecil, tab tidak aktif (6,5:1 putih, 5,7:1 surface) |

### 2.3 Tipografi

Judul **Jost** 300 (tipis) huruf kapital (`useKitFont(KIT_FONTS.jost)`), tracking −0.01em, lh 0.98–1.02, H1 40 →
64 → 88px; H2 kapital 300–400, 28 → 48px. Label kecil kapital 11–12px tracking 0.14em. Isi Inter 14–16px. Tombol pil, kartu radius 24,
foto radius 24–28, garis tipis `black/[0.08]`.

### 2.4 Section → CMS

| # | Kunci | Wajib | Dari referensi | Desktop (@5xl+) | Field CMS |
| --- | --- | --- | --- | --- | --- |
| 0 | header | ya | monogram bulat, menu kapital kecil, tombol sage "Reservasi", ikon bulat | §4.2: desktop = bagian dari grid hero (tidak lengket): kiri monogram bulat (`AuraMark` dalam lingkaran garis 44px) + pil kecil "Layanan ▾" (menu turun berisi kategori/perawatan → gulir) + tautan polos kapital 12px; kanan (menumpang sudut kanan-atas foto) tombol pil sage "Reservasi" + 2 tombol bulat 40px WhatsApp/Instagram (`aria-label`) | `brand.*`; tombol = `hero.primary_label` → `primary_url` / WhatsApp |
| 1 | `hero` | ya | judul kapital 3 baris kiri + daftar layanan bergambar; foto potret besar kanan dengan chip kaca | §4.2 `data-hero-layout="split"`: grid `[45fr_55fr]`: kiri 45% — H1 kapital Jost 300, `subtitle` maks. 44ch, blok "Layanan kami" (`list_title` + chip jumlah otomatis "6 perawatan"), 3 baris bergaris rambut `services.items[0..2]` (thumbnail 44px radius 12, judul, chip `count`, tombol bulat → gulir), tautan `secondary_label` → services; kanan 55% — `hero.image` potret tinggi radius 28 mulai dari atas halaman, chip kaca kiri-atas `eyebrow` + ikon lokasi, chip kaca "cari/booking" di foto = TAUTAN nyata `booking_label` → reservasi (bukan input palsu, tanpa "×"), chip kiri-bawah `chat_label` → WhatsApp, chip kanan-bawah `social_label` + ikon sosial | `eyebrow`, `title`, `highlight` (opsional), `subtitle`, `primary_label/url`, `secondary_label/url`, `image`, BARU `list_title` (30), `booking_label` (40), `chat_label` (30), `social_label` (30) |
| 2 | `advantages` | ya | "Почему мы?" di tengah lingkaran garis tipis, 4 kartu abu bernomor di sudut | judul kapital terpusat di dalam 3 lingkaran konsentris (dekoratif, `aria-hidden`); 4 kartu `surface` di kiri-kanan (2+2), tiap kartu: judul 18px, pil nomor "01 / 04", deskripsi 14px muted | `eyebrow`, `title`, `subtitle`, items **tepat 4** untuk tata letak lingkaran (≠ 4 → grid 2 kolom biasa) `{title, description}`; `stats` tidak dipakai |
| 3 | `services` | ya | label "pilih kategori", tab judul besar "Kosmetologi / Layanan kuku", bento foto kategori, kartu terakhir "lebih banyak di Instagram" | tab = judul 32–40px (aktif ink, lainnya muted, pemisah "/"), `role="tablist"`; bento 4 kolom: 2 kartu tinggi 2 baris + 2 kartu lebar, baris bawah 3 kartu + kartu putih `more_label` dengan tombol bulat sage → `more_url`; kartu foto: judul putih kiri-atas di atas gradasi gelap, `price` chip kiri-bawah, tombol bulat → kanan-bawah | `eyebrow`, `title`, `subtitle`, BARU `more_label` (60), `more_url`, items maks. 12 `{title, description, image, BARU category (30), count (20), price (24)}` — tab dari `category` unik (kosong → satu grid tanpa tab) |
| 4 | `featured` BARU | ya | "Japanese manicure": judul kapital kiri + chip "cocok untuk", foto bulat tengah, paragraf kanan + "detail prosedur" | garis tipis penuh + eyebrow; kiri 4 kol: H2 kapital, `tags_title`, chip `tags`; tengah 4 kol: foto bulat 340–380px (`image`) dengan garis lengkung tipis + titik penanda (dekoratif); kanan 4 kol: `body`, langkah bernomor `steps`, tautan `button_label` + tombol bulat sage | `eyebrow`, `title`, `body` (600), `image`, `tags_title` (30), list `tags` maks. 5 `{text (40)}`, list `steps` maks. 4 `{title (40), text (140)}`, `button_label`, `button_url` (kosong → WhatsApp) |
| 5 | `about` | ya | — | foto 4:5 + teks, poin centang, badge kaca `badge_value/label` | standar |
| 6 | `gallery` | ya | — | 3 kolom foto 4:5 radius 24, keterangan di bawah | standar |
| 7 | `testimonials` | ya | — | kutipan besar Jost terpusat + avatar, atau 3 kartu `surface` | standar |
| 8 | `team` BARU | opsional | — | 3–4 potret terapis 4:5 + nama + keahlian | `eyebrow`, `title`, items maks. 6 `{name, role, photo}` |
| 9 | `cta` | ya | — | blok tint aksen (`--tpl-accent-100`) radius 32: H2 kapital + subtitle + tombol sage kiri, `cta.image` radius 24 kanan (opsional) | standar + `image` |
| 10 | `contact` | ya | — | jam buka, alamat, peta, WhatsApp, `ContactForm` | standar |
| 11 | footer | ya | — | putih, garis tipis, mark, menu kapital kecil, sosial | `footer.*` |
| — | `clients` | opsional | — | "Produk yang kami pakai" (bawaan `enabled: false`) | standar |

Logo bawaan `AuraMark`: lingkaran garis tipis berisi dua kelopak lengkung yang saling bertemu (tanpa huruf,
`currentColor`). Referensi memakai monogram huruf; kita tidak meniru.

### 2.5 Gerak

Hero: baris H1 muncul bertahap (fade-up 120ms/baris), foto potret `zoom` lambat, chip kaca `variant="fade"` jeda 400ms.
"Mengapa kami": lingkaran digambar (`stroke-dashoffset`, 1,2 dtk, CSS di file template, mati bila gerak mati) lalu
kartu `variant="left"`/`"right"` + `stagger`. Tab layanan: ganti isi dengan crossfade 200ms (tinggi grid tetap, tanpa
lompat). Bento: foto `zoom`, hover scale 1.03. Featured: foto bulat `variant="scale"`, titik penanda muncul bertahap.

### 2.6 Foto (kunci `aura-studio-*`)

| Kunci | Rasio | Isi (kata kunci Unsplash) | Slot |
| --- | --- | --- | --- |
| `aura-studio-hero` | 4:5 1200×1500 | potret perempuan kulit sehat, latar abu polos, tangan dekat wajah ("skincare portrait grey background") | hero |
| `aura-studio-facial` | 4:5 | perawatan wajah dengan alat ("facial treatment") | layanan |
| `aura-studio-texture` | 4:5 | tekstur krim/serum abstrak ("cream texture") | layanan (konsultasi) |
| `aura-studio-therapist` | 16:9 | terapis dengan lampu kaca pembesar ("beauty therapist magnifying lamp") | layanan lebar |
| `aura-studio-products` | 16:9 | botol perawatan & kapas di latar abu ("skincare products minimal") | layanan lebar |
| `aura-studio-manicure` | 1:1 1200×1200 | tangan dengan kuku alami terawat ("manicure hands natural") | featured (bulat) |
| `aura-studio-nailart` | 4:3 | detail nail art ("nail art") | layanan / galeri |
| `aura-studio-lash` | 4:3 | close-up mata/bulu mata ("eyelash extension") | layanan |
| `aura-studio-sage` | 4:3 | tekstur krim hijau sage ("green cream texture") | layanan (warna aksen) |
| `aura-studio-interior` | 3:2 | interior studio kecantikan tenang ("beauty salon interior minimal") | about / galeri |
| `aura-studio-portrait-1..3` | 1:1 480 | potret pelanggan tersenyum, Asia Tenggara | testimoni |

### 2.7 HP

Urutan hero WAJIB (§4.2): H1 kapital 36–40px → kartu foto potret 4:5 (chip booking tetap di foto, dua chip bawah
jadi satu baris) → daftar layanan bergaris. Lingkaran "Mengapa kami" mengecil di
atas, kartu 1 kolom bernomor. Tab layanan → gulir horizontal chip (bukan judul besar), bento 2 kolom (kartu lebar penuh
lebar). Featured: judul → foto bulat 240px → paragraf → langkah. Tombol reservasi lengket di panel menu.

### 2.8 Aksesibilitas

Sage pucat (1,6:1 vs putih) → JANGAN untuk teks; teks aksen = `--tpl-accent-ink`. Tombol sage berteks ink; batas
tombol tetap terlihat (`ring-1 ring-black/10`). Tab: `role="tab"`, `aria-selected`, panah kiri/kanan berpindah tab,
panel `role="tabpanel"`. Teks putih di kartu foto bento wajib gradasi gelap atas (`from-black/60`). Lingkaran & titik
dekoratif `aria-hidden`. Chip kaca di hero bukan kontrol palsu: chip "cari/booking" adalah `<ActionLink>` berlabel
jelas (mis. "Cari jadwal perawatan, reservasi lewat WhatsApp"), tanpa `<input>` dan tanpa "×". Menu "Layanan ▾":
`<button aria-expanded aria-controls>`, Esc menutup, fokus kembali ke tombol.

### 2.9 Catatan salinan

Tanpa klaim medis atau hasil pasti ("menghilangkan jerawat permanen", "dijamin putih"), tanpa nomor izin/klaim BPOM
fiktif. Pakai bahasa perawatan ("membantu kulit tampak lebih segar"). Harga "mulai" contoh: facial Rp250.000, manikur
Jepang Rp180.000, nail art Rp150.000.

---

## 3. Finova — "Forest & lime"

### 3.1 Perusahaan demo

**Lumbung Arta** (fiktif), Jakarta Selatan: aplikasi tabungan, pembayaran, dan anggaran untuk keluarga, UMKM, dan
koperasi. Tagline: *"Kelola uang keluarga dengan lebih tenang"*. Nada: tenang, meyakinkan, modern.

### 3.2 Palet (sampel sharp dari referensi)

| Token | Hex | Sumber sampel | Pemakaian |
| --- | --- | --- | --- |
| accent (bawaan `brand.accent_color`) | `#1F4D43` | blok CTA `#1D443D`, kartu angka `#23473D` | blok gelap (hero tengah, CTA, kartu angka), teks/ikon aksen (9,5:1 putih) |
| highlight (BARU `brand.highlight_color`) | `#D4F27A` | tombol "Sign up" `#D2F178` | tombol utama di latar gelap, superskrip angka, chip aktif |
| on-highlight | `#0F2620` (dihitung: ink bila kontras ink > putih) | | teks di tombol limau (12,7:1) |
| hero top | `#0B0F0E` | atas hero `#0C0C0D` | awal gradasi hero (= aksen dicampur 80% hitam bila aksen diganti) |
| surface | `#F1F3F2` | kartu bento (63%) | kartu, latar section |
| mint | `#D3DBCF` | mockup kartu | kartu UI/mockup |
| ink | `#0B0F0E` | angka & judul | judul, angka |
| muted | `#5A6863` | (turunan; 5,8:1 putih, 5,2:1 surface) | isi |
| di atas gelap | putih + `#B9C6C1` | | judul putih, isi `#B9C6C1` (9,7:1 di `#0E1F1B`) |

Dua warna merek bisa diubah: `accent_color` (lewat Shell) dan `highlight_color` (field BARU di section `brand`;
hitung `--fin-highlight` + teks di atasnya lokal dengan `parseHex`/`contrast` dari `shared/utils`, nilai tidak valid →
bawaan). Warna gelap hero/CTA diturunkan dari aksen agar pembeli bank biru tetap serasi.

### 3.3 Tipografi

Inter (sudah dimuat) untuk semua; judul 500 tracking −0.04em (lebih rapat dari template lain), angka statistik 56 → 72px
500 dengan sufiks superskrip (`parseCount` → sufiks "jt+", "rb", "+" di `<sup>` berwarna highlight-ink/aksen).
Nomor kartu & nominal di mockup: JetBrains Mono (sudah dimuat aplikasi) `tabular-nums`. Tanpa huruf tambahan.

### 3.4 Section → CMS

| # | Kunci | Wajib | Dari referensi | Desktop (@5xl+) | Field CMS |
| --- | --- | --- | --- | --- | --- |
| 0 | header | ya | logo, menu pil gelap, tombol limau "Sign up" | §4.3: DI DALAM panel hero gelap (transparan, di atas isi panel); setelah panel lewat → bilah lengket `bg-[#0B0F0E]/85` blur dengan susunan sama; menu di tengah dalam pil gelap `white/5 ring-white/10`, item aktif pil `white/12`; tombol pil limau kanan | `brand.*` + BARU `highlight_color`; tombol = `hero.primary_label` |
| 1 | `hero` | ya | latar hijau gelap berkisi, judul 2 baris, tombol limau + panah bulat, tangan memegang kartu, bukti sosial avatar + "10 Million+", logo mitra | §4.3 `data-hero-layout="panel"`: SELURUH hero = satu panel gelap radius 32 di dalam CONTAINER: gradasi `#0B0F0E` → aksen gelap + kisi 64px `white/[0.06]` bermasker + cahaya limau lembut; kiri 7 kol: H1 putih DUA baris maks. 16ch, lead `#B9C6C1`, tombol limau + chip panah bulat; kanan 5 kol: FOTO `hero.image` (tangan memegang kartu/ponsel, 4:5, radius 24) dengan kartu UI melayang menumpang tepinya: kartu saldo (`balance_label`, `balance_value` JetBrains Mono, `balance_caption`, grafik garis dekoratif) + 2 chip transaksi (`chips`); baris bawah DI DALAM panel (garis `white/10`): avatar bertumpuk (`testimonials.items[*].photo`) + `proof_value` besar + `proof_text`; kanan: `clients.title` + logo mitra putih monokrom | `eyebrow` (pil kecil di atas H1, opsional), `title`, `highlight`, `subtitle`, `primary_label/url`, `secondary_label/url`, `image`, BARU `proof_value` (16), `proof_text` (120), `balance_label` (30), `balance_value` (24), `balance_caption` (40), list `chips` maks. 3 `{label (30), value (20)}` |
| 2 | `advantages` | ya | 3 angka besar dengan superskrip, pemisah vertikal | 3–4 angka 56→72px + sufiks `<sup>` highlight-ink, label muted, `border-l` tipis | `stats` maks. 4; `title` opsional (visually hidden bila kosong); `items` tidak dipakai |
| 3 | `about` | ya | "Smarter Finance Better Decisions": bullet + tombol limau; kartu UI melayang (saldo + grafik, daftar kartu) | kiri 5 kol: H2, `body`, `points` (bullet ikon centang highlight), tombol `button_label`; kanan 7 kol: komposisi 2 kartu UI datar (ring, TANPA bayangan berat): kartu saldo (`mock_title`, `mock_value`, `mock_caption`, grafik garis SVG dekoratif) + kartu daftar (`mock_items`); bila `image` diisi (tangkapan layar aplikasi pembeli) → tampil foto itu menggantikan mockup | `eyebrow`, `title`, `body`, `points`, `image` (opsional), BARU `button_label/url`, `mock_title` (40), `mock_value` (24), `mock_caption` (60), list `mock_items` maks. 3 `{label (30), value (24), meta (20)}` |
| 4 | `services` | ya | "Simple, Fast & Hassle-Free": 2 kartu besar + kartu lebar dengan peta dunia + kartu angka hijau | judul terpusat + subtitle; grid: 2 kartu `surface` radius 28 (judul 24px, deskripsi, visual mini CSS atau `image`), kartu lebar dengan peta titik **Indonesia** (SVG orisinal, dekoratif) + kartu aksen `stat_value/stat_label` | `eyebrow`, `title`, `subtitle`, BARU `stat_value` (12), `stat_label` (40), items maks. 4 `{title, description, image}` |
| 5 | `testimonials` | ya | "Join 16M+ Users…": potret perempuan + kartu kutipan + panah | kiri 5 kol: potret 4:5 radius 28 (`items[i].photo`, 1200px); kanan: H2 (`title`), kartu `surface` berisi kutipan, nama, peran, panah ← → (karusel, `aria-live="polite"`) | standar (`photo` dipakai besar → foto 4:5 1200 dari registry; avatar kecil tetap) |
| 6 | `clients` | ya | strip "Meet Our Esteemed Partners" (muncul 2×) | SATU strip saja: di baris bawah panel hero (desktop, logo putih monokrom) / Marquee tepat di bawah panel (HP); logo SVG fiktif orisinal (BUKAN Stripe/Visa/PayPal dsb.) | standar |
| 7 | `faq` BARU | ya | — | 2 kolom: kiri eyebrow + H2 + subtitle + tombol WhatsApp; kanan accordion bergaris (`<button aria-expanded>`), satu terbuka | `eyebrow`, `title`, `subtitle`, items maks. 8 `{question (120), answer (textarea 500)}` |
| 8 | `cta` | ya | blok hijau gelap berkisi "Take Control…" + tombol limau | radius 32, aksen gelap + kisi `white/[0.06]` + cahaya limau tipis, H2 putih terpusat, subtitle `#B9C6C1`, tombol limau + 2 tombol unduh (`app_store_url`, `play_store_url`: teks "App Store"/"Google Play" + ikon generik lucide, BUKAN badge resmi); `data-tpl-tone="inverse"` | standar + BARU `app_store_url`, `play_store_url` (kosong → tombol disembunyikan) |
| 9 | `contact` | ya | — | ringkas: 3 kartu info (email, telepon, alamat) + WhatsApp; peta opsional | standar |
| 10 | footer | ya | logo, deskripsi, tombol unduh, kolom Quick Links / Services / Community / Social | kiri: BrandMark + `description` + tombol unduh (dari `cta.*_store_url`); kolom tautan dikelompokkan per `group`; kolom "Media sosial" otomatis; baris bawah hak cipta + `legal_note` | `footer.*` + BARU list `links` maks. 16 `{group (30), label (40), url}`, `legal_note` (200) |
| — | `gallery` | tidak | — | Finova tidak punya galeri (hapus dari skema) | — |

Logo bawaan `FinovaMark`: atap lumbung (segitiga membulat) yang menaungi koin (lingkaran) — abstrak, tanpa huruf.
Referensi memakai dua garis miring; kita tidak meniru.

### 3.5 Gerak

Hero: kisi memudar masuk (opacity 0 → 1, 1 dtk), H1/lead/tombol bertahap, foto `variant="left"`, kartu saldo
`variant="up"` jeda 320ms dan chip transaksi `variant="right"` jeda 400/480ms (tanpa animasi mengambang terus-menerus). Angka: `<CountUp>` + sufiks tetap. Kartu UI:
`variant="up"` bertahap, grafik garis digambar (`stroke-dashoffset` 1,2 dtk). Bento `stagger`. Mitra: Marquee 36 dtk
(atau statis di zona hero). FAQ: buka-tutup `grid-rows-[0fr→1fr]` 300ms (mati bila gerak mati). CTA: statis.

### 3.6 Foto (kunci `finova-*`)

| Kunci | Rasio | Isi (kata kunci Unsplash) | Slot |
| --- | --- | --- | --- |
| `finova-hero` | 4:5 1200×1500 | tangan memegang kartu polos di latar gelap ("hand holding card dark background") — kartu tanpa logo bank/jaringan | hero |
| `finova-app` | 3:2 | orang memakai aplikasi keuangan di ponsel ("mobile banking app") | about (cadangan) / bento |
| `finova-owner` | 3:2 | pemilik usaha meninjau laporan di laptop ("small business owner laptop") | bento |
| `finova-community` | 3:2 | pertemuan komunitas/koperasi ("community meeting") | bento / about |
| `finova-payment` | 3:2 | pembayaran nirsentuh/QR ("contactless payment") | bento |
| `finova-testimonial` | 4:5 1200×1500 | potret profesional perempuan memegang map/tablet ("businesswoman portrait") | testimoni besar |
| `finova-portrait-1..4` | 1:1 480 | potret tersenyum, Asia Tenggara | avatar bukti sosial & testimoni |

Hindari foto dengan logo Visa/Mastercard/bank asli atau layar aplikasi merek lain.

### 3.7 HP

Hero (§4.3) TETAP panel gelap radius 24: menu (mark + tombol menu) di dalam panel, H1 34px, tombol penuh lebar, foto
tangan+kartu 4:5 dengan SATU kartu saldo melayang menumpang tepi bawah foto (chip transaksi disembunyikan), lalu
bukti sosial di dalam panel; strip mitra = Marquee tepat di bawah panel. Angka 1 kolom dengan pemisah horizontal. Kartu UI ditumpuk vertikal (tanpa tumpang tindih). Bento 1
kolom. Testimoni: potret 4:3 lalu kartu kutipan. Footer: kolom tautan 2 kolom.

### 3.8 Aksesibilitas

Limau `#D4F27A` hanya sebagai LATAR tombol/chip (teks ink 12,7:1) atau teks di latar gelap (13,6:1); JANGAN teks limau
di putih (1,25:1). Panel hero gelap seluruhnya (`data-tpl-tone="inverse"`): semua teks putih / `#B9C6C1`, cahaya
limau tidak boleh menurunkan kontras di bawah 4,5:1 (taruh di belakang foto, bukan di belakang teks); logo mitra putih
monokrom, nama teks cadangan tetap ≥ 4,5:1. Kartu UI di atas foto: teks ink di kartu putih. Mockup kartu & grafik: `aria-hidden` kecuali teks dari CMS (tetap terbaca pembaca layar). Accordion
FAQ: `<button aria-expanded aria-controls>`, panel `role="region"`. Karusel testimoni: tombol ber-label, tidak berjalan
sendiri.

### 3.9 Catatan salinan

Tanpa klaim izin/regulator ("terdaftar dan diawasi OJK"), suku bunga, imbal hasil, atau jaminan keuntungan — pembeli
menambahkan sendiri sesuai izinnya. Pakai klaim netral: "Data terenkripsi", "Tanpa biaya tersembunyi", "Bantuan 24
jam". Angka demo wajar untuk aplikasi lokal (2,4 jt+ pengguna, 120+ kota, rating 4,8).

---

## 4. Sistem tata letak MENGIKAT (permintaan pemilik)

Pemilik: *"dari ke-3 website tersebut layoutnya jangan sama, buat berbeda-beda tata letak, style, dan hero sectionnya;
hero section harus ada gambarnya."* Bagian ini MENGIKAT dan menang atas detail §1–§3 yang bertentangan. Verifier
menolak template yang tidak memenuhinya.

### 4.0 Aturan umum (ketiganya)

1. **Berbeda total.** Ketiga template (dan Corporate Nexa / Startup Clean) tidak boleh terlihat seperti satu sistem
   yang berganti warna: header, hero, grid, bentuk kartu, tombol, label section, ritme latar, foto, dan footer
   masing-masing mengikuti matriks §4.4.
2. **Hero wajib foto asli** (Unsplash, WebP, `<KitPhoto priority>` = eager + `fetchpriority="high"`) dari registry
   foto template itu sendiri (`<slug>-hero`), tampil di desktop DAN HP. Foto unggahan pembeli kosong/gagal →
   `fallback="tint"` menjaga bentuk hero; konten bawaan selalu berfoto.
3. **Tanpa berbagi komponen.** Tidak ada impor dari `../startup-clean`, `../corporate-nexa`, atau folder template
   baru lain; section, kartu, dan nav ditulis di folder template sendiri. Yang boleh dipakai bersama hanya primitif:
   `shared/**` (CONTAINER & ritme, `Reveal`/`Marquee`/`CountUp`/`stagger`, `TemplateShell`/`TemplateSection`/
   `ActionLink`, `BrandMark`, `ClientLogo`, `ContactForm`, `MapEmbed`, utils) dan `kit/**` (foto & huruf).
4. **Penanda hero:** `<TemplateSection sectionKey="hero" data-hero-layout="…">` dengan nilai `banner` (Arena),
   `split` (Aura), `panel` (Finova); dipakai uji kontrak & verifier.
5. **HP 390px tetap berkarakter**, bukan tumpukan generik yang sama: lihat baris "HP" tiap template.
6. Semua aturan umum tetap: CMS (setiap teks/gambar/list bisa diubah, logo bisa diunggah, aksen bisa diubah), salinan
   Indonesia, merek & logo fiktif orisinal, gerak tenang (mati di `prefers-reduced-motion` & pratinjau CMS), datar
   (garis tipis, bayangan minimal), kontras ≥ 4,5:1, alt, fokus terlihat, landmark, container query.

### 4.1 Arena Club — "banner terpusat" (`data-hero-layout="banner"`)

- **Nav:** bilah putih lengket (`bg-white/90` + blur; garis bawah tipis setelah digulir), BUKAN pil melayang
  (itu milik Startup Clean). Kiri `ArenaMark` + nama (Urbanist 600). Tengah: tautan 14px di dalam SATU grup pil
  terang (`rounded-full bg-[#F6F8FC] ring-1 ring-black/[0.06] p-1`), item aktif/sorot = pil putih ber-ring. Kanan:
  tombol pil navy `#0E1B2E` "Pesan Lapangan ↗".
- **Hero:** banner foto di dalam gutter halaman (selebar CONTAINER, tidak menembus tepi layar), radius ±32px, tinggi
  `min(78svh, 720px)` (min. 560px); foto mengisi seluruh banner (`object-cover`, parallax ringan). Scrim lembut
  gelap navy atas + bawah agar teks ≥ 4,5:1. Isi TERPUSAT di atas foto: chip kaca eyebrow (opsional), H1 putih besar
  Urbanist TIPIS (300–400) maks. 18ch, lead putih/85, tombol pil (navy, atau aksen + teks ink) + tombol garis putih
  opsional. Kiri-bawah: "Latih bersama pelatih profesional" (`proof_text`) + 3 foto avatar pelatih bertumpuk
  (ring putih). Kanan-bawah: tautan sosial teks "Instagram ↗ · YouTube ↗ · TikTok ↗".
- **Gaya:** lapang, biru langit + navy; latar putih dengan pita `#F6F8FC`; kartu BESAR radius 28–32 berisi warna
  pejal (navy, biru langit, abu) tanpa garis tepi; label section = pil kecil bergaris ("Tentang Lintang"); judul
  besar tipis; tombol selalu pil dengan ↗. Urutan khas: pernyataan about besar → bento tiga (kartu navy berteks,
  kartu foto + label kaca buram, kartu angka + baris titik) → baris angka TERPUSAT → rel foto layanan horizontal
  dengan tombol panah ← → → kartu membership biru langit pejal → pelatih → acara → CTA foto malam → footer navy.
- **HP:** banner foto 4:5 radius 24 dengan judul 32–36px TETAP di atas foto (terpusat), tombol penuh lebar dan bukti
  sosial di dalam banner; sosial pindah ke footer. Bento 1 kolom, angka 2×2, rel snap.

### 4.2 Aura Studio — "belah editorial" (`data-hero-layout="split"`)

- **Nav:** desktop = bagian atas grid hero (tidak lengket; boleh bilah ringkas lengket muncul setelah hero lewat).
  Kiri: logo monogram BULAT (`AuraMark` di lingkaran garis tipis 44px; logo unggahan tetap di lingkaran) + pil kecil
  abu "Layanan ▾" (menu turun: kategori/perawatan → gulir) + tautan polos kapital 12px. Kanan, menumpang sudut
  kanan-atas foto hero: tombol pil sage "Reservasi" (teks ink) + 2 tombol ikon BULAT 40px (WhatsApp, Instagram).
- **Hero:** belah asimetris `grid-cols-[45fr_55fr]`. Kiri 45%: H1 KAPITAL editorial sangat besar (Jost 300, lh
  0.98–1.02, 3 baris), lalu blok "Layanan kami" + chip jumlah, dan daftar layanan dipisah garis rambut: thumbnail,
  nama, chip jumlah, tombol panah bulat; tautan kecil "LIHAT SEMUA". Kanan 55%: kartu foto POTRET tinggi radius 28
  yang mulai dari atas halaman, chip lokasi kaca kiri-atas, chip "cari/booking" kaca di foto (tautan nyata berbentuk
  kolom cari → reservasi, bukan input palsu), dan dua chip kecil melayang di bawah: kiri "Tulis pesan" (kontak
  WhatsApp), kanan sosial (ikon TikTok/Instagram).
- **Gaya:** editorial tenang, abu terang + sage/zaitun; garis rambut dan lingkaran tipis menggantikan bayangan dan
  isian tebal; kartu abu `#F0F0F0` radius 20 tanpa ring; label section = teks KAPITAL abu 11px tracking 0.14em (tanpa
  pil); tombol = pil sage + bulatan panah TERPISAH. Urutan khas: "Mengapa kami?" = 4 kartu mengelilingi judul terpusat
  di dalam lingkaran konsentris tipis → tab kategori (judul besar "Perawatan Wajah / Kuku") di atas bento foto
  campuran (tinggi, lebar, persegi; tiap ubin tombol panah bulat) → perawatan unggulan dengan foto BULAT besar +
  langkah → testimoni → CTA tint sage → footer putih bergaris rambut.
- **HP:** H1 kapital → kartu foto potret 4:5 (chip booking tetap di foto) → daftar layanan bergaris. Tab kategori jadi
  chip gulir, bento 2 kolom, foto bulat featured 240px.

### 4.3 Finova — "panel gelap" (`data-hero-layout="panel"`)

- **Nav:** DI DALAM panel hero gelap: kiri `FinovaMark` + nama putih; tengah tautan di dalam pil gelap (`bg-white/5
  ring-1 ring-white/10`), item aktif pil `white/12`; kanan tombol pil limau "Mulai Gratis" (teks ink). Setelah panel
  lewat: bilah lengket gelap `#0B0F0E/85` + blur.
- **Hero:** panel besar hijau hutan gelap radius 32 di dalam gutter halaman, tekstur kisi tipis bermasker + cahaya
  lembut. Kiri: H1 besar DUA baris (Inter 500, tracking −0.045em) + lead + tombol pil limau dengan chip panah bulat.
  Kanan: FOTO asli tangan memegang kartu (atau orang memakai ponsel) dalam bingkai radius 24, dengan kartu UI
  melayang menumpang tepinya: kartu saldo (nominal JetBrains Mono, grafik garis kecil) + 2 chip transaksi kecil, semua
  teksnya dari CMS. Di bawah, MASIH di dalam panel (dipisah garis `white/10`): avatar bertumpuk + "10 juta+" + teks
  bukti sosial, dan strip logo mitra putih monokrom.
- **Gaya:** kontras tinggi, gelap/terang bergantian (panel gelap → angka di putih → fitur di putih → bento abu →
  testimoni putih → pita CTA gelap berkisi → footer terang kaya); limau hanya sebagai latar tombol/chip dan superskrip
  di latar gelap; grotesk rapat; angka raksasa dengan superskrip satuan dipisah garis vertikal; kartu bento abu
  `#F1F3F2` radius 24 tanpa ring; kartu UI mockup putih radius 16 ber-ring tipis; label section = chip kecil dengan
  titik aksen. Urutan khas: angka → fitur dengan kartu UI melayang → bento "sederhana, cepat, tanpa ribet" →
  testimoni dengan potret besar → FAQ → pita CTA gelap → footer multi-kolom.
- **HP:** tetap panel gelap radius 24 (menu di dalamnya): H1 → tombol penuh lebar → foto 4:5 dengan SATU kartu saldo
  melayang (chip transaksi disembunyikan) → bukti sosial; strip mitra Marquee tepat di bawah panel.

### 4.4 Matriks pembeda (dicek verifier)

| Aspek | Arena Club | Aura Studio | Finova | Sudah dipakai (hindari) |
| --- | --- | --- | --- | --- |
| Header | bilah putih lengket; tautan di grup pil terang tengah; CTA pil navy | bagian dari hero, monogram bulat, dropdown "Layanan", aksi di atas foto | di dalam panel gelap, pil tautan gelap, CTA limau | Corporate: menu kanan + tombol aksen; Startup: header pil melayang |
| Hero | banner foto penuh radius 32, teks terpusat DI ATAS foto | belah 45/55: judul kapital + daftar layanan / potret tinggi + chip | panel gelap berkisi: judul kiri / foto + kartu UI melayang, bukti sosial + mitra di panel | Corporate: belah 6/6 judul kiri foto kanan; Startup: teks terpusat DI ATAS panel foto 16:9 |
| Judul | Urbanist 300–400, kalimat biasa, terpusat | Jost 300 KAPITAL, rata kiri, lh rapat | Inter 500 tracking −0.045em, 2 baris | Corporate Inter 600; Startup Jakarta 700 |
| Kartu | radius 28–32, isian pejal, tanpa garis | radius 20 abu tanpa ring + garis rambut + lingkaran | bento abu radius 24 + kartu UI putih radius 16 ber-ring | `SURFACE.card` putih ber-ring radius 24 |
| Tombol | pil + ↗ di dalam label | pil sage + bulatan panah terpisah | pil limau + chip panah bulat | Corporate radius 12 |
| Label section | pil kecil bergaris | teks kapital abu 11px | chip dengan titik aksen | eyebrow aksen kapital 12px |
| Ritme latar | putih + pita abu kebiruan, satu pita membulat (membership) | putih + abu netral, garis rambut | gelap ↔ terang bergantian | putih + `bg-alt` |
| Bentuk foto | membulat besar, rel horizontal | potret tinggi, bento campuran, foto BULAT | foto berbingkai + kartu UI menumpang | foto 4:5 + kartu kaca |
| Angka | baris terpusat + baris titik | — (tanpa baris angka besar) | raksasa + superskrip, pemisah vertikal | grid angka 2×2 |
| Footer | navy | putih bergaris rambut | terang, multi-kolom kaya + tombol unduh | putih |
| Gerak khas | foto banner zoom + parallax, titik level terisi, rel | baris judul bertahap, lingkaran digambar, crossfade tab | kisi memudar, kartu UI meluncur, grafik digambar, angka berjalan | reveal standar |

### 4.5 Uji kontrak — `src/templates/__tests__/new-templates.test.tsx`

Selalu jalan: ketiga slug terdaftar dengan komponen yang berbeda satu sama lain; nilai `data-hero-layout` unik. Per
template, AKTIF otomatis begitu file komponen (`ArenaClub.tsx` / `AuraStudio.tsx` / `Finova.tsx`) tidak lagi memuat
penanda `STUB fondasi` (selama stub → dilewati):

1. tidak ada impor dari folder template lain (`corporate-nexa`, `startup-clean`, dua template baru lainnya);
2. `hero.image` bawaan = `/assets/templates/photos/<slug>-….webp` yang ada di `public/`; hero berpenanda
   `data-hero-layout` yang benar dan berisi `img[fetchpriority="high"]` dengan src itu, `loading="eager"`, srcset 800w,
   width/height, alt;
3. registry foto ≥ 6 kunci `<slug>-*`, semua varian (`-1600/-1200/-480` + `-800/-240`) ada di `public/` dan setiap kunci
   tercatat di `public/assets/templates/photos/CREDITS.md` sebagai `` `<kunci>-*` ``.

---

## 5. Stub yang harus diganti tiap engineer

Fondasi (commit "feat(templates): register Arena Club, Aura Studio, Finova templates, catalog data and briefs")
mendaftarkan ketiga slug dengan stub yang SUDAH lolos uji registry/shell/CMS. Stub komponen sementara merender Startup
Clean dengan konten template baru (hanya agar rute & CMS jalan; TIDAK boleh tersisa di hasil akhir, lihat §4.0).
Ganti/isi file berikut di folder masing-masing:

| Template | Ganti total | Isi / perluas | Tetap |
| --- | --- | --- | --- |
| arena-club | `ArenaClub.tsx` (stub → komponen sendiri, boleh dipecah ke file lain; HAPUS penanda `STUB fondasi`), `schema.ts` (skema §1.4) | `defaultContent.ts` (sudah berisi salinan Lintang; tambah foto, `pricing`/`team`/`events`, field baru), `photos.ts` (registry foto) | `index.ts` (ubah hanya bila nama ekspor berubah) |
| aura-studio | `AuraStudio.tsx` (hapus penanda stub), `schema.ts` (§2.4) | `defaultContent.ts` (Sekar Ayu), `photos.ts` | `index.ts` |
| finova | `Finova.tsx` (hapus penanda stub), `schema.ts` (§3.4) | `defaultContent.ts` (Lumbung Arta), `photos.ts` | `index.ts` |

Setelah komponen sendiri jadi, impor `../startup-clean/StartupClean` harus hilang dari folder template (diuji §4.5),
dan komentar kepala "STUB fondasi" di `defaultContent.ts`, `schema.ts`, `photos.ts` diganti keterangan biasa.
Laporkan juga bila butuh perubahan di `shared/**` (catat di §0.6, jangan edit).
