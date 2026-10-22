// Registry foto demo Arena Club (Lintang Padel & Tenis Club, fiktif). Semua foto asli dari Unsplash (Unsplash
// License), WebP, kredit di public/assets/templates/photos/CREDITS.md (section "Arena Club").
//
// Konvensi file (kit/photos.ts):
//   suasana → `<kunci>-<lebar>.webp` + `<kunci>-800.webp` (lebar 1600; foto tegak 4:5 memakai 1200)
//   potret  → `<kunci>-<lebar>.webp` + `<kunci>-240.webp`
// Potret pelatih sengaja 4:5 (960×1200 + 240×300): kartu pelatih memakai varian besar, avatar bertumpuk di hero
// memakai varian 240 sehingga tidak mengunduh foto besar untuk lingkaran 36px.
import { definePhotos } from '../kit/photos';

export const ARENA_PHOTOS = definePhotos({
  scenes: [
    ['arena-club-hero', 1600, 900, 'Pemain tenis melompat melakukan servis di lapangan biru di bawah langit cerah'],
    ['arena-club-coach-lesson', 1200, 1500, 'Pemain mengangkat raket padel di lapangan biru'],
    ['arena-club-serve', 1200, 1500, 'Pemain tenis melempar bola untuk servis'],
    ['arena-club-private', 1200, 1500, 'Pemain muda memukul backhand di lapangan tenis'],
    ['arena-club-balls', 1600, 1067, 'Dua raket padel dan bola kuning di atas lapangan biru'],
    ['arena-club-junior', 1200, 1500, 'Anak berkacamata hitam berlatih memukul bola tenis'],
    ['arena-club-match', 1600, 1067, 'Pertandingan tenis di lapangan biru dengan wasit kursi'],
    ['arena-club-night', 1600, 900, 'Lapangan tenis outdoor di malam hari dengan lampu sorot'],
    ['arena-club-gym', 1600, 900, 'Member berlatih angkat beban didampingi pelatih'],
    ['arena-club-court', 1600, 1067, 'Lapangan biru outdoor dikelilingi pepohonan di bawah langit cerah'],
  ],
  portraits: [
    ['arena-club-coach-1', 960, 1200, 'Potret pelatih pria berkaus olahraga biru tersenyum'],
    ['arena-club-coach-2', 960, 1200, 'Potret pelatih wanita berkaus polo tersenyum'],
    ['arena-club-coach-3', 960, 1200, 'Potret pelatih pria berkaus abu-abu'],
    ['arena-club-coach-4', 960, 1200, 'Potret pelatih kebugaran wanita berpakaian olahraga'],
    ['arena-club-portrait-1', 480, 480, 'Potret member pria tersenyum'],
    ['arena-club-portrait-2', 480, 480, 'Potret member wanita tersenyum'],
    ['arena-club-portrait-3', 480, 480, 'Potret wanita tersenyum'],
  ],
});

/** Path foto demo untuk defaultContent, mis. `arenaPhoto('hero')` → `/assets/templates/photos/arena-club-hero-1600.webp`. */
export const arenaPhoto = (name: string): string => ARENA_PHOTOS.src(`arena-club-${name}`);
