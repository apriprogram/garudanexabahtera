// Satu field teks CMS: text, textarea (dengan penghitung karakter), url, email, phone.
// Gambar & warna punya komponen sendiri (ImageField, ColorField); dispatcher ada di CmsField.
import type { ReactNode } from 'react';
import type { TemplateField } from '../../../templates/types';
import { describedBy } from './a11y';
import { fieldDomId } from './content';
import { CharCount } from './ui';

export interface FieldControlProps {
  field: TemplateField;
  /** Path konten, mis. "hero.title" atau "services.items.0.title" */
  path: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  /** Nilai bawaan template (tombol "Pakai bawaan" pada gambar/warna) */
  defaultValue?: string;
}

// Isian berisi data bisnis di situs (bukan data pribadi pengisi), jadi autofill browser dimatikan
const INPUT_META: Partial<Record<TemplateField['type'], { type: string; inputMode: 'url' | 'email' | 'tel' }>> = {
  url: { type: 'text', inputMode: 'url' },
  email: { type: 'email', inputMode: 'email' },
  phone: { type: 'tel', inputMode: 'tel' },
};

/** Label + penghitung di kanan, dipakai semua tipe field. */
export function FieldLabel({ htmlFor, label, counter }: { htmlFor: string; label: string; counter?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <label htmlFor={htmlFor} className="label-site">
        {label}
      </label>
      {counter}
    </div>
  );
}

/** Teks bantuan atau pesan error di bawah field. */
export function FieldMessage({ id, help, error }: { id: string; help?: string; error?: string }) {
  if (error) {
    return (
      <p id={`${id}-error`} className="error-site">
        {error}
      </p>
    );
  }
  if (help) {
    return (
      <p id={`${id}-help`} className="help-site">
        {help}
      </p>
    );
  }
  return null;
}

export function FieldControl({ field, path, value, onChange, onBlur, error, disabled }: FieldControlProps) {
  const id = fieldDomId(path);
  const max = field.maxLength;
  const showCounter = !!max && (field.type === 'text' || field.type === 'textarea');
  const common = {
    id,
    name: path,
    value,
    disabled,
    placeholder: field.placeholder,
    maxLength: max,
    onBlur,
    'aria-invalid': error ? (true as const) : undefined,
    'aria-describedby': describedBy(id, { help: field.help, error, counter: showCounter }),
    className: 'input-site',
  };

  return (
    <div>
      <FieldLabel
        htmlFor={id}
        label={field.label}
        counter={showCounter && max ? <CharCount id={`${id}-count`} length={value.length} max={max} /> : undefined}
      />
      {field.type === 'textarea' ? (
        <textarea
          {...common}
          rows={max && max > 500 ? 6 : 3}
          onChange={(e) => onChange(e.target.value)}
          className="input-site resize-y"
        />
      ) : (
        <input
          {...common}
          type={INPUT_META[field.type]?.type ?? 'text'}
          inputMode={INPUT_META[field.type]?.inputMode}
          autoComplete="off"
          spellCheck={field.type === 'text' ? undefined : false}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      <FieldMessage id={id} help={field.help} error={error} />
    </div>
  );
}
