// Ikon ubin Sewa & coaching dipilih otomatis dari nama item, jadi CMS tidak butuh kolom ikon. Kata kunci berbahasa
// Indonesia (dan istilah Inggris yang lazim); aturan pertama yang cocok menang, tanpa kecocokan → tas. Raket & bola
// memakai simbol garis milik template (./marks), lainnya lucide. Dirender lewat <RentalIcon> (./ui).

/** Semua kunci ikon yang bisa dipilih. */
export const ICON_KEYS = ['racket', 'ball', 'shoe', 'coach', 'class', 'shirt', 'drink', 'bag'] as const;

export type IconKey = (typeof ICON_KEYS)[number];

// Urutan penting: aturan yang lebih khusus di atas ("kelas pemula" sebelum "pelatih"; "sepatu padel", "bola padel" sebelum "raket/padel").
const RULES: [RegExp, IconKey][] = [
  [/kelas|class|klinik|clinic|grup|group|akademi/i, 'class'],
  [/coach|pelatih|privat|private|latihan|training/i, 'coach'],
  [/sepatu|shoe|sneaker/i, 'shoe'],
  [/kaus|jersey|baju|handuk|towel/i, 'shirt'],
  [/minum|air|drink|isotonik/i, 'drink'],
  [/bola|ball|tabung/i, 'ball'],
  [/raket|racket|paddle|padel/i, 'racket'],
];

/** Kunci ikon untuk nama item sewa; tanpa kata kunci yang cocok → tas. */
export function iconKey(name: string): IconKey {
  return RULES.find(([pattern]) => pattern.test(name || ''))?.[1] ?? 'bag';
}
