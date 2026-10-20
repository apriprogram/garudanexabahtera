import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface FieldProps {
  /** id input di dalamnya (dipakai label, pesan error, dan fokus ke field error) */
  id: string;
  label: string;
  optional?: boolean;
  help?: ReactNode;
  error?: string;
  /** Elemen kecil di kanan label, mis. tautan "Lupa kata sandi?" atau penghitung karakter */
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Label + kontrol + teks bantuan / pesan error di bawah field (kelas *-site dari src/index.css). */
export function Field({ id, label, optional, help, error, aside, className = '', children }: FieldProps) {
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

/** Input kata sandi dengan tombol tampilkan/sembunyikan. */
export function PasswordInput({ className = '', ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'} className={`input-site pr-12 ${className}`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-subtle transition-colors hover:text-fg"
      >
        {visible ? <EyeOff className="h-[18px] w-[18px]" aria-hidden /> : <Eye className="h-[18px] w-[18px]" aria-hidden />}
      </button>
    </div>
  );
}
