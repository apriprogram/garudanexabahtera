import{i as e,n as t,r as n,t as r}from"./ui-BryYohAu.js";import{Ar as i,Ht as a,Jt as o,Xt as s,Yt as c,Zt as l,a as u,b as ee,br as d,c as f,d as p,dr as m,f as h,ir as g,it as _,m as te,nn as v,o as ne,pr as y,pt as b,rn as x,rr as S,s as C,sr as w,tn as re,tr as T,u as E,wr as D,x as ie}from"./index-CoZNtPPz.js";import{n as ae,t as oe}from"./lib-C2bxFo28.js";import se from"./NotFound-xukViJOo.js";var O=m(`Square`,[[`rect`,{width:`18`,height:`18`,x:`3`,y:`3`,rx:`2`,key:`afitv7`}]]),k=i(D(),1),A=/^[a-z0-9]+(?:-[a-z0-9]+)*$/,j=/^\d{4}-\d{2}-\d{2}$/,M=[`title`,`description`,`slug`,`author`,`datePublished`,`dateModified`],N=[`sources`,`related`],P=e=>{let t=e.trim();return t.length>=2&&t.startsWith(`"`)&&t.endsWith(`"`)?t.slice(1,-1).replace(/\\(["\\])/g,`$1`):t.length>=2&&t.startsWith(`'`)&&t.endsWith(`'`)?t.slice(1,-1).replace(/''/g,`'`):t},F=e=>e.slice(1,-1).split(`,`).map(P).filter(Boolean);function I(e){let t=e.replace(/^\uFEFF/,``).replace(/\r\n?/g,`
`),n=t.split(`
`);if(n[0].trim()!==`---`)return{data:{},body:t};let r=n.findIndex((e,t)=>t>0&&e.trim()===`---`);if(r<0)throw Error(`Frontmatter tidak ditutup dengan baris "---".`);let i={},a=null;for(let e=1;e<r;e++){let t=n[e];if(!t.trim()||t.trim().startsWith(`#`))continue;let r=t.match(/^\s*-\s+(.*)$/);if(r&&a){i[a].push(P(r[1]));continue}let o=t.match(/^([A-Za-z][A-Za-z0-9_]*)\s*:(?:\s+(.*))?\s*$/);if(!o)throw Error(`Baris frontmatter tidak dikenali: "${t.trim()}"`);let[,s,c=``]=o;if(s in i)throw Error(`Kunci frontmatter "${s}" ditulis dua kali.`);let l=c.trim();l===``?(i[s]=[],a=s):(i[s]=l.startsWith(`[`)&&l.endsWith(`]`)?F(l):P(l),a=null)}return{data:i,body:n.slice(r+1).join(`
`).replace(/^\n+/,``)}}var L=e=>{if(!j.test(e))return!1;let t=new Date(`${e}T00:00:00Z`);return!Number.isNaN(t.getTime())&&t.toISOString().slice(0,10)===e},R=e=>C.includes(e);function z(e,t){let{data:n,body:r}=I(e),i=t?`${t}.md`:`artikel`,a={};for(let e of M){let t=n[e];if(typeof t!=`string`||t.trim()===``)throw Error(`${i}: frontmatter "${e}" wajib diisi (teks).`);a[e]=t.trim()}for(let e of N){let t=n[e]??[];if(!Array.isArray(t))throw Error(`${i}: frontmatter "${e}" harus berupa daftar.`);a[e]=t}let o=n.cta??`template`;if(typeof o!=`string`||!R(o))throw Error(`${i}: cta "${String(o)}" harus salah satu dari ${C.join(`, `)}.`);a.cta=o;let s=n.reviewed;if(s!==void 0&&(typeof s!=`string`||!L(s.trim())))throw Error(`${i}: reviewed "${String(s)}" harus tanggal YYYY-MM-DD (hapus barisnya selama artikel masih draf).`);a.reviewed=typeof s==`string`?s.trim():null;let c={...a,body:r};if(!A.test(c.slug))throw Error(`${i}: slug "${c.slug}" hanya boleh huruf kecil, angka, dan tanda hubung.`);if(t!==void 0&&t!==c.slug)throw Error(`${i}: slug "${c.slug}" harus sama dengan nama file.`);for(let e of[`datePublished`,`dateModified`])if(!L(c[e]))throw Error(`${i}: ${e} "${c[e]}" harus tanggal YYYY-MM-DD.`);if(c.dateModified<c.datePublished)throw Error(`${i}: dateModified tidak boleh sebelum datePublished.`);for(let e of c.sources)if(!/^https?:\/\/\S+$/.test(e))throw Error(`${i}: sumber "${e}" harus URL http(s).`);for(let e of c.related)if(!A.test(e))throw Error(`${i}: related "${e}" bukan slug yang valid.`);return c}function B(e){let t=!1;return e.split(`
`).filter(e=>/^\s*(```|~~~)/.test(e)?(t=!t,!1):!t)}function V(e){return e.normalize(`NFD`).replace(/[\u0300-\u036f]/g,``).toLowerCase().replace(/&/g,` dan `).replace(/[^a-z0-9]+/g,`-`).replace(/^-+|-+$/g,``)}function H(e){return B(e).map(e=>e.match(/^##\s+(.+?)\s*#*\s*$/)?.[1]).filter(e=>!!e).map(e=>({id:V(e),text:e}))}var U=`Sumber`;function W(e){let t=e.split(`
`),n=t.findIndex(e=>RegExp(`^##\\s+${U}\\s*$`).test(e));return(n<0?t:t.slice(0,n)).join(`
`)}function G(e){return B(e).filter(e=>!/^\s*\|?\s*:?-{3,}/.test(e)).join(`
`).replace(/!\[([^\]]*)\]\([^)]*\)/g,`$1`).replace(/\[([^\]]*)\]\([^)]*\)/g,`$1`).replace(/\{\{[^}]*\}\}/g,`x`).replace(/https?:\/\/\S+/g,` `).replace(/[#>*_`|[\]]/g,` `)}function K(e){return G(e).match(/[\p{L}\p{N}]+(?:[-'’.,/][\p{L}\p{N}]+)*/gu)?.length??0}var ce=e=>Math.max(1,Math.round(e/200)),le=`---
title: "Biaya Pembuatan Aplikasi Android & iOS: Faktor Penentunya"
description: Kisaran biaya pembuatan aplikasi Android & iOS di Indonesia, faktor yang menentukan harga, dan biaya rutin setelah rilis seperti akun Google Play & Apple.
slug: biaya-aplikasi-android-ios
author: Tim Garuda Nexa
datePublished: 2026-10-23
dateModified: 2026-10-23
cta: mobile
sources:
  - https://teknologi.id/aplikasi/berapa-biaya-membuat-aplikasi-mobile-di-indonesia-estimasi-2026
  - https://next-it.co.id/blog/berapa-biaya-buat-website-profesional-di-2026-panduan-lengkap-untuk-pemilik-bisnis
  - https://support.google.com/googleplay/android-developer/answer/6112435?hl=id
  - https://developer.apple.com/help/account/membership/program-enrollment/
  - https://developer.android.com/google/play/requirements/target-sdk?hl=id
  - https://support.google.com/googleplay/android-developer/answer/112622?hl=id
  - https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022
related: [template-vs-jasa-website-custom, biaya-website-company-profile]
---

Biaya pembuatan aplikasi Android dan iOS di Indonesia umumnya berkisar dari belasan juta rupiah untuk aplikasi sederhana sampai ratusan juta rupiah untuk aplikasi yang kompleks. [Teknologi.id (Juni 2026)](https://teknologi.id/aplikasi/berapa-biaya-membuat-aplikasi-mobile-di-indonesia-estimasi-2026) mencatat aplikasi sederhana mulai sekitar Rp15 juta, aplikasi menengah Rp50–150 juta, dan skala enterprise Rp150 juta ke atas. Faktor yang paling menentukan adalah jumlah fitur, kebutuhan server dan panel admin, jumlah platform, serta biaya yang tetap berjalan setelah aplikasi rilis.

Angka di atas adalah kisaran pasar, bukan harga patokan. Dua aplikasi dengan nama fitur yang sama bisa berbeda jauh biayanya, karena "fitur login" atau "fitur pembayaran" bisa berarti pekerjaan yang sangat berbeda. Panduan ini menjelaskan apa saja yang membuat biaya naik atau turun, biaya rutin yang sering terlupa, dan cara menyiapkan kebutuhan agar penawaran yang Anda terima bisa dibandingkan.

## Kisaran biaya pembuatan aplikasi di Indonesia

Tabel berikut merangkum kisaran yang dipublikasikan dua sumber di Indonesia pada 2026. Kolom contoh fitur adalah ilustrasi kami untuk membantu membayangkan skala, bukan bagian dari sumber.

| Skala aplikasi | Kisaran biaya | Contoh fitur (ilustrasi) | Sumber |
|---|---|---|---|
| Sederhana | Mulai sekitar Rp15 juta | Beberapa layar informasi atau katalog, data sedikit, tanpa banyak peran pengguna | [Teknologi.id, Juni 2026](https://teknologi.id/aplikasi/berapa-biaya-membuat-aplikasi-mobile-di-indonesia-estimasi-2026) |
| Menengah | Rp50–150 juta | Akun pengguna, data di server, notifikasi, panel admin | [Teknologi.id, Juni 2026](https://teknologi.id/aplikasi/berapa-biaya-membuat-aplikasi-mobile-di-indonesia-estimasi-2026) |
| Enterprise | Rp150 juta ke atas | Banyak peran, integrasi dengan sistem perusahaan, jumlah pengguna besar | [Teknologi.id, Juni 2026](https://teknologi.id/aplikasi/berapa-biaya-membuat-aplikasi-mobile-di-indonesia-estimasi-2026) |
| Aplikasi Android dan iOS oleh software house | Rp100–400 juta | Dua platform, dikerjakan tim | [Next IT, Agustus 2026](https://next-it.co.id/blog/berapa-biaya-buat-website-profesional-di-2026-panduan-lengkap-untuk-pemilik-bisnis) |

Teknologi.id juga mencatat bahwa untuk kebutuhan UMKM yang sangat sederhana, sebagian penyedia menawarkan paket mulai dari kisaran jutaan rupiah. Paket seperti ini biasanya memakai fitur yang sudah jadi, jadi tanyakan dengan jelas apa yang bisa dan tidak bisa diubah.

## Faktor yang menentukan biaya aplikasi

### 1. Jumlah dan kerumitan fitur

Setiap fitur berarti layar baru, logika baru, dan pengujian baru. Fitur seperti integrasi pembayaran, lokasi GPS, notifikasi, chat, dan dasbor analitik masing-masing menambah biaya. Cara paling efektif menekan biaya adalah memisahkan fitur wajib untuk versi pertama dari fitur yang bisa menyusul.

### 2. Server, database, dan panel admin

Aplikasi yang menyimpan data pengguna, pesanan, atau transaksi membutuhkan server dan database. Biasanya juga dibutuhkan panel admin agar staf Anda bisa mengelola data tanpa membuka kode. Bagian ini tidak terlihat oleh pengguna aplikasi, tetapi porsinya bisa sebesar aplikasinya sendiri.

### 3. Satu platform atau dua: native atau cross-platform

Aplikasi native ditulis terpisah untuk Android (misalnya dengan Kotlin) dan iOS (misalnya dengan Swift). Menurut Teknologi.id, pendekatan ini memberi performa optimal tetapi biayanya lebih tinggi karena dikerjakan per platform. Framework cross-platform seperti Flutter atau React Native memakai satu basis kode untuk dua platform sehingga bisa lebih hemat, dengan beberapa kompromi pada kasus tertentu. Untuk kebanyakan aplikasi bisnis, cross-platform sudah memadai.

### 4. Desain antarmuka

Desain yang dibuat khusus, lengkap dengan prototipe dan uji coba ke calon pengguna, membutuhkan waktu lebih lama daripada desain yang memakai komponen standar. Desain yang matang mengurangi revisi saat pengembangan, jadi biaya di tahap ini sering kembali dalam bentuk penghematan di tahap berikutnya.

### 5. Integrasi dengan sistem lain

Menghubungkan aplikasi ke payment gateway, sistem kasir, ERP, atau layanan pengiriman berarti mempelajari dokumentasi pihak lain, menangani kegagalan, dan menguji skenario nyata. Semakin banyak sistem yang terhubung, semakin besar pekerjaan pengujiannya.

### 6. Keamanan dan data pribadi

Aplikasi yang mengumpulkan nama, nomor telepon, alamat, atau data lain milik pengguna harus dirancang agar data itu aman. Indonesia memiliki [Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi](https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022), sehingga pengamanan data, hak akses, dan kebijakan privasi perlu dibahas sejak awal, bukan setelah aplikasi jadi.

### 7. Siapa yang mengerjakan

Pekerja lepas umumnya lebih murah dan cocok untuk kebutuhan kecil. Software house biasanya lebih mahal, tetapi menyediakan tim yang lebih lengkap dan dukungan jangka panjang. Yang lebih penting dari harga adalah kejelasan cakupan, jadwal, dan siapa yang memegang kode serta akun setelah proyek selesai.

## Biaya rutin setelah aplikasi rilis

Biaya pembuatan baru sebagian dari total biaya. Setelah rilis, ada biaya yang terus berjalan:

| Biaya | Besaran | Sumber |
|---|---|---|
| Akun developer Google Play | US$25, sekali bayar | [Bantuan Play Console](https://support.google.com/googleplay/android-developer/answer/6112435?hl=id) |
| Apple Developer Program (untuk App Store) | 99 USD per tahun, ditagih dalam mata uang lokal bila tersedia | [Apple Developer](https://developer.apple.com/help/account/membership/program-enrollment/) |
| Server dan database | Tergantung jumlah pengguna, data, dan penyedia | Penawaran penyedia server |
| Pemeliharaan dan pembaruan | Tergantung fitur dan frekuensi pembaruan | Penawaran pengembang |
| Biaya layanan toko aplikasi | Dipotong dari penjualan produk digital di dalam aplikasi; besarannya berbeda per jenis transaksi dan wilayah | [Bantuan Play Console](https://support.google.com/googleplay/android-developer/answer/112622?hl=id) |

Pembaruan bukan pilihan. Google Play mewajibkan aplikasi mengikuti versi Android terbaru: mulai 31 Agustus 2026, aplikasi baru dan pembaruan aplikasi harus menargetkan Android 16 (level API 36) atau lebih tinggi, dan aplikasi yang sudah ada perlu menargetkan minimal Android 15 (level API 35) agar tetap bisa dipasang pengguna baru di perangkat dengan Android yang lebih baru ([Android Developers](https://developer.android.com/google/play/requirements/target-sdk?hl=id)). Aplikasi yang tidak pernah diperbarui perlahan tidak bisa dipasang di HP baru, jadi anggarkan pemeliharaan setiap tahun.

## Cara menekan biaya tanpa mengorbankan kualitas

1. **Mulai dari versi pertama yang kecil.** Pilih satu alur utama, misalnya pemesanan atau absensi, dan selesaikan dengan baik sebelum menambah fitur lain.
2. **Pakai layanan yang sudah ada.** Payment gateway, layanan peta, dan layanan notifikasi lebih murah dipakai daripada dibuat sendiri.
3. **Pertimbangkan cross-platform.** Satu basis kode untuk Android dan iOS biasanya menekan biaya pembuatan dan pemeliharaan.
4. **Uji kebutuhan lewat website lebih dulu.** Bila tujuan Anda baru memperkenalkan produk, landing page sudah cukup. Contohnya, [template website fintech & startup](/template/kategori/fintech-startup) seperti [{{template:finova}}](/template/finova) memperkenalkan aplikasi dan mengarahkan pengunjung ke App Store atau Google Play. Bila pesanan pelanggan masih sedikit, website yang mengarahkan pemesanan ke WhatsApp, seperti [{{template:arena-club}}](/template/arena-club) untuk klub olahraga, bisa menjadi langkah pertama sebelum membangun aplikasi.
5. **Tulis kebutuhan dengan jelas.** Daftar fitur yang rinci membuat penawaran lebih akurat dan mengurangi pekerjaan tambahan di tengah proyek.

Perbandingan antara memulai dari template dan membangun custom dibahas di panduan [template vs jasa website custom](/panduan/template-vs-jasa-website-custom).

## Checklist sebelum meminta penawaran aplikasi

- [ ] Tujuan utama aplikasi dan siapa penggunanya.
- [ ] Daftar fitur wajib untuk versi pertama, dan fitur yang bisa menyusul.
- [ ] Android saja, iOS saja, atau keduanya.
- [ ] Perlu panel admin untuk staf atau tidak.
- [ ] Sistem lain yang harus terhubung, misalnya pembayaran atau kasir.
- [ ] Data pribadi apa saja yang dikumpulkan dan siapa yang boleh mengaksesnya.
- [ ] Akun Google Play dan Apple Developer didaftarkan atas nama perusahaan Anda.
- [ ] Siapa yang memegang kode sumber, server, dan akun setelah proyek selesai.
- [ ] Biaya pemeliharaan dan pembaruan setelah rilis tertulis di penawaran.

## Jasa pembuatan aplikasi di Garuda Nexa

Garuda Nexa menerima [jasa pembuatan aplikasi Android & iOS](/jasa-pembuatan-aplikasi-mobile) yang disesuaikan dengan alur bisnis Anda. Kami tidak memasang daftar harga untuk aplikasi, karena biayanya mengikuti cakupan proyek. Setelah konsultasi gratis, kami mengirim penawaran tertulis berisi cakupan, jadwal, tahapan pembayaran, dan biaya, dan pengerjaan dimulai setelah Anda menyetujuinya. Anda bisa mulai dengan menceritakan kebutuhan lewat [formulir Pesan Custom](/pesan-custom), atau melihat [halaman Harga](/harga) untuk memahami cara biaya custom ditentukan.

## Pertanyaan yang sering diajukan

### Lebih hemat membuat aplikasi Android dulu atau langsung dua platform?

Bila memakai framework cross-platform, membuat dua platform sekaligus biasanya tidak menggandakan biaya. Bila memakai native, setiap platform dikerjakan terpisah. Mulai dari satu platform masuk akal bila hampir semua pengguna Anda memakai sistem operasi yang sama, tetapi ingat bahwa iOS tetap membutuhkan keanggotaan Apple Developer Program untuk rilis di App Store.

### Apakah aplikasi bisa dibuat dengan biaya beberapa juta rupiah?

Untuk kebutuhan yang sangat sederhana, sebagian penyedia menawarkan paket mulai dari kisaran jutaan rupiah. Pastikan Anda tahu batasannya: biasanya fitur sudah jadi, desain terbatas, dan biaya server atau perubahan dihitung terpisah.

### Berapa biaya rutin aplikasi setiap tahun?

Paling sedikit keanggotaan Apple Developer Program (99 USD per tahun) bila aplikasi ada di App Store, biaya server, dan biaya pemeliharaan. Akun Google Play hanya dibayar sekali sebesar US$25. Besarnya biaya server dan pemeliharaan tergantung jumlah pengguna dan seberapa sering aplikasi diperbarui.

### Apa beda aplikasi native dan cross-platform?

Aplikasi native dibuat khusus untuk satu sistem operasi, sehingga bisa memaksimalkan performa dan fitur perangkat. Aplikasi cross-platform dibuat sekali untuk Android dan iOS, sehingga lebih hemat waktu dan biaya. Pilihan terbaik tergantung fitur yang dibutuhkan; pengembang yang baik akan menjelaskan alasannya di penawaran.

### Apakah saya masih butuh website kalau sudah punya aplikasi?

Ya. Website membantu calon pengguna menemukan aplikasi Anda lewat Google, menjelaskan manfaatnya, dan memuat informasi penting seperti kebijakan privasi dan kontak. Landing page sederhana sudah cukup untuk tujuan ini.

## Sumber

- Teknologi.id, "Berapa Biaya Membuat Aplikasi Mobile di Indonesia? (Estimasi 2026)", 20 Juni 2026: [teknologi.id](https://teknologi.id/aplikasi/berapa-biaya-membuat-aplikasi-mobile-di-indonesia-estimasi-2026)
- Next IT, "Berapa Biaya Buat Website Profesional di 2026? Panduan Lengkap untuk Pemilik Bisnis", 8 Agustus 2026: [next-it.co.id](https://next-it.co.id/blog/berapa-biaya-buat-website-profesional-di-2026-panduan-lengkap-untuk-pemilik-bisnis)
- Google, Bantuan Play Console, pendaftaran akun developer Google Play, dicek 23 Oktober 2026: [support.google.com](https://support.google.com/googleplay/android-developer/answer/6112435?hl=id)
- Apple Developer, informasi pendaftaran Apple Developer Program, dicek 23 Oktober 2026: [developer.apple.com](https://developer.apple.com/help/account/membership/program-enrollment/)
- Android Developers, persyaratan level API target Google Play, dicek 23 Oktober 2026: [developer.android.com](https://developer.android.com/google/play/requirements/target-sdk?hl=id)
- Google, Bantuan Play Console, biaya layanan Google Play, dicek 23 Oktober 2026: [support.google.com](https://support.google.com/googleplay/android-developer/answer/112622?hl=id)
- BPK RI, Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi: [peraturan.bpk.go.id](https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022)
`,ue=`---
title: Berapa Biaya Membuat Website Company Profile di 2026?
description: Kisaran biaya website company profile 2026, dari website builder, template, sampai jasa custom, plus biaya domain, hosting, SSL dan perawatan per tahun.
slug: biaya-website-company-profile
author: Tim Garuda Nexa
datePublished: 2026-10-23
dateModified: 2026-10-23
cta: template
sources:
  - https://next-it.co.id/blog/berapa-biaya-buat-website-profesional-di-2026-panduan-lengkap-untuk-pemilik-bisnis
  - https://www.hostinger.com/id/tutorial/estimasi-biaya-pembuatan-website/
  - https://www.rumahweb.com/domain-murah/
  - https://www.hostinger.com/id/web-hosting
  - https://www.rumahweb.com/hosting-murah/
  - https://letsencrypt.org/about/
  - https://pandi.id/public/files/2024/10/kebijakan-pendaftaran-nama-domain-versi-9-0-bilingual-new-1729151599.pdf
related: [template-vs-jasa-website-custom, website-klinik-kecantikan]
---

Biaya membuat website company profile di 2026 berkisar dari beberapa ratus ribu rupiah per tahun bila Anda membangunnya sendiri dengan website builder, sekitar Rp2–5 juta untuk website berbasis template dari vendor, hingga Rp8–25 juta untuk website custom 5–10 halaman yang dikerjakan jasa pembuatan website ([Next IT, Agustus 2026](https://next-it.co.id/blog/berapa-biaya-buat-website-profesional-di-2026-panduan-lengkap-untuk-pemilik-bisnis)). Di luar biaya pembuatan, setiap tahun ada biaya domain, hosting, dan perawatan. Angka akhirnya ditentukan oleh jumlah halaman, seberapa custom desainnya, fitur yang dibutuhkan, dan siapa yang mengerjakannya.

Panduan ini merangkum kisaran harga pasar dari sumber yang bisa Anda periksa sendiri, menjelaskan setiap komponen biaya, lalu memberi contoh perhitungan tahun pertama dan tahun kedua. Semua angka pihak ketiga di bawah adalah kisaran yang dipublikasikan sumbernya pada tanggal tersebut, bukan harga patokan, jadi selalu minta penawaran tertulis sebelum memutuskan.

## Ringkasan biaya website company profile 2026

Tabel berikut membandingkan lima cara umum untuk punya website company profile. Kolom terakhir menunjukkan asal angkanya.

| Cara membuat | Kisaran biaya | Yang biasanya didapat | Sumber |
|---|---|---|---|
| Website builder, dibangun sendiri | Rp237.600–Rp2,75 juta per tahun | Langganan builder, template bawaan, hosting dan SSL; tenaga dan waktu dari Anda | [Hostinger, Februari 2026](https://www.hostinger.com/id/tutorial/estimasi-biaya-pembuatan-website/) |
| WordPress yang Anda kelola sendiri | Rp600 ribu–lebih dari Rp5 juta per tahun | Hosting, domain, tema, plugin, dan perawatan yang Anda tangani sendiri | [Hostinger, Februari 2026](https://www.hostinger.com/id/tutorial/estimasi-biaya-pembuatan-website/) |
| Template dari vendor | Rp2–5 juta | Desain jadi yang isinya disesuaikan | [Next IT, Agustus 2026](https://next-it.co.id/blog/berapa-biaya-buat-website-profesional-di-2026-panduan-lengkap-untuk-pemilik-bisnis) |
| Jasa company profile 5–10 halaman | Rp8–25 juta | Desain dan pengerjaan custom; domain dan hosting tergantung paket | [Next IT, Agustus 2026](https://next-it.co.id/blog/berapa-biaya-buat-website-profesional-di-2026-panduan-lengkap-untuk-pemilik-bisnis) |
| Template siap pakai Garuda Nexa | {{harga_template_rentang}} per {{tanggal_harga}} | Template dan setup awal, domain, hosting, dan SSL tahun pertama; isi diubah sendiri lewat CMS | [Halaman Harga](/harga) |

Perbedaan terbesar ada pada siapa yang mengerjakan dan apa saja yang sudah termasuk. Harga yang terlihat murah bisa menjadi mahal bila domain, hosting, atau perpanjangannya belum dihitung, jadi bandingkan penawaran berdasarkan total biaya dua tahun, bukan harga di depan saja.

## Komponen biaya yang perlu Anda hitung

Hampir semua website company profile terdiri dari komponen yang sama. Yang berbeda hanya siapa yang menanggungnya dan apakah dibayar sekali atau setiap tahun.

### 1. Pembuatan: desain dan pengerjaan

Ini komponen terbesar dan paling beragam. Website custom dirancang dari nol sesuai identitas perusahaan, sehingga biayanya naik seiring jumlah halaman, revisi, dan fitur. Website berbasis template memakai desain yang sudah jadi, sehingga pekerjaan yang tersisa adalah mengisi teks, foto, dan kontak perusahaan Anda. Next IT mencatat vendor template biasanya berada di kisaran Rp2–5 juta, sementara company profile 5–10 halaman berada di kisaran Rp8–25 juta.

### 2. Domain

Domain adalah alamat website, misalnya namaperusahaan.com. Biayanya dibayar per tahun. Per 23 Oktober 2026, daftar harga [Rumahweb](https://www.rumahweb.com/domain-murah/) mencantumkan:

- .com: Rp137.000 untuk tahun pertama (harga promo), lalu Rp219.000 per tahun saat perpanjangan.
- .id: Rp219.000 per tahun.
- .co.id: Rp300.000 per tahun.
- .my.id dan .biz.id: harga promo tahun pertama Rp9.900, lalu Rp25.000 dan Rp60.000 per tahun.

Domain .co.id khusus untuk badan hukum, badan usaha, atau organisasi yang beroperasi di Indonesia. Menurut [kebijakan pendaftaran nama domain PANDI versi 9.0](https://pandi.id/public/files/2024/10/kebijakan-pendaftaran-nama-domain-versi-9-0-bilingual-new-1729151599.pdf), pendaftarnya perlu menunjukkan NIB dan identitas yang sah. Bagi calon klien, akhiran ini memberi sinyal bahwa website dimiliki badan usaha Indonesia.

### 3. Hosting

Hosting adalah server tempat file website disimpan. Perhatikan beda harga promo dan harga perpanjangan. Contohnya, per 23 Oktober 2026 paket Premium di [Hostinger](https://www.hostinger.com/id/web-hosting) dijual Rp23.900 per bulan untuk kontrak 48 bulan yang dibayar di muka, sedangkan harga perpanjangannya Rp84.900 per bulan. Di [Rumahweb](https://www.rumahweb.com/hosting-murah/), paket Small dijual Rp17.900 per bulan sebagai harga promo tahun pertama, dari harga normal Rp50.000 per bulan. Next IT memperkirakan hosting untuk website standar Rp1–5 juta per tahun, tergantung kapasitas dan layanan yang dipilih.

### 4. SSL (HTTPS)

SSL membuat alamat website diawali https dan menampilkan ikon gembok di browser. Sertifikat dasarnya bisa gratis: [Let's Encrypt](https://letsencrypt.org/about/) adalah otoritas sertifikat yang gratis, otomatis, dan terbuka, dan banyak penyedia hosting memasangnya tanpa biaya tambahan. Sertifikat berbayar tetap ada untuk kebutuhan tertentu; Next IT mencatat kisarannya dari gratis sampai Rp2 juta per tahun.

### 5. Perawatan dan pembaruan

Website perlu diperbarui: plugin dan sistem dijaga tetap aman, isi diganti saat layanan berubah, dan cadangan data dicek. Next IT memperkirakan biaya perawatan 10–15% dari biaya pembuatan per tahun. Untuk website custom senilai Rp12 juta, artinya sekitar Rp1,2–1,8 juta per tahun.

### 6. Konten: teks dan foto

Biaya ini sering terlupa. Teks tentang perusahaan, daftar layanan, dan foto proyek harus disiapkan, oleh Anda sendiri atau oleh penulis dan fotografer yang Anda bayar. Website yang desainnya bagus tetapi isinya kosong tidak meyakinkan calon klien, jadi sisihkan waktu atau anggaran untuk bagian ini.

## Contoh perhitungan tahun pertama dan tahun kedua

Contoh di bawah memakai angka dari sumber di atas, hanya sebagai gambaran cara menghitung. Website custom 8 halaman dengan biaya pembuatan Rp12 juta (di dalam kisaran Next IT), domain .co.id Rp300.000 per tahun, hosting Rp1 juta per tahun (batas bawah kisaran Next IT), dan perawatan 10% per tahun:

| Komponen | Tahun pertama | Tahun kedua |
|---|---|---|
| Pembuatan website | Rp12.000.000 | – |
| Domain .co.id | Rp300.000 | Rp300.000 |
| Hosting | Rp1.000.000 | Rp1.000.000 |
| Perawatan (10%) | – | Rp1.200.000 |
| **Total** | **Rp13.300.000** | **Rp2.500.000** |

Untuk website berbasis template, cara menghitungnya sama, tetapi biaya pembuatannya lebih kecil. Di Garuda Nexa, harga template sudah mencakup domain, hosting, dan SSL tahun pertama, sehingga anggaran tahun pertama adalah harga templatenya saja. Biaya perpanjangan domain dan hosting mulai tahun kedua dijelaskan di [halaman Harga](/harga).

## Faktor yang membuat biaya naik atau turun

Next IT menyebut lima faktor utama yang menentukan harga website. Berikut penjelasannya untuk company profile:

1. **Jumlah halaman dan fitur.** Company profile satu halaman jauh lebih murah daripada website dengan halaman layanan terpisah, blog, karier, dan formulir yang datanya tersimpan.
2. **Tingkat kustomisasi desain.** Desain dari nol membutuhkan riset, sketsa, dan revisi. Template memangkas tahap ini.
3. **Integrasi dengan sistem lain.** Menghubungkan website ke sistem internal, pembayaran, atau WhatsApp API menambah pekerjaan dan pengujian.
4. **Kecepatan proyek.** Tenggat yang sangat mepet biasanya berarti tim harus menambah orang atau jam kerja.
5. **Reputasi vendor.** Agensi dengan portofolio besar umumnya memasang harga lebih tinggi daripada pekerja lepas.

Kabar baiknya, sebagian besar faktor ini bisa Anda kendalikan. Mulailah dari halaman yang benar-benar dibutuhkan calon klien, lalu tambah fitur setelah website berjalan.

## Checklist sebelum meminta penawaran

Gunakan daftar ini agar penawaran dari beberapa vendor bisa dibandingkan secara adil:

- [ ] Daftar halaman yang dibutuhkan, misalnya Beranda, Tentang, Layanan, Proyek, dan Kontak.
- [ ] Siapa yang menyiapkan teks dan foto, dan kapan bahan itu siap.
- [ ] Nama domain pilihan beserta satu atau dua cadangan.
- [ ] Domain dan hosting terdaftar atas nama perusahaan Anda, bukan atas nama vendor.
- [ ] Biaya perpanjangan tahun kedua tertulis di penawaran.
- [ ] Jumlah revisi, jadwal pengerjaan, dan tahapan pembayaran.
- [ ] Cara mengubah isi website sendiri setelah selesai, misalnya lewat CMS.
- [ ] Kepemilikan konten dan file desain setelah proyek selesai.
- [ ] Kebijakan bila pekerjaan dibatalkan atau tidak bisa dilanjutkan.

## Template atau jasa custom?

Pilih template bila kebutuhan Anda adalah profil perusahaan yang rapi, cepat online, dan isinya bisa diubah sendiri. Pilih jasa custom bila website harus mengikuti alur kerja khusus, punya banyak jenis halaman, atau terhubung ke sistem lain. Perbandingan lengkapnya ada di panduan [template vs jasa website custom](/panduan/template-vs-jasa-website-custom).

## Biaya website company profile di Garuda Nexa

Garuda Nexa menyediakan dua jalur. Yang pertama, [template website company profile](/template/kategori/company-profile) siap pakai dengan harga tertera, saat ini {{harga_template_rentang}} per {{tanggal_harga}} untuk seluruh katalog. Harga itu sudah termasuk template dan setup awal, domain, hosting, dan SSL tahun pertama. Pembayaran dilakukan online lewat Midtrans, dan setelah website aktif, teks, foto, dan kontaknya Anda ubah sendiri lewat CMS. Contohnya, [{{template:corporate-nexa}}](/template/corporate-nexa) cocok untuk perusahaan jasa, konsultan, dan kontraktor, sedangkan [{{template:startup-clean}}](/template/startup-clean) cocok untuk UMKM dan startup yang cukup dengan website profil satu halaman.

Jalur kedua adalah [jasa pembuatan website custom](/jasa-pembuatan-website) untuk kebutuhan di luar template. Biayanya kami sampaikan lewat penawaran tertulis setelah konsultasi gratis, karena harganya mengikuti cakupan proyek.

## Pertanyaan yang sering diajukan

### Apakah ada website company profile yang benar-benar gratis?

Ada layanan pembuatan website gratis, tetapi biasanya memakai subdomain milik penyedia, menampilkan merek penyedia, atau membatasi fitur. Untuk perusahaan, domain sendiri lebih meyakinkan calon klien. Biaya domain .com atau .co.id per tahun relatif kecil dibandingkan manfaatnya.

### Berapa biaya website per tahun setelah tahun pertama?

Minimal biaya perpanjangan domain dan hosting. Dari contoh di atas, domain .co.id Rp300.000 dan hosting Rp1 juta berarti sekitar Rp1,3 juta per tahun, ditambah biaya perawatan bila Anda memakai jasa perawatan. Pastikan angka perpanjangan tertulis sebelum Anda membeli.

### Mengapa harga hosting naik saat perpanjangan?

Banyak penyedia memberi harga promo untuk periode pertama, lalu harga normal saat perpanjangan. Contohnya terlihat di Hostinger dan Rumahweb di atas. Karena itu, bandingkan harga perpanjangannya juga, bukan harga promonya saja.

### Lebih baik domain .com atau .co.id?

Keduanya sama-sama bisa ditemukan di Google. Domain .co.id hanya untuk badan hukum, badan usaha, atau organisasi yang punya NIB, sehingga memberi sinyal bahwa pemiliknya perusahaan Indonesia. Domain .com lebih dikenal secara internasional. Pilih yang paling mudah diingat calon klien, dan bila perlu daftarkan keduanya.

### Apakah harga template sudah termasuk penulisan isi website?

Umumnya tidak. Template menyediakan desain dan struktur halaman, sedangkan teks, foto, dan logo berasal dari Anda. Di Garuda Nexa, isi itu Anda masukkan dan ubah sendiri lewat CMS kapan saja, dan isi tersebut tetap milik Anda.

## Sumber

- Next IT, "Berapa Biaya Buat Website Profesional di 2026? Panduan Lengkap untuk Pemilik Bisnis", 8 Agustus 2026: [next-it.co.id](https://next-it.co.id/blog/berapa-biaya-buat-website-profesional-di-2026-panduan-lengkap-untuk-pemilik-bisnis)
- Hostinger, "Berapa estimasi biaya pembuatan website di tahun 2026?", diperbarui 11 Februari 2026: [hostinger.com](https://www.hostinger.com/id/tutorial/estimasi-biaya-pembuatan-website/)
- Rumahweb, daftar harga domain, dicek 23 Oktober 2026: [rumahweb.com](https://www.rumahweb.com/domain-murah/)
- Hostinger, harga web hosting, dicek 23 Oktober 2026: [hostinger.com](https://www.hostinger.com/id/web-hosting)
- Rumahweb, harga hosting, dicek 23 Oktober 2026: [rumahweb.com](https://www.rumahweb.com/hosting-murah/)
- Let's Encrypt, halaman tentang Let's Encrypt: [letsencrypt.org](https://letsencrypt.org/about/)
- PANDI, Kebijakan Pendaftaran Nama Domain versi 9.0, 30 September 2024: [pandi.id](https://pandi.id/public/files/2024/10/kebijakan-pendaftaran-nama-domain-versi-9-0-bilingual-new-1729151599.pdf)
`,de=`---
title: "Template vs Jasa Website Custom: Mana yang Tepat?"
description: Bandingkan template website siap pakai dan jasa website custom dari sisi biaya, waktu, fitur, dan perawatan, plus checklist untuk memilih.
slug: template-vs-jasa-website-custom
author: Tim Garuda Nexa
datePublished: 2026-10-23
dateModified: 2026-10-23
cta: template
sources:
  - https://next-it.co.id/blog/berapa-biaya-buat-website-profesional-di-2026-panduan-lengkap-untuk-pemilik-bisnis
  - https://www.hostinger.com/id/tutorial/estimasi-biaya-pembuatan-website/
  - https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing?hl=id
  - https://web.dev/articles/vitals?hl=id
  - https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022
  - https://inet.detik.com/telecommunication/d-8047759/survei-apjii-pengguna-internet-indonesia-2025-tembus-229-juta-jiwa
related: [biaya-website-company-profile, biaya-aplikasi-android-ios]
---

Pilih template website siap pakai bila Anda butuh website profil yang cepat online dengan biaya tetap, dan isinya cukup Anda ubah sendiri. Pilih jasa website custom bila website harus menjalankan alur bisnis khusus, misalnya pendaftaran bertahap, akun pelanggan, atau integrasi dengan sistem internal, atau bila tampilannya wajib mengikuti panduan merek tertentu. Banyak usaha memulai dari template, lalu beralih ke custom setelah kebutuhannya terbukti.

Perbedaan keduanya bukan soal mana yang lebih bagus, melainkan soal kecocokan. Template memberi Anda desain dan struktur yang sudah teruji untuk jenis usaha tertentu. Website custom memberi kebebasan penuh, dengan konsekuensi biaya, waktu, dan keputusan yang lebih banyak. Panduan ini membandingkan keduanya dari sisi biaya, waktu, fitur, dan perawatan, lalu memberi checklist singkat untuk memilih.

## Perbedaan template dan website custom

Ringkasan di bawah memakai kisaran harga pasar dari [Next IT (Agustus 2026)](https://next-it.co.id/blog/berapa-biaya-buat-website-profesional-di-2026-panduan-lengkap-untuk-pemilik-bisnis) dan harga template Garuda Nexa dari data katalog.

| Aspek | Template siap pakai | Website custom |
|---|---|---|
| Biaya awal | Vendor template umumnya Rp2–5 juta; template Garuda Nexa {{harga_template_rentang}} per {{tanggal_harga}}, termasuk domain, hosting, dan SSL tahun pertama | Company profile 5–10 halaman umumnya Rp8–25 juta; toko online dan aplikasi web jauh lebih tinggi |
| Waktu sampai online | Lebih singkat, karena desain dan struktur halaman sudah jadi | Mengikuti jadwal proyek: desain, pengembangan, pengujian, dan revisi |
| Desain | Pilih dari katalog, lalu ganti teks, foto, dan logo | Dirancang dari nol sesuai identitas merek |
| Fitur | Sesuai yang sudah tersedia di template | Dibuat sesuai kebutuhan, termasuk integrasi |
| Mengubah isi | Lewat CMS yang sudah disiapkan | Tergantung sistem yang dibuat; pastikan ada CMS |
| Cocok untuk | UMKM, klinik, klub, dan startup yang ingin cepat online | Alur atau fitur khusus, instansi, dan sistem yang terhubung |

## Kapan template website siap pakai lebih tepat

Template paling masuk akal ketika kebutuhan utama Anda adalah memperkenalkan usaha dengan rapi dan membuat calon pelanggan mudah menghubungi Anda. Tanda-tandanya:

- Halaman yang Anda butuhkan sudah tersedia di template: profil, layanan, galeri, testimoni, dan kontak.
- Pemesanan atau pertanyaan pelanggan cukup diarahkan ke WhatsApp, telepon, atau email.
- Anggaran tahun pertama sudah pasti dan tidak boleh melebar karena revisi desain.
- Anda ingin website segera online, misalnya untuk pembukaan cabang, pameran, atau kampanye iklan.
- Anda atau staf Anda yang akan mengganti isi website sehari-hari, tanpa harus menghubungi programmer.

Keuntungan lain yang sering diremehkan: Anda bisa melihat hasil akhirnya sebelum membeli. Demo template menunjukkan persis bagaimana halaman tampil di HP dan desktop, sementara website custom baru terlihat setelah tahap desain selesai.

Garuda Nexa menyediakan template untuk beberapa jenis usaha, antara lain [template website company profile](/template/kategori/company-profile), [template website klinik kecantikan & salon](/template/kategori/kecantikan-klinik), [template website klub olahraga](/template/kategori/olahraga-komunitas), dan [template website fintech & startup](/template/kategori/fintech-startup).

## Kapan jasa website custom lebih tepat

Website custom layak dipertimbangkan ketika website bukan sekadar etalase, tetapi bagian dari cara bisnis Anda berjalan. Contohnya:

- Pelanggan perlu mendaftar, login, atau melihat riwayat transaksi.
- Data dari formulir harus tersimpan rapi dan dikelola beberapa orang, bukan sekadar dikirim ke WhatsApp.
- Website harus terhubung ke sistem lain, seperti pembayaran, sistem kasir, atau aplikasi internal.
- Pemesanan membutuhkan jadwal, slot, atau pembayaran uang muka secara otomatis.
- Website perlu dua bahasa, banyak jenis halaman, atau desain yang wajib mengikuti panduan merek.

Bila website custom mengumpulkan data pribadi pelanggan, perlindungannya ikut menjadi tanggung jawab Anda sebagai pemilik website. Indonesia sudah memiliki [Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi](https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022), jadi bahas sejak awal bersama pengembang data apa saja yang dikumpulkan, siapa yang boleh mengaksesnya, dan bagaimana data itu diamankan.

## Bandingkan total biaya dua tahun, bukan harga awal

Harga awal sering menyesatkan. Website custom biasanya punya biaya pembuatan lebih besar, ditambah biaya perawatan yang menurut Next IT berkisar 10–15% dari biaya pembuatan per tahun. Untuk website custom senilai Rp12 juta, itu berarti sekitar Rp1,2–1,8 juta per tahun, di luar domain dan hosting.

Template juga punya biaya tahunan, yaitu perpanjangan domain dan hosting. Bila Anda membangun sendiri dengan website builder, [Hostinger](https://www.hostinger.com/id/tutorial/estimasi-biaya-pembuatan-website/) memperkirakan totalnya sekitar Rp237.600 hingga Rp2,75 juta per tahun, ditambah waktu Anda sendiri untuk menyusun halaman.

Cara membandingkan yang adil:

1. Tulis biaya tahun pertama setiap pilihan, termasuk domain, hosting, dan SSL.
2. Tulis biaya tahun kedua: perpanjangan, perawatan, dan perubahan isi yang Anda perkirakan.
3. Hitung waktu yang Anda butuhkan sampai website online, karena setiap minggu tanpa website juga punya harga.

Rincian setiap komponen biaya ada di panduan [berapa biaya membuat website company profile](/panduan/biaya-website-company-profile).

## Kualitas teknis yang wajib ada, template maupun custom

Apa pun pilihan Anda, ada standar teknis yang sama. Pengguna internet di Indonesia mencapai sekitar 229,4 juta orang pada 2025, atau 80,66% penduduk, menurut survei APJII yang dilaporkan [detikInet](https://inet.detik.com/telecommunication/d-8047759/survei-apjii-pengguna-internet-indonesia-2025-tembus-229-juta-jiwa). Calon pelanggan Anda kemungkinan besar membuka website dari HP, dan Google juga menggunakan versi seluler sebuah situs untuk pengindeksan dan penentuan peringkat ([Google Search Central](https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing?hl=id)).

Periksa hal berikut sebelum membeli template atau menerima hasil website custom:

- **Tampil baik di HP.** Teks terbaca tanpa perlu diperbesar, tombol mudah diketuk, dan tidak ada bagian yang terpotong.
- **Cepat dimuat.** Google menyarankan Largest Contentful Paint paling lama 2,5 detik, Interaction to Next Paint 200 milidetik atau kurang, dan Cumulative Layout Shift 0,1 atau kurang ([web.dev](https://web.dev/articles/vitals?hl=id)). Anda bisa mengujinya dengan PageSpeed Insights dari Google.
- **Memakai HTTPS.** Alamat website diawali https dan browser tidak menampilkan peringatan keamanan.
- **Mudah diubah.** Anda bisa mengganti teks, foto, harga, dan kontak sendiri tanpa menyentuh kode.

## Jalan tengah: mulai dari template, kembangkan dengan custom

Bila Anda belum yakin, mulailah dari template. Dengan website yang sudah online, Anda bisa melihat halaman mana yang paling sering dibuka dan pertanyaan apa yang paling sering masuk lewat WhatsApp. Data seperti itu membuat brief untuk website custom jauh lebih tajam, sehingga Anda hanya membayar fitur yang memang terbukti dibutuhkan.

Contohnya, klub olahraga bisa memulai dengan template yang mengarahkan pemesanan lapangan ke WhatsApp. Setelah jumlah pesanan bertambah dan jadwal mulai sulit diatur lewat chat, barulah sistem booking dengan slot dan pembayaran online dibuat sebagai proyek custom.

## Checklist: template atau custom?

Jawab pertanyaan berikut. Bila sebagian besar jawabannya "ya", template kemungkinan sudah cukup:

- [ ] Semua halaman yang Anda butuhkan sudah ada di template.
- [ ] Pesanan dan pertanyaan pelanggan cukup diterima lewat WhatsApp, telepon, atau email.
- [ ] Website tidak perlu terhubung ke sistem lain.
- [ ] Anggaran tahun pertama harus pasti sejak awal.
- [ ] Website perlu segera online.
- [ ] Isi website akan Anda ubah sendiri secara rutin.
- [ ] Demo template tampil baik saat Anda buka di HP.

Bila Anda menjawab "tidak" untuk tiga pertanyaan pertama, kebutuhan Anda condong ke website custom.

## Template dan jasa custom di Garuda Nexa

Di Garuda Nexa, setiap template punya harga tertera yang sudah mencakup template dan setup awal, domain, hosting, serta SSL tahun pertama. Anda memesan dan membayar online lewat Midtrans, lalu mengubah teks, foto, dan kontak sendiri lewat CMS. Tata letak dan urutan bagian mengikuti desain template; halaman tambahan, formulir yang menyimpan data, atau fitur baru termasuk pekerjaan custom. Bila pesanan yang sudah lunas ditolak, misalnya karena domain tidak tersedia, dana dikembalikan penuh ke metode pembayaran semula paling lambat 7 hari kerja setelah pesanan ditolak. Daftar lengkapnya ada di [halaman Harga](/harga).

Untuk kebutuhan di luar template, tersedia [jasa pembuatan website custom](/jasa-pembuatan-website) dan [jasa pembuatan aplikasi Android & iOS](/jasa-pembuatan-aplikasi-mobile). Biayanya kami sampaikan lewat penawaran tertulis setelah konsultasi gratis, dan Anda bisa mulai dengan menceritakan kebutuhan lewat [formulir Pesan Custom](/pesan-custom).

## Pertanyaan yang sering diajukan

### Apakah website dari template kalah di Google dibanding website custom?

Cara desain dibuat bukan hal yang ditekankan panduan Google. Yang ditekankan adalah isi yang menjawab kebutuhan pencari, versi HP yang lengkap, dan halaman yang cepat serta stabil saat dimuat. Template yang dibuat dengan baik dan diisi dengan informasi asli usaha Anda bisa bersaing dengan website custom.

### Apakah website template akan terlihat sama dengan website lain?

Strukturnya sama dengan pengguna template yang sama, tetapi logo, foto, teks, dan warna aksen (bila template menyediakannya) membuat tampilannya berbeda. Foto asli usaha Anda adalah pembeda terbesar, jadi hindari memakai foto contoh bawaan.

### Bisakah beralih dari template ke website custom nanti?

Bisa. Teks, foto, dan daftar layanan yang sudah Anda tulis tetap bisa dipakai di website baru. Yang dibangun ulang adalah desain dan fiturnya. Agar peralihan mulus, simpan salinan isi website Anda dan catat fitur yang ingin ditambahkan sejak awal.

### Berapa lama pembuatan website custom?

Tergantung cakupan pekerjaan dan kesiapan bahan seperti teks, foto, dan data. Penawaran yang baik mencantumkan jadwal per tahap, misalnya desain, pengembangan, pengujian, dan rilis, sehingga Anda tahu kapan harus memberi masukan.

### Apakah saya bisa mengubah isi website custom sendiri?

Hanya bila pengembang menyiapkan CMS atau panel admin. Pastikan hal ini tertulis di penawaran, termasuk bagian mana saja yang bisa diubah dan apakah ada pelatihan singkat.

## Sumber

- Next IT, "Berapa Biaya Buat Website Profesional di 2026? Panduan Lengkap untuk Pemilik Bisnis", 8 Agustus 2026: [next-it.co.id](https://next-it.co.id/blog/berapa-biaya-buat-website-profesional-di-2026-panduan-lengkap-untuk-pemilik-bisnis)
- Hostinger, "Berapa estimasi biaya pembuatan website di tahun 2026?", diperbarui 11 Februari 2026: [hostinger.com](https://www.hostinger.com/id/tutorial/estimasi-biaya-pembuatan-website/)
- Google Search Central, panduan pengindeksan berbasis perangkat seluler (mobile-first indexing), diperbarui 20 Februari 2026: [developers.google.com](https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing?hl=id)
- web.dev, "Web Vitals", ambang Core Web Vitals, diperbarui 31 Oktober 2024: [web.dev](https://web.dev/articles/vitals?hl=id)
- BPK RI, Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi: [peraturan.bpk.go.id](https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022)
- detikInet, laporan survei APJII tentang pengguna internet Indonesia 2025, 6 Agustus 2025: [inet.detik.com](https://inet.detik.com/telecommunication/d-8047759/survei-apjii-pengguna-internet-indonesia-2025-tembus-229-juta-jiwa)
`,fe=`---
title: "Website Klinik Kecantikan: Halaman Wajib & Contohnya"
description: Halaman wajib di website klinik kecantikan & salon, cara menulis isinya tanpa janji berlebihan, reservasi WhatsApp, Google Maps, dan contoh strukturnya.
slug: website-klinik-kecantikan
author: Tim Garuda Nexa
datePublished: 2026-10-23
dateModified: 2026-10-23
cta: template
sources:
  - https://support.google.com/business/answer/7091?hl=id
  - https://developers.google.com/search/docs/fundamentals/creating-helpful-content?hl=id
  - https://whatsappbusiness.com/id/products/business-app/
  - https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022
  - https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing?hl=id
  - https://inet.detik.com/telecommunication/d-8047759/survei-apjii-pengguna-internet-indonesia-2025-tembus-229-juta-jiwa
related: [template-vs-jasa-website-custom, biaya-website-company-profile]
---

Website klinik kecantikan setidaknya perlu memuat daftar perawatan beserta harga mulai, profil klinik dan tim, galeri suasana, cara reservasi yang jelas, lokasi dan jam buka, tanya jawab, serta kebijakan privasi bila Anda mengumpulkan data pelanggan. Tulis semuanya apa adanya, tanpa menjanjikan hasil, karena calon pelanggan memakai website untuk menilai apakah klinik Anda bisa dipercaya sebelum mereka menghubungi. Tombol reservasi lewat WhatsApp sudah cukup untuk sebagian besar klinik, salon, dan spa.

Panduan ini berlaku untuk klinik kecantikan, klinik estetika, salon, spa, nail art, lash & brow studio, dan barbershop. Di bagian akhir ada contoh struktur halaman dari template yang bisa langsung Anda pakai, plus checklist sebelum website online.

## Halaman dan bagian yang wajib ada

Website klinik tidak harus terdiri dari banyak halaman. Satu halaman panjang yang tersusun rapi sering lebih nyaman dibaca dari HP. Yang penting, bagian-bagian berikut ada dan mudah ditemukan:

| Bagian | Isi yang perlu ada | Mengapa penting |
|---|---|---|
| Pembuka (hero) | Nama klinik, satu kalimat tentang layanan utama, lokasi, dan tombol reservasi | Pengunjung langsung tahu mereka berada di tempat yang tepat |
| Daftar perawatan | Nama perawatan, deskripsi singkat, durasi, dan harga mulai, dikelompokkan per kategori | Pertanyaan paling sering adalah "ada perawatan apa dan berapa harganya" |
| Tentang klinik dan tim | Cerita klinik, nama dan keahlian terapis, serta kualifikasi tenaga medis bila ada | Orang memilih klinik karena percaya pada orang yang menangani mereka |
| Galeri | Foto asli ruangan, alat, dan suasana klinik | Mengurangi keraguan pelanggan yang belum pernah datang |
| Testimoni | Cerita pelanggan asli yang sudah memberi izin | Bukti sosial yang jujur lebih meyakinkan daripada klaim |
| Reservasi dan kontak | Tombol WhatsApp, nomor telepon, alamat, peta, dan jam buka | Mengubah pengunjung menjadi pelanggan |
| Tanya jawab | Persiapan sebelum datang, cara membatalkan jadwal, metode pembayaran | Mengurangi pertanyaan berulang di WhatsApp |
| Kebijakan privasi | Data apa yang dikumpulkan dan untuk apa | Wajib dipikirkan bila website atau chat mengumpulkan data pelanggan |

## Menulis isi yang membangun kepercayaan

Perawatan kecantikan berkaitan dengan tubuh dan kesehatan orang, sehingga pengunjung, dan mesin pencari, menilai isinya dengan lebih teliti. Google menjelaskan bahwa untuk topik yang bisa berdampak besar pada kesehatan, keuangan, atau keselamatan seseorang (disebut YMYL), isi harus sangat akurat dan sejalan dengan konsensus pakar. Google juga menyarankan agar pengunjung bisa melihat dengan jelas siapa yang menulis isi sebuah halaman ([Google Search Central](https://developers.google.com/search/docs/fundamentals/creating-helpful-content?hl=id)).

Dalam praktiknya:

- **Jelaskan prosesnya, bukan janjinya.** Tulis apa yang dilakukan, berapa lama, dan untuk siapa perawatan itu cocok. Hindari kalimat seperti "dijamin hilang" atau "hasil permanen".
- **Gunakan foto asli.** Foto ruangan, alat, dan tim Anda sendiri lebih dipercaya daripada foto stok.
- **Tampilkan tim dengan jujur.** Cantumkan nama dan keahlian terapis. Bila ada tenaga medis, tulis kualifikasinya apa adanya.
- **Pakai testimoni asli dengan izin.** Jangan menulis ulasan rekaan atau mengedit foto hasil perawatan.
- **Libatkan penanggung jawab medis.** Bila klinik Anda menjalankan tindakan medis, minta penanggung jawab medis meninjau isi website agar sesuai dengan aturan publikasi layanan kesehatan yang berlaku.

## Reservasi: cukup WhatsApp atau perlu sistem booking?

Bagi kebanyakan klinik kecil dan menengah, reservasi lewat WhatsApp sudah memadai. Pelanggan menekan tombol di website, lalu chat terbuka dengan pesan awal yang menyebut perawatan yang mereka pilih. Anda cukup mengonfirmasi jadwal di chat. Aplikasi [WhatsApp Business](https://whatsappbusiness.com/id/products/business-app/) membantu dengan profil bisnis, katalog layanan beserta harganya, dan pesan otomatis untuk menyapa pelanggan serta membalas saat Anda sedang tidak bisa menjawab.

Sistem booking otomatis mulai masuk akal ketika:

- Klinik punya banyak terapis dan ruang, sehingga jadwal sulit diatur lewat chat.
- Anda ingin pelanggan memilih jam sendiri dan membayar uang muka saat memesan.
- Anda butuh kartu member, poin, atau catatan riwayat perawatan pelanggan.

Fitur seperti itu termasuk website atau aplikasi custom. Pertimbangan lengkapnya ada di panduan [template vs jasa website custom](/panduan/template-vs-jasa-website-custom).

## Muncul di Google Maps dan pencarian lokal

Banyak pelanggan mencari klinik dengan kata kunci seperti "klinik kecantikan dekat sini". Hasil seperti ini banyak bergantung pada Google Business Profile. Google menyebut tiga faktor utama peringkat lokal: relevansi, yaitu seberapa cocok profil dengan penelusuran; jarak dari orang yang mencari; dan keterlihatan, yaitu seberapa dikenal bisnis tersebut. Google juga menyarankan agar info bisnis di profil diisi selengkap mungkin, termasuk jam buka dan foto ([Bantuan Profil Bisnis Google](https://support.google.com/business/answer/7091?hl=id)).

Website dan Google Business Profile saling melengkapi:

1. Cantumkan alamat website di Google Business Profile.
2. Pastikan nama klinik, alamat, nomor telepon, dan jam buka di website sama persis dengan di profil.
3. Tulis nama kota atau kawasan di website, misalnya di bagian kontak dan deskripsi klinik.
4. Pastikan website nyaman dibuka dari HP. Google menggunakan versi seluler sebuah situs untuk pengindeksan dan penentuan peringkat ([Google Search Central](https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing?hl=id)).

Konteksnya jelas: menurut survei APJII yang dilaporkan [detikInet](https://inet.detik.com/telecommunication/d-8047759/survei-apjii-pengguna-internet-indonesia-2025-tembus-229-juta-jiwa), pengguna internet di Indonesia mencapai sekitar 229,4 juta orang pada 2025, atau 80,66% penduduk. Calon pelanggan Anda kemungkinan besar mencari dan membandingkan klinik lewat internet sebelum datang.

## Data pelanggan dan privasi

Formulir kontak, chat WhatsApp, dan catatan reservasi berisi data pribadi: nama, nomor telepon, dan kadang keluhan kulit atau riwayat perawatan. Indonesia sudah memiliki [Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi](https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022). Prinsip sederhananya: kumpulkan hanya data yang benar-benar dibutuhkan, jelaskan untuk apa data itu dipakai, batasi siapa yang bisa melihatnya, dan jangan menampilkan data atau foto pelanggan tanpa izin.

## Contoh struktur website klinik kecantikan

Contoh berikut diambil dari [{{template:aura-studio}}](/template/aura-studio), template website klinik kecantikan dan salon di Garuda Nexa. Urutan bagiannya mengikuti cara calon pelanggan memutuskan, dari mengenal klinik sampai menghubungi:

1. **Menu atas** dengan logo dan tautan ke setiap bagian, termasuk menu yang langsung membuka kategori perawatan.
2. **Pembuka** dengan foto besar, lokasi, jam buka, tombol Reservasi, dan tiga perawatan dari daftar Anda.
3. **Mengapa kami**: hingga 6 alasan memilih klinik Anda.
4. **Perawatan**: hingga 12 kartu dengan tab kategori, misalnya perawatan wajah dan perawatan kuku, beserta harga mulai. Setiap kartu membuka WhatsApp dengan nama perawatannya.
5. **Perawatan unggulan**: satu perawatan dengan deskripsi dan hingga 4 tahapan.
6. **Tentang studio**, **produk & mitra** (logo produk yang Anda pakai), dan **galeri** hingga 9 foto.
7. **Testimoni** hingga 6 cerita pelanggan dan **tim terapis** hingga 6 orang.
8. **Kontak** dengan alamat, telepon, email, WhatsApp, jam operasional, peta Google Maps, dan formulir pesan yang membuka WhatsApp.

Semua teks, foto, dan harga di atas Anda ubah sendiri lewat CMS. {{template:aura-studio}} tidak memiliki kalender atau sistem antrean: reservasi berjalan lewat WhatsApp, dan template ini tidak menambahkan klaim hasil atau klaim medis apa pun di luar teks yang Anda tulis. Harganya {{harga:aura-studio|tertera di halaman template}} per {{tanggal_harga}}, sudah termasuk domain, hosting, dan SSL tahun pertama. Pilihan lainnya ada di kategori [template website klinik kecantikan & salon](/template/kategori/kecantikan-klinik), dan perbandingan harga semua template ada di [halaman Harga](/harga).

## Checklist sebelum website klinik online

- [ ] Daftar perawatan lengkap dengan deskripsi, durasi, dan harga mulai yang terbaru.
- [ ] Foto asli klinik, alat, dan tim, dengan izin dari orang yang ada di foto.
- [ ] Nama dan keahlian terapis, serta kualifikasi tenaga medis bila ada.
- [ ] Nomor WhatsApp dan pesan awal untuk tombol reservasi sudah diuji.
- [ ] Alamat, jam buka, dan peta sama dengan Google Business Profile.
- [ ] Testimoni asli dengan izin pelanggan.
- [ ] Isi website sudah ditinjau penanggung jawab klinik, tanpa janji hasil.
- [ ] Kebijakan privasi disiapkan bila Anda mengumpulkan data pelanggan.
- [ ] Website sudah dicoba dari beberapa HP.

## Pertanyaan yang sering diajukan

### Perlukah mencantumkan harga perawatan di website?

Sangat disarankan, setidaknya harga mulai. Harga yang jelas menyaring pertanyaan yang tidak serius dan membuat calon pelanggan lebih yakin untuk menghubungi. Bila harga tergantung kondisi pelanggan, tulis "mulai dari" dan jelaskan bahwa harga akhir ditentukan setelah konsultasi.

### Bolehkah menampilkan foto sebelum dan sesudah perawatan?

Foto hasil perawatan adalah informasi yang sensitif. Tampilkan hanya dengan izin tertulis pelanggan, jangan diedit, dan jangan menyiratkan bahwa semua orang akan mendapat hasil yang sama. Bila klinik Anda menjalankan tindakan medis, tanyakan dulu kepada penanggung jawab medis apakah publikasi semacam ini sesuai aturan yang berlaku.

### Apakah cukup memakai Instagram tanpa website?

Instagram bagus untuk menampilkan suasana dan promosi, tetapi informasinya tersebar di banyak unggahan. Website mengumpulkan daftar perawatan, harga, lokasi, dan cara reservasi di satu tempat yang bisa ditemukan lewat Google. Keduanya bisa saling menautkan.

### Bagaimana agar klinik muncul di Google Maps?

Daftarkan dan lengkapi Google Business Profile: kategori bisnis, alamat, jam buka, foto, dan alamat website. Pastikan datanya sama dengan yang ada di website. Peringkat lokal terutama ditentukan oleh relevansi, jarak, dan keterlihatan, jadi tidak ada cara instan untuk langsung berada di urutan teratas.

### Bisakah pelanggan reservasi online lewat website?

Dengan template seperti {{template:aura-studio}}, reservasi berjalan lewat WhatsApp: pelanggan menekan tombol dan chat terbuka dengan nama perawatannya. Bila Anda membutuhkan pemilihan jam dan terapis, pembayaran uang muka, atau kartu member, fitur tersebut bisa dibuat lewat [jasa pembuatan website custom](/jasa-pembuatan-website).

## Sumber

- Google, Bantuan Profil Bisnis, artikel tentang peringkat lokal di Google, dicek 23 Oktober 2026: [support.google.com](https://support.google.com/business/answer/7091?hl=id)
- Google Search Central, panduan membuat konten yang bermanfaat, andal, dan mengutamakan pengguna, diperbarui 7 Oktober 2026: [developers.google.com](https://developers.google.com/search/docs/fundamentals/creating-helpful-content?hl=id)
- WhatsApp Business, halaman aplikasi WhatsApp Business, dicek 23 Oktober 2026: [whatsappbusiness.com](https://whatsappbusiness.com/id/products/business-app/)
- BPK RI, Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi: [peraturan.bpk.go.id](https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022)
- Google Search Central, panduan pengindeksan berbasis perangkat seluler (mobile-first indexing), diperbarui 20 Februari 2026: [developers.google.com](https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing?hl=id)
- detikInet, laporan survei APJII tentang pengguna internet Indonesia 2025, 6 Agustus 2025: [inet.detik.com](https://inet.detik.com/telecommunication/d-8047759/survei-apjii-pengguna-internet-indonesia-2025-tembus-229-juta-jiwa)
`;function pe(e,t){let n=E(e.map(p)),r=E(t);if(n.length===r.length&&n.every((e,t)=>f.every(n=>e[n]===r[t][n])))return null;let i=n.filter(e=>!r.some(t=>f.every(n=>t[n]===e[n]))).map(e=>e.slug),a=r.filter(e=>!n.some(t=>t.slug===e.slug)).map(e=>e.slug);return`src/content/panduan/articles.generated.ts tidak sama dengan frontmatter artikel`+(i.length?` (berubah/baru: ${i.join(`, `)})`:``)+(a.length?` (tanpa file .md: ${a.join(`, `)})`:``)+`. Jalankan: npx vitest run src/content/panduan -u`}var q=E(Object.entries(Object.assign({"./biaya-aplikasi-android-ios.md":le,"./biaya-website-company-profile.md":ue,"./template-vs-jasa-website-custom.md":de,"./website-klinik-kecantikan.md":fe})).map(([e,t])=>z(t,e.replace(/^.*\//,``).replace(/\.md$/,``)))),J=pe(q,h);if(J)throw Error(J);function me(e){return q.find(t=>t.slug===e)}var he=/\{\{\s*([a-z_]+)(?::([a-z0-9-]+))?\s*(?:\|([^}]*))?\}\}/g,ge=e=>e.split(`-`).map(e=>e.charAt(0).toUpperCase()+e.slice(1)).join(` `),Y=`sesuai harga di halaman Harga`;function X(e,t){let n=t.templates.map(e=>e.price).filter(l),r=e.argument?t.templates.find(t=>t.slug===e.argument):void 0;switch(e.name){case`harga_template_rentang`:return s(n)??e.fallback??Y;case`harga_template_min`:return n.length?c(Math.min(...n)):e.fallback??Y;case`jumlah_template`:return t.templates.length?String(t.templates.length):e.fallback??`beberapa`;case`tanggal_harga`:return o(t.priceDate);case`template`:return r?.name?.trim()||e.fallback||ge(e.argument??``);case`harga`:return r&&l(r.price)?c(r.price):e.fallback??Y;default:return e.fallback??``}}function _e(e,t){return e.replace(he,(e,n,r,i)=>X({raw:e,name:n,argument:r,fallback:i?.trim()},t))}var Z=a(),Q=e=>e?e.type===`text`?e.value??``:(e.children??[]).map(Q).join(``):``;function ve(e){let t=[],n=e=>{e.tagName===`tr`?t.push(e):e.children?.forEach(n)};return e&&n(e),t[0]?.children?.filter(e=>e.tagName===`th`||e.tagName===`td`).length??0}var ye=e=>e>=4?`min-w-[40rem]`:e===3?`min-w-[34rem]`:``,be=e=>/^https?:\/\//i.test(e);function xe({markdown:e,resolveHref:t=e=>e}){return(0,Z.jsx)(`div`,{className:`text-[15px] leading-[1.75] text-muted sm:text-[17px] [&>p:first-child]:text-fg sm:[&>p:first-child]:text-[19px] sm:[&>p:first-child]:leading-relaxed`,children:(0,Z.jsx)(ae,{remarkPlugins:[oe],components:{h1:({children:e})=>(0,Z.jsx)(`h2`,{className:`mt-12 text-xl font-semibold text-fg`,children:e}),h2:({node:e,children:t})=>(0,Z.jsx)(`h2`,{id:V(Q(e)),className:`mt-12 scroll-mt-[calc(var(--nav-offset)+1.5rem)] text-xl font-semibold leading-tight tracking-[-0.02em] text-fg first:mt-0 sm:mt-16 sm:text-[28px] sm:leading-[1.15]`,children:t}),h3:({children:e})=>(0,Z.jsx)(`h3`,{className:`mt-8 text-base font-semibold leading-snug text-fg sm:mt-10 sm:text-xl`,children:e}),h4:({children:e})=>(0,Z.jsx)(`h4`,{className:`mt-6 text-[15px] font-semibold text-fg sm:text-base`,children:e}),p:({children:e})=>(0,Z.jsx)(`p`,{className:`mt-4 first:mt-0 sm:mt-5`,children:e}),strong:({children:e})=>(0,Z.jsx)(`strong`,{className:`font-semibold text-fg`,children:e}),a:({href:e=``,children:n})=>{let r=t(e);return be(r)?(0,Z.jsxs)(`a`,{href:r,target:`_blank`,rel:`noopener noreferrer`,className:`link-site font-medium break-words`,children:[n,(0,Z.jsx)(`span`,{className:`sr-only`,children:` (tab baru)`})]}):r.startsWith(`/`)?(0,Z.jsx)(y,{to:r,className:`link-site font-medium`,children:n}):(0,Z.jsx)(`a`,{href:r,className:`link-site font-medium`,children:n})},ul:({className:e,children:t})=>e?.includes(`contains-task-list`)?(0,Z.jsx)(`ul`,{className:`mt-4 space-y-2.5 sm:mt-5`,children:t}):(0,Z.jsx)(`ul`,{className:`mt-4 list-disc space-y-2 pl-5 marker:text-subtle sm:mt-5`,children:t}),ol:({children:e,start:t})=>(0,Z.jsx)(`ol`,{start:t,className:`mt-4 list-decimal space-y-2 pl-5 marker:font-mono marker:text-[0.85em] marker:text-subtle sm:mt-5`,children:e}),li:({className:e,children:t})=>e?.includes(`task-list-item`)?(0,Z.jsx)(`li`,{className:`flex items-start gap-3 rounded-[16px] bg-alt px-4 py-3 ring-1 ring-inset ring-line [&>p]:mt-0`,children:t}):(0,Z.jsx)(`li`,{className:`pl-1 [&>p]:mt-2 [&>p:first-child]:mt-0`,children:t}),input:({checked:e})=>e?(0,Z.jsx)(T,{className:`mt-[0.2em] h-[1.1em] w-[1.1em] shrink-0 text-primary`,"aria-hidden":!0}):(0,Z.jsx)(O,{className:`mt-[0.2em] h-[1.1em] w-[1.1em] shrink-0 text-primary`,"aria-hidden":!0}),blockquote:({children:e})=>(0,Z.jsx)(`aside`,{className:`mt-6 rounded-[20px] bg-alt p-4 text-fg ring-1 ring-inset ring-line sm:mt-8 sm:p-6 [&>p]:mt-2 [&>p:first-child]:mt-0`,children:e}),hr:()=>(0,Z.jsx)(`hr`,{className:`my-10 border-line`}),table:({node:e,children:t})=>(0,Z.jsx)(`div`,{className:`relative mt-6 overflow-x-auto rounded-[20px] ring-1 ring-inset ring-line sm:mt-8`,tabIndex:0,role:`region`,"aria-label":`Tabel, geser ke samping bila perlu`,children:(0,Z.jsx)(`table`,{className:`w-full border-collapse text-left text-[13px] leading-relaxed sm:text-[15px] ${ye(ve(e))}`,children:t})}),thead:({children:e})=>(0,Z.jsx)(`thead`,{className:`bg-alt text-fg`,children:e}),th:({children:e,style:t})=>(0,Z.jsx)(`th`,{scope:`col`,style:t,className:`px-4 py-3 align-bottom text-[12px] font-semibold sm:px-5 sm:text-[13px]`,children:e}),td:({children:e,style:t})=>(0,Z.jsx)(`td`,{style:t,className:`border-t border-line px-4 py-3 align-top sm:px-5 sm:py-3.5 [&_strong]:text-fg`,children:e}),code:({children:e})=>(0,Z.jsx)(`code`,{className:`rounded bg-alt px-1.5 py-0.5 font-mono text-[0.9em] text-fg`,children:e})},children:e})})}var Se=3,$=({headings:e})=>(0,Z.jsx)(`ol`,{className:`space-y-0.5`,children:e.map((e,t)=>(0,Z.jsx)(`li`,{children:(0,Z.jsxs)(`a`,{href:`#${e.id}`,className:`flex min-h-10 items-start gap-2.5 rounded-xl px-3 py-2 text-[13px] leading-snug text-muted transition-colors hover:bg-alt hover:text-fg lg:min-h-0 lg:py-1.5`,children:[(0,Z.jsxs)(`span`,{className:`w-5 shrink-0 font-mono text-[12px] tabular-nums text-subtle`,children:[t+1,`.`]}),(0,Z.jsx)(`span`,{children:e.text})]})},e.id))});function Ce(){let{slug:i=``}=d(),a=u(i),o=a?me(i):void 0,{status:s,templates:c}=ie(),l=ee(),f=(0,k.useMemo)(()=>o?_e(o.body,{templates:c,priceDate:l}):``,[o,c,l]),p=(0,k.useMemo)(()=>H(f),[f]),m=(0,k.useMemo)(()=>ce(K(W(f))),[f]);if(!a||!o)return(0,Z.jsx)(se,{});let h=new Set(c.map(e=>e.slug)),C=e=>{if(e.startsWith(`/panduan/`)){let t=e.slice(re.length).split(/[/?#]/,1)[0];return u(t)?e:v.guides}if(s!==`ready`||!e.startsWith(`/template/`)||e.startsWith(`/template/kategori/`))return e;let t=e.slice(x.length).split(/[/?#]/,1)[0];return t&&!h.has(t)?v.catalog:e},T=te(o.author),E=ne().filter(e=>e.slug!==o.slug),D=[...o.related.map(e=>E.find(t=>t.slug===e)).filter(e=>e!==void 0),...E.filter(e=>!o.related.includes(e.slug))].slice(0,Se);return(0,Z.jsxs)(Z.Fragment,{children:[(0,Z.jsx)(b,{}),(0,Z.jsxs)(`main`,{id:`konten`,tabIndex:-1,className:`bg-canvas pt-nav focus:outline-none`,children:[(0,Z.jsxs)(`article`,{className:`relative`,children:[(0,Z.jsx)(`div`,{"aria-hidden":!0,className:`pointer-events-none absolute inset-x-0 top-0 h-[360px] bg-linear-to-b from-brand-50/80 to-transparent`}),(0,Z.jsx)(`div`,{className:`container-site relative pb-14 pt-5 sm:pb-20 sm:pt-8`,children:(0,Z.jsxs)(`div`,{className:`mx-auto max-w-[1160px]`,children:[(0,Z.jsx)(`nav`,{"aria-label":`Breadcrumb`,className:`min-w-0 text-[13px] text-subtle`,children:(0,Z.jsxs)(`ol`,{className:`flex min-w-0 items-center gap-1.5`,children:[(0,Z.jsx)(`li`,{className:`flex shrink-0 items-center`,children:(0,Z.jsx)(y,{to:v.home,className:`inline-flex min-h-10 items-center font-medium text-muted transition-colors hover:text-primary`,children:`Beranda`})}),(0,Z.jsxs)(`li`,{className:`flex shrink-0 items-center gap-1.5`,children:[(0,Z.jsx)(S,{className:`h-3.5 w-3.5 shrink-0`,"aria-hidden":!0}),(0,Z.jsx)(y,{to:v.guides,className:`inline-flex min-h-10 items-center font-medium text-muted transition-colors hover:text-primary`,children:`Panduan`})]}),(0,Z.jsxs)(`li`,{className:`flex min-w-0 items-center gap-1.5`,children:[(0,Z.jsx)(S,{className:`h-3.5 w-3.5 shrink-0`,"aria-hidden":!0}),(0,Z.jsx)(`span`,{className:`truncate`,"aria-current":`page`,children:o.title})]})]})}),(0,Z.jsxs)(`header`,{className:`mt-3 max-w-3xl sm:mt-5`,children:[(0,Z.jsxs)(`span`,{className:`badge-site`,children:[(0,Z.jsx)(w,{className:`h-3.5 w-3.5`,"aria-hidden":!0}),`Panduan`]}),(0,Z.jsx)(`h1`,{className:`mt-3 text-[26px] font-semibold leading-[1.18] tracking-[-0.02em] text-fg sm:text-4xl sm:leading-[1.12] xl:text-[44px]`,children:o.title}),(0,Z.jsxs)(`p`,{className:`mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-subtle sm:text-sm`,children:[(0,Z.jsxs)(`span`,{children:[`Oleh`,` `,(0,Z.jsx)(y,{to:T.path,className:`font-medium text-fg transition-colors hover:text-primary`,children:T.name})]}),(0,Z.jsx)(`span`,{"aria-hidden":!0,children:`·`}),(0,Z.jsx)(`span`,{children:(0,Z.jsx)(n,{article:o})}),(0,Z.jsx)(`span`,{"aria-hidden":!0,children:`·`}),(0,Z.jsxs)(`span`,{children:[m,` menit baca`]})]})]}),(0,Z.jsxs)(`div`,{className:`mt-6 grid gap-6 sm:mt-10 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-14 xl:gap-20`,children:[(0,Z.jsxs)(`details`,{className:`group card-flat px-2 py-1 lg:hidden`,children:[(0,Z.jsxs)(`summary`,{className:`flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3 text-sm font-semibold text-fg [&::-webkit-details-marker]:hidden`,children:[`Daftar isi`,(0,Z.jsx)(g,{className:`h-4 w-4 text-subtle transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none`,"aria-hidden":!0})]}),(0,Z.jsx)(`div`,{className:`pb-2`,children:(0,Z.jsx)($,{headings:p})})]}),(0,Z.jsxs)(`nav`,{"aria-label":`Daftar isi`,className:`hidden self-start lg:sticky lg:top-[calc(var(--nav-offset)+1.5rem)] lg:block`,children:[(0,Z.jsx)(`p`,{className:`eyebrow px-3`,children:`Daftar isi`}),(0,Z.jsx)(`div`,{className:`mt-3`,children:(0,Z.jsx)($,{headings:p})})]}),(0,Z.jsxs)(`div`,{className:`min-w-0 max-w-3xl`,children:[(0,Z.jsx)(xe,{markdown:f,resolveHref:C}),(0,Z.jsx)(t,{kind:o.cta,articleTitle:o.title}),(0,Z.jsx)(e,{author:T})]})]})]})})]}),D.length>0&&(0,Z.jsx)(`section`,{"aria-labelledby":`panduan-terkait`,className:`bg-alt py-12 sm:py-20`,children:(0,Z.jsx)(`div`,{className:`container-site`,children:(0,Z.jsxs)(`div`,{className:`mx-auto max-w-[1160px]`,children:[(0,Z.jsxs)(`div`,{className:`flex flex-wrap items-end justify-between gap-4`,children:[(0,Z.jsx)(`h2`,{id:`panduan-terkait`,className:`text-xl font-semibold tracking-[-0.02em] text-fg sm:text-[28px]`,children:`Panduan lainnya`}),(0,Z.jsx)(y,{to:v.guides,className:`link-site inline-flex min-h-10 items-center text-sm font-medium sm:text-[15px]`,children:`Semua panduan`})]}),(0,Z.jsx)(`div`,{className:`mt-6 sm:mt-8`,children:(0,Z.jsx)(r,{articles:D})})]})})})]}),(0,Z.jsx)(_,{})]})}export{Ce as default};