import { useId, useState, type InputHTMLAttributes, type ReactNode, type Ref, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { AlertCircle, ChevronDown, Eye, EyeOff, Search, X } from 'lucide-react';
import { cn, FOCUS_INSET } from './cn';
import { CONTROL_BASE, CONTROL_SIZES, CONTROL_STATE, textareaClass, type ControlSize } from './styles';
import { renderIcon, type IconLike } from './icon';

/* Kontrol form: bg-adm-surface, garis 1px adm-line, fokus cobalt. Di HP teks 16px (cegah auto-zoom iOS). */


/** Label field. */
export function Label({ htmlFor, children, required, optional, className }: { htmlFor?: string; children: ReactNode; required?: boolean; optional?: boolean | string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn('mb-1.5 flex items-center gap-1 text-[13px] font-medium text-adm-fg', className)}>
      {children}
      {required && <span className="text-danger" aria-hidden>*</span>}
      {optional && <span className="font-normal text-adm-subtle">{typeof optional === 'string' ? optional : '(opsional)'}</span>}
    </label>
  );
}

export type FieldProps = {
  label?: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  optional?: boolean | string;
  /** Aksi kecil di kanan label (mis. tautan) */
  labelAction?: ReactNode;
  className?: string;
  children: ReactNode;
};

/** Pembungkus field: label di atas, kontrol, lalu petunjuk/error di bawah. */
export function Field({ label, htmlFor, hint, error, required, optional, labelAction, className, children }: FieldProps) {
  return (
    <div className={cn('min-w-0', className)}>
      {label && (
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={htmlFor} required={required} optional={optional}>
            {label}
          </Label>
          {labelAction}
        </div>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-adm-danger-fg" role="alert">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs leading-relaxed text-adm-muted">{hint}</p>
      )}
    </div>
  );
}

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  controlSize?: ControlSize;
  invalid?: boolean;
  leftIcon?: IconLike;
  rightIcon?: IconLike;
  /** Elemen interaktif di kanan (tombol) */
  rightSlot?: ReactNode;
  mono?: boolean;
  wrapperClassName?: string;
  ref?: Ref<HTMLInputElement>;
};

export function Input({ controlSize = 'md', invalid, leftIcon, rightIcon, rightSlot, mono, className, wrapperClassName, ref, ...props }: InputProps) {
  const hasRight = !!(rightIcon || rightSlot);
  return (
    <div className={cn('group relative min-w-0', wrapperClassName)}>
      {leftIcon && (
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-adm-subtle transition-colors group-focus-within:text-cobalt">
          {renderIcon(leftIcon, 'h-[18px] w-[18px]')}
        </span>
      )}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          CONTROL_BASE,
          CONTROL_SIZES[controlSize],
          CONTROL_STATE[invalid ? 'error' : 'default'],
          leftIcon ? 'pl-10' : 'pl-3.5',
          hasRight ? 'pr-11' : 'pr-3.5',
          mono && 'font-mono tracking-wide',
          className,
        )}
        {...props}
      />
      {hasRight && (
        <span className={cn('absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1', !rightSlot && 'pointer-events-none')}>
          {rightIcon && <span className="pointer-events-none px-1 text-adm-subtle">{renderIcon(rightIcon, 'h-[18px] w-[18px]')}</span>}
          {rightSlot}
        </span>
      )}
    </div>
  );
}

/** Input kata sandi dengan tombol tampilkan/sembunyikan. `show` + `onShowChange` → terkontrol oleh halaman. */
export function PasswordInput({
  ref,
  show: showProp,
  onShowChange,
  ...props
}: Omit<InputProps, 'type' | 'rightSlot'> & { show?: boolean; onShowChange?: (show: boolean) => void }) {
  const [inner, setInner] = useState(false);
  const show = showProp ?? inner;
  const setShow = (fn: (s: boolean) => boolean) => {
    const next = fn(show);
    if (showProp === undefined) setInner(next);
    onShowChange?.(next);
  };
  return (
    <Input
      ref={ref}
      type={show ? 'text' : 'password'}
      autoComplete={props.autoComplete || 'current-password'}
      rightSlot={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          disabled={props.disabled}
          className={cn(
            'relative flex h-8 w-8 items-center justify-center rounded-lg text-adm-muted transition-colors hover:bg-adm-hover hover:text-adm-fg disabled:opacity-40',
            'max-sm:before:absolute max-sm:before:-inset-1.5',
            FOCUS_INSET,
          )}
          aria-label={show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
          aria-pressed={show}
        >
          {show ? <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.75} /> : <Eye className="h-[18px] w-[18px]" strokeWidth={1.75} />}
        </button>
      }
      {...props}
    />
  );
}

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> & {
  controlSize?: ControlSize;
  invalid?: boolean;
  leftIcon?: IconLike;
  wrapperClassName?: string;
  ref?: Ref<HTMLSelectElement>;
};

