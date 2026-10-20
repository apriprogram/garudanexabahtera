// Konstanta kelas & peta tone untuk primitif admin (dipisah dari komponen agar Fast Refresh bekerja).
import { cn, FOCUS, FOCUS_INSET } from './cn';

/* ---- Tombol ---- */
export type ButtonVariant = 'primary' | 'dark' | 'secondary' | 'soft' | 'ghost' | 'danger' | 'danger-soft' | 'success' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-cobalt text-white hover:bg-cobalt-600 active:bg-cobalt-700',
  dark: 'bg-adm-fg text-adm-surface hover:opacity-90',
  secondary: 'bg-adm-surface text-adm-fg ring-1 ring-inset ring-adm-line hover:bg-adm-hover hover:ring-adm-line-strong focus-visible:ring-offset-0',
  soft: 'bg-adm-ghost text-adm-fg hover:bg-adm-ghost-hover',
  ghost: 'bg-transparent text-adm-muted hover:bg-adm-hover hover:text-adm-fg',
  danger: 'bg-danger text-white hover:bg-danger-700',
  'danger-soft': 'bg-adm-danger-soft text-adm-danger-fg hover:bg-danger/20',
  success: 'bg-adm-mint-soft text-adm-mint-fg hover:bg-mint/20',
  link: '!h-auto !px-0 bg-transparent text-adm-link underline-offset-4 hover:underline focus-visible:ring-offset-0',
};

// HP (< 640px): ringkas (sm 32 · md/lg 40px, teks 12–13px); area sentuh diperluas pseudo-element tak terlihat.
const HIT = 'max-sm:after:absolute max-sm:after:inset-x-0';
const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 gap-1.5 px-3.5 text-[13px] max-sm:h-8 max-sm:px-3 max-sm:text-xs max-sm:after:-inset-y-1.5',
  md: 'h-11 gap-2 px-4 text-sm max-sm:h-10 max-sm:gap-1.5 max-sm:px-3.5 max-sm:after:-inset-y-1',
  lg: 'h-12 gap-2 px-5 text-[15px] max-sm:h-10 max-sm:gap-1.5 max-sm:px-4 max-sm:text-sm max-sm:after:-inset-y-1',
};

export function buttonClass({
  variant = 'primary',
  size = 'md',
  fullWidth,
  shape = 'rounded',
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; fullWidth?: boolean; shape?: 'rounded' | 'pill'; className?: string } = {}) {
  return cn(
    'relative inline-flex select-none items-center justify-center whitespace-nowrap font-semibold tracking-[-0.01em] transition-colors duration-150',
    FOCUS,
    'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
    shape === 'pill' ? 'rounded-full' : 'rounded-xl',
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    HIT,
    // Tautan teks tidak punya tinggi tetap: perluas area sentuh vertikal di HP
    variant === 'link' && 'max-sm:after:-inset-y-2.5',
    fullWidth && 'w-full',
    className,
  );
}

/* ---- Status / tone ---- */
export type Tone = 'mint' | 'cobalt' | 'warning' | 'danger' | 'mist';

/** Peta status umum → label & warna. Status yang tidak dikenal = mist dengan label apa adanya. */
export const STATUS_TONE: Record<string, { label?: string; tone: Tone; pulse?: boolean }> = {
  active: { label: 'Aktif', tone: 'mint' },
  aktif: { label: 'Aktif', tone: 'mint' },
  inactive: { label: 'Nonaktif', tone: 'mist' },
  nonaktif: { label: 'Nonaktif', tone: 'mist' },
  online: { label: 'Online', tone: 'mint', pulse: true },
  up: { label: 'Online', tone: 'mint', pulse: true },
  offline: { label: 'Offline', tone: 'danger' },
  down: { label: 'Offline', tone: 'danger' },
  success: { label: 'Berhasil', tone: 'mint' },
  published: { label: 'Terbit', tone: 'cobalt' },
  terbit: { label: 'Terbit', tone: 'cobalt' },
  draft: { label: 'Draf', tone: 'mist' },
  pending: { label: 'Menunggu', tone: 'warning' },
  menunggu: { label: 'Menunggu', tone: 'warning' },
  warning: { label: 'Peringatan', tone: 'warning' },
  info: { label: 'Info', tone: 'cobalt' },
  critical: { label: 'Kritis', tone: 'danger' },
  error: { label: 'Error', tone: 'danger' },
  failed: { label: 'Gagal', tone: 'danger' },
  resolved: { label: 'Selesai', tone: 'mint' },
  maintenance: { label: 'Pemeliharaan', tone: 'warning' },
  admin: { label: 'Admin', tone: 'cobalt' },
  user: { label: 'Pengguna', tone: 'mist' },
};

