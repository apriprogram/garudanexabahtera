// Ikon Madani dipilih otomatis dari judul (strip info, fasilitas, statistik), jadi CMS tidak butuh kolom ikon.
// Kata kunci bahasa Indonesia + Inggris; tanpa kecocokan → ikon cadangan berurutan. Dirender lewat <TitleIcon> (./ui).
import {
  Award,
  BedDouble,
  BookMarked,
  BookOpenText,
  Bus,
  Cpu,
  FlaskConical,
  GraduationCap,
  HeartHandshake,
  HeartPulse,
  Languages,
  Library,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Utensils,
  Volleyball,
  type LucideIcon,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { MosqueIcon } from './marks';

type IconComponent = LucideIcon | ComponentType<{ className?: string }>;

/** Semua ikon yang bisa dipilih. */
export const ICONS = {
  award: Award,
  curriculum: BookOpenText,
  quran: BookMarked,
  boarding: BedDouble,
  mosque: MosqueIcon,
  science: FlaskConical,
  computer: Cpu,
  library: Library,
  sport: Volleyball,
  health: HeartPulse,
  food: Utensils,
  bus: Bus,
  language: Languages,
  character: HeartHandshake,
  trophy: Trophy,
  teacher: Users,
  student: GraduationCap,
  safe: ShieldCheck,
  sparkles: Sparkles,
} as const satisfies Record<string, IconComponent>;

export type IconKey = keyof typeof ICONS;

/** Kata kunci (huruf kecil) → ikon. Urutan penting: yang lebih spesifik di atas. */
const RULES: [RegExp, IconKey][] = [
  [/akreditasi|unggul|sertifik|award/, 'award'],
  [/masjid|musala|mushola|ibadah|mosque/, 'mosque'],
  [/tahfi[dz]|qur|hafal|tilawah|quran/, 'quran'],
  [/asrama|boarding|pondok|kamar|dorm/, 'boarding'],
  [/komputer|coding|robot|digital|teknologi|computer/, 'computer'],
  [/lab|sains|ipa|olimpiade|science/, 'science'],
  [/perpustaka|pustaka|library|buku/, 'library'],
  [/kurikulum|diniyah|kelas|curriculum/, 'curriculum'],
  [/lapangan|olahraga|futsal|basket|voli|sport/, 'sport'],
  [/klinik|uks|kesehatan|health/, 'health'],
  [/kantin|makan|catering|gizi/, 'food'],
  [/antar|jemput|bus|transport/, 'bus'],
  [/bahasa|bilingual|arab|inggris|english|language/, 'language'],
  [/adab|karakter|akhlak|pembinaan|kepemimpinan|character/, 'character'],
  [/prestasi|juara|medali|trophy/, 'trophy'],
  [/guru|musyrif|pengajar|teacher|ustadz/, 'teacher'],
  [/siswa|alumni|lulusan|student/, 'student'],
  [/aman|cctv|keamanan|safe/, 'safe'],
];

const FALLBACK: IconKey[] = ['sparkles', 'award', 'curriculum', 'character'];

/** Ikon dari judul; tanpa kecocokan → ikon cadangan ke-`index`. */
export function iconKey(title: string, index = 0): IconKey {
  const value = (title || '').toLowerCase();
  for (const [pattern, key] of RULES) if (pattern.test(value)) return key;
  return FALLBACK[Math.abs(index) % FALLBACK.length];
}
