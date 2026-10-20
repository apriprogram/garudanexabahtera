// Label + kontrol + teks bantuan / pesan error di bawah field (kelas *-site dari src/index.css).
import type { ReactNode } from 'react';

interface FormFieldProps {
  id: string;
  label: string;
  optional?: boolean;
  help?: ReactNode;
  error?: string;
  /** Elemen kecil di kanan label (mis. penghitung karakter) */
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function FormField({ id, label, optional, help, error, aside, className = '', children }: FormFieldProps) {
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="label-site">
          {label}
          {optional && <span className="font-normal text-subtle"> (opsional)</span>}
        </label>
        {aside}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="error-site">
          {error}
        </p>
      ) : help ? (
        <p id={`${id}-help`} className="help-site">
          {help}
        </p>
      ) : null}
    </div>
  );
}

/** Penghitung karakter kecil "120/5000". */
export function CharCounter({ id, length, max }: { id: string; length: number; max: number }) {
  const over = length > max;
  return (
    <span id={id} className={`shrink-0 text-xs tabular-nums ${over ? 'font-medium text-danger' : 'text-subtle'}`}>
      {length.toLocaleString('id-ID')}/{max.toLocaleString('id-ID')}
    </span>
  );
}
