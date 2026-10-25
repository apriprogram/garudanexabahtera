// Pilihan ekstensi domain di form /pesan/:slug: dropdown bergaya situs sebagai pengganti <select> bawaan (popup sistemnya
// tidak bisa diberi gaya; permintaan pemilik 2026-10-25). Pola WAI-ARIA "select-only combobox": tombol role="combobox"
// memegang fokus, daftar role="listbox" dengan aria-activedescendant. Keyboard: ↑/↓/Home/End memindah sorotan (membuka
// daftar bila tertutup), Enter/Spasi memilih, Esc/Tab menutup, huruf melompat ke ekstensi berawalan huruf itu.
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { DomainTld } from '../../../lib/domainPricing';

interface TldSelectProps {
  id: string;
  /** id elemen label (aria-labelledby) */
  labelId: string;
  value: string;
  tlds: readonly DomainTld[];
  disabled: boolean;
  onChange: (tld: string) => void;
}

export function TldSelect({ id, labelId, value, tlds, disabled, onChange }: TldSelectProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = `${id}-list`;
  const optionId = (i: number) => `${id}-opt-${i}`;
  const selectedIndex = Math.max(0, tlds.findIndex((t) => t.tld === value));
  const current = tlds[selectedIndex]?.tld ?? value;

  // Klik/ketuk di luar menutup daftar
  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  // Opsi yang disorot selalu terlihat di daftar yang bisa digulir
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [open, active]);

  const openAt = (index: number) => {
    setActive(Math.min(Math.max(index, 0), tlds.length - 1));
    setOpen(true);
  };

  const choose = (index: number) => {
    const tld = tlds[index];
    setOpen(false);
    if (tld && tld.tld !== value) onChange(tld.tld);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || tlds.length === 0) return;
    const last = tlds.length - 1;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (open) setActive((i) => Math.min(i + 1, last));
        else openAt(selectedIndex);
        return;
      case 'ArrowUp':
        e.preventDefault();
        if (open) setActive((i) => Math.max(i - 1, 0));
        else openAt(selectedIndex);
        return;
      case 'Home':
        e.preventDefault();
        openAt(0);
        return;
      case 'End':
        e.preventDefault();
        openAt(last);
        return;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (open) choose(active);
        else openAt(selectedIndex);
        return;
      case 'Escape':
        if (open) {
          e.preventDefault();
          setOpen(false);
        }
        return;
      case 'Tab':
        setOpen(false);
        return;
      default:
        // Ketik huruf: lompat ke ekstensi berikutnya yang diawali huruf itu
        if (e.key.length === 1 && /[a-z0-9]/i.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const from = open ? active : selectedIndex;
          const key = e.key.toLowerCase();
          const order = [...tlds.keys()].map((n) => (from + 1 + n) % tlds.length);
          const hit = order.find((n) => tlds[n].tld.startsWith(key));
          if (hit !== undefined) {
            e.preventDefault();
            if (open) setActive(hit);
            else choose(hit);
          }
        }
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={labelId}
        aria-activedescendant={open ? optionId(active) : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openAt(selectedIndex))}
        onKeyDown={onKeyDown}
        className={`input-site flex w-full cursor-pointer items-center justify-between gap-2 text-left disabled:cursor-not-allowed ${
          open ? 'ring-2 ring-primary/30' : ''
        }`}
      >
        <span className="truncate font-medium text-fg">.{current}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-subtle transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-labelledby={labelId}
          className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 min-w-[9rem] overflow-y-auto overscroll-contain rounded-2xl bg-surface p-1.5 shadow-float ring-1 ring-line"
        >
          {tlds.map((t, i) => {
            const selected = i === selectedIndex;
            return (
              <li
                key={t.tld}
                id={optionId(i)}
                role="option"
                aria-selected={selected}
                // Fokus tetap di tombol (pointerdown tidak memindahkan fokus); pilihan dijalankan saat klik
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => choose(i)}
                onMouseMove={() => {
                  if (active !== i) setActive(i);
                }}
                className={`flex h-10 cursor-pointer select-none items-center justify-between gap-3 rounded-xl px-3 text-sm transition-colors ${
                  selected ? 'font-semibold text-brand-700' : 'text-fg'
                } ${i === active ? (selected ? 'bg-brand-50' : 'bg-alt') : selected ? 'bg-brand-50/60' : ''}`}
              >
                .{t.tld}
                {selected && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
