// Logika murni halaman Statistik kunjungan (/akun/situs/:siteId/statistik, docs/platform/SITE-STATS-SPEC.md §3–§4):
// rentang dari query ?rentang=, perapian jawaban customer_get_site_stats, perubahan % terhadap periode sebelumnya, titik
// mingguan (12 bulan), hari ramai dari data harian, ringkasan teks setiap grafik, dan format angka/tanggal Indonesia.
// Tanpa Intl/ICU (hasil sama di Node dan browser); semua tanggal = teks YYYY-MM-DD zona WIB dari server.
import {
  SITE_STATS_RANGES,
  SITE_STATS_RANGE_DEFAULT,
  SITE_VISIT_DEVICE_LABEL,
  SITE_VISIT_SOURCES,
  type SiteStatsDay,
  type SiteStatsRange,
  type SiteStatsResponse,
  type SiteStatsTotals,
  type SiteVisitDevice,
  type SiteVisitSource,
} from '../../../types/siteStats';

// ─── Rentang ────────────────────────────────────────────────────────────────

/** Nama parameter query rentang: /akun/situs/1/statistik?rentang=7 (bawaan 30 hari = tanpa query). */
export const RANGE_PARAM = 'rentang';

export const RANGE_LABEL: Record<SiteStatsRange, string> = {
  7: '7 hari',
  30: '30 hari',
  90: '90 hari',
  365: '12 bulan',
};

/** Nilai query → rentang; kosong atau tidak dikenal = bawaan (30 hari). */
export function parseRange(raw: string | null | undefined): SiteStatsRange {
  const found = SITE_STATS_RANGES.find((range) => String(range) === raw);
  return found ?? SITE_STATS_RANGE_DEFAULT;
}

/** Pembanding di kartu ringkasan: "30 hari sebelumnya", "12 bulan sebelumnya". */
export const previousLabel = (range: SiteStatsRange) => `${RANGE_LABEL[range]} sebelumnya`;

