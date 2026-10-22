# Desain Premium Template Company Profile (Corporate Nexa & Startup Clean)

Brief desain + kontrak teknis untuk perombakan dua template situs pembeli (`src/templates/**`). Permintaan pemilik
(2026-10-22): lebih premium dan modern, **foto asli (bukan ilustrasi)**, wadah penuh kiri-kanan seperti situs utama,
**logo perusahaan** di template, **gerak**, tata letak & gaya lebih baik, **bayangan seminimal mungkin**.

Referensi visual: Untitled UI (judul kiri + foto besar membulat di kanan, bukti sosial avatar, blok biru tegas),
BankEase (lapang, baris angka, strip logo, kartu foto), Active (hero lembut terpusat, kartu angka melayang, strip logo,
kartu bento, daftar manfaat bergaris), InsightHub (hero terpusat di atas panel bertumpuk, palet abu-biru tenang).

Premium di sini berarti: tipografi editorial, ruang lega, fotografi nyata, warna menahan diri (SATU aksen), garis tipis
(ring) alih-alih bayangan, gerak tenang yang bermakna.

Kontrak umum tetap `docs/platform/SPEC.md` §7. Dokumen ini menambah, tidak mengganti.

---

## 1. Sistem bersama (berlaku untuk kedua template)

### 1.1 Wadah & ritme — `src/templates/shared/layout.ts`

| Konstanta | Isi | Kegunaan |
| --- | --- | --- |
| `CONTAINER` | maks. 1680px, tepi 20 → 32 (@2xl) → 48 (@5xl) → 64px (@min-[96rem]) | header, SETIAP section, footer (tepi sejajar dengan situs utama `container-site`) |
| `MEASURE` | `mx-auto max-w-[760px]` | blok teks terpusat |
| `SECTION_Y` | 64 → 96 → 112 → 128px | section biasa |
| `SECTION_Y_SM` | 48 → 64 → 80px | strip logo, CTA |
| `SECTION_GAP` | 40 → 56 → 64px | judul section → isi |

Semua ukuran memakai **container query** (`@…`), bukan breakpoint viewport: template dirender di bingkai HP 390px
(demo), panel CMS 1280px yang diperkecil, dan layar penuh. Patokan: @xl 576 · @2xl 672 · @3xl 768 · @4xl 896 ·
@5xl 1024 · @6xl 1152 · @7xl 1280 · @min-[96rem] 1536.

Grid desktop 12 kolom (`@5xl:grid-cols-12`), jarak kolom 24 → 32 → 48px (`gap-6 @5xl:gap-8 @7xl:gap-12`).

### 1.2 Tipografi — `TYPE`, `FONT_DISPLAY`

| Peran | HP → desktop → lebar | Catatan |
| --- | --- | --- |
| `TYPE.display` (H1 hero) | 32 → 48 → 60 → 72 → 80px, lh 1.06, tracking −0.035em | ketebalan: Corporate 600, Startup 700 |
| `TYPE.h2` | 28 → 40 → 48 → 56px, lh 1.1, −0.03em | judul section, maks. ~18 kata |
| `TYPE.h3` | 18 → 20px | judul kartu |
| `TYPE.lead` | 16 → 18 → 19px, relaxed | paragraf pembuka, maks. 60ch |
| `TYPE.body` | 15 → 16px | isi |
| `TYPE.eyebrow` | 12px, 600, uppercase, tracking 0.16em | label di atas judul, warna `--tpl-accent-ink` |
| `TYPE.stat` | 40 → 48 → 56px, tabular | angka statistik (+ `<CountUp>`) |

Huruf judul lewat `TemplateShell displayFont`: Corporate = `'inter'` (sudah dimuat), Startup = `'jakarta'` (Plus Jakarta
Sans, dimuat otomatis dari Google Fonts). Pakai `FONT_DISPLAY` pada H1/H2/H3 dan angka besar; isi tetap Inter.
Teks isi berwarna `text-muted`, judul `text-fg`. Panjang baris isi ≤ 68ch.

### 1.3 Warna

