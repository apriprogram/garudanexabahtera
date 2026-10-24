import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { controlClass } from '../../../components/admin/ui';
import { PROJECT_MAX_TOOLS, PROJECT_TOOL_MAX, projectTools } from '../../../components/sections/projects/portfolio';

/** Tools yang sering dipakai: satu klik untuk menambah. */
const SUGGESTIONS = ['React JS', 'Next.js', 'Vue.js', 'Laravel', 'Node.js', 'Flutter', 'React Native', 'Tailwind CSS', 'MySQL', 'Figma'];

const lower = (text: string) => text.toLowerCase();

/**
 * Isian tools / teknologi proyek: chip yang bisa dihapus + kolom ketik (Enter atau koma menambah, Backspace di kolom
 * kosong menghapus chip terakhir) + saran cepat. Nama dirapikan seperti backend (projectTools: maks. 12, tanpa kembar).
 */
const ToolsField: React.FC<{ id: string; tools: string[]; onChange: (tools: string[]) => void; describedBy?: string }> = ({
  id,
  tools,
  onChange,
  describedBy,
}) => {
  const [text, setText] = useState('');
  const full = tools.length >= PROJECT_MAX_TOOLS;

  const add = (raw: string) => {
    const names = raw.split(',');
    if (names.every((name) => !name.trim())) return;
    onChange(projectTools([...tools, ...names]));
    setText('');
  };
  const remove = (index: number) => onChange(tools.filter((_, i) => i !== index));
  const suggestions = SUGGESTIONS.filter((name) => !tools.some((tool) => lower(tool) === lower(name)));

  return (
    <div className="space-y-2.5">
      <div className={controlClass('md', false, 'flex h-auto min-h-11 flex-wrap items-center gap-1.5 px-2 py-1.5 focus-within:border-cobalt focus-within:ring-1 focus-within:ring-cobalt')}>
        {tools.map((tool, index) => (
          <span key={tool} className="inline-flex h-7 max-w-full items-center gap-1 rounded-lg bg-adm-cobalt-soft pl-2.5 pr-1 text-[13px] font-medium text-adm-cobalt-fg">
            <span className="truncate">{tool}</span>
            <button
              type="button"
              onClick={() => remove(index)}
              aria-label={`Hapus ${tool}`}
              className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-md hover:bg-cobalt/15 after:absolute after:-inset-2"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            </button>
          </span>
        ))}
        <input
          id={id}
          type="text"
          value={text}
          disabled={full}
          maxLength={PROJECT_TOOL_MAX * 3}
          aria-describedby={describedBy}
          onChange={(event) => {
            const value = event.target.value;
            // Koma (juga dari tempel "React, Laravel") langsung menjadi chip
            if (value.includes(',')) add(value);
            else setText(value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add(text);
            } else if (event.key === 'Backspace' && text === '' && tools.length > 0) {
              remove(tools.length - 1);
            }
          }}
          onBlur={() => add(text)}
          placeholder={full ? `Maksimal ${PROJECT_MAX_TOOLS} tools` : tools.length ? 'Tambah lagi…' : 'mis. React JS, lalu Enter'}
          className="h-8 min-w-[10rem] flex-1 border-0 bg-transparent px-1 text-sm text-adm-fg outline-none placeholder:text-adm-subtle disabled:cursor-not-allowed max-sm:text-[16px]"
        />
      </div>
      {!full && suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Saran tools">
          {suggestions.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => onChange(projectTools([...tools, name]))}
              className="relative inline-flex h-7 items-center gap-1 rounded-lg px-2 text-xs font-medium text-adm-muted ring-1 ring-inset ring-adm-line transition-colors hover:bg-adm-hover hover:text-adm-fg after:absolute after:inset-x-0 after:-inset-y-1"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ToolsField;
