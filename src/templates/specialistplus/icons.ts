// Ikon garis SpecialistPlus dipilih otomatis dari nama klinik atau alat, jadi CMS tidak butuh kolom ikon. Kata kunci
// medis berbahasa Indonesia (dan istilah Inggris yang lazim); aturan pertama yang cocok menang, tanpa kecocokan →
// garis aktivitas. Dirender lewat <MedIcon> (./ui).
import { Activity, Baby, Bone, Brain, Eye, FlaskConical, HeartPulse, Magnet, Microscope, Scan, ScanLine, Smile, Stethoscope, Wind } from 'lucide-react';
import type { ComponentType } from 'react';

/** Semua ikon yang bisa dipilih. */
export const ICONS = {
  heart: HeartPulse,
  bone: Bone,
  oncology: Microscope,
  brain: Brain,
  lung: Wind,
  internal: Stethoscope,
  child: Baby,
  eye: Eye,
  dental: Smile,
  mri: Magnet,
  ct: ScanLine,
  scan: Scan,
  lab: FlaskConical,
  other: Activity,
} as const satisfies Record<string, ComponentType<{ className?: string }>>;

export type IconKey = keyof typeof ICONS;

// Urutan penting: aturan yang lebih khusus di atas ("cath lab" → jantung, bukan lab).
const RULES: [RegExp, IconKey][] = [
  [/jantung|kardio|cardio|cath|kateter|ekg|heart/i, 'heart'],
  [/ortopedi|tulang|sendi|ortho|bone|fisioterapi/i, 'bone'],
  [/onkologi|kanker|tumor|oncolog|cancer|patologi/i, 'oncology'],
  [/saraf|neuro|otak|brain|stroke/i, 'brain'],
  [/paru|napas|pernapasan|pulmo|lung/i, 'lung'],
  [/penyakit dalam|internis|interna|internal|diabetes/i, 'internal'],
  [/anak|pediatri|bayi|child/i, 'child'],
  [/mata|eye|ophthal/i, 'eye'],
  [/gigi|dental/i, 'dental'],
  [/\bmri\b|resonansi|magnet/i, 'mri'],
  [/\bct\b|ct scan|tomografi/i, 'ct'],
  [/mammo|rontgen|x-ray|radiologi|usg|ultrasonografi/i, 'scan'],
  [/lab|darah|kimia|hematologi/i, 'lab'],
];

/** Kunci ikon untuk nama klinik/alat; tanpa kata kunci yang cocok → garis aktivitas. */
export function iconKey(name: string): IconKey {
  return RULES.find(([pattern]) => pattern.test(name || ''))?.[1] ?? 'other';
}
