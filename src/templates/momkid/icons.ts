// Nama ilustrasi MomKid (doodle garis + bidang pastel, digambar di ./art.tsx) dan aturan memilihnya otomatis, jadi CMS
// tidak butuh kolom ikon. Tab perjalanan memakai kata kunci (Indonesia) dari nama tahap; daftar lain (layanan laktasi,
// baris kontak) memakai urutan tetap. Aturan pertama yang cocok menang.

export const DOODLES = [
  'heart',
  'star',
  'moon',
  'sparkle',
  'stroller',
  'bottle',
  'footprints',
  'swaddle',
  'rattle',
  'drop',
  'shield',
  'stethoscope',
  'bed',
  'book',
  'pin',
  'phone',
  'clock',
  'chat',
  'mail',
  'calendar',
] as const;

export type DoodleName = (typeof DOODLES)[number];

// Urutan penting: aturan yang lebih khusus di atas ("dokter anak" → stetoskop, bukan tumbuh kembang).
const RULES: [RegExp, DoodleName][] = [
  [/imunisasi|vaksin/i, 'shield'],
  [/dokter|konsultasi|periksa|cek/i, 'stethoscope'],
  [/laktasi|menyusui|\basi\b/i, 'drop'],
  [/mpasi|makan|gizi|nutrisi|susu/i, 'bottle'],
  [/hamil|kandungan|usg|bumil|trimester|prenatal/i, 'heart'],
  [/salin|lahir|caesar|sesar|newborn|bayi/i, 'swaddle'],
  [/tumbuh|kembang|balita|anak|main/i, 'footprints'],
  [/kamar|ruang|rawat|tur/i, 'bed'],
  [/kelas|senam|yoga/i, 'star'],
  [/artikel|baca|blog/i, 'book'],
];

const STAGE_FALLBACK: DoodleName[] = ['heart', 'swaddle', 'footprints', 'star'];

/** Doodle tab tahap dari namanya; tanpa kata kunci → urutan bawaan (hati, bayi, jejak kaki, bintang). */
export function stageDoodle(name: string, index: number): DoodleName {
  return RULES.find(([pattern]) => pattern.test(name || ''))?.[1] ?? STAGE_FALLBACK[index % STAGE_FALLBACK.length];
}

const ROTATION: DoodleName[] = ['drop', 'heart', 'bottle', 'moon', 'star', 'rattle'];

/** Doodle bergiliran untuk daftar tanpa kata kunci (layanan laktasi). */
export const rotateDoodle = (index: number): DoodleName => ROTATION[index % ROTATION.length];
