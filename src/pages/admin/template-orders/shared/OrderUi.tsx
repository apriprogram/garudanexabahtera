// Komponen tampilan bersama halaman admin pesanan template & Dashboard (gaya "Calm Workspace", token adm-*).
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Ban, CheckCircle2, CircleHelp, Clock, CreditCard, Globe, Hourglass, Info, RefreshCw, X, XCircle } from 'lucide-react';
import { Badge, IconBox, IconButton, Notice, cn, type Tone } from '../../../../components/admin/ui';
import { formatRupiah, formatTanggal, type OrderStatus, type Renewal } from '../../../../types/platform';
import { SITE_ADDON_NAME, type SiteAddonOrder } from '../../../../types/siteAddons';
import {
  EXPIRY_TONE,
  addonOrderBadge,
  addonPriceText,
  addonSourceLabel,
  domainCheckInfo,
  expiryLabel,
  expiryOf,
  isOrderStatus,
  orderLabel,
  orderTone,
  paymentLabel,
  paymentTone,
  paymentTypeLabel,
  renewalLabel,
  renewalTone,
  tanggalPanjang,
  type ActivePeriod,
  type Expiry,
  type PriceLine,
} from './orderUtils';
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

/** Sisa masa aktif ("362 hari lagi"): hijau, kuning ≤ 30 hari, merah ≤ 7 hari / lewat. */
export function ExpiryBadge({ expiry, size, className }: { expiry: Expiry; size?: 'sm' | 'md'; className?: string }) {
  return (
    <Badge tone={EXPIRY_TONE[expiry.state]} icon={expiry.state === 'ok' ? undefined : <AlertTriangle />} size={size} className={cn('tabular-nums', className)}>
      {expiryLabel(expiry)}
    </Badge>
  );
}

const CHECK_TEXT: Record<Tone, string> = {
  mint: 'text-adm-mint-fg',
  warning: 'text-adm-warning-fg',
  danger: 'text-adm-danger-fg',
  cobalt: 'text-adm-cobalt-fg',
  mist: 'text-adm-muted',
};

/** Hasil cek ketersediaan domain saat dipesan (domain_check); tidak tampil untuk pesanan lama. */
export function DomainCheckNote({ check, className }: { check: string | null | undefined; className?: string }) {
  const info = domainCheckInfo(check);
  if (!info) return null;
  const Icon = info.tone === 'mint' ? CheckCircle2 : info.tone === 'warning' ? CircleHelp : info.tone === 'danger' ? AlertTriangle : Info;
  return (
    <span className={cn('inline-flex items-start gap-1.5 text-[13px] font-medium leading-snug', CHECK_TEXT[info.tone], className)}>
      <Icon className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
      <span>{info.label}</span>
    </span>
  );
}

/** Pill status tagihan perpanjangan. */
export function RenewalStatusBadge({ status, label, size }: { status: string; label?: string | null; size?: 'sm' | 'md' }) {
  return (
    <Badge tone={renewalTone(status)} size={size}>
      {renewalLabel(status, label)}
    </Badge>
  );
}

