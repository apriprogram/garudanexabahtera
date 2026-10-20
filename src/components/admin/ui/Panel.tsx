import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { Info } from 'lucide-react';
import { cn } from './cn';
import { renderIcon, type IconLike } from './icon';
import { panelClass, PANEL_PAD, PANEL_TONES } from './styles';

/* Kartu panel datar: bg-adm-surface, rounded-[20px], garis 1px adm-line, tanpa shadow. */


export type PanelProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  padding?: keyof typeof PANEL_PAD;
  tone?: keyof typeof PANEL_TONES;
  /** Efek hover (garis menebal) untuk kartu yang dapat diklik */
  interactive?: boolean;
};

export function Panel({ as: Tag = 'div', padding = 'md', tone = 'surface', interactive, className, children, ...props }: PanelProps) {
  return (
    <Tag
      className={cn(panelClass(padding, tone), interactive && 'cursor-pointer transition-colors duration-150 hover:bg-adm-hover/60 hover:ring-adm-line-strong', className)}
      {...props}
    >
      {children}
    </Tag>
  );
}

/** Ikon (i) kecil dengan tooltip bawaan (title). */
export function InfoTip({ text, className }: { text?: string; className?: string }) {
  if (!text) return null;
  return (
    <span className={cn('inline-flex text-adm-subtle', className)} title={text}>
      <Info className="h-4 w-4" strokeWidth={1.75} aria-hidden />
      <span className="sr-only">{text}</span>
    </span>
  );
}

const BOX_TONES = {
  default: 'bg-adm-surface text-adm-muted ring-1 ring-inset ring-adm-line',
  cobalt: 'bg-adm-cobalt-soft text-adm-cobalt-fg',
  mint: 'bg-adm-mint-soft text-adm-mint-fg',
  warning: 'bg-adm-warning-soft text-adm-warning-fg',
  danger: 'bg-adm-danger-soft text-adm-danger-fg',
  ghost: 'bg-adm-ghost text-adm-muted',
  solid: 'bg-cobalt text-white',
} as const;
export type IconBoxTone = keyof typeof BOX_TONES;

/** Kotak ikon 36px rounded-xl. tone: default (garis) | cobalt | mint | warning | danger | ghost | solid */
export function IconBox({ icon, tone = 'default', size = 'md', className }: { icon: IconLike; tone?: IconBoxTone; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center',
        size === 'lg' ? 'h-11 w-11 rounded-xl' : size === 'sm' ? 'h-8 w-8 rounded-lg' : 'h-9 w-9 rounded-xl',
        BOX_TONES[tone],
        className,
      )}
      aria-hidden
    >
      {renderIcon(icon, size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-5 w-5' : 'h-[18px] w-[18px]')}
    </span>
  );
}

export type PanelHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  info?: string;
  action?: ReactNode;
  icon?: IconLike;
  iconTone?: IconBoxTone;
  titleAs?: ElementType;
  className?: string;
};

/** Header kartu: [ikon] judul (+ info) + subjudul; aksi di kanan. */
export function PanelHeader({ title, subtitle, info, action, icon, iconTone = 'default', titleAs: T = 'h2', className }: PanelHeaderProps) {
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-3 max-sm:flex-wrap', className)}>
      <div className="flex min-w-0 items-start gap-3 max-sm:grow">
        {icon && <IconBox icon={icon} tone={iconTone} />}
        <div className={cn('min-w-0', icon && !subtitle && 'flex min-h-9 items-center')}>
          <T className="flex items-center gap-1.5 text-[14px] font-semibold leading-6 tracking-[-0.01em] text-adm-fg sm:text-[15px]">
            <span className="truncate">{title}</span>
            <InfoTip text={info} />
          </T>
          {subtitle && <p className="mt-0.5 text-xs leading-relaxed text-adm-muted sm:text-[13px]">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2 max-sm:max-w-full">{action}</div>}
    </div>
  );
}

/** Footer kartu (pagination, ringkasan). Pakai di Panel padding="none". */
export function PanelFooter({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('border-t border-adm-line px-4 py-3 sm:px-5', className)}>{children}</div>;
}

/** Label bagian kecil di dalam kartu/modal. */
export function SectionLabel({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-3 flex items-center justify-between gap-3', className)}>
      <p className="text-[14px] font-semibold text-adm-fg sm:text-[15px]">{children}</p>
      {action}
    </div>
  );
}

/** Eyebrow: label kecil uppercase. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-[11px] font-semibold uppercase tracking-[0.08em] text-adm-subtle', className)}>{children}</p>;
}

/** Garis pemisah tipis. */
export function Divider({ className }: { className?: string }) {
  return <div className={cn('h-px w-full bg-adm-line', className)} aria-hidden />;
}

/** Baris info: ikon + label + nilai (detail item). */
export function InfoRow({ icon, label, children, className }: { icon?: IconLike; label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 py-2 text-sm', className)}>
      {icon && <span className="flex h-5 w-5 shrink-0 items-center justify-center text-adm-subtle">{renderIcon(icon, 'h-4 w-4')}</span>}
      <span className="w-28 shrink-0 text-adm-muted">{label}</span>
      <span className="min-w-0 flex-1 truncate font-medium text-adm-fg">{children}</span>
    </div>
  );
}

export default Panel;