/** Select bawaan browser dengan gaya kontrol + chevron. Opsi pakai <option> biasa. */
export function Select({ controlSize = 'md', invalid, leftIcon, className, wrapperClassName, children, ref, ...props }: SelectProps) {
  return (
    <div className={cn('group relative min-w-0', wrapperClassName)}>
      {leftIcon && (
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-adm-subtle group-focus-within:text-cobalt">{renderIcon(leftIcon, 'h-[18px] w-[18px]')}</span>
      )}
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          CONTROL_BASE,
          CONTROL_SIZES[controlSize],
          CONTROL_STATE[invalid ? 'error' : 'default'],
          'cursor-pointer appearance-none pr-10 [&>option]:bg-adm-surface [&>option]:text-adm-fg',
          leftIcon ? 'pl-10' : 'pl-3.5',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-adm-subtle" strokeWidth={1.75} aria-hidden />
    </div>
  );
}

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean; ref?: Ref<HTMLTextAreaElement> };

export function Textarea({ invalid, className, ref, ...props }: TextareaProps) {
  return <textarea ref={ref} aria-invalid={invalid || undefined} className={textareaClass(invalid, className)} {...props} />;
}

export type SearchInputProps = Omit<InputProps, 'leftIcon' | 'type'> & { onClear?: () => void };

/** Kotak cari: ikon kaca pembesar + tombol hapus bila ada isi. */
export function SearchInput({ onClear, value, controlSize = 'md', placeholder = 'Cari…', className, ...props }: SearchInputProps) {
  const hasValue = value != null && String(value).length > 0;
  return (
    <Input
      type="search"
      leftIcon={<Search />}
      value={value}
      controlSize={controlSize}
      placeholder={placeholder}
      className={cn('[&::-webkit-search-cancel-button]:hidden', className)}
      rightSlot={
        onClear && hasValue ? (
          <button
            type="button"
            onClick={onClear}
            aria-label="Hapus pencarian"
            className={cn('relative flex h-7 w-7 items-center justify-center rounded-lg text-adm-subtle hover:bg-adm-hover hover:text-adm-fg max-sm:before:absolute max-sm:before:-inset-2', FOCUS_INSET)}
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        ) : undefined
      }
      {...props}
    />
  );
}

export type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  size?: 'sm' | 'md';
  id?: string;
  className?: string;
};

/** Saklar on/off (role="switch"). Area sentuh diperluas. */
export function Switch({ checked, onChange, label, description, disabled, size = 'md', id, className }: SwitchProps) {
  const autoId = useId();
  const sid = id || autoId;
  const track = size === 'sm' ? 'h-5 w-9' : 'h-6 w-11';
  const knob = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const move = size === 'sm' ? 'translate-x-4' : 'translate-x-5';
  const btn = (
    <button
      id={sid}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex shrink-0 items-center rounded-full p-0.5 transition-colors duration-150 before:absolute before:-inset-2.5 disabled:cursor-not-allowed disabled:opacity-50',
        track,
        checked ? 'bg-cobalt' : 'bg-adm-ghost-hover ring-1 ring-inset ring-adm-line-strong',
        FOCUS_INSET,
        'focus-visible:ring-offset-2 focus-visible:ring-offset-adm-surface',
      )}
    >
      <span className={cn('inline-block rounded-full bg-white transition-transform duration-150', knob, checked ? move : 'translate-x-0')} />
    </button>
  );
  if (!label) return <span className={className}>{btn}</span>;
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <label htmlFor={sid} className="min-w-0 cursor-pointer">
        <span className="block text-sm font-medium text-adm-fg">{label}</span>
        {description && <span className="mt-0.5 block text-xs leading-relaxed text-adm-muted">{description}</span>}
      </label>
      {btn}
    </div>
  );
}


export default Input;
