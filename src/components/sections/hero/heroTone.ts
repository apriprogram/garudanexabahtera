// Kelas teks hero per nada, dipakai HeroIntro dan pratinjau admin (Pengaturan website → Hero → "Latar hero").
// Warna di sini HARUS sama dengan peran teks di heroContrast.ts (yang menghitung kontrasnya).
import type { HeroTone } from './heroContrast';

/** Latar bawaan (kanvas titik) = tampilan hari ini; media + nada gelap/terang = teks di atas gambar/video (lapisan admin bila ada). */
export type HeroTextLook = 'default' | HeroTone;

export interface HeroToneClasses {
  /** Warna judul (kata pertama) */
  title: string;
  /** Kata aksen judul */
  accent: string;
  /** Teks poin checklist */
  point: string;
  /** Lingkaran ikon centang poin */
  check: string;
  /** Wadah pill toggle Template / Custom (gaya Dribbble: jalur abu tipis, tanpa garis) */
  toggle: string;
  /** Label toggle yang tidak terpilih */
  toggleIdle: string;
  /** Label toggle yang terpilih (di atas pill putih bergaris tipis) */
  toggleActive: string;
  /** Tombol kedua (garis tanpa latar) */
  secondary: string;
  /** Keterangan kecil di tombol kedua ("· nama template") */
  note: string;
}

const DEFAULT_LOOK: HeroToneClasses = {
  title: 'text-fg',
  accent: 'text-primary',
  point: 'text-muted',
  check: 'bg-brand-50 text-primary',
  // Jalur putih tembus pandang secukupnya (permintaan pemilik 2026-10-23): gambar sedikit terlihat, label tetap terbaca
  // walau toggle jatuh di atas pita biru gambar
  toggle: 'bg-surface/60',
  toggleIdle: 'text-muted hover:text-fg',
  toggleActive: 'text-fg',
  secondary: 'btn-outline-clear',
  note: 'text-subtle',
};

export const HERO_TONE_CLASSES: Record<HeroTextLook, HeroToneClasses> = {
  default: DEFAULT_LOOK,
  // Teks gelap di atas gambar/video terang: sama dengan bawaan, keterangan kecil memakai muted (subtle baru 4,5:1 di
  // latar hampir putih)
  dark: { ...DEFAULT_LOOK, note: 'text-muted' },
  // Teks terang di atas gambar/video gelap: putih, aksen brand-200, jalur toggle obsidian 70% (kontras sendiri, tidak
  // bergantung gambar), pill terpilih tetap putih. Datar: tanpa bayangan teks / pendar (permintaan pemilik 2026-10-23)
  light: {
    title: 'text-on-media',
    accent: 'text-on-media-accent',
    point: 'text-on-media-muted',
    check: 'bg-primary text-white',
    toggle: 'bg-fg/70',
    toggleIdle: 'text-on-media-muted hover:text-on-media',
    toggleActive: 'text-fg',
    secondary: 'btn-outline-on-media',
    note: 'text-on-media-muted',
  },
};
