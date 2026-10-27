// Ikon garis Nawasena yang dipilih otomatis dari nama ekstrakurikuler (CMS tidak butuh kolom ikon). Kata kunci bahasa
// Indonesia khas SMA; tanpa kecocokan → Sparkles. Dirender lewat <ClubIcon> (./ui).
import {
  BookOpen,
  Camera,
  Cpu,
  Flag,
  FlaskConical,
  HeartPulse,
  Leaf,
  MessagesSquare,
  Mic,
  Music,
  Newspaper,
  Palette,
  Shield,
  Sparkles,
  Tent,
  Trophy,
} from 'lucide-react';
import type { ComponentType } from 'react';

/** Semua ikon yang bisa dipilih. */
export const CLUB_ICONS = {
  scout: Tent,
  flag: Flag,
  health: HeartPulse,
  dance: Music,
  science: FlaskConical,
  faith: BookOpen,
  sport: Trophy,
  debate: MessagesSquare,
  press: Newspaper,
  nature: Leaf,
  choir: Mic,
  art: Palette,
  martial: Shield,
  photo: Camera,
  tech: Cpu,
  other: Sparkles,
} as const satisfies Record<string, ComponentType<{ className?: string }>>;

export type ClubIconKey = keyof typeof CLUB_ICONS;

// Urutan penting: aturan yang lebih khusus di atas (mis. "Paduan suara" → mikrofon, bukan musik).
const RULES: [RegExp, ClubIconKey][] = [
  [/pramuka|kemah|scout/i, 'scout'],
  [/paskibra|pengibar|bendera|baris/i, 'flag'],
  [/pmr|palang merah|uks|kesehatan|pik-?r/i, 'health'],
  [/paduan suara|vokal|choir/i, 'choir'],
  [/tari|sanggar|karawitan|gamelan|musik|band/i, 'dance'],
  [/kir|ilmiah|sains|olimpiade|riset/i, 'science'],
  [/rohis|rohani|kerohanian|keagamaan|tilawah|kajian/i, 'faith'],
  [/debat|english|bahasa|pidato|public speaking/i, 'debate'],
  [/jurnalistik|mading|media|majalah/i, 'press'],
  [/robot|coding|koding|komputer|teknologi/i, 'tech'],
  [/foto|film|sinema/i, 'photo'],
  [/pecinta alam|lingkungan|hijau|kebun/i, 'nature'],
  [/silat|karate|taekwondo|bela diri/i, 'martial'],
  [/voli|futsal|basket|bulu tangkis|sepak|atletik|olahraga|renang/i, 'sport'],
  [/seni|lukis|kriya|tapis|teater/i, 'art'],
];

/** Kunci ikon untuk nama ekstrakurikuler; tanpa kata kunci yang cocok → `other`. */
export function clubIconKey(name: string): ClubIconKey {
  return RULES.find(([pattern]) => pattern.test(name || ''))?.[1] ?? 'other';
}
