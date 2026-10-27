// Ikon garis Jumantara dipilih otomatis dari teks (layanan cepat, kelompok mapel, ekstrakurikuler), jadi CMS tidak
// butuh kolom ikon. Kata kunci bahasa Indonesia khas SMA; tanpa kecocokan → ikon cadangan berurutan. Dirender lewat
// <TitleIcon> (./ui).
import {
  Atom,
  BookOpen,
  CalendarDays,
  Drama,
  Earth,
  FileSearch,
  Flag,
  FlaskConical,
  GraduationCap,
  HandHeart,
  HeartPulse,
  Languages,
  Library,
  MessageSquareWarning,
  MessagesSquare,
  MonitorPlay,
  Newspaper,
  Route,
  Sprout,
  Stamp,
  Tent,
  Trophy,
  UserPlus,
  Volleyball,
} from 'lucide-react';
import type { ComponentType } from 'react';

/** Semua ikon yang bisa dipilih. */
export const ICONS = {
  elearning: MonitorPlay,
  library: Library,
  ppid: FileSearch,
  stamp: Stamp,
  tracer: Route,
  report: MessageSquareWarning,
  register: UserPlus,
  calendar: CalendarDays,
  scout: Tent,
  flag: Flag,
  health: HeartPulse,
  art: Drama,
  science: FlaskConical,
  faith: HandHeart,
  sport: Volleyball,
  debate: MessagesSquare,
  language: Languages,
  social: Earth,
  project: Sprout,
  atom: Atom,
  news: Newspaper,
  trophy: Trophy,
  book: BookOpen,
  school: GraduationCap,
} as const satisfies Record<string, ComponentType<{ className?: string }>>;

export type IconKey = keyof typeof ICONS;

// Urutan penting: aturan yang lebih khusus di atas (mis. "Perpustakaan Digital" → perpustakaan, bukan digital).
const RULES: [RegExp, IconKey][] = [
  [/e-?learning|kelas daring|\blms\b/i, 'elearning'],
  [/perpustakaan|e-?book|pustaka|literasi/i, 'library'],
  [/ppid|informasi publik/i, 'ppid'],
  [/legalisir|ijazah|surat keterangan/i, 'stamp'],
  [/tracer|alumni|lulusan/i, 'tracer'],
  [/pengaduan|aduan|lapor/i, 'report'],
  [/spmb|ppdb|pendaftaran|penerimaan|murid baru/i, 'register'],
  [/kalender|agenda|jadwal/i, 'calendar'],
  [/pramuka|kemah|pecinta alam/i, 'scout'],
  [/paskibra|upacara|osis|mpk/i, 'flag'],
  [/\bpmr\b|\buks\b|kesehatan/i, 'health'],
  [/bahasa|sastra/i, 'language'],
  [/tari|sanggar|seni|musik|budaya|paduan suara|teater/i, 'art'],
  [/\bkir\b|ilmiah|sains|teknologi|robot|coding|\bipa\b/i, 'science'],
  [/rohis|keagamaan|kerohanian|ibadah/i, 'faith'],
  [/voli|futsal|basket|olahraga|silat|sepak|atletik/i, 'sport'],
  [/debat|english|jurnalistik|pidato/i, 'debate'],
  [/sosial|humaniora|ekonomi|geografi/i, 'social'],
  [/kokurikuler|projek|proyek|pangan/i, 'project'],
  [/fisika|kimia|biologi/i, 'atom'],
  [/berita|pengumuman|info/i, 'news'],
  [/prestasi|lomba|juara/i, 'trophy'],
  [/kurikulum|mapel|mata pelajaran|akademik/i, 'book'],
];

const FALLBACK: IconKey[] = ['school', 'book', 'calendar', 'news', 'trophy', 'project'];

/** Kunci ikon untuk teks `title`; tanpa kata kunci yang cocok → ikon cadangan ke-`index`. */
export function iconKey(title: string, index = 0): IconKey {
  const match = RULES.find(([pattern]) => pattern.test(title || ''));
  return match ? match[1] : FALLBACK[Math.abs(Math.floor(index)) % FALLBACK.length];
}
