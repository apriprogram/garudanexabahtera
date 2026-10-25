// Masa aktif: sisa waktu, nada peringatan (batas 30/7/0 hari), progres, dan teks hitung mundur.
// Jalankan: npx vitest run src/pages/account/components/__tests__/activePeriod.test.ts
import { describe, expect, it } from 'vitest';
import {
  RENEWAL_URGENT_DAYS,
  RENEWAL_WARNING_DAYS,
  clockText,
  countdownLabel,
  parseDbDate,
  periodTone,
  periodWarning,
  progress,
  remaining,
  shortDate,
  type Remaining,
} from '../activePeriod';

// Semua tanggal waktu lokal, sama seperti kolom DATETIME dari server
const NOW = new Date(2026, 9, 25, 10, 0, 0); // 25 Okt 2026 10.00
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const at = (offsetMs: number) => new Date(NOW.getTime() + offsetMs);
const rem = (offsetMs: number) => remaining(at(offsetMs), NOW) as Remaining;

describe('parseDbDate', () => {
  it('membaca DATETIME dan tanggal saja sebagai waktu lokal', () => {
    expect(parseDbDate('2026-10-25 10:00:00')?.getTime()).toBe(NOW.getTime());
    expect(parseDbDate('2026-10-25')?.getTime()).toBe(new Date(2026, 9, 25).getTime());
    expect(parseDbDate(NOW)).toBe(NOW);
  });

  it('kosong atau tidak valid → null', () => {
    expect(parseDbDate(null)).toBeNull();
    expect(parseDbDate('')).toBeNull();
    expect(parseDbDate('bukan tanggal')).toBeNull();
    expect(parseDbDate(new Date(Number.NaN))).toBeNull();
    expect(remaining(null, NOW)).toBeNull();
  });
});

describe('remaining', () => {
  it('hari, jam, dan menit penuh yang tersisa', () => {
    expect(remaining('2027-10-22 13:05:30', NOW)).toEqual({
      expired: false,
      days: 362,
      hours: 3,
      minutes: 5,
      ms: 362 * DAY + 3 * HOUR + 5 * MIN + 30_000,
    });
  });

  it('tepat di tanggal berakhir = sudah lewat; lewat 3 hari = 3', () => {
    expect(rem(0)).toMatchObject({ expired: true, days: 0, hours: 0, minutes: 0, ms: 0 });
    expect(rem(-(3 * DAY + 2 * HOUR))).toMatchObject({ expired: true, days: 3, hours: 2 });
  });
});

describe('periodTone (batas 30 / 7 / 0 hari)', () => {
  it('memakai hari penuh yang ditampilkan', () => {
    expect(RENEWAL_WARNING_DAYS).toBe(30);
    expect(RENEWAL_URGENT_DAYS).toBe(7);
    expect(periodTone(rem(31 * DAY))).toBe('ok');
    expect(periodTone(rem(31 * DAY - MIN))).toBe('soon'); // 30 hari 23 jam 59 menit
    expect(periodTone(rem(30 * DAY))).toBe('soon');
    expect(periodTone(rem(8 * DAY))).toBe('soon');
    expect(periodTone(rem(8 * DAY - MIN))).toBe('urgent');
    expect(periodTone(rem(7 * DAY))).toBe('urgent');
    expect(periodTone(rem(5 * HOUR))).toBe('urgent');
    expect(periodTone(rem(0))).toBe('expired');
    expect(periodTone(rem(-DAY))).toBe('expired');
  });
});

describe('progress', () => {
  const start = '2026-10-01 00:00:00';
  const end = '2026-10-31 00:00:00';

  it('bagian yang sudah berjalan, dibatasi 0..1', () => {
    expect(progress(start, end, new Date(2026, 9, 16))).toBeCloseTo(0.5, 5);
    expect(progress(start, end, new Date(2026, 8, 1))).toBe(0);
    expect(progress(start, end, new Date(2026, 10, 15))).toBe(1);
  });

  it('tanggal kosong/tidak valid → 0; masa nol → 0 sebelum, 1 sesudah', () => {
    expect(progress(null, end, NOW)).toBe(0);
    expect(progress(start, 'x', NOW)).toBe(0);
    expect(progress(end, end, new Date(2026, 9, 30))).toBe(0);
    expect(progress(end, start, NOW)).toBe(1);
  });
});

describe('teks hitung mundur', () => {
  it('countdownLabel', () => {
    expect(countdownLabel(rem(362 * DAY + 3 * HOUR))).toBe('362 hari lagi');
    expect(countdownLabel(rem(DAY))).toBe('1 hari lagi');
    expect(countdownLabel(rem(5 * HOUR))).toBe('Berakhir hari ini');
    expect(countdownLabel(rem(-2 * HOUR))).toBe('Berakhir hari ini');
    expect(countdownLabel(rem(-(3 * DAY + HOUR)))).toBe('Berakhir 3 hari lalu');
  });

  it('clockText', () => {
    expect(clockText(rem(2 * DAY + 4 * HOUR + 7 * MIN + 59_000))).toBe('4 jam 7 menit');
  });

  it('periodWarning: masih lama = null; kuning/merah menyebut sisa hari; lewat = berakhir', () => {
    expect(periodWarning(rem(40 * DAY), '2026-12-04 10:00:00')).toBeNull();
    expect(periodWarning(rem(12 * DAY + 30 * MIN), '2026-11-06 10:30:00')).toBe(
      'Masa aktif tinggal 12 hari. Perpanjang sebelum 6 November 2026 agar situs tetap online.',
    );
    expect(periodWarning(rem(3 * HOUR), '2026-10-25 13:00:00')).toBe(
      'Masa aktif berakhir hari ini. Perpanjang sebelum 25 Oktober 2026 agar situs tetap online.',
    );
    expect(periodWarning(rem(-(3 * DAY + HOUR)), '2026-10-22 09:00:00')).toBe(
      'Masa aktif berakhir 22 Oktober 2026. Situs dapat dinonaktifkan sementara; perpanjang sekarang.',
    );
  });

  it('shortDate', () => {
    expect(shortDate('2029-10-23 01:23:00')).toBe('23 Okt 2029');
    expect(shortDate(null)).toBe('-');
    expect(shortDate('x')).toBe('x');
  });
});