/** Rincian tagihan gaya nota: label kiri, nominal kanan, baris total tebal. */
export function PriceBreakdown({ lines, className }: { lines: PriceLine[]; className?: string }) {
  return (
    <dl className={cn('divide-y divide-adm-line rounded-xl bg-adm-ghost px-4', className)}>
      {lines.map((line) => (
        <div key={line.label} className="flex items-baseline justify-between gap-3 py-2.5">
          <dt className={cn('min-w-0 break-words text-sm', line.total ? 'font-semibold text-adm-fg' : 'text-adm-muted')}>{line.label}</dt>
          <dd className={cn('shrink-0 text-sm tabular-nums text-adm-fg', line.total ? 'font-semibold' : 'font-medium')}>
            {line.amount < 0 ? `-${formatRupiah(-line.amount)}` : formatRupiah(line.amount)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Masa aktif hosting & jasa dan domain: mulai–berakhir + sisa hari. */
export function ActivePeriodRows({ rows, now }: { rows: { label: ReactNode; period: ActivePeriod }[]; now?: Date }) {
  return (
    <ul className="divide-y divide-adm-line rounded-xl ring-1 ring-inset ring-adm-line">
      {rows.map((row, i) => {
        const expiry = expiryOf(row.period.end, now);
        return (
          <li key={i} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <p className="break-words text-xs text-adm-muted">{row.label}</p>
              <p className="mt-0.5 text-sm font-medium tabular-nums text-adm-fg">
                {tanggalPanjang(row.period.start)} – {tanggalPanjang(row.period.end)}
                {row.period.estimated && (
                  <span className="font-normal text-adm-muted" title="Tanggal berakhir belum tercatat: tanggal aktif + 1 tahun">
                    {' '}
                    (perkiraan)
                  </span>
                )}
              </p>
            </div>
            {expiry && <ExpiryBadge expiry={expiry} className="self-start sm:self-center" />}
          </li>
        );
      })}
    </ul>
  );
}

/** "23 Okt 2027 → 23 Okt 2029" (tanggal berakhir sebelum & sesudah perpanjangan). */
function ExpiryChange({ before, after }: { before: string | null; after: string | null }) {
  return (
    <span className="tabular-nums">
      {before && <span className="font-normal text-adm-muted">{formatTanggal(before)} → </span>}
      {formatTanggal(after)}
    </span>
  );
}

/**
 * Riwayat tagihan perpanjangan (terbaru dulu, dari admin_get_template_order). Setelah lunas, staf masih perlu
 * memperpanjang domain di registrar dan hosting di server secara manual.
 */
export function RenewalHistory({ renewals }: { renewals: Renewal[] }) {
  if (renewals.length === 0) {
    return <p className="text-sm text-adm-muted">Belum ada perpanjangan. Pembeli bisa memperpanjang dari halaman akunnya.</p>;
  }
  const latestPaid = renewals.find((r) => r.status === 'lunas');
  return (
    <div className="space-y-3">
      {latestPaid && (
        <Notice tone="warning" icon={<RefreshCw />} title="Perpanjangan lunas: perpanjang juga domain & hosting di registrar/server.">
          {latestPaid.renewal_number} ({latestPaid.years} tahun): domain <span className="break-all font-mono font-semibold">{latestPaid.domain}</span> sampai{' '}
          {formatTanggal(latestPaid.domain_expires_after)}, hosting & jasa sampai {formatTanggal(latestPaid.service_expires_after)}.
        </Notice>
      )}
      <ul className="space-y-3">
        {renewals.map((r) => (
          <li key={r.id} className="rounded-xl px-4 py-3 ring-1 ring-inset ring-adm-line">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-[13px] font-semibold tabular-nums text-adm-fg">{r.renewal_number}</p>
              <RenewalStatusBadge status={r.status} label={r.status_label} size="sm" />
            </div>
            <p className="mt-1.5 text-sm text-adm-fg">
              <span className="font-semibold tabular-nums">{formatRupiah(r.price)}</span> · {r.years} tahun
            </p>
            <p className="mt-0.5 text-xs tabular-nums text-adm-muted">
              Per tahun: hosting & jasa {formatRupiah(r.hosting_price_per_year)} + domain {formatRupiah(r.domain_price_per_year)}
            </p>
            <DetailList
              className="mt-3"
              items={[
                { label: 'Dibuat', value: formatTanggal(r.created_at, true) },
                ...(r.status === 'lunas'
                  ? [
                      { label: 'Dibayar', value: `${formatTanggal(r.paid_at, true)} · ${paymentTypeLabel(r.payment_type)}` },
                      { label: 'Hosting & jasa sampai', value: <ExpiryChange before={r.service_expires_before} after={r.service_expires_after} /> },
                      { label: 'Domain sampai', value: <ExpiryChange before={r.domain_expires_before} after={r.domain_expires_after} /> },
                    ]
                  : r.status === 'dibatalkan'
                    ? [{ label: 'Dibatalkan', value: formatTanggal(r.cancelled_at, true) }]
                    : [{ label: 'Pembayaran', value: <PaymentStatusBadge status={r.payment_status} size="sm" /> }]),
              ]}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Pill status tagihan fitur tambahan (lunas yang dicabut tim = "Dinonaktifkan"). */
export function AddonOrderStatusBadge({ order, size }: { order: Pick<SiteAddonOrder, 'status' | 'status_label' | 'revoked_at'>; size?: 'sm' | 'md' }) {
  const badge = addonOrderBadge(order);
  return (
    <Badge tone={badge.tone} size={size}>
      {badge.label}
    </Badge>
  );
}

/** Status pembayaran tagihan fitur yang masih berjalan; `capture` = sedang ditinjau bank (belum aktif, tanpa bayar ulang). */
export function AddonPaymentBadge({ status, size }: { status: string | null | undefined; size?: 'sm' | 'md' }) {
  if (status !== 'capture') return <PaymentStatusBadge status={status} size={size} />;
  return (
    <Badge tone="warning" icon={<CreditCard />} size={size} variant="soft">
      Ditinjau bank
    </Badge>
  );
}

/** Riwayat tagihan fitur tambahan pesanan ini (terbaru dulu, addon_orders dari admin_get_template_order). */
export function AddonOrderHistory({ orders }: { orders: SiteAddonOrder[] }) {
  if (orders.length === 0) return <p className="text-sm text-adm-muted">Belum ada tagihan fitur tambahan.</p>;
  return (
    <ul className="space-y-3">
      {orders.map((o) => (
        <li key={o.addon_number} className="rounded-xl px-4 py-3 ring-1 ring-inset ring-adm-line">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[13px] font-semibold tabular-nums text-adm-fg">{o.addon_number}</p>
            <AddonOrderStatusBadge order={o} size="sm" />
          </div>
          <p className="mt-1.5 text-sm text-adm-fg">
            <span className="font-semibold tabular-nums">{addonPriceText(o.price)}</span> · {SITE_ADDON_NAME[o.addon_code] ?? o.addon_code}
          </p>
          <p className="mt-0.5 text-xs text-adm-muted">{addonSourceLabel(o.source)}</p>
          <DetailList
            className="mt-3"
            items={[
              { label: 'Dibuat', value: formatTanggal(o.created_at, true) },
              ...(o.status === 'lunas'
                ? [
                    o.source === 'beli'
                      ? { label: 'Dibayar', value: `${formatTanggal(o.paid_at, true)} · ${paymentTypeLabel(o.payment_type)}` }
                      : { label: 'Aktif sejak', value: formatTanggal(o.paid_at, true) },
                    ...(o.invoice_number ? [{ label: 'No. nota', value: <span className="font-mono text-[13px] tabular-nums">{o.invoice_number}</span> }] : []),
                    ...(o.revoked_at ? [{ label: 'Dinonaktifkan', value: formatTanggal(o.revoked_at, true) }] : []),
                  ]
                : o.status === 'dibatalkan'
                  ? [{ label: 'Dibatalkan', value: formatTanggal(o.cancelled_at, true) }]
                  : [{ label: 'Pembayaran', value: <AddonPaymentBadge status={o.payment_status} size="sm" /> }]),
            ]}
          />
        </li>
      ))}
    </ul>
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
