// Komponen tampilan bersama halaman admin pesanan template & Dashboard (gaya "Calm Workspace", token adm-*).
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Ban, CheckCircle2, Clock, CreditCard, Globe, Hourglass, Info, X, XCircle } from 'lucide-react';
import { Badge, IconBox, IconButton, cn } from '../../../../components/admin/ui';
import type { OrderStatus } from '../../../../types/platform';
import { isOrderStatus, orderLabel, orderTone, paymentLabel, paymentTone } from './orderUtils';
import type { ToastState } from './hooks';

const ORDER_ICON: Record<OrderStatus, ReactNode> = {
  menunggu_pembayaran: <Clock />,
  menunggu_approval: <Hourglass />,
  proses_domain: <Globe />,
  aktif: <CheckCircle2 />,
  ditolak: <XCircle />,
  dibatalkan: <Ban />,
};

/** Pill status order (label lengkap SPEC §4). */
export function OrderStatusBadge({ status, label, size, className }: { status: string; label?: string | null; size?: 'sm' | 'md'; className?: string }) {
  return (
    <Badge tone={orderTone(status)} icon={isOrderStatus(status) ? ORDER_ICON[status] : undefined} size={size} className={className}>
      {orderLabel(status, label)}
    </Badge>
  );
}

/** Pill status pembayaran Midtrans. */
export function PaymentStatusBadge({ status, size, className }: { status: string | null | undefined; size?: 'sm' | 'md'; className?: string }) {
  return (
    <Badge tone={paymentTone(status)} icon={<CreditCard />} size={size} variant="soft" className={className}>
      {paymentLabel(status)}
    </Badge>
  );
}

/** Pill status situs pembeli. */
export function SiteStatusBadge({ status, size }: { status: string; size?: 'sm' | 'md' }) {
  return status === 'active' ? (
    <Badge tone="mint" size={size}>
      Aktif
    </Badge>
  ) : (
    <Badge tone="warning" size={size}>
      Dinonaktifkan
    </Badge>
  );
}

/** Daftar label–nilai dua kolom (detail order). */
export function DetailList({ items, className }: { items: { label: ReactNode; value: ReactNode; full?: boolean }[]; className?: string }) {
  return (
    <dl className={cn('grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2', className)}>
      {items.map((item, i) => (
        <div key={i} className={cn('min-w-0', item.full && 'sm:col-span-2')}>
          <dt className="text-xs text-adm-muted">{item.label}</dt>
          <dd className="mt-0.5 break-words text-sm font-medium text-adm-fg">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Judul bagian di dalam drawer. */
export function DrawerSection({ title, action, children, className }: { title: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={className}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[14px] font-semibold text-adm-fg sm:text-[15px]">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Notifikasi melayang (pasangkan dengan useToast). */
export function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: -24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.96 }}
          transition={{ duration: 0.18 }}
          role={toast.tone === 'error' ? 'alert' : 'status'}
          aria-live={toast.tone === 'error' ? 'assertive' : 'polite'}
          className="fixed left-1/2 top-4 z-[150] flex w-[calc(100%-32px)] max-w-md -translate-x-1/2 items-center gap-3 rounded-2xl bg-adm-surface px-3.5 py-3 shadow-float ring-1 ring-inset ring-adm-line sm:top-8 sm:w-auto sm:min-w-[320px]"
        >
          <IconBox
            size="sm"
            tone={toast.tone === 'success' ? 'mint' : toast.tone === 'error' ? 'danger' : 'cobalt'}
            icon={toast.tone === 'success' ? <CheckCircle2 /> : toast.tone === 'error' ? <AlertTriangle /> : <Info />}
          />
          <span className="min-w-0 flex-1 text-sm font-medium text-adm-fg">{toast.message}</span>
          <IconButton icon={<X />} label="Tutup" size="xs" onClick={onClose} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
