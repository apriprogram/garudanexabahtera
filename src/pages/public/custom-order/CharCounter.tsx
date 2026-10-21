// Penghitung karakter kecil di kanan label field (prop `aside` milik <Field>), dipakai form /pesan-custom dan /pesan/:slug.

/** Penghitung karakter "120/5.000" (format angka Indonesia); merah bila melewati batas. */
export function CharCounter({ id, length, max }: { id?: string; length: number; max: number }) {
  const over = length > max;
  return (
    <span id={id} className={`shrink-0 text-xs tabular-nums ${over ? 'font-medium text-danger-700' : 'text-subtle'}`}>
      {length.toLocaleString('id-ID')}/{max.toLocaleString('id-ID')}
    </span>
  );
}
