// Indonesian number, money and date formatting for documents. Pure functions, no Intl (identical output in every
// browser and in Node, and the backends implement the same rules for MergeData.value_rupiah / value_terbilang).

/**
 * Rounds to whole rupiah, half away from zero (PHP round()). The value is first cut to 15 significant digits, like
 * PHP's pre-rounding, so float noise such as 1.005 × 1000 = 1004.9999999999999 still rounds to 1005.
 */
export function roundRupiah(x: number): number {
  if (!Number.isFinite(x) || x === 0) return 0;
  const r = Math.sign(x) * Math.floor(Number(Math.abs(x).toPrecision(15)) + 0.5);
  return r === 0 ? 0 : r; // no -0
}

const ANGKA = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
const SKALA: [number, string][] = [
  [1e12, 'triliun'],
  [1e9, 'miliar'],
  [1e6, 'juta'],
  [1e3, 'ribu'],
];

const gabung = (a: string, b: string) => (b ? `${a} ${b}` : a);

/** 0..999 in words ('' for 0). */
function ratusan(n: number): string {
  if (n < 12) return ANGKA[n];
  if (n < 20) return `${ANGKA[n - 10]} belas`;
  if (n < 100) return gabung(`${ANGKA[Math.floor(n / 10)]} puluh`, ratusan(n % 10));
  if (n < 200) return gabung('seratus', ratusan(n - 100));
  return gabung(`${ANGKA[Math.floor(n / 100)]} ratus`, ratusan(n % 100));
}

/** Whole number ≥ 0 in words ('' for 0); "seribu" for exactly one thousand, "satu juta" for one million. */
function bilangan(n: number): string {
  for (const [nilai, nama] of SKALA) {
    if (n >= nilai) {
      const depan = Math.floor(n / nilai);
      const kepala = nilai === 1e3 && depan === 1 ? 'seribu' : `${bilangan(depan)} ${nama}`;
      return gabung(kepala, bilangan(n - depan * nilai));
    }
  }
  return ratusan(n);
}

/** Amount in words, lowercase: 1250000 → "satu juta dua ratus lima puluh ribu rupiah"; 0 → "nol rupiah". */
export function terbilang(n: number): string {
  if (!Number.isFinite(n)) return '';
  const bulat = roundRupiah(n);
  if (bulat === 0) return 'nol rupiah';
  return `${bulat < 0 ? 'minus ' : ''}${bilangan(Math.abs(bulat))} rupiah`;
}

/** Whole number in words without a currency (legal style "41 (empat puluh satu) hari"): 41 → "empat puluh satu". */
export function angkaTerbilang(n: number): string {
  if (!Number.isFinite(n)) return '';
  const bulat = roundRupiah(n);
  if (bulat === 0) return 'nol';
  return `${bulat < 0 ? 'minus ' : ''}${bilangan(Math.abs(bulat))}`;
}

/** Percentage with an Indonesian decimal comma, no trailing zeros: 12.5 → "12,5", 50 → "50". */
export function persen(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return String(Math.round(n * 100) / 100).replace('.', ',');
}

/** 1250000 → "Rp1.250.000"; negative → "-Rp1.000". Rounded to whole rupiah. */
export function formatRupiahDoc(n: number): string {
  const bulat = roundRupiah(n);
  const digits = String(Math.abs(bulat)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${bulat < 0 ? '-' : ''}Rp${digits}`;
}

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/** 'YYYY-MM-DD' (a trailing time is ignored) → UTC date, or null when it is not a real calendar date. */
function parseIsoDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T ])/.exec(typeof iso === 'string' ? iso.trim() : '');
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d ? date : null;
}

/** '2026-10-21' → "21 Oktober 2026"; '' for an empty or invalid date. */
export function tanggalPanjang(iso: string): string {
  const date = parseIsoDate(iso);
  return date ? `${date.getUTCDate()} ${BULAN[date.getUTCMonth()]} ${date.getUTCFullYear()}` : '';
}

/** '2026-10-21' → "Rabu"; '' for an empty or invalid date. */
export function hari(iso: string): string {
  const date = parseIsoDate(iso);
  return date ? HARI[date.getUTCDay()] : '';
}

/** '2026-10-21' → "21 Okt 2026" (narrow table columns); '' for an empty or invalid date. */
export function tanggalPendek(iso: string): string {
  const date = parseIsoDate(iso);
  return date ? `${date.getUTCDate()} ${BULAN[date.getUTCMonth()].slice(0, 3)} ${date.getUTCFullYear()}` : '';
}

/** 'YYYY-MM-DD' plus `days` calendar days → 'YYYY-MM-DD'; '' for an invalid date. */
export function tambahHari(iso: string, days: number): string {
  const date = parseIsoDate(iso);
  if (!date || !Number.isFinite(days)) return '';
  date.setUTCDate(date.getUTCDate() + Math.trunc(days));
  return date.toISOString().slice(0, 10);
}

/** Inclusive calendar days from `start` to `end` (same day = 1); 0 when a date is invalid or end < start. */
export function jumlahHari(start: string, end: string): number {
  const a = parseIsoDate(start);
  const b = parseIsoDate(end);
  if (!a || !b || b < a) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1;
}

/** Database timestamp '2026-10-22 10:05:00' (Asia/Jakarta) → "22 Oktober 2026 pukul 10.05 WIB"; date only without time. */
export function waktuPanjang(timestamp: string): string {
  const tanggal = tanggalPanjang(timestamp);
  if (!tanggal) return '';
  const time = /[T ](\d{2}):(\d{2})/.exec(timestamp);
  return time ? `${tanggal} pukul ${time[1]}.${time[2]} WIB` : tanggal;
}

const ROMAWI: [number, string][] = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

/** Roman numeral for document numbers: 10 → "X" (month in `007/PKS/GNB/X/2026`); '' outside 1..3999. */
export function romawi(month: number): string {
  if (!Number.isInteger(month) || month < 1 || month > 3999) return '';
  let rest = month;
  let out = '';
  for (const [value, symbol] of ROMAWI) {
    while (rest >= value) {
      out += symbol;
      rest -= value;
    }
  }
  return out;
}
