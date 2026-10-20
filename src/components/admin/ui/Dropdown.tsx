import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MoreHorizontal } from 'lucide-react';
import { cn } from './cn';
import { FLOAT_PANEL, MENU_ITEM } from './styles';
import { renderIcon, type IconLike } from './icon';
import { IconButton } from './Button';


export type DropdownItem = {
  label: ReactNode;
  icon?: IconLike;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** Garis pemisah sebelum item ini */
  divider?: boolean;
};

export type DropdownProps = {
  /** Pemicu kustom; menerima { open, toggle }. Default: tombol titik tiga. */
  trigger?: (api: { open: boolean; toggle: () => void }) => ReactNode;
  items?: DropdownItem[];
  /** Isi panel kustom (pengganti items) */
  children?: ReactNode | ((api: { close: () => void }) => ReactNode);
  align?: 'left' | 'right';
  width?: string;
  label?: string;
  className?: string;
  panelClassName?: string;
};

/** Menu tarik-turun ringan: klik di luar & ESC menutup. */
export function Dropdown({ trigger, items, children, align = 'right', width = 'w-56', label = 'Opsi', className, panelClassName }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const toggle = () => setOpen((o) => !o);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn('relative inline-flex', className)}>
      {trigger ? trigger({ open, toggle }) : <IconButton icon={<MoreHorizontal />} label={label} size="sm" onClick={toggle} aria-haspopup="menu" aria-expanded={open} />}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            role="menu"
            className={cn('absolute top-full z-50 mt-2', align === 'right' ? 'right-0' : 'left-0', width, 'max-w-[calc(100vw-32px)]', FLOAT_PANEL, panelClassName)}
          >
            {typeof children === 'function'
              ? children({ close })
              : children ??
                items?.map((it, i) => (
                  <div key={i}>
                    {it.divider && <div className="my-1 h-px bg-adm-line" />}
                    <button
                      type="button"
                      role="menuitem"
                      disabled={it.disabled}
                      onClick={() => {
                        close();
                        it.onClick?.();
                      }}
                      className={cn(MENU_ITEM, it.danger && 'text-adm-danger-fg hover:bg-adm-danger-soft')}
                    >
                      {renderIcon(it.icon, cn('h-[18px] w-[18px] shrink-0', it.danger ? '' : 'text-adm-subtle'))}
                      <span className="min-w-0 flex-1 truncate">{it.label}</span>
                    </button>
                  </div>
                ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Dropdown;
