// Field form auth: label di atas, ikon di kiri input (berubah biru saat fokus, merah saat error), tombol
// tampilkan/sembunyikan untuk kata sandi, peringatan Caps Lock, pesan error/bantuan di bawah field.
import { useState, type FocusEvent, type InputHTMLAttributes, type KeyboardEvent, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { CircleAlert, Eye, EyeOff, type LucideIcon } from 'lucide-react';

type AuthFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'name' | 'size' | 'children'> & {
  /** id + name input; dipakai label, pesan error (`{id}-error`), dan fokus ke field error */
  id: string;
  label: string;
  icon: LucideIcon;
  error?: string;
  help?: ReactNode;
  /** Elemen kecil di kanan label, mis. tombol "Lupa kata sandi?" */
  aside?: ReactNode;
  /** Input kata sandi dengan tombol tampilkan/sembunyikan */
  password?: boolean;
};

export function AuthField({
  id,
  label,
  icon: Icon,
  error,
  help,
  aside,
  password = false,
  type,
  className = '',
  onKeyDown,
  onKeyUp,
  onBlur,
  ...input
}: AuthFieldProps) {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const describedBy = [error ? `${id}-error` : help ? `${id}-help` : null, password && capsLock ? `${id}-caps` : null]
    .filter(Boolean)
    .join(' ');

  const trackCaps = (e: KeyboardEvent<HTMLInputElement>) => {
    if (password && typeof e.getModifierState === 'function') setCapsLock(e.getModifierState('CapsLock'));
  };

  return (
    <div className={className}>
      <div className="mb-1.5 flex min-h-5 items-center justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-medium text-fg">
          {label}
        </label>
        {aside}
      </div>

      <div className="group/input relative">
        <Icon
          className={`pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 transition-colors duration-200 ${
            error ? 'text-danger' : 'text-subtle group-focus-within/input:text-primary'
          }`}
          aria-hidden
        />
        <input
          {...input}
          id={id}
          name={id}
          type={password ? (visible ? 'text' : 'password') : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          onKeyDown={(e) => {
            trackCaps(e);
            onKeyDown?.(e);
          }}
          onKeyUp={(e) => {
            trackCaps(e);
            onKeyUp?.(e);
          }}
          onBlur={(e: FocusEvent<HTMLInputElement>) => {
            setCapsLock(false);
            onBlur?.(e);
          }}
          className={`block h-11 w-full rounded-xl border bg-alt pl-11 text-[16px] text-fg outline-none transition-[border-color,background-color,box-shadow] duration-200 placeholder:text-subtle focus:bg-surface focus:ring-4 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 sm:h-12 sm:text-[15px] ${
            password ? 'pr-12' : 'pr-4'
          } ${
            error
              ? 'border-danger/70 focus:border-danger focus:ring-danger/10'
              : 'border-line hover:border-line-strong focus:border-primary focus:ring-primary/10'
          }`}
        />
        {password && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            disabled={input.disabled}
            aria-label={visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            aria-pressed={visible}
            aria-controls={id}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-subtle transition-colors hover:text-fg focus-visible:outline-offset-[-2px] disabled:cursor-not-allowed disabled:opacity-60 sm:w-12"
          >
            {visible ? <EyeOff className="h-[18px] w-[18px]" aria-hidden /> : <Eye className="h-[18px] w-[18px]" aria-hidden />}
          </button>
        )}
      </div>

      {password && capsLock && (
        <p id={`${id}-caps`} className="mt-1.5 text-xs font-medium text-warning-700">
          Caps Lock sedang aktif.
        </p>
      )}
      {error ? (
        <motion.p
          key={error}
          id={`${id}-error`}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-danger-700"
        >
          <CircleAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </motion.p>
      ) : help ? (
        <p id={`${id}-help`} className="mt-1.5 text-xs text-subtle">
          {help}
        </p>
      ) : null}
    </div>
  );
}

interface AuthTextButtonProps {
  children: ReactNode;
  onClick: () => void;
  expanded?: boolean;
  controls?: string;
}

/** Tombol teks kecil di kanan label (mis. "Lupa kata sandi?"), area sentuh diperluas tanpa terlihat. */
export function AuthTextButton({ children, onClick, expanded, controls }: AuthTextButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      aria-controls={controls}
      className="relative rounded-md text-[13px] font-medium text-primary transition-colors hover:text-primary-hover hover:underline underline-offset-4 after:absolute after:-inset-x-2 after:-inset-y-3"
    >
      {children}
    </button>
  );
}
