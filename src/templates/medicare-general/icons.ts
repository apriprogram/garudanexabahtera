// Ikon garis MediCare General dipilih otomatis dari nama layanan, poli, atau ubin, jadi CMS tidak butuh kolom ikon.
// Kata kunci rumah sakit berbahasa Indonesia; aturan pertama yang cocok menang, tanpa kecocokan → stetoskop. Tidak ada
// ikon salib/palang (lambang palang merah dilindungi). Dirender lewat <AutoIcon> (./ui).
import {
  Activity,
  BedDouble,
  Bone,
  Brain,
  CalendarDays,
  ClipboardPen,
  Ear,
  Eye,
  FlaskConical,
  HandHeart,
  HeartPulse,
  PersonStanding,
  Pill,
  ScanLine,
  Scissors,
  ShieldCheck,
  Siren,
  Smile,
  Sparkles,
  Stethoscope,
  Baby,
} from 'lucide-react';
import type { ComponentType } from 'react';

/** Semua ikon yang bisa dipilih. */
export const ICONS = {
  emergency: Siren,
  inpatient: BedDouble,
  lab: FlaskConical,
  radiology: ScanLine,
  pharmacy: Pill,
  register: ClipboardPen,
  schedule: CalendarDays,
  child: Baby,
  maternity: HandHeart,
  heart: HeartPulse,
  neuro: Brain,
  ent: Ear,
  eye: Eye,
  dental: Smile,
  skin: Sparkles,
  surgery: Scissors,
  internal: Activity,
  rehab: PersonStanding,
  bone: Bone,
  insurance: ShieldCheck,
  general: Stethoscope,
} as const satisfies Record<string, ComponentType<{ className?: string }>>;

export type IconKey = keyof typeof ICONS;

// Urutan penting: aturan yang lebih khusus di atas ("Poli Jantung" sebelum "poli", "rawat inap" sebelum "rawat").
const RULES: [RegExp, IconKey][] = [
  [/igd|gawat|darurat|emergency|ambulan/i, 'emergency'],
  [/rawat inap|inap|kamar|bangsal|vvip|\bvip\b|kelas\s*\d/i, 'inpatient'],
  [/lab/i, 'lab'],
  [/radiolog|rontgen|r[oö]ntgen|usg|ct.?scan|\bmri\b|x-?ray/i, 'radiology'],
  [/farmasi|apotek|obat|resep/i, 'pharmacy'],
  [/daftar|registrasi|pendaftaran|antre/i, 'register'],
  [/jadwal/i, 'schedule'],
  [/anak|bayi|pediatri/i, 'child'],
  [/kandungan|kebidanan|obgyn|hamil|ibu/i, 'maternity'],
  [/jantung|kardio/i, 'heart'],
  [/saraf|neuro/i, 'neuro'],
  [/tht|telinga|hidung|tenggorok/i, 'ent'],
  [/mata/i, 'eye'],
  [/gigi|dental/i, 'dental'],
  [/kulit|kelamin|derma/i, 'skin'],
  [/bedah|operasi/i, 'surgery'],
  [/penyakit dalam|internis|dalam/i, 'internal'],
  [/rehab|fisioterapi|terapi/i, 'rehab'],
  [/tulang|ortoped/i, 'bone'],
  [/asuransi|bpjs|jaminan/i, 'insurance'],
];

/** Kunci ikon untuk sebuah nama; tanpa kata kunci yang cocok → stetoskop (umum). */
export function iconKey(title: string): IconKey {
  return RULES.find(([pattern]) => pattern.test(title || ''))?.[1] ?? 'general';
}
