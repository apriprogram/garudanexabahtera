// Registry foto demo Madani (SMA IT Nurul Azka, fiktif). Semua foto asli dari Unsplash (Unsplash License, bukan
// Unsplash+), WebP, kredit di public/assets/templates/photos/CREDITS.md (section "Madani"). Siswi di foto berjilbab dan
// siswa berpakaian sopan; foto dipilih tanpa logo merek yang terbaca.
//
// Konvensi file (kit/photos.ts):
//   suasana → `<kunci>-<lebar>.webp` + `<kunci>-800.webp` (slide hero 1920×1200 agar tajam sebagai latar penuh;
//             profil, sambutan & wisuda 4:5 1200×1500; program, berita, fasilitas, galeri 4:3 1200×900)
//   potret  → `<kunci>-480.webp` + `<kunci>-240.webp`
import { definePhotos } from '../kit/photos';

export const MADANI_PHOTOS = definePhotos({
  scenes: [
    ['madani-hero', 1920, 1200, 'Tiga siswi berjilbab putih membaca buku bersama di taman sekolah'],
    ['madani-slide-kampus', 1920, 1200, 'Gedung sekolah tiga lantai berwarna kuning dengan lapangan olahraga hijau di bawah langit berawan'],
    ['madani-slide-kajian', 1920, 1200, 'Siswa berkemeja putih dan berpeci duduk bersila mengikuti kajian di aula masjid sekolah'],
    ['madani-slide-santri', 1920, 1200, 'Dua siswa berpeci dan bersarung membaca buku bersama di pagar halaman asrama'],
    ['madani-profil', 1200, 1500, 'Tiga siswi berjilbab putih berdiskusi sambil membaca brosur di teras sekolah'],
    ['madani-sambutan', 1200, 1500, 'Guru perempuan berjilbab dan berkebaya hijau tersenyum di depan papan tulis kelas'],
    ['madani-tahfidz', 1200, 900, 'Siswi berjilbab membaca Al-Qur’an di atas rehal kayu dalam halaqah tahfidz'],
    ['madani-olimpiade', 1200, 900, 'Siswa berseragam batik mengerjakan soal tertulis di ruang kelas'],
    ['madani-bilingual', 1200, 900, 'Tiga siswi berjilbab tersenyum duduk bersama di ruang kelas'],
    ['madani-karakter', 1200, 900, 'Pemateri berpeci menyampaikan kajian di depan para siswa yang duduk di masjid'],
    ['madani-asrama', 1200, 900, 'Rombongan siswa putra berbaju koko putih dan bersarung berjalan di lingkungan asrama'],
    ['madani-digital', 1200, 900, 'Siswi berjilbab belajar pemrograman di depan komputer laboratorium'],
    ['madani-berita-olimpiade', 1200, 900, 'Barisan siswi berjilbab putih menulis jawaban soal lomba di aula'],
    ['madani-berita-wisuda', 1200, 900, 'Siswi berjilbab merah muda berselempang wisuda tersenyum di kursi acara'],
    ['madani-berita-ramadan', 1200, 900, 'Siswa berpeci membaca Al-Qur’an di atas rehal di dalam masjid berkarpet'],
    ['madani-lab', 1200, 900, 'Laboratorium IPA sekolah dengan meja praktikum keramik putih dan kursi kayu'],
    ['madani-galeri-lapangan', 1200, 900, 'Pemandangan dari atas gedung sekolah dengan lapangan futsal dan basket di tengahnya'],
    ['madani-galeri-perpustakaan', 1200, 900, 'Empat siswi berjilbab duduk bersama di perpustakaan sekolah'],
    ['madani-galeri-pramuka', 1200, 900, 'Barisan siswi pramuka berjilbab cokelat dengan setangan leher merah putih'],
    ['madani-galeri-paskibra', 1200, 900, 'Siswi petugas upacara berjilbab dan berpeci hitam bersiap membaca teks'],
    ['madani-galeri-wisuda', 1200, 1500, 'Siswi berjilbab memakai toga wisuda tersenyum di halaman kampus'],
    ['madani-galeri-acara', 1200, 900, 'Siswi berjilbab krem menoleh tersenyum di aula saat acara kajian muslimah'],
  ],
  portraits: [
    ['madani-portrait-1', 480, 480, 'Potret perempuan muda berjilbab putih tersenyum'],
    ['madani-portrait-2', 480, 480, 'Potret pemuda berkemeja batik membawa ransel'],
    ['madani-portrait-3', 480, 480, 'Potret perempuan muda berjilbab cokelat tertawa'],
  ],
});

/** Path foto demo untuk defaultContent, mis. `madaniPhoto('hero')` → `/assets/templates/photos/madani-hero-1920.webp`. */
export const madaniPhoto = (name: string): string => MADANI_PHOTOS.src(`madani-${name}`);