- Kanvas putih; pita bergantian `bg-alt` (#F7F8FB). Tidak ada latar gelap selain lapisan di atas foto/CTA.
- **Satu aksen** (`brand.accent_color`, variabel `--tpl-accent*` dari Shell): tombol utama, eyebrow, kata sorotan judul,
  ikon kecil, angka statistik, garis aktif, blok CTA. Teks aksen di latar putih SELALU `--tpl-accent-ink` (kontras
  dijamin ≥ 4.5:1); teks di atas aksen SELALU `--tpl-on-accent`. Tint `--tpl-accent-50/100/200` hanya untuk bidang
  lembut (latar ikon, glow hero), bukan teks.
- Teks putih di atas foto: wajib lapisan gelap (mis. `bg-gradient-to-t from-black/70 via-black/30 to-transparent` di
  bawah keterangan, atau scrim penuh `bg-[#0B1220]/65`) agar ≥ 4.5:1.

### 1.4 Permukaan — `SURFACE`, `RADIUS`

- Kartu datar: `SURFACE.card` (putih + `ring-1 ring-inset ring-black/[0.07]`), `SURFACE.muted` (abu muda),
  `SURFACE.accent` (tint aksen). Hover kartu yang bisa diklik: `SURFACE.hover` (garis → `--tpl-accent-200`), tanpa
  angkat/geser.
- Chip/kartu melayang di atas foto: `SURFACE.glass` (putih 85% + blur + ring). **Tanpa bayangan.**
- Pemisah: garis 1px `SURFACE.hairline` (`border-black/[0.08]`, pakai dengan `border-t`/`divide-y`).
- Bayangan HANYA untuk lapisan melayang milik Shell (tombol WhatsApp, keterangan pratinjau). Hapus semua
  `shadow-[…]` di kartu, foto, header, dan tombol.
- Radius: foto besar 28px (`RADIUS.photo`), kartu 24px, kontrol 12px (Corporate) / pil penuh (Startup).

### 1.5 Foto — `<Photo>` + `src/templates/shared/assets.ts`

- Semua foto demo asli dari Unsplash (lisensi bebas komersial, `public/assets/templates/photos/CREDITS.md`), WebP dua
  lebar. Konten menyimpan SATU path (`templatePhoto('corporate-nexa-hero')` →
  `/assets/templates/photos/corporate-nexa-hero-1600.webp`); `<Photo>`/`<Img>`/`<Avatar>` menambah `srcset` otomatis.
- `<Photo>`: `priority` HANYA untuk foto hero (eager + fetchpriority high); lainnya lazy. Isi `sizes` sesuai slot:
  hero belah dua `"(min-width: 1024px) 50vw, 100vw"`, hero lebar `"(min-width: 1280px) 1200px, 100vw"`,
  kartu 3 kolom `"(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"`.
- Gambar kosong/gagal: `fallback="tint"` (bidang lembut aksen, tanpa ilustrasi) untuk slot wajib (hero, about),
  `fallback="none"` untuk slot opsional (gambar layanan, gambar kedua, latar CTA) lalu tata letak menyesuaikan
  (cek dulu dengan `hasImage(src)` dari `./utils`). Ilustrasi `<Art>`/`<Img art>` lama jangan dipakai di desain baru.
- Alt: foto demo → `photoAlt(src, fallback)` (deskripsi registry); galeri → keterangan item; foto unggahan pembeli →
  judul/keterangan di dekatnya atau nama perusahaan. Foto dekoratif murni → `alt=""`.
- Arahan foto: lihat §3.4 dan §4.4. Rasio slot: hero 4:5 atau 5:4 (Corporate), 16:9 (Startup), kartu 4:3/16:10,
  potret 1:1. `object-position` lewat prop `position` bila subjek tidak di tengah.

### 1.6 Logo — `<BrandMark mark>` + `src/templates/shared/marks.tsx`

- Header & footer: `<BrandMark name logo mark={<StructureMark className="h-8 w-8 text-(--tpl-accent)" />} />`
  (Startup: `BloomMark`). Logo unggahan pembeli tetap menang; tanpa logo → simbol bawaan template + nama perusahaan
  (menggantikan kotak inisial). Simbol abstrak tanpa huruf, satu warna (currentColor) → cocok untuk nama apa pun.
- `brand.logo` bawaan TETAP `''`: file lockup demo (`public/assets/templates/logos/samudra-karya.svg`,
  `kirana-labs.svg`) tidak dijadikan nilai bawaan agar situs pembeli tidak tampil dengan logo perusahaan lain.
- Wordmark nama: 600 (Corporate) / 700 Jakarta (Startup), 15 → 17px, tracking −0.02em, `truncate` di HP.

### 1.7 Gerak — `src/templates/shared/Animated.tsx`, `motion.ts`, `template.css`

| Gerak | Komponen | Pakai di | Aturan |
| --- | --- | --- | --- |
| Muncul saat digulir (naik 20px + pudar, 0.8s, kurva tenang) | `<Reveal as delay variant>` | judul section, kartu, baris daftar, blok hero | daftar: `delay={stagger(i)}` (80ms/item, maks. 6 langkah); hero: eyebrow 0 → judul 80 → lead 160 → tombol 240 → media 320 |
| Strip logo berjalan (40 dtk/putaran, berhenti saat disorot) | `<Marquee label>` + `<ClientLogo>` | section `clients` | gerak mati → daftar statis rata tengah |
| Angka berjalan (1.6 dtk, ease-out) | `<CountUp value>` | angka statistik | teks bukan satu angka (mis. "24/7") tampil apa adanya |
| Zoom-out foto (1.08 → 1, 1.6 dtk) | `<Photo zoom>` | foto galeri & kartu | |
| Parallax ringan (±6% tinggi foto) | `<Photo parallax>` | SATU foto besar per halaman (hero / latar CTA) | jangan di HP kecil bila foto < 300px tinggi |
| Hover | kelas Tailwind | foto kartu: `imgClassName="transition-[scale] duration-700 group-hover:scale-[1.04]"`; tombol: warna saja | tanpa lompat/angkat kartu |

Kapan gerak mati (semua isi langsung tampil statis, tanpa sembunyi): pratinjau CMS (`motion` tidak dikirim +
`preview`), `prefers-reduced-motion`, cetak, tab latar saat dipasang, browser tanpa IntersectionObserver. Elemen jauh
di bawah layar baru "disiapkan" saat mendekat (35% tinggi layar), jadi tangkapan halaman penuh / perayap tidak melihat
bidang kosong; pengaman 2,5 dtk memunculkan elemen yang sudah di layar bila observer tertahan.

Larangan: jangan beri kelas `transition-*` pada elemen `<Reveal>` sendiri (menimpa transisinya; taruh efek hover di
elemen dalam). Jangan `<Reveal>` per item di rel gulir horizontal (bungkus relnya). Tidak ada animasi tanpa henti
selain marquee. Durasi ≤ 1 dtk untuk elemen UI.

### 1.8 Aksesibilitas & tata letak HP

- Landmark: `header` (nav `aria-label="Menu utama"`), `main`, `footer` (pertahankan pola sekarang); satu `h1` (hero).
- Fokus terlihat: otomatis cincin `--tpl-accent-ink` (template.css). Di atas bidang aksen/foto gelap beri wadahnya
  `data-tpl-tone="inverse"` → cincin putih.
- Target sentuh ≥ 44px; tombol penuh-lebar di HP; tidak ada gulir horizontal halaman (cek `scrollWidth` di 390px).
- Kontras ≥ 4.5:1 untuk semua teks (lihat §1.3). Logo klien dikecualikan (logotipe), tetapi nama teks cadangan tetap
  ≥ 4.5:1 (sudah di `<ClientLogo>`).
- Bingkai HP 390px: H1 32px, section 64px, kartu satu kolom, foto hero 4:3/4:5 di bawah teks.

---

## 2. Kompatibilitas konten (situs pembeli yang sudah ada)

Konten situs disimpan per situs (`template_sites.content`, CMS menyimpan SELURUH konten hasil resolve). Aturan:

1. **Semua kunci lama tetap dibaca** dengan arti yang sama: section `brand, hero, about, services, advantages, gallery,
   testimonials, cta, contact, footer` dan seluruh field-nya (lihat `shared/schema.ts`). Tidak ada field yang dihapus
   atau diganti nama. `enabled`, navigasi (`navItems`), `ActionLink`, perilaku pratinjau, formulir kontak, tombol
   WhatsApp tetap.
2. **Field gambar lama** menerima apa pun yang sudah tersimpan (path unggahan `/assets/sites/…`, URL, data-URI).
   Nilai `''` yang tersimpan di situs lama tetap `''` → template menampilkan `fallback` netral / menyembunyikan slot.
   Mengganti nilai bawaan `''` → foto demo hanya memengaruhi demo dan situs baru (konten `null`).
3. **Field/section baru WAJIB opsional** dan bertanda `introduced` (`TEMPLATE_V2 = '2026-10'`, otomatis lewat
   `SchemaOptions`). `resolveContent` (→ `shared/compat.ts`) memastikan konten tersimpan LAMA tidak mendapat isi demo:
   section baru yang belum ada → `enabled: false` (isi contoh tetap ada untuk dinyalakan di CMS), field baru yang belum
   ada → `''`. Konten `null` (demo/situs baru) → nilai bawaan utuh. Diuji di `src/templates/__tests__/shared-premium.test.tsx`.
4. Template tetap tahan konten mentah/aneh (uji `templates.test.tsx` "konten aneh" & "tanpa resolveContent").
5. Prop baru `motion` (opsional) di `TemplateRenderProps`: template WAJIB meneruskannya ke Shell
   (`<TemplateShell motion={motion} …>`). SiteRenderer mengirim `true` (demo & situs live); PreviewPane CMS merender
   Component langsung tanpa `motion` → diam.

### 2.1 Field baru (persis)

| Kunci | Tipe | Opsi skema | Corporate Nexa | Startup Clean |
| --- | --- | --- | --- | --- |
| section `clients` (setelah `hero`) | `{ title: text(90), items: list(12) [{ name: text(60), logo: image }] }` | `clients` | ya | ya |
| `about.image_2` | image | `aboutSecondImage` | ya | tidak |
| `cta.image` | image | `ctaImage` | ya | tidak |
| bantuan `brand.logo` → "simbol bawaan template" | (teks bantuan) | `brandMark` | ya | ya |

Registrasi (file `index.ts` tiap template):

```ts
// corporate-nexa/index.ts
sections: companyProfileSections(
  { servicesLabel: 'Layanan', serviceItemLabel: 'Layanan' },
  { clients: true, aboutSecondImage: true, ctaImage: true, brandMark: true },
),
// startup-clean/index.ts
sections: companyProfileSections(
  { servicesLabel: 'Layanan', serviceItemLabel: 'Layanan' },
  { clients: { titlePlaceholder: 'mis. Dipakai 12.000+ UMKM di seluruh Indonesia' }, brandMark: true },
),
```

Uji registry mewajibkan setiap section skema ada di `defaultContent` → tambahkan `clients` ke defaultContent.

---

## 3. Corporate Nexa — "Architectural editorial"

Perusahaan demo fiktif: PT Samudra Karya Persada (konsultan & kontraktor bangunan komersial, Surabaya). Nada: tegas,
tenang, presisi. Aksen bawaan tetap `#1D4ED8` (situs lama menyimpan nilainya). Huruf: Inter 600 untuk judul. Kontrol
radius 12px. Banyak garis tipis, angka bernomor, foto arsitektur besar.

### 3.1 Urutan & tata letak section

| # | Section (kunci) | Desktop (@5xl+) | HP (390px) | Latar |
| --- | --- | --- | --- | --- |
| 0 | Header | Lengket, `bg-white/85 backdrop-blur`, garis bawah tipis; CONTAINER; kiri BrandMark (StructureMark), tengah-kanan menu 14px, kanan tombol "Hubungi Kami" (aksen, h-10) | logo + tombol menu; panel menu penuh di bawah header | putih |
| 1 | Hero (`hero`) | Grid 12: kiri 6 kol — eyebrow (pil garis tipis + titik aksen), H1 `TYPE.display` 600 dengan kata sorotan `--tpl-accent-ink`, lead maks. 52ch, 2 tombol (utama + garis), bukti sosial: 3 avatar testimoni bertumpuk (`ring-2 ring-white`) + "200+ Klien korporat" (`advantages.stats[1]`); kanan 6 kol — foto `hero.image` 4:5 radius 28, `priority parallax`, kartu kaca kiri-bawah berisi `stats[0]` (`<CountUp>`), chip kaca kanan-atas berisi `about.points[0]` + ikon centang | teks dulu (tombol penuh lebar bertumpuk), lalu foto 4:3 dengan kartu kaca di dalam sudut bawah | putih + kisi titik sangat tipis di kanan atas (opsional) |
| 2 | Strip logo (`clients`) | judul kecil terpusat 13px muted; `<Marquee>` logo h-7; garis tipis atas-bawah | marquee yang sama (gerak mati → 2–3 baris rata tengah) | putih |
| 3 | Tentang (`about`) | kiri 6 kol: kolase — `about.image` 4:5 + `about.image_2` 4:3 (lebar 45%) menumpuk kanan-bawah dengan bingkai putih 8px (`ring-8 ring-white`, bukan bayangan) + badge aksen `badge_value/label` kiri-atas; kanan 6 kol: eyebrow, H2, paragraf, poin 2 kolom bergaris tipis | foto utama 4:3 (gambar kedua kecil di sudut atau disembunyikan < @xl), lalu teks | putih |
| 4 | Layanan (`services`) | judul terbelah: kiri eyebrow + H2, kanan lead; grid 3 kolom kartu datar: nomor "01" kiri-atas (muted, tabular), ikon kanan-atas (lingkaran tint → aksen saat hover), H3, deskripsi; item ber-`image` → foto 16:10 di atas kartu (`fallback="none"`) | 1 kolom (2 kolom ≥ @2xl) | `bg-alt` |
| 5 | Keunggulan (`advantages`) | kiri 5 kol (lengket `top-28`): eyebrow, H2, lead, grid angka 2×2 (`TYPE.stat`, aksen-ink, `<CountUp>`, dipisah garis 1px); kanan 7 kol: daftar bernomor — "01" aksen, H3, deskripsi, dipisah `border-t` tipis, py-8 | tumpuk: judul → angka 2×2 → daftar | putih |
| 6 | Galeri proyek (`gallery`) | bento 12 kol: item 1 = 7 kol × 2 baris, item 2–3 = 5 kol, item 4–6 = 4 kol; keterangan putih 15px di atas gradasi gelap bawah; `zoom` + hover scale | item 1 penuh 4:3, sisanya 2 kolom 1:1 (keterangan tetap terbaca) | `bg-alt` |
| 7 | Testimoni (`testimonials`) | kiri 7 kol: testimoni pertama sebagai kutipan besar (`TYPE.h2` 500) + avatar 56px, nama, jabatan; kanan 5 kol: sisanya kartu datar bertumpuk | tumpuk, kutipan besar 22px | putih |
| 8 | CTA (`cta`) | blok radius 32 di dalam CONTAINER: `cta.image` (parallax) + scrim `bg-[#0B1220]/65` + gradasi aksen tipis; H2 putih, lead, tombol putih teks aksen-ink; tanpa foto → aksen polos + garis kisi `white/10`; `data-tpl-tone="inverse"` | sama, padding 32px, tombol penuh lebar | putih |
| 9 | Kontak (`contact`) | kiri: judul + baris kontak tanpa kotak (ikon kotak tint 44px, label kecil, nilai) dipisah garis; tombol WhatsApp; kanan: peta radius 28 + ring | tumpuk | `bg-alt` |
| 10 | Footer | baris atas: BrandMark + deskripsi + sosial (lingkaran garis) / menu / kontak; baris bawah: hak cipta + tagline, garis tipis | 1 kolom, menu 2 kolom | putih |

### 3.2 Nilai bawaan baru (`corporate-nexa/defaultContent.ts`)

```ts
import { demoClients, templatePhoto } from '../shared/assets';

hero.image        = templatePhoto('corporate-nexa-hero')
clients           = { enabled: true, title: 'Dipercaya perusahaan konstruksi, properti, dan industri', items: demoClients('corporate-nexa') }
about.image       = templatePhoto('corporate-nexa-engineers')
about.image_2     = templatePhoto('corporate-nexa-blueprint')
services.items[*].image = ''   // kartu ikon + nomor; foto opsional dari pembeli
gallery.items = [
  { image: templatePhoto('corporate-nexa-facade'),       caption: 'Gedung kantor 8 lantai, Surabaya' },
  { image: templatePhoto('corporate-nexa-lobby'),        caption: 'Lobi & interior kantor regional, Malang' },
  { image: templatePhoto('corporate-nexa-meeting-room'), caption: 'Ruang rapat direksi, Sidoarjo' },
  { image: templatePhoto('corporate-nexa-steel'),        caption: 'Rangka baja gudang distribusi, Gresik' },
  { image: templatePhoto('corporate-nexa-warehouse'),    caption: 'Gudang logistik bentang lebar, Pasuruan' },
  { image: templatePhoto('corporate-nexa-site-team'),    caption: 'Pengawasan lapangan harian oleh tim K3' },
]
testimonials.items[0..2].photo = templatePhoto('corporate-nexa-portrait-1' | '-2' | '-3')  // Budi, Rina, Hendra
cta.image         = templatePhoto('corporate-nexa-meeting')
```

Hapus komentar lama tentang "keterangan disamakan dengan ilustrasi" (ART_SEQUENCE tidak dipakai lagi).

### 3.3 Gerak Corporate Nexa

Hero: Reveal bertahap (eyebrow → H1 → lead → tombol → bukti sosial), foto `variant="scale"` + parallax, angka kartu
kaca `<CountUp>`. Strip logo: marquee 40 dtk. Section lain: judul Reveal, kartu/baris `stagger(i)`. Angka keunggulan
`<CountUp>`. Galeri: `zoom` + hover scale 1.04. CTA: foto parallax.

### 3.4 Arahan foto

Arsitektur siang hari, nada netral sejuk, geometri bersih (fasad, rangka baja, gudang), orang ber-APD atau di kantor
dengan konteks Indonesia (cakrawala Jakarta), tanpa filter berat. Potret klien: latar netral, setengah badan.

---

## 4. Startup Clean — "Calm product"

Perusahaan demo fiktif: Kirana Labs (aplikasi kasir & stok untuk UMKM, Yogyakarta). Nada: ramah, cerah, ringan.
Aksen bawaan tetap `#7C3AED`. Huruf judul Plus Jakarta Sans 700 (`displayFont="jakarta"`), isi Inter. Tombol & chip
berbentuk pil. Latar hero berpendar lembut warna aksen, kartu abu muda membulat besar (28px).

### 4.1 Urutan & tata letak section

| # | Section (kunci) | Desktop (@5xl+) | HP (390px) | Latar |
| --- | --- | --- | --- | --- |
| 0 | Header | pil melayang selebar CONTAINER, `bg-white/80 backdrop-blur ring-1 ring-black/[0.06]` **tanpa bayangan**; BrandMark (BloomMark) + menu pil + tombol pil aksen | pil penuh lebar, tombol menu | — |
| 1 | Hero (`hero`) | TERPUSAT: glow aksen radial (`--tpl-accent-100`→transparan) + kisi tipis bermasker; pil eyebrow (ikon Sparkles); H1 `TYPE.display` 700 maks. 16ch dengan sorotan bergaris bawah aksen; lead maks. 60ch; 2 tombol pil; baris 3 poin centang kecil (`about.points[0..2]`); lalu panel media lebar maks. 1200px: bingkai `bg-white/60 p-2 ring` radius 32 berisi `hero.image` 16:9 `priority`; 2 kartu kaca melayang menempel tepi kiri & kanan panel: `stats[0]` (`<CountUp>` + label) dan `stats[3]` (rating + 5 bintang) | teks terpusat, tombol penuh lebar; foto 4:3; kartu kaca kecil di dalam sudut foto (kanan-atas & kiri-bawah) | putih + glow |
| 2 | Strip logo (`clients`) | "Dipakai lebih dari 12.000 UMKM di 35 kota" terpusat + `<Marquee>` | sama | putih |
| 3 | Fitur (`services`) | judul terpusat; bento 6 kol: item 1 (4 kol, foto `pos` 16:10 di bawah teks), item 2 (2 kol × 2 baris, foto `stock` tegak), item 3–7 kartu kecil 2 kol (ikon lingkaran tint + H3 + deskripsi), item ber-`image` lain → foto kecil di dalam kartu; kartu `SURFACE.muted` radius 28 | 1 kolom; foto 16:10 | putih |
| 4 | Cerita (`about`) | kiri 6 kol teks: eyebrow, H2, paragraf, poin centang; kanan 6 kol `about.image` 4:5 radius 32 + badge kaca `badge_value` "4,8/5" + bintang | foto 4:3 dulu, lalu teks | `bg-alt` |
| 5 | Dampak (`advantages`) | baris angka 4 kolom dalam satu kartu putih bergaris pemisah (`<CountUp>`, `TYPE.stat` Jakarta); di bawahnya 2 kolom: kiri eyebrow + H2 + lead; kanan daftar manfaat dengan garis vertikal kiri `border-l-2` (aksen di item yang disorot/difokus, abu di lainnya) + ikon + H3 + deskripsi | angka 2×2, lalu daftar | putih |
| 6 | Galeri (`gallery`) | 4 kartu foto 4:5 sejajar (radius 28), keterangan di BAWAH foto (14px, muted); bila > 4 item → rel gulir horizontal dengan tombol panah (pola sekarang) | rel gulir snap 80% lebar | `bg-alt` |
| 7 | Testimoni (`testimonials`) | 3 kolom kartu `SURFACE.card`: 5 bintang aksen, kutipan 16px, avatar 44px + nama + jabatan | rel snap atau tumpuk | putih |
| 8 | CTA (`cta`) | blok aksen radius 32 terpusat: 2 lingkaran glow `white/10`, kisi tipis; H2 700 `--tpl-on-accent`, lead, tombol pil putih; `data-tpl-tone="inverse"` | sama | putih |
| 9 | Kontak (`contact`) | formulir (`ContactForm`) dalam `SURFACE.card` + kartu info kecil 2 kolom + peta | tumpuk | `bg-alt` |
| 10 | Footer | seperti sekarang, tanpa bayangan, BloomMark | | putih |

### 4.2 Nilai bawaan baru (`startup-clean/defaultContent.ts`)

```ts
import { demoClients, templatePhoto } from '../shared/assets';

hero.image   = templatePhoto('startup-clean-hero')
clients      = { enabled: true, title: 'Dipakai lebih dari 12.000 UMKM di 35 kota', items: demoClients('startup-clean') }
about.image  = templatePhoto('startup-clean-owner')
services.items[0].image = templatePhoto('startup-clean-pos')    // Kasir cepat di HP & laptop
services.items[1].image = templatePhoto('startup-clean-stock')  // Stok real-time
services.items[4].image = templatePhoto('startup-clean-qris')   // Pembayaran QRIS
// item lain image: ''
gallery.items = [
  { image: templatePhoto('startup-clean-team'),     caption: 'Tim produk Kirana di Yogyakarta' },
  { image: templatePhoto('startup-clean-boutique'), caption: 'Butik mitra di Bandung memakai kasir tablet' },
  { image: templatePhoto('startup-clean-cafe'),     caption: 'Kedai kopi mitra di Kaliurang' },
  { image: templatePhoto('startup-clean-report'),   caption: 'Laporan harian dibaca langsung dari laptop' },
]
testimonials.items[0..2].photo = templatePhoto('startup-clean-portrait-1' | '-2' | '-3')  // Sari, Agus, Dewi
```

### 4.3 Gerak Startup Clean

Hero: Reveal bertahap terpusat, panel media `variant="scale"`, kartu kaca kiri/kanan `variant="left"/"right"` dengan
jeda 400ms, `<CountUp>` di kartu. Strip logo marquee 36 dtk. Bento fitur: `stagger(i)`; foto bento `zoom`. Angka
dampak `<CountUp>`. Galeri: Reveal pada wadah rel (bukan per kartu). Tanpa parallax di hero (foto berada di panel).

### 4.4 Arahan foto

Hangat dan terang: kedai kopi, butik, rak toko, kasir tablet, QR di ponsel, tim produk; cahaya alami, candid,
orang Asia Tenggara bila ada wajah. Potret pengguna: senyum, latar terang.

---

## 5. Aset

### 5.1 Foto (`public/assets/templates/photos/`, WebP, kredit di `CREDITS.md`)

| Kunci (`templatePhoto`) | Ukuran 1600w | Ukuran 800w | Rasio |
| --- | --- | --- | --- |
| corporate-nexa-hero | 46 KB | 19 KB | 3:2 |
| corporate-nexa-engineers | 78 KB | 29 KB | 3:2 |
| corporate-nexa-site-team | 174 KB | 79 KB | 4:5 |
| corporate-nexa-blueprint | 102 KB | 35 KB | 3:2 |
| corporate-nexa-steel | 219 KB | 93 KB | ≈ 1:1.06 |
| corporate-nexa-warehouse | 96 KB | 33 KB | 3:2 |
| corporate-nexa-meeting-room | 110 KB | 31 KB | 16:9 |
| corporate-nexa-meeting | 72 KB | 28 KB | 5:3 |
| corporate-nexa-facade | 70 KB | 24 KB | 16:9 |
| corporate-nexa-lobby | 162 KB | 38 KB | 16:9 |
| startup-clean-hero | 88 KB | 32 KB | 3:2 |
| startup-clean-owner | 93 KB | 31 KB | 3:2 |
| startup-clean-pos | 44 KB | 16 KB | 3:2 |
| startup-clean-stock | 99 KB | 33 KB | 16:9 |
| startup-clean-qris | 26 KB | 11 KB | 3:2 |
| startup-clean-report | 48 KB | 20 KB | 16:9 |
| startup-clean-boutique | 70 KB | 28 KB | 4:3 |
| startup-clean-team | 83 KB | 32 KB | 3:2 |
| startup-clean-cafe | 108 KB | 45 KB | 3:2 |

Potret 1:1 (480w / 240w): `corporate-nexa-portrait-1..3`, `startup-clean-portrait-1..3` (6–18 KB / 3–6 KB).

### 5.2 Logo (`public/assets/templates/logos/`, SVG orisinal, teks sudah dijadikan kurva)

- Perusahaan demo: `samudra-karya.svg` (lockup), `samudra-karya-mark.svg`, `kirana-labs.svg`, `kirana-labs-mark.svg`
  — `currentColor`; mark identik dengan `StructureMark` / `BloomMark`.
- Klien fiktif (warna tinta #121620, tinggi 32): `clients/arunika-land, baskara, nawasena, pradipta, selaras-graha,
  kencana-mitra` (Corporate) dan `clients/kedai-senja, berkah-jaya, butik-lestari, roti-mentari, kopi-rimba,
  dapur-nala` (Startup). Lewat `demoClients(code)`.

---

## 6. Ringkasan API bersama (import dari `src/templates/shared/…`)

```ts
// layout.ts
CONTAINER, MEASURE, SECTION_Y, SECTION_Y_SM, SECTION_GAP, FONT_DISPLAY, TYPE, SURFACE, RADIUS
// Shell.tsx (baru: motion, displayFont)
<TemplateShell content preview motion={motion} displayFont="inter" | "jakarta" defaultAccent>
// Photo.tsx
<Photo src alt className imgClassName sizes priority fallback="tint"|"none" zoom parallax position>{overlay}</Photo>
<PhotoPlaceholder className label />
// Animated.tsx
<Reveal as="div|li|section|…" variant="up|fade|scale|left|right" delay={stagger(i)} className>
<Marquee label duration={40} gap={56} itemClassName staticClassName>{items}</Marquee>
<CountUp value="350+" className />
// motion.ts
useMotionEnabled(), usePrefersReducedMotion(), stagger(i, step?, max?), parseCount(), formatCount(), useParallax()
// assets.ts
templatePhoto(key), photoAsset(src), photoAlt(src, fallback), TEMPLATE_PHOTOS, DEMO_LOGOS, DEMO_CLIENTS, demoClients(code)
// marks.tsx / clients.tsx / media.tsx
<StructureMark className />, <BloomMark className />, <ClientLogo name logo className tone />
<BrandMark name logo mark nameClassName />, <Avatar name photo className sizes />, <Img …> (lama, kini ber-srcset)
// model.ts
readCompanyProfile(content).clients, clientItems(section)
// utils.ts
hasImage(src), SECTION_ANCHOR.clients = 'klien'
// schema.ts
companyProfileSections(labels, { clients, aboutSecondImage, ctaImage, brandMark }), TEMPLATE_V2
```

## 7. Daftar periksa engineer template

- [ ] `index.ts` template memakai `SchemaOptions` (§2.1); `defaultContent` berisi `clients` + nilai foto (§3.2/§4.2).
- [ ] `<TemplateShell motion={motion} displayFont=…>`; komponen template menerima `motion` dari props.
- [ ] Header/section/footer memakai `CONTAINER`; tidak ada `max-w-[1120px|1200px]` lama.
- [ ] Tidak ada `shadow-` di kartu/foto/header/tombol (`grep -n "shadow" src/templates/<template>`).
- [ ] `<Photo priority>` hanya hero; `sizes` diisi; slot opsional `fallback="none"`.
- [ ] BrandMark dengan `mark`; tidak ada kotak inisial di header/footer.
- [ ] Teks di atas foto/aksen kontras ≥ 4.5:1; `data-tpl-tone="inverse"` di blok gelap/aksen.
- [ ] Cek di browser: `/demo/<slug>` desktop & HP (390px), `/akun/situs/:id` (pratinjau diam), `prefers-reduced-motion`.
- [ ] `npx tsc -b`, `npx eslint <file>`, `npx vitest run src/templates src/pages/account`.
