// Tab Masuk/Daftar di atas kartu auth: lintasan abu + pill putih yang meluncur ke tab aktif (gaya tab lama, versi terang).
// Item ber-`to` = tautan antarhalaman (/masuk ↔ /daftar), selain itu tombol yang mengganti mode di halaman yang sama.
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { AuthNavState } from './authForm';

export interface AuthTabItem {
  key: string;
  label: string;
  /** Tujuan tautan (halaman auth lain). Tanpa `to` = tombol `onSelect`. */
  to?: string;
}

interface AuthTabsProps {
  items: AuthTabItem[];
  active: string;
  /** Nama grup untuk pembaca layar */
  label: string;
  onSelect?: (key: string) => void;
  /** Tab yang aktif di halaman sebelumnya: pill mulai dari sana lalu meluncur ke tab aktif */
  from?: string;
  disabled?: boolean;
}

export function AuthTabs({ items, active, label, onSelect, from, disabled }: AuthTabsProps) {
  const index = Math.max(0, items.findIndex((item) => item.key === active));
  const fromIndex = from ? items.findIndex((item) => item.key === from) : -1;
  const isNav = items.some((item) => item.to);
  const Wrapper = isNav ? 'nav' : 'div';

  const itemClass = (isActive: boolean) =>
    `relative z-10 flex h-9 items-center justify-center rounded-full px-3 text-xs font-semibold transition-colors duration-200 sm:h-10 sm:text-[13px] after:absolute after:inset-x-0 after:-inset-y-1 sm:after:hidden ${
      isActive ? 'text-fg' : 'text-muted hover:text-fg'
    } disabled:cursor-not-allowed disabled:opacity-60`;

  return (
    <Wrapper
      aria-label={label}
      role={isNav ? undefined : 'group'}
      className="relative mb-6 grid rounded-full bg-alt p-1 ring-1 ring-inset ring-line sm:mb-8"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      <motion.span
        aria-hidden
        className="absolute inset-y-1 left-1 rounded-full bg-surface ring-1 ring-inset ring-line"
        style={{ width: `calc((100% - 0.5rem) / ${items.length})` }}
        initial={{ x: `${(fromIndex >= 0 ? fromIndex : index) * 100}%` }}
        animate={{ x: `${index * 100}%` }}
        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
      />
      {items.map((item) => {
        const isActive = item.key === active;
        if (item.to) {
          return (
            <Link
              key={item.key}
              to={item.to}
              replace
              state={{ authTab: active } satisfies AuthNavState}
              aria-current={isActive ? 'page' : undefined}
              onClick={isActive ? (e) => e.preventDefault() : undefined}
              className={itemClass(isActive)}
            >
              {item.label}
            </Link>
          );
        }
        return (
          <button
            key={item.key}
            type="button"
            aria-pressed={isActive}
            disabled={disabled}
            onClick={() => !isActive && onSelect?.(item.key)}
            className={itemClass(isActive)}
          >
            {item.label}
          </button>
        );
      })}
    </Wrapper>
  );
}