export const TONE_CLASS: Record<Tone, { box: string; ring: string; dot: string }> = {
  mint: { box: 'bg-adm-mint-soft text-adm-mint-fg', ring: 'ring-adm-mint-fg/30', dot: 'bg-adm-mint-fg' },
  cobalt: { box: 'bg-adm-cobalt-soft text-adm-cobalt-fg', ring: 'ring-cobalt/35', dot: 'bg-cobalt' },
  warning: { box: 'bg-adm-warning-soft text-adm-warning-fg', ring: 'ring-warning/45', dot: 'bg-warning' },
  danger: { box: 'bg-adm-danger-soft text-adm-danger-fg', ring: 'ring-danger/35', dot: 'bg-danger' },
  mist: { box: 'bg-adm-mist-soft text-adm-mist-fg', ring: 'ring-adm-line-strong', dot: 'bg-mist-500' },
};

/** Tone dari string status (case-insensitive). */
export function toneOf(status?: string | null): Tone {
  return STATUS_TONE[String(status ?? '').toLowerCase()]?.tone ?? 'mist';
}

/* ---- Lapisan melayang ---- */
/** Kelas panel melayang (dropdown/popover): satu-satunya tempat shadow-float. */
export const FLOAT_PANEL = 'rounded-2xl bg-adm-surface p-1.5 shadow-float ring-1 ring-inset ring-adm-line';

/** Kelas item menu. */
export const MENU_ITEM = cn(
  'flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-medium text-adm-fg transition-colors hover:bg-adm-hover disabled:pointer-events-none disabled:opacity-40',
  FOCUS_INSET,
);

/* ---- Kontrol form ---- */
export const CONTROL_BASE =
  'w-full border bg-adm-surface text-[15px] text-adm-fg outline-none placeholder:text-adm-subtle max-sm:text-[16px] ' +
  'transition-[border-color,box-shadow,background-color] duration-150 focus-visible:outline-none ' +
  'disabled:cursor-not-allowed disabled:bg-adm-ghost disabled:text-adm-subtle';

export const CONTROL_STATE = {
  default: 'border-adm-line hover:border-adm-line-strong focus:border-cobalt focus:ring-1 focus:ring-cobalt',
  error: 'border-danger ring-1 ring-danger/20 focus:ring-danger',
} as const;

export const CONTROL_SIZES = {
  sm: 'h-9 rounded-xl text-sm',
  md: 'h-11 rounded-xl',
  lg: 'h-12 rounded-xl max-sm:h-11',
} as const;
export type ControlSize = keyof typeof CONTROL_SIZES;

/** Kelas lengkap kontrol untuk <input>/<select> mentah. */
export const controlClass = (size: ControlSize = 'md', invalid?: boolean, className?: string) =>
  cn(CONTROL_BASE, CONTROL_SIZES[size], CONTROL_STATE[invalid ? 'error' : 'default'], 'px-3.5', className);

/** Kelas textarea mentah. */
export const textareaClass = (invalid?: boolean, className?: string) =>
  cn(CONTROL_BASE, CONTROL_STATE[invalid ? 'error' : 'default'], 'min-h-[96px] rounded-xl px-3.5 py-2.5 leading-relaxed', className);

/** Kelas checkbox/radio bawaan dengan warna cobalt. */
export const checkboxClass = 'h-4 w-4 shrink-0 cursor-pointer rounded border-adm-line-strong accent-cobalt';

/* ---- Panel ---- */
export const PANEL_PAD = { none: '', sm: 'p-4', md: 'p-4 sm:p-5', lg: 'p-4 sm:p-6' } as const;
export const PANEL_TONES = {
  surface: 'bg-adm-surface ring-1 ring-inset ring-adm-line',
  ghost: 'bg-adm-ghost',
  cobalt: 'bg-adm-cobalt-soft ring-1 ring-inset ring-cobalt/20',
  danger: 'bg-adm-danger-soft ring-1 ring-inset ring-danger/25',
  warning: 'bg-adm-warning-soft ring-1 ring-inset ring-warning/30',
  mint: 'bg-adm-mint-soft ring-1 ring-inset ring-adm-mint-fg/25',
} as const;

/** Kelas kartu panel, untuk elemen yang tidak memakai <Panel>. */
export const panelClass = (padding: keyof typeof PANEL_PAD = 'md', tone: keyof typeof PANEL_TONES = 'surface') =>
  cn('min-w-0 rounded-[20px]', PANEL_TONES[tone], PANEL_PAD[padding]);

/* ---- Tabel ---- */
export const TH_CLASS =
  'h-10 whitespace-nowrap border-b border-adm-line bg-adm-ghost px-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-adm-subtle first:pl-5 last:pr-5';
export const TD_CLASS = 'h-14 border-b border-adm-line px-4 py-3 align-middle first:pl-5 last:pr-5';
