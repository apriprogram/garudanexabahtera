// Editor bagian dokumen (DocContent.sections): judul, isi dengan markup, tabel, sembunyikan/tampilkan, urutkan,
// tambah dan hapus. Petunjuk per bagian dari SECTION_HINTS engine.
import { useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, Eye, EyeOff, Lightbulb, Plus, Table2, Trash2 } from 'lucide-react';
import { Badge, Button, ConfirmDialog, Field, IconButton, Input, Textarea, cn } from '../../../../components/admin/ui';
import type { DocSection } from '../../../../features/project-docs/types';
import { TableEditor } from './TableEditor';

/** First words of a body, for the collapsed row of a section without a title. */
const excerpt = (s: DocSection) => (s.body ?? '').replace(/\{\{#?[^}]*\}\}|\*+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 70);

export function SectionsEditor({
  sections,
  onChange,
  hints,
  disabled,
  onBodyFocus,
}: {
  sections: DocSection[];
  onChange: (sections: DocSection[]) => void;
  hints: Record<string, string>;
  disabled?: boolean;
  /** remembers the textarea that receives tokens from the markup help */
  onBodyFocus: (sectionId: string, el: HTMLTextAreaElement) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(sections[0] ? [sections[0].id] : []));
  const [toDelete, setToDelete] = useState<DocSection | null>(null);
  const allOpen = sections.length > 0 && sections.every((s) => expanded.has(s.id));

  const update = (id: string, patch: Partial<DocSection>) => onChange(sections.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const move = (index: number, dir: -1 | 1) => {
    const next = [...sections];
    [next[index], next[index + dir]] = [next[index + dir], next[index]];
    onChange(next);
  };
  const add = () => {
    const used = new Set(sections.map((s) => s.id));
    let n = sections.length + 1;
    while (used.has(`bagian_${n}`)) n += 1;
    const id = `bagian_${n}`;
    onChange([...sections, { id, title: 'Bagian baru', body: '' }]);
    setExpanded((prev) => new Set(prev).add(id));
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[13px] text-adm-muted">
          {sections.length} bagian{sections.some((s) => s.hidden) ? ` · ${sections.filter((s) => s.hidden).length} disembunyikan` : ''}
        </p>
        <Button size="sm" variant="ghost" onClick={() => setExpanded(allOpen ? new Set() : new Set(sections.map((s) => s.id)))}>
          {allOpen ? 'Tutup semua' : 'Buka semua'}
        </Button>
      </div>

      <ol className="space-y-2">
        {sections.map((s, i) => {
          const open = expanded.has(s.id);
          const hint = hints[s.id];
          const label = s.title.trim() || excerpt(s) || '(tanpa judul)';
          return (
            <li key={s.id} className={cn('rounded-2xl ring-1 ring-inset ring-adm-line', s.hidden ? 'bg-adm-ghost' : 'bg-adm-surface')}>
              <div className="flex items-center gap-1 py-1.5 pl-2 pr-1.5">
                <button
                  type="button"
                  onClick={() => toggle(s.id)}
                  aria-expanded={open}
                  className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt"
                >
                  <span className="w-6 shrink-0 text-right font-mono text-[11px] text-adm-subtle">{String(i + 1).padStart(2, '0')}</span>
                  <span className={cn('min-w-0 flex-1 truncate text-[13px] sm:text-sm', s.title.trim() ? 'font-semibold text-adm-fg' : 'italic text-adm-muted', s.hidden && 'line-through decoration-adm-subtle')}>
                    {label}
                  </span>
                  {s.table && (
                    <Badge tone="mist" size="sm" dot={false} icon={<Table2 />} className="max-sm:hidden">
                      Tabel
                    </Badge>
                  )}
                  {s.hidden && (
                    <Badge tone="warning" size="sm" dot={false}>
                      Disembunyikan
                    </Badge>
                  )}
                  <ChevronDown className={cn('h-4 w-4 shrink-0 text-adm-subtle transition-transform', open && 'rotate-180')} strokeWidth={1.75} aria-hidden />
                </button>
                {!disabled && (
                  <div className="flex shrink-0 items-center">
                    <IconButton icon={<ArrowUp />} label={`Naikkan bagian ${i + 1}`} size="xs" onClick={() => move(i, -1)} disabled={i === 0} className="max-sm:hidden" />
                    <IconButton icon={<ArrowDown />} label={`Turunkan bagian ${i + 1}`} size="xs" onClick={() => move(i, 1)} disabled={i === sections.length - 1} className="max-sm:hidden" />
                    <IconButton
                      icon={s.hidden ? <EyeOff /> : <Eye />}
                      label={s.hidden ? `Tampilkan bagian ${i + 1}` : `Sembunyikan bagian ${i + 1}`}
                      size="xs"
                      onClick={() => update(s.id, { hidden: !s.hidden })}
                    />
                  </div>
                )}
              </div>

              {open && (
                <div className="space-y-3 border-t border-adm-line px-3 pb-3 pt-3 sm:px-4">
                  {hint && (
                    <p className="flex gap-2 rounded-xl bg-adm-cobalt-soft px-3 py-2 text-xs leading-relaxed text-adm-cobalt-fg">
                      <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                      {hint}
                    </p>
                  )}
                  <Field label="Judul bagian" htmlFor={`sec-title-${s.id}`} hint="Kosongkan bila bagian ini tanpa judul. Awali dengan Pasal untuk gaya pasal.">
                    <Input id={`sec-title-${s.id}`} value={s.title} maxLength={255} onChange={(e) => update(s.id, { title: e.target.value })} disabled={disabled} controlSize="sm" />
                  </Field>
                  <Field label="Isi" htmlFor={`sec-body-${s.id}`}>
                    <Textarea
                      id={`sec-body-${s.id}`}
                      value={s.body ?? ''}
                      rows={Math.min(16, Math.max(4, (s.body ?? '').split('\n').length + 1))}
                      onChange={(e) => update(s.id, { body: e.target.value })}
                      onFocus={(e) => onBodyFocus(s.id, e.currentTarget)}
                      onSelect={(e) => onBodyFocus(s.id, e.currentTarget)}
                      disabled={disabled}
                      spellCheck
                      className="font-mono text-[13px] leading-relaxed max-sm:text-[16px]"
                      placeholder="Tulis isi bagian ini..."
                    />
                  </Field>
                  {s.table ? (
                    <div>
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="text-[13px] font-medium text-adm-fg">Tabel</span>
                        {!disabled && (
                          <Button size="sm" variant="ghost" icon={<Trash2 />} onClick={() => update(s.id, { table: undefined })}>
                            Hapus tabel
                          </Button>
                        )}
                      </div>
                      <TableEditor table={s.table} onChange={(table) => update(s.id, { table })} disabled={disabled} label={`Tabel bagian ${label}`} />
                    </div>
                  ) : (
                    !disabled && (
                      <Button size="sm" variant="ghost" icon={<Table2 />} onClick={() => update(s.id, { table: { columns: ['Kolom 1', 'Kolom 2'], rows: [['', '']] } })}>
                        Tambah tabel
                      </Button>
                    )
                  )}
                  {!disabled && (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-adm-line pt-3">
                      <div className="flex gap-1 sm:hidden">
                        <IconButton icon={<ArrowUp />} label={`Naikkan bagian ${i + 1}`} size="sm" variant="secondary" onClick={() => move(i, -1)} disabled={i === 0} />
                        <IconButton icon={<ArrowDown />} label={`Turunkan bagian ${i + 1}`} size="sm" variant="secondary" onClick={() => move(i, 1)} disabled={i === sections.length - 1} />
                      </div>
                      <Button size="sm" variant="danger-soft" icon={<Trash2 />} onClick={() => setToDelete(s)} className="ml-auto">
                        Hapus bagian
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {!disabled && (
        <Button variant="secondary" size="sm" icon={<Plus />} onClick={add} className="mt-3" disabled={sections.length >= 100}>
          Tambah bagian
        </Button>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) onChange(sections.filter((s) => s.id !== toDelete.id));
          setToDelete(null);
        }}
        tone="danger"
        title="Hapus bagian?"
        description={
          <>
            Bagian <span className="font-semibold text-adm-fg">"{toDelete?.title || excerpt(toDelete ?? { id: '', title: '' }) || 'tanpa judul'}"</span> dihapus dari draft. Kalau
            berubah pikiran, pulihkan versi sebelumnya dari riwayat revisi atau sembunyikan saja bagiannya.
          </>
        }
        confirmText="Ya, hapus"
      />
    </div>
  );
}
