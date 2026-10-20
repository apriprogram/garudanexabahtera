// Field list CMS (layanan, testimoni, galeri, ...): tambah, hapus (dengan Urungkan lewat toast), urutkan naik/turun,
// batas maksimal, dan tiap item bisa diciutkan. Kunci React tiap item stabil walau item diedit/dipindah.
import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from 'lucide-react';
import type { ListItem, TemplateListField } from '../../../templates/types';
import { CmsField } from './CmsField';
import { emptyListItem, fieldDomId, fieldPath, itemSummary } from './content';
import type { ContentErrors } from './validation';

// Kunci stabil per objek item. Item yang diedit diberi kunci item lamanya; item yang dipulihkan (Urungkan)
// adalah objek yang sama sehingga kuncinya kembali.
const ITEM_KEYS = new WeakMap<ListItem, number>();
let lastKey = 0;
function keyOf(item: ListItem): number {
  let key = ITEM_KEYS.get(item);
  if (key === undefined) {
    lastKey += 1;
    key = lastKey;
    ITEM_KEYS.set(item, key);
  }
  return key;
}
function inheritKey(from: ListItem, to: ListItem): ListItem {
  ITEM_KEYS.set(to, keyOf(from));
  return to;
}

interface ListFieldEditorProps {
  sectionKey: string;
  field: TemplateListField;
  items: ListItem[];
  onChange: (items: ListItem[]) => void;
  /** Dipanggil setelah item dihapus (untuk toast "Urungkan") */
  onRemoved: (item: ListItem, index: number) => void;
  errors: ContentErrors;
  onBlurPath: (path: string) => void;
  disabled?: boolean;
}

const iconButton =
  'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-subtle transition-colors after:absolute after:-inset-1 hover:bg-alt hover:text-fg disabled:pointer-events-none disabled:opacity-35 max-sm:h-8 max-sm:w-8';

export function ListFieldEditor({ sectionKey, field, items, onChange, onRemoved, errors, onBlurPath, disabled }: ListFieldEditorProps) {
  const [openKeys, setOpenKeys] = useState<Set<number>>(() => new Set());
  const focusPath = useRef<string | null>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const label = field.itemLabel.toLowerCase();
  const max = field.max ?? Infinity;
  const atMax = items.length >= max;
  const listId = fieldDomId(fieldPath(sectionKey, field.key));
  const listError = errors[fieldPath(sectionKey, field.key)];

  // Fokus ke field pertama item baru setelah item itu dirender
  useEffect(() => {
    if (!focusPath.current) return;
    document.getElementById(fieldDomId(focusPath.current))?.focus();
    focusPath.current = null;
  }, [items.length]);

  const toggle = (key: number) =>
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const add = () => {
    if (atMax) return;
    const item = emptyListItem(field);
    setOpenKeys((prev) => new Set(prev).add(keyOf(item)));
    onChange([...items, item]);
    const first = field.fields[0];
    if (first) focusPath.current = fieldPath(sectionKey, field.key, items.length, first.key);
  };

  const update = (index: number, key: string, value: string) =>
    onChange(items.map((item, i) => (i === index ? inheritKey(item, { ...item, [key]: value }) : item)));

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const remove = (index: number) => {
    const item = items[index];
    onChange(items.filter((_, i) => i !== index));
    onRemoved(item, index);
    // Fokus pindah ke tombol tambah agar pengguna keyboard tidak kehilangan posisi
    requestAnimationFrame(() => addRef.current?.focus());
  };

  return (
    <fieldset aria-describedby={listError ? `${listId}-error` : undefined}>
      <legend className="flex w-full items-baseline justify-between gap-3">
        <span className="label-site mb-0">{field.label}</span>
        <span className="text-xs tabular-nums text-subtle">
          {items.length}
          {Number.isFinite(max) ? `/${max}` : ''}
        </span>
      </legend>

      {items.length === 0 ? (
        <p className="mt-2 rounded-2xl border border-dashed border-line-strong bg-alt px-4 py-5 text-center text-sm text-muted">
          Belum ada {label}. Klik "Tambah {label}" untuk menambahkan.
        </p>
      ) : (
        <ol className="mt-2 space-y-2">
          {items.map((item, index) => {
            const key = keyOf(item);
            const itemErrors = field.fields.filter((sub) => errors[fieldPath(sectionKey, field.key, index, sub.key)]).length;
            const open = openKeys.has(key) || itemErrors > 0;
            const summary = itemSummary(field, item);
            const panelId = `${listId}-item-${key}`;
            const title = `${field.itemLabel} ${index + 1}`;
            return (
              <li key={key} className={`rounded-2xl bg-surface ring-1 ring-inset ${itemErrors ? 'ring-danger/50' : 'ring-line'}`}>
                <div className="flex min-h-12 items-center gap-0.5 pl-1.5 pr-1.5">
                  <button
                    type="button"
                    onClick={() => toggle(key)}
                    aria-expanded={open}
                    aria-controls={panelId}
                    className="flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-xl px-1.5 text-left"
                  >
                    <ChevronDown className={`h-4 w-4 shrink-0 text-subtle transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
                    <span className="shrink-0 text-sm font-medium text-fg">{title}</span>
                    {summary && <span className="min-w-0 truncate text-sm text-subtle">· {summary}</span>}
                    {itemErrors > 0 && (
                      <span className="ml-auto shrink-0 rounded-full bg-danger-50 px-2 py-0.5 text-[11px] font-medium text-danger-700">
                        {itemErrors} error
                      </span>
                    )}
                  </button>
                  <button type="button" onClick={() => move(index, -1)} disabled={disabled || index === 0} aria-label={`Pindahkan ${title} ke atas`} className={iconButton}>
                    <ArrowUp className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={disabled || index === items.length - 1}
                    aria-label={`Pindahkan ${title} ke bawah`}
                    className={iconButton}
                  >
                    <ArrowDown className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={disabled}
                    aria-label={`Hapus ${title}`}
                    className={`${iconButton} hover:bg-danger-50 hover:text-danger-700`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                {open && (
                  <div id={panelId} className="space-y-4 border-t border-line px-3 py-4 sm:px-4">
                    {field.fields.map((sub) => {
                      const path = fieldPath(sectionKey, field.key, index, sub.key);
                      return (
                        <CmsField
                          key={sub.key}
                          field={sub}
                          path={path}
                          value={typeof item[sub.key] === 'string' ? item[sub.key] : ''}
                          onChange={(value) => update(index, sub.key, value)}
                          onBlur={() => onBlurPath(path)}
                          error={errors[path]}
                          disabled={disabled}
                        />
                      );
                    })}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <button ref={addRef} type="button" onClick={add} disabled={disabled || atMax} className="btn btn-secondary btn-sm">
          <Plus className="h-4 w-4" aria-hidden />
          Tambah {label}
        </button>
        {atMax && Number.isFinite(max) && (
          <span className="text-xs text-subtle">
            Sudah mencapai batas {max} {label}.
          </span>
        )}
      </div>
      {listError && (
        <p id={`${listId}-error`} className="error-site">
          {listError}
        </p>
      )}
    </fieldset>
  );
}