// ─── Format ─────────────────────────────────────────────────────────────────

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
/** Indeks = Date.getUTCDay() (0 = Minggu). */
const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
/** Urutan tampilan hari ramai: Senin–Minggu. */
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/** 12345 → "12.345". */
export const formatCount = (value: number): string => {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? '-' : '';
  return `${sign}${String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};

/** Satu desimal bila perlu, koma desimal: 12,5 / 3 / 1.234. */
export const formatDecimal = (value: number): string => {
  const tenths = Math.round(value * 10);
  const whole = formatCount(Math.trunc(tenths / 10));
  const fraction = Math.abs(tenths % 10);
  return fraction ? `${whole},${fraction}` : whole;
};

/** Persen dengan satu desimal di bawah 10 (4,5%), bulat di atasnya (62%). */
export const formatPercent = (value: number): string => (value >= 10 ? `${formatCount(value)}%` : `${formatDecimal(value)}%`);

/** Bagian dari keseluruhan dalam persen; keseluruhan 0 = 0. */
export const share = (part: number, whole: number): number => (whole > 0 ? (part / whole) * 100 : 0);

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "2026-10-27" → Date UTC tengah malam (hari & tanggal dibaca dengan getUTC*), atau null. */
export function parseDay(day: string): Date | null {
  const match = DATE.exec(day);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isNaN(date.getTime()) ? null : date;
}

const toDay = (date: Date) => date.toISOString().slice(0, 10);

/** Geser tanggal YYYY-MM-DD sejumlah hari. */
export function addDays(day: string, days: number): string {
  const date = parseDay(day);
  if (!date) return day;
  date.setUTCDate(date.getUTCDate() + days);
  return toDay(date);
}

/** Indeks hari (0 = Minggu … 6 = Sabtu), atau -1 bila tanggal tidak sah. */
export const weekdayOf = (day: string): number => parseDay(day)?.getUTCDay() ?? -1;

export const dayName = (weekday: number): string => DAY_NAMES[weekday] ?? '';

/** "2026-10-27" → "27 Okt". */
export function formatDayShort(day: string): string {
  const date = parseDay(day);
  return date ? `${date.getUTCDate()} ${MONTHS_SHORT[date.getUTCMonth()]}` : day;
}

/** "2026-10-27" → "27 Okt 2026". */
export function formatDayMedium(day: string): string {
  const date = parseDay(day);
  return date ? `${formatDayShort(day)} ${date.getUTCFullYear()}` : day;
}

/** "2026-10-27" → "Selasa, 27 Okt 2026" (tooltip & ringkasan). */
export function formatDayLong(day: string): string {
  const date = parseDay(day);
  return date ? `${DAY_NAMES[date.getUTCDay()]}, ${formatDayMedium(day)}` : day;
}

/** Rentang tanggal: "1–27 Okt 2026", "28 Sep – 27 Okt 2026", "29 Des 2025 – 4 Jan 2026"; satu hari = "27 Okt 2026". */
export function formatPeriod(from: string, to: string): string {
  const a = parseDay(from);
  const b = parseDay(to);
  if (!a || !b) return `${from} – ${to}`;
  if (from === to) return formatDayMedium(to);
  if (a.getUTCFullYear() !== b.getUTCFullYear()) return `${formatDayMedium(from)} – ${formatDayMedium(to)}`;
  if (a.getUTCMonth() !== b.getUTCMonth()) return `${formatDayShort(from)} – ${formatDayMedium(to)}`;
  return `${a.getUTCDate()}–${formatDayMedium(to)}`;
}

/** Jam 0–23 → "19.00" (gaya penulisan jam Indonesia). */
export const formatHour = (hour: number): string => `${String(hour).padStart(2, '0')}.00`;

/** Situs perujuk: "utm:instagram" → "instagram (utm)", host apa adanya. */
export const referrerLabel = (host: string): string => (host.startsWith('utm:') ? `${host.slice(4)} (utm)` : host);

/**
 * Nama browser untuk tabel: "Unknown" (cadangan parse_user_agent di backend, mis. browser dalam aplikasi Instagram/Facebook
 * atau Opera Mini) → "Lainnya"; nama lain apa adanya.
 */
export const browserLabel = (name: string): string => (name === 'Unknown' ? 'Lainnya' : name);

// ─── Perapian jawaban server ────────────────────────────────────────────────

const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const count = (value: unknown): number => {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
};
const text = (value: unknown): string => (typeof value === 'string' ? value : '');
const list = (value: unknown): Record<string, unknown>[] => (Array.isArray(value) ? value.filter(isObject) : []);
const totalsOf = (value: unknown): SiteStatsTotals => {
  const v = isObject(value) ? value : {};
  return { views: count(v.views), visits: count(v.visits), visitors: count(v.visitors) };
};

/** Jawaban customer_get_site_stats yang bukan bentuk API (mis. halaman HTML dari host/CDN). */
export class InvalidStatsResponse extends Error {
  constructor() {
    super('Jawaban server tidak sah.');
  }
}

const DEVICES: SiteVisitDevice[] = ['desktop', 'mobile', 'tablet'];

/**
 * Jawaban server → SiteStatsResponse yang lengkap: angka sah (string angka dari MySQL ikut dibaca), semua grup sumber
 * (urutan §2), ketiga perangkat, dan 24 jam. Bukan bentuk API (tanpa from/to/daily) → InvalidStatsResponse.
 */
export function normalizeStats(raw: unknown, range: SiteStatsRange): SiteStatsResponse {
  if (!isObject(raw) || !Array.isArray(raw.daily) || !parseDay(text(raw.from)) || !parseDay(text(raw.to))) throw new InvalidStatsResponse();
  const daily: SiteStatsDay[] = list(raw.daily)
    .filter((d) => parseDay(text(d.day)))
    .map((d) => ({ day: text(d.day), ...totalsOf(d) }))
    .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
  const sourceRows = list(raw.sources);
  const deviceRows = list(raw.devices);
  const hourRows = list(raw.hours);
  const trackingSince = text(raw.tracking_since);
  return {
    range: SITE_STATS_RANGES.find((r) => r === raw.range) ?? range,
    from: text(raw.from),
    to: text(raw.to),
    totals: totalsOf(raw.totals),
    previous: totalsOf(raw.previous),
    today: totalsOf(raw.today),
    daily,
    pages: list(raw.pages)
      .filter((p) => text(p.path))
      .map((p) => ({ path: text(p.path), title: text(p.title) || null, views: count(p.views) })),
    sources: SITE_VISIT_SOURCES.map(({ key, label }) => {
      const row = sourceRows.find((s) => s.key === key);
      return { key: key as SiteVisitSource, label: text(row?.label) || label, visits: count(row?.visits) };
    }),
    referrers: list(raw.referrers)
      .filter((r) => text(r.host))
      .map((r) => ({ host: text(r.host), visits: count(r.visits) })),
    devices: DEVICES.map((key) => {
      const row = deviceRows.find((d) => d.key === key);
      return { key, label: text(row?.label) || SITE_VISIT_DEVICE_LABEL[key], visits: count(row?.visits), visitors: count(row?.visitors) };
    }),
    browsers: list(raw.browsers)
      .filter((b) => text(b.name))
      .map((b) => ({ name: text(b.name), visits: count(b.visits) })),
    hours: Array.from({ length: 24 }, (_, hour) => ({ hour, views: count(hourRows.find((h) => Number(h.hour) === hour)?.views) })),
    tracking_since: parseDay(trackingSince) ? trackingSince : null,
  };
}

/** Belum pernah ada data sama sekali (spec §4 "Kosong"): penjelasan, bukan grafik nol. */
export const hasNoData = (stats: SiteStatsResponse) => stats.tracking_since === null && stats.totals.views === 0;

// ─── Perubahan terhadap periode sebelumnya ──────────────────────────────────

export type Change = { kind: 'up' | 'down'; percent: number } | { kind: 'new' } | { kind: 'flat' };

/** Naik/turun dalam persen; sebelumnya 0 dan sekarang ada = "baru"; sama = tetap. */
export function changeOf(current: number, previous: number): Change {
  if (current === previous) return { kind: 'flat' };
  if (previous <= 0) return { kind: 'new' };
  const percent = (Math.abs(current - previous) / previous) * 100;
  return { kind: current > previous ? 'up' : 'down', percent };
}

/** Teks perubahan yang tampil: "+12%", "−4,5%", "Baru", "0%". */
export function changeText(change: Change): string {
  if (change.kind === 'new') return 'Baru';
  if (change.kind === 'flat') return '0%';
  return `${change.kind === 'up' ? '+' : '−'}${formatPercent(change.percent)}`;
}

/** Kalimat untuk pembaca layar: "naik 12% dibanding 30 hari sebelumnya". */
export function changeSentence(change: Change, compared: string): string {
  if (change.kind === 'new') return `baru, sebelumnya belum ada (${compared})`;
  if (change.kind === 'flat') return `tidak berubah dibanding ${compared}`;
  return `${change.kind === 'up' ? 'naik' : 'turun'} ${formatPercent(change.percent)} dibanding ${compared}`;
}

/** Data hari sebelum hari terakhir (kemarin) untuk kartu "Hari ini"; tidak ada di rentang = 0. */
export function yesterdayOf(stats: SiteStatsResponse): SiteStatsTotals {
  const day = addDays(stats.to, -1);
  const found = stats.daily.find((d) => d.day === day);
  return found ? { views: found.views, visits: found.visits, visitors: found.visitors } : { views: 0, visits: 0, visitors: 0 };
}

// ─── Tren ───────────────────────────────────────────────────────────────────

export interface TrendPoint extends SiteStatsTotals {
  /** Hari (harian) atau Senin awal pekan (mingguan) */
  key: string;
  /** Hari pertama & terakhir yang dijumlah (pekan pertama/terakhir bisa terpotong rentang) */
  start: string;
  end: string;
}

/** Senin awal pekan tanggal ini (pekan Senin–Minggu). */
export const weekStartOf = (day: string): string => addDays(day, -((weekdayOf(day) + 6) % 7));

/**
 * Titik grafik tren: 12 bulan = jumlah per pekan Senin–Minggu (pekan di tepi rentang hanya hari yang ada), rentang
 * lain = per hari.
 */
export function trendPoints(stats: SiteStatsResponse): TrendPoint[] {
  if (stats.range !== 365) return stats.daily.map((d) => ({ ...d, key: d.day, start: d.day, end: d.day }));
  const weeks: TrendPoint[] = [];
  for (const d of stats.daily) {
    const key = weekStartOf(d.day);
    const last = weeks[weeks.length - 1];
    if (last && last.key === key) {
      last.views += d.views;
      last.visits += d.visits;
      last.visitors += d.visitors;
      last.end = d.day;
    } else {
      weeks.push({ key, start: d.day, end: d.day, views: d.views, visits: d.visits, visitors: d.visitors });
    }
  }
  return weeks;
}

/** Label titik tren: hari "Selasa, 27 Okt 2026", pekan "Pekan 20–26 Okt 2026". */
export const trendPointLabel = (point: TrendPoint, weekly: boolean): string =>
  weekly ? `Pekan ${formatPeriod(point.start, point.end)}` : formatDayLong(point.key);

/** Elemen pertama dengan nilai terbesar (> 0), atau null. */
export function peakOf<T>(items: readonly T[], value: (item: T) => number): T | null {
  let best: T | null = null;
  for (const item of items) if (value(item) > 0 && (best === null || value(item) > value(best))) best = item;
  return best;
}

// ─── Hari ramai ─────────────────────────────────────────────────────────────

export interface WeekdayRow {
  weekday: number;
  label: string;
  /** Rata-rata tampilan halaman per hari itu */
  average: number;
  /** Jumlah hari itu dalam rentang (sejak pencatatan dimulai) */
  days: number;
}

/**
 * Rata-rata tampilan halaman per hari Senin–Minggu dari data harian. Rata-rata, bukan jumlah: rentang 30/90 hari bisa
 * berisi 4 atau 5 hari yang sama. Hari sebelum pencatatan dimulai (tracking_since) tidak ikut dihitung.
 */
export function weekdayRows(stats: SiteStatsResponse): WeekdayRow[] {
  const since = stats.tracking_since;
  const sums = new Map<number, { views: number; days: number }>();
  for (const d of stats.daily) {
    if (since && d.day < since) continue;
    const weekday = weekdayOf(d.day);
    const entry = sums.get(weekday) ?? { views: 0, days: 0 };
    entry.views += d.views;
    entry.days += 1;
    sums.set(weekday, entry);
  }
  return WEEKDAY_ORDER.map((weekday) => {
    const entry = sums.get(weekday);
    return { weekday, label: DAY_NAMES[weekday], days: entry?.days ?? 0, average: entry && entry.days ? entry.views / entry.days : 0 };
  });
}

// ─── Ringkasan teks setiap grafik (spec §4 Aksesibilitas) ───────────────────

export const EMPTY_RANGE = 'Belum ada kunjungan pada rentang ini.';

export function trendSummary(stats: SiteStatsResponse, points: TrendPoint[]): string {
  const weekly = stats.range === 365;
  const peak = peakOf(points, (p) => p.views);
  if (!peak) return EMPTY_RANGE;
  return (
    `Total ${formatCount(stats.totals.views)} tampilan halaman dan ${formatCount(stats.totals.visitors)} pengunjung unik. ` +
    `${weekly ? 'Pekan tertinggi' : 'Tertinggi'} ${weekly ? formatPeriod(peak.start, peak.end) : formatDayLong(peak.key)}, ${formatCount(peak.views)} tampilan.`
  );
}

export function sourcesSummary(stats: SiteStatsResponse): string {
  const total = stats.sources.reduce((sum, s) => sum + s.visits, 0);
  const peak = peakOf(stats.sources, (s) => s.visits);
  if (!peak) return EMPTY_RANGE;
  return `Sumber terbesar ${peak.label}: ${formatCount(peak.visits)} kunjungan (${formatPercent(share(peak.visits, total))}).`;
}

export function devicesSummary(stats: SiteStatsResponse): string {
  const total = stats.devices.reduce((sum, d) => sum + d.visits, 0);
  const peak = peakOf(stats.devices, (d) => d.visits);
  if (!peak) return EMPTY_RANGE;
  return `Paling banyak dari ${peak.label}: ${formatPercent(share(peak.visits, total))} kunjungan.`;
}

export function hoursSummary(stats: SiteStatsResponse): string {
  const peak = peakOf(stats.hours, (h) => h.views);
  if (!peak) return EMPTY_RANGE;
  return `Paling ramai pukul ${formatHour(peak.hour)}–${String(peak.hour).padStart(2, '0')}.59 WIB, ${formatCount(peak.views)} tampilan halaman.`;
}

export function weekdaysSummary(rows: WeekdayRow[]): string {
  const peak = peakOf(rows, (r) => r.average);
  if (!peak) return EMPTY_RANGE;
  return `Tertinggi ${peak.label}, rata-rata ${formatDecimal(peak.average)} tampilan per hari.`;
}

// ─── Unduh CSV ──────────────────────────────────────────────────────────────

/** Nama file: statistik-{domain}-{from}-{to}.csv (karakter di luar huruf/angka/titik/strip diganti strip). */
export const statsCsvName = (domain: string, stats: Pick<SiteStatsResponse, 'from' | 'to'>) =>
  `statistik-${domain.toLowerCase().replace(/[^a-z0-9.-]+/g, '-') || 'situs'}-${stats.from}-${stats.to}.csv`;

/** Baris CSV data harian rentang ini: kepala kolom lalu satu baris per hari. */
export const statsCsvRows = (stats: SiteStatsResponse): (string | number)[][] => [
  ['Tanggal', 'Tampilan halaman', 'Kunjungan', 'Pengunjung unik'],
  ...stats.daily.map((d) => [d.day, d.views, d.visits, d.visitors]),
];
