// Ikon Serenity dipilih otomatis dari judul (fitur hero, kelas, kartu kaca), jadi CMS tidak butuh kolom ikon.
// Kata kunci bahasa Indonesia + Inggris; tanpa kecocokan → ikon cadangan berurutan. Dirender lewat <TitleIcon> (./ui).
import {
  AudioLines,
  Flower2,
  Heart,
  Leaf,
  MessageCircleHeart,
  Moon,
  Mountain,
  NotebookPen,
  PersonStanding,
  Sparkles,
  Sprout,
  Sun,
  Users,
  Wind,
  type LucideIcon,
} from 'lucide-react';

/** Semua ikon yang bisa dipilih. */
export const ICONS = {
  meditation: Flower2,
  yoga: PersonStanding,
  breath: Wind,
  journal: NotebookPen,
  heart: Heart,
  growth: Sprout,
  sleep: Moon,
  retreat: Mountain,
  sound: AudioLines,
  talk: MessageCircleHeart,
  community: Users,
  sun: Sun,
  leaf: Leaf,
  sparkles: Sparkles,
} as const satisfies Record<string, LucideIcon>;

export type IconKey = keyof typeof ICONS;

const RULES: [RegExp, IconKey][] = [
  // Jenis kelas yoga dulu (sebelum kata "yoga" umum)
  [/hatha|dasar|fondasi/i, 'sun'],
  [/vinyasa|flow|mengalir/i, 'breath'],
  [/\byin\b|restoratif|savasana/i, 'sleep'],
  [/privat|personal|pribadi/i, 'heart'],
  [/pemula|pengenalan|basic/i, 'growth'],
  [/retret|retreat|alam|gunung|bukit|camp/i, 'retreat'],
  [/medita|hening|zen|mindful|sadar|tenang/i, 'meditation'],
  [/yoga|pilates|gerak|peregangan|stretch/i, 'yoga'],
  [/napas|nafas|pernapasan|breath/i, 'breath'],
  [/jurnal|journal|menulis|tulis|refleksi/i, 'journal'],
  [/hati|mood|perasaan|emosi|syukur|cinta/i, 'heart'],
  [/tumbuh|growth|berkembang/i, 'growth'],
  [/tidur|sleep|malam|istirahat/i, 'sleep'],
  [/suara|sound|musik|music|gong|mangkuk/i, 'sound'],
  [/konsel|curhat|cerita|bicara|dengar|pendamping|konsultasi/i, 'talk'],
  [/komunitas|kelompok|grup|teman|keluarga/i, 'community'],
  [/pagi|matahari|sunrise|energi/i, 'sun'],
  [/herbal|teh\b|daun|alami|organik/i, 'leaf'],
];

const FALLBACK: IconKey[] = ['yoga', 'sun', 'heart', 'sparkles', 'leaf', 'meditation'];

/** Kunci ikon untuk judul `title`; tanpa kata kunci yang cocok → ikon cadangan ke-`index`. */
export function iconKey(title: string, index = 0): IconKey {
  const match = RULES.find(([pattern]) => pattern.test(title || ''));
  return match ? match[1] : FALLBACK[Math.abs(Math.floor(index)) % FALLBACK.length];
}
