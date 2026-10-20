import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE, type OrderStatus } from '../../../types/platform';

type Tone = (typeof ORDER_STATUS_TONE)[OrderStatus];

const TONE_CLASS: Record<Tone, { pill: string; dot: string }> = {
  warning: { pill: 'bg-warning-50 text-warning-700 ring-warning/25', dot: 'bg-warning' },
  brand: { pill: 'bg-brand-50 text-brand-700 ring-brand-200', dot: 'bg-primary' },
  info: { pill: 'bg-brand-50 text-brand-800 ring-brand-100', dot: 'bg-brand-400' },
  success: { pill: 'bg-success-50 text-success-700 ring-success/25', dot: 'bg-success' },
  danger: { pill: 'bg-danger-50 text-danger-700 ring-danger/20', dot: 'bg-danger' },
  neutral: { pill: 'bg-alt text-muted ring-line', dot: 'bg-subtle' },
};

/** Pill status pesanan (label & nada warna dari src/types/platform.ts). */
export function StatusPill({ status, className = '' }: { status: OrderStatus; className?: string }) {
  const tone = TONE_CLASS[ORDER_STATUS_TONE[status] ?? 'neutral'];
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-medium ring-1 ring-inset ${tone.pill} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} aria-hidden />
      {ORDER_STATUS_LABEL[status] ?? status}
    </span>
  );
}
