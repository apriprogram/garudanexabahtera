// Tata letak galeri proyek Corporate Nexa (bento). Fungsi murni agar mudah diuji untuk jumlah foto berapa pun (1–12).
//
// HP (2 kolom): foto pertama selebar baris 4:3, sisanya persegi; foto terakhir yang sendirian dibuat selebar baris 16:9.
// @3xl ke atas (12 kolom, tinggi baris tetap): foto 1 = 7 kolom × 2 baris, foto 2–3 = 5 kolom, sisanya 4 kolom per
// baris (3 foto); baris terakhir yang berisi 1 foto → 12 kolom, 2 foto → masing-masing 6 kolom.

export interface BentoCell {
  /** Kelas li (span grid + rasio di HP) */
  className: string;
  /** Atribut sizes foto */
  sizes: string;
}

const WIDE_PHONE = 'col-span-2 aspect-[16/9]';

export function bentoCell(index: number, count: number): BentoCell {
  const n = Math.max(1, count);
  const i = Math.max(0, Math.min(index, n - 1));
  const lastAlone = i === n - 1 && n > 1 && (n - 1) % 2 === 1;
  const phone = i === 0 ? 'col-span-2 aspect-[4/3]' : lastAlone ? WIDE_PHONE : 'aspect-square';
  const reset = '@3xl:aspect-auto';

  if (n === 1) return { className: `${phone} ${reset} @3xl:col-span-12 @3xl:row-span-2`, sizes: '100vw' };
  if (i === 0) return { className: `${phone} ${reset} @3xl:col-span-7 @3xl:row-span-2`, sizes: '(min-width: 768px) 58vw, 100vw' };
  if (n === 2) return { className: `${phone} ${reset} @3xl:col-span-5 @3xl:row-span-2`, sizes: '(min-width: 768px) 42vw, 100vw' };
  if (i <= 2) return { className: `${phone} ${reset} @3xl:col-span-5`, sizes: '(min-width: 768px) 42vw, 50vw' };

  const rest = n - 3;
  const j = i - 3;
  const remainder = rest % 3;
  const lastRowStart = rest - (remainder || 3);
  let span = '@3xl:col-span-4';
  let sizes = '(min-width: 768px) 33vw, 50vw';
  if (j >= lastRowStart && remainder === 1) {
    span = '@3xl:col-span-12';
    sizes = '100vw';
  } else if (j >= lastRowStart && remainder === 2) {
    span = '@3xl:col-span-6';
    sizes = '(min-width: 768px) 50vw, 50vw';
  }
  return { className: `${phone} ${reset} ${span}`, sizes: lastAlone ? sizes.replace(/50vw$/, '100vw') : sizes };
}
