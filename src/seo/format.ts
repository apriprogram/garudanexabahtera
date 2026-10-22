// Format angka, tanggal dan teks untuk head, JSON-LD, sitemap dan llms.txt (docs/platform/SEO-PLAN.md §5.3, Lampiran A).
// Modul murni (tanpa React, tanpa DOM), hasilnya sama di Node dan browser: tidak bergantung pada Intl/ICU.

/** Harga yang bisa dipakai: angka rupiah positif. */
export const isPrice = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;

const groupThousands = (value: number): string => String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** 1390000 → "Rp1.390.000" (tanpa spasi, seperti Lampiran A). */
export const formatPriceFull = (price: number): string => `Rp${groupThousands(price)}`;

/**
 * Harga ringkas untuk judul: di bawah 1 juta → "Rp990 rb"; 1 juta ke atas → "Rp1,39 jt" / "Rp1,5 jt" / "Rp2 jt".
 * Harga yang tidak bisa diringkas tanpa pembulatan (mis. 1.395.000 atau 990.500) memakai bentuk lengkap, supaya
 * judul tidak pernah menyebut harga yang berbeda dari harga sebenarnya.
 */
export function formatPriceShort(price: number): string {
  const rupiah = Math.round(price);
  if (rupiah < 1_000_000) return rupiah % 1000 === 0 ? `Rp${rupiah / 1000} rb` : formatPriceFull(rupiah);
  if (rupiah % 10_000 !== 0) return formatPriceFull(rupiah);
  const hundredths = rupiah / 10_000; // 139 → "1,39"
  const whole = Math.floor(hundredths / 100);
  const fraction = String(hundredths % 100).padStart(2, '0').replace(/0+$/, '');
  return `Rp${groupThousands(whole)}${fraction ? `,${fraction}` : ''} jt`;
}

/** Rentang harga dari daftar harga: "Rp990.000–Rp1.790.000", atau satu harga bila semuanya sama. null bila kosong. */
export function formatPriceRange(prices: readonly number[]): string | null {
  const valid = prices.filter(isPrice);
  if (valid.length === 0) return null;
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  return min === max ? formatPriceFull(min) : `${formatPriceFull(min)}–${formatPriceFull(max)}`;
}

const DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})(?:$|[ T])/;

/**
 * Tanggal YYYY-MM-DD dari nilai tanggal DB ("2026-10-23 02:37:00"), ISO ("2026-10-23T00:00:00.000Z") atau
 * "2026-10-23". Tanggal diambil apa adanya dari teksnya (tanpa konversi zona waktu). null bila tidak valid.
 */
export function toIsoDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = DATE_PREFIX.exec(value.trim());
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  if (date.getUTCFullYear() !== Number(y) || date.getUTCMonth() !== Number(m) - 1 || date.getUTCDate() !== Number(d)) return null;
  return `${y}-${m}-${d}`;
}

/** Tanggal paling akhir (YYYY-MM-DD) dari nilai-nilai yang valid, atau null. */
export function latestDate(values: readonly unknown[]): string | null {
  const dates = values.map(toIsoDate).filter((date): date is string => date !== null);
  return dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : null;
}

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/** "2026-10-23" → "23 Oktober 2026". Nilai tidak valid dikembalikan apa adanya. */
export function formatDateId(value: string): string {
  const iso = toIsoDate(value);
  if (!iso) return value;
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** Rapikan spasi (termasuk baris baru) menjadi satu spasi. */
export const collapseSpace = (value: string): string => value.replace(/\s+/g, ' ').trim();

/** Calon teks pertama yang panjangnya ≤ max; bila tidak ada, calon terakhir. Calon kosong dilewati. */
export function firstThatFits(candidates: readonly (string | null | undefined | false)[], max: number): string {
  const list = candidates.filter((c): c is string => typeof c === 'string' && c.trim() !== '').map(collapseSpace);
  return list.find((c) => c.length <= max) ?? list[list.length - 1] ?? '';
}

/** Akhiri kalimat dengan titik bila belum berakhir dengan tanda baca. */
export const sentence = (value: string): string => {
  const text = collapseSpace(value);
  return !text || /[.!?]$/.test(text) ? text : `${text}.`;
};
