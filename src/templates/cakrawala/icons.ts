// Ikon garis Cakrawala dipilih otomatis dari judul/kode (kartu info, statistik, program keahlian, fasilitas, unit
// produksi, sertifikasi), jadi CMS tidak butuh kolom ikon. Kata kunci bahasa Indonesia + singkatan jurusan SMK/SMA;
// tanpa kecocokan → ikon cadangan berurutan. Dirender lewat <TitleIcon> (./ui).
import {
  Award,
  BadgeCheck,
  BookOpen,
  Briefcase,
  Building2,
  Calculator,
  CalendarDays,
  Car,
  ChefHat,
  ClipboardCheck,
  CodeXml,
  ConciergeBell,
  Factory,
  FlaskConical,
  Globe,
  GraduationCap,
  Landmark,
  Languages,
  Laptop,
  Library,
  Megaphone,
  Network,
  Palette,
  Presentation,
  School,
  Sparkles,
  Trophy,
  Users,
  UtensilsCrossed,
  Wrench,
} from 'lucide-react';
import type { ComponentType } from 'react';

/** Semua ikon yang bisa dipilih. */
export const ICONS = {
  register: ClipboardCheck,
  factory: Factory,
  career: Briefcase,
  students: Users,
  teacher: Presentation,
  trophy: Trophy,
  alumni: GraduationCap,
  award: Award,
  code: CodeXml,
  network: Network,
  design: Palette,
  accounting: Calculator,
  car: Car,
  hotel: ConciergeBell,
  kitchen: ChefHat,
  dining: UtensilsCrossed,
  lab: Laptop,
  workshop: Wrench,
  hall: Building2,
  library: Library,
  science: FlaskConical,
  social: Landmark,
  language: Languages,
  globe: Globe,
  book: BookOpen,
  certificate: BadgeCheck,
  calendar: CalendarDays,
  news: Megaphone,
  school: School,
  sparkles: Sparkles,
} as const satisfies Record<string, ComponentType<{ className?: string }>>;

export type IconKey = keyof typeof ICONS;

// Urutan penting: aturan yang lebih khusus di atas (mis. "Teknik Jaringan" → jaringan, bukan bengkel).
const RULES: [RegExp, IconKey][] = [
  [/ppdb|pendaftaran|daftar|penerimaan|spmb|formulir/i, 'register'],
  [/akreditasi|sertifika|kompetensi|lsp|bnsp|ukk/i, 'certificate'],
  [/teaching|tefa|produksi|industri|pabrik/i, 'factory'],
  [/bkk|bursa|lowongan|karier|karir|kerja/i, 'career'],
  [/alumni|lulusan|wisuda/i, 'alumni'],
  [/prestasi|juara|lomba|medali|piala/i, 'trophy'],
  [/guru|pengajar|instruktur|tenaga pendidik/i, 'teacher'],
  [/siswa|murid|peserta didik|pelajar/i, 'students'],
  [/\b(pplg|rpl|pengembangan perangkat lunak|perangkat lunak|gim|game|software|pemrograman|coding)\b/i, 'code'],
  [/\b(tjkt|tkj|jaringan|telekomunikasi|network|server)\b/i, 'network'],
  [/\b(dkv|mm|multimedia|desain|grafis|animasi|broadcast)\b/i, 'design'],
  [/\b(akl|akuntansi|keuangan|perbankan|pajak|otkp|mplb|perkantoran)\b/i, 'accounting'],
  [/\b(tkro|tbsm|tsm|otomotif|kendaraan|motor|mobil)\b/i, 'car'],
  [/\b(pht|perhotelan|hotel|front office|tata graha|pariwisata)\b/i, 'hotel'],
  [/\b(kuliner|tata boga|boga|roti|kafe|cafe|dapur)\b/i, 'kitchen'],
  [/restoran|tata hidangan|kantin/i, 'dining'],
  [/\b(mipa|ipa|sains|biologi|kimia|fisika)\b/i, 'science'],
  [/\b(ips|sosial|ekonomi|sejarah|geografi)\b/i, 'social'],
  [/bahasa|english|inggris|jepang|mandarin/i, 'language'],
  [/lab|komputer|digital|studio/i, 'lab'],
  [/bengkel|las|mesin|teknik|workshop/i, 'workshop'],
  [/aula|gedung|ruang|kampus|masjid|musala/i, 'hall'],
  [/perpustakaan|literasi|buku/i, 'library'],
  [/internasional|global|mitra/i, 'globe'],
  [/agenda|jadwal|kalender/i, 'calendar'],
  [/berita|pengumuman|info/i, 'news'],
  [/kurikulum|pelajaran|kelas|belajar/i, 'book'],
  [/sekolah|smk|sma/i, 'school'],
];

const FALLBACK: IconKey[] = ['school', 'book', 'award', 'sparkles', 'globe', 'certificate'];

/** Kunci ikon untuk teks `title` (judul, kode, atau gabungan); tanpa kata kunci yang cocok → ikon cadangan ke-`index`. */
export function iconKey(title: string, index = 0): IconKey {
  const match = RULES.find(([pattern]) => pattern.test(title || ''));
  return match ? match[1] : FALLBACK[Math.abs(Math.floor(index)) % FALLBACK.length];
}
