import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Presence } from '../../ui/Presence';

interface SortMenuProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label?: string;
  disabled?: boolean;
}

/**
 * Tombol "Urutkan: …" + menu pilihan (lapisan melayang: satu-satunya bagian section yang memakai shadow).
 * Keyboard: ↓/↑ membuka & berpindah, Home/End, Enter/Spasi memilih, Esc menutup. Klik di luar menutup.
 */
export function SortMenu<T extends string>({ value, options, onChange, label = 'Urutkan', disabled }: SortMenuProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();
  const current = options.find((opt) => opt.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    // Fokus ke pilihan aktif saat menu terbuka
    const activeIndex = Math.max(
      0,
      options.findIndex((opt) => opt.value === value),
    );
    const frame = requestAnimationFrame(() => itemRefs.current[activeIndex]?.focus());
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      cancelAnimationFrame(frame);
    };
  }, [open, options, value]);

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  };

  const select = (next: T) => {
    if (next !== value) onChange(next);
    close(true);
  };

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && !open) {
      event.preventDefault();
      setOpen(true);
    }
  };

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = itemRefs.current.filter((el): el is HTMLButtonElement => Boolean(el));
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const focusAt = (i: number) => items[(i + items.length) % items.length]?.focus();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusAt(index + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusAt(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusAt(0);
        break;
      case 'End':
        event.preventDefault();
        focusAt(items.length - 1);
        break;
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        close(true);
        break;
      case 'Tab':
        close(false);
        break;
    }
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onTriggerKeyDown}
        className="group/sort relative inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full bg-surface pl-4 pr-3 text-sm font-medium text-fg ring-1 ring-inset ring-line transition-colors hover:bg-alt hover:ring-line-strong aria-expanded:bg-alt aria-expanded:ring-line-strong disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-surface max-sm:h-8 max-sm:pl-3 max-sm:pr-2.5 max-sm:text-xs max-sm:after:absolute max-sm:after:inset-x-0 max-sm:after:-inset-y-1.5"
      >
        <span className="text-muted">{label}:</span>
        <span>{current?.label}</span>
        <ChevronDown
          className="h-4 w-4 text-subtle transition-transform duration-200 group-aria-expanded/sort:rotate-180 max-sm:h-3.5 max-sm:w-3.5 motion-reduce:transition-none"
          aria-hidden
        />
      </button>

      <Presence
        show={open}
        id={menuId}
        role="menu"
        aria-label={`${label} template`}
        onKeyDown={onMenuKeyDown}
        // Reduced motion: hanya memudar
        hiddenClassName="-translate-y-1 scale-[0.98] opacity-0 motion-reduce:translate-y-0 motion-reduce:scale-100"
        exitMs={160}
        className="absolute right-0 top-full z-30 mt-2 w-56 origin-top-right rounded-2xl bg-surface p-1.5 shadow-float ring-1 ring-line transition-[opacity,translate,scale] duration-[160ms] ease-calm"
      >
        {options.map((opt, i) => {
          const checked = opt.value === value;
          return (
            <button
              key={opt.value}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              type="button"
              role="menuitemradio"
              aria-checked={checked}
              tabIndex={-1}
              onClick={() => select(opt.value)}
              className={`flex h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-sm transition-colors hover:bg-alt focus:bg-alt focus-visible:outline-none max-sm:h-11 ${
                checked ? 'font-semibold text-fg' : 'text-muted hover:text-fg focus:text-fg'
              }`}
            >
              <span className="min-w-0 flex-1 truncate">{opt.label}</span>
              {checked && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />}
            </button>
          );
        })}
      </Presence>
    </div>
  );
}
