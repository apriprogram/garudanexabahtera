// Masa aktif pesanan template (hosting & jasa, domain): sisa waktu, nada peringatan, progres, dan teks hitung mundur.
// Murni (tanpa React). Aturan: docs/platform/ACCOUNT-DOMAIN-RENEWAL-SPEC.md §5. Tanggal dari database
// ('YYYY-MM-DD HH:MM:SS') adalah waktu lokal, dibaca sama seperti formatTanggal.
import { formatTanggal } from '../../../types/platform';

/** Sisa ≤ 30 hari: peringatan kuning; ≤ 7 hari: merah. */
export const RENEWAL_WARNING_DAYS = 30;
export const RENEWAL_URGENT_DAYS = 7;

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export type PeriodTone = 'ok' | 'soon' | 'urgent' | 'expired';

export interface Remaining {
  /** Sudah lewat (sisa ≤ 0) */
  expired: boolean;
  /** Hari/jam/menit penuh dari selisih (dibulatkan ke bawah); saat sudah lewat = sudah berapa lama */
  days: number;
  hours: number;
  minutes: number;
  /** Sisa dalam milidetik; negatif = sudah lewat */
  ms: number;
}

/** 'YYYY-MM-DD HH:MM:SS' / 'YYYY-MM-DD' (waktu lokal) atau Date → Date; kosong/tidak valid → null. */
export function parseDbDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const text = value.trim();
  // Tanggal saja dibaca JS sebagai UTC; dijadikan tengah malam waktu lokal
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00` : text.replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Sisa waktu sampai `expires` dari `now`; null bila tanggal tidak valid. */
export function remaining(expires: string | Date | null | undefined, now: Date = new Date()): Remaining | null {
  const end = parseDbDate(expires);
  if (!end) return null;
  const ms = end.getTime() - now.getTime();
  const abs = Math.abs(ms);
  return {
    expired: ms <= 0,
    days: Math.floor(abs / DAY_MS),
    hours: Math.floor((abs % DAY_MS) / HOUR_MS),
    minutes: Math.floor((abs % HOUR_MS) / MINUTE_MS),
    ms,
  };
}

/** Nada peringatan menurut hari penuh yang tersisa (sama dengan angka yang ditampilkan). */
export function periodTone(rem: Remaining): PeriodTone {
  if (rem.expired) return 'expired';
  if (rem.days <= RENEWAL_URGENT_DAYS) return 'urgent';
  if (rem.days <= RENEWAL_WARNING_DAYS) return 'soon';
  return 'ok';
}

/** Bagian yang sudah berjalan dari masa `start` → `end` (0..1). Tanggal tidak valid → 0. */
export function progress(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined,
  now: Date = new Date(),
): number {
  const from = parseDbDate(start);
  const to = parseDbDate(end);
  if (!from || !to) return 0;
  const total = to.getTime() - from.getTime();
  if (total <= 0) return now.getTime() >= to.getTime() ? 1 : 0;
  return Math.min(1, Math.max(0, (now.getTime() - from.getTime()) / total));
}

/** "362 hari lagi", "Berakhir hari ini" (sisa/lewat < 1 hari), "Berakhir 3 hari lalu". */
export function countdownLabel(rem: Remaining): string {
  if (rem.days === 0) return 'Berakhir hari ini';
  return rem.expired ? `Berakhir ${rem.days} hari lalu` : `${rem.days} hari lagi`;
}

/** "5 jam 12 menit" (sisa di bawah hitungan hari). */
export const clockText = (rem: Remaining) => `${rem.hours} jam ${rem.minutes} menit`;

/**
 * Kalimat peringatan untuk detail pesanan, atau null bila masih lama. `expires` = tanggal berakhir hosting & jasa.
 */
export function periodWarning(rem: Remaining, expires: string): string | null {
  const tone = periodTone(rem);
  if (tone === 'ok') return null;
  const date = formatTanggal(expires);
  if (tone === 'expired') return `Masa aktif berakhir ${date}. Situs dapat dinonaktifkan sementara; perpanjang sekarang.`;
  const left = rem.days > 0 ? `tinggal ${rem.days} hari` : 'berakhir hari ini';
  return `Masa aktif ${left}. Perpanjang sebelum ${date} agar situs tetap online.`;
}

/** Tanggal ringkas "23 Okt 2029" (kartu pilihan perpanjangan); kosong → "-". */
export function shortDate(value: string | null | undefined): string {
  const d = parseDbDate(value);
  if (!d) return value || '-';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}
