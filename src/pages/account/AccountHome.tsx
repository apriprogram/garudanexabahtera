// Dashboard pembeli (/akun): sapaan, ringkasan, daftar pesanan (customer_get_orders) dengan aksi per status.
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  CreditCard,
  ExternalLink,
  Globe,
  Hourglass,
  LayoutTemplate,
  LoaderCircle,
  ReceiptText,
  RefreshCw,
  ShoppingBag,
  SquarePen,
} from 'lucide-react';
import { ApiError, apiPost, errorMessage } from '../../lib/api';
import { getCurrentUser } from '../../lib/auth';
import { formatRupiah, formatTanggal, type Order, type OrderStatus } from '../../types/platform';
import { Notice } from './components/Notice';
import { STATUS_HINT, displayDomain } from './components/orderCopy';
import { payOrder, useDocumentTitle } from './components/payment';
import { EmptyState, ErrorState, Skeleton } from './components/States';
import { invoiceStatus, isPaymentUnderReview } from './components/paymentStatus';
import { StatusPill } from './components/StatusPill';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; orders: Order[] };

type Filter = 'all' | 'unpaid' | 'process' | 'active' | 'closed';

const FILTERS: { key: Filter; label: string; statuses: OrderStatus[] | null }[] = [
  { key: 'all', label: 'Semua', statuses: null },
  { key: 'unpaid', label: 'Perlu dibayar', statuses: ['menunggu_pembayaran'] },
  { key: 'process', label: 'Diproses', statuses: ['menunggu_approval', 'proses_domain'] },
  { key: 'active', label: 'Aktif', statuses: ['aktif'] },
  { key: 'closed', label: 'Dibatalkan/ditolak', statuses: ['dibatalkan', 'ditolak'] },
];

const inFilter = (order: Order, filter: Filter) => {
  const statuses = FILTERS.find((f) => f.key === filter)?.statuses;
  return !statuses || statuses.includes(order.status);
};

const fetchOrders = () =>
  apiPost<{ orders: Order[] }>('customer_get_orders').then((data) => (Array.isArray(data.orders) ? data.orders : []));

const loadErrorMessage = (err: unknown) =>
  err instanceof ApiError && err.code === 'NETWORK'
    ? err.message
    : errorMessage(err, 'Daftar pesanan belum bisa dimuat. Silakan coba lagi.');

