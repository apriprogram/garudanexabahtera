// Ikon garis HealthLink dipilih otomatis dari nama ubin/layanan, jadi CMS tidak butuh kolom ikon. Kata kunci layanan
// kesehatan berbahasa Indonesia (dan istilah Inggris yang lazim); aturan pertama yang cocok menang, tanpa kecocokan →
// stetoskop. Dirender lewat <ItemIcon> (./ui). Tujuan tautan otomatis per ikon ada di ./model (actionForIcon).
import { Bike, CalendarClock, ClipboardList, FlaskConical, Hospital, MessageCircle, Pill, Stethoscope, Store, Users, Video } from 'lucide-react';
import type { ComponentType } from 'react';

/** Semua ikon yang bisa dipilih. */
export const ICONS = {
  chat: MessageCircle,
  video: Video,
  prescription: Pill,
  pharmacy: Store,
  delivery: Bike,
  records: ClipboardList,
  reminder: CalendarClock,
  lab: FlaskConical,
  family: Users,
  hospital: Hospital,
  doctor: Stethoscope,
} as const satisfies Record<string, ComponentType<{ className?: string }>>;

export type IconKey = keyof typeof ICONS;

// Urutan penting: aturan yang lebih khusus di atas ("video call" sebelum "call", "antar obat" sebelum "obat",
// "apotek" sebelum "resep": alur resep tidak menampilkan dua ikon pil berturut-turut).
const RULES: [RegExp, IconKey][] = [
  [/video|tatap muka|telekonsul|vidcall/i, 'video'],
  [/antar|kirim|kurir|delivery|ongkir/i, 'delivery'],
  [/apotek|farmasi|pharma/i, 'pharmacy'],
  [/resep|obat|tebus/i, 'prescription'],
  [/rekam|riwayat|medical record|catatan medis/i, 'records'],
  [/pengingat|kontrol|jadwal|reminder|kalender/i, 'reminder'],
  [/lab|tes darah|cek darah|hasil tes|radiologi/i, 'lab'],
  [/keluarga|anak|family|langganan/i, 'family'],
  [/rumah sakit|\brs\b|klinik|hospital|rujukan/i, 'hospital'],
  [/chat|pesan|tanya|konsultasi|call/i, 'chat'],
];

/** Kunci ikon untuk nama ubin/layanan; tanpa kata kunci yang cocok → stetoskop. */
export function iconKey(title: string): IconKey {
  return RULES.find(([pattern]) => pattern.test(title || ''))?.[1] ?? 'doctor';
}
