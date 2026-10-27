// Gaya halaman tulisan (daftar, artikel, tidak ditemukan) per template: kelas Tailwind dari token template itu (warna
// tema, warna teks, radius, tombol). Template cukup mengisi bagian yang berbeda dari bawaan (lihat ./index.ts).
import { FONT_DISPLAY } from '../layout';

export interface PostTheme {
  /** Huruf judul (H1/H2/judul kartu): font + ketebalan */
  display: string;
  /** Warna judul */
  heading: string;
  /** Warna teks isi artikel */
  body: string;
  /** Warna teks sekunder (tanggal, ringkasan, remah roti) */
  muted: string;
  /** Teks/tautan warna tema di latar putih (≥ 4,5:1) */
  accent: string;
  /** Chip kategori / label pengumuman biasa */
  chip: string;
  /** Label pengumuman mendesak ("Penting", "Wajib") */
  urgent: string;
  /** Label pengumuman kewajiban ("Wajib", "Batas waktu") di section profesional: kuning tanah, beda dari "Penting" */
  warn: string;
  /** Tombol filter kategori/label yang dipilih (aria-pressed) */
  filterOn: string;
  /** Tombol filter yang tidak dipilih (lengkap dengan hover) */
  filterOff: string;
  /** Bidang lembut: ubin tanggal, kartu tanpa foto, kerangka memuat, bingkai foto artikel */
  soft: string;
  /** Kartu putih bergaris tipis (baris pengumuman) */
  card: string;
  /** Garis pemisah (dipakai dengan border-t) */
  line: string;
  /** Radius kartu & panel */
  radius: string;
  /** Radius foto */
  photoRadius: string;
  /** Tombol pil utama (warna tema), lengkap dengan tinggi & jarak */
  button: string;
  /** Tombol pil bergaris (aksi kedua) */
  buttonGhost: string;
}

/** Bawaan netral dari variabel aksen TemplateShell (--tpl-accent*). */
export const DEFAULT_POST_THEME: PostTheme = {
  display: `${FONT_DISPLAY} font-semibold`,
  heading: 'text-fg',
  body: 'text-[#3A3F4B]',
  muted: 'text-[#5B6170]',
  accent: 'text-(--tpl-accent-ink)',
  chip: 'bg-(--tpl-accent-50) text-(--tpl-accent-ink)',
  urgent: 'bg-[#FEECEB] text-[#B42318]',
  warn: 'bg-[#FEF3E2] text-[#93370D]',
  filterOn: 'bg-(--tpl-accent) text-(--tpl-on-accent)',
  filterOff: 'bg-[#F4F5F7] text-fg hover:bg-[#E9EBEF]',
  soft: 'bg-[#F4F5F7]',
  card: 'bg-white ring-1 ring-inset ring-black/[0.07]',
  line: 'border-black/[0.08]',
  radius: 'rounded-[20px]',
  photoRadius: 'rounded-[20px]',
  button:
    'inline-flex h-11 items-center justify-center gap-2 rounded-full bg-(--tpl-accent) px-5 text-[14px] font-semibold text-(--tpl-on-accent) transition-colors hover:bg-(--tpl-accent-hover)',
  buttonGhost:
    'inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-[14px] font-semibold text-fg ring-1 ring-inset ring-black/[0.12] transition-colors hover:bg-black/[0.04]',
};

/** Tema lengkap: bawaan + isian template. */
export const postTheme = (overrides: Partial<PostTheme> = {}): PostTheme => ({ ...DEFAULT_POST_THEME, ...overrides });
