// Editor tabel bagian dokumen (DocTable: columns + rows). Tabel "Label : isi" (semua judul kolom kosong) dirender
// tanpa garis di dokumen; kolomnya tetap dua. Sel boleh memakai **tebal**, *miring*, dan field {{...}}.
import { useState } from 'react';
import { ArrowDown, ArrowUp, Columns3, Plus, Trash2, X } from 'lucide-react';
import { Button, ConfirmDialog, IconButton, cn, textareaClass } from '../../../../components/admin/ui';
import type { DocTable } from '../../../../features/project-docs/types';

const MAX_COLUMNS = 10;
const MAX_ROWS = 200;
const CELL = textareaClass(false, 'min-h-[40px] resize-y rounded-lg px-2.5 py-2 text-[13px] leading-snug max-sm:text-[16px]');

const isKeyValueTable = (t: DocTable) => t.columns.length === 2 && t.columns.every((c) => c === '');

/** Teks pendek untuk judul dialog hapus: isi sel pertama yang terisi (tanpa tanda markup). */
const shortText = (cells: string[]) => (cells.find((v) => v.trim()) ?? '').replace(/\*+|\{\{#?[^}]*\}\}/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 50);

export function TableEditor({ table, onChange, disabled, label }: { table: DocTable; onChange: (t: DocTable) => void; disabled?: boolean; label: string }) {
  // Baris/kolom yang akan dihapus: ditanya dulu walau baru tersimpan saat draft disimpan
  const [toRemove, setToRemove] = useState<{ kind: 'row' | 'column'; index: number } | null>(null);
  const kv = isKeyValueTable(table);
  const cols = table.columns.length;
  const setCell = (r: number, c: number, value: string) => onChange({ ...table, rows: table.rows.map((row, i) => (i === r ? row.map((cell, j) => (j === c ? value : cell)) : row)) });
  const setColumn = (c: number, value: string) => onChange({ ...table, columns: table.columns.map((col, j) => (j === c ? value : col)) });
  const addRow = () => onChange({ ...table, rows: [...table.rows, Array.from({ length: cols }, () => '')] });
  const removeRow = (r: number) => onChange({ ...table, rows: table.rows.filter((_, i) => i !== r) });
  const moveRow = (r: number, dir: -1 | 1) => {
    const rows = [...table.rows];
    [rows[r], rows[r + dir]] = [rows[r + dir], rows[r]];
    onChange({ ...table, rows });
  };
  const addColumn = () => onChange({ columns: [...table.columns, `Kolom ${cols + 1}`], rows: table.rows.map((row) => [...row, '']) });
  const removeColumn = (c: number) => onChange({ columns: table.columns.filter((_, j) => j !== c), rows: table.rows.map((row) => row.filter((_, j) => j !== c)) });
  const grid = { gridTemplateColumns: `repeat(${cols}, minmax(150px, 1fr)) 104px` };
  const removeName = !toRemove ? '' : toRemove.kind === 'row' ? shortText(table.rows[toRemove.index] ?? []) : shortText([table.columns[toRemove.index] ?? '']);
  const removeLabel = toRemove?.kind === 'column' ? 'kolom' : 'baris';

  return (
    <div className="rounded-xl ring-1 ring-inset ring-adm-line">
      <div className="overflow-x-auto overscroll-x-contain p-2" role="group" aria-label={label}>
        <div className="grid min-w-max gap-1.5" style={grid}>
          {/* Judul kolom */}
          {kv ? (
            <>
              <span className="px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-adm-subtle">Label</span>
              <span className="px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-adm-subtle">Isi</span>
            </>
          ) : (
            table.columns.map((col, c) => (
              <div key={c} className="flex items-center gap-1">
                <input
                  aria-label={`Judul kolom ${c + 1}`}
                  value={col}
                  maxLength={120}
                  onChange={(e) => setColumn(c, e.target.value)}
                  disabled={disabled}
                  className="h-9 min-w-0 flex-1 rounded-lg bg-adm-ghost px-2.5 text-[12px] font-semibold uppercase tracking-[0.04em] text-adm-muted outline-none focus:ring-2 focus:ring-cobalt disabled:opacity-70"
                />
                {!disabled && cols > 1 && <IconButton icon={<X />} label={`Hapus kolom ${c + 1}`} size="xs" onClick={() => setToRemove({ kind: 'column', index: c })} />}
              </div>
            ))
          )}
          <span aria-hidden />

          {/* Baris */}
          {table.rows.map((row, r) => (
            <div key={r} className="contents">
              {Array.from({ length: cols }, (_, c) => (
                <textarea
                  key={c}
                  rows={1}
                  aria-label={`Baris ${r + 1}, ${kv ? (c === 0 ? 'label' : 'isi') : table.columns[c] || `kolom ${c + 1}`}`}
                  value={row[c] ?? ''}
                  onChange={(e) => setCell(r, c, e.target.value)}
                  disabled={disabled}
                  className={cn(CELL, kv && c === 0 && 'font-medium')}
                />
              ))}
              <div className="flex items-start justify-end gap-0.5 pt-1">
                {!disabled && (
                  <>
                    <IconButton icon={<ArrowUp />} label={`Naikkan baris ${r + 1}`} size="xs" onClick={() => moveRow(r, -1)} disabled={r === 0} />
                    <IconButton icon={<ArrowDown />} label={`Turunkan baris ${r + 1}`} size="xs" onClick={() => moveRow(r, 1)} disabled={r === table.rows.length - 1} />
                    <IconButton icon={<Trash2 />} label={`Hapus baris ${r + 1}`} size="xs" variant="danger-ghost" onClick={() => setToRemove({ kind: 'row', index: r })} />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
        {table.rows.length === 0 && <p className="px-1 py-3 text-[13px] text-adm-muted">Tabel belum punya baris.</p>}
      </div>
      {!disabled && (
        <div className="flex flex-wrap gap-2 border-t border-adm-line p-2">
          <Button size="sm" variant="ghost" icon={<Plus />} onClick={addRow} disabled={table.rows.length >= MAX_ROWS}>
            Tambah baris
          </Button>
          {!kv && (
            <Button size="sm" variant="ghost" icon={<Columns3 />} onClick={addColumn} disabled={cols >= MAX_COLUMNS}>
              Tambah kolom
            </Button>
          )}
        </div>
      )}
      <ConfirmDialog
        open={!!toRemove}
        onClose={() => setToRemove(null)}
        onConfirm={() => {
          if (toRemove?.kind === 'row') removeRow(toRemove.index);
          else if (toRemove) removeColumn(toRemove.index);
          setToRemove(null);
        }}
        tone="danger"
        title={removeName ? `Hapus ${removeLabel} "${removeName}"?` : `Hapus ${removeLabel} ${(toRemove?.index ?? 0) + 1}?`}
        description={toRemove?.kind === 'column' ? 'Judul kolom dan isinya di semua baris dihapus dari tabel draft.' : 'Semua isi sel di baris ini dihapus dari tabel draft.'}
        confirmText="Ya, hapus"
      />
    </div>
  );
}
