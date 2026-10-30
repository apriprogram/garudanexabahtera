// Ikon garis Kemudi dipilih otomatis dari teks CMS (dokumen syarat sewa, langkah cara sewa), jadi CMS tidak butuh
// kolom ikon. Kata kunci berbahasa Indonesia (dan istilah Inggris yang lazim); aturan pertama yang cocok menang, tanpa
// kecocokan → ikon cadangan per daftar. Dirender lewat <AutoIcon> (./ui).
import {
  Banknote,
  CalendarCheck,
  CalendarClock,
  CarFront,
  CircleCheck,
  Contact,
  FileText,
  IdCard,
  KeyRound,
  MapPin,
  MessageCircle,
  RotateCcw,
  Route,
  Wallet,
} from 'lucide-react';
import type { ComponentType } from 'react';

/** Semua ikon yang bisa dipilih. */
export const ICONS = {
  idcard: IdCard,
  license: Contact,
  file: FileText,
  wallet: Wallet,
  cash: Banknote,
  schedule: CalendarClock,
  route: Route,
  pin: MapPin,
  pick: CarFront,
  confirm: MessageCircle,
  key: KeyRound,
  return: RotateCcw,
  calendar: CalendarCheck,
  check: CircleCheck,
} as const satisfies Record<string, ComponentType<{ className?: string }>>;

export type IconKey = keyof typeof ICONS;

// Dokumen syarat sewa. Urutan penting: aturan yang lebih khusus di atas.
const DOC_RULES: [RegExp, IconKey][] = [
  [/\bsim\b|surat izin mengemudi|driving licen/i, 'license'],
  [/tambahan|\bkk\b|kartu keluarga|surat/i, 'file'],
  [/ktp|e-ktp|identitas|paspor|passport|kartu/i, 'idcard'],
  [/deposit|jaminan/i, 'wallet'],
  [/uang muka|\bdp\b|bayar|pembayaran/i, 'cash'],
  [/jadwal|jam|tanggal|waktu|titik jemput/i, 'schedule'],
  [/rute|tujuan|itinerary/i, 'route'],
  [/alamat|lokasi|domisili/i, 'pin'],
];

// Langkah cara sewa.
const STEP_RULES: [RegExp, IconKey][] = [
  [/kembali|pengembalian|selesai/i, 'return'],
  [/serah terima|kunci|ambil mobil|antar/i, 'key'],
  [/konfirmasi|admin|chat|whatsapp|balas/i, 'confirm'],
  [/pilih|mobil|jadwal|pesan|booking/i, 'pick'],
  [/bayar|deposit|uang muka/i, 'cash'],
  [/tanggal|kalender/i, 'calendar'],
];

/** Kunci ikon dokumen; tanpa kata kunci yang cocok → dokumen. */
export function docIcon(title: string): IconKey {
  return DOC_RULES.find(([pattern]) => pattern.test(title || ''))?.[1] ?? 'file';
}

/** Kunci ikon langkah; tanpa kata kunci yang cocok → centang. */
export function stepIcon(title: string): IconKey {
  return STEP_RULES.find(([pattern]) => pattern.test(title || ''))?.[1] ?? 'check';
}
