// Pilihan jenis layanan sebagai kartu besar (radio group): Website / Aplikasi Mobile.
import { Check, Globe, Smartphone, type LucideIcon } from 'lucide-react';
import type { ServiceType } from './validation';

const OPTIONS: { value: ServiceType; title: string; description: string; Icon: LucideIcon }[] = [
  {
    value: 'website',
    title: 'Website',
    description: 'Company profile, toko online, sistem informasi, atau aplikasi web sesuai kebutuhan.',
    Icon: Globe,
  },
  {
    value: 'mobile_app',
    title: 'Aplikasi Mobile',
    description: 'Aplikasi Android dan iOS untuk pelanggan, tim internal, atau layanan bisnis Anda.',
    Icon: Smartphone,
  },
];

interface ServiceTypePickerProps {
  id: string;
  value: ServiceType | '';
  onChange: (value: ServiceType) => void;
  error?: string;
  disabled?: boolean;
}

export function ServiceTypePicker({ id, value, onChange, error, disabled }: ServiceTypePickerProps) {
  return (
    <fieldset aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="label-site">Jenis layanan</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {OPTIONS.map(({ value: option, title, description, Icon }, index) => {
          const checked = value === option;
          return (
            <label
              key={option}
              className={`group relative flex cursor-pointer gap-3 rounded-2xl p-4 ring-inset transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary sm:flex-col sm:gap-4 sm:p-5 ${
                checked
                  ? 'bg-brand-50/60 ring-2 ring-primary'
                  : `bg-surface ring-1 ${error ? 'ring-danger' : 'ring-line-strong hover:ring-subtle'}`
              } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
            >
              <input
                // Kartu pertama membawa id agar label error & fokus otomatis mengarah ke grup ini
                id={index === 0 ? id : undefined}
                type="radio"
                name="service_type"
                value={option}
                checked={checked}
                disabled={disabled}
                onChange={() => onChange(option)}
                className="sr-only"
              />
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  checked ? 'bg-primary text-white' : 'bg-brand-50 text-primary'
                }`}
                aria-hidden
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1 pr-7 sm:pr-0">
                <span className="block text-base font-semibold text-fg">{title}</span>
                <span className="mt-1 block text-sm leading-relaxed text-muted">{description}</span>
              </span>
              <span
                aria-hidden
                className={`absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
                  checked ? 'bg-primary text-white' : 'bg-surface ring-1 ring-inset ring-line-strong'
                }`}
              >
                {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <p id={`${id}-error`} className="error-site">
          {error}
        </p>
      )}
    </fieldset>
  );
}
