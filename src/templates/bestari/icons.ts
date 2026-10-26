// Ikon garis Bestari dipilih otomatis dari teks (kartu sorotan, lencana, angka sekolah, program), jadi CMS tidak butuh
// kolom ikon. Kata kunci bahasa Indonesia khas sekolah (SMA, juga SD/SMP); tanpa kecocokan → ikon cadangan berurutan. Dirender lewat
// <TitleIcon> (./ui).
import {
  Award,
  BadgeCheck,
  BookOpenText,
  Bot,
  Bus,
  CalendarDays,
  ClipboardCheck,
  FlaskConical,
  GraduationCap,
  HeartHandshake,
  Languages,
  Leaf,
  Megaphone,
  Music,
  Palette,
  Presentation,
  School,
  ShieldCheck,
  Sparkles,
  Tent,
  Trophy,
  Users,
  Utensils,
  Volleyball,
} from 'lucide-react';
import type { ComponentType } from 'react';

/** Semua ikon yang bisa dipilih. */
export const ICONS = {
  register: ClipboardCheck,
  certificate: BadgeCheck,
  leaf: Leaf,
  heart: HeartHandshake,
  shield: ShieldCheck,
  book: BookOpenText,
  language: Languages,
  robot: Bot,
  science: FlaskConical,
  art: Palette,
  music: Music,
  scout: Tent,
  sport: Volleyball,
  trophy: Trophy,
  alumni: GraduationCap,
  teacher: Presentation,
  students: Users,
  calendar: CalendarDays,
  news: Megaphone,
  meal: Utensils,
  bus: Bus,
  school: School,
  sparkles: Sparkles,
  award: Award,
} as const satisfies Record<string, ComponentType<{ className?: string }>>;

export type IconKey = keyof typeof ICONS;

// Urutan penting: aturan yang lebih khusus di atas (mis. "Kelas bilingual" → bahasa, bukan kelas).
const RULES: [RegExp, IconKey][] = [
  [/ppdb|spmb|pendaftaran|daftar|penerimaan|formulir|murid baru|siswa baru/i, 'register'],
  [/akreditasi|sertifika|terakreditasi/i, 'certificate'],
  [/adiwiyata|lingkungan|hijau|kebun|tanam/i, 'leaf'],
  [/ramah anak|perundungan|aman/i, 'shield'],
  [/karakter|peduli|santun|akhlak/i, 'heart'],
  [/robot|koding|coding|komputer|digital/i, 'robot'],
  [/sains|ipa|percobaan|eksperimen|stem|lab/i, 'science'],
  [/debat|pidato|jurnalistik|public speaking/i, 'news'],
  [/bilingual|bahasa|inggris|english/i, 'language'],
  [/literasi|baca|buku|perpustakaan|kurikulum/i, 'book'],
  [/karawitan|musik|paduan suara|angklung|marching band|drum band/i, 'music'],
  [/seni|tari|budaya|lukis/i, 'art'],
  [/pramuka|kemah|outbound/i, 'scout'],
  [/olahraga|renang|futsal|sepak|atletik|basket|voli/i, 'sport'],
  [/prestasi|juara|lomba|medali|olimpiade/i, 'trophy'],
  [/alumni|lulusan|wisuda|kuliah|kampus|ptn|perguruan tinggi/i, 'alumni'],
  [/guru|pengajar|wali kelas|staf/i, 'teacher'],
  [/murid|siswa|anak|peserta didik/i, 'students'],
  [/agenda|jadwal|open house|kunjungan/i, 'calendar'],
  [/berita|pengumuman|info/i, 'news'],
  [/makan|gizi|kantin/i, 'meal'],
  [/antar|jemput/i, 'bus'],
  [/ekstrakurikuler|ekskul/i, 'sparkles'],
  [/kelas|rombel|sekolah/i, 'school'],
];

const FALLBACK: IconKey[] = ['school', 'book', 'award', 'sparkles', 'heart', 'certificate'];

/** Kunci ikon untuk teks `title`; tanpa kata kunci yang cocok → ikon cadangan ke-`index`. */
export function iconKey(title: string, index = 0): IconKey {
  const match = RULES.find(([pattern]) => pattern.test(title || ''));
  return match ? match[1] : FALLBACK[Math.abs(Math.floor(index)) % FALLBACK.length];
}
