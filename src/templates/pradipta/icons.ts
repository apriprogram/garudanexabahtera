// Ikon garis Pradipta. Label section memakai ikon tetap per kunci section; ubin akses cepat, nilai sekolah, kartu
// ekstrakurikuler, dan kartu fasilitas memilih ikon otomatis dari teks (kata kunci khas sekolah), jadi CMS tidak butuh
// kolom ikon. Tanpa kecocokan → ikon cadangan berurutan. Dirender lewat <TitleIcon> / <SectionTag> (./ui).
import {
  BadgeCheck,
  BookOpen,
  Brain,
  Building2,
  CalendarDays,
  ChartNoAxesColumn,
  CircleHelp,
  ClipboardCheck,
  Compass,
  FileCheck,
  Flag,
  FlaskConical,
  GraduationCap,
  HandHeart,
  HeartPulse,
  Images,
  Languages,
  Laptop,
  Library,
  Lightbulb,
  MapPin,
  Megaphone,
  MessageSquareQuote,
  MessagesSquare,
  Music,
  Newspaper,
  Palette,
  Phone,
  Quote,
  School,
  Sparkles,
  Tent,
  Trophy,
  Users,
  UsersRound,
  Volleyball,
  type LucideIcon,
} from 'lucide-react';

/** Ikon label section per kunci section. */
export const SECTION_ICONS: Record<string, LucideIcon> = {
  stats: ChartNoAxesColumn,
  about: School,
  welcome: Quote,
  programs: BookOpen,
  studentlife: Sparkles,
  achievements: Trophy,
  facilities: Building2,
  news: Newspaper,
  announcements: Megaphone,
  agenda: CalendarDays,
  teachers: Users,
  spmb: ClipboardCheck,
  testimonials: MessageSquareQuote,
  gallery: Images,
  faq: CircleHelp,
  contact: MapPin,
};

/** Semua ikon yang bisa dipilih dari teks. */
export const ICONS = {
  register: ClipboardCheck,
  news: Newspaper,
  notice: Megaphone,
  calendar: CalendarDays,
  contact: Phone,
  library: Library,
  elearning: Laptop,
  document: FileCheck,
  certificate: BadgeCheck,
  alumni: GraduationCap,
  faith: HandHeart,
  flag: Flag,
  mind: Brain,
  idea: Lightbulb,
  team: UsersRound,
  compass: Compass,
  health: HeartPulse,
  talk: MessagesSquare,
  scout: Tent,
  science: FlaskConical,
  language: Languages,
  art: Palette,
  music: Music,
  sport: Volleyball,
  trophy: Trophy,
  school: School,
  sparkles: Sparkles,
  book: BookOpen,
} as const satisfies Record<string, LucideIcon>;

export type IconKey = keyof typeof ICONS;

// Urutan penting: aturan yang lebih khusus di atas (mis. "Pengumuman" sebelum "info", "Paskibra" sebelum "upacara").
const RULES: [RegExp, IconKey][] = [
  [/spmb|ppdb|pendaftaran|daftar|penerimaan|murid baru|siswa baru/i, 'register'],
  [/pengumuman|edaran/i, 'notice'],
  [/berita|kabar/i, 'news'],
  [/agenda|kalender|jadwal|kegiatan/i, 'calendar'],
  [/perpustakaan|pustaka|literasi/i, 'library'],
  // Sebelum aturan laboratorium: "Laboratorium Komputer" berikon laptop, bukan labu
  [/e-?learning|daring|online|lms|komputer|informatika|\btik\b/i, 'elearning'],
  [/ppid|informasi publik|dokumen/i, 'document'],
  [/legalisir|ijazah|sertifika/i, 'certificate'],
  [/alumni|tracer|lulusan/i, 'alumni'],
  [/kontak|layanan|hubungi|alamat|telepon|whatsapp/i, 'contact'],
  [/iman|takwa|ibadah|rohis|kerohanian|agama/i, 'faith'],
  [/paskibra|upacara|kewargaan|bangsa|kebangsaan/i, 'flag'],
  [/penalaran|kritis|nalar/i, 'mind'],
  [/kreativ|inovasi|\bide\b|gagasan/i, 'idea'],
  [/kolaborasi|kerja sama|gotong/i, 'team'],
  [/mandiri/i, 'compass'],
  [/kesehatan|sehat|pmr|uks|bugar/i, 'health'],
  [/komunikasi|debat|pidato|english|bahasa inggris/i, 'talk'],
  [/pramuka|kemah|perkemahan/i, 'scout'],
  [/\bkir\b|ilmiah|sains|olimpiade|laboratorium|robot/i, 'science'],
  [/bahasa|sastra/i, 'language'],
  [/karawitan|musik|paduan suara|band|gamelan|angklung/i, 'music'],
  [/seni|tari|sanggar|budaya|lukis|teater/i, 'art'],
  [/olahraga|voli|futsal|sepak|basket|atletik|bulu tangkis|bola/i, 'sport'],
  [/prestasi|juara|lomba/i, 'trophy'],
];

const FALLBACK: IconKey[] = ['school', 'sparkles', 'book', 'idea', 'team', 'compass'];

/** Kunci ikon untuk teks `title`; tanpa kata kunci yang cocok → ikon cadangan ke-`index`. */
export function iconKey(title: string, index = 0): IconKey {
  const match = RULES.find(([pattern]) => pattern.test(title || ''));
  return match ? match[1] : FALLBACK[Math.abs(Math.floor(index)) % FALLBACK.length];
}
