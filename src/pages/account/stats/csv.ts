// CSV untuk "Unduh CSV" halaman Statistik kunjungan: UTF-8 dengan BOM (Excel membaca huruf non-ASCII dengan benar),
// pemisah koma, baris CRLF. Sel berisi koma, kutip, atau baris baru dibungkus kutip ganda (RFC 4180).

/** Satu sel CSV. */
export const csvCell = (value: string | number): string => {
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Penanda urutan byte UTF-8 di awal file (U+FEFF). */
export const BOM = String.fromCharCode(0xfeff);

/** Isi file CSV lengkap (BOM + baris). */
export const toCsv = (rows: readonly (readonly (string | number)[])[]): string =>
  `${BOM}${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;

/** Unduh teks CSV sebagai file `filename` lewat tautan sementara (tanpa permintaan ke server). */
export function downloadCsv(filename: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Beri waktu browser memulai unduhan sebelum URL dilepas
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
