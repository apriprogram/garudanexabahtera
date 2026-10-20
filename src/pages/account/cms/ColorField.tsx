// Field warna CMS: color picker + isian hex + pilihan warna cepat + kembali ke warna bawaan.
import { RotateCcw } from 'lucide-react';
import { fieldDomId } from './content';
import { describedBy } from './a11y';
import { FieldLabel, FieldMessage, type FieldControlProps } from './FieldControl';

// Pilihan cepat (isi konten pembeli, bukan token UI): biru Garuda Nexa + warna korporat yang kontras di latar putih
const PRESETS = ['#211FFE', '#0E7490', '#047857', '#B45309', '#B91C1C', '#7C3AED', '#BE185D', '#1F2937'];
const FALLBACK = '#211ffe';

/** "#abc" → "#aabbcc"; tidak valid → null. Nilai <input type="color"> wajib #rrggbb. */
function toPickerHex(raw: string): string | null {
  let value = raw.trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(value)) value = value.split('').map((c) => c + c).join('');
  return /^[0-9a-f]{6}$/i.test(value) ? `#${value.toLowerCase()}` : null;
}

export function ColorField({ field, path, value, onChange, onBlur, error, disabled, defaultValue }: FieldControlProps) {
  const id = fieldDomId(path);
  const pickerValue = toPickerHex(value) ?? toPickerHex(defaultValue ?? '') ?? FALLBACK;
  const canReset = (defaultValue ?? '') !== value;
  const current = toPickerHex(value);

  return (
    <div>
      <FieldLabel htmlFor={id} label={field.label} />
      <div className="flex flex-wrap items-center gap-2">
        <label
          className={`relative h-11 w-14 shrink-0 cursor-pointer overflow-hidden rounded-xl bg-surface ring-1 ring-inset ring-line-strong transition-colors hover:ring-subtle focus-within:ring-2 focus-within:ring-primary ${
            disabled ? 'pointer-events-none opacity-50' : ''
          }`}
        >
          <span className="sr-only">Pilih {field.label.toLowerCase()} dari palet</span>
          <input
            type="color"
            value={pickerValue}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          <span aria-hidden className="absolute inset-1.5 rounded-lg ring-1 ring-inset ring-black/10" style={{ backgroundColor: pickerValue }} />
        </label>
        <input
          id={id}
          type="text"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value.trim())}
          onBlur={onBlur}
          placeholder={defaultValue || '#211FFE'}
          maxLength={7}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, { help: field.help, error })}
          className="input-site w-32 font-mono uppercase"
        />
        {canReset && (
          <button type="button" onClick={() => onChange(defaultValue ?? '')} disabled={disabled} className="btn btn-ghost btn-sm">
            <RotateCcw className="h-4 w-4" aria-hidden />
            Pakai bawaan
          </button>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2.5" role="group" aria-label={`Pilihan cepat ${field.label.toLowerCase()}`}>
        {PRESETS.map((color) => {
          const active = current === color.toLowerCase();
          return (
            <button
              key={color}
              type="button"
              disabled={disabled}
              onClick={() => onChange(color)}
              aria-label={`Pakai warna ${color}`}
              aria-pressed={active}
              title={color}
              className={`relative h-8 w-8 rounded-full ring-offset-2 transition-transform after:absolute after:-inset-1.5 hover:scale-110 disabled:pointer-events-none disabled:opacity-50 ${
                active ? 'ring-2 ring-fg' : 'ring-1 ring-inset ring-black/10'
              }`}
              style={{ backgroundColor: color }}
            />
          );
        })}
      </div>
      <FieldMessage id={id} help={field.help} error={error} />
    </div>
  );
}