export default function AccountHome() {
  useDocumentTitle('Akun saya');
  const user = getCurrentUser();
  const firstName = (user?.name || '').trim().split(/\s+/)[0] || '';

  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  const [refreshError, setRefreshError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchOrders()
      .then((orders) => alive && setState({ status: 'ready', orders }))
      .catch((err: unknown) => alive && setState({ status: 'error', message: loadErrorMessage(err) }));
    return () => {
      alive = false;
    };
  }, []);

  /** Muat ulang daftar; bila sudah tampil, kegagalan cukup ditampilkan sebagai pemberitahuan. */
  const refresh = async () => {
    const wasReady = state.status === 'ready';
    setRefreshing(true);
    setRefreshError(null);
    if (!wasReady) setState({ status: 'loading' });
    try {
      setState({ status: 'ready', orders: await fetchOrders() });
    } catch (err) {
      if (wasReady) setRefreshError(errorMessage(err, 'Gagal memuat ulang pesanan.'));
      else setState({ status: 'error', message: loadErrorMessage(err) });
    } finally {
      setRefreshing(false);
    }
  };

  const orders = useMemo(() => (state.status === 'ready' ? state.orders : []), [state]);
  const counts = useMemo(() => {
    const by = (statuses: OrderStatus[]) => orders.filter((o) => statuses.includes(o.status)).length;
    return {
      total: orders.length,
      // Pembayaran kartu yang sedang ditinjau bank tidak perlu dibayar lagi
      unpaid: orders.filter((o) => o.status === 'menunggu_pembayaran' && !isPaymentUnderReview(o)).length,
      process: by(['menunggu_approval', 'proses_domain']),
      active: by(['aktif']),
    };
  }, [orders]);
  const visible = useMemo(() => orders.filter((o) => inFilter(o, filter)), [orders, filter]);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-14 pt-6 sm:px-8 sm:pb-20 sm:pt-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted">Selamat datang kembali</p>
          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-fg sm:text-4xl">{firstName ? `Halo, ${firstName}` : 'Halo!'}</h1>
          <p className="mt-1.5 text-[14px] text-muted sm:text-base">Pantau pesanan template dan kelola situs Anda di sini.</p>
        </div>
        <Link to="/#templates" className="btn btn-primary shrink-0 self-start sm:self-auto">
          <ShoppingBag className="h-4 w-4" aria-hidden />
          Pesan template
        </Link>
      </header>

      {/* Ringkasan */}
      <section aria-label="Ringkasan pesanan" className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-4 lg:grid-cols-4">
        <StatTile label="Total pesanan" value={counts.total} icon={<ReceiptText className="h-5 w-5" aria-hidden />} loading={state.status === 'loading'} />
        <StatTile
          label="Perlu dibayar"
          value={counts.unpaid}
          icon={<CreditCard className="h-5 w-5" aria-hidden />}
          tone="warning"
          loading={state.status === 'loading'}
        />
        <StatTile label="Diproses" value={counts.process} icon={<Hourglass className="h-5 w-5" aria-hidden />} loading={state.status === 'loading'} />
        <StatTile
          label="Situs aktif"
          value={counts.active}
          icon={<BadgeCheck className="h-5 w-5" aria-hidden />}
          tone="success"
          loading={state.status === 'loading'}
        />
      </section>

      {counts.unpaid > 0 && (
        <Notice
          tone="warning"
          className="mt-5"
          title={`${counts.unpaid} pesanan menunggu pembayaran`}
          action={
            filter !== 'unpaid' ? (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setFilter('unpaid')}>
                Tampilkan
              </button>
            ) : undefined
          }
        >
          Selesaikan pembayaran agar pesanan bisa segera kami proses.
        </Notice>
      )}

      {/* Daftar pesanan */}
      <section aria-labelledby="orders-title" className="mt-8 sm:mt-10">
        <div className="flex items-center justify-between gap-3">
          <h2 id="orders-title" className="text-lg font-semibold text-fg sm:text-xl">
            Pesanan saya
          </h2>
          {state.status === 'ready' && (
            <button type="button" onClick={refresh} disabled={refreshing} className="btn btn-ghost btn-sm">
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
              <span className="max-sm:sr-only">Muat ulang</span>
            </button>
          )}
        </div>

        {refreshError && (
          <Notice tone="danger" className="mt-4" onClose={() => setRefreshError(null)}>
            {refreshError}
          </Notice>
        )}

        {state.status === 'ready' && orders.length > 0 && (
          <div className="-mx-5 mt-4 overflow-x-auto px-5 no-scrollbar sm:mx-0 sm:px-0" role="group" aria-label="Filter status pesanan">
            <div className="flex w-max gap-2 py-1">
              {FILTERS.map((f) => {
                const count = orders.filter((o) => inFilter(o, f.key)).length;
                return (
                  <button key={f.key} type="button" className="chip-site" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
                    {f.label}
                    <span className="tabular-nums opacity-70">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-4" aria-busy={state.status === 'loading'}>
          {state.status === 'loading' && (
            <div className="space-y-3">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="card-site space-y-3 p-5">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-11 w-11 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          )}

          {state.status === 'error' && (
            <ErrorState title="Pesanan belum bisa dimuat" message={state.message} onRetry={refresh} retrying={refreshing} />
          )}

          {state.status === 'ready' && orders.length === 0 && (
            <EmptyState
              icon={<LayoutTemplate className="h-7 w-7" aria-hidden />}
              title="Belum ada pesanan"
              description="Pilih template company profile yang cocok untuk bisnis Anda, lalu pesan dalam beberapa menit."
              action={
                <Link to="/#templates" className="btn btn-primary">
                  Lihat Template
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              }
            />
          )}

          {state.status === 'ready' && orders.length > 0 && visible.length === 0 && (
            <div className="card-site flex flex-col items-center px-6 py-10 text-center">
              <p className="text-sm text-muted">Tidak ada pesanan dengan status ini.</p>
              <button type="button" className="btn btn-outline btn-sm mt-4" onClick={() => setFilter('all')}>
                Tampilkan semua pesanan
              </button>
            </div>
          )}

          {visible.length > 0 && (
            <ul className="space-y-3 sm:space-y-4">
              {visible.map((order) => (
                <li key={order.order_number}>
                  <OrderCard order={order} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function StatTile({
  label,
  value,
  icon,
  tone = 'brand',
  loading,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  tone?: 'brand' | 'warning' | 'success';
  loading: boolean;
}) {
  const iconTone =
    tone === 'warning' ? 'bg-warning-50 text-warning-700' : tone === 'success' ? 'bg-success-50 text-success-700' : 'bg-brand-50 text-primary';
  return (
    <div className="card-site flex flex-col gap-3 p-4 sm:p-5">
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${iconTone}`}>{icon}</span>
      <div>
        <p className="text-[13px] text-muted">{label}</p>
        {loading ? (
          <Skeleton className="mt-1.5 h-7 w-10" />
        ) : (
          <p className="text-[22px] font-semibold leading-tight tabular-nums text-fg sm:text-[30px]">{value}</p>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const detailPath = `/akun/pesanan/${encodeURIComponent(order.order_number)}`;
  const { domain, final } = displayDomain(order);
  const unpaid = order.status === 'menunggu_pembayaran';
  // Kartu ditahan untuk tinjauan fraud: belum lunas, tetapi bayar ulang membuat transaksi baru (risiko tagihan ganda)
  const underReview = isPaymentUnderReview(order);
  const activeSite = order.status === 'aktif' && order.site_id;

  const pay = async () => {
    setPaying(true);
    setPayError(null);
    try {
      await payOrder(order.order_number);
    } catch (err) {
      setPayError(errorMessage(err, 'Gagal membuka halaman pembayaran. Silakan coba lagi.'));
      setPaying(false);
    }
  };

  const hint =
    order.status === 'ditolak' && order.rejected_reason
      ? `Pesanan ditolak: ${order.rejected_reason}`
      : underReview
        ? 'Pembayaran kartu Anda sedang ditinjau bank. Tidak perlu membayar ulang.'
        : STATUS_HINT[order.status];

  return (
    <article className="card-site p-4 sm:p-5" aria-labelledby={`order-${order.id}`}>
      <div className="flex gap-3 sm:gap-4">
        <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-primary sm:flex" aria-hidden>
          <LayoutTemplate className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
            <div className="min-w-0">
              <h3 id={`order-${order.id}`} className="text-base font-semibold leading-snug text-fg sm:text-lg">
                <Link to={detailPath} className="hover:text-primary">
                  {order.template_name}
                </Link>
              </h3>
              <p className="mt-0.5 text-xs text-subtle">
                <span className="tabular-nums">{order.order_number}</span> · {formatTanggal(order.created_at)}
              </p>
            </div>
            <StatusPill status={order.status} />
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
            <div className="col-span-2 min-w-0 sm:col-span-1">
              <dt className="text-xs text-subtle">{final ? 'Domain' : 'Domain diminta'}</dt>
              <dd className="mt-0.5 flex min-w-0 items-center gap-1.5 font-medium text-fg">
                <Globe className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
                <span className="truncate">{domain}</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-subtle">{unpaid ? 'Tagihan' : 'Harga'}</dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-fg">{formatRupiah(order.price)}</dd>
            </div>
            <div>
              <dt className="text-xs text-subtle">Pembayaran</dt>
              <dd className="mt-0.5 font-medium text-fg">{invoiceStatus(order).label}</dd>
            </div>
          </dl>

          <p className={`mt-3 text-[13px] ${order.status === 'ditolak' ? 'text-danger-700' : 'text-muted'}`}>{hint}</p>
        </div>
      </div>

      {payError && (
        <Notice tone="danger" className="mt-4" onClose={() => setPayError(null)}>
          {payError}
        </Notice>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4 sm:justify-end">
        {unpaid && !underReview && (
          <button type="button" className="btn btn-primary btn-sm" onClick={pay} disabled={paying}>
            {paying ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <CreditCard className="h-4 w-4" aria-hidden />}
            {paying ? 'Membuka...' : 'Bayar'}
          </button>
        )}
        {activeSite && (
          <>
            <Link to={`/akun/situs/${order.site_id}`} className="btn btn-primary btn-sm">
              <SquarePen className="h-4 w-4" aria-hidden />
              Kelola Situs
            </Link>
            <a href={`/situs/${order.site_id}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
              <ExternalLink className="h-4 w-4" aria-hidden />
              Lihat situs
            </a>
          </>
        )}
        <Link to={detailPath} className="btn btn-outline btn-sm">
          Detail
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </article>
  );
}
