import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn, FOCUS_INSET } from './cn';
import { renderIcon, type IconLike } from './icon';

export type TabItem<T extends string | number = string> = {
  value: T;
  label: ReactNode;
  icon?: IconLike;
  count?: number | string;
  disabled?: boolean;
};

function useRovingKeys<T>(items: { value: T; disabled?: boolean }[], onSelect: (v: T) => void) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (e: KeyboardEvent, idx: number) => {
    const enabled = items.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i >= 0);
    const pos = enabled.indexOf(idx);
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = enabled[(pos + 1) % enabled.length];
    else if (e.key === 'ArrowLeft') next = enabled[(pos - 1 + enabled.length) % enabled.length];
    else if (e.key === 'Home') next = enabled[0];
    else if (e.key === 'End') next = enabled[enabled.length - 1];
    if (next != null) {
      e.preventDefault();
      refs.current[next]?.focus();
      onSelect(items[next].value);
    }
  };
  return { refs, onKeyDown };
}

export type TabsProps<T extends string | number> = {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  /** soft (default: latar ghost, aktif terangkat) | underline | pill (aktif cobalt) */
  variant?: 'soft' | 'underline' | 'pill';
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  ariaLabel?: string;
  className?: string;
};

/**
 * Tab / segmen. Di HP item 32px teks 12px, area sentuh diperluas; kontainer bisa digulir horizontal.
 */
export function Tabs<T extends string | number>({ items, value, onChange, variant = 'soft', size = 'md', fullWidth, ariaLabel = 'Tab', className }: TabsProps<T>) {
  const { refs, onKeyDown } = useRovingKeys(items, onChange);
  const container = {
    soft: 'gap-0.5 rounded-xl bg-adm-ghost p-1',
    pill: 'gap-1 rounded-full bg-adm-surface p-1 ring-1 ring-inset ring-adm-line',
    underline: 'gap-5 border-b border-adm-line sm:gap-6',
  }[variant];
  return (
    <div role="tablist" aria-label={ariaLabel} className={cn('no-scrollbar inline-flex max-w-full items-center overflow-x-auto', container, fullWidth && 'flex w-full', className)}>
      {items.map((it, i) => {
        const active = it.value === value;
        return (
          <button
            key={String(it.value)}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            disabled={it.disabled}
            onClick={() => onChange(it.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'relative inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40',
              FOCUS_INSET,
              fullWidth && 'flex-1',
              variant === 'soft' &&
                cn(
                  'rounded-lg max-sm:after:absolute max-sm:after:inset-x-0 max-sm:after:-inset-y-1.5',
                  size === 'sm' ? 'h-8 px-3 text-[13px] max-sm:px-2.5 max-sm:text-xs' : 'h-9 px-3.5 text-sm max-sm:h-8 max-sm:px-3 max-sm:text-xs',
                  active ? 'bg-adm-raised text-adm-fg ring-1 ring-inset ring-adm-line' : 'text-adm-muted hover:text-adm-fg',
                ),
              variant === 'pill' &&
                cn(
                  'rounded-full max-sm:after:absolute max-sm:after:inset-x-0 max-sm:after:-inset-y-1.5',
                  size === 'sm' ? 'h-8 px-3.5 text-[13px] max-sm:px-3 max-sm:text-xs' : 'h-9 px-4 text-sm max-sm:h-8 max-sm:px-3.5 max-sm:text-xs',
                  active ? 'bg-cobalt text-white' : 'text-adm-muted hover:bg-adm-hover hover:text-adm-fg',
                ),
              variant === 'underline' &&
                cn('-mb-px h-11 border-b-2 px-0.5 text-sm max-sm:h-10', active ? 'border-cobalt text-adm-fg' : 'border-transparent text-adm-muted hover:text-adm-fg'),
            )}
          >
            {renderIcon(it.icon, 'h-4 w-4 max-sm:h-3.5 max-sm:w-3.5')}
            {it.label}
            {it.count != null && (
              <span
                className={cn(
                  'min-w-[20px] rounded-full px-1.5 py-0.5 text-center text-[11px] font-semibold tabular-nums',
                  active && variant === 'pill' ? 'bg-white/20 text-white' : 'bg-adm-ghost-hover text-adm-muted',
                )}
              >
                {it.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Alias Tabs varian soft sebagai segmented control (role radiogroup tidak perlu dibedakan secara visual). */
export function Segmented<T extends string | number>(props: Omit<TabsProps<T>, 'variant'>) {
  return <Tabs {...props} variant="soft" ariaLabel={props.ariaLabel || 'Pilihan'} />;
}

export default Tabs;
