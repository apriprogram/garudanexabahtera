import React, { useId, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { TINT } from './catalog';

interface TemplateSearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  /** Akses ke kolom isian, mis. untuk mengembalikan fokus setelah tombol reset di luar kotak ini hilang */
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

/**
 * Kolom cari template besar dengan tombol bulat biru di kanan (beranda #templates dan katalog /template, permintaan
 * pemilik 2026-10-24: tampilan sama). Hasil tersaring saat mengetik; Esc mengosongkan; di layar sentuh "Cari" menutup
 * keyboard agar hasilnya terlihat.
 */
export function TemplateSearchBox({ value, onChange, className = '', inputRef: externalRef }: TemplateSearchBoxProps) {
  const inputId = useId();
  const ownRef = useRef<HTMLInputElement>(null);
  const inputRef = externalRef ?? ownRef;

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (window.matchMedia?.('(pointer: coarse)').matches) inputRef.current?.blur();
  };

  return (
    <form
      role="search"
      aria-label="Cari template"
      onSubmit={onSubmit}
      className={`flex h-12 items-center gap-1 rounded-full pr-1.5 ring-1 ring-inset ring-transparent transition-[background-color,box-shadow,outline-color] focus-within:bg-surface focus-within:ring-primary focus-within:outline-4 focus-within:outline-brand-100 sm:h-14 sm:pr-2 [&:not(:focus-within):hover]:bg-fg/7 ${className} ${TINT}`}
    >
      <label htmlFor={inputId} className="sr-only">
        Cari template
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && value) {
            event.preventDefault();
            onChange('');
          }
        }}
        placeholder="Cari template website…"
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
        // placeholder text-muted: ±6,8:1 di atas isian abu (text-subtle hanya ±4,3:1, di bawah WCAG AA)
        className="h-full min-w-0 flex-1 rounded-full bg-transparent pl-5 text-[16px] text-fg outline-none placeholder:text-muted focus-visible:outline-none sm:pl-7 [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange('');
            inputRef.current?.focus();
          }}
          aria-label="Hapus pencarian"
          className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-subtle transition-colors before:absolute before:-inset-1.5 hover:bg-line hover:text-fg"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
      <button
        type="submit"
        aria-label="Cari"
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary-hover active:bg-brand-800 max-sm:before:absolute max-sm:before:-inset-1 sm:h-11 sm:w-11"
      >
        <Search className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
      </button>
    </form>
  );
}

export default TemplateSearchBox;
