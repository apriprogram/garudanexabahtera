import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { Link } from 'react-router-dom';
import { cn, FOCUS } from './cn';
import { buttonClass, type ButtonSize, type ButtonVariant } from './styles';
import { renderIcon, type IconLike } from './icon';
import { Spinner } from './Spinner';

/* Tombol gaya "Calm Workspace": datar, rounded-xl, tanpa shadow. Warna lewat token adm-* (ikut tema). Kelas di ./styles. */

const ICON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-4 w-4 max-sm:h-3.5 max-sm:w-3.5',
  md: 'h-[18px] w-[18px] max-sm:h-4 max-sm:w-4',
  lg: 'h-5 w-5 max-sm:h-4 max-sm:w-4',
};

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: IconLike;
  iconRight?: IconLike;
  fullWidth?: boolean;
  shape?: 'rounded' | 'pill';
  className?: string;
  children?: ReactNode;
};

export type ButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & {
    /** Tautan internal (react-router) */
    to?: string;
    /** Tautan eksternal */
    href?: string;
    target?: string;
    rel?: string;
    ref?: Ref<HTMLButtonElement | HTMLAnchorElement>;
  };


/**
 * Tombol. variant: primary (cobalt) | dark | secondary (garis) | soft | ghost | danger | danger-soft | success | link
 * size: sm (36) | md (44) | lg (48); di HP sm 32, md/lg 40. `to` → <Link>, `href` → <a>.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  icon,
  iconRight,
  fullWidth,
  shape,
  className,
  children,
  type,
  to,
  href,
  target,
  rel,
  ref,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const classes = buttonClass({ variant, size, fullWidth, shape, className: cn(loading && 'disabled:opacity-80', className) });
  const iconCls = cn(ICON_SIZES[size], 'shrink-0');
  const content = (
    <>
      {loading ? <Spinner size="sm" /> : renderIcon(icon, iconCls)}
      {children != null && children !== false && <span className="truncate">{children}</span>}
      {!loading && renderIcon(iconRight, iconCls)}
    </>
  );

  if (to && !isDisabled) {
    return (
      <Link ref={ref as Ref<HTMLAnchorElement>} to={to} className={classes} {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {content}
      </Link>
    );
  }
  if (href && !isDisabled) {
    return (
      <a ref={ref as Ref<HTMLAnchorElement>} href={href} target={target} rel={rel} className={classes} {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {content}
      </a>
    );
  }
  return (
    <button
      ref={ref as Ref<HTMLButtonElement>}
      type={type || 'button'}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={classes}
      {...props}
    >
      {content}
    </button>
  );
}

/* ------------------------------------------------------------------ */

export type IconButtonVariant = 'secondary' | 'ghost' | 'soft' | 'primary' | 'danger' | 'danger-ghost';
export type IconButtonSize = 'xs' | 'sm' | 'md' | 'lg';

const ICON_VARIANTS: Record<IconButtonVariant, string> = {
  secondary: 'bg-adm-surface text-adm-fg ring-1 ring-inset ring-adm-line hover:bg-adm-hover hover:ring-adm-line-strong focus-visible:ring-offset-0',
  ghost: 'bg-transparent text-adm-muted hover:bg-adm-hover hover:text-adm-fg',
  soft: 'bg-adm-ghost text-adm-fg hover:bg-adm-ghost-hover',
  primary: 'bg-cobalt text-white hover:bg-cobalt-600',
  danger: 'bg-adm-danger-soft text-adm-danger-fg hover:bg-danger/20',
  'danger-ghost': 'bg-transparent text-adm-muted hover:bg-adm-danger-soft hover:text-adm-danger-fg',
};
const ICON_BTN_SIZES: Record<IconButtonSize, string> = { xs: 'h-7 w-7 rounded-lg', sm: 'h-8 w-8 rounded-lg', md: 'h-10 w-10 rounded-xl', lg: 'h-12 w-12 rounded-xl' };
// HP: area sentuh tak terlihat +4–8px tiap sisi tanpa mengubah ukuran visual.
const ICON_HIT: Record<IconButtonSize, string> = {
  xs: 'max-sm:before:absolute max-sm:before:-inset-2',
  sm: 'max-sm:before:absolute max-sm:before:-inset-1.5',
  md: 'max-sm:before:absolute max-sm:before:-inset-1',
  lg: '',
};
const ICON_INNER: Record<IconButtonSize, string> = { xs: 'h-3.5 w-3.5', sm: 'h-4 w-4', md: 'h-[18px] w-[18px]', lg: 'h-5 w-5' };

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & {
  icon: IconLike;
  /** Wajib: dipakai untuk aria-label & title */
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  round?: boolean;
  dot?: boolean;
  loading?: boolean;
  to?: string;
  href?: string;
  target?: string;
  rel?: string;
  className?: string;
  ref?: Ref<HTMLButtonElement | HTMLAnchorElement>;
};

/** Tombol ikon. label WAJIB. variant: secondary | ghost (default) | soft | primary | danger | danger-ghost. */
export function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  round,
  dot,
  loading,
  to,
  href,
  target,
  rel,
  className,
  type,
  ref,
  ...props
}: IconButtonProps) {
  const classes = cn(
    'relative inline-flex shrink-0 items-center justify-center transition-colors duration-150',
    FOCUS,
    'disabled:pointer-events-none disabled:opacity-40',
    ICON_VARIANTS[variant],
    ICON_BTN_SIZES[size],
    round && 'rounded-full',
    ICON_HIT[size],
    className,
  );
  const inner = (
    <>
      {loading ? <Spinner size="sm" /> : renderIcon(icon, ICON_INNER[size])}
      {dot && <span className="absolute right-[7px] top-[7px] h-2 w-2 rounded-full bg-danger ring-2 ring-adm-surface" aria-hidden />}
      <span className="sr-only">{label}</span>
    </>
  );
  if (to) {
    return (
      <Link ref={ref as Ref<HTMLAnchorElement>} to={to} aria-label={label} title={label} className={classes}>
        {inner}
      </Link>
    );
  }
  if (href) {
    return (
      <a ref={ref as Ref<HTMLAnchorElement>} href={href} target={target} rel={rel} aria-label={label} title={label} className={classes}>
        {inner}
      </a>
    );
  }
  return (
    <button ref={ref as Ref<HTMLButtonElement>} type={type || 'button'} aria-label={label} title={label} className={classes} {...props}>
      {inner}
    </button>
  );
}

export default Button;
